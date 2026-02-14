/**
 * Mirror Code → Intent Format Converter Tests
 */

import { describe, it, expect } from 'vitest'
import { mirrorToIntent } from '../../intent/mirror-to-intent'

describe('mirrorToIntent', () => {
  it('extracts tokens', () => {
    const tokensCode = `
$primary: #3B82F6
$spacing-md: 16
$radius-md: 8
`
    const intent = mirrorToIntent('', '', tokensCode)

    expect(intent.tokens.colors?.primary).toBe('#3B82F6')
    expect(intent.tokens.spacing?.['spacing-md']).toBe(16)
    expect(intent.tokens.radii?.['radius-md']).toBe(8)
  })

  it('extracts simple component', () => {
    const componentsCode = `
Card: ver pad 16 bg #1E1E2E rad 8
`
    const intent = mirrorToIntent('', componentsCode)

    expect(intent.components.length).toBe(1)
    expect(intent.components[0].name).toBe('Card')
    expect(intent.components[0].style.direction).toBe('vertical')
    expect(intent.components[0].style.background).toBe('#1E1E2E')
    expect(intent.components[0].style.radius).toBe(8)
  })

  it('extracts component with states', () => {
    const componentsCode = `
Button: bg #3B82F6 pad 12
  state hover
    bg #2563EB
`
    const intent = mirrorToIntent('', componentsCode)

    expect(intent.components[0].name).toBe('Button')
    expect(intent.components[0].states?.hover).toBeDefined()
    expect(intent.components[0].states?.hover.background).toBe('#2563EB')
  })

  it('extracts simple layout', () => {
    const layoutCode = `
Box ver gap 16
  Text "Hello"
  Button "Click"
`
    const intent = mirrorToIntent(layoutCode)

    expect(intent.layout.length).toBe(1)
    expect(intent.layout[0].component).toBe('Box')
    expect(intent.layout[0].style?.direction).toBe('vertical')
    expect(intent.layout[0].style?.gap).toBe(16)
    expect(intent.layout[0].children?.length).toBe(2)
    expect(intent.layout[0].children?.[0].text).toBe('Hello')
    expect(intent.layout[0].children?.[1].text).toBe('Click')
  })

  it('extracts events', () => {
    const layoutCode = `
Button "Open"
  onclick open Dialog
`
    const intent = mirrorToIntent(layoutCode)

    expect(intent.layout[0].events?.onclick).toBeDefined()
    expect(intent.layout[0].events?.onclick[0].action).toBe('open')
    expect(intent.layout[0].events?.onclick[0].target).toBe('Dialog')
  })

  it('round-trips: Mirror → Intent → Mirror', async () => {
    // Import the reverse converter
    const { intentToMirror } = await import('../../intent/intent-to-mirror')

    const originalCode = `
Box ver gap 16 pad 24 bg #1E1E2E rad 8
  Text "Welcome"
  Button bg #3B82F6 "Click me"
`
    // Mirror → Intent
    const intent = mirrorToIntent(originalCode)

    // Intent → Mirror
    const generatedCode = intentToMirror(intent)

    // Parse both and compare structure
    expect(generatedCode).toContain('Box')
    expect(generatedCode).toContain('"Welcome"')
    expect(generatedCode).toContain('"Click me"')
    expect(generatedCode).toContain('ver')
    expect(generatedCode).toContain('gap 16')

    console.log('\n=== ROUND TRIP ===')
    console.log('Original:\n', originalCode)
    console.log('\nIntent:\n', JSON.stringify(intent, null, 2))
    console.log('\nGenerated:\n', generatedCode)
    console.log('==================\n')
  })

  it('extracts list items', () => {
    const layoutCode = `
Menu
  - Item "Profile"
  - Item "Settings"
  - Item "Logout"
`
    const intent = mirrorToIntent(layoutCode)

    expect(intent.layout[0].children?.length).toBe(3)
    expect(intent.layout[0].children?.[0].isListItem).toBe(true)
    expect(intent.layout[0].children?.[0].text).toBe('Profile')
    expect(intent.layout[0].children?.[1].isListItem).toBe(true)
    expect(intent.layout[0].children?.[2].isListItem).toBe(true)
  })

  it('extracts extended event actions', () => {
    const layoutCode = `
Button "Activate"
  onclick activate self
Item "Selectable"
  onclick select self
  onhover highlight self
`
    const intent = mirrorToIntent(layoutCode)

    expect(intent.layout[0].events?.onclick?.[0].action).toBe('activate')
    expect(intent.layout[0].events?.onclick?.[0].target).toBe('self')

    expect(intent.layout[1].events?.onclick?.[0].action).toBe('select')
    expect(intent.layout[1].events?.onhover?.[0].action).toBe('highlight')
  })

  it('extracts open action with target', () => {
    // Note: The parser currently only extracts target from open actions.
    // Position, animation, and duration extraction would need parser updates.
    const layoutCode = `
Button "Open"
  onclick open Dialog
`
    const intent = mirrorToIntent(layoutCode)

    const action = intent.layout[0].events?.onclick?.[0]
    expect(action?.action).toBe('open')
    expect(action?.target).toBe('Dialog')
  })
})
