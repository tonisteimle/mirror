import { parse } from '../../compiler/parser'
import { generateReact } from '../../compiler/backends/react'

const SRC = `Frame bg #333
  compact:
    bg #ef4444
  wide:
    bg #10b981`

const ast = parse(SRC)
console.log('=== AST instances[0] keys ===')
console.log(Object.keys(ast.instances![0]))
console.log('=== AST instances[0].states ===')
console.log(JSON.stringify((ast.instances![0] as { states?: unknown }).states, null, 2))
console.log('=== React Output ===')
console.log(generateReact(ast))
