/**
 * 数据验证中间件
 */

import { ValidationError } from '../utils/errors.js';

// 验证规则定义
const validationRules = {
  // 用户注册验证
  register: {
    name: {
      required: true,
      type: 'string',
      minLength: 2,
      maxLength: 50,
      pattern: /^[\u4e00-\u9fa5a-zA-Z\s]+$/,
      message: '姓名必须为2-50个字符的中文或英文'
    },
    id_card_number: {
      required: true,
      type: 'string',
      pattern: /^[1-9]\d{5}(18|19|20)\d{2}((0[1-9])|(1[0-2]))(([0-2][1-9])|10|20|30|31)\d{3}[0-9Xx]$/,
      message: '身份证号格式不正确'
    },
    id_card_photo: {
      required: true,
      type: 'string',
      minLength: 100,
      message: '身份证照片不能为空'
    },
    face_photo: {
      required: true,
      type: 'string',
      minLength: 100,
      message: '人脸照片不能为空'
    }
  },

  // 用户登录验证
  login: {
    name: {
      required: true,
      type: 'string',
      minLength: 2,
      maxLength: 50,
      message: '请输入正确的姓名'
    },
    id_card_number: {
      required: true,
      type: 'string',
      pattern: /^[1-9]\d{5}(18|19|20)\d{2}((0[1-9])|(1[0-2]))(([0-2][1-9])|10|20|30|31)\d{3}[0-9Xx]$/,
      message: '身份证号格式不正确'
    }
  },

  // 管理员登录验证
  adminLogin: {
    username: {
      required: true,
      type: 'string',
      minLength: 3,
      maxLength: 50,
      message: '用户名必须为3-50个字符'
    },
    password: {
      required: true,
      type: 'string',
      minLength: 6,
      maxLength: 100,
      message: '密码必须为6-100个字符'
    }
  },

  // 更新用户资料验证
  updateProfile: {
    phone: {
      required: false,
      type: 'string',
      pattern: /^1[3-9]\d{9}$/,
      message: '手机号格式不正确'
    },
    address: {
      required: false,
      type: 'string',
      maxLength: 200,
      message: '地址不能超过200个字符'
    },
    city: {
      required: false,
      type: 'string',
      maxLength: 50,
      message: '城市名称不能超过50个字符'
    }
  },

  // 问卷提交验证
  surveySubmit: {
    survey_config_id: {
      required: true,
      type: 'number',
      min: 1,
      message: '问卷配置ID无效'
    },
    data: {
      required: true,
      type: 'object',
      message: '问卷数据不能为空'
    },
    files: {
      required: false,
      type: 'array',
      message: '文件数据格式不正确'
    }
  },

  // 任务提交验证
  taskSubmit: {
    claim_id: {
      required: true,
      type: 'number',
      min: 1,
      message: '任务领取ID无效'
    },
    files: {
      required: true,
      type: 'array',
      minLength: 1,
      message: '至少需要上传一个文件'
    },
    notes: {
      required: false,
      type: 'string',
      maxLength: 1000,
      message: '备注不能超过1000个字符'
    },
    duration_minutes: {
      required: false,
      type: 'number',
      min: 1,
      max: 1440,
      message: '任务时长必须在1-1440分钟之间'
    }
  },

  // 创建问卷验证
  createSurvey: {
    title: {
      required: true,
      type: 'string',
      minLength: 2,
      maxLength: 100,
      message: '问卷标题必须为2-100个字符'
    },
    description: {
      required: false,
      type: 'string',
      maxLength: 500,
      message: '问卷描述不能超过500个字符'
    },
    config_json: {
      required: true,
      type: 'object',
      message: '问卷配置不能为空'
    }
  },

  // 创建任务验证
  createTask: {
    title: {
      required: true,
      type: 'string',
      minLength: 2,
      maxLength: 100,
      message: '任务标题必须为2-100个字符'
    },
    description: {
      required: true,
      type: 'string',
      minLength: 10,
      maxLength: 1000,
      message: '任务描述必须为10-1000个字符'
    },
    content: {
      required: false,
      type: 'string',
      maxLength: 5000,
      message: '任务内容不能超过5000个字符'
    },
    category: {
      required: false,
      type: 'string',
      maxLength: 50,
      message: '任务分类不能超过50个字符'
    },
    difficulty_level: {
      required: false,
      type: 'number',
      min: 1,
      max: 5,
      message: '难度等级必须在1-5之间'
    },
    estimated_duration: {
      required: false,
      type: 'number',
      min: 1,
      max: 1440,
      message: '预估时长必须在1-1440分钟之间'
    }
  },

  // 更新用户状态验证
  updateUserStatus: {
    is_active: {
      required: false,
      type: 'boolean',
      message: '激活状态必须为布尔值'
    },
    is_verified: {
      required: false,
      type: 'boolean',
      message: '认证状态必须为布尔值'
    }
  },

  // Webhook验证
  webhook: {
    type: {
      required: true,
      type: 'string',
      enum: ['user_register', 'survey_submit', 'task_submit'],
      message: '通知类型无效'
    },
    data: {
      required: true,
      type: 'object',
      message: '通知数据不能为空'
    }
  }
};

