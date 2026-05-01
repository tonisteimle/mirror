/**
 * CLI Argument Parsing.
 */

import { c } from './output'
import type { CLIOptions } from './types'

export function parseArgs(args: string[]): CLIOptions {
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
