'use client';
import { useState, useMemo, useEffect, useCallback } from 'react';
import { Image as ImageIcon, Search, Filter, MapPin, ArrowDownUp, Camera, Star, X, Clock, FolderOpen, Trash2, ShoppingBag } from 'lucide-react';
import { createSale } from '@/app/actions/sale';
import { getLoyaltySettings } from '@/app/actions/loyalty';
import { createQuote, getQuoteForPOS, createQuickProductsForQuote } from '@/app/actions/quote';
import { createConsignment, getConsignmentForPOS } from '@/app/actions/consignment';
import { searchProducts } from '@/app/actions/product';
import { useSearchParams, useRouter } from 'next/navigation';
import { useOfflineSync } from '@/app/components/OfflineSyncProvider';
import ProductTableUI from '@/app/components/ProductTableUI';
import BarcodeScannerModal from '@/app/components/BarcodeScannerModal';

export default function POSClient({ products: initialProducts, customers, suppliers = [], promotions = [], mode = "SALE", sessionId, branchId, ticketConfig = {}, metodosConfig = {}, ventasConfig = {}, impresorasConfig = {}, dynamicPriceLists = [], pendingQuotes = [], initialCustomerId, qzCert }: { products: any[], customers: any[], suppliers?: any[], promotions?: any[], mode?: "SALE" | "QUOTE" | "CONSIGNMENT", sessionId?: string, branchId: string, ticketConfig?: any, metodosConfig?: any, ventasConfig?: any, impresorasConfig?: any, dynamicPriceLists?: any[], pendingQuotes?: any[], initialCustomerId?: string, qzCert?: string }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { isOnline, pushOfflineSale } = useOfflineSync();
  const [cart, setCart] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // States for sales/quotes/consignments on hold (en espera)
  const [onHoldTickets, setOnHoldTickets] = useState<any[]>([]);
  const [showOnHoldModal, setShowOnHoldModal] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(`caanma_on_hold_${branchId}_${mode}`);
      if (stored) {
        try {
          setOnHoldTickets(JSON.parse(stored));
        } catch (e) {
          console.error(e);
        }
      }
    }
  }, [branchId, mode]);
  const [isMobileSearchActive, setIsMobileSearchActive] = useState(false);
  const [priceList, setPriceList] = useState('price');
  
  const initialCustomer = initialCustomerId ? customers.find(c => c.id === initialCustomerId) : null;
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(initialCustomerId || null);
  const [customerSearchTerm, setCustomerSearchTerm] = useState(initialCustomer ? initialCustomer.name : '');

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

  // Default to "Público en General"
  useEffect(() => {
    if (!selectedCustomerId && activeCustomers.length > 0) {
      const defaultCustomer = activeCustomers.find(c => 
        c.name.toLowerCase().includes('público en general') || 
        c.name.toLowerCase().includes('publico en general')
      );
      if (defaultCustomer) {
        setSelectedCustomerId(defaultCustomer.id);
        setCustomerSearchTerm(defaultCustomer.name);
      }
    }
  }, [activeCustomers, selectedCustomerId]);

  // Advanced POS State
  const [stockFilter, setStockFilter] = useState<'ALL' | 'IN_STOCK' | 'OUT_OF_STOCK'>('ALL');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [showScanner, setShowScanner] = useState(false);
  
  // Fast Item State
  const [showFastItemModal, setShowFastItemModal] = useState(false);
  const [fastItemName, setFastItemName] = useState('');
  const [fastItemPrice, setFastItemPrice] = useState<number | ''>('');
  const [fastItemQuantity, setFastItemQuantity] = useState<number>(1);
  const [fastItemCost, setFastItemCost] = useState<number | ''>('');
  const [fastItemSupplierId, setFastItemSupplierId] = useState<string>('');
  
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
  const [loadedQuoteId, setLoadedQuoteId] = useState<string | null>(null);

  // Loyalty / Points state
  const [loyaltySettings, setLoyaltySettings] = useState<any>(null);
  const [pointsRedeemed, setPointsRedeemed] = useState<number>(0);

  useEffect(() => {
    if (branchId) {
      getLoyaltySettings(branchId).then(res => {
        if (res.success) setLoyaltySettings(res.settings);
      });
    }
  }, [branchId]);

  // Checkout Success Modal State
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successModalData, setSuccessModalData] = useState<any>(null);
  
  const [successPhone, setSuccessPhone] = useState('');
  const [successProspects, setSuccessProspects] = useState<any[]>([]);
  const [successSelectedProspectId, setSuccessSelectedProspectId] = useState<string>('');
  const [successIsLoadingProspects, setSuccessIsLoadingProspects] = useState(false);
  const [successIsSending, setSuccessIsSending] = useState(false);
  const [successSendSuccess, setSuccessSendSuccess] = useState(false);
  const [successSendError, setSuccessSendError] = useState<string | null>(null);

  // Fetch prospects for option B when success modal opens
  useEffect(() => {
    if (showSuccessModal && successModalData) {
      setSuccessPhone(successModalData.customerPhone || '');
      setSuccessIsLoadingProspects(true);
      setSuccessSendError(null);
      setSuccessSendSuccess(false);
      fetch(`/api/prospects?t=${Date.now()}`)
        .then((res) => {
          if (res.ok) return res.json();
          throw new Error('Failed to load prospects');
        })
        .then((data) => {
          if (data.prospects) {
            setSuccessProspects(data.prospects);
            const matched = data.prospects.find(
              (p: any) =>
                (successModalData.customerPhone && p.phone === successModalData.customerPhone) ||
                (successModalData.customerName && p.name?.toLowerCase().includes(successModalData.customerName.toLowerCase()))
            );
            if (matched) {
              setSuccessSelectedProspectId(matched.id);
            } else if (data.prospects.length > 0) {
              setSuccessSelectedProspectId(data.prospects[0].id);
            }
          }
        })
        .catch((err) => console.error('Error fetching prospects:', err))
        .finally(() => setSuccessIsLoadingProspects(false));
    }
  }, [showSuccessModal, successModalData]);

  const getSuccessShareMessage = () => {
    if (!successModalData) return '';
    const formattedTotal = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(successModalData.total);
    const link = `${window.location.origin}/ventas/detalle/${successModalData.saleId}/imprimir`;
    return `¡Hola ${successModalData.customerName || 'Cliente'}! Le comparto el comprobante de su compra de CAANMA.\n\n` +
      `*Folio:* #${successModalData.folio}\n` +
      `*Total:* ${formattedTotal}\n\n` +
      `Puede ver e imprimir el recibo detallado aquí:\n${link}\n\n` +
      `¡Muchas gracias por su preferencia! Que tenga un excelente día.`;
  };

  const handleSuccessWhatsAppWeb = () => {
    const cleanPhone = successPhone.replace(/\D/g, '');
    const finalPhone = cleanPhone.startsWith('52') ? cleanPhone : `52${cleanPhone}`;
    const text = encodeURIComponent(getSuccessShareMessage());
    window.open(`https://api.whatsapp.com/send?phone=${finalPhone}&text=${text}`, '_blank');
  };

  const handleSuccessSendViaCaanma = async () => {
    if (!successSelectedProspectId) return;
    const selectedProspect = successProspects.find((p) => p.id === successSelectedProspectId);
    if (!selectedProspect) return;

    setSuccessIsSending(true);
    setSuccessSendError(null);

    try {
      const res = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: selectedProspect.phone,
          message: getSuccessShareMessage(),
          prospectId: selectedProspect.id,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessSendSuccess(true);
        setTimeout(() => {
          setSuccessSendSuccess(false);
          setShowSuccessModal(false);
          setSuccessModalData(null);
        }, 1500);
      } else {
        throw new Error(data.error || 'Error al enviar mensaje');
      }
    } catch (err: any) {
      console.error(err);
      setSuccessSendError(err.message || 'Error de red o microservicio desconectado.');
    } finally {
      setSuccessIsSending(false);
    }
  };

  const handleCustomerChange = async (customerId: string) => {
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
      
      setLoadedQuoteId(quote.id);
      
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

  const [loadedConsignmentId, setLoadedConsignmentId] = useState<string | null>(null);

  const handleLoadConsignment = async (incomingId: string) => {
    if (!incomingId) return;
    setIsLoadingQuote(true);
    try {
      const consignment = await getConsignmentForPOS(incomingId);
      setLoadedConsignmentId(consignment.id);
      
      // Load cart
      const newCart = consignment.items.map((item: any) => ({
        ...item.product,
        cartItemId: item.variantId ? `v_${item.variantId}` : item.product.id,
        quantity: item.quantity,
        cartPrice: item.price,
        variantId: item.variantId || null
      }));
      setCart(newCart);
      
      // Load Customer
      if (consignment.customerId) {
        handleCustomerChange(consignment.customerId);
      }
      
      alert("Consignación cargada correctamente.");
    } catch (e: any) {
      alert("Error al cargar la consignación: " + e.message);
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
    const cId = searchParams.get('consignmentId');
    if (cId) {
      handleLoadConsignment(cId);
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
             Boolean(p.name.toLowerCase().includes(lowerTerm) || 
             (p.sku && p.sku.toLowerCase().includes(lowerTerm)) || 
             (p.barcode && p.barcode.includes(lowerTerm)))
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

  const getProductPrice = useCallback((prod: any) => {
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
  }, [priceList]);

  const addToCart = useCallback((product: any, variant: any = null) => {
    setCart(prevCart => {
      const cartItemId = variant ? `v_${variant.id}` : product.id;
      const checkStock = variant ? variant.stock : product.stock;
      const exists = prevCart.find(item => item.cartItemId === cartItemId);
      const incomingReq = exists ? exists.quantity + 1 : 1;

      // Vender Sin Stock validation
      if (ventasConfig.venderSinStock === false && mode === 'SALE') {
         if (checkStock < incomingReq) {
            alert('STOCK INSUFICIENTE. Habilite "Vender en Negativo" en Preferencias para saltar esta restricción.');
            return prevCart;
         }
      }

      const cartItemName = variant ? `${product.name} (${variant.attribute})` : product.name;
      const cartItemSku = variant && variant.sku ? variant.sku : product.sku;
      
      if (exists) {
        return prevCart.map(item => item.cartItemId === cartItemId ? { ...item, quantity: item.quantity + 1 } : item);
      } else {
        return [...prevCart, { 
          ...product, 
          cartItemId, 
          name: cartItemName, 
          sku: cartItemSku,
          variantId: variant ? variant.id : null,
          quantity: 1 
        }];
      }
    });
  }, [ventasConfig.venderSinStock, mode]);

  const handleUpdateQty = useCallback((cartItemId: string, newQ: number) => {
    if (newQ < 1) return;
    setCart(prevCart => {
      const item = prevCart.find(c => c.cartItemId === cartItemId);
      if (!item) return prevCart;
      if (ventasConfig.venderSinStock === false && mode === 'SALE') {
         if (item.stock < newQ) {
           alert('STOCK INSUFICIENTE.');
           return prevCart;
         }
      }
      return prevCart.map(c => c.cartItemId === cartItemId ? { ...c, quantity: newQ } : c);
    });
  }, [ventasConfig.venderSinStock, mode]);

  const handleProductClick = useCallback((product: any) => {
    if (product.variants && product.variants.length > 0) {
      setSelectedProductForVariant(product);
    } else {
      addToCart(product);
      setIsMobileSearchActive(false); // Close search overlay on mobile
    }
  }, [addToCart]);

  const filteredProducts = useMemo(() => {
    return displayedProducts.filter(prod => {
      if (stockFilter === 'IN_STOCK') return prod.stock > 0;
      if (stockFilter === 'OUT_OF_STOCK') return prod.stock <= 0;
      if (filterCategory !== 'ALL' && prod.category !== filterCategory) return false;
      return true;
    });
  }, [displayedProducts, stockFilter, filterCategory]);

  // Recalculate total dynamically with active price list
  const subTotal = useMemo(() => cart.reduce((sum, item) => sum + (getProductPrice(item) * item.quantity), 0), [cart, priceList]);
  
  const discount = useMemo(() => {
    let d = 0;
    promotions.forEach(promo => {
      if (!promo.active) return;
      
      let meta: any = {};
      try {
        meta = promo.metadata ? JSON.parse(promo.metadata) : {};
      } catch (e) {
        meta = { targetType: 'ALL' };
      }
      
      // Date validity check
      const now = new Date();
      if (meta.startDate) {
        const sDate = new Date(meta.startDate);
        if (now < sDate) return;
      }
      if (meta.endDate) {
        const eDate = new Date(meta.endDate);
        if (now > eDate) return;
      }
      
      // Target segments check
      const hasNewTargets = (meta.targetProducts?.length > 0) || (meta.targetCategories?.length > 0) || (meta.targetBrands?.length > 0);
      
      let applicableCartItems = cart;
      if (hasNewTargets) {
        applicableCartItems = cart.filter(item => {
          const matchProduct = meta.targetProducts?.includes(item.id);
          const matchCategory = item.category && meta.targetCategories?.includes(item.category);
          const matchBrand = item.brand && meta.targetBrands?.includes(item.brand);
          return matchProduct || matchCategory || matchBrand;
        });
      } else {
        // Fallback to legacy structure
        if (meta.targetType === 'CATEGORY') {
          applicableCartItems = cart.filter(item => meta.applyToCategories?.includes(item.category));
        } else if (meta.targetType === 'BRAND') {
          applicableCartItems = cart.filter(item => meta.applyToBrands?.includes(item.brand));
        } else if (meta.targetType === 'PRODUCTS') {
          applicableCartItems = cart.filter(item => meta.applyToProducts?.includes(item.id));
        }
      }
      
      const applicableSubTotal = applicableCartItems.reduce((sum, item) => sum + (getProductPrice(item) * item.quantity), 0);

      if (applicableSubTotal > 0) {
        if (promo.type === 'PERCENTAGE') {
          d += applicableSubTotal * (promo.value / 100);
        } else if (promo.type === 'FIXED_AMOUNT') {
          d += promo.value;
        } else if (promo.type === 'BOGO') {
          applicableCartItems.forEach(item => {
             const pay = meta.payQty || 1;
             const rec = meta.receiveQty || 2;
             const freeQty = Math.floor(item.quantity / rec) * (rec - pay);
             if (freeQty > 0) {
               d += freeQty * getProductPrice(item);
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

  const pointsValue = loyaltySettings?.pointValueInPesos || 1.0;
  const pointsDiscount = pointsRedeemed * pointsValue;
  const finalTotalWithTip = Math.max(0, total + tipAmount - pointsDiscount);

  const change = (typeof amountReceived === 'number' ? amountReceived : 0) - finalTotalWithTip;

  const printTicket = async (cartItems: any[], tTotal: number, tChange: number, tDiscount: number, saleId?: string) => {
    // Generate inner styling for the ticket
    const paperWidth = ticketConfig.anchoTicket === '58mm' || impresorasConfig.receiptWidth === '58mm' ? '58mm' : '80mm';
    const is58 = paperWidth === '58mm';

    const style = is58 ? `
      body { font-family: 'Courier New', Courier, monospace; font-size: 11px; margin: 0; padding: 2px; color: #000; width: 190px; }
      .t-header { text-align: center; margin-bottom: 6px; }
      .t-title { font-size: 13px; font-weight: bold; margin-bottom: 2px; }
      .t-line { font-size: 10px; margin-bottom: 2px; }
      .t-divider { border-top: 1px dashed #000; margin: 6px 0; }
      .t-body { font-size: 10px; margin-bottom: 6px; }
      .info-row { display: flex; justify-content: space-between; margin-bottom: 2px; }
      .items-table { width: 100%; font-size: 10px; }
      .item-head { display: flex; justify-content: space-between; font-weight: bold; margin-bottom: 4px; }
      .item-row { display: flex; justify-content: space-between; margin-bottom: 3px; }
      .col-cant { width: 25px; }
      .col-desc { flex: 1; margin: 0 5px; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
      .col-price { width: 50px; text-align: right; }
      .totals { font-size: 11px; font-weight: bold; margin-top: 6px; }
      .total-row { display: flex; justify-content: space-between; margin-bottom: 3px; }
      .t-footer { text-align: center; font-size: 10px; margin-top: 10px; }
      .qr-container { text-align: center; margin-top: 10px; }
      .qr-text { font-size: 9px; margin-bottom: 3px; }
      .qr-folio { font-size: 11px; font-weight: bold; margin-top: 3px; }
    ` : `
      body { font-family: 'Courier New', Courier, monospace; font-size: 14px; margin: 0; padding: 10px; color: #000; width: 280px; }
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

    const ticketLogo = ticketConfig.logoRecibo || ticketConfig.globalLogo;

    const html = `
      <html>
        <head><style>${style}</style></head>
        <body>
          <div class="t-header">
            ${ticketLogo ? `<img src="${ticketLogo}" style="max-height: 50px; max-width: 150px; object-fit: contain; margin-bottom: 8px; filter: grayscale(100%);" /><br/>` : ''}
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

    // Try QZ Tray first
    const qzPrinter = localStorage.getItem('qz_default_printer');
    if (qzPrinter && qzPrinter !== '__browser__' && qzPrinter !== 'browser') {
       try {
         const qz = (await import('qz-tray')).default;
         
         // Configure QZ security/signing if a certificate is configured
         if (qzCert) {
            qz.security.setCertificatePromise((resolve) => resolve(qzCert));
            qz.security.setSignaturePromise((toSign) => {
              return (resolve, reject) => {
                fetch('/api/qz/sign', {
                  method: 'POST',
                  headers: { 'Content-Type': 'text/plain' },
                  body: toSign
                })
                .then(res => {
                  if (!res.ok) throw new Error('Error al firmar');
                  return res.text();
                })
                .then(resolve)
                .catch(reject);
              };
            });
         } else {
             // Fallback to anonymous
             qz.security.setCertificatePromise((resolve) => resolve(undefined));
             qz.security.setSignaturePromise((toSign) => (resolve) => resolve(''));
         }

         if (!qz.websocket.isActive()) {
            await qz.websocket.connect({ retries: 1, delay: 1 });
         }
         const config = qz.configs.create(qzPrinter);
         
         const data = [{
           type: 'html',
           format: 'plain',
           data: html
         }];
         await qz.print(config, data as any);
         return; // If successful, exit
       } catch (err) {
         console.error('QZ Tray print failed, falling back to browser print:', err);
       }
    }

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

  const handlePutOnHold = () => {
    if (cart.length === 0) {
      alert('El ticket actual está vacío.');
      return;
    }
    const name = prompt('Asigna un nombre o identificador para esta venta en espera (opcional):', `Ticket #${onHoldTickets.length + 1}`);
    if (name === null) return; // user cancelled

    const newTicket = {
      id: Date.now().toString(),
      name: name.trim() || `Ticket #${onHoldTickets.length + 1}`,
      cart,
      selectedCustomerId,
      customerSearchTerm,
      priceList,
      notes,
      manualDiscountValue,
      loadedQuoteId,
      loadedConsignmentId,
      total: total, // current dynamic total
      timestamp: new Date().toLocaleString(),
    };

    const updated = [newTicket, ...onHoldTickets];
    setOnHoldTickets(updated);
    localStorage.setItem(`caanma_on_hold_${branchId}_${mode}`, JSON.stringify(updated));

    // Clear current cart/customer
    setCart([]);
    setSelectedCustomerId(null);
    setCustomerSearchTerm('');
    setPriceList('price');
    setNotes('');
    setManualDiscountValue('');
    setLoadedQuoteId(null);
    setLoadedConsignmentId(null);
    alert('Venta guardada en espera.');
  };

  const handleRestoreTicket = (ticket: any) => {
    if (cart.length > 0) {
      const confirmMerge = confirm('Tienes artículos en el ticket actual. ¿Deseas reemplazar el ticket actual con el seleccionado en espera?');
      if (!confirmMerge) return;
    }

    setCart(ticket.cart);
    setSelectedCustomerId(ticket.selectedCustomerId || null);
    setCustomerSearchTerm(ticket.customerSearchTerm || '');
    setPriceList(ticket.priceList || 'price');
    setNotes(ticket.notes || '');
    setManualDiscountValue(ticket.manualDiscountValue || '');
    setLoadedQuoteId(ticket.loadedQuoteId || null);
    setLoadedConsignmentId(ticket.loadedConsignmentId || null);

    // Remove from list
    const updated = onHoldTickets.filter(t => t.id !== ticket.id);
    setOnHoldTickets(updated);
    localStorage.setItem(`caanma_on_hold_${branchId}_${mode}`, JSON.stringify(updated));
    setShowOnHoldModal(false);
  };

  const handleDeleteOnHold = (ticketId: string) => {
    if (!confirm('¿Estás seguro de eliminar este ticket en espera?')) return;
    const updated = onHoldTickets.filter(t => t.id !== ticketId);
    setOnHoldTickets(updated);
    localStorage.setItem(`caanma_on_hold_${branchId}_${mode}`, JSON.stringify(updated));
  };

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    setIsProcessing(true);
    try {
      let finalCart = [...cart];
      const fastItems = cart.filter((item: any) => item.isFastItem).map((item: any) => ({
        tempId: item.id,
        name: item.name,
        price: getProductPrice(item),
        cost: parseFloat(item.cost || '0'),
        supplierId: item.supplierId || null,
      }));

      if (mode === 'QUOTE' && fastItems.length > 0) {
        const createdProductsMap = await createQuickProductsForQuote(fastItems, branchId);
        finalCart = cart.map((item: any) => {
          if (item.isFastItem && createdProductsMap[item.id]) {
            return {
              ...item,
              id: createdProductsMap[item.id],
              isFastItem: false
            };
          }
          return item;
        });
      }

      const items = finalCart.map(item => ({ 
        productId: item.id, 
        variantId: item.variantId || null,
        quantity: item.quantity, 
        price: getProductPrice(item) 
      }));
      
      const cartBackup = [...finalCart];
      const totalBackup = total;
      const changeBackup = change;
      const discountBackup = discount;

      let saleId: string | undefined;
      let responseSale: any = null;

      if (mode === 'QUOTE') {
        const quote = await createQuote(items, finalTotalWithTip, paymentMethod, selectedCustomerId || null, loadedQuoteId || undefined);
      } else if (mode === 'CONSIGNMENT') {
        const consignment = await createConsignment(items, finalTotalWithTip, paymentMethod, selectedCustomerId || null);
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
             },
             retryCount: 0,
             failed: false
          } as any);
          saleId = `OFFLINE-${Date.now()}`;
        } else {
          // ONLINE MODE
          const response = await createSale(items, total + tipAmount, paymentMethod, selectedCustomerId || null, sessionId, finalNotes, cashValue, cardValue, billingData, loadedQuoteId || undefined, loadedConsignmentId || undefined, pointsRedeemed);
          if (!response.success) {
            throw new Error(response.error);
          }
          saleId = response.sale?.id;
          responseSale = response.sale;
        }
      }
      
      setCart([]);
      setIsCheckoutOpen(false);
      setAmountReceived('');
      setCardAmount('');
      setNotes('');
      setTipAmount(0);
      setPointsRedeemed(0);
      setManualDiscountValue('');
      setLoadedQuoteId(null);
      setLoadedConsignmentId(null);
      setIsProcessing(false);

      const isAutoPrint = impresorasConfig.printAutomatically === 'true' || impresorasConfig.printAutomatically === true;

      if (mode === 'SALE') {
        if (isAutoPrint) {
          printTicket(cartBackup, totalBackup, changeBackup, discountBackup, saleId);
        }
        setSuccessModalData({
          saleId,
          folio: responseSale?.folio || saleId?.slice(0, 8).toUpperCase(),
          total: totalBackup,
          change: changeBackup,
          discount: discountBackup,
          customerName: selectedCust ? selectedCust.name : 'Público en General',
          customerPhone: selectedCust?.phone || '',
          cartBackup
        });
        setShowSuccessModal(true);
        router.refresh();
      } else {
        setTimeout(() => {
           if (!isAutoPrint) {
              if (mode === 'QUOTE') {
                // No blocking alert
              } else if (mode === 'CONSIGNMENT') {
                alert('¡Consignación creada con éxito! Imprimiendo Ticket...');
              }
           }
           printTicket(cartBackup, totalBackup, changeBackup, discountBackup, saleId);
           if (mode === 'QUOTE') {
              router.push('/ventas/cotizaciones');
           } else if (mode === 'CONSIGNMENT') {
              router.push('/ventas/consignaciones');
           }
           router.refresh();
        }, 100);
      }

    } catch (e) {
      alert('Error en la venta: ' + String(e));
      setIsProcessing(false);
    }
  };

  return (
    <div className="pos-layout">
      <style>{`
        .mobile-only {
          display: none !important;
        }
        @media (max-width: 768px) {
          .mobile-only {
            display: flex !important;
          }
          .desktop-only {
            display: none !important;
          }
          .pos-products-column {
            display: ${isMobileSearchActive ? 'flex !important' : 'none !important'};
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            right: 0 !important;
            bottom: 0 !important;
            z-index: 1000 !important;
            background-color: white !important;
            padding: 1rem !important;
            flex-direction: column !important;
            overflow-y: auto !important;
            margin: 0 !important;
            border-radius: 0 !important;
            border: none !important;
          }
          .pos-cart-column {
            display: ${isMobileSearchActive ? 'none !important' : 'flex !important'};
            margin-top: 0 !important;
          }
        }
      `}</style>
      {showScanner && (
        <BarcodeScannerModal 
          onScan={(decodedText) => {
            setSearchTerm(decodedText);
            setShowScanner(false);
          }} 
          onClose={() => setShowScanner(false)} 
        />
      )}

      {/* TOP ROW: Filters & Search bar */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1.25rem', marginBottom: '1.5rem', width: '100%' }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap', width: '100%' }}>
          {/* Price list selector */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#64748b' }}>Lista de Precios del Ticket</label>
            <select value={priceList} onChange={e => setPriceList(e.target.value)} className="input" style={{ minWidth: '180px', padding: '0.5rem', fontSize: '0.9rem', borderRadius: '6px' }}>
              <option value="price">Normal (Público General)</option>
              {dynamicPriceLists.map(pl => (
                <option key={pl.id} value={`priceList_${pl.id}`}>{pl.name}</option>
              ))}
              {ventasConfig.wholesalePriceActive && <option value="wholesalePrice">Mayoreo</option>}
              {ventasConfig.specialPriceActive && <option value="specialPrice">Precio Especial</option>}
            </select>
          </div>

          {/* Category selector */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#64748b' }}>Categoría</label>
            <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="input" style={{ minWidth: '150px', padding: '0.5rem', fontSize: '0.9rem', borderRadius: '6px' }}>
              <option value="ALL">Todas</option>
              {Array.from(new Set(initialProducts.map(p => p.category).filter(Boolean))).map((cat: any) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Stock Filter */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#64748b' }}>Filtrar por Stock</label>
            <select value={stockFilter} onChange={e => setStockFilter(e.target.value as any)} className="input" style={{ minWidth: '150px', padding: '0.5rem', fontSize: '0.9rem', borderRadius: '6px' }}>
              <option value="ALL">Todas las existencias</option>
              <option value="IN_STOCK">Con Existencia</option>
              <option value="OUT_OF_STOCK">Sin Existencia</option>
            </select>
          </div>

          <button type="button" onClick={() => { setFilterCategory('ALL'); setStockFilter('ALL'); }} style={{ color: '#64748b', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', fontSize: '0.85rem', fontWeight: '500', marginTop: '1rem' }}>
            Limpiar Filtros
          </button>

          {/* SEARCH BAR (Autocompletable) */}
          <div style={{ position: 'relative', flexGrow: 1, minWidth: '250px', zIndex: 100 }}>
            <Search size={18} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input 
              type="text" 
              placeholder="Buscar por nombre, SKU o código de barras..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              onFocus={() => setShowSearchDropdown(true)}
              style={{ 
                padding: '0.6rem 1rem 0.6rem 2.5rem', 
                width: '100%', 
                borderRadius: '8px', 
                border: '1px solid #cbd5e1', 
                backgroundColor: 'white', 
                fontSize: '0.95rem',
                outline: 'none',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
              }}
            />
            <button 
              type="button"
              onClick={() => setShowScanner(true)}
              style={{
                position: 'absolute',
                right: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--pulpos-primary)',
                display: 'flex',
                alignItems: 'center'
              }}
              title="Escanear Código de Barras"
            >
              <Camera size={20} />
            </button>

            {/* FLOATING SEARCH DROPDOWN */}
            {showSearchDropdown && searchTerm.trim() !== '' && (
              <>
                {/* Click-outside backdrop overlay */}
                <div 
                  onClick={() => setShowSearchDropdown(false)}
                  style={{
                    position: 'fixed',
                    inset: 0,
                    zIndex: 40,
                    backgroundColor: 'transparent'
                  }}
                />
                {/* Dropdown list */}
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  backgroundColor: 'white',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                  zIndex: 50,
                  maxHeight: '350px',
                  overflowY: 'auto',
                  marginTop: '0.25rem'
                }}>
                  {isSearching ? (
                    <div style={{ padding: '1rem', color: '#64748b', textAlign: 'center' }}>
                      Buscando en Base de Datos...
                    </div>
                  ) : filteredProducts.length === 0 ? (
                    <div style={{ padding: '1rem', color: '#64748b', textAlign: 'center' }}>
                      No se encontraron productos
                    </div>
                  ) : (
                    filteredProducts.map(p => {
                      const pPrice = getProductPrice(p);
                      return (
                        <div
                          key={p.id}
                          onClick={() => {
                            handleProductClick(p);
                            setSearchTerm('');
                            setShowSearchDropdown(false);
                          }}
                          style={{
                            padding: '0.75rem 1rem',
                            borderBottom: '1px solid #f1f5f9',
                            cursor: 'pointer',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            transition: 'background-color 0.2s'
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f8fafc' }}
                          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent' }}
                        >
                          <div>
                            <div style={{ fontWeight: '600', color: '#1e293b', fontSize: '0.9rem' }}>{p.name}</div>
                            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.1rem' }}>
                              SKU: {p.sku || '--'} | Existencia: <span style={{ fontWeight: '600', color: p.stock > 0 ? '#16a34a' : '#dc2626' }}>{p.stock}</span>
                            </div>
                          </div>
                          <div style={{ fontWeight: 'bold', color: 'var(--pulpos-primary)', fontSize: '0.95rem' }}>
                            ${pPrice?.toFixed(2)}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </>
            )}
          </div>

          {/* Ubicación & Ordenar Buttons */}
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button type="button" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', backgroundColor: 'white', border: '1px solid #e2e8f0', padding: '0.5rem 0.75rem', borderRadius: '6px', fontSize: '0.85rem', cursor: 'pointer', height: '36px' }}><MapPin size={14} /> Ubicación</button>
            <button type="button" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', backgroundColor: 'white', border: '1px solid #e2e8f0', padding: '0.5rem 0.75rem', borderRadius: '6px', fontSize: '0.85rem', cursor: 'pointer', height: '36px' }}><ArrowDownUp size={14} /> Ordenar</button>
            {mode === 'QUOTE' && (
              <button type="button" onClick={() => { setFastItemName(''); setFastItemPrice(''); setFastItemQuantity(1); setShowFastItemModal(true); }} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', backgroundColor: '#fef3c7', border: '1px solid #fde68a', color: '#d97706', padding: '0.5rem 0.75rem', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 'bold', cursor: 'pointer', height: '36px' }}>➕ Artículo Rápido</button>
            )}
          </div>
        </div>
      </div>

      {/* BOTTOM MAIN BODY: 2 Columns */}
      <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', width: '100%', alignItems: 'flex-start' }}>
        {/* LEFT COLUMN: Cart items (70% width) */}
        <div className="card" style={{ flex: 2, minWidth: '400px', display: 'flex', flexDirection: 'column', padding: '1.5rem' }}>
          
          {/* CLIENT SEARCH & PARKED TABS ROW */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid #f1f5f9' }}>
            {/* Customer select */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: '250px' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#64748b', whiteSpace: 'nowrap' }}>Cliente</span>
              <div style={{ position: 'relative', width: '100%' }}>
                <input 
                  type="text" 
                  placeholder="Buscar o escribir nombre de cliente..." 
                  value={customerSearchTerm}
                  onChange={e => {
                    setCustomerSearchTerm(e.target.value);
                    const matched = customers.find((c: any) => c.name.toLowerCase() === e.target.value.toLowerCase());
                    if (matched) handleCustomerChange(matched.id);
                    else handleCustomerChange('');
                  }}
                  style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.9rem', outline: 'none' }}
                />
                {/* Customer Dropdown */}
                {customerSearchTerm.trim() !== '' && !selectedCustomerId && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: 'white', border: '1px solid #cbd5e1', borderRadius: '6px', zIndex: 10, maxHeight: '200px', overflowY: 'auto', marginTop: '0.25rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
                    <div 
                      onClick={() => {
                        setCustomerSearchTerm('Público en General');
                        handleCustomerChange('');
                      }}
                      style={{ padding: '0.5rem 0.75rem', cursor: 'pointer', borderBottom: '1px solid #f1f5f9', fontSize: '0.9rem' }}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f8fafc'}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      Público en General
                    </div>
                    {activeCustomers.filter(c => c.name.toLowerCase().includes(customerSearchTerm.toLowerCase())).map(c => (
                      <div 
                        key={c.id} 
                        onClick={() => {
                          setSelectedCustomerId(c.id);
                          setCustomerSearchTerm(c.name);
                        }}
                        style={{ padding: '0.5rem 0.75rem', cursor: 'pointer', borderBottom: '1px solid #f1f5f9', fontSize: '0.9rem' }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f8fafc'}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        {c.name}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* TABS (On-Hold drafts visual tabs) */}
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
              {onHoldTickets.map((ticket, index) => (
                <button
                  type="button"
                  key={ticket.id}
                  onClick={() => handleRestoreTicket(ticket)}
                  style={{
                    padding: '0.4rem 0.8rem',
                    border: '2px solid #cbd5e1',
                    borderRadius: '6px',
                    backgroundColor: 'white',
                    color: '#475569',
                    fontSize: '0.8rem',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    transition: 'border-color 0.2s, background-color 0.2s'
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = 'var(--pulpos-primary)';
                    e.currentTarget.style.backgroundColor = '#f8fafc';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = '#cbd5e1';
                    e.currentTarget.style.backgroundColor = 'white';
                  }}
                  title={`Cargar ${ticket.name}`}
                >
                  {ticket.name}
                </button>
              ))}
              <button 
                type="button"
                onClick={handlePutOnHold}
                style={{
                  padding: '0.4rem 0.8rem',
                  border: '2px dashed var(--pulpos-primary)',
                  borderRadius: '6px',
                  backgroundColor: 'var(--pulpos-bg)',
                  color: 'var(--pulpos-primary)',
                  fontSize: '0.8rem',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem'
                }}
                title="Poner en espera ticket actual"
              >
                ⏸️ Pausar Venta
              </button>
            </div>
          </div>

          {/* ITEMS LIST (Cart table layout) */}
          <div style={{ minHeight: '380px', display: 'flex', flexDirection: 'column' }}>
            {cart.length === 0 ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: 'var(--pulpos-text-muted)', padding: '4rem 1rem' }}>
                <ShoppingBag size={48} color="#cbd5e1" style={{ marginBottom: '1rem' }} />
                <div style={{ fontSize: '1rem', fontWeight: 'bold' }}>El ticket está vacío</div>
                <div style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>Escribe en el buscador de arriba para agregar artículos.</div>
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #cbd5e1', color: '#64748b', fontSize: '0.85rem' }}>
                    <th style={{ padding: '0.75rem 0.5rem', width: '30px' }}><input type="checkbox" readOnly checked style={{ cursor: 'not-allowed' }} /></th>
                    <th style={{ padding: '0.75rem 0.5rem' }}>Artículo</th>
                    <th style={{ padding: '0.75rem 0.5rem', width: '130px', textAlign: 'center' }}>Cantidad</th>
                    <th style={{ padding: '0.75rem 0.5rem', width: '100px', textAlign: 'right' }}>Precio</th>
                    <th style={{ padding: '0.75rem 0.5rem', width: '110px', textAlign: 'right' }}>Subtotal</th>
                    <th style={{ padding: '0.75rem 0.5rem', width: '40px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {cart.map(item => {
                    const itemPrice = getProductPrice(item);
                    const itemSubtotal = itemPrice * item.quantity;
                    return (
                      <tr key={item.listId} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background-color 0.2s' }}>
                        <td style={{ padding: '1rem 0.5rem' }}>
                          <input type="checkbox" readOnly checked style={{ cursor: 'not-allowed' }} />
                        </td>
                        <td style={{ padding: '1rem 0.5rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            {/* Avatar initials badge */}
                            <div style={{
                              width: '32px', height: '32px', borderRadius: '6px',
                              backgroundColor: '#eff6ff', color: '#3b82f6',
                              fontWeight: 'bold', fontSize: '0.8rem',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              flexShrink: 0
                            }}>
                              {item.name.substring(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <div style={{ fontWeight: '600', color: '#1e293b', fontSize: '0.9rem' }}>{item.name}</div>
                              <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.1rem' }}>SKU: {item.sku || '--'}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '1rem 0.5rem', textAlign: 'center' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '0.15rem' }}>
                            <button 
                              type="button"
                              onClick={() => handleUpdateQty(item.listId, item.quantity - 1)}
                              style={{ border: 'none', background: 'none', color: '#64748b', width: '24px', height: '24px', cursor: 'pointer', fontWeight: 'bold' }}
                            >-</button>
                            <span style={{ fontSize: '0.9rem', fontWeight: '600', minWidth: '24px', textAlign: 'center' }}>{item.quantity}</span>
                            <button 
                              type="button"
                              onClick={() => handleUpdateQty(item.listId, item.quantity + 1)}
                              style={{ border: 'none', background: 'none', color: '#64748b', width: '24px', height: '24px', cursor: 'pointer', fontWeight: 'bold' }}
                            >+</button>
                          </div>
                        </td>
                        <td style={{ padding: '1rem 0.5rem', textAlign: 'right', fontSize: '0.9rem', color: '#475569' }}>
                          ${itemPrice.toFixed(2)}
                        </td>
                        <td style={{ padding: '1rem 0.5rem', textAlign: 'right', fontWeight: 'bold', color: 'var(--pulpos-primary)', fontSize: '0.95rem' }}>
                          ${itemSubtotal.toFixed(2)}
                        </td>
                        <td style={{ padding: '1rem 0.5rem', textAlign: 'center' }}>
                          <button 
                            type="button"
                            onClick={() => setCart(cart.filter(c => c.cartItemId !== item.cartItemId))}
                            style={{ border: 'none', background: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}
                            title="Eliminar artículo"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Total and actions (30% width) */}
        <div style={{ flex: 1, minWidth: '300px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Action Buttons Panel */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '1.25rem' }}>
            <button type="button" style={{ width: '100%', padding: '0.75rem', border: '1px solid #cbd5e1', borderRadius: '8px', backgroundColor: 'white', fontWeight: 'bold', color: '#475569', fontSize: '0.85rem', cursor: 'pointer', transition: 'background-color 0.2s' }} onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f8fafc'} onMouseLeave={e => e.currentTarget.style.backgroundColor = 'white'}>
              Añadir Promoción
            </button>
            <button type="button" onClick={() => setIsQuoteModalOpen(true)} style={{ width: '100%', padding: '0.75rem', border: '1px solid #cbd5e1', borderRadius: '8px', backgroundColor: 'white', fontWeight: 'bold', color: '#475569', fontSize: '0.85rem', cursor: 'pointer', transition: 'background-color 0.2s' }} onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f8fafc'} onMouseLeave={e => e.currentTarget.style.backgroundColor = 'white'}>
              Cargar Cotización
            </button>
          </div>

          {/* Totals & checkout card */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', padding: '1.5rem', backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '10px' }}>
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <div style={{ fontSize: '0.95rem', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total a Cobrar</div>
              <div style={{ fontSize: '2.5rem', fontWeight: '800', color: '#1e293b', marginTop: '0.5rem' }}>
                ${total.toFixed(2)}
              </div>
              {manualDiscountValue && (
                <div style={{ fontSize: '0.85rem', color: '#16a34a', fontWeight: '500', marginTop: '0.25rem' }}>
                  Descuento aplicado: ${discount.toFixed(2)}
                </div>
              )}
            </div>

            {/* Manual Discount Selection */}
            {cart.length > 0 && ventasConfig.bloquearDescuentos !== true && (
              <div style={{ marginBottom: '1rem', borderTop: '1px solid #e2e8f0', paddingTop: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', color: '#64748b', marginBottom: '0.25rem' }}>Descuento Manual al Total</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <select 
                    value={manualDiscountType} 
                    onChange={e => setManualDiscountType(e.target.value as '$' | '%')} 
                    style={{ width: '60px', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--pulpos-border)', outline: 'none' }}
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
                    style={{ flex: 1, padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--pulpos-border)', textAlign: 'right', outline: 'none' }}
                  />
                </div>
              </div>
            )}

            {/* Estimated profit info */}
            {cart.length > 0 && (
              <div style={{ textAlign: 'center', fontSize: '0.8rem', color: estimatedProfit > 0 ? '#16a34a' : '#dc2626', marginBottom: '1rem', fontWeight: '500' }}>
                Ganancia neta: ${estimatedProfit.toFixed(2)} ({markupPct}% utilidad / {marginPct}% margen {mode === 'QUOTE' ? 'de cotización' : mode === 'CONSIGNMENT' ? 'de consignación' : 'de venta'})
              </div>
            )}

            {/* Notes field */}
            {cart.length > 0 && (
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', color: '#64748b', marginBottom: '0.25rem' }}>Notas del Ticket</label>
                <input type="text" className="input" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Agregar comentarios..." style={{ width: '100%', fontSize: '0.85rem', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
              </div>
            )}

            {/* Primary Checkout Button */}
            <button
              type="button"
              onClick={() => setIsCheckoutOpen(true)}
              disabled={cart.length === 0 || isProcessing}
              style={{
                width: '100%',
                padding: '1.25rem',
                borderRadius: '10px',
                backgroundColor: '#a78bfa', // Lavender/purple as in mockup
                color: 'white',
                border: 'none',
                fontSize: '1.15rem',
                fontWeight: '800',
                cursor: cart.length === 0 ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 14px rgba(167, 139, 250, 0.4)',
                transition: 'background-color 0.2s, transform 0.1s',
                opacity: cart.length === 0 ? 0.6 : 1
              }}
              onMouseEnter={e => {
                if (cart.length > 0) e.currentTarget.style.backgroundColor = '#8b5cf6';
              }}
              onMouseLeave={e => {
                if (cart.length > 0) e.currentTarget.style.backgroundColor = '#a78bfa';
              }}
            >
              {isProcessing ? 'Procesando...' : mode === 'QUOTE' ? 'Guardar Cotización' : mode === 'CONSIGNMENT' ? 'Crear Consignación' : 'Cobrar Venta'}
            </button>
          </div>
        </div>
      </div>

      {/* Fast Item Modal */}
      {showFastItemModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60 }}>
          <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '8px', width: '450px', maxWidth: '90%', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem', color: '#d97706' }}>
               Añadir Artículo Rápido
             </h2>
             <div style={{ marginBottom: '1rem' }}>
               <label style={{ display: 'block', fontWeight: '500', marginBottom: '0.25rem' }}>Descripción / Nombre</label>
               <input 
                 type="text"
                 autoFocus
                 value={fastItemName}
                 onChange={e => setFastItemName(e.target.value)}
                 placeholder="Ej. Servicio de instalación..."
                 style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--pulpos-border)' }}
               />
             </div>
             <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
               <div style={{ flex: 1 }}>
                 <label style={{ display: 'block', fontWeight: '500', marginBottom: '0.25rem' }}>Precio Unitario</label>
                 <input 
                   type="number"
                   min="0"
                   step="0.01"
                   value={fastItemPrice}
                   onChange={e => setFastItemPrice(e.target.value === '' ? '' : parseFloat(e.target.value))}
                   placeholder="$0.00"
                   style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--pulpos-border)' }}
                 />
               </div>
               <div style={{ flex: 1 }}>
                 <label style={{ display: 'block', fontWeight: '500', marginBottom: '0.25rem' }}>Cantidad</label>
                 <input 
                   type="number"
                   min="1"
                   value={fastItemQuantity}
                   onChange={e => setFastItemQuantity(parseInt(e.target.value) || 1)}
                   style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--pulpos-border)' }}
                 />
               </div>
             </div>
             <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
               <div style={{ flex: 1 }}>
                 <label style={{ display: 'block', fontWeight: '500', marginBottom: '0.25rem' }}>Costo Unitario</label>
                 <input 
                   type="number"
                   min="0"
                   step="0.01"
                   value={fastItemCost}
                   onChange={e => setFastItemCost(e.target.value === '' ? '' : parseFloat(e.target.value))}
                   placeholder="$0.00"
                   style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--pulpos-border)' }}
                 />
               </div>
               <div style={{ flex: 1 }}>
                 <label style={{ display: 'block', fontWeight: '500', marginBottom: '0.25rem' }}>Proveedor</label>
                 <select 
                   value={fastItemSupplierId}
                   onChange={e => setFastItemSupplierId(e.target.value)}
                   style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--pulpos-border)', height: '45px', backgroundColor: 'white' }}
                 >
                   <option value="">-- Seleccionar --</option>
                   {suppliers.map((sup: any) => (
                     <option key={sup.id} value={sup.id}>{sup.name}</option>
                   ))}
                 </select>
               </div>
             </div>
             <div style={{ display: 'flex', gap: '1rem' }}>
               <button 
                 onClick={() => {
                   setShowFastItemModal(false);
                   setFastItemName('');
                   setFastItemPrice('');
                   setFastItemQuantity(1);
                   setFastItemCost('');
                   setFastItemSupplierId('');
                 }}
                 style={{ flex: 1, padding: '0.75rem', border: '1px solid var(--pulpos-border)', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', background: 'white' }}
               >
                 Cancelar
               </button>
               <button 
                 onClick={() => {
                   if (!fastItemName || fastItemPrice === '') return;
                   const newCartItem = {
                     cartItemId: 'FAST_' + Date.now(),
                     id: 'FAST_' + Date.now(),
                     name: fastItemName,
                     price: fastItemPrice as number,
                     stock: 9999,
                     cost: fastItemCost || 0,
                     supplierId: fastItemSupplierId || null,
                     satKey: '',
                     unit: 'H87', // Default unit pieca
                     taxIncluded: true,
                     taxes: [],
                     quantity: fastItemQuantity,
                     isFastItem: true
                   };
                   setCart([...cart, newCartItem as any]);
                   setShowFastItemModal(false);
                   setFastItemName('');
                   setFastItemPrice('');
                   setFastItemQuantity(1);
                   setFastItemCost('');
                   setFastItemSupplierId('');
                 }}
                 disabled={!fastItemName || fastItemPrice === ''}
                 className="btn-primary"
                 style={{ flex: 1, padding: '0.75rem', fontWeight: 'bold', backgroundColor: (!fastItemName || fastItemPrice === '') ? '#ccc' : '#f59e0b', borderColor: '#f59e0b' }}
               >
                 Añadir a Cotización
               </button>
             </div>
          </div>
        </div>
      )}

      {/* Checkout Modal */}
      {isCheckoutOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '8px', width: '500px', maxWidth: '90%', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem', textAlign: 'center' }}>
               {mode === 'QUOTE' ? 'Finalizar Cotización' : mode === 'CONSIGNMENT' ? 'Finalizar Consignación' : 'Finalizar Venta'}
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
              <div style={{ fontSize: '1rem', color: 'var(--pulpos-text-muted)' }}>{mode === 'QUOTE' ? 'Total Presupuestado' : mode === 'CONSIGNMENT' ? 'Total Consignado' : 'Total a Pagar'}</div>
              <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'var(--pulpos-primary)' }}>${finalTotalWithTip.toFixed(2)}</div>
            </div>

            {/* Monedero Electrónico */}
            {mode === 'SALE' && selectedCust && loyaltySettings && loyaltySettings.isActive && selectedCust.pointsBalance > 0 && (
              <div style={{ marginBottom: '1.5rem', padding: '1rem', backgroundColor: '#eff6ff', borderRadius: '12px', border: '1px solid #bfdbfe' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 'bold', color: '#1e40af', marginBottom: '0.5rem', fontSize: '1.05rem' }}>
                  <Star size={18} fill="#1e40af" color="#1e40af" />
                  <span>Monedero Electrónico</span>
                </div>
                <div style={{ fontSize: '0.95rem', color: '#1e3a8a', display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  <span>Puntos Disponibles:</span>
                  <strong style={{ fontSize: '1.1rem' }}>{selectedCust.pointsBalance} pts</strong>
                </div>
                <div style={{ fontSize: '0.95rem', color: '#1e3a8a', display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  <span>Equivalencia en Pesos:</span>
                  <strong>${(selectedCust.pointsBalance * (loyaltySettings.pointValueInPesos || 1.0)).toFixed(2)} MXN</strong>
                </div>

                <div style={{ marginTop: '0.75rem', borderTop: '1px dashed #bfdbfe', paddingTop: '0.75rem' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', color: '#1e40af', marginBottom: '0.5rem' }}>
                    Redimir Puntos para esta compra (Máx: {Math.min(selectedCust.pointsBalance, Math.floor((total + tipAmount) / (loyaltySettings.pointValueInPesos || 1.0)))}):
                  </label>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <input 
                      type="number"
                      min="0"
                      max={Math.min(selectedCust.pointsBalance, Math.floor((total + tipAmount) / (loyaltySettings.pointValueInPesos || 1.0)))}
                      value={pointsRedeemed || ''}
                      onChange={e => {
                        const val = parseInt(e.target.value) || 0;
                        const maxVal = Math.min(selectedCust.pointsBalance, Math.floor((total + tipAmount) / (loyaltySettings.pointValueInPesos || 1.0)));
                        setPointsRedeemed(Math.min(maxVal, Math.max(0, val)));
                      }}
                      placeholder="Cantidad de puntos"
                      style={{ flex: 1, padding: '0.5rem', borderRadius: '6px', border: '1px solid #bfdbfe', outline: 'none' }}
                    />
                    <button 
                      type="button"
                      onClick={() => {
                        const maxVal = Math.min(selectedCust.pointsBalance, Math.floor((total + tipAmount) / (loyaltySettings.pointValueInPesos || 1.0)));
                        setPointsRedeemed(maxVal);
                      }}
                      style={{ padding: '0.5rem 1rem', borderRadius: '6px', border: 'none', backgroundColor: '#2563eb', color: 'white', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.85rem' }}
                    >
                      Usar Todos
                    </button>
                  </div>
                  {pointsRedeemed > 0 && (
                    <div style={{ fontSize: '0.9rem', color: '#16a34a', marginTop: '0.5rem', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between' }}>
                      <span>Descuento aplicado:</span>
                      <span>-${(pointsRedeemed * (loyaltySettings.pointValueInPesos || 1.0)).toFixed(2)} MXN</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {mode !== 'QUOTE' && mode !== 'CONSIGNMENT' && ventasConfig.solicitarPropinas && (
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
                <div style={{ fontWeight: 'bold', color: '#b45309', marginBottom: '0.25rem', fontSize: '1.2rem' }}>Venta a Crédito</div>
                <div style={{ color: '#d97706', fontSize: '1.1rem' }}>
                  Límite disp.: ${ (selectedCust.creditLimit - (selectedCust.creditBalance || 0)).toFixed(2) } | Días máx.: {selectedCust.creditDays}
                </div>
                {total > (selectedCust.creditLimit - (selectedCust.creditBalance || 0)) && (
                  <div style={{ marginTop: '0.5rem', color: 'red', fontWeight: 'bold', fontSize: '1.1rem' }}>
                    ⚠️ El total excede el límite de crédito disponible.
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
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <button 
                  onClick={handleCheckout} 
                  disabled={
                    isProcessing || 
                    (mode === 'SALE' && paymentMethod === 'CASH' && (typeof amountReceived !== 'number' || amountReceived < finalTotalWithTip)) ||
                    (mode === 'SALE' && paymentMethod === 'MIXTO' && (typeof amountReceived !== 'number' || typeof cardAmount !== 'number' || (amountReceived + cardAmount) < finalTotalWithTip)) ||
                    (mode === 'SALE' && cart.some((item: any) => item.isFastItem))
                  }
                  className="btn-primary" 
                  style={{ width: '100%', padding: '1rem', fontSize: '1.1rem', opacity: isProcessing ? 0.5 : 1 }}
                >
                  {isProcessing ? 'Guardando...' : (mode === 'QUOTE' ? 'Guardar Cotización' : mode === 'CONSIGNMENT' ? 'Confirmar Consignación' : 'Confirmar Pago')}
                </button>
                {mode === 'SALE' && cart.some((item: any) => item.isFastItem) && (
                  <div style={{ color: '#ef4444', fontSize: '0.85rem', marginTop: '0.5rem', fontWeight: 'bold', textAlign: 'center' }}>
                    ⚠️ No se puede cerrar la venta porque incluye un artículo rápido. Regístralo en el catálogo primero.
                  </div>
                )}
              </div>
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
                    setIsMobileSearchActive(false); // Close search overlay on mobile
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

      {/* Success Modal */}
      {showSuccessModal && successModalData && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.45)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ backgroundColor: 'white', borderRadius: '16px', width: '500px', maxWidth: '95%', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', overflow: 'hidden', color: '#1e293b' }}>
            <div style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: 'white', padding: '2rem 1.5rem', textAlign: 'center' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: 'rgba(255, 255, 255, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem auto' }}>
                <span style={{ fontSize: '2rem', fontWeight: 'bold' }}>✓</span>
              </div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: 0 }}>¡Venta Cobrada con Éxito!</h2>
              <p style={{ margin: '0.5rem 0 0 0', opacity: 0.9, fontSize: '0.9rem' }}>Folio: #{successModalData.folio}</p>
            </div>

            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Sale Info */}
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem' }}>
                <div>
                  <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Total de Venta</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--pulpos-primary)' }}>
                    ${successModalData.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </div>
                </div>
                {successModalData.change > 0 && (
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Cambio</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#10b981' }}>
                      ${successModalData.change.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                )}
              </div>

              {/* Actions Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.75rem' }}>
                <button
                  onClick={() => printTicket(successModalData.cartBackup, successModalData.total, successModalData.change, successModalData.discount, successModalData.saleId)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    padding: '0.75rem 1rem',
                    backgroundColor: '#f1f5f9',
                    color: '#334155',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    fontSize: '0.95rem'
                  }}
                >
                  🖨️ Re-Imprimir Ticket
                </button>
              </div>

              {/* WhatsApp options */}
              <div style={{ border: '1px solid #cbd5e1', borderRadius: '12px', padding: '1rem', backgroundColor: '#f8fafc', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 'bold', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  💬 Compartir Ticket por WhatsApp
                </h4>

                {/* Option A */}
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.35rem', fontWeight: '600' }}>Opción A: WhatsApp Web</div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input
                      type="tel"
                      placeholder="Teléfono (ej. 4421234567)"
                      value={successPhone}
                      onChange={(e) => setSuccessPhone(e.target.value)}
                      style={{
                        flex: 1,
                        padding: '0.5rem',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.85rem',
                        outline: 'none',
                      }}
                    />
                    <button
                      onClick={handleSuccessWhatsAppWeb}
                      disabled={!successPhone}
                      style={{
                        padding: '0.5rem 1rem',
                        backgroundColor: '#25d366',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        fontSize: '0.85rem'
                      }}
                    >
                      Enviar Chat
                    </button>
                  </div>
                </div>

                {/* Option B */}
                <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '0.75rem' }}>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.35rem', fontWeight: '600' }}>Opción B: Bandeja CAANMA</div>
                  {successIsLoadingProspects ? (
                    <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Cargando bandeja de WhatsApp...</div>
                  ) : successProspects.length === 0 ? (
                    <div style={{ fontSize: '0.8rem', color: '#ef4444' }}>No hay chats activos en la bandeja.</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <select
                        value={successSelectedProspectId}
                        onChange={(e) => setSuccessSelectedProspectId(e.target.value)}
                        style={{
                          padding: '0.5rem',
                          borderRadius: '8px',
                          border: '1px solid #cbd5e1',
                          fontSize: '0.85rem',
                          outline: 'none',
                          backgroundColor: 'white'
                        }}
                      >
                        {successProspects.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name || 'Chat sin Nombre'} ({p.phone})
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={handleSuccessSendViaCaanma}
                        disabled={successIsSending || !successSelectedProspectId || successSendSuccess}
                        style={{
                          padding: '0.5rem',
                          backgroundColor: '#075e54',
                          color: 'white',
                          border: 'none',
                          borderRadius: '8px',
                          fontWeight: 'bold',
                          cursor: 'pointer',
                          fontSize: '0.85rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.25rem'
                        }}
                      >
                        {successIsSending ? 'Enviando...' : successSendSuccess ? '✓ ¡Enviado!' : 'Enviar Directo'}
                      </button>
                    </div>
                  )}
                  {successSendError && (
                    <div style={{ marginTop: '0.5rem', color: '#ef4444', fontSize: '0.75rem' }}>{successSendError}</div>
                  )}
                </div>
              </div>

              {/* Reset POS & Close */}
              <button
                onClick={() => {
                  setShowSuccessModal(false);
                  setSuccessModalData(null);
                }}
                style={{
                  padding: '1rem',
                  backgroundColor: 'var(--pulpos-primary)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  marginTop: '0.5rem'
                }}
              >
                ➕ Nueva Venta (Limpiar)
              </button>
            </div>
          </div>
        </div>
      )}

      {showOnHoldModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999
        }}>
          <div className="card" style={{
            width: '600px',
            maxWidth: '95%',
            maxHeight: '85vh',
            display: 'flex',
            flexDirection: 'column',
            padding: '2rem',
            backgroundColor: 'white',
            borderRadius: '12px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--pulpos-border)', paddingBottom: '0.75rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                <Clock size={20} color="var(--pulpos-primary)" /> Tickets en Espera ({mode === 'QUOTE' ? 'Cotizaciones' : mode === 'CONSIGNMENT' ? 'Consignaciones' : 'Ventas'})
              </h3>
              <button type="button" onClick={() => setShowOnHoldModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                <X size={24} />
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', marginBottom: '1.5rem' }}>
              {onHoldTickets.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#94a3b8', padding: '3rem 1rem' }}>
                  No hay tickets en espera.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {onHoldTickets.map(ticket => (
                    <div key={ticket.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', border: '1px solid var(--pulpos-border)', borderRadius: '8px', backgroundColor: '#f8fafc' }}>
                      <div>
                        <div style={{ fontWeight: 'bold', fontSize: '1rem', color: '#1e293b' }}>{ticket.name}</div>
                        <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.25rem' }}>
                          Creado: {ticket.timestamp}
                        </div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--pulpos-primary)', fontWeight: '500', marginTop: '0.25rem' }}>
                          {ticket.cart.length} art. | Total: ${ticket.total.toFixed(2)}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button 
                          type="button"
                          onClick={() => handleRestoreTicket(ticket)}
                          style={{
                            padding: '0.5rem 1rem',
                            backgroundColor: 'var(--pulpos-primary)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            fontWeight: 'bold',
                            fontSize: '0.85rem',
                            cursor: 'pointer'
                          }}
                        >
                          Cargar
                        </button>
                        <button 
                          type="button"
                          onClick={() => handleDeleteOnHold(ticket.id)}
                          style={{
                            padding: '0.5rem',
                            backgroundColor: '#fee2e2',
                            color: '#ef4444',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer'
                          }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--pulpos-border)', paddingTop: '1rem' }}>
              <button 
                type="button"
                onClick={() => setShowOnHoldModal(false)}
                style={{
                  padding: '0.6rem 2rem',
                  backgroundColor: '#f1f5f9',
                  color: '#334155',
                  border: '1px solid var(--pulpos-border)',
                  borderRadius: '6px',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
