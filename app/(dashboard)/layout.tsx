import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { MobileMenuProvider } from '../components/MobileMenuContext';
import MobileBottomNav from '../components/MobileBottomNav';
import MobileGridMenu from '../components/MobileGridMenu';
import { OfflineSyncProvider } from '../components/OfflineSyncProvider';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <OfflineSyncProvider>
      <MobileMenuProvider>
        <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
          <div className="desktop-sidebar-wrapper">
            <Sidebar />
          </div>
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
