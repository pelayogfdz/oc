import nodemailer from 'nodemailer';
import { prisma } from './prisma';

const portGlobal = parseInt(process.env.SMTP_PORT || '465', 10);
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.zoho.com',
  port: portGlobal,
  secure: portGlobal === 465, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

async function getTransporterAndSender(branchId?: string | null) {
  // Default values from environment variables
  let host = process.env.SMTP_HOST || 'smtp.zoho.com';
  let port = parseInt(process.env.SMTP_PORT || '465', 10);
  let secure = port === 465;
  let user = process.env.SMTP_USER;
  let pass = process.env.SMTP_PASS;
  let fromName = '';
  let isCustom = false;
  let tenantName = 'CAANMA';
  let branchName = '';

  if (branchId) {
    try {
      const branch = await prisma.branch.findUnique({
        where: { id: branchId },
        include: { tenant: true }
      });
      if (branch) {
        branchName = branch.name;
        if (branch.tenant) {
          tenantName = branch.tenant.name;
        }
      }

      const settings = await prisma.branchSettings.findUnique({
        where: { branchId }
      });
      if (settings && settings.configJson) {
        const config = JSON.parse(settings.configJson)['notificaciones'] || {};
        if (config.smtpHost && config.smtpUser && config.smtpPass) {
          host = config.smtpHost.trim();
          port = parseInt(config.smtpPort || '465', 10);
          secure = config.smtpSecure === 'true' || config.smtpSecure === true;
          user = config.smtpUser.trim();
          pass = config.smtpPass.trim();
          if (config.emailFromName) {
            fromName = config.emailFromName.trim();
          }
          isCustom = true;
        }
      }
    } catch (e) {
      console.error("Error loading branch SMTP settings:", e);
    }
  }

  const transporterInstance = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass,
    },
  });

  const safeSendMail = async (options: any) => {
    try {
      return await transporterInstance.sendMail(options);
    } catch (err: any) {
      if (isCustom && process.env.SMTP_USER && process.env.SMTP_PASS) {
        console.warn(`⚠️ Custom SMTP failed (${user}@${host}): ${err.message || err}. Falling back to CAANMA default SMTP.`);
        const fallbackOptions = { ...options };
        if (typeof fallbackOptions.from === 'string') {
          fallbackOptions.from = fallbackOptions.from.replace(/<[^>]+>/, `<${process.env.SMTP_USER}>`);
        } else {
          fallbackOptions.from = process.env.SMTP_USER;
        }
        return await transporter.sendMail(fallbackOptions);
      }
      throw err;
    }
  };

  return {
    transporter: {
      sendMail: safeSendMail
    } as any,
    fromEmail: user,
    fromName,
    isCustom,
    tenantName,
    branchName,
    configured: !!(user && pass)
  };
}

