import { cookies } from "next/headers";
import { decrypt } from "@/lib/session";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import MonitoreoClient from "./MonitoreoClient";
import { getLocalTodayRange } from "@/app/lib/timezone";

export default async function MonitoreoPage() {
  const sessionCookie = (await cookies()).get('session')?.value;
  const session = await decrypt(sessionCookie);
  
  if (!session?.userId) {
    redirect("/login");
  }

  const { getMergedUserPermissions } = await import("@/app/actions/permissions");
  const permResult = await getMergedUserPermissions();
  const userPermissions = (permResult.success && permResult.permissions) ? permResult.permissions : {};
  const isSuperAdmin = permResult.success ? permResult.isSuperAdmin : false;
  const userRole = session.role;
  
  const hasViewPermission = isSuperAdmin || userRole === "ADMIN" || !!userPermissions['rh_monitoreo'];
  if (!hasViewPermission) {
    return <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>No tienes permisos para ver esta sección.</div>;
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: session.tenantId || undefined },
    select: { timezone: true }
  });
  const timezone = tenant?.timezone || 'America/Mexico_City';

  const { startUtc: today } = getLocalTodayRange(timezone);

  const users = await prisma.user.findMany({
    where: {
      tenantId: session.tenantId,
      NOT: {
        email: {
          startsWith: 'inactivo_'
        }
      }
    },
    include: {
      branch: true,
      attendanceLogs: {
        where: {
          timestamp: {
            gte: today
          }
        },
        orderBy: { timestamp: 'asc' }
      }
    },
    orderBy: { name: 'asc' }
  });

  const branches = await prisma.branch.findMany({
    where: {
      tenantId: session.tenantId,
      isActive: true
    },
    orderBy: { name: 'asc' }
  });

  return (
    <MonitoreoClient 
      users={users} 
      branches={branches} 
      timezone={timezone} 
      userPermissions={userPermissions}
      userRole={userRole}
      isSuperAdmin={isSuperAdmin}
    />
  );
}
