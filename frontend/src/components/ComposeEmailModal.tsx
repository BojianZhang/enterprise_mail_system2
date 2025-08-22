import React, { useState, useRef, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { XMarkIcon, PaperClipIcon } from '@heroicons/react/24/outline';
import { useForm } from 'react-hook-form';
import { Email, Alias } from '../types';
import { emailService } from '../services/emailService';
import toast from 'react-hot-toast';

interface ComposeEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentAlias: Alias | null;
  replyTo?: Email;
  forwardEmail?: Email;
  onEmailSent: () => void;
}

interface ComposeForm {
  to: string;
  cc?: string;
  bcc?: string;
  subject: string;
  body: string;
}

export const ComposeEmailModal: React.FC<ComposeEmailModalProps> = ({
  isOpen,
  onClose,
  currentAlias,
  replyTo,
  forwardEmail,
  onEmailSent,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ComposeForm>();

  useEffect(() => {
    if (isOpen) {
      // 如果是回复邮件
      if (replyTo) {
        setValue('to', replyTo.from_email);
        setValue('subject', replyTo.subject?.startsWith('Re: ') 
          ? replyTo.subject 
          : `Re: ${replyTo.subject || ''}`);
        setValue('body', `\n\n--- 原始邮件 ---\n从: ${replyTo.from_email}\n时间: ${new Date(replyTo.created_at).toLocaleString()}\n主题: ${replyTo.subject || ''}\n\n${replyTo.body_text || ''}`);
      }
      
      // 如果是转发邮件
      if (forwardEmail) {
        setValue('subject', forwardEmail.subject?.startsWith('Fwd: ') 
          ? forwardEmail.subject 
          : `Fwd: ${forwardEmail.subject || ''}`);
        setValue('body', `\n\n--- 转发邮件 ---\n从: ${forwardEmail.from_email}\n时间: ${new Date(forwardEmail.created_at).toLocaleString()}\n主题: ${forwardEmail.subject || ''}\n收件人: ${forwardEmail.to_emails?.join(', ')}\n\n${forwardEmail.body_text || ''}`);
      }

      // 自动聚焦到合适的字段
      setTimeout(() => {
        if (replyTo || forwardEmail) {
          bodyRef.current?.focus();
        } else {
          document.getElementById('to-field')?.focus();
        }
      }, 100);
    }
  }, [isOpen, replyTo, forwardEmail, setValue]);

  const onSubmit = async (data: ComposeForm) => {
    if (!currentAlias) {
      toast.error('请选择发送别名');
      return;
    }

    setIsLoading(true);
    try {
      const emailData = {
        alias_id: currentAlias.id,
        to: data.to.split(',').map(email => email.trim()).filter(Boolean),
        subject: data.subject,
        body_text: data.body,
        cc: data.cc ? data.cc.split(',').map(email => email.trim()).filter(Boolean) : undefined,
        bcc: data.bcc ? data.bcc.split(',').map(email => email.trim()).filter(Boolean) : undefined,
      };

      await emailService.sendEmail(emailData);
      toast.success('邮件发送成功');
      onEmailSent();
      handleClose();
    } catch (error) {
      // 错误已在service中处理
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    onClose();
    reset();
    setShowCc(false);
    setShowBcc(false);
  };

  const getModalTitle = () => {
    if (replyTo) return '回复邮件';
    if (forwardEmail) return '转发邮件';
    return '写邮件';
  };

  const parseEmails = (emailString: string) => {
    return emailString.split(',').map(email => email.trim()).filter(Boolean);
  };

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
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-4xl transform overflow-hidden rounded-2xl bg-white shadow-xl transition-all">
                <form onSubmit={handleSubmit(onSubmit)}>
                  {/* 头部 */}
                  <div className="flex items-center justify-between p-6 border-b border-gray-200">
                    <Dialog.Title className="text-lg font-medium text-gray-900">
                      {getModalTitle()}
                    </Dialog.Title>
                    <button
                      type="button"
                      onClick={handleClose}
                      className="text-gray-400 hover:text-gray-500"
                    >
                      <XMarkIcon className="h-6 w-6" />
                    </button>
                  </div>

                  {/* 表单内容 */}
                  <div className="p-6 space-y-4">
                    {/* 发件人 */}
                    <div className="flex items-center">
                      <label className="w-16 text-sm font-medium text-gray-700">
                        从:
                      </label>
                      <div className="flex-1">
                        <span className="text-sm text-gray-900">
                          {currentAlias?.display_name || currentAlias?.alias_name} &lt;{currentAlias?.full_email}&gt;
                        </span>
                      </div>
                    </div>

                    {/* 收件人 */}
                    <div className="flex items-center">
                      <label htmlFor="to-field" className="w-16 text-sm font-medium text-gray-700">
                        到:
                      </label>
                      <div className="flex-1">
                        <input
                          id="to-field"
                          {...register('to', {
                            required: '收件人不能为空',
                          })}
                          type="text"
                          className={`w-full border-0 focus:ring-0 focus:border-b-2 focus:border-primary-500 text-sm ${errors.to ? 'border-b-2 border-red-500' : 'border-b border-gray-300'}`}
                          placeholder="输入收件人邮箱，多个邮箱用逗号分隔"
                        />
                        {errors.to && (
                          <p className="mt-1 text-sm text-red-600">{errors.to.message}</p>
                        )}
                      </div>
                      <div className="ml-4 space-x-2">
                        <button
                          type="button"
                          onClick={() => setShowCc(!showCc)}
                          className="text-sm text-primary-600 hover:text-primary-800"
                        >
                          抄送
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowBcc(!showBcc)}
                          className="text-sm text-primary-600 hover:text-primary-800"
                        >
                          密送
                        </button>
                      </div>
                    </div>

                    {/* 抄送 */}
                    {showCc && (
                      <div className="flex items-center">
                        <label className="w-16 text-sm font-medium text-gray-700">
                          抄送:
                        </label>
                        <div className="flex-1">
                          <input
                            {...register('cc')}
                            type="text"
                            className="w-full border-0 focus:ring-0 focus:border-b-2 focus:border-primary-500 border-b border-gray-300 text-sm"
                            placeholder="输入抄送邮箱，多个邮箱用逗号分隔"
                          />
                        </div>
                      </div>
                    )}

                    {/* 密送 */}
                    {showBcc && (
                      <div className="flex items-center">
                        <label className="w-16 text-sm font-medium text-gray-700">
                          密送:
                        </label>
                        <div className="flex-1">
                          <input
                            {...register('bcc')}
                            type="text"
                            className="w-full border-0 focus:ring-0 focus:border-b-2 focus:border-primary-500 border-b border-gray-300 text-sm"
                            placeholder="输入密送邮箱，多个邮箱用逗号分隔"
                          />
                        </div>
                      </div>
                    )}

                    {/* 主题 */}
                    <div className="flex items-center">
                      <label className="w-16 text-sm font-medium text-gray-700">
                        主题:
                      </label>
                      <div className="flex-1">
                        <input
                          {...register('subject', {
                            required: '主题不能为空',
                          })}
                          type="text"
                          className={`w-full border-0 focus:ring-0 focus:border-b-2 focus:border-primary-500 text-sm ${errors.subject ? 'border-b-2 border-red-500' : 'border-b border-gray-300'}`}
                          placeholder="输入邮件主题"
                        />
                        {errors.subject && (
                          <p className="mt-1 text-sm text-red-600">{errors.subject.message}</p>
                        )}
                      </div>
                    </div>

                    {/* 正文 */}
                    <div className="mt-6">
                      <textarea
                        ref={bodyRef}
                        {...register('body', {
                          required: '邮件内容不能为空',
                        })}
                        rows={15}
                        className={`w-full border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 text-sm ${errors.body ? 'border-red-300' : ''}`}
                        placeholder="输入邮件内容..."
                      />
                      {errors.body && (
                        <p className="mt-1 text-sm text-red-600">{errors.body.message}</p>
                      )}
                    </div>
                  </div>

                  {/* 底部操作栏 */}
                  <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
                    <div className="flex items-center space-x-4">
                      <button
                        type="submit"
                        disabled={isLoading}
                        className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isLoading ? (
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
                            发送中...
                          </>
                        ) : (
                          '发送'
                        )}
                      </button>
                      
                      <button
                        type="button"
                        className="btn-secondary"
                      >
                        <PaperClipIcon className="h-4 w-4 mr-2" />
                        添加附件
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={handleClose}
                      className="text-sm text-gray-500 hover:text-gray-700"
                    >
                      取消
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