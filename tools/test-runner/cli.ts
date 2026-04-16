#!/usr/bin/env npx tsx
/**
 * Test Runner CLI
 *
 * Clean command-line interface for the test runner.
 */

import { TestRunner } from './runner'
import { ConsoleReporter, JUnitReporter, HTMLReporter } from './reporters'
import { FileExplorer } from './file-explorer'
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
  test?: string // Single test by exact name
  list: boolean // List available tests
  explore: boolean // File explorer / diagnose mode
  debugTokens?: string // Debug token extraction for a property type
  newProject: boolean // Create new project with default tokens
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
    test: getArgValue(args, '--test'),
    list: args.includes('--list'),
    explore: args.includes('--explore') || args.includes('--diagnose'),
    debugTokens: getArgValue(args, '--debug-tokens'),
    newProject: args.includes('--new-project'),
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
${bold('Mirror Browser Test Runner')}

Runs browser-based tests for Mirror Studio using CDP (Chrome DevTools Protocol).

${bold('Usage:')}
  npm run test:browser [-- options]
  npx tsx tools/test.ts [options]

${bold('Test Selection:')}
  (no flags)          Run all browser tests (default)
  --test="NAME"       Run a single test by exact name
  --filter=PATTERN    Filter tests by name pattern (regex)
  --category=NAME     Run specific category:
                        primitives, layout, styling, zag, interactions,
                        bidirectional, undoRedo, autocomplete, stackedDrag,
                        flexReorder, propertyPanel, charts
  --drag              Run drag & drop tests only
  --mirror            Run mirror tests only
  --list              List all available tests

