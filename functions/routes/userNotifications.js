// routes/userNotifications.js
const express = require('express');
const router = express.Router();
const userNotificationService = require('../services/userNotificationService');

// Middleware d'authentification
const authenticateRequest = async (req, res, next) => {
  console.log("🔒 Tentative d'authentification d'une requête");

  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    console.log("❌ En-tête d'autorisation manquant ou incorrect");
    return res.status(401).json({ success: false, error: "Non autorisé" });
  }

  const token = authHeader.split(" ")[1];

  // Vérifier le token
  if (token !== process.env.API_KEY) {
    console.log("❌ Token invalide");
    return res.status(401).json({ success: false, error: "Token invalide" });
  }

  console.log("✅ Authentification réussie");
  next();
};

// Route pour envoyer un email de bienvenue à un nouvel utilisateur
router.post('/welcome', authenticateRequest, async (req, res) => {
  try {
    console.log("📧 Requête d'envoi d'email de bienvenue reçue");
    const { userData } = req.body;

    if (!userData || !userData.email) {
      console.error("❌ Données manquantes: email utilisateur");
      return res.status(400).json({
        success: false,
        error: "Email utilisateur requis"
      });
    }

    // Envoyer l'email de bienvenue
    const result = await userNotificationService.sendWelcomeEmail(userData);

    if (!result.success) {
      return res.status(500).json({ success: false, error: result.error });
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error("❌ Erreur lors de l'envoi de l'email de bienvenue:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Route pour notifier l'administrateur d'un nouvel utilisateur
router.post('/notify-admin', authenticateRequest, async (req, res) => {
  try {
    console.log("📧 Requête de notification admin pour nouvel utilisateur reçue");
    const { userData } = req.body;

    if (!userData) {
      console.error("❌ Données utilisateur manquantes");
      return res.status(400).json({
        success: false,
        error: "Données utilisateur requises"
      });
    }

    // Envoyer la notification à l'administrateur
    const result = await userNotificationService.sendNewUserNotification(userData);

    if (!result.success) {
      return res.status(500).json({ success: false, error: result.error });
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error("❌ Erreur lors de l'envoi de la notification à l'administrateur:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;