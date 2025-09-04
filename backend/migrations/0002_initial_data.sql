-- Migration: 0002_initial_data
-- Description: 插入初始数据和默认配置

-- 插入默认管理员账号
-- 用户名: admin, 密码: admin123 (实际部署时需要修改)
INSERT INTO admins (username, password_hash, email, is_active) VALUES 
('admin', '$2b$10$rOzJqQZJqQZJqQZJqQZJqOzJqQZJqQZJqQZJqQZJqQZJqQZJqQZJq', 'admin@example.com', TRUE);

-- 插入系统配置
INSERT INTO system_configs (config_key, config_value, description, config_type, is_public) VALUES 
('site_title', 'SM任务问卷系统', '网站标题', 'string', TRUE),
('site_description', '基于实名认证的问卷调研和SM任务平台', '网站描述', 'string', TRUE),
('max_file_size', '52428800', '最大文件上传大小(50MB)', 'number', FALSE),
('allowed_file_types', '["jpg", "jpeg", "png", "mp4", "mov", "avi"]', '允许的文件类型', 'json', FALSE),
('registration_enabled', 'true', '是否开放注册', 'boolean', TRUE),
('survey_enabled', 'true', '是否启用问卷功能', 'boolean', TRUE),
('tasks_enabled', 'true', '是否启用任务功能', 'boolean', TRUE),
('ocr_provider', 'tencent', 'OCR服务提供商', 'string', FALSE),
('face_compare_provider', 'tencent', '人脸比对服务提供商', 'string', FALSE),
('notification_webhook_enabled', 'true', '是否启用Webhook通知', 'boolean', FALSE),
('privacy_policy_url', '', '隐私政策链接', 'string', TRUE),
('terms_of_service_url', '', '服务条款链接', 'string', TRUE);

-- 插入默认问卷配置
INSERT INTO survey_configs (title, description, config_json, is_active, created_by) VALUES 
('用户基础信息调研', '收集用户的基础信息和偏好', '{
  "fields": [
    {
      "id": "name",
      "type": "text",
      "label": "姓名",
      "required": true,
      "readonly": true,
      "auto_fill": "user.name"
    },
    {
      "id": "id_card_number",
      "type": "text",
      "label": "身份证号",
      "required": true,
      "readonly": true,
      "auto_fill": "user.id_card_number"
    },
    {
      "id": "age",
      "type": "number",
      "label": "年龄",
      "required": true,
      "readonly": true,
      "auto_fill": "user.age"
    },
    {
      "id": "phone",
      "type": "tel",
      "label": "手机号码",
      "required": true,
      "pattern": "^1[3-9]\\d{9}$",
      "placeholder": "请输入11位手机号"
    },
    {
      "id": "address",
      "type": "textarea",
      "label": "详细地址",
      "required": true,
      "placeholder": "请输入详细地址"
    },
    {
      "id": "city",
      "type": "select",
      "label": "所在城市",
      "required": true,
      "options": [
        {"value": "beijing", "label": "北京"},
        {"value": "shanghai", "label": "上海"},
        {"value": "guangzhou", "label": "广州"},
        {"value": "shenzhen", "label": "深圳"},
        {"value": "hangzhou", "label": "杭州"},
        {"value": "nanjing", "label": "南京"},
        {"value": "wuhan", "label": "武汉"},
        {"value": "chengdu", "label": "成都"},
        {"value": "xian", "label": "西安"},
        {"value": "other", "label": "其他"}
      ]
    },
    {
      "id": "interests",
      "type": "checkbox",
      "label": "兴趣爱好",
      "required": false,
      "options": [
        {"value": "reading", "label": "阅读"},
        {"value": "music", "label": "音乐"},
        {"value": "sports", "label": "运动"},
        {"value": "travel", "label": "旅行"},
        {"value": "photography", "label": "摄影"},
        {"value": "cooking", "label": "烹饪"},
        {"value": "gaming", "label": "游戏"},
        {"value": "art", "label": "艺术"}
      ]
    },
    {
      "id": "experience_level",
      "type": "radio",
      "label": "相关经验水平",
      "required": true,
      "options": [
        {"value": "beginner", "label": "初学者"},
        {"value": "intermediate", "label": "中级"},
        {"value": "advanced", "label": "高级"},
        {"value": "expert", "label": "专家"}
      ]
    },
    {
      "id": "additional_photos",
      "type": "file",
      "label": "补充照片",
      "required": false,
      "accept": "image/*",
      "multiple": true,
      "max_files": 3
    },
    {
      "id": "introduction_video",
      "type": "file",
      "label": "自我介绍视频",
      "required": false,
      "accept": "video/*",
      "max_size": "50MB"
    }
  ],
  "conditional_logic": [
    {
      "condition": "age < 25",
      "show_fields": ["interests"],
      "hide_fields": []
    },
    {
      "condition": "city == \"other\"",
      "show_fields": ["custom_city"],
      "hide_fields": []
    }
  ],
  "steps": [
    {
      "title": "基础信息",
      "fields": ["name", "id_card_number", "age", "phone", "address", "city"]
    },
    {
      "title": "个人偏好",
      "fields": ["interests", "experience_level"]
    },
    {
      "title": "补充材料",
      "fields": ["additional_photos", "introduction_video"]
    }
  ]
}', TRUE, 1);

-- 插入示例SM任务
INSERT INTO sm_tasks (title, description, content, category, difficulty_level, estimated_duration, created_by) VALUES 
('基础服从训练', '完成基础的服从指令训练', '请按照以下步骤完成训练：\n1. 保持标准姿势5分钟\n2. 完成指定动作序列\n3. 录制完成过程视频\n\n注意事项：\n- 确保环境安全\n- 动作标准到位\n- 视频清晰完整', 'training', 1, 15, 1),
('耐力挑战', '测试个人耐力极限', '耐力挑战任务说明：\n1. 保持指定姿势30分钟\n2. 中途不得休息\n3. 记录挑战过程\n\n评分标准：\n- 姿势标准度\n- 坚持时长\n- 完成质量', 'challenge', 3, 45, 1),
('创意表演', '展示个人创意和表现力', '创意表演要求：\n1. 自选主题进行表演\n2. 时长3-5分钟\n3. 展现个人特色\n\n提交要求：\n- 高清视频录制\n- 包含完整表演过程\n- 可配背景音乐', 'performance', 2, 30, 1),
('技能展示', '展示专业技能或特长', '技能展示说明：\n1. 选择自己擅长的技能\n2. 进行详细演示\n3. 解释技能要点\n\n可选技能类型：\n- 艺术类（绘画、音乐等）\n- 运动类（舞蹈、体操等）\n- 手工类（编织、制作等）\n- 其他特长技能', 'skill', 2, 25, 1),
('角色扮演', '完成指定角色的扮演任务', '角色扮演要求：\n1. 选择提供的角色之一\n2. 准备相应服装道具\n3. 完成角色设定的情景表演\n\n可选角色：\n- 职业角色（护士、教师等）\n- 动漫角色\n- 历史人物\n- 自创角色', 'roleplay', 3, 40, 1);

-- 插入通知模板
INSERT INTO notifications (type, title, content, recipient_type, webhook_url) VALUES 
('user_register', '新用户注册通知', '有新用户完成注册和实名认证', 'admin', ''),
('survey_submit', '问卷提交通知', '用户提交了新的问卷调研', 'admin', ''),
('task_submit', '任务提交通知', '用户提交了新的任务完成记录', 'admin', '');

