import { parse } from '../../compiler/parser'

const cases = [
  'Card: bg #1a1a1a',
  'PrimaryBtn as Button: bg #2271C1',
  'Btn: pad 10 20',
  'Box: gap 8',
  'Foo as Frame: bg red',
]
for (const code of cases) {
  const ast = parse(code)
  for (const c of ast.components) {
    console.log(JSON.stringify({ code, name: c.name, primitive: c.primitive, extends: c.extends }))
  }
}
