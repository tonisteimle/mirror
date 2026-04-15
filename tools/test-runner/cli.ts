#!/usr/bin/env npx tsx
/**
 * Test Runner CLI
 *
 * Clean command-line interface for the test runner.
 */

import { TestRunner } from './runner'
import { ConsoleReporter, JUnitReporter, HTMLReporter } from './reporters'
import type { TestConfig, TestSuite } from './types'
import { defaultConfig } from './types'

// =============================================================================
// CLI Arguments
// =============================================================================

interface CLIArgs {
  help: boolean
  headed: boolean
  url: string
  filter?: string
  category?: string
  all: boolean
  mirror: boolean
  drag: boolean
  bail: boolean
  retries: number
  timeout: number
  screenshot: boolean
  screenshotDir: string
  junit?: string
  html?: string
  watch: boolean
  verbose: boolean
  silent: boolean
}

function parseArgs(): CLIArgs {
  const args = process.argv.slice(2)

  return {
    help: args.includes('--help') || args.includes('-h'),
    headed: args.includes('--headed'),
    url: getArgValue(args, '--url') || defaultConfig.url,
    filter: getArgValue(args, '--filter'),
    category: getArgValue(args, '--category'),
    all: args.includes('--all'),
    mirror: args.includes('--mirror'),
    drag: args.includes('--drag'),
    bail: args.includes('--bail'),
    retries: parseInt(getArgValue(args, '--retries') || '0'),
    timeout: parseInt(getArgValue(args, '--timeout') || '30000'),
    screenshot: !args.includes('--no-screenshot'),
    screenshotDir: getArgValue(args, '--screenshot-dir') || 'test-results/screenshots',
    junit: getArgValue(args, '--junit'),
    html: getArgValue(args, '--html'),
    watch: args.includes('--watch'),
    verbose: !args.includes('--quiet'),
    silent: args.includes('--silent'),
  }
}

function getArgValue(args: string[], flag: string): string | undefined {
  const arg = args.find(a => a.startsWith(`${flag}=`))
  return arg?.split('=')[1]
}

// =============================================================================
// Help Text
// =============================================================================

function printHelp(): void {
  console.log(`
${bold('Mirror Studio Test Runner')}

${bold('Usage:')}
  npx tsx tools/test-runner/cli.ts [options]

${bold('Test Selection:')}
  --drag              Run drag & drop tests only (default)
  --mirror            Run mirror tests (primitives, layout, styling, etc.)
  --all               Run all tests
  --category=NAME     Run specific category:
                        primitives, layout, styling, zag, interactions,
                        bidirectional, undoRedo, autocomplete, stackedDrag
  --filter=PATTERN    Filter tests by name pattern (regex)

${bold('Browser Options:')}
  --headed            Run with visible browser window
  --url=URL           Custom Studio URL (default: localhost:5173/studio/)

${bold('Execution Options:')}
  --bail              Stop on first failure
  --retries=N         Retry failed tests N times (default: 0)
  --timeout=MS        Test timeout in milliseconds (default: 30000)
  --watch             Watch mode - rerun on file changes

${bold('Output Options:')}
  --junit=PATH        Generate JUnit XML report
  --html=PATH         Generate HTML report
  --screenshot-dir=   Screenshot directory (default: test-results/screenshots)
  --no-screenshot     Disable screenshots on failure
  --verbose           Show all test output (default)
  --quiet             Reduce output
  --silent            No output except errors

${bold('Examples:')}
  npx tsx tools/test-runner/cli.ts                    # Drag tests only
  npx tsx tools/test-runner/cli.ts --all              # All tests
  npx tsx tools/test-runner/cli.ts --mirror           # Mirror tests only
  npx tsx tools/test-runner/cli.ts --category=layout  # Layout tests only
  npx tsx tools/test-runner/cli.ts --all --headed     # All with visible browser
  npx tsx tools/test-runner/cli.ts --all --retries=2  # Retry failed tests 2x
  npx tsx tools/test-runner/cli.ts --all --junit=results.xml --html=report.html
`)
}

function bold(text: string): string {
  return `\x1b[1m${text}\x1b[0m`
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

  const config: Partial<TestConfig> = {
    headless: !args.headed,
    url: args.url,
    filter: args.filter ? new RegExp(args.filter, 'i') : undefined,
    category: args.category,
    bail: args.bail,
    retries: args.retries,
    timeout: args.timeout,
    screenshotOnFailure: args.screenshot,
    screenshotDir: args.screenshotDir,
    watch: args.watch,
    verbose: args.verbose,
    silent: args.silent,
  }

  const runner = new TestRunner(config)

  // Add reporters
  runner.addReporter(
    new ConsoleReporter({
      verbose: args.verbose,
      silent: args.silent,
    })
  )

  if (args.junit) {
    runner.addReporter(new JUnitReporter(args.junit))
  }

  if (args.html) {
    runner.addReporter(new HTMLReporter(args.html))
  }

  try {
    await runner.start()
    await runner.navigate(args.url)

    const hasAPI = await runner.waitForTestAPI()
    if (!hasAPI) {
      console.error('❌ Test API not found. Is the Studio running?')
      process.exit(1)
    }

    console.log('✅ Test API available\n')

    const suites: TestSuite[] = []

    // Determine which tests to run
    const runDrag = args.all || args.drag || (!args.mirror && !args.category)
    const runMirror = args.all || args.mirror || args.category

    if (runDrag && !args.category) {
      suites.push(await runner.runDragTests())
    }

    if (runMirror) {
      suites.push(await runner.runMirrorTests(args.category))
    }

    // Finalize and generate reports
    const summary = await runner.finalize(suites)

    // Exit with appropriate code
    process.exit(summary.totalFailed > 0 ? 1 : 0)
  } catch (err) {
    console.error('❌ Error:', err)
    process.exit(1)
  } finally {
    await runner.stop()
  }
}

main()
