import { getActiveBranch, getActiveUser } from '@/app/actions/auth';
import { prisma } from '@/lib/prisma';
import BranchSelector from './BranchSelector';
import MobileMenuToggle from './MobileMenuToggle';
import HeaderNetworkStatus from './HeaderNetworkStatus';
import PwaInstallButton from './PwaInstallButton';

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
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <MobileMenuToggle />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <PwaInstallButton />
        <HeaderNetworkStatus />

        <div className="header-user-info" style={{ textAlign: 'right' }}>
          <div style={{ marginBottom: '0.25rem' }}>
            <BranchSelector branches={finalOptions} currentBranchId={currentBranch?.id || ''} />
          </div>
          <div style={{ color: 'var(--pulpos-text-muted)', fontSize: '0.75rem' }}>{currentUser?.name || 'Usuario'}</div>
        </div>
        <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'var(--pulpos-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: 'white' }}>
          {currentUser?.name ? currentUser.name.split(' ').map(n => n[0]).join('').slice(0, 2) : 'US'}
        </div>
      </div>
    </header>
  );
}
