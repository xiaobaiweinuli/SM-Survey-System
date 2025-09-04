/**
 * 加密工具函数
 */

// 生成随机盐值
export function generateSalt(length = 16) {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

// 哈希密码
export async function hashPassword(password, salt = null) {
  if (!salt) {
    salt = generateSalt();
  }
  
  const encoder = new TextEncoder();
  const data = encoder.encode(password + salt);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = new Uint8Array(hashBuffer);
  const hashHex = Array.from(hashArray, byte => byte.toString(16).padStart(2, '0')).join('');
  
  return `${salt}:${hashHex}`;
}

// 验证密码
export async function verifyPassword(password, hashedPassword) {
  const [salt, hash] = hashedPassword.split(':');
  const newHash = await hashPassword(password, salt);
  return newHash === hashedPassword;
}

// AES加密
export async function encrypt(text, key) {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  
  // 生成随机IV
  const iv = crypto.getRandomValues(new Uint8Array(12));
  
  // 导入密钥
  const keyData = encoder.encode(key.padEnd(32, '0').substring(0, 32));
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  );
  
  // 加密
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    data
  );
  
  // 组合IV和加密数据
  const result = new Uint8Array(iv.length + encrypted.byteLength);
  result.set(iv);
  result.set(new Uint8Array(encrypted), iv.length);
  
  // 转换为Base64
  return btoa(String.fromCharCode(...result));
}

// AES解密
export async function decrypt(encryptedText, key) {
  try {
    // 从Base64解码
    const data = new Uint8Array(
      atob(encryptedText).split('').map(char => char.charCodeAt(0))
    );
    
    // 分离IV和加密数据
    const iv = data.slice(0, 12);
    const encrypted = data.slice(12);
    
    // 导入密钥
    const encoder = new TextEncoder();
    const keyData = encoder.encode(key.padEnd(32, '0').substring(0, 32));
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'AES-GCM' },
      false,
      ['decrypt']
    );
    
    // 解密
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      cryptoKey,
      encrypted
    );
    
    // 转换为字符串
    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
    
  } catch (error) {
    throw new Error('解密失败');
  }
}

// 生成文件哈希
export async function generateFileHash(fileData) {
  const hashBuffer = await crypto.subtle.digest('SHA-256', fileData);
  const hashArray = new Uint8Array(hashBuffer);
  return Array.from(hashArray, byte => byte.toString(16).padStart(2, '0')).join('');
}

// 脱敏处理
export function maskSensitiveData(data, type) {
  switch (type) {
    case 'id_card':
      // 身份证号脱敏：显示前6位和后4位
      if (data.length >= 10) {
        return data.substring(0, 6) + '*'.repeat(data.length - 10) + data.substring(data.length - 4);
      }
      return data;
      
    case 'phone':
      // 手机号脱敏：显示前3位和后4位
      if (data.length >= 7) {
        return data.substring(0, 3) + '*'.repeat(data.length - 7) + data.substring(data.length - 4);
      }
      return data;
      
    case 'email':
      // 邮箱脱敏：显示前2位和@后的域名
      const atIndex = data.indexOf('@');
      if (atIndex > 2) {
        return data.substring(0, 2) + '*'.repeat(atIndex - 2) + data.substring(atIndex);
      }
      return data;
      
    default:
      return data;
  }
}

// 生成随机字符串
export function generateRandomString(length = 32) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, byte => chars[byte % chars.length]).join('');
}

