/**
 * Functional eval — semantic check beyond pixel-diff.
 *
 * Pixel-diff says "does it look right". This module says "does it
 * MEAN the same thing": the headings exist, the form fields are
 * there, key data values render, actionable buttons are present.
 *
 * Two pages can pixel-match at 100% with totally different DOM —
 * <button> vs <div onclick>, semantic <article> vs decorative
 * <div>. Pixel-diff misses that. Functional checks catch it.
 *
 * Spec format is intentionally data-driven (not code), so per-
 * project specs read like a checklist of contractual claims:
 *
 *   { type: 'expectText', text: 'Booking Details' }
 *   { type: 'expectSelector', selector: 'input[type="date"]' }
 *
 * Each step is independent — we don't stop on the first miss, the
 * value is the histogram of passes/fails. The runner reports a
 * score (passed / total).
 *
 * Limitations: this is "DOM presence" testing, not interaction
 * testing. Click-handlers, form submission, state machines are
 * out of scope for now — they require framework-specific build
 * + JS execution which we already verified happens via the
 * pixel-diff baseline (if the build step failed, verify would
 * have surfaced it).
 */

import { existsSync, statSync, createReadStream } from 'node:fs'
import { extname, join, resolve } from 'node:path'
import { createServer, type Server } from 'node:http'
import { launchChrome } from '../tools/test-runner/chrome'
import { connectCDP, getPageTarget } from '../tools/test-runner/cdp'
import type { CDPSession } from '../tools/test-runner/types'

// ---------------------------------------------------------------------------
// Spec types
// ---------------------------------------------------------------------------

export type FuncStep =
  | { type: 'expectText'; text: string }
  | { type: 'expectNoText'; text: string }
  | { type: 'expectSelector'; selector: string }
  | { type: 'expectSelectorCount'; selector: string; min?: number; max?: number }
  | { type: 'expectAttribute'; selector: string; name: string; value: string }

export interface NamedStep {
  name: string
  step: FuncStep
}

export interface FuncSpec {
  project: string
  steps: NamedStep[]
}

export interface StepResult {
  name: string
  passed: boolean
  reason?: string
}

export interface FunctionalResult {
  project: string
  passed: number
  total: number
  details: StepResult[]
}

// ---------------------------------------------------------------------------
// Project specs (data-driven contracts)
// ---------------------------------------------------------------------------
//
// For each example we pick a handful of MEANING-bearing claims that
// the generated code must preserve. These are written project-by-
// project because the meaning is project-specific.

const SPEC_HOTEL: FuncSpec = {
  project: 'hotel-checkin',
  steps: [
    {
      name: 'has main title or section "Booking Details"',
      step: { type: 'expectText', text: 'Booking Details' },
    },
    {
      name: 'has section "Guest Information"',
      step: { type: 'expectText', text: 'Guest Information' },
    },
    {
      name: 'has section "Room Assignment"',
      step: { type: 'expectText', text: 'Room Assignment' },
    },
    {
      name: 'has section "Additional Services"',
      step: { type: 'expectText', text: 'Additional Services' },
    },
    {
      name: 'shows confirmation code BK-2024-78432',
      step: { type: 'expectText', text: 'BK-2024-78432' },
    },
    { name: 'shows room number 412', step: { type: 'expectText', text: 'Room 412' } },
    {
      name: 'has at least one date input',
      step: { type: 'expectSelectorCount', selector: 'input[type="date"]', min: 1 },
    },
    {
      name: 'has at least one text-like input',
      step: {
        type: 'expectSelectorCount',
        selector: 'input:not([type="date"]):not([type="checkbox"])',
        min: 1,
      },
    },
    {
      name: 'has 4 guest-count buttons',
      step: { type: 'expectSelectorCount', selector: 'button', min: 4 },
    },
    {
      name: 'has 4 checkbox inputs (services)',
      step: { type: 'expectSelectorCount', selector: 'input[type="checkbox"]', min: 4 },
    },
    {
      name: 'has primary action "Complete Check-in"',
      step: { type: 'expectText', text: 'Complete Check-in' },
    },
    {
      name: 'shows "Breakfast included" service',
      step: { type: 'expectText', text: 'Breakfast included' },
    },
    {
      name: 'no Mirror-DSL leakage (no "$accent" tokens visible)',
      step: { type: 'expectNoText', text: '$accent' },
    },
    {
      name: 'no raw component-name leakage ("PrimaryBtn" should not appear as text)',
      step: { type: 'expectNoText', text: 'PrimaryBtn' },
    },
  ],
}

