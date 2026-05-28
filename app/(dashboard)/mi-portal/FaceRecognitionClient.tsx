'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import { Camera, CheckCircle2, AlertTriangle, Loader2, Upload, ShieldCheck, RefreshCw } from 'lucide-react';

export default function FaceRecognitionClient({ 
  user, 
  onFaceMatched,
  onPhotoCaptured
}: { 
  user: any; 
  onFaceMatched: (matched: boolean) => void;
  onPhotoCaptured?: (photo: string) => void;
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

  // Dynamic model loading cache
  const [modelsLoaded, setModelsLoaded] = useState(false);

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
    
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } })
      .then((stream) => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          // Explicitly play to bypass iOS Safari limitations
          videoRef.current.play()
            .then(() => setIsCameraReady(true))
            .catch(e => {
              console.error("Error playing video:", e);
              // Auto fallback to native camera if video playback fails
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

  // Perform face matching logic using face-api
  const processAndMatchFace = async (photoUrl: string) => {
    setIsProcessing(true);
    setStatusMsg('Inicializando detector facial...');
    setErrorMsg('');

    try {
      // 1. Dynamic import of face-api to prevent SSR issues
      const faceapi = await import('@vladmandic/face-api');
      
      // 2. Load models from local public /models directory if not loaded
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
      
      // 3. Create helper Image to load captured photo url onto canvas
      const img = new Image();
      img.onload = async () => {
        try {
          const tmpCanvas = document.createElement('canvas');
          const mx = Math.max(img.width, img.height);
          let ratio = mx > 600 ? 600 / mx : 1; // Downscale to save memory
          tmpCanvas.width = img.width * ratio;
          tmpCanvas.height = img.height * ratio;
          
          const ctx = tmpCanvas.getContext('2d');
          if (!ctx) throw new Error("Could not create canvas 2D context");
          ctx.drawImage(img, 0, 0, tmpCanvas.width, tmpCanvas.height);

          setStatusMsg('Analizando patrones del rostro...');
          // 4. Detect single face + landmarks + descriptor
          const detection = await faceapi.detectSingleFace(
            tmpCanvas, 
            new faceapi.TinyFaceDetectorOptions({ inputSize: 256, scoreThreshold: 0.15 })
          ).withFaceLandmarks().withFaceDescriptor();

          if (!detection) {
            setMatchStatus('error');
            setErrorMsg('No se detectó ningún rostro de forma clara. Intenta tomar la foto de frente con mejor iluminación.');
            setIsProcessing(false);
            return;
          }

          setStatusMsg('Verificando identidad biométrica...');
          
          // 5. Verify against user faceDescriptor
          if (!user.faceDescriptor) {
            setMatchStatus('error');
            setErrorMsg('No tienes un registro facial de referencia. Por favor enrola tu rostro primero.');
            setIsProcessing(false);
            return;
          }

          const enrolledDescriptor = new Float32Array(JSON.parse(user.faceDescriptor));
          
          // 6. Compute Euclidean Distance
          const distance = faceapi.euclideanDistance(detection.descriptor, enrolledDescriptor);
          console.log("Calculated face distance:", distance);

          // Calculate a nice, premium similarity percentage
          // A distance of 0 is 100% match. Typically anything < 0.6 is a secure match.
          // We will map 0.0 -> 100%, and 0.6 -> 60%, scaling linearly for intuitive feedback.
          const similarityScore = Math.max(0, Math.min(100, Math.round((1 - (distance / 1.5)) * 100)));
          setSimilarity(similarityScore);

          const MATCH_THRESHOLD = 0.58; // Highly secure but accounts for varying lighting conditions

          if (distance <= MATCH_THRESHOLD) {
            setMatchStatus('success');
            setCapturedPhoto(photoUrl);
            setHasPhoto(true);
            onFaceMatched(true);
            if (onPhotoCaptured) {
              onPhotoCaptured(photoUrl);
            }
            stopStream();
          } else {
            setMatchStatus('mismatch');
            setErrorMsg(`Identidad no verificada (Coincidencia: ${similarityScore}%). Asegúrate de estar en un área bien iluminada y mirar directo a la cámara.`);
          }
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
    
    // Set canvas dimensions to match video frame
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Mirror the canvas draw if using webcam
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      const photoUrl = canvas.toDataURL('image/jpeg', 0.85);
      
      // Immediately run matching
      processAndMatchFace(photoUrl);
    }
  }, [onFaceMatched, onPhotoCaptured, stopStream, user.faceDescriptor]);

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
    onFaceMatched(false);
    
    if (captureMode === 'stream') {
      startVideo();
    }
  };

  // SUCCESS STATE VIEW
  if (hasPhoto && capturedPhoto) {
    return (
      <div style={{ 
        textAlign: 'center', 
        padding: '1.75rem', 
        background: 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)', 
        borderRadius: '16px', 
        color: '#14532d',
        boxShadow: '0 10px 15px -3px rgba(22, 163, 74, 0.2)',
        border: '1px solid #86efac',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '0.75rem'
      }}>
        <div style={{ position: 'relative', width: '110px', height: '110px', borderRadius: '50%', overflow: 'hidden', border: '3px solid #16a34a', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
          <img src={capturedPhoto} alt="Selfie" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          <div style={{ position: 'absolute', bottom: 0, insetInline: 0, backgroundColor: 'rgba(22,163,74,0.9)', color: 'white', fontSize: '0.65rem', fontWeight: 'bold', padding: '2px 0' }}>
            VERIFICADO
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.25rem' }}>
          <ShieldCheck size={24} color="#16a34a" />
          <p style={{ fontWeight: '800', fontSize: '1.1rem', margin: 0 }}>Identidad Verificada</p>
        </div>
        {similarity !== null && (
          <div style={{ 
            fontSize: '0.85rem', 
            fontWeight: '600', 
            backgroundColor: 'rgba(255,255,255,0.6)', 
            padding: '0.25rem 0.75rem', 
            borderRadius: '20px',
            color: '#15803d'
          }}>
            Coincidencia Facial: {similarity}%
          </div>
        )}
        <p style={{ fontSize: '0.85rem', margin: '0.25rem 0 0.5rem', color: '#166534' }}>Biometría validada exitosamente. Ya puedes registrar tu asistencia.</p>
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
          <RefreshCw size={12} /> Tomar otra foto
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
      padding: '1.5rem', 
      border: '1px solid #cbd5e1', 
      borderRadius: '16px', 
      backgroundColor: '#ffffff',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
    }}>
      
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
          width: '260px', 
          height: '260px', 
          borderRadius: '12px', 
          overflow: 'hidden', 
          border: '3px solid #e2e8f0', 
          backgroundColor: '#f1f5f9',
          boxShadow: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)'
        }}>
          {!isCameraReady && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}>
              <Camera size={36} color="#94a3b8" />
              <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: 0, fontWeight: 'bold' }}>Cámara Desactivada</p>
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
          {isCameraReady && isProcessing && (
            <div style={{
              position: 'absolute',
              inset: 0,
              border: '2px dashed #3b82f6',
              borderRadius: '8px',
              animation: 'pulse 1.5s infinite',
              background: 'linear-gradient(rgba(59, 130, 246, 0.05), rgba(59, 130, 246, 0.15))',
              pointerEvents: 'none'
            }} />
          )}
        </div>
      ) : (
        /* NATIVE UPLOAD / SYSTEM CAMERA PREVIEW */
        <div style={{ 
          width: '260px', 
          height: '200px', 
          borderRadius: '12px', 
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
          <Camera size={32} color="#64748b" />
          <div style={{ textAlign: 'center', padding: '0 1rem' }}>
            <p style={{ fontSize: '0.85rem', fontWeight: 'bold', margin: '0 0 0.25rem', color: '#334155' }}>Cámara del Sistema</p>
            <p style={{ fontSize: '0.75rem', color: '#64748b', margin: 0 }}>Haz clic para capturar selfie usando la cámara nativa del celular.</p>
          </div>
        </div>
      )}

      {/* Control Buttons */}
      <div style={{ display: 'flex', gap: '0.5rem', width: '100%', justifyContent: 'center', flexWrap: 'wrap' }}>
        
        {/* Stream mode start camera */}
        {captureMode === 'stream' && !isCameraReady && !isProcessing && (
          <button 
            onClick={startVideo}
            style={{ 
              padding: '0.65rem 1.25rem', 
              backgroundColor: '#3b82f6', 
              color: 'white', 
              borderRadius: '8px', 
              fontWeight: 'bold', 
              fontSize: '0.85rem',
              border: 'none', 
              cursor: 'pointer', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.5rem',
              boxShadow: '0 4px 6px -1px rgba(59, 130, 246, 0.3)',
              transition: 'all 0.2s'
            }}
          >
            <Camera size={16} /> Activar Cámara Web
          </button>
        )}

        {/* Stream mode capture photo */}
        {captureMode === 'stream' && isCameraReady && !isProcessing && (
          <button 
            onClick={takePhoto}
            style={{ 
              padding: '0.65rem 1.5rem', 
              backgroundColor: '#16a34a', 
              color: 'white', 
              borderRadius: '8px', 
              fontWeight: 'bold', 
              fontSize: '0.85rem',
              border: 'none', 
              cursor: 'pointer', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.5rem',
              boxShadow: '0 4px 6px -1px rgba(22, 163, 74, 0.3)',
              transition: 'all 0.2s'
            }}
          >
            📸 Tomar Selfie
          </button>
        )}

        {/* Native camera trigger button */}
        {!isProcessing && (
          <button 
            onClick={triggerNativeCamera}
            style={{ 
              padding: '0.65rem 1.25rem', 
              backgroundColor: '#f1f5f9', 
              color: '#334155', 
              borderRadius: '8px', 
              fontWeight: 'bold', 
              fontSize: '0.85rem',
              border: '1px solid #cbd5e1', 
              cursor: 'pointer', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.5rem',
              transition: 'all 0.2s'
            }}
          >
            <Upload size={16} /> {captureMode === 'native' ? 'Capturar Selfie' : 'Usar Cámara del Celular'}
          </button>
        )}

        {/* Quick fallback toggle if stream mode gets stuck */}
        {captureMode === 'stream' && isCameraReady && !isProcessing && (
          <button
            onClick={() => { stopStream(); setCaptureMode('native'); }}
            style={{
              padding: '0.65rem 1.25rem',
              backgroundColor: 'transparent',
              color: '#64748b',
              borderRadius: '8px',
              fontWeight: '600',
              fontSize: '0.8rem',
              border: 'none',
              cursor: 'pointer',
              textDecoration: 'underline'
            }}
          >
            ¿Falla la cámara?
          </button>
        )}
      </div>

      <style jsx global>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 0.9; }
        }
      `}</style>
    </div>
  );
}
