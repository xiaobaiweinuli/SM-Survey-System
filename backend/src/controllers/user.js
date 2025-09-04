/**
 * 用户控制器
 * 处理用户相关的API请求
 */

import { DatabaseService } from '../services/database.js';
import { FileStorageService } from '../services/fileStorage.js';
import { NotificationService } from '../services/notification.js';
import { OCRService } from '../services/ocr.js';
import { FaceCompareService } from '../services/faceCompare.js';
import { successResponse, errorResponse } from '../utils/response.js';
import { ValidationError, NotFoundError } from '../utils/errors.js';
import { generateJWT } from '../utils/jwt.js';

export class UserController {
  constructor(env) {
    this.env = env;
    this.db = new DatabaseService(env.DB);
    this.fileStorage = new FileStorageService(env.BUCKET);
    this.notification = new NotificationService(env);
    this.ocr = new OCRService(env);
    this.faceCompare = new FaceCompareService(env);
  }

  // 用户注册
  async register(request) {
    try {
      const formData = await request.formData();
      
      const name = formData.get('name');
      const idCardNumber = formData.get('idCardNumber');
      const age = parseInt(formData.get('age'));
      const phone = formData.get('phone');
      const address = formData.get('address');
      const city = formData.get('city');
      const idCardPhoto = formData.get('idCardPhoto');
      const facePhoto = formData.get('facePhoto');

      // 验证必需字段
      if (!name || !idCardNumber || !age || !idCardPhoto || !facePhoto) {
        return errorResponse('缺少必要信息', 400);
      }

      // 检查用户是否已存在
      const existingUser = await this.db.getUserByIdCard(idCardNumber);
      if (existingUser) {
        return errorResponse('该身份证号已注册', 400);
      }

      // 上传身份证照片
      const idCardUpload = await this.fileStorage.uploadFile(
        idCardPhoto, 
        `id_cards/${Date.now()}_${idCardPhoto.name}`
      );
      if (!idCardUpload.success) {
        return errorResponse('身份证照片上传失败', 500);
      }

      // 上传人脸照片
      const faceUpload = await this.fileStorage.uploadFile(
        facePhoto, 
        `faces/${Date.now()}_${facePhoto.name}`
      );
      if (!faceUpload.success) {
        return errorResponse('人脸照片上传失败', 500);
      }

      // OCR识别身份证
      let ocrResult = null;
      try {
        ocrResult = await this.ocr.recognizeIdCard(idCardUpload.url);
      } catch (error) {
        console.warn('OCR识别失败，使用用户输入信息:', error);
      }

      // 人脸比对
      let faceCompareResult = null;
      try {
        faceCompareResult = await this.faceCompare.compareWithIdCard(
          faceUpload.url, 
          idCardUpload.url
        );
      } catch (error) {
        console.warn('人脸比对失败:', error);
      }

      // 创建用户
      const userData = {
        name,
        id_card_number: idCardNumber,
        age,
        id_card_photo_url: idCardUpload.url,
        face_photo_url: faceUpload.url,
        phone,
        address,
        city
      };

      const user = await this.db.createUser(userData);

      // 记录文件上传
      await this.db.createFileUpload({
        user_id: user.id,
        original_name: idCardPhoto.name,
        file_name: idCardUpload.fileName,
        file_path: idCardUpload.url,
        file_size: idCardPhoto.size,
        mime_type: idCardPhoto.type,
        upload_type: 'id_card',
        related_id: user.id
      });

      await this.db.createFileUpload({
        user_id: user.id,
        original_name: facePhoto.name,
        file_name: faceUpload.fileName,
        file_path: faceUpload.url,
        file_size: facePhoto.size,
        mime_type: facePhoto.type,
        upload_type: 'face',
        related_id: user.id
      });

      // 生成JWT令牌
      const token = await generateJWT({ 
        userId: user.id, 
        userType: 'user' 
      }, this.env.JWT_SECRET);

      // 发送注册通知
      try {
        await this.notification.sendUserRegisterNotification(user);
      } catch (error) {
        console.error('发送注册通知失败:', error);
      }

      return successResponse({
        user: {
          id: user.id,
          name: user.name,
          age: user.age,
          is_verified: user.is_verified,
          created_at: user.created_at
        },
        token,
        ocr_result: ocrResult,
        face_compare_result: faceCompareResult
      });

    } catch (error) {
      console.error('用户注册错误:', error);
      return errorResponse('注册失败', 500);
    }
  }

