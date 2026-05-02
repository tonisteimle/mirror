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
import {
  FALLBACK_ICON,
  LUCIDE_CDN,
  sanitizeIconName,
  sanitizeSVG,
} from '../../compiler/runtime/icons'
import {
  resolveElement,
  scrollTo,
  scrollBy,
  scrollToTop,
  scrollToBottom,
} from '../../compiler/runtime/scroll'
import { createToastModule } from '../../compiler/runtime/toast'
import {
  focus as focusTyped,
  blur as blurTyped,
  clear as clearTyped,
  selectText as selectTextTyped,
  setError as setErrorTyped,
  clearError as clearErrorTyped,
} from '../../compiler/runtime/input-control'
import { show as showTyped, hide as hideTyped } from '../../compiler/runtime/visibility'
import { sanitizePageName } from '../../compiler/runtime/component-navigation'
import { applyState, removeState } from '../../compiler/runtime/state-machine'
import {
  select as selectTyped,
  deselect as deselectTyped,
  highlight as highlightTyped,
  unhighlight as unhighlightTyped,
  selectHighlighted,
  highlightNext,
  highlightPrev,
  highlightFirst,
  highlightLast,
  getHighlightableItems,
  updateSelectionBinding,
  updateTriggerText,
  updateBoundElements,
  bindTriggerText,
  deselectSiblings,
  unhighlightSiblings,
} from '../../compiler/runtime/selection'
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

  describe('icon security (audit-3 HIGH-2)', () => {
    it('sanitizeIconName is stamped verbatim from the typed module', () => {
      // .toString() of an esbuild/tsx-transpiled function may include
      // __name() helper calls; the template defines a no-op __name to
      // make those harmless. The function body itself must appear.
      expect(DOM_RUNTIME_CODE).toContain(sanitizeIconName.toString())
    })

    it('sanitizeSVG is stamped verbatim from the typed module', () => {
      expect(DOM_RUNTIME_CODE).toContain(sanitizeSVG.toString())
    })

    it('loadIcon calls sanitizeIconName before using the name', () => {
      // Match the runtime's loadIcon body and assert the validation runs
      // BEFORE any cache lookup or fetch.
      const m = DOM_RUNTIME_CODE.match(/loadIcon\(el, iconName\)\s*\{([\s\S]*?)^\s*\},/m)
      expect(m, 'expected loadIcon body in template').not.toBeNull()
      const body = m![1]
      // sanitizeIconName must be the first non-trivial call in loadIcon.
      const sanitizeIdx = body.indexOf('sanitizeIconName(iconName)')
      const cacheIdx = body.indexOf('_iconCache')
      const fetchIdx = body.indexOf('_fetchIcon')
      expect(sanitizeIdx).toBeGreaterThan(-1)
      if (cacheIdx > -1) expect(sanitizeIdx).toBeLessThan(cacheIdx)
      if (fetchIdx > -1) expect(sanitizeIdx).toBeLessThan(fetchIdx)
    })

    it('_fetchIcon calls sanitizeSVG on the network response', () => {
      const m = DOM_RUNTIME_CODE.match(/_fetchIcon\(iconName\)\s*\{([\s\S]*?)^\s*\},/m)
      expect(m, 'expected _fetchIcon body in template').not.toBeNull()
      const body = m![1]
      // sanitizeSVG must run AFTER fetch but BEFORE the cache write.
      expect(body).toMatch(/sanitizeSVG\(/)
      const fetchIdx = body.indexOf('await fetch(')
      const sanitizeIdx = body.indexOf('sanitizeSVG(')
      const cacheIdx = body.indexOf('_iconCache.set')
      expect(fetchIdx).toBeLessThan(sanitizeIdx)
      expect(sanitizeIdx).toBeLessThan(cacheIdx)
    })
  })

  describe('scroll helpers (audit-3 MED-5)', () => {
    it('typed scroll functions are stamped verbatim', () => {
      expect(DOM_RUNTIME_CODE).toContain(resolveElement.toString())
      expect(DOM_RUNTIME_CODE).toContain(scrollTo.toString())
      expect(DOM_RUNTIME_CODE).toContain(scrollBy.toString())
      expect(DOM_RUNTIME_CODE).toContain(scrollToTop.toString())
      expect(DOM_RUNTIME_CODE).toContain(scrollToBottom.toString())
    })

    it('_runtime exposes scroll helpers via shorthand property', () => {
      // The runtime should reference the top-level functions, not
      // re-implement them inline. Match the shorthand pattern in the
      // _runtime object literal.
      expect(DOM_RUNTIME_CODE).toMatch(/^\s*scrollTo,\s*$/m)
      expect(DOM_RUNTIME_CODE).toMatch(/^\s*scrollBy,\s*$/m)
      expect(DOM_RUNTIME_CODE).toMatch(/^\s*scrollToTop,\s*$/m)
      expect(DOM_RUNTIME_CODE).toMatch(/^\s*scrollToBottom,\s*$/m)
    })

    it('the old inline scroll implementations are gone', () => {
      // Earlier the template re-defined these as object methods that
      // didn't honour the smooth-behavior default. Make sure no method
      // form sneaks back.
      expect(DOM_RUNTIME_CODE).not.toMatch(/^\s*scrollTo\(el,\s*options/m)
      expect(DOM_RUNTIME_CODE).not.toMatch(/container\.scrollTop\s*=\s*0/m)
    })
  })

  describe('toast (cluster-API consolidation)', () => {
    it('createToastModule factory is stamped verbatim', () => {
      expect(DOM_RUNTIME_CODE).toContain(createToastModule.toString())
    })

    it('runtime instantiates the toast module exactly once', () => {
      // Count actual invocations (preceded by `=` or whitespace, not the
      // function declaration's parameter list).
      const matches = DOM_RUNTIME_CODE.match(/=\s*createToastModule\(\)/g)
      expect(matches?.length, 'expected one createToastModule() invocation').toBe(1)
    })

    it('_runtime exposes toast/dismissToast via shorthand', () => {
      // Shorthand pattern: `toast,` and `dismissToast,` lines, not method
      // declarations like `toast(message, type, position) {`
      expect(DOM_RUNTIME_CODE).toMatch(/^\s*toast,\s*$/m)
      expect(DOM_RUNTIME_CODE).toMatch(/^\s*dismissToast,\s*$/m)
    })

    it('the broken positional toast(message, type, position) signature is gone', () => {
      // Bug: compiler emits toast(msg, { type, position }) but the old
      // template impl took positional args, so type/position were
      // silently dropped. Must not regress.
      expect(DOM_RUNTIME_CODE).not.toMatch(/toast\(message,\s*type\s*=\s*['"]info['"]/m)
      expect(DOM_RUNTIME_CODE).not.toMatch(/^\s*_toastCounter:\s*0/m)
    })
  })

  describe('input-control (cluster-API consolidation)', () => {
    it('typed focus/blur/clear/selectText/setError/clearError are stamped', () => {
      expect(DOM_RUNTIME_CODE).toContain(focusTyped.toString())
      expect(DOM_RUNTIME_CODE).toContain(blurTyped.toString())
      expect(DOM_RUNTIME_CODE).toContain(clearTyped.toString())
      expect(DOM_RUNTIME_CODE).toContain(selectTextTyped.toString())
      expect(DOM_RUNTIME_CODE).toContain(setErrorTyped.toString())
      expect(DOM_RUNTIME_CODE).toContain(clearErrorTyped.toString())
    })

    it('_runtime exposes input-control via shorthand', () => {
      expect(DOM_RUNTIME_CODE).toMatch(/^\s*focus,\s*$/m)
      expect(DOM_RUNTIME_CODE).toMatch(/^\s*blur,\s*$/m)
      expect(DOM_RUNTIME_CODE).toMatch(/^\s*clear,\s*$/m)
      expect(DOM_RUNTIME_CODE).toMatch(/^\s*selectText,\s*$/m)
      expect(DOM_RUNTIME_CODE).toMatch(/^\s*setError,\s*$/m)
      expect(DOM_RUNTIME_CODE).toMatch(/^\s*clearError,\s*$/m)
    })

    it('the old transitionTo-based setError/clearError fallbacks are gone', () => {
      // Old template called this.transitionTo(...) at the end of
      // setError/clearError; we removed that to align with what
      // production has always actually done.
      expect(DOM_RUNTIME_CODE).not.toMatch(/this\.transitionTo\s*&&\s*this\.transitionTo/)
    })
  })

  describe('visibility (cluster-API consolidation, partial)', () => {
    it('typed show/hide are stamped verbatim', () => {
      expect(DOM_RUNTIME_CODE).toContain(showTyped.toString())
      expect(DOM_RUNTIME_CODE).toContain(hideTyped.toString())
    })

    it('_runtime exposes show/hide via shorthand', () => {
      expect(DOM_RUNTIME_CODE).toMatch(/^\s*show,\s*$/m)
      expect(DOM_RUNTIME_CODE).toMatch(/^\s*hide,\s*$/m)
    })

    it('close() falls through to top-level hide() (not this.hide)', () => {
      // After the visibility stamp, the inline close() method had to
      // change `this.hide(el)` → `hide(el)` so it picks up the
      // stamped top-level function rather than (a now-missing) method.
      const m = DOM_RUNTIME_CODE.match(/close\(el\)\s*\{([\s\S]*?)^\s*\},/m)
      expect(m, 'expected close() body in template').not.toBeNull()
      expect(m![1]).not.toMatch(/this\.hide\b/)
      expect(m![1]).toMatch(/\bhide\(el\)/)
    })
  })

  describe('navigation security (cluster-API consolidation)', () => {
    it('typed sanitizePageName is stamped verbatim', () => {
      expect(DOM_RUNTIME_CODE).toContain(sanitizePageName.toString())
    })

    it('navigateToPage calls sanitizePageName before constructing the filename', () => {
      const m = DOM_RUNTIME_CODE.match(
        /navigateToPage\(pageName,\s*clickedElement\)\s*\{([\s\S]*?)^\s*\},/m
      )
      expect(m, 'expected navigateToPage body in template').not.toBeNull()
      const body = m![1]
      const sanitizeIdx = body.indexOf('sanitizePageName(pageName)')
      const filenameIdx = body.indexOf('.endsWith(')
      const readFileIdx = body.indexOf('readFile(')
      expect(sanitizeIdx).toBeGreaterThan(-1)
      // Sanitize must run before the filename is built and before the
      // readFile callback is invoked.
      if (filenameIdx > -1) expect(sanitizeIdx).toBeLessThan(filenameIdx)
      if (readFileIdx > -1) expect(sanitizeIdx).toBeLessThan(readFileIdx)
    })

    it('the filename is built from the sanitized name, not the raw input', () => {
      // Ensure the post-sanitize variable (safePage) is what gets the
      // .mirror suffix and reaches readFile, not the original pageName.
      const m = DOM_RUNTIME_CODE.match(
        /navigateToPage\(pageName,\s*clickedElement\)\s*\{([\s\S]*?)^\s*\},/m
      )
      expect(m).not.toBeNull()
      const body = m![1]
      // safePage.endsWith → good; pageName.endsWith → regression
      expect(body).toMatch(/safePage\.endsWith/)
      expect(body).not.toMatch(/pageName\.endsWith/)
    })
  })

  describe('state-machine pure ops (audit-4)', () => {
    it('typed applyState/removeState are stamped verbatim', () => {
      expect(DOM_RUNTIME_CODE).toContain(applyState.toString())
      expect(DOM_RUNTIME_CODE).toContain(removeState.toString())
    })

    it('_runtime exposes applyState/removeState via shorthand (no inline impl)', () => {
      expect(DOM_RUNTIME_CODE).toMatch(/^\s*applyState,\s*$/m)
      expect(DOM_RUNTIME_CODE).toMatch(/^\s*removeState,\s*$/m)
      // The previous inline `applyState(el, state) { ... }` form must
      // be gone; otherwise we have two definitions racing.
      expect(DOM_RUNTIME_CODE).not.toMatch(/^\s*applyState\(el,\s*state\)\s*\{/m)
    })
  })

  describe('selection cluster (audit-4)', () => {
    it('all selection helpers + public API are stamped', () => {
      const fns = [
        selectTyped,
        deselectTyped,
        highlightTyped,
        unhighlightTyped,
        selectHighlighted,
        highlightNext,
        highlightPrev,
        highlightFirst,
        highlightLast,
        getHighlightableItems,
        updateSelectionBinding,
        updateTriggerText,
        updateBoundElements,
        bindTriggerText,
        deselectSiblings,
        unhighlightSiblings,
      ]
      for (const fn of fns) {
        expect(DOM_RUNTIME_CODE, `expected ${fn.name} stamp`).toContain(fn.toString())
      }
    })

    it('_runtime exposes the selection public API via shorthand', () => {
      const props = [
        'select',
        'deselect',
        'highlight',
        'unhighlight',
        'highlightNext',
        'highlightPrev',
        'highlightFirst',
        'highlightLast',
        'selectHighlighted',
        'getHighlightableItems',
        'updateSelectionBinding',
        'updateTriggerText',
        'updateBoundElements',
        'bindTriggerText',
      ]
      for (const p of props) {
        const re = new RegExp(`^\\s*${p},\\s*$`, 'm')
        expect(DOM_RUNTIME_CODE, `expected shorthand for ${p}`).toMatch(re)
      }
    })

    it('the previous inline this.deselect/this.highlight/etc. impls are gone', () => {
      // Old template's select() body did `this.deselect(sibling)`.
      // After stamping, select() uses lexical-scope deselectSiblings()
      // — no method dispatch. Make sure the inline impl doesn't sneak
      // back in.
      expect(DOM_RUNTIME_CODE).not.toMatch(/^\s*select\(el\)\s*\{[\s\S]*?this\.deselect/m)
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
