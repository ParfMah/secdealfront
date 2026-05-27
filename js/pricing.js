/**
 * SECUREDEAL — Moteur de tarification (Frontend)
 * Logique identique au backend src/utils/pricing.js
 * Utilisable dans n'importe quelle page sans dépendance externe
 *
 * Usage :
 *   const result = SecureDealPricing.compute({ amount: 15000, level: 'standard', ... });
 */

(function (global) {
  'use strict';

  // ─── GRILLE TARIFAIRE ────────────────────────────────────────
  var TIERS = [
    { min:          0, max:      5000, stdRate: 0.026,  stdMin:     40, cncRate: 0.052,  cncMin:     80 },
    { min:       5001, max:     50000, stdRate: 0.021,  stdMin:    130, cncRate: 0.042,  cncMin:    260 },
    { min:      50001, max:    200000, stdRate: 0.016,  stdMin:    900, cncRate: 0.032,  cncMin:   1800 },
    { min:     200001, max:    500000, stdRate: 0.011,  stdMin:   3200, cncRate: 0.022,  cncMin:   6400 },
    { min:     500001, max:   1000000, stdRate: 0.0085, stdMin:   7000, cncRate: 0.017,  cncMin:  14000 },
    { min:    1000001, max:   3000000, stdRate: 0.006,  stdMin:   9000, cncRate: 0.012,  cncMin:  18000 },
    { min:    3000001, max:   5000000, stdRate: 0.0045, stdMin:  18000, cncRate: 0.009,  cncMin:  36000 },
    { min:    5000001, max:  10000000, stdRate: 0.0038, stdMin:  28000, cncRate: 0.0076, cncMin:  56000 },
    { min:   10000001, max:      null, stdRate: 0.003,  stdMin:      0, cncRate: 0.006,  cncMin:      0, quote: true },
  ];

  var CARD_PAYPAL_RATE  = 0.0305;
  var INTERNATIONAL_FEE = 23;

  // ─── HELPERS ────────────────────────────────────────────────
  function round2(n)    { return Math.round(n * 100) / 100; }
  function round3(n)    { return Math.round(n * 1000) / 1000; }

  function fmt(n, decimals) {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency', currency: 'EUR',
      minimumFractionDigits: decimals !== undefined ? decimals : 2,
      maximumFractionDigits: decimals !== undefined ? decimals : 2,
    }).format(n);
  }

  function fmtShort(n) {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency', currency: 'EUR', maximumFractionDigits: 0
    }).format(n);
  }

  function findTier(amount) {
    for (var i = 0; i < TIERS.length; i++) {
      var t = TIERS[i];
      if (amount >= t.min && (t.max === null || amount <= t.max)) return t;
    }
    return null;
  }

  function tierLabel(t) {
    if (!t) return '—';
    if (t.max === null) return '> 10 000 000 €';
    return fmtShort(t.min) + ' – ' + fmtShort(t.max);
  }

  // ─── CALCUL PRINCIPAL ────────────────────────────────────────
  /**
   * @param {Object} input
   * @param {number}  input.amount          Montant de la transaction (€)
   * @param {string}  input.level           'standard' | 'concierge'
   * @param {string}  input.paymentMethod   'transfer' | 'card_paypal'
   * @param {boolean} input.isInternational  Transaction internationale ?
   * @param {number}  [input.depositPct]    Pourcentage acompte (30-70)
   * @returns {Object} Résultat détaillé
   */
  function compute(input) {
    var amount         = parseFloat(input.amount) || 0;
    var level          = input.level === 'concierge' ? 'concierge' : 'standard';
    var paymentMethod  = input.paymentMethod === 'card_paypal' ? 'card_paypal' : 'transfer';
    var isInternational= !!input.isInternational;
    var depositPct     = Math.min(70, Math.max(30, parseInt(input.depositPct) || 50));

    if (amount <= 0) return null;

    var tier = findTier(amount);
    if (!tier) return null;

    var isStandard = level === 'standard';
    var rate       = isStandard ? tier.stdRate : tier.cncRate;
    var minFee     = isStandard ? tier.stdMin  : tier.cncMin;

    // ── Sur devis > 10M ──────────────────────────────────────
    if (tier.quote) {
      return {
        isQuote:          true,
        amount:           amount,
        level:            level,
        appliedRate:      round3(rate * 100),
        tierLabel:        tierLabel(tier),
        baseFee:          null,
        cardFee:          null,
        internationalFee: isInternational ? INTERNATIONAL_FEE : 0,
        totalFee:         null,
        totalAmount:      null,
        netToVendor:      null,
        deposit:          null,
        balance:          null,
        depositPct:       depositPct,
        minimumApplied:   false,
      };
    }

    // ── Frais de base ────────────────────────────────────────
    var rawFee       = amount * rate;
    var baseFee      = round2(Math.max(rawFee, minFee));
    var minApplied   = rawFee < minFee;

    // ── Frais carte/PayPal : 3,05% de (montant + frais de base) ──
    var cardFee = paymentMethod === 'card_paypal'
      ? round2((amount + baseFee) * CARD_PAYPAL_RATE)
      : 0;

    // ── Frais international ───────────────────────────────────
    var intlFee = isInternational ? INTERNATIONAL_FEE : 0;

    // ── Totaux ────────────────────────────────────────────────
    var totalFee    = round2(baseFee + cardFee + intlFee);
    var totalAmount = round2(amount + totalFee);
    var netToVendor = round2(amount - baseFee);

    // ── Acompte ───────────────────────────────────────────────
    var deposit = round2(amount * depositPct / 100);
    var balance = round2(amount - deposit);

    return {
      isQuote:          false,
      amount:           amount,
      level:            level,
      paymentMethod:    paymentMethod,
      isInternational:  isInternational,
      tier:             tier,
      tierLabel:        tierLabel(tier),
      appliedRate:      round3(rate * 100),
      minimumFee:       minFee,
      minimumApplied:   minApplied,
      baseFee:          baseFee,
      cardFee:          cardFee,
      internationalFee: intlFee,
      totalFee:         totalFee,
      totalAmount:      totalAmount,
      netToVendor:      netToVendor,
      depositPct:       depositPct,
      deposit:          deposit,
      balance:          balance,
      // Formatté pour l'affichage
      fmt: {
        amount:          fmt(amount),
        baseFee:         fmt(baseFee),
        cardFee:         cardFee > 0 ? fmt(cardFee) : null,
        internationalFee:intlFee > 0 ? fmt(intlFee) : null,
        totalFee:        fmt(totalFee),
        totalAmount:     fmt(totalAmount),
        netToVendor:     fmt(netToVendor),
        deposit:         fmt(deposit),
        balance:         fmt(balance),
        rate:            round3(rate * 100) + '%',
      },
    };
  }

  // ─── COMPARATEUR ────────────────────────────────────────────
  function compare(params) {
    return {
      standard:  compute(Object.assign({}, params, { level: 'standard'  })),
      concierge: compute(Object.assign({}, params, { level: 'concierge' })),
    };
  }

  // ─── GRILLE COMPLÈTE ────────────────────────────────────────
  function getGrid() {
    return TIERS.map(function(t) {
      return {
        tranche:       tierLabel(t),
        stdRate:       (t.stdRate * 100).toFixed(2) + '%',
        stdMin:        fmtShort(t.stdMin),
        cncRate:       (t.cncRate * 100).toFixed(2) + '%',
        cncMin:        fmtShort(t.cncMin),
        quote:         !!t.quote,
      };
    });
  }

  // ─── EXPOSITION ─────────────────────────────────────────────
  global.SecureDealPricing = {
    compute:           compute,
    compare:           compare,
    getGrid:           getGrid,
    fmt:               fmt,
    TIERS:             TIERS,
    CARD_PAYPAL_RATE:  CARD_PAYPAL_RATE,
    INTERNATIONAL_FEE: INTERNATIONAL_FEE,
  };

})(window);
