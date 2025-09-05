/**
 * API客户端库
 * 封装所有与后端API的通信
 */

// API基础URL配置
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8787';

// 创建API客户端实例
let tokenStorage = null;

// 获取Token函数
export const getToken = () => {
  return tokenStorage || localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
};

class ApiClient {
  constructor() {
    this.baseURL = API_BASE_URL;
    this.token = null;
  }

  // 设置认证Token
  setToken(token) {
    this.token = token;
    tokenStorage = token;
  }

  // 获取请求头
  getHeaders() {
    const headers = {
      'Content-Type': 'application/json',
    };

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    return headers;
  }

  // 处理响应
  async handleResponse(response) {
    const data = await response.json();

    if (!response.ok) {
      throw {
        status: response.status,
        response: {
          data: data
        }
      };
    }

    return data;
  }

  // GET请求
  async get(endpoint,params = {}) {
    const url = new URL(`${this.baseURL}/api${endpoint}`);
    
    // 添加查询参数
    Object.keys(params).forEach(key => {
      if (params[key] !== undefined && params[key] !== null) {
        url.searchParams.append(key,params[key]);
      }
    });

    const response = await fetch(url.toString(),{
      method: 'GET',
      headers: this.getHeaders(),
    });

    return this.handleResponse(response);
  }

  // POST请求
  async post(endpoint,data = {}) {
    const response = await fetch(`${this.baseURL}/api${endpoint}`,{
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });

    return this.handleResponse(response);
  }

  // PUT请求
  async put(endpoint,data = {}) {
    const response = await fetch(`${this.baseURL}/api${endpoint}`,{
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });

    return this.handleResponse(response);
  }

  // DELETE请求
  async delete(endpoint) {
    const response = await fetch(`${this.baseURL}/api${endpoint}`,{
      method: 'DELETE',
      headers: this.getHeaders(),
    });

    return this.handleResponse(response);
  }

  // 文件上传
  async uploadFile(endpoint,file,additionalData = {}) {
    const formData = new FormData();
    formData.append('file',file);
    
    // 添加额外数据
    Object.keys(additionalData).forEach(key => {
      formData.append(key,additionalData[key]);
    });

    const headers = {};
    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    const response = await fetch(`${this.baseURL}/api${endpoint}`,{
      method: 'POST',
      headers,
      body: formData,
    });

    return this.handleResponse(response);
  }

  // Base64文件上传
  async uploadBase64File(endpoint,base64Data,fileName,mimeType,additionalData = {}) {
    const data = {
      file_data: base64Data,
      file_name: fileName,
      mime_type: mimeType,
      ...additionalData
    };

    return this.post(endpoint,data);
  }

  // 批量请求
  async batch(requests) {
    const promises = requests.map(request => {
      const { method,endpoint,data,params } = request;
      
      switch (method.toLowerCase()) {
        case 'get':
          return this.get(endpoint,params);
        case 'post':
          return this.post(endpoint,data);
        case 'put':
          return this.put(endpoint,data);
        case 'delete':
          return this.delete(endpoint);
        default:
          throw new Error(`Unsupported method: ${method}`);
      }
    });

    return Promise.allSettled(promises);
  }
}

// 创建API客户端实例
export const apiClient = new ApiClient();

