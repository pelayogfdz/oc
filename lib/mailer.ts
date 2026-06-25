import nodemailer from 'nodemailer';

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

  try {
    const info = await transporter.sendMail({
      from: `"Soporte CAANMA" <${process.env.SMTP_USER}>`,
      to,
      subject: 'Recuperación de Contraseña - CAANMA',
      text: `Has solicitado recuperar tu contraseña. \n\nTu contraseña temporal es: ${tempPassword}\n\nPor favor, ingresa al sistema utilizando esta contraseña. Se te solicitará crear una nueva contraseña de forma obligatoria por seguridad.\n\nEl equipo de CAANMA.`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
          <h2 style="color: #4F46E5;">Recuperación de Contraseña</h2>
          <p>Has solicitado recuperar tu contraseña de acceso a CAANMA.</p>
          <p>Tu contraseña temporal es:</p>
          <div style="background-color: #f3f4f6; padding: 10px; border-radius: 5px; font-size: 18px; font-weight: bold; letter-spacing: 2px; text-align: center; margin: 20px 0;">
            ${tempPassword}
          </div>
          <p>Por favor, ingresa al sistema utilizando esta contraseña. <strong>Se te solicitará crear una nueva contraseña de forma obligatoria</strong> al iniciar sesión por razones de seguridad.</p>
          <hr style="border: none; border-top: 1px solid #eaeaea; margin: 20px 0;" />
          <p style="font-size: 12px; color: #888;">Si no solicitaste este cambio, puedes ignorar este correo.</p>
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
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
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

    const info = await transporter.sendMail({
      from: `"PETQRO Showroom" <${process.env.SMTP_USER}>`,
      to,
      subject: `Confirmación de Pedido PETQRO - Folio #${sale.id.slice(0, 8)}`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eaeaea; border-radius: 8px;">
          <div style="text-align: center; border-bottom: 2px solid #0ea5e9; padding-bottom: 20px;">
            <h1 style="color: #0ea5e9; margin: 0; font-size: 28px;">¡Gracias por tu compra!</h1>
            <p style="color: #666; margin: 5px 0 0 0;">Pedido de Showroom PETQRO</p>
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
            <p><strong>PETQRO Showroom & CAANMA ERP</strong></p>
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
