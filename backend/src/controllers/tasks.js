/**
 * SM任务控制器
 * 处理任务列表、任务领取、任务提交等操作
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

export class TasksController {
  // 获取可用任务列表
  static async getAvailableTasks(context) {
    const { env, user, params } = context;
    const page = parseInt(params.page) || 1;
    const limit = parseInt(params.limit) || 10;
    const category = params.category;

    try {
      const db = new DatabaseService(env.DB);
      const result = await db.getAvailableTasks(user.id, page, limit, category);

      return createResponse(result, '获取任务列表成功');

    } catch (error) {
      console.error('Get available tasks error:', error);
      throw new Error('获取任务列表失败');
    }
  }

  // 获取任务详情
  static async getTaskDetail(context) {
    const { env, user, params } = context;
    const taskId = parseInt(params.id);

    try {
      const db = new DatabaseService(env.DB);
      
      // 获取任务详情
      const task = await db.getTaskById(taskId);
      if (!task) {
        throw new NotFoundError('任务不存在');
      }

      // 检查任务是否可用
      if (task.status !== 'active') {
        throw new ValidationError('任务已下线或暂停');
      }

      // 检查用户是否已领取此任务
      const userTask = await db.getUserTask(user.id, taskId);
      if (userTask) {
        task.user_status = userTask.status;
        task.claimed_at = userTask.claimed_at;
        task.submitted_at = userTask.submitted_at;
      } else {
        task.user_status = 'available';
      }

      // 解析任务配置
      if (task.task_config) {
        task.config = JSON.parse(task.task_config);
        delete task.task_config;
      }

      return createResponse(task, '获取任务详情成功');

    } catch (error) {
      console.error('Get task detail error:', error);
      
      if (error instanceof NotFoundError || error instanceof ValidationError) {
        throw error;
      }
      
      throw new Error('获取任务详情失败');
    }
  }

  // 领取任务
  static async claimTask(context) {
    const { env, user, params, request } = context;
    const taskId = parseInt(params.id);

    try {
      const db = new DatabaseService(env.DB);
      const notificationService = new NotificationService(env);

      // 获取任务信息
      const task = await db.getTaskById(taskId);
      if (!task) {
        throw new NotFoundError('任务不存在');
      }

      // 检查任务状态
      if (task.status !== 'active') {
        throw new ValidationError('任务已下线或暂停');
      }

      // 检查任务是否已满员
      if (task.max_participants && task.current_participants >= task.max_participants) {
        throw new ValidationError('任务已满员');
      }

      // 检查用户是否已领取此任务
      const existingUserTask = await db.getUserTask(user.id, taskId);
      if (existingUserTask) {
        throw new ValidationError('您已领取过此任务');
      }

      // 检查用户今日领取任务数量限制
      const todayClaimedCount = await db.getUserTodayClaimedTasksCount(user.id);
      const maxDailyTasks = 10; // 每日最多领取10个任务
      if (todayClaimedCount >= maxDailyTasks) {
        throw new ValidationError(`每日最多只能领取${maxDailyTasks}个任务`);
      }

      // 获取客户端信息
      const clientIP = request.headers.get('CF-Connecting-IP') || 'unknown';
      const userAgent = request.headers.get('User-Agent') || 'unknown';

      // 创建用户任务记录
      const userTaskId = await db.createUserTask({
        user_id: user.id,
        task_id: taskId,
        status: 'claimed',
        ip_address: clientIP,
        user_agent: userAgent
      });

      // 更新任务参与人数
      await db.incrementTaskParticipants(taskId);

      // 发送领取通知
      await notificationService.sendTaskClaimNotification(
        user,
        task.title,
        userTaskId
      );

      return createResponse({
        user_task_id: userTaskId,
        claimed_at: new Date().toISOString(),
        task_title: task.title
      }, '任务领取成功');

    } catch (error) {
      console.error('Claim task error:', error);
      
      if (error instanceof NotFoundError || error instanceof ValidationError) {
        throw error;
      }
      
      throw new Error('任务领取失败，请稍后重试');
    }
  }

  // 提交任务
  static async submitTask(context) {
    const { env, user, validatedData, request } = context;
    const { user_task_id, submission_data, files } = validatedData;

    const db = new DatabaseService(env.DB);
    const fileStorage = new FileStorageService(env.BUCKET);
    const notificationService = new NotificationService(env);

    try {
      // 获取用户任务记录
      const userTask = await db.getUserTaskById(user_task_id);
      if (!userTask) {
        throw new NotFoundError('任务记录不存在');
      }

      // 验证权限
      if (userTask.user_id !== user.id) {
        throw new ValidationError('无权操作此任务');
      }

      // 检查任务状态
      if (userTask.status !== 'claimed') {
        throw new ValidationError('任务状态不正确，无法提交');
      }

      // 获取任务配置
      const task = await db.getTaskById(userTask.task_id);
      if (!task) {
        throw new NotFoundError('任务不存在');
      }

      // 验证提交数据
      const taskConfig = JSON.parse(task.task_config || '{}');
      const validationResult = await validateTaskSubmission(submission_data, taskConfig);
      if (!validationResult.isValid) {
        throw new ValidationError(`提交数据验证失败: ${validationResult.errors.join(', ')}`);
      }

      // 处理文件上传
      let filesData = null;
      if (files && files.length > 0) {
        filesData = [];
        
        for (const file of files) {
          try {
            // 生成文件名
            const fileName = `task_files/${user.id}/${userTask.task_id}/${Date.now()}_${file.name}`;
            
            // 上传文件
            const fileUrl = await fileStorage.uploadFile(
              fileName,
              file.data,
              file.type,
              {
                metadata: {
                  userId: user.id.toString(),
                  taskId: userTask.task_id.toString(),
                  userTaskId: user_task_id.toString(),
                  originalName: file.name
                }
              }
            );

            // 记录文件信息
            const fileId = await db.createFileUpload({
              user_id: user.id,
              original_name: file.name,
              file_name: fileName,
              file_path: fileUrl,
              file_size: file.size,
              mime_type: file.type,
              upload_type: 'task',
              related_id: user_task_id
            });

            filesData.push({
              id: fileId,
              name: file.name,
              url: fileUrl,
              size: file.size,
              type: file.type
            });

          } catch (fileError) {
            console.error('File upload error:', fileError);
            throw new ValidationError(`文件上传失败: ${file.name}`);
          }
        }
      }

      // 获取客户端信息
      const clientIP = request.headers.get('CF-Connecting-IP') || 'unknown';
      const userAgent = request.headers.get('User-Agent') || 'unknown';

      // 更新用户任务状态
      await db.updateUserTaskSubmission({
        user_task_id,
        submission_data,
        files_data: filesData,
        ip_address: clientIP,
        user_agent: userAgent
      });

      // 发送提交通知
      await notificationService.sendTaskSubmitNotification(
        user,
        task.title,
        user_task_id
      );

      return createResponse({
        user_task_id,
        submitted_at: new Date().toISOString(),
        files_count: filesData ? filesData.length : 0
      }, '任务提交成功');

    } catch (error) {
      console.error('Submit task error:', error);
      
      if (error instanceof ValidationError || error instanceof NotFoundError) {
        throw error;
      }
      
      throw new Error('任务提交失败，请稍后重试');
    }
  }

  // 获取用户的任务记录
  static async getUserTasks(context) {
    const { env, user, params } = context;
    const page = parseInt(params.page) || 1;
    const limit = parseInt(params.limit) || 10;
    const status = params.status;

    try {
      const db = new DatabaseService(env.DB);
      const result = await db.getUserTasks(user.id, page, limit, status);

      return createResponse(result, '获取用户任务记录成功');

    } catch (error) {
      console.error('Get user tasks error:', error);
      throw new Error('获取用户任务记录失败');
    }
  }

  // 获取任务提交详情
  static async getTaskSubmissionDetail(context) {
    const { env, user, params } = context;
    const userTaskId = parseInt(params.id);

    try {
      const db = new DatabaseService(env.DB);
      
      // 获取用户任务记录
      const userTask = await db.getUserTaskById(userTaskId);
      if (!userTask) {
        throw new NotFoundError('任务记录不存在');
      }

      // 验证权限
      if (userTask.user_id !== user.id) {
        throw new ValidationError('无权访问此任务记录');
      }

      // 解析数据
      if (userTask.submission_data) {
        userTask.data = JSON.parse(userTask.submission_data);
        delete userTask.submission_data;
      }

      if (userTask.files_data) {
        userTask.files = JSON.parse(userTask.files_data);
        delete userTask.files_data;
      }

      return createResponse(userTask, '获取任务提交详情成功');

    } catch (error) {
      console.error('Get task submission detail error:', error);
      
      if (error instanceof NotFoundError || error instanceof ValidationError) {
        throw error;
      }
      
      throw new Error('获取任务提交详情失败');
    }
  }

  // 获取任务统计信息
  static async getTaskStats(context) {
    const { env, user } = context;

    try {
      const db = new DatabaseService(env.DB);
      const stats = await db.getUserTaskStats(user.id);

      return createResponse(stats, '获取任务统计成功');

    } catch (error) {
      console.error('Get task stats error:', error);
      throw new Error('获取任务统计失败');
    }
  }
}

// 验证任务提交数据
async function validateTaskSubmission(data, config) {
  const errors = [];
  
  try {
    // 验证必填字段
    if (config.fields) {
      for (const field of config.fields) {
        if (field.required && (!data[field.name] || data[field.name] === '')) {
          errors.push(`${field.label || field.name}为必填项`);
        }

        // 验证字段类型和格式
        if (data[field.name] !== undefined && data[field.name] !== '') {
          const fieldErrors = validateTaskField(data[field.name], field);
          errors.push(...fieldErrors);
        }
      }
    }

    // 验证特殊要求
    if (config.requirements) {
      for (const requirement of config.requirements) {
        const requirementErrors = validateTaskRequirement(data, requirement);
        errors.push(...requirementErrors);
      }
    }

  } catch (error) {
    console.error('Task submission validation error:', error);
    errors.push('任务提交数据格式错误');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

// 验证任务字段
function validateTaskField(value, field) {
  const errors = [];

  switch (field.type) {
    case 'text':
    case 'textarea':
      if (field.minLength && value.length < field.minLength) {
        errors.push(`${field.label}长度不能少于${field.minLength}个字符`);
      }
      if (field.maxLength && value.length > field.maxLength) {
        errors.push(`${field.label}长度不能超过${field.maxLength}个字符`);
      }
      if (field.pattern && !new RegExp(field.pattern).test(value)) {
        errors.push(`${field.label}格式不正确`);
      }
      break;

    case 'number':
      const numValue = Number(value);
      if (isNaN(numValue)) {
        errors.push(`${field.label}必须为数字`);
      } else {
        if (field.min !== undefined && numValue < field.min) {
          errors.push(`${field.label}不能小于${field.min}`);
        }
        if (field.max !== undefined && numValue > field.max) {
          errors.push(`${field.label}不能大于${field.max}`);
        }
      }
      break;

    case 'url':
      try {
        new URL(value);
      } catch {
        errors.push(`${field.label}必须为有效的URL地址`);
      }
      break;

    case 'email':
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailPattern.test(value)) {
        errors.push(`${field.label}格式不正确`);
      }
      break;

    case 'select':
    case 'radio':
      if (field.options && !field.options.some(opt => opt.value === value)) {
        errors.push(`${field.label}选项无效`);
      }
      break;

    case 'checkbox':
      if (!Array.isArray(value)) {
        errors.push(`${field.label}必须为数组`);
      } else if (field.options) {
        for (const val of value) {
          if (!field.options.some(opt => opt.value === val)) {
            errors.push(`${field.label}包含无效选项`);
          }
        }
      }
      break;

    case 'file':
      if (!Array.isArray(value)) {
        errors.push(`${field.label}必须为文件数组`);
      } else {
        if (field.maxFiles && value.length > field.maxFiles) {
          errors.push(`${field.label}最多只能上传${field.maxFiles}个文件`);
        }
        if (field.minFiles && value.length < field.minFiles) {
          errors.push(`${field.label}至少需要上传${field.minFiles}个文件`);
        }
      }
      break;

    case 'screenshot':
      // 验证截图字段
      if (!Array.isArray(value) || value.length === 0) {
        errors.push(`${field.label}至少需要上传一张截图`);
      }
      break;

    case 'social_media_link':
      // 验证社交媒体链接
      const socialPatterns = {
        weibo: /weibo\.com/,
        douyin: /douyin\.com/,
        xiaohongshu: /xiaohongshu\.com/,
        bilibili: /bilibili\.com/
      };
      
      if (field.platform && socialPatterns[field.platform]) {
        if (!socialPatterns[field.platform].test(value)) {
          errors.push(`${field.label}必须为有效的${field.platform}链接`);
        }
      }
      break;
  }

  return errors;
}

// 验证任务特殊要求
function validateTaskRequirement(data, requirement) {
  const errors = [];

  try {
    switch (requirement.type) {
      case 'min_followers':
        // 验证最少粉丝数要求
        const followersField = requirement.field || 'followers_count';
        const followersCount = parseInt(data[followersField]);
        if (isNaN(followersCount) || followersCount < requirement.value) {
          errors.push(`粉丝数不能少于${requirement.value}`);
        }
        break;

      case 'account_age':
        // 验证账号年龄要求
        const ageField = requirement.field || 'account_created_date';
        const accountDate = new Date(data[ageField]);
        const minDate = new Date();
        minDate.setMonth(minDate.getMonth() - requirement.value);
        
        if (accountDate > minDate) {
          errors.push(`账号注册时间不能少于${requirement.value}个月`);
        }
        break;

      case 'content_quality':
        // 验证内容质量要求
        const contentField = requirement.field || 'content_description';
        const content = data[contentField] || '';
        if (content.length < requirement.minLength) {
          errors.push(`内容描述不能少于${requirement.minLength}个字符`);
        }
        break;

      case 'engagement_rate':
        // 验证互动率要求
        const engagementField = requirement.field || 'engagement_rate';
        const engagementRate = parseFloat(data[engagementField]);
        if (isNaN(engagementRate) || engagementRate < requirement.value) {
          errors.push(`互动率不能低于${requirement.value}%`);
        }
        break;
    }

  } catch (error) {
    console.error('Requirement validation error:', error);
    errors.push('特殊要求验证失败');
  }

  return errors;
}

