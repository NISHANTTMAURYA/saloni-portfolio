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

### 🧹 Part 7: Emoji Removal & Flawless Doodle Layering
* **Full Emoji Cleanup:**
  - Removed emoji icons across all cards (`📊`, `🤝`, `💻`, `📜`, `🎓`, `📍`, `✨`) for a cleaner, high-polish typography aesthetic.
* **Flawless Doodle Positioning & Zero Overlaps:**
  - **Home Page:** Doodles are nested directly in the hero container below the `<header>`, completely clearing the navbar, logo, and "Let's Talk" CTA.
  - **Subpages:** Eliminated card occlusion and title overlaps by placing upper doodles in outer side gutters (`-left-20` / `-right-20`) and bottom doodles in dedicated, centered footer presentation zones below the card grids.

### 🎨 Part 8: +20% Doodle Size Increase, Organic Varied Positioning & Permanent Visibility
* **Permanent Viewport Visibility Across All Devices:**
  - Removed restrictive `hidden 2xl:block` classes that previously hid doodles on displays narrower than 1536px (laptops & desktops).
  - Replaced extreme negative margins (`-left-20`, `-top-16`) that caused viewport clipping in `overflow-x: hidden` containers with safe, responsive bounds (`w-20 sm:w-24`, standard Tailwind scales).
  - Eliminated card occlusion during CSS entrance animations by cleanly separating doodle coordinates from card grid bounds.
* **+20% Doodle Size Enhancement:**
  - Scaled all signature doodles up by 20% to 25% for bolder, more expressive hand-drawn visual presence:
    - **Home Pink Wavy Ribbon:** Scaled to `w-64 sm:w-80 lg:w-96 h-16 sm:h-20` placed right above the `Hey!` hero greeting.
    - **Home Golden Loop:** Scaled to `w-40 sm:w-52 lg:w-60 h-40 sm:h-52 lg:h-60` floating above the character art.
    - **Home Green Grid:** Scaled to `w-28 sm:w-36 lg:w-40 h-28 sm:h-36 lg:h-40` in the lower right.
    - **Subpage Header Doodles:** Scaled up from `w-14` / `w-16` to `w-20 sm:w-24 h-20 sm:h-24` (80px – 96px).
    - **Subpage Footer Doodles:** Scaled up to `w-40 sm:w-48` (Cupcake), `w-56 sm:w-68` (Growth chart), `w-60 sm:w-72` (Mumbai waves), `w-52 sm:w-64` (Flying envelope).
* **Organic Sketchbook Tilts & Zero Overlap Guarantee:**
  - Added authentic asymmetrical hand-drawn rotations (`-rotate-2`, `rotate-6`, `rotate-12`, `-rotate-8`, `rotate-3`, etc.) to break rigid symmetry.
* **Deep Linking & Hash Navigation:**
  - Added synchronized hash routing (`#home`, `#projects`, `#experience`, `#about`, `#contact`) with `window.onhashchange` listener for native browser history and deep linking.
* **Hand-Drawn Baker Chef Hat Doodle on Hero Character:**
  - Added a whimsical, authentic hand-drawn Baker Chef Hat (toque blanche) doodle 👩‍🍳 perched right atop Saloni's wavy hair on the Home page hero sticker.
  - Features billowing cloud puffs with creamy pastel gradient fill, interior fabric pleat lines, snug arched headband with sweet pink baker ribbon and heart emblem, aroma steam wisps, and golden magic twinkles.
  - Tilted at `rotate-[12deg]` to match Saloni's posture looking up towards the coffee mug and good vibes.
* **Randomized & Scattered Contact Page Doodles:**
  - Broke the rigid 3x2 vertical column layout into an organic, scattered sketchbook spread with varying X/Y offsets and playful rotations.
* **Experience Page Randomized Side Flank Doodles:**
  - Relocated and scattered the doodles on `#experience` into desktop **side flank gutters** with completely asymmetrical heights and randomized sizes:
    - **Left Flank:** *Growth Step Chart & Trajectory* (`w-26 xl:w-28`, `#0284C7`, "growth steps 📈", high at `top-[26%]`, tilted `-rotate-8`) + *Golden Starburst Accent* (low at `top-[68%]`).
    - **Right Flank:** *Mint Paper Airplane Accent* (high at `top-[24%]`, tilted `-rotate-12`) + *Sweetscape Chef Hat & Whisk* (`w-26 xl:w-28`, `#F43F5E`, "sweetscape baker 👩‍🍳", mid-low at `top-[52%]`, tilted `rotate-8`).
  - Constrained the 4 experience cards to `max-w-[990px] mx-auto` to guarantee zero overlap.

