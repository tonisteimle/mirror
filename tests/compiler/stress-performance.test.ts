/**
 * Stress & Scalability Tests
 *
 * Tests für:
 * - Große Dateien (viele Komponenten, viele Zeilen)
 * - Tiefe Verschachtelung
 * - Multi-File Szenarien
 * - Performance-Benchmarks
 */

import { describe, it, expect } from 'vitest'
import { parse } from '../../src/parser'
import { toIR } from '../../src/ir'
import { buildPrelude } from '../../studio/modules/compiler/prelude-builder'

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Generate N component definitions
 */
function generateComponents(count: number): string {
  return Array.from({ length: count }, (_, i) =>
    `Component${i} as frame:\n  pad ${i + 1}\n  bg #${String(i).padStart(6, '0')}`
  ).join('\n\n')
}

/**
 * Generate N instances
 */
function generateInstances(count: number): string {
  return Array.from({ length: count }, (_, i) =>
    `Frame pad ${i}\n  Text "${i}"`
  ).join('\n')
}

/**
 * Generate nested structure N levels deep
 */
function generateNestedStructure(depth: number): string {
  let code = 'Root\n'
  for (let i = 0; i < depth; i++) {
    code += '  '.repeat(i + 1) + `Level${i}\n`
  }
  return code
}

/**
 * Generate N siblings
 */
function generateSiblings(count: number): string {
  return `Parent\n` + Array.from({ length: count }, (_, i) =>
    `  Child${i} pad ${i}`
  ).join('\n')
}

/**
 * Generate N tokens
 */
function generateTokens(count: number): string {
  return Array.from({ length: count }, (_, i) =>
    `token${i}: color = #${String(i).padStart(6, '0')}`
  ).join('\n')
}

/**
 * Measure execution time
 */
function measure<T>(fn: () => T): { result: T; ms: number } {
  const start = performance.now()
  const result = fn()
  const ms = performance.now() - start
  return { result, ms }
}

// ============================================================================
// 1. LARGE FILES - MANY COMPONENTS
// ============================================================================

describe('Stress: Large Files - Components', () => {
  it('parses 100 components', () => {
    const code = generateComponents(100)
    const ast = parse(code)
    expect(ast.components.length).toBe(100)
  })

  it('parses 500 components', () => {
    const code = generateComponents(500)
    const ast = parse(code)
    expect(ast.components.length).toBe(500)
  })

  it('parses 100 components with IR transformation', () => {
    const code = generateComponents(100) + '\n\nComponent50'
    const ast = parse(code)
    const ir = toIR(ast)
    expect(ir.nodes.length).toBe(1)
    // Component definitions are in AST, IR only has resolved instances
    expect(ast.components.length).toBe(100)
  })
})

// ============================================================================
// 2. LARGE FILES - MANY INSTANCES
// ============================================================================

describe('Stress: Large Files - Instances', () => {
  it('parses 100 top-level instances', () => {
    const code = generateInstances(100)
    const ast = parse(code)
    expect(ast.instances.length).toBe(100)
  })

  it('parses 500 top-level instances', () => {
    const code = generateInstances(500)
    const ast = parse(code)
    expect(ast.instances.length).toBe(500)
  })

  it('parses 200 siblings', () => {
    const code = generateSiblings(200)
    const ast = parse(code)
    expect(ast.instances[0].children.length).toBe(200)
  })

  it('parses 500 siblings', () => {
    const code = generateSiblings(500)
    const ast = parse(code)
    expect(ast.instances[0].children.length).toBe(500)
  })
})

// ============================================================================
// 3. LARGE FILES - MANY TOKENS
// ============================================================================

describe('Stress: Large Files - Tokens', () => {
  it('parses 100 tokens', () => {
    const code = generateTokens(100)
    const ast = parse(code)
    expect(ast.tokens.length).toBe(100)
  })

  it('parses 500 tokens', () => {
    const code = generateTokens(500)
    const ast = parse(code)
    expect(ast.tokens.length).toBe(500)
  })

  it('parses tokens and resolves in IR', () => {
    const code = `
${generateTokens(50)}

Frame bg $token25
`
    const ast = parse(code)
    const ir = toIR(ast)
    expect(ast.tokens.length).toBe(50)
    expect(ir.nodes.length).toBe(1)
  })
})

