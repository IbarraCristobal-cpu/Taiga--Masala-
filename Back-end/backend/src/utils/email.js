const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
  // 1. Crear cuenta de prueba (Ethereal) automáticamente
  // Esto genera un correo y contraseña falsos para que puedas probar sin usar tu Gmail
  const testAccount = await nodemailer.createTestAccount();

  // 2. Configurar el "Transportador" (El camión de correos)
  const transporter = nodemailer.createTransport({
    host: "smtp.ethereal.email",
    port: 587,
    secure: false, 
    auth: {
      user: testAccount.user, 
      pass: testAccount.pass, 
    },
  });

  // 3. Definir el mensaje
  const message = {
    from: '"Restaurante Masala 🍛" <noreply@masala.com>',
    to: options.email,
    subject: options.subject,
    text: options.message, // Versión texto plano
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f4f4f4;">
        <div style="background-color: white; padding: 20px; border-radius: 5px;">
          <h2 style="color: #d35400;">Restaurante Masala</h2>
          <p>${options.message.replace(/\n/g, '<br>')}</p>
          <hr/>
          <small>Si no solicitaste este correo, ignóralo.</small>
        </div>
      </div>
    `
  };

  // 4. Enviar el correo
  const info = await transporter.sendMail(message);

  console.log("📨 Mensaje enviado con ID: %s", info.messageId);
  // IMPORTANTE: Esto imprimirá un LINK en tu terminal. Haz clic para ver el correo simulado.
  console.log("👀 VISTA PREVIA URL: %s", nodemailer.getTestMessageUrl(info));
};

module.exports = sendEmail;