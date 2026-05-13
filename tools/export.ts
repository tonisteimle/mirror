#!/usr/bin/env tsx
/**
 * Mirror Export CLI
 *
 *   npx tsx tools/export.ts <project-dir> [options]
 *
 * Builds a "spec bundle" — a self-contained folder that pairs Mirror
 * source files with a brief, instructions, target settings, and an
 * optional visual reference. The bundle is the contract handed to an
 * LLM agent (Claude Code) which converts it to real framework code.
 *
 * (The hand-built validation spike that proved out this bundle format
 * lived in tools/experiments/personas-react-spike/ — archived in git
 * history after the CLI generalized it.)
 */
import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  existsSync,
  copyFileSync,
  readdirSync,
  statSync,
} from 'node:fs'
import { resolve, join, basename, extname, relative, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawn, spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { DSL_VERSION } from '../compiler/schema/dsl-version'
import { validate } from '../compiler/validator'
import type { BackendTarget } from '../compiler/schema/dsl'

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(__dirname, '..')

type Target = 'react' | 'vue' | 'svelte' | 'vanilla'
type Styling = 'tailwind' | 'css-modules' | 'inline'

export interface Options {
  projectDir: string
  outDir: string
  target: Target
  styling: Styling
  typescript: boolean
  visualReference: string | null
  snapshot: boolean
  incremental: boolean
  run: boolean
  help: boolean
}

export interface ChangeReport {
  added: string[]
  modified: string[]
  removed: string[]
  unchanged: string[]
}

const MIRROR_EXTENSIONS = [
  '.mir',
  '.mirror',
  '.com',
  '.components',
  '.tok',
  '.tokens',
  '.data',
  '.yaml',
  '.yml',
]

function printHelp() {
  console.log(`
mirror-export — package a Mirror project as a spec bundle for AI code generation

Usage:
  npx tsx tools/export.ts <project-dir> [options]

Options:
  --target <t>          react | vue | svelte | vanilla   (default: react)
  --styling <s>         tailwind | css-modules | inline  (default: tailwind)
  --js                  emit JavaScript instead of TypeScript
  --out <dir>           output bundle directory          (default: ./mirror-export)
  --visual <path>       reference HTML for visual ground truth
  --snapshot            also capture computed-styles + screenshots from
                        a headless render of the Mirror project (~10 s,
                        adds ./render-snapshot/ to the bundle)
  --incremental         re-export into existing bundle: detects which
                        Mirror source files changed, writes CHANGES.md,
                        and uses an incremental-instructions template
                        that asks the agent to update only affected
                        generated files
  --run                 invoke \`claude\` on the bundle after writing
  -h, --help            this message

Examples:
  npx tsx tools/export.ts examples/personas-informatik
  npx tsx tools/export.ts examples/personas-informatik \\
    --target react --styling tailwind \\
    --visual examples/personas-informatik/preview.html \\
    --out ./out --run
`)
}

function parseArgs(argv: string[]): Options {
  const opts: Options = {
    projectDir: '',
    outDir: './mirror-export',
    target: 'react',
    styling: 'tailwind',
    typescript: true,
    visualReference: null,
    snapshot: false,
    incremental: false,
    run: false,
    help: false,
  }

  const positionals: string[] = []
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    switch (a) {
      case '-h':
      case '--help':
        opts.help = true
        break
      case '--target':
        opts.target = argv[++i] as Target
        break
      case '--styling':
        opts.styling = argv[++i] as Styling
        break
      case '--js':
        opts.typescript = false
        break
      case '--ts':
        opts.typescript = true
        break
      case '--out':
        opts.outDir = argv[++i]
        break
      case '--visual':
        opts.visualReference = argv[++i]
        break
      case '--snapshot':
        opts.snapshot = true
        break
      case '--incremental':
        opts.incremental = true
        break
      case '--run':
        opts.run = true
        break
      default:
        if (a.startsWith('--')) {
          throw new Error(`unknown flag: ${a}`)
        }
        positionals.push(a)
    }
  }

  if (positionals[0]) opts.projectDir = positionals[0]
  return opts
}

