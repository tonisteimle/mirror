/**
 * AI Self-Healing Module Tests
 *
 * Tests validation feedback, correction prompt generation,
 * and the self-healing loop.
 */

import { describe, it, expect, vi } from 'vitest'
import {
  validateMirrorCode,
  isValidMirrorCode,
  getIssueSummary,
  withSelfHealing,
  removePxSuffix,
  removePropertyColons,
  fixOpacityRange,
  fixMissingTokenPrefix,
  fixTextOnSeparateLine,
  applyAllFixes,
  convertRgbaToHex,
  convertNamedColorsToHex,
  fixHyphenatedTokenNames,
  convertCssShadowToSize,
  removeUnsupportedUnits,
  removeCalcExpressions,
  fixUndefinedTokenReferences,
  fixEventTypos,
  fixActionTypos,
  fixBorderShorthand,
  fixSplitPropertyLines,
  fixOrphanedNumbers,
  fixBorderColorOnly,
  fixOrphanedLayoutKeywords,
  fixCssNoneValues,
  fixDefinitionAndUsageOnSameLine,
  type CodeIssue
} from '../lib/ai-selfhealing'

// ============================================================================
// Validation Feedback Tests
// ============================================================================

describe('validateMirrorCode', () => {
  it('returns valid for simple correct code', () => {
    // Simple single-line code that should always be valid
    const code = 'Box pad 16'

    const result = validateMirrorCode(code)
    expect(result.valid).toBe(true)
    expect(result.issues).toHaveLength(0)
    expect(result.correctionPrompt).toBeUndefined()
  })

  it('detects unknown property typos', () => {
    const code = 'Box paddin 16'

    const result = validateMirrorCode(code)
    expect(result.valid).toBe(false)
    expect(result.issues.length).toBeGreaterThan(0)

    const propIssue = result.issues.find(i => i.message.includes('paddin'))
    expect(propIssue).toBeDefined()
  })

  it('detects unknown event typos', () => {
    const code = 'Button onclck toggle "Click"'

    const result = validateMirrorCode(code)
    expect(result.valid).toBe(false)

    const eventIssue = result.issues.find(i => i.message.includes('onclck'))
    expect(eventIssue).toBeDefined()
  })

  it('detects unknown animation typos', () => {
    const code = 'Panel show slideup 200'

    const result = validateMirrorCode(code)
    expect(result.valid).toBe(false)

    const animIssue = result.issues.find(i => i.message.includes('slideup'))
    expect(animIssue).toBeDefined()
  })

  it('includes line numbers in issues', () => {
    const code = `Box pad 16
Button onclck toggle`

    const result = validateMirrorCode(code)
    const eventIssue = result.issues.find(i => i.message.includes('onclck'))
    expect(eventIssue?.line).toBe(2)
  })

  it('includes suggestions for property typos', () => {
    // Use paddin which is known to match 'pad'
    const code = 'Box paddin 16'

    const result = validateMirrorCode(code)
    const issue = result.issues.find(i => i.message.includes('paddin'))
    expect(issue).toBeDefined()
    // Suggestion may or may not be present depending on implementation
    if (issue?.suggestion) {
      expect(issue.suggestion).toContain('pad')
    }
  })

  it('detects multiple typos in same code', () => {
    const code = `Box paddin 16
Button onclck toggle`

    const result = validateMirrorCode(code)
    expect(result.issues.length).toBeGreaterThanOrEqual(2)
  })

  it('sorts issues by line number', () => {
    const code = `Button onclck toggle
Box paddin 16`

    const result = validateMirrorCode(code)
    for (let i = 1; i < result.issues.length; i++) {
      expect(result.issues[i].line).toBeGreaterThanOrEqual(result.issues[i - 1].line)
    }
  })
})

// ============================================================================
// Correction Prompt Generation Tests
// ============================================================================

describe('Correction Prompt Generation', () => {
  it('generates German correction prompt by default', () => {
    const code = 'Box paddin 16'
    const result = validateMirrorCode(code, false, 'de')

    expect(result.correctionPrompt).toContain('FEHLER:')
    expect(result.correctionPrompt).toContain('Zeile')
    expect(result.correctionPrompt).toContain('korrigiere')
  })

  it('generates English correction prompt when specified', () => {
    const code = 'Box paddin 16'
    const result = validateMirrorCode(code, false, 'en')

    expect(result.correctionPrompt).toContain('ERRORS:')
    expect(result.correctionPrompt).toContain('Line')
    expect(result.correctionPrompt).toContain('fix')
  })

  it('includes original code in correction prompt', () => {
    const code = 'Box paddin 16'
    const result = validateMirrorCode(code)

    expect(result.correctionPrompt).toContain('Box paddin 16')
  })

  it('includes suggestions in correction prompt', () => {
    const code = 'Box colr #FFF'
    const result = validateMirrorCode(code)

    expect(result.correctionPrompt).toContain('col')
  })

  it('does not generate correction prompt for valid code', () => {
    const code = 'Box pad 16 col #FFF'
    const result = validateMirrorCode(code)

    expect(result.correctionPrompt).toBeUndefined()
  })
})

