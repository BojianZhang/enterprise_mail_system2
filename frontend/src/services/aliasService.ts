import { apiClient } from './apiClient';
import { Alias, Domain, ApiResponse } from '../types';

export const aliasService = {
  async getAliases(): Promise<Alias[]> {
    const response = await apiClient.get<ApiResponse<{ aliases: Alias[] }>>('/aliases');
    
    if (response.data.success && response.data.data) {
      return response.data.data.aliases;
    }
    
    throw new Error(response.data.error || '获取别名列表失败');
  },

  async getDomains(): Promise<Domain[]> {
    const response = await apiClient.get<ApiResponse<{ domains: Domain[] }>>('/aliases/domains');
    
    if (response.data.success && response.data.data) {
      return response.data.data.domains;
    }
    
    throw new Error(response.data.error || '获取域名列表失败');
  },

  async createAlias(
    aliasName: string,
    domainId: number,
    displayName?: string
  ): Promise<Alias> {
    const response = await apiClient.post<ApiResponse<{ alias: Alias }>>('/aliases', {
      alias_name: aliasName,
      domain_id: domainId,
      display_name: displayName,
    });
    
    if (response.data.success && response.data.data) {
      return response.data.data.alias;
    }
    
    throw new Error(response.data.error || '创建别名失败');
  },

  async updateAlias(id: number, displayName?: string): Promise<Alias> {
    const response = await apiClient.put<ApiResponse<{ alias: Alias }>>(`/aliases/${id}`, {
      display_name: displayName,
    });
    
    if (response.data.success && response.data.data) {
      return response.data.data.alias;
    }
    
    throw new Error(response.data.error || '更新别名失败');
  },

  async setPrimaryAlias(id: number): Promise<void> {
    const response = await apiClient.put<ApiResponse>(`/aliases/${id}/primary`);
    
    if (!response.data.success) {
      throw new Error(response.data.error || '设置主要别名失败');
    }
  },

  async deleteAlias(id: number): Promise<void> {
    const response = await apiClient.delete<ApiResponse>(`/aliases/${id}`);
    
    if (!response.data.success) {
      throw new Error(response.data.error || '删除别名失败');
    }
  },
};