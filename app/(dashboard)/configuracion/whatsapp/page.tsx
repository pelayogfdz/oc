import { prisma } from "@/lib/prisma";
import WhatsAppConfigClient from "./WhatsAppConfigClient";
import { getActiveBranch } from "@/app/actions/auth";

export default async function WhatsAppConfigPage() {
  const branch = await getActiveBranch();
  
  let session = await prisma.whatsAppSession.findFirst();

  // Si no hay sesión, la mostramos como desconectada por defecto
  if (!session) {
    session = {
      id: "new",
      branchId: branch.id,
      status: "DISCONNECTED",
      sessionData: null,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold' }}>Configuración de WhatsApp</h1>
        <p style={{ color: 'var(--pulpos-text-muted)' }}>Conecta tu número global de WhatsApp escaneando el código QR</p>
      </div>

      <div className="card" style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center', padding: '3rem 2rem' }}>
        <WhatsAppConfigClient initialSession={session} />
      </div>
    </div>
  );
}
