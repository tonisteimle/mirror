import { parse } from './src/parser/parser';

const code = `Dashboard col #0f0f14 pad 24 gap 24
  Content hor wrap gap 16
    Tile col #1a1a23 pad 20 rad 12 gap 8
      Value "2.7 Mio" #fff size 28 weight bold
      Label "Revenue" #888 size 12
    Tile
      Value "16"
      Label "Employees"
    Tile
      Value "40"
      Label "Customers"`;

const result = parse(code);

console.log('=== REGISTRY (Component Definitions) ===');
for (const [name, def] of result.registry.entries()) {
  console.log(`\n${name}:`);
  console.log('  properties:', JSON.stringify(def.properties));
  console.log('  children count:', def.children?.length || 0);
  if (def.children?.length) {
    console.log('  children:', def.children.map((c: any) => c.name + (c.content ? ` "${c.content}"` : '')));
  }
}

console.log('\n\n=== AST NODES (Content) ===');
function printNode(node: any, indent = 0) {
  const prefix = '  '.repeat(indent);
  console.log(`${prefix}${node.name}${node.content ? ` "${node.content}"` : ''}`);
  if (node.children?.length) {
    for (const child of node.children) {
      printNode(child, indent + 1);
    }
  }
}

for (const node of result.nodes) {
  printNode(node);
}
