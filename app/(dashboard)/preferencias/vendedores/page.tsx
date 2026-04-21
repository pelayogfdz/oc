import { getUsersHierarchy } from "@/app/actions/commissions";
import CommissionTabs from "./CommissionTabs";

export default async function Page() {
  const users = await getUsersHierarchy();

  return (
    <div className="p-2 sm:p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Vendedores y Comisiones</h1>
        <p className="text-[var(--pulpos-text-muted)] mt-1">
          Configura cuotas, métricas monetarias y jerarquías organizacionales del equipo de ventas.
        </p>
      </div>

      <CommissionTabs initialUsers={users} />
    </div>
  );
}
