import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { Package, Truck, Phone, MapPin, Info } from "lucide-react";
import AutoPrint from "./AutoPrint";

export default async function PrintLabelPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = await prisma.deliveryOrder.findUnique({
    where: { id },
    include: {
      sale: {
        include: {
          customer: true,
          items: {
            include: { product: true }
          }
        }
      },
      driver: true
    }
  });

  if (!order) {
    notFound();
  }

  // To print label, we will provide a clean view and use window.print() on mount via a small client script inside, or just tell the user to print it.
  
  return (
    <div style={{ backgroundColor: 'white', minHeight: '100vh', padding: '2rem', color: 'black', fontFamily: 'monospace' }}>
      {/* Script para imprimir automático */}
      <AutoPrint />
      
      <div style={{ maxWidth: '400px', margin: '0 auto', border: '2px solid black', padding: '1rem' }}>
        
        <div style={{ textAlign: 'center', borderBottom: '2px dashed black', paddingBottom: '1rem', marginBottom: '1rem' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: 0, letterSpacing: '2px' }}>ETIQUETA DE ENVÍO</h1>
          <p style={{ margin: '0.5rem 0 0 0', fontSize: '1.25rem' }}>ORDEN: #{order.saleId.slice(0, 8).toUpperCase()}</p>
          <img 
            src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent((process.env.NEXT_PUBLIC_APP_URL || 'https://pulpos.com') + '/delivery/' + order.id)}`} 
            alt="QR Code" 
            style={{ marginTop: '1rem' }} 
          />
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <MapPin size={16} /> <strong>DESTINATARIO:</strong>
          </div>
          <div style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>
            {order.sale?.customer?.name || "VENTA DE MOSTRADOR"}
          </div>
          {order.street ? (
            <div style={{ marginTop: '0.25rem' }}>
              <div>{order.street} {order.exteriorNumber} {order.interiorNumber ? `Int: ${order.interiorNumber}` : ''}</div>
              <div>Col. {order.neighborhood}</div>
              <div>{order.city}, {order.state} CP {order.zipCode}</div>
            </div>
          ) : (
            <div style={{ marginTop: '0.25rem' }}>Recoger en tienda o dirección no proporcionada.</div>
          )}
        </div>

        <div style={{ marginBottom: '1rem', borderTop: '1px solid #ccc', paddingTop: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <Phone size={16} /> <strong>CONTACTO:</strong>
          </div>
          <div>{order.sale?.customer?.phone || "Sin teléfono registrado"}</div>
        </div>

        <div style={{ marginBottom: '1rem', borderTop: '1px solid #ccc', paddingTop: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <Package size={16} /> <strong>ARTÍCULOS ({order.sale?.items?.length || 0}):</strong>
          </div>
          <ul style={{ paddingLeft: '1rem', margin: 0, fontSize: '0.9rem' }}>
            {order.sale?.items?.map((item: any) => (
              <li key={item.id}>
                {item.quantity}x {item.product.name}
              </li>
            ))}
          </ul>
        </div>

        {order.notes && (
          <div style={{ marginBottom: '1rem', borderTop: '1px solid #ccc', paddingTop: '1rem', backgroundColor: '#f9f9f9', padding: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <Info size={16} /> <strong>NOTAS DE ENTREGA:</strong>
            </div>
            <div>{order.notes}</div>
          </div>
        )}

        <div style={{ textAlign: 'center', borderTop: '2px dashed black', paddingTop: '1rem', marginTop: '1rem', fontSize: '0.8rem' }}>
          <div>Chofer asignado: {order.driver?.name || "Por asignar"}</div>
          <div>Fecha: {new Date().toLocaleDateString()}</div>
        </div>

      </div>
    </div>
  );
}
