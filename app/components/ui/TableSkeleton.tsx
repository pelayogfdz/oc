'use client';

import React from 'react';

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
  className?: string;
}

export function TableSkeleton({ rows = 5, columns = 6, className = '' }: TableSkeletonProps) {
  return (
    <div className={`w-full overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 animate-pulse ${className}`}>
      {/* Table Header Skeleton */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 p-4 gap-4">
        {Array.from({ length: columns }).map((_, i) => (
          <div
            key={`header-${i}`}
            className="h-4 bg-slate-200 dark:bg-slate-700 rounded-md"
            style={{ width: `${Math.max(40, 100 - i * 12)}px` }}
          />
        ))}
      </div>

      {/* Table Rows Skeleton */}
      <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={`row-${rowIndex}`} className="flex items-center p-4 gap-4">
            {Array.from({ length: columns }).map((_, colIndex) => {
              const widthRandom = 35 + ((rowIndex * 7 + colIndex * 13) % 45);
              return (
                <div
                  key={`cell-${rowIndex}-${colIndex}`}
                  className="h-3.5 bg-slate-100 dark:bg-slate-800 rounded"
                  style={{ width: `${colIndex === 0 ? 120 : widthRandom}%` }}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

export function CardSkeleton({ count = 3, className = '' }: { count?: number; className?: string }) {
  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={`card-skel-${i}`}
          className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm animate-pulse flex flex-col gap-3"
        >
          <div className="flex items-center justify-between">
            <div className="h-4 w-28 bg-slate-200 dark:bg-slate-700 rounded" />
            <div className="h-8 w-8 bg-slate-100 dark:bg-slate-800 rounded-xl" />
          </div>
          <div className="h-7 w-36 bg-slate-200 dark:bg-slate-700 rounded-lg" />
          <div className="h-3 w-20 bg-slate-100 dark:bg-slate-800 rounded" />
        </div>
      ))}
    </div>
  );
}
