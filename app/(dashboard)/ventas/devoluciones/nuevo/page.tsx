import DevolucionesNuevoClient from './DevolucionesNuevoClient';

export default function NuevaDevolucionPage() {
  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '2rem 1rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold', color: '#0f172a' }}>Generar Nota de Crédito (NCR) / Devolución</h1>
        <p style={{ color: '#64748b', fontSize: '0.95rem', marginTop: '0.25rem' }}>
          Configura y timbra notas de crédito de egreso (Opción A / Opción B) vinculadas a facturas de venta originales.
        </p>
      </div>
      
      <DevolucionesNuevoClient />
    </div>
  );
}
