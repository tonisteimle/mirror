import { parse, toIR, generateDOM, generateReact, generateFramework } from '../../compiler'

const src = `cols.grid: 12
Frame grid $cols
  Frame w 6, bg #1a1a1a`

console.log('=== AST ===')
const ast = parse(src)
console.log('Token:', JSON.stringify(ast.tokens, null, 2))
console.log('Frame grid prop values:', JSON.stringify(ast.instances[0]?.properties, null, 2))
console.log()
console.log('=== IR ===')
const ir = toIR(ast)
console.log(JSON.stringify(ir, null, 2).slice(0, 1500))
console.log()
console.log('=== DOM full ===')
console.log(generateDOM(ast))
