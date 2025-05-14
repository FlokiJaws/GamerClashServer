const { db } = require('../firebase/config');
const emailService = require('./emailService');
const { 
  generateReviewNotificationEmail, 
  generateReviewResponseEmail, 
  generateReviewUpdateEmail 
} = require('../emails/reviewTemplates');

/**
 * Envoie une notification par email lors de la création d'un nouvel avis
 * @param {Object} reviewData - Les données de l'avis
 * @param {string} userId - L'ID de l'utilisateur
 */
async function sendNewReviewNotification(reviewData, userId) {
  try {
    console.log("📧 Envoi de notification pour un nouvel avis");
    
    // Vérifier que l'avis existe
    if (!reviewData || !userId) {
      console.error("❌ Données manquantes: avis ou ID utilisateur");
      return { success: false, error: "Données d'avis ou ID utilisateur manquants" };
    }
    
    // Récupérer les données de l'utilisateur
    const userDoc = await db.collection("users").doc(userId).get();
    if (!userDoc.exists) {
      console.error(`❌ Utilisateur ${userId} non trouvé`);
      return { success: false, error: "Utilisateur non trouvé" };
    }
    
    const userData = userDoc.data();
    
    // Variables pour les informations de produit ou catégorie si nécessaire
    let productData = null;
    
    // Si c'est un avis sur un produit, récupérer les infos du produit
    if (reviewData.reviewType === 'product' && reviewData.productId) {
      const productDoc = await db.collection("products").doc(reviewData.productId).get();
      if (productDoc.exists) {
        productData = productDoc.data();
      }
    }
    
    // Générer le contenu de l'email
    const emailContent = generateReviewNotificationEmail(reviewData, userData, productData);
    
    // Envoyer l'email à l'administrateur
    const adminResult = await emailService.sendEmail(
      process.env.EMAIL_USER, // Adresse admin
      emailContent.subject,
      emailContent.html
    );
    
    if (!adminResult.success) {
      console.error("❌ Erreur lors de l'envoi de l'email à l'administrateur:", adminResult.error);
    }
    
    try {
      // Mettre à jour l'avis pour indiquer que la notification a été envoyée
      await db.collection("reviews").doc(reviewData.id).update({
        notificationSent: true,
        notificationSentDate: new Date()
      });
    } catch (updateError) {
      console.error("❌ Erreur lors de la mise à jour de l'avis:", updateError);
      // On continue même si l'update échoue
    }
    
    console.log("✅ Notifications de nouvel avis envoyées");
    return { success: true };
  } catch (error) {
    console.error("❌ Erreur lors de l'envoi des notifications d'avis:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Envoie une notification par email lorsqu'un administrateur répond à un avis
 * @param {Object} reviewData - Les données de l'avis
 * @param {Object} responseData - Les données de la réponse
 */
async function sendReviewResponseNotification(reviewData, responseData) {
  try {
    console.log("📧 Envoi de notification de réponse à un avis");
    
    // Vérifier que l'avis et la réponse existent
    if (!reviewData || !responseData) {
      console.error("❌ Données manquantes: avis ou réponse");
      return { success: false, error: "Données d'avis ou de réponse manquantes" };
    }
    
    // Récupérer les données de l'utilisateur
    const userDoc = await db.collection("users").doc(reviewData.userId).get();
    if (!userDoc.exists) {
      console.error(`❌ Utilisateur ${reviewData.userId} non trouvé`);
      return { success: false, error: "Utilisateur non trouvé" };
    }
    
    const userData = userDoc.data();
    
    // Générer le contenu de l'email
    const emailContent = generateReviewResponseEmail(reviewData, responseData, userData);
    
    // Envoyer l'email à l'utilisateur
    const userResult = await emailService.sendEmail(
      userData.email,
      emailContent.subject,
      emailContent.html
    );
    
    if (!userResult.success) {
      console.error("❌ Erreur lors de l'envoi de l'email à l'utilisateur:", userResult.error);
      return { success: false, error: userResult.error };
    }
    
    try {
      // Mettre à jour la réponse pour indiquer que la notification a été envoyée
      await db.collection("reviewResponses").doc(responseData.id).update({
        notificationSent: true,
        notificationSentDate: new Date()
      });
    } catch (updateError) {
      console.error("❌ Erreur lors de la mise à jour de la réponse:", updateError);
      // On continue même si l'update échoue
    }
    
    console.log("✅ Notification de réponse à l'avis envoyée");
    return { success: true };
  } catch (error) {
    console.error("❌ Erreur lors de l'envoi de la notification de réponse:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Envoie une notification par email lorsqu'un utilisateur modifie son avis
 * @param {Object} reviewData - Les nouvelles données de l'avis
 * @param {Object} previousReview - Les données précédentes de l'avis
 */
async function sendReviewUpdateNotification(reviewData, previousReview) {
  try {
    console.log("📧 Envoi de notification de modification d'avis");
    
    // Vérifier que l'avis existe
    if (!reviewData || !previousReview) {
      console.error("❌ Données manquantes: avis actuel ou précédent");
      return { success: false, error: "Données d'avis manquantes" };
    }
    
    // Récupérer les données de l'utilisateur
    const userDoc = await db.collection("users").doc(reviewData.userId).get();
    if (!userDoc.exists) {
      console.error(`❌ Utilisateur ${reviewData.userId} non trouvé`);
      return { success: false, error: "Utilisateur non trouvé" };
    }
    
    const userData = userDoc.data();
    
    // Générer le contenu de l'email
    const emailContent = generateReviewUpdateEmail(reviewData, userData, previousReview);
    
    // Envoyer l'email à l'administrateur
    const adminResult = await emailService.sendEmail(
      process.env.EMAIL_USER, // Adresse admin
      emailContent.subject,
      emailContent.html
    );
    
    if (!adminResult.success) {
      console.error("❌ Erreur lors de l'envoi de l'email à l'administrateur:", adminResult.error);
    }
    
    // Envoyer également un email de confirmation à l'utilisateur
    const userEmailContent = {
        subject: "Votre avis a bien été modifié - GameCash",
        html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Avis modifié - GameCash</title>
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
            .review-info {
              background-color: #f0f0ff;
              padding: 15px;
              border-radius: 5px;
              margin: 20px 0;
              border-left: 4px solid #6200ea;
            }
            .rating {
              color: #FFD700;
              font-size: 20px;
            }
            .footer {
              text-align: center;
              padding: 20px 0;
              font-size: 0.9em;
              color: #777;
              border-top: 1px solid #eee;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Votre avis a bien été modifié</h1>
            </div>
            
            <p>Bonjour ${userData.displayName || 'Cher client'},</p>
            
            <p>Nous confirmons que votre avis a bien été mis à jour.</p>
            
            <div class="review-info">
              <h2>Votre nouvel avis</h2>
              <p><strong>Note :</strong> <span class="rating">${'★'.repeat(Math.floor(reviewData.rating))}${reviewData.rating % 1 >= 0.5 ? '½' : ''}${'☆'.repeat(5 - Math.ceil(reviewData.rating))}</span> (${reviewData.rating}/5)</p>
              <p><strong>Date de modification :</strong> ${new Date().toLocaleDateString('fr-FR')}</p>
              ${reviewData.title ? `<p><strong>Titre :</strong> ${reviewData.title}</p>` : ''}
              <p><strong>Commentaire :</strong></p>
              <p style="background-color: #fff; padding: 10px; border-radius: 5px; border-left: 3px solid #6200ea;">${reviewData.comment}</p>
            </div>
            
            <p>Merci pour votre contribution !</p>
            
            <div class="footer">
              <p>© ${new Date().getFullYear()} GameCash - Tous droits réservés</p>
              <p>Ce message a été envoyé automatiquement par le système de notification de GameCash.</p>
            </div>
          </div>
        </body>
        </html>
        `
      };
      
      const userResult = await emailService.sendEmail(
        userData.email,
        userEmailContent.subject,
        userEmailContent.html
      );
      
      if (!userResult.success) {
        console.error("❌ Erreur lors de l'envoi de l'email à l'utilisateur:", userResult.error);
      }
      
      try {
        // Mettre à jour l'avis pour indiquer que la notification a été envoyée
        await db.collection("reviews").doc(reviewData.id).update({
          updateNotificationSent: true,
          updateNotificationSentDate: new Date()
        });
      } catch (updateError) {
        console.error("❌ Erreur lors de la mise à jour de l'avis:", updateError);
        // On continue même si l'update échoue
      }
      
      console.log("✅ Notifications de modification d'avis envoyées");
      return { success: true };
    } catch (error) {
      console.error("❌ Erreur lors de l'envoi des notifications de modification:", error);
      return { success: false, error: error.message };
    }
  }

  // Ajoutez cette fonction pour gérer les réponses admin
async function sendReviewResponseNotification(reviewData, responseData, userData = null) {
    try {
      console.log("📧 Envoi de notification de réponse à un avis");
      
      // Vérifier que l'avis et la réponse existent
      if (!reviewData || !responseData) {
        console.error("❌ Données manquantes: avis ou réponse");
        return { success: false, error: "Données d'avis ou de réponse manquantes" };
      }
      
      // Si userData n'est pas fourni, récupérer l'utilisateur à partir de reviewData
      if (!userData && reviewData.userId) {
        const userDoc = await db.collection("users").doc(reviewData.userId).get();
        if (userDoc.exists) {
          userData = userDoc.data();
        } else {
          console.error(`❌ Utilisateur ${reviewData.userId} non trouvé`);
          return { success: false, error: "Utilisateur non trouvé" };
        }
      }
      
      if (!userData) {
        console.error("❌ Données utilisateur manquantes");
        return { success: false, error: "Données utilisateur manquantes" };
      }
      
      // Générer le contenu de l'email (adapté pour les réponses admin)
      const emailContent = generateReviewResponseEmail(reviewData, responseData, userData);
      
      // Envoyer l'email à l'utilisateur
      const userResult = await emailService.sendEmail(
        userData.email,
        emailContent.subject,
        emailContent.html
      );
      
      if (!userResult.success) {
        console.error("❌ Erreur lors de l'envoi de l'email à l'utilisateur:", userResult.error);
        return { success: false, error: userResult.error };
      }
      
      console.log("✅ Notification de réponse à l'avis envoyée");
      return { success: true };
    } catch (error) {
      console.error("❌ Erreur lors de l'envoi de la notification de réponse:", error);
      return { success: false, error: error.message };
    }
  }
  
  module.exports = {
    sendNewReviewNotification,
    sendReviewResponseNotification,
    sendReviewUpdateNotification
  };