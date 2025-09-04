/**
 * 响应格式化工具
 */

import { corsHeaders } from './cors.js';

export function createResponse(data, message = '操作成功', statusCode = 200) {
  const response = {
    success: true,
    data,
    message,
    timestamp: new Date().toISOString(),
  };

  return new Response(JSON.stringify(response), {
    status: statusCode,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders,
    },
  });
}

export function createErrorResponse(code, message, statusCode = 400, details = null) {
  const response = {
    success: false,
    error: {
      code,
      message,
      details,
    },
    timestamp: new Date().toISOString(),
  };

  return new Response(JSON.stringify(response), {
    status: statusCode,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders,
    },
  });
}

export function createPaginationResponse(items, pagination, message = '获取成功') {
  const response = {
    success: true,
    data: {
      items,
      pagination,
    },
    message,
    timestamp: new Date().toISOString(),
  };

  return new Response(JSON.stringify(response), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders,
    },
  });
}

export function createFileResponse(fileData, fileName, mimeType) {
  return new Response(fileData, {
    status: 200,
    headers: {
      'Content-Type': mimeType,
      'Content-Disposition': `attachment; filename="${fileName}"`,
      ...corsHeaders,
    },
  });
}

// 简化的响应函数，用于控制器
export function successResponse(data, message = '操作成功', statusCode = 200) {
  return createResponse(data, message, statusCode);
}

export function errorResponse(message, statusCode = 400, code = 'ERROR', details = null) {
  return createErrorResponse(code, message, statusCode, details);
}

