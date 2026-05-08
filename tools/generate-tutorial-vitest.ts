#!/usr/bin/env npx tsx
/**
 * Tutorial Test Vitest Adapter Generator
 *
 * Reads the existing browser-based tutorial tests under
 * `studio/test-api/suites/tutorial/*.test.ts` and emits Vitest-compatible
 * mirror copies under `tests/tutorial/*.test.ts` by rewriting the import
 * line:
 *
 *   - import { testWithSetup, ... } from '../../test-runner'
 *   + import { testWithSetup, ... } from '<adapter>'
 *   + import { runTestCases } from '<adapter>'
 *   + // ... generated array stays as-is ...
 *   + runTestCases('<chapter title>', <exportName>Tests)
 *
 * Run: npx tsx tools/generate-tutorial-vitest.ts
 */

import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const SRC_DIR = path.resolve(__dirname, '..', 'studio', 'test-api', 'suites', 'tutorial')
const DST_DIR = path.resolve(__dirname, '..', 'tests', 'tutorial')
const ADAPTER_REL = '../utils/mirror-test-adapter'

function transform(srcContent: string, fileName: string): string {
  // Drop generated TestAPI type import (adapter exports its own)
  let out = srcContent.replace(
    /import\s+type\s*\{\s*TestAPI\s*\}\s+from\s+['"]\.\.\/\.\.\/types['"]\s*\n?/g,
    ''
  )

  // Rewire test helpers to the adapter
  out = out.replace(
    /import\s*\{\s*([^}]+)\s*\}\s+from\s+['"]\.\.\/\.\.\/test-runner['"]/,
    (_match, names) =>
      `import { ${names.trim()}, runTestCases, type TestAPI } from '${ADAPTER_REL}'`
  )

  // Find the exported test array — pattern: `export const <name>Tests: TestCase[] = describe(...`
  const exportMatch = out.match(/export\s+const\s+(\w+Tests)\s*:/)
  if (!exportMatch) {
    throw new Error(`Could not find exported tests array in ${fileName}`)
  }
  const exportName = exportMatch[1]

  // Find the describe call's first argument (the suite title)
  const titleMatch = out.match(/describe\s*\(\s*['"]([^'"]+)['"]/)
  const suiteTitle = titleMatch ? titleMatch[1] : `Tutorial: ${fileName}`

  // Add jsdom env directive at top + runTestCases call at bottom
  const header = '/** @vitest-environment jsdom */\n'
  out = header + out
  out += `\nrunTestCases(${JSON.stringify(suiteTitle)}, ${exportName})\n`

  return out
}

// Files that need runtime data-binding / state-machine evaluation — they
// only work with the live studio runtime (or a future enhanced adapter).
// Keep them in the browser-test stack for now.
const RUNTIME_REQUIRED = new Set<string>([
  'functions-deep.test.ts',
  'states-deep.test.ts',
  'overlays-deep.test.ts',
])

function main(): void {
  if (!fs.existsSync(SRC_DIR)) {
    console.error(`Source dir missing: ${SRC_DIR}`)
    process.exit(1)
  }
  fs.mkdirSync(DST_DIR, { recursive: true })

  const files = fs
    .readdirSync(SRC_DIR)
    .filter(f => f.endsWith('.test.ts') && !RUNTIME_REQUIRED.has(f))
  let written = 0
  let skipped = 0

  for (const fileName of files) {
    const srcPath = path.join(SRC_DIR, fileName)
    const dstPath = path.join(DST_DIR, fileName)
    const content = fs.readFileSync(srcPath, 'utf-8')

    try {
      const transformed = transform(content, fileName)
      fs.writeFileSync(dstPath, transformed)
      written++
      console.log(`  ✓ ${fileName}`)
    } catch (err) {
      skipped++
      console.warn(`  ⚠ ${fileName}: ${(err as Error).message}`)
    }
  }

  console.log(`\nGenerated ${written} Vitest mirrors, skipped ${skipped}`)
  console.log(`Output: ${DST_DIR}`)
}

main()
