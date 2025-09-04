/**
 * 问卷控制器
 * 处理问卷配置获取、问卷提交等操作
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

export class SurveyController {
  // 获取当前活跃的问卷配置
  static async getConfig(context) {
    const { env } = context;

    try {
      const db = new DatabaseService(env.DB);
      const surveyConfig = await db.getActiveSurveyConfig();

      if (!surveyConfig) {
        throw new NotFoundError('当前没有可用的问卷');
      }

      return createResponse(surveyConfig, '获取问卷配置成功');

    } catch (error) {
      console.error('Get survey config error:', error);
      
      if (error instanceof NotFoundError) {
        throw error;
      }
      
      throw new Error('获取问卷配置失败');
    }
  }

  // 提交问卷
  static async submit(context) {
    const { env, user, validatedData, request } = context;
    const { survey_config_id, data, files } = validatedData;

    const db = new DatabaseService(env.DB);
    const fileStorage = new FileStorageService(env.BUCKET);
    const notificationService = new NotificationService(env);

    try {
      // 验证问卷配置是否存在且有效
      const surveyConfig = await db.getActiveSurveyConfig();
      if (!surveyConfig || surveyConfig.id !== survey_config_id) {
        throw new ValidationError('问卷配置无效或已过期');
      }

      // 验证问卷数据
      const validationResult = await validateSurveyData(data, surveyConfig.config);
      if (!validationResult.isValid) {
        throw new ValidationError(`问卷数据验证失败: ${validationResult.errors.join(', ')}`);
      }

      // 处理文件上传
      let filesData = null;
      if (files && files.length > 0) {
        filesData = [];
        
        for (const file of files) {
          try {
            // 生成文件名
            const fileName = `survey_files/${user.id}/${Date.now()}_${file.name}`;
            
            // 上传文件
            const fileUrl = await fileStorage.uploadFile(
              fileName,
              file.data,
              file.type,
              {
                metadata: {
                  userId: user.id.toString(),
                  surveyId: survey_config_id.toString(),
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
              upload_type: 'survey',
              related_id: survey_config_id
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

      // 创建问卷提交记录
      const submissionId = await db.createSurveySubmission({
        user_id: user.id,
        survey_config_id,
        submission_data: data,
        files_data: filesData,
        ip_address: clientIP,
        user_agent: userAgent
      });

      // 发送提交通知
      await notificationService.sendSurveySubmitNotification(
        user,
        surveyConfig.title,
        submissionId
      );

      return createResponse({
        submission_id: submissionId,
        submitted_at: new Date().toISOString(),
        files_count: filesData ? filesData.length : 0
      }, '问卷提交成功');

    } catch (error) {
      console.error('Survey submit error:', error);
      
      if (error instanceof ValidationError || error instanceof NotFoundError) {
        throw error;
      }
      
      throw new Error('问卷提交失败，请稍后重试');
    }
  }

  // 获取用户的问卷提交记录
  static async getSubmissions(context) {
    const { env, user, params } = context;
    const page = parseInt(params.page) || 1;
    const limit = parseInt(params.limit) || 10;

    try {
      const db = new DatabaseService(env.DB);
      const result = await db.getUserSurveySubmissions(user.id, page, limit);

      return createResponse(result, '获取问卷提交记录成功');

    } catch (error) {
      console.error('Get survey submissions error:', error);
      throw new Error('获取问卷提交记录失败');
    }
  }

  // 获取问卷提交详情
  static async getSubmissionDetail(context) {
    const { env, user, params } = context;
    const submissionId = parseInt(params.id);

    try {
      const db = new DatabaseService(env.DB);
      
      // 获取提交记录
      const submission = await db.getSurveySubmissionById(submissionId);
      if (!submission) {
        throw new NotFoundError('问卷提交记录不存在');
      }

      // 验证权限
      if (submission.user_id !== user.id) {
        throw new ValidationError('无权访问此问卷提交记录');
      }

      // 解析数据
      if (submission.submission_data) {
        submission.data = JSON.parse(submission.submission_data);
        delete submission.submission_data;
      }

      if (submission.files_data) {
        submission.files = JSON.parse(submission.files_data);
        delete submission.files_data;
      }

      return createResponse(submission, '获取问卷提交详情成功');

    } catch (error) {
      console.error('Get submission detail error:', error);
      
      if (error instanceof NotFoundError || error instanceof ValidationError) {
        throw error;
      }
      
      throw new Error('获取问卷提交详情失败');
    }
  }
}

// 验证问卷数据
async function validateSurveyData(data, config) {
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
          const fieldErrors = validateField(data[field.name], field);
          errors.push(...fieldErrors);
        }
      }
    }

    // 验证条件逻辑
    if (config.conditions) {
      for (const condition of config.conditions) {
        const conditionErrors = validateCondition(data, condition);
        errors.push(...conditionErrors);
      }
    }

  } catch (error) {
    console.error('Survey data validation error:', error);
    errors.push('问卷数据格式错误');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

// 验证单个字段
function validateField(value, field) {
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

    case 'email':
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailPattern.test(value)) {
        errors.push(`${field.label}格式不正确`);
      }
      break;

    case 'phone':
      const phonePattern = /^1[3-9]\d{9}$/;
      if (!phonePattern.test(value)) {
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

    case 'date':
      const dateValue = new Date(value);
      if (isNaN(dateValue.getTime())) {
        errors.push(`${field.label}日期格式不正确`);
      } else {
        if (field.minDate && dateValue < new Date(field.minDate)) {
          errors.push(`${field.label}不能早于${field.minDate}`);
        }
        if (field.maxDate && dateValue > new Date(field.maxDate)) {
          errors.push(`${field.label}不能晚于${field.maxDate}`);
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
  }

  return errors;
}

// 验证条件逻辑
function validateCondition(data, condition) {
  const errors = [];

  try {
    // 检查条件是否满足
    const conditionMet = evaluateCondition(data, condition.condition);
    
    if (conditionMet) {
      // 如果条件满足，验证相关字段
      if (condition.requiredFields) {
        for (const fieldName of condition.requiredFields) {
          if (!data[fieldName] || data[fieldName] === '') {
            errors.push(`当满足条件时，${fieldName}为必填项`);
          }
        }
      }

      if (condition.hiddenFields) {
        for (const fieldName of condition.hiddenFields) {
          if (data[fieldName] && data[fieldName] !== '') {
            errors.push(`当满足条件时，${fieldName}应为空`);
          }
        }
      }
    }

  } catch (error) {
    console.error('Condition validation error:', error);
    errors.push('条件逻辑验证失败');
  }

  return errors;
}

// 评估条件表达式
function evaluateCondition(data, condition) {
  try {
    // 简单的条件评估实现
    // 支持格式: field_name == "value" 或 field_name != "value"
    
    const parts = condition.split(/\s*(==|!=)\s*/);
    if (parts.length !== 3) {
      return false;
    }

    const [fieldName, operator, expectedValue] = parts;
    const actualValue = data[fieldName];
    const cleanExpectedValue = expectedValue.replace(/['"]/g, '');

    switch (operator) {
      case '==':
        return actualValue === cleanExpectedValue;
      case '!=':
        return actualValue !== cleanExpectedValue;
      default:
        return false;
    }

  } catch (error) {
    console.error('Evaluate condition error:', error);
    return false;
  }
}

