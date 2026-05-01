/**
 * Mirror file-extension predicates
 *
 * Lightweight classifiers for filenames based on their extension. These
 * cover the three Mirror-source flavors (layout, components, tokens)
 * but intentionally exclude data files (.yaml/.yml) — `isMirrorFile`
 * here means "Mirror DSL source", not "any file in a Mirror project".
 *
 * For the broader storage-layer classification (which includes data
 * files and an 'unknown' fallback), see studio/storage/types.ts —
 * the two share the same extension lists but differ in scope.
 */

export const MIRROR_EXTENSIONS = {
  layout: ['.mir', '.mirror'],
  components: ['.com', '.components'],
  tokens: ['.tok', '.tokens'],
} as const

/** Any Mirror DSL source file (layout / components / tokens). Excludes data. */
export function isMirrorFile(filename: string | null | undefined): boolean {
  if (!filename) return false
  const allExtensions = [
    ...MIRROR_EXTENSIONS.layout,
    ...MIRROR_EXTENSIONS.components,
    ...MIRROR_EXTENSIONS.tokens,
  ]
  return allExtensions.some(ext => filename.endsWith(ext))
}

/** Components definition file (.com / .components). */
export function isComponentsFile(filename: string | null | undefined): boolean {
  if (!filename) return false
  return MIRROR_EXTENSIONS.components.some(ext => filename.endsWith(ext))
}

/** Layout / screen file (.mir / .mirror). */
export function isLayoutFile(filename: string | null | undefined): boolean {
  if (!filename) return false
  return MIRROR_EXTENSIONS.layout.some(ext => filename.endsWith(ext))
}