export const sendTemporaryPasswordEmail = async (to: string, tempPassword: string) => {
  // If credentials are not set, we just log it for development purposes
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    if (process.env.NODE_ENV === 'production') {
      console.error('❌ Error: SMTP credentials are not configured in production environment.');
      return { success: false, error: 'SMTP credentials not configured' };
    }
    console.warn('⚠️ SMTP credentials not set. Simulating email sending.');
    console.log(`[EMAIL SIMULADO] Destino: ${to} | Contraseña Temporal: ${tempPassword}`);
    return { success: true, simulated: true };
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.URL || 'https://caanma.com';
  const resetLink = `${baseUrl}/login?resetEmail=${encodeURIComponent(to)}&tempPassword=${encodeURIComponent(tempPassword)}`;

  try {
    const info = await transporter.sendMail({
      from: `"Soporte CAANMA" <${process.env.SMTP_USER}>`,
      to,
      subject: 'Recuperación de Contraseña - CAANMA',
      text: `Has solicitado recuperar tu contraseña. \n\nTu contraseña temporal es: ${tempPassword}\n\nPuedes ingresar directamente y restablecer tu contraseña haciendo clic en el siguiente enlace:\n${resetLink}\n\nPor favor, ingresa al sistema utilizando esta contraseña. Se te solicitará crear una nueva contraseña de forma obligatoria por seguridad.\n\nEl equipo de CAANMA.`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eaeaea; border-radius: 8px;">
          <h2 style="color: #4F46E5; text-align: center;">Recuperación de Contraseña</h2>
          <p>Has solicitado recuperar tu contraseña de acceso a CAANMA.</p>
          <p>Tu contraseña temporal es:</p>
          <div style="background-color: #f3f4f6; padding: 15px; border-radius: 6px; font-size: 18px; font-weight: bold; letter-spacing: 2px; text-align: center; margin: 20px 0; font-family: monospace;">
            ${tempPassword}
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetLink}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; box-shadow: 0 4px 6px -1px rgba(79, 70, 229, 0.2);">
              Restablecer Contraseña Directamente
            </a>
          </div>

          <p>Al hacer clic en el botón de arriba, se te redirigirá automáticamente a la página donde podrás establecer tu nueva contraseña sin tener que escribir la contraseña temporal manualmente.</p>
          <p>Si el botón no funciona, puedes copiar y pegar el siguiente enlace en tu navegador:</p>
          <p style="word-break: break-all; font-size: 13px; color: #4F46E5;"><a href="${resetLink}">${resetLink}</a></p>
          
          <hr style="border: none; border-top: 1px solid #eaeaea; margin: 20px 0;" />
          <p style="font-size: 12px; color: #888; text-align: center;">Si no solicitaste este cambio, puedes ignorar este correo de forma segura.</p>
        </div>
      `,
    });

    console.log('Mensaje enviado: %s', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error al enviar el correo:', error);
    return { success: false, error };
  }
};

export const sendTaskEmail = async (to: string, taskTitle: string, instructions: string, creatorName: string) => {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    if (process.env.NODE_ENV === 'production') {
      console.error('❌ Error: SMTP credentials are not configured in production environment.');
      return { success: false, error: 'SMTP credentials not configured' };
    }
    console.warn('⚠️ SMTP credentials not set. Simulating task email sending.');
    console.log(`[EMAIL SIMULADO TAREA] Destino: ${to} | Tarea: ${taskTitle} | Asignado por: ${creatorName} | Instrucciones: ${instructions}`);
    return { success: true, simulated: true };
  }

  try {
    const info = await transporter.sendMail({
      from: `"Gestión de Tareas - CAANMA" <${process.env.SMTP_USER}>`,
      to,
      subject: `Nueva Tarea Asignada: ${taskTitle}`,
      text: `Hola,\n\nSe te ha asignado una nueva tarea: "${taskTitle}" por ${creatorName}.\n\nInstrucciones:\n${instructions}\n\nPor favor, ingresa al sistema para realizarla y subir la evidencia correspondiente.\n\nEl equipo de CAANMA.`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px;">
          <h2 style="color: #4F46E5; margin-top: 0;">Nueva Tarea Asignada</h2>
          <p>Hola,</p>
          <p>Se te ha asignado una nueva tarea en la plataforma CAANMA:</p>
          <div style="background-color: #f3f4f6; padding: 15px; border-radius: 6px; margin: 15px 0;">
            <h3 style="margin: 0 0 10px 0; color: #1f2937;">${taskTitle}</h3>
            <p style="margin: 0; font-size: 14px; color: #4b5563;"><strong>Asignado por:</strong> ${creatorName}</p>
          </div>
          <h4 style="color: #374151; margin-bottom: 8px;">Instrucciones:</h4>
          <div style="background-color: #fafafa; padding: 15px; border-left: 4px solid #4F46E5; border-radius: 4px; font-family: monospace; white-space: pre-wrap; margin-bottom: 20px;">
            ${instructions}
          </div>
          <p>Por favor, ingresa a la aplicación para subir la evidencia (fotografía o archivo) una vez realizada.</p>
          <hr style="border: none; border-top: 1px solid #eaeaea; margin: 20px 0;" />
          <p style="font-size: 12px; color: #888; text-align: center;">Este es un correo automático de CAANMA, por favor no respondas directamente.</p>
        </div>
      `,
    });

    console.log('Mensaje de tarea enviado: %s', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error al enviar el correo de tarea:', error);
    return { success: false, error };
  }
};

