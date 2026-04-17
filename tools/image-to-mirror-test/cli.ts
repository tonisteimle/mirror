#!/usr/bin/env npx tsx
/**
 * Image-to-Mirror Test CLI
 *
 * Command line interface for running roundtrip tests.
 *
 * Usage:
 *   npx tsx tools/image-to-mirror-test/cli.ts [options]
 *
 * Options:
 *   --level=LEVEL     Run tests of specific level (basic|layout|styling|typography|component|complex)
 *   --tag=TAG         Run tests with specific tag
 *   --pattern=REGEX   Filter tests by name pattern
 *   --headed          Show browser window
 *   --verbose         Verbose output
 *   --output=DIR      Output directory for screenshots
 *   --list            List available tests without running
 */

import { ImageToMirrorTestRunner } from './runner'
import { allFixtures, getFixturesByLevel, getFixturesByTag } from './fixtures'
import type { TestCase, TestConfig } from './types'

// =============================================================================
// CLI Argument Parsing
// =============================================================================

interface CLIArgs {
  level?: string
  tag?: string
  pattern?: string
  headed: boolean
  verbose: boolean
  output?: string
  list: boolean
  help: boolean
}

function parseArgs(): CLIArgs {
  const args: CLIArgs = {
    headed: false,
    verbose: false,
    list: false,
    help: false,
  }

  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith('--level=')) {
      args.level = arg.split('=')[1]
    } else if (arg.startsWith('--tag=')) {
      args.tag = arg.split('=')[1]
    } else if (arg.startsWith('--pattern=')) {
      args.pattern = arg.split('=')[1]
    } else if (arg.startsWith('--output=')) {
      args.output = arg.split('=')[1]
    } else if (arg === '--headed') {
      args.headed = true
    } else if (arg === '--verbose' || arg === '-v') {
      args.verbose = true
    } else if (arg === '--list') {
      args.list = true
    } else if (arg === '--help' || arg === '-h') {
      args.help = true
    }
  }

  return args
}

// =============================================================================
// Help
// =============================================================================

function printHelp(): void {
  console.log(`
Image-to-Mirror Test System

Roundtrip testing for image-to-Mirror conversion.
Takes Mirror code → renders PNG → analyzes → generates code → compares.

Usage:
  npx tsx tools/image-to-mirror-test/cli.ts [options]

Options:
  --level=LEVEL     Run tests of specific level:
                    basic, layout, styling, typography, component, complex

  --tag=TAG         Run tests with specific tag (e.g., --tag=button)

  --pattern=REGEX   Filter tests by name pattern (e.g., --pattern=card)

  --headed          Show browser window (default: headless)

  --verbose, -v     Verbose output

  --output=DIR      Output directory for screenshots
                    (default: ./test-output/image-to-mirror)

  --list            List available tests without running

  --help, -h        Show this help

Examples:
  # Run all tests
  npx tsx tools/image-to-mirror-test/cli.ts

  # Run only basic tests
  npx tsx tools/image-to-mirror-test/cli.ts --level=basic

  # Run with visible browser
  npx tsx tools/image-to-mirror-test/cli.ts --headed --verbose

  # List available tests
  npx tsx tools/image-to-mirror-test/cli.ts --list

  # Run tests matching pattern
  npx tsx tools/image-to-mirror-test/cli.ts --pattern=button
`)
}

// =============================================================================
// List Tests
// =============================================================================

function listTests(tests: TestCase[]): void {
  console.log('\nAvailable Tests:\n')

  // Group by first tag
  const groups = new Map<string, TestCase[]>()

  for (const test of tests) {
    const group = test.tags?.[0] || 'other'
    if (!groups.has(group)) {
      groups.set(group, [])
    }
    groups.get(group)!.push(test)
  }

  for (const [group, groupTests] of groups) {
    console.log(`  ${group.toUpperCase()}`)
    for (const test of groupTests) {
      const tags = test.tags?.join(', ') || ''
      console.log(`    ${test.id.padEnd(25)} ${test.name}`)
      if (test.description) {
        console.log(`    ${''.padEnd(25)} └─ ${test.description}`)
      }
    }
    console.log()
  }

  console.log(`Total: ${tests.length} tests`)
}

// =============================================================================
// Main
// =============================================================================

async function main(): Promise<void> {
  const args = parseArgs()

  if (args.help) {
    printHelp()
    process.exit(0)
  }

  // Collect tests based on filters
  let tests: TestCase[] = allFixtures

  if (args.level) {
    const validLevels = ['basic', 'layout', 'styling', 'typography', 'component', 'complex']
    if (!validLevels.includes(args.level)) {
      console.error(`Invalid level: ${args.level}`)
      console.error(`Valid levels: ${validLevels.join(', ')}`)
      process.exit(1)
    }
    tests = getFixturesByLevel(args.level as any)
  }

  if (args.tag) {
    tests = tests.filter(t => t.tags?.includes(args.tag!))
  }

  if (args.pattern) {
    const regex = new RegExp(args.pattern, 'i')
    tests = tests.filter(t => regex.test(t.name) || regex.test(t.id))
  }

  if (tests.length === 0) {
    console.error('No tests match the specified filters.')
    process.exit(1)
  }

  // List mode
  if (args.list) {
    listTests(tests)
    process.exit(0)
  }

  // Build config
  const config: Partial<TestConfig> = {
    headless: !args.headed,
    verbose: args.verbose,
  }

  if (args.output) {
    config.outputDir = args.output
  }

  // Run tests
  console.log('\n🎯 Image-to-Mirror Test System\n')
  console.log(`Running ${tests.length} tests...`)

  const runner = new ImageToMirrorTestRunner(config)

  try {
    await runner.start()
    const summary = await runner.runTests(tests)

    // Exit code based on results
    process.exit(summary.failed > 0 ? 1 : 0)
  } catch (error) {
    console.error('Test runner error:', error)
    process.exit(1)
  } finally {
    await runner.stop()
  }
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
