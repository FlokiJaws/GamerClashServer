// Charger les variables d'environnement en premier
require("dotenv").config();

// Log pour vérifier les variables d'environnement
console.log("Variables d'environnement chargées :");
console.log("API_KEY:", process.env.API_KEY ? "Définie" : "Non définie");
console.log("EMAIL_USER:", process.env.EMAIL_USER ? "Défini" : "Non défini");

// Importations des dépendances
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const nodemailer = require("nodemailer");
const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

// Initialiser Express
const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Initialisation de Firebase Admin
let serviceAccount;
try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    console.log("Utilisation des credentials Firebase depuis les variables d'environnement");
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  } else {
    console.log("Utilisation des credentials Firebase depuis le fichier local");
    serviceAccount = require("./firebase-service-account.json");
  }

  initializeApp({
    credential: cert(serviceAccount),
  });
  
  console.log("✅ Firebase initialisé avec succès");
} catch (error) {
  console.error("❌ Erreur lors de l'initialisation de Firebase:", error);
}

const db = getFirestore();

// Configuration du transporteur d'email
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: process.env.EMAIL_SECURE === "true",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

// Vérifier la connexion au service d'emails
transporter.verify((error, success) => {
  if (error) {
    console.error("❌ Erreur de connexion au service d'email:", error);
    console.error(
      "Vérifiez vos paramètres EMAIL_HOST, EMAIL_PORT, EMAIL_USER et EMAIL_PASSWORD"
    );
  } else {
    console.log("✅ Serveur prêt à envoyer des emails");
    console.log(`📧 Utilisateur email configuré: ${process.env.EMAIL_USER}`);
    console.log(
      `🔌 Serveur SMTP: ${process.env.EMAIL_HOST}:${process.env.EMAIL_PORT}`
    );
  }
});

// Fonction pour formater la date en français
// Fonction pour formater la date en français
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

// Middleware d'authentification avec logs de débogage
const authenticateRequest = async (req, res, next) => {
  console.log("🔒 Tentative d'authentification d'une requête");

  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    console.log("❌ En-tête d'autorisation manquant ou incorrect");
    console.log("Headers reçus:", req.headers);
    return res.status(401).json({ success: false, error: "Non autorisé" });
  }

  const token = authHeader.split(" ")[1];

  console.log("🔑 Token reçu:", token);
  console.log("🔑 Token attendu:", process.env.API_KEY);

  // Vérifier le token
  if (token !== process.env.API_KEY) {
    console.log("❌ Token invalide");
    return res.status(401).json({ success: false, error: "Token invalide" });
  }

  console.log("✅ Authentification réussie");
  next();
};

// Routes de test
app.get("/api/test-connection", (req, res) => {
  console.log("📡 Test de connexion reçu");
  res.json({
    success: true,
    message: "Connexion réussie au serveur d'emails",
    apiKeyConfigured: process.env.API_KEY ? "Oui" : "Non",
    timestamp: new Date().toISOString(),
  });
});

app.get("/api/test", (req, res) => {
  res.json({ message: "Le serveur d'emails fonctionne correctement!" });
});

