#!/usr/bin/env npx tsx
/**
 * Test Runner CLI
 *
 * Clean command-line interface for the test runner.
 */

import { TestRunner } from './runner'
import { ConsoleReporter, JUnitReporter, HTMLReporter, ProgressReporter } from './reporters'
import { FileExplorer } from './file-explorer'
import { DemoRunner, loadDemoScript } from './demo'
import type { TestConfig, TestSuite } from './types'
import { defaultConfig } from './types'
import type { DemoConfig } from './demo/types'

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
  progress: boolean // Show progress bar instead of individual test results
  log?: string // Log file path for test results
  hidePanels?: string // Comma-separated list of panels to hide
  panelMode?: 'test' | 'focus' | 'normal' | 'minimal' // Predefined panel modes
  // Demo mode options
  demo?: string // Path to demo script
  demoSpeed?: 'slow' | 'normal' | 'fast' // Demo speed preset (legacy)
  demoPacing?: 'video' | 'presentation' | 'tutorial' | 'testing' | 'instant' // Pacing profile
  demoOverlay: boolean // Show keystroke overlay (default: true)
  demoValidate: boolean // Only validate demo script (dry-run)
  demoTiming: boolean // Show timing report
  // Validation options
  demoAutoValidate: boolean // Enable auto-validation for all actions
  demoValidationLevel?: 'strict' | 'normal' | 'lenient' // Validation strictness
}

