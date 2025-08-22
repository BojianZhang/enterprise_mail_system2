#!/bin/bash

# 企业邮件系统部署脚本

set -e

echo "🚀 开始部署企业邮件系统..."

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查是否为root用户
if [[ $EUID -eq 0 ]]; then
   echo -e "${RED}请不要使用root用户运行此脚本${NC}"
   exit 1
fi

# 检查必要的命令
check_command() {
    if ! command -v $1 &> /dev/null; then
        echo -e "${RED}错误: $1 未安装${NC}"
        exit 1
    fi
}

echo "📋 检查系统依赖..."
check_command "node"
check_command "npm"
check_command "mysql"
check_command "git"

# 检查Node.js版本
NODE_VERSION=$(node -v | cut -d'v' -f2)
REQUIRED_VERSION="16.0.0"

if [ "$(printf '%s\n' "$REQUIRED_VERSION" "$NODE_VERSION" | sort -V | head -n1)" != "$REQUIRED_VERSION" ]; then 
    echo -e "${RED}错误: 需要 Node.js >= $REQUIRED_VERSION，当前版本: $NODE_VERSION${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Node.js 版本检查通过: $NODE_VERSION${NC}"

# 设置环境变量
read -p "请输入MySQL root密码: " -s MYSQL_ROOT_PASSWORD
echo
read -p "请输入要创建的MySQL用户名 [mailuser]: " MYSQL_USER
MYSQL_USER=${MYSQL_USER:-mailuser}
read -p "请输入MySQL用户密码: " -s MYSQL_PASSWORD
echo
read -p "请输入JWT密钥 (留空将自动生成): " JWT_SECRET
if [ -z "$JWT_SECRET" ]; then
    JWT_SECRET=$(openssl rand -hex 32)
fi
read -p "请输入邮件域名 [example.com]: " MAIL_DOMAIN
MAIL_DOMAIN=${MAIL_DOMAIN:-example.com}

# 创建数据库
echo "🗄️  设置数据库..."
mysql -u root -p$MYSQL_ROOT_PASSWORD -e "
CREATE DATABASE IF NOT EXISTS enterprise_mail;
CREATE USER IF NOT EXISTS '$MYSQL_USER'@'localhost' IDENTIFIED BY '$MYSQL_PASSWORD';
GRANT ALL PRIVILEGES ON enterprise_mail.* TO '$MYSQL_USER'@'localhost';
FLUSH PRIVILEGES;
"

# 导入数据库结构
mysql -u root -p$MYSQL_ROOT_PASSWORD enterprise_mail < database/schema.sql
echo -e "${GREEN}✅ 数据库设置完成${NC}"

# 安装依赖
echo "📦 安装项目依赖..."
npm run install:all

# 配置后端环境变量
echo "⚙️  配置后端环境..."
cat > backend/.env << EOF
# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_USER=$MYSQL_USER
DB_PASSWORD=$MYSQL_PASSWORD
DB_NAME=enterprise_mail

# JWT配置
JWT_SECRET=$JWT_SECRET
JWT_EXPIRES_IN=24h

# 服务器配置
PORT=3000
NODE_ENV=production

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

# 系统配置
DEFAULT_STORAGE_QUOTA=1073741824
ADMIN_EMAIL=admin@$MAIL_DOMAIN

# 前端URL
FRONTEND_URL=http://localhost
EOF

# 配置前端环境变量
echo "⚙️  配置前端环境..."
cat > frontend/.env << EOF
REACT_APP_API_URL=http://localhost:3000/api
EOF

# 构建项目
echo "🔨 构建项目..."
npm run build:all
echo -e "${GREEN}✅ 项目构建完成${NC}"

# 创建上传目录
mkdir -p backend/uploads
chmod 755 backend/uploads

# 安装PM2 (如果未安装)
if ! command -v pm2 &> /dev/null; then
    echo "📦 安装PM2进程管理器..."
    npm install -g pm2
fi

# 创建PM2配置文件
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'enterprise-mail-api',
    cwd: './backend',
    script: 'dist/index.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production'
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
EOF

# 创建日志目录
mkdir -p logs

# 使用PM2启动后端
echo "🚀 启动后端服务..."
pm2 start ecosystem.config.js
pm2 save
pm2 startup

echo -e "${GREEN}✅ 后端服务启动完成${NC}"

# 安装和配置Nginx (可选)
read -p "是否要安装和配置Nginx? (y/n): " INSTALL_NGINX
if [[ $INSTALL_NGINX =~ ^[Yy]$ ]]; then
    echo "📦 安装Nginx..."
    
    # 检查系统类型
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        if command -v apt-get &> /dev/null; then
            sudo apt-get update
            sudo apt-get install -y nginx
        elif command -v yum &> /dev/null; then
            sudo yum install -y nginx
        fi
    fi

    # 创建Nginx配置
    NGINX_CONFIG="/etc/nginx/sites-available/enterprise-mail"
    sudo tee $NGINX_CONFIG > /dev/null << EOF
server {
    listen 80;
    server_name $MAIL_DOMAIN;
    
    root $(pwd)/frontend/build;
    index index.html index.htm;

    # 前端静态文件
    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # API代理
    location /api {
        proxy_pass http://localhost:3000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # 静态资源缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)\$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOF

    # 启用站点
    sudo ln -sf $NGINX_CONFIG /etc/nginx/sites-enabled/
    sudo rm -f /etc/nginx/sites-enabled/default
    
    # 测试Nginx配置
    sudo nginx -t
    
    # 重启Nginx
    sudo systemctl restart nginx
    sudo systemctl enable nginx
    
    echo -e "${GREEN}✅ Nginx配置完成${NC}"
fi

# 输出完成信息
echo
echo -e "${GREEN}🎉 部署完成!${NC}"
echo
echo "📋 部署信息:"
echo "  - 前端地址: http://$MAIL_DOMAIN (如果配置了Nginx) 或 http://localhost:3001"
echo "  - 后端API: http://localhost:3000/api/health"
echo "  - 数据库: enterprise_mail"
echo "  - PM2状态: pm2 status"
echo "  - 日志查看: pm2 logs enterprise-mail-api"
echo
echo "📧 邮件服务器配置:"
echo "  - SMTP端口: 587"
echo "  - IMAP端口: 993" 
echo "  - 域名: $MAIL_DOMAIN"
echo
echo "🔧 管理命令:"
echo "  - 停止服务: pm2 stop enterprise-mail-api"
echo "  - 重启服务: pm2 restart enterprise-mail-api"
echo "  - 查看日志: pm2 logs"
echo
echo -e "${YELLOW}⚠️  下一步:${NC}"
echo "1. 配置DNS记录指向此服务器"
echo "2. 配置SSL证书 (建议使用Let's Encrypt)"
echo "3. 设置邮件服务器 (Postfix + Dovecot)"
echo "4. 创建管理员账户并登录系统"
echo

exit 0