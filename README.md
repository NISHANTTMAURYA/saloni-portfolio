# 🎨 Saloni Bhosale — Handmade Portfolio Documentation

Handmade-style developer, founder & UI/UX portfolio with cursor-tracking chibi 2D mascots, organic hand-drawn doodle arrows, and authentic sketchbook design.

---

## 📑 Project Evolution & Work Log (Parts Breakdown)

### 🧩 Part 1: Hero Section Arrow Directions & Subject Targeting
* **Problem:** In the initial layout, several arrows were pointing in awkward or opposite directions (e.g., pointing away into empty margins instead of pointing directly to the character illustration or relevant objects).
* **Fixes & Architecture:**
  - **Top-Left (Blue Arrow):** Adjusted to point down-right from *"Good Ideas, Better Execution"* towards Saloni / dessert cups.
  - **Top-Right (Red Arrow):** Oriented to arc gracefully down-left from *"Probably baking or building something cool..."* over the plant foliage towards Saloni.
  - **Bottom-Right (Pink Arrow):** Adjusted angle (`rotate-[-52deg]`) so the arrowhead slants North-Left directly towards the sleeping tuxedo kitty.
  - **Bottom-Left (Orange Arrow):** Reordered to place the arrow on top swooping up-right into the cakes and mixing bowl, with *"Sweetscape Home Bakery"* text neatly underneath.

---

### 🏹 Part 2: Integration of Authentic Hand-Drawn Arrow Library
* **Source Library:** [Eronred/handy-arrows](https://github.com/eronred/handy-arrows) (CC0 Open-Source Hand-Drawn SVG Collection).
* **Implementation:**
  - Downloaded 40+ designer-crafted hand-drawn vector doodle arrows into `public/arrows/`.
  - Replaced rigid programmatic lines with real variable-thickness ink stroke vector SVGs.
  - Applied customized color filters (`invert()`, `sepia()`, `saturate()`, `hue-rotate()`) to match the hand-drawn color palette:
    - 🔵 Electric Blue (`#2563EB`)
    - 🔴 Berry Red (`#E11D48`)
    - 🩷 Soft Pink (`#EC4899`)
    - 🟠 Warm Amber / Honey (`#D97706`)

---

### 📐 Part 3: Overlap & Zero-Clipping SVG Architecture
* **Problem:** SVG arrows were previously clipped/cut off at container borders by standard browser box-model constraints.
* **Fixes & Architecture:**
  - Added inline `style={{ overflow: 'visible' }}` to all SVG elements to prevent WebKit viewport cropping.
  - Configured high stacking index (`z-20`) so arrows physically cross the boundary and overlap naturally onto the hero sticker artwork.
  - Configured responsive scaling (`w-12 sm:w-14 lg:w-16`) with relative translate positioning.

---

### 🔤 Part 4: Layout & Typography Wrap Corrections
* **Problem:** *"Fr. CRCE."* in the bio was breaking across separate lines (*"Fr."* on line 1, *"CRCE."* on line 2).
* **Fixes:**
  - Added `whitespace-nowrap` to `<span className="whitespace-nowrap font-medium">Fr. CRCE.</span>`.
  - Expanded paragraph max-width constraint from `max-w-lg` to `max-w-xl xl:max-w-2xl` to ensure the entire introductory sentence sits comfortably on one line across desktop screens.
  - Removed unwanted accent stars to declutter the focal points.

---

### ✨ Part 5: Site-Wide Hand-Drawn Doodle Accents & Aesthetics
* **Hero View:**
  - Hand-drawn sunburst doodle ticks on the highlighter box (`Saloni,`).
  - Organic squiggly red underline under `problem solver.`.
  - Golden sparkle doodle next to `Hey!`.
  - Cute pink heart doodle beside the `explore pages!` action arrow.
* **Projects View:**
  - Clean cards layout with hand-drawn soft borders and category pills.
  - Hand-drawn star doodle beside `Selected Works`.
* **Experience View:**
  - Hand-drawn checkmark badges on bullet points (`✓`).
  - Award badge doodle beside `Career & Roles`.
* **About View:**
  - Hand-drawn heart doodle beside `Background & Profile`.
  - Category emoji badges for Tools, BizDev, Tech Stack & Certifications.
* **Contact View:**
  - Hand-drawn paper airplane doodle beside `Direct Connection`.

### 🎨 Part 6: Clean Scribo-Style Aesthetic (Max 3-4 Spread-Out Large Doodles)
* **Hero Section Decluttering:**
  - Removed small floating pill tags to give the main character and arrow pointers full breathing room.
  - Retained **only 3 large, bold doodles** placed strategically in far outer corners:
    1. Top-Left Pink Wavy Ribbon (`#F472B6`)
    2. Top-Right Golden Looping Ribbon (`#F59E0B`)
    3. Bottom-Right Green Sketchy Grid + Pink Checkmark (`#059669` / `#EC4899`)
* **Clean, Contextual 3-Doodle Balance Across All Subpages:**
  - **Projects View (3 Doodles):** Top-Right curly code brackets `{ ; }`, Bottom-Left database cylinders, and Bottom-Right Sweetscape cupcake.
  - **Experience View (3 Doodles):** Top-Right sales megaphone & waves, Top-Left baker chef hat & whisk, and Bottom-Left career growth step chart.
  - **About View (3 Doodles):** Top-Right graduation cap (Fr. CRCE), Top-Left steaming chai cup, and Bottom-Right Mumbai coastal breeze & sun.
  - **Contact View (3 Doodles):** Top-Right soaring paper airplane, Top-Left chat speech bubbles, and Bottom-Left flying mail envelope.

---

## 🚀 How to Run Locally

```bash
# Simply open in any modern web browser
open index.html
```

Or view the curated arrow library gallery:
```bash
open public/arrows_gallery.html
```
