// emails/registrationTemplates.js
const {formatDate} = require("../utils/dateFormatter");

/**
 * Génère un email de confirmation de compte avec code de vérification
 * @param {Object} userData - Les données de l'utilisateur
 * @param {string} verificationCode - Le code de vérification
 * @return {Object} - Contenu de l'email
 */
function generateAccountVerificationEmail(userData, verificationCode) {
  return {
    subject: `Confirmation de votre compte GameCash`,
    html: `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Confirmation de compte - GameCash</title>
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
        .verification-code {
          text-align: center;
          font-size: 42px;
          font-weight: bold;
          letter-spacing: 8px;
          color: #6200ea;
          margin: 30px 0;
          padding: 20px;
          background-color: #f8f9fa;
          border-radius: 5px;
          border: 1px dashed #6200ea;
        }
        .info-section {
          background-color: #f0f0ff;
          padding: 15px;
          border-radius: 5px;
          margin: 20px 0;
          border-left: 4px solid #6200ea;
        }
        .instructions {
          background-color: #e8f5e9;
          padding: 15px;
          border-radius: 5px;
          margin: 20px 0;
          border-left: 4px solid #4caf50;
        }
        .warning {
          background-color: #fff8e1;
          padding: 15px;
          border-radius: 5px;
          margin: 20px 0;
          border-left: 4px solid #ffb300;
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
          padding: 12px 24px;
          background-color: #6200ea;
          color: white;
          text-decoration: none;
          border-radius: 5px;
          font-weight: bold;
          margin-top: 15px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Confirmation de votre compte GameCash</h1>
        </div>
        
        <div class="info-section">
          <h2>Bienvenue sur GameCash !</h2>
          <p>Bonjour ${userData.displayName || "cher utilisateur"},</p>
          <p>Merci de vous être inscrit sur GameCash. Pour finaliser votre inscription et activer votre compte, veuillez saisir le code de vérification ci-dessous sur notre site.</p>
        </div>
        
        <p style="text-align: center; font-weight: bold;">Votre code de vérification :</p>
        <div class="verification-code">
          ${verificationCode}
        </div>
        
        <div class="instructions">
          <h2>Comment confirmer votre compte ?</h2>
          <ol>
            <li>Retournez sur GameCash</li>
            <li>Accédez à la page de vérification de compte</li>
            <li>Saisissez le code de vérification à 6 chiffres ci-dessus</li>
            <li>Cliquez sur "Confirmer mon compte"</li>
          </ol>
        </div>
        
        <div class="warning">
          <p><strong>Important :</strong> Ce code expire dans 24 heures. Si vous n'avez pas confirmé votre compte avant l'expiration, vous devrez demander un nouveau code.</p>
          <p>Si vous n'avez pas créé de compte sur GameCash, veuillez ignorer cet email.</p>
        </div>
        
        <div style="text-align: center; margin-top: 20px;">
          <a href="${process.env.WEBSITE_URL || "https://gamecash.fr"}/verify-account" class="action-button">Retourner sur GameCash</a>
        </div>
        
        <div class="footer">
          <p>© ${new Date().getFullYear()} GameCash - Tous droits réservés</p>
          <p>Si vous rencontrez des problèmes ou si vous avez des questions, n'hésitez pas à contacter notre support à <a href="mailto:support@gamecash.fr">support@gamecash.fr</a>.</p>
        </div>
      </div>
    </body>
    </html>
    `,
  };
}

/**
 * Génère un email de confirmation de compte réussie
 * @param {Object} userData - Les données de l'utilisateur
 * @return {Object} - Contenu de l'email
 */
function generateAccountConfirmedEmail(userData) {
  return {
    subject: `Compte GameCash activé avec succès`,
    html: `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Compte activé - GameCash</title>
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
        .success-section {
          background-color: #e8f5e9;
          padding: 15px;
          border-radius: 5px;
          margin: 20px 0;
          border-left: 4px solid #4caf50;
        }
        .info-section {
          background-color: #f0f0ff;
          padding: 15px;
          border-radius: 5px;
          margin: 20px 0;
          border-left: 4px solid #6200ea;
        }
        .next-steps {
          background-color: #e3f2fd;
          padding: 15px;
          border-radius: 5px;
          margin: 20px 0;
          border-left: 4px solid #2196f3;
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
          padding: 12px 24px;
          background-color: #6200ea;
          color: white;
          text-decoration: none;
          border-radius: 5px;
          font-weight: bold;
          margin-top: 15px;
        }
        .feature-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 15px;
          margin: 20px 0;
        }
        .feature-item {
          flex: 1 1 45%;
          background-color: #f9f9f9;
          padding: 15px;
          border-radius: 5px;
          min-width: 200px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Votre compte est maintenant actif !</h1>
        </div>
        
        <div class="success-section">
          <h2>Félicitations, ${userData.displayName || "cher utilisateur"} !</h2>
          <p>Votre adresse email a été vérifiée avec succès et votre compte GameCash est maintenant pleinement actif. Nous sommes ravis de vous compter parmi notre communauté !</p>
        </div>
        
        <div class="info-section">
          <h2>Informations de compte</h2>
          <ul>
            <li><strong>Email :</strong> ${userData.email}</li>
            <li><strong>Date d'activation :</strong> ${formatDate(new Date())}</li>
          </ul>
        </div>
        
        <div class="next-steps">
          <h2>Prochaines étapes</h2>
          <p>Voici quelques suggestions pour bien démarrer sur GameCash :</p>
          
          <div class="feature-grid">
            <div class="feature-item">
              <h3>Complétez votre profil</h3>
              <p>Ajoutez vos informations personnelles et préférences pour une expérience personnalisée.</p>
            </div>
            <div class="feature-item">
              <h3>Découvrez notre catalogue</h3>
              <p>Parcourez notre sélection de jeux vidéo et accessoires.</p>
            </div>
            <div class="feature-item">
              <h3>Créez votre liste de souhaits</h3>
              <p>Marquez les produits qui vous intéressent pour les retrouver facilement.</p>
            </div>
            <div class="feature-item">
              <h3>Suivez nos actualités</h3>
              <p>Restez informé des dernières sorties et promotions.</p>
            </div>
          </div>
        </div>
        
        <div style="text-align: center; margin-top: 20px;">
          <a href="${process.env.WEBSITE_URL || "https://gamecash.fr"}" class="action-button">Accéder à GameCash</a>
        </div>
        
        <div class="footer">
          <p>© ${new Date().getFullYear()} GameCash - Tous droits réservés</p>
          <p>Si vous rencontrez des problèmes ou si vous avez des questions, n'hésitez pas à contacter notre support à <a href="mailto:support@gamecash.fr">support@gamecash.fr</a>.</p>
        </div>
      </div>
    </body>
    </html>
    `,
  };
}

module.exports = {
  generateAccountVerificationEmail,
  generateAccountConfirmedEmail,
};
