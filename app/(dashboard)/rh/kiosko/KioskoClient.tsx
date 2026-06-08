'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, User, Fingerprint, Camera, CheckCircle2, AlertTriangle, 
  Wifi, WifiOff, KeyRound, Loader2, ShieldCheck, RefreshCw, 
  UserCheck, MapPin, X 
} from 'lucide-react';
import { 
  registerAttendance, 
  registerFingerprintCredential, 
  verifyUserPassword 
} from '@/app/actions/hr';
import FaceRecognitionClient from '@/app/(dashboard)/mi-portal/FaceRecognitionClient';
import { registerFingerprint, authenticateFingerprint } from '@/app/lib/webauthn';
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
  const [selectedUser, setSelectedUser] = useState<UserKiosk | null>(null);
  
  // Attendance settings
  const [attendanceType, setAttendanceType] = useState<'CHECK_IN' | 'CHECK_OUT'>('CHECK_IN');
  const [authMode, setAuthMode] = useState<'huella' | 'facial' | 'none'>('none');
  const [faceMatched, setFaceMatched] = useState(false);
  const [capturedPhotoUrl, setCapturedPhotoUrl] = useState<string | null>(null);
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number } | null>(null);
  
  // Alerts and loaders
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  
  // Fingerprint enrollment flow
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [isPasswordValidating, setIsPasswordValidating] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isBiometricEnrolling, setIsBiometricEnrolling] = useState(false);

  // Fetch coordinates on mount or user selection
  useEffect(() => {
    if (typeof window !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setGpsCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        },
        (err) => {
          console.warn("GPS tracking disabled or unavailable for Kiosk Mode:", err.message);
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    }
  }, [selectedUser]);

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

  // Filter users based on search
  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (u.email && u.email.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const resetSelection = () => {
    setSelectedUser(null);
    setAuthMode('none');
    setFaceMatched(false);
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

        setSuccessMsg(`¡Registro offline guardado con éxito! Se sincronizará automáticamente cuando regrese el internet. (${type === 'CHECK_IN' ? 'Entrada' : 'Salida'})`);
        setTimeout(() => {
          resetSelection();
        }, 5000);
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

        setSuccessMsg(`¡Asistencia registrada con éxito! (${type === 'CHECK_IN' ? 'Entrada' : 'Salida'})`);
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

  // Trigger Fingerprint verification via WebAuthn
  const handleFingerprintAuth = async () => {
    if (!selectedUser) return;
    if (!selectedUser.webauthnCredentialId) {
      setErrorMsg("Este usuario no tiene una huella dactilar registrada.");
      return;
    }

    setErrorMsg(null);
    setSuccessMsg(null);
    setIsLoading(true);

    try {
      // Prompt hardware biometric sensor
      await authenticateFingerprint(selectedUser.webauthnCredentialId);
      
      // Verification success, proceed with registration log
      await submitAttendance(selectedUser.id, attendanceType);
    } catch (e: any) {
      console.error("Biometric authentication error:", e);
      setErrorMsg(e.message || "La verificación de huella dactilar falló o fue cancelada.");
      setIsLoading(false);
    }
  };

  // Face recognition match success callback
  const handleFaceMatched = (matched: boolean) => {
    setFaceMatched(matched);
  };

  const handleFacePhotoCaptured = (photo: string) => {
    setCapturedPhotoUrl(photo);
    // Face matched successfully, trigger attendance submit immediately to save click time in kiosk mode
    if (selectedUser) {
      submitAttendance(selectedUser.id, attendanceType, photo);
    }
  };

  // Secure Fingerprint Enrollment Handler
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

      // Password validated, start fingerprint reader enrollment
      setIsBiometricEnrolling(true);
      
      const credential = await registerFingerprint(selectedUser.id, selectedUser.name);
      
      // Save credential on the server
      const saveRes = await registerFingerprintCredential({
        userId: selectedUser.id,
        credentialId: credential.credentialId,
        publicKey: credential.publicKey
      });

      if (!saveRes.success) {
        throw new Error(saveRes.error || "No se pudo vincular la huella dactilar en el servidor.");
      }

      // Success
      setSuccessMsg("¡Huella dactilar registrada con éxito! Ya puedes usar el lector para registrar tu asistencia.");
      
      // Update local states
      const updatedUser = { 
        ...selectedUser, 
        webauthnCredentialId: credential.credentialId, 
        webauthnPublicKey: credential.publicKey 
      };
      
      // Replace in local users array
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

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '350px 1fr',
      gap: '2rem',
      alignItems: 'start'
    }} className="kiosko-container">
      
      {/* Mobile/Tablet responsive layout overrides */}
      <style jsx global>{`
        @media (max-width: 1024px) {
          .kiosko-container {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>

      {/* Left panel: Employee Selection */}
      <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', height: '650px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: '800', color: '#1e293b', margin: 0 }}>
            Colaboradores
          </h2>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.4rem', 
            fontSize: '0.8rem', 
            fontWeight: '600',
            backgroundColor: isOnline ? '#dcfce7' : '#fee2e2', 
            color: isOnline ? '#15803d' : '#b91c1c',
            padding: '0.25rem 0.6rem',
            borderRadius: '20px'
          }}>
            {isOnline ? <Wifi size={14} /> : <WifiOff size={14} />}
            {isOnline ? 'En línea' : 'Desconectado'}
          </div>
        </div>

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
              outline: 'none',
              transition: 'all 0.2s'
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
                    setFaceMatched(false);
                    setCapturedPhotoUrl(null);
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
                  {/* Indicators */}
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
          /* Placeholder View */
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
              Comienza tu Registro
            </h3>
            <p style={{ fontSize: '0.95rem', maxWidth: '400px', margin: '0 auto', color: '#94a3b8' }}>
              Selecciona tu nombre en la lista de colaboradores para iniciar la verificación facial o por huella dactilar.
            </p>
          </div>
        ) : (
          /* Active console */
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            
            {/* Header: Selected User Info */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', paddingBottom: '1.5rem', borderBottom: '1px solid #f1f5f9' }}>
              <div>
                <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--pulpos-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Colaborador Seleccionado
                </span>
                <h2 style={{ fontSize: '1.6rem', fontWeight: '800', color: '#1e293b', margin: '0.25rem 0' }}>
                  {selectedUser.name}
                </h2>
                <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.85rem', color: '#64748b', alignItems: 'center' }}>
                  <span style={{ textTransform: 'capitalize' }}>Rol: {selectedUser.role.toLowerCase()}</span>
                  <span>•</span>
                  {gpsCoords ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem', color: '#16a34a' }}>
                      <MapPin size={14} /> GPS Listo
                    </span>
                  ) : (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem', color: '#f59e0b' }}>
                      <MapPin size={14} /> Sin GPS
                    </span>
                  )}
                </div>
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
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                title="Cerrar Panel"
              >
                <X size={18} />
              </button>
            </div>

            {/* Inner view content */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem 0', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              
              {/* Step 1: Select Type */}
              <div>
                <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 'bold', color: '#475569', marginBottom: '0.5rem' }}>
                  1. Selecciona la acción a registrar:
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <button
                    onClick={() => {
                      setAttendanceType('CHECK_IN');
                      setFaceMatched(false);
                      setCapturedPhotoUrl(null);
                    }}
                    style={{
                      padding: '1rem',
                      borderRadius: '12px',
                      border: attendanceType === 'CHECK_IN' ? '2px solid #16a34a' : '1px solid #cbd5e1',
                      backgroundColor: attendanceType === 'CHECK_IN' ? '#dcfce7' : '#ffffff',
                      color: attendanceType === 'CHECK_IN' ? '#14532d' : '#475569',
                      fontWeight: '800',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                      transition: 'all 0.2s'
                    }}
                  >
                    <UserCheck size={18} /> Entrada (Check-In)
                  </button>

                  <button
                    onClick={() => {
                      setAttendanceType('CHECK_OUT');
                      setFaceMatched(false);
                      setCapturedPhotoUrl(null);
                    }}
                    style={{
                      padding: '1rem',
                      borderRadius: '12px',
                      border: attendanceType === 'CHECK_OUT' ? '2px solid #ea580c' : '1px solid #cbd5e1',
                      backgroundColor: attendanceType === 'CHECK_OUT' ? '#ffedd5' : '#ffffff',
                      color: attendanceType === 'CHECK_OUT' ? '#7c2d12' : '#475569',
                      fontWeight: '800',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                      transition: 'all 0.2s'
                    }}
                  >
                    <UserCheck size={18} style={{ transform: 'scaleX(-1)' }} /> Salida (Check-Out)
                  </button>
                </div>
              </div>

              {/* Status Notifications */}
              {errorMsg && (
                <div style={{
                  padding: '1rem',
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fca5a5',
                  borderRadius: '12px',
                  color: '#b91c1c',
                  fontSize: '0.85rem',
                  fontWeight: 'bold',
                  display: 'flex',
                  alignItems: 'start',
                  gap: '0.5rem'
                }}>
                  <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div>{errorMsg}</div>
                </div>
              )}

              {successMsg && (
                <div style={{
                  padding: '1rem',
                  backgroundColor: '#dcfce7',
                  border: '1px solid #86efac',
                  borderRadius: '12px',
                  color: '#15803d',
                  fontSize: '0.9rem',
                  fontWeight: 'bold',
                  display: 'flex',
                  alignItems: 'start',
                  gap: '0.5rem'
                }}>
                  <CheckCircle2 size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div>{successMsg}</div>
                </div>
              )}

              {/* Step 2: Choose Biometric Authentication */}
              {!successMsg && !isLoading && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 'bold', color: '#475569', marginBottom: '0.75rem' }}>
                    2. Elige tu método de validación biométrica:
                  </label>

                  {authMode === 'none' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      
                      {/* Fingerprint Authenticator Button */}
                      <button
                        onClick={() => {
                          setAuthMode('huella');
                          // Trigger immediately
                          setTimeout(() => { handleFingerprintAuth(); }, 100);
                        }}
                        disabled={!selectedUser.webauthnCredentialId}
                        style={{
                          width: '100%',
                          padding: '1.25rem',
                          borderRadius: '14px',
                          border: '1px solid #cbd5e1',
                          backgroundColor: selectedUser.webauthnCredentialId ? '#ffffff' : '#f8fafc',
                          cursor: selectedUser.webauthnCredentialId ? 'pointer' : 'not-allowed',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
                          transition: 'all 0.2s',
                          opacity: selectedUser.webauthnCredentialId ? 1 : 0.6
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                          <div style={{
                            padding: '0.5rem',
                            backgroundColor: 'rgba(16, 185, 129, 0.1)',
                            borderRadius: '10px',
                            color: '#10b981'
                          }}>
                            <Fingerprint size={24} />
                          </div>
                          <div style={{ textAlign: 'left' }}>
                            <div style={{ fontWeight: '800', color: '#1e293b', fontSize: '0.95rem' }}>
                              Lector de Huella Dactilar
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                              {selectedUser.webauthnCredentialId ? 'Usa tu huella registrada en este dispositivo' : 'No se ha registrado ninguna huella para tu usuario'}
                            </div>
                          </div>
                        </div>
                        <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 'bold', backgroundColor: 'rgba(16, 185, 129, 0.1)', padding: '0.2rem 0.5rem', borderRadius: '20px' }}>
                          Recomendado
                        </span>
                      </button>

                      {/* Facial Recognition Button */}
                      <button
                        onClick={() => setAuthMode('facial')}
                        disabled={!selectedUser.faceDescriptor}
                        style={{
                          width: '100%',
                          padding: '1.25rem',
                          borderRadius: '14px',
                          border: '1px solid #cbd5e1',
                          backgroundColor: selectedUser.faceDescriptor ? '#ffffff' : '#f8fafc',
                          cursor: selectedUser.faceDescriptor ? 'pointer' : 'not-allowed',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
                          transition: 'all 0.2s',
                          opacity: selectedUser.faceDescriptor ? 1 : 0.6
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                          <div style={{
                            padding: '0.5rem',
                            backgroundColor: 'rgba(59, 130, 246, 0.1)',
                            borderRadius: '10px',
                            color: '#3b82f6'
                          }}>
                            <Camera size={24} />
                          </div>
                          <div style={{ textAlign: 'left' }}>
                            <div style={{ fontWeight: '800', color: '#1e293b', fontSize: '0.95rem' }}>
                              Reconocimiento Facial
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                              {selectedUser.faceDescriptor ? 'Toma una selfie para verificar tu identidad' : 'No se ha registrado rostro de referencia'}
                            </div>
                          </div>
                        </div>
                      </button>

                      {/* Enrollment section */}
                      <div style={{ marginTop: '1rem', borderTop: '1px solid #f1f5f9', paddingTop: '1rem' }}>
                        {isOnline ? (
                          <button
                            onClick={() => {
                              setPasswordError(null);
                              setShowEnrollModal(true);
                            }}
                            style={{
                              width: '100%',
                              padding: '0.75rem',
                              backgroundColor: '#f1f5f9',
                              border: 'none',
                              borderRadius: '10px',
                              color: '#334155',
                              fontWeight: '700',
                              fontSize: '0.85rem',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '0.5rem',
                              transition: 'all 0.2s'
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
                    <div style={{ 
                      textAlign: 'center', 
                      padding: '2rem', 
                      backgroundColor: '#f8fafc', 
                      borderRadius: '16px', 
                      border: '1px dashed #cbd5e1',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '1rem'
                    }}>
                      <div style={{
                        width: '70px',
                        height: '70px',
                        borderRadius: '50%',
                        backgroundColor: '#dcfce7',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#10b981',
                        animation: 'pulse 1.5s infinite'
                      }}>
                        <Fingerprint size={36} />
                      </div>
                      <h4 style={{ margin: 0, fontWeight: '800', fontSize: '1.1rem', color: '#1e293b' }}>
                        Esperando Lector de Huella
                      </h4>
                      <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b', maxWidth: '300px' }}>
                        Coloca tu dedo en el lector biométrico del dispositivo cuando se te solicite.
                      </p>
                      <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                        <button
                          onClick={handleFingerprintAuth}
                          style={{
                            padding: '0.5rem 1rem',
                            backgroundColor: '#10b981',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            fontWeight: 'bold',
                            fontSize: '0.8rem',
                            cursor: 'pointer'
                          }}
                        >
                          Reintentar Lector
                        </button>
                        <button
                          onClick={() => setAuthMode('none')}
                          style={{
                            padding: '0.5rem 1rem',
                            backgroundColor: '#ffffff',
                            color: '#64748b',
                            border: '1px solid #cbd5e1',
                            borderRadius: '8px',
                            fontWeight: 'bold',
                            fontSize: '0.8rem',
                            cursor: 'pointer'
                          }}
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Facial Recognition Panel */}
                  {authMode === 'facial' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#475569' }}>
                          Alinea tu rostro al centro:
                        </span>
                        <button 
                          onClick={() => {
                            setAuthMode('none');
                            setFaceMatched(false);
                            setCapturedPhotoUrl(null);
                          }}
                          style={{
                            backgroundColor: 'transparent',
                            border: 'none',
                            color: '#ef4444',
                            fontWeight: 'bold',
                            fontSize: '0.8rem',
                            cursor: 'pointer',
                            textDecoration: 'underline'
                          }}
                        >
                          Cambiar de Método
                        </button>
                      </div>
                      <FaceRecognitionClient 
                        user={selectedUser} 
                        onFaceMatched={handleFaceMatched}
                        onPhotoCaptured={handleFacePhotoCaptured}
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
