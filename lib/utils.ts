export function formatCurrency(amount: number) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN'
  }).format(amount);
}
export function getBranchFilter(branch: any) {
  return branch.id === 'GLOBAL' ? {} : { branchId: branch.id };
}
