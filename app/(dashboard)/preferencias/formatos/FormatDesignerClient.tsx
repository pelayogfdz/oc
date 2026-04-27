'use client';
import { useState } from 'react';
import SettingsFormClient, { FieldConfig } from '../SettingsFormClient';
import { Palette, FileText, Image as ImageIcon, Receipt } from 'lucide-react';

export default function FormatDesignerClient({ configJson }: { configJson: any }) {
  const [activeTab, setActiveTab] = useState<'cotizacion' | 'ordenCompra' | 'factura' | 'ticket'>('cotizacion');

  const tabs = [
    { id: 'cotizacion', label: 'Cotizaciones', icon: <FileText size={18} /> },
    { id: 'ordenCompra', label: 'Compras', icon: <FileText size={18} /> },
    { id: 'factura', label: 'Facturas / Ventas (A4)', icon: <Receipt size={18} /> },
    { id: 'ticket', label: 'Tickets Térmicos', icon: <Receipt size={18} /> },
  ];

  // Common fields for A4 documents
  const commonA4Fields: FieldConfig[] = [
    { name: 'logoUrl', label: 'URL del Logotipo (Imagen)', type: 'text', placeholder: 'https://mi-dominio.com/logo.png', description: 'Enlace directo a la imagen de tu logo.' },
    { name: 'primaryColor', label: 'Color Principal (Hexadecimal)', type: 'text', placeholder: '#8b5cf6', description: 'Color usado para encabezados y fondos de tabla.' },
    { name: 'showProductImages', label: 'Mostrar Miniatura del Producto', type: 'boolean', description: 'Incluye una pequeña foto del producto en cada fila.' },
    { name: 'showProductSKU', label: 'Mostrar SKU / Código', type: 'boolean', description: 'Muestra el código del producto bajo el nombre.' },
    { name: 'footerNotes', label: 'Notas Finales o Condiciones', type: 'text', placeholder: 'Términos y condiciones de este documento...', description: 'Aparecerá en la parte inferior del PDF.' }
  ];

  // Fields for Ticket
  const ticketFields: FieldConfig[] = [
    { name: 'logoUrl', label: 'URL del Logotipo (Imagen B/N)', type: 'text', placeholder: 'https://mi-dominio.com/logo-bn.png', description: 'Enlace directo al logo monocromático para la ticketera.' },
    { name: 'showProductSKU', label: 'Mostrar SKU en Ticket', type: 'boolean', description: 'Añade el SKU del producto.' },
    { name: 'showCashierName', label: 'Mostrar Nombre del Cajero', type: 'boolean', description: 'Imprime el nombre de quien cobró.' },
  ];

  const getFieldsForTab = (tab: string): FieldConfig[] => {
    if (tab === 'ticket') return ticketFields;
    if (tab === 'factura') {
      return [
        ...commonA4Fields,
        { name: 'showTaxBreakdown', label: 'Desglosar Impuestos al final', type: 'boolean', description: 'Muestra Subtotal, IVA y Total por separado.' }
      ];
    }
    return commonA4Fields;
  };

  const getTitleForTab = (tab: string) => {
    return tabs.find(t => t.id === tab)?.label || 'Configuración';
  };

  const currentConfig = configJson ? configJson[`formatos_${activeTab}`] || {} : {};

  return (
    <div style={{ display: 'flex', gap: '2rem', flexDirection: 'column' }}>
      
      {/* Tab Navigation */}
      <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.5rem', borderBottom: '1px solid var(--pulpos-border)' }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1.25rem',
              borderRadius: '8px',
              backgroundColor: activeTab === tab.id ? 'var(--pulpos-primary)' : 'white',
              color: activeTab === tab.id ? 'white' : 'var(--pulpos-text)',
              fontWeight: activeTab === tab.id ? 'bold' : 'normal',
              border: '1px solid',
              borderColor: activeTab === tab.id ? 'var(--pulpos-primary)' : 'var(--pulpos-border)',
              transition: 'all 0.2s',
              whiteSpace: 'nowrap'
            }}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start' }}>
        
        {/* Settings Form */}
        <div style={{ flex: '1 1 60%' }}>
          <SettingsFormClient 
            key={activeTab} // Force re-render of form when tab changes
            moduleKey={`formatos_${activeTab}`}
            title={getTitleForTab(activeTab)}
            description={`Ajusta los elementos visuales que se mostrarán al imprimir o generar el PDF de ${getTitleForTab(activeTab).toLowerCase()}.`}
            initialConfig={currentConfig}
            fields={getFieldsForTab(activeTab)}
          />
        </div>

        {/* Live Preview Placeholder */}
        <div className="card" style={{ flex: '1 1 40%', backgroundColor: '#f8fafc', minHeight: '400px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
           <Palette size={48} color="var(--pulpos-text-muted)" style={{ marginBottom: '1rem' }} />
           <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--pulpos-text)', marginBottom: '0.5rem' }}>Vista Previa</h3>
           <p style={{ color: 'var(--pulpos-text-muted)', fontSize: '0.9rem', maxWidth: '300px' }}>
             Los cambios que guardes se aplicarán la próxima vez que generes este tipo de documento.
           </p>
        </div>

      </div>
    </div>
  );
}
