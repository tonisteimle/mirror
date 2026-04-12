#!/usr/bin/env node
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
  mirror-compile <file.mirror> [options]
  mirror-compile --project <dir> [options]

${c('ARGUMENTS:', 'yellow')}
  <file.mirror>          Input file(s) to compile

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
  mirror-compile app.mirror

  ${c('# Compile to output file', 'dim')}
  mirror-compile app.mirror -o dist/app.js

  ${c('# Compile multiple files', 'dim')}
  mirror-compile tokens.mirror components.mirror app.mirror -o dist/bundle.js

  ${c('# Compile project directory', 'dim')}
  mirror-compile --project examples/task-app -o dist/task-app.js

  ${c('# Generate React components', 'dim')}
  mirror-compile app.mirror --react -o App.tsx

  ${c('# Watch mode', 'dim')}
  mirror-compile app.mirror -o dist/app.js --watch

${c('PROJECT STRUCTURE:', 'yellow')}
  When using --project, files are processed in order:
    1. data/       → Data definitions (.data files)
    2. tokens/     → Design tokens
    3. components/ → Reusable components
    4. layouts/    → Layout components
    5. *.mirror    → Main application files

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

function listFiles(dir: string, extension: string): string[] {
  const absoluteDir = path.resolve(dir)
  if (!fs.existsSync(absoluteDir)) {
    return []
  }

  const files = fs.readdirSync(absoluteDir)
  return files
    .filter(f => f.endsWith(extension))
    .map(f => path.join(absoluteDir, f))
}

function listMirrorFiles(dir: string): string[] {
  return listFiles(dir, '.mirror')
}

function listDataFiles(dir: string): string[] {
  return listFiles(dir, '.data')
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

function compileFiles(
  files: string[],
  backend: 'dom' | 'react',
  verbose: boolean
): CompileResult {
  const startTime = Date.now()
  const warnings: string[] = []

  try {
    // Read all input files
    let combinedCode = ''
    let totalLines = 0
    const dataFiles: DataFile[] = []

    for (const file of files) {
      if (verbose) {
        console.error(c(`  Reading ${file}...`, 'dim'))
      }

      const content = readFile(file)
      totalLines += content.split('\n').length

      if (file.endsWith('.data')) {
        // Parse data file
        const dataFile = parseDataFile(content, path.basename(file, '.data'))
        dataFiles.push(dataFile)
      } else if (file.endsWith('.mirror')) {
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

  if (verbose) {
    console.error(c(`Compiling project: ${projectDir}`, 'cyan'))
  }

  // Collect files in order
  const files: string[] = []

  // 1. Data files
  const dataDir = path.join(projectDir, 'data')
  files.push(...listDataFiles(dataDir))

  // 2. Tokens
  const tokensDir = path.join(projectDir, 'tokens')
  files.push(...listMirrorFiles(tokensDir))

  // Also check for tokens.mirror in root
  const tokensFile = path.join(projectDir, 'tokens.mirror')
  if (fs.existsSync(tokensFile) && !files.includes(tokensFile)) {
    files.push(tokensFile)
  }

  // 3. Components
  const componentsDir = path.join(projectDir, 'components')
  files.push(...listMirrorFiles(componentsDir))

  // Also check for components.mirror in root
  const componentsFile = path.join(projectDir, 'components.mirror')
  if (fs.existsSync(componentsFile) && !files.includes(componentsFile)) {
    files.push(componentsFile)
  }

  // 4. Data.mirror in root
  const dataFile = path.join(projectDir, 'data.mirror')
  if (fs.existsSync(dataFile) && !files.includes(dataFile)) {
    files.push(dataFile)
  }

  // 5. Layouts
  const layoutsDir = path.join(projectDir, 'layouts')
  files.push(...listMirrorFiles(layoutsDir))

  // 6. Screens
  const screensDir = path.join(projectDir, 'screens')
  files.push(...listMirrorFiles(screensDir))

  // 7. Root .mirror files (excluding already added ones)
  const rootFiles = listMirrorFiles(projectDir)
  for (const file of rootFiles) {
    if (!files.includes(file)) {
      files.push(file)
    }
  }

  if (files.length === 0) {
    return {
      success: false,
      error: `No .mirror or .data files found in ${projectDir}`,
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

function watchFiles(
  files: string[],
  projectDir: string | undefined,
  options: CLIOptions,
  compile: () => void
): void {
  console.error(c('\nWatching for changes... (Ctrl+C to stop)', 'cyan'))

  const watchPaths = projectDir ? [projectDir] : files

  for (const watchPath of watchPaths) {
    const absolutePath = path.resolve(watchPath)

    if (fs.statSync(absolutePath).isDirectory()) {
      // Watch directory recursively
      fs.watch(absolutePath, { recursive: true }, (eventType, filename) => {
        if (filename && (filename.endsWith('.mirror') || filename.endsWith('.data'))) {
          console.error(c(`\n[${new Date().toLocaleTimeString()}] Change detected: ${filename}`, 'yellow'))
          compile()
        }
      })
    } else {
      // Watch single file
      fs.watch(absolutePath, (eventType) => {
        if (eventType === 'change') {
          console.error(c(`\n[${new Date().toLocaleTimeString()}] Change detected: ${path.basename(absolutePath)}`, 'yellow'))
          compile()
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
      writeFile(options.output, result.output!)
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
          c(` (${result.stats.inputFiles} files, ${result.stats.inputLines} → ${result.stats.outputLines} lines, ${result.stats.compileTime}ms)`, 'dim')
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
