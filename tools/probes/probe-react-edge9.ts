import { parse } from '../../compiler/parser'
import { generateReact } from '../../compiler/backends/react'
import { generateFramework } from '../../compiler/backends/framework'
import { generateDOM } from '../../compiler/backends/dom'

// Probe more obscure DSL surfaces
const cases: [string, string][] = [
  // Animation with custom duration
  ['anim with timing', `Frame anim slide-in 0.5s ease-out, w 100, h 100, bg red`],
  // Component with property-set token
  ['property-set in instance', `cardstyle: bg #1a1a1a, pad 16, rad 8\n\nFrame $cardstyle, w 200`],
  // Child override (named override of slot)
  [
    'child override',
    `Card: bg #fff\n  Title: col black\n\nCard\n  Title:\n    col red\n    fs 24\n  Text "Body"`,
  ],
  // Numeric token in size
  ['numeric size token', `gap-md: 16\n\nFrame gap $gap-md, hor\n  Text "A"\n  Text "B"`],
  // Token chain (token references token)
  ['token chain', `primary.bg: #2271C1\nbutton.bg: $primary\n\nFrame bg $button, w 100`],
  // Two-way binding
  ['textarea bind', `note: ""\n\nTextarea bind note, placeholder "Notes"`],
  // Form with onenter
  ['onenter input', `query: ""\n\nInput bind query, onenter toast("Searched: " + $query)`],
  // Components with hover-bg using token
  ['hover-bg token', `accent.bg: #2271C1\n\nButton "X", bg #333, hover-bg $accent`],
  // Image with alt
  ['image with alt', `Image src "logo.png", alt "Company logo", w 200, h 100`],
  // Direct grid-position
  [
    'grid-position',
    `Frame grid 12, gap 8\n  Frame x 1, y 1, w 12, h 2, bg blue\n  Frame x 1, y 3, w 6, h 4, bg red`,
  ],
]

for (const [label, src] of cases) {
  console.log('===', label, '===')
  try {
    const out = generateReact(parse(src))
    const lines = out.split('\n')
    const idx = lines.findIndex(l => l.trim().startsWith('<') && !l.includes('React'))
    console.log(
      '  React:',
      lines
        .slice(idx, idx + 3)
        .map(l => l.trim())
        .join(' | ')
        .slice(0, 320)
    )
  } catch (e) {
    console.log('  ERROR:', (e as Error).message)
  }
}
