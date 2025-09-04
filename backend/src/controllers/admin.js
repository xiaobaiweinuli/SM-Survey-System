/**
 * 管理员控制器
 * 处理用户管理、问卷管理、任务管理、数据统计等管理功能
 */

import { DatabaseService } from '../services/database.js';
import { FileStorageService } from '../services/fileStorage.js';
import { NotificationService } from '../services/notification.js';

import { createResponse, createErrorResponse } from '../utils/response.js';
import { 
  ValidationError, 
  NotFoundError,
  ERROR_CODES 
} from '../utils/errors.js';

export class AdminController {
  // 获取系统统计数据
  static async getSystemStats(context) {
    const { env } = context;

    try {
      const db = new DatabaseService(env.DB);
      const stats = await db.getSystemStats();

      return createResponse(stats, '获取系统统计成功');

    } catch (error) {
      console.error('Get system stats error:', error);
      throw new Error('获取系统统计失败');
    }
  }

  // 用户管理 - 获取用户列表
  static async getUsers(context) {
    const { env, params } = context;
    const page = parseInt(params.page) || 1;
    const limit = parseInt(params.limit) || 20;
    const search = params.search;
    const status = params.status;

    try {
      const db = new DatabaseService(env.DB);
      const result = await db.getUsers(page, limit, { search, status });

      return createResponse(result, '获取用户列表成功');

    } catch (error) {
      console.error('Get users error:', error);
      throw new Error('获取用户列表失败');
    }
  }

  // 用户管理 - 获取用户详情
  static async getUserDetail(context) {
    const { env, params } = context;
    const userId = parseInt(params.id);

    try {
      const db = new DatabaseService(env.DB);
      
      const user = await db.getUserById(userId);
      if (!user) {
        throw new NotFoundError('用户不存在');
      }

      // 获取用户统计数据
      const userStats = await db.getUserDetailStats(userId);
      user.stats = userStats;

      return createResponse(user, '获取用户详情成功');

    } catch (error) {
      console.error('Get user detail error:', error);
      
      if (error instanceof NotFoundError) {
        throw error;
      }
      
      throw new Error('获取用户详情失败');
    }
  }

  // 用户管理 - 更新用户状态
  static async updateUserStatus(context) {
    const { env, params, validatedData } = context;
    const userId = parseInt(params.id);
    const { status, reason } = validatedData;

    try {
      const db = new DatabaseService(env.DB);
      const notificationService = new NotificationService(env);

      // 检查用户是否存在
      const user = await db.getUserById(userId);
      if (!user) {
        throw new NotFoundError('用户不存在');
      }

      // 更新用户状态
      await db.updateUserStatus(userId, status, reason);

      // 发送状态变更通知
      await notificationService.sendUserStatusChangeNotification(
        user,
        status,
        reason
      );

      return createResponse({
        user_id: userId,
        status,
        updated_at: new Date().toISOString()
      }, '用户状态更新成功');

    } catch (error) {
      console.error('Update user status error:', error);
      
      if (error instanceof NotFoundError) {
        throw error;
      }
      
      throw new Error('用户状态更新失败');
    }
  }

  // 问卷管理 - 获取问卷配置列表
  static async getSurveyConfigs(context) {
    const { env, params } = context;
    const page = parseInt(params.page) || 1;
    const limit = parseInt(params.limit) || 20;

    try {
      const db = new DatabaseService(env.DB);
      const result = await db.getSurveyConfigs(page, limit);

      return createResponse(result, '获取问卷配置列表成功');

    } catch (error) {
      console.error('Get survey configs error:', error);
      throw new Error('获取问卷配置列表失败');
    }
  }

  // 问卷管理 - 创建问卷配置
  static async createSurveyConfig(context) {
    const { env, validatedData } = context;
    const { title, description, config, status } = validatedData;

    try {
      const db = new DatabaseService(env.DB);

      // 验证问卷配置格式
      const validationResult = validateSurveyConfig(config);
      if (!validationResult.isValid) {
        throw new ValidationError(`问卷配置验证失败: ${validationResult.errors.join(', ')}`);
      }

      const surveyConfigId = await db.createSurveyConfig({
        title,
        description,
        config: JSON.stringify(config),
        status: status || 'draft'
      });

      return createResponse({
        id: surveyConfigId,
        title,
        status: status || 'draft',
        created_at: new Date().toISOString()
      }, '问卷配置创建成功');

    } catch (error) {
      console.error('Create survey config error:', error);
      
      if (error instanceof ValidationError) {
        throw error;
      }
      
      throw new Error('问卷配置创建失败');
    }
  }

