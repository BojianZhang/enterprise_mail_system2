import { Router } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { EmailService } from '../services/emailService';

const router = Router();
const emailService = new EmailService();

// 获取邮件列表
router.get('/', [
  authenticateToken,
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('folder').optional().isIn(['inbox', 'sent', 'drafts', 'trash', 'spam']),
  query('alias_id').optional().isInt({ min: 1 }).toInt(),
  query('sort_by').optional().isIn(['created_at', 'subject', 'from_email']),
  query('sort_order').optional().isIn(['ASC', 'DESC'])
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

    const {
      page = 1,
      limit = 20,
      folder = 'inbox',
      alias_id,
      sort_by = 'created_at',
      sort_order = 'DESC'
    } = req.query;

    const result = await emailService.getEmailsForUser(req.user.id, {
      page: page as number,
      limit: limit as number,
      sortBy: sort_by as string,
      sortOrder: sort_order as 'ASC' | 'DESC',
      folder: folder as string,
      aliasId: alias_id as number
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('获取邮件列表错误:', error);
    res.status(500).json({
      success: false,
      error: '内部服务器错误'
    });
  }
});

// 搜索邮件
router.get('/search', [
  authenticateToken,
  query('q').notEmpty().trim(),
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt()
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

    const { q, page = 1, limit = 20 } = req.query;

    const result = await emailService.searchEmails(req.user.id, q as string, {
      page: page as number,
      limit: limit as number
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('搜索邮件错误:', error);
    res.status(500).json({
      success: false,
      error: '内部服务器错误'
    });
  }
});

// 获取单个邮件详情
router.get('/:id', [
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

    const emailId = parseInt(req.params.id);
    const email = await emailService.getEmailById(emailId, req.user.id);

    if (!email) {
      return res.status(404).json({
        success: false,
        error: '邮件未找到'
      });
    }

    // 自动标记为已读
    if (!email.is_read) {
      await emailService.markAsRead(emailId, req.user.id);
      email.is_read = true;
    }

    res.json({
      success: true,
      data: { email }
    });
  } catch (error) {
    console.error('获取邮件详情错误:', error);
    res.status(500).json({
      success: false,
      error: '内部服务器错误'
    });
  }
});

// 发送邮件
router.post('/', [
  authenticateToken,
  body('alias_id').isInt({ min: 1 }),
  body('to').isArray().notEmpty(),
  body('to.*').isEmail(),
  body('subject').notEmpty().trim(),
  body('body_text').optional().trim(),
  body('body_html').optional().trim(),
  body('cc').optional().isArray(),
  body('cc.*').optional().isEmail(),
  body('bcc').optional().isArray(),
  body('bcc.*').optional().isEmail()
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

    const {
      alias_id,
      to,
      subject,
      body_text,
      body_html,
      cc,
      bcc
    } = req.body;

    if (!body_text && !body_html) {
      return res.status(400).json({
        success: false,
        error: '邮件内容不能为空'
      });
    }

    const email = await emailService.sendEmail(
      req.user.id,
      alias_id,
      to,
      subject,
      body_text,
      body_html,
      cc,
      bcc
    );

    res.status(201).json({
      success: true,
      data: { email },
      message: '邮件发送成功'
    });
  } catch (error) {
    console.error('发送邮件错误:', error);
    
    if (error instanceof Error) {
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

// 标记邮件为已读/未读
router.put('/:id/read', [
  authenticateToken,
  param('id').isInt({ min: 1 }),
  body('is_read').isBoolean()
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

    const emailId = parseInt(req.params.id);
    const { is_read } = req.body;

    const success = is_read 
      ? await emailService.markAsRead(emailId, req.user.id)
      : await emailService.markAsUnread(emailId, req.user.id);

    if (!success) {
      return res.status(404).json({
        success: false,
        error: '邮件未找到'
      });
    }

    res.json({
      success: true,
      message: `邮件已标记为${is_read ? '已读' : '未读'}`
    });
  } catch (error) {
    console.error('更新邮件读取状态错误:', error);
    res.status(500).json({
      success: false,
      error: '内部服务器错误'
    });
  }
});

// 标记/取消标记邮件星标
router.put('/:id/star', [
  authenticateToken,
  param('id').isInt({ min: 1 }),
  body('is_starred').isBoolean()
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

    const emailId = parseInt(req.params.id);
    const { is_starred } = req.body;

    const success = is_starred
      ? await emailService.starEmail(emailId, req.user.id)
      : await emailService.unstarEmail(emailId, req.user.id);

    if (!success) {
      return res.status(404).json({
        success: false,
        error: '邮件未找到'
      });
    }

    res.json({
      success: true,
      message: `邮件星标${is_starred ? '已添加' : '已移除'}`
    });
  } catch (error) {
    console.error('更新邮件星标状态错误:', error);
    res.status(500).json({
      success: false,
      error: '内部服务器错误'
    });
  }
});

// 移动邮件到文件夹
router.put('/:id/folder', [
  authenticateToken,
  param('id').isInt({ min: 1 }),
  body('folder').isIn(['inbox', 'sent', 'drafts', 'trash', 'spam'])
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

    const emailId = parseInt(req.params.id);
    const { folder } = req.body;

    const success = await emailService.moveToFolder(emailId, req.user.id, folder);

    if (!success) {
      return res.status(404).json({
        success: false,
        error: '邮件未找到'
      });
    }

    res.json({
      success: true,
      message: `邮件已移动到${folder}`
    });
  } catch (error) {
    console.error('移动邮件错误:', error);
    res.status(500).json({
      success: false,
      error: '内部服务器错误'
    });
  }
});

// 删除邮件
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

    const emailId = parseInt(req.params.id);

    const success = await emailService.deleteEmail(emailId, req.user.id);

    if (!success) {
      return res.status(404).json({
        success: false,
        error: '邮件未找到'
      });
    }

    res.json({
      success: true,
      message: '邮件删除成功'
    });
  } catch (error) {
    console.error('删除邮件错误:', error);
    res.status(500).json({
      success: false,
      error: '内部服务器错误'
    });
  }
});

export default router;