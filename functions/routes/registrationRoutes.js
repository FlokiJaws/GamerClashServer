// routes/registrationRoutes.js
const express = require('express');
const router = express.Router();
const registrationService = require('../services/registrationService');
const { db } = require('../firebase/config');

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

// Route pour enregistrer un nouvel utilisateur
router.post('/register', authenticateRequest, async (req, res) => {
  try {
    console.log("👤 Requête d'enregistrement d'un nouvel utilisateur");
    const { userData } = req.body;

    if (!userData || !userData.email || !userData.uid) {
      console.error("❌ Données utilisateur incomplètes");
      return res.status(400).json({
        success: false,
        error: "Données utilisateur incomplètes (email et uid requis)"
      });
    }

    // Enregistrer l'utilisateur
    const result = await registrationService.registerUser(userData);

    if (!result.success) {
      if (result.error === "Utilisateur déjà enregistré") {
        return res.status(409).json({ success: false, error: result.error });
      }
      return res.status(500).json({ success: false, error: result.error });
    }

    res.status(201).json({
      success: true,
      message: result.message,
      user: result.user,
      verificationStatus: result.verificationStatus,
      expiresAt: result.expiresAt
    });
  } catch (error) {
    console.error("❌ Erreur lors de l'enregistrement de l'utilisateur:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Route pour vérifier un compte utilisateur
router.post('/verify-account', authenticateRequest, async (req, res) => {
  try {
    console.log("🔍 Requête de vérification de compte utilisateur");
    const { userId, verificationCode } = req.body;

    if (!userId || !verificationCode) {
      console.error("❌ ID utilisateur ou code de vérification manquant");
      return res.status(400).json({
        success: false,
        error: "ID utilisateur et code de vérification requis"
      });
    }

    // Vérifier le compte
    const result = await registrationService.verifyUserAccount(userId, verificationCode);

    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error });
    }

    res.status(200).json({
      success: true,
      message: result.message,
      user: result.user
    });
  } catch (error) {
    console.error("❌ Erreur lors de la vérification du compte:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Route pour envoyer un email de bienvenue
router.post('/send-welcome-email', authenticateRequest, async (req, res) => {
  try {
    console.log("📧 Requête d'envoi d'email de bienvenue");
    const { userId } = req.body;

    if (!userId) {
      console.error("❌ ID utilisateur manquant");
      return res.status(400).json({
        success: false,
        error: "ID utilisateur requis"
      });
    }

    // Envoyer l'email de bienvenue
    const result = await registrationService.sendWelcomeEmail(userId);

    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error });
    }

    res.status(200).json({
      success: true,
      message: "Email de bienvenue envoyé avec succès"
    });
  } catch (error) {
    console.error("❌ Erreur lors de l'envoi de l'email de bienvenue:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Route pour vérifier le statut d'enregistrement d'un utilisateur
router.get('/status/:userId', authenticateRequest, async (req, res) => {
  try {
    console.log("🔍 Requête de statut d'enregistrement d'un utilisateur");
    const { userId } = req.params;

    if (!userId) {
      console.error("❌ ID utilisateur manquant");
      return res.status(400).json({
        success: false,
        error: "ID utilisateur requis"
      });
    }

    // Récupérer les données de l'utilisateur
    const userDoc = await db.collection("users").doc(userId).get();
    if (!userDoc.exists) {
      return res.status(404).json({ success: false, error: "Utilisateur non trouvé" });
    }

    const userData = userDoc.data();
    
    // Récupérer les données de vérification si elles existent
    let verificationData = null;
    const verificationDoc = await db.collection("emailVerifications").doc(userId).get();
    
    if (verificationDoc.exists) {
      const rawData = verificationDoc.data();
      verificationData = {
        ...rawData,
        createdAt: rawData.createdAt.toDate(),
        expiresAt: rawData.expiresAt.toDate(),
        verifiedAt: rawData.verifiedAt ? rawData.verifiedAt.toDate() : null
      };
    }

    res.status(200).json({
      success: true,
      user: {
        ...userData,
        createdAt: userData.createdAt ? userData.createdAt.toDate() : null,
        updatedAt: userData.updatedAt ? userData.updatedAt.toDate() : null,
        emailVerifiedAt: userData.emailVerifiedAt ? userData.emailVerifiedAt.toDate() : null,
        welcomeEmailSentDate: userData.welcomeEmailSentDate ? userData.welcomeEmailSentDate.toDate() : null
      },
      verificationData: verificationData
    });
  } catch (error) {
    console.error("❌ Erreur lors de la récupération du statut d'enregistrement:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;