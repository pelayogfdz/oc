'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, User, Fingerprint, Camera, CheckCircle2, AlertTriangle, 
  Wifi, WifiOff, KeyRound, Loader2, ShieldCheck, RefreshCw, 
  UserCheck, MapPin, X, ArrowLeft, LogIn, LogOut, Clock, Settings
} from 'lucide-react';
import { 
  registerAttendance, 
  registerFingerprintCredential, 
  verifyUserPassword,
  registerAttendanceByFingerprint
} from '@/app/actions/hr';
import FaceRecognitionClient from '@/app/(dashboard)/mi-portal/FaceRecognitionClient';
import FaceRecognitionAutoClient from './FaceRecognitionAutoClient';
import { registerFingerprint, authenticateFingerprint, authenticateFingerprintAuto } from '@/app/lib/webauthn';
import { useOfflineSync } from '@/app/components/OfflineSyncProvider';
import { db } from '@/lib/offlineDB';

interface UserKiosk {
  id: string;
  name: string;
  email: string | null;
  role: string;
  faceDescriptor?: string | null;
  webauthnCredentialId?: string | null;
  webauthnPublicKey?: string | null;
  branchId?: string | null;
}

export default function KioskoClient({ initialUsers }: { initialUsers: UserKiosk[] }) {
  const { isOnline, pushOfflineAttendance } = useOfflineSync();
  const [users, setUsers] = useState<UserKiosk[]>(initialUsers);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Navigation / Mode state
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserKiosk | null>(null);
  
  // Attendance settings
  const [attendanceType, setAttendanceType] = useState<'CHECK_IN' | 'CHECK_OUT'>('CHECK_IN');
  const [authMode, setAuthMode] = useState<'huella' | 'facial' | 'none'>('none');
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number } | null>(null);
  
  // Automatic flow states
  const [matchedUser, setMatchedUser] = useState<UserKiosk | null>(null);
  const [capturedPhotoUrl, setCapturedPhotoUrl] = useState<string | null>(null);
  
  // Alerts and loaders
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  
  // Clock state
  const [currentTime, setCurrentTime] = useState<string>('');

  // Enrollment flow
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [isPasswordValidating, setIsPasswordValidating] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isBiometricEnrolling, setIsBiometricEnrolling] = useState(false);

  // Update clock on mount
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('es-MX', { hour12: true }));
    };
    updateClock();
    const timer = setInterval(updateClock, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch coordinates periodically (every 60s) to keep it fresh
  useEffect(() => {
    if (typeof window !== 'undefined' && navigator.geolocation) {
      const updateGPS = () => {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            setGpsCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          },
          (err) => {
            console.warn("GPS tracking disabled or unavailable for Kiosk Mode:", err.message);
          },
          { enableHighAccuracy: true, timeout: 10000 }
        );
      };
      updateGPS();
      const interval = setInterval(updateGPS, 60000);
      return () => clearInterval(interval);
    }
  }, []);

  // Sync users locally to IndexedDB if online
  useEffect(() => {
    const saveUsersLocally = async () => {
      if (isOnline && initialUsers && initialUsers.length > 0) {
        try {
          await db.users.clear();
          await db.users.bulkAdd(initialUsers);
          setUsers(initialUsers);
        } catch (e) {
          console.error("Failed to save users locally to Dexie:", e);
        }
      } else {
        // If offline or initial empty, load from IndexedDB
        try {
          const localUsers = await db.users.toArray();
          if (localUsers.length > 0) {
            setUsers(localUsers);
          }
        } catch (e) {
          console.error("Failed to load local users from Dexie:", e);
        }
      }
    };
    saveUsersLocally();
  }, [initialUsers, isOnline]);

  // Filter users for Admin Mode sidebar
  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (u.email && u.email.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const resetSelection = () => {
    setSelectedUser(null);
    setAuthMode('none');
    setMatchedUser(null);
    setCapturedPhotoUrl(null);
    setErrorMsg(null);
    setSuccessMsg(null);
    setShowEnrollModal(false);
    setPasswordInput('');
    setPasswordError(null);
  };

  // Perform checkout or checkin
  const submitAttendance = async (userId: string, type: 'CHECK_IN' | 'CHECK_OUT', facePhoto?: string) => {
    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const userAgent = typeof window !== 'undefined' ? `${navigator.userAgent} (Kiosko)` : 'Kiosko';
    const resolvedUser = users.find(u => u.id === userId);
    const userName = resolvedUser ? resolvedUser.name : 'Colaborador';
    
    try {
      if (!isOnline) {
        // Enqueue offline attendance log
        await pushOfflineAttendance({
          userId,
          type,
          latitude: gpsCoords?.lat,
          longitude: gpsCoords?.lng,
          photoUrl: facePhoto || undefined,
          deviceInfo: `${userAgent} [Offline]`
        });

        setSuccessMsg(`¡Registro offline guardado para ${userName}! Se sincronizará automáticamente. (${type === 'CHECK_IN' ? 'Entrada' : 'Salida'})`);
        setTimeout(() => {
          resetSelection();
        }, 4000);
      } else {
        // Call live server action
        const res = await registerAttendance({
          userId,
          type,
          latitude: gpsCoords?.lat,
          longitude: gpsCoords?.lng,
          photoUrl: facePhoto || undefined,
          deviceInfo: userAgent
        });

        if (!res.success) {
          throw new Error(res.error || "Fallo al registrar asistencia en el servidor.");
        }

        setSuccessMsg(`¡Asistencia registrada con éxito! Bienvenido(a) ${userName}. (${type === 'CHECK_IN' ? 'Entrada' : 'Salida'})`);
        setTimeout(() => {
          resetSelection();
        }, 4000);
      }
    } catch (e: any) {
      console.error(e);
      setErrorMsg(e.message || "Error al procesar el registro de asistencia.");
    } finally {
      setIsLoading(false);
    }
  };

  // Trigger Fingerprint verification via WebAuthn in automatic/usernameless mode
  const handleFingerprintAuthAuto = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setAuthMode('huella');
    setIsLoading(true);

    try {
      // Prompt hardware biometric sensor without allowCredentials
      const credentialId = await authenticateFingerprintAuto();
      
      // Look up user locally (works offline & extremely fast)
      let localUser = users.find(u => u.webauthnCredentialId === credentialId);
      
      if (localUser) {
        setMatchedUser(localUser);
        await submitAttendance(localUser.id, attendanceType);
      } else {
        // Fallback to server action if online (for recently registered credentials not in sync)
        if (isOnline) {
          setIsLoading(true);
          const serverRes = await registerAttendanceByFingerprint({
            credentialId,
            type: attendanceType,
            latitude: gpsCoords?.lat,
            longitude: gpsCoords?.lng,
            deviceInfo: typeof window !== 'undefined' ? `${navigator.userAgent} (Kiosko)` : 'Kiosko'
          });

          if (!serverRes.success) {
            throw new Error(serverRes.error || "No se pudo identificar a ningún colaborador con esta huella dactilar.");
          }
          
          setSuccessMsg(`¡Asistencia registrada con éxito! (${attendanceType === 'CHECK_IN' ? 'Entrada' : 'Salida'})`);
          setTimeout(() => {
            resetSelection();
          }, 4000);
        } else {
          throw new Error("Huella dactilar no encontrada en este dispositivo offline.");
        }
      }
    } catch (e: any) {
      console.error("Auto biometric authentication error:", e);
      setErrorMsg(e.message || "La verificación de huella dactilar falló o fue cancelada.");
      setAuthMode('none');
      setIsLoading(false);
    }
  };

  // Callback when face is recognized in FaceRecognitionAutoClient
  const handleFaceMatchedAuto = async (matched: UserKiosk, photo: string) => {
    setMatchedUser(matched);
    setCapturedPhotoUrl(photo);
    await submitAttendance(matched.id, attendanceType, photo);
  };

  // Trigger Fingerprint verification in Admin Mode (specific user selected)
  const handleFingerprintAuthAdmin = async () => {
    if (!selectedUser) return;
    if (!selectedUser.webauthnCredentialId) {
      setErrorMsg("Este usuario no tiene una huella dactilar registrada.");
      return;
    }

    setErrorMsg(null);
    setSuccessMsg(null);
    setIsLoading(true);

    try {
      await authenticateFingerprint(selectedUser.webauthnCredentialId);
      await submitAttendance(selectedUser.id, attendanceType);
    } catch (e: any) {
      console.error("Biometric authentication error:", e);
      setErrorMsg(e.message || "La verificación de huella dactilar falló o fue cancelada.");
      setIsLoading(false);
    }
  };

  // Secure Fingerprint Enrollment Handler (Admin Mode)
  const handleVerifyPasswordForEnroll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !passwordInput) return;

    setIsPasswordValidating(true);
    setPasswordError(null);

    try {
      const res = await verifyUserPassword(selectedUser.id, passwordInput);
      if (!res.success) {
        throw new Error(res.error || "La contraseña ingresada es incorrecta.");
      }

      setIsBiometricEnrolling(true);
      const credential = await registerFingerprint(selectedUser.id, selectedUser.name);
      
      const saveRes = await registerFingerprintCredential({
        userId: selectedUser.id,
        credentialId: credential.credentialId,
        publicKey: credential.publicKey
      });

      if (!saveRes.success) {
        throw new Error(saveRes.error || "No se pudo vincular la huella dactilar en el servidor.");
      }

      setSuccessMsg("¡Huella dactilar registrada con éxito! Ya puedes usar el lector para registrar tu asistencia.");
      
      const updatedUser = { 
        ...selectedUser, 
        webauthnCredentialId: credential.credentialId, 
        webauthnPublicKey: credential.publicKey 
      };
      
      setUsers(prev => prev.map(u => u.id === selectedUser.id ? updatedUser : u));
      setSelectedUser(updatedUser);
      setShowEnrollModal(false);
      setPasswordInput('');
    } catch (e: any) {
      console.error(e);
      setPasswordError(e.message || "El proceso de vinculación biométrica falló.");
    } finally {
      setIsPasswordValidating(false);
      setIsBiometricEnrolling(false);
    }
  };

  // FACE IDENTIFICATION IN ADMIN MODE
  const handleFacePhotoCapturedAdmin = (photo: string) => {
    setCapturedPhotoUrl(photo);
    if (selectedUser) {
      submitAttendance(selectedUser.id, attendanceType, photo);
    }
  };

  return (
    <div style={{ position: 'relative', minHeight: '680px' }}>
      
      {/* Top Banner: Status Indicators */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '1.5rem',
        padding: '0.75rem 1.25rem',
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.03)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Clock size={20} color="var(--pulpos-primary)" />
          <span style={{ fontSize: '1.25rem', fontWeight: '800', color: '#1e293b', letterSpacing: '-0.02em' }}>
            {currentTime || '--:--:--'}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {/* Geolocation status indicator */}
          {gpsCoords ? (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem', fontWeight: '700', color: '#16a34a', backgroundColor: '#dcfce7', padding: '0.25rem 0.6rem', borderRadius: '20px' }}>
              <MapPin size={14} /> GPS Activo
            </span>
          ) : (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem', fontWeight: '700', color: '#ea580c', backgroundColor: '#ffedd5', padding: '0.25rem 0.6rem', borderRadius: '20px' }}>
              <MapPin size={14} /> GPS Buscando...
            </span>
          )}

          {/* Connectivity status */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.4rem', 
            fontSize: '0.8rem', 
            fontWeight: '700',
            backgroundColor: isOnline ? '#dcfce7' : '#fee2e2', 
            color: isOnline ? '#15803d' : '#b91c1c',
            padding: '0.25rem 0.6rem',
            borderRadius: '20px'
          }}>
            {isOnline ? <Wifi size={14} /> : <WifiOff size={14} />}
            {isOnline ? 'En línea' : 'Desconectado'}
          </div>
        </div>
      </div>

      {/* RENDER MODE A: AUTOMATIC KIOSK (DEFAULT) */}
      {!isAdminMode ? (
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center',
          minHeight: '520px',
          gap: '2rem',
          width: '100%'
        }}>
          
          {/* Main Success State Card */}
          {successMsg && (
            <div className="card" style={{ 
              padding: '3rem 2rem', 
              textAlign: 'center', 
              maxWidth: '550px', 
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '1.5rem',
              border: '2px solid #86efac',
              background: 'linear-gradient(180deg, #ffffff 0%, #f0fdf4 100%)',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.05)'
            }}>
              <div style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                backgroundColor: '#dcfce7',
                color: '#16a34a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 10px 15px -3px rgba(22, 163, 74, 0.2)'
              }}>
                <CheckCircle2 size={48} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.8rem', fontWeight: '900', color: '#166534', marginBottom: '0.5rem' }}>
                  ¡Registro Exitoso!
                </h3>
                <p style={{ fontSize: '1.1rem', color: '#14532d', fontWeight: '700', margin: 0 }}>
                  {successMsg}
                </p>
              </div>
              
              {capturedPhotoUrl && (
                <div style={{ width: '130px', height: '130px', borderRadius: '50%', overflow: 'hidden', border: '4px solid #16a34a', marginTop: '0.5rem', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                  <img src={capturedPhotoUrl} alt="Colaborador" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              )}

              <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0 }}>
                La pantalla volverá al inicio automáticamente en unos segundos...
              </p>
            </div>
          )}

          {/* Main Error State Notification */}
          {errorMsg && !successMsg && (
            <div className="card" style={{ 
              padding: '2rem', 
              textAlign: 'center', 
              maxWidth: '500px', 
              width: '100%',
              border: '1px solid #fca5a5',
              backgroundColor: '#fef2f2',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '1rem'
            }}>
              <div style={{
                width: '50px',
                height: '50px',
                borderRadius: '50%',
                backgroundColor: '#fee2e2',
                color: '#b91c1c',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <AlertTriangle size={28} />
              </div>
              <div>
                <h4 style={{ fontSize: '1.2rem', fontWeight: '800', color: '#991b1b', marginBottom: '0.25rem' }}>
                  Ha ocurrido un problema
                </h4>
                <p style={{ fontSize: '0.9rem', color: '#b91c1c', margin: 0, fontWeight: '600' }}>
                  {errorMsg}
                </p>
              </div>
              <button 
                onClick={() => { setErrorMsg(null); setAuthMode('none'); }}
                style={{
                  padding: '0.5rem 1.25rem',
                  backgroundColor: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  color: '#475569',
                  fontWeight: '700',
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                Volver a intentar
              </button>
            </div>
          )}

          {/* Active Facial Recognition View */}
          {authMode === 'facial' && !successMsg && !errorMsg && (
            <FaceRecognitionAutoClient 
              users={users} 
              onFaceMatched={handleFaceMatchedAuto}
              onCancel={() => setAuthMode('none')}
            />
          )}

          {/* Active Fingerprint Loader View */}
          {authMode === 'huella' && isLoading && !successMsg && !errorMsg && (
            <div className="card" style={{ 
              textAlign: 'center', 
              padding: '3rem 2rem', 
              maxWidth: '450px',
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '1.5rem',
              border: '1px dashed #cbd5e1'
            }}>
              <div style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                color: '#10b981',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                animation: 'pulse 1.5s infinite'
              }}>
                <Fingerprint size={42} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.4rem', fontWeight: '800', color: '#1e293b', marginBottom: '0.5rem' }}>
                  Esperando Lector biométrico
                </h3>
                <p style={{ fontSize: '0.95rem', color: '#64748b', margin: 0 }}>
                  Coloca tu dedo en el escáner de huellas dactilares.
                </p>
              </div>
              
              <button
                onClick={() => { setAuthMode('none'); setIsLoading(false); }}
                style={{
                  padding: '0.6rem 1.5rem',
                  backgroundColor: '#ffffff',
                  color: '#64748b',
                  border: '1px solid #cbd5e1',
                  borderRadius: '10px',
                  fontWeight: '700',
                  fontSize: '0.85rem',
                  cursor: 'pointer'
                }}
              >
                Cancelar
              </button>
            </div>
          )}

          {/* General Loading indicator */}
          {isLoading && authMode === 'none' && !successMsg && !errorMsg && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
              <Loader2 className="animate-spin" size={40} color="var(--pulpos-primary)" />
              <span style={{ fontSize: '0.95rem', fontWeight: 'bold', color: '#475569' }}>
                Verificando datos en el servidor...
              </span>
            </div>
          )}

          {/* Default state: Choose Action and Biometric Option */}
          {authMode === 'none' && !successMsg && !errorMsg && !isLoading && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', width: '100%', maxWidth: '650px', alignItems: 'center' }}>
              
              {/* Step 1: Select CHECK_IN / CHECK_OUT */}
              <div style={{ width: '100%', textAlign: 'center' }}>
                <h3 style={{ fontSize: '1.05rem', fontWeight: '800', color: '#475569', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.025em' }}>
                  Paso 1: Selecciona la acción
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                  <button
                    onClick={() => setAttendanceType('CHECK_IN')}
                    style={{
                      padding: '1.25rem',
                      borderRadius: '16px',
                      border: attendanceType === 'CHECK_IN' ? '3px solid #16a34a' : '1px solid #cbd5e1',
                      backgroundColor: attendanceType === 'CHECK_IN' ? '#dcfce7' : '#ffffff',
                      color: attendanceType === 'CHECK_IN' ? '#14532d' : '#475569',
                      fontWeight: '800',
                      fontSize: '1.1rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.75rem',
                      boxShadow: attendanceType === 'CHECK_IN' ? '0 10px 15px -3px rgba(22, 163, 74, 0.15)' : 'none',
                      transition: 'all 0.2s'
                    }}
                  >
                    <LogIn size={22} /> Entrada (Check-In)
                  </button>

                  <button
                    onClick={() => setAttendanceType('CHECK_OUT')}
                    style={{
                      padding: '1.25rem',
                      borderRadius: '16px',
                      border: attendanceType === 'CHECK_OUT' ? '3px solid #ea580c' : '1px solid #cbd5e1',
                      backgroundColor: attendanceType === 'CHECK_OUT' ? '#ffedd5' : '#ffffff',
                      color: attendanceType === 'CHECK_OUT' ? '#7c2d12' : '#475569',
                      fontWeight: '800',
                      fontSize: '1.1rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.75rem',
                      boxShadow: attendanceType === 'CHECK_OUT' ? '0 10px 15px -3px rgba(234, 88, 12, 0.15)' : 'none',
                      transition: 'all 0.2s'
                    }}
                  >
                    <LogOut size={22} /> Salida (Check-Out)
                  </button>
                </div>
              </div>

              {/* Step 2: Choose Biometric verification */}
              <div style={{ width: '100%', textAlign: 'center', marginTop: '0.5rem' }}>
                <h3 style={{ fontSize: '1.05rem', fontWeight: '800', color: '#475569', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.025em' }}>
                  Paso 2: Escanea tu Huella o Rostro
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', width: '100%' }}>
                  
                  {/* Fingerprint Card */}
                  <button
                    onClick={handleFingerprintAuthAuto}
                    className="card"
                    style={{
                      padding: '2.5rem 2rem',
                      border: '1px solid #cbd5e1',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '1.25rem',
                      textAlign: 'center',
                      transition: 'all 0.25s',
                      boxShadow: '0 10px 15px -3px rgba(0,0,0,0.04)',
                      outline: 'none'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#10b981';
                      e.currentTarget.style.transform = 'translateY(-4px)';
                      e.currentTarget.style.boxShadow = '0 20px 25px -5px rgba(16, 185, 129, 0.1)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#cbd5e1';
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0,0,0,0.04)';
                    }}
                  >
                    <div style={{
                      padding: '1rem',
                      backgroundColor: 'rgba(16, 185, 129, 0.08)',
                      borderRadius: '16px',
                      color: '#10b981',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <Fingerprint size={48} />
                    </div>
                    <div>
                      <h4 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#1e293b', margin: '0 0 0.5rem' }}>
                        Verificación por Huella
                      </h4>
                      <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0, maxWidth: '220px' }}>
                        Usa el lector USB dactilar configurado en tu equipo.
                      </p>
                    </div>
                    <span style={{ fontSize: '0.8rem', color: '#10b981', fontWeight: '800', backgroundColor: 'rgba(16, 185, 129, 0.08)', padding: '0.3rem 0.75rem', borderRadius: '20px' }}>
                      Escanear Huella
                    </span>
                  </button>

                  {/* Facial Recognition Card */}
                  <button
                    onClick={() => setAuthMode('facial')}
                    className="card"
                    style={{
                      padding: '2.5rem 2rem',
                      border: '1px solid #cbd5e1',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '1.25rem',
                      textAlign: 'center',
                      transition: 'all 0.25s',
                      boxShadow: '0 10px 15px -3px rgba(0,0,0,0.04)',
                      outline: 'none'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#3b82f6';
                      e.currentTarget.style.transform = 'translateY(-4px)';
                      e.currentTarget.style.boxShadow = '0 20px 25px -5px rgba(59, 130, 246, 0.1)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#cbd5e1';
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0,0,0,0.04)';
                    }}
                  >
                    <div style={{
                      padding: '1rem',
                      backgroundColor: 'rgba(59, 130, 246, 0.08)',
                      borderRadius: '16px',
                      color: '#3b82f6',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <Camera size={48} />
                    </div>
                    <div>
                      <h4 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#1e293b', margin: '0 0 0.5rem' }}>
                        Reconocimiento Facial
                      </h4>
                      <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0, maxWidth: '220px' }}>
                        Toma una selfie rápida para escanear y verificar tu identidad.
                      </p>
                    </div>
                    <span style={{ fontSize: '0.8rem', color: '#3b82f6', fontWeight: '800', backgroundColor: 'rgba(59, 130, 246, 0.08)', padding: '0.3rem 0.75rem', borderRadius: '20px' }}>
                      Activar Cámara
                    </span>
                  </button>

                </div>
              </div>

            </div>
          )}

          {/* Toggle button to change to Admin Mode (enrollment) */}
          {authMode === 'none' && !successMsg && !errorMsg && !isLoading && (
            <button
              onClick={() => setIsAdminMode(true)}
              style={{
                marginTop: '3rem',
                padding: '0.65rem 1.25rem',
                backgroundColor: '#f1f5f9',
                color: '#475569',
                border: '1px solid #cbd5e1',
                borderRadius: '10px',
                fontWeight: '700',
                fontSize: '0.85rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                transition: 'all 0.2s'
              }}
            >
              <Settings size={16} /> Administrar Biometría / Registrar Nuevas Huellas
            </button>
          )}

        </div>
      ) : (
        /* RENDER MODE B: ADMIN ENROLLMENT CONSOLE (ORIGINAL TWO-COLUMN LAYOUT) */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          
          {/* Header to exit admin mode */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <button
              onClick={() => {
                setIsAdminMode(false);
                resetSelection();
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                backgroundColor: '#ffffff',
                border: '1px solid #cbd5e1',
                padding: '0.5rem 1rem',
                borderRadius: '10px',
                color: '#475569',
                fontWeight: '700',
                fontSize: '0.85rem',
                cursor: 'pointer',
                boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
              }}
            >
              <ArrowLeft size={16} /> Volver al Kiosko de Asistencia
            </button>

            <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: 'bold' }}>
              Modo Enrolamiento / Administración
            </span>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: '350px 1fr',
            gap: '2rem',
            alignItems: 'start'
          }} className="kiosko-container">
            
            <style jsx global>{`
              @media (max-width: 1024px) {
                .kiosko-container {
                  grid-template-columns: 1fr !important;
                }
              }
            `}</style>

            {/* Left panel: Employee Selection */}
            <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', height: '650px' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: '800', color: '#1e293b', margin: 0 }}>
                Colaboradores
              </h2>

              {/* Search */}
              <div style={{ position: 'relative' }}>
                <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input
                  type="text"
                  placeholder="Buscar por nombre..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem 0.75rem 2.5rem',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#f8fafc',
                    fontSize: '0.9rem',
                    color: '#334155',
                    outline: 'none'
                  }}
                />
              </div>

              {/* Scrollable employee list */}
              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingRight: '4px' }}>
                {filteredUsers.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#94a3b8', fontSize: '0.9rem' }}>
                    No se encontraron colaboradores.
                  </div>
                ) : (
                  filteredUsers.map(u => {
                    const isSelected = selectedUser?.id === u.id;
                    const hasBiometrics = !!u.webauthnCredentialId;
                    const hasFace = !!u.faceDescriptor;

                    return (
                      <button
                        key={u.id}
                        onClick={() => {
                          setSelectedUser(u);
                          setAuthMode('none');
                          setErrorMsg(null);
                          setSuccessMsg(null);
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.75rem',
                          width: '100%',
                          padding: '0.85rem 1rem',
                          borderRadius: '12px',
                          border: isSelected ? '2px solid var(--pulpos-primary)' : '1px solid #e2e8f0',
                          backgroundColor: isSelected ? 'rgba(59, 130, 246, 0.05)' : '#ffffff',
                          cursor: 'pointer',
                          textAlign: 'left',
                          transition: 'all 0.2s'
                        }}
                      >
                        <div style={{ 
                          width: '40px', 
                          height: '40px', 
                          borderRadius: '50%', 
                          backgroundColor: isSelected ? '#3b82f6' : '#f1f5f9',
                          color: isSelected ? '#ffffff' : '#64748b',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 'bold',
                          fontSize: '1rem'
                        }}>
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                        <div style={{ flex: 1, overflow: 'hidden' }}>
                          <div style={{ fontWeight: '700', fontSize: '0.9rem', color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {u.name}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'capitalize' }}>
                            {u.role.toLowerCase()}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '0.25rem' }}>
                          {hasBiometrics && (
                            <span title="Huella Enrolada" style={{ color: '#10b981' }}>
                              <Fingerprint size={16} />
                            </span>
                          )}
                          {hasFace && (
                            <span title="Rostro Enrolado" style={{ color: '#3b82f6' }}>
                              <Camera size={16} />
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Right panel: Authentication console */}
            <div className="card" style={{ padding: '2rem', height: '650px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              {!selectedUser ? (
                <div style={{ textAlign: 'center', color: '#64748b', padding: '3rem' }}>
                  <div style={{
                    width: '80px',
                    height: '80px',
                    borderRadius: '50%',
                    backgroundColor: '#f1f5f9',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '1.5rem',
                    color: '#94a3b8'
                  }}>
                    <UserCheck size={40} />
                  </div>
                  <h3 style={{ fontSize: '1.4rem', fontWeight: '800', color: '#1e293b', marginBottom: '0.5rem' }}>
                    Administrar Biometría
                  </h3>
                  <p style={{ fontSize: '0.95rem', maxWidth: '400px', margin: '0 auto', color: '#94a3b8' }}>
                    Selecciona un colaborador de la lista lateral para enrolar su huella dactilar o actualizar su rostro de referencia.
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                  
                  {/* Header: Selected User */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', paddingBottom: '1.5rem', borderBottom: '1px solid #f1f5f9' }}>
                    <div>
                      <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--pulpos-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Colaborador Seleccionado
                      </span>
                      <h2 style={{ fontSize: '1.6rem', fontWeight: '800', color: '#1e293b', margin: '0.25rem 0' }}>
                        {selectedUser.name}
                      </h2>
                      <span style={{ fontSize: '0.85rem', color: '#64748b', textTransform: 'capitalize' }}>
                        Rol: {selectedUser.role.toLowerCase()}
                      </span>
                    </div>

                    <button
                      onClick={resetSelection}
                      style={{
                        border: 'none',
                        backgroundColor: '#f1f5f9',
                        color: '#64748b',
                        borderRadius: '50%',
                        width: '36px',
                        height: '36px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer'
                      }}
                    >
                      <X size={18} />
                    </button>
                  </div>

                  {/* Inner Content */}
                  <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem 0', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    
                    {/* Action Selector */}
                    <div>
                      <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 'bold', color: '#475569', marginBottom: '0.5rem' }}>
                        1. Acción a registrar:
                      </label>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <button
                          onClick={() => setAttendanceType('CHECK_IN')}
                          style={{
                            padding: '0.85rem',
                            borderRadius: '10px',
                            border: attendanceType === 'CHECK_IN' ? '2px solid #16a34a' : '1px solid #cbd5e1',
                            backgroundColor: attendanceType === 'CHECK_IN' ? '#dcfce7' : '#ffffff',
                            color: attendanceType === 'CHECK_IN' ? '#14532d' : '#475569',
                            fontWeight: '800',
                            cursor: 'pointer'
                          }}
                        >
                          Entrada (Check-In)
                        </button>
                        <button
                          onClick={() => setAttendanceType('CHECK_OUT')}
                          style={{
                            padding: '0.85rem',
                            borderRadius: '10px',
                            border: attendanceType === 'CHECK_OUT' ? '2px solid #ea580c' : '1px solid #cbd5e1',
                            backgroundColor: attendanceType === 'CHECK_OUT' ? '#ffedd5' : '#ffffff',
                            color: attendanceType === 'CHECK_OUT' ? '#7c2d12' : '#475569',
                            fontWeight: '800',
                            cursor: 'pointer'
                          }}
                        >
                          Salida (Check-Out)
                        </button>
                      </div>
                    </div>

                    {/* Status Notifications */}
                    {errorMsg && (
                      <div style={{ padding: '1rem', backgroundColor: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '12px', color: '#b91c1c', fontSize: '0.85rem', fontWeight: 'bold', display: 'flex', gap: '0.5rem' }}>
                        <AlertTriangle size={18} style={{ flexShrink: 0 }} />
                        <div>{errorMsg}</div>
                      </div>
                    )}

                    {successMsg && (
                      <div style={{ padding: '1rem', backgroundColor: '#dcfce7', border: '1px solid #86efac', borderRadius: '12px', color: '#15803d', fontSize: '0.9rem', fontWeight: 'bold', display: 'flex', gap: '0.5rem' }}>
                        <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
                        <div>{successMsg}</div>
                      </div>
                    )}

                    {/* Options */}
                    {!successMsg && !isLoading && (
                      <div>
                        <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 'bold', color: '#475569', marginBottom: '0.75rem' }}>
                          2. Selecciona la opción de prueba o enrolamiento:
                        </label>

                        {authMode === 'none' && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            
                            {/* Test Fingerprint */}
                            <button
                              onClick={() => {
                                setAuthMode('huella');
                                setTimeout(() => { handleFingerprintAuthAdmin(); }, 100);
                              }}
                              disabled={!selectedUser.webauthnCredentialId}
                              style={{
                                width: '100%',
                                padding: '1.15rem',
                                borderRadius: '12px',
                                border: '1px solid #cbd5e1',
                                backgroundColor: selectedUser.webauthnCredentialId ? '#ffffff' : '#f8fafc',
                                cursor: selectedUser.webauthnCredentialId ? 'pointer' : 'not-allowed',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                opacity: selectedUser.webauthnCredentialId ? 1 : 0.6
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <Fingerprint size={22} color="#10b981" />
                                <div style={{ textAlign: 'left' }}>
                                  <div style={{ fontWeight: '800', color: '#1e293b', fontSize: '0.9rem' }}>Probar Huella Registrada</div>
                                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Simula asistencia con la huella registrada</div>
                                </div>
                              </div>
                            </button>

                            {/* Test Facial */}
                            <button
                              onClick={() => setAuthMode('facial')}
                              disabled={!selectedUser.faceDescriptor}
                              style={{
                                width: '100%',
                                padding: '1.15rem',
                                borderRadius: '12px',
                                border: '1px solid #cbd5e1',
                                backgroundColor: selectedUser.faceDescriptor ? '#ffffff' : '#f8fafc',
                                cursor: selectedUser.faceDescriptor ? 'pointer' : 'not-allowed',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                opacity: selectedUser.faceDescriptor ? 1 : 0.6
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <Camera size={22} color="#3b82f6" />
                                <div style={{ textAlign: 'left' }}>
                                  <div style={{ fontWeight: '800', color: '#1e293b', fontSize: '0.9rem' }}>Probar Rostro Registrado</div>
                                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Simula reconocimiento con selfie</div>
                                </div>
                              </div>
                            </button>

                            {/* Enroll Biometrics Button */}
                            <div style={{ marginTop: '1.5rem', borderTop: '1px solid #f1f5f9', paddingTop: '1.5rem' }}>
                              {isOnline ? (
                                <button
                                  onClick={() => {
                                    setPasswordError(null);
                                    setShowEnrollModal(true);
                                  }}
                                  style={{
                                    width: '100%',
                                    padding: '0.85rem',
                                    backgroundColor: 'var(--pulpos-primary)',
                                    color: '#ffffff',
                                    border: 'none',
                                    borderRadius: '10px',
                                    fontWeight: '700',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.5rem'
                                  }}
                                >
                                  <KeyRound size={16} /> Enrolar / Registrar mi Huella Dactilar
                                </button>
                              ) : (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: '#b91c1c', backgroundColor: '#fef2f2', padding: '0.5rem', borderRadius: '6px' }}>
                                  <AlertTriangle size={14} />
                                  El registro de huella dactilar requiere conexión a internet para validar tu cuenta.
                                </div>
                              )}
                            </div>

                          </div>
                        )}

                        {/* Fingerprint Authenticating Screen */}
                        {authMode === 'huella' && (
                          <div style={{ textAlign: 'center', padding: '2rem', backgroundColor: '#f8fafc', borderRadius: '16px', border: '1px dashed #cbd5e1', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                            <Fingerprint size={36} color="#10b981" />
                            <h4 style={{ margin: 0, fontWeight: '800', fontSize: '1.1rem', color: '#1e293b' }}>
                              Coloca tu dedo en el lector biométrico
                            </h4>
                            <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                              <button onClick={handleFingerprintAuthAdmin} style={{ padding: '0.5rem 1rem', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '0.8rem', cursor: 'pointer' }}>
                                Reintentar
                              </button>
                              <button onClick={() => setAuthMode('none')} style={{ padding: '0.5rem 1rem', backgroundColor: '#ffffff', color: '#64748b', border: '1px solid #cbd5e1', borderRadius: '8px', fontWeight: 'bold', fontSize: '0.8rem', cursor: 'pointer' }}>
                                Cancelar
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Facial Recognition Panel */}
                        {authMode === 'facial' && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#475569' }}>Alinea tu rostro al centro:</span>
                              <button onClick={() => setAuthMode('none')} style={{ backgroundColor: 'transparent', border: 'none', color: '#ef4444', fontWeight: 'bold', fontSize: '0.8rem', cursor: 'pointer', textDecoration: 'underline' }}>
                                Cancelar
                              </button>
                            </div>
                            <FaceRecognitionClient 
                              user={selectedUser} 
                              onFaceMatched={(matched) => console.log('Face match status:', matched)}
                              onPhotoCaptured={handleFacePhotoCapturedAdmin}
                            />
                          </div>
                        )}

                      </div>
                    )}

                    {/* General Loader */}
                    {isLoading && (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem', padding: '2rem' }}>
                        <Loader2 className="animate-spin" size={36} color="var(--pulpos-primary)" />
                        <span style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#475569' }}>
                          Guardando registro en la base de datos...
                        </span>
                      </div>
                    )}

                  </div>

                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* Enrollment Password Verification Dialog (Modal) */}
      {showEnrollModal && selectedUser && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 999
        }}>
          <form onSubmit={handleVerifyPasswordForEnroll} style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            padding: '2rem',
            width: '100%',
            maxWidth: '450px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            border: '1px solid #e2e8f0',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: '800', color: '#1e293b', margin: 0 }}>
                Registrar Huella Dactilar
              </h3>
              <button
                type="button"
                onClick={() => setShowEnrollModal(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0 }}>
              Por seguridad, introduce tu contraseña de colaborador para verificar tu identidad antes de registrar tu huella en este dispositivo.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#475569' }}>
                Contraseña de Acceso:
              </label>
              <input
                type="password"
                required
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="Ingresa tu contraseña"
                style={{
                  padding: '0.75rem',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  outline: 'none',
                  fontSize: '0.9rem'
                }}
              />
            </div>

            {passwordError && (
              <div style={{
                fontSize: '0.8rem',
                color: '#b91c1c',
                backgroundColor: '#fef2f2',
                padding: '0.5rem 0.75rem',
                borderRadius: '6px',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem'
              }}>
                <AlertTriangle size={14} />
                {passwordError}
              </div>
            )}

            <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
              <button
                type="button"
                onClick={() => setShowEnrollModal(false)}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  border: '1px solid #cbd5e1',
                  borderRadius: '10px',
                  backgroundColor: '#ffffff',
                  color: '#475569',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                Cancelar
              </button>
              
              <button
                type="submit"
                disabled={isPasswordValidating || isBiometricEnrolling}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  border: 'none',
                  borderRadius: '10px',
                  backgroundColor: 'var(--pulpos-primary)',
                  color: '#ffffff',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem'
                }}
              >
                {isPasswordValidating || isBiometricEnrolling ? (
                  <>
                    <Loader2 className="animate-spin" size={16} />
                    {isBiometricEnrolling ? 'Coloca tu dedo...' : 'Verificando...'}
                  </>
                ) : (
                  'Registrar Huella'
                )}
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
