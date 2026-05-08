import { parse } from '../compiler/parser'
const src = `canvas mobile
Text $foo.firstName[0] + $foo.lastName[0], col white
`
const ast = parse(src)
for (const inst of ast.instances) {
  if (inst.type === 'Instance') {
    console.log('comp:', inst.component, 'props:', JSON.stringify(inst.properties, null, 2))
  }
}
