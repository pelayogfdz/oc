import { Suspense } from 'react';
import { getActiveBranch } from "@/app/actions/auth";
import { prisma } from "@/lib/prisma";
import { getBranchSettings } from "@/app/actions/settings";
import POSClient from "./POSClient";
import { getCurrentSession } from "@/app/actions/caja";
import { Lock, ArrowRight } from 'lucide-react';
import Link from "next/link";

export const dynamic = 'force-dynamic';

export default async function NuevaVentaPage() {
  const branch = await getActiveBranch();
  
  if (branch?.id === 'GLOBAL') {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', backgroundColor: '#fee2e2', borderRadius: '12px', color: '#991b1b', border: '1px solid #f87171', margin: '2rem auto', maxWidth: '600px' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>VISTA GLOBAL ACTIVA</h2>
        <p>No se puede utilizar el Punto de Venta en modo "Todas las Sucursales".<br/>Por favor, selecciona una sucursal específica en el selector de arriba para poder registrar una venta.</p>
      </div>
    );
  }
  
  const products = await prisma.product.findMany({
    where: { branchId: branch?.id || '', isActive: true },
    include: { variants: true, prices: true },
    orderBy: { name: 'asc' },
    take: 50
  });

  const customers = await prisma.customer.findMany({
    where: { branchId: branch?.id || '' },
    orderBy: { name: 'asc' }
  });

  const promotions = await prisma.promotion.findMany({
    where: { branchId: branch?.id || '', active: true }
  });

  const dynamicPriceLists = await prisma.priceList.findMany({
    where: { branchId: branch?.id || '' }
  });

  const pendingQuotes = await prisma.quote.findMany({
    where: { branchId: branch?.id || '', status: 'PENDING' },
    orderBy: { createdAt: 'desc' },
    take: 20
  });

  const session = await getCurrentSession();

  const settings = await getBranchSettings();
  let ticketConfig = {};
  let metodosConfig = {};
  let ventasConfig: any = {};
  let impresorasConfig = {};
  if (settings.configJson) {
    try {
      const parsed = JSON.parse(settings.configJson);
      ticketConfig = parsed.tickets || {};
      metodosConfig = parsed.metodos || {};
      ventasConfig = parsed.ventas || {};
      impresorasConfig = parsed.impresoras || {};
    } catch(e) {}
  }

  return (
    <div style={{ position: 'relative' }}>
      {/* Título removido, ahora está en el header */}
      
      {!session && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(255,255,255,0.9)', zIndex: 50, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', borderRadius: '12px' }}>
          <Lock size={64} color="#ef4444" style={{ marginBottom: '1.5rem' }} />
          <h2 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '1rem', color: '#1e293b' }}>Caja Cerrada</h2>
          <p style={{ color: 'var(--pulpos-text-muted)', fontSize: '1.1rem', marginBottom: '2rem', textAlign: 'center', maxWidth: '400px' }}>
            No puedes procesar ventas en este momento. Debes realizar la apertura de turno y declarar tu fondo inicial.
          </p>
          <Link href="/caja/actual" className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '1.25rem', padding: '1rem 2rem', textDecoration: 'none' }}>
            Abrir Caja Ahora <ArrowRight size={20} />
          </Link>
        </div>
      )}

      {/* Solo mostramos el POS pero si no hay sesión estara opacado */}
      <div style={{ filter: !session ? 'blur(8px) grayscale(100%)' : 'none', pointerEvents: !session ? 'none' : 'auto', transition: 'all 0.3s' }}>
        {session && (
          <Suspense fallback={<div>Cargando Caja...</div>}>
            <POSClient 
              products={products} 
              customers={customers} 
              promotions={promotions}
              dynamicPriceLists={dynamicPriceLists}
              pendingQuotes={pendingQuotes}
              sessionId={session.id} 
              branchId={branch?.id || ''} 
              ticketConfig={ticketConfig} 
              metodosConfig={metodosConfig}
              ventasConfig={ventasConfig}
              impresorasConfig={impresorasConfig}
            />
          </Suspense>
        )}
      </div>
    </div>
  );
}
