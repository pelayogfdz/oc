import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import PortalEmpleadoClient from "./PortalEmpleadoClient";

export default async function MiPortalPage() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      attendanceLogs: {
        where: {
          timestamp: {
            gte: new Date(new Date().setHours(0, 0, 0, 0))
          }
        },
        orderBy: { timestamp: 'asc' }
      }
    }
  });

  if (!user) {
    redirect("/login");
  }

  return <PortalEmpleadoClient user={user} />;
}
