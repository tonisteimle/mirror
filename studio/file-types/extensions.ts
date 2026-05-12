/**
 * Mirror file-extension predicates
 *
 * Lightweight classifiers for filenames based on their extension. These
 * cover the three Mirror-source flavors (layout, components, tokens)
 * but intentionally exclude data files (.yaml/.yml) — `isMirrorSourceFile`
 * means "Mirror DSL source", not "any file in a Mirror project".
 *
 * Sibling predicates with different scopes:
 *   - `isMirrorProjectFile` (studio/storage/types.ts) — DSL source PLUS data files
 *   - `isProjectImportFile` (studio/storage/project-actions.ts) — also accepts `.data`
 */

export const MIRROR_EXTENSIONS = {
  layout: ['.mir', '.mirror'],
  components: ['.com', '.components'],
  tokens: ['.tok', '.tokens'],
} as const

/** Any Mirror DSL source file (layout / components / tokens). Excludes data. */
export function isMirrorSourceFile(filename: string | null | undefined): boolean {
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