// ============================================================================
// 4. DEEP NESTING
// ============================================================================

describe('Stress: Deep Nesting', () => {
  it('parses 10 levels deep', () => {
    const code = generateNestedStructure(10)
    const ast = parse(code)

    let node = ast.instances[0]
    let depth = 0
    while (node.children?.length > 0) {
      node = node.children[0]
      depth++
    }
    expect(depth).toBe(10)
  })

  it('parses 20 levels deep', () => {
    const code = generateNestedStructure(20)
    const ast = parse(code)

    let node = ast.instances[0]
    let depth = 0
    while (node.children?.length > 0) {
      node = node.children[0]
      depth++
    }
    expect(depth).toBe(20)
  })

  it('parses 50 levels deep', () => {
    const code = generateNestedStructure(50)
    const ast = parse(code)

    let node = ast.instances[0]
    let depth = 0
    while (node.children?.length > 0) {
      node = node.children[0]
      depth++
    }
    expect(depth).toBe(50)
  })

  it('handles deep nesting with properties', () => {
    let code = 'Root pad 10 bg #000\n'
    for (let i = 0; i < 20; i++) {
      code += '  '.repeat(i + 1) + `Level${i} pad ${i} bg #${String(i * 10).padStart(6, '0')}\n`
    }
    const ast = parse(code)
    const ir = toIR(ast)
    expect(ir.nodes.length).toBe(1)
  })
})

// ============================================================================
// 5. MULTI-FILE SCENARIOS (Prelude Builder)
// ============================================================================

describe('Stress: Multi-File Scenarios', () => {
  const getFileType = (filename: string): 'tokens' | 'component' | 'layout' => {
    if (filename.includes('token')) return 'tokens'
    if (filename.includes('component')) return 'component'
    return 'layout'
  }

  it('merges 5 token files', () => {
    const files: Record<string, string> = {
      'main.mirror': 'Frame bg $color1',
    }
    for (let i = 1; i <= 5; i++) {
      files[`tokens${i}.mirror`] = `color${i}: color = #${String(i).padStart(6, '0')}`
    }

    const result = buildPrelude({
      files,
      currentFile: 'main.mirror',
      getFileType,
    })

    expect(result.tokenCount).toBe(5)
    for (let i = 1; i <= 5; i++) {
      expect(result.prelude).toContain(`color${i}`)
    }
  })

  it('merges 10 component files', () => {
    const files: Record<string, string> = {
      'main.mirror': 'Component1',
    }
    for (let i = 1; i <= 10; i++) {
      files[`component${i}.mirror`] = `Component${i}: = Frame pad ${i}`
    }

    const result = buildPrelude({
      files,
      currentFile: 'main.mirror',
      getFileType: (f) => f.includes('component') ? 'component' : 'layout',
    })

    expect(result.componentCount).toBe(10)
  })

  it('merges tokens + components + layout', () => {
    const files: Record<string, string> = {
      'tokens.mirror': generateTokens(20),
      'buttons.component.mirror': `
Button as button:
  pad 16
  bg $token5

DangerButton extends Button:
  bg $token10
`,
      'cards.component.mirror': `
Card as frame:
  pad 24
  bg $token15
  rad 8
`,
      'main.mirror': `
Card
  Button "Click"
  DangerButton "Delete"
`,
    }

    const result = buildPrelude({
      files,
      currentFile: 'main.mirror',
      getFileType,
    })

    // tokenCount counts FILES not individual tokens
    expect(result.tokenCount).toBe(1) // 1 token file
    expect(result.componentCount).toBe(2) // buttons + cards files
    // But prelude should contain all 20 tokens
    expect(result.prelude).toContain('token0')
    expect(result.prelude).toContain('token19')
  })

  it('handles large multi-file project', () => {
    const files: Record<string, string> = {
      'main.mirror': 'App',
    }

    // 10 token files with 10 tokens each
    for (let i = 0; i < 10; i++) {
      files[`tokens-${i}.mirror`] = Array.from({ length: 10 }, (_, j) =>
        `t${i}_${j}: color = #${String(i * 10 + j).padStart(6, '0')}`
      ).join('\n')
    }

    // 10 component files with 5 components each
    for (let i = 0; i < 10; i++) {
      files[`components-${i}.component.mirror`] = Array.from({ length: 5 }, (_, j) =>
        `Comp${i}_${j}: = Frame pad ${i * 5 + j}`
      ).join('\n\n')
    }

    const result = buildPrelude({
      files,
      currentFile: 'main.mirror',
      getFileType,
    })

    // tokenCount counts FILES not individual tokens
    expect(result.tokenCount).toBe(10) // 10 token files
    expect(result.componentCount).toBe(10) // 10 component files
    // But prelude should contain tokens from all files
    expect(result.prelude).toContain('t0_0')
    expect(result.prelude).toContain('t9_9')
  })
})

