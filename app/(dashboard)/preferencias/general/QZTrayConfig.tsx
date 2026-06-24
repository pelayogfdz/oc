'use client';

import React, { useState, useEffect } from 'react';
import { Printer, RefreshCw, CheckCircle2, AlertCircle, Laptop, Wifi, ShieldCheck, ChevronRight, Key, Lock, FileText, Check, ShieldAlert } from 'lucide-react';
import qz from 'qz-tray';
import { saveQZSettings } from '@/app/actions/settings';

export default function QZTrayConfig({ qzConfig = {} }: { qzConfig?: { certificate?: string; hasPrivateKey?: boolean } }) {
  const [printMode, setPrintMode] = useState<'browser' | 'qz'>('browser'); // 'browser' or 'qz'
  const [printers, setPrinters] = useState<string[]>([]);
  const [selectedPrinter, setSelectedPrinter] = useState<string>('');
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState('');
  const [hoveredTab, setHoveredTab] = useState<string | null>(null);
  const [hoveredBtn, setHoveredBtn] = useState<string | null>(null);

  // States for QZ Credentials
  const [cert, setCert] = useState(qzConfig.certificate || '');
  const [pkey, setPkey] = useState('');
  const [hasPkey, setHasPkey] = useState(qzConfig.hasPrivateKey || false);
  const [isSavingCreds, setIsSavingCreds] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [saveError, setSaveError] = useState('');
  const [hoveredCredsBtn, setHoveredCredsBtn] = useState(false);

  useEffect(() => {
    // Load saved printer on mount
    const saved = localStorage.getItem('qz_default_printer');
    if (saved) {
      if (saved === '__browser__' || saved === 'browser') {
        setPrintMode('browser');
        setSelectedPrinter('__browser__');
      } else {
        setPrintMode('qz');
        setSelectedPrinter(saved);
        
        // Auto-connect to QZ Tray if it was the selected mode
        initializeQZConnection();
      }
    } else {
      // Default to browser print
      setPrintMode('browser');
      setSelectedPrinter('__browser__');
      localStorage.setItem('qz_default_printer', '__browser__');
    }
  }, []);

  const initializeQZConnection = async () => {
    if (qz.websocket.isActive()) {
      setIsConnected(true);
      fetchPrinters();
    } else {
      connectQZ();
    }
  };

  const connectQZ = async () => {
    setIsConnecting(true);
    setError('');
    try {
      if (!qz.websocket.isActive()) {
        // Setup QZ Security if certificate is present
        if (cert) {
          qz.security.setCertificatePromise((resolve) => resolve(cert));
          qz.security.setSignaturePromise((toSign) => {
            return (resolve, reject) => {
              fetch('/api/qz/sign', {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain' },
                body: toSign
              })
              .then(res => {
                if (!res.ok) throw new Error('Error al firmar petición');
                return res.text();
              })
              .then(resolve)
              .catch(reject);
            };
          });
        } else {
          // Reset security to anonymous connections
          qz.security.setCertificatePromise((resolve) => resolve(undefined));
          qz.security.setSignaturePromise((toSign) => (resolve) => resolve(''));
        }
        // Use 0 retries to fail instantly if QZ Tray is not running, preventing UI freeze!
        await qz.websocket.connect({ retries: 0, delay: 1 });
      }
      setIsConnected(true);
      setError('');
      fetchPrinters();
    } catch (err: any) {
      console.error('QZ connection error:', err);
      setIsConnected(false);
      setError('No se pudo conectar a QZ Tray. Asegúrate de que el programa esté instalado y ejecutándose en este equipo.');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleSaveCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingCreds(true);
    setSaveMessage('');
    setSaveError('');
    try {
      const res = await saveQZSettings(cert, pkey);
      if (res.success) {
        setSaveMessage('Credenciales de impresión QZ guardadas exitosamente.');
        if (pkey) {
          setHasPkey(true);
          setPkey(''); // Clear key state for safety
        }
        // Restart websocket connection
        if (qz.websocket.isActive()) {
          await qz.websocket.disconnect();
          setIsConnected(false);
        }
        alert('Credenciales de firma guardadas con éxito. Se reiniciará la conexión segura.');
        await connectQZ();
      }
    } catch (err: any) {
      console.error(err);
      setSaveError('Error al guardar credenciales: ' + err.message);
    } finally {
      setIsSavingCreds(false);
    }
  };

  const fetchPrinters = async () => {
    try {
      const foundPrinters: string | string[] = await qz.printers.find();
      const list = Array.isArray(foundPrinters) ? foundPrinters : [foundPrinters];
      setPrinters(list);
      
      // If the saved printer is in the list, keep it, otherwise reset to first available
      const saved = localStorage.getItem('qz_default_printer');
      if (saved && list.includes(saved)) {
        setSelectedPrinter(saved);
      } else if (list.length > 0) {
        // Don't auto-set immediately, let them choose
      }
    } catch (err: any) {
      console.error('Error fetching printers:', err);
      setError('Error al obtener la lista de impresoras locales.');
    }
  };

  const handleSelectMode = (mode: 'browser' | 'qz') => {
    setPrintMode(mode);
    if (mode === 'browser') {
      setSelectedPrinter('__browser__');
      localStorage.setItem('qz_default_printer', '__browser__');
    } else {
      const saved = localStorage.getItem('qz_default_printer');
      if (saved && saved !== '__browser__' && saved !== 'browser') {
        setSelectedPrinter(saved);
      } else {
        setSelectedPrinter('');
      }
      initializeQZConnection();
    }
  };

  const handleSelectPrinter = (printerName: string) => {
    setSelectedPrinter(printerName);
    localStorage.setItem('qz_default_printer', printerName);
  };

  const getTestTicketHtml = () => {
    return `
      <html>
        <head>
          <style>
            body { 
              font-family: 'Courier New', Courier, monospace; 
              font-size: 14px; 
              margin: 0; 
              padding: 15px; 
              color: #000; 
              width: 280px; 
              background-color: #fff;
            }
            .header { text-align: center; margin-bottom: 10px; }
            .title { font-size: 18px; font-weight: bold; margin-bottom: 4px; }
            .subtitle { font-size: 12px; margin-bottom: 2px; }
            .divider { border-top: 1px dashed #000; margin: 10px 0; }
            .row { display: flex; justify-content: space-between; margin-bottom: 4px; font-size: 12px; }
            .bold { font-weight: bold; }
            .center { text-align: center; }
            .footer { text-align: center; font-size: 11px; margin-top: 15px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="title">CAANMA ERP</div>
            <div class="subtitle">PRUEBA DE IMPRESIÓN</div>
            <div class="subtitle">Sucursal Principal</div>
          </div>
          <div class="divider"></div>
          <div class="row">
            <span>Fecha:</span>
            <span>${new Date().toLocaleString()}</span>
          </div>
          <div class="row">
            <span>Estado del Sistema:</span>
            <span class="bold">100% FUNCIONAL</span>
          </div>
          <div class="row">
            <span>Modo configurado:</span>
            <span>${printMode === 'browser' ? 'Navegador' : 'QZ Tray (Directo)'}</span>
          </div>
          <div class="divider"></div>
          <div class="row bold">
            <span>DESCRIPCIÓN</span>
            <span>TOTAL</span>
          </div>
          <div class="row">
            <span>1x Conexión de Impresora</span>
            <span>$0.00</span>
          </div>
          <div class="row">
            <span>1x Soporte Técnico Premium</span>
            <span>$0.00</span>
          </div>
          <div class="divider"></div>
          <div class="row bold" style="font-size: 15px;">
            <span>TOTAL:</span>
            <span>$0.00</span>
          </div>
          <div class="divider"></div>
          <div class="footer">
            ¡Tu sistema de impresión local está configurado correctamente!<br/>
            www.caanma.mx
          </div>
        </body>
      </html>
    `;
  };

  const testPrint = async () => {
    if (printMode === 'browser') {
      // Standard browser printing test
      const iframe = document.createElement('iframe');
      iframe.style.position = 'absolute';
      iframe.style.width = '0px';
      iframe.style.height = '0px';
      iframe.style.border = 'none';
      
      iframe.onload = () => {
        const body = iframe.contentWindow?.document.body;
        if (!body || !body.innerHTML || body.innerHTML === 'undefined' || body.innerHTML.trim() === '') {
          return;
        }
        
        iframe.contentWindow?.focus();
        if (typeof window !== 'undefined' && (window.navigator.webdriver || (window as any).__isTesting)) {
          console.log("Bypassing browser print dialog in testing environment");
        } else {
          iframe.contentWindow?.print();
        }
        setTimeout(() => {
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
          }
        }, 1000);
      };

      document.body.appendChild(iframe);
      
      if (iframe.contentWindow) {
        iframe.contentWindow.document.open();
        iframe.contentWindow.document.write(getTestTicketHtml());
        iframe.contentWindow.document.close();
      }
    } else {
      // QZ Tray printing test
      if (!selectedPrinter || selectedPrinter === '__browser__') {
        alert('Por favor selecciona una impresora local de la lista.');
        return;
      }
      try {
        const config = qz.configs.create(selectedPrinter);
        const data = [{
          type: 'html',
          format: 'plain',
          data: getTestTicketHtml()
        }];
        await qz.print(config, data as any);
        alert('Impresión de prueba enviada con éxito a través de QZ Tray.');
      } catch (err: any) {
        console.error('Error printing through QZ:', err);
        alert('Error al imprimir a través de QZ Tray: ' + err.message);
      }
    }
  };

  return (
    <div style={{ 
      backgroundColor: 'white', 
      borderRadius: '16px', 
      padding: '2.5rem', 
      border: '1px solid var(--caanma-border)', 
      marginTop: '2rem',
      boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.05)',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      {/* Header section with rich aesthetics */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
        <div style={{ 
          width: '50px', 
          height: '50px', 
          borderRadius: '12px', 
          background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(79, 70, 229, 0.2)'
        }}>
          <Printer size={26} color="white" />
        </div>
        <div>
          <h2 style={{ fontSize: '1.6rem', fontWeight: '800', color: '#1e293b', margin: 0, letterSpacing: '-0.02em' }}>
            Impresión Local (Tickets)
          </h2>
          <p style={{ color: '#64748b', fontSize: '0.9rem', margin: '0.2rem 0 0 0' }}>
            Configura cómo se emitirán los tickets de venta y cotizaciones en este terminal.
          </p>
        </div>
      </div>

      <div style={{ borderBottom: '1px solid #f1f5f9', margin: '1.5rem 0' }}></div>

      {/* Printer Mode Segment Selector */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2rem' }}>
        <label style={{ fontSize: '0.95rem', fontWeight: '700', color: '#334155' }}>
          Modalidad de Impresión
        </label>
        
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: '1fr 1fr', 
          gap: '0.5rem', 
          backgroundColor: '#f1f5f9', 
          padding: '0.4rem', 
          borderRadius: '12px' 
        }}>
          <button
            type="button"
            onClick={() => handleSelectMode('browser')}
            onMouseEnter={() => setHoveredTab('browser')}
            onMouseLeave={() => setHoveredTab(null)}
            style={{
              padding: '0.85rem 1rem',
              borderRadius: '8px',
              border: 'none',
              fontWeight: '600',
              fontSize: '0.95rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
              backgroundColor: printMode === 'browser' ? 'white' : 'transparent',
              color: printMode === 'browser' ? '#4f46e5' : '#64748b',
              boxShadow: printMode === 'browser' ? '0 4px 10px rgba(0, 0, 0, 0.05)' : 'none',
              transform: hoveredTab === 'browser' && printMode !== 'browser' ? 'translateY(-1px)' : 'none'
            }}
          >
            <Laptop size={18} />
            Impresión por Navegador
          </button>
          
          <button
            type="button"
            onClick={() => handleSelectMode('qz')}
            onMouseEnter={() => setHoveredTab('qz')}
            onMouseLeave={() => setHoveredTab(null)}
            style={{
              padding: '0.85rem 1rem',
              borderRadius: '8px',
              border: 'none',
              fontWeight: '600',
              fontSize: '0.95rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
              backgroundColor: printMode === 'qz' ? 'white' : 'transparent',
              color: printMode === 'qz' ? '#4f46e5' : '#64748b',
              boxShadow: printMode === 'qz' ? '0 4px 10px rgba(0, 0, 0, 0.05)' : 'none',
              transform: hoveredTab === 'qz' && printMode !== 'qz' ? 'translateY(-1px)' : 'none'
            }}
          >
            <Wifi size={18} />
            QZ Tray (Impresión Directa)
          </button>
        </div>
      </div>

      <div style={{ maxWidth: '650px' }}>
        {/* BROWSER PRINTING MODE */}
        {printMode === 'browser' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'flex-start', 
              gap: '1rem', 
              padding: '1.25rem', 
              backgroundColor: 'hsl(142, 70%, 97%)', 
              border: '1px solid hsl(142, 60%, 85%)', 
              borderRadius: '12px' 
            }}>
              <CheckCircle2 color="hsl(142, 76%, 36%)" style={{ marginTop: '0.2rem', flexShrink: 0 }} size={22} />
              <div>
                <div style={{ fontWeight: '750', color: 'hsl(142, 76%, 20%)', fontSize: '1rem' }}>
                  Modo Navegador Activo
                </div>
                <div style={{ fontSize: '0.875rem', color: 'hsl(142, 60%, 25%)', marginTop: '0.25rem', lineHeight: '1.4' }}>
                  Listo para imprimir utilizando el controlador nativo de tu computadora. Es compatible con cualquier impresora térmica (80mm o 58mm). Al cobrar, se abrirá la ventana emergente de impresión estándar de forma limpia y rápida.
                </div>
              </div>
            </div>

            <div style={{ 
              backgroundColor: '#f8fafc', 
              borderRadius: '12px', 
              padding: '1.25rem', 
              border: '1px solid #e2e8f0', 
              fontSize: '0.875rem', 
              color: '#475569',
              lineHeight: '1.5'
            }}>
              <strong style={{ color: '#1e293b', display: 'block', marginBottom: '0.25rem' }}>Ventajas:</strong>
              • Funciona en tablets, celulares y computadoras.<br/>
              • No requiere instalar ningún programa o plugin adicional.<br/>
              • Configuración en 1 segundo.
            </div>

            <button
              onClick={testPrint}
              onMouseEnter={() => setHoveredBtn('test')}
              onMouseLeave={() => setHoveredBtn(null)}
              style={{
                alignSelf: 'flex-start',
                padding: '0.85rem 1.75rem',
                backgroundColor: 'white',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                color: '#334155',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                transition: 'all 0.2s',
                boxShadow: hoveredBtn === 'test' ? '0 4px 12px rgba(0, 0, 0, 0.05)' : 'none',
                transform: hoveredBtn === 'test' ? 'translateY(-1px)' : 'none',
                borderColor: hoveredBtn === 'test' ? '#94a3b8' : '#cbd5e1'
              }}
            >
              <Printer size={18} />
              Probar Ventana de Impresión
            </button>
          </div>
        )}

        {/* QZ TRAY PRINTING MODE */}
        {printMode === 'qz' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Connection status */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '1rem', 
              padding: '1.25rem', 
              backgroundColor: isConnected ? 'hsl(142, 70%, 97%)' : 'hsl(0, 84%, 97%)', 
              border: `1px solid ${isConnected ? 'hsl(142, 60%, 85%)' : 'hsl(0, 84%, 89%)'}`, 
              borderRadius: '12px',
              transition: 'all 0.3s ease'
            }}>
              {isConnected ? (
                <>
                  <ShieldCheck color="hsl(142, 76%, 36%)" size={24} style={{ flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '750', color: 'hsl(142, 76%, 20%)', fontSize: '1.05rem' }}>Conectado a QZ Tray</div>
                    <div style={{ fontSize: '0.85rem', color: 'hsl(142, 60%, 25%)', marginTop: '0.15rem' }}>El servicio local está activo. Impresión directa habilitada.</div>
                  </div>
                </>
              ) : (
                <>
                  <AlertCircle color="hsl(0, 84%, 40%)" size={24} style={{ flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '750', color: 'hsl(0, 84%, 20%)', fontSize: '1.05rem' }}>QZ Tray Desconectado</div>
                    <div style={{ fontSize: '0.85rem', color: 'hsl(0, 84%, 30%)', marginTop: '0.15rem' }}>
                      {error || 'Intentando conectar con el servicio local...'}
                    </div>
                  </div>
                  <button 
                    onClick={connectQZ} 
                    disabled={isConnecting} 
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '0.4rem', 
                      padding: '0.55rem 1.1rem', 
                      backgroundColor: 'white', 
                      border: '1px solid hsl(0, 84%, 85%)', 
                      borderRadius: '8px', 
                      color: 'hsl(0, 84%, 30%)', 
                      fontWeight: '700',
                      fontSize: '0.85rem',
                      cursor: isConnecting ? 'wait' : 'pointer',
                      transition: 'all 0.2s',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                    }}
                  >
                    <RefreshCw size={14} className={isConnecting ? 'animate-spin' : ''} /> 
                    {isConnecting ? 'Conectando...' : 'Reintentar'}
                  </button>
                </>
              )}
            </div>

            {/* Printer Selection (Available only if connected) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.9rem', fontWeight: '700', color: '#475569' }}>
                Seleccionar Impresora Térmica
              </label>
              
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <select 
                  value={selectedPrinter === '__browser__' ? '' : selectedPrinter} 
                  onChange={e => handleSelectPrinter(e.target.value)}
                  disabled={!isConnected}
                  style={{ 
                    flex: 1, 
                    padding: '0.85rem 1rem', 
                    borderRadius: '8px', 
                    border: '1px solid #cbd5e1', 
                    outline: 'none', 
                    backgroundColor: isConnected ? 'white' : '#f8fafc',
                    color: isConnected ? '#1e293b' : '#94a3b8',
                    fontWeight: '600',
                    fontSize: '0.95rem',
                    cursor: isConnected ? 'pointer' : 'not-allowed',
                    boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.02)'
                  }}
                >
                  <option value="">
                    {isConnected ? '-- Seleccionar impresora de tickets local --' : 'QZ Tray no conectado (Servicio inactivo)'}
                  </option>
                  {printers.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
                
                <button 
                  type="button"
                  onClick={fetchPrinters} 
                  disabled={!isConnected}
                  title="Actualizar lista de impresoras"
                  style={{ 
                    padding: '0 1.2rem', 
                    backgroundColor: isConnected ? '#f8fafc' : '#f1f5f9', 
                    border: '1px solid #cbd5e1', 
                    borderRadius: '8px', 
                    cursor: isConnected ? 'pointer' : 'not-allowed',
                    color: isConnected ? '#475569' : '#94a3b8',
                    transition: 'all 0.2s'
                  }}
                >
                  <RefreshCw size={18} />
                </button>
              </div>

              {!isConnected && (
                <p style={{ fontSize: '0.8rem', color: '#ef4444', marginTop: '0.25rem', lineHeight: '1.4' }}>
                  💡 Para utilizar este modo, debes descargar e iniciar **QZ Tray** en tu sistema operativo local. Si no deseas instalar software externo, cambia a **Impresión por Navegador** arriba.
                </p>
              )}
            </div>

            {/* Test Print Button */}
            {isConnected && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem' }}>
                {selectedPrinter && selectedPrinter !== '__browser__' ? (
                  <>
                    <div style={{ 
                      fontSize: '0.85rem', 
                      color: '#16a34a', 
                      fontWeight: '700',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem'
                    }}>
                      <CheckCircle2 size={16} /> Impresora guardada: {selectedPrinter}
                    </div>
                    
                    <button 
                      onClick={testPrint}
                      onMouseEnter={() => setHoveredBtn('test-qz')}
                      onMouseLeave={() => setHoveredBtn(null)}
                      style={{
                        alignSelf: 'flex-start',
                        padding: '0.85rem 1.75rem',
                        backgroundColor: '#4f46e5',
                        border: 'none',
                        borderRadius: '8px',
                        color: 'white',
                        fontWeight: '700',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        transition: 'all 0.2s',
                        boxShadow: '0 4px 10px rgba(79, 70, 229, 0.2)',
                        transform: hoveredBtn === 'test-qz' ? 'translateY(-1px)' : 'none'
                      }}
                    >
                      <Printer size={18} /> Imprimir Ticket de Prueba Directo
                    </button>
                  </>
                ) : (
                  <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
                    ⚠️ Selecciona una impresora de la lista para emitir una prueba física.
                  </p>
                )}
              </div>
            )}

            {/* Cryptographic Credentials Form */}
            <div style={{
              marginTop: '2rem',
              padding: '1.75rem',
              borderRadius: '12px',
              backgroundColor: '#f8fafc',
              border: '1px dashed #cbd5e1',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Key size={20} color="#4f46e5" />
                <h3 style={{ fontSize: '1.1rem', fontWeight: '750', color: '#1e293b', margin: 0 }}>
                  🔒 Credenciales Seguras de Impresión (Recomendado)
                </h3>
              </div>
              <p style={{ fontSize: '0.85rem', color: '#475569', margin: 0, lineHeight: '1.4' }}>
                Configura tu certificado público de QZ Tray y tu clave privada para habilitar la firma de sockets en el servidor. Esto eliminará las ventanas de advertencia y permitirá la impresión directa de tickets sin clics molestos.
              </p>
              
              <form onSubmit={handleSaveCredentials} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {/* Certificate Input */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: '700', color: '#475569', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <FileText size={14} /> Certificado Digital Público (Format PEM / digital-certificate.txt)
                  </label>
                  <textarea
                    rows={4}
                    value={cert}
                    onChange={(e) => setCert(e.target.value)}
                    placeholder="-----BEGIN CERTIFICATE-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...\n-----END CERTIFICATE-----"
                    style={{
                      padding: '0.75rem',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.8rem',
                      fontFamily: 'monospace',
                      width: '100%',
                      outline: 'none',
                      resize: 'vertical',
                      backgroundColor: 'white'
                    }}
                  />
                </div>

                {/* Private Key Input */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: '700', color: '#475569', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <Lock size={14} /> Clave Privada PEM (private-key.pem)
                  </label>
                  <textarea
                    rows={4}
                    value={pkey}
                    onChange={(e) => setPkey(e.target.value)}
                    placeholder={hasPkey ? "•••••••••••••••• (Clave guardada con éxito. Pega una nueva clave aquí para cambiarla)" : "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQ...\n-----END PRIVATE KEY-----"}
                    style={{
                      padding: '0.75rem',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.8rem',
                      fontFamily: 'monospace',
                      width: '100%',
                      outline: 'none',
                      resize: 'vertical',
                      backgroundColor: 'white'
                    }}
                  />
                  {hasPkey && (
                    <div style={{
                      fontSize: '0.75rem',
                      color: '#16a34a',
                      fontWeight: '600',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      marginTop: '0.1rem'
                    }}>
                      <Check size={14} /> Hay una clave privada activa y guardada encriptada en la sucursal.
                    </div>
                  )}
                </div>

                {saveMessage && (
                  <div style={{
                    padding: '0.75rem',
                    backgroundColor: 'hsl(142, 70%, 97%)',
                    border: '1px solid hsl(142, 60%, 85%)',
                    color: 'hsl(142, 76%, 20%)',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    fontWeight: '600'
                  }}>
                    {saveMessage}
                  </div>
                )}

                {saveError && (
                  <div style={{
                    padding: '0.75rem',
                    backgroundColor: 'hsl(0, 84%, 97%)',
                    border: '1px solid hsl(0, 84%, 89%)',
                    color: 'hsl(0, 84%, 20%)',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    fontWeight: '600'
                  }}>
                    {saveError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSavingCreds}
                  onMouseEnter={() => setHoveredCredsBtn(true)}
                  onMouseLeave={() => setHoveredCredsBtn(false)}
                  style={{
                    alignSelf: 'flex-start',
                    padding: '0.75rem 1.5rem',
                    backgroundColor: isSavingCreds ? '#cbd5e1' : '#4f46e5',
                    border: 'none',
                    borderRadius: '8px',
                    color: 'white',
                    fontWeight: '700',
                    fontSize: '0.85rem',
                    cursor: isSavingCreds ? 'wait' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    transition: 'all 0.2s',
                    boxShadow: hoveredCredsBtn && !isSavingCreds ? '0 4px 12px rgba(79, 70, 229, 0.2)' : 'none',
                    transform: hoveredCredsBtn && !isSavingCreds ? 'translateY(-1px)' : 'none'
                  }}
                >
                  <ShieldCheck size={16} />
                  {isSavingCreds ? 'Guardando credenciales...' : 'Guardar Credenciales Seguras'}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