function discoverMirrorFiles(dir: string): string[] {
  const out: string[] = []
  function walk(d: string) {
    for (const entry of readdirSync(d)) {
      if (entry.startsWith('.') || entry === 'node_modules') continue
      const full = join(d, entry)
      if (statSync(full).isDirectory()) walk(full)
      else if (MIRROR_EXTENSIONS.includes(extname(entry))) out.push(full)
    }
  }
  walk(dir)
  return out.sort((a, b) => {
    const order = (p: string) => {
      const ext = extname(p)
      if (ext === '.tok' || ext === '.tokens') return 0
      if (ext === '.data' || ext === '.yaml' || ext === '.yml') return 1
      if (ext === '.com' || ext === '.components') return 2
      return 3
    }
    return order(a) - order(b) || a.localeCompare(b)
  })
}

function ensureDir(d: string) {
  mkdirSync(d, { recursive: true })
}

function writeJSON(path: string, data: unknown) {
  writeFileSync(path, JSON.stringify(data, null, 2) + '\n', 'utf8')
}

function copyTemplate(name: string, dest: string) {
  const tplPath = join(__dirname, 'export', 'templates', name)
  if (!existsSync(tplPath)) {
    throw new Error(`template missing: ${tplPath}`)
  }
  copyFileSync(tplPath, dest)
}

export function hashFile(path: string): string {
  return createHash('sha256').update(readFileSync(path)).digest('hex')
}

export function loadPreviousHashes(bundleDir: string): Record<string, string> {
  const hashFile = join(bundleDir, 'source-hashes.json')
  if (!existsSync(hashFile)) return {}
  try {
    return JSON.parse(readFileSync(hashFile, 'utf8')) as Record<string, string>
  } catch {
    return {}
  }
}

export function diffSources(
  newHashes: Record<string, string>,
  oldHashes: Record<string, string>
): ChangeReport {
  const report: ChangeReport = { added: [], modified: [], removed: [], unchanged: [] }
  for (const [path, hash] of Object.entries(newHashes)) {
    if (!(path in oldHashes)) report.added.push(path)
    else if (oldHashes[path] !== hash) report.modified.push(path)
    else report.unchanged.push(path)
  }
  for (const path of Object.keys(oldHashes)) {
    if (!(path in newHashes)) report.removed.push(path)
  }
  return report
}

function writeChangesMd(bundleDir: string, report: ChangeReport): void {
  const sectionFor = (label: string, list: string[]) =>
    list.length === 0
      ? ''
      : `### ${label} (${list.length})\n\n${list.map(p => `- \`${p}\``).join('\n')}\n\n`
  const total = report.added.length + report.modified.length + report.removed.length
  const lines = [
    `# Source Changes Since Last Export`,
    ``,
    total === 0
      ? `**No changes detected.** Generated output should be up to date.`
      : `**${total} file(s) changed** — agent should update affected portions of \`./generated/\` only.`,
    ``,
    sectionFor('Added', report.added),
    sectionFor('Modified', report.modified),
    sectionFor('Removed', report.removed),
    `## How to handle\n`,
    `- **Added** files: generate corresponding components/pages in \`./generated/\`.`,
    `- **Modified** files: re-derive only the components/pages that consume them. Preserve user edits in unrelated files.`,
    `- **Removed** files: delete the components/pages they produced.`,
    `- **Unchanged** files: don't touch the generated output for these.`,
    ``,
  ].join('\n')
  writeFileSync(join(bundleDir, 'CHANGES.md'), lines, 'utf8')
}

export function buildTargetConfig(opts: Options): Record<string, unknown> {
  // Vanilla = plain HTML+CSS. None of the JS-framework knobs apply.
  if (opts.target === 'vanilla') {
    return {
      framework: 'vanilla',
      outputDir: './generated',
      constraints: {
        noMirrorRuntime: true,
        noFramework: true,
        noBuildTool: true,
        preserveSemantics: true,
      },
    }
  }
  return {
    framework: opts.target,
    language: opts.typescript ? 'typescript' : 'javascript',
    styling: opts.styling,
    buildTool: 'vite',
    outputDir: './generated',
    constraints: {
      noMirrorRuntime: true,
      preserveSemantics: true,
      strictTypes: opts.typescript,
    },
  }
}

