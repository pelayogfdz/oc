'use server';

import { prisma } from '@/lib/prisma';
import { getActiveBranch } from './auth';

/**
 * Obtiene la lista única de marcas y categorías que tienen productos activos en la sucursal actual
 */
export async function getCatalogBrandsAndCategories() {
  try {
    const branch = await getActiveBranch();
    if (!branch) return { success: false, brands: [], categories: [] };

    // Ejecutar consultas de agrupación en paralelo
    const [brandsData, categoriesData] = await Promise.all([
      prisma.product.groupBy({
        by: ['brand'],
        where: {
          branchId: branch.id,
          isActive: true,
          brand: { not: null }
        },
        _count: true
      }),
      prisma.product.groupBy({
        by: ['category'],
        where: {
          branchId: branch.id,
          isActive: true,
          category: { not: null }
        },
        _count: true
      })
    ]);

    const brands = brandsData
      .map(b => b.brand)
      .filter((b): b is string => !!b && b.trim() !== '')
      .sort((a, b) => a.localeCompare(b));

    const categories = categoriesData
      .map(c => c.category)
      .filter((c): c is string => !!c && c.trim() !== '')
      .sort((a, b) => a.localeCompare(b));

    return {
      success: true,
      brands,
      categories
    };
  } catch (error: any) {
    console.error('Error al obtener marcas/categorías para catálogo:', error);
    return { success: false, brands: [], categories: [], error: error.message };
  }
}

/**
 * Buscador de productos optimizado para la selección manual en la interfaz de catálogo
 */
export async function searchCatalogProducts(params: {
  query?: string;
  brand?: string;
  category?: string;
  limit?: number;
}) {
  try {
    const branch = await getActiveBranch();
    if (!branch) return { success: false, products: [] };

    const { query = '', brand = '', category = '', limit = 50 } = params;

    const whereClause: any = {
      branchId: branch.id,
      isActive: true
    };

    if (brand && brand !== 'TODAS') {
      whereClause.brand = brand;
    }

    if (category && category !== 'TODAS') {
      whereClause.category = category;
    }

    if (query.trim() !== '') {
      whereClause.OR = [
        { name: { contains: query, mode: 'insensitive' } },
        { sku: { contains: query, mode: 'insensitive' } },
        { barcode: { contains: query, mode: 'insensitive' } }
      ];
    }

    const products = await prisma.product.findMany({
      where: whereClause,
      select: {
        id: true,
        sku: true,
        name: true,
        description: true,
        price: true,
        specialPrice: true,
        brand: true,
        category: true,
        imageUrl: true,
        stock: true
      },
      orderBy: { name: 'asc' },
      take: limit
    });

    return {
      success: true,
      products
    };
  } catch (error: any) {
    console.error('Error al buscar productos para catálogo:', error);
    return { success: false, products: [], error: error.message };
  }
}

/**
 * Recopila los productos solicitados para el catálogo imprimible
 */
export async function getPrintProducts(params: {
  type: 'brands' | 'special' | 'promotions';
  brands?: string[];
  categories?: string[];
  selectedIds?: string[];
  limit?: number;
}) {
  try {
    const branch = await getActiveBranch();
    if (!branch) return { success: false, products: [], branchName: '', tenantName: '' };

    // Obtener los datos del tenant/branch para la portada
    const branchInfo = await prisma.branch.findUnique({
      where: { id: branch.id },
      include: { tenant: true }
    });

    const { type, brands = [], categories = [], selectedIds = [], limit = 100 } = params;

    const whereClause: any = {
      branchId: branch.id,
      isActive: true
    };

    if (type === 'brands') {
      if (brands.length > 0) {
        whereClause.brand = { in: brands };
      }
      if (categories.length > 0) {
        whereClause.category = { in: categories };
      }
    } else if (type === 'special') {
      if (selectedIds.length === 0) {
        return { success: true, products: [], branchName: branchInfo?.name || '', tenantName: branchInfo?.tenant?.name || '' };
      }
      whereClause.id = { in: selectedIds };
    } else if (type === 'promotions') {
      // Artículos de promoción: tienen un specialPrice definido y mayor a 0, y es menor al precio regular
      whereClause.specialPrice = { gt: 0 };
    }

    const products = await prisma.product.findMany({
      where: whereClause,
      select: {
        id: true,
        sku: true,
        name: true,
        description: true,
        price: true,
        specialPrice: true,
        brand: true,
        category: true,
        imageUrl: true
      },
      orderBy: [
        { brand: 'asc' },
        { name: 'asc' }
      ],
      take: limit
    });

    // Filtrar en caso de promociones de forma segura si por alguna razón specialPrice >= price
    let finalProducts = products;
    if (type === 'promotions') {
      finalProducts = products.filter(p => p.specialPrice !== null && p.specialPrice < p.price);
    }

    return {
      success: true,
      products: finalProducts,
      branchName: branchInfo?.name || '',
      tenantName: branchInfo?.tenant?.name || ''
    };
  } catch (error: any) {
    console.error('Error al recopilar productos para imprimir catálogo:', error);
    return { success: false, products: [], branchName: '', tenantName: '', error: error.message };
  }
}
