import { cookies } from "next/headers";
import { decrypt } from "@/lib/session";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import PortalEmpleadoClient from "./PortalEmpleadoClient";

export default async function MiPortalPage() {
  const sessionCookie = (await cookies()).get('session')?.value;
  const session = await decrypt(sessionCookie);
  
  if (!session?.userId) {
    redirect("/login");
  }

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: {
      attendanceLogs: {
        where: {
          timestamp: {
            gte: sevenDaysAgo
          }
        },
        orderBy: { timestamp: 'desc' }
      },
      leaveRequests: true
    }
  });

  if (!user) {
    redirect("/login");
  }

  const calculateVacationDays = (hireDate: Date | null) => {
    if (!hireDate) return 0;
    const now = new Date();
    const years = now.getFullYear() - hireDate.getFullYear();
    if (years < 1) return 0;
    if (years === 1) return 12;
    if (years === 2) return 14;
    if (years === 3) return 16;
    if (years === 4) return 18;
    if (years === 5) return 20;
    if (years > 5) {
      return 20 + Math.floor((years - 5) / 5) * 2;
    }
    return 12; // Fallback
  }

  const totalVacationDays = calculateVacationDays(user.hireDate);
  const usedVacationDays = user.leaveRequests
    .filter(req => req.status === 'APPROVED' && req.type === 'VACATION')
    .reduce((acc, req) => {
      const diffTime = Math.abs(req.endDate.getTime() - req.startDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; 
      return acc + diffDays;
    }, 0);

  const availableVacationDays = Math.max(0, totalVacationDays - usedVacationDays);

  return <PortalEmpleadoClient 
    user={user} 
    totalVacationDays={totalVacationDays}
    usedVacationDays={usedVacationDays}
    availableVacationDays={availableVacationDays}
  />;
}
