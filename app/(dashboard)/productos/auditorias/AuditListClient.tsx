'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createAudit } from '@/app/actions/audit';
import { ClipboardList, Plus, ChevronRight, Calendar } from 'lucide-react';
import Link from 'next/link';

export default function AuditListClient({ initialAudits }: { initialAudits: any[] }) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [auditName, setAuditName] = useState('');

  const handleCreate = async () => {
    if (!auditName.trim()) return;
    
    setIsPending(true);
    try {
      const audit = await createAudit(auditName);
      router.push(`/productos/auditorias/${audit.id}`);
    } catch (e: any) {
      alert(e.message);
      setIsPending(false);
    }
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 'bold', margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <ClipboardList size={28} color="#10b981" />
            Auditorías de Inventario Físico
          </h1>
          <p style={{ color: 'var(--pulpos-text-muted)', margin: 0 }}>
            Realiza conteos cíclicos o ciegos de 3 fases para reajustar tu stock de forma segura.
          </p>
        </div>

        <button 
          onClick={() => setIsModalOpen(true)} 
          disabled={isPending}
          className="btn-primary" 
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: isPending ? 0.7 : 1 }}
        >
          <Plus size={20} />
          {isPending ? 'Iniciando...' : 'Nueva Auditoría'}
        </button>
      </div>

      <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid var(--pulpos-border)', overflow: 'hidden' }}>
        {initialAudits.length === 0 ? (
          <div style={{ padding: '4rem 2rem', textAlign: 'center', color: 'var(--pulpos-text-muted)' }}>
            <div style={{ width: '80px', height: '80px', backgroundColor: '#f1f5f9', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem auto' }}>
              <ClipboardList size={40} color="#94a3b8" />
            </div>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem', color: '#1e293b' }}>No hay auditorías registradas</h3>
            <p>Comienza tu primer inventario físico presionando el botón "Nueva Auditoría".</p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid var(--pulpos-border)' }}>
                <th style={{ padding: '1rem', fontWeight: 'bold', color: '#64748b' }}>Nombre</th>
                <th style={{ padding: '1rem', fontWeight: 'bold', color: '#64748b' }}>Sucursal</th>
                <th style={{ padding: '1rem', fontWeight: 'bold', color: '#64748b' }}>Estado y Fase</th>
                <th style={{ padding: '1rem', fontWeight: 'bold', color: '#64748b' }}>Fecha</th>
                <th style={{ padding: '1rem', fontWeight: 'bold', color: '#64748b' }}>Productos Contados</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {initialAudits.map(audit => (
                <tr key={audit.id} style={{ borderBottom: '1px solid var(--pulpos-border)' }}>
                  <td style={{ padding: '1rem', fontWeight: 'bold', color: '#0f172a' }}>{audit.name}</td>
                  <td style={{ padding: '1rem' }}>
                    <span style={{ backgroundColor: '#f1f5f9', padding: '0.2rem 0.5rem', borderRadius: '4px', border: '1px solid #e2e8f0', fontSize: '0.85rem', fontWeight: 'bold', color: '#475569' }}>
                      {audit.branch?.name || 'Central'}
                    </span>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <span style={{ 
                      padding: '0.25rem 0.75rem', 
                      borderRadius: '16px', 
                      fontSize: '0.8rem', 
                      fontWeight: 'bold',
                      backgroundColor: audit.status === 'COMPLETED' ? '#dcfce7' : '#eff6ff',
                      color: audit.status === 'COMPLETED' ? '#166534' : '#1d4ed8'
                    }}>
                      {audit.status === 'COMPLETED' ? 'Finalizada' : 
                       audit.status === 'COUNT_1' ? 'Fase 1: Conteo Total' : 
                       audit.status === 'COUNT_2' ? 'Fase 2: Diferencias' : 'Fase 3: Aclaraciones'}
                    </span>
                  </td>
                  <td style={{ padding: '1rem', color: 'var(--pulpos-text-muted)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Calendar size={16} />
                      {new Date(audit.createdAt).toLocaleDateString()}
                    </div>
                  </td>
                  <td style={{ padding: '1rem', color: 'var(--pulpos-text-muted)', fontWeight: 'bold' }}>
                    {audit._count.items}
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'right' }}>
                    <Link href={`/productos/auditorias/${audit.id}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: '#3b82f6', fontWeight: 'bold', textDecoration: 'none' }}>
                      {audit.status === 'COMPLETED' ? 'Ver Bitácora' : 'Continuar Conteo'} <ChevronRight size={18} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      
      {/* Create Audit Modal */}
      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '8px', width: '450px', maxWidth: '90%', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ClipboardList color="#10b981" />
              Nueva Auditoría
            </h2>
            
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontWeight: '500', marginBottom: '0.5rem', color: '#475569' }}>
                Nombre de la Auditoría Físico:
              </label>
              <input 
                type="text" 
                autoFocus
                value={auditName}
                onChange={e => setAuditName(e.target.value)}
                placeholder="Ej. Conteo Mensual Abril"
                style={{ width: '100%', padding: '0.75rem', fontSize: '1rem', borderRadius: '4px', border: '1px solid var(--pulpos-border)', outline: 'none' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
              <button 
                onClick={() => setIsModalOpen(false)} 
                style={{ flex: 1, padding: '0.75rem', border: '1px solid var(--pulpos-border)', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', background: 'white' }}
              >
                Cancelar
              </button>
              <button 
                onClick={handleCreate} 
                disabled={isPending || !auditName.trim()}
                className="btn-primary" 
                style={{ flex: 1, padding: '0.75rem', fontSize: '1rem', opacity: isPending || !auditName.trim() ? 0.5 : 1 }}
              >
                {isPending ? 'Iniciando...' : 'Comenzar Conteo'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
