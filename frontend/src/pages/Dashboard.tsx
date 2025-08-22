import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { AliasSwitcher } from '../components/AliasSwitcher';
import { CreateAliasModal } from '../components/CreateAliasModal';
import { EmailSidebar } from '../components/EmailSidebar';
import { EmailList } from '../components/EmailList';
import { EmailDetail } from '../components/EmailDetail';
import { ComposeEmailModal } from '../components/ComposeEmailModal';
import { Email, Alias, FolderType } from '../types';
import { 
  Bars3Icon,
  UserCircleIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon
} from '@heroicons/react/24/outline';
import { Menu, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import classNames from 'classnames';

export const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();
  
  // 状态管理
  const [currentFolder, setCurrentFolder] = useState<FolderType>('inbox');
  const [currentAlias, setCurrentAlias] = useState<Alias | null>(null);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [showCreateAlias, setShowCreateAlias] = useState(false);
  const [showCompose, setShowCompose] = useState(false);
  const [replyToEmail, setReplyToEmail] = useState<Email | null>(null);
  const [forwardEmail, setForwardEmail] = useState<Email | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [folderCounts, setFolderCounts] = useState<Record<FolderType, number>>({
    inbox: 0,
    sent: 0,
    drafts: 0,
    trash: 0,
    spam: 0,
  });

  // 处理函数
  const handleAliasCreated = (alias: Alias) => {
    setCurrentAlias(alias);
    setShowCreateAlias(false);
  };

  const handleComposeEmail = () => {
    setShowCompose(true);
    setReplyToEmail(null);
    setForwardEmail(null);
  };

  const handleReplyEmail = (email: Email) => {
    setReplyToEmail(email);
    setForwardEmail(null);
    setShowCompose(true);
  };

  const handleForwardEmail = (email: Email) => {
    setForwardEmail(email);
    setReplyToEmail(null);
    setShowCompose(true);
  };

  const handleEmailSent = () => {
    setShowCompose(false);
    setReplyToEmail(null);
    setForwardEmail(null);
    // 刷新邮件列表
    window.location.reload();
  };

  const handleDeleteEmail = (email: Email) => {
    setSelectedEmail(null);
    // 刷新邮件列表
    window.location.reload();
  };

  const handleLogout = async () => {
    await logout();
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* 顶部导航栏 */}
      <header className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {/* 移动端菜单按钮 */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="md:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
            >
              <Bars3Icon className="h-6 w-6" />
            </button>

            {/* Logo */}
            <div className="flex items-center">
              <div className="h-8 w-8 bg-primary-600 rounded-lg flex items-center justify-center">
                <svg
                  className="h-5 w-5 text-white"
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
              </div>
              <h1 className="ml-2 text-xl font-bold text-gray-900">企业邮箱</h1>
            </div>

            {/* 别名切换器 */}
            <div className="hidden md:block">
              <AliasSwitcher
                currentAlias={currentAlias}
                onAliasChange={setCurrentAlias}
                onCreateAlias={() => setShowCreateAlias(true)}
              />
            </div>
          </div>

          {/* 用户菜单 */}
          <div className="flex items-center space-x-4">
            <Menu as="div" className="relative inline-block text-left">
              <div>
                <Menu.Button className="flex items-center space-x-2 text-sm text-gray-700 hover:text-gray-900">
                  <UserCircleIcon className="h-8 w-8" />
                  <span className="hidden sm:block">{user?.name}</span>
                </Menu.Button>
              </div>

              <Transition
                as={Fragment}
                enter="transition ease-out duration-100"
                enterFrom="transform opacity-0 scale-95"
                enterTo="transform opacity-100 scale-100"
                leave="transition ease-in duration-75"
                leaveFrom="transform opacity-100 scale-100"
                leaveTo="transform opacity-0 scale-95"
              >
                <Menu.Items className="absolute right-0 z-10 mt-2 w-56 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                  <div className="py-1">
                    <div className="px-4 py-2 text-sm text-gray-500 border-b">
                      {user?.email}
                    </div>
                    
                    <Menu.Item>
                      {({ active }) => (
                        <button
                          className={classNames(
                            active ? 'bg-gray-100' : '',
                            'w-full text-left px-4 py-2 text-sm text-gray-700 flex items-center'
                          )}
                        >
                          <Cog6ToothIcon className="h-4 w-4 mr-3" />
                          设置
                        </button>
                      )}
                    </Menu.Item>
                    
                    <Menu.Item>
                      {({ active }) => (
                        <button
                          onClick={handleLogout}
                          className={classNames(
                            active ? 'bg-gray-100' : '',
                            'w-full text-left px-4 py-2 text-sm text-gray-700 flex items-center'
                          )}
                        >
                          <ArrowRightOnRectangleIcon className="h-4 w-4 mr-3" />
                          退出登录
                        </button>
                      )}
                    </Menu.Item>
                  </div>
                </Menu.Items>
              </Transition>
            </Menu>
          </div>
        </div>

        {/* 移动端别名切换器 */}
        <div className="md:hidden mt-3">
          <AliasSwitcher
            currentAlias={currentAlias}
            onAliasChange={setCurrentAlias}
            onCreateAlias={() => setShowCreateAlias(true)}
          />
        </div>
      </header>

      {/* 主要内容区域 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 侧边栏 - 文件夹导航 */}
        <div className={classNames(
          'email-sidebar border-r border-gray-200 bg-white',
          sidebarOpen ? 'block' : 'hidden md:block'
        )}>
          <EmailSidebar
            currentFolder={currentFolder}
            onFolderChange={(folder) => {
              setCurrentFolder(folder);
              setSelectedEmail(null);
            }}
            folderCounts={folderCounts}
          />
        </div>

        {/* 邮件列表 */}
        <div className={classNames(
          'email-content flex',
          selectedEmail ? 'hidden lg:flex lg:w-1/2' : 'flex-1'
        )}>
          <EmailList
            currentFolder={currentFolder}
            currentAlias={currentAlias}
            selectedEmail={selectedEmail}
            onSelectEmail={setSelectedEmail}
            onComposeEmail={handleComposeEmail}
            onFolderCountsUpdate={setFolderCounts}
          />
        </div>

        {/* 邮件详情 */}
        {selectedEmail && (
          <div className={classNames(
            'email-content',
            'lg:w-1/2 lg:border-l lg:border-gray-200'
          )}>
            <EmailDetail
              email={selectedEmail}
              onClose={() => setSelectedEmail(null)}
              onReply={handleReplyEmail}
              onForward={handleForwardEmail}
              onDelete={handleDeleteEmail}
            />
          </div>
        )}
      </div>

      {/* 模态框 */}
      <CreateAliasModal
        isOpen={showCreateAlias}
        onClose={() => setShowCreateAlias(false)}
        onAliasCreated={handleAliasCreated}
      />

      <ComposeEmailModal
        isOpen={showCompose}
        onClose={() => {
          setShowCompose(false);
          setReplyToEmail(null);
          setForwardEmail(null);
        }}
        currentAlias={currentAlias}
        replyTo={replyToEmail || undefined}
        forwardEmail={forwardEmail || undefined}
        onEmailSent={handleEmailSent}
      />
    </div>
  );
};