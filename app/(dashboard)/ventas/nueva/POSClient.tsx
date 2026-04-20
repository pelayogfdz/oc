'use client';
import { useState, useMemo, useEffect } from 'react';
import { createSale } from '@/app/actions/sale';
import { createQuote, getQuoteForPOS } from '@/app/actions/quote';
import { searchProducts } from '@/app/actions/product';
import { useSearchParams } from 'next/navigation';
import { useOfflineSync } from '@/app/components/OfflineSyncProvider';

export default function POSClient({ products: initialProducts, customers, promotions = [], mode = "SALE", sessionId, branchId, ticketConfig = {}, metodosConfig = {}, ventasConfig = {}, dynamicPriceLists = [], pendingQuotes = [] }: { products: any[], customers: any[], promotions?: any[], mode?: "SALE" | "QUOTE", sessionId?: string, branchId: string, ticketConfig?: any, metodosConfig?: any, ventasConfig?: any, dynamicPriceLists?: any[], pendingQuotes?: any[] }) {
  const searchParams = useSearchParams();
  const { isOnline, pushOfflineSale } = useOfflineSync();
  const [cart, setCart] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [priceList, setPriceList] = useState('price');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [displayedProducts, setDisplayedProducts] = useState<any[]>(initialProducts);
  
  // Offline Data Mirrors
  const [activeCustomers, setActiveCustomers] = useState<any[]>(customers);
  
  useEffect(() => {
    if (!isOnline) {
      import('@/lib/offlineDB').then(({ db }) => {
        db.customers.toArray().then(res => setActiveCustomers(res.length ? res : customers));
        db.products.orderBy('name').limit(50).toArray().then(res => {
          if (res.length) setDisplayedProducts(res);
        });
      });
    } else {
      setActiveCustomers(customers);
      if (searchTerm === '') setDisplayedProducts(initialProducts);
    }
  }, [isOnline, customers, initialProducts, searchTerm]);

  // Advanced POS State
  const [stockFilter, setStockFilter] = useState<'ALL' | 'IN_STOCK' | 'OUT_OF_STOCK'>('ALL');
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  
  // Checkout Modal State
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [documentType, setDocumentType] = useState<'TICKET' | 'FACTURA'>('TICKET');
  
  // Billing Data State (for Factura)
  const [billRfc, setBillRfc] = useState('');
  const [billName, setBillName] = useState('');
  const [billZipCode, setBillZipCode] = useState('');
  const [billRegime, setBillRegime] = useState('601'); // General de Ley Personas Morales
  const [billUse, setBillUse] = useState('G03'); // Gastos en general
  
  // Load Quote State
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
  const [quoteSearchId, setQuoteSearchId] = useState('');
  const [isLoadingQuote, setIsLoadingQuote] = useState(false);

  // Variant Selection State
  const [selectedProductForVariant, setSelectedProductForVariant] = useState<any | null>(null);

  // Tips State
  const [tipAmount, setTipAmount] = useState<number>(0);
  
  // Manual Discount State
  const [manualDiscountType, setManualDiscountType] = useState<'$' | '%'>('$');
  const [manualDiscountValue, setManualDiscountValue] = useState<number | ''>('');

  
  const customMethods = (Array.isArray(metodosConfig?.methods) && metodosConfig.methods.length > 0) 
     ? metodosConfig.methods 
     : [{ id: 'CASH', name: 'Efectivo' }, { id: 'CARD', name: 'Tarjeta' }, { id: 'TRANSFER', name: 'Transferencia' }];

  const [paymentMethod, setPaymentMethod] = useState(customMethods[0]?.id || 'CASH');
  
  const selectedCust = activeCustomers.find((c: any) => c.id === selectedCustomerId);
  const allowedMethods = [...customMethods];
  if (selectedCust && selectedCust.creditLimit > 0) {
    allowedMethods.push({ id: 'CREDIT', name: 'Crédito Cta.' });
  }
  allowedMethods.push({ id: 'MIXTO', name: 'Mixto' });

  const [amountReceived, setAmountReceived] = useState<number | ''>(''); // Used for pure CASH or MIXED cash amount
  const [cardAmount, setCardAmount] = useState<number | ''>(''); // Used for MIXED
  const [notes, setNotes] = useState<string>('');

  const handleCustomerChange = (customerId: string) => {
    setSelectedCustomerId(customerId);
    const customer = activeCustomers.find((c: any) => c.id === customerId);
    if (customer && customer.priceList) {
      setPriceList(customer.priceList || 'price');
    } else {
      setPriceList('price');
    }
    
    // Auto-fill billing data if available
    if (customer) {
       setBillRfc(customer.taxId || '');
       setBillName(customer.legalName || customer.name || '');
       setBillZipCode(customer.zipCode || '');
       if (customer.taxRegime) setBillRegime(customer.taxRegime);
       if (customer.cfdiUse) setBillUse(customer.cfdiUse);
    } else {
       setBillRfc('');
       setBillName('');
       setBillZipCode('');
    }
  };

  const handleLoadQuote = async (incomingId?: string) => {
    const idToLoad = incomingId || quoteSearchId.trim();
    if (!idToLoad) return;
    
    setIsLoadingQuote(true);
    try {
      const quote = await getQuoteForPOS(idToLoad);
      
      // Load cart
      const newCart = quote.items.map((item: any) => ({
        ...item.product,
        cartItemId: Math.random().toString(36).substr(2, 9),
        quantity: item.quantity,
        cartPrice: item.price
      }));
      setCart(newCart);
      
      // Load Customer
      if (quote.customerId) {
        handleCustomerChange(quote.customerId);
      }
      
      setIsQuoteModalOpen(false);
      setQuoteSearchId('');
      if (!incomingId) alert("Cotización cargada correctamente.");
    } catch (e: any) {
      alert("Error al cargar la cotización: " + e.message);
    } finally {
      setIsLoadingQuote(false);
    }
  };

  useEffect(() => {
    const qId = searchParams.get('quoteId');
    if (qId) {
      handleLoadQuote(qId);
    }
  }, [searchParams]);


  
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      setIsSearching(true);
      try {
        if (!isOnline && searchTerm.trim() !== '') {
           const { db } = await import('@/lib/offlineDB');
           const lowerTerm = searchTerm.toLowerCase();
           const results = await db.products.filter(p => 
             p.name.toLowerCase().includes(lowerTerm) || 
             (p.sku && p.sku.toLowerCase().includes(lowerTerm)) || 
             (p.barcode && p.barcode.includes(lowerTerm))
           ).limit(50).toArray();
           setDisplayedProducts(results);
        } else if (searchTerm.trim() !== '') {
           const results = await searchProducts(searchTerm, branchId);
           setDisplayedProducts(results);
        } else {
           if (isOnline) setDisplayedProducts(initialProducts);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, branchId]);

  const getProductPrice = (prod: any) => {
    // Dynamic price lists check
    if (priceList.startsWith('priceList_')) {
      const plId = priceList.replace('priceList_', '');
      const dynamicPrice = prod.prices?.find((p: any) => p.priceListId === plId);
      if (dynamicPrice) return dynamicPrice.price;
    }
    
    // Legacy fallback (optional since we're using dynamic mostly)
    if (priceList === 'wholesalePrice' && prod.wholesalePrice) return prod.wholesalePrice;
    if (priceList === 'specialPrice' && prod.specialPrice) return prod.specialPrice;
    
    return prod.price;
  };

  const handleProductClick = (product: any) => {
    if (product.variants && product.variants.length > 0) {
      setSelectedProductForVariant(product);
    } else {
      addToCart(product);
    }
  };

  const addToCart = (product: any, variant: any = null) => {
    // Vender Sin Stock validation
    if (ventasConfig.venderSinStock === false && mode === 'SALE') {
       const checkStock = variant ? variant.stock : product.stock;
       const exists = cart.find(item => item.cartItemId === (variant ? `v_${variant.id}` : product.id));
       const incomingReq = exists ? exists.quantity + 1 : 1;
       if (checkStock < incomingReq) {
          alert('STOCK INSUFICIENTE. Habilite "Vender en Negativo" en Preferencias para saltar esta restricción.');
          return;
       }
    }

    // Generate a unique ID for the cart item based on whether it has a variant
    const cartItemId = variant ? `v_${variant.id}` : product.id;
    const cartItemName = variant ? `${product.name} (${variant.attribute})` : product.name;
    const cartItemSku = variant && variant.sku ? variant.sku : product.sku;
    
    const exists = cart.find(item => item.cartItemId === cartItemId);
    
    if (exists) {
      setCart(cart.map(item => item.cartItemId === cartItemId ? { ...item, quantity: item.quantity + 1 } : item));
    } else {
      setCart([...cart, { 
        ...product, 
        cartItemId, 
        name: cartItemName, 
        sku: cartItemSku,
        variantId: variant ? variant.id : null,
        quantity: 1 
      }]);
    }
  };

  // Recalculate total dynamically with active price list
  const subTotal = useMemo(() => cart.reduce((sum, item) => sum + (getProductPrice(item) * item.quantity), 0), [cart, priceList]);
  
  const discount = useMemo(() => {
    let d = 0;
    promotions.forEach(promo => {
      const meta = promo.metadata ? JSON.parse(promo.metadata) : { targetType: 'ALL' };
      
      let applicableCartItems = cart;
      
      if (meta.targetType === 'CATEGORY') {
        applicableCartItems = cart.filter(item => meta.applyToCategories?.includes(item.category));
      } else if (meta.targetType === 'BRAND') {
        applicableCartItems = cart.filter(item => meta.applyToBrands?.includes(item.brand));
      } else if (meta.targetType === 'PRODUCTS') {
        applicableCartItems = cart.filter(item => meta.applyToProducts?.includes(item.id));
      }
      
      const applicableSubTotal = applicableCartItems.reduce((sum, item) => sum + (getProductPrice(item) * item.quantity), 0);
      const applicableQuantity = applicableCartItems.reduce((sum, item) => sum + item.quantity, 0);

      if (applicableSubTotal > 0) {
        if (promo.type === 'PERCENTAGE') {
          d += applicableSubTotal * (promo.value / 100);
        } else if (promo.type === 'FIXED_AMOUNT') { // updated to match FIXED_AMOUNT
          // Apply fixed amount once if valid
          d += promo.value;
        } else if (promo.type === 'BOGO') {
          // BOGO Logic: Group by product to handle 2x1. For every 2 items of the same applicable product, 1 is free (the cheapest if mixed, but since it's grouped by product, it's the product price).
          // Assuming simple 2x1 for now where `promo.value` could represent N (pay N, get 1 free). But default is 2x1 so pay 1 get 1 free.
          applicableCartItems.forEach(item => {
             const freeItems = Math.floor(item.quantity / 2);
             if (freeItems > 0) {
               d += freeItems * getProductPrice(item);
             }
          });
        }
      }
    });
    
    if (typeof manualDiscountValue === 'number' && manualDiscountValue > 0) {
      if (manualDiscountType === '$') {
        d += manualDiscountValue;
      } else {
        d += subTotal * (manualDiscountValue / 100);
      }
    }
    
    return d > subTotal ? subTotal : d;
  }, [subTotal, cart, promotions, manualDiscountValue, manualDiscountType]);

  let total = subTotal - discount;
  if (ventasConfig.redondeo === 'redondeo_50') total = Math.round(total * 2) / 2;
  if (ventasConfig.redondeo === 'redondeo_100') total = Math.round(total);
  
  const totalCost = useMemo(() => cart.reduce((sum, item) => sum + (parseFloat(item.cost || '0') * item.quantity), 0), [cart]);
  const estimatedProfit = total > 0 ? (total - totalCost) : 0;
  const marginPct = (total > 0 && totalCost > 0) ? ((estimatedProfit / total) * 100).toFixed(1) : (total > 0 ? '100' : '0'); 
  const markupPct = totalCost > 0 ? ((estimatedProfit / totalCost) * 100).toFixed(1) : (total > 0 ? '100' : '0');

  const finalTotalWithTip = total + tipAmount;

  const change = (typeof amountReceived === 'number' ? amountReceived : 0) - finalTotalWithTip;

  const printTicket = (cartItems: any[], tTotal: number, tChange: number, tDiscount: number, saleId?: string) => {
    // Generate inner styling for the ticket
    const style = `
      body { font-family: 'Courier New', Courier, monospace; font-size: 14px; margin: 0; padding: 10px; color: #000; width: 300px; }
      .t-header { text-align: center; margin-bottom: 10px; }
      .t-title { font-size: 18px; font-weight: bold; margin-bottom: 4px; }
      .t-line { font-size: 12px; margin-bottom: 2px; }
      .t-divider { border-top: 1px dashed #000; margin: 10px 0; }
      .t-body { font-size: 12px; margin-bottom: 10px; }
      .info-row { display: flex; justify-content: space-between; margin-bottom: 2px; }
      .items-table { width: 100%; font-size: 12px; }
      .item-head { display: flex; justify-content: space-between; font-weight: bold; margin-bottom: 5px; }
      .item-row { display: flex; justify-content: space-between; margin-bottom: 4px; }
      .col-cant { width: 40px; }
      .col-desc { flex: 1; margin: 0 10px; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
      .col-price { width: 60px; text-align: right; }
      .totals { font-size: 14px; font-weight: bold; margin-top: 10px; }
      .total-row { display: flex; justify-content: space-between; margin-bottom: 4px; }
      .t-footer { text-align: center; font-size: 12px; margin-top: 15px; }
      .qr-container { text-align: center; margin-top: 15px; }
      .qr-text { font-size: 10px; margin-bottom: 5px; }
      .qr-folio { font-size: 14px; font-weight: bold; margin-top: 5px; }
    `;

    const html = `
      <html>
        <head><style>${style}</style></head>
        <body>
          <div class="t-header">
            <div class="t-title">${ticketConfig.storeName || 'MI NEGOCIO'}</div>
            ${ticketConfig.rfc ? `<div class="t-line">RFC: ${ticketConfig.rfc}</div>` : ''}
            ${ticketConfig.address ? `<div class="t-line">${ticketConfig.address.replace(/\n/g, '<br/>')}</div>` : ''}
            ${ticketConfig.phone ? `<div class="t-line">Tel: ${ticketConfig.phone}</div>` : ''}
          </div>
          ${ticketConfig.headerMsg ? `
            <div class="t-divider" style="border-top:1px solid #000;"></div>
            <div class="t-line" style="text-align:center; font-weight:bold;">${ticketConfig.headerMsg}</div>
          ` : ''}
          <div class="t-divider"></div>
          <div class="t-body">
            <div class="info-row"><span>Fecha:</span><span>${new Date().toLocaleString()}</span></div>
            <div class="info-row"><span>Atendió:</span><span>Caja</span></div>
            ${saleId ? `<div class="info-row"><span>Folio Web:</span><span>${saleId.slice(-6).toUpperCase()}</span></div>` : ''}
          </div>
          <div class="items-table">
            <div class="item-head">
              <span class="col-cant">CANT</span>
              <span class="col-desc">DESCRIPCIÓN</span>
              <span class="col-price">IMPORTE</span>
            </div>
            ${cartItems.map(item => `
              <div class="item-row">
                <span class="col-cant">${item.quantity}</span>
                <span class="col-desc">${item.name}</span>
                <span class="col-price">$${(getProductPrice(item) * item.quantity).toFixed(2)}</span>
              </div>
            `).join('')}
          </div>
          <div class="t-divider"></div>
          <div class="totals">
            ${tDiscount > 0 ? `<div class="total-row"><span>Subtotal:</span><span>$${(tTotal + tDiscount).toFixed(2)}</span></div>
            <div class="total-row" style="color: red;"><span>Descuento:</span><span>-$${tDiscount.toFixed(2)}</span></div>` : ''}
            ${tipAmount > 0 ? `<div class="total-row"><span>Propina:</span><span>+$${tipAmount.toFixed(2)}</span></div>` : ''}
            <div class="total-row" style="font-size: 16px;"><span>TOTAL:</span><span>$${(tTotal + tipAmount).toFixed(2)}</span></div>
            ${tChange > 0 && typeof amountReceived === 'number' ? `
            <div class="total-row"><span>Recibido:</span><span>$${amountReceived.toFixed(2)}</span></div>
            <div class="total-row"><span>Cambio:</span><span>$${tChange.toFixed(2)}</span></div>
            ` : ''}
          </div>
          ${ticketConfig.footerMsg ? `
            <div class="t-divider"></div>
            <div class="t-footer">${ticketConfig.footerMsg.replace(/\n/g, '<br/>')}</div>
          ` : ''}
          ${saleId ? (() => {
            const ticketIdParam = saleId.slice(-6).toUpperCase();
            let billingBaseUrl = ticketConfig.autofacturacionUrl 
              ? ticketConfig.autofacturacionUrl.trim() 
              : (window.location.origin + '/clientes/portal');
            
            // Si el portal base ya tiene algún parámetro (ej. https://x.com/facturar?empresa=1), agregamos con &
            // Si no tiene, agregamos con ?
            const separator = billingBaseUrl.includes('?') ? '&' : '?';
            const finalUrl = `${billingBaseUrl}${separator}ticketId=${ticketIdParam}`;
            
            return `
            <div class="t-divider"></div>
            <div class="qr-container">
              <div class="qr-text">Para generar tu factura escanea este código:</div>
              <img src="https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(finalUrl)}" alt="QR" style="width:120px;height:120px;"/>
              <div class="qr-folio">FOLIO: ${ticketIdParam}</div>
            </div>
          `;
          })() : ''}
        </body>
      </html>
    `;

    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.width = '0px';
    iframe.style.height = '0px';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);
    
    // Write contents to iframe
    if (iframe.contentWindow) {
      iframe.contentWindow.document.open();
      iframe.contentWindow.document.write(html);
      iframe.contentWindow.document.close();
      
      // Allow image to load before printing
      iframe.onload = () => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setTimeout(() => {
          document.body.removeChild(iframe);
        }, 1000);
      };
    }
  };

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    setIsProcessing(true);
    try {
      const items = cart.map(item => ({ 
        productId: item.id, 
        variantId: item.variantId || null,
        quantity: item.quantity, 
        price: getProductPrice(item) 
      }));
      
      const cartBackup = [...cart];
      const totalBackup = total;
      const changeBackup = change;
      const discountBackup = discount;

      let saleId: string | undefined;

      if (mode === 'QUOTE') {
        const quote = await createQuote(items, finalTotalWithTip, paymentMethod, selectedCustomerId || null);
      } else {
        const cashValue = typeof amountReceived === 'number' ? amountReceived : undefined;
        const cardValue = typeof cardAmount === 'number' ? cardAmount : undefined;
        
        let finalNotes = notes;
        let billingData = undefined;

        if (documentType === 'FACTURA') {
           finalNotes = (notes ? notes + '\n\n' : '') + `[REQUIERE FACTURA] RFC: ${billRfc} | Nombre: ${billName} | CP: ${billZipCode} | Reg: ${billRegime} | Uso: ${billUse}`;
           billingData = {
              rfc: billRfc,
              name: billName,
              zipCode: billZipCode,
              regime: billRegime,
              use: billUse
           };
        }

        if (!isOnline) {
          // OFFLINE MODE INTERCEPTION
          await pushOfflineSale({
             items,
             total: finalTotalWithTip,
             paymentMethod,
             // Guardamos todo el payload que requeriría el backend:
             ...{
                customerId: selectedCustomerId || null,
                sessionId,
                notes: finalNotes,
                cashValue,
                cardValue,
                billingData
             }
          });
          saleId = `OFFLINE-${Date.now()}`;
        } else {
          // ONLINE MODE
          const response = await createSale(items, finalTotalWithTip, paymentMethod, selectedCustomerId || null, sessionId, finalNotes, cashValue, cardValue, billingData);
          if (!response.success) {
            throw new Error(response.error);
          }
          saleId = response.sale?.id;
        }
      }
      
      setCart([]);
      setIsCheckoutOpen(false);
      setAmountReceived('');
      setCardAmount('');
      setNotes('');
      setTipAmount(0);
      setManualDiscountValue('');
      setIsProcessing(false);

      setTimeout(() => {
         if (mode === 'QUOTE') {
           alert('¡Cotización creada con éxito! Imprimiendo Ticket...');
         } else {
           alert('¡Venta cobrada con éxito! Imprimiendo Ticket...');
         }
         printTicket(cartBackup, totalBackup, changeBackup, discountBackup, saleId);
      }, 100);

    } catch (e) {
      alert('Error en la venta: ' + String(e));
      setIsProcessing(false);
    }
  };

  return (
    <div style={{ display: 'flex', gap: '2rem', height: 'calc(100vh - 200px)' }}>
      {/* Left: Products */}
      <div className="card" style={{ flex: 2, display: 'flex', flexDirection: 'column', position: 'relative' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', gap: '1rem' }}>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <h2 style={{ fontSize: '1.25rem', whiteSpace: 'nowrap' }}>Inventario</h2>
            {mode === 'SALE' && (
              <button 
                onClick={() => setIsQuoteModalOpen(true)}
                className="btn btn-secondary" 
                style={{ whiteSpace: 'nowrap', padding: '0.5rem 1rem', fontSize: '0.875rem' }}
              >
                Cargar Cotización
              </button>
            )}
          </div>
          <div style={{ display: 'flex', flex: 1, gap: '0.5rem' }}>
            <input 
              type="text" 
              placeholder="🔍 Buscar por nombre, SKU o código" 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ padding: '0.75rem 1rem', flex: 1, borderRadius: '4px', border: '1px solid var(--pulpos-border)' }}
              autoFocus
            />
            <select 
              value={stockFilter} 
              onChange={e => setStockFilter(e.target.value as 'ALL' | 'IN_STOCK' | 'OUT_OF_STOCK')}
              style={{ padding: '0.75rem 1rem', borderRadius: '4px', border: '1px solid var(--pulpos-border)', backgroundColor: 'white' }}
            >
              <option value="ALL">Todas las existencias</option>
              <option value="IN_STOCK">Con Existencia</option>
              <option value="OUT_OF_STOCK">Sin Existencia</option>
            </select>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', overflowY: 'auto', alignContent: 'start', paddingRight: '0.5rem', opacity: isSearching ? 0.5 : 1, transition: 'opacity 0.2s' }}>
          {displayedProducts
            .filter(prod => {
              if (stockFilter === 'IN_STOCK') return prod.stock > 0;
              if (stockFilter === 'OUT_OF_STOCK') return prod.stock <= 0;
              return true;
            })
            .map(prod => (
            <button key={prod.id} onClick={() => handleProductClick(prod)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid var(--pulpos-border)', padding: '0.75rem 1rem', borderRadius: '4px', textAlign: 'left', backgroundColor: 'white', cursor: 'pointer', transition: 'background-color 0.2s', ':hover': { backgroundColor: '#f8fafc' } } as any}>
              <div>
                <div style={{ fontWeight: '600', fontSize: '0.9rem', color: '#1e293b' }}>{prod.name} {prod.variants?.length > 0 && <span style={{fontSize: '0.75rem', backgroundColor: '#e2e8f0', padding: '2px 6px', borderRadius: '4px', marginLeft: '0.5rem'}}>{prod.variants.length} var.</span>}</div>
                <div style={{ color: 'var(--pulpos-text-muted)', fontSize: '0.75rem', marginTop: '0.1rem' }}>SKU: {prod.sku || '--'} | Stock: {prod.stock}</div>
              </div>
              <div style={{ color: 'var(--pulpos-primary)', fontWeight: 'bold', fontSize: '1rem', textAlign: 'right' }}>
                ${getProductPrice(prod).toFixed(2)}
              </div>
            </button>
          ))}
          {displayedProducts.length === 0 && !isSearching && (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--pulpos-text-muted)' }}>
              No se encontraron productos en la base de datos.
            </div>
          )}
          {isSearching && (
             <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--pulpos-text-muted)' }}>
               Buscando en Base de Datos...
             </div>
          )}
        </div>
      </div>

      {/* Right: Cart */}
      <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        
        {/* Ticket Config */}
        <div style={{ marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid var(--pulpos-border)' }}>
          <div style={{ marginBottom: '0.75rem' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--pulpos-text-muted)', marginBottom: '0.25rem' }}>Cliente</label>
            <div style={{ position: 'relative' }}>
              <input 
                type="text"
                placeholder="🔎 Buscar o escribir nombre de cliente..."
                value={customerSearchTerm}
                onChange={e => {
                  setCustomerSearchTerm(e.target.value);
                  const matched = customers.find((c: any) => c.name.toLowerCase() === e.target.value.toLowerCase());
                  if (matched) handleCustomerChange(matched.id);
                  else handleCustomerChange('');
                }}
                style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--pulpos-border)' }}
              />
              {customerSearchTerm && !selectedCustomerId && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: 'white', border: '1px solid var(--pulpos-border)', borderRadius: '4px', zIndex: 10, maxHeight: '200px', overflowY: 'auto', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
                  <div 
                    onClick={() => { setCustomerSearchTerm('Público en General'); handleCustomerChange(''); }}
                    style={{ padding: '0.5rem', cursor: 'pointer', borderBottom: '1px solid var(--pulpos-border)' }}
                  >
                    Público en General
                  </div>
                  {customers.filter((c:any) => c.name.toLowerCase().includes(customerSearchTerm.toLowerCase())).map((c: any) => (
                    <div 
                      key={c.id} 
                      onClick={() => { setCustomerSearchTerm(c.name); handleCustomerChange(c.id); }}
                      style={{ padding: '0.5rem', cursor: 'pointer', borderBottom: '1px solid var(--pulpos-border)' }}
                    >
                      {c.name}
                    </div>
                  ))}
                </div>
              )}
            </div>
            {selectedCustomerId && (
               <div style={{ fontSize: '0.75rem', color: '#16a34a', marginTop: '0.25rem', fontWeight: 'bold' }}>
                 ✓ Cliente vinculado
               </div>
            )}
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--pulpos-text-muted)', marginBottom: '0.25rem' }}>Lista de Precios del Ticket</label>
            <select value={priceList} onChange={e => setPriceList(e.target.value)} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--pulpos-border)', fontWeight: 'bold', color: priceList !== 'price' ? 'var(--pulpos-primary)' : 'inherit' }}>
              <option value="price">Normal (Público General)</option>
              <option value="wholesalePrice">Mayoreo</option>
              <option value="specialPrice">Especial (Distribuidor)</option>
              {dynamicPriceLists.map((pl: any) => (
                <option key={pl.id} value={`priceList_${pl.id}`}>{pl.name}</option>
              ))}
            </select>
          </div>
        </div>

        <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Ticket actual</h2>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {cart.length === 0 && <div style={{ color: 'var(--pulpos-text-muted)', textAlign: 'center', marginTop: '2rem' }}>Ticket vacío</div>}
          {cart.map(item => {
            const currentPrice = getProductPrice(item);
            return (
              <div key={item.cartItemId} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 0', borderBottom: '1px solid var(--pulpos-border)' }}>
                <div>
                  <div style={{ fontWeight: '500' }}>{item.name}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                    <input 
                      type="number" 
                      min="1" 
                      value={item.quantity} 
                      onChange={e => {
                        const newQ = parseInt(e.target.value) || 1;
                        if (ventasConfig.venderSinStock === false && mode === 'SALE') {
                           if (item.stock < newQ) {
                             alert('STOCK INSUFICIENTE.');
                             return;
                           }
                        }
                        setCart(cart.map(c => c.cartItemId === item.cartItemId ? { ...c, quantity: newQ } : c));
                      }}
                      style={{ width: '60px', padding: '0.25rem', borderRadius: '4px', border: '1px solid var(--pulpos-border)', textAlign: 'center' }} 
                    />
                    <span style={{ color: 'var(--pulpos-text-muted)', fontSize: '0.875rem' }}>
                      x ${currentPrice.toFixed(2)}
                    </span>
                  </div>
                </div>
                <div style={{ fontWeight: 'bold', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'center' }}>
                  <span>${(item.quantity * currentPrice).toFixed(2)}</span>
                  <button 
                     onClick={() => setCart(cart.filter(c => c.cartItemId !== item.cartItemId))}
                     style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '0.75rem', cursor: 'pointer', marginTop: '0.25rem', textDecoration: 'underline' }}
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        
        <div style={{ borderTop: '2px solid var(--pulpos-border)', paddingTop: '1rem', marginTop: '1rem' }}>
          
          {/* Opciones de Descuento Manual */}
          {cart.length > 0 && ventasConfig.bloquearDescuentos !== true && (
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 'bold', color: 'var(--pulpos-text-muted)', marginBottom: '0.25rem' }}>Descuento Manual al Total</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <select 
                  value={manualDiscountType} 
                  onChange={e => setManualDiscountType(e.target.value as '$' | '%')} 
                  style={{ width: '60px', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--pulpos-border)' }}
                >
                  <option value="$">$</option>
                  <option value="%">%</option>
                </select>
                <input 
                  type="number" 
                  min="0"
                  placeholder="Monto"
                  value={manualDiscountValue}
                  onChange={e => setManualDiscountValue(e.target.value === '' ? '' : parseFloat(e.target.value))}
                  style={{ flex: 1, padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--pulpos-border)', textAlign: 'right' }}
                />
              </div>
            </div>
          )}

          {discount > 0 && (
            <div style={{ display: 'flex', justifyItems: 'space-between', fontSize: '1rem', color: '#dc2626', fontWeight: 'bold', marginBottom: '0.5rem' }}>
              <span style={{flex: 1}}>Descuentos Aplicados</span>
              <span>-${discount.toFixed(2)}</span>
            </div>
          )}
          <div style={{ display: 'flex', justifyItems: 'space-between', fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>
            <span style={{flex: 1}}>Total a Cobrar</span>
            <span style={{ color: 'var(--pulpos-primary)' }}>${total.toFixed(2)}</span>
          </div>
          {cart.length > 0 && (
             <div style={{ textAlign: 'right', fontSize: '0.85rem', color: estimatedProfit > 0 ? '#16a34a' : '#dc2626', marginBottom: '1rem', fontWeight: '500' }}>
               Ganancia neta: ${estimatedProfit.toFixed(2)} ({markupPct}% utilidad / {marginPct}% margen {mode === 'QUOTE' ? 'de cotización' : 'de venta'})
             </div>
          )}
          <button onClick={() => setIsCheckoutOpen(true)} disabled={cart.length === 0} className="btn-primary" style={{ width: '100%', fontSize: '1.25rem', padding: '1rem', opacity: cart.length === 0 ? 0.5 : 1 }}>
            {mode === 'QUOTE' ? 'Generar Cotización' : 'Cobrar Venta'}
          </button>
        </div>
      </div>

      {/* Checkout Modal */}
      {isCheckoutOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '8px', width: '500px', maxWidth: '90%', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem', textAlign: 'center' }}>
               {mode === 'QUOTE' ? 'Finalizar Cotización' : 'Finalizar Venta'}
            </h2>
            
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--pulpos-border)', paddingBottom: '1rem' }}>
               <button 
                 onClick={() => setDocumentType('TICKET')} 
                 style={{ flex: 1, padding: '0.75rem', borderRadius: '4px', border: 'none', backgroundColor: documentType === 'TICKET' ? 'var(--pulpos-primary)' : '#f1f5f9', color: documentType === 'TICKET' ? 'white' : '#64748b', fontWeight: 'bold', cursor: 'pointer' }}
               >
                  Emitir Ticket
               </button>
               <button 
                 onClick={() => setDocumentType('FACTURA')} 
                 style={{ flex: 1, padding: '0.75rem', borderRadius: '4px', border: 'none', backgroundColor: documentType === 'FACTURA' ? '#10b981' : '#f1f5f9', color: documentType === 'FACTURA' ? 'white' : '#64748b', fontWeight: 'bold', cursor: 'pointer' }}
               >
                  Emitir Factura
               </button>
            </div>
            
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <div style={{ fontSize: '1rem', color: 'var(--pulpos-text-muted)' }}>{mode === 'QUOTE' ? 'Total Presupuestado' : 'Total a Pagar'}</div>
              <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'var(--pulpos-primary)' }}>${finalTotalWithTip.toFixed(2)}</div>
            </div>

            {mode !== 'QUOTE' && ventasConfig.solicitarPropinas && (
               <div style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--pulpos-border)', paddingBottom: '1.5rem' }}>
                 <label style={{ display: 'block', fontWeight: '500', marginBottom: '0.5rem' }}>Añadir Propina</label>
                 <div style={{ display: 'flex', gap: '0.5rem' }}>
                   {[10, 15, 20].map(pct => {
                     const amt = total * (pct / 100);
                     return (
                       <button
                         key={pct}
                         onClick={() => setTipAmount(tipAmount === amt ? 0 : amt)}
                         style={{ flex: 1, padding: '0.5rem', borderRadius: '4px', border: '1px solid', borderColor: tipAmount === amt ? '#10b981' : 'var(--pulpos-border)', backgroundColor: tipAmount === amt ? '#d1fae5' : 'white', cursor: 'pointer', fontWeight: tipAmount === amt ? 'bold' : 'normal' }}
                       >
                         {pct}% (${amt.toFixed(2)})
                       </button>
                     );
                   })}
                 </div>
               </div>
            )}

            {mode !== 'QUOTE' && (
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontWeight: '500', marginBottom: '0.5rem' }}>Método de Pago</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '0.5rem' }}>
                  {allowedMethods.map(method => (
                    <button 
                      key={method.id}
                      onClick={() => setPaymentMethod(method.id)}
                      style={{ 
                        padding: '0.75rem', borderRadius: '4px', border: '1px solid', 
                        borderColor: paymentMethod === method.id ? 'var(--pulpos-primary)' : 'var(--pulpos-border)',
                        backgroundColor: paymentMethod === method.id ? '#eff6ff' : 'white',
                        color: paymentMethod === method.id ? 'var(--pulpos-primary)' : 'inherit',
                        fontWeight: paymentMethod === method.id ? 'bold' : 'normal',
                        cursor: 'pointer'
                      }}
                    >
                      {method.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {mode !== 'QUOTE' && paymentMethod === 'CREDIT' && selectedCust && selectedCust.creditLimit > 0 && (
              <div style={{ marginBottom: '1.5rem', padding: '1rem', backgroundColor: '#fef3c7', borderRadius: '8px', border: '1px solid #fde68a' }}>
                <div style={{ fontWeight: 'bold', color: '#b45309', marginBottom: '0.25rem' }}>Venta a Crédito</div>
                <div style={{ color: '#d97706', fontSize: '0.9rem' }}>
                  Límite disp.: ${selectedCust.creditLimit.toFixed(2)} | Días de atraso máx.: {selectedCust.creditDays}
                </div>
                {total > selectedCust.creditLimit && (
                  <div style={{ marginTop: '0.5rem', color: 'red', fontWeight: 'bold' }}>
                    ⚠️ El total excede el límite de crédito del cliente.
                  </div>
                )}
              </div>
            )}

            {mode !== 'QUOTE' && (paymentMethod === 'CASH' || paymentMethod.toLowerCase().includes('efectivo')) && (
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontWeight: '500', marginBottom: '0.5rem' }}>Efectivo Recibido</label>
                <input 
                  type="number" 
                  autoFocus
                  value={amountReceived}
                  onChange={e => setAmountReceived(e.target.value === '' ? '' : parseFloat(e.target.value))}
                  placeholder={`Mínimo $${finalTotalWithTip.toFixed(2)}`}
                  style={{ width: '100%', padding: '1rem', fontSize: '1.25rem', borderRadius: '4px', border: '1px solid var(--pulpos-border)', textAlign: 'right' }}
                />
                {(typeof amountReceived === 'number' && amountReceived >= finalTotalWithTip) && (
                  <div style={{ marginTop: '0.5rem', textAlign: 'right', fontSize: '1.1rem', color: '#16a34a', fontWeight: 'bold' }}>
                    Cambio a entregar: ${change.toFixed(2)}
                  </div>
                )}
              </div>
            )}
            
            {paymentMethod === 'MIXTO' && (
              <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontWeight: '500', marginBottom: '0.5rem' }}>Pago en Tarjeta</label>
                  <input 
                    type="number" 
                    value={cardAmount}
                    onChange={e => {
                       const v = e.target.value === '' ? '' : parseFloat(e.target.value);
                       setCardAmount(v);
                       if (typeof v === 'number' && v <= finalTotalWithTip) setAmountReceived(finalTotalWithTip - v);
                    }}
                    placeholder={`Monto`}
                    style={{ width: '100%', padding: '1rem', fontSize: '1.25rem', borderRadius: '4px', border: '1px solid var(--pulpos-border)', textAlign: 'right' }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontWeight: '500', marginBottom: '0.5rem' }}>Pago en Efectivo</label>
                  <input 
                    type="number" 
                    value={amountReceived}
                    onChange={e => setAmountReceived(e.target.value === '' ? '' : parseFloat(e.target.value))}
                    placeholder={`Restante`}
                    style={{ width: '100%', padding: '1rem', fontSize: '1.25rem', borderRadius: '4px', border: '1px solid var(--pulpos-border)', textAlign: 'right' }}
                  />
                </div>
              </div>
            )}

            <div style={{ marginBottom: '1.5rem' }}>
               <label style={{ display: 'block', fontWeight: '500', marginBottom: '0.5rem' }}>Notas del Ticket (Opcional)</label>
               <input 
                  type="text" 
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Ej. Entregar pedido especial..."
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--pulpos-border)' }}
               />
            </div>

            {documentType === 'FACTURA' && (
              <div style={{ marginBottom: '1.5rem', padding: '1rem', backgroundColor: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                 <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#166534', marginBottom: '1rem' }}>Datos de Facturación CFDI 4.0</h3>
                 
                 <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', color: '#166534', fontWeight: 'bold', marginBottom: '0.25rem' }}>RFC *</label>
                      <input type="text" value={billRfc} onChange={e => setBillRfc(e.target.value.toUpperCase())} placeholder="XAXX010101000" style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #bbf7d0' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', color: '#166534', fontWeight: 'bold', marginBottom: '0.25rem' }}>Cód. Postal *</label>
                      <input type="text" value={billZipCode} onChange={e => setBillZipCode(e.target.value)} placeholder="Ej: 76000" style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #bbf7d0' }} />
                    </div>
                 </div>

                 <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', fontSize: '0.85rem', color: '#166534', fontWeight: 'bold', marginBottom: '0.25rem' }}>Razón Social *</label>
                    <input type="text" value={billName} onChange={e => setBillName(e.target.value.toUpperCase())} placeholder="NOMBRE COMPLETO S.A. DE C.V." style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #bbf7d0' }} />
                 </div>

                 <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', color: '#166534', fontWeight: 'bold', marginBottom: '0.25rem' }}>Régimen Fiscal</label>
                      <select value={billRegime} onChange={e => setBillRegime(e.target.value)} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #bbf7d0', backgroundColor: 'white' }}>
                        <option value="601">601 - General de Ley Personas Morales</option>
                        <option value="603">603 - Personas Morales con Fines no Lucrativos</option>
                        <option value="612">612 - Personas Físicas con Actividades Empresariales</option>
                        <option value="616">616 - Sin obligaciones fiscales</option>
                        <option value="621">621 - Incorporación Fiscal</option>
                        <option value="626">626 - Régimen Simplificado de Confianza (RESICO)</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', color: '#166534', fontWeight: 'bold', marginBottom: '0.25rem' }}>Uso de CFDI</label>
                      <select value={billUse} onChange={e => setBillUse(e.target.value)} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #bbf7d0', backgroundColor: 'white' }}>
                        <option value="G01">G01 - Adquisición de mercancias</option>
                        <option value="G03">G03 - Gastos en general</option>
                        <option value="P01">P01 - Por definir</option>
                        <option value="D01">D01 - Honorarios médicos</option>
                      </select>
                    </div>
                 </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
              <button onClick={() => setIsCheckoutOpen(false)} style={{ flex: 1, padding: '1rem', border: '1px solid var(--pulpos-border)', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', background: 'white' }}>
                Cancelar
              </button>
              <button 
                onClick={handleCheckout} 
                disabled={
                  isProcessing || 
                  (mode === 'SALE' && paymentMethod === 'CASH' && (typeof amountReceived !== 'number' || amountReceived < finalTotalWithTip)) ||
                  (mode === 'SALE' && paymentMethod === 'MIXTO' && (typeof amountReceived !== 'number' || typeof cardAmount !== 'number' || (amountReceived + cardAmount) < finalTotalWithTip))
                }
                className="btn-primary" 
                style={{ flex: 1, padding: '1rem', fontSize: '1.1rem', opacity: isProcessing ? 0.5 : 1 }}
              >
                {isProcessing ? 'Guardando...' : (mode === 'QUOTE' ? 'Guardar Cotización' : 'Confirmar Pago')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Load Quote Modal */}
      {isQuoteModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '8px', width: '500px', maxWidth: '90%', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column', maxHeight: '80vh' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem' }}>Cargar Cotización</h2>
            
            <div style={{ marginBottom: '1rem' }}>
              <input 
                type="text" 
                value={quoteSearchId} 
                onChange={(e) => setQuoteSearchId(e.target.value)}
                placeholder="🔍 Buscar ID de Cotización..."
                style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--pulpos-border)' }}
                autoFocus
              />
            </div>

            <div style={{ overflowY: 'auto', flex: 1, marginBottom: '1.5rem', border: '1px solid var(--pulpos-border)', borderRadius: '4px' }}>
               {pendingQuotes.filter(q => q.id.includes(quoteSearchId.trim())).map(quote => (
                 <button 
                    key={quote.id} 
                    onClick={() => handleLoadQuote(quote.id)}
                    style={{ 
                      width: '100%', 
                      padding: '1rem', 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center', 
                      borderBottom: '1px solid var(--pulpos-border)', 
                      backgroundColor: 'white', 
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                 >
                    <div>
                      <div style={{ fontWeight: 'bold', color: '#1e293b' }}>Cotización #{quote.id.slice(0, 8)}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--pulpos-text-muted)' }}>{new Date(quote.createdAt).toLocaleString()}</div>
                    </div>
                    <div style={{ fontWeight: 'bold', color: 'var(--pulpos-primary)' }}>
                      ${quote.total.toFixed(2)}
                    </div>
                 </button>
               ))}
               {pendingQuotes.length === 0 && (
                 <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--pulpos-text-muted)' }}>
                    No hay cotizaciones pendientes en esta sucursal.
                 </div>
               )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
               <button 
                 onClick={() => setIsQuoteModalOpen(false)}
                 style={{ padding: '0.75rem 1.5rem', border: '1px solid var(--pulpos-border)', borderRadius: '4px', background: 'white', cursor: 'pointer', fontWeight: 'bold', color: 'var(--pulpos-text-muted)' }}
                 disabled={isLoadingQuote}
               >
                 Cancelar
               </button>
            </div>
          </div>
        </div>
      )}

      {/* Variant Selection Modal */}
      {selectedProductForVariant && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60 }}>
          <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '8px', width: '450px', maxWidth: '90%', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>
               Seleccionar Variante
            </h2>
            <div style={{ color: 'var(--pulpos-text-muted)', marginBottom: '1.5rem' }}>
              {selectedProductForVariant.name}
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '50vh', overflowY: 'auto' }}>
              {selectedProductForVariant.variants.map((v: any) => (
                <button
                  key={v.id}
                  onClick={() => {
                    addToCart(selectedProductForVariant, v);
                    setSelectedProductForVariant(null);
                  }}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '1rem',
                    border: '1px solid var(--pulpos-border)',
                    borderRadius: '4px',
                    backgroundColor: 'white',
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 'bold', color: '#1e293b' }}>{v.attribute}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--pulpos-text-muted)' }}>SKU: {v.sku || '--'}</div>
                  </div>
                  <div style={{ fontSize: '0.875rem', fontWeight: '600', color: v.stock > 0 ? '#16a34a' : '#dc2626' }}>
                    {v.stock} disp.
                  </div>
                </button>
              ))}
            </div>

            <div style={{ marginTop: '1.5rem', textAlign: 'right' }}>
              <button onClick={() => setSelectedProductForVariant(null)} style={{ padding: '0.75rem 1.5rem', border: '1px solid var(--pulpos-border)', borderRadius: '4px', cursor: 'pointer', background: 'white', fontWeight: 'bold' }}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
