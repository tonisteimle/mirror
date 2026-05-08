/**
 * Browser-test-shape adapter for Vitest+jsdom
 *
 * Lets auto-generated tutorial tests written against the browser harness
 * (`testWithSetup`, `describe`, `api.assert.*`, `api.preview.*`) run inside
 * Vitest by replaying each TestCase against a `mountMirror` instance.
 *
 * Goal: zero changes to existing generated test files — we just retarget
 * their imports at this adapter and `runTestCases(testArray)` inside an
 * `it.each`-style block per Vitest spec file.
 */

import { describe as vitestDescribe, it, expect } from 'vitest'
import { mountMirror, readStyle, type MirrorMount, type NodeInfo } from './mirror-mount'

// =============================================================================
// Public types — match studio/test-api/types.ts surface used by tutorial tests
// =============================================================================

export interface TestCase {
  name: string
  category?: string
  setup?: string
  run: (api: TestAPI) => void | Promise<void>
  skip?: boolean
}

export interface TestAPI {
  preview: PreviewAPI
  assert: AssertAPI
  utils: UtilsAPI
  dom: DomAPI
}

interface UtilsAPI {
  /** No-op under jsdom — `mountMirror` is synchronous, so the compile is
   *  already done by the time tests run. Returns immediately. */
  waitForCompile(timeout?: number): Promise<void>
  waitForIdle(timeout?: number): Promise<void>
  delay(ms: number): Promise<void>
  sleep(ms: number): Promise<void>
}

interface DomExpectation {
  tag?: string
  text?: string
  textContent?: string
  children?: number
  attributes?: Record<string, string>
  styles?: Record<string, string>
  visible?: boolean
}

interface DomAPI {
  expect(nodeId: string, expectations: DomExpectation): void
  verify(nodeId: string, expectations: DomExpectation): boolean
}

interface PreviewAPI {
  getNodeIds(): string[]
  inspect(nodeId: string): NodeInfo | null
  find(predicate: (el: HTMLElement) => boolean): HTMLElement | null
  findAll(predicate: (el: HTMLElement) => boolean): HTMLElement[]
  findByText(text: string, options?: { exact?: boolean }): NodeInfo | null
  getElement(nodeId: string): HTMLElement | null
  getRoot(): HTMLElement | null
  query(selector: string): HTMLElement | null
  queryAll(selector: string): HTMLElement[]
}

interface AssertAPI {
  ok(condition: unknown, message?: string): void
  exists(nodeId: string): void
  hasText(nodeId: string, expected: string): void
  hasStyle(nodeId: string, property: string, expected: string): void
  hasChildren(nodeId: string, count: number): void
  hasAttribute(nodeId: string, name: string, expected: string): void
}

// =============================================================================
// Public helpers — same names the generated files import
// =============================================================================

export function testWithSetup(
  name: string,
  setup: string,
  run: (api: TestAPI) => void | Promise<void>
): TestCase {
  return { name, setup, run }
}

export function testSkip(name: string, run: (api: TestAPI) => void | Promise<void>): TestCase {
  return { name, run, skip: true }
}

export function testWithSetupSkip(
  name: string,
  setup: string,
  run: (api: TestAPI) => void | Promise<void>
): TestCase {
  return { name, setup, run, skip: true }
}

export function describe(category: string, tests: TestCase[]): TestCase[] {
  return tests.map(t => ({ ...t, category }))
}

// =============================================================================
// API factory — wires a TestAPI on top of a fresh MirrorMount
// =============================================================================

