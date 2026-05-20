import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { MobileMenuProvider } from '../components/MobileMenuContext';
import MobileBottomNav from '../components/MobileBottomNav';
import MobileGridMenu from '../components/MobileGridMenu';
import { OfflineSyncProvider } from '../components/OfflineSyncProvider';
import DesktopSidebarWrapper from '../components/DesktopSidebarWrapper';
import { getTenantSettings } from '../actions/settings';
import TenantSettingsInjector from '../components/TenantSettingsInjector';
import SubscriptionGuard from '../components/SubscriptionGuard';
import { cookies } from 'next/headers';
import { getActiveUser } from '@/app/actions/auth';
import { prisma } from '@/lib/prisma';
import FloatingWhatsappWidget from '../components/FloatingWhatsappWidget';

export const dynamic = 'force-dynamic';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [tenantSettings, user] = await Promise.all([
    getTenantSettings().catch(() => ({ decimals: 2 })),
    getActiveUser().catch(() => null)
  ]);
  
  let isSuperAdmin = false;
  let userRole = 'USER';
  let subscriptionStatus = 'ACTIVE';
  let userPermissions: Record<string, boolean> = {};

  if (user) {
      userRole = user.role;
      if (user.tenant) {
        subscriptionStatus = user.tenant.subscriptionStatus;
      }
      isSuperAdmin = user.email?.toLowerCase() === 'pelayogfdz@gmail.com';
      try {
        if (user.permissions) {
          const parsed = JSON.parse(user.permissions);
          if (Array.isArray(parsed)) {
            parsed.forEach((p: string) => userPermissions[p] = true);
          } else {
            userPermissions = parsed;
          }
        }
      } catch (e) {}
    }

  return (
    <OfflineSyncProvider>
      <TenantSettingsInjector decimals={tenantSettings.decimals} />
      <MobileMenuProvider>
        <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
          <DesktopSidebarWrapper>
            <Sidebar isSuperAdmin={isSuperAdmin} userPermissions={userPermissions} userRole={userRole} />
          </DesktopSidebarWrapper>
          <div className="dashboard-content-wrapper" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <Header />
            <main className="dashboard-main" style={{ flex: 1, padding: '2rem', overflowY: 'auto' }}>
              <SubscriptionGuard status={subscriptionStatus} role={userRole} isSuperAdmin={isSuperAdmin}>
                {children}
              </SubscriptionGuard>
            </main>
          </div>
        </div>
        <MobileGridMenu isSuperAdmin={isSuperAdmin} userPermissions={userPermissions} userRole={userRole} />
        <MobileBottomNav />
        {user && <FloatingWhatsappWidget />}
      </MobileMenuProvider>
    </OfflineSyncProvider>
  );
}
