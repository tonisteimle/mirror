/**
 * Window globals used by browser-test integration code.
 *
 * Centralized type declarations so call sites can access these globals
 * without `as any`. Production code sets these in app.ts / bootstrap.ts;
 * tests read them via the `MirrorStudioControl` test API.
 */

// Module augmentation: add optional `modules` to StudioInstance for the
// test-only CodeModifier API. The field is wired by integration code,
// not by bootstrap.ts itself.
declare module '../bootstrap' {
  interface StudioInstance {
    modules?: {
      compiler?: {
        codeModifier?: CodeModifierTestAPI
      }
    }
  }
}

/**
 * Subset of the CodeModifier surface used by `MirrorStudioControl`.
 * Each method returns a `ModificationResult`-compatible shape.
 */
export interface CodeModifierTestAPI {
  setProperty(
    nodeId: string,
    name: string,
    value: string
  ): CodeModifierResult
  removeProperty(nodeId: string, name: string): CodeModifierResult
  toggleProperty(
    nodeId: string,
    name: string,
    enabled: boolean
  ): CodeModifierResult
  setToken(name: string, value: string): CodeModifierResult
  removeToken(name: string): CodeModifierResult
  addToken(name: string, value: string): CodeModifierResult
  setComponentProperty(
    componentName: string,
    propertyName: string,
    value: string
  ): CodeModifierResult
  removeComponentProperty(
    componentName: string,
    propertyName: string
  ): CodeModifierResult
}

export interface CodeModifierResult {
  success: boolean
  newSource?: string
  error?: string
  change?: { from: number; to: number; insert: string }
}

/**
 * Tauri bridge shim used by `studio/storage/project-actions.ts`.
 *
 * Note: Production code never sets `__TAURI_BRIDGE__` today — only tests
 * inject it. The runtime sets `window.TauriBridge` (different name, different
 * shape, see `studio/tauri-bridge.ts`). This shim exists so the read-side
 * call sites can be type-safe; whether they should be wired to the real
 * `TauriBridge` is tracked in `docs/findings.md`.
 */
export interface TauriBridgeShim {
  newProject?: (type: 'empty' | 'demo') => Promise<void>
  loadDemo?: () => Promise<void>
  importProject?: () => Promise<boolean>
  exportProject?: () => Promise<void>
}

/**
 * Minimal JSZip surface used by `studio/storage/project-actions.ts`.
 * Library is lazy-loaded from CDN and attaches itself to window.
 */
export interface JSZipConstructor {
  new (): JSZipInstance
}

export interface JSZipInstance {
  file(path: string, content: string): void
  generateAsync(options: { type: 'blob' }): Promise<Blob>
}

declare global {
  interface Window {
    /**
     * Test-only compile shortcut that bypasses prelude assembly.
     * Set by app.ts when running under the browser test harness.
     */
    __compileTestCode?: (code: string) => Promise<void> | void
    /**
     * Test-only setter that resets the prelude offset to zero,
     * keeping app.ts module state and core/state in sync.
     */
    __setPreludeOffset?: (offset: number) => void
    /**
     * Tauri bridge object — currently only set by tests; production
     * uses `window.TauriBridge` (different shape).
     */
    __TAURI_BRIDGE__?: TauriBridgeShim
    /**
     * JSZip global, attached by the lazy-loaded CDN script.
     */
    JSZip?: JSZipConstructor
    // Note: window.MirrorLang is declared in studio/app.ts (MirrorLangGlobal)
    // including the optional PropertyExtractor ctor — see app.ts.
  }
}

export {}
