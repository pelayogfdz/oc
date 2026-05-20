import { prisma } from "@/lib/prisma";
import WhatsAppConfigClient from "./WhatsAppConfigClient";
import { getActiveBranch } from "@/app/actions/auth";

export const dynamic = "force-dynamic";

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

  let branchId = branch.id;
  if (branchId === 'GLOBAL') {
    const firstBranch = await prisma.branch.findFirst({
      where: { tenantId: branch.tenantId, isActive: true }
    });
    if (!firstBranch) {
      return (
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold' }}>Configuracion de WhatsApp</h1>
          <p style={{ color: 'red' }}>Error: No se encontró ninguna sucursal activa para este cliente.</p>
        </div>
      );
    }
    branchId = firstBranch.id;
  }

  let session = await prisma.whatsAppSession.findUnique({
    where: { branchId }
  });

  // Tenant connected fallback:
  // If the session for the current branch is not connected, check if there is another branch
  // in the same tenant that has a connected session, and fallback to it.
  if ((!session || session.status !== 'CONNECTED') && branch.tenantId) {
    const activeSiblingSession = await prisma.whatsAppSession.findFirst({
      where: {
        status: 'CONNECTED',
        branch: {
          tenantId: branch.tenantId,
          isActive: true
        }
      }
    });
    if (activeSiblingSession) {
      session = activeSiblingSession;
    }
  }

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