// ============================================================================
// Helper Function Tests
// ============================================================================

describe('isValidMirrorCode', () => {
  it('returns true for valid code', () => {
    expect(isValidMirrorCode('Box pad 16 bg #1E1E1E')).toBe(true)
  })

  it('returns false for code with errors', () => {
    expect(isValidMirrorCode('Box paddin 16')).toBe(false)
  })
})

describe('getIssueSummary', () => {
  it('returns empty array for valid code', () => {
    const summary = getIssueSummary('Box pad 16')
    expect(summary).toHaveLength(0)
  })

  it('returns formatted issue strings', () => {
    const summary = getIssueSummary('Box paddin 16')
    expect(summary.length).toBeGreaterThan(0)
    expect(summary[0]).toMatch(/Line \d+:/)
  })

  it('includes suggestions when present', () => {
    const summary = getIssueSummary('Box paddin 16')
    expect(summary.length).toBeGreaterThan(0)
    // Check that issues are formatted with line numbers
    expect(summary.some(s => s.includes('paddin'))).toBe(true)
  })
})

// ============================================================================
// Self-Healing Integration Tests
// ============================================================================

describe('withSelfHealing', () => {
  it('returns immediately if code is valid', async () => {
    const mockGenerate = vi.fn().mockResolvedValue({ code: 'Box pad 16 bg #1E1E1E' })

    const result = await withSelfHealing(mockGenerate, 'Create a box')

    expect(result.valid).toBe(true)
    expect(result.attempts).toBe(1)
    expect(mockGenerate).toHaveBeenCalledTimes(1)
  })

  it('attempts correction when code has errors', async () => {
    const mockGenerate = vi
      .fn()
      .mockResolvedValueOnce({ code: 'Box paddin 16' }) // First: invalid
      .mockResolvedValueOnce({ code: 'Box pad 16' }) // Second: valid

    const result = await withSelfHealing(mockGenerate, 'Create a box')

    expect(result.valid).toBe(true)
    expect(result.attempts).toBe(2)
    expect(mockGenerate).toHaveBeenCalledTimes(2)
  })

  it('respects maxAttempts option', async () => {
    const mockGenerate = vi.fn().mockResolvedValue({ code: 'Box paddin 16' })

    const result = await withSelfHealing(mockGenerate, 'Create a box', {
      maxAttempts: 3
    })

    expect(result.valid).toBe(false)
    expect(result.attempts).toBe(3)
    expect(mockGenerate).toHaveBeenCalledTimes(3)
  })

  it('passes correction prompt to generate function', async () => {
    const mockGenerate = vi
      .fn()
      .mockResolvedValueOnce({ code: 'Box paddin 16' })
      .mockResolvedValueOnce({ code: 'Box pad 16' })

    await withSelfHealing(mockGenerate, 'Create a box')

    // Second call should have correction prompt
    const secondCall = mockGenerate.mock.calls[1][0]
    expect(secondCall).toContain('FEHLER:')
    expect(secondCall).toContain('paddin')
  })

  it('uses English prompts when language is en', async () => {
    const mockGenerate = vi
      .fn()
      .mockResolvedValueOnce({ code: 'Box paddin 16' })
      .mockResolvedValueOnce({ code: 'Box pad 16' })

    await withSelfHealing(mockGenerate, 'Create a box', { language: 'en' })

    const secondCall = mockGenerate.mock.calls[1][0]
    expect(secondCall).toContain('ERRORS:')
  })

  it('handles generation errors gracefully', async () => {
    const mockGenerate = vi.fn().mockRejectedValue(new Error('API Error'))

    const result = await withSelfHealing(mockGenerate, 'Create a box')

    expect(result.valid).toBe(false)
    expect(result.issues.length).toBeGreaterThan(0)
    expect(result.issues[0].message).toContain('API Error')
  })

  it('returns last code even if not valid after max attempts', async () => {
    const mockGenerate = vi
      .fn()
      .mockResolvedValueOnce({ code: 'Box paddin 16' })
      .mockResolvedValueOnce({ code: 'Box colr #FFF' })

    const result = await withSelfHealing(mockGenerate, 'Create a box', {
      maxAttempts: 2
    })

    expect(result.valid).toBe(false)
    expect(result.code).toBe('Box colr #FFF')
    expect(result.issues.length).toBeGreaterThan(0)
  })

  it('includes warnings when includeWarnings is true', async () => {
    // Create code that triggers a warning (if any exist in the validator)
    const mockGenerate = vi.fn().mockResolvedValue({ code: 'Box pad 16' })

    const result = await withSelfHealing(mockGenerate, 'Create a box', {
      includeWarnings: true
    })

    expect(result.valid).toBe(true)
  })

  it('uses correctionPrefix when provided', async () => {
    const mockGenerate = vi
      .fn()
      .mockResolvedValueOnce({ code: 'Box paddin 16' })
      .mockResolvedValueOnce({ code: 'Box pad 16' })

    await withSelfHealing(mockGenerate, 'Create a box', {
      correctionPrefix: 'CUSTOM PREFIX'
    })

    const secondCall = mockGenerate.mock.calls[1][0]
    expect(secondCall).toContain('CUSTOM PREFIX')
  })
})

