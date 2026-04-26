/**
 * Portfolio-Advisor Charts — Contract Test (Schicht 3)
 *
 * Asserts the portfolio-advisor app's performance Line chart compiles with
 * the expected Chart.js setup (type: line, configured size, color, etc.).
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { parse } from '../../compiler/parser'
import { generateDOM } from '../../compiler/backends/dom'

const SRC = readFileSync(
  join(__dirname, '..', '..', 'examples', 'portfolio-advisor.mirror'),
  'utf-8'
)

describe('portfolio-advisor charts — Contract', () => {
  it('compiles without throwing', () => {
    expect(() => generateDOM(parse(SRC))).not.toThrow()
  })

  it('emits Line chart createChart call', () => {
    const code = generateDOM(parse(SRC))
    expect(code).toContain('_runtime.createChart')
  })

  it('emits at least one chart of type "line"', () => {
    const code = generateDOM(parse(SRC))
    expect(code).toMatch(/type:\s*'line'/)
  })

  it('the Line chart with #3b82f6 colors property is present', () => {
    const code = generateDOM(parse(SRC))
    expect(code.toLowerCase()).toMatch(/3b82f6/)
  })

  it('parses without errors', () => {
    const ast = parse(SRC)
    expect(ast.errors).toEqual([])
  })
})
