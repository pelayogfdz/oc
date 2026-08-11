'use client';

import { useState, useEffect } from 'react';
import { Percent } from 'lucide-react';

interface PriceList {
  id: string;
  name: string;
}

interface ProductPrice {
  priceListId: string;
  price: number;
}

interface ProductFinanceSectionProps {
  initialCost: number;
  initialPrice: number;
  initialTaxRate?: number;
  initialTaxType?: string;
  initialIepsRate?: number;
  initialWholesalePrice?: number | null;
  initialSpecialPrice?: number | null;
  priceLists: PriceList[];
  initialPrices?: ProductPrice[];
}

export default function ProductFinanceSection({
  initialCost,
  initialPrice,
  initialTaxRate = 16.0,
  initialTaxType = 'IVA',
  initialIepsRate = 0.0,
  initialWholesalePrice,
  initialSpecialPrice,
  priceLists = [],
  initialPrices = []
}: ProductFinanceSectionProps) {
  // Base states
  const [cost, setCost] = useState<string | number>(initialCost);
  const [price, setPrice] = useState<string | number>(initialPrice);
  const [taxRate, setTaxRate] = useState<number>(initialTaxRate);
  const [taxType, setTaxType] = useState<string>(initialTaxType);
  const [iepsRate, setIepsRate] = useState<number>(initialIepsRate);
  const [wholesalePrice, setWholesalePrice] = useState<string>(
    initialWholesalePrice != null ? String(initialWholesalePrice) : ''
  );
  const [specialPrice, setSpecialPrice] = useState<string>(
    initialSpecialPrice != null ? String(initialSpecialPrice) : ''
  );

  const getTaxMultiplier = (type = taxType, rate = taxRate, ieps = iepsRate): number => {
    if (type === 'IVA') {
      return 1 + (rate / 100);
    } else if (type === 'IEPS') {
      return 1 + (ieps / 100);
    } else if (type === 'IVA_IEPS') {
      return (1 + (ieps / 100)) * (1 + (rate / 100));
    }
    return 1;
  };

  // Helper to calculate margin from price (con IVA) and cost (sin IVA)
  const getMarginFromPrice = (pCon: number, cSin: number, type = taxType, rate = taxRate, ieps = iepsRate): string => {
    const mult = getTaxMultiplier(type, rate, ieps);
    const pSin = pCon / mult;
    if (pSin <= 0) return '0';
    const m = ((pSin - cSin) / pSin) * 100;
    return m.toFixed(1);
  };

  // Helper to calculate price (con IVA) from margin and cost (sin IVA)
  const getPriceFromMargin = (m: number, cSin: number, type = taxType, rate = taxRate, ieps = iepsRate): number => {
    if (m >= 100) return cSin * getTaxMultiplier(type, rate, ieps); // Avoid division by zero
    const pSin = cSin / (1 - m / 100);
    const pCon = pSin * getTaxMultiplier(type, rate, ieps);
    return Math.round(pCon * 100) / 100;
  };

  // Base price margin state
  const [priceMargin, setPriceMargin] = useState<string>(() => 
    getMarginFromPrice(initialPrice, initialCost, initialTaxType, initialTaxRate, initialIepsRate)
  );

  // Dynamic price lists states (stores raw input string for price and margin)
  const [listPrices, setListPrices] = useState<Record<string, { price: string; margin: string }>>(() => {
    const init: Record<string, { price: string; margin: string }> = {};
    priceLists.forEach(pl => {
      const savedPriceObj = initialPrices.find(p => p.priceListId === pl.id);
      const savedPrice = savedPriceObj ? savedPriceObj.price : 0;
      init[pl.id] = {
        price: savedPrice > 0 ? String(savedPrice) : '',
        margin: savedPrice > 0 ? getMarginFromPrice(savedPrice, initialCost, initialTaxType, initialTaxRate, initialIepsRate) : ''
      };
    });
    return init;
  });

  // Recalculate margins when tax settings change
  useEffect(() => {
    const numCost = parseFloat(String(cost)) || 0;
    const numPrice = parseFloat(String(price)) || 0;
    setPriceMargin(getMarginFromPrice(numPrice, numCost));

    setListPrices(prev => {
      const updated = { ...prev };
      priceLists.forEach(pl => {
        const currentPl = prev[pl.id];
        if (currentPl && currentPl.price !== '') {
          const numPlPrice = parseFloat(currentPl.price) || 0;
          updated[pl.id] = {
            price: currentPl.price,
            margin: getMarginFromPrice(numPlPrice, numCost)
          };
        }
      });
      return updated;
    });
  }, [taxRate, taxType, iepsRate]);

  // Handle Base Price change
  const handlePriceChange = (val: string) => {
    setPrice(val);
    const numPrice = parseFloat(val) || 0;
    const numCost = parseFloat(String(cost)) || 0;
    setPriceMargin(getMarginFromPrice(numPrice, numCost));
  };

  // Handle Base Margin change
  const handleMarginChange = (val: string) => {
    setPriceMargin(val);
    const numMargin = parseFloat(val) || 0;
    const numCost = parseFloat(String(cost)) || 0;
    if (numMargin < 100) {
      const calculatedPrice = getPriceFromMargin(numMargin, numCost);
      setPrice(calculatedPrice);
    }
  };

  // Handle Cost change (recalculates margins for all active prices)
  const handleCostChange = (val: string) => {
    setCost(val);
    const numCost = parseFloat(val) || 0;
    const numPrice = parseFloat(String(price)) || 0;

    // Update base margin based on current price and new cost
    setPriceMargin(getMarginFromPrice(numPrice, numCost));

    // Update all dynamic price list margins based on their current price and new cost
    setListPrices(prev => {
      const updated = { ...prev };
      priceLists.forEach(pl => {
        const currentPl = prev[pl.id];
        if (currentPl && currentPl.price !== '') {
          const numPlPrice = parseFloat(currentPl.price) || 0;
          updated[pl.id] = {
            price: currentPl.price,
            margin: getMarginFromPrice(numPlPrice, numCost)
          };
        }
      });
      return updated;
    });
  };

  // Handle dynamic price list input change
  const handleListPriceChange = (plId: string, val: string) => {
    const numPrice = parseFloat(val) || 0;
    const numCost = parseFloat(String(cost)) || 0;
    setListPrices(prev => ({
      ...prev,
      [plId]: {
        price: val,
        margin: val !== '' ? getMarginFromPrice(numPrice, numCost) : ''
      }
    }));
  };

  // Handle dynamic margin list input change
  const handleListMarginChange = (plId: string, val: string) => {
    const numMargin = parseFloat(val) || 0;
    const numCost = parseFloat(String(cost)) || 0;
    setListPrices(prev => {
      if (val === '') {
        return {
          ...prev,
          [plId]: { price: '', margin: '' }
        };
      }
      if (numMargin < 100) {
        const calculatedPrice = getPriceFromMargin(numMargin, numCost);
        return {
          ...prev,
          [plId]: {
            price: String(calculatedPrice),
            margin: val
          }
        };
      }
      return prev;
    });
  };

  const parsedPrice = parseFloat(String(price)) || 0;
  const parsedCost = parseFloat(String(cost)) || 0;

  const taxMultiplier = getTaxMultiplier();
  const costConIva = parsedCost * taxMultiplier;
  const priceSinIva = parsedPrice / taxMultiplier;
  const realUtility = priceSinIva - parsedCost;
  const realMarkupPct = parsedCost > 0 ? (realUtility / parsedCost) * 100 : 100;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem' }}>
        {/* Costo de Reposición */}
        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', fontSize: '0.9rem', color: '#1e293b' }}>
            Costo de Reposición (Sin IVA) ($)
          </label>
          <input
            type="number"
            step="0.01"
            name="cost"
            value={cost}
            onChange={e => handleCostChange(e.target.value)}
            placeholder="0.00"
            style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--caanma-border)', outline: 'none' }}
          />
          {parsedCost > 0 && (
            <div style={{ marginTop: '0.4rem', fontSize: '0.775rem', color: '#64748b', fontWeight: '500' }}>
              Con impuestos/IVA: <strong style={{ color: '#334155' }}>${costConIva.toFixed(2)}</strong>
            </div>
          )}
        </div>

        {/* Costo Promedio */}
        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', fontSize: '0.9rem', color: 'var(--caanma-text-muted)' }}>
            Costo Promedio (Sin IVA) ($)
          </label>
          <input
            type="number"
            step="0.01"
            name="averageCost"
            defaultValue={initialCost}
            readOnly
            title="Se calcula ponderadamente según historial de compras"
            style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--caanma-border)', backgroundColor: '#f3f4f6', cursor: 'not-allowed', color: 'var(--caanma-text-muted)', outline: 'none' }}
          />
          {initialCost > 0 && (
            <div style={{ marginTop: '0.4rem', fontSize: '0.775rem', color: '#64748b', fontWeight: '500' }}>
              Con impuestos/IVA: <strong style={{ color: '#334155' }}>${(initialCost * taxMultiplier).toFixed(2)}</strong>
            </div>
          )}
        </div>

        {/* Precio Público Normal */}
        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', fontSize: '0.9rem', color: '#1e293b' }}>
            Precio Público normal (Con IVA) ($) *
          </label>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <input
              type="number"
              step="0.01"
              name="price"
              value={price}
              onChange={e => handlePriceChange(e.target.value)}
              required
              placeholder="0.00"
              style={{ flex: 2, padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--caanma-border)', outline: 'none' }}
            />
            <div style={{ display: 'flex', alignItems: 'center', flex: 1, position: 'relative' }}>
              <input
                type="number"
                step="0.1"
                value={priceMargin}
                onChange={e => handleMarginChange(e.target.value)}
                placeholder="Margen"
                style={{ width: '100%', padding: '0.75rem 1.5rem 0.75rem 0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none', textAlign: 'right', fontSize: '0.85rem' }}
              />
              <span style={{ position: 'absolute', right: '6px', color: '#94a3b8', fontSize: '0.85rem' }}>%</span>
            </div>
          </div>
          {parsedPrice > 0 && (
            <div style={{ marginTop: '0.4rem', display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
              <div style={{ fontSize: '0.775rem', color: '#64748b', fontWeight: '500' }}>
                Precio antes de IVA: <strong style={{ color: '#334155' }}>${priceSinIva.toFixed(2)}</strong>
              </div>
              <div style={{ fontSize: '0.775rem', color: realUtility >= 0 ? '#16a34a' : '#dc2626', fontWeight: '600' }}>
                Utilidad real (sin IVA): ${realUtility.toFixed(2)} ({realMarkupPct.toFixed(0)}% sob. costo)
              </div>
            </div>
          )}
        </div>

        {/* Impuesto / IVA */}
        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', fontSize: '0.9rem', color: '#1e293b' }}>
            Impuestos Causados
          </label>
          <select
            value={taxType}
            onChange={e => setTaxType(e.target.value)}
            style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--caanma-border)', outline: 'none', backgroundColor: 'white', fontSize: '0.85rem' }}
          >
            <option value="IVA">IVA</option>
            <option value="IEPS">IEPS</option>
            <option value="IVA_IEPS">IVA + IEPS</option>
            <option value="NONE">Exento / Ninguno</option>
          </select>
          <input type="hidden" name="taxType" value={taxType} />
        </div>

        {(taxType === 'IVA' || taxType === 'IVA_IEPS') && (
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', fontSize: '0.9rem', color: '#1e293b' }}>
              IVA (%)
            </label>
            <input
              type="number"
              step="0.01"
              name="taxRate"
              value={taxRate}
              onChange={e => setTaxRate(parseFloat(e.target.value) || 0)}
              style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--caanma-border)', outline: 'none' }}
            />
          </div>
        )}
        {!(taxType === 'IVA' || taxType === 'IVA_IEPS') && (
          <input type="hidden" name="taxRate" value={0} />
        )}

        {(taxType === 'IEPS' || taxType === 'IVA_IEPS') && (
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', fontSize: '0.9rem', color: '#1e293b' }}>
              IEPS (%)
            </label>
            <input
              type="number"
              step="0.01"
              name="iepsRate"
              value={iepsRate}
              onChange={e => setIepsRate(parseFloat(e.target.value) || 0)}
              style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--caanma-border)', outline: 'none' }}
            />
          </div>
        )}
        {!(taxType === 'IEPS' || taxType === 'IVA_IEPS') && (
          <input type="hidden" name="iepsRate" value={0} />
        )}
      </div>

      {/* Deprecated static wholesale and special price fields (replaced by dynamic price lists) */}
      <input type="hidden" name="wholesalePrice" value={wholesalePrice} />
      <input type="hidden" name="specialPrice" value={specialPrice} />

      {/* Dynamic Price Lists Grid */}
      {priceLists.length > 0 && (
        <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--caanma-border)' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: '700', color: '#475569', marginBottom: '1rem' }}>
            📋 Listas de Precios Dinámicas
          </h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
            {priceLists.map(pl => {
              const currentPl = listPrices[pl.id] || { price: '', margin: '' };
              const plVal = parseFloat(currentPl.price) || 0;

              return (
                <div key={pl.id} style={{ padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', fontSize: '0.85rem', color: '#475569' }}>
                    {pl.name}
                  </label>
                  
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', flex: 2, position: 'relative' }}>
                      <span style={{ position: 'absolute', left: '8px', color: '#64748b', fontSize: '0.85rem' }}>$</span>
                      <input
                        type="number"
                        step="0.01"
                        name={`priceList_${pl.id}`}
                        value={currentPl.price}
                        onChange={e => handleListPriceChange(pl.id, e.target.value)}
                        placeholder="0.00 (Opcional)"
                        style={{ width: '100%', padding: '0.5rem 0.5rem 0.5rem 1.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.875rem' }}
                      />
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', flex: 1, position: 'relative' }}>
                      <input
                        type="number"
                        step="0.1"
                        value={currentPl.margin}
                        onChange={e => handleListMarginChange(pl.id, e.target.value)}
                        placeholder="Margen"
                        style={{ width: '100%', padding: '0.5rem 1.25rem 0.5rem 0.4rem', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none', textAlign: 'right', fontSize: '0.825rem' }}
                      />
                      <span style={{ position: 'absolute', right: '4px', color: '#94a3b8', fontSize: '0.8rem' }}>%</span>
                    </div>
                  </div>

                  {plVal > 0 && (() => {
                    const plPriceSinIva = plVal / taxMultiplier;
                    const plRealUtility = plPriceSinIva - parsedCost;
                    const plMarkupPct = parsedCost > 0 ? (plRealUtility / parsedCost) * 100 : 100;
                    return (
                      <div style={{ marginTop: '0.4rem', display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '500' }}>
                          Antes de IVA: <strong style={{ color: '#334155' }}>${plPriceSinIva.toFixed(2)}</strong>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: plRealUtility >= 0 ? '#16a34a' : '#dc2626', fontWeight: '600' }}>
                          Ganancia real: ${plRealUtility.toFixed(2)} ({plMarkupPct.toFixed(0)}% util.)
                        </div>
                      </div>
                    );
                  })()}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
