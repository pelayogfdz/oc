import { prisma } from "@/lib/prisma";

export default async function DashboardMatrix({ activeBranch }: { activeBranch: any }) {
  const branches = await prisma.branch.findMany({
    orderBy: { name: 'asc' }
  });

  const transfers = await prisma.transfer.findMany({
    select: {
      id: true,
      status: true,
      branchId: true,
      toBranchId: true
    }
  });

  const purchaseReqs = await prisma.purchaseRequest.findMany({
    where: { status: 'PENDING' },
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
    if (val === 0) return '#22c55e'; // Green
    if (val < 3) return '#eab308'; // Yellow
    if (val < 6) return '#f97316'; // Orange
    return '#ef4444'; // Red
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
          <tr style={{ backgroundColor: '#334155', color: '#cbd5e1', fontSize: '0.85rem' }}>
            <th style={{ padding: '0.75rem', borderRight: '1px solid #475569', textAlign: 'left' }}>SUCURSAL</th>
            <th style={{ padding: '0.75rem', borderRight: '1px solid #475569' }}>SOLICITUDES</th>
            <th style={{ padding: '0.75rem', borderRight: '1px solid #475569' }}>APROBACIONES</th>
            <th style={{ padding: '0.75rem', borderRight: '1px solid #475569' }}>SURTIDOS</th>
            <th style={{ padding: '0.75rem', borderRight: '1px solid #475569' }}>RECIBIDOS</th>
            <th style={{ padding: '0.75rem' }}>FALTANTES</th>
          </tr>
        </thead>
        <tbody>
          {stats.map((s, idx) => (
            <tr key={s.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
              <td style={{ 
                 padding: '0.75rem', 
                 borderRight: '1px solid #e2e8f0', 
                 fontWeight: 'bold', 
                 textAlign: 'left',
                 backgroundColor: ['#8b5cf6', '#d97706', '#eab308', '#ef4444', '#06b6d4', '#f97316', '#22c55e', '#3b82f6', '#d946ef'][idx % 9],
                 color: (['#eab308', '#22c55e'].includes(['#8b5cf6', '#d97706', '#eab308', '#ef4444', '#06b6d4', '#f97316', '#22c55e', '#3b82f6', '#d946ef'][idx % 9])) ? 'black' : 'white'
              }}>
                {s.name.toUpperCase()}
              </td>
              <td style={{ padding: '0.75rem', borderRight: '1px solid white', backgroundColor: getColor(s.requested, 10), color: 'white', fontWeight: 'bold' }}>
                {s.requested}
              </td>
              <td style={{ padding: '0.75rem', borderRight: '1px solid white', backgroundColor: getColor(s.created, 10), color: 'white', fontWeight: 'bold' }}>
                {s.created}
              </td>
              <td style={{ padding: '0.75rem', borderRight: '1px solid white', backgroundColor: getColor(s.dispatched, 10), color: 'white', fontWeight: 'bold' }}>
                {s.dispatched}
              </td>
              <td style={{ padding: '0.75rem', borderRight: '1px solid white', backgroundColor: s.received === 0 ? '#f1f5f9' : '#3b82f6', color: s.received === 0 ? '#94a3b8' : 'white', fontWeight: 'bold' }}>
                {s.received}
              </td>
              <td style={{ padding: '0.75rem', backgroundColor: getColor(s.faltantes, 10), color: 'white', fontWeight: 'bold' }}>
                {s.faltantes}
              </td>
            </tr>
          ))}
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
