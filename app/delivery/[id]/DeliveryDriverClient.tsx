'use client';

import { useState, useRef } from 'react';
import { Package, MapPin, CheckCircle2, Camera, User, PenTool } from 'lucide-react';
import SignatureCanvas from 'react-signature-canvas';

export default function DeliveryDriverClient({ initialOrder }: { initialOrder: any }) {
  const [order, setOrder] = useState(initialOrder);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  
  const signatureRef = useRef<any>(null);

  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoBase64(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleClearSignature = () => {
    if (signatureRef.current) {
      signatureRef.current.clear();
    }
  };

  const handleCompleteDelivery = async () => {
    if (!signatureRef.current || signatureRef.current.isEmpty()) {
      alert("Por favor, recolecte la firma del cliente.");
      return;
    }

    if (!photoBase64) {
      alert("Por favor, tome una foto de evidencia.");
      return;
    }

    setIsSubmitting(true);
    try {
      const signatureDataUrl = signatureRef.current.getTrimmedCanvas().toDataURL('image/png');

      const res = await fetch(`/api/delivery/${order.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'DELIVERED',
          clientSignature: signatureDataUrl,
          evidencePhoto: photoBase64
        })
      });

      if (!res.ok) {
        throw new Error("Error al completar la entrega");
      }

      const updatedOrder = await res.json();
      setOrder(updatedOrder);
      alert("¡Entrega registrada con éxito!");
    } catch (e) {
      console.error(e);
      alert("Hubo un error al registrar la entrega. Intente de nuevo.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (order.status === 'DELIVERED') {
    return (
      <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center', paddingTop: '4rem' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '80px', height: '80px', borderRadius: '50%', backgroundColor: '#dcfce7', marginBottom: '1rem' }}>
          <CheckCircle2 size={40} color="#16a34a" />
        </div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#16a34a' }}>¡Pedido Entregado!</h1>
        <p style={{ color: '#475569', marginTop: '0.5rem', marginBottom: '2rem' }}>Esta entrega ya fue registrada exitosamente.</p>
        <a 
          href="/logistica/chofer" 
          style={{ 
            display: 'inline-flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            padding: '0.75rem 1.5rem', 
            borderRadius: '8px', 
            textDecoration: 'none', 
            fontWeight: 'bold', 
            backgroundColor: '#3b82f6', 
            color: 'white',
            boxShadow: '0 2px 4px rgba(59, 130, 246, 0.2)'
          }}
        >
          Volver a mi Ruta
        </a>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
          Detalles de Entrega
        </h2>
        
        <div style={{ marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#64748b', fontSize: '0.875rem', marginBottom: '0.25rem' }}>
            <User size={16} /> Cliente
          </div>
          <div style={{ fontWeight: '500', fontSize: '1.125rem' }}>{order.sale?.customer?.name || "Mostrador"}</div>
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#64748b', fontSize: '0.875rem', marginBottom: '0.25rem' }}>
            <MapPin size={16} /> Dirección
          </div>
          <div>
            {order.street ? (
              <>
                <div style={{ fontWeight: '500' }}>{order.street} {order.exteriorNumber}</div>
                <div>Col. {order.neighborhood}, {order.city}</div>
              </>
            ) : (
              <span style={{ color: '#ef4444' }}>Sin dirección registrada</span>
            )}
          </div>
        </div>

        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#64748b', fontSize: '0.875rem', marginBottom: '0.25rem' }}>
            <Package size={16} /> Artículos ({order.sale?.items?.length || 0})
          </div>
          <ul style={{ paddingLeft: '1.5rem', margin: 0 }}>
            {order.sale?.items?.map((item: any) => (
              <li key={item.id} style={{ marginBottom: '0.25rem' }}>
                {item.quantity}x {item.product?.name}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 'bold', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <PenTool size={20} color="#3b82f6" /> 1. Firma del Cliente
        </h2>
        <div style={{ border: '2px dashed #cbd5e1', borderRadius: '8px', backgroundColor: '#f8fafc', overflow: 'hidden' }}>
          <SignatureCanvas 
            ref={signatureRef}
            penColor="black"
            canvasProps={{ width: 500, height: 200, className: 'sigCanvas', style: { width: '100%', height: '200px' } }} 
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
          <button onClick={handleClearSignature} style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '0.875rem', cursor: 'pointer', fontWeight: '500' }}>
            Limpiar firma
          </button>
        </div>
      </div>

      <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 'bold', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Camera size={20} color="#3b82f6" /> 2. Evidencia Fotográfica
        </h2>
        {photoBase64 ? (
          <div style={{ position: 'relative', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
            <img src={photoBase64} alt="Evidencia" style={{ width: '100%', height: 'auto', display: 'block' }} />
            <button 
              onClick={() => setPhotoBase64(null)}
              style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', background: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', padding: '0.25rem 0.5rem', fontSize: '0.75rem', fontWeight: 'bold' }}
            >
              Tomar otra
            </button>
          </div>
        ) : (
          <label style={{ display: 'block', width: '100%', padding: '2rem', textAlign: 'center', border: '2px dashed #cbd5e1', borderRadius: '8px', cursor: 'pointer', backgroundColor: '#f8fafc' }}>
            <Camera size={32} color="#94a3b8" style={{ margin: '0 auto 0.5rem' }} />
            <div style={{ color: '#475569', fontWeight: '500' }}>Tomar foto</div>
            <input 
              type="file" 
              accept="image/*" 
              capture="environment" 
              onChange={handlePhotoCapture} 
              style={{ display: 'none' }} 
            />
          </label>
        )}
      </div>

      <button 
        onClick={handleCompleteDelivery}
        disabled={isSubmitting}
        style={{ 
          width: '100%', 
          padding: '1rem', 
          backgroundColor: '#3b82f6', 
          color: 'white', 
          border: 'none', 
          borderRadius: '8px', 
          fontSize: '1.125rem', 
          fontWeight: 'bold',
          marginTop: '1rem',
          opacity: isSubmitting ? 0.7 : 1,
          cursor: isSubmitting ? 'not-allowed' : 'pointer',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '0.5rem'
        }}
      >
        <CheckCircle2 size={24} />
        {isSubmitting ? 'Guardando...' : 'Marcar como Entregado'}
      </button>

      <div style={{ textAlign: 'center', marginTop: '1rem', color: '#94a3b8', fontSize: '0.75rem' }}>
        Pulpos CRM © {new Date().getFullYear()}
      </div>
    </div>
  );
}
