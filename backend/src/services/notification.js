/**
 * 通知服务
 * 使用Resend邮件服务发送各种通知
 */

import { DatabaseService } from './database.js';

export class NotificationService {
  constructor(env) {
    this.env = env;
    this.resendApiKey = env.RESEND_API_KEY;
    this.fromEmail = env.FROM_EMAIL || 'noreply@your-domain.com';
    this.fromName = env.FROM_NAME || 'SM任务问卷系统';
    this.webhookUrl = env.WECHAT_WEBHOOK_URL;
  }

  // 发送邮件的通用方法
  async sendEmail({ to, subject, html, text }) {
    if (!this.resendApiKey) {
      console.warn('Resend API key not configured, skipping email send');
      return { success: false, error: 'Email service not configured' };
    }

    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: `${this.fromName} <${this.fromEmail}>`,
          to: Array.isArray(to) ? to : [to],
          subject,
          html,
          text
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to send email');
      }

      return { success: true, id: result.id };

    } catch (error) {
      console.error('Send email error:', error);
      return { success: false, error: error.message };
    }
  }

  // 渲染邮件模板
  async renderEmailTemplate(templateName, variables = {}) {
    try {
      // 从数据库获取邮件模板
      const db = new DatabaseService(this.env.DB);
      const template = await db.getEmailTemplate(templateName);

      if (!template) {
        throw new Error(`Email template '${templateName}' not found`);
      }

      // 解析模板内容（支持Markdown）
      let htmlContent = template.content;
      let textContent = template.content;

      // 如果是Markdown格式，转换为HTML
      if (template.format === 'markdown') {
        htmlContent = await this.markdownToHtml(template.content);
        textContent = this.htmlToText(htmlContent);
      }

      // 替换变量
      htmlContent = this.replaceVariables(htmlContent, variables);
      textContent = this.replaceVariables(textContent, variables);

      return {
        subject: this.replaceVariables(template.subject, variables),
        html: htmlContent,
        text: textContent
      };

    } catch (error) {
      console.error('Render email template error:', error);
      
      // 返回默认模板
      return {
        subject: variables.subject || '系统通知',
        html: `<p>${variables.message || '您有一条新的系统通知'}</p>`,
        text: variables.message || '您有一条新的系统通知'
      };
    }
  }

  // Markdown转HTML
  async markdownToHtml(markdown) {
    // 简单的Markdown转换，可以使用更完整的库
    return markdown
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
      .replace(/\*(.*)\*/gim, '<em>$1</em>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/gim, '<a href="$2">$1</a>')
      .replace(/\n/gim, '<br>');
  }

  // HTML转纯文本
  htmlToText(html) {
    return html
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"');
  }

  // 替换模板变量
  replaceVariables(content, variables) {
    let result = content;
    
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      result = result.replace(regex, value || '');
    }

    return result;
  }

  // 发送用户注册通知
  async sendUserRegistrationNotification(user) {
    const template = await this.renderEmailTemplate('user_registration', {
      userName: user.name,
      userId: user.id,
      registrationTime: new Date().toLocaleString('zh-CN'),
      loginUrl: `${this.env.FRONTEND_URL}/login`
    });

    return await this.sendEmail({
      to: user.email || `${user.name}@example.com`, // 如果没有邮箱，使用默认格式
      subject: template.subject,
      html: template.html,
      text: template.text
    });
  }

  // 发送实名认证状态通知
  async sendAuthStatusNotification(user, status, reason = '') {
    const statusText = {
      'pending': '审核中',
      'approved': '已通过',
      'rejected': '已拒绝'
    };

    const template = await this.renderEmailTemplate('auth_status', {
      userName: user.name,
      status: statusText[status] || status,
      reason: reason,
      statusTime: new Date().toLocaleString('zh-CN'),
      dashboardUrl: `${this.env.FRONTEND_URL}/dashboard`
    });

    return await this.sendEmail({
      to: user.email || `${user.name}@example.com`,
      subject: template.subject,
      html: template.html,
      text: template.text
    });
  }

  // 发送问卷提交通知
  async sendSurveySubmissionNotification(user, surveyTitle) {
    const template = await this.renderEmailTemplate('survey_submission', {
      userName: user.name,
      surveyTitle: surveyTitle,
      submissionTime: new Date().toLocaleString('zh-CN'),
      dashboardUrl: `${this.env.FRONTEND_URL}/dashboard`
    });

    return await this.sendEmail({
      to: user.email || `${user.name}@example.com`,
      subject: template.subject,
      html: template.html,
      text: template.text
    });
  }

  // 发送任务领取通知
  async sendTaskClaimNotification(user, taskTitle, userTaskId) {
    const template = await this.renderEmailTemplate('task_claim', {
      userName: user.name,
      taskTitle: taskTitle,
      claimTime: new Date().toLocaleString('zh-CN'),
      taskUrl: `${this.env.FRONTEND_URL}/tasks/submission/${userTaskId}`
    });

    return await this.sendEmail({
      to: user.email || `${user.name}@example.com`,
      subject: template.subject,
      html: template.html,
      text: template.text
    });
  }

  // 发送任务提交通知
  async sendTaskSubmitNotification(user, taskTitle, userTaskId) {
    const template = await this.renderEmailTemplate('task_submit', {
      userName: user.name,
      taskTitle: taskTitle,
      submitTime: new Date().toLocaleString('zh-CN'),
      taskUrl: `${this.env.FRONTEND_URL}/tasks/submission/${userTaskId}`
    });

    return await this.sendEmail({
      to: user.email || `${user.name}@example.com`,
      subject: template.subject,
      html: template.html,
      text: template.text
    });
  }

  // 发送任务审核结果通知
  async sendTaskReviewNotification(user, taskTitle, status, feedback, rewardAmount) {
    const statusText = {
      'approved': '已通过',
      'rejected': '已拒绝'
    };

    const template = await this.renderEmailTemplate('task_review', {
      userName: user.name,
      taskTitle: taskTitle,
      status: statusText[status] || status,
      feedback: feedback || '',
      rewardAmount: rewardAmount || 0,
      reviewTime: new Date().toLocaleString('zh-CN'),
      dashboardUrl: `${this.env.FRONTEND_URL}/dashboard`
    });

    return await this.sendEmail({
      to: user.email || `${user.name}@example.com`,
      subject: template.subject,
      html: template.html,
      text: template.text
    });
  }

  // 发送用户状态变更通知
  async sendUserStatusChangeNotification(user, status, reason) {
    const statusText = {
      'active': '正常',
      'suspended': '已暂停',
      'banned': '已封禁'
    };

    const template = await this.renderEmailTemplate('user_status_change', {
      userName: user.name,
      status: statusText[status] || status,
      reason: reason || '',
      changeTime: new Date().toLocaleString('zh-CN'),
      contactUrl: `${this.env.FRONTEND_URL}/contact`
    });

    return await this.sendEmail({
      to: user.email || `${user.name}@example.com`,
      subject: template.subject,
      html: template.html,
      text: template.text
    });
  }

  // 发送系统公告通知
  async sendSystemAnnouncementNotification(users, title, content) {
    const template = await this.renderEmailTemplate('system_announcement', {
      title: title,
      content: content,
      announcementTime: new Date().toLocaleString('zh-CN'),
      websiteUrl: this.env.FRONTEND_URL
    });

    const results = [];
    
    for (const user of users) {
      const result = await this.sendEmail({
        to: user.email || `${user.name}@example.com`,
        subject: template.subject,
        html: template.html,
        text: template.text
      });
      
      results.push({
        userId: user.id,
        email: user.email || `${user.name}@example.com`,
        success: result.success,
        error: result.error
      });
    }

    return results;
  }

  // 发送自定义邮件
  async sendCustomEmail(recipients, templateName, variables = {}) {
    const template = await this.renderEmailTemplate(templateName, variables);
    const results = [];

    for (const recipient of recipients) {
      const result = await this.sendEmail({
        to: recipient.email,
        subject: template.subject,
        html: template.html,
        text: template.text
      });

      results.push({
        email: recipient.email,
        success: result.success,
        error: result.error
      });
    }

    return results;
  }

  // 发送Webhook通知（保留企业微信功能）
  async sendWebhook(message) {
    if (!this.webhookUrl) {
      console.warn('Webhook URL not configured');
      return;
    }

    try {
      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message)
      });

      if (!response.ok) {
        throw new Error(`Webhook failed: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.errcode !== 0) {
        throw new Error(`Webhook error: ${result.errmsg}`);
      }

      return true;

    } catch (error) {
      console.error('Send webhook error:', error);
      throw error;
    }
  }

  // 发送用户注册通知（企业微信）
  async sendUserRegisterNotification(user) {
    try {
      const message = {
        msgtype: 'markdown',
        markdown: {
          content: `## 新用户注册通知
          
**用户信息：**
- 姓名：${user.name}
- 年龄：${user.age}岁
- 注册时间：${new Date(user.created_at).toLocaleString('zh-CN')}
- 认证状态：${user.is_verified ? '✅ 已认证' : '❌ 未认证'}

请及时关注新用户动态。`
        }
      };

      await this.sendWebhook(message);
      
      // 同时发送邮件通知
      await this.sendUserRegistrationNotification(user);

    } catch (error) {
      console.error('Send user register notification error:', error);
    }
  }

  // 发送问卷提交通知（企业微信）
  async sendSurveySubmitNotification(user, surveyTitle, submissionId) {
    try {
      const message = {
        msgtype: 'markdown',
        markdown: {
          content: `## 问卷提交通知
          
**提交信息：**
- 用户：${user.name}
- 问卷：${surveyTitle}
- 提交ID：${submissionId}
- 提交时间：${new Date().toLocaleString('zh-CN')}

请及时查看问卷内容。`
        }
      };

      await this.sendWebhook(message);
      
      // 同时发送邮件通知
      await this.sendSurveySubmissionNotification(user, surveyTitle);

    } catch (error) {
      console.error('Send survey submit notification error:', error);
    }
  }

  // 发送任务提交通知（企业微信）
  async sendTaskSubmitWebhookNotification(user, taskTitle, submissionId) {
    try {
      const message = {
        msgtype: 'markdown',
        markdown: {
          content: `## 任务提交通知
          
**提交信息：**
- 用户：${user.name}
- 任务：${taskTitle}
- 提交ID：${submissionId}
- 提交时间：${new Date().toLocaleString('zh-CN')}

请及时审核任务完成情况。`
        }
      };

      await this.sendWebhook(message);
      
      // 同时发送邮件通知
      await this.sendTaskSubmitNotification(user, taskTitle, submissionId);

    } catch (error) {
      console.error('Send task submit notification error:', error);
    }
  }

  // 发送系统异常通知
  async sendSystemErrorNotification(error, context = {}) {
    try {
      const message = {
        msgtype: 'markdown',
        markdown: {
          content: `## 系统异常通知
          
**错误信息：**
- 错误类型：${error.name || 'Unknown'}
- 错误消息：${error.message}
- 发生时间：${new Date().toLocaleString('zh-CN')}
- 上下文：${JSON.stringify(context, null, 2)}

请及时处理系统异常。`
        }
      };

      await this.sendWebhook(message);

    } catch (webhookError) {
      console.error('Send system error notification failed:', webhookError);
    }
  }

  // 发送数据统计通知（每日/每周）
  async sendStatsNotification(stats, period = 'daily') {
    try {
      const periodText = period === 'daily' ? '日' : '周';
      
      const message = {
        msgtype: 'markdown',
        markdown: {
          content: `## ${periodText}报统计
          
**数据概览：**
- 新增用户：${stats.newUsers || 0}人
- 问卷提交：${stats.surveySubmissions || 0}份
- 任务完成：${stats.taskSubmissions || 0}个
- 文件上传：${stats.fileUploads || 0}个
- 活跃用户：${stats.activeUsers || 0}人

**系统状态：**
- 总用户数：${stats.totalUsers || 0}人
- 认证用户：${stats.verifiedUsers || 0}人
- 存储使用：${this.formatFileSize(stats.storageUsed || 0)}

统计时间：${new Date().toLocaleString('zh-CN')}`
        }
      };

      await this.sendWebhook(message);

    } catch (error) {
      console.error('Send stats notification error:', error);
    }
  }

  // 格式化文件大小
  formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