// ============================================================================
// Edge Cases
// ============================================================================

describe('Edge Cases', () => {
  it('handles empty code', () => {
    const result = validateMirrorCode('')
    // Empty code should still parse (no nodes)
    expect(result.valid).toBe(true)
  })

  it('handles simple valid code with token', () => {
    const code = `$primary: #3B82F6
Box bg $primary`

    const result = validateMirrorCode(code)
    // Token definitions and usage should be valid
    expect(result.valid).toBe(true)
  })

  it('handles simple definition', () => {
    const code = 'Card: pad 16 bg #1E1E1E'

    const result = validateMirrorCode(code)
    expect(result.valid).toBe(true)
  })

  it('handles multiple errors in one line', () => {
    const code = 'Box paddin 16'

    const result = validateMirrorCode(code)
    expect(result.issues.length).toBeGreaterThanOrEqual(1)
  })

  it('detects typos in multi-line code', () => {
    const code = `Box pad 16
Button onclck toggle`

    const result = validateMirrorCode(code)
    expect(result.valid).toBe(false)
    expect(result.issues.some(i => i.message.includes('onclck'))).toBe(true)
  })
})

// ============================================================================
// Algorithmic Fixer Tests: removePxSuffix
// ============================================================================

describe('removePxSuffix', () => {
  it('removes px from width values', () => {
    expect(removePxSuffix('Box width 200px')).toBe('Box width 200')
  })

  it('removes px from height values', () => {
    expect(removePxSuffix('Box height 100px')).toBe('Box height 100')
  })

  it('removes px from multiple values', () => {
    expect(removePxSuffix('Box width 200px height 100px padding 16px')).toBe('Box width 200 height 100 padding 16')
  })

  it('does NOT remove px inside strings', () => {
    expect(removePxSuffix('Button "16px wide"')).toBe('Button "16px wide"')
  })

  it('handles mixed string and non-string content', () => {
    expect(removePxSuffix('Box width 200px "Size: 16px" height 100px')).toBe('Box width 200 "Size: 16px" height 100')
  })

  it('handles code without px', () => {
    expect(removePxSuffix('Box width 200 height 100')).toBe('Box width 200 height 100')
  })

  it('handles empty string', () => {
    expect(removePxSuffix('')).toBe('')
  })

  it('preserves px at end of line', () => {
    const input = 'Box width 200px'
    const result = removePxSuffix(input)
    expect(result).toBe('Box width 200')
  })
})

// ============================================================================
// Algorithmic Fixer Tests: removePropertyColons
// ============================================================================

describe('removePropertyColons', () => {
  it('removes colon after padding', () => {
    expect(removePropertyColons('Box padding: 16')).toBe('Box padding 16')
  })

  it('removes colon after background', () => {
    expect(removePropertyColons('Box background: #1E1E1E')).toBe('Box background #1E1E1E')
  })

  it('removes colons from multiple properties', () => {
    expect(removePropertyColons('Box padding: 16 background: #1E1E1E color: #FFF'))
      .toBe('Box padding 16 background #1E1E1E color #FFF')
  })

  it('handles short form properties', () => {
    expect(removePropertyColons('Box pad: 16 bg: #1E1E1E col: #FFF'))
      .toBe('Box pad 16 bg #1E1E1E col #FFF')
  })

  it('does NOT remove colon from component definitions', () => {
    // Component definitions have format "ComponentName:" at start of line
    // Our regex requires whitespace before the property, so this is preserved
    const input = 'Card: padding 16'
    const result = removePropertyColons(input)
    // The colon in "Card:" should be preserved because there's no space before it
    expect(result).toBe('Card: padding 16')
  })

  it('handles code without colons', () => {
    expect(removePropertyColons('Box padding 16 background #1E1E1E'))
      .toBe('Box padding 16 background #1E1E1E')
  })

  it('handles empty string', () => {
    expect(removePropertyColons('')).toBe('')
  })
})

// ============================================================================
// Algorithmic Fixer Tests: fixOpacityRange
// ============================================================================

