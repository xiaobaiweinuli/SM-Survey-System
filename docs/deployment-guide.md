# SM任务问卷系统 - 完整部署指南

## 概述

本系统是基于Cloudflare全栈技术构建的企业级实名认证问卷和SM任务管理系统，支持完全自动化的GitHub到Cloudflare部署流程。

## 核心特性

### 🚀 完全自动化部署
- **一键部署**: 推送代码到GitHub即可自动部署
- **资源自动创建**: 自动创建并绑定D1数据库、R2存储桶、KV命名空间
- **内部API调用**: Pages与Worker无缝集成，无需配置跨域
- **数据库迁移**: 自动运行数据库迁移脚本

### 📧 Resend邮件服务
- **专业邮件服务**: 使用Resend提供高可靠性邮件发送
- **模板管理**: 支持Markdown格式的邮件模板
- **可视化配置**: 管理后台可自定义邮件模板

### 🎨 网站配置管理
- **可视化配置**: 无需修改代码即可更新网站信息
- **资源管理**: 支持logo、favicon等文件上传
- **SEO优化**: 完整的SEO配置支持
- **公告系统**: 支持顶部/底部滚动公告

## 部署前准备

### 1. 账号准备

#### Cloudflare账号
1. 注册[Cloudflare账号](https://dash.cloudflare.com/sign-up)
2. 获取Account ID：
   - 登录Cloudflare Dashboard
   - 右侧边栏查看Account ID
3. 创建API Token：
   - 进入 "My Profile" > "API Tokens"
   - 点击 "Create Token"
   - 使用 "Custom token" 模板
   - 权限设置：
     ```
     Account - Cloudflare Workers:Edit
     Account - Account Settings:Read
     Zone - Zone Settings:Edit
     Zone - Zone:Edit
     Account - D1:Edit
     Account - Cloudflare Pages:Edit
     ```

#### GitHub账号
1. 确保有GitHub账号
2. 准备一个仓库用于托管代码

#### Resend账号
1. 注册[Resend账号](https://resend.com/signup)
2. 获取API Key：
   - 登录Resend Dashboard
   - 进入 "API Keys" 页面
   - 创建新的API Key
3. 配置发送域名（可选）：
   - 添加并验证你的域名
   - 或使用Resend提供的测试域名

### 2. 第三方服务（可选）

#### 阿里云OCR服务
1. 开通[阿里云智能语音交互](https://ai.aliyun.com/ocr)
2. 获取AccessKey ID和AccessKey Secret

#### 腾讯云人脸比对服务
1. 开通[腾讯云人脸识别](https://cloud.tencent.com/product/facerecognition)
2. 获取SecretId和SecretKey

## 部署步骤

### 第一步：Fork或克隆项目

```bash
# 方式1：Fork项目到你的GitHub账号
# 在GitHub上点击Fork按钮

# 方式2：克隆项目到本地
git clone https://github.com/xiaobaiweinuli/SM-Survey-System.git
cd SM-Survey-System
```

### 第二步：配置GitHub环境变量

在GitHub仓库中配置以下环境变量：

1. 进入仓库 Settings > Secrets and variables > Actions
2. 点击 "New repository secret" 添加以下变量：

#### 必需的环境变量

```bash
# Cloudflare配置
CLOUDFLARE_API_TOKEN=your_cloudflare_api_token
CLOUDFLARE_ACCOUNT_ID=your_cloudflare_account_id

# JWT密钥（用于用户认证）
JWT_SECRET=your_super_secret_jwt_key_at_least_32_characters

# Resend邮件服务
RESEND_API_KEY=your_resend_api_key
FROM_EMAIL=noreply@your-domain.com
FROM_NAME=SM任务问卷系统

# 管理员账号
ADMIN_NAME=管理员姓名
ADMIN_ID_CARD=管理员身份证号
```

#### 可选的环境变量

```bash
# 阿里云OCR服务（身份证识别）
ALIYUN_ACCESS_KEY_ID=your_aliyun_access_key_id
ALIYUN_ACCESS_KEY_SECRET=your_aliyun_access_key_secret

# 腾讯云人脸比对服务
TENCENT_SECRET_ID=your_tencent_secret_id
TENCENT_SECRET_KEY=your_tencent_secret_key

# 企业微信通知（可选）
WECHAT_WEBHOOK_URL=your_wechat_webhook_url
```

### 第三步：推送代码触发部署

```bash
# 如果是克隆的项目，需要关联到你的仓库
git remote set-url origin https://github.com/your-username/your-repo-name.git

# 推送代码
git add .
git commit -m "Initial deployment"
git push origin main
```

### 第四步：监控部署过程

1. 进入GitHub仓库的 "Actions" 页面
2. 查看部署工作流的执行状态
3. 部署成功后会显示访问地址

## 部署后配置

### 1. 访问管理后台

1. 访问前端地址：`https://your-project-name.pages.dev`
2. 点击管理员登录
3. 使用配置的管理员信息登录

### 2. 网站基础配置

在管理后台进行以下配置：

#### 网站信息
- 网站名称
- 网站描述
- SEO信息
- 联系方式

#### 上传资源文件
- 网站Logo（PC端和移动端）
- Favicon图标
- 二维码图片

#### 页脚配置
- 版权信息
- ICP备案号
- 快速链接
- 法律信息链接

#### 邮件模板
- 自定义邮件模板
- 支持Markdown格式
- 测试邮件发送

### 3. 功能开关配置

根据需要开启或关闭功能：
- 用户注册
- 问卷功能
- 任务功能
- 强制实名认证

## 自定义域名（可选）

### 1. 配置自定义域名

1. 在Cloudflare Pages项目中添加自定义域名
2. 按照提示配置DNS记录
3. 等待SSL证书自动配置

### 2. 更新环境变量

如果使用自定义域名，需要更新前端环境变量：

```bash
# 在GitHub Secrets中更新
VITE_API_BASE_URL=https://your-custom-domain.com/api
```

## 维护和更新

### 代码更新

```bash
# 拉取最新代码
git pull origin main

# 修改代码后推送
git add .
git commit -m "Update features"
git push origin main
```

推送后会自动触发部署流程。

### 数据库迁移

如果有新的数据库迁移文件，系统会自动执行。也可以手动执行：

```bash
# 使用Wrangler CLI
npx wrangler d1 execute sm-auth-survey-db --file=./migrations/new_migration.sql
```

### 监控和日志

1. **Cloudflare Dashboard**: 查看Workers和Pages的运行状态
2. **GitHub Actions**: 查看部署历史和日志
3. **Resend Dashboard**: 查看邮件发送状态

## 故障排除

### 常见问题

#### 1. 部署失败
- 检查GitHub Secrets配置是否正确
- 查看Actions日志中的错误信息
- 确认Cloudflare API Token权限

#### 2. 邮件发送失败
- 检查Resend API Key是否有效
- 确认发送域名配置
- 查看Resend Dashboard中的错误日志

#### 3. 文件上传失败
- 检查R2存储桶是否创建成功
- 确认文件大小和类型限制
- 查看Worker日志

#### 4. 数据库连接失败
- 检查D1数据库是否创建成功
- 确认数据库迁移是否执行
- 查看wrangler.toml配置

### 获取帮助

1. **查看日志**：
   ```bash
   # 查看Worker日志
   npx wrangler tail
   
   # 查看Pages日志
   # 在Cloudflare Dashboard中查看
   ```

2. **重新部署**：
   - 在GitHub Actions中手动触发工作流
   - 或推送一个空提交触发部署

3. **重置数据库**：
   ```bash
   # 删除并重新创建数据库
   npx wrangler d1 delete sm-auth-survey-db
   npx wrangler d1 create sm-auth-survey-db
   ```

## 安全建议

### 1. 环境变量安全
- 定期更换JWT密钥
- 使用强密码
- 限制API Token权限

### 2. 访问控制
- 配置适当的CORS策略
- 启用速率限制
- 监控异常访问

### 3. 数据保护
- 定期备份数据库
- 加密敏感信息
- 遵循数据保护法规

## 性能优化

### 1. 缓存策略
- 利用Cloudflare CDN
- 配置适当的缓存头
- 使用KV存储缓存数据

### 2. 图片优化
- 使用WebP格式
- 配置图片压缩
- 实现懒加载

### 3. 代码优化
- 启用代码分割
- 压缩静态资源
- 优化数据库查询

## 扩展功能

### 1. 添加新的邮件模板
1. 在管理后台创建模板
2. 配置模板变量
3. 测试模板效果

### 2. 自定义问卷字段
1. 修改问卷配置JSON
2. 更新前端表单组件
3. 调整数据库结构

### 3. 集成第三方服务
1. 添加新的环境变量
2. 实现服务接口
3. 更新部署配置

## 总结

通过本指南，你可以：

1. ✅ 完全自动化部署到Cloudflare
2. ✅ 无需手动配置Cloudflare资源
3. ✅ 实现Pages与Worker的内部API调用
4. ✅ 使用专业的Resend邮件服务
5. ✅ 通过管理后台可视化配置网站
6. ✅ 仅需维护GitHub代码仓库

系统已经过充分测试，支持企业级应用场景。如有问题，请查看故障排除部分或提交Issue。

