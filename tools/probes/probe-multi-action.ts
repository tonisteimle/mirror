import { parse } from '../../compiler/parser'

const src = `Button "X", onclick toast("Hi"), copy("World")`
const ast = parse(src) as any
console.log(JSON.stringify(ast.instances[0].events, null, 2))