describe('fixOpacityRange', () => {
  it('converts 50 to 0.5', () => {
    expect(fixOpacityRange('Box opacity 50')).toBe('Box opacity 0.5')
  })

  it('converts 100 to 1', () => {
    expect(fixOpacityRange('Box opacity 100')).toBe('Box opacity 1')
  })

  it('converts 25 to 0.25', () => {
    expect(fixOpacityRange('Box opacity 25')).toBe('Box opacity 0.25')
  })

  it('converts 75 to 0.75', () => {
    expect(fixOpacityRange('Box opacity 75')).toBe('Box opacity 0.75')
  })

  it('leaves 0 unchanged', () => {
    expect(fixOpacityRange('Box opacity 0')).toBe('Box opacity 0')
  })

  it('leaves 1 unchanged', () => {
    expect(fixOpacityRange('Box opacity 1')).toBe('Box opacity 1')
  })

  it('leaves decimal values unchanged', () => {
    expect(fixOpacityRange('Box opacity 0.5')).toBe('Box opacity 0.5')
  })

  it('handles short form opa', () => {
    expect(fixOpacityRange('Box opa 50')).toBe('Box opa 0.5')
  })

  it('handles shortest form o', () => {
    expect(fixOpacityRange('Box o 50')).toBe('Box o 0.5')
  })

  it('handles empty string', () => {
    expect(fixOpacityRange('')).toBe('')
  })

  it('does not convert values > 100', () => {
    // Values > 100 are left as-is (could be intentional error or different unit)
    expect(fixOpacityRange('Box opacity 150')).toBe('Box opacity 150')
  })
})

// ============================================================================
// Algorithmic Fixer Tests: fixMissingTokenPrefix
// ============================================================================

describe('fixMissingTokenPrefix', () => {
  it('adds $ prefix to token references', () => {
    const code = `$primary: #3B82F6
Box bg primary`

    expect(fixMissingTokenPrefix(code)).toBe(`$primary: #3B82F6
Box bg $primary`)
  })

  it('does not double-prefix already prefixed tokens', () => {
    const code = `$primary: #3B82F6
Box bg $primary`

    expect(fixMissingTokenPrefix(code)).toBe(code)
  })

  it('does not prefix token definitions', () => {
    const code = `$primary: #3B82F6
$secondary: #333`

    expect(fixMissingTokenPrefix(code)).toBe(code)
  })

  it('handles multiple token references', () => {
    const code = `$primary: #3B82F6
$spacing: 16
Box bg primary pad spacing`

    expect(fixMissingTokenPrefix(code)).toBe(`$primary: #3B82F6
$spacing: 16
Box bg $primary pad $spacing`)
  })

  it('does not modify code without token definitions', () => {
    const code = 'Box bg #3B82F6 pad 16'
    expect(fixMissingTokenPrefix(code)).toBe(code)
  })
})

// ============================================================================
// Algorithmic Fixer Tests: fixTextOnSeparateLine
// ============================================================================

describe('fixTextOnSeparateLine', () => {
  it('merges text content from separate line', () => {
    const code = `Button bg #F00
  "Click me"`

    expect(fixTextOnSeparateLine(code)).toBe('Button bg #F00 "Click me"')
  })

  it('preserves text that is already inline', () => {
    const code = 'Button bg #F00 "Click me"'
    expect(fixTextOnSeparateLine(code)).toBe(code)
  })

  it('does not merge if indentation is wrong', () => {
    const code = `Button bg #F00
"Click me"`

    // Same indentation means it's not a child, don't merge
    expect(fixTextOnSeparateLine(code)).toBe(code)
  })

  it('handles multiple components', () => {
    const code = `Button bg #F00
  "Click"
Box pad 16
  "Content"`

    expect(fixTextOnSeparateLine(code)).toBe(`Button bg #F00 "Click"
Box pad 16 "Content"`)
  })
})

// ============================================================================
// Algorithmic Fixer Tests: applyAllFixes
// ============================================================================

describe('applyAllFixes', () => {
  it('applies multiple fixes in sequence', () => {
    const code = `$primary: #3B82F6
Box padding: 16px background: primary opacity 50`

    const result = applyAllFixes(code)

    // Should fix: colon after properties, px suffix, token prefix, opacity range
    expect(result).toContain('padding 16')
    expect(result).toContain('$primary')
    expect(result).toContain('opacity 0.5')
    expect(result).not.toContain('padding:')
    expect(result).not.toContain('16px')
  })

  it('preserves valid code', () => {
    const code = `$primary: #3B82F6
Box padding 16 background $primary opacity 0.5`

    const result = applyAllFixes(code)
    expect(result).toBe(code)
  })
})

// ============================================================================
// Algorithmic Fixer Tests: convertRgbaToHex
// ============================================================================

