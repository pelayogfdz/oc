import { getCategoriesAndBrands } from '@/app/actions/categoryBrand';
import CategoriasMarcasClient from './CategoriasMarcasClient';

export const dynamic = 'force-dynamic';

export default async function PreferenciasCategoriasMarcasPage() {
  const { categories, brands } = await getCategoriesAndBrands();

  return (
    <CategoriasMarcasClient 
      initialCategories={categories}
      initialBrands={brands}
    />
  );
}
