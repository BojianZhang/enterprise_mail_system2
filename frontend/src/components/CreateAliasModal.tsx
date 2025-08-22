import React, { useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment, useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useForm } from 'react-hook-form';
import { Alias, Domain } from '../types';
import { aliasService } from '../services/aliasService';
import toast from 'react-hot-toast';

interface CreateAliasModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAliasCreated: (alias: Alias) => void;
}

interface CreateAliasForm {
  alias_name: string;
  domain_id: number;
  display_name?: string;
}

export const CreateAliasModal: React.FC<CreateAliasModalProps> = ({
  isOpen,
  onClose,
  onAliasCreated,
}) => {
  const [domains, setDomains] = useState<Domain[]>([]);
  const [loading, setLoading] = useState(false);
  const [domainLoading, setDomainLoading] = useState(true);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<CreateAliasForm>();

  const selectedDomainId = watch('domain_id');
  const aliasName = watch('alias_name');

  useEffect(() => {
    if (isOpen) {
      loadDomains();
    }
  }, [isOpen]);

  const loadDomains = async () => {
    try {
      const domainsList = await aliasService.getDomains();
      setDomains(domainsList);
    } catch (error) {
      toast.error('加载域名失败');
    } finally {
      setDomainLoading(false);
    }
  };

  const onSubmit = async (data: CreateAliasForm) => {
    setLoading(true);
    try {
      const alias = await aliasService.createAlias(
        data.alias_name,
        parseInt(data.domain_id.toString()),
        data.display_name || undefined
      );
      
      onAliasCreated(alias);
      toast.success('别名创建成功');
      onClose();
      reset();
    } catch (error) {
      // 错误已在service中处理
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    onClose();
    reset();
  };

  const selectedDomain = domains.find(d => d.id === parseInt(selectedDomainId?.toString() || '0'));
  const fullEmail = aliasName && selectedDomain 
    ? `${aliasName}@${selectedDomain.domain_name}` 
    : '';

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={handleClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                <div className="flex items-center justify-between mb-4">
                  <Dialog.Title className="text-lg font-medium leading-6 text-gray-900">
                    创建新别名
                  </Dialog.Title>
                  <button
                    type="button"
                    onClick={handleClose}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <div>
                    <label htmlFor="alias_name" className="form-label">
                      别名前缀
                    </label>
                    <input
                      {...register('alias_name', {
                        required: '别名前缀是必填项',
                        pattern: {
                          value: /^[a-zA-Z0-9._-]+$/,
                          message: '别名只能包含字母、数字、点、下划线和连字符',
                        },
                        minLength: {
                          value: 1,
                          message: '别名至少需要1个字符',
                        },
                      })}
                      type="text"
                      className={`form-input ${errors.alias_name ? 'border-red-300' : ''}`}
                      placeholder="例如：support"
                    />
                    {errors.alias_name && (
                      <p className="mt-1 text-sm text-red-600">{errors.alias_name.message}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="domain_id" className="form-label">
                      选择域名
                    </label>
                    {domainLoading ? (
                      <div className="form-input h-10 bg-gray-100 animate-pulse"></div>
                    ) : (
                      <select
                        {...register('domain_id', {
                          required: '请选择域名',
                        })}
                        className={`form-input ${errors.domain_id ? 'border-red-300' : ''}`}
                      >
                        <option value="">选择域名</option>
                        {domains.map((domain) => (
                          <option key={domain.id} value={domain.id}>
                            @{domain.domain_name}
                          </option>
                        ))}
                      </select>
                    )}
                    {errors.domain_id && (
                      <p className="mt-1 text-sm text-red-600">{errors.domain_id.message}</p>
                    )}
                  </div>

                  {fullEmail && (
                    <div className="p-3 bg-gray-50 rounded-md">
                      <label className="text-sm font-medium text-gray-700">完整邮箱地址：</label>
                      <p className="text-sm text-primary-600 font-medium">{fullEmail}</p>
                    </div>
                  )}

                  <div>
                    <label htmlFor="display_name" className="form-label">
                      显示名称 <span className="text-gray-400">(可选)</span>
                    </label>
                    <input
                      {...register('display_name')}
                      type="text"
                      className="form-input"
                      placeholder="例如：客户支持"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      用于在界面中显示的友好名称
                    </p>
                  </div>

                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={handleClose}
                      className="btn-secondary"
                    >
                      取消
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? (
                        <>
                          <svg
                            className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            ></circle>
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            ></path>
                          </svg>
                          创建中...
                        </>
                      ) : (
                        '创建别名'
                      )}
                    </button>
                  </div>
                </form>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};