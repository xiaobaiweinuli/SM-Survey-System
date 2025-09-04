/**
 * 配置控制器
 * 处理系统配置相关的API请求
 */

import { DatabaseService } from '../services/database.js';
import { successResponse, errorResponse } from '../utils/response.js';
import { ValidationError, NotFoundError } from '../utils/errors.js';

export class ConfigController {
  constructor(env) {
    this.env = env;
    this.db = new DatabaseService(env.DB);
  }

  // 获取公开配置
  async getPublicConfig(request) {
    try {
      // 获取系统配置
      const configs = await this.db.getSystemConfigs();
      
      // 获取问卷配置
      const surveyConfig = await this.db.getSurveyConfig();
      
      // 获取活跃的公告
      const announcements = await this.db.getActiveAnnouncements();

      // 过滤出公开的配置项
      const publicConfigs = {};
      for (const config of configs) {
        if (config.is_public) {
          publicConfigs[config.config_key] = config.config_value;
        }
      }

      return successResponse({
        system: publicConfigs,
        survey: surveyConfig,
        announcements: announcements.map(ann => ({
          id: ann.id,
          title: ann.title,
          content: ann.content,
          type: ann.type,
          position: ann.position,
          is_scrolling: ann.is_scrolling,
          start_time: ann.start_time,
          end_time: ann.end_time
        }))
      });

    } catch (error) {
      console.error('获取公开配置错误:', error);
      return errorResponse('获取配置失败', 500);
    }
  }

  // 获取所有配置（管理员）
  async getAllConfigs(request) {
    try {
      // 获取系统配置
      const configs = await this.db.getSystemConfigs();
      
      // 获取问卷配置
      const surveyConfig = await this.db.getSurveyConfig();
      
      // 获取所有公告
      const announcements = await this.db.getAllAnnouncements();

      // 获取页脚链接
      const footerLinks = await this.db.getFooterLinks();

      // 按类别组织配置
      const configsByCategory = {};
      for (const config of configs) {
        if (!configsByCategory[config.category]) {
          configsByCategory[config.category] = {};
        }
        configsByCategory[config.category][config.config_key] = {
          value: config.config_value,
          description: config.description,
          is_public: config.is_public,
          updated_at: config.updated_at
        };
      }

      return successResponse({
        system: configsByCategory,
        survey: surveyConfig,
        announcements,
        footer_links: footerLinks
      });

    } catch (error) {
      console.error('获取所有配置错误:', error);
      return errorResponse('获取配置失败', 500);
    }
  }

  // 更新配置
  async updateConfigs(request) {
    try {
      const body = await request.json();
      const { configs } = body;

      if (!configs || typeof configs !== 'object') {
        return errorResponse('配置数据格式错误', 400);
      }

      const results = [];

      // 更新配置项
      for (const [key, value] of Object.entries(configs)) {
        try {
          await this.db.updateSystemConfig(key, value);
          results.push({ key, success: true });
        } catch (error) {
          console.error(`更新配置失败 ${key}:`, error);
          results.push({ key, success: false, error: error.message });
        }
      }

      const successCount = results.filter(r => r.success).length;
      const failCount = results.filter(r => !r.success).length;

      return successResponse({
        message: `配置更新完成，成功：${successCount}，失败：${failCount}`,
        results,
        summary: {
          total: Object.keys(configs).length,
          success: successCount,
          failed: failCount
        }
      });

    } catch (error) {
      console.error('更新配置错误:', error);
      return errorResponse('更新配置失败', 500);
    }
  }

  // 更新问卷配置
  async updateSurveyConfig(request) {
    try {
      const body = await request.json();
      const { config } = body;

      if (!config) {
        return errorResponse('缺少问卷配置数据', 400);
      }

      // 验证问卷配置格式
      if (!config.title || !config.fields || !Array.isArray(config.fields)) {
        return errorResponse('问卷配置格式错误', 400);
      }

      await this.db.updateSurveyConfig(config);

      return successResponse({
        message: '问卷配置更新成功',
        config
      });

    } catch (error) {
      console.error('更新问卷配置错误:', error);
      return errorResponse('更新问卷配置失败', 500);
    }
  }

