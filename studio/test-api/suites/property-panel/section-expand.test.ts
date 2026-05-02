/**
 * Section-Expand & Margin Section Tests (Property Panel)
 *
 * Browser-level coverage for the chevron-toggle pattern used by the
 * Padding/Margin/Border/Radius sections, plus the Margin section
 * appearing alongside Padding for elements that have margin props.
 *
 * Default panel state has 'spacing', 'margin', 'border' in the
 * `expandedSections` set, so the per-side rows (T/R/B/L) are visible
 * out of the box. Clicking the chevron collapses to the H/V summary.
 */

import { testWithSetup, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

// =============================================================================
// Helpers
// =============================================================================

function getExpandContainer(name: string): HTMLElement | null {
  const panel = document.querySelector('.property-panel')
  if (!panel) return null
  return panel.querySelector<HTMLElement>(`[data-expand-container="${name}"]`)
}

function getExpandButton(name: string): HTMLElement | null {
  const panel = document.querySelector('.property-panel')
  if (!panel) return null
  return panel.querySelector<HTMLElement>(`.section-expand-btn[data-expand="${name}"]`)
}

function isExpanded(name: string): boolean {
  const container = getExpandContainer(name)
  return container?.classList.contains('expanded') ?? false
}

function clickChevron(name: string): boolean {
  const btn = getExpandButton(name)
  if (!btn) return false
  btn.click()
  return true
}

function getPerSideInputs(prefix: 'pad' | 'mar'): HTMLInputElement[] {
  const panel = document.querySelector('.property-panel')
  if (!panel) return []
  return Array.from(panel.querySelectorAll<HTMLInputElement>(`input[data-${prefix}-dir]`))
}

// =============================================================================
// Tests
// =============================================================================

export const sectionExpandTests: TestCase[] = describe('Section Expand & Margin', [
  testWithSetup(
    'Padding chevron renders and toggles between expanded and collapsed',
    `Frame pad 8 16, bg #333`,
    async (api: TestAPI) => {
      await api.studio.setSelection('node-1')
      await api.utils.waitForIdle()
      await api.utils.delay(200)

      const btn = getExpandButton('spacing')
      api.assert.ok(btn, 'Padding chevron should render with data-expand="spacing"')

      // Default: spacing is expanded — per-side rows visible.
      api.assert.ok(
        isExpanded('spacing'),
        'Padding container should start expanded (default state)'
      )

      // Click → collapse.
      api.assert.ok(clickChevron('spacing'), 'chevron click should fire')
      await api.utils.delay(100)
      api.assert.ok(
        !isExpanded('spacing'),
        'Padding container should be collapsed after first click'
      )

      // Click again → expand.
      clickChevron('spacing')
      await api.utils.delay(100)
      api.assert.ok(
        isExpanded('spacing'),
        'Padding container should be expanded after second click'
      )
    }
  ),

  testWithSetup(
    'Padding expanded view exposes per-side inputs (T/R/B/L)',
    `Frame pad 8 16 12 24, bg #333`,
    async (api: TestAPI) => {
      await api.studio.setSelection('node-1')
      await api.utils.waitForIdle()
      await api.utils.delay(200)

      // Default expanded — per-side rows present.
      api.assert.ok(isExpanded('spacing'), 'Padding container should be expanded by default')

      const inputs = getPerSideInputs('pad')
      const dirs = inputs.map(i => i.dataset.padDir).sort()
      api.assert.ok(
        dirs.length === 6,
        `Expected 6 padding inputs (h, v, t, r, b, l), got ${dirs.length}: ${dirs.join(',')}`
      )
      api.assert.ok(
        ['b', 'h', 'l', 'r', 't', 'v'].every(d => dirs.includes(d)),
        `Per-side inputs must include t/r/b/l (and h/v), got: ${dirs.join(',')}`
      )

      // Verify each per-side row reflects the parsed CSS value.
      const top = inputs.find(i => i.dataset.padDir === 't')
      const right = inputs.find(i => i.dataset.padDir === 'r')
      const bottom = inputs.find(i => i.dataset.padDir === 'b')
      const left = inputs.find(i => i.dataset.padDir === 'l')
      api.assert.ok(top?.value === '8', `Top input should be 8, got ${top?.value}`)
      api.assert.ok(right?.value === '16', `Right input should be 16, got ${right?.value}`)
      api.assert.ok(bottom?.value === '12', `Bottom input should be 12, got ${bottom?.value}`)
      api.assert.ok(left?.value === '24', `Left input should be 24, got ${left?.value}`)
    }
  ),

  testWithSetup(
    'Margin section renders alongside Padding and parses 3-value shorthand',
    `Frame pad 12, mar 4 8 16, bg #333`,
    async (api: TestAPI) => {
      await api.studio.setSelection('node-1')
      await api.utils.waitForIdle()
      await api.utils.delay(200)

      // Both sections must mount.
      api.assert.ok(getExpandContainer('spacing'), 'Padding (spacing) container should render')
      api.assert.ok(getExpandContainer('margin'), 'Margin container should render')

      // Margin chevron should be wired symmetrically with Padding's.
      api.assert.ok(getExpandButton('margin'), 'Margin chevron should render')
      api.assert.ok(isExpanded('margin'), 'Margin container should be expanded by default')

      // 3-value form: T=4, R=L=8, B=16
      const marInputs = getPerSideInputs('mar')
      const t = marInputs.find(i => i.dataset.marDir === 't')
      const r = marInputs.find(i => i.dataset.marDir === 'r')
      const b = marInputs.find(i => i.dataset.marDir === 'b')
      const l = marInputs.find(i => i.dataset.marDir === 'l')
      api.assert.ok(t?.value === '4', `mar Top should be 4, got ${t?.value}`)
      api.assert.ok(r?.value === '8', `mar Right should be 8, got ${r?.value}`)
      api.assert.ok(b?.value === '16', `mar Bottom should be 16, got ${b?.value}`)
      api.assert.ok(l?.value === '8', `mar Left should be 8 (mirrors Right), got ${l?.value}`)
    }
  ),

  testWithSetup(
    'Margin chevron toggles independently of Padding chevron',
    `Frame pad 8, mar 4, bg #333`,
    async (api: TestAPI) => {
      await api.studio.setSelection('node-1')
      await api.utils.waitForIdle()
      await api.utils.delay(200)

      api.assert.ok(isExpanded('spacing'), 'spacing starts expanded')
      api.assert.ok(isExpanded('margin'), 'margin starts expanded')

      // Collapse only margin.
      clickChevron('margin')
      await api.utils.delay(100)
      api.assert.ok(isExpanded('spacing'), 'spacing should remain expanded')
      api.assert.ok(!isExpanded('margin'), 'margin should collapse alone')

      // Collapse spacing too.
      clickChevron('spacing')
      await api.utils.delay(100)
      api.assert.ok(!isExpanded('spacing'), 'spacing now collapsed')
      api.assert.ok(!isExpanded('margin'), 'margin still collapsed')

      // Re-expand margin only.
      clickChevron('margin')
      await api.utils.delay(100)
      api.assert.ok(!isExpanded('spacing'), 'spacing stays collapsed')
      api.assert.ok(isExpanded('margin'), 'margin expanded again')
    }
  ),

  testWithSetup(
    'Border chevron renders on Frame with border properties',
    `Frame bor 2, boc #555, bg #333, pad 8`,
    async (api: TestAPI) => {
      await api.studio.setSelection('node-1')
      await api.utils.waitForIdle()
      await api.utils.delay(200)

      api.assert.ok(getExpandButton('border'), 'Border chevron should render')
      api.assert.ok(isExpanded('border'), 'Border container should start expanded')

      clickChevron('border')
      await api.utils.delay(100)
      api.assert.ok(!isExpanded('border'), 'Border collapses on click')

      clickChevron('border')
      await api.utils.delay(100)
      api.assert.ok(isExpanded('border'), 'Border expands again on second click')
    }
  ),

  testWithSetup(
    'Radius chevron renders inside Border section and toggles independently',
    `Frame rad 8, bor 1, bg #333, pad 8`,
    async (api: TestAPI) => {
      await api.studio.setSelection('node-1')
      await api.utils.waitForIdle()
      await api.utils.delay(200)

      api.assert.ok(getExpandButton('radius'), 'Radius chevron should render')
      api.assert.ok(getExpandButton('border'), 'Border chevron should render')

      const radiusStart = isExpanded('radius')
      const borderStart = isExpanded('border')

      clickChevron('radius')
      await api.utils.delay(100)
      api.assert.ok(
        isExpanded('radius') !== radiusStart,
        'Radius expand state should flip after click'
      )
      api.assert.ok(
        isExpanded('border') === borderStart,
        'Border expand state should NOT change when radius is toggled'
      )
    }
  ),
])
