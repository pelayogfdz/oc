import { getActiveBranch, getActiveUser, logout, getTenantBranches } from '@/app/actions/auth';
import { prisma } from '@/lib/prisma';
import BranchSelector from './BranchSelector';
import MobileMenuToggle from './MobileMenuToggle';
import DesktopMenuToggle from './DesktopMenuToggle';
import HeaderNetworkStatus from './HeaderNetworkStatus';
import HeaderTitle from './HeaderTitle';
import GlobalSearch from './GlobalSearch';
import Link from 'next/link';
import { Sparkles } from 'lucide-react';

export default async function Header() {
  const [currentBranch, currentUser] = await Promise.all([
    getActiveBranch().catch(() => null),
    getActiveUser().catch(() => null)
  ]);
  
  const branches = currentUser?.tenantId ? await getTenantBranches(currentUser.tenantId) : [];


  // Filter branches based on permissions
  let visibleBranches = branches;
  let isGlobal = currentUser?.role === 'ADMIN' || currentUser?.email?.toLowerCase() === 'pelayogfdz@gmail.com';
  const allowedBranchIds: string[] = [];

  if (currentUser) {
    if (currentUser.permissions) {
      try {
        const parsed = JSON.parse(currentUser.permissions);
        const permArr = Array.isArray(parsed) ? parsed : Object.keys(parsed).filter(k => parsed[k]);
        if (permArr.includes('GLOBAL_VIEW')) {
          isGlobal = true;
        }
        permArr.forEach((p: string) => {
          if (p.startsWith('__BRANCH_')) {
            allowedBranchIds.push(p.replace('__BRANCH_', ''));
          }
        });
      } catch (e) {}
    }
    if (currentUser.branchId && !allowedBranchIds.includes(currentUser.branchId)) {
      allowedBranchIds.push(currentUser.branchId);
    }
  }

  if (!isGlobal) {
    visibleBranches = branches.filter(b => allowedBranchIds.includes(b.id));
    // Fallback if no branches assigned
    if (visibleBranches.length === 0 && branches.length > 0) {
      visibleBranches = [branches[0]];
    }
  }

  const finalOptions = isGlobal 
    ? [{ id: 'GLOBAL', name: '🌎 Todas las Sucursales' }, ...visibleBranches]
    : visibleBranches;

  return (
    <header className="dashboard-header" style={{
      height: '64px',
      backgroundColor: 'var(--pulpos-card-bg)',
      borderBottom: '1px solid var(--pulpos-border)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 1rem',
      flexShrink: 0
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <MobileMenuToggle />
        <DesktopMenuToggle />
        <HeaderTitle />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <HeaderNetworkStatus />
        <div className="desktop-only-header-item">
          <GlobalSearch />
        </div>
        
        {/* IA Shortcut Link */}
        <Link 
          href="/ia" 
          className="desktop-only-header-item header-ia-link"
        >
          <Sparkles size={14} style={{ color: '#3b82f6' }} />
          <span>IA</span>
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {currentUser?.email?.toLowerCase() !== 'pelayogfdz@gmail.com' && (
            <div>
              <BranchSelector branches={finalOptions} currentBranchId={currentBranch?.id || ''} />
            </div>
          )}
          
          <div className="header-user-info" style={{ textAlign: 'right' }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: '500' }}>{currentUser?.name || 'Usuario'}</span>
              <span style={{ color: '#cbd5e1', fontSize: '0.75rem' }}>|</span>
              <form action={async () => { 'use server'; await logout(); }} style={{ margin: 0, padding: 0, display: 'inline' }}>
                 <button type="submit" style={{ background: 'none', border: 'none', padding: 0, margin: 0, color: '#ef4444', fontSize: '0.75rem', cursor: 'pointer', fontWeight: '600' }}>
                   Salir
                 </button>
              </form>
            </div>
          </div>
          
          <div style={{ 
            width: '32px', 
            height: '32px', 
            borderRadius: '50%', 
            backgroundColor: 'var(--pulpos-primary)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            fontWeight: '700', 
            fontSize: '0.8rem',
            color: 'white',
            flexShrink: 0,
            boxShadow: '0 0 0 2px #fff, 0 0 0 3px var(--pulpos-primary)'
          }}>
            {currentUser?.name ? currentUser.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'US'}
          </div>
        </div>
      </div>
    </header>
  );
}
