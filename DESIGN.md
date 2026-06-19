---
name: SuperAgent Terminal
colors:
  surface: '#12131a'
  surface-dim: '#12131a'
  surface-bright: '#383941'
  surface-container-lowest: '#0d0e15'
  surface-container-low: '#1a1b22'
  surface-container: '#1e1f26'
  surface-container-high: '#292931'
  surface-container-highest: '#33343c'
  on-surface: '#e3e1ec'
  on-surface-variant: '#bbcabf'
  inverse-surface: '#e3e1ec'
  inverse-on-surface: '#2f3038'
  outline: '#86948a'
  outline-variant: '#3c4a42'
  surface-tint: '#4edea3'
  primary: '#4edea3'
  on-primary: '#003824'
  primary-container: '#10b981'
  on-primary-container: '#00422b'
  inverse-primary: '#006c49'
  secondary: '#c0c1ff'
  on-secondary: '#1000a9'
  secondary-container: '#3131c0'
  on-secondary-container: '#b0b2ff'
  tertiary: '#ffb3af'
  on-tertiary: '#650911'
  tertiary-container: '#fc7c78'
  on-tertiary-container: '#711419'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#6ffbbe'
  primary-fixed-dim: '#4edea3'
  on-primary-fixed: '#002113'
  on-primary-fixed-variant: '#005236'
  secondary-fixed: '#e1e0ff'
  secondary-fixed-dim: '#c0c1ff'
  on-secondary-fixed: '#07006c'
  on-secondary-fixed-variant: '#2f2ebe'
  tertiary-fixed: '#ffdad7'
  tertiary-fixed-dim: '#ffb3af'
  on-tertiary-fixed: '#410005'
  on-tertiary-fixed-variant: '#842225'
  background: '#12131a'
  on-background: '#e3e1ec'
  surface-variant: '#33343c'
typography:
  headline-sm:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.01em
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  code-md:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 20px
  code-sm:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  label-xs:
    fontFamily: JetBrains Mono
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 14px
    letterSpacing: 0.02em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  base: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  panel-gap: 1px
  container-padding: 12px
---

## Brand & Style
The design system is engineered for productivity, precision, and high-density information architecture. It targets a developer audience that values speed, local-first performance, and a "pro-tool" aesthetic. 

The style is **Professional / Technical**, drawing inspiration from modern IDEs like VS Code. It bridges the gap between a CLI's efficiency and a GUI's discoverability. The interface utilizes a "Chromeless" philosophy—removing unnecessary visual weight to keep focus on code and agent logic. Key characteristics include:
- **Low-contrast surfaces** to reduce eye strain during long sessions.
- **Monochromatic hierarchy** punctuated by a single high-energy functional accent.
- **Micro-interactions** that feel instantaneous, reinforcing the local-first nature of the product.

## Colors
The palette is rooted in a "Zinc" scale to maintain a neutral, hardware-like feel. 

- **Backgrounds:** The primary app shell uses `#0a0a0a`. Nested surfaces, panels, and cards use `#0d0d0d` to create subtle depth without relying on heavy shadows.
- **Accents:** Emerald (`#10b981`) is the primary action color, signifying "execution" and "success." Indigo is reserved for secondary highlights or AI-specific features.
- **Borders:** A consistent `#1f1f23` (Zinc-900) border is used to define boundaries between panels, mimicking the pane-splitting logic of a terminal or IDE.
- **Typography:** High-contrast White (`#fafafa`) for primary headings and code; muted Zinc (`#a1a1aa`) for secondary labels and metadata.

## Typography
Typography is split between functional UI navigation and technical content consumption.

- **Inter** is the workhorse for the UI. It is set at a smaller-than-average base size (14px) to maximize data density.
- **JetBrains Mono** is utilized for all "output" data, including logs, code blocks, agent reasoning, and terminal prompts. 
- **Labels** (breadcrumbs, status tags) use uppercase Monospace at 11px to differentiate them from interactive text.
- **Scale:** Sizes are kept tight. Large "hero" typography is avoided in favor of utility and scanability.

## Layout & Spacing
The layout follows a **Fixed/Panel-based grid** typical of developer tools. 

- **The 4px Rule:** All margins and paddings must be multiples of 4px. 
- **Panel Separation:** Instead of large gutters, panels are separated by 1px borders or minimal gaps to maximize the "workspace" area.
- **Density:** Elements like list items and buttons use compact vertical padding (usually 6px or 8px) to allow more items to be visible on screen.
- **Adaptive Reflow:** On desktop, use a multi-pane layout (Sidebar | Explorer | Editor | Terminal). On mobile, panels stack into a vertical flow, but the primary focus remains the Mono-spaced output.

## Elevation & Depth
This design system avoids traditional shadows to maintain a flat, technical aesthetic. Depth is communicated through:

- **Tonal Layering:** The further "forward" an element is (e.g., a modal or dropdown), the lighter its background hex becomes. 
  - Level 0 (Base): `#0a0a0a`
  - Level 1 (Panels): `#0d0d0d`
  - Level 2 (Modals/Popovers): `#18181b`
- **Low-Contrast Outlines:** Use 1px solid borders (`#1f1f23`) for all containers. 
- **Active State Depth:** Active tabs or selected items use a subtle "inner-glow" or a left-side 2px accent border in the Primary color to denote focus without changing the element's height.

## Shapes
Shapes are crisp and geometric. 

- **Soft Radius:** A 4px (0.25rem) radius is applied to buttons, inputs, and cards. This provides a modern feel without leaning into the playfulness of fully rounded "pill" shapes.
- **Interactive States:** Hover states should not change the shape, only the background tint or border color.
- **Strict Square:** Terminal windows or code-blocks within the UI can optionally use 0px radius to emphasize their raw, functional nature.

## Components

- **Buttons:** 
  - *Primary:* Emerald background with white text. High-contrast.
  - *Secondary:* Ghost style. No background, Zinc-800 border. Transitions to a subtle Zinc-900 background on hover.
- **Inputs:** Darker than the surface background (`#050505`). Monospace font for data entry. 1px border that glows Emerald on focus.
- **Chips/Badges:** Small, Monospace text. Use low-opacity versions of status colors (e.g., 10% Emerald background with 100% Emerald text).
- **Cards/Panels:** No shadows. Defined strictly by 1px borders. Header sections of cards should have a slightly different background tint to separate title from content.
- **Lists:** High-density. 8px padding. Use a subtle background highlight on hover (`#18181b`).
- **Terminal Output:** Black background, JetBrains Mono font, syntax highlighting for code blocks using a refined palette (e.g., Sarah Drasner's Night Owl or similar low-strain themes).
- **AI-Specific:** Use a subtle Indigo gradient border or a "shimmer" effect for elements currently being generated or processed by the local agent.