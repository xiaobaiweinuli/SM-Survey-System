/**
 * OCR服务
 * 集成腾讯云OCR API进行身份证识别
 */

import { OCRError } from '../utils/errors.js';

export class OCRService {
  constructor(env) {
    this.secretId = env.TENCENT_SECRET_ID;
    this.secretKey = env.TENCENT_SECRET_KEY;
    this.region = 'ap-beijing';
    this.service = 'ocr';
    this.version = '2018-11-19';
    this.action = 'IDCardOCR';
  }

  // 身份证OCR识别
  async recognizeIdCard(base64Image) {
    try {
      // 移除base64前缀
      const imageData = base64Image.replace(/^data:image\/[a-z]+;base64,/, '');
      
      const requestBody = {
        ImageBase64: imageData,
        CardSide: 'FRONT', // 正面
        Config: {
          CropIdCard: true,
          CropPortrait: true
        }
      };

      const response = await this.makeRequest(requestBody);
      
      if (response.Error) {
        throw new OCRError(`OCR识别失败: ${response.Error.Message}`);
      }

      const result = response.Response;
      
      // 验证必要字段
      if (!result.Name || !result.IdNum || !result.Birth || !result.Address) {
        throw new OCRError('身份证信息不完整，请确保照片清晰');
      }

      return {
        name: result.Name,
        id_card_number: result.IdNum,
        birth_date: this.formatBirthDate(result.Birth),
        address: result.Address,
        photo_base64: result.Portrait || null
      };

    } catch (error) {
      console.error('OCR recognition error:', error);
      
      if (error instanceof OCRError) {
        throw error;
      }
      
      throw new OCRError('身份证识别失败，请检查照片质量');
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

  // 格式化出生日期
  formatBirthDate(birthStr) {
    // 腾讯云返回格式：1990/01/01
    // 转换为标准格式：1990-01-01
    return birthStr.replace(/\//g, '-');
  }

  // 验证身份证号
  validateIdCard(idCard) {
    const pattern = /^[1-9]\d{5}(18|19|20)\d{2}((0[1-9])|(1[0-2]))(([0-2][1-9])|10|20|30|31)\d{3}[0-9Xx]$/;
    return pattern.test(idCard);
  }

  // 从身份证号提取出生日期
  extractBirthFromIdCard(idCard) {
    if (!this.validateIdCard(idCard)) {
      return null;
    }
    
    const year = idCard.substring(6, 10);
    const month = idCard.substring(10, 12);
    const day = idCard.substring(12, 14);
    
    return `${year}-${month}-${day}`;
  }

  // 从身份证号提取性别
  extractGenderFromIdCard(idCard) {
    if (!this.validateIdCard(idCard)) {
      return null;
    }
    
    const genderCode = parseInt(idCard.substring(16, 17));
    return genderCode % 2 === 0 ? 'female' : 'male';
  }
}