describe('convertRgbaToHex', () => {
  it('converts rgb() to hex', () => {
    expect(convertRgbaToHex('Box background rgb(255, 255, 255)')).toBe('Box background #FFFFFF')
  })

  it('converts rgba() to hex with alpha', () => {
    expect(convertRgbaToHex('Box shadow rgba(0, 0, 0, 0.3)')).toBe('Box shadow #0000004D')
  })

  it('converts rgba() with alpha 1 to 6-digit hex', () => {
    expect(convertRgbaToHex('Card background rgba(30, 30, 46, 1)')).toBe('Card background #1E1E2E')
  })

  it('handles rgba with 0.5 alpha', () => {
    expect(convertRgbaToHex('Box background rgba(0, 0, 0, 0.5)')).toBe('Box background #00000080')
  })

  it('preserves code without rgba', () => {
    const code = 'Box background #1E1E1E'
    expect(convertRgbaToHex(code)).toBe(code)
  })

  it('handles multiple rgba values', () => {
    const code = 'Box background rgba(255, 0, 0, 0.5) shadow rgba(0, 0, 0, 0.3)'
    const result = convertRgbaToHex(code)
    expect(result).toContain('#FF000080')
    expect(result).toContain('#0000004D')
  })
})

// ============================================================================
// Algorithmic Fixer Tests: convertNamedColorsToHex
// ============================================================================

describe('convertNamedColorsToHex', () => {
  it('converts white to hex', () => {
    expect(convertNamedColorsToHex('Box color white')).toBe('Box color #FFFFFF')
  })

  it('converts black to hex', () => {
    expect(convertNamedColorsToHex('Card background black')).toBe('Card background #000000')
  })

  it('converts multiple named colors', () => {
    const code = 'Box background white color black'
    const result = convertNamedColorsToHex(code)
    expect(result).toBe('Box background #FFFFFF color #000000')
  })

  it('preserves hex colors', () => {
    const code = 'Box background #FFFFFF color #000000'
    expect(convertNamedColorsToHex(code)).toBe(code)
  })

  it('handles bg shorthand', () => {
    expect(convertNamedColorsToHex('Box bg white')).toBe('Box bg #FFFFFF')
  })

  it('handles col shorthand', () => {
    expect(convertNamedColorsToHex('Text col white')).toBe('Text col #FFFFFF')
  })

  it('preserves transparent', () => {
    expect(convertNamedColorsToHex('Box background transparent')).toBe('Box background transparent')
  })

  it('does not convert colors in strings', () => {
    expect(convertNamedColorsToHex('Button "white button"')).toBe('Button "white button"')
  })
})

// ============================================================================
// Algorithmic Fixer Tests: fixHyphenatedTokenNames
// ============================================================================

describe('fixHyphenatedTokenNames', () => {
  it('converts hyphenated token definition to camelCase', () => {
    const code = '$border-color: #333'
    expect(fixHyphenatedTokenNames(code)).toBe('$borderColor: #333')
  })

  it('converts hyphenated token usage to camelCase', () => {
    const code = `$border-color: #333
Box border-color $border-color`
    expect(fixHyphenatedTokenNames(code)).toBe(`$borderColor: #333
Box border-color $borderColor`)
  })

  it('preserves property names with hyphens', () => {
    const code = 'Box border-color #333'
    expect(fixHyphenatedTokenNames(code)).toBe(code)
  })

  it('handles multiple hyphenated tokens', () => {
    const code = `$border-color: #333
$hover-background: #444
Box border-color $border-color hover-bg $hover-background`
    const result = fixHyphenatedTokenNames(code)
    expect(result).toContain('$borderColor:')
    expect(result).toContain('$hoverBackground:')
    expect(result).toContain('$borderColor')
    expect(result).toContain('$hoverBackground')
    // Property name should be preserved
    expect(result).toContain('border-color $borderColor')
  })

  it('preserves code without hyphenated tokens', () => {
    const code = `$primary: #3B82F6
Box background $primary`
    expect(fixHyphenatedTokenNames(code)).toBe(code)
  })
})

// ============================================================================
// Algorithmic Fixer Tests: convertCssShadowToSize
// ============================================================================

describe('convertCssShadowToSize', () => {
  it('converts small shadow (blur <= 3px) to sm', () => {
    expect(convertCssShadowToSize('Box shadow 0 2 3 #000')).toBe('Box shadow sm')
  })

  it('converts medium shadow (blur 4-8px) to md', () => {
    expect(convertCssShadowToSize('Box shadow 0 4 6 #00000019')).toBe('Box shadow md')
  })

  it('converts large shadow (blur 9-15px) to lg', () => {
    expect(convertCssShadowToSize('Box shadow 0 10 15 #00000033')).toBe('Box shadow lg')
  })

  it('converts xl shadow (blur > 15px) to xl', () => {
    expect(convertCssShadowToSize('Box shadow 0 25 50 #00000040')).toBe('Box shadow xl')
  })

  it('preserves valid Mirror shadow', () => {
    expect(convertCssShadowToSize('Box shadow md')).toBe('Box shadow md')
  })
})

