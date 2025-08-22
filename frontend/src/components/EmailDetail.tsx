import React, { useState } from 'react';
import { 
  ReplyIcon, 
  ArrowUturnLeftIcon, 
  ShareIcon,
  StarIcon,
  TrashIcon,
  ArchiveBoxIcon,
  PrinterIcon,
  ChevronLeftIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline';
import { StarIcon as StarSolidIcon } from '@heroicons/react/24/solid';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { Email } from '../types';
import { emailService } from '../services/emailService';
import toast from 'react-hot-toast';

interface EmailDetailProps {
  email: Email;
  onClose: () => void;
  onReply: (email: Email) => void;
  onForward: (email: Email) => void;
  onDelete: (email: Email) => void;
  onPrevious?: () => void;
  onNext?: () => void;
  hasPrevious?: boolean;
  hasNext?: boolean;
}

export const EmailDetail: React.FC<EmailDetailProps> = ({
  email,
  onClose,
  onReply,
  onForward,
  onDelete,
  onPrevious,
  onNext,
  hasPrevious,
  hasNext,
}) => {
  const [isStarred, setIsStarred] = useState(email.is_starred);

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'yyyy年M月d日 HH:mm', { locale: zhCN });
  };

  const handleStar = async () => {
    try {
      await emailService.starEmail(email.id, !isStarred);
      setIsStarred(!isStarred);
      toast.success(isStarred ? '已取消星标' : '已添加星标');
    } catch (error) {
      toast.error('操作失败');
    }
  };

  const handleMoveToTrash = async () => {
    try {
      await emailService.moveToFolder(email.id, 'trash');
      onDelete(email);
      toast.success('邮件已移至垃圾箱');
    } catch (error) {
      toast.error('操作失败');
    }
  };

  const getEmailContent = () => {
    if (email.body_html) {
      return (
        <div 
          className="prose max-w-none"
          dangerouslySetInnerHTML={{ __html: email.body_html }}
        />
      );
    } else if (email.body_text) {
      return (
        <div className="whitespace-pre-wrap text-gray-900">
          {email.body_text}
        </div>
      );
    } else {
      return (
        <div className="text-gray-500 italic">
          此邮件没有内容
        </div>
      );
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-white">
      {/* 头部工具栏 */}
      <div className="border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full"
              title="返回列表"
            >
              <ArrowUturnLeftIcon className="h-5 w-5" />
            </button>
            
            <div className="flex items-center space-x-1 ml-4">
              {hasPrevious && (
                <button
                  onClick={onPrevious}
                  className="p-2 hover:bg-gray-100 rounded-full"
                  title="上一封"
                >
                  <ChevronLeftIcon className="h-5 w-5" />
                </button>
              )}
              {hasNext && (
                <button
                  onClick={onNext}
                  className="p-2 hover:bg-gray-100 rounded-full"
                  title="下一封"
                >
                  <ChevronRightIcon className="h-5 w-5" />
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => onReply(email)}
              className="p-2 hover:bg-gray-100 rounded-full"
              title="回复"
            >
              <ReplyIcon className="h-5 w-5" />
            </button>
            
            <button
              onClick={() => onForward(email)}
              className="p-2 hover:bg-gray-100 rounded-full"
              title="转发"
            >
              <ShareIcon className="h-5 w-5" />
            </button>
            
            <button
              onClick={handleStar}
              className="p-2 hover:bg-gray-100 rounded-full"
              title={isStarred ? "取消星标" : "添加星标"}
            >
              {isStarred ? (
                <StarSolidIcon className="h-5 w-5 text-yellow-400" />
              ) : (
                <StarIcon className="h-5 w-5" />
              )}
            </button>
            
            <button
              onClick={handleMoveToTrash}
              className="p-2 hover:bg-gray-100 rounded-full text-red-600"
              title="删除"
            >
              <TrashIcon className="h-5 w-5" />
            </button>

            <button
              onClick={() => window.print()}
              className="p-2 hover:bg-gray-100 rounded-full"
              title="打印"
            >
              <PrinterIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* 邮件内容 */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* 邮件头部信息 */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            {email.subject || '(无主题)'}
          </h1>
          
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-full bg-primary-500 flex items-center justify-center">
                  <span className="text-sm font-medium text-white">
                    {email.from_name ? email.from_name[0].toUpperCase() : 'U'}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {email.from_name || email.from_email}
                  </p>
                  <p className="text-sm text-gray-500">
                    &lt;{email.from_email}&gt;
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">
                  {formatDate(email.received_at || email.created_at)}
                </p>
                {email.alias_email && (
                  <p className="text-xs text-gray-400">
                    发送到: {email.alias_email}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2 text-sm">
              <div>
                <span className="font-medium text-gray-700">收件人: </span>
                <span className="text-gray-600">
                  {email.to_emails?.join(', ')}
                </span>
              </div>
              
              {email.cc_emails && email.cc_emails.length > 0 && (
                <div>
                  <span className="font-medium text-gray-700">抄送: </span>
                  <span className="text-gray-600">
                    {email.cc_emails.join(', ')}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 附件 */}
        {email.attachments && email.attachments.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-900 mb-3">
              附件 ({email.attachments.length})
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {email.attachments.map((attachment, index) => (
                <div
                  key={index}
                  className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  <svg className="h-8 w-8 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 0v12h8V4H6z" clipRule="evenodd" />
                  </svg>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {attachment.filename}
                    </p>
                    <p className="text-xs text-gray-500">
                      {Math.round(attachment.size / 1024)} KB
                    </p>
                  </div>
                  <button className="text-primary-600 hover:text-primary-800 text-sm font-medium">
                    下载
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 邮件正文 */}
        <div className="prose-sm max-w-none">
          {getEmailContent()}
        </div>
      </div>

      {/* 底部操作栏 */}
      <div className="border-t border-gray-200 p-4">
        <div className="flex justify-start space-x-3">
          <button
            onClick={() => onReply(email)}
            className="btn-primary"
          >
            <ReplyIcon className="h-4 w-4 mr-2" />
            回复
          </button>
          
          <button
            onClick={() => onForward(email)}
            className="btn-secondary"
          >
            <ShareIcon className="h-4 w-4 mr-2" />
            转发
          </button>
        </div>
      </div>
    </div>
  );
};