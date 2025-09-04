-- Cloudflare D1 数据库表结构设计
-- 实名认证问卷+SM任务系统

-- 用户表
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,                    -- 姓名
    id_card_number TEXT NOT NULL UNIQUE,   -- 身份证号(加密存储)
    age INTEGER NOT NULL,                  -- 年龄
    id_card_photo_url TEXT NOT NULL,       -- 身份证照片URL
    face_photo_url TEXT NOT NULL,          -- 正脸照片URL
    phone TEXT,                            -- 手机号(加密存储)
    address TEXT,                          -- 地址
    city TEXT,                             -- 城市
    is_verified BOOLEAN DEFAULT FALSE,     -- 是否已实名认证
    is_active BOOLEAN DEFAULT TRUE,        -- 账号是否激活
    role TEXT DEFAULT 'user',              -- 用户角色: user, admin
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 管理员表
CREATE TABLE admins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,        -- 管理员用户名
    password_hash TEXT NOT NULL,          -- 密码哈希
    email TEXT,                           -- 邮箱
    is_active BOOLEAN DEFAULT TRUE,       -- 是否激活
    last_login_at DATETIME,               -- 最后登录时间
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 问卷配置表
CREATE TABLE survey_configs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,                  -- 问卷标题
    description TEXT,                     -- 问卷描述
    config_json TEXT NOT NULL,            -- 问卷配置JSON
    is_active BOOLEAN DEFAULT TRUE,       -- 是否启用
    created_by INTEGER,                   -- 创建者ID
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES admins(id)
);

-- 问卷提交记录表
CREATE TABLE survey_submissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,             -- 用户ID
    survey_config_id INTEGER NOT NULL,    -- 问卷配置ID
    submission_data TEXT NOT NULL,        -- 提交数据JSON
    files_data TEXT,                      -- 文件数据JSON
    ip_address TEXT,                      -- 提交IP
    user_agent TEXT,                      -- 用户代理
    submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (survey_config_id) REFERENCES survey_configs(id)
);

-- SM任务表
CREATE TABLE sm_tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,                  -- 任务标题
    description TEXT NOT NULL,            -- 任务描述
    content TEXT,                         -- 任务内容
    category TEXT,                        -- 任务分类
    difficulty_level INTEGER DEFAULT 1,   -- 难度等级 1-5
    estimated_duration INTEGER,           -- 预估时长(分钟)
    max_submissions INTEGER DEFAULT -1,   -- 最大提交次数(-1为无限制)
    is_active BOOLEAN DEFAULT TRUE,       -- 是否启用
    sort_order INTEGER DEFAULT 0,         -- 排序权重
    created_by INTEGER,                   -- 创建者ID
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES admins(id)
);

-- 任务领取记录表
CREATE TABLE task_claims (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,             -- 用户ID
    task_id INTEGER NOT NULL,             -- 任务ID
    claimed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (task_id) REFERENCES sm_tasks(id)
);

-- 任务提交记录表
CREATE TABLE task_submissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,             -- 用户ID
    task_id INTEGER NOT NULL,             -- 任务ID
    claim_id INTEGER,                     -- 领取记录ID
    files_data TEXT,                      -- 提交文件JSON
    notes TEXT,                           -- 备注
    duration_minutes INTEGER,             -- 实际用时(分钟)
    status TEXT DEFAULT 'submitted',      -- 状态: submitted, approved, rejected
    reviewed_by INTEGER,                  -- 审核者ID
    reviewed_at DATETIME,                 -- 审核时间
    review_notes TEXT,                    -- 审核备注
    submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (task_id) REFERENCES sm_tasks(id),
    FOREIGN KEY (claim_id) REFERENCES task_claims(id),
    FOREIGN KEY (reviewed_by) REFERENCES admins(id)
);

-- 文件上传记录表
CREATE TABLE file_uploads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,                      -- 上传用户ID
    original_name TEXT NOT NULL,          -- 原始文件名
    file_name TEXT NOT NULL,              -- 存储文件名
    file_path TEXT NOT NULL,              -- 文件路径
    file_size INTEGER NOT NULL,           -- 文件大小(字节)
    mime_type TEXT NOT NULL,              -- MIME类型
    file_hash TEXT,                       -- 文件哈希
    upload_type TEXT NOT NULL,            -- 上传类型: id_card, face, survey, task
    related_id INTEGER,                   -- 关联记录ID
    is_deleted BOOLEAN DEFAULT FALSE,     -- 是否已删除
    uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 系统通知表
CREATE TABLE notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,                   -- 通知类型: user_register, survey_submit, task_submit
    title TEXT NOT NULL,                  -- 通知标题
    content TEXT NOT NULL,                -- 通知内容
    recipient_type TEXT NOT NULL,         -- 接收者类型: admin, user, system
    recipient_id INTEGER,                 -- 接收者ID
    is_read BOOLEAN DEFAULT FALSE,        -- 是否已读
    sent_at DATETIME,                     -- 发送时间
    webhook_url TEXT,                     -- Webhook URL
    webhook_sent BOOLEAN DEFAULT FALSE,   -- 是否已发送Webhook
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 系统配置表
CREATE TABLE system_configs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    config_key TEXT NOT NULL UNIQUE,      -- 配置键
    config_value TEXT NOT NULL,           -- 配置值
    description TEXT,                     -- 配置描述
    config_type TEXT DEFAULT 'string',    -- 配置类型: string, number, boolean, json
    is_public BOOLEAN DEFAULT FALSE,      -- 是否公开(前端可访问)
    updated_by INTEGER,                   -- 更新者ID
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (updated_by) REFERENCES admins(id)
);

