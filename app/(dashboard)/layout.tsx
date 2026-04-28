import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { MobileMenuProvider } from '../components/MobileMenuContext';
import MobileBottomNav from '../components/MobileBottomNav';
import MobileGridMenu from '../components/MobileGridMenu';
import { OfflineSyncProvider } from '../components/OfflineSyncProvider';
import DesktopSidebarWrapper from '../components/DesktopSidebarWrapper';
import { getTenantSettings } from '../actions/settings';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const tenantSettings = await getTenantSettings().catch(() => ({ decimals: 2 }));

  return (
    <OfflineSyncProvider>
      <script dangerouslySetInnerHTML={{ __html: `window.__TENANT_DECIMALS__ = ${tenantSettings.decimals};` }} />
      <MobileMenuProvider>
        <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
          <DesktopSidebarWrapper>
            <Sidebar />
          </DesktopSidebarWrapper>
          <div className="dashboard-content-wrapper" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <Header />
            <main className="dashboard-main" style={{ flex: 1, padding: '2rem', overflowY: 'auto' }}>
              {children}
            </main>
          </div>
        </div>
        <MobileGridMenu />
        <MobileBottomNav />
      </MobileMenuProvider>
    </OfflineSyncProvider>
  );
}
