import { parse } from '../../compiler/parser'
import { validate } from '../../compiler/validator'
import { generateDOM } from '../../compiler/backends/dom'
import { generateReact } from '../../compiler/backends/react'
import { generateFramework } from '../../compiler/backends/framework'

const cases = [
  // 9-Zone basic
  { id: '1', src: 'Frame tl\n  Text "x"' },
  { id: '2', src: 'Frame tc\n  Text "x"' },
  { id: '3', src: 'Frame tr\n  Text "x"' },
  { id: '4', src: 'Frame cl\n  Text "x"' },
  { id: '5', src: 'Frame center\n  Text "x"' },
  { id: '6', src: 'Frame cr\n  Text "x"' },
  { id: '7', src: 'Frame bl\n  Text "x"' },
  { id: '8', src: 'Frame bc\n  Text "x"' },
  { id: '9', src: 'Frame br\n  Text "x"' },
  // Long form
  { id: '10', src: 'Frame top-left\n  Text "x"' },
  { id: '11', src: 'Frame center-right\n  Text "x"' },
  // Combined with hor
  { id: '12', src: 'Frame hor, tl\n  Text "x"' },
  { id: '13', src: 'Frame hor, center\n  Text "x"' },
  { id: '14', src: 'Frame hor, cr\n  Text "x"' },
  // Combined with size
  { id: '15', src: 'Frame center, w 200, h 100\n  Text "x"' },
  // Conflicts
  { id: '16', src: 'Frame tl, br\n  Text "x"' },
  { id: '17', src: 'Frame center, spread\n  Text "x"' },
  // ver-center, hor-center
  { id: '18', src: 'Frame ver-center\n  Text "x"' },
  { id: '19', src: 'Frame hor-center\n  Text "x"' },
  { id: '20', src: 'Frame hor, ver-center\n  Text "x"' },
]

for (const { id, src } of cases) {
  const ast = parse(src)
  const v = validate(src)
  const errs = v.errors.map(e => `${e.code}`).join('|')
  const warns = (v.warnings ?? []).map(w => `${w.code}`).join('|')
  let dom = ''
  let react = ''
  let fw = ''
  try {
    dom = generateDOM(ast)
  } catch (e) {
    dom = `THROW:${(e as Error).message.slice(0, 40)}`
  }
  try {
    react = generateReact(ast)
  } catch (e) {
    react = `THROW:${(e as Error).message.slice(0, 40)}`
  }
  try {
    fw = generateFramework(ast)
  } catch (e) {
    fw = `THROW:${(e as Error).message.slice(0, 40)}`
  }

  // DOM: extract relevant alignment styles
  const domStyles =
    dom
      .match(
        /'(display|flex-direction|justify-content|align-items|align-self|position)':\s*'([^']+)'/g
      )
      ?.slice(0, 8) ?? []
  // React: extract style block
  const reactStyle = react.match(/style=\{\{[^}]+\}\}/)?.[0] ?? '(no style)'
  // Framework: get prop block
  const fwProps = fw.match(/M\(['"]Frame['"](?:,\s*\{([^}]*)\})?/)?.[1]?.trim() ?? '(no props)'

  console.log(
    `#${id} ${JSON.stringify(src.split('\n')[0]).padEnd(36)} V[errs=${errs || '—'} warns=${warns || '—'}]`
  )
  console.log(`   DOM: ${domStyles.join(' ')}`)
  console.log(`   RCT: ${reactStyle.slice(0, 200)}`)
  console.log(`   FW : ${fwProps.slice(0, 100)}`)
}
