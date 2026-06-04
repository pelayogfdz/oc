import { getCurrentSession } from "@/app/actions/caja";
import { getActiveBranch, getActiveUser } from "@/app/actions/auth";
import { getBranchSettings } from "@/app/actions/settings";
import CajaActualClient from "./CajaActualClient";

export default async function CajaActualPage() {
  const branch = await getActiveBranch();
  const user = await getActiveUser();
  const currentSession = await getCurrentSession();

  // If no branch, shouldn't really hit here due to global protection, but just in case
  if (branch.id === 'GLOBAL') {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#ef4444' }}>Acceso Denegado</h1>
        <p>Selecciona una sucursal específica para aperturar o gestionar la caja.</p>
      </div>
    );
  }

  const settings = await getBranchSettings();
  let metodosConfig = {};
  if (settings.configJson) {
    try {
      const parsed = JSON.parse(settings.configJson);
      metodosConfig = parsed.metodos || {};
    } catch(e) {}
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', fontFamily: 'var(--font-geist-sans)' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold' }}>Caja Actual</h1>
        <p style={{ color: 'var(--pulpos-text-muted)' }}>
          Gestiona el efectivo en caja para {branch.name}. Responsable en turno: {user?.name}.
        </p>
      </div>

      <CajaActualClient initialSession={currentSession} branchName={branch.name} userName={user?.name || ''} metodosConfig={metodosConfig} />
    </div>
  );
}
