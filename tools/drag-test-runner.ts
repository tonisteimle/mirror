#!/usr/bin/env npx tsx
/**
 * Drag & Drop Browser Test Runner
 *
 * Ersetzt Playwright für Drag & Drop Tests.
 * Verwendet Chrome DevTools Protocol (CDP) direkt.
 *
 * Usage:
 *   npx tsx tools/drag-test-runner.ts
 *   npx tsx tools/drag-test-runner.ts --headed
 *   npx tsx tools/drag-test-runner.ts --url http://localhost:5173/studio/
 */

import { spawn, ChildProcess } from 'child_process'
import * as http from 'http'
import * as https from 'https'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'

// =============================================================================
// Types
// =============================================================================

interface CDPSession {
  send: (method: string, params?: Record<string, unknown>) => Promise<unknown>
  on: (event: string, handler: (params: unknown) => void) => void
  close: () => void
}

interface TestResult {
  name: string
  success: boolean
  duration: number
  error?: string
  codeChange?: {
    before: string
    after: string
  }
}

interface TestSuite {
  name: string
  tests: TestResult[]
  passed: number
  failed: number
  duration: number
}

// =============================================================================
// Chrome Launcher
// =============================================================================

function findChrome(): string {
  const paths = {
    darwin: [
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Chromium.app/Contents/MacOS/Chromium',
    ],
    linux: ['/usr/bin/google-chrome', '/usr/bin/chromium-browser', '/usr/bin/chromium'],
    win32: [
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    ],
  }

  const platform = os.platform() as keyof typeof paths
  const candidates = paths[platform] || []

  for (const p of candidates) {
    if (fs.existsSync(p)) {
      return p
    }
  }

  throw new Error('Chrome not found. Please install Google Chrome.')
}

async function launchChrome(options: {
  headless?: boolean
  userDataDir?: string
}): Promise<{ process: ChildProcess; wsEndpoint: string }> {
  const chromePath = findChrome()
  const userDataDir = options.userDataDir || fs.mkdtempSync(path.join(os.tmpdir(), 'chrome-test-'))

  const args = [
    `--user-data-dir=${userDataDir}`,
    '--remote-debugging-port=0', // Random port
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-background-networking',
    '--disable-sync',
    '--disable-translate',
    '--metrics-recording-only',
    '--safebrowsing-disable-auto-update',
    options.headless !== false ? '--headless=new' : '',
    'about:blank',
  ].filter(Boolean)

  const chromeProcess = spawn(chromePath, args, {
    stdio: ['pipe', 'pipe', 'pipe'],
  })

  // Wait for DevTools WebSocket URL
  const wsEndpoint = await new Promise<string>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Chrome launch timeout')), 30000)

    chromeProcess.stderr?.on('data', (data: Buffer) => {
      const output = data.toString()
      const match = output.match(/DevTools listening on (ws:\/\/[^\s]+)/)
      if (match) {
        clearTimeout(timeout)
        resolve(match[1])
      }
    })

    chromeProcess.on('error', err => {
      clearTimeout(timeout)
      reject(err)
    })

    chromeProcess.on('exit', code => {
      clearTimeout(timeout)
      reject(new Error(`Chrome exited with code ${code}`))
    })
  })

  return { process: chromeProcess, wsEndpoint }
}

// =============================================================================
// CDP Client (minimal WebSocket implementation)
// =============================================================================

