/**
 * Snapshot Tests: CSS Output
 *
 * Tests for verifying CSS generation in generated code.
 */

import { describe, it, expect } from 'vitest'
import { compile } from '../../test-utils'

describe('CSS Output Snapshots', () => {
  it('hover styles', () => {
    const code = compile(`
Button as button:
  bg #3B82F6
  hover:
    bg #2563EB

Button "Hover"
`)
    // Extract the styles portion
    const styleMatch = code.match(/const styles = `([^`]*)`/)
    if (styleMatch) {
      expect(styleMatch[1]).toMatchSnapshot()
    }
    // Verify hover is in the code
    expect(code).toContain(':hover')
  })

  it('focus styles', () => {
    const code = compile(`
Input as input:
  bor 1 solid #333
  focus:
    bor 2 solid #3B82F6

Input
`)
    expect(code).toContain(':focus')
  })

  it('active styles', () => {
    const code = compile(`
Button as button:
  bg #3B82F6
  active:
    bg #1D4ED8

Button "Press"
`)
    expect(code).toContain(':active')
  })

  it('token CSS variables', () => {
    const code = compile(`
$primary: #3B82F6
$secondary: #22C55E

Button as button:
  bg $primary

Button "Click"
`)
    expect(code).toContain('--primary')
    expect(code).toContain('--secondary')
    expect(code).toContain('var(--primary)')
  })
})
