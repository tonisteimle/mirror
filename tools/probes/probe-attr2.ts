import { parse } from '../../compiler/parser'
import { generateReact } from '../../compiler/backends/react'

const cases = [
  ['$name', `name: "Max"\n\nInput placeholder "Hi " + $name`],
  ['$id href', `id: "abc"\n\nLink "View", href "/items/" + $id`],
]

for (const [label, src] of cases) {
  console.log('===', label, '===')
  const out = generateReact(parse(src))
  const lines = out.split('\n').filter(l => l.includes('placeholder=') || l.includes('href='))
  for (const l of lines) console.log(' ', l.trim())
}
