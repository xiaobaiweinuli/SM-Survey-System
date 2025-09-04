/**
 * 文件存储服务
 * 封装Cloudflare R2存储操作
 */

import { FileError, ERROR_CODES } from '../utils/errors.js';
import { generateFileHash, generateRandomString } from '../utils/crypto.js';

export class FileStorageService {
  constructor(bucket) {
    this.bucket = bucket;
  }

  // 上传文件
  async uploadFile(fileName, fileData, mimeType, options = {}) {
    try {
      const {
        metadata = {},
        cacheControl = 'public, max-age=31536000', // 1年缓存
        contentDisposition = null
      } = options;

      // 生成文件哈希
      const fileHash = await generateFileHash(fileData);
      
      // 构建完整的文件路径
      const fullPath = this.buildFilePath(fileName);
      
      // 设置上传选项
      const uploadOptions = {
        httpMetadata: {
          contentType: mimeType,
          cacheControl,
          contentDisposition
        },
        customMetadata: {
          ...metadata,
          fileHash,
          uploadTime: new Date().toISOString()
        }
      };

      // 上传到R2
      await this.bucket.put(fullPath, fileData, uploadOptions);
      
      // 返回文件URL
      return this.getFileUrl(fullPath);

    } catch (error) {
      console.error('Upload file error:', error);
      throw new FileError(ERROR_CODES.INTERNAL_ERROR, '文件上传失败');
    }
  }

  // 获取文件
  async getFile(fileName) {
    try {
      const fullPath = this.buildFilePath(fileName);
      const object = await this.bucket.get(fullPath);
      
      if (!object) {
        throw new FileError(ERROR_CODES.NOT_FOUND, '文件不存在');
      }

      return {
        data: await object.arrayBuffer(),
        metadata: object.customMetadata,
        httpMetadata: object.httpMetadata,
        size: object.size,
        etag: object.etag,
        uploaded: object.uploaded
      };

    } catch (error) {
      console.error('Get file error:', error);
      
      if (error instanceof FileError) {
        throw error;
      }
      
      throw new FileError(ERROR_CODES.INTERNAL_ERROR, '文件获取失败');
    }
  }

  // 删除文件
  async deleteFile(fileName) {
    try {
      const fullPath = this.buildFilePath(fileName);
      await this.bucket.delete(fullPath);
      return true;

    } catch (error) {
      console.error('Delete file error:', error);
      throw new FileError(ERROR_CODES.INTERNAL_ERROR, '文件删除失败');
    }
  }

  // 检查文件是否存在
  async fileExists(fileName) {
    try {
      const fullPath = this.buildFilePath(fileName);
      const object = await this.bucket.head(fullPath);
      return object !== null;

    } catch (error) {
      return false;
    }
  }

  // 获取文件信息
  async getFileInfo(fileName) {
    try {
      const fullPath = this.buildFilePath(fileName);
      const object = await this.bucket.head(fullPath);
      
      if (!object) {
        throw new FileError(ERROR_CODES.NOT_FOUND, '文件不存在');
      }

      return {
        size: object.size,
        etag: object.etag,
        uploaded: object.uploaded,
        httpMetadata: object.httpMetadata,
        customMetadata: object.customMetadata
      };

    } catch (error) {
      console.error('Get file info error:', error);
      
      if (error instanceof FileError) {
        throw error;
      }
      
      throw new FileError(ERROR_CODES.INTERNAL_ERROR, '获取文件信息失败');
    }
  }

  // 列出文件
  async listFiles(prefix = '', limit = 1000) {
    try {
      const options = {
        prefix: this.buildFilePath(prefix),
        limit
      };

      const result = await this.bucket.list(options);
      
      return {
        objects: result.objects.map(obj => ({
          key: this.extractFileName(obj.key),
          size: obj.size,
          etag: obj.etag,
          uploaded: obj.uploaded
        })),
        truncated: result.truncated,
        cursor: result.cursor
      };

    } catch (error) {
      console.error('List files error:', error);
      throw new FileError(ERROR_CODES.INTERNAL_ERROR, '文件列表获取失败');
    }
  }

  // 复制文件
  async copyFile(sourceFileName, destFileName) {
    try {
      const sourceFile = await this.getFile(sourceFileName);
      await this.uploadFile(destFileName, sourceFile.data, sourceFile.httpMetadata.contentType);
      return true;

    } catch (error) {
      console.error('Copy file error:', error);
      throw new FileError(ERROR_CODES.INTERNAL_ERROR, '文件复制失败');
    }
  }

