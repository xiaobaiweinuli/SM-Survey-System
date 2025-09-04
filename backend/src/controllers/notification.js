/**
 * 通知控制器
 * 处理通知相关的API请求
 */

import { DatabaseService } from '../services/database.js';
import { NotificationService } from '../services/notification.js';
import { successResponse, errorResponse } from '../utils/response.js';
import { ValidationError, NotFoundError } from '../utils/errors.js';

export class NotificationController {
  constructor(env) {
    this.env = env;
    this.db = new DatabaseService(env.DB);
    this.notification = new NotificationService(env);
  }

  // 获取用户通知列表
  async getNotifications(request, userId) {
    try {
      const url = new URL(request.url);
      const page = parseInt(url.searchParams.get('page')) || 1;
      const limit = parseInt(url.searchParams.get('limit')) || 20;
      const type = url.searchParams.get('type');
      const isRead = url.searchParams.get('is_read');

      const filters = { user_id: userId };
      if (type) filters.type = type;
      if (isRead !== null) filters.is_read = isRead === 'true';

      const notifications = await this.db.getUserNotifications(userId, filters, page, limit);
      const total = await this.db.getUserNotificationsCount(userId, filters);
      const unreadCount = await this.db.getUnreadNotificationsCount(userId);

      return successResponse({
        notifications,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        },
        unread_count: unreadCount
      });

    } catch (error) {
      console.error('获取通知列表错误:', error);
      return errorResponse('获取通知列表失败', 500);
    }
  }

  // 标记通知为已读
  async markAsRead(request, userId, notificationId) {
    try {
      const notification = await this.db.getNotification(notificationId);
      if (!notification) {
        return errorResponse('通知不存在', 404);
      }

      if (notification.user_id !== userId) {
        return errorResponse('无权操作此通知', 403);
      }

      if (notification.is_read) {
        return successResponse({ message: '通知已经是已读状态' });
      }

      await this.db.markNotificationAsRead(notificationId);

      return successResponse({ message: '通知已标记为已读' });

    } catch (error) {
      console.error('标记通知已读错误:', error);
      return errorResponse('标记通知已读失败', 500);
    }
  }

  // 批量标记通知为已读
  async batchMarkAsRead(request, userId) {
    try {
      const body = await request.json();
      const { notificationIds, markAll = false } = body;

      if (markAll) {
        // 标记用户所有未读通知为已读
        await this.db.markAllNotificationsAsRead(userId);
        return successResponse({ message: '所有通知已标记为已读' });
      }

      if (!Array.isArray(notificationIds) || notificationIds.length === 0) {
        return errorResponse('请提供要标记的通知ID列表', 400);
      }

      const results = [];

      for (const notificationId of notificationIds) {
        try {
          const notification = await this.db.getNotification(notificationId);
          if (!notification) {
            results.push({ notificationId, success: false, error: '通知不存在' });
            continue;
          }

          if (notification.user_id !== userId) {
            results.push({ notificationId, success: false, error: '无权操作此通知' });
            continue;
          }

          if (!notification.is_read) {
            await this.db.markNotificationAsRead(notificationId);
          }

          results.push({ notificationId, success: true });

        } catch (error) {
          console.error(`标记通知已读失败 ${notificationId}:`, error);
          results.push({ notificationId, success: false, error: '操作失败' });
        }
      }

      const successCount = results.filter(r => r.success).length;
      const failCount = results.filter(r => !r.success).length;

      return successResponse({
        message: `批量标记完成，成功：${successCount}，失败：${failCount}`,
        results,
        summary: {
          total: notificationIds.length,
          success: successCount,
          failed: failCount
        }
      });

    } catch (error) {
      console.error('批量标记通知已读错误:', error);
      return errorResponse('批量标记通知已读失败', 500);
    }
  }

  // 删除通知
  async deleteNotification(request, userId, notificationId) {
    try {
      const notification = await this.db.getNotification(notificationId);
      if (!notification) {
        return errorResponse('通知不存在', 404);
      }

      if (notification.user_id !== userId) {
        return errorResponse('无权删除此通知', 403);
      }

      await this.db.deleteNotification(notificationId);

      return successResponse({ message: '通知删除成功' });

    } catch (error) {
      console.error('删除通知错误:', error);
      return errorResponse('删除通知失败', 500);
    }
  }

  // 批量删除通知
  async batchDeleteNotifications(request, userId) {
    try {
      const body = await request.json();
      const { notificationIds, deleteAll = false } = body;

      if (deleteAll) {
        // 删除用户所有通知
        await this.db.deleteAllUserNotifications(userId);
        return successResponse({ message: '所有通知已删除' });
      }

      if (!Array.isArray(notificationIds) || notificationIds.length === 0) {
        return errorResponse('请提供要删除的通知ID列表', 400);
      }

      const results = [];

      for (const notificationId of notificationIds) {
        try {
          const notification = await this.db.getNotification(notificationId);
          if (!notification) {
            results.push({ notificationId, success: false, error: '通知不存在' });
            continue;
          }

          if (notification.user_id !== userId) {
            results.push({ notificationId, success: false, error: '无权删除此通知' });
            continue;
          }

          await this.db.deleteNotification(notificationId);
          results.push({ notificationId, success: true });

        } catch (error) {
          console.error(`删除通知失败 ${notificationId}:`, error);
          results.push({ notificationId, success: false, error: '删除失败' });
        }
      }

      const successCount = results.filter(r => r.success).length;
      const failCount = results.filter(r => !r.success).length;

      return successResponse({
        message: `批量删除完成，成功：${successCount}，失败：${failCount}`,
        results,
        summary: {
          total: notificationIds.length,
          success: successCount,
          failed: failCount
        }
      });

    } catch (error) {
      console.error('批量删除通知错误:', error);
      return errorResponse('批量删除通知失败', 500);
    }
  }

  // 获取通知统计
  async getNotificationStats(request, userId) {
    try {
      const stats = await this.db.getNotificationStats(userId);

      return successResponse({ stats });

    } catch (error) {
      console.error('获取通知统计错误:', error);
      return errorResponse('获取通知统计失败', 500);
    }
  }

  // 发送测试通知
  async sendTestNotification(request, userId) {
    try {
      const body = await request.json();
      const { type = 'info', title, content, email } = body;

      if (!title || !content) {
        return errorResponse('请提供通知标题和内容', 400);
      }

      // 创建通知记录
      const notification = await this.db.createNotification({
        user_id: userId,
        type,
        title,
        content,
        is_read: false
      });

      // 如果提供了邮箱，发送邮件通知
      if (email) {
        try {
          await this.notification.sendEmail({
            to: email,
            subject: title,
            content: content,
            template: 'notification'
          });
        } catch (error) {
          console.error('发送邮件通知失败:', error);
        }
      }

      return successResponse({
        notification,
        message: '测试通知发送成功'
      });

    } catch (error) {
      console.error('发送测试通知错误:', error);
      return errorResponse('发送测试通知失败', 500);
    }
  }

  // 更新通知设置
  async updateNotificationSettings(request, userId) {
    try {
      const body = await request.json();
      const { settings } = body;

      if (!settings || typeof settings !== 'object') {
        return errorResponse('通知设置格式错误', 400);
      }

      // 更新用户通知设置
      await this.db.updateUserNotificationSettings(userId, settings);

      return successResponse({
        message: '通知设置更新成功',
        settings
      });

    } catch (error) {
      console.error('更新通知设置错误:', error);
      return errorResponse('更新通知设置失败', 500);
    }
  }

  // 获取通知设置
  async getNotificationSettings(request, userId) {
    try {
      const settings = await this.db.getUserNotificationSettings(userId);

      return successResponse({ settings });

    } catch (error) {
      console.error('获取通知设置错误:', error);
      return errorResponse('获取通知设置失败', 500);
    }
  }
}

