import { getBranchSettings, updateBranchSettings, getTenantSettings, updateTenantSettings, updateBranchLogo } from "@/app/actions/settings";
import { Settings, Save, Globe } from 'lucide-react';
import LogoUploaderClient from './LogoUploaderClient';

export default async function GeneralPreferencesPage() {
  // Explicitly reference the imported server actions to ensure they are registered by the compiler for this route and prevent tree-shaking
  const _registerActions = { updateBranchLogo };

  const settings = await getBranchSettings();
  const tenantSettings = await getTenantSettings();

  let globalLogoUrl = '';
  if (settings.configJson) {
    try {
      const parsed = JSON.parse(settings.configJson);
      globalLogoUrl = parsed.global?.logoUrl || '';
    } catch (e) {}
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <LogoUploaderClient initialLogoUrl={globalLogoUrl} />
      
      {/* GLOBAL SETTINGS (TENANT) */}
      <div style={{ backgroundColor: 'white', borderRadius: '8px', padding: '2rem', border: '1px solid var(--caanma-border)' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <Globe size={24} /> Configuración Global de la Organización
        </h2>
        <p style={{ color: 'var(--caanma-text-muted)', fontSize: '0.875rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--caanma-border)', paddingBottom: '1rem' }}>
          Estos ajustes aplican a todas las sucursales y usuarios de tu organización.
        </p>

        <form action={updateTenantSettings} style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem', maxWidth: '600px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', borderBottom: '1px solid #f3f4f6', paddingBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 'bold', color: '#1f2937', marginBottom: '0.5rem' }}>
              Precisión Decimal
            </label>
            <p style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '-0.2rem', marginBottom: '0.5rem' }}>Define la cantidad de decimales a utilizar en toda la aplicación (0 a 4).</p>
            <select name="decimals" defaultValue={tenantSettings.decimals} style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--caanma-border)', outline: 'none', backgroundColor: 'white' }}>
              <option value="0">0 Decimales ($1,000)</option>
              <option value="1">1 Decimal ($1,000.0)</option>
              <option value="2">2 Decimales ($1,000.00)</option>
              <option value="3">3 Decimales ($1,000.000)</option>
              <option value="4">4 Decimales ($1,000.0000)</option>
            </select>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', borderBottom: '1px solid #f3f4f6', paddingBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 'bold', color: '#1f2937', marginBottom: '0.5rem' }}>
              Uso Horario (Configurador de Reloj)
            </label>
            <p style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '-0.2rem', marginBottom: '0.5rem' }}>Define la zona horaria en la que operan tu aplicación y tus registros de asistencia.</p>
            <select name="timezone" defaultValue={(tenantSettings as any).timezone || 'America/Mexico_City'} style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--caanma-border)', outline: 'none', backgroundColor: 'white' }}>
              <optgroup label="América del Norte y México">
                <option value="America/Mexico_City">México - Centro (CDMX, Monterrey, Guadalajara)</option>
                <option value="America/Cancun">México - Sureste (Cancún, Q. Roo)</option>
                <option value="America/Hermosillo">México - Pacífico (Sonora, sin DST)</option>
                <option value="America/Tijuana">México - Noroeste (Tijuana, B. California)</option>
                <option value="America/Mazatlan">México - Pacífico (Sinaloa, Nayarit, BCS)</option>
                <option value="America/Ciudad_Juarez">México - Frontera (Cd. Juárez)</option>
                <option value="America/New_York">EE.UU. &amp; Canadá - Este (New York, Toronto)</option>
                <option value="America/Chicago">EE.UU. &amp; Canadá - Centro (Chicago, Winnipeg)</option>
                <option value="America/Denver">EE.UU. &amp; Canadá - Montaña (Denver, Calgary)</option>
                <option value="America/Los_Angeles">EE.UU. &amp; Canadá - Pacífico (Los Angeles, Vancouver)</option>
                <option value="America/Anchorage">EE.UU. - Alaska</option>
                <option value="Pacific/Honolulu">EE.UU. - Hawaii</option>
              </optgroup>
              <optgroup label="América del Centro y del Sur">
                <option value="America/Bogota">Colombia / Ecuador / Perú (Bogotá, Lima, Quito)</option>
                <option value="America/Caracas">Venezuela (Caracas)</option>
                <option value="America/Santiago">Chile (Santiago)</option>
                <option value="America/Buenos_Aires">Argentina (Buenos Aires)</option>
                <option value="America/Sao_Paulo">Brasil (São Paulo, Río de Janeiro)</option>
                <option value="America/Guatemala">Guatemala / El Salvador / Costa Rica</option>
                <option value="America/Panama">Panamá</option>
                <option value="America/La_Paz">Bolivia (La Paz)</option>
              </optgroup>
              <optgroup label="Europa">
                <option value="Europe/London">Reino Unido / Irlanda (Londres, Dublín - GMT/BST)</option>
                <option value="Europe/Madrid">España / Francia / Italia / Alemania (Madrid, París, Berlín - CET)</option>
                <option value="Europe/Athens">Grecia / Ucrania / Finlandia (Atenas, Kiev, Helsinki - EET)</option>
                <option value="Europe/Moscow">Rusia (Moscú)</option>
              </optgroup>
              <optgroup label="Asia">
                <option value="Asia/Dubai">Emiratos Árabes / Omán (Dubái)</option>
                <option value="Asia/Kolkata">India / Sri Lanka (Nueva Delhi)</option>
                <option value="Asia/Bangkok">Tailandia / Vietnam / Indonesia (Bangkok, Yakarta)</option>
                <option value="Asia/Singapore">Singapur / Malasia / Hong Kong / Pekín</option>
                <option value="Asia/Tokyo">Japón / Corea del Sur (Tokio, Seúl)</option>
                <option value="Asia/Shanghai">China (Shanghai)</option>
                <option value="Asia/Jakarta">Indonesia (Yakarta)</option>
                <option value="Asia/Manila">Filipinas (Manila)</option>
              </optgroup>
              <optgroup label="África">
                <option value="Africa/Cairo">Egipto (El Cairo)</option>
                <option value="Africa/Johannesburg">Sudáfrica (Johannesburgo)</option>
                <option value="Africa/Lagos">Nigeria (Lagos)</option>
                <option value="Africa/Nairobi">Kenia / Etiopía (Nairobi)</option>
              </optgroup>
              <optgroup label="Oceanía">
                <option value="Australia/Sydney">Australia - Este (Sídney, Melbourne)</option>
                <option value="Australia/Perth">Australia - Oeste (Perth)</option>
                <option value="Pacific/Auckland">Nueva Zelanda (Auckland)</option>
                <option value="Pacific/Fiji">Fiyi</option>
              </optgroup>
              <optgroup label="Estándar">
                <option value="UTC">Tiempo Universal Coordinado (UTC)</option>
              </optgroup>
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
      <div style={{ backgroundColor: 'white', borderRadius: '8px', padding: '2rem', border: '1px solid var(--caanma-border)' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <Settings size={24} /> Configuraciones Generales de Sucursal
        </h2>
        <p style={{ color: 'var(--caanma-text-muted)', fontSize: '0.875rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--caanma-border)', paddingBottom: '1rem' }}>
          Identidad técnica y matemática prioritaria asignada a esta Sucursal.
        </p>
        
        <form action={updateBranchSettings} style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem', maxWidth: '600px' }}>
        
        <div style={{ display: 'flex', flexDirection: 'column', borderBottom: '1px solid #f3f4f6', paddingBottom: '1rem' }}>
          <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 'bold', color: '#1f2937', marginBottom: '0.5rem' }}>
            Encabezado Fiscal del Ticket 
          </label>
          <input type="text" name="ticketHeader" defaultValue={settings.ticketHeader || ''} placeholder="Matriz San Jemo - RFC: XX00..." style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--caanma-border)', outline: 'none' }} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', borderBottom: '1px solid #f3f4f6', paddingBottom: '1rem' }}>
          <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 'bold', color: '#1f2937', marginBottom: '0.5rem' }}>
            Pie del Ticket (Ej. Políticas de Devolución)
          </label>
          <input type="text" name="ticketFooter" defaultValue={settings.ticketFooter || ''} placeholder="Cambios con 15 días hábiles conservando ticket." style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--caanma-border)', outline: 'none' }} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', borderBottom: '1px solid #f3f4f6', paddingBottom: '1rem' }}>
          <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 'bold', color: '#1f2937', marginBottom: '0.5rem' }}>
            Tasa de IVA Base (%)
          </label>
          <p style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '-0.2rem', marginBottom: '0.5rem' }}>Factor de cálculo fiscal a considerar transversalmente sobre las ventas pre-descuento.</p>
          <input type="number" step="0.1" name="taxIVA" defaultValue={settings.taxIVA} style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--caanma-border)', outline: 'none' }} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', borderBottom: '1px solid #f3f4f6', paddingBottom: '1rem' }}>
          <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 'bold', color: '#1f2937', marginBottom: '0.5rem' }}>
            Símbolo de Moneda Nativa
          </label>
          <input type="text" name="currencySymbol" defaultValue={settings.currencySymbol} placeholder="$ / € / S/." style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--caanma-border)', outline: 'none' }} />
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
