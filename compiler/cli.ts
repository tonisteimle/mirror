/**
 * Mirror Compiler CLI
 *
 * Compiles .mirror files to JavaScript (DOM or React).
 *
 * Usage:
 *   npx tsx compiler/cli.ts app.mirror                    # Compile single file
 *   npx tsx compiler/cli.ts app.mirror -o dist/app.js    # Output to file
 *   npx tsx compiler/cli.ts --project src/               # Compile project
 *   npx tsx compiler/cli.ts app.mirror --react           # Generate React
 *   npx tsx compiler/cli.ts app.mirror --watch           # Watch mode
 */

import * as fs from 'fs'
import * as path from 'path'
import { parse } from './parser'
import { toIR } from './ir'
import { generateDOM } from './backends/dom'
import { generateReact } from './backends/react'
import { combineProjectFilesWithData } from './preprocessor'
import { parseDataFiles, parseDataFile } from './parser/data-parser'
import type { DataFile } from './parser/data-types'

// ============================================
// File Extensions (matching studio/storage/types.ts)
// ============================================

const FILE_EXTENSIONS = {
  layout: ['.mir', '.mirror'],
  tokens: ['.tok', '.tokens'],
  component: ['.com', '.components'],
  data: ['.yaml', '.yml', '.data'], // .data for backwards compatibility
} as const

type MirrorFileType = 'layout' | 'tokens' | 'component' | 'data' | 'unknown'

function getFileType(filename: string): MirrorFileType {
  for (const [type, extensions] of Object.entries(FILE_EXTENSIONS)) {
    if (extensions.some(ext => filename.endsWith(ext))) {
      return type as MirrorFileType
    }
  }
  return 'unknown'
}

function isMirrorCodeFile(filename: string): boolean {
  const codeExtensions = [
    ...FILE_EXTENSIONS.layout,
    ...FILE_EXTENSIONS.tokens,
    ...FILE_EXTENSIONS.component,
  ]
  return codeExtensions.some(ext => filename.endsWith(ext))
}

function isDataFile(filename: string): boolean {
  return FILE_EXTENSIONS.data.some(ext => filename.endsWith(ext))
}

function getAllMirrorExtensions(): string[] {
  return Object.values(FILE_EXTENSIONS).flat()
}

// ============================================
// ANSI Colors
// ============================================

const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
}

function c(text: string, color: keyof typeof colors): string {
  return `${colors[color]}${text}${colors.reset}`
}

// ============================================
// CLI Options
// ============================================

interface CLIOptions {
  input: string[]
  output?: string
  backend: 'dom' | 'react'
  project?: string
  watch: boolean
  verbose: boolean
  minify: boolean
  sourceMap: boolean
  help: boolean
  version: boolean
}

function parseArgs(args: string[]): CLIOptions {
  const options: CLIOptions = {
    input: [],
    backend: 'dom',
    watch: false,
    verbose: false,
    minify: false,
    sourceMap: false,
    help: false,
    version: false,
  }

  let i = 0
  while (i < args.length) {
    const arg = args[i]

    if (arg === '--help' || arg === '-h') {
      options.help = true
    } else if (arg === '--version' || arg === '-V') {
      options.version = true
    } else if (arg === '--output' || arg === '-o') {
      options.output = args[++i]
    } else if (arg === '--react' || arg === '-r') {
      options.backend = 'react'
    } else if (arg === '--dom' || arg === '-d') {
      options.backend = 'dom'
    } else if (arg === '--project' || arg === '-p') {
      options.project = args[++i]
    } else if (arg === '--watch' || arg === '-w') {
      options.watch = true
    } else if (arg === '--verbose' || arg === '-v') {
      options.verbose = true
    } else if (arg === '--minify' || arg === '-m') {
      options.minify = true
    } else if (arg === '--source-map' || arg === '-s') {
      options.sourceMap = true
    } else if (!arg.startsWith('-')) {
      options.input.push(arg)
    } else {
      console.error(c(`Unknown option: ${arg}`, 'red'))
      process.exit(1)
    }
    i++
  }

  return options
}

