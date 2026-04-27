/**
 * Pure-function tests for studio/agent/draft-prompts.ts.
 *
 * These cover the prompt builder + code extractor + indent/splice helpers
 * directly (no FixerService wrapper, no mocked bridge). The integration
 * tests in agent-fixer.draft-mode.test.ts exercise the same functions
 * through the service; this file pins down their behavior in isolation
 * so prompt-engineering or splice changes get caught even if no service-
 * level test happens to exercise the relevant branch.
 */

import { describe, test, expect } from 'vitest'
import {
  buildDraftPrompt,
  extractCodeBlock,
  indentBlock,
  spliceDraftBlock,
} from '../../studio/agent/draft-prompts'

const baseInput = {
  prompt: null as string | null,
  content: '',
  fullSource: 'canvas mobile\n\nFrame pad 16\n  ??\n  ??',
}

describe('buildDraftPrompt', () => {
  describe('instruction selection (4 branches)', () => {
    test('user prompt + empty content → "User-Anfrage" line', () => {
      const out = buildDraftPrompt({
        ...baseInput,
        prompt: 'blauer button',
      })
      expect(out).toContain('User-Anfrage: blauer button')
      expect(out).not.toContain('Korrigiere Syntax-Fehler')
    })

    test('user prompt + draft content → "User-Anfrage" line (prompt wins)', () => {
      const out = buildDraftPrompt({
        ...baseInput,
        prompt: 'mehr buttons',
        content: 'Button "A"',
      })
      expect(out).toContain('User-Anfrage: mehr buttons')
      expect(out).toContain('Aktueller Inhalt des Draft-Blocks:')
      expect(out).toContain('Button "A"')
    })

    test('no prompt + draft content → fix-mode instruction (intent preservation)', () => {
      const out = buildDraftPrompt({
        ...baseInput,
        content: 'Button "Save", bg primary',
      })
      // Critical: this branch failed scenario 15 before commit 1b83bc2b.
      // The instruction must mention intent preservation + missing-$ hint.
      expect(out).toContain('Korrigiere Syntax-Fehler')
      expect(out).toContain('bewahre dabei die User-Intention')
      expect(out).toMatch(/\$/) // mentions the $ token sigil somewhere in the instruction
      expect(out).toContain('Aktueller Inhalt des Draft-Blocks:')
      expect(out).toContain('Button "Save", bg primary')
    })

    test('no prompt + empty content → "Generiere neuen Code" instruction', () => {
      const out = buildDraftPrompt(baseInput)
      expect(out).toContain('Generiere neuen Code')
      expect(out).toContain('Der Draft-Block ist leer')
      expect(out).not.toContain('Korrigiere Syntax-Fehler')
      expect(out).not.toContain('User-Anfrage:')
    })
  })

  describe('always-present sections', () => {
    test('contains the role line + ?? marker explanation', () => {
      const out = buildDraftPrompt(baseInput)
      expect(out).toContain('Mirror DSL Code-Generator')
      expect(out).toContain('??')
    })

    test('contains the editor-source block with the original source', () => {
      const out = buildDraftPrompt({
        ...baseInput,
        fullSource: 'canvas mobile\n\nFrame\n  ??\n  ??',
      })
      expect(out).toContain('## Editor-Source')
      expect(out).toContain('canvas mobile')
    })

    test('answer-format section is present + lists $token + component rules', () => {
      const out = buildDraftPrompt(baseInput)
      expect(out).toContain('## ANTWORTFORMAT')
      expect(out).toContain('```mirror')
      expect(out).toContain('Wenn Tokens existieren')
      expect(out).toContain('Wenn Komponenten existieren')
    })
  })

  describe('project-file injection', () => {
    test('tokenFiles appear under their own heading', () => {
      const out = buildDraftPrompt({
        ...baseInput,
        tokenFiles: { 'tokens.tok': 'primary.bg: #2271C1\nm.pad: 12' },
      })
      expect(out).toContain('Token-Dateien')
      expect(out).toContain('### tokens.tok')
      expect(out).toContain('primary.bg: #2271C1')
    })

    test('componentFiles appear under their own heading', () => {
      const out = buildDraftPrompt({
        ...baseInput,
        componentFiles: { 'components.com': 'Btn: pad 10 20' },
      })
      expect(out).toContain('Komponenten-Dateien')
      expect(out).toContain('### components.com')
      expect(out).toContain('Btn: pad 10 20')
    })

    test('empty file content is filtered out (avoid noise)', () => {
      const out = buildDraftPrompt({
        ...baseInput,
        tokenFiles: { 'empty.tok': '   \n\t\n' },
      })
      expect(out).not.toContain('### empty.tok')
      expect(out).not.toContain('Token-Dateien')
    })

    test('no token/component sections when both maps absent', () => {
      const out = buildDraftPrompt(baseInput)
      expect(out).not.toContain('Token-Dateien')
      expect(out).not.toContain('Komponenten-Dateien')
    })
  })
})

