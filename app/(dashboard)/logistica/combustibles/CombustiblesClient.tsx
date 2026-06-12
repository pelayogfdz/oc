'use client';

import { useState, useTransition } from 'react';
import { 
  Plus, Settings, Truck, TrendingUp, Coins, Fuel, 
  MapPin, FileText, Camera, Save, Trash2, Edit, Check, DollarSign, X
} from 'lucide-react';
import { 
  saveFuelLogisticsConfig, 
  createFuelTransaction, 
  updateFuelTransaction, 
  deleteFuelTransaction, 
  FuelLogisticsConfig 
} from "@/app/actions/fuel-logistics";

export default function CombustiblesClient({ 
  branch, 
  initialConfig, 
  initialTransactions, 
  unassociatedSales, 
  unassociatedPurchases 
}: { 
  branch: any, 
  initialConfig: FuelLogisticsConfig, 
  initialTransactions: any[],
  unassociatedSales: any[],
  unassociatedPurchases: any[]
}) {
  const [activeTab, setActiveTab] = useState<'embarques' | 'config' | 'evidencia'>('embarques');
  const [transactions, setTransactions] = useState(initialTransactions);
  const [config, setConfig] = useState<FuelLogisticsConfig>(initialConfig);
  const [isPending, startTransition] = useTransition();

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedTx, setSelectedTx] = useState<any>(null);

  // Form states
  const [newTx, setNewTx] = useState({
    folio: '',
    saleId: '',
    purchaseId: '',
    distanceKm: 0,
    fuelPricePerLiter: config.defaultFuelPricePerLiter,
    vehicleKmPerLiter: config.defaultVehicleKmPerLiter,
    wearCostPerKm: config.defaultWearCostPerKm,
    driverCostPerKm: config.defaultDriverCostPerKm,
    extraLogisticsCost: 0,
    deliveryStatus: 'PENDING',
    evidenceNotes: '',
    evidencePhoto: '',
    purchaseReceipt: '',
    supplierInvoice: '',
    shippingDoc: '',
    customerInvoice: ''
  });

  const [editTx, setEditTx] = useState<any>(null);

  // Process local file selection and convert to Base64 dataURL
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, field: string, isEdit: boolean = false, isDriver: boolean = false) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      if (isDriver) {
        setSelectedTx((prev: any) => ({ ...prev, [field]: base64String }));
      } else if (isEdit) {
        setEditTx((prev: any) => ({ ...prev, [field]: base64String }));
      } else {
        setNewTx((prev: any) => ({ ...prev, [field]: base64String }));
      }
    };
    reader.readAsDataURL(file);
  };

  // Save general configurations
  const handleSaveConfig = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const updatedConfig: FuelLogisticsConfig = {
      defaultFuelPricePerLiter: parseFloat(formData.get('defaultFuelPricePerLiter') as string) || 0,
      defaultWearCostPerKm: parseFloat(formData.get('defaultWearCostPerKm') as string) || 0,
      defaultDriverCostPerKm: parseFloat(formData.get('defaultDriverCostPerKm') as string) || 0,
      defaultVehicleKmPerLiter: parseFloat(formData.get('defaultVehicleKmPerLiter') as string) || 1.0,
    };

    startTransition(async () => {
      const res = await saveFuelLogisticsConfig(updatedConfig);
      if (res.success) {
        setConfig(updatedConfig);
        alert("Configuración de costos guardada correctamente.");
      } else {
        alert(`Error: ${res.error}`);
      }
    });
  };

  // Create new transaction (shipment)
  const handleCreateTx = async (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await createFuelTransaction({
        ...newTx,
        distanceKm: Number(newTx.distanceKm),
        fuelPricePerLiter: Number(newTx.fuelPricePerLiter),
        vehicleKmPerLiter: Number(newTx.vehicleKmPerLiter),
        wearCostPerKm: Number(newTx.wearCostPerKm),
        driverCostPerKm: Number(newTx.driverCostPerKm),
        extraLogisticsCost: Number(newTx.extraLogisticsCost)
      });

      if (res.success && res.transaction) {
        // Mock new item in state for immediate reactivity
        setTransactions([res.transaction, ...transactions]);
        setShowCreateModal(false);
        // Reset form
        setNewTx({
          folio: '',
          saleId: '',
          purchaseId: '',
          distanceKm: 0,
          fuelPricePerLiter: config.defaultFuelPricePerLiter,
          vehicleKmPerLiter: config.defaultVehicleKmPerLiter,
          wearCostPerKm: config.defaultWearCostPerKm,
          driverCostPerKm: config.defaultDriverCostPerKm,
          extraLogisticsCost: 0,
          deliveryStatus: 'PENDING',
          evidenceNotes: '',
          evidencePhoto: '',
          purchaseReceipt: '',
          supplierInvoice: '',
          shippingDoc: '',
          customerInvoice: ''
        });
        alert("Embarque creado con éxito.");
        window.location.reload(); // Re-fetch all associations dynamically
      } else {
        alert(`Error al crear embarque: ${res.error}`);
      }
    });
  };

  // Update existing transaction
  const handleUpdateTx = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTx) return;

    startTransition(async () => {
      const res = await updateFuelTransaction(editTx.id, {
        distanceKm: Number(editTx.distanceKm),
        fuelPricePerLiter: Number(editTx.fuelPricePerLiter),
        vehicleKmPerLiter: Number(editTx.vehicleKmPerLiter),
        wearCostPerKm: Number(editTx.wearCostPerKm),
        driverCostPerKm: Number(editTx.driverCostPerKm),
        extraLogisticsCost: Number(editTx.extraLogisticsCost),
        deliveryStatus: editTx.deliveryStatus,
        evidenceNotes: editTx.evidenceNotes,
        evidencePhoto: editTx.evidencePhoto,
        purchaseReceipt: editTx.purchaseReceipt,
        supplierInvoice: editTx.supplierInvoice,
        shippingDoc: editTx.shippingDoc,
        customerInvoice: editTx.customerInvoice
      });

      if (res.success && res.transaction) {
        setTransactions(transactions.map(t => t.id === editTx.id ? { ...t, ...res.transaction } : t));
        setShowEditModal(false);
        alert("Embarque actualizado.");
        window.location.reload();
      } else {
        alert(`Error al actualizar: ${res.error}`);
      }
    });
  };

  // Delete transaction
  const handleDeleteTx = async (id: string) => {
    if (!confirm("¿Seguro que deseas eliminar este embarque?")) return;
    
    startTransition(async () => {
      const res = await deleteFuelTransaction(id);
      if (res.success) {
        setTransactions(transactions.filter(t => t.id !== id));
        alert("Embarque eliminado.");
      } else {
        alert(`Error: ${res.error}`);
      }
    });
  };

  // Calculations for total statistics
  const totalShipments = transactions.length;
  const totalVentas = transactions.reduce((acc, t) => acc + (t.sale?.total || 0), 0);
  const totalCompras = transactions.reduce((acc, t) => acc + (t.purchase?.total || 0), 0);
  const totalLogistica = transactions.reduce((acc, t) => acc + (t.calculatedLogisticsCost || 0), 0);
  const totalNetProfit = transactions.reduce((acc, t) => acc + (t.calculatedNetProfit || 0), 0);

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#0f172a' }}>
            <Fuel size={28} style={{ color: '#0284c7' }} />
            Logística y Embarques de Combustibles
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            Sucursal: <span style={{ fontWeight: '600' }}>{branch?.name || 'Global'}</span>
          </p>
        </div>
        
        <button 
          onClick={() => {
            setNewTx(prev => ({
              ...prev,
              fuelPricePerLiter: config.defaultFuelPricePerLiter,
              vehicleKmPerLiter: config.defaultVehicleKmPerLiter,
              wearCostPerKm: config.defaultWearCostPerKm,
              driverCostPerKm: config.defaultDriverCostPerKm
            }));
            setShowCreateModal(true);
          }}
          className="btn-primary" 
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.25rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
        >
          <Plus size={18} />
          Registrar Embarque
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid #e2e8f0', marginBottom: '1.5rem' }}>
        <button 
          onClick={() => setActiveTab('embarques')}
          style={{ 
            padding: '0.75rem 1.25rem', 
            background: 'none', 
            border: 'none', 
            borderBottom: activeTab === 'embarques' ? '3px solid #0284c7' : '3px solid transparent',
            color: activeTab === 'embarques' ? '#0284c7' : '#64748b',
            fontWeight: activeTab === 'embarques' ? 'bold' : 'normal',
            cursor: 'pointer',
            fontSize: '0.95rem'
          }}
        >
          📊 Panel de Embarques
        </button>
        <button 
          onClick={() => setActiveTab('config')}
          style={{ 
            padding: '0.75rem 1.25rem', 
            background: 'none', 
            border: 'none', 
            borderBottom: activeTab === 'config' ? '3px solid #0284c7' : '3px solid transparent',
            color: activeTab === 'config' ? '#0284c7' : '#64748b',
            fontWeight: activeTab === 'config' ? 'bold' : 'normal',
            cursor: 'pointer',
            fontSize: '0.95rem'
          }}
        >
          ⚙️ Configuración de Costos
        </button>
        <button 
          onClick={() => setActiveTab('evidencia')}
          style={{ 
            padding: '0.75rem 1.25rem', 
            background: 'none', 
            border: 'none', 
            borderBottom: activeTab === 'evidencia' ? '3px solid #0284c7' : '3px solid transparent',
            color: activeTab === 'evidencia' ? '#0284c7' : '#64748b',
            fontWeight: activeTab === 'evidencia' ? 'bold' : 'normal',
            cursor: 'pointer',
            fontSize: '0.95rem'
          }}
        >
          🚚 Subir Evidencia (Chofer)
        </button>
      </div>

      {/* Tabs Content */}
      {activeTab === 'embarques' && (
        <>
          {/* Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
            <div className="card" style={{ padding: '1.25rem', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '100px' }}>
              <div>
                <p style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: '500' }}>Embarques Totales</p>
                <h3 style={{ fontSize: '1.75rem', fontWeight: 'bold', color: '#1e293b', marginTop: '0.25rem' }}>{totalShipments}</h3>
              </div>
              <Truck size={24} style={{ alignSelf: 'flex-end', color: '#64748b' }} />
            </div>

            <div className="card" style={{ padding: '1.25rem', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '100px' }}>
              <div>
                <p style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: '500' }}>Venta Total (Ingresos)</p>
                <h3 style={{ fontSize: '1.75rem', fontWeight: 'bold', color: '#10b981', marginTop: '0.25rem' }}>${totalVentas.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</h3>
              </div>
              <Coins size={24} style={{ alignSelf: 'flex-end', color: '#10b981' }} />
            </div>

            <div className="card" style={{ padding: '1.25rem', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '100px' }}>
              <div>
                <p style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: '500' }}>Costo Combustible (Compra)</p>
                <h3 style={{ fontSize: '1.75rem', fontWeight: 'bold', color: '#ef4444', marginTop: '0.25rem' }}>${totalCompras.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</h3>
              </div>
              <DollarSign size={24} style={{ alignSelf: 'flex-end', color: '#ef4444' }} />
            </div>

            <div className="card" style={{ padding: '1.25rem', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '100px' }}>
              <div>
                <p style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: '500' }}>Costos Logísticos Viajes</p>
                <h3 style={{ fontSize: '1.75rem', fontWeight: 'bold', color: '#f59e0b', marginTop: '0.25rem' }}>${totalLogistica.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</h3>
              </div>
              <MapPin size={24} style={{ alignSelf: 'flex-end', color: '#f59e0b' }} />
            </div>

            <div className="card" style={{ padding: '1.25rem', borderRadius: '12px', borderLeft: '4px solid #0284c7', boxShadow: '0 2px 8px rgba(2, 132, 199, 0.15)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '100px', backgroundColor: '#f0f9ff' }}>
              <div>
                <p style={{ color: '#0284c7', fontSize: '0.85rem', fontWeight: '600' }}>Utilidad Neta Est. total</p>
                <h3 style={{ fontSize: '1.75rem', fontWeight: 'bold', color: '#0369a1', marginTop: '0.25rem' }}>${totalNetProfit.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</h3>
              </div>
              <TrendingUp size={24} style={{ alignSelf: 'flex-end', color: '#0284c7' }} />
            </div>
          </div>

          {/* List Table */}
          <div className="card" style={{ padding: '1.5rem', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '1.25rem', color: '#334155' }}>Historial de Embarques y Utilidades</h2>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #f1f5f9', backgroundColor: '#f8fafc' }}>
                    <th style={{ padding: '1rem', color: '#64748b', fontWeight: '600', fontSize: '0.85rem' }}>Folio Embarque</th>
                    <th style={{ padding: '1rem', color: '#64748b', fontWeight: '600', fontSize: '0.85rem' }}>Cliente / Venta</th>
                    <th style={{ padding: '1rem', color: '#64748b', fontWeight: '600', fontSize: '0.85rem' }}>Proveedor / Compra</th>
                    <th style={{ padding: '1rem', color: '#64748b', fontWeight: '600', fontSize: '0.85rem' }}>Distancia</th>
                    <th style={{ padding: '1rem', color: '#64748b', fontWeight: '600', fontSize: '0.85rem' }}>Costos Logísticos</th>
                    <th style={{ padding: '1rem', color: '#64748b', fontWeight: '600', fontSize: '0.85rem' }}>Estatus</th>
                    <th style={{ padding: '1rem', color: '#64748b', fontWeight: '600', fontSize: '0.85rem', textAlign: 'right' }}>Utilidad Est.</th>
                    <th style={{ padding: '1rem', color: '#64748b', fontWeight: '600', fontSize: '0.85rem', textAlign: 'center' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((t) => (
                    <tr key={t.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '1rem', fontWeight: 'bold', color: '#1e293b' }}>
                        <div>{t.folio}</div>
                        <div style={{ display: 'flex', gap: '0.35rem', marginTop: '0.4rem', flexWrap: 'wrap' }}>
                          {t.purchaseReceipt && (
                            <a href={t.purchaseReceipt} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.65rem', backgroundColor: '#e2e8f0', color: '#475569', padding: '0.15rem 0.35rem', borderRadius: '4px', textDecoration: 'none', fontWeight: '600' }} title="Recibo de Compra">📄 Recibo</a>
                          )}
                          {t.supplierInvoice && (
                            <a href={t.supplierInvoice} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.65rem', backgroundColor: '#e2e8f0', color: '#475569', padding: '0.15rem 0.35rem', borderRadius: '4px', textDecoration: 'none', fontWeight: '600' }} title="Factura Proveedor">🧾 Fac. Prov</a>
                          )}
                          {t.shippingDoc && (
                            <a href={t.shippingDoc} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.65rem', backgroundColor: '#e0f2fe', color: '#0369a1', padding: '0.15rem 0.35rem', borderRadius: '4px', textDecoration: 'none', fontWeight: '600' }} title="Carta Porte / Doc. Embarque">🚚 Carta Porte</a>
                          )}
                          {t.customerInvoice && (
                            <a href={t.customerInvoice} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.65rem', backgroundColor: '#e2e8f0', color: '#475569', padding: '0.15rem 0.35rem', borderRadius: '4px', textDecoration: 'none', fontWeight: '600' }} title="Factura Venta">💰 Fac. Venta</a>
                          )}
                          {t.evidencePhoto && (
                            <a href={t.evidencePhoto} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.65rem', backgroundColor: '#dcfce7', color: '#166534', padding: '0.15rem 0.35rem', borderRadius: '4px', textDecoration: 'none', fontWeight: '600' }} title="Evidencia de Entrega">📷 Foto</a>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <div style={{ fontWeight: '500', color: '#0f172a' }}>{t.sale?.customer?.name || 'Cliente sin nombre'}</div>
                        <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Folio Venta: {t.sale?.folio || 'N/A'} (${t.sale?.total.toLocaleString()})</span>
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <div style={{ fontWeight: '500', color: '#0f172a' }}>{t.purchase?.supplier?.name || 'Sin Compra Asociada'}</div>
                        {t.purchase && (
                          <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Folio Compra: {t.purchase.folio || 'N/A'} (${t.purchase.total.toLocaleString()})</span>
                        )}
                      </td>
                      <td style={{ padding: '1rem', fontWeight: '500' }}>{t.distanceKm} Km</td>
                      <td style={{ padding: '1rem' }}>
                        <div style={{ fontWeight: '600', color: '#c2410c' }}>${t.calculatedLogisticsCost.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</div>
                        {t.extraLogisticsCost > 0 && (
                          <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Extras: ${t.extraLogisticsCost.toLocaleString()}</span>
                        )}
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <span style={{
                          padding: '0.25rem 0.5rem',
                          borderRadius: '9999px',
                          fontSize: '0.75rem',
                          fontWeight: 'bold',
                          backgroundColor: t.deliveryStatus === 'DELIVERED' ? '#dcfce7' : t.deliveryStatus === 'IN_TRANSIT' ? '#eff6ff' : '#fef3c7',
                          color: t.deliveryStatus === 'DELIVERED' ? '#166534' : t.deliveryStatus === 'IN_TRANSIT' ? '#1e40af' : '#92400e'
                        }}>
                          {t.deliveryStatus === 'DELIVERED' ? 'Entregado' : t.deliveryStatus === 'IN_TRANSIT' ? 'En Tránsito' : 'Pendiente'}
                        </span>
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 'bold', color: t.calculatedNetProfit >= 0 ? '#10b981' : '#ef4444' }}>
                        ${t.calculatedNetProfit.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                          <button 
                            onClick={() => {
                              setEditTx({ ...t });
                              setShowEditModal(true);
                            }}
                            style={{ padding: '0.35rem', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer' }}
                            title="Editar"
                          >
                            <Edit size={14} style={{ color: '#475569' }} />
                          </button>
                          <button 
                            onClick={() => handleDeleteTx(t.id)}
                            style={{ padding: '0.35rem', background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '4px', cursor: 'pointer' }}
                            title="Eliminar"
                          >
                            <Trash2 size={14} style={{ color: '#ef4444' }} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {transactions.length === 0 && (
                    <tr>
                      <td colSpan={8} style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
                        No hay embarques registrados en esta sucursal.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {activeTab === 'config' && (
        <div className="card" style={{ padding: '2rem', borderRadius: '12px', maxWidth: '600px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '0.5rem', color: '#0f172a' }}>Valores por Defecto para Costos Logísticos</h2>
          <p style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
            Define las tarifas estándar de tu empresa para simplificar el cálculo rápido de utilidades por viaje. Al registrar un nuevo viaje, estos valores se cargarán automáticamente pero podrás editarlos individualmente.
          </p>

          <form onSubmit={handleSaveConfig} style={{ display: 'grid', gap: '1.25rem' }}>
            <div>
              <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.5rem', fontSize: '0.9rem', color: '#334155' }}>Costo del Combustible por Litro ($/Litro)</label>
              <input 
                type="number" 
                name="defaultFuelPricePerLiter" 
                step="0.01"
                defaultValue={config.defaultFuelPricePerLiter}
                style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1' }} 
                required 
              />
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.5rem', fontSize: '0.9rem', color: '#334155' }}>Rendimiento Promedio de Unidad (Kilómetros por Litro)</label>
              <input 
                type="number" 
                name="defaultVehicleKmPerLiter" 
                step="0.1"
                defaultValue={config.defaultVehicleKmPerLiter}
                style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1' }} 
                required 
              />
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.5rem', fontSize: '0.9rem', color: '#334155' }}>Desgaste / Costo Operativo de Unidad (por Kilómetro)</label>
              <input 
                type="number" 
                name="defaultWearCostPerKm" 
                step="0.01"
                defaultValue={config.defaultWearCostPerKm}
                style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1' }} 
                required 
              />
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.5rem', fontSize: '0.9rem', color: '#334155' }}>Costo Estimado del Chofer (por Kilómetro)</label>
              <input 
                type="number" 
                name="defaultDriverCostPerKm" 
                step="0.01"
                defaultValue={config.defaultDriverCostPerKm}
                style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1' }} 
                required 
              />
            </div>

            <button 
              type="submit" 
              disabled={isPending}
              className="btn-primary" 
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.5rem', border: 'none', borderRadius: '6px', fontWeight: 'bold', alignSelf: 'flex-start', cursor: 'pointer' }}
            >
              <Save size={18} />
              {isPending ? 'Guardando...' : 'Guardar Configuración'}
            </button>
          </form>
        </div>
      )}

      {activeTab === 'evidencia' && (
        <div className="card" style={{ padding: '2rem', borderRadius: '12px', maxWidth: '650px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '0.5rem', color: '#0f172a' }}>Portal de Registro de Chofer</h2>
          <p style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
            Los choferes pueden reportar el kilometraje final del viaje, subir costos adicionales e ingresar viáticos o casetas directamente para ajustar la utilidad neta.
          </p>

          <div style={{ display: 'grid', gap: '1.5rem' }}>
            <div>
              <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.5rem', fontSize: '0.9rem', color: '#334155' }}>1. Seleccionar Embarque Activo</label>
              <select 
                onChange={(e) => {
                  const tx = transactions.find(t => t.id === e.target.value);
                  setSelectedTx(tx ? { ...tx } : null);
                }}
                style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: 'white' }}
              >
                <option value="">-- SELECCIONA EL EMBARQUE DE TU RUTA --</option>
                {transactions.filter(t => t.deliveryStatus !== 'DELIVERED').map(t => (
                  <option key={t.id} value={t.id}>{t.folio} - {t.sale?.customer?.name || 'Cliente'} ({t.distanceKm} km standard)</option>
                ))}
              </select>
            </div>

            {selectedTx && (
              <form onSubmit={async (e) => {
                e.preventDefault();
                startTransition(async () => {
                  const res = await updateFuelTransaction(selectedTx.id, {
                    distanceKm: Number(selectedTx.distanceKm),
                    extraLogisticsCost: Number(selectedTx.extraLogisticsCost),
                    evidenceNotes: selectedTx.evidenceNotes,
                    evidencePhoto: selectedTx.evidencePhoto,
                    deliveryStatus: 'DELIVERED'
                  });
                  if (res.success) {
                    alert("¡Reporte de entrega guardado! El embarque se ha marcado como Entregado.");
                    window.location.reload();
                  } else {
                    alert(`Error al registrar reporte: ${res.error}`);
                  }
                });
              }} style={{ display: 'grid', gap: '1.25rem', padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 'bold', color: '#0284c7' }}>Embarque: {selectedTx.folio}</h3>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.35rem', fontSize: '0.85rem' }}>Kilometraje Recorrido (Real)</label>
                    <input 
                      type="number" 
                      value={selectedTx.distanceKm}
                      onChange={(e) => setSelectedTx({ ...selectedTx, distanceKm: parseFloat(e.target.value) || 0 })}
                      style={{ width: '100%', padding: '0.65rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.35rem', fontSize: '0.85rem' }}>Gastos Extras Chofer (Viáticos, Casetas)</label>
                    <input 
                      type="number" 
                      value={selectedTx.extraLogisticsCost}
                      onChange={(e) => setSelectedTx({ ...selectedTx, extraLogisticsCost: parseFloat(e.target.value) || 0 })}
                      style={{ width: '100%', padding: '0.65rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                    />
                  </div>
                </div>

                <FileUploadField 
                  label="Foto de Evidencia de Entrega" 
                  value={selectedTx.evidencePhoto || ''} 
                  onChange={(e) => handleFileChange(e, 'evidencePhoto', false, true)} 
                  fieldId="driver-evidence-photo" 
                />

                <div>
                  <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.35rem', fontSize: '0.85rem' }}>Notas o Comentarios del Reporte</label>
                  <textarea 
                    rows={3}
                    placeholder="Escribe detalles del viaje o incidentes..."
                    value={selectedTx.evidenceNotes || ''}
                    onChange={(e) => setSelectedTx({ ...selectedTx, evidenceNotes: e.target.value })}
                    style={{ width: '100%', padding: '0.65rem', borderRadius: '4px', border: '1px solid #cbd5e1', fontFamily: 'inherit' }}
                  />
                </div>

                <button 
                  type="submit" 
                  disabled={isPending}
                  className="btn-primary" 
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.5rem', border: 'none', borderRadius: '6px', fontWeight: 'bold', justifySelf: 'flex-start', cursor: 'pointer', backgroundColor: '#10b981' }}
                >
                  <Check size={18} />
                  {isPending ? 'Guardando...' : 'Finalizar y Entregar Embarque'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15,23,42,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '1rem' }}>
          <div className="card" style={{ maxWidth: '600px', width: '100%', padding: '2rem', borderRadius: '12px', overflowY: 'auto', maxHeight: '90vh' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#1e293b' }}>Registrar Nuevo Embarque</h2>
              <button onClick={() => setShowCreateModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            <form onSubmit={handleCreateTx} style={{ display: 'grid', gap: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.35rem', fontSize: '0.85rem' }}>Folio Embarque (Autogenerado si está vacío)</label>
                <input 
                  type="text" 
                  placeholder="Ej. EMB-8822"
                  value={newTx.folio}
                  onChange={(e) => setNewTx({ ...newTx, folio: e.target.value })}
                  style={{ width: '100%', padding: '0.65rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.35rem', fontSize: '0.85rem' }}>Venta Asociada (Ingresos)</label>
                  <select 
                    value={newTx.saleId}
                    onChange={(e) => setNewTx({ ...newTx, saleId: e.target.value })}
                    required
                    style={{ width: '100%', padding: '0.65rem', borderRadius: '4px', border: '1px solid #cbd5e1', backgroundColor: 'white' }}
                  >
                    <option value="">-- SELECCIONA UNA VENTA --</option>
                    {unassociatedSales.map(s => (
                      <option key={s.id} value={s.id}>{s.folio || s.id.slice(0, 8)} - {s.customer?.name || 'Cliente'} (${s.total.toLocaleString()})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.35rem', fontSize: '0.85rem' }}>Compra Asociada (Costo Combustible)</label>
                  <select 
                    value={newTx.purchaseId}
                    onChange={(e) => setNewTx({ ...newTx, purchaseId: e.target.value })}
                    required
                    style={{ width: '100%', padding: '0.65rem', borderRadius: '4px', border: '1px solid #cbd5e1', backgroundColor: 'white' }}
                  >
                    <option value="">-- SELECCIONA UNA COMPRA --</option>
                    {unassociatedPurchases.map(p => (
                      <option key={p.id} value={p.id}>{p.folio || p.id.slice(0, 8)} - {p.supplier?.name || 'Proveedor'} (${p.total.toLocaleString()})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.35rem', fontSize: '0.85rem' }}>Distancia de Entrega (Km)</label>
                  <input 
                    type="number" 
                    value={newTx.distanceKm}
                    onChange={(e) => setNewTx({ ...newTx, distanceKm: parseFloat(e.target.value) || 0 })}
                    required
                    min="1"
                    style={{ width: '100%', padding: '0.65rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.35rem', fontSize: '0.85rem' }}>Costo de Combustible ($/Lt)</label>
                  <input 
                    type="number" 
                    value={newTx.fuelPricePerLiter}
                    onChange={(e) => setNewTx({ ...newTx, fuelPricePerLiter: parseFloat(e.target.value) || 0 })}
                    required
                    step="0.01"
                    style={{ width: '100%', padding: '0.65rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.35rem', fontSize: '0.85rem' }}>Rendimiento (Km/Lt)</label>
                  <input 
                    type="number" 
                    value={newTx.vehicleKmPerLiter}
                    onChange={(e) => setNewTx({ ...newTx, vehicleKmPerLiter: parseFloat(e.target.value) || 1 })}
                    required
                    step="0.1"
                    style={{ width: '100%', padding: '0.65rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.35rem', fontSize: '0.85rem' }}>Desgaste ($/Km)</label>
                  <input 
                    type="number" 
                    value={newTx.wearCostPerKm}
                    onChange={(e) => setNewTx({ ...newTx, wearCostPerKm: parseFloat(e.target.value) || 0 })}
                    required
                    step="0.01"
                    style={{ width: '100%', padding: '0.65rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.35rem', fontSize: '0.85rem' }}>Chofer ($/Km)</label>
                  <input 
                    type="number" 
                    value={newTx.driverCostPerKm}
                    onChange={(e) => setNewTx({ ...newTx, driverCostPerKm: parseFloat(e.target.value) || 0 })}
                    required
                    step="0.01"
                    style={{ width: '100%', padding: '0.65rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.35rem', fontSize: '0.85rem' }}>Gastos Extras Viáticos/Casetas ($)</label>
                <input 
                  type="number" 
                  value={newTx.extraLogisticsCost}
                  onChange={(e) => setNewTx({ ...newTx, extraLogisticsCost: parseFloat(e.target.value) || 0 })}
                  style={{ width: '100%', padding: '0.65rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <FileUploadField 
                  label="Recibo de Compra" 
                  value={newTx.purchaseReceipt || null} 
                  onChange={(e) => handleFileChange(e, 'purchaseReceipt')} 
                  fieldId="new-purchase-receipt" 
                />
                <FileUploadField 
                  label="Factura de Proveedor" 
                  value={newTx.supplierInvoice || null} 
                  onChange={(e) => handleFileChange(e, 'supplierInvoice')} 
                  fieldId="new-supplier-invoice" 
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <FileUploadField 
                  label="Doc. Embarque / Carta Porte" 
                  value={newTx.shippingDoc || null} 
                  onChange={(e) => handleFileChange(e, 'shippingDoc')} 
                  fieldId="new-shipping-doc" 
                />
                <FileUploadField 
                  label="Factura de Cliente" 
                  value={newTx.customerInvoice || null} 
                  onChange={(e) => handleFileChange(e, 'customerInvoice')} 
                  fieldId="new-customer-invoice" 
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                <button type="button" onClick={() => setShowCreateModal(false)} style={{ padding: '0.65rem 1.25rem', border: '1px solid #cbd5e1', borderRadius: '6px', background: 'none', cursor: 'pointer' }}>Cancelar</button>
                <button type="submit" disabled={isPending} className="btn-primary" style={{ padding: '0.65rem 1.75rem', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>
                  {isPending ? 'Guardando...' : 'Crear Embarque'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && editTx && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15,23,42,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '1rem' }}>
          <div className="card" style={{ maxWidth: '600px', width: '100%', padding: '2rem', borderRadius: '12px', overflowY: 'auto', maxHeight: '90vh' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#1e293b' }}>Editar Embarque: {editTx.folio}</h2>
              <button onClick={() => setShowEditModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            <form onSubmit={handleUpdateTx} style={{ display: 'grid', gap: '1.25rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.35rem', fontSize: '0.85rem' }}>Distancia Recorrida (Km)</label>
                  <input 
                    type="number" 
                    value={editTx.distanceKm}
                    onChange={(e) => setEditTx({ ...editTx, distanceKm: parseFloat(e.target.value) || 0 })}
                    required
                    style={{ width: '100%', padding: '0.65rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.35rem', fontSize: '0.85rem' }}>Costo de Combustible ($/Lt)</label>
                  <input 
                    type="number" 
                    value={editTx.fuelPricePerLiter}
                    onChange={(e) => setEditTx({ ...editTx, fuelPricePerLiter: parseFloat(e.target.value) || 0 })}
                    required
                    step="0.01"
                    style={{ width: '100%', padding: '0.65rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.35rem', fontSize: '0.85rem' }}>Rendimiento (Km/Lt)</label>
                  <input 
                    type="number" 
                    value={editTx.vehicleKmPerLiter}
                    onChange={(e) => setEditTx({ ...editTx, vehicleKmPerLiter: parseFloat(e.target.value) || 1 })}
                    required
                    step="0.1"
                    style={{ width: '100%', padding: '0.65rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.35rem', fontSize: '0.85rem' }}>Desgaste ($/Km)</label>
                  <input 
                    type="number" 
                    value={editTx.wearCostPerKm}
                    onChange={(e) => setEditTx({ ...editTx, wearCostPerKm: parseFloat(e.target.value) || 0 })}
                    required
                    step="0.01"
                    style={{ width: '100%', padding: '0.65rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.35rem', fontSize: '0.85rem' }}>Chofer ($/Km)</label>
                  <input 
                    type="number" 
                    value={editTx.driverCostPerKm}
                    onChange={(e) => setEditTx({ ...editTx, driverCostPerKm: parseFloat(e.target.value) || 0 })}
                    required
                    step="0.01"
                    style={{ width: '100%', padding: '0.65rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.35rem', fontSize: '0.85rem' }}>Gastos Extras Viáticos/Casetas ($)</label>
                <input 
                  type="number" 
                  value={editTx.extraLogisticsCost}
                  onChange={(e) => setEditTx({ ...editTx, extraLogisticsCost: parseFloat(e.target.value) || 0 })}
                  style={{ width: '100%', padding: '0.65rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.35rem', fontSize: '0.85rem' }}>Estatus de la Entrega</label>
                <select 
                  value={editTx.deliveryStatus}
                  onChange={(e) => setEditTx({ ...editTx, deliveryStatus: e.target.value })}
                  style={{ width: '100%', padding: '0.65rem', borderRadius: '4px', border: '1px solid #cbd5e1', backgroundColor: 'white' }}
                >
                  <option value="PENDING">Pendiente</option>
                  <option value="IN_TRANSIT">En Tránsito</option>
                  <option value="DELIVERED">Entregado</option>
                  <option value="CANCELLED">Cancelado</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.35rem', fontSize: '0.85rem' }}>Notas de Evidencia</label>
                <textarea 
                  rows={3}
                  value={editTx.evidenceNotes || ''}
                  onChange={(e) => setEditTx({ ...editTx, evidenceNotes: e.target.value })}
                  style={{ width: '100%', padding: '0.65rem', borderRadius: '4px', border: '1px solid #cbd5e1', fontFamily: 'inherit' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <FileUploadField 
                  label="Recibo de Compra" 
                  value={editTx.purchaseReceipt || null} 
                  onChange={(e) => handleFileChange(e, 'purchaseReceipt', true)} 
                  fieldId="edit-purchase-receipt" 
                />
                <FileUploadField 
                  label="Factura de Proveedor" 
                  value={editTx.supplierInvoice || null} 
                  onChange={(e) => handleFileChange(e, 'supplierInvoice', true)} 
                  fieldId="edit-supplier-invoice" 
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <FileUploadField 
                  label="Doc. Embarque / Carta Porte" 
                  value={editTx.shippingDoc || null} 
                  onChange={(e) => handleFileChange(e, 'shippingDoc', true)} 
                  fieldId="edit-shipping-doc" 
                />
                <FileUploadField 
                  label="Factura de Cliente" 
                  value={editTx.customerInvoice || null} 
                  onChange={(e) => handleFileChange(e, 'customerInvoice', true)} 
                  fieldId="edit-customer-invoice" 
                />
              </div>

              <FileUploadField 
                label="Foto de Evidencia de Entrega" 
                value={editTx.evidencePhoto || null} 
                onChange={(e) => handleFileChange(e, 'evidencePhoto', true)} 
                fieldId="edit-evidence-photo" 
              />

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                <button type="button" onClick={() => setShowEditModal(false)} style={{ padding: '0.65rem 1.25rem', border: '1px solid #cbd5e1', borderRadius: '6px', background: 'none', cursor: 'pointer' }}>Cancelar</button>
                <button type="submit" disabled={isPending} className="btn-primary" style={{ padding: '0.65rem 1.75rem', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>
                  {isPending ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// Premium file uploader component with Base64 preview/badge support
function FileUploadField({ 
  label, 
  value, 
  onChange, 
  fieldId 
}: { 
  label: string; 
  value: string | null; 
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; 
  fieldId: string; 
}) {
  const isLoaded = !!value;
  const isImage = value && value.startsWith('data:image/');
  
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', width: '100%' }}>
      <label style={{ display: 'block', fontWeight: '600', fontSize: '0.85rem', color: '#475569', marginBottom: '0.25rem' }}>{label}</label>
      <div style={{ 
        border: isLoaded ? '1px solid #10b981' : '1px dashed #cbd5e1', 
        borderRadius: '6px', 
        padding: '0.5rem', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        backgroundColor: isLoaded ? '#f0fdf4' : '#f8fafc',
        gap: '0.5rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: 0 }}>
          {isImage ? (
            <img src={value} alt="Preview" style={{ width: '36px', height: '36px', borderRadius: '4px', objectFit: 'cover', border: '1px solid #cbd5e1' }} />
          ) : (
            <div style={{ 
              width: '36px', 
              height: '36px', 
              borderRadius: '4px', 
              backgroundColor: isLoaded ? '#bbf7d0' : '#e2e8f0', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              fontSize: '0.65rem', 
              fontWeight: 'bold', 
              color: isLoaded ? '#166534' : '#475569',
              textAlign: 'center',
              lineHeight: '1.2'
            }}>
              {isLoaded ? 'PDF/Img' : 'VACÍO'}
            </div>
          )}
          <span style={{ fontSize: '0.8rem', color: isLoaded ? '#15803d' : '#64748b', fontWeight: isLoaded ? 'bold' : 'normal', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {isLoaded ? '✓ Archivo cargado' : 'Sin archivo seleccionado'}
          </span>
        </div>
        <label 
          htmlFor={fieldId} 
          style={{ 
            padding: '0.35rem 0.75rem', 
            backgroundColor: isLoaded ? '#dcfce7' : '#0284c7', 
            color: isLoaded ? '#15803d' : 'white', 
            borderRadius: '4px', 
            fontSize: '0.8rem', 
            fontWeight: 'bold', 
            cursor: 'pointer',
            border: 'none',
            display: 'inline-block',
            textAlign: 'center',
            userSelect: 'none'
          }}
        >
          {isLoaded ? 'Reemplazar' : 'Seleccionar'}
        </label>
        <input 
          id={fieldId}
          type="file" 
          accept="image/*,application/pdf"
          onChange={onChange}
          style={{ display: 'none' }}
        />
      </div>
    </div>
  );
}
