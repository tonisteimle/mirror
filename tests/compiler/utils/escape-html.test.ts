/**
 * escape-html — direct unit-tests
 *
 * The shared string-based HTML escaper used by the compile CLI
 * (html-template), studio dialog, export-button, and the desktop-files
 * fallback. Indirect coverage exists in property-panel-utils tests
 * (DOM-based variant), but the consolidated compiler/utils/escape-html
 * implementation needs its own pin so a future XSS-hardening change
 * (e.g. extending to `=` or backtick) doesn't regress silently.
 */

import { describe, it, expect } from 'vitest'
import { escapeHtml } from '../../../compiler/utils/escape-html'

describe('escapeHtml', () => {
  it('escapes the 5 standard HTML/attribute entities', () => {
    expect(escapeHtml('&')).toBe('&amp;')
    expect(escapeHtml('<')).toBe('&lt;')
    expect(escapeHtml('>')).toBe('&gt;')
    expect(escapeHtml('"')).toBe('&quot;')
    expect(escapeHtml("'")).toBe('&#39;')
  })

  it('escapes a script-tag injection attempt', () => {
    expect(escapeHtml('<script>alert("x")</script>')).toBe(
      '&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;'
    )
  })

  it('escapes attribute-context apostrophes', () => {
    expect(escapeHtml(`onclick='alert(1)'`)).toBe('onclick=&#39;alert(1)&#39;')
  })

  it('handles ampersands first to avoid double-escape', () => {
    // If ordering were wrong, &amp;lt; could become &amp;amp;lt; on a
    // re-pass over the result. Single-pass replace via the regex+map
    // sidesteps the issue.
    expect(escapeHtml('A & B & C')).toBe('A &amp; B &amp; C')
    expect(escapeHtml('&lt;')).toBe('&amp;lt;')
  })

  it('passes safe text through unchanged', () => {
    expect(escapeHtml('hello world')).toBe('hello world')
    expect(escapeHtml('12345')).toBe('12345')
    expect(escapeHtml('')).toBe('')
  })

  it('returns empty string for null and undefined inputs', () => {
    expect(escapeHtml(null)).toBe('')
    expect(escapeHtml(undefined)).toBe('')
  })

  it('handles unicode and multibyte characters unchanged', () => {
    expect(escapeHtml('Hello 世界')).toBe('Hello 世界')
    expect(escapeHtml('💻 emoji')).toBe('💻 emoji')
    expect(escapeHtml('öäü')).toBe('öäü')
  })

  it('escapes mixed content correctly', () => {
    expect(escapeHtml(`<img src="x" onerror='alert(1)'>`)).toBe(
      '&lt;img src=&quot;x&quot; onerror=&#39;alert(1)&#39;&gt;'
    )
  })
})
