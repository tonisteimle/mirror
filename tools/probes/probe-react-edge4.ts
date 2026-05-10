import { parse } from '../../compiler/parser'
import { generateReact } from '../../compiler/backends/react'

const cases: [string, string][] = [
  // Computed in style props
  ['computed in style', `count: 5\n\nFrame w count * 10, h 50, bg blue`],
  // Computed style with expr inside loop
  [
    'loop style',
    `projects:\n  p1:\n    progress: 50\n\neach p in $projects\n  Frame w $p.progress + "%", h 6, bg blue`,
  ],
  // Computed in HTML attribute
  ['computed attr', `name: "Max"\n\nInput placeholder "Hi " + name`],
  // String concat in href
  ['concat href', `id: "abc"\n\nLink "View", href "/items/" + id`],
  // Spacer with width
  ['spacer w', `Spacer w 20`],
  // Form structure
  [
    'form scaffold',
    `email: ""\nFrame gap 12\n  Label "Email"\n  Input bind email, type email\n  Button "Send"`,
  ],
  // Disabled button
  ['disabled', `Button "Click", disabled, bg gray`],
  // Checked
  ['checked', `Input type checkbox, checked`],
  // Placeholder in text
  ['placeholder text', `Input placeholder "Search...", w full`],
  // Type attribute on input
  ['type number', `Input type number, value 42`],
]

for (const [label, src] of cases) {
  console.log('===', label, '===')
  try {
    const out = generateReact(parse(src))
    const lines = out.split('\n')
    const idx = lines.findIndex(l => l.trim().startsWith('<') && !l.includes('React'))
    console.log(
      lines
        .slice(idx, idx + 4)
        .map(l => '  ' + l.trim())
        .join('\n')
        .slice(0, 700)
    )
  } catch (e) {
    console.log('  ERROR:', (e as Error).message)
  }
}
