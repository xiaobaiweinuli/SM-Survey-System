/**
 * 数据库服务层
 * 封装所有数据库操作
 */

import { DatabaseError, NotFoundError } from '../utils/errors.js';
import { encrypt, decrypt, generateRandomString } from '../utils/crypto.js';

export class DatabaseService {
  constructor(db) {
    this.db = db;
  }

  // 用户相关操作
  async createUser(userData) {
    try {
      const {
        name,
        id_card_number,
        age,
        id_card_photo_url,
        face_photo_url,
        phone,
        address,
        city
      } = userData;

      // 加密敏感信息
      const encryptedIdCard = await encrypt(id_card_number, 'user_data_key');
      const encryptedPhone = phone ? await encrypt(phone, 'user_data_key') : null;

      const query = `
        INSERT INTO users (
          name, id_card_number, age, id_card_photo_url, face_photo_url,
          phone, address, city, is_verified, is_active
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const result = await this.db.prepare(query).bind(
        name,
        encryptedIdCard,
        age,
        id_card_photo_url,
        face_photo_url,
        encryptedPhone,
        address,
        city,
        true, // 注册成功即为已认证
        true
      ).run();

      if (!result.success) {
        throw new DatabaseError('用户创建失败');
      }

      return await this.getUserById(result.meta.last_row_id);
    } catch (error) {
      console.error('Create user error:', error);
      throw new DatabaseError('用户创建失败');
    }
  }

  async getUserById(id) {
    try {
      const query = 'SELECT * FROM users WHERE id = ? AND is_active = 1';
      const result = await this.db.prepare(query).bind(id).first();

      if (!result) {
        return null;
      }

      return await this.decryptUserData(result);
    } catch (error) {
      console.error('Get user by ID error:', error);
      throw new DatabaseError('获取用户信息失败');
    }
  }

  async getUserByIdCard(name, idCardNumber) {
    try {
      // 由于身份证号是加密的，需要查询所有同名用户然后逐一解密比较
      const query = 'SELECT * FROM users WHERE name = ? AND is_active = 1';
      const result = await this.db.prepare(query).bind(name).all();

      if (!result.results || result.results.length === 0) {
        return null;
      }

      for (const user of result.results) {
        try {
          const decryptedIdCard = await decrypt(user.id_card_number, 'user_data_key');
          if (decryptedIdCard === idCardNumber) {
            return await this.decryptUserData(user);
          }
        } catch (decryptError) {
          console.error('Decrypt ID card error:', decryptError);
          continue;
        }
      }

      return null;
    } catch (error) {
      console.error('Get user by ID card error:', error);
      throw new DatabaseError('获取用户信息失败');
    }
  }

  async updateUser(id, updateData) {
    try {
      const fields = [];
      const values = [];

      if (updateData.phone) {
        fields.push('phone = ?');
        values.push(await encrypt(updateData.phone, 'user_data_key'));
      }

      if (updateData.address) {
        fields.push('address = ?');
        values.push(updateData.address);
      }

      if (updateData.city) {
        fields.push('city = ?');
        values.push(updateData.city);
      }

      if (updateData.is_active !== undefined) {
        fields.push('is_active = ?');
        values.push(updateData.is_active);
      }

      if (updateData.is_verified !== undefined) {
        fields.push('is_verified = ?');
        values.push(updateData.is_verified);
      }

      if (fields.length === 0) {
        throw new DatabaseError('没有需要更新的字段');
      }

      fields.push('updated_at = ?');
      values.push(new Date().toISOString());
      values.push(id);

      const query = `UPDATE users SET ${fields.join(', ')} WHERE id = ?`;
      const result = await this.db.prepare(query).bind(...values).run();

      if (!result.success) {
        throw new DatabaseError('用户更新失败');
      }

      return await this.getUserById(id);
    } catch (error) {
      console.error('Update user error:', error);
      throw new DatabaseError('用户更新失败');
    }
  }

  async decryptUserData(user) {
    try {
      const decryptedUser = { ...user };
      
      if (user.id_card_number) {
        decryptedUser.id_card_number = await decrypt(user.id_card_number, 'user_data_key');
      }
      
      if (user.phone) {
        decryptedUser.phone = await decrypt(user.phone, 'user_data_key');
      }
      
      return decryptedUser;
    } catch (error) {
      console.error('Decrypt user data error:', error);
      throw new DatabaseError('用户数据解密失败');
    }
  }

  // 管理员相关操作
  async getAdminById(id) {
    try {
      const query = 'SELECT * FROM admins WHERE id = ? AND is_active = 1';
      const result = await this.db.prepare(query).bind(id).first();
      return result || null;
    } catch (error) {
      console.error('Get admin by ID error:', error);
      throw new DatabaseError('获取管理员信息失败');
    }
  }

  async getAdminByUsername(username) {
    try {
      const query = 'SELECT * FROM admins WHERE username = ? AND is_active = 1';
      const result = await this.db.prepare(query).bind(username).first();
      return result || null;
    } catch (error) {
      console.error('Get admin by username error:', error);
      throw new DatabaseError('获取管理员信息失败');
    }
  }

  async updateAdminLastLogin(id) {
    try {
      const query = 'UPDATE admins SET last_login_at = ? WHERE id = ?';
      await this.db.prepare(query).bind(new Date().toISOString(), id).run();
    } catch (error) {
      console.error('Update admin last login error:', error);
    }
  }

  // 会话管理
  async createUserSession(sessionData) {
    try {
      const {
        user_id,
        user_type,
        session_token,
        expires_at,
        ip_address,
        user_agent
      } = sessionData;

      const query = `
        INSERT INTO user_sessions (
          user_id, user_type, session_token, expires_at, ip_address, user_agent
        ) VALUES (?, ?, ?, ?, ?, ?)
      `;

      const result = await this.db.prepare(query).bind(
        user_id,
        user_type,
        session_token,
        expires_at,
        ip_address,
        user_agent
      ).run();

      return result.success;
    } catch (error) {
      console.error('Create user session error:', error);
      throw new DatabaseError('创建用户会话失败');
    }
  }

  async getUserSession(sessionToken) {
    try {
      const query = 'SELECT * FROM user_sessions WHERE session_token = ? AND is_active = 1';
      const result = await this.db.prepare(query).bind(sessionToken).first();
      return result || null;
    } catch (error) {
      console.error('Get user session error:', error);
      throw new DatabaseError('获取用户会话失败');
    }
  }

  async deactivateUserSession(sessionToken) {
    try {
      const query = 'UPDATE user_sessions SET is_active = 0 WHERE session_token = ?';
      await this.db.prepare(query).bind(sessionToken).run();
    } catch (error) {
      console.error('Deactivate user session error:', error);
    }
  }

  // 问卷相关操作
  async getActiveSurveyConfig() {
    try {
      const query = 'SELECT * FROM survey_configs WHERE is_active = 1 ORDER BY created_at DESC LIMIT 1';
      const result = await this.db.prepare(query).first();
      
      if (result && result.config_json) {
        result.config = JSON.parse(result.config_json);
        delete result.config_json;
      }
      
      return result || null;
    } catch (error) {
      console.error('Get active survey config error:', error);
      throw new DatabaseError('获取问卷配置失败');
    }
  }

  async createSurveySubmission(submissionData) {
    try {
      const {
        user_id,
        survey_config_id,
        submission_data,
        files_data,
        ip_address,
        user_agent
      } = submissionData;

      const query = `
        INSERT INTO survey_submissions (
          user_id, survey_config_id, submission_data, files_data, ip_address, user_agent
        ) VALUES (?, ?, ?, ?, ?, ?)
      `;

      const result = await this.db.prepare(query).bind(
        user_id,
        survey_config_id,
        JSON.stringify(submission_data),
        files_data ? JSON.stringify(files_data) : null,
        ip_address,
        user_agent
      ).run();

      if (!result.success) {
        throw new DatabaseError('问卷提交失败');
      }

      return result.meta.last_row_id;
    } catch (error) {
      console.error('Create survey submission error:', error);
      throw new DatabaseError('问卷提交失败');
    }
  }

  async getUserSurveySubmissions(userId, page = 1, limit = 10) {
    try {
      const offset = (page - 1) * limit;
      
      const query = `
        SELECT s.*, sc.title as survey_title
        FROM survey_submissions s
        LEFT JOIN survey_configs sc ON s.survey_config_id = sc.id
        WHERE s.user_id = ?
        ORDER BY s.submitted_at DESC
        LIMIT ? OFFSET ?
      `;

      const result = await this.db.prepare(query).bind(userId, limit, offset).all();
      
      const countQuery = 'SELECT COUNT(*) as total FROM survey_submissions WHERE user_id = ?';
      const countResult = await this.db.prepare(countQuery).bind(userId).first();

      return {
        submissions: result.results || [],
        pagination: {
          page,
          limit,
          total: countResult.total || 0,
          pages: Math.ceil((countResult.total || 0) / limit)
        }
      };
    } catch (error) {
      console.error('Get user survey submissions error:', error);
      throw new DatabaseError('获取问卷提交记录失败');
    }
  }

  // 任务相关操作
  async getTasks(options = {}) {
    try {
      const {
        page = 1,
        limit = 10,
        category,
        difficulty,
        random = true,
        userId
      } = options;

      let query = 'SELECT * FROM sm_tasks WHERE is_active = 1';
      const params = [];

      if (category) {
        query += ' AND category = ?';
        params.push(category);
      }

      if (difficulty) {
        query += ' AND difficulty_level = ?';
        params.push(difficulty);
      }

      if (random) {
        query += ' ORDER BY RANDOM()';
      } else {
        query += ' ORDER BY sort_order ASC, created_at DESC';
      }

      const offset = (page - 1) * limit;
      query += ` LIMIT ? OFFSET ?`;
      params.push(limit, offset);

      const result = await this.db.prepare(query).bind(...params).all();
      
      // 如果提供了用户ID，获取用户的任务状态
      if (userId && result.results) {
        for (const task of result.results) {
          const claimQuery = 'SELECT COUNT(*) as count FROM task_claims WHERE user_id = ? AND task_id = ?';
          const claimResult = await this.db.prepare(claimQuery).bind(userId, task.id).first();
          task.user_claimed = claimResult.count > 0;

          const submissionQuery = 'SELECT COUNT(*) as count FROM task_submissions WHERE user_id = ? AND task_id = ?';
          const submissionResult = await this.db.prepare(submissionQuery).bind(userId, task.id).first();
          task.user_completed = submissionResult.count || 0;
        }
      }

      const countQuery = 'SELECT COUNT(*) as total FROM sm_tasks WHERE is_active = 1';
      const countResult = await this.db.prepare(countQuery).first();

      return {
        tasks: result.results || [],
        pagination: {
          page,
          limit,
          total: countResult.total || 0,
          pages: Math.ceil((countResult.total || 0) / limit)
        }
      };
    } catch (error) {
      console.error('Get tasks error:', error);
      throw new DatabaseError('获取任务列表失败');
    }
  }

  async getTaskById(id) {
    try {
      const query = 'SELECT * FROM sm_tasks WHERE id = ? AND is_active = 1';
      const result = await this.db.prepare(query).bind(id).first();
      return result || null;
    } catch (error) {
      console.error('Get task by ID error:', error);
      throw new DatabaseError('获取任务详情失败');
    }
  }

  async claimTask(userId, taskId) {
    try {
      const query = 'INSERT INTO task_claims (user_id, task_id) VALUES (?, ?)';
      const result = await this.db.prepare(query).bind(userId, taskId).run();

      if (!result.success) {
        throw new DatabaseError('任务领取失败');
      }

      return result.meta.last_row_id;
    } catch (error) {
      console.error('Claim task error:', error);
      throw new DatabaseError('任务领取失败');
    }
  }

  async getTaskClaim(claimId) {
    try {
      const query = 'SELECT * FROM task_claims WHERE id = ?';
      const result = await this.db.prepare(query).bind(claimId).first();
      return result || null;
    } catch (error) {
      console.error('Get task claim error:', error);
      throw new DatabaseError('获取任务领取记录失败');
    }
  }

  async submitTask(submissionData) {
    try {
      const {
        user_id,
        task_id,
        claim_id,
        files_data,
        notes,
        duration_minutes
      } = submissionData;

      const query = `
        INSERT INTO task_submissions (
          user_id, task_id, claim_id, files_data, notes, duration_minutes
        ) VALUES (?, ?, ?, ?, ?, ?)
      `;

      const result = await this.db.prepare(query).bind(
        user_id,
        task_id,
        claim_id,
        files_data ? JSON.stringify(files_data) : null,
        notes,
        duration_minutes
      ).run();

      if (!result.success) {
        throw new DatabaseError('任务提交失败');
      }

      return result.meta.last_row_id;
    } catch (error) {
      console.error('Submit task error:', error);
      throw new DatabaseError('任务提交失败');
    }
  }

  async getUserTaskSubmissions(userId, page = 1, limit = 10) {
    try {
      const offset = (page - 1) * limit;
      
      const query = `
        SELECT ts.*, t.title as task_title, t.category
        FROM task_submissions ts
        LEFT JOIN sm_tasks t ON ts.task_id = t.id
        WHERE ts.user_id = ?
        ORDER BY ts.submitted_at DESC
        LIMIT ? OFFSET ?
      `;

      const result = await this.db.prepare(query).bind(userId, limit, offset).all();
      
      const countQuery = 'SELECT COUNT(*) as total FROM task_submissions WHERE user_id = ?';
      const countResult = await this.db.prepare(countQuery).bind(userId).first();

      return {
        submissions: result.results || [],
        pagination: {
          page,
          limit,
          total: countResult.total || 0,
          pages: Math.ceil((countResult.total || 0) / limit)
        }
      };
    } catch (error) {
      console.error('Get user task submissions error:', error);
      throw new DatabaseError('获取任务提交记录失败');
    }
  }

  // 文件相关操作
  async createFileUpload(fileData) {
    try {
      const {
        user_id,
        original_name,
        file_name,
        file_path,
        file_size,
        mime_type,
        file_hash,
        upload_type,
        related_id
      } = fileData;

      const query = `
        INSERT INTO file_uploads (
          user_id, original_name, file_name, file_path, file_size,
          mime_type, file_hash, upload_type, related_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const result = await this.db.prepare(query).bind(
        user_id,
        original_name,
        file_name,
        file_path,
        file_size,
        mime_type,
        file_hash,
        upload_type,
        related_id
      ).run();

      if (!result.success) {
        throw new DatabaseError('文件记录创建失败');
      }

      return result.meta.last_row_id;
    } catch (error) {
      console.error('Create file upload error:', error);
      throw new DatabaseError('文件记录创建失败');
    }
  }

  async getFileUploadById(id) {
    try {
      const query = 'SELECT * FROM file_uploads WHERE id = ? AND is_deleted = 0';
      const result = await this.db.prepare(query).bind(id).first();
      return result || null;
    } catch (error) {
      console.error('Get file upload by ID error:', error);
      throw new DatabaseError('获取文件信息失败');
    }
  }

  async deleteFileUpload(id) {
    try {
      const query = 'UPDATE file_uploads SET is_deleted = 1 WHERE id = ?';
      const result = await this.db.prepare(query).bind(id).run();
      return result.success;
    } catch (error) {
      console.error('Delete file upload error:', error);
      throw new DatabaseError('删除文件记录失败');
    }
  }

  // 审计日志
  async createAuditLog(logData) {
    try {
      const {
        user_id,
        user_type,
        action,
        resource_type,
        resource_id,
        details,
        ip_address,
        user_agent
      } = logData;

      const query = `
        INSERT INTO audit_logs (
          user_id, user_type, action, resource_type, resource_id,
          details, ip_address, user_agent
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;

      await this.db.prepare(query).bind(
        user_id,
        user_type,
        action,
        resource_type,
        resource_id,
        details,
        ip_address,
        user_agent
      ).run();
    } catch (error) {
      console.error('Create audit log error:', error);
      // 审计日志失败不应该影响主要操作
    }
  }

  // 系统配置
  async getSystemConfig(key) {
    try {
      const query = 'SELECT * FROM system_configs WHERE config_key = ?';
      const result = await this.db.prepare(query).bind(key).first();
      return result || null;
    } catch (error) {
      console.error('Get system config error:', error);
      throw new DatabaseError('获取系统配置失败');
    }
  }

  async getPublicConfigs() {
    try {
      const query = 'SELECT config_key, config_value, config_type FROM system_configs WHERE is_public = 1';
      const result = await this.db.prepare(query).all();
      
      const configs = {};
      if (result.results) {
        for (const config of result.results) {
          let value = config.config_value;
          
          switch (config.config_type) {
            case 'number':
              value = Number(value);
              break;
            case 'boolean':
              value = value === 'true';
              break;
            case 'json':
              try {
                value = JSON.parse(value);
              } catch (e) {
                console.error('Parse JSON config error:', e);
              }
              break;
          }
          
          configs[config.config_key] = value;
        }
      }
      
      return configs;
    } catch (error) {
      console.error('Get public configs error:', error);
      throw new DatabaseError('获取公开配置失败');
    }
  }

  // 统计相关
  async getUserStats(userId) {
    try {
      const surveysQuery = 'SELECT COUNT(*) as count FROM survey_submissions WHERE user_id = ?';
      const surveysResult = await this.db.prepare(surveysQuery).bind(userId).first();

      const tasksQuery = 'SELECT COUNT(*) as count FROM task_submissions WHERE user_id = ?';
      const tasksResult = await this.db.prepare(tasksQuery).bind(userId).first();

      const durationQuery = 'SELECT SUM(duration_minutes) as total FROM task_submissions WHERE user_id = ? AND duration_minutes IS NOT NULL';
      const durationResult = await this.db.prepare(durationQuery).bind(userId).first();

      const filesQuery = 'SELECT COUNT(*) as count FROM file_uploads WHERE user_id = ? AND is_deleted = 0';
      const filesResult = await this.db.prepare(filesQuery).bind(userId).first();

      const userQuery = 'SELECT created_at FROM users WHERE id = ?';
      const userResult = await this.db.prepare(userQuery).bind(userId).first();

      return {
        surveys_completed: surveysResult.count || 0,
        tasks_completed: tasksResult.count || 0,
        total_task_duration: durationResult.total || 0,
        files_uploaded: filesResult.count || 0,
        registration_date: userResult?.created_at || null
      };
    } catch (error) {
      console.error('Get user stats error:', error);
      throw new DatabaseError('获取用户统计失败');
    }
  }

  // ==================== 邮件模板管理 ====================
  
  // 获取邮件模板
  async getEmailTemplate(name) {
    try {
      const result = await this.db.prepare(`
        SELECT * FROM email_templates 
        WHERE name = ? AND is_active = true
      `).bind(name).first();
      
      return result;
    } catch (error) {
      console.error('Get email template error:', error);
      throw error;
    }
  }

  // 获取所有邮件模板
  async getEmailTemplates() {
    try {
      const result = await this.db.prepare(`
        SELECT * FROM email_templates 
        ORDER BY name
      `).all();
      
      return result.results || [];
    } catch (error) {
      console.error('Get email templates error:', error);
      throw error;
    }
  }

  // 创建邮件模板
  async createEmailTemplate(templateData) {
    try {
      const result = await this.db.prepare(`
        INSERT INTO email_templates (name, subject, content, format, variables, is_active)
        VALUES (?, ?, ?, ?, ?, ?)
      `).bind(
        templateData.name,
        templateData.subject,
        templateData.content,
        templateData.format || 'html',
        templateData.variables || null,
        templateData.is_active !== false
      ).run();

      return { id: result.meta.last_row_id, ...templateData };
    } catch (error) {
      console.error('Create email template error:', error);
      throw error;
    }
  }

  // 更新邮件模板
  async updateEmailTemplate(id, templateData) {
    try {
      await this.db.prepare(`
        UPDATE email_templates 
        SET subject = ?, content = ?, format = ?, variables = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).bind(
        templateData.subject,
        templateData.content,
        templateData.format || 'html',
        templateData.variables || null,
        templateData.is_active !== false,
        id
      ).run();

      return await this.getEmailTemplateById(id);
    } catch (error) {
      console.error('Update email template error:', error);
      throw error;
    }
  }

