/**
 * Prelude Line Offset
 *
 * Calculates how many lines of prelude precede the active file's
 * content in the merged source that gets passed to the compiler.
 * Used by the editor↔compiler-error mapping path so a parser error
 * on "merged line N" can be mapped back to the editor's line
 * (N - offset).
 *
 * The merged-source structure (built in app.js's compile()) is:
 *   <prelude>\n\n// === <currentFile> ===\n<editor content>
 *
 * So the offset is:
 *   prelude_line_count
 *   + 2 (blank line + comment line from the separator)
 *   - 1 (because editor line 1 maps to the first content line)
 *
 * Non-layout files (tokens / components / data) have no prelude
 * and return 0.
 */

export interface PreludeLineOffsetDeps {
  /** Active file's name. */
  getCurrentFile: () => string
  /** Per-filename type classifier. */
  getFileType: (filename: string) => string
  /** Returns the prelude string for the active file (or empty). */
  getPreludeCode: (excludeFile: string) => string
}

export function getPreludeLineOffset(deps: PreludeLineOffsetDeps): number {
  const currentFile = deps.getCurrentFile()
  if (deps.getFileType(currentFile) !== 'layout') return 0

  const prelude = deps.getPreludeCode(currentFile)
  if (!prelude) return 0

  const preludeLines = (prelude.match(/\n/g) || []).length + 1
  // Separator is `\n\n// === ${file} ===\n`: two newlines + one comment
  // line + one trailing newline = 3 additional lines. Subtract 1 so
  // editor line 1 maps to the first content line in the merged source.
  return preludeLines + 3 - 1
}
