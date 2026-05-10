import { parse } from '../../compiler/parser'

const src = `query: ""\n\nInput bind query, onenter toast("Searched: " + $query)`
const ast = parse(src) as any
console.log(JSON.stringify(ast.instances[0].events, null, 2))
