/**
 * Tests for Draft Mode Extension
 *
 * Tests the parsing logic for -- markers and draft block detection.
 */

import { describe, it, expect } from 'vitest'
import {
  parseDraftMarker,
  parseDraftBlock,
  getDraftLineNumbers,
  extractDraftContent,
  type DraftBlockState,
} from '../../studio/editor/draft-mode'
import { Text } from '@codemirror/state'

// ===========================================
// PARSE DRAFT MARKER TESTS
// ===========================================

describe('parseDraftMarker', () => {
  describe('Basic Recognition', () => {
    it('recognizes -- at line start', () => {
      const result = parseDraftMarker('--')
      expect(result).not.toBeNull()
      expect(result?.indent).toBe(0)
      expect(result?.prompt).toBeNull()
    })

    it('recognizes -- with trailing space', () => {
      const result = parseDraftMarker('-- ')
      expect(result).not.toBeNull()
      expect(result?.prompt).toBeNull()
    })

    it('extracts prompt after --', () => {
      const result = parseDraftMarker('-- make responsive')
      expect(result).not.toBeNull()
      expect(result?.prompt).toBe('make responsive')
    })

    it('extracts prompt with extra spaces', () => {
      const result = parseDraftMarker('--   add a button  ')
      expect(result).not.toBeNull()
      expect(result?.prompt).toBe('add a button')
    })
  })

  describe('Indentation', () => {
    it('detects 2-space indentation', () => {
      const result = parseDraftMarker('  --')
      expect(result).not.toBeNull()
      expect(result?.indent).toBe(2)
    })

    it('detects 4-space indentation', () => {
      const result = parseDraftMarker('    -- add child')
      expect(result).not.toBeNull()
      expect(result?.indent).toBe(4)
      expect(result?.prompt).toBe('add child')
    })

    it('detects tab indentation', () => {
      const result = parseDraftMarker('\t--')
      expect(result).not.toBeNull()
      expect(result?.indent).toBe(1) // Tab counts as 1 character
    })
  })

  describe('Non-Matches', () => {
    it('does not match regular code', () => {
      expect(parseDraftMarker('Frame bg #1a1a1a')).toBeNull()
    })

    it('does not match -- in middle of line', () => {
      expect(parseDraftMarker('Text "test -- value"')).toBeNull()
    })

    it('does not match single dash', () => {
      expect(parseDraftMarker('-')).toBeNull()
    })

    it('does not match triple dash', () => {
      // Triple dash should still match as -- with extra content
      const result = parseDraftMarker('---')
      expect(result).not.toBeNull()
      expect(result?.prompt).toBe('-')
    })

    it('does not match empty line', () => {
      expect(parseDraftMarker('')).toBeNull()
    })
  })
})

// ===========================================
// PARSE DRAFT BLOCK TESTS
// ===========================================

describe('parseDraftBlock', () => {
  describe('Basic Detection', () => {
    it('detects single -- as open block', () => {
      const doc = Text.of(['Frame bg #1a1a1a', '--', 'Text "Hello"'])
      const result = parseDraftBlock(doc)

      expect(result.active).toBe(true)
      expect(result.startLine).toBe(2)
      expect(result.prompt).toBeNull()
      expect(result.endLine).toBeNull() // Open block
      expect(result.indent).toBe(0)
    })

    it('extracts prompt from -- line', () => {
      const doc = Text.of(['Frame', '-- add a blue button'])
      const result = parseDraftBlock(doc)

      expect(result.active).toBe(true)
      expect(result.prompt).toBe('add a blue button')
    })

    it('detects closed block with two -- markers', () => {
      const doc = Text.of(['Frame', '--', 'Btn "Test"', '--'])
      const result = parseDraftBlock(doc)

      expect(result.active).toBe(true)
      expect(result.startLine).toBe(2)
      expect(result.endLine).toBe(4)
    })

    it('detects indented -- marker', () => {
      const doc = Text.of(['Frame', '  -- add child'])
      const result = parseDraftBlock(doc)

      expect(result.active).toBe(true)
      expect(result.indent).toBe(2)
      expect(result.prompt).toBe('add child')
    })
  })

  describe('No Draft Block', () => {
    it('returns inactive for code without --', () => {
      const doc = Text.of(['Frame bg #1a1a1a', '  Text "Hello"'])
      const result = parseDraftBlock(doc)

      expect(result.active).toBe(false)
      expect(result.startLine).toBeNull()
    })

    it('returns inactive for empty document', () => {
      const doc = Text.of([''])
      const result = parseDraftBlock(doc)

      expect(result.active).toBe(false)
    })
  })

  describe('Edge Cases', () => {
    it('handles -- on first line', () => {
      const doc = Text.of(['-- generate a button'])
      const result = parseDraftBlock(doc)

      expect(result.active).toBe(true)
      expect(result.startLine).toBe(1)
      expect(result.prompt).toBe('generate a button')
    })

    it('handles -- on last line', () => {
      const doc = Text.of(['Frame', 'Text "Hi"', '--'])
      const result = parseDraftBlock(doc)

      expect(result.active).toBe(true)
      expect(result.startLine).toBe(3)
      expect(result.endLine).toBeNull()
    })

    it('second -- ends the block', () => {
      const doc = Text.of(['--', 'code', '--', 'more code'])
      const result = parseDraftBlock(doc)

      expect(result.active).toBe(true)
      expect(result.startLine).toBe(1)
      expect(result.endLine).toBe(3)
    })
  })
})

