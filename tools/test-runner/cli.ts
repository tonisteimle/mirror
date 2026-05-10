#!/usr/bin/env npx tsx
/**
 * Test Runner CLI — runs Mirror's browser test suites via CDP.
 *
 * The old demo-runner (`--demo` / `--demo-suite` and the SVG-cursor /
 * keystroke-overlay layer) is gone. Tests now drive the app exclusively
 * through `cdpInput.*` (see `docs/TEST-FRAMEWORK.md`, „Grundprinzip —
 * Maus und Keyboard").
 */

import { TestRunner } from './runner'
import { ConsoleReporter, JUnitReporter, HTMLReporter, ProgressReporter } from './reporters'
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
  test?: string
  list: boolean
  explore: boolean
  debugTokens?: string
  newProject: boolean
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
  progress: boolean
  log?: string
  hidePanels?: string
  panelMode?: 'test' | 'focus' | 'normal' | 'minimal'
  /** Real macOS cursor via nut-js. Off by default (CDP input is enough). */
  osMouse?: boolean
  /** Pixel-diff bridge directory; off unless set. */
  snapshotDir?: string
  snapshotBaseline?: string
  snapshotThreshold?: number
  /** Video recording (CDP screencast → ffmpeg → WebM). */
  record?: string
  recordFps?: number
  /** Browser viewport size override. */
  windowSize?: string
  /** Headed-realism throttles. */
  cpuThrottle?: number
  networkThrottle?: 'offline' | 'slow-3g' | 'fast-3g' | '4g'
}

// Panel visibility presets for test categories
const categoryPanelPresets: Record<string, string[]> = {
  paddingDrag: ['files', 'components', 'code', 'prompt'],
  stackedDrag: ['files', 'components', 'code', 'prompt'],
  flexReorder: ['files', 'components', 'code', 'prompt'],
  animations: ['files', 'components', 'prompt'],
  transforms: ['files', 'components', 'prompt'],
  gradients: ['files', 'components', 'prompt'],
  layout: ['files', 'components', 'prompt'],
  propertyPanel: ['files', 'components', 'prompt'],
}

function getArgValue(args: string[], flag: string): string | undefined {
  const arg = args.find(a => a.startsWith(`${flag}=`))
  return arg?.split('=')[1]
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
    osMouse: args.includes('--driver=os') || args.includes('--os-mouse'),
    snapshotDir: getArgValue(args, '--snapshot-dir'),
    snapshotBaseline: getArgValue(args, '--snapshot-baseline'),
    snapshotThreshold: getArgValue(args, '--snapshot-threshold')
      ? parseFloat(getArgValue(args, '--snapshot-threshold')!)
      : undefined,
    record: getArgValue(args, '--record'),
    recordFps: getArgValue(args, '--record-fps')
      ? parseInt(getArgValue(args, '--record-fps')!, 10)
      : undefined,
    windowSize: getArgValue(args, '--window-size'),
    cpuThrottle: getArgValue(args, '--cpu-throttle')
      ? parseFloat(getArgValue(args, '--cpu-throttle')!)
      : undefined,
    networkThrottle: getArgValue(args, '--network') as CLIArgs['networkThrottle'],
  }
}

// =============================================================================
// Help
// =============================================================================

function bold(text: string): string {
  return `\x1b[1m${text}\x1b[0m`
}

