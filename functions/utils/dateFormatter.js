// utils/dateFormatter.js
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
  
  module.exports = {
    formatDate
  };