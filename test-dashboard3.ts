import { parse } from './src/parser/parser'

const code = `Tile: ver #3281d1 pad 20 rad 12 gap 8
  Label #fff size 12
  Value size 28 weight bold

Dashboard grid 3 gap 16
  Tile Label "Revenue" Value "2.7 Mio"
  Tile Label "Customers" Value "40"`

const result = parse(code)

const dashboard = result.nodes[0]
console.log('Dashboard children:')
for (const tile of dashboard.children || []) {
  console.log('Tile:', JSON.stringify(tile.properties))
  console.log('  children:', tile.children?.length || 0)
  if (tile.children) {
    for (const c of tile.children) {
      console.log('    -', c.type, JSON.stringify(c.properties))
      if (c.children) {
        for (const cc of c.children) {
          console.log('      text:', cc.type, JSON.stringify(cc.properties), cc.content)
        }
      }
    }
  }
}
