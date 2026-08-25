'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createCustomerAction } from '@/app/actions/customer';

interface NuevoClienteFormProps {
  priceLists: any[];
}

export default function NuevoClienteForm({ priceLists }: NuevoClienteFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const formEl = e.currentTarget;
    const formData = new FormData(formEl);

    const payload = {
      name: (formData.get('name') as string)?.trim() || '',
      phone: (formData.get('phone') as string)?.trim() || null,
      email: (formData.get('email') as string)?.trim() || null,
      additionalEmails: (formData.get('additionalEmails') as string)?.trim() || null,
      street: (formData.get('street') as string)?.trim() || null,
      exteriorNumber: (formData.get('exteriorNumber') as string)?.trim() || null,
      interiorNumber: (formData.get('interiorNumber') as string)?.trim() || null,
      neighborhood: (formData.get('neighborhood') as string)?.trim() || null,
      city: (formData.get('city') as string)?.trim() || null,
      state: (formData.get('state') as string)?.trim() || null,
      taxId: (formData.get('taxId') as string)?.trim() || null,
      legalName: (formData.get('legalName') as string)?.trim() || null,
      taxRegime: (formData.get('taxRegime') as string)?.trim() || null,
      zipCode: (formData.get('zipCode') as string)?.trim() || null,
      cfdiUse: (formData.get('cfdiUse') as string)?.trim() || null,
      creditLimit: parseFloat(formData.get('creditLimit') as string) || 0,
      creditDays: parseInt(formData.get('creditDays') as string, 10) || 0,
      priceList: (formData.get('priceList') as string) || 'price',
    };

    try {
      const res = await createCustomerAction(payload);
      if (res && res.error) {
        setErrorMsg(res.error);
        setIsSubmitting(false);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else if (res && res.success && res.customer) {
        setSuccessMsg('¡Cliente creado exitosamente!');

        // Update Dexie IndexedDB cache if available
        try {
          const { db } = await import('@/lib/offlineDB');
          await db.customers.put(res.customer);
        } catch (e) {
          console.warn('[OfflineDB] Could not sync local cache:', e);
        }

        setTimeout(() => {
          window.location.assign(`/clientes/${res.customer.id}`);
        }, 500);
      }
    } catch (err: any) {
      console.error('Error al crear cliente:', err);
      setErrorMsg(err.message || 'Error inesperado al registrar el cliente.');
      setIsSubmitting(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '2rem', gap: '1rem' }}>
        <Link href="/clientes" style={{ textDecoration: 'none', color: 'var(--caanma-text-muted)', fontSize: '1.25rem' }}>← Volver a Clientes</Link>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold' }}>Alta de Nuevo Cliente</h1>
      </div>

      {errorMsg && (
        <div style={{ padding: '1rem 1.25rem', backgroundColor: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca', borderRadius: '8px', marginBottom: '1.5rem', fontWeight: '500' }}>
          ⚠️ {errorMsg}
        </div>
      )}

      {successMsg && (
        <div style={{ padding: '1rem 1.25rem', backgroundColor: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0', borderRadius: '8px', marginBottom: '1.5rem', fontWeight: '500' }}>
          ✅ {successMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        
        {/* Identificación */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', borderBottom: '1px solid var(--caanma-border)', paddingBottom: '0.5rem' }}>Identificación Básica</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Nombre Comercial o Identificador *</label>
              <input type="text" name="name" required placeholder="Ej. Abarrotes Lupita" style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--caanma-border)' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Teléfono de Contacto</label>
              <input type="tel" name="phone" placeholder="10 dígitos" style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--caanma-border)' }} />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Correo Electrónico Principal</label>
              <input type="email" name="email" placeholder="cliente@correo.com" style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--caanma-border)' }} />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Correos Adicionales (Separados por coma, máx 5)</label>
              <input type="text" name="additionalEmails" placeholder="conta@correo.com, pagos@correo.com" style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--caanma-border)' }} />
            </div>
          </div>
        </div>

        {/* Dirección */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', borderBottom: '1px solid var(--caanma-border)', paddingBottom: '0.5rem' }}>Domicilio Corporativo</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Calle</label>
              <input type="text" name="street" style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--caanma-border)' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Núm Ext</label>
              <input type="text" name="exteriorNumber" style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--caanma-border)' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Núm Int</label>
              <input type="text" name="interiorNumber" style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--caanma-border)' }} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
             <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Colonia</label>
              <input type="text" name="neighborhood" style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--caanma-border)' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Ciudad / Municipio</label>
              <input type="text" name="city" style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--caanma-border)' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Estado</label>
              <input type="text" name="state" style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--caanma-border)' }} />
            </div>
          </div>
        </div>

        {/* Facturación */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', borderBottom: '1px solid var(--caanma-border)', paddingBottom: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
            <span>Configuración Fiscal (SAT)</span>
            <span style={{ fontSize: '0.875rem', color: '#10b981', backgroundColor: '#dcfce7', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>Módulo CFDI Activo</span>
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>RFC</label>
              <input type="text" name="taxId" placeholder="XAXX010101000" style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--caanma-border)' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Razón Social Fiel (tal cual Constancia)</label>
              <input type="text" name="legalName" placeholder="Razón social oficial" style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--caanma-border)' }} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Código Postal Fiscal</label>
              <input type="text" name="zipCode" placeholder="Código Postal" style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--caanma-border)' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Régimen Fiscal</label>
              <select name="taxRegime" defaultValue="601" style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--caanma-border)' }}>
                 <option value="601">601 - General de Ley Personas Morales</option>
                 <option value="603">603 - Personas Morales con Fines no Lucrativos</option>
                 <option value="605">605 - Sueldos y Salarios e Ingresos Asimilados a Salarios</option>
                 <option value="606">606 - Arrendamiento</option>
                 <option value="607">607 - Régimen de Enajenación o Adquisición de Bienes</option>
                 <option value="608">608 - Demás ingresos</option>
                 <option value="610">610 - Residentes en el Extranjero sin Establecimiento Permanente en México</option>
                 <option value="611">611 - Ingresos por Dividendos (socios y accionistas)</option>
                 <option value="612">612 - Personas Físicas con Actividades Empresariales y Profesionales</option>
                 <option value="614">614 - Ingresos por Intereses</option>
                 <option value="615">615 - Régimen de los ingresos por obtención de premios</option>
                 <option value="616">616 - Sin obligaciones fiscales</option>
                 <option value="620">620 - Sociedades Cooperativas de Producción que optan por diferir sus ingresos</option>
                 <option value="621">621 - Incorporación Fiscal (RIF)</option>
                 <option value="622">622 - Actividades Agrícolas, Ganaderas, Silvícolas y Pesqueras (AGAPES - PM)</option>
                 <option value="623">623 - Opcional para Grupos de Sociedades</option>
                 <option value="624">624 - Coordinados</option>
                 <option value="625">625 - Régimen de las Actividades Empresariales con ingresos a través de Plataformas Tecnológicas</option>
                 <option value="626">626 - Régimen Simplificado de Confianza (RESICO)</option>
                 <option value="628">628 - Hidrocarburos</option>
                 <option value="629">629 - De los Regímenes Fiscales Preferentes y Empresas Multinacionales</option>
                 <option value="630">630 - Enajenación de acciones en bolsa de valores</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Uso de CFDI frecuente</label>
              <select name="cfdiUse" defaultValue="G03" style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--caanma-border)' }}>
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
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', borderBottom: '1px solid var(--caanma-border)', paddingBottom: '0.5rem' }}>Crédito y Finanzas</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Límite de Crédito Autorizado ($)</label>
              <input type="number" step="0.01" name="creditLimit" defaultValue={0} style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--caanma-border)' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Días Máximos de Crédito</label>
              <input type="number" name="creditDays" defaultValue={0} style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--caanma-border)' }} />
            </div>
             <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Asignación de Precios</label>
              <select name="priceList" defaultValue="price" style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--caanma-border)' }}>
                 <option value="price">Precio Público (Default)</option>
                 <option value="wholesalePrice">Precio Mayoreo</option>
                 <option value="specialPrice">Precio Especial Comercial</option>
                 {priceLists.map((list) => (
                   <option key={list.id} value={`priceList_${list.id}`}>{list.name}</option>
                 ))}
              </select>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
           <Link href="/clientes" style={{ padding: '0.75rem 2rem', textDecoration: 'none', color: 'var(--caanma-text)', border: '1px solid var(--caanma-border)', borderRadius: '4px', fontWeight: 'bold' }}>Cancelar</Link>
           <button className="btn-primary" type="submit" disabled={isSubmitting} style={{ padding: '0.75rem 3rem', fontSize: '1.1rem', opacity: isSubmitting ? 0.7 : 1 }}>
             {isSubmitting ? 'Creando...' : 'Crear Cliente'}
           </button>
        </div>
      </form>
    </div>
  );
}
