// functions/index.js - Version complète corrigée
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

// Importer le middleware d'authentification
const authenticateRequest = require('./middleware/auth');

// Importer vos routes
const reviewNotificationsRoutes = require('./routes/reviewNotifications');
const userNotificationsRoutes = require('./routes/userNotifications');
const verificationRoutes = require('./routes/verificationRoutes');
const registrationRoutes = require('./routes/registrationRoutes');
// Import de la fonction contact
const contactService = require('./services/contactService');

// Route pour les emails de contact
app.post("/api/contact/send", authenticateRequest, async (req, res) => {
  try {
    const { contactData } = req.body;
    
    if (!contactData || !contactData.name || !contactData.email || !contactData.subject || !contactData.message) {
      return res.status(400).json({
        success: false,
        error: "Tous les champs sont requis"
      });
    }
    
    const result = await contactService.sendContactEmail(contactData);
    
    res.status(result.success ? 200 : 500).json(result);
  } catch (error) {
    console.error("❌ Erreur lors de l'envoi de l'email de contact:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Route pour la racine et health check (sans auth)
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

// Routes de test (sans auth)
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

// Route de test d'authentification
app.get('/api/test-auth', authenticateRequest, (req, res) => {
  res.json({ 
    message: 'Authentification réussie!',
    timestamp: new Date().toISOString()
  });
});

// Enregistrer vos routes (avec auth)
app.use('/api/reviews', reviewNotificationsRoutes);
app.use('/api/users', userNotificationsRoutes);
app.use('/api/verification', verificationRoutes);
app.use('/api/registration', registrationRoutes);

// Importer les utilitaires
const { sendEmail } = require('./services/emailService');

// Route pour notify-admin
app.post("/api/notify-admin", authenticateRequest, async (req, res) => {
  try {
    console.log("📧 Notification de commande reçue");
    console.log("Body reçu:", JSON.stringify(req.body, null, 2));
    
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
    console.log("Données de commande récupérées:", JSON.stringify(orderData, null, 2));
    
    const userDoc = await admin.firestore().collection("users").doc(userId).get();
    if (!userDoc.exists) {
      return res.status(404).json({ success: false, error: "Utilisateur non trouvé" });
    }

    const userData = userDoc.data();
    console.log("Données utilisateur récupérées:", JSON.stringify(userData, null, 2));

    // Générer l'email HTML
    const emailHtml = generateOrderNotificationEmail(orderData, userData, orderId);

    // Envoyer l'email
    const result = await sendEmail(
      process.env.EMAIL_USER || "contactgamerclash@gmail.com",
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
app.post("/api/send-order-confirmation", authenticateRequest, async (req, res) => {
  try {
    console.log("📧 Envoi de confirmation de commande au client");
    console.log("Body reçu:", JSON.stringify(req.body, null, 2));
    
    const { orderId, userId } = req.body;

    if (!orderId || !userId) {
      return res.status(400).json({
        success: false,
        error: "ID de commande et ID utilisateur requis",
      });
    }

    const orderDoc = await admin.firestore().collection("orders").doc(orderId).get();
    if (!orderDoc.exists) {
      return res.status(404).json({ success: false, error: "Commande non trouvée" });
    }

    const orderData = orderDoc.data();
    console.log("Données de commande récupérées:", JSON.stringify(orderData, null, 2));
    
    const userDoc = await admin.firestore().collection("users").doc(userId).get();
    if (!userDoc.exists) {
      return res.status(404).json({ success: false, error: "Utilisateur non trouvé" });
    }

    const userData = userDoc.data();
    console.log("Données utilisateur récupérées:", JSON.stringify(userData, null, 2));

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

// Fonctions pour générer les templates d'emails
function generateOrderNotificationEmail(orderData, userData, orderId) {
  // Vérifier et formater les données avec des valeurs par défaut
  const totalPrice = orderData.totalPrice || orderData.totalAmount || orderData.subtotal || 0;
  const displayId = orderData.displayId || orderId.substring(0, 8);
  const userName = userData.displayName || userData.email || 'Client';
  
  // Formater les articles avec vérifications
  const itemsList = (orderData.items || [])
    .map(
      (item) => `
    <tr>
      <td style="padding: 10px; border-bottom: 1px solid #eee;">${
        item.name || 'Produit'
      }</td>
      <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${
        item.quantity || 0
      }</td>
      <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">${
        item.price ? item.price.toFixed(2) : '0.00'
      } €</td>
      <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">${
        (item.price && item.quantity) ? (item.price * item.quantity).toFixed(2) : '0.00'
      } €</td>
    </tr>
  `
    )
    .join("");

  const shippingAddress = orderData.shippingAddress || {};

  // Date de livraison estimée (7 jours après la commande)
  const orderDate = orderData.createdAt
    ? new Date(orderData.createdAt.seconds * 1000)
    : new Date();
  const deliveryDate = new Date(orderDate);
  deliveryDate.setDate(deliveryDate.getDate() + 7);

  // URL de base pour les actions d'administration
  const baseUrl = process.env.ADMIN_API_URL || "https://votre-domaine.com";
  const apiKey = process.env.API_KEY || "votre_cle_api_secrete";

  // Contenu de l'email
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <title>Nouvelle Commande - GameCash</title>
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
      .order-info {
        background-color: #f8f9fa;
        padding: 15px;
        border-radius: 5px;
        margin: 20px 0;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        margin: 20px 0;
      }
      th {
        background-color: #f0f0f0;
        padding: 10px;
        text-align: left;
      }
      .total {
        font-weight: bold;
        font-size: 1.1em;
      }
      .customer-info {
        background-color: #e8f5e9;
        padding: 15px;
        border-radius: 5px;
        margin: 20px 0;
      }
      .delivery-info {
        background-color: #e3f2fd;
        padding: 15px;
        border-radius: 5px;
        margin: 20px 0;
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
        <h1>Nouvelle Commande</h1>
      </div>
      
      <p>Une nouvelle commande vient d'être passée sur GameCash.</p>
      
      <div class="order-info">
        <h2>Détails de la commande</h2>
        <p><strong>Numéro de commande :</strong> ${displayId}</p>
        <p><strong>Date de la commande :</strong> ${formatDate(orderDate)}</p>
        <p><strong>Statut :</strong> ${
          orderData.status === "pending"
            ? "En attente"
            : orderData.status === "processing"
            ? "En cours de traitement"
            : orderData.status === "shipped"
            ? "Expédiée"
            : orderData.status === "delivered"
            ? "Livrée"
            : "En attente"
        }</p>
      </div>
      
      <div class="customer-info">
        <h2>Informations client</h2>
        <p><strong>Nom :</strong> ${userName}</p>
        <p><strong>Email :</strong> ${userData.email || "Non spécifié"}</p>
        <p><strong>Téléphone :</strong> ${userData.phone || "Non spécifié"}</p>
      </div>
      
      <h2>Articles commandés</h2>
      <table>
        <thead>
          <tr>
            <th>Produit</th>
            <th style="text-align: center;">Quantité</th>
            <th style="text-align: right;">Prix unitaire</th>
            <th style="text-align: right;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${itemsList}
        </tbody>
        <tfoot>
          <tr class="total">
            <td colspan="3" style="text-align: right; padding: 10px;">Total</td>
            <td style="text-align: right; padding: 10px;">${totalPrice.toFixed(2)} €</td>
          </tr>
        </tfoot>
      </table>
      
      <div class="footer">
        <p>© ${new Date().getFullYear()} GameCash - Tous droits réservés</p>
        <p>Ce message a été envoyé automatiquement par le système de notification de commandes.</p>
      </div>
    </div>
  </body>
  </html>
  `;
}

function generateOrderConfirmationEmail(orderData, userData, orderId) {
  // Vérifier et formater les données avec des valeurs par défaut
  const totalPrice = orderData.totalPrice || orderData.totalAmount || orderData.subtotal || 0;
  const displayId = orderData.displayId || orderId.substring(0, 8);
  const userName = userData.displayName || 'Cher client';
  
  // Formater la date de création
  const orderDate = orderData.createdAt ? 
    (orderData.createdAt.seconds ? new Date(orderData.createdAt.seconds * 1000) : new Date(orderData.createdAt)) :
    new Date();
  
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <title>Confirmation de commande - GameCash</title>
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
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>Confirmation de commande</h1>
      </div>
      <p>Bonjour ${userName},</p>
      <p>Nous avons bien reçu votre commande n°${displayId}.</p>
      <p>Total: ${totalPrice.toFixed(2)} €</p>
    </div>
  </body>
  </html>
  `;
}

// Fonction utilitaire pour formater les dates
function formatDate(date) {
  if (!date) return 'Date non disponible';
  
  // Si c'est un timestamp Firestore
  if (date && date.seconds) {
    date = new Date(date.seconds * 1000);
  }
  
  // S'assurer que c'est un objet Date
  if (!(date instanceof Date)) {
    try {
      date = new Date(date);
    } catch (e) {
      return 'Date invalide';
    }
  }
  
  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

// Exporter la fonction
exports.emailService = functions.https.onRequest(app);