'use client';

import { useState } from 'react';
import { setActiveBranch } from '@/app/actions/auth';

export default function BranchSelector({ branches, currentBranchId }: { branches: any[], currentBranchId: string }) {
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setIsLoading(true);
    try {
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
        fontWeight: 'bold',
        fontSize: '0.875rem',
        padding: '0.25rem 0.5rem',
        borderRadius: '4px',
        border: '1px solid var(--pulpos-border)',
        backgroundColor: 'var(--pulpos-bg)',
        cursor: 'pointer',
        outline: 'none',
        color: 'var(--pulpos-text)',
        maxWidth: '200px'
      }}
    >
      {branches.map(b => (
        <option key={b.id} value={b.id}>{b.name}</option>
      ))}
    </select>
  );
}
