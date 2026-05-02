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
    // Note: window.MirrorLang is declared in studio/app.ts (MirrorLangGlobal)
    // including the optional PropertyExtractor ctor — see app.ts.
  }
}

export {}
