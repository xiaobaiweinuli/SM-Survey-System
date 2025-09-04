/**
 * 审计日志中间件
 */

import { DatabaseService } from '../services/database.js';

// 审计日志中间件工厂
export function auditLogMiddleware(action) {
  return async function(context) {
    const { request, env, user, admin, params } = context;
    
    // 在请求处理后记录日志
    const originalHandler = context.handler;
    context.handler = async function(...args) {
      let result;
      let error = null;
      
      try {
        result = await originalHandler.apply(this, args);
        return result;
      } catch (err) {
        error = err;
        throw err;
      } finally {
        // 记录审计日志
        try {
          await recordAuditLog(context, action, result, error);
        } catch (logError) {
          console.error('Failed to record audit log:', logError);
        }
      }
    };
  };
}

// 记录审计日志
async function recordAuditLog(context, action, result, error) {
  const { request, env, user, admin, params, validatedData } = context;
  
  const db = new DatabaseService(env.DB);
  
  // 获取客户端信息
  const clientIP = request.headers.get('CF-Connecting-IP') || 
                   request.headers.get('X-Forwarded-For') || 
                   request.headers.get('X-Real-IP') || 
                   'unknown';
  const userAgent = request.headers.get('User-Agent') || 'unknown';
  
  // 确定用户信息
  let userId = null;
  let userType = 'anonymous';
  
  if (user) {
    userId = user.id;
    userType = 'user';
  } else if (admin) {
    userId = admin.id;
    userType = 'admin';
  }
  
  // 构建详情信息
  const details = {
    action,
    method: request.method,
    url: request.url,
    params,
    success: !error,
    error_message: error ? error.message : null,
    user_agent: userAgent,
    timestamp: new Date().toISOString()
  };
  
  // 根据操作类型添加特定信息
  switch (action) {
    case 'user_register':
      details.name = validatedData?.name;
      details.id_card_number = validatedData?.id_card_number ? 
        maskIdCard(validatedData.id_card_number) : null;
      break;
      
    case 'user_login':
    case 'admin_login':
      details.username = validatedData?.username || validatedData?.name;
      break;
      
    case 'survey_submit':
      details.survey_config_id = validatedData?.survey_config_id;
      details.has_files = validatedData?.files && validatedData.files.length > 0;
      break;
      
    case 'task_claim':
    case 'task_submit':
      details.task_id = params?.id;
      if (action === 'task_submit') {
        details.claim_id = validatedData?.claim_id;
        details.duration_minutes = validatedData?.duration_minutes;
        details.files_count = validatedData?.files?.length || 0;
      }
      break;
      
    case 'file_upload':
      details.upload_type = validatedData?.upload_type;
      details.file_size = validatedData?.file_size;
      details.mime_type = validatedData?.mime_type;
      break;
      
    case 'file_delete':
      details.file_id = params?.id;
      break;
      
    case 'admin_create_survey':
    case 'admin_update_survey':
      details.survey_title = validatedData?.title;
      break;
      
    case 'admin_create_task':
    case 'admin_update_task':
      details.task_title = validatedData?.title;
      details.task_category = validatedData?.category;
      break;
      
    case 'admin_update_user_status':
      details.target_user_id = params?.id;
      details.is_active = validatedData?.is_active;
      details.is_verified = validatedData?.is_verified;
      break;
      
    case 'admin_export_users':
    case 'admin_export_surveys':
    case 'admin_export_tasks':
      details.export_format = request.url.includes('format=') ? 
        new URL(request.url).searchParams.get('format') : 'json';
      break;
  }
  
  // 确定资源类型和ID
  let resourceType = 'unknown';
  let resourceId = null;
  
  if (action.includes('survey')) {
    resourceType = 'survey';
    resourceId = validatedData?.survey_config_id || params?.id;
  } else if (action.includes('task')) {
    resourceType = 'task';
    resourceId = params?.id;
  } else if (action.includes('user')) {
    resourceType = 'user';
    resourceId = params?.id || userId;
  } else if (action.includes('file')) {
    resourceType = 'file';
    resourceId = params?.id;
  } else if (action.includes('config')) {
    resourceType = 'config';
  }
  
  // 保存审计日志
  await db.createAuditLog({
    user_id: userId,
    user_type: userType,
    action,
    resource_type: resourceType,
    resource_id: resourceId,
    details: JSON.stringify(details),
    ip_address: clientIP,
    user_agent: userAgent
  });
}

// 脱敏身份证号
function maskIdCard(idCard) {
  if (idCard.length >= 10) {
    return idCard.substring(0, 6) + '*'.repeat(idCard.length - 10) + idCard.substring(idCard.length - 4);
  }
  return idCard;
}

// 获取审计日志
export async function getAuditLogs(env, options = {}) {
  const {
    userId,
    userType,
    action,
    resourceType,
    startDate,
    endDate,
    page = 1,
    limit = 50
  } = options;
  
  const db = new DatabaseService(env.DB);
  
  let query = 'SELECT * FROM audit_logs WHERE 1=1';
  const params = [];
  
  if (userId) {
    query += ' AND user_id = ?';
    params.push(userId);
  }
  
  if (userType) {
    query += ' AND user_type = ?';
    params.push(userType);
  }
  
  if (action) {
    query += ' AND action = ?';
    params.push(action);
  }
  
  if (resourceType) {
    query += ' AND resource_type = ?';
    params.push(resourceType);
  }
  
  if (startDate) {
    query += ' AND created_at >= ?';
    params.push(startDate);
  }
  
  if (endDate) {
    query += ' AND created_at <= ?';
    params.push(endDate);
  }
  
  query += ' ORDER BY created_at DESC';
  
  if (limit) {
    const offset = (page - 1) * limit;
    query += ` LIMIT ${limit} OFFSET ${offset}`;
  }
  
  const result = await env.DB.prepare(query).bind(...params).all();
  
  return {
    logs: result.results || [],
    pagination: {
      page,
      limit,
      total: result.meta?.total_count || 0
    }
  };
}

// 清理旧的审计日志
export async function cleanupOldAuditLogs(env, daysToKeep = 90) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
  
  const query = 'DELETE FROM audit_logs WHERE created_at < ?';
  const result = await env.DB.prepare(query).bind(cutoffDate.toISOString()).run();
  
  return result.meta?.changes || 0;
}

