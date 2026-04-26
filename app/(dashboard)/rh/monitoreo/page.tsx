import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import MonitoreoClient from "./MonitoreoClient";

export default async function MonitoreoPage() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    redirect("/login");
  }

  // En un caso real, validar si tiene permisos de ADMIN o de RH
  if (session.user.role !== "ADMIN" && session.user.role !== "MANAGER") {
    return <div>No tienes permisos para ver esta sección.</div>;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const users = await prisma.user.findMany({
    where: {
      tenantId: session.user.tenantId, // Assuming multi-tenant
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

  return <MonitoreoClient users={users} />;
}
