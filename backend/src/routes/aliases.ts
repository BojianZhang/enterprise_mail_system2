import { Router } from 'express';
import { body, param, validationResult } from 'express-validator';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { AliasService } from '../services/aliasService';

const router = Router();
const aliasService = new AliasService();

// 获取用户的所有别名
router.get('/', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const aliases = await aliasService.getUserAliases(req.user.id);
    
    res.json({
      success: true,
      data: { aliases }
    });
  } catch (error) {
    console.error('获取别名列表错误:', error);
    res.status(500).json({
      success: false,
      error: '内部服务器错误'
    });
  }
});

// 获取可用域名
router.get('/domains', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const domains = await aliasService.getAvailableDomains();
    
    res.json({
      success: true,
      data: { domains }
    });
  } catch (error) {
    console.error('获取域名列表错误:', error);
    res.status(500).json({
      success: false,
      error: '内部服务器错误'
    });
  }
});

// 创建新别名
router.post('/', [
  authenticateToken,
  body('alias_name').notEmpty().trim().matches(/^[a-zA-Z0-9._-]+$/),
  body('domain_id').isInt({ min: 1 }),
  body('display_name').optional().trim()
], async (req: AuthenticatedRequest, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: '输入验证失败',
        details: errors.array()
      });
    }

    const { alias_name, domain_id, display_name } = req.body;

    const alias = await aliasService.createAlias(
      req.user.id,
      domain_id,
      alias_name,
      display_name
    );

    res.status(201).json({
      success: true,
      data: { alias },
      message: '别名创建成功'
    });
  } catch (error) {
    console.error('创建别名错误:', error);
    
    if (error instanceof Error && error.message.includes('已存在')) {
      return res.status(409).json({
        success: false,
        error: error.message
      });
    }

    res.status(500).json({
      success: false,
      error: '内部服务器错误'
    });
  }
});

// 更新别名
router.put('/:id', [
  authenticateToken,
  param('id').isInt({ min: 1 }),
  body('display_name').optional().trim()
], async (req: AuthenticatedRequest, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: '输入验证失败',
        details: errors.array()
      });
    }

    const aliasId = parseInt(req.params.id);
    const { display_name } = req.body;

    const alias = await aliasService.updateAlias(req.user.id, aliasId, display_name);
    
    if (!alias) {
      return res.status(404).json({
        success: false,
        error: '别名未找到'
      });
    }

    res.json({
      success: true,
      data: { alias },
      message: '别名更新成功'
    });
  } catch (error) {
    console.error('更新别名错误:', error);
    res.status(500).json({
      success: false,
      error: '内部服务器错误'
    });
  }
});

// 设置主要别名
router.put('/:id/primary', [
  authenticateToken,
  param('id').isInt({ min: 1 })
], async (req: AuthenticatedRequest, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: '输入验证失败',
        details: errors.array()
      });
    }

    const aliasId = parseInt(req.params.id);

    const success = await aliasService.setPrimaryAlias(aliasId, req.user.id);
    
    if (!success) {
      return res.status(404).json({
        success: false,
        error: '别名未找到'
      });
    }

    res.json({
      success: true,
      message: '主要别名设置成功'
    });
  } catch (error) {
    console.error('设置主要别名错误:', error);
    res.status(500).json({
      success: false,
      error: '内部服务器错误'
    });
  }
});

// 删除别名
router.delete('/:id', [
  authenticateToken,
  param('id').isInt({ min: 1 })
], async (req: AuthenticatedRequest, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: '输入验证失败',
        details: errors.array()
      });
    }

    const aliasId = parseInt(req.params.id);

    const success = await aliasService.deleteAlias(aliasId, req.user.id);
    
    if (!success) {
      return res.status(404).json({
        success: false,
        error: '别名未找到'
      });
    }

    res.json({
      success: true,
      message: '别名删除成功'
    });
  } catch (error) {
    console.error('删除别名错误:', error);
    
    if (error instanceof Error && error.message.includes('主要别名')) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }

    res.status(500).json({
      success: false,
      error: '内部服务器错误'
    });
  }
});

export default router;