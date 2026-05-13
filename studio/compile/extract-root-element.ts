/**
 * Root-element extractor for the compile() render pipe.
 *
 * `executeMirrorJS()` returns one of three shapes depending on backend:
 *   - DOM backend (default for `studio`): the `createUI()` function
 *     returns the root `Element` directly.
 *   - Legacy / React-ish backends: an object `{ root: Element }`.
 *   - On parse/eval failure: `null` / `undefined`.
 *
 * Pure helper: collapses the dispatch into a single Element|null result.
 * Callers (preview.appendChild) only proceed when it's an Element.
 *
 * Strict: if `ui.root` exists but isn't an Element, the result is `null`
 * rather than risking `appendChild(non-element)`.
 */

export function extractRootElement(ui: unknown): Element | null {
  if (!ui) return null
  if (ui instanceof Element) return ui
  const root = (ui as { root?: unknown }).root
  return root instanceof Element ? root : null
}
