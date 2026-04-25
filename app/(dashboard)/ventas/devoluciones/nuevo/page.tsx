import { crudAction } from "@/app/actions/crud";
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Search } from 'lucide-react';

export default function NuevaDevolucion() {
  const saveAction = async (formData: FormData) => {
    'use server';
    await crudAction('saleRefund', formData);
    redirect('/ventas/devoluciones');
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '2rem', gap: '1rem' }}>
        <Link href="/ventas/devoluciones" style={{ textDecoration: 'none', color: 'var(--pulpos-text-muted)', fontSize: '1.25rem' }}>← Regresar</Link>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold' }}>Procesar Devolución de Ticket</h1>
      </div>

      <form action={saveAction} className="card" style={{ padding: '4rem 2rem', display: 'flex', flexDirection: 'column', gap: '2rem', alignItems: 'center' }}>
        <div style={{ textAlign: 'center', maxWidth: '500px' }}>
          <div style={{ width: '80px', height: '80px', backgroundColor: '#ffe4e6', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', color: '#e11d48' }}>
             <Search size={40} />
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Ingresa el Folio de la Venta</h2>
          <p style={{ color: 'var(--pulpos-text-muted)', marginBottom: '2rem' }}>Escribe el ID (UUID) o escanea el código de barras del ticket original para proceder con el reembolso o cambio de prendas.</p>
          
          <input type="text" name="id" required placeholder="Ej. 123e4567-e89b-12d3..." style={{ width: '100%', padding: '1rem', borderRadius: '8px', border: '2px solid #f43f5e', fontSize: '1.1rem', textAlign: 'center', marginBottom: '1.5rem' }} />
          
          <button className="btn-primary" type="submit" style={{ width: '100%', padding: '1rem', fontSize: '1.2rem', backgroundColor: '#f43f5e', borderColor: '#f43f5e', borderRadius: '8px' }}>Buscar y Reembolsar Venta Completa</button>
        </div>
      </form>
    </div>
  );
}
