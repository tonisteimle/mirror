const { compile } = require('./dist/index.js');
const fs = require('fs');

const source = fs.readFileSync('test-validation.mirror', 'utf8');
const result = compile(source, { target: 'dom' });

console.log('=== COMPILATION RESULT ===');
console.log('Success:', !result.ast.errors || result.ast.errors.length === 0);

if (result.ast.errors && result.ast.errors.length > 0) {
  console.log('\n=== ERRORS ===');
  result.ast.errors.forEach(err => {
    console.log(`Line ${err.line}: ${err.message}`);
  });
}

if (result.warnings && result.warnings.length > 0) {
  console.log('\n=== WARNINGS ===');
  result.warnings.forEach(warn => {
    console.log(`Line ${warn.line}: ${warn.message}`);
  });
}