// ============================================
// Help & Version
// ============================================

function printHelp(): void {
  console.log(`
${c('Mirror Compiler', 'bold')} ${c('v2.0.0', 'dim')}

${c('USAGE:', 'yellow')}
  mirror-compile <files...> [options]
  mirror-compile --project <dir> [options]

${c('ARGUMENTS:', 'yellow')}
  <files...>             Input file(s) to compile

${c('FILE TYPES:', 'yellow')}
  Layout/App:   .mir, .mirror     UI layouts and app structure
  Tokens:       .tok, .tokens     Design tokens (colors, spacing)
  Components:   .com, .components Reusable component definitions
  Data:         .yaml, .yml       Structured data sources

${c('OPTIONS:', 'yellow')}
  -o, --output <file>    Output file (default: stdout)
  -p, --project <dir>    Compile project directory
  -r, --react            Generate React components
  -d, --dom              Generate DOM JavaScript (default)
  -w, --watch            Watch for changes and recompile
  -v, --verbose          Verbose output
  -m, --minify           Minify output (coming soon)
  -s, --source-map       Generate source map (coming soon)
  -h, --help             Show this help
  -V, --version          Show version

${c('EXAMPLES:', 'yellow')}
  ${c('# Compile single file to stdout', 'dim')}
  mirror-compile app.mir

  ${c('# Compile to output file', 'dim')}
  mirror-compile app.mir -o dist/app.js

  ${c('# Compile multiple files (order matters!)', 'dim')}
  mirror-compile tokens.tok components.com app.mir -o dist/bundle.js

  ${c('# Compile project directory', 'dim')}
  mirror-compile --project examples/task-app -o dist/task-app.js

  ${c('# Generate React components', 'dim')}
  mirror-compile app.mir --react -o App.tsx

  ${c('# Watch mode', 'dim')}
  mirror-compile app.mir -o dist/app.js --watch

${c('PROJECT STRUCTURE:', 'yellow')}
  When using --project, files are processed in dependency order:
    1. data/       → Data sources (.yaml, .yml)
    2. tokens/     → Design tokens (.tok, .tokens)
    3. components/ → Components (.com, .components)
    4. layouts/    → Layouts (.mir, .mirror)
    5. screens/    → Screen layouts (.mir, .mirror)
    6. Root files  → App entry points

${c('OUTPUT:', 'yellow')}
  DOM backend generates vanilla JavaScript that can be:
    - Included via <script> tag
    - Imported as ES module
    - Used with any bundler

  React backend generates TypeScript/JSX components.
`)
}

function printVersion(): void {
  console.log('mirror-compile v2.0.0')
}

// ============================================
// File Operations
// ============================================

function readFile(filePath: string): string {
  const absolutePath = path.resolve(filePath)
  return fs.readFileSync(absolutePath, 'utf-8')
}

function writeFile(filePath: string, content: string): void {
  const absolutePath = path.resolve(filePath)
  const dir = path.dirname(absolutePath)

  // Create directory if it doesn't exist
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }

  fs.writeFileSync(absolutePath, content, 'utf-8')
}

function listFiles(dir: string, extensions: string[]): string[] {
  const absoluteDir = path.resolve(dir)
  if (!fs.existsSync(absoluteDir)) {
    return []
  }

  const files = fs.readdirSync(absoluteDir)
  return files
    .filter(f => extensions.some(ext => f.endsWith(ext)))
    .map(f => path.join(absoluteDir, f))
}

function listMirrorCodeFiles(dir: string): string[] {
  return listFiles(dir, [
    ...FILE_EXTENSIONS.layout,
    ...FILE_EXTENSIONS.tokens,
    ...FILE_EXTENSIONS.component,
  ])
}

function listTokenFiles(dir: string): string[] {
  return listFiles(dir, [...FILE_EXTENSIONS.tokens])
}

function listComponentFiles(dir: string): string[] {
  return listFiles(dir, [...FILE_EXTENSIONS.component])
}