// API端点常量
export const API_ENDPOINTS = {
  // 认证相关
  AUTH: {
    REGISTER: '/auth/register',
    LOGIN: '/auth/login',
    ADMIN_LOGIN: '/auth/admin/login',
    REFRESH: '/auth/refresh',
    LOGOUT: '/auth/logout'
  },

  // 用户相关
  USER: {
    PROFILE: '/user/profile',
    STATS: '/user/stats'
  },

  // 问卷相关
  SURVEY: {
    CONFIG: '/survey/config',
    SUBMIT: '/survey/submit',
    SUBMISSIONS: '/survey/submissions'
  },

  // 任务相关
  TASKS: {
    LIST: '/tasks',
    DETAIL: (id) => `/tasks/${id}`,
    CLAIM: (id) => `/tasks/${id}/claim`,
    SUBMIT: (id) => `/tasks/${id}/submit`,
    SUBMISSIONS: '/tasks/submissions'
  },

  // 文件相关
  FILES: {
    UPLOAD: '/files/upload',
    DETAIL: (id) => `/files/${id}`,
    DELETE: (id) => `/files/${id}`
  },

  // 管理后台
  ADMIN: {
    USERS: '/admin/users',
    USER_DETAIL: (id) => `/admin/users/${id}`,
    USER_STATUS: (id) => `/admin/users/${id}/status`,
    SURVEYS: '/admin/surveys',
    SURVEY_DETAIL: (id) => `/admin/surveys/${id}`,
    SURVEY_STATS: (id) => `/admin/surveys/${id}/stats`,
    TASKS: '/admin/tasks',
    TASK_DETAIL: (id) => `/admin/tasks/${id}`,
    TASK_STATS: (id) => `/admin/tasks/${id}/stats`,
    EXPORT_USERS: '/admin/export/users',
    EXPORT_SURVEYS: '/admin/export/surveys',
    EXPORT_TASKS: '/admin/export/tasks'
  },

  // 系统配置
  CONFIG: {
    PUBLIC: '/config/public',
    UPDATE: '/admin/config'
  },

  // 通知相关
  NOTIFICATIONS: {
    LIST: '/notifications',
    MARK_READ: (id) => `/notifications/${id}/read`
  }
};

// 便捷方法
export const authAPI = {
  register: (data) => apiClient.post(API_ENDPOINTS.AUTH.REGISTER,data),
  login: (data) => apiClient.post(API_ENDPOINTS.AUTH.LOGIN,data),
  adminLogin: (data) => apiClient.post(API_ENDPOINTS.AUTH.ADMIN_LOGIN,data),
  refresh: () => apiClient.post(API_ENDPOINTS.AUTH.REFRESH),
  logout: () => apiClient.post(API_ENDPOINTS.AUTH.LOGOUT)
};

export const userAPI = {
  getProfile: () => apiClient.get(API_ENDPOINTS.USER.PROFILE),
  updateProfile: (data) => apiClient.put(API_ENDPOINTS.USER.PROFILE,data),
  getStats: () => apiClient.get(API_ENDPOINTS。USER.STATS)
};

export const surveyAPI = {
  getConfig: () => apiClient。get(API_ENDPOINTS。SURVEY.CONFIG),
  submit: (data) => apiClient。post(API_ENDPOINTS.SURVEY.SUBMIT,data),
  getSubmissions: (params) => apiClient.get(API_ENDPOINTS.SURVEY.SUBMISSIONS,params)
};

export const tasksAPI = {
  getTasks: (params) => apiClient.get(API_ENDPOINTS.TASKS.LIST,params),
  getTask: (id) => apiClient.get(API_ENDPOINTS。TASKS。DETAIL(id)),
  claimTask: (id) => apiClient.post(API_ENDPOINTS.TASKS.CLAIM(id)),
  submitTask: (id,data) => apiClient.post(API_ENDPOINTS.TASKS.SUBMIT(id),data),
  getSubmissions: (params) => apiClient.get(API_ENDPOINTS。TASKS.SUBMISSIONS,params)
};

export const filesAPI = {
  upload: (file,additionalData) => apiClient。uploadFile(API_ENDPOINTS.FILES.UPLOAD,file,additionalData),
  uploadBase64: (base64Data,fileName,mimeType,additionalData) => 
    apiClient.uploadBase64File(API_ENDPOINTS.FILES.UPLOAD,base64Data,fileName,mimeType,additionalData),
  getFile: (id) => apiClient.get(API_ENDPOINTS.FILES.DETAIL(id)),
  deleteFile: (id) => apiClient。delete(API_ENDPOINTS。FILES.DELETE(id))
};

