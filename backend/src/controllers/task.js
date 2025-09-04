/**
 * 任务控制器
 * 处理SM任务相关的API请求
 */

import { DatabaseService } from '../services/database.js';
import { FileStorageService } from '../services/fileStorage.js';
import { NotificationService } from '../services/notification.js';
import { successResponse, errorResponse } from '../utils/response.js';
import { ValidationError, NotFoundError } from '../utils/errors.js';

export class TaskController {
  constructor(env) {
    this.env = env;
    this.db = new DatabaseService(env.DB);
    this.fileStorage = new FileStorageService(env.BUCKET);
    this.notification = new NotificationService(env);
  }

  // 获取任务列表
  async getTasks(request, userId) {
    try {
      const url = new URL(request.url);
      const page = parseInt(url.searchParams.get('page')) || 1;
      const limit = parseInt(url.searchParams.get('limit')) || 10;
      const status = url.searchParams.get('status');
      const category = url.searchParams.get('category');

      const filters = {};
      if (status) filters.status = status;
      if (category) filters.category = category;

      const tasks = await this.db.getTasks(filters, page, limit);
      const total = await this.db.getTasksCount(filters);

      // 获取用户已领取的任务
      const userTasks = await this.db.getUserTasks(userId);
      const claimedTaskIds = userTasks.map(ut => ut.task_id);

      // 标记用户已领取的任务
      const tasksWithStatus = tasks.map(task => ({
        ...task,
        is_claimed: claimedTaskIds.includes(task.id),
        user_status: userTasks.find(ut => ut.task_id === task.id)?.status || null
      }));

      return successResponse({
        tasks: tasksWithStatus,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      });

    } catch (error) {
      console.error('获取任务列表错误:', error);
      return errorResponse('获取任务列表失败', 500);
    }
  }

  // 获取任务详情
  async getTask(request, userId, taskId) {
    try {
      const task = await this.db.getTaskById(taskId);
      if (!task) {
        return errorResponse('任务不存在', 404);
      }

      // 检查用户是否已领取此任务
      const userTask = await this.db.getUserTask(userId, taskId);

      return successResponse({
        task: {
          ...task,
          is_claimed: !!userTask,
          user_status: userTask?.status || null,
          user_task_id: userTask?.id || null
        }
      });

    } catch (error) {
      console.error('获取任务详情错误:', error);
      return errorResponse('获取任务详情失败', 500);
    }
  }

  // 领取任务
  async claimTask(request, userId, taskId) {
    try {
      const task = await this.db.getTaskById(taskId);
      if (!task) {
        return errorResponse('任务不存在', 404);
      }

      if (task.status !== 'active') {
        return errorResponse('任务不可领取', 400);
      }

      // 检查用户是否已领取此任务
      const existingUserTask = await this.db.getUserTask(userId, taskId);
      if (existingUserTask) {
        return errorResponse('您已领取过此任务', 400);
      }

      // 检查任务是否还有剩余名额
      const claimedCount = await this.db.getTaskClaimedCount(taskId);
      if (task.max_participants && claimedCount >= task.max_participants) {
        return errorResponse('任务名额已满', 400);
      }

      // 创建用户任务记录
      const userTask = await this.db.createUserTask({
        user_id: userId,
        task_id: taskId,
        status: 'claimed'
      });

      // 发送任务领取通知
      try {
        const user = await this.db.getUserById(userId);
        await this.notification.sendTaskClaimedNotification(user, task);
      } catch (error) {
        console.error('发送任务领取通知失败:', error);
      }

      return successResponse({
        user_task: userTask,
        message: '任务领取成功'
      });

    } catch (error) {
      console.error('领取任务错误:', error);
      return errorResponse('领取任务失败', 500);
    }
  }

