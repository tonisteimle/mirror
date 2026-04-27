/**
 * Pure-function tests for studio/agent/draft-prompts.ts.
 *
 * These cover the prompt builder + code extractor + variant registry
 * directly (no FixerService wrapper, no mocked bridge). The integration
 * tests in agent-fixer.draft-mode.test.ts exercise the same functions
 * through the service; this file pins down their behavior in isolation
 * so prompt-engineering changes get caught even if no service-level
 * test happens to exercise the relevant branch.
 */

import { describe, test, expect } from 'vitest'
import {
  buildDraftPromptCurrent,
  extractCodeBlock,
  resolveDraftPromptBuilder,
  listDraftPromptVariants,
  DRAFT_PROMPT_VARIANTS,
} from '../../studio/agent/draft-prompts'

const baseInput = {
  prompt: null as string | null,
  content: '',
  fullSource: 'canvas mobile\n\nFrame pad 16\n  ??\n  ??',
}

describe('buildDraftPromptCurrent', () => {
  describe('instruction selection (4 branches)', () => {
    test('user prompt + empty content → "User-Anfrage" line', () => {
      const out = buildDraftPromptCurrent({
        ...baseInput,
        prompt: 'blauer button',
      })
      expect(out).toContain('User-Anfrage: blauer button')
      expect(out).not.toContain('Korrigiere Syntax-Fehler')
    })

    test('user prompt + draft content → "User-Anfrage" line (prompt wins)', () => {
      const out = buildDraftPromptCurrent({
        ...baseInput,
        prompt: 'mehr buttons',
        content: 'Button "A"',
      })
      expect(out).toContain('User-Anfrage: mehr buttons')
      expect(out).toContain('Aktueller Inhalt des Draft-Blocks:')
      expect(out).toContain('Button "A"')
    })

    test('no prompt + draft content → fix-mode instruction (intent preservation)', () => {
      const out = buildDraftPromptCurrent({
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
      const out = buildDraftPromptCurrent(baseInput)
      expect(out).toContain('Generiere neuen Code')
      expect(out).toContain('Der Draft-Block ist leer')
      expect(out).not.toContain('Korrigiere Syntax-Fehler')
      expect(out).not.toContain('User-Anfrage:')
    })
  })

  describe('always-present sections', () => {
    test('contains the role line + ?? marker explanation', () => {
      const out = buildDraftPromptCurrent(baseInput)
      expect(out).toContain('Mirror DSL Code-Generator')
      expect(out).toContain('??')
    })

    test('contains the editor-source block with the original source', () => {
      const out = buildDraftPromptCurrent({
        ...baseInput,
        fullSource: 'canvas mobile\n\nFrame\n  ??\n  ??',
      })
      expect(out).toContain('## Editor-Source')
      expect(out).toContain('canvas mobile')
    })

    test('answer-format section is present + lists $token + component rules', () => {
      const out = buildDraftPromptCurrent(baseInput)
      expect(out).toContain('## ANTWORTFORMAT')
      expect(out).toContain('```mirror')
      expect(out).toContain('Wenn Tokens existieren')
      expect(out).toContain('Wenn Komponenten existieren')
    })
  })

  describe('project-file injection', () => {
    test('tokenFiles appear under their own heading', () => {
      const out = buildDraftPromptCurrent({
        ...baseInput,
        tokenFiles: { 'tokens.tok': 'primary.bg: #2271C1\nm.pad: 12' },
      })
      expect(out).toContain('Token-Dateien')
      expect(out).toContain('### tokens.tok')
      expect(out).toContain('primary.bg: #2271C1')
    })

    test('componentFiles appear under their own heading', () => {
      const out = buildDraftPromptCurrent({
        ...baseInput,
        componentFiles: { 'components.com': 'Btn: pad 10 20' },
      })
      expect(out).toContain('Komponenten-Dateien')
      expect(out).toContain('### components.com')
      expect(out).toContain('Btn: pad 10 20')
    })

    test('empty file content is filtered out (avoid noise)', () => {
      const out = buildDraftPromptCurrent({
        ...baseInput,
        tokenFiles: { 'empty.tok': '   \n\t\n' },
      })
      expect(out).not.toContain('### empty.tok')
      expect(out).not.toContain('Token-Dateien')
    })

    test('no token/component sections when both maps absent', () => {
      const out = buildDraftPromptCurrent(baseInput)
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

describe('resolveDraftPromptBuilder', () => {
  test('returns the current builder when name is undefined', () => {
    expect(resolveDraftPromptBuilder()).toBe(buildDraftPromptCurrent)
  })

  test('returns the current builder when name is unknown', () => {
    expect(resolveDraftPromptBuilder('does-not-exist')).toBe(buildDraftPromptCurrent)
  })

  test('returns the matching builder when name is known', () => {
    expect(resolveDraftPromptBuilder('current')).toBe(buildDraftPromptCurrent)
  })
})

describe('listDraftPromptVariants', () => {
  test('always includes "current"', () => {
    expect(listDraftPromptVariants()).toContain('current')
  })

  test('list matches the registry keys', () => {
    expect(listDraftPromptVariants().sort()).toEqual(Object.keys(DRAFT_PROMPT_VARIANTS).sort())
  })
})
