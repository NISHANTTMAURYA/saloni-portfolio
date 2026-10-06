# 💧 Tendril.js — Liquid Rope & Ink Physics Engine

> **A physics-based cursor engine synthesizing Ricardo Mendieta's Gooey Ink Cursor with Motion Bench's Kinematic Rope Trail.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Zero Dependencies](https://img.shields.io/badge/dependencies-0-brightgreen.svg)](#)
[![Performance](https://img.shields.io/badge/GC%20Allocation-0%20bytes%20per%20click-purple.svg)](#)

---

## 🌟 The Concept

**Tendril.js** merges two creative coding concepts into a single fluid simulation:

1. **Ricardo Mendieta's Ink Cursor**
   - SVG `#goo` filter (`feGaussianBlur` + `feColorMatrix` alpha threshold) creating liquid surface tension and causing overlapping elements to fuse.
   - Harmonic idle respiration: when stationary for >150ms, the tail droplets drift with sinusoidal waves (`sin`/`cos`), keeping the liquid alive.

2. **Motion Bench's Rope Cursor Trail**
   - Frame-rate independent exponential kinematics (`1 - Math.exp(-dt / segTau)`).
   - Identical tension, slack, and feel across 60Hz, 120Hz, and 144Hz displays without whipping or snapping.
   - Segmented kinematic spine connected by smooth Catmull-Rom cubic splines.

3. **Core Refinements in Tendril.js**
   - **Gravitational Liquid Spills on Click**: Clicking ruptures the fluid tension. Viscous liquid drops erupt and cascade downward with realistic gravity (`vy += gravity`), stretching along their velocity vector, shedding dripping trails, and melting back through the SVG gooey threshold.
   - **Pure 1:1 Natural Pointer Tracking**: Zero button trapping. Buttons do not catch or drag your mouse position; instead, the head droplet softly swells in size with fluid spring physics while remaining completely free to move.
   - **Color Studio**: Accepts *any* CSS color (Hex `#ee3d3d`, `rgb(...)`, `hsl(...)`, or named color) and automatically derives harmonious secondary tail gradients.
   - **Light Mode Default**: Clean editorial layout with warm paper canvas (`#FAF7F0`) and obsidian/crimson ink.
   - **Zero-GC Object Pooling**: Drops are recycled from pre-allocated SVG pools. Zero memory leaks or garbage collection pauses.
   - **Visibility Sleep**: Automatically halts the animation loop when the browser tab is hidden to save 100% of CPU/GPU resources.

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
    gravity: 0.38,             // Gravitational acceleration (px/frame²)
    dripTrail: true,           // Falling drops shed micro-droplets
    segments: 22,              // Kinematic joints count
    segTau: 36                 // Rope lag in ms
  });
</script>
```

---

## 🎨 Setting Any Custom Color

Tendril allows you to change colors on the fly at any time:

```javascript
// Single color (automatically derives harmonious secondary tail)
cursor.setColor('#7c5cff');

// Primary + Secondary Gradient
cursor.setColor('#10b981', '#06b6d4');

// Works with any CSS color format:
cursor.setColor('rgb(238, 61, 61)');
cursor.setColor('hsl(340, 82%, 56%)');
```

---

## ⚙️ Configuration Options

| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `color` | `string` | `'#7c5cff'` | Primary head droplet color (any CSS format). |
| `secondaryColor` | `string` | `null` | Secondary tail gradient color (auto-generated if null). |
| `spillOnClick` | `boolean` | `true` | Drops spill and cascade down with gravity on click. |
| `gravity` | `number` | `0.38` | Gravitational acceleration downward. |
| `dripTrail` | `boolean` | `true` | Fast falling drops shed trailing micro-droplets. |
| `splashOnClick` | `boolean` | `true` | Radial ink burst that dissolves in place on click. |
| `segments` | `number` | `22` | Number of kinematic joints along the rope (10–36). |
| `segTau` | `number` | `36` | Lag time constant in ms (frame-rate independent). |
| `headRadius` | `number` | `14` | Radius of the cursor head in px. |
| `tailRadius` | `number` | `4` | Radius of the tail end droplet in px. |
| `strokeWidth` | `number` | `9` | Rope spine thickness in px. |
| `gooeyBlur` | `number` | `7` | SVG `feGaussianBlur` radius (viscosity). |
| `idleTimeout` | `number` | `150` | Milliseconds of stillness before idle breathing begins. |
| `idleWobble` | `boolean` | `true` | Enables harmonic sine-wave breathing when stationary. |
| `hoverScale` | `number` | `1.35` | Scale factor for head droplet when hovering over interactive elements. |
| `hoverSelector` | `string` | `'a, button, ...'` | CSS selector for interactive elements. |
| `maxParticles` | `number` | `90` | Size of the pre-allocated particle object pool. |

---

## 🛠️ API Methods

### `cursor.setColor(primary, [secondary])`
Updates the palette live without reinitializing.

### `cursor.setOptions(optionsObject)`
Updates runtime configuration parameters (e.g. `segTau`, `gooeyBlur`, `segments`, `strokeWidth`).

### `cursor.spill(x, y)`
Programmatically spills liquid at any coordinate (e.g. on form submit or button click).

### `cursor.destroy()`
Cleans up all DOM nodes, cancels animation frames, and removes event listeners.

---

## ⚛️ Usage in React / Next.js

```jsx
import { useEffect, useRef } from 'react';
import { Tendril } from './tendril';

export default function App() {
  const cursorRef = useRef(null);

  useEffect(() => {
    cursorRef.current = new Tendril({
      color: '#ee3d3d',
      secondaryColor: '#f43f5e',
      spillOnClick: true,
      gravity: 0.38
    });

    return () => cursorRef.current?.destroy();
  }, []);

  return <div>Your App Content</div>;
}
```

---

## 📜 Credits & Acknowledgments

- **Ricardo Mendieta**: Creator of the original [Ink Cursor](https://codepen.io/mendieta/pen/WgvENJ) (SVG gooey threshold and idle oscillation).
- **Motion Bench**: Creator of the [Rope Cursor Trail](https://motion-bench.vercel.app) (frame-rate independent exponential kinematics).

---

## 📄 License

MIT License © 2026.
