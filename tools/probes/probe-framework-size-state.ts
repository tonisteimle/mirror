import { parse } from '../../compiler/parser'
import { generateFramework } from '../../compiler/backends/framework'

const SRC = `Frame bg #333
  compact:
    bg #ef4444
  wide:
    bg #10b981`

console.log('=== Framework Output ===')
console.log(generateFramework(parse(SRC)))
