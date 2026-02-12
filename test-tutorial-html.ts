import { parse } from './src/parser/parser';
import { generateReactElement } from './src/generator/react-generator';
import { renderToStaticMarkup } from 'react-dom/server';

// Tutorial Step 3 - the dashboard with styling
const code = `Dashboard col #0f0f14 pad 24 gap 24
  Header hor fill
    Logo "Acme Inc" #fff size 20 weight bold
    Nav hor gap 16
      Link "Dashboard" #fff
      Link "Projects" #888
      Link "Team" #888
  Content hor wrap gap 16
    Tile col #1a1a23 pad 20 rad 12 gap 8
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

const result = parse(code);
const elements = generateReactElement(result.nodes, {
  tokens: result.tokens,
  registry: result.registry
});
const html = renderToStaticMarkup(elements as any);

console.log('=== CHECKING TILE CONTENT ===\n');

// Extract text content for each tile
const tileMatches = html.match(/<div[^>]*class="Tile"[^>]*>[\s\S]*?<\/div><\/div>/g);

if (tileMatches) {
  tileMatches.forEach((tile, i) => {
    const valueMatch = tile.match(/class="Value"[^>]*>[\s\S]*?<span>([^<]+)<\/span>/);
    const labelMatch = tile.match(/class="Label"[^>]*>[\s\S]*?<span>([^<]+)<\/span>/);

    const value = valueMatch ? valueMatch[1] : 'NOT FOUND';
    const label = labelMatch ? labelMatch[1] : 'NOT FOUND';

    console.log(`Tile ${i + 1}: Value="${value}", Label="${label}"`);
  });
}

// Also check for specific expected content
console.log('\n=== CONTENT VERIFICATION ===');
const expectedContent = [
  { value: '2.7 Mio', label: 'Revenue' },
  { value: '16', label: 'Employees' },
  { value: '40', label: 'Customers' },
  { value: '89%', label: 'Satisfaction' }
];

let allCorrect = true;
for (const expected of expectedContent) {
  const hasValue = html.includes(expected.value);
  const hasLabel = html.includes(expected.label);
  const status = hasValue && hasLabel ? '✓' : '✗';
  console.log(`${status} "${expected.value}" / "${expected.label}": value=${hasValue}, label=${hasLabel}`);
  if (!hasValue || !hasLabel) allCorrect = false;
}

// Check for duplicates (the bug was showing "2.7 Mio" multiple times)
const countOccurrences = (str: string, substr: string) => {
  return (str.match(new RegExp(substr, 'g')) || []).length;
};

console.log('\n=== DUPLICATE CHECK ===');
const count27 = countOccurrences(html, '2\\.7 Mio');
const countRevenue = countOccurrences(html, 'Revenue');
console.log(`"2.7 Mio" appears ${count27} time(s) - should be 1`);
console.log(`"Revenue" appears ${countRevenue} time(s) - should be 1`);

if (count27 === 1 && countRevenue === 1 && allCorrect) {
  console.log('\n✓✓✓ ALL CHECKS PASSED! Tutorial dashboard is correct. ✓✓✓');
} else {
  console.log('\n✗✗✗ SOME CHECKS FAILED! ✗✗✗');
}
