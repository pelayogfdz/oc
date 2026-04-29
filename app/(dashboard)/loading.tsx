import { Loader2 } from "lucide-react";

export default function DashboardLoading() {
  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      minHeight: '60vh',
      gap: '1rem',
      color: '#6b7280'
    }}>
      <Loader2 size={48} className="spin-animation" style={{ animation: 'spin 1s linear infinite' }} />
      <h2 style={{ fontSize: '1.25rem', fontWeight: '500' }}>Cargando módulo...</h2>
      
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
