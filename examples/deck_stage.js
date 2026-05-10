'use strict';

class DeckStage extends HTMLElement {
  constructor() {
    super();
    this._idx = 0;
    this._onKey = this._onKey.bind(this);
    this._onResize = this._onResize.bind(this);
    this._counterTimeout = null;
  }

  connectedCallback() {
    const w = parseInt(this.getAttribute('data-canvas-width') || '1920', 10);
    const h = parseInt(this.getAttribute('data-canvas-height') || '1080', 10);
    this._canvas = { w, h };

    this.style.position = 'fixed';
    this.style.inset = '0';
    this.style.background = 'black';
    this.style.overflow = 'hidden';
    this.style.display = 'block';

    this._canvasEl = document.createElement('div');
    this._canvasEl.style.cssText = `position: absolute; top: 50%; left: 50%; width: ${w}px; height: ${h}px; transform: translate(-50%, -50%);`;
    while (this.firstChild) this._canvasEl.appendChild(this.firstChild);
    this.appendChild(this._canvasEl);

    this._slides = Array.from(this._canvasEl.querySelectorAll(':scope > section'));
    this._slides.forEach((s, i) => {
      s.style.cssText = `position: absolute; inset: 0; width: 100%; height: 100%; ${i === 0 ? '' : 'display: none;'}`;
      if (!s.hasAttribute('data-screen-label')) {
        s.setAttribute('data-screen-label', String(i + 1).padStart(2, '0'));
      }
    });

    this._counter = document.createElement('div');
    this._counter.style.cssText = 'position: fixed; bottom: 24px; right: 24px; padding: 8px 14px; background: rgba(0,0,0,0.6); color: white; border-radius: 8px; font-family: ui-sans-serif, system-ui, -apple-system, sans-serif; font-size: 14px; pointer-events: none; opacity: 1; transition: opacity 0.4s;';
    this.appendChild(this._counter);
    this._updateCounter();

    document.addEventListener('keydown', this._onKey);
    window.addEventListener('resize', this._onResize);

    if (!document.getElementById('deck-stage-print-style')) {
      const style = document.createElement('style');
      style.id = 'deck-stage-print-style';
      style.textContent = `@page { size: ${w}px ${h}px; margin: 0; } @media print { html, body { background: white !important; } deck-stage { position: static !important; } deck-stage > div { transform: none !important; position: static !important; } deck-stage > div > section { display: block !important; page-break-after: always; position: static !important; width: ${w}px !important; height: ${h}px !important; } }`;
      document.head.appendChild(style);
    }

    const stored = parseInt(localStorage.getItem(this._storageKey()) || '0', 10);
    if (!isNaN(stored) && stored >= 0 && stored < this._slides.length) {
      this._idx = stored;
    }

    this._show(this._idx);
    this._onResize();
  }

  disconnectedCallback() {
    document.removeEventListener('keydown', this._onKey);
    window.removeEventListener('resize', this._onResize);
    if (this._counterTimeout) clearTimeout(this._counterTimeout);
  }

  _storageKey() {
    return 'deck-stage:' + location.pathname + ':slide';
  }

  _show(i) {
    if (i < 0 || i >= this._slides.length) return;
    this._slides.forEach((s, j) => { s.style.display = j === i ? '' : 'none'; });
    this._idx = i;
    localStorage.setItem(this._storageKey(), String(i));
    this._updateCounter();
    try {
      window.parent.postMessage({ slideIndexChanged: i }, '*');
    } catch (_) { /* parent may be cross-origin; ignore */ }
  }

  _updateCounter() {
    this._counter.textContent = (this._idx + 1) + ' / ' + this._slides.length;
    this._counter.style.opacity = '1';
    if (this._counterTimeout) clearTimeout(this._counterTimeout);
    this._counterTimeout = setTimeout(() => { this._counter.style.opacity = '0'; }, 2000);
  }

  _onKey(e) {
    if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') {
      e.preventDefault();
      this._show(Math.min(this._idx + 1, this._slides.length - 1));
    } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
      e.preventDefault();
      this._show(Math.max(this._idx - 1, 0));
    } else if (e.key === 'Home') {
      e.preventDefault();
      this._show(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      this._show(this._slides.length - 1);
    }
  }

  _onResize() {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const sx = vw / this._canvas.w;
    const sy = vh / this._canvas.h;
    const s = Math.min(sx, sy);
    this._canvasEl.style.transform = `translate(-50%, -50%) scale(${s})`;
  }
}

customElements.define('deck-stage', DeckStage);