export const sendSaleNotificationEmail = async (
  to: string,
  sale: any,
  isPickup: boolean,
  pickupCode?: string | null
) => {
  const { transporter: customTransporter, fromEmail, fromName, isCustom, configured } = await getTransporterAndSender(sale.branchId);
  const brandName = isCustom ? fromName : "PETQRO Showroom";

  if (!configured) {
    if (process.env.NODE_ENV === 'production') {
      console.error('❌ Error: SMTP credentials are not configured in production environment.');
      return { success: false, error: 'SMTP credentials not configured' };
    }
    console.warn('⚠️ SMTP credentials not set. Simulating sale email sending.');
    console.log(`[EMAIL SIMULADO VENTA] Destino: ${to} | Código Recolección: ${pickupCode || 'N/A'}`);
    return { success: true, simulated: true };
  }

  try {
    const itemsListHtml = sale.items.map((item: any) => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #eaeaea;">${item.product.name} (SKU: ${item.product.sku})</td>
        <td style="padding: 8px; border-bottom: 1px solid #eaeaea; text-align: center;">${item.quantity}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eaeaea; text-align: right;">$${item.price.toFixed(2)} MXN</td>
        <td style="padding: 8px; border-bottom: 1px solid #eaeaea; text-align: right;">$${(item.quantity * item.price).toFixed(2)} MXN</td>
      </tr>
    `).join('');

    const deliveryDetailsHtml = isPickup 
      ? `
        <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3 style="color: #166534; margin-top: 0;">📍 Listo para Recolección en Tienda</h3>
          <p>Tu pedido estará listo en 30 minutos (Click & Collect) en la sucursal seleccionada.</p>
          <p style="font-size: 16px; margin-bottom: 5px;"><strong>Código de Recolección:</strong></p>
          <div style="background-color: #ffffff; border: 2px dashed #166534; padding: 10px; font-size: 20px; font-weight: bold; letter-spacing: 2px; text-align: center; margin: 10px 0; color: #166534;">
            ${pickupCode}
          </div>
          <p style="font-size: 12px; color: #666; margin-bottom: 0;">Muestra este código al personal en tienda para retirar tus productos.</p>
        </div>
      `
      : `
        <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3 style="color: #1e3a8a; margin-top: 0;">🚚 Envío a Domicilio Confirmado</h3>
          <p>Hemos registrado tu dirección y estamos preparando tu entrega express.</p>
          <p>Tu pedido se entregará en la dirección proporcionada.</p>
        </div>
      `;

    const info = await customTransporter.sendMail({
      from: `"${brandName}" <${fromEmail}>`,
      to,
      subject: isCustom ? `Confirmación de Pedido - Folio #${sale.id.slice(0, 8)}` : `Confirmación de Pedido PETQRO - Folio #${sale.id.slice(0, 8)}`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eaeaea; border-radius: 8px;">
          <div style="text-align: center; border-bottom: 2px solid #0ea5e9; padding-bottom: 20px;">
            <h1 style="color: #0ea5e9; margin: 0; font-size: 28px;">¡Gracias por tu compra!</h1>
            <p style="color: #666; margin: 5px 0 0 0;">Pedido de ${brandName}</p>
          </div>
          
          ${deliveryDetailsHtml}

          <h3 style="color: #333; border-bottom: 1px solid #eaeaea; padding-bottom: 8px;">Resumen del Pedido</h3>
          <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
            <thead>
              <tr style="background-color: #f8fafc;">
                <th style="padding: 8px; border-bottom: 2px solid #eaeaea; text-align: left;">Producto</th>
                <th style="padding: 8px; border-bottom: 2px solid #eaeaea; text-align: center;">Cant.</th>
                <th style="padding: 8px; border-bottom: 2px solid #eaeaea; text-align: right;">Precio Unit.</th>
                <th style="padding: 8px; border-bottom: 2px solid #eaeaea; text-align: right;">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              ${itemsListHtml}
            </tbody>
            <tfoot>
              <tr>
                <td colspan="3" style="padding: 10px 8px; text-align: right; font-weight: bold; font-size: 16px;">Total:</td>
                <td style="padding: 10px 8px; text-align: right; font-weight: bold; font-size: 16px; color: #0ea5e9;">$${sale.total.toFixed(2)} MXN</td>
              </tr>
            </tfoot>
          </table>

          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eaeaea; text-align: center; font-size: 12px; color: #888;">
            <p>Este es un correo automático, por favor no respondas a esta dirección.</p>
            <p><strong>${brandName} & CAANMA ERP</strong></p>
          </div>
        </div>
      `,
    });

    console.log('Correo de venta enviado: %s', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error al enviar el correo de venta:', error);
    return { success: false, error };
  }
};

export const sendQuoteNotificationEmail = async (
  to: string,
  quote: any
) => {
  const { transporter: customTransporter, fromEmail, fromName, isCustom, tenantName, configured } = await getTransporterAndSender(quote.branchId);
  const finalFromName = isCustom ? fromName : `${tenantName} Cotizaciones`;

  if (!configured) {
    if (process.env.NODE_ENV === 'production') {
      console.error('❌ Error: SMTP credentials are not configured in production environment.');
      return { success: false, error: 'SMTP credentials not configured' };
    }
    console.warn('⚠️ SMTP credentials not set. Simulating quote email sending.');
    console.log(`[EMAIL SIMULADO COTIZACIÓN] Destino: ${to} | Folio: ${quote.folio || quote.id.slice(0, 8)}`);
    return { success: true, simulated: true };
  }

  try {
    const itemsListHtml = quote.items.map((item: any) => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #eaeaea; font-size: 13px;">${item.product?.name || 'Artículo'} (SKU: ${item.product?.sku || 'N/A'})</td>
        <td style="padding: 8px; border-bottom: 1px solid #eaeaea; text-align: center; font-size: 13px;">${item.quantity}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eaeaea; text-align: right; font-size: 13px;">$${item.price.toFixed(2)}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eaeaea; text-align: right; font-size: 13px;">$${(item.quantity * item.price).toFixed(2)}</td>
      </tr>
    `).join('');

    const displayFolio = quote.folio || quote.id.slice(0, 8).toUpperCase();
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.URL || 'https://caanma.com';
    const link = `${baseUrl}/ventas/detalle/${quote.id}/imprimir-cotizacion`;

    // Generate PDF attachment
    let attachments: any[] = [];
    try {
      const { generateQuotePdfBuffer } = await import('./quotePdf');
      const pdfBuffer = await generateQuotePdfBuffer(quote);
      attachments.push({
        filename: `cotizacion_${displayFolio}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf'
      });
    } catch (e) {
      console.error("Failed to generate quote PDF for email attachment:", e);
    }

    const info = await customTransporter.sendMail({
      from: `"${finalFromName}" <${fromEmail}>`,
      to,
      subject: `Nueva Cotización Realizada - Folio #${displayFolio}`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eaeaea; border-radius: 8px; box-sizing: border-box;">
          <div style="text-align: center; border-bottom: 2px solid #0ea5e9; padding-bottom: 20px;">
            <h1 style="color: #0ea5e9; margin: 0; font-size: 28px;">Cotización de Venta</h1>
            <p style="color: #666; margin: 5px 0 0 0;">Folio #${displayFolio}</p>
          </div>
          
          <p>Estimado(a) <strong>${quote.customer?.name || 'Cliente'}</strong>,</p>
          <p>Le compartimos la cotización detallada de su solicitud. Puede consultar el documento original o imprimirlo en el siguiente enlace:</p>
          
          <div style="text-align: center; margin: 25px 0;">
            <a href="${link}" target="_blank" style="background-color: #0ea5e9; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; box-shadow: 0 4px 6px -1px rgba(14, 165, 233, 0.2);">
              Ver / Imprimir Cotización Completa
            </a>
          </div>

          <h3 style="color: #333; border-bottom: 1px solid #eaeaea; padding-bottom: 8px;">Resumen del Pedido</h3>
          <div style="width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch; margin: 15px 0;">
            <table style="width: 100%; min-width: 500px; border-collapse: collapse; font-size: 13px;">
              <thead>
                <tr style="background-color: #f8fafc;">
                  <th style="padding: 8px; border-bottom: 2px solid #eaeaea; text-align: left;">Producto</th>
                  <th style="padding: 8px; border-bottom: 2px solid #eaeaea; text-align: center; width: 60px;">Cant.</th>
                  <th style="padding: 8px; border-bottom: 2px solid #eaeaea; text-align: right; width: 110px;">Precio U. (MXN)</th>
                  <th style="padding: 8px; border-bottom: 2px solid #eaeaea; text-align: right; width: 110px;">Subtotal (MXN)</th>
                </tr>
              </thead>
              <tbody>
                ${itemsListHtml}
              </tbody>
              <tfoot>
                <tr>
                  <td colspan="3" style="padding: 10px 8px; text-align: right; font-weight: bold; font-size: 15px;">Total:</td>
                  <td style="padding: 10px 8px; text-align: right; font-weight: bold; font-size: 15px; color: #0ea5e9;">$${quote.total.toFixed(2)} MXN</td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eaeaea; text-align: center; font-size: 12px; color: #888;">
            <p>Se adjunta la versión formal en PDF a este correo para su conveniencia.</p>
            <p>Este es un correo automático de ${tenantName}, por favor no responda directamente.</p>
            <p><strong>${tenantName} ERP</strong></p>
          </div>
        </div>
      `,
      attachments
    });

    console.log('Correo de cotización enviado: %s', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error: any) {
    console.error('Error al enviar el correo de cotización:', error);
    return { success: false, error: error.message || error };
  }
};

export const sendInvoiceNotificationEmail = async (
  to: string,
  sale: any,
  pdfBuffer: Buffer,
  xmlBuffer?: Buffer
) => {
  const { transporter: customTransporter, fromEmail, fromName, isCustom, tenantName, configured } = await getTransporterAndSender(sale.branchId);
  const brandName = isCustom ? fromName : `${tenantName} Facturación`;

  if (!configured) {
    if (process.env.NODE_ENV === 'production') {
      console.error('❌ Error: SMTP credentials are not configured in production environment.');
      return { success: false, error: 'SMTP credentials not configured' };
    }
    console.warn('⚠️ SMTP credentials not set. Simulating invoice email sending.');
    console.log(`[EMAIL SIMULADO FACTURA] Destino: ${to} | Folio CFDI: ${sale.invoiceFolio || sale.invoiceId}`);
    return { success: true, simulated: true };
  }

  const attachments = [
    {
      filename: `Factura_${sale.invoiceFolio || sale.invoiceId || 'CFDI'}.pdf`,
      content: pdfBuffer,
      contentType: 'application/pdf'
    }
  ];

  if (xmlBuffer) {
    attachments.push({
      filename: `Factura_${sale.invoiceFolio || sale.invoiceId || 'CFDI'}.xml`,
      content: xmlBuffer,
      contentType: 'application/xml'
    });
  }

  try {
    const info = await customTransporter.sendMail({
      from: `"${brandName}" <${fromEmail}>`,
      to,
      subject: `Comprobante Fiscal Digital (CFDI) - Folio #${sale.invoiceFolio || sale.invoiceId || sale.id.slice(0, 8)}`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eaeaea; border-radius: 8px;">
          <div style="text-align: center; border-bottom: 2px solid #0ea5e9; padding-bottom: 20px;">
            <h1 style="color: #0ea5e9; margin: 0; font-size: 28px;">Factura Electrónica</h1>
            <p style="color: #666; margin: 5px 0 0 0;">Folio #${sale.invoiceFolio || sale.invoiceId || sale.id.slice(0, 8)}</p>
          </div>
          
          <p>Estimado(a) <strong>${sale.customer?.name || 'Cliente'}</strong>,</p>
          <p>Le compartimos el Comprobante Fiscal Digital (CFDI) correspondiente a su compra realizada.</p>
          <p>Adjunto a este correo encontrará los archivos <strong>PDF</strong> y <strong>XML</strong> de su factura para su descarga.</p>
          
          <h3 style="color: #333; border-bottom: 1px solid #eaeaea; padding-bottom: 8px;">Detalles del Comprobante</h3>
          <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
            <tr>
              <td style="padding: 8px; font-weight: bold; width: 30%;">Venta:</td>
              <td style="padding: 8px;">#${sale.folio || sale.id.slice(0, 8)}</td>
            </tr>
            <tr>
              <td style="padding: 8px; font-weight: bold;">Folio Fiscal CFDI:</td>
              <td style="padding: 8px;">${sale.invoiceFolio || sale.invoiceId}</td>
            </tr>
            <tr>
              <td style="padding: 8px; font-weight: bold;">Total:</td>
              <td style="padding: 8px; font-weight: bold; color: #0ea5e9;">$${sale.total.toFixed(2)} MXN</td>
            </tr>
          </table>

          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eaeaea; text-align: center; font-size: 12px; color: #888;">
            <p>Este es un correo automático de ${tenantName}, por favor no responda directamente.</p>
            <p><strong>${tenantName} ERP</strong></p>
          </div>
        </div>
      `,
      attachments
    });

    console.log('Correo de factura enviado: %s', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error: any) {
    console.error('Error al enviar el correo de factura:', error);
    return { success: false, error: error.message || error };
  }
};

export const sendPaymentComplementNotificationEmail = async (
  to: string,
  customer: any,
  amount: number,
  receiptId: string,
  pdfBuffer: Buffer,
  xmlBuffer?: Buffer
) => {
  const { transporter: customTransporter, fromEmail, fromName, isCustom, tenantName, configured } = await getTransporterAndSender(customer.branchId);
  const brandName = isCustom ? fromName : `${tenantName} Facturación`;

  if (!configured) {
    if (process.env.NODE_ENV === 'production') {
      console.error('❌ Error: SMTP credentials are not configured in production environment.');
      return { success: false, error: 'SMTP credentials not configured' };
    }
    console.warn('⚠️ SMTP credentials not set. Simulating payment complement email sending.');
    console.log(`[EMAIL SIMULADO COMPLEMENTO PAGO] Destino: ${to} | Recibo ID: ${receiptId}`);
    return { success: true, simulated: true };
  }

  const attachments = [
    {
      filename: `Complemento_Pago_${receiptId}.pdf`,
      content: pdfBuffer,
      contentType: 'application/pdf'
    }
  ];

  if (xmlBuffer) {
    attachments.push({
      filename: `Complemento_Pago_${receiptId}.xml`,
      content: xmlBuffer,
      contentType: 'application/xml'
    });
  }

  try {
    const info = await customTransporter.sendMail({
      from: `"${brandName}" <${fromEmail}>`,
      to,
      subject: `Comprobante de Recepción de Pagos (REP) - Recibo #${receiptId}`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eaeaea; border-radius: 8px;">
          <div style="text-align: center; border-bottom: 2px solid #10b981; padding-bottom: 20px;">
            <h1 style="color: #10b981; margin: 0; font-size: 28px;">Complemento de Pago</h1>
            <p style="color: #666; margin: 5px 0 0 0;">Recibo #${receiptId}</p>
          </div>
          
          <p>Estimado(a) cliente <strong>${customer.legalName || customer.name}</strong>,</p>
          <p>Le compartimos el Comprobante de Recepción de Pagos (Complemento de Pago) correspondiente a su abono recibido.</p>
          <p>Adjunto a este correo encontrará los archivos <strong>PDF</strong> y <strong>XML</strong> del complemento para su descarga.</p>
          
          <h3 style="color: #333; border-bottom: 1px solid #eaeaea; padding-bottom: 8px;">Detalles del Pago</h3>
          <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
            <tr>
              <td style="padding: 8px; font-weight: bold; width: 30%;">Monto Recibido:</td>
              <td style="padding: 8px; font-weight: bold; color: #10b981;">$${amount.toFixed(2)} MXN</td>
            </tr>
            <tr>
              <td style="padding: 8px; font-weight: bold;">Folio Fiscal Complemento:</td>
              <td style="padding: 8px;">${receiptId}</td>
            </tr>
          </table>

          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eaeaea; text-align: center; font-size: 12px; color: #888;">
            <p>Este es un correo automático de ${tenantName}, por favor no responda directamente.</p>
            <p><strong>${tenantName} ERP</strong></p>
          </div>
        </div>
      `,
      attachments
    });

    console.log('Correo de complemento de pago enviado: %s', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error: any) {
    console.error('Error al enviar el correo de complemento de pago:', error);
    return { success: false, error: error.message || error };
  }
};

export const sendCreditNoteNotificationEmail = async (
  to: string,
  customer: any,
  creditNote: {
    folio: string;
    uuid?: string | null;
    amount: number;
    reason?: string | null;
    typeLabel: string;
    saleFolio: string;
  },
  pdfBuffer: Buffer,
  xmlBuffer?: Buffer | null,
  branchId?: string | null
) => {
  const { transporter: customTransporter, fromEmail, fromName, isCustom, tenantName, configured } = await getTransporterAndSender(branchId);
  const brandName = isCustom ? fromName : `${tenantName} Facturación`;

  if (!configured) {
    if (process.env.NODE_ENV === 'production') {
      console.error('❌ Error: SMTP credentials are not configured in production environment.');
      return { success: false, error: 'SMTP credentials not configured' };
    }
    console.warn('⚠️ SMTP credentials not set. Simulating credit note email sending.');
    console.log(`[EMAIL SIMULADO NOTA DE CRÉDITO] Destino: ${to} | Folio: ${creditNote.folio}`);
    return { success: true, simulated: true };
  }

  const attachments: any[] = [
    {
      filename: `Nota_Credito_${creditNote.folio}.pdf`,
      content: pdfBuffer,
      contentType: 'application/pdf'
    }
  ];

  if (xmlBuffer) {
    attachments.push({
      filename: `Nota_Credito_${creditNote.folio}.xml`,
      content: xmlBuffer,
      contentType: 'application/xml'
    });
  }

  try {
    const info = await customTransporter.sendMail({
      from: `"${brandName}" <${fromEmail}>`,
      to,
      subject: `Nota de Crédito (CFDI Egreso) #${creditNote.folio} - ${tenantName}`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eaeaea; border-radius: 8px;">
          <div style="text-align: center; border-bottom: 2px solid #ef4444; padding-bottom: 20px;">
            <h1 style="color: #ef4444; margin: 0; font-size: 28px;">Nota de Crédito</h1>
            <p style="color: #666; margin: 5px 0 0 0;">Folio #${creditNote.folio}</p>
          </div>
          
          <p>Estimado(a) cliente <strong>${customer?.legalName || customer?.name || 'Cliente'}</strong>,</p>
          <p>Le compartimos el comprobante de <strong>Nota de Crédito (${creditNote.typeLabel})</strong> emitido con relación a su compra con Folio <strong>#${creditNote.saleFolio}</strong>.</p>
          <p>Adjunto a este correo encontrará los archivos oficiales <strong>PDF</strong> y <strong>XML</strong> correspondientes.</p>
          
          <h3 style="color: #333; border-bottom: 1px solid #eaeaea; padding-bottom: 8px;">Detalles del Comprobante</h3>
          <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
            <tr>
              <td style="padding: 8px; font-weight: bold; width: 40%;">Monto Acreditado:</td>
              <td style="padding: 8px; font-weight: bold; color: #ef4444; font-size: 16px;">$${creditNote.amount.toFixed(2)} MXN</td>
            </tr>
            <tr>
              <td style="padding: 8px; font-weight: bold;">Tipo de Movimiento:</td>
              <td style="padding: 8px;">${creditNote.typeLabel}</td>
            </tr>
            <tr>
              <td style="padding: 8px; font-weight: bold;">Venta / Factura Afectada:</td>
              <td style="padding: 8px;">#${creditNote.saleFolio}</td>
            </tr>
            ${creditNote.uuid && creditNote.uuid !== 'LOCAL' ? `
            <tr>
              <td style="padding: 8px; font-weight: bold;">Folio Fiscal (UUID SAT):</td>
              <td style="padding: 8px; font-family: monospace; font-size: 12px;">${creditNote.uuid}</td>
            </tr>
            ` : ''}
            ${creditNote.reason ? `
            <tr>
              <td style="padding: 8px; font-weight: bold;">Motivo:</td>
              <td style="padding: 8px; color: #64748b;">${creditNote.reason}</td>
            </tr>
            ` : ''}
          </table>

          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eaeaea; text-align: center; font-size: 12px; color: #888;">
            <p>Este es un correo automático de ${tenantName}, por favor no responda directamente a esta dirección.</p>
            <p><strong>${tenantName} ERP</strong></p>
          </div>
        </div>
      `,
      attachments
    });

    console.log('Correo de nota de crédito enviado: %s', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error: any) {
    console.error('Error al enviar el correo de nota de crédito:', error);
    return { success: false, error: error.message || error };
  }
};

export const sendPurchaseOrderEmail = async (
  to: string,
  purchase: any
) => {
  const { transporter: customTransporter, fromEmail, fromName, isCustom, tenantName, configured } = await getTransporterAndSender(purchase.branchId);
  const finalFromName = isCustom ? fromName : `${tenantName} Compras`;

  if (!configured) {
    if (process.env.NODE_ENV === 'production') {
      console.error('❌ Error: SMTP credentials are not configured in production environment.');
      return { success: false, error: 'SMTP credentials not configured' };
    }
    console.warn('⚠️ SMTP credentials not set. Simulating purchase order email sending.');
    console.log(`[EMAIL SIMULADO ORDEN DE COMPRA] Destino: ${to} | Folio: ${purchase.folio || purchase.id.slice(0, 8)}`);
    return { success: true, simulated: true };
  }

  try {
    const itemsListHtml = purchase.items.map((item: any) => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #eaeaea; font-size: 13px;">${item.product?.name || 'Artículo'} (SKU: ${item.product?.sku || 'N/A'})</td>
        <td style="padding: 8px; border-bottom: 1px solid #eaeaea; text-align: center; font-size: 13px;">${item.quantity}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eaeaea; text-align: right; font-size: 13px;">$${item.cost.toFixed(2)}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eaeaea; text-align: right; font-size: 13px;">$${(item.quantity * item.cost).toFixed(2)}</td>
      </tr>
    `).join('');

    const displayFolio = purchase.folio || "OC-" + purchase.id.slice(0, 8).toUpperCase();
    const branchName = purchase.branch?.name || '';

    // Generate PDF attachment
    let attachments: any[] = [];
    try {
      const { generatePurchasePdfBuffer } = await import('./purchasePdf');
      const pdfBuffer = await generatePurchasePdfBuffer(purchase);
      attachments.push({
        filename: `OrdenCompra_${displayFolio}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf'
      });
    } catch (e) {
      console.error("Failed to generate purchase PDF for email attachment:", e);
    }

    const info = await customTransporter.sendMail({
      from: `"${finalFromName}" <${fromEmail}>`,
      to,
      subject: `Nueva Orden de Compra - Folio #${displayFolio}`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eaeaea; border-radius: 8px; box-sizing: border-box;">
          <div style="text-align: center; border-bottom: 2px solid #eab308; padding-bottom: 20px;">
            <h1 style="color: #eab308; margin: 0; font-size: 28px;">Orden de Compra</h1>
            <p style="color: #666; margin: 5px 0 0 0;">Folio #${displayFolio}</p>
          </div>
          
          <p>Estimado proveedor <strong>${purchase.supplier?.name || 'Proveedor'}</strong>,</p>
          <p>Le compartimos los detalles de la orden de compra generada por la sucursal <strong>${branchName}</strong>.</p>
          <p>Adjunto a este correo encontrará la versión formal en formato PDF de esta Orden de Compra.</p>
          
          <h3 style="color: #333; border-bottom: 1px solid #eaeaea; padding-bottom: 8px;">Resumen del Pedido</h3>
          <div style="width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch; margin: 15px 0;">
            <table style="width: 100%; min-width: 500px; border-collapse: collapse; font-size: 13px;">
              <thead>
                <tr style="background-color: #f8fafc;">
                  <th style="padding: 8px; border-bottom: 2px solid #eaeaea; text-align: left;">Artículo</th>
                  <th style="padding: 8px; border-bottom: 2px solid #eaeaea; text-align: center; width: 60px;">Cant.</th>
                  <th style="padding: 8px; border-bottom: 2px solid #eaeaea; text-align: right; width: 120px;">Costo U. (MXN)</th>
                  <th style="padding: 8px; border-bottom: 2px solid #eaeaea; text-align: right; width: 120px;">Subtotal (MXN)</th>
                </tr>
              </thead>
              <tbody>
                ${itemsListHtml}
              </tbody>
              <tfoot>
                <tr>
                  <td colspan="3" style="padding: 10px 8px; text-align: right; font-weight: bold; font-size: 15px;">Total:</td>
                  <td style="padding: 10px 8px; text-align: right; font-weight: bold; font-size: 15px; color: #eab308;">$${purchase.total.toFixed(2)} MXN</td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eaeaea; text-align: center; font-size: 12px; color: #888;">
            <p>Se adjunta la versión formal en PDF a este correo para su descarga.</p>
            <p>Este es un correo automático de ${tenantName}, por favor no responda directamente.</p>
            <p><strong>${tenantName} ERP</strong></p>
          </div>
        </div>
      `,
      attachments
    });

    console.log('Correo de orden de compra enviado: %s', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error: any) {
    console.error('Error al enviar el correo de orden de compra:', error);
    return { success: false, error: error.message || error };
  }
};

export const sendAccountStatementEmail = async (
  to: string,
  customer: any,
  pdfBuffer: Buffer
) => {
  const { transporter: customTransporter, fromEmail, fromName, isCustom, tenantName, configured } = await getTransporterAndSender(customer.branchId);
  const finalFromName = isCustom ? fromName : `${tenantName} Finanzas`;

  if (!configured) {
    if (process.env.NODE_ENV === 'production') {
      console.error('❌ Error: SMTP credentials are not configured in production environment.');
      return { success: false, error: 'SMTP credentials not configured' };
    }
    console.warn('⚠️ SMTP credentials not set. Simulating account statement email sending.');
    console.log(`[EMAIL SIMULADO ESTADO CUENTA] Destino: ${to} | Cliente: ${customer.name}`);
    return { success: true, simulated: true };
  }

  const safeName = (customer.legalName || customer.name)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_')
    .slice(0, 30);
  const filename = `estado_de_cuenta_${safeName}.pdf`;

  const attachments = [
    {
      filename,
      content: pdfBuffer,
      contentType: 'application/pdf'
    }
  ];

  try {
    const info = await customTransporter.sendMail({
      from: `"${finalFromName}" <${fromEmail}>`,
      to,
      subject: `Estado de Cuenta - ${customer.legalName || customer.name}`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eaeaea; border-radius: 8px;">
          <div style="text-align: center; border-bottom: 2px solid #0ea5e9; padding-bottom: 20px;">
            <h1 style="color: #0ea5e9; margin: 0; font-size: 28px;">Estado de Cuenta</h1>
            <p style="color: #666; margin: 5px 0 0 0;">Cliente: ${customer.legalName || customer.name}</p>
          </div>
          
          <p>Estimado(a) cliente,</p>
          <p>Le compartimos el Estado de Cuenta detallado con sus movimientos vigentes y saldos pendientes.</p>
          <p>Adjunto a este correo encontrará el archivo <strong>PDF</strong> de su estado de cuenta para su descarga e impresión.</p>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eaeaea; text-align: center; font-size: 12px; color: #888;">
            <p>Este es un correo automático de ${tenantName}, por favor no responda directamente.</p>
            <p><strong>${tenantName} ERP</strong></p>
          </div>
        </div>
      `,
      attachments
    });

    console.log('Correo de estado de cuenta enviado: %s', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error: any) {
    console.error('Error al enviar el correo de estado de cuenta:', error);
    return { success: false, error: error.message || error };
  }
};
