const nodemailer = require('nodemailer');
const functions = require('firebase-functions');

// Configuration pour Firebase Functions
const config = functions.config();

// Pour le développement local
const emailConfig = {
  host: config.email?.host || process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: config.email?.port || process.env.EMAIL_PORT || 587,
  user: config.email?.user || process.env.EMAIL_USER,
  pass: config.email?.password || process.env.EMAIL_PASSWORD
};

// Configuration du transporteur d'email
const transporter = nodemailer.createTransport({
  host: emailConfig.host,
  port: emailConfig.port,
  secure: false,
  auth: {
    user: emailConfig.user,
    pass: emailConfig.pass,
  },
});

// Vérifier la connexion au service d'emails
async function verifyConnection() {
  return new Promise((resolve, reject) => {
    transporter.verify((error, success) => {
      if (error) {
        console.error("❌ Erreur de connexion au service d'email:", error);
        console.error(
          "Vérifiez vos paramètres EMAIL_HOST, EMAIL_PORT, EMAIL_USER et EMAIL_PASSWORD"
        );
        reject(error);
      } else {
        console.log("✅ Serveur prêt à envoyer des emails");
        console.log(`📧 Utilisateur email configuré: ${process.env.EMAIL_USER}`);
        console.log(
          `🔌 Serveur SMTP: ${process.env.EMAIL_HOST}:${process.env.EMAIL_PORT}`
        );
        resolve(success);
      }
    });
  });
}

// Envoyer un email
async function sendEmail(to, subject, html) {
  try {
    console.log(`📧 Préparation de l'envoi d'email à ${to}`);
    
    const mailOptions = {
      from: `"GameCash" <${process.env.EMAIL_USER}>`,
      to: to,
      subject: subject,
      html: html
    };
    
    console.log(`📧 Configuration de l'email:`, {
      from: mailOptions.from,
      to: mailOptions.to,
      subject: mailOptions.subject
    });
    
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Email envoyé avec succès:`, info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`❌ Erreur lors de l'envoi de l'email:`, error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  verifyConnection,
  sendEmail,
  transporter
};