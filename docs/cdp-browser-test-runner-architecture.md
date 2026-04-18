# CDP Browser Test Runner Architecture

> Ein wiederverwendbares Architektur-Pattern für In-Browser Testing via Chrome DevTools Protocol.

## Übersicht

Diese Architektur ermöglicht echte Browser-Tests ohne Playwright oder andere Test-Frameworks. Tests laufen **direkt im Browser** und werden über CDP (Chrome DevTools Protocol) orchestriert.

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLI (Node.js)                           │
│  ┌──────────┐  ┌──────────┐  ┌───────────┐  ┌───────────────┐  │
│  │  Chrome  │  │   CDP    │  │  Runner   │  │   Reporters   │  │
│  │ Launcher │──│  Client  │──│           │──│ Console/JUnit │  │
│  └──────────┘  └──────────┘  └───────────┘  └───────────────┘  │
└────────────────────────┬────────────────────────────────────────┘
                         │ WebSocket (CDP)
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                       Browser (Chrome)                          │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    Your Web App                          │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐  │   │
│  │  │   Test API  │  │   Tests     │  │  Test Suites    │  │   │
│  │  │  (window)   │  │ (TestCase)  │  │  (Categories)   │  │   │
│  │  └─────────────┘  └─────────────┘  └─────────────────┘  │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## Warum dieses Pattern?

| Aspekt             | Playwright/Puppeteer | CDP Browser Tests |
| ------------------ | -------------------- | ----------------- |
| **Test-Laufzeit**  | Node.js (extern)     | Browser (intern)  |
| **DOM-Zugriff**    | Via Serialisierung   | Direkt            |
| **Event-Handling** | Simuliert            | Echte Events      |
| **Timing**         | Oft flaky            | Natürlich         |
| **Debug**          | Schwierig            | Browser DevTools  |
| **Bundle Size**    | ~50MB+               | ~0 (nur CDP)      |

## Architektur-Komponenten

### 1. CLI Layer (Node.js)

```
tools/test-runner/
├── cli.ts              # Entry Point, Argument Parsing
├── runner.ts           # Test Orchestration
├── types.ts            # Shared Type Definitions
├── chrome.ts           # Chrome Process Management
├── cdp.ts              # CDP WebSocket Client
├── console-collector.ts # Browser Console Capture
├── screenshot.ts       # Failure Screenshots
└── reporters/
    ├── console.ts      # Terminal Output
    ├── junit.ts        # CI/CD Integration
    └── html.ts         # Visual Report
```

### 2. Browser Layer (In-App)

```
app/test-api/
├── index.ts            # API Setup & Registration
├── types.ts            # Test Types (TestCase, TestResult)
├── test-runner.ts      # In-Browser Test Execution
├── inspector.ts        # DOM Inspection Utilities
├── assertions.ts       # Assertion Helpers
├── interactions.ts     # Click, Type, Hover Simulation
├── fixtures.ts         # Test Data Management
└── suites/
    ├── index.ts        # Suite Registration
    ├── category-a/     # Test Files by Category
    └── category-b/
```

---

## Implementation Guide

### Step 1: Types definieren

```typescript
// types.ts
export interface TestResult {
  name: string
  passed: boolean
  duration: number
  error?: string
  screenshot?: string
  consoleErrors?: string[]
}

export interface TestSuite {
  name: string
  tests: TestResult[]
  passed: number
  failed: number
  duration: number
}

export interface TestCase {
  name: string
  /** Optional setup code (e.g., load fixture) */
  setup?: string
  /** Async test function */
  run: (api: TestAPI) => Promise<void>
  /** Skip this test */
  skip?: boolean
  /** Run only this test */
  only?: boolean
}

export interface CDPSession {
  send: <T>(method: string, params?: Record<string, unknown>) => Promise<T>
  on: (event: string, handler: (params: unknown) => void) => void
  off: (event: string, handler: (params: unknown) => void) => void
  close: () => void
}
```

### Step 2: Chrome Launcher

```typescript
// chrome.ts
import { spawn } from 'child_process'
import * as fs from 'fs'
import * as os from 'os'

const CHROME_PATHS = {
  darwin: ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'],
  linux: ['/usr/bin/google-chrome', '/usr/bin/chromium'],
  win32: ['C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'],
}

export async function launchChrome(options: { headless?: boolean }) {
  const chromePath = findChromePath()
  const userDataDir = fs.mkdtempSync(os.tmpdir() + '/chrome-test-')

  const args = [
    `--user-data-dir=${userDataDir}`,
    '--remote-debugging-port=0', // Random port
    '--no-first-run',
    '--disable-extensions',
    options.headless !== false ? '--headless=new' : '',
    'about:blank',
  ].filter(Boolean)

  const process = spawn(chromePath, args)
  const wsEndpoint = await waitForDevToolsEndpoint(process)

  return {
    wsEndpoint,
    kill: () => {
      process.kill()
      fs.rmSync(userDataDir, { recursive: true, force: true })
    },
  }
}

function waitForDevToolsEndpoint(process): Promise<string> {
  return new Promise((resolve, reject) => {
    process.stderr.on('data', data => {
      const match = data.toString().match(/DevTools listening on (ws:\/\/[^\s]+)/)
      if (match) resolve(match[1])
    })
  })
}
```

