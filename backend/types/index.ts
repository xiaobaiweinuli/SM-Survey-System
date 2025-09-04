// TypeScript类型定义文件

// Cloudflare Workers环境变量
export interface Env {
  DB: D1Database;
  BUCKET: R2Bucket;
  JWT_SECRET: string;
  TENCENT_SECRET_ID: string;
  TENCENT_SECRET_KEY: string;
  WECHAT_WEBHOOK_URL: string;
  ENVIRONMENT: 'development' | 'staging' | 'production';
}

// 用户相关类型
export interface User {
  id: number;
  name: string;
  id_card_number: string;
  age: number;
  id_card_photo_url: string;
  face_photo_url: string;
  phone?: string;
  address?: string;
  city?: string;
  is_verified: boolean;
  is_active: boolean;
  role: 'user' | 'admin';
  created_at: string;
  updated_at: string;
}

export interface Admin {
  id: number;
  username: string;
  password_hash: string;
  email?: string;
  is_active: boolean;
  last_login_at?: string;
  created_at: string;
  updated_at: string;
}

// 认证相关类型
export interface RegisterRequest {
  name: string;
  id_card_number: string;
  id_card_photo: string; // base64
  face_photo: string; // base64
}

export interface LoginRequest {
  name: string;
  id_card_number: string;
}

export interface AdminLoginRequest {
  username: string;
  password: string;
}

export interface AuthResponse {
  user: Omit<User, 'id_card_number' | 'id_card_photo_url' | 'face_photo_url'>;
  token: string;
  expires_at: string;
}

export interface JWTPayload {
  user_id: number;
  user_type: 'user' | 'admin';
  role: string;
  iat: number;
  exp: number;
}

// 问卷相关类型
export interface SurveyField {
  id: string;
  type: 'text' | 'textarea' | 'number' | 'tel' | 'email' | 'select' | 'radio' | 'checkbox' | 'file';
  label: string;
  required: boolean;
  readonly?: boolean;
  auto_fill?: string;
  placeholder?: string;
  pattern?: string;
  options?: Array<{ value: string; label: string }>;
  accept?: string;
  multiple?: boolean;
  max_files?: number;
  max_size?: string;
}

export interface SurveyConditionalLogic {
  condition: string;
  show_fields: string[];
  hide_fields: string[];
}

export interface SurveyStep {
  title: string;
  fields: string[];
}

export interface SurveyConfig {
  id: number;
  title: string;
  description?: string;
  config: {
    fields: SurveyField[];
    conditional_logic?: SurveyConditionalLogic[];
    steps?: SurveyStep[];
  };
  is_active: boolean;
  created_by?: number;
  created_at: string;
  updated_at: string;
}

export interface SurveySubmission {
  id: number;
  user_id: number;
  survey_config_id: number;
  submission_data: Record<string, any>;
  files_data?: FileUpload[];
  ip_address?: string;
  user_agent?: string;
  submitted_at: string;
}

export interface SurveySubmitRequest {
  survey_config_id: number;
  data: Record<string, any>;
  files?: Array<{
    field_id: string;
    file_data: string; // base64
    file_name: string;
    mime_type: string;
  }>;
}

// 任务相关类型
export interface SMTask {
  id: number;
  title: string;
  description: string;
  content?: string;
  category?: string;
  difficulty_level: number;
  estimated_duration?: number;
  max_submissions: number;
  is_active: boolean;
  sort_order: number;
  created_by?: number;
  created_at: string;
  updated_at: string;
}

export interface TaskClaim {
  id: number;
  user_id: number;
  task_id: number;
  claimed_at: string;
}

export interface TaskSubmission {
  id: number;
  user_id: number;
  task_id: number;
  claim_id?: number;
  files_data?: FileUpload[];
  notes?: string;
  duration_minutes?: number;
  status: 'submitted' | 'approved' | 'rejected';
  reviewed_by?: number;
  reviewed_at?: string;
  review_notes?: string;
  submitted_at: string;
}

