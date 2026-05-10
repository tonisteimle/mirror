import { parse } from '../../compiler/parser'
import { validate } from '../../compiler/validator'
import { generateDOM } from '../../compiler/backends/dom'
import { generateReact } from '../../compiler/backends/react'
import { generateFramework } from '../../compiler/backends/framework'

const cases = [
  { id: '1', src: 'Frame hor\n  Text "A"\n  Text "B"' },
  { id: '2', src: 'Frame horizontal\n  Text "A"' }, // long form
  { id: '3', src: 'Frame hor, gap 8\n  Text "A"\n  Text "B"' },
  { id: '4', src: 'Frame hor, wrap, gap 8\n  Text "A"\n  Text "B"' },
  { id: '5', src: 'Frame wrap' }, // wrap without hor
  { id: '6', src: 'Frame hor, ver' }, // contradiction
  { id: '7', src: 'Frame ver, hor' }, // last-wins?
  { id: '8', src: 'Frame hor\n  Frame ver' }, // mixed nesting
  { id: '9', src: 'Frame hor, center\n  Text "A"' }, // hor + center
  { id: '10', src: 'Frame hor, spread\n  Text "L"\n  Text "R"' }, // hor + spread
  { id: '11', src: 'Frame hor, gap 0' },
  { id: '12', src: 'Frame hor, wrap' }, // wrap before children
  { id: '13', src: 'Btn: hor, gap 4\nBtn "X"' }, // hor on user component
  { id: '14', src: 'Frame hor true' }, // hor with weird arg
  { id: '15', src: 'Frame stacked, hor' }, // stacked + hor
]

for (const { id, src } of cases) {
  console.log(`\n=== Probe #${id} — ${JSON.stringify(src)} ===`)
  const ast = parse(src)
  const v = validate(src)
  const errs = v.errors.map(e => `${e.code} ${e.message.slice(0, 80)}`).join(' | ')
  const warns = (v.warnings ?? []).map(w => `${w.code} ${w.message.slice(0, 80)}`).join(' | ')
  console.log(`Validator: errs=[${errs || '—'}] warns=[${warns || '—'}]`)

  let dom = ''
  try {
    dom = generateDOM(ast)
  } catch (e) {
    console.log(`DOM THROW: ${(e as Error).message}`)
  }
  let react = ''
  try {
    react = generateReact(ast)
  } catch (e) {
    console.log(`React THROW: ${(e as Error).message}`)
  }
  let fw = ''
  try {
    fw = generateFramework(ast)
  } catch (e) {
    console.log(`Framework THROW: ${(e as Error).message}`)
  }

  // DOM markers
  const fdRow = dom.match(/['"]flex-direction['"]:\s*['"]row['"]/g)?.length ?? 0
  const fdCol = dom.match(/['"]flex-direction['"]:\s*['"]column['"]/g)?.length ?? 0
  const flexWrap = dom.match(/['"]flex-wrap['"]:\s*['"]wrap['"]/g)?.length ?? 0
  const align = dom.match(/['"]align-items['"]:\s*['"]([^'"]+)['"]/g)?.[0] ?? '—'
  console.log(`DOM: row=${fdRow} col=${fdCol} wrap=${flexWrap} ${align}`)

  // React
  const m = react.match(/return \(([\s\S]+)\)/)
  const reactJsx = (m?.[1] ?? '').trim()
  const rcRow = reactJsx.match(/flexDirection:\s*'row'/g)?.length ?? 0
  const rcCol = reactJsx.match(/flexDirection:\s*'column'/g)?.length ?? 0
  const rcWrap = reactJsx.match(/flexWrap:\s*'wrap'/g)?.length ?? 0
  console.log(`React: row=${rcRow} col=${rcCol} wrap=${rcWrap}`)

  // Framework
  const fwHor = fw.includes("'hor'") || fw.match(/hor:\s*true/)
  const fwWrap = fw.includes("'wrap'") || fw.match(/wrap:\s*true/)
  console.log(`Framework: hor=${!!fwHor} wrap=${!!fwWrap}`)
}
