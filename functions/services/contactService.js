// functions/services/contactService.js
const { db } = require("../firebase/config");
const emailService = require("./emailService");

async function sendContactEmail(contactData) {
  try {
    console.log("📧 Traitement d'un message de contact");

    // Templates d'emails (identiques à ceux du serveur)
    const adminEmailHtml = generateAdminContactEmail(contactData);
    const userEmailHtml = generateUserContactEmail(contactData);

    // Envoyer l'email à l'administrateur
    const adminResult = await emailService.sendEmail(
      process.env.EMAIL_USER,
      `Nouveau message de contact: ${contactData.subject}`,
      adminEmailHtml
    );

    if (!adminResult.success) {
      console.error("❌ Erreur lors de l'envoi de l'email admin:", adminResult.error);
      return { success: false, error: adminResult.error };
    }

    // Envoyer l'email de confirmation à l'utilisateur
    const userResult = await emailService.sendEmail(
      contactData.email,
      "Confirmation de votre message - GamerClash",
      userEmailHtml
    );

    if (!userResult.success) {
      console.error("❌ Erreur lors de l'envoi de l'email utilisateur:", userResult.error);
    }

    // Sauvegarder le message dans Firestore
    await db.collection("contact_messages").add({
      ...contactData,
      createdAt: new Date(),
      status: "new",
      replied: false,
      adminEmailSent: adminResult.success,
      userEmailSent: userResult.success
    });

    console.log("✅ Emails de contact envoyés avec succès");
    return { success: true, message: "Emails envoyés avec succès" };
  } catch (error) {
    console.error("❌ Erreur dans le service de contact:", error);
    return { success: false, error: error.message };
  }
}

