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
    const rawPermissions = (user as any).customRole?.permissions || user.permissions;
    if (rawPermissions) {
      try {
        const parsed = JSON.parse(rawPermissions);
        const tempPermissions: Record<string, boolean> = {};
        if (Array.isArray(parsed)) {
          parsed.forEach((p: string) => tempPermissions[p] = true);
        } else {
          Object.keys(parsed).forEach((k) => { if (parsed[k]) tempPermissions[k] = true; });
        }
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
