# NEXUS PLAY — Design System MASTER.md

This document serves as the single source of truth for the NEXUS PLAY user interface styling, typography, interactive components, and UX/accessibility standards.

## 1. Visual & Style Direction
NEXUS PLAY uses an **Immersive Dark / Cyber-Glass Bento** aesthetic. The design focuses on content-first hierarchy, striking cyberpunk neon highlights, rich blurred glass containers, and smooth micro-interactions that feel premium and tactile.

- **Theme:** Widescreen Cinematic Dark Mode by default.
- **Surface Finish:** Ultra-blur glassmorphism (`backdrop-blur-3xl`, transparent borders, subtle inner glows).
- **Core Aesthetic:** Symmetrical Bento-style grids, responsive movie strips, and high-fidelity gradients.

## 2. Color Palette
Harmonious, curated HSL-tailored colors. Avoid raw hex codes in components; always reference these semantic design tokens.

| Name | CSS Variable | HSL Value | Hex Value | Purpose |
|------|--------------|-----------|-----------|---------|
| Canvas Background | `--color-bg` | `hsl(240, 10%, 2%)` | `#050505` | Deep cinema background |
| Surface Elevated | `--color-bg-elevated` | `hsl(240, 8%, 7%)` | `#111113` | Panels, dropdown backdrops |
| Card Base | `--color-card` | `hsl(240, 7%, 8%)` | `#141416` | Movie card resting state |
| Card Hover | `--color-card-hover` | `hsl(240, 7%, 12%)` | `#1c1c1f` | Card hover state |
| Border | `--color-border` | `hsla(0, 0%, 100%, 0.06)` | `rgba(255,255,255,0.06)` | Resting containers border |
| Border Hover | `--color-border-hover` | `hsla(0, 0%, 100%, 0.12)` | `rgba(255,255,255,0.12)` | Focused/Hovered containers |
| Primary Accent | `--color-accent` | `hsl(190, 100%, 50%)` | `#00D2FF` | Neon Cyan highlighting |
| Accent Hover | `--color-accent-hover` | `hsl(190, 100%, 45%)` | `#00BBE5` | Interactive hover accent |
| Accent Muted | `--color-accent-dim` | `hsla(190, 100%, 50%, 0.1)`| `rgba(0,210,255,0.1)` | Active tab/badge backdrops |
| Secondary Accent| `--color-accent-purple`| `hsl(270, 95%, 75%)` | `#C084FC` | Highlight tags & sub-headings |
| Text Primary | `--color-text` | `hsl(240, 10%, 98%)` | `#fafafa` | Primary text and headings |
| Text Secondary | `--color-text-secondary`| `hsl(240, 5%, 78%)` | `#a1a1aa` | Explanatory text, subtitles |
| Text Muted | `--color-text-muted` | `hsl(240, 4%, 46%)` | `#71717a` | Informational overlays, guides |

## 3. Typography pairing
- **Display Font:** `Outfit`, sans-serif (Geometric, high-impact titles, uppercase badges)
- **Body Font:** `Inter`, sans-serif (Highly legible, custom tracking, variable weight)
- **Body Font Size:** Base `16px` (`text-base`), minimum body text `12px` (`text-xs`).
- **Line Height:** Body text set at `1.5` (`leading-relaxed`) or `1.6` to ensure comfortable reading.

## 4. Spacing & Touch Targets
- **Interactive targets:** All buttons, filters, and episode items have a minimum touch footprint of `44 × 44px`.
- **Layout Spacing:** Responsive padding transitions:
  - Widescreen padding: `px-6 md:px-16 lg:px-20`
  - Gap spacing: `gap-4 sm:gap-6 md:gap-8`
- **Focus States:** High-contrast focus rings (`focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg)]`).

## 5. Micro-Animations & Timing
- **Standard Transition:** `duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]` (out-expo transition curves for immediate reactivity).
- **Scale Feedback:** Scale components slightly up (`scale-102` or `scale-105` on hover) and down (`scale-98` on click) to provide physical click perception.
- **Motion Principles:** Motion must indicate direction and coordinate transitions. Do not animate layout properties (e.g. `width`/`height`) directly; transition opacity, transform scale, and translate coordinates instead.

## 6. Pre-Delivery Checklist
- [ ] Contrast ratio is at least 4.5:1 for all text.
- [ ] Hover states are accompanied by active touch indicators for mobile clients.
- [ ] No layout shift occurs during loading states (skeleton space reservation).
- [ ] Key interactions support keyboard navigation.
