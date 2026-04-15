import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { MobileMenuProvider } from '../components/MobileMenuContext';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <MobileMenuProvider>
      <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
        <Sidebar />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <Header />
          <main className="dashboard-main" style={{ flex: 1, padding: '2rem', overflowY: 'auto' }}>
            {children}
          </main>
        </div>
      </div>
    </MobileMenuProvider>
  );
}
