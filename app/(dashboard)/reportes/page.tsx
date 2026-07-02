import { getDashboardMetrics } from "@/app/actions/reports";
import ReportesModuleClient from "./ReportesModuleClient";
import { getActiveUser } from "@/app/actions/auth";
import { hasPermission } from "@/app/config/permissions";

export default async function Page() {
  const metrics = await getDashboardMetrics();
  const user = await getActiveUser().catch(() => null);

  let userPermissions: Record<string, boolean> = {};
  let userRole = 'USER';
  let isSuperAdmin = false;
  if (user) {
    userRole = user.role;
    isSuperAdmin = user.email?.toLowerCase() === 'pelayogfdz@gmail.com';
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

    if (mergedList.length > 0) {
      try {
        const tempPermissions: Record<string, boolean> = {};
        mergedList.forEach((p: string) => tempPermissions[p] = true);

        Object.keys(tempPermissions).forEach(p => {
          if (hasPermission(tempPermissions, p)) {
            userPermissions[p] = true;
          }
        });
      } catch (e) {}
    }
  }

  return (
    <ReportesModuleClient 
      initialMetrics={metrics} 
      userPermissions={userPermissions} 
      userRole={userRole} 
      isSuperAdmin={isSuperAdmin} 
    />
  );
}
