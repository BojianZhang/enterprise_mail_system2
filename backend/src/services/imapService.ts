import * as Imap from 'imap';
import { simpleParser } from 'mailparser';
import database from '../config/database';
import { Email, AttachmentInfo } from '../types';
import { AliasService } from './aliasService';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';

export class ImapService {
  private aliasService: AliasService;
  private uploadPath: string;

  constructor() {
    this.aliasService = new AliasService();
    this.uploadPath = process.env.UPLOAD_PATH || './uploads';
    
    // 确保上传目录存在
    if (!fs.existsSync(this.uploadPath)) {
      fs.mkdirSync(this.uploadPath, { recursive: true });
    }
  }

  private createImapConnection(config: {
    host: string;
    port: number;
    secure: boolean;
    user: string;
    password: string;
  }): Imap {
    return new Imap({
      host: config.host,
      port: config.port,
      tls: config.secure,
      user: config.user,
      password: config.password,
      tlsOptions: {
        rejectUnauthorized: false
      }
    });
  }

  async fetchEmails(aliasEmail: string): Promise<void> {
    const alias = await this.aliasService.findAliasByFullEmail(aliasEmail);
    if (!alias) {
      console.error(`别名不存在: ${aliasEmail}`);
      return;
    }

    // 获取IMAP配置 (这里简化处理，实际应从配置表获取)
    const imapConfig = {
      host: process.env.IMAP_HOST || 'localhost',
      port: parseInt(process.env.IMAP_PORT || '993'),
      secure: process.env.IMAP_SECURE === 'true',
      user: aliasEmail,
      password: 'password' // 实际应用中应从安全存储获取
    };

    const imap = this.createImapConnection(imapConfig);

    return new Promise((resolve, reject) => {
      imap.once('ready', () => {
        imap.openBox('INBOX', false, (err, box) => {
          if (err) {
            reject(err);
            return;
          }

          // 搜索未读邮件
          imap.search(['UNSEEN'], (err, results) => {
            if (err) {
              reject(err);
              return;
            }

            if (results.length === 0) {
              imap.end();
              resolve();
              return;
            }

            const fetch = imap.fetch(results, { 
              bodies: '',
              struct: true,
              markSeen: false
            });

            fetch.on('message', (msg, seqno) => {
              let buffer = Buffer.alloc(0);
              
              msg.on('body', (stream, info) => {
                stream.on('data', (chunk) => {
                  buffer = Buffer.concat([buffer, chunk]);
                });
                
                stream.once('end', async () => {
                  try {
                    const parsed = await simpleParser(buffer);
                    await this.saveEmailToDatabase(parsed, alias.id);
                  } catch (error) {
                    console.error('解析邮件错误:', error);
                  }
                });
              });

              msg.once('attributes', (attrs) => {
                // 可以在这里处理邮件属性
              });
            });

            fetch.once('error', (err) => {
              console.error('获取邮件错误:', err);
              reject(err);
            });

            fetch.once('end', () => {
              imap.end();
              resolve();
            });
          });
        });
      });

      imap.once('error', (err) => {
        console.error('IMAP连接错误:', err);
        reject(err);
      });

      imap.connect();
    });
  }

