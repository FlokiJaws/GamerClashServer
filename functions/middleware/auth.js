// middleware/auth.js
const functions = require('firebase-functions');

const authenticateRequest = async (req, res, next) => {
  console.log("🔒 Tentative d'authentification d'une requête");
  console.log("Headers reçus:", JSON.stringify(req.headers, null, 2));

  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    console.log("❌ En-tête d'autorisation manquant ou incorrect");
    return res.status(401).json({ success: false, error: "Non autorisé" });
  }

  const token = authHeader.split(" ")[1];
  
  // Récupérer l'API key de la configuration Firebase ou des variables d'environnement
  let expectedToken;
  
  try {
    // Dans un environnement Firebase Functions
    const config = functions.config();
    expectedToken = config.api && config.api.key ? config.api.key : undefined;
    console.log("🔑 Configuration Firebase récupérée:", config.api ? "Oui" : "Non");
  } catch (error) {
    console.log("⚠️ Pas en environnement Firebase Functions, utilisation de process.env");
  }
  
  // Fallback sur les variables d'environnement
  if (!expectedToken) {
    expectedToken = process.env.API_KEY;
  }
  
  console.log("🔑 Token reçu:", token);
  console.log("🔑 Token attendu:", expectedToken ? "***" + expectedToken.slice(-4) : "Non configuré");

  // Vérifier le token
  if (!expectedToken || token !== expectedToken) {
    console.log("❌ Token invalide ou non configuré");
    return res.status(401).json({ success: false, error: "Token invalide" });
  }

  console.log("✅ Authentification réussie");
  next();
};

module.exports = authenticateRequest;