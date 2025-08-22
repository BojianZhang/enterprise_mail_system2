export interface User {
  id: number;
  email: string;
  name: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
  is_admin: boolean;
  storage_quota: number;
  used_storage: number;
}

export interface Domain {
  id: number;
  domain_name: string;
  is_active: boolean;
  created_at: string;
  mx_record?: string;
}

export interface Alias {
  id: number;
  user_id: number;
  domain_id: number;
  alias_name: string;
  full_email: string;
  display_name?: string;
  is_active: boolean;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
  domain_name?: string;
}

export interface Email {
  id: number;
  message_id: string;
  alias_id: number;
  from_email: string;
  from_name?: string;
  to_emails: string[];
  cc_emails?: string[];
  bcc_emails?: string[];
  subject?: string;
  body_text?: string;
  body_html?: string;
  attachments?: AttachmentInfo[];
  size: number;
  is_read: boolean;
  is_starred: boolean;
  is_deleted: boolean;
  folder: string;
  created_at: string;
  received_at?: string;
  alias_email?: string;
  alias_display_name?: string;
}

export interface AttachmentInfo {
  filename: string;
  content_type: string;
  size: number;
  content_id?: string;
}

export interface EmailListResponse {
  emails: Email[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface LoginData {
  user: User;
  token: string;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface EmailFilters extends PaginationParams {
  folder?: string;
  alias_id?: number;
}

export type FolderType = 'inbox' | 'sent' | 'drafts' | 'trash' | 'spam';