import Dexie, { Table } from 'dexie';

export interface OfflineSale {
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

export interface OfflineTransfer {
  id: string;
  fromBranchId: string;
  toBranchId?: string;
  reason: string;
  items: any[];
  isDirectDispatch: boolean;
  timestamp: string;
  synced: boolean;
}

export interface OfflinePurchase {
  id: string;
  supplierId: string;
  reason: string;
  customSupplierName?: string;
  facturaOrNote?: string;
  items: any[];
  timestamp: string;
  synced: boolean;
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
  branchId: string;
  name: string;
  email: string | null;
  phone: string | null;
}

export interface OfflineSupplier {
  id: string;
  name: string;
  contact: string | null;
  email: string | null;
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

export class CAANMAOfflineDB extends Dexie {
  pendingSales!: Table<OfflineSale>;
  pendingTransfers!: Table<OfflineTransfer>;
  pendingPurchases!: Table<OfflinePurchase>;
  
  products!: Table<OfflineProduct>;
  customers!: Table<OfflineCustomer>;
  suppliers!: Table<OfflineSupplier>;
  branches!: Table<OfflineBranch>;
  settings!: Table<OfflineSettings>;

  constructor() {
    super('CAANMAOfflineDB');
    this.version(1).stores({
      pendingSales: 'id, timestamp, synced',
      pendingTransfers: 'id, timestamp, synced',
      pendingPurchases: 'id, timestamp, synced',
      products: 'id, branchId, sku, barcode, name',
      customers: 'id, branchId, name',
      suppliers: 'id, name',
      branches: 'id, name',
      settings: 'id'
    });
  }
}

export const db = new CAANMAOfflineDB();