export const adminAPI = {
  getUsers: (params) => apiClient。get(API_ENDPOINTS。ADMIN.USERS,params),
  getUser: (id) => apiClient。get(API_ENDPOINTS。ADMIN.USER_DETAIL(id)),
  updateUserStatus: (id,data) => apiClient.put(API_ENDPOINTS.ADMIN.USER_STATUS(id),data),
  getSurveys: (params) => apiClient。get(API_ENDPOINTS.ADMIN.SURVEYS,params),
  createSurvey: (data) => apiClient.post(API_ENDPOINTS.ADMIN.SURVEYS,data),
  updateSurvey: (id,data) => apiClient.put(API_ENDPOINTS.ADMIN.SURVEY_DETAIL(id),data),
  getSurveyStats: (id) => apiClient.get(API_ENDPOINTS.ADMIN.SURVEY_STATS(id)),
  getTasks: (params) => apiClient.get(API_ENDPOINTS.ADMIN.TASKS,params),
  createTask: (data) => apiClient.post(API_ENDPOINTS.ADMIN.TASKS,data),
  updateTask: (id,data) => apiClient.put(API_ENDPOINTS.ADMIN.TASK_DETAIL(id),data),
  getTaskStats: (id) => apiClient.get(API_ENDPOINTS.ADMIN.TASK_STATS(id)),
  exportUsers: (params) => apiClient.get(API_ENDPOINTS。ADMIN.EXPORT_USERS,params),
  exportSurveys: (params) => apiClient.get(API_ENDPOINTS。ADMIN.EXPORT_SURVEYS,params),
  exportTasks: (params) => apiClient.get(API_ENDPOINTS.ADMIN.EXPORT_TASKS,params)
};

export const configAPI = {
  getPublicConfig: () => apiClient.get(API_ENDPOINTS.CONFIG.PUBLIC),
  updateConfig: (data) => apiClient.put(API_ENDPOINTS.CONFIG.UPDATE,data)
};

export const notificationsAPI = {
  getNotifications: (params) => apiClient.get(API_ENDPOINTS.NOTIFICATIONS.LIST,params),
  markAsRead: (id) => apiClient.put(API_ENDPOINTS.NOTIFICATIONS.MARK_READ(id))
};


// ==================== 网站配置管理 ====================

// 获取公开的网站配置
export const getPublicSiteConfigs = async () => {
  const response = await fetch(`${API_BASE_URL}/site-config/public`,{
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response。ok) {
    throw new 错误('获取网站配置失败');
  }

  return response.json();
};

// 获取所有网站配置（管理员）
export const getAllSiteConfigs = async () => {
  const response = await fetch(`${API_BASE_URL}/admin/site-config`,{
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getToken()}`,
    },
  });

  if (!response.ok) {
    throw new Error('获取配置失败');
  }

  return response.json();
};

// 更新网站配置
export const updateSiteConfigs = async (configs) => {
  const response = await fetch(`${API_BASE_URL}/admin/site-config`,{
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getToken()}`,
    },
    body: JSON.stringify({ configs }),
  });

  if (!response.ok) {
    throw new Error('更新配置失败');
  }

  return response.json();
};

// 上传网站资源文件
export const uploadSiteAsset = async (file,assetKey,category,deviceType = 'all') => {
  const formData = new FormData();
  formData.append('file',file);
  formData.append('assetKey',assetKey);
  formData.append('category',category);
  formData.append('deviceType',deviceType);

  const response = await fetch(`${API_BASE_URL}/admin/site-config/assets`,{
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${getToken()}`,
    },
    body: formData,
  });

  if (!response.ok) {
    throw new Error('上传资源失败');
  }

  return response.json();
};

// 删除网站资源
export const deleteSiteAsset = async (assetKey) => {
  const response = await fetch(`${API_BASE_URL}/admin/site-config/assets/${assetKey}`,{
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${getToken()}`,
    },
  });

  if (!response.ok) {
    throw new Error('删除资源失败');
  }

  return response.json();
};

// ==================== 页脚链接管理 ====================

// 创建页脚链接
export const createFooterLink = async (linkData) => {
  const response = await fetch(`${API_BASE_URL}/admin/site-config/footer-links`,{
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getToken()}`,
    },
    body: JSON.stringify(linkData),
  });

  if (!response.ok) {
    throw new Error('创建链接失败');
  }

  return response.json();
};

// 更新页脚链接
export const updateFooterLink = async (linkId,linkData) => {
  const response = await fetch(`${API_BASE_URL}/admin/site-config/footer-links/${linkId}`,{
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getToken()}`,
    },
    body: JSON.stringify(linkData),
  });

  if (!response.ok) {
    throw new Error('更新链接失败');
  }

  return response.json();
};

