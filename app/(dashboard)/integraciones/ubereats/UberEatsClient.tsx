'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Save,
  Trash2,
  RefreshCw,
  Copy,
  Check,
  Zap,
  ShoppingBag,
  ExternalLink,
  Plus,
  Unlink,
  CheckCircle,
  AlertCircle,
  Store,
  Printer,
  FileText,
  Clock,
  MapPin,
  Phone,
  ShieldCheck
} from 'lucide-react';
import {
  saveUberEatsConfig,
  deleteIntegration,
  mapProductToUberEats,
  unmapProductFromUberEats,
  batchMapCatalogToUberEats,
  simulateUberStockChangeEvent,
  toggleUberInventorySync
} from '@/app/actions/integration';
import { formatCurrency } from '@/lib/utils';

interface ProductItem {
  id: string;
  name: string;
  sku: string;
  price: number;
  stock: number;
}

interface MappedProductItem {
  id: string;
  externalId: string;
  syncStatus: string;
  lastSync: string;
  product: {
    id: string;
    name: string;
    sku: string;
    price: number;
    stock: number;
  };
}

interface BranchItem {
  id: string;
  name: string;
}

interface UberOrderSummary {
  id: string;
  folio: string;
  total: number;
  createdAt: string;
  branchName: string;
  customerName: string;
  customerPhone?: string | null;
  notes: string;
  itemsCount: number;
  items: {
    id: string;
    name: string;
    quantity: number;
    price: number;
  }[];
}

interface UberEatsClientProps {
  integration: any;
  allIntegrations: any[];
  branch: BranchItem;
  tenantBranches: BranchItem[];
  mappedProducts: MappedProductItem[];
  availableProducts: ProductItem[];
  recentOrders: UberOrderSummary[];
  webhookUrl: string;
  isGlobal: boolean;
  initialBranchId?: string;
  initialTab?: 'orders' | 'config' | 'mapping' | 'testing';
}

