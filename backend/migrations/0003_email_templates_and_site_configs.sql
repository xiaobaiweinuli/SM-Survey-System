-- 插入默认邮件模板
INSERT INTO email_templates (name, subject, content, format, variables) VALUES
('user_registration', '欢迎注册{{siteName}}', '# 欢迎注册

亲爱的 **{{userName}}**，

欢迎您注册{{siteName}}！您的账户已创建成功。

## 下一步操作
- 完成实名认证以解锁更多功能
- 浏览可用的问卷和任务

**注册时间**: {{registrationTime}}  
**用户ID**: {{userId}}

[立即登录]({{loginUrl}})

如有任何问题，请联系客服。

祝您使用愉快！', 'markdown', '{"userName": "用户姓名", "userId": "用户ID", "registrationTime": "注册时间", "loginUrl": "登录链接", "siteName": "网站名称"}'),

('auth_status', '实名认证{{status}}', '# 实名认证状态更新

亲爱的 **{{userName}}**，

您的实名认证状态已更新为：**{{status}}**

{{#if reason}}
**备注**: {{reason}}
{{/if}}

**状态更新时间**: {{statusTime}}

[查看详情]({{dashboardUrl}})

如有疑问，请联系客服。', 'markdown', '{"userName": "用户姓名", "status": "认证状态", "reason": "备注信息", "statusTime": "状态更新时间", "dashboardUrl": "用户中心链接"}'),

('survey_submission', '问卷提交成功', '# 问卷提交成功

亲爱的 **{{userName}}**，

您已成功提交问卷：**{{surveyTitle}}**

**提交时间**: {{submissionTime}}

感谢您的参与！

[查看我的提交]({{dashboardUrl}})

', 'markdown', '{"userName": "用户姓名", "surveyTitle": "问卷标题", "submissionTime": "提交时间", "dashboardUrl": "用户中心链接"}'),

('task_claim', '任务领取成功', '# 任务领取成功

亲爱的 **{{userName}}**，

您已成功领取任务：**{{taskTitle}}**

**领取时间**: {{claimTime}}

请及时完成任务并提交。

[开始任务]({{taskUrl}})

', 'markdown', '{"userName": "用户姓名", "taskTitle": "任务标题", "claimTime": "领取时间", "taskUrl": "任务链接"}'),

('task_submit', '任务提交成功', '# 任务提交成功

亲爱的 **{{userName}}**，

您已成功提交任务：**{{taskTitle}}**

**提交时间**: {{submitTime}}

我们将尽快审核，请耐心等待。

[查看提交详情]({{taskUrl}})

', 'markdown', '{"userName": "用户姓名", "taskTitle": "任务标题", "submitTime": "提交时间", "taskUrl": "任务链接"}'),

('task_review', '任务审核{{status}}', '# 任务审核结果

亲爱的 **{{userName}}**，

您提交的任务：**{{taskTitle}}**

**审核结果**: {{status}}

{{#if feedback}}
**审核意见**: {{feedback}}
{{/if}}

{{#if rewardAmount}}
**奖励金额**: ¥{{rewardAmount}}
{{/if}}

**审核时间**: {{reviewTime}}

[查看详情]({{dashboardUrl}})

', 'markdown', '{"userName": "用户姓名", "taskTitle": "任务标题", "status": "审核状态", "feedback": "审核意见", "rewardAmount": "奖励金额", "reviewTime": "审核时间", "dashboardUrl": "用户中心链接"}'),

('user_status_change', '账户状态变更通知', '# 账户状态变更

亲爱的 **{{userName}}**，

您的账户状态已变更为：**{{status}}**

{{#if reason}}
**变更原因**: {{reason}}
{{/if}}

**变更时间**: {{changeTime}}

如有疑问，请[联系客服]({{contactUrl}})。

', 'markdown', '{"userName": "用户姓名", "status": "账户状态", "reason": "变更原因", "changeTime": "变更时间", "contactUrl": "联系客服链接"}'),

('system_announcement', '{{title}}', '# {{title}}

{{content}}

**发布时间**: {{announcementTime}}

---

[访问网站]({{websiteUrl}})

', 'markdown', '{"title": "公告标题", "content": "公告内容", "announcementTime": "发布时间", "websiteUrl": "网站链接"}');

-- 插入默认网站配置
INSERT INTO site_configs (config_key, config_value, config_type, category, display_name, description, sort_order, is_public) VALUES
-- 基本信息
('site_name', 'SM任务问卷系统', 'text', 'general', '网站名称', '网站的显示名称', 1, true),
('site_description', '基于Cloudflare全栈技术构建的企业级实名认证问卷和SM任务管理系统', 'text', 'general', '网站描述', '网站的简短描述', 2, true),
('site_keywords', 'SM任务,问卷调研,实名认证,任务管理,Cloudflare', 'text', 'general', '网站关键词', '网站SEO关键词，用逗号分隔', 3, true),

-- SEO配置
('seo_title', 'SM任务问卷系统 - 实名认证平台', 'text', 'seo', 'SEO标题', '网站的SEO标题', 1, true),
('seo_description', '专业的实名认证问卷和SM任务管理平台，提供安全可靠的用户认证和任务分发服务', 'text', 'seo', 'SEO描述', '网站的SEO描述', 2, true),
('seo_keywords', 'SM任务,问卷系统,实名认证,任务管理,用户认证', 'text', 'seo', 'SEO关键词', 'SEO关键词，用逗号分隔', 3, true),

-- 页脚配置
('footer_copyright', '© 2024 SM任务问卷系统. 保留所有权利.', 'text', 'footer', '版权信息', '页脚显示的版权信息', 1, true),
('footer_icp', '', 'text', 'footer', 'ICP备案号', 'ICP备案号，符合国家规范', 2, true),
('footer_contact_email', 'contact@example.com', 'text', 'footer', '联系邮箱', '客服联系邮箱', 3, true),
('footer_contact_phone', '400-000-0000', 'text', 'footer', '联系电话', '客服联系电话', 4, true),

-- 公告配置
('announcement_top_enabled', 'false', 'boolean', 'announcement', '启用顶部公告', '是否显示顶部滚动公告', 1, true),
('announcement_top_content', '', 'text', 'announcement', '顶部公告内容', '顶部滚动公告的内容', 2, true),
('announcement_bottom_enabled', 'false', 'boolean', 'announcement', '启用底部公告', '是否显示底部公告', 3, true),
('announcement_bottom_content', '', 'text', 'announcement', '底部公告内容', '底部公告的内容', 4, true),

-- 功能开关
('feature_registration_enabled', 'true', 'boolean', 'features', '启用用户注册', '是否允许新用户注册', 1, true),
('feature_survey_enabled', 'true', 'boolean', 'features', '启用问卷功能', '是否启用问卷调研功能', 2, true),
('feature_tasks_enabled', 'true', 'boolean', 'features', '启用任务功能', '是否启用SM任务功能', 3, true),
('feature_auth_required', 'true', 'boolean', 'features', '强制实名认证', '是否要求用户完成实名认证', 4, false),

-- 邮件配置
('email_from_name', 'SM任务问卷系统', 'text', 'email', '发件人名称', '邮件发送时显示的发件人名称', 1, false),
('email_from_address', 'noreply@your-domain.com', 'text', 'email', '发件人邮箱', '邮件发送时使用的发件人邮箱', 2, false),

-- 系统配置
('system_maintenance_mode', 'false', 'boolean', 'system', '维护模式', '是否启用系统维护模式', 1, false),
('system_maintenance_message', '系统正在维护中，请稍后再试', 'text', 'system', '维护提示信息', '维护模式下显示的提示信息', 2, false),
('system_max_file_size', '10485760', 'text', 'system', '最大文件大小', '文件上传的最大大小（字节）', 3, false),
('system_allowed_file_types', 'jpg,jpeg,png,pdf,doc,docx', 'text', 'system', '允许的文件类型', '允许上传的文件类型，用逗号分隔', 4, false);

-- 插入默认页脚链接
INSERT INTO footer_links (group_name, link_text, link_url, sort_order) VALUES
('快速链接', '用户登录', '/login', 1),
('快速链接', '用户注册', '/register', 2),
('快速链接', '帮助中心', '/help', 3),
('快速链接', '联系我们', '/contact', 4),
('法律信息', '服务条款', '/terms', 1),
('法律信息', '隐私政策', '/privacy', 2),
('法律信息', '免责声明', '/disclaimer', 3);

-- 插入默认公告
INSERT INTO announcements (title, content, type, position, is_active) VALUES
('欢迎使用SM任务问卷系统', '欢迎使用我们的实名认证问卷和任务管理平台！请完成实名认证以解锁更多功能。', 'info', 'top', false);

