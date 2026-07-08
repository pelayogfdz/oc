import PDFDocument from 'pdfkit';

export function generateAccountStatementPdfBuffer(customer: any, sales: any[], config: any): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const fs = require('fs');
      const path = require('path');
      const regularPath = path.join(process.cwd(), 'lib/fonts/arial.ttf');
      const boldPath = path.join(process.cwd(), 'lib/fonts/arialbd.ttf');
      const italicPath = path.join(process.cwd(), 'lib/fonts/ariali.ttf');
      
      const hasCustomFonts = fs.existsSync(regularPath) && fs.existsSync(boldPath) && fs.existsSync(italicPath);
      const doc = new PDFDocument({ 
        margin: 50, 
        size: 'LETTER',
        autoFirstPage: !hasCustomFonts
      });
      const chunks: any[] = [];

      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', err => reject(err));

      let useCustomFonts = false;
      if (hasCustomFonts) {
        try {
          doc.registerFont('Arial', fs.readFileSync(regularPath));
          doc.registerFont('Arial-Bold', fs.readFileSync(boldPath));
          doc.registerFont('Arial-Italic', fs.readFileSync(italicPath));
          doc.addPage();
          doc.font('Arial');
          useCustomFonts = true;
        } catch (e) {
          console.error("Failed to register custom Arial fonts:", e);
        }
      }

      const fontRegular = useCustomFonts ? 'Arial' : 'Helvetica';
      const fontBold = useCustomFonts ? 'Arial-Bold' : 'Helvetica-Bold';
      const fontItalic = useCustomFonts ? 'Arial-Italic' : 'Helvetica-Oblique';
      
      // Load configurations
      const globalLogoUrl = config.global?.logoUrl || '';
      const invoiceConfig = config.formatos_factura || {};
      const logoUrl = invoiceConfig.logoUrl || globalLogoUrl;
      const primaryColor = invoiceConfig.primaryColor || '#1d4ed8'; // Premium blue

      // 1. Header (Logo & Metadata)
      let logoDrawn = false;
      if (logoUrl) {
        try {
          if (logoUrl.startsWith('data:image/')) {
            const base64Data = logoUrl.replace(/^data:image\/\w+;base64,/, '');
            const imgBuffer = Buffer.from(base64Data, 'base64');
            doc.image(imgBuffer, 50, 45, { height: 50 });
            logoDrawn = true;
          }
        } catch (e) {
          console.error("Failed to draw logo in PDF:", e);
        }
      }

      if (!logoDrawn) {
        doc.font(fontBold).fontSize(18).fillColor('#0f172a').text(customer.branch?.tenant?.name || 'CAANMA', 50, 45);
      }

      // Title & Date Metadata (Top Right)
      const today = new Date();
      const currentDateStr = today.toLocaleDateString('es-MX', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      });

      doc.font(fontBold).fontSize(14).fillColor(primaryColor).text('ESTADO DE CUENTA DE CLIENTE', 300, 45, { align: 'right' });
      doc.font(fontRegular).fontSize(8).fillColor('#475569');
      doc.text(`Fecha de Emisión: ${currentDateStr}`, 300, 65, { align: 'right' });
      doc.text(`Fecha de Corte: ${currentDateStr}`, 300, 77, { align: 'right' });
      doc.text(`Moneda: MXN (Pesos Mexicanos)`, 300, 89, { align: 'right' });

      // Horizontal separator line
      doc.moveTo(50, 110).lineTo(562, 110).strokeColor('#e2e8f0').lineWidth(1).stroke();

      // 2. Client Details (Left Column) & Account Summary (Right Column)
      doc.font(fontBold).fontSize(9).fillColor(primaryColor).text('DATOS DEL CLIENTE', 50, 125);
      
      let y = 140;
      doc.font(fontBold).fontSize(8).fillColor('#334155').text('Razón Social:', 50, y);
      doc.font(fontRegular).fillColor('#475569').text(customer.legalName || customer.name, 130, y, { width: 180 });
      
      const RFC = customer.taxId || 'XAXX010101000';
      y += 18;
      doc.font(fontBold).fillColor('#334155').text('RFC / Identificación:', 50, y);
      doc.font(fontRegular).fillColor('#475569').text(RFC, 130, y);

      const limit = customer.creditLimit || 0;
      const balance = customer.creditBalance || 0;
      const creditAvailable = Math.max(0, limit - balance);
      
      y += 15;
      doc.font(fontBold).fillColor('#334155').text('Límite de Crédito:', 50, y);
      doc.font(fontRegular).fillColor('#475569').text(`$${limit.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, 130, y);
      
      y += 15;
      doc.font(fontBold).fillColor('#334155').text('Crédito Disponible:', 50, y);
      doc.font(fontRegular).fillColor('#475569').text(`$${creditAvailable.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, 130, y);

      y += 15;
      doc.font(fontBold).fillColor('#334155').text('Condiciones de Pago:', 50, y);
      doc.font(fontRegular).fillColor('#475569').text(`${customer.creditDays || 30} días neto`, 130, y);

      // Account Summary Calculations (Right Column)
      const activeSales = sales.filter(s => s.status !== 'CANCELLED' && s.balanceDue >= 0.01);
      
      const facturasVencidas = activeSales
        .filter(s => s.invoiceId && s.dueDate && new Date(s.dueDate) < today)
        .reduce((sum, s) => sum + s.balanceDue, 0);

      const facturasVigentes = activeSales
        .filter(s => s.invoiceId && (!s.dueDate || new Date(s.dueDate) >= today))
        .reduce((sum, s) => sum + s.balanceDue, 0);
        
      const notasDeVentaPendientes = activeSales
        .filter(s => !s.invoiceId)
        .reduce((sum, s) => sum + s.balanceDue, 0);
        
      const anticipos = customer.storeCredit || 0;
      const saldoTotalPendiente = (facturasVencidas + facturasVigentes + notasDeVentaPendientes) - anticipos;

      doc.font(fontBold).fontSize(9).fillColor(primaryColor).text('RESUMEN DE CUENTA', 330, 125);
      
      y = 140;
      doc.font(fontRegular).fontSize(8).fillColor('#475569').text('(+) Facturas Vencidas:', 330, y);
      doc.font(fontRegular).text(`$${facturasVencidas.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, 480, y, { align: 'right', width: 80 });
      
      y += 15;
      doc.font(fontRegular).text('(+) Facturas Vigentes:', 330, y);
      doc.font(fontRegular).text(`$${facturasVigentes.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, 480, y, { align: 'right', width: 80 });

      y += 15;
      doc.font(fontRegular).text('(+) Notas de Venta (Por Facturar):', 330, y);
      doc.font(fontRegular).text(`$${notasDeVentaPendientes.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, 480, y, { align: 'right', width: 80 });

      y += 15;
      doc.font(fontRegular).text('(-) Notas de Crédito / Anticipos:', 330, y);
      doc.font(fontRegular).text(`-$${anticipos.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, 480, y, { align: 'right', width: 80 });

      // Total balance highlighted box
      y += 18;
      doc.rect(330, y - 4, 232, 20).fill('#f8fafc');
      doc.font(fontBold).fontSize(9).fillColor('#0f172a').text('(=) SALDO TOTAL PENDIENTE:', 335, y);
      doc.font(fontBold).fillColor(primaryColor).text(`$${saldoTotalPendiente.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, 480, y, { align: 'right', width: 80 });

      // Horizontal separator line
      y += 25;
      doc.moveTo(50, y).lineTo(562, y).strokeColor('#e2e8f0').lineWidth(1).stroke();

      // 3. Pending Movements Table
      y += 15;
      doc.font(fontBold).fontSize(9).fillColor(primaryColor).text('DETALLE DE MOVIMIENTOS PENDIENTES', 50, y);
      
      y += 15;
      doc.rect(50, y, 512, 18).fill(primaryColor);
      doc.font(fontBold).fontSize(7.5).fillColor('#ffffff');
      doc.text('F. Emisión', 55, y + 5);
      doc.text('F. Vence', 110, y + 5);
      doc.text('Tipo Documento', 170, y + 5);
      doc.text('Folio / Ref.', 255, y + 5);
      doc.text('Importe Original', 330, y + 5, { align: 'right', width: 65 });
      doc.text('Total Pendiente', 400, y + 5, { align: 'right', width: 65 });
      doc.text('Días Vencidos', 470, y + 5, { align: 'center', width: 45 });
      doc.text('Estado', 520, y + 5, { align: 'center', width: 40 });

      y += 18;

      // Construct movements
      const movements: any[] = [];
      
      activeSales.forEach(s => {
        const daysOverdue = s.dueDate && today > new Date(s.dueDate)
          ? Math.floor((today.getTime() - new Date(s.dueDate).getTime()) / (1000 * 60 * 60 * 24))
          : 0;
        
        movements.push({
          date: new Date(s.createdAt),
          dueDate: s.dueDate ? new Date(s.dueDate) : null,
          type: s.invoiceId ? '📄 Factura' : '📝 Nota de Venta',
          folio: s.invoiceFolio || s.folio || s.id.slice(0, 8).toUpperCase(),
          original: s.total,
          pending: s.balanceDue,
          daysOverdue,
          status: s.dueDate && today > new Date(s.dueDate) ? 'Vencido' : 'Vigente'
        });
      });

      if (anticipos > 0.01) {
        movements.push({
          date: new Date(),
          dueDate: null,
          type: '🏷️ Nota de Crédito / Anticipo',
          folio: `ANT-${customer.id.slice(0, 6).toUpperCase()}`,
          original: -anticipos,
          pending: -anticipos,
          daysOverdue: 0,
          status: 'A Favor'
        });
      }

      // Sort by date oldest first
      movements.sort((a, b) => a.date.getTime() - b.date.getTime());

      movements.forEach((row, index) => {
        // Handle page break
        if (y > 670) {
          doc.addPage();
          y = 50;
          
          doc.rect(50, y, 512, 18).fill(primaryColor);
          doc.font(fontBold).fontSize(7.5).fillColor('#ffffff');
          doc.text('F. Emisión', 55, y + 5);
          doc.text('F. Vence', 110, y + 5);
          doc.text('Tipo Documento', 170, y + 5);
          doc.text('Folio / Ref.', 255, y + 5);
          doc.text('Importe Original', 330, y + 5, { align: 'right', width: 65 });
          doc.text('Total Pendiente', 400, y + 5, { align: 'right', width: 65 });
          doc.text('Días Vencidos', 470, y + 5, { align: 'center', width: 45 });
          doc.text('Estado', 520, y + 5, { align: 'center', width: 40 });
          y += 18;
        }

        // Draw zebra line background
        if (index % 2 === 1) {
          doc.rect(50, y, 512, 18).fill('#f8fafc');
        }

        doc.font(fontRegular).fontSize(7.5).fillColor('#475569');
        doc.text(row.date.toLocaleDateString('es-MX'), 55, y + 5);
        doc.text(row.dueDate ? row.dueDate.toLocaleDateString('es-MX') : '--', 110, y + 5);
        doc.text(row.type, 170, y + 5);
        doc.text(row.folio, 255, y + 5, { width: 70 });
        
        doc.text(`$${row.original.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, 330, y + 5, { align: 'right', width: 65 });
        doc.text(`$${row.pending.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, 400, y + 5, { align: 'right', width: 65 });
        
        doc.text(row.daysOverdue > 0 ? `${row.daysOverdue} días` : '--', 470, y + 5, { align: 'center', width: 45 });
        
        let statusColor = '#16a34a'; // Green for Vigente / A Favor
        if (row.status === 'Vencido') statusColor = '#ef4444'; // Red for Vencido
        doc.font(fontBold).fillColor(statusColor).text(row.status, 520, y + 5, { align: 'center', width: 40 });

        y += 18;
      });

      // 4. Aging of Balances Summary Table
      y += 12;
      if (y > 610) {
        doc.addPage();
        y = 50;
      }

      doc.font(fontBold).fontSize(9).fillColor(primaryColor).text('RESUMEN DE ANTIGÜEDAD DE SALDOS', 50, y);
      y += 15;

      doc.rect(50, y, 512, 18).fill('#475569');
      doc.font(fontBold).fontSize(7.5).fillColor('#ffffff');
      doc.text('Al Corriente (Vigente)', 50, y + 5, { align: 'center', width: 128 });
      doc.text('Vencido 1 - 30 días', 178, y + 5, { align: 'center', width: 128 });
      doc.text('Vencido 31 - 60 días', 306, y + 5, { align: 'center', width: 128 });
      doc.text('Vencido > 60 días', 434, y + 5, { align: 'center', width: 128 });

      // Aging buckets calculations
      const bucketCurrent = activeSales
        .filter(s => !s.dueDate || new Date(s.dueDate) >= today)
        .reduce((sum, s) => sum + s.balanceDue, 0) - anticipos;
      
      const bucket1to30 = movements
        .filter(m => m.status === 'Vencido' && m.daysOverdue >= 1 && m.daysOverdue <= 30)
        .reduce((sum, m) => sum + m.pending, 0);

      const bucket31to60 = movements
        .filter(m => m.status === 'Vencido' && m.daysOverdue >= 31 && m.daysOverdue <= 60)
        .reduce((sum, m) => sum + m.pending, 0);

      const bucketOver60 = movements
        .filter(m => m.status === 'Vencido' && m.daysOverdue > 60)
        .reduce((sum, m) => sum + m.pending, 0);

      y += 18;
      doc.rect(50, y, 512, 20).fill('#f8fafc');
      doc.font(fontBold).fontSize(8.5).fillColor('#334155');
      doc.text(`$${bucketCurrent.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, 50, y + 6, { align: 'center', width: 128 });
      doc.text(`$${bucket1to30.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, 178, y + 6, { align: 'center', width: 128 });
      doc.text(`$${bucket31to60.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, 306, y + 6, { align: 'center', width: 128 });
      doc.text(`$${bucketOver60.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, 434, y + 6, { align: 'center', width: 128 });

      // 5. Payment Instructions Card
      y += 35;
      if (y > 590) {
        doc.addPage();
        y = 50;
      }

      doc.font(fontBold).fontSize(9).fillColor(primaryColor).text('DATOS PARA REALIZAR SU PAGO', 50, y);
      y += 15;

      doc.rect(50, y, 512, 85).strokeColor('#cbd5e1').lineWidth(1).stroke();

      const bancosConfig = config.bancos || {};
      const accounts = bancosConfig.accounts || [];
      if (accounts.length === 0 && (bancosConfig.bancoPrincipal || bancosConfig.clabePrincipal)) {
        accounts.push({ bank: bancosConfig.bancoPrincipal, clabe: bancosConfig.clabePrincipal });
      }

      let textY = y + 10;
      doc.font(fontBold).fontSize(8).fillColor('#334155');
      
      if (accounts.length > 0) {
        accounts.forEach((acc: any, idx: number) => {
          if (idx < 2) {
            doc.font(fontBold).fillColor('#334155').text('Banco:', 60, textY);
            doc.font(fontRegular).fillColor('#475569').text(acc.bank, 130, textY);
            doc.font(fontBold).fillColor('#334155').text('Cuenta CLABE:', 250, textY);
            doc.font(fontRegular).fillColor('#475569').text(acc.clabe, 330, textY);
            textY += 15;
          }
        });
      } else {
        doc.font(fontBold).fillColor('#334155').text('Banco:', 60, textY);
        doc.font(fontRegular).fillColor('#475569').text('___________________', 130, textY);
        doc.font(fontBold).fillColor('#334155').text('Cuenta CLABE:', 250, textY);
        doc.font(fontRegular).fillColor('#475569').text('___________________', 330, textY);
        textY += 15;
      }

      doc.font(fontBold).fillColor('#334155').text('Beneficiario:', 60, textY);
      doc.font(fontRegular).fillColor('#475569').text(customer.branch?.tenant?.name || customer.branch?.name || 'OFFICE CITY', 130, textY);
      textY += 15;

      doc.font(fontBold).fillColor('#334155').text('Referencia de Pago:', 60, textY);
      doc.font(fontRegular).fillColor('#475569').text(`COLOCAR ${customer.legalName || customer.name}`, 130, textY);
      textY += 15;

      doc.font(fontItalic).fontSize(7.5).fillColor('#475569').text('Por favor, envíe su comprobante de pago a: ', 60, textY, { continued: true });
      doc.font(fontBold).fillColor(primaryColor).text('finanzas@officecity.com.mx');

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}
