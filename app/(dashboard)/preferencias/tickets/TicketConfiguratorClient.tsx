'use client';

import { useState, useEffect } from 'react';
import { Save } from 'lucide-react';
import { updateAdvancedConfig } from '@/app/actions/settings';
import styles from './tickets.module.css';

export default function TicketConfiguratorClient({
  moduleKey,
  initialConfig,
}: {
  moduleKey: string;
  initialConfig: any;
}) {
  const [isPending, setIsPending] = useState(false);
  const [showToast, setShowToast] = useState(false);

  // Form State
  const [storeName, setStoreName] = useState(initialConfig.storeName || 'MI NEGOCIO');
  const [rfc, setRfc] = useState(initialConfig.rfc || '');
  const [address, setAddress] = useState(initialConfig.address || '');
  const [phone, setPhone] = useState(initialConfig.phone || '');
  const [headerMsg, setHeaderMsg] = useState(initialConfig.headerMsg || '');
  const [footerMsg, setFooterMsg] = useState(initialConfig.footerMsg || '¡Gracias por su compra!\nVuelva pronto.');
  const [showTax, setShowTax] = useState(initialConfig.showTax ?? true);

  // Print Format
  const [format, setFormat] = useState<'80mm' | '58mm'>('80mm');
  const [dateStr, setDateStr] = useState('');

  useEffect(() => {
    setDateStr(new Date().toLocaleString('es-MX', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    }));
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setIsPending(true);

    const formData = new FormData();
    formData.append('storeName', storeName);
    formData.append('rfc', rfc);
    formData.append('address', address);
    formData.append('phone', phone);
    formData.append('headerMsg', headerMsg);
    formData.append('footerMsg', footerMsg);
    formData.append('showTax', showTax ? 'true' : 'false');

    try {
      await updateAdvancedConfig(moduleKey, formData);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className={styles.container}>
      {/* FORM SECTION */}
      <div className={styles.formBox}>
        <h2 className={styles.headerTitle}>Diseño de Tickets</h2>
        <p className={styles.headerDesc}>
          Personaliza la información que aparece en los tickets de venta.
        </p>

        {showToast && (
          <div style={{ padding: '1rem', backgroundColor: '#dcfce7', color: '#166534', borderRadius: '8px', marginBottom: '1.5rem', fontWeight: 'bold', border: '1px solid #bbf7d0' }}>
            ✅ Configuraciones Guardadas Correctamente
          </div>
        )}

        <form onSubmit={handleSave}>
          <div className={styles.formGroup}>
            <label>Nombre del Negocio</label>
            <input 
              className={styles.inputField} 
              value={storeName} 
              onChange={e => setStoreName(e.target.value)} 
              placeholder="Ej. Mi Tiendita" 
            />
          </div>

          <div className={styles.formGroup}>
            <label>RFC (Opcional)</label>
            <input 
              className={styles.inputField} 
              value={rfc} 
              onChange={e => setRfc(e.target.value)} 
              placeholder="XAXX010101000" 
            />
          </div>

          <div className={styles.formGroup}>
            <label>Dirección</label>
            <textarea 
              className={styles.inputField} 
              rows={2} 
              value={address} 
              onChange={e => setAddress(e.target.value)} 
              placeholder="Calle Principal 123, Colonia Centro..." 
            />
          </div>

          <div className={styles.formGroup}>
            <label>Teléfono</label>
            <input 
              className={styles.inputField} 
              value={phone} 
              onChange={e => setPhone(e.target.value)} 
              placeholder="55 5555 5555" 
            />
          </div>

          <div className={styles.formGroup}>
            <label>Mensaje de Saludo (Arriba)</label>
            <textarea 
              className={styles.inputField} 
              rows={2} 
              value={headerMsg} 
              onChange={e => setHeaderMsg(e.target.value)} 
              placeholder="¡Bienvenidos!" 
            />
          </div>

          <div className={styles.formGroup}>
            <label>Mensaje de Despedida (Abajo)</label>
            <textarea 
              className={styles.inputField} 
              rows={2} 
              value={footerMsg} 
              onChange={e => setFooterMsg(e.target.value)} 
              placeholder="¡Gracias por su compra!" 
            />
          </div>

          <div className={styles.checkboxGroup}>
            <input 
              type="checkbox" 
              id="showTax" 
              checked={showTax} 
              onChange={(e) => setShowTax(e.target.checked)} 
            />
            <label htmlFor="showTax">Desglosar IVA en el ticket</label>
          </div>

          <button type="submit" className="btn-primary" disabled={isPending}>
            <Save size={18} /> {isPending ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </form>
      </div>

      {/* PREVIEW SECTION */}
      <div className={styles.previewBox}>
        <div className={styles.previewControls}>
          <button 
            type="button" 
            className={`${styles.formatBtn} ${format === '80mm' ? styles.active : ''}`}
            onClick={() => setFormat('80mm')}
          >
            Formato 80mm
          </button>
          <button 
            type="button" 
            className={`${styles.formatBtn} ${format === '58mm' ? styles.active : ''}`}
            onClick={() => setFormat('58mm')}
          >
            Formato 58mm
          </button>
        </div>

        <div className={`${styles.ticketWrapper} ${format === '58mm' ? styles.size58 : ''}`}>
          <div className={styles.tHeader}>
            <div className={styles.tTitle}>{storeName || 'MI NEGOCIO'}</div>
            {rfc && <div className={styles.tLine}>RFC: {rfc}</div>}
            {address && (
              <div 
                className={styles.tLine} 
                dangerouslySetInnerHTML={{ __html: address.replace(/\n/g, '<br>') }} 
              />
            )}
            {phone && <div className={styles.tLine}>Tel: {phone}</div>}
          </div>

          <div className={styles.tDivider} />

          {headerMsg && (
            <>
              <div className={styles.tLine} style={{ textAlign: 'center', fontWeight: 'bold', marginBottom: '8px' }}>
                {headerMsg}
              </div>
              <div className={styles.tDivider} style={{ borderTopStyle: 'solid', borderColor: '#777' }} />
            </>
          )}

          <div className={styles.tBody}>
            <div className={styles.infoRow}>
              <span>Ticket: #0001002</span>
              <span>{dateStr}</span>
            </div>
            <div className={styles.infoRow}><span>Cajero: Admin</span></div>
          </div>

          <div className={styles.itemsTable}>
            <div className={styles.itemHead}>
              <span className={styles.colCant}>CANT</span>
              <span className={styles.colDesc}>DESCRIPCIÓN</span>
              <span className={styles.colPrice}>IMPORTE</span>
            </div>
            <div className={styles.itemRow}>
              <span className={styles.colCant}>1.0</span>
              <span className={styles.colDesc}>Sabritas Adobadas 42g</span>
              <span className={styles.colPrice}>$22.00</span>
            </div>
            <div className={styles.itemRow}>
              <span className={styles.colCant}>2.0</span>
              <span className={styles.colDesc}>Coca Cola 600ml Retornable</span>
              <span className={styles.colPrice}>$36.00</span>
            </div>
          </div>

          <div className={styles.tDivider} style={{ borderTopStyle: 'solid', borderColor: '#777' }} />

          <div className={styles.totalsSection}>
            <div className={styles.totalRow}>
              <span>Subtotal:</span>
              <span>$50.00</span>
            </div>
            {showTax && (
              <div className={styles.totalRow}>
                <span>IVA (16%):</span>
                <span>$8.00</span>
              </div>
            )}
            <div className={`${styles.totalRow} ${styles.grandTotal}`}>
              <span>TOTAL:</span>
              <span>$58.00</span>
            </div>
          </div>

          <div className={styles.tDivider} style={{ borderTopStyle: 'solid', borderColor: '#777', marginTop: '10px' }} />

          {footerMsg && (
            <div 
              className={styles.tFooter} 
              dangerouslySetInnerHTML={{ __html: footerMsg.replace(/\n/g, '<br>') }} 
            />
          )}

          <div style={{ textAlign: 'center' }}>
            <div className={styles.barcode}>|| ||| | ||| ||</div>
          </div>
        </div>

      </div>
    </div>
  );
}
