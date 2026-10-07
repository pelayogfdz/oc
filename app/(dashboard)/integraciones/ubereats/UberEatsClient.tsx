'use client';

import React, { useState } from 'react';
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
  AlertCircle
} from 'lucide-react';
import {
  saveUberEatsConfig,
  deleteIntegration,
  mapProductToUberEats,
  unmapProductFromUberEats
} from '@/app/actions/integration';

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

interface UberEatsClientProps {
  integration: any;
  branch: BranchItem;
  tenantBranches: BranchItem[];
  mappedProducts: MappedProductItem[];
  availableProducts: ProductItem[];
  webhookUrl: string;
}

export default function UberEatsClient({
  integration,
  branch,
  tenantBranches,
  mappedProducts,
  availableProducts,
  webhookUrl
}: UberEatsClientProps) {
  const [activeTab, setActiveTab] = useState<'config' | 'mapping' | 'testing'>('config');
  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionResult, setConnectionResult] = useState<any>(null);
  const [syncingStock, setSyncingStock] = useState(false);
  const [syncResult, setSyncResult] = useState<any>(null);
  const [simulatingOrder, setSimulatingOrder] = useState(false);
  const [simulationResult, setSimulationResult] = useState<any>(null);

  // New mapping modal state
  const [selectedProductId, setSelectedProductId] = useState('');
  const [customExternalId, setCustomExternalId] = useState('');
  const [isMapping, setIsMapping] = useState(false);

  const meta = integration?.metadata ? JSON.parse(integration.metadata) : {};
  const isSandbox = Boolean(meta.isSandbox);
  const storeId = meta.storeId || integration?.accessToken || '';

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
        body: JSON.stringify({})
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
        body: JSON.stringify({ simulateTestOrder: true })
      });
      const data = await res.json();
      setSimulationResult(data);
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
    } catch (err: any) {
      alert(err.message || 'Error al emparejar producto');
    } finally {
      setIsMapping(false);
    }
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      {/* Navigation Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--caanma-border)', marginBottom: '2rem' }}>
        <button
          onClick={() => setActiveTab('config')}
          style={{
            padding: '0.75rem 1.25rem',
            border: 'none',
            background: 'none',
            fontWeight: activeTab === 'config' ? 'bold' : 'normal',
            color: activeTab === 'config' ? '#06C167' : 'inherit',
            borderBottom: activeTab === 'config' ? '3px solid #06C167' : '3px solid transparent',
            cursor: 'pointer'
          }}
        >
          ⚙️ Credenciales & Conexión
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
            cursor: 'pointer'
          }}
        >
          📦 Emparejador de SKUs ({mappedProducts.length})
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
            cursor: 'pointer'
          }}
        >
          🧪 Pruebas & Sincronización
        </button>
      </div>

      {/* TAB 1: CONFIGURATION */}
      {activeTab === 'config' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div className="card" style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--caanma-border)', paddingBottom: '0.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>Credenciales de la API de Uber Eats</h2>
              <span style={{
                fontSize: '0.8rem',
                fontWeight: 'bold',
                padding: '0.25rem 0.75rem',
                borderRadius: '20px',
                backgroundColor: integration?.isActive ? '#e6fcf0' : '#f1f5f9',
                color: integration?.isActive ? '#06C167' : '#64748b'
              }}>
                {integration?.isActive ? '● Canal Activo' : '○ No Conectado'}
              </span>
            </div>

            <form action={saveUberEatsConfig} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.35rem', fontSize: '0.9rem' }}>
                  Client ID (App ID de Uber Developers) *
                </label>
                <input
                  type="text"
                  name="appId"
                  required
                  defaultValue={integration?.appId || ''}
                  placeholder="Ej. abc123def456_uber_client"
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--caanma-border)' }}
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--caanma-text-muted)' }}>
                  Generado en el portal developer.uber.com/dashboard al crear tu aplicación.
                </span>
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.35rem', fontSize: '0.9rem' }}>
                  Client Secret (API Key Secreta) *
                </label>
                <input
                  type="password"
                  name="clientSecret"
                  required
                  defaultValue={integration?.clientSecret || ''}
                  placeholder="********************************"
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--caanma-border)' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.35rem', fontSize: '0.9rem' }}>
                  Store ID de Uber Eats (ID de esta sucursal: {branch.name})
                </label>
                <input
                  type="text"
                  name="storeId"
                  defaultValue={storeId}
                  placeholder="Ej. 7b3e4f1a-0239-4d2b-bbd7-6e651877608f"
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--caanma-border)' }}
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--caanma-text-muted)' }}>
                  UUID que aparece en la URL al seleccionar esta tienda en merchants.ubereats.com/manager/stores.
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
                  <Save size={18} /> {integration ? 'Guardar Cambios' : 'Guardar y Conectar'}
                </button>

                {integration && (
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
                    <Trash2 size={18} /> Desconectar
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

      {/* TAB 2: SKU MAPPING */}
      {activeTab === 'mapping' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div className="card" style={{ padding: '2rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem' }}>
              Emparejar Producto Local con Artículo de Uber Eats
            </h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--caanma-text-muted)', marginBottom: '1.5rem' }}>
              Asocia los productos de tu pastelería con el ID o SKU de tu menú en Uber Eats. Caanma sincronizará automáticamente el stock:
              si se agota aquí, se suspenderá en Uber Eats para que nadie lo pida.
            </p>

            <form onSubmit={handleCreateMapping} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 300px' }}>
                <label style={{ display: 'block', fontWeight: '600', fontSize: '0.85rem', marginBottom: '0.35rem' }}>
                  Producto Local (Caanma):
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
                <Plus size={18} /> {isMapping ? 'Emparejando...' : 'Emparejar SKU'}
              </button>
            </form>
          </div>

          {/* Table of mapped products */}
          <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--caanma-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', margin: 0 }}>
                Productos Emparejados con Uber Eats ({mappedProducts.length})
              </h3>
            </div>

            {mappedProducts.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--caanma-text-muted)' }}>
                No tienes productos emparejados con Uber Eats todavía. Utiliza el formulario arriba para agregar el primero.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid var(--caanma-border)' }}>
                      <th style={{ padding: '0.75rem 1rem' }}>Producto Local</th>
                      <th style={{ padding: '0.75rem 1rem' }}>SKU Local</th>
                      <th style={{ padding: '0.75rem 1rem' }}>ID en Uber Eats</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Stock Local</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Estado Sync</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mappedProducts.map(map => (
                      <tr key={map.id} style={{ borderBottom: '1px solid var(--caanma-border)' }}>
                        <td style={{ padding: '0.75rem 1rem', fontWeight: '600' }}>{map.product?.name}</td>
                        <td style={{ padding: '0.75rem 1rem' }}><code>{map.product?.sku || '-'}</code></td>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <span style={{ backgroundColor: '#f1f5f9', padding: '0.2rem 0.5rem', borderRadius: '4px', fontWeight: '600', color: '#0f172a' }}>
                            {map.externalId}
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <span style={{ fontWeight: 'bold', color: (map.product?.stock || 0) > 0 ? '#10b981' : '#ef4444' }}>
                            {map.product?.stock || 0} pzs
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <span style={{
                            fontSize: '0.75rem',
                            fontWeight: 'bold',
                            padding: '0.2rem 0.5rem',
                            borderRadius: '12px',
                            backgroundColor: map.syncStatus === 'SYNCED' ? '#e6fcf0' : '#fee2e2',
                            color: map.syncStatus === 'SYNCED' ? '#06C167' : '#ef4444'
                          }}>
                            {map.syncStatus === 'SYNCED' ? 'Sincronizado' : 'Agotado (Suspendido)'}
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                          <button
                            onClick={async () => {
                              if (confirm('¿Desvincular este producto de Uber Eats?')) {
                                await unmapProductFromUberEats(map.id);
                              }
                            }}
                            style={{
                              border: 'none',
                              background: 'none',
                              color: '#ef4444',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                              fontWeight: '600',
                              fontSize: '0.8rem'
                            }}
                          >
                            <Unlink size={16} /> Desvincular
                          </button>
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

      {/* TAB 3: TESTING & LIVE VALIDATION */}
      {activeTab === 'testing' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* Test Connection Card */}
          <div className="card" style={{ padding: '2rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
              1. Prueba de Autenticación en Vivo
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
                  {connectionResult.connected ? '¡Conexión Exitosa con Uber Eats!' : 'Fallo de Conexión'}
                </div>
                <pre style={{ marginTop: '0.5rem', fontSize: '0.8rem', overflowX: 'auto' }}>
                  {JSON.stringify(connectionResult, null, 2)}
                </pre>
              </div>
            )}
          </div>

          {/* Sync Stock Card */}
          <div className="card" style={{ padding: '2rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
              2. Sincronización Forzada de Disponibilidad
            </h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--caanma-text-muted)', marginBottom: '1.5rem' }}>
              Envía los niveles actuales de existencias a Uber Eats. Los productos con existencias se activarán en el menú, y aquellos con stock 0 se suspenderán automáticamente.
            </p>

            <button
              onClick={handleSyncStock}
              disabled={syncingStock}
              className="btn-secondary"
              style={{
                padding: '0.75rem 1.5rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              <RefreshCw size={18} className={syncingStock ? 'spin' : ''} />
              {syncingStock ? 'Sincronizando menú...' : 'Forzar Sincronización de Stock Ahora'}
            </button>

            {syncResult && (
              <div style={{
                marginTop: '1.5rem',
                padding: '1rem',
                borderRadius: '6px',
                backgroundColor: syncResult.success ? '#f0fdf4' : '#fef2f2',
                border: `1px solid ${syncResult.success ? '#bbf7d0' : '#fecaca'}`
              }}>
                <div style={{ fontWeight: 'bold', color: syncResult.success ? '#16a34a' : '#dc2626' }}>
                  {syncResult.success ? 'Sincronización completada' : 'Error en la sincronización'}
                </div>
                <pre style={{ marginTop: '0.5rem', fontSize: '0.8rem', overflowX: 'auto' }}>
                  {JSON.stringify(syncResult, null, 2)}
                </pre>
              </div>
            )}
          </div>

          {/* Simulate Test Order Card */}
          <div className="card" style={{ padding: '2rem', border: '1px dashed #cbd5e1' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ShoppingBag size={20} color="#06C167" /> 3. Simular Entrada de Pedido de Uber Eats
            </h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--caanma-text-muted)', marginBottom: '1.5rem' }}>
              Simula el flujo completo de un pedido entrante de Uber Eats: crea la Venta en Caanma, descuenta existencias en el Kardex y genera el ticket de venta.
            </p>

            <button
              onClick={handleSimulateOrder}
              disabled={simulatingOrder}
              style={{
                padding: '0.75rem 1.5rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                backgroundColor: '#3b82f6',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                fontWeight: 'bold',
                cursor: simulatingOrder ? 'not-allowed' : 'pointer'
              }}
            >
              <Zap size={18} />
              {simulatingOrder ? 'Procesando pedido de prueba...' : 'Simular Pedido de Prueba en esta Sucursal'}
            </button>

            {simulationResult && (
              <div style={{
                marginTop: '1.5rem',
                padding: '1rem',
                borderRadius: '6px',
                backgroundColor: simulationResult.simulatedSale ? '#f0fdf4' : '#fef2f2',
                border: `1px solid ${simulationResult.simulatedSale ? '#bbf7d0' : '#fecaca'}`
              }}>
                <div style={{ fontWeight: 'bold', color: simulationResult.simulatedSale ? '#16a34a' : '#dc2626' }}>
                  {simulationResult.simulatedSale ? '¡Pedido de Prueba Creado con Éxito!' : 'Error en la prueba'}
                </div>
                <pre style={{ marginTop: '0.5rem', fontSize: '0.8rem', overflowX: 'auto' }}>
                  {JSON.stringify(simulationResult, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
