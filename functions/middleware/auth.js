// middleware/auth.js
const authenticateRequest = async (req, res, next) => {
    console.log("🔒 Tentative d'authentification d'une requête");
    console.log("📋 Headers reçus:", JSON.stringify(req.headers, null, 2));
  
    const authHeader = req.headers.authorization;
  
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.log("❌ En-tête d'autorisation manquant ou incorrect");
      return res.status(401).json({ success: false, error: "Non autorisé" });
    }
  
    const token = authHeader.split(" ")[1];
    
    // Utiliser directement les variables d'environnement pour Firebase Functions v2
    const expectedToken = process.env.API_KEY || "votre_cle_api_secrete";
    
    console.log("🔑 Token reçu:", token ? `${token.substring(0, 10)}...` : "aucun");
    console.log("🔑 Token attendu:", expectedToken ? `${expectedToken.substring(0, 10)}...` : "aucun");
  
    // Vérifier le token
    if (token !== expectedToken) {
      console.log("❌ Token invalide");
      return res.status(401).json({ success: false, error: "Token invalide" });
    }
  
    console.log("✅ Authentification réussie");
    next();
  };
  
  module.exports = authenticateRequest;