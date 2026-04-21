import Dexie, { Table } from 'dexie';

export interface DLQMetadata {
  retryCount: number;
  errorMessage?: string;
  failed: boolean;
}

export interface OfflineSale extends DLQMetadata {
  id: string;
  items: any[];
  total: number;
  paymentMethod: string;
  customerId?: string | null;
  sessionId?: string;
  notes?: string;
  cashValue?: number;
  cardValue?: number;
  billingData?: any;
  timestamp: string;
  synced: boolean;
}

export interface OfflineTransfer extends DLQMetadata {
  id: string;
  fromBranchId: string;
  toBranchId?: string;
  reason: string;
  items: any[];
  isDirectDispatch: boolean;
  timestamp: string;
  synced: boolean;
}

export interface OfflinePurchase extends DLQMetadata {
  id: string;
  supplierId: string;
  reason: string;
  customSupplierName?: string;
  facturaOrNote?: string;
  items: any[];
  timestamp: string;
  synced: boolean;
  isDirectPurchase?: boolean;
  total?: number;
  paymentMethod?: string;
  freightCost?: number;
  notes?: string;
}

// Estos son los catálogos espejo
export interface OfflineProduct {
  id: string;
  branchId: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  stock: number;
  cost: number;
  averageCost: number;
  price: number;
  category: string | null;
  variants: any[];
  prices: any[]; // PriceLists links
}

export interface OfflineCustomer {
  id: string;
  branchId?: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  street?: string | null;
  exteriorNumber?: string | null;
  storeCredit?: number;
  priceList?: string;
}

export interface OfflineSupplier {
  id: string;
  name: string;
  contact?: string | null;
  email?: string | null;
  branchId?: string | null;
  phone?: string | null;
  street?: string | null;
  exteriorNumber?: string | null;
  storeCredit?: number;
}

export interface OfflineBranch {
  id: string;
  name: string;
}

export interface OfflineSettings {
  id: string; // 'branch_config'
  ventasConfig: any;
  ticketConfig: any;
  metodosConfig: any;
}

export interface OfflinePendingProduct extends DLQMetadata {
  id: string; // Temp local id
  branchId: string;
  name: string;
  sku: string;
  barcode: string | null;
  stock: number;
  minStock: number;
  cost: number;
  price: number;
  taxRate: number;
  category: string;
  brand: string;
  unit: string;
  isActive: boolean;
  supplierId: string | null;
  variantsJson: string; // The UI sends this
  hasVariants: boolean;
  imageUrl?: string;
  youtubeUrl?: string;
  satKey?: string;
  satUnit?: string;
  description?: string;
  timestamp: string;
  synced: boolean;
  dynamicPrices?: Record<string, number>; 
}

export class CAANMAOfflineDB extends Dexie {
  pendingSales!: Table<OfflineSale>;
  pendingTransfers!: Table<OfflineTransfer>;
  pendingPurchases!: Table<OfflinePurchase>;
  pendingProducts!: Table<OfflinePendingProduct>;
  
  products!: Table<OfflineProduct>;
  customers!: Table<OfflineCustomer>;
  suppliers!: Table<OfflineSupplier>;
  branches!: Table<OfflineBranch>;
  settings!: Table<OfflineSettings>;

  constructor() {
    super('CAANMAOfflineDB');
    this.version(17).stores({
      pendingSales: 'id, timestamp, synced, failed',
      pendingTransfers: 'id, timestamp, synced, failed',
      pendingPurchases: 'id, timestamp, synced, failed',
      pendingProducts: 'id, timestamp, synced, failed',
      products: 'id, branchId, sku, barcode, name',
      customers: 'id, branchId, name',
      suppliers: 'id, name',
      branches: 'id, name',
      settings: 'id'
    });
  }
}

export const db = new CAANMAOfflineDB();
