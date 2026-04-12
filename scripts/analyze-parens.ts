import { parse } from '../compiler/parser';
import { generateDOM } from '../compiler/backends/dom';

const code = `
todos:
  task1:
    text: "Test"
    done: false

Frame gap 12
  Button "Add", add(todos, text: "New", done: false)
  each todo in $todos
    Frame hor
      Checkbox checked todo.done
      Text todo.text, editable
      Button "Delete", remove(todo)
`;
const ast = parse(code);
const output = generateDOM(ast);

// Count parens
const openParens = (output.match(/\(/g) || []).length;
const closeParens = (output.match(/\)/g) || []).length;
console.log('Open parens:', openParens);
console.log('Close parens:', closeParens);
console.log('Difference:', closeParens - openParens);

// Track balance through the file
const lines = output.split('\n');
let balance = 0;
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const opens = (line.match(/\(/g) || []).length;
  const closes = (line.match(/\)/g) || []).length;
  balance += opens - closes;

  // Show lines where balance goes negative (extra close paren)
  if (balance < 0) {
    console.log(`\nBalance went negative at line ${i + 1}:`);
    console.log(`  Line: ${line.trim().slice(0, 120)}`);
    console.log(`  Balance: ${balance}`);
    // Show context
    for (let j = Math.max(0, i - 3); j <= i; j++) {
      console.log(`  ${j + 1}: ${lines[j].slice(0, 120)}`);
    }
    break;
  }
}

if (balance >= 0 && closeParens > openParens) {
  console.log('\nBalance stayed positive but final count is off.');
  console.log('Looking for the extra close paren...');

  // Find lines with more closes than opens
  balance = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const opens = (line.match(/\(/g) || []).length;
    const closes = (line.match(/\)/g) || []).length;
    if (closes > opens + 1) {
      console.log(`\nLine ${i + 1} has ${closes - opens} more close than open:`);
      console.log(`  ${line.trim().slice(0, 120)}`);
    }
  }
}
