import { createCustomer } from "@/app/actions/customer";
import Link from 'next/link';

export default function NuevoCliente() {
  const saveAction = async (formData: FormData) => {
    'use server';
    await createCustomer(formData);
  };

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '2rem', gap: '1rem' }}>
        <Link href="/clientes" style={{ textDecoration: 'none', color: 'var(--pulpos-text-muted)', fontSize: '1.25rem' }}>← Volver a Clientes</Link>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold' }}>Alta de Nuevo Cliente B2B</h1>
      </div>

      <form action={saveAction} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        
        {/* Identificación */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', borderBottom: '1px solid var(--pulpos-border)', paddingBottom: '0.5rem' }}>Identificación Básica</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: '1.5rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Nombre Comercial o Identificador *</label>
              <input type="text" name="name" required placeholder="Ej. Abarrotes Lupita" style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--pulpos-border)' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Teléfono de Contacto</label>
              <input type="tel" name="phone" placeholder="(Opcional)" style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--pulpos-border)' }} />
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Correo Electrónico (Para envío de CFDI)</label>
              <input type="email" name="email" placeholder="cliente@correo.com" style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--pulpos-border)' }} />
            </div>
          </div>
        </div>

        {/* Dirección */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', borderBottom: '1px solid var(--pulpos-border)', paddingBottom: '0.5rem' }}>Domicilio Corporativo</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,2fr) minmax(0,1fr) minmax(0,1fr)', gap: '1.5rem', marginBottom: '1.5rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Calle</label>
              <input type="text" name="street" style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--pulpos-border)' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Núm Ext</label>
              <input type="text" name="exteriorNumber" style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--pulpos-border)' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Núm Int</label>
              <input type="text" name="interiorNumber" style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--pulpos-border)' }} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr) minmax(0,1fr)', gap: '1.5rem' }}>
             <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Colonia</label>
              <input type="text" name="neighborhood" style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--pulpos-border)' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Ciudad / Municipio</label>
              <input type="text" name="city" style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--pulpos-border)' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Estado</label>
              <input type="text" name="state" style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--pulpos-border)' }} />
            </div>
          </div>
        </div>

        {/* Facturación */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', borderBottom: '1px solid var(--pulpos-border)', paddingBottom: '0.5rem', display: 'flex', justifyContent: 'space-between' }}>
            <span>Configuración Fiscal (SAT)</span>
            <span style={{ fontSize: '0.875rem', color: '#10b981', backgroundColor: '#dcfce7', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>Módulo CFDI Activo</span>
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,2fr)', gap: '1.5rem', marginBottom: '1.5rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>RFC *</label>
              <input type="text" name="taxId" required placeholder="XAXX010101000" style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--pulpos-border)' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Razón Social Fiel (tal cual Constancia) *</label>
              <input type="text" name="legalName" required style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--pulpos-border)' }} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr) minmax(0,1fr)', gap: '1.5rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Código Postal Fiscal</label>
              <input type="text" name="zipCode" style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--pulpos-border)' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Régimen Fiscal</label>
              <select name="taxRegime" style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--pulpos-border)' }}>
                 <option value="601">601 - General de Ley Personas Morales</option>
                 <option value="612">612 - Personas Físicas con Actividades</option>
                 <option value="626">626 - RESICO</option>
                 <option value="616">616 - Sin obligaciones fiscales</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Uso de CFDI frecuente</label>
              <select name="cfdiUse" style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--pulpos-border)' }}>
                 <option value="G03">G03 - Gastos en general</option>
                 <option value="G01">G01 - Adquisición de mercancias</option>
                 <option value="P01">P01 - Por definir</option>
                 <option value="S01">S01 - Sin efectos fiscales</option>
              </select>
            </div>
          </div>
        </div>

        {/* Cobranza */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', borderBottom: '1px solid var(--pulpos-border)', paddingBottom: '0.5rem' }}>Crédito y Finanzas</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr) minmax(0,1fr)', gap: '1.5rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Límite de Crédito Autorizado ($)</label>
              <input type="number" step="0.01" name="creditLimit" defaultValue={0} style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--pulpos-border)' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Días Máximos de Crédito</label>
              <input type="number" name="creditDays" defaultValue={0} style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--pulpos-border)' }} />
            </div>
             <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Asignación de Precios</label>
              <select name="priceList" style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--pulpos-border)' }}>
                 <option value="price">Precio Público (Default)</option>
                 <option value="wholesalePrice">Precio Mayoreo</option>
                 <option value="specialPrice">Precio Especial Comercial</option>
              </select>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
           <Link href="/clientes" style={{ padding: '0.75rem 2rem', textDecoration: 'none', color: 'var(--pulpos-text)', border: '1px solid var(--pulpos-border)', borderRadius: '4px', fontWeight: 'bold' }}>Cancelar</Link>
           <button className="btn-primary" type="submit" style={{ padding: '0.75rem 3rem', fontSize: '1.1rem' }}>Crear Cliente</button>
        </div>
      </form>
    </div>
  );
}
