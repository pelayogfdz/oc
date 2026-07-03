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
      leaveRequests: true,
      hrLocations: true,
      branch: {
        include: {
          hrLocation: true
        }
      }
    }
  });


  if (!user) {
    redirect("/login");
  }

  const getLawDaysForYear = (year: number): number => {
    if (year < 1) return 0;
    if (year === 1) return 12;
    if (year === 2) return 14;
    if (year === 3) return 16;
    if (year === 4) return 18;
    if (year === 5) return 20;
    if (year >= 6 && year <= 10) return 22;
    if (year >= 11 && year <= 15) return 24;
    if (year >= 16 && year <= 20) return 26;
    if (year >= 21 && year <= 25) return 28;
    if (year >= 26 && year <= 30) return 30;
    if (year >= 31 && year <= 35) return 32;
    return 32 + Math.floor((year - 35) / 5) * 2;
  };

  const calculateAccruedVacationDays = (hireDate: Date | null, vacationStartDate: Date | null): number => {
    if (!hireDate) return 0;
    const now = new Date();
    let totalAccrued = 0;

    let anniversaryYear = 1;
    while (true) {
      const anniversaryDate = new Date(hireDate);
      anniversaryDate.setFullYear(hireDate.getFullYear() + anniversaryYear);

      if (anniversaryDate > now) {
        break;
      }

      // Only count this anniversary if it happens AFTER the vacationStartDate baseline
      if (!vacationStartDate || anniversaryDate > vacationStartDate) {
        totalAccrued += getLawDaysForYear(anniversaryYear);
      }

      anniversaryYear++;
    }

    return totalAccrued;
  };

  const lawVacationDays = calculateAccruedVacationDays(user.hireDate, user.vacationStartDate);
  const totalVacationDays = (user.initialVacationDays || 0) + lawVacationDays;
  const usedVacationDays = user.leaveRequests
    .filter(req => req.status === 'APPROVED' && req.type === 'VACATION')
    .reduce((acc, req) => {
      const diffTime = Math.abs(req.endDate.getTime() - req.startDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; 
      return acc + diffDays;
    }, 0);

  const tenant = await prisma.tenant.findUnique({
    where: { id: user.tenantId || undefined },
    select: { timezone: true }
  });
  const timezone = tenant?.timezone || 'America/Mexico_City';

  const availableVacationDays = Math.max(0, totalVacationDays - usedVacationDays);

  return <PortalEmpleadoClient 
    user={user} 
    timezone={timezone}
    totalVacationDays={totalVacationDays}
    usedVacationDays={usedVacationDays}
    availableVacationDays={availableVacationDays}
  />;
}
