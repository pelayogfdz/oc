'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { updateSupplier } from '@/app/actions/supplier';

interface SupplierData {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  street: string | null;
  exteriorNumber: string | null;
  interiorNumber: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  taxId: string | null;
  legalName: string | null;
  taxRegime: string | null;
  zipCode: string | null;
  cfdiUse: string | null;
  creditLimit: number;
  creditDays: number;
  additionalEmails: string | null;
}

export default function EditarProveedorForm({ supplier }: { supplier: SupplierData }) {
  const router = useRouter();
  const initialValues = {
    name: supplier.name || '',
    phone: supplier.phone || '',
    email: supplier.email || '',
    additionalEmails: supplier.additionalEmails || '',
    street: supplier.street || '',
    exteriorNumber: supplier.exteriorNumber || '',
    interiorNumber: supplier.interiorNumber || '',
    neighborhood: supplier.neighborhood || '',
    city: supplier.city || '',
    state: supplier.state || '',
    taxId: supplier.taxId || '',
    legalName: supplier.legalName || '',
    zipCode: supplier.zipCode || '',
    taxRegime: supplier.taxRegime || '601',
    cfdiUse: supplier.cfdiUse || 'G03',
    creditLimit: supplier.creditLimit || 0,
    creditDays: supplier.creditDays || 0,
  };

  const [formValues, setFormValues] = useState(initialValues);
  const [isPending, setIsPending] = useState(false);

  // Compute dirty state
  const isDirty = Object.keys(initialValues).some(
    (key) => (formValues as any)[key] !== (initialValues as any)[key]
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormValues((prev) => ({
      ...prev,
      [name]: type === 'number' ? Number(value) : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsPending(true);
    try {
      const res = await updateSupplier(supplier.id, formValues);
      if (res?.success) {
        router.push('/proveedores');
        router.refresh();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsPending(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Identificación */}
      <div className="card" style={{ padding: '1.5rem', backgroundColor: 'white', borderRadius: '8px', border: '1px solid var(--caanma-border)' }}>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', borderBottom: '1px solid var(--caanma-border)', paddingBottom: '0.5rem', fontWeight: 'bold' }}>Identificación Básica</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: '1.5rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Nombre Comercial o Identificador *</label>
            <input 
              type="text" 
              name="name" 
              required 
              value={formValues.name} 
              onChange={handleChange} 
              placeholder="Ej. Abarrotes Lupita" 
              style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--caanma-border)', outline: 'none' }} 
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Teléfono de Contacto</label>
            <input 
              type="tel" 
              name="phone" 
              value={formValues.phone} 
              onChange={handleChange} 
              placeholder="(Opcional)" 
              style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--caanma-border)', outline: 'none' }} 
            />
          </div>
          <div style={{ gridColumn: 'span 2' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Correo Electrónico (Para envío de CFDI)</label>
            <input 
              type="email" 
              name="email" 
              value={formValues.email} 
              onChange={handleChange} 
              placeholder="cliente@correo.com" 
              style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--caanma-border)', outline: 'none' }} 
            />
          </div>
          <div style={{ gridColumn: 'span 2' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Correos Adicionales (Separados por coma, máx 5)</label>
            <input 
              type="text" 
              name="additionalEmails" 
              value={formValues.additionalEmails} 
              onChange={handleChange} 
              placeholder="conta@correo.com, pagos@correo.com" 
              style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--caanma-border)', outline: 'none' }} 
            />
          </div>
        </div>
      </div>

      {/* Dirección */}
      <div className="card" style={{ padding: '1.5rem', backgroundColor: 'white', borderRadius: '8px', border: '1px solid var(--caanma-border)' }}>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', borderBottom: '1px solid var(--caanma-border)', paddingBottom: '0.5rem', fontWeight: 'bold' }}>Domicilio Corporativo</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,2fr) minmax(0,1fr) minmax(0,1fr)', gap: '1.5rem', marginBottom: '1.5rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Calle</label>
            <input 
              type="text" 
              name="street" 
              value={formValues.street} 
              onChange={handleChange} 
              style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--caanma-border)', outline: 'none' }} 
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Núm Ext</label>
            <input 
              type="text" 
              name="exteriorNumber" 
              value={formValues.exteriorNumber} 
              onChange={handleChange} 
              style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--caanma-border)', outline: 'none' }} 
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Núm Int</label>
            <input 
              type="text" 
              name="interiorNumber" 
              value={formValues.interiorNumber} 
              onChange={handleChange} 
              style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--caanma-border)', outline: 'none' }} 
            />
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr) minmax(0,1fr)', gap: '1.5rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Colonia</label>
            <input 
              type="text" 
              name="neighborhood" 
              value={formValues.neighborhood} 
              onChange={handleChange} 
              style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--caanma-border)', outline: 'none' }} 
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Ciudad / Municipio</label>
            <input 
              type="text" 
              name="city" 
              value={formValues.city} 
              onChange={handleChange} 
              style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--caanma-border)', outline: 'none' }} 
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Estado</label>
            <input 
              type="text" 
              name="state" 
              value={formValues.state} 
              onChange={handleChange} 
              style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--caanma-border)', outline: 'none' }} 
            />
          </div>
        </div>
      </div>

      {/* Facturación */}
      <div className="card" style={{ padding: '1.5rem', backgroundColor: 'white', borderRadius: '8px', border: '1px solid var(--caanma-border)' }}>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', borderBottom: '1px solid var(--caanma-border)', paddingBottom: '0.5rem', display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
          <span>Configuración Fiscal (SAT)</span>
          <span style={{ fontSize: '0.875rem', color: '#10b981', backgroundColor: '#dcfce7', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>Módulo CFDI Activo</span>
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,2fr)', gap: '1.5rem', marginBottom: '1.5rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>RFC *</label>
            <input 
              type="text" 
              name="taxId" 
              required 
              value={formValues.taxId} 
              onChange={handleChange} 
              placeholder="XAXX010101000" 
              style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--caanma-border)', outline: 'none' }} 
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Razón Social Fiel (tal cual Constancia) *</label>
            <input 
              type="text" 
              name="legalName" 
              required 
              value={formValues.legalName} 
              onChange={handleChange} 
              style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--caanma-border)', outline: 'none' }} 
            />
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr) minmax(0,1fr)', gap: '1.5rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Código Postal Fiscal</label>
            <input 
              type="text" 
              name="zipCode" 
              value={formValues.zipCode} 
              onChange={handleChange} 
              style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--caanma-border)', outline: 'none' }} 
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Régimen Fiscal</label>
            <select 
              name="taxRegime" 
              value={formValues.taxRegime} 
              onChange={handleChange} 
              style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--caanma-border)', outline: 'none' }}
            >
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
            <select 
              name="cfdiUse" 
              value={formValues.cfdiUse} 
              onChange={handleChange} 
              style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--caanma-border)', outline: 'none' }}
            >
               <option value="G03">G03 - Gastos en general</option>
               <option value="G01">G01 - Adquisición de mercancias</option>
               <option value="P01">P01 - Por definir</option>
               <option value="S01">S01 - Sin efectos fiscales</option>
            </select>
          </div>
        </div>
      </div>

      {/* Cobranza */}
      <div className="card" style={{ padding: '1.5rem', backgroundColor: 'white', borderRadius: '8px', border: '1px solid var(--caanma-border)' }}>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', borderBottom: '1px solid var(--caanma-border)', paddingBottom: '0.5rem', fontWeight: 'bold' }}>Crédito y Finanzas</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr) minmax(0,1fr)', gap: '1.5rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Límite de Crédito Autorizado ($)</label>
            <input 
              type="number" 
              step="0.01" 
              name="creditLimit" 
              value={formValues.creditLimit} 
              onChange={handleChange} 
              style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--caanma-border)', outline: 'none' }} 
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Días Máximos de Crédito</label>
            <input 
              type="number" 
              name="creditDays" 
              value={formValues.creditDays} 
              onChange={handleChange} 
              style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--caanma-border)', outline: 'none' }} 
            />
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
        <Link 
          href="/proveedores" 
          style={{ padding: '0.75rem 2rem', textDecoration: 'none', color: 'var(--caanma-text)', border: '1px solid var(--caanma-border)', borderRadius: '4px', fontWeight: 'bold', display: 'flex', alignItems: 'center' }}
        >
          Cancelar
        </Link>
        <button 
          id="save-supplier-btn"
          type="submit" 
          disabled={!isDirty || isPending}
          style={{ 
            padding: '0.75rem 3rem', 
            fontSize: '1.1rem',
            opacity: (!isDirty || isPending) ? 0.6 : 1,
            cursor: (!isDirty || isPending) ? 'not-allowed' : 'pointer',
            backgroundColor: '#10b981',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontWeight: 'bold',
            transition: 'opacity 0.2s'
          }}
        >
          {isPending ? 'Guardando...' : 'Guardar Cambios'}
        </button>
      </div>
    </form>
  );
}
