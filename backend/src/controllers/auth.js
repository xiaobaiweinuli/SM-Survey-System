/**
 * 认证控制器
 * 处理用户注册、登录、登出等认证相关操作
 */

import { DatabaseService } from '../services/database.js';
import { OCRService } from '../services/ocr.js';
import { FaceCompareService } from '../services/faceCompare.js';
import { FileStorageService } from '../services/fileStorage.js';
import { NotificationService } from '../services/notification.js';

import { generateUserToken, generateAdminToken } from '../utils/jwt.js';
import { hashPassword, verifyPassword, generateRandomString } from '../utils/crypto.js';
import { createResponse, createErrorResponse } from '../utils/response.js';
import { 
  AuthError, 
  ValidationError, 
  OCRError, 
  FaceCompareError,
  ERROR_CODES 
} from '../utils/errors.js';

export class AuthController {
  // 用户注册
  static async register(context) {
    const { env, validatedData, request } = context;
    const { name, id_card_number, id_card_photo, face_photo } = validatedData;

    const db = new DatabaseService(env.DB);
    const ocrService = new OCRService(env);
    const faceCompareService = new FaceCompareService(env);
    const fileStorage = new FileStorageService(env.BUCKET);
    const notificationService = new NotificationService(env);

    try {
      // 检查用户是否已存在
      const existingUser = await db.getUserByIdCard(name, id_card_number);
      if (existingUser) {
        throw new ValidationError('用户已存在，请直接登录');
      }

      // OCR识别身份证
      console.log('开始OCR识别身份证...');
      const ocrResult = await ocrService.recognizeIdCard(id_card_photo);
      
      // 验证OCR结果与用户输入是否一致
      if (ocrResult.name !== name || ocrResult.id_card_number !== id_card_number) {
        throw new ValidationError('身份证信息与输入不符，请检查');
      }

      // 人脸比对
      console.log('开始人脸比对...');
      const faceCompareResult = await faceCompareService.compare(
        ocrResult.photo_base64,
        face_photo
      );

      if (!faceCompareResult.is_match) {
        throw new ValidationError('人脸比对失败，请确保照片清晰且为本人');
      }

      // 计算年龄
      const birthDate = new Date(ocrResult.birth_date);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }

      // 上传文件到R2
      console.log('上传文件到R2...');
      const idCardFileName = `id_cards/${generateRandomString()}.jpg`;
      const faceFileName = `faces/${generateRandomString()}.jpg`;

      const idCardBuffer = Buffer.from(id_card_photo.split(',')[1], 'base64');
      const faceBuffer = Buffer.from(face_photo.split(',')[1], 'base64');

      const [idCardUrl, faceUrl] = await Promise.all([
        fileStorage.uploadFile(idCardFileName, idCardBuffer, 'image/jpeg'),
        fileStorage.uploadFile(faceFileName, faceBuffer, 'image/jpeg')
      ]);

      // 创建用户
      console.log('创建用户记录...');
      const userData = {
        name,
        id_card_number,
        age,
        id_card_photo_url: idCardUrl,
        face_photo_url: faceUrl,
        address: ocrResult.address
      };

      const user = await db.createUser(userData);

      // 记录文件上传
      await Promise.all([
        db.createFileUpload({
          user_id: user.id,
          original_name: 'id_card.jpg',
          file_name: idCardFileName,
          file_path: idCardUrl,
          file_size: idCardBuffer.length,
          mime_type: 'image/jpeg',
          upload_type: 'id_card',
          related_id: user.id
        }),
        db.createFileUpload({
          user_id: user.id,
          original_name: 'face.jpg',
          file_name: faceFileName,
          file_path: faceUrl,
          file_size: faceBuffer.length,
          mime_type: 'image/jpeg',
          upload_type: 'face',
          related_id: user.id
        })
      ]);

      // 生成JWT Token
      const token = await generateUserToken(user, env.JWT_SECRET);
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7天

      // 创建用户会话
      const clientIP = request.headers.get('CF-Connecting-IP') || 'unknown';
      const userAgent = request.headers.get('User-Agent') || 'unknown';

      await db.createUserSession({
        user_id: user.id,
        user_type: 'user',
        session_token: token,
        expires_at: expiresAt.toISOString(),
        ip_address: clientIP,
        user_agent: userAgent
      });

      // 发送注册通知
      await notificationService.sendUserRegisterNotification(user);

      // 返回响应（不包含敏感信息）
      const responseUser = {
        id: user.id,
        name: user.name,
        age: user.age,
        is_verified: user.is_verified,
        created_at: user.created_at
      };

      return createResponse({
        user: responseUser,
        token,
        expires_at: expiresAt.toISOString()
      }, '注册成功');

    } catch (error) {
      console.error('Register error:', error);
      
      if (error instanceof ValidationError || 
          error instanceof OCRError || 
          error instanceof FaceCompareError) {
        throw error;
      }
      
      throw new AuthError(ERROR_CODES.INTERNAL_ERROR, '注册失败，请稍后重试');
    }
  }

  // 用户登录
  static async login(context) {
    const { env, validatedData, request } = context;
    const { name, id_card_number } = validatedData;

    const db = new DatabaseService(env.DB);

    try {
      // 查找用户
      const user = await db.getUserByIdCard(name, id_card_number);
      if (!user) {
        throw new AuthError(ERROR_CODES.AUTH_INVALID, '用户名或身份证号错误');
      }

      if (!user.is_active) {
        throw new AuthError(ERROR_CODES.AUTH_INVALID, '账号已被禁用，请联系管理员');
      }

      if (!user.is_verified) {
        throw new AuthError(ERROR_CODES.AUTH_INVALID, '账号未完成实名认证');
      }

      // 生成JWT Token
      const token = await generateUserToken(user, env.JWT_SECRET);
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7天

      // 创建用户会话
      const clientIP = request.headers.get('CF-Connecting-IP') || 'unknown';
      const userAgent = request.headers.get('User-Agent') || 'unknown';

      await db.createUserSession({
        user_id: user.id,
        user_type: 'user',
        session_token: token,
        expires_at: expiresAt.toISOString(),
        ip_address: clientIP,
        user_agent: userAgent
      });

      // 返回响应（不包含敏感信息）
      const responseUser = {
        id: user.id,
        name: user.name,
        age: user.age,
        role: user.role,
        is_verified: user.is_verified,
        created_at: user.created_at
      };

      return createResponse({
        user: responseUser,
        token,
        expires_at: expiresAt.toISOString()
      }, '登录成功');

    } catch (error) {
      console.error('Login error:', error);
      
      if (error instanceof AuthError) {
        throw error;
      }
      
      throw new AuthError(ERROR_CODES.INTERNAL_ERROR, '登录失败，请稍后重试');
    }
  }

  // 管理员登录
  static async adminLogin(context) {
    const { env, validatedData, request } = context;
    const { username, password } = validatedData;

    const db = new DatabaseService(env.DB);

    try {
      // 查找管理员
      const admin = await db.getAdminByUsername(username);
      if (!admin) {
        throw new AuthError(ERROR_CODES.AUTH_INVALID, '用户名或密码错误');
      }

      if (!admin.is_active) {
        throw new AuthError(ERROR_CODES.AUTH_INVALID, '管理员账号已被禁用');
      }

      // 验证密码
      const isPasswordValid = await verifyPassword(password, admin.password_hash);
      if (!isPasswordValid) {
        throw new AuthError(ERROR_CODES.AUTH_INVALID, '用户名或密码错误');
      }

      // 更新最后登录时间
      await db.updateAdminLastLogin(admin.id);

      // 生成JWT Token
      const token = await generateAdminToken(admin, env.JWT_SECRET);
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24小时

      // 创建管理员会话
      const clientIP = request.headers.get('CF-Connecting-IP') || 'unknown';
      const userAgent = request.headers.get('User-Agent') || 'unknown';

      await db.createUserSession({
        user_id: admin.id,
        user_type: 'admin',
        session_token: token,
        expires_at: expiresAt.toISOString(),
        ip_address: clientIP,
        user_agent: userAgent
      });

      // 返回响应（不包含敏感信息）
      const responseAdmin = {
        id: admin.id,
        username: admin.username,
        email: admin.email,
        role: 'admin',
        last_login_at: admin.last_login_at
      };

      return createResponse({
        user: responseAdmin,
        token,
        expires_at: expiresAt.toISOString()
      }, '管理员登录成功');

    } catch (error) {
      console.error('Admin login error:', error);
      
      if (error instanceof AuthError) {
        throw error;
      }
      
      throw new AuthError(ERROR_CODES.INTERNAL_ERROR, '登录失败，请稍后重试');
    }
  }

  // 刷新Token
  static async refresh(context) {
    const { env, user, admin, token_payload } = context;

    try {
      let newToken;
      let expiresAt;

      if (user) {
        newToken = await generateUserToken(user, env.JWT_SECRET);
        expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7天
      } else if (admin) {
        newToken = await generateAdminToken(admin, env.JWT_SECRET);
        expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24小时
      } else {
        throw new AuthError(ERROR_CODES.AUTH_INVALID, '无效的用户信息');
      }

      return createResponse({
        token: newToken,
        expires_at: expiresAt.toISOString()
      }, 'Token刷新成功');

    } catch (error) {
      console.error('Refresh token error:', error);
      throw new AuthError(ERROR_CODES.INTERNAL_ERROR, 'Token刷新失败');
    }
  }

  // 登出
  static async logout(context) {
    const { env, request } = context;

    try {
      const authHeader = request.headers.get('Authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        
        const db = new DatabaseService(env.DB);
        await db.deactivateUserSession(token);
      }

      return createResponse(null, '登出成功');

    } catch (error) {
      console.error('Logout error:', error);
      // 登出失败不应该阻止用户，返回成功
      return createResponse(null, '登出成功');
    }
  }
}

