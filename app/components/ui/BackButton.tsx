'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

export interface BackButtonProps {
  fallbackHref?: string;
  label?: string;
  className?: string;
  style?: React.CSSProperties;
  showIcon?: boolean;
  iconSize?: number;
  children?: React.ReactNode;
}

export default function BackButton({
  fallbackHref = '/',
  label = 'Volver',
  className = '',
  style,
  showIcon = true,
  iconSize = 18,
  children
}: BackButtonProps) {
  const router = useRouter();

  const handleBack = (e: React.MouseEvent) => {
    e.preventDefault();
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    } else if (fallbackHref) {
      router.push(fallbackHref);
    }
  };

  return (
    <button
      type="button"
      onClick={handleBack}
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.4rem',
        background: 'none',
        border: 'none',
        padding: 0,
        cursor: 'pointer',
        color: 'var(--caanma-text-muted, #64748b)',
        fontWeight: 600,
        fontSize: '0.9rem',
        textDecoration: 'none',
        ...style
      }}
    >
      {showIcon && <ArrowLeft size={iconSize} />}
      {children || <span>{label}</span>}
    </button>
  );
}

export { BackButton };
