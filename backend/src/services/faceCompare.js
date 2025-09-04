/**
 * 人脸比对服务
 * 集成腾讯云人脸比对API
 */

import { FaceCompareError } from '../utils/errors.js';

export class FaceCompareService {
  constructor(env) {
    this.secretId = env.TENCENT_SECRET_ID;
    this.secretKey = env.TENCENT_SECRET_KEY;
    this.region = 'ap-beijing';
    this.service = 'iai';
    this.version = '2020-03-03';
    this.action = 'CompareFace';
  }

  // 人脸比对
  async compare(imageA, imageB, threshold = 70) {
    try {
      // 移除base64前缀
      const imageAData = imageA.replace(/^data:image\/[a-z]+;base64,/, '');
      const imageBData = imageB.replace(/^data:image\/[a-z]+;base64,/, '');
      
      const requestBody = {
        ImageA: imageAData,
        ImageB: imageBData,
        FaceModelVersion: '3.0'
      };

      const response = await this.makeRequest(requestBody);
      
      if (response.Error) {
        throw new FaceCompareError(`人脸比对失败: ${response.Error.Message}`);
      }

      const result = response.Response;
      
      // 检查是否检测到人脸
      if (!result.FaceModelVersion) {
        throw new FaceCompareError('未检测到有效人脸，请确保照片清晰');
      }

      const similarity = result.Score || 0;
      const isMatch = similarity >= threshold;

      return {
        similarity,
        is_match: isMatch,
        confidence: this.calculateConfidence(similarity),
        threshold
      };

    } catch (error) {
      console.error('Face compare error:', error);
      
      if (error instanceof FaceCompareError) {
        throw error;
      }
      
      throw new FaceCompareError('人脸比对服务异常，请稍后重试');
    }
  }

  // 发送请求到腾讯云API
  async makeRequest(requestBody) {
    const timestamp = Math.floor(Date.now() / 1000);
    const date = new Date(timestamp * 1000).toISOString().substr(0, 10);
    
    // 构建请求头
    const headers = {
      'Authorization': await this.getAuthorizationHeader(requestBody, timestamp, date),
      'Content-Type': 'application/json; charset=utf-8',
      'Host': `${this.service}.tencentcloudapi.com`,
      'X-TC-Action': this.action,
      'X-TC-Timestamp': timestamp.toString(),
      'X-TC-Version': this.version,
      'X-TC-Region': this.region
    };

    const response = await fetch(`https://${this.service}.tencentcloudapi.com/`, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  }

  // 生成腾讯云API签名
  async getAuthorizationHeader(requestBody, timestamp, date) {
    const algorithm = 'TC3-HMAC-SHA256';
    const credentialScope = `${date}/${this.service}/tc3_request`;
    
    // 构建规范请求
    const canonicalRequest = await this.buildCanonicalRequest(requestBody);
    
    // 构建待签名字符串
    const stringToSign = [
      algorithm,
      timestamp,
      credentialScope,
      await this.sha256Hex(canonicalRequest)
    ].join('\n');

    // 计算签名
    const signature = await this.calculateSignature(stringToSign, date);

    return `${algorithm} Credential=${this.secretId}/${credentialScope}, SignedHeaders=content-type;host, Signature=${signature}`;
  }

  // 构建规范请求
  async buildCanonicalRequest(requestBody) {
    const method = 'POST';
    const uri = '/';
    const queryString = '';
    const headers = [
      'content-type:application/json; charset=utf-8',
      `host:${this.service}.tencentcloudapi.com`
    ].join('\n');
    const signedHeaders = 'content-type;host';
    const payload = JSON.stringify(requestBody);
    const hashedPayload = await this.sha256Hex(payload);

    return [
      method,
      uri,
      queryString,
      headers,
      '',
      signedHeaders,
      hashedPayload
    ].join('\n');
  }

  // 计算签名
  async calculateSignature(stringToSign, date) {
    const kDate = await this.hmacSha256(`TC3${this.secretKey}`, date);
    const kService = await this.hmacSha256(kDate, this.service);
    const kSigning = await this.hmacSha256(kService, 'tc3_request');
    const signature = await this.hmacSha256(kSigning, stringToSign);
    
    return this.arrayBufferToHex(signature);
  }

  // HMAC-SHA256
  async hmacSha256(key, data) {
    const encoder = new TextEncoder();
    let keyData;
    
    if (typeof key === 'string') {
      keyData = encoder.encode(key);
    } else {
      keyData = key;
    }
    
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    const signature = await crypto.subtle.sign(
      'HMAC',
      cryptoKey,
      encoder.encode(data)
    );
    
    return new Uint8Array(signature);
  }

  // SHA256哈希
  async sha256Hex(data) {
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(data));
    return this.arrayBufferToHex(hashBuffer);
  }

  // ArrayBuffer转十六进制字符串
  arrayBufferToHex(buffer) {
    return Array.from(new Uint8Array(buffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  // 计算置信度
  calculateConfidence(similarity) {
    if (similarity >= 90) return 'very_high';
    if (similarity >= 80) return 'high';
    if (similarity >= 70) return 'medium';
    if (similarity >= 60) return 'low';
    return 'very_low';
  }

  // 活体检测（扩展功能）
  async livenessDetection(image) {
    try {
      const imageData = image.replace(/^data:image\/[a-z]+;base64,/, '');
      
      const requestBody = {
        Image: imageData,
        FaceModelVersion: '3.0'
      };

      // 这里可以调用腾讯云的活体检测API
      // 目前返回模拟结果
      return {
        is_live: true,
        confidence: 0.95,
        message: '活体检测通过'
      };

    } catch (error) {
      console.error('Liveness detection error:', error);
      throw new FaceCompareError('活体检测失败');
    }
  }

  // 人脸质量检测
  async faceQualityCheck(image) {
    try {
      const imageData = image.replace(/^data:image\/[a-z]+;base64,/, '');
      
      // 这里可以调用腾讯云的人脸质量检测API
      // 目前返回模拟结果
      return {
        quality_score: 85,
        is_clear: true,
        is_frontal: true,
        has_mask: false,
        brightness: 'normal',
        message: '人脸质量良好'
      };

    } catch (error) {
      console.error('Face quality check error:', error);
      throw new FaceCompareError('人脸质量检测失败');
    }
  }

  // 批量人脸比对
  async batchCompare(baseImage, compareImages, threshold = 70) {
    try {
      const results = [];
      
      for (let i = 0; i < compareImages.length; i++) {
        const result = await this.compare(baseImage, compareImages[i], threshold);
        results.push({
          index: i,
          ...result
        });
      }
      
      return results;

    } catch (error) {
      console.error('Batch compare error:', error);
      throw new FaceCompareError('批量人脸比对失败');
    }
  }
}

