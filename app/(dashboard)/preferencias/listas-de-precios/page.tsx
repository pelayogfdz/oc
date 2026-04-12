import { getActiveBranch } from "@/app/actions/auth";
import { prisma } from "@/lib/prisma";
import { createPriceList, deletePriceList, updatePriceList } from "@/app/actions/price-list";
import { List, Plus, Trash2, Edit2, Info } from 'lucide-react';

export default async function PriceListsPage() {
  const branch = await getActiveBranch();
  const priceLists = await prisma.priceList.findMany({
    where: { branchId: branch.id },
    orderBy: { createdAt: 'asc' }
  });

  const remaining = 10 - priceLists.length;

  return (
    <div style={{ backgroundColor: 'white', borderRadius: '8px', padding: '2rem', border: '1px solid var(--pulpos-border)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', borderBottom: '1px solid var(--pulpos-border)', paddingBottom: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <List size={24} /> Listas de Precios Dinámicas
          </h2>
          <p style={{ color: 'var(--pulpos-text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Configura hasta 10 listas de precios personalizadas para tus clientes (ej. Público, Distribuidor, VIP).
          </p>
        </div>
        <div style={{ padding: '0.5rem 1rem', backgroundColor: remaining === 0 ? '#fee2e2' : '#f1f5f9', color: remaining === 0 ? '#ef4444' : 'var(--pulpos-text-muted)', borderRadius: '12px', fontSize: '0.875rem', fontWeight: 'bold' }}>
          {priceLists.length} / 10 activas
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {priceLists.map((list) => (
          <div key={list.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', border: '1px solid var(--pulpos-border)', borderRadius: '6px', backgroundColor: '#f8fafc' }}>
            <form action={updatePriceList} style={{ display: 'flex', flex: 1, alignItems: 'center', gap: '1rem' }}>
              <input type="hidden" name="id" value={list.id} />
              <input 
                type="text" 
                name="name" 
                defaultValue={list.name} 
                required
                style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--pulpos-border)', flex: 1, maxWidth: '300px' }}
              />
              <button type="submit" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', backgroundColor: 'transparent', border: '1px solid var(--pulpos-text-muted)', color: 'var(--pulpos-text)', borderRadius: '4px', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 'bold' }}>
                <Edit2 size={14} /> Guardar
              </button>
            </form>

            <form action={deletePriceList} style={{ marginLeft: '1rem' }}>
              <input type="hidden" name="id" value={list.id} />
              <button type="submit" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.5rem', backgroundColor: '#fee2e2', border: 'none', color: '#ef4444', borderRadius: '4px', cursor: 'pointer' }} title="Eliminar lista">
                <Trash2 size={18} />
              </button>
            </form>
          </div>
        ))}

        {priceLists.length === 0 && (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--pulpos-text-muted)', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px dashed var(--pulpos-border)' }}>
            No tienes listas de precios extras creadas. (Por defecto todos tienen Precio General).
          </div>
        )}

        {remaining > 0 && (
          <form action={createPriceList} style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', border: '1px dashed var(--pulpos-border)', borderRadius: '6px' }}>
            <input 
              type="text" 
              name="name" 
              placeholder="Nombre de la nueva lista (Ej. VIP)" 
              required
              style={{ padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--pulpos-border)', flex: 1 }}
            />
            <button className="btn-primary" type="submit" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Plus size={18} /> Crear Lista
            </button>
          </form>
        )}

        {remaining === 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '1rem', backgroundColor: '#fff7ed', color: '#c2410c', borderRadius: '6px', fontSize: '0.875rem' }}>
            <Info size={18} /> Has alcanzado el límite máximo de 10 listas de precios.
          </div>
        )}
      </div>
    </div>
  );
}
