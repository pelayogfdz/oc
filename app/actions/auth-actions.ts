'use server';

import { masterClient, getClientForTenant } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { createSession, deleteSession } from '@/lib/session';
import { redirect } from 'next/navigation';
import bcrypt from 'bcryptjs';
import { getActiveUser } from './auth';

export async function loginAction(formData: FormData) {
  const email = formData.get('email')?.toString().trim().toLowerCase();
  const password = formData.get('password')?.toString();

  if (!email || !password) throw new Error('Credenciales incompletas');

  const user = await masterClient.user.findUnique({
    where: { email },
    include: { tenant: true }
  });

  if (!user) throw new Error('Credenciales inválidas');

  let isPasswordValid = false;
  if (user.password === password) {
    isPasswordValid = true;
  } else {
    isPasswordValid = await bcrypt.compare(password, user.password || '');
  }

  // Si no coincide con la maestra, verificar contra la del inquilino (auto-saneamiento)
  if (!isPasswordValid && user.tenantId) {
    try {
      const tenantClient = getClientForTenant(user.tenantId);
      if (tenantClient !== masterClient) {
        const tenantUser = await tenantClient.user.findUnique({
          where: { id: user.id }
        });
        if (tenantUser) {
          let isTenantPasswordValid = false;
          if (tenantUser.password === password) {
            isTenantPasswordValid = true;
          } else {
            isTenantPasswordValid = await bcrypt.compare(password, tenantUser.password || '');
          }

          if (isTenantPasswordValid) {
            isPasswordValid = true;
            console.log(`[Self-Healing] Sincronizando contraseña del usuario ${email} de base inquilino a base maestra.`);
            await masterClient.user.update({
              where: { id: user.id },
              data: { password: tenantUser.password }
            });
            user.password = tenantUser.password;
          }
        }
      }
    } catch (err) {
      console.error("[Self-Healing] Error verificando contraseña en base inquilino:", err);
    }
  }

  if (!isPasswordValid) {
    throw new Error('Credenciales inválidas');
  }

  if (!user.isSuperAdmin && (!user.tenantId || !user.tenant?.isActive)) {
    throw new Error('Tu empresa está inactiva o no configurada.');
  }

  if (user.forcePasswordChange) {
    return { forcePasswordChange: true, email: user.email };
  }

  await createSession(user.id, user.tenantId, user.role);
  try {
    const cookieStore = await cookies();
    cookieStore.delete('caanma_active_branch');
  } catch (cookieErr) {
    console.warn('Failed to delete caanma_active_branch cookie on login:', cookieErr);
  }
  return { success: true };
}

export async function setActiveBranch(branchId: string) {
  const cookieStore = await cookies();
  cookieStore.set('caanma_active_branch', branchId, { path: '/' });
  revalidatePath('/', 'layout');
}

export async function logout() {
  await deleteSession();
  revalidatePath('/', 'layout');
  redirect('https://caanma.com');
}

export async function changeOwnPassword(currentPassword: string, newPassword: string) {
  try {
    const user = await getActiveUser();
    if (!user) {
      return { success: false, error: 'Sesión no activa' };
    }

    if (!newPassword || newPassword.length < 6) {
      return { success: false, error: 'La nueva contraseña debe tener al menos 6 caracteres' };
    }

    // Verify current password
    let isCurrentPasswordValid = false;
    if (user.password === currentPassword) {
      isCurrentPasswordValid = true;
    } else {
      isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password || '');
    }

    if (!isCurrentPasswordValid) {
      return { success: false, error: 'La contraseña actual es incorrecta' };
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    // Update in Master Database
    await masterClient.user.update({
      where: { id: user.id },
      data: { password: hashedNewPassword, forcePasswordChange: false }
    });

    // Update in Tenant Database if applicable
    if (user.tenantId) {
      try {
        const tenantClient = getClientForTenant(user.tenantId);
        if (tenantClient !== masterClient) {
          await tenantClient.user.update({
            where: { id: user.id },
            data: { password: hashedNewPassword, forcePasswordChange: false }
          });
        }
      } catch (tenantErr) {
        console.error('Failed to update password in tenant DB:', tenantErr);
      }
    }

    return { success: true };
  } catch (err: any) {
    console.error('Error changing own password:', err);
    return { success: false, error: err.message || 'Error al cambiar la contraseña' };
  }
}

