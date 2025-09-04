/**
 * Cloudflare Workers 主入口文件
 * 实名认证问卷+SM任务系统后端API
 */

import { Router } from './router.js';
import { corsHeaders, handleCORS } from './utils/cors.js';
import { createResponse, createErrorResponse } from './utils/response.js';
import { ApiError, ERROR_CODES } from './utils/errors.js';

export default {
  async fetch(request, env, ctx) {
    try {
      // 处理CORS预检请求
      if (request.method === 'OPTIONS') {
        return handleCORS();
      }

      // 创建路由器实例
      const router = new Router(env);
      
      // 处理请求
      const response = await router.handle(request);
      
      // 添加CORS头
      Object.entries(corsHeaders).forEach(([key, value]) => {
        response.headers.set(key, value);
      });
      
      return response;
      
    } catch (error) {
      console.error('Unhandled error:', error);
      
      if (error instanceof ApiError) {
        return createErrorResponse(error.code, error.message, error.statusCode, error.details);
      }
      
      return createErrorResponse(
        ERROR_CODES.INTERNAL_ERROR,
        'Internal server error',
        500
      );
    }
  },
};

