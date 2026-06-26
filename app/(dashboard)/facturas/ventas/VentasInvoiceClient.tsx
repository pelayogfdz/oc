'use client';

import { useState, useTransition } from 'react';
import { 
  FileText, Send, AlertTriangle, Download, Plus, Search, 
  Check, X, FileDown, Layers, Loader2, Sparkles
} from 'lucide-react';
import { stampInvoice, cancelInvoice, stampMultipleSalesInvoice } from '@/app/actions/facturacion';
import { createCustomerBilling } from '@/app/actions/customer';

interface VentasInvoiceClientProps {
  initialSales: any[];
  initialCustomers: any[];
}

export default function VentasInvoiceClient({ initialSales, initialCustomers }: VentasInvoiceClientProps) {
  const [sales, setSales] = useState<any[]>(initialSales);
  const [customers, setCustomers] = useState<any[]>(initialCustomers);
  const [selectedSaleIds, setSelectedSaleIds] = useState<string[]>([]);
  const [activeInvoicingSaleIds, setActiveInvoicingSaleIds] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [isCreatingCustomer, setIsCreatingCustomer] = useState(false);

  // New Customer Form State
  const [newCustomer, setNewCustomer] = useState({
    name: '',
    legalName: '',
    taxId: '',
    taxRegime: '601',
    zipCode: '',
    cfdiUse: 'G03',
    email: '',
    phone: ''
  });

  // Filter out sales that are already invoiced to Público en General or other, but let's show all
  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
    (c.taxId && c.taxId.toLowerCase().includes(customerSearch.toLowerCase()))
  );

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      // Select all Completed sales that don't have an invoiceId yet
      const uninvoicedIds = sales.filter(s => !s.invoiceId).map(s => s.id);
      setSelectedSaleIds(uninvoicedIds);
    } else {
      setSelectedSaleIds([]);
    }
  };

  const handleSelectSale = (saleId: string) => {
    setSelectedSaleIds(prev => 
      prev.includes(saleId) ? prev.filter(id => id !== saleId) : [...prev, saleId]
    );
  };

  const handleStampSingle = (saleId: string) => {
    if (!confirm('¿Deseas emitir la factura para esta venta ante el SAT?')) return;
    startTransition(async () => {
      const res = await stampInvoice(saleId);
      if (res.success) {
        alert('Factura emitida exitosamente. ID: ' + res.invoiceId);
        // Refresh local state
        setSales(prev => prev.map(s => s.id === saleId ? { ...s, invoiceId: res.invoiceId } : s));
      } else {
        alert('Error al timbrar factura: ' + res.error);
      }
    });
  };

  const handleCancelSingle = (saleId: string, invoiceId: string) => {
    if (!confirm('¿Estás seguro de cancelar la factura ante el SAT? Esto cancelará la factura con motivo "02" en Facturapi.')) return;
    startTransition(async () => {
      const res = await cancelInvoice(saleId);
      if (res.success) {
        alert('Factura cancelada exitosamente.');
        // Refresh local state
        setSales(prev => prev.map(s => s.id === saleId ? { ...s, invoiceId: null } : s));
      } else {
        alert('Error al cancelar factura: ' + res.error);
      }
    });
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomer.name || !newCustomer.taxId || !newCustomer.zipCode) {
      alert('Por favor completa los campos obligatorios: Razón Social, RFC y Código Postal.');
      return;
    }

    try {
      const res = await createCustomerBilling(newCustomer);
      alert('Cliente fiscal registrado exitosamente.');
      // Add to list and select it
      setCustomers(prev => [res, ...prev]);
      setSelectedCustomerId(res.id);
      setIsCreatingCustomer(false);
      // Reset form
      setNewCustomer({
        name: '',
        legalName: '',
        taxId: '',
        taxRegime: '601',
        zipCode: '',
        cfdiUse: 'G03',
        email: '',
        phone: ''
      });
    } catch (err: any) {
      alert('Error al registrar cliente: ' + err.message);
    }
  };

  const handleGroupInvoiceSubmit = () => {
    if (activeInvoicingSaleIds.length === 0) return;
    
    startTransition(async () => {
      let res;
      if (activeInvoicingSaleIds.length === 1) {
        res = await stampInvoice(activeInvoicingSaleIds[0], selectedCustomerId || null);
      } else {
        res = await stampMultipleSalesInvoice(activeInvoicingSaleIds, selectedCustomerId || null);
      }
      
      if (res.success) {
        alert('Factura emitida exitosamente. ID: ' + res.invoiceId);
        // Refresh local state
        setSales(prev => prev.map(s => activeInvoicingSaleIds.includes(s.id) ? { ...s, invoiceId: res.invoiceId } : s));
        // Remove from selected list
        setSelectedSaleIds(prev => prev.filter(id => !activeInvoicingSaleIds.includes(id)));
        setActiveInvoicingSaleIds([]);
        setIsModalOpen(false);
      } else {
        alert('Error al timbrar factura: ' + res.error);
      }
    });
  };

  const totalSelected = sales
    .filter(s => selectedSaleIds.includes(s.id))
    .reduce((acc, s) => acc + s.total, 0);

  const activeInvoicingTotal = sales
    .filter(s => activeInvoicingSaleIds.includes(s.id))
    .reduce((acc, s) => acc + s.total, 0);

  return (
    <div style={{ position: 'relative' }}>
      
      {/* Title block */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#0f172a' }}>
            <FileText size={28} color="var(--caanma-primary)" />
            Facturación de Ventas
          </h1>
          <p style={{ color: 'var(--caanma-text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            Timbra comprobantes individuales o selecciona múltiples ventas para consolidarlas en una sola factura.
          </p>
        </div>
      </div>

      {/* Floating Action Banner for Selection */}
      {selectedSaleIds.length > 0 && (
        <div style={{
          position: 'fixed',
          bottom: '2rem',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: 'rgba(15, 23, 42, 0.95)',
          backdropFilter: 'blur(10px)',
          borderRadius: '16px',
          padding: '1rem 2rem',
          display: 'flex',
          alignItems: 'center',
          gap: '2rem',
          boxShadow: '0 20px 25px -5px rgba(0,0,0,0.3), 0 10px 10px -5px rgba(0,0,0,0.3)',
          zIndex: 999,
          color: 'white',
          border: '1px solid rgba(255,255,255,0.1)',
          animation: 'slideUp 0.3s ease-out'
        }}>
          <div>
            <div style={{ fontSize: '0.8rem', opacity: 0.8, fontWeight: '500' }}>VENTAS SELECCIONADAS</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#3b82f6' }}>
              {selectedSaleIds.length} <span style={{ color: 'white', fontSize: '0.9rem', fontWeight: 'normal' }}>de contado por</span> ${totalSelected.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button 
              onClick={() => {
                setSelectedCustomerId('');
                setActiveInvoicingSaleIds(selectedSaleIds);
                setIsModalOpen(true);
              }}
              style={{
                backgroundColor: 'var(--caanma-primary)',
                color: 'white',
                border: 'none',
                padding: '0.75rem 1.5rem',
                borderRadius: '8px',
                fontWeight: 'bold',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.9rem',
                transition: 'all 0.2s'
              }}
            >
              <Layers size={18} /> Facturar Agrupadas
            </button>
            <button 
              onClick={() => setSelectedSaleIds([])}
              style={{
                backgroundColor: 'rgba(255,255,255,0.1)',
                color: '#e2e8f0',
                border: 'none',
                padding: '0.75rem',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '0.9rem',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              title="Limpiar selección"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      )}

      {/* Sales list Table Card */}
      <div className="card" style={{ padding: 0, overflow: 'hidden', border: '1px solid var(--caanma-border)' }}>
        <table className="responsive-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead style={{ backgroundColor: '#f8fafc' }}>
            <tr style={{ borderBottom: '1px solid var(--caanma-border)' }}>
              <th style={{ padding: '1rem', width: '40px', textAlign: 'center' }}>
                <input 
                  type="checkbox" 
                  onChange={handleSelectAll}
                  checked={selectedSaleIds.length > 0 && selectedSaleIds.length === sales.filter(s => !s.invoiceId).length}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
              </th>
              <th style={{ padding: '1rem', color: '#475569', fontWeight: 'bold' }}>Folio / Fecha</th>
              <th style={{ padding: '1rem', color: '#475569', fontWeight: 'bold' }}>Cliente / Método</th>
              <th style={{ padding: '1rem', color: '#475569', fontWeight: 'bold', textAlign: 'right' }}>Total</th>
              <th style={{ padding: '1rem', color: '#475569', fontWeight: 'bold', textAlign: 'center' }}>Estado SAT</th>
              <th style={{ padding: '1rem', color: '#475569', fontWeight: 'bold', textAlign: 'center' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {sales.map((sale) => {
              const isSelected = selectedSaleIds.includes(sale.id);
              const isSaleInvoiced = !!sale.invoiceId;

              return (
                <tr 
                  key={sale.id} 
                  style={{ 
                    borderBottom: '1px solid var(--caanma-border)',
                    backgroundColor: isSelected ? 'rgba(59, 130, 246, 0.03)' : 'transparent',
                    transition: 'all 0.15s'
                  }}
                >
                  <td style={{ padding: '1rem', textAlign: 'center' }}>
                    <input 
                      type="checkbox" 
                      checked={isSelected}
                      disabled={isSaleInvoiced}
                      onChange={() => handleSelectSale(sale.id)}
                      style={{ 
                        width: '18px', 
                        height: '18px', 
                        cursor: isSaleInvoiced ? 'not-allowed' : 'pointer',
                        opacity: isSaleInvoiced ? 0.3 : 1
                      }}
                    />
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ fontWeight: 'bold', color: '#0f172a' }}>#{sale.folio || sale.id.substring(0,8).toUpperCase()}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--caanma-text-muted)', marginTop: '0.2rem' }}>
                      {new Date(sale.createdAt).toLocaleDateString()} {new Date(sale.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </div>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ fontWeight: '500', color: '#1e293b' }}>
                      {sale.customer?.legalName || sale.customer?.name || 'Público en General'}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--caanma-text-muted)', display: 'flex', gap: '0.5rem', marginTop: '0.2rem' }}>
                      <span>RFC: {sale.customer?.taxId || 'XAXX010101000'}</span>
                      <span>•</span>
                      <span style={{ fontWeight: '500', color: '#2563eb' }}>
                        {sale.paymentMethod === 'CASH' ? 'Efectivo' : sale.paymentMethod === 'CARD' ? 'Tarjeta' : sale.paymentMethod === 'TRANSFER' ? 'Transf' : sale.paymentMethod}
                      </span>
                    </div>
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 'bold', color: '#0f172a' }}>
                    ${sale.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'center' }}>
                    {isSaleInvoiced ? (
                      <span style={{ 
                        display: 'inline-flex', 
                        alignItems: 'center', 
                        gap: '0.25rem', 
                        color: '#15803d', 
                        backgroundColor: '#dcfce7', 
                        padding: '0.25rem 0.75rem', 
                        borderRadius: '12px', 
                        fontSize: '0.8rem', 
                        fontWeight: 'bold' 
                      }}>
                        Facturado ✓
                      </span>
                    ) : (
                      <span style={{ 
                        color: '#94a3b8', 
                        backgroundColor: '#f1f5f9', 
                        padding: '0.25rem 0.75rem', 
                        borderRadius: '12px', 
                        fontSize: '0.8rem', 
                        fontWeight: 'bold' 
                      }}>
                        Pendiente
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'center' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
                      {isSaleInvoiced ? (
                        <>
                          <a 
                            href={`/api/facturacion/download?invoiceId=${sale.invoiceId}&format=pdf`} 
                            style={{ 
                              padding: '0.4rem 0.6rem', 
                              backgroundColor: '#fee2e2', 
                              color: '#b91c1c', 
                              borderRadius: '6px', 
                              border: 'none', 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: '0.25rem', 
                              fontSize: '0.75rem', 
                              fontWeight: 'bold', 
                              textDecoration: 'none' 
                            }} 
                            title="Descargar PDF"
                          >
                            <Download size={14} /> PDF
                          </a>
                          <a 
                            href={`/api/facturacion/download?invoiceId=${sale.invoiceId}&format=xml`} 
                            style={{ 
                              padding: '0.4rem 0.6rem', 
                              backgroundColor: '#f1f5f9', 
                              color: '#475569', 
                              borderRadius: '6px', 
                              border: 'none', 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: '0.25rem', 
                              fontSize: '0.75rem', 
                              fontWeight: 'bold', 
                              textDecoration: 'none' 
                            }} 
                            title="Descargar XML"
                          >
                            <Download size={14} /> XML
                          </a>
                          <button 
                            disabled={isPending}
                            onClick={() => handleCancelSingle(sale.id, sale.invoiceId)}
                            style={{ 
                              padding: '0.4rem 0.6rem', 
                              backgroundColor: 'rgba(239, 68, 68, 0.1)', 
                              color: '#ef4444', 
                              borderRadius: '6px', 
                              border: 'none', 
                              cursor: 'pointer',
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: '0.25rem', 
                              fontSize: '0.75rem', 
                              fontWeight: 'bold' 
                            }}
                          >
                            <AlertTriangle size={14} /> Cancelar
                          </button>
                        </>
                      ) : (
                        <button 
                          disabled={isPending}
                          onClick={() => {
                            setSelectedCustomerId(sale.customerId || '');
                            setActiveInvoicingSaleIds([sale.id]);
                            setIsModalOpen(true);
                          }}
                          style={{ 
                            padding: '0.5rem 1rem', 
                            backgroundColor: '#eff6ff', 
                            color: '#2563eb', 
                            borderRadius: '6px', 
                            border: '1px solid #bfdbfe', 
                            cursor: 'pointer', 
                            fontWeight: 'bold', 
                            fontSize: '0.8rem', 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '0.35rem' 
                          }}
                        >
                          <Send size={14} /> Facturar SAT
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {sales.length === 0 && (
              <tr>
                <td colSpan={6} style={{ padding: '4rem', textAlign: 'center', color: 'var(--caanma-text-muted)' }}>
                  <FileText size={40} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
                  No hay ventas registradas para facturar.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Group Facturacion Modal */}
      {isModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          color: '#1e293b'
        }}>
          <div className="card" style={{ 
            width: '90%', 
            maxWidth: '650px', 
            maxHeight: '90vh', 
            overflowY: 'auto', 
            padding: '2rem', 
            backgroundColor: 'white', 
            borderRadius: '16px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            position: 'relative'
          }}>
            <button 
              onClick={() => setIsModalOpen(false)}
              style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', border: 'none', background: 'none', cursor: 'pointer', color: '#64748b' }}
            >
              <X size={24} />
            </button>

            {!isCreatingCustomer ? (
              <div>
                <h3 style={{ fontSize: '1.4rem', fontWeight: 'bold', marginBottom: '0.5rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Layers size={22} color="var(--caanma-primary)" />
                  {activeInvoicingSaleIds.length === 1 ? 'Facturar Venta' : `Facturar ${activeInvoicingSaleIds.length} Ventas Agrupadas`}
                </h3>
                <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                  {activeInvoicingSaleIds.length === 1 ? 'Monto de la venta:' : 'Monto consolidado:'} <strong style={{ color: '#0f172a' }}>${activeInvoicingTotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</strong>
                </p>

                {/* Search Customer */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem' }}>
                  <label style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#475569', display: 'flex', justifyContent: 'space-between' }}>
                    <span>Selecciona el receptor fiscal:</span>
                    <button 
                      onClick={() => setIsCreatingCustomer(true)}
                      style={{ border: 'none', background: 'none', color: 'var(--caanma-primary)', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.85rem' }}
                    >
                      <Plus size={16} /> Registrar Cliente Nuevo
                    </button>
                  </label>
                  
                  <div style={{ position: 'relative' }}>
                    <Search style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} size={18} />
                    <input 
                      type="text" 
                      placeholder="Buscar por Nombre, Razón Social o RFC..."
                      value={customerSearch}
                      onChange={e => setCustomerSearch(e.target.value)}
                      style={{ width: '100%', padding: '0.75rem 0.75rem 0.75rem 2.5rem', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.9rem' }}
                    />
                  </div>

                  <div style={{ 
                    maxHeight: '200px', 
                    overflowY: 'auto', 
                    border: '1px solid #e2e8f0', 
                    borderRadius: '8px', 
                    marginTop: '0.5rem' 
                  }}>
                    {/* Default Public Option */}
                    <div 
                      onClick={() => setSelectedCustomerId('')}
                      style={{ 
                        padding: '0.75rem 1rem', 
                        cursor: 'pointer', 
                        backgroundColor: selectedCustomerId === '' ? 'rgba(59, 130, 246, 0.05)' : 'white',
                        borderBottom: '1px solid #f1f5f9',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>Público en General</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>RFC: XAXX010101000</div>
                      </div>
                      {selectedCustomerId === '' && <Check size={18} color="var(--caanma-primary)" />}
                    </div>

                    {filteredCustomers.map((c) => (
                      <div 
                        key={c.id}
                        onClick={() => setSelectedCustomerId(c.id)}
                        style={{ 
                          padding: '0.75rem 1rem', 
                          cursor: 'pointer', 
                          backgroundColor: selectedCustomerId === c.id ? 'rgba(59, 130, 246, 0.05)' : 'white',
                          borderBottom: '1px solid #f1f5f9',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>{c.legalName || c.name}</div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>RFC: {c.taxId || 'Sin RFC'}</div>
                        </div>
                        {selectedCustomerId === c.id && <Check size={18} color="var(--caanma-primary)" />}
                      </div>
                    ))}
                    {filteredCustomers.length === 0 && customerSearch !== '' && (
                      <div style={{ padding: '1rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.9rem' }}>
                        No se encontraron clientes con "{customerSearch}".
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                  <button 
                    onClick={() => setIsModalOpen(false)}
                    style={{ flex: 1, padding: '0.75rem', backgroundColor: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={handleGroupInvoiceSubmit}
                    disabled={isPending}
                    style={{ flex: 2, padding: '0.75rem', backgroundColor: 'var(--caanma-primary)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                  >
                    {isPending ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
                    {isPending ? 'Timbrando CFDI...' : 'Emitir Factura SAT'}
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Sparkles size={20} color="var(--caanma-primary)" />
                  Dar de alta Cliente Fiscal
                </h3>
                
                <form onSubmit={handleCreateCustomer} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', color: '#475569', marginBottom: '0.25rem' }}>Nombre o Razón Social *</label>
                      <input 
                        type="text" 
                        placeholder="Ej. Distribuidora S.A. de C.V."
                        value={newCustomer.name}
                        onChange={e => setNewCustomer(prev => ({ ...prev, name: e.target.value, legalName: e.target.value }))}
                        required
                        style={{ width: '100%', padding: '0.6rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.9rem' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', color: '#475569', marginBottom: '0.25rem' }}>RFC *</label>
                      <input 
                        type="text" 
                        placeholder="RFC a 12 o 13 posiciones"
                        value={newCustomer.taxId}
                        onChange={e => {
                          const newRfc = e.target.value.toUpperCase().replace(/[^A-Z0-9&]/g, '');
                          setNewCustomer(prev => {
                            let newRegime = prev.taxRegime;
                            if (newRfc.length === 13 && (prev.taxRegime === '601' || prev.taxRegime === '603')) {
                              newRegime = '605';
                            } else if (newRfc.length === 12 && (prev.taxRegime !== '601' && prev.taxRegime !== '603')) {
                              newRegime = '601';
                            }
                            return { ...prev, taxId: newRfc, taxRegime: newRegime };
                          });
                        }}
                        required
                        style={{ width: '100%', padding: '0.6rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.9rem' }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', color: '#475569', marginBottom: '0.25rem' }}>Régimen Fiscal</label>
                      <select 
                        value={newCustomer.taxRegime}
                        onChange={e => setNewCustomer(prev => ({ ...prev, taxRegime: e.target.value }))}
                        style={{ width: '100%', padding: '0.6rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.9rem', backgroundColor: 'white' }}
                      >
                        <option value="601">General de Ley Personas Morales (601)</option>
                        <option value="603">Personas Morales con Fines no Lucrativos (603)</option>
                        <option value="605">Sueldos y Salarios (605)</option>
                        <option value="606">Arrendamiento (606)</option>
                        <option value="612">Actividades Empresariales y Profesionales (612)</option>
                        <option value="616">Sin obligaciones fiscales (616)</option>
                        <option value="621">Incorporación Fiscal (621)</option>
                        <option value="626">RESICO (626)</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', color: '#475569', marginBottom: '0.25rem' }}>Código Postal *</label>
                      <input 
                        type="text" 
                        placeholder="5 dígitos"
                        value={newCustomer.zipCode}
                        onChange={e => setNewCustomer(prev => ({ ...prev, zipCode: e.target.value }))}
                        required
                        style={{ width: '100%', padding: '0.6rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.9rem' }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', color: '#475569', marginBottom: '0.25rem' }}>Uso de CFDI</label>
                      <select 
                        value={newCustomer.cfdiUse}
                        onChange={e => setNewCustomer(prev => ({ ...prev, cfdiUse: e.target.value }))}
                        style={{ width: '100%', padding: '0.6rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.9rem', backgroundColor: 'white' }}
                      >
                        <option value="G01">Adquisición de mercancías (G01)</option>
                        <option value="G03">Gastos en general (G03)</option>
                        <option value="I01">Construcciones (I01)</option>
                        <option value="I02">Mobiliario y equipo de oficina (I02)</option>
                        <option value="I03">Equipo de transporte (I03)</option>
                        <option value="I04">Equipo de cómputo y accesorios (I04)</option>
                        <option value="I08">Otra maquinaria y equipo (I08)</option>
                        <option value="D01">Honorarios médicos y dentales (D01)</option>
                        <option value="D02">Gastos médicos por incapacidad (D02)</option>
                        <option value="S01">Sin efectos fiscales (S01)</option>
                        <option value="CP01">Pagos (CP01)</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', color: '#475569', marginBottom: '0.25rem' }}>Correo Electrónico</label>
                      <input 
                        type="email" 
                        placeholder="cliente@ejemplo.com"
                        value={newCustomer.email}
                        onChange={e => setNewCustomer(prev => ({ ...prev, email: e.target.value }))}
                        style={{ width: '100%', padding: '0.6rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.9rem' }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', color: '#475569', marginBottom: '0.25rem' }}>Teléfono</label>
                    <input 
                      type="tel" 
                      placeholder="10 dígitos"
                      value={newCustomer.phone}
                      onChange={e => setNewCustomer(prev => ({ ...prev, phone: e.target.value }))}
                      style={{ width: '100%', padding: '0.6rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.9rem' }}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                    <button 
                      type="button"
                      onClick={() => setIsCreatingCustomer(false)}
                      style={{ flex: 1, padding: '0.75rem', backgroundColor: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
                    >
                      Atrás
                    </button>
                    <button 
                      type="submit"
                      style={{ flex: 1, padding: '0.75rem', backgroundColor: 'var(--caanma-primary)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
                    >
                      Registrar y Usar
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CSS style block for slideUp animation */}
      <style jsx global>{`
        @keyframes slideUp {
          from {
            transform: translate(-50%, 100%);
            opacity: 0;
          }
          to {
            transform: translate(-50%, 0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
