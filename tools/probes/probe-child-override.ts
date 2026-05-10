import { parse } from '../../compiler/parser'

const src = `Card: bg #fff
  Title: col black

Card
  Title:
    col red
    fs 24
  Text "Body"`

const ast = parse(src) as any
console.log(JSON.stringify(ast.instances[0], null, 2))