// Panel visibility presets for test categories
const categoryPanelPresets: Record<string, string[]> = {
  // Drag tests: Only need preview (and optionally property for verification)
  paddingDrag: ['files', 'components', 'code', 'prompt'],
  stackedDrag: ['files', 'components', 'code', 'prompt'],
  flexReorder: ['files', 'components', 'code', 'prompt'],
  // Visual tests: Hide sidebars, keep preview prominent
  animations: ['files', 'components', 'prompt'],
  transforms: ['files', 'components', 'prompt'],
  gradients: ['files', 'components', 'prompt'],
  // Layout tests: Need preview and code for bidirectional
  layout: ['files', 'components', 'prompt'],
  // Property panel tests: Need property and preview
  propertyPanel: ['files', 'components', 'prompt'],
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
    progress: args.includes('--progress'),
    log:
      getArgValue(args, '--log') ||
      (args.includes('--progress') ? 'test-results/test-run.log' : undefined),
    hidePanels: getArgValue(args, '--hide-panels'),
    panelMode: getArgValue(args, '--panel-mode') as CLIArgs['panelMode'],
    // Demo mode
    demo: getArgValue(args, '--demo'),
    demoSpeed: (getArgValue(args, '--demo-speed') || 'normal') as CLIArgs['demoSpeed'],
    demoPacing: (getArgValue(args, '--pacing') || 'video') as CLIArgs['demoPacing'],
    demoOverlay: !args.includes('--no-overlay'),
    demoValidate: args.includes('--demo-validate'),
    demoTiming: args.includes('--timing'),
    // Validation options
    demoAutoValidate: args.includes('--validate') || args.includes('--auto-validate'),
    demoValidationLevel: getArgValue(args, '--validation-level') as CLIArgs['demoValidationLevel'],
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

${bold('Test Selection (one required):')}
  --category=NAME     Run specific category (see --list)
  --test="NAME"       Run a single test by exact name
  --filter=PATTERN    Filter tests by name pattern (regex)
  --all               Run ALL tests (~1000+ tests, takes long!)
  --drag              Run comprehensive drag & drop tests
  --mirror            Run all mirror tests (includes drag tests)
  --list              List all categories with test counts

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

${bold('Panel Options:')}
  --hide-panels=LIST  Hide specific panels (comma-separated: files,components,code,property,prompt)
  --panel-mode=MODE   Predefined modes: test|focus|normal|minimal
                      - test: Only code + preview
                      - focus: Only preview
                      - minimal: Preview + property (for visual tests)
                      - normal: All panels visible
  Note: Some categories auto-hide panels (paddingDrag, animations, etc.)

${bold('Output Options:')}
  --junit=PATH        Generate JUnit XML report
  --html=PATH         Generate HTML report
  --screenshot-dir=   Screenshot directory (default: test-results/screenshots)
  --no-screenshot     Disable screenshots on failure
  --verbose           Show all test output (default)
  --quiet             Reduce output
  --silent            No output except errors
  --progress          Show progress bar with live updates (recommended for large test runs)
  --log=PATH          Log results to file (default: test-results/test-run.log when --progress)

${bold('Demo Mode (for video recording):')}
  --demo=PATH         Run a demo script (TypeScript or JSON)
  --pacing=PROFILE    Pacing profile with optimized action timings:
                      - video: Comfortable viewing (default) - 45ms/char, 400ms mouse
                      - presentation: Slower, dramatic - 65ms/char, 600ms mouse
                      - tutorial: Balanced learning - 55ms/char, 500ms mouse
                      - testing: Fast but visible - 15ms/char, 150ms mouse
                      - instant: No delays (CI/validation only)
  --demo-speed=SPEED  Legacy speed preset: slow, normal, fast
  --no-overlay        Disable keystroke overlay
  --demo-validate     Validate demo script with built-in checks (test mode)
  --timing            Show detailed timing report with optimization suggestions

${bold('Demo Auto-Validation:')}
  --validate          Enable comprehensive auto-validation for all actions:
                      • Pre-validation: Check element exists, visible, interactable
                      • Post-validation: Verify actions had expected effect
                      • Console monitoring: Catch runtime errors
                      • State tracking: Compare before/after snapshots
  --auto-validate     Alias for --validate
  --validation-level  Strictness level:
                      - strict: Fail on any warning or error
                      - normal: Fail only on errors (default when enabled)
                      - lenient: Max retries, longer timeouts

${bold('Main Categories (17):')}
  core        Primitives (Frame, Text, Button, Icon, etc.)
  layout      Layout (direction, gap, grid, stacked, wrap)
  styling     Styling (colors, sizing, spacing, borders, gradients)
  visuals     Animations & transforms
  states      State management (toggle, exclusive, hover)
  components  UI patterns (checkbox, dialog, tabs, accordion)
  drag        Drag & drop operations
  handles     Visual handles (padding, margin, gap, resize, snapping)
  selection   Multi-select, ungroup, spread toggle
  propertyPanel  Property panel UI
  editor      Bidirectional sync, undo/redo, autocomplete
  data        Data binding, actions, events, responsive
  project     Multi-file projects, workflows
  compiler    Compiler verification
  ai          AI-assist (draft lines, draft mode)
  tutorial    Tutorial verification
  stress      Stress tests, integration, play mode

${bold('Examples:')}
  npx tsx tools/test.ts --list                                # List all categories
  npx tsx tools/test.ts --category=layout                     # All layout tests
  npx tsx tools/test.ts --category=components                 # UI pattern tests
  npx tsx tools/test.ts --category=drag                       # Drag & drop tests
  npx tsx tools/test.ts --category=handles                    # Visual handles tests
  npx tsx tools/test.ts --category=ai                         # AI-assist tests
  npx tsx tools/test.ts --test="Drop Avatar" --headed         # Single test, visible
  npx tsx tools/test.ts --filter="Button"                     # Filter by pattern
  npx tsx tools/test.ts --progress --category=layout          # With progress bar
  npx tsx tools/test.ts --explore                             # Show file structure

${bold('Demo Examples:')}
  npx tsx tools/test.ts --demo=tools/test-runner/demo/scripts/example.ts --headed
  npx tsx tools/test.ts --demo=scripts/intro.ts --pacing=presentation --headed  # Slow, dramatic
  npx tsx tools/test.ts --demo=scripts/card-workflow.ts --pacing=video --headed # Optimal for recording
  npx tsx tools/test.ts --demo=demo.json --no-overlay --headed
  npx tsx tools/test.ts --demo=scripts/card-workflow.ts --demo-validate          # Fast validation
  npx tsx tools/test.ts --demo=scripts/card-workflow.ts --timing                 # Timing analysis

${bold('Validation Examples:')}
  npx tsx tools/test.ts --demo=scripts/workflow.ts --validate --headed           # With auto-validation
  npx tsx tools/test.ts --demo=scripts/test.ts --validate --validation-level=strict  # Strict mode
  npx tsx tools/test.ts --demo=scripts/test.ts --validate --timing               # Combined reports
`)
}

function bold(text: string): string {
  return `\x1b[1m${text}\x1b[0m`
}

// =============================================================================
// Panel Configuration
// =============================================================================

// Panel mode presets
const panelModePresets: Record<string, string[]> = {
  test: ['files', 'components', 'prompt', 'property'], // Only code + preview
  focus: ['files', 'components', 'code', 'property', 'prompt'], // Only preview
  minimal: ['files', 'components', 'code', 'prompt'], // Preview + property
  normal: [], // All visible
}

async function configurePanels(runner: TestRunner, args: CLIArgs): Promise<string[]> {
  let panelsToHide: string[] = []

  // Priority 1: Explicit --hide-panels flag
  if (args.hidePanels) {
    panelsToHide = args.hidePanels.split(',').map(p => p.trim())
  }
  // Priority 2: --panel-mode flag
  else if (args.panelMode && panelModePresets[args.panelMode]) {
    panelsToHide = panelModePresets[args.panelMode]
  }
  // Priority 3: Category preset (auto-hide for certain test categories)
  else if (args.category && categoryPanelPresets[args.category]) {
    panelsToHide = categoryPanelPresets[args.category]
  }

  // Apply panel visibility
  if (panelsToHide.length > 0) {
    for (const panel of panelsToHide) {
      await runner.evaluate<void>(`
        (() => {
          const studio = window.__mirrorStudio__
          if (studio?.actions?.setPanelVisibility) {
            studio.actions.setPanelVisibility('${panel}', false)
          }
        })()
      `)
    }
  }

  return panelsToHide
}

// =============================================================================
// Demo Mode
// =============================================================================

async function runDemoMode(args: CLIArgs): Promise<number> {
  const isValidateMode = args.demoValidate

  if (isValidateMode) {
    console.log(`\n🔍 ${bold('Demo Validation Mode')}\n`)
  } else {
    console.log(`\n🎬 ${bold('Demo Mode')}\n`)
    if (!args.headed) {
      console.log('⚠️  Demo mode works best with --headed flag for video recording\n')
    }
  }

  try {
    // Load demo script
    console.log(`📄 Loading demo script: ${args.demo}`)
    const script = await loadDemoScript(args.demo!)
    console.log(`   Name: ${script.name}`)
    console.log(`   Steps: ${script.steps.length}`)

    // Count validation steps
    const validationSteps = script.steps.filter(s => s.action === 'validate').length
    if (validationSteps > 0) {
      console.log(`   Validations: ${validationSteps}`)
    }
    console.log('')

    // Create test runner for browser control
    const config: Partial<TestConfig> = {
      headless: !args.headed,
      url: args.url,
      verbose: args.verbose,
      silent: args.silent,
    }

    const runner = new TestRunner(config)

    try {
      await runner.start()
      await runner.navigate(args.url)

      // Wait for page to be ready
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Determine pacing profile
      let pacing = args.demoPacing || 'video'
      if (isValidateMode) {
        pacing = 'testing' // Use testing profile for validation
      }

      // Create demo config with validation options
      const demoConfig: Partial<DemoConfig> & {
        timing?: boolean
        autoValidate?: boolean
        validationLevel?: 'strict' | 'normal' | 'lenient'
      } = {
        speed: isValidateMode ? 'fast' : (args.demoSpeed || 'normal'),
        pacing: pacing as any,
        showKeystrokeOverlay: isValidateMode ? false : args.demoOverlay,
        timing: args.demoTiming,
        autoValidate: args.demoAutoValidate,
        validationLevel: args.demoValidationLevel,
      }

      // Get CDP session for demo runner
      const cdp = (runner as any).cdp
      if (!cdp) {
        throw new Error('Could not access CDP session')
      }

      // Create and run demo
      const demoRunner = new DemoRunner(cdp, demoConfig)
      const result = await demoRunner.run(script)

      // Keep browser open for a moment at the end (only in non-validate mode)
      if (!isValidateMode) {
        await new Promise(resolve => setTimeout(resolve, 2000))
      }

      // Return exit code based on validation results
      if (result.success) {
        if (isValidateMode) {
          console.log('\n🎉 All validations passed!\n')
        }
        return 0
      } else {
        if (isValidateMode) {
          console.log('\n💥 Validation failed!\n')
        }
        return 1
      }
    } finally {
      await runner.stop()
    }
  } catch (err) {
    console.error('❌ Demo error:', err)
    return 1
  }
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

  // Handle --list flag to show categories
  if (args.list) {
    console.log(`\n${bold('Mirror Browser Test Categories')}\n`)
    console.log(`${bold('Main Categories (17):')}\n`)
    const mainCategories = [
      { name: 'core', desc: 'Basic primitives (Frame, Text, Button, Icon)' },
      { name: 'layout', desc: 'Layout (direction, gap, grid, stacked, wrap)' },
      { name: 'styling', desc: 'Styling (colors, sizing, spacing, gradients)' },
      { name: 'visuals', desc: 'Animations & transforms' },
      { name: 'states', desc: 'State management (toggle, exclusive, hover)' },
      { name: 'components', desc: 'UI patterns (checkbox, dialog, tabs)' },
      { name: 'drag', desc: 'Drag & drop operations' },
      { name: 'handles', desc: 'Visual handles (padding, margin, resize)' },
      { name: 'selection', desc: 'Multi-select, ungroup, spread toggle' },
      { name: 'propertyPanel', desc: 'Property panel UI' },
      { name: 'editor', desc: 'Sync, undo/redo, autocomplete' },
      { name: 'data', desc: 'Data binding, actions, events' },
      { name: 'project', desc: 'Multi-file projects, workflows' },
      { name: 'compiler', desc: 'Compiler verification' },
      { name: 'ai', desc: 'AI-assist (draft lines, draft mode)' },
      { name: 'tutorial', desc: 'Tutorial verification' },
      { name: 'stress', desc: 'Stress tests, integration' },
    ]
    for (const cat of mainCategories) {
      console.log(`  ${cat.name.padEnd(15)} ${cat.desc}`)
    }
    console.log(`\n${bold('Usage:')}\n`)
    console.log('  npx tsx tools/test.ts --category=layout')
    console.log('  npx tsx tools/test.ts --category=components --headed')
    console.log('  npx tsx tools/test.ts --progress --category=drag\n')
    process.exit(0)
  }

  // Handle demo mode
  if (args.demo) {
    const exitCode = await runDemoMode(args)
    process.exit(exitCode)
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
  let progressReporter: ProgressReporter | null = null

  if (args.progress) {
    // Use ProgressReporter for live progress bar
    progressReporter = new ProgressReporter({
      logFile: args.log,
    })
    runner.addReporter(progressReporter)

    // Connect progress callback
    runner.onProgress(update => {
      progressReporter!.handleProgressUpdate(update)
    })
  } else {
    // Use standard ConsoleReporter
    runner.addReporter(
      new ConsoleReporter({
        verbose: args.verbose,
        silent: args.silent,
      })
    )
  }

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

    // Wait for test suites to be loaded (async import)
    const hasSuites = await runner.waitForTestSuites()
    if (!hasSuites) {
      // Try to get the actual error
      const loadError = await runner.evaluate<string>(`window.__suitesLoadError || 'Unknown error'`)
      console.error('❌ Test suites not loaded. Error:', loadError)
      process.exit(1)
    }

    console.log('✅ Test API available\n')

    // Configure panel visibility
    const panelsToHide = await configurePanels(runner, args)
    if (panelsToHide.length > 0) {
      console.log(`🔲 Hidden panels: ${panelsToHide.join(', ')}\n`)
    }

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

    // Check if any test selection was made
    const hasTestSelection =
      args.test || args.category || args.filter || args.all || args.drag || args.mirror

    if (!hasTestSelection) {
      // No selection made - show error and category list
      console.log('❌ No test selection specified.\n')
      console.log('Please specify one of:')
      console.log('  --category=NAME   Run a specific category')
      console.log('  --test="NAME"     Run a single test by name')
      console.log('  --filter=PATTERN  Filter tests by pattern')
      console.log('  --all             Run all tests (~1000+)')
      console.log('  --list            Show all categories\n')
      console.log('Example: npx tsx tools/test.ts --category=propertyPanel\n')

      // Show available categories
      const categories = await runner.getCategories()
      if (categories && categories.length > 0) {
        console.log('📁 Available categories:\n')
        for (const cat of categories) {
          console.log(`   ${cat.name.padEnd(25)} ${cat.count} tests`)
        }
        console.log('')
      }

      await runner.stop()
      process.exit(1)
    }

    // Calculate total tests and suite count for progress reporting
    if (args.progress && progressReporter) {
      let totalTests = 0
      let suiteCount = 0

      if (args.test) {
        totalTests = 1
        suiteCount = 1
      } else if (args.category) {
        const categories = await runner.getCategories()
        const cat = categories.find(c => c.name === args.category)
        totalTests = cat?.count || 0
        suiteCount = 1
      } else if (args.drag && !args.all) {
        // Drag tests are now part of unified system
        const categories = await runner.getCategories()
        const cat = categories.find(c => c.name === 'comprehensiveDrag')
        totalTests = cat?.count || 0
        suiteCount = 1
      } else if (args.filter) {
        // Can't easily know filter count, will be updated dynamically
        suiteCount = 1
      } else {
        // Get total from all categories that will be run
        totalTests = await runner.getTotalTestCount()
        suiteCount = 1
      }

      if (totalTests > 0) {
        progressReporter.setTotalTests(totalTests, suiteCount)
      }
    }

    // If --test is specified, run only that single test
    if (args.test) {
      console.log(`🎯 Running single test: "${args.test}"\n`)
      const suite = await runner.runSingleTestByName(args.test)
      suites.push(suite)
    } else if (args.category) {
      // If --category is specified, run ONLY that category (no drag tests)
      console.log(`📁 Running category: ${args.category}\n`)
      suites.push(await runner.runMirrorTests(args.category))
    } else if (args.filter) {
      // If --filter is specified, run only Mirror tests with filter (no drag tests)
      console.log(`🔍 Running filtered tests: "${args.filter}"\n`)
      suites.push(await runner.runMirrorTests(undefined, args.filter))
    } else if (args.all || args.drag || args.mirror) {
      // Explicit selection to run multiple test suites
      const runMirror = args.all || args.mirror

      if (args.drag && !args.all) {
        // --drag flag now runs comprehensiveDrag category from unified system
        console.log('📁 Running category: comprehensiveDrag\n')
        suites.push(await runner.runMirrorTests('comprehensiveDrag'))
      }

      if (runMirror) {
        suites.push(await runner.runMirrorTests())
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