describe('extractCodeBlock', () => {
  test('extracts ```mirror fenced block', () => {
    expect(extractCodeBlock('prelude\n```mirror\nButton "Klick"\n```\nepilog')).toBe(
      'Button "Klick"'
    )
  })

  test('extracts ```mir fenced block (alternate tag)', () => {
    expect(extractCodeBlock('```mir\nFrame gap 8\n```')).toBe('Frame gap 8')
  })

  test('extracts generic ``` block (no language tag)', () => {
    expect(extractCodeBlock('reply:\n```\nText "Hi"\n```\n')).toBe('Text "Hi"')
  })

  test('preserves multi-line content with indentation', () => {
    const fenced = '```mirror\nFrame hor\n  Button "A"\n  Button "B"\n```'
    expect(extractCodeBlock(fenced)).toBe('Frame hor\n  Button "A"\n  Button "B"')
  })

  test('falls back to raw text when no fence + first line looks like Mirror primitive', () => {
    expect(extractCodeBlock('Frame hor, gap 12\n  Text "Hello"')).toBe(
      'Frame hor, gap 12\n  Text "Hello"'
    )
  })

  test('falls back when first line is `canvas …` (lowercase top-level)', () => {
    expect(extractCodeBlock('canvas mobile\nFrame')).toContain('canvas mobile')
  })

  test('falls back when first line is component definition (`Name:`)', () => {
    expect(extractCodeBlock('Btn: pad 10 20, bg #2271C1')).toContain('Btn:')
  })

  test('falls back when first line is token definition (`name.bg: …`)', () => {
    expect(extractCodeBlock('primary.bg: #2271C1')).toContain('primary.bg')
  })

  test('returns null for empty string', () => {
    expect(extractCodeBlock('')).toBeNull()
  })

  test('returns null for prose with no fence + non-Mirror first line', () => {
    expect(extractCodeBlock('Sorry, ich kann das nicht erzeugen.')).toBeNull()
  })

  test('returns null when first line is bare unknown capitalized word', () => {
    expect(extractCodeBlock('Foo')).toBeNull()
  })

  test('first fenced block wins when multiple are present', () => {
    expect(extractCodeBlock('```mirror\nButton\n```\nintermezzo\n```mirror\nText\n```')).toBe(
      'Button'
    )
  })
})

describe('indentBlock', () => {
  test('prefixes each non-blank line with the given indent', () => {
    expect(indentBlock('Frame\n  Text "Hi"', '    ')).toBe('    Frame\n      Text "Hi"')
  })

  test('leaves blank lines untouched (no trailing whitespace)', () => {
    expect(indentBlock('a\n\nb', '  ')).toBe('  a\n\n  b')
  })

  test('treats whitespace-only lines as blank', () => {
    expect(indentBlock('a\n   \nb', '  ')).toBe('  a\n   \n  b')
  })

  test('empty input returns empty (single empty line is preserved)', () => {
    expect(indentBlock('', '  ')).toBe('')
  })

  test('zero indent is a no-op', () => {
    expect(indentBlock('Frame\n  Text', '')).toBe('Frame\n  Text')
  })
})

describe('spliceDraftBlock', () => {
  test('replaces a closed ?? block + indents new content to match marker', () => {
    const source = 'canvas mobile\n\nFrame pad 16\n  ??\n  ??'
    const result = spliceDraftBlock(source, 'Button "OK"\nText "x"')
    expect(result).toBe('canvas mobile\n\nFrame pad 16\n  Button "OK"\n  Text "x"')
  })

  test('replaces ?? block including the user prompt + draft content lines', () => {
    const source = ['Frame', '  ?? hello', '  Button "Old"', '  ??'].join('\n')
    expect(spliceDraftBlock(source, 'Button "New"')).toBe('Frame\n  Button "New"')
  })

  test('handles top-level (zero-indent) ?? block', () => {
    const source = '??\nButton "Stuff"\n??'
    expect(spliceDraftBlock(source, 'Frame\n  Text "Hi"')).toBe('Frame\n  Text "Hi"')
  })

  test('open block (only one ??) — replaces from the marker to end of source', () => {
    const source = 'canvas mobile\n\nFrame\n  ?? something'
    expect(spliceDraftBlock(source, 'Button "X"')).toBe('canvas mobile\n\nFrame\n  Button "X"')
  })

  test('no ?? marker present → appends new content with leading newline', () => {
    expect(spliceDraftBlock('Frame\n  Button', 'Text "added"')).toBe(
      'Frame\n  Button\nText "added"'
    )
  })

  test('preserves lines before + after the block exactly', () => {
    const source = 'A\nB\n  ??\n  garbage\n  ??\nC\nD'
    expect(spliceDraftBlock(source, 'X')).toBe('A\nB\n  X\nC\nD')
  })
})
