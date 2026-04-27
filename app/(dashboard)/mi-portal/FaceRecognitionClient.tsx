'use client';

import { useRef, useState, useCallback } from 'react';
import { Camera, CheckCircle2 } from 'lucide-react';

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
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [hasPhoto, setHasPhoto] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const startVideo = () => {
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } })
      .then((stream) => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      })
      .catch((err) => {
        console.error(err);
        setErrorMsg('Por favor da permiso a la cámara frontal para tomar la foto.');
      });
  };

  const handleVideoPlay = () => {
    setIsCameraReady(true);
  };

  const takePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Draw image onto canvas
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Flip context horizontally to match the mirrored video
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      const photoUrl = canvas.toDataURL('image/jpeg', 0.8);
      setHasPhoto(true);
      onFaceMatched(true); // Bypass biometric validation and accept the selfie
      if (onPhotoCaptured) {
        onPhotoCaptured(photoUrl);
      }
      
      // Stop video stream
      const stream = video.srcObject as MediaStream;
      stream?.getTracks().forEach(track => track.stop());
    }
  }, [onFaceMatched, onPhotoCaptured]);

  if (hasPhoto) {
    return (
      <div style={{ textAlign: 'center', padding: '1rem', backgroundColor: '#dcfce7', borderRadius: '8px', color: '#16a34a' }}>
        <CheckCircle2 size={48} style={{ margin: '0 auto 0.5rem' }} />
        <p style={{ fontWeight: 'bold' }}>Foto Capturada</p>
        <p style={{ fontSize: '0.85rem' }}>Ya puedes registrar tu asistencia.</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', padding: '1rem', border: '1px solid #e2e8f0', borderRadius: '8px', backgroundColor: '#f8fafc' }}>
      
      {errorMsg && (
        <div style={{ color: '#ef4444', fontSize: '0.85rem' }}>{errorMsg}</div>
      )}

      <div style={{ position: 'relative', width: '250px', height: '250px', borderRadius: '8px', overflow: 'hidden', border: '2px solid #cbd5e1', backgroundColor: '#e2e8f0' }}>
        {!isCameraReady && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Camera size={32} color="#94a3b8" />
          </div>
        )}
        <video 
          ref={videoRef}
          onPlay={handleVideoPlay}
          autoPlay 
          muted 
          playsInline
          style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)', display: hasPhoto ? 'none' : 'block' }} 
        />
        <canvas ref={canvasRef} style={{ display: 'none' }} />
      </div>

      {!isCameraReady && !hasPhoto && (
        <button 
          onClick={startVideo}
          style={{ padding: '0.75rem 1.5rem', backgroundColor: '#3b82f6', color: 'white', borderRadius: '4px', fontWeight: 'bold', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <Camera size={18} /> Activar Cámara
        </button>
      )}

      {isCameraReady && !hasPhoto && (
        <button 
          onClick={takePhoto}
          style={{ padding: '0.75rem 1.5rem', backgroundColor: '#16a34a', color: 'white', borderRadius: '4px', fontWeight: 'bold', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <Camera size={18} /> Tomar Selfie
        </button>
      )}
    </div>
  );
}
