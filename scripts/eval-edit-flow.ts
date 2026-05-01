/**
 * Eval-Driver für den LLM-Edit-Flow (T2.5 Skeleton).
 *
 * Misst die End-to-End-Qualität: production prompt-builder → claude CLI →
 * production patch-parser/applier → compile-check → assertions.
 *
 * Bewusst klein gehalten: 1 Scenario pro Modus als Starter. Per Plan
 * (T2.5 DoD) kommen wir auf "5 Beispiele pro Modus" — Scenarios werden
 * **einzeln** dazugebaut + sofort mit `--only=ID` getestet, nicht im
 * Big-Bang (siehe Memory-Feedback `eval_scenarios_incremental`).
 *
 * Run:
 *   npx tsx scripts/eval-edit-flow.ts                 # alle Scenarios
 *   npx tsx scripts/eval-edit-flow.ts --only=mode1-1  # nur ein Scenario
 *   npx tsx scripts/eval-edit-flow.ts --list          # IDs auflisten
 *   npx tsx scripts/eval-edit-flow.ts --mode=2        # nur Modus 2
 *
 * Foreground, sichtbar, kein Background. Pro Scenario ~5-15s (claude CLI).
 */

import { spawn } from 'child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { buildEditPrompt, type EditCaptureCtx } from '../studio/agent/edit-prompts'
import { parsePatchResponse, type Patch } from '../studio/agent/patch-format'
import { applyPatches, type ApplyResult } from '../studio/agent/patch-applier'

// =============================================================================
// SCENARIO TYPES
// =============================================================================

type EditMode = 1 | 2 | 3

interface AssertContext {
  patches: Patch[]
  parseErrors: string[]
  apply: ApplyResult
  finalSource: string | null
  compileOk: boolean
}

interface Assertion {
  label: string
  check: (ctx: AssertContext) => { pass: boolean; detail?: string }
}

interface EditScenario {
  id: string
  label: string
  mode: EditMode
  /** Project files (for compile-check). currentFile must exist as a key. */
  files: Record<string, string>
  currentFile: string
  ctx: EditCaptureCtx
  asserts: Assertion[]
}

// =============================================================================
// ASSERT BUILDERS
// =============================================================================

const must = {
  applies: (label = 'patches apply cleanly'): Assertion => ({
    label,
    check: ctx => ({
      pass: ctx.apply.success,
      detail: ctx.apply.success
        ? undefined
        : `failed: ${ctx.apply.retryHints?.map(h => `${h.reason}(${h.matchCount}×)`).join(', ')}`,
    }),
  }),
  finalContains: (needle: string | RegExp, label?: string): Assertion => ({
    label: label ?? `final source contains ${describe(needle)}`,
    check: ctx => {
      if (!ctx.finalSource) return { pass: false, detail: 'no final source' }
      return {
        pass: matches(ctx.finalSource, needle),
        detail: matches(ctx.finalSource, needle) ? undefined : 'not found',
      }
    },
  }),
  finalNotContains: (needle: string | RegExp, label?: string): Assertion => ({
    label: label ?? `final source does not contain ${describe(needle)}`,
    check: ctx => {
      if (!ctx.finalSource) return { pass: false, detail: 'no final source' }
      return {
        pass: !matches(ctx.finalSource, needle),
        detail: matches(ctx.finalSource, needle) ? 'unexpected match' : undefined,
      }
    },
  }),
  compiles: (label = 'final source compiles'): Assertion => ({
    label,
    check: ctx => ({
      pass: ctx.compileOk,
      detail: ctx.compileOk ? undefined : 'compile failed',
    }),
  }),
  patchCount: (n: number, label?: string): Assertion => ({
    label: label ?? `produces exactly ${n} patch${n === 1 ? '' : 'es'}`,
    check: ctx => ({
      pass: ctx.patches.length === n,
      detail: ctx.patches.length === n ? undefined : `got ${ctx.patches.length}`,
    }),
  }),
}

function matches(s: string, n: string | RegExp): boolean {
  return typeof n === 'string' ? s.includes(n) : n.test(s)
}

function describe(n: string | RegExp): string {
  return typeof n === 'string' ? `"${n.length > 30 ? n.slice(0, 27) + '…' : n}"` : `/${n.source}/`
}

// =============================================================================
// SCENARIOS — 1 starter pro Modus. Erweitern auf je 5 (Plan T2.5 DoD).
// =============================================================================