-- 操作日志表
CREATE TABLE audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,                      -- 操作用户ID
    user_type TEXT NOT NULL,              -- 用户类型: user, admin
    action TEXT NOT NULL,                 -- 操作类型
    resource_type TEXT NOT NULL,          -- 资源类型
    resource_id INTEGER,                  -- 资源ID
    details TEXT,                         -- 操作详情JSON
    ip_address TEXT,                      -- 操作IP
    user_agent TEXT,                      -- 用户代理
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 用户会话表
CREATE TABLE user_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,             -- 用户ID
    user_type TEXT NOT NULL,              -- 用户类型: user, admin
    session_token TEXT NOT NULL UNIQUE,   -- 会话令牌
    expires_at DATETIME NOT NULL,         -- 过期时间
    ip_address TEXT,                      -- 登录IP
    user_agent TEXT,                      -- 用户代理
    is_active BOOLEAN DEFAULT TRUE,       -- 是否激活
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 创建索引
CREATE INDEX idx_users_id_card ON users(id_card_number);
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_created_at ON users(created_at);

CREATE INDEX idx_survey_submissions_user_id ON survey_submissions(user_id);
CREATE INDEX idx_survey_submissions_submitted_at ON survey_submissions(submitted_at);

CREATE INDEX idx_task_claims_user_id ON task_claims(user_id);
CREATE INDEX idx_task_claims_task_id ON task_claims(task_id);
CREATE INDEX idx_task_claims_claimed_at ON task_claims(claimed_at);

CREATE INDEX idx_task_submissions_user_id ON task_submissions(user_id);
CREATE INDEX idx_task_submissions_task_id ON task_submissions(task_id);
CREATE INDEX idx_task_submissions_submitted_at ON task_submissions(submitted_at);

CREATE INDEX idx_file_uploads_user_id ON file_uploads(user_id);
CREATE INDEX idx_file_uploads_upload_type ON file_uploads(upload_type);
CREATE INDEX idx_file_uploads_uploaded_at ON file_uploads(uploaded_at);

CREATE INDEX idx_notifications_recipient ON notifications(recipient_type, recipient_id);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);

CREATE INDEX idx_audit_logs_user ON audit_logs(user_type, user_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

CREATE INDEX idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX idx_user_sessions_user ON user_sessions(user_type, user_id);
CREATE INDEX idx_user_sessions_expires_at ON user_sessions(expires_at);


-- 邮件模板表
CREATE TABLE email_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(100) NOT NULL UNIQUE,
    subject VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    format VARCHAR(20) DEFAULT 'html', -- html, markdown
    variables TEXT, -- JSON格式的可用变量说明
    is_active BOOLEAN DEFAULT true,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 网站配置表
CREATE TABLE site_configs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    config_key VARCHAR(100) NOT NULL UNIQUE,
    config_value TEXT,
    config_type VARCHAR(50) DEFAULT 'text', -- text, json, file, boolean
    category VARCHAR(50) DEFAULT 'general', -- general, seo, footer, announcement, etc.
    display_name VARCHAR(255),
    description TEXT,
    sort_order INTEGER DEFAULT 0,
    is_public BOOLEAN DEFAULT false, -- 是否可以在前端公开访问
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 网站文件资源表（logo、favicon等）
CREATE TABLE site_assets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    asset_key VARCHAR(100) NOT NULL UNIQUE,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size INTEGER,
    mime_type VARCHAR(100),
    category VARCHAR(50), -- logo, favicon, qrcode, etc.
    device_type VARCHAR(20), -- pc, mobile, all
    is_active BOOLEAN DEFAULT true,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 页脚链接表
CREATE TABLE footer_links (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    group_name VARCHAR(100) NOT NULL,
    link_text VARCHAR(255) NOT NULL,
    link_url VARCHAR(500) NOT NULL,
    link_target VARCHAR(20) DEFAULT '_self', -- _self, _blank
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 系统公告表
CREATE TABLE announcements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'info', -- info, warning, success, error
    position VARCHAR(50) DEFAULT 'top', -- top, bottom
    is_scrolling BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    start_time DATETIME,
    end_time DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 创建新表的索引
CREATE INDEX idx_email_templates_name ON email_templates(name);
CREATE INDEX idx_site_configs_key ON site_configs(config_key);
CREATE INDEX idx_site_configs_category ON site_configs(category);
CREATE INDEX idx_site_assets_key ON site_assets(asset_key);
CREATE INDEX idx_site_assets_category ON site_assets(category);
CREATE INDEX idx_footer_links_group ON footer_links(group_name);
CREATE INDEX idx_announcements_active ON announcements(is_active);
CREATE INDEX idx_announcements_position ON announcements(position);

