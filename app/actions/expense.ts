'use server';

import { prisma } from "@/lib/prisma";
import { getActiveBranch, getActiveUser } from "@/app/actions/auth";
import { revalidatePath } from "next/cache";

export async function createExpenseAction(data: {
  category: string;
  reason: string;
  amount: number;
  branchId?: string;
  createdAt?: string;
}) {
  try {
    const user = await getActiveUser();
    const defaultBranch = await getActiveBranch();
    const targetBranchId = data.branchId || defaultBranch?.id;

    if (!data.category || !data.reason || !data.amount || isNaN(data.amount) || data.amount <= 0) {
      return { success: false, error: 'Por favor complete todos los campos con valores válidos.' };
    }

    const expense = await prisma.expense.create({
      data: {
        category: data.category.trim(),
        reason: data.reason.trim(),
        amount: Number(data.amount),
        branchId: targetBranchId,
        userId: user.id,
        createdAt: data.createdAt ? new Date(data.createdAt) : new Date()
      },
      include: {
        branch: true,
        user: true
      }
    });

    revalidatePath('/productos/gastos');
    revalidatePath('/reportes');
    return { success: true, expense: JSON.parse(JSON.stringify(expense)) };
  } catch (error: any) {
    console.error('Error creating expense:', error);
    return { success: false, error: error.message || 'Error al registrar el gasto' };
  }
}

export async function deleteExpenseAction(id: string) {
  try {
    const user = await getActiveUser();
    if (!user) {
      return { success: false, error: 'No autorizado' };
    }

    await prisma.expense.delete({
      where: { id }
    });

    revalidatePath('/productos/gastos');
    revalidatePath('/reportes');
    return { success: true };
  } catch (error: any) {
    console.error('Error deleting expense:', error);
    return { success: false, error: error.message || 'Error al eliminar el gasto' };
  }
}
