import React, { useState, useEffect } from 'react';
import { Menu, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { ChevronDownIcon, PlusIcon, CheckIcon } from '@heroicons/react/24/outline';
import { Alias } from '../types';
import { aliasService } from '../services/aliasService';
import toast from 'react-hot-toast';
import classNames from 'classnames';

interface AliasProps {
  currentAlias: Alias | null;
  onAliasChange: (alias: Alias) => void;
  onCreateAlias: () => void;
}

export const AliasSwitcher: React.FC<AliasProps> = ({
  currentAlias,
  onAliasChange,
  onCreateAlias,
}) => {
  const [aliases, setAliases] = useState<Alias[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAliases();
  }, []);

  const loadAliases = async () => {
    try {
      const aliasesList = await aliasService.getAliases();
      setAliases(aliasesList);
      
      // 如果没有选中的别名，选择主要别名
      if (!currentAlias && aliasesList.length > 0) {
        const primaryAlias = aliasesList.find(alias => alias.is_primary) || aliasesList[0];
        onAliasChange(primaryAlias);
      }
    } catch (error) {
      toast.error('加载别名失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSetPrimary = async (alias: Alias) => {
    if (alias.is_primary) return;
    
    try {
      await aliasService.setPrimaryAlias(alias.id);
      await loadAliases();
      toast.success('主要别名已更新');
    } catch (error) {
      toast.error('设置主要别名失败');
    }
  };

  if (loading) {
    return (
      <div className="w-64 h-10 bg-gray-200 animate-pulse rounded-md"></div>
    );
  }

  return (
    <Menu as="div" className="relative inline-block text-left w-64">
      <div>
        <Menu.Button className="inline-flex w-full justify-between items-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-100 focus:ring-primary-500">
          <div className="flex flex-col items-start">
            <span className="text-sm font-medium text-gray-900">
              {currentAlias?.display_name || currentAlias?.alias_name || '选择别名'}
            </span>
            <span className="text-xs text-gray-500">
              {currentAlias?.full_email || '未选择'}
            </span>
          </div>
          <ChevronDownIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
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
        <Menu.Items className="absolute left-0 z-10 mt-2 w-80 origin-top-left rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
          <div className="py-1">
            <div className="px-4 py-2 text-sm font-medium text-gray-500 border-b border-gray-200">
              我的别名
            </div>
            
            {aliases.map((alias) => (
              <Menu.Item key={alias.id}>
                {({ active }) => (
                  <div
                    className={classNames(
                      active ? 'bg-gray-100' : '',
                      'px-4 py-3 cursor-pointer flex items-center justify-between'
                    )}
                    onClick={() => onAliasChange(alias)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {alias.display_name || alias.alias_name}
                        </p>
                        {alias.is_primary && (
                          <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
                            主要
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 truncate">
                        {alias.full_email}
                      </p>
                    </div>
                    
                    {currentAlias?.id === alias.id && (
                      <CheckIcon className="h-5 w-5 text-primary-600 ml-2 flex-shrink-0" />
                    )}
                  </div>
                )}
              </Menu.Item>
            ))}

            <div className="border-t border-gray-200">
              <Menu.Item>
                {({ active }) => (
                  <button
                    onClick={onCreateAlias}
                    className={classNames(
                      active ? 'bg-gray-100' : '',
                      'w-full text-left px-4 py-3 text-sm text-gray-700 flex items-center'
                    )}
                  >
                    <PlusIcon className="h-5 w-5 mr-3 text-gray-400" />
                    添加新别名
                  </button>
                )}
              </Menu.Item>
            </div>
          </div>
        </Menu.Items>
      </Transition>
    </Menu>
  );
};