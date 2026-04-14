import { getActiveBranch } from "@/app/actions/auth";
import { prisma } from "@/lib/prisma";
import { Store, Plus, MapPin, Trash2 } from 'lucide-react';
import { revalidatePath } from "next/cache";

async function createBranch(formData: FormData) {
  'use server';
  const name = formData.get('name') as string;
  const location = formData.get('location') as string;
  
  await prisma.branch.create({
    data: {
      name,
      location,
      settings: {
        create: {
          taxIVA: 16.0,
          currencySymbol: '$',
          autoCloseCash: false
        }
      }
    }
  });
  
  revalidatePath('/preferencias/sucursales');
}

import BranchClient from './BranchClient';

export default async function SucursalesPage() {
  const currentBranch = await getActiveBranch();
  // An ADMIN should view all branches across the company. Since MVP implies 1 tenant, we query all.
  const branches = await prisma.branch.findMany({
    where: { isActive: true },
    include: { 
      _count: { select: { users: true, products: true } },
      settings: true
    }
  });

  return (
    <div style={{ backgroundColor: 'white', borderRadius: '8px', padding: '2rem', border: '1px solid var(--pulpos-border)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', borderBottom: '1px solid var(--pulpos-border)', paddingBottom: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Store size={24} /> Sucursales y Almacenes
          </h2>
          <p style={{ color: 'var(--pulpos-text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Gestiona tus puntos de venta físicos o centros de distribución/almacén.
          </p>
        </div>
      </div>

      <BranchClient branches={branches} currentBranchId={currentBranch?.id || ''} />

      <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem' }}>Aperturar Nueva Sucursal</h3>
      <form action={createBranch} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', backgroundColor: '#f8fafc', padding: '1.5rem', borderRadius: '8px', border: '1px dashed var(--pulpos-border)' }}>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Nombre de la Sucursal (Ej. SUC Norte 1)</label>
          <input type="text" name="name" required style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--pulpos-border)' }} />
        </div>
        <div style={{ flex: 2 }}>
          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Ubicación / Dirección Corta</label>
          <input type="text" name="location" required style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--pulpos-border)' }} />
        </div>
        <button type="submit" className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', height: '42px' }}>
          <Plus size={18} /> Crear Locación
        </button>
      </form>
    </div>
  );
}
