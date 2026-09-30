import React from 'react';

export interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  subtitle?: string;
  badgeText?: string;
  badgeVariant?: 'success' | 'danger' | 'warning' | 'info' | 'purple' | 'default';
  className?: string;
}

export function StatCard({
  title,
  value,
  icon,
  subtitle,
  badgeText,
  badgeVariant = 'default',
  className = '',
}: StatCardProps) {
  const badgeClasses = {
    default: 'bg-slate-100 text-slate-700',
    success: 'bg-emerald-50 text-emerald-700',
    danger: 'bg-rose-50 text-rose-700',
    warning: 'bg-amber-50 text-amber-700',
    info: 'bg-sky-50 text-sky-700',
    purple: 'bg-purple-50 text-purple-700',
  };

  return (
    <div
      className={`bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 sm:p-6 hover:shadow-md hover:border-slate-300 transition-all duration-200 min-w-0 flex flex-col justify-between ${className}`}
    >
      <div>
        <div className="flex items-center justify-between gap-3 mb-2.5 min-w-0">
          <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 truncate flex-1 min-w-0" title={title}>
            {title}
          </span>
          <div className="w-8 h-8 rounded-xl bg-slate-50 text-slate-600 flex-shrink-0 flex items-center justify-center border border-slate-100/80">
            {icon}
          </div>
        </div>

        <div className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-900 tracking-tight truncate my-1" title={String(value)}>
          {value}
        </div>
      </div>

      {(subtitle || badgeText) && (
        <div className="flex items-center gap-2 mt-2.5 text-xs">
          {badgeText && (
            <span className={`px-2.5 py-0.5 rounded-full font-semibold text-[11px] ${badgeClasses[badgeVariant]}`}>
              {badgeText}
            </span>
          )}
          {subtitle && (
            <span className="text-slate-400 truncate text-[11px]">
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
