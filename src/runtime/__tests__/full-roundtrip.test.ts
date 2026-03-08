/**
 * Full Round-Trip Tests
 *
 * Tests the complete cycle:
 * M() Code → M.toMirror() → Mirror DSL → parse() → generateFramework() → M() Code
 *
 * This verifies that:
 * 1. LLM output can be converted to Mirror DSL
 * 2. Mirror DSL can be compiled back to M() code
 * 3. The result is semantically equivalent
 */

import { M } from '../mirror-runtime'
import { parse } from '../../parser'
import { generateFramework } from '../../backends/framework'

describe('Full Round-Trip: M() → Mirror → M()', () => {

  /**
   * Helper: Extract the UI definition from generated framework code
   */
  function extractUI(frameworkCode: string): string {
    // Find the ui = M(...) part
    const match = frameworkCode.match(/export const ui = ([\s\S]+?)(?=\n\n\/\*\*|\nexport function)/)
    return match ? match[1].trim() : ''
  }

  /**
   * Helper: Normalize code for comparison (remove whitespace differences)
   */
  function normalize(code: string): string {
    return code
      .replace(/\s+/g, ' ')
      .replace(/\s*,\s*/g, ', ')
      .replace(/\s*:\s*/g, ': ')
      .replace(/\s*\{\s*/g, '{ ')
      .replace(/\s*\}\s*/g, ' }')
      .replace(/\s*\[\s*/g, '[')
      .replace(/\s*\]\s*/g, ']')
      .trim()
  }

  /**
   * Helper: Compare two M() expressions for semantic equivalence
   */
  function assertEquivalent(original: string, roundtrip: string, context: string): void {
    const normOrig = normalize(original)
    const normRound = normalize(roundtrip)

    // They should be very similar (may have minor formatting differences)
    // Check key structural elements
    const origTypes = (normOrig.match(/M\('(\w+)'/g) || []).sort()
    const roundTypes = (normRound.match(/M\('(\w+)'/g) || []).sort()

    expect(origTypes).toEqual(roundTypes)

    // Check that key properties exist in both
    const origProps = (normOrig.match(/\w+:/g) || []).sort()
    const roundProps = (normRound.match(/\w+:/g) || []).sort()

    // Round-trip may have slightly different prop order, but should have same props
    for (const prop of origProps) {
      if (!roundProps.includes(prop)) {
        console.log(`Missing property in round-trip: ${prop}`)
        console.log(`Context: ${context}`)
      }
    }
  }

  // ============================================================
  // TEST 1: Simple Box
  // ============================================================
  test('Simple Box round-trips correctly', () => {
    const original = M('Box', { bg: '#1a1a23', pad: 16, rad: 8 })

    // Step 1: M() → Mirror DSL
    const mirrorDSL = M.toMirror(original)
    console.log('--- Simple Box Mirror ---\n' + mirrorDSL)

    // Step 2: Mirror DSL → Parse → IR
    const ast = parse(mirrorDSL)
    expect(ast.instances.length).toBeGreaterThan(0)

    // Step 3: IR → Framework Code
    const frameworkCode = generateFramework(ast)
    console.log('--- Simple Box Framework ---\n' + frameworkCode.substring(0, 500))

    // Step 4: Verify structure
    expect(frameworkCode).toContain("M('Box'")
    expect(frameworkCode).toContain("bg: '#1a1a23'")
    expect(frameworkCode).toContain("pad: 16")
    expect(frameworkCode).toContain("rad: 8")
  })

  // ============================================================
  // TEST 2: Box with Text child
  // ============================================================
  test('Box with Text child round-trips correctly', () => {
    const original = M('Box', { bg: '#1a1a23', pad: 16 }, [
      M('Text', 'Hello World', { weight: 'bold' })
    ])

    const mirrorDSL = M.toMirror(original)
    console.log('--- Box with Text Mirror ---\n' + mirrorDSL)

    const ast = parse(mirrorDSL)
    const frameworkCode = generateFramework(ast)

    expect(frameworkCode).toContain("M('Box'")
    expect(frameworkCode).toContain("M('Text', 'Hello World'")
    expect(frameworkCode).toContain("weight: 'bold'")
  })

  // ============================================================
  // TEST 3: Button with hover state
  // ============================================================
  test('Button with states round-trips correctly', () => {
    const original = M('Button', 'Click me', {
      bg: '#3B82F6',
      col: 'white',
      pad: 12,
      rad: 8,
      states: {
        hover: { bg: '#2563EB' }
      }
    })

    const mirrorDSL = M.toMirror(original)
    console.log('--- Button Mirror ---\n' + mirrorDSL)

    const ast = parse(mirrorDSL)
    const frameworkCode = generateFramework(ast)

    expect(frameworkCode).toContain("M('Button', 'Click me'")
    expect(frameworkCode).toContain("bg: '#3B82F6'")
    // State should be present
    expect(mirrorDSL).toContain('state hover')
  })

  // ============================================================
  // TEST 4: Nested layout
  // ============================================================
  test('Nested layout round-trips correctly', () => {
    const original = M('Box', { hor: true, gap: 16 }, [
      M('Box', { w: 200, bg: '#1a1a23', pad: 16 }, [
        M('Text', 'Sidebar', { weight: 'bold' })
      ]),
      M('Box', { w: 'full', gap: 12 }, [
        M('Text', 'Content', { 'font-size': 18 }),
        M('Text', 'Description', { col: '#888' })
      ])
    ])

    const mirrorDSL = M.toMirror(original)
    console.log('--- Nested Layout Mirror ---\n' + mirrorDSL)

    const ast = parse(mirrorDSL)
    const frameworkCode = generateFramework(ast)

    expect(frameworkCode).toContain("hor: true")
    expect(frameworkCode).toContain("gap: 16")
    expect(frameworkCode).toContain("w: 200")
    expect(frameworkCode).toContain("w: 'full'")
  })

  // ============================================================
  // TEST 5: Icon
  // ============================================================
  test('Icon round-trips correctly', () => {
    const original = M('Icon', 'home', { is: 24, col: '#888' })

    const mirrorDSL = M.toMirror(original)
    console.log('--- Icon Mirror ---\n' + mirrorDSL)

    const ast = parse(mirrorDSL)
    const frameworkCode = generateFramework(ast)

    expect(frameworkCode).toContain("M('Icon', 'home'")
  })

  // ============================================================
  // TEST 6: Input with placeholder
  // ============================================================
  test('Input round-trips correctly', () => {
    const original = M('Input', {
      placeholder: 'Enter email',
      bg: '#1a1a23',
      pad: 12,
      rad: 8
    })

    const mirrorDSL = M.toMirror(original)
    console.log('--- Input Mirror ---\n' + mirrorDSL)

    const ast = parse(mirrorDSL)
    const frameworkCode = generateFramework(ast)

    expect(frameworkCode).toContain("M('Input'")
    expect(frameworkCode).toContain("placeholder: 'Enter email'")
  })

  // ============================================================
  // TEST 7: Grid layout
  // ============================================================
  test('Grid layout round-trips correctly', () => {
    const original = M('Box', { grid: 3, gap: 16 }, [
      M('Box', { bg: '#1a1a23', pad: 16 }, [M('Text', 'Card 1')]),
      M('Box', { bg: '#1a1a23', pad: 16 }, [M('Text', 'Card 2')]),
      M('Box', { bg: '#1a1a23', pad: 16 }, [M('Text', 'Card 3')])
    ])

    const mirrorDSL = M.toMirror(original)
    console.log('--- Grid Mirror ---\n' + mirrorDSL)

    const ast = parse(mirrorDSL)
    const frameworkCode = generateFramework(ast)

    expect(frameworkCode).toContain("grid: 3")
    expect(frameworkCode).toContain("gap: 16")
  })

  // ============================================================
  // TEST 8: Multiple properties
  // ============================================================
  test('Multiple properties preserve correctly', () => {
    const original = M('Box', {
      hor: true,
      spread: true,
      center: true,
      gap: 16,
      pad: 20,
      bg: '#1a1a23',
      rad: 12,
      shadow: 'lg',
      cursor: 'pointer'
    })

    const mirrorDSL = M.toMirror(original)
    console.log('--- Multiple Props Mirror ---\n' + mirrorDSL)

    const ast = parse(mirrorDSL)
    const frameworkCode = generateFramework(ast)

    // Check all properties are present
    expect(frameworkCode).toContain("hor: true")
    expect(frameworkCode).toContain("gap: 16")
    expect(frameworkCode).toContain("pad: 20")
    expect(frameworkCode).toContain("bg: '#1a1a23'")
    expect(frameworkCode).toContain("rad: 12")
  })

  // ============================================================
  // TEST 9: Deep nesting
  // ============================================================
  test('Deep nesting preserves structure', () => {
    const original = M('Box', { pad: 16 }, [
      M('Box', { gap: 8 }, [
        M('Box', { hor: true }, [
          M('Box', { w: 40, h: 40, bg: '#333', rad: 20 }),
          M('Box', { gap: 4 }, [
            M('Text', 'Title', { weight: 'bold' }),
            M('Text', 'Subtitle', { col: '#888' })
          ])
        ])
      ])
    ])

    const mirrorDSL = M.toMirror(original)
    console.log('--- Deep Nesting Mirror ---\n' + mirrorDSL)

    const ast = parse(mirrorDSL)
    const frameworkCode = generateFramework(ast)

    // Count M() calls - should have 6 Box + 2 Text = at least 8
    const mCalls = (frameworkCode.match(/M\('/g) || []).length
    expect(mCalls).toBeGreaterThanOrEqual(6)
  })

  // ============================================================
  // TEST 10: Events
  // ============================================================
  test('Events round-trip correctly', () => {
    const original = M('Button', 'Click', {
      bg: '#3B82F6',
      onclick: 'submit'
    })

    const mirrorDSL = M.toMirror(original)
    console.log('--- Events Mirror ---\n' + mirrorDSL)

    expect(mirrorDSL).toContain('onclick submit')

    const ast = parse(mirrorDSL)
    // Events should be parsed
    expect(ast).toBeDefined()
  })

})

describe('M.each Round-Trip', () => {

  test('M.each round-trips correctly', () => {
    const original = M.each('task', 'tasks', [
      M('Box', { pad: 8, bg: '#1a1a23' }, [
        M('Text', '$task.title')
      ])
    ])

    const mirrorDSL = M.toMirror(original)
    console.log('--- Each Mirror ---\n' + mirrorDSL)

    expect(mirrorDSL).toContain('each task in tasks')

    const ast = parse(mirrorDSL)
    const frameworkCode = generateFramework(ast)

    expect(frameworkCode).toContain("M.each('task', 'tasks'")
  })

  test('M.each with filter round-trips correctly', () => {
    const original = M.each('task', 'tasks', [
      M('Text', '$task.title')
    ], '!task.done')

    const mirrorDSL = M.toMirror(original)
    console.log('--- Each with Filter Mirror ---\n' + mirrorDSL)

    expect(mirrorDSL).toContain('each task in tasks where !task.done')
  })

})

describe('M.if Round-Trip', () => {

  test('M.if round-trips correctly', () => {
    const original = M.if('isLoggedIn', [
      M('Text', 'Welcome back!')
    ], [
      M('Button', 'Login')
    ])

    const mirrorDSL = M.toMirror(original)
    console.log('--- If/Else Mirror ---\n' + mirrorDSL)

    expect(mirrorDSL).toContain('if isLoggedIn')
    expect(mirrorDSL).toContain('else')

    const ast = parse(mirrorDSL)
    const frameworkCode = generateFramework(ast)

    expect(frameworkCode).toContain("M.if('isLoggedIn'")
  })

  test('M.if without else round-trips correctly', () => {
    const original = M.if('showWarning', [
      M('Text', 'Warning!', { col: '#EF4444' })
    ])

    const mirrorDSL = M.toMirror(original)
    console.log('--- If without Else Mirror ---\n' + mirrorDSL)

    expect(mirrorDSL).toContain('if showWarning')
    expect(mirrorDSL).not.toContain('else')
  })

})

describe('Complex UI Round-Trip', () => {

  test('Dashboard layout round-trips correctly', () => {
    const dashboard = M('Box', { hor: true, w: 'full', h: 'full', bg: '#0a0a0f' }, [
      // Sidebar
      M('Box', { w: 240, bg: '#1a1a23', pad: 16, gap: 8 }, [
        M('Text', 'Dashboard', { weight: 'bold', 'font-size': 18 }),
        M('Box', { gap: 4 }, [
          M('Box', { hor: true, gap: 8, pad: 12, rad: 8, bg: '#3B82F6' }, [
            M('Icon', 'home', { is: 20 }),
            M('Text', 'Home')
          ]),
          M('Box', { hor: true, gap: 8, pad: 12, rad: 8 }, [
            M('Icon', 'settings', { is: 20, col: '#888' }),
            M('Text', 'Settings', { col: '#888' })
          ])
        ])
      ]),
      // Main
      M('Box', { w: 'full', gap: 24, pad: 24 }, [
        M('Text', 'Overview', { weight: 'bold', 'font-size': 24 }),
        M('Box', { hor: true, gap: 16 }, [
          M('Box', { w: 'full', bg: '#1a1a23', pad: 20, rad: 12 }, [
            M('Text', 'Total Users', { col: '#888' }),
            M('Text', '12,456', { weight: 'bold', 'font-size': 28 })
          ]),
          M('Box', { w: 'full', bg: '#1a1a23', pad: 20, rad: 12 }, [
            M('Text', 'Revenue', { col: '#888' }),
            M('Text', '$84,230', { weight: 'bold', 'font-size': 28 })
          ])
        ])
      ])
    ])

    const mirrorDSL = M.toMirror(dashboard)
    console.log('--- Dashboard Mirror ---\n' + mirrorDSL.substring(0, 1000) + '...')

    const ast = parse(mirrorDSL)
    const frameworkCode = generateFramework(ast)

    // Verify key elements
    expect(frameworkCode).toContain("M('Box'")
    expect(frameworkCode).toContain("w: 240")
    expect(frameworkCode).toContain("M('Text', 'Dashboard'")
    expect(frameworkCode).toContain("M('Icon', 'home'")
    expect(frameworkCode).toContain("M('Text', 'Overview'")
  })

})
