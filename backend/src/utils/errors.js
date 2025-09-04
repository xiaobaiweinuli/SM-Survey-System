/**
 * 错误处理工具
 */

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
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
};

export class ApiError extends Error {
  constructor(code, message, statusCode = 400, details = null) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

export class ValidationError extends ApiError {
  constructor(message, details = null) {
    super(ERROR_CODES.VALIDATION_ERROR, message, 400, details);
  }
}

export class AuthError extends ApiError {
  constructor(code = ERROR_CODES.AUTH_REQUIRED, message = '认证失败') {
    super(code, message, 401);
  }
}

export class PermissionError extends ApiError {
  constructor(message = '权限不足') {
    super(ERROR_CODES.PERMISSION_DENIED, message, 403);
  }
}

export class NotFoundError extends ApiError {
  constructor(message = '资源不存在') {
    super(ERROR_CODES.NOT_FOUND, message, 404);
  }
}

export class RateLimitError extends ApiError {
  constructor(message = '请求过于频繁，请稍后再试') {
    super(ERROR_CODES.RATE_LIMIT_EXCEEDED, message, 429);
  }
}

export class DatabaseError extends ApiError {
  constructor(message = '数据库操作失败') {
    super(ERROR_CODES.DATABASE_ERROR, message, 500);
  }
}

export class FileError extends ApiError {
  constructor(code, message) {
    super(code, message, 400);
  }
}

export class OCRError extends ApiError {
  constructor(message = 'OCR识别失败') {
    super(ERROR_CODES.OCR_FAILED, message, 500);
  }
}

export class FaceCompareError extends ApiError {
  constructor(message = '人脸比对失败') {
    super(ERROR_CODES.FACE_COMPARE_FAILED, message, 500);
  }
}