  // 根据ID获取邮件模板
  async getEmailTemplateById(id) {
    try {
      const result = await this.db.prepare(`
        SELECT * FROM email_templates WHERE id = ?
      `).bind(id).first();
      
      return result;
    } catch (error) {
      console.error('Get email template by id error:', error);
      throw error;
    }
  }

  // 删除邮件模板
  async deleteEmailTemplate(id) {
    try {
      await this.db.prepare(`
        DELETE FROM email_templates WHERE id = ?
      `).bind(id).run();

      return true;
    } catch (error) {
      console.error('Delete email template error:', error);
      throw error;
    }
  }

  // ==================== 网站配置管理 ====================

  // 获取网站配置
  async getSiteConfig(key) {
    try {
      const result = await this.db.prepare(`
        SELECT * FROM site_configs WHERE config_key = ?
      `).bind(key).first();
      
      return result;
    } catch (error) {
      console.error('Get site config error:', error);
      throw error;
    }
  }

  // 获取公开的网站配置
  async getPublicSiteConfigs() {
    try {
      const result = await this.db.prepare(`
        SELECT config_key, config_value, config_type FROM site_configs 
        WHERE is_public = true
        ORDER BY category, sort_order
      `).all();
      
      const configs = {};
      for (const config of result.results || []) {
        let value = config.config_value;
        
        // 根据类型转换值
        if (config.config_type === 'boolean') {
          value = value === 'true';
        } else if (config.config_type === 'json') {
          try {
            value = JSON.parse(value);
          } catch (e) {
            value = null;
          }
        }
        
        configs[config.config_key] = value;
      }
      
      return configs;
    } catch (error) {
      console.error('Get public site configs error:', error);
      throw error;
    }
  }

