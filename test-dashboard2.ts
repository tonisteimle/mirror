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

console.log('All nodes:')
for (const node of result.nodes) {
  console.log('Node:', node.type)
  console.log('  props:', JSON.stringify(node.properties))
  console.log('  children:', node.children?.length || 0)
  if (node.children) {
    for (const c of node.children) {
      console.log('    child:', c.type, JSON.stringify(c.properties))
    }
  }
}
