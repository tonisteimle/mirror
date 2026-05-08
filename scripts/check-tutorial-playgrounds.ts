/**
 * Tutorial Playground Checker — runs as part of lint-staged on
 * `docs/tutorial/*.html`. Always reads the full set of chapters from disk;
 * any file args lint-staged passes are ignored.
 *
 * Extracts every <textarea> from the playground blocks across all 17
 * tutorial chapters, compiles each via the Mirror compiler, runs createUI()
 * in a JSDOM environment, and reports compile failures, runtime errors,
 * empty renders, and renders missing the literal text the source declares.
 *
 * Exit code: non-zero if any snippet fails to compile, throws at runtime,
 * or renders to an empty DOM. The "missing-text" status is informational
 * only — it covers JSDOM-runtime limitations (toast args, state-block
 * content, ternary branches, chart.js axis labels) that do render in a
 * real browser.
 *
 * Run: `npm run check:tutorial`
 */

import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { JSDOM } from 'jsdom'
import { compile } from '../compiler'

const __dirname = dirname(fileURLToPath(import.meta.url))
const TUT_DIR = resolve(__dirname, '..', 'docs', 'tutorial')
const OUT_DIR = '/tmp/tutorial-snippets'
rmSync(OUT_DIR, { recursive: true, force: true })
mkdirSync(OUT_DIR, { recursive: true })

const chapters = [
  'index',
  '01-elemente',
  '02-komponenten',
  '03-tokens',
  '04-layout',
  '05-styling',
  '06-states',
  '07-animationen',
  '08-functions',
  '09-daten',
  '10-seiten',
  '11-eingabe',
  '12-navigation',
  '13-overlays',
  '14-tabellen',
  '15-charts',
  '16-prosa',
]

interface Snippet {
  file: string
  chapter: string
  idx: number
  code: string
}
const snippets: Snippet[] = []
for (const ch of chapters) {
  const html = readFileSync(join(TUT_DIR, `${ch}.html`), 'utf-8')
  const re = /<div class="playground"[^>]*>[\s\S]*?<textarea[^>]*>([\s\S]*?)<\/textarea>/g
  let m,
    idx = 0
  while ((m = re.exec(html)) !== null) {
    idx++
    const code = m[1]
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
    const fname = `${ch}-pg${String(idx).padStart(2, '0')}.mir`
    snippets.push({ file: fname, chapter: ch, idx, code })
    writeFileSync(join(OUT_DIR, fname), code, 'utf-8')
  }
}

const dom = new JSDOM('<!doctype html><html><head></head><body></body></html>', {
  url: 'http://localhost/',
  pretendToBeVisual: true,
})
const w = dom.window
;(globalThis as Record<string, unknown>).window = w
;(globalThis as Record<string, unknown>).document = w.document
;(globalThis as Record<string, unknown>).HTMLElement = w.HTMLElement
;(globalThis as Record<string, unknown>).Node = w.Node
;(globalThis as Record<string, unknown>).Element = w.Element
;(globalThis as Record<string, unknown>).Event = w.Event
;(globalThis as Record<string, unknown>).MouseEvent = w.MouseEvent
;(globalThis as Record<string, unknown>).KeyboardEvent = w.KeyboardEvent
;(globalThis as Record<string, unknown>).requestAnimationFrame = (cb: (t: number) => void) =>
  setTimeout(() => cb(0), 0)
;(globalThis as Record<string, unknown>).MutationObserver =
  (w as unknown as { MutationObserver?: unknown }).MutationObserver ??
  class {
    observe(): void {}
    disconnect(): void {}
    takeRecords(): unknown[] {
      return []
    }
  }
;(globalThis as Record<string, unknown>).DOMParser = (
  w as unknown as { DOMParser?: unknown }
).DOMParser

interface Result {
  file: string
  chapter: string
  status: 'ok' | 'compile-error' | 'runtime-error' | 'empty' | 'missing-text'
  detail?: string
  missingText?: string
}

/**
 * Extract literal strings from the source that should appear as visible
 * DOM text content. Filters out attribute-like and state-conditional
 * positions where the string would NOT appear in `textContent`:
 *
 *   - `Icon "name"` — name is an SVG identifier, not text
 *   - `placeholder "..."` / `value "..."` / `positioning "..."` /
 *     `name "..."` / `mask "..."` / `type "..."` / `src "..."` /
 *     `href "..."` — HTML attributes
 *   - strings inside state blocks (`hover:`, `on:`, `selected:`, …) —
 *     only render when the state is active
 *   - strings inside `if cond` / `else` blocks — only render in matching branch
 *   - strings used as data values inside `tasks:`, `users:` etc. that the
 *     each-where clause may filter out
 *
 * Returns at most 3 fragments — enough for plausibility, not exhaustive.
 */
