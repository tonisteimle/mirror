import { parse } from '../compiler/parser'
const src = `canvas mobile
Frame hor, gap 8
  StatusFilter: pad 8 16, hor, gap 6, exclusive()
    on:
      bg #2271C1
  StatusFilter on
    Text "x"
`
const ast = parse(src)
console.log('top instances:', ast.instances.length)
for (const inst of ast.instances) {
  if (inst.type === 'Instance') {
    console.log('--- instance:', inst.component, 'line', inst.line)
    console.log(
      '  props:',
      inst.properties.map(p => ({ name: p.name, values: p.values }))
    )
    for (const child of inst.children) {
      if (child.type === 'Instance') {
        console.log('  child:', child.component, 'line', child.line)
        console.log(
          '    child props:',
          child.properties.map(p => ({ name: p.name, values: p.values }))
        )
      }
    }
  }
}
console.log('errors:', ast.errors)
