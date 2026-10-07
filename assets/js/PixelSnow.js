// PixelSnow - Vanilla JS Background (inspired by ReactBits pixel-snow)
// Gère l'alternance avec le background FloatingLines via le toggle dark/light

class PixelSnow {
  constructor(options = {}) {
    this.options = {
      snowflakeCount: options.snowflakeCount || 150,
      speed: options.speed || 1.0,
      size: options.size || 4,
      color: options.color || '#ffffff',
      backgroundColor: options.backgroundColor || '#0a0e27',
    };
    this.canvas = null;
    this.ctx = null;
    this.container = null;
    this.flakes = [];
    this.animationId = null;
    this.running = false;
  }

  _createFlake(width, height) {
    return {
      x: Math.random() * width,
      y: Math.random() * height - height,
      size: Math.floor(Math.random() * 3 + 1) * this.options.size,
      speed: (Math.random() * 0.5 + 0.3) * this.options.speed,
      drift: (Math.random() - 0.5) * 0.5,
      opacity: Math.random() * 0.6 + 0.4,
    };
  }

  init(containerId = 'pixel-snow-bg') {
    // Crée ou récupère le conteneur
    this.container = document.getElementById(containerId);
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.id = containerId;
      this.container.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: -10;
        background: ${this.options.backgroundColor};
        overflow: hidden;
        pointer-events: none;
        display: none;
        opacity: 0;
        transition: opacity 0.6s ease;
      `;
      document.body.insertBefore(this.container, document.body.firstChild);
    }

    // Crée le canvas
    this.canvas = document.createElement('canvas');
    this.canvas.style.cssText = `
      width: 100%;
      height: 100%;
      display: block;
      image-rendering: pixelated;
    `;
    this.container.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d');

    this._resize();
    window.addEventListener('resize', () => this._resize());
  }

  _resize() {
    if (!this.canvas) return;
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    // Réinitialise les flocons
    this.flakes = [];
    for (let i = 0; i < this.options.snowflakeCount; i++) {
      this.flakes.push(this._createFlake(this.canvas.width, this.canvas.height));
    }
  }

  _draw() {
    const { width, height } = this.canvas;
    const ctx = this.ctx;
    ctx.clearRect(0, 0, width, height);

    for (const flake of this.flakes) {
      ctx.save();
      ctx.globalAlpha = flake.opacity;
      ctx.fillStyle = this.options.color;
      // Carré pixelisé
      ctx.fillRect(
        Math.round(flake.x / flake.size) * flake.size,
        Math.round(flake.y / flake.size) * flake.size,
        flake.size,
        flake.size
      );
      ctx.restore();

      // Mise à jour position
      flake.y += flake.speed * 2;
      flake.x += flake.drift;

      // Réinitialise le flocon s'il sort de l'écran
      if (flake.y > height + flake.size) {
        const newFlake = this._createFlake(width, height);
        newFlake.y = -flake.size;
        Object.assign(flake, newFlake);
      }
      if (flake.x > width + flake.size) flake.x = -flake.size;
      if (flake.x < -flake.size) flake.x = width + flake.size;
    }
  }

  _loop() {
    if (!this.running) return;
    this._draw();
    this.animationId = requestAnimationFrame(() => this._loop());
  }

  show() {
    if (!this.container) return;
    this.container.style.display = 'block';
    requestAnimationFrame(() => {
      this.container.style.opacity = '1';
    });
    this.running = true;
    this._loop();
  }

  hide() {
    if (!this.container) return;
    this.container.style.opacity = '0';
    setTimeout(() => {
      this.container.style.display = 'none';
    }, 600);
    this.running = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }
}

// ============================================================
// THEME TOGGLE — alterne FloatingLines <-> PixelSnow
// ============================================================
(function initThemeToggle() {
  document.addEventListener('DOMContentLoaded', function () {
    const checkbox = document.getElementById('checkbox');
    if (!checkbox) return;

    // Initialise PixelSnow
    const pixelSnow = new PixelSnow({
      snowflakeCount: 180,
      speed: 1.2,
      size: 3,
      color: '#aad4f5',
      backgroundColor: '#040d1a',
    });
    pixelSnow.init('pixel-snow-bg');

    // Récupère le container FloatingLines (background par défaut)
    function getFloatingContainer() {
      return document.getElementById('floating-lines-bg');
    }

    // Restaure l'état sauvegardé
    const savedTheme = localStorage.getItem('portfolio-theme');
    if (savedTheme === 'snow') {
      checkbox.checked = true;
      const fl = getFloatingContainer();
      if (fl) {
        fl.style.transition = 'opacity 0.6s ease';
        fl.style.opacity = '0';
        setTimeout(() => { fl.style.display = 'none'; }, 600);
      }
      pixelSnow.show();
    }

    checkbox.addEventListener('change', function () {
      const fl = getFloatingContainer();
      if (this.checked) {
        // Soleil → PixelSnow
        localStorage.setItem('portfolio-theme', 'snow');
        if (fl) {
          fl.style.transition = 'opacity 0.6s ease';
          fl.style.opacity = '0';
          setTimeout(() => { fl.style.display = 'none'; }, 600);
        }
        pixelSnow.show();
      } else {
        // Lune → FloatingLines
        localStorage.setItem('portfolio-theme', 'default');
        pixelSnow.hide();
        if (fl) {
          fl.style.display = 'block';
          requestAnimationFrame(() => { fl.style.opacity = '1'; });
        }
      }
    });
  });
})();
