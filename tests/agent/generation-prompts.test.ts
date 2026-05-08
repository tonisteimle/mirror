/**
 * Unit tests for the HTML-first generation pipeline's prompt builders.
 *
 * The two builders are pure-fn — no I/O, no editor coupling, no LLM calls.
 * Their job is to assemble a deterministic prompt string from inputs;
 * pipeline correctness depends on every relevant input flowing into the
 * prompt at the right place. These tests pin the contract:
 *
 *  - which input fields appear in the prompt
 *  - which structural sections are present (and in what order)
 *  - which inputs are required, which are optional
 *  - retry-context formatting
 *  - sibling-files inclusion / exclusion (empty content, missing siblings)
 *  - sketch vs userPrompt branching
 *
 * We avoid asserting on the exact prose — the spike-validated text in
 * `generation-prompts.ts` is the source of truth. We assert only on
 * stable structural anchors (section headers, fence-wrapped inputs,
 * input-bearing substrings).
 */

import { describe, it, expect } from 'vitest'
import {
  buildHtmlGenerationPrompt,
  buildTranslationPrompt,
  type HtmlGenerationPromptInput,
  type TranslationPromptInput,
  type TranslationContext,
} from '../../studio/agent/generation-prompts'
import type { ValidationError } from '../../compiler/validator'

// =============================================================================
// buildHtmlGenerationPrompt — Stage 1
// =============================================================================

