'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import { Camera, CheckCircle2, AlertTriangle, Loader2, Upload, ShieldCheck, RefreshCw, X } from 'lucide-react';

export default function FaceRecognitionAutoClient({ 
  users, 
  onFaceMatched,
  onCancel
}: { 
  users: any[]; 
  onFaceMatched: (matchedUser: any, photo: string) => void;
  onCancel: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [captureMode, setCaptureMode] = useState<'stream' | 'native'>('stream');
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [hasPhoto, setHasPhoto] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  
  // Biometric validation states
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [similarity, setSimilarity] = useState<number | null>(null);
  const [matchStatus, setMatchStatus] = useState<'idle' | 'success' | 'mismatch' | 'error'>('idle');
  const [matchedUser, setMatchedUser] = useState<any | null>(null);

  // Dynamic model loading cache
  const [modelsLoaded, setModelsLoaded] = useState(false);

  // Pre-load face-api models in background on mount to speed up validation
  useEffect(() => {
    let active = true;
    async function loadModels() {
      try {
        const faceapi = await import('@vladmandic/face-api');
        if (active) {
          await Promise.all([
            faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
            faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
            faceapi.nets.faceRecognitionNet.loadFromUri('/models')
          ]);
          if (active) {
            setModelsLoaded(true);
            console.log("Face-api models pre-loaded successfully in background for auto-recon");
          }
        }
      } catch (err) {
        console.error("Error pre-loading face-api models:", err);
      }
    }
    loadModels();
    return () => {
      active = false;
    };
  }, []);

  // Automatically detect mobile devices to default to optimized Native System Camera capture
  useEffect(() => {
    const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if (isMobileDevice) {
      setCaptureMode('native');
    }
  }, []);

  // Stop video stream helper
  const stopStream = useCallback(() => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraReady(false);
  }, []);

  // Clean up stream on unmount
  useEffect(() => {
    return () => {
      stopStream();
    };
  }, [stopStream]);

  // Start webcam stream
  const startVideo = () => {
    setErrorMsg('');
    setMatchStatus('idle');
    setCaptureMode('stream');
    setMatchedUser(null);
    
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } })
      .then((stream) => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play()
            .then(() => setIsCameraReady(true))
            .catch(e => {
              console.error("Error playing video:", e);
              handleCameraFailure();
            });
        }
      })
      .catch((err) => {
        console.error("Camera access error:", err);
        handleCameraFailure();
      });
  };

  // Gracefully switch to native system camera if mediaDevices fails
  const handleCameraFailure = () => {
    setCaptureMode('native');
    setErrorMsg('Acceso a cámara en tiempo real no soportado o bloqueado. Usando cámara del sistema.');
  };

  // Trigger hidden native file input
  const triggerNativeCamera = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Perform face matching logic using face-api against all users
  const processAndMatchFace = async (photoUrl: string) => {
    setIsProcessing(true);
    setStatusMsg('Inicializando detector facial...');
    setErrorMsg('');
    setMatchedUser(null);

    try {
      const faceapi = await import('@vladmandic/face-api');
      
      if (!modelsLoaded) {
        setStatusMsg('Cargando redes neuronales (Memoria optimizada)...');
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
          faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
          faceapi.nets.faceRecognitionNet.loadFromUri('/models')
        ]);
        setModelsLoaded(true);
      }

      setStatusMsg('Procesando selfie capturada...');
      
      const img = new Image();
      img.onload = async () => {
        try {
          const tmpCanvas = document.createElement('canvas');
          const mx = Math.max(img.width, img.height);
          let ratio = mx > 320 ? 320 / mx : 1;
          tmpCanvas.width = img.width * ratio;
          tmpCanvas.height = img.height * ratio;
          
          const ctx = tmpCanvas.getContext('2d');
          if (!ctx) throw new Error("Could not create canvas 2D context");
          ctx.drawImage(img, 0, 0, tmpCanvas.width, tmpCanvas.height);

          setStatusMsg('Analizando patrones del rostro...');
          const detection = await faceapi.detectSingleFace(
            tmpCanvas, 
            new faceapi.TinyFaceDetectorOptions({ inputSize: 160, scoreThreshold: 0.15 })
          ).withFaceLandmarks().withFaceDescriptor();

          if (!detection) {
            setMatchStatus('error');
            setErrorMsg('No se detectó ningún rostro de forma clara. Intenta tomar la foto de frente con mejor iluminación.');
            setIsProcessing(false);
            return;
          }

          setStatusMsg('Buscando coincidencia en la lista de colaboradores...');
          
          const usersWithFaces = users.filter(u => u.faceDescriptor);
          if (usersWithFaces.length === 0) {
            setMatchStatus('error');
            setErrorMsg('No hay colaboradores con registros faciales de referencia en esta sucursal.');
            setIsProcessing(false);
            return;
          }

          let bestMatch: { user: any; distance: number; similarity: number } | null = null;

          for (const u of usersWithFaces) {
            try {
              const enrolledDescriptor = new Float32Array(JSON.parse(u.faceDescriptor));
              const distance = faceapi.euclideanDistance(detection.descriptor, enrolledDescriptor);
              const similarityScore = Math.max(0, Math.min(100, Math.round((1 - (distance / 1.5)) * 100)));
              
              if (bestMatch === null || distance < bestMatch.distance) {
                bestMatch = { user: u, distance, similarity: similarityScore };
              }
            } catch (err) {
              console.error(`Error comparing face with user ${u.name}:`, err);
            }
          }

          // We use the same threshold: similarityScore >= 50%
          if (!bestMatch || bestMatch.similarity < 50) {
            setMatchStatus('mismatch');
            setErrorMsg('Identidad no reconocida. Asegúrate de estar en un área bien iluminada, mirar de frente a la cámara y no usar lentes oscuros o gorras.');
            setIsProcessing(false);
            return;
          }

          const targetUser = bestMatch.user;
          const similarityScore = bestMatch.similarity;

          setSimilarity(similarityScore);
          setMatchedUser(targetUser);

          const downscaledPhoto = tmpCanvas.toDataURL('image/jpeg', 0.85);
          setMatchStatus('success');
          setCapturedPhoto(downscaledPhoto);
          setHasPhoto(true);
          
          // Trigger matched callback
          onFaceMatched(targetUser, downscaledPhoto);
          stopStream();
        } catch (e: any) {
          console.error("Inner face processing error:", e);
          setMatchStatus('error');
          setErrorMsg('Error al analizar la imagen: ' + e.message);
        } finally {
          setIsProcessing(false);
        }
      };

      img.onerror = () => {
        setMatchStatus('error');
        setErrorMsg('Error al cargar la foto capturada.');
        setIsProcessing(false);
      };

      img.src = photoUrl;

    } catch (err: any) {
      console.error("Global face processing error:", err);
      setMatchStatus('error');
      setErrorMsg('Error al iniciar el reconocimiento facial: ' + err.message);
      setIsProcessing(false);
    }
  };

  // Take photo from real-time webcam video stream
  const takePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      const photoUrl = canvas.toDataURL('image/jpeg', 0.85);
      processAndMatchFace(photoUrl);
    }
  }, [users, onFaceMatched, stopStream]);

  // Handle native camera capture file upload
  const handleNativeCapture = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const photoUrl = e.target?.result as string;
      processAndMatchFace(photoUrl);
    };
    reader.readAsDataURL(file);
  };

  const handleRetry = () => {
    setHasPhoto(false);
    setCapturedPhoto(null);
    setSimilarity(null);
    setMatchStatus('idle');
    setErrorMsg('');
    setMatchedUser(null);
    
    if (captureMode === 'stream') {
      startVideo();
    }
  };

  // SUCCESS STATE VIEW
  if (hasPhoto && capturedPhoto && matchedUser) {
    return (
      <div style={{ 
        textAlign: 'center', 
        padding: '2rem', 
        background: 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)', 
        borderRadius: '16px', 
        color: '#14532d',
        boxShadow: '0 10px 15px -3px rgba(22, 163, 74, 0.2)',
        border: '1px solid #86efac',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '0.75rem',
        width: '100%',
        maxWidth: '400px',
        margin: '0 auto'
      }}>
        <div style={{ position: 'relative', width: '120px', height: '120px', borderRadius: '50%', overflow: 'hidden', border: '4px solid #16a34a', boxShadow: '0 4px 6px rgba(0,0,0,0.15)' }}>
          <img src={capturedPhoto} alt="Selfie" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          <div style={{ position: 'absolute', bottom: 0, insetInline: 0, backgroundColor: 'rgba(22,163,74,0.95)', color: 'white', fontSize: '0.7rem', fontWeight: '800', padding: '2px 0' }}>
            VERIFICADO
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.5rem' }}>
          <ShieldCheck size={26} color="#16a34a" />
          <p style={{ fontWeight: '800', fontSize: '1.2rem', margin: 0 }}>Rostro Reconocido</p>
        </div>
        <h3 style={{ margin: '0.25rem 0 0', fontSize: '1.4rem', fontWeight: '900', color: '#166534' }}>
          {matchedUser.name}
        </h3>
        {similarity !== null && (
          <div style={{ 
            fontSize: '0.85rem', 
            fontWeight: '700', 
            backgroundColor: 'rgba(255,255,255,0.7)', 
            padding: '0.3rem 0.85rem', 
            borderRadius: '20px',
            color: '#15803d',
            marginTop: '0.25rem'
          }}>
            Coincidencia Facial: {similarity}%
          </div>
        )}
        <p style={{ fontSize: '0.85rem', margin: '0.5rem 0 0.75rem', color: '#166534', fontWeight: '500' }}>
          Identidad validada. Registrando asistencia...
        </p>
        <button 
          onClick={handleRetry}
          style={{ 
            fontSize: '0.8rem', 
            fontWeight: 'bold', 
            color: '#15803d', 
            backgroundColor: 'transparent', 
            border: 'none', 
            cursor: 'pointer', 
            display: 'inline-flex', 
            alignItems: 'center', 
            gap: '0.25rem',
            textDecoration: 'underline' 
          }}
        >
          <RefreshCw size={12} /> Reintentar reconocimiento
        </button>
      </div>
    );
  }

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      gap: '1.25rem', 
      padding: '2rem', 
      border: '1px solid #cbd5e1', 
      borderRadius: '20px', 
      backgroundColor: '#ffffff',
      boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)',
      width: '100%',
      maxWidth: '420px',
      margin: '0 auto'
    }}>
      
      <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: '800', color: '#334155', margin: 0 }}>
          Reconocimiento Facial
        </h3>
        <button
          onClick={onCancel}
          style={{
            background: 'none',
            border: 'none',
            color: '#64748b',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0.25rem',
            borderRadius: '50%',
            transition: 'background 0.2s'
          }}
          title="Cancelar"
        >
          <X size={20} />
        </button>
      </div>

      {/* Dynamic Status / Processing Banner */}
      {isProcessing && (
        <div style={{ 
          width: '100%', 
          padding: '0.75rem 1rem', 
          backgroundColor: '#eff6ff', 
          border: '1px solid #bfdbfe', 
          borderRadius: '10px', 
          color: '#1d4ed8', 
          fontSize: '0.85rem', 
          fontWeight: '600',
          display: 'flex', 
          alignItems: 'center', 
          gap: '0.75rem' 
        }}>
          <Loader2 className="animate-spin" size={18} style={{ color: '#2563eb' }} />
          <span>{statusMsg}</span>
        </div>
      )}

      {/* Error banner */}
      {errorMsg && (
        <div style={{ 
          width: '100%',
          padding: '0.75rem 1rem', 
          backgroundColor: '#fef2f2', 
          border: '1px solid #fca5a5', 
          borderRadius: '10px', 
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

      {/* Hidden inputs & canvas */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />
      <input 
        type="file" 
        accept="image/*" 
        capture="user" 
        ref={fileInputRef} 
        onChange={handleNativeCapture} 
        style={{ display: 'none' }} 
      />

      {/* Main Camera Viewport */}
      {captureMode === 'stream' ? (
        <div style={{ 
          position: 'relative', 
          width: '280px', 
          height: '280px', 
          borderRadius: '50%', // Circle shape for premium feel
          overflow: 'hidden', 
          border: '4px solid #f1f5f9', 
          backgroundColor: '#f8fafc',
          boxShadow: 'inset 0 4px 6px rgba(0,0,0,0.06)'
        }}>
          {!isCameraReady && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}>
              <Camera size={40} color="#cbd5e1" />
              <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: 0, fontWeight: 'bold' }}>Inicializando cámara...</p>
            </div>
          )}
          
          <video 
            ref={videoRef}
            autoPlay 
            muted 
            playsInline
            style={{ 
              width: '100%', 
              height: '100%', 
              objectFit: 'cover', 
              transform: 'scaleX(-1)', 
              display: isCameraReady ? 'block' : 'none' 
            }} 
          />

          {/* Biometric Scanline Overlay effect */}
          {isCameraReady && (
            <div style={{
              position: 'absolute',
              inset: 0,
              border: isProcessing ? '4px dashed #3b82f6' : '2px dashed #94a3b8',
              borderRadius: '50%',
              animation: isProcessing ? 'pulse 1.2s infinite' : 'none',
              background: isProcessing ? 'linear-gradient(rgba(59, 130, 246, 0.05), rgba(59, 130, 246, 0.15))' : 'transparent',
              pointerEvents: 'none'
            }} />
          )}
        </div>
      ) : (
        /* NATIVE UPLOAD / SYSTEM CAMERA PREVIEW */
        <div style={{ 
          width: '280px', 
          height: '200px', 
          borderRadius: '16px', 
          border: '2px dashed #cbd5e1', 
          backgroundColor: '#f8fafc',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.75rem',
          cursor: 'pointer',
          transition: 'all 0.2s'
        }}
        onClick={triggerNativeCamera}
        >
          <Camera size={36} color="#64748b" />
          <div style={{ textAlign: 'center', padding: '0 1.5rem' }}>
            <p style={{ fontSize: '0.9rem', fontWeight: 'bold', margin: '0 0 0.25rem', color: '#334155' }}>Cámara de Dispositivo</p>
            <p style={{ fontSize: '0.75rem', color: '#64748b', margin: 0 }}>Toca para capturar selfie usando la cámara nativa del sistema.</p>
          </div>
        </div>
      )}

      {/* Control Buttons */}
      <div style={{ display: 'flex', gap: '0.75rem', width: '100%', justifyContent: 'center', flexWrap: 'wrap', marginTop: '0.5rem' }}>
        
        {/* Stream mode start camera */}
        {captureMode === 'stream' && !isCameraReady && !isProcessing && (
          <button 
            onClick={startVideo}
            style={{ 
              padding: '0.75rem 1.5rem', 
              backgroundColor: '#3b82f6', 
              color: 'white', 
              borderRadius: '10px', 
              fontWeight: 'bold', 
              fontSize: '0.9rem',
              border: 'none', 
              cursor: 'pointer', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.5rem',
              boxShadow: '0 4px 6px -1px rgba(59, 130, 246, 0.3)',
              transition: 'all 0.2s'
            }}
          >
            <Camera size={16} /> Activar Cámara
          </button>
        )}

        {/* Stream mode capture photo */}
        {captureMode === 'stream' && isCameraReady && !isProcessing && (
          <button 
            onClick={takePhoto}
            style={{ 
              padding: '0.75rem 1.75rem', 
              backgroundColor: '#16a34a', 
              color: 'white', 
              borderRadius: '10px', 
              fontWeight: 'bold', 
              fontSize: '0.9rem',
              border: 'none', 
              cursor: 'pointer', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.5rem',
              boxShadow: '0 4px 6px -1px rgba(22, 163, 74, 0.3)',
              transition: 'all 0.2s'
            }}
          >
            📸 Tomar Foto
          </button>
        )}

        {/* Native camera trigger button */}
        {!isProcessing && (
          <button 
            onClick={triggerNativeCamera}
            style={{ 
              padding: '0.75rem 1.5rem', 
              backgroundColor: '#f1f5f9', 
              color: '#334155', 
              borderRadius: '10px', 
              fontWeight: 'bold', 
              fontSize: '0.9rem',
              border: '1px solid #cbd5e1', 
              cursor: 'pointer', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.5rem',
              transition: 'all 0.2s'
            }}
          >
            <Upload size={16} /> {captureMode === 'native' ? 'Tomar Selfie' : 'Usar Cámara Celular'}
          </button>
        )}

        {/* Quick fallback toggle if stream mode gets stuck */}
        {captureMode === 'stream' && isCameraReady && !isProcessing && (
          <button
            onClick={() => { stopStream(); setCaptureMode('native'); }}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: 'transparent',
              color: '#64748b',
              borderRadius: '10px',
              fontWeight: '600',
              fontSize: '0.8rem',
              border: 'none',
              cursor: 'pointer',
              textDecoration: 'underline'
            }}
          >
            ¿No funciona la cámara?
          </button>
        )}
      </div>

      <style jsx global>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 0.95; }
        }
      `}</style>
    </div>
  );
}
