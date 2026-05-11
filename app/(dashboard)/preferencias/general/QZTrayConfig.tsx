'use client';

import React, { useState, useEffect } from 'react';
import { Printer, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import qz from 'qz-tray';

export default function QZTrayConfig() {
  const [printers, setPrinters] = useState<string[]>([]);
  const [selectedPrinter, setSelectedPrinter] = useState<string>('');
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Load saved printer on mount
    const saved = localStorage.getItem('qz_default_printer');
    if (saved) setSelectedPrinter(saved);
    
    // Auto-connect if not connected
    if (!qz.websocket.isActive()) {
      connectQZ();
    } else {
      setIsConnected(true);
      fetchPrinters();
    }

    return () => {
      // Cleanup if necessary, though QZ connection is often kept alive
    };
  }, []);

  const connectQZ = async () => {
    setIsConnecting(true);
    setError('');
    try {
      if (!qz.websocket.isActive()) {
        await qz.websocket.connect({ retries: 2, delay: 1 });
      }
      setIsConnected(true);
      fetchPrinters();
    } catch (err: any) {
      console.error('QZ connection error:', err);
      setIsConnected(false);
      setError('No se pudo conectar a QZ Tray. Asegúrate de que el programa esté instalado y ejecutándose.');
    } finally {
      setIsConnecting(false);
    }
  };

  const fetchPrinters = async () => {
    try {
      const foundPrinters: string | string[] = await qz.printers.find();
      setPrinters(Array.isArray(foundPrinters) ? foundPrinters : [foundPrinters]);
    } catch (err: any) {
      console.error('Error fetching printers:', err);
      setError('Error al obtener lista de impresoras.');
    }
  };

  const handleSelectPrinter = (printerName: string) => {
    setSelectedPrinter(printerName);
    localStorage.setItem('qz_default_printer', printerName);
    // Podríamos lanzar un toast de éxito aquí
  };

  const testPrint = async () => {
    if (!selectedPrinter) return;
    try {
      const config = qz.configs.create(selectedPrinter);
      const data = [
        '\x1B\x40', // ESC @ (init)
        '\x1B\x61\x01', // ESC a 1 (center)
        'Impresora conectada correctamente!\n',
        'Pulpos - Prueba de Impresión\n',
        '\x1B\x64\x05', // Feed 5 lines
        '\x1D\x56\x00'  // Cut paper
      ];
      await qz.print(config, data);
      alert('Impresión de prueba enviada con éxito');
    } catch (err: any) {
      alert('Error al imprimir: ' + err.message);
    }
  };

  return (
    <div style={{ backgroundColor: 'white', borderRadius: '8px', padding: '2rem', border: '1px solid var(--pulpos-border)', marginTop: '2rem' }}>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
        <Printer size={24} /> Impresión Local (Tickets)
      </h2>
      <p style={{ color: 'var(--pulpos-text-muted)', fontSize: '0.875rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--pulpos-border)', paddingBottom: '1rem' }}>
        Configura la impresora de tickets predeterminada para este dispositivo. Requiere tener instalado <strong>QZ Tray</strong>.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '600px' }}>
        
        {/* Estado de conexión */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', backgroundColor: isConnected ? '#ecfdf5' : '#fef2f2', border: `1px solid ${isConnected ? '#a7f3d0' : '#fecaca'}`, borderRadius: '8px' }}>
          {isConnected ? (
            <>
              <CheckCircle2 color="#10b981" />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 'bold', color: '#065f46' }}>Conectado a QZ Tray</div>
                <div style={{ fontSize: '0.8rem', color: '#047857' }}>Listo para imprimir en modo silencioso.</div>
              </div>
            </>
          ) : (
            <>
              <AlertCircle color="#ef4444" />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 'bold', color: '#991b1b' }}>Desconectado</div>
                <div style={{ fontSize: '0.8rem', color: '#b91c1c' }}>{error || 'Conectando con el servicio de impresión...'}</div>
              </div>
              <button onClick={connectQZ} disabled={isConnecting} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', backgroundColor: 'white', border: '1px solid #fecaca', borderRadius: '6px', color: '#991b1b', cursor: isConnecting ? 'wait' : 'pointer' }}>
                <RefreshCw size={16} className={isConnecting ? 'animate-spin' : ''} /> Reintentar
              </button>
            </>
          )}
        </div>

        {/* Selector de Impresora */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 'bold', color: '#1f2937', marginBottom: '0.5rem' }}>
            Impresora Predeterminada
          </label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <select 
              value={selectedPrinter} 
              onChange={e => handleSelectPrinter(e.target.value)}
              disabled={!isConnected || printers.length === 0}
              style={{ flex: 1, padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--pulpos-border)', outline: 'none', backgroundColor: 'white' }}
            >
              <option value="">-- Seleccionar impresora local --</option>
              {printers.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
            <button 
              onClick={fetchPrinters} 
              disabled={!isConnected}
              title="Actualizar lista de impresoras"
              style={{ padding: '0 1rem', backgroundColor: 'var(--pulpos-bg)', border: '1px solid var(--pulpos-border)', borderRadius: '6px', cursor: 'pointer' }}
            >
              <RefreshCw size={18} />
            </button>
          </div>
          <p style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '0.5rem' }}>
            Esta selección se guarda automáticamente en este navegador/dispositivo.
          </p>
        </div>

        {selectedPrinter && (
          <div style={{ marginTop: '0.5rem' }}>
            <button 
              onClick={testPrint}
              style={{ padding: '0.75rem 1.5rem', backgroundColor: 'var(--pulpos-bg)', border: '1px solid var(--pulpos-border)', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <Printer size={18} /> Imprimir Ticket de Prueba
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
