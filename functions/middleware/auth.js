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
  
  // Récupérer l'API key de la configuration Firebase
  const config = functions.config();
  const expectedToken = config.api?.key || process.env.API_KEY;
  
  console.log("🔑 Token reçu:", token);
  console.log("🔑 Token attendu (config):", config.api?.key);
  console.log("🔑 Token attendu (env):", process.env.API_KEY);

  // Vérifier le token
  if (token !== expectedToken) {
    console.log("❌ Token invalide");
    return res.status(401).json({ success: false, error: "Token invalide" });
  }

  console.log("✅ Authentification réussie");
  next();
};

module.exports = authenticateRequest;