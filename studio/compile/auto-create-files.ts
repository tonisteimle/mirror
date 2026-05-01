/**
 * Auto-create referenced files
 *
 * Scans Mirror DSL source for `import` statements and `route`
 * declarations and creates stub files for any names that don't yet
 * exist in the in-memory project — so a layout can reference a not-
 * yet-written page or component file and the compiler doesn't choke
 * on the missing import.
 *
 * The created stubs are minimal:
 *   `// <filename> (auto-created)`
 * The user can fill them in later. Filenames are normalised by
 * appending `.mirror` if no extension was given.
 *
 * Currently called once from app.js's compile() flow via
 * `autoCreateReferencedFiles(code)`. The factory pattern lets the
 * caller pass in their `files` accessor + `saveFile` writer rather
 * than tying the helper to any one storage layer.
 */

export interface AutoCreateFilesDeps {
  /** Returns the in-memory files map (mutated by `saveFile`). */
  getFiles: () => Record<string, string>
  /** Persists a file (writes to disk in desktop mode, cache otherwise). */
  saveFile: (filename: string, content: string) => void | Promise<void>
}

export interface AutoCreateFilesAPI {
  /**
   * Create a stub file for the given path if it doesn't already exist.
   * Returns true on creation, false if the file was already present.
   */
  autoCreateFile: (path: string) => boolean
  /**
   * Resolve a path to its file content. Auto-creates a stub if the
   * file is missing — used as the runtime's read callback for
   * page navigation and import resolution.
   */
  readFile: (path: string) => string | null
  /**
   * Scan code for `import` statements and `route` declarations and
   * auto-create any referenced files that don't yet exist.
   */
  autoCreateReferencedFiles: (code: string) => void
}

export function createAutoCreateFiles(deps: AutoCreateFilesDeps): AutoCreateFilesAPI {
  function normalize(path: string): string {
    return path.endsWith('.mirror') ? path : path + '.mirror'
  }

  function autoCreateFile(path: string): boolean {
    const filename = normalize(path)
    const files = deps.getFiles()
    if (files[filename]) return false
    deps.saveFile(filename, `// ${filename} (auto-created)`)
    console.log(`Auto-created: ${filename}`)
    return true
  }

  function readFile(path: string): string | null {
    const filename = normalize(path)
    const files = deps.getFiles()
    if (!files[filename]) {
      autoCreateFile(path)
    }
    return deps.getFiles()[filename] || null
  }

  function autoCreateReferencedFiles(code: string): void {
    // Find import statements: `import name` or `import name1, name2`
    const importRegex = /^\s*import\s+(.+)$/gm
    let match: RegExpExecArray | null
    while ((match = importRegex.exec(code)) !== null) {
      const names = match[1]
        .split(',')
        .map(s => s.trim())
        .filter(s => s.length > 0)
      for (const name of names) {
        // Skip quoted string imports
        if (name.startsWith('"') || name.startsWith("'")) continue
        autoCreateFile(name)
      }
    }

    // Find page routes (lowercase): `route name` or `route path/name`
    const routeRegex = /\broute\s+([a-z][a-z0-9_/]*)/g
    while ((match = routeRegex.exec(code)) !== null) {
      autoCreateFile(match[1])
    }
  }

  return { autoCreateFile, readFile, autoCreateReferencedFiles }
}
