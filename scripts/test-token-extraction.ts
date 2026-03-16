/**
 * Test Token Extraction from React Code
 */

import { convertReactToMirror, convertToMirrorCode } from '../src/converters/react-to-mirror'

const REACT_CODE = `
import React, { useState } from 'react'

const tokens = {
  '$primary': '#3B82F6',
  '$primary.hover': '#2563EB',
  '$col.text': '#FFFFFF',
  '$bg.surface': '#1A1A1A'
}

const Button = ({ children, style, ...props }) => {
  const [isHovered, setIsHovered] = useState(false)

  const dynamicStyle = {
    backgroundColor: tokens['$primary'],
    color: tokens['$col.text'],
    padding: '12px 24px',
    borderRadius: '8px',
    cursor: 'pointer',
    ...(isHovered ? { backgroundColor: tokens['$primary.hover'] } : {}),
    ...style
  }

  return (
    <button
      style={dynamicStyle}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      {...props}
    >
      {children}
    </button>
  )
}

export default function App() {
  return (
    <div style={{ padding: '20px', backgroundColor: tokens['$bg.surface'] }}>
      <Button>Click me</Button>
    </div>
  )
}
`

console.log('='.repeat(70))
console.log('TOKEN EXTRACTION TEST')
console.log('='.repeat(70))

const result = convertReactToMirror(REACT_CODE)

console.log('\n--- EXTRACTED TOKENS ---')
console.log('Token count:', result.tokens.size)
for (const [key, value] of result.tokens) {
  console.log(`  ${key}: ${value}`)
}

console.log('\n--- COMPONENTS ---')
for (const [name, node] of result.components) {
  console.log(`\n${name}:`)
  console.log('  Properties:', Object.fromEntries(node.properties))
  if (node.states?.length) {
    console.log('  States:', node.states.map(s => s.name))
    for (const state of node.states) {
      console.log(`    ${state.name}:`, Object.fromEntries(state.properties))
    }
  }
}

console.log('\n--- MIRROR OUTPUT ---')
console.log(convertToMirrorCode(REACT_CODE))
