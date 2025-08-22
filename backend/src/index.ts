import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import authRoutes from './routes/auth';
import aliasRoutes from './routes/aliases';
import emailRoutes from './routes/emails';
import domainRoutes from './routes/domains';
import { ImapService } from './services/imapService';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3001',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 路由
app.use('/api/auth', authRoutes);
app.use('/api/aliases', aliasRoutes);
app.use('/api/emails', emailRoutes);
app.use('/api/domains', domainRoutes);

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Enterprise Mail System API is running',
    timestamp: new Date().toISOString()
  });
});

// 404处理
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'API端点未找到'
  });
});

// 全局错误处理
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('未处理的错误:', error);
  res.status(500).json({
    success: false,
    error: '内部服务器错误'
  });
});

// 启动邮件同步服务
const imapService = new ImapService();
if (process.env.ENABLE_EMAIL_SYNC !== 'false') {
  imapService.startEmailSync(parseInt(process.env.EMAIL_SYNC_INTERVAL || '60000'))
    .then(() => {
      console.log('📧 邮件同步服务已启动');
    })
    .catch((error) => {
      console.error('邮件同步服务启动失败:', error);
    });
}

app.listen(PORT, () => {
  console.log(`🚀 企业邮件系统API服务器运行在端口 ${PORT}`);
  console.log(`📧 API文档: http://localhost:${PORT}/api/health`);
  console.log(`🌐 前端地址: ${process.env.FRONTEND_URL || 'http://localhost:3001'}`);
});

export default app;