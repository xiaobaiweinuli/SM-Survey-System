/**
 * 认证中间件
 */

import { verifyToken, extractTokenFromHeader } from '../utils/jwt.js';
import { AuthError, PermissionError, ERROR_CODES } from '../utils/errors.js';
import { DatabaseService } from '../services/database.js';

// 用户认证中间件
export async function authMiddleware(context) {
  const { request, env } = context;
  
  // 提取Token
  const token = extractTokenFromHeader(request);
  if (!token) {
    throw new AuthError(ERROR_CODES.AUTH_REQUIRED, '请提供认证Token');
  }
  
  try {
    // 验证Token
    const payload = await verifyToken(token, env.JWT_SECRET);
    
    // 检查会话是否有效
    const db = new DatabaseService(env.DB);
    const session = await db.getUserSession(token);
    
    if (!session || !session.is_active) {
      throw new AuthError(ERROR_CODES.AUTH_INVALID, '会话已失效');
    }
    
    // 检查会话是否过期
    const now = new Date();
    const expiresAt = new Date(session.expires_at);
    if (now > expiresAt) {
      // 标记会话为无效
      await db.deactivateUserSession(token);
      throw new AuthError(ERROR_CODES.AUTH_EXPIRED, '会话已过期');
    }
    
    // 获取用户信息
    let user = null;
    if (payload.user_type === 'user') {
      user = await db.getUserById(payload.user_id);
      if (!user || !user.is_active) {
        throw new AuthError(ERROR_CODES.AUTH_INVALID, '用户账号已被禁用');
      }
    } else if (payload.user_type === 'admin') {
      user = await db.getAdminById(payload.user_id);
      if (!user || !user.is_active) {
        throw new AuthError(ERROR_CODES.AUTH_INVALID, '管理员账号已被禁用');
      }
    }
    
    if (!user) {
      throw new AuthError(ERROR_CODES.AUTH_INVALID, '用户不存在');
    }
    
    // 将用户信息添加到上下文
    if (payload.user_type === 'user') {
      context.user = user;
    } else {
      context.admin = user;
    }
    
    context.token_payload = payload;
    
  } catch (error) {
    if (error instanceof AuthError) {
      throw error;
    }
    console.error('Auth middleware error:', error);
    throw new AuthError(ERROR_CODES.AUTH_INVALID, 'Token验证失败');
  }
}

// 管理员权限中间件
export async function adminMiddleware(context) {
  const { token_payload } = context;
  
  if (!token_payload || token_payload.user_type !== 'admin') {
    throw new PermissionError('需要管理员权限');
  }
  
  if (!context.admin) {
    throw new PermissionError('管理员信息获取失败');
  }
}

// 可选认证中间件（不强制要求认证）
export async function optionalAuthMiddleware(context) {
  try {
    await authMiddleware(context);
  } catch (error) {
    // 忽略认证错误，继续执行
    context.user = null;
    context.admin = null;
    context.token_payload = null;
  }
}

// 用户权限检查中间件
export function requireUserPermission(permission) {
  return async function(context) {
    if (!context.user) {
      throw new AuthError(ERROR_CODES.AUTH_REQUIRED, '需要用户认证');
    }
    
    // 检查用户是否已实名认证
    if (permission === 'verified' && !context.user.is_verified) {
      throw new PermissionError('需要完成实名认证');
    }
    
    // 可以根据需要添加更多权限检查
  };
}

// 资源所有者检查中间件
export function requireResourceOwner(resourceType) {
  return async function(context) {
    const { params, env } = context;
    const resourceId = params.id;
    
    if (!context.user) {
      throw new AuthError(ERROR_CODES.AUTH_REQUIRED, '需要用户认证');
    }
    
    const db = new DatabaseService(env.DB);
    let resource = null;
    
    switch (resourceType) {
      case 'survey_submission':
        resource = await db.getSurveySubmissionById(resourceId);
        break;
      case 'task_submission':
        resource = await db.getTaskSubmissionById(resourceId);
        break;
      case 'file_upload':
        resource = await db.getFileUploadById(resourceId);
        break;
      default:
        throw new Error(`Unsupported resource type: ${resourceType}`);
    }
    
    if (!resource) {
      throw new NotFoundError('资源不存在');
    }
    
    if (resource.user_id !== context.user.id) {
      throw new PermissionError('无权访问此资源');
    }
    
    context.resource = resource;
  };
}

