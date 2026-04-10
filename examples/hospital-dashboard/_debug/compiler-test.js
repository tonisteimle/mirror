/**
 * Teste den Compiler-Output direkt
 * Kein Browser nötig - vergleicht generierten JS-Code
 *
 * Ausführen mit: npx tsx examples/hospital-dashboard/compiler-test.js
 */
import { parse, toIR, generateDOM } from '../../compiler/index.ts';

const mirrorCode = `
Frame hor, ver-center, gap 12, pad 12, rad 8, bg #12121a, w full
  Frame w 40, h 40, rad 99, center, bg grad 135 #3b82f6 #8b5cf6
    Text "MW", col white, fs 14, weight 600
  Frame gap 0, grow
    Text "Dr. Maria Weber", col white, fs 13, weight 500
    Text "Oberärztin", col #55556a, fs 12
  Text "3 Patienten", col #f59e0b, fs 12, weight 500
`;

console.log('=== COMPILER OUTPUT TEST ===\n');

// 1. Parse zu AST
const ast = parse(mirrorCode);
console.log('1. PARSE → AST');
console.log('   Instances:', ast.instances?.length || 0);
console.log('   Tokens:', ast.tokens?.length || 0);
console.log('   Components:', ast.components?.length || 0);
console.log('   First instance:', ast.instances?.[0]?.name || 'none');

// 2. Transform zu IR
const ir = toIR(ast);
console.log('\n2. AST → IR');
console.log('   Root node type:', ir.root?.type || 'none');
if (ir.root?.styles) {
  console.log('   Root styles:', Object.keys(ir.root.styles).slice(0, 5).join(', ') + '...');
}

// 3. Generiere DOM-Code
const jsCode = generateDOM(ast);

// 4. Prüfe ob kritische Styles im generierten Code sind
console.log('\n3. IR → GENERATED CODE');
console.log('   Code length:', jsCode.length, 'chars');

console.log('\n=== STYLE CHECKS ===\n');

const checks = [
  { name: 'display: flex', pattern: /'display':\s*'flex'/ },
  { name: 'flex-direction: row', pattern: /'flex-direction':\s*'row'/ },
  { name: 'align-items: center', pattern: /'align-items':\s*'center'/ },
  { name: 'gap: 12px', pattern: /'gap':\s*'12px'/ },
  { name: 'padding: 12px', pattern: /'padding':\s*'12px'/ },
  { name: 'border-radius: 8px', pattern: /'border-radius':\s*'8px'/ },
  { name: 'background: #12121a', pattern: /#12121a|rgb\(18,\s*18,\s*26\)/ },
  { name: 'width: 100%', pattern: /'width':\s*'100%'/ },
  { name: 'flex-grow: 1', pattern: /'flex-grow':\s*'1'|'flex':\s*'1'/ },
];

let allPassed = true;
checks.forEach(check => {
  const found = check.pattern.test(jsCode);
  console.log(`${found ? '✅' : '❌'} ${check.name}`);
  if (!found) allPassed = false;
});

console.log(`\n${'='.repeat(40)}`);
console.log(`${allPassed ? '✅ ALL CHECKS PASSED' : '❌ SOME CHECKS FAILED'}`);
console.log('='.repeat(40));

// Bei Fehler: zeige relevanten Code-Ausschnitt
if (!allPassed) {
  console.log('\n=== GENERATED CODE (first 2000 chars) ===\n');
  console.log(jsCode.slice(0, 2000));
}
