import { prisma } from "@/lib/prisma";
import WhatsAppConfigClient from "./WhatsAppConfigClient";
import { getActiveUser, getActiveBranch } from "@/app/actions/auth";
import { hasPermission, hasNodeAccess } from "@/app/config/permissions";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function WhatsAppConfigPage() {
  const branch = await getActiveBranch();
  const user = await getActiveUser();
  
  if (!user || !branch) return null;

  // Securing page access
  const isSuperAdmin = user.email?.toLowerCase() === 'pelayogfdz@gmail.com';
  let userPermissions: Record<string, boolean> = {};
  const rolePermissions = (user as any).customRole?.permissions;
  const userPermissionsRaw = user.permissions;
  const mergedList: string[] = [];

  if (rolePermissions) {
    try {
      const parsed = JSON.parse(rolePermissions);
      if (Array.isArray(parsed)) mergedList.push(...parsed);
      else Object.keys(parsed).forEach((k) => { if (parsed[k]) mergedList.push(k); });
    } catch (e) {}
  }

  if (userPermissionsRaw) {
    try {
      const parsed = JSON.parse(userPermissionsRaw);
      if (Array.isArray(parsed)) mergedList.push(...parsed);
      else Object.keys(parsed).forEach((k) => { if (parsed[k]) mergedList.push(k); });
    } catch (e) {}
  }

  if (mergedList.length > 0) {
    const tempPermissions: Record<string, boolean> = {};
    mergedList.forEach((p: string) => tempPermissions[p] = true);

    Object.keys(tempPermissions).forEach(p => {
      if (hasPermission(tempPermissions, p)) {
        userPermissions[p] = true;
      }
    });
  }

  const hasAccess = hasNodeAccess(userPermissions, 'whatsapp_config', isSuperAdmin, user.role);
  if (!hasAccess) {
    redirect('/');
  }

  const firstBranch = await prisma.branch.findFirst({
    where: { tenantId: branch.tenantId, isActive: true },
    orderBy: { createdAt: 'asc' }
  });

  if (!firstBranch) {
    return (
      <div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold' }}>Configuracion de WhatsApp</h1>
        <p style={{ color: 'red' }}>Error: No se encontró ninguna sucursal activa para este cliente.</p>
      </div>
    );
  }

  const branchId = firstBranch.id;

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
        <p style={{ color: 'var(--caanma-text-muted)' }}>Conecta tu numero global de WhatsApp escaneando el codigo QR</p>
      </div>

      <div className="card" style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center', padding: '3rem 2rem' }}>
        <WhatsAppConfigClient initialSession={session} />
      </div>
    </div>
  );
}
