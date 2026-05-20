import { prisma } from "@/lib/prisma";
import WhatsAppConfigClient from "./WhatsAppConfigClient";
import { getActiveBranch } from "@/app/actions/auth";

export default async function WhatsAppConfigPage() {
  const branch = await getActiveBranch();
  
  if (!branch) {
    return (
      <div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold' }}>Configuracion de WhatsApp</h1>
        <p style={{ color: 'red' }}>Error: No se pudo determinar la sucursal activa.</p>
      </div>
    );
  }

  const branchId = process.env.WHATSAPP_BRANCH_ID || branch.id;

  let session = await prisma.whatsAppSession.findUnique({
    where: { branchId }
  });

  // Si no hay sesion, la mostramos como desconectada por defecto
  if (!session) {
    session = {
      id: "new",
      branchId: branchId,
      status: "DISCONNECTED",
      sessionData: null,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold' }}>Configuracion de WhatsApp</h1>
        <p style={{ color: 'var(--pulpos-text-muted)' }}>Conecta tu numero global de WhatsApp escaneando el codigo QR</p>
      </div>

      <div className="card" style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center', padding: '3rem 2rem' }}>
        <WhatsAppConfigClient initialSession={session} />
      </div>
    </div>
  );
}
