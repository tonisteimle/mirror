/**
 * Snapshot Tests: IR Output
 *
 * Tests for verifying IR transformation output.
 */

import { describe, it, expect } from 'vitest'
import { toIROnly } from '../../test-utils'

describe('IR Output Snapshots', () => {
  it('basic frame IR', () => {
    const ir = toIROnly(`
Box as frame:
  pad 16

Box
`)
    expect(ir.ir).toMatchSnapshot()
  })

  it('styled component IR', () => {
    const ir = toIROnly(`
Card as frame:
  pad 16, bg #1a1a23, rad 8, gap 12

Card
`)
    expect(ir.ir).toMatchSnapshot()
  })

  it('nested components IR', () => {
    const ir = toIROnly(`
Card as frame:
  pad 16

Title as text:

Card
  Title "Hello"
`)
    expect(ir.ir).toMatchSnapshot()
  })

  it('event handler IR', () => {
    const ir = toIROnly(`
Button as button:
  onclick show Modal

Modal as frame:
  hidden

Button "Click"
Modal
`)
    expect(ir.ir).toMatchSnapshot()
  })

  it('state IR', () => {
    const ir = toIROnly(`
Panel as frame:
  closed
  onclick toggle

Panel
`)
    expect(ir.ir).toMatchSnapshot()
  })
})
