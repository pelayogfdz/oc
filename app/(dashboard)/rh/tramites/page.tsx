import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import TramitesClient from "./TramitesClient";

export default async function TramitesPage() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    redirect("/login");
  }

  // Admin/RH view
  if (session.user.role !== "ADMIN" && session.user.role !== "MANAGER") {
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
