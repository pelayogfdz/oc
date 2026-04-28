import { getActiveBranch, getActiveUser, logout } from '@/app/actions/auth';
import { prisma } from '@/lib/prisma';
import BranchSelector from './BranchSelector';
import MobileMenuToggle from './MobileMenuToggle';
import DesktopMenuToggle from './DesktopMenuToggle';
import HeaderNetworkStatus from './HeaderNetworkStatus';
import HeaderTitle from './HeaderTitle';

export default async function Header() {
  const currentBranch = await getActiveBranch();
  const currentUser = await getActiveUser();
  
  const branches = await prisma.branch.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' }
  });

  // Filter branches based on permissions
  let visibleBranches = branches;
  const isGlobal = currentUser?.role === 'ADMIN' || currentUser?.permissions?.includes('GLOBAL_VIEW');
  
  if (!isGlobal && currentUser?.permissions) {
    visibleBranches = branches.filter(b => currentUser.permissions?.includes(`__BRANCH_${b.id}`));
    // Fallback if no branches assigned
    if (visibleBranches.length === 0 && branches.length > 0) visibleBranches = [branches[0]];
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

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div className="header-user-info" style={{ textAlign: 'right' }}>
            <div style={{ marginBottom: '0.25rem' }}>
              {currentUser?.email !== 'pelayogfdz@gmail.com' && (
                <BranchSelector branches={finalOptions} currentBranchId={currentBranch?.id || ''} />
              )}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ color: 'var(--pulpos-text-muted)', fontSize: '0.75rem' }}>{currentUser?.name || 'Usuario'}</span>
              <form action={async () => { 'use server'; await logout(); }} style={{ margin: 0, padding: 0 }}>
                 <button type="submit" style={{ background: 'none', border: 'none', padding: 0, margin: 0, color: '#ef4444', fontSize: '0.75rem', cursor: 'pointer', textDecoration: 'underline', fontWeight: 'bold' }}>
                   Salir
                 </button>
              </form>
            </div>
          </div>
          <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'var(--pulpos-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: 'white' }}>
            {currentUser?.name ? currentUser.name.split(' ').map(n => n[0]).join('').slice(0, 2) : 'US'}
          </div>
        </div>
      </div>
    </header>
  );
}
