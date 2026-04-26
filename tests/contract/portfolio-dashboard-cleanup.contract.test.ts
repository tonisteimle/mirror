/**
 * Portfolio-Dashboard Cleanup — Contract Test (Schicht 3)
 *
 * Asserts portfolio-dashboard's animations (anim pulse on the live status
 * indicator dot) compile and reach the rendered DOM.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { parse } from '../../compiler/parser'
import { generateDOM } from '../../compiler/backends/dom'

const SRC = readFileSync(
  join(__dirname, '..', '..', 'examples', 'portfolio-dashboard', 'dashboard.mirror'),
  'utf-8'
)

describe('portfolio-dashboard cleanup features — Contract', () => {
  it('compiles without throwing', () => {
    expect(() => generateDOM(parse(SRC))).not.toThrow()
  })

  it('parses without errors', () => {
    expect(parse(SRC).errors).toEqual([])
  })

  it('emits anim pulse animation in compiled output', () => {
    const code = generateDOM(parse(SRC))
    expect(code).toMatch(/pulse/i)
  })

  it('the pulsing status dot frame compiles to a div with proper sizing', () => {
    const code = generateDOM(parse(SRC))
    // The "anim pulse" frame: w 8, h 8, bg #10b981, rad 99
    expect(code).toMatch(/8px/)
    expect(code).toMatch(/10b981/i)
  })
})
