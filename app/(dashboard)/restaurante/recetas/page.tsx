import React from 'react';
import { getRestaurantRecipes } from '@/app/actions/restaurantActions';
import { prisma } from '@/lib/prisma';
import { getActiveBranch } from '@/app/actions/auth';
import RecetasClient from './RecetasClient';

export const dynamic = 'force-dynamic';

export default async function RecetasPage() {
  const activeBranch = await getActiveBranch();
  const branchId = activeBranch?.id !== 'GLOBAL' ? activeBranch?.id : undefined;

  const [recipesRes, dishProducts, rawIngredients] = await Promise.all([
    getRestaurantRecipes(branchId),
    prisma.product.findMany({
      where: {
        ...(branchId ? { branchId } : {}),
        isActive: true,
        isProductionInput: false
      },
      select: { id: true, name: true, sku: true, price: true, cost: true, stock: true, unit: true, category: true, isProductionInput: true },
      orderBy: { name: 'asc' }
    }),
    prisma.product.findMany({
      where: {
        ...(branchId ? { branchId } : {}),
        isActive: true
      },
      select: { id: true, name: true, sku: true, price: true, cost: true, stock: true, unit: true, category: true, isProductionInput: true },
      orderBy: { name: 'asc' }
    })
  ]);

  const recipes = recipesRes.success ? (recipesRes.recipes as any) : [];

  return (
    <RecetasClient
      initialRecipes={recipes}
      dishProducts={dishProducts}
      rawIngredients={rawIngredients}
    />
  );
}
