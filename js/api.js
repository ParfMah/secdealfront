/**
 * SECUREDEAL — Client API Frontend
 * Remplace toutes les données simulées par de vrais appels API
 * À inclure dans chaque page : <script src="/js/api.js"></script>
 */

'use strict';

(function () {

  // ─── CONFIGURATION ─────────────────────────────────────────
  // Détecter automatiquement l'environnement
  const isLocalhost = window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1';

  const API_BASE = isLocalhost
    ? 'http://localhost:3001/api/v1'
    : (window.SD_API_BASE || 'https://securedeal-api.onrender.com/api/v1');

  // ─── GESTION DES TOKENS ────────────────────────────────────
  const TokenManager = {
    getAccessToken() { return localStorage.getItem('sd_access_token'); },
    setAccessToken(t) { localStorage.setItem('sd_access_token', t); },
    removeAccessToken() { localStorage.removeItem('sd_access_token'); },

    getUser() {
      try { return JSON.parse(localStorage.getItem('sd_user')); }
      catch { return null; }
    },
    setUser(u) { localStorage.setItem('sd_user', JSON.stringify(u)); },
    removeUser() { localStorage.removeItem('sd_user'); },

    isLoggedIn() { return !!this.getAccessToken() && !!this.getUser(); },

    clear() {
      this.removeAccessToken();
      this.removeUser();
    },
  };

  // ─── REQUÊTE HTTP CENTRALE ──────────────────────────────────
  let isRefreshing = false;
  let refreshQueue = [];

  async function request(method, path, data = null, options = {}) {
    const url = `${API_BASE}${path}`;
    const headers = { 'Content-Type': 'application/json' };

    const token = TokenManager.getAccessToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const config = {
      method: method.toUpperCase(),
      headers,
      credentials: 'include', // Pour le cookie refresh httpOnly
      ...(data && { body: JSON.stringify(data) }),
      ...options,
    };

    let response = await fetch(url, config);

    // Token expiré → rafraîchir et réessayer
    if (response.status === 401 && !options._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          refreshQueue.push({ resolve, reject });
        }).then(() => request(method, path, data, { ...options, _retry: true }));
      }

      isRefreshing = true;
      try {
        const refreshed = await refreshToken();
        if (refreshed) {
          refreshQueue.forEach(({ resolve }) => resolve());
          refreshQueue = [];
          return request(method, path, data, { ...options, _retry: true });
        }
      } catch {
        refreshQueue.forEach(({ reject }) => reject());
        refreshQueue = [];
        TokenManager.clear();
        window.location.href = '/pages/auth/login.html?session=expired';
        return;
      } finally {
        isRefreshing = false;
      }
    }

    const json = await response.json().catch(() => ({}));

    if (!response.ok) {
      const error = new Error(json.message || `Erreur ${response.status}`);
      error.code = json.code;
      error.statusCode = response.status;
      error.data = json;
      throw error;
    }

    return json;
  }

  async function refreshToken() {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Refresh failed');
    const json = await res.json();
    if (json.accessToken) {
      TokenManager.setAccessToken(json.accessToken);
      if (json.user) TokenManager.setUser(json.user);
      return true;
    }
    return false;
  }

  // ─── API AUTH ───────────────────────────────────────────────
  const Auth = {
    async register(data) {
      const json = await request('POST', '/auth/register', data);
      if (json.accessToken) {
        TokenManager.setAccessToken(json.accessToken);
        TokenManager.setUser(json.data?.user || json.user);
      }
      return json;
    },

    async login(email, password) {
      const json = await request('POST', '/auth/login', { email, password });
      if (json.accessToken) {
        TokenManager.setAccessToken(json.accessToken);
        TokenManager.setUser(json.user);
      }
      return json;
    },

    async logout() {
      try { await request('POST', '/auth/logout'); } catch { }
      TokenManager.clear();
      window.location.href = '/index.html';
    },

    async getMe() {
      return request('GET', '/auth/me');
    },

    async updateProfile(data) {
      const json = await request('PATCH', '/auth/me', data);
      if (json.data) TokenManager.setUser({ ...TokenManager.getUser(), ...json.data });
      return json;
    },

    async forgotPassword(email) {
      return request('POST', '/auth/forgot-password', { email });
    },

    async resetPassword(token, password) {
      return request('POST', '/auth/reset-password', { token, password });
    },

    getUser: () => TokenManager.getUser(),
    isLoggedIn: () => TokenManager.isLoggedIn(),

    async verifyOtp(email, code) {
      return request('POST', '/auth/verify-email', { email, code });
    },
    async resendOtp(email) {
      return request('POST', '/auth/resend-verification', { email });
    },
    async sendPhoneOtp(phone) {
      return request('POST', '/auth/send-phone-otp', { phone });
    },
    async verifyPhone(code) {
      return request('POST', '/auth/verify-phone', { code });
    },
  };

  // ─── API PRODUITS ───────────────────────────────────────────
  const Products = {
    async list(params = {}) {
      const qs = new URLSearchParams(params).toString();
      return request('GET', `/products${qs ? '?' + qs : ''}`);
    },

    async get(id) {
      return request('GET', `/products/${id}`);
    },

    async create(data) {
      return request('POST', '/products', data);
    },

    async update(id, data) {
      return request('PATCH', `/products/${id}`, data);
    },

    async delete(id) {
      return request('DELETE', `/products/${id}`);
    },

    async mine(params = {}) {
      const qs = new URLSearchParams(params).toString();
      return request('GET', `/products/mine${qs ? '?' + qs : ''}`);
    },

    async uploadPhotos(productId, files) {
      const token = TokenManager.getAccessToken();
      const formData = new FormData();
      files.forEach(f => formData.append('photos', f));
      const res = await fetch(`${API_BASE}/products/${productId}/photos`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        credentials: 'include',
        body: formData,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message);
      return json;
    },
  };

  // ─── API TRANSACTIONS ───────────────────────────────────────
  const Transactions = {
    async create(data) {
      return request('POST', '/transactions', data);
    },

    async get(id) {
      return request('GET', `/transactions/${id}`);
    },

    async list(params = {}) {
      const qs = new URLSearchParams(params).toString();
      return request('GET', `/transactions${qs ? '?' + qs : ''}`);
    },

    async updateStatus(id, status, extra = {}) {
      return request('PATCH', `/transactions/${id}/status`, { status, ...extra });
    },

    async openDispute(id, reason) {
      return request('POST', `/transactions/${id}/dispute`, { reason });
    },
  };

  // ─── API MESSAGERIE ─────────────────────────────────────────
  const Messages = {
    async getConversations() {
      return request('GET', '/messages');
    },

    async getMessages(convId, params = {}) {
      const qs = new URLSearchParams(params).toString();
      return request('GET', `/messages/${convId}${qs ? '?' + qs : ''}`);
    },

    async send(convId, content) {
      return request('POST', `/messages/${convId}`, { content });
    },

    async poll(convId, since) {
      return request('GET', `/messages/${convId}/poll?since=${since}`);
    },
  };

  // ─── API DOCUMENTS ──────────────────────────────────────────
  const Documents = {
    async upload(type, file, transactionId = null) {
      const token = TokenManager.getAccessToken();
      const formData = new FormData();
      formData.append('document', file);
      formData.append('type', type);
      if (transactionId) formData.append('transactionId', transactionId);

      const res = await fetch(`${API_BASE}/documents`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        credentials: 'include',
        body: formData,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message);
      return json;
    },

    async list() {
      return request('GET', '/documents');
    },

    async delete(id) {
      return request('DELETE', `/documents/${id}`);
    },
  };

  // ─── HELPERS UI ─────────────────────────────────────────────
  const UI = {
    /** Met à jour le header selon l'état de connexion */
    updateAuthHeader() {
      const user = Auth.getUser();
      const el = document.getElementById('header-auth');
      if (!el) return;

      if (user) {
        const dashUrl = user.role === 'VENDOR'
          ? '/pages/dashboard/vendor.html'
          : '/pages/dashboard/buyer.html';
        el.innerHTML = `
          <a href="${dashUrl}" class="btn btn--outline-white btn--sm">Mon espace</a>
          <button onclick="window.SecureDeal.Auth.logout()" class="btn btn--ghost btn--sm">Déconnexion</button>`;
      } else {
        el.innerHTML = `
          <a href="/pages/auth/login.html"    class="btn btn--outline-white btn--sm">Connexion</a>
          <a href="/pages/auth/register.html" class="btn btn--gold btn--sm btn--shimmer">Créer un compte</a>`;
      }
    },

    /** Redirige vers login si non connecté */
    requireAuth(redirectBack = true) {
      if (!Auth.isLoggedIn()) {
        const back = redirectBack ? `?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}` : '';
        window.location.href = `/pages/auth/login.html${back}`;
        return false;
      }
      return true;
    },

    /** Formatte un montant en euros */
    formatCurrency(amount, currency = 'EUR') {
      return new Intl.NumberFormat('fr-FR', { style: 'currency', currency }).format(amount);
    },

    /** Formatte une date */
    formatDate(date) {
      return new Intl.DateTimeFormat('fr-FR', {
        day: 'numeric', month: 'long', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      }).format(new Date(date));
    },

    /** Affiche un toast de notification */
    toast(message, type = 'info') {
      if (window.SD?.toast) return window.SD.toast(message, type);
      console.log(`[${type}] ${message}`);
    },
  };

  // ─── INITIALISATION AUTO ────────────────────────────────────
  document.addEventListener('DOMContentLoaded', () => {
    UI.updateAuthHeader();

    // Gérer la session expirée (paramètre URL)
    const params = new URLSearchParams(window.location.search);
    if (params.get('session') === 'expired') {
      UI.toast('Votre session a expiré. Reconnectez-vous.', 'warning');
    }
  });

  // ─── EXPOSITION GLOBALE ─────────────────────────────────────
  window.SecureDeal = {
    Auth,
    Products,
    Transactions,
    Messages,
    Documents,
    UI,
    API_BASE,
  };

  // Compatibilité avec l'ancien SD.Auth
  window.SD = window.SD || {};
  window.SD.Auth = Auth;

})();
