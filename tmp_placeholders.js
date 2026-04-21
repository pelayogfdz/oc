const fs = require('fs');
const path = require('path');

const pathsToCreate = [
  'app/(dashboard)/ventas/promociones',
  'app/(dashboard)/ventas/devoluciones',
  'app/(dashboard)/facturas/complementos',
  'app/(dashboard)/clientes/b2b',
  'app/(dashboard)/productos/precios-masivos',
  'app/(dashboard)/productos/costos-proveedor',
  'app/(dashboard)/productos/ajustes',
  'app/(dashboard)/productos/auditorias',
  'app/(dashboard)/productos/gastos',
  'app/(dashboard)/catalogo/ordenes',
  'app/(dashboard)/finanzas/conciliacion',
  'app/(dashboard)/integraciones'
];

const template = `import * as Icons from 'lucide-react';

export default function PlaceholderPage() {
  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', textAlign: 'center', padding: '4rem 1rem' }}>
      <Icons.Wrench size={64} color="var(--pulpos-primary)" style={{ margin: '0 auto 1.5rem', opacity: 0.5 }} />
      <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '1rem', color: '#0f172a' }}>Módulo en Construcción</h1>
      <p style={{ fontSize: '1.1rem', color: '#64748b', maxWidth: '600px', margin: '0 auto' }}>
        Estamos trabajando para traerte esta nueva funcionalidad muy pronto. Por favor regresa más tarde para descubrir las novedades.
      </p>
    </div>
  );
}
`;

pathsToCreate.forEach(dir => {
  const fullDir = path.join(__dirname, dir);
  if (!fs.existsSync(fullDir)) {
    fs.mkdirSync(fullDir, { recursive: true });
  }
  const filePath = path.join(fullDir, 'page.tsx');
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, template, 'utf8');
    console.log(`Created: ${filePath}`);
  } else {
    console.log(`Skipped (already exists): ${filePath}`);
  }
});
