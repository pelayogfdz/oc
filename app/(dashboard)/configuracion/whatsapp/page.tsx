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

  if (process.env.WHATSAPP_BRANCH_ID && branch.id !== process.env.WHATSAPP_BRANCH_ID) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold', marginBottom: '1rem' }}>Configuracion de WhatsApp</h1>
        <div className="card" style={{ maxWidth: '600px', margin: '0 auto', padding: '3rem 2rem' }}>
          <div style={{ color: '#b91c1c', backgroundColor: '#fef2f2', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', border: '1px solid #fee2e2', fontWeight: 'bold' }}>
            Acceso Restringido
          </div>
          <p style={{ color: 'var(--pulpos-text-muted)', marginBottom: '1.5rem' }}>
            El módulo de WhatsApp no está habilitado para la sucursal <strong>{branch.name}</strong>.
          </p>
          <p style={{ color: 'var(--pulpos-text-muted)' }}>
            Si requiere activar esta integración, por favor póngase en contacto con el administrador del sistema.
          </p>
        </div>
      </div>
    );
  }

  const branchId = branch.id;

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
