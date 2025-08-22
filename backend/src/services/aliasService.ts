import database from '../config/database';
import { Alias, Domain } from '../types';

export class AliasService {
  
  async getUserAliases(userId: number): Promise<Alias[]> {
    const query = `
      SELECT a.*, d.domain_name 
      FROM aliases a 
      JOIN domains d ON a.domain_id = d.id 
      WHERE a.user_id = ? AND a.is_active = true
      ORDER BY a.is_primary DESC, a.created_at ASC
    `;
    
    return await database.query(query, [userId]);
  }

  async getAliasById(id: number, userId: number): Promise<Alias | null> {
    const query = `
      SELECT a.*, d.domain_name 
      FROM aliases a 
      JOIN domains d ON a.domain_id = d.id 
      WHERE a.id = ? AND a.user_id = ? AND a.is_active = true
    `;
    
    const aliases = await database.query(query, [id, userId]);
    return aliases.length > 0 ? aliases[0] : null;
  }

  async createAlias(userId: number, domainId: number, aliasName: string, displayName?: string): Promise<Alias> {
    // 检查别名是否已存在
    const existingAlias = await database.query(
      'SELECT id FROM aliases WHERE alias_name = ? AND domain_id = ?',
      [aliasName, domainId]
    );

    if (existingAlias.length > 0) {
      throw new Error('别名已存在');
    }

    // 检查域名是否存在且活跃
    const domains = await database.query(
      'SELECT id FROM domains WHERE id = ? AND is_active = true',
      [domainId]
    );

    if (domains.length === 0) {
      throw new Error('域名不存在或未激活');
    }

    // 检查用户是否已有主要别名，如果没有，将此别名设为主要别名
    const userAliases = await database.query(
      'SELECT id FROM aliases WHERE user_id = ? AND is_primary = true',
      [userId]
    );

    const isPrimary = userAliases.length === 0;

    const result = await database.query(
      'INSERT INTO aliases (user_id, domain_id, alias_name, display_name, is_primary) VALUES (?, ?, ?, ?, ?)',
      [userId, domainId, aliasName, displayName || null, isPrimary]
    );

    return this.getAliasById(result.insertId, userId) as Promise<Alias>;
  }

  async updateAlias(id: number, userId: number, displayName?: string): Promise<Alias | null> {
    // 验证别名是否属于当前用户
    const alias = await this.getAliasById(id, userId);
    if (!alias) {
      return null;
    }

    await database.query(
      'UPDATE aliases SET display_name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?',
      [displayName || null, id, userId]
    );

    return this.getAliasById(id, userId);
  }

  async setPrimaryAlias(id: number, userId: number): Promise<boolean> {
    // 验证别名是否属于当前用户
    const alias = await this.getAliasById(id, userId);
    if (!alias) {
      return false;
    }

    // 开始事务
    const connection = await database.getPool().getConnection();
    await connection.beginTransaction();

    try {
      // 将用户的所有别名设为非主要
      await connection.query(
        'UPDATE aliases SET is_primary = false WHERE user_id = ?',
        [userId]
      );

      // 将指定别名设为主要
      await connection.query(
        'UPDATE aliases SET is_primary = true WHERE id = ? AND user_id = ?',
        [id, userId]
      );

      await connection.commit();
      return true;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async deleteAlias(id: number, userId: number): Promise<boolean> {
    // 验证别名是否属于当前用户
    const alias = await this.getAliasById(id, userId);
    if (!alias) {
      return false;
    }

    // 不允许删除主要别名，除非用户只有一个别名
    if (alias.is_primary) {
      const userAliases = await this.getUserAliases(userId);
      if (userAliases.length > 1) {
        throw new Error('不能删除主要别名，请先设置其他别名为主要别名');
      }
    }

    // 软删除：设置为非活跃状态
    await database.query(
      'UPDATE aliases SET is_active = false WHERE id = ? AND user_id = ?',
      [id, userId]
    );

    return true;
  }

  async getAvailableDomains(): Promise<Domain[]> {
    return await database.query(
      'SELECT * FROM domains WHERE is_active = true ORDER BY domain_name'
    );
  }

  async findAliasByFullEmail(fullEmail: string): Promise<Alias | null> {
    const [localPart, domainPart] = fullEmail.split('@');
    
    const query = `
      SELECT a.*, d.domain_name 
      FROM aliases a 
      JOIN domains d ON a.domain_id = d.id 
      WHERE a.alias_name = ? AND d.domain_name = ? AND a.is_active = true
    `;
    
    const aliases = await database.query(query, [localPart, domainPart]);
    return aliases.length > 0 ? aliases[0] : null;
  }
}