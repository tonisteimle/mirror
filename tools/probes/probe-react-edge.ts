import { parse } from '../../compiler/parser'
import { generateReact } from '../../compiler/backends/react'

const cases: [string, string][] = [
  // Inline ternary in style prop
  ['ternary in bg', `active: true\n\nFrame bg active ? red : blue, w 100`],
  // Nested ternary
  ['nested ternary', `count: 5\n\nText "$count", col count > 0 ? green : red`],
  // Ternary in icon color
  ['ternary in icon-color', `done: true\n\nIcon "check", ic done ? green : gray`],
  // Token pluck via dotted reference in content
  ['dotted in content', `user:\n  name: "Max"\n  email: "x@y"\n\nText "$user.name (\$user.email)"`],
  // Inline conditional Text content
  ['cond text', `done: false\n\nText done ? "Done" : "Pending", col white`],
  // grad with hex stops
  ['grad hex', `Frame bg grad 45 #ff0000 #00ff00, w 100, h 100`],
  // Image src
  ['image src', `Image src "photo.jpg", w 200`],
  // Link with href
  ['link', `Link "Home", href "/", col blue`],
  // Spacer
  ['spacer', `Frame\n  Text "A"\n  Spacer h 20\n  Text "B"`],
  // Divider
  ['divider', `Frame\n  Text "A"\n  Divider\n  Text "B"`],
  // Animation
  ['animation', `Frame anim pulse, w 50, h 50`],
  // Aspect ratio
  ['aspect', `Frame aspect square, w 100`],
  // Backdrop blur
  ['backdrop-blur', `Frame backdrop-blur 8, bg rgba(0,0,0,0.5), w 100`],
]

for (const [label, src] of cases) {
  console.log('===', label, '===')
  try {
    const out = generateReact(parse(src))
    // First non-import line in body
    const lines = out.split('\n')
    const idx = lines.findIndex(l => l.trim().startsWith('<') && !l.includes('React'))
    console.log(
      ' ',
      lines
        .slice(idx, idx + 4)
        .map(l => l.trim())
        .join(' | ')
        .slice(0, 320)
    )
  } catch (e) {
    console.log('  ERROR:', (e as Error).message)
  }
}
