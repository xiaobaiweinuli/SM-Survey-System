-- Migration: 0001_initial_schema
-- Description: 创建初始数据库表结构

-- 用户表
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    id_card_number TEXT NOT NULL UNIQUE,
    age INTEGER NOT NULL,
    id_card_photo_url TEXT NOT NULL,
    face_photo_url TEXT NOT NULL,
    phone TEXT,
    address TEXT,
    city TEXT,
    is_verified BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    role TEXT DEFAULT 'user',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 管理员表
CREATE TABLE admins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    email TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    last_login_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 问卷配置表
CREATE TABLE survey_configs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    config_json TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES admins(id)
);

-- 问卷提交记录表
CREATE TABLE survey_submissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    survey_config_id INTEGER NOT NULL,
    submission_data TEXT NOT NULL,
    files_data TEXT,
    ip_address TEXT,
    user_agent TEXT,
    submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (survey_config_id) REFERENCES survey_configs(id)
);

-- SM任务表
CREATE TABLE sm_tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    content TEXT,
    category TEXT,
    difficulty_level INTEGER DEFAULT 1,
    estimated_duration INTEGER,
    max_submissions INTEGER DEFAULT -1,
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0,
    created_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES admins(id)
);

-- 任务领取记录表
CREATE TABLE task_claims (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    task_id INTEGER NOT NULL,
    claimed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (task_id) REFERENCES sm_tasks(id)
);

-- 任务提交记录表
CREATE TABLE task_submissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    task_id INTEGER NOT NULL,
    claim_id INTEGER,
    files_data TEXT,
    notes TEXT,
    duration_minutes INTEGER,
    status TEXT DEFAULT 'submitted',
    reviewed_by INTEGER,
    reviewed_at DATETIME,
    review_notes TEXT,
    submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (task_id) REFERENCES sm_tasks(id),
    FOREIGN KEY (claim_id) REFERENCES task_claims(id),
    FOREIGN KEY (reviewed_by) REFERENCES admins(id)
);

-- 文件上传记录表
CREATE TABLE file_uploads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    original_name TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    mime_type TEXT NOT NULL,
    file_hash TEXT,
    upload_type TEXT NOT NULL,
    related_id INTEGER,
    is_deleted BOOLEAN DEFAULT FALSE,
    uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 系统通知表
CREATE TABLE notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    recipient_type TEXT NOT NULL,
    recipient_id INTEGER,
    is_read BOOLEAN DEFAULT FALSE,
    sent_at DATETIME,
    webhook_url TEXT,
    webhook_sent BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 系统配置表
CREATE TABLE system_configs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    config_key TEXT NOT NULL UNIQUE,
    config_value TEXT NOT NULL,
    description TEXT,
    config_type TEXT DEFAULT 'string',
    is_public BOOLEAN DEFAULT FALSE,
    updated_by INTEGER,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (updated_by) REFERENCES admins(id)
);

-- 操作日志表
CREATE TABLE audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    user_type TEXT NOT NULL,
    action TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id INTEGER,
    details TEXT,
    ip_address TEXT,
    user_agent TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 用户会话表
CREATE TABLE user_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    user_type TEXT NOT NULL,
    session_token TEXT NOT NULL UNIQUE,
    expires_at DATETIME NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    is_active BOOLEAN DEFAULT TRUE,
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

