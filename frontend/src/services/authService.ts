import { apiClient } from './apiClient';
import { User, LoginData, ApiResponse } from '../types';

export const authService = {
  async login(email: string, password: string): Promise<LoginData> {
    const response = await apiClient.post<ApiResponse<LoginData>>('/auth/login', {
      email,
      password,
    });
    
    if (response.data.success && response.data.data) {
      const { user, token } = response.data.data;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      return response.data.data;
    }
    
    throw new Error(response.data.error || '登录失败');
  },

  async register(email: string, password: string, name: string): Promise<User> {
    const response = await apiClient.post<ApiResponse<{ user: User }>>('/auth/register', {
      email,
      password,
      name,
    });
    
    if (response.data.success && response.data.data) {
      return response.data.data.user;
    }
    
    throw new Error(response.data.error || '注册失败');
  },

  async logout(): Promise<void> {
    try {
      await apiClient.post('/auth/logout');
    } catch (error) {
      // 即使API调用失败，也要清除本地存储
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
  },

  async verifyToken(): Promise<User> {
    const response = await apiClient.get<ApiResponse<{ user: User }>>('/auth/verify');
    
    if (response.data.success && response.data.data) {
      const user = response.data.data.user;
      localStorage.setItem('user', JSON.stringify(user));
      return user;
    }
    
    throw new Error('Token验证失败');
  },

  getCurrentUser(): User | null {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  },

  getToken(): string | null {
    return localStorage.getItem('token');
  },

  isAuthenticated(): boolean {
    return !!this.getToken();
  },
};