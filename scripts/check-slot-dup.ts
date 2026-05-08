import { parse } from '../compiler/parser'

const src = `Info: Frame gap 2
  Name: col $text-primary, fs 14, weight 600
  Type: col $text-muted, fs 12
`
const ast = parse(src)
console.log(JSON.stringify(ast.components, null, 2).slice(0, 2000))
