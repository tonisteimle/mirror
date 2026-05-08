/**
 * Mirror Build CLI
 *
 * One command, one HTML file. The simplest path from `.mir` to deployable.
 *
 * Usage:
 *   mirror-build app.mir                  # → dist/app.html
 *   mirror-build my-project/              # → dist/index.html
 *   mirror-build app.mir --out custom.html
 *   mirror-build app.mir --out-dir build
 *   mirror-build app.mir --watch
 */

import * as fs from 'fs'
import * as path from 'path'
import { build, type BuildOptions } from './cli/build'
import { c } from './cli/output'
import { getAllMirrorExtensions } from './cli/types'

interface CliArgs extends BuildOptions {
  watch: boolean
  quiet: boolean
  help: boolean
  version: boolean
}

const HELP = `${c('Mirror Build', 'cyan')} — compile Mirror DSL to a deployable HTML file

${c('Usage:', 'cyan')}
  mirror-build <input> [options]

${c('Inputs:', 'cyan')}
  <file.mir>           Compile a single Mirror file
  <project-dir>        Compile a Mirror project (auto-discovers data/tokens/components/layouts)

${c('Options:', 'cyan')}
  -o, --out <path>     Output path (file or directory). Default: dist/<name>.html
  -d, --out-dir <dir>  Output directory when --out is unset. Default: dist
      --title <text>   HTML <title>. Default: derived from input filename
      --lang <code>    HTML lang attribute. Default: en
      --no-defaults-css  Omit Mirror's default CSS
      --external-css   Emit CSS as a sibling .css file (linked, not inline)
      --external-js    Emit JS as a sibling .js file (linked, not inline)
      --minify         Minify JS output via esbuild
  -w, --watch          Rebuild on file change
  -v, --verbose        Verbose output
  -q, --quiet          Suppress success messages
  -h, --help           Show this help
  -V, --version        Show version

${c('Examples:', 'cyan')}
  mirror-build app.mir
  mirror-build my-project/
  mirror-build screens/home.mir --title "Home" --out dist/home.html
  mirror-build app.mir --watch
`

function parseArgs(argv: string[]): CliArgs {
  const out: CliArgs = {
    input: [],
    watch: false,
    quiet: false,
    help: false,
    version: false,
  }

  let i = 0
  while (i < argv.length) {
    const arg = argv[i]
    switch (arg) {
      case '-h':
      case '--help':
        out.help = true
        break
      case '-V':
      case '--version':
        out.version = true
        break
      case '-o':
      case '--out':
        out.out = argv[++i]
        break
      case '-d':
      case '--out-dir':
        out.outDir = argv[++i]
        break
      case '--title':
        out.title = argv[++i]
        break
      case '--lang':
        out.lang = argv[++i]
        break
      case '--no-defaults-css':
        out.noDefaultsCss = true
        break
      case '--external-css':
        out.externalCss = true
        break
      case '--external-js':
        out.externalJs = true
        break
      case '--minify':
        out.minify = true
        break
      case '-w':
      case '--watch':
        out.watch = true
        break
      case '-v':
      case '--verbose':
        out.verbose = true
        break
      case '-q':
      case '--quiet':
        out.quiet = true
        break
      default:
        if (arg.startsWith('-')) {
          console.error(c(`Unknown option: ${arg}`, 'red'))
          console.error(c('Run `mirror-build --help` for usage', 'dim'))
          process.exit(1)
        }
        out.input.push(arg)
    }
    i++
  }

  return out
}

function readVersion(): string {
  try {
    const pkgPath = path.resolve(
      path.dirname(new URL(import.meta.url).pathname),
      '..',
      'package.json'
    )
    if (fs.existsSync(pkgPath)) {
      return JSON.parse(fs.readFileSync(pkgPath, 'utf-8')).version ?? 'unknown'
    }
  } catch {
    // ignore
  }
  return 'unknown'
}

function watchAndRebuild(args: CliArgs, runBuild: () => void): void {
  console.error(c('\nWatching for changes... (Ctrl+C to stop)', 'cyan'))

  const allExtensions = getAllMirrorExtensions()
  const watchPaths = args.input.map(p => path.resolve(p))

  let timeoutId: NodeJS.Timeout | null = null
  const trigger = () => {
    if (timeoutId) clearTimeout(timeoutId)
    timeoutId = setTimeout(() => {
      console.error(c(`\n[${new Date().toLocaleTimeString()}] Rebuilding...`, 'yellow'))
      runBuild()
      timeoutId = null
    }, 150)
  }

  for (const watchPath of watchPaths) {
    if (!fs.existsSync(watchPath)) continue
    const stat = fs.statSync(watchPath)
    if (stat.isDirectory()) {
      fs.watch(watchPath, { recursive: true }, (_event, filename) => {
        if (filename && allExtensions.some(ext => filename.endsWith(ext))) {
          trigger()
        }
      })
    } else {
      fs.watch(watchPath, eventType => {
        if (eventType === 'change') trigger()
      })
    }
  }
}

function main(): void {
  const args = parseArgs(process.argv.slice(2))

  if (args.help) {
    console.log(HELP)
    process.exit(0)
  }

  if (args.version) {
    console.log(readVersion())
    process.exit(0)
  }

  if (args.input.length === 0) {
    console.error(c('Error: no input specified', 'red'))
    console.error(c('Run `mirror-build --help` for usage', 'dim'))
    process.exit(1)
  }

  const runBuild = (): void => {
    const result = build(args)

    for (const warning of result.warnings) {
      console.error(c(`⚠ ${warning}`, 'yellow'))
    }

    if (!result.success) {
      console.error(c(`✗ Build failed: ${result.error}`, 'red'))
      if (!args.watch) process.exit(1)
      return
    }

    if (!args.quiet) {
      const kb = (result.stats.outputBytes / 1024).toFixed(1)
      console.error(
        c('✓ Built', 'green') +
          c(` → ${path.relative(process.cwd(), result.outputPath!)}`, 'dim') +
          c(` (${kb} KB, ${result.stats.compileTime}ms)`, 'dim')
      )
      for (const sibling of result.siblingPaths ?? []) {
        console.error(c(`  + ${path.relative(process.cwd(), sibling)}`, 'dim'))
      }
    }
  }

  runBuild()

  if (args.watch) {
    watchAndRebuild(args, runBuild)
  }
}

main()
