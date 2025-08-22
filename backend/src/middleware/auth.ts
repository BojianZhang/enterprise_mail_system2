import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/authService';

const authService = new AuthService();

export interface AuthenticatedRequest extends Request {
  user?: any;
}

export const authenticateToken = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, error: '访问令牌缺失' });
  }

  try {
    const user = await authService.validateSession(token);
    if (!user) {
      return res.status(403).json({ success: false, error: '无效或已过期的令牌' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('令牌验证错误:', error);
    return res.status(403).json({ success: false, error: '令牌验证失败' });
  }
};

export const requireAdmin = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user || !req.user.is_admin) {
    return res.status(403).json({ success: false, error: '需要管理员权限' });
  }
  next();
};