function printHelp(): void {
  console.log(`
${bold('Mirror Browser Test Runner')}

Runs browser-based suite tests for Mirror Studio via CDP.

${bold('Usage:')}
  npm run test:browser [-- options]
  npx tsx tools/test.ts [options]

${bold('Test Selection (one required):')}
  --category=NAME     Run specific category (see --list)
  --test="NAME"       Run a single test by exact name
  --filter=PATTERN    Filter tests by name pattern (regex)
  --all               Run ALL tests (long!)
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
  --os-mouse          Install the OS-mouse bridge (real macOS cursor via
                      nut-js). Optional — CDP trusted input works without
                      it. Requires Accessibility permission.
  --cpu-throttle=N    Slow CPU by Nx (CDP Emulation.setCPUThrottlingRate).
  --network=PROFILE   Network throttle: offline | slow-3g | fast-3g | 4g
  --window-size=WxH   Viewport size override.

${bold('Execution Options:')}
  --bail              Stop on first failure
  --retries=N         Retry failed tests N times (default: 0)
  --timeout=MS        Test timeout in milliseconds (default: 30000)
  --watch             Watch mode — rerun on file changes

${bold('Panel Options:')}
  --hide-panels=LIST  Hide specific panels (comma-separated)
  --panel-mode=MODE   Predefined modes: test|focus|normal|minimal

${bold('Output Options:')}
  --junit=PATH        Generate JUnit XML report
  --html=PATH         Generate HTML report
  --screenshot-dir=   Screenshot directory (default: test-results/screenshots)
  --no-screenshot     Disable screenshots on failure
  --quiet             Reduce output
  --silent            No output except errors
  --progress          Live progress bar
  --log=PATH          Log file (default: test-results/test-run.log)

${bold('Snapshots / Recording:')}
  --snapshot-dir=DIR        Pixel-diff baseline directory
  --snapshot-baseline=DIR   Baseline reference for comparison
  --snapshot-threshold=N    Threshold (0-1, default 0.01)
  --record=PATH             CDP screencast → WebM
  --record-fps=N            Frame rate (default 24)

${bold('Examples:')}
  npx tsx tools/test.ts --list
  npx tsx tools/test.ts --category=layout
  npx tsx tools/test.ts --test="Drop Avatar" --headed
  npx tsx tools/test.ts --filter="Button" --progress
  npx tsx tools/test.ts --all --progress
  npx tsx tools/test.ts --explore
`)
}

// =============================================================================
// Panel Configuration
// =============================================================================

const panelModePresets: Record<string, string[]> = {
  test: ['files', 'components', 'prompt', 'property'],
  focus: ['files', 'components', 'code', 'property', 'prompt'],
  minimal: ['files', 'components', 'code', 'prompt'],
  normal: [],
}