${bold('Diagnostics:')}
  --explore           Show file structure and project state
  --diagnose          Alias for --explore
  --debug-tokens=TYPE Debug token extraction (pad, gap, rad, col, bg)
  --new-project       Create new project with default tokens

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
  npx tsx tools/test.ts --list                                # List all tests
  npx tsx tools/test.ts --test="Drop Avatar into App stacked" # Run single test
  npx tsx tools/test.ts --test="Drop Avatar" --headed         # Single test, visible
  npx tsx tools/test.ts --category=stackedDrag                # Stacked drag tests
  npx tsx tools/test.ts --category=flexReorder                # Flex reorder tests
  npx tsx tools/test.ts --filter="App stacked"                # Filter by pattern
  npx tsx tools/test.ts --headed                              # All with visible browser
  npx tsx tools/test.ts --explore                             # Show file structure
  npx tsx tools/test.ts --debug-tokens=pad                    # Debug padding tokens
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

    // Handle new project creation (inject tokens)
    if (args.newProject) {
      console.log('🆕 Injecting default tokens...')

      // Inject tokens directly into the running project
      const success = await runner.evaluate<boolean>(`
        (() => {
          // Add tokens file
          const tokensContent = \`// Spacing Tokens
s.pad: 4
m.pad: 8
l.pad: 16
xl.pad: 32

s.gap: 4
m.gap: 8
l.gap: 16

// Radius
s.rad: 4
m.rad: 8

// Colors
accent.bg: #5BA8F5
primary.bg: #2271C1
surface.bg: #27272a
canvas.bg: #18181b
muted.col: #a1a1aa
\`

          if (window.files) {
            window.files['tokens.tok'] = tokensContent
            console.log('[Test] Added tokens.tok')
            return true
          }
          return false
        })()
      `)

      if (success) {
        console.log('✅ Tokens injected')
        // Trigger recompile to update token cache
        await runner.evaluate<void>(`
          window.studio?.events?.emit('compile:requested', {})
        `)
        // Wait for compile to finish
        await new Promise(resolve => setTimeout(resolve, 1000))
        console.log('✅ Recompiled')

        // Select an element to trigger panel render with new tokens
        await runner.evaluate<void>(`
          (async () => {
            const preview = document.getElementById('preview')
            const el = preview?.querySelector('[data-mirror-id]')
            if (el) {
              el.click()
              await new Promise(r => setTimeout(r, 300))
            }
          })()
        `)
        console.log('✅ Element selected\n')
      } else {
        console.log('⚠️  Could not inject tokens\n')
      }

      // Continue to explore/debug if those flags are also set
      if (!args.explore && !args.debugTokens) {
        const explorer = runner.getFileExplorer()
        await explorer.printReport()
        await runner.stop()
        process.exit(0)
      }
    }

    // Handle explore/diagnose mode
    if (args.explore || args.debugTokens) {
      const explorer = runner.getFileExplorer()

      if (args.debugTokens) {
        console.log(`\n🔍 Debugging token extraction for: ${args.debugTokens}\n`)
        const debug = await explorer.debugTokenExtraction(args.debugTokens)
        console.log('Regex:', debug.regex)
        console.log('Lines containing .' + args.debugTokens + ':')
        debug.matches.forEach(m => console.log('  ', m))
        console.log('\nExtracted tokens:')
        debug.tokens.forEach(t => console.log(`  ${t.name} = ${t.value}`))
        if (debug.tokens.length === 0) {
          console.log('  ⚠️  No tokens matched!')
        }
        console.log('\nSource preview (first 1000 chars):')
        console.log(debug.source)

        // Also check property panel
        console.log('\n📋 Property Panel Debug:')
        const panelDebug = await explorer.debugPropertyPanel()
        console.log('  hasPanel (legacy):', panelDebug.hasPanel)
        console.log('  hasStudioPanel:', panelDebug.hasStudioPanel)
        console.log('  hasController:', panelDebug.hasController)
        console.log('  hasPorts:', panelDebug.hasPorts)
        console.log('  sourceLength:', panelDebug.sourceLength)
        console.log('  spacingTokens:', panelDebug.spacingTokens.length, panelDebug.spacingTokens)
        console.log(
          '  colorTokens (from ports):',
          panelDebug.colorTokens.length,
          panelDebug.colorTokens.slice(0, 5)
        )
        if (panelDebug.colorTokensAfterInvalidate) {
          console.log(
            '  colorTokens (after invalidate):',
            panelDebug.colorTokensAfterInvalidate.length,
            panelDebug.colorTokensAfterInvalidate.slice(0, 5)
          )
        }
        if (panelDebug.manualColorTokens) {
          console.log(
            '  manualColorTokens (regex):',
            panelDebug.manualColorTokens.length,
            panelDebug.manualColorTokens.slice(0, 5)
          )
        }
        if (panelDebug.getAllSourceResult) {
          console.log('  getAllSourceResult:', panelDebug.getAllSourceResult)
        }
        if (panelDebug.sourcePreview) {
          console.log('  sourcePreview (first 200 chars):')
          console.log('   ', panelDebug.sourcePreview.substring(0, 200).replace(/\n/g, '\n    '))
        }
      } else {
        await explorer.printReport()
      }

      // Always check UI tokens after explore/debug
      console.log('\n🎯 Checking Token UI visibility...')
      const uiCheck = await explorer.checkTokensInUI()
      console.log('  selectedElement:', uiCheck.selectedElement)
      console.log('  propPanelVisible:', uiCheck.propPanelVisible)
      console.log('  hasTokenGroup:', uiCheck.hasTokenGroup)
      console.log('  tokenButtonCount:', uiCheck.tokenButtonCount)
      console.log('  tokenDetails:')
      uiCheck.tokenDetails.forEach(t => {
        console.log(`    - "${t.text}" title="${t.title}" data=${t.dataset}`)
      })
      console.log('  spacingSectionPreview:')
      console.log('   ', uiCheck.spacingSectionPreview.substring(0, 300).replace(/\n/g, ' '))
      console.log('  viewTokensDebug (from view.ports):')
      console.log('   ', uiCheck.viewTokensDebug)
      console.log('  sourceDebug:', uiCheck.sourceDebug)

      // Check if the token buttons have proper labels (s, m, l, xl)
      const hasProperTokens = uiCheck.tokenDetails.some(t => ['s', 'm', 'l', 'xl'].includes(t.text))
      if (hasProperTokens) {
        console.log('\n✅ Tokens are visible in Property Panel UI!')
      } else if (uiCheck.tokenButtonCount > 0) {
        console.log('\n⚠️  Token buttons found but labels are not spacing tokens')
      } else {
        console.log('\n❌ No token buttons found in Property Panel UI')
      }

      await runner.stop()
      process.exit(0)
    }

    const suites: TestSuite[] = []

    // If --test is specified, run only that single test
    if (args.test) {
      console.log(`🎯 Running single test: "${args.test}"\n`)
      const suite = await runner.runSingleTestByName(args.test)
      suites.push(suite)
    } else {
      // Determine which tests to run
      // Default: run all tests when no specific selection is made
      const noSelection = !args.drag && !args.mirror && !args.category
      const runAll = args.all || noSelection
      const runDrag = runAll || args.drag
      const runMirror = runAll || args.mirror || args.category

      if (runDrag && !args.category) {
        suites.push(await runner.runDragTests())
      }

      if (runMirror) {
        suites.push(await runner.runMirrorTests(args.category))
      }
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
