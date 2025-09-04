# API接口规范文档

## 基础信息

- **Base URL**: `https://your-worker.your-subdomain.workers.dev`
- **API版本**: v1
- **认证方式**: JWT Bearer Token
- **数据格式**: JSON
- **字符编码**: UTF-8

## 通用响应格式

### 成功响应
```json
{
  "success": true,
  "data": {},
  "message": "操作成功",
  "timestamp": "2024-09-05T10:00:00Z"
}
```

### 错误响应
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "错误描述",
    "details": {}
  },
  "timestamp": "2024-09-05T10:00:00Z"
}
```

## 认证相关API

### 1. 用户注册
**POST** `/api/auth/register`

**请求体**:
```json
{
  "name": "张三",
  "id_card_number": "110101199001011234",
  "id_card_photo": "base64_encoded_image",
  "face_photo": "base64_encoded_image"
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "user_id": 1,
    "name": "张三",
    "age": 34,
    "is_verified": true,
    "token": "jwt_token_here"
  }
}
```

### 2. 用户登录
**POST** `/api/auth/login`

**请求体**:
```json
{
  "name": "张三",
  "id_card_number": "110101199001011234"
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "name": "张三",
      "age": 34,
      "role": "user"
    },
    "token": "jwt_token_here",
    "expires_at": "2024-09-12T10:00:00Z"
  }
}
```

### 3. 管理员登录
**POST** `/api/auth/admin/login`

**请求体**:
```json
{
  "username": "admin",
  "password": "admin123"
}
```

### 4. 刷新Token
**POST** `/api/auth/refresh`

**Headers**: `Authorization: Bearer <token>`

### 5. 登出
**POST** `/api/auth/logout`

**Headers**: `Authorization: Bearer <token>`

## 用户相关API

### 1. 获取用户信息
**GET** `/api/user/profile`

**Headers**: `Authorization: Bearer <token>`

**响应**:
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "张三",
    "age": 34,
    "phone": "138****1234",
    "address": "北京市朝阳区xxx",
    "city": "beijing",
    "is_verified": true,
    "created_at": "2024-09-05T10:00:00Z"
  }
}
```

### 2. 更新用户信息
**PUT** `/api/user/profile`

**Headers**: `Authorization: Bearer <token>`

**请求体**:
```json
{
  "phone": "13812341234",
  "address": "北京市朝阳区新地址",
  "city": "beijing"
}
```

### 3. 获取用户统计
**GET** `/api/user/stats`

**Headers**: `Authorization: Bearer <token>`

**响应**:
```json
{
  "success": true,
  "data": {
    "surveys_completed": 5,
    "tasks_completed": 12,
    "total_task_duration": 480,
    "files_uploaded": 25,
    "registration_date": "2024-09-01T10:00:00Z"
  }
}
```

## 问卷相关API

### 1. 获取问卷配置
**GET** `/api/survey/config`

**Headers**: `Authorization: Bearer <token>`

**响应**:
```json
{
  "success": true,
  "data": {
    "id": 1,
    "title": "用户基础信息调研",
    "description": "收集用户的基础信息和偏好",
    "config": {
      "fields": [...],
      "conditional_logic": [...],
      "steps": [...]
    }
  }
}
```

### 2. 提交问卷
**POST** `/api/survey/submit`

**Headers**: `Authorization: Bearer <token>`

**请求体**:
```json
{
  "survey_config_id": 1,
  "data": {
    "phone": "13812341234",
    "address": "北京市朝阳区xxx",
    "city": "beijing",
    "interests": ["reading", "music"],
    "experience_level": "intermediate"
  },
  "files": [
    {
      "field_id": "additional_photos",
      "file_data": "base64_encoded_file",
      "file_name": "photo1.jpg",
      "mime_type": "image/jpeg"
    }
  ]
}
```

### 3. 获取问卷提交记录
**GET** `/api/survey/submissions`

**Headers**: `Authorization: Bearer <token>`

**查询参数**:
- `page`: 页码 (默认: 1)
- `limit`: 每页数量 (默认: 10)

## 任务相关API

### 1. 获取任务列表
**GET** `/api/tasks`

**Headers**: `Authorization: Bearer <token>`

**查询参数**:
- `page`: 页码 (默认: 1)
- `limit`: 每页数量 (默认: 10)
- `category`: 任务分类
- `difficulty`: 难度等级
- `random`: 是否随机排序 (默认: true)

**响应**:
```json
{
  "success": true,
  "data": {
    "tasks": [
      {
        "id": 1,
        "title": "基础服从训练",
        "description": "完成基础的服从指令训练",
        "category": "training",
        "difficulty_level": 1,
        "estimated_duration": 15,
        "user_claimed": false,
        "user_completed": 0,
        "max_submissions": -1
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 5,
      "pages": 1
    }
  }
}
```

### 2. 获取任务详情
**GET** `/api/tasks/:id`

**Headers**: `Authorization: Bearer <token>`

### 3. 领取任务
**POST** `/api/tasks/:id/claim`

**Headers**: `Authorization: Bearer <token>`

**响应**:
```json
{
  "success": true,
  "data": {
    "claim_id": 123,
    "task_id": 1,
    "claimed_at": "2024-09-05T10:00:00Z"
  }
}
```