function generateAdminContactEmail(contactData) {
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <title>Nouveau message de contact - GamerClash</title>
    <style>
      body {
        font-family: 'Roboto', 'Segoe UI', sans-serif;
        line-height: 1.6;
        color: #333;
        background-color: #f8f9fa;
        margin: 0;
        padding: 0;
      }
      .container {
        max-width: 600px;
        margin: 0 auto;
        padding: 20px;
        background-color: #ffffff;
      }
      .header {
        text-align: center;
        padding: 20px 0;
        border-bottom: 4px solid #6200ea;
      }
      h1 {
        color: #6200ea;
        margin: 20px 0;
        background: linear-gradient(135deg, #6200ea, #03dac6);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
      }
      .info-box {
        background: white;
        padding: 20px;
        margin: 15px 0;
        border-radius: 8px;
        box-shadow: 0 2px 5px rgba(0,0,0,0.1);
      }
      .label {
        font-weight: bold;
        color: #6200ea;
        margin-bottom: 5px;
      }
      .message {
        background: white;
        padding: 20px;
        margin: 20px 0;
        border-left: 4px solid #6200ea;
        border-radius: 5px;
      }
      .footer {
        text-align: center;
        color: #666;
        font-size: 12px;
        margin-top: 30px;
        padding-top: 20px;
        border-top: 1px solid #ddd;
      }
      .reply-button {
        display: inline-block;
        background: #6200ea;
        color: white;
        padding: 12px 30px;
        text-decoration: none;
        border-radius: 5px;
        margin-top: 20px;
        font-weight: bold;
        transition: all 0.3s ease;
      }
      .reply-button:hover {
        background: #5000ca;
        transform: translateY(-2px);
        box-shadow: 0 4px 8px rgba(0,0,0,0.2);
      }
      .metadata {
        background: #f0f0f0;
        padding: 15px;
        border-radius: 5px;
        margin: 15px 0;
        font-size: 0.9em;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>Nouveau message de contact</h1>
        <p style="color: #666; font-size: 0.9em;">Reçu le ${new Date(contactData.sentAt).toLocaleString('fr-FR')}</p>
      </div>
      
      <div class="info-box">
        <div class="label">Nom:</div>
        <div>${contactData.name}</div>
      </div>
      
      <div class="info-box">
        <div class="label">Email:</div>
        <div><a href="mailto:${contactData.email}" style="color: #6200ea;">${contactData.email}</a></div>
      </div>
      
      <div class="info-box">
        <div class="label">Sujet:</div>
        <div>${contactData.subject}</div>
      </div>
      
      <div class="message">
        <div class="label" style="margin-bottom: 10px;">Message:</div>
        <div style="white-space: pre-wrap; line-height: 1.8;">${contactData.message}</div>
      </div>
      
      <div class="metadata">
        <div><strong>Date d'envoi:</strong> ${new Date(contactData.sentAt).toLocaleString('fr-FR', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        })}</div>
        <div><strong>Longueur du message:</strong> ${contactData.message.length} caractères</div>
      </div>
      
      <div style="text-align: center;">
        <a href="mailto:${contactData.email}?subject=Re: ${contactData.subject}" class="reply-button">
          Répondre à ce message
        </a>
      </div>
      
      <div class="footer">
        <p>Ce message a été envoyé depuis le formulaire de contact du site GamerClash.</p>
        <p style="color: #999;">Pour gérer vos préférences de notification, veuillez accéder à votre panneau d'administration.</p>
        <p>© ${new Date().getFullYear()} GamerClash. Tous droits réservés.</p>
      </div>
    </div>
  </body>
  </html>
  `;
}

function generateUserContactEmail(contactData) {
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <title>Confirmation de votre message - GamerClash</title>
    <style>
      body {
        font-family: 'Roboto', 'Segoe UI', sans-serif;
        line-height: 1.6;
        color: #333;
        background-color: #f8f9fa;
        margin: 0;
        padding: 0;
      }
      .container {
        max-width: 600px;
        margin: 0 auto;
        padding: 20px;
      }
      .header {
        background: linear-gradient(135deg, #6200ea, #03dac6);
        color: white;
        padding: 30px;
        border-radius: 10px 10px 0 0;
        text-align: center;
      }
      .header h1 {
        margin: 0;
        font-size: 2em;
      }
      .header p {
        margin: 10px 0 0 0;
        opacity: 0.9;
      }
      .content {
        background: white;
        padding: 30px;
        border-radius: 0 0 10px 10px;
        box-shadow: 0 4px 10px rgba(0,0,0,0.1);
      }
      .greeting {
        font-size: 1.1em;
        color: #6200ea;
        font-weight: 500;
      }
      .message-copy {
        background: #f8f9fa;
        padding: 20px;
        margin: 20px 0;
        border-radius: 8px;
        border-left: 4px solid #6200ea;
      }
      .message-copy h3 {
        color: #6200ea;
        margin-top: 0;
      }
      .message-copy p {
        margin: 10px 0;
      }
      .message-content {
        background: white;
        padding: 15px;
        border-radius: 5px;
        border: 1px solid #e0e0e0;
        white-space: pre-wrap;
        line-height: 1.8;
      }
      .info-section {
        background: #e8f5e9;
        padding: 20px;
        border-radius: 8px;
        margin: 20px 0;
      }
      .info-section h3 {
        color: #2e7d32;
        margin-top: 0;
      }
      .footer {
        text-align: center;
        color: #666;
        font-size: 12px;
        margin-top: 30px;
        padding-top: 20px;
        border-top: 1px solid #eee;
      }
      .social-links {
        margin: 20px 0;
        text-align: center;
      }
      .social-links a {
        display: inline-block;
        margin: 0 10px;
        padding: 8px 16px;
        background: #f0f0f0;
        border-radius: 5px;
        text-decoration: none;
        color: #666;
        transition: all 0.3s ease;
      }
      .social-links a:hover {
        background: #6200ea;
        color: white;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>Merci de nous avoir contactés</h1>
        <p>Nous avons bien reçu votre message</p>
      </div>
      
      <div class="content">
        <p class="greeting">Bonjour ${contactData.name},</p>
        
        <p>Nous vous confirmons la réception de votre message. Notre équipe vous répondra dans les plus brefs délais, généralement sous 24 à 48 heures ouvrables.</p>
        
        <div class="message-copy">
          <h3>Votre message:</h3>
          <p><strong>Sujet:</strong> ${contactData.subject}</p>
          <p><strong>Message:</strong></p>
          <div class="message-content">${contactData.message}</div>
        </div>
        
        <div class="info-section">
          <h3>Que se passe-t-il ensuite ?</h3>
          <ul>
            <li>Votre message a été transmis à notre équipe support</li>
            <li>Nous analyserons votre demande avec attention</li>
            <li>Vous recevrez une réponse personnalisée dans les meilleurs délais</li>
          </ul>
        </div>
        
        <p>Si votre demande est urgente, vous pouvez également nous contacter par téléphone au +33 1 23 45 67 89 durant nos heures d'ouverture (Lundi-Vendredi: 9h-18h, Samedi: 10h-16h).</p>
        
        <div class="social-links">
          <p>Suivez-nous sur les réseaux sociaux :</p>
          <a href="#">Facebook</a>
          <a href="#">Twitter</a>
          <a href="#">Instagram</a>
        </div>
        
        <p>Cordialement,<br>
        <strong>L'équipe GamerClash</strong></p>
      </div>
      
      <div class="footer">
        <p>© ${new Date().getFullYear()} GamerClash. Tous droits réservés.</p>
        <p style="color: #999;">Ce message est automatique, merci de ne pas y répondre directement.</p>
        <p style="color: #999;">Pour toute question supplémentaire, utilisez notre formulaire de contact.</p>
      </div>
    </div>
  </body>
  </html>
  `;
}

module.exports = {
  sendContactEmail
};