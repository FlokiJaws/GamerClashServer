const nodemailer = require('nodemailer');

// Configuration pour Firebase Functions
let transporter;

// Initialisation du transporteur
function initializeTransporter() {
  // Utiliser les variables d'environnement définies dans Firebase
  const emailConfig = {
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER || 'contactgamerclash@gmail.com',
      pass: process.env.EMAIL_PASSWORD || 'kisy agxq dguf pqzp',
    },
  };
  
  console.log("Configuration email utilisée:", {
    host: emailConfig.host,
    port: emailConfig.port,
    user: emailConfig.auth.user ? "***" + emailConfig.auth.user.slice(-10) : "Non configuré"
  });
  
  transporter = nodemailer.createTransport(emailConfig);
  
  return transporter;
}

// Vérifier la connexion au service d'emails
async function verifyConnection() {
  if (!transporter) {
    transporter = initializeTransporter();
  }
  
  return new Promise((resolve, reject) => {
    transporter.verify((error, success) => {
      if (error) {
        console.error("❌ Erreur de connexion au service d'email:", error);
        reject(error);
      } else {
        console.log("✅ Serveur prêt à envoyer des emails");
        resolve(success);
      }
    });
  });
}

// Envoyer un email
async function sendEmail(to, subject, html) {
  try {
    if (!transporter) {
      transporter = initializeTransporter();
    }
    
    const fromEmail = process.env.EMAIL_USER || 'contactgamerclash@gmail.com';
    
    console.log(`📧 Préparation de l'envoi d'email à ${to}`);
    
    const mailOptions = {
      from: `"GameCash" <${fromEmail}>`,
      to: to,
      subject: subject,
      html: html
    };
    
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