---

## 🎨 How to Add New Doodles (Complete Developer Guide)

Follow this guide whenever adding or customizing hand-drawn doodles across the website.

### 1. Scribo Hand-Drawn Design Rules
- **Line & Stroke Aesthetic:**
  - Always use `strokeLinecap="round"` and `strokeLinejoin="round"`.
  - Recommended stroke thickness: `strokeWidth="3.2"` to `4.2"` (gives an authentic gel pen / sketch marker stroke).
  - Outlines should generally be either dark charcoal (`#18181B` / `#1F1F1F`) or bold thematic colors (`#E11D48`, `#0284C7`, `#10B981`, `#D97706`).
- **Color Palette:**
  - **Fills:** Soft pastel background tones (`#FEF3C7`, `#FFE4E6`, `#DBEAFE`, `#D1FAE5`, `#F3E8FF`).
  - **Strokes / Accents:** Vibrant sketch ink tones (`#F59E0B`, `#E11D48`, `#2563EB`, `#059669`, `#7C3AED`).
- **Organic Sketchbook Tilts:**
  - Never place doodles rigidly flat. Always add playful rotations: `-rotate-12`, `-rotate-6`, `-rotate-2`, `rotate-3`, `rotate-6`, or `rotate-12`.

---

### 2. Copy-Paste Doodle Code Template

Wrap your SVG doodle inside a positioned container with `pointer-events-none`:

```jsx
{/* Example: Cute Hand-Drawn Doodle */}
<div className="hidden xl:block absolute top-[48%] -translate-y-1/2 left-2 pointer-events-none opacity-95 transform -rotate-6 z-20 text-center">
  <svg 
    className="w-28 xl:w-32 h-28 xl:h-32 text-[#F59E0B] drop-shadow-sm" 
    viewBox="0 0 100 100" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="3.6" 
    strokeLinecap="round" 
    strokeLinejoin="round"
  >
    {/* Pastel Fill Path */}
    <path d="M 50 12 L 60 38 L 88 38 L 66 54 L 74 80 L 50 64 L 26 80 L 34 54 L 12 38 L 40 38 Z" fill="#FEF3C7" />
    
    {/* Sketch Stroke Path */}
    <path d="M 50 12 L 60 38 L 88 38 L 66 54 L 74 80 L 50 64 L 26 80 L 34 54 L 12 38 L 40 38 Z" stroke="#D97706" strokeWidth="3.8" />
  </svg>
  
  {/* Handwritten Marker Label */}
  <div className="font-marker font-bold text-sm text-[#D97706] -mt-1 rotate-2">
    big ideas ⭐
  </div>
</div>
```

---

### 3. Critical Rules to Avoid Bugs

| Rule | Why It Matters | Correct Pattern |
| :--- | :--- | :--- |
| **Use Standard Tailwind Sizing** | Non-standard classes like `w-18`, `w-22` **do not exist** in Tailwind CDN. Using them causes SVGs to have no CSS width, making them explode to 100% full container width. | Use `w-16` (64px), `w-20` (80px), `w-24` (96px), `w-28` (112px), `w-32` (128px), `w-36` (144px), `w-40` (160px). |
| **Avoid Negative Offsets on 1280px Displays** | Using extreme negative positions like `-left-20` on a 1280px display causes doodles to get clipped by `overflow-x: hidden`. | Keep side doodles inside positive coordinates (`left-0`, `left-2`, `right-0`, `right-2`) and constrain central content (`max-w-[990px]` or `max-w-2xl`). |
| **Always Use `pointer-events-none`** | Doodles sit above or near cards and buttons. If pointer events are active, users cannot click cards, inputs, or links underneath. | Add `pointer-events-none` to doodle containers. |
| **Responsive Visibility** | Side flank gutters only have room on wider screens (`xl:` / `2xl:`). On phones and tablets, doodles will collide with text. | Use `hidden xl:block` or `hidden lg:block` for side flank doodles, or create a dedicated mobile flex row (`lg:hidden`). |

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