async function connectCDP(wsEndpoint: string): Promise<CDPSession> {
  // Dynamic import for ws module
  const WebSocket = (await import('ws')).default

  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsEndpoint)
    let messageId = 0
    const callbacks = new Map<
      number,
      { resolve: (v: unknown) => void; reject: (e: Error) => void }
    >()
    const eventHandlers = new Map<string, ((params: unknown) => void)[]>()

    ws.on('open', () => {
      const session: CDPSession = {
        send: (method, params = {}) => {
          return new Promise((res, rej) => {
            const id = ++messageId
            callbacks.set(id, { resolve: res, reject: rej })
            ws.send(JSON.stringify({ id, method, params }))
          })
        },
        on: (event, handler) => {
          if (!eventHandlers.has(event)) {
            eventHandlers.set(event, [])
          }
          eventHandlers.get(event)!.push(handler)
        },
        close: () => ws.close(),
      }
      resolve(session)
    })

    ws.on('message', (data: Buffer) => {
      const msg = JSON.parse(data.toString())

      if (msg.id && callbacks.has(msg.id)) {
        const cb = callbacks.get(msg.id)!
        callbacks.delete(msg.id)
        if (msg.error) {
          cb.reject(new Error(msg.error.message))
        } else {
          cb.resolve(msg.result)
        }
      } else if (msg.method) {
        const handlers = eventHandlers.get(msg.method) || []
        for (const handler of handlers) {
          handler(msg.params)
        }
      }
    })

    ws.on('error', reject)
  })
}

// =============================================================================
// Test Runner
// =============================================================================

class DragTestRunner {
  private chrome: ChildProcess | null = null
  private cdp: CDPSession | null = null
  private consoleMessages: string[] = []

  async start(options: { headless?: boolean } = {}): Promise<void> {
    console.log('🚀 Starting Chrome...')
    const { process, wsEndpoint } = await launchChrome({ headless: options.headless })
    this.chrome = process

    // Get browser target
    const response = await this.httpGet(`http://127.0.0.1:${new URL(wsEndpoint).port}/json`)
    const targets = JSON.parse(response)
    const pageTarget = targets.find((t: { type: string }) => t.type === 'page')

    if (!pageTarget) {
      throw new Error('No page target found')
    }

    console.log('🔌 Connecting to CDP...')
    this.cdp = await connectCDP(pageTarget.webSocketDebuggerUrl)

    // Enable necessary domains
    await this.cdp.send('Runtime.enable')
    await this.cdp.send('Page.enable')
    await this.cdp.send('Console.enable')

    // Capture console messages (legacy Console domain)
    this.cdp.on('Console.messageAdded', (params: unknown) => {
      const msg = params as { message: { text: string } }
      this.consoleMessages.push(msg.message.text)
    })

    // Capture console.log/warn/error via Runtime domain
    this.cdp.on('Runtime.consoleAPICalled', (params: unknown) => {
      const { type, args } = params as {
        type: string
        args: { value?: string; description?: string }[]
      }
      const text = args.map(a => a.value ?? a.description ?? '').join(' ')
      // Print debug logs for drag testing
      if (
        text.includes('[BrowserTest]') ||
        text.includes('[DragPreview]') ||
        text.includes('[Drag v3]') ||
        text.includes('[DragController]') ||
        text.includes('[DropAdapter]') ||
        text.includes('[DropResultApplier]') ||
        text.includes('[Test]')
      ) {
        console.log(`  [BROWSER] ${text}`)
      }
      // Print all errors
      if (type === 'error' || type === 'warning') {
        console.log(`  [BROWSER ${type.toUpperCase()}] ${text}`)
      }
      this.consoleMessages.push(text)
    })

    console.log('✅ Chrome ready')
  }

  async navigate(url: string): Promise<void> {
    if (!this.cdp) throw new Error('Not connected')

    console.log(`📄 Loading ${url}...`)
    await this.cdp.send('Page.navigate', { url })

    // Wait for load
    await new Promise<void>(resolve => {
      const handler = () => {
        resolve()
      }
      this.cdp!.on('Page.loadEventFired', handler)
    })

    // Extra wait for JS initialization
    await this.sleep(1000)
    console.log('✅ Page loaded')
  }

  async evaluate<T>(expression: string): Promise<T> {
    if (!this.cdp) throw new Error('Not connected')

    const result = (await this.cdp.send('Runtime.evaluate', {
      expression,
      awaitPromise: true,
      returnByValue: true,
    })) as { result: { value: T }; exceptionDetails?: { text: string } }

    if (result.exceptionDetails) {
      throw new Error(result.exceptionDetails.text)
    }

    return result.result.value
  }

