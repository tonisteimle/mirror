/**
 * Simple parser test for the tutorial example
 */

import { describe, it, expect } from 'vitest'
import { parse } from '../parser/parser'

describe('Simple Parser Test', () => {
  it('parses inline conditionals with then/else', () => {
    const code = `$bg-app: #0A0A0F
$sidebarCollapsed: false

App hor full col $bg-app
  Sidebar if $sidebarCollapsed then w 64 else w 240 ver
    Logo w 32 h 32`

    const result = parse(code)

    console.log('=== ERRORS ===')
    console.log(result.errors)

    console.log('\n=== TOKENS ===')
    for (const [k, v] of result.tokens) {
      console.log(`  ${k}: ${JSON.stringify(v)}`)
    }

    console.log('\n=== APP NODE ===')
    const app = result.nodes[0]
    console.log(JSON.stringify(app, null, 2))

    // Check that there are no errors
    expect(result.errors.filter(e => !String(e).startsWith('Warning:'))).toHaveLength(0)

    // Check that App has Sidebar child
    expect(app.name).toBe('App')
    expect(app.children.length).toBeGreaterThan(0)

    const sidebar = app.children[0]
    expect(sidebar.name).toBe('Sidebar')

    // Check that Sidebar has conditionalProperties
    console.log('\n=== SIDEBAR conditionalProperties ===')
    console.log(JSON.stringify(sidebar.conditionalProperties, null, 2))
    expect(sidebar.conditionalProperties).toBeDefined()
    expect(sidebar.conditionalProperties!.length).toBe(1)
    expect(sidebar.conditionalProperties![0].thenProperties).toHaveProperty('w', 64)
    expect(sidebar.conditionalProperties![0].elseProperties).toHaveProperty('w', 240)
  })

  it('parses onclick on new line', () => {
    const code = `$count: 0

Button "Click me"
  onclick assign $count to $count + 1`

    const result = parse(code)

    console.log('=== ERRORS ===')
    console.log(result.errors)

    console.log('\n=== BUTTON ===')
    const button = result.nodes[0]
    console.log('eventHandlers:', JSON.stringify(button.eventHandlers, null, 2))

    expect(result.errors.filter(e => !String(e).startsWith('Warning:'))).toHaveLength(0)
    expect(button.eventHandlers).toBeDefined()
    expect(button.eventHandlers!.length).toBe(1)
    expect(button.eventHandlers![0].event).toBe('onclick')
  })

  it('parses onclick on same line', () => {
    const code = `$visible: false

Button col #FF0000 onclick assign $visible to true "Show"`

    const result = parse(code)

    console.log('=== ERRORS ===')
    console.log(result.errors)

    console.log('\n=== BUTTON ===')
    const button = result.nodes[0]
    console.log('properties:', JSON.stringify(button.properties, null, 2))
    console.log('eventHandlers:', JSON.stringify(button.eventHandlers, null, 2))

    // Check if onclick on same line works
    expect(result.errors.filter(e => !String(e).startsWith('Warning:'))).toHaveLength(0)
  })
})
