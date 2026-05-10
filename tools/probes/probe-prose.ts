import { parse } from '../../compiler/parser'
import { generateReact } from '../../compiler/backends/react'

const src = `Article as Frame: gap 18, prose

Article
  ## Section

  Bare paragraph text, **bold** and *italic* work.

  - Bullet item
  - Second bullet`

console.log('=== React ===')
console.log(generateReact(parse(src)))
