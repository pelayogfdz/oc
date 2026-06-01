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
  initialWholesalePrice?: number | null;
  initialSpecialPrice?: number | null;
  priceLists: PriceList[];
  initialPrices?: ProductPrice[];
}

export default function ProductFinanceSection({
  initialCost,
  initialPrice,
  initialTaxRate = 16.0,
  initialWholesalePrice,
  initialSpecialPrice,
  priceLists = [],
  initialPrices = []
}: ProductFinanceSectionProps) {
  // Base states
  const [cost, setCost] = useState<number>(initialCost);
  const [price, setPrice] = useState<number>(initialPrice);
  const [taxRate, setTaxRate] = useState<number>(initialTaxRate);
  const [wholesalePrice, setWholesalePrice] = useState<string>(
    initialWholesalePrice != null ? String(initialWholesalePrice) : ''
  );
  const [specialPrice, setSpecialPrice] = useState<string>(
    initialSpecialPrice != null ? String(initialSpecialPrice) : ''
  );

  // Helper to calculate margin from price and cost
  const getMarginFromPrice = (p: number, c: number): string => {
    if (p <= 0) return '0';
    const m = ((p - c) / p) * 100;
    return m.toFixed(1);
  };

  // Helper to calculate price from margin and cost
  const getPriceFromMargin = (m: number, c: number): number => {
    if (m >= 100) return c; // Avoid division by zero/negative
    const p = c / (1 - m / 100);
    return Math.round(p * 100) / 100;
  };

  // Base price margin state
  const [priceMargin, setPriceMargin] = useState<string>(() => 
    getMarginFromPrice(initialPrice, initialCost)
  );

  // Dynamic price lists states (stores raw input string for price and margin)
  const [listPrices, setListPrices] = useState<Record<string, { price: string; margin: string }>>(() => {
    const init: Record<string, { price: string; margin: string }> = {};
    priceLists.forEach(pl => {
      const savedPriceObj = initialPrices.find(p => p.priceListId === pl.id);
      const savedPrice = savedPriceObj ? savedPriceObj.price : 0;
      init[pl.id] = {
        price: savedPrice > 0 ? String(savedPrice) : '',
        margin: savedPrice > 0 ? getMarginFromPrice(savedPrice, initialCost) : ''
      };
    });
    return init;
  });

  // Handle Base Price change
  const handlePriceChange = (val: string) => {
    const numPrice = parseFloat(val) || 0;
    setPrice(numPrice);
    setPriceMargin(getMarginFromPrice(numPrice, cost));
  };

  // Handle Base Margin change
  const handleMarginChange = (val: string) => {
    setPriceMargin(val);
    const numMargin = parseFloat(val) || 0;
    if (numMargin < 100) {
      const calculatedPrice = getPriceFromMargin(numMargin, cost);
      setPrice(calculatedPrice);
    }
  };

  // Handle Cost change (recalculates margins for all active prices)
  const handleCostChange = (val: string) => {
    const numCost = parseFloat(val) || 0;
    setCost(numCost);

    // Update base margin based on current price and new cost
    setPriceMargin(getMarginFromPrice(price, numCost));

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
    setListPrices(prev => ({
      ...prev,
      [plId]: {
        price: val,
        margin: val !== '' ? getMarginFromPrice(numPrice, cost) : ''
      }
    }));
  };

  // Handle dynamic margin list input change
  const handleListMarginChange = (plId: string, val: string) => {
    const numMargin = parseFloat(val) || 0;
    setListPrices(prev => {
      const currentPrice = prev[plId]?.price || '';
      if (val === '') {
        return {
          ...prev,
          [plId]: { price: '', margin: '' }
        };
      }
      if (numMargin < 100) {
        const calculatedPrice = getPriceFromMargin(numMargin, cost);
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem' }}>
        {/* Costo de Reposición */}
        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', fontSize: '0.9rem', color: '#1e293b' }}>
            Costo de Reposición ($)
          </label>
          <input
            type="number"
            step="0.01"
            name="cost"
            value={cost === 0 ? '' : cost}
            onChange={e => handleCostChange(e.target.value)}
            placeholder="0.00"
            style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--pulpos-border)', outline: 'none' }}
          />
        </div>

        {/* Costo Promedio */}
        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', fontSize: '0.9rem', color: 'var(--pulpos-text-muted)' }}>
            Costo Promedio ($)
          </label>
          <input
            type="number"
            step="0.01"
            name="averageCost"
            defaultValue={initialCost}
            readOnly
            title="Se calcula ponderadamente según historial de compras"
            style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--pulpos-border)', backgroundColor: '#f3f4f6', cursor: 'not-allowed', color: 'var(--pulpos-text-muted)', outline: 'none' }}
          />
        </div>

        {/* Precio Público Normal */}
        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', fontSize: '0.9rem', color: '#1e293b' }}>
            Precio Público normal ($) *
          </label>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <input
              type="number"
              step="0.01"
              name="price"
              value={price === 0 ? '' : price}
              onChange={e => handlePriceChange(e.target.value)}
              required
              placeholder="0.00"
              style={{ flex: 2, padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--pulpos-border)', outline: 'none' }}
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
          {price > 0 && (
            <div style={{ marginTop: '0.4rem', fontSize: '0.775rem', color: (price - cost) >= 0 ? '#16a34a' : '#dc2626', fontWeight: '500' }}>
              Utilidad: ${(price - cost).toFixed(2)} ({cost > 0 ? (((price - cost) / cost) * 100).toFixed(0) : '100'}% sob. costo)
            </div>
          )}
        </div>

        {/* Impuesto / IVA */}
        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', fontSize: '0.9rem', color: '#1e293b' }}>
            Impuesto / IVA (%)
          </label>
          <input
            type="number"
            step="0.01"
            name="taxRate"
            value={taxRate}
            onChange={e => setTaxRate(parseFloat(e.target.value) || 0)}
            style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--pulpos-border)', outline: 'none' }}
          />
        </div>
      </div>

      {/* Precio Mayoreo y Precio Especial */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem' }}>
        <div></div>
        <div></div>
        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', fontSize: '0.9rem', color: 'var(--pulpos-text-muted)' }}>
            Precio Mayoreo ($)
          </label>
          <input
            type="number"
            step="0.01"
            name="wholesalePrice"
            value={wholesalePrice}
            onChange={e => setWholesalePrice(e.target.value)}
            placeholder="Opcional"
            style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--pulpos-border)', outline: 'none' }}
          />
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', fontSize: '0.9rem', color: 'var(--pulpos-text-muted)' }}>
            Precio Especial ($)
          </label>
          <input
            type="number"
            step="0.01"
            name="specialPrice"
            value={specialPrice}
            onChange={e => setSpecialPrice(e.target.value)}
            placeholder="Opcional"
            style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--pulpos-border)', outline: 'none' }}
          />
        </div>
      </div>

      {/* Dynamic Price Lists Grid */}
      {priceLists.length > 0 && (
        <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--pulpos-border)' }}>
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

                  {plVal > 0 && (
                    <div style={{ marginTop: '0.4rem', fontSize: '0.75rem', color: (plVal - cost) >= 0 ? '#16a34a' : '#dc2626', fontWeight: '500' }}>
                      Ganancia: ${(plVal - cost).toFixed(2)} ({cost > 0 ? (((plVal - cost) / cost) * 100).toFixed(0) : '100'}% util.)
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
