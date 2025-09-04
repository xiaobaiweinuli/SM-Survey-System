/**
 * 文件控制器
 * 处理文件上传、下载和管理相关的API请求
 */

import { DatabaseService } from '../services/database.js';
import { FileStorageService } from '../services/fileStorage.js';
import { successResponse, errorResponse } from '../utils/response.js';
import { ValidationError, NotFoundError } from '../utils/errors.js';

export class FileController {
  constructor(env) {
    this.env = env;
    this.db = new DatabaseService(env.DB);
    this.fileStorage = new FileStorageService(env.BUCKET);
  }

  // 上传文件
  async uploadFile(request, userId) {
    try {
      const formData = await request.formData();
      const file = formData.get('file');
      const uploadType = formData.get('uploadType') || 'general';
      const relatedId = formData.get('relatedId');

      if (!file || !(file instanceof File)) {
        return errorResponse('请选择要上传的文件', 400);
      }

      // 验证文件类型和大小
      const allowedTypes = [
        'image/jpeg', 'image/png', 'image/gif', 'image/webp',
        'application/pdf', 'text/plain', 'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ];

      if (!allowedTypes.includes(file.type)) {
        return errorResponse('不支持的文件类型', 400);
      }

      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        return errorResponse('文件大小不能超过10MB', 400);
      }

      // 生成文件路径
      const timestamp = Date.now();
      const fileName = `${uploadType}/${userId}/${timestamp}_${file.name}`;

      // 上传文件到R2
      const uploadResult = await this.fileStorage.uploadFile(file, fileName);
      if (!uploadResult.success) {
        return errorResponse('文件上传失败', 500);
      }

      // 记录文件信息到数据库
      const fileRecord = await this.db.createFileUpload({
        user_id: userId,
        original_name: file.name,
        file_name: uploadResult.fileName,
        file_path: uploadResult.url,
        file_size: file.size,
        mime_type: file.type,
        upload_type: uploadType,
        related_id: relatedId ? parseInt(relatedId) : null
      });

      return successResponse({
        file: {
          id: fileRecord.id,
          original_name: fileRecord.original_name,
          file_name: fileRecord.file_name,
          file_path: fileRecord.file_path,
          file_size: fileRecord.file_size,
          mime_type: fileRecord.mime_type,
          upload_type: fileRecord.upload_type,
          created_at: fileRecord.created_at
        },
        url: uploadResult.url
      });

    } catch (error) {
      console.error('文件上传错误:', error);
      return errorResponse('文件上传失败', 500);
    }
  }

  // 上传Base64文件
  async uploadBase64File(request, userId) {
    try {
      const body = await request.json();
      const { fileData, fileName, mimeType, uploadType = 'general', relatedId } = body;

      if (!fileData || !fileName || !mimeType) {
        return errorResponse('缺少必要的文件信息', 400);
      }

      // 验证Base64数据
      let base64Data;
      try {
        if (fileData.includes(',')) {
          base64Data = fileData.split(',')[1];
        } else {
          base64Data = fileData;
        }
        
        // 验证Base64格式
        atob(base64Data);
      } catch (error) {
        return errorResponse('无效的Base64数据', 400);
      }

      // 计算文件大小
      const fileSize = Math.ceil(base64Data.length * 0.75);
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (fileSize > maxSize) {
        return errorResponse('文件大小不能超过10MB', 400);
      }

      // 生成文件路径
      const timestamp = Date.now();
      const fileKey = `${uploadType}/${userId}/${timestamp}_${fileName}`;

      // 上传文件到R2
      const uploadResult = await this.fileStorage.uploadBase64File(
        base64Data, 
        fileKey, 
        mimeType
      );
      
      if (!uploadResult.success) {
        return errorResponse('文件上传失败', 500);
      }

      // 记录文件信息到数据库
      const fileRecord = await this.db.createFileUpload({
        user_id: userId,
        original_name: fileName,
        file_name: uploadResult.fileName,
        file_path: uploadResult.url,
        file_size: fileSize,
        mime_type: mimeType,
        upload_type: uploadType,
        related_id: relatedId ? parseInt(relatedId) : null
      });

      return successResponse({
        file: {
          id: fileRecord.id,
          original_name: fileRecord.original_name,
          file_name: fileRecord.file_name,
          file_path: fileRecord.file_path,
          file_size: fileRecord.file_size,
          mime_type: fileRecord.mime_type,
          upload_type: fileRecord.upload_type,
          created_at: fileRecord.created_at
        },
        url: uploadResult.url
      });

    } catch (error) {
      console.error('Base64文件上传错误:', error);
      return errorResponse('文件上传失败', 500);
    }
  }