app.get("/api/test-email", async (req, res) => {
  try {
    console.log("Route de test d'email appelée");

    // Configuration de l'email pour le test
    const mailOptions = {
      from: `"GameCash Test" <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_USER, // Envoi à vous-même
      subject: "Test d'envoi d'email",
      html: "<h1>Test d'envoi d'email</h1><p>Ceci est un test de votre serveur d'emails.</p>",
    };

    console.log("Options d'email configurées:", {
      from: mailOptions.from,
      to: mailOptions.to,
      subject: mailOptions.subject,
    });

    // Envoyer l'email
    const info = await transporter.sendMail(mailOptions);

    console.log("Email de test envoyé:", info.messageId);
    res.status(200).json({ success: true, messageId: info.messageId });
  } catch (error) {
    console.error("Erreur lors de l'envoi de l'email de test:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Route pour envoyer un email de notification de commande (version unique)
// Mise à jour de la route notify-admin dans server.js pour inclure des boutons d'action
app.post("/api/notify-admin", authenticateRequest, async (req, res) => {
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

    console.log(
      `🔍 Récupération des données pour la commande ${orderId} et l'utilisateur ${userId}`
    );

    // Récupérer les données de la commande depuis Firestore
    const orderDoc = await db.collection("orders").doc(orderId).get();
    if (!orderDoc.exists) {
      console.error(`❌ Commande ${orderId} non trouvée`);
      return res
        .status(404)
        .json({ success: false, error: "Commande non trouvée" });
    }

    const orderData = orderDoc.data();

    // Récupérer les données de l'utilisateur
    const userDoc = await db.collection("users").doc(userId).get();
    if (!userDoc.exists) {
      console.error(`❌ Utilisateur ${userId} non trouvé`);
      return res
        .status(404)
        .json({ success: false, error: "Utilisateur non trouvé" });
    }

    const userData = userDoc.data();
    console.log(
      `✅ Données récupérées pour ${userData.displayName || "l'utilisateur"}`
    );

    // Formater les articles pour l'email HTML
    const itemsList = orderData.items
      .map(
        (item) => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #eee;">${
          item.name
        }</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${
          item.quantity
        }</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">${item.price.toFixed(
          2
        )} €</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">${(
          item.price * item.quantity
        ).toFixed(2)} €</td>
      </tr>
    `
      )
      .join("");

    const shippingAddress = orderData.shippingAddress || {};

    // Affichons dans les logs ce que contient réellement shippingAddress pour déboguer
    console.log("📦 Données d'adresse de livraison:", shippingAddress);

    // Vérifier si on a bien une adresse valide
    if (!shippingAddress || !shippingAddress.address) {
      console.log(
        "⚠️ Pas d'adresse de livraison spécifiée dans la commande, utilisation des informations utilisateur"
      );
    }

    // Date de livraison estimée (7 jours après la commande)
    const orderDate = orderData.createdAt
      ? new Date(orderData.createdAt.seconds * 1000)
      : new Date();
    const deliveryDate = new Date(orderDate);
    deliveryDate.setDate(deliveryDate.getDate() + 7);

    // URL de base pour les actions d'administration (à définir dans les variables d'environnement)
    const baseUrl = process.env.ADMIN_API_URL || "https://votre-domaine.com";
    const apiKey = process.env.API_KEY;

    // Contenu de l'email amélioré avec des boutons d'action
    const emailHtml = `
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
        .action-buttons {
          display: block;
          margin: 20px 0;
          text-align: center;
        }
        .action-button {
          display: inline-block;
          padding: 12px 24px;
          margin: 0 10px;
          font-size: 16px;
          font-weight: bold;
          text-decoration: none;
          text-align: center;
          border-radius: 4px;
          transition: all 0.3s ease;
        }
        .confirm-button {
          background-color: #4caf50;
          color: white;
        }
        .confirm-button:hover {
          background-color: #388e3c;
        }
        .cancel-button {
          background-color: #f44336;
          color: white;
        }
        .cancel-button:hover {
          background-color: #d32f2f;
        }
        .tracking-form {
          background-color: #f9f9f9;
          border: 1px solid #eee;
          padding: 15px;
          border-radius: 5px;
          margin: 20px 0;
        }
        .tracking-form h3 {
          margin-top: 0;
        }
        .form-label {
          display: block;
          margin-bottom: 5px;
          font-weight: bold;
        }
        .form-input {
          display: block;
          width: 100%;
          padding: 10px;
          margin-bottom: 10px;
          border: 1px solid #ddd;
          border-radius: 4px;
          box-sizing: border-box;
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
          <p><strong>Numéro de commande :</strong> ${orderId.substring(
            0,
            8
          )}</p>
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
          <p><strong>Nom :</strong> ${
            userData.displayName || "Non spécifié"
          }</p>
          <p><strong>Email :</strong> ${userData.email}</p>
          <p><strong>Téléphone :</strong> ${
            userData.phone || "Non spécifié"
          }</p>
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
              <td style="text-align: right; padding: 10px;">${orderData.totalPrice.toFixed(
                2
              )} €</td>
            </tr>
          </tfoot>
        </table>
        
        <div class="delivery-info">
          <h2>Adresse de livraison</h2>
          <p>
            ${shippingAddress.name || userData.displayName || "Client"}<br>
            ${
              shippingAddress.address || userData.address || "Adresse non spécifiée"
            }<br>
            ${
              shippingAddress.addressComplement
                ? shippingAddress.addressComplement + "<br>"
                : ""
            }
            ${shippingAddress.postalCode || userData.postalCode || ""} ${
              shippingAddress.city || userData.city || ""
            }<br>
            ${shippingAddress.country || userData.country || "France"}
          </p>
          <p><strong>Livraison estimée :</strong> ${formatDate(deliveryDate)}</p>
        </div>
        
        <div class="action-buttons">
          <a href="${baseUrl}/api/confirm-order?orderId=${orderId}&token=${apiKey}" class="action-button confirm-button">Confirmer la commande</a>
          <a href="${baseUrl}/api/cancel-order?orderId=${orderId}&token=${apiKey}" class="action-button cancel-button">Annuler la commande</a>
        </div>
        
        <div class="tracking-form">
          <h3>Ajouter un numéro de suivi</h3>
          <form action="${baseUrl}/api/confirm-order" method="post">
            <input type="hidden" name="orderId" value="${orderId}">
            <input type="hidden" name="token" value="${apiKey}">
            
            <label class="form-label" for="trackingNumber">Numéro de suivi (facultatif):</label>
            <input class="form-input" type="text" id="trackingNumber" name="trackingNumber" placeholder="Entrez le numéro de suivi">
            
            <button type="submit" class="action-button confirm-button" style="width: 100%;">Confirmer avec numéro de suivi</button>
          </form>
        </div>
        
        <div class="footer">
          <p>© ${new Date().getFullYear()} GameCash - Tous droits réservés</p>
          <p>Ce message a été envoyé automatiquement par le système de notification de commandes.</p>
        </div>
      </div>
    </body>
    </html>
    `;

    // Configuration de l'email - uniquement à vous
    const mailOptions = {
      from: `"GameCash - Commandes" <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_USER,
      subject: `Nouvelle commande #${orderId.substring(0, 8)} de ${
        userData.displayName || "Client"
      }`,
      html: emailHtml,
    };

    console.log("📧 Envoi de la notification de commande:", {
      from: mailOptions.from,
      to: mailOptions.to,
      subject: mailOptions.subject,
    });

    // Envoyer l'email
    const info = await transporter.sendMail(mailOptions);

    // Mettre à jour la commande pour indiquer que l'email a été envoyé
    await db.collection("orders").doc(orderId).update({
      emailSent: true,
      emailSentDate: new Date(),
    });

    console.log("✅ Email de notification de commande envoyé:", info.messageId);
    res.status(200).json({ success: true, messageId: info.messageId });
  } catch (error) {
    console.error(
      "❌ Erreur lors de l'envoi de l'email de notification:",
      error
    );
    res.status(500).json({ success: false, error: error.message });
  }
});

