"use client";

import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";

export default function WhatsAppConfigClient({ initialSession }: { initialSession: any }) {
  const [session, setSession] = useState(initialSession);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Poll the status every 3 seconds if not connected
    if (session?.status !== 'CONNECTED' && session?.branchId) {
      const interval = setInterval(async () => {
        try {
          const res = await fetch(`/api/whatsapp/status?branchId=${session.branchId}&t=${Date.now()}`, { cache: 'no-store' });
          const data = await res.json();
          if (data && data.session) {
            setSession(data.session);
          }
        } catch (e) {
          console.error(e);
        }
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [session?.status, session?.branchId]);

  const handleLogout = async () => {
    if (!session?.branchId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/whatsapp/logout?branchId=${session.branchId}`, { method: 'POST' });
      if (res.ok) {
        setSession({ ...session, status: 'DISCONNECTED', sessionData: null });
      }
    } catch (e) {
      console.error("Error al cerrar sesión", e);
    } finally {
      setLoading(false);
    }
  };

  let connectedPhone = null;
  if (session?.status === 'CONNECTED' && session?.sessionData) {
    try {
      const parsed = JSON.parse(session.sessionData);
      connectedPhone = parsed.phone;
    } catch (e) {
      // Ignore if not valid JSON
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
      {session?.status === 'DISCONNECTED' && (
        <>
          <div style={{ width: 80, height: 80, borderRadius: '50%', backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
          </div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '600' }}>WhatsApp Desconectado</h2>
          <p style={{ color: 'var(--pulpos-text-muted)' }}>El microservicio de WhatsApp se está iniciando o necesita conectarse.</p>
          <button 
            onClick={handleLogout}
            disabled={loading}
            style={{
              marginTop: '0.5rem',
              padding: '0.75rem 2rem',
              backgroundColor: loading ? '#cbd5e1' : '#4f46e5',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontWeight: '600',
              fontSize: '0.95rem',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              boxShadow: '0 4px 6px -1px rgba(79, 70, 229, 0.2)'
            }}
            onMouseEnter={e => { if (!loading) e.currentTarget.style.backgroundColor='#4338ca'; }}
            onMouseLeave={e => { if (!loading) e.currentTarget.style.backgroundColor='#4f46e5'; }}
          >
            {loading ? 'Generando QR...' : 'Generar Código QR / Vincular Celular ⚡'}
          </button>
          <div style={{ padding: '1rem', backgroundColor: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: '8px', fontSize: '0.875rem', marginTop: '0.5rem' }}>
            Al hacer clic en el botón de arriba, se forzará la inicialización de un lector de QR nuevo y limpio para tu cuenta.
          </div>
        </>
      )}

      {session?.status === 'QR_READY' && session?.sessionData && (
        <>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '600' }}>Escanea el Código QR</h2>
          <p style={{ color: 'var(--pulpos-text-muted)', marginBottom: '1rem' }}>Abre WhatsApp en tu teléfono, ve a "Dispositivos vinculados" y escanea este código.</p>
          <div style={{ padding: '1rem', backgroundColor: 'white', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)', display: 'inline-block' }}>
            <QRCodeSVG value={session.sessionData} size={256} />
          </div>
        </>
      )}

      {session?.status === 'CONNECTED' && (
        <>
          <div style={{ width: 80, height: 80, borderRadius: '50%', backgroundColor: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#166534" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          </div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#166534' }}>WhatsApp Conectado</h2>
          <p style={{ color: 'var(--pulpos-text-muted)', textAlign: 'center' }}>
            El sistema está listo para enviar y recibir mensajes de prospectos de forma automática.
            {connectedPhone && (
              <span style={{ display: 'block', marginTop: '0.5rem', fontWeight: 'bold', color: '#334155' }}>
                Número vinculado: +{connectedPhone.replace('@c.us', '')}
              </span>
            )}
          </p>
          <button 
            onClick={handleLogout}
            disabled={loading}
            style={{
              marginTop: '1rem',
              padding: '0.5rem 1.5rem',
              backgroundColor: loading ? '#fca5a5' : '#fee2e2',
              color: '#991b1b',
              border: 'none',
              borderRadius: '6px',
              fontWeight: '500',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.2s'
            }}
          >
            {loading ? 'Cerrando sesión...' : 'Cerrar Sesión'}
          </button>
        </>
      )}
    </div>
  );
}
