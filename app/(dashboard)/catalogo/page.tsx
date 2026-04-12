'use client';
import { Store, LayoutTemplate, Save } from 'lucide-react';

export default function CatalogoLineaPage() {
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    alert('Configuraciones Guardadas. Tienda web actualizada satisfactoriamente.');
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold' }}>Catálogo en Línea B2B</h1>
        <p style={{ color: 'var(--pulpos-text-muted)' }}>Muestra tu inventario actualizado a tus clientes selectos para levantar pedidos web.</p>
      </div>

      <div className="card" style={{ padding: '2rem', marginBottom: '2rem', border: '2px dashed var(--pulpos-primary)', backgroundColor: '#f0fdfa' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
          <Store size={32} color="var(--pulpos-primary)" />
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#0f766e' }}>Tu tienda está Activa</h2>
            <p style={{ color: '#0f766e', fontSize: '0.875rem' }}>Los clientes pueden ver catálogo en: <strong>tienda.pulpos.com/tu-empresa</strong></p>
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: '2rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1.5rem', borderBottom: '1px solid var(--pulpos-border)', paddingBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <LayoutTemplate size={20} />
          Ajustes Visuales y Precios
        </h2>

        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.5rem' }}>Lista de Precios Pública</label>
            <p style={{ fontSize: '0.875rem', color: 'var(--pulpos-text-muted)', marginBottom: '0.5rem' }}>¿Qué precios verán los visitantes sin cuenta iniciada en tu catálogo?</p>
            <select style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--pulpos-border)' }}>
              <option value="price">Precio Público General</option>
              <option value="none">Ocultar Precios (Modo Cotizador)</option>
            </select>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid var(--pulpos-border)' }}>
            <input type="checkbox" defaultChecked id="showStock" style={{ width: '1.2rem', height: '1.2rem' }} />
            <div>
              <label htmlFor="showStock" style={{ fontWeight: 'bold', cursor: 'pointer', display: 'block' }}>Mostrar Existencias Exactas</label>
              <span style={{ fontSize: '0.85rem', color: 'var(--pulpos-text-muted)' }}>Si se desactiva, solo dirá "Disponible" o "Agotado".</span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid var(--pulpos-border)' }}>
            <input type="checkbox" id="requireLogin" style={{ width: '1.2rem', height: '1.2rem' }} />
            <div>
              <label htmlFor="requireLogin" style={{ fontWeight: 'bold', cursor: 'pointer', display: 'block' }}>Catálogo Privado B2B</label>
              <span style={{ fontSize: '0.85rem', color: 'var(--pulpos-text-muted)' }}>Solo clientes dados de alta podrán acceder a ver tus productos mediante NIP.</span>
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--pulpos-border)', paddingTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '1rem 2rem', fontSize: '1.1rem' }}>
              <Save size={20} />
              Actualizar Tienda Web
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
