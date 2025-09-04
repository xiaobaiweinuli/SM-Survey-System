/**
 * 限流中间件
 */

import { RateLimitError } from '../utils/errors.js';

// 内存存储（生产环境建议使用Redis或KV）
const rateLimitStore = new Map();

// 清理过期记录
function cleanupExpiredRecords() {
  const now = Date.now();
  for (const [key, data] of rateLimitStore.entries()) {
    if (data.resetTime <= now) {
      rateLimitStore.delete(key);
    }
  }
}

// 获取客户端标识
function getClientId(request, context) {
  // 优先使用用户ID
  if (context.user) {
    return `user:${context.user.id}`;
  }
  if (context.admin) {
    return `admin:${context.admin.id}`;
  }
  
  // 使用IP地址
  const clientIP = request.headers.get('CF-Connecting-IP') || 
                   request.headers.get('X-Forwarded-For') || 
                   request.headers.get('X-Real-IP') || 
                   'unknown';
  return `ip:${clientIP}`;
}

// 限流中间件工厂
export function rateLimitMiddleware(action, maxRequests, windowSeconds) {
  return async function(context) {
    const { request } = context;
    
    // 定期清理过期记录
    if (Math.random() < 0.01) { // 1%的概率执行清理
      cleanupExpiredRecords();
    }
    
    const clientId = getClientId(request, context);
    const key = `${action}:${clientId}`;
    const now = Date.now();
    const windowMs = windowSeconds * 1000;
    
    let record = rateLimitStore.get(key);
    
    if (!record) {
      // 首次请求
      record = {
        count: 1,
        resetTime: now + windowMs,
        firstRequest: now
      };
      rateLimitStore.set(key, record);
      return;
    }
    
    if (now >= record.resetTime) {
      // 窗口已重置
      record.count = 1;
      record.resetTime = now + windowMs;
      record.firstRequest = now;
      rateLimitStore.set(key, record);
      return;
    }
    
    // 检查是否超过限制
    if (record.count >= maxRequests) {
      const remainingTime = Math.ceil((record.resetTime - now) / 1000);
      throw new RateLimitError(
        `请求过于频繁，请在${remainingTime}秒后重试`
      );
    }
    
    // 增加计数
    record.count++;
    rateLimitStore.set(key, record);
  };
}

// 预定义的限流配置
export const rateLimitConfigs = {
  // 注册限流：每IP每小时5次
  register: rateLimitMiddleware('register', 5, 3600),
  
  // 登录限流：每IP每分钟10次
  login: rateLimitMiddleware('login', 10, 60),
  
  // 管理员登录限流：每IP每分钟5次
  adminLogin: rateLimitMiddleware('admin_login', 5, 60),
  
  // 文件上传限流：每用户每分钟20次
  fileUpload: rateLimitMiddleware('file_upload', 20, 60),
  
  // 问卷提交限流：每用户每小时5次
  surveySubmit: rateLimitMiddleware('survey_submit', 5, 3600),
  
  // 任务提交限流：每用户每小时10次
  taskSubmit: rateLimitMiddleware('task_submit', 10, 3600),
  
  // 通用API限流：每用户每分钟100次
  general: rateLimitMiddleware('general', 100, 60),
};

// 获取限流状态
export function getRateLimitStatus(action, clientId) {
  const key = `${action}:${clientId}`;
  const record = rateLimitStore.get(key);
  
  if (!record) {
    return {
      count: 0,
      remaining: 0,
      resetTime: null
    };
  }
  
  const now = Date.now();
  if (now >= record.resetTime) {
    return {
      count: 0,
      remaining: 0,
      resetTime: null
    };
  }
  
  return {
    count: record.count,
    remaining: Math.max(0, record.resetTime - now),
    resetTime: record.resetTime
  };
}

// 清除特定客户端的限流记录
export function clearRateLimit(action, clientId) {
  const key = `${action}:${clientId}`;
  rateLimitStore.delete(key);
}

// 清除所有限流记录
export function clearAllRateLimits() {
  rateLimitStore.clear();
}

