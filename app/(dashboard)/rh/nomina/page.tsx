import { getActiveBranch } from "@/app/actions/auth";
import NominaClient from "./NominaClient";

export default async function NominaPage() {
  await getActiveBranch(); // Just to ensure session and branch

  return (
    <div style={{ backgroundColor: 'white', borderRadius: '8px', padding: '2rem', border: '1px solid var(--pulpos-border)' }}>
      <div style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--pulpos-border)', paddingBottom: '1rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Cálculo de Nómina</h2>
        <p style={{ color: 'var(--pulpos-text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
          Genera y revisa la pre-nómina basada en asistencias e incidencias automáticamente.
        </p>
      </div>

      <NominaClient />
    </div>
  );
}
