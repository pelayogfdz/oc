import { updateCustomer } from "@/app/actions/customer";
import { getActiveBranch } from "@/app/actions/auth";
import { prisma } from "@/lib/prisma";
import Link from 'next/link';

export default async function EditarClientePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const branch = await getActiveBranch();

  const customer = await prisma.customer.findUnique({
    where: { id }
  });

  if (!customer) {
    return <div>Cliente no encontrado.</div>;
  }

  const allPriceLists = await prisma.priceList.findMany({
    orderBy: { name: 'asc' }
  });

  const priceListsMap = new Map();
  const targetBranchId = customer.branchId || (branch?.id !== 'GLOBAL' ? branch?.id : undefined);

  if (targetBranchId) {
    for (const pl of allPriceLists) {
      if (pl.branchId === targetBranchId) {
        priceListsMap.set(pl.name, pl);
      }
    }
  }

  for (const pl of allPriceLists) {
    if (!priceListsMap.has(pl.name)) {
      priceListsMap.set(pl.name, pl);
    }
  }

  const priceLists = Array.from(priceListsMap.values()).sort((a: any, b: any) => a.name.localeCompare(b.name));

  const isGenericPublic = 
    (customer.name.toLowerCase().includes('publico') && customer.name.toLowerCase().includes('general')) ||
    customer.taxId === 'XAXX010101000';

  const saveAction = async (formData: FormData) => {
    'use server';
    if (isGenericPublic) {
      throw new Error("No se permite modificar el cliente genérico de Público en General.");
    }
    await updateCustomer(id, formData);
  };

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '2rem', gap: '1rem' }}>
        <Link href="/clientes" style={{ textDecoration: 'none', color: 'var(--caanma-text-muted)', fontSize: '1.25rem' }}>← Volver a Clientes</Link>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold' }}>Editar Cliente: {customer.name}</h1>
      </div>

      {isGenericPublic && (
        <div style={{ padding: '1.25rem', backgroundColor: '#fffbeb', color: '#b45309', border: '1px solid #fef3c7', borderRadius: '8px', marginBottom: '2rem', lineHeight: '1.5' }}>
          <h3 style={{ margin: '0 0 0.5rem 0', fontWeight: 'bold', fontSize: '1.1rem' }}>⚠️ Registro de Público en General No Modificable</h3>
          <p style={{ margin: 0, fontSize: '0.95rem' }}>
            Este es el cliente genérico del sistema. Modificar sus datos cambiaría el nombre del cliente en todas las ventas pasadas y futuras que se hayan hecho al público en general.
          </p>
          <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.95rem' }}>
            Si deseas facturar una venta a un cliente específico, debes registrar un nuevo cliente en el catálogo y luego editar la venta desde el historial para asignarla al nuevo cliente.
          </p>
        </div>
      )}

      <form action={saveAction} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        
        {/* Identificación */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', borderBottom: '1px solid var(--caanma-border)', paddingBottom: '0.5rem' }}>Identificación Básica</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: '1.5rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Nombre Comercial o Identificador *</label>
              <input type="text" name="name" required defaultValue={customer.name} disabled={isGenericPublic} placeholder="Ej. Abarrotes Lupita" style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--caanma-border)', backgroundColor: isGenericPublic ? '#f1f5f9' : 'white' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Teléfono de Contacto</label>
              <input type="tel" name="phone" defaultValue={customer.phone || ''} disabled={isGenericPublic} placeholder="10 dígitos" style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--caanma-border)', backgroundColor: isGenericPublic ? '#f1f5f9' : 'white' }} />
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Correo Electrónico Principal</label>
              <input type="email" name="email" defaultValue={customer.email || ''} disabled={isGenericPublic} placeholder="cliente@correo.com" style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--caanma-border)', backgroundColor: isGenericPublic ? '#f1f5f9' : 'white' }} />
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Correos Adicionales (Separados por coma, máx 5)</label>
              <input type="text" name="additionalEmails" defaultValue={customer.additionalEmails || ''} disabled={isGenericPublic} placeholder="conta@correo.com, pagos@correo.com" style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--caanma-border)', backgroundColor: isGenericPublic ? '#f1f5f9' : 'white' }} />
            </div>
          </div>
        </div>

        {/* Dirección */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', borderBottom: '1px solid var(--caanma-border)', paddingBottom: '0.5rem' }}>Domicilio Corporativo</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,2fr) minmax(0,1fr) minmax(0,1fr)', gap: '1.5rem', marginBottom: '1.5rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Calle</label>
              <input type="text" name="street" defaultValue={customer.street || ''} disabled={isGenericPublic} style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--caanma-border)', backgroundColor: isGenericPublic ? '#f1f5f9' : 'white' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Núm Ext</label>
              <input type="text" name="exteriorNumber" defaultValue={customer.exteriorNumber || ''} disabled={isGenericPublic} style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--caanma-border)', backgroundColor: isGenericPublic ? '#f1f5f9' : 'white' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Núm Int</label>
              <input type="text" name="interiorNumber" defaultValue={customer.interiorNumber || ''} disabled={isGenericPublic} style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--caanma-border)', backgroundColor: isGenericPublic ? '#f1f5f9' : 'white' }} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr) minmax(0,1fr)', gap: '1.5rem' }}>
             <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Colonia</label>
              <input type="text" name="neighborhood" defaultValue={customer.neighborhood || ''} disabled={isGenericPublic} style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--caanma-border)', backgroundColor: isGenericPublic ? '#f1f5f9' : 'white' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Ciudad / Municipio</label>
              <input type="text" name="city" defaultValue={customer.city || ''} disabled={isGenericPublic} style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--caanma-border)', backgroundColor: isGenericPublic ? '#f1f5f9' : 'white' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Estado</label>
              <input type="text" name="state" defaultValue={customer.state || ''} disabled={isGenericPublic} style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--caanma-border)', backgroundColor: isGenericPublic ? '#f1f5f9' : 'white' }} />
            </div>
          </div>
        </div>

        {/* Facturación */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', borderBottom: '1px solid var(--caanma-border)', paddingBottom: '0.5rem', display: 'flex', justifyContent: 'space-between' }}>
            <span>Configuración Fiscal (SAT)</span>
            <span style={{ fontSize: '0.875rem', color: '#10b981', backgroundColor: '#dcfce7', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>Módulo CFDI Activo</span>
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,2fr)', gap: '1.5rem', marginBottom: '1.5rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>RFC</label>
              <input type="text" name="taxId" defaultValue={customer.taxId || ''} disabled={isGenericPublic} placeholder="XAXX010101000" style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--caanma-border)', backgroundColor: isGenericPublic ? '#f1f5f9' : 'white' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Razón Social Fiel (tal cual Constancia)</label>
              <input type="text" name="legalName" defaultValue={customer.legalName || ''} disabled={isGenericPublic} style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--caanma-border)', backgroundColor: isGenericPublic ? '#f1f5f9' : 'white' }} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr) minmax(0,1fr)', gap: '1.5rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Código Postal Fiscal</label>
              <input type="text" name="zipCode" defaultValue={customer.zipCode || ''} disabled={isGenericPublic} style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--caanma-border)', backgroundColor: isGenericPublic ? '#f1f5f9' : 'white' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Régimen Fiscal</label>
              <select name="taxRegime" defaultValue={customer.taxRegime || '601'} disabled={isGenericPublic} style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--caanma-border)', backgroundColor: isGenericPublic ? '#f1f5f9' : 'white' }}>
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
              <select name="cfdiUse" defaultValue={customer.cfdiUse || 'G03'} disabled={isGenericPublic} style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--caanma-border)', backgroundColor: isGenericPublic ? '#f1f5f9' : 'white' }}>
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
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr) minmax(0,1fr)', gap: '1.5rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Límite de Crédito Autorizado ($)</label>
              <input type="number" step="0.01" name="creditLimit" defaultValue={customer.creditLimit || 0} disabled={isGenericPublic} style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--caanma-border)', backgroundColor: isGenericPublic ? '#f1f5f9' : 'white' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Días Máximos de Crédito</label>
              <input type="number" name="creditDays" defaultValue={customer.creditDays || 0} disabled={isGenericPublic} style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--caanma-border)', backgroundColor: isGenericPublic ? '#f1f5f9' : 'white' }} />
            </div>
             <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Asignación de Precios</label>
              <select name="priceList" defaultValue={customer.priceList || 'price'} disabled={isGenericPublic} style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--caanma-border)', backgroundColor: isGenericPublic ? '#f1f5f9' : 'white' }}>
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
           <Link href={`/clientes/${id}`} style={{ padding: '0.75rem 2rem', textDecoration: 'none', color: 'var(--caanma-text)', border: '1px solid var(--caanma-border)', borderRadius: '4px', fontWeight: 'bold' }}>
             {isGenericPublic ? 'Volver al Perfil' : 'Cancelar'}
           </Link>
           {!isGenericPublic && (
             <button className="btn-primary" type="submit" style={{ padding: '0.75rem 3rem', fontSize: '1.1rem' }}>Guardar Cambios</button>
           )}
        </div>
      </form>
    </div>
  );
}
