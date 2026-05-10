/**
 * Preview CDP — shared action handle.
 *
 * Every preview-cdp test reaches `__mirrorActions` via this helper. If
 * the API is missing or the underlying CDP-input bridge isn't installed,
 * `requireActions()` throws with a clear message — no silent fallback to
 * synthetic events.
 *
 * **Grundregel** (siehe `docs/TEST-FRAMEWORK.md` „Grundprinzip — Maus
 * und Keyboard, nichts anderes"): jeder Aufruf hier endet in
 * `cdpInput.*` (CDP Trusted Mouse + Keyboard). Keine direkten
 * Studio-API-Calls (`controller.startDrag`, `panel.changeProperty`,
 * `editor.dispatch`), keine synthetischen Events (`el.click`,
 * `el.dispatchEvent`).
 */

import type { MirrorActionsAPI } from '../../../mirror-actions'

export function requireActions(): MirrorActionsAPI {
  const win = globalThis as unknown as { __mirrorActions?: MirrorActionsAPI }
  const actions = win.__mirrorActions
  if (!actions) {
    throw new Error(
      '[preview-cdp] window.__mirrorActions missing. The CDP-driven helper layer ' +
        'must be installed (it is, when the studio test-api bundle loads). ' +
        'Suite tests in preview-cdp/ require this helper layer.'
    )
  }
  return actions
}
