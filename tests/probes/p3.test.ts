import { describe, it } from 'vitest'
import { parse } from '../../compiler/parser'
import { generateDOM } from '../../compiler/backends/dom'
describe('p', () => {
  it('repro umlaut in conditional', () => {
    const src = `addresses:
  a:
    category: "Geschäftlich"

each address in $addresses
  Frame bg address.category === "Geschäftlich" ? #dbeafe : #fef3c7`
    const code = generateDOM(parse(src))
    const lines = code
      .split('\n')
      .filter(l => l.includes('Gesch') || l.includes('background'))
      .slice(0, 10)
    console.log('LINES:')
    lines.forEach(l => console.log('  ', l))
  })
})
