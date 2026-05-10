/**
 * DSL Features Must Have Examples — Dead-Feature Policy
 *
 * Background: the codebase carries a few parsable DSL features that no
 * real Mirror project uses today. They have parser code, AST nodes,
 * IR mappings, backend emit logic, and tests — but zero usage in
 * `examples/`. The findings.md doc has been asking for an
 * owner-decision since May 2026 ("keep" or "delete"); the decision
 * never got made because nothing forced it.
 *
 * This test is the forcing function. Two lists:
 *
 *   KEEP     — features the owner has explicitly committed to keeping.
 *              Must have ≥1 source-file example. The test fails
 *              immediately if any KEEP entry has zero examples.
 *
 *   WATCHLIST — features currently without an example, but with a
 *              decision deadline. Until the deadline, the test
 *              **passes with a console.warn** so the team sees the
 *              status without CI red. After the deadline, the test
 *              **fails** — the policy fires, owner must either
 *              promote to KEEP (and add an example) or delete the
 *              feature entirely.
 *
 * Adding to either list is the explicit decision-mechanism. Removing
 * from WATCHLIST without promotion to KEEP means the feature was
 * deleted from the DSL — which is the policy-blessed path.
 *
 * The deadlines below were set to 90 days from the audit date in
 * findings.md (2026-05-10) — so the policy fires on 2026-08-10.
 */

import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

const here = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(here, '../..')
const EXAMPLES_DIR = path.join(repoRoot, 'examples')

/** Source-file extensions that count as a real "example" — compiled
 *  artifacts (.html, .js) don't count, only DSL source files. */
const SOURCE_EXTENSIONS = ['.mir', '.mirror', '.com', '.components', '.tok', '.tokens']

interface Feature {
  /** Human-readable name shown in failure messages. */
  name: string
  /** Pattern that, when matched against a source file, indicates the
   *  feature is in use. The pattern runs against the full file
   *  content (multiline) — use `^...$` with the `m` flag for line-
   *  anchored matching. */
  pattern: RegExp
}

interface WatchlistEntry extends Feature {
  /** ISO date (YYYY-MM-DD) after which the policy fires. Until then,
   *  zero usage is just a warn — after, it's a hard fail. */
  deadline: string
  /** Reference to the relevant findings.md entry or audit doc, so a
   *  reader can see why the feature was put on the watchlist. */
  context: string
}

// =============================================================================
// KEEP — features explicitly committed to. Must have ≥1 example.
// =============================================================================
//
// Adding here means: "we promise this feature exists in the long run, so
// every PR-cycle's example-snapshot must demonstrate it." Promoting from
// WATCHLIST to KEEP requires also adding a using-example file.
//
const KEEP: Feature[] = [
  {
    name: 'Stacked overlay container',
    // `, stacked` as a property modifier — match commas + 'stacked' followed
    // by whitespace or comma or end-of-line.
    pattern: /,\s*stacked(\s|,|$)/m,
  },
  {
    name: 'Prose mode (Markdown-like body inside Frame)',
    pattern: /,\s*prose(\s|,|$)/m,
  },
]

// =============================================================================
// WATCHLIST — features with zero examples today, decision pending.
// =============================================================================
//
// Each entry has a deadline. Past the deadline, the test fails — owner
// must either:
//   (a) move the entry to KEEP and add an example, or
//   (b) delete the feature (parser, AST, IR, backends, runtime, tests, docs)
//       and remove the entry here.
//
const WATCHLIST: WatchlistEntry[] = [
  {
    name: '$icons: custom-icon registry',
    // `$icons:` declaration block at line start. Negative lookbehind would
    // be cleaner, but `m` + start-of-line is enough — compiled artifacts
    // are filtered out by SOURCE_EXTENSIONS.
    pattern: /^\$icons:/m,
    deadline: '2026-08-10',
    context: 'docs/findings.md "Dead-feature-Verdacht" → "Custom-Icons-Registry"',
  },
  {
    name: 'Section-header parsing (--- Title ---)',
    // Three or more dashes, identifier word, three or more dashes,
    // anchored to line start. Comments (// ----) are filtered by anchoring
    // to start-of-line and requiring a letter inside the dashes.
    pattern: /^---\s+\S.*?---\s*$/m,
    deadline: '2026-08-10',
    context: 'docs/findings.md "Dead-feature-Verdacht" → "Section-Header-Parsing"',
  },
]

// =============================================================================
// Helpers
// =============================================================================

function* walkExampleSources(dir: string): Generator<string> {
  if (!fs.existsSync(dir)) return
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      yield* walkExampleSources(full)
    } else if (SOURCE_EXTENSIONS.some(ext => entry.name.endsWith(ext))) {
      yield full
    }
  }
}

function findUsages(pattern: RegExp): string[] {
  const hits: string[] = []
  for (const file of walkExampleSources(EXAMPLES_DIR)) {
    const content = fs.readFileSync(file, 'utf-8')
    if (pattern.test(content)) {
      hits.push(path.relative(repoRoot, file))
    }
  }
  return hits
}

function isPastDeadline(deadline: string): boolean {
  // Compare YYYY-MM-DD strings directly — lexical order matches
  // chronological for ISO format.
  const today = new Date().toISOString().slice(0, 10)
  return today > deadline
}

// =============================================================================
// Tests
// =============================================================================

describe('DSL features must have examples — KEEP list (always enforced)', () => {
  for (const feature of KEEP) {
    it(`${feature.name} — at least one source-file example exists`, () => {
      const hits = findUsages(feature.pattern)
      if (hits.length === 0) {
        throw new Error(
          `KEEP feature "${feature.name}" has zero usage in examples/.\n` +
            `\n` +
            `  This is a KEEP-listed feature, which means the project has\n` +
            `  committed to maintaining it. Either:\n` +
            `    (a) add a *.mir / *.com / *.tok file in examples/ that uses it, or\n` +
            `    (b) move the feature to WATCHLIST in this file and decide a deadline.`
        )
      }
      expect(hits.length).toBeGreaterThan(0)
    })
  }
})

describe('DSL features must have examples — WATCHLIST (deadline-gated)', () => {
  for (const entry of WATCHLIST) {
    it(`${entry.name} — has example OR is within deadline ${entry.deadline}`, () => {
      const hits = findUsages(entry.pattern)
      if (hits.length > 0) {
        // Found one — congratulations, this should be promoted to KEEP.
        console.warn(
          `[dead-feature-policy] "${entry.name}" found in ${hits.length} ` +
            `example(s): ${hits.join(', ')}. Move to KEEP and remove from WATCHLIST.`
        )
        return
      }

      // Zero hits — either warn (within deadline) or fail (past).
      const past = isPastDeadline(entry.deadline)
      const message =
        `"${entry.name}" has zero usage in examples/.\n` +
        `  Context: ${entry.context}\n` +
        `  Deadline: ${entry.deadline} (${past ? 'PAST' : 'still ahead'}).\n` +
        `  Decide: (a) add a using example + promote to KEEP, OR\n` +
        `          (b) delete the feature (parser + AST + IR + backends + runtime + tests + docs) + remove from WATCHLIST.`

      if (past) {
        throw new Error('Watchlist deadline expired — decide now.\n  ' + message)
      }
      console.warn(`[dead-feature-policy] ${message}`)
    })
  }
})
