/**
 * Snapshot Tests: Generated Code
 *
 * Tests for verifying generated JavaScript code structure.
 */

import { describe, it, expect } from 'vitest'
import { compile } from '../../test-utils'

describe('Generated Code Snapshots', () => {
  it('basic frame component', () => {
    const code = compile(`
Box as frame:
  pad 16

Box
`)
    expect(code).toMatchSnapshot()
  })

  it('card component with styling', () => {
    const code = compile(`
Card as frame:
  pad 16, bg #1a1a23, rad 8

Card "Hello"
`)
    expect(code).toMatchSnapshot()
  })

  it('button with hover state', () => {
    const code = compile(`
Button as button:
  bg #3B82F6
  hover:
    bg #2563EB

Button "Click"
`)
    expect(code).toMatchSnapshot()
  })

  it('nested components', () => {
    const code = compile(`
Card as frame:
  pad 16

Title as text:
  weight 600

Card
  Title "Hello"
`)
    expect(code).toMatchSnapshot()
  })

  it('component with event', () => {
    const code = compile(`
Toggle as frame:
  closed
  onclick toggle

Toggle
`)
    expect(code).toMatchSnapshot()
  })

  it('each loop', () => {
    const code = compile(`
Item as frame:
  pad 8

each $item in $items
  Item $item.name
`)
    expect(code).toMatchSnapshot()
  })

  it('conditional', () => {
    const code = compile(`
Panel as frame:

if (showPanel)
  Panel
`)
    expect(code).toMatchSnapshot()
  })

  it('tokens', () => {
    const code = compile(`
$primary: #3B82F6
$surface: #1a1a23

Card as frame:
  bg $surface

Card
`)
    expect(code).toMatchSnapshot()
  })
})
