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
