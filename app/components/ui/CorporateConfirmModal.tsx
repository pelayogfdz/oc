'use client';

import React, { useEffect, useState } from 'react';
import { AlertTriangle, Info, CheckCircle, X, Loader2 } from 'lucide-react';

export interface CorporateConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string | React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'primary' | 'success';
  onConfirm: () => Promise<void> | void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function CorporateConfirmModal({
  isOpen,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  variant = 'danger',
  onConfirm,
  onCancel,
  isLoading = false
}: CorporateConfirmModalProps) {
  const [internalLoading, setInternalLoading] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    try {
      setInternalLoading(true);
      await onConfirm();
    } finally {
      setInternalLoading(false);
    }
  };

  const loading = isLoading || internalLoading;

  const getIcon = () => {
    switch (variant) {
      case 'danger':
        return (
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 ring-8 ring-rose-50 dark:ring-rose-950/20">
            <AlertTriangle className="h-6 w-6" />
          </div>
        );
      case 'warning':
        return (
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 ring-8 ring-amber-50 dark:ring-amber-950/20">
            <AlertTriangle className="h-6 w-6" />
          </div>
        );
      case 'success':
        return (
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 ring-8 ring-emerald-50 dark:ring-emerald-950/20">
            <CheckCircle className="h-6 w-6" />
          </div>
        );
      default:
        return (
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 ring-8 ring-indigo-50 dark:ring-indigo-950/20">
            <Info className="h-6 w-6" />
          </div>
        );
    }
  };

  const getConfirmButtonClass = () => {
    switch (variant) {
      case 'danger':
        return 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-500/20 focus:ring-rose-500';
      case 'warning':
        return 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-500/20 focus:ring-amber-500';
      case 'success':
        return 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20 focus:ring-emerald-500';
      default:
        return 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-500/20 focus:ring-indigo-500';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-slate-200 dark:border-slate-800 transition-all animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-start justify-between">
          {getIcon()}
          <button
            onClick={onCancel}
            disabled={loading}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4">
          <h3 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
            {title}
          </h3>
          <div className="mt-2 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            {message}
          </div>
        </div>

        <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
          <button
            type="button"
            disabled={loading}
            onClick={onCancel}
            className="w-full sm:w-auto inline-flex justify-center items-center rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all duration-150 disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={handleConfirm}
            className={`w-full sm:w-auto inline-flex justify-center items-center rounded-xl px-5 py-2.5 text-sm font-semibold shadow-lg transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 ${getConfirmButtonClass()}`}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
