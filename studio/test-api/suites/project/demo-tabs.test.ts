/**
 * Demo Tabs + Detail Navigation Tests
 *
 * Validates the shipped DEFAULT_PROJECT (loaded by Reset-to-Demo) end to
 * end. Loads the real demo source — same one a fresh user sees — and
 * exercises the tab switcher (built from exclusive() + show()/hide())
 * plus the three distinct detail-view navigation paths.
 *
 * Whenever DEFAULT_PROJECT in studio/storage/project-actions.ts changes,
 * these tests re-validate the user-facing behavior automatically because
 * the source is imported, not duplicated.
 */

import { testWithSetup, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'
import { DEFAULT_PROJECT } from '../../../storage/project-actions'

// DEFAULT_PROJECT now ships as four files (data.data / tokens.tok /
// components.com / app.mir) — re-flatten to a single string for the
// testWithSetup harness, in the same order the compiler prelude
// concatenates them at runtime. This keeps these tests anchored to the
// real demo source without having to spin up multi-file storage in
// every fixture.
const DEMO = [
  DEFAULT_PROJECT['data.data'],
  DEFAULT_PROJECT['tokens.tok'],
  DEFAULT_PROJECT['components.com'],
  DEFAULT_PROJECT['app.mir'],
]
  .filter(Boolean)
  .join('\n\n')

// =============================================================================
// HELPERS — find live elements by their visible text or by mirror-name attrs.
// Avoid brittle node-id lookups so the tests survive demo edits that
// reshuffle internal numbering but preserve the user-facing behavior.
// =============================================================================

function findVisible(text: string): HTMLElement | null {
  const preview = document.getElementById('preview')
  if (!preview) return null
  const all = Array.from(preview.querySelectorAll('*')) as HTMLElement[]
  return (
    all.find(el => {
      if (el.children.length !== 0) return false
      if ((el.textContent || '').trim() !== text) return false
      const r = el.getBoundingClientRect()
      return r.width > 0 && r.height > 0
    }) ?? null
  )
}

function visibleCount(text: string | RegExp): number {
  const preview = document.getElementById('preview')
  if (!preview) return 0
  const matcher = typeof text === 'string' ? (s: string) => s === text : (s: string) => text.test(s)
  return Array.from(preview.querySelectorAll('*')).filter(el => {
    if (el.children.length !== 0) return false
    const t = (el.textContent || '').trim()
    if (!matcher(t)) return false
    const r = (el as HTMLElement).getBoundingClientRect()
    return r.width > 0 && r.height > 0
  }).length
}

function isVisibleFrameByName(name: string): boolean {
  // `Frame name X` overwrites dataset.mirrorName with X (replaces the
  // primitive type "Frame"). So the user-supplied name lives at the
  // selector below, not at id= or data-name.
  const el = document.querySelector(`#preview [data-mirror-name="${name}"]`) as HTMLElement | null
  if (!el) return false
  const r = el.getBoundingClientRect()
  return r.width > 0 && r.height > 0 && getComputedStyle(el).display !== 'none'
}

async function clickByText(api: TestAPI, text: string): Promise<void> {
  const el = findVisible(text)
  if (!el) throw new Error(`No visible element with text "${text}"`)
  // Walk up to a clickable mirror node so the runtime click handlers fire.
  let target: HTMLElement | null = el
  while (target && !target.dataset.mirrorId) target = target.parentElement
  if (!target) throw new Error(`Element with text "${text}" has no mirror-id ancestor`)
  await api.interact.click(target.dataset.mirrorId as string)
}

// =============================================================================
// TESTS
// =============================================================================

export const demoTabsTests: TestCase[] = describe('Demo Tabs + Navigation', [
  // ---------------------------------------------------------------------------
  // Initial state — Daten tab active, NavView hidden, both detail views hidden
  // ---------------------------------------------------------------------------

  testWithSetup(
    'demo loads with Daten tab visible and three feature cards rendered',
    DEMO,
    async (api: TestAPI) => {
      // Tab labels are present as text
      api.assert.ok(findVisible('Daten') !== null, 'Daten tab label missing')
      api.assert.ok(findVisible('Navigation') !== null, 'Navigation tab label missing')

      // Three feature titles from the data block render once each in the
      // initial (Daten) tab. Mehr buttons should NOT yet be visible (those
      // live in the Navigation tab).
      api.assert.ok(visibleCount('Willkommen') === 1, 'Willkommen title not visible exactly once')
      api.assert.ok(visibleCount('Komponenten') === 1, 'Komponenten title not visible exactly once')
      api.assert.ok(
        visibleCount('Live Preview') === 1,
        'Live Preview title not visible exactly once'
      )

      api.assert.ok(visibleCount('Mehr') === 0, 'Mehr buttons should be hidden on Daten tab')

      // Detail views are hidden initially
      api.assert.ok(!isVisibleFrameByName('WelcomeDetail'), 'WelcomeDetail should be hidden')
      api.assert.ok(!isVisibleFrameByName('ComponentsDetail'), 'ComponentsDetail should be hidden')
      api.assert.ok(
        !isVisibleFrameByName('InteractiveDetail'),
        'InteractiveDetail should be hidden'
      )
    }
  ),

  // ---------------------------------------------------------------------------
  // Tab switching: Daten <-> Navigation
  // ---------------------------------------------------------------------------

  testWithSetup(
    'clicking Navigation tab swaps DataView for NavView',
    DEMO,
    async (api: TestAPI) => {
      await clickByText(api, 'Navigation')
      await api.utils.waitUntil(() => visibleCount('Mehr') === 3, 2000)

      // After the switch: three Mehr buttons are visible (Navigation cards),
      // and the data-driven cards are hidden — title text appears exactly
      // once because the Navigation tab also has these labels.
      api.assert.ok(
        visibleCount('Mehr') === 3,
        `Expected 3 Mehr buttons, got ${visibleCount('Mehr')}`
      )
      api.assert.ok(
        visibleCount('Willkommen') === 1,
        `Willkommen should appear once (Navigation card only), got ${visibleCount('Willkommen')}`
      )
    }
  ),

  testWithSetup(
    'clicking Daten tab again returns to data-driven view',
    DEMO,
    async (api: TestAPI) => {
      await clickByText(api, 'Navigation')
      await api.utils.waitUntil(() => visibleCount('Mehr') === 3, 2000)

      await clickByText(api, 'Daten')
      await api.utils.waitUntil(() => visibleCount('Mehr') === 0, 2000)

      api.assert.ok(visibleCount('Mehr') === 0, 'Mehr buttons should hide on Daten tab')
      api.assert.ok(visibleCount('Willkommen') === 1, 'Willkommen still rendered (from data)')
    }
  ),

  // ---------------------------------------------------------------------------
  // Navigation: each Mehr opens a distinct detail view
  // ---------------------------------------------------------------------------

  testWithSetup('first Mehr opens WelcomeDetail (only that one)', DEMO, async (api: TestAPI) => {
    await clickByText(api, 'Navigation')
    await api.utils.waitUntil(() => visibleCount('Mehr') === 3, 2000)

    // First Mehr in DOM order = first card = WelcomeDetail
    const preview = document.getElementById('preview')!
    const mehrs = Array.from(preview.querySelectorAll('button')).filter(b =>
      /^Mehr$/.test((b.textContent || '').trim())
    ) as HTMLButtonElement[]
    api.assert.ok(mehrs.length === 3, `Expected 3 Mehr buttons, got ${mehrs.length}`)

    let target: HTMLElement | null = mehrs[0]
    while (target && !target.dataset.mirrorId) target = target.parentElement
    await api.interact.click(target!.dataset.mirrorId as string)

    await api.utils.waitUntil(() => isVisibleFrameByName('WelcomeDetail'), 2000)
    api.assert.ok(isVisibleFrameByName('WelcomeDetail'), 'WelcomeDetail should be visible')
    api.assert.ok(!isVisibleFrameByName('ComponentsDetail'), 'ComponentsDetail must stay hidden')
    api.assert.ok(!isVisibleFrameByName('InteractiveDetail'), 'InteractiveDetail must stay hidden')

    // Welcome-specific copy must render
    api.assert.ok(findVisible('Schön, dass du da bist!') !== null, 'Welcome-specific copy missing')
  }),

  testWithSetup(
    'second Mehr opens ComponentsDetail with its showcase widgets',
    DEMO,
    async (api: TestAPI) => {
      await clickByText(api, 'Navigation')
      await api.utils.waitUntil(() => visibleCount('Mehr') === 3, 2000)

      const preview = document.getElementById('preview')!
      const mehrs = Array.from(preview.querySelectorAll('button')).filter(b =>
        /^Mehr$/.test((b.textContent || '').trim())
      ) as HTMLButtonElement[]
      let target: HTMLElement | null = mehrs[1]
      while (target && !target.dataset.mirrorId) target = target.parentElement
      await api.interact.click(target!.dataset.mirrorId as string)

      await api.utils.waitUntil(() => isVisibleFrameByName('ComponentsDetail'), 2000)
      api.assert.ok(isVisibleFrameByName('ComponentsDetail'), 'ComponentsDetail should be visible')
      api.assert.ok(!isVisibleFrameByName('WelcomeDetail'), 'WelcomeDetail must stay hidden')
      api.assert.ok(
        !isVisibleFrameByName('InteractiveDetail'),
        'InteractiveDetail must stay hidden'
      )

      // Components showcase: a button labelled "Aktion auslösen" must render
      api.assert.ok(
        findVisible('Aktion auslösen') !== null,
        'Components-detail button "Aktion auslösen" missing'
      )
    }
  ),

  testWithSetup(
    'third Mehr opens InteractiveDetail; counter +/− changes the displayed value',
    DEMO,
    async (api: TestAPI) => {
      await clickByText(api, 'Navigation')
      await api.utils.waitUntil(() => visibleCount('Mehr') === 3, 2000)

      const preview = document.getElementById('preview')!
      const mehrs = Array.from(preview.querySelectorAll('button')).filter(b =>
        /^Mehr$/.test((b.textContent || '').trim())
      ) as HTMLButtonElement[]
      let target: HTMLElement | null = mehrs[2]
      while (target && !target.dataset.mirrorId) target = target.parentElement
      await api.interact.click(target!.dataset.mirrorId as string)

      await api.utils.waitUntil(() => isVisibleFrameByName('InteractiveDetail'), 2000)
      api.assert.ok(
        isVisibleFrameByName('InteractiveDetail'),
        'InteractiveDetail should be visible'
      )

      // Counter starts at 0 — find the rendered count text node
      const findCount = (): string | null => {
        const candidates = Array.from(preview.querySelectorAll('*')).filter(
          el => el.children.length === 0 && /^-?\d+$/.test((el.textContent || '').trim())
        )
        for (const c of candidates) {
          const r = (c as HTMLElement).getBoundingClientRect()
          if (r.width > 0 && r.height > 0) return (c.textContent || '').trim()
        }
        return null
      }

      api.assert.ok(findCount() === '0', `Initial counter should be 0, got ${findCount()}`)

      // Click "+" twice — count must become 2
      await clickByText(api, '+')
      await clickByText(api, '+')
      await api.utils.waitUntil(() => findCount() === '2', 2000)
      api.assert.ok(findCount() === '2', `After two +, counter should be 2, got ${findCount()}`)

      // Click "−" once — count must become 1
      await clickByText(api, '−')
      await api.utils.waitUntil(() => findCount() === '1', 2000)
      api.assert.ok(findCount() === '1', `After one −, counter should be 1, got ${findCount()}`)
    }
  ),

  // ---------------------------------------------------------------------------
  // back() returns to HomeView with the Navigation tab still selected
  // ---------------------------------------------------------------------------

  testWithSetup(
    'Zurück from a detail view returns to HomeView and preserves the Navigation tab',
    DEMO,
    async (api: TestAPI) => {
      await clickByText(api, 'Navigation')
      await api.utils.waitUntil(() => visibleCount('Mehr') === 3, 2000)

      // Open WelcomeDetail
      const preview = document.getElementById('preview')!
      const mehrs = Array.from(preview.querySelectorAll('button')).filter(b =>
        /^Mehr$/.test((b.textContent || '').trim())
      ) as HTMLButtonElement[]
      let target: HTMLElement | null = mehrs[0]
      while (target && !target.dataset.mirrorId) target = target.parentElement
      await api.interact.click(target!.dataset.mirrorId as string)
      await api.utils.waitUntil(() => isVisibleFrameByName('WelcomeDetail'), 2000)

      // Click "← Zurück" — must hide WelcomeDetail and re-show the
      // Navigation tab (NOT the Daten tab — exclusive() preserves selection)
      await clickByText(api, '← Zurück')
      await api.utils.waitUntil(() => !isVisibleFrameByName('WelcomeDetail'), 2000)

      api.assert.ok(!isVisibleFrameByName('WelcomeDetail'), 'WelcomeDetail should hide on back()')
      // Navigation tab content (Mehr buttons) must still be the visible view
      api.assert.ok(
        visibleCount('Mehr') === 3,
        `Expected Navigation tab still active (3 Mehr buttons), got ${visibleCount('Mehr')}`
      )
    }
  ),
])
