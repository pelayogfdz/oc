export function formatCurrency(amount: number, decimals?: number) {
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
  }).format(amount);
}

export function getBranchFilter(branch: any) {
  return branch.id === 'GLOBAL' ? {} : { branchId: branch.id };
}

export function formatDate(date: Date | string) {
  return new Date(date).toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}