function listLayoutFiles(dir: string): string[] {
  return listFiles(dir, [...FILE_EXTENSIONS.layout])
}

function listDataFiles(dir: string): string[] {
  return listFiles(dir, [...FILE_EXTENSIONS.data])
}

// ============================================
// Compilation
// ============================================

interface CompileResult {
  success: boolean
  output?: string
  error?: string
  warnings: string[]
  stats: {
    inputFiles: number
    inputLines: number
    outputLines: number
    compileTime: number
  }
}

function compileFiles(files: string[], backend: 'dom' | 'react', verbose: boolean): CompileResult {
  const startTime = Date.now()
  const warnings: string[] = []

  try {
    // Read all input files
    let combinedCode = ''
    let totalLines = 0
    const dataFiles: DataFile[] = []

    for (const file of files) {
      if (verbose) {
        const fileType = getFileType(file)
        console.error(c(`  Reading ${file} (${fileType})...`, 'dim'))
      }

      const content = readFile(file)
      totalLines += content.split('\n').length

      if (isDataFile(file)) {
        // Parse data file - extract name without extension
        const basename = path.basename(file)
        const ext = FILE_EXTENSIONS.data.find(e => basename.endsWith(e)) || ''
        const name = basename.slice(0, -ext.length)
        const dataFile = parseDataFile(content, name)
        dataFiles.push(dataFile)
      } else if (isMirrorCodeFile(file)) {
        // Add mirror code with file separator comment
        if (combinedCode) {
          combinedCode += '\n\n'
        }
        combinedCode += `// === ${path.basename(file)} ===\n`
        combinedCode += content
      }
    }

    if (!combinedCode.trim()) {
      return {
        success: false,
        error: 'No Mirror code found in input files',
        warnings,
        stats: {
          inputFiles: files.length,
          inputLines: totalLines,
          outputLines: 0,
          compileTime: Date.now() - startTime,
        },
      }
    }

    // Parse
    if (verbose) {
      console.error(c('  Parsing...', 'dim'))
    }
    const ast = parse(combinedCode)

    // Check for parse errors
    if (ast.errors && ast.errors.length > 0) {
      for (const err of ast.errors) {
        warnings.push(`Parse warning at line ${err.line}: ${err.message}`)
      }
    }

    // Generate output
    if (verbose) {
      console.error(c(`  Generating ${backend.toUpperCase()}...`, 'dim'))
    }

    let output: string
    if (backend === 'react') {
      output = generateReact(ast)
    } else {
      output = generateDOM(ast, { dataFiles: dataFiles.length > 0 ? dataFiles : undefined })
    }

    const compileTime = Date.now() - startTime

    return {
      success: true,
      output,
      warnings,
      stats: {
        inputFiles: files.length,
        inputLines: totalLines,
        outputLines: output.split('\n').length,
        compileTime,
      },
    }
  } catch (err) {
    return {
      success: false,
      error: (err as Error).message,
      warnings,
      stats: {
        inputFiles: files.length,
        inputLines: 0,
        outputLines: 0,
        compileTime: Date.now() - startTime,
      },
    }
  }
}