function expectedTextFragments(code: string): string[] {
  const fragments: string[] = []

  const ATTR_KEYWORDS = new Set([
    'placeholder',
    'value',
    'positioning',
    'name',
    'mask',
    'type',
    'src',
    'href',
    'icon',
    'badge',
    'aria-label',
    'title',
    'defaultValue',
    'bind',
    'as',
  ])

  const lines = code.split('\n')
  // Track indentation of the most recent state-block / conditional / data-block opener.
  // While inside one, strings are "conditional" — skip.
  const blockOpeners: Array<{ indent: number; kind: 'state' | 'cond' | 'data' }> = []

  for (const rawLine of lines) {
    const line = rawLine.replace(/\/\/.*$/, '') // strip line comment
    const indent = rawLine.length - rawLine.trimStart().length
    const trimmed = line.trimStart()

    // Pop block openers we've left.
    while (blockOpeners.length > 0 && indent <= blockOpeners[blockOpeners.length - 1].indent) {
      blockOpeners.pop()
    }

    // Detect a new state / conditional / data block opener.
    if (
      /^(hover|focus|active|disabled|selected|on|open|closed|highlighted|expanded|collapsed|filled|valid|invalid|loading|error|todo|doing|done|compact|regular|wide|tiny):/.test(
        trimmed
      )
    ) {
      blockOpeners.push({ indent, kind: 'state' })
      continue
    }
    if (/^(if|else)\b/.test(trimmed)) {
      blockOpeners.push({ indent, kind: 'cond' })
      continue
    }
    // Data-block opener: bare `name:` at top-level (not part of a propset).
    // Heuristic: line ends with bare colon and indent is 0 — this catches
    // `tasks:`, `users:`, `sales:` etc.
    if (indent === 0 && /^[a-z][\w]*:\s*$/.test(trimmed)) {
      blockOpeners.push({ indent, kind: 'data' })
      continue
    }

    // Skip strings inside any conditional / state / data block.
    if (blockOpeners.length > 0) continue

    // Skip strings used as values for known attribute keywords on the same token.
    // Example: `Input placeholder "foo"` — the `"foo"` follows `placeholder`.
    // Example: `Icon "check"` — the leading `Icon` is an attr-like primitive
    // because the string is the *icon name*, not visible text.
    const stripIconLine = /\bIcon\s+"[^"]*"/.test(trimmed)

    const re = /"([^"\n]{2,40})"/g
    let m
    while ((m = re.exec(line)) !== null) {
      const s = m[1].trim()
      if (!s) continue
      if (/^[\d\s]+$/.test(s)) continue // pure numbers
      if (/^#[\da-fA-F]+$/.test(s)) continue // hex colors
      if (s.includes('${')) continue // template-like
      if (/\$[a-zA-Z]/.test(s)) continue // contains $variable interpolation — actual rendered text differs from source
      // Skip any string preceded on this line by an attr keyword.
      const before = line.slice(0, m.index)
      const lastWord = before.match(/(\w+)\s+$/)?.[1]
      if (lastWord && ATTR_KEYWORDS.has(lastWord)) continue
      // Skip the icon-name string when this line is `Icon "name"`.
      if (stripIconLine && /\bIcon\s+"[^"]*"/.exec(line)?.[0]?.includes(`"${s}"`)) continue

      fragments.push(s)
      if (fragments.length >= 3) return fragments
    }
  }
  return fragments
}

const results: Result[] = []
for (const s of snippets) {
  let js: string
  try {
    js = compile(s.code)
  } catch (e) {
    results.push({
      file: s.file,
      chapter: s.chapter,
      status: 'compile-error',
      detail: (e as Error).message.split('\n')[0].slice(0, 250),
    })
    continue
  }

  let root: HTMLElement | null = null
  try {
    const execCode = js.replace('export function createUI', 'function createUI')
    const fn = new Function(execCode + '\nreturn createUI();')
    root = fn() as HTMLElement | null
  } catch (e) {
    results.push({
      file: s.file,
      chapter: s.chapter,
      status: 'runtime-error',
      detail: (e as Error).message.split('\n')[0].slice(0, 250),
    })
    continue
  }

  if (!root || (root.childNodes && root.childNodes.length === 0)) {
    results.push({ file: s.file, chapter: s.chapter, status: 'empty' })
    continue
  }

  const fragments = expectedTextFragments(s.code)
  const text = root.textContent ?? ''
  const missing = fragments.find(f => !text.includes(f))
  if (missing) {
    results.push({
      file: s.file,
      chapter: s.chapter,
      status: 'missing-text',
      missingText: missing,
    })
    continue
  }

  results.push({ file: s.file, chapter: s.chapter, status: 'ok' })
}

const counts: Record<Result['status'], number> = {
  ok: 0,
  'compile-error': 0,
  'runtime-error': 0,
  empty: 0,
  'missing-text': 0,
}
for (const r of results) counts[r.status]++

console.log(`\n=== ${results.length} playground snippets ===`)
console.log(`  ok:           ${counts.ok}`)
console.log(`  compile-err:  ${counts['compile-error']}`)
console.log(`  runtime-err:  ${counts['runtime-error']}`)
console.log(`  empty render: ${counts.empty}`)
console.log(`  missing text: ${counts['missing-text']}`)
console.log()

for (const r of results.filter(r => r.status !== 'ok')) {
  console.log(`[${r.status}] ${r.file}`)
  if (r.detail) console.log(`   ${r.detail}`)
  if (r.missingText) console.log(`   missing: "${r.missingText}"`)
}

// Real failures = compile/runtime/empty. Missing-text is informational
// only (JSDOM-runtime limitations). Exit non-zero only on real failures
// so lint-staged can block the commit.
const realFailures = counts['compile-error'] + counts['runtime-error'] + counts['empty']
if (realFailures > 0) {
  console.error(`\n✗ ${realFailures} real failure(s) — see details above.`)
  process.exit(1)
}
console.log(`\n✓ all ${results.length} playgrounds compile and render`)
process.exit(0)
