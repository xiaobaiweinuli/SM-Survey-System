/**
 * 网站配置管理控制器
 * 处理网站配置、邮件模板、资源文件等管理功能
 */

import { DatabaseService } from '../services/database.js';
import { FileStorageService } from '../services/fileStorage.js';
import { NotificationService } from '../services/notification.js';
import { successResponse, errorResponse } from '../utils/response.js';
import { ValidationError, NotFoundError } from '../utils/errors.js';

export class SiteConfigController {
  constructor(env) {
    this.env = env;
    this.db = new DatabaseService(env.DB);
    this.fileStorage = new FileStorageService(env.BUCKET);
    this.notification = new NotificationService(env);
  }

  // ==================== 网站配置管理 ====================

  // 获取公开的网站配置
  async getPublicConfigs(request) {
    try {
      const configs = await this.db.getPublicSiteConfigs();
      
      // 获取网站资源
      const assets = await this.db.getSiteAssets();
      const assetMap = {};
      for (const asset of assets) {
        assetMap[asset.asset_key] = {
          url: asset.file_path,
          fileName: asset.file_name,
          deviceType: asset.device_type
        };
      }

      // 获取页脚链接
      const footerLinks = await this.db.getFooterLinks();

      // 获取活跃公告
      const announcements = await this.db.getActiveAnnouncements();

      return successResponse({
        configs,
        assets: assetMap,
        footerLinks,
        announcements
      });

    } catch (error) {
      console.error('Get public configs error:', error);
      return errorResponse('获取网站配置失败', 500);
    }
  }

  // 获取所有网站配置（管理员）
  async getAllConfigs(request) {
    try {
      const configs = await this.db.getAllSiteConfigs();
      const assets = await this.db.getSiteAssets();
      const footerLinks = await this.db.getFooterLinks();
      const announcements = await this.db.getAllAnnouncements();

      return successResponse({
        configs,
        assets,
        footerLinks,
        announcements
      });

    } catch (error) {
      console.error('Get all configs error:', error);
      return errorResponse('获取配置失败', 500);
    }
  }

  // 更新网站配置
  async updateConfigs(request) {
    try {
      const body = await request.json();
      const { configs } = body;

      if (!configs || typeof configs !== 'object') {
        return errorResponse('配置数据格式错误', 400);
      }

      await this.db.updateSiteConfigs(configs);

      return successResponse({ message: '配置更新成功' });

    } catch (error) {
      console.error('Update configs error:', error);
      return errorResponse('更新配置失败', 500);
    }
  }

  // ==================== 文件资源管理 ====================

  // 上传网站资源文件
  async uploadAsset(request) {
    try {
      const formData = await request.formData();
      const file = formData.get('file');
      const assetKey = formData.get('assetKey');
      const category = formData.get('category');
      const deviceType = formData.get('deviceType') || 'all';

      if (!file || !assetKey || !category) {
        return errorResponse('缺少必要参数', 400);
      }

      // 验证文件类型
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
      if (!allowedTypes.includes(file.type)) {
        return errorResponse('不支持的文件类型', 400);
      }

      // 验证文件大小（5MB）
      if (file.size > 5 * 1024 * 1024) {
        return errorResponse('文件大小不能超过5MB', 400);
      }

      // 生成文件路径
      const fileExtension = file.name.split('.').pop();
      const fileName = `${assetKey}_${Date.now()}.${fileExtension}`;
      const filePath = `assets/${category}/${fileName}`;

      // 上传文件
      const uploadResult = await this.fileStorage.uploadFile(file, filePath);
      if (!uploadResult.success) {
        return errorResponse('文件上传失败', 500);
      }

      // 保存资源记录
      const assetData = {
        asset_key: assetKey,
        file_name: file.name,
        file_path: uploadResult.url,
        file_size: file.size,
        mime_type: file.type,
        category: category,
        device_type: deviceType
      };

      const asset = await this.db.upsertSiteAsset(assetData);

      return successResponse({
        asset,
        message: '资源上传成功'
      });

    } catch (error) {
      console.error('Upload asset error:', error);
      return errorResponse('上传失败', 500);
    }
  }

