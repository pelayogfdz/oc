import { redirect } from 'next/navigation';
import { getActiveBranch, getSession } from '@/app/actions/auth';
import { getCatalogBrandsAndCategories } from '@/app/actions/catalog';
import CatalogosClient from './CatalogosClient';

export default async function CatalogosPage() {
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }

  const branch = await getActiveBranch();
  if (!branch) {
    redirect('/');
  }

  const res = await getCatalogBrandsAndCategories();
  
  return (
    <CatalogosClient 
      initialBrands={res.brands || []} 
      initialCategories={res.categories || []} 
    />
  );
}
