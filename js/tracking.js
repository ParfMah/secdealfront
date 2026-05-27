/**
 * SECUREDEAL — Tracking Abandon
 * Détecte et enregistre les abandons sur les pages clés :
 *   - Page produit (vue sans achat)
 *   - Page achat (formulaire abandonné)
 *   - Transaction créée mais acompte jamais payé
 *
 * Usage : inclure ce script sur toutes les pages.
 * Il s'auto-initialise via SD.Tracking.init()
 */
(function(window) {
  'use strict';

  var API_BASE = window.SD_API_BASE ||
    (window.location.hostname === 'localhost'
      ? 'http://localhost:3001/api/v1'
      : 'https://securedeal-api.onrender.com/api/v1');

  // ─── SESSION ANONYME ──────────────────────────────────────
  // Identifiant de session persistant pour les visiteurs non connectés
  function getSessionId() {
    var key = 'sd_session_id';
    var id  = sessionStorage.getItem(key) || localStorage.getItem(key);
    if (!id) {
      id = 'anon_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9);
      sessionStorage.setItem(key, id);
      localStorage.setItem(key, id);
    }
    return id;
  }

  function getUserId() {
    try {
      var raw = localStorage.getItem('sd_user') || sessionStorage.getItem('sd_user');
      if (raw) { var u = JSON.parse(raw); return u.id || null; }
    } catch(e) {}
    return null;
  }

  function getUserEmail() {
    try {
      var raw = localStorage.getItem('sd_user') || sessionStorage.getItem('sd_user');
      if (raw) { var u = JSON.parse(raw); return u.email || null; }
    } catch(e) {}
    return null;
  }

  // ─── ENVOI ÉVÉNEMENT (best-effort, silencieux) ────────────
  function send(payload) {
    var data = Object.assign({
      sessionId:  getSessionId(),
      userId:     getUserId(),
      userEmail:  getUserEmail(),
      page:       window.location.pathname,
      url:        window.location.href,
      referrer:   document.referrer,
      userAgent:  navigator.userAgent.slice(0, 200),
      timestamp:  new Date().toISOString(),
    }, payload);

    // sendBeacon = garanti même en cas de fermeture de page
    if (navigator.sendBeacon) {
      var blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
      navigator.sendBeacon(API_BASE + '/tracking/abandon', blob);
    } else {
      // Fallback fetch synchrone (keepalive)
      fetch(API_BASE + '/tracking/abandon', {
        method:    'POST',
        headers:   { 'Content-Type': 'application/json' },
        body:      JSON.stringify(data),
        keepalive: true,
      }).catch(function() {});
    }
  }

  // ─── DÉTECTION INTENTION DE SORTIE ───────────────────────
  // Heatmap-style : souris qui monte vers la barre d'adresse (desktop)
  var exitIntentFired = false;
  function setupExitIntent(onExit) {
    document.addEventListener('mouseleave', function(e) {
      if (exitIntentFired) return;
      if (e.clientY <= 5) { // souris qui sort par le haut
        exitIntentFired = true;
        onExit('exit_intent_mouse');
      }
    });
  }

  // ─── TIMER INACTIVITÉ ─────────────────────────────────────
  // Enregistre si l'utilisateur reste X secondes sans interagir
  function setupInactivityTimer(seconds, onInactive) {
    var timer;
    function reset() {
      clearTimeout(timer);
      timer = setTimeout(onInactive, seconds * 1000);
    }
    ['mousemove','keydown','scroll','click','touchstart'].forEach(function(evt) {
      window.addEventListener(evt, reset, { passive: true });
    });
    reset();
  }

  // ─── PAGE PRODUIT ─────────────────────────────────────────
  function trackProductPage() {
    var params    = new URLSearchParams(window.location.search);
    var productId = params.get('id');
    if (!productId) return;

    var timeOnPage = Date.now();
    var reached    = { pricing: false, cta: false };

    // Scroll tracking — a-t-il vu le prix / le CTA ?
    var observer = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting) {
          if (entry.target.id === 'r-tot' || entry.target.classList.contains('product-price')) reached.pricing = true;
          if (entry.target.id === 'btn-buy' || entry.target.classList.contains('btn-buy'))    reached.cta = true;
        }
      });
    });
    ['r-tot','btn-buy'].forEach(function(id) {
      var el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    document.querySelectorAll('.product-price, .btn-buy').forEach(function(el) { observer.observe(el); });

    // Abandon = quitte sans cliquer "Acheter"
    var purchased = false;
    document.addEventListener('click', function(e) {
      var t = e.target;
      if (t.id === 'btn-buy' || t.closest('#btn-buy') || t.closest('.btn-buy')) purchased = true;
    });

    function fireAbandon(trigger) {
      if (purchased) return;
      var spent = Math.round((Date.now() - timeOnPage) / 1000);
      if (spent < 5) return; // moins de 5s = bot probable
      send({
        event:     'product_view_abandon',
        trigger,
        productId,
        timeOnPageSec: spent,
        sawPricing: reached.pricing,
        sawCta:     reached.cta,
      });
    }

    setupExitIntent(fireAbandon);
    window.addEventListener('beforeunload', function() { fireAbandon('page_unload'); });
    // Inactivité > 3 min
    setupInactivityTimer(180, function() { fireAbandon('inactivity_3min'); });
  }

  // ─── PAGE ACHAT ───────────────────────────────────────────
  function trackPurchasePage() {
    var params    = new URLSearchParams(window.location.search);
    var productId = params.get('product') || params.get('id');
    var timeOnPage = Date.now();
    var step = 0; // 0=arrivée, 1=a choisi dépôt, 2=a choisi paiement, 3=a cliqué confirmer

    // Suivre la progression du formulaire
    var depSlider = document.getElementById('dep-slider');
    if (depSlider) depSlider.addEventListener('change', function() { if (step < 1) step = 1; });

    document.querySelectorAll('#btn-pay-transfer, #btn-pay-card').forEach(function(btn) {
      btn.addEventListener('click', function() { if (step < 2) step = 2; });
    });

    var confirmed = false;
    var confirmBtn = document.getElementById('btn-confirm');
    if (confirmBtn) {
      confirmBtn.addEventListener('click', function() {
        step = 3;
        // Attendre que la transaction soit créée pour marquer "confirmé"
        setTimeout(function() { confirmed = true; }, 3000);
      });
    }

    function fireAbandon(trigger) {
      if (confirmed) return;
      var spent = Math.round((Date.now() - timeOnPage) / 1000);
      if (spent < 3) return;
      send({
        event:     'purchase_form_abandon',
        trigger,
        productId,
        formStep:  step,
        formStepLabel: ['arrivée','choix_dépôt','choix_paiement','clic_confirmer'][step] || 'inconnu',
        timeOnPageSec: spent,
      });
    }

    setupExitIntent(fireAbandon);
    window.addEventListener('beforeunload', function() { fireAbandon('page_unload'); });
    setupInactivityTimer(120, function() { fireAbandon('inactivity_2min'); });
  }

  // ─── TRANSACTION CRÉÉE MAIS NON PAYÉE ────────────────────
  // Déclenché depuis transaction.html si status === DEPOSIT_PENDING
  function trackDepositPending(txnId, txnRef, depositAmount) {
    // Enregistrer immédiatement
    send({
      event:         'deposit_pending',
      txnId,
      txnRef,
      depositAmount,
      trigger:       'transaction_created',
    });

    // Relance après 30 min d'inactivité sur la page transaction
    setupInactivityTimer(1800, function() {
      send({
        event:   'deposit_pending_inactivity',
        txnId,
        txnRef,
        trigger: 'inactivity_30min',
      });
    });
  }

  // ─── PAGE ACCUEIL / CATÉGORIES ───────────────────────────
  function trackBrowsePage() {
    var timeOnPage = Date.now();
    var interactions = 0;
    var productsSeen = [];

    document.addEventListener('click', function(e) {
      var card = e.target.closest('.product-card, [data-product-id]');
      if (card) {
        var pid = card.dataset.productId || card.dataset.id;
        if (pid && !productsSeen.includes(pid)) productsSeen.push(pid);
      }
      interactions++;
    });

    function fireAbandon(trigger) {
      var spent = Math.round((Date.now() - timeOnPage) / 1000);
      if (spent < 10 || interactions === 0) return;
      send({
        event:          'browse_abandon',
        trigger,
        timeOnPageSec:  spent,
        interactions,
        productsSeen:   productsSeen.slice(0, 10),
      });
    }

    setupExitIntent(fireAbandon);
    window.addEventListener('beforeunload', function() { fireAbandon('page_unload'); });
  }

  // ─── INIT AUTO SELON LA PAGE ──────────────────────────────
  var SD_Tracking = {
    trackDepositPending: trackDepositPending,

    init: function() {
      var path = window.location.pathname;

      if (path.includes('/product.html'))    return trackProductPage();
      if (path.includes('/purchase.html'))   return trackPurchasePage();
      if (path.includes('/categories.html')) return trackBrowsePage();
      if (path === '/' || path.includes('index.html')) return trackBrowsePage();
    },
  };

  window.SD_Tracking = SD_Tracking;

  // Auto-init au chargement
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() { SD_Tracking.init(); });
  } else {
    SD_Tracking.init();
  }

})(window);
