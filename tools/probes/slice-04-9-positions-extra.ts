import { parse } from '../../compiler/parser'
import { validate } from '../../compiler/validator'
import { generateDOM } from '../../compiler/backends/dom'
import { generateReact } from '../../compiler/backends/react'
import { generateFramework } from '../../compiler/backends/framework'

const cases = [
  // align with values
  { id: '21', src: 'Frame align top left\n  Text "x"' },
  { id: '22', src: 'Frame align center\n  Text "x"' },
  // 9-zone with explicit hor (combines)
  { id: '23', src: 'Frame hor, bc\n  Text "x"' },
  // edge: stacked + 9-zone
  { id: '24', src: 'Frame stacked, center\n  Text "x"' },
  { id: '25', src: 'Frame stacked, tl\n  Text "x"' },
  // grid + center
  { id: '26', src: 'Frame grid 12, center\n  Text "x"' },
  // multi-positions
  { id: '27', src: 'Frame tl, tr\n  Text "x"' },
  { id: '28', src: 'Frame top, left\n  Text "x"' },
  // aliases
  { id: '29', src: 'Frame cen\n  Text "x"' },
  // nested
  { id: '30', src: 'Frame center\n  Frame tl\n    Text "x"' },
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

  const domStyles =
    dom
      .match(
        /'(display|flex-direction|justify-content|align-items|align-self|position)':\s*'([^']+)'/g
      )
      ?.slice(0, 8) ?? []
  const reactStyle = react.match(/style=\{\{[^}]+\}\}/)?.[0] ?? '(no style)'
  const fwProps = fw.match(/M\(['"]Frame['"](?:,\s*\{([^}]*)\})?/)?.[1]?.trim() ?? '(no props)'

  console.log(
    `#${id} ${JSON.stringify(src.split('\n')[0]).padEnd(40)} V[errs=${errs || '—'} warns=${warns || '—'}]`
  )
  console.log(`   DOM: ${domStyles.join(' ')}`)
  console.log(`   RCT: ${reactStyle.slice(0, 200)}`)
  console.log(`   FW : ${fwProps.slice(0, 100)}`)
}
