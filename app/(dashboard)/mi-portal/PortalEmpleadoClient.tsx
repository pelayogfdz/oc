'use client';

import { useState, useEffect, useRef } from 'react';
import { Clock, MapPin, CalendarDays, CheckCircle2, AlertTriangle, FileText, User, Camera } from 'lucide-react';
import { registerAttendance, createLeaveRequest, registerFaceDescriptor } from '@/app/actions/hr';
import FaceRecognitionClient from './FaceRecognitionClient';

export default function PortalEmpleadoClient({ 
  user,
  totalVacationDays = 0,
  usedVacationDays = 0,
  availableVacationDays = 0
}: { 
  user: any;
  totalVacationDays?: number;
  usedVacationDays?: number;
  availableVacationDays?: number;
}) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [locationStatus, setLocationStatus] = useState<string>('Buscando ubicación...');
  const [currentCoords, setCurrentCoords] = useState<{lat: number, lng: number} | null>(null);
  const [faceMatched, setFaceMatched] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [leaveType, setLeaveType] = useState('PAID_LEAVE');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [isSubmittingLeave, setIsSubmittingLeave] = useState(false);

  const [isEnrollingFace, setIsEnrollingFace] = useState(false);
  const [enrollStatus, setEnrollStatus] = useState('');
  const enrollFileInputRef = useRef<HTMLInputElement>(null);

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

  const handleLeaveRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingLeave(true);
    try {
      await createLeaveRequest({
        userId: user.id,
        type: leaveType,
        startDate,
        endDate,
        reason
      });
      alert('Solicitud enviada correctamente');
      setIsLeaveModalOpen(false);
      window.location.reload();
    } catch (e: any) {
      alert("Error: " + e.message);
    } finally {
      setIsSubmittingLeave(false);
    }
  };

  const handleEnrollFace = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsEnrollingFace(true);
    setEnrollStatus('Cargando modelos de IA...');
    try {
      const faceapi = await import('@vladmandic/face-api');
      await faceapi.nets.tinyFaceDetector.loadFromUri('/models');
      await faceapi.nets.faceLandmark68Net.loadFromUri('/models');
      await faceapi.nets.faceRecognitionNet.loadFromUri('/models');

      setEnrollStatus('Procesando rostro...');
      const reader = new FileReader();
      reader.onload = async (e) => {
        const img = new Image();
        img.onload = async () => {
          const tmpCanvas = document.createElement('canvas');
          const mx = Math.max(img.width, img.height);
          let ratio = mx > 600 ? 600 / mx : 1;
          tmpCanvas.width = img.width * ratio;
          tmpCanvas.height = img.height * ratio;
          tmpCanvas.getContext('2d')?.drawImage(img, 0, 0, tmpCanvas.width, tmpCanvas.height);

          const detection = await faceapi.detectSingleFace(tmpCanvas, new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.1 })).withFaceLandmarks().withFaceDescriptor();

          if (!detection) {
             setEnrollStatus('Error: No se detectó rostro de forma clara. Intenta de nuevo.');
             setIsEnrollingFace(false);
             return;
          }

          const descriptorString = JSON.stringify(Array.from(detection.descriptor));
          
          setEnrollStatus('Rostro detectado. Guardando...');
          await registerFaceDescriptor({ userId: user.id, descriptor: descriptorString });
          alert('Tu rostro ha sido registrado exitosamente.');
          window.location.reload();
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      setEnrollStatus('Error: ' + err.message);
      setIsEnrollingFace(false);
    }
  };

  const todayStart = new Date();
  todayStart.setHours(0,0,0,0);
  
  const allLogs = user.attendanceLogs || [];
  const todayLogs = allLogs.filter((l: any) => new Date(l.timestamp) >= todayStart);
  const weeklyLogs = allLogs.filter((l: any) => new Date(l.timestamp) < todayStart);

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

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem' }}>
        {/* Main Column */}
        <div style={{ flex: '1 1 min(100%, 300px)', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Action Card */}
          <div className="card" style={{ padding: '1.5rem', textAlign: 'center', backgroundColor: '#f8fafc' }}>
            <Clock size={48} color="var(--pulpos-primary)" style={{ margin: '0 auto 1rem auto' }} />
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Control de Asistencia</h2>
            <p style={{ color: 'var(--pulpos-text-muted)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
              Registra tu entrada y salida del turno laboral. 
            </p>

            {(user.reqPhoto && !user.faceDescriptor) && (
              <div style={{ padding: '1.5rem', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', marginBottom: '1.5rem', textAlign: 'center' }}>
                <AlertTriangle size={32} color="#3b82f6" style={{ margin: '0 auto 0.5rem auto' }} />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#1e3a8a', marginBottom: '0.5rem' }}>Registro Facial Requerido</h3>
                <p style={{ fontSize: '0.85rem', color: '#1e3a8a', marginBottom: '1rem' }}>
                  Es tu primera vez. Para agilizar tus Check-ins, necesitas registrar tu rostro tomando una foto clara (selfie).
                </p>
                <input 
                  type="file" 
                  accept="image/*" 
                  capture="user" 
                  ref={enrollFileInputRef} 
                  style={{ display: 'none' }} 
                  onChange={handleEnrollFace} 
                />
                <button 
                  onClick={() => enrollFileInputRef.current?.click()}
                  disabled={isEnrollingFace}
                  style={{ padding: '0.75rem 1.5rem', backgroundColor: '#2563eb', color: 'white', borderRadius: '6px', fontWeight: 'bold', border: 'none', cursor: isEnrollingFace ? 'not-allowed' : 'pointer' }}
                >
                  <Camera size={18} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.5rem' }} /> 
                  {isEnrollingFace ? 'Procesando...' : 'Tomar Foto de Registro'}
                </button>
                {enrollStatus && <p style={{ marginTop: '0.5rem', fontSize: '0.85rem', fontWeight: 'bold', color: enrollStatus.includes('Error') ? '#ef4444' : '#16a34a' }}>{enrollStatus}</p>}
              </div>
            )}

            {(user.reqPhoto && user.faceDescriptor && !hasCheckedIn) && (
              <div style={{ marginBottom: '1.5rem' }}>
                <FaceRecognitionClient user={user} onFaceMatched={setFaceMatched} onPhotoCaptured={setPhotoUrl} />
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <button 
                onClick={() => handleCheckIn('CHECK_IN')}
                disabled={isRegistering || hasCheckedIn || (user.reqPhoto && !faceMatched) || (user.reqPhoto && !user.faceDescriptor)}
                style={{ 
                  padding: '0.85rem 1.5rem', 
                  fontSize: '1rem', 
                  fontWeight: 'bold',
                  backgroundColor: hasCheckedIn ? '#e2e8f0' : '#16a34a',
                  color: hasCheckedIn ? '#94a3b8' : 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: hasCheckedIn ? 'not-allowed' : 'pointer',
                  flex: '1 1 100%',
                  minWidth: '150px'
                }}
              >
                Entrada (Check-In)
              </button>
              
              <button 
                onClick={() => handleCheckIn('CHECK_OUT')}
                disabled={isRegistering || !hasCheckedIn || hasCheckedOut || (user.reqPhoto && !faceMatched && false /* Optional: require face for checkout too? let's not for now */)}
                style={{ 
                  padding: '0.85rem 1.5rem', 
                  fontSize: '1rem', 
                  fontWeight: 'bold',
                  backgroundColor: (!hasCheckedIn || hasCheckedOut) ? '#e2e8f0' : '#ea580c',
                  color: (!hasCheckedIn || hasCheckedOut) ? '#94a3b8' : 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: (!hasCheckedIn || hasCheckedOut) ? 'not-allowed' : 'pointer',
                  flex: '1 1 100%',
                  minWidth: '150px'
                }}
              >
                Salida (Check-Out)
              </button>
            </div>

            <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'center', gap: '1rem', fontSize: '0.8rem', color: '#64748b', flexWrap: 'wrap' }}>
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
          {/* Weekly Logs */}
          <div className="card">
            <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CalendarDays size={20} color="var(--pulpos-primary)" /> Últimos 7 Días
            </h3>
            {weeklyLogs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                <p>No hay registros en los últimos 7 días.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {weeklyLogs.map((log: any) => (
                  <div key={log.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', border: '1px solid #e2e8f0', borderRadius: '8px', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div style={{ padding: '0.5rem', backgroundColor: log.type === 'CHECK_IN' ? '#dcfce7' : '#ffedd5', borderRadius: '50%' }}>
                        {log.type === 'CHECK_IN' ? <CheckCircle2 size={16} color="#16a34a" /> : <AlertTriangle size={16} color="#ea580c" />}
                      </div>
                      <div>
                        <div style={{ fontWeight: 'bold', color: '#1e293b', fontSize: '0.9rem' }}>
                          {log.type === 'CHECK_IN' ? 'Entrada' : 'Salida'}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                          {new Date(log.timestamp).toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' })} - {new Date(log.timestamp).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
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
            <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '1rem' }}>Mis Vacaciones</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                <span style={{ color: '#64748b' }}>Días Totales (Por Ley):</span>
                <span style={{ fontWeight: 'bold' }}>{totalVacationDays}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                <span style={{ color: '#64748b' }}>Días Tomados:</span>
                <span style={{ fontWeight: 'bold', color: '#ea580c' }}>{usedVacationDays}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1rem', paddingTop: '0.5rem', borderTop: '1px solid #e2e8f0' }}>
                <span style={{ color: '#1e293b', fontWeight: 'bold' }}>Disponibles:</span>
                <span style={{ fontWeight: 'bold', color: '#16a34a' }}>{availableVacationDays}</span>
              </div>
            </div>

            <button 
              onClick={() => setIsLeaveModalOpen(true)}
              style={{ width: '100%', padding: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', fontWeight: '500', color: '#334155' }}>
              <FileText size={18} /> Solicitar Permiso / Vacaciones
            </button>
          </div>

        </div>
      </div>

      {/* Leave Request Modal */}
      {isLeaveModalOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '12px', width: '100%', maxWidth: '500px' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>Solicitar Permiso</h3>
            <form onSubmit={handleLeaveRequest} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Tipo de Permiso</label>
                <select value={leaveType} onChange={(e) => setLeaveType(e.target.value)} required style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                  <option value="PAID_LEAVE">Con goce de sueldo</option>
                  <option value="UNPAID_LEAVE">Sin goce de sueldo</option>
                  <option value="VACATION">Vacaciones</option>
                  <option value="SICK_LEAVE">Incapacidad</option>
                  <option value="PATERNITY_LEAVE">Paternidad</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Fecha de Inicio</label>
                  <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Fecha de Fin</label>
                  <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Motivo / Comentarios</label>
                <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}></textarea>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                <button type="button" onClick={() => setIsLeaveModalOpen(false)} style={{ padding: '0.75rem 1.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: 'transparent', cursor: 'pointer' }}>Cancelar</button>
                <button type="submit" disabled={isSubmittingLeave} style={{ padding: '0.75rem 1.5rem', borderRadius: '6px', border: 'none', backgroundColor: '#8b5cf6', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}>
                  {isSubmittingLeave ? 'Enviando...' : 'Enviar Solicitud'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
