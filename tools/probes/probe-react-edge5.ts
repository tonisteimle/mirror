import { parse } from '../../compiler/parser'
import { generateReact } from '../../compiler/backends/react'

const cases: [string, string][] = [
  // Conditional inside each
  [
    'cond inside each',
    `tasks:\n  t1:\n    done: true\n    title: "A"\n  t2:\n    done: false\n    title: "B"\n\neach t in $tasks\n  if t.done\n    Text "$t.title (done)"\n  else\n    Text "$t.title (todo)"`,
  ],
  // Named instance + ref
  ['named instance', `Button name SubmitBtn, "Submit", bg blue\nText "Below"`],
  // Cross-element state ref
  [
    'cross-state',
    `Button name Toggle, "Open", toggle()\nFrame hidden\n  Toggle.on:\n    visible\n  Text "Menu"`,
  ],
  // Visible-when token
  ['visibleWhen', `loggedIn: false\n\nFrame visible-when loggedIn\n  Text "Protected"`],
  // Multiple Buttons with shadow
  ['multi shadow', `Button "A", shadow lg\nButton "B", shadow md\nButton "C", shadow sm`],
  // Mixed Frame and primitives
  ['mixed', `Header\n  Text "Header"\nMain\n  Text "Body"\nFooter\n  Text "Footer"`],
]

for (const [label, src] of cases) {
  console.log('===', label, '===')
  try {
    const out = generateReact(parse(src))
    const lines = out.split('\n')
    const idx = lines.findIndex(l => l.trim().startsWith('<') && !l.includes('React'))
    console.log(
      lines
        .slice(idx, idx + 6)
        .map(l => '  ' + l.trim())
        .join('\n')
        .slice(0, 800)
    )
  } catch (e) {
    console.log('  ERROR:', (e as Error).message)
  }
}
