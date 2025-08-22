import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import database from '../config/database';
import { User, UserSession } from '../types';

export class AuthService {
  private readonly jwtSecret = process.env.JWT_SECRET || 'default_secret';
  private readonly jwtExpiresIn = process.env.JWT_EXPIRES_IN || '24h';

  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 12);
  }

  async comparePassword(password: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
  }

  generateToken(userId: number): string {
    return jwt.sign({ userId }, this.jwtSecret, { expiresIn: this.jwtExpiresIn });
  }

  verifyToken(token: string): any {
    try {
      return jwt.verify(token, this.jwtSecret);
    } catch (error) {
      return null;
    }
  }

  async createUser(email: string, password: string, name: string): Promise<User> {
    const passwordHash = await this.hashPassword(password);
    
    const result = await database.query(
      'INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)',
      [email, passwordHash, name]
    );

    return this.getUserById(result.insertId);
  }

  async login(email: string, password: string, ipAddress?: string, userAgent?: string): Promise<{ user: User; token: string } | null> {
    const users = await database.query(
      'SELECT * FROM users WHERE email = ? AND is_active = true',
      [email]
    );

    if (users.length === 0) {
      return null;
    }

    const user = users[0] as User;
    const isValidPassword = await this.comparePassword(password, user.password_hash);

    if (!isValidPassword) {
      return null;
    }

    const token = this.generateToken(user.id);
    
    // 创建用户会话
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    await database.query(
      'INSERT INTO user_sessions (user_id, token, expires_at, ip_address, user_agent) VALUES (?, ?, ?, ?, ?)',
      [user.id, token, expiresAt, ipAddress, userAgent]
    );

    return { user, token };
  }

  async logout(token: string): Promise<void> {
    await database.query('DELETE FROM user_sessions WHERE token = ?', [token]);
  }

  async getUserById(id: number): Promise<User> {
    const users = await database.query(
      'SELECT * FROM users WHERE id = ? AND is_active = true',
      [id]
    );

    return users[0] as User;
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const users = await database.query(
      'SELECT * FROM users WHERE email = ? AND is_active = true',
      [email]
    );

    return users.length > 0 ? users[0] as User : null;
  }

  async validateSession(token: string): Promise<User | null> {
    const sessions = await database.query(
      'SELECT s.*, u.* FROM user_sessions s JOIN users u ON s.user_id = u.id WHERE s.token = ? AND s.expires_at > NOW() AND u.is_active = true',
      [token]
    );

    return sessions.length > 0 ? sessions[0] as User : null;
  }

  async cleanExpiredSessions(): Promise<void> {
    await database.query('DELETE FROM user_sessions WHERE expires_at < NOW()');
  }
}