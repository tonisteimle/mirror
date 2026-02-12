import { readFileSync } from 'fs';
import { tokenize } from './src/parser/lexer';
import { parse } from './src/parser/parser';

// Read examples from the extracted JSON
const jsonFile = process.argv[2] || '/tmp/exercises.json';
const examples = JSON.parse(readFileSync(jsonFile, 'utf8'));

console.log(`Validating ${examples.length} documentation examples...\n`);

let passed = 0;
let failed = 0;
const failures: { index: number; code: string; errors: string[] }[] = [];

for (const example of examples) {
  const { index, code } = example;

  // Tokenize
  const tokens = tokenize(code);
  const tokenErrors = tokens.filter(t => t.type === 'ERROR');

  // Parse
  const ast = parse(code);
  const parseErrors = ast.errors.filter(e => !e.startsWith('Warning:'));

  const allErrors = [
    ...tokenErrors.map(t => `Lexer error: ${t.value}`),
    ...parseErrors
  ];

  if (allErrors.length === 0) {
    passed++;
    console.log(`✓ Example ${index}`);
  } else {
    failed++;
    failures.push({ index, code, errors: allErrors });
    console.log(`✗ Example ${index}: ${allErrors.length} error(s)`);
  }
}

console.log(`\n${'='.repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);

if (failures.length > 0) {
  console.log(`\n${'='.repeat(50)}`);
  console.log('FAILURES:\n');
  for (const f of failures) {
    console.log(`Example ${f.index}:`);
    console.log('Code:');
    console.log(f.code.split('\n').map(l => '  ' + l).join('\n'));
    console.log('Errors:');
    for (const e of f.errors) {
      console.log(`  - ${e}`);
    }
    console.log('');
  }
}