  // 移动文件
  async moveFile(sourceFileName, destFileName) {
    try {
      await this.copyFile(sourceFileName, destFileName);
      await this.deleteFile(sourceFileName);
      return true;

    } catch (error) {
      console.error('Move file error:', error);
      throw new FileError(ERROR_CODES.INTERNAL_ERROR, '文件移动失败');
    }
  }

  // 生成预签名URL（用于直接上传）
  async generatePresignedUrl(fileName, expiresIn = 3600) {
    try {
      // Cloudflare R2目前不支持预签名URL
      // 这里返回一个模拟的URL，实际使用时需要通过API上传
      return `https://upload.example.com/presigned/${fileName}?expires=${Date.now() + expiresIn * 1000}`;

    } catch (error) {
      console.error('Generate presigned URL error:', error);
      throw new FileError(ERROR_CODES.INTERNAL_ERROR, '生成预签名URL失败');
    }
  }

  // 批量上传文件
  async uploadFiles(files) {
    try {
      const results = [];
      
      for (const file of files) {
        const result = await this.uploadFile(
          file.fileName,
          file.fileData,
          file.mimeType,
          file.options
        );
        
        results.push({
          fileName: file.fileName,
          url: result,
          success: true
        });
      }
      
      return results;

    } catch (error) {
      console.error('Batch upload error:', error);
      throw new FileError(ERROR_CODES.INTERNAL_ERROR, '批量上传失败');
    }
  }

  // 批量删除文件
  async deleteFiles(fileNames) {
    try {
      const results = [];
      
      for (const fileName of fileNames) {
        try {
          await this.deleteFile(fileName);
          results.push({
            fileName,
            success: true
          });
        } catch (error) {
          results.push({
            fileName,
            success: false,
            error: error.message
          });
        }
      }
      
      return results;

    } catch (error) {
      console.error('Batch delete error:', error);
      throw new FileError(ERROR_CODES.INTERNAL_ERROR, '批量删除失败');
    }
  }

  // 构建文件路径
  buildFilePath(fileName) {
    // 移除开头的斜杠
    return fileName.replace(/^\/+/, '');
  }

  // 从完整路径提取文件名
  extractFileName(fullPath) {
    return fullPath;
  }

  // 获取文件URL
  getFileUrl(fileName) {
    // 这里需要根据实际的R2配置返回正确的URL
    // 假设已经配置了自定义域名
    return `https://files.example.com/${fileName}`;
  }

  // 验证文件类型
  validateFileType(mimeType, allowedTypes) {
    if (!allowedTypes || allowedTypes.length === 0) {
      return true;
    }
    
    return allowedTypes.includes(mimeType);
  }

  // 验证文件大小
  validateFileSize(fileSize, maxSize) {
    return fileSize <= maxSize;
  }

  // 生成唯一文件名
  generateUniqueFileName(originalName, prefix = '') {
    const timestamp = Date.now();
    const random = generateRandomString(8);
    const extension = this.getFileExtension(originalName);
    
    return `${prefix}${timestamp}_${random}${extension}`;
  }

  // 获取文件扩展名
  getFileExtension(fileName) {
    const lastDotIndex = fileName.lastIndexOf('.');
    return lastDotIndex !== -1 ? fileName.substring(lastDotIndex) : '';
  }

  // 获取MIME类型
  getMimeType(fileName) {
    const extension = this.getFileExtension(fileName).toLowerCase();
    
    const mimeTypes = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.mp4': 'video/mp4',
      '.mov': 'video/quicktime',
      '.avi': 'video/x-msvideo',
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.txt': 'text/plain',
      '.json': 'application/json',
      '.csv': 'text/csv'
    };
    
    return mimeTypes[extension] || 'application/octet-stream';
  }

  // 压缩图片（简单实现）
  async compressImage(imageData, quality = 0.8) {
    try {
      // 这里可以集成图片压缩库
      // 目前返回原始数据
      return imageData;

    } catch (error) {
      console.error('Compress image error:', error);
      throw new FileError(ERROR_CODES.INTERNAL_ERROR, '图片压缩失败');
    }
  }

  // 生成缩略图
  async generateThumbnail(imageData, width = 200, height = 200) {
    try {
      // 这里可以集成图片处理库
      // 目前返回原始数据
      return imageData;

    } catch (error) {
      console.error('Generate thumbnail error:', error);
      throw new FileError(ERROR_CODES.INTERNAL_ERROR, '缩略图生成失败');
    }
  }
}

