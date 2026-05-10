/**
 * Preview CDP — shared selector helpers.
 *
 * Wraps the basic `byId` / `byPath` / `byText` selector shapes so test
 * files don't have to repeat the structured-object boilerplate. All
 * resolution still flows through `__mirrorActions.resolveSelector`,
 * which is read-only (no input pipeline involved).
 */

import type { Selector } from '../../../mirror-actions'

export const byId = (id: string): Selector => ({ byId: id })
export const byText = (txt: string, nth?: number): Selector =>
  nth === undefined ? { byText: txt } : { byText: txt, nth }
export const byPath = (path: string, nth?: number): Selector =>
  nth === undefined ? { byPath: path } : { byPath: path, nth }
export const byTag = (tag: string, nth?: number): Selector =>
  nth === undefined ? { byTag: tag } : { byTag: tag, nth }

/** First Mirror-rendered preview element (lowest data-mirror-id). */
export const firstPreviewNode = (): Selector => byId('node-1')

/** All current preview node ids in DOM order. */
export function allPreviewNodeIds(): string[] {
  const els = Array.from(document.querySelectorAll('#preview [data-mirror-id]'))
  return els.map(el => el.getAttribute('data-mirror-id') as string)
}

/** Innermost Mirror element at viewport point (or null). */
export function innermostMirrorAt(x: number, y: number): HTMLElement | null {
  const el = document.elementFromPoint(x, y)
  if (!el) return null
  return (el.closest('[data-mirror-id]') as HTMLElement) ?? null
}
