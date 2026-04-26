import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import ReportesClient from "./ReportesClient";

export default async function ReportesPage() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    redirect("/login");
  }

  // Admin/RH view
  if (session.user.role !== "ADMIN" && session.user.role !== "MANAGER") {
    return <div>No tienes permisos para ver esta sección.</div>;
  }

  return <ReportesClient />;
}
