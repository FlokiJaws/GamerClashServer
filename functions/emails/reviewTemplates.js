const {formatDate} = require("../utils/dateFormatter");

function generateReviewNotificationEmail(reviewData, userData, productData = null) {
  const reviewType = reviewData.reviewType || "global";
  let subjectPrefix = "";
  let productSection = "";

  if (reviewType === "product" && productData) {
    subjectPrefix = `sur le produit ${productData.name} `;
    productSection = `
    <div class="product-info" style="margin-top: 15px; padding: 15px; background-color: #f5f5f5; border-radius: 5px;">
      <h3 style="margin-top: 0;">Produit concerné</h3>
      <p><strong>Nom du produit :</strong> ${productData.name}</p>
      <p><strong>Catégorie :</strong> ${productData.category || "Non spécifiée"}</p>
    </div>`;
  } else if (reviewType === "category") {
    subjectPrefix = `sur la catégorie ${reviewData.categoryName || "non spécifiée"} `;
  }

  return {
    subject: `Nouvel avis ${subjectPrefix}de ${userData.displayName || "un utilisateur"}`,
    html: `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Nouvel avis - GamerClash</title>
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
        .review-info {
          background-color: #f0f0ff;
          padding: 15px;
          border-radius: 5px;
          margin: 20px 0;
          border-left: 4px solid #6200ea;
        }
        .rating {
          color: #FFD700;
          font-size: 20px;
        }
        .user-info {
          background-color: #e8f5e9;
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
        .action-button {
          display: inline-block;
          padding: 10px 20px;
          background-color: #6200ea;
          color: white;
          text-decoration: none;
          border-radius: 5px;
          font-weight: bold;
          margin-top: 15px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Nouvel avis sur GamerClash</h1>
        </div>
        
        <div class="review-info">
          <h2>Détails de l'avis</h2>
          <p><strong>Note :</strong> <span class="rating">${"★".repeat(Math.floor(reviewData.rating))}${reviewData.rating % 1 >= 0.5 ? "½" : ""}${"☆".repeat(5 - Math.ceil(reviewData.rating))}</span> (${reviewData.rating}/5)</p>
          <p><strong>Date :</strong> ${formatDate(reviewData.createdAt)}</p>
          <p><strong>Type d'avis :</strong> ${
            reviewType === "product" ? "Produit" :
            reviewType === "category" ? "Catégorie" :
            "Site Global"
}</p>
          ${reviewData.title ? `<p><strong>Titre :</strong> ${reviewData.title}</p>` : ""}
          <p><strong>Commentaire :</strong></p>
          <p style="background-color: #fff; padding: 10px; border-radius: 5px; border-left: 3px solid #6200ea;">${reviewData.comment}</p>
        </div>
        
        ${productSection}
        
        <div class="user-info">
          <h2>Informations utilisateur</h2>
          <p><strong>Nom :</strong> ${userData.displayName || "Non spécifié"}</p>
          <p><strong>Email :</strong> ${userData.email}</p>
        </div>
        
        <div style="text-align: center; margin-top: 20px;">
          <a href="${process.env.WEBSITE_URL || "https://GamerClash.fr"}/admin/reviews" class="action-button">Gérer les avis</a>
        </div>
        
        <div class="footer">
          <p>© ${new Date().getFullYear()} GamerClash - Tous droits réservés</p>
          <p>Ce message a été envoyé automatiquement par le système de notification de GamerClash.</p>
        </div>
      </div>
    </body>
    </html>
    `,
  };
}

function generateReviewResponseEmail(reviewData, responseData, userData) {
  return {
    subject: `Réponse à votre avis sur GamerClash`,
    html: `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Réponse à votre avis - GamerClash</title>
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
        .review-info {
          background-color: #f0f0ff;
          padding: 15px;
          border-radius: 5px;
          margin: 20px 0;
          border-left: 4px solid #6200ea;
        }
        .response-info {
          background-color: #e3f2fd;
          padding: 15px;
          border-radius: 5px;
          margin: 20px 0;
          border-left: 4px solid #2196f3;
        }
        .rating {
          color: #FFD700;
          font-size: 20px;
        }
        .footer {
          text-align: center;
          padding: 20px 0;
          font-size: 0.9em;
          color: #777;
          border-top: 1px solid #eee;
        }
        .action-button {
          display: inline-block;
          padding: 10px 20px;
          background-color: #6200ea;
          color: white;
          text-decoration: none;
          border-radius: 5px;
          font-weight: bold;
          margin-top: 15px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Réponse à votre avis</h1>
        </div>
        
        <p>Bonjour ${userData.displayName || "Cher client"},</p>
        
        <p>L'équipe GamerClash a répondu à votre avis. Voici les détails :</p>
        
        <div class="review-info">
          <h2>Votre avis</h2>
          <p><strong>Note :</strong> <span class="rating">${"★".repeat(Math.floor(reviewData.rating))}${reviewData.rating % 1 >= 0.5 ? "½" : ""}${"☆".repeat(5 - Math.ceil(reviewData.rating))}</span> (${reviewData.rating}/5)</p>
          <p><strong>Date :</strong> ${formatDate(reviewData.createdAt)}</p>
          ${reviewData.title ? `<p><strong>Titre :</strong> ${reviewData.title}</p>` : ""}
          <p><strong>Votre commentaire :</strong></p>
          <p style="background-color: #fff; padding: 10px; border-radius: 5px; border-left: 3px solid #6200ea;">${reviewData.comment}</p>
        </div>
        
        <div class="response-info">
          <h2>Réponse de l'équipe GamerClash</h2>
          <p><strong>Date de réponse :</strong> ${formatDate(responseData.createdAt || new Date())}</p>
          <p><strong>Message :</strong></p>
          <p style="background-color: #fff; padding: 10px; border-radius: 5px; border-left: 3px solid #2196f3;">${responseData.comment}</p>
        </div>
        
        <div style="text-align: center; margin-top: 20px;">
          <a href="${process.env.WEBSITE_URL || "https://GamerClash.fr"}/reviews" class="action-button">Voir tous les avis</a>
        </div>
        
        <div class="footer">
          <p>© ${new Date().getFullYear()} GamerClash - Tous droits réservés</p>
          <p>Ce message a été envoyé automatiquement par le système de notification de GamerClash.</p>
        </div>
      </div>
    </body>
    </html>
    `,
  };
}