  // 用户登录
  async login(request) {
    try {
      const body = await request.json();
      const { name, idCardNumber } = body;

      if (!name || !idCardNumber) {
        return errorResponse('请提供姓名和身份证号', 400);
      }

      // 查找用户
      const user = await this.db.getUserByNameAndIdCard(name, idCardNumber);
      if (!user) {
        return errorResponse('用户不存在或信息不匹配', 401);
      }

      if (!user.is_active) {
        return errorResponse('账号已被禁用', 403);
      }

      // 生成JWT令牌
      const token = await generateJWT({ 
        userId: user.id, 
        userType: 'user' 
      }, this.env.JWT_SECRET);

      // 创建会话记录
      await this.db.createUserSession({
        user_id: user.id,
        user_type: 'user',
        session_token: token,
        ip_address: request.headers.get('CF-Connecting-IP'),
        user_agent: request.headers.get('User-Agent')
      });

      return successResponse({
        user: {
          id: user.id,
          name: user.name,
          age: user.age,
          is_verified: user.is_verified,
          created_at: user.created_at
        },
        token
      });

    } catch (error) {
      console.error('用户登录错误:', error);
      return errorResponse('登录失败', 500);
    }
  }

  // 获取用户信息
  async getProfile(request, userId) {
    try {
      const user = await this.db.getUserById(userId);
      if (!user) {
        return errorResponse('用户不存在', 404);
      }

      return successResponse({
        user: {
          id: user.id,
          name: user.name,
          age: user.age,
          phone: user.phone,
          address: user.address,
          city: user.city,
          is_verified: user.is_verified,
          created_at: user.created_at
        }
      });

    } catch (error) {
      console.error('获取用户信息错误:', error);
      return errorResponse('获取用户信息失败', 500);
    }
  }

  // 更新用户信息
  async updateProfile(request, userId) {
    try {
      const body = await request.json();
      const { phone, address, city } = body;

      const updateData = {};
      if (phone !== undefined) updateData.phone = phone;
      if (address !== undefined) updateData.address = address;
      if (city !== undefined) updateData.city = city;

      if (Object.keys(updateData).length === 0) {
        return errorResponse('没有提供要更新的信息', 400);
      }

      await this.db.updateUser(userId, updateData);

      const updatedUser = await this.db.getUserById(userId);

      return successResponse({
        user: {
          id: updatedUser.id,
          name: updatedUser.name,
          age: updatedUser.age,
          phone: updatedUser.phone,
          address: updatedUser.address,
          city: updatedUser.city,
          is_verified: updatedUser.is_verified,
          created_at: updatedUser.created_at
        }
      });

    } catch (error) {
      console.error('更新用户信息错误:', error);
      return errorResponse('更新用户信息失败', 500);
    }
  }

  // 获取用户统计信息
  async getStats(request, userId) {
    try {
      const stats = await this.db.getUserStats(userId);

      return successResponse({ stats });

    } catch (error) {
      console.error('获取用户统计错误:', error);
      return errorResponse('获取统计信息失败', 500);
    }
  }

  // 用户注销
  async logout(request, userId) {
    try {
      const authHeader = request.headers.get('Authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        
        // 将令牌加入黑名单（使用KV存储）
        await this.env.CACHE.put(`blacklist:${token}`, 'true', {
          expirationTtl: 24 * 60 * 60 // 24小时过期
        });

        // 更新会话状态
        await this.db.deactivateUserSession(token);
      }

      return successResponse({ message: '注销成功' });

    } catch (error) {
      console.error('用户注销错误:', error);
      return errorResponse('注销失败', 500);
    }
  }
}

