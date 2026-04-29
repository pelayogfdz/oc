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
import { decrypt } from '@/lib/session';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const tenantSettings = await getTenantSettings().catch(() => ({ decimals: 2 }));
  const sessionCookie = (await cookies()).get('session')?.value;
  const session = await decrypt(sessionCookie);
  
  let isSuperAdmin = false;
  let userRole = 'USER';
  let subscriptionStatus = 'ACTIVE';

  if (session?.userId) {
    const user = await prisma.user.findUnique({ 
      where: { id: session.userId as string }, 
      select: { isSuperAdmin: true, email: true, role: true, tenant: { select: { subscriptionStatus: true } } }
    });
    
    if (user) {
      userRole = user.role;
      if (user.tenant) {
        subscriptionStatus = user.tenant.subscriptionStatus;
      }
      isSuperAdmin = user.email?.toLowerCase() === 'pelayogfdz@gmail.com';
    }
  }

  return (
    <OfflineSyncProvider>
      <TenantSettingsInjector decimals={tenantSettings.decimals} />
      <MobileMenuProvider>
        <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
          <DesktopSidebarWrapper>
            <Sidebar isSuperAdmin={isSuperAdmin} />
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
        <MobileGridMenu isSuperAdmin={isSuperAdmin} />
        <MobileBottomNav />
      </MobileMenuProvider>
    </OfflineSyncProvider>
  );
}
