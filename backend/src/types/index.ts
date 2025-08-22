export interface User {
  id: number;
  email: string;
  password_hash: string;
  name: string;
  created_at: Date;
  updated_at: Date;
  is_active: boolean;
  is_admin: boolean;
  storage_quota: number;
  used_storage: number;
}

export interface Domain {
  id: number;
  domain_name: string;
  is_active: boolean;
  created_at: Date;
  mx_record?: string;
  spf_record?: string;
  dkim_selector?: string;
  dkim_private_key?: string;
  dkim_public_key?: string;
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
  created_at: Date;
  updated_at: Date;
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
  created_at: Date;
  received_at?: Date;
}

export interface AttachmentInfo {
  filename: string;
  content_type: string;
  size: number;
  content_id?: string;
}

export interface Attachment {
  id: number;
  email_id: number;
  filename: string;
  content_type: string;
  size: number;
  file_path: string;
  created_at: Date;
}

export interface EmailLabel {
  id: number;
  user_id: number;
  name: string;
  color: string;
  created_at: Date;
}

export interface UserSession {
  id: number;
  user_id: number;
  token: string;
  expires_at: Date;
  created_at: Date;
  ip_address?: string;
  user_agent?: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface EmailListResponse {
  emails: Email[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}