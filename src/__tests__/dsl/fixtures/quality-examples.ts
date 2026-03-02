/**
 * Beispielcode für LLM-Validator Tests
 * Kategorisiert nach Qualitätsdimension
 */

export interface QualityExample {
  name: string
  code: string
  expectedScore: {
    min: number
    max: number
  }
  description: string
}

// =============================================================================
// KORREKTHEIT
// =============================================================================

export const correctnessExamples: QualityExample[] = [
  {
    name: 'Perfekte Syntax',
    code: `
Button padding 12, background #3B82F6, radius 8
  "Click me"
`,
    expectedScore: { min: 80, max: 100 },
    description: 'Alle Properties korrekt geschrieben (hardcoded aber korrekt)',
  },
  {
    name: 'Typo in Property',
    code: `
Button paddng 12, bg #333
`,
    expectedScore: { min: 0, max: 40 },
    description: 'paddng statt padding - Correctness 0%',
  },
  {
    name: 'Mehrere Typos',
    code: `
Button paddng 12, backgrund #333, colr #FFF
`,
    expectedScore: { min: 0, max: 30 },
    description: 'Mehrere fehlerhafte Properties',
  },
  {
    name: 'Ungültiger Event',
    code: `
Button onclck toggle
`,
    expectedScore: { min: 0, max: 40 },
    description: 'onclck statt onclick',
  },
]

// =============================================================================
// TOKEN USAGE
// =============================================================================

export const tokenUsageExamples: QualityExample[] = [
  {
    name: 'Nur Tokens',
    code: `
Button bg $primary.bg, col $on-primary.col, pad $md.pad, rad $md.rad
`,
    expectedScore: { min: 85, max: 100 },
    description: 'Alle Werte sind Tokens',
  },
  {
    name: 'Gemischt',
    code: `
Button bg $primary.bg, pad 12, rad 8
`,
    expectedScore: { min: 85, max: 100 },
    description: 'Mix aus Tokens und hardcoded - Correctness 100% dominiert',
  },
  {
    name: 'Nur Hardcoded',
    code: `
Button bg #3B82F6, col #FFF, pad 12, rad 8
`,
    expectedScore: { min: 75, max: 95 },
    description: 'Keine Tokens - aber Correctness 100%',
  },
]

// =============================================================================
// KONSISTENZ
// =============================================================================

export const consistencyExamples: QualityExample[] = [
  {
    name: 'Einheitliches Spacing',
    code: `
Card pad 16
  Header pad 8
  Body pad 8
  Footer pad 8
`,
    expectedScore: { min: 80, max: 100 },
    description: 'Wenige verschiedene Spacing-Werte',
  },
  {
    name: 'Chaotisches Spacing',
    code: `
Card pad 17
  Header pad 9
  Body pad 11
  Footer pad 13
  Sidebar pad 7
  Content pad 23
`,
    expectedScore: { min: 75, max: 95 },
    description: 'Viele verschiedene Werte - aber Correctness 100% dominiert',
  },
]

// =============================================================================
// COMPLETENESS (Hover/Focus)
// =============================================================================

export const completenessExamples: QualityExample[] = [
  {
    name: 'Button mit Hover',
    code: `
Button onclick toggle, pad 12, bg #333
  hover
    bg #555
`,
    expectedScore: { min: 75, max: 95 },
    description: 'Interaktives Element hat Hover',
  },
  {
    name: 'Button ohne Hover',
    code: `
Button onclick toggle, pad 12, bg #333
`,
    expectedScore: { min: 50, max: 75 },
    description: 'Interaktives Element ohne Hover',
  },
  {
    name: 'Nicht-interaktiv ohne Hover',
    code: `
Card pad 16, bg #333
  Text "Hello"
`,
    expectedScore: { min: 85, max: 100 },
    description: 'Kein onclick = kein Hover nötig',
  },
]

// =============================================================================
// WIEDERVERWENDUNG
// =============================================================================

export const reusabilityExamples: QualityExample[] = [
  {
    name: 'Komponente definiert und verwendet',
    code: `
PrimaryButton as Button: bg $primary.bg, pad 12, rad 8
  hover
    bg $primary.hover.bg

PrimaryButton "Save"
PrimaryButton "Submit"
PrimaryButton "Confirm"
`,
    expectedScore: { min: 80, max: 100 },
    description: 'Komponente wird mehrfach wiederverwendet',
  },
  {
    name: 'Keine Wiederverwendung',
    code: `
Button bg #3B82F6, pad 12, "Save"
Button bg #3B82F6, pad 12, "Submit"
Button bg #3B82F6, pad 12, "Confirm"
`,
    expectedScore: { min: 75, max: 95 },
    description: 'Gleicher Code wiederholt - aber Correctness 100%',
  },
]

// =============================================================================
// KOMBINIERTE BEISPIELE
// =============================================================================

export const combinedExamples: QualityExample[] = [
  {
    name: 'Perfekter Code',
    code: `
PrimaryButton as Button:
  padding $md.pad
  background $primary.bg
  color $on-primary.col
  radius $md.rad
  onclick toggle
  hover
    background $primary.hover.bg
  focus
    border 2 $focus.boc

Card:
  background $elevated.bg
  padding $lg.pad
  radius $lg.rad

Card
  Text "Welcome"
  PrimaryButton "Get Started"
  PrimaryButton "Learn More"
`,
    expectedScore: { min: 90, max: 100 },
    description: 'Tokens, Hover, Focus, Wiederverwendung',
  },
  {
    name: 'Akzeptabler Code',
    code: `
Card bg #333, pad 16, rad 8
  Text col #FFF, "Welcome"
  Button bg #3B82F6, pad 12, onclick toggle, "Click"
    hover
      bg #2563EB
`,
    expectedScore: { min: 65, max: 85 },
    description: 'Korrekt, aber hardcoded Werte',
  },
  {
    name: 'Schlechter Code',
    code: `
Card bg #333, pad 17
  Text col #FFF
  Button bg #3B82F6, pad 13, onclick toggle
  Button bg #2563EB, pad 11, onclick submit
  Button bg #22C55E, pad 15, onclick cancel
`,
    expectedScore: { min: 40, max: 65 },
    description: 'Hardcoded, inkonsistent, kein Hover',
  },
]

// Alle Beispiele exportieren
export const allExamples = [
  ...correctnessExamples,
  ...tokenUsageExamples,
  ...consistencyExamples,
  ...completenessExamples,
  ...reusabilityExamples,
  ...combinedExamples,
]
