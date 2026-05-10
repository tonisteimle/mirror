/**
 * Probe: how does the parser interpret a nested `Name:` block?
 *
 * Per audit `docs/refactoring/21-komponenten.md` V-4, a nested `Inner:`
 * inside `Outer:` was claimed to be reinterpreted as an instance, with
 * the inner definition lost. This probe checks the actual current
 * behavior so we can decide what (if anything) needs to change.
 */

import { parse } from '../../compiler/parser/parser'

const cases = [
  {
    name: 'nested Name: with same-line property',
    src: `Outer:
  Inner: bg #f00
`,
  },
  {
    name: 'nested Name: with indented body',
    src: `Outer:
  Inner:
    bg #f00
`,
  },
  {
    name: 'nested Name: with same-line property AND indented body',
    src: `Outer:
  Inner: bg #f00
    rad 8
`,
  },
  {
    name: 'nested definition with `as` (recognized as ChildName as primitive:)',
    src: `Outer:
  Inner as Frame:
    bg #f00
`,
  },
  {
    name: 'nested definition with `extends`',
    src: `Outer:
  Inner extends Btn:
    bg #f00
`,
  },
]

for (const c of cases) {
  console.log(`\n[${c.name}]`)
  const ast = parse(c.src)
  console.log('errors:', JSON.stringify(ast.errors ?? [], null, 2))
  for (const comp of ast.components) {
    console.log(
      `  Component "${comp.name}" props=${comp.properties.length} children=${comp.children.length}`
    )
    if ('slots' in comp && comp.slots) {
      console.log(`    slots: ${Object.keys(comp.slots).join(', ')}`)
    }
    for (const child of comp.children) {
      console.log(`    child:`, JSON.stringify(child).slice(0, 200))
    }
  }
}
