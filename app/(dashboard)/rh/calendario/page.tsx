import { prisma } from "@/lib/prisma";
import { getActiveBranch, getActiveUser } from "@/app/actions/auth";
import { redirect } from "next/navigation";
import CalendarClient from "./CalendarClient";

export default async function RHCalendarPage() {
  const branch = await getActiveBranch();
  const user = await getActiveUser();

  if (!user || (user.role !== 'ADMIN' && user.role !== 'MANAGER' && user.commissionRole !== 'COORDINADOR')) {
    redirect('/'); // Only HR/Admins
  }

  // Handle "GLOBAL" branch gracefully
  const branchFilter = branch.id === 'GLOBAL' ? {} : { branchId: branch.id };

  // Get active users for the branch to assign incidents
  const employees = await prisma.user.findMany({
    where: {
      ...branchFilter,
      NOT: {
        email: {
          startsWith: 'inactivo_'
        }
      }
    },
    select: {
      id: true,
      name: true,
      role: true
    },
    orderBy: { name: 'asc' }
  });

  // Get all LeaveRequests (Incidents, Vacations, Absences) for these employees
  const incidents = await prisma.leaveRequest.findMany({
    where: {
      user: branchFilter
    },
    include: {
      user: {
        select: { name: true }
      }
    },
    orderBy: { startDate: 'asc' }
  });

  return (
    <CalendarClient employees={employees} initialIncidents={incidents} />
  );
}
