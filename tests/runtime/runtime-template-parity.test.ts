/**
 * Runtime template ↔ typed-runtime parity tests.
 *
 * The Mirror DOM runtime exists in two parallel forms:
 *   1. `compiler/runtime/*.ts` — typed TS modules, used by tests and
 *      runtime-side TypeScript code.
 *   2. `compiler/backends/dom/runtime-template/index.ts` — a plain-JS
 *      template literal that the compiler embeds into emitted output.
 *
 * Both forms reimplement the same primitives (PROP_MAP, isDebug,
 * alignment rules, etc.). Without an explicit guard they will drift —
 * and the typed tests will keep passing while production silently uses
 * the stale template.
 *
 * These tests pin the duplicated definitions byte-for-byte (semantically)
 * so a change to one side fails the build until the other side catches
 * up. Once we eventually generate the runtime template from the typed
 * modules at build time (issue #1 in the post-Phase-4 audit), this file
 * becomes the spec the build step has to satisfy.
 */

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { fileURLToPath } from 'url'

import { PROP_MAP } from '../../compiler/runtime/dom-runtime'
import { isDebug } from '../../compiler/runtime/debug'
import { ALIGN_MAP } from '../../compiler/runtime/alignment'
import { FALLBACK_ICON, LUCIDE_CDN } from '../../compiler/runtime/icons'
import { DOM_RUNTIME_CODE } from '../../compiler/backends/dom/runtime-template'

const REPO_ROOT = resolve(fileURLToPath(import.meta.url), '../../..')

/**
 * Extract a JSON object literal from `source` that follows `prefix`.
 *
 * `prefix` is matched as a regex (e.g. /_propMap:\s* /); the function
 * walks balanced braces from the opening brace and returns the matched
 * substring. Robust against nested objects — unlike a flat
 * "open-to-first-close" regex, which stops at the first inner brace.
 *
 * Returns null if the prefix isn't found or braces don't balance.
 */
function extractJsonLiteralAfter(source: string, prefix: RegExp): string | null {
  const m = prefix.exec(source)
  if (!m) return null
  let i = m.index + m[0].length
  if (source[i] !== '{') return null
  let depth = 0
  let inString = false
  let escape = false
  for (; i < source.length; i++) {
    const ch = source[i]
    if (escape) {
      escape = false
      continue
    }
    if (ch === '\\') {
      escape = true
      continue
    }
    if (ch === '"') {
      inString = !inString
      continue
    }
    if (inString) continue
    if (ch === '{') depth++
    else if (ch === '}') {
      depth--
      if (depth === 0) {
        const start = m.index + m[0].length
        return source.slice(start, i + 1)
      }
    }
  }
  return null
}

describe('Runtime template parity', () => {
  describe('PROP_MAP', () => {
    it('typed PROP_MAP is the same object as the template _propMap', () => {
      const literal = extractJsonLiteralAfter(DOM_RUNTIME_CODE, /_propMap:\s*/)
      expect(literal, 'expected _propMap block in DOM_RUNTIME_CODE').not.toBeNull()
      const templateMap = JSON.parse(literal!) as Record<string, string>
      expect(templateMap).toEqual(PROP_MAP)
    })
  })

  describe('debug flag', () => {
    it('template _isDebug uses the same window flag as typed isDebug', () => {
      // Read the debug.ts source so we don't depend on the function being
      // injectable / runnable in the test environment.
      const debugSource = readFileSync(resolve(REPO_ROOT, 'compiler/runtime/debug.ts'), 'utf8')

      // Both implementations must reference the same global flag.
      expect(debugSource).toMatch(/window\.__MIRROR_DEBUG__/)
      expect(DOM_RUNTIME_CODE).toMatch(/window\.__MIRROR_DEBUG__/)

      // typed isDebug() is callable in this Node test env (returns false
      // when window is undefined). Smoke-check it.
      expect(typeof isDebug).toBe('function')
      expect(isDebug()).toBe(false)
    })
  })

  describe('ALIGN_MAP', () => {
    it('typed ALIGN_MAP is the same object as the template alignMap literal', () => {
      const literal = extractJsonLiteralAfter(DOM_RUNTIME_CODE, /const alignMap\s*=\s*/)
      expect(literal, 'expected alignMap literal in _alignToCSS body').not.toBeNull()
      const templateMap = JSON.parse(literal!) as Record<string, string>
      expect(templateMap).toEqual(ALIGN_MAP)
    })
  })

  describe('icon constants', () => {
    it('typed FALLBACK_ICON is verbatim in the template', () => {
      expect(DOM_RUNTIME_CODE).toContain(JSON.stringify(FALLBACK_ICON))
    })

    it('typed LUCIDE_CDN is verbatim in the template URL', () => {
      // The template stamps LUCIDE_CDN inline (not via JSON.stringify) so
      // the URL appears as a substring.
      expect(DOM_RUNTIME_CODE).toContain(LUCIDE_CDN)
    })
  })

  describe('extractor robustness', () => {
    it('handles nested objects (proves the extractor is balanced-brace, not flat-regex)', () => {
      const sample = 'foo: {"a":{"b":1,"c":[2,3]},"d":"}{"} after'
      const out = extractJsonLiteralAfter(sample, /foo:\s*/)
      expect(out).toBe('{"a":{"b":1,"c":[2,3]},"d":"}{"}')
      expect(JSON.parse(out!)).toEqual({ a: { b: 1, c: [2, 3] }, d: '}{' })
    })

    it('returns null when the prefix is not present', () => {
      expect(extractJsonLiteralAfter('no match here', /foo:\s*/)).toBeNull()
    })

    it('returns null when braces are unbalanced', () => {
      expect(extractJsonLiteralAfter('foo: {"a":1', /foo:\s*/)).toBeNull()
    })
  })

  describe('inventory snapshot', () => {
    it('template line count is within an expected band', () => {
      // Sanity guard: if the template suddenly grows or shrinks by a lot,
      // someone either added a major chunk (consider extracting) or
      // started consolidating (good — update this band). Either way the
      // change deserves a reviewer's eye.
      const lines = DOM_RUNTIME_CODE.split('\n').length
      expect(lines).toBeGreaterThan(3000)
      expect(lines).toBeLessThan(4500)
    })
  })
})
