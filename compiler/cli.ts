/**
 * Mirror Compiler CLI
 *
 * Orchestrates parse-args → compile (single or project) → output (stdout
 * or file, optionally HTML-wrapped) → optional watch loop. The actual work
 * lives in `compiler/cli/`:
 *   args.ts     — parseArgs
 *   compile.ts  — compileFiles, compileProject
 *   files.ts    — read/write/list utilities
 *   output.ts   — colors, printHelp, printVersion
 *   types.ts    — CLIOptions, CompileResult, FILE_EXTENSIONS
 *   watch.ts    — watchFiles + debounce
 *
 * Usage:
 *   npx tsx compiler/cli.ts app.mirror                    # Compile single file
 *   npx tsx compiler/cli.ts app.mirror -o dist/app.js     # Output to file
 *   npx tsx compiler/cli.ts --project src/                # Compile project
 *   npx tsx compiler/cli.ts app.mirror --react            # Generate React
 *   npx tsx compiler/cli.ts app.mirror --watch            # Watch mode
 */

import * as fs from 'fs'
import * as path from 'path'
import { parseArgs } from './cli/args'
import { compileFiles, compileProject } from './cli/compile'
import { writeFile } from './cli/files'
import { c, printHelp, printVersion } from './cli/output'
import type { CompileResult } from './cli/types'
import { watchFiles } from './cli/watch'

/**
 * Wrap compiled code in a standalone HTML document — used when the
 * output path ends in `.html`. The `createUI()` helper is auto-invoked
 * and appended to the body so the user can open the file directly.
 */
function wrapInHtmlDocument(compiledCode: string): string {
  const autoInvoke = `
// Auto-initialize for standalone HTML
const _ui = createUI()
document.body.appendChild(_ui)
`
  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Mirror App</title>
  <style>html, body { margin: 0; padding: 0; }</style>
</head>
<body>
<script type="module">
${compiledCode}
${autoInvoke}
</script>
</body>
</html>`
}

/** Expand a glob-like input (foo/*.mir) into an explicit file list. */
function expandGlob(input: string): string[] {
  if (!input.includes('*')) return [input]
  const dir = path.dirname(input)
  const pattern = path.basename(input)
  const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$')
  return fs
    .readdirSync(dir)
    .filter(f => regex.test(f))
    .map(f => path.join(dir, f))
}

function main(): void {
  const options = parseArgs(process.argv.slice(2))

  if (options.help) {
    printHelp()
    process.exit(0)
  }

  if (options.version) {
    printVersion()
    process.exit(0)
  }

  if (!options.project && options.input.length === 0) {
    console.error(c('Error: No input files specified', 'red'))
    console.error(c('Run `mirror-compile --help` for usage', 'dim'))
    process.exit(1)
  }

  const doCompile = (): void => {
    let result: CompileResult

    if (options.project) {
      result = compileProject(options.project, options.backend, options.verbose)
    } else {
      const files = options.input.flatMap(expandGlob)
      if (options.verbose) {
        console.error(c(`Compiling ${files.length} file(s)...`, 'cyan'))
      }
      result = compileFiles(files, options.backend, options.verbose)
    }

    if (!result.success) {
      console.error(c(`\n✗ Compilation failed: ${result.error}`, 'red'))
      if (!options.watch) process.exit(1)
      return
    }

    for (const warning of result.warnings) {
      console.error(c(`⚠ ${warning}`, 'yellow'))
    }

    if (options.output) {
      const finalOutput = options.output.endsWith('.html')
        ? wrapInHtmlDocument(result.output!)
        : result.output!
      writeFile(options.output, finalOutput)
      console.error(
        c(`✓ Compiled successfully`, 'green') +
          c(` → ${options.output}`, 'dim') +
          c(` (${result.stats.outputLines} lines, ${result.stats.compileTime}ms)`, 'dim')
      )
    } else {
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

  doCompile()

  if (options.watch) {
    watchFiles(options.input, options.project, doCompile)
  }
}

main()
