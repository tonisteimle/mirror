import { parse } from './src/parser/parser'

const code = `Tile: ver #3281d1 pad 20 rad 12 gap 8
  Label #fff size 12
  Value size 28 weight bold

Dashboard grid 3 gap 16
  Tile Label "Revenue" Value "2.7 Mio"`

const result = parse(code)

function printNode(node: any, indent = 0) {
  const prefix = '  '.repeat(indent)
  console.log(prefix + node.type, JSON.stringify(node.properties || {}))
  if (node.content) console.log(prefix + '  content:', node.content)
  if (node.slots) {
    console.log(prefix + '  slots:', Object.keys(node.slots))
    for (const [slotName, slotContent] of Object.entries(node.slots)) {
      console.log(prefix + '    slot', slotName + ':')
      if (Array.isArray(slotContent)) {
        for (const s of slotContent) {
          printNode(s, indent + 3)
        }
      }
    }
  }
  for (const child of node.children || []) {
    printNode(child, indent + 1)
  }
}

console.log('Parsed structure:')
for (const node of result.nodes) {
  printNode(node)
}