  // 获取文件信息
  async getFile(request, userId, fileId) {
    try {
      const file = await this.db.getFileUpload(fileId);
      if (!file) {
        return errorResponse('文件不存在', 404);
      }

      // 检查文件访问权限
      if (file.user_id !== userId) {
        // 检查是否是管理员
        const authHeader = request.headers.get('Authorization');
        if (!authHeader) {
          return errorResponse('无权访问此文件', 403);
        }

        // 这里可以添加管理员权限检查逻辑
        // 暂时只允许文件所有者访问
        return errorResponse('无权访问此文件', 403);
      }

      return successResponse({
        file: {
          id: file.id,
          original_name: file.original_name,
          file_name: file.file_name,
          file_path: file.file_path,
          file_size: file.file_size,
          mime_type: file.mime_type,
          upload_type: file.upload_type,
          created_at: file.created_at
        }
      });

    } catch (error) {
      console.error('获取文件信息错误:', error);
      return errorResponse('获取文件信息失败', 500);
    }
  }

  // 获取用户的文件列表
  async getUserFiles(request, userId) {
    try {
      const url = new URL(request.url);
      const page = parseInt(url.searchParams.get('page')) || 1;
      const limit = parseInt(url.searchParams.get('limit')) || 20;
      const uploadType = url.searchParams.get('uploadType');

      const filters = { user_id: userId };
      if (uploadType) filters.upload_type = uploadType;

      const files = await this.db.getUserFiles(userId, filters, page, limit);
      const total = await this.db.getUserFilesCount(userId, filters);

      return successResponse({
        files: files.map(file => ({
          id: file.id,
          original_name: file.original_name,
          file_name: file.file_name,
          file_path: file.file_path,
          file_size: file.file_size,
          mime_type: file.mime_type,
          upload_type: file.upload_type,
          created_at: file.created_at
        })),
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      });

    } catch (error) {
      console.error('获取用户文件列表错误:', error);
      return errorResponse('获取文件列表失败', 500);
    }
  }

  // 删除文件
  async deleteFile(request, userId, fileId) {
    try {
      const file = await this.db.getFileUpload(fileId);
      if (!file) {
        return errorResponse('文件不存在', 404);
      }

      // 检查文件删除权限
      if (file.user_id !== userId) {
        return errorResponse('无权删除此文件', 403);
      }

      // 从R2存储删除文件
      try {
        await this.fileStorage.deleteFile(file.file_name);
      } catch (error) {
        console.warn('从存储删除文件失败:', error);
        // 继续执行数据库删除，避免数据不一致
      }

      // 从数据库删除文件记录
      await this.db.deleteFileUpload(fileId);

      return successResponse({
        message: '文件删除成功'
      });

    } catch (error) {
      console.error('删除文件错误:', error);
      return errorResponse('删除文件失败', 500);
    }
  }

  // 获取文件下载链接
  async getDownloadUrl(request, userId, fileId) {
    try {
      const file = await this.db.getFileUpload(fileId);
      if (!file) {
        return errorResponse('文件不存在', 404);
      }

      // 检查文件访问权限
      if (file.user_id !== userId) {
        return errorResponse('无权访问此文件', 403);
      }

      // 生成预签名下载URL（有效期1小时）
      const downloadUrl = await this.fileStorage.getSignedUrl(
        file.file_name, 
        'GET', 
        3600
      );

      return successResponse({
        download_url: downloadUrl,
        expires_in: 3600,
        file_name: file.original_name
      });

    } catch (error) {
      console.error('获取下载链接错误:', error);
      return errorResponse('获取下载链接失败', 500);
    }
  }

  // 批量删除文件
  async batchDeleteFiles(request, userId) {
    try {
      const body = await request.json();
      const { fileIds } = body;

      if (!Array.isArray(fileIds) || fileIds.length === 0) {
        return errorResponse('请提供要删除的文件ID列表', 400);
      }

      const results = [];
      
      for (const fileId of fileIds) {
        try {
          const file = await this.db.getFileUpload(fileId);
          if (!file) {
            results.push({ fileId, success: false, error: '文件不存在' });
            continue;
          }

          if (file.user_id !== userId) {
            results.push({ fileId, success: false, error: '无权删除此文件' });
            continue;
          }

          // 从R2存储删除文件
          try {
            await this.fileStorage.deleteFile(file.file_name);
          } catch (error) {
            console.warn(`从存储删除文件失败 ${fileId}:`, error);
          }

          // 从数据库删除文件记录
          await this.db.deleteFileUpload(fileId);
          results.push({ fileId, success: true });

        } catch (error) {
          console.error(`删除文件失败 ${fileId}:`, error);
          results.push({ fileId, success: false, error: '删除失败' });
        }
      }

      const successCount = results.filter(r => r.success).length;
      const failCount = results.filter(r => !r.success).length;

      return successResponse({
        message: `批量删除完成，成功：${successCount}，失败：${failCount}`,
        results,
        summary: {
          total: fileIds.length,
          success: successCount,
          failed: failCount
        }
      });

    } catch (error) {
      console.error('批量删除文件错误:', error);
      return errorResponse('批量删除文件失败', 500);
    }
  }
}

