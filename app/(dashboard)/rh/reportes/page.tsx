import { cookies } from "next/headers";
import { decrypt } from "@/lib/session";
import { redirect } from "next/navigation";
import ReportesClient from "./ReportesClient";

export default async function ReportesPage() {
  const sessionCookie = (await cookies()).get('session')?.value;
  const session = await decrypt(sessionCookie);
  
  if (!session?.userId) {
    redirect("/login");
  }

  // Admin/RH view
  if (session.role !== "ADMIN" && session.role !== "MANAGER") {
    return <div>No tienes permisos para ver esta sección.</div>;
  }

  return <ReportesClient />;
}
