import { parse } from '../compiler/parser'
const src = `rowbase: hor, gap 8

TableRow: Frame $rowbase
  hover 0.1s: bg #fff
  Instrument: Frame w 180, gap 2
    Name: col #fff, fs 11, weight 500
    ISIN: font mono, fs 10, col #888
`
const ast = parse(src)
function dump(comp: any, depth = 0): void {
  const indent = '  '.repeat(depth)
  console.log(indent + 'comp:', comp.name || comp.component, 'line', comp.line)
  console.log(
    indent + '  props:',
    comp.properties?.map((p: any) => `${p.name}=${JSON.stringify(p.values)}`)
  )
  for (const c of comp.children ?? []) {
    if (c.type === 'Instance' || c.type === 'Component') dump(c, depth + 1)
  }
}
for (const c of ast.components) dump(c)
