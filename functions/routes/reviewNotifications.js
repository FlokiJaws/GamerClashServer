// functions/routes/reviewNotifications.js - Mise à jour avec nouveau middleware
const express = require("express");
const router = express.Router();
const {db} = require("../firebase/config");
const reviewNotificationService = require("../services/reviewNotificationService");
const authenticateRequest = require("../middleware/auth");

// Route pour envoyer une notification pour un nouvel avis
router.post("/notify-new-review", authenticateRequest, async (req, res) => {
  try {
    console.log("📧 Notification de nouvel avis reçue");
    const {reviewId, userId} = req.body;

    if (!reviewId || !userId) {
      console.error("❌ Données manquantes: ID de l'avis ou ID utilisateur");
      return res.status(400).json({
        success: false,
        error: "ID de l'avis et ID utilisateur requis",
      });
    }

    // Récupérer les données de l'avis depuis Firestore
    const reviewDoc = await db.collection("reviews").doc(reviewId).get();
    if (!reviewDoc.exists) {
      console.error(`❌ Avis ${reviewId} non trouvé`);
      return res.status(404).json({success: false, error: "Avis non trouvé"});
    }

    const reviewData = {id: reviewId, ...reviewDoc.data()};

    // Envoyer la notification
    const result = await reviewNotificationService.sendNewReviewNotification(reviewData, userId);

    if (!result.success) {
      return res.status(500).json({success: false, error: result.error});
    }

    res.status(200).json({success: true});
  } catch (error) {
    console.error("❌ Erreur lors de l'envoi de la notification:", error);
    res.status(500).json({success: false, error: error.message});
  }
});

// Route pour envoyer une notification de réponse à un avis
router.post("/notify-review-response", authenticateRequest, async (req, res) => {
  try {
    console.log("📧 Notification de réponse à un avis reçue");
    const {reviewId, responseId} = req.body;

    if (!reviewId || !responseId) {
      console.error("❌ Données manquantes: ID de l'avis ou ID de la réponse");
      return res.status(400).json({
        success: false,
        error: "ID de l'avis et ID de la réponse requis",
      });
    }

    // Récupérer les données de l'avis
    const reviewDoc = await db.collection("reviews").doc(reviewId).get();
    if (!reviewDoc.exists) {
      console.error(`❌ Avis ${reviewId} non trouvé`);
      return res.status(404).json({success: false, error: "Avis non trouvé"});
    }

    // Récupérer les données de la réponse
    const responseDoc = await db.collection("reviewResponses").doc(responseId).get();
    if (!responseDoc.exists) {
      console.error(`❌ Réponse ${responseId} non trouvée`);
      return res.status(404).json({success: false, error: "Réponse non trouvée"});
    }

    const reviewData = {id: reviewId, ...reviewDoc.data()};
    const responseData = {id: responseId, ...responseDoc.data()};

    // Envoyer la notification
    const result = await reviewNotificationService.sendReviewResponseNotification(reviewData, responseData);

    if (!result.success) {
      return res.status(500).json({success: false, error: result.error});
    }

    res.status(200).json({success: true});
  } catch (error) {
    console.error("❌ Erreur lors de l'envoi de la notification:", error);
    res.status(500).json({success: false, error: error.message});
  }
});

// Route pour envoyer une notification de modification d'avis
router.post("/notify-review-update", authenticateRequest, async (req, res) => {
  try {
    console.log("📧 Notification de modification d'avis reçue");
    const {reviewId, previousReview} = req.body;

    if (!reviewId || !previousReview) {
      console.error("❌ Données manquantes: ID de l'avis ou données précédentes");
      return res.status(400).json({
        success: false,
        error: "ID de l'avis et données précédentes requis",
      });
    }

    // Récupérer les données actuelles de l'avis
    const reviewDoc = await db.collection("reviews").doc(reviewId).get();
    if (!reviewDoc.exists) {
      console.error(`❌ Avis ${reviewId} non trouvé`);
      return res.status(404).json({success: false, error: "Avis non trouvé"});
    }

    const reviewData = {id: reviewId, ...reviewDoc.data()};

    // Envoyer la notification
    const result = await reviewNotificationService.sendReviewUpdateNotification(reviewData, previousReview);

    if (!result.success) {
      return res.status(500).json({success: false, error: result.error});
    }

    res.status(200).json({success: true});
  } catch (error) {
    console.error("❌ Erreur lors de l'envoi de la notification:", error);
    res.status(500).json({success: false, error: error.message});
  }
});

// Route pour envoyer une notification de réponse admin à un avis
router.post("/notify-admin-reply", authenticateRequest, async (req, res) => {
  try {
    console.log("📧 Notification de réponse admin à un avis reçue");
    const {reviewId, reviewData, responseData} = req.body;

    if (!reviewId || !reviewData || !responseData) {
      console.error("❌ Données manquantes: données de l'avis ou de la réponse");
      return res.status(400).json({
        success: false,
        error: "Données de l'avis et de la réponse requises",
      });
    }

    // Récupérer les données de l'utilisateur
    const userId = reviewData.userId;
    if (!userId) {
      console.error("❌ Aucun ID utilisateur trouvé dans les données de l'avis");
      return res.status(400).json({success: false, error: "ID utilisateur manquant"});
    }

    const userDoc = await db.collection("users").doc(userId).get();
    if (!userDoc.exists) {
      console.error(`❌ Utilisateur ${userId} non trouvé`);
      return res.status(404).json({success: false, error: "Utilisateur non trouvé"});
    }

    const userData = userDoc.data();

    // Envoyer la notification
    const result = await reviewNotificationService.sendReviewResponseNotification(reviewData, responseData, userData);

    if (!result.success) {
      return res.status(500).json({success: false, error: result.error});
    }

    res.status(200).json({success: true});
  } catch (error) {
    console.error("❌ Erreur lors de l'envoi de la notification:", error);
    res.status(500).json({success: false, error: error.message});
  }
});

module.exports = router;
