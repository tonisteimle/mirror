import { parse } from '../../compiler/parser'

const src = `name: "Max"\n\nInput placeholder "Hi " + $name`
const ast = parse(src) as any
console.log(JSON.stringify(ast.instances[0], null, 2))
