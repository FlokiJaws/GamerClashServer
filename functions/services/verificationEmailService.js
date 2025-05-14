// services/verificationEmailService.js
const { db } = require('../firebase/config');
const emailService = require('./emailService');
const crypto = require('crypto');

/**
 * Génère un code de vérification aléatoire
 * @param {number} length - Longueur du code (défaut: 6)
 * @returns {string} - Code généré
 */
function generateVerificationCode(length = 6) {
  // Générer un code numérique aléatoire
  const code = Array.from({ length }, () => Math.floor(Math.random() * 10)).join('');
  return code;
}

/**
 * Envoie un email de vérification avec un code à l'utilisateur
 * @param {Object} userData - Les données de l'utilisateur
 * @returns {Promise} - Résultat de l'opération
 */
async function sendVerificationEmail(userData) {
  try {
    console.log(`📧 Envoi d'email de vérification à ${userData.email}`);
    
    if (!userData || !userData.email || !userData.uid) {
      console.error("❌ Données utilisateur incomplètes");
      return { success: false, error: "Données utilisateur incomplètes" };
    }
    
    // Générer un code de vérification
    const verificationCode = generateVerificationCode();
    
    // Timestamp d'expiration (24 heures)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);
    
    // Stocker le code dans Firestore
    const verificationData = {
      userId: userData.uid,
      email: userData.email,
      code: verificationCode,
      createdAt: new Date(),
      expiresAt: expiresAt,
      verified: false,
      attempts: 0
    };
    
    // Créer ou mettre à jour le document de vérification
    const verificationRef = db.collection('emailVerifications').doc(userData.uid);
    await verificationRef.set(verificationData);
    
    // Générer le contenu de l'email
    const emailContent = generateVerificationEmailTemplate(userData, verificationCode);
    
    // Envoyer l'email
    const emailResult = await emailService.sendEmail(
      userData.email,
      emailContent.subject,
      emailContent.html
    );
    
    if (!emailResult.success) {
      console.error("❌ Échec de l'envoi de l'email de vérification:", emailResult.error);
      return { success: false, error: emailResult.error };
    }
    
    console.log(`✅ Email de vérification envoyé à ${userData.email}`);
    return { 
      success: true, 
      message: "Email de vérification envoyé",
      expiresAt: expiresAt
    };
  } catch (error) {
    console.error("❌ Erreur lors de l'envoi de l'email de vérification:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Vérifie si le code fourni correspond au code stocké
 * @param {string} userId - ID de l'utilisateur
 * @param {string} code - Code fourni par l'utilisateur
 * @returns {Promise} - Résultat de la vérification
 */
async function verifyCode(userId, code) {
  try {
    console.log(`🔍 Vérification du code pour l'utilisateur ${userId}`);
    
    if (!userId || !code) {
      console.error("❌ ID utilisateur ou code manquant");
      return { success: false, error: "ID utilisateur et code requis" };
    }
    
    // Récupérer le document de vérification
    const verificationRef = db.collection('emailVerifications').doc(userId);
    const verificationDoc = await verificationRef.get();
    
    if (!verificationDoc.exists) {
      console.error(`❌ Aucun code de vérification trouvé pour l'utilisateur ${userId}`);
      return { success: false, error: "Aucun code de vérification trouvé" };
    }
    
    const verificationData = verificationDoc.data();
    
    // Vérifier si le code est expiré
    const now = new Date();
    const expiresAt = verificationData.expiresAt.toDate();
    
    if (now > expiresAt) {
      console.error(`❌ Code de vérification expiré pour l'utilisateur ${userId}`);
      return { success: false, error: "Code de vérification expiré" };
    }
    
    // Incrémenter le nombre de tentatives
    const attempts = verificationData.attempts + 1;
    await verificationRef.update({ attempts: attempts });
    
    // Vérifier si le code correspond
    if (verificationData.code !== code) {
      console.error(`❌ Code incorrect pour l'utilisateur ${userId} (tentative ${attempts})`);
      return { success: false, error: "Code de vérification incorrect" };
    }
    
    // Marquer l'email comme vérifié
    await verificationRef.update({
      verified: true,
      verifiedAt: now
    });
    
    // Mettre à jour le statut de l'utilisateur dans Firestore
    const userRef = db.collection('users').doc(userId);
    await userRef.update({
      emailVerified: true,
      emailVerifiedAt: now,
      accountStatus: 'active'
    });
    
    // AJOUT: Envoi de l'email de confirmation directement depuis le service
    try {
      const userDoc = await userRef.get();
      if (userDoc.exists) {
        const userData = userDoc.data();
        
        // Générer et envoyer l'email de confirmation
        const { generateAccountConfirmedEmail } = require('../emails/registrationTemplates');
        const emailContent = generateAccountConfirmedEmail(userData);
        
        await emailService.sendEmail(
          userData.email,
          emailContent.subject,
          emailContent.html
        );
        
        console.log(`✅ Email de confirmation envoyé à ${userData.email}`);
      }
    } catch (emailError) {
      console.error("❌ Erreur lors de l'envoi de l'email de confirmation:", emailError);
      // On continue même si l'email échoue
    }
    
    console.log(`✅ Email vérifié avec succès pour l'utilisateur ${userId}`);
    return { success: true, message: "Email vérifié avec succès" };
  } catch (error) {
    console.error("❌ Erreur lors de la vérification du code:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Génère un nouveau code et envoie un nouvel email de vérification
 * @param {string} userId - ID de l'utilisateur
 * @returns {Promise} - Résultat de l'opération
 */
async function resendVerificationEmail(userId) {
  try {
    console.log(`📧 Renvoi d'email de vérification pour l'utilisateur ${userId}`);
    
    if (!userId) {
      console.error("❌ ID utilisateur manquant");
      return { success: false, error: "ID utilisateur requis" };
    }
    
    // Récupérer les données de l'utilisateur
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
      console.error(`❌ Utilisateur ${userId} non trouvé`);
      return { success: false, error: "Utilisateur non trouvé" };
    }
    
    const userData = userDoc.data();
    
    // Vérifier si l'email est déjà vérifié
    if (userData.emailVerified) {
      console.log(`ℹ️ L'email de l'utilisateur ${userId} est déjà vérifié`);
      return { success: false, error: "Email déjà vérifié" };
    }
    
    // Générer un nouveau code et envoyer l'email
    return await sendVerificationEmail({ ...userData, uid: userId });
  } catch (error) {
    console.error("❌ Erreur lors du renvoi de l'email de vérification:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Génère le template HTML pour l'email de vérification
 * @param {Object} userData - Les données de l'utilisateur
 * @param {string} verificationCode - Code de vérification
 * @returns {Object} - Contenu de l'email
 */
function generateVerificationEmailTemplate(userData, verificationCode) {
  return {
    subject: `Vérifiez votre adresse email - GameCash`,
    html: `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Vérification de votre adresse email - GameCash</title>
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
        .verification-info {
          background-color: #f0f0ff;
          padding: 15px;
          border-radius: 5px;
          margin: 20px 0;
          border-left: 4px solid #6200ea;
        }
        .verification-code {
          text-align: center;
          font-size: 36px;
          font-weight: bold;
          letter-spacing: 5px;
          color: #6200ea;
          margin: 20px 0;
          padding: 15px;
          background-color: #f8f9fa;
          border-radius: 5px;
        }
        .instructions {
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
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Vérification de votre adresse email</h1>
        </div>
        
        <div class="verification-info">
          <h2>Bonjour ${userData.displayName || 'cher utilisateur'},</h2>
          <p>Merci de vous être inscrit sur GameCash. Pour activer votre compte, veuillez saisir le code de vérification ci-dessous sur notre site.</p>
        </div>
        
        <div class="verification-code">
          ${verificationCode}
        </div>
        
        <div class="instructions">
          <h2>Comment vérifier votre compte ?</h2>
          <ol>
            <li>Connectez-vous à votre compte GameCash</li>
            <li>Accédez à la page de vérification d'email</li>
            <li>Saisissez le code à 6 chiffres afficher ci-dessus</li>
            <li>Cliquez sur "Vérifier"</li>
          </ol>
          <p>Ce code est valable pendant 24 heures.</p>
        </div>
        
        <div style="text-align: center; margin-top: 20px;">
          <a href="${process.env.WEBSITE_URL || 'https://gamecash.fr'}/verify-email" class="action-button">Vérifier mon email</a>
        </div>
        
        <div class="footer">
          <p>© ${new Date().getFullYear()} GameCash - Tous droits réservés</p>
          <p>Si vous n'avez pas créé de compte sur GameCash, veuillez ignorer cet email.</p>
        </div>
      </div>
    </body>
    </html>
    `
  };
}

module.exports = {
  sendVerificationEmail,
  verifyCode,
  resendVerificationEmail,
  generateVerificationCode
};