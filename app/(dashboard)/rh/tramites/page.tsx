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

  return <TramitesClient requests={requests} />;
}