function createTestAPI(mount: MirrorMount): TestAPI {
  const preview: PreviewAPI = {
    getNodeIds: () => mount.getNodeIds(),
    inspect: id => mount.inspect(id),
    find: predicate => {
      const all = mount.root.querySelectorAll('*')
      for (const el of Array.from(all)) {
        if (el instanceof HTMLElement && predicate(el)) return el
      }
      return null
    },
    findAll: predicate => {
      const out: HTMLElement[] = []
      const all = mount.root.querySelectorAll('*')
      for (const el of Array.from(all)) {
        if (el instanceof HTMLElement && predicate(el)) out.push(el)
      }
      return out
    },
    findByText: (text, options) => {
      const exact = options?.exact ?? false
      for (const id of mount.getNodeIds()) {
        const info = mount.inspect(id)
        if (!info) continue
        const matches = exact
          ? info.textContent === text || info.fullText === text
          : info.textContent.includes(text) || info.fullText.includes(text)
        if (matches) return info
      }
      return null
    },
    getElement: id => mount.byId(id),
    getRoot: () => mount.root,
    query: selector => mount.root.querySelector(selector) as HTMLElement | null,
    queryAll: selector => Array.from(mount.root.querySelectorAll(selector)) as HTMLElement[],
  }

  const assert: AssertAPI = {
    ok: (condition, message) => expect(condition, message).toBeTruthy(),
    exists: nodeId => expect(mount.byId(nodeId), `${nodeId} should exist`).not.toBeNull(),
    hasText: (nodeId, expected) => {
      const el = mount.byId(nodeId)
      expect(el, `${nodeId} should exist`).not.toBeNull()
      expect(el!.textContent?.trim()).toContain(expected)
    },
    hasStyle: (nodeId, property, expected) => {
      const el = mount.byId(nodeId)
      expect(el, `${nodeId} should exist`).not.toBeNull()
      expect(readStyle(el!, property), `${nodeId}.${property}`).toBe(expected)
    },
    hasChildren: (nodeId, count) => {
      const el = mount.byId(nodeId)
      expect(el, `${nodeId} should exist`).not.toBeNull()
      // Count only mirror-tagged children (matches browser semantics).
      const childCount = el!.querySelectorAll(':scope > [data-mirror-id]').length
      expect(childCount, `${nodeId} child count`).toBe(count)
    },
    hasAttribute: (nodeId, name, expected) => {
      const el = mount.byId(nodeId)
      expect(el, `${nodeId} should exist`).not.toBeNull()
      expect(el!.getAttribute(name), `${nodeId}.${name}`).toBe(expected)
    },
  }

  const utils: UtilsAPI = {
    waitForCompile: async () => {},
    waitForIdle: async () => {},
    delay: ms => new Promise(resolve => setTimeout(resolve, ms)),
    sleep: ms => new Promise(resolve => setTimeout(resolve, ms)),
  }

  const dom: DomAPI = {
    expect: (nodeId, expectations) => {
      const info = mount.inspect(nodeId)
      expect(info, `${nodeId} should exist`).not.toBeNull()
      if (expectations.tag !== undefined) {
        expect(info!.tagName, `${nodeId}.tag`).toBe(expectations.tag)
      }
      if (expectations.text !== undefined) {
        expect(info!.fullText, `${nodeId}.text`).toContain(expectations.text)
      }
      if (expectations.textContent !== undefined) {
        expect(info!.textContent, `${nodeId}.textContent`).toBe(expectations.textContent)
      }
      if (expectations.children !== undefined) {
        const childCount = mount.byId(nodeId)!.querySelectorAll(':scope > [data-mirror-id]').length
        expect(childCount, `${nodeId}.children`).toBe(expectations.children)
      }
      if (expectations.attributes) {
        for (const [k, v] of Object.entries(expectations.attributes)) {
          expect(info!.attributes[k] ?? info!.dataAttributes[k], `${nodeId}.${k}`).toBe(v)
        }
      }
      if (expectations.styles) {
        for (const [k, v] of Object.entries(expectations.styles)) {
          expect(info!.styles[k], `${nodeId}.${k}`).toBe(v)
        }
      }
    },
    verify: (nodeId, expectations) => {
      try {
        dom.expect(nodeId, expectations)
        return true
      } catch {
        return false
      }
    },
  }

  return { preview, assert, utils, dom }
}

// =============================================================================
// Public runner — call this at top level of a *.test.ts file
// =============================================================================

/**
 * Replay a generated test-array under Vitest.
 *
 * @example
 *   import { allTutorialChapter1 } from '../studio/test-api/suites/tutorial/01-elemente.test'
 *   runTestCases('Tutorial chapter 1', allTutorialChapter1)
 */
export function runTestCases(suite: string, cases: TestCase[]): void {
  vitestDescribe(suite, () => {
    for (const tc of cases) {
      const itFn = tc.skip ? it.skip : it
      itFn(tc.name, async () => {
        const mount = mountMirror(tc.setup ?? '')
        try {
          const api = createTestAPI(mount)
          await tc.run(api)
        } finally {
          mount.unmount()
        }
      })
    }
  })
}