  // 问卷管理 - 更新问卷配置
  static async updateSurveyConfig(context) {
    const { env, params, validatedData } = context;
    const configId = parseInt(params.id);
    const { title, description, config, status } = validatedData;

    try {
      const db = new DatabaseService(env.DB);

      // 检查配置是否存在
      const existingConfig = await db.getSurveyConfigById(configId);
      if (!existingConfig) {
        throw new NotFoundError('问卷配置不存在');
      }

      // 验证问卷配置格式
      if (config) {
        const validationResult = validateSurveyConfig(config);
        if (!validationResult.isValid) {
          throw new ValidationError(`问卷配置验证失败: ${validationResult.errors.join(', ')}`);
        }
      }

      await db.updateSurveyConfig(configId, {
        title,
        description,
        config: config ? JSON.stringify(config) : undefined,
        status
      });

      return createResponse({
        id: configId,
        updated_at: new Date().toISOString()
      }, '问卷配置更新成功');

    } catch (error) {
      console.error('Update survey config error:', error);
      
      if (error instanceof NotFoundError || error instanceof ValidationError) {
        throw error;
      }
      
      throw new Error('问卷配置更新失败');
    }
  }

  // 问卷管理 - 获取问卷提交记录
  static async getSurveySubmissions(context) {
    const { env, params } = context;
    const page = parseInt(params.page) || 1;
    const limit = parseInt(params.limit) || 20;
    const surveyConfigId = params.survey_config_id;

    try {
      const db = new DatabaseService(env.DB);
      const result = await db.getSurveySubmissions(page, limit, surveyConfigId);

      return createResponse(result, '获取问卷提交记录成功');

    } catch (error) {
      console.error('Get survey submissions error:', error);
      throw new Error('获取问卷提交记录失败');
    }
  }

  // 任务管理 - 获取任务列表
  static async getTasks(context) {
    const { env, params } = context;
    const page = parseInt(params.page) || 1;
    const limit = parseInt(params.limit) || 20;
    const status = params.status;
    const category = params.category;

    try {
      const db = new DatabaseService(env.DB);
      const result = await db.getTasks(page, limit, { status, category });

      return createResponse(result, '获取任务列表成功');

    } catch (error) {
      console.error('Get tasks error:', error);
      throw new Error('获取任务列表失败');
    }
  }

  // 任务管理 - 创建任务
  static async createTask(context) {
    const { env, validatedData } = context;
    const { 
      title, 
      description, 
      category, 
      difficulty, 
      reward, 
      max_participants,
      estimated_time,
      task_config,
      status 
    } = validatedData;

    try {
      const db = new DatabaseService(env.DB);

      // 验证任务配置格式
      const validationResult = validateTaskConfig(task_config);
      if (!validationResult.isValid) {
        throw new ValidationError(`任务配置验证失败: ${validationResult.errors.join(', ')}`);
      }

      const taskId = await db.createTask({
        title,
        description,
        category,
        difficulty,
        reward,
        max_participants,
        estimated_time,
        task_config: JSON.stringify(task_config),
        status: status || 'draft'
      });

      return createResponse({
        id: taskId,
        title,
        status: status || 'draft',
        created_at: new Date().toISOString()
      }, '任务创建成功');

    } catch (error) {
      console.error('Create task error:', error);
      
      if (error instanceof ValidationError) {
        throw error;
      }
      
      throw new Error('任务创建失败');
    }
  }

  // 任务管理 - 更新任务
  static async updateTask(context) {
    const { env, params, validatedData } = context;
    const taskId = parseInt(params.id);

    try {
      const db = new DatabaseService(env.DB);

      // 检查任务是否存在
      const existingTask = await db.getTaskById(taskId);
      if (!existingTask) {
        throw new NotFoundError('任务不存在');
      }

      // 验证任务配置格式
      if (validatedData.task_config) {
        const validationResult = validateTaskConfig(validatedData.task_config);
        if (!validationResult.isValid) {
          throw new ValidationError(`任务配置验证失败: ${validationResult.errors.join(', ')}`);
        }
        validatedData.task_config = JSON.stringify(validatedData.task_config);
      }

      await db.updateTask(taskId, validatedData);

      return createResponse({
        id: taskId,
        updated_at: new Date().toISOString()
      }, '任务更新成功');

    } catch (error) {
      console.error('Update task error:', error);
      
      if (error instanceof NotFoundError || error instanceof ValidationError) {
        throw error;
      }
      
      throw new Error('任务更新失败');
    }
  }

  // 任务管理 - 获取任务提交记录
  static async getTaskSubmissions(context) {
    const { env, params } = context;
    const page = parseInt(params.page) || 1;
    const limit = parseInt(params.limit) || 20;
    const taskId = params.task_id;
    const status = params.status;

    try {
      const db = new DatabaseService(env.DB);
      const result = await db.getTaskSubmissions(page, limit, { taskId, status });

      return createResponse(result, '获取任务提交记录成功');

    } catch (error) {
      console.error('Get task submissions error:', error);
      throw new Error('获取任务提交记录失败');
    }
  }

