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

// Configuration CORS pour permettre Vercel
const corsOptions = {
  origin: [
    'http://localhost:3000',
    'https://gamecash.vercel.app',
    'https://gamecash-*.vercel.app',
    /https:\/\/.*\.vercel\.app$/
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

// Route pour la racine et health check
app.get('/', (req, res) => {
  res.json({ 
    message: 'Firebase Functions Email Service is running!',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

app.get('/api', (req, res) => {
  res.json({ 
    message: 'Firebase Functions API is running!',
    endpoints: [
      '/api/test',
      '/api/health',
      '/api/reviews/*',
      '/api/users/*',
      '/api/verification/*',
      '/api/registration/*',
      '/api/notify-admin',
      '/api/send-order-confirmation'
    ]
  });
});

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

// Copier toutes les routes de server.js
const { sendEmailApiRequest } = require('./utils/emailUtils');

// Route pour notify-admin
app.post("/api/notify-admin", async (req, res) => {
  try {
    console.log("📧 Notification de commande reçue");
    const { orderId, userId } = req.body;

    if (!orderId || !userId) {
      console.error("❌ Données manquantes: ID commande ou ID utilisateur");
      return res.status(400).json({
        success: false,
        error: "ID de commande et ID utilisateur requis",
      });
    }

    // Récupérer les données depuis Firestore
    const orderDoc = await admin.firestore().collection("orders").doc(orderId).get();
    if (!orderDoc.exists) {
      return res.status(404).json({ success: false, error: "Commande non trouvée" });
    }

    const orderData = orderDoc.data();
    const userDoc = await admin.firestore().collection("users").doc(userId).get();
    if (!userDoc.exists) {
      return res.status(404).json({ success: false, error: "Utilisateur non trouvé" });
    }

    const userData = userDoc.data();

    // Générer l'email HTML (copier la logique depuis server.js)
    const emailHtml = generateOrderNotificationEmail(orderData, userData, orderId);

    // Envoyer l'email
    const result = await sendEmail(
      functions.config().email.user,
      `Nouvelle commande #${orderId.substring(0, 8)} de ${userData.displayName || "Client"}`,
      emailHtml
    );

    if (result.success) {
      await admin.firestore().collection("orders").doc(orderId).update({
        emailSent: true,
        emailSentDate: new Date(),
      });
    }

    res.status(200).json(result);
  } catch (error) {
    console.error("❌ Erreur:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Route pour send-order-confirmation
app.post("/api/send-order-confirmation", async (req, res) => {
  try {
    const { orderId, userId } = req.body;

    if (!orderId || !userId) {
      return res.status(400).json({
        success: false,
        error: "ID de commande et ID utilisateur requis",
      });
    }

    // Logique similaire à notify-admin
    const orderDoc = await admin.firestore().collection("orders").doc(orderId).get();
    if (!orderDoc.exists) {
      return res.status(404).json({ success: false, error: "Commande non trouvée" });
    }

    const orderData = orderDoc.data();
    const userDoc = await admin.firestore().collection("users").doc(userId).get();
    if (!userDoc.exists) {
      return res.status(404).json({ success: false, error: "Utilisateur non trouvé" });
    }

    const userData = userDoc.data();

    // Générer et envoyer l'email
    const emailHtml = generateOrderConfirmationEmail(orderData, userData, orderId);
    
    const result = await sendEmail(
      userData.email,
      `Confirmation de commande #${orderId.substring(0, 8)}`,
      emailHtml
    );

    if (result.success) {
      await admin.firestore().collection("orders").doc(orderId).update({
        customerEmailSent: true,
        customerEmailSentDate: new Date(),
      });
    }

    res.status(200).json(result);
  } catch (error) {
    console.error("❌ Erreur:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Fonction helper pour l'envoi d'emails
async function sendEmail(to, subject, html) {
  const emailService = require('./services/emailService');
  return await emailService.sendEmail(to, subject, html);
}

// Fonctions pour générer les templates d'emails (copier depuis server.js)
function generateOrderNotificationEmail(orderData, userData, orderId) {
  // Copier le template HTML depuis server.js
  return `<!DOCTYPE html>... votre template HTML ...`;
}

function generateOrderConfirmationEmail(orderData, userData, orderId) {
  // Copier le template HTML depuis server.js
  return `<!DOCTYPE html>... votre template HTML ...`;
}

// Exporter la fonction
exports.emailService = functions
  .region('europe-west1')
  .runWith({
    timeoutSeconds: 300,
    memory: '512MB'
  })
  .https.onRequest(app);