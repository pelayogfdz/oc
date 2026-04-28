import { getBranchSettings, updateBranchSettings, getTenantSettings, updateTenantSettings } from "@/app/actions/settings";
import { Settings, Save, Globe } from 'lucide-react';

export default async function GeneralPreferencesPage() {
  const settings = await getBranchSettings();
  const tenantSettings = await getTenantSettings();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* GLOBAL SETTINGS (TENANT) */}
      <div style={{ backgroundColor: 'white', borderRadius: '8px', padding: '2rem', border: '1px solid var(--pulpos-border)' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <Globe size={24} /> Configuración Global de la Organización
        </h2>
        <p style={{ color: 'var(--pulpos-text-muted)', fontSize: '0.875rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--pulpos-border)', paddingBottom: '1rem' }}>
          Estos ajustes aplican a todas las sucursales y usuarios de tu organización.
        </p>

        <form action={updateTenantSettings} style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem', maxWidth: '600px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', borderBottom: '1px solid #f3f4f6', paddingBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 'bold', color: '#1f2937', marginBottom: '0.5rem' }}>
              Precisión Decimal
            </label>
            <p style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '-0.2rem', marginBottom: '0.5rem' }}>Define la cantidad de decimales a utilizar en toda la aplicación (0 a 4).</p>
            <select name="decimals" defaultValue={tenantSettings.decimals} style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--pulpos-border)', outline: 'none', backgroundColor: 'white' }}>
              <option value="0">0 Decimales ($1,000)</option>
              <option value="1">1 Decimal ($1,000.0)</option>
              <option value="2">2 Decimales ($1,000.00)</option>
              <option value="3">3 Decimales ($1,000.000)</option>
              <option value="4">4 Decimales ($1,000.0000)</option>
            </select>
          </div>
          <div style={{ marginTop: '0.5rem', display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn-primary" type="submit" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#4f46e5' }}>
              <Save size={18} /> Guardar Ajustes Globales
            </button>
          </div>
        </form>
      </div>

      {/* BRANCH SETTINGS */}
      <div style={{ backgroundColor: 'white', borderRadius: '8px', padding: '2rem', border: '1px solid var(--pulpos-border)' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <Settings size={24} /> Configuraciones Generales de Sucursal
        </h2>
        <p style={{ color: 'var(--pulpos-text-muted)', fontSize: '0.875rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--pulpos-border)', paddingBottom: '1rem' }}>
          Identidad técnica y matemática prioritaria asignada a esta Sucursal.
        </p>
        
        <form action={updateBranchSettings} style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem', maxWidth: '600px' }}>
        
        <div style={{ display: 'flex', flexDirection: 'column', borderBottom: '1px solid #f3f4f6', paddingBottom: '1rem' }}>
          <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 'bold', color: '#1f2937', marginBottom: '0.5rem' }}>
            Encabezado Fiscal del Ticket 
          </label>
          <input type="text" name="ticketHeader" defaultValue={settings.ticketHeader || ''} placeholder="Matriz San Jemo - RFC: XX00..." style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--pulpos-border)', outline: 'none' }} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', borderBottom: '1px solid #f3f4f6', paddingBottom: '1rem' }}>
          <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 'bold', color: '#1f2937', marginBottom: '0.5rem' }}>
            Pie del Ticket (Ej. Políticas de Devolución)
          </label>
          <input type="text" name="ticketFooter" defaultValue={settings.ticketFooter || ''} placeholder="Cambios con 15 días hábiles conservando ticket." style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--pulpos-border)', outline: 'none' }} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', borderBottom: '1px solid #f3f4f6', paddingBottom: '1rem' }}>
          <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 'bold', color: '#1f2937', marginBottom: '0.5rem' }}>
            Tasa de IVA Base (%)
          </label>
          <p style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '-0.2rem', marginBottom: '0.5rem' }}>Factor de cálculo fiscal a considerar transversalmente sobre las ventas pre-descuento.</p>
          <input type="number" step="0.1" name="taxIVA" defaultValue={settings.taxIVA} style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--pulpos-border)', outline: 'none' }} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', borderBottom: '1px solid #f3f4f6', paddingBottom: '1rem' }}>
          <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 'bold', color: '#1f2937', marginBottom: '0.5rem' }}>
            Símbolo de Moneda Nativa
          </label>
          <input type="text" name="currencySymbol" defaultValue={settings.currencySymbol} placeholder="$ / € / S/." style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--pulpos-border)', outline: 'none' }} />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f3f4f6', paddingBottom: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 'bold', color: '#1f2937' }}>
              Auto Cierre de Caja
            </label>
            <p style={{ fontSize: '0.8rem', color: '#6b7280', margin: '0.2rem 0 0 0' }}>Obliga a reiniciar el turno a media noche, cortando y emitiendo remisión final.</p>
          </div>
          <label style={{ position: 'relative', display: 'inline-block', width: '44px', height: '24px' }}>
            <input type="checkbox" name="autoCloseCash" value="true" defaultChecked={settings.autoCloseCash} style={{ opacity: 0, width: 0, height: 0 }} />
            <span style={{ 
              position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0, 
              backgroundColor: settings.autoCloseCash ? '#3b82f6' : '#ccc', 
              transition: '.4s', borderRadius: '34px',
              display: 'flex', alignItems: 'center', padding: '2px'
            }}>
              <span style={{ height: '20px', width: '20px', backgroundColor: 'white', borderRadius: '50%', transition: '.4s', transform: settings.autoCloseCash ? 'translateX(20px)' : 'translateX(0)' }}></span>
            </span>
          </label>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f3f4f6', paddingBottom: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 'bold', color: '#1f2937' }}>
              Configuración CFDI Propia
            </label>
            <p style={{ fontSize: '0.8rem', color: '#6b7280', margin: '0.2rem 0 0 0' }}>Usa los sellos y configuración de facturación de esta sucursal (en vez de la global).</p>
          </div>
          <label style={{ position: 'relative', display: 'inline-block', width: '44px', height: '24px' }}>
            <input type="checkbox" name="useCustomCFDI" value="true" defaultChecked={settings.useCustomCFDI} style={{ opacity: 0, width: 0, height: 0 }} />
            <span style={{ 
              position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0, 
              backgroundColor: settings.useCustomCFDI ? '#3b82f6' : '#ccc', 
              transition: '.4s', borderRadius: '34px',
              display: 'flex', alignItems: 'center', padding: '2px'
            }}>
              <span style={{ height: '20px', width: '20px', backgroundColor: 'white', borderRadius: '50%', transition: '.4s', transform: settings.useCustomCFDI ? 'translateX(20px)' : 'translateX(0)' }}></span>
            </span>
          </label>
        </div>

        <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn-primary" type="submit" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Save size={18} /> Re-Guardar Identidad Principal
          </button>
        </div>
      </form>
    </div>
    </div>
  );
}
