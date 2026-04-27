'use client';

import { useState, useEffect } from 'react';
import { Clock, MapPin, CalendarDays, CheckCircle2, AlertTriangle, FileText } from 'lucide-react';
import { registerAttendance } from '@/app/actions/hr';
import FaceRecognitionClient from './FaceRecognitionClient';

export default function PortalEmpleadoClient({ user }: { user: any }) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [locationStatus, setLocationStatus] = useState<string>('Buscando ubicación...');
  const [currentCoords, setCurrentCoords] = useState<{lat: number, lng: number} | null>(null);
  const [faceMatched, setFaceMatched] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Simple geo tracking on load
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        setCurrentCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocationStatus('Ubicación obtenida');
      }, (err) => {
        setLocationStatus('No se pudo obtener ubicación: ' + err.message);
      });
    } else {
      setLocationStatus('Geolocalización no soportada por el navegador');
    }
  }, []);

  const handleCheckIn = async (type: 'CHECK_IN' | 'CHECK_OUT') => {
    setIsRegistering(true);
    try {
      if (user.reqGps && !currentCoords) {
        throw new Error("Se requiere ubicación GPS activa para registrar asistencia.");
      }
      if (user.reqPhoto && !faceMatched) {
        throw new Error("Se requiere foto de selfie exitosa para registrar tu entrada/salida.");
      }
      
      await registerAttendance({
        userId: user.id,
        type,
        latitude: currentCoords?.lat,
        longitude: currentCoords?.lng,
        photoUrl: photoUrl || undefined,
        deviceInfo: navigator.userAgent
      });
      alert('Registro guardado correctamente');
      window.location.reload();
    } catch (e: any) {
      setErrorMsg("Error al registrar: " + e.message);
    } finally {
      setIsRegistering(false);
    }
  };

  const todayLogs = user.attendanceLogs || [];
  const hasCheckedIn = todayLogs.some((l: any) => l.type === 'CHECK_IN');
  const hasCheckedOut = todayLogs.some((l: any) => l.type === 'CHECK_OUT');

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '1rem' }}>
      <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold', marginBottom: '0.5rem', color: '#1e293b' }}>
        Mi Portal
      </h1>
      <p style={{ color: 'var(--pulpos-text-muted)', marginBottom: '2rem' }}>
        Bienvenido, {user.name}
      </p>

      {errorMsg && (
        <div style={{ padding: '1rem', marginBottom: '1.5rem', backgroundColor: '#fef2f2', border: '1px solid #f87171', color: '#ef4444', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <AlertTriangle size={20} />
          {errorMsg}
        </div>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem' }}>
        {/* Main Column */}
        <div style={{ flex: '1 1 min(100%, 300px)', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Action Card */}
          <div className="card" style={{ padding: '2rem', textAlign: 'center', backgroundColor: '#f8fafc' }}>
            <Clock size={48} color="var(--pulpos-primary)" style={{ margin: '0 auto 1rem auto' }} />
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Control de Asistencia</h2>
            <p style={{ color: 'var(--pulpos-text-muted)', marginBottom: '2rem' }}>
              Registra tu entrada y salida del turno laboral. 
            </p>

            {(user.reqPhoto && !hasCheckedIn) && (
              <div style={{ marginBottom: '2rem' }}>
                <FaceRecognitionClient user={user} onFaceMatched={setFaceMatched} onPhotoCaptured={setPhotoUrl} />
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <button 
                onClick={() => handleCheckIn('CHECK_IN')}
                disabled={isRegistering || hasCheckedIn || (user.reqPhoto && !faceMatched)}
                style={{ 
                  padding: '1rem 2rem', 
                  fontSize: '1.1rem', 
                  fontWeight: 'bold',
                  backgroundColor: hasCheckedIn ? '#e2e8f0' : '#16a34a',
                  color: hasCheckedIn ? '#94a3b8' : 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: hasCheckedIn ? 'not-allowed' : 'pointer',
                  flex: '1 1 200px'
                }}
              >
                Entrada (Check-In)
              </button>
              
              <button 
                onClick={() => handleCheckIn('CHECK_OUT')}
                disabled={isRegistering || !hasCheckedIn || hasCheckedOut || (user.reqPhoto && !faceMatched && false /* Optional: require face for checkout too? let's not for now */)}
                style={{ 
                  padding: '1rem 2rem', 
                  fontSize: '1.1rem', 
                  fontWeight: 'bold',
                  backgroundColor: (!hasCheckedIn || hasCheckedOut) ? '#e2e8f0' : '#ea580c',
                  color: (!hasCheckedIn || hasCheckedOut) ? '#94a3b8' : 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: (!hasCheckedIn || hasCheckedOut) ? 'not-allowed' : 'pointer',
                  flex: '1 1 200px'
                }}
              >
                Salida (Check-Out)
              </button>
            </div>

            <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'center', gap: '2rem', fontSize: '0.85rem', color: '#64748b', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <MapPin size={16} color={currentCoords ? '#16a34a' : '#ef4444'} />
                {locationStatus}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CheckCircle2 size={16} color={user.reqPhoto ? '#3b82f6' : '#94a3b8'} />
                {user.reqPhoto ? 'Foto Requerida' : 'Foto Opcional'}
              </div>
            </div>
          </div>

          {/* Today's Log */}
          <div className="card">
            <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CalendarDays size={20} color="var(--pulpos-primary)" /> Registros de Hoy
            </h3>
            
            {todayLogs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                <p>No tienes registros hoy.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {todayLogs.map((log: any) => (
                  <div key={log.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', border: '1px solid #e2e8f0', borderRadius: '8px', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div style={{ padding: '0.5rem', backgroundColor: log.type === 'CHECK_IN' ? '#dcfce7' : '#ffedd5', borderRadius: '50%' }}>
                        {log.type === 'CHECK_IN' ? <CheckCircle2 size={24} color="#16a34a" /> : <AlertTriangle size={24} color="#ea580c" />}
                      </div>
                      <div>
                        <div style={{ fontWeight: 'bold', color: '#1e293b' }}>
                          {log.type === 'CHECK_IN' ? 'Entrada' : 'Salida'}
                        </div>
                        <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                          {new Date(log.timestamp).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                    {log.status === 'LATE' && (
                      <span style={{ fontSize: '0.75rem', fontWeight: 'bold', padding: '0.25rem 0.5rem', backgroundColor: '#fef2f2', color: '#ef4444', borderRadius: '4px' }}>
                        RETARDO
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Column */}
        <div style={{ flex: '1 1 min(100%, 300px)', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          <div className="card">
            <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '1rem' }}>Resumen Semanal</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                <span style={{ color: '#64748b' }}>Horas Trabajadas:</span>
                <span style={{ fontWeight: 'bold' }}>-- hrs</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                <span style={{ color: '#64748b' }}>Faltas:</span>
                <span style={{ fontWeight: 'bold', color: '#ef4444' }}>0</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                <span style={{ color: '#64748b' }}>Retardos:</span>
                <span style={{ fontWeight: 'bold', color: '#f59e0b' }}>0</span>
              </div>
            </div>
          </div>

          <div className="card">
            <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '1rem' }}>Mis Trámites</h3>
            <button style={{ width: '100%', padding: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', fontWeight: '500' }}>
              <FileText size={18} /> Solicitar Vacaciones
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
