/**
 * JWT工具函数
 */

import { AuthError, ERROR_CODES } from './errors.js';

// Base64 URL编码
function base64UrlEncode(str) {
  return btoa(str)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

// Base64 URL解码
function base64UrlDecode(str) {
  str += '='.repeat((4 - str.length % 4) % 4);
  return atob(str.replace(/-/g, '+').replace(/_/g, '/'));
}

// HMAC SHA256签名
async function hmacSha256(key, data) {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(key);
  const messageData = encoder.encode(data);
  
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
  return new Uint8Array(signature);
}

// 生成JWT Token
export async function generateToken(payload, secret, expiresIn = 7 * 24 * 60 * 60) {
  const header = {
    alg: 'HS256',
    typ: 'JWT'
  };
  
  const now = Math.floor(Date.now() / 1000);
  const tokenPayload = {
    ...payload,
    iat: now,
    exp: now + expiresIn
  };
  
  const headerEncoded = base64UrlEncode(JSON.stringify(header));
  const payloadEncoded = base64UrlEncode(JSON.stringify(tokenPayload));
  
  const data = `${headerEncoded}.${payloadEncoded}`;
  const signature = await hmacSha256(secret, data);
  const signatureEncoded = base64UrlEncode(String.fromCharCode(...signature));
  
  return `${data}.${signatureEncoded}`;
}

// 验证JWT Token
export async function verifyToken(token, secret) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new AuthError(ERROR_CODES.AUTH_INVALID, 'Token格式无效');
    }
    
    const [headerEncoded, payloadEncoded, signatureEncoded] = parts;
    
    // 验证签名
    const data = `${headerEncoded}.${payloadEncoded}`;
    const expectedSignature = await hmacSha256(secret, data);
    const expectedSignatureEncoded = base64UrlEncode(String.fromCharCode(...expectedSignature));
    
    if (signatureEncoded !== expectedSignatureEncoded) {
      throw new AuthError(ERROR_CODES.AUTH_INVALID, 'Token签名无效');
    }
    
    // 解析payload
    const payload = JSON.parse(base64UrlDecode(payloadEncoded));
    
    // 检查过期时间
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      throw new AuthError(ERROR_CODES.AUTH_EXPIRED, 'Token已过期');
    }
    
    return payload;
    
  } catch (error) {
    if (error instanceof AuthError) {
      throw error;
    }
    throw new AuthError(ERROR_CODES.AUTH_INVALID, 'Token解析失败');
  }
}

// 从请求头获取Token
export function extractTokenFromHeader(request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7);
}

// 生成用户Token
export async function generateUserToken(user, secret) {
  const payload = {
    user_id: user.id,
    user_type: 'user',
    role: user.role,
    name: user.name
  };
  
  return await generateToken(payload, secret);
}

// 生成管理员Token
export async function generateAdminToken(admin, secret) {
  const payload = {
    user_id: admin.id,
    user_type: 'admin',
    role: 'admin',
    username: admin.username
  };
  
  return await generateToken(payload, secret);
}

// 别名导出，用于兼容
export const generateJWT = generateToken;

