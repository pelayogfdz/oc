export default function LoginPage() {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyItems: 'center', justifyContent: 'center' }}>
      <div className="card" style={{ width: '400px' }}>
        <h1 style={{ marginBottom: '1.5rem', textAlign: 'center', color: 'var(--pulpos-primary)' }}>CAANMA</h1>
        <form style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Email / Correo electrónico</label>
            <input type="email" defaultValue="pelayof@tdq.com.mx" style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--pulpos-border)' }} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Contraseña</label>
            <input type="password" defaultValue="Sequent00" style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--pulpos-border)' }} />
          </div>
          <button type="button" className="btn-primary" style={{ marginTop: '1rem', padding: '0.75rem' }}>
            Ingresar
          </button>
        </form>
      </div>
    </div>
  );
}