  // 重置配置到默认值
  async resetConfigs(request) {
    try {
      const body = await request.json();
      const { keys } = body;

      if (!Array.isArray(keys) || keys.length === 0) {
        return errorResponse('请提供要重置的配置键列表', 400);
      }

      const results = [];

      for (const key of keys) {
        try {
          await this.db.resetSystemConfigToDefault(key);
          results.push({ key, success: true });
        } catch (error) {
          console.error(`重置配置失败 ${key}:`, error);
          results.push({ key, success: false, error: error.message });
        }
      }

      const successCount = results.filter(r => r.success).length;
      const failCount = results.filter(r => !r.success).length;

      return successResponse({
        message: `配置重置完成，成功：${successCount}，失败：${failCount}`,
        results,
        summary: {
          total: keys.length,
          success: successCount,
          failed: failCount
        }
      });

    } catch (error) {
      console.error('重置配置错误:', error);
      return errorResponse('重置配置失败', 500);
    }
  }

  // 获取配置历史
  async getConfigHistory(request) {
    try {
      const url = new URL(request.url);
      const configKey = url.searchParams.get('key');
      const page = parseInt(url.searchParams.get('page')) || 1;
      const limit = parseInt(url.searchParams.get('limit')) || 20;

      if (!configKey) {
        return errorResponse('请提供配置键', 400);
      }

      const history = await this.db.getConfigHistory(configKey, page, limit);
      const total = await this.db.getConfigHistoryCount(configKey);

      return successResponse({
        history,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      });

    } catch (error) {
      console.error('获取配置历史错误:', error);
      return errorResponse('获取配置历史失败', 500);
    }
  }

  // 导出配置
  async exportConfigs(request) {
    try {
      const url = new URL(request.url);
      const category = url.searchParams.get('category');

      let configs;
      if (category) {
        configs = await this.db.getSystemConfigsByCategory(category);
      } else {
        configs = await this.db.getSystemConfigs();
      }

      // 组织导出数据
      const exportData = {
        export_time: new Date().toISOString(),
        category: category || 'all',
        configs: {}
      };

      for (const config of configs) {
        exportData.configs[config.config_key] = {
          value: config.config_value,
          description: config.description,
          category: config.category,
          is_public: config.is_public
        };
      }

      return successResponse({
        data: exportData,
        filename: `config_export_${category || 'all'}_${Date.now()}.json`
      });

    } catch (error) {
      console.error('导出配置错误:', error);
      return errorResponse('导出配置失败', 500);
    }
  }

  // 导入配置
  async importConfigs(request) {
    try {
      const body = await request.json();
      const { data, overwrite = false } = body;

      if (!data || !data.configs) {
        return errorResponse('导入数据格式错误', 400);
      }

      const results = [];

      for (const [key, configData] of Object.entries(data.configs)) {
        try {
          // 检查配置是否已存在
          const existingConfig = await this.db.getSystemConfig(key);
          
          if (existingConfig && !overwrite) {
            results.push({ 
              key, 
              success: false, 
              error: '配置已存在，使用覆盖模式导入' 
            });
            continue;
          }

          await this.db.updateSystemConfig(key, configData.value, {
            description: configData.description,
            category: configData.category,
            is_public: configData.is_public
          });

          results.push({ key, success: true });

        } catch (error) {
          console.error(`导入配置失败 ${key}:`, error);
          results.push({ key, success: false, error: error.message });
        }
      }

      const successCount = results.filter(r => r.success).length;
      const failCount = results.filter(r => !r.success).length;

      return successResponse({
        message: `配置导入完成，成功：${successCount}，失败：${failCount}`,
        results,
        summary: {
          total: Object.keys(data.configs).length,
          success: successCount,
          failed: failCount
        }
      });

    } catch (error) {
      console.error('导入配置错误:', error);
      return errorResponse('导入配置失败', 500);
    }
  }
}

