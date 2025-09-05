/**
 * API路由器
 * 处理所有HTTP请求路由
 */

import { AuthController } from './controllers/auth.js';
import { UserController } from './controllers/user.js';
import { SurveyController } from './controllers/survey.js';
import { TaskController } from './controllers/task.js';
import { FileController } from './controllers/file.js';
import { AdminController } from './controllers/admin.js';
import { ConfigController } from './controllers/config.js';
import { NotificationController } from './controllers/notification.js';

import { authMiddleware, adminMiddleware } from './middleware/auth.js';
import { rateLimitMiddleware } from './middleware/rateLimit.js';
import { validateMiddleware } from './middleware/validation.js';
import { auditLogMiddleware } from './middleware/auditLog.js';

import { createErrorResponse } from './utils/response.js';
import { ERROR_CODES } from './utils/errors.js';

export class Router {
  constructor(env) {
    this.env = env;
    this.routes = new Map();
    this.setupRoutes();
  }

  setupRoutes() {
    // 认证相关路由
    this.addRoute('POST', '/api/auth/register', [
      rateLimitMiddleware('register', 5, 3600), // 每小时5次
      validateMiddleware('register'),
      auditLogMiddleware('user_register')
    ], AuthController.register);

    this.addRoute('POST', '/api/auth/login', [
      rateLimitMiddleware('login', 10, 60), // 每分钟10次
      validateMiddleware('login'),
      auditLogMiddleware('user_login')
    ], AuthController.login);

    this.addRoute('POST', '/api/auth/admin/login', [
      rateLimitMiddleware('admin_login', 5, 60),
      validateMiddleware('adminLogin'),
      auditLogMiddleware('admin_login')
    ], AuthController.adminLogin);

    this.addRoute('POST', '/api/auth/refresh', [
      authMiddleware,
      auditLogMiddleware('token_refresh')
    ], AuthController.refresh);

    this.addRoute('POST', '/api/auth/logout', [
      authMiddleware,
      auditLogMiddleware('user_logout')
    ], AuthController.logout);

    // 用户相关路由
    this.addRoute('GET', '/api/user/profile', [
      authMiddleware
    ], UserController.getProfile);

    this.addRoute('PUT', '/api/user/profile', [
      authMiddleware,
      validateMiddleware('updateProfile'),
      auditLogMiddleware('profile_update')
    ], UserController.updateProfile);

    this.addRoute('GET', '/api/user/stats', [
      authMiddleware
    ], UserController.getStats);

    // 问卷相关路由
    this.addRoute('GET', '/api/survey/config', [
      authMiddleware
    ], SurveyController.getConfig);

    this.addRoute('POST', '/api/survey/submit', [
      authMiddleware,
      rateLimitMiddleware('survey_submit', 5, 3600),
      validateMiddleware('surveySubmit'),
      auditLogMiddleware('survey_submit')
    ], SurveyController.submit);

    this.addRoute('GET', '/api/survey/submissions', [
      authMiddleware
    ], SurveyController.getSubmissions);

    // 任务相关路由
    this.addRoute('GET', '/api/tasks', [
      authMiddleware
    ], TaskController.getTasks);

    this.addRoute('GET', '/api/tasks/:id', [
      authMiddleware
    ], TaskController.getTask);

    this.addRoute('POST', '/api/tasks/:id/claim', [
      authMiddleware,
      auditLogMiddleware('task_claim')
    ], TaskController.claimTask);

    this.addRoute('POST', '/api/tasks/:id/submit', [
      authMiddleware,
      rateLimitMiddleware('task_submit', 10, 3600),
      validateMiddleware('taskSubmit'),
      auditLogMiddleware('task_submit')
    ], TaskController.submitTask);

    this.addRoute('GET', '/api/tasks/submissions', [
      authMiddleware
    ], TaskController.getSubmissions);

    // 文件相关路由
    this.addRoute('POST', '/api/files/upload', [
      authMiddleware,
      rateLimitMiddleware('file_upload', 20, 60),
      auditLogMiddleware('file_upload')
    ], FileController.upload);

    this.addRoute('GET', '/api/files/:id', [
      authMiddleware
    ], FileController.getFile);

    this.addRoute('DELETE', '/api/files/:id', [
      authMiddleware,
      auditLogMiddleware('file_delete')
    ], FileController.deleteFile);

    // 管理后台路由
    this.addRoute('GET', '/api/admin/users', [
      authMiddleware,
      adminMiddleware
    ], AdminController.getUsers);

    this.addRoute('GET', '/api/admin/users/:id', [
      authMiddleware,
      adminMiddleware
    ], AdminController.getUser);

    this.addRoute('PUT', '/api/admin/users/:id/status', [
      authMiddleware,
      adminMiddleware,
      validateMiddleware('updateUserStatus'),
      auditLogMiddleware('admin_update_user_status')
    ], AdminController.updateUserStatus);

    this.addRoute('GET', '/api/admin/surveys', [
      authMiddleware,
      adminMiddleware
    ], AdminController.getSurveys);

    this.addRoute('POST', '/api/admin/surveys', [
      authMiddleware,
      adminMiddleware,
      validateMiddleware('createSurvey'),
      auditLogMiddleware('admin_create_survey')
    ], AdminController.createSurvey);

    this.addRoute('PUT', '/api/admin/surveys/:id', [
      authMiddleware,
      adminMiddleware,
      validateMiddleware('updateSurvey'),
      auditLogMiddleware('admin_update_survey')
    ], AdminController.updateSurvey);

    this.addRoute('GET', '/api/admin/surveys/:id/stats', [
      authMiddleware,
      adminMiddleware
    ], AdminController.getSurveyStats);

    this.addRoute('GET', '/api/admin/tasks', [
      authMiddleware,
      adminMiddleware
    ], AdminController.getTasks);

    this.addRoute('POST', '/api/admin/tasks', [
      authMiddleware,
      adminMiddleware,
      validateMiddleware('createTask'),
      auditLogMiddleware('admin_create_task')
    ], AdminController.createTask);

    this.addRoute('PUT', '/api/admin/tasks/:id', [
      authMiddleware,
      adminMiddleware,
      validateMiddleware('updateTask'),
      auditLogMiddleware('admin_update_task')
    ], AdminController.updateTask);

    this.addRoute('GET', '/api/admin/tasks/:id/stats', [
      authMiddleware,
      adminMiddleware
    ], AdminController.getTaskStats);

    // 数据导出路由
    this.addRoute('GET', '/api/admin/export/users', [
      authMiddleware,
      adminMiddleware,
      auditLogMiddleware('admin_export_users')
    ], AdminController.exportUsers);

    this.addRoute('GET', '/api/admin/export/surveys', [
      authMiddleware,
      adminMiddleware,
      auditLogMiddleware('admin_export_surveys')
    ], AdminController.exportSurveys);

    this.addRoute('GET', '/api/admin/export/tasks', [
      authMiddleware,
      adminMiddleware,
      auditLogMiddleware('admin_export_tasks')
    ], AdminController.exportTasks);

    // 系统配置路由
    this.addRoute('GET', '/api/config/public', [], ConfigController.getPublicConfig);

    this.addRoute('PUT', '/api/admin/config', [
      authMiddleware,
      adminMiddleware,
      validateMiddleware('updateConfig'),
      auditLogMiddleware('admin_update_config')
    ], ConfigController.updateConfig);

    // 通知相关路由
    this.addRoute('GET', '/api/notifications', [
      authMiddleware
    ], NotificationController.getNotifications);

    this.addRoute('PUT', '/api/notifications/:id/read', [
      authMiddleware,
      auditLogMiddleware('notification_read')
    ], NotificationController.markAsRead);

    this.addRoute('POST', '/api/webhooks/notify', [
      validateMiddleware('webhook')
    ], NotificationController.sendWebhook);
  }

