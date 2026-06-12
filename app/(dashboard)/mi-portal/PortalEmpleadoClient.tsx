'use client';

import { useState, useEffect, useRef } from 'react';
import { Clock, MapPin, CalendarDays, CheckCircle2, AlertTriangle, FileText, User, Camera, Fingerprint } from 'lucide-react';
import { registerAttendance, createLeaveRequest, registerFaceDescriptor, registerFingerprintCredential } from '@/app/actions/hr';
import FaceRecognitionClient from './FaceRecognitionClient';
import { formatTime12h } from '@/app/lib/timezone';

export default function PortalEmpleadoClient({ 
  user,
  timezone,
  totalVacationDays = 0,
  usedVacationDays = 0,
  availableVacationDays = 0
}: { 
  user: any;
  timezone: string;
  totalVacationDays?: number;
  usedVacationDays?: number;
  availableVacationDays?: number;
}) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [locationStatus, setLocationStatus] = useState<string>('Buscando ubicación...');
  const [currentCoords, setCurrentCoords] = useState<{lat: number, lng: number} | null>(null);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
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

  // Reusable helper to get fresh, high-accuracy GPS coordinates
  const getGPSCoordinates = (): Promise<{lat: number, lng: number}> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocalización no soportada por el navegador"));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setCurrentCoords(coords);
          setGpsAccuracy(pos.coords.accuracy);
          setLocationStatus(`Ubicación obtenida (±${Math.round(pos.coords.accuracy)}m)`);
          resolve(coords);
        },
        (err) => {
          setLocationStatus('No se pudo obtener ubicación: ' + err.message);
          reject(new Error("No se pudo obtener la ubicación GPS: " + err.message));
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0
        }
      );
    });
  };

  // Simple geo tracking on load
  useEffect(() => {
    getGPSCoordinates().catch(() => {});
  }, []);

  const handleCheckIn = async (type: 'CHECK_IN' | 'CHECK_OUT') => {
    setIsRegistering(true);
    setErrorMsg(null);
    try {
      let coords = currentCoords;
      if (user.reqGps) {
        setLocationStatus('Obteniendo ubicación precisa...');
        try {
          coords = await getGPSCoordinates();
        } catch (e: any) {
          if (!coords) throw e;
          // Fallback to coordinates fetched on mount if fresh query fails (e.g. timeout)
          console.warn("Could not query fresh coordinates, using cached mount coords:", e.message);
        }
      }

      if (user.reqPhoto && !faceMatched) {
        throw new Error("Se requiere foto de selfie exitosa para registrar tu entrada/salida.");
      }
      
      const res = await registerAttendance({
        userId: user.id,
        type,
        latitude: coords?.lat,
        longitude: coords?.lng,
        photoUrl: photoUrl || undefined,
        deviceInfo: navigator.userAgent
      });
      
      if (!res.success) {
        throw new Error(res.error || "Error desconocido");
      }
      
      alert('Registro guardado correctamente');
      window.location.reload();
    } catch (e: any) {
      const errMsg = e.message || '';
      if (
        errMsg.includes("Server Action") || 
        errMsg.includes("not found on the server") || 
        errMsg.includes("failed-to-find-server-action")
      ) {
        console.warn("Server Action hash mismatch detected. Force-refreshing page...");
        window.location.reload();
        return;
      }
      setErrorMsg("Error al registrar: " + e.message);
    } finally {
      setIsRegistering(false);
    }
  };

  const [isRegisteringHuella, setIsRegisteringHuella] = useState(false);

  const handleRegisterFingerprint = async () => {
    setIsRegisteringHuella(true);
    try {
      const { registerFingerprint } = await import('@/app/lib/webauthn');
      const credential = await registerFingerprint(user.id, user.name || user.email);
      
      const res = await registerFingerprintCredential({
        userId: user.id,
        credentialId: credential.credentialId,
        publicKey: credential.publicKey
      });

      if (!res.success) {
        throw new Error(res.error || "No se pudo guardar la huella en el servidor");
      }

      alert('Huella dactilar vinculada correctamente');
      window.location.reload();
    } catch (e: any) {
      alert('Error al registrar huella: ' + e.message);
    } finally {
      setIsRegisteringHuella(false);
    }
  };

  const handleFingerprintCheck = async (type: 'CHECK_IN' | 'CHECK_OUT') => {
    setIsRegistering(true);
    setErrorMsg(null);
    try {
      let coords = currentCoords;
      if (user.reqGps) {
        setLocationStatus('Obteniendo ubicación precisa...');
        try {
          coords = await getGPSCoordinates();
        } catch (e: any) {
          if (!coords) throw e;
        }
      }

      const { authenticateFingerprint } = await import('@/app/lib/webauthn');
      await authenticateFingerprint(user.webauthnCredentialId);

      const res = await registerAttendance({
        userId: user.id,
        type,
        latitude: coords?.lat,
        longitude: coords?.lng,
        photoUrl: undefined,
        deviceInfo: navigator.userAgent + " (Huella)"
      });
      
      if (!res.success) {
        throw new Error(res.error || "Error desconocido");
      }
      
      alert('Asistencia registrada correctamente con huella dactilar');
      window.location.reload();
    } catch (e: any) {
      setErrorMsg("Error al validar huella: " + e.message);
    } finally {
      setIsRegistering(false);
    }
  };

  const handleLeaveRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingLeave(true);
    try {
      const res = await createLeaveRequest({
        userId: user.id,
        type: leaveType,
        startDate,
        endDate,
        reason
      });
      if (!res.success) {
        throw new Error(res.error || "Error desconocido");
      }
      alert('Solicitud enviada correctamente');
      setIsLeaveModalOpen(false);
      window.location.reload();
    } catch (e: any) {
      const errMsg = e.message || '';
      if (
        errMsg.includes("Server Action") || 
        errMsg.includes("not found on the server") || 
        errMsg.includes("failed-to-find-server-action")
      ) {
        console.warn("Server Action hash mismatch detected. Force-refreshing page...");
        window.location.reload();
        return;
      }
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
          try {
            const tmpCanvas = document.createElement('canvas');
            const mx = Math.max(img.width, img.height);
            // Downscale to max 320px to improve performance on budget mobile devices
            let ratio = mx > 320 ? 320 / mx : 1;
            tmpCanvas.width = img.width * ratio;
            tmpCanvas.height = img.height * ratio;
            tmpCanvas.getContext('2d')?.drawImage(img, 0, 0, tmpCanvas.width, tmpCanvas.height);

            // Use smaller inputSize (160 instead of 416) to speed up calculations by 500% on low-end devices
            const detection = await faceapi.detectSingleFace(tmpCanvas, new faceapi.TinyFaceDetectorOptions({ inputSize: 160, scoreThreshold: 0.15 })).withFaceLandmarks().withFaceDescriptor();

            if (!detection) {
               setEnrollStatus('Error: No se detectó rostro de forma clara. Intenta de nuevo.');
               setIsEnrollingFace(false);
               return;
            }

            const descriptorString = JSON.stringify(Array.from(detection.descriptor));
            
            setEnrollStatus('Rostro detectado. Guardando...');
            const res = await registerFaceDescriptor({ userId: user.id, descriptor: descriptorString });
            if (res && !res.success) {
              setEnrollStatus('Error al registrar rostro: ' + (res.error || 'error desconocido'));
              setIsEnrollingFace(false);
              return;
            }
            alert('Tu rostro ha sido registrado exitosamente.');
            window.location.reload();
          } catch (err: any) {
            setEnrollStatus('Error: ' + err.message);
            setIsEnrollingFace(false);
          }
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      setEnrollStatus('Error: ' + err.message);
      setIsEnrollingFace(false);
    }
  };

  const getUtcDateFromLocal = (y: number, m: number, d: number, h: number, min: number, s: number, ms: number) => {
    const approxUtc = new Date(Date.UTC(y, m - 1, d, h, min, s, ms));
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
    const parts = formatter.formatToParts(approxUtc);
    const lYear = parseInt(parts.find(p => p.type === 'year')!.value, 10);
    const lMonth = parseInt(parts.find(p => p.type === 'month')!.value, 10);
    const lDay = parseInt(parts.find(p => p.type === 'day')!.value, 10);
    let lHour = parseInt(parts.find(p => p.type === 'hour')!.value, 10);
    if (lHour === 24) lHour = 0;
    const lMinute = parseInt(parts.find(p => p.type === 'minute')!.value, 10);
    const lSecond = parseInt(parts.find(p => p.type === 'second')!.value, 10);

    const localUtc = Date.UTC(lYear, lMonth - 1, lDay, lHour, lMinute, lSecond, ms);
    const offset = approxUtc.getTime() - localUtc;
    return new Date(approxUtc.getTime() + offset);
  };

  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  const parts = formatter.formatToParts(new Date());
  const year = parseInt(parts.find(p => p.type === 'year')!.value, 10);
  const month = parseInt(parts.find(p => p.type === 'month')!.value, 10);
  const day = parseInt(parts.find(p => p.type === 'day')!.value, 10);

  const todayStart = getUtcDateFromLocal(year, month, day, 0, 0, 0, 0);
  
  const allLogs = user.attendanceLogs || [];
  const todayLogs = allLogs.filter((l: any) => new Date(l.timestamp) >= todayStart);
  const weeklyLogs = allLogs.filter((l: any) => new Date(l.timestamp) < todayStart);

  const hasCheckedIn = todayLogs.some((l: any) => l.type === 'CHECK_IN');
  const hasCheckedOut = todayLogs.some((l: any) => l.type === 'CHECK_OUT');

  const checkIn = todayLogs.find((l: any) => l.type === 'CHECK_IN');
  const checkOut = todayLogs.find((l: any) => l.type === 'CHECK_OUT');

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '1rem' }}>
      <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold', marginBottom: '0.5rem', color: '#1e293b' }}>
        Mi Portal
      </h1>
      <p style={{ color: 'var(--pulpos-text-muted)', marginBottom: '2rem' }}>
        Bienvenido, {user.name}
      </p>

      {errorMsg && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <div style={{ padding: '1rem', backgroundColor: '#fef2f2', border: '1px solid #f87171', color: '#ef4444', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertTriangle size={20} />
            {errorMsg}
          </div>
          {errorMsg.includes('radio') && (
            <div style={{ padding: '1.25rem', backgroundColor: '#fffbeb', border: '1px solid #fef3c7', color: '#b45309', borderRadius: '12px', fontSize: '0.85rem', lineHeight: '1.5', boxShadow: '0 4px 6px rgba(0, 0, 0, 0.02)' }}>
              <h4 style={{ fontWeight: 'bold', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#92400e' }}>
                💡 Solución de Problemas con la Ubicación GPS
              </h4>
              <p style={{ margin: '0 0 0.5rem 0' }}>
                Tu celular está reportando que te encuentras a una distancia mayor a los 50 metros permitidos de tu sucursal. Esto suele ocurrir cuando el celular usa una ubicación aproximada de antenas móviles o internet en lugar del GPS real. Por favor sigue estos pasos:
              </p>
              <ul style={{ listStyleType: 'decimal', paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.4rem', margin: '0' }}>
                <li>
                  <strong>Activa el GPS / Ubicación Precisa:</strong> En la barra de notificaciones o configuración de tu teléfono, asegúrate de tener la "Ubicación" activada y configurada en modo de <strong>"Alta precisión"</strong> o <strong>"Precisión de ubicación de Google"</strong>.
                </li>
                <li>
                  <strong>Permisos del navegador:</strong> Asegúrate de que el navegador (Chrome o Safari) tenga permiso para acceder a tu ubicación. Si ves un candado en la barra de direcciones del navegador arriba, tócalo para verificar los permisos de ubicación.
                </li>
                <li>
                  <strong>Evita interferencias:</strong> Si estás muy adentro del local o en un lugar con techo metálico grueso (como bodega o sótano), la señal satelital se bloquea. Sal a un espacio abierto o acércate a la puerta/ventana unos segundos para que se actualice tu posición exacta.
                </li>
                <li>
                  <strong>Recarga la página:</strong> Una vez activado el GPS o estando cerca de una zona abierta, <strong>recarga esta página en tu celular</strong> para forzar una nueva lectura limpia. Verás el indicador en verde con la precisión en metros (por ejemplo ±15m).
                </li>
              </ul>
            </div>
          )}
        </div>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem' }}>
        {/* Main Column */}
        <div style={{ flex: '1 1 min(100%, 300px)', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Action Card */}
          <div className="card" style={{ padding: '1.75rem', textAlign: 'center', backgroundColor: '#ffffff', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)', border: '1px solid #e2e8f0' }}>
            <Clock size={48} color="var(--pulpos-primary)" style={{ margin: '0 auto 1.25rem auto', filter: 'drop-shadow(0 4px 6px rgba(59, 130, 246, 0.15))' }} />
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.5rem', color: '#1e293b' }}>Control de Asistencia</h2>
            <p style={{ color: 'var(--pulpos-text-muted)', marginBottom: '1.75rem', fontSize: '0.9rem' }}>
              Registra tu entrada y salida del turno laboral. 
            </p>

            {(user.reqPhoto && !user.faceDescriptor) && (
              <div style={{ 
                padding: '1.75rem', 
                background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)', 
                border: '1px solid #bfdbfe', 
                borderRadius: '12px', 
                marginBottom: '1.75rem', 
                textAlign: 'center',
                boxShadow: '0 10px 15px -3px rgba(59, 130, 246, 0.05)'
              }}>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'center', 
                  alignItems: 'center', 
                  width: '56px', 
                  height: '56px', 
                  backgroundColor: '#2563eb', 
                  color: 'white', 
                  borderRadius: '50%', 
                  margin: '0 auto 1rem auto',
                  boxShadow: '0 4px 10px rgba(37, 99, 235, 0.3)' 
                }}>
                  <Camera size={26} />
                </div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 'bold', color: '#1e3a8a', marginBottom: '0.5rem' }}>Registro Facial Requerido</h3>
                <p style={{ fontSize: '0.85rem', color: '#2563eb', fontWeight: '600', marginBottom: '1rem', display: 'inline-block', backgroundColor: 'rgba(255,255,255,0.7)', padding: '0.25rem 0.75rem', borderRadius: '20px' }}>
                  🔑 Es tu primera vez
                </p>
                <p style={{ fontSize: '0.85rem', color: '#3b82f6', lineHeight: '1.4', marginBottom: '1.25rem' }}>
                  Para agilizar tus Check-ins seguros, por favor toma una foto clara de tu rostro (selfie). Asegúrate de tener buena iluminación y no usar lentes de sol, gorras o cubrebocas.
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
                  style={{ 
                    padding: '0.75rem 1.75rem', 
                    backgroundColor: '#2563eb', 
                    color: 'white', 
                    borderRadius: '8px', 
                    fontWeight: 'bold', 
                    border: 'none', 
                    cursor: isEnrollingFace ? 'not-allowed' : 'pointer',
                    boxShadow: '0 4px 6px rgba(37, 99, 235, 0.25)',
                    transition: 'all 0.2s',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                >
                  <Camera size={18} /> 
                  {isEnrollingFace ? 'Cargando lector biométrico...' : 'Tomar Foto de Registro'}
                </button>
                {enrollStatus && (
                  <p style={{ 
                    marginTop: '0.75rem', 
                    fontSize: '0.85rem', 
                    fontWeight: 'bold', 
                    color: enrollStatus.includes('Error') ? '#ef4444' : '#16a34a',
                    backgroundColor: 'rgba(255,255,255,0.8)',
                    padding: '0.4rem',
                    borderRadius: '6px',
                    border: enrollStatus.includes('Error') ? '1px solid #fca5a5' : '1px solid #86efac'
                  }}>
                    {enrollStatus}
                  </p>
                )}
              </div>
            )}

            {user.webauthnCredentialId && !hasCheckedOut && (
              <div style={{ marginBottom: '1.75rem', padding: '1rem', border: '1px solid #bfdbfe', borderRadius: '12px', backgroundColor: '#eff6ff' }}>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 'bold', color: '#1e3a8a', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', marginBottom: '0.5rem' }}>
                  <Fingerprint size={18} /> Asistencia por Huella Dactilar
                </h4>
                <p style={{ fontSize: '0.8rem', color: '#2563eb', margin: '0 0 1rem 0' }}>
                  Puedes registrar tu {!hasCheckedIn ? 'Entrada' : 'Salida'} colocando tu dedo sobre el lector.
                </p>
                <button
                  onClick={() => handleFingerprintCheck(!hasCheckedIn ? 'CHECK_IN' : 'CHECK_OUT')}
                  disabled={isRegistering || (hasCheckedIn && hasCheckedOut)}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    backgroundColor: '#10b981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem'
                  }}
                >
                  <Fingerprint size={16} /> {!hasCheckedIn ? 'Registrar Entrada' : 'Registrar Salida'}
                </button>
              </div>
            )}

            {(user.reqPhoto && user.faceDescriptor && !hasCheckedOut) && (
              <div style={{ marginBottom: '1.75rem' }}>
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
                disabled={isRegistering || !hasCheckedIn || hasCheckedOut || (user.reqPhoto && !faceMatched)}
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

            {!user.webauthnCredentialId && (
              <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'center' }}>
                <button
                  onClick={handleRegisterFingerprint}
                  disabled={isRegisteringHuella}
                  style={{
                    padding: '0.6rem 1.25rem',
                    backgroundColor: '#f1f5f9',
                    color: '#334155',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    transition: 'all 0.2s'
                  }}
                >
                  <Fingerprint size={16} /> Registrar mi Huella Dactilar
                </button>
              </div>
            )}

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
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between', 
                backgroundColor: '#ffffff', 
                padding: '1.25rem 1rem', 
                borderRadius: '12px', 
                border: '1px solid #e2e8f0',
                gap: '1rem'
              }}>
                {/* CHECK IN BLOCK */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: '1 1 0%', minWidth: '120px' }}>
                  {checkIn ? (
                    <>
                      {/* Circle Icon */}
                      <div style={{ 
                        width: '42px', 
                        height: '42px', 
                        backgroundColor: '#e6f9ee', 
                        borderRadius: '50%', 
                        display: 'flex', 
                        justifyContent: 'center', 
                        alignItems: 'center',
                        flexShrink: 0
                      }}>
                        <CheckCircle2 size={22} color="#16a34a" />
                      </div>
                      
                      {/* Texts */}
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 'bold', color: '#1e293b', fontSize: '1rem' }}>Entrada</span>
                          {checkIn.status === 'LATE' && (
                            <span style={{ 
                              padding: '0.15rem 0.4rem', 
                              borderRadius: '4px', 
                              fontSize: '0.6rem', 
                              fontWeight: '700', 
                              backgroundColor: '#ffe4e6', 
                              color: '#ef4444',
                              letterSpacing: '0.025em'
                            }}>
                              RETARDO
                            </span>
                          )}
                          {checkIn.status === 'OUTSIDE_RADIUS' && (
                            <span style={{ 
                              padding: '0.15rem 0.4rem', 
                              borderRadius: '4px', 
                              fontSize: '0.6rem', 
                              fontWeight: '700', 
                              backgroundColor: '#fff7ed', 
                              color: '#ea580c',
                              letterSpacing: '0.025em'
                            }}>
                              GPS LEJOS
                            </span>
                          )}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.15rem' }}>
                          <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: '500' }}>
                            {formatTime12h(checkIn.timestamp, timezone)}
                          </span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      {/* Empty/Pending Check In */}
                      <div style={{ 
                        width: '42px', 
                        height: '42px', 
                        backgroundColor: '#f1f5f9', 
                        borderRadius: '50%', 
                        display: 'flex', 
                        justifyContent: 'center', 
                        alignItems: 'center',
                        flexShrink: 0
                      }}>
                        <Clock size={20} color="#94a3b8" />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontWeight: 'bold', color: '#94a3b8', fontSize: '1rem' }}>Entrada</span>
                        <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontStyle: 'italic', marginTop: '0.15rem' }}>Pendiente</span>
                      </div>
                    </>
                  )}
                </div>

                {/* Divider Line */}
                <div style={{ width: '1px', alignSelf: 'stretch', backgroundColor: '#e2e8f0', display: 'block' }} />

                {/* CHECK OUT BLOCK */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: '1 1 0%', minWidth: '120px' }}>
                  {checkOut ? (
                    <>
                      {/* Circle Icon */}
                      <div style={{ 
                        width: '42px', 
                        height: '42px', 
                        backgroundColor: '#fff7ed', 
                        borderRadius: '50%', 
                        display: 'flex', 
                        justifyContent: 'center', 
                        alignItems: 'center',
                        flexShrink: 0
                      }}>
                        <AlertTriangle size={20} color="#ea580c" />
                      </div>
                      
                      {/* Texts */}
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 'bold', color: '#1e293b', fontSize: '1rem' }}>Salida</span>
                          {checkOut.status === 'OUTSIDE_RADIUS' && (
                            <span style={{ 
                              padding: '0.15rem 0.4rem', 
                              borderRadius: '4px', 
                              fontSize: '0.6rem', 
                              fontWeight: '700', 
                              backgroundColor: '#fff7ed', 
                              color: '#ea580c',
                              letterSpacing: '0.025em'
                            }}>
                              GPS LEJOS
                            </span>
                          )}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.15rem' }}>
                          <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: '500' }}>
                            {formatTime12h(checkOut.timestamp, timezone)}
                          </span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      {/* Empty/Pending Check Out */}
                      <div style={{ 
                        width: '42px', 
                        height: '42px', 
                        backgroundColor: '#f1f5f9', 
                        borderRadius: '50%', 
                        display: 'flex', 
                        justifyContent: 'center', 
                        alignItems: 'center',
                        flexShrink: 0
                      }}>
                        <Clock size={20} color="#94a3b8" />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontWeight: 'bold', color: '#94a3b8', fontSize: '1rem' }}>Salida</span>
                        <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontStyle: 'italic', marginTop: '0.15rem' }}>
                          {checkIn ? 'Trabajando...' : 'Pendiente'}
                        </span>
                      </div>
                    </>
                  )}
                </div>
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
                          {new Date(log.timestamp).toLocaleDateString('es-MX', { timeZone: timezone, weekday: 'short', day: 'numeric', month: 'short' })} - {formatTime12h(log.timestamp, timezone)}
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
          
          {/* Allowed Check-in Locations Card */}
          <div className="card" style={{ padding: '1.5rem', backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #cbd5e1' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#1e293b' }}>
              <MapPin size={20} color="var(--pulpos-primary)" /> Zonas Autorizadas
            </h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--pulpos-text-muted)', marginBottom: '1.25rem', lineHeight: '1.4' }}>
              Ubicaciones geográficas permitidas para registrar tu asistencia (Check-in / Check-out).
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {user.homeLat !== null && user.homeLng !== null ? (
                <div style={{ padding: '0.75rem', backgroundColor: '#eff6ff', borderRadius: '8px', border: '1px solid #bfdbfe' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 'bold', display: 'block', color: '#1e40af' }}>
                    🏠 Domicilio (Home Office)
                  </span>
                  <span style={{ fontSize: '0.75rem', color: '#3b82f6', display: 'block', marginTop: '0.15rem' }}>
                    Coordenadas: {user.homeLat.toFixed(5)}, {user.homeLng.toFixed(5)}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: '#3b82f6', display: 'block' }}>
                    Radio permitido: {user.homeRadius || 50}m (+20m GPS margin)
                  </span>
                </div>
              ) : (
                <>
                  {/* Primary Branch Location */}
                  {user.branch?.hrLocation ? (
                    <div style={{ padding: '0.75rem', backgroundColor: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 'bold', display: 'block', color: '#166534' }}>
                        ⭐ Sucursal Matriz ({user.branch.name})
                      </span>
                      <span style={{ fontSize: '0.75rem', color: '#15803d', display: 'block', marginTop: '0.15rem' }}>
                        Coordenadas: {user.branch.hrLocation.lat.toFixed(5)}, {user.branch.hrLocation.lng.toFixed(5)}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: '#15803d', display: 'block' }}>
                        Radio permitido: {user.branch.hrLocation.radius}m (+20m GPS margin)
                      </span>
                    </div>
                  ) : (
                    user.reqGps && (
                      <div style={{ padding: '0.75rem', backgroundColor: '#fef2f2', borderRadius: '8px', border: '1px solid #fca5a5' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 'bold', display: 'block', color: '#991b1b' }}>
                          ⚠️ Sin Ubicación Matriz
                        </span>
                        <span style={{ fontSize: '0.75rem', color: '#ef4444', display: 'block', marginTop: '0.15rem' }}>
                          Pide al administrador configurar coordenadas GPS para tu sucursal.
                        </span>
                      </div>
                    )
                  )}

                  {/* Extra Checked Locations */}
                  {user.hrLocations && user.hrLocations.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.25rem' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Ubicaciones Adicionales ({user.hrLocations.length})
                      </span>
                      {user.hrLocations.map((loc: any) => (
                        <div key={loc.id} style={{ padding: '0.75rem', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                          <span style={{ fontSize: '0.85rem', fontWeight: 'bold', display: 'block', color: '#334155' }}>
                            📍 {loc.name}
                          </span>
                          <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', marginTop: '0.15rem' }}>
                            Coordenadas: {loc.lat.toFixed(5)}, {loc.lng.toFixed(5)}
                          </span>
                          <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block' }}>
                            Radio permitido: {loc.radius}m (+20m GPS margin)
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Free GPS Attendance Bypassed case */}
                  {!user.reqGps && (
                    <div style={{ padding: '1rem', backgroundColor: '#eff6ff', borderRadius: '8px', border: '1px solid #bfdbfe', textAlign: 'center' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 'bold', display: 'block', color: '#1e40af', marginBottom: '0.25rem' }}>
                        🔓 Asistencia Libre (Sin GPS)
                      </span>
                      <span style={{ fontSize: '0.75rem', color: '#2563eb' }}>
                        Tienes permitido registrar asistencia desde cualquier lugar.
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

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