  async waitForTestAPI(timeout = 10000): Promise<boolean> {
    const start = Date.now()
    while (Date.now() - start < timeout) {
      const hasAPI = await this.evaluate<boolean>(`typeof window.__dragTest !== 'undefined'`)
      if (hasAPI) return true
      await this.sleep(200)
    }
    return false
  }

  /**
   * Setup Studio for testing (hide unnecessary panels, set initial code)
   */
  async setupStudio(code: string): Promise<void> {
    // Enter test mode (editor + preview only)
    await this.evaluate(`__dragTest.testMode()`)

    // Set initial code using setTestCode which resets preludeOffset
    await this.evaluate(`__dragTest.setTestCode(${JSON.stringify(code)})`)

    await this.sleep(200)
  }

  /**
   * Get current snapshot from Studio
   */
  async getSnapshot(): Promise<{ code: string; nodeIds: string[]; selection: string | null }> {
    return this.evaluate(`__dragTest.snapshot()`)
  }

  /**
   * Reset Studio to normal mode
   */
  async resetStudio(): Promise<void> {
    await this.evaluate(`__dragTest.normalMode()`)
  }

  /**
   * Run comprehensive real drag tests
   */
  async runRealDragTests(): Promise<TestSuite> {
    console.log('\n🧪 Running Real Drag & Drop Tests...\n')

    const suite: TestSuite = {
      name: 'Real Drag & Drop Tests',
      tests: [],
      passed: 0,
      failed: 0,
      duration: 0,
    }

    const startTime = Date.now()

    try {
      // Run the comprehensive drag tests from the browser API
      const result = await this.evaluate<{
        passed: number
        failed: number
        results: Array<{
          name: string
          passed: boolean
          codeBefore: string
          codeAfter: string
          verification: { match: boolean; diff: string; message: string }
          debugInfo: { preludeOffset: number; nodeCount: number; targetFound: boolean }
          error?: string
          duration: number
        }>
        summary: string
      }>(`__dragTest.runDragTests()`)

      suite.passed = result.passed
      suite.failed = result.failed

      for (const r of result.results) {
        suite.tests.push({
          name: r.name,
          success: r.passed,
          duration: r.duration,
          error: r.error,
          codeChange: {
            before: r.codeBefore,
            after: r.codeAfter,
          },
        })

        if (r.passed) {
          console.log(`  ✅ ${r.name} (${r.duration.toFixed(0)}ms)`)
        } else {
          console.log(`  ❌ ${r.name}: ${r.error || 'Unknown error'}`)
          console.log(
            `     Debug: prelude=${r.debugInfo.preludeOffset}, nodes=${r.debugInfo.nodeCount}`
          )
          if (r.verification.diff && r.verification.diff !== '(no changes)') {
            console.log(
              `     Diff:\n${r.verification.diff
                .split('\n')
                .map((l: string) => '       ' + l)
                .join('\n')}`
            )
          }
        }
      }

      console.log(`\n${result.summary}`)
    } catch (err) {
      console.log(`  ❌ Test suite error: ${err}`)
      suite.failed = 1
    }

    suite.duration = Date.now() - startTime
    return suite
  }

