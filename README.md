# 企业级邮件收发系统

一个类似于poste.io的现代化企业级邮件管理系统，支持多域名、多别名、邮件收发和管理功能。

## ✨ 功能特性

### 🔐 用户管理
- 用户注册和登录
- JWT令牌认证
- 用户会话管理
- 多别名支持

### 📧 邮件功能
- **多别名支持**: 一个账户可以拥有多个邮箱别名
- **多域名支持**: 支持管理多个邮件域名
- **邮件收发**: 完整的邮件发送和接收功能
- **邮件管理**: 收件箱、发件箱、草稿箱、垃圾箱等文件夹
- **邮件搜索**: 支持全文搜索邮件内容
- **附件支持**: 邮件附件上传和下载
- **星标邮件**: 重要邮件标记功能

### 👤 别名管理
- **别名创建**: 为任意域名创建邮箱别名
- **别名配置**: 自定义别名显示名称
- **主要别名**: 设置主要发送别名
- **别名切换**: 在不同别名间轻松切换查看邮件

### 🌐 域名管理
- **域名添加**: 添加和管理多个邮件域名
- **DNS配置**: 自动生成MX、SPF、DKIM、DMARC记录
- **域名统计**: 查看域名下的别名和邮件统计

### 🔧 技术特性
- **现代化UI**: 基于React + TypeScript + Tailwind CSS
- **RESTful API**: Node.js + Express + TypeScript后端
- **数据库**: MySQL数据库存储
- **邮件服务**: SMTP/IMAP协议支持
- **响应式设计**: 支持桌面和移动设备

## 🏗️ 技术栈

### 后端
- **Node.js** - JavaScript运行环境
- **Express.js** - Web框架
- **TypeScript** - 类型安全
- **MySQL** - 数据库
- **JWT** - 身份认证
- **Nodemailer** - 邮件发送
- **IMAP** - 邮件接收
- **bcrypt** - 密码加密

### 前端
- **React 18** - UI框架
- **TypeScript** - 类型安全
- **Tailwind CSS** - 样式框架
- **React Router** - 路由管理
- **React Hook Form** - 表单管理
- **Axios** - HTTP客户端
- **Headless UI** - 无头组件

## 📦 项目结构

```
enterprise_mail_system/
├── backend/                 # 后端API服务
│   ├── src/
│   │   ├── config/         # 配置文件
│   │   ├── middleware/     # 中间件
│   │   ├── routes/         # 路由定义
│   │   ├── services/       # 业务逻辑
│   │   ├── types/          # TypeScript类型
│   │   └── index.ts        # 入口文件
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
├── frontend/               # 前端Web应用
│   ├── src/
│   │   ├── components/     # React组件
│   │   ├── contexts/       # React上下文
│   │   ├── pages/          # 页面组件
│   │   ├── services/       # API服务
│   │   ├── types/          # TypeScript类型
│   │   └── App.tsx         # 根组件
│   ├── public/
│   ├── package.json
│   └── tailwind.config.js
└── database/
    └── schema.sql          # 数据库结构
```

## 🚀 快速开始

### 1. 环境要求
- Node.js >= 16.x
- MySQL >= 8.0
- npm 或 yarn

### 2. 克隆项目
```bash
git clone <repository-url>
cd enterprise_mail_system
```

### 3. 数据库设置
```bash
# 创建数据库
mysql -u root -p
CREATE DATABASE enterprise_mail;

# 导入数据库结构
mysql -u root -p enterprise_mail < database/schema.sql
```

### 4. 后端设置
```bash
cd backend

# 安装依赖
npm install

# 配置环境变量
cp .env.example .env
# 编辑.env文件，设置数据库连接和其他配置

# 启动开发服务器
npm run dev
```

### 5. 前端设置
```bash
cd frontend

# 安装依赖
npm install

# 启动开发服务器
npm start
```

### 6. 访问应用
- 前端: http://localhost:3001
- 后端API: http://localhost:3000/api/health

## ⚙️ 配置说明

### 后端环境变量 (.env)
```bash
# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=enterprise_mail

# JWT配置
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=24h

# 服务器配置
PORT=3000
NODE_ENV=development

# 邮件服务器配置
SMTP_HOST=localhost
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=
SMTP_PASS=

IMAP_HOST=localhost
IMAP_PORT=993
IMAP_SECURE=true

# 邮件同步配置
ENABLE_EMAIL_SYNC=true
EMAIL_SYNC_INTERVAL=60000

# 文件上传配置
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=26214400

# 前端URL
FRONTEND_URL=http://localhost:3001
```

### 前端环境变量 (.env)
```bash
REACT_APP_API_URL=http://localhost:3000/api
```

## 📝 API文档

### 认证接口
- `POST /api/auth/login` - 用户登录
- `POST /api/auth/register` - 用户注册
- `POST /api/auth/logout` - 用户登出
- `GET /api/auth/verify` - 验证令牌

### 别名管理
- `GET /api/aliases` - 获取用户别名列表
- `POST /api/aliases` - 创建新别名
- `PUT /api/aliases/:id` - 更新别名信息
- `DELETE /api/aliases/:id` - 删除别名
- `PUT /api/aliases/:id/primary` - 设置主要别名

### 邮件管理
- `GET /api/emails` - 获取邮件列表
- `GET /api/emails/:id` - 获取邮件详情
- `POST /api/emails` - 发送邮件
- `GET /api/emails/search` - 搜索邮件
- `PUT /api/emails/:id/read` - 标记已读/未读
- `PUT /api/emails/:id/star` - 星标邮件
- `PUT /api/emails/:id/folder` - 移动到文件夹
- `DELETE /api/emails/:id` - 删除邮件

### 域名管理 (管理员)
- `GET /api/domains` - 获取所有域名
- `GET /api/domains/active` - 获取活跃域名
- `POST /api/domains` - 创建域名
- `PUT /api/domains/:id` - 更新域名
- `DELETE /api/domains/:id` - 删除域名
- `GET /api/domains/:domain/dns` - 获取DNS配置

## 🔧 部署指南

### Docker部署 (推荐)
```bash
# 构建镜像
docker-compose build

# 启动服务
docker-compose up -d
```

### 手动部署
1. 构建前端
```bash
cd frontend
npm run build
```

2. 构建后端
```bash
cd backend
npm run build
```

3. 使用PM2部署
```bash
npm install -g pm2
pm2 start dist/index.js --name "enterprise-mail-api"
```

### Nginx配置
```nginx
server {
    listen 80;
    server_name your-domain.com;

    # 前端静态文件
    location / {
        root /path/to/frontend/build;
        try_files $uri $uri/ /index.html;
    }

    # API代理
    location /api {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## 📧 邮件服务器配置

### Postfix (SMTP)
```bash
# 安装Postfix
sudo apt-get install postfix

# 配置/etc/postfix/main.cf
myhostname = mail.yourdomain.com
mydomain = yourdomain.com
myorigin = $mydomain
inet_interfaces = all
mydestination = $myhostname, localhost.$mydomain, localhost, $mydomain
```

### Dovecot (IMAP)
```bash
# 安装Dovecot
sudo apt-get install dovecot-imapd dovecot-pop3d

# 基本配置
sudo nano /etc/dovecot/dovecot.conf
```

## 🤝 贡献指南

1. Fork 项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🐛 问题反馈

如果你发现任何问题或有改进建议，请在 [Issues](issues) 页面提交。

## ⭐ 致谢

感谢所有为这个项目做出贡献的开发者和测试者。