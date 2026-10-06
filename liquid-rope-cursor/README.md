# 💧 Tendril.js — Liquid Rope & Ink Physics Engine

> **A physics-based cursor engine synthesizing Ricardo Mendieta's Gooey Ink Cursor with Motion Bench's Kinematic Rope Trail.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Zero Dependencies](https://img.shields.io/badge/dependencies-0-brightgreen.svg)](#)
[![Performance](https://img.shields.io/badge/GC%20Allocation-0%20bytes%20per%20click-purple.svg)](#)

---

## 🌟 The Concepts & New Inventions

**Tendril.js** merges creative coding concepts into an interactive physical simulation:

### 1. 🧵 Triple-Tap Anchor Pinning & Severed Falling Rope
- **1st Triple-Tap (Drop Anchor 📍)**: Roots the tail of the liquid rope to that exact spot on the screen with a pulsing fluid anchor. As you move away, the cord stretches elastically across the entire page like molten liquid rubber with catenary gravity sag!
- **2nd Triple-Tap (Sever & Drop ✂️)**: The stretched rope **detaches completely from your cursor** and becomes an independent physical object. It cascades down the screen with **real Verlet integration gravity and distance relaxation constraints**, bending, coiling, and flopping as it falls! Your cursor seamlessly regenerates a fresh, free-moving tail immediately.

### 2. 💧 Gravitational Liquid Spills & Dedicated `spill()` Function
- When clicked, viscous liquid drops erupt upward and cascade downward under realistic gravity (`vy += gravity`), stretching into aerodynamic ellipses along their velocity vector, shedding dripping micro-trails, and melting back through the SVG `#goo` surface tension filter.
- **Adaptive Droplet Mass**: Automatically scales droplet radii with `gooeyBlur` so high blur never swallows or erases drops!
- **Standalone `cursor.spill()` API**: Trigger spills programmatically anywhere with custom volume, speed, and coordinates.

### 3. 🎯 1:1 Natural Pointer Tracking (Zero Sticky Catching)
- Buttons and links do not catch, trap, or hijack your mouse position. The head droplet softly swells in size with fluid spring physics while remaining completely free to move.

### 4. 🎨 Any Custom Color Studio
- Accepts *any* CSS color (Hex `#ee3d3d`, `rgb(...)`, `hsl(...)`, or named color) and automatically derives harmonious secondary tail gradients.

### 5. ☀️ Light Mode Default
- Clean editorial layout with warm paper canvas (`#FAF7F0`), obsidian/crimson ink, and dark-mode toggle.

---

## 🚀 Quick Start

### 1. Include the Script

```html
<script src="tendril.js"></script>
```

### 2. Initialize

```html
<script>
  const cursor = new Tendril({
    color: '#ee3d3d',          // Any hex, rgb, or hsl color
    secondaryColor: '#f43f5e', // Optional tail gradient (auto-derived if omitted)
    spillOnClick: true,        // Liquid drops spill and fall with gravity
    tripleTapAnchor: true,     // Triple-tap to anchor and sever falling ropes
    severedRopeGravity: 0.42,  // Gravity for severed falling ropes
    segments: 22,              // Kinematic joints count
    segTau: 36                 // Rope lag in ms
  });
</script>
```

---

## 🕹️ Interactive Features & API

### Anchoring & Dropping Ropes Programmatically

```javascript
// Toggle anchor on/off:
cursor.toggleAnchor();

// Or pass specific coordinates:
cursor.toggleAnchor(x, y);

// Listen to anchor state changes:
cursor.onAnchorChange = (isAnchored, coords) => {
  console.log('Anchored:', isAnchored, coords);
};
```

### Standalone Liquid Spill

```javascript
// Spill at current cursor position:
cursor.spill();

// Spill with custom options:
cursor.spill({
  x: 400,
  y: 300,
  count: 25,     // 25 drops
  speed: 6.5,    // launch velocity
  gravity: 0.42  // falling gravity
});
```

### Changing Colors Live

```javascript
// Single color (auto-derives harmonious tail gradient):
cursor.setColor('#7c5cff');

// Custom Primary + Secondary:
cursor.setColor('#10b981', '#06b6d4');
```

---

## ⚙️ Configuration Options

| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `color` | `string` | `'#ee3d3d'` | Primary head droplet color (any CSS format). |
| `secondaryColor` | `string` | `null` | Secondary tail gradient color (auto-generated if null). |
| `tripleTapAnchor` | `boolean` | `true` | Triple-tap to anchor tail and sever falling ropes. |
| `severedRopeGravity`| `number` | `0.42` | Gravity acceleration for detached falling ropes. |
| `spillOnClick` | `boolean` | `true` | Drops spill and cascade down with gravity on click. |
| `spillCount` | `number` | `14` | Number of drops per spill. |
| `gravity` | `number` | `0.38` | Gravitational acceleration downward for drops. |
| `dripTrail` | `boolean` | `true` | Fast falling drops shed trailing micro-droplets. |
| `segments` | `number` | `22` | Number of kinematic joints along the rope (10–36). |
| `segTau` | `number` | `36` | Lag time constant in ms (frame-rate independent). |
| `gooeyBlur` | `number` | `7` | SVG `feGaussianBlur` radius (viscosity). |
| `hoverScale` | `number` | `1.35` | Scale factor for head droplet when hovering over interactive elements. |
| `hoverSelector` | `string` | `'a, button, ...'` | CSS selector for interactive elements. |

---

## 📄 License

MIT License © 2026.
