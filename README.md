# SecureDeal — Frontend v2 🛡️

Refonte complète du frontend SecureDeal.  
Thème **Dark & Gold** — Responsive zéro overflow — Performance optimisée.

---

## Stack technique

| Technologie | Détail |
|---|---|
| HTML5 | Sémantique, accessible (ARIA) |
| CSS3 | Variables CSS, Grid, Flexbox, Animations |
| JavaScript | Vanilla ES6+, aucune dépendance |
| Fonts | Sora + DM Sans + JetBrains Mono (Google Fonts) |

---

## Structure des fichiers

```
frontend/
├── index.html                    ← Page d'accueil
├── css/
│   ├── design-system.css         ← Variables, reset, utilitaires globaux
│   ├── main.css                  ← Styles principaux (header, hero, sections)
│   ├── brand.css                 ← Composants brand (dashboard, modals, auth)
│   └── loader.css                ← Spinner doré + barre de progression
├── js/
│   ├── loader.js                 ← Page loader (spinner 1.5s minimum)
│   ├── utils.js                  ← Utilitaires globaux (toast, auth, scroll-top)
│   └── icons.js                  ← Icônes SVG inline
├── pages/
│   ├── how-it-works.html         ← Page Fonctionnement
│   ├── categories.html           ← Page Catégories
│   ├── tracking.html             ← Page Suivi (fond sombre corrigé)
│   ├── about.html                ← Page À propos (contenu professionnel)
│   ├── contact.html              ← Page Contact
│   ├── dashboard.html            ← Dashboard principal
│   ├── auth/
│   │   ├── login.html            ← Connexion
│   │   ├── register.html         ← Inscription
│   │   └── forgot-password.html  ← Mot de passe oublié
│   ├── dashboard/
│   │   ├── vendor.html           ← Espace vendeur
│   │   └── buyer.html            ← Espace acheteur
│   └── legal/
│       ├── mentions-legales.html
│       ├── cgu.html
│       ├── confidentialite.html
│       └── cookies.html
└── images/
    └── logo/
        ├── securedeal-logo-white.svg
        └── favicon.svg
```

---

## Palette de couleurs

| Rôle | Valeur |
|---|---|
| Fond principal | `#0a0a0a` |
| Fond sections alternées | `#0f0f0f` / `#141414` |
| Or primaire | `#C9A227` |
| Or clair | `#E6C84E` |
| Or sombre | `#A68420` |
| Texte blanc | `rgba(255,255,255,0.80)` |
| Texte muted | `rgba(255,255,255,0.45)` |

---

## Fonctionnalités clés v2

### Navigation
- Logo SVG inline (bouclier + texte SECURE + DEAL)
- Liens renommés : **Fonctionnement** (ex. "Comment ça marche"), **Suivi** (ex. "Suivi commande")
- **Hamburger → Croix rouge** : animation CSS pure au clic
- Menu mobile avec bouton **Se connecter** intégré
- Dropdown catégories sur desktop

### Responsive (zéro overflow)
- Carte de suivi hero visible sur **tous** les écrans (mobile : empilée sous le texte)
- `box-sizing: border-box` sur tous les éléments
- `overflow-x: hidden` sur html et body
- Grilles adaptatives : 4 cols → 2 cols → 1 col selon largeur

### Performance
- Loader doré affiché **1,5s minimum** avant révélation du site
- Barre de progression fine en haut de page
- Scroll reveal via `IntersectionObserver` (pas de JS lourd)
- Compteurs animés sur les statistiques
- Transitions de page fluides

### Design
- Thème **Dark & Gold** (#0a0a0a + #C9A227)
- Grille animée en arrière-plan du hero
- Orbes dorés flottants
- Shimmer effect sur les CTA principaux
- Scrollbar personnalisée or sur hover

---

## Déploiement — Serveur statique

### Option 1 : Serveur local rapide (développement)
```bash
# Python 3
cd frontend/
python3 -m http.server 8080
# → http://localhost:8080
```

### Option 2 : Nginx (production)
```nginx
server {
    listen 80;
    server_name yourdomain.com;
    root /var/www/securedeal;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Compression
    gzip on;
    gzip_types text/html text/css application/javascript image/svg+xml;

    # Cache assets
    location ~* \.(css|js|svg|png|jpg|webp)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # HTTPS redirect
    return 301 https://$host$request_uri;
}
```

### Option 3 : Déploiement sur Render.com (recommandé)

1. Créer un compte sur [render.com](https://render.com)
2. Clic **New → Static Site**
3. Connecter votre dépôt GitHub/GitLab
4. Configurer :
   - **Build Command** : *(laisser vide — pas de build nécessaire)*
   - **Publish Directory** : `frontend`
5. Cliquer **Create Static Site**
6. Render déploie automatiquement à chaque push sur `main`

**Variables d'environnement** : Aucune requise pour le frontend seul.

### Option 4 : Netlify / Vercel
```bash
# Netlify CLI
npm install -g netlify-cli
netlify deploy --dir=frontend --prod

# Vercel CLI
npm install -g vercel
vercel --prod
```

---

## Connexion au backend

Le frontend utilise `SD.Auth` (dans `js/utils.js`) pour gérer l'authentification via `localStorage`.

Pour connecter le backend SecureDeal :

1. Remplacer les appels `SD.Auth.getUser()` par des appels à votre API JWT
2. Configurer l'URL de base dans un fichier `js/config.js` :

```javascript
window.SD_CONFIG = {
  API_BASE: 'https://api.securedeal.com/v1',
  ENV: 'production'
};
```

---

## Notes de maintenance

- Tous les CSS utilisent des **variables CSS** (`:root`). Pour changer le thème, modifier `design-system.css`.
- Le logo est en **SVG inline** dans chaque page pour éviter les requêtes HTTP inutiles.
- Les polices sont chargées depuis Google Fonts. Pour une utilisation offline, télécharger et servir localement.

---

*SecureDeal Frontend v2 — Thème Dark & Gold © 2025*