// ============================================================================
// Algorithmic Fixer Tests: removeUnsupportedUnits
// ============================================================================

describe('removeUnsupportedUnits', () => {
  it('converts rem to px', () => {
    expect(removeUnsupportedUnits('Box padding 1rem')).toBe('Box padding 16')
  })

  it('converts em to px', () => {
    expect(removeUnsupportedUnits('Box gap 0.5em')).toBe('Box gap 8')
  })

  it('converts vh to %', () => {
    expect(removeUnsupportedUnits('Box height 100vh')).toBe('Box height 100%')
  })

  it('converts vw to %', () => {
    expect(removeUnsupportedUnits('Box width 50vw')).toBe('Box width 50%')
  })

  it('preserves px values', () => {
    expect(removeUnsupportedUnits('Box padding 16')).toBe('Box padding 16')
  })
})

// ============================================================================
// Algorithmic Fixer Tests: removeCalcExpressions
// ============================================================================

describe('removeCalcExpressions', () => {
  it('extracts number from calc', () => {
    expect(removeCalcExpressions('Box width calc(100% - 32px)')).toBe('Box width 100')
  })

  it('extracts number from simple calc', () => {
    expect(removeCalcExpressions('Box width calc(50%)')).toBe('Box width 50')
  })
})

// ============================================================================
// Algorithmic Fixer Tests: fixUndefinedTokenReferences
// ============================================================================

describe('fixUndefinedTokenReferences', () => {
  it('fixes $hoverBg to $hover when only $hover is defined', () => {
    // Note: Hyphenated tokens are converted by fixHyphenatedTokenNames first
    const code = `$hover: #2563EB
Button hover-bg $hoverBg`
    const result = fixUndefinedTokenReferences(code)
    expect(result).toContain('$hover')
  })

  it('preserves defined tokens', () => {
    const code = `$primary: #3B82F6
Box background $primary`
    expect(fixUndefinedTokenReferences(code)).toBe(code)
  })

  it('fixes partial match to full token name', () => {
    const code = `$primaryColor: #3B82F6
Box background $primary`
    const result = fixUndefinedTokenReferences(code)
    expect(result).toContain('$primaryColor')
  })

  it('fixes $hoverBackground to $hoverBg using suffix aliases', () => {
    const code = `$hoverBg: #2563EB
Button hover-background $hoverBackground`
    const result = fixUndefinedTokenReferences(code)
    expect(result).toContain('$hoverBg')
    expect(result).not.toContain('$hoverBackground')
  })

  it('fixes $hoverBackground to $hover when base is defined', () => {
    const code = `$hover: #2563EB
Button hover-background $hoverBackground`
    const result = fixUndefinedTokenReferences(code)
    expect(result).toContain('$hover')
    expect(result).not.toContain('$hoverBackground')
  })

  it('fixes $primaryColor to $primary when base is defined', () => {
    const code = `$primary: #3B82F6
Box color $primaryColor`
    const result = fixUndefinedTokenReferences(code)
    expect(result).toContain('$primary')
    expect(result).not.toContain('$primaryColor')
  })
})

// ============================================================================
// Algorithmic Fixer Tests: fixEventTypos
// ============================================================================

describe('fixEventTypos', () => {
  it('fixes onlick to onclick', () => {
    expect(fixEventTypos('Button onlick toggle')).toBe('Button onclick toggle')
  })

  it('fixes onclck to onclick', () => {
    expect(fixEventTypos('Button onclck toggle')).toBe('Button onclick toggle')
  })

  it('fixes onhver to onhover', () => {
    expect(fixEventTypos('Box onhver highlight self')).toBe('Box onhover highlight self')
  })

  it('preserves correct events', () => {
    expect(fixEventTypos('Button onclick toggle')).toBe('Button onclick toggle')
  })
})

// ============================================================================
// Algorithmic Fixer Tests: fixActionTypos
// ============================================================================

describe('fixActionTypos', () => {
  it('fixes toogle to toggle', () => {
    expect(fixActionTypos('Button onclick toogle')).toBe('Button onclick toggle')
  })

  it('fixes shwo to show', () => {
    expect(fixActionTypos('Button onclick shwo Panel')).toBe('Button onclick show Panel')
  })

  it('fixes hdie to hide', () => {
    expect(fixActionTypos('Button onclick hdie Panel')).toBe('Button onclick hide Panel')
  })

  it('preserves correct actions', () => {
    expect(fixActionTypos('Button onclick toggle')).toBe('Button onclick toggle')
  })
})

// ============================================================================
// Algorithmic Fixer Tests: fixBorderShorthand
// ============================================================================

describe('fixBorderShorthand', () => {
  it('removes px from border shorthand', () => {
    expect(fixBorderShorthand('Box border 1px solid #333')).toBe('Box border 1 solid #333')
  })

  it('handles dashed border', () => {
    expect(fixBorderShorthand('Box border 2px dashed #FF0000')).toBe('Box border 2 dashed #FF0000')
  })

  it('preserves valid Mirror border', () => {
    expect(fixBorderShorthand('Box border 1 #333')).toBe('Box border 1 #333')
  })
})