### Step 3: CDP Client

```typescript
// cdp.ts
import * as http from 'http'

export async function connectCDP(wsEndpoint: string): Promise<CDPSession> {
  const WebSocket = (await import('ws')).default
  const ws = new WebSocket(wsEndpoint)

  let messageId = 0
  const callbacks = new Map<number, { resolve; reject }>()
  const eventHandlers = new Map<string, Set<Function>>()

  ws.on('message', data => {
    const msg = JSON.parse(data.toString())

    // Response to command
    if (msg.id !== undefined && callbacks.has(msg.id)) {
      const cb = callbacks.get(msg.id)
      callbacks.delete(msg.id)
      msg.error ? cb.reject(new Error(msg.error.message)) : cb.resolve(msg.result)
    }

    // Event
    if (msg.method) {
      eventHandlers.get(msg.method)?.forEach(h => h(msg.params))
    }
  })

  return {
    send: (method, params = {}) =>
      new Promise((resolve, reject) => {
        const id = ++messageId
        callbacks.set(id, { resolve, reject })
        ws.send(JSON.stringify({ id, method, params }))
      }),
    on: (event, handler) => {
      if (!eventHandlers.has(event)) eventHandlers.set(event, new Set())
      eventHandlers.get(event).add(handler)
    },
    close: () => ws.close(),
  }
}

export async function getPageTarget(port: number): Promise<string> {
  const response = await httpGet(`http://127.0.0.1:${port}/json`)
  const targets = JSON.parse(response)
  return targets.find(t => t.type === 'page').webSocketDebuggerUrl
}
```

### Step 4: Test Runner (Node.js)

```typescript
// runner.ts
export class TestRunner {
  private cdp: CDPSession

  async start() {
    const chrome = await launchChrome({ headless: true })
    const wsUrl = await getPageTarget(new URL(chrome.wsEndpoint).port)
    this.cdp = await connectCDP(wsUrl)

    await this.cdp.send('Runtime.enable')
    await this.cdp.send('Page.enable')
  }

  async navigate(url: string) {
    await this.cdp.send('Page.navigate', { url })
    await this.waitForPageLoad()
  }

  async evaluate<T>(expression: string): Promise<T> {
    const result = await this.cdp.send<{
      result: { value: T }
      exceptionDetails?: { text: string }
    }>('Runtime.evaluate', {
      expression,
      awaitPromise: true,
      returnByValue: true,
    })

    if (result.exceptionDetails) {
      throw new Error(result.exceptionDetails.text)
    }
    return result.result.value
  }

  async runBrowserSuite(command: string, name: string): Promise<TestSuite> {
    // Execute test suite in browser, get results back
    const result = await this.evaluate<{
      passed: number
      failed: number
      results: Array<{ name: string; passed: boolean; duration: number; error?: string }>
    }>(command)

    return {
      name,
      tests: result.results,
      passed: result.passed,
      failed: result.failed,
      duration: result.results.reduce((sum, t) => sum + t.duration, 0),
    }
  }
}
```

### Step 5: Browser Test API

```typescript
// browser: test-api/index.ts
export interface TestAPI {
  // DOM Inspection
  inspect: (nodeId: string) => ElementInfo | null
  findByText: (text: string) => ElementInfo | null

  // Interactions
  click: (nodeId: string) => Promise<void>
  type: (nodeId: string, text: string) => Promise<void>
  hover: (nodeId: string) => Promise<void>

  // Assertions (chainable)
  expect: (nodeId: string) => ElementAssert

  // Utilities
  delay: (ms: number) => Promise<void>
  waitForElement: (nodeId: string, timeout?: number) => Promise<HTMLElement>
}

class TestRunner {
  async runSuite(name: string, tests: TestCase[]): Promise<TestSuiteResult> {
    const results: TestResult[] = []
    let passed = 0,
      failed = 0

    for (const test of tests) {
      if (test.skip) continue

      const start = Date.now()
      try {
        // Setup (e.g., load fixture code)
        if (test.setup) {
          await this.loadCode(test.setup)
        }

        // Run test
        await test.run(this.api)

        results.push({ name: test.name, passed: true, duration: Date.now() - start })
        passed++
      } catch (error) {
        results.push({
          name: test.name,
          passed: false,
          duration: Date.now() - start,
          error: error.message,
        })
        failed++
      }
    }

    return { name, tests: results, passed, failed, duration: Date.now() - suiteStart }
  }
}

