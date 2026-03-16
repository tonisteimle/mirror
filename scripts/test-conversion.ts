/**
 * Manual conversion test
 */

import { reactToMirror } from '../src/__tests__/llm/react-to-mirror'
import { parse } from '../src/index'

// Test 1: Simple Button
console.log('='.repeat(60))
console.log('TEST 1: Simple Button')
console.log('='.repeat(60))

const react1 = `function Button() {
  return (
    <button style={{
      padding: '12px 24px',
      backgroundColor: '#3B82F6',
      color: 'white',
      borderRadius: '8px',
      border: 'none',
      cursor: 'pointer'
    }}>
      Click me
    </button>
  )
}`

console.log('\n--- React Input ---')
console.log(react1)

const result1 = reactToMirror(react1)
console.log('\n--- Mirror Output ---')
console.log(result1.mirror)

console.log('\n--- Errors ---')
console.log(result1.errors.length === 0 ? 'None' : result1.errors)

// Validate Mirror can be parsed
console.log('\n--- Parse Validation ---')
try {
  const ast = parse(result1.mirror)
  if (ast.errors.length > 0) {
    console.log('Parse errors:', ast.errors)
  } else {
    console.log('✅ Valid Mirror code')
  }
} catch (e) {
  console.log('❌ Parse failed:', e)
}

// Test 2: Nested elements
console.log('\n' + '='.repeat(60))
console.log('TEST 2: Card with nested elements')
console.log('='.repeat(60))

const react2 = `function Card() {
  return (
    <div style={{ padding: '16px', backgroundColor: '#1A1A23', borderRadius: '8px' }}>
      <h1 style={{ fontWeight: 'bold', color: 'white' }}>Title</h1>
      <p style={{ color: '#888' }}>Description text</p>
    </div>
  )
}`

console.log('\n--- React Input ---')
console.log(react2)

const result2 = reactToMirror(react2)
console.log('\n--- Mirror Output ---')
console.log(result2.mirror)

// Test 3: Horizontal layout
console.log('\n' + '='.repeat(60))
console.log('TEST 3: Horizontal flex layout')
console.log('='.repeat(60))

const react3 = `function Row() {
  return (
    <div style={{ display: 'flex', flexDirection: 'row', gap: '8px', alignItems: 'center' }}>
      <span>Item 1</span>
      <span>Item 2</span>
    </div>
  )
}`

console.log('\n--- React Input ---')
console.log(react3)

const result3 = reactToMirror(react3)
console.log('\n--- Mirror Output ---')
console.log(result3.mirror)

// Test 4: List with map
console.log('\n' + '='.repeat(60))
console.log('TEST 4: List structure')
console.log('='.repeat(60))

const react4 = `function TaskList() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div style={{ padding: '12px', backgroundColor: '#27272A', borderRadius: '8px' }}>
        Buy groceries
      </div>
      <div style={{ padding: '12px', backgroundColor: '#27272A', borderRadius: '8px' }}>
        Walk the dog
      </div>
    </div>
  )
}`

console.log('\n--- React Input ---')
console.log(react4)

const result4 = reactToMirror(react4)
console.log('\n--- Mirror Output ---')
console.log(result4.mirror)

console.log('\n' + '='.repeat(60))
console.log('TESTS COMPLETE')
console.log('='.repeat(60))
