import { parse } from '../compiler/parser'
const src = `FormField as Frame: gap 4, w full
  FieldLabel: col #fff, fs 13
  FieldInput as Input: bg #fff, pad 10
    focus:
      boc #fff

canvas mobile
FieldInput placeholder "Max"`
const ast = parse(src)
console.log(
  'components:',
  ast.components.map(c => ({ name: c.name, primitive: c.primitive }))
)
console.log('instances count:', ast.instances.length)
console.log(
  'first comp children:',
  ast.components[0]?.children.map(c => ({ type: c.type, name: 'name' in c ? c.name : '?' }))
)
