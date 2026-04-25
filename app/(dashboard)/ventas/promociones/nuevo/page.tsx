import { crudAction } from "@/app/actions/crud";
import Link from 'next/link';
import { redirect } from 'next/navigation';

export default function NuevoPromocion() {
  const saveAction = async (formData: FormData) => {
    'use server';
    await crudAction('promotion', formData);
    redirect('/ventas/promociones');
  };

  return (
    <div style={{ maxWidth: '700px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '2rem', gap: '1rem' }}>
        <Link href="/ventas/promociones" style={{ textDecoration: 'none', color: 'var(--pulpos-text-muted)', fontSize: '1.25rem' }}>← Catálogo Promo</Link>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold' }}>Crear Regla de Promoción</h1>
      </div>

      <form action={saveAction} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div className="card" style={{ padding: '2rem' }}>
           <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Nombre Comercial de la Oferta *</label>
              <input type="text" name="name" required placeholder="Ej. Buen Fin - Zapatos" style={{ width: '100%', padding: '1rem', borderRadius: '4px', border: '1px solid var(--pulpos-border)', fontSize: '1.1rem' }} />
           </div>
           
           <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
             <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Tipo de Descuento</label>
                <select name="type" style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--pulpos-border)', backgroundColor: 'white' }}>
                   <option value="PERCENTAGE">Porcentaje (%)</option>
                   <option value="FIXED_AMOUNT">Monto Fijo ($)</option>
                   <option value="BOGO">2x1 (Lleva más, paga menos)</option>
                </select>
             </div>
             <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Valor / Descuento</label>
                <input type="number" step="0.01" name="value" required placeholder="Ej. 15.00" style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--pulpos-border)' }} />
             </div>
           </div>

           <div style={{ padding: '1.5rem', backgroundColor: '#fdf2f8', border: '1px solid #fbcfe8', borderRadius: '8px' }}>
             <p style={{ margin: '0 0 1rem 0', fontWeight: 'bold', color: '#be185d' }}>Vigencia (Opcional)</p>
             <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div><label style={{ fontSize: '0.85rem' }}>Inicia</label><input type="date" style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #fbcfe8' }} /></div>
                <div><label style={{ fontSize: '0.85rem' }}>Termina</label><input type="date" style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #fbcfe8' }} /></div>
             </div>
           </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
           <button className="btn-primary" type="submit" style={{ padding: '1rem 3rem', fontSize: '1.25rem', backgroundColor: '#ec4899', borderColor: '#ec4899', borderRadius: '8px' }}>Activar Promoción</button>
        </div>
      </form>
    </div>
  );
}
