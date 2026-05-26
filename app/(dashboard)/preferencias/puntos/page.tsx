import { getActiveBranch } from "@/app/actions/auth";
import { getLoyaltySettings } from "@/app/actions/loyalty";
import { prisma } from "@/lib/prisma";
import PuntosConfigClient from "./PuntosConfigClient";

export const dynamic = 'force-dynamic';

export default async function PuntosPage() {
  const activeBranch = await getActiveBranch();
  if (!activeBranch || activeBranch.id === 'GLOBAL') {
    return (
      <div style={{ padding: '2rem', backgroundColor: 'white', borderRadius: '8px', border: '1px solid var(--pulpos-border)' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>Fidelización y Puntos</h2>
        <p style={{ color: 'var(--pulpos-text-muted)' }}>Por favor selecciona una sucursal específica para configurar el motor de fidelización.</p>
      </div>
    );
  }

  // Load active settings
  const settingsResult = await getLoyaltySettings(activeBranch.id);
  const settings = settingsResult.settings || null;

  // Load recent transactions (last 20 for history tab)
  const recentTransactions = await prisma.loyaltyTransaction.findMany({
    take: 20,
    orderBy: { createdAt: 'desc' },
    include: {
      customer: {
        select: {
          name: true,
          email: true,
          phone: true
        }
      }
    }
  });

  return (
    <PuntosConfigClient 
      branch={activeBranch} 
      initialSettings={settings} 
      recentTransactions={recentTransactions as any}
    />
  );
}
