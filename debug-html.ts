import { parse } from './src/parser/parser';
import { generateReactElement } from './src/generator/react-generator';
import { renderToStaticMarkup } from 'react-dom/server';

// Tutorial Step 3 - FIXED version
const code = `Dashboard ver bg #0f0f14 pad 24 gap 24
  Header hor fill
    Logo "Acme Inc" #fff size 20 weight bold
    Nav hor gap 16
      Link "Dashboard" #fff
      Link "Projects" #888
      Link "Team" #888
  Content grid 2 gap 16
    Tile bg #1a1a23 pad 20 rad 12 gap 8
      Value "2.7 Mio" #fff size 28 weight bold
      Label "Revenue" #888 size 12
    Tile
      Value "16"
      Label "Employees"
    Tile
      Value "40"
      Label "Customers"
    Tile
      Value "89%"
      Label "Satisfaction"
  Footer
    Text "© 2025 Acme Inc" #888 size 12`;

console.log('=== INPUT CODE ===');
console.log(code);
console.log('\n');

const result = parse(code);

console.log('=== PARSE ERRORS ===');
console.log(result.errors);
console.log('\n');

const elements = generateReactElement(result.nodes, {
  tokens: result.tokens,
  registry: result.registry
});

const html = renderToStaticMarkup(elements as any);

console.log('=== GENERATED HTML (formatted) ===');
// Format the HTML for readability
const formatted = html
  .replace(/></g, '>\n<')
  .replace(/style="/g, '\n  style="');

console.log(formatted);
