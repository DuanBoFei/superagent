---
name: Obsidian Command
colors:
  surface: '#131313'
  surface-dim: '#131313'
  surface-bright: '#393939'
  surface-container-lowest: '#0e0e0e'
  surface-container-low: '#1c1b1b'
  surface-container: '#201f1f'
  surface-container-high: '#2a2a2a'
  surface-container-highest: '#353534'
  on-surface: '#e5e2e1'
  on-surface-variant: '#bbcabf'
  inverse-surface: '#e5e2e1'
  inverse-on-surface: '#313030'
  outline: '#86948a'
  outline-variant: '#3c4a42'
  surface-tint: '#4edea3'
  primary: '#4edea3'
  on-primary: '#003824'
  primary-container: '#10b981'
  on-primary-container: '#00422b'
  inverse-primary: '#006c49'
  secondary: '#c6c6c7'
  on-secondary: '#2f3131'
  secondary-container: '#454747'
  on-secondary-container: '#b4b5b5'
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
  secondary-fixed: '#e2e2e2'
  secondary-fixed-dim: '#c6c6c7'
  on-secondary-fixed: '#1a1c1c'
  on-secondary-fixed-variant: '#454747'
  tertiary-fixed: '#ffdad7'
  tertiary-fixed-dim: '#ffb3af'
  on-tertiary-fixed: '#410005'
  on-tertiary-fixed-variant: '#842225'
  background: '#131313'
  on-background: '#e5e2e1'
  surface-variant: '#353534'
typography:
  headline-lg:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  code-md:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 20px
  code-sm:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 18px
  label-xs:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.02em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 4px
  container-padding: 16px
  gutter: 12px
  stack-tight: 4px
  stack-base: 8px
  stack-loose: 16px
---

## Brand & Style

The design system is built for a "Terminal-first" experience, prioritizing technical efficiency and high-density information display. It draws heavily from **Minimalism** and **Modern Corporate** aesthetics, stripped of all decorative flourishes to focus on utility and developer productivity. 

The personality is precise, authoritative, and low-friction. It evokes a sense of deep-system access, where the interface recedes to let the data and logic take center stage. This system is designed for power users who value speed, legibility, and a distraction-free environment.

## Colors

The palette is a high-contrast dark theme optimized for long-duration technical work. 

- **Canvas**: The primary background uses a deep black (`#0a0a0a`) to ensure maximum contrast with text and to minimize eye strain.
- **Surface**: Containers and panels utilize a dark gray (`#171717`) to create subtle visual hierarchy.
- **Accents**: Color is used with extreme restraint. Emerald Green (`#10b981`) is reserved exclusively for "Success," "Active," or "Connected" states.
- **Typography**: Primary content uses off-white (`#f5f5f5`) for clarity, while metadata and secondary labels use mid-gray (`#a3a3a3`) to reduce visual noise.

## Typography

This design system employs a dual-typeface strategy to distinguish between UI orchestration and technical data.

- **UI Interface (Inter)**: Used for navigation, headers, and modal text. It provides a modern, clean structure to the application shell.
- **Data & Code (JetBrains Mono)**: Used for all terminal output, logs, tool data, and code snippets. This monospace font is essential for maintaining alignment in tabular data and ensuring character-level legibility.

Keep font sizes compact to maintain high information density. Avoid using sizes above 20px even on desktop; hierarchy should be established through weight and color contrast rather than scale.

## Layout & Spacing

The layout follows a **Fixed Grid** philosophy with a focus on high density. 

- **Grid**: Use a 12-column grid for main application layouts, but rely on flexible flexbox/grid containers for utility panels.
- **Density**: Minimize whitespace. Padding and margins should be just enough to define boundaries, never "airy."
- **Breakpoints**: 
  - **Desktop (1280px+)**: Multi-pane view (Sidebar, Terminal, Inspect Panel).
  - **Tablet (768px - 1279px)**: Collapsible sidebar, focus on Terminal and Inspect Panel.
  - **Mobile (<767px)**: Single-pane focus. Terminal dominates the view.

## Elevation & Depth

Depth is conveyed through **Low-contrast outlines** rather than shadows. 

- **Borders**: Sections are separated by thin, 1px borders (`#262626`).
- **Layering**: Higher-level elements (like popovers or dropdowns) use the `#171717` background with a slightly brighter border (`#404040`) to suggest elevation.
- **Shadows**: Avoid soft, ambient shadows. If a shadow is required for a floating menu, use a sharp, 1px offset with high opacity to maintain the "brutalist" utility feel.

## Shapes

The shape language is strictly functional. 

- **Radius**: Use a maximum of `4px` (Soft) for buttons and containers. 
- **Interactive Elements**: Inputs and buttons should feel like tactile, physical "keys" or terminal blocks.
- **Icons**: Use 1px stroke-width monochrome icons. Do not use filled icons unless they represent an active/on state.

## Components

- **Buttons**: Primary buttons use a ghost style with a `#262626` border and white text. Only use the Emerald Green background for "Run" or "Confirm" actions.
- **Terminal Input**: A borderless input field preceded by a `>` or `$` prompt in Emerald Green. Use `JetBrains Mono` for all input text.
- **Cards/Panels**: Use a solid `#171717` background with a `#262626` border. No rounded corners greater than 4px.
- **Chips/Status**: Minimalist capsules with `label-xs` typography. Use a dark background and colored text (e.g., green text on a dark green tinted background).
- **Lists**: Dense rows with 1px bottom borders. Hover states use a warmer charcoal (`#222222`).
- **Scrollbars**: Minimalist, thin "trackless" scrollbars that only appear on hover, colored `#404040`.