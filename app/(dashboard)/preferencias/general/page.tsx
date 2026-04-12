import { getBranchSettings, updateBranchSettings } from "@/app/actions/settings";
import { Settings, Save } from 'lucide-react';

export default async function GeneralPreferencesPage() {
  const settings = await getBranchSettings();

  return (
    <div style={{ backgroundColor: 'white', borderRadius: '8px', padding: '2rem', border: '1px solid var(--pulpos-border)' }}>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--pulpos-border)', paddingBottom: '1rem' }}>
        <Settings size={24} /> Configuraciones Generales
      </h2>
      <form action={updateBranchSettings} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Encabezado del Ticket (Ej. Nombre Real / Matriz)</label>
          <input type="text" name="ticketHeader" defaultValue={settings.ticketHeader || ''} style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--pulpos-border)' }} />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Pie del Ticket (Ej. Políticas de Devolución)</label>
          <input type="text" name="ticketFooter" defaultValue={settings.ticketFooter || ''} style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--pulpos-border)' }} />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Tasa de IVA Base (%)</label>
          <input type="number" step="0.1" name="taxIVA" defaultValue={settings.taxIVA} style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--pulpos-border)' }} />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Símbolo de Moneda</label>
          <input type="text" name="currencySymbol" defaultValue={settings.currencySymbol} style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--pulpos-border)' }} />
        </div>
        <div style={{ gridColumn: '1 / -1', marginTop: '1rem', display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn-primary" type="submit" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Save size={18} /> Guardar Cambios
          </button>
        </div>
      </form>
    </div>
  );
}
