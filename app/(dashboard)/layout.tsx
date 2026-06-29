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
import CollaboratorTaskPopup from '../components/CollaboratorTaskPopup';
import PriceChangesAlertPopup from '../components/PriceChangesAlertPopup';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('session')?.value;

  let user = null;
  let activeUserError = null;
  try {
    user = await getActiveUser();
  } catch (err: any) {
    activeUserError = err.message || 'Session error';
  }

  // Si la cookie de sesión existe pero no pudimos obtener un usuario válido (ej. sesión cerrada o kick-out)
  if (sessionCookie && !user) {
    try {
      cookieStore.delete('session');
    } catch (cookieErr) {
      console.error('Failed to delete session cookie on invalid layout session:', cookieErr);
    }
    let redirectUrl = '/login?open=true';
    if (activeUserError) {
      redirectUrl += `&error=${encodeURIComponent(activeUserError)}`;
    }
    redirect(redirectUrl);
  }

  const tenantSettings = await getTenantSettings().catch(() => ({ decimals: 2 }));
  
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
        const rawPermissions = (user as any).customRole?.permissions || user.permissions;
        if (rawPermissions) {
          const parsed = JSON.parse(rawPermissions);
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
        {user && <CollaboratorTaskPopup userId={user.id} />}
        {user && <PriceChangesAlertPopup />}
      </MobileMenuProvider>
    </OfflineSyncProvider>
  );
}
