/**
 * Browser-Test Synthetic-Event Policy — forcing function.
 *
 * Background: an audit on 2026-05-13 found that ~60+ browser tests
 * across the direct-manipulation surface (margin/padding/gap handles)
 * dispatch synthetic `MouseEvent` via `dispatchEvent(...)`. Those
 * events carry `isTrusted=false` and bypass the real browser input
 * pipeline (focus management, HTML5 drag/dataTransfer, native
 * keymaps). Tests pass; reality breaks silently.
 *
 * Mirror's Schicht-1 contract (see `docs/TEST-FRAMEWORK.md` —
 * „Grundprinzip — Maus und Keyboard, sonst nichts") is that browser
 * tests drive Studio ONLY via Trusted Events from CDP / OS-Mouse:
 *
 *   - `api.trusted.*`   (CDP-driven; `studio/test-api/trusted-interactions.ts`)
 *   - `window.__cdpInput.*` (atomic layer-1 Trusted Events)
 *   - `window.__osMouse.*` (real macOS cursor for video-record path)
 *
 * Two lists below:
 *
 *   ALLOWED_LEGACY — files that contained synthetic dispatch on
 *   2026-05-13 (the policy-introduction baseline). They are the
 *   migration backlog: each file must move to Trusted Events
 *   eventually. Removing an entry is the policy-blessed path —
 *   when a file is migrated, drop it from the list. Conversely,
 *   adding a file here requires explicit owner approval (the test
 *   makes it visible in CI diff).
 *
 *   _IMPLICITLY_FORBIDDEN — any browser-test file not in the
 *   allowlist that uses `new MouseEvent` or
 *   `dispatchEvent(<MouseEvent>)`. The test fails so the offender
 *   either rewrites against `api.trusted.*` / `__cdpInput.*` or
 *   gets owner-blessed onto the allowlist.
 *
 * Scope: browser-test files under `studio/test-api/suites/` only.
 * Vitest jsdom tests in `tests/studio/` use synthetic events
 * legitimately (jsdom has no Trusted-Event source); they are
 * deliberately out-of-scope.
 */

import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

const here = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(here, '../..')
const SUITES_DIR = path.join(repoRoot, 'studio/test-api/suites')

/**
 * Files exempt from the policy because they predate it. Migration
 * to Trusted Events is the Phase-2 lane of the 2026-05-13 audit
 * follow-up. Each entry is a target; removing it from the list is
 * the migration completion signal.
 */
const ALLOWED_LEGACY = new Set<string>(['tutorial/overlays-deep.test.ts'])

/** Regex matches both `new MouseEvent('click', ...)` constructor
 *  usage and the `el.dispatchEvent(new MouseEvent(...))` pattern.
 *  Detects the synthetic-event smell at the source-text level. */
const SYNTHETIC_MOUSE_EVENT = /\bnew\s+MouseEvent\s*\(/

function walkBrowserTests(dir: string): string[] {
  const out: string[] = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      out.push(...walkBrowserTests(full))
    } else if (entry.name.endsWith('.test.ts')) {
      out.push(full)
    }
  }
  return out
}

describe('Policy — browser tests use Trusted Events (CDP / OS-Mouse), not synthetic dispatch', () => {
  const offenders: { file: string; firstLine: number; snippet: string }[] = []
  const allowlistHits: string[] = []
  const allowlistMisses: string[] = []

  const files = walkBrowserTests(SUITES_DIR)
  for (const fullPath of files) {
    const rel = path.relative(SUITES_DIR, fullPath)
    const src = fs.readFileSync(fullPath, 'utf-8')
    const match = src.match(SYNTHETIC_MOUSE_EVENT)
    if (!match) continue

    if (ALLOWED_LEGACY.has(rel)) {
      allowlistHits.push(rel)
      continue
    }

    // Find the first line that triggered, for a helpful error message.
    const lines = src.split('\n')
    const firstLine = lines.findIndex(l => SYNTHETIC_MOUSE_EVENT.test(l)) + 1
    const snippet = lines[firstLine - 1]?.trim().slice(0, 100) ?? ''
    offenders.push({ file: rel, firstLine, snippet })
  }

  for (const allowed of ALLOWED_LEGACY) {
    if (!allowlistHits.includes(allowed)) allowlistMisses.push(allowed)
  }

  it('forbids `new MouseEvent` in non-allowlisted browser test files', () => {
    if (offenders.length === 0) return
    const list = offenders.map(o => `  - ${o.file}:${o.firstLine}\n    ${o.snippet}`).join('\n')
    throw new Error(
      `${offenders.length} browser test file(s) use synthetic MouseEvent dispatch ` +
        `outside the allowlist. New tests must drive Studio via api.trusted.* or ` +
        `__cdpInput.* (Mirror Schicht-1 contract). Either rewrite the test or ` +
        `add the path to ALLOWED_LEGACY in this policy file (owner approval required):\n\n${list}`
    )
  })

  it('keeps the allowlist tight — entries must still be in use', () => {
    if (allowlistMisses.length === 0) return
    const list = allowlistMisses.map(p => `  - ${p}`).join('\n')
    throw new Error(
      `Allowlist contains entries that no longer use synthetic MouseEvent ` +
        `(the file was migrated or deleted). Remove these from ALLOWED_LEGACY ` +
        `so the policy stays honest:\n\n${list}`
    )
  })
})