/**
 * Walk each source file, validate against the configured target, and
 * print a summary of backend-unsupported (W130) warnings. Non-blocking:
 * surfaces silent-drop issues before the agent run consumes the bundle.
 *
 * The `dom` target is treated as a no-op — Mirror's DOM runtime is the
 * full-feature surface; W130 only fires for export targets that bypass
 * runtime features (react / framework / vue / svelte / vanilla).
 */
function reportBackendWarnings(
  files: string[],
  relPath: (f: string) => string,
  target: BackendTarget
): void {
  const warnings: { file: string; line: number; column: number; message: string }[] = []
  for (const f of files) {
    let source: string
    try {
      source = readFileSync(f, 'utf-8')
    } catch {
      continue
    }
    const result = validate(source, { target })
    for (const w of result.warnings) {
      if (w.code !== 'W130') continue
      warnings.push({ file: relPath(f), line: w.line, column: w.column, message: w.message })
    }
  }
  if (warnings.length === 0) return
  console.warn('')
  console.warn(
    `⚠ Backend-support: ${warnings.length} property usage(s) won't survive the ${target} target:`
  )
  for (const w of warnings) {
    console.warn(`  ${w.file}:${w.line}:${w.column} ${w.message}`)
  }
  console.warn('')
}

export function buildBundle(opts: Options) {
  const projectAbs = resolve(opts.projectDir)
  if (!existsSync(projectAbs)) {
    throw new Error(`input not found: ${projectAbs}`)
  }
  const isFile = statSync(projectAbs).isFile()
  if (isFile && !MIRROR_EXTENSIONS.includes(extname(projectAbs))) {
    throw new Error(`not a Mirror file: ${projectAbs}`)
  }

  const outAbs = resolve(opts.outDir)
  const sourceOut = join(outAbs, 'source')
  ensureDir(sourceOut)

  // Single file: copy as-is. Project dir: discover and preserve tree.
  const files = isFile ? [projectAbs] : discoverMirrorFiles(projectAbs)
  if (files.length === 0) {
    throw new Error(`no Mirror source files found under ${projectAbs}`)
  }
  const baseDir = isFile ? dirname(projectAbs) : projectAbs
  const relPath = (f: string) => (isFile ? basename(f) : relative(baseDir, f))

  for (const f of files) {
    const dest = join(sourceOut, relPath(f))
    ensureDir(dirname(dest))
    copyFileSync(f, dest)
  }

  // Backend-support audit (W130): surface properties whose schema
  // declares a `backends: [...]` set that excludes the chosen target
  // (e.g. `mask` in a Svelte export). The agent silently drops those,
  // so we tell the export-runner up front. Doesn't block the export —
  // warnings are informational, the user decides whether to remove the
  // property, swap targets, or accept the drop.
  reportBackendWarnings(files, relPath, opts.target as BackendTarget)

  // Source hashes — always written, used by --incremental on next run
  const newHashes: Record<string, string> = {}
  for (const f of files) {
    newHashes[relPath(f)] = hashFile(f)
  }

  // Incremental mode: compute diff, write CHANGES.md, use incremental template
  let changeReport: ChangeReport | null = null
  if (opts.incremental) {
    const oldHashes = loadPreviousHashes(outAbs)
    if (Object.keys(oldHashes).length === 0) {
      console.log(`note: no previous source-hashes.json — treating as fresh export`)
    } else {
      changeReport = diffSources(newHashes, oldHashes)
      writeChangesMd(outAbs, changeReport)
      const total =
        changeReport.added.length + changeReport.modified.length + changeReport.removed.length
      console.log(
        `📝 Changes: +${changeReport.added.length} ~${changeReport.modified.length} -${changeReport.removed.length} (${total} total, ${changeReport.unchanged.length} unchanged)`
      )
    }
  }

  // Brief
  copyTemplate('mirror-brief.md', join(outAbs, 'MIRROR-BRIEF.md'))

  // Per-target instructions. Incremental mode currently uses one
  // shared template (no per-target variants exist yet). If a future
  // per-target incremental template is added it will take precedence.
  const useIncremental = opts.incremental && changeReport !== null
  const instrDest = join(outAbs, 'INSTRUCTIONS.md')
  const candidates: string[] = useIncremental
    ? [
        `instructions-incremental-${opts.target}.md`,
        'instructions-incremental.md',
        `instructions-${opts.target}.md`,
      ]
    : [`instructions-${opts.target}.md`, 'instructions-react.md']
  const chosen = candidates.find(name => existsSync(join(__dirname, 'export', 'templates', name)))
  if (!chosen) {
    throw new Error(`no instructions template found for target=${opts.target}`)
  }
  if (chosen !== candidates[0]) {
    console.warn(`note: instructions template ${candidates[0]} missing, using ${chosen}`)
  }
  copyTemplate(chosen, instrDest)

  // Persist new hashes for the NEXT incremental run
  writeJSON(join(outAbs, 'source-hashes.json'), newHashes)

  // target.json — target-aware, no leaky framework defaults for vanilla
  writeJSON(join(outAbs, 'target.json'), buildTargetConfig(opts))

  // Visual reference (optional)
  if (opts.visualReference) {
    const refAbs = resolve(opts.visualReference)
    if (!existsSync(refAbs)) {
      console.warn(`warn: visual reference not found, skipping: ${refAbs}`)
    } else {
      copyFileSync(refAbs, join(outAbs, 'visual-reference.html'))
    }
  }

  // Render snapshot (optional) — computed styles + screenshots from headless render
  let snapshotIncluded = false
  if (opts.snapshot) {
    const snapshotDir = join(outAbs, 'render-snapshot')
    mkdirSync(snapshotDir, { recursive: true })
    console.log(`📸 Capturing render snapshot (this takes ~10 s)...`)
    const snapshotCli = join(__dirname, 'snapshot.ts')
    // Hard timeout: snapshot uses headless Chrome via CDP, which has
    // been observed to hang indefinitely on certain pages (Chrome
    // attach/detach race). 120 s is generous for a normal capture
    // (~10 s expected) and bounds the worst case.
    const result = spawnSync('npx', ['tsx', snapshotCli, projectAbs, '--out', snapshotDir], {
      stdio: 'inherit',
      cwd: process.cwd(),
      timeout: 120_000,
      killSignal: 'SIGKILL',
    })
    if (result.signal === 'SIGKILL') {
      console.warn(`warn: snapshot capture timed out after 120s, continuing without`)
    } else if (result.status !== 0) {
      console.warn(`warn: snapshot capture failed (exit ${result.status}), continuing without`)
    } else {
      snapshotIncluded = true
    }
  }

  // Manifest with project summary. dslVersion is the contract handle —
  // the agent (or any bundle consumer) can refuse to operate against
  // a major it doesn't understand. Bumping rules in
  // compiler/schema/dsl-version.ts.
  const manifest = {
    project: basename(projectAbs),
    sourceFiles: files.map(relPath),
    fileCount: files.length,
    target: opts.target,
    styling: opts.styling,
    language: opts.typescript ? 'typescript' : 'javascript',
    hasVisualReference: !!opts.visualReference && existsSync(resolve(opts.visualReference)),
    hasRenderSnapshot: snapshotIncluded,
    generatedAt: new Date().toISOString(),
    dslVersion: DSL_VERSION,
  }
  writeJSON(join(outAbs, 'manifest.json'), manifest)

  // README inside the bundle — embeds the absolute path to mirror-repo's
  // verify CLI so the agent (and the user) can call it without guessing.
  const verifyCliPath = join(REPO_ROOT, 'tools', 'verify.ts')
  const readme = [
    `# Mirror Export Bundle — ${manifest.project} → ${opts.target}`,
    ``,
    `Self-contained spec bundle for AI code generation.`,
    ``,
    `## Run`,
    ``,
    `\`\`\`bash`,
    `cd ${relative(process.cwd(), outAbs) || '.'}`,
    `claude --print "$(cat <<'EOF'`,
    `Read INSTRUCTIONS.md, MIRROR-BRIEF.md, target.json, source/*, and`,
    `visual-reference.html (if present). Execute the pipeline in`,
    `INSTRUCTIONS.md, gating on each step. Use Write/Edit/Bash tools to`,
    `create files in ./generated/. Stop when all gates are green or you`,
    `hit a real blocker.`,
    `EOF`,
    `)"`,
    `\`\`\``,
    ``,
    `Or pass \`--run\` to \`mirror-export\` to invoke claude automatically.`,
    ``,
    snapshotIncluded
      ? `## Verify (after the agent finishes building)\n\n` +
        `Pixel-diffs the generated output against Mirror's render-snapshot baseline.\n\n` +
        `\`\`\`bash\n` +
        `npx tsx ${verifyCliPath} .\n` +
        `\`\`\`\n\n` +
        `Writes \`verify-report.md\` + \`verify-diff-<viewport>.png\`. Exit code 0 if every viewport ≥ 95% match, else 1. The agent should iterate until the report is green.\n`
      : `## Verify\n\nNot available — bundle was created without \`--snapshot\`. Re-export with \`--snapshot\` to enable visual diffing.\n`,
    ``,
    `## Files`,
    ``,
    `- \`INSTRUCTIONS.md\` — multi-step pipeline with gates`,
    `- \`MIRROR-BRIEF.md\` — Mirror DSL reference for the LLM`,
    `- \`target.json\` — framework, styling, language settings`,
    `- \`manifest.json\` — project summary`,
    `- \`source/\` — Mirror source files (verbatim copy)`,
    `- \`visual-reference.html\` — ground-truth visual (if provided)`,
    snapshotIncluded
      ? `- \`render-snapshot/\` — computed-styles + screenshots from Mirror's render`
      : null,
    `- \`generated/\` — output goes here (created by the agent)`,
    ``,
  ]
    .filter(l => l !== null)
    .join('\n')
  writeFileSync(join(outAbs, 'README.md'), readme, 'utf8')

  return { outAbs, fileCount: files.length }
}

