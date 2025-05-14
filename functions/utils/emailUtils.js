// utils/emailUtils.js
const emailService = require('../services/emailService');

/**
 * Fonction utilitaire pour envoyer des emails via l'API
 * @param {Object} emailData - Les données de l'email
 * @returns {Promise} - Le résultat de l'envoi
 */
async function sendEmailApiRequest(emailData) {
  try {
    const { to, subject, html } = emailData;
    
    if (!to || !subject || !html) {
      throw new Error('Données email incomplètes: to, subject et html sont requis');
    }
    
    // Utiliser le service email existant
    const result = await emailService.sendEmail(to, subject, html);
    
    return result;
  } catch (error) {
    console.error('Erreur lors de l\'envoi de l\'email:', error);
    return { 
      success: false, 
      error: error.message 
    };
  }
}

/**
 * Fonction pour valider une adresse email
 * @param {string} email - L'adresse email à valider
 * @returns {boolean} - True si l'email est valide
 */
function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Fonction pour formater les erreurs d'envoi d'email
 * @param {Error} error - L'erreur à formater
 * @returns {Object} - L'erreur formatée
 */
function formatEmailError(error) {
  return {
    success: false,
    error: error.message || 'Erreur inconnue lors de l\'envoi de l\'email',
    timestamp: new Date().toISOString()
  };
}

module.exports = {
  sendEmailApiRequest,
  validateEmail,
  formatEmailError
};