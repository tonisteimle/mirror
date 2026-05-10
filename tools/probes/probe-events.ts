import { parse } from '../../compiler/parser'

const cases = [
  `count: 0\n\nButton "Click", onclick toast("Hi")\nText "$count"`,
  `Button "X", onclick copy("Hi")`,
  `Frame onhover toast("X")\n  Text "X"`,
  `Input onkeydown(enter) toast("Y")`,
  `count: 0\n\nButton "X", onclick increment(count)`,
  `Button "X", onclick openUrl("https://x.com")`,
]

function walk(node: any, visit: (n: any) => void) {
  if (!node || typeof node !== 'object') return
  visit(node)
  const kids = node.children
  if (Array.isArray(kids)) for (const c of kids) walk(c, visit)
}

for (const src of cases) {
  console.log('---', src.replace(/\n/g, ' / '), '---')
  const ast = parse(src)
  console.log('top keys:', Object.keys(ast))
  console.log(JSON.stringify(ast, null, 2).slice(0, 1500))
  console.log('...')
}
