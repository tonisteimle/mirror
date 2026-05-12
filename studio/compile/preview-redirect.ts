/**
 * Preview-redirect resolver for compile().
 *
 * When the editor is on a non-layout file (tokens, components, data) we
 * want the preview to still show *something useful* — typically the layout
 * that consumes those tokens/components. The user records that layout
 * once in `state.previewFile`; compile() then redirects so the codegen
 * runs against the layout while the prelude picks up the just-edited
 * tokens/components from `files[currentFile]`.
 *
 * This helper takes the editor's current file + the active preview-file
 * (if any) and returns which file+code compile() should actually run on.
 * Pure: no state mutation, no I/O. Caller has already stashed the editor
 * content into `files[currentFile]` so the prelude builder will see it.
 */

export interface PreviewRedirectInputs {
  /** The file the editor is currently showing. */
  currentFile: string
  /** Content of the current file (already mirror-coded into `files`). */
  currentCode: string
  /** The layout the user pinned as preview target (or null/undefined). */
  previewFile: string | null | undefined
  /** Map of all known files; consulted only when redirecting. */
  files: Record<string, string>
  /** File-type detector. The redirect only fires when the editor is on
   *  a non-layout file AND the previewFile resolves to a layout. */
  getFileType: (file: string) => string
}

export interface PreviewRedirectResult {
  /** File the compile pipeline should consume. */
  compileFile: string
  /** Source the compile pipeline should consume. */
  compileCode: string
}

export function resolvePreviewRedirect(inputs: PreviewRedirectInputs): PreviewRedirectResult {
  const { currentFile, currentCode, previewFile, files, getFileType } = inputs

  // Default: compile what the editor is editing.
  const defaultResult: PreviewRedirectResult = {
    compileFile: currentFile,
    compileCode: currentCode,
  }

  // Editor on a layout file → never redirect (the editor IS the preview source).
  if (getFileType(currentFile) === 'layout') return defaultResult

  // No preview file pinned, or pinned to the same file, or pinned to a
  // non-layout file → no redirect.
  if (!previewFile || previewFile === currentFile) return defaultResult
  if (getFileType(previewFile) !== 'layout') return defaultResult

  return {
    compileFile: previewFile,
    compileCode: files[previewFile] ?? '',
  }
}