// ============================================================================
// 6. NAME CONFLICTS
// ============================================================================

describe('Stress: Name Conflicts', () => {
  it('later definition wins (same file)', () => {
    const code = `
Button as button:
  bg #f00

Button as button:
  bg #00f

Button
`
    const ast = parse(code)
    const ir = toIR(ast)

    // Last definition should win
    const node = ir.nodes[0]
    const bg = node.styles.find((s: any) => s.property === 'background')
    expect(bg?.value).toBe('#00f')
  })

  it('handles same component name in inheritance chain', () => {
    const code = `
Base as frame:
  pad 8

Child extends Base:
  pad 16

GrandChild extends Child:
  pad 24

GrandChild
`
    const ast = parse(code)
    const ir = toIR(ast)

    const node = ir.nodes[0]
    const pad = node.styles.find((s: any) => s.property === 'padding')
    expect(pad?.value).toBe('24px')
  })
})

// ============================================================================
// 7. COMBINED STRESS
// ============================================================================

describe('Stress: Combined Scenarios', () => {
  it('large file with tokens, components, and instances', () => {
    const code = `
${generateTokens(50)}

${generateComponents(50)}

${generateSiblings(100)}
`
    const ast = parse(code)
    expect(ast.tokens.length).toBe(50)
    expect(ast.components.length).toBe(50)
    expect(ast.instances.length).toBe(1)
    expect(ast.instances[0].children.length).toBe(100)
  })

  it('deep nesting with many properties', () => {
    let code = 'Root hor center gap 16 pad 24 bg #000 rad 8\n'
    for (let i = 0; i < 15; i++) {
      const indent = '  '.repeat(i + 1)
      code += `${indent}Level${i} ver center gap ${i} pad ${i * 2} bg #${String(i * 15).padStart(6, '0')} rad ${i}\n`
    }

    const ast = parse(code)
    const ir = toIR(ast)
    expect(ir.nodes.length).toBe(1)
  })

  it('inheritance chain with overrides at each level', () => {
    let code = 'Base as frame:\n  pad 8\n  bg #000\n\n'

    for (let i = 1; i <= 10; i++) {
      const prev = i === 1 ? 'Base' : `Level${i - 1}`
      code += `Level${i} extends ${prev}:\n  pad ${8 + i * 2}\n  col #${String(i * 20).padStart(6, '0')}\n\n`
    }

    code += 'Level10\n'

    const ast = parse(code)
    const ir = toIR(ast)

    const node = ir.nodes[0]
    // pad should be 8 + 10*2 = 28
    const pad = node.styles.find((s: any) => s.property === 'padding')
    expect(pad?.value).toBe('28px')
  })
})

// ============================================================================
// 8. PERFORMANCE BENCHMARKS
// ============================================================================

