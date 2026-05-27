/**
 * SECUREDEAL — Configuration API Frontend
 * Modifiez SD_API_BASE pour pointer vers votre backend Render
 *
 * IMPORTANT : ce fichier doit être chargé AVANT api.js dans chaque page
 * <script src="/js/config.js"></script>
 * <script src="/js/api.js"></script>
 */

// URL de votre backend Render — à modifier après déploiement
window.SD_API_BASE = 'https://securedeal-api.onrender.com/api/v1';

// En développement local, api.js détecte automatiquement localhost
// et utilise http://localhost:3001/api/v1
