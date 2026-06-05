'use client';

import { useTransition } from 'react';
import { setActiveBranch } from '@/app/actions/auth';

export default function BranchSelector({ branches, currentBranchId }: { branches: any[], currentBranchId: string }) {
  const [isPending, startTransition] = useTransition();

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    startTransition(async () => {
      await setActiveBranch(val);
      window.location.reload();
    });
  };

  return (
    <select 
      value={currentBranchId}
      onChange={handleChange}
      disabled={isPending || branches.length <= 1}
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
