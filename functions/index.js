const functions = require('firebase-functions');
const admin = require('firebase-admin');
const express = require('express');
const cors = require('cors');

// Initialiser Firebase Admin (seulement si pas déjà fait)
if (!admin.apps.length) {
  admin.initializeApp();
}

// Créer l'app Express
const app = express();

// Configuration CORS
const corsOptions = {
  origin: [
    'http://localhost:3000',
    'https://gamecash.vercel.app',
    'https://gamecash-*.vercel.app'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
app.use(express.json());

// Importer vos routes
const reviewNotificationsRoutes = require('./routes/reviewNotifications');
const userNotificationsRoutes = require('./routes/userNotifications');
const verificationRoutes = require('./routes/verificationRoutes');
const registrationRoutes = require('./routes/registrationRoutes');

// Middleware d'authentification global
const authenticateRequest = async (req, res, next) => {
  console.log("🔒 Tentative d'authentification d'une requête");

  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    console.log("❌ En-tête d'autorisation manquant ou incorrect");
    return res.status(401).json({ success: false, error: "Non autorisé" });
  }

  const token = authHeader.split(" ")[1];

  // Utiliser functions.config() pour les variables d'environnement
  if (token !== functions.config().api.key) {
    console.log("❌ Token invalide");
    return res.status(401).json({ success: false, error: "Token invalide" });
  }

  console.log("✅ Authentification réussie");
  next();
};

// Routes de test
app.get('/api/test', (req, res) => {
  res.json({ message: 'Firebase Functions fonctionne!' });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: 'production'
  });
});

// Enregistrer vos routes
app.use('/api/reviews', reviewNotificationsRoutes);
app.use('/api/users', userNotificationsRoutes);
app.use('/api/verification', verificationRoutes);
app.use('/api/registration', registrationRoutes);

// Route pour notify-admin (copiez le code depuis server.js)
app.post("/api/notify-admin", authenticateRequest, async (req, res) => {
  // Copiez votre logique existante ici
});

// Exporter la fonction
exports.emailService = functions
  .region('europe-west1')
  .runWith({
    timeoutSeconds: 300,
    memory: '512MB'
  })
  .https.onRequest(app);