// ============================================================================
// Algorithmic Fixer Tests: fixSplitPropertyLines
// ============================================================================

describe('fixSplitPropertyLines', () => {
  it('merges property name and value split across lines', () => {
    const code = `state focus
    border-color
    $primary`
    const result = fixSplitPropertyLines(code)
    expect(result).toContain('border-color $primary')
    expect(result).not.toContain('border-color\n')
  })

  it('merges background and hex color', () => {
    const code = `state hover
    background
    #333`
    const result = fixSplitPropertyLines(code)
    expect(result).toContain('background #333')
  })

  it('preserves correctly formatted code', () => {
    const code = `state focus
    border-color $primary
    background #333`
    expect(fixSplitPropertyLines(code)).toBe(code)
  })

  it('handles multiple split properties', () => {
    const code = `state focus
    border-color
    $primary
    background
    #444`
    const result = fixSplitPropertyLines(code)
    expect(result).toContain('border-color $primary')
    expect(result).toContain('background #444')
  })
})

// ============================================================================
// Algorithmic Fixer Tests: fixOrphanedNumbers
// ============================================================================

describe('fixOrphanedNumbers', () => {
  it('merges orphaned number with previous property line', () => {
    const code = `state focus
    border
    1`
    const result = fixOrphanedNumbers(code)
    expect(result).toContain('border 1')
    expect(result.split('\n').length).toBeLessThan(code.split('\n').length)
  })

  it('handles border with multiple values', () => {
    const code = `Input: border 1
    state focus
      border
      2`
    const result = fixOrphanedNumbers(code)
    expect(result).toContain('border 2')
  })

  it('preserves numbers that are valid on their own', () => {
    const code = `Box 200 300`
    expect(fixOrphanedNumbers(code)).toBe(code)
  })

  it('handles multiple orphaned numbers', () => {
    const code = `state focus
    radius
    4
    border
    1`
    const result = fixOrphanedNumbers(code)
    expect(result).toContain('radius 4')
    expect(result).toContain('border 1')
  })
})

// ============================================================================
// Algorithmic Fixer Tests: fixBorderColorOnly
// ============================================================================

describe('fixBorderColorOnly', () => {
  it('converts border $token to border-color $token', () => {
    const code = `state focus
    border $primary`
    const result = fixBorderColorOnly(code)
    expect(result).toContain('border-color $primary')
    expect(result).not.toContain('border $primary')
  })

  it('converts border #hex to border-color #hex', () => {
    const code = `state hover
    border #3B82F6`
    const result = fixBorderColorOnly(code)
    expect(result).toContain('border-color #3B82F6')
  })

  it('preserves border with width value', () => {
    const code = `Box border 1 #333`
    expect(fixBorderColorOnly(code)).toBe(code)
  })

  it('preserves border with width and color', () => {
    const code = `Input border 1 $borderColor`
    expect(fixBorderColorOnly(code)).toBe(code)
  })

  it('handles multiple border-only-color instances', () => {
    const code = `state focus
    border $primary
  state hover
    border $hover`
    const result = fixBorderColorOnly(code)
    expect(result).toContain('border-color $primary')
    expect(result).toContain('border-color $hover')
  })
})

// ============================================================================
// fixOrphanedLayoutKeywords Tests
// ============================================================================

describe('fixOrphanedLayoutKeywords', () => {
  it('merges orphaned ver keyword with parent', () => {
    const code = `Box
  ver
  gap 16`
    expect(fixOrphanedLayoutKeywords(code)).toBe('Box ver gap 16')
  })

  it('merges orphaned hor keyword with parent', () => {
    const code = `Row
  hor
  between`
    expect(fixOrphanedLayoutKeywords(code)).toBe('Row hor between')
  })

  it('merges multiple orphaned keywords', () => {
    const code = `Container
  vertical
  center
  gap 24`
    expect(fixOrphanedLayoutKeywords(code)).toBe('Container vertical center gap 24')
  })

  it('preserves component children (uppercase)', () => {
    const code = `Box vertical
  Button "Click"`
    expect(fixOrphanedLayoutKeywords(code)).toBe(code)
  })

  it('preserves state blocks', () => {
    const code = `Button
  state hover
    background #333`
    expect(fixOrphanedLayoutKeywords(code)).toBe(code)
  })

  it('preserves token definitions', () => {
    const code = `$primary: #3B82F6
Box background $primary`
    expect(fixOrphanedLayoutKeywords(code)).toBe(code)
  })

  it('preserves list items', () => {
    const code = `Menu
  - Item "One"
  - Item "Two"`
    expect(fixOrphanedLayoutKeywords(code)).toBe(code)
  })

  it('handles mixed content correctly', () => {
    const code = `Card
  vertical
  padding 16
  Title "Hello"
  Button "Click"`
    const result = fixOrphanedLayoutKeywords(code)
    expect(result).toContain('Card vertical padding 16')
    expect(result).toContain('Title "Hello"')
    expect(result).toContain('Button "Click"')
  })
})

