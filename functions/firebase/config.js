const {initializeApp, cert, getApps} = require("firebase-admin/app");
const {getFirestore} = require("firebase-admin/firestore");

// Initialisation de Firebase Admin
let app;
let db;

try {
  // Vérifier si Firebase est déjà initialisé
  if (getApps().length === 0) {
    let serviceAccount;
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      console.log("Utilisation des credentials Firebase depuis les variables d'environnement");
      serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    } else {
      console.log("Utilisation des credentials Firebase depuis le fichier local");
      serviceAccount = require("../firebase-service-account.json");
    }

    app = initializeApp({
      credential: cert(serviceAccount),
    });

    console.log("✅ Firebase initialisé avec succès dans le module");
  } else {
    console.log("✅ Utilisation de l'instance Firebase existante");
    app = getApps()[0];
  }

  // Initialisation de Firestore
  db = getFirestore(app);
} catch (error) {
  console.error("❌ Erreur lors de l'initialisation de Firebase dans le module:", error);
}

module.exports = {
  db,
};
