/**
 * Collect Prelude
 *
 * Builds the prelude code that gets prepended to a layout file before
 * compilation. The prelude is the union of all data, token, and
 * component files in the project, ordered to match the CLI's
 * project-mode pass (compiler/cli/compile.ts):
 *
 *   data  → tokens → components
 *
 * Two file caches can hold project content: the Tauri-synced
 * `desktopFiles` and the in-memory `files` map (used by the test API
 * and browser-only flows). They are merged so the prelude reflects
 * the union — a file added via panel.files.create that didn't make
 * it into the desktop cache stays visible to compilation.
 */

export type PreludeFileType = 'data' | 'tokens' | 'component' | string

export interface CollectPreludeDeps {
  /** Active file's name; this file is excluded from the prelude. */
  excludeFile: string
  /** In-memory `files` global (test API + browser fallback). */
  getInMemoryFiles: () => Record<string, string>
  /** Tauri-synced desktopFiles cache (may be null/undefined). */
  getDesktopFiles: () => Record<string, string> | null | undefined
  /** Per-filename type classifier (extension-driven, with content fallback). */
  getFileType: (filename: string) => PreludeFileType
}

export function collectPrelude(deps: CollectPreludeDeps): string {
  const desktopFiles = deps.getDesktopFiles() || {}
  const allFiles: Record<string, string> = { ...deps.getInMemoryFiles(), ...desktopFiles }

  const dataFiles: string[] = []
  const tokenFiles: string[] = []
  const componentFiles: string[] = []

  for (const filename of Object.keys(allFiles)) {
    if (filename === deps.excludeFile) continue
    const fileType = deps.getFileType(filename)
    if (fileType === 'data') dataFiles.push(filename)
    else if (fileType === 'tokens') tokenFiles.push(filename)
    else if (fileType === 'component') componentFiles.push(filename)
  }

  const sections: string[] = []

  // Data first. Inline the data file content WITHOUT a header — the
  // header would break Mirror's data-block parser when an indented
  // data declaration follows directly. Tokens/components get the
  // `// === ${filename} ===` header (their parsers handle it).
  dataFiles.sort()
  for (const filename of dataFiles) {
    const content = allFiles[filename]
    if (content && content.trim()) sections.push(content)
  }

  tokenFiles.sort()
  for (const filename of tokenFiles) {
    const content = allFiles[filename]
    if (content && content.trim()) sections.push(`// === ${filename} ===\n${content}`)
  }

  componentFiles.sort()
  for (const filename of componentFiles) {
    const content = allFiles[filename]
    if (content && content.trim()) sections.push(`// === ${filename} ===\n${content}`)
  }

  return sections.join('\n\n')
}
