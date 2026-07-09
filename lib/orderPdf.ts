import PDFDocument from 'pdfkit';

export function generateOrderPdfBuffer(order: any): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      // Resolve custom Arial fonts path
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

      // Resolve branch/tenant settings
      let config: any = {};
      if (order.branch?.settings?.configJson) {
        try {
          config = JSON.parse(order.branch.settings.configJson);
        } catch (e) {}
      }

      const globalLogoUrl = config.global?.logoUrl || '';
      const invoiceConfig = config.formatos_factura || {};
      const logoUrl = invoiceConfig.logoUrl || globalLogoUrl;
      const primaryColor = '#10b981'; // Emerald green theme for purchase/supplier documents
      
      // Load custom Arial fonts to avoid Helvetica.afm ENOENT errors in Next.js
      let useCustomFonts = false;
      if (hasCustomFonts) {
        try {
          doc.registerFont('Arial', fs.readFileSync(regularPath));
          doc.registerFont('Arial-Bold', fs.readFileSync(boldPath));
          doc.registerFont('Arial-Italic', fs.readFileSync(italicPath));
          useCustomFonts = true;
        } catch (e) {
          console.error("Failed to register custom Arial fonts:", e);
        }
      }

      if (useCustomFonts) {
        doc.addPage();
        doc.font('Arial');
      }

      const fontRegular = useCustomFonts ? 'Arial' : 'Helvetica';
      const fontBold = useCustomFonts ? 'Arial-Bold' : 'Helvetica-Bold';

      // 1. Header
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
          console.error("Failed to draw base64 logo in PDF:", e);
        }
      }

      if (!logoDrawn) {
        doc.font(fontBold).fontSize(20).fillColor('#0f172a').text(order.branch?.tenant?.name || 'OFFICE CITY', 50, 45);
      }

      // Title Box (Top Right)
      const displayFolio = order.id.slice(0, 8).toUpperCase();
      const dateStr = new Date(order.createdAt).toLocaleDateString('es-MX', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      doc.font(fontBold).fontSize(14).fillColor(primaryColor).text('ORDEN DE COMPRA / PEDIDO', 350, 45, { align: 'right' });
      doc.font(fontRegular).fontSize(10).fillColor('#475569').text(`Folio del Pedido: #${displayFolio}`, 350, 65, { align: 'right' });
      doc.text(`Fecha de Emisión: ${dateStr}`, 350, 80, { align: 'right' });

      // Branch Details (Client destination info)
      const branchName = order.branch?.name || 'Matriz';
      const branchAddress = order.branch?.location || '';
      doc.font(fontRegular).fontSize(8).fillColor('#64748b');
      doc.text(`Destino: Sucursal ${branchName}`, 50, 105);
      if (branchAddress) {
        doc.text(branchAddress.replace(/\n/g, ', '), 50, 117, { width: 300 });
      }

      // Colored rule line
      doc.strokeColor(primaryColor).lineWidth(2).moveTo(50, 140).lineTo(562, 140).stroke();

      // 2. Info Cards (Supplier and Purchase details)
      doc.font(fontBold).fontSize(9).fillColor(primaryColor).text('DATOS DEL PROVEEDOR', 50, 160);
      doc.font(fontBold).fontSize(10).fillColor('#1e293b').text(order.supplier?.legalName || order.supplier?.name || 'Proveedor General', 50, 175);
      doc.font(fontRegular).fontSize(9).fillColor('#475569');
      if (order.supplier?.taxId) doc.text(`RFC: ${order.supplier.taxId}`, 50, 190);
      if (order.supplier?.phone) doc.text(`Teléfono: ${order.supplier.phone}`, 50, 203);
      if (order.supplier?.email) doc.text(`Email: ${order.supplier.email}`, 50, 216);
      
      // Address construction
      const addrParts = [
        order.supplier?.street,
        order.supplier?.exteriorNumber ? `No. ${order.supplier.exteriorNumber}` : '',
        order.supplier?.interiorNumber ? `Int. ${order.supplier.interiorNumber}` : '',
        order.supplier?.neighborhood,
        order.supplier?.city,
        order.supplier?.state,
        order.supplier?.zipCode ? `CP. ${order.supplier.zipCode}` : ''
      ].filter(Boolean);
      if (addrParts.length > 0) {
        doc.text(`Dirección: ${addrParts.join(', ')}`, 50, 229, { width: 280 });
      }

      doc.font(fontBold).fontSize(9).fillColor(primaryColor).text('DETALLES DEL PEDIDO', 350, 160);
      doc.font(fontRegular).fontSize(9).fillColor('#475569');
      doc.text(`Moneda: MXN (Pesos Mexicanos)`, 350, 175);
      doc.text(`Estado del Pedido: ${order.status === 'PENDING' ? 'PENDIENTE (Borrador)' : order.status}`, 350, 188);
      doc.text(`Solicitado por: ${order.user?.name || 'Sistema'}`, 350, 201);

      // 3. Items Table Header
      const tableTop = 270;
      doc.fillColor('#f8fafc').rect(50, tableTop, 512, 20).fill();
      doc.strokeColor('#e2e8f0').lineWidth(1).rect(50, tableTop, 512, 20).stroke();

      doc.font(fontBold).fontSize(8).fillColor('#475569');
      doc.text('Cant', 55, tableTop + 6, { width: 35, align: 'center' });
      doc.text('Código/SKU', 95, tableTop + 6, { width: 100, align: 'left' });
      doc.text('Descripción del Artículo', 200, tableTop + 6, { width: 185, align: 'left' });
      doc.text('Costo Unit.', 390, tableTop + 6, { width: 80, align: 'right' });
      doc.text('Importe', 475, tableTop + 6, { width: 82, align: 'right' });

      // Table Rows
      let currentY = tableTop + 20;
      order.items.forEach((item: any) => {
        const textHeight = doc.heightOfString(item.product?.name || 'Artículo sin nombre', { width: 185 });
        const rowHeight = Math.max(22, textHeight + 10);

        if (currentY + rowHeight > 650) {
          doc.addPage();
          currentY = 50;

          // Redraw header
          doc.fillColor('#f8fafc').rect(50, currentY, 512, 20).fill();
          doc.strokeColor('#e2e8f0').lineWidth(1).rect(50, currentY, 512, 20).stroke();

          doc.font(fontBold).fontSize(8).fillColor('#475569');
          doc.text('Cant', 55, currentY + 6, { width: 35, align: 'center' });
          doc.text('Código/SKU', 95, currentY + 6, { width: 100, align: 'left' });
          doc.text('Descripción del Artículo', 200, currentY + 6, { width: 185, align: 'left' });
          doc.text('Costo Unit.', 390, currentY + 6, { width: 80, align: 'right' });
          doc.text('Importe', 475, currentY + 6, { width: 82, align: 'right' });

          currentY += 20;
        }

        // Zebra lines
        doc.fillColor('#ffffff').rect(50, currentY, 512, rowHeight).fill();
        doc.strokeColor('#f1f5f9').lineWidth(0.5).rect(50, currentY, 512, rowHeight).stroke();

        doc.font(fontRegular).fontSize(8).fillColor('#334155');
        doc.text(`${item.quantity} pzas`, 55, currentY + 6, { width: 35, align: 'center' });
        doc.text(item.product?.sku || item.product?.barcode || '-', 95, currentY + 6, { width: 100 });
        doc.text(item.product?.name || 'Artículo sin nombre', 200, currentY + 6, { width: 185 });
        doc.text(`$${item.cost.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, 390, currentY + 6, { width: 80, align: 'right' });
        
        const rowTotal = item.quantity * item.cost;
        doc.font(fontBold).text(`$${rowTotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, 475, currentY + 6, { width: 82, align: 'right' });

        currentY += rowHeight;
      });

      // 4. Totals and Notes Box
      if (currentY + 120 > 750) {
        doc.addPage();
        currentY = 50;
      }

      // Border and Background
      doc.strokeColor('#cbd5e1').lineWidth(1).rect(50, currentY + 10, 512, 100).stroke();
      doc.fillColor('#f8fafc').rect(51, currentY + 11, 510, 98).fill();

      // Total estimated box (Right side)
      doc.fillColor(primaryColor).rect(360, currentY + 10, 202, 100).fill();
      
      doc.font(fontBold).fontSize(9).fillColor('#ffffff');
      doc.text('TOTAL ESTIMADO', 370, currentY + 30, { width: 182, align: 'center' });
      doc.fontSize(16).text(`$${order.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, 370, currentY + 48, { width: 182, align: 'center' });
      doc.fontSize(8).text('Pesos Mexicanos (MXN)', 370, currentY + 74, { width: 182, align: 'center' });

      // Notes (Left side)
      doc.font(fontBold).fontSize(8).fillColor('#475569').text('COMENTARIOS / INSTRUCCIONES:', 65, currentY + 20);
      doc.font(fontRegular).fontSize(8).fillColor('#334155').text(
        order.notes || 'Sin comentarios o notas adicionales para este pedido.', 
        65, 
        currentY + 35, 
        { width: 280, height: 60 }
      );

      // Footnote
      doc.font(fontRegular).fontSize(7).fillColor('#94a3b8').text(
        'Este documento es una orden de compra estimada y no representa una factura fiscal ni un comprobante de pago.',
        50,
        740,
        { align: 'center', width: 512 }
      );

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}
