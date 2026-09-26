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
      className={`bg-white rounded-2xl border border-slate-100 shadow-sm p-6 sm:p-7 md:p-8 hover:shadow-md hover:border-slate-200 transition-all duration-200 min-w-0 ${className}`}
    >
      <div className="flex items-start justify-between mb-3 gap-2">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 truncate" title={title}>
          {title}
        </span>
        <div className="p-2 rounded-xl bg-slate-50 text-slate-600 flex-shrink-0">
          {icon}
        </div>
      </div>

      <div className="text-2xl lg:text-3xl font-black text-slate-800 tracking-tight truncate" title={String(value)}>
        {value}
      </div>

      {(subtitle || badgeText) && (
        <div className="flex items-center gap-2 mt-2 text-xs">
          {badgeText && (
            <span className={`px-2 py-0.5 rounded-full font-semibold ${badgeClasses[badgeVariant]}`}>
              {badgeText}
            </span>
          )}
          {subtitle && (
            <span className="text-slate-400 truncate">
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
