---
version: alpha
name: Claude Humanist Editorial
description: A warm-canvas editorial interface for SuperAgent, inspired by Anthropic's
  Claude. The system anchors on a tinted cream canvas with serif display headlines,
  warm coral CTAs, and dark navy product surfaces for technical output.
colors:
  primary: '#cc785c'
  primary-active: '#a9583e'
  primary-disabled: '#e6dfd8'
  ink: '#141413'
  body: '#3d3d3a'
  body-strong: '#252523'
  muted: '#6c6a64'
  muted-soft: '#8e8b82'
  hairline: '#e6dfd8'
  hairline-soft: '#ebe6df'
  canvas: '#faf9f5'
  surface-soft: '#f5f0e8'
  surface-card: '#efe9de'
  surface-cream-strong: '#e8e0d2'
  surface-dark: '#181715'
  surface-dark-elevated: '#252320'
  surface-dark-soft: '#1f1e1b'
  on-primary: '#ffffff'
  on-dark: '#faf9f5'
  on-dark-soft: '#a09d96'
  surface: '#fff8f6'
  surface-dim: '#e6d7d3'
  surface-bright: '#fff8f6'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#fff1ed'
  surface-container: '#faebe6'
  surface-container-high: '#f4e5e1'
  surface-container-highest: '#efdfdb'
  on-surface: '#211a18'
  on-surface-variant: '#54433e'
  inverse-surface: '#372e2c'
  inverse-on-surface: '#fdede9'
  outline: '#87736d'
  outline-variant: '#dac1ba'
  surface-tint: '#924a31'
  primary-container: '#ad5f45'
  on-primary-container: '#fffbff'
  inverse-primary: '#ffb59d'
  secondary: '#605e5b'
  on-secondary: '#ffffff'
  secondary-container: '#e6e2de'
  on-secondary-container: '#666461'
  tertiary: '#00685f'
  on-tertiary: '#ffffff'
  tertiary-container: '#0f8378'
  on-tertiary-container: '#f4fffc'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffdbd0'
  primary-fixed-dim: '#ffb59d'
  on-primary-fixed: '#390c00'
  on-primary-fixed-variant: '#75331c'
  secondary-fixed: '#e6e2de'
  secondary-fixed-dim: '#cac6c2'
  on-secondary-fixed: '#1c1b19'
  on-secondary-fixed-variant: '#484644'
  tertiary-fixed: '#94f3e6'
  tertiary-fixed-dim: '#77d7ca'
  on-tertiary-fixed: '#00201d'
  on-tertiary-fixed-variant: '#005049'
  background: '#fff8f6'
  on-background: '#211a18'
  surface-variant: '#efdfdb'
typography:
  display-xl:
    fontFamily: Copernicus, Tiempos Headline, serif
    fontSize: 64px
    fontWeight: 400
    lineHeight: 1.05
    letterSpacing: -1.5px
  display-lg:
    fontFamily: Copernicus, Tiempos Headline, serif
    fontSize: 48px
    fontWeight: 400
    lineHeight: 1.1
    letterSpacing: -1px
  display-md:
    fontFamily: Copernicus, Tiempos Headline, serif
    fontSize: 36px
    fontWeight: 400
    lineHeight: 1.15
    letterSpacing: -0.5px
  display-sm:
    fontFamily: Copernicus, Tiempos Headline, serif
    fontSize: 28px
    fontWeight: 400
    lineHeight: 1.2
    letterSpacing: -0.3px
  title-lg:
    fontFamily: Inter, sans-serif
    fontSize: 22px
    fontWeight: 500
    lineHeight: 1.3
  title-md:
    fontFamily: Inter, sans-serif
    fontSize: 18px
    fontWeight: 500
    lineHeight: 1.4
  body-md:
    fontFamily: Inter, sans-serif
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.55
  code:
    fontFamily: JetBrains Mono, monospace
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.6
  body-sm:
    fontFamily: inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.5'
rounded:
  md: 8px
  lg: 12px
  pill: 9999px
  sm: 0.25rem
  DEFAULT: 0.5rem
  xl: 1.5rem
  full: 9999px
spacing:
  section: 96px
  xl: 32px
  lg: 24px
  md: 16px
  sm: 8px
  xs: 4px
components:
  chat-bubble-user:
    backgroundColor: '{colors.surface-card}'
    textColor: '{colors.ink}'
    padding: 16px 24px
    rounded: '{rounded.lg}'
  chat-bubble-assistant:
    backgroundColor: transparent
    textColor: '{colors.ink}'
    padding: 16px 0
  sidebar:
    backgroundColor: '{colors.surface-soft}'
    textColor: '{colors.ink}'
    borderColor: '{colors.hairline}'
  tool-card-dark:
    backgroundColor: '{colors.surface-dark}'
    textColor: '{colors.on-dark}'
    rounded: '{rounded.lg}'
    padding: 24px
  primary-button:
    backgroundColor: '{colors.primary}'
    textColor: '{colors.on-primary}'
    rounded: '{rounded.md}'
---