  // 任务管理 - 审核任务提交
  static async reviewTaskSubmission(context) {
    const { env, params, validatedData } = context;
    const submissionId = parseInt(params.id);
    const { status, feedback, reward_amount } = validatedData;

    try {
      const db = new DatabaseService(env.DB);
      const notificationService = new NotificationService(env);

      // 获取提交记录
      const submission = await db.getUserTaskById(submissionId);
      if (!submission) {
        throw new NotFoundError('任务提交记录不存在');
      }

      // 检查提交状态
      if (submission.status !== 'submitted') {
        throw new ValidationError('任务提交状态不正确，无法审核');
      }

      // 更新审核结果
      await db.updateTaskSubmissionReview(submissionId, {
        status,
        feedback,
        reward_amount,
        reviewed_at: new Date().toISOString()
      });

      // 获取用户信息
      const user = await db.getUserById(submission.user_id);
      const task = await db.getTaskById(submission.task_id);

      // 发送审核结果通知
      await notificationService.sendTaskReviewNotification(
        user,
        task.title,
        status,
        feedback,
        reward_amount
      );

      return createResponse({
        submission_id: submissionId,
        status,
        reviewed_at: new Date().toISOString()
      }, '任务审核完成');

    } catch (error) {
      console.error('Review task submission error:', error);
      
      if (error instanceof NotFoundError || error instanceof ValidationError) {
        throw error;
      }
      
      throw new Error('任务审核失败');
    }
  }

  // 系统配置管理
  static async getSystemConfig(context) {
    const { env } = context;

    try {
      const db = new DatabaseService(env.DB);
      const config = await db.getSystemConfig();

      return createResponse(config, '获取系统配置成功');

    } catch (error) {
      console.error('Get system config error:', error);
      throw new Error('获取系统配置失败');
    }
  }

  // 更新系统配置
  static async updateSystemConfig(context) {
    const { env, validatedData } = context;

    try {
      const db = new DatabaseService(env.DB);
      await db.updateSystemConfig(validatedData);

      return createResponse({
        updated_at: new Date().toISOString()
      }, '系统配置更新成功');

    } catch (error) {
      console.error('Update system config error:', error);
      throw new Error('系统配置更新失败');
    }
  }
}

// 验证问卷配置
function validateSurveyConfig(config) {
  const errors = [];

  try {
    // 验证基本结构
    if (!config.fields || !Array.isArray(config.fields)) {
      errors.push('问卷字段配置无效');
      return { isValid: false, errors };
    }

    // 验证字段配置
    for (const field of config.fields) {
      if (!field.name || !field.type || !field.label) {
        errors.push(`字段配置不完整: ${field.name || '未知字段'}`);
        continue;
      }

      // 验证字段类型
      const validTypes = ['text', 'textarea', 'number', 'email', 'phone', 'select', 'radio', 'checkbox', 'date', 'file'];
      if (!validTypes.includes(field.type)) {
        errors.push(`字段类型无效: ${field.type}`);
      }

      // 验证选项字段
      if (['select', 'radio', 'checkbox'].includes(field.type)) {
        if (!field.options || !Array.isArray(field.options) || field.options.length === 0) {
          errors.push(`字段${field.name}缺少选项配置`);
        }
      }
    }

    // 验证页面配置
    if (config.pages && Array.isArray(config.pages)) {
      for (const page of config.pages) {
        if (!page.fields || !Array.isArray(page.fields)) {
          errors.push('页面字段配置无效');
        }
      }
    }

  } catch (error) {
    console.error('Survey config validation error:', error);
    errors.push('问卷配置格式错误');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

// 验证任务配置
function validateTaskConfig(config) {
  const errors = [];

  try {
    // 验证基本结构
    if (!config.fields || !Array.isArray(config.fields)) {
      errors.push('任务字段配置无效');
      return { isValid: false, errors };
    }

    // 验证字段配置
    for (const field of config.fields) {
      if (!field.name || !field.type || !field.label) {
        errors.push(`字段配置不完整: ${field.name || '未知字段'}`);
        continue;
      }

      // 验证字段类型
      const validTypes = [
        'text', 'textarea', 'number', 'url', 'email', 'select', 'radio', 'checkbox', 
        'file', 'screenshot', 'social_media_link'
      ];
      if (!validTypes.includes(field.type)) {
        errors.push(`字段类型无效: ${field.type}`);
      }
    }

    // 验证特殊要求
    if (config.requirements && Array.isArray(config.requirements)) {
      for (const requirement of config.requirements) {
        if (!requirement.type || requirement.value === undefined) {
          errors.push('任务要求配置不完整');
        }
      }
    }

  } catch (error) {
    console.error('Task config validation error:', error);
    errors.push('任务配置格式错误');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