  async runTests(): Promise<TestSuite> {
    console.log('\n🧪 Running Mirror Studio Drag & Drop Tests...\n')

    const suite: TestSuite = {
      name: 'Mirror Studio Drag & Drop Tests',
      tests: [],
      passed: 0,
      failed: 0,
      duration: 0,
    }

    const startTime = Date.now()

    // Define comprehensive test cases
    // Uses both real drag operations and direct insertion for reliability
    const testCases = [
      // === Setup ===
      {
        name: 'Setup: Enter test mode and set code',
        run: `(async () => {
          __dragTest.testMode();
          await __dragTest.setTestCode('Frame gap 12, pad 16, bg #1a1a1a');
          const nodes = __dragTest.getNodeIds();
          return { success: nodes.length > 0, description: 'Test mode activated', codeAfter: __dragTest.getCode() };
        })()`,
      },

      // === Real Drag Tests ===
      {
        name: 'Real Drag: Button into Frame',
        run: `(async () => {
          // Re-set code with setTestCode to ensure prelude is reset
          await __dragTest.setTestCode('Frame gap 12, pad 16, bg #1a1a1a');
          const result = await __dragTest.executeRealDrag({
            componentName: 'Button',
            targetNodeId: 'node-1',
            insertionIndex: 0,
            expectedPattern: 'Button'
          });
          return {
            success: result.success,
            error: result.error,
            codeBefore: result.codeBefore,
            codeAfter: result.codeAfter,
            debugInfo: result.debugInfo
          };
        })()`,
        verify: (code: string) => code.includes('Button'),
      },

      // === Fallback: Direct Code Insertion Tests (if real drag fails) ===
      {
        name: 'Setup: Fresh Frame for insertion tests',
        run: `(async () => {
          await __dragTest.setTestCode('Frame gap 12, pad 16, bg #1a1a1a');
          return { success: true };
        })()`,
      },
      {
        name: 'Insert Button via code',
        run: `(async () => {
          const result = await __dragTest.simulateDropByInsertion({
            componentCode: 'Button "Click me"',
            afterLine: 1,
            indent: 1
          });
          return result;
        })()`,
        verify: (code: string) => code.includes('Button "Click me"'),
      },
      {
        name: 'Insert Text via code',
        run: `(async () => {
          const result = await __dragTest.simulateDropByInsertion({
            componentCode: 'Text "Hello World"',
            afterLine: 2,
            indent: 1
          });
          return result;
        })()`,
        verify: (code: string) => code.includes('Text "Hello World"'),
      },
      {
        name: 'Insert Icon via code',
        run: `(async () => {
          const result = await __dragTest.simulateDropByInsertion({
            componentCode: 'Icon "star", ic #f59e0b',
            afterLine: 3,
            indent: 1
          });
          return result;
        })()`,
        verify: (code: string) => code.includes('Icon "star"'),
      },

      // === Nested Container Test ===
      {
        name: 'Setup: Create nested containers',
        run: `(async () => {
          await __dragTest.setTestCode('Frame gap 16, pad 16, bg #1a1a1a\\n  Frame gap 8, bg #2a2a3a, pad 12\\n    Text "Inner"');
          return { success: true, codeAfter: __dragTest.getCode() };
        })()`,
      },
      {
        name: 'Insert into nested container',
        run: `(async () => {
          const result = await __dragTest.simulateDropByInsertion({
            componentCode: 'Button "Nested"',
            afterLine: 3,
            indent: 2
          });
          return result;
        })()`,
        verify: (code: string) => code.includes('Button "Nested"'),
      },

      // === Selection Tests ===
      {
        name: 'Select node and verify',
        run: `(async () => {
          const nodes = __dragTest.getNodeIds();
          if (nodes.length < 2) return { success: false, error: 'Not enough nodes' };
          __dragTest.selectNode(nodes[1]);
          await new Promise(r => setTimeout(r, 100));
          const selection = __dragTest.getSelection();
          return { success: selection === nodes[1], description: 'Selection test' };
        })()`,
      },

      // === Panel Control Tests ===
      {
        name: 'Toggle focus mode',
        run: `(async () => {
          __dragTest.focusMode();
          await new Promise(r => setTimeout(r, 100));
          __dragTest.testMode();
          return { success: true, description: 'Panel control works' };
        })()`,
      },

      // === Snapshot Test ===
      {
        name: 'Snapshot captures state',
        run: `(async () => {
          const snap = __dragTest.snapshot();
          const hasNodes = snap.nodeIds.length >= 2;
          const hasCode = snap.code.length > 0;
          return { success: hasNodes && hasCode, description: 'Snapshot test', codeAfter: snap.code };
        })()`,
      },

      // === Cleanup ===
      {
        name: 'Cleanup: Restore normal mode',
        run: `(async () => {
          __dragTest.normalMode();
          return { success: true, description: 'Normal mode restored' };
        })()`,
      },
    ]

    for (const test of testCases) {
      const testStart = Date.now()
      try {
        const result = await this.evaluate<{
          success: boolean
          error?: string
          description?: string
          codeBefore?: string
          codeAfter?: string
        }>(`(async () => ${test.run})()`)

        // Additional verification if provided
        let verified = true
        if (test.verify && result.success) {
          const currentCode = await this.evaluate<string>(`__dragTest.getCode()`)
          verified = test.verify(currentCode)
          if (!verified) {
            result.success = false
            result.error = 'Verification failed: expected code pattern not found'
          }
        }

        const testResult: TestResult = {
          name: test.name,
          success: result.success,
          duration: Date.now() - testStart,
          error: result.error,
          codeChange: result.codeBefore
            ? {
                before: result.codeBefore,
                after: result.codeAfter || '',
              }
            : undefined,
        }

        suite.tests.push(testResult)

        if (result.success) {
          suite.passed++
          console.log(`  ✅ ${test.name} (${testResult.duration}ms)`)
        } else {
          suite.failed++
          console.log(`  ❌ ${test.name}: ${result.error}`)
        }
      } catch (err) {
        suite.failed++
        const testResult: TestResult = {
          name: test.name,
          success: false,
          duration: Date.now() - testStart,
          error: String(err),
        }
        suite.tests.push(testResult)
        console.log(`  ❌ ${test.name}: ${err}`)
      }
    }

    suite.duration = Date.now() - startTime
    return suite
  }