  // 删除网站资源
  async deleteAsset(request) {
    try {
      const url = new URL(request.url);
      const assetKey = url.pathname.split('/').pop();

      const asset = await this.db.getSiteAsset(assetKey);
      if (!asset) {
        return errorResponse('资源不存在', 404);
      }

      // 删除文件
      await this.fileStorage.deleteFile(asset.file_path);

      // 删除数据库记录
      await this.db.prepare(`
        UPDATE site_assets SET is_active = false WHERE asset_key = ?
      `).bind(assetKey).run();

      return successResponse({ message: '资源删除成功' });

    } catch (error) {
      console.error('Delete asset error:', error);
      return errorResponse('删除失败', 500);
    }
  }

  // ==================== 页脚链接管理 ====================

  // 创建页脚链接
  async createFooterLink(request) {
    try {
      const body = await request.json();
      const { group_name, link_text, link_url, link_target, sort_order } = body;

      if (!group_name || !link_text || !link_url) {
        return errorResponse('缺少必要参数', 400);
      }

      const linkData = {
        group_name,
        link_text,
        link_url,
        link_target: link_target || '_self',
        sort_order: sort_order || 0
      };

      const link = await this.db.createFooterLink(linkData);

      return successResponse({
        link,
        message: '链接创建成功'
      });

    } catch (error) {
      console.error('Create footer link error:', error);
      return errorResponse('创建链接失败', 500);
    }
  }

  // 更新页脚链接
  async updateFooterLink(request) {
    try {
      const url = new URL(request.url);
      const linkId = url.pathname.split('/').pop();
      const body = await request.json();

      await this.db.updateFooterLink(linkId, body);

      return successResponse({ message: '链接更新成功' });

    } catch (error) {
      console.error('Update footer link error:', error);
      return errorResponse('更新链接失败', 500);
    }
  }

  // 删除页脚链接
  async deleteFooterLink(request) {
    try {
      const url = new URL(request.url);
      const linkId = url.pathname.split('/').pop();

      await this.db.deleteFooterLink(linkId);

      return successResponse({ message: '链接删除成功' });

    } catch (error) {
      console.error('Delete footer link error:', error);
      return errorResponse('删除链接失败', 500);
    }
  }

  // ==================== 系统公告管理 ====================

  // 创建公告
  async createAnnouncement(request) {
    try {
      const body = await request.json();
      const { title, content, type, position, is_scrolling, is_active, start_time, end_time } = body;

      if (!title || !content) {
        return errorResponse('缺少必要参数', 400);
      }

      const announcementData = {
        title,
        content,
        type: type || 'info',
        position: position || 'top',
        is_scrolling: is_scrolling || false,
        is_active: is_active !== false,
        start_time: start_time || null,
        end_time: end_time || null
      };

      const announcement = await this.db.createAnnouncement(announcementData);

      return successResponse({
        announcement,
        message: '公告创建成功'
      });

    } catch (error) {
      console.error('Create announcement error:', error);
      return errorResponse('创建公告失败', 500);
    }
  }

  // 更新公告
  async updateAnnouncement(request) {
    try {
      const url = new URL(request.url);
      const announcementId = url.pathname.split('/').pop();
      const body = await request.json();

      await this.db.updateAnnouncement(announcementId, body);

      return successResponse({ message: '公告更新成功' });

    } catch (error) {
      console.error('Update announcement error:', error);
      return errorResponse('更新公告失败', 500);
    }
  }

  // 删除公告
  async deleteAnnouncement(request) {
    try {
      const url = new URL(request.url);
      const announcementId = url.pathname.split('/').pop();

      await this.db.deleteAnnouncement(announcementId);

      return successResponse({ message: '公告删除成功' });

    } catch (error) {
      console.error('Delete announcement error:', error);
      return errorResponse('删除公告失败', 500);
    }
  }

  // ==================== 邮件模板管理 ====================

  // 获取所有邮件模板
  async getEmailTemplates(request) {
    try {
      const templates = await this.db.getEmailTemplates();

      return successResponse({ templates });

    } catch (error) {
      console.error('Get email templates error:', error);
      return errorResponse('获取邮件模板失败', 500);
    }
  }

