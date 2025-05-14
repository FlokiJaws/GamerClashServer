// routes/verificationRoutes.js
const express = require("express");
const router = express.Router();
const verificationEmailService = require("../services/verificationEmailService");
const {db} = require("../firebase/config");

// Middleware d'authentification
const authenticateRequest = async (req, res, next) => {
  console.log("🔒 Tentative d'authentification d'une requête");

  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    console.log("❌ En-tête d'autorisation manquant ou incorrect");
    return res.status(401).json({success: false, error: "Non autorisé"});
  }

  const token = authHeader.split(" ")[1];

  // Vérifier le token
  if (token !== process.env.API_KEY) {
    console.log("❌ Token invalide");
    return res.status(401).json({success: false, error: "Token invalide"});
  }

  console.log("✅ Authentification réussie");
  next();
};

// Route pour envoyer un email de vérification
router.post("/send-verification-email", authenticateRequest, async (req, res) => {
  try {
    console.log("📧 Demande d'envoi d'email de vérification");
    const {userId} = req.body;

    if (!userId) {
      console.error("❌ ID utilisateur manquant");
      return res.status(400).json({
        success: false,
        error: "ID utilisateur requis",
      });
    }

    // Récupérer les données de l'utilisateur
    const userDoc = await db.collection("users").doc(userId).get();
    if (!userDoc.exists) {
      console.error(`❌ Utilisateur ${userId} non trouvé`);
      return res.status(404).json({success: false, error: "Utilisateur non trouvé"});
    }

    const userData = {...userDoc.data(), uid: userId};

    // Vérifier si l'email est déjà vérifié
    if (userData.emailVerified) {
      console.log(`ℹ️ L'email de l'utilisateur ${userId} est déjà vérifié`);
      return res.status(400).json({success: false, error: "Email déjà vérifié"});
    }

    // Envoyer l'email de vérification
    const result = await verificationEmailService.sendVerificationEmail(userData);

    if (!result.success) {
      return res.status(500).json({success: false, error: result.error});
    }

    res.status(200).json({
      success: true,
      message: "Email de vérification envoyé",
      expiresAt: result.expiresAt,
    });
  } catch (error) {
    console.error("❌ Erreur lors de l'envoi de l'email de vérification:", error);
    res.status(500).json({success: false, error: error.message});
  }
});

// Route pour vérifier un code
router.post("/verify-code", authenticateRequest, async (req, res) => {
  try {
    console.log("🔍 Demande de vérification de code");
    const {userId, code} = req.body;

    if (!userId || !code) {
      console.error("❌ ID utilisateur ou code manquant");
      return res.status(400).json({
        success: false,
        error: "ID utilisateur et code requis",
      });
    }

    // Vérifier le code
    const result = await verificationEmailService.verifyCode(userId, code);

    if (!result.success) {
      return res.status(400).json({success: false, error: result.error});
    }

    res.status(200).json({success: true, message: "Email vérifié avec succès"});
  } catch (error) {
    console.error("❌ Erreur lors de la vérification du code:", error);
    res.status(500).json({success: false, error: error.message});
  }
});

// Route pour renvoyer un email de vérification
router.post("/resend-verification-email", authenticateRequest, async (req, res) => {
  try {
    console.log("📧 Demande de renvoi d'email de vérification");
    const {userId} = req.body;

    if (!userId) {
      console.error("❌ ID utilisateur manquant");
      return res.status(400).json({
        success: false,
        error: "ID utilisateur requis",
      });
    }

    // Renvoyer l'email de vérification
    const result = await verificationEmailService.resendVerificationEmail(userId);

    if (!result.success) {
      return res.status(400).json({success: false, error: result.error});
    }

    res.status(200).json({
      success: true,
      message: "Email de vérification renvoyé",
      expiresAt: result.expiresAt,
    });
  } catch (error) {
    console.error("❌ Erreur lors du renvoi de l'email de vérification:", error);
    res.status(500).json({success: false, error: error.message});
  }
});

// Route pour vérifier le statut de vérification d'un utilisateur
router.get("/verification-status/:userId", authenticateRequest, async (req, res) => {
  try {
    console.log("🔍 Demande de statut de vérification");
    const {userId} = req.params;

    if (!userId) {
      console.error("❌ ID utilisateur manquant");
      return res.status(400).json({
        success: false,
        error: "ID utilisateur requis",
      });
    }

    // Récupérer les données de l'utilisateur
    const userDoc = await db.collection("users").doc(userId).get();
    if (!userDoc.exists) {
      console.error(`❌ Utilisateur ${userId} non trouvé`);
      return res.status(404).json({success: false, error: "Utilisateur non trouvé"});
    }

    const userData = userDoc.data();

    // Récupérer les données de vérification
    const verificationRef = db.collection("emailVerifications").doc(userId);
    const verificationDoc = await verificationRef.get();

    let verificationData = null;
    if (verificationDoc.exists) {
      const rawData = verificationDoc.data();
      verificationData = {
        ...rawData,
        createdAt: rawData.createdAt.toDate(),
        expiresAt: rawData.expiresAt.toDate(),
        verifiedAt: rawData.verifiedAt ? rawData.verifiedAt.toDate() : null,
      };
    }

    res.status(200).json({
      success: true,
      emailVerified: userData.emailVerified || false,
      emailVerifiedAt: userData.emailVerifiedAt ? userData.emailVerifiedAt.toDate() : null,
      verificationData: verificationData,
    });
  } catch (error) {
    console.error("❌ Erreur lors de la récupération du statut de vérification:", error);
    res.status(500).json({success: false, error: error.message});
  }
});

module.exports = router;