  // 提交任务
  async submitTask(request, userId, taskId) {
    try {
      const userTask = await this.db.getUserTask(userId, taskId);
      if (!userTask) {
        return errorResponse('您未领取此任务', 400);
      }

      if (userTask.status !== 'claimed' && userTask.status !== 'in_progress') {
        return errorResponse('任务状态不允许提交', 400);
      }

      const formData = await request.formData();
      const description = formData.get('description');
      const files = [];

      // 处理文件上传
      for (const [key, value] of formData.entries()) {
        if (key.startsWith('file_') && value instanceof File) {
          const upload = await this.fileStorage.uploadFile(
            value,
            `task_submissions/${taskId}/${userId}/${Date.now()}_${value.name}`
          );
          
          if (upload.success) {
            files.push({
              original_name: value.name,
              file_name: upload.fileName,
              file_path: upload.url,
              file_size: value.size,
              mime_type: value.type
            });

            // 记录文件上传
            await this.db.createFileUpload({
              user_id: userId,
              original_name: value.name,
              file_name: upload.fileName,
              file_path: upload.url,
              file_size: value.size,
              mime_type: value.type,
              upload_type: 'task_submission',
              related_id: userTask.id
            });
          }
        }
      }

      // 创建任务提交记录
      const submission = await this.db.createTaskSubmission({
        user_task_id: userTask.id,
        user_id: userId,
        task_id: taskId,
        description,
        files: JSON.stringify(files),
        status: 'pending'
      });

      // 更新用户任务状态
      await this.db.updateUserTask(userTask.id, {
        status: 'submitted',
        submitted_at: new Date().toISOString()
      });

      // 发送任务提交通知
      try {
        const user = await this.db.getUserById(userId);
        const task = await this.db.getTaskById(taskId);
        await this.notification.sendTaskSubmittedNotification(user, task, submission);
      } catch (error) {
        console.error('发送任务提交通知失败:', error);
      }

      return successResponse({
        submission,
        message: '任务提交成功，等待审核'
      });

    } catch (error) {
      console.error('提交任务错误:', error);
      return errorResponse('提交任务失败', 500);
    }
  }

  // 获取用户的任务提交记录
  async getSubmissions(request, userId) {
    try {
      const url = new URL(request.url);
      const page = parseInt(url.searchParams.get('page')) || 1;
      const limit = parseInt(url.searchParams.get('limit')) || 10;
      const status = url.searchParams.get('status');

      const filters = { user_id: userId };
      if (status) filters.status = status;

      const submissions = await this.db.getTaskSubmissions(filters, page, limit);
      const total = await this.db.getTaskSubmissionsCount(filters);

      // 获取任务信息
      const submissionsWithTasks = await Promise.all(
        submissions.map(async (submission) => {
          const task = await this.db.getTaskById(submission.task_id);
          return {
            ...submission,
            task: task ? {
              id: task.id,
              title: task.title,
              category: task.category,
              reward_amount: task.reward_amount
            } : null
          };
        })
      );

      return successResponse({
        submissions: submissionsWithTasks,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      });

    } catch (error) {
      console.error('获取任务提交记录错误:', error);
      return errorResponse('获取提交记录失败', 500);
    }
  }

  // 获取用户已领取的任务
  async getUserTasks(request, userId) {
    try {
      const url = new URL(request.url);
      const page = parseInt(url.searchParams.get('page')) || 1;
      const limit = parseInt(url.searchParams.get('limit')) || 10;
      const status = url.searchParams.get('status');

      const filters = { user_id: userId };
      if (status) filters.status = status;

      const userTasks = await this.db.getUserTasks(userId, filters, page, limit);
      const total = await this.db.getUserTasksCount(userId, filters);

      // 获取任务详细信息
      const tasksWithDetails = await Promise.all(
        userTasks.map(async (userTask) => {
          const task = await this.db.getTaskById(userTask.task_id);
          const submissions = await this.db.getTaskSubmissions({
            user_task_id: userTask.id
          });

          return {
            ...userTask,
            task: task ? {
              id: task.id,
              title: task.title,
              description: task.description,
              category: task.category,
              reward_amount: task.reward_amount,
              deadline: task.deadline
            } : null,
            submissions
          };
        })
      );

      return successResponse({
        user_tasks: tasksWithDetails,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      });

    } catch (error) {
      console.error('获取用户任务错误:', error);
      return errorResponse('获取用户任务失败', 500);
    }
  }

  // 取消任务领取
  async cancelTask(request, userId, taskId) {
    try {
      const userTask = await this.db.getUserTask(userId, taskId);
      if (!userTask) {
        return errorResponse('您未领取此任务', 400);
      }

      if (userTask.status === 'completed' || userTask.status === 'cancelled') {
        return errorResponse('任务状态不允许取消', 400);
      }

      // 更新任务状态为已取消
      await this.db.updateUserTask(userTask.id, {
        status: 'cancelled',
        cancelled_at: new Date().toISOString()
      });

      return successResponse({
        message: '任务取消成功'
      });

    } catch (error) {
      console.error('取消任务错误:', error);
      return errorResponse('取消任务失败', 500);
    }
  }
}

