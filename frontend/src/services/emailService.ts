import { apiClient } from './apiClient';
import { Email, EmailListResponse, EmailFilters, ApiResponse } from '../types';

export const emailService = {
  async getEmails(filters: EmailFilters = {}): Promise<EmailListResponse> {
    const response = await apiClient.get<ApiResponse<EmailListResponse>>('/emails', filters);
    
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    
    throw new Error(response.data.error || '获取邮件列表失败');
  },

  async getEmailById(id: number): Promise<Email> {
    const response = await apiClient.get<ApiResponse<{ email: Email }>>(`/emails/${id}`);
    
    if (response.data.success && response.data.data) {
      return response.data.data.email;
    }
    
    throw new Error(response.data.error || '获取邮件详情失败');
  },

  async sendEmail(emailData: {
    alias_id: number;
    to: string[];
    subject: string;
    body_text?: string;
    body_html?: string;
    cc?: string[];
    bcc?: string[];
  }): Promise<Email> {
    const response = await apiClient.post<ApiResponse<{ email: Email }>>('/emails', emailData);
    
    if (response.data.success && response.data.data) {
      return response.data.data.email;
    }
    
    throw new Error(response.data.error || '发送邮件失败');
  },

  async searchEmails(query: string, page: number = 1, limit: number = 20): Promise<EmailListResponse> {
    const response = await apiClient.get<ApiResponse<EmailListResponse>>('/emails/search', {
      q: query,
      page,
      limit,
    });
    
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    
    throw new Error(response.data.error || '搜索邮件失败');
  },

  async markAsRead(id: number, isRead: boolean = true): Promise<void> {
    const response = await apiClient.put<ApiResponse>(`/emails/${id}/read`, {
      is_read: isRead,
    });
    
    if (!response.data.success) {
      throw new Error(response.data.error || '更新邮件状态失败');
    }
  },

  async starEmail(id: number, isStarred: boolean = true): Promise<void> {
    const response = await apiClient.put<ApiResponse>(`/emails/${id}/star`, {
      is_starred: isStarred,
    });
    
    if (!response.data.success) {
      throw new Error(response.data.error || '更新邮件星标失败');
    }
  },

  async moveToFolder(id: number, folder: string): Promise<void> {
    const response = await apiClient.put<ApiResponse>(`/emails/${id}/folder`, {
      folder,
    });
    
    if (!response.data.success) {
      throw new Error(response.data.error || '移动邮件失败');
    }
  },

  async deleteEmail(id: number): Promise<void> {
    const response = await apiClient.delete<ApiResponse>(`/emails/${id}`);
    
    if (!response.data.success) {
      throw new Error(response.data.error || '删除邮件失败');
    }
  },
};