'use client';

import { useState } from 'react';
import { setActiveBranch } from '@/app/actions/auth-actions';

export default function BranchSelector({ branches, currentBranchId }: { branches: any[], currentBranchId: string }) {
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setIsLoading(true);
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('caanma_user_permissions');
        localStorage.removeItem('caanma_user_is_admin');
      }
      await setActiveBranch(val);
      window.location.reload();
    } catch (err) {
      console.error("Error setting active branch:", err);
      setIsLoading(false);
    }
  };

  return (
    <select 
      value={currentBranchId}
      onChange={handleChange}
      disabled={isLoading || branches.length <= 1}
      style={{
        fontWeight: '600',
        fontSize: '0.85rem',
        padding: '0.4rem 2rem 0.4rem 1rem',
        borderRadius: '9999px',
        border: '1px solid #e2e8f0',
        backgroundColor: '#f8fafc',
        cursor: 'pointer',
        outline: 'none',
        color: '#1e293b',
        maxWidth: '180px',
        appearance: 'none',
        backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'></polyline></svg>")`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 0.75rem center',
        backgroundSize: '1rem',
        transition: 'all 0.2s ease-in-out',
        boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        overflow: 'hidden'
      }}
    >
      {branches.map(b => (
        <option key={b.id} value={b.id}>{b.name}</option>
      ))}
    </select>
  );
}