### 4. 提交任务
**POST** `/api/tasks/:id/submit`

**Headers**: `Authorization: Bearer <token>`

**请求体**:
```json
{
  "claim_id": 123,
  "files": [
    {
      "file_data": "base64_encoded_file",
      "file_name": "task_video.mp4",
      "mime_type": "video/mp4"
    }
  ],
  "notes": "任务完成说明",
  "duration_minutes": 18
}
```

### 5. 获取任务提交记录
**GET** `/api/tasks/submissions`

**Headers**: `Authorization: Bearer <token>`

**查询参数**:
- `page`: 页码
- `limit`: 每页数量
- `task_id`: 任务ID
- `status`: 状态筛选

## 文件相关API

### 1. 上传文件
**POST** `/api/files/upload`

**Headers**: `Authorization: Bearer <token>`

**请求体** (multipart/form-data):
```
file: <binary_file>
upload_type: "survey" | "task" | "profile"
related_id: <number>
```

**响应**:
```json
{
  "success": true,
  "data": {
    "file_id": 123,
    "file_url": "https://r2-bucket-url/files/xxx.jpg",
    "file_name": "uploaded_file.jpg",
    "file_size": 1024000,
    "mime_type": "image/jpeg"
  }
}
```

### 2. 获取文件信息
**GET** `/api/files/:id`

**Headers**: `Authorization: Bearer <token>`

### 3. 删除文件
**DELETE** `/api/files/:id`

**Headers**: `Authorization: Bearer <token>`

## 管理后台API

### 1. 用户管理

#### 获取用户列表
**GET** `/api/admin/users`

**Headers**: `Authorization: Bearer <admin_token>`

**查询参数**:
- `page`: 页码
- `limit`: 每页数量
- `search`: 搜索关键词
- `is_verified`: 认证状态
- `is_active`: 激活状态

#### 获取用户详情
**GET** `/api/admin/users/:id`

#### 更新用户状态
**PUT** `/api/admin/users/:id/status`

**请求体**:
```json
{
  "is_active": true,
  "is_verified": true
}
```

### 2. 问卷管理

#### 获取问卷配置列表
**GET** `/api/admin/surveys`

#### 创建问卷配置
**POST** `/api/admin/surveys`

#### 更新问卷配置
**PUT** `/api/admin/surveys/:id`

#### 获取问卷提交统计
**GET** `/api/admin/surveys/:id/stats`

### 3. 任务管理

#### 获取任务列表
**GET** `/api/admin/tasks`

#### 创建任务
**POST** `/api/admin/tasks`

#### 更新任务
**PUT** `/api/admin/tasks/:id`

#### 获取任务统计
**GET** `/api/admin/tasks/:id/stats`

### 4. 数据导出

#### 导出用户数据
**GET** `/api/admin/export/users`

**查询参数**:
- `format`: "csv" | "excel" | "json"
- `date_from`: 开始日期
- `date_to`: 结束日期

#### 导出问卷数据
**GET** `/api/admin/export/surveys`

#### 导出任务数据
**GET** `/api/admin/export/tasks`

## 系统配置API

### 1. 获取公开配置
**GET** `/api/config/public`

**响应**:
```json
{
  "success": true,
  "data": {
    "site_title": "SM任务问卷系统",
    "site_description": "基于实名认证的问卷调研和SM任务平台",
    "registration_enabled": true,
    "survey_enabled": true,
    "tasks_enabled": true
  }
}
```

### 2. 更新系统配置 (管理员)
**PUT** `/api/admin/config`

## 通知API

### 1. 获取通知列表
**GET** `/api/notifications`

**Headers**: `Authorization: Bearer <token>`

### 2. 标记通知已读
**PUT** `/api/notifications/:id/read`

### 3. 发送Webhook通知 (系统内部)
**POST** `/api/webhooks/notify`

## 错误代码

| 错误代码 | HTTP状态码 | 描述 |
|---------|-----------|------|
| AUTH_REQUIRED | 401 | 需要认证 |
| AUTH_INVALID | 401 | 认证无效 |
| AUTH_EXPIRED | 401 | 认证过期 |
| PERMISSION_DENIED | 403 | 权限不足 |
| NOT_FOUND | 404 | 资源不存在 |
| VALIDATION_ERROR | 400 | 数据验证失败 |
| FILE_TOO_LARGE | 413 | 文件过大 |
| FILE_TYPE_NOT_ALLOWED | 400 | 文件类型不允许 |
| OCR_FAILED | 500 | OCR识别失败 |
| FACE_COMPARE_FAILED | 500 | 人脸比对失败 |
| DATABASE_ERROR | 500 | 数据库错误 |
| INTERNAL_ERROR | 500 | 内部服务器错误 |

## 限流规则

- 注册接口: 每IP每小时最多5次
- 登录接口: 每IP每分钟最多10次
- 文件上传: 每用户每分钟最多20次
- 其他接口: 每用户每分钟最多100次

## 安全说明

1. 所有敏感数据传输必须使用HTTPS
2. 身份证号和手机号在数据库中加密存储
3. 文件上传需要验证文件类型和大小
4. API接口需要验证用户权限
5. 记录所有敏感操作的审计日志

