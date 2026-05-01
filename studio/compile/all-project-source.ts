/**
 * Collect All Project Source
 *
 * Concatenates the entire project's source in dependency order
 * (data → tokens → components → layouts). Unlike collectPrelude,
 * this includes layout files and does NOT exclude the active file —
 * the result is used for cross-file token/component lookups (e.g. by
 * the property panel) where every file must be visible.
 *
 * Files are joined with bare `\n` separators; no `// === filename ===`
 * headers are inserted, since the consumer (PropertyPanel) parses by
 * tokens/components rather than by file boundaries.
 */

const FILE_TYPE_ORDER: readonly string[] = ['data', 'tokens', 'component', 'layout']

export interface CollectAllProjectSourceDeps {
  /** Returns the file map. Caller picks the source (desktop cache vs in-memory). */
  getFiles: () => Record<string, string>
  /** Per-filename type classifier (extension-driven, with content fallback). */
  getFileType: (filename: string) => string
}

export function collectAllProjectSource(deps: CollectAllProjectSourceDeps): string {
  const allFiles = deps.getFiles()
  const filesByType: Record<string, string[]> = {}

  for (const filename of Object.keys(allFiles)) {
    const type = deps.getFileType(filename)
    if (!filesByType[type]) filesByType[type] = []
    filesByType[type].push(allFiles[filename])
  }

  let allSource = ''
  for (const type of FILE_TYPE_ORDER) {
    const typeFiles = filesByType[type] || []
    for (const content of typeFiles) {
      allSource += content + '\n'
    }
  }
  return allSource
}