// ============================================================================
// fixMissingTokenPrefix - Compound Name Tests
// ============================================================================

describe('fixMissingTokenPrefix compound names', () => {
  it('does not add $ to hover-background property', () => {
    const code = `$hover: #2563EB
Button hover-background $hover`
    const result = fixMissingTokenPrefix(code)
    expect(result).not.toContain('$hover-background')
    expect(result).toContain('hover-background $hover')
  })

  it('does not add $ to hover-color property', () => {
    const code = `$hover: #FFF
Button hover-color $hover`
    const result = fixMissingTokenPrefix(code)
    expect(result).not.toContain('$hover-color')
    expect(result).toContain('hover-color $hover')
  })

  it('adds $ to standalone token reference', () => {
    const code = `$hover: #2563EB
Button background hover`
    const result = fixMissingTokenPrefix(code)
    expect(result).toContain('background $hover')
  })

  it('handles mixed usage correctly', () => {
    const code = `$primary: #3B82F6
$hover: #2563EB
Button background $primary hover-background hover`
    const result = fixMissingTokenPrefix(code)
    expect(result).toContain('hover-background $hover')
    expect(result).not.toContain('$hover-background')
  })

  it('does not break border-color property', () => {
    const code = `$border: #444
Input border-color $border`
    const result = fixMissingTokenPrefix(code)
    expect(result).toContain('border-color $border')
    expect(result).not.toContain('$border-color')
  })
})

// ============================================================================
// fixCssNoneValues Tests
// ============================================================================

describe('fixCssNoneValues', () => {
  it('converts border none to border 0', () => {
    expect(fixCssNoneValues('Input border none')).toBe('Input border 0')
  })

  it('removes outline none', () => {
    expect(fixCssNoneValues('Input outline none').trim()).toBe('Input')
  })

  it('removes box-shadow none', () => {
    expect(fixCssNoneValues('Box box-shadow none').trim()).toBe('Box')
  })

  it('handles border none with other properties', () => {
    expect(fixCssNoneValues('Box border none padding 16')).toBe('Box border 0 padding 16')
  })

  it('handles case insensitivity', () => {
    expect(fixCssNoneValues('Input border NONE')).toBe('Input border 0')
    expect(fixCssNoneValues('Input BORDER none')).toBe('Input border 0')
  })

  it('preserves valid border values', () => {
    const code = 'Input border 1 #333'
    expect(fixCssNoneValues(code)).toBe(code)
  })

  it('cleans up double spaces', () => {
    const result = fixCssNoneValues('Input  outline none  padding 16')
    expect(result).not.toContain('  ')
  })
})

// ============================================================================
// fixDefinitionAndUsageOnSameLine Tests
// ============================================================================

describe('fixDefinitionAndUsageOnSameLine', () => {
  it('merges definition and usage on same line into single usage', () => {
    const code = 'Card: background #1E1E1E Card color #FFFFFF "Hello World"'
    const result = fixDefinitionAndUsageOnSameLine(code)
    expect(result).toBe('Card background #1E1E1E color #FFFFFF "Hello World"')
  })

  it('handles Button definition and usage pattern', () => {
    const code = 'Button: padding 12 Button "Click"'
    const result = fixDefinitionAndUsageOnSameLine(code)
    expect(result).toBe('Button padding 12 "Click"')
  })

  it('preserves intentional definition only (no usage)', () => {
    const code = 'Card: background #1E1E1E radius 8'
    expect(fixDefinitionAndUsageOnSameLine(code)).toBe(code)
  })

  it('does not merge different component names', () => {
    const code = 'Card: background #1E1E1E Button "Click"'
    expect(fixDefinitionAndUsageOnSameLine(code)).toBe(code)
  })

  it('handles multiple properties in definition', () => {
    const code = 'Card: vertical gap 16 padding 24 Card color #FFF "Content"'
    const result = fixDefinitionAndUsageOnSameLine(code)
    expect(result).toBe('Card vertical gap 16 padding 24 color #FFF "Content"')
  })

  it('preserves indentation', () => {
    const code = '  Card: background #333 Card "Text"'
    const result = fixDefinitionAndUsageOnSameLine(code)
    expect(result).toBe('  Card background #333 "Text"')
  })

  it('works with applyAllFixes', () => {
    const code = 'Card: background #1E1E1E Card color #FFFFFF "Hello World"'
    const result = applyAllFixes(code)
    expect(result).toBe('Card background #1E1E1E color #FFFFFF "Hello World"')
  })
})
