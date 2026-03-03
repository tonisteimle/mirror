import { describe, it, expect } from 'vitest'
import { parse } from '../parser/parser'
// Import validator to trigger registration
import '../validator'

describe('Diagnostic Debug', () => {
  it('should create diagnostics for undefined tokens', () => {
    const code = `Box bg $undefinedToken`

    const result = parse(code, { validate: true })

    console.log('=== Parse Result ===')
    console.log('Errors:', result.errors)
    console.log('Diagnostics:', JSON.stringify(result.diagnostics, null, 2))
    console.log('Tokens defined:', Array.from(result.tokens.keys()))
    console.log('Node properties:', result.nodes[0]?.properties)

    // Check if diagnostics exist
    expect(result.diagnostics.length).toBeGreaterThan(0)
  })

  it('should have correct diagnostic structure', () => {
    const code = `
$definedToken: #FF0000

Box bg $undefinedToken
Box bg $definedToken
`

    const result = parse(code, { validate: true })

    console.log('=== With defined token ===')
    console.log('Diagnostics:', JSON.stringify(result.diagnostics, null, 2))
    console.log('Tokens:', Array.from(result.tokens.keys()))

    // Should have diagnostic for undefinedToken but not for definedToken
    const undefinedDiag = result.diagnostics.find(d =>
      d.message?.includes('undefinedToken')
    )

    console.log('Undefined diag:', undefinedDiag)

    expect(undefinedDiag).toBeDefined()
  })

  it('should have diagnostics in parseResult.diagnostics with proper location', () => {
    // Simulate what useCodeParsing does
    const tokensCode = '$myToken: #FF0000'
    const componentsCode = 'Button: pad 10'
    const layoutCode = 'Box bg $unknownToken'

    // Merge like useCodeParsing does
    const parts = []
    if (tokensCode.trim()) parts.push(tokensCode)
    if (componentsCode.trim()) parts.push(componentsCode)
    if (layoutCode.trim()) parts.push(layoutCode)
    const mergedCode = parts.join('\n\n')

    console.log('=== Merged Code ===')
    console.log(mergedCode)
    console.log('Lines:')
    mergedCode.split('\n').forEach((line, i) => console.log(`  ${i + 1}: ${line}`))

    const result = parse(mergedCode, { validate: true })

    console.log('=== Diagnostics from merged code ===')
    console.log(JSON.stringify(result.diagnostics, null, 2))

    // The unknownToken should be on line 5 (tokens=1, blank=2, components=1, blank=2, layout=1)
    // Actually: line 1 = tokens, line 2 = blank, line 3 = blank, line 4 = components, line 5 = blank, line 6 = blank, line 7 = layout
    // No wait: join('\n\n') means: tokens + \n\n + components + \n\n + layout
    // So: line 1 = tokens, line 2 = blank, line 3 = components, line 4 = blank, line 5 = layout

    expect(result.diagnostics.length).toBeGreaterThan(0)

    // Find the diagnostic for unknownToken
    const diag = result.diagnostics.find(d => d.message?.includes('unknownToken'))
    expect(diag).toBeDefined()

    console.log('=== Unknown token diagnostic ===')
    console.log('Line:', diag?.location?.line)
    console.log('Column:', diag?.location?.column)

    // Calculate expected line: tokens (1 line) + \n\n (adds 2 lines) + components (1 line) + \n\n (adds 2 lines) + layout starts at line 5
    // Wait no - \n\n is TWO newlines, so:
    // Line 1: $myToken: #FF0000
    // Line 2: (empty from first \n)
    // Line 3: Button: pad 10 (from second \n)
    // Line 4: (empty from first \n of second \n\n)
    // Line 5: Box bg $unknownToken (from second \n of second \n\n)
    expect(diag?.location?.line).toBe(5)
  })

  it('should correctly calculate section offsets', () => {
    // Test the offset calculation logic
    const tokensCode = '$myToken: #FF0000'  // 1 line
    const componentsCode = 'Button: pad 10'  // 1 line
    const layoutCode = 'Box bg $unknownToken'  // 1 line

    const countLines = (code: string) => code ? code.split('\n').length : 0
    const hasTokens = tokensCode.trim().length > 0
    const hasComponents = componentsCode.trim().length > 0

    // Calculate offsets using the same logic as useCodeParsing
    const tokensStart = 1
    const tokensEnd = hasTokens ? countLines(tokensCode) : 0

    const componentsStart = hasTokens ? tokensEnd + 2 : 1
    const componentsEnd = hasComponents
      ? componentsStart + countLines(componentsCode) - 1
      : componentsStart - 1

    const layoutStart = (hasTokens || hasComponents)
      ? (hasComponents ? componentsEnd + 2 : tokensEnd + 2)
      : 1

    console.log('=== Section Offsets ===')
    console.log('Tokens:', { start: tokensStart, end: tokensEnd })
    console.log('Components:', { start: componentsStart, end: componentsEnd })
    console.log('Layout:', { start: layoutStart, end: 'Infinity' })

    // Verify against expected values
    // Line 1: token, Line 2: blank, Line 3: component, Line 4: blank, Line 5: layout
    expect(tokensStart).toBe(1)
    expect(tokensEnd).toBe(1)
    expect(componentsStart).toBe(3)
    expect(componentsEnd).toBe(3)
    expect(layoutStart).toBe(5)

    // Now test the line adjustment
    const diagLine = 5  // Diagnostic is on line 5 in merged code
    const adjustedLine = diagLine - layoutStart + 1  // Should be 1
    console.log('Diagnostic on line 5, adjusted for layout tab:', adjustedLine)
    expect(adjustedLine).toBe(1)
  })
})