export interface TaskSubmitRequest {
  claim_id: number;
  files: Array<{
    file_data: string; // base64
    file_name: string;
    mime_type: string;
  }>;
  notes?: string;
  duration_minutes?: number;
}

// 文件相关类型
export interface FileUpload {
  id: number;
  user_id?: number;
  original_name: string;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  file_hash?: string;
  upload_type: 'id_card' | 'face' | 'survey' | 'task';
  related_id?: number;
  is_deleted: boolean;
  uploaded_at: string;
}

// 通知相关类型
export interface Notification {
  id: number;
  type: 'user_register' | 'survey_submit' | 'task_submit';
  title: string;
  content: string;
  recipient_type: 'admin' | 'user' | 'system';
  recipient_id?: number;
  is_read: boolean;
  sent_at?: string;
  webhook_url?: string;
  webhook_sent: boolean;
  created_at: string;
}

// 系统配置类型
export interface SystemConfig {
  id: number;
  config_key: string;
  config_value: string;
  description?: string;
  config_type: 'string' | 'number' | 'boolean' | 'json';
  is_public: boolean;
  updated_by?: number;
  updated_at: string;
}

// 审计日志类型
export interface AuditLog {
  id: number;
  user_id?: number;
  user_type: 'user' | 'admin';
  action: string;
  resource_type: string;
  resource_id?: number;
  details?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

// 用户会话类型
export interface UserSession {
  id: number;
  user_id: number;
  user_type: 'user' | 'admin';
  session_token: string;
  expires_at: string;
  ip_address?: string;
  user_agent?: string;
  is_active: boolean;
  created_at: string;
}

// API响应类型
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  message?: string;
  timestamp: string;
}

export interface PaginationResponse<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// 第三方服务类型
export interface OCRResult {
  name: string;
  id_card_number: string;
  birth_date: string;
  address: string;
  photo_base64: string;
}

export interface FaceCompareResult {
  similarity: number;
  is_match: boolean;
  confidence: number;
}

// 统计相关类型
export interface UserStats {
  surveys_completed: number;
  tasks_completed: number;
  total_task_duration: number;
  files_uploaded: number;
  registration_date: string;
}

export interface TaskStats {
  total_claims: number;
  total_submissions: number;
  completion_rate: number;
  average_duration: number;
  user_submissions: number;
}

export interface SystemStats {
  total_users: number;
  verified_users: number;
  total_surveys: number;
  total_tasks: number;
  total_files: number;
  storage_used: number;
}

// 导出相关类型
export interface ExportOptions {
  format: 'csv' | 'excel' | 'json';
  date_from?: string;
  date_to?: string;
  filters?: Record<string, any>;
}

// 错误类型
export class ApiError extends Error {
  constructor(
    public code: string,
    public message: string,
    public statusCode: number = 400,
    public details?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// 常量定义
export const ERROR_CODES = {
  AUTH_REQUIRED: 'AUTH_REQUIRED',
  AUTH_INVALID: 'AUTH_INVALID',
  AUTH_EXPIRED: 'AUTH_EXPIRED',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  NOT_FOUND: 'NOT_FOUND',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  FILE_TYPE_NOT_ALLOWED: 'FILE_TYPE_NOT_ALLOWED',
  OCR_FAILED: 'OCR_FAILED',
  FACE_COMPARE_FAILED: 'FACE_COMPARE_FAILED',
  DATABASE_ERROR: 'DATABASE_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

export const USER_ROLES = {
  USER: 'user',
  ADMIN: 'admin',
} as const;

export const UPLOAD_TYPES = {
  ID_CARD: 'id_card',
  FACE: 'face',
  SURVEY: 'survey',
  TASK: 'task',
} as const;

export const TASK_STATUS = {
  SUBMITTED: 'submitted',
  APPROVED: 'approved',
  REJECTED: 'rejected',
} as const;

export const NOTIFICATION_TYPES = {
  USER_REGISTER: 'user_register',
  SURVEY_SUBMIT: 'survey_submit',
  TASK_SUBMIT: 'task_submit',
} as const;

