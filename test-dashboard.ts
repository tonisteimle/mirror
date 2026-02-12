import { parse } from './src/parser/parser'

const code = `Tile: ver #3281d1 pad 20 rad 12 gap 8
  Label #fff size 12
  Value size 28 weight bold

Dashboard grid 3 gap 16
  Tile Label "Revenue" Value "2.7 Mio"
  Tile Label "Customers" Value "40"
  Tile Label "Growth" Value "+12%"
  Tile Label "Users" Value "1.2k"
  Tile Label "Orders" Value "89"
  Tile Label "Rating" Value "4.8"`

const result = parse(code)

console.log('Errors:', result.errors.filter(e => !e.startsWith('Warning:')))
console.log('')

// Check Tile template
const tileTemplate = result.registry.get('Tile')
console.log('Tile template:')
console.log('  props:', JSON.stringify(tileTemplate?.properties))
console.log('  children:', tileTemplate?.children.length)
if (tileTemplate?.children) {
  for (const child of tileTemplate.children) {
    console.log('    -', child.type, JSON.stringify(child.properties))
  }
}

// Check Label template
const labelTemplate = result.registry.get('Label')
console.log('')
console.log('Label template:')
console.log('  props:', JSON.stringify(labelTemplate?.properties))

// Check Value template
const valueTemplate = result.registry.get('Value')
console.log('')
console.log('Value template:')
console.log('  props:', JSON.stringify(valueTemplate?.properties))

// Check Dashboard node
const dashboard = result.nodes.find(n => n.type === 'Dashboard')
console.log('')
console.log('Dashboard:')
console.log('  props:', JSON.stringify(dashboard?.properties))
console.log('  children:', dashboard?.children?.length)
if (dashboard?.children) {
  for (const child of dashboard.children.slice(0, 2)) {
    console.log('    -', child.type, JSON.stringify(child.properties))
    if (child.children) {
      for (const cc of child.children) {
        console.log('      -', cc.type, JSON.stringify(cc.properties))
      }
    }
  }
}