  private async saveEmailToDatabase(parsed: any, aliasId: number): Promise<void> {
    try {
      // 检查邮件是否已存在
      if (parsed.messageId) {
        const existingEmails = await database.query(
          'SELECT id FROM emails WHERE message_id = ?',
          [parsed.messageId]
        );
        
        if (existingEmails.length > 0) {
          return; // 邮件已存在，跳过
        }
      }

      // 处理附件
      const attachments: AttachmentInfo[] = [];
      if (parsed.attachments && parsed.attachments.length > 0) {
        for (const attachment of parsed.attachments) {
          const filename = attachment.filename || `attachment_${uuidv4()}`;
          const filePath = path.join(this.uploadPath, `${uuidv4()}_${filename}`);
          
          // 保存附件文件
          fs.writeFileSync(filePath, attachment.content);
          
          // 保存附件信息
          const attachmentInfo: AttachmentInfo = {
            filename,
            content_type: attachment.contentType || 'application/octet-stream',
            size: attachment.size || attachment.content.length
          };
          attachments.push(attachmentInfo);

          // 保存到附件表
          await database.query(
            'INSERT INTO attachments (email_id, filename, content_type, size, file_path) VALUES (?, ?, ?, ?, ?)',
            [0, filename, attachmentInfo.content_type, attachmentInfo.size, filePath] // email_id会在后面更新
          );
        }
      }

      // 计算邮件大小
      const emailSize = Buffer.byteLength(parsed.text || parsed.html || '', 'utf8') +
                       attachments.reduce((sum, att) => sum + att.size, 0);

      // 保存邮件到数据库
      const result = await database.query(
        `INSERT INTO emails (
          message_id, alias_id, from_email, from_name, to_emails, cc_emails, bcc_emails,
          subject, body_text, body_html, attachments, size, folder, received_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          parsed.messageId || `<${uuidv4()}@imported>`,
          aliasId,
          parsed.from?.value?.[0]?.address || parsed.from?.text || '',
          parsed.from?.value?.[0]?.name || null,
          JSON.stringify(parsed.to?.value?.map((addr: any) => addr.address) || []),
          parsed.cc?.value ? JSON.stringify(parsed.cc.value.map((addr: any) => addr.address)) : null,
          parsed.bcc?.value ? JSON.stringify(parsed.bcc.value.map((addr: any) => addr.address)) : null,
          parsed.subject || null,
          parsed.text || null,
          parsed.html || null,
          attachments.length > 0 ? JSON.stringify(attachments) : null,
          emailSize,
          'inbox',
          parsed.date || new Date()
        ]
      );

      // 更新附件表中的email_id
      if (attachments.length > 0) {
        await database.query(
          'UPDATE attachments SET email_id = ? WHERE email_id = 0 AND filename IN (?)',
          [result.insertId, attachments.map(att => att.filename)]
        );
      }

      console.log(`邮件已保存: ${parsed.subject || '无主题'}`);
    } catch (error) {
      console.error('保存邮件到数据库错误:', error);
      throw error;
    }
  }

  async startEmailSync(intervalMs: number = 60000): Promise<void> {
    console.log('开始邮件同步服务...');
    
    const syncEmails = async () => {
      try {
        // 获取所有活跃的别名
        const aliases = await database.query(`
          SELECT a.full_email 
          FROM aliases a 
          JOIN users u ON a.user_id = u.id 
          WHERE a.is_active = true AND u.is_active = true
        `);

        for (const alias of aliases) {
          try {
            await this.fetchEmails(alias.full_email);
          } catch (error) {
            console.error(`同步邮件失败 (${alias.full_email}):`, error);
          }
        }
      } catch (error) {
        console.error('邮件同步服务错误:', error);
      }
    };

    // 立即执行一次
    await syncEmails();

    // 设置定时同步
    setInterval(syncEmails, intervalMs);
  }

  async markAsRead(emailId: number, messageId: string, aliasEmail: string): Promise<void> {
    // 这里应该连接到IMAP服务器并标记邮件为已读
    // 简化实现，仅更新数据库
    try {
      await database.query(
        'UPDATE emails SET is_read = true WHERE id = ?',
        [emailId]
      );
    } catch (error) {
      console.error('标记邮件已读错误:', error);
      throw error;
    }
  }

  async deleteEmail(emailId: number, messageId: string, aliasEmail: string): Promise<void> {
    // 这里应该连接到IMAP服务器并删除邮件
    // 简化实现，仅更新数据库
    try {
      await database.query(
        'UPDATE emails SET folder = ?, is_deleted = true WHERE id = ?',
        ['trash', emailId]
      );
    } catch (error) {
      console.error('删除邮件错误:', error);
      throw error;
    }
  }
}