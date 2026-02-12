import { parse } from './src/parser/parser'
import { composeStyles } from './src/generator/styles/style-composer'

const code = `Tile: ver #3281d1 pad 20 rad 12 gap 8
  Label #fff size 12
  Value size 28 weight bold

Dashboard grid 3 gap 16
  Tile Label "Revenue" Value "2.7 Mio"`

const result = parse(code)

// Check styles for each component
const tile = result.nodes[0].children![0]
console.log('Tile properties:', tile.properties)
console.log('Tile styles:', composeStyles(tile))

const label = tile.children![0]
console.log('\nLabel properties:', label.properties)
console.log('Label styles:', composeStyles(label))

const value = tile.children![1]  
console.log('\nValue properties:', value.properties)
console.log('Value styles:', composeStyles(value))