const SPEC_PERSONAS: FuncSpec = {
  project: 'personas-informatik',
  steps: [
    // The example renders 5 personas with prose-mode headings & content.
    {
      name: 'renders at least one H2 (persona heading)',
      step: { type: 'expectSelectorCount', selector: 'h2', min: 1 },
    },
    {
      name: 'renders at least 5 second-level structures (5 personas)',
      step: { type: 'expectSelectorCount', selector: 'h2,h3,article,section', min: 5 },
    },
    {
      name: 'has bullet lists (DashItem prose mapping)',
      step: { type: 'expectSelectorCount', selector: 'ul li, .dash-item, [class*="dash"]', min: 1 },
    },
    {
      name: 'no leftover prose markup (no literal "##")',
      step: { type: 'expectNoText', text: '##' },
    },
    { name: 'no raw token names visible', step: { type: 'expectNoText', text: '$primary' } },
  ],
}

const SPEC_TASK_APP: FuncSpec = {
  project: 'task-app',
  steps: [
    // Task-app = 5 screens. The agent typically generates a router or
    // separate pages. We don't dictate router shape, just expect the
    // screens to be reachable and named.
    {
      name: 'has at least one navigation element',
      step: { type: 'expectSelectorCount', selector: 'nav, [role="navigation"], aside', min: 1 },
    },
    { name: 'mentions "Dashboard" somewhere', step: { type: 'expectText', text: 'Dashboard' } },
    { name: 'mentions "Tasks" somewhere', step: { type: 'expectText', text: 'Tasks' } },
    { name: 'mentions "Projects" somewhere', step: { type: 'expectText', text: 'Projects' } },
    { name: 'no leftover Mirror-DSL syntax', step: { type: 'expectNoText', text: 'each ' } },
    { name: 'no raw component leakage', step: { type: 'expectNoText', text: 'TaskCard' } },
  ],
}

const SPECS: Record<string, FuncSpec> = {
  'hotel-checkin': SPEC_HOTEL,
  'personas-informatik': SPEC_PERSONAS,
  'task-app': SPEC_TASK_APP,
}

export function getSpec(project: string): FuncSpec | undefined {
  return SPECS[project]
}

// ---------------------------------------------------------------------------
// Pure step evaluator (unit-testable)
// ---------------------------------------------------------------------------
//
// `evalStep` takes a step + a snapshot of the page (text + DOM-query
// results) and returns pass/fail + reason. We do this in TS rather
// than in-page eval where possible so the *judgement* logic is
// testable without a browser.

export interface PageSnapshot {
  bodyText: string
  selectorCounts: Record<string, number>
  selectorAttributes: Record<string, Array<Record<string, string>>>
}

export function evalStep(step: FuncStep, snap: PageSnapshot): StepResult {
  const ok = (): StepResult => ({ name: '', passed: true })
  const fail = (reason: string): StepResult => ({ name: '', passed: false, reason })
  switch (step.type) {
    case 'expectText':
      return snap.bodyText.includes(step.text) ? ok() : fail(`text not found: "${step.text}"`)
    case 'expectNoText':
      return !snap.bodyText.includes(step.text)
        ? ok()
        : fail(`unexpected text present: "${step.text}"`)
    case 'expectSelector': {
      const c = snap.selectorCounts[step.selector] ?? 0
      return c >= 1 ? ok() : fail(`selector matched 0 elements: ${step.selector}`)
    }
    case 'expectSelectorCount': {
      const c = snap.selectorCounts[step.selector] ?? 0
      const min = step.min ?? 0
      const max = step.max ?? Number.POSITIVE_INFINITY
      if (c < min) return fail(`${step.selector}: ${c} < ${min}`)
      if (c > max) return fail(`${step.selector}: ${c} > ${max}`)
      return ok()
    }
    case 'expectAttribute': {
      const matches = snap.selectorAttributes[step.selector] ?? []
      if (matches.length === 0) return fail(`selector matched 0: ${step.selector}`)
      const found = matches.some(attrs => attrs[step.name] === step.value)
      return found ? ok() : fail(`${step.selector}[${step.name}!="${step.value}"]`)
    }
  }
}

export function evalSpec(spec: FuncSpec, snap: PageSnapshot): FunctionalResult {
  const details: StepResult[] = spec.steps.map(s => {
    const r = evalStep(s.step, snap)
    return { ...r, name: s.name }
  })
  return {
    project: spec.project,
    passed: details.filter(d => d.passed).length,
    total: details.length,
    details,
  }
}

// ---------------------------------------------------------------------------
// Static server (lifted from tools/verify.ts pattern)
// ---------------------------------------------------------------------------

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.map': 'application/json; charset=utf-8',
}

interface ServeHandle {
  url: string
  close: () => void
}

