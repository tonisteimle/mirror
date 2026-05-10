import { parse } from '../../compiler/parser'

const src = `loggedIn: false\n\nFrame visible-when loggedIn\n  Text "Protected"`
const ast = parse(src) as any
console.log(JSON.stringify(ast.instances[0], null, 2))
