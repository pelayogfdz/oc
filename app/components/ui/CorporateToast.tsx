'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastOptions {
  id?: string;
  title?: string;
  message: string;
  type?: ToastType;
  duration?: number; // in ms, default 4000. 0 for sticky
}

interface ToastItem extends ToastOptions {
  id: string;
  type: ToastType;
  duration: number;
  createdAt: number;
}

interface ToastContextType {
  toast: (options: ToastOptions | string) => void;
  success: (message: string, title?: string, duration?: number) => void;
  error: (message: string, title?: string, duration?: number) => void;
  warning: (message: string, title?: string, duration?: number) => void;
  info: (message: string, title?: string, duration?: number) => void;
  dismiss: (id: string) => void;
  clearAll: () => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function CorporateToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setToasts([]);
  }, []);

  const addToast = useCallback((options: ToastOptions | string) => {
    const opts: ToastOptions = typeof options === 'string' ? { message: options } : options;
    const id = opts.id || Math.random().toString(36).substring(2, 9);
    const item: ToastItem = {
      id,
      title: opts.title,
      message: opts.message,
      type: opts.type || 'info',
      duration: opts.duration !== undefined ? opts.duration : 4000,
      createdAt: Date.now()
    };

    setToasts((prev) => [...prev.filter((t) => t.id !== id), item]);

    if (item.duration > 0) {
      setTimeout(() => {
        dismiss(id);
      }, item.duration);
    }
  }, [dismiss]);

  const success = useCallback((message: string, title?: string, duration?: number) => {
    addToast({ message, title, type: 'success', duration });
  }, [addToast]);

  const error = useCallback((message: string, title?: string, duration?: number) => {
    addToast({ message, title, type: 'error', duration: duration || 5500 });
  }, [addToast]);

  const warning = useCallback((message: string, title?: string, duration?: number) => {
    addToast({ message, title, type: 'warning', duration });
  }, [addToast]);

  const info = useCallback((message: string, title?: string, duration?: number) => {
    addToast({ message, title, type: 'info', duration });
  }, [addToast]);

  return (
    <ToastContext.Provider value={{ toast: addToast, success, error, warning, info, dismiss, clearAll }}>
      {children}
      <div
        aria-live="assertive"
        className="pointer-events-none fixed inset-0 z-50 flex flex-col items-end px-4 py-6 sm:p-6 gap-2.5 overflow-hidden"
      >
        {toasts.map((t) => {
          const isSuccess = t.type === 'success';
          const isError = t.type === 'error';
          const isWarning = t.type === 'warning';

          return (
            <div
              key={t.id}
              className={`pointer-events-auto flex w-full max-w-sm transform rounded-xl p-4 shadow-xl border backdrop-blur-md transition-all duration-300 ease-out animate-in fade-in slide-in-from-top-4 sm:slide-in-from-right-4 ${
                isSuccess
                  ? 'bg-emerald-950/90 border-emerald-500/30 text-emerald-100'
                  : isError
                  ? 'bg-rose-950/90 border-rose-500/30 text-rose-100'
                  : isWarning
                  ? 'bg-amber-950/90 border-amber-500/30 text-amber-100'
                  : 'bg-slate-900/95 border-slate-700 text-slate-100'
              }`}
              role="alert"
            >
              <div className="flex-shrink-0 pt-0.5">
                {isSuccess && <CheckCircle2 className="h-5 w-5 text-emerald-400" />}
                {isError && <AlertCircle className="h-5 w-5 text-rose-400" />}
                {isWarning && <AlertTriangle className="h-5 w-5 text-amber-400" />}
                {t.type === 'info' && <Info className="h-5 w-5 text-sky-400" />}
              </div>
              <div className="ml-3 flex-1 min-w-0">
                {t.title && (
                  <p className="text-sm font-semibold tracking-tight text-white mb-0.5">
                    {t.title}
                  </p>
                )}
                <p className="text-xs sm:text-sm text-slate-200 break-words font-medium leading-relaxed">
                  {t.message}
                </p>
              </div>
              <div className="ml-3 flex flex-shrink-0">
                <button
                  type="button"
                  onClick={() => dismiss(t.id)}
                  className="inline-flex rounded-lg p-1 text-slate-400 hover:text-white hover:bg-white/10 transition-colors focus:outline-none"
                >
                  <span className="sr-only">Cerrar</span>
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a CorporateToastProvider');
  }
  return context;
}
