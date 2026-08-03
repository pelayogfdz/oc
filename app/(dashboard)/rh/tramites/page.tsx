import { cookies } from "next/headers";
import { decrypt } from "@/lib/session";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import TramitesClient from "./TramitesClient";

export default async function TramitesPage() {
  const sessionCookie = (await cookies()).get('session')?.value;
  const session = await decrypt(sessionCookie);
  
  if (!session?.userId) {
    redirect("/login");
  }

  // Admin/RH view
  if (session.role !== "ADMIN" && session.role !== "MANAGER") {
    return <div>No tienes permisos para ver esta sección.</div>;
  }

  const requests = await prisma.leaveRequest.findMany({
    include: {
      user: true
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  const users = await prisma.user.findMany({
    include: {
      leaveRequests: true
    },
    orderBy: {
      name: 'asc'
    }
  });

  const tenant = await prisma.tenant.findUnique({
    where: { id: session.tenantId || undefined },
    select: { timezone: true }
  });
  const timezone = tenant?.timezone || 'America/Mexico_City';

  // Serialize to prevent RSC/Client components Date object transfer errors
  const serializedRequests = requests.map(req => ({
    id: req.id,
    userId: req.userId,
    type: req.type,
    startDate: req.startDate.toISOString(),
    endDate: req.endDate.toISOString(),
    status: req.status,
    notes: req.notes || '',
    createdAt: req.createdAt.toISOString(),
    user: req.user ? {
      id: req.user.id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
      hireDate: req.user.hireDate ? req.user.hireDate.toISOString() : null,
      vacationStartDate: req.user.vacationStartDate ? req.user.vacationStartDate.toISOString() : null,
      initialVacationDays: req.user.initialVacationDays
    } : null
  }));

  const serializedUsers = users.map(user => ({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    hireDate: user.hireDate ? user.hireDate.toISOString() : null,
    vacationStartDate: user.vacationStartDate ? user.vacationStartDate.toISOString() : null,
    initialVacationDays: user.initialVacationDays,
    leaveRequests: user.leaveRequests.map((req: any) => ({
      id: req.id,
      userId: req.userId,
      type: req.type,
      startDate: req.startDate.toISOString(),
      endDate: req.endDate.toISOString(),
      status: req.status,
      notes: req.notes || '',
      createdAt: req.createdAt.toISOString(),
    }))
  }));

  return <TramitesClient requests={serializedRequests} users={serializedUsers} timezone={timezone} />;
}
