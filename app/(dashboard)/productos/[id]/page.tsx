import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ProductDetailClient } from "./ProductDetailClient";
import { updateProduct, deleteProduct } from "@/app/actions/product";
import { Image as ImageIcon } from 'lucide-react';

export default async function ProductDetailPage({ params }: { params: { id: string } }) {
  const { id } = await params;
  
  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      inventoryMovements: {
        orderBy: { createdAt: 'desc' }
      },
      saleItems: {
        orderBy: { sale: { createdAt: 'desc' } },
        include: { sale: true }
      },
      variants: {
        orderBy: { attribute: 'asc' }
      }
    }
  });

  if (!product) return notFound();

  const suppliers = await prisma.supplier.findMany({
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

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '2rem', gap: '1rem' }}>
        <Link href="/productos" style={{ textDecoration: 'none', color: 'var(--pulpos-text-muted)', fontSize: '1.25rem' }}>← Volver</Link>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold' }}>
          {product.name} <span style={{ color: 'var(--pulpos-text-muted)', fontSize: '1rem', fontWeight: 'normal' }}>({product.sku})</span>
        </h1>
        
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.75rem' }}>
           <Link href={`/productos/nuevo?cloneId=${product.id}`} style={{ padding: '0.5rem 1rem', backgroundColor: 'white', border: '1px solid var(--pulpos-border)', borderRadius: '6px', fontWeight: 'bold', textDecoration: 'none', color: 'var(--pulpos-text)' }}>
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
        movements={product.inventoryMovements} 
        sales={product.saleItems}
        variants={product.variants}
        siblingProducts={siblingProducts}
        mediaContent={
          <form action={updateProductWithId}>
            <input type="hidden" name="branchId" value={product.branchId} />
            <input type="hidden" name="name" value={product.name} />
            <input type="hidden" name="sku" value={product.sku} />
            
            <div className="card" style={{ marginBottom: '1.5rem', padding: '1.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', borderBottom: '1px solid var(--pulpos-border)', paddingBottom: '0.5rem' }}>Multimedia</h2>
              <div style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start' }}>
                <div style={{ width: '100px', height: '100px', backgroundColor: '#f8fafc', border: '2px dashed #cbd5e1', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', overflow: 'hidden' }}>
                  {product.imageUrl ? <img src={product.imageUrl} style={{width: '100%', height: '100%', objectFit: 'cover'}} alt={product.name}/> : <ImageIcon size={32} />}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ color: 'var(--pulpos-text-muted)', fontSize: '0.875rem', marginBottom: '1rem' }}>Ingresa la URL de la miniatura para visualizarla en el POS, y opcionalmente un video reseña de YouTube.</p>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', fontSize: '0.85rem' }}>Imagen URL</label>
                  <input type="url" name="imageUrl" defaultValue={product.imageUrl || ''} placeholder="https://ejemplo.com/foto.jpg" style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--pulpos-border)', marginBottom: '1rem' }} />

                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', fontSize: '0.85rem' }}>YouTube Video URL</label>
                  <input type="url" name="youtubeUrl" defaultValue={product.youtubeUrl || ''} placeholder="https://www.youtube.com/watch?v=..." style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--pulpos-border)' }} />
                </div>
              </div>
              {product.youtubeUrl && (
                 <div style={{ marginTop: '1.5rem', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--pulpos-border)', backgroundColor: '#000', position: 'relative', paddingTop: '56.25%' }}>
                   <iframe 
                     src={product.youtubeUrl.replace('watch?v=', 'embed/')} 
                     style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }} 
                     allowFullScreen 
                     allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                   ></iframe>
                 </div>
              )}
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
          
          {/* Identificación */}
          <div className="card" style={{ marginBottom: '1.5rem', padding: '1.5rem' }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', borderBottom: '1px solid var(--pulpos-border)', paddingBottom: '0.5rem' }}>Identificación</h2>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '1.5rem', marginBottom: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Nombre del Producto *</label>
                <input type="text" name="name" defaultValue={product.name} required style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--pulpos-border)' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Categoría / Departamento</label>
                <input type="text" name="category" defaultValue={product.category || ''} placeholder="Ej. Abarrotes, Papelería..." style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--pulpos-border)' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Marca</label>
                <input type="text" name="brand" defaultValue={product.brand || ''} placeholder="Ej. Coca Cola, BIC..." style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--pulpos-border)' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>SKU (Código Interno) *</label>
                <input type="text" name="sku" defaultValue={product.sku} required style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--pulpos-border)' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Código de Barras</label>
                <input type="text" name="barcode" defaultValue={product.barcode || ''} placeholder="(Opcional)" style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--pulpos-border)' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Proveedor Sugerido</label>
                <select name="supplierId" defaultValue={product.supplierId || ""} style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--pulpos-border)', backgroundColor: 'white' }}>
                  <option value="">-- PÚBLICO / NINGUNO --</option>
                  {suppliers.map((s: any) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            </div>
            
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Descripción</label>
              <textarea name="description" defaultValue={product.description || ''} rows={3} style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--pulpos-border)', fontFamily: 'inherit' }}></textarea>
            </div>
          </div>

          {/* Finanzas y Precios */}
          <div className="card" style={{ marginBottom: '1.5rem', padding: '1.5rem' }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', borderBottom: '1px solid var(--pulpos-border)', paddingBottom: '0.5rem' }}>Finanzas y Precios</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr) minmax(0,1fr) minmax(0,1fr)', gap: '1.5rem', marginBottom: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Costo de Reposición ($)</label>
                <input type="number" step="0.01" name="cost" defaultValue={product.cost} style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--pulpos-border)' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: 'var(--pulpos-text-muted)' }}>Costo Promedio ($)</label>
                <input type="number" step="0.01" name="averageCost" defaultValue={product.averageCost || 0} readOnly title="Calculado ponderadamente según historial de compras" style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--pulpos-border)', backgroundColor: '#f3f4f6', cursor: 'not-allowed', color: 'var(--pulpos-text-muted)' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Precio Público normal ($) *</label>
                <input type="number" step="0.01" name="price" defaultValue={product.price} required style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--pulpos-border)' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Impuesto / IVA (%)</label>
                <input type="number" step="0.01" name="taxRate" defaultValue={product.taxRate} style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--pulpos-border)' }} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr) minmax(0,1fr)', gap: '1.5rem' }}>
              <div></div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: 'var(--pulpos-text-muted)' }}>Precio Mayoreo ($)</label>
                <input type="number" step="0.01" name="wholesalePrice" defaultValue={product.wholesalePrice || ''} placeholder="Opcional" style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--pulpos-border)' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: 'var(--pulpos-text-muted)' }}>Precio Especial ($)</label>
                <input type="number" step="0.01" name="specialPrice" defaultValue={product.specialPrice || ''} placeholder="Opcional" style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--pulpos-border)' }} />
              </div>
            </div>
          </div>

          {/* Inventario Fijo */}
          <div className="card" style={{ marginBottom: '2rem', padding: '1.5rem' }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', borderBottom: '1px solid var(--pulpos-border)', paddingBottom: '0.5rem' }}>Configuración de Inventario</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Alarma Stock Mínimo</label>
                <input type="number" name="minStock" defaultValue={product.minStock} style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--pulpos-border)' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Unidad de Medida</label>
                <select name="unit" defaultValue={product.unit} style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--pulpos-border)', backgroundColor: 'white' }}>
                  <option value="Pza">Pieza (Pza)</option>
                  <option value="Kg">Kilogramos (Kg)</option>
                  <option value="Lt">Litros (Lt)</option>
                  <option value="Caja">Caja</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Estado</label>
                <select name="isActive" defaultValue={product.isActive ? "true" : "false"} style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--pulpos-border)', backgroundColor: 'white' }}>
                  <option value="true">🟢 Activo</option>
                  <option value="false">🔴 Inactivo</option>
                </select>
              </div>
            </div>
            <p style={{ marginTop: '1rem', color: 'var(--pulpos-text-muted)', fontSize: '0.875rem' }}>
              Nota: El stock físico general ({product.stock} {product.unit}) ya no se puede alterar directamente aquí. Para agregar o quitar unidades, utiliza la pestaña de Movimientos (Kardex).
            </p>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
            <Link href="/productos" style={{ padding: '0.75rem 1.5rem', border: '1px solid var(--pulpos-border)', borderRadius: '4px', textDecoration: 'none', color: 'var(--pulpos-text)', fontWeight: 'bold' }}>
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