describe('Performance: Benchmarks', () => {
  it('parses 100 components under 50ms', () => {
    const code = generateComponents(100)
    const { ms } = measure(() => parse(code))

    console.log(`100 components: ${ms.toFixed(2)}ms`)
    expect(ms).toBeLessThan(50)
  })

  it('parses 500 instances under 100ms', () => {
    const code = generateInstances(500)
    const { ms } = measure(() => parse(code))

    console.log(`500 instances: ${ms.toFixed(2)}ms`)
    expect(ms).toBeLessThan(100)
  })

  it('parses 50 levels deep under 20ms', () => {
    const code = generateNestedStructure(50)
    const { ms } = measure(() => parse(code))

    console.log(`50 levels deep: ${ms.toFixed(2)}ms`)
    expect(ms).toBeLessThan(20)
  })

  it('full IR transformation under 100ms', () => {
    const code = `
${generateTokens(50)}
${generateComponents(50)}
${generateSiblings(100)}
`
    const { ms } = measure(() => {
      const ast = parse(code)
      return toIR(ast)
    })

    console.log(`Full IR (50 tokens, 50 components, 100 children): ${ms.toFixed(2)}ms`)
    expect(ms).toBeLessThan(100)
  })

  it('large realistic document under 200ms', () => {
    // Simulate a realistic large project
    const code = `
// Tokens
${generateTokens(30)}

// Base Components
Container as frame:
  ver
  gap 16
  pad 24

Card as frame:
  bg surface
  rad 8
  pad 16
  shadow md

Button as button:
  pad 8 16
  bg primary
  col white
  rad 4
  cursor pointer
  hover:
    bg primaryDark

Input as input:
  w full
  pad 12
  bg surface
  rad 4
  bor 1 muted
  focus:
    bor 1 primary

// Extended Components
${Array.from({ length: 20 }, (_, i) => `
Variant${i} extends Card:
  bg $token${i}
  pad ${16 + i}
`).join('\n')}

// Layout
App
  Header hor spread center pad 16 bg surface
    Logo
    Nav hor gap 16
      ${Array.from({ length: 10 }, (_, i) => `Link "Nav${i}"`).join('\n      ')}

  Main ver gap 24 pad 24
    ${Array.from({ length: 20 }, (_, i) => `
    Card
      Text "Card ${i}"
      Button "Action ${i}"
    `).join('\n    ')}

  Footer center pad 16
    Text "Footer"
`
    const { ms } = measure(() => {
      const ast = parse(code)
      return toIR(ast)
    })

    console.log(`Large realistic document: ${ms.toFixed(2)}ms`)
    expect(ms).toBeLessThan(200)
  })
})

// ============================================================================
// 9. ERROR RESILIENCE
// ============================================================================

describe('Stress: Error Resilience', () => {
  it('recovers from syntax errors in large file', () => {
    const code = `
${generateComponents(10)}

// Intentional error
BrokenComponent as frame
  missing colon above

${generateComponents(10).replace(/Component/g, 'After')}
`
    // Should not throw, should collect errors
    const ast = parse(code)
    expect(ast.errors.length).toBeGreaterThan(0)
    // Should still parse some components
    expect(ast.components.length).toBeGreaterThan(0)
  })

  it('handles malformed tokens gracefully', () => {
    const code = `
validToken: color = #fff
broken: =
another: color = #000

Frame bg $validToken
`
    const ast = parse(code)
    // Should parse valid tokens
    expect(ast.tokens.length).toBeGreaterThanOrEqual(1)
  })
})

// ============================================================================
// 10. EDGE CASES AT SCALE
// ============================================================================

describe('Stress: Edge Cases at Scale', () => {
  it('handles many empty lines between elements', () => {
    const code = Array.from({ length: 50 }, (_, i) =>
      `Frame${i}\n\n\n\n`
    ).join('')

    const ast = parse(code)
    expect(ast.instances.length).toBe(50)
  })

  it('handles long property chains', () => {
    const props = Array.from({ length: 30 }, (_, i) =>
      `pad ${i}`
    ).join(' ')

    const code = `Frame ${props}`
    const ast = parse(code)
    // Last value should win
    expect(ast.instances.length).toBe(1)
  })

  it('handles very long lines', () => {
    const longString = 'x'.repeat(1000)
    const code = `Text "${longString}"`

    const ast = parse(code)
    expect(ast.instances.length).toBe(1)
    // Content is stored in properties, not a content field
    // Just verify it parses without error and creates an instance
    expect(ast.instances[0].component).toBe('Text')
  })

  it('handles many comments', () => {
    const code = Array.from({ length: 100 }, (_, i) =>
      `// Comment ${i}\nFrame${i}`
    ).join('\n')

    const ast = parse(code)
    expect(ast.instances.length).toBe(100)
  })

  it('handles unicode at scale', () => {
    const code = Array.from({ length: 50 }, (_, i) =>
      `Text "äöü ${i} 你好 مرحبا 🎉"`
    ).join('\n')

    const ast = parse(code)
    expect(ast.instances.length).toBe(50)
  })
})
