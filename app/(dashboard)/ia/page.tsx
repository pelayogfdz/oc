import { getActiveUser, getActiveBranch } from "@/app/actions/auth";
import { redirect } from "next/navigation";
import AIClient from "./AIClient";

export const dynamic = 'force-dynamic';

export default async function AIPage() {
  const branch = await getActiveBranch();
  const user = await getActiveUser();

  if (!user) {
    redirect('/login');
  }

  // En roles estrictos como CAJERO quizás queramos bloquear esto.
  // Pero vamos a permitirlo para ADMIN y MANAGER por ahora, o todos si así se desea.
  if (user.role === 'CAJERO') {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>No Autorizado</h2>
        <p>No tienes los permisos necesarios para utilizar el módulo de Inteligencia Artificial.</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}>
      <AIClient user={user} branch={branch} />
    </div>
  );
}