export default function UberEatsClient({
  integration,
  allIntegrations,
  branch,
  tenantBranches,
  mappedProducts,
  availableProducts,
  recentOrders,
  webhookUrl,
  isGlobal,
  initialBranchId,
  initialTab
}: UberEatsClientProps) {
  const [activeTab, setActiveTab] = useState<'orders' | 'config' | 'mapping' | 'testing'>(
    initialTab || (initialBranchId ? 'config' : 'orders')
  );
  const [copiedWebhook, setCopiedWebhook] = useState(false);
  
  // Branch selected for editing config
  const [selectedBranchId, setSelectedBranchId] = useState<string>(
    initialBranchId || (branch.id !== 'GLOBAL' ? branch.id : (allIntegrations[0]?.branchId || tenantBranches[0]?.id || ''))
  );

  // Connection & Testing states
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionResult, setConnectionResult] = useState<any>(null);
  const [syncingStock, setSyncingStock] = useState(false);
  const [syncResult, setSyncResult] = useState<any>(null);
  const [simulatingOrder, setSimulatingOrder] = useState(false);
  const [simulationResult, setSimulationResult] = useState<any>(null);
  const [simulationBranchId, setSimulationBranchId] = useState<string>(
    branch.id !== 'GLOBAL' ? branch.id : (allIntegrations[0]?.branchId || tenantBranches[0]?.id || '')
  );

  // New mapping modal state
  const [selectedProductId, setSelectedProductId] = useState('');
  const [customExternalId, setCustomExternalId] = useState('');
  const [isMapping, setIsMapping] = useState(false);
  const [isBatchMapping, setIsBatchMapping] = useState(false);
  const [batchMapMessage, setBatchMapMessage] = useState<string | null>(null);
  const [mirrorTestingId, setMirrorTestingId] = useState<string | null>(null);
  const [mirrorProductId, setMirrorProductId] = useState<string>('');
  const [mirrorNewStock, setMirrorNewStock] = useState<number>(0);
  const [mirrorSimulationResult, setMirrorSimulationResult] = useState<any>(null);
  const [isSimulatingMirrorStock, setIsSimulatingMirrorStock] = useState<boolean>(false);

  // Find active integration for selected branch
  const activeIntegration = allIntegrations.find(i => i.branchId === selectedBranchId) || integration;
  const meta = activeIntegration?.metadata ? JSON.parse(activeIntegration.metadata) : {};
  const isSandbox = Boolean(meta.isSandbox);
  const isInventoryLiveSync = Boolean(meta.syncInventoryEnabled);
  const currentStoreId = meta.storeId || activeIntegration?.accessToken || '';

  const handleCopyWebhook = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopiedWebhook(true);
    setTimeout(() => setCopiedWebhook(false), 2500);
  };

  const handleTestConnection = async () => {
    setTestingConnection(true);
    setConnectionResult(null);
    try {
      const res = await fetch('/api/ubereats/sync', { method: 'GET' });
      const data = await res.json();
      setConnectionResult(data);
    } catch (err: any) {
      setConnectionResult({ connected: false, error: err.message || 'Error de red' });
    } finally {
      setTestingConnection(false);
    }
  };

  const handleSyncStock = async () => {
    setSyncingStock(true);
    setSyncResult(null);
    try {
      const res = await fetch('/api/ubereats/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ branchId: simulationBranchId })
      });
      const data = await res.json();
      setSyncResult(data);
    } catch (err: any) {
      setSyncResult({ error: err.message });
    } finally {
      setSyncingStock(false);
    }
  };

  const handleSimulateOrder = async () => {
    setSimulatingOrder(true);
    setSimulationResult(null);
    try {
      const res = await fetch('/api/ubereats/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ simulateTestOrder: true, branchId: simulationBranchId })
      });
      const data = await res.json();
      setSimulationResult(data);

      // Reproducir sonido de campana de venta
      try {
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-600.wav');
        audio.volume = 0.5;
        audio.play().catch(() => {});
      } catch (e) {}

    } catch (err: any) {
      setSimulationResult({ error: err.message });
    } finally {
      setSimulatingOrder(false);
    }
  };

  const handleCreateMapping = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId || !customExternalId) return;
    setIsMapping(true);
    try {
      await mapProductToUberEats(selectedProductId, customExternalId);
      setSelectedProductId('');
      setCustomExternalId('');
      window.location.reload();
    } catch (err: any) {
      alert(err.message || 'Error al emparejar producto');
    } finally {
      setIsMapping(false);
    }
  };

  const handleBatchMap = async () => {
    setIsBatchMapping(true);
    setBatchMapMessage(null);
    try {
      const res = await batchMapCatalogToUberEats(selectedBranchId);
      if (res.success) {
        setBatchMapMessage(`¡Catálogo de CAANMA cargado con éxito! Se sincronizaron ${res.totalProducts} productos (${res.newlyMapped} nuevos vinculados al espejo de inventario).`);
        setTimeout(() => window.location.reload(), 1500);
      }
    } catch (e: any) {
      alert('Error al cargar catálogo de CAANMA: ' + e.message);
    } finally {
      setIsBatchMapping(false);
    }
  };

  const handleSimulateStockChange = async (productId: string, newStock: number) => {
    setMirrorTestingId(productId);
    try {
      const res = await simulateUberStockChangeEvent(productId, newStock);
      if (res.success) {
        alert(`✅ Simulación de Inventario Ejecutada:\n\nProducto: ${res.productName}\nNuevo Stock en CAANMA: ${res.stock} pzas\nEstado Espejo en Uber Eats: ${res.isOutOfStock ? '🔴 Agotado / Suspendido' : '🟢 Disponible (En Stock)'}\n\n(Modo de simulación seguro activo - Sin llamadas a producción)`);
        window.location.reload();
      }
    } catch (e: any) {
      alert('Error en simulación: ' + e.message);
    } finally {
      setMirrorTestingId(null);
    }
  };

  const handleMirrorInteractiveTest = async () => {
    if (!mirrorProductId) {
      alert('Por favor selecciona un producto para simular');
      return;
    }
    setIsSimulatingMirrorStock(true);
    setMirrorSimulationResult(null);
    try {
      const res = await simulateUberStockChangeEvent(mirrorProductId, Number(mirrorNewStock));
      setMirrorSimulationResult(res);
    } catch (err: any) {
      setMirrorSimulationResult({ error: err.message });
    } finally {
      setIsSimulatingMirrorStock(false);
    }
  };

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
      {/* Navigation Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--caanma-border)', marginBottom: '2rem', overflowX: 'auto' }}>
        <button
          onClick={() => setActiveTab('orders')}
          style={{
            padding: '0.75rem 1.25rem',
            border: 'none',
            background: 'none',
            fontWeight: activeTab === 'orders' ? 'bold' : 'normal',
            color: activeTab === 'orders' ? '#06C167' : 'inherit',
            borderBottom: activeTab === 'orders' ? '3px solid #06C167' : '3px solid transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            whiteSpace: 'nowrap'
          }}
        >
          <span>🛵</span> Órdenes Uber Eats ({recentOrders.length})
        </button>

        <button
          onClick={() => setActiveTab('config')}
          style={{
            padding: '0.75rem 1.25rem',
            border: 'none',
            background: 'none',
            fontWeight: activeTab === 'config' ? 'bold' : 'normal',
            color: activeTab === 'config' ? '#06C167' : 'inherit',
            borderBottom: activeTab === 'config' ? '3px solid #06C167' : '3px solid transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            whiteSpace: 'nowrap'
          }}
        >
          <span>⚙️</span> Sucursales & Credenciales ({allIntegrations.length})
        </button>

        <button
          onClick={() => setActiveTab('mapping')}
          style={{
            padding: '0.75rem 1.25rem',
            border: 'none',
            background: 'none',
            fontWeight: activeTab === 'mapping' ? 'bold' : 'normal',
            color: activeTab === 'mapping' ? '#06C167' : 'inherit',
            borderBottom: activeTab === 'mapping' ? '3px solid #06C167' : '3px solid transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            whiteSpace: 'nowrap'
          }}
        >
          <span>📦</span> Espejo de Inventarios & SKUs ({mappedProducts.length})
        </button>

        <button
          onClick={() => setActiveTab('testing')}
          style={{
            padding: '0.75rem 1.25rem',
            border: 'none',
            background: 'none',
            fontWeight: activeTab === 'testing' ? 'bold' : 'normal',
            color: activeTab === 'testing' ? '#06C167' : 'inherit',
            borderBottom: activeTab === 'testing' ? '3px solid #06C167' : '3px solid transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            whiteSpace: 'nowrap'
          }}
        >
          <span>🧪</span> Pruebas & Simulación
        </button>
      </div>

      {/* TAB 0: ORDERS MANAGEMENT */}
      {activeTab === 'orders' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div className="card" style={{ padding: '1.5rem', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '50%', backgroundColor: '#06C167', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '1.25rem' }}>
                🛵
              </div>
              <div>
                <h3 style={{ margin: 0, fontWeight: 'bold', fontSize: '1.05rem', color: '#166534' }}>
                  Sincronización Automática de Pedidos con Uber Eats
                </h3>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#15803d' }}>
                  Cuando un cliente realiza una compra en la app de Uber Eats, se crea automáticamente la venta en Caanma, se descuenta el stock en la sucursal correspondiente y suena la campana de alerta.
                </p>
              </div>
            </div>
            <button
              onClick={() => setActiveTab('testing')}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#06C167',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                fontWeight: 'bold',
                fontSize: '0.85rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem'
              }}
            >
              <Zap size={15} /> Probar Pedido Simulado
            </button>
          </div>

          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--caanma-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 'bold', margin: 0 }}>
                Historial de Pedidos de Uber Eats ({recentOrders.length})
              </h2>
              <span style={{ fontSize: '0.8rem', color: 'var(--caanma-text-muted)' }}>
                Últimos 30 pedidos recibidos
              </span>
            </div>

            {recentOrders.length === 0 ? (
              <div style={{ padding: '4rem 2rem', textAlign: 'center' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🛵</div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                  No hay pedidos de Uber Eats registrados aún
                </h3>
                <p style={{ color: 'var(--caanma-text-muted)', fontSize: '0.875rem', maxWidth: '500px', margin: '0 auto 1.5rem auto' }}>
                  Los pedidos se sincronizan en milisegundos mediante el Webhook de Uber Eats. Puedes probar el flujo ahora mismo simulando un pedido de prueba.
                </p>
                <button
                  onClick={() => setActiveTab('testing')}
                  style={{
                    padding: '0.65rem 1.25rem',
                    backgroundColor: '#06C167',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    fontWeight: 'bold',
                    cursor: 'pointer'
                  }}
                >
                  Ir a Simulación de Pedido
                </button>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid var(--caanma-border)' }}>
                      <th style={{ padding: '0.75rem 1rem' }}>Fecha / Hora</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Folio / ID</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Sucursal Asignada</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Comprador</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Artículos</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Total</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentOrders.map(order => (
                      <tr key={order.id} style={{ borderBottom: '1px solid var(--caanma-border)' }}>
                        <td style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap', color: 'var(--caanma-text-muted)' }}>
                          {new Date(order.createdAt).toLocaleString('es-MX', {
                            dateStyle: 'short',
                            timeStyle: 'short'
                          })}
                        </td>
                        <td style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap' }}>
                          <span style={{ backgroundColor: '#e6fcf0', color: '#06C167', padding: '0.2rem 0.5rem', borderRadius: '4px', fontWeight: 'bold', fontFamily: 'monospace' }}>
                            {order.folio}
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap' }}>
                          <span style={{ backgroundColor: '#f1f5f9', color: '#334155', padding: '0.2rem 0.6rem', borderRadius: '999px', fontSize: '0.78rem', fontWeight: 'bold', border: '1px solid #e2e8f0' }}>
                            🏢 {order.branchName}
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <div style={{ fontWeight: '600' }}>{order.customerName}</div>
                          {order.customerPhone && (
                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{order.customerPhone}</div>
                          )}
                        </td>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <span style={{ fontWeight: '600' }}>{order.itemsCount} uds.</span>
                          <div style={{ fontSize: '0.75rem', color: '#64748b', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {order.items.map(it => `${it.quantity}x ${it.name}`).join(', ')}
                          </div>
                        </td>
                        <td style={{ padding: '0.75rem 1rem', fontWeight: 'bold', color: '#16a34a', whiteSpace: 'nowrap' }}>
                          {formatCurrency(order.total)}
                        </td>
                        <td style={{ padding: '0.75rem 1rem', textAlign: 'right', whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                            <Link
                              href={`/ventas/detalle/${order.id}`}
                              style={{
                                padding: '0.35rem 0.65rem',
                                backgroundColor: '#f1f5f9',
                                color: '#334155',
                                borderRadius: '4px',
                                textDecoration: 'none',
                                fontWeight: '600',
                                fontSize: '0.75rem',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.25rem',
                                border: '1px solid #cbd5e1'
                              }}
                            >
                              <FileText size={13} /> Detalle
                            </Link>
                            <a
                              href={`/ventas/detalle/${order.id}/imprimir-ticket`}
                              target="_blank"
                              rel="noreferrer"
                              style={{
                                padding: '0.35rem 0.65rem',
                                backgroundColor: '#06C167',
                                color: '#fff',
                                borderRadius: '4px',
                                textDecoration: 'none',
                                fontWeight: '600',
                                fontSize: '0.75rem',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.25rem'
                              }}
                            >
                              <Printer size={13} /> Ticket
                            </a>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 1: SUCURSALES & CREDENCIALES */}
      {activeTab === 'config' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* Sucursales Conectadas Resumen */}
          <div className="card" style={{ padding: '1.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--caanma-border)', paddingBottom: '0.75rem' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Store size={22} color="#06C167" /> Sucursales Vinculadas con Uber Eats ({allIntegrations.length})
                </h2>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: 'var(--caanma-text-muted)' }}>
                  Cada sucursal física de Pizca de Azúcar está vinculada con su ID de tienda (Store UUID) correspondiente en Uber Eats.
                </p>
              </div>
              <span style={{ fontSize: '0.8rem', fontWeight: 'bold', backgroundColor: '#e6fcf0', color: '#06C167', padding: '0.3rem 0.75rem', borderRadius: '999px' }}>
                ● 100% Configurado
              </span>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid var(--caanma-border)' }}>
                    <th style={{ padding: '0.75rem 1rem' }}>Sucursal Física</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Uber Eats Store UUID</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Estado</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {tenantBranches.map(tb => {
                    const intRec = allIntegrations.find(i => i.branchId === tb.id);
                    const intMeta = intRec?.metadata ? JSON.parse(intRec.metadata) : {};
                    const isSelected = selectedBranchId === tb.id;
                    return (
                      <tr key={tb.id} style={{ borderBottom: '1px solid var(--caanma-border)', backgroundColor: isSelected ? '#f0fdf4' : 'transparent' }}>
                        <td style={{ padding: '0.75rem 1rem', fontWeight: 'bold' }}>
                          🏢 {tb.name} {isSelected && <span style={{ fontSize: '0.75rem', color: '#06C167', marginLeft: '0.5rem' }}>(Seleccionada abajo)</span>}
                        </td>
                        <td style={{ padding: '0.75rem 1rem', fontFamily: 'monospace', fontSize: '0.82rem', color: '#334155' }}>
                          {intMeta.storeId || intRec?.accessToken || <span style={{ color: '#94a3b8' }}>Sin asignar</span>}
                        </td>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <span style={{
                            fontSize: '0.75rem',
                            fontWeight: 'bold',
                            padding: '0.2rem 0.55rem',
                            borderRadius: '999px',
                            backgroundColor: intRec?.isActive ? '#e6fcf0' : '#fef2f2',
                            color: intRec?.isActive ? '#06C167' : '#ef4444'
                          }}>
                            {intRec?.isActive ? '● CONECTADO' : '○ NO VINCULADO'}
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                          <button
                            type="button"
                            onClick={() => setSelectedBranchId(tb.id)}
                            style={{
                              padding: '0.35rem 0.75rem',
                              backgroundColor: isSelected ? '#06C167' : '#f1f5f9',
                              color: isSelected ? '#fff' : '#334155',
                              border: isSelected ? 'none' : '1px solid #cbd5e1',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontWeight: 'bold',
                              fontSize: '0.8rem'
                            }}
                          >
                            {isSelected ? 'Editando' : 'Editar Datos'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Formulario de Configuración de la Sucursal Seleccionada */}
          <div className="card" style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--caanma-border)', paddingBottom: '0.5rem' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: 0 }}>
                  Credenciales de la API para: {tenantBranches.find(b => b.id === selectedBranchId)?.name || branch.name}
                </h2>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: 'var(--caanma-text-muted)' }}>
                  Credenciales extraídas del portal de desarrolladores de Uber Eats (App: CAANMA POS Pizca).
                </p>
              </div>
              <span style={{
                fontSize: '0.8rem',
                fontWeight: 'bold',
                padding: '0.25rem 0.75rem',
                borderRadius: '20px',
                backgroundColor: activeIntegration?.isActive ? '#e6fcf0' : '#f1f5f9',
                color: activeIntegration?.isActive ? '#06C167' : '#64748b'
              }}>
                {activeIntegration?.isActive ? '● Canal Activo' : '○ No Conectado'}
              </span>
            </div>

            <form action={saveUberEatsConfig} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <input type="hidden" name="branchId" value={selectedBranchId} />
              <input type="hidden" name="platform" value="UBER_EATS" />

              <div>
                <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.35rem', fontSize: '0.9rem' }}>
                  Sucursal Física de Destino:
                </label>
                <select
                  value={selectedBranchId}
                  onChange={e => setSelectedBranchId(e.target.value)}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--caanma-border)', fontWeight: 'bold' }}
                >
                  {tenantBranches.map(tb => (
                    <option key={tb.id} value={tb.id}>
                      🏢 {tb.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.35rem', fontSize: '0.9rem' }}>
                  Client ID (Application ID de Uber Developers) *
                </label>
                <input
                  type="text"
                  name="appId"
                  required
                  defaultValue={activeIntegration?.appId || 'lxKqN-mO6jRMfLf3UoyTDuuBplQQkao9'}
                  placeholder="Ej. lxKqN-mO6jRMfLf3UoyTDuuBplQQkao9"
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--caanma-border)', fontFamily: 'monospace' }}
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--caanma-text-muted)' }}>
                  Client ID de la aplicación creada en developer.uber.com.
                </span>
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.35rem', fontSize: '0.9rem' }}>
                  Client Secret (API Key Secreta de Uber) *
                </label>
                <input
                  type="password"
                  name="clientSecret"
                  required
                  defaultValue={activeIntegration?.clientSecret || 'Kx3WaI_5NI6e_xuewE0QIcdelsNBE9RFKSKvI3T9'}
                  placeholder="********************************"
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--caanma-border)', fontFamily: 'monospace' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.35rem', fontSize: '0.9rem' }}>
                  Store ID de Uber Eats (ID de tienda para esta sucursal):
                </label>
                <input
                  type="text"
                  name="storeId"
                  defaultValue={currentStoreId}
                  placeholder="Ej. cf24cea3-8162-518b-8b87-b1aca940169c"
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--caanma-border)', fontFamily: 'monospace' }}
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--caanma-text-muted)' }}>
                  UUID extraído de merchants.ubereats.com para {tenantBranches.find(b => b.id === selectedBranchId)?.name}.
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.5rem' }}>
                <input
                  type="checkbox"
                  id="isSandbox"
                  name="isSandbox"
                  value="true"
                  defaultChecked={isSandbox}
                  style={{ width: '18px', height: '18px', accentColor: '#06C167' }}
                />
                <label htmlFor="isSandbox" style={{ fontSize: '0.9rem', cursor: 'pointer' }}>
                  <strong>Modo Sandbox / Pruebas</strong> (conecta a test-api.uber.com en lugar de tiendas en producción)
                </label>
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button
                  type="submit"
                  className="btn-primary"
                  style={{
                    padding: '0.75rem 1.75rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    backgroundColor: '#06C167',
                    border: 'none',
                    fontWeight: 'bold',
                    borderRadius: '6px',
                    color: '#fff',
                    cursor: 'pointer'
                  }}
                >
                  <Save size={18} /> {activeIntegration ? 'Guardar Cambios de Sucursal' : 'Guardar y Conectar Sucursal'}
                </button>

                {activeIntegration && (
                  <button
                    formAction={deleteIntegration}
                    type="submit"
                    style={{
                      padding: '0.75rem 1.25rem',
                      backgroundColor: '#fef2f2',
                      color: '#ef4444',
                      border: '1px solid #fecaca',
                      borderRadius: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      cursor: 'pointer',
                      fontWeight: 'bold'
                    }}
                  >
                    <Trash2 size={18} /> Desconectar Esta Sucursal
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Webhook Card */}
          <div className="card" style={{ padding: '1.75rem', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Zap size={20} color="#06C167" /> URL del Webhook para Pedidos en Tiempo Real
            </h3>
            <p style={{ fontSize: '0.875rem', color: '#475569', marginBottom: '1rem' }}>
              Registra esta URL en el portal de desarrolladores de Uber Eats (Dashboard &gt; Webhooks &gt; orders.notification).
              Cuando un cliente haga un pedido, Uber notificará instantáneamente a esta dirección:
            </p>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <input
                type="text"
                readOnly
                value={webhookUrl}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  fontFamily: 'monospace',
                  fontSize: '0.85rem',
                  backgroundColor: '#0f172a',
                  color: '#4ade80',
                  border: 'none',
                  borderRadius: '6px'
                }}
              />
              <button
                type="button"
                onClick={handleCopyWebhook}
                style={{
                  padding: '0.75rem 1.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  backgroundColor: copiedWebhook ? '#10b981' : '#334155',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                {copiedWebhook ? <Check size={18} /> : <Copy size={18} />}
                {copiedWebhook ? '¡Copiado!' : 'Copiar URL'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: SKU MAPPING & INVENTORY MIRROR */}
      {activeTab === 'mapping' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Protected Safety Mode Banner */}
          <div className="card" style={{
            padding: '1.5rem',
            backgroundColor: isInventoryLiveSync ? '#f0fdf4' : '#eff6ff',
            border: `1px solid ${isInventoryLiveSync ? '#86efac' : '#bfdbfe'}`,
            borderRadius: '8px'
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <div style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  backgroundColor: isInventoryLiveSync ? '#06C167' : '#2563eb',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  flexShrink: 0
                }}>
                  <ShieldCheck size={26} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 'bold', color: isInventoryLiveSync ? '#15803d' : '#1e40af' }}>
                      {isInventoryLiveSync
                        ? '🟢 Sincronización en Vivo de Inventario Activa con Uber Eats'
                        : '🛡️ Espejo de Inventario: MODO SIMULACIÓN PROTEGIDO ACTIVO'}
                    </h3>
                    <span style={{
                      fontSize: '0.75rem',
                      fontWeight: 'bold',
                      padding: '0.2rem 0.6rem',
                      borderRadius: '999px',
                      backgroundColor: isInventoryLiveSync ? '#dcfce7' : '#dbeafe',
                      color: isInventoryLiveSync ? '#15803d' : '#1d4ed8'
                    }}>
                      {isInventoryLiveSync ? 'EN PRODUCCIÓN' : 'PROTEGIDO / SIMULACIÓN'}
                    </span>
                  </div>
                  <p style={{ margin: '0.35rem 0 0 0', fontSize: '0.85rem', color: isInventoryLiveSync ? '#166534' : '#1e3a8a' }}>
                    {isInventoryLiveSync
                      ? 'Cualquier venta en CAANMA o cambio en el inventario actualiza la disponibilidad del artículo en tiempo real directamente en los servidores de Uber Eats.'
                      : 'El inventario de CAANMA funciona como un espejo para Uber Eats: cada venta descuenta stock y recalcula disponibilidad (🟢 Disponible si stock > 0, 🔴 Agotado si stock ≤ 0). Como solicitaste, la sincronización hacia producción de Uber Eats está en PAUSA hasta que concluyas todas las pruebas al 100%.'}
                  </p>
                </div>
              </div>

              {/* Botón Cargar Catálogo CAANMA */}
              <button
                type="button"
                onClick={handleBatchMap}
                disabled={isBatchMapping}
                style={{
                  padding: '0.75rem 1.25rem',
                  backgroundColor: '#06C167',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: 'bold',
                  fontSize: '0.875rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  cursor: isBatchMapping ? 'not-allowed' : 'pointer',
                  boxShadow: '0 2px 4px rgba(6, 193, 103, 0.25)',
                  whiteSpace: 'nowrap'
                }}
              >
                <Zap size={18} />
                {isBatchMapping ? 'Cargando Catálogo...' : `⚡ Cargar Catálogo CAANMA (${availableProducts.length} productos)`}
              </button>
            </div>

            {batchMapMessage && (
              <div style={{
                marginTop: '1rem',
                padding: '0.75rem 1rem',
                backgroundColor: '#ecfdf5',
                border: '1px solid #6ee7b7',
                borderRadius: '6px',
                color: '#065f46',
                fontWeight: '600',
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <CheckCircle size={18} /> {batchMapMessage}
              </div>
            )}
          </div>

          {/* Formulario Emparejamiento Manual */}
          <div className="card" style={{ padding: '1.75rem' }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
              Vincular Producto Individual con Artículo de Uber Eats
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--caanma-text-muted)', marginBottom: '1.25rem' }}>
              Asocia un producto específico con su SKU o identificador de ítem en Uber Eats. El stock de CAANMA gobernará su disponibilidad.
            </p>

            <form onSubmit={handleCreateMapping} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 300px' }}>
                <label style={{ display: 'block', fontWeight: '600', fontSize: '0.85rem', marginBottom: '0.35rem' }}>
                  Producto Local (CAANMA):
                </label>
                <select
                  value={selectedProductId}
                  onChange={e => setSelectedProductId(e.target.value)}
                  required
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--caanma-border)' }}
                >
                  <option value="">-- Selecciona un producto ({availableProducts.length} disponibles) --</option>
                  {availableProducts.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} (SKU: {p.sku || 'S/N'}) - Stock: {p.stock} - ${p.price}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ flex: '1 1 250px' }}>
                <label style={{ display: 'block', fontWeight: '600', fontSize: '0.85rem', marginBottom: '0.35rem' }}>
                  ID Externo / SKU en Uber Eats:
                </label>
                <input
                  type="text"
                  value={customExternalId}
                  onChange={e => setCustomExternalId(e.target.value)}
                  required
                  placeholder="Ej. PASTEL-CHOCO-01"
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--caanma-border)' }}
                />
              </div>

              <button
                type="submit"
                disabled={isMapping}
                className="btn-primary"
                style={{
                  padding: '0.75rem 1.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  backgroundColor: '#06C167',
                  border: 'none',
                  color: '#fff',
                  borderRadius: '6px',
                  fontWeight: 'bold',
                  cursor: isMapping ? 'not-allowed' : 'pointer',
                  height: '42px'
                }}
              >
                <Plus size={18} /> {isMapping ? 'Vinculando...' : 'Vincular SKU'}
              </button>
            </form>
          </div>

          {/* Tabla de Productos Espejo */}
          <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
            <div style={{
              padding: '1.25rem 1.5rem',
              borderBottom: '1px solid var(--caanma-border)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '0.5rem'
            }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', margin: 0 }}>
                  Catálogo Espejo en Uber Eats ({mappedProducts.length} productos vinculados)
                </h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--caanma-text-muted)' }}>
                  {mappedProducts.filter(m => (m.product?.stock || 0) > 0).length} disponibles · {mappedProducts.filter(m => (m.product?.stock || 0) <= 0).length} agotados
                </span>
              </div>
            </div>

            {mappedProducts.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--caanma-text-muted)' }}>
                <p style={{ margin: '0 0 1rem 0' }}>No tienes productos emparejados con Uber Eats todavía.</p>
                <button
                  type="button"
                  onClick={handleBatchMap}
                  disabled={isBatchMapping}
                  style={{
                    padding: '0.6rem 1.25rem',
                    backgroundColor: '#06C167',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    fontWeight: 'bold',
                    cursor: 'pointer'
                  }}
                >
                  ⚡ Cargar y Auto-Emparejar Todo el Catálogo de CAANMA
                </button>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid var(--caanma-border)' }}>
                      <th style={{ padding: '0.75rem 1rem' }}>Producto Local (CAANMA)</th>
                      <th style={{ padding: '0.75rem 1rem' }}>SKU / Código</th>
                      <th style={{ padding: '0.75rem 1rem' }}>ID en Uber Eats</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Stock CAANMA</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Disponibilidad Uber Eats</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Modo</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Pruebas de Espejo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mappedProducts.map(map => {
                      const stock = map.product?.stock ?? 0;
                      const isOutOfStock = stock <= 0;
                      return (
                        <tr key={map.id} style={{ borderBottom: '1px solid var(--caanma-border)' }}>
                          <td style={{ padding: '0.75rem 1rem' }}>
                            <div style={{ fontWeight: '600' }}>{map.product?.name}</div>
                            <span style={{ fontSize: '0.75rem', color: 'var(--caanma-text-muted)' }}>
                              ${map.product?.price ? Number(map.product.price).toFixed(2) : '0.00'}
                            </span>
                          </td>
                          <td style={{ padding: '0.75rem 1rem' }}><code>{map.product?.sku || '-'}</code></td>
                          <td style={{ padding: '0.75rem 1rem' }}>
                            <span style={{ backgroundColor: '#f1f5f9', padding: '0.2rem 0.5rem', borderRadius: '4px', fontWeight: '600', color: '#0f172a' }}>
                              {map.externalId}
                            </span>
                          </td>
                          <td style={{ padding: '0.75rem 1rem' }}>
                            <span style={{
                              fontWeight: 'bold',
                              padding: '0.25rem 0.6rem',
                              borderRadius: '6px',
                              backgroundColor: !isOutOfStock ? '#dcfce7' : '#fee2e2',
                              color: !isOutOfStock ? '#15803d' : '#b91c1c'
                            }}>
                              {stock} pzs
                            </span>
                          </td>
                          <td style={{ padding: '0.75rem 1rem' }}>
                            <span style={{
                              fontSize: '0.78rem',
                              fontWeight: 'bold',
                              padding: '0.25rem 0.65rem',
                              borderRadius: '12px',
                              backgroundColor: !isOutOfStock ? '#e6fcf0' : '#fee2e2',
                              color: !isOutOfStock ? '#06C167' : '#ef4444',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem'
                            }}>
                              {!isOutOfStock ? '🟢 Disponible (En Menú)' : '🔴 Agotado (Suspendido)'}
                            </span>
                          </td>
                          <td style={{ padding: '0.75rem 1rem' }}>
                            <span style={{
                              fontSize: '0.72rem',
                              fontWeight: '600',
                              padding: '0.2rem 0.5rem',
                              borderRadius: '4px',
                              backgroundColor: '#f1f5f9',
                              color: '#475569'
                            }}>
                              🧪 Simulado
                            </span>
                          </td>
                          <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                              <button
                                type="button"
                                title="Simular que el producto se agota en CAANMA"
                                disabled={mirrorTestingId === map.product?.id}
                                onClick={() => handleSimulateStockChange(map.product?.id, 0)}
                                style={{
                                  padding: '0.3rem 0.6rem',
                                  fontSize: '0.75rem',
                                  fontWeight: '600',
                                  border: '1px solid #fca5a5',
                                  borderRadius: '4px',
                                  backgroundColor: '#fef2f2',
                                  color: '#dc2626',
                                  cursor: 'pointer'
                                }}
                              >
                                🔴 Agotar
                              </button>
                              <button
                                type="button"
                                title="Simular que se reabastecen +10 piezas"
                                disabled={mirrorTestingId === map.product?.id}
                                onClick={() => handleSimulateStockChange(map.product?.id, (map.product?.stock || 0) + 10)}
                                style={{
                                  padding: '0.3rem 0.6rem',
                                  fontSize: '0.75rem',
                                  fontWeight: '600',
                                  border: '1px solid #86efac',
                                  borderRadius: '4px',
                                  backgroundColor: '#f0fdf4',
                                  color: '#16a34a',
                                  cursor: 'pointer'
                                }}
                              >
                                🟢 +10 pzs
                              </button>
                              <button
                                type="button"
                                title="Desvincular del catálogo Uber Eats"
                                onClick={async () => {
                                  if (confirm(`¿Desvincular ${map.product?.name || 'este producto'} del espejo de Uber Eats?`)) {
                                    await unmapProductFromUberEats(map.id);
                                    window.location.reload();
                                  }
                                }}
                                style={{
                                  border: 'none',
                                  background: 'none',
                                  color: '#94a3b8',
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  padding: '0.2rem'
                                }}
                              >
                                <Unlink size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: TESTING & LIVE VALIDATION */}
      {activeTab === 'testing' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* Test Connection Card */}
          <div className="card" style={{ padding: '2rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
              1. Prueba de Autenticación OAuth con Uber Eats
            </h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--caanma-text-muted)', marginBottom: '1.5rem' }}>
              Verifica que el Client ID y Client Secret se autentiquen correctamente con los servidores de Uber Eats generando un token OAuth 2.0 válido.
            </p>

            <button
              onClick={handleTestConnection}
              disabled={testingConnection}
              style={{
                padding: '0.75rem 1.5rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                backgroundColor: '#06C167',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                fontWeight: 'bold',
                cursor: testingConnection ? 'not-allowed' : 'pointer'
              }}
            >
              <RefreshCw size={18} className={testingConnection ? 'spin' : ''} />
              {testingConnection ? 'Comprobando conexión con Uber...' : 'Probar Conexión con Uber Eats Ahora'}
            </button>

            {connectionResult && (
              <div style={{
                marginTop: '1.5rem',
                padding: '1rem',
                borderRadius: '6px',
                backgroundColor: connectionResult.connected ? '#f0fdf4' : '#fef2f2',
                border: `1px solid ${connectionResult.connected ? '#bbf7d0' : '#fecaca'}`
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 'bold', color: connectionResult.connected ? '#16a34a' : '#dc2626' }}>
                  {connectionResult.connected ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
                  {connectionResult.connected ? '¡Conexión Exitosa con Servidores de Uber Eats!' : 'Fallo de Conexión'}
                </div>
                <pre style={{ marginTop: '0.5rem', fontSize: '0.8rem', overflowX: 'auto' }}>
                  {JSON.stringify(connectionResult, null, 2)}
                </pre>
              </div>
            )}
          </div>

          {/* Simulate Test Order Card */}
          <div className="card" style={{ padding: '2rem', border: '2px solid #06C167', backgroundColor: '#fafffd' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#166534' }}>
                  <ShoppingBag size={22} color="#06C167" /> 2. Simulación de Pedido de Uber Eats
                </h2>
                <p style={{ fontSize: '0.875rem', color: '#334155', margin: '0.25rem 0 0 0' }}>
                  Simula la llegada de un pedido real de Uber Eats en la sucursal que elijas. Al hacer clic se creará la venta en Caanma, sonará la campana y aparecerá la notificación emergente flotante con ticket de venta.
                </p>
              </div>
              <span style={{ fontSize: '0.8rem', backgroundColor: '#e6fcf0', color: '#06C167', padding: '0.25rem 0.75rem', borderRadius: '999px', fontWeight: 'bold' }}>
                ● Modo de Prueba Interactivo
              </span>
            </div>

            <div style={{ marginBottom: '1.25rem', maxWidth: '350px' }}>
              <label style={{ display: 'block', fontWeight: '600', fontSize: '0.85rem', marginBottom: '0.35rem' }}>
                Sucursal destino para el pedido de prueba:
              </label>
              <select
                value={simulationBranchId}
                onChange={e => setSimulationBranchId(e.target.value)}
                style={{ width: '100%', padding: '0.65rem', borderRadius: '6px', border: '1px solid var(--caanma-border)', fontWeight: 'bold' }}
              >
                {tenantBranches.map(tb => (
                  <option key={tb.id} value={tb.id}>
                    🏢 {tb.name}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleSimulateOrder}
              disabled={simulatingOrder}
              style={{
                padding: '0.75rem 1.75rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                backgroundColor: '#06C167',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                fontWeight: 'bold',
                cursor: simulatingOrder ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 6px -1px rgba(6, 193, 103, 0.3)'
              }}
            >
              <Zap size={18} />
              {simulatingOrder ? 'Creando pedido en tiempo real...' : 'Disparar Pedido de Prueba en esta Sucursal'}
            </button>

            {simulationResult && (
              <div style={{
                marginTop: '1.5rem',
                padding: '1.25rem',
                borderRadius: '8px',
                backgroundColor: simulationResult.simulatedSale ? '#f0fdf4' : '#fef2f2',
                border: `1px solid ${simulationResult.simulatedSale ? '#bbf7d0' : '#fecaca'}`
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 'bold', color: simulationResult.simulatedSale ? '#16a34a' : '#dc2626', fontSize: '1rem', marginBottom: '0.5rem' }}>
                  {simulationResult.simulatedSale ? <CheckCircle size={22} /> : <AlertCircle size={22} />}
                  {simulationResult.simulatedSale ? '¡Pedido Simulado Recibido Exitosamente!' : 'Error al simular pedido'}
                </div>

                {simulationResult.simulatedSale && (
                  <div>
                    <p style={{ margin: '0 0 1rem 0', fontSize: '0.875rem', color: '#166534' }}>
                      Se generó la venta con folio <strong>{simulationResult.simulatedSale.folio}</strong> en la sucursal <strong>{simulationResult.branchName}</strong>. La alerta flotante ya debe estar activa.
                    </p>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <Link
                        href={`/ventas/detalle/${simulationResult.simulatedSale.id}`}
                        style={{
                          padding: '0.5rem 1rem',
                          backgroundColor: '#06C167',
                          color: '#fff',
                          borderRadius: '6px',
                          textDecoration: 'none',
                          fontWeight: 'bold',
                          fontSize: '0.85rem',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.4rem'
                        }}
                      >
                        <FileText size={16} /> Ver Detalle de la Venta
                      </Link>
                      <a
                        href={`/ventas/detalle/${simulationResult.simulatedSale.id}/imprimir-ticket`}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          padding: '0.5rem 1rem',
                          backgroundColor: '#f1f5f9',
                          color: '#334155',
                          borderRadius: '6px',
                          textDecoration: 'none',
                          fontWeight: 'bold',
                          fontSize: '0.85rem',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                          border: '1px solid #cbd5e1'
                        }}
                      >
                        <Printer size={16} /> Imprimir Ticket
                      </a>
                    </div>
                  </div>
                )}

                <pre style={{ marginTop: '1rem', fontSize: '0.78rem', overflowX: 'auto', backgroundColor: '#fff', padding: '0.75rem', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                  {JSON.stringify(simulationResult, null, 2)}
                </pre>
              </div>
            )}
          </div>

          {/* Card 3: Interactive Inventory Mirror Simulator */}
          <div className="card" style={{ padding: '2rem', border: '2px solid #3b82f6', backgroundColor: '#f8faff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#1e40af' }}>
                  <ShieldCheck size={22} color="#2563eb" /> 3. Simulador Interactivo de Espejo de Inventario (CAANMA ➔ Uber Eats)
                </h2>
                <p style={{ fontSize: '0.875rem', color: '#334155', margin: '0.25rem 0 0 0' }}>
                  Prueba en tiempo real cómo responde el espejo de Uber Eats al cambiar el inventario de cualquier producto en CAANMA. Al agotarse (0 pzas) se marcará inmediatamente como suspendido, y al reponer existencias volverá a estar disponible.
                </p>
              </div>
              <span style={{ fontSize: '0.8rem', backgroundColor: '#dbeafe', color: '#1d4ed8', padding: '0.25rem 0.75rem', borderRadius: '999px', fontWeight: 'bold' }}>
                🛡️ Modo Simulación Seguro (Sin llamadas a producción)
              </span>
            </div>

            <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
              <div style={{ flex: '1 1 320px' }}>
                <label style={{ display: 'block', fontWeight: '600', fontSize: '0.85rem', marginBottom: '0.35rem' }}>
                  Selecciona el Producto de CAANMA para la Prueba:
                </label>
                <select
                  value={mirrorProductId}
                  onChange={e => {
                    setMirrorProductId(e.target.value);
                    const prod = availableProducts.find(p => p.id === e.target.value);
                    if (prod) setMirrorNewStock(prod.stock);
                  }}
                  style={{ width: '100%', padding: '0.7rem', borderRadius: '6px', border: '1px solid var(--caanma-border)' }}
                >
                  <option value="">-- Elige un producto para probar espejo --</option>
                  {availableProducts.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} (Stock actual: {p.stock} pzs)
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ width: '160px' }}>
                <label style={{ display: 'block', fontWeight: '600', fontSize: '0.85rem', marginBottom: '0.35rem' }}>
                  Nuevo Stock Simulado:
                </label>
                <input
                  type="number"
                  min="0"
                  value={mirrorNewStock}
                  onChange={e => setMirrorNewStock(parseInt(e.target.value) || 0)}
                  style={{ width: '100%', padding: '0.7rem', borderRadius: '6px', border: '1px solid var(--caanma-border)', fontWeight: 'bold' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setMirrorNewStock(0)}
                  style={{
                    padding: '0.7rem 0.9rem',
                    backgroundColor: '#fee2e2',
                    color: '#dc2626',
                    border: '1px solid #fca5a5',
                    borderRadius: '6px',
                    fontWeight: 'bold',
                    fontSize: '0.8rem',
                    cursor: 'pointer'
                  }}
                >
                  Agotar (0)
                </button>
                <button
                  type="button"
                  onClick={() => setMirrorNewStock(prev => (Number(prev) || 0) + 10)}
                  style={{
                    padding: '0.7rem 0.9rem',
                    backgroundColor: '#e6fcf0',
                    color: '#06C167',
                    border: '1px solid #86efac',
                    borderRadius: '6px',
                    fontWeight: 'bold',
                    fontSize: '0.8rem',
                    cursor: 'pointer'
                  }}
                >
                  +10 pzs
                </button>
              </div>

              <button
                type="button"
                onClick={handleMirrorInteractiveTest}
                disabled={isSimulatingMirrorStock || !mirrorProductId}
                style={{
                  padding: '0.7rem 1.5rem',
                  backgroundColor: '#2563eb',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: 'bold',
                  cursor: (isSimulatingMirrorStock || !mirrorProductId) ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.25)'
                }}
              >
                <RefreshCw size={18} className={isSimulatingMirrorStock ? 'spin' : ''} />
                {isSimulatingMirrorStock ? 'Actualizando Espejo...' : 'Ejecutar Prueba de Espejo'}
              </button>
            </div>

            {mirrorSimulationResult && (
              <div style={{
                marginTop: '1.25rem',
                padding: '1.25rem',
                borderRadius: '8px',
                backgroundColor: mirrorSimulationResult.success ? '#f0fdf4' : '#fef2f2',
                border: `1px solid ${mirrorSimulationResult.success ? '#bbf7d0' : '#fecaca'}`
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 'bold', color: mirrorSimulationResult.success ? '#16a34a' : '#dc2626', fontSize: '1rem', marginBottom: '0.5rem' }}>
                  {mirrorSimulationResult.success ? <CheckCircle size={22} /> : <AlertCircle size={22} />}
                  {mirrorSimulationResult.success ? '✅ Espejo de Inventario Actualizado y Validado' : 'Error en la prueba de espejo'}
                </div>

                {mirrorSimulationResult.success && (
                  <div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', margin: '0.75rem 0' }}>
                      <div style={{ padding: '0.75rem', backgroundColor: '#fff', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '600' }}>PRODUCTO</div>
                        <div style={{ fontWeight: 'bold', fontSize: '0.95rem' }}>{mirrorSimulationResult.productName}</div>
                      </div>
                      <div style={{ padding: '0.75rem', backgroundColor: '#fff', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '600' }}>STOCK EN CAANMA</div>
                        <div style={{ fontWeight: 'bold', fontSize: '1.1rem', color: mirrorSimulationResult.stock > 0 ? '#15803d' : '#b91c1c' }}>
                          {mirrorSimulationResult.stock} piezas
                        </div>
                      </div>
                      <div style={{ padding: '0.75rem', backgroundColor: '#fff', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '600' }}>ESTADO EN UBER EATS</div>
                        <div style={{ fontWeight: 'bold', fontSize: '0.95rem', color: mirrorSimulationResult.isOutOfStock ? '#dc2626' : '#16a34a' }}>
                          {mirrorSimulationResult.isOutOfStock ? '🔴 Agotado / Suspendido' : '🟢 Disponible (En Stock)'}
                        </div>
                      </div>
                    </div>
                    <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.8rem', color: '#166534' }}>
                      ℹ️ Modo seguro activo: El cambio se registró en la base de datos de CAANMA y el estado espejo se guardó como <code>{mirrorSimulationResult.isOutOfStock ? 'SIMULATED_SUSPENDED' : 'SIMULATED_SYNCED'}</code> sin enviar cambios a la tienda en vivo de Uber Eats.
                    </p>
                  </div>
                )}

                {mirrorSimulationResult.error && (
                  <p style={{ color: '#dc2626', margin: '0.5rem 0 0 0', fontSize: '0.85rem' }}>
                    {mirrorSimulationResult.error}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
