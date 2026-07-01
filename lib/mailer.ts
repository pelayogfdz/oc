import nodemailer from 'nodemailer';
import { prisma } from './prisma';

// Configure Nodemailer with environment variables
// Expects: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.zoho.com',
  port: parseInt(process.env.SMTP_PORT || '465', 10),
  secure: true, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

async function getTransporterAndSender(branchId?: string | null) {
  // Default values from environment variables
  let host = process.env.SMTP_HOST || 'smtp.zoho.com';
  let port = parseInt(process.env.SMTP_PORT || '465', 10);
  let secure = true;
  let user = process.env.SMTP_USER;
  let pass = process.env.SMTP_PASS;
  let fromName = '';
  let isCustom = false;

  if (branchId) {
    try {
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

  return {
    transporter: transporterInstance,
    fromEmail: user,
    fromName,
    isCustom,
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
  const { transporter: customTransporter, fromEmail, fromName, isCustom, configured } = await getTransporterAndSender(quote.branchId);
  const finalFromName = isCustom ? fromName : "CAANMA Cotizaciones";

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
        <td style="padding: 8px; border-bottom: 1px solid #eaeaea;">${item.product?.name || 'Artículo'} (SKU: ${item.product?.sku || 'N/A'})</td>
        <td style="padding: 8px; border-bottom: 1px solid #eaeaea; text-align: center;">${item.quantity}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eaeaea; text-align: right;">$${item.price.toFixed(2)} MXN</td>
        <td style="padding: 8px; border-bottom: 1px solid #eaeaea; text-align: right;">$${(item.quantity * item.price).toFixed(2)} MXN</td>
      </tr>
    `).join('');

    const displayFolio = quote.folio || quote.id.slice(0, 8).toUpperCase();
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.URL || 'https://caanma.com';
    const link = `${baseUrl}/ventas/detalle/${quote.id}/imprimir-cotizacion`;

    const info = await customTransporter.sendMail({
      from: `"${finalFromName}" <${fromEmail}>`,
      to,
      subject: `Nueva Cotización Realizada - Folio #${displayFolio}`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eaeaea; border-radius: 8px;">
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
                <td style="padding: 10px 8px; text-align: right; font-weight: bold; font-size: 16px; color: #0ea5e9;">$${quote.total.toFixed(2)} MXN</td>
              </tr>
            </tfoot>
          </table>

          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eaeaea; text-align: center; font-size: 12px; color: #888;">
            <p>Este es un correo automático de CAANMA, por favor no responda directamente.</p>
            <p><strong>CAANMA ERP</strong></p>
          </div>
        </div>
      `,
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
  const { transporter: customTransporter, fromEmail, fromName, isCustom, configured } = await getTransporterAndSender(sale.branchId);
  const brandName = isCustom ? fromName : "CAANMA Facturación";

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
            <p>Este es un correo automático de CAANMA, por favor no responda directamente.</p>
            <p><strong>CAANMA ERP</strong></p>
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