const SCENARIOS: EditScenario[] = [
  // ─── MODUS 1: Cmd+Enter ohne Selection / ohne Instruction ──────────────
  {
    id: 'mode1-1',
    label: 'whole-doc: typo in button text',
    mode: 1,
    files: {
      'app.mir': 'canvas mobile, bg #1a1a1a\n\nButton "Speihern", bg #2271C1, col white',
    },
    currentFile: 'app.mir',
    ctx: {
      source: 'canvas mobile, bg #1a1a1a\n\nButton "Speihern", bg #2271C1, col white',
      fileName: 'app.mir',
      cursor: { line: 3, col: 1 },
      selection: null,
      instruction: null,
      diffSinceLastCall: '',
      projectFiles: { tokens: {}, components: {} },
    },
    asserts: [
      must.applies(),
      must.finalContains('Speichern'),
      must.finalNotContains('Speihern'),
      must.compiles(),
    ],
  },

  {
    id: 'mode1-2',
    label: 'whole-doc: change a single hex color (frame bg)',
    mode: 1,
    files: {
      'app.mir': 'canvas mobile, bg #1a1a1a\n\nFrame pad 16, bg #ef4444, rad 8\n  Text "Alert"',
    },
    currentFile: 'app.mir',
    ctx: {
      source: 'canvas mobile, bg #1a1a1a\n\nFrame pad 16, bg #ef4444, rad 8\n  Text "Alert"',
      fileName: 'app.mir',
      cursor: { line: 3, col: 1 },
      selection: null,
      // Mode 1 = whole-doc improve. We don't say what to change; the LLM
      // should pick the obvious red→blue or red→token improvement.
      // Hard test: it has to GUESS intent. We accept any non-#ef4444 bg
      // as long as it compiles and the structure stays.
      instruction: null,
      diffSinceLastCall: '',
      projectFiles: { tokens: {}, components: {} },
    },
    asserts: [
      // Mode 1 with no instruction is open-ended — tolerate "no-change"
      // (LLM judges the source acceptable) OR a clean apply.
      {
        label: 'either applies cleanly OR returns no-change (both valid in mode 1)',
        check: ctx => {
          const noChange = ctx.patches.length === 0 && ctx.parseErrors.length === 0
          return {
            pass: ctx.apply.success || noChange,
            detail: ctx.apply.success
              ? 'applied'
              : noChange
                ? 'no-change'
                : `failed: ${ctx.apply.retryHints?.map(h => h.reason).join(', ')}`,
          }
        },
      },
      {
        label: 'if patches applied, source still compiles',
        check: ctx => ({
          pass: ctx.patches.length === 0 || ctx.compileOk,
          detail: ctx.compileOk ? undefined : 'compile failed',
        }),
      },
    ],
  },

  {
    id: 'mode1-3',
    label: 'whole-doc: missing comma between two properties',
    mode: 1,
    files: {
      // `bg #2271C1 col white` is missing the comma after #2271C1.
      'app.mir': 'canvas mobile\n\nButton "OK", bg #2271C1 col white, pad 12 24',
    },
    currentFile: 'app.mir',
    ctx: {
      source: 'canvas mobile\n\nButton "OK", bg #2271C1 col white, pad 12 24',
      fileName: 'app.mir',
      cursor: { line: 3, col: 1 },
      selection: null,
      instruction: null,
      diffSinceLastCall: '',
      projectFiles: { tokens: {}, components: {} },
    },
    asserts: [must.applies(), must.finalContains(/bg #2271C1, col white/), must.compiles()],
  },

  {
    id: 'mode1-4',
    label: 'whole-doc: clean code stays clean (no-change)',
    mode: 1,
    files: {
      'app.mir':
        'canvas mobile, bg #1a1a1a\n\nFrame pad 16, gap 12\n  Text "Hello", col white, fs 18\n  Button "OK", bg #2271C1, col white, pad 10 20, rad 6',
    },
    currentFile: 'app.mir',
    ctx: {
      source:
        'canvas mobile, bg #1a1a1a\n\nFrame pad 16, gap 12\n  Text "Hello", col white, fs 18\n  Button "OK", bg #2271C1, col white, pad 10 20, rad 6',
      fileName: 'app.mir',
      cursor: { line: 1, col: 1 },
      selection: null,
      instruction: null,
      diffSinceLastCall: '',
      projectFiles: { tokens: {}, components: {} },
    },
    asserts: [
      // For clean idiomatic code, "no-change" is the right answer.
      // We accept either: no-change OR a clean apply that doesn't break
      // the structure. Anything that breaks compilation is a fail.
      {
        label: 'no-change OR applies cleanly',
        check: ctx => {
          const noChange = ctx.patches.length === 0 && ctx.parseErrors.length === 0
          return {
            pass: noChange || ctx.apply.success,
            detail: noChange ? 'no-change' : ctx.apply.success ? 'applied' : 'broken',
          }
        },
      },
      {
        label: 'if patches applied, source still compiles',
        check: ctx => ({
          pass: ctx.patches.length === 0 || ctx.compileOk,
          detail: ctx.compileOk ? undefined : 'compile failed',
        }),
      },
    ],
  },

  {
    id: 'mode1-5',
    label: 'whole-doc: misspelled property (`paddng` → `pad`)',
    mode: 1,
    files: {
      'app.mir': 'canvas mobile\n\nFrame paddng 16, gap 12\n  Text "Hello"',
    },
    currentFile: 'app.mir',
    ctx: {
      source: 'canvas mobile\n\nFrame paddng 16, gap 12\n  Text "Hello"',
      fileName: 'app.mir',
      cursor: { line: 3, col: 1 },
      selection: null,
      instruction: null,
      diffSinceLastCall: '',
      projectFiles: { tokens: {}, components: {} },
    },
    asserts: [
      must.applies(),
      must.finalContains(/\bpad 16\b/),
      must.finalNotContains('paddng'),
      must.compiles(),
    ],
  },

  {
    id: 'mode1-6',
    label: 'whole-doc: trailing comma + extra space (cosmetic)',
    mode: 1,
    files: {
      'app.mir': 'canvas mobile\n\nButton "OK",  bg #2271C1, col white,',
    },
    currentFile: 'app.mir',
    ctx: {
      source: 'canvas mobile\n\nButton "OK",  bg #2271C1, col white,',
      fileName: 'app.mir',
      cursor: { line: 3, col: 1 },
      selection: null,
      instruction: null,
      diffSinceLastCall: '',
      projectFiles: { tokens: {}, components: {} },
    },
    asserts: [
      // Either no-change OR a clean fix.
      {
        label: 'no-change OR applies cleanly',
        check: ctx => {
          const noChange = ctx.patches.length === 0 && ctx.parseErrors.length === 0
          return { pass: noChange || ctx.apply.success }
        },
      },
      {
        label: 'if patches applied, compiles',
        check: ctx => ({
          pass: ctx.patches.length === 0 || ctx.compileOk,
          detail: ctx.compileOk ? undefined : 'compile failed',
        }),
      },
    ],
  },

  {
    id: 'mode1-7',
    label: 'whole-doc: malformed icon name (missing quotes)',
    mode: 1,
    files: { 'app.mir': 'canvas mobile\n\nIcon check, ic #10b981, is 20' },
    currentFile: 'app.mir',
    ctx: {
      source: 'canvas mobile\n\nIcon check, ic #10b981, is 20',
      fileName: 'app.mir',
      cursor: { line: 3, col: 1 },
      selection: null,
      instruction: null,
      diffSinceLastCall: '',
      projectFiles: { tokens: {}, components: {} },
    },
    asserts: [must.applies(), must.finalContains('Icon "check"'), must.compiles()],
  },

  {
    id: 'mode1-10',
    label: 'whole-doc: well-structured card stays valid (semantic invariant)',
    mode: 1,
    files: {
      'app.mir':
        'canvas mobile, bg #1a1a1a\n\nFrame pad 16, gap 12, bg #222, rad 8\n  Text "Profil", col white, fs 18, weight bold\n  Text "Max Mustermann", col #888\n  Frame hor, gap 8\n    Button "Bearbeiten", bg #2271C1, col white\n    Button "Löschen", bg #ef4444, col white',
    },
    currentFile: 'app.mir',
    ctx: {
      source:
        'canvas mobile, bg #1a1a1a\n\nFrame pad 16, gap 12, bg #222, rad 8\n  Text "Profil", col white, fs 18, weight bold\n  Text "Max Mustermann", col #888\n  Frame hor, gap 8\n    Button "Bearbeiten", bg #2271C1, col white\n    Button "Löschen", bg #ef4444, col white',
      fileName: 'app.mir',
      cursor: { line: 1, col: 1 },
      selection: null,
      instruction: null,
      diffSinceLastCall: '',
      projectFiles: { tokens: {}, components: {} },
    },
    asserts: [
      // Whatever the LLM does, the structure must remain valid and the
      // two buttons + the heading must survive.
      {
        label: 'no-change OR applies cleanly',
        check: ctx => {
          const noChange = ctx.patches.length === 0 && ctx.parseErrors.length === 0
          return { pass: noChange || ctx.apply.success }
        },
      },
      must.finalContains('Bearbeiten'),
      must.finalContains('Löschen'),
      must.finalContains('Profil'),
      {
        label: 'if patches applied, compiles',
        check: ctx => ({
          pass: ctx.patches.length === 0 || ctx.compileOk,
          detail: ctx.compileOk ? undefined : 'compile failed',
        }),
      },
    ],
  },

  {
    id: 'mode1-9',
    label: 'whole-doc: duplicate property in element',
    mode: 1,
    files: { 'app.mir': 'canvas mobile\n\nFrame ver, ver, gap 8\n  Text "A"\n  Text "B"' },
    currentFile: 'app.mir',
    ctx: {
      source: 'canvas mobile\n\nFrame ver, ver, gap 8\n  Text "A"\n  Text "B"',
      fileName: 'app.mir',
      cursor: { line: 3, col: 1 },
      selection: null,
      instruction: null,
      diffSinceLastCall: '',
      projectFiles: { tokens: {}, components: {} },
    },
    asserts: [
      // Open-ended; either the LLM removes the duplicate or it leaves alone.
      {
        label: 'no-change OR applies cleanly',
        check: ctx => {
          const noChange = ctx.patches.length === 0 && ctx.parseErrors.length === 0
          return { pass: noChange || ctx.apply.success }
        },
      },
      {
        label: 'if patches applied, compiles',
        check: ctx => ({
          pass: ctx.patches.length === 0 || ctx.compileOk,
          detail: ctx.compileOk ? undefined : 'compile failed',
        }),
      },
    ],
  },

  {
    id: 'mode1-8',
    label: 'whole-doc: extra blank lines (cosmetic) — accept any cleanup',
    mode: 1,
    files: {
      'app.mir': 'canvas mobile\n\n\n\n\nFrame gap 8\n  Text "A"\n\n\n  Text "B"',
    },
    currentFile: 'app.mir',
    ctx: {
      source: 'canvas mobile\n\n\n\n\nFrame gap 8\n  Text "A"\n\n\n  Text "B"',
      fileName: 'app.mir',
      cursor: { line: 1, col: 1 },
      selection: null,
      instruction: null,
      diffSinceLastCall: '',
      projectFiles: { tokens: {}, components: {} },
    },
    asserts: [
      {
        label: 'no-change OR applies cleanly',
        check: ctx => {
          const noChange = ctx.patches.length === 0 && ctx.parseErrors.length === 0
          return { pass: noChange || ctx.apply.success }
        },
      },
      {
        label: 'if patches applied, compiles',
        check: ctx => ({
          pass: ctx.patches.length === 0 || ctx.compileOk,
          detail: ctx.compileOk ? undefined : 'compile failed',
        }),
      },
    ],
  },

  // ─── MODUS 2: Cmd+Enter MIT Selection (focused edit) ───────────────────
  {
    id: 'mode2-1',
    label: 'selection: change selected button background',
    mode: 2,
    files: {
      'app.mir':
        'canvas mobile\n\nFrame gap 12\n  Button "Save", bg #2271C1\n  Button "Cancel", bg #333',
    },
    currentFile: 'app.mir',
    ctx: {
      source:
        'canvas mobile\n\nFrame gap 12\n  Button "Save", bg #2271C1\n  Button "Cancel", bg #333',
      fileName: 'app.mir',
      cursor: { line: 4, col: 3 },
      selection: {
        // Range covering the Save button line.
        from: 32,
        to: 64,
        text: '  Button "Save", bg #2271C1',
      },
      instruction: null,
      diffSinceLastCall: '',
      projectFiles: { tokens: {}, components: {} },
    },
    asserts: [
      must.applies(),
      // The selected line should change; the Cancel line should stay.
      must.finalContains('Cancel'),
      must.compiles(),
    ],
  },

  {
    id: 'mode2-2',
    label: 'selection: improve selected text element typography',
    mode: 2,
    files: {
      'app.mir':
        'canvas mobile\n\nFrame gap 8\n  Text "Welcome", fs 14, col #888\n  Text "Description"',
    },
    currentFile: 'app.mir',
    ctx: {
      source:
        'canvas mobile\n\nFrame gap 8\n  Text "Welcome", fs 14, col #888\n  Text "Description"',
      fileName: 'app.mir',
      cursor: { line: 4, col: 3 },
      selection: {
        from: 22,
        to: 53,
        text: '  Text "Welcome", fs 14, col #888',
      },
      instruction: null,
      diffSinceLastCall: '',
      projectFiles: { tokens: {}, components: {} },
    },
    asserts: [
      // Mode 2 without instruction is also open-ended — accept apply
      // success OR no-change.
      {
        label: 'either applies cleanly OR returns no-change',
        check: ctx => {
          const noChange = ctx.patches.length === 0 && ctx.parseErrors.length === 0
          return {
            pass: ctx.apply.success || noChange,
            detail: ctx.apply.success ? 'applied' : noChange ? 'no-change' : 'apply failed',
          }
        },
      },
      // The Description line must NOT be touched (selection bounds the edit).
      must.finalContains('Text "Description"'),
      {
        label: 'if patches applied, source still compiles',
        check: ctx => ({
          pass: ctx.patches.length === 0 || ctx.compileOk,
          detail: ctx.compileOk ? undefined : 'compile failed',
        }),
      },
    ],
  },

  {
    id: 'mode2-3',
    label: 'selection: replace selected hardcoded color with token',
    mode: 2,
    files: {
      'app.mir': 'canvas mobile\n\nFrame gap 8\n  Button "Save", bg #2271C1\n  Button "Cancel"',
      'tokens.tok': 'primary.bg: #2271C1',
    },
    currentFile: 'app.mir',
    ctx: {
      source: 'canvas mobile\n\nFrame gap 8\n  Button "Save", bg #2271C1\n  Button "Cancel"',
      fileName: 'app.mir',
      cursor: { line: 4, col: 25 },
      selection: {
        from: 50, // position of "#2271C1"
        to: 57,
        text: '#2271C1',
      },
      instruction: null,
      diffSinceLastCall: '',
      projectFiles: {
        tokens: { 'tokens.tok': 'primary.bg: #2271C1' },
        components: {},
      },
    },
    asserts: [
      must.applies(),
      must.finalContains('$primary'),
      must.finalNotContains('#2271C1'),
      must.compiles(),
    ],
  },

  {
    id: 'mode2-4',
    label: 'selection: change selected fs (font-size) to a larger value',
    mode: 2,
    files: {
      'app.mir':
        'canvas mobile\n\nFrame gap 8\n  Text "Title", fs 14, weight bold\n  Text "Body", fs 14',
    },
    currentFile: 'app.mir',
    ctx: {
      source:
        'canvas mobile\n\nFrame gap 8\n  Text "Title", fs 14, weight bold\n  Text "Body", fs 14',
      fileName: 'app.mir',
      cursor: { line: 4, col: 22 },
      selection: {
        from: 38, // selecting "fs 14" on the Title line only
        to: 43,
        text: 'fs 14',
      },
      instruction: null,
      diffSinceLastCall: '',
      projectFiles: { tokens: {}, components: {} },
    },
    asserts: [
      // Open-ended (no instruction) — accept apply or no-change.
      {
        label: 'either applies cleanly OR returns no-change',
        check: ctx => {
          const noChange = ctx.patches.length === 0 && ctx.parseErrors.length === 0
          return { pass: ctx.apply.success || noChange }
        },
      },
      // Body line untouched.
      must.finalContains('Text "Body"'),
      {
        label: 'if patches applied, compiles',
        check: ctx => ({
          pass: ctx.patches.length === 0 || ctx.compileOk,
          detail: ctx.compileOk ? undefined : 'compile failed',
        }),
      },
    ],
  },

  {
    id: 'mode2-5',
    label: 'selection: change selected layout direction',
    mode: 2,
    files: {
      'app.mir': 'canvas mobile\n\nFrame ver, gap 8\n  Button "A"\n  Button "B"\n  Button "C"',
    },
    currentFile: 'app.mir',
    ctx: {
      source: 'canvas mobile\n\nFrame ver, gap 8\n  Button "A"\n  Button "B"\n  Button "C"',
      fileName: 'app.mir',
      cursor: { line: 3, col: 7 },
      selection: {
        from: 21, // selecting "ver"
        to: 24,
        text: 'ver',
      },
      instruction: null,
      diffSinceLastCall: '',
      projectFiles: { tokens: {}, components: {} },
    },
    asserts: [
      {
        label: 'either applies cleanly OR returns no-change',
        check: ctx => {
          const noChange = ctx.patches.length === 0 && ctx.parseErrors.length === 0
          return { pass: ctx.apply.success || noChange }
        },
      },
      must.finalContains('Button "C"'),
      {
        label: 'if patches applied, compiles',
        check: ctx => ({
          pass: ctx.patches.length === 0 || ctx.compileOk,
          detail: ctx.compileOk ? undefined : 'compile failed',
        }),
      },
    ],
  },

  {
    id: 'mode2-6',
    label: 'selection: change selected pad value',
    mode: 2,
    files: {
      'app.mir': 'canvas mobile\n\nFrame pad 8, gap 4\n  Text "Hello"',
    },
    currentFile: 'app.mir',
    ctx: {
      source: 'canvas mobile\n\nFrame pad 8, gap 4\n  Text "Hello"',
      fileName: 'app.mir',
      cursor: { line: 3, col: 12 },
      selection: {
        from: 21, // selecting "pad 8"
        to: 26,
        text: 'pad 8',
      },
      instruction: null,
      diffSinceLastCall: '',
      projectFiles: { tokens: {}, components: {} },
    },
    asserts: [
      {
        label: 'either applies cleanly OR returns no-change',
        check: ctx => {
          const noChange = ctx.patches.length === 0 && ctx.parseErrors.length === 0
          return { pass: ctx.apply.success || noChange }
        },
      },
      {
        label: 'if patches applied, compiles',
        check: ctx => ({
          pass: ctx.patches.length === 0 || ctx.compileOk,
          detail: ctx.compileOk ? undefined : 'compile failed',
        }),
      },
    ],
  },

  {
    id: 'mode2-7',
    label: 'selection: change selected text content',
    mode: 2,
    files: { 'app.mir': 'canvas mobile\n\nText "Hello World"' },
    currentFile: 'app.mir',
    ctx: {
      source: 'canvas mobile\n\nText "Hello World"',
      fileName: 'app.mir',
      cursor: { line: 3, col: 7 },
      selection: { from: 21, to: 32, text: 'Hello World' },
      instruction: null,
      diffSinceLastCall: '',
      projectFiles: { tokens: {}, components: {} },
    },
    asserts: [
      {
        label: 'either applies cleanly OR returns no-change',
        check: ctx => {
          const noChange = ctx.patches.length === 0 && ctx.parseErrors.length === 0
          return { pass: ctx.apply.success || noChange }
        },
      },
      {
        label: 'if patches applied, compiles',
        check: ctx => ({
          pass: ctx.patches.length === 0 || ctx.compileOk,
          detail: ctx.compileOk ? undefined : 'compile failed',
        }),
      },
    ],
  },

  {
    id: 'mode2-10',
    label: 'selection: malformed selected snippet (missing comma)',
    mode: 2,
    files: { 'app.mir': 'canvas mobile\n\nButton "OK" bg #2271C1, col white' },
    currentFile: 'app.mir',
    ctx: {
      source: 'canvas mobile\n\nButton "OK" bg #2271C1, col white',
      fileName: 'app.mir',
      cursor: { line: 3, col: 5 },
      selection: {
        from: 15, // selecting "Button "OK" bg #2271C1"
        to: 37,
        text: 'Button "OK" bg #2271C1',
      },
      instruction: null,
      diffSinceLastCall: '',
      projectFiles: { tokens: {}, components: {} },
    },
    asserts: [must.applies(), must.finalContains(/Button "OK", bg #2271C1/), must.compiles()],
  },

  {
    id: 'mode2-9',
    label: 'selection: multi-line frame selected, leave outer frame untouched',
    mode: 2,
    files: {
      'app.mir':
        'canvas mobile\n\nFrame pad 16, gap 12\n  Frame hor, gap 8\n    Text "Left"\n    Text "Right"\n  Button "Submit"',
    },
    currentFile: 'app.mir',
    ctx: {
      source:
        'canvas mobile\n\nFrame pad 16, gap 12\n  Frame hor, gap 8\n    Text "Left"\n    Text "Right"\n  Button "Submit"',
      fileName: 'app.mir',
      // Select the inner Frame block (lines 4-6).
      cursor: { line: 4, col: 3 },
      selection: {
        from: 38,
        to: 87,
        text: '  Frame hor, gap 8\n    Text "Left"\n    Text "Right"',
      },
      instruction: null,
      diffSinceLastCall: '',
      projectFiles: { tokens: {}, components: {} },
    },
    asserts: [
      {
        label: 'either applies cleanly OR returns no-change',
        check: ctx => {
          const noChange = ctx.patches.length === 0 && ctx.parseErrors.length === 0
          return { pass: ctx.apply.success || noChange }
        },
      },
      // Submit button must remain — selection bounds the edit.
      must.finalContains('Button "Submit"'),
      {
        label: 'if patches applied, compiles',
        check: ctx => ({
          pass: ctx.patches.length === 0 || ctx.compileOk,
          detail: ctx.compileOk ? undefined : 'compile failed',
        }),
      },
    ],
  },

  {
    id: 'mode2-8',
    label: 'selection: change selected button label',
    mode: 2,
    files: { 'app.mir': 'canvas mobile\n\nButton "Submit", bg #2271C1' },
    currentFile: 'app.mir',
    ctx: {
      source: 'canvas mobile\n\nButton "Submit", bg #2271C1',
      fileName: 'app.mir',
      cursor: { line: 3, col: 11 },
      selection: { from: 23, to: 29, text: 'Submit' },
      instruction: null,
      diffSinceLastCall: '',
      projectFiles: { tokens: {}, components: {} },
    },
    asserts: [
      {
        label: 'either applies cleanly OR returns no-change',
        check: ctx => {
          const noChange = ctx.patches.length === 0 && ctx.parseErrors.length === 0
          return { pass: ctx.apply.success || noChange }
        },
      },
      {
        label: 'if patches applied, compiles',
        check: ctx => ({
          pass: ctx.patches.length === 0 || ctx.compileOk,
          detail: ctx.compileOk ? undefined : 'compile failed',
        }),
      },
    ],
  },

  // ─── MODUS 3: Cmd+Shift+Enter (mit User-Anweisung) ─────────────────────
  {
    id: 'mode3-1',
    label: 'instruction: extract repeated style as token',
    mode: 3,
    files: {
      'app.mir':
        'canvas mobile\n\nFrame gap 12\n  Text "Title", col #2271C1, fs 18\n  Text "Sub", col #2271C1, fs 14',
      'tokens.tok': 'primary.col: #2271C1',
    },
    currentFile: 'app.mir',
    ctx: {
      source:
        'canvas mobile\n\nFrame gap 12\n  Text "Title", col #2271C1, fs 18\n  Text "Sub", col #2271C1, fs 14',
      fileName: 'app.mir',
      cursor: { line: 1, col: 1 },
      selection: null,
      instruction: 'Verwende den $primary Token für die col-Properties statt #2271C1',
      diffSinceLastCall: '',
      projectFiles: {
        tokens: { 'tokens.tok': 'primary.col: #2271C1' },
        components: {},
      },
    },
    asserts: [
      must.applies(),
      must.finalContains('$primary'),
      must.finalNotContains('#2271C1'),
      must.compiles(),
    ],
  },
  {
    id: 'mode3-7',
    label: 'instruction: add weight bold to a text',
    mode: 3,
    files: { 'app.mir': 'canvas mobile\n\nText "Headline", fs 24, col white' },
    currentFile: 'app.mir',
    ctx: {
      source: 'canvas mobile\n\nText "Headline", fs 24, col white',
      fileName: 'app.mir',
      cursor: { line: 1, col: 1 },
      selection: null,
      instruction: 'Mache den Text fett (weight bold)',
      diffSinceLastCall: '',
      projectFiles: { tokens: {}, components: {} },
    },
    asserts: [must.applies(), must.finalContains('weight bold'), must.compiles()],
  },
  {
    id: 'mode3-6',
    label: 'instruction: extract repeated color into a token',
    mode: 3,
    files: {
      'app.mir':
        'canvas mobile\n\nFrame gap 8\n  Button "A", bg #2271C1, col white\n  Button "B", bg #2271C1, col white\n  Button "C", bg #2271C1, col white',
      'tokens.tok': '',
    },
    currentFile: 'app.mir',
    ctx: {
      source:
        'canvas mobile\n\nFrame gap 8\n  Button "A", bg #2271C1, col white\n  Button "B", bg #2271C1, col white\n  Button "C", bg #2271C1, col white',
      fileName: 'app.mir',
      cursor: { line: 1, col: 1 },
      selection: null,
      instruction:
        'Definiere oben in der Datei einen Token `primary.bg: #2271C1` und ersetze alle Vorkommen von #2271C1 durch $primary',
      diffSinceLastCall: '',
      projectFiles: { tokens: { 'tokens.tok': '' }, components: {} },
    },
    asserts: [
      must.applies(),
      must.finalContains('primary.bg: #2271C1'),
      must.finalContains('$primary'),
      // Only the token definition should contain the literal — all
      // Button usages must reference $primary instead.
      {
        label: '#2271C1 appears exactly once (in the token definition)',
        check: ctx => {
          if (!ctx.finalSource) return { pass: false, detail: 'no final source' }
          const count = (ctx.finalSource.match(/#2271C1/g) ?? []).length
          return { pass: count === 1, detail: `count=${count}` }
        },
      },
      must.compiles(),
    ],
  },
  {
    id: 'mode3-5',
    label: 'instruction: convert vertical Frame to a 2-column grid',
    mode: 3,
    files: {
      'app.mir':
        'canvas mobile\n\nFrame gap 12, pad 16\n  Frame bg #2271C1, h 60\n  Frame bg #ef4444, h 60\n  Frame bg #10b981, h 60\n  Frame bg #f59e0b, h 60',
    },
    currentFile: 'app.mir',
    ctx: {
      source:
        'canvas mobile\n\nFrame gap 12, pad 16\n  Frame bg #2271C1, h 60\n  Frame bg #ef4444, h 60\n  Frame bg #10b981, h 60\n  Frame bg #f59e0b, h 60',
      fileName: 'app.mir',
      cursor: { line: 1, col: 1 },
      selection: null,
      instruction:
        'Wandle das Frame in ein 2-Spalten-Grid um (grid 2). Die 4 Kinder sollen automatisch über die Spalten verteilt werden.',
      diffSinceLastCall: '',
      projectFiles: { tokens: {}, components: {} },
    },
    asserts: [must.applies(), must.finalContains(/grid 2\b/), must.compiles()],
  },
  {
    id: 'mode3-4',
    label: 'instruction: increase the gap from 8 to 16',
    mode: 3,
    files: {
      'app.mir':
        'canvas mobile\n\nFrame gap 8, pad 16\n  Text "Item 1"\n  Text "Item 2"\n  Text "Item 3"',
    },
    currentFile: 'app.mir',
    ctx: {
      source:
        'canvas mobile\n\nFrame gap 8, pad 16\n  Text "Item 1"\n  Text "Item 2"\n  Text "Item 3"',
      fileName: 'app.mir',
      cursor: { line: 1, col: 1 },
      selection: null,
      instruction: 'Setze den gap auf 16 (statt 8)',
      diffSinceLastCall: '',
      projectFiles: { tokens: {}, components: {} },
    },
    asserts: [
      must.applies(),
      must.finalContains('gap 16'),
      must.finalNotContains(/gap 8\b/),
      must.compiles(),
    ],
  },
  {
    id: 'mode3-3',
    label: 'instruction: add hover state to a button',
    mode: 3,
    files: {
      'app.mir': 'canvas mobile\n\nButton "Save", bg #2271C1, col white, pad 10 20, rad 6',
    },
    currentFile: 'app.mir',
    ctx: {
      source: 'canvas mobile\n\nButton "Save", bg #2271C1, col white, pad 10 20, rad 6',
      fileName: 'app.mir',
      cursor: { line: 1, col: 1 },
      selection: null,
      instruction:
        'Füge dem Button einen hover-State hinzu, der den Hintergrund auf #1d5fa3 ändert',
      diffSinceLastCall: '',
      projectFiles: { tokens: {}, components: {} },
    },
    asserts: [
      must.applies(),
      must.finalContains('hover:'),
      must.finalContains('#1d5fa3'),
      must.compiles(),
    ],
  },
  {
    id: 'mode3-2',
    label: 'instruction: rename component (inline def + 2 usages)',
    mode: 3,
    // Component lives in the same file (single-file edit) — this avoids
    // the LLM trying to multi-file patch (which our flow doesn't support
    // yet). Multi-file rename is a future scenario for Phase 6.
    files: {
      'app.mir':
        'canvas mobile\n\nBtn: pad 10 20, rad 6, bg #2271C1, col white\n\nFrame gap 8\n  Btn "Save"\n  Btn "Cancel"',
    },
    currentFile: 'app.mir',
    ctx: {
      source:
        'canvas mobile\n\nBtn: pad 10 20, rad 6, bg #2271C1, col white\n\nFrame gap 8\n  Btn "Save"\n  Btn "Cancel"',
      fileName: 'app.mir',
      cursor: { line: 1, col: 1 },
      selection: null,
      instruction: 'Benenne die Btn-Komponente zu PrimaryBtn um (Definition + alle Verwendungen)',
      diffSinceLastCall: '',
      projectFiles: { tokens: {}, components: {} },
    },
    asserts: [
      must.applies(),
      must.finalContains('PrimaryBtn:'),
      must.finalContains('PrimaryBtn "Save"'),
      must.finalContains('PrimaryBtn "Cancel"'),
      must.finalNotContains(/^\s*Btn[: ]/m),
      must.compiles(),
    ],
  },
  {
    id: 'mode3-10',
    label: 'instruction: wrap element in container Frame with padding',
    mode: 3,
    files: { 'app.mir': 'canvas mobile\n\nText "Hello", col white, fs 18' },
    currentFile: 'app.mir',
    ctx: {
      source: 'canvas mobile\n\nText "Hello", col white, fs 18',
      fileName: 'app.mir',
      cursor: { line: 1, col: 1 },
      selection: null,
      instruction: 'Verpacke den Text in ein Frame mit pad 16, gap 8, bg #1a1a1a, rad 8',
      diffSinceLastCall: '',
      projectFiles: { tokens: {}, components: {} },
    },
    asserts: [
      must.applies(),
      // Frame with the requested properties.
      must.finalContains(/Frame.*pad 16/),
      must.finalContains(/Frame.*bg #1a1a1a/),
      must.finalContains(/Frame.*rad 8/),
      // Text must be inside (indented under) the Frame.
      must.finalContains(/Frame[^\n]*\n\s+Text "Hello"/),
      must.compiles(),
    ],
  },
  {
    id: 'mode3-9',
    label: 'instruction: delete a specific element',
    mode: 3,
    files: {
      'app.mir':
        'canvas mobile\n\nFrame gap 8\n  Button "Save"\n  Button "Cancel"\n  Button "Delete"',
    },
    currentFile: 'app.mir',
    ctx: {
      source: 'canvas mobile\n\nFrame gap 8\n  Button "Save"\n  Button "Cancel"\n  Button "Delete"',
      fileName: 'app.mir',
      cursor: { line: 1, col: 1 },
      selection: null,
      instruction: 'Entferne den "Cancel"-Button',
      diffSinceLastCall: '',
      projectFiles: { tokens: {}, components: {} },
    },
    asserts: [
      must.applies(),
      must.finalNotContains('Cancel'),
      must.finalContains('Button "Save"'),
      must.finalContains('Button "Delete"'),
      must.compiles(),
    ],
  },
  {
    id: 'mode3-8',
    label: 'instruction: add disabled state with opacity to a button',
    mode: 3,
    files: {
      'app.mir': 'canvas mobile\n\nButton "Save", bg #2271C1, col white, pad 10 20, rad 6',
    },
    currentFile: 'app.mir',
    ctx: {
      source: 'canvas mobile\n\nButton "Save", bg #2271C1, col white, pad 10 20, rad 6',
      fileName: 'app.mir',
      cursor: { line: 1, col: 1 },
      selection: null,
      instruction: 'Füge einen disabled-State hinzu, der opacity 0.5 setzt und cursor not-allowed',
      diffSinceLastCall: '',
      projectFiles: { tokens: {}, components: {} },
    },
    asserts: [
      must.applies(),
      must.finalContains('disabled:'),
      must.finalContains('opacity 0.5'),
      must.finalContains('cursor not-allowed'),
      must.compiles(),
    ],
  },
]

// =============================================================================
// CLI EXEC — direct subprocess (same pattern as eval-ai-simple.ts)
// =============================================================================

function findClaudeBin(): string {
  if (process.env.CLAUDE_BIN) return process.env.CLAUDE_BIN
  const home = process.env.HOME
  if (home) return join(home, '.local', 'bin', 'claude')
  return 'claude'
}

const CLAUDE_BIN = findClaudeBin()

interface ClaudeResult {
  output: string
  error: string | null
  elapsedMs: number
}

function callClaude(prompt: string, timeoutMs = 90_000): Promise<ClaudeResult> {
  return new Promise(resolve => {
    const start = Date.now()
    const proc = spawn(CLAUDE_BIN, ['-p', '--output-format', 'text'], {
      stdio: ['pipe', 'pipe', 'pipe'],
    })
    let stdout = ''
    let stderr = ''
    let killed = false
    const timer = setTimeout(() => {
      killed = true
      proc.kill('SIGTERM')
    }, timeoutMs)
    proc.stdout.on('data', d => (stdout += d.toString()))
    proc.stderr.on('data', d => (stderr += d.toString()))
    proc.on('error', err => {
      clearTimeout(timer)
      resolve({
        output: '',
        error: `spawn failed: ${err.message}`,
        elapsedMs: Date.now() - start,
      })
    })
    proc.on('close', code => {
      clearTimeout(timer)
      const elapsedMs = Date.now() - start
      if (killed) {
        resolve({ output: stdout, error: `claude killed after ${timeoutMs}ms timeout`, elapsedMs })
      } else if (code === 0) {
        resolve({ output: stdout, error: null, elapsedMs })
      } else {
        resolve({
          output: stdout,
          error: stderr.trim() || `claude exited with code ${code}`,
          elapsedMs,
        })
      }
    })
    proc.stdin.write(prompt)
    proc.stdin.end()
  })
}

// =============================================================================
// COMPILE — write all project files to tmpdir, run compiler/cli.ts
// =============================================================================

interface CompileResult {
  ok: boolean
  errors: string[]
  elapsedMs: number
}

function compileProject(
  files: Record<string, string>,
  currentFile: string,
  finalCurrentFileSource: string
): Promise<CompileResult> {
  const start = Date.now()
  return new Promise(resolve => {
    const tmp = mkdtempSync(join(tmpdir(), 'eval-edit-flow-'))
    try {
      for (const [name, content] of Object.entries(files)) {
        const out = name === currentFile ? finalCurrentFileSource : content
        writeFileSync(join(tmp, name), out)
      }
      const proc = spawn(
        'npx',
        ['tsx', 'compiler/cli.ts', '--project', tmp, '-o', join(tmp, 'out.js')],
        { stdio: ['ignore', 'pipe', 'pipe'] }
      )
      let stdout = ''
      let stderr = ''
      proc.stdout.on('data', d => (stdout += d.toString()))
      proc.stderr.on('data', d => (stderr += d.toString()))
      proc.on('close', code => {
        try {
          rmSync(tmp, { recursive: true, force: true })
        } catch {
          /* ignore */
        }
        const errors = (stderr + '\n' + stdout)
          .split('\n')
          .filter(l => /error|fail/i.test(l))
          .filter(l => l.trim())
        resolve({ ok: code === 0, errors, elapsedMs: Date.now() - start })
      })
    } catch (err) {
      try {
        rmSync(tmp, { recursive: true, force: true })
      } catch {
        /* ignore */
      }
      resolve({ ok: false, errors: [String(err)], elapsedMs: Date.now() - start })
    }
  })
}

// =============================================================================
// SCENARIO RUNNER
// =============================================================================

interface ScenarioResult {
  scenario: EditScenario
  prompt: string
  rawOutput: string
  patches: Patch[]
  parseErrors: string[]
  apply: ApplyResult
  finalSource: string | null
  compileOk: boolean
  compileErrors: string[]
  assertResults: { label: string; pass: boolean; detail?: string }[]
  claudeMs: number
  compileMs: number
  totalMs: number
  error?: string
}

async function runScenario(scenario: EditScenario): Promise<ScenarioResult> {
  const totalStart = Date.now()
  const ts = (label: string) => `[+${((Date.now() - totalStart) / 1000).toFixed(1)}s] ${label}`

  console.log('')
  console.log('━'.repeat(80))
  console.log(`▶  ${scenario.id} (mode ${scenario.mode}): ${scenario.label}`)
  console.log('━'.repeat(80))
  if (scenario.ctx.instruction) console.log(`Instruction: "${scenario.ctx.instruction}"`)
  if (scenario.ctx.selection) console.log(`Selection: "${scenario.ctx.selection.text}"`)
  console.log(`Files: ${Object.keys(scenario.files).join(', ')}`)
  console.log(`Asserts: ${scenario.asserts.length}`)
  console.log('')

  console.log(ts('🔨 building prompt with buildEditPrompt (production fn)...'))
  const prompt = buildEditPrompt(scenario.ctx)
  console.log(ts(`   prompt is ${prompt.length} chars`))

  console.log(ts('🤖 calling claude -p (timeout 90s)...'))
  const claudeResult = await callClaude(prompt)
  if (claudeResult.error) {
    console.log(ts(`❌ claude error: ${claudeResult.error}`))
    return errResult(scenario, prompt, claudeResult.error, totalStart)
  }
  console.log(ts(`   got ${claudeResult.output.length} chars in ${claudeResult.elapsedMs}ms`))

  console.log(ts('✂  parsing patches via parsePatchResponse (production fn)...'))
  const parsed = parsePatchResponse(claudeResult.output)
  console.log(
    ts(`   ${parsed.patches.length} patch(es), ${parsed.parseErrors.length} parse-error(s)`)
  )
  for (const e of parsed.parseErrors) console.log(`     ! ${e}`)
  parsed.patches.forEach((p, i) => {
    console.log(`   patch #${i + 1}:`)
    console.log(`     FIND:    ${preview(p.find)}`)
    console.log(`     REPLACE: ${preview(p.replace)}`)
  })

  const apply = applyPatches(scenario.ctx.source, parsed.patches)
  let finalSource: string | null = null
  let compile: CompileResult = { ok: false, errors: [], elapsedMs: 0 }

  if (apply.success && apply.newSource !== undefined) {
    finalSource = apply.newSource
    console.log(ts('🔧 compile-checking final source via compiler CLI...'))
    compile = await compileProject(scenario.files, scenario.currentFile, finalSource)
    if (compile.ok) {
      console.log(ts(`   ✓ compile clean (${compile.elapsedMs}ms)`))
    } else {
      console.log(
        ts(`   ✗ compile FAILED (${compile.elapsedMs}ms) — ${compile.errors.length} error(s):`)
      )
      compile.errors.slice(0, 5).forEach(e => console.log(`     │ ${e.slice(0, 140)}`))
    }
  } else {
    console.log(
      ts(`   ✗ patches did NOT apply: ${apply.retryHints?.map(h => h.reason).join(', ')}`)
    )
  }

  console.log(ts(`✅ running ${scenario.asserts.length} assertions:`))
  const assertCtx: AssertContext = {
    patches: parsed.patches,
    parseErrors: parsed.parseErrors,
    apply,
    finalSource,
    compileOk: compile.ok,
  }
  const assertResults = scenario.asserts.map(a => {
    const r = a.check(assertCtx)
    return { label: a.label, pass: r.pass, detail: r.detail }
  })
  for (const r of assertResults) {
    const icon = r.pass ? '✓' : '✗'
    const detail = r.detail ? ` — ${r.detail}` : ''
    console.log(`     ${icon} ${r.label}${detail}`)
  }

  const totalMs = Date.now() - totalStart
  const passed = assertResults.filter(r => r.pass).length
  console.log('')
  console.log(
    `▷  ${scenario.id}: ${passed}/${assertResults.length} asserts ` +
      `| claude ${claudeResult.elapsedMs}ms | compile ${compile.elapsedMs}ms | total ${totalMs}ms`
  )

  return {
    scenario,
    prompt,
    rawOutput: claudeResult.output,
    patches: parsed.patches,
    parseErrors: parsed.parseErrors,
    apply,
    finalSource,
    compileOk: compile.ok,
    compileErrors: compile.errors,
    assertResults,
    claudeMs: claudeResult.elapsedMs,
    compileMs: compile.elapsedMs,
    totalMs,
  }
}

function errResult(
  scenario: EditScenario,
  prompt: string,
  error: string,
  start: number
): ScenarioResult {
  return {
    scenario,
    prompt,
    rawOutput: '',
    patches: [],
    parseErrors: [],
    apply: { success: false },
    finalSource: null,
    compileOk: false,
    compileErrors: [],
    assertResults: scenario.asserts.map(a => ({
      label: a.label,
      pass: false,
      detail: 'pipeline failed before assert',
    })),
    claudeMs: 0,
    compileMs: 0,
    totalMs: Date.now() - start,
    error,
  }
}

function preview(s: string, max = 80): string {
  const oneline = s.replace(/\n/g, '⏎')
  return oneline.length <= max ? oneline : oneline.slice(0, max - 1) + '…'
}

// =============================================================================
// MAIN
// =============================================================================

function parseArgs(argv: string[]): {
  list: boolean
  only: string | null
  mode: EditMode | null
} {
  let list = false
  let only: string | null = null
  let mode: EditMode | null = null
  for (const arg of argv.slice(2)) {
    if (arg === '--list') list = true
    else if (arg.startsWith('--only=')) only = arg.slice('--only='.length)
    else if (arg.startsWith('--mode=')) {
      const m = parseInt(arg.slice('--mode='.length), 10)
      if (m === 1 || m === 2 || m === 3) mode = m
    }
  }
  return { list, only, mode }
}

async function main() {
  const args = parseArgs(process.argv)

  if (args.list) {
    console.log('Available scenarios:')
    for (const s of SCENARIOS) console.log(`  [mode ${s.mode}] ${s.id} — ${s.label}`)
    return
  }

  let scenarios = SCENARIOS
  if (args.only) scenarios = scenarios.filter(s => s.id === args.only)
  if (args.mode !== null) scenarios = scenarios.filter(s => s.mode === args.mode)

  if (scenarios.length === 0) {
    console.error('No scenarios match the filter.')
    process.exit(1)
  }

  console.log(`Running ${scenarios.length} scenario(s)...`)
  const results: ScenarioResult[] = []
  for (const s of scenarios) {
    results.push(await runScenario(s))
  }

  console.log('')
  console.log('═'.repeat(80))
  console.log('SUMMARY')
  console.log('═'.repeat(80))
  let totalAsserts = 0
  let totalPassed = 0
  for (const r of results) {
    const passed = r.assertResults.filter(a => a.pass).length
    const total = r.assertResults.length
    totalAsserts += total
    totalPassed += passed
    const icon = passed === total ? '✓' : '✗'
    console.log(`  ${icon} ${r.scenario.id} — ${passed}/${total} asserts`)
  }
  console.log('')
  console.log(`Total: ${totalPassed}/${totalAsserts} assertions passed`)
  process.exit(totalPassed === totalAsserts ? 0 : 1)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
