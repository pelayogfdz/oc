'use client';

import { useState } from 'react';
import { Hash, Save, Play, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import { updateBranchFolioSettings, initializeRetroactiveFolios } from '@/app/actions/folios';

interface FolioConfig {
  prefix: string;
  nextNumber: number;
}

interface FoliosSettingsClientProps {
  branchName: string;
  branchPrefix: string;
  initialFolios: {
    sale?: FolioConfig;
    quote?: FolioConfig;
    purchase?: FolioConfig;
    transfer?: FolioConfig;
    consignment?: FolioConfig;
  };
}

export default function FoliosSettingsClient({ branchName, branchPrefix, initialFolios }: FoliosSettingsClientProps) {
  // Local states for Ventas
  const [salePrefix, setSalePrefix] = useState(initialFolios.sale?.prefix || branchPrefix);
  const [saleStart, setSaleStart] = useState(initialFolios.sale?.nextNumber || 1001);

  // Local states for Cotizaciones
  const [quotePrefix, setQuotePrefix] = useState(initialFolios.quote?.prefix || branchPrefix);
  const [quoteStart, setQuoteStart] = useState(initialFolios.quote?.nextNumber || 1001);

  // Local states for Compras
  const [purchasePrefix, setPurchasePrefix] = useState(initialFolios.purchase?.prefix || branchPrefix);
  const [purchaseStart, setPurchaseStart] = useState(initialFolios.purchase?.nextNumber || 1001);

  // Local states for Traspasos
  const [transferPrefix, setTransferPrefix] = useState(initialFolios.transfer?.prefix || branchPrefix);
  const [transferStart, setTransferStart] = useState(initialFolios.transfer?.nextNumber || 1001);

  // Local states for Consignaciones
  const [consignmentPrefix, setConsignmentPrefix] = useState(initialFolios.consignment?.prefix || branchPrefix);
  const [consignmentStart, setConsignmentStart] = useState(initialFolios.consignment?.nextNumber || 1001);

  const [isSaving, setIsSaving] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [migrateSuccess, setMigrateSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);
    setErrorMessage(null);

    try {
      await updateBranchFolioSettings({
        salePrefix,
        saleStart: Number(saleStart),
        quotePrefix,
        quoteStart: Number(quoteStart),
        purchasePrefix,
        purchaseStart: Number(purchaseStart),
        transferPrefix,
        transferStart: Number(transferStart),
        consignmentPrefix,
        consignmentStart: Number(consignmentStart),
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al guardar los ajustes.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleMigrate = async () => {
    if (!window.confirm('¿Estás seguro de que deseas inicializar todos los folios retroactivamente a partir del 1,001? Esto renombrará cronológicamente todas las ventas, cotizaciones, compras, traspasos y consignaciones existentes de todas las sucursales.')) {
      return;
    }

    setIsMigrating(true);
    setMigrateSuccess(false);
    setErrorMessage(null);

    try {
      await initializeRetroactiveFolios();
      setMigrateSuccess(true);
      setTimeout(() => setMigrateSuccess(false), 5000);
      alert('¡Todos los folios históricos se han inicializado correctamente a partir del 1,001!');
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al inicializar folios.');
    } finally {
      setIsMigrating(false);
    }
  };

  const modulesConfig = [
    {
      key: 'sale',
      title: 'Folios de Ventas',
      description: 'Prefijo y número para notas de venta y tickets.',
      prefix: salePrefix,
      setPrefix: setSalePrefix,
      start: saleStart,
      setStart: setSaleStart,
      preview: `${salePrefix}-${saleStart}`
    },
    {
      key: 'quote',
      title: 'Folios de Cotizaciones',
      description: 'Prefijo y número para presupuestos y cotizaciones.',
      prefix: quotePrefix,
      setPrefix: setQuotePrefix,
      start: quoteStart,
      setStart: setQuoteStart,
      preview: `${quotePrefix}-${quoteStart}`
    },
    {
      key: 'purchase',
      title: 'Folios de Compras',
      description: 'Prefijo y número para recepciones de compras a proveedores.',
      prefix: purchasePrefix,
      setPrefix: setPurchasePrefix,
      start: purchaseStart,
      setStart: setPurchaseStart,
      preview: `${purchasePrefix}-${purchaseStart}`
    },
    {
      key: 'transfer',
      title: 'Folios de Traspasos',
      description: 'Prefijo y número para envíos de stock entre sucursales.',
      prefix: transferPrefix,
      setPrefix: setTransferPrefix,
      start: transferStart,
      setStart: setTransferStart,
      preview: `${transferPrefix}-${transferStart}`
    },
    {
      key: 'consignment',
      title: 'Folios de Consignaciones',
      description: 'Prefijo y número para préstamos de inventario a clientes.',
      prefix: consignmentPrefix,
      setPrefix: setConsignmentPrefix,
      start: consignmentStart,
      setStart: setConsignmentStart,
      preview: `${consignmentPrefix}-${consignmentStart}`
    }
  ];

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '1rem' }}>
      
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#1e293b', margin: 0 }}>
            <Hash size={28} style={{ color: 'var(--caanma-primary, #6366f1)' }} />
            Folios de Documentos
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            Gestiona la secuencia de folios y consecutivos de tu sucursal activa: <strong style={{ color: '#4f46e5' }}>{branchName}</strong>
          </p>
        </div>
      </div>

      {errorMessage && (
        <div style={{ padding: '1rem', backgroundColor: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '8px', color: '#b91c1c', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
          <AlertTriangle size={18} />
          {errorMessage}
        </div>
      )}

      {/* Retroactive Migration Banner */}
      <div 
        style={{ 
          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.05) 0%, rgba(139, 92, 246, 0.05) 100%)',
          border: '1px dashed #c084fc',
          borderRadius: '16px',
          padding: '1.5rem',
          marginBottom: '2rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1.5rem',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.02)'
        }}
      >
        <div style={{ flex: 1, minWidth: '280px' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: '700', color: '#6b21a8', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
            ⚡ Inicializar Folios Existentes a 1,001
          </h3>
          <p style={{ fontSize: '0.825rem', color: '#6b7280', marginTop: '0.35rem', lineHeight: '1.4' }}>
            Si es la primera vez que configuras los folios, da clic aquí para renombrar todos tus documentos históricos
            (Ventas, Cotizaciones, etc.) de manera consecutiva a partir del número <strong>1,001</strong> usando el prefijo de sucursal correspondiente.
          </p>
        </div>
        <button
          onClick={handleMigrate}
          disabled={isMigrating}
          style={{
            padding: '0.65rem 1.25rem',
            backgroundColor: '#8b5cf6',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontWeight: '700',
            fontSize: '0.875rem',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            boxShadow: '0 4px 6px -1px rgba(139, 92, 246, 0.2)',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            if (!isMigrating) e.currentTarget.style.backgroundColor = '#7c3aed';
          }}
          onMouseLeave={(e) => {
            if (!isMigrating) e.currentTarget.style.backgroundColor = '#8b5cf6';
          }}
        >
          {isMigrating ? (
            <>
              <Loader2 size={16} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
              Procesando...
            </>
          ) : migrateSuccess ? (
            <>
              <CheckCircle2 size={16} />
              ¡Completado!
            </>
          ) : (
            <>
              <Play size={16} />
              Inicializar Folios
            </>
          )}
        </button>
      </div>

      {/* Main Settings Form */}
      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.25rem' }}>
          {modulesConfig.map((mod) => (
            <div 
              key={mod.key}
              style={{
                backgroundColor: 'white',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '1.25rem 1.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '1.5rem',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.03)';
                e.currentTarget.style.borderColor = '#cbd5e1';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = 'none';
                e.currentTarget.style.borderColor = '#e2e8f0';
              }}
            >
              {/* Description */}
              <div style={{ flex: '2 1 300px' }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: '700', color: '#0f172a', margin: 0 }}>
                  {mod.title}
                </h3>
                <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.2rem', margin: 0 }}>
                  {mod.description}
                </p>
              </div>

              {/* Inputs */}
              <div style={{ display: 'flex', gap: '1rem', flex: '1 1 260px', alignItems: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'column', width: '90px' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#64748b', marginBottom: '0.25rem' }}>
                    Prefijo
                  </label>
                  <input
                    type="text"
                    maxLength={5}
                    value={mod.prefix}
                    onChange={(e) => mod.setPrefix(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                    placeholder="Prefijo"
                    style={{
                      padding: '0.5rem',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.875rem',
                      fontWeight: 'bold',
                      textAlign: 'center',
                      outline: 'none',
                    }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#64748b', marginBottom: '0.25rem' }}>
                    Siguiente Consecutivo
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={mod.start}
                    onChange={(e) => mod.setStart(Number(e.target.value))}
                    placeholder="Siguiente consecutivo"
                    style={{
                      padding: '0.5rem',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.875rem',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              {/* Live Preview Badge */}
              <div 
                style={{ 
                  backgroundColor: '#f1f5f9',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '0.6rem 1rem',
                  minWidth: '140px',
                  textAlign: 'center',
                  alignSelf: 'center'
                }}
              >
                <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 'bold', letterSpacing: '0.5px' }}>
                  Siguiente Folio
                </div>
                <div style={{ fontSize: '0.95rem', fontWeight: '800', color: '#0f172a', fontFamily: 'monospace', marginTop: '0.15rem' }}>
                  {mod.preview}
                </div>
              </div>

            </div>
          ))}
        </div>

        {/* Footer Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem', borderTop: '1px solid #e2e8f0', paddingTop: '1.5rem' }}>
          <button
            type="submit"
            disabled={isSaving}
            style={{
              padding: '0.75rem 2rem',
              backgroundColor: 'var(--caanma-primary, #6366f1)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontWeight: '700',
              fontSize: '0.9rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              boxShadow: '0 4px 6px -1px rgba(99, 102, 241, 0.2)',
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => {
              if (!isSaving) e.currentTarget.style.backgroundColor = '#4f46e5';
            }}
            onMouseLeave={(e) => {
              if (!isSaving) e.currentTarget.style.backgroundColor = 'var(--caanma-primary, #6366f1)';
            }}
          >
            {isSaving ? (
              <>
                <Loader2 size={18} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
                Guardando...
              </>
            ) : saveSuccess ? (
              <>
                <CheckCircle2 size={18} color="#4ade80" />
                ¡Ajustes Guardados!
              </>
            ) : (
              <>
                <Save size={18} />
                Guardar Prefijos y Consecutivos
              </>
            )}
          </button>
        </div>

      </form>

    </div>
  );
}