  // 获取所有网站配置（管理员用）
  async getAllSiteConfigs() {
    try {
      const result = await this.db.prepare(`
        SELECT * FROM site_configs 
        ORDER BY category, sort_order
      `).all();
      
      return result.results || [];
    } catch (error) {
      console.error('Get all site configs error:', error);
      throw error;
    }
  }

  // 更新网站配置
  async updateSiteConfig(key, value) {
    try {
      await this.db.prepare(`
        UPDATE site_configs 
        SET config_value = ?, updated_at = CURRENT_TIMESTAMP
        WHERE config_key = ?
      `).bind(value, key).run();

      return await this.getSiteConfig(key);
    } catch (error) {
      console.error('Update site config error:', error);
      throw error;
    }
  }

  // 批量更新网站配置
  async updateSiteConfigs(configs) {
    try {
      const stmt = this.db.prepare(`
        UPDATE site_configs 
        SET config_value = ?, updated_at = CURRENT_TIMESTAMP
        WHERE config_key = ?
      `);

      for (const [key, value] of Object.entries(configs)) {
        await stmt.bind(value, key).run();
      }

      return true;
    } catch (error) {
      console.error('Update site configs error:', error);
      throw error;
    }
  }

  // ==================== 网站资源管理 ====================

  // 获取网站资源
  async getSiteAsset(key) {
    try {
      const result = await this.db.prepare(`
        SELECT * FROM site_assets 
        WHERE asset_key = ? AND is_active = true
      `).bind(key).first();
      
      return result;
    } catch (error) {
      console.error('Get site asset error:', error);
      throw error;
    }
  }

