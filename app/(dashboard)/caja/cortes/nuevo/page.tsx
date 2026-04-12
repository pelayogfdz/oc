import { getCurrentSession } from "@/app/actions/caja";
import { redirect } from "next/navigation";
import BlindCutClient from "./BlindCutClient";

export const dynamic = 'force-dynamic';

export default async function NuevoCortePage() {
  const session = await getCurrentSession();

  if (!session) {
    redirect("/caja/actual");
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>Corte de Caja en Ciego</h1>
      <p style={{ color: 'var(--pulpos-text-muted)', marginBottom: '2rem' }}>
         Ingresa el dinero físico que se encuentra en la caja. El sistema validará automáticamente los montos registrados en tus movimientos (ventas, entradas, salidas) y marcará diferencias, si existiesen.
      </p>

      <BlindCutClient sessionId={session.id} />
    </div>
  );
}
