/**
 * Default CSS Loader
 *
 * Locates `mirror-defaults.css` in either the installed package (`dist/`)
 * or the source tree (`assets/`). Result is cached after first read.
 */

import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

let cached: string | null = null

const CANDIDATE_PATHS: string[] = [
  // Installed: dist/build-cli.js → dist/mirror-defaults.css
  path.resolve(__dirname, 'mirror-defaults.css'),
  // Source via tsx: compiler/cli/defaults-css.ts → assets/mirror-defaults.css
  path.resolve(__dirname, '..', '..', 'assets', 'mirror-defaults.css'),
  // Source via tsx (run from compiler/): compiler/build-cli.ts → assets/...
  path.resolve(__dirname, '..', 'assets', 'mirror-defaults.css'),
]

export function loadDefaultsCss(): string {
  if (cached !== null) return cached
  for (const candidate of CANDIDATE_PATHS) {
    if (fs.existsSync(candidate)) {
      cached = fs.readFileSync(candidate, 'utf-8')
      return cached
    }
  }
  throw new Error(`mirror-defaults.css not found. Tried:\n  ${CANDIDATE_PATHS.join('\n  ')}`)
}
