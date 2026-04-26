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

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
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