// 删除页脚链接
export const deleteFooterLink = async (linkId) => {
  const response = await fetch(`${API_BASE_URL}/admin/site-config/footer-links/${linkId}`,{
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${getToken()}`,
    },
  });

  if (!response.ok) {
    throw new Error('删除链接失败');
  }

  return response.json();
};

// ==================== 系统公告管理 ====================

// 创建公告
export const createAnnouncement = async (announcementData) => {
  const response = await fetch(`${API_BASE_URL}/admin/site-config/announcements`,{
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getToken()}`,
    },
    body: JSON.stringify(announcementData),
  });

  if (!response.ok) {
    throw new Error('创建公告失败');
  }

  return response.json();
};

// 更新公告
export const updateAnnouncement = async (announcementId,announcementData) => {
  const response = await fetch(`${API_BASE_URL}/admin/site-config/announcements/${announcementId}`,{
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getToken()}`,
    },
    body: JSON.stringify(announcementData),
  });

  if (!response.ok) {
    throw new Error('更新公告失败');
  }

  return response.json();
};

// 删除公告
export const deleteAnnouncement = async (announcementId) => {
  const response = await fetch(`${API_BASE_URL}/admin/site-config/announcements/${announcementId}`,{
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${getToken()}`,
    },
  });

  if (!response.ok) {
    throw new Error('删除公告失败');
  }

  return response.json();
};

// ==================== 邮件模板管理 ====================

// 获取所有邮件模板
export const getEmailTemplates = async () => {
  const response = await fetch(`${API_BASE_URL}/admin/site-config/email-templates`,{
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${getToken()}`,
    },
  });

  if (!response.ok) {
    throw new Error('获取邮件模板失败');
  }

  return response.json();
};

// 获取单个邮件模板
export const getEmailTemplate = async (templateId) => {
  const response = await fetch(`${API_BASE_URL}/admin/site-config/email-templates/${templateId}`,{
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${getToken()}`,
    },
  });

  if (!response.ok) {
    throw new 错误('获取邮件模板失败');
  }

  return response。json();
};

// 创建邮件模板
export const createEmailTemplate = async (templateData) => {
  const response = await fetch(`${API_BASE_URL}/admin/site-config/email-templates`,{
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'，
      'Authorization': `Bearer ${getToken()}`,
    },
    body: JSON.stringify(templateData),
  });

  if (!response。ok) {
    throw new 错误('创建邮件模板失败');
  }

  return response.json();
};

// 更新邮件模板
export const updateEmailTemplate = async (templateId,templateData) => {
  const response = await fetch(`${API_BASE_URL}/admin/site-config/email-templates/${templateId}`,{
    method: 'PUT'，
    headers: {
      'Content-Type': 'application/json'，
      'Authorization': `Bearer ${getToken()}`,
    },
    body: JSON.stringify(templateData),
  });

  if (!response.ok) {
    throw new 错误('更新邮件模板失败');
  }

  return response.json();
};

// 删除邮件模板
export const deleteEmailTemplate = async (templateId) => {
  const response = await fetch(`${API_BASE_URL}/admin/site-config/email-templates/${templateId}`,{
    method: 'DELETE'，
    headers: {
      'Authorization': `Bearer ${getToken()}`,
    },
  });

  if (!response.ok) {
    throw new 错误('删除邮件模板失败');
  }

  return response.json();
};

// 测试邮件模板
export const testEmailTemplate = async (templateId,testEmail，testVariables) => {
  const response = await fetch(`${API_BASE_URL}/admin/site-config/email-templates/${templateId}/test`,{
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'，
      'Authorization': `Bearer ${getToken()}`，
    }，
    body: JSON.stringify({ templateId,testEmail，testVariables }),
  });

  if (!response.ok) {
    throw new 错误('测试邮件发送失败');
  }

  return response.json();
};

// 预览邮件模板
export const previewEmailTemplate = async (templateData,variables) => {
  const response = await fetch(`${API_BASE_URL}/admin/site-config/email-templates/preview`,{
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getToken()}`,
    }，
    body: JSON.stringify({ ...templateData,variables }),
  });

  if (!response.ok) {
    throw new 错误('预览邮件模板失败');
  }

  return response.json();
};

