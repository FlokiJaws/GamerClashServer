const nodemailer = require("nodemailer");
const functions = require("firebase-functions");

// Configuration pour Firebase Functions
let transporter;

// Initialisation du transporteur
function initializeTransporter() {
  const emailConfig = functions.config().email || {};

  transporter = nodemailer.createTransport({
    host: emailConfig.host || "smtp.gmail.com",
    port: parseInt(emailConfig.port) || 587,
    secure: false,
    auth: {
      user: emailConfig.user,
      pass: emailConfig.password,
    },
  });

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

    const emailConfig = functions.config().email || {};

    console.log(`📧 Préparation de l'envoi d'email à ${to}`);

    const mailOptions = {
      from: `"GameCash" <${emailConfig.user}>`,
      to: to,
      subject: subject,
      html: html,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Email envoyé avec succès:`, info.messageId);
    return {success: true, messageId: info.messageId};
  } catch (error) {
    console.error(`❌ Erreur lors de l'envoi de l'email:`, error);
    return {success: false, error: error.message};
  }
}

module.exports = {
  verifyConnection,
  sendEmail,
  transporter,
};
