/**
 * Utility functions for resolving, extracting and styling Mercado Libre order and shipment statuses.
 */

export interface MeliStatusConfig {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  icon?: string;
}

/**
 * Extracts a previously tagged status from notes, e.g. [MELI_STATUS: Para enviar hoy]
 */
export function extractMeliStatus(notes: string | null | undefined): string | null {
  if (!notes) return null;
  const match = notes.match(/\[MELI_STATUS:\s*([^\]]+)\]/i);
  if (match) return match[1].trim();

  // If notes mention cancellation by buyer or seller
  if (notes.includes('CANCELACIÓN AUTOMÁTICA MERCADO LIBRE')) {
    if (notes.toLowerCase().includes('cancel_purchase') || notes.toLowerCase().includes('buyer')) {
      return 'Cancelada por el comprador';
    }
    if (notes.toLowerCase().includes('seller')) {
      return 'Cancelada por el vendedor';
    }
    return 'Cancelada';
  }

  return null;
}

/**
 * Returns badge colors, borders and labels according to the Mercado Libre status text.
 */
export function getMeliStatusBadgeConfig(statusText: string): MeliStatusConfig {
  const norm = (statusText || '').toLowerCase().trim();

  if (norm.includes('entregada') || norm === 'delivered' || norm === 'entregado') {
    return {
      label: 'Entregada',
      color: '#15803d',
      bgColor: '#dcfce7',
      borderColor: '#bbf7d0',
      icon: '✓'
    };
  }

  if (norm.includes('camino') || norm === 'shipped' || norm === 'in_transit' || norm.includes('reparto')) {
    return {
      label: norm.includes('llega hoy') ? 'En camino (Llega hoy)' : 'En camino',
      color: '#1d4ed8',
      bgColor: '#dbeafe',
      borderColor: '#bfdbfe',
      icon: '🚚'
    };
  }

  if (norm.includes('enviar hoy') || norm.includes('despachar hoy')) {
    return {
      label: 'Para enviar hoy',
      color: '#c2410c',
      bgColor: '#ffedd5',
      borderColor: '#fed7aa',
      icon: '⚡'
    };
  }

  if (norm.includes('enviar mañ') || norm.includes('enviar man')) {
    return {
      label: 'Para enviar mañana',
      color: '#a16207',
      bgColor: '#fef9c3',
      borderColor: '#fef08a',
      icon: '📦'
    };
  }

  if (norm.includes('demorad') || norm.includes('retrasad') || norm === 'delayed') {
    return {
      label: 'Demorado',
      color: '#b91c1c',
      bgColor: '#fee2e2',
      borderColor: '#fca5a5',
      icon: '⚠️'
    };
  }

  if (norm.includes('comprador')) {
    return {
      label: 'Cancelada por el comprador',
      color: '#991b1b',
      bgColor: '#fee2e2',
      borderColor: '#fca5a5',
      icon: '✕'
    };
  }

  if (norm.includes('vendedor')) {
    return {
      label: 'Cancelada por el vendedor',
      color: '#991b1b',
      bgColor: '#fee2e2',
      borderColor: '#fca5a5',
      icon: '✕'
    };
  }

  if (norm.includes('cancelad') || norm === 'cancelled') {
    return {
      label: 'Cancelada',
      color: '#991b1b',
      bgColor: '#fee2e2',
      borderColor: '#fca5a5',
      icon: '✕'
    };
  }

  if (norm.includes('listo para enviar') || norm.includes('listo para despachar') || norm === 'ready_to_ship') {
    return {
      label: 'Listo para enviar',
      color: '#854d0e',
      bgColor: '#fef08a',
      borderColor: '#fde047',
      icon: '📦'
    };
  }

  if (norm.includes('no entregad') || norm === 'not_delivered') {
    return {
      label: 'No entregada',
      color: '#6d28d9',
      bgColor: '#f3e8ff',
      borderColor: '#ddd6fe',
      icon: '⚠️'
    };
  }

  if (norm.includes('devuelt') || norm.includes('devolución') || norm === 'returned') {
    return {
      label: 'Devuelta',
      color: '#6d28d9',
      bgColor: '#f3e8ff',
      borderColor: '#ddd6fe',
      icon: '↩'
    };
  }

  // Default fallback
  return {
    label: statusText || 'Mercado Libre',
    color: '#334155',
    bgColor: '#f1f5f9',
    borderColor: '#e2e8f0',
    icon: '🛒'
  };
}

/**
 * Given shipment and order data from Mercado Libre API, calculates the exact user-facing status.
 */
export function calculateMeliStatus(params: {
  shipData?: any;
  orderData?: any;
  slaData?: any;
  notes?: string | null;
  saleStatus?: string;
  timezone?: string;
}): string {
  const { shipData, orderData, slaData, notes, saleStatus, timezone = 'America/Mexico_City' } = params;

  // 1. Check if order or sale was cancelled
  if (
    saleStatus === 'CANCELLED' || 
    orderData?.status === 'cancelled' || 
    shipData?.status === 'cancelled' ||
    notes?.includes('CANCELACIÓN AUTOMÁTICA')
  ) {
    const cancelDetail = orderData?.cancel_detail;
    const reqBy = cancelDetail?.requested_by || cancelDetail?.group || '';
    if (reqBy === 'buyer' || notes?.toLowerCase().includes('cancel_purchase') || notes?.toLowerCase().includes('buyer')) {
      return 'Cancelada por el comprador';
    }
    if (reqBy === 'seller' || notes?.toLowerCase().includes('seller')) {
      return 'Cancelada por el vendedor';
    }
    return 'Cancelada';
  }

  if (!shipData) {
    return 'Mercado Libre';
  }

  // 2. Delivered
  if (shipData.status === 'delivered') {
    return 'Entregada';
  }

  // 3. Shipped / In Transit
  if (shipData.status === 'shipped') {
    if (shipData.substatus === 'out_for_delivery') {
      return 'En camino (Llega hoy)';
    }
    return 'En camino';
  }

  // 4. Not delivered or returned
  if (shipData.status === 'not_delivered') {
    return 'No entregada';
  }
  if (shipData.status === 'returned') {
    return 'Devuelta';
  }

  // 5. Handling, Pending, Ready to Ship
  const now = new Date();
  const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(now);
  const tomorrow = new Date(now.getTime() + 24 * 3600 * 1000);
  const tomorrowStr = new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(tomorrow);

  const expectedDate = slaData?.expected_date || shipData.shipping_option?.buffering?.date || '';
  if (expectedDate) {
    const expDay = expectedDate.substring(0, 10);
    if (expDay === todayStr) {
      return 'Para enviar hoy';
    }
    if (expDay === tomorrowStr) {
      return 'Para enviar mañana';
    }
    if (expDay < todayStr) {
      return 'Demorado';
    }
    return `Para enviar el ${expDay.slice(8, 10)}/${expDay.slice(5, 7)}`;
  }

  if (shipData.status === 'ready_to_ship') {
    return 'Listo para enviar';
  }

  return 'Preparando paquete';
}
