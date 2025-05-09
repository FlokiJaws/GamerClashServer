// services/registrationService.js
const { db } = require('../firebase/config');
const emailService = require('./emailService');
const verificationEmailService = require('./verificationEmailService');
const userNotificationService = require('./userNotificationService');
const { generateAccountVerificationEmail, generateAccountConfirmedEmail } = require('../emails/registrationTemplates');

/**
 * Gère le processus d'inscription d'un nouvel utilisateur
 * @param {Object} userData - Les données de l'utilisateur
 * @returns {Promise} - Résultat de l'opération
 */
async function registerUser(userData) {
  try {
    console.log("👤 Enregistrement d'un nouvel utilisateur");
    
    if (!userData || !userData.email || !userData.uid) {
      console.error("❌ Données utilisateur incomplètes");
      return { success: false, error: "Données utilisateur incomplètes" };
    }
    
    // Vérifier si l'utilisateur existe déjà dans Firestore
    const userRef = db.collection('users').doc(userData.uid);
    const userDoc = await userRef.get();
    
    if (userDoc.exists) {
      console.log(`ℹ️ L'utilisateur ${userData.uid} existe déjà`);
      
      // Si l'utilisateur existe mais n'a pas encore vérifié son email
      const existingUserData = userDoc.data();
      if (!existingUserData.emailVerified) {
        // Envoyer un nouvel email de vérification
        return await verificationEmailService.resendVerificationEmail(userData.uid);
      }
      
      return { success: false, error: "Utilisateur déjà enregistré" };
    }
    
    // Préparer les données utilisateur pour Firestore
    const userDataForStore = {
      ...userData,
      createdAt: new Date(),
      updatedAt: new Date(),
      emailVerified: false,
      accountStatus: 'pending',
      role: 'customer' // Rôle par défaut
    };
    
    // Enregistrer l'utilisateur dans Firestore
    await userRef.set(userDataForStore);
    
    console.log(`✅ Utilisateur ${userData.uid} enregistré avec succès`);
    
    // Envoyer l'email de vérification
    const verificationResult = await verificationEmailService.sendVerificationEmail(userData);
    
    if (!verificationResult.success) {
      console.error("❌ Échec de l'envoi de l'email de vérification:", verificationResult.error);
      return { 
        success: true, 
        message: "Utilisateur enregistré, mais échec de l'envoi de l'email de vérification", 
        user: userDataForStore,
        verificationStatus: false,
        error: verificationResult.error
      };
    }
    
    return { 
      success: true, 
      message: "Utilisateur enregistré et email de vérification envoyé", 
      user: userDataForStore,
      verificationStatus: true,
      expiresAt: verificationResult.expiresAt
    };
  } catch (error) {
    console.error("❌ Erreur lors de l'enregistrement de l'utilisateur:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Vérifie le code fourni et finalise l'inscription de l'utilisateur
 * @param {string} userId - ID de l'utilisateur
 * @param {string} code - Code de vérification
 * @returns {Promise} - Résultat de la vérification
 */
async function verifyUserAccount(userId, code) {
  try {
    console.log(`🔍 Vérification du compte utilisateur ${userId}`);
    
    if (!userId || !code) {
      console.error("❌ ID utilisateur ou code manquant");
      return { success: false, error: "ID utilisateur et code requis" };
    }
    
    // Vérifier le code
    const verificationResult = await verificationEmailService.verifyCode(userId, code);
    
    if (!verificationResult.success) {
      return { success: false, error: verificationResult.error };
    }
    
    // Mettre à jour le statut du compte utilisateur
    const userRef = db.collection('users').doc(userId);
    await userRef.update({
      accountStatus: 'active',
      updatedAt: new Date()
    });
    
    // Récupérer les données de l'utilisateur pour l'email de confirmation
    const userDoc = await userRef.get();
    if (!userDoc.exists) {
      console.error(`❌ Utilisateur ${userId} non trouvé après vérification`);
      return { success: true, message: "Compte vérifié mais erreur lors de l'envoi de l'email de confirmation" };
    }
    
    const userData = userDoc.data();
    
    // MODIFICATION: Envoyer la notification à l'administrateur après vérification
    try {
      await userNotificationService.sendNewUserNotification(userData);
      console.log(`✅ Notification admin envoyée après vérification pour ${userData.email}`);
    } catch (adminNotifError) {
      console.error("❌ Erreur lors de l'envoi de la notification à l'admin:", adminNotifError);
      // On continue même si cette notification échoue
    }
    
    // MODIFICATION: Envoyer un email de bienvenue à l'utilisateur
    try {
      await userNotificationService.sendWelcomeEmail(userData);
      console.log(`✅ Email de bienvenue envoyé à ${userData.email}`);
      
      // Marquer le welcome email comme envoyé
      await userRef.update({
        welcomeEmailSent: true,
        welcomeEmailSentDate: new Date()
      });
    } catch (welcomeEmailError) {
      console.error("❌ Erreur lors de l'envoi de l'email de bienvenue:", welcomeEmailError);
      // On continue même si l'envoi de l'email échoue
    }
    
    console.log(`✅ Compte utilisateur ${userId} vérifié avec succès`);
    return { 
      success: true, 
      message: "Compte vérifié avec succès", 
      user: { 
        ...userData, 
        emailVerified: true, 
        accountStatus: 'active' 
      }
    };
  } catch (error) {
    console.error("❌ Erreur lors de la vérification du compte utilisateur:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Envoie un email de bienvenue une fois le compte activé
 * @param {string} userId - ID de l'utilisateur
 * @returns {Promise} - Résultat de l'opération
 */
async function sendWelcomeEmail(userId) {
  try {
    console.log(`📧 Envoi d'email de bienvenue à l'utilisateur ${userId}`);
    
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
    
    // Vérifier si l'email est vérifié
    if (!userData.emailVerified) {
      console.log(`ℹ️ L'email de l'utilisateur ${userId} n'est pas encore vérifié`);
      return { success: false, error: "L'email de l'utilisateur n'est pas encore vérifié" };
    }
    
    // Utiliser le service existant pour envoyer l'email de bienvenue
    const result = await userNotificationService.sendWelcomeEmail(userData);
    
    if (!result.success) {
      return { success: false, error: result.error };
    }
    
    // Mettre à jour l'utilisateur pour indiquer que l'email de bienvenue a été envoyé
    await userRef.update({
      welcomeEmailSent: true,
      welcomeEmailSentDate: new Date()
    });
    
    console.log(`✅ Email de bienvenue envoyé à ${userData.email}`);
    return { success: true, message: "Email de bienvenue envoyé" };
  } catch (error) {
    console.error("❌ Erreur lors de l'envoi de l'email de bienvenue:", error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  registerUser,
  verifyUserAccount,
  sendWelcomeEmail
};