/**
 * Validation Sweep
 *
 * Hard gate: every Mirror snippet that ships with the project MUST pass
 * `validate()` cleanly. Covers two corpora that previously had no validator
 * coverage:
 *
 * 1. Tutorial examples extracted from `docs/tutorial/*.html`
 * 2. All `*.mirror` / `*.mir` fixtures under `tests/`
 *
 * A snippet is "valid" when `validate(source).valid === true`. Warnings are
 * tolerated; errors are not.
 */

import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'fs'
import { join, relative } from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'
import { validate } from '../../compiler/validator'
import { extractTutorialExamples } from './tutorial/extract-examples'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const repoRoot = join(__dirname, '../..')

function formatErrors(source: string, errors: ReturnType<typeof validate>['errors']): string {
  const lines = source.split('\n')
  return errors
    .map(e => {
      const ctx = e.line && lines[e.line - 1] ? `\n  > ${lines[e.line - 1]}` : ''
      return `  [${e.code}] line ${e.line ?? '?'}:${e.column ?? '?'} — ${e.message}${ctx}`
    })
    .join('\n')
}

// ============================================================================
// Tutorial examples
// ============================================================================

describe('Validation sweep: tutorial examples', () => {
  const chapters = extractTutorialExamples()

  if (chapters.length === 0) {
    it.skip('no tutorial chapters found', () => {})
    return
  }

  for (const chapter of chapters) {
    describe(chapter.name, () => {
      chapter.examples.forEach((code, index) => {
        it(`example ${index + 1} validates`, () => {
          const result = validate(code)
          if (!result.valid) {
            throw new Error(
              `Tutorial ${chapter.file} example ${index + 1} has ${result.errorCount} error(s):\n` +
                formatErrors(code, result.errors) +
                `\n\nSource:\n${code}`
            )
          }
        })
      })
    })
  }
})

// ============================================================================
// Mirror fixtures
// ============================================================================

function findMirrorFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    let s
    try {
      s = statSync(full)
    } catch {
      continue
    }
    if (s.isDirectory()) {
      findMirrorFiles(full, out)
    } else if (entry.endsWith('.mirror') || entry.endsWith('.mir')) {
      out.push(full)
    }
  }
  return out
}

describe('Validation sweep: Mirror fixtures', () => {
  const fixtures = findMirrorFiles(join(repoRoot, 'tests'))

  it('finds at least 100 fixture files', () => {
    expect(fixtures.length).toBeGreaterThanOrEqual(100)
  })

  for (const file of fixtures) {
    const rel = relative(repoRoot, file)
    it(rel, () => {
      const source = readFileSync(file, 'utf-8')
      const result = validate(source)
      if (!result.valid) {
        throw new Error(
          `${rel} has ${result.errorCount} validation error(s):\n` +
            formatErrors(source, result.errors)
        )
      }
    })
  }
})