describe('buildHtmlGenerationPrompt', () => {
  describe('input validation', () => {
    it('throws when neither userPrompt nor sketch is provided', () => {
      expect(() => buildHtmlGenerationPrompt({} as HtmlGenerationPromptInput)).toThrow(
        /either userPrompt or sketch is required/
      )
    })

    it('throws when both fields are empty strings', () => {
      // Empty string is falsy, so the function must reject it the same way
      // it rejects undefined — otherwise the LLM gets a prompt with no
      // user intent and produces garbage.
      expect(() => buildHtmlGenerationPrompt({ userPrompt: '', sketch: '' })).toThrow(
        /either userPrompt or sketch is required/
      )
    })

    it('accepts userPrompt only', () => {
      const prompt = buildHtmlGenerationPrompt({ userPrompt: 'A login form' })
      expect(prompt).toContain('A login form')
    })

    it('accepts sketch only', () => {
      const prompt = buildHtmlGenerationPrompt({
        sketch: 'Frame pad 16\n  Text "Hi"',
      })
      expect(prompt).toContain('Frame pad 16')
    })

    it('accepts both — sketch takes primary position, userPrompt becomes notes', () => {
      const prompt = buildHtmlGenerationPrompt({
        sketch: 'Card\n  Title "Hello"',
        userPrompt: 'Make it feel like a Linear notification',
      })
      const sketchPos = prompt.indexOf("Designer's sketch")
      const notesPos = prompt.indexOf('Additional notes')
      expect(sketchPos).toBeGreaterThanOrEqual(0)
      expect(notesPos).toBeGreaterThan(sketchPos)
      expect(prompt).toContain('Card')
      expect(prompt).toContain('Make it feel like a Linear notification')
    })
  })

  describe('userPrompt branch', () => {
    const prompt = buildHtmlGenerationPrompt({ userPrompt: 'Pricing tiers, 3 cards' })

    it('addresses the LLM as a UI designer', () => {
      expect(prompt).toMatch(/UI designer/i)
    })

    it('embeds the user-request verbatim under a request header', () => {
      expect(prompt).toMatch(/## User request/)
      expect(prompt).toContain('Pricing tiers, 3 cards')
    })

    it('does NOT include sketch-mode interpreter framing', () => {
      expect(prompt).not.toMatch(/Designer's sketch/)
      expect(prompt).not.toMatch(/Things you should infer/)
    })

    it('mentions the downstream Mirror translation stage', () => {
      // Section ordering matters: the LLM should know its output gets
      // translated, so it produces translation-friendly HTML.
      expect(prompt).toMatch(/translated to the Mirror DSL/)
    })

    it('includes all four guidance sections', () => {
      expect(prompt).toContain('## Hard constraints')
      expect(prompt).toContain('## Translation-friendly conventions')
      expect(prompt).toContain('## Design quality bar')
      expect(prompt).toContain('## Output rules')
    })
  })

  describe('sketch branch', () => {
    const prompt = buildHtmlGenerationPrompt({ sketch: 'Btn "Save"\nBtn "Cancel"' })

    it("addresses the LLM as the designer's interpreter", () => {
      expect(prompt).toMatch(/designer's interpreter/i)
    })

    it('embeds the sketch in a fenced code block', () => {
      // Fencing the sketch matters: the lexer-side syntax is brittle and
      // we don't want the LLM to inline-fold quotes or indentation.
      expect(prompt).toMatch(/```\s*\n[Bb]tn "Save"/)
    })

    it('lists what the LLM should infer from the underspecified sketch', () => {
      expect(prompt).toContain('## Things you should infer')
      // Loose hints, token names, implied widget type — pin the bullets
      expect(prompt).toMatch(/Loose style hints/)
      expect(prompt).toMatch(/Token names/)
      expect(prompt).toMatch(/Implied widget type/)
    })

    it('includes the same four downstream-guidance sections as userPrompt', () => {
      expect(prompt).toContain('## Hard constraints')
      expect(prompt).toContain('## Translation-friendly conventions')
      expect(prompt).toContain('## Design quality bar')
      expect(prompt).toContain('## Output rules')
    })
  })

  describe('Mirror constraints in the prompt', () => {
    // These constraints are load-bearing: every change here flows through
    // every Stage-1 LLM call, so a regression in any single bullet would
    // surface as broad pipeline-quality drift. Pin the most important ones.
    const prompt = buildHtmlGenerationPrompt({ userPrompt: 'A widget' })

    it('forbids CSS Grid (Mirror is flexbox-only)', () => {
      expect(prompt).toMatch(/no `display: grid`/)
    })

    it('forbids non-pixel units', () => {
      expect(prompt).toMatch(/no `%`, `rem`, `em`, `vh`, `vw`/)
    })

    it('forbids @media queries (single fixed-width widget)', () => {
      expect(prompt).toMatch(/No `@media`/)
    })

    it('forbids @keyframes / transitions / animations', () => {
      expect(prompt).toMatch(/No `@keyframes`, no `transition`, no `animation`/)
    })

    it('directs Lucide icons via class hint, not inline path data', () => {
      // The translator relies on `<svg class="icon icon-NAME">` to map
      // back to `Icon "NAME"`. Loose icon SVGs would round-trip badly.
      expect(prompt).toMatch(/icon icon-heart/)
      expect(prompt).toMatch(/`Icon "heart"`/)
    })

    it('demands a single accent color (matches Linear/Vercel restraint)', () => {
      expect(prompt).toMatch(/Single accent color/)
    })

    it('forbids markdown fences in the output', () => {
      expect(prompt).toMatch(/no markdown code fences/)
    })
  })

  describe('siblings — project design system', () => {
    // The HTML pivot is where the design palette gets committed. Without
    // siblings flowing into Stage 1, the LLM invents its own colors and the
    // translator (Stage 2) can't retroactively swap them to existing project
    // tokens. These tests pin that siblings DO appear in Stage 1 and that
    // the framing instructs honoring (not just describing) the system.

    it('includes a project-design-system section when siblings are provided', () => {
      const prompt = buildHtmlGenerationPrompt({
        userPrompt: 'Stat cards',
        siblings: { 'tokens.tok': 'brand.bg: #2271C1\nbrand.col: white' },
      })
      expect(prompt).toContain('## Existing project design system')
    })

    it('embeds each sibling file in a fenced code block, keyed by filename', () => {
      const prompt = buildHtmlGenerationPrompt({
        userPrompt: 'Form',
        siblings: {
          'tokens.tok': 'brand.bg: #2271C1',
          'components.com': 'Btn: pad 10 20',
        },
      })
      expect(prompt).toContain('**tokens.tok**')
      expect(prompt).toContain('brand.bg: #2271C1')
      expect(prompt).toContain('**components.com**')
      expect(prompt).toContain('Btn: pad 10 20')
    })

    it('instructs the LLM to define matching `:root` custom properties', () => {
      // The translator-side mapping (`:root` → Mirror token) only works if
      // Stage 1 emits the same names — otherwise the link breaks.
      const prompt = buildHtmlGenerationPrompt({
        userPrompt: 'Card',
        siblings: { 'tokens.tok': 'brand.bg: #2271C1' },
      })
      expect(prompt).toMatch(/`:root` custom property/)
      expect(prompt).toMatch(/same base name/)
    })

    it('forbids inventing a parallel palette', () => {
      // Critical for the p4 fixture: without explicit "do not invent",
      // the HTML stage produces its own palette regardless of siblings.
      const prompt = buildHtmlGenerationPrompt({
        userPrompt: 'Cards',
        siblings: { 'tokens.tok': 'brand.bg: #2271C1' },
      })
      expect(prompt).toMatch(/Do not invent a parallel/)
    })

    it('omits the section when siblings is undefined', () => {
      const prompt = buildHtmlGenerationPrompt({ userPrompt: 'A widget' })
      expect(prompt).not.toContain('## Existing project design system')
    })

    it('omits the section when siblings is an empty object', () => {
      const prompt = buildHtmlGenerationPrompt({ userPrompt: 'A widget', siblings: {} })
      expect(prompt).not.toContain('## Existing project design system')
    })

    it('omits the section when all sibling values are blank', () => {
      // Whitespace-only entries are effectively absent; the prompt should
      // not produce a header with empty fences below.
      const prompt = buildHtmlGenerationPrompt({
        userPrompt: 'A widget',
        siblings: { 'empty.tok': '   \n\n  ' },
      })
      expect(prompt).not.toContain('## Existing project design system')
    })

    it('appears before the constraints block (LLM reads context first)', () => {
      // Order matters for prompt comprehension: the design system must be
      // visible to the LLM before it processes the constraints, otherwise
      // the constraints (e.g. "single accent color") are interpreted in a
      // vacuum.
      const prompt = buildHtmlGenerationPrompt({
        userPrompt: 'Cards',
        siblings: { 'tokens.tok': 'brand.bg: #2271C1' },
      })
      const designIdx = prompt.indexOf('## Existing project design system')
      const constraintsIdx = prompt.indexOf('## Hard constraints')
      expect(designIdx).toBeGreaterThan(-1)
      expect(constraintsIdx).toBeGreaterThan(-1)
      expect(designIdx).toBeLessThan(constraintsIdx)
    })

    it('works with the sketch branch as well as the userPrompt branch', () => {
      const prompt = buildHtmlGenerationPrompt({
        sketch: 'Btn "Save"',
        siblings: { 'tokens.tok': 'brand.bg: #2271C1' },
      })
      expect(prompt).toContain('## Existing project design system')
      expect(prompt).toContain('brand.bg: #2271C1')
    })
  })
})

// =============================================================================
// buildTranslationPrompt — Stage 2
// =============================================================================

describe('buildTranslationPrompt', () => {
  const html = '<!doctype html><html><body><div>Hello</div></body></html>'
  const baseInput: TranslationPromptInput = { html }

  describe('always-present sections', () => {
    const prompt = buildTranslationPrompt(baseInput)

    it('opens with the translator role statement', () => {
      // First non-empty line should be the role — keeps the LLM grounded
      // even when long context blocks follow.
      const firstLine = prompt.split('\n').find(l => l.trim().length > 0)
      expect(firstLine).toMatch(/translating an HTML\/CSS\/JS UI into Mirror DSL/)
    })

    it('points the LLM at CLAUDE.md as the authoritative DSL reference', () => {
      // The Mirror DSL reference lives in CLAUDE.md (project root); the
      // translator must be told to read it. Without this hint the LLM
      // hallucinates DSL shapes.
      expect(prompt).toMatch(/CLAUDE\.md/)
      expect(prompt).toMatch(/authoritative reference/i)
    })

    it('embeds the source HTML in a fenced html code block', () => {
      expect(prompt).toContain('## Source HTML')
      expect(prompt).toMatch(/```html\n<!doctype html>/)
    })

    it('emits the canonical translation guidelines', () => {
      // The guidelines are the spike-validated mapping rules. We pin a
      // few stable anchors rather than the full text so refinements
      // don't churn the test.
      expect(prompt).toContain('## Translation guidelines')
      expect(prompt).toMatch(/`div→Frame`/)
      expect(prompt).toMatch(/`gap N`/)
      expect(prompt).toMatch(/State blocks must NOT be nested/)
      expect(prompt).toMatch(/Do NOT emit a top-level `canvas` declaration/)
    })

    it('emits the output rules (no fences, no prose)', () => {
      expect(prompt).toContain('## Output rules')
      expect(prompt).toMatch(/no markdown code fences/i)
      expect(prompt).toMatch(/Output ONLY the Mirror DSL/)
    })
  })

  describe('TranslationContext block', () => {
    it('omits the context block entirely when no context is supplied', () => {
      const prompt = buildTranslationPrompt(baseInput)
      expect(prompt).not.toContain('## Context')
    })

    it('omits the context block when an object is supplied with no usable fields', () => {
      const prompt = buildTranslationPrompt({ html, context: {} })
      expect(prompt).not.toContain('## Context')
    })

    it('emits only the fields that were set (partial context)', () => {
      const prompt = buildTranslationPrompt({
        html,
        context: { type: 'Stat card' },
      })
      expect(prompt).toContain('## Context')
      expect(prompt).toContain('Type:')
      expect(prompt).toContain('Stat card')
      expect(prompt).not.toContain('Purpose:')
      expect(prompt).not.toContain('Design intent:')
    })

    it('emits all three fields when fully populated', () => {
      const context: TranslationContext = {
        type: 'Profile card',
        purpose: 'Identifies a user; primary actions Follow, Message',
        designIntent: 'Restrained editorial — single accent, no decorative shadows',
      }
      const prompt = buildTranslationPrompt({ html, context })
      expect(prompt).toContain('Type:           Profile card')
      expect(prompt).toContain('Purpose:        Identifies a user')
      expect(prompt).toContain('Design intent:  Restrained editorial')
    })

    it('places the context block before sibling files and source HTML', () => {
      // Ordering matters: the context primes the translator's intent
      // before the project context (constraints) and source artifact.
      const prompt = buildTranslationPrompt({
        html,
        context: { type: 'Stat card' },
        siblings: { 'tokens.tok': 'primary.bg: #2271C1' },
      })
      const ctxIdx = prompt.indexOf('## Context')
      const sibIdx = prompt.indexOf('## Project context')
      const htmlIdx = prompt.indexOf('## Source HTML')
      expect(ctxIdx).toBeGreaterThan(0)
      expect(sibIdx).toBeGreaterThan(ctxIdx)
      expect(htmlIdx).toBeGreaterThan(sibIdx)
    })
  })

  describe('sibling project files', () => {
    it('omits the project block when siblings is undefined', () => {
      const prompt = buildTranslationPrompt({ html })
      expect(prompt).not.toContain('## Project context')
    })

    it('omits the project block when siblings is empty', () => {
      const prompt = buildTranslationPrompt({ html, siblings: {} })
      expect(prompt).not.toContain('## Project context')
    })

    it('omits the project block when all sibling contents are blank/whitespace', () => {
      // Common in fresh projects — empty placeholder files exist on disk
      // but contain no usable definitions. Stripping them keeps the
      // prompt focused.
      const prompt = buildTranslationPrompt({
        html,
        siblings: { 'tokens.tok': '', 'components.com': '   \n\n  ' },
      })
      expect(prompt).not.toContain('## Project context')
    })

    it('embeds each non-empty sibling in its own fenced block, labeled by filename', () => {
      const prompt = buildTranslationPrompt({
        html,
        siblings: {
          'tokens.tok': 'primary.bg: #2271C1',
          'components.com': 'Btn: pad 8 16, rad 6',
        },
      })
      expect(prompt).toContain('## Project context')
      expect(prompt).toContain('**tokens.tok**')
      expect(prompt).toContain('**components.com**')
      expect(prompt).toMatch(/```\s*\nprimary\.bg: #2271C1\s*\n```/)
      expect(prompt).toMatch(/```\s*\nBtn: pad 8 16, rad 6\s*\n```/)
    })

    it('skips empty siblings but keeps non-empty ones', () => {
      const prompt = buildTranslationPrompt({
        html,
        siblings: {
          'tokens.tok': 'primary.bg: #2271C1',
          'empty.com': '',
          'whitespace.tok': '   \n  ',
        },
      })
      expect(prompt).toContain('**tokens.tok**')
      expect(prompt).not.toContain('**empty.com**')
      expect(prompt).not.toContain('**whitespace.tok**')
    })

    it('frames the sibling list as "reuse, do not redefine"', () => {
      // The translator's incentive is to invent parallel tokens/components
      // unless told otherwise. The framing must explicitly steer reuse.
      const prompt = buildTranslationPrompt({
        html,
        siblings: { 'tokens.tok': 'primary.bg: #2271C1' },
      })
      expect(prompt).toMatch(/reuse existing tokens/i)
    })
  })

  describe('retry context', () => {
    const validationErrors: ValidationError[] = [
      {
        severity: 'error',
        code: 'E100',
        message: 'Token "$missing" is not defined',
        line: 5,
        column: 8,
        suggestion: 'Add `missing.bg: ...` to a tokens file',
      },
      {
        severity: 'error',
        code: 'PIPELINE_NESTED_STATE',
        message: 'Nested state block "hover:" inside "on:"',
        line: 10,
        column: 4,
      },
    ]
    const previousMirror = 'Frame bg $missing\n  on:\n    hover:\n      bg #f00'

    it('omits the retry block on the first attempt (no retryContext)', () => {
      const prompt = buildTranslationPrompt({ html })
      expect(prompt).not.toContain('## Previous attempt')
    })

    it('embeds the previous Mirror output in a fenced mirror block', () => {
      const prompt = buildTranslationPrompt({
        html,
        retryContext: { validationErrors, previousMirror },
      })
      expect(prompt).toContain('## Previous attempt')
      expect(prompt).toMatch(/```mirror\nFrame bg \$missing/)
      expect(prompt).toContain('on:\n    hover:\n      bg #f00')
    })

    it('formats each validation error with code, line, column, message, suggestion', () => {
      const prompt = buildTranslationPrompt({
        html,
        retryContext: { validationErrors, previousMirror },
      })
      expect(prompt).toMatch(/\[E100\] line 5, col 8: Token "\$missing" is not defined/)
      expect(prompt).toMatch(/hint: Add `missing\.bg: \.\.\.` to a tokens file/)
      expect(prompt).toMatch(/\[PIPELINE_NESTED_STATE\] line 10, col 4: Nested state block/)
    })

    it('omits the hint suffix when the validator did not provide one', () => {
      const prompt = buildTranslationPrompt({
        html,
        retryContext: {
          validationErrors: [
            {
              severity: 'error',
              code: 'E200',
              message: 'Generic syntax error',
              line: 1,
              column: 1,
            },
          ],
          previousMirror: 'Frame',
        },
      })
      expect(prompt).toContain('[E200] line 1, col 1: Generic syntax error')
      expect(prompt).not.toMatch(/Generic syntax error\s*—\s*hint:/)
    })

    it('frames the retry as repair-not-restart so the LLM keeps correct prior work', () => {
      const prompt = buildTranslationPrompt({
        html,
        retryContext: { validationErrors, previousMirror },
      })
      expect(prompt).toMatch(/Repair it; do not start from scratch/i)
      expect(prompt).toMatch(/Keep everything that was already correct/i)
    })

    it('places the retry block AFTER guidelines but BEFORE output rules', () => {
      // Putting it before guidelines would let the LLM forget the
      // mapping rules between attempts. Putting it after output rules
      // would risk fence-wrapping leakage.
      const prompt = buildTranslationPrompt({
        html,
        retryContext: { validationErrors, previousMirror },
      })
      const guideIdx = prompt.indexOf('## Translation guidelines')
      const retryIdx = prompt.indexOf('## Previous attempt')
      const outputIdx = prompt.indexOf('## Output rules')
      expect(guideIdx).toBeGreaterThan(0)
      expect(retryIdx).toBeGreaterThan(guideIdx)
      expect(outputIdx).toBeGreaterThan(retryIdx)
    })
  })

  describe('combined inputs (full context)', () => {
    it('emits sections in the documented order: role → CLAUDE.md → context → siblings → HTML → guidelines → retry → output rules', () => {
      const prompt = buildTranslationPrompt({
        html,
        context: { type: 'Card' },
        siblings: { 'tokens.tok': 'primary.bg: #fff' },
        retryContext: {
          validationErrors: [{ severity: 'error', code: 'X', message: 'oops', line: 1, column: 1 }],
          previousMirror: 'Frame',
        },
      })

      const sections = [
        'translating an HTML/CSS/JS UI into Mirror DSL',
        'CLAUDE.md',
        '## Context',
        '## Project context',
        '## Source HTML',
        '## Translation guidelines',
        '## Previous attempt',
        '## Output rules',
      ]

      let lastIdx = -1
      for (const section of sections) {
        const idx = prompt.indexOf(section)
        expect(idx, `section "${section}" missing or out of order`).toBeGreaterThan(lastIdx)
        lastIdx = idx
      }
    })
  })
})
