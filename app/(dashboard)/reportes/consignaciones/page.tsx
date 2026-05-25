import { getConsignmentReportData } from "@/app/actions/reportes";
import { getActiveBranch } from "@/app/actions/auth";
import ConsignacionesReportClient from "./ConsignacionesReportClient";

export default async function ConsignacionesReportPage() {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - 30);

  const branch = await getActiveBranch();
  if (!branch) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', backgroundColor: '#fee2e2', borderRadius: '12px', color: '#991b1b', border: '1px solid #f87171', margin: '2rem auto', maxWidth: '600px' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>SUCURSAL NO VÁLIDA</h2>
        <p>No se pudo determinar la sucursal activa. Por favor, selecciona una sucursal o vuelve a iniciar sesión.</p>
      </div>
    );
  }

  const initialBranchId = branch.id === 'GLOBAL' ? 'ALL' : branch.id;

  const data = await getConsignmentReportData(startDate, endDate, initialBranchId, 'ALL');
  const safeData = JSON.parse(JSON.stringify(data));

  return <ConsignacionesReportClient initialData={safeData} initialBranchId={initialBranchId} />;
}
