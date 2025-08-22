import nodemailer from 'nodemailer';
import { v4 as uuidv4 } from 'uuid';
import database from '../config/database';
import { Email, Alias, PaginationParams, EmailListResponse } from '../types';
import { AliasService } from './aliasService';

export class EmailService {
  private aliasService: AliasService;
  private transporter: nodemailer.Transporter;

  constructor() {
    this.aliasService = new AliasService();
    
    // 配置SMTP传输器
    this.transporter = nodemailer.createTransporter({
      host: process.env.SMTP_HOST || 'localhost',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: process.env.SMTP_USER ? {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      } : undefined
    });
  }

  async getEmailsForUser(userId: number, params: PaginationParams & { folder?: string; aliasId?: number }): Promise<EmailListResponse> {
    const { page, limit, sortBy = 'created_at', sortOrder = 'DESC', folder = 'inbox', aliasId } = params;
    const offset = (page - 1) * limit;

    // 构建查询条件
    let whereClause = 'WHERE a.user_id = ? AND e.is_deleted = false';
    const queryParams: any[] = [userId];

    if (folder) {
      whereClause += ' AND e.folder = ?';
      queryParams.push(folder);
    }

    if (aliasId) {
      whereClause += ' AND e.alias_id = ?';
      queryParams.push(aliasId);
    }

    // 获取邮件总数
    const countQuery = `
      SELECT COUNT(*) as total
      FROM emails e
      JOIN aliases a ON e.alias_id = a.id
      ${whereClause}
    `;
    const countResult = await database.query(countQuery, queryParams);
    const total = countResult[0].total;

    // 获取邮件列表
    const emailsQuery = `
      SELECT e.*, a.full_email as alias_email, a.display_name as alias_display_name
      FROM emails e
      JOIN aliases a ON e.alias_id = a.id
      ${whereClause}
      ORDER BY e.${sortBy} ${sortOrder}
      LIMIT ? OFFSET ?
    `;
    
    queryParams.push(limit, offset);
    const emails = await database.query(emailsQuery, queryParams);

    return {
      emails,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  async getEmailById(emailId: number, userId: number): Promise<Email | null> {
    const query = `
      SELECT e.*, a.full_email as alias_email, a.display_name as alias_display_name
      FROM emails e
      JOIN aliases a ON e.alias_id = a.id
      WHERE e.id = ? AND a.user_id = ?
    `;

    const emails = await database.query(query, [emailId, userId]);
    return emails.length > 0 ? emails[0] : null;
  }

  async sendEmail(
    userId: number,
    aliasId: number,
    to: string[],
    subject: string,
    bodyText?: string,
    bodyHtml?: string,
    cc?: string[],
    bcc?: string[]
  ): Promise<Email> {
    // 验证别名是否属于当前用户
    const alias = await this.aliasService.getAliasById(aliasId, userId);
    if (!alias) {
      throw new Error('别名不存在或无权限');
    }

    const messageId = `<${uuidv4()}@${alias.full_email.split('@')[1]}>`;

    // 发送邮件
    const mailOptions = {
      from: `${alias.display_name || alias.alias_name} <${alias.full_email}>`,
      to: to.join(', '),
      cc: cc?.join(', '),
      bcc: bcc?.join(', '),
      subject,
      text: bodyText,
      html: bodyHtml,
      messageId
    };

    try {
      await this.transporter.sendMail(mailOptions);
    } catch (error) {
      console.error('发送邮件失败:', error);
      throw new Error('邮件发送失败');
    }

    // 保存到发件箱
    const emailData = {
      message_id: messageId,
      alias_id: aliasId,
      from_email: alias.full_email,
      from_name: alias.display_name || alias.alias_name,
      to_emails: to,
      cc_emails: cc || null,
      bcc_emails: bcc || null,
      subject,
      body_text: bodyText,
      body_html: bodyHtml,
      folder: 'sent',
      size: Buffer.byteLength(bodyText || bodyHtml || '', 'utf8')
    };

    const result = await database.query(
      `INSERT INTO emails (message_id, alias_id, from_email, from_name, to_emails, cc_emails, bcc_emails, subject, body_text, body_html, folder, size)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        emailData.message_id,
        emailData.alias_id,
        emailData.from_email,
        emailData.from_name,
        JSON.stringify(emailData.to_emails),
        emailData.cc_emails ? JSON.stringify(emailData.cc_emails) : null,
        emailData.bcc_emails ? JSON.stringify(emailData.bcc_emails) : null,
        emailData.subject,
        emailData.body_text,
        emailData.body_html,
        emailData.folder,
        emailData.size
      ]
    );

    return this.getEmailById(result.insertId, userId) as Promise<Email>;
  }

  async markAsRead(emailId: number, userId: number): Promise<boolean> {
    const email = await this.getEmailById(emailId, userId);
    if (!email) {
      return false;
    }

    await database.query(
      'UPDATE emails SET is_read = true WHERE id = ?',
      [emailId]
    );

    return true;
  }

  async markAsUnread(emailId: number, userId: number): Promise<boolean> {
    const email = await this.getEmailById(emailId, userId);
    if (!email) {
      return false;
    }

    await database.query(
      'UPDATE emails SET is_read = false WHERE id = ?',
      [emailId]
    );

    return true;
  }

  async starEmail(emailId: number, userId: number): Promise<boolean> {
    const email = await this.getEmailById(emailId, userId);
    if (!email) {
      return false;
    }

    await database.query(
      'UPDATE emails SET is_starred = true WHERE id = ?',
      [emailId]
    );

    return true;
  }

  async unstarEmail(emailId: number, userId: number): Promise<boolean> {
    const email = await this.getEmailById(emailId, userId);
    if (!email) {
      return false;
    }

    await database.query(
      'UPDATE emails SET is_starred = false WHERE id = ?',
      [emailId]
    );

    return true;
  }

  async moveToFolder(emailId: number, userId: number, folder: string): Promise<boolean> {
    const email = await this.getEmailById(emailId, userId);
    if (!email) {
      return false;
    }

    const validFolders = ['inbox', 'sent', 'drafts', 'trash', 'spam'];
    if (!validFolders.includes(folder)) {
      throw new Error('无效的文件夹');
    }

    await database.query(
      'UPDATE emails SET folder = ? WHERE id = ?',
      [folder, emailId]
    );

    return true;
  }

  async deleteEmail(emailId: number, userId: number): Promise<boolean> {
    const email = await this.getEmailById(emailId, userId);
    if (!email) {
      return false;
    }

    if (email.folder === 'trash') {
      // 永久删除
      await database.query(
        'UPDATE emails SET is_deleted = true WHERE id = ?',
        [emailId]
      );
    } else {
      // 移动到垃圾箱
      await database.query(
        'UPDATE emails SET folder = ? WHERE id = ?',
        ['trash', emailId]
      );
    }

    return true;
  }

  async searchEmails(userId: number, query: string, params: PaginationParams): Promise<EmailListResponse> {
    const { page, limit, sortBy = 'created_at', sortOrder = 'DESC' } = params;
    const offset = (page - 1) * limit;

    // 使用全文搜索
    const searchQuery = `
      SELECT COUNT(*) as total
      FROM emails e
      JOIN aliases a ON e.alias_id = a.id
      WHERE a.user_id = ? AND e.is_deleted = false
      AND (MATCH(e.subject, e.body_text) AGAINST(? IN NATURAL LANGUAGE MODE)
           OR e.from_email LIKE ?
           OR JSON_SEARCH(e.to_emails, 'one', ?) IS NOT NULL)
    `;

    const searchParam = `%${query}%`;
    const countResult = await database.query(searchQuery, [userId, query, searchParam, searchParam]);
    const total = countResult[0].total;

    const emailsQuery = `
      SELECT e.*, a.full_email as alias_email, a.display_name as alias_display_name
      FROM emails e
      JOIN aliases a ON e.alias_id = a.id
      WHERE a.user_id = ? AND e.is_deleted = false
      AND (MATCH(e.subject, e.body_text) AGAINST(? IN NATURAL LANGUAGE MODE)
           OR e.from_email LIKE ?
           OR JSON_SEARCH(e.to_emails, 'one', ?) IS NOT NULL)
      ORDER BY e.${sortBy} ${sortOrder}
      LIMIT ? OFFSET ?
    `;

    const emails = await database.query(emailsQuery, [userId, query, searchParam, searchParam, limit, offset]);

    return {
      emails,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }
}