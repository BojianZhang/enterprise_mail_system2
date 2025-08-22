import React, { useState, useEffect } from 'react';
import { 
  InboxIcon, 
  PaperAirplaneIcon, 
  DocumentIcon, 
  TrashIcon, 
  ExclamationTriangleIcon,
  StarIcon
} from '@heroicons/react/24/outline';
import { 
  InboxIcon as InboxSolidIcon,
  PaperAirplaneIcon as PaperAirplaneSolidIcon,
  DocumentIcon as DocumentSolidIcon,
  TrashIcon as TrashSolidIcon,
  ExclamationTriangleIcon as ExclamationTriangleSolidIcon,
  StarIcon as StarSolidIcon
} from '@heroicons/react/24/solid';
import classNames from 'classnames';
import { FolderType } from '../types';

interface FolderItem {
  key: FolderType;
  label: string;
  icon: React.ComponentType<any>;
  activeIcon: React.ComponentType<any>;
  count?: number;
}

interface EmailSidebarProps {
  currentFolder: FolderType;
  onFolderChange: (folder: FolderType) => void;
  folderCounts: Record<FolderType, number>;
}

export const EmailSidebar: React.FC<EmailSidebarProps> = ({
  currentFolder,
  onFolderChange,
  folderCounts,
}) => {
  const folders: FolderItem[] = [
    {
      key: 'inbox',
      label: '收件箱',
      icon: InboxIcon,
      activeIcon: InboxSolidIcon,
      count: folderCounts.inbox,
    },
    {
      key: 'sent',
      label: '已发送',
      icon: PaperAirplaneIcon,
      activeIcon: PaperAirplaneSolidIcon,
      count: folderCounts.sent,
    },
    {
      key: 'drafts',
      label: '草稿箱',
      icon: DocumentIcon,
      activeIcon: DocumentSolidIcon,
      count: folderCounts.drafts,
    },
    {
      key: 'spam',
      label: '垃圾邮件',
      icon: ExclamationTriangleIcon,
      activeIcon: ExclamationTriangleSolidIcon,
      count: folderCounts.spam,
    },
    {
      key: 'trash',
      label: '垃圾箱',
      icon: TrashIcon,
      activeIcon: TrashSolidIcon,
      count: folderCounts.trash,
    },
  ];

  return (
    <div className="w-64 bg-white border-r border-gray-200 h-full overflow-y-auto">
      <div className="p-4">
        <nav className="space-y-1">
          {folders.map((folder) => {
            const isActive = currentFolder === folder.key;
            const Icon = isActive ? folder.activeIcon : folder.icon;
            
            return (
              <button
                key={folder.key}
                onClick={() => onFolderChange(folder.key)}
                className={classNames(
                  'sidebar-item w-full',
                  {
                    'active': isActive,
                    'text-gray-600 hover:text-gray-900': !isActive,
                  }
                )}
              >
                <Icon className="h-5 w-5 mr-3 flex-shrink-0" />
                <span className="flex-1 text-left">{folder.label}</span>
                {folder.count !== undefined && folder.count > 0 && (
                  <span className={classNames(
                    'ml-2 inline-block px-2 py-1 text-xs font-medium rounded-full',
                    {
                      'bg-primary-100 text-primary-800': isActive,
                      'bg-gray-100 text-gray-600': !isActive,
                    }
                  )}>
                    {folder.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
};