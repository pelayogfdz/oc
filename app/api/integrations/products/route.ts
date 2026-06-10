import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateToken } from '../auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = await authenticateToken(request);
  if (!auth) {
    return NextResponse.json({ error: 'No autorizado. Token API inválido o inactivo.' }, { status: 401 });
  }

  const { branch } = auth;

  try {
    // Fetch all active products in this branch
    const products = await prisma.product.findMany({
      where: {
        branchId: branch.id,
        isActive: true,
        // @ts-ignore
        showInWeb: true
      },
      select: {
        id: true,
        sku: true,
        barcode: true,
        name: true,
        description: true,
        price: true,
        wholesalePrice: true,
        specialPrice: true,
        cost: true,
        isActive: true,
        unit: true,
        stock: true,
        category: true,
        brand: true,
        imageUrl: true,
        allowProduction: true,
        isProductionInput: true,
        isService: true,
        satKey: true,
        satUnit: true,
        updatedAt: true,
        // @ts-ignore
        showInWeb: true
      },
      orderBy: {
        name: 'asc'
      }
    });

    return NextResponse.json({
      success: true,
      branch: {
        id: branch.id,
        name: branch.name
      },
      count: products.length,
      products
    });
  } catch (error: any) {
    console.error('Error fetching products for integration API:', error);
    return NextResponse.json({ error: 'Error del servidor: ' + error.message }, { status: 500 });
  }
}
