import { parse } from '../../compiler/parser'
import { generateReact } from '../../compiler/backends/react'

const cases: [string, string][] = [
  // RGBA with token
  ['rgba bg', `Frame bg rgba(0,0,0,0.5), w 100`],
  // Multi-shadow (CSS shorthand)
  ['multi-shadow', `Frame shadow lg, w 100, h 100, bg white`],
  // gap with two values
  ['gap-x-y', `Frame hor, gap 12 8, wrap\n  Text "A"\n  Text "B"`],
  // Tracking (letter-spacing)
  ['tracking', `Text "Spaced", tracking 0.05`],
  // Truncate
  ['truncate', `Text "Long text here", truncate, w 100`],
  // Children of Header
  ['header w children', `Header\n  H1 "Title"\n  Nav\n    Link "Home"\n    Link "About"`],
  // Z-index
  ['z-index', `Frame z 99, abs, x 0, y 0, w 100, bg red`],
  // Cursor
  ['cursor', `Frame cursor pointer, w 100, h 50, bg blue`],
  // line height / leading
  ['line', `Text "Multi\\nLine", line 1.5`],
  // Italic
  ['italic', `Text "Slanted", italic, fs 16`],
  // Transform: rotate + scale combined
  ['rotate+scale', `Frame rotate 45, scale 1.5, w 100, bg red`],
]

for (const [label, src] of cases) {
  console.log('===', label, '===')
  try {
    const out = generateReact(parse(src))
    const lines = out.split('\n')
    const idx = lines.findIndex(l => l.trim().startsWith('<') && !l.includes('React'))
    console.log(
      lines
        .slice(idx, idx + 3)
        .map(l => '  ' + l.trim())
        .join('\n')
        .slice(0, 500)
    )
  } catch (e) {
    console.log('  ERROR:', (e as Error).message)
  }
}
