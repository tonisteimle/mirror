/**
 * Mirror Runtime Debug-Flag
 *
 * Single source of truth für `window.__MIRROR_DEBUG__`. Vor diesem Modul
 * gab es drei separate `isDebug()`-Definitionen (dom-runtime.ts, data.ts,
 * backends/dom/runtime-template/index.ts) — wenn jemand die Flag umbenennt, muss nur eine
 * Stelle nachgezogen werden.
 *
 * Verwendung:
 *
 *   import { isDebug } from './debug'
 *   if (isDebug()) console.log('[Foo] something happened', value)
 */

declare global {
  interface Window {
    __MIRROR_DEBUG__?: boolean
  }
}

/** True wenn `window.__MIRROR_DEBUG__ === true` (im Browser-Kontext). */
export function isDebug(): boolean {
  return typeof window !== 'undefined' && window.__MIRROR_DEBUG__ === true
}