function runClaude(bundleDir: string): Promise<number> {
  return new Promise((resolvePromise, reject) => {
    const prompt = [
      'You are an expert software engineer.',
      '',
      'Read INSTRUCTIONS.md, MIRROR-BRIEF.md, target.json, source/*, and',
      'visual-reference.html (if present) in this directory. Then execute',
      'the pipeline from INSTRUCTIONS.md. Use Write/Edit to create files.',
      'Use Bash for npm install, build, type-check. Stop only when all',
      'gates from INSTRUCTIONS.md are green or you hit a blocker that',
      'genuinely needs human input.',
      '',
      'Working directory is the bundle root. Output goes to ./generated/.',
    ].join('\n')

    const child = spawn('claude', ['--print', prompt], {
      cwd: bundleDir,
      stdio: 'inherit',
    })
    child.on('error', err => {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        reject(
          new Error(
            '`claude` command not found. Install Claude Code CLI: https://docs.claude.com/claude-code'
          )
        )
      } else reject(err)
    })
    child.on('exit', code => resolvePromise(code ?? 0))
  })
}

async function main() {
  let opts: Options
  try {
    opts = parseArgs(process.argv.slice(2))
  } catch (e) {
    console.error((e as Error).message)
    printHelp()
    process.exit(2)
  }

  if (opts.help || !opts.projectDir) {
    printHelp()
    process.exit(opts.help ? 0 : 2)
  }

  console.log(
    `📦 Building bundle: ${opts.projectDir} → ${opts.target} (${opts.styling}, ${opts.typescript ? 'ts' : 'js'})`
  )
  const { outAbs, fileCount } = buildBundle(opts)
  console.log(`✓ Bundle written to ${outAbs} (${fileCount} source files)`)

  if (opts.run) {
    console.log(`🤖 Invoking claude in ${outAbs} ...`)
    const code = await runClaude(outAbs)
    process.exit(code)
  } else {
    console.log(`\nNext step:`)
    console.log(`  cd ${relative(process.cwd(), outAbs) || '.'}`)
    console.log(`  cat README.md`)
    console.log(`  # then run claude as instructed, or rerun with --run`)
  }
}

// Only run as CLI when invoked directly, not when imported by tests.
const isCliEntry = process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])
if (isCliEntry) {
  main().catch(err => {
    console.error(err)
    process.exit(1)
  })
}