// Route pour envoyer un email de notification de changement de statut
app.post(
  "/api/send-order-status-update",
  authenticateRequest,
  async (req, res) => {
    try {
      const { orderId, newStatus } = req.body;

      if (!orderId || !newStatus) {
        return res.status(400).json({
          success: false,
          error: "ID de commande et nouveau statut requis",
        });
      }

      // Récupérer les données de la commande depuis Firestore
      const orderDoc = await db.collection("orders").doc(orderId).get();
      if (!orderDoc.exists) {
        return res
          .status(404)
          .json({ success: false, error: "Commande non trouvée" });
      }

      const orderData = orderDoc.data();

      // Récupérer les données de l'utilisateur
      const userDoc = await db.collection("users").doc(orderData.userId).get();
      if (!userDoc.exists) {
        return res
          .status(404)
          .json({ success: false, error: "Utilisateur non trouvé" });
      }

      const userData = userDoc.data();

      // Adapter le message selon le statut
      let statusMessage = "";
      let statusTitle = "";

      switch (newStatus) {
        case "processing":
          statusTitle = "Commande en cours de traitement";
          statusMessage =
            "Commande en cours de préparation dans les entrepôts.";
          break;
        case "shipped":
          statusTitle = "Commande expédiée";
          statusMessage = "Commande expédiée et en cours d'acheminement.";
          break;
        case "delivered":
          statusTitle = "Commande livrée";
          statusMessage = "Commande marquée comme livrée.";
          break;
        case "cancelled":
          statusTitle = "Commande annulée";
          statusMessage = "Commande annulée comme demandé.";
          break;
        default:
          statusTitle = "Mise à jour de commande";
          statusMessage = `Statut de la commande mis à jour vers "${newStatus}".`;
      }

      // Contenu de l'email
      const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${statusTitle} - GameCash</title>
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
        .status-info {
          background-color: ${
            newStatus === "processing"
              ? "#e8f5e9"
              : newStatus === "shipped"
              ? "#e3f2fd"
              : newStatus === "delivered"
              ? "#e8f5e9"
              : newStatus === "cancelled"
              ? "#ffebee"
              : "#f8f9fa"
          };
          padding: 15px;
          border-radius: 5px;
          margin: 20px 0;
        }
        .order-info {
          background-color: #f8f9fa;
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
          <h1>${statusTitle}</h1>
        </div>
        
        <div class="status-info">
          <p>${statusMessage}</p>
          <p>Client: ${userData.displayName || "Non spécifié"} (${
        userData.email
      })</p>
        </div>
        
        <div class="order-info">
          <h2>Détails de la commande</h2>
          <p><strong>Numéro de commande :</strong> ${orderId.substring(
            0,
            8
          )}</p>
          <p><strong>Date de la commande :</strong> ${formatDate(
            orderData.createdAt
              ? new Date(orderData.createdAt.seconds * 1000)
              : new Date()
          )}</p>
          <p><strong>Nouveau statut :</strong> ${
            newStatus === "pending"
              ? "En attente"
              : newStatus === "processing"
              ? "En cours de traitement"
              : newStatus === "shipped"
              ? "Expédiée"
              : newStatus === "delivered"
              ? "Livrée"
              : newStatus === "cancelled"
              ? "Annulée"
              : newStatus
          }</p>
        </div>
        
        <div class="footer">
          <p>© ${new Date().getFullYear()} GameCash - Tous droits réservés</p>
        </div>
      </div>
    </body>
    </html>
    `;

      // Configuration de l'email - uniquement pour vous
      const mailOptions = {
        from: `"GameCash - Commandes" <${process.env.EMAIL_USER}>`,
        to: process.env.EMAIL_USER,
        subject: `${statusTitle} #${orderId.substring(0, 8)} - ${
          userData.displayName || "Client"
        }`,
        html: emailHtml,
      };

      // Envoyer l'email
      const info = await transporter.sendMail(mailOptions);

      console.log("Email de mise à jour de statut envoyé:", info.messageId);
      res.status(200).json({ success: true, messageId: info.messageId });
    } catch (error) {
      console.error("Erreur lors de l'envoi de l'email de statut:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// Ajout à server.js - Nouvelles routes pour la gestion des commandes
app.post("/api/confirm-order", authenticateRequest, async (req, res) => {
  try {
    console.log("📦 Confirmation de commande reçue");
    const { orderId, trackingNumber = "" } = req.body;

    if (!orderId) {
      console.error("❌ ID de commande manquant");
      return res.status(400).json({
        success: false,
        error: "ID de commande requis"
      });
    }

    // Récupérer les données de la commande depuis Firestore
    const orderDoc = await db.collection("orders").doc(orderId).get();
    if (!orderDoc.exists) {
      console.error(`❌ Commande ${orderId} non trouvée`);
      return res.status(404).json({ success: false, error: "Commande non trouvée" });
    }

    const orderData = orderDoc.data();
    const userId = orderData.userId;

    // Mettre à jour le statut de la commande
    await db.collection("orders").doc(orderId).update({
      status: "processing",
      trackingNumber: trackingNumber || null,
      processingDate: new Date(),
      updatedAt: new Date()
    });

    console.log(`✅ Commande ${orderId} confirmée avec succès`);

    // Envoyer un email à l'utilisateur pour l'informer de la confirmation
    if (userId) {
      const userDoc = await db.collection("users").doc(userId).get();
      if (userDoc.exists) {
        const userData = userDoc.data();
        
        // Configurer l'email de confirmation
        const mailOptions = {
          from: `"GameCash - Commandes" <${process.env.EMAIL_USER}>`,
          to: userData.email,
          subject: `Commande #${orderId.substring(0, 8)} confirmée`,
          html: generateOrderConfirmationEmail(orderData, userData, trackingNumber)
        };

        // Envoyer l'email
        await transporter.sendMail(mailOptions);
        console.log("📧 Email de confirmation envoyé à l'utilisateur");
      }
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error("❌ Erreur lors de la confirmation de la commande:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post("/api/cancel-order", authenticateRequest, async (req, res) => {
  try {
    console.log("❌ Annulation de commande reçue");
    const { orderId, cancelReason = "Annulée par l'administrateur" } = req.body;

    if (!orderId) {
      console.error("❌ ID de commande manquant");
      return res.status(400).json({
        success: false,
        error: "ID de commande requis"
      });
    }

    // Récupérer les données de la commande depuis Firestore
    const orderDoc = await db.collection("orders").doc(orderId).get();
    if (!orderDoc.exists) {
      console.error(`❌ Commande ${orderId} non trouvée`);
      return res.status(404).json({ success: false, error: "Commande non trouvée" });
    }

    const orderData = orderDoc.data();
    const userId = orderData.userId;

    // Mettre à jour le statut de la commande
    await db.collection("orders").doc(orderId).update({
      status: "cancelled",
      cancelReason: cancelReason,
      cancelledDate: new Date(),
      updatedAt: new Date()
    });

    console.log(`✅ Commande ${orderId} annulée avec succès`);

    // Envoyer un email à l'utilisateur pour l'informer de l'annulation
    if (userId) {
      const userDoc = await db.collection("users").doc(userId).get();
      if (userDoc.exists) {
        const userData = userDoc.data();
        
        // Configurer l'email d'annulation
        const mailOptions = {
          from: `"GameCash - Commandes" <${process.env.EMAIL_USER}>`,
          to: userData.email,
          subject: `Commande #${orderId.substring(0, 8)} annulée`,
          html: generateOrderCancellationEmail(orderData, userData, cancelReason)
        };

        // Envoyer l'email
        await transporter.sendMail(mailOptions);
        console.log("📧 Email d'annulation envoyé à l'utilisateur");
      }
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error("❌ Erreur lors de l'annulation de la commande:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Fonctions pour générer les templates d'email// Fonction pour générer le template d'email de confirmation de commande
function generateOrderConfirmationEmail(orderData, userData) {
  // Utiliser displayId s'il existe, sinon utiliser id s'il existe, 
  // sinon utiliser une valeur par défaut
  const orderId = orderData.displayId || 
                 (orderData.id ? orderData.id.substring(0, 8) : 'XXXXXXXX');
  
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <title>Commande confirmée - GameCash</title>
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
      .status-info {
        background-color: #e8f5e9;
        padding: 15px;
        border-radius: 5px;
        margin: 20px 0;
        border-left: 4px solid #4caf50;
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
        <h1>Commande confirmée</h1>
      </div>
      
      <p>Bonjour ${userData.displayName || 'Cher client'},</p>
      
      <div class="status-info">
        <p>Nous vous confirmons que nous avons bien reçu votre commande et qu'elle est en cours de traitement.</p>
        <p>Vous recevrez une notification dès que votre commande sera expédiée.</p>
      </div>
      
      <div class="order-info">
        <h2>Détails de la commande</h2>
        <p><strong>Numéro de commande :</strong> ${orderId}</p>
        <p><strong>Date de la commande :</strong> ${formatDate(orderData.createdAt)}</p>
        <p><strong>Total :</strong> ${orderData.totalPrice.toFixed(2)} €</p>
      </div>
      
      <div class="order-info">
        <h2>Articles commandés</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr>
              <th style="text-align: left; padding: 8px; border-bottom: 1px solid #ddd;">Produit</th>
              <th style="text-align: center; padding: 8px; border-bottom: 1px solid #ddd;">Quantité</th>
              <th style="text-align: right; padding: 8px; border-bottom: 1px solid #ddd;">Prix</th>
            </tr>
          </thead>
          <tbody>
            ${orderData.items.map(item => `
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.name}</td>
                <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
                <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">${(item.price * item.quantity).toFixed(2)} €</td>
              </tr>
            `).join('')}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="2" style="text-align: right; padding: 8px; font-weight: bold;">Total</td>
              <td style="text-align: right; padding: 8px; font-weight: bold;">${orderData.totalPrice.toFixed(2)} €</td>
            </tr>
          </tfoot>
        </table>
      </div>
      
      <div class="order-info">
        <h2>Adresse de livraison</h2>
        <p>
          ${userData.displayName || 'Cher client'}<br>
          ${orderData.shippingAddress ? orderData.shippingAddress.address : 'Adresse non spécifiée'}<br>
          ${orderData.shippingAddress ? orderData.shippingAddress.postalCode + ' ' + orderData.shippingAddress.city : ''}<br>
          ${orderData.shippingAddress ? orderData.shippingAddress.country : 'France'}
        </p>
      </div>
      
      <p>Nous vous remercions pour votre confiance et restons à votre disposition pour toute question.</p>
      
      <div class="footer">
        <p>© ${new Date().getFullYear()} GameCash - Tous droits réservés</p>
      </div>
    </div>
  </body>
  </html>
  `;
}

// Fonction pour générer le template d'email de livraison
function generateOrderDeliveredEmail(orderData, userData) {
  const orderId = orderData.displayId || 
                 (orderData.id ? orderData.id.substring(0, 8) : 'XXXXXXXX');
  
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <title>Commande livrée - GameCash</title>
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
        color: #4caf50;
        margin: 20px 0;
      }
      .order-info {
        background-color: #f8f9fa;
        padding: 15px;
        border-radius: 5px;
        margin: 20px 0;
      }
      .delivered-info {
        background-color: #e8f5e9;
        padding: 15px;
        border-radius: 5px;
        margin: 20px 0;
        border-left: 4px solid #4caf50;
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
        <h1>Commande livrée</h1>
      </div>
      
      <p>Bonjour ${userData.displayName || 'Cher client'},</p>
      
      <div class="delivered-info">
        <h2>Votre commande a été livrée</h2>
        <p>Nous espérons que vous êtes satisfait(e) de vos articles.</p>
      </div>
      
      <div class="order-info">
        <h2>Détails de la commande</h2>
        <p><strong>Numéro de commande :</strong> ${orderId}</p>
        <p><strong>Date de la commande :</strong> ${formatDate(orderData.createdAt)}</p>
        <p><strong>Total :</strong> ${orderData.totalPrice.toFixed(2)} €</p>
      </div>
      
      <p>Si vous rencontrez un problème avec votre commande, n'hésitez pas à nous contacter.</p>
      
      <p>Merci pour votre confiance et à bientôt sur GameCash !</p>
      
      <div class="footer">
        <p>© ${new Date().getFullYear()} GameCash - Tous droits réservés</p>
      </div>
    </div>
  </body>
  </html>
  `;
}

// Fonction pour générer le template d'email d'annulation de commande
function generateOrderCancellationEmail(orderData, userData, cancelReason = "Commande annulée") {
  const orderId = orderData.displayId || 
                 (orderData.id ? orderData.id.substring(0, 8) : 'XXXXXXXX');
  
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <title>Commande annulée - GameCash</title>
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
        color: #f44336;
        margin: 20px 0;
      }
      .order-info {
        background-color: #f8f9fa;
        padding: 15px;
        border-radius: 5px;
        margin: 20px 0;
      }
      .cancel-reason {
        background-color: #ffebee;
        padding: 15px;
        border-radius: 5px;
        margin: 20px 0;
        border-left: 4px solid #f44336;
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
        <h1>Commande annulée</h1>
      </div>
      
      <p>Bonjour ${userData.displayName || 'Cher client'},</p>
      
      <p>Nous sommes désolés de vous informer que votre commande a été annulée.</p>
      
      <div class="cancel-reason">
        <h2>Motif d'annulation</h2>
        <p>${cancelReason}</p>
      </div>
      
      <div class="order-info">
        <h2>Détails de la commande</h2>
        <p><strong>Numéro de commande :</strong> ${orderId}</p>
        <p><strong>Date de la commande :</strong> ${formatDate(orderData.createdAt)}</p>
        <p><strong>Total :</strong> ${orderData.totalPrice.toFixed(2)} €</p>
      </div>
      
      <p>Si vous avez des questions concernant cette annulation, n'hésitez pas à contacter notre service client.</p>
      
      <div class="footer">
        <p>© ${new Date().getFullYear()} GameCash - Tous droits réservés</p>
      </div>
    </div>
  </body>
  </html>
  `;
}

// Route pour mettre à jour le numéro de suivi et changer le statut à "shipped"
app.post("/api/update-tracking", authenticateRequest, async (req, res) => {
  try {
    console.log("📦 Mise à jour du numéro de suivi reçue");
    const { orderId, trackingNumber, newStatus = "shipped" } = req.body;

    if (!orderId) {
      console.error("❌ ID de commande manquant");
      return res.status(400).json({
        success: false,
        error: "ID de commande requis"
      });
    }

    // Récupérer les données de la commande depuis Firestore
    const orderDoc = await db.collection("orders").doc(orderId).get();
    if (!orderDoc.exists) {
      console.error(`❌ Commande ${orderId} non trouvée`);
      return res.status(404).json({ success: false, error: "Commande non trouvée" });
    }

    const orderData = orderDoc.data();
    const userId = orderData.userId;

    // Mettre à jour la commande avec le numéro de suivi et le nouveau statut
    await db.collection("orders").doc(orderId).update({
      status: newStatus,
      trackingNumber: trackingNumber || null,
      shippedDate: new Date(),
      updatedAt: new Date()
    });

    console.log(`✅ Numéro de suivi mis à jour pour la commande ${orderId}`);

    // Envoyer un email à l'utilisateur pour l'informer de l'expédition
    if (userId) {
      const userDoc = await db.collection("users").doc(userId).get();
      if (userDoc.exists) {
        const userData = userDoc.data();
        
        // Configurer l'email d'expédition
        const mailOptions = {
          from: `"GameCash - Commandes" <${process.env.EMAIL_USER}>`,
          to: userData.email,
          subject: `Commande #${orderId.substring(0, 8)} expédiée`,
          html: generateOrderShippedEmail(orderData, userData, trackingNumber)
        };

        // Envoyer l'email
        await transporter.sendMail(mailOptions);
        console.log("📧 Email d'expédition envoyé à l'utilisateur");
      }
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error("❌ Erreur lors de la mise à jour du numéro de suivi:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Fonction pour générer le template d'email d'expédition
// Fonction pour générer le template d'email d'expédition
function generateOrderShippedEmail(orderData, userData, trackingNumber = null) {
  // Vérifier et obtenir un ID sécurisé
  const orderId = orderData.displayId || 
                 (orderData.id ? orderData.id.substring(0, 8) : 'XXXXXXXX');
  
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <title>Commande expédiée - GameCash</title>
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
        color: #4caf50;
        margin: 20px 0;
      }
      .order-info {
        background-color: #f8f9fa;
        padding: 15px;
        border-radius: 5px;
        margin: 20px 0;
      }
      .tracking-info {
        background-color: #e3f2fd;
        padding: 15px;
        border-radius: 5px;
        margin: 20px 0;
        border-left: 4px solid #2196f3;
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
        <h1>Commande expédiée</h1>
      </div>
      
      <p>Bonjour ${userData.displayName || 'Cher client'},</p>
      
      <p>Bonne nouvelle ! Votre commande a été expédiée et est en route vers vous.</p>
      
      ${trackingNumber ? `
      <div class="tracking-info">
        <h2>Suivi de votre colis</h2>
        <p><strong>Numéro de suivi :</strong> ${trackingNumber}</p>
        <p>Vous pouvez utiliser ce numéro pour suivre votre colis sur le site du transporteur.</p>
      </div>
      ` : ''}
      
      <div class="order-info">
        <h2>Détails de la commande</h2>
        <p><strong>Numéro de commande :</strong> ${orderId}</p>
        <p><strong>Date de la commande :</strong> ${formatDate(orderData.createdAt)}</p>
        <p><strong>Total :</strong> ${orderData.totalPrice.toFixed(2)} €</p>
      </div>
      
      <p>Merci pour votre confiance et à bientôt sur GameCash !</p>
      
      <div class="footer">
        <p>© ${new Date().getFullYear()} GameCash - Tous droits réservés</p>
      </div>
    </div>
  </body>
  </html>
  `;
}

// Route pour envoyer un email de confirmation de commande au client
app.post("/api/send-order-confirmation", authenticateRequest, async (req, res) => {
  try {
    console.log("📧 Envoi de confirmation de commande au client");
    const { orderId, userId } = req.body;

    if (!orderId || !userId) {
      console.error("❌ Données manquantes: ID commande ou ID utilisateur");
      return res.status(400).json({
        success: false,
        error: "ID de commande et ID utilisateur requis",
      });
    }

    // Récupérer les données de la commande
    const orderDoc = await db.collection("orders").doc(orderId).get();
    if (!orderDoc.exists) {
      return res.status(404).json({ success: false, error: "Commande non trouvée" });
    }

    const orderData = orderDoc.data();

    // Récupérer les données de l'utilisateur
    const userDoc = await db.collection("users").doc(userId).get();
    if (!userDoc.exists) {
      return res.status(404).json({ success: false, error: "Utilisateur non trouvé" });
    }

    const userData = userDoc.data();
    const userEmail = userData.email;

    if (!userEmail) {
      return res.status(400).json({ success: false, error: "Email utilisateur non disponible" });
    }

    // Générer l'email de confirmation pour le client
    const emailHtml = generateOrderConfirmationEmail(orderData, userData);

    // Configuration de l'email pour le client
    const mailOptions = {
      from: `"GameCash - Commandes" <${process.env.EMAIL_USER}>`,
      to: userEmail,
      subject: `Confirmation de commande #${orderData.displayId || orderId.substring(0, 8)}`,
      html: emailHtml,
    };

    console.log("📧 Envoi d'email de confirmation au client:", userEmail);

    // Envoyer l'email
    const info = await transporter.sendMail(mailOptions);

    // Mettre à jour la commande pour indiquer que l'email a été envoyé
    await db.collection("orders").doc(orderId).update({
      customerEmailSent: true,
      customerEmailSentDate: new Date(),
    });

    console.log("✅ Email de confirmation envoyé au client:", info.messageId);
    res.status(200).json({ success: true, messageId: info.messageId });
  } catch (error) {
    console.error("❌ Erreur lors de l'envoi de l'email de confirmation:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Route pour envoyer un email de mise à jour de statut au client
app.post("/api/send-status-update-to-customer", authenticateRequest, async (req, res) => {
  try {
    console.log("📧 Envoi de notification de changement de statut au client");
    const { orderId, newStatus, trackingNumber } = req.body;

    if (!orderId || !newStatus) {
      return res.status(400).json({
        success: false,
        error: "ID de commande et nouveau statut requis",
      });
    }

    // Récupérer les données de la commande
    const orderDoc = await db.collection("orders").doc(orderId).get();
    if (!orderDoc.exists) {
      return res.status(404).json({ success: false, error: "Commande non trouvée" });
    }

    const orderData = orderDoc.data();
    const userId = orderData.userId;

    // Récupérer les données de l'utilisateur
    const userDoc = await db.collection("users").doc(userId).get();
    if (!userDoc.exists) {
      return res.status(404).json({ success: false, error: "Utilisateur non trouvé" });
    }

    const userData = userDoc.data();
    const userEmail = userData.email;

    if (!userEmail) {
      return res.status(400).json({ success: false, error: "Email utilisateur non disponible" });
    }

    // Générer l'email approprié selon le statut
    let emailHtml;
    let emailSubject;

    switch (newStatus) {
      case "processing":
        emailHtml = generateOrderProcessingEmail(orderData, userData);
        emailSubject = `Votre commande #${orderData.displayId || orderId.substring(0, 8)} est en cours de traitement`;
        break;
      case "shipped":
        emailHtml = generateOrderShippedEmail(orderData, userData, trackingNumber);
        emailSubject = `Votre commande #${orderData.displayId || orderId.substring(0, 8)} a été expédiée`;
        break;
      case "delivered":
        emailHtml = generateOrderDeliveredEmail(orderData, userData);
        emailSubject = `Votre commande #${orderData.displayId || orderId.substring(0, 8)} a été livrée`;
        break;
      case "cancelled":
        emailHtml = generateOrderCancellationEmail(orderData, userData, req.body.cancelReason || "Commande annulée");
        emailSubject = `Votre commande #${orderData.displayId || orderId.substring(0, 8)} a été annulée`;
        break;
      default:
        emailHtml = generateOrderStatusUpdateEmail(orderData, userData, newStatus);
        emailSubject = `Mise à jour de votre commande #${orderData.displayId || orderId.substring(0, 8)}`;
    }

    // Configuration de l'email pour le client
    const mailOptions = {
      from: `"GameCash - Commandes" <${process.env.EMAIL_USER}>`,
      to: userEmail,
      subject: emailSubject,
      html: emailHtml,
    };

    console.log(`📧 Envoi d'email de statut "${newStatus}" au client:`, userEmail);

    // Envoyer l'email
    const info = await transporter.sendMail(mailOptions);

    // Mettre à jour la commande pour indiquer que l'email a été envoyé
    await db.collection("orders").doc(orderId).update({
      lastCustomerEmailSent: newStatus,
      lastCustomerEmailSentDate: new Date(),
    });

    console.log("✅ Email de mise à jour de statut envoyé au client:", info.messageId);
    res.status(200).json({ success: true, messageId: info.messageId });
  } catch (error) {
    console.error("❌ Erreur lors de l'envoi de l'email de mise à jour:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});


function generateOrderProcessingEmail(orderData, userData) {
  // Vérifier et obtenir un ID sécurisé
  const orderId = orderData.displayId || 
                 (orderData.id ? orderData.id.substring(0, 8) : 'XXXXXXXX');
  
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <title>Commande en cours de traitement - GameCash</title>
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
      .status-info {
        background-color: #e8f5e9;
        padding: 15px;
        border-radius: 5px;
        margin: 20px 0;
        border-left: 4px solid #4caf50;
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
        <h1>Commande en cours de traitement</h1>
      </div>
      
      <p>Bonjour ${userData.displayName || 'Cher client'},</p>
      
      <div class="status-info">
        <p>Nous vous informons que votre commande est maintenant en cours de traitement dans nos entrepôts.</p>
        <p>Vous recevrez une notification dès que votre commande sera expédiée.</p>
      </div>
      
      <div class="order-info">
        <h2>Détails de la commande</h2>
        <p><strong>Numéro de commande :</strong> ${orderId}</p>
        <p><strong>Date de la commande :</strong> ${formatDate(orderData.createdAt)}</p>
        <p><strong>Total :</strong> ${orderData.totalPrice.toFixed(2)} €</p>
      </div>
      
      <p>Nous vous remercions pour votre confiance et restons à votre disposition pour toute question.</p>
      
      <div class="footer">
        <p>© ${new Date().getFullYear()} GameCash - Tous droits réservés</p>
      </div>
    </div>
  </body>
  </html>
  `;
}

// Fonction pour générer le template d'email de statut général
function generateOrderStatusUpdateEmail(orderData, userData, status) {
  // Traduire le statut en français
  const statusTranslation = {
    'pending': 'En attente',
    'processing': 'En cours de traitement',
    'shipped': 'Expédiée',
    'delivered': 'Livrée',
    'cancelled': 'Annulée'
  };
  
  const statusFrench = statusTranslation[status] || status;
  
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <title>Mise à jour de commande - GameCash</title>
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
      .status-info {
        background-color: #e3f2fd;
        padding: 15px;
        border-radius: 5px;
        margin: 20px 0;
        border-left: 4px solid #2196f3;
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
        <h1>Mise à jour de votre commande</h1>
      </div>
      
      <p>Bonjour ${userData.displayName || 'Cher client'},</p>
      
      <div class="status-info">
        <p>Nous vous informons que le statut de votre commande a été mis à jour.</p>
        <p><strong>Nouveau statut :</strong> ${statusFrench}</p>
      </div>
      
      <div class="order-info">
        <h2>Détails de la commande</h2>
        <p><strong>Numéro de commande :</strong> ${orderData.displayId || orderData.id.substring(0, 8)}</p>
        <p><strong>Date de la commande :</strong> ${formatDate(orderData.createdAt)}</p>
        <p><strong>Total :</strong> ${orderData.totalPrice.toFixed(2)} €</p>
      </div>
      
      <p>Nous vous remercions pour votre confiance et restons à votre disposition pour toute question.</p>
      
      <div class="footer">
        <p>© ${new Date().getFullYear()} GameCash - Tous droits réservés</p>
      </div>
    </div>
  </body>
  </html>
  `;
}



// Démarrer le serveur
app.listen(PORT, () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
});
