'use server';

import { getActiveUser } from './auth';
import { hasPermission } from '@/app/config/permissions';

export async function getMergedUserPermissions() {
  try {
    const user = await getActiveUser();
    if (!user) return { success: false, error: 'No active user' };

    const rolePermissions = (user as any).customRole?.permissions;
    const userPermissionsRaw = user.permissions;
    const mergedList: string[] = [];

    if (rolePermissions) {
      try {
        const parsed = JSON.parse(rolePermissions);
        if (Array.isArray(parsed)) mergedList.push(...parsed);
        else Object.keys(parsed).forEach((k) => { if (parsed[k]) mergedList.push(k); });
      } catch (e) {}
    }

    if (userPermissionsRaw) {
      try {
        const parsed = JSON.parse(userPermissionsRaw);
        if (Array.isArray(parsed)) mergedList.push(...parsed);
        else Object.keys(parsed).forEach((k) => { if (parsed[k]) mergedList.push(k); });
      } catch (e) {}
    }

    const userPermissions: Record<string, boolean> = {};
    if (mergedList.length > 0) {
      const tempPermissions: Record<string, boolean> = {};
      mergedList.forEach((p: string) => tempPermissions[p] = true);

      Object.keys(tempPermissions).forEach(p => {
        if (hasPermission(tempPermissions, p)) {
          userPermissions[p] = true;
        }
      });
    }
    
    return { 
      success: true, 
      permissions: userPermissions, 
      role: user.role, 
      isSuperAdmin: user.email?.toLowerCase() === 'pelayogfdz@gmail.com' 
    };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}
