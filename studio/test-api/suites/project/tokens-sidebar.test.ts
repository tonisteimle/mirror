/**
 * Project — Tokens Sidebar + Independent Panel Toggling
 *
 * Covers tasks #39 and #41 from the tokens-sidebar work:
 *  - the sidebar reuses the existing TokenRenderer (no new panel class)
 *  - each Activity Bar panel can be toggled independently of the others
 */

import type { TestSuite, TestAPI } from '../../types'

export const tokensSidebarTests: TestSuite = [
  {
    name: 'Project: Tokens sidebar renders swatches via TokenRenderer',
    run: async (api: TestAPI) => {
      const w = window as any
      const studio = w.studio
      const tr = studio?.tokensRenderer
      api.assert.ok(!!tr, 'studio.tokensRenderer should be initialized at bootstrap')

      tr.render({
        components: [],
        instances: [],
        tokens: [
          { name: 'primary.bg', value: '#2271C1' },
          { name: 'space.gap', value: '12' },
        ],
      })
      await api.utils.delay(50)

      const sidebar = document.getElementById('tokens-panel-container')
      api.assert.ok(sidebar !== null, '#tokens-panel-container must exist')
      const sections = sidebar!.querySelectorAll('.tokens-preview-section')
      api.assert.ok(
        sections.length >= 2,
        `Renderer should produce >=2 sections (Farben + Abstände), got ${sections.length}. ` +
          `HTML head: ${sidebar!.innerHTML.slice(0, 200)}`
      )
      const swatch = sidebar!.querySelector('.tokens-preview-swatch') as HTMLElement | null
      api.assert.ok(swatch !== null, 'Renderer should produce at least one color swatch')
    },
  },

  {
    name: 'Project: Activity Bar toggles each panel independently',
    run: async (api: TestAPI) => {
      const panels = ['tokens', 'components', 'property', 'preview']
      const initial: Record<string, boolean> = {}
      for (const p of panels) initial[p] = api.studio.isPanelVisible(p)

      for (const target of panels) {
        const before: Record<string, boolean> = {}
        for (const p of panels) before[p] = api.studio.isPanelVisible(p)

        api.studio.setPanelVisible(target, !before[target])
        await api.utils.delay(50)

        api.assert.ok(
          api.studio.isPanelVisible(target) === !before[target],
          `Panel ${target} should toggle from ${before[target]} to ${!before[target]}`
        )
        for (const p of panels) {
          if (p === target) continue
          api.assert.ok(
            api.studio.isPanelVisible(p) === before[p],
            `Toggling ${target} must not affect ${p}`
          )
        }

        api.studio.setPanelVisible(target, before[target])
        await api.utils.delay(50)
      }

      for (const p of panels) {
        api.assert.ok(
          api.studio.isPanelVisible(p) === initial[p],
          `Panel ${p} should be restored to initial visibility`
        )
      }
    },
  },
]
