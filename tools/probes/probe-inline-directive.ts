import { parse } from '../../compiler/parser'

const tests = [
  // Above-the-line form (legacy)
  { name: 'above-line', src: '@hidden\nFoo as Frame: bg #1a1a1a, pad 8' },
  // Inline form (new)
  { name: 'inline-hidden', src: 'Foo as Frame: bg #1a1a1a, pad 8, @hidden' },
  { name: 'inline-icon', src: 'Bar as Frame: bg #fff, pad 12, @icon home' },
  { name: 'inline-icon-group', src: 'Card as Frame: bg #fff, pad 12, @icon home, @group Forms' },
  // Mixed: above-line + inline
  { name: 'mixed', src: '@icon star\nBaz as Frame: bg #fff, @group Layout' },
]

for (const t of tests) {
  const ast = parse(t.src)
  const comp = ast.components[0]
  console.log(`[${t.name}]`, JSON.stringify(comp?.metadata ?? {}), 'errors:', ast.errors.length)
}