function startStaticServer(rootDir: string): Promise<ServeHandle> {
  return new Promise((resolvePromise, reject) => {
    const server: Server = createServer((req, response) => {
      try {
        let urlPath = (req.url || '/').split('?')[0]
        if (urlPath.endsWith('/')) urlPath += 'index.html'
        const filePath = join(rootDir, decodeURIComponent(urlPath))
        if (!filePath.startsWith(rootDir)) {
          response.writeHead(403)
          response.end('forbidden')
          return
        }
        if (!existsSync(filePath) || statSync(filePath).isDirectory()) {
          response.writeHead(404)
          response.end('not found')
          return
        }
        const ext = extname(filePath).toLowerCase()
        const mime = MIME_TYPES[ext] || 'application/octet-stream'
        response.writeHead(200, { 'Content-Type': mime })
        createReadStream(filePath).pipe(response)
      } catch (err) {
        response.writeHead(500)
        response.end(String(err))
      }
    })
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address()
      const port = typeof addr === 'object' && addr ? addr.port : 0
      resolvePromise({ url: `http://127.0.0.1:${port}/`, close: () => server.close() })
    })
    server.on('error', reject)
  })
}

// ---------------------------------------------------------------------------
// Browser-side snapshot capture
// ---------------------------------------------------------------------------

async function captureSnapshot(
  session: CDPSession,
  selectors: string[],
  attrSelectors: Array<{ selector: string; attrs: string[] }>
): Promise<PageSnapshot> {
  const evalExpr = `
    (() => {
      // Use textContent (not innerText): innerText applies CSS
      // text-transform like uppercase, which would mangle case-sensitive
      // matches against Mirror source that did not intend an uppercase
      // string. textContent reflects the underlying DOM-text verbatim.
      const snap = {
        bodyText: document.body ? document.body.textContent || '' : '',
        selectorCounts: {},
        selectorAttributes: {},
      };
      for (const sel of ${JSON.stringify(selectors)}) {
        try {
          snap.selectorCounts[sel] = document.querySelectorAll(sel).length;
        } catch {
          snap.selectorCounts[sel] = 0;
        }
      }
      for (const { selector, attrs } of ${JSON.stringify(attrSelectors)}) {
        try {
          const els = Array.from(document.querySelectorAll(selector));
          snap.selectorAttributes[selector] = els.map(el => {
            const out = {};
            for (const a of attrs) out[a] = el.getAttribute(a) || '';
            return out;
          });
        } catch {
          snap.selectorAttributes[selector] = [];
        }
      }
      return snap;
    })()
  `
  const result = await session.send<{ result: { value: PageSnapshot; type: string } }>(
    'Runtime.evaluate',
    { expression: evalExpr, returnByValue: true }
  )
  return result.result.value
}

function collectSelectors(spec: FuncSpec): {
  selectors: string[]
  attrSelectors: Array<{ selector: string; attrs: string[] }>
} {
  const selectors = new Set<string>()
  const attrMap = new Map<string, Set<string>>()
  for (const { step } of spec.steps) {
    if ('selector' in step) selectors.add(step.selector)
    if (step.type === 'expectAttribute') {
      const cur = attrMap.get(step.selector) ?? new Set<string>()
      cur.add(step.name)
      attrMap.set(step.selector, cur)
    }
  }
  return {
    selectors: [...selectors],
    attrSelectors: [...attrMap.entries()].map(([selector, names]) => ({
      selector,
      attrs: [...names],
    })),
  }
}

// ---------------------------------------------------------------------------
// Public entry: drive a generated dir against its spec
// ---------------------------------------------------------------------------

export interface RunOpts {
  generatedDir: string
  project: string
  navigateTimeoutMs?: number
}

export async function runFunctional(opts: RunOpts): Promise<FunctionalResult> {
  const spec = SPECS[opts.project]
  if (!spec) {
    return { project: opts.project, passed: 0, total: 0, details: [] }
  }
  const rootAbs = resolve(opts.generatedDir)
  const server = await startStaticServer(rootAbs)
  const chrome = await launchChrome({ headless: true })
  try {
    const portMatch = chrome.wsEndpoint.match(/:(\d+)\//)
    if (!portMatch) throw new Error('cannot extract debug port from ' + chrome.wsEndpoint)
    const debugPort = parseInt(portMatch[1], 10)
    const pageWs = await getPageTarget(debugPort)
    const session = await connectCDP(pageWs)
    await session.send('Page.enable')
    await session.send('Runtime.enable')
    // Use 1024×1024 — semantic checks don't need viewport variation
    await session.send('Emulation.setDeviceMetricsOverride', {
      width: 1024,
      height: 1024,
      deviceScaleFactor: 1,
      mobile: false,
    })
    await session.send('Page.navigate', { url: server.url })
    // Wait for load
    await new Promise<void>(r => {
      const t = setTimeout(r, opts.navigateTimeoutMs ?? 5000)
      session.on('Page.loadEventFired', () => {
        clearTimeout(t)
        // small grace period for hydration
        setTimeout(r, 500)
      })
    })
    const { selectors, attrSelectors } = collectSelectors(spec)
    const snap = await captureSnapshot(session, selectors, attrSelectors)
    return evalSpec(spec, snap)
  } finally {
    server.close()
    chrome.kill()
  }
}
