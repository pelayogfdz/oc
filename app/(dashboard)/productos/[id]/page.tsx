import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ProductDetailClient } from "./ProductDetailClient";
import { updateProduct, deleteProduct } from "@/app/actions/product";
import { getActiveBranch } from "@/app/actions/auth";
import { getTenantSuppliers } from "@/app/actions/supplier";
import { Image as ImageIcon } from 'lucide-react';
import ProductFinanceSection from '../ProductFinanceSection';
import ProductImageSection from '../ProductImageSection';
import SatKeyAutocomplete from "@/app/components/SatKeyAutocomplete";
import SatUnitAutocomplete from "@/app/components/SatUnitAutocomplete";


export default async function ProductDetailPage({ params }: { params: { id: string } }) {
  const { id } = await params;
  
  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      inventoryMovements: {
        orderBy: { createdAt: 'desc' },
        include: {
          user: true
        }
      },
      saleItems: {
        orderBy: { sale: { createdAt: 'desc' } },
        include: { sale: true }
      },
      variants: {
        orderBy: { attribute: 'asc' }
      },
      batches: {
        orderBy: { expirationDate: 'asc' }
      },
      prices: {
        select: {
          priceListId: true,
          price: true
        }
      }
    }
  });

  if (!product) return notFound();

  const branch = await getActiveBranch();
  if (branch && branch.id !== 'GLOBAL' && product.branchId !== branch.id) {
    // Try to find a sibling product with the same SKU in the user's active branch
    const siblingInActiveBranch = await prisma.product.findFirst({
      where: { sku: product.sku, branchId: branch.id }
    });
    if (siblingInActiveBranch) {
      redirect(`/productos/${siblingInActiveBranch.id}`);
    } else {
      return notFound();
    }
  }

  const suppliers = await getTenantSuppliers();

  const dynamicPriceLists = await prisma.priceList.findMany({
    where: { branchId: product.branchId },
    orderBy: { name: 'asc' }
  });

  const siblingProducts = await prisma.product.findMany({
    where: { sku: product.sku },
    include: { branch: true },
    orderBy: { branch: { name: 'asc' } }
  });

  // Next.js Server Action with bound ID
  const updateProductWithId = updateProduct.bind(null, product.id);
  
  const handleDelete = async () => {
    'use server';
    await deleteProduct(product.id);
    redirect('/productos');
  };

  const enrichedMovements = await Promise.all(
    product.inventoryMovements.map(async (mov) => {
      let detailUrl = null;
      let detailLabel = null;
      
      // 1. Purchase Check (starts with 'Compra #')
      if (mov.reason.startsWith('Compra #')) {
        const prefix = mov.reason.replace('Compra #', '').split(' ')[0];
        if (prefix && prefix.length >= 8) {
          const purchase = await prisma.purchase.findFirst({
            where: { id: { startsWith: prefix } },
            select: { id: true }
          });
          if (purchase) {
            detailUrl = `/productos/compras/${purchase.id}`;
            detailLabel = 'Ver Compra';
          }
        }
      } 
      // 2. Cancellation of purchase check (starts with 'Cancelación Compra #')
      else if (mov.reason.startsWith('Cancelación Compra #')) {
        const prefix = mov.reason.replace('Cancelación Compra #', '').split(' ')[0];
        if (prefix && prefix.length >= 8) {
          const purchase = await prisma.purchase.findFirst({
            where: { id: { startsWith: prefix } },
            select: { id: true }
          });
          if (purchase) {
            detailUrl = `/productos/compras/${purchase.id}`;
            detailLabel = 'Ver Compra';
          }
        }
      }
      // 3. Sale check (starts with 'Venta #')
      else if (mov.reason.startsWith('Venta #')) {
        const prefix = mov.reason.replace('Venta #', '').split(' ')[0];
        if (prefix && prefix.length >= 8) {
          const sale = await prisma.sale.findFirst({
            where: { id: { startsWith: prefix } },
            select: { id: true }
          });
          if (sale) {
            detailUrl = `/ventas/detalle/${sale.id}`;
            detailLabel = 'Ver Venta';
          }
        }
      }
      // 4. Cancellation of sale check (starts with 'Cancelación Venta #')
      else if (mov.reason.startsWith('Cancelación Venta #')) {
        const prefix = mov.reason.replace('Cancelación Venta #', '').split(' ')[0];
        if (prefix && prefix.length >= 8) {
          const sale = await prisma.sale.findFirst({
            where: { id: { startsWith: prefix } },
            select: { id: true }
          });
          if (sale) {
            detailUrl = `/ventas/detalle/${sale.id}`;
            detailLabel = 'Ver Venta';
          }
        }
      }
      // 5. Transfer check
      else if (mov.reason.includes('Traspaso') || mov.reason.includes('traspaso')) {
        const uuidMatch = mov.reason.match(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/i);
        if (uuidMatch) {
          detailUrl = `/productos/traspasos/${uuidMatch[0]}`;
          detailLabel = 'Ver Traspaso';
        }
      }

      return {
        id: mov.id,
        productId: mov.productId,
        type: mov.type,
        quantity: mov.quantity,
        reason: mov.reason,
        createdAt: mov.createdAt.toISOString(),
        userId: mov.userId,
        variantId: mov.variantId,
        adjustmentDocId: mov.adjustmentDocId,
        batchId: mov.batchId,
        userName: (mov as any).user?.name || 'Sistema',
        userEmail: (mov as any).user?.email || '',
        detailUrl,
        detailLabel
      };
    })
  );

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '2rem', gap: '1rem' }}>
        <Link href="/productos" style={{ textDecoration: 'none', color: 'var(--caanma-text-muted)', fontSize: '1.25rem' }}>← Volver</Link>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold' }}>
          {product.name} <span style={{ color: 'var(--caanma-text-muted)', fontSize: '1rem', fontWeight: 'normal' }}>({product.sku})</span>
        </h1>
        
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.75rem' }}>
           <Link href={`/productos/nuevo?cloneId=${product.id}`} style={{ padding: '0.5rem 1rem', backgroundColor: 'white', border: '1px solid var(--caanma-border)', borderRadius: '6px', fontWeight: 'bold', textDecoration: 'none', color: 'var(--caanma-text)' }}>
             Clonar
           </Link>
           {/* Note: since this is a server component, we pass the server action to a form. */}
           <form action={handleDelete}>
             <button type="submit" style={{ padding: '0.5rem 1rem', backgroundColor: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>
               Eliminar
             </button>
           </form>
        </div>
      </div>

      <ProductDetailClient 
        product={product} 
        movements={enrichedMovements} 
        sales={product.saleItems}
        variants={product.variants}
        batches={product.batches}
        siblingProducts={siblingProducts}
        tenantId={branch?.tenantId || undefined}
        mediaContent={
          <form action={updateProductWithId}>
            <input type="hidden" name="branchId" value={product.branchId} />
            <input type="hidden" name="name" value={product.name} />
            <input type="hidden" name="sku" value={product.sku} />
            
            <div className="card" style={{ marginBottom: '1.5rem', padding: '1.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', marginBottom: '1.25rem', borderBottom: '1px solid var(--caanma-border)', paddingBottom: '0.5rem' }}>Multimedia</h2>
              <ProductImageSection 
                initialImageUrl={product.imageUrl || ''}
                initialYoutubeUrl={product.youtubeUrl || ''}
                showYoutubeEmbed={true}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
              <button type="submit" className="btn-primary" style={{ padding: '0.75rem 2.5rem', fontSize: '1.1rem' }}>
                Guardar Multimedia
              </button>
            </div>
          </form>
        }
      >
        <form action={updateProductWithId}>
          <input type="hidden" name="branchId" value={product.branchId} />
          <input type="hidden" name="imageUrl" defaultValue={product.imageUrl || ''} id="details-imageUrl-input" />
          <input type="hidden" name="youtubeUrl" defaultValue={product.youtubeUrl || ''} id="details-youtubeUrl-input" />
          
          {/* Identificación */}
          <div className="card" style={{ marginBottom: '1.5rem', padding: '1.5rem' }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', borderBottom: '1px solid var(--caanma-border)', paddingBottom: '0.5rem' }}>Identificación</h2>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Nombre del Producto *</label>
                <input type="text" name="name" defaultValue={product.name} required style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--caanma-border)' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Categoría / Departamento</label>
                <input type="text" name="category" defaultValue={product.category || ''} placeholder="Ej. Abarrotes, Papelería..." style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--caanma-border)' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Marca</label>
                <input type="text" name="brand" defaultValue={product.brand || ''} placeholder="Ej. Coca Cola, BIC..." style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--caanma-border)' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>SKU (Código Interno) *</label>
                <input type="text" name="sku" defaultValue={product.sku} required style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--caanma-border)' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Código de Barras</label>
                <input type="text" name="barcode" defaultValue={product.barcode || ''} placeholder="(Opcional)" style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--caanma-border)' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Proveedor Sugerido</label>
                <select name="supplierId" defaultValue={product.supplierId || ""} style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--caanma-border)', backgroundColor: 'white' }}>
                  <option value="">-- PÚBLICO / NINGUNO --</option>
                  {suppliers.map((s: any) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div style={{ gridColumn: '1 / -1', display: 'flex', flexWrap: 'wrap', gap: '1rem 2rem', marginTop: '0.5rem', marginBottom: '0.5rem', backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '6px', border: '1px solid var(--caanma-border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input type="hidden" name="allowProduction" value="false" />
                  <input 
                    type="checkbox" 
                    id="allowProduction"
                    name="allowProduction" 
                    value="true"
                    defaultChecked={product.allowProduction || false} 
                    style={{ width: '20px', height: '20px', cursor: 'pointer' }} 
                  />
                  <label htmlFor="allowProduction" style={{ fontWeight: '500', cursor: 'pointer', fontSize: '0.95rem' }}>
                    🟢 Permitir Producir (Se puede fabricar con una fórmula)
                  </label>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input type="hidden" name="isProductionInput" value="false" />
                  <input 
                    type="checkbox" 
                    id="isProductionInput"
                    name="isProductionInput" 
                    value="true"
                    defaultChecked={product.isProductionInput || false} 
                    style={{ width: '20px', height: '20px', cursor: 'pointer' }} 
                  />
                  <label htmlFor="isProductionInput" style={{ fontWeight: '500', cursor: 'pointer', fontSize: '0.95rem' }}>
                    🧪 Insumo para Producción (Se puede usar como ingrediente)
                  </label>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input type="hidden" name="isService" value="false" />
                  <input 
                    type="checkbox" 
                    id="isService"
                    name="isService" 
                    value="true"
                    defaultChecked={product.isService || false} 
                    style={{ width: '20px', height: '20px', cursor: 'pointer' }} 
                  />
                  <label htmlFor="isService" style={{ fontWeight: '500', cursor: 'pointer', fontSize: '0.95rem' }}>
                    🛠️ Es un Servicio (No lleva stock y siempre disponible)
                  </label>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input type="hidden" name="showInWeb" value="false" />
                  <input 
                    type="checkbox" 
                    id="showInWeb"
                    name="showInWeb" 
                    value="true"
                    defaultChecked={(product as any).showInWeb} 
                    style={{ width: '20px', height: '20px', cursor: 'pointer' }} 
                  />
                  <label htmlFor="showInWeb" style={{ fontWeight: '500', cursor: 'pointer', fontSize: '0.95rem' }}>
                    🌐 Mostrar en Web (Sincronizar vía Token)
                  </label>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input type="hidden" name="hasTraceability" value="false" />
                  <input 
                    type="checkbox" 
                    id="hasTraceability"
                    name="hasTraceability" 
                    value="true"
                    defaultChecked={product.hasTraceability || false} 
                    style={{ width: '20px', height: '20px', cursor: 'pointer' }} 
                  />
                  <label htmlFor="hasTraceability" style={{ fontWeight: '500', cursor: 'pointer', fontSize: '0.95rem' }}>
                    ⛽ Trazabilidad de Combustible
                  </label>
                </div>
              </div>
              <div style={{ padding: '1rem', backgroundColor: '#f0fdf4', borderRadius: '4px', border: '1px dashed #22c55e', gridColumn: '1 / -1', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#166534' }}>Clave de Producto SAT (Product Key)</label>
                  <SatKeyAutocomplete defaultValue={product.satKey || ''} name="satKey" />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#166534' }}>Clave de Unidad SAT (Unit Key)</label>
                  <SatUnitAutocomplete defaultValue={product.satUnit || ''} name="satUnit" />
                </div>
                <p style={{ gridColumn: '1 / -1', margin: 0, fontSize: '0.85rem', color: '#166534' }}>* Estos campos son requeridos para facturar ventas de este artículo.</p>
              </div>
            </div>
            
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Descripción</label>
              <textarea name="description" defaultValue={product.description || ''} rows={3} style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--caanma-border)', fontFamily: 'inherit' }}></textarea>
            </div>
          </div>

          {/* Finanzas y Precios */}
          <div className="card" style={{ marginBottom: '1.5rem', padding: '1.5rem' }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', borderBottom: '1px solid var(--caanma-border)', paddingBottom: '0.5rem' }}>Finanzas y Precios</h2>
            <ProductFinanceSection 
              initialCost={product.cost}
              initialPrice={product.price}
              initialTaxRate={product.taxRate}
              initialWholesalePrice={product.wholesalePrice}
              initialSpecialPrice={product.specialPrice}
              priceLists={dynamicPriceLists}
              initialPrices={product.prices}
            />
          </div>

          {/* Inventario Fijo */}
          <div className="card" style={{ marginBottom: '2rem', padding: '1.5rem' }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', borderBottom: '1px solid var(--caanma-border)', paddingBottom: '0.5rem' }}>Configuración de Inventario</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Alarma Stock Mínimo</label>
                <input type="number" name="minStock" defaultValue={product.minStock} style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--caanma-border)' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Unidad de Medida</label>
                <select name="unit" defaultValue={product.unit} style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--caanma-border)', backgroundColor: 'white' }}>
                  <option value="Pza">Pieza (Pza)</option>
                  <option value="Kg">Kilogramos (Kg)</option>
                  <option value="Lt">Litros (Lt)</option>
                  <option value="Caja">Caja</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Estado</label>
                <select name="isActive" defaultValue={product.isActive ? "true" : "false"} style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--caanma-border)', backgroundColor: 'white' }}>
                  <option value="true">🟢 Activo</option>
                  <option value="false">🔴 Inactivo</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Fecha de Caducidad</label>
                <input type="date" name="expirationDate" defaultValue={product.expirationDate ? new Date(product.expirationDate).toISOString().slice(0, 10) : ''} style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--caanma-border)' }} />
              </div>
            </div>
            <p style={{ marginTop: '1rem', color: 'var(--caanma-text-muted)', fontSize: '0.875rem' }}>
              Nota: El stock físico general ({product.stock} {product.unit}) ya no se puede alterar directamente aquí. Para agregar o quitar unidades, utiliza la pestaña de Movimientos (Kardex).
            </p>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
            <Link href="/productos" style={{ padding: '0.75rem 1.5rem', border: '1px solid var(--caanma-border)', borderRadius: '4px', textDecoration: 'none', color: 'var(--caanma-text)', fontWeight: 'bold' }}>
              Cancelar
            </Link>
            <button type="submit" className="btn-primary" style={{ padding: '0.75rem 2.5rem', fontSize: '1.1rem' }}>
              Guardar Cambios
            </button>
          </div>
        </form>
      </ProductDetailClient>
    </div>
  );
}