// 验证单个字段
function validateField(value, rule, fieldName) {
  const errors = [];

  // 必填验证
  if (rule.required && (value === undefined || value === null || value === '')) {
    errors.push(`${fieldName}不能为空`);
    return errors;
  }

  // 如果字段不是必填且为空，跳过其他验证
  if (!rule.required && (value === undefined || value === null || value === '')) {
    return errors;
  }

  // 类型验证
  if (rule.type) {
    const actualType = Array.isArray(value) ? 'array' : typeof value;
    if (actualType !== rule.type) {
      errors.push(`${fieldName}类型错误，期望${rule.type}，实际${actualType}`);
      return errors;
    }
  }

  // 字符串验证
  if (rule.type === 'string' && typeof value === 'string') {
    if (rule.minLength && value.length < rule.minLength) {
      errors.push(`${fieldName}长度不能少于${rule.minLength}个字符`);
    }
    if (rule.maxLength && value.length > rule.maxLength) {
      errors.push(`${fieldName}长度不能超过${rule.maxLength}个字符`);
    }
    if (rule.pattern && !rule.pattern.test(value)) {
      errors.push(rule.message || `${fieldName}格式不正确`);
    }
  }

  // 数字验证
  if (rule.type === 'number' && typeof value === 'number') {
    if (rule.min !== undefined && value < rule.min) {
      errors.push(`${fieldName}不能小于${rule.min}`);
    }
    if (rule.max !== undefined && value > rule.max) {
      errors.push(`${fieldName}不能大于${rule.max}`);
    }
  }

  // 数组验证
  if (rule.type === 'array' && Array.isArray(value)) {
    if (rule.minLength && value.length < rule.minLength) {
      errors.push(`${fieldName}至少需要${rule.minLength}个元素`);
    }
    if (rule.maxLength && value.length > rule.maxLength) {
      errors.push(`${fieldName}最多只能有${rule.maxLength}个元素`);
    }
  }

  // 枚举验证
  if (rule.enum && !rule.enum.includes(value)) {
    errors.push(`${fieldName}值无效，允许的值：${rule.enum.join(', ')}`);
  }

  return errors;
}

// 验证数据
function validateData(data, rules) {
  const errors = [];

  for (const [fieldName, rule] of Object.entries(rules)) {
    const fieldErrors = validateField(data[fieldName], rule, fieldName);
    errors.push(...fieldErrors);
  }

  return errors;
}

// 验证中间件工厂
export function validateMiddleware(ruleName) {
  return async function(context) {
    const { request } = context;
    
    const rules = validationRules[ruleName];
    if (!rules) {
      throw new Error(`Validation rule '${ruleName}' not found`);
    }

    let data;
    try {
      const contentType = request.headers.get('Content-Type') || '';
      
      if (contentType.includes('application/json')) {
        data = await request.json();
      } else if (contentType.includes('multipart/form-data')) {
        const formData = await request.formData();
        data = {};
        for (const [key, value] of formData.entries()) {
          data[key] = value;
        }
      } else {
        data = {};
      }
    } catch (error) {
      throw new ValidationError('请求数据格式错误');
    }

    const errors = validateData(data, rules);
    
    if (errors.length > 0) {
      throw new ValidationError('数据验证失败', { errors });
    }

    // 将验证后的数据添加到上下文
    context.validatedData = data;
  };
}

// 自定义验证函数
export function customValidation(validatorFn) {
  return async function(context) {
    const { request } = context;
    
    let data;
    try {
      data = await request.json();
    } catch (error) {
      throw new ValidationError('请求数据格式错误');
    }

    const result = await validatorFn(data, context);
    
    if (result !== true) {
      throw new ValidationError(result || '数据验证失败');
    }

    context.validatedData = data;
  };
}

// 文件验证
export function validateFile(file, options = {}) {
  const errors = [];
  
  const {
    maxSize = 50 * 1024 * 1024, // 50MB
    allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'video/mp4', 'video/mov'],
    required = false
  } = options;

  if (required && !file) {
    errors.push('文件不能为空');
    return errors;
  }

  if (!file) {
    return errors;
  }

  if (file.size > maxSize) {
    errors.push(`文件大小不能超过${Math.round(maxSize / 1024 / 1024)}MB`);
  }

  if (!allowedTypes.includes(file.type)) {
    errors.push(`不支持的文件类型，允许的类型：${allowedTypes.join(', ')}`);
  }

  return errors;
}

