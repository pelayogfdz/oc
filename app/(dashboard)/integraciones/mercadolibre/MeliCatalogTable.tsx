'use client';

import React, { useState } from 'react';
import { saveMeliProductPricing } from '@/app/actions/integration';
import { Save, Edit2, X, Check, Loader2, ExternalLink } from 'lucide-react';

interface MeliCatalogTableProps {
  initialMaps: any[];
}

export default function MeliCatalogTable({ initialMaps }: MeliCatalogTableProps) {
  const [maps, setMaps] = useState(initialMaps);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form state for inline editing
  const [formData, setFormData] = useState({
    precioMeli: 0,
    comisionMeli: 0,
    envioMeli: 0,
    retencionMeli: 0,
    margenDinero: 0,
    margenPorcentaje: 0,
    isFixedPrice: false,
  });

  const [savingId, setSavingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const startEditing = (map: any) => {
    setEditingId(map.id);
    
    const cost = map.product.cost;
    const precio = map.precioMeli !== null ? map.precioMeli : map.product.price;
    const comision = map.comisionMeli || 0;
    const envio = map.envioMeli || 0;
    const retencion = map.retencionMeli || 0;
    
    // Si no tiene valores guardados, calcular el margen inicial
    const margenD = map.margenDinero || (precio - cost - comision - envio - retencion);
    const margenP = map.margenPorcentaje || (precio > 0 ? (margenD / precio) * 100 : 0);

    setFormData({
      precioMeli: Number(precio.toFixed(2)),
      comisionMeli: Number(comision.toFixed(2)),
      envioMeli: Number(envio.toFixed(2)),
      retencionMeli: Number(retencion.toFixed(2)),
      margenDinero: Number(margenD.toFixed(2)),
      margenPorcentaje: Number(margenP.toFixed(2)),
      isFixedPrice: !!map.isFixedPrice,
    });
  };

  const cancelEditing = () => {
    setEditingId(null);
  };

  // Recalculates other values when one is changed
  const handleFieldChange = (field: string, value: number | boolean, cost: number) => {
    setFormData(prev => {
      const next = { ...prev, [field]: value };

      // Convert back to numbers for calculations
      const costNum = Number(cost);
      const precio = Number(next.precioMeli) || 0;
      const comision = Number(next.comisionMeli) || 0;
      const envio = Number(next.envioMeli) || 0;
      const retencion = Number(next.retencionMeli) || 0;
      const margD = Number(next.margenDinero) || 0;
      const margP = Number(next.margenPorcentaje) || 0;

      if (field === 'precioMeli' || field === 'comisionMeli' || field === 'envioMeli' || field === 'retencionMeli') {
        // Recalculate margins based on price and deductions
        const newMargenD = precio - costNum - comision - envio - retencion;
        const newMargenP = precio > 0 ? (newMargenD / precio) * 100 : 0;
        
        next.margenDinero = Number(newMargenD.toFixed(2));
        next.margenPorcentaje = Number(newMargenP.toFixed(2));
        // Force fixed price status if they edit the price manually
        if (field === 'precioMeli') {
          next.isFixedPrice = true;
        }
      } else if (field === 'margenPorcentaje') {
        // Recalculate price and margin money based on target margin %
        // Formula: P = (Cost + Envio + Comision + Retencion) / (1 - Margin%/100)
        const divisor = 1 - (value as number / 100);
        if (divisor > 0) {
          const newPrecio = (costNum + envio + comision + retencion) / divisor;
          const newMargenD = newPrecio - costNum - comision - envio - retencion;
          
          next.precioMeli = Number(newPrecio.toFixed(2));
          next.margenDinero = Number(newMargenD.toFixed(2));
        }
        next.isFixedPrice = true;
      } else if (field === 'margenDinero') {
        // Recalculate price and margin % based on target margin money
        // Formula: P = Cost + Envio + Comision + Retencion + MargenD
        const newPrecio = costNum + envio + comision + retencion + (value as number);
        const newMargenP = newPrecio > 0 ? ((value as number) / newPrecio) * 100 : 0;

        next.precioMeli = Number(newPrecio.toFixed(2));
        next.margenPorcentaje = Number(newMargenP.toFixed(2));
        next.isFixedPrice = true;
      }

      return next;
    });
  };

  const handleSave = async (mapId: string) => {
    setSavingId(mapId);
    setMessage(null);

    const res = await saveMeliProductPricing(mapId, formData);
    
    setSavingId(null);

    if (res.success) {
      // Update local state
      setMaps(prev => prev.map(m => m.id === mapId ? {
        ...m,
        precioMeli: formData.precioMeli,
        comisionMeli: formData.comisionMeli,
        envioMeli: formData.envioMeli,
        retencionMeli: formData.retencionMeli,
        margenDinero: formData.margenDinero,
        margenPorcentaje: formData.margenPorcentaje,
        isFixedPrice: formData.isFixedPrice,
        lastSync: new Date(),
      } : m));

      setEditingId(null);
      if (res.warning) {
        setMessage({ type: 'error', text: res.warning });
      } else {
        setMessage({ type: 'success', text: 'Precios y márgenes actualizados correctamente.' });
        setTimeout(() => setMessage(null), 3000);
      }
    } else {
      setMessage({ type: 'error', text: res.error || 'Ocurrió un error al guardar los cambios.' });
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {message && (
        <div style={{ 
          padding: '1rem', 
          borderRadius: '6px', 
          fontWeight: '500',
          fontSize: '0.9rem',
          backgroundColor: message.type === 'success' ? '#dcfce7' : '#fee2e2', 
          color: message.type === 'success' ? '#15803d' : '#b91c1c',
          border: `1px solid ${message.type === 'success' ? '#bbf7d0' : '#fca5a5'}`
        }}>
          {message.text}
        </div>
      )}

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--caanma-border)', color: 'var(--caanma-text-muted)', fontWeight: 'bold' }}>
              <th style={{ padding: '0.75rem 0.5rem', minWidth: '150px' }}>Producto Local</th>
              <th style={{ padding: '0.75rem 0.5rem' }}>SKU</th>
              <th style={{ padding: '0.75rem 0.5rem' }}>Costo</th>
              <th style={{ padding: '0.75rem 0.5rem', color: '#64748b' }}>Precio Local</th>
              <th style={{ padding: '0.75rem 0.5rem', color: 'var(--caanma-primary)', minWidth: '100px' }}>Precio Venta ML</th>
              <th style={{ padding: '0.75rem 0.5rem', color: '#b91c1c', minWidth: '90px' }}>Comisión Real</th>
              <th style={{ padding: '0.75rem 0.5rem', color: '#3b82f6', minWidth: '90px' }}>Costo Envío</th>
              <th style={{ padding: '0.75rem 0.5rem', color: '#8b5cf6', minWidth: '90px' }}>Retención Imp.</th>
              <th style={{ padding: '0.75rem 0.5rem', color: '#16a34a', minWidth: '90px' }}>Margen ($)</th>
              <th style={{ padding: '0.75rem 0.5rem', color: '#16a34a', minWidth: '90px' }}>Margen (%)</th>
              <th style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>Fijo?</th>
              <th style={{ padding: '0.75rem 0.5rem', textAlign: 'center', minWidth: '100px' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {maps.map((map) => {
              const p = map.product;
              const isEditing = editingId === map.id;
              const isSaving = savingId === map.id;

              // Display values (saved state or fallback to default values)
              const dPrecio = map.precioMeli !== null ? map.precioMeli : p.price;
              const dComision = map.comisionMeli || 0;
              const dEnvio = map.envioMeli || 0;
              const dRetencion = map.retencionMeli || 0;
              const dMargenD = map.margenDinero !== null ? map.margenDinero : (dPrecio - p.cost - dComision - dEnvio - dRetencion);
              const dMargenP = map.margenPorcentaje !== null ? map.margenPorcentaje : (dPrecio > 0 ? (dMargenD / dPrecio) * 100 : 0);

              return (
                <tr key={map.id} style={{ 
                  borderBottom: '1px solid var(--caanma-border)', 
                  backgroundColor: isEditing ? '#f8fafc' : 'transparent',
                  transition: 'background-color 0.2s'
                }}>
                  {/* Name */}
                  <td style={{ padding: '0.75rem 0.5rem', fontWeight: '500' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span>{p.name}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--caanma-text-muted)' }}>
                        ID: <a href={`https://articulo.mercadolibre.com.mx/${map.externalId.replace('MLM', 'MLM-')}`} target="_blank" rel="noreferrer" style={{ color: 'var(--caanma-primary)', textDecoration: 'none' }}>{map.externalId} <ExternalLink size={10} style={{ display: 'inline' }} /></a>
                      </span>
                    </div>
                  </td>

                  {/* SKU */}
                  <td style={{ padding: '0.75rem 0.5rem', color: 'var(--caanma-text-muted)' }}>{p.sku}</td>

                  {/* Cost */}
                  <td style={{ padding: '0.75rem 0.5rem' }}>${p.cost.toFixed(2)}</td>

                  {/* Price Local */}
                  <td style={{ padding: '0.75rem 0.5rem', color: '#64748b' }}>${p.price.toFixed(2)}</td>

                  {/* Precio Venta ML */}
                  <td style={{ padding: '0.5rem 0.25rem' }}>
                    {isEditing ? (
                      <input 
                        type="number" 
                        step="0.01"
                        value={formData.precioMeli}
                        onChange={e => handleFieldChange('precioMeli', parseFloat(e.target.value) || 0, p.cost)}
                        style={{ width: '85px', padding: '0.35rem', borderRadius: '4px', border: '1px solid #cbd5e1', fontWeight: 'bold' }}
                      />
                    ) : (
                      <span style={{ fontWeight: 'bold', color: 'var(--caanma-primary)' }}>${dPrecio.toFixed(2)}</span>
                    )}
                  </td>

                  {/* Comisión Real */}
                  <td style={{ padding: '0.5rem 0.25rem' }}>
                    {isEditing ? (
                      <input 
                        type="number" 
                        step="0.01"
                        value={formData.comisionMeli}
                        onChange={e => handleFieldChange('comisionMeli', parseFloat(e.target.value) || 0, p.cost)}
                        style={{ width: '75px', padding: '0.35rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                      />
                    ) : (
                      <span>${dComision.toFixed(2)}</span>
                    )}
                  </td>

                  {/* Costo Envío */}
                  <td style={{ padding: '0.5rem 0.25rem' }}>
                    {isEditing ? (
                      <input 
                        type="number" 
                        step="0.01"
                        value={formData.envioMeli}
                        onChange={e => handleFieldChange('envioMeli', parseFloat(e.target.value) || 0, p.cost)}
                        style={{ width: '75px', padding: '0.35rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                      />
                    ) : (
                      <span>${dEnvio.toFixed(2)}</span>
                    )}
                  </td>

                  {/* Retención Imp. */}
                  <td style={{ padding: '0.5rem 0.25rem' }}>
                    {isEditing ? (
                      <input 
                        type="number" 
                        step="0.01"
                        value={formData.retencionMeli}
                        onChange={e => handleFieldChange('retencionMeli', parseFloat(e.target.value) || 0, p.cost)}
                        style={{ width: '75px', padding: '0.35rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                      />
                    ) : (
                      <span>${dRetencion.toFixed(2)}</span>
                    )}
                  </td>

                  {/* Margen ($) */}
                  <td style={{ padding: '0.5rem 0.25rem' }}>
                    {isEditing ? (
                      <input 
                        type="number" 
                        step="0.01"
                        value={formData.margenDinero}
                        onChange={e => handleFieldChange('margenDinero', parseFloat(e.target.value) || 0, p.cost)}
                        style={{ width: '75px', padding: '0.35rem', borderRadius: '4px', border: '1px solid #cbd5e1', color: '#16a34a', fontWeight: '500' }}
                      />
                    ) : (
                      <span style={{ color: dMargenD >= 0 ? '#16a34a' : '#ef4444', fontWeight: '500' }}>
                        ${dMargenD.toFixed(2)}
                      </span>
                    )}
                  </td>

                  {/* Margen (%) */}
                  <td style={{ padding: '0.5rem 0.25rem' }}>
                    {isEditing ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <input 
                          type="number" 
                          step="0.1"
                          value={formData.margenPorcentaje}
                          onChange={e => handleFieldChange('margenPorcentaje', parseFloat(e.target.value) || 0, p.cost)}
                          style={{ width: '65px', padding: '0.35rem', borderRadius: '4px', border: '1px solid #cbd5e1', color: '#16a34a', fontWeight: '500' }}
                        />
                        <span>%</span>
                      </div>
                    ) : (
                      <span style={{ color: dMargenP >= 0 ? '#16a34a' : '#ef4444', fontWeight: '500' }}>
                        {dMargenP.toFixed(1)}%
                      </span>
                    )}
                  </td>

                  {/* Fijo? */}
                  <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>
                    {isEditing ? (
                      <input 
                        type="checkbox"
                        checked={formData.isFixedPrice}
                        onChange={e => setFormData(prev => ({ ...prev, isFixedPrice: e.target.checked }))}
                        style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                      />
                    ) : (
                      <span style={{ 
                        display: 'inline-block', 
                        padding: '0.1rem 0.35rem', 
                        borderRadius: '4px', 
                        fontSize: '0.7rem', 
                        fontWeight: 'bold',
                        backgroundColor: map.isFixedPrice ? '#fef3c7' : '#f1f5f9',
                        color: map.isFixedPrice ? '#d97706' : '#64748b'
                      }}>
                        {map.isFixedPrice ? 'SÍ' : 'NO'}
                      </span>
                    )}
                  </td>

                  {/* Actions */}
                  <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>
                    {isEditing ? (
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                        <button 
                          onClick={() => handleSave(map.id)}
                          disabled={isSaving}
                          className="btn-primary"
                          style={{ padding: '0.4rem 0.6rem', borderRadius: '4px', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                          {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                        </button>
                        <button 
                          onClick={cancelEditing}
                          disabled={isSaving}
                          style={{ padding: '0.4rem 0.6rem', borderRadius: '4px', border: '1px solid #cbd5e1', backgroundColor: 'white', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <button 
                        onClick={() => startEditing(map)}
                        style={{ padding: '0.4rem 0.75rem', borderRadius: '4px', border: '1px solid #cbd5e1', backgroundColor: 'white', color: 'var(--caanma-text)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', fontWeight: 'bold' }}
                      >
                        <Edit2 size={12} /> Editar
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
