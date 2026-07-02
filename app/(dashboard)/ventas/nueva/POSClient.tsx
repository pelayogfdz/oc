'use client';
import { useState, useMemo, useEffect, useCallback } from 'react';
import { Image as ImageIcon, Search, Filter, MapPin, ArrowDownUp, Camera, Star, X, Clock, FolderOpen, Trash2, ShoppingBag, Plus, Percent, Tag, PlusCircle, MoreVertical } from 'lucide-react';
import QRCode from 'qrcode';
import { createSale, sendSaleByEmail } from '@/app/actions/sale';
import { sendInvoiceByEmail } from '@/app/actions/facturacion';
import { createCustomerPOS } from '@/app/actions/customer';
import { getLoyaltySettings } from '@/app/actions/loyalty';
import { createQuote, getQuoteForPOS, createQuickProductsForQuote } from '@/app/actions/quote';
import { createConsignment, getConsignmentForPOS } from '@/app/actions/consignment';
import { searchProducts, getProductBranchStocks } from '@/app/actions/product';
import { getMergedUserPermissions } from '@/app/actions/permissions';
import { useSearchParams, useRouter } from 'next/navigation';
import { useOfflineSync } from '@/app/components/OfflineSyncProvider';
import ProductTableUI from '@/app/components/ProductTableUI';
import BarcodeScannerModal from '@/app/components/BarcodeScannerModal';
export default function POSClient({ 
  products: initialProducts, 
  customers, 
  suppliers = [], 
  promotions = [], 
  mode = "SALE", 
  sessionId, 
  branchId, 
  ticketConfig = {}, 
  metodosConfig = {}, 
  ventasConfig = {}, 
  impresorasConfig = {}, 
  dynamicPriceLists = [], 
  pendingQuotes = [], 
  initialCustomerId, 
  qzCert,
  userPermissions = {},
  userRole = 'USER',
  isSuperAdmin = false
}: { 
  products: any[], 
  customers: any[], 
  suppliers?: any[], 
  promotions?: any[], 
  mode?: "SALE" | "QUOTE" | "CONSIGNMENT", 
  sessionId?: string, 
  branchId: string, 
  ticketConfig?: any, 
  metodosConfig?: any, 
  ventasConfig?: any, 
  impresorasConfig?: any, 
  dynamicPriceLists?: any[], 
  pendingQuotes?: any[], 
  initialCustomerId?: string, 
  qzCert?: string,
  userPermissions?: Record<string, boolean>,
  userRole?: string,
  isSuperAdmin?: boolean
}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { isOnline, pushOfflineSale } = useOfflineSync();
  const initialCustomer = initialCustomerId ? customers.find(c => c.id === initialCustomerId) : null;

  const [cart, setCart] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [transactionType, setTransactionType] = useState<'VENTA' | 'PEDIDO'>('VENTA');
  const [activeItemMenuId, setActiveItemMenuId] = useState<string | null>(null);
  const [activeTabId, setActiveTabId] = useState<string>('1');
  const [tabs, setTabs] = useState<any[]>([
    {
      id: '1',
      name: mode === 'QUOTE' ? 'Nueva Cotización' : mode === 'CONSIGNMENT' ? 'Nueva Consignación' : 'Nueva Venta',
      cart: [],
      selectedCustomerId: initialCustomerId || null,
      customerSearchTerm: initialCustomer ? initialCustomer.name : '',
      priceList: 'price',
      manualDiscountType: '$',
      manualDiscountValue: '',
      pointsRedeemed: 0,
      tipAmount: 0,
      paymentMethod: 'CASH',
      amountReceived: '',
      cardAmount: '',
      notes: '',
      documentType: 'TICKET',
      transactionType: 'VENTA',
      appliedPromotionIds: null
    }
  ]);

  const switchTab = (targetTabId: string) => {
    setTabs(prev => {
      const updated = prev.map(t => t.id === activeTabId ? {
        ...t,
        cart,
        selectedCustomerId,
        customerSearchTerm,
        priceList,
        manualDiscountType,
        manualDiscountValue,
        pointsRedeemed,
        tipAmount,
        paymentMethod,
        amountReceived,
        cardAmount,
        notes,
        documentType,
        transactionType,
        appliedPromotionIds
      } : t);
      
      const target = updated.find(t => t.id === targetTabId);
      if (target) {
        setCart(target.cart);
        setSelectedCustomerId(target.selectedCustomerId);
        setCustomerSearchTerm(target.customerSearchTerm);
        setPriceList(target.priceList);
        setManualDiscountType(target.manualDiscountType as '$' | '%');
        setManualDiscountValue(target.manualDiscountValue as number | "");
        setPointsRedeemed(target.pointsRedeemed || 0);
        setTipAmount(target.tipAmount || 0);
        setPaymentMethod(target.paymentMethod || 'CASH');
        setAmountReceived((target.amountReceived || '') as number | "");
        setCardAmount((target.cardAmount || '') as number | "");
        setNotes(target.notes || '');
        setDocumentType((target.documentType || 'TICKET') as 'TICKET' | 'FACTURA');
        setTransactionType((target.transactionType || 'VENTA') as 'VENTA' | 'PEDIDO');
        setAppliedPromotionIds(target.appliedPromotionIds !== undefined ? target.appliedPromotionIds : null);
        setActiveTabId(targetTabId);
      }
      return updated;
    });
  };

  const addTab = () => {
    const nextNumber = tabs.length + 1;
    const newId = Math.random().toString(36).substr(2, 9);
    const newName = mode === 'QUOTE' ? `Nueva Cotización ${nextNumber}` : mode === 'CONSIGNMENT' ? `Nueva Consignación ${nextNumber}` : `Nueva Venta ${nextNumber}`;
    
    let defaultCustId = null;
    let defaultCustName = '';
    if (activeCustomers.length > 0) {
      const defaultCustomer = activeCustomers.find(c => 
        c.name.toLowerCase().includes('público en general') || 
        c.name.toLowerCase().includes('publico en general')
      );
      if (defaultCustomer) {
        defaultCustId = defaultCustomer.id;
        defaultCustName = defaultCustomer.name;
      }
    }

    const newTab = {
      id: newId,
      name: newName,
      cart: [],
      selectedCustomerId: defaultCustId,
      customerSearchTerm: defaultCustName,
      priceList: 'price',
      manualDiscountType: '$',
      manualDiscountValue: '',
      pointsRedeemed: 0,
      tipAmount: 0,
      paymentMethod: 'CASH',
      amountReceived: '',
      cardAmount: '',
      notes: '',
      documentType: 'TICKET',
      transactionType: 'VENTA',
      appliedPromotionIds: null
    };

    setTabs(prev => {
      const updated = prev.map(t => t.id === activeTabId ? {
        ...t,
        cart,
        selectedCustomerId,
        customerSearchTerm,
        priceList,
        manualDiscountType,
        manualDiscountValue,
        pointsRedeemed,
        tipAmount,
        paymentMethod,
        amountReceived,
        cardAmount,
        notes,
        documentType,
        transactionType,
        appliedPromotionIds
      } : t);
      
      setCart(newTab.cart);
      setSelectedCustomerId(newTab.selectedCustomerId);
      setCustomerSearchTerm(newTab.customerSearchTerm);
      setPriceList(newTab.priceList);
      setManualDiscountType(newTab.manualDiscountType as '$' | '%');
      setManualDiscountValue(newTab.manualDiscountValue as number | "");
      setPointsRedeemed(newTab.pointsRedeemed);
      setTipAmount(newTab.tipAmount);
      setPaymentMethod(newTab.paymentMethod);
      setAmountReceived((newTab.amountReceived || '') as number | "");
      setCardAmount((newTab.cardAmount || '') as number | "");
      setNotes(newTab.notes);
      setDocumentType(newTab.documentType as 'TICKET' | 'FACTURA');
      setTransactionType(newTab.transactionType as 'VENTA' | 'PEDIDO');
      setAppliedPromotionIds(null);
      setActiveTabId(newId);

      return [...updated, newTab];
    });
  };

  const closeTab = (tabId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (tabs.length === 1) return;
    
    setTabs(prev => {
      const remaining = prev.filter(t => t.id !== tabId);
      if (activeTabId === tabId) {
        const lastTab = remaining[remaining.length - 1];
        setCart(lastTab.cart);
        setSelectedCustomerId(lastTab.selectedCustomerId);
        setCustomerSearchTerm(lastTab.customerSearchTerm);
        setPriceList(lastTab.priceList);
        setManualDiscountType(lastTab.manualDiscountType as '$' | '%');
        setManualDiscountValue(lastTab.manualDiscountValue as number | "");
        setPointsRedeemed(lastTab.pointsRedeemed || 0);
        setTipAmount(lastTab.tipAmount || 0);
        setPaymentMethod(lastTab.paymentMethod || 'CASH');
        setAmountReceived((lastTab.amountReceived || '') as number | "");
        setCardAmount((lastTab.cardAmount || '') as number | "");
        setNotes(lastTab.notes || '');
        setDocumentType((lastTab.documentType || 'TICKET') as 'TICKET' | 'FACTURA');
        setTransactionType((lastTab.transactionType || 'VENTA') as 'VENTA' | 'PEDIDO');
        setAppliedPromotionIds(lastTab.appliedPromotionIds !== undefined ? lastTab.appliedPromotionIds : null);
        setActiveTabId(lastTab.id);
      }
      return remaining;
    });
  };

  const resetActiveTab = () => {
    let defaultCustId = null;
    let defaultCustName = '';
    if (activeCustomers.length > 0) {
      const defaultCustomer = activeCustomers.find(c => 
        c.name.toLowerCase().includes('público en general') || 
        c.name.toLowerCase().includes('publico en general')
      );
      if (defaultCustomer) {
        defaultCustId = defaultCustomer.id;
        defaultCustName = defaultCustomer.name;
      }
    }

    setCart([]);
    setSelectedCustomerId(defaultCustId);
    setCustomerSearchTerm(defaultCustName);
    setPriceList('price');
    setAppliedPromotionIds(null);
    setNotes('');
    setTipAmount(0);
    setPointsRedeemed(0);
    setManualDiscountValue('');
    setLoadedQuoteId(null);
    setLoadedConsignmentId(null);
    setAmountReceived('');
    setCardAmount('');
    setDocumentType('TICKET');
    setTransactionType('VENTA');

    setTabs(prev => prev.map(t => t.id === activeTabId ? {
      ...t,
      cart: [],
      selectedCustomerId: defaultCustId,
      customerSearchTerm: defaultCustName,
      priceList: 'price',
      manualDiscountType: '$',
      manualDiscountValue: '',
      pointsRedeemed: 0,
      tipAmount: 0,
      paymentMethod: 'CASH',
      amountReceived: '',
      cardAmount: '',
      notes: '',
      documentType: 'TICKET',
      transactionType: 'VENTA',
      appliedPromotionIds: null
    } : t));
  };
  
  // States for sales/quotes/consignments on hold (en espera)
  const [onHoldTickets, setOnHoldTickets] = useState<any[]>([]);
  const [showOnHoldModal, setShowOnHoldModal] = useState(false);
  const [showPromoModal, setShowPromoModal] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);

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

  // Load permissions and superadmin status (prefer fresh server props if online, fallback to localStorage if offline)
  const [permissions, setPermissions] = useState<Record<string, boolean>>(() => {
    if (typeof window !== 'undefined') {
      const isOnlineLoc = typeof navigator !== 'undefined' ? navigator.onLine : true;
      if (!isOnlineLoc) {
        try {
          const stored = localStorage.getItem('caanma_user_permissions');
          if (stored) return JSON.parse(stored);
        } catch (e) {}
      }
    }
    return userPermissions || {};
  });

  const [isAdminOrSuper, setIsAdminOrSuper] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const isOnlineLoc = typeof navigator !== 'undefined' ? navigator.onLine : true;
      if (!isOnlineLoc) {
        const stored = localStorage.getItem('caanma_user_is_admin');
        if (stored) return stored === 'true';
      }
    }
    return isSuperAdmin || userRole === 'ADMIN';
  });

  // Synchronize fresh permissions from server on mount to prevent stale PWA cache / stale local storage
  useEffect(() => {
    getMergedUserPermissions().then((res) => {
      if (res && res.success && res.permissions) {
        localStorage.setItem('caanma_user_permissions', JSON.stringify(res.permissions));
        localStorage.setItem('caanma_user_is_admin', (res.isSuperAdmin || res.role === 'ADMIN') ? 'true' : 'false');
        setPermissions(res.permissions);
        setIsAdminOrSuper(res.isSuperAdmin || res.role === 'ADMIN');
      }
    }).catch((err) => {
      console.error("Failed to sync fresh user permissions:", err);
    });
  }, []);

  useEffect(() => {
    if (userPermissions && Object.keys(userPermissions).length > 0) {
      localStorage.setItem('caanma_user_permissions', JSON.stringify(userPermissions));
      setPermissions(userPermissions);
    }
  }, [userPermissions]);

  useEffect(() => {
    const isAdmin = isSuperAdmin || userRole === 'ADMIN';
    localStorage.setItem('caanma_user_is_admin', isAdmin ? 'true' : 'false');
    setIsAdminOrSuper(isAdmin);
  }, [isSuperAdmin, userRole]);

  const hasPermission = useCallback((permId: string) => {
    if (isAdminOrSuper) return true;
    return !!permissions[permId];
  }, [isAdminOrSuper, permissions]);
  const [priceList, setPriceList] = useState('price');
  const [appliedPromotionIds, setAppliedPromotionIds] = useState<string[] | null>(null);
  
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
        const queryChain = branchId === 'GLOBAL' ? db.products : db.products.where('branchId').equals(branchId);
        queryChain.toArray().then(res => {
          const sorted = res.sort((a, b) => a.name.localeCompare(b.name)).slice(0, 50);
          if (sorted.length) setDisplayedProducts(sorted);
        });
      });
    } else {
      setActiveCustomers(customers);
      if (searchTerm === '') setDisplayedProducts(initialProducts);
    }
  }, [isOnline, customers, initialProducts, searchTerm, branchId]);

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

  // Customer Modal State
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustEmail, setNewCustEmail] = useState('');
  const [newCustStreet, setNewCustStreet] = useState('');
  const [newCustZipCode, setNewCustZipCode] = useState('');
  const [newCustTaxId, setNewCustTaxId] = useState('');
  const [isSavingCustomer, setIsSavingCustomer] = useState(false);
  
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
     ? metodosConfig.methods.filter((m: any) => m.id !== 'CREDIT') 
     : [{ id: 'CASH', name: 'Efectivo' }, { id: 'CARD', name: 'Tarjeta' }, { id: 'TRANSFER', name: 'Transferencia' }];

  const [paymentMethod, setPaymentMethod] = useState(customMethods[0]?.id || 'CASH');
  
  const selectedCust = activeCustomers.find((c: any) => c.id === selectedCustomerId);
  const allowedMethods = [...customMethods];
  const isCreditEnabled = metodosConfig?.enabledIds ? metodosConfig.enabledIds.includes('CREDIT') : true;
  if (isCreditEnabled && selectedCust && selectedCust.creditLimit > 0) {
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
  
  // Stock Branch Modal State
  const [showStockModal, setShowStockModal] = useState(false);
  const [stockModalProduct, setStockModalProduct] = useState<any | null>(null);
  const [branchStocks, setBranchStocks] = useState<any[]>([]);
  const [loadingBranchStocks, setLoadingBranchStocks] = useState(false);
  
  const [successPhone, setSuccessPhone] = useState('');
  const [successProspects, setSuccessProspects] = useState<any[]>([]);
  const [successSelectedProspectId, setSuccessSelectedProspectId] = useState<string>('');
  const [successIsLoadingProspects, setSuccessIsLoadingProspects] = useState(false);
  const [successIsSending, setSuccessIsSending] = useState(false);
  const [successSendSuccess, setSuccessSendSuccess] = useState(false);
  const [successSendError, setSuccessSendError] = useState<string | null>(null);

  const [successEmail, setSuccessEmail] = useState('');
  const [successIsSendingEmail, setSuccessIsSendingEmail] = useState(false);
  const [successSendEmailSuccess, setSuccessSendEmailSuccess] = useState(false);
  const [successSendEmailError, setSuccessSendEmailError] = useState<string | null>(null);

  // Fetch prospects for option B when success modal opens
  useEffect(() => {
    if (showSuccessModal && successModalData) {
      setSuccessPhone(successModalData.customerPhone || '');
      setSuccessEmail(successModalData.customerEmail || '');
      setSuccessIsLoadingProspects(true);
      setSuccessSendError(null);
      setSuccessSendSuccess(false);
      setSuccessSendEmailError(null);
      setSuccessSendEmailSuccess(false);
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

  const handleSuccessSendEmail = async () => {
    if (!successEmail || !successModalData) return;
    setSuccessIsSendingEmail(true);
    setSuccessSendEmailError(null);
    try {
      const isInvoiced = successModalData.documentType === 'INVOICE' && !successModalData.invoiceError;
      let result;
      if (isInvoiced) {
        result = await sendInvoiceByEmail(successModalData.saleId, successEmail);
      } else {
        result = await sendSaleByEmail(successModalData.saleId, successEmail);
      }

      if (result.success) {
        setSuccessSendEmailSuccess(true);
        setTimeout(() => {
          setSuccessSendEmailSuccess(false);
          setShowSuccessModal(false);
          setSuccessModalData(null);
        }, 1500);
      } else {
        throw new Error(result.error || 'Error al enviar correo.');
      }
    } catch (e: any) {
      console.error(e);
      setSuccessSendEmailError(e.message || 'Error de red o de configuración del servidor de correo (SMTP).');
    } finally {
      setSuccessIsSendingEmail(false);
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

  const handleSaveCustomer = async () => {
    if (!newCustName.trim()) {
      alert('El nombre del cliente es obligatorio.');
      return;
    }
    setIsSavingCustomer(true);
    try {
      const created = await createCustomerPOS({
        name: newCustName.trim(),
        phone: newCustPhone.trim() || undefined,
        email: newCustEmail.trim() || undefined,
        street: newCustStreet.trim() || undefined,
        zipCode: newCustZipCode.trim() || undefined,
        taxId: newCustTaxId.trim() || undefined
      });

      setActiveCustomers(prev => [...prev, created]);
      setSelectedCustomerId(created.id);
      setCustomerSearchTerm(created.name);
      
      if (created.priceList) {
        setPriceList(created.priceList || 'price');
      }
      setBillRfc(created.taxId || '');
      setBillName(created.legalName || created.name || '');
      setBillZipCode(created.zipCode || '');

      setShowAddCustomerModal(false);
      setNewCustName('');
      setNewCustPhone('');
      setNewCustEmail('');
      setNewCustStreet('');
      setNewCustZipCode('');
      setNewCustTaxId('');

      alert('¡Cliente creado y seleccionado con éxito!');
    } catch (e: any) {
      alert('Error al crear cliente: ' + (e.message || String(e)));
    } finally {
      setIsSavingCustomer(false);
    }
  };

  const handleLoadQuote = async (incomingId?: string) => {
    const idToLoad = incomingId || quoteSearchId.trim();
    if (!idToLoad) return;
    
    setIsLoadingQuote(true);
    try {
      const quote = await getQuoteForPOS(idToLoad);
      
      setLoadedQuoteId(quote.id);
      
      // Load cart preserving variantId, cartItemId and customPrice
      const newCart = quote.items.map((item: any) => ({
        ...item.product,
        cartItemId: item.variantId ? `v_${item.variantId}` : item.product.id,
        quantity: item.quantity,
        customPrice: item.price,
        cartPrice: item.price,
        variantId: item.variantId || null
      }));
      setCart(newCart);
      
      // Load Customer
      if (quote.customerId) {
        await handleCustomerChange(quote.customerId);
      } else {
        await handleCustomerChange('');
      }

      // Re-calculate and set manual discount if there was a difference between subtotal of items and quote total
      const subTotalOfLoadedItems = newCart.reduce((sum: number, item: any) => sum + (item.customPrice * item.quantity), 0);
      const discountDiff = subTotalOfLoadedItems - quote.total;
      if (discountDiff > 0.01) {
        setManualDiscountType('$');
        setManualDiscountValue(Number(discountDiff.toFixed(2)));
      } else {
        setManualDiscountType('$');
        setManualDiscountValue('');
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
           const queryChain = branchId === 'GLOBAL' ? db.products : db.products.where('branchId').equals(branchId);
           const results = await queryChain
             .filter(p => 
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
  }, [searchTerm, branchId, isOnline]);

  const getProductPrice = useCallback((prod: any) => {
    if (prod.customPrice !== undefined && prod.customPrice !== null && prod.customPrice !== '') {
      return prod.customPrice;
    }
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
      if (ventasConfig.venderSinStock === false && mode === 'SALE' && product.isService !== true) {
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
          attribute: variant ? variant.attribute : null,
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
      if (ventasConfig.venderSinStock === false && mode === 'SALE' && item.isService !== true) {
         if (item.stock < newQ) {
           alert('STOCK INSUFICIENTE.');
           return prevCart;
         }
      }
      return prevCart.map(c => c.cartItemId === cartItemId ? { ...c, quantity: newQ } : c);
    });
  }, [ventasConfig.venderSinStock, mode]);

  const handleUpdatePrice = useCallback((cartItemId: string, newPrice: number) => {
    setCart(prevCart => prevCart.map(c => c.cartItemId === cartItemId ? { ...c, customPrice: newPrice } : c));
  }, []);

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
  // Recalculate total dynamically with active price list
  const subTotal = useMemo(() => cart.reduce((sum, item) => sum + (getProductPrice(item) * item.quantity), 0), [cart, priceList]);

  const hasActivePromotion = useCallback((product: any) => {
    if (!promotions || promotions.length === 0) return false;
    
    return promotions.some((promo: any) => {
      if (!promo.active) return false;
      if (appliedPromotionIds !== null && !appliedPromotionIds.includes(promo.id)) return false;
      
      let meta: any = {};
      try {
        meta = promo.metadata ? JSON.parse(promo.metadata) : {};
      } catch (e) {
        meta = { targetType: 'ALL' };
      }
      
      // Check if this promotion applies to the current priceList
      const allowedPriceLists = meta.targetPriceLists && meta.targetPriceLists.length > 0
        ? meta.targetPriceLists
        : ['price'];
      if (!allowedPriceLists.includes(priceList)) return false;
      
      // Date validity check
      const now = new Date();
      if (meta.startDate) {
        const sDate = new Date(meta.startDate);
        if (now < sDate) return false;
      }
      if (meta.endDate) {
        const eDate = new Date(meta.endDate);
        if (now > eDate) return false;
      }
      
      // Target segments check
      const hasNewTargets = (meta.targetProducts?.length > 0) || (meta.targetCategories?.length > 0) || (meta.targetBrands?.length > 0);
      
      if (hasNewTargets) {
        const matchProduct = meta.targetProducts?.includes(product.id);
        const matchCategory = product.category && meta.targetCategories?.includes(product.category);
        const matchBrand = product.brand && meta.targetBrands?.includes(product.brand);
        return !!(matchProduct || matchCategory || matchBrand);
      } else {
        // Fallback to legacy structure
        if (meta.targetType === 'CATEGORY') {
          return !!(product.category && meta.applyToCategories?.includes(product.category));
        } else if (meta.targetType === 'BRAND') {
          return !!(product.brand && meta.applyToBrands?.includes(product.brand));
        } else if (meta.targetType === 'PRODUCTS') {
          return !!meta.applyToProducts?.includes(product.id);
        } else {
          return true; // Applies to all products
        }
      }
    });
  }, [promotions, priceList, appliedPromotionIds]);

  const getItemDiscounts = useCallback((cartItems: any[]) => {
    const discountsMap: { [key: string]: number } = {};
    
    // Initialize discounts to 0
    cartItems.forEach(item => {
      discountsMap[item.cartItemId] = 0;
    });

    if (!promotions || promotions.length === 0) return discountsMap;

    promotions.forEach((promo: any) => {
      if (!promo.active) return;
      if (appliedPromotionIds !== null && !appliedPromotionIds.includes(promo.id)) return;
      
      let meta: any = {};
      try {
        meta = promo.metadata ? JSON.parse(promo.metadata) : {};
      } catch (e) {
        meta = { targetType: 'ALL' };
      }
      
      // Check if this promotion applies to the current priceList
      const allowedPriceLists = meta.targetPriceLists && meta.targetPriceLists.length > 0
        ? meta.targetPriceLists
        : ['price'];
      if (!allowedPriceLists.includes(priceList)) return;
      
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
      
      let applicableCartItems = cartItems;
      if (hasNewTargets) {
        applicableCartItems = cartItems.filter(item => {
          const matchProduct = meta.targetProducts?.includes(item.id);
          const matchCategory = item.category && meta.targetCategories?.includes(item.category);
          const matchBrand = item.brand && meta.targetBrands?.includes(item.brand);
          return matchProduct || matchCategory || matchBrand;
        });
      } else {
        // Fallback to legacy structure
        if (meta.targetType === 'CATEGORY') {
          applicableCartItems = cartItems.filter(item => meta.applyToCategories?.includes(item.category));
        } else if (meta.targetType === 'BRAND') {
          applicableCartItems = cartItems.filter(item => meta.applyToBrands?.includes(item.brand));
        } else if (meta.targetType === 'PRODUCTS') {
          applicableCartItems = cartItems.filter(item => meta.applyToProducts?.includes(item.id));
        }
      }
      
      const applicableSubTotal = applicableCartItems.reduce((sum, item) => sum + (getProductPrice(item) * item.quantity), 0);

      if (applicableSubTotal > 0) {
        if (promo.type === 'PERCENTAGE') {
          applicableCartItems.forEach(item => {
            const itemPrice = getProductPrice(item);
            const itemSubtotal = itemPrice * item.quantity;
            const itemDiscount = itemSubtotal * (promo.value / 100);
            discountsMap[item.cartItemId] += itemDiscount;
          });
        } else if (promo.type === 'FIXED_AMOUNT') {
          // Distribute the fixed amount proportionally to each matching item's subtotal
          applicableCartItems.forEach(item => {
            const itemPrice = getProductPrice(item);
            const itemSubtotal = itemPrice * item.quantity;
            const itemDiscount = (itemSubtotal / applicableSubTotal) * promo.value;
            discountsMap[item.cartItemId] += itemDiscount;
          });
        } else if (promo.type === 'BOGO') {
          applicableCartItems.forEach(item => {
            const pay = meta.payQty || 1;
            const rec = meta.receiveQty || 2;
            const freeQty = Math.floor(item.quantity / rec) * (rec - pay);
            if (freeQty > 0) {
              const itemPrice = getProductPrice(item);
              const itemDiscount = freeQty * itemPrice;
              discountsMap[item.cartItemId] += itemDiscount;
            }
          });
        }
      }
    });

    return discountsMap;
  }, [promotions, priceList, getProductPrice, appliedPromotionIds]);

  const itemDiscounts = useMemo(() => getItemDiscounts(cart), [cart, getItemDiscounts]);

  const discount = useMemo(() => {
    let d = Object.values(itemDiscounts).reduce((sum, val) => sum + val, 0);
    
    if (typeof manualDiscountValue === 'number' && manualDiscountValue > 0) {
      if (manualDiscountType === '$') {
        d += manualDiscountValue;
      } else {
        d += subTotal * (manualDiscountValue / 100);
      }
    }
    
    return d > subTotal ? subTotal : d;
  }, [subTotal, itemDiscounts, manualDiscountValue, manualDiscountType]);

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

  const printTicket = async (cartItems: any[], tTotal: number, tChange: number, tDiscount: number, saleId?: string, folio?: string) => {
    const itemDiscountsMap = getItemDiscounts(cartItems);
    // Generate inner styling for the ticket
    const paperWidth = ticketConfig.anchoTicket === '58mm' || impresorasConfig.receiptWidth === '58mm' ? '58mm' : '80mm';
    const is58 = paperWidth === '58mm';

    // Generate local QR code base64 if saleId exists
    let qrCodeBase64 = '';
    if (saleId) {
      const ticketIdParam = folio || saleId.slice(-6).toUpperCase();
      let billingBaseUrl = ticketConfig.autofacturacionUrl 
        ? ticketConfig.autofacturacionUrl.trim() 
        : (window.location.origin + '/clientes/portal');
      const separator = billingBaseUrl.includes('?') ? '&' : '?';
      const finalUrl = `${billingBaseUrl}${separator}ticketId=${ticketIdParam}`;
      try {
        qrCodeBase64 = await QRCode.toDataURL(finalUrl, { width: 150, margin: 1 });
      } catch (err) {
        console.error('Failed to generate QR code:', err);
      }
    }

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
            ${saleId ? `<div class="info-row"><span>Folio Web:</span><span>${folio || saleId.slice(-6).toUpperCase()}</span></div>` : ''}
          </div>
          <div class="items-table">
            <div class="item-head">
              <span class="col-cant">CANT</span>
              <span class="col-desc">DESCRIPCIÓN</span>
              <span class="col-price">IMPORTE</span>
            </div>
            ${cartItems.map(item => {
              const itemDisc = itemDiscountsMap[item.cartItemId] || 0;
              const discLabel = itemDisc > 0 ? `<div style="font-size: 0.85em; color: #555; padding-left: 25px; margin-top: -2px; margin-bottom: 4px;">* Promo desc: -$${itemDisc.toFixed(2)}</div>` : '';
              return `
                <div class="item-row">
                  <span class="col-cant">${item.quantity}</span>
                  <span class="col-desc">${item.name}</span>
                  <span class="col-price">$${(getProductPrice(item) * item.quantity).toFixed(2)}</span>
                </div>
                ${discLabel}
              `;
            }).join('')}
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
          ${saleId && qrCodeBase64 ? (() => {
            const ticketIdParam = folio || saleId.slice(-6).toUpperCase();
            return `
            <div class="t-divider"></div>
            <div class="qr-container">
              <div class="qr-text">Para generar tu factura escanea este código:</div>
              <img src="${qrCodeBase64}" alt="QR" style="width:120px;height:120px;"/>
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
    iframe.style.left = '-9999px';
    iframe.style.top = '-9999px';
    iframe.style.width = '300px';
    iframe.style.height = '400px';
    iframe.style.border = 'none';
    
    document.body.appendChild(iframe);
    
    // Write contents to iframe
    if (iframe.contentWindow) {
      iframe.contentWindow.document.open();
      iframe.contentWindow.document.write(html);
      iframe.contentWindow.document.close();
      
      const win = iframe.contentWindow;
      setTimeout(() => {
        try {
          win.focus();
          if (typeof window !== 'undefined' && (window as any).__isTesting) {
            console.log("Bypassing browser print dialog in testing environment");
          } else {
            win.print();
          }
        } catch (e) {
          console.error('Failed to trigger iframe print:', e);
        }
        setTimeout(() => {
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
          }
        }, 1000);
      }, 500);
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

    resetActiveTab();
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

    setTabs(prev => prev.map(t => t.id === activeTabId ? {
      ...t,
      cart: ticket.cart,
      selectedCustomerId: ticket.selectedCustomerId || null,
      customerSearchTerm: ticket.customerSearchTerm || '',
      priceList: ticket.priceList || 'price',
      manualDiscountValue: ticket.manualDiscountValue || '',
      notes: ticket.notes || '',
      loadedQuoteId: ticket.loadedQuoteId || null,
      loadedConsignmentId: ticket.loadedConsignmentId || null
    } : t));

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
      let invoiceError: string | undefined;

      if (mode === 'QUOTE') {
        if (!isOnline) {
          await pushOfflineSale({
             items,
             total: finalTotalWithTip,
             paymentMethod,
             customerId: selectedCustomerId || null,
             sessionId,
             notes,
             type: 'QUOTE',
             branchId,
             retryCount: 0,
             failed: false
          } as any);
          saleId = `OFFLINE-QUOTE-${Date.now()}`;
        } else {
          const quote = await createQuote(items, finalTotalWithTip, paymentMethod, selectedCustomerId || null, loadedQuoteId || undefined);
          saleId = quote?.id;
          responseSale = quote;
        }
      } else if (mode === 'CONSIGNMENT') {
        if (!isOnline) {
          await pushOfflineSale({
             items,
             total: finalTotalWithTip,
             paymentMethod,
             customerId: selectedCustomerId || null,
             sessionId,
             notes,
             type: 'CONSIGNMENT',
             branchId,
             retryCount: 0,
             failed: false
          } as any);
          saleId = `OFFLINE-CONSIGNMENT-${Date.now()}`;
        } else {
          const consignment = await createConsignment(items, finalTotalWithTip, paymentMethod, selectedCustomerId || null);
          saleId = consignment?.id;
          responseSale = consignment;
        }
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
                billingData,
                branchId,
                type: 'SALE'
             },
             retryCount: 0,
             failed: false
          } as any);
          saleId = `OFFLINE-${Date.now()}`;
        } else {
          // ONLINE MODE
          const response = await createSale(items, total + tipAmount, paymentMethod, selectedCustomerId || null, sessionId, finalNotes, cashValue, cardValue, billingData, loadedQuoteId || undefined, loadedConsignmentId || undefined, pointsRedeemed, branchId);
          if (!response.success) {
            throw new Error(response.error);
          }
          saleId = response.sale?.id;
          responseSale = response.sale;
          invoiceError = response.invoiceError;
        }
      }
      resetActiveTab();
      setIsCheckoutOpen(false);
      setIsProcessing(false);

      const isAutoPrint = 
        impresorasConfig.printAutomatically === 'true' || 
        impresorasConfig.printAutomatically === true || 
        impresorasConfig.printAutomatically === 'si' ||
        ticketConfig.impresionAutomatica === 'true' ||
        ticketConfig.impresionAutomatica === true ||
        ticketConfig.impresionAutomatica === 'si';

      if (mode === 'SALE') {
        if (isAutoPrint) {
          printTicket(cartBackup, totalBackup, changeBackup, discountBackup, saleId, responseSale?.folio);
        }
        setSuccessModalData({
          saleId,
          folio: responseSale?.folio || saleId?.slice(0, 8).toUpperCase(),
          total: totalBackup,
          change: changeBackup,
          discount: discountBackup,
          customerName: selectedCust ? selectedCust.name : 'Público en General',
          customerPhone: selectedCust?.phone || '',
          customerEmail: selectedCust?.email || '',
          cartBackup,
          documentType,
          invoiceError: invoiceError,
          invoiceId: responseSale?.invoiceId || null
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
           printTicket(cartBackup, totalBackup, changeBackup, discountBackup, saleId, responseSale?.folio);
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
    <div className="pos-layout" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxWidth: '100%', margin: '0 auto', padding: '0.5rem 0' }}>
      <style>{`
        .pos-top-header {
          display: grid;
          grid-template-columns: 1fr 340px;
          gap: 1.5rem;
          margin-bottom: 1.25rem;
          align-items: end;
        }
        @media (max-width: 1024px) {
          .pos-top-header {
            grid-template-columns: 1fr;
            gap: 1rem;
          }
        }
        .pos-grid-container {
          display: grid;
          grid-template-columns: 1fr 340px;
          gap: 1.5rem;
          align-items: start;
          width: 100%;
        }
        @media (max-width: 1024px) {
          .pos-grid-container {
            grid-template-columns: 1fr;
          }
        }
        
        .pos-tabs-container {
          display: flex;
          align-items: center;
          gap: 6px;
          border-bottom: 2px solid #e2e8f0;
          padding-bottom: 0px;
          overflow-x: auto;
          scrollbar-width: none;
        }
        .pos-tabs-container::-webkit-scrollbar {
          display: none;
        }
        .pos-tab {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 0.6rem 1rem;
          border: 1px solid #cbd5e1;
          border-bottom: none;
          border-radius: 8px 8px 0 0;
          background-color: #f8fafc;
          color: #64748b;
          font-size: 0.85rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
          position: relative;
          bottom: -2px;
          height: 38px;
          white-space: nowrap;
        }
        .pos-tab-active {
          background-color: white;
          color: #0da5aa;
          border-color: #cbd5e1;
          border-bottom: 2.5px solid white;
          box-shadow: 0 -2px 10px rgba(0,0,0,0.02);
          z-index: 1;
        }
        .pos-tab-add {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background-color: #f1f5f9;
          border: 1px solid #cbd5e1;
          color: #475569;
          cursor: pointer;
          transition: all 0.2s;
          margin-left: 6px;
          flex-shrink: 0;
        }
        .pos-tab-add:hover {
          background-color: #e2e8f0;
          color: #1e293b;
          transform: scale(1.05);
        }
        .pos-tab-close {
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          width: 16px;
          height: 16px;
          color: #94a3b8;
          background: transparent;
          border: none;
          cursor: pointer;
          transition: all 0.15s;
          padding: 0;
        }
        .pos-tab-close:hover {
          background-color: #fee2e2;
          color: #ef4444;
        }

        .pos-toggle-container {
          display: flex;
          background-color: #f1f5f9;
          border-radius: 8px;
          padding: 3px;
          width: fit-content;
          gap: 2px;
        }
        .pos-toggle-btn {
          padding: 0.45rem 1rem;
          border-radius: 6px;
          border: none;
          font-size: 0.85rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
          background: transparent;
          color: #64748b;
        }
        .pos-toggle-btn-active {
          background-color: white;
          color: #0f172a;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }

        .pos-action-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 0.75rem;
          width: 100%;
        }
        .pos-action-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 1.5rem 1rem;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          background-color: white;
          cursor: pointer;
          transition: all 0.2s;
          width: 100%;
          gap: 0.75rem;
          text-align: center;
        }
        .pos-action-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 12px rgba(0,0,0,0.05);
          border-color: #cbd5e1;
        }
        .pos-action-icon-wrapper {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 44px;
          height: 44px;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
        }
        .pos-action-label {
          font-size: 0.85rem;
          font-weight: 600;
          color: #1e293b;
        }

        .pos-cart-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          margin-top: 0.5rem;
          margin-bottom: 1.5rem;
          min-height: 250px;
          max-height: 520px;
          overflow-y: auto;
          padding-right: 4px;
        }
        .pos-cart-item {
          display: grid;
          grid-template-columns: 52px 1fr 80px 100px 40px;
          align-items: center;
          padding: 0.85rem 1rem;
          border-radius: 12px;
          background-color: white;
          border: 1px solid #cbd5e1;
          gap: 1rem;
          transition: all 0.2s;
        }
        @media (max-width: 640px) {
          .pos-cart-item {
            grid-template-areas: 
              "image info actions"
              "image qty subtotal";
            grid-template-columns: 52px 1fr auto;
            grid-template-rows: auto auto;
            gap: 0.5rem 0.75rem;
            padding: 0.75rem;
          }
          .pos-cart-item-image {
            grid-area: image;
            align-self: center;
          }
          .pos-cart-item-info {
            grid-area: info;
          }
          .pos-cart-item-qty {
            grid-area: qty;
            display: flex;
            justify-content: flex-start !important;
            align-items: center;
          }
          .pos-cart-item-subtotal {
            grid-area: subtotal;
            display: flex !important;
            flex-direction: row !important;
            align-items: center !important;
            justify-content: flex-end !important;
            gap: 0.5rem;
          }
          .pos-cart-item-actions {
            grid-area: actions;
            display: flex;
            justify-content: center;
            align-items: center;
          }
        }
        .pos-cart-item:hover {
          background-color: #f8fafc;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
        }
        .pos-cart-item-image {
          width: 52px;
          height: 52px;
          border-radius: 10px;
          background-color: #f1f5f9;
          color: #64748b;
          font-weight: bold;
          font-size: 0.95rem;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          overflow: hidden;
        }
        .pos-cart-item-info {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .pos-cart-item-title {
          font-size: 0.925rem;
          font-weight: 700;
          color: #1e293b;
          line-height: 1.25;
        }
        .pos-cart-item-price {
          font-size: 0.8rem;
          color: #64748b;
          font-weight: 500;
        }
        .pos-cart-item-subtotal {
          font-size: 0.95rem;
          font-weight: 800;
          color: #0f172a;
          text-align: right;
        }
        
        .pos-footer-section {
          margin-top: auto;
          padding: 1.25rem 0 0 0;
          border-top: 1px solid #cbd5e1;
        }
        .pos-subtotal-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.75rem;
          font-size: 0.95rem;
          color: #475569;
          font-weight: 600;
        }
        .pos-subtotal-value {
          font-size: 1.15rem;
          font-weight: 800;
          color: #0f172a;
        }
        .pos-checkout-btn {
          width: 100%;
          padding: 1rem 1.5rem;
          background-color: #0da5aa;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 1.1rem;
          font-weight: 800;
          cursor: pointer;
          transition: all 0.2s;
          box-shadow: 0 4px 10px rgba(13, 165, 170, 0.25);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
        }
        .pos-checkout-btn:hover:not(:disabled) {
          background-color: #0b8d91;
          box-shadow: 0 6px 14px rgba(13, 165, 170, 0.35);
        }
        .pos-checkout-btn:disabled {
          background-color: #cbd5e1;
          color: #94a3b8;
          cursor: not-allowed;
          box-shadow: none;
        }
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
        }
      `}</style>

      {/* TOP HEADER ROW: Search Product Left, Client Search Right */}
      <div className="pos-top-header">
        
        {/* Left: Product Search */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <label style={{ fontSize: '0.85rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Buscar productos</label>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <div 
              id="product-search-trigger"
              onClick={() => setIsSearchModalOpen(true)}
              style={{ 
                display: 'flex',
                alignItems: 'center',
                padding: '0.65rem 1rem', 
                borderRadius: '8px', 
                border: '2px solid #0da5aa', 
                backgroundColor: 'white', 
                fontSize: '0.95rem',
                cursor: 'pointer',
                color: '#94a3b8',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                userSelect: 'none',
                height: '42px',
                flex: 1
              }}
            >
              <Search size={18} color="#94a3b8" style={{ marginRight: '8px' }} />
              {searchTerm || "Buscar por nombre, SKU o código de barras"}
            </div>
            <button 
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowScanner(true);
              }}
              style={{
                position: 'absolute',
                right: '12px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#0da5aa',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <Camera size={18} />
            </button>
          </div>
        </div>

        {/* Right: Client Search Selector */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', position: 'relative' }}>
          <label style={{ fontSize: '0.85rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Cliente</label>
          <div style={{ display: 'flex', gap: '0.5rem', width: '100%', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <input 
                type="text" 
                placeholder="Buscar o escribir nombre de cliente..." 
                value={customerSearchTerm}
                disabled={!hasPermission('pos_change_customer')}
                onChange={e => {
                  setCustomerSearchTerm(e.target.value);
                  const matched = customers.find((c: any) => c.id === e.target.value || c.name.toLowerCase() === e.target.value.toLowerCase());
                  if (matched) handleCustomerChange(matched.id);
                  else handleCustomerChange('');
                }}
                style={{ 
                  width: '100%', 
                  padding: '0.55rem 0.75rem',
                  paddingRight: (selectedCustomerId && hasPermission('pos_change_customer')) ? '32px' : '0.75rem', 
                  borderRadius: '8px', 
                  border: '1px solid #cbd5e1', 
                  fontSize: '0.9rem', 
                  outline: 'none', 
                  height: '42px',
                  backgroundColor: hasPermission('pos_change_customer') ? 'white' : '#f1f5f9',
                  cursor: hasPermission('pos_change_customer') ? 'text' : 'not-allowed'
                }}
              />
              {selectedCustomerId && hasPermission('pos_change_customer') && (
                <button
                  type="button"
                  onClick={() => {
                    handleCustomerChange('');
                    setCustomerSearchTerm('');
                  }}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#94a3b8',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '4px',
                    fontSize: '1rem',
                    fontWeight: 'bold',
                    zIndex: 5
                  }}
                >
                  ✕
                </button>
              )}
              {/* Customer Dropdown */}
              {customerSearchTerm.trim() !== '' && !selectedCustomerId && hasPermission('pos_change_customer') && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: 'white', border: '1px solid #cbd5e1', borderRadius: '6px', zIndex: 100, maxHeight: '200px', overflowY: 'auto', marginTop: '0.25rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
                  <div 
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setCustomerSearchTerm('Público en General');
                      handleCustomerChange('');
                    }}
                    style={{ padding: '0.5rem 0.75rem', cursor: 'pointer', borderBottom: '1px solid #f1f5f9', fontSize: '0.9rem', color: '#1e293b' }}
                  >
                    Público en General
                  </div>
                  {activeCustomers.filter(c => c.name.toLowerCase().includes(customerSearchTerm.toLowerCase())).map(c => (
                    <div 
                      key={c.id} 
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleCustomerChange(c.id);
                        setCustomerSearchTerm(c.name);
                      }}
                      style={{ padding: '0.5rem 0.75rem', cursor: 'pointer', borderBottom: '1px solid #f1f5f9', fontSize: '0.9rem', color: '#1e293b' }}
                    >
                      {c.name}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <button
              type="button"
              disabled={!hasPermission('pos_change_customer')}
              onClick={() => {
                if (customerSearchTerm.trim() !== '' && customerSearchTerm !== 'Público en General' && !selectedCustomerId) {
                  setNewCustName(customerSearchTerm);
                } else {
                  setNewCustName('');
                }
                setShowAddCustomerModal(true);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '42px',
                height: '42px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                backgroundColor: hasPermission('pos_change_customer') ? 'white' : '#f1f5f9',
                cursor: hasPermission('pos_change_customer') ? 'pointer' : 'not-allowed',
                transition: 'all 0.15s',
                color: hasPermission('pos_change_customer') ? '#0da5aa' : '#94a3b8',
                flexShrink: 0
              }}
              title={hasPermission('pos_change_customer') ? "Registrar Nuevo Cliente" : "Sin permiso para cambiar cliente"}
            >
              <Plus size={20} />
            </button>
          </div>
          {selectedCustomerId && selectedCust && (
            <div style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: 'bold', marginTop: '0.15rem' }}>
              ✓ Seleccionado: {selectedCust.name} {selectedCust.creditLimit > 0 ? `($${selectedCust.creditLimit})` : ''}
            </div>
          )}
        </div>

      </div>

      <div className="pos-grid-container">
        
        {/* LEFT COLUMN: Tabs, Pill controls, Cart items, Checkout */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          
          {/* TABS ROW WITH MENU BUTTON */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', borderBottom: 'none', borderRadius: '8px 8px 0 0', padding: '6px 8px 0 8px', overflow: 'hidden' }}>
            <div className="pos-tabs-container" style={{ borderBottom: 'none', marginBottom: 0 }}>
              {tabs.map((tab) => {
                const isActive = tab.id === activeTabId;
                return (
                  <div 
                    key={tab.id}
                    onClick={() => switchTab(tab.id)}
                    className={`pos-tab ${isActive ? 'pos-tab-active' : ''}`}
                  >
                    <span>{tab.name}</span>
                    {tabs.length > 1 && (
                      <button 
                        type="button" 
                        onClick={(e) => closeTab(tab.id, e)}
                        className="pos-tab-close"
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>
                );
              })}
              <button 
                type="button"
                onClick={addTab}
                className="pos-tab-add"
                title="Nueva Pestaña"
              >
                <Plus size={16} />
              </button>
            </div>
            
            {/* Menu icon on the right side of tabs */}
            <button
              type="button"
              style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px' }}
            >
              <MoreVertical size={18} />
            </button>
          </div>

          {/* ROW BELOW TABS: Pill toggles, Price List, trash, options */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', padding: '0.85rem 1rem', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc' }}>
            
            {/* Pill Toggle for Venta vs Pedido */}
            {mode === 'SALE' ? (
              <div className="pos-toggle-container">
                <button
                  type="button"
                  onClick={() => setTransactionType('VENTA')}
                  className={`pos-toggle-btn ${transactionType === 'VENTA' ? 'pos-toggle-btn-active' : ''}`}
                >
                  Venta
                </button>
                <button
                  type="button"
                  onClick={() => setTransactionType('PEDIDO')}
                  className={`pos-toggle-btn ${transactionType === 'PEDIDO' ? 'pos-toggle-btn-active' : ''}`}
                >
                  Pedido
                </button>
              </div>
            ) : (
              <div style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#64748b' }}>
                {mode === 'QUOTE' ? 'Documento: Cotización' : 'Documento: Consignación'}
              </div>
            )}

            {/* Price list and actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              
              {/* Price lists select */}
              <div style={{ display: 'flex', alignItems: 'center', border: 'none', borderRadius: '6px', backgroundColor: hasPermission('pos_price_list_change') ? '#78716c' : '#a8a29e', padding: '0 0.75rem', height: '36px', color: 'white' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 'bold', marginRight: '0.35rem' }}>Listas de Precios:</span>
                <select 
                  value={priceList} 
                  disabled={!hasPermission('pos_price_list_change')}
                  onChange={e => setPriceList(e.target.value)} 
                  style={{ 
                    border: 'none', 
                    background: 'transparent', 
                    outline: 'none', 
                    fontWeight: '700', 
                    color: 'white', 
                    fontSize: '0.8rem', 
                    cursor: hasPermission('pos_price_list_change') ? 'pointer' : 'not-allowed',
                    paddingRight: '0.25rem'
                  }}
                >
                  <option value="price" style={{ color: '#1e293b' }}>Normal (Público General)</option>
                  {dynamicPriceLists.map(pl => (
                    <option key={pl.id} value={`priceList_${pl.id}`} style={{ color: '#1e293b' }}>{pl.name}</option>
                  ))}
                  {ventasConfig.wholesalePriceActive && <option value="wholesalePrice" style={{ color: '#1e293b' }}>Mayoreo</option>}
                  {ventasConfig.specialPriceActive && <option value="specialPrice" style={{ color: '#1e293b' }}>Precio Especial</option>}
                </select>
              </div>

              {/* Trash/Clear cart */}
              <button 
                type="button"
                onClick={() => {
                  if (cart.length > 0 && confirm('¿Deseas vaciar el carrito actual?')) {
                    setCart([]);
                  }
                }}
                style={{
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  backgroundColor: 'white',
                  width: '36px',
                  height: '36px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ef4444',
                  cursor: 'pointer',
                  transition: 'all 0.15s'
                }}
                title="Vaciar ticket"
                disabled={cart.length === 0}
              >
                <Trash2 size={16} />
              </button>

              {/* Pause ticket icon */}
              <button
                type="button"
                onClick={handlePutOnHold}
                style={{
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  backgroundColor: 'white',
                  width: '36px',
                  height: '36px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#475569',
                  cursor: 'pointer',
                  transition: 'all 0.15s'
                }}
                title="Pausar ticket actual"
                disabled={cart.length === 0}
              >
                <Clock size={16} />
              </button>

            </div>
          </div>

          {/* CART ITEMS LIST */}
          <div className="pos-cart-list" style={{ border: '1px solid #cbd5e1', borderTop: 'none', padding: '1rem', backgroundColor: 'white', borderBottomLeftRadius: '12px', borderBottomRightRadius: '12px', minHeight: '300px' }}>
            {cart.length === 0 ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: '#94a3b8', padding: '5rem 1rem' }}>
                <ShoppingBag size={56} color="#cbd5e1" style={{ marginBottom: '1rem' }} />
                <div style={{ fontSize: '1.15rem', fontWeight: '800', color: '#64748b' }}>El ticket está vacío</div>
                <div style={{ fontSize: '0.85rem', marginTop: '0.25rem', color: '#94a3b8' }}>Busca artículos arriba o haz clic en "Crear producto" para agregar.</div>
              </div>
            ) : (
              cart.map(item => {
                const itemPrice = getProductPrice(item);
                const itemSubtotal = itemPrice * item.quantity;
                return (
                  <div key={item.listId || item.cartItemId} className="pos-cart-item" style={{ marginBottom: '0.75rem' }}>
                    
                    {/* Image or Initials */}
                    <div className="pos-cart-item-image">
                      {item.imageUrl ? (
                        <img 
                          src={item.imageUrl} 
                          alt={item.name} 
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            const parent = e.currentTarget.parentElement;
                            if (parent) {
                              parent.innerHTML = `<span>${item.name.substring(0, 2).toUpperCase()}</span>`;
                            }
                          }}
                        />
                      ) : (
                        <span>{item.name.substring(0, 2).toUpperCase()}</span>
                      )}
                    </div>

                    {/* Product description & Price details */}
                    <div className="pos-cart-item-info">
                      <div className="pos-cart-item-title">{item.name}</div>
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.15rem', fontSize: '0.725rem', color: '#64748b' }}>
                        {item.sku && <span>SKU: <strong style={{ color: '#334155' }}>{item.sku}</strong></span>}
                        {item.barcode && <span>| Código: <strong style={{ color: '#334155' }}>{item.barcode}</strong></span>}
                      </div>
                      {hasPermission('pos_price_change') ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.25rem' }}>
                          <span style={{ color: '#64748b', fontSize: '0.85rem' }}>$</span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={item.customPrice !== undefined ? item.customPrice : itemPrice}
                            onChange={e => {
                              const val = e.target.value;
                              if (val === '') {
                                handleUpdatePrice(item.cartItemId, '' as any);
                              } else {
                                const parsed = parseFloat(val);
                                if (!isNaN(parsed)) {
                                  handleUpdatePrice(item.cartItemId, parsed);
                                }
                              }
                            }}
                            style={{
                              width: '85px',
                              padding: '0.15rem 0.35rem',
                              border: '1px solid #cbd5e1',
                              borderRadius: '4px',
                              fontSize: '0.9rem',
                              fontWeight: 'bold',
                              color: '#1e293b',
                              outline: 'none',
                              backgroundColor: 'white'
                            }}
                          />
                        </div>
                      ) : (
                        <div className="pos-cart-item-price">${itemPrice.toFixed(2)}</div>
                      )}
                      {itemDiscounts[item.cartItemId] > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#db2777', fontSize: '0.8rem', fontWeight: 'bold', marginTop: '0.25rem' }}>
                          <Percent size={14} />
                          <span>Promoción: -${itemDiscounts[item.cartItemId].toFixed(2)}</span>
                        </div>
                      )}
                      {mode === 'QUOTE' && (() => {
                        const purchasePrice = item.averageCost || item.cost || 0;
                        const marginPercent = itemPrice > 0 ? ((itemPrice - purchasePrice) / itemPrice) * 100 : 0;
                        return (
                          <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.75rem', marginTop: '0.25rem', color: '#64748b', flexWrap: 'wrap', alignItems: 'center' }}>
                            <span style={{ backgroundColor: '#f1f5f9', padding: '0.15rem 0.35rem', borderRadius: '4px', border: '1px solid #e2e8f0', color: '#475569' }}>
                              Compra (prom.): <strong>${purchasePrice.toFixed(2)}</strong>
                            </span>
                            <span style={{ 
                              backgroundColor: marginPercent >= 0 ? '#dcfce7' : '#fee2e2', 
                              color: marginPercent >= 0 ? '#15803d' : '#b91c1c', 
                              padding: '0.15rem 0.35rem', 
                              borderRadius: '4px',
                              border: marginPercent >= 0 ? '1px solid #bbf7d0' : '1px solid #fca5a5',
                              fontWeight: 'bold'
                            }}>
                              Margen: <strong>{marginPercent.toFixed(1)}%</strong>
                            </span>
                            <span style={{ backgroundColor: '#f1f5f9', padding: '0.15rem 0.35rem', borderRadius: '4px', border: '1px solid #e2e8f0', color: '#475569' }}>
                              Venta: <strong>${itemPrice.toFixed(2)}</strong>
                            </span>
                          </div>
                        );
                      })()}
                    </div>


                    {/* Quantity input box */}
                    <div className="pos-cart-item-qty" style={{ display: 'flex', justifyContent: 'center' }}>
                      <input 
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={e => handleUpdateQty(item.cartItemId, parseInt(e.target.value) || 1)}
                        style={{ 
                          width: '56px', 
                          height: '36px', 
                          border: '1px solid #cbd5e1', 
                          borderRadius: '6px', 
                          textAlign: 'center', 
                          fontWeight: '700',
                          fontSize: '0.95rem',
                          color: '#1e293b',
                          outline: 'none',
                          backgroundColor: 'white'
                        }}
                      />
                    </div>

                    {/* Subtotal */}
                    <div className="pos-cart-item-subtotal" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'center' }}>
                      {itemDiscounts[item.cartItemId] > 0 ? (
                        <>
                          <span style={{ fontSize: '0.8rem', color: '#94a3b8', textDecoration: 'line-through' }}>
                            ${itemSubtotal.toFixed(2)}
                          </span>
                          <span style={{ color: '#db2777', fontWeight: 'bold' }}>
                            ${(itemSubtotal - itemDiscounts[item.cartItemId]).toFixed(2)}
                          </span>
                        </>
                      ) : (
                        `$${itemSubtotal.toFixed(2)}`
                      )}
                    </div>

                    {/* Actions menu */}
                    <div className="pos-cart-item-actions" style={{ position: 'relative', display: 'flex', justifyContent: 'center' }}>
                      <button 
                        type="button"
                        onClick={() => setActiveItemMenuId(activeItemMenuId === item.cartItemId ? null : item.cartItemId)}
                        style={{ border: 'none', background: 'none', color: '#64748b', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        <MoreVertical size={18} />
                      </button>
                      {activeItemMenuId === item.cartItemId && (
                        <>
                          <div 
                            onClick={() => setActiveItemMenuId(null)}
                            style={{ position: 'fixed', inset: 0, zIndex: 10 }}
                          />
                          <div style={{ position: 'absolute', right: 0, top: '100%', backgroundColor: 'white', border: '1px solid #cbd5e1', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', zIndex: 11, minWidth: '150px', padding: '4px' }}>
                            <button
                              type="button"
                              onClick={async () => {
                                setActiveItemMenuId(null);
                                setStockModalProduct(item);
                                setShowStockModal(true);
                                setLoadingBranchStocks(true);
                                try {
                                  const stocks = await getProductBranchStocks({
                                    productId: item.id,
                                    sku: item.sku || null,
                                    barcode: item.barcode || null,
                                    name: item.name,
                                    variantId: item.variantId || null,
                                    attribute: item.attribute || null,
                                    currentBranchId: branchId
                                  });
                                  setBranchStocks(stocks);
                                } catch (e) {
                                  console.error("Error fetching branch stocks:", e);
                                } finally {
                                  setLoadingBranchStocks(false);
                                }
                              }}
                              style={{ display: 'flex', width: '100%', padding: '8px 12px', fontSize: '0.85rem', color: '#334155', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left', borderRadius: '4px', borderBottom: '1px solid #f1f5f9' }}
                              onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                              onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                            >
                              Stock sucursales
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setCart(cart.filter(c => c.cartItemId !== item.cartItemId));
                                setActiveItemMenuId(null);
                              }}
                              style={{ display: 'flex', width: '100%', padding: '8px 12px', fontSize: '0.85rem', color: '#ef4444', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left', borderRadius: '4px' }}
                              onMouseEnter={e => e.currentTarget.style.backgroundColor = '#fef2f2'}
                              onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                            >
                              Eliminar
                            </button>
                          </div>
                        </>
                      )}
                    </div>

                  </div>
                );
              })
            )}
          </div>

          {/* PAYMENT SUMMARY AND CHECKOUT CTA */}
          <div className="pos-footer-section">
            
            <div className="pos-subtotal-row">
              <span>Subtotal ({cart.reduce((s, i) => s + i.quantity, 0)} artículos)</span>
              <span className="pos-subtotal-value">${subTotal.toFixed(2)}</span>
            </div>

            {mode === 'QUOTE' && cart.length > 0 && (() => {
              const totalPurchaseCost = cart.reduce((sum, item) => sum + ((item.averageCost || item.cost || 0) * item.quantity), 0);
              const totalMarginPercent = total > 0 ? ((total - totalPurchaseCost) / total) * 100 : 0;
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', borderTop: '1px solid #f1f5f9', borderBottom: '1px solid #f1f5f9', padding: '0.75rem 0', margin: '0.5rem 0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#475569' }}>
                    <span>Costo de Compra Total (prom.):</span>
                    <strong>${totalPurchaseCost.toFixed(2)}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#475569' }}>
                    <span>Margen Total:</span>
                    <span style={{ 
                      color: totalMarginPercent >= 0 ? '#16a34a' : '#dc2626', 
                      fontWeight: 'bold',
                      backgroundColor: totalMarginPercent >= 0 ? '#dcfce7' : '#fee2e2',
                      padding: '0.1rem 0.35rem',
                      borderRadius: '4px'
                    }}>
                      {totalMarginPercent.toFixed(1)}%
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#475569' }}>
                    <span>Venta Total:</span>
                    <strong>${total.toFixed(2)}</strong>
                  </div>
                </div>
              );
            })()}

            {discount > 0 && (
              <div className="pos-subtotal-row" style={{ color: '#16a34a', fontSize: '0.85rem', marginBottom: '0.75rem' }}>
                <span>Descuento aplicado</span>
                <span>-${discount.toFixed(2)}</span>
              </div>
            )}

            {/* Manual Discount selection */}
            {cart.length > 0 && ventasConfig.bloquearDescuentos !== true && (
              <div style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '0.75rem' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#64748b' }}>Descuento Manual:</span>
                <select 
                  value={manualDiscountType} 
                  disabled={!hasPermission('pos_manual_discount')}
                  onChange={e => setManualDiscountType(e.target.value as '$' | '%')} 
                  style={{ width: '50px', padding: '0.25rem', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.85rem', backgroundColor: hasPermission('pos_manual_discount') ? 'white' : '#f1f5f9', cursor: hasPermission('pos_manual_discount') ? 'pointer' : 'not-allowed' }}
                >
                  <option value="$">$</option>
                  <option value="%">%</option>
                </select>
                <input 
                  type="number" 
                  min="0"
                  placeholder="Monto"
                  value={manualDiscountValue}
                  disabled={!hasPermission('pos_manual_discount')}
                  onChange={e => setManualDiscountValue(e.target.value === '' ? '' : parseFloat(e.target.value))}
                  style={{ width: '80px', padding: '0.25rem', borderRadius: '6px', border: '1px solid #cbd5e1', textAlign: 'right', outline: 'none', fontSize: '0.85rem', backgroundColor: hasPermission('pos_manual_discount') ? 'white' : '#f1f5f9', cursor: hasPermission('pos_manual_discount') ? 'text' : 'not-allowed' }}
                />
                {!hasPermission('pos_manual_discount') && (
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    🔒 Bloqueado
                  </span>
                )}
              </div>
            )}

            {/* Main checkout CTA */}
            <button
              type="button"
              onClick={() => setIsCheckoutOpen(true)}
              disabled={cart.length === 0 || isProcessing}
              className="pos-checkout-btn"
            >
              {isProcessing ? 'Procesando...' : (
                mode === 'QUOTE' ? `Guardar Cotización $${total.toFixed(2)}` : 
                mode === 'CONSIGNMENT' ? `Crear Consignación $${total.toFixed(2)}` :
                transactionType === 'PEDIDO' ? `Guardar Pedido $${total.toFixed(2)}` : `Cobrar $${total.toFixed(2)}`
              )}
            </button>

          </div>

        </div>

        {/* RIGHT COLUMN: Sidebar Action Cards & On Hold list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          <div className="pos-action-grid">
            
            {/* Card 1: Añadir Promoción */}
            <button 
              type="button"
              onClick={() => {
                if (promotions.length === 0) {
                  alert('No hay promociones activas registradas.');
                  return;
                }
                setShowPromoModal(true);
              }}
              className="pos-action-card"
            >
              <div className="pos-action-icon-wrapper" style={{ backgroundColor: '#f3e8ff', color: '#8b5cf6' }}>
                <Percent size={20} />
              </div>
              <span className="pos-action-label">Añadir Promoción</span>
            </button>

            {/* Card 2: Crear producto */}
            <button 
              type="button"
              onClick={() => setShowFastItemModal(true)}
              className="pos-action-card"
            >
              <div className="pos-action-icon-wrapper" style={{ backgroundColor: '#ccfbf1', color: '#0d9488' }}>
                <Plus size={20} />
              </div>
              <span className="pos-action-label">Crear producto</span>
            </button>

            {/* Card 3: Cargar Cotización */}
            <button 
              type="button"
              onClick={() => setIsQuoteModalOpen(true)}
              className="pos-action-card"
            >
              <div className="pos-action-icon-wrapper" style={{ backgroundColor: '#e0f2fe', color: '#0284c7' }}>
                <FolderOpen size={20} />
              </div>
              <span className="pos-action-label">Cargar Cotización</span>
            </button>

            {/* List of On Hold tickets */}
            {onHoldTickets.length > 0 && (
              <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', borderTop: '1px solid #cbd5e1', paddingTop: '1rem' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase' }}>Tickets en Espera</span>
                {onHoldTickets.map((ticket) => (
                  <div key={ticket.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid #cbd5e1', borderRadius: '8px', overflow: 'hidden', backgroundColor: 'white', width: '100%' }}>
                    <button
                      type="button"
                      onClick={() => handleRestoreTicket(ticket)}
                      style={{
                        flex: 1,
                        padding: '0.5rem 0.75rem',
                        border: 'none',
                        backgroundColor: 'white',
                        color: '#475569',
                        fontSize: '0.85rem',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        textAlign: 'left',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}
                    >
                      {ticket.name} (${ticket.total.toFixed(2)})
                    </button>
                    <button 
                      type="button" 
                      onClick={() => handleDeleteOnHold(ticket.id)}
                      style={{ border: 'none', borderLeft: '1px solid #cbd5e1', padding: '0.5rem 0.75rem', backgroundColor: '#fee2e2', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}

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
                 style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--caanma-border)' }}
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
                   style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--caanma-border)' }}
                 />
               </div>
               <div style={{ flex: 1 }}>
                 <label style={{ display: 'block', fontWeight: '500', marginBottom: '0.25rem' }}>Cantidad</label>
                 <input 
                   type="number"
                   min="1"
                   value={fastItemQuantity}
                   onChange={e => setFastItemQuantity(parseInt(e.target.value) || 1)}
                   style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--caanma-border)' }}
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
                   style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--caanma-border)' }}
                 />
               </div>
               <div style={{ flex: 1 }}>
                 <label style={{ display: 'block', fontWeight: '500', marginBottom: '0.25rem' }}>Proveedor</label>
                 <select 
                   value={fastItemSupplierId}
                   onChange={e => setFastItemSupplierId(e.target.value)}
                   style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--caanma-border)', height: '45px', backgroundColor: 'white' }}
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
                 style={{ flex: 1, padding: '0.75rem', border: '1px solid var(--caanma-border)', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', background: 'white' }}
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

      {showAddCustomerModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60 }}>
          <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '12px', width: '500px', maxWidth: '95%', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.25rem', color: '#0da5aa' }}>
              Registrar Nuevo Cliente
            </h2>
            
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontWeight: '600', fontSize: '0.85rem', marginBottom: '0.25rem', color: '#475569' }}>Nombre Completo *</label>
              <input 
                type="text"
                autoFocus
                value={newCustName}
                onChange={e => setNewCustName(e.target.value)}
                placeholder="Nombre o Razón Social"
                style={{ width: '100%', padding: '0.65rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.9rem', outline: 'none' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontWeight: '600', fontSize: '0.85rem', marginBottom: '0.25rem', color: '#475569' }}>Teléfono</label>
                <input 
                  type="text"
                  value={newCustPhone}
                  onChange={e => setNewCustPhone(e.target.value)}
                  placeholder="10 dígitos"
                  style={{ width: '100%', padding: '0.65rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.9rem', outline: 'none' }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontWeight: '600', fontSize: '0.85rem', marginBottom: '0.25rem', color: '#475569' }}>Correo Electrónico</label>
                <input 
                  type="email"
                  value={newCustEmail}
                  onChange={e => setNewCustEmail(e.target.value)}
                  placeholder="ejemplo@correo.com"
                  style={{ width: '100%', padding: '0.65rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.9rem', outline: 'none' }}
                />
              </div>
            </div>

            <div style={{ marginBottom: '1rem', borderTop: '1px solid #f1f5f9', paddingTop: '1rem' }}>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#64748b', marginBottom: '0.75rem' }}>Datos de Facturación (Opcional)</h3>
              
              <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontWeight: '600', fontSize: '0.85rem', marginBottom: '0.25rem', color: '#475569' }}>RFC</label>
                  <input 
                    type="text"
                    value={newCustTaxId}
                    onChange={e => setNewCustTaxId(e.target.value.toUpperCase())}
                    placeholder="RFC del cliente"
                    style={{ width: '100%', padding: '0.65rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.9rem', outline: 'none' }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontWeight: '600', fontSize: '0.85rem', marginBottom: '0.25rem', color: '#475569' }}>Código Postal</label>
                  <input 
                    type="text"
                    value={newCustZipCode}
                    onChange={e => setNewCustZipCode(e.target.value)}
                    placeholder="5 dígitos"
                    style={{ width: '100%', padding: '0.65rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.9rem', outline: 'none' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '0.5rem' }}>
                <label style={{ display: 'block', fontWeight: '600', fontSize: '0.85rem', marginBottom: '0.25rem', color: '#475569' }}>Calle y Número</label>
                <input 
                  type="text"
                  value={newCustStreet}
                  onChange={e => setNewCustStreet(e.target.value)}
                  placeholder="Dirección fiscal"
                  style={{ width: '100%', padding: '0.65rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.9rem', outline: 'none' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
              <button 
                type="button"
                onClick={() => {
                  setShowAddCustomerModal(false);
                  setNewCustName('');
                  setNewCustPhone('');
                  setNewCustEmail('');
                  setNewCustStreet('');
                  setNewCustZipCode('');
                  setNewCustTaxId('');
                }}
                style={{ flex: 1, padding: '0.75rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', background: 'white', fontSize: '0.9rem' }}
              >
                Cancelar
              </button>
              <button 
                type="button"
                onClick={handleSaveCustomer}
                disabled={!newCustName.trim() || isSavingCustomer}
                className="btn-primary"
                style={{ 
                  flex: 1, 
                  padding: '0.75rem', 
                  fontWeight: 'bold', 
                  fontSize: '0.9rem',
                  backgroundColor: (!newCustName.trim() || isSavingCustomer) ? '#cbd5e1' : '#0da5aa', 
                  borderColor: (!newCustName.trim() || isSavingCustomer) ? '#cbd5e1' : '#0da5aa',
                  color: 'white',
                  cursor: (!newCustName.trim() || isSavingCustomer) ? 'not-allowed' : 'pointer'
                }}
              >
                {isSavingCustomer ? 'Guardando...' : 'Guardar y Seleccionar'}
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
            
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--caanma-border)', paddingBottom: '1rem' }}>
               <button 
                 onClick={() => setDocumentType('TICKET')} 
                 style={{ flex: 1, padding: '0.75rem', borderRadius: '4px', border: 'none', backgroundColor: documentType === 'TICKET' ? 'var(--caanma-primary)' : '#f1f5f9', color: documentType === 'TICKET' ? 'white' : '#64748b', fontWeight: 'bold', cursor: 'pointer' }}
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
              <div style={{ fontSize: '1rem', color: 'var(--caanma-text-muted)' }}>{mode === 'QUOTE' ? 'Total Presupuestado' : mode === 'CONSIGNMENT' ? 'Total Consignado' : 'Total a Pagar'}</div>
              <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'var(--caanma-primary)' }}>${finalTotalWithTip.toFixed(2)}</div>
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
               <div style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--caanma-border)', paddingBottom: '1.5rem' }}>
                 <label style={{ display: 'block', fontWeight: '500', marginBottom: '0.5rem' }}>Añadir Propina</label>
                 <div style={{ display: 'flex', gap: '0.5rem' }}>
                   {[10, 15, 20].map(pct => {
                     const amt = total * (pct / 100);
                     return (
                       <button
                         key={pct}
                         onClick={() => setTipAmount(tipAmount === amt ? 0 : amt)}
                         style={{ flex: 1, padding: '0.5rem', borderRadius: '4px', border: '1px solid', borderColor: tipAmount === amt ? '#10b981' : 'var(--caanma-border)', backgroundColor: tipAmount === amt ? '#d1fae5' : 'white', cursor: 'pointer', fontWeight: tipAmount === amt ? 'bold' : 'normal' }}
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
                        borderColor: paymentMethod === method.id ? 'var(--caanma-primary)' : 'var(--caanma-border)',
                        backgroundColor: paymentMethod === method.id ? '#eff6ff' : 'white',
                        color: paymentMethod === method.id ? 'var(--caanma-primary)' : 'inherit',
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
                  style={{ width: '100%', padding: '1rem', fontSize: '1.25rem', borderRadius: '4px', border: '1px solid var(--caanma-border)', textAlign: 'right' }}
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
                    style={{ width: '100%', padding: '1rem', fontSize: '1.25rem', borderRadius: '4px', border: '1px solid var(--caanma-border)', textAlign: 'right' }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontWeight: '500', marginBottom: '0.5rem' }}>Pago en Efectivo</label>
                  <input 
                    type="number" 
                    value={amountReceived}
                    onChange={e => setAmountReceived(e.target.value === '' ? '' : parseFloat(e.target.value))}
                    placeholder={`Restante`}
                    style={{ width: '100%', padding: '1rem', fontSize: '1.25rem', borderRadius: '4px', border: '1px solid var(--caanma-border)', textAlign: 'right' }}
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
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--caanma-border)' }}
               />
            </div>

            {documentType === 'FACTURA' && (
              <div style={{ marginBottom: '1.5rem', padding: '1rem', backgroundColor: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                 <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#166534', marginBottom: '1rem' }}>Datos de Facturación CFDI 4.0</h3>
                 
                 <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', color: '#166534', fontWeight: 'bold', marginBottom: '0.25rem' }}>RFC *</label>
                      <input 
                         type="text" 
                         value={billRfc} 
                         onChange={e => {
                           const newRfc = e.target.value.toUpperCase().replace(/[^A-Z0-9&]/g, '');
                           setBillRfc(newRfc);
                           setBillRegime(prev => {
                             if (newRfc.length === 13 && (prev === '601' || prev === '603')) {
                               return '612'; // Default physical person regime in this select
                             } else if (newRfc.length === 12 && (prev !== '601' && prev !== '603')) {
                               return '601'; // Default moral person regime
                             }
                             return prev;
                           });
                         }} 
                         placeholder="XAXX010101000" 
                         style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #bbf7d0' }} 
                       />
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
              <button onClick={() => setIsCheckoutOpen(false)} style={{ flex: 1, padding: '1rem', border: '1px solid var(--caanma-border)', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', background: 'white' }}>
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
                style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--caanma-border)' }}
                autoFocus
              />
            </div>

            <div style={{ overflowY: 'auto', flex: 1, marginBottom: '1.5rem', border: '1px solid var(--caanma-border)', borderRadius: '4px' }}>
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
                      borderBottom: '1px solid var(--caanma-border)', 
                      backgroundColor: 'white', 
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                 >
                    <div>
                      <div style={{ fontWeight: 'bold', color: '#1e293b' }}>Cotización #{quote.id.slice(0, 8)}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--caanma-text-muted)' }}>{new Date(quote.createdAt).toLocaleString()}</div>
                    </div>
                    <div style={{ fontWeight: 'bold', color: 'var(--caanma-primary)' }}>
                      ${quote.total.toFixed(2)}
                    </div>
                 </button>
               ))}
               {pendingQuotes.length === 0 && (
                 <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--caanma-text-muted)' }}>
                    No hay cotizaciones pendientes en esta sucursal.
                 </div>
               )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
               <button 
                 onClick={() => setIsQuoteModalOpen(false)}
                 style={{ padding: '0.75rem 1.5rem', border: '1px solid var(--caanma-border)', borderRadius: '4px', background: 'white', cursor: 'pointer', fontWeight: 'bold', color: 'var(--caanma-text-muted)' }}
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
            <div style={{ color: 'var(--caanma-text-muted)', marginBottom: '1.5rem' }}>
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
                    border: '1px solid var(--caanma-border)',
                    borderRadius: '4px',
                    backgroundColor: 'white',
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 'bold', color: '#1e293b' }}>{v.attribute}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--caanma-text-muted)' }}>SKU: {v.sku || '--'}</div>
                  </div>
                  <div style={{ fontSize: '0.875rem', fontWeight: '600', color: v.stock > 0 ? '#16a34a' : '#dc2626' }}>
                    {v.stock} disp.
                  </div>
                </button>
              ))}
            </div>

            <div style={{ marginTop: '1.5rem', textAlign: 'right' }}>
              <button onClick={() => setSelectedProductForVariant(null)} style={{ padding: '0.75rem 1.5rem', border: '1px solid var(--caanma-border)', borderRadius: '4px', cursor: 'pointer', background: 'white', fontWeight: 'bold' }}>
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
                  <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--caanma-primary)' }}>
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

              {/* Estado de Facturación */}
              {successModalData.documentType === 'FACTURA' && (
                successModalData.invoiceError ? (
                  <div style={{ padding: '0.85rem 1rem', backgroundColor: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '8px', color: '#991b1b', fontSize: '0.85rem' }}>
                    <div style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.25rem', marginBottom: '0.25rem' }}>
                      ⚠️ Factura no emitida
                    </div>
                    <div style={{ fontSize: '0.8rem', opacity: 0.9 }}>{successModalData.invoiceError}</div>
                    <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: '#7f1d1d' }}>
                      La venta fue registrada, pero no se pudo timbrar. Puedes reintentar timbrarla desde el detalle de la venta más tarde.
                    </div>
                  </div>
                ) : (
                  <div style={{ padding: '0.85rem 1rem', backgroundColor: '#ecfdf5', border: '1px solid #6ee7b7', borderRadius: '8px', color: '#065f46', fontSize: '0.85rem' }}>
                    <div style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      ✓ Factura Timbrada Exitosamente
                    </div>
                    <div style={{ fontSize: '0.8rem', opacity: 0.9, marginTop: '0.25rem' }}>
                      Se ha generado el folio fiscal correspondiente en Facturapi.
                    </div>
                  </div>
                )
              )}

              {/* Actions Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.75rem' }}>
                <button
                  onClick={() => printTicket(successModalData.cartBackup, successModalData.total, successModalData.change, successModalData.discount, successModalData.saleId, successModalData.folio)}
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

              {/* Email options */}
              <div style={{ border: '1px solid #cbd5e1', borderRadius: '12px', padding: '1rem', backgroundColor: '#f8fafc', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 'bold', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  ✉️ Enviar por Correo Electrónico
                </h4>
                <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b', lineHeight: '1.4' }}>
                  {successModalData.documentType === 'INVOICE' && !successModalData.invoiceError
                    ? "Envía la factura CFDI (PDF y XML adjuntos) al correo del cliente." 
                    : "Envía el ticket de la venta al correo del cliente."}
                </p>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="email"
                    placeholder="cliente@ejemplo.com"
                    value={successEmail}
                    onChange={(e) => setSuccessEmail(e.target.value)}
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
                    onClick={handleSuccessSendEmail}
                    disabled={!successEmail || successIsSendingEmail || successSendEmailSuccess}
                    style={{
                      padding: '0.5rem 1rem',
                      backgroundColor: '#3b82f6',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem'
                    }}
                  >
                    {successIsSendingEmail ? 'Enviando...' : successSendEmailSuccess ? '✓ ¡Enviado!' : 'Enviar'}
                  </button>
                </div>
                {successSendEmailError && (
                  <div style={{ color: '#ef4444', fontSize: '0.75rem' }}>{successSendEmailError}</div>
                )}
              </div>

              {/* Reset POS & Close */}
              <button
                onClick={() => {
                  setShowSuccessModal(false);
                  setSuccessModalData(null);
                }}
                style={{
                  padding: '1rem',
                  backgroundColor: 'var(--caanma-primary)',
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

      {showPromoModal && (
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
            width: '500px',
            maxWidth: '95%',
            maxHeight: '85vh',
            display: 'flex',
            flexDirection: 'column',
            padding: '1.5rem',
            backgroundColor: 'white',
            borderRadius: '12px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--caanma-border)', paddingBottom: '0.75rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                <Percent size={20} color="var(--caanma-primary)" /> Asignar Promociones
              </h3>
              <button 
                type="button" 
                onClick={() => setShowPromoModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ overflowY: 'auto', flex: 1, marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {promotions.length === 0 ? (
                <div style={{ padding: '2rem 1rem', textAlign: 'center', color: '#64748b' }}>
                  No hay promociones activas registradas en esta sucursal.
                </div>
              ) : (
                <>
                  {!hasPermission('pos_assign_promotions') && (
                    <div style={{ padding: '0.75rem', backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '0.5rem', border: '1px solid #f87171', fontWeight: '500' }}>
                      ⚠️ Solo lectura: No tienes permiso para asignar o modificar promociones en esta venta.
                    </div>
                  )}
                  {promotions.map((promo: any) => {
                    const isChecked = appliedPromotionIds === null || appliedPromotionIds.includes(promo.id);
                    return (
                      <label 
                        key={promo.id} 
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '0.75rem', 
                          padding: '0.75rem', 
                          borderRadius: '8px', 
                          border: '1px solid #e2e8f0', 
                          backgroundColor: isChecked ? '#f8f5ff' : 'white',
                          cursor: hasPermission('pos_assign_promotions') ? 'pointer' : 'not-allowed',
                          transition: 'all 0.15s'
                        }}
                      >
                        <input 
                          type="checkbox"
                          checked={isChecked}
                          disabled={!hasPermission('pos_assign_promotions')}
                          onChange={() => {
                            if (!hasPermission('pos_assign_promotions')) return;
                            
                            setAppliedPromotionIds((prev: string[] | null) => {
                              const activePromoIds = promotions.map((p: any) => p.id);
                              const currentList = prev !== null ? prev : activePromoIds;
                              if (currentList.includes(promo.id)) {
                                return currentList.filter((id: string) => id !== promo.id);
                              } else {
                                return [...currentList, promo.id];
                              }
                            });
                          }}
                          style={{ width: '18px', height: '18px', accentColor: 'var(--caanma-primary)' }}
                        />
                        <div style={{ flex: 1 }}>
                          <strong style={{ display: 'block', fontSize: '0.9rem', color: '#1e293b' }}>{promo.name}</strong>
                          <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                            Descuento: {promo.type === 'PERCENTAGE' ? `${promo.value}%` : `$${promo.value}`}
                          </span>
                        </div>
                      </label>
                    );
                  })}
                </>
              )}
            </div>

            {hasPermission('pos_assign_promotions') && promotions.length > 0 && (
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', borderTop: '1px solid var(--caanma-border)', paddingTop: '1rem' }}>
                <button
                  type="button"
                  onClick={() => setAppliedPromotionIds([])}
                  style={{
                    padding: '0.5rem 1rem',
                    border: '1px solid #cbd5e1',
                    backgroundColor: 'white',
                    color: '#475569',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    fontWeight: 'bold'
                  }}
                >
                  Desactivar Todas
                </button>
                <button
                  type="button"
                  onClick={() => setAppliedPromotionIds(null)}
                  style={{
                    padding: '0.5rem 1rem',
                    border: 'none',
                    backgroundColor: 'var(--caanma-primary)',
                    color: 'white',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    fontWeight: 'bold'
                  }}
                >
                  Activar Todas (Automáticas)
                </button>
              </div>
            )}
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--caanma-border)', paddingBottom: '0.75rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                <Clock size={20} color="var(--caanma-primary)" /> Tickets en Espera ({mode === 'QUOTE' ? 'Cotizaciones' : mode === 'CONSIGNMENT' ? 'Consignaciones' : 'Ventas'})
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
                    <div key={ticket.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', border: '1px solid var(--caanma-border)', borderRadius: '8px', backgroundColor: '#f8fafc' }}>
                      <div>
                        <div style={{ fontWeight: 'bold', fontSize: '1rem', color: '#1e293b' }}>{ticket.name}</div>
                        <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.25rem' }}>
                          Creado: {ticket.timestamp}
                        </div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--caanma-primary)', fontWeight: '500', marginTop: '0.25rem' }}>
                          {ticket.cart.length} art. | Total: ${ticket.total.toFixed(2)}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button 
                          type="button"
                          onClick={() => handleRestoreTicket(ticket)}
                          style={{
                            padding: '0.5rem 1rem',
                            backgroundColor: 'var(--caanma-primary)',
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

            <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--caanma-border)', paddingTop: '1rem' }}>
              <button 
                type="button"
                onClick={() => setShowOnHoldModal(false)}
                style={{
                  padding: '0.6rem 2rem',
                  backgroundColor: '#f1f5f9',
                  color: '#334155',
                  border: '1px solid var(--caanma-border)',
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

      {/* PRODUCT SEARCH MODAL */}
      {isSearchModalOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div 
            onClick={() => {
              setIsSearchModalOpen(false);
              setSearchTerm('');
            }}
            style={{ position: 'absolute', inset: 0 }}
          />
          <div className="card" style={{ position: 'relative', width: '700px', maxWidth: '95%', maxHeight: '85vh', display: 'flex', flexDirection: 'column', padding: '1.5rem', backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', zIndex: 10000 }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', margin: 0, color: '#1e293b' }}>Buscar Artículos</h3>
              <button 
                type="button" 
                onClick={() => {
                  setIsSearchModalOpen(false);
                  setSearchTerm('');
                }} 
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', fontSize: '1.25rem', fontWeight: 'bold' }}
              >
                ✕
              </button>
            </div>

            <div style={{ position: 'relative', marginBottom: '1rem' }}>
              <Search size={20} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              <input 
                type="text" 
                autoFocus
                placeholder="Escribe el nombre, SKU o código de barras del producto..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.8rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '1.05rem', outline: 'none' }}
              />
            </div>

            {/* Results list */}
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem', minHeight: '300px' }}>
              {isSearching ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>Buscando...</div>
              ) : filteredProducts.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>No se encontraron productos coincidentes</div>
              ) : (
                filteredProducts.slice(0, 30).map((p: any) => {
                  const pPrice = getProductPrice(p);
                  const inCart = cart.some(i => i.productId === p.id || i.id === p.id);
                  return (
                    <div 
                      key={p.id}
                      onClick={() => {
                        handleProductClick(p);
                        setSearchTerm('');
                        setIsSearchModalOpen(false);
                      }}
                      style={{
                        padding: '0.75rem 1rem',
                        borderBottom: '1px solid #f1f5f9',
                        cursor: 'pointer',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        borderRadius: '6px',
                        transition: 'background-color 0.15s'
                      }}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f8fafc'}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <div>
                        <div style={{ fontWeight: 'bold', fontSize: '0.95rem', color: '#1e293b' }}>{p.name}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.15rem' }}>
                          SKU: {p.sku || 'N/A'}{p.barcode ? ` | Código: ${p.barcode}` : ''} | {p.isService ? (
                            <span style={{ color: '#2563eb', fontWeight: 'bold', backgroundColor: '#dbeafe', padding: '0.1rem 0.3rem', borderRadius: '4px' }}>Servicio</span>
                          ) : (
                            <>Stock: <span style={{ color: p.stock > 0 ? '#16a34a' : '#dc2626', fontWeight: 'bold' }}>{p.stock}</span></>
                          )}
                        </div>
                        {mode === 'QUOTE' && (() => {
                          const purchasePrice = p.averageCost || p.cost || 0;
                          const marginPercent = pPrice > 0 ? ((pPrice - purchasePrice) / pPrice) * 100 : 0;
                          return (
                            <div style={{ display: 'flex', gap: '0.35rem', fontSize: '0.7rem', marginTop: '0.25rem', color: '#64748b', flexWrap: 'wrap', alignItems: 'center' }}>
                              <span style={{ backgroundColor: '#f1f5f9', padding: '0.1rem 0.25rem', borderRadius: '4px', border: '1px solid #e2e8f0', color: '#475569' }}>
                                Compra: <strong>${purchasePrice.toFixed(2)}</strong>
                              </span>
                              <span style={{ 
                                backgroundColor: marginPercent >= 0 ? '#dcfce7' : '#fee2e2', 
                                color: marginPercent >= 0 ? '#15803d' : '#b91c1c', 
                                padding: '0.1rem 0.25rem', 
                                borderRadius: '4px',
                                border: marginPercent >= 0 ? '1px solid #bbf7d0' : '1px solid #fca5a5',
                                fontWeight: 'bold'
                              }}>
                                Margen: <strong>{marginPercent.toFixed(1)}%</strong>
                              </span>
                              <span style={{ backgroundColor: '#f1f5f9', padding: '0.1rem 0.25rem', borderRadius: '4px', border: '1px solid #e2e8f0', color: '#475569' }}>
                                Venta: <strong>${pPrice.toFixed(2)}</strong>
                              </span>
                            </div>
                          );
                        })()}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        {hasActivePromotion(p) && (
                          <span style={{ fontSize: '0.75rem', backgroundColor: '#fce7f3', color: '#db2777', padding: '0.2rem 0.5rem', borderRadius: '4px', fontWeight: 'bold' }}>Promoción</span>
                        )}
                        <div style={{ fontWeight: 'bold', color: '#8b5cf6', fontSize: '1rem' }}>
                          ${pPrice.toFixed(2)}
                        </div>
                        {inCart && (
                          <span style={{ fontSize: '0.75rem', backgroundColor: '#e9d5ff', color: '#6b21a8', padding: '0.2rem 0.5rem', borderRadius: '4px', fontWeight: 'bold' }}>En Ticket</span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

          </div>
        </div>
      )}

      {/* Stock branches modal */}
      {showStockModal && stockModalProduct && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.45)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ backgroundColor: 'white', borderRadius: '16px', width: '550px', maxWidth: '95%', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', overflow: 'hidden', color: '#1e293b' }}>
            <div style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', color: 'white', padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: 0 }}>Existencias en Sucursales</h2>
                <p style={{ margin: '0.25rem 0 0 0', opacity: 0.8, fontSize: '0.85rem' }}>
                  {stockModalProduct.name} {stockModalProduct.sku ? `(SKU: ${stockModalProduct.sku})` : ''}
                </p>
              </div>
              <button 
                type="button" 
                onClick={() => {
                  setShowStockModal(false);
                  setStockModalProduct(null);
                  setBranchStocks([]);
                }} 
                style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: '1.5rem', maxHeight: '60vh', overflowY: 'auto' }}>
              {loadingBranchStocks ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem 0', gap: '0.75rem' }}>
                  <div style={{ width: '40px', height: '40px', border: '3px solid #cbd5e1', borderTopColor: '#0f172a', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                  <span style={{ fontSize: '0.9rem', color: '#64748b' }}>Consultando existencias...</span>
                  <style>{`
                    @keyframes spin {
                      0% { transform: rotate(0deg); }
                      100% { transform: rotate(360deg); }
                    }
                  `}</style>
                </div>
              ) : branchStocks.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem 0', color: '#64748b' }}>
                  No se encontraron sucursales configuradas o existencias para este producto.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {branchStocks.map((bs) => (
                    <div 
                      key={bs.branchId} 
                      style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center', 
                        padding: '1rem', 
                        borderRadius: '8px', 
                        border: bs.isCurrent ? '2px solid #3b82f6' : '1px solid #e2e8f0',
                        backgroundColor: bs.isCurrent ? '#eff6ff' : '#f8fafc'
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                        <span style={{ fontWeight: 'bold', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          {bs.branchName}
                          {bs.isCurrent && (
                            <span style={{ fontSize: '0.7rem', backgroundColor: '#3b82f6', color: 'white', padding: '0.1rem 0.4rem', borderRadius: '9999px', fontWeight: 'normal' }}>
                              Sucursal Actual
                            </span>
                          )}
                        </span>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ 
                          fontSize: '1.25rem', 
                          fontWeight: 'bold', 
                          color: bs.stock > 0 ? '#16a34a' : '#ef4444',
                          backgroundColor: bs.stock > 0 ? '#dcfce7' : '#fee2e2',
                          padding: '0.25rem 0.75rem',
                          borderRadius: '6px'
                        }}>
                          {bs.stock} pza{bs.stock !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ padding: '1rem 1.5rem', backgroundColor: '#f8fafc', borderTop: '1px solid #e2e8f0', textAlign: 'right' }}>
              <button 
                type="button" 
                onClick={() => {
                  setShowStockModal(false);
                  setStockModalProduct(null);
                  setBranchStocks([]);
                }} 
                className="btn-primary" 
                style={{ padding: '0.5rem 1.5rem', fontSize: '0.9rem' }}
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