async function configurePanels(runner: TestRunner, args: CLIArgs): Promise<string[]> {
  let panelsToHide: string[] = []
  if (args.hidePanels) {
    panelsToHide = args.hidePanels.split(',').map(p => p.trim())
  } else if (args.panelMode && panelModePresets[args.panelMode]) {
    panelsToHide = panelModePresets[args.panelMode]
  } else if (args.category && categoryPanelPresets[args.category]) {
    panelsToHide = categoryPanelPresets[args.category]
  }
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
// Main
// =============================================================================

async function main(): Promise<void> {
  const args = parseArgs()

  if (args.help) {
    printHelp()
    process.exit(0)
  }

  if (args.list) {
    console.log(`\n${bold('Mirror Browser Test Categories')}\n`)
    console.log(`${bold('Main Categories:')}\n`)
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
    osMouse: args.osMouse,
  }
  if (args.snapshotDir) {
    config.snapshots = {
      dir: args.snapshotDir,
      ...(args.snapshotBaseline ? { baselineDir: args.snapshotBaseline } : {}),
      ...(typeof args.snapshotThreshold === 'number' ? { threshold: args.snapshotThreshold } : {}),
    }
  }
  if (typeof args.cpuThrottle === 'number') config.cpuThrottle = args.cpuThrottle
  if (args.networkThrottle) config.networkThrottle = args.networkThrottle
  if (args.windowSize) config.windowSize = args.windowSize

  const runner = new TestRunner(config)

  let progressReporter: ProgressReporter | null = null
  if (args.progress) {
    progressReporter = new ProgressReporter({ logFile: args.log })
    runner.addReporter(progressReporter)
    runner.onProgress(update => {
      progressReporter!.handleProgressUpdate(update)
    })
  } else {
    runner.addReporter(new ConsoleReporter({ verbose: args.verbose, silent: args.silent }))
  }
  if (args.junit) runner.addReporter(new JUnitReporter(args.junit))
  if (args.html) runner.addReporter(new HTMLReporter(args.html))

  // Optional video recording (separate path from suite tests).
  let recording: import('./recording').RecordingHandle | null = null

  try {
    await runner.start()
    await runner.navigate(args.url)

    const hasAPI = await runner.waitForTestAPI()
    if (!hasAPI) {
      console.error('❌ Test API not found. Is the Studio running?')
      process.exit(1)
    }
    const hasSuites = await runner.waitForTestSuites()
    if (!hasSuites) {
      const loadError = await runner.evaluate<string>(`window.__suitesLoadError || 'Unknown error'`)
      console.error('❌ Test suites not loaded. Error:', loadError)
      process.exit(1)
    }
    console.log('✅ Test API available\n')

    // Optional video recording.
    if (args.record) {
      const { startRecording } = await import('./recording')
      const cdp = (runner as unknown as { cdp: import('./types').CDPSession }).cdp
      recording = await startRecording(cdp, {
        outputPath: args.record,
        ...(args.recordFps !== undefined ? { fps: args.recordFps } : {}),
      })
      console.log(`🎥 Recording → ${args.record}`)
    }

    const panelsToHide = await configurePanels(runner, args)
    if (panelsToHide.length > 0) {
      console.log(`🔲 Hidden panels: ${panelsToHide.join(', ')}\n`)
    }

    if (args.newProject) {
      console.log('🆕 Injecting default tokens...')
      const success = await runner.evaluate<boolean>(`
        (() => {
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
            return true
          }
          return false
        })()
      `)
      if (success) {
        console.log('✅ Tokens injected')
        await runner.evaluate<void>(`window.studio?.events?.emit('compile:requested', {})`)
        await new Promise(resolve => setTimeout(resolve, 1000))
        console.log('✅ Recompiled')
        await runner.evaluate<void>(`
          (async () => {
            const preview = document.getElementById('preview')
            const el = preview?.querySelector('[data-mirror-id]')
            if (el) { el.click(); await new Promise(r => setTimeout(r, 300)) }
          })()
        `)
        console.log('✅ Element selected\n')
      } else {
        console.log('⚠️  Could not inject tokens\n')
      }
      if (!args.explore && !args.debugTokens) {
        const explorer = runner.getFileExplorer()
        await explorer.printReport()
        await runner.stop()
        process.exit(0)
      }
    }

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
        if (debug.tokens.length === 0) console.log('  ⚠️  No tokens matched!')
      } else {
        await explorer.printReport()
      }
      await runner.stop()
      process.exit(0)
    }

    const suites: TestSuite[] = []
    const hasTestSelection =
      args.test || args.category || args.filter || args.all || args.drag || args.mirror
    if (!hasTestSelection) {
      console.log('❌ No test selection specified.\n')
      console.log('Please specify one of:')
      console.log('  --category=NAME   Run a specific category')
      console.log('  --test="NAME"     Run a single test by name')
      console.log('  --filter=PATTERN  Filter tests by pattern')
      console.log('  --all             Run all tests')
      console.log('  --list            Show all categories\n')
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
        const categories = await runner.getCategories()
        const cat = categories.find(c => c.name === 'comprehensiveDrag')
        totalTests = cat?.count || 0
        suiteCount = 1
      } else if (args.filter) {
        suiteCount = 1
      } else {
        totalTests = await runner.getTotalTestCount()
        suiteCount = 1
      }
      if (totalTests > 0) progressReporter.setTotalTests(totalTests, suiteCount)
    }

    if (args.test) {
      console.log(`🎯 Running single test: "${args.test}"\n`)
      suites.push(await runner.runSingleTestByName(args.test))
    } else if (args.category) {
      console.log(`📁 Running category: ${args.category}\n`)
      suites.push(await runner.runMirrorTests(args.category))
    } else if (args.filter) {
      console.log(`🔍 Running filtered tests: "${args.filter}"\n`)
      suites.push(await runner.runMirrorTests(undefined, args.filter))
    } else if (args.all || args.drag || args.mirror) {
      const runMirror = args.all || args.mirror
      if (args.drag && !args.all) {
        console.log('📁 Running category: comprehensiveDrag\n')
        suites.push(await runner.runMirrorTests('comprehensiveDrag'))
      }
      if (runMirror) {
        suites.push(await runner.runMirrorTests())
      }
    }

    const summary = await runner.finalize(suites)
    if (recording) {
      await recording.stop()
      console.log(`🎥 Recorded → ${args.record}`)
    }
    process.exit(summary.totalFailed > 0 ? 1 : 0)
  } catch (err) {
    console.error('❌ Error:', err)
    if (recording) {
      try {
        await recording.stop()
      } catch {
        // ignore — primary error already logged
      }
    }
    process.exit(1)
  } finally {
    await runner.stop()
  }
}

main()
