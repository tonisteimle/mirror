/**
 * Collect Tokens Source
 *
 * Builds a string of all token and data file contents — used by the
 * property panel and code-modifier paths that need token resolution
 * but should NOT pick up layouts or component definitions.
 *
 * Reads from two stores in sequence:
 *   1. The active in-memory `files` map (current session edits).
 *   2. The localStorage cache, for files not yet loaded into memory.
 * Files seen in step 1 are skipped in step 2 so each token file
 * contributes its content exactly once. localStorage parse failures
 * are warned-and-swallowed; the function still returns whatever it
 * already gathered from in-memory.
 */

export type TokenFileType = 'tokens' | 'data' | 'layout' | 'component' | string

export interface CollectTokensSourceDeps {
  /** In-memory files (active session). */
  getInMemoryFiles: () => Record<string, string>
  /** Per-filename type classifier. */
  getFileType: (filename: string) => TokenFileType
  /**
   * localStorage key under which the project's files are persisted.
   * Defaults to `'mirror-files'` (the studio-app convention).
   */
  storageKey?: string
}

export function collectTokensSource(deps: CollectTokensSourceDeps): string {
  const inMemory = deps.getInMemoryFiles()
  const processed = new Set<string>()
  let tokensSource = ''

  for (const filename of Object.keys(inMemory)) {
    const type = deps.getFileType(filename)
    if (type === 'tokens' || type === 'data') {
      tokensSource += inMemory[filename] + '\n'
      processed.add(filename)
    }
  }

  try {
    const stored = localStorage.getItem(deps.storageKey ?? 'mirror-files')
    if (stored) {
      const allFiles = JSON.parse(stored) as Record<string, string>
      for (const filename of Object.keys(allFiles)) {
        if (processed.has(filename)) continue
        const type = deps.getFileType(filename)
        if (type === 'tokens' || type === 'data') {
          tokensSource += allFiles[filename] + '\n'
        }
      }
    }
  } catch (e) {
    console.warn('[collectTokensSource] Failed to read from localStorage:', e)
  }

  return tokensSource
}