  addRoute(method, path, middlewares, handler) {
    const key = `${method}:${path}`;
    this.routes.set(key, { middlewares, handler });
  }

  async handle(request) {
    const url = new URL(request.url);
    const method = request.method;
    const pathname = url.pathname;

    // 查找匹配的路由
    const route = this.findRoute(method, pathname);
    
    if (!route) {
      return createErrorResponse(ERROR_CODES.NOT_FOUND, 'Route not found', 404);
    }

    try {
      // 创建请求上下文
      const context = {
        request,
        env: this.env,
        url,
        params: route.params,
        user: null,
        admin: null
      };

      // 执行中间件链
      for (const middleware of route.middlewares) {
        await middleware(context);
      }

      // 执行路由处理器
      return await route.handler(context);

    } catch (error) {
      console.error('Route handler error:', error);
      throw error;
    }
  }

  findRoute(method, pathname) {
    // 首先尝试精确匹配
    const exactKey = `${method}:${pathname}`;
    if (this.routes.has(exactKey)) {
      return {
        ...this.routes.get(exactKey),
        params: {}
      };
    }

    // 尝试参数匹配
    for (const [key, route] of this.routes.entries()) {
      const [routeMethod, routePath] = key.split(':');
      
      if (routeMethod !== method) continue;

      const params = this.matchPath(routePath, pathname);
      if (params !== null) {
        return {
          ...route,
          params
        };
      }
    }

    return null;
  }

  matchPath(routePath, pathname) {
    const routeParts = routePath.split('/');
    const pathParts = pathname.split('/');

    if (routeParts.length !== pathParts.length) {
      return null;
    }

    const params = {};

    for (let i = 0; i < routeParts.length; i++) {
      const routePart = routeParts[i];
      const pathPart = pathParts[i];

      if (routePart.startsWith(':')) {
        // 参数匹配
        const paramName = routePart.slice(1);
        params[paramName] = pathPart;
      } else if (routePart !== pathPart) {
        // 字面量不匹配
        return null;
      }
    }

    return params;
  }
}

import { Router } from '../../backend/src/index.js'; // 如果你已经在 publish 里合并，就直接写 './router.js'

/**
 * Pages Functions 风格的入口
 */
export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const pathname = url.pathname;
  const method = request.method;

  // 1. 最简单的“探针”路由
  if (pathname === '/api/ping') {
    return new Response(JSON.stringify({
      message: 'pong',
      timestamp: new Date().toISOString(),
      method,
      pathname,
    }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });
  }

  // 2. 专门为 admin login 做的调试路由
  if (pathname === '/api/auth/admin/login') {
    if (method === 'POST') {
      return new Response(JSON.stringify({
        debug_message: 'SUCCESS: Reached /api/auth/admin/login with POST method!',
        token: 'fake-debug-token-12345',
      }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      });
    } else {
      return new Response(JSON.stringify({
        debug_message: `ERROR: Wrong method: ${method}`,
      }), {
        headers: { 'Content-Type': 'application/json' },
        status: 405,
      });
    }
  }

  // 3. 调用 Router 处理业务逻辑
  try {
    const router = new Router(env);
    return await router.handle(request);
  } catch (err) {
    console.error('Router error:', err);
    return new Response(JSON.stringify({
      error: 'Internal Server Error',
      details: err.message,
    }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    });
  }
}
