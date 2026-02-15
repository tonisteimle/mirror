import { describe, it, expect } from 'vitest'
import { parse } from '../../parser/parser'

describe('Debug token parsing', () => {
  it('shows token format', () => {
    const dsl = `
$primary: #3B82F6
$spacing: 16

Box background $primary padding $spacing
`
    const result = parse(dsl)
    console.log('=== Tokens ===')
    for (const [key, value] of result.tokens) {
      console.log(`  ${key}: ${JSON.stringify(value)}`)
    }
    
    // Check with and without $
    console.log('')
    console.log('=== Token lookup ===')
    console.log('get($primary):', result.tokens.get('$primary'))
    console.log('get(primary):', result.tokens.get('primary'))
    
    expect(true).toBe(true)
  })
})
