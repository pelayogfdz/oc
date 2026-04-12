'use client';

import { useTransition } from 'react';
import { setActiveBranch } from '@/app/actions/auth';

export default function BranchSelector({ branches, currentBranchId }: { branches: any[], currentBranchId: string }) {
  const [isPending, startTransition] = useTransition();

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    startTransition(() => {
      setActiveBranch(e.target.value);
    });
  };

  return (
    <select 
      value={currentBranchId}
      onChange={handleChange}
      disabled={isPending}
      style={{
        fontWeight: 'bold',
        fontSize: '0.875rem',
        padding: '0.25rem 0.5rem',
        borderRadius: '4px',
        border: '1px solid var(--pulpos-border)',
        backgroundColor: '#f8fafc',
        cursor: 'pointer',
        outline: 'none',
        color: '#1e293b',
        maxWidth: '200px'
      }}
    >
      {branches.map(b => (
        <option key={b.id} value={b.id}>{b.name}</option>
      ))}
    </select>
  );
}
