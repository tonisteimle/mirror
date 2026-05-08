import { parse } from '../compiler/parser'
const src = `canvas mobile
Frame hor, gap 8
  StatusFilter: pad 8 16, exclusive()
    on:
      bg #2271C1
  StatusFilter on
  StatusFilter
`
const ast = parse(src)
console.log('Top-level components count:', ast.components.length)
console.log('Top-level instances count:', ast.instances.length)
for (const inst of ast.instances) {
  if (inst.type === 'Instance') {
    console.log('---instance:', inst.component, 'line', inst.line)
    for (const child of inst.children) {
      console.log(
        '  child type:',
        child.type,
        'comp:',
        'component' in child ? child.component : 'name' in child ? child.name : '?',
        'line',
        child.line
      )
    }
  }
}
console.log('errors:', ast.errors)
