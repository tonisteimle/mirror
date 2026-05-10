import { parse } from '../../compiler/parser'
import { generateFramework } from '../../compiler/backends/framework'

const cases: [string, string][] = [
  ['ternary in bg', `active: true\n\nFrame bg active ? red : blue, w 100`],
  ['ternary in icon-color', `done: true\n\nIcon "check", ic done ? green : gray`],
  ['cond text', `done: false\n\nText done ? "Done" : "Pending", col white`],
  ['grad hex', `Frame bg grad 45 #ff0000 #00ff00, w 100, h 100`],
  ['image src', `Image src "photo.jpg", w 200`],
  ['link', `Link "Home", href "/", col blue`],
  ['spacer', `Frame\n  Text "A"\n  Spacer h 20\n  Text "B"`],
  ['divider', `Frame\n  Text "A"\n  Divider\n  Text "B"`],
  ['animation', `Frame anim pulse, w 50, h 50`],
  ['aspect', `Frame aspect square, w 100`],
  ['backdrop-blur', `Frame backdrop-blur 8, bg rgba(0,0,0,0.5), w 100`],
  [
    'multi-state instance',
    `Btn: pad 10, toggle()\n  on:\n    bg blue\n  off:\n    bg gray\n\nBtn "X", on`,
  ],
]

for (const [label, src] of cases) {
  console.log('===', label, '===')
  try {
    const out = generateFramework(parse(src))
    // Show body lines starting with M(
    const lines = out.split('\n').filter(l => l.includes('M('))
    for (const l of lines.slice(0, 3)) {
      console.log(' ', l.trim().slice(0, 240))
    }
  } catch (e) {
    console.log('  ERROR:', (e as Error).message)
  }
}
