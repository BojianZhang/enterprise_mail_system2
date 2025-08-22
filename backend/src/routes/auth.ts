import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { AuthService } from '../services/authService';

const router = Router();
const authService = new AuthService();

// 用户注册
router.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('name').notEmpty().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: '输入验证失败',
        details: errors.array()
      });
    }

    const { email, password, name } = req.body;

    // 检查用户是否已存在
    const existingUser = await authService.getUserByEmail(email);
    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: '用户已存在'
      });
    }

    const user = await authService.createUser(email, password, name);
    
    // 移除密码哈希值
    const { password_hash, ...userWithoutPassword } = user;

    res.status(201).json({
      success: true,
      data: { user: userWithoutPassword },
      message: '用户注册成功'
    });
  } catch (error) {
    console.error('注册错误:', error);
    res.status(500).json({
      success: false,
      error: '内部服务器错误'
    });
  }
});

// 用户登录
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: '输入验证失败',
        details: errors.array()
      });
    }

    const { email, password } = req.body;
    const ipAddress = req.ip;
    const userAgent = req.get('User-Agent');

    const result = await authService.login(email, password, ipAddress, userAgent);
    
    if (!result) {
      return res.status(401).json({
        success: false,
        error: '邮箱或密码错误'
      });
    }

    // 移除密码哈希值
    const { password_hash, ...userWithoutPassword } = result.user;

    res.json({
      success: true,
      data: {
        user: userWithoutPassword,
        token: result.token
      },
      message: '登录成功'
    });
  } catch (error) {
    console.error('登录错误:', error);
    res.status(500).json({
      success: false,
      error: '内部服务器错误'
    });
  }
});

// 用户登出
router.post('/logout', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      await authService.logout(token);
    }

    res.json({
      success: true,
      message: '登出成功'
    });
  } catch (error) {
    console.error('登出错误:', error);
    res.status(500).json({
      success: false,
      error: '内部服务器错误'
    });
  }
});

// 验证令牌
router.get('/verify', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        error: '访问令牌缺失'
      });
    }

    const user = await authService.validateSession(token);
    if (!user) {
      return res.status(403).json({
        success: false,
        error: '无效或已过期的令牌'
      });
    }

    // 移除密码哈希值
    const { password_hash, ...userWithoutPassword } = user;

    res.json({
      success: true,
      data: { user: userWithoutPassword }
    });
  } catch (error) {
    console.error('令牌验证错误:', error);
    res.status(500).json({
      success: false,
      error: '内部服务器错误'
    });
  }
});

export default router;