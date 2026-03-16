/**
 * Test React to Mirror Converter
 */

import { convertToMirrorCode } from '../src/converters/react-to-mirror'

// Test with real React code
const REACT_CODE = `
function TaskApp() {
  return (
    <div style={{ display: 'flex', height: '100vh', backgroundColor: '#0F0F12' }}>
      <nav style={{ width: '280px', backgroundColor: '#18181B', padding: '16px' }}>
        <h2 style={{ color: '#FAFAFA', fontSize: '18px', marginBottom: '16px' }}>Aufgaben</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ padding: '12px', backgroundColor: '#3B82F6', borderRadius: '6px' }}>
            <span style={{ color: '#FFFFFF', fontWeight: '500' }}>API Integration</span>
            <span style={{ color: '#93C5FD', fontSize: '12px', display: 'block', marginTop: '4px' }}>Fällig: Heute</span>
          </div>
          <div style={{ padding: '12px', backgroundColor: '#27272A', borderRadius: '6px' }}>
            <span style={{ color: '#E4E4E7' }}>Design Review</span>
            <span style={{ color: '#71717A', fontSize: '12px', display: 'block', marginTop: '4px' }}>Fällig: Morgen</span>
          </div>
        </div>
      </nav>
      <main style={{ flex: 1, padding: '24px' }}>
        <h1 style={{ color: '#FAFAFA', fontSize: '24px' }}>API Integration</h1>
        <p style={{ color: '#A1A1AA', marginTop: '8px' }}>REST-API Anbindung für Dashboard</p>
        <div style={{ marginTop: '24px' }}>
          <h3 style={{ color: '#E4E4E7', fontSize: '14px' }}>Teilaufgaben</h3>
          <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ color: '#71717A' }}>✓ Endpunkte dokumentieren</span>
            <span style={{ color: '#E4E4E7' }}>○ Fehlerbehandlung</span>
          </div>
        </div>
      </main>
    </div>
  )
}
`

console.log('=' .repeat(70))
console.log('React to Mirror Converter Test')
console.log('=' .repeat(70))

console.log('\n--- INPUT (React) ---')
console.log(REACT_CODE.slice(0, 500) + '...')

console.log('\n--- OUTPUT (Mirror) ---')
const mirrorCode = convertToMirrorCode(REACT_CODE)
console.log(mirrorCode)

// Test with arrow function
const ARROW_CODE = `
const Card = () => (
  <div style={{ padding: '16px', backgroundColor: '#1a1a1a', borderRadius: '8px' }}>
    <h3 style={{ color: 'white', fontSize: '18px' }}>Card Title</h3>
    <p style={{ color: '#888' }}>Card description</p>
  </div>
)
`

console.log('\n' + '=' .repeat(70))
console.log('Arrow Function Component')
console.log('=' .repeat(70))

console.log('\n--- INPUT ---')
console.log(ARROW_CODE)

console.log('\n--- OUTPUT ---')
console.log(convertToMirrorCode(ARROW_CODE))
