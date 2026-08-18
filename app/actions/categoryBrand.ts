'use server';

import { prisma } from '@/lib/prisma';
import { getActiveBranch } from '@/app/actions/auth';
import { revalidatePath } from 'next/cache';

export async function getCategoriesAndBrands() {
  const branch = await getActiveBranch();
  if (!branch) throw new Error('No hay sucursal activa');

  const branchId = branch.id;

  // Fetch all products for the branch to compute exact counts
  const products = await prisma.product.findMany({
    where: { branchId },
    select: { id: true, category: true, brand: true }
  });

  const categoryMap: Record<string, number> = {};
  const brandMap: Record<string, number> = {};

  products.forEach(p => {
    if (p.category && p.category.trim() !== '') {
      const cat = p.category.trim();
      categoryMap[cat] = (categoryMap[cat] || 0) + 1;
    }
    if (p.brand && p.brand.trim() !== '') {
      const br = p.brand.trim();
      brandMap[br] = (brandMap[br] || 0) + 1;
    }
  });

  const categories = Object.keys(categoryMap)
    .sort((a, b) => a.localeCompare(b))
    .map(name => ({
      name,
      productCount: categoryMap[name]
    }));

  const brands = Object.keys(brandMap)
    .sort((a, b) => a.localeCompare(b))
    .map(name => ({
      name,
      productCount: brandMap[name]
    }));

  return { categories, brands };
}

export async function renameCategory(oldName: string, newName: string) {
  const branch = await getActiveBranch();
  if (!branch) throw new Error('No hay sucursal activa');
  if (!newName || newName.trim() === '') throw new Error('El nuevo nombre de categoría no puede estar vacío');

  const cleanOld = oldName.trim();
  const cleanNew = newName.trim();

  await prisma.product.updateMany({
    where: {
      branchId: branch.id,
      category: { equals: cleanOld, mode: 'insensitive' }
    },
    data: {
      category: cleanNew
    }
  });

  revalidatePath('/preferencias/categorias-marcas');
  revalidatePath('/productos');
}

export async function renameBrand(oldName: string, newName: string) {
  const branch = await getActiveBranch();
  if (!branch) throw new Error('No hay sucursal activa');
  if (!newName || newName.trim() === '') throw new Error('El nuevo nombre de marca no puede estar vacío');

  const cleanOld = oldName.trim();
  const cleanNew = newName.trim();

  await prisma.product.updateMany({
    where: {
      branchId: branch.id,
      brand: { equals: cleanOld, mode: 'insensitive' }
    },
    data: {
      brand: cleanNew
    }
  });

  revalidatePath('/preferencias/categorias-marcas');
  revalidatePath('/productos');
}

export async function deleteCategory(categoryName: string) {
  const branch = await getActiveBranch();
  if (!branch) throw new Error('No hay sucursal activa');

  const cleanName = categoryName.trim();

  await prisma.product.updateMany({
    where: {
      branchId: branch.id,
      category: { equals: cleanName, mode: 'insensitive' }
    },
    data: {
      category: null
    }
  });

  revalidatePath('/preferencias/categorias-marcas');
  revalidatePath('/productos');
}

export async function deleteBrand(brandName: string) {
  const branch = await getActiveBranch();
  if (!branch) throw new Error('No hay sucursal activa');

  const cleanName = brandName.trim();

  await prisma.product.updateMany({
    where: {
      branchId: branch.id,
      brand: { equals: cleanName, mode: 'insensitive' }
    },
    data: {
      brand: null
    }
  });

  revalidatePath('/preferencias/categorias-marcas');
  revalidatePath('/productos');
}