function generateReviewUpdateEmail(reviewData, userData, previousReview) {
  return {
    subject: `Modification d'un avis sur GamerClash`,
    html: `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Avis modifié - GamerClash</title>
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
        .review-info {
          background-color: #f0f0ff;
          padding: 15px;
          border-radius: 5px;
          margin: 20px 0;
          border-left: 4px solid #6200ea;
        }
        .previous-review {
          background-color: #fafafa;
          padding: 15px;
          border-radius: 5px;
          margin: 20px 0;
          border-left: 4px solid #9e9e9e;
        }
        .rating {
          color: #FFD700;
          font-size: 20px;
        }
        .user-info {
          background-color: #e8f5e9;
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
        .action-button {
          display: inline-block;
          padding: 10px 20px;
          background-color: #6200ea;
          color: white;
          text-decoration: none;
          border-radius: 5px;
          font-weight: bold;
          margin-top: 15px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Avis modifié sur GamerClash</h1>
        </div>
        
        <p>Un utilisateur a modifié son avis sur GamerClash.</p>
        
        <div class="review-info">
          <h2>Nouvel avis</h2>
          <p><strong>Note :</strong> <span class="rating">${"★".repeat(Math.floor(reviewData.rating))}${reviewData.rating % 1 >= 0.5 ? "½" : ""}${"☆".repeat(5 - Math.ceil(reviewData.rating))}</span> (${reviewData.rating}/5)</p>
          <p><strong>Date de modification :</strong> ${formatDate(new Date())}</p>
          ${reviewData.title ? `<p><strong>Titre :</strong> ${reviewData.title}</p>` : ""}
          <p><strong>Commentaire :</strong></p>
          <p style="background-color: #fff; padding: 10px; border-radius: 5px; border-left: 3px solid #6200ea;">${reviewData.comment}</p>
        </div>
        
        <div class="previous-review">
          <h2>Avis précédent</h2>
          <p><strong>Note :</strong> <span class="rating">${"★".repeat(Math.floor(previousReview.rating))}${previousReview.rating % 1 >= 0.5 ? "½" : ""}${"☆".repeat(5 - Math.ceil(previousReview.rating))}</span> (${previousReview.rating}/5)</p>
          <p><strong>Date de l'avis initial :</strong> ${formatDate(previousReview.createdAt)}</p>
          ${previousReview.title ? `<p><strong>Titre :</strong> ${previousReview.title}</p>` : ""}
          <p><strong>Commentaire :</strong></p>
          <p style="background-color: #fff; padding: 10px; border-radius: 5px; border-left: 3px solid #9e9e9e;">${previousReview.comment}</p>
        </div>
        
        <div class="user-info">
          <h2>Informations utilisateur</h2>
          <p><strong>Nom :</strong> ${userData.displayName || "Non spécifié"}</p>
          <p><strong>Email :</strong> ${userData.email}</p>
        </div>
        
        <div style="text-align: center; margin-top: 20px;">
          <a href="${process.env.WEBSITE_URL || "https://GamerClash.fr"}/admin/reviews" class="action-button">Gérer les avis</a>
        </div>
        
        <div class="footer">
          <p>© ${new Date().getFullYear()} GamerClash - Tous droits réservés</p>
          <p>Ce message a été envoyé automatiquement par le système de notification de GamerClash.</p>
        </div>
      </div>
    </body>
    </html>
    `,
  };
}

module.exports = {
  generateReviewNotificationEmail,
  generateReviewResponseEmail,
  generateReviewUpdateEmail,
};
