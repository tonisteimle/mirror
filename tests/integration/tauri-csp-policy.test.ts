/**
 * Tauri CSP Policy — Pinning-Test
 *
 * The Tauri WebView's Content-Security-Policy is the load-bearing
 * defense against XSS in user-supplied Mirror code. This test pins
 * the policy so:
 *
 *   1. CSP can never silently regress to `null` ("max-permissive").
 *   2. Adding a new external host (esm.sh, cdnjs, …) without updating
 *      the policy fails CI — the runtime fetch would silently break.
 *   3. The known-required `'unsafe-eval'` (Mirror compiler uses
 *      `new Function()` extensively in compiler/backends/dom/runtime-template
 *      and compiler/runtime/data-binding) is documented and can't be
 *      removed by mistake.
 *
 * Source of truth: `src-tauri/tauri.conf.json` → `app.security.csp`.
 *
 * If you add a new external dependency:
 *   1. Update the CSP string in `tauri.conf.json`.
 *   2. Add the host to the appropriate REQUIRED_*_HOSTS list below.
 *   3. Document why in the comment above each list.
 */

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const CONFIG_PATH = resolve(__dirname, '../../src-tauri/tauri.conf.json')

interface TauriConfig {
  app: {
    security: {
      csp: string | null
    }
  }
}

function loadCsp(): string {
  const raw = readFileSync(CONFIG_PATH, 'utf-8')
  const config = JSON.parse(raw) as TauriConfig
  const csp = config.app.security.csp
  if (typeof csp !== 'string') {
    throw new Error(
      'tauri.conf.json: app.security.csp must be a string. ' +
        '`null` (max-permissive) is forbidden — it disables the WebView XSS defense. ' +
        'See tests/tauri-config/csp-policy.test.ts for required directives.'
    )
  }
  return csp
}

/**
 * Parse a CSP header into a directive → tokens map. Tokens preserve
 * quoting so `'self'` and `'unsafe-inline'` round-trip cleanly.
 */
function parseCsp(csp: string): Record<string, string[]> {
  const directives: Record<string, string[]> = {}
  for (const segment of csp.split(';')) {
    const trimmed = segment.trim()
    if (!trimmed) continue
    const [name, ...tokens] = trimmed.split(/\s+/)
    directives[name] = tokens
  }
  return directives
}

// ===========================================================================
// Required hosts per directive — keep in sync with CSP in tauri.conf.json
// ===========================================================================
//
// Each entry is justified by a specific runtime call site. If a host is
// no longer used, REMOVE it (don't leave dead allowlist entries — they're
// just attack surface).

/** Inline-script + dynamic-import sources. */
const REQUIRED_SCRIPT_HOSTS = [
  // CodeMirror 6 (studio/index.html import-map) + Tauri runtime APIs
  // (studio/tauri-bridge.ts dynamic imports) + tom-select.
  'https://esm.sh',
  // JSZip lazy-loaded via dynamic <script> tag
  // (studio/storage/project-actions.ts:456).
  'https://cdnjs.cloudflare.com',
]

/** XHR/fetch/WebSocket destinations. */
const REQUIRED_CONNECT_HOSTS = [
  // CodeMirror dynamic deep-imports.
  'https://esm.sh',
  // JSZip module fetch (after the <script> tag loads).
  'https://cdnjs.cloudflare.com',
  // Lucide icon manifest fetch (studio/pickers/icon/picker.ts:66).
  'https://unpkg.com',
  // Per-icon SVG fetch (studio/pickers/icon/picker.ts:280).
  'https://api.iconify.design',
  // Image upload from editor drop-target (studio/editor/image-drop-handler.ts).
  'https://api.imgbb.com',
  // ai-bridge HTTP shim when running in browser-mode without Tauri.
  'http://localhost:*',
]

/** External stylesheet sources. */
const REQUIRED_STYLE_HOSTS = [
  // tom-select default theme CSS (studio/index.html:25).
  'https://esm.sh',
]

// ===========================================================================
// Tests
// ===========================================================================

describe('Tauri CSP policy', () => {
  it('CSP is set (not null, not missing)', () => {
    const csp = loadCsp()
    expect(csp.length).toBeGreaterThan(50)
  })

  it('default-src restricts to self', () => {
    const directives = parseCsp(loadCsp())
    expect(directives['default-src']).toEqual(["'self'"])
  })

  it.each(REQUIRED_SCRIPT_HOSTS)('script-src whitelists %s', host => {
    const directives = parseCsp(loadCsp())
    expect(directives['script-src']).toContain(host)
  })

  it.each(REQUIRED_CONNECT_HOSTS)('connect-src whitelists %s', host => {
    const directives = parseCsp(loadCsp())
    expect(directives['connect-src']).toContain(host)
  })

  it.each(REQUIRED_STYLE_HOSTS)('style-src whitelists %s', host => {
    const directives = parseCsp(loadCsp())
    expect(directives['style-src']).toContain(host)
  })

  it("script-src allows 'unsafe-eval' (Mirror compiler uses new Function)", () => {
    // This is a deliberate trade-off, not an oversight. The Mirror
    // compiler's runtime-template generates code at evaluation time
    // via `new Function()` — see compiler/backends/dom/runtime-template,
    // compiler/runtime/data-binding, studio/compile/component-renderer.
    // Removing this would require a full compiler rewrite.
    const directives = parseCsp(loadCsp())
    expect(directives['script-src']).toContain("'unsafe-eval'")
  })

  it("script-src allows 'unsafe-inline' (import-map and bootstrap)", () => {
    // studio/index.html embeds a `<script type="importmap">` block.
    // CSP nonces would let us drop this, but require build-time injection.
    const directives = parseCsp(loadCsp())
    expect(directives['script-src']).toContain("'unsafe-inline'")
  })

  it("style-src allows 'unsafe-inline' (DOM uses style attributes)", () => {
    // Inline styles are pervasive in studio rendering — every
    // resize/drag/picker sets `el.style.*`.
    const directives = parseCsp(loadCsp())
    expect(directives['style-src']).toContain("'unsafe-inline'")
  })

  it('img-src allows arbitrary https (user-supplied Image src)', () => {
    // Mirror code can reference any image URL: `Image src "https://…"`.
    // Locking img-src down would break user content.
    const directives = parseCsp(loadCsp())
    expect(directives['img-src']).toContain('https:')
    expect(directives['img-src']).toContain('data:')
    expect(directives['img-src']).toContain('blob:')
  })

  it("hardens object-src to 'none' (no Flash/object embeds)", () => {
    const directives = parseCsp(loadCsp())
    expect(directives['object-src']).toEqual(["'none'"])
  })

  it("hardens frame-ancestors to 'none' (clickjacking defense)", () => {
    const directives = parseCsp(loadCsp())
    expect(directives['frame-ancestors']).toEqual(["'none'"])
  })

  it("hardens base-uri to 'self' (no <base> injection)", () => {
    const directives = parseCsp(loadCsp())
    expect(directives['base-uri']).toEqual(["'self'"])
  })

  it("hardens form-action to 'self' (no form-based exfil)", () => {
    const directives = parseCsp(loadCsp())
    expect(directives['form-action']).toEqual(["'self'"])
  })

  it('connect-src allows ipc: protocol (Tauri command invocation)', () => {
    const directives = parseCsp(loadCsp())
    expect(directives['connect-src']).toContain('ipc:')
    expect(directives['connect-src']).toContain('http://ipc.localhost')
  })
})