// Register on window for CDP access
window.__testAPI = createTestAPI()
window.__testSuites = {
  runAll: () => runner.runSuite('All Tests', allTests),
  runCategory: cat => runner.runSuite(cat, testsByCategory[cat]),
}
```

### Step 6: Test Definition Pattern

```typescript
// browser: test-api/suites/buttons.test.ts
import type { TestCase, TestAPI } from '../types'
import { test, testWithSetup, describe } from '../test-runner'

export const buttonTests: TestCase[] = describe('Buttons', [
  // Simple test
  test('Button renders with text', async (api: TestAPI) => {
    api.expect('node-1').exists()
    api.expect('node-1').hasText('Click me')
  }),

  // Test with fixture/setup code
  testWithSetup(
    'Button click changes state',
    'Button "Click", toggle()', // Setup code loaded into editor
    async (api: TestAPI) => {
      await api.click('node-1')
      api.expect('node-1').hasClass('on')
    }
  ),

  // Async operations
  test('Button hover shows tooltip', async (api: TestAPI) => {
    await api.hover('node-1')
    await api.delay(300) // Wait for tooltip animation
    api.expect('tooltip-1').isVisible()
  }),
])
```

### Step 7: Reporter Pattern

```typescript
// reporters/console.ts
export interface Reporter {
  onSuiteStart(suite: string): void
  onTestPass(result: TestResult): void
  onTestFail(result: TestResult): void
  onRunEnd(summary: TestRunSummary): Promise<void>
}

export class ConsoleReporter implements Reporter {
  onTestPass(result: TestResult) {
    console.log(`  ✅ ${result.name} (${result.duration}ms)`)
  }

  onTestFail(result: TestResult) {
    console.log(`  ❌ ${result.name}`)
    console.log(`     Error: ${result.error}`)
  }

  async onRunEnd(summary: TestRunSummary) {
    console.log(`\nResults: ${summary.totalPassed} passed, ${summary.totalFailed} failed`)
  }
}
```

---

## CLI Design

```bash
# Basic usage
npm run test:browser                    # Default suite
npm run test:browser -- --headed        # Visible browser
npm run test:browser -- --category=ui   # Specific category
npm run test:browser -- --filter="btn"  # Filter by name
npm run test:browser -- --test="exact"  # Single test

# Reporting
npm run test:browser -- --junit=report.xml
npm run test:browser -- --html=report.html

# Debugging
npm run test:browser -- --headed --bail
```

---

## Key Patterns

### 1. Bidirektionale Kommunikation

```
CLI (Node.js)                    Browser
     │                              │
     │──── evaluate(expression) ────▶│  Execute JS
     │◀─── { result }  ─────────────│  Return value
     │                              │
     │──── Runtime.evaluate ────────▶│  Run test suite
     │◀─── TestResults[] ───────────│  Serialized results
```

### 2. Test Isolation

```typescript
// Each test gets fresh state
async function runTest(test: TestCase) {
  await reset() // Clear state
  if (test.setup) {
    await loadCode(test.setup) // Load fixture
    await waitForCompile()
  }
  await test.run(api) // Execute test
}
```

### 3. Assertion Chaining

```typescript
// Fluent API for readability
api.expect('node-1').exists().hasText('Hello').hasStyle('color', 'red').hasChildren(3)
```

### 4. Wait Utilities

```typescript
// Robust waiting instead of arbitrary delays
await api.waitForElement('node-1', 2000)
await api.waitForCompile()
await api.waitForIdle() // RAF + microtask flush
```

---

## Vorteile dieser Architektur

1. **Echte Browser-Umgebung** - Keine Simulation, echte DOM APIs
2. **Schnell** - Keine Serialisierung-Overhead für jeden Befehl
3. **Debuggbar** - Tests in Browser DevTools inspizieren
4. **Minimal** - Kein großes Test-Framework nötig
5. **Flexibel** - Beliebige Assertions und Helpers möglich
6. **CI-Ready** - Headless Chrome, JUnit Reports

## Nachteile / Einschränkungen

1. **Chrome-only** - Keine Cross-Browser Tests (aber: das ist selten wirklich nötig)
2. **Setup-Aufwand** - Initiale Architektur muss gebaut werden
3. **Keine Parallelisierung** - Ein Browser = ein Test (lösbar mit mehreren Instanzen)

---

## Checkliste für neue Projekte

- [ ] `tools/test-runner/` Verzeichnis mit CLI Layer
- [ ] `app/test-api/` Verzeichnis mit Browser Layer
- [ ] Chrome Launcher mit Platform-Detection
- [ ] CDP Client mit WebSocket Connection
- [ ] Test Runner mit `evaluate()` Bridge
- [ ] Browser Test API auf `window` registriert
- [ ] Mindestens ein Reporter (Console)
- [ ] npm Scripts für `test:browser`
- [ ] Test Fixtures / Setup Pattern
- [ ] Assertion Helpers für dein DOM

---

## Referenz-Implementierung

Siehe dieses Projekt:

- `tools/test-runner/` - Vollständige CLI Implementation
- `studio/test-api/` - Vollständige Browser Test API
- `studio/test-api/suites/` - 325+ Beispiel-Tests