function compileProject(
  projectDir: string,
  backend: 'dom' | 'react',
  verbose: boolean
): CompileResult {
  const startTime = Date.now()
  const absoluteProjectDir = path.resolve(projectDir)

  if (verbose) {
    console.error(c(`Compiling project: ${projectDir}`, 'cyan'))
  }

  // Collect files in dependency order:
  // 1. Data → 2. Tokens → 3. Components → 4. Layouts/Screens
  // All paths are stored as absolute paths for proper deduplication
  const files: string[] = []

  // Helper to add file if not already present (handles path normalization)
  const addFile = (filePath: string): boolean => {
    const absolutePath = path.resolve(filePath)
    if (!files.includes(absolutePath)) {
      files.push(absolutePath)
      return true
    }
    return false
  }

  // Helper to add multiple files
  const addFiles = (filePaths: string[]): void => {
    for (const filePath of filePaths) {
      addFile(filePath)
    }
  }

  // Helper to find root file with any valid extension
  const findRootFile = (baseName: string, extensions: readonly string[]): string | null => {
    for (const ext of extensions) {
      const filePath = path.join(absoluteProjectDir, baseName + ext)
      if (fs.existsSync(filePath) && !files.includes(filePath)) {
        return filePath
      }
    }
    return null
  }

  // 1. Data files from data/ directory
  const dataDir = path.join(absoluteProjectDir, 'data')
  addFiles(listDataFiles(dataDir))

  // Also check for data files in root (data.yaml, data.yml, data.data)
  const rootDataFile = findRootFile('data', FILE_EXTENSIONS.data)
  if (rootDataFile) addFile(rootDataFile)

  // 2. Tokens from tokens/ directory
  const tokensDir = path.join(absoluteProjectDir, 'tokens')
  addFiles(listTokenFiles(tokensDir))

  // Also check for tokens file in root (tokens.tok, tokens.tokens, tokens.mir, tokens.mirror)
  const rootTokensFile = findRootFile('tokens', [
    ...FILE_EXTENSIONS.tokens,
    ...FILE_EXTENSIONS.layout,
  ])
  if (rootTokensFile) addFile(rootTokensFile)

  // 3. Components from components/ directory
  const componentsDir = path.join(absoluteProjectDir, 'components')
  addFiles(listComponentFiles(componentsDir))

  // Also check for components file in root
  const rootComponentsFile = findRootFile('components', [
    ...FILE_EXTENSIONS.component,
    ...FILE_EXTENSIONS.layout,
  ])
  if (rootComponentsFile) addFile(rootComponentsFile)

  // 4. Layouts from layouts/ directory
  const layoutsDir = path.join(absoluteProjectDir, 'layouts')
  addFiles(listLayoutFiles(layoutsDir))

  // 5. Screens from screens/ directory
  const screensDir = path.join(absoluteProjectDir, 'screens')
  addFiles(listLayoutFiles(screensDir))

  // 6. Root layout files (app.mir, main.mir, index.mir, etc.)
  addFiles(listLayoutFiles(absoluteProjectDir))

  // 7. Any remaining code files in root not yet added
  addFiles(listMirrorCodeFiles(absoluteProjectDir))

  if (files.length === 0) {
    const allExts = getAllMirrorExtensions().join(', ')
    return {
      success: false,
      error: `No Mirror files found in ${projectDir}\nSupported extensions: ${allExts}`,
      warnings: [],
      stats: {
        inputFiles: 0,
        inputLines: 0,
        outputLines: 0,
        compileTime: Date.now() - startTime,
      },
    }
  }

  if (verbose) {
    console.error(c(`  Found ${files.length} files:`, 'dim'))
    for (const file of files) {
      console.error(c(`    - ${path.relative(projectDir, file)}`, 'dim'))
    }
  }

  return compileFiles(files, backend, verbose)
}

// ============================================
// Watch Mode
// ============================================

/**
 * Debounce utility - delays execution until no calls for `delay` ms
 */
function debounce<T extends (...args: unknown[]) => void>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout | null = null
  return (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }
    timeoutId = setTimeout(() => {
      fn(...args)
      timeoutId = null
    }, delay)
  }
}

