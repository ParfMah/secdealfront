/**
 * SECUREDEAL — Page Loader v2
 * Spinner doré — affiché 1.5s minimum avant dévoilement du site
 */
'use strict';

const PageLoader = {
  loaderEl: null, progressEl: null, initialized: false,

  inject() {
    if (document.getElementById('sd-page-loader')) return;

    // Barre fine en haut
    const bar = document.createElement('div');
    bar.id = 'sd-progress-bar';
    document.body.prepend(bar);
    this.progressEl = bar;

    // Overlay loader avec spinner doré
    const loader = document.createElement('div');
    loader.id = 'sd-page-loader';
    loader.innerHTML = `
      <div class="loader-logo">
        <svg width="140" height="36" viewBox="0 0 140 36" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="SecureDeal">
          <g transform="translate(0,2)">
            <!-- Bouclier -->
            <path d="M16 2L28 6.5V15C28 22 22.5 27.5 16 30C9.5 27.5 4 22 4 15V6.5Z" fill="none" stroke="#C9A227" stroke-width="1.5"/>
            <path d="M16 6L24 9.3V15C24 19.8 20.5 24 16 26C11.5 24 8 19.8 8 15V9.3Z" fill="rgba(201,162,39,0.08)" stroke="#C9A227" stroke-width="0.8"/>
            <polyline points="11.5 15.5 14.5 18.5 20.5 12" stroke="#C9A227" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
          </g>
          <!-- SECURE -->
          <text x="36" y="23" font-family="Sora, sans-serif" font-size="15" font-weight="800" fill="white" letter-spacing="-0.3">SECURE</text>
          <!-- DEAL -->
          <text x="93" y="23" font-family="Sora, sans-serif" font-size="15" font-weight="300" fill="#C9A227" letter-spacing="2">DEAL</text>
        </svg>
      </div>
      <div class="loader-spinner"></div>
      <div class="loader-bar-wrap"><div class="loader-bar"></div></div>
      <div class="loader-text">Chargement sécurisé</div>
    `;
    document.body.prepend(loader);
    this.loaderEl = loader;
  },

  /** Masque le loader après 1.5s minimum */
  hide() {
    if (!this.loaderEl) return;
    const MIN_DISPLAY = 1500;
    const elapsed = Date.now() - (this._startTime || Date.now());
    const delay = Math.max(0, MIN_DISPLAY - elapsed);
    setTimeout(() => {
      this.loaderEl.classList.add('hide');
      // Suppression du DOM après la transition
      setTimeout(() => {
        if (this.loaderEl && this.loaderEl.parentNode) {
          this.loaderEl.parentNode.removeChild(this.loaderEl);
        }
      }, 600);
    }, delay);
  },

  startProgress() {
    if (!this.progressEl) return;
    this.progressEl.style.width = '0%';
    this.progressEl.classList.remove('complete');
    let w = 0;
    const interval = setInterval(() => {
      w += Math.random() * 15;
      if (w > 85) { clearInterval(interval); w = 85; }
      this.progressEl.style.width = w + '%';
    }, 100);
    return interval;
  },

  completeProgress(interval) {
    if (interval) clearInterval(interval);
    if (!this.progressEl) return;
    this.progressEl.style.width = '100%';
    setTimeout(() => {
      this.progressEl.classList.add('complete');
      setTimeout(() => {
        this.progressEl.classList.remove('complete');
        this.progressEl.style.width = '0%';
      }, 500);
    }, 200);
  },

  interceptLinks() {
    document.addEventListener('click', (e) => {
      const link = e.target.closest('a[href]');
      if (!link) return;
      const href = link.getAttribute('href');
      if (!href) return;
      if (href.startsWith('#') || href.startsWith('http') || href.startsWith('mailto') ||
          href.startsWith('tel') || href.startsWith('javascript') ||
          link.target === '_blank' || link.hasAttribute('data-no-transition') ||
          link.hasAttribute('download')) return;
      e.preventDefault();
      const interval = this.startProgress();
      document.body.classList.add('page-exit');
      setTimeout(() => { this.completeProgress(interval); window.location.href = href; }, 250);
    });
  },

  init() {
    if (this.initialized) return;
    this.initialized = true;
    this._startTime = Date.now();

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.inject());
    } else {
      this.inject();
    }

    window.addEventListener('load', () => this.hide());

    document.addEventListener('DOMContentLoaded', () => { this.interceptLinks(); });

    window.addEventListener('popstate', () => {
      const interval = this.startProgress();
      setTimeout(() => this.completeProgress(interval), 500);
    });

    if (document.readyState === 'complete') {
      setTimeout(() => this.hide(), 300);
    }
  },
};

PageLoader.init();
window.PageLoader = PageLoader;