  // 获取所有网站资源
  async getSiteAssets() {
    try {
      const result = await this.db.prepare(`
        SELECT * FROM site_assets 
        WHERE is_active = true
        ORDER BY category, asset_key
      `).all();
      
      return result.results || [];
    } catch (error) {
      console.error('Get site assets error:', error);
      throw error;
    }
  }

  // 创建或更新网站资源
  async upsertSiteAsset(assetData) {
    try {
      // 先检查是否存在
      const existing = await this.getSiteAsset(assetData.asset_key);
      
      if (existing) {
        // 更新
        await this.db.prepare(`
          UPDATE site_assets 
          SET file_name = ?, file_path = ?, file_size = ?, mime_type = ?, 
              category = ?, device_type = ?, updated_at = CURRENT_TIMESTAMP
          WHERE asset_key = ?
        `).bind(
          assetData.file_name,
          assetData.file_path,
          assetData.file_size,
          assetData.mime_type,
          assetData.category,
          assetData.device_type || 'all',
          assetData.asset_key
        ).run();
      } else {
        // 创建
        await this.db.prepare(`
          INSERT INTO site_assets (asset_key, file_name, file_path, file_size, mime_type, category, device_type)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).bind(
          assetData.asset_key,
          assetData.file_name,
          assetData.file_path,
          assetData.file_size,
          assetData.mime_type,
          assetData.category,
          assetData.device_type || 'all'
        ).run();
      }

      return await this.getSiteAsset(assetData.asset_key);
    } catch (error) {
      console.error('Upsert site asset error:', error);
      throw error;
    }
  }

  // ==================== 页脚链接管理 ====================

  // 获取页脚链接
  async getFooterLinks() {
    try {
      const result = await this.db.prepare(`
        SELECT * FROM footer_links 
        WHERE is_active = true
        ORDER BY group_name, sort_order
      `).all();
      
      // 按组分组
      const groups = {};
      for (const link of result.results || []) {
        if (!groups[link.group_name]) {
          groups[link.group_name] = [];
        }
        groups[link.group_name].push(link);
      }
      
      return groups;
    } catch (error) {
      console.error('Get footer links error:', error);
      throw error;
    }
  }

  // 创建页脚链接
  async createFooterLink(linkData) {
    try {
      const result = await this.db.prepare(`
        INSERT INTO footer_links (group_name, link_text, link_url, link_target, sort_order)
        VALUES (?, ?, ?, ?, ?)
      `).bind(
        linkData.group_name,
        linkData.link_text,
        linkData.link_url,
        linkData.link_target || '_self',
        linkData.sort_order || 0
      ).run();

      return { id: result.meta.last_row_id, ...linkData };
    } catch (error) {
      console.error('Create footer link error:', error);
      throw error;
    }
  }

  // 更新页脚链接
  async updateFooterLink(id, linkData) {
    try {
      await this.db.prepare(`
        UPDATE footer_links 
        SET group_name = ?, link_text = ?, link_url = ?, link_target = ?, sort_order = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).bind(
        linkData.group_name,
        linkData.link_text,
        linkData.link_url,
        linkData.link_target || '_self',
        linkData.sort_order || 0,
        id
      ).run();

      return true;
    } catch (error) {
      console.error('Update footer link error:', error);
      throw error;
    }
  }

  // 删除页脚链接
  async deleteFooterLink(id) {
    try {
      await this.db.prepare(`
        DELETE FROM footer_links WHERE id = ?
      `).bind(id).run();

      return true;
    } catch (error) {
      console.error('Delete footer link error:', error);
      throw error;
    }
  }

  // ==================== 系统公告管理 ====================

  // 获取活跃的公告
  async getActiveAnnouncements() {
    try {
      const now = new Date().toISOString();
      const result = await this.db.prepare(`
        SELECT * FROM announcements 
        WHERE is_active = true 
        AND (start_time IS NULL OR start_time <= ?)
        AND (end_time IS NULL OR end_time >= ?)
        ORDER BY position, created_at DESC
      `).bind(now, now).all();
      
      return result.results || [];
    } catch (error) {
      console.error('Get active announcements error:', error);
      throw error;
    }
  }

  // 获取所有公告
  async getAllAnnouncements() {
    try {
      const result = await this.db.prepare(`
        SELECT * FROM announcements 
        ORDER BY created_at DESC
      `).all();
      
      return result.results || [];
    } catch (error) {
      console.error('Get all announcements error:', error);
      throw error;
    }
  }

  // 创建公告
  async createAnnouncement(announcementData) {
    try {
      const result = await this.db.prepare(`
        INSERT INTO announcements (title, content, type, position, is_scrolling, is_active, start_time, end_time)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        announcementData.title,
        announcementData.content,
        announcementData.type || 'info',
        announcementData.position || 'top',
        announcementData.is_scrolling || false,
        announcementData.is_active !== false,
        announcementData.start_time || null,
        announcementData.end_time || null
      ).run();

      return { id: result.meta.last_row_id, ...announcementData };
    } catch (error) {
      console.error('Create announcement error:', error);
      throw error;
    }
  }

  // 更新公告
  async updateAnnouncement(id, announcementData) {
    try {
      await this.db.prepare(`
        UPDATE announcements 
        SET title = ?, content = ?, type = ?, position = ?, is_scrolling = ?, is_active = ?, 
            start_time = ?, end_time = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).bind(
        announcementData.title,
        announcementData.content,
        announcementData.type || 'info',
        announcementData.position || 'top',
        announcementData.is_scrolling || false,
        announcementData.is_active !== false,
        announcementData.start_time || null,
        announcementData.end_time || null,
        id
      ).run();

      return true;
    } catch (error) {
      console.error('Update announcement error:', error);
      throw error;
    }
  }

  // 删除公告
  async deleteAnnouncement(id) {
    try {
      await this.db.prepare(`
        DELETE FROM announcements WHERE id = ?
      `).bind(id).run();

      return true;
    } catch (error) {
      console.error('Delete announcement error:', error);
      throw error;
    }
  }
}

