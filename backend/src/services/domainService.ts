import database from '../config/database';
import { Domain } from '../types';

export class DomainService {
  
  async getDomains(): Promise<Domain[]> {
    return await database.query(
      'SELECT * FROM domains ORDER BY domain_name'
    );
  }

  async getActiveDomains(): Promise<Domain[]> {
    return await database.query(
      'SELECT * FROM domains WHERE is_active = true ORDER BY domain_name'
    );
  }

  async getDomainById(id: number): Promise<Domain | null> {
    const domains = await database.query(
      'SELECT * FROM domains WHERE id = ?',
      [id]
    );
    return domains.length > 0 ? domains[0] : null;
  }

  async getDomainByName(domainName: string): Promise<Domain | null> {
    const domains = await database.query(
      'SELECT * FROM domains WHERE domain_name = ?',
      [domainName]
    );
    return domains.length > 0 ? domains[0] : null;
  }

  async createDomain(
    domainName: string,
    mxRecord?: string,
    spfRecord?: string
  ): Promise<Domain> {
    // 检查域名是否已存在
    const existingDomain = await this.getDomainByName(domainName);
    if (existingDomain) {
      throw new Error('域名已存在');
    }

    // 生成DKIM密钥对 (简化实现)
    const dkimSelector = 'default';
    const dkimPrivateKey = this.generateDKIMPrivateKey();
    const dkimPublicKey = this.generateDKIMPublicKey(dkimPrivateKey);

    const result = await database.query(
      `INSERT INTO domains (domain_name, mx_record, spf_record, dkim_selector, dkim_private_key, dkim_public_key)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        domainName,
        mxRecord || `mail.${domainName}`,
        spfRecord || `v=spf1 mx a ~all`,
        dkimSelector,
        dkimPrivateKey,
        dkimPublicKey
      ]
    );

    return this.getDomainById(result.insertId) as Promise<Domain>;
  }

  async updateDomain(
    id: number,
    updates: {
      domain_name?: string;
      mx_record?: string;
      spf_record?: string;
      is_active?: boolean;
    }
  ): Promise<Domain | null> {
    const domain = await this.getDomainById(id);
    if (!domain) {
      return null;
    }

    // 如果更新域名，检查新域名是否已存在
    if (updates.domain_name && updates.domain_name !== domain.domain_name) {
      const existingDomain = await this.getDomainByName(updates.domain_name);
      if (existingDomain) {
        throw new Error('域名已存在');
      }
    }

    const updateFields: string[] = [];
    const updateValues: any[] = [];

    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined) {
        updateFields.push(`${key} = ?`);
        updateValues.push(value);
      }
    });

    if (updateFields.length === 0) {
      return domain;
    }

    updateValues.push(id);

    await database.query(
      `UPDATE domains SET ${updateFields.join(', ')} WHERE id = ?`,
      updateValues
    );

    return this.getDomainById(id);
  }

  async deleteDomain(id: number): Promise<boolean> {
    const domain = await this.getDomainById(id);
    if (!domain) {
      return false;
    }

    // 检查是否有别名使用此域名
    const aliases = await database.query(
      'SELECT id FROM aliases WHERE domain_id = ? AND is_active = true',
      [id]
    );

    if (aliases.length > 0) {
      throw new Error('无法删除域名，仍有活跃的别名在使用');
    }

    // 软删除：设置为非活跃状态
    await database.query(
      'UPDATE domains SET is_active = false WHERE id = ?',
      [id]
    );

    return true;
  }

  async getDomainStats(id: number): Promise<{
    domain: Domain;
    aliasCount: number;
    emailCount: number;
  } | null> {
    const domain = await this.getDomainById(id);
    if (!domain) {
      return null;
    }

    // 获取别名数量
    const aliasCountResult = await database.query(
      'SELECT COUNT(*) as count FROM aliases WHERE domain_id = ? AND is_active = true',
      [id]
    );

    // 获取邮件数量
    const emailCountResult = await database.query(
      `SELECT COUNT(*) as count 
       FROM emails e 
       JOIN aliases a ON e.alias_id = a.id 
       WHERE a.domain_id = ? AND e.is_deleted = false`,
      [id]
    );

    return {
      domain,
      aliasCount: aliasCountResult[0].count,
      emailCount: emailCountResult[0].count
    };
  }

  async generateDNSRecords(domainName: string): Promise<{
    mx: string;
    spf: string;
    dkim: string;
    dmarc: string;
  }> {
    const domain = await this.getDomainByName(domainName);
    if (!domain) {
      throw new Error('域名不存在');
    }

    return {
      mx: `${domainName}. 3600 IN MX 10 ${domain.mx_record || `mail.${domainName}`}.`,
      spf: `${domainName}. 3600 IN TXT "${domain.spf_record || 'v=spf1 mx a ~all'}"`,
      dkim: `${domain.dkim_selector || 'default'}._domainkey.${domainName}. 3600 IN TXT "v=DKIM1; k=rsa; p=${domain.dkim_public_key || 'YOUR_PUBLIC_KEY'}"`,
      dmarc: `_dmarc.${domainName}. 3600 IN TXT "v=DMARC1; p=quarantine; rua=mailto:dmarc@${domainName}"`
    };
  }

  private generateDKIMPrivateKey(): string {
    // 这是一个简化的实现
    // 实际应用中应该使用crypto库生成真实的RSA密钥对
    return 'DKIM_PRIVATE_KEY_PLACEHOLDER';
  }

  private generateDKIMPublicKey(privateKey: string): string {
    // 这是一个简化的实现
    // 实际应用中应该从私钥生成对应的公钥
    return 'DKIM_PUBLIC_KEY_PLACEHOLDER';
  }
}