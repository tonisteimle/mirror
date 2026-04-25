/**
 * B1 smoke-test — selectInPreview + setProperty + pickColor.
 *
 * Underscore prefix → skipped by demo-suite discovery (suite filter excludes
 * files starting with "_").
 */

import type { DemoScript } from '../types'
import { resetCanvas } from '../fragments/setup'

export const demoScript: DemoScript = {
  name: 'B1 Smoke',
  description: 'Property-Panel actions: select, setProperty, pickColor',
  config: { speed: 'fast', showKeystrokeOverlay: false },
  steps: [
    ...resetCanvas(),

    // Drop a Frame so we have something to inspect/edit
    {
      action: 'dropFromPalette',
      component: 'Frame',
      target: { byId: 'node-1' },
      at: { kind: 'index', index: 0 },
      comment: 'Frame in canvas',
    },
    { action: 'wait', duration: 300 },
    {
      action: 'expectCode',
      comment: 'baseline',
      code:
        'Frame bg #0f0f0f, col white, pad 24, gap 16, w full, h full, center\n' +
        '  Frame w 100, h 100, bg #27272a, rad 8',
    },

    // Select the inner Frame
    { action: 'selectInPreview', selector: { byId: 'node-2' }, comment: 'Card-Frame selektieren' },
    { action: 'wait', duration: 300 },

    // Set the gap property to 12 via property-panel
    {
      action: 'setProperty',
      selector: { byId: 'node-2' },
      prop: 'gap',
      value: '12',
      comment: 'gap 12 setzen',
      expectCode:
        'Frame bg #0f0f0f, col white, pad 24, gap 16, w full, h full, center\n' +
        '  Frame w 100, h 100, bg #27272a, rad 8, gap 12',
    },

    // Pick background color via color picker (#2196F3 is in QUICK_COLORS)
    {
      action: 'pickColor',
      selector: { byId: 'node-2' },
      prop: 'bg',
      color: '#2196F3',
      comment: 'bg via color picker',
    },
    { action: 'wait', duration: 300 },
    {
      action: 'expectCode',
      comment: 'after pickColor',
      code:
        'Frame bg #0f0f0f, col white, pad 24, gap 16, w full, h full, center\n' +
        '  Frame w 100, h 100, bg #2196F3, rad 8, gap 12',
    },
  ],
}

export default demoScript
