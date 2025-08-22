import { Router } from 'express';
import { body, param, validationResult } from 'express-validator';
import { authenticateToken, requireAdmin, AuthenticatedRequest } from '../middleware/auth';
import { DomainService } from '../services/domainService';

const router = Router();
const domainService = new DomainService();

// 获取所有域名 (管理员)
router.get('/', [
  authenticateToken,
  requireAdmin
], async (req: AuthenticatedRequest, res) => {
  try {
    const domains = await domainService.getDomains();
    
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

// 获取活跃域名 (普通用户)
router.get('/active', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const domains = await domainService.getActiveDomains();
    
    res.json({
      success: true,
      data: { domains }
    });
  } catch (error) {
    console.error('获取活跃域名错误:', error);
    res.status(500).json({
      success: false,
      error: '内部服务器错误'
    });
  }
});

// 获取单个域名详情
router.get('/:id', [
  authenticateToken,
  requireAdmin,
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

    const domainId = parseInt(req.params.id);
    const domainStats = await domainService.getDomainStats(domainId);

    if (!domainStats) {
      return res.status(404).json({
        success: false,
        error: '域名未找到'
      });
    }

    res.json({
      success: true,
      data: domainStats
    });
  } catch (error) {
    console.error('获取域名详情错误:', error);
    res.status(500).json({
      success: false,
      error: '内部服务器错误'
    });
  }
});

// 创建新域名
router.post('/', [
  authenticateToken,
  requireAdmin,
  body('domain_name').notEmpty().trim().matches(/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/),
  body('mx_record').optional().trim(),
  body('spf_record').optional().trim()
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

    const { domain_name, mx_record, spf_record } = req.body;

    const domain = await domainService.createDomain(
      domain_name,
      mx_record,
      spf_record
    );

    res.status(201).json({
      success: true,
      data: { domain },
      message: '域名创建成功'
    });
  } catch (error) {
    console.error('创建域名错误:', error);
    
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

// 更新域名
router.put('/:id', [
  authenticateToken,
  requireAdmin,
  param('id').isInt({ min: 1 }),
  body('domain_name').optional().trim().matches(/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/),
  body('mx_record').optional().trim(),
  body('spf_record').optional().trim(),
  body('is_active').optional().isBoolean()
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

    const domainId = parseInt(req.params.id);
    const updates = req.body;

    const domain = await domainService.updateDomain(domainId, updates);
    
    if (!domain) {
      return res.status(404).json({
        success: false,
        error: '域名未找到'
      });
    }

    res.json({
      success: true,
      data: { domain },
      message: '域名更新成功'
    });
  } catch (error) {
    console.error('更新域名错误:', error);
    
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

// 删除域名
router.delete('/:id', [
  authenticateToken,
  requireAdmin,
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

    const domainId = parseInt(req.params.id);

    const success = await domainService.deleteDomain(domainId);
    
    if (!success) {
      return res.status(404).json({
        success: false,
        error: '域名未找到'
      });
    }

    res.json({
      success: true,
      message: '域名删除成功'
    });
  } catch (error) {
    console.error('删除域名错误:', error);
    
    if (error instanceof Error && error.message.includes('仍有活跃的别名')) {
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

// 获取DNS记录
router.get('/:domain/dns', [
  authenticateToken,
  requireAdmin,
  param('domain').notEmpty().trim()
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

    const domainName = req.params.domain;
    const dnsRecords = await domainService.generateDNSRecords(domainName);

    res.json({
      success: true,
      data: { dns_records: dnsRecords }
    });
  } catch (error) {
    console.error('获取DNS记录错误:', error);
    
    if (error instanceof Error && error.message.includes('不存在')) {
      return res.status(404).json({
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