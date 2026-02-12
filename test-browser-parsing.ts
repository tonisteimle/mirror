import { parse } from './src/parser/parser'
import { propertiesToStyle, isContainerComponent } from './src/utils/style-converter'

// Exact code from documentation Example 5
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
const realErrors = result.errors.filter(e => e.indexOf('Warning:') !== 0)
console.log('Errors:', realErrors)
console.log('')

// Check the Tile template
const tileTemplate = result.registry.get('Tile')
console.log('Tile template:')
console.log('  properties:', JSON.stringify(tileTemplate?.properties))
console.log('')

// Check the first Tile instance in Dashboard
const dashboard = result.nodes[0]
if (dashboard && dashboard.children) {
  const firstTile = dashboard.children[0]
  console.log('First Tile instance:')
  console.log('  type:', firstTile?.type)
  console.log('  name:', firstTile?.name)
  console.log('  properties:', JSON.stringify(firstTile?.properties))
  console.log('  has col?', 'col' in (firstTile?.properties || {}))

  // Check the children of the Tile (Label and Value)
  if (firstTile?.children) {
    for (const child of firstTile.children) {
      console.log('  child:', child.type, JSON.stringify(child.properties))
    }
  }

  // Test style conversion for Tile
  console.log('')
  console.log('Style conversion test:')
  console.log('  isContainerComponent("Tile"):', isContainerComponent('Tile'))
  console.log('  isContainerComponent("component"):', isContainerComponent('component'))

  // Convert Tile properties to style
  const tileStyle = propertiesToStyle(firstTile?.properties || {}, true, 'Tile')
  console.log('  Tile style:', JSON.stringify(tileStyle, null, 2))
}
