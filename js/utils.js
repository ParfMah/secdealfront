/**
 * SECUREDEAL — Utilitaires globaux v2
 * Scroll-to-top, FAQ accordion, formatters
 */
'use strict';

(function() {

  // ─── SCROLL TO TOP ─────────────────────────────────────────
  const scrollBtn = document.createElement('button');
  scrollBtn.className = 'scroll-top';
  scrollBtn.innerHTML = '↑';
  scrollBtn.setAttribute('aria-label', 'Retour en haut');
  scrollBtn.title = 'Retour en haut';
  document.body.appendChild(scrollBtn);

  window.addEventListener('scroll', () => {
    scrollBtn.classList.toggle('visible', window.scrollY > 400);
  }, { passive: true });

  scrollBtn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  // ─── FAQ ACCORDION ──────────────────────────────────────────
  document.querySelectorAll('.faq-item').forEach(item => {
    const question = item.querySelector('.faq-question');
    if (!question) return;
    question.addEventListener('click', () => {
      const isOpen = item.classList.contains('open');
      document.querySelectorAll('.faq-item.open').forEach(el => el.classList.remove('open'));
      if (!isOpen) item.classList.add('open');
    });
  });

  // ─── FORMATTERS ─────────────────────────────────────────────
  window.SD = window.SD || {};

  SD.fmt = {
    currency: (v, currency = 'EUR') =>
      new Intl.NumberFormat('fr-FR', { style: 'currency', currency }).format(v),
    number: (v) =>
      new Intl.NumberFormat('fr-FR').format(v),
    date: (d) =>
      new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(d)),
    dateTime: (d) =>
      new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(d)),
    truncate: (str, n = 40) =>
      str.length > n ? str.slice(0, n) + '…' : str,
  };

  // ─── AUTH HELPERS ───────────────────────────────────────────
  SD.Auth = {
    getUser: () => {
      try { return JSON.parse(localStorage.getItem('sd_user')); } catch { return null; }
    },
    setUser: (u) => localStorage.setItem('sd_user', JSON.stringify(u)),
    logout: () => {
      localStorage.removeItem('sd_user');
      window.location.href = '/index.html';
    },
    isLoggedIn: () => !!SD.Auth.getUser(),
  };

  // ─── TOAST NOTIFICATIONS ────────────────────────────────────
  SD.toast = function(message, type = 'info', duration = 4000) {
    let container = document.querySelector('.toast-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'toast-container';
      document.body.appendChild(container);
    }
    const iconMap = { success: '✅', error: '❌', info: '💡', warning: '⚠️' };
    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    toast.innerHTML = `<span>${iconMap[type] || '💡'}</span><div>${message}</div>`;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(20px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  };

  // ─── COPIE PRESSE-PAPIERS ────────────────────────────────────
  SD.copy = async function(text, label = 'Copié !') {
    try {
      await navigator.clipboard.writeText(text);
      SD.toast(label, 'success', 2000);
    } catch {
      // fallback
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
      SD.toast(label, 'success', 2000);
    }
  };

  // ─── CONFIRMATION DIALOG ────────────────────────────────────
  SD.confirm = function(message, onConfirm) {
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    backdrop.innerHTML = `
      <div class="modal" style="max-width:400px;text-align:center">
        <div class="modal-title" style="border:none;text-align:center">Confirmation</div>
        <p style="color:rgba(255,255,255,0.55);margin-bottom:28px;font-size:15px;line-height:1.6">${message}</p>
        <div style="display:flex;gap:12px;justify-content:center">
          <button id="sd-confirm-cancel"  class="btn btn--outline-white">Annuler</button>
          <button id="sd-confirm-ok"      class="btn btn--gold">Confirmer</button>
        </div>
      </div>
    `;
    document.body.appendChild(backdrop);
    backdrop.querySelector('#sd-confirm-ok').addEventListener('click', () => {
      backdrop.remove(); onConfirm();
    });
    backdrop.querySelector('#sd-confirm-cancel').addEventListener('click', () => backdrop.remove());
    backdrop.addEventListener('click', (e) => { if (e.target === backdrop) backdrop.remove(); });
  };

})();

// ─── COMPATIBILITÉ LEGACY ─────────────────────────────────────
// Alias SD.Fmt → SD.fmt (certaines pages utilisent la majuscule)
SD.Fmt = {
  number:   (v) => new Intl.NumberFormat('fr-FR').format(v),
  currency: (v, cur) => new Intl.NumberFormat('fr-FR', { style:'currency', currency: cur || 'EUR' }).format(v),
  truncate: (s, n) => s && s.length > (n||40) ? s.slice(0, n||40) + '…' : (s||''),
};

// SD.Sanitize — échappe le HTML pour l'injection dans du innerHTML
SD.Sanitize = {
  html: (str) => {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  },
};

// SD.Calculator — calcul escrow
SD.Calculator = {
  COMMISSION_RATE: 0.012,
  compute: (price, depositPct) => {
    const p   = parseFloat(price) || 0;
    const pct = parseFloat(depositPct) || 0.5;
    const commission = p * SD.Calculator.COMMISSION_RATE;
    return {
      total:      p,
      deposit:    p * pct,
      balance:    p * (1 - pct),
      commission: commission,
      net:        p - commission,
    };
  },
};

// SD.Auth.getUser safe wrapper (in case localStorage blocked)
if (!SD.Auth._safe) {
  const _orig = SD.Auth.getUser;
  SD.Auth.getUser = () => { try { return _orig(); } catch(e) { return null; } };
  SD.Auth._safe = true;
}