function watchFiles(
  files: string[],
  projectDir: string | undefined,
  options: CLIOptions,
  compile: () => void
): void {
  console.error(c('\nWatching for changes... (Ctrl+C to stop)', 'cyan'))

  // Debounce compile to avoid multiple rapid rebuilds
  const debouncedCompile = debounce(() => {
    compile()
  }, 150)

  // Track changed files for better logging
  let pendingChanges: string[] = []

  const handleChange = (filename: string) => {
    if (!pendingChanges.includes(filename)) {
      pendingChanges.push(filename)
    }

    // Log and compile with debouncing
    debouncedCompile()

    // Clear pending changes after debounce settles
    setTimeout(() => {
      if (pendingChanges.length > 0) {
        const fileList =
          pendingChanges.length <= 3
            ? pendingChanges.join(', ')
            : `${pendingChanges.slice(0, 2).join(', ')} +${pendingChanges.length - 2} more`
        console.error(
          c(`\n[${new Date().toLocaleTimeString()}] Change detected: ${fileList}`, 'yellow')
        )
        pendingChanges = []
      }
    }, 50)
  }

  const watchPaths = projectDir ? [projectDir] : files

  for (const watchPath of watchPaths) {
    const absolutePath = path.resolve(watchPath)

    if (fs.statSync(absolutePath).isDirectory()) {
      // Watch directory recursively
      const allExtensions = getAllMirrorExtensions()
      fs.watch(absolutePath, { recursive: true }, (eventType, filename) => {
        if (filename && allExtensions.some(ext => filename.endsWith(ext))) {
          handleChange(filename)
        }
      })
    } else {
      // Watch single file
      fs.watch(absolutePath, eventType => {
        if (eventType === 'change') {
          handleChange(path.basename(absolutePath))
        }
      })
    }
  }
}

// ============================================
// Main
// ============================================

function main(): void {
  const args = process.argv.slice(2)
  const options = parseArgs(args)

  if (options.help) {
    printHelp()
    process.exit(0)
  }

  if (options.version) {
    printVersion()
    process.exit(0)
  }

  // Validate input
  if (!options.project && options.input.length === 0) {
    console.error(c('Error: No input files specified', 'red'))
    console.error(c('Run `mirror-compile --help` for usage', 'dim'))
    process.exit(1)
  }

  // Compile function
  const doCompile = (): void => {
    let result: CompileResult

    if (options.project) {
      result = compileProject(options.project, options.backend, options.verbose)
    } else {
      // Resolve input files (support glob patterns)
      const files: string[] = []
      for (const input of options.input) {
        if (input.includes('*')) {
          // Simple glob expansion
          const dir = path.dirname(input)
          const pattern = path.basename(input)
          const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$')
          const dirFiles = fs.readdirSync(dir)
          for (const file of dirFiles) {
            if (regex.test(file)) {
              files.push(path.join(dir, file))
            }
          }
        } else {
          files.push(input)
        }
      }

      if (options.verbose) {
        console.error(c(`Compiling ${files.length} file(s)...`, 'cyan'))
      }

      result = compileFiles(files, options.backend, options.verbose)
    }

    // Handle result
    if (!result.success) {
      console.error(c(`\n✗ Compilation failed: ${result.error}`, 'red'))
      if (!options.watch) {
        process.exit(1)
      }
      return
    }

    // Print warnings
    for (const warning of result.warnings) {
      console.error(c(`⚠ ${warning}`, 'yellow'))
    }

    // Output
    if (options.output) {
      let finalOutput = result.output!

      // Wrap in HTML document if output is .html
      if (options.output.endsWith('.html')) {
        // Auto-invoke createUI and append to body for standalone HTML
        const autoInvoke = `
// Auto-initialize for standalone HTML
const _ui = createUI()
document.body.appendChild(_ui)
`
        finalOutput = `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Mirror App</title>
  <style>html, body { margin: 0; padding: 0; }</style>
</head>
<body>
<script type="module">
${result.output}
${autoInvoke}
</script>
</body>
</html>`
      }

      writeFile(options.output, finalOutput)
      console.error(
        c(`✓ Compiled successfully`, 'green') +
          c(` → ${options.output}`, 'dim') +
          c(` (${result.stats.outputLines} lines, ${result.stats.compileTime}ms)`, 'dim')
      )
    } else {
      // Output to stdout
      console.log(result.output)

      if (options.verbose) {
        console.error(
          c(`\n✓ Compiled successfully`, 'green') +
            c(
              ` (${result.stats.inputFiles} files, ${result.stats.inputLines} → ${result.stats.outputLines} lines, ${result.stats.compileTime}ms)`,
              'dim'
            )
        )
      }
    }
  }

  // Initial compile
  doCompile()

  // Watch mode
  if (options.watch) {
    watchFiles(options.input, options.project, options, doCompile)
  }
}

main()
