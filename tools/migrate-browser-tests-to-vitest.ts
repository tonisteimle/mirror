#!/usr/bin/env npx tsx
/**
 * Browser-test → Vitest migrator
 *
 * Reads test files under `studio/test-api/suites/<sourceDir>/` and emits
 * Vitest-compatible mirrors under `tests/<targetDir>/` by rewriting
 * imports to point at `tests/utils/mirror-test-adapter.ts` and appending
 * a `runTestCases(...)` invocation per file. Helper modules (non-`.test.ts`)
 * are copied verbatim with their imports rewired likewise.
 *
 * Run: npx tsx tools/migrate-browser-tests-to-vitest.ts <sourceDir> <targetDir>
 *
 * Examples:
 *   tools/migrate-browser-tests-to-vitest.ts tutorial tutorial
 *   tools/migrate-browser-tests-to-vitest.ts compiler-verification compiler-verification
 */

import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const PROJECT_ROOT = path.resolve(__dirname, '..')
const SUITES_ROOT = path.join(PROJECT_ROOT, 'studio', 'test-api', 'suites')
const TESTS_ROOT = path.join(PROJECT_ROOT, 'tests')

const ADAPTER_REL_DEPTH_2 = '../utils/mirror-test-adapter'

function rewireImports(content: string, adapterRel: string): string {
  // Drop `import type { ... } from '../../types'` (trailing newline preserved if
  // present). We only delete the import statement, never the newline that
  // belongs to whatever follows.
  let out = content.replace(
    /^[ \t]*import\s+type\s*\{[^}]*\}\s+from\s+['"]\.\.\/\.\.\/types['"]\s*;?[ \t]*\n?/gm,
    ''
  )

  // `import { testWithSetup, describe, type TestCase } from '../../test-runner'`
  out = out.replace(
    /^[ \t]*import\s*\{\s*([^}]+)\s*\}\s+from\s+['"]\.\.\/\.\.\/test-runner['"]\s*;?[ \t]*$/m,
    (_match, namesRaw) => {
      const names = namesRaw
        .split(',')
        .map((s: string) => s.trim())
        .filter((s: string) => s)
      const merged = Array.from(new Set([...names, 'runTestCases', 'type TestAPI']))
      return `import { ${merged.join(', ')} } from '${adapterRel}'`
    }
  )

  return out
}

function rewireHelperImports(content: string): string {
  // Helpers in compiler-verification import from same dir; keep as-is.
  // No type-only TestAPI imports usually. Strip any `from '../../test-runner'`
  // and `from '../../types'` like above so they don't try to load browser API.
  let out = content
  out = out.replace(
    /import\s+type\s*\{\s*TestAPI\s*\}\s+from\s+['"]\.\.\/\.\.\/types['"]\s*;?\n?/g,
    ''
  )
  out = out.replace(
    /import\s+type\s*\{\s*TestCase\s*\}\s+from\s+['"]\.\.\/\.\.\/types['"]\s*;?\n?/g,
    ''
  )
  return out
}

function transformTestFile(content: string, fileName: string): string {
  let out = rewireImports(content, ADAPTER_REL_DEPTH_2)

  const exportMatch = out.match(/export\s+const\s+(\w+Tests)\s*:/)
  if (!exportMatch) {
    throw new Error(`No exported tests array in ${fileName}`)
  }
  const exportName = exportMatch[1]

  const titleMatch = out.match(/describe\s*\(\s*['"]([^'"]+)['"]/)
  const suiteTitle = titleMatch ? titleMatch[1] : fileName.replace('.test.ts', '')

  out = '/** @vitest-environment jsdom */\n' + out
  out += `\nrunTestCases(${JSON.stringify(suiteTitle)}, ${exportName})\n`
  return out
}

/**
 * Patterns that signal a test exercises real DOM interaction or studio
 * runtime which jsdom alone cannot replay through Mirror's state-machine
 * runtime. We skip these and leave them in the browser stack.
 */
const RUNTIME_PATTERNS = [
  /api\.interact\./,
  /api\.zag\./,
  /api\.studio\./,
  /api\.codemirror\./,
  /api\.events\./,
  /api\.panel\./,
  /api\.fixtures\./,
  /api\.snapping\./,
  /__mirrorStudio__/,
  /__dragTest/,
  // Container queries (compact:/regular:/wide:) — jsdom does not implement
  // @container, so the responsive-style assertions in these tests can only
  // run in a real browser.
  /\b(compact|regular|wide):/,
  /container[- ]?queries/i,
]

function needsRuntime(content: string): boolean {
  return RUNTIME_PATTERNS.some(p => p.test(content))
}

function migrateDir(sourceDir: string, targetDir: string): void {
  const srcAbs = path.join(SUITES_ROOT, sourceDir)
  const dstAbs = path.join(TESTS_ROOT, targetDir)

  if (!fs.existsSync(srcAbs)) {
    console.error(`Source dir missing: ${srcAbs}`)
    process.exit(1)
  }
  fs.mkdirSync(dstAbs, { recursive: true })

  const entries = fs.readdirSync(srcAbs)
  let writtenTests = 0
  let writtenHelpers = 0
  let skippedRuntime = 0
  let skipped = 0

  for (const name of entries) {
    const srcFile = path.join(srcAbs, name)
    const dstFile = path.join(dstAbs, name)
    const stat = fs.statSync(srcFile)
    if (!stat.isFile()) continue

    if (!name.endsWith('.ts')) continue

    const content = fs.readFileSync(srcFile, 'utf-8')

    try {
      if (name.endsWith('.test.ts')) {
        if (needsRuntime(content)) {
          skippedRuntime++
          console.log(`  ⏭  ${name} (needs runtime — kept in browser stack)`)
          continue
        }
        const out = transformTestFile(content, name)
        fs.writeFileSync(dstFile, out)
        writtenTests++
        console.log(`  ✓ ${name}`)
      } else {
        const out = rewireHelperImports(content)
        fs.writeFileSync(dstFile, out)
        writtenHelpers++
        console.log(`  ⌘ ${name} (helper)`)
      }
    } catch (err) {
      skipped++
      console.warn(`  ⚠ ${name}: ${(err as Error).message}`)
    }
  }

  console.log(
    `\nMigrated ${writtenTests} test files + ${writtenHelpers} helpers, ` +
      `skipped ${skippedRuntime} (runtime), ${skipped} (errors)`
  )
  console.log(`Output: ${dstAbs}`)
}

function main(): void {
  const args = process.argv.slice(2)
  if (args.length < 1) {
    console.error('Usage: migrate-browser-tests-to-vitest.ts <sourceDir> [targetDir]')
    process.exit(1)
  }
  const sourceDir = args[0]
  const targetDir = args[1] ?? sourceDir
  migrateDir(sourceDir, targetDir)
}

main()
