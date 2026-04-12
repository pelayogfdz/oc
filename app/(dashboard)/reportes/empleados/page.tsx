import { getActiveBranch } from "@/app/actions/auth";
import { prisma } from "@/lib/prisma";
import { BarChart3, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default async function Page() {
  const branch = await getActiveBranch();
  
  // Fake or dynamic query based on module
  const sales = await prisma.sale.findMany({ 
    where: { branchId: branch.id, status: "COMPLETED" }, 
    include: { user: true } 
  });

  // Calculate revenue per employee
  const employeeStats: Record<string, { name: string, total: number, count: number }> = {};
  for (const s of sales) {
    if (!employeeStats[s.userId]) {
      employeeStats[s.userId] = { name: s.user.name, total: 0, count: 0 };
    }
    employeeStats[s.userId].total += s.total;
    employeeStats[s.userId].count += 1;
  }

  const leaderboard = Object.values(employeeStats).sort((a, b) => b.total - a.total);
  const totalRevenue = leaderboard.reduce((acc, emp) => acc + emp.total, 0);

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <Link href="/reportes" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'var(--pulpos-primary)', textDecoration: 'none', marginBottom: '1.5rem', fontWeight: 'bold' }}>
        <ArrowLeft size={18} /> Volver al Hub
      </Link>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
        <BarChart3 size={32} color="var(--pulpos-primary)" />
        <h1 style={{ fontSize: '2rem', fontWeight: 'bold' }}>Rendimiento por Cajero</h1>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead style={{ backgroundColor: '#f8fafc' }}>
            <tr>
              <th style={{ padding: '1rem', borderBottom: '1px solid var(--pulpos-border)' }}>Ranking</th>
              <th style={{ padding: '1rem', borderBottom: '1px solid var(--pulpos-border)' }}>Nombre de Usuario</th>
              <th style={{ padding: '1rem', borderBottom: '1px solid var(--pulpos-border)' }}>Tickets (#)</th>
              <th style={{ padding: '1rem', borderBottom: '1px solid var(--pulpos-border)' }}>Ingreso Total</th>
              <th style={{ padding: '1rem', borderBottom: '1px solid var(--pulpos-border)' }}>% del Ingreso</th>
            </tr>
          </thead>
          <tbody>
            {leaderboard.map((emp, i) => (
              <tr key={emp.name} style={{ borderBottom: '1px solid var(--pulpos-border)' }}>
                <td style={{ padding: '1rem', fontWeight: 'bold', color: i === 0 ? '#f59e0b' : 'inherit' }}>#{i + 1}</td>
                <td style={{ padding: '1rem', fontWeight: '500' }}>{emp.name}</td>
                <td style={{ padding: '1rem' }}>{emp.count}</td>
                <td style={{ padding: '1rem', fontWeight: 'bold', color: '#10b981' }}>${emp.total.toFixed(2)}</td>
                <td style={{ padding: '1rem', color: 'var(--pulpos-text-muted)' }}>
                  {totalRevenue > 0 ? ((emp.total / totalRevenue) * 100).toFixed(1) : '0'}%
                </td>
              </tr>
            ))}
            {leaderboard.length === 0 && (
              <tr>
                <td colSpan={5} style={{ padding: '3rem', textAlign: 'center', color: 'var(--pulpos-text-muted)' }}>Sin datos de ventas por el momento.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
