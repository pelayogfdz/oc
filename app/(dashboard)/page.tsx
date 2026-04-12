export default function DashboardPage() {
  return (
    <div>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '2rem' }}>Hola, Pelayo Fernandez</h1>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem', marginBottom: '2rem' }}>
        {[
          { title: 'Ventas de hoy', value: '$0.00' },
          { title: 'Órdenes de hoy', value: '0' },
          { title: 'Tickets promedio', value: '$0.00' },
          { title: 'Caja actual', value: 'Abierta' },
        ].map(stat => (
          <div key={stat.title} className="card">
            <h3 style={{ color: 'var(--pulpos-text-muted)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>{stat.title}</h3>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{stat.value}</div>
          </div>
        ))}
      </div>
      <div className="card" style={{ minHeight: '300px', display: 'flex', flexDirection: 'column' }}>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Gráfica de Ventas</h2>
        <div style={{ color: 'var(--pulpos-text-muted)', display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          No hay datos suficientes para mostrar
        </div>
      </div>
    </div>
  );
}
