'use client';
import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
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
import { getProductPurchaseCounts } from '@/app/actions/promotion';
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
  allPriceLists = [],
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
  allPriceLists?: any[],
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
      transferAmount: '',
      notes: '',
      observationImageUrl: '',
      deliveryDate: '',
      deliveryTime: '',
      deliveryStreet: '',
      deliveryType: 'PICKUP',
      documentType: 'TICKET',
      transactionType: 'VENTA',
      appliedPromotionIds: null,
      breakdownDiscounts: true,
      isQuoteClone: false
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
        transferAmount,
        notes,
        observationImageUrl,
        deliveryDate,
        deliveryTime,
        deliveryStreet,
        deliveryType,
        documentType,
        transactionType,
        appliedPromotionIds,
        loadedQuoteId,
        loadedConsignmentId,
        breakdownDiscounts,
        isQuoteClone
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
        setTransferAmount((target.transferAmount || '') as number | "");
        setNotes(target.notes || '');
        setObservationImageUrl(target.observationImageUrl || '');
        setDeliveryDate(target.deliveryDate || '');
        setDeliveryTime(target.deliveryTime || '');
        setDeliveryStreet(target.deliveryStreet || '');
        setDeliveryType((target.deliveryType || 'PICKUP') as 'PICKUP' | 'DELIVERY');
        setDocumentType((target.documentType || 'TICKET') as 'TICKET' | 'FACTURA');
        setTransactionType((target.transactionType || 'VENTA') as 'VENTA' | 'PEDIDO');
        setAppliedPromotionIds(target.appliedPromotionIds !== undefined ? target.appliedPromotionIds : null);
        setLoadedQuoteId(target.loadedQuoteId || null);
        setLoadedConsignmentId(target.loadedConsignmentId || null);
        setBreakdownDiscounts(target.breakdownDiscounts !== undefined ? target.breakdownDiscounts : true);
        setIsQuoteClone(target.isQuoteClone || false);
        setActiveTabId(targetTabId);

        // Auto-fill or clear billing data for the target customer
        if (target.selectedCustomerId) {
          const customer = activeCustomers.find((c: any) => c.id === target.selectedCustomerId);
          if (customer) {
            setBillRfc(customer.taxId || '');
            setBillName(customer.legalName || customer.name || '');
            setBillZipCode(customer.zipCode || '');
            setBillRegime(customer.taxRegime || '601');
            setBillUse(customer.cfdiUse || 'G03');
          } else {
            setBillRfc('');
            setBillName('');
            setBillZipCode('');
            setBillRegime('601');
            setBillUse('G03');
          }
        } else {
          setBillRfc('');
          setBillName('');
          setBillZipCode('');
          setBillRegime('601');
          setBillUse('G03');
        }
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
      transferAmount: '',
      notes: '',
      observationImageUrl: '',
      deliveryDate: '',
      deliveryTime: '',
      deliveryStreet: '',
      deliveryType: 'PICKUP',
      documentType: 'TICKET',
      transactionType: 'VENTA',
      appliedPromotionIds: null,
      loadedQuoteId: null,
      loadedConsignmentId: null,
      breakdownDiscounts: true,
      isQuoteClone: false
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
        transferAmount,
        notes,
        observationImageUrl,
        deliveryDate,
        deliveryTime,
        deliveryStreet,
        deliveryType,
        documentType,
        transactionType,
        appliedPromotionIds,
        loadedQuoteId,
        loadedConsignmentId,
        breakdownDiscounts,
        isQuoteClone
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
      setTransferAmount((newTab.transferAmount || '') as number | "");
      setNotes(newTab.notes);
      setObservationImageUrl(newTab.observationImageUrl || '');
      setDeliveryDate(newTab.deliveryDate || '');
      setDeliveryTime(newTab.deliveryTime || '');
      setDeliveryStreet(newTab.deliveryStreet || '');
      setDeliveryType((newTab.deliveryType || 'PICKUP') as 'PICKUP' | 'DELIVERY');
      setDocumentType(newTab.documentType as 'TICKET' | 'FACTURA');
      setTransactionType(newTab.transactionType as 'VENTA' | 'PEDIDO');
      setAppliedPromotionIds(null);
      setLoadedQuoteId(null);
      setLoadedQuoteTotal(null);
      setLoadedConsignmentId(null);
      setBreakdownDiscounts(newTab.breakdownDiscounts);
      setIsQuoteClone(false);
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
        setTransferAmount((lastTab.transferAmount || '') as number | "");
        setNotes(lastTab.notes || '');
        setObservationImageUrl(lastTab.observationImageUrl || '');
        setDeliveryDate(lastTab.deliveryDate || '');
        setDeliveryTime(lastTab.deliveryTime || '');
        setDeliveryStreet(lastTab.deliveryStreet || '');
        setDeliveryType((lastTab.deliveryType || 'PICKUP') as 'PICKUP' | 'DELIVERY');
        setDocumentType((lastTab.documentType || 'TICKET') as 'TICKET' | 'FACTURA');
        setTransactionType((lastTab.transactionType || 'VENTA') as 'VENTA' | 'PEDIDO');
        setAppliedPromotionIds(lastTab.appliedPromotionIds !== undefined ? lastTab.appliedPromotionIds : null);
        setLoadedQuoteId(lastTab.loadedQuoteId || null);
        setLoadedConsignmentId(lastTab.loadedConsignmentId || null);
        setBreakdownDiscounts(lastTab.breakdownDiscounts !== undefined ? lastTab.breakdownDiscounts : true);
        setIsQuoteClone(lastTab.isQuoteClone || false);
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
    setObservationImageUrl('');
    setDeliveryDate('');
    setDeliveryTime('');
    setDeliveryStreet('');
    setDeliveryType('PICKUP');
    setTipAmount(0);
    setPointsRedeemed(0);
    setManualDiscountValue('');
    setLoadedQuoteId(null);
    setLoadedQuoteTotal(null);
    setLoadedConsignmentId(null);
    setIsQuoteClone(false);
    setAmountReceived('');
    setCardAmount('');
    setDocumentType('TICKET');
    setTransactionType('VENTA');
    setBreakdownDiscounts(true);
    
    // Clear billing data fields
    setBillRfc('');
    setBillName('');
    setBillZipCode('');
    setBillRegime('601');
    setBillUse('G03');
    
    lastQuoteIdRef.current = null;
    if (lastCloneQuoteIdRef) lastCloneQuoteIdRef.current = null;
    lastConsignmentIdRef.current = null;

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
      transferAmount: '',
      notes: '',
      observationImageUrl: '',
      deliveryDate: '',
      deliveryTime: '',
      deliveryStreet: '',
      deliveryType: 'PICKUP',
      documentType: 'TICKET',
      transactionType: 'VENTA',
      appliedPromotionIds: null,
      loadedQuoteId: null,
      loadedConsignmentId: null,
      breakdownDiscounts: true
    } : t));
  };
  
  // States for sales/quotes/consignments on hold (en espera)
  const [onHoldTickets, setOnHoldTickets] = useState<any[]>([]);
  const [showOnHoldModal, setShowOnHoldModal] = useState(false);
  const [showPromoModal, setShowPromoModal] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const scannerBufferRef = useRef<string>('');
  const lastKeyTimeRef = useRef<number>(0);

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

  // Reset active tab and clear tabs list when changing active branch to prevent cross-branch cart sales
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hasRecovery = localStorage.getItem(`caanma_pos_recovery_${branchId}_${mode}`);
      if (hasRecovery) {
        console.log('[POS] Recovery data found, skipping default tab reset on branch change.');
        return;
      }
    }

    resetActiveTab();
    setTabs([
      {
        id: '1',
        name: mode === 'QUOTE' ? 'Nueva Cotización' : mode === 'CONSIGNMENT' ? 'Nueva Consignación' : 'Nueva Venta',
        cart: [],
        selectedCustomerId: null,
        customerSearchTerm: '',
        priceList: 'price',
        manualDiscountType: '$',
        manualDiscountValue: '',
        pointsRedeemed: 0,
        tipAmount: 0,
        paymentMethod: 'CASH',
        amountReceived: '',
        cardAmount: '',
        transferAmount: '',
        notes: '',
        documentType: 'TICKET',
        transactionType: 'VENTA',
        appliedPromotionIds: null,
        breakdownDiscounts: true
      }
    ]);
    setActiveTabId('1');
  }, [branchId]);

  const handleActionError = (e: any): boolean => {
    const errStr = String(e);
    if (
      errStr.includes('UnrecognizedActionError') ||
      errStr.includes('was not found on the server') ||
      errStr.includes('failed-to-find-server-action') ||
      errStr.includes('Server Action')
    ) {
      const recoveryState = {
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
        transferAmount,
        notes,
        observationImageUrl,
        deliveryDate,
        deliveryTime,
        deliveryStreet,
        deliveryType,
        documentType,
        transactionType,
        appliedPromotionIds,
        loadedQuoteId,
        loadedConsignmentId,
        breakdownDiscounts
      };
      localStorage.setItem(`caanma_pos_recovery_${branchId}_${mode}`, JSON.stringify(recoveryState));
      alert('Se ha detectado una nueva actualización en el servidor. La página se recargará automáticamente para aplicar la actualización sin perder los artículos de tu carrito actual.');
      window.location.reload();
      return true;
    }
    return false;
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const recovery = localStorage.getItem(`caanma_pos_recovery_${branchId}_${mode}`);
      if (recovery) {
        try {
          const state = JSON.parse(recovery);
          if (state.cart && state.cart.length > 0) {
            setCart(state.cart);
            setSelectedCustomerId(state.selectedCustomerId || null);
            setCustomerSearchTerm(state.customerSearchTerm || '');
            setPriceList(state.priceList || 'price');
            setManualDiscountType(state.manualDiscountType || '$');
            setManualDiscountValue(state.manualDiscountValue || '');
            setPointsRedeemed(state.pointsRedeemed || 0);
            setTipAmount(state.tipAmount || 0);
            setPaymentMethod(state.paymentMethod || 'CASH');
            setAmountReceived(state.amountReceived || '');
            setCardAmount(state.cardAmount || '');
            setTransferAmount(state.transferAmount || '');
            setNotes(state.notes || '');
            setObservationImageUrl(state.observationImageUrl || '');
            setDeliveryDate(state.deliveryDate || '');
            setDeliveryTime(state.deliveryTime || '');
            setDeliveryStreet(state.deliveryStreet || '');
            setDeliveryType(state.deliveryType || 'PICKUP');
            setDocumentType(state.documentType || 'TICKET');
            setTransactionType(state.transactionType || 'VENTA');
            setAppliedPromotionIds(state.appliedPromotionIds || null);
            setLoadedQuoteId(state.loadedQuoteId || null);
            setLoadedConsignmentId(state.loadedConsignmentId || null);
            setBreakdownDiscounts(state.breakdownDiscounts !== undefined ? state.breakdownDiscounts : true);

            setTabs(prev => prev.map(t => t.id === '1' ? {
              ...t,
              cart: state.cart || [],
              selectedCustomerId: state.selectedCustomerId || null,
              customerSearchTerm: state.customerSearchTerm || '',
              priceList: state.priceList || 'price',
              manualDiscountType: state.manualDiscountType || '$',
              manualDiscountValue: state.manualDiscountValue || '',
              notes: state.notes || '',
              observationImageUrl: state.observationImageUrl || '',
              deliveryDate: state.deliveryDate || '',
              deliveryTime: state.deliveryTime || '',
              deliveryStreet: state.deliveryStreet || '',
              deliveryType: state.deliveryType || 'PICKUP',
              documentType: state.documentType || 'TICKET',
              transactionType: state.transactionType || 'VENTA',
              loadedQuoteId: state.loadedQuoteId || null,
              loadedConsignmentId: state.loadedConsignmentId || null,
               breakdownDiscounts: state.breakdownDiscounts !== undefined ? state.breakdownDiscounts : true
            } : t));
          }
        } catch (e) {
          console.error('Failed to restore recovery state:', e);
        }

        // Delay deletion of recovery state to survive React 18 hydration double-renders and quick unmounts
        const timer = setTimeout(() => {
          localStorage.removeItem(`caanma_pos_recovery_${branchId}_${mode}`);
        }, 5000);
        return () => clearTimeout(timer);
      }
    }
  }, [branchId, mode]);

  const [isMobileSearchActive, setIsMobileSearchActive] = useState(false);

  const [hasSyncedPermissions, setHasSyncedPermissions] = useState(false);

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
    return isSuperAdmin || userRole === 'ADMIN' || userRole === 'MANAGER';
  });

  // Synchronize fresh permissions from server on mount to prevent stale PWA cache / stale local storage
  useEffect(() => {
    getMergedUserPermissions().then((res) => {
      if (res && res.success && res.permissions) {
        const isUserAdmin = res.isSuperAdmin || res.role === 'ADMIN' || res.role === 'MANAGER';
        localStorage.setItem('caanma_user_permissions', JSON.stringify(res.permissions));
        localStorage.setItem('caanma_user_is_admin', isUserAdmin ? 'true' : 'false');
        setPermissions(res.permissions);
        setIsAdminOrSuper(isUserAdmin);
        setHasSyncedPermissions(true);
      }
    }).catch((err) => {
      console.error("Failed to sync fresh user permissions:", err);
    });
  }, []);

  useEffect(() => {
    if (hasSyncedPermissions) return;
    if (userPermissions && Object.keys(userPermissions).length > 0) {
      localStorage.setItem('caanma_user_permissions', JSON.stringify(userPermissions));
      setPermissions(userPermissions);
    }
  }, [userPermissions, hasSyncedPermissions]);

  useEffect(() => {
    const isAdmin = isSuperAdmin || userRole === 'ADMIN' || userRole === 'MANAGER';
    localStorage.setItem('caanma_user_is_admin', isAdmin ? 'true' : 'false');
    setIsAdminOrSuper(isAdmin);
  }, [isSuperAdmin, userRole]);

  const hasPermission = useCallback((permId: string) => {
    if (isAdminOrSuper) return true;
    return !!permissions[permId];
  }, [isAdminOrSuper, permissions]);
  const [priceList, setPriceList] = useState('price');
  const [appliedPromotionIds, setAppliedPromotionIds] = useState<string[] | null>(null);
  const [customerPurchaseCounts, setCustomerPurchaseCounts] = useState<Record<string, number>>({});
  
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(initialCustomerId || null);
  const [customerSearchTerm, setCustomerSearchTerm] = useState(initialCustomer ? initialCustomer.name : '');
  const [hasDefaultedCustomer, setHasDefaultedCustomer] = useState(false);

  const [isSearching, setIsSearching] = useState(false);
  const [displayedProducts, setDisplayedProducts] = useState<any[]>(initialProducts);
  
  // Offline Data Mirrors
  const [activeCustomers, setActiveCustomers] = useState<any[]>(customers);
  const [localOfflineQuotes, setLocalOfflineQuotes] = useState<any[]>([]);
  
  useEffect(() => {
    if (!isOnline) {
      import('@/lib/offlineDB').then(({ db }) => {
        db.customers.toArray().then(res => setActiveCustomers(res.length ? res : customers));
      });
      import('@/lib/offlineSearch').then(({ searchOfflineProducts }) => {
        searchOfflineProducts('', branchId, { limit: 50 }).then(res => {
          if (res.length) setDisplayedProducts(res);
        });
      });
    } else {
      setActiveCustomers(customers);
      if (searchTerm === '') setDisplayedProducts(initialProducts);
    }
  }, [isOnline, customers, initialProducts, searchTerm, branchId]);

  // Default to "Público en General" on initial mount
  useEffect(() => {
    if (!hasDefaultedCustomer && !selectedCustomerId && activeCustomers.length > 0) {
      const defaultCustomer = activeCustomers.find(c => 
        (c.name.toLowerCase().includes('público en general') || 
         c.name.toLowerCase().includes('publico en general')) &&
        (c.branchId === branchId)
      ) || activeCustomers.find(c => 
        c.name.toLowerCase().includes('público en general') || 
        c.name.toLowerCase().includes('publico en general')
      );
      if (defaultCustomer) {
        setSelectedCustomerId(defaultCustomer.id);
        setCustomerSearchTerm(defaultCustomer.name);
        setHasDefaultedCustomer(true);
      }
    }
  }, [activeCustomers, selectedCustomerId, hasDefaultedCustomer, branchId]);


  // Load customer purchase counts for products in the cart when customer or cart changes
  useEffect(() => {
    if (!selectedCustomerId || cart.length === 0) {
      if (Object.keys(customerPurchaseCounts).length > 0) {
        setCustomerPurchaseCounts({});
      }
      return;
    }

    const productIds = Array.from(new Set(cart.map(item => item.id)));

    let active = true;
    getProductPurchaseCounts(selectedCustomerId, productIds).then(res => {
      if (active && res.success && res.counts) {
        setCustomerPurchaseCounts(res.counts);
      }
    });

    return () => {
      active = false;
    };
  }, [selectedCustomerId, cart.map(item => item.id).join(',')]);

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

  useEffect(() => {
    if (isQuoteModalOpen) {
      import('@/lib/offlineDB').then(({ db }) => {
        db.pendingSales
          .filter(s => s.type === 'QUOTE')
          .toArray()
          .then(quotes => {
            setLocalOfflineQuotes(quotes.map(q => ({
              id: q.id,
              folio: q.folio || null,
              total: q.total,
              createdAt: q.timestamp,
              customerId: q.customerId,
              customer: q.customerName ? { name: q.customerName } : null
            })));
          });
      });
    }
  }, [isQuoteModalOpen]);

  // Variant Selection State
  const [selectedProductForVariant, setSelectedProductForVariant] = useState<any | null>(null);

  // Tips State
  const [tipAmount, setTipAmount] = useState<number>(0);
  
  // Manual Discount State
  const [manualDiscountType, setManualDiscountType] = useState<'$' | '%'>('$');
  const [manualDiscountValue, setManualDiscountValue] = useState<number | ''>('');

  // Breakdown discounts checkbox state
  const [breakdownDiscounts, setBreakdownDiscounts] = useState<boolean>(true);

  
  let methodsList = (Array.isArray(metodosConfig?.methods) && metodosConfig.methods.length > 0) 
     ? metodosConfig.methods 
     : [{ id: 'CASH', name: 'Efectivo' }, { id: 'CHECK', name: 'Cheque' }, { id: 'CARD_CREDIT', name: 'Tarjeta de Crédito' }, { id: 'CARD_DEBIT', name: 'Tarjeta de Débito' }, { id: 'TRANSFER', name: 'Transferencia' }];

  if (!methodsList.some((m: any) => m.id === 'CHECK')) {
    methodsList = [...methodsList, { id: 'CHECK', name: 'Cheque' }];
  }

  const finalMethods: any[] = [];
  methodsList.forEach((m: any) => {
    if (m.id === 'CARD') {
      finalMethods.push({ id: 'CARD_CREDIT', name: 'Tarjeta de Crédito' });
      finalMethods.push({ id: 'CARD_DEBIT', name: 'Tarjeta de Débito' });
    } else {
      finalMethods.push(m);
    }
  });

  const customMethods = finalMethods.filter((m: any) => m.id !== 'CREDIT');

  const [paymentMethod, setPaymentMethod] = useState(customMethods[0]?.id || 'CASH');
  
  const selectedCust = activeCustomers.find((c: any) => c.id === selectedCustomerId);
  let allowedMethods = [...customMethods];
  const isCreditEnabled = metodosConfig?.enabledIds ? metodosConfig.enabledIds.includes('CREDIT') : true;
  const isDefaultCust = !selectedCust || selectedCust.name.toLowerCase().includes('público en general') || selectedCust.name.toLowerCase().includes('publico en general');
  
  const hasCredit = selectedCust && (selectedCust.creditLimit > 0 || selectedCust.creditDays > 0) && !selectedCust.isBlocked;
  if (isCreditEnabled && selectedCust && !isDefaultCust && hasCredit) {
    allowedMethods.push({ id: 'CREDIT', name: 'Crédito Cta.' });
  }
  allowedMethods.push({ id: 'MIXTO', name: 'Mixto' });
  if (transactionType === 'PEDIDO') {
    allowedMethods.push({ id: 'PAY_ON_PICKUP', name: 'Pagar al recoger' });
  }

  useEffect(() => {
    if (allowedMethods.length > 0 && !allowedMethods.find(m => m.id === paymentMethod)) {
      setPaymentMethod(allowedMethods[0].id);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCustomerId, transactionType]);

  const [amountReceived, setAmountReceived] = useState<number | ''>(''); // Used for pure CASH or MIXED cash amount
  const [cardAmount, setCardAmount] = useState<number | ''>(''); // Used for MIXED
  const [transferAmount, setTransferAmount] = useState<number | ''>(''); // Used for MIXED
  const [notes, setNotes] = useState<string>('');
  const [observationImageUrl, setObservationImageUrl] = useState<string>('');
  const [deliveryDate, setDeliveryDate] = useState<string>('');
  const [deliveryTime, setDeliveryTime] = useState<string>('');
  const [deliveryStreet, setDeliveryStreet] = useState<string>('');
  const [deliveryType, setDeliveryType] = useState<'PICKUP' | 'DELIVERY'>('PICKUP');
  const [loadedQuoteId, setLoadedQuoteId] = useState<string | null>(null);
  const [loadedQuoteTotal, setLoadedQuoteTotal] = useState<number | null>(null);
  const [isQuoteClone, setIsQuoteClone] = useState<boolean>(false);

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

  const handleCustomerChange = async (customerId: string, isProgrammatic = false) => {
    setSelectedCustomerId(customerId);
    const customer = activeCustomers.find((c: any) => c.id === customerId);
    if (customer && customer.priceList) {
      setPriceList(customer.priceList || 'price');
    } else {
      setPriceList('price');
    }
    
    if (!isProgrammatic && !loadedQuoteId && !isQuoteClone) {
      setCart(prev => prev.map(item => {
        const { customPrice, ...rest } = item;
        return rest;
      }));
    }
    
    if (!isProgrammatic) {
      setNotes('');
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
      setNotes('');

      setShowAddCustomerModal(false);
      setNewCustName('');
      setNewCustPhone('');
      setNewCustEmail('');
      setNewCustStreet('');
      setNewCustZipCode('');
      setNewCustTaxId('');

      alert('¡Cliente creado y seleccionado con éxito!');
    } catch (e: any) {
      if (handleActionError(e)) return;
      alert('Error al crear cliente: ' + (e.message || String(e)));
    } finally {
      setIsSavingCustomer(false);
    }
  };

  const handleLoadQuote = async (incomingId?: string, isClone: boolean = false) => {
    const idToLoad = incomingId || quoteSearchId.trim();
    if (!idToLoad) return;
    
    setIsLoadingQuote(true);
    try {
      let quote: any = null;
      
      // Load offline quote from IndexedDB if offline or offline ID format
      if (!isOnline || idToLoad.startsWith('OFFLINE-') || idToLoad.length > 30) {
        const { db } = await import('@/lib/offlineDB');
        const localQuote = await db.pendingSales.get(idToLoad);
        if (localQuote && localQuote.type === 'QUOTE') {
          const resolvedItems = [];
          for (const item of localQuote.items) {
            const localProduct = await db.products.get(item.productId);
            if (localProduct) {
              let resolvedVariant: any = null;
              if (item.variantId && localProduct.variants) {
                resolvedVariant = localProduct.variants.find((v: any) => v.id === item.variantId);
              }
              resolvedItems.push({
                productId: item.productId,
                variantId: item.variantId || null,
                quantity: item.quantity,
                price: item.price,
                product: localProduct,
                variant: resolvedVariant
              });
            }
          }
          quote = {
            id: localQuote.id,
            total: localQuote.total,
            customerId: localQuote.customerId || null,
            breakdownDiscounts: localQuote.breakdownDiscounts || false,
            observations: localQuote.notes || '',
            observationImageUrl: localQuote.observationImageUrl || '',
            items: resolvedItems
          };
        }
      }

      if (!quote) {
        if (!isOnline) {
          throw new Error("No hay conexión a internet y esta cotización no se encuentra guardada localmente.");
        }
        quote = await getQuoteForPOS(idToLoad);
      }
      
      setLoadedQuoteId(isClone ? null : quote.id);
      setIsQuoteClone(isClone);
      setLoadedQuoteTotal(quote.total);
      setBreakdownDiscounts(quote.breakdownDiscounts !== undefined ? quote.breakdownDiscounts : true);
      
      // Load cart preserving variantId, cartItemId, customPrice, variant attributes, SKU and stock details
      const newCart = quote.items.map((item: any) => {
        const product = item.product;
        const variant = item.variant;
        const cartItemName = variant ? `${product.name} (${variant.attribute})` : product.name;
        const cartItemSku = variant && variant.sku ? variant.sku : product.sku;
        const checkStock = variant ? variant.stock : product.stock;
        
        return {
          ...product,
          price: variant && variant.price !== undefined && variant.price !== null && variant.price > 0 ? variant.price : product.price,
          wholesalePrice: variant && variant.wholesalePrice !== undefined && variant.wholesalePrice !== null && variant.wholesalePrice > 0 ? variant.wholesalePrice : product.wholesalePrice,
          specialPrice: variant && variant.specialPrice !== undefined && variant.specialPrice !== null && variant.specialPrice > 0 ? variant.specialPrice : product.specialPrice,
          cost: variant && variant.cost !== undefined && variant.cost !== null && variant.cost > 0 ? variant.cost : product.cost,
          barcode: variant && variant.barcode ? variant.barcode : product.barcode,
          name: cartItemName,
          sku: cartItemSku,
          stock: checkStock,
          cartItemId: item.variantId ? `v_${item.variantId}` : product.id,
          quantity: item.quantity,
          customPrice: item.price,
          cartPrice: item.price,
          variantId: item.variantId || null,
          attribute: variant ? variant.attribute : null
        };
      });
      // Recalculate subtotal of loaded items and distribute small rounding differences
      const subTotalOfLoadedItems = newCart.reduce((sum: number, item: any) => sum + (item.customPrice * item.quantity), 0);
      const discountDiff = subTotalOfLoadedItems - quote.total;

      if (Math.abs(discountDiff) > 0.001 && Math.abs(discountDiff) <= 5.0) {
        const totalQty = newCart.reduce((sum: number, item: any) => sum + item.quantity, 0);
        if (totalQty > 0) {
          const adjPerUnit = -discountDiff / totalQty;
          newCart.forEach((item: any) => {
            const adjustedPrice = Number((item.customPrice + adjPerUnit).toFixed(6));
            item.customPrice = adjustedPrice;
            item.cartPrice = adjustedPrice;
          });
        }
      }

      setCart(newCart);
      
      // Load Customer
      if (quote.customerId) {
        await handleCustomerChange(quote.customerId, true);
      } else {
        await handleCustomerChange('', true);
      }

      // Re-calculate and set manual discount if there was a difference between subtotal of items and quote total
      const updatedSubTotal = newCart.reduce((sum: number, item: any) => sum + (item.customPrice * item.quantity), 0);
      const finalDiscountDiff = updatedSubTotal - quote.total;
      if (finalDiscountDiff > 0.01) {
        setManualDiscountType('$');
        setManualDiscountValue(Number(finalDiscountDiff.toFixed(2)));
      } else {
        setManualDiscountType('$');
        setManualDiscountValue('');
      }
      
      setNotes(quote.observations || '');
      setObservationImageUrl(quote.observationImageUrl || '');
      
      setIsQuoteModalOpen(false);
      setQuoteSearchId('');
      if (!incomingId) alert("Cotización cargada correctamente.");
    } catch (e: any) {
      if (handleActionError(e)) return;
      alert("Error al cargar la cotización: " + e.message);
    } finally {
      setIsLoadingQuote(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 600;
        const MAX_HEIGHT = 600;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
          setObservationImageUrl(compressedBase64);
          setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, observationImageUrl: compressedBase64 } : t));
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const [loadedConsignmentId, setLoadedConsignmentId] = useState<string | null>(null);

  const handleLoadConsignment = async (incomingId: string) => {
    if (!incomingId) return;
    setIsLoadingQuote(true);
    try {
      const consignment = await getConsignmentForPOS(incomingId);
      setLoadedConsignmentId(consignment.id);
      
      const newCart = consignment.items.map((item: any) => {
        const product = item.product;
        const variant = item.variant;
        const cartItemName = variant ? `${product.name} (${variant.attribute})` : product.name;
        const cartItemSku = variant && variant.sku ? variant.sku : product.sku;
        const checkStock = variant ? variant.stock : product.stock;
        
        return {
          ...product,
          price: variant && variant.price !== undefined && variant.price !== null && variant.price > 0 ? variant.price : product.price,
          wholesalePrice: variant && variant.wholesalePrice !== undefined && variant.wholesalePrice !== null && variant.wholesalePrice > 0 ? variant.wholesalePrice : product.wholesalePrice,
          specialPrice: variant && variant.specialPrice !== undefined && variant.specialPrice !== null && variant.specialPrice > 0 ? variant.specialPrice : product.specialPrice,
          cost: variant && variant.cost !== undefined && variant.cost !== null && variant.cost > 0 ? variant.cost : product.cost,
          barcode: variant && variant.barcode ? variant.barcode : product.barcode,
          name: cartItemName,
          sku: cartItemSku,
          stock: checkStock,
          cartItemId: item.variantId ? `v_${item.variantId}` : product.id,
          quantity: item.quantity,
          customPrice: item.price,
          cartPrice: item.price,
          variantId: item.variantId || null,
          attribute: variant ? variant.attribute : null
        };
      });

      // Recalculate subtotal of loaded items and distribute small rounding differences
      const subTotalOfLoadedItems = newCart.reduce((sum: number, item: any) => sum + (item.customPrice * item.quantity), 0);
      const discountDiff = subTotalOfLoadedItems - consignment.total;

      if (Math.abs(discountDiff) > 0.001 && Math.abs(discountDiff) <= 5.0) {
        const totalQty = newCart.reduce((sum: number, item: any) => sum + item.quantity, 0);
        if (totalQty > 0) {
          const adjPerUnit = -discountDiff / totalQty;
          newCart.forEach((item: any) => {
            const adjustedPrice = Number((item.customPrice + adjPerUnit).toFixed(6));
            item.customPrice = adjustedPrice;
            item.cartPrice = adjustedPrice;
          });
        }
      }

      setCart(newCart);
      
      // Load Customer
      if (consignment.customerId) {
        handleCustomerChange(consignment.customerId, true);
      }
      
      setNotes('');
      
      alert("Consignación cargada correctamente.");
    } catch (e: any) {
      if (handleActionError(e)) return;
      alert("Error al cargar la consignación: " + e.message);
    } finally {
      setIsLoadingQuote(false);
    }
  };

  const lastQuoteIdRef = useRef<string | null>(null);
  const lastCloneQuoteIdRef = useRef<string | null>(null);
  const lastConsignmentIdRef = useRef<string | null>(null);

  useEffect(() => {
    const qId = searchParams.get('quoteId');
    if (qId) {
      const hasRecovery = localStorage.getItem(`caanma_pos_recovery_${branchId}_${mode}`);
      if (hasRecovery) {
        lastQuoteIdRef.current = qId;
        return;
      }
      if (qId !== lastQuoteIdRef.current) {
        lastQuoteIdRef.current = qId;
        handleLoadQuote(qId);
      }
    } else {
      if (lastQuoteIdRef.current) {
        lastQuoteIdRef.current = null;
        resetActiveTab();
      }
    }
  }, [searchParams, branchId, mode]);

  useEffect(() => {
    const cloneId = searchParams.get('cloneQuoteId');
    if (cloneId) {
      const hasRecovery = localStorage.getItem(`caanma_pos_recovery_${branchId}_${mode}`);
      if (hasRecovery) {
        lastCloneQuoteIdRef.current = cloneId;
        return;
      }
      if (cloneId !== lastCloneQuoteIdRef.current) {
        lastCloneQuoteIdRef.current = cloneId;
        handleLoadQuote(cloneId, true);
      }
    } else {
      if (lastCloneQuoteIdRef.current) {
        lastCloneQuoteIdRef.current = null;
        resetActiveTab();
      }
    }
  }, [searchParams, branchId, mode]);

  useEffect(() => {
    const cId = searchParams.get('consignmentId');
    if (cId) {
      const hasRecovery = localStorage.getItem(`caanma_pos_recovery_${branchId}_${mode}`);
      if (hasRecovery) {
        lastConsignmentIdRef.current = cId;
        return;
      }
      if (cId !== lastConsignmentIdRef.current) {
        lastConsignmentIdRef.current = cId;
        handleLoadConsignment(cId);
      }
    } else {
      if (lastConsignmentIdRef.current) {
        lastConsignmentIdRef.current = null;
        resetActiveTab();
      }
    }
  }, [searchParams, branchId, mode]);


  
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      setIsSearching(true);
      try {
        if (!isOnline && searchTerm.trim() !== '') {
           const { searchOfflineProducts } = await import('@/lib/offlineSearch');
           const results = await searchOfflineProducts(searchTerm, branchId, { limit: 50 });
           setDisplayedProducts(results);
        } else if (searchTerm.trim() !== '') {
           const results = await searchProducts(searchTerm, branchId);
           setDisplayedProducts(results);
        } else {
           if (isOnline) {
             setDisplayedProducts(initialProducts);
           } else {
             const { searchOfflineProducts } = await import('@/lib/offlineSearch');
             const results = await searchOfflineProducts('', branchId, { limit: 50 });
             if (results.length) setDisplayedProducts(results);
           }
        }
      } catch (e) {
        console.error(e);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, branchId, isOnline, initialProducts]);





  const getProductPrice = useCallback((prod: any) => {
    if (!prod) return 0;
    if (prod.customPrice !== undefined && prod.customPrice !== null && prod.customPrice !== '') {
      const num = Number(prod.customPrice);
      if (!isNaN(num)) return num;
    }

    // Default / public price
    if (priceList === 'price' || !priceList) {
      return prod.price ?? 0;
    }

    // Determine active price list name and all possible IDs (supporting multi-branch sync & sibling IDs)
    let activeListName = '';
    const targetPriceListIds = new Set<string>();

    const listsToSearch = (allPriceLists && allPriceLists.length > 0) ? allPriceLists : dynamicPriceLists;

    if (priceList.startsWith('priceList_')) {
      const plId = priceList.replace('priceList_', '');
      targetPriceListIds.add(plId);

      const foundPL = listsToSearch.find((pl: any) => pl.id === plId);
      if (foundPL) {
        activeListName = (foundPL.name || '').toLowerCase().trim();
      }
    } else if (priceList === 'wholesalePrice') {
      activeListName = 'mayoreo';
    } else if (priceList === 'specialPrice') {
      activeListName = 'especial';
    }

    if (activeListName) {
      listsToSearch.forEach((pl: any) => {
        const plName = (pl.name || '').toLowerCase().trim();
        if (plName === activeListName || 
            (activeListName.includes('mayoreo') && (plName.includes('mayoreo') || plName.includes('wholesale') || plName.includes('mayorista'))) ||
            (activeListName.includes('especial') && (plName.includes('especial') || plName.includes('special')))) {
          targetPriceListIds.add(pl.id);
        }
      });
    }

    // 1. Check dynamic prices array (prod.prices)
    if (prod.prices && Array.isArray(prod.prices) && prod.prices.length > 0) {
      // 1a. Direct ID match in targetPriceListIds
      const byId = prod.prices.find((p: any) => targetPriceListIds.has(p.priceListId) && p.price !== undefined && p.price !== null && Number(p.price) > 0);
      if (byId && Number(byId.price) > 0) return Number(byId.price);

      // 1b. Match by priceList.name if relation was included
      if (activeListName) {
        const byName = prod.prices.find((p: any) => {
          const pName = (p.priceList?.name || '').toLowerCase().trim();
          return pName && (pName === activeListName || 
            (activeListName.includes('mayoreo') && (pName.includes('mayoreo') || pName.includes('wholesale') || pName.includes('mayorista'))) || 
            (activeListName.includes('especial') && (pName.includes('especial') || pName.includes('special')))) && 
            Number(p.price) > 0;
        });
        if (byName && Number(byName.price) > 0) return Number(byName.price);
      }
    }

    // 2. Mayoreo fallback on product/variant field
    if (activeListName.includes('mayoreo') || activeListName.includes('wholesale') || activeListName.includes('mayorista') || priceList === 'wholesalePrice') {
      if (prod.wholesalePrice !== undefined && prod.wholesalePrice !== null && Number(prod.wholesalePrice) > 0) {
        return Number(prod.wholesalePrice);
      }
    }

    // 3. Especial fallback on product/variant field
    if (activeListName.includes('especial') || activeListName.includes('special') || priceList === 'specialPrice') {
      if (prod.specialPrice !== undefined && prod.specialPrice !== null && Number(prod.specialPrice) > 0) {
        return Number(prod.specialPrice);
      }
    }

    return prod.price ?? 0;
  }, [priceList, dynamicPriceLists, allPriceLists]);

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
        const updatedItem = { ...exists, quantity: exists.quantity + 1 };
        const filteredCart = prevCart.filter(item => item.cartItemId !== cartItemId);
        return [updatedItem, ...filteredCart];
      } else {
        return [{ 
          ...product, 
          price: variant && variant.price !== undefined && variant.price !== null && variant.price > 0 ? variant.price : product.price,
          wholesalePrice: variant && variant.wholesalePrice !== undefined && variant.wholesalePrice !== null && variant.wholesalePrice > 0 ? variant.wholesalePrice : product.wholesalePrice,
          specialPrice: variant && variant.specialPrice !== undefined && variant.specialPrice !== null && variant.specialPrice > 0 ? variant.specialPrice : product.specialPrice,
          cost: variant && variant.cost !== undefined && variant.cost !== null && variant.cost > 0 ? variant.cost : product.cost,
          barcode: variant && variant.barcode ? variant.barcode : product.barcode,
          cartItemId, 
          name: cartItemName, 
          sku: cartItemSku,
          variantId: variant ? variant.id : null,
          attribute: variant ? variant.attribute : null,
          quantity: 1 
        }, ...prevCart];
      }
    });
  }, [ventasConfig.venderSinStock, mode]);

  const handleImmediateSearch = useCallback(async (term: string) => {
    if (term.trim() === '') return false;
    setIsSearching(true);
    try {
      let results = [];
      if (!isOnline) {
        const { searchOfflineProducts } = await import('@/lib/offlineSearch');
        results = await searchOfflineProducts(term.trim(), branchId, { limit: 50 });
      } else {
        results = await searchProducts(term.trim(), branchId);
      }

      if (results && results.length > 0) {
        const cleanTerm = term.trim().toLowerCase();
        
        // Exact product search
        const exactProduct = results.find(p => 
          (p.barcode && p.barcode.toLowerCase() === cleanTerm) ||
          (p.sku && p.sku.toLowerCase() === cleanTerm)
        );
        if (exactProduct) {
          if (!exactProduct.variants || exactProduct.variants.length === 0) {
            addToCart(exactProduct);
            setSearchTerm('');
            setIsSearchModalOpen(false);
            return true;
          }
        }
        
        // Exact variant search
        for (const p of results) {
          if (p.variants && p.variants.length > 0) {
            const exactVariant = p.variants.find((v: any) => 
              (v.barcode && v.barcode.toLowerCase() === cleanTerm) ||
              (v.sku && v.sku.toLowerCase() === cleanTerm)
            );
            if (exactVariant) {
              addToCart(p, exactVariant);
              setSearchTerm('');
              setIsSearchModalOpen(false);
              return true;
            }
          }
        }
      }
      return false;
    } catch (err) {
      console.error(err);
      return false;
    } finally {
      setIsSearching(false);
    }
  }, [branchId, isOnline, addToCart]);

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const activeElement = document.activeElement;
      if (activeElement && (
        activeElement.tagName === 'INPUT' || 
        activeElement.tagName === 'TEXTAREA' || 
        activeElement.getAttribute('contenteditable') === 'true'
      )) {
        // If it's the search input of our modal, allow keydown
        if (activeElement.id === 'pos-search-input') {
          // Let it fall through
        } else {
          return;
        }
      }

      const now = Date.now();
      if (now - lastKeyTimeRef.current > 50) {
        scannerBufferRef.current = '';
      }
      lastKeyTimeRef.current = now;

      if (e.key === 'Enter') {
        const barcode = scannerBufferRef.current.trim();
        if (barcode.length >= 3) {
          e.preventDefault();
          e.stopPropagation();
          scannerBufferRef.current = '';
          handleImmediateSearch(barcode);
        }
      } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        scannerBufferRef.current += e.key;
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown, true);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown, true);
  }, [handleImmediateSearch]);

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
  const subTotal = useMemo(() => cart.reduce((sum, item) => sum + (getProductPrice(item) * item.quantity), 0), [cart, priceList, getProductPrice]);

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

    // When a quote is loaded for conversion, skip all promotions to preserve original quote prices
    if (loadedQuoteId || isQuoteClone) return discountsMap;

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
        } else if (promo.type === 'BOGO' || promo.type === 'BOGO_PERCENT') {
          const pay = meta.payQty || 1;
          const rec = meta.receiveQty || 2;
          const discountPct = promo.type === 'BOGO' ? 100 : (meta.discountPercent !== undefined ? meta.discountPercent : 50);

          const units: { price: number; cartItemId: string }[] = [];
          applicableCartItems.forEach(item => {
            const price = getProductPrice(item);
            for (let i = 0; i < item.quantity; i++) {
              units.push({ price, cartItemId: item.cartItemId });
            }
          });

          // Sort units by price descending to charge full price for the most expensive ones
          units.sort((a, b) => b.price - a.price);

          units.forEach((unit, index) => {
            const posInGroup = (index % rec) + 1;
            if (posInGroup > pay) {
              const discountAmount = unit.price * (discountPct / 100);
              discountsMap[unit.cartItemId] += discountAmount;
            }
          });
        } else if (promo.type === 'LOYALTY_STAMP') {
          const targetLimit = Math.round(promo.value) || 10;
          const discountPct = meta.discountPercent !== undefined ? meta.discountPercent : 100;
          applicableCartItems.forEach(item => {
            const pastCount = customerPurchaseCounts[item.id] || 0;
            const itemPrice = getProductPrice(item);
            
            let discountedQty = 0;
            for (let i = 1; i <= item.quantity; i++) {
              const currentOverallCount = pastCount + i;
              if (currentOverallCount % targetLimit === 0) {
                discountedQty++;
              }
            }
            
            if (discountedQty > 0) {
              const itemDiscount = discountedQty * itemPrice * (discountPct / 100);
              discountsMap[item.cartItemId] += itemDiscount;
            }
          });
        }
      }
    });

    return discountsMap;
  }, [promotions, priceList, getProductPrice, appliedPromotionIds, loadedQuoteId, isQuoteClone, customerPurchaseCounts]);

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

  const scaledTaxBreakdown = useMemo(() => {
    let totalIva = 0;
    let totalIeps = 0;
    let totalExento = 0;
    let totalSubtotal = 0;

    cart.forEach(item => {
      const itemPrice = getProductPrice(item);
      const itemQty = item.quantity;
      const itemTotal = itemPrice * itemQty;
      
      const taxType = item.taxType || 'IVA';
      const taxRate = item.taxRate ?? 16.0;
      const iepsRate = item.iepsRate ?? 0.0;

      let basePrice = 0;
      let ivaAmt = 0;
      let iepsAmt = 0;

      if (taxType === 'IVA') {
        basePrice = itemTotal / (1 + taxRate / 100);
        ivaAmt = itemTotal - basePrice;
      } else if (taxType === 'IEPS') {
        basePrice = itemTotal / (1 + iepsRate / 100);
        iepsAmt = itemTotal - basePrice;
      } else if (taxType === 'IVA_IEPS') {
        basePrice = itemTotal / ((1 + iepsRate / 100) * (1 + taxRate / 100));
        iepsAmt = basePrice * (iepsRate / 100);
        ivaAmt = (basePrice + iepsAmt) * (taxRate / 100);
      } else {
        basePrice = itemTotal;
        totalExento += itemTotal;
      }

      totalIva += ivaAmt;
      totalIeps += iepsAmt;
      totalSubtotal += basePrice;
    });

    const factor = subTotal > 0 ? (total / subTotal) : 1;

    return {
      iva: totalIva * factor,
      ieps: totalIeps * factor,
      exento: totalExento * factor,
      subtotal: totalSubtotal * factor
    };
  }, [cart, subTotal, total, priceList]);

  const printTicket = async (cartItems: any[], tTotal: number, tChange: number, tDiscount: number, saleId?: string, folio?: string) => {
    let ticketIva = 0;
    let ticketIeps = 0;
    let ticketExento = 0;
    let ticketBaseSubtotal = 0;
    
    const ticketDiscountsMap = getItemDiscounts(cartItems);

    const ticketSubtotalSum = cartItems.reduce((sum, item) => {
      const basePrice = getProductPrice(item);
      const itemDisc = (breakdownDiscounts) ? 0 : (ticketDiscountsMap[item.cartItemId] || 0);
      const p = (breakdownDiscounts) ? basePrice : (basePrice - itemDisc / item.quantity);
      return sum + (p * item.quantity);
    }, 0);
    const ticketFactor = ticketSubtotalSum > 0 ? (tTotal / ticketSubtotalSum) : 1;

    cartItems.forEach(item => {
      const basePrice = getProductPrice(item);
      const itemDisc = (breakdownDiscounts) ? 0 : (ticketDiscountsMap[item.cartItemId] || 0);
      const itemPrice = (breakdownDiscounts) ? basePrice : (basePrice - itemDisc / item.quantity);
      const itemQty = item.quantity;
      const itemTotal = itemPrice * itemQty;
      
      const taxType = item.taxType || 'IVA';
      const taxRate = item.taxRate ?? 16.0;
      const iepsRate = item.iepsRate ?? 0.0;

      let basePriceEx = 0;
      let ivaAmt = 0;
      let iepsAmt = 0;

      if (taxType === 'IVA') {
        basePriceEx = itemTotal / (1 + taxRate / 100);
        ivaAmt = itemTotal - basePriceEx;
      } else if (taxType === 'IEPS') {
        basePriceEx = itemTotal / (1 + iepsRate / 100);
        iepsAmt = itemTotal - basePriceEx;
      } else if (taxType === 'IVA_IEPS') {
        basePriceEx = itemTotal / ((1 + iepsRate / 100) * (1 + taxRate / 100));
        iepsAmt = basePriceEx * (iepsRate / 100);
        ivaAmt = (basePriceEx + iepsAmt) * (taxRate / 100);
      } else {
        basePriceEx = itemTotal;
        ticketExento += itemTotal;
      }

      ticketIva += ivaAmt;
      ticketIeps += iepsAmt;
      ticketBaseSubtotal += basePriceEx;
    });

    ticketIva *= ticketFactor;
    ticketIeps *= ticketFactor;
    ticketExento *= ticketFactor;
    ticketBaseSubtotal *= ticketFactor;

    const itemDiscountsMap = (breakdownDiscounts) ? ticketDiscountsMap : {};
    const effectiveDiscount = (breakdownDiscounts) ? tDiscount : 0;
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
      const finalUrl = `${billingBaseUrl}${separator}ticketId=${saleId}`;
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
              const basePrice = getProductPrice(item);
              const displayedPrice = (breakdownDiscounts) 
                ? basePrice 
                : (basePrice - (getItemDiscounts([item])[item.cartItemId] || 0) / item.quantity);
              return `
                <div class="item-row">
                  <span class="col-cant">${item.quantity}</span>
                  <span class="col-desc">${item.name}</span>
                  <span class="col-price">$${(displayedPrice * item.quantity).toFixed(2)}</span>
                </div>
                ${discLabel}
              `;
            }).join('')}
          </div>
          <div class="t-divider"></div>
          <div class="totals">
            ${effectiveDiscount > 0 ? `<div class="total-row"><span>Subtotal bruto:</span><span>$${(tTotal + effectiveDiscount).toFixed(2)}</span></div>
            <div class="total-row" style="color: red;"><span>Descuento:</span><span>-$${effectiveDiscount.toFixed(2)}</span></div>` : ''}
            <div class="total-row" style="font-weight: normal; font-size: ${is58 ? '9px' : '11px'}; border-top: 1px dotted #000; padding-top: 4px; margin-top: 4px;"><span>Subtotal Base:</span><span>$${ticketBaseSubtotal.toFixed(2)}</span></div>
            ${ticketIva > 0 ? `<div class="total-row" style="font-weight: normal; font-size: ${is58 ? '9px' : '11px'};"><span>IVA Desglosado:</span><span>$${ticketIva.toFixed(2)}</span></div>` : ''}
            ${ticketIeps > 0 ? `<div class="total-row" style="font-weight: normal; font-size: ${is58 ? '9px' : '11px'};"><span>IEPS Desglosado:</span><span>$${ticketIeps.toFixed(2)}</span></div>` : ''}
            ${ticketExento > 0 ? `<div class="total-row" style="font-weight: normal; font-size: ${is58 ? '9px' : '11px'};"><span>Sin Impuestos:</span><span>$${ticketExento.toFixed(2)}</span></div>` : ''}
            ${tipAmount > 0 ? `<div class="total-row"><span>Propina:</span><span>+$${tipAmount.toFixed(2)}</span></div>` : ''}
            <div class="total-row" style="font-size: 16px; border-top: 1px solid #000; padding-top: 4px; margin-top: 4px;"><span>TOTAL:</span><span>$${(tTotal + tipAmount).toFixed(2)}</span></div>
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

  const handleCheckout = async (overridePaymentMethod?: string) => {
    if (cart.length === 0) return;
    const activePaymentMethod = overridePaymentMethod || paymentMethod;

    if (transactionType === 'PEDIDO') {
      if (!deliveryDate) {
        alert('Por favor, selecciona una fecha de entrega o retiro.');
        return;
      }
      if (!deliveryTime) {
        alert('Por favor, selecciona una hora de entrega o retiro.');
        return;
      }
      if (deliveryType === 'DELIVERY' && !deliveryStreet.trim()) {
        alert('Por favor, escribe la dirección para el envío a domicilio.');
        return;
      }
    }

    if (documentType === 'FACTURA') {
      const cleanRfc = (billRfc || '').trim();
      const cleanZip = (billZipCode || '').trim();
      const cleanName = (billName || '').trim();

      if (!cleanRfc || cleanRfc.length < 12 || cleanRfc.length > 13) {
        alert('⚠️ Error de Facturación: El RFC debe tener entre 12 y 13 caracteres.');
        return;
      }
      if (!cleanZip || cleanZip.length !== 5 || !/^\d{5}$/.test(cleanZip)) {
        alert('⚠️ Error de Facturación: El Código Postal debe tener exactamente 5 dígitos.');
        return;
      }
      if (!cleanName) {
        alert('⚠️ Error de Facturación: La Razón Social o Nombre completo es obligatoria.');
        return;
      }
    }

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

      const items = finalCart.map(item => {
        const basePrice = getProductPrice(item);
        // Always save the prorated discounted price in the database so item pricing is accurate
        const savedPrice = (subTotal > 0 ? (basePrice * (total / subTotal)) : 0);
        return { 
          productId: item.id, 
          variantId: item.variantId || null,
          quantity: item.quantity, 
          price: Number(savedPrice.toFixed(6)) 
        };
      });
      
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
             observations: notes,
             observationImageUrl,
             type: 'QUOTE',
             branchId,
             retryCount: 0,
             failed: false,
             breakdownDiscounts
          } as any);
          saleId = `OFFLINE-QUOTE-${Date.now()}`;
        } else {
          console.log("CLIENT CHECKOUT - mode: QUOTE", {
            itemsSum: items.reduce((sum, i) => sum + i.price * i.quantity, 0),
            finalTotalWithTip,
            subTotal,
            total,
            discount,
            manualDiscountValue,
            breakdownDiscounts
          });
          const quote = await createQuote(
            items,
            finalTotalWithTip,
            paymentMethod,
            selectedCustomerId || null,
            loadedQuoteId || undefined,
            breakdownDiscounts,
            notes,
            observationImageUrl
          );
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
        const transferValue = typeof transferAmount === 'number' ? transferAmount : undefined;
        
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
             paymentMethod: activePaymentMethod,
             // Guardamos todo el payload que requeriría el backend:
             ...{
                customerId: selectedCustomerId || null,
                sessionId,
                notes: finalNotes,
                cashValue,
                cardValue,
                billingData,
                branchId,
                type: 'SALE',
                breakdownDiscounts: breakdownDiscounts,
                isPedido: transactionType === 'PEDIDO',
                deliveryDate,
                deliveryTime,
                deliveryStreet,
                deliveryType
             },
             retryCount: 0,
             failed: false
          } as any);
          saleId = `OFFLINE-${Date.now()}`;
        } else {
          // ONLINE MODE
          // Use the real dynamic total calculated by the POS (total + tipAmount) to preserve edits (quantities, customer, additional products)
          const saleTotal = total + tipAmount;
          const isPedidoTx = transactionType === 'PEDIDO';
          const response = await createSale(
            items, 
            saleTotal, 
            activePaymentMethod, 
            selectedCustomerId || null, 
            sessionId, 
            finalNotes, 
            cashValue, 
            cardValue, 
            transferValue, 
            billingData, 
            loadedQuoteId || undefined, 
            loadedConsignmentId || undefined, 
            pointsRedeemed, 
            branchId, 
            breakdownDiscounts,
            isPedidoTx,
            deliveryDate || undefined,
            deliveryTime || undefined,
            deliveryStreet || undefined,
            deliveryType
          );
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
           if (mode === 'QUOTE') {
              if (saleId && !saleId.startsWith('OFFLINE')) {
                 window.open(`/ventas/detalle/${saleId}/imprimir-cotizacion`, '_blank');
              } else {
                 alert('Cotización guardada localmente (modo offline). Se podrá imprimir una vez sincronizada.');
              }
              router.push('/ventas/cotizaciones');
           } else {
              printTicket(cartBackup, totalBackup, changeBackup, discountBackup, saleId, responseSale?.folio);
              if (mode === 'CONSIGNMENT') {
                 router.push('/ventas/consignaciones');
              }
           }
           router.refresh();
        }, 100);
      }

    } catch (e) {
      if (handleActionError(e)) return;
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
          /* Reduce layout padding/gap */
          .pos-layout {
            gap: 0.75rem !important;
            padding: 0 !important;
          }
          /* Adjust row below tabs */
          .pos-actions-bar {
            flex-direction: column !important;
            align-items: stretch !important;
            gap: 0.75rem !important;
            padding: 0.75rem !important;
          }
          .pos-actions-bar > div {
            width: 100% !important;
            justify-content: space-between !important;
          }
          /* Make price list dropdown select take full width */
          .pos-price-list-container {
            flex: 1 !important;
            width: 100% !important;
          }
          .pos-price-list-select {
            flex: 1 !important;
          }
          /* Grid container padding */
          .pos-grid-container {
            gap: 0.75rem !important;
          }
          /* Action sidebar cards */
          .pos-action-grid {
            grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)) !important;
            gap: 0.5rem !important;
          }
          .pos-action-card {
            padding: 1rem 0.5rem !important;
            gap: 0.4rem !important;
          }
          .pos-action-label {
            font-size: 0.75rem !important;
          }
          /* Search results items for mobile */
          .search-result-item {
            flex-direction: column !important;
            align-items: flex-start !important;
            gap: 0.5rem !important;
          }
          .search-result-right {
            width: 100% !important;
            display: flex !important;
            justify-content: space-between !important;
            align-items: center !important;
            border-top: 1px dashed #e2e8f0;
            padding-top: 0.4rem;
            margin-top: 0.2rem;
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
                  const val = e.target.value;
                  setCustomerSearchTerm(val);
                  // Only reset the customer if the input is explicitly cleared
                  if (val.trim() === '') {
                    handleCustomerChange('');
                  }
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
          <div className="pos-actions-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', padding: '0.85rem 1rem', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc' }}>
            
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
              <div className="pos-price-list-container" style={{ display: 'flex', alignItems: 'center', border: 'none', borderRadius: '6px', backgroundColor: hasPermission('pos_price_list_change') ? '#78716c' : '#a8a29e', padding: '0 0.75rem', height: '36px', color: 'white' }}>
                <span className="pos-price-list-label" style={{ fontSize: '0.8rem', fontWeight: 'bold', marginRight: '0.35rem' }}>Listas de Precios:</span>
                <select 
                  className="pos-price-list-select"
                  value={priceList} 
                  disabled={!hasPermission('pos_price_list_change')}
                  onChange={e => {
                    const newPL = e.target.value;
                    setPriceList(newPL);
                    setCart(prev => prev.map(item => {
                      const { customPrice, ...rest } = item;
                      return rest;
                    }));
                  }} 
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
                  {priceList === 'wholesalePrice' && !dynamicPriceLists.some(pl => (pl.name || '').toLowerCase().includes('mayoreo')) && (
                    <option value="wholesalePrice" style={{ color: '#1e293b' }}>Precio Mayoreo</option>
                  )}
                  {priceList === 'specialPrice' && !dynamicPriceLists.some(pl => (pl.name || '').toLowerCase().includes('especial')) && (
                    <option value="specialPrice" style={{ color: '#1e293b' }}>Precio Especial</option>
                  )}
                </select>
              </div>

              {/* Trash/Clear cart */}
              <button 
                type="button"
                onClick={() => {
                  if (cart.length > 0 && confirm('¿Deseas vaciar el carrito actual?')) {
                    resetActiveTab();
                    lastQuoteIdRef.current = null;
                    if (lastCloneQuoteIdRef) lastCloneQuoteIdRef.current = null;
                    lastConsignmentIdRef.current = null;
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
                        <span>SKU: <strong style={{ color: '#334155' }}>{item.sku || '-'}</strong></span>
                        <span>| Código: <strong style={{ color: '#334155' }}>{item.barcode || '-'}</strong></span>
                      </div>
                      {(() => {
                        const itemLoyaltyPromo = promotions.find((promo: any) => {
                          if (promo.type !== 'LOYALTY_STAMP' || !promo.active) return false;
                          if (appliedPromotionIds !== null && !appliedPromotionIds.includes(promo.id)) return false;
                          
                          let meta: any = {};
                          try {
                            meta = promo.metadata ? JSON.parse(promo.metadata) : {};
                          } catch (e) {
                            return false;
                          }
                          
                          const hasNewTargets = (meta.targetProducts?.length > 0) || (meta.targetCategories?.length > 0) || (meta.targetBrands?.length > 0);
                          if (hasNewTargets) {
                            const matchProduct = meta.targetProducts?.includes(item.id);
                            const matchCategory = item.category && meta.targetCategories?.includes(item.category);
                            const matchBrand = item.brand && meta.targetBrands?.includes(item.brand);
                            return matchProduct || matchCategory || matchBrand;
                          } else {
                            if (meta.targetType === 'CATEGORY') {
                              return meta.applyToCategories?.includes(item.category);
                            } else if (meta.targetType === 'BRAND') {
                              return meta.applyToBrands?.includes(item.brand);
                            } else if (meta.targetType === 'PRODUCTS') {
                              return meta.applyToProducts?.includes(item.id);
                            }
                          }
                          return true;
                        });

                        if (itemLoyaltyPromo) {
                          const target = Math.round(itemLoyaltyPromo.value) || 10;
                          const pastCount = customerPurchaseCounts[item.id] || 0;
                          const currentStamps = pastCount % target;

                          let discountPct = 100;
                          try {
                            const promoMeta = itemLoyaltyPromo.metadata ? JSON.parse(itemLoyaltyPromo.metadata) : {};
                            if (promoMeta.discountPercent !== undefined) {
                              discountPct = Number(promoMeta.discountPercent);
                            }
                          } catch (e) {}

                          const rewardText = discountPct === 100 ? 'Gratis' : `${discountPct}% desc`;
                          
                          return (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem', marginTop: '0.25rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', fontWeight: 'bold', color: '#db2777' }}>
                                <span>🎁 Tarjeta de Sellos: {currentStamps} de {target} ({rewardText})</span>
                                {pastCount > 0 && <span style={{ color: '#94a3b8', fontWeight: 'normal' }}>(Historial: {pastCount} compras)</span>}
                              </div>
                              <div style={{ display: 'flex', gap: '0.15rem' }}>
                                {Array.from({ length: target }).map((_, idx) => {
                                  const isFilled = idx < currentStamps;
                                  return (
                                    <Star 
                                      key={idx} 
                                      size={12} 
                                      fill={isFilled ? '#eab308' : 'none'} 
                                      color={isFilled ? '#eab308' : '#cbd5e1'} 
                                    />
                                  );
                                })}
                              </div>
                            </div>
                          );
                        }
                        return null;
                      })()}
                      {mode === 'QUOTE' ? (() => {
                        const taxRate = item.taxRate ?? 16.0;
                        const taxFactor = 1 + (taxRate / 100);
                        const priceWithIvaVal = item.customPrice !== undefined ? item.customPrice : itemPrice;
                        const priceWithIva = priceWithIvaVal !== '' && priceWithIvaVal !== null ? parseFloat(priceWithIvaVal as any) : 0;
                        const priceBeforeIva = priceWithIva / taxFactor;
                        const ivaAmount = priceWithIva - priceBeforeIva;
                        
                        return (
                          <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                            {/* Inputs Row */}
                            {hasPermission('pos_price_change') ? (
                              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
                                {/* Antes de IVA Input */}
                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                                  <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '500' }}>Antes de IVA:</span>
                                  <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
                                    <span style={{ position: 'absolute', left: '0.35rem', color: '#64748b', fontSize: '0.85rem' }}>$</span>
                                    <input
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      value={priceWithIvaVal !== '' && priceWithIvaVal !== null ? Number(priceBeforeIva.toFixed(2)) : ''}
                                      onChange={e => {
                                        const val = e.target.value;
                                        if (val === '') {
                                          handleUpdatePrice(item.cartItemId, '' as any);
                                        } else {
                                          const parsed = parseFloat(val);
                                          if (!isNaN(parsed)) {
                                            const withIva = parsed * taxFactor;
                                            handleUpdatePrice(item.cartItemId, Number(withIva.toFixed(2)));
                                          }
                                        }
                                      }}
                                      style={{
                                        width: '95px',
                                        padding: '0.2rem 0.35rem 0.2rem 1rem',
                                        border: '1px solid #cbd5e1',
                                        borderRadius: '6px',
                                        fontSize: '0.85rem',
                                        fontWeight: '600',
                                        color: '#475569',
                                        outline: 'none',
                                        backgroundColor: '#f8fafc'
                                      }}
                                    />
                                  </div>
                                </div>

                                {/* Con IVA Input */}
                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                                  <span style={{ fontSize: '0.75rem', color: '#1e293b', fontWeight: 'bold' }}>Con IVA:</span>
                                  <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
                                    <span style={{ position: 'absolute', left: '0.35rem', color: '#64748b', fontSize: '0.85rem' }}>$</span>
                                    <input
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      value={priceWithIvaVal !== '' && priceWithIvaVal !== null ? priceWithIvaVal : ''}
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
                                        width: '95px',
                                        padding: '0.2rem 0.35rem 0.2rem 1rem',
                                        border: '1px solid #cbd5e1',
                                        borderRadius: '6px',
                                        fontSize: '0.85rem',
                                        fontWeight: '700',
                                        color: '#1e293b',
                                        outline: 'none',
                                        backgroundColor: 'white'
                                      }}
                                    />
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#1e293b' }}>
                                  ${priceWithIva.toFixed(2)}
                                </span>
                              </div>
                            )}

                            {/* Breakdown Row */}
                            <div style={{ 
                              display: 'flex', 
                              gap: '0.65rem', 
                              fontSize: '0.725rem', 
                              color: '#475569', 
                              backgroundColor: '#f8fafc', 
                              padding: '0.25rem 0.5rem', 
                              borderRadius: '6px', 
                              border: '1px solid #e2e8f0', 
                              width: 'fit-content',
                              marginTop: '0.15rem' 
                            }}>
                              <span>Subtotal (sin IVA): <strong>${(priceBeforeIva * item.quantity).toFixed(2)}</strong></span>
                              <span style={{ color: '#cbd5e1' }}>|</span>
                              <span>IVA ({taxRate}%): <strong>${(ivaAmount * item.quantity).toFixed(2)}</strong></span>
                              <span style={{ color: '#cbd5e1' }}>|</span>
                              <span>Total: <strong style={{ color: '#0f172a' }}>${(priceWithIva * item.quantity).toFixed(2)}</strong></span>
                            </div>
                          </div>
                        );
                      })() : (
                        <>
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
                            <div className="pos-cart-item-price">
                              ${((breakdownDiscounts) 
                                ? itemPrice 
                                : (itemPrice - (itemDiscounts[item.cartItemId] || 0) / item.quantity)
                              ).toFixed(2)}
                            </div>
                          )}
                        </>
                      )}
                      {(breakdownDiscounts) && itemDiscounts[item.cartItemId] > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#db2777', fontSize: '0.8rem', fontWeight: 'bold', marginTop: '0.25rem' }}>
                          <Percent size={14} />
                          <span>Promoción: -${itemDiscounts[item.cartItemId].toFixed(2)}</span>
                        </div>
                      )}
                      {mode === 'QUOTE' && (() => {
                        const purchasePrice = item.averageCost || item.cost || 0;
                        const taxRate = item.taxRate ?? 16.0;
                        const taxFactor = 1 + (taxRate / 100);
                        const purchasePriceConIva = purchasePrice * taxFactor;
                        const priceWithIvaVal = item.customPrice !== undefined ? item.customPrice : itemPrice;
                        const priceWithIva = priceWithIvaVal !== '' && priceWithIvaVal !== null ? parseFloat(priceWithIvaVal as any) : 0;
                        const priceBeforeIva = priceWithIva / taxFactor;
                        const marginPercent = priceBeforeIva > 0 ? ((priceBeforeIva - purchasePrice) / priceBeforeIva) * 100 : 0;
                        return (
                          <div style={{ display: 'flex', gap: '0.4rem', fontSize: '0.75rem', marginTop: '0.35rem', color: '#64748b', flexWrap: 'wrap', alignItems: 'center' }}>
                            <span style={{ backgroundColor: '#f1f5f9', padding: '0.15rem 0.35rem', borderRadius: '4px', border: '1px solid #e2e8f0', color: '#475569' }}>
                              Compra (prom.): <strong>${purchasePrice.toFixed(2)} sin IVA</strong> (${purchasePriceConIva.toFixed(2)} con IVA)
                            </span>
                            <span style={{ 
                              backgroundColor: marginPercent >= 0 ? '#dcfce7' : '#fee2e2', 
                              color: marginPercent >= 0 ? '#15803d' : '#b91c1c', 
                              padding: '0.15rem 0.35rem', 
                              borderRadius: '4px',
                              border: marginPercent >= 0 ? '1px solid #bbf7d0' : '1px solid #fca5a5',
                              fontWeight: 'bold'
                            }}>
                              Margen (sin IVA): <strong>{marginPercent.toFixed(1)}%</strong>
                            </span>
                            <span style={{ backgroundColor: '#f1f5f9', padding: '0.15rem 0.35rem', borderRadius: '4px', border: '1px solid #e2e8f0', color: '#475569' }}>
                              Venta (sin IVA): <strong>${priceBeforeIva.toFixed(2)}</strong>
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
                      {(breakdownDiscounts) && itemDiscounts[item.cartItemId] > 0 ? (
                        <>
                          <span style={{ fontSize: '0.8rem', color: '#94a3b8', textDecoration: 'line-through' }}>
                            ${itemSubtotal.toFixed(2)}
                          </span>
                          <span style={{ color: '#db2777', fontWeight: 'bold' }}>
                            ${(itemSubtotal - itemDiscounts[item.cartItemId]).toFixed(2)}
                          </span>
                        </>
                      ) : (
                        `$${(itemSubtotal - itemDiscounts[item.cartItemId]).toFixed(2)}`
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
                                const newCart = cart.filter(c => c.cartItemId !== item.cartItemId);
                                setCart(newCart);
                                if (newCart.length === 0) {
                                  setLoadedQuoteId(null);
                                  setLoadedQuoteTotal(null);
                                  setLoadedConsignmentId(null);
                                  lastQuoteIdRef.current = null;
                                  if (lastCloneQuoteIdRef) lastCloneQuoteIdRef.current = null;
                                  lastConsignmentIdRef.current = null;
                                  setNotes('');
                                }
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
            {cart.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', paddingBottom: '0.5rem', borderBottom: '1px solid #f1f5f9' }}>
                <input 
                  type="checkbox" 
                  id="breakdownDiscounts" 
                  checked={breakdownDiscounts} 
                  onChange={(e) => setBreakdownDiscounts(e.target.checked)} 
                  style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                />
                <label htmlFor="breakdownDiscounts" style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#475569', cursor: 'pointer', userSelect: 'none' }}>
                  Desglosar descuentos
                </label>
              </div>
            )}
            
            <div className="pos-subtotal-row">
              <span>Subtotal ({cart.reduce((s, i) => s + i.quantity, 0)} artículos)</span>
              <span className="pos-subtotal-value">${((breakdownDiscounts) ? subTotal : (subTotal - discount)).toFixed(2)}</span>
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

            {(breakdownDiscounts) && discount > 0 && (
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
                   setCart([newCartItem as any, ...cart]);
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
          <div style={{ backgroundColor: 'white', padding: '1.25rem 1.5rem', borderRadius: '8px', width: '460px', maxWidth: '90%', maxHeight: '92vh', overflowY: 'auto', boxSizing: 'border-box', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem', textAlign: 'center' }}>
               {mode === 'QUOTE' ? 'Finalizar Cotización' : mode === 'CONSIGNMENT' ? 'Finalizar Consignación' : 'Finalizar Venta'}
            </h2>
            
            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', borderBottom: '1px solid var(--caanma-border)', paddingBottom: '0.75rem' }}>
               <button 
                 onClick={() => setDocumentType('TICKET')} 
                 style={{ flex: 1, padding: '0.5rem', borderRadius: '4px', border: 'none', backgroundColor: documentType === 'TICKET' ? 'var(--caanma-primary)' : '#f1f5f9', color: documentType === 'TICKET' ? 'white' : '#64748b', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.9rem' }}
               >
                  Emitir Ticket
               </button>
               <button 
                 onClick={() => setDocumentType('FACTURA')} 
                 style={{ flex: 1, padding: '0.5rem', borderRadius: '4px', border: 'none', backgroundColor: documentType === 'FACTURA' ? '#10b981' : '#f1f5f9', color: documentType === 'FACTURA' ? 'white' : '#64748b', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.9rem' }}
               >
                  Emitir Factura
               </button>
            </div>
            
            <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--caanma-text-muted)' }}>{mode === 'QUOTE' ? 'Total Presupuestado' : mode === 'CONSIGNMENT' ? 'Total Consignado' : 'Total a Pagar'}</div>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--caanma-primary)' }}>${finalTotalWithTip.toFixed(2)}</div>
            </div>

            {/* Monedero Electrónico */}
            {mode === 'SALE' && selectedCust && loyaltySettings && loyaltySettings.isActive && selectedCust.pointsBalance > 0 && (
              <div style={{ marginBottom: '1rem', padding: '0.75rem', backgroundColor: '#eff6ff', borderRadius: '8px', border: '1px solid #bfdbfe' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 'bold', color: '#1e40af', marginBottom: '0.4rem', fontSize: '0.95rem' }}>
                  <Star size={16} fill="#1e40af" color="#1e40af" />
                  <span>Monedero Electrónico</span>
                </div>
                <div style={{ fontSize: '0.85rem', color: '#1e3a8a', display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span>Puntos Disponibles:</span>
                  <strong style={{ fontSize: '0.95rem' }}>{selectedCust.pointsBalance} pts</strong>
                </div>
                <div style={{ fontSize: '0.85rem', color: '#1e3a8a', display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span>Equivalencia en Pesos:</span>
                  <strong>${(selectedCust.pointsBalance * (loyaltySettings.pointValueInPesos || 1.0)).toFixed(2)} MXN</strong>
                </div>

                <div style={{ marginTop: '0.5rem', borderTop: '1px dashed #bfdbfe', paddingTop: '0.5rem' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', color: '#1e40af', marginBottom: '0.35rem' }}>
                    Redimir Puntos para esta compra (Máx: {Math.min(selectedCust.pointsBalance, Math.floor((total + tipAmount) / (loyaltySettings.pointValueInPesos || 1.0)))}):
                  </label>
                  <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
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
                      placeholder="Puntos"
                      style={{ flex: 1, padding: '0.4rem', fontSize: '0.85rem', borderRadius: '6px', border: '1px solid #bfdbfe', outline: 'none' }}
                    />
                    <button 
                      type="button"
                      onClick={() => {
                        const maxVal = Math.min(selectedCust.pointsBalance, Math.floor((total + tipAmount) / (loyaltySettings.pointValueInPesos || 1.0)));
                        setPointsRedeemed(maxVal);
                      }}
                      style={{ padding: '0.4rem 0.8rem', borderRadius: '6px', border: 'none', backgroundColor: '#2563eb', color: 'white', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.8rem' }}
                    >
                      Usar Todos
                    </button>
                  </div>
                  {pointsRedeemed > 0 && (
                    <div style={{ fontSize: '0.8rem', color: '#16a34a', marginTop: '0.4rem', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between' }}>
                      <span>Descuento aplicado:</span>
                      <span>-${(pointsRedeemed * (loyaltySettings.pointValueInPesos || 1.0)).toFixed(2)} MXN</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {mode !== 'QUOTE' && mode !== 'CONSIGNMENT' && ventasConfig.solicitarPropinas && (
               <div style={{ marginBottom: '1rem', borderBottom: '1px solid var(--caanma-border)', paddingBottom: '1rem' }}>
                 <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '500', marginBottom: '0.4rem' }}>Añadir Propina</label>
                 <div style={{ display: 'flex', gap: '0.4rem' }}>
                   {[10, 15, 20].map(pct => {
                     const amt = total * (pct / 100);
                     return (
                       <button
                         key={pct}
                         onClick={() => setTipAmount(tipAmount === amt ? 0 : amt)}
                         style={{ flex: 1, padding: '0.4rem', fontSize: '0.85rem', borderRadius: '4px', border: '1px solid', borderColor: tipAmount === amt ? '#10b981' : 'var(--caanma-border)', backgroundColor: tipAmount === amt ? '#d1fae5' : 'white', cursor: 'pointer', fontWeight: tipAmount === amt ? 'bold' : 'normal' }}
                       >
                         {pct}% (${amt.toFixed(2)})
                       </button>
                     );
                   })}
                 </div>
               </div>
            )}

            {mode !== 'QUOTE' && (
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '500', marginBottom: '0.4rem' }}>Método de Pago</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))', gap: '0.4rem' }}>
                  {allowedMethods.map(method => {
                    let displayName = method.name;
                    if (method.id === 'PAY_ON_PICKUP') {
                      displayName = deliveryType === 'DELIVERY' ? 'Pagar al recibir' : 'Pagar al recoger';
                    }
                    return (
                      <button 
                        key={method.id}
                        onClick={() => setPaymentMethod(method.id)}
                        style={{ 
                          padding: '0.5rem', borderRadius: '4px', border: '1px solid', 
                          borderColor: paymentMethod === method.id ? 'var(--caanma-primary)' : 'var(--caanma-border)',
                          backgroundColor: paymentMethod === method.id ? '#eff6ff' : 'white',
                          color: paymentMethod === method.id ? 'var(--caanma-primary)' : 'inherit',
                          fontWeight: paymentMethod === method.id ? 'bold' : 'normal',
                          fontSize: '0.85rem',
                          cursor: 'pointer'
                        }}
                      >
                        {displayName}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {mode !== 'QUOTE' && paymentMethod === 'CREDIT' && selectedCust && (
              <div style={{ marginBottom: '1rem', padding: '0.75rem', backgroundColor: '#fef3c7', borderRadius: '8px', border: '1px solid #fde68a' }}>
                <div style={{ fontWeight: 'bold', color: '#b45309', marginBottom: '0.2rem', fontSize: '1rem' }}>Venta a Crédito</div>
                {selectedCust.creditLimit <= 0 ? (
                  <div style={{ color: 'red', fontWeight: 'bold', fontSize: '0.9rem' }}>
                    ⚠️ El cliente no tiene una línea de crédito autorizada (Límite: $0.00). Configura su límite en la sección de Clientes.
                  </div>
                ) : (
                  <>
                    <div style={{ color: '#d97706', fontSize: '0.9rem' }}>
                      Límite disp.: ${ (selectedCust.creditLimit - (selectedCust.creditBalance || 0)).toFixed(2) } | Días máx.: {selectedCust.creditDays}
                    </div>
                    {total > (selectedCust.creditLimit - (selectedCust.creditBalance || 0)) && (
                      <div style={{ marginTop: '0.4rem', color: 'red', fontWeight: 'bold', fontSize: '0.9rem' }}>
                        ⚠️ El total excede el límite de crédito disponible.
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {mode !== 'QUOTE' && (paymentMethod === 'CASH' || paymentMethod.toLowerCase().includes('efectivo')) && (
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '500', marginBottom: '0.4rem' }}>Efectivo Recibido</label>
                <input 
                  type="number" 
                  autoFocus
                  value={amountReceived}
                  onChange={e => setAmountReceived(e.target.value === '' ? '' : parseFloat(e.target.value))}
                  placeholder={`Mínimo $${finalTotalWithTip.toFixed(2)}`}
                  style={{ width: '100%', padding: '0.75rem', fontSize: '1.1rem', borderRadius: '4px', border: '1px solid var(--caanma-border)', textAlign: 'right' }}
                />
                {(typeof amountReceived === 'number' && amountReceived >= finalTotalWithTip) && (
                  <div style={{ marginTop: '0.4rem', textAlign: 'right', fontSize: '0.95rem', color: '#16a34a', fontWeight: 'bold' }}>
                    Cambio a entregar: ${change.toFixed(2)}
                  </div>
                )}
              </div>
            )}
            
            {paymentMethod === 'MIXTO' && (
              <div style={{ marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '500', marginBottom: '0.35rem' }}>Pago en Tarjeta</label>
                    <input 
                      type="number" 
                      value={cardAmount}
                      onChange={e => {
                         const v = e.target.value === '' ? '' : parseFloat(e.target.value);
                         setCardAmount(v);
                         const cVal = typeof v === 'number' ? v : 0;
                         const tVal = typeof transferAmount === 'number' ? transferAmount : 0;
                         if (cVal + tVal <= finalTotalWithTip) setAmountReceived(finalTotalWithTip - cVal - tVal);
                      }}
                      placeholder={`Monto`}
                      style={{ width: '100%', padding: '0.75rem', fontSize: '1.1rem', borderRadius: '4px', border: '1px solid var(--caanma-border)', textAlign: 'right' }}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '500', marginBottom: '0.35rem' }}>Pago en Transferencia</label>
                    <input 
                      type="number" 
                      value={transferAmount}
                      onChange={e => {
                         const v = e.target.value === '' ? '' : parseFloat(e.target.value);
                         setTransferAmount(v);
                         const tVal = typeof v === 'number' ? v : 0;
                         const cVal = typeof cardAmount === 'number' ? cardAmount : 0;
                         if (cVal + tVal <= finalTotalWithTip) setAmountReceived(finalTotalWithTip - cVal - tVal);
                      }}
                      placeholder={`Monto`}
                      style={{ width: '100%', padding: '0.75rem', fontSize: '1.1rem', borderRadius: '4px', border: '1px solid var(--caanma-border)', textAlign: 'right' }}
                    />
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '500', marginBottom: '0.35rem' }}>Pago en Efectivo</label>
                  <input 
                    type="number" 
                    value={amountReceived}
                    onChange={e => setAmountReceived(e.target.value === '' ? '' : parseFloat(e.target.value))}
                    placeholder={`Restante`}
                    style={{ width: '100%', padding: '0.75rem', fontSize: '1.1rem', borderRadius: '4px', border: '1px solid var(--caanma-border)', textAlign: 'right' }}
                  />
                </div>
              </div>
            )}

            {/* Campos de entrega para Pedidos */}
            {transactionType === 'PEDIDO' && (
              <div style={{ marginBottom: '1.25rem', padding: '1rem', border: '1px solid #cbd5e1', borderRadius: '8px', backgroundColor: '#f8fafc' }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 'bold', margin: '0 0 1rem 0', color: 'var(--caanma-primary)', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>
                  Detalles del Pedido / Entrega
                </h3>
                
                {/* Tipo de Entrega */}
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', color: '#475569', marginBottom: '0.4rem' }}>
                    Tipo de Entrega
                  </label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      type="button"
                      onClick={() => {
                        setDeliveryType('PICKUP');
                        setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, deliveryType: 'PICKUP' } : t));
                        if (paymentMethod === 'PAY_ON_DELIVERY') {
                          setPaymentMethod('PAY_ON_PICKUP');
                          setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, paymentMethod: 'PAY_ON_PICKUP' } : t));
                        }
                      }}
                      style={{
                        flex: 1,
                        padding: '0.5rem',
                        fontSize: '0.85rem',
                        borderRadius: '4px',
                        border: '1px solid',
                        borderColor: deliveryType === 'PICKUP' ? 'var(--caanma-primary)' : '#cbd5e1',
                        backgroundColor: deliveryType === 'PICKUP' ? '#eff6ff' : 'white',
                        color: deliveryType === 'PICKUP' ? 'var(--caanma-primary)' : '#475569',
                        fontWeight: deliveryType === 'PICKUP' ? 'bold' : 'normal',
                        cursor: 'pointer'
                      }}
                    >
                      Recoger en Tienda
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDeliveryType('DELIVERY');
                        setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, deliveryType: 'DELIVERY' } : t));
                        if (paymentMethod === 'PAY_ON_PICKUP') {
                          setPaymentMethod('PAY_ON_DELIVERY');
                          setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, paymentMethod: 'PAY_ON_DELIVERY' } : t));
                        }
                      }}
                      style={{
                        flex: 1,
                        padding: '0.5rem',
                        fontSize: '0.85rem',
                        borderRadius: '4px',
                        border: '1px solid',
                        borderColor: deliveryType === 'DELIVERY' ? 'var(--caanma-primary)' : '#cbd5e1',
                        backgroundColor: deliveryType === 'DELIVERY' ? '#eff6ff' : 'white',
                        color: deliveryType === 'DELIVERY' ? 'var(--caanma-primary)' : '#475569',
                        fontWeight: deliveryType === 'DELIVERY' ? 'bold' : 'normal',
                        cursor: 'pointer'
                      }}
                    >
                      Envío a Domicilio
                    </button>
                  </div>
                </div>

                {/* Fecha y Hora de Entrega */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', color: '#475569', marginBottom: '0.35rem' }}>
                      Fecha de Entrega/Retiro <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="date"
                      value={deliveryDate}
                      required
                      onChange={e => {
                        setDeliveryDate(e.target.value);
                        setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, deliveryDate: e.target.value } : t));
                      }}
                      style={{ width: '100%', padding: '0.4rem', fontSize: '0.85rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', color: '#475569', marginBottom: '0.35rem' }}>
                      Hora de Entrega/Retiro <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="time"
                      value={deliveryTime}
                      required
                      onChange={e => {
                        setDeliveryTime(e.target.value);
                        setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, deliveryTime: e.target.value } : t));
                      }}
                      style={{ width: '100%', padding: '0.4rem', fontSize: '0.85rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                    />
                  </div>
                </div>

                {/* Dirección de Entrega (solo si es Domicilio) */}
                {deliveryType === 'DELIVERY' && (
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', color: '#475569', marginBottom: '0.35rem' }}>
                      Dirección de Entrega <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <textarea
                      value={deliveryStreet}
                      required
                      rows={2}
                      onChange={e => {
                        setDeliveryStreet(e.target.value);
                        setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, deliveryStreet: e.target.value } : t));
                      }}
                      placeholder="Calle, número, colonia, referencias de entrega..."
                      style={{ width: '100%', padding: '0.4rem', fontSize: '0.85rem', borderRadius: '4px', border: '1px solid #cbd5e1', resize: 'vertical' }}
                    />
                  </div>
                )}
              </div>
            )}

            <div style={{ marginBottom: '1rem' }}>
               <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '500', marginBottom: '0.4rem' }}>
                 {mode === 'QUOTE' ? 'Observaciones de la Cotización' : 'Notas del Ticket (Opcional)'}
               </label>
               {mode === 'QUOTE' ? (
                 <textarea 
                    value={notes}
                    onChange={e => {
                      setNotes(e.target.value);
                      setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, notes: e.target.value } : t));
                    }}
                    placeholder="Ej. Condiciones especiales de entrega, validez de stock, etc."
                    rows={3}
                    style={{ width: '100%', padding: '0.5rem', fontSize: '0.85rem', borderRadius: '4px', border: '1px solid var(--caanma-border)', resize: 'vertical' }}
                 />
               ) : (
                 <input 
                    type="text" 
                    value={notes}
                    onChange={e => {
                      setNotes(e.target.value);
                      setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, notes: e.target.value } : t));
                    }}
                    placeholder="Ej. Entregar pedido especial..."
                    style={{ width: '100%', padding: '0.5rem', fontSize: '0.85rem', borderRadius: '4px', border: '1px solid var(--caanma-border)' }}
                 />
               )}
            </div>

            {mode === 'QUOTE' && (
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '500', marginBottom: '0.4rem' }}>
                  Imagen de Referencia (Opcional)
                </label>
                {observationImageUrl ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem', border: '1px solid var(--caanma-border)', borderRadius: '6px', backgroundColor: '#f8fafc' }}>
                    <img 
                      src={observationImageUrl} 
                      alt="Referencia" 
                      style={{ height: '48px', width: '48px', objectFit: 'cover', borderRadius: '4px', border: '1px solid var(--caanma-border)' }} 
                    />
                    <div style={{ flex: 1 }}>
                      <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', fontWeight: '500' }}>Imagen cargada</span>
                      <button 
                        type="button"
                        onClick={() => {
                          setObservationImageUrl('');
                          setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, observationImageUrl: '' } : t));
                        }}
                        style={{ fontSize: '0.75rem', color: '#ef4444', background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontWeight: 'bold' }}
                      >
                        Eliminar imagen
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ position: 'relative' }}>
                    <label 
                      htmlFor="quote-image-upload" 
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        gap: '0.5rem', 
                        padding: '0.625rem', 
                        border: '2px dashed #cbd5e1', 
                        borderRadius: '6px', 
                        cursor: 'pointer',
                        color: '#475569',
                        fontSize: '0.8rem',
                        fontWeight: '500',
                        backgroundColor: '#f8fafc',
                        transition: 'border-color 0.2s'
                      }}
                    >
                      <svg style={{ width: '14px', height: '14px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      Subir imagen de referencia
                    </label>
                    <input 
                      id="quote-image-upload"
                      type="file" 
                      accept="image/*" 
                      onChange={handleImageUpload}
                      style={{ display: 'none' }}
                    />
                  </div>
                )}
              </div>
            )}

            {documentType === 'FACTURA' && (
              <div style={{ marginBottom: '1rem', padding: '0.75rem', backgroundColor: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                 <h3 style={{ fontSize: '0.95rem', fontWeight: 'bold', color: '#166534', marginBottom: '0.75rem' }}>Datos de Facturación CFDI 4.0</h3>
                 
                 <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', color: '#166534', fontWeight: 'bold', marginBottom: '0.2rem' }}>RFC *</label>
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
                         style={{ width: '100%', padding: '0.4rem', fontSize: '0.85rem', borderRadius: '4px', border: '1px solid #bbf7d0' }} 
                       />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', color: '#166534', fontWeight: 'bold', marginBottom: '0.2rem' }}>Cód. Postal *</label>
                      <input type="text" value={billZipCode} onChange={e => setBillZipCode(e.target.value)} placeholder="Ej: 76000" style={{ width: '100%', padding: '0.4rem', fontSize: '0.85rem', borderRadius: '4px', border: '1px solid #bbf7d0' }} />
                    </div>
                 </div>

                 <div style={{ marginBottom: '0.75rem' }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: '#166534', fontWeight: 'bold', marginBottom: '0.2rem' }}>Razón Social *</label>
                    <input type="text" value={billName} onChange={e => setBillName(e.target.value.toUpperCase())} placeholder="NOMBRE COMPLETO S.A. DE C.V." style={{ width: '100%', padding: '0.4rem', fontSize: '0.85rem', borderRadius: '4px', border: '1px solid #bbf7d0' }} />
                 </div>

                 <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', color: '#166534', fontWeight: 'bold', marginBottom: '0.2rem' }}>Régimen Fiscal</label>
                      <select value={billRegime} onChange={e => setBillRegime(e.target.value)} style={{ width: '100%', padding: '0.4rem', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid #bbf7d0', backgroundColor: 'white' }}>
                        <option value="601">601 - Gral. Morales</option>
                        <option value="603">603 - Sin Fines Lucrativos</option>
                        <option value="605">605 - Sueldos y Salarios</option>
                        <option value="606">606 - Arrendamiento</option>
                        <option value="607">607 - Enajenación de Bienes</option>
                        <option value="608">608 - Demás ingresos</option>
                        <option value="610">610 - Residentes Extranjero</option>
                        <option value="611">611 - Dividendos</option>
                        <option value="612">612 - P.F. Activ. Empresariales</option>
                        <option value="614">614 - Intereses</option>
                        <option value="615">615 - Obtención de premios</option>
                        <option value="616">616 - Sin obligaciones fiscales</option>
                        <option value="620">620 - Sociedades Cooperativas</option>
                        <option value="621">621 - Incorporación Fiscal</option>
                        <option value="622">622 - Act. Agrícolas, Ganaderas, Silvícolas y Pesqueras (AGAPES - PM)</option>
                        <option value="623">623 - Opcional Grupos Sociedades</option>
                        <option value="624">624 - Coordinados</option>
                        <option value="625">625 - Act. Plataformas Tecnológicas</option>
                        <option value="626">626 - RESICO</option>
                        <option value="628">628 - Hidrocarburos</option>
                        <option value="629">629 - Regímenes Preferentes</option>
                        <option value="630">630 - Enajenación acciones bolsa</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', color: '#166534', fontWeight: 'bold', marginBottom: '0.2rem' }}>Uso de CFDI</label>
                      <select value={billUse} onChange={e => setBillUse(e.target.value)} style={{ width: '100%', padding: '0.4rem', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid #bbf7d0', backgroundColor: 'white' }}>
                        <option value="G01">G01 - Adquisición mercancías</option>
                        <option value="G03">G03 - Gastos en general</option>
                        <option value="P01">P01 - Por definir</option>
                        <option value="D01">D01 - Honorarios médicos</option>
                      </select>
                    </div>
                 </div>
              </div>
            )}

            {documentType === 'FACTURA' && (
              (!billRfc.trim() || billRfc.trim().length < 12 || billRfc.trim().length > 13 || !billZipCode.trim() || billZipCode.trim().length !== 5 || !billName.trim()) && (
                <div style={{ color: '#ef4444', fontSize: '0.8rem', fontWeight: 'bold', marginTop: '0.75rem', padding: '0.5rem', backgroundColor: '#fef2f2', borderRadius: '4px', border: '1px solid #fee2e2', textAlign: 'center' }}>
                  ⚠️ El RFC (12-13 caracteres), Razón Social y Código Postal (5 dígitos) son obligatorios para emitir factura.
                </div>
              )
            )}

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem', flexDirection: transactionType === 'PEDIDO' ? 'column' : 'row' }}>
              {transactionType === 'PEDIDO' ? (
                <>
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button 
                      onClick={() => setIsCheckoutOpen(false)} 
                      style={{ flex: 1, padding: '0.75rem', fontSize: '0.95rem', border: '1px solid var(--caanma-border)', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', background: 'white' }}
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={() => handleCheckout(deliveryType === 'DELIVERY' ? 'PAY_ON_DELIVERY' : 'PAY_ON_PICKUP')}
                      disabled={
                        isProcessing ||
                        cart.some((item: any) => item.isFastItem) ||
                        (documentType === 'FACTURA' && (!billRfc.trim() || billRfc.trim().length < 12 || billRfc.trim().length > 13 || !billZipCode.trim() || billZipCode.trim().length !== 5 || !billName.trim()))
                      }
                      className="btn-secondary"
                      style={{ flex: 2, padding: '0.75rem', fontSize: '0.95rem', fontWeight: 'bold', border: '1px solid var(--caanma-primary)', color: 'var(--caanma-primary)', borderRadius: '4px', cursor: 'pointer', backgroundColor: '#eff6ff', opacity: isProcessing ? 0.5 : 1 }}
                    >
                      {isProcessing ? 'Guardando...' : 'Confirmar como Pendiente de Pago'}
                    </button>
                  </div>
                  <button
                    onClick={() => {
                      if (paymentMethod === 'PAY_ON_PICKUP' || paymentMethod === 'PAY_ON_DELIVERY') {
                        alert("Por favor, selecciona un método de pago (Efectivo, Tarjeta, etc.) para registrar el pedido como Pagado.");
                        return;
                      }
                      handleCheckout();
                    }}
                    disabled={
                      isProcessing ||
                      (paymentMethod === 'CASH' && (typeof amountReceived !== 'number' || amountReceived < finalTotalWithTip)) ||
                      (paymentMethod === 'MIXTO' && ((typeof amountReceived === 'number' ? amountReceived : 0) + (typeof cardAmount === 'number' ? cardAmount : 0) + (typeof transferAmount === 'number' ? transferAmount : 0)) < finalTotalWithTip) ||
                      cart.some((item: any) => item.isFastItem) ||
                      (documentType === 'FACTURA' && (!billRfc.trim() || billRfc.trim().length < 12 || billRfc.trim().length > 13 || !billZipCode.trim() || billZipCode.trim().length !== 5 || !billName.trim())) ||
                      (paymentMethod === 'CREDIT' && (!selectedCust || selectedCust.creditLimit <= 0 || total > (selectedCust.creditLimit - (selectedCust.creditBalance || 0))))
                    }
                    className="btn-primary"
                    style={{ width: '100%', padding: '0.75rem', fontSize: '0.95rem', fontWeight: 'bold', borderRadius: '4px', cursor: 'pointer', opacity: isProcessing ? 0.5 : 1 }}
                  >
                    {isProcessing ? 'Guardando...' : 'Confirmar como Pagado'}
                  </button>
                </>
              ) : (
                <>
                  <button onClick={() => setIsCheckoutOpen(false)} style={{ flex: 1, padding: '0.75rem', fontSize: '0.95rem', border: '1px solid var(--caanma-border)', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', background: 'white' }}>
                    Cancelar
                  </button>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <button 
                      onClick={() => handleCheckout()} 
                      disabled={
                        isProcessing || 
                        (mode === 'SALE' && paymentMethod === 'CASH' && (typeof amountReceived !== 'number' || amountReceived < finalTotalWithTip)) ||
                        (mode === 'SALE' && paymentMethod === 'MIXTO' && ((typeof amountReceived === 'number' ? amountReceived : 0) + (typeof cardAmount === 'number' ? cardAmount : 0) + (typeof transferAmount === 'number' ? transferAmount : 0)) < finalTotalWithTip) ||
                        (mode === 'SALE' && cart.some((item: any) => item.isFastItem)) ||
                        (documentType === 'FACTURA' && (!billRfc.trim() || billRfc.trim().length < 12 || billRfc.trim().length > 13 || !billZipCode.trim() || billZipCode.trim().length !== 5 || !billName.trim())) ||
                        (mode === 'SALE' && paymentMethod === 'CREDIT' && (!selectedCust || selectedCust.creditLimit <= 0 || total > (selectedCust.creditLimit - (selectedCust.creditBalance || 0))))
                      }
                      className="btn-primary" 
                      style={{ width: '100%', padding: '0.75rem', fontSize: '0.95rem', opacity: isProcessing ? 0.5 : 1 }}
                    >
                      {isProcessing ? 'Guardando...' : (mode === 'QUOTE' ? 'Guardar Cotización' : mode === 'CONSIGNMENT' ? 'Confirmar Consignación' : 'Confirmar Pago')}
                    </button>
                    {mode === 'SALE' && cart.some((item: any) => item.isFastItem) && (
                      <div style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.4rem', fontWeight: 'bold', textAlign: 'center' }}>
                        ⚠️ No se puede cerrar la venta porque incluye un artículo rápido. Regístralo en el catálogo primero.
                      </div>
                    )}
                  </div>
                </>
              )}
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
                placeholder="🔍 Buscar por Folio, Cliente o ID..."
                style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--caanma-border)' }}
                autoFocus
              />
            </div>

            <div style={{ overflowY: 'auto', flex: 1, marginBottom: '1.5rem', border: '1px solid var(--caanma-border)', borderRadius: '4px' }}>
               {(() => {
                 const allQuotes = [
                   ...localOfflineQuotes,
                   ...(pendingQuotes || []).filter(pq => !localOfflineQuotes.some(loq => loq.id === pq.id))
                 ];
                 const term = quoteSearchId.trim().toLowerCase().replace(/^#/, '');
                 const filtered = allQuotes.filter(q => {
                   if (!term) return true;
                   const folioMatch = q.folio && q.folio.toLowerCase().includes(term);
                   const idMatch = q.id.toLowerCase().includes(term);
                   const customerMatch = q.customer?.name && q.customer.name.toLowerCase().includes(term);
                   return folioMatch || idMatch || customerMatch;
                 });
                 if (filtered.length === 0) {
                   return (
                     <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--caanma-text-muted)' }}>
                        No hay cotizaciones coincidentes en esta sucursal.
                     </div>
                   );
                 }
                 return filtered.map(quote => {
                   const displayFolio = quote.folio ? `#${quote.folio}` : `#${quote.id.slice(0, 8).toUpperCase()}`;
                   return (
                     <button 
                        key={quote.id} 
                        onClick={() => handleLoadQuote(quote.id)}
                        style={{ 
                          width: '100%', 
                          padding: '0.85rem 1rem', 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center', 
                          borderBottom: '1px solid var(--caanma-border)', 
                          backgroundColor: 'white', 
                          cursor: 'pointer',
                          textAlign: 'left',
                          transition: 'background-color 0.15s'
                        }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f8fafc'}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'white'}
                     >
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <div style={{ fontWeight: 'bold', color: '#1e293b', fontSize: '0.95rem' }}>
                              Cotización {displayFolio}
                            </div>
                            {(quote.id.startsWith('OFFLINE-') || quote.id.length > 30) ? (
                              <span style={{ fontSize: '0.7rem', backgroundColor: '#fef3c7', color: '#d97706', padding: '0.1rem 0.35rem', borderRadius: '4px', fontWeight: 'bold' }}>
                                Offline
                              </span>
                            ) : null}
                          </div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--caanma-text-muted)', marginTop: '0.15rem' }}>
                            {new Date(quote.createdAt).toLocaleString()}
                            {quote.customer?.name && (
                              <span style={{ color: '#475569', fontWeight: '500' }}> • {quote.customer.name}</span>
                            )}
                          </div>
                        </div>
                        <div style={{ fontWeight: 'bold', color: 'var(--caanma-primary)', fontSize: '1.05rem' }}>
                          ${quote.total.toFixed(2)}
                        </div>
                     </button>
                   );
                 });
               })()}
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
              {selectedProductForVariant.variants.map((v: any) => {
                const vPrice = (() => {
                  const listsToSearch = (allPriceLists && allPriceLists.length > 0) ? allPriceLists : dynamicPriceLists;
                  let activeListName = '';
                  if (priceList.startsWith('priceList_')) {
                    const plId = priceList.replace('priceList_', '');
                    const foundPL = listsToSearch.find((pl: any) => pl.id === plId);
                    if (foundPL) activeListName = (foundPL.name || '').toLowerCase().trim();
                  } else if (priceList === 'wholesalePrice') {
                    activeListName = 'mayoreo';
                  } else if (priceList === 'specialPrice') {
                    activeListName = 'especial';
                  }

                  const isWholesale = priceList === 'wholesalePrice' || activeListName.includes('mayoreo') || activeListName.includes('wholesale') || activeListName.includes('mayorista');
                  const isSpecial = priceList === 'specialPrice' || activeListName.includes('especial') || activeListName.includes('special');

                  if (isWholesale && v.wholesalePrice && Number(v.wholesalePrice) > 0) return Number(v.wholesalePrice);
                  if (isSpecial && v.specialPrice && Number(v.specialPrice) > 0) return Number(v.specialPrice);

                  const parentDynamic = getProductPrice(selectedProductForVariant);
                  if (priceList !== 'price' && parentDynamic !== selectedProductForVariant.price) {
                    return parentDynamic;
                  }

                  if (v.price && Number(v.price) > 0) return Number(v.price);
                  return parentDynamic;
                })();

                return (
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
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.2rem' }}>
                      <div style={{ fontSize: '1rem', fontWeight: 'bold', color: 'var(--caanma-primary)' }}>
                        ${vPrice.toFixed(2)}
                      </div>
                      <div style={{ fontSize: '0.875rem', fontWeight: '600', color: v.stock > 0 ? '#16a34a' : '#dc2626' }}>
                        {v.stock} disp.
                      </div>
                    </div>
                  </button>
                );
              })}
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
                id="pos-search-input"
                type="text" 
                autoFocus
                placeholder="Escribe el nombre, SKU o código de barras del producto..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                onKeyDown={async (e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    await handleImmediateSearch(searchTerm);
                  }
                }}
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
                      className="search-result-item"
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
                          SKU: {p.sku || '-'} | Código: {p.barcode || '-'} | {p.isService ? (
                            <span style={{ color: '#2563eb', fontWeight: 'bold', backgroundColor: '#dbeafe', padding: '0.1rem 0.3rem', borderRadius: '4px' }}>Servicio</span>
                          ) : (
                            <>Stock: <span style={{ color: p.stock > 0 ? '#16a34a' : '#dc2626', fontWeight: 'bold' }}>{p.stock}</span></>
                          )}
                        </div>
                        {mode === 'QUOTE' && (() => {
                          const purchasePrice = p.averageCost || p.cost || 0;
                          const taxRate = p.taxRate ?? 16.0;
                          const taxFactor = 1 + (taxRate / 100);
                          const purchasePriceConIva = purchasePrice * taxFactor;
                          const priceBeforeIva = pPrice / taxFactor;
                          const marginPercent = priceBeforeIva > 0 ? ((priceBeforeIva - purchasePrice) / priceBeforeIva) * 100 : 0;
                          return (
                            <div style={{ display: 'flex', gap: '0.35rem', fontSize: '0.7rem', marginTop: '0.25rem', color: '#64748b', flexWrap: 'wrap', alignItems: 'center' }}>
                              <span style={{ backgroundColor: '#f1f5f9', padding: '0.1rem 0.25rem', borderRadius: '4px', border: '1px solid #e2e8f0', color: '#475569' }}>
                                Compra: <strong>${purchasePrice.toFixed(2)} sin IVA</strong> (${purchasePriceConIva.toFixed(2)} con IVA)
                              </span>
                              <span style={{ 
                                backgroundColor: marginPercent >= 0 ? '#dcfce7' : '#fee2e2', 
                                color: marginPercent >= 0 ? '#15803d' : '#b91c1c', 
                                padding: '0.1rem 0.25rem', 
                                borderRadius: '4px',
                                border: marginPercent >= 0 ? '1px solid #bbf7d0' : '1px solid #fca5a5',
                                fontWeight: 'bold'
                              }}>
                                Margen (sin IVA): <strong>{marginPercent.toFixed(1)}%</strong>
                              </span>
                              <span style={{ backgroundColor: '#f1f5f9', padding: '0.1rem 0.25rem', borderRadius: '4px', border: '1px solid #e2e8f0', color: '#475569' }}>
                                Venta (sin IVA): <strong>${priceBeforeIva.toFixed(2)}</strong>
                              </span>
                            </div>
                          );
                        })()}
                      </div>
                      <div className="search-result-right" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
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
