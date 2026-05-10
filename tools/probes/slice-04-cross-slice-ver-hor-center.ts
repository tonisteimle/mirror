import { parse } from '../../compiler/parser'
import { generateDOM } from '../../compiler/backends/dom'
import { generateReact } from '../../compiler/backends/react'
import { generateFramework } from '../../compiler/backends/framework'

const cases = [
  'Frame ver-center\n  Text "x"',
  'Frame hor-center\n  Text "x"',
  'Frame hor, ver-center\n  Text "x"',
  'Frame hor, hor-center\n  Text "x"',
]
for (const src of cases) {
  console.log(`\n--- ${src.split('\n')[0]} ---`)
  const dom = generateDOM(parse(src))
  const r = generateReact(parse(src))
  const fw = generateFramework(parse(src))
  console.log('DOM:', dom.match(/'(justify-content|align-items|flex-direction)':\s*'[^']+'/g))
  console.log('React:', r.match(/style=\{\{[^}]+\}\}/)?.[0])
  console.log('FW:', fw.match(/M\(['"]Frame['"](?:,\s*\{([^}]*)\})?/)?.[1]?.trim() ?? '(no props)')
}
