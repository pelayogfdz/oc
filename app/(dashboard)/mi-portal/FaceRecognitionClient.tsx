'use client';

import { useEffect, useRef, useState } from 'react';
import * as faceapi from '@vladmandic/face-api';
import { Camera, CheckCircle2, UserPlus, AlertCircle, Loader2 } from 'lucide-react';
import { registerFaceDescriptor } from '@/app/actions/hr';

export default function FaceRecognitionClient({ 
  user, 
  onFaceMatched 
}: { 
  user: any; 
  onFaceMatched: (matched: boolean) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [currentDescriptor, setCurrentDescriptor] = useState<Float32Array | null>(null);
  const [isMatched, setIsMatched] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [savedDescriptor, setSavedDescriptor] = useState<Float32Array | null>(null);

  // Parse saved descriptor
  useEffect(() => {
    if (user.faceDescriptor) {
      try {
        const arr = JSON.parse(user.faceDescriptor);
        setSavedDescriptor(new Float32Array(arr));
      } catch (e) {
        console.error("Error parsing faceDescriptor", e);
      }
    }
  }, [user.faceDescriptor]);

  // Load models
  useEffect(() => {
    const loadModels = async () => {
      try {
        const MODEL_URL = '/models';
        await Promise.all([
          faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
        ]);
        setModelsLoaded(true);
      } catch (e) {
        console.error(e);
        setErrorMsg('Error cargando modelos de IA. Recarga la página.');
      }
    };
    loadModels();
  }, []);

  const startVideo = () => {
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } })
      .then((stream) => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      })
      .catch((err) => {
        console.error(err);
        setErrorMsg('Por favor da permiso a la cámara frontal.');
      });
  };

  const handleVideoPlay = () => {
    setIsCameraReady(true);
    const id = setInterval(async () => {
      if (!videoRef.current) return;
      if (isMatched) return; // Stop processing if already matched

      const detection = await faceapi.detectSingleFace(videoRef.current)
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (detection) {
        setCurrentDescriptor(detection.descriptor);
        
        // If user already has a saved face, compare it!
        if (savedDescriptor) {
          const distance = faceapi.euclideanDistance(detection.descriptor, savedDescriptor);
          if (distance < 0.5) { // Threshold
            setIsMatched(true);
            onFaceMatched(true);
            clearInterval(id);
            // Optionally stop video stream to save battery
            const stream = videoRef.current.srcObject as MediaStream;
            stream?.getTracks().forEach(track => track.stop());
          }
        }
      } else {
        setCurrentDescriptor(null);
      }
    }, 1000);

    return () => clearInterval(id);
  };

  const handleRegisterFace = async () => {
    if (!currentDescriptor) return;
    setIsRegistering(true);
    try {
      const descriptorJson = JSON.stringify(Array.from(currentDescriptor));
      await registerFaceDescriptor({ userId: user.id, descriptor: descriptorJson });
      alert("Rostro registrado exitosamente. Ya puedes registrar asistencia.");
      window.location.reload();
    } catch (e: any) {
      alert("Error al registrar rostro: " + e.message);
    } finally {
      setIsRegistering(false);
    }
  };

  if (!modelsLoaded) {
    return (
      <div style={{ textAlign: 'center', padding: '1rem', color: '#64748b' }}>
        <Loader2 className="animate-spin" size={24} style={{ margin: '0 auto 0.5rem' }} />
        Cargando módulo de reconocimiento facial...
      </div>
    );
  }

  if (isMatched) {
    return (
      <div style={{ textAlign: 'center', padding: '1rem', backgroundColor: '#dcfce7', borderRadius: '8px', color: '#16a34a' }}>
        <CheckCircle2 size={48} style={{ margin: '0 auto 0.5rem' }} />
        <p style={{ fontWeight: 'bold' }}>Identidad Verificada</p>
        <p style={{ fontSize: '0.85rem' }}>Puedes presionar Entrada o Salida.</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', padding: '1rem', border: '1px solid #e2e8f0', borderRadius: '8px', backgroundColor: '#f8fafc' }}>
      
      {!savedDescriptor && (
        <div style={{ color: '#ea580c', textAlign: 'center', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <AlertCircle size={16} /> No tienes un rostro registrado.
        </div>
      )}

      {errorMsg && (
        <div style={{ color: '#ef4444', fontSize: '0.85rem' }}>{errorMsg}</div>
      )}

      <div style={{ position: 'relative', width: '250px', height: '250px', borderRadius: '50%', overflow: 'hidden', border: '4px solid ' + (currentDescriptor ? '#3b82f6' : '#cbd5e1') }}>
        {!isCameraReady && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#e2e8f0' }}>
            <Camera size={32} color="#94a3b8" />
          </div>
        )}
        <video 
          ref={videoRef}
          onPlay={handleVideoPlay}
          autoPlay 
          muted 
          playsInline
          style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }} 
        />
      </div>

      {!isCameraReady && (
        <button 
          onClick={startVideo}
          style={{ padding: '0.5rem 1rem', backgroundColor: '#3b82f6', color: 'white', borderRadius: '4px', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}
        >
          Activar Cámara
        </button>
      )}

      {isCameraReady && !savedDescriptor && (
        <button 
          onClick={handleRegisterFace}
          disabled={!currentDescriptor || isRegistering}
          style={{ 
            padding: '0.75rem 1.5rem', 
            backgroundColor: currentDescriptor ? '#16a34a' : '#cbd5e1', 
            color: 'white', 
            borderRadius: '4px', 
            fontWeight: 'bold', 
            border: 'none', 
            cursor: currentDescriptor ? 'pointer' : 'not-allowed',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          {isRegistering ? <Loader2 className="animate-spin" size={18} /> : <UserPlus size={18} />}
          {currentDescriptor ? 'Registrar mi rostro' : 'Enfoca tu rostro...'}
        </button>
      )}

      {isCameraReady && savedDescriptor && (
        <p style={{ color: '#64748b', fontSize: '0.85rem' }}>
          {currentDescriptor ? 'Analizando rostro...' : 'Enfoca tu rostro...'}
        </p>
      )}
    </div>
  );
}
