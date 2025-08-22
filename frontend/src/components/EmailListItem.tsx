import React from 'react';
import { StarIcon, PaperClipIcon } from '@heroicons/react/24/outline';
import { StarIcon as StarSolidIcon } from '@heroicons/react/24/solid';
import { formatDistanceToNow, format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import classNames from 'classnames';
import { Email } from '../types';

interface EmailListItemProps {
  email: Email;
  isSelected: boolean;
  onSelect: (email: Email) => void;
  onStar: (email: Email) => void;
}

export const EmailListItem: React.FC<EmailListItemProps> = ({
  email,
  isSelected,
  onSelect,
  onStar,
}) => {
  const handleStarClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onStar(email);
  };

  const formatEmailDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return formatDistanceToNow(date, { addSuffix: true, locale: zhCN });
    } else {
      return format(date, 'M月d日', { locale: zhCN });
    }
  };

  const getFromDisplay = () => {
    if (email.folder === 'sent') {
      return email.to_emails?.[0] || '';
    }
    return email.from_name || email.from_email || '';
  };

  const getSenderInitials = (name: string) => {
    if (!name) return '?';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name[0]?.toUpperCase() || '?';
  };

  const fromDisplay = getFromDisplay();
  const hasAttachments = email.attachments && email.attachments.length > 0;

  return (
    <div
      className={classNames(
        'email-item px-4 py-3 flex items-center space-x-3',
        {
          'unread': !email.is_read,
          'selected': isSelected,
        }
      )}
      onClick={() => onSelect(email)}
    >
      {/* 发件人头像 */}
      <div className="flex-shrink-0">
        <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center text-sm font-medium text-gray-700">
          {getSenderInitials(fromDisplay)}
        </div>
      </div>

      {/* 邮件内容 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <p className={classNames(
            'text-sm truncate',
            email.is_read ? 'text-gray-900' : 'text-gray-900 font-semibold'
          )}>
            {fromDisplay}
          </p>
          <div className="flex items-center space-x-2">
            {hasAttachments && (
              <PaperClipIcon className="h-4 w-4 text-gray-400" />
            )}
            <p className="text-xs text-gray-500 whitespace-nowrap">
              {formatEmailDate(email.created_at)}
            </p>
          </div>
        </div>
        
        <div className="flex items-center justify-between mt-1">
          <div className="flex-1 min-w-0">
            <p className={classNames(
              'text-sm truncate',
              email.is_read ? 'text-gray-600' : 'text-gray-900 font-medium'
            )}>
              {email.subject || '(无主题)'}
            </p>
            <p className="text-xs text-gray-500 truncate mt-1">
              {email.body_text ? 
                email.body_text.replace(/\n/g, ' ').substring(0, 100) + 
                (email.body_text.length > 100 ? '...' : '') 
                : '(无内容)'
              }
            </p>
          </div>
          
          <div className="flex items-center ml-2">
            <button
              onClick={handleStarClick}
              className="p-1 hover:bg-gray-100 rounded"
            >
              {email.is_starred ? (
                <StarSolidIcon className="h-4 w-4 text-yellow-400" />
              ) : (
                <StarIcon className="h-4 w-4 text-gray-400 hover:text-yellow-400" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};