// ===========================================
// GET DRAFT LINE NUMBERS TESTS
// ===========================================

describe('getDraftLineNumbers', () => {
  it('returns empty set for inactive state', () => {
    const state: DraftBlockState = {
      active: false,
      startLine: null,
      prompt: null,
      endLine: null,
      indent: 0,
      processing: false,
      abortController: null,
    }

    const result = getDraftLineNumbers(state, 5)
    expect(result.size).toBe(0)
  })

  it('returns all lines from start to end for closed block', () => {
    const state: DraftBlockState = {
      active: true,
      startLine: 2,
      prompt: null,
      endLine: 4,
      indent: 0,
      processing: false,
      abortController: null,
    }

    const result = getDraftLineNumbers(state, 5)
    expect(result).toContain(2)
    expect(result).toContain(3)
    expect(result).toContain(4)
    expect(result.size).toBe(3)
  })

  it('returns all lines from start to document end for open block', () => {
    const state: DraftBlockState = {
      active: true,
      startLine: 3,
      prompt: null,
      endLine: null,
      indent: 0,
      processing: false,
      abortController: null,
    }

    const result = getDraftLineNumbers(state, 5)
    expect(result).toContain(3)
    expect(result).toContain(4)
    expect(result).toContain(5)
    expect(result.size).toBe(3)
  })

  it('handles single line draft block', () => {
    const state: DraftBlockState = {
      active: true,
      startLine: 2,
      prompt: null,
      endLine: 2,
      indent: 0,
      processing: false,
      abortController: null,
    }

    const result = getDraftLineNumbers(state, 5)
    expect(result).toContain(2)
    expect(result.size).toBe(1)
  })
})

// ===========================================
// EXTRACT DRAFT CONTENT TESTS
// ===========================================

describe('extractDraftContent', () => {
  it('extracts content between -- markers', () => {
    const doc = Text.of(['Frame', '--', 'Btn "Test"', 'Text "Hi"', '--'])
    const state: DraftBlockState = {
      active: true,
      startLine: 2,
      prompt: null,
      endLine: 5,
      indent: 0,
      processing: false,
      abortController: null,
    }

    const result = extractDraftContent(doc, state)
    expect(result).toBe('Btn "Test"\nText "Hi"')
  })

  it('extracts content from open block to end of document', () => {
    const doc = Text.of(['Frame', '--', 'Btn "Test"'])
    const state: DraftBlockState = {
      active: true,
      startLine: 2,
      prompt: null,
      endLine: null,
      indent: 0,
      processing: false,
      abortController: null,
    }

    const result = extractDraftContent(doc, state)
    expect(result).toBe('Btn "Test"')
  })

  it('returns empty string for empty draft block', () => {
    const doc = Text.of(['Frame', '--', '--'])
    const state: DraftBlockState = {
      active: true,
      startLine: 2,
      prompt: null,
      endLine: 3,
      indent: 0,
      processing: false,
      abortController: null,
    }

    const result = extractDraftContent(doc, state)
    expect(result).toBe('')
  })

  it('returns empty string for inactive state', () => {
    const doc = Text.of(['Frame', 'Text'])
    const state: DraftBlockState = {
      active: false,
      startLine: null,
      prompt: null,
      endLine: null,
      indent: 0,
      processing: false,
      abortController: null,
    }

    const result = extractDraftContent(doc, state)
    expect(result).toBe('')
  })
})

// ===========================================
// INTEGRATION SCENARIOS
// ===========================================

describe('Draft Mode Scenarios', () => {
  describe('Generation Use Case', () => {
    it('-- with prompt generates new code', () => {
      const doc = Text.of(['Frame gap 12', '  -- add a blue button'])
      const state = parseDraftBlock(doc)

      expect(state.active).toBe(true)
      expect(state.prompt).toBe('add a blue button')
      expect(state.indent).toBe(2)
      expect(state.startLine).toBe(2)
      expect(state.endLine).toBeNull()
    })
  })

  describe('Correction Use Case', () => {
    it('-- with code to correct', () => {
      const doc = Text.of([
        'Frame',
        '--',
        'Btn "Test" bg blue', // Incorrect: should be bg #xxx
        '--',
      ])
      const state = parseDraftBlock(doc)
      const content = extractDraftContent(doc, state)

      expect(state.active).toBe(true)
      expect(state.prompt).toBeNull()
      expect(content).toBe('Btn "Test" bg blue')
    })
  })

  describe('Refactoring Use Case', () => {
    it('-- make responsive with existing code', () => {
      const doc = Text.of([
        'Frame',
        '-- make this responsive',
        '  Frame hor, gap 8',
        '    Button "A"',
        '    Button "B"',
        '--',
      ])
      const state = parseDraftBlock(doc)
      const content = extractDraftContent(doc, state)

      expect(state.active).toBe(true)
      expect(state.prompt).toBe('make this responsive')
      expect(content).toContain('Frame hor, gap 8')
      expect(content).toContain('Button "A"')
    })
  })
})
