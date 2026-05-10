import { parse } from '../../compiler/parser'
import { generateReact } from '../../compiler/backends/react'

// Probe various long-tail properties that may be dropped silently
const cases: [string, string][] = [
  ['flex-grow alias', `Frame grow, w 100`],
  ['order', `Frame order 2, w 100`],
  ['z stacking', `Frame z 99, abs, w 100, h 100`],
  ['white-space pre', `Text "Pre formatted", whitespace pre`],
  ['object-fit', `Image src "x", w 100, h 100, fit cover`],
  ['object-fit contain', `Image src "x", w 100, h 100, fit contain`],
  ['user-select none', `Text "Locked", select none`],
  ['pointer-events none', `Frame pointer none, w 100, h 100`],
  ['transition duration', `Btn: bg #333\n  hover 0.2s:\n    bg #555\n\nBtn "X"`],
  ['transform-origin', `Frame rotate 45, origin center, w 100`],
  ['outline', `Input outline 2, oc red, w 100`],
  ['gradient with hex stops', `Frame bg grad 90 #ff0000 0% #00ff00 50% #0000ff 100%, w 100, h 100`],
  ['text-shadow', `Text "Shadow", text-shadow 1`],
  ['box-shadow custom', `Frame shadow "0 4px 12px rgba(0,0,0,0.3)", w 100, h 50`],
  ['filter brightness', `Image src "x", filter "brightness(1.2)", w 100`],
]

for (const [label, src] of cases) {
  console.log('===', label, '===')
  try {
    const out = generateReact(parse(src))
    const lines = out.split('\n')
    const idx = lines.findIndex(l => l.trim().startsWith('<') && !l.includes('React'))
    console.log(
      lines
        .slice(idx, idx + 2)
        .map(l => '  ' + l.trim())
        .join('\n')
        .slice(0, 400)
    )
  } catch (e) {
    console.log('  ERROR:', (e as Error).message)
  }
}
