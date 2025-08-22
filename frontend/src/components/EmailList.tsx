import React, { useState, useEffect } from 'react';
import { MagnifyingGlassIcon, PlusIcon } from '@heroicons/react/24/outline';
import { Email, EmailListResponse, FolderType, Alias } from '../types';
import { EmailListItem } from './EmailListItem';
import { emailService } from '../services/emailService';
import toast from 'react-hot-toast';

interface EmailListProps {
  currentFolder: FolderType;
  currentAlias: Alias | null;
  selectedEmail: Email | null;
  onSelectEmail: (email: Email) => void;
  onComposeEmail: () => void;
  onFolderCountsUpdate: (counts: Record<FolderType, number>) => void;
}

export const EmailList: React.FC<EmailListProps> = ({
  currentFolder,
  currentAlias,
  selectedEmail,
  onSelectEmail,
  onComposeEmail,
  onFolderCountsUpdate,
}) => {
  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });

  useEffect(() => {
    loadEmails();
  }, [currentFolder, currentAlias]);

  useEffect(() => {
    updateFolderCounts();
  }, [emails]);

  const loadEmails = async (page: number = 1) => {
    setLoading(true);
    try {
      const filters = {
        folder: currentFolder,
        alias_id: currentAlias?.id,
        page,
        limit: pagination.limit,
      };

      let response: EmailListResponse;
      if (searchQuery.trim()) {
        response = await emailService.searchEmails(searchQuery, page, pagination.limit);
      } else {
        response = await emailService.getEmails(filters);
      }

      setEmails(response.emails);
      setPagination({
        page: response.page,
        limit: response.limit,
        total: response.total,
        totalPages: response.totalPages,
      });
    } catch (error) {
      toast.error('加载邮件失败');
    } finally {
      setLoading(false);
    }
  };

  const updateFolderCounts = async () => {
    try {
      // 获取各个文件夹的邮件数量
      const folders: FolderType[] = ['inbox', 'sent', 'drafts', 'trash', 'spam'];
      const counts: Record<FolderType, number> = {} as Record<FolderType, number>;

      for (const folder of folders) {
        const response = await emailService.getEmails({
          folder,
          alias_id: currentAlias?.id,
          page: 1,
          limit: 1,
        });
        counts[folder] = response.total;
      }

      onFolderCountsUpdate(counts);
    } catch (error) {
      console.error('更新文件夹数量失败:', error);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      loadEmails(1);
    }
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    loadEmails(1);
  };

  const handleStarEmail = async (email: Email) => {
    try {
      await emailService.starEmail(email.id, !email.is_starred);
      
      // 更新本地状态
      setEmails(prevEmails =>
        prevEmails.map(e =>
          e.id === email.id ? { ...e, is_starred: !e.is_starred } : e
        )
      );
      
      toast.success(email.is_starred ? '已取消星标' : '已添加星标');
    } catch (error) {
      toast.error('更新星标失败');
    }
  };

  const handleLoadMore = () => {
    if (pagination.page < pagination.totalPages) {
      loadEmails(pagination.page + 1);
    }
  };

  const getFolderTitle = () => {
    const folderNames = {
      inbox: '收件箱',
      sent: '已发送',
      drafts: '草稿箱',
      trash: '垃圾箱',
      spam: '垃圾邮件',
    };
    return folderNames[currentFolder] || '邮件';
  };

  if (loading && emails.length === 0) {
    return (
      <div className="flex-1 flex flex-col">
        <div className="border-b border-gray-200 p-4">
          <div className="h-6 bg-gray-200 rounded animate-pulse"></div>
        </div>
        <div className="flex-1 space-y-1 p-4">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-100 rounded animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-white">
      {/* 头部 */}
      <div className="border-b border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-lg font-semibold text-gray-900">
            {getFolderTitle()}
            {pagination.total > 0 && (
              <span className="ml-2 text-sm font-normal text-gray-500">
                ({pagination.total})
              </span>
            )}
          </h1>
          <button
            onClick={onComposeEmail}
            className="btn-primary"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            写邮件
          </button>
        </div>

        {/* 搜索栏 */}
        <form onSubmit={handleSearch} className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索邮件..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          )}
        </form>
      </div>

      {/* 邮件列表 */}
      <div className="flex-1 overflow-y-auto">
        {emails.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                {searchQuery ? '未找到匹配的邮件' : '暂无邮件'}
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchQuery ? '尝试使用不同的搜索词' : '您的邮箱是空的'}
              </p>
            </div>
          </div>
        ) : (
          <>
            {emails.map((email) => (
              <EmailListItem
                key={email.id}
                email={email}
                isSelected={selectedEmail?.id === email.id}
                onSelect={onSelectEmail}
                onStar={handleStarEmail}
              />
            ))}
            
            {pagination.page < pagination.totalPages && (
              <div className="p-4 text-center">
                <button
                  onClick={handleLoadMore}
                  disabled={loading}
                  className="btn-secondary"
                >
                  {loading ? '加载中...' : '加载更多'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};