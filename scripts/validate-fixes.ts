/**
 * Test script for the parser fixes
 */

import { parse } from '../src/parser/parser';

interface TestCase {
  name: string;
  code: string;
}

const tests: TestCase[] = [
  // 1. show/hide Actions
  {
    name: "show Action",
    code: `Button onclick show Tooltip "Info"`
  },
  {
    name: "hide Action",
    code: `Button onclick hide Tooltip "Hide"`
  },

  // 2. and/or in Block-Conditionals
  {
    name: "and in Block-Conditional",
    code: `$a: true
$b: true
Box
  if $a and $b
    Both`
  },
  {
    name: "or in Block-Conditional",
    code: `$a: true
$b: false
Box
  if $a or $b
    Either`
  },

  // 3. Verschachtelte if-Blöcke
  {
    name: "Nested if-blocks",
    code: `$user: true
$isAdmin: true
Box
  if $user
    if $isAdmin
      AdminPanel
    else
      UserPanel`
  },

  // 4. rad mit 4 Werten
  {
    name: "rad with 4 values",
    code: `Card rad 8 8 0 0`
  },

  // 5. pointer none
  {
    name: "pointer none",
    code: `Box pointer none`
  },

  // 6. step Property
  {
    name: "Slider with step",
    code: `Slider min 0 max 100 step 1`
  },

  // 7. Animation none
  {
    name: "Animation none",
    code: `Button onclick open Dialog none "Open"`
  },

  // 8. Bedingte Actions mit else
  {
    name: "Conditional Action with else",
    code: `$isLoggedIn: true
Button onclick if $isLoggedIn page Dashboard else open LoginDialog "Go"`
  },

  // Multiple Properties in inline-conditional
  {
    name: "Multiple properties in then/else",
    code: `$isSelected: true
Card if $isSelected then col #3B82F6 bor 2 else col #1A1A1A bor 0`
  },

  // and in inline-conditional
  {
    name: "and in inline-conditional",
    code: `$count: 5
$enabled: true
Button if $count > 0 and $enabled then opacity 1 else opacity 0.5`
  },
];

console.log('\n=== TESTING PARSER FIXES ===\n');

let passed = 0;
let failed = 0;

tests.forEach((test, i) => {
  try {
    const result = parse(test.code);
    const errors = (result.errors || []).filter((e: any) =>
      typeof e === 'string' ? !e.includes('Warning') : e.severity !== 'warning'
    );
    const warnings = (result.errors || []).filter((e: any) =>
      typeof e === 'string' ? e.includes('Warning') : e.severity === 'warning'
    );

    if (errors.length === 0 && warnings.length === 0) {
      console.log(`✓ #${i + 1}: ${test.name}`);
      passed++;
    } else {
      console.log(`✗ #${i + 1}: ${test.name}`);
      if (errors.length > 0) {
        console.log('  Errors:');
        errors.forEach((e: any) => console.log('    • ' + (typeof e === 'string' ? e : e.message)));
      }
      if (warnings.length > 0) {
        console.log('  Warnings:');
        warnings.forEach((e: any) => console.log('    • ' + (typeof e === 'string' ? e : e.message)));
      }
      failed++;
    }
  } catch (e) {
    console.log(`✗ #${i + 1}: ${test.name}`);
    console.log('  Exception:', (e as Error).message);
    failed++;
  }
});

console.log(`\n=== RESULT: ${passed}/${tests.length} passed ===\n`);
