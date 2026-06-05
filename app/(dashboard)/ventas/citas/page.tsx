import { getActiveBranch } from "@/app/actions/auth";
import { getAppointments, getAppointmentResources } from "@/app/actions/citas";
import CitasClient from "./CitasClient";

export const dynamic = "force-dynamic";

export default async function CitasPage() {
  const branch = await getActiveBranch();
  if (!branch) return null;

  const initialBranchId = branch.id === 'GLOBAL' ? 'ALL' : branch.id;

  // Load initial data
  const appointments = await getAppointments(initialBranchId);
  const resources = await getAppointmentResources();

  // Deep clone/serialize dates to avoid next serialization issues
  const serializedAppointments = JSON.parse(JSON.stringify(appointments));
  const serializedResources = JSON.parse(JSON.stringify(resources));

  return (
    <CitasClient 
      initialAppointments={serializedAppointments}
      resources={serializedResources}
      initialBranchId={initialBranchId}
    />
  );
}
