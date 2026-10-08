import { getActiveBranch, getActiveUser, getTenantBranches } from '@/app/actions/auth';
import { logout } from '@/app/actions/auth-actions';
import { prisma } from '@/lib/prisma';
import BranchSelector from './BranchSelector';
import LogoutButton from './LogoutButton';
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
  
  let showGlobalSearch = false;
  let showIAButton = false;

  let activeBranchId = currentBranch?.id;
  if (activeBranchId === 'GLOBAL' && currentUser?.tenantId) {
    const firstBranch = await prisma.branch.findFirst({
      where: { isActive: true, tenantId: currentUser.tenantId },
      select: { id: true }
    });
    if (firstBranch) {
      activeBranchId = firstBranch.id;
    }
  }

  if (activeBranchId && activeBranchId !== 'GLOBAL') {
    const settings = await prisma.branchSettings.findUnique({
      where: { branchId: activeBranchId },
      select: { configJson: true }
    });
    if (settings && settings.configJson) {
      try {
        const parsed = JSON.parse(settings.configJson);
        showGlobalSearch = parsed.general?.enableGlobalSearch === 'true' || parsed.general?.enableGlobalSearch === true;
        showIAButton = parsed.general?.enableIAButton === 'true' || parsed.general?.enableIAButton === true;
      } catch (e) {}
    }
  }

  const branches = currentUser?.tenantId ? await getTenantBranches(currentUser.tenantId) : [];


  // Filter branches based on permissions
  let visibleBranches = branches;
  let isGlobal = currentUser?.role === 'ADMIN' || currentUser?.email?.toLowerCase() === 'pelayogfdz@gmail.com';
  const allowedBranchIds: string[] = [];

  if (currentUser) {
    const rolePermissions = (currentUser as any).customRole?.permissions;
    const userPermissionsRaw = currentUser.permissions;
    const mergedList: string[] = [];

    if (rolePermissions) {
      try {
        const parsed = JSON.parse(rolePermissions);
        if (Array.isArray(parsed)) mergedList.push(...parsed);
        else Object.keys(parsed).forEach((k) => { if (parsed[k]) mergedList.push(k); });
      } catch (e) {}
    }

    if (userPermissionsRaw) {
      try {
        const parsed = JSON.parse(userPermissionsRaw);
        if (Array.isArray(parsed)) mergedList.push(...parsed);
        else Object.keys(parsed).forEach((k) => { if (parsed[k]) mergedList.push(k); });
      } catch (e) {}
    }

    if (mergedList.length > 0) {
      try {
        if (mergedList.includes('GLOBAL_VIEW')) {
          isGlobal = true;
        }
        mergedList.forEach((p: string) => {
          if (p.startsWith('__BRANCH_')) {
            const branchId = p.replace('__BRANCH_', '');
            if (!allowedBranchIds.includes(branchId)) {
              allowedBranchIds.push(branchId);
            }
          }
        });
      } catch (e) {}
    }

    if (currentUser.branchId && !allowedBranchIds.includes(currentUser.branchId)) {
      allowedBranchIds.push(currentUser.branchId);
    }

    // Restrict allowedBranchIds to ONLY the assigned branch if limited (non-global) and has one assigned
    // (Commented out to support multiple branch permissions)
    // if (!isGlobal && currentUser.branchId) {
    //   allowedBranchIds.splice(0, allowedBranchIds.length, currentUser.branchId);
    // }
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
    <header className="dashboard-header h-16 bg-white border-b border-slate-200/90 px-4 sm:px-6 flex items-center justify-between flex-shrink-0 shadow-2xs z-20">
      <div className="flex items-center gap-3">
        <MobileMenuToggle />
        <DesktopMenuToggle />
        <HeaderTitle />
      </div>
      <div className="header-right-section flex items-center gap-3">
        <HeaderNetworkStatus />
        {showGlobalSearch && (
          <div className="desktop-only-header-item">
            <GlobalSearch />
          </div>
        )}
        
        {/* IA Shortcut Link */}
        {showIAButton && (
          <Link 
            href="/ia" 
            className="desktop-only-header-item inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200/80 hover:bg-blue-100 transition-all"
          >
            <Sparkles size={14} className="text-blue-600" />
            <span>IA</span>
          </Link>
        )}

        <div className="header-user-controls flex items-center gap-3">
          {currentUser && (
            <div className="header-branch-selector-wrapper">
              <BranchSelector branches={finalOptions} currentBranchId={currentBranch?.id || ''} />
            </div>
          )}
          
          <div className="header-user-info text-right">
            <div className="flex items-center justify-end gap-1.5">
              <span className="text-xs font-bold text-slate-800">{currentUser?.name || 'Usuario'}</span>
              <span className="text-slate-300 text-xs">|</span>
              <LogoutButton />
            </div>
          </div>
          
          <div className="header-user-avatar w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold text-xs flex-shrink-0 shadow-sm shadow-purple-500/20 ring-2 ring-purple-100">
            {currentUser?.name ? currentUser.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'US'}
          </div>
        </div>
      </div>
      <style>{`
        @media (max-width: 768px) {
          .header-user-info {
            display: none !important;
          }
          .header-module-title {
            font-size: 1.05rem !important;
          }
          .header-right-section {
            gap: 0.5rem !important;
          }
          .header-user-controls {
            gap: 0.5rem !important;
          }
        }
        @media (max-width: 480px) {
          .header-branch-selector-wrapper {
            max-width: 90px !important;
            overflow: hidden;
          }
          .dashboard-header {
            padding: 0 0.5rem !important;
          }
        }
      `}</style>
    </header>
  );
}
