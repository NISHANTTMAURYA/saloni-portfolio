# 💧 Tendril.js — Liquid Rope & Ink Physics Engine

> **A zero-dependency physics-based cursor engine synthesizing Ricardo Mendieta's Gooey Ink Cursor with Motion Bench's Kinematic Rope Trail.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Zero Dependencies](https://img.shields.io/badge/dependencies-0-brightgreen.svg)](#)
[![Performance](https://img.shields.io/badge/GC%20Allocation-0%20bytes%20per%20click-purple.svg)](#)
[![Color](https://img.shields.io/badge/Default-Emerald%20Green-10b981.svg)](#)

---

## 🌟 Core Features & Inventions

**Tendril.js** merges creative coding concepts into a buttery-smooth 60fps simulation:

### 1. 📍 Multi-Checkpoint Waypoint Weaving Architecture
- **Stage 1 (Plant Pin #1)**: Triple-click anywhere to enter Weaving Mode. The tail roots to that spot with a fluid anchor splash.
- **Stage 2 (Weave Waypoints #2, #3, ...)**: Single-click across the screen to plant sequential stop pins. The liquid tendon threads through every waypoint with organic catenary gravitational sag!
- **Stage 3 (The Cascade Drop ✂️)**: Triple-click again (or call `cursor.releaseAllAndDrop()`). The entire threaded cord detaches from all pins and cascades down the screen under real **Verlet integration gravity and distance relaxation constraints**, bending, coiling, and flopping as it falls! Simultaneous pressurized liquid bursts erupt at every checkpoint location!
- **Anti-Highlighting Guard**: Triple-tapping never accidentally selects text on the page!

### 2. 🔍 The Liquid Lens: Ricardo Mendieta's Text Inversion Effect
- Using `mix-blend-mode: difference`, the liquid droplet calculates mathematical difference against underlying pixels.
- When hovering over dark text, the text inverts complementary and shines vividly through the drop without obscuring content!
- Easily toggle between `difference` (Text Reveal Lens), `normal` (Solid Viscous Ink), and `screen` (Luminous Cyber Glow).

### 3. 📱 Mobile Phone & Touch Screen Support
- Fully optimized for touchscreens and mobile devices:
  - Dragging your finger across the screen draws the fluid emerald green rope trail in real time.
  - Tapping anywhere erupts pressurized liquid splashes and falling gravitational spills!
  - Native page scrolling remains buttery-smooth with non-blocking passive listeners.

### 4. 💧 Gravitational Liquid Spills & Dedicated `spill()` Function
- When clicked, viscous liquid drops erupt upward and cascade downward under realistic gravity (`vy += gravity`), stretching into aerodynamic teardrops along their velocity vector, shedding trailing micro-droplets, and melting back through the SVG `#goo` surface tension filter.
- **Adaptive Droplet Mass**: Automatically scales droplet radii with `gooeyBlur` so high blur never erases drops!
- **Standalone `cursor.spill()` API**: Trigger spills programmatically anywhere with custom volume, speed, and coordinates.

### 5. 🎯 1:1 Natural Pointer Tracking (Zero Sticky Catching)
- Buttons and links do not catch, trap, or hijack your mouse position. The head droplet softly swells in size with fluid spring physics while remaining completely free to move.

### 6. 🎨 Emerald Green Default Palette
- Defaults to a fresh, vibrant **Emerald Green (`#10b981`)** with a **Cyan (`#06b6d4`)** tail gradient. Accepts *any* CSS color (Hex, RGB, HSL).

---

## 🚀 Quick Start

### 1-Line HTML Integration (Zero Config)

```html
<script src="tendril.js" data-tendril></script>
```

### Modular Vanilla JavaScript

```html
<script src="tendril.js"></script>
<script>
  const cursor = new Tendril({
    color: '#10b981',              // Emerald Green (Default)
    secondaryColor: '#06b6d4',     // Cyan tail gradient
    mixBlendMode: 'difference',    // Text reveal lens
    spillOnClick: true,            // Pressurized liquid spill
    tripleTapAnchor: true,         // Waypoint weaving & severed rope
    multiCheckpoints: true,        // Multiple sequential stop pins
    severedRopeGravity: 0.42       // Verlet falling gravity
  });
</script>
```

---

## 🤖 Copy AI Prompt for Fast Implementation

In the interactive showcase (`index.html`), click **"🤖 Copy AI Prompt"** on any tab to immediately prompt Claude, ChatGPT, or Cursor to integrate Tendril into your React, Next.js, Vue, Vite, or Webflow project!

---

## 🕹️ Interactive API Reference

```javascript
// Add sequential checkpoint pins:
cursor.addCheckpoint();       // At current cursor position
cursor.addCheckpoint(x, y);   // At explicit coordinates

// Release all checkpoints and drop severed cord:
cursor.releaseAllAndDrop();

// Clear checkpoints without dropping:
cursor.clearCheckpoints();

// Trigger programmatic liquid spill:
cursor.spill({ count: 20, speed: 6.0 });

// Switch blend modes on the fly:
cursor.setBlendMode('difference'); // Inversion lens
cursor.setBlendMode('normal');     // Solid ink

// Report bug or request integration assistance:
cursor.reportBug();
```

---

## 🐞 Support & Bug Reporting

Need help or found an edge-case bug?
Direct developer contact: **[mauryanishant2005@gmail.com](mailto:mauryanishant2005@gmail.com)**

Call `cursor.reportBug()` in code or click the **Report Bug** button on the showcase page to auto-generate an email pre-filled with technical browser & display diagnostics.

---

## 📄 License

MIT License © 2026 Nishant Maurya