  // 获取单个邮件模板
  async getEmailTemplate(request) {
    try {
      const url = new URL(request.url);
      const templateId = url.pathname.split('/').pop();

      const template = await this.db.getEmailTemplateById(templateId);
      if (!template) {
        return errorResponse('模板不存在', 404);
      }

      return successResponse({ template });

    } catch (error) {
      console.error('Get email template error:', error);
      return errorResponse('获取邮件模板失败', 500);
    }
  }

  // 创建邮件模板
  async createEmailTemplate(request) {
    try {
      const body = await request.json();
      const { name, subject, content, format, variables, is_active } = body;

      if (!name || !subject || !content) {
        return errorResponse('缺少必要参数', 400);
      }

      const templateData = {
        name,
        subject,
        content,
        format: format || 'html',
        variables: variables || null,
        is_active: is_active !== false
      };

      const template = await this.db.createEmailTemplate(templateData);

      return successResponse({
        template,
        message: '邮件模板创建成功'
      });

    } catch (error) {
      console.error('Create email template error:', error);
      if (error.message.includes('UNIQUE constraint failed')) {
        return errorResponse('模板名称已存在', 400);
      }
      return errorResponse('创建邮件模板失败', 500);
    }
  }

  // 更新邮件模板
  async updateEmailTemplate(request) {
    try {
      const url = new URL(request.url);
      const templateId = url.pathname.split('/').pop();
      const body = await request.json();

      const template = await this.db.updateEmailTemplate(templateId, body);

      return successResponse({
        template,
        message: '邮件模板更新成功'
      });

    } catch (error) {
      console.error('Update email template error:', error);
      return errorResponse('更新邮件模板失败', 500);
    }
  }

  // 删除邮件模板
  async deleteEmailTemplate(request) {
    try {
      const url = new URL(request.url);
      const templateId = url.pathname.split('/').pop();

      await this.db.deleteEmailTemplate(templateId);

      return successResponse({ message: '邮件模板删除成功' });

    } catch (error) {
      console.error('Delete email template error:', error);
      return errorResponse('删除邮件模板失败', 500);
    }
  }

  // 测试邮件模板
  async testEmailTemplate(request) {
    try {
      const body = await request.json();
      const { templateId, testEmail, testVariables } = body;

      if (!templateId || !testEmail) {
        return errorResponse('缺少必要参数', 400);
      }

      const template = await this.db.getEmailTemplateById(templateId);
      if (!template) {
        return errorResponse('模板不存在', 404);
      }

      // 渲染模板
      const renderedTemplate = await this.notification.renderEmailTemplate(template.name, testVariables || {});

      // 发送测试邮件
      const result = await this.notification.sendEmail({
        to: testEmail,
        subject: `[测试] ${renderedTemplate.subject}`,
        html: renderedTemplate.html,
        text: renderedTemplate.text
      });

      if (result.success) {
        return successResponse({ message: '测试邮件发送成功' });
      } else {
        return errorResponse(`测试邮件发送失败: ${result.error}`, 500);
      }

    } catch (error) {
      console.error('Test email template error:', error);
      return errorResponse('测试邮件发送失败', 500);
    }
  }

  // 预览邮件模板
  async previewEmailTemplate(request) {
    try {
      const body = await request.json();
      const { subject, content, format, variables } = body;

      if (!subject || !content) {
        return errorResponse('缺少必要参数', 400);
      }

      // 创建临时模板对象
      const tempTemplate = {
        name: 'preview',
        subject,
        content,
        format: format || 'html'
      };

      // 渲染模板
      const renderedTemplate = await this.notification.renderEmailTemplate('preview', variables || {});

      return successResponse({
        preview: {
          subject: renderedTemplate.subject,
          html: renderedTemplate.html,
          text: renderedTemplate.text
        }
      });

    } catch (error) {
      console.error('Preview email template error:', error);
      return errorResponse('预览邮件模板失败', 500);
    }
  }
}

