import { prisma } from "@/lib/prisma";
import { getActiveUser, getActiveBranch } from "@/app/actions/auth";
import Link from "next/link";
import { notFound } from "next/navigation";
import ChatInterface from "./ChatInterface";
import DeleteProspectButton from "./DeleteProspectButton";

export default async function ProspectChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const branch = await getActiveBranch();
  const user = await getActiveUser();
  if (!user) return null;

  const prospect = await prisma.prospect.findFirst({
    where: branch.id === 'GLOBAL' ? { id: id } : { id: id, branchId: branch.id },
    include: {
      messages: {
        orderBy: { timestamp: 'asc' }
      }
    }
  });

  if (!prospect) return notFound();

  // Basic security: if they are VENDEDOR, ensure it is assigned to them.
  if (!user.isSuperAdmin && user.commissionRole === 'VENDEDOR' && prospect.assignedUserId !== user.id) {
    return (
      <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
        <h2 style={{ color: '#ef4444' }}>Acceso Denegado</h2>
        <p>No tienes permiso para ver este prospecto porque está asignado a otro vendedor.</p>
        <Link href="/ventas/prospeccion" className="btn-primary" style={{ marginTop: '1rem', display: 'inline-block' }}>Volver</Link>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', paddingBottom: '1rem', borderBottom: '1px solid var(--pulpos-border)' }}>
        <Link href="/ventas/prospeccion" style={{ color: 'var(--pulpos-text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          Volver
        </Link>
        <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem', fontWeight: 'bold', color: '#64748b' }}>
          {prospect.name.charAt(0).toUpperCase()}
        </div>
        <div>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: 0 }}>{prospect.name}</h1>
          <p style={{ color: 'var(--pulpos-text-muted)', margin: 0, fontSize: '0.875rem' }}>{prospect.phone}</p>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ backgroundColor: '#f1f5f9', padding: '0.25rem 0.75rem', borderRadius: '1rem', fontSize: '0.75rem', fontWeight: '600', color: '#475569' }}>
            Etapa: {prospect.funnelStage}
          </span>
          <DeleteProspectButton prospectId={prospect.id} />
        </div>
      </div>

      <div style={{ flex: 1, minHeight: 0, marginTop: '1rem', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid var(--pulpos-border)', overflow: 'hidden' }}>
        <ChatInterface prospect={prospect} />
      </div>
    </div>
  );
}
