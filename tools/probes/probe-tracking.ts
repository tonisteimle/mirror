import { parse } from '../../compiler/parser'
import { toIR } from '../../compiler/ir'
import { generateReact } from '../../compiler/backends/react'
import { generateDOM } from '../../compiler/backends/dom'

const src = `Text "Spaced", tracking 0.05`
const ast = parse(src)
const ir = toIR(ast) as any
console.log('IR:', JSON.stringify(ir.nodes ?? [], null, 2).slice(0, 800))
console.log('\n--- DOM ---')
const dom = generateDOM(ast)
console.log(dom.match(/letter-spacing|tracking/g))
console.log('\n--- React ---')
const react = generateReact(ast)
console.log(react.match(/letterSpacing|tracking/g))
