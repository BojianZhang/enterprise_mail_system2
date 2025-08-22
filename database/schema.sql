-- 企业级邮件系统数据库架构
-- 支持多域名、多别名的邮件收发系统

-- 创建数据库
CREATE DATABASE IF NOT EXISTS enterprise_mail;
USE enterprise_mail;

-- 用户表（主账户）
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    is_admin BOOLEAN DEFAULT FALSE,
    storage_quota BIGINT DEFAULT 1073741824, -- 1GB默认配额
    used_storage BIGINT DEFAULT 0
);

-- 域名表
CREATE TABLE domains (
    id INT PRIMARY KEY AUTO_INCREMENT,
    domain_name VARCHAR(255) UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    mx_record VARCHAR(255),
    spf_record TEXT,
    dkim_selector VARCHAR(50),
    dkim_private_key TEXT,
    dkim_public_key TEXT
);

-- 别名表（邮箱别名）
CREATE TABLE aliases (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    domain_id INT NOT NULL,
    alias_name VARCHAR(255) NOT NULL, -- 别名的本地部分（@符号前）
    full_email VARCHAR(255) GENERATED ALWAYS AS (CONCAT(alias_name, '@', (SELECT domain_name FROM domains WHERE id = domain_id))) STORED,
    display_name VARCHAR(100), -- 用户可自定义的显示名称
    is_active BOOLEAN DEFAULT TRUE,
    is_primary BOOLEAN DEFAULT FALSE, -- 是否为主要别名
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (domain_id) REFERENCES domains(id) ON DELETE CASCADE,
    UNIQUE KEY unique_alias_domain (alias_name, domain_id)
);

-- 邮件表
CREATE TABLE emails (
    id INT PRIMARY KEY AUTO_INCREMENT,
    message_id VARCHAR(255) UNIQUE NOT NULL,
    alias_id INT NOT NULL, -- 接收或发送的别名ID
    from_email VARCHAR(255) NOT NULL,
    from_name VARCHAR(100),
    to_emails JSON NOT NULL, -- 支持多个收件人
    cc_emails JSON,
    bcc_emails JSON,
    subject VARCHAR(500),
    body_text LONGTEXT,
    body_html LONGTEXT,
    attachments JSON, -- 存储附件信息
    size BIGINT DEFAULT 0,
    is_read BOOLEAN DEFAULT FALSE,
    is_starred BOOLEAN DEFAULT FALSE,
    is_deleted BOOLEAN DEFAULT FALSE,
    folder VARCHAR(50) DEFAULT 'inbox', -- inbox, sent, drafts, trash, spam
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    received_at TIMESTAMP,
    FOREIGN KEY (alias_id) REFERENCES aliases(id) ON DELETE CASCADE,
    INDEX idx_alias_folder (alias_id, folder),
    INDEX idx_created_at (created_at),
    INDEX idx_subject (subject),
    FULLTEXT INDEX idx_content (subject, body_text)
);

-- 附件表
CREATE TABLE attachments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    email_id INT NOT NULL,
    filename VARCHAR(255) NOT NULL,
    content_type VARCHAR(100),
    size BIGINT NOT NULL,
    file_path VARCHAR(500) NOT NULL, -- 文件系统路径
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (email_id) REFERENCES emails(id) ON DELETE CASCADE
);

-- 邮件标签表
CREATE TABLE email_labels (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    name VARCHAR(50) NOT NULL,
    color VARCHAR(7) DEFAULT '#007bff',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_label (user_id, name)
);

-- 邮件与标签关联表
CREATE TABLE email_label_mappings (
    email_id INT NOT NULL,
    label_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (email_id, label_id),
    FOREIGN KEY (email_id) REFERENCES emails(id) ON DELETE CASCADE,
    FOREIGN KEY (label_id) REFERENCES email_labels(id) ON DELETE CASCADE
);

-- 会话表（邮件线程）
CREATE TABLE conversations (
    id INT PRIMARY KEY AUTO_INCREMENT,
    subject VARCHAR(500),
    participant_count INT DEFAULT 0,
    last_message_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 邮件与会话关联表
CREATE TABLE email_conversations (
    email_id INT NOT NULL,
    conversation_id INT NOT NULL,
    PRIMARY KEY (email_id, conversation_id),
    FOREIGN KEY (email_id) REFERENCES emails(id) ON DELETE CASCADE,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
);

-- 系统设置表
CREATE TABLE system_settings (
    setting_key VARCHAR(100) PRIMARY KEY,
    setting_value TEXT,
    description TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 用户会话表（登录令牌）
CREATE TABLE user_sessions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_address VARCHAR(45),
    user_agent TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_token (token),
    INDEX idx_expires_at (expires_at)
);

-- 插入默认域名
INSERT INTO domains (domain_name, is_active, mx_record) VALUES 
('example.com', TRUE, 'mail.example.com'),
('company.org', TRUE, 'mail.company.org');

-- 插入默认系统设置
INSERT INTO system_settings (setting_key, setting_value, description) VALUES 
('smtp_host', 'localhost', 'SMTP服务器地址'),
('smtp_port', '587', 'SMTP服务器端口'),
('imap_host', 'localhost', 'IMAP服务器地址'),
('imap_port', '993', 'IMAP服务器端口'),
('max_attachment_size', '26214400', '最大附件大小（字节），默认25MB'),
('default_quota', '1073741824', '默认用户存储配额（字节），默认1GB');

-- 创建索引以优化查询性能
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_aliases_user_id ON aliases(user_id);
CREATE INDEX idx_aliases_full_email ON aliases(full_email);
CREATE INDEX idx_emails_alias_id ON emails(alias_id);
CREATE INDEX idx_emails_folder ON emails(folder);
CREATE INDEX idx_emails_is_read ON emails(is_read);
CREATE INDEX idx_emails_created_at_desc ON emails(created_at DESC);