  async stop(): Promise<void> {
    console.log('\n🛑 Stopping Chrome...')
    this.cdp?.close()
    this.chrome?.kill()
  }

  private httpGet(url: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const client = url.startsWith('https') ? https : http
      client
        .get(url, res => {
          let data = ''
          res.on('data', chunk => (data += chunk))
          res.on('end', () => resolve(data))
        })
        .on('error', reject)
    })
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

// =============================================================================
// Main
// =============================================================================

async function main() {
  const args = process.argv.slice(2)

  // Help
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Drag & Drop Browser Test Runner

Usage:
  npx tsx tools/drag-test-runner.ts [options]

Options:
  --headed       Run Chrome in headed mode (visible window)
  --real         Run only real drag tests (with verification)
  --url=URL      Custom Studio URL (default: http://localhost:5173/studio/)
  --help, -h     Show this help message

Examples:
  npx tsx tools/drag-test-runner.ts                    # Run all tests headless
  npx tsx tools/drag-test-runner.ts --headed           # Run with visible browser
  npx tsx tools/drag-test-runner.ts --real --headed    # Run real drag tests with verification
`)
    process.exit(0)
  }

  const headed = args.includes('--headed')
  const realOnly = args.includes('--real')
  const urlArg = args.find(a => a.startsWith('--url='))
  const url = urlArg ? urlArg.split('=')[1] : 'http://localhost:5173/studio/'

  const runner = new DragTestRunner()

  try {
    await runner.start({ headless: !headed })
    await runner.navigate(url)

    // Check if test API is available
    const hasAPI = await runner.waitForTestAPI()
    if (!hasAPI) {
      console.error('❌ __dragTest API not found. Is the Studio properly loaded?')
      process.exit(1)
    }

    console.log('✅ __dragTest API available')

    // Run tests
    let results: TestSuite
    if (realOnly) {
      results = await runner.runRealDragTests()
    } else {
      results = await runner.runTests()
    }

    // Summary
    console.log('\n' + '='.repeat(50))
    console.log(`Results: ${results.passed} passed, ${results.failed} failed`)
    console.log(`Duration: ${results.duration}ms`)
    console.log('='.repeat(50))

    process.exit(results.failed > 0 ? 1 : 0)
  } catch (err) {
    console.error('❌ Error:', err)
    process.exit(1)
  } finally {
    await runner.stop()
  }
}

main()
