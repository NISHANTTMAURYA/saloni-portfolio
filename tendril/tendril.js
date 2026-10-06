/**
 * Tendril.js (Liquid Rope & Ink Physics Engine)
 *
 * A high-performance physical cursor merging:
 *  - Ricardo Mendieta's "Ink Cursor"  → SVG gooey filter + text-inverting difference lens + harmonic idle respiration
 *  - Motion Bench's "Rope Cursor Trail" → frame-rate independent kinematics & Catmull-Rom splines
 *
 * Features:
 *  - 1st Triple-Tap: Anchors tail at that spot. As you move, the cord stretches across the screen with realistic catenary droop and Poisson thinning.
 *  - 2nd Triple-Tap: The stretched cord severs from cursor, becomes an independent physical rope, and falls down with Verlet gravity physics and smooth fade-out!
 *  - 1:1 natural pointer tracking with ZERO button trapping.
 *  - Anti-selection guard preventing rapid tap paragraph highlighting while keeping single click intact.
 *  - Zero-GC object pooling + auto-sleep when stationary.
 *
 * MIT License
 */
(function (root, factory) {
  if (typeof define === 'function' && define.amd) define([], factory);
  else if (typeof module === 'object' && module.exports) module.exports = factory();
  else {
    var exp = factory();
    root.Tendril = exp;
    root.TendrilCursor = exp;
    root.LiquidRopeCursor = exp;
    root.HybridInkRopeCursor = exp;
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var NS = 'http://www.w3.org/2000/svg';

  // SSR Guard
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    function SSRStub() {}
    SSRStub.prototype.init = function() {};
    SSRStub.prototype.destroy = function() {};
    SSRStub.prototype.setColor = function() {};
    SSRStub.prototype.setOptions = function() {};
    SSRStub.prototype.setBlendMode = function() {};
    SSRStub.prototype.spill = function() {};
    SSRStub.prototype.toggleAnchor = function() {};
    SSRStub.reportBug = function() {};
    return SSRStub;
  }

  var DEFAULTS = {
    color: '#10b981',           // Emerald green primary
    secondaryColor: '#06b6d4',  // Cyan secondary
    mixBlendMode: 'difference', // Mendieta's iconic text-inverting lens

    // Rope kinematics
    segments: 22,               // Number of physical joints along the cord
    segTau: 36,                 // Per-segment lag in ms (frame-rate independent)
    headRadius: 14,             // Cursor pointer head radius (px)
    tailRadius: 4,              // Tail tip radius (px)
    strokeWidth: 9,             // Tendon thickness (px)

    // SVG Gooey Viscosity Filter
    gooeyBlur: 7,               // Viscosity blur radius
    gooeyContrast: 34,          // Alpha contrast multiplier
    gooeyOffset: -14,           // Alpha cutoff offset

    // Idle Respiration
    idleTimeout: 150,           // Stillness delay before harmonic breathing (ms)
    idleWobble: true,           // Sinusoidal wave drift when stationary
    idleSpeed: 0.045,           // Frequency of idle wave drift
    idleAmplitude: 6,           // Amplitude of idle wave drift (px)

    // Hover (Natural 1:1 mouse tracking — NO sticky button trapping)
    hoverScale: 1.35,           // Head scale multiplier when over interactive elements
    hoverSelector: 'a, button, [role="button"], input, textarea, select, label, .interactive, [data-cursor-hover]',

    // Click: Radial Ink Burst & Gravitational Spill
    splashOnClick: true,        // Radial ink burst on click
    splashCount: 7,             // Number of radial burst beads
    spillOnClick: true,         // Gravitational liquid spill on click
    spillCount: 14,             // Number of falling liquid drops
    gravity: 0.38,              // Gravitational acceleration (px/frame²)
    dripTrail: true,            // Fast falling drops shed trailing droplets

    // 2-Stage Triple-Tap Anchor & Sever Mechanics
    tripleTapAnchor: true,      // 1st Triple-Tap = Anchor tail; 2nd Triple-Tap = Sever & Drop
    tripleTapMaxInterval: 380,  // Maximum milliseconds between taps
    severedRopeGravity: 0.65,   // Gravitational downward pull for detached falling ropes
    severedRopeDrag: 0.985,     // Air resistance for detached ropes

    // System
    hideNativeCursor: true,     // Automatically hides native OS mouse cursor
    preventTextSelectOnTap: true,// Clears browser selection so rapid taps don't highlight text
    maxParticles: 130,          // Pre-allocated particle pool size
    maxSeveredRopes: 5,         // Maximum simultaneous falling severed ropes
    zIndex: 999999,             // Layer priority
    respectReducedMotion: true,
    forceTouch: false
  };

  /* ---------------- Color Utilities ---------------- */

  function toRGB(color) {
    var c = document.createElement('canvas').getContext('2d');
    c.fillStyle = '#000';
    c.fillStyle = color;
    var v = c.fillStyle;
    if (v.charAt(0) === '#') {
      return [parseInt(v.slice(1, 3), 16), parseInt(v.slice(3, 5), 16), parseInt(v.slice(5, 7), 16)];
    }
    var m = v.match(/[\d.]+/g);
    return m ? [+m[0], +m[1], +m[2]] : [16, 185, 129];
  }

  function deriveSecondary(color) {
    var rgb = toRGB(color);
    var r = rgb[0] / 255, g = rgb[1] / 255, b = rgb[2] / 255;
    var max = Math.max(r, g, b), min = Math.min(r, g, b);
    var h = 0, s = 0, l = (max + min) / 2, d = max - min;
    if (d) {
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
      h *= 60;
    }
    h = (h + 35) % 360;
    l = Math.min(0.72, l + 0.10);
    return 'hsl(' + h.toFixed(0) + ',' + (s * 100).toFixed(0) + '%,' + (l * 100).toFixed(0) + '%)';
  }

  function r1(n) {
    return (Math.round(n * 10) / 10).toFixed(1);
  }

  /* ---------------- Tendril Engine Class ---------------- */

  function Tendril(options) {
    if (!(this instanceof Tendril)) return new Tendril(options);

    this.opts = Object.assign({}, DEFAULTS, options || {});
    if (!this.opts.secondaryColor) {
      this.opts.secondaryColor = deriveSecondary(this.opts.color);
    }

    this.id = 'tendril_' + Math.random().toString(36).substr(2, 9);
    this.target = { x: -200, y: -200 };
    this.headScale = 1;
    this.targetHeadScale = 1;
    this.viewW = window.innerWidth;
    this.viewH = window.innerHeight;

    this.idle = false;
    this.idleTimer = null;
    this.lastTime = 0;
    this.running = false;
    this.started = false;
    this.hidden = false;
    this.activeCount = 0;

    // 2-Stage Triple-Tap Anchor State
    this.isAnchored = false;
    this.anchor = { x: 0, y: 0 };
    this.tapHistory = [];
    this.severedRopes = [];

    // Bound handlers
    this._move = this._move.bind(this);
    this._down = this._down.bind(this);
    this._up = this._up.bind(this);
    this._touchDown = this._touchDown.bind(this);
    this._touchMove = this._touchMove.bind(this);
    this._onMouseDown = this._onMouseDown.bind(this);
    this._onSelectStart = this._onSelectStart.bind(this);
    this._over = this._over.bind(this);
    this._out = this._out.bind(this);
    this._vis = this._vis.bind(this);
    this._resize = this._resize.bind(this);
    this._tick = this._tick.bind(this);

    this.init();
  }

  Tendril.prototype.init = function () {
    var coarseOnly = window.matchMedia && window.matchMedia('(pointer: coarse)').matches &&
                     !window.matchMedia('(any-pointer: fine)').matches;

    // Mobile Phone Optimization: Only hide native OS cursor on desktop (fine pointers)
    if (this.opts.hideNativeCursor && !coarseOnly) {
      this._applyHideNativeCursor();
    }

    if (this.opts.respectReducedMotion && window.matchMedia &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this.opts.idleWobble = false;
      this.opts.spillOnClick = false;
      this.opts.splashOnClick = false;
    }

    this._buildDOM();
    this._buildRope();
    this._buildPool();

    window.addEventListener('pointermove', this._move, { passive: true });
    window.addEventListener('pointerdown', this._down, { passive: false });
    window.addEventListener('pointerup', this._up, { passive: true });
    window.addEventListener('touchstart', this._touchDown, { passive: true });
    window.addEventListener('touchmove', this._touchMove, { passive: true });
    window.addEventListener('touchend', this._up, { passive: true });
    window.addEventListener('mousedown', this._onMouseDown, { passive: false });
    window.addEventListener('selectstart', this._onSelectStart, { passive: false });
    window.addEventListener('resize', this._resize, { passive: true });
    document.addEventListener('pointerover', this._over, { passive: true });
    document.addEventListener('pointerout', this._out, { passive: true });
    document.addEventListener('visibilitychange', this._vis);

    this.initialized = true;
    this._wake();
  };

  Tendril.prototype._applyHideNativeCursor = function () {
    if (!this.cursorStyleEl) {
      this.cursorStyleEl = document.createElement('style');
      this.cursorStyleEl.id = this.id + '_hide_cursor';
      this.cursorStyleEl.textContent = 'html, body, a, button, input, textarea, select, label { cursor: none !important; }';
      document.head.appendChild(this.cursorStyleEl);
    }
  };

  Tendril.prototype._removeHideNativeCursor = function () {
    if (this.cursorStyleEl && this.cursorStyleEl.parentNode) {
      this.cursorStyleEl.parentNode.removeChild(this.cursorStyleEl);
      this.cursorStyleEl = null;
    }
  };

  Tendril.prototype._buildDOM = function () {
    var o = this.opts;
    this.filterId = this.id + '_goo';
    this.gradId = this.id + '_grad';

    var wrap = document.createElement('div');
    wrap.id = this.id + '_wrap';
    wrap.setAttribute('aria-hidden', 'true');
    wrap.style.cssText = [
      'position: fixed',
      'inset: 0',
      'width: 100vw',
      'height: 100vh',
      'pointer-events: none',
      'overflow: hidden',
      'contain: strict',
      'z-index: ' + o.zIndex,
      'mix-blend-mode: ' + o.mixBlendMode,
      'transform: translate3d(0, 0, 0)',
      'will-change: transform'
    ].join(';') + ';';

    var svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '100%');
    svg.style.cssText = 'position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; pointer-events: none;';

    var blurVal = o.gooeyBlur;
    var matrixOffset = Math.max(-18, Math.min(-10, -18 + (blurVal * 0.5)));

    svg.innerHTML =
      '<defs>' +
        '<filter id="' + this.filterId + '" x="-25%" y="-25%" width="150%" height="150%" color-interpolation-filters="sRGB">' +
          '<feGaussianBlur in="SourceGraphic" stdDeviation="' + blurVal + '" result="blur"/>' +
          '<feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 ' +
            o.gooeyContrast + ' ' + matrixOffset + '" result="goo"/>' +
          '<feComposite in="SourceGraphic" in2="goo" operator="atop"/>' +
        '</filter>' +
        '<linearGradient id="' + this.gradId + '" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="0">' +
          '<stop offset="0%" stop-color="' + o.color + '"/>' +
          '<stop offset="100%" stop-color="' + o.secondaryColor + '"/>' +
        '</linearGradient>' +
      '</defs>';

    var g = document.createElementNS(NS, 'g');
    g.setAttribute('filter', 'url(#' + this.filterId + ')');

    // Layer 1: Severed falling ropes
    this.severedGroup = document.createElementNS(NS, 'g');
    g.appendChild(this.severedGroup);

    // Layer 2: Main Kinematic Rope Path
    var rope = document.createElementNS(NS, 'path');
    rope.setAttribute('fill', 'none');
    rope.setAttribute('stroke', 'url(#' + this.gradId + ')');
    rope.setAttribute('stroke-width', o.strokeWidth);
    rope.setAttribute('stroke-linecap', 'round');
    rope.setAttribute('stroke-linejoin', 'round');

    // Layer 3: Rope node circles
    this.nodeGroup = document.createElementNS(NS, 'g');

    // Layer 4: Liquid particles
    this.liquidGroup = document.createElementNS(NS, 'g');
    this.liquidGroup.setAttribute('fill', o.color);

    // Layer 5: Clean single Anchor Node Pin
    this.anchorNode = document.createElementNS(NS, 'circle');
    this.anchorNode.setAttribute('r', '0');
    this.anchorNode.setAttribute('fill', o.color);
    this.anchorNode.setAttribute('stroke', '#ffffff');
    this.anchorNode.setAttribute('stroke-width', '2');
    this.anchorNode.style.display = 'none';

    g.appendChild(rope);
    g.appendChild(this.nodeGroup);
    g.appendChild(this.liquidGroup);
    g.appendChild(this.anchorNode);

    svg.appendChild(g);
    wrap.appendChild(svg);
    document.body.appendChild(wrap);

    this.wrap = wrap;
    this.svg = svg;
    this.g = g;
    this.rope = rope;
    this.grad = svg.querySelector('#' + this.gradId);
  };

  Tendril.prototype._buildRope = function () {
    var o = this.opts, n = o.segments;
    this.points = [];
    this.nodes = [];

    while (this.nodeGroup.firstChild) {
      this.nodeGroup.removeChild(this.nodeGroup.firstChild);
    }

    for (var i = 0; i < n; i++) {
      var t = i / (n - 1);
      var r = o.headRadius + (o.tailRadius - o.headRadius) * Math.pow(t, 0.75);

      this.points.push({
        x: -200, y: -200,
        px: -200, py: -200,
        radius: r,
        ax: Math.random() * 6.28,
        ay: Math.random() * 6.28
      });

      var circle = document.createElementNS(NS, 'circle');
      circle.setAttribute('r', r1(r));
      circle.setAttribute('fill', i === 0 ? o.color : o.secondaryColor);
      this.nodeGroup.appendChild(circle);
      this.nodes.push(circle);
    }
  };

  Tendril.prototype._buildPool = function () {
    this.pool = [];
    while (this.liquidGroup.firstChild) {
      this.liquidGroup.removeChild(this.liquidGroup.firstChild);
    }

    for (var i = 0; i < this.opts.maxParticles; i++) {
      var c = document.createElementNS(NS, 'circle');
      c.style.display = 'none';
      this.liquidGroup.appendChild(c);
      this.pool.push({
        el: c,
        active: false,
        kind: 0,
        x: 0, y: 0,
        vx: 0, vy: 0,
        r: 0,
        life: 0,
        decay: 0,
        gravity: null
      });
    }
  };

  /* ---------------- Input & Event Handlers ---------------- */

  Tendril.prototype._move = function (e) {
    this.target.x = e.clientX;
    this.target.y = e.clientY;

    if (!this.started) {
      this.started = true;
      for (var i = 0; i < this.points.length; i++) {
        this.points[i].x = this.target.x;
        this.points[i].y = this.target.y;
        this.points[i].px = this.target.x;
        this.points[i].py = this.target.y;
      }
    }

    this.idle = false;
    clearTimeout(this.idleTimer);
    var self = this;
    this.idleTimer = setTimeout(function () {
      self.idle = true;
      self._wake();
    }, this.opts.idleTimeout);

    this._wake();
  };

  Tendril.prototype._clearSelection = function () {
    try {
      if (window.getSelection) {
        var sel = window.getSelection();
        if (sel && sel.removeAllRanges) sel.removeAllRanges();
      }
    } catch (err) {}
    setTimeout(function () {
      try {
        if (window.getSelection) {
          var s2 = window.getSelection();
          if (s2 && s2.removeAllRanges) s2.removeAllRanges();
        }
      } catch (e) {}
    }, 25);
  };

  Tendril.prototype._isInteractive = function (t) {
    if (!t) return false;
    var tag = t.tagName ? t.tagName.toLowerCase() : '';
    if (tag === 'button' || tag === 'a' || tag === 'input' || tag === 'textarea' || tag === 'select' || tag === 'label') return true;
    if (t.isContentEditable) return true;
    if (t.closest && t.closest('button, a, input, textarea, select, label, [role="button"], .interactive, [data-cursor-hover], .lens-pill, .btn-pill, .tab-btn, .copy-btn, .copy-prompt-btn, .theme-toggle-btn, .color-swatch, .action-btn-primary, .action-btn-secondary, .HoverButton')) return true;
    return false;
  };

  Tendril.prototype._onMouseDown = function (e) {
    if (!this.opts.preventTextSelectOnTap) return;
    if (this._isInteractive(e.target)) return;
    if (e.detail > 1) {
      if (e.cancelable) e.preventDefault();
      this._clearSelection();
    }
  };

  Tendril.prototype._onSelectStart = function (e) {
    if (!this.opts.preventTextSelectOnTap) return;
    if (this._isInteractive(e.target)) return;
    if (this.tapHistory && this.tapHistory.length > 0) {
      var last = this.tapHistory[this.tapHistory.length - 1];
      if (performance.now() - last.time < 450) {
        if (e.cancelable) e.preventDefault();
      }
    }
  };

  Tendril.prototype._down = function (e) {
    if (!this.started) this._move(e);
    var x = e.clientX, y = e.clientY;
    var now = performance.now();
    var isInteractive = this._isInteractive(e.target);

    // Prevent text selection when rapid taps are occurring on text, but NEVER block interactive buttons!
    if (this.tapHistory.length > 0 && (now - this.tapHistory[this.tapHistory.length - 1].time) < 420) {
      this._clearSelection();
      if (!isInteractive && e.cancelable) e.preventDefault();
    }

    if (this.opts.tripleTapAnchor) {
      this.tapHistory.push({ time: now, x: x, y: y });
      if (this.tapHistory.length > 3) this.tapHistory.shift();

      // Check for 3 rapid taps
      if (this.tapHistory.length === 3) {
        var t0 = this.tapHistory[0], t2 = this.tapHistory[2];
        var timeSpan = t2.time - t0.time;
        var dist = Math.hypot(t2.x - t0.x, t2.y - t0.y);

        if (timeSpan <= this.opts.tripleTapMaxInterval && dist < 60) {
          this.tapHistory.length = 0;
          this._clearSelection();

          // 2-Stage Toggle: Triple-Tap 1 = Anchor tail & stretch cord; Triple-Tap 2 = Sever cord into falling rope!
          this.toggleAnchor(x, y);

          if (!isInteractive && e.cancelable) e.preventDefault();
          this._wake();
          return;
        }
      }
    }

    // Normal Click: Splash & Spill (Single clicks do NOT add waypoints!)
    if (this.opts.splashOnClick) this._splash(x, y);
    if (this.opts.spillOnClick) this.spill(x, y);
    this.headScale = this.targetHeadScale * 0.65;
    this._wake();
  };

  Tendril.prototype._up = function () {
    this.headScale = 1;
    this._wake();
  };

  Tendril.prototype._touchDown = function (e) {
    if (!e.touches || !e.touches[0]) return;
    var t = e.touches[0];
    this._move({ clientX: t.clientX, clientY: t.clientY });
    if (this.opts.splashOnClick) this._splash(t.clientX, t.clientY);
    if (this.opts.spillOnClick) this.spill(t.clientX, t.clientY);
    this._wake();
  };

  Tendril.prototype._touchMove = function (e) {
    if (!e.touches || !e.touches[0]) return;
    var t = e.touches[0];
    this._move({ clientX: t.clientX, clientY: t.clientY });
  };

  Tendril.prototype._over = function (e) {
    if (e.target.closest && e.target.closest(this.opts.hoverSelector)) {
      this.targetHeadScale = this.opts.hoverScale;
      this._wake();
    }
  };

  Tendril.prototype._out = function (e) {
    var to = e.relatedTarget;
    if (!to || !to.closest || !to.closest(this.opts.hoverSelector)) {
      this.targetHeadScale = 1;
      this._wake();
    }
  };

  Tendril.prototype._vis = function () {
    this.hidden = document.hidden;
    if (!this.hidden) this._wake();
  };

  Tendril.prototype._resize = function () {
    this.viewH = window.innerHeight;
    this.viewW = window.innerWidth;
  };

  /* ---------------- 2-Stage Triple-Tap Anchor & Sever Mechanics ---------------- */

  /**
   * Toggle Anchor:
   *  - Stage 1 (if free): Pins the tail at (x, y) with a clean anchor node. The cord stretches smoothly across screen.
   *  - Stage 2 (if anchored): Severs the stretched cord into an independent physical falling rope with Verlet gravity!
   */
  Tendril.prototype.toggleAnchor = function (x, y) {
    x = typeof x === 'number' ? x : this.target.x;
    y = typeof y === 'number' ? y : this.target.y;

    if (!this.isAnchored) {
      // Stage 1: Anchor Tail & Stretch Cord
      this.isAnchored = true;
      this.anchor.x = x;
      this.anchor.y = y;

      var lastIdx = this.points.length - 1;
      this.points[lastIdx].x = x;
      this.points[lastIdx].y = y;
      this.points[lastIdx].px = x;
      this.points[lastIdx].py = y;

      // Immediately distribute all intermediate points along the tendon from head to anchor
      var h = this.points[0];
      for (var pIdx = 1; pIdx < lastIdx; pIdx++) {
        var frac = pIdx / lastIdx;
        this.points[pIdx].x = h.x + (x - h.x) * frac;
        this.points[pIdx].y = h.y + (y - h.y) * frac;
        this.points[pIdx].px = this.points[pIdx].x;
        this.points[pIdx].py = this.points[pIdx].y;
      }

      this.anchorNode.setAttribute('cx', r1(x));
      this.anchorNode.setAttribute('cy', r1(y));
      this.anchorNode.setAttribute('r', (this.opts.headRadius * 1.25).toFixed(1));
      this.anchorNode.style.display = '';

      this._splash(x, y);
      this._clearSelection();

      if (typeof this.onAnchorChange === 'function') {
        this.onAnchorChange(true, { x: x, y: y });
      }
    } else {
      // Stage 2: Sever Stretched Cord & Drop with Gravity!
      this._severAndDropRope();
      this.isAnchored = false;
      this.anchorNode.style.display = 'none';
      this._clearSelection();

      if (typeof this.onAnchorChange === 'function') {
        this.onAnchorChange(false, null);
      }
    }

    this._wake();
  };

  /**
   * Drops the current stretched cord as an independent falling rope with Verlet physics
   */
  Tendril.prototype._severAndDropRope = function () {
    var severedPts = [];
    for (var i = 0; i < this.points.length; i++) {
      var p = this.points[i];
      var vx = (p.x - p.px) || 0;
      var vy = (p.y - p.py) || 0;
      severedPts.push({
        x: p.x,
        y: p.y,
        px: p.x - vx * 0.8,
        py: p.y - vy * 0.8,
        radius: p.radius
      });
    }

    var path = document.createElementNS(NS, 'path');
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', this.opts.color);
    path.setAttribute('stroke-width', this.opts.strokeWidth);
    path.setAttribute('stroke-linecap', 'round');
    path.setAttribute('stroke-linejoin', 'round');
    this.severedGroup.appendChild(path);

    var nodeGroup = document.createElementNS(NS, 'g');
    var circleEls = [];
    for (var j = 0; j < severedPts.length; j++) {
      var c = document.createElementNS(NS, 'circle');
      c.setAttribute('r', r1(severedPts[j].radius));
      c.setAttribute('fill', j === 0 ? this.opts.color : this.opts.secondaryColor);
      nodeGroup.appendChild(c);
      circleEls.push(c);
    }
    this.severedGroup.appendChild(nodeGroup);

    var totalLen = 0;
    for (var k = 0; k < severedPts.length - 1; k++) {
      totalLen += Math.hypot(severedPts[k + 1].x - severedPts[k].x, severedPts[k + 1].y - severedPts[k].y);
    }
    var segRestLen = Math.max(12, totalLen / (severedPts.length - 1));

    var severedRope = {
      pts: severedPts,
      path: path,
      nodeGroup: nodeGroup,
      circleEls: circleEls,
      segRestLen: segRestLen,
      life: 1.0,
      active: true
    };

    this.severedRopes.push(severedRope);

    // Liquid bursts at head and anchor release points
    this._splash(this.target.x, this.target.y);
    this._splash(this.anchor.x, this.anchor.y);
    this.spill(this.target.x, this.target.y, { count: 12, speed: 4.5 });

    // Cursor instantly resets to mouse position with fresh free tail
    for (var m = 0; m < this.points.length; m++) {
      this.points[m].x = this.target.x;
      this.points[m].y = this.target.y;
      this.points[m].px = this.target.x;
      this.points[m].py = this.target.y;
    }

    if (this.severedRopes.length > this.opts.maxSeveredRopes) {
      var oldest = this.severedRopes.shift();
      this._destroySeveredRope(oldest);
    }
  };

  Tendril.prototype._destroySeveredRope = function (sr) {
    if (sr.path && sr.path.parentNode) sr.path.parentNode.removeChild(sr.path);
    if (sr.nodeGroup && sr.nodeGroup.parentNode) sr.nodeGroup.parentNode.removeChild(sr.nodeGroup);
    sr.active = false;
  };

  /* ---------------- Particle Spawning & Standalone Spill ---------------- */

  Tendril.prototype._spawn = function (kind, x, y, vx, vy, r, decay) {
    for (var i = 0; i < this.pool.length; i++) {
      var p = this.pool[i];
      if (!p.active) {
        p.active = true; p.kind = kind;
        p.x = x; p.y = y; p.vx = vx; p.vy = vy;
        p.r = r; p.life = 1; p.decay = decay;
        p.el.style.display = '';
        this.activeCount++;
        return p;
      }
    }
    return null;
  };

  Tendril.prototype._splash = function (x, y) {
    var n = this.opts.splashCount;
    var blurBoost = Math.max(1, this.opts.gooeyBlur / 6.5);
    for (var i = 0; i < n; i++) {
      var a = (Math.PI * 2 * i) / n + (Math.random() - 0.5) * 0.5;
      var s = 2.5 + Math.random() * 3;
      var r = (5 + Math.random() * 3.5) * blurBoost;
      this._spawn(1, x, y, Math.cos(a) * s, Math.sin(a) * s, r, 0.05 + Math.random() * 0.02);
    }
  };

  Tendril.prototype.spill = function (arg1, arg2, arg3) {
    if (!this.initialized) return;

    var x, y, opts = {};
    if (typeof arg1 === 'object' && arg1 !== null) {
      opts = arg1;
      x = opts.x !== undefined ? opts.x : this.target.x;
      y = opts.y !== undefined ? opts.y : this.target.y;
    } else {
      x = typeof arg1 === 'number' ? arg1 : this.target.x;
      y = typeof arg2 === 'number' ? arg2 : this.target.y;
      opts = typeof arg3 === 'object' && arg3 !== null ? arg3 : {};
    }

    if (x < 0 || y < 0) {
      x = window.innerWidth / 2;
      y = window.innerHeight / 2;
    }

    var count = opts.count || this.opts.spillCount || 14;
    var baseSpeed = opts.speed || 5.0;
    var sizeMult = opts.size || 1.0;
    var gravityOverride = opts.gravity !== undefined ? opts.gravity : null;

    var blurComp = Math.max(1.0, this.opts.gooeyBlur / 5.5);

    for (var i = 0; i < count; i++) {
      // Natural downward pouring arc (angles pointing downwards)
      var a = Math.PI / 2 + (Math.random() - 0.5) * 1.5;
      var speed = (2.2 + Math.random() * baseSpeed);
      var r = (4.5 + Math.random() * 6.5) * sizeMult * blurComp;

      var p = this._spawn(
        2,
        x + (Math.random() - 0.5) * 10,
        y + (Math.random() - 0.5) * 6,
        Math.cos(a) * speed,
        Math.abs(Math.sin(a) * speed), // Guaranteed downward velocity (falls DOWN!)
        r,
        0
      );
      if (p && gravityOverride !== null) {
        p.gravity = gravityOverride;
      }
    }

    this._wake();
  };

  /* ---------------- RAF Animation Loop ---------------- */

  Tendril.prototype._wake = function () {
    if (this.running || !this.initialized || this.hidden) return;
    this.running = true;
    this.lastTime = 0;
    this.raf = requestAnimationFrame(this._tick);
  };

  Tendril.prototype._tick = function (now) {
    if (this.hidden) { this.running = false; return; }

    var dt = this.lastTime ? Math.min(now - this.lastTime, 50) : 16.67;
    this.lastTime = now;
    var f = dt / 16.67;
    var o = this.opts;
    var pts = this.points, n = pts.length;
    var moving = false;

    if (this.started) {
      var a = 1 - Math.exp(-dt / o.segTau);
      var ah = 1 - Math.exp(-dt / (o.segTau * 0.25));

      this.headScale += (this.targetHeadScale - this.headScale) * (1 - Math.exp(-dt / 70));

      // Head pins to cursor
      var h = pts[0];
      h.px = h.x; h.py = h.y;
      h.x += (this.target.x - h.x) * ah;
      h.y += (this.target.y - h.y) * ah;

      var energy = Math.abs(h.x - h.px) + Math.abs(h.y - h.py);

      if (!this.isAnchored) {
        // --- NORMAL FREE ROPE CHASE MODE ---
        var wobble = this.idle && o.idleWobble;
        for (var i = 1; i < n; i++) {
          var p = pts[i], q = pts[i - 1];
          p.px = p.x; p.py = p.y;
          var tx = q.x, ty = q.y, k = a;
          if (wobble) {
            p.ax += o.idleSpeed * f * (1 + i * 0.08);
            p.ay += o.idleSpeed * f * (1 + i * 0.08);
            var amp = o.idleAmplitude * (i / n);
            tx += Math.sin(p.ax) * amp;
            ty += Math.cos(p.ay) * amp;
            k = a * 0.72;
          }
          var dx = (tx - p.x) * k, dy = (ty - p.y) * k;
          p.x += dx; p.y += dy;
          energy += Math.abs(dx) + Math.abs(dy);
        }
      } else {
        // --- CLEAN 2-STAGE ANCHOR STRETCHING PHYSICS ---
        // Tail stays firmly rooted to anchor position
        var tail = pts[n - 1];
        tail.px = tail.x; tail.py = tail.y;
        tail.x = this.anchor.x;
        tail.y = this.anchor.y;

        // Gravitational catenary droop proportional to stretch distance
        var distHtoT = Math.hypot(h.x - tail.x, h.y - tail.y);
        var maxSag = Math.min(48, distHtoT * 0.08);

        // Distribute points evenly along the line between head and anchor with catenary sag
        for (var idx = 1; idx < n - 1; idx++) {
          var curr = pts[idx];
          curr.px = curr.x; curr.py = curr.y;

          var frac = idx / (n - 1);
          var lineX = h.x + (tail.x - h.x) * frac;
          var lineY = h.y + (tail.y - h.y) * frac;
          var sag = Math.sin(frac * Math.PI) * maxSag;

          var targetX = lineX;
          var targetY = lineY + sag;

          // Smooth spring relaxation
          var diffX = (targetX - curr.x) * 0.58;
          var diffY = (targetY - curr.y) * 0.58;

          curr.x += diffX;
          curr.y += diffY;
          energy += Math.abs(diffX) + Math.abs(diffY);
        }
      }

      moving = energy > 0.05 || (this.idle && o.idleWobble) || this.isAnchored;
      if (moving) this._drawRope();
    }

    if (this.severedRopes.length > 0) {
      this._updateSeveredRopes(f);
      moving = true;
    }

    if (this.activeCount) {
      this._updateParticles(f);
      moving = true;
    }

    if (moving || this.activeCount || this.severedRopes.length > 0) {
      this.raf = requestAnimationFrame(this._tick);
    } else {
      this.running = false;
    }
  };

  Tendril.prototype._drawRope = function () {
    var pts = this.points, n = pts.length;
    var d = 'M' + r1(pts[0].x) + ' ' + r1(pts[0].y);
    for (var i = 0; i < n - 1; i++) {
      var p0 = pts[i > 0 ? i - 1 : 0], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i < n - 2 ? i + 2 : i + 1];
      d += 'C' + r1(p1.x + (p2.x - p0.x) / 6) + ' ' + r1(p1.y + (p2.y - p0.y) / 6) + ' ' +
                 r1(p2.x - (p3.x - p1.x) / 6) + ' ' + r1(p2.y - (p3.y - p1.y) / 6) + ' ' +
                 r1(p2.x) + ' ' + r1(p2.y);
    }
    this.rope.setAttribute('d', d);

    // Physical total length of the cord
    var totalLen = 0;
    for (var k = 0; k < n - 1; k++) {
      totalLen += Math.hypot(pts[k + 1].x - pts[k].x, pts[k + 1].y - pts[k].y);
    }
    var restLen = (n - 1) * 14;
    var stretchRatio = Math.max(1.0, totalLen / restLen);

    // Volume Conservation: cord thins when stretched, but NEVER drops below SVG gooey filter visibility!
    // With gooey blur of 7px, stroke must stay >= 7.0px and node radius >= 6.0px to stay gooey & visible
    var effectiveStroke = this.isAnchored
      ? Math.max(7.2, this.opts.strokeWidth / Math.pow(stretchRatio, 0.28))
      : this.opts.strokeWidth;
    this.rope.setAttribute('stroke-width', r1(effectiveStroke));

    var g = this.grad, head = pts[0], tail = pts[n - 1];
    g.setAttribute('x1', r1(head.x)); g.setAttribute('y1', r1(head.y));
    g.setAttribute('x2', r1(tail.x + 0.1)); g.setAttribute('y2', r1(tail.y + 0.1));

    for (var j = 0; j < n; j++) {
      var c = this.nodes[j], pt = pts[j];
      c.setAttribute('cx', r1(pt.x));
      c.setAttribute('cy', r1(pt.y));
      if (j === 0) {
        c.setAttribute('r', r1(pt.radius * this.headScale));
      } else if (this.isAnchored) {
        // Intermediate nodes stay plump to bridge the gooey liquid path
        var nodeRad = Math.max(6.2, pt.radius / Math.pow(stretchRatio, 0.28));
        c.setAttribute('r', r1(nodeRad));
      } else {
        c.setAttribute('r', r1(pt.radius));
      }
    }
  };

  Tendril.prototype._updateSeveredRopes = function (f) {
    var gravity = this.opts.severedRopeGravity * f;
    var drag = Math.pow(this.opts.severedRopeDrag, f);
    var bottomLimit = this.viewH + 80;

    for (var rIdx = this.severedRopes.length - 1; rIdx >= 0; rIdx--) {
      var sr = this.severedRopes[rIdx];
      if (!sr.active) continue;

      // Lifespan timer ensures zero stuck fragments remain on screen (~2.5s max)
      sr.life -= 0.008 * f;

      var pts = sr.pts;
      var len = pts.length;
      var allOffscreen = true;

      for (var i = 0; i < len; i++) {
        var pt = pts[i];
        var vx = (pt.x - pt.px) * drag;
        var vy = (pt.y - pt.py) * drag + gravity;
        pt.px = pt.x;
        pt.py = pt.y;
        pt.x += vx;
        pt.y += vy;

        if (pt.y < bottomLimit) allOffscreen = false;
      }

      // Distance constraints preserve cord integrity as it falls
      var targetDist = sr.segRestLen;
      for (var pass = 0; pass < 2; pass++) {
        for (var j = 0; j < len - 1; j++) {
          var p1 = pts[j];
          var p2 = pts[j + 1];
          var dx = p2.x - p1.x;
          var dy = p2.y - p1.y;
          var dist = Math.hypot(dx, dy);
          if (dist > 0.001) {
            var diff = (dist - targetDist) / dist * 0.48;
            p1.x += dx * diff;
            p1.y += dy * diff;
            p2.x -= dx * diff;
            p2.y -= dy * diff;
          }
        }
      }

      var d = 'M' + r1(pts[0].x) + ' ' + r1(pts[0].y);
      for (var k = 0; k < len - 1; k++) {
        var p0 = pts[k > 0 ? k - 1 : 0], pA = pts[k], pB = pts[k + 1], pC = pts[k < len - 2 ? k + 2 : k + 1];
        d += 'C' + r1(pA.x + (pB.x - p0.x) / 6) + ' ' + r1(pA.y + (pB.y - p0.y) / 6) + ' ' +
                   r1(pB.x - (pC.x - pA.x) / 6) + ' ' + r1(pB.y - (pC.y - pA.y) / 6) + ' ' +
                   r1(pB.x) + ' ' + r1(pB.y);
      }
      sr.path.setAttribute('d', d);

      // Smooth visual fade-out
      var opacity = Math.max(0, Math.min(1, sr.life));
      sr.path.setAttribute('opacity', opacity.toFixed(2));
      sr.nodeGroup.setAttribute('opacity', opacity.toFixed(2));

      for (var m = 0; m < len; m++) {
        var circle = sr.circleEls[m];
        if (circle) {
          circle.setAttribute('cx', r1(pts[m].x));
          circle.setAttribute('cy', r1(pts[m].y));
        }
      }

      // Clean removal when fallen off-screen OR decayed
      if (allOffscreen || sr.life <= 0) {
        this._destroySeveredRope(sr);
        this.severedRopes.splice(rIdx, 1);
      }
    }
  };

  Tendril.prototype._updateParticles = function (f) {
    var o = this.opts, pool = this.pool, limitY = this.viewH + 50;
    var defaultGravity = o.gravity * f;

    for (var i = 0; i < pool.length; i++) {
      var p = pool[i];
      if (!p.active) continue;

      if (p.kind === 1) {
        var drag = Math.pow(0.92, f);
        p.vx *= drag; p.vy *= drag;
        p.x += p.vx * f; p.y += p.vy * f;
        p.life -= p.decay * f;
      } else if (p.kind === 2) {
        var grav = (p.gravity !== undefined ? p.gravity : defaultGravity);
        p.vy += grav;
        p.vx *= Math.pow(0.99, f);
        p.x += p.vx * f; p.y += p.vy * f;
        p.r -= 0.010 * f;
        p.life = p.r > 0.8 ? 1 : 0;

        if (o.dripTrail && p.r > 4 && p.vy > 2.2 && Math.random() < 0.20 * f) {
          this._spawn(3, p.x - p.vx * 0.5, p.y - p.vy * 0.5, p.vx * 0.15, p.vy * 0.2, p.r * 0.45, 0.05);
        }
        if (p.y - p.r > limitY || p.x < -60 || p.x > this.viewW + 60) p.life = 0;
      } else {
        p.x += p.vx * f; p.y += p.vy * f;
        p.life -= p.decay * f;
      }

      if (p.life <= 0) {
        p.active = false;
        p.gravity = null;
        p.el.style.display = 'none';
        this.activeCount--;
      } else {
        p.el.setAttribute('cx', r1(p.x));
        p.el.setAttribute('cy', r1(p.y));
        p.el.setAttribute('r', r1(p.r * p.life));
      }
    }
  };

  /* ---------------- Public API Methods ---------------- */

  Tendril.prototype.setColor = function (primary, secondary) {
    this.opts.color = primary;
    this.opts.secondaryColor = secondary || deriveSecondary(primary);

    var stops = this.svg.querySelectorAll('#' + this.gradId + ' stop');
    if (stops.length >= 2) {
      stops[0].setAttribute('stop-color', this.opts.color);
      stops[1].setAttribute('stop-color', this.opts.secondaryColor);
    }
    this.nodes[0].setAttribute('fill', this.opts.color);
    for (var i = 1; i < this.nodes.length; i++) {
      this.nodes[i].setAttribute('fill', this.opts.secondaryColor);
    }
    this.liquidGroup.setAttribute('fill', this.opts.color);
    this.anchorNode.setAttribute('fill', this.opts.color);
    this._wake();
  };

  Tendril.prototype.setOptions = function (newOpts) {
    Object.assign(this.opts, newOpts);
    if (newOpts.gooeyBlur !== undefined || newOpts.gooeyContrast !== undefined) {
      var blurVal = this.opts.gooeyBlur;
      var matrixOffset = Math.max(-18, Math.min(-10, -18 + (blurVal * 0.5)));
      var filter = this.svg.querySelector('#' + this.filterId);
      if (filter) {
        var gb = filter.querySelector('feGaussianBlur');
        var cm = filter.querySelector('feColorMatrix');
        if (gb) gb.setAttribute('stdDeviation', blurVal);
        if (cm) {
          cm.setAttribute('values', '1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 ' +
            this.opts.gooeyContrast + ' ' + matrixOffset);
        }
      }
    }
    this._wake();
  };

  Tendril.prototype.setBlendMode = function (mode) {
    this.opts.mixBlendMode = mode;
    if (this.wrap) {
      this.wrap.style.mixBlendMode = mode;
    }
  };

  Tendril.reportBug = function () {
    var mailto = 'mailto:mauryanishant2005@gmail.com?subject=Tendril.js%20Bug%20Report&body=Hi%20Nishant,%0A%0AI%20found%20an%20issue%20with%20Tendril.js:%0A%0A-%20Browser:%20' + encodeURIComponent(navigator.userAgent) + '%0A-%20Viewport:%20' + window.innerWidth + 'x' + window.innerHeight;
    window.location.href = mailto;
  };

  Tendril.prototype.reportBug = function () {
    Tendril.reportBug();
  };

  Tendril.prototype.destroy = function () {
    cancelAnimationFrame(this.raf);
    clearTimeout(this.idleTimer);

    window.removeEventListener('pointermove', this._move);
    window.removeEventListener('pointerdown', this._down);
    window.removeEventListener('pointerup', this._up);
    window.removeEventListener('touchstart', this._touchDown);
    window.removeEventListener('touchmove', this._touchMove);
    window.removeEventListener('touchend', this._up);
    window.removeEventListener('mousedown', this._onMouseDown);
    window.removeEventListener('selectstart', this._onSelectStart);
    window.removeEventListener('resize', this._resize);
    document.removeEventListener('pointerover', this._over);
    document.removeEventListener('pointerout', this._out);
    document.removeEventListener('visibilitychange', this._vis);

    this._removeHideNativeCursor();

    for (var i = 0; i < this.severedRopes.length; i++) {
      this._destroySeveredRope(this.severedRopes[i]);
    }
    this.severedRopes.length = 0;

    if (this.wrap && this.wrap.parentNode) {
      this.wrap.parentNode.removeChild(this.wrap);
    }
    this.initialized = false;
  };

  // Auto-init via data attribute
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () {
        var auto = document.querySelector('[data-tendril]');
        if (auto && !window.__tendril_auto_instance) {
          window.__tendril_auto_instance = new Tendril();
        }
      });
    } else {
      var auto = document.querySelector('[data-tendril]');
      if (auto && !window.__tendril_auto_instance) {
        window.__tendril_auto_instance = new Tendril();
      }
    }
  }

  return Tendril;
}));
