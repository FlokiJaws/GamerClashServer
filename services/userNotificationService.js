// services/userNotificationService.js
const { db } = require('../firebase/config');
const emailService = require('./emailService');

/**
 * Envoie un email de bienvenue à un nouvel utilisateur
 * @param {Object} userData - Les données de l'utilisateur
 */
async function sendWelcomeEmail(userData) {
  try {
    console.log("📧 Envoi d'email de bienvenue au nouvel utilisateur");
    
    if (!userData || !userData.email) {
      console.error("❌ Données manquantes: email utilisateur");
      return { success: false, error: "Email utilisateur manquant" };
    }
    
    // Générer le contenu de l'email
    const emailContent = generateNewUserWelcomeEmail(userData);
    
    // Envoyer l'email à l'utilisateur
    const userResult = await emailService.sendEmail(
      userData.email,
      emailContent.subject,
      emailContent.html
    );
    
    if (!userResult.success) {
      console.error("❌ Erreur lors de l'envoi de l'email de bienvenue:", userResult.error);
      return { success: false, error: userResult.error };
    }
    
    console.log("✅ Email de bienvenue envoyé avec succès");
    return { success: true };
  } catch (error) {
    console.error("❌ Erreur lors de l'envoi de l'email de bienvenue:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Envoie une notification à l'administrateur pour un nouvel utilisateur
 * @param {Object} userData - Les données de l'utilisateur
 */
async function sendNewUserNotification(userData) {
  try {
    console.log("📧 Envoi de notification de nouvel utilisateur à l'admin");
    
    if (!userData) {
      console.error("❌ Données utilisateur manquantes");
      return { success: false, error: "Données utilisateur manquantes" };
    }
    
    // Générer le contenu de l'email
    const emailContent = generateNewUserNotificationEmail(userData);
    
    // Envoyer l'email à l'administrateur
    const adminResult = await emailService.sendEmail(
      process.env.EMAIL_USER, // Adresse admin
      emailContent.subject,
      emailContent.html
    );
    
    if (!adminResult.success) {
      console.error("❌ Erreur lors de l'envoi de la notification à l'administrateur:", adminResult.error);
      return { success: false, error: adminResult.error };
    }
    
    console.log("✅ Notification de nouvel utilisateur envoyée avec succès");
    return { success: true };
  } catch (error) {
    console.error("❌ Erreur lors de l'envoi de la notification à l'administrateur:", error);
    return { success: false, error: error.message };
  }
}

// Templates d'emails
function generateNewUserWelcomeEmail(userData) {
  return {
    subject: `Bienvenue sur GameCash !`,
    html: `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Bienvenue sur GameCash</title>
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
          background: linear-gradient(135deg, #6200ea, #9d4edd);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .welcome-info {
          background-color: #f0f0ff;
          padding: 15px;
          border-radius: 5px;
          margin: 20px 0;
          border-left: 4px solid #6200ea;
        }
        .next-steps {
          background-color: #e8f5e9;
          padding: 15px;
          border-radius: 5px;
          margin: 20px 0;
          border-left: 4px solid #4caf50;
        }
        .footer {
          text-align: center;
          padding: 20px 0;
          font-size: 0.9em;
          color: #777;
          border-top: 1px solid #eee;
        }
        .action-button {
          display: inline-block;
          padding: 10px 20px;
          background-color: #6200ea;
          color: white;
          text-decoration: none;
          border-radius: 5px;
          font-weight: bold;
          margin-top: 15px;
        }
        .social-links {
          text-align: center;
          margin-top: 20px;
        }
        .social-links a {
          display: inline-block;
          margin: 0 10px;
          color: #6200ea;
          text-decoration: none;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Bienvenue sur GameCash !</h1>
        </div>
        
        <div class="welcome-info">
          <h2>Bonjour ${userData.displayName || 'cher utilisateur'},</h2>
          <p>Nous sommes ravis de vous accueillir dans la communauté GameCash ! Votre compte a été créé avec succès et vous pouvez dès maintenant profiter de toutes les fonctionnalités de notre plateforme.</p>
        </div>
        
        <div class="next-steps">
          <h2>Que faire maintenant ?</h2>
          <ul>
            <li>Complétez votre profil pour une expérience personnalisée</li>
            <li>Parcourez notre catalogue de produits gaming</li>
            <li>Consultez nos dernières promotions</li>
            <li>Partagez vos avis sur vos jeux préférés</li>
          </ul>
        </div>
        
        <div style="text-align: center; margin-top: 20px;">
          <a href="${process.env.WEBSITE_URL || 'https://gamecash.fr'}" class="action-button">Commencer l'aventure</a>
        </div>
        
        <div class="social-links">
          <p>Suivez-nous sur les réseaux sociaux :</p>
          <a href="https://facebook.com/gamecash">Facebook</a> |
          <a href="https://twitter.com/gamecash">Twitter</a> |
          <a href="https://instagram.com/gamecash">Instagram</a>
        </div>
        
        <div class="footer">
          <p>© ${new Date().getFullYear()} GameCash - Tous droits réservés</p>
          <p>Si vous n'êtes pas à l'origine de cette inscription, veuillez nous contacter immédiatement à <a href="mailto:support@gamecash.fr">support@gamecash.fr</a></p>
        </div>
      </div>
    </body>
    </html>
    `
  };
}

function generateNewUserNotificationEmail(userData) {
  return {
    subject: `Nouvel utilisateur inscrit : ${userData.displayName || userData.email}`,
    html: `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Nouvel utilisateur inscrit - GameCash</title>
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
        }
        .user-info {
          background-color: #e3f2fd;
          padding: 15px;
          border-radius: 5px;
          margin: 20px 0;
          border-left: 4px solid #2196f3;
        }
        .registration-details {
          background-color: #f0f0ff;
          padding: 15px;
          border-radius: 5px;
          margin: 20px 0;
        }
        .footer {
          text-align: center;
          padding: 20px 0;
          font-size: 0.9em;
          color: #777;
          border-top: 1px solid #eee;
        }
        .action-button {
          display: inline-block;
          padding: 10px 20px;
          background-color: #6200ea;
          color: white;
          text-decoration: none;
          border-radius: 5px;
          font-weight: bold;
          margin-top: 15px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
        }
        table td {
          padding: 8px;
          border-bottom: 1px solid #eee;
        }
        table td:first-child {
          font-weight: bold;
          width: 140px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Nouvel utilisateur inscrit</h1>
        </div>
        
        <div class="user-info">
          <h2>Informations utilisateur</h2>
          <table>
            <tr>
              <td>Nom :</td>
              <td>${userData.displayName || 'Non spécifié'}</td>
            </tr>
            <tr>
              <td>Email :</td>
              <td>${userData.email}</td>
            </tr>
            <tr>
              <td>ID Utilisateur :</td>
              <td>${userData.uid}</td>
            </tr>
            <tr>
              <td>Date d'inscription :</td>
              <td>${new Date().toLocaleString('fr-FR')}</td>
            </tr>
            <tr>
              <td>Source :</td>
              <td>${userData.providerData && userData.providerData[0] ? userData.providerData[0].providerId : 'Email/Mot de passe'}</td>
            </tr>
          </table>
        </div>
        
        <div class="registration-details">
          <h2>Détails techniques</h2>
          <p><strong>Adresse IP :</strong> ${userData.metadata ? userData.metadata.lastSignInIp || 'Non disponible' : 'Non disponible'}</p>
          <p><strong>Appareil :</strong> ${userData.metadata ? userData.metadata.lastSignInUserAgent || 'Non disponible' : 'Non disponible'}</p>
        </div>
        
        <div style="text-align: center; margin-top: 20px;">
          <a href="${process.env.WEBSITE_URL || 'https://gamecash.fr'}/admin/users?uid=${userData.uid}" class="action-button">Gérer l'utilisateur</a>
        </div>
        
        <div class="footer">
          <p>© ${new Date().getFullYear()} GameCash - Tous droits réservés</p>
          <p>Ce message a été envoyé automatiquement par le système de notification de GameCash.</p>
        </div>
      </div>
    </body>
    </html>
    `
  };
}

module.exports = {
  sendWelcomeEmail,
  sendNewUserNotification
};