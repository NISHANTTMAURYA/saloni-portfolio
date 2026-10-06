/**
 * Tendril.js — Liquid Rope & Ink Physics Engine
 *
 * A fusion of:
 *  - Ricardo Mendieta's "Ink Cursor"  → SVG gooey filter + harmonic idle respiration
 *  - Motion Bench's "Rope Cursor Trail" → frame-rate independent rope kinematics
 *
 * Highlights:
 *  - Dedicated `spill()` function with customizable volume, gravity, and velocity
 *  - Adaptive droplet mass scaling so high gooey blur doesn't swallow or erase droplets
 *  - 1:1 natural pointer tracking with ZERO button trapping
 *  - Zero-GC object pooling + tab visibility sleeping
 *  - Supports any custom CSS color
 *
 * MIT License
 */
(function (root, factory) {
  if (typeof define === 'function' && define.amd) define([], factory);
  else if (typeof module === 'object' && module.exports) module.exports = factory();
  else {
    root.Tendril = factory();
    root.TendrilCursor = root.Tendril;
    root.LiquidRopeCursor = root.Tendril;
    root.HybridInkRopeCursor = root.Tendril;
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var NS = 'http://www.w3.org/2000/svg';

  var DEFAULTS = {
    color: '#ee3d3d',        // any CSS color: hex, rgb(), hsl(), named
    secondaryColor: null,    // tail gradient (auto-derived if null)

    // Rope
    segments: 22,
    segTau: 36,              // per-segment lag in ms (frame-rate independent)
    headRadius: 14,
    tailRadius: 4,
    strokeWidth: 9,

    // Gooey SVG Filter
    gooeyBlur: 7,
    gooeyContrast: 34,
    gooeyOffset: -14,

    // Idle breathing
    idleTimeout: 150,
    idleWobble: true,
    idleSpeed: 0.045,
    idleAmplitude: 6,

    // Hover (no position hijacking — head only swells)
    hoverScale: 1.35,
    hoverSelector: 'a, button, [role="button"], input, textarea, select, label, .interactive, [data-cursor-hover]',

    // Click: radial ink burst
    splashOnClick: true,
    splashCount: 7,

    // Click: falling liquid spill
    spillOnClick: true,
    spillCount: 14,          // drops per click
    gravity: 0.38,           // px / frame² at 60fps
    dripTrail: true,         // fast heavy drops shed trailing droplets

    maxParticles: 120,       // shared pool size
    mixBlendMode: 'normal',
    zIndex: 999999,
    respectReducedMotion: true
  };

  /* ---------------- color helpers ---------------- */

  function toRGB(color) {
    var c = document.createElement('canvas').getContext('2d');
    c.fillStyle = '#000';
    c.fillStyle = color;
    var v = c.fillStyle;
    if (v.charAt(0) === '#') {
      return [parseInt(v.slice(1, 3), 16), parseInt(v.slice(3, 5), 16), parseInt(v.slice(5, 7), 16)];
    }
    var m = v.match(/[\d.]+/g);
    return m ? [+m[0], +m[1], +m[2]] : [238, 61, 61];
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

  function r1(n) { return Math.round(n * 10) / 10; }

  /* ---------------- engine ---------------- */

  function Tendril(options) {
    this.opts = Object.assign({}, DEFAULTS, options || {});
    if (!this.opts.secondaryColor) this.opts.secondaryColor = deriveSecondary(this.opts.color);

    this.id = 'tendril_' + Math.random().toString(36).slice(2, 9);
    this.points = [];
    this.nodes = [];
    this.pool = [];
    this.activeCount = 0;
    this.target = { x: -100, y: -100 };
    this.headScale = 1;
    this.targetHeadScale = 1;
    this.started = false;
    this.idle = false;
    this.hidden = false;
    this.running = false;
    this.lastTime = 0;
    this.viewH = window.innerHeight;
    this.viewW = window.innerWidth;

    this._move = this._move.bind(this);
    this._down = this._down.bind(this);
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
    if (coarseOnly && !this.opts.forceTouch) return;

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
    window.addEventListener('pointerdown', this._down, { passive: true });
    window.addEventListener('resize', this._resize, { passive: true });
    document.addEventListener('pointerover', this._over, { passive: true });
    document.addEventListener('pointerout', this._out, { passive: true });
    document.addEventListener('visibilitychange', this._vis);

    this.initialized = true;
    this._wake();
  };

  Tendril.prototype._buildDOM = function () {
    var o = this.opts;
    this.filterId = this.id + '_goo';
    this.gradId = this.id + '_grad';

    var wrap = document.createElement('div');
    wrap.setAttribute('aria-hidden', 'true');
    wrap.style.cssText =
      'position:fixed;inset:0;pointer-events:none;overflow:hidden;contain:strict;' +
      'z-index:' + o.zIndex + ';mix-blend-mode:' + o.mixBlendMode + ';';

    var svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '100%');
    svg.style.cssText = 'position:absolute;inset:0;overflow:visible;';

    // Adaptive matrix offset based on blur radius so high blur doesn't swallow drops
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

    var rope = document.createElementNS(NS, 'path');
    rope.setAttribute('fill', 'none');
    rope.setAttribute('stroke', 'url(#' + this.gradId + ')');
    rope.setAttribute('stroke-width', o.strokeWidth);
    rope.setAttribute('stroke-linecap', 'round');
    rope.setAttribute('stroke-linejoin', 'round');

    this.nodeGroup = document.createElementNS(NS, 'g');
    this.liquidGroup = document.createElementNS(NS, 'g');
    this.liquidGroup.setAttribute('fill', o.color);

    g.appendChild(rope);
    g.appendChild(this.nodeGroup);
    g.appendChild(this.liquidGroup);
    svg.appendChild(g);
    wrap.appendChild(svg);
    document.body.appendChild(wrap);

    this.wrap = wrap;
    this.svg = svg;
    this.rope = rope;
    this.grad = svg.querySelector('#' + this.gradId);
  };

  Tendril.prototype._buildRope = function () {
    var o = this.opts;
    this.points.length = 0;
    this.nodes.length = 0;
    while (this.nodeGroup.firstChild) this.nodeGroup.removeChild(this.nodeGroup.firstChild);

    var sx = this.started ? this.target.x : -100, sy = this.started ? this.target.y : -100;
    for (var i = 0; i < o.segments; i++) {
      var t = i / (o.segments - 1);
      var rad = o.headRadius + (o.tailRadius - o.headRadius) * t * 0.75;
      this.points.push({
        x: sx, y: sy, radius: rad,
        ax: Math.random() * Math.PI * 2,
        ay: Math.random() * Math.PI * 2
      });
      var c = document.createElementNS(NS, 'circle');
      c.setAttribute('r', r1(rad));
      c.setAttribute('fill', i === 0 ? o.color : o.secondaryColor);
      c.setAttribute('cx', sx);
      c.setAttribute('cy', sy);
      this.nodeGroup.appendChild(c);
      this.nodes.push(c);
    }
    this._wake();
  };

  Tendril.prototype._buildPool = function () {
    while (this.liquidGroup.firstChild) this.liquidGroup.removeChild(this.liquidGroup.firstChild);
    this.pool.length = 0;
    for (var i = 0; i < this.opts.maxParticles; i++) {
      var el = document.createElementNS(NS, 'ellipse');
      el.setAttribute('rx', 0);
      el.setAttribute('ry', 0);
      el.style.display = 'none';
      this.liquidGroup.appendChild(el);
      this.pool.push({
        el: el, active: false, kind: 0,
        x: 0, y: 0, vx: 0, vy: 0, r: 0, life: 0, decay: 0
      });
    }
    this.activeCount = 0;
  };

  /* ---------------- events ---------------- */

  Tendril.prototype._move = function (e) {
    this.target.x = e.clientX;
    this.target.y = e.clientY;
    if (!this.started) {
      for (var i = 0; i < this.points.length; i++) {
        this.points[i].x = e.clientX;
        this.points[i].y = e.clientY;
      }
      this.started = true;
    }
    this.idle = false;
    clearTimeout(this.idleTimer);
    var self = this;
    this.idleTimer = setTimeout(function () { self.idle = true; self._wake(); }, this.opts.idleTimeout);
    this._wake();
  };

  Tendril.prototype._down = function (e) {
    if (!this.started) this._move(e);
    var x = e.clientX, y = e.clientY;
    if (this.opts.splashOnClick) this._splash(x, y);
    if (this.opts.spillOnClick) this.spill(x, y);
    this.headScale = this.targetHeadScale * 0.65; // squish, springs back
    this._wake();
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

  /* ---------------- particles & spill ---------------- */

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

  // Radial ink burst that stays in place and dissolves
  Tendril.prototype._splash = function (x, y) {
    var n = this.opts.splashCount;
    // Scale radius with blur so blur doesn't dilute it below threshold
    var blurBoost = Math.max(1, this.opts.gooeyBlur / 6.5);
    for (var i = 0; i < n; i++) {
      var a = (Math.PI * 2 * i) / n + (Math.random() - 0.5) * 0.5;
      var s = 2.5 + Math.random() * 3;
      var r = (5 + Math.random() * 3.5) * blurBoost;
      this._spawn(1, x, y, Math.cos(a) * s, Math.sin(a) * s, r, 0.05 + Math.random() * 0.02);
    }
  };

  /**
   * SEPARATE STANDALONE SPILL FUNCTION
   * Can be called anywhere:
   *   cursor.spill()                               // spills at current cursor position
   *   cursor.spill(x, y)                           // spills at coordinates (x, y)
   *   cursor.spill(x, y, { count: 25, speed: 6 })  // custom volume and velocity
   *   cursor.spill({ x, y, count, gravity, speed, size }) // options object
   */
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

    // KEY FIX: Compensate for gooeyBlur!
    // When blur is high, Gaussian kernel spreads pixels over larger area.
    // We scale the drop mass so peak alpha remains above the color matrix cutoff!
    var blurComp = Math.max(1.0, this.opts.gooeyBlur / 5.5);

    for (var i = 0; i < count; i++) {
      // Fan arc: upward fountain spray with wide angle
      var a = -Math.PI / 2 + (Math.random() - 0.5) * 2.4;
      var speed = (2.0 + Math.random() * baseSpeed);
      // Adaptive drop radius ensuring high blur will never swallow drops
      var r = (4.0 + Math.random() * 6.5) * sizeMult * blurComp;

      var p = this._spawn(
        2, // kind = 2 (falling liquid drop)
        x + (Math.random() - 0.5) * 8,
        y + (Math.random() - 0.5) * 8,
        Math.cos(a) * speed,
        Math.sin(a) * speed,
        r,
        0
      );
      if (p && gravityOverride !== null) {
        p.gravity = gravityOverride;
      }
    }

    this._wake();
  };

  /* ---------------- loop ---------------- */

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
    var f = dt / 16.67;                       // 1.0 at 60fps
    var o = this.opts;
    var pts = this.points, n = pts.length;
    var moving = false;

    if (this.started) {
      var a = 1 - Math.exp(-dt / o.segTau);
      var ah = 1 - Math.exp(-dt / (o.segTau * 0.25));

      this.headScale += (this.targetHeadScale - this.headScale) * (1 - Math.exp(-dt / 70));

      var h = pts[0];
      var hx = h.x, hy = h.y;
      h.x += (this.target.x - h.x) * ah;
      h.y += (this.target.y - h.y) * ah;
      var energy = Math.abs(h.x - hx) + Math.abs(h.y - hy) + Math.abs(this.targetHeadScale - this.headScale);

      var wobble = this.idle && o.idleWobble;
      for (var i = 1; i < n; i++) {
        var p = pts[i], q = pts[i - 1];
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

      moving = wobble || energy > 0.05;
      if (moving) this._drawRope();
    }

    if (this.activeCount) this._updateParticles(f);

    if (moving || this.activeCount) {
      this.raf = requestAnimationFrame(this._tick);
    } else {
      this.running = false; // fully settled → stop loop (0% CPU)
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

    // Gradient follows rope from head to tail
    var g = this.grad, head = pts[0], tail = pts[n - 1];
    g.setAttribute('x1', r1(head.x)); g.setAttribute('y1', r1(head.y));
    g.setAttribute('x2', r1(tail.x + 0.1)); g.setAttribute('y2', r1(tail.y + 0.1));

    for (var j = 0; j < n; j++) {
      var c = this.nodes[j], pt = pts[j];
      c.setAttribute('cx', r1(pt.x));
      c.setAttribute('cy', r1(pt.y));
      if (j === 0) c.setAttribute('r', r1(pt.radius * this.headScale));
    }
  };

  Tendril.prototype._updateParticles = function (f) {
    var o = this.opts, pool = this.pool, limitY = this.viewH + 50;
    var defaultGravity = o.gravity * f;

    for (var i = 0; i < pool.length; i++) {
      var p = pool[i];
      if (!p.active) continue;

      if (p.kind === 1) {                    // radial splash — dissolves in place
        var drag = Math.pow(0.92, f);
        p.vx *= drag; p.vy *= drag;
        p.x += p.vx * f; p.y += p.vy * f;
        p.life -= p.decay * f;
      } else if (p.kind === 2) {             // falling liquid drop
        var grav = (p.gravity !== undefined ? p.gravity : defaultGravity);
        p.vy += grav;
        p.vx *= Math.pow(0.99, f);
        p.x += p.vx * f; p.y += p.vy * f;
        p.r -= 0.010 * f;                    // slowly sheds volume
        p.life = p.r > 0.8 ? 1 : 0;

        // Shed tiny droplets behind fast, heavy drops
        if (o.dripTrail && p.r > 4 && p.vy > 2.2 && Math.random() < 0.20 * f) {
          this._spawn(3, p.x - p.vx * 0.5, p.y - p.vy * 0.5, p.vx * 0.15, p.vy * 0.2, p.r * 0.45, 0.05);
        }
        if (p.y - p.r > limitY || p.x < -60 || p.x > this.viewW + 60) p.life = 0;
      } else {                               // drip trail droplet — lingers then shrinks
        p.vy += defaultGravity * 0.35;
        p.x += p.vx * f; p.y += p.vy * f;
        p.life -= p.decay * f;
      }

      if (p.life <= 0) {
        p.active = false;
        p.el.style.display = 'none';
        this.activeCount--;
        continue;
      }

      var el = p.el;
      if (p.kind === 2) {
        // Stretch along velocity, preserving volume (rx * ry = r²)
        var speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
        var stretch = 1 + Math.min(speed * 0.065, 0.95);
        var ry = p.r * stretch, rx = p.r / Math.sqrt(stretch);
        var angle = Math.atan2(p.vy, p.vx) * 57.2958 - 90;
        el.setAttribute('rx', r1(rx));
        el.setAttribute('ry', r1(ry));
        el.setAttribute('transform', 'translate(' + r1(p.x) + ' ' + r1(p.y) + ') rotate(' + r1(angle) + ')');
      } else {
        var rr = r1(p.r * p.life);
        el.setAttribute('rx', rr);
        el.setAttribute('ry', rr);
        el.setAttribute('transform', 'translate(' + r1(p.x) + ' ' + r1(p.y) + ')');
      }
    }
  };

  /* ---------------- public API ---------------- */

  Tendril.prototype.setColor = function (primary, secondary) {
    if (!primary || !this.initialized) return;
    var o = this.opts;
    o.color = primary;
    o.secondaryColor = secondary || deriveSecondary(primary);

    var stops = this.grad.querySelectorAll('stop');
    stops[0].setAttribute('stop-color', o.color);
    stops[1].setAttribute('stop-color', o.secondaryColor);
    for (var i = 0; i < this.nodes.length; i++) {
      this.nodes[i].setAttribute('fill', i === 0 ? o.color : o.secondaryColor);
    }
    this.liquidGroup.setAttribute('fill', o.color);
  };

  Tendril.prototype.setOptions = function (next) {
    if (!next || !this.initialized) return;
    var o = this.opts;
    Object.assign(o, next);

    if (next.color !== undefined || next.secondaryColor !== undefined) {
      this.setColor(o.color, next.secondaryColor || null);
    }
    if (next.segments !== undefined || next.headRadius !== undefined || next.tailRadius !== undefined) {
      this._buildRope();
    }
    if (next.maxParticles !== undefined) this._buildPool();
    if (next.strokeWidth !== undefined) this.rope.setAttribute('stroke-width', o.strokeWidth);
    if (next.mixBlendMode !== undefined) this.wrap.style.mixBlendMode = o.mixBlendMode;

    if (next.gooeyBlur !== undefined || next.gooeyContrast !== undefined || next.gooeyOffset !== undefined) {
      var flt = this.svg.querySelector('#' + this.filterId);
      var blurVal = o.gooeyBlur;
      // Recalibrate offset dynamically with blur
      var matrixOffset = next.gooeyOffset !== undefined ? next.gooeyOffset : Math.max(-18, Math.min(-10, -18 + (blurVal * 0.5)));

      flt.querySelector('feGaussianBlur').setAttribute('stdDeviation', blurVal);
      flt.querySelector('feColorMatrix').setAttribute('values',
        '1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 ' + o.gooeyContrast + ' ' + matrixOffset);
    }
    this._wake();
  };

  Tendril.prototype.destroy = function () {
    cancelAnimationFrame(this.raf);
    clearTimeout(this.idleTimer);
    window.removeEventListener('pointermove', this._move);
    window.removeEventListener('pointerdown', this._down);
    window.removeEventListener('resize', this._resize);
    document.removeEventListener('pointerover', this._over);
    document.removeEventListener('pointerout', this._out);
    document.removeEventListener('visibilitychange', this._vis);
    if (this.wrap && this.wrap.parentNode) this.wrap.parentNode.removeChild(this.wrap);
    this.initialized = false;
    this.running = false;
  };

  Tendril.defaults = DEFAULTS;
  return Tendril;
}));
