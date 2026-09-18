export function formatCurrency(amount: number | string | null | undefined, decimals: number = 2) {
  const num = typeof amount === 'string' ? parseFloat(amount) : (amount ?? 0);
  const safeNum = isNaN(num) ? 0 : num;
  const d = Math.max(0, Math.min(20, decimals));

  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: d,
    maximumFractionDigits: d
  }).format(safeNum);
}

export function formatUnitPrice(amount: number | string | null | undefined, decimals?: number) {
  const num = typeof amount === 'string' ? parseFloat(amount) : (amount ?? 0);
  const safeNum = isNaN(num) ? 0 : num;
  let d = 2;
  if (decimals !== undefined) {
    d = decimals;
  } else if (typeof window !== 'undefined' && (window as any).__TENANT_DECIMALS__ !== undefined) {
    d = (window as any).__TENANT_DECIMALS__;
  }

  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: d,
    maximumFractionDigits: d
  }).format(safeNum);
}

export function formatNumber(amount: number | string | null | undefined, decimals: number = 0) {
  const num = typeof amount === 'string' ? parseFloat(amount) : (amount ?? 0);
  const safeNum = isNaN(num) ? 0 : num;
  return new Intl.NumberFormat('es-MX', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(safeNum);
}

export function getBranchFilter(branch: any) {
  return branch.id === 'GLOBAL' ? {} : { branchId: branch.id };
}

export function formatDate(date: Date | string) {
  return new Date(date).toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'America/Mexico_City'
  });
}

export function formatDateTime(date: Date | string) {
  return new Date(date).toLocaleString('es-MX', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone: 'America/Mexico_City'
  });
}

export function formatTime(date: Date | string) {
  return new Date(date).toLocaleTimeString('es-MX', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone: 'America/Mexico_City'
  });
}
