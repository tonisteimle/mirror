/**
 * Analyze experiment outputs:
 *   - Compile-rate per file
 *   - LOC (raw + non-blank)
 *   - Token count (lines matching `name.suffix:` or `name:` at top-level before canvas)
 *   - Component definitions (lines with `Name:` or `Name as X:`)
 *   - $token references (count of `\$\w+` occurrences)
 *   - Property repetition density (rough)
 */

import { execSync } from 'node:child_process'
import * as fs from 'node:fs'
import * as path from 'node:path'

interface Metrics {
  file: string
  loc: number
  locNonBlank: number
  tokenDefs: number
  componentDefs: number
  tokenRefs: number
  propertyRepetitionScore: number
  compileOk: boolean
  compileError?: string
}

const ROOT = path.resolve(
  '/Users/toni.steimle@fhnw.ch/Library/Mobile Documents/com~apple~CloudDocs/Documents/Dev/Mirror'
)
const OUTPUTS = path.join(ROOT, 'tools/experiments/html-detour/outputs')

const files: { brief: string; sample: string; path: string; mirPath: string }[] = []
for (const brief of ['brief-1', 'brief-2', 'brief-3']) {
  for (const sample of [1, 2]) {
    files.push({
      brief,
      sample: `path-a-sample-${sample}`,
      path: `${brief}/path-a-sample-${sample}.mir`,
      mirPath: path.join(OUTPUTS, brief, `path-a-sample-${sample}.mir`),
    })
    files.push({
      brief,
      sample: `path-b-sample-${sample}`,
      path: `${brief}/path-b-mirror-sample-${sample}.mir`,
      mirPath: path.join(OUTPUTS, brief, `path-b-mirror-sample-${sample}.mir`),
    })
  }
}

function analyzeFile(filePath: string): Omit<Metrics, 'file'> {
  const src = fs.readFileSync(filePath, 'utf8')
  const lines = src.split('\n')
  const loc = lines.length
  const locNonBlank = lines.filter(l => l.trim().length > 0 && !l.trim().startsWith('//')).length

  const beforeCanvasIdx = lines.findIndex(l => /^\s*canvas\b/.test(l))
  const headerLines = beforeCanvasIdx >= 0 ? lines.slice(0, beforeCanvasIdx) : lines

  // Tokens: top-level lines matching `identifier(.suffix)?:` followed by a value
  // Excludes `Name:` (CamelCase = component) and indented lines.
  const tokenDefs = headerLines.filter(l => {
    const m = l.match(/^([a-z][a-zA-Z0-9_-]*(\.[a-z][a-zA-Z0-9_-]*)?):\s*(.+)/)
    return m !== null && !l.startsWith(' ') && !l.startsWith('\t')
  }).length

  // Components: top-level lines with `Name:` or `Name as Other:`
  const componentDefs = lines.filter(l => {
    const m = l.match(/^([A-Z][a-zA-Z0-9_]*)(\s+as\s+[A-Z][a-zA-Z0-9_]*)?:\s*/)
    return m !== null && !l.startsWith(' ') && !l.startsWith('\t')
  }).length

  // $token references
  const tokenRefMatches = src.match(/\$[a-zA-Z][a-zA-Z0-9._-]*/g) || []
  const tokenRefs = tokenRefMatches.length

  // Property-repetition score: count occurrences of common style props (bg, col, pad, rad, etc.)
  // Higher = more repetition (less idiomatic).
  // Normalize per non-blank-LOC.
  const propWords = ['bg ', 'col ', 'pad ', 'rad ', 'fs ', 'weight ', 'shadow ']
  let propCount = 0
  for (const w of propWords) {
    const re = new RegExp(`\\b${w.trim()}\\s+`, 'g')
    propCount += (src.match(re) || []).length
  }
  const propertyRepetitionScore = locNonBlank > 0 ? +(propCount / locNonBlank).toFixed(2) : 0

  // Try to compile
  let compileOk = false
  let compileError: string | undefined
  try {
    const tmp = `/tmp/analyze-${path.basename(filePath, '.mir')}.js`
    execSync(`npx tsx compiler/cli.ts "${filePath}" -o "${tmp}"`, {
      cwd: ROOT,
      stdio: 'pipe',
    })
    compileOk = true
  } catch (e: any) {
    compileError = (e.stderr?.toString() || e.message || '').slice(0, 200)
  }

  return {
    loc,
    locNonBlank,
    tokenDefs,
    componentDefs,
    tokenRefs,
    propertyRepetitionScore,
    compileOk,
    compileError,
  }
}

const results: Metrics[] = []
for (const f of files) {
  if (!fs.existsSync(f.mirPath)) {
    console.error(`MISSING: ${f.mirPath}`)
    continue
  }
  const m = analyzeFile(f.mirPath)
  results.push({ file: f.path, ...m })
}

// Print table
console.log(
  ['file', 'loc', 'nonBlank', 'tokenDefs', 'compDefs', 'tokenRefs', 'propRep', 'compile'].join('\t')
)
for (const r of results) {
  console.log(
    [
      r.file,
      r.loc,
      r.locNonBlank,
      r.tokenDefs,
      r.componentDefs,
      r.tokenRefs,
      r.propertyRepetitionScore,
      r.compileOk ? 'OK' : `FAIL: ${r.compileError?.slice(0, 60)}`,
    ].join('\t')
  )
}

// Summary by path
const groups = {
  'path-a': results.filter(r => r.file.includes('path-a')),
  'path-b': results.filter(r => r.file.includes('path-b')),
}
console.log('\n=== Aggregates by path ===')
for (const [name, group] of Object.entries(groups)) {
  const avg = (key: keyof Metrics) =>
    +(group.reduce((s, r) => s + (r[key] as number), 0) / group.length).toFixed(2)
  const compileRate = group.filter(r => r.compileOk).length / group.length
  console.log(
    `${name}:  loc=${avg('locNonBlank')}  tokens=${avg('tokenDefs')}  comps=${avg('componentDefs')}  tokenRefs=${avg('tokenRefs')}  propRep=${avg('propertyRepetitionScore')}  compile=${(compileRate * 100).toFixed(0)}%`
  )
}

// Write JSON
fs.writeFileSync(
  path.join(ROOT, 'tools/experiments/html-detour/analysis/metrics.json'),
  JSON.stringify(results, null, 2)
)
console.log('\nWritten: analysis/metrics.json')
