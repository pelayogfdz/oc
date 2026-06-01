import { prisma } from "@/lib/prisma";

export default async function DashboardMatrix({ activeBranch }: { activeBranch: any }) {
  if (!activeBranch || !activeBranch.tenantId) return null;

  const branches = await prisma.branch.findMany({
    where: { 
      tenantId: activeBranch.tenantId,
      isActive: true
    },
    orderBy: { name: 'asc' }
  });

  const branchIds = branches.map(b => b.id);

  const transfers = await prisma.transfer.findMany({
    where: {
      OR: [
        { branchId: { in: branchIds } },
        { toBranchId: { in: branchIds } }
      ]
    },
    select: {
      id: true,
      status: true,
      branchId: true,
      toBranchId: true
    }
  });

  const purchaseReqs = await prisma.purchaseRequest.findMany({
    where: { 
      status: 'PENDING',
      branchId: { in: branchIds }
    },
    select: {
      id: true,
      branchId: true
    }
  });

  const stats = branches.map(b => {
    // Only count transfers where this branch is INVOLVED (either origin or destination)
    const bTransfers = transfers.filter(t => t.branchId === b.id || t.toBranchId === b.id);
    
    return {
      id: b.id,
      name: b.name,
      requested: bTransfers.filter(t => t.status === 'REQUESTED').length,
      created: bTransfers.filter(t => t.status === 'CREATED').length,
      dispatched: bTransfers.filter(t => t.status === 'DISPATCHED' || t.status === 'IN_TRANSIT').length,
      received: bTransfers.filter(t => t.status === 'RECEIVED' || t.status === 'COMPLETED').length,
      faltantes: purchaseReqs.filter(pr => pr.branchId === b.id).length
    };
  });

  // Calculate totals
  const totals = {
    requested: stats.reduce((acc, s) => acc + s.requested, 0),
    created: stats.reduce((acc, s) => acc + s.created, 0),
    dispatched: stats.reduce((acc, s) => acc + s.dispatched, 0),
    received: stats.reduce((acc, s) => acc + s.received, 0),
    faltantes: stats.reduce((acc, s) => acc + s.faltantes, 0)
  };

  // Helper for heatmap colors
  const getColor = (val: number, max: number, type: 'bad' | 'good' | 'neutral' = 'neutral') => {
    if (val === 0) return { bg: 'transparent', text: '#94a3b8' }; // Gray/Empty
    if (val < 3) return { bg: '#fef3c7', text: '#d97706' }; // Pastel yellow
    if (val < 6) return { bg: '#ffedd5', text: '#ea580c' }; // Pastel orange
    return { bg: '#fee2e2', text: '#dc2626' }; // Pastel red
  };

  return (
    <div className="card" style={{ padding: '0', overflowX: 'auto', marginBottom: '2rem' }}>
      <table className="responsive-table" style={{ minWidth: '800px', width: '100%', borderCollapse: 'collapse', textAlign: 'center' }}>
        <thead>
          <tr style={{ backgroundColor: '#1e293b', color: 'white' }}>
            <th style={{ padding: '0.75rem', borderRight: '1px solid #334155' }}></th>
            <th colSpan={4} style={{ padding: '0.75rem', borderRight: '1px solid #334155' }}>TRASPASOS</th>
            <th colSpan={1} style={{ padding: '0.75rem' }}>COMPRAS</th>
          </tr>
          <tr style={{ backgroundColor: '#f1f5f9', color: '#475569', fontSize: '0.85rem' }}>
            <th style={{ padding: '0.75rem', borderRight: '1px solid #cbd5e1', textAlign: 'left' }}>SUCURSAL</th>
            <th style={{ padding: '0.75rem', borderRight: '1px solid #cbd5e1' }}>SOLICITUDES</th>
            <th style={{ padding: '0.75rem', borderRight: '1px solid #cbd5e1' }}>APROBACIONES</th>
            <th style={{ padding: '0.75rem', borderRight: '1px solid #cbd5e1' }}>SURTIDOS</th>
            <th style={{ padding: '0.75rem', borderRight: '1px solid #cbd5e1' }}>RECIBIDOS</th>
            <th style={{ padding: '0.75rem' }}>FALTANTES</th>
          </tr>
        </thead>
        <tbody>
          {stats.map((s, idx) => {
            const reqColor = getColor(s.requested, 10);
            const creColor = getColor(s.created, 10);
            const disColor = getColor(s.dispatched, 10);
            const falColor = getColor(s.faltantes, 10);
            return (
              <tr key={s.id} style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                <td style={{ 
                   padding: '0.75rem', 
                   borderRight: '1px solid #e2e8f0', 
                   fontWeight: '600', 
                   textAlign: 'left',
                   color: '#334155'
                }}>
                  {s.name.toUpperCase()}
                </td>
                <td style={{ padding: '0.75rem', borderRight: '1px solid #e2e8f0', backgroundColor: reqColor.bg, color: reqColor.text, fontWeight: s.requested > 0 ? 'bold' : 'normal' }}>
                  {s.requested}
                </td>
                <td style={{ padding: '0.75rem', borderRight: '1px solid #e2e8f0', backgroundColor: creColor.bg, color: creColor.text, fontWeight: s.created > 0 ? 'bold' : 'normal' }}>
                  {s.created}
                </td>
                <td style={{ padding: '0.75rem', borderRight: '1px solid #e2e8f0', backgroundColor: disColor.bg, color: disColor.text, fontWeight: s.dispatched > 0 ? 'bold' : 'normal' }}>
                  {s.dispatched}
                </td>
                <td style={{ padding: '0.75rem', borderRight: '1px solid #e2e8f0', backgroundColor: s.received === 0 ? 'transparent' : '#dbeafe', color: s.received === 0 ? '#94a3b8' : '#2563eb', fontWeight: s.received > 0 ? 'bold' : 'normal' }}>
                  {s.received}
                </td>
                <td style={{ padding: '0.75rem', backgroundColor: falColor.bg, color: falColor.text, fontWeight: s.faltantes > 0 ? 'bold' : 'normal' }}>
                  {s.faltantes}
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr style={{ backgroundColor: '#1e293b', color: 'white', fontWeight: 'bold' }}>
            <td style={{ padding: '0.75rem', textAlign: 'left', borderRight: '1px solid #334155' }}>TOTALES</td>
            <td style={{ padding: '0.75rem', borderRight: '1px solid #334155' }}>{totals.requested}</td>
            <td style={{ padding: '0.75rem', borderRight: '1px solid #334155' }}>{totals.created}</td>
            <td style={{ padding: '0.75rem', borderRight: '1px solid #334155' }}>{totals.dispatched}</td>
            <td style={{ padding: '0.75rem', borderRight: '1px solid #334155' }}>{totals.received}</td>
            <td style={{ padding: '0.75rem' }}>{totals.faltantes}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
