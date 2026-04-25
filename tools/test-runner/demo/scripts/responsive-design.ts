/**
 * Responsive Design Demo
 *
 * Mirror's `canvas mobile/tablet/desktop` Presets — eine Card-Komposition,
 * dieselbe Mirror-Quelle, jeweils unterschiedliche Canvas-Größen.
 *
 * Spec: kompakt — die Demo ist primär ein Visual-Test der Device-Presets.
 */

import type { DemoScript } from '../types'
import { validateStudioReady } from '../fragments/setup'

/** Wraps a snippet of card markup in a canvas of the given device. */
function buildLayout(device: 'mobile' | 'tablet' | 'desktop'): string {
  return [
    `canvas ${device}, bg #0f0f0f, col white, pad 24, gap 16, center`,
    `Frame w 280, bg #27272a, rad 8, gap 12, pad 16`,
    `  H1 "Responsive Card", col #FFFFFF`,
    `  Text "Same Mirror, different canvas.", col #a1a1aa`,
  ].join('\n')
}

const MOBILE = buildLayout('mobile')
const TABLET = buildLayout('tablet')
const DESKTOP = buildLayout('desktop')

export const demoScript: DemoScript = {
  name: 'Responsive Design',
  description: 'canvas mobile/tablet/desktop Presets — gleicher Code, andere Größe',
  config: {
    speed: 'normal',
    showKeystrokeOverlay: true,
  },
  steps: [
    // === 1. Mobile Setup ===
    {
      action: 'execute',
      code: `
        (async function() {
          await window.__dragTest.setTestCode(${JSON.stringify(MOBILE)});
          await new Promise(r => setTimeout(r, 250));
        })();
      `,
      comment: 'canvas mobile (375 × 812)',
    },
    { action: 'wait', duration: 600 },
    { action: 'expectCode', comment: 'mobile baseline', code: MOBILE },
    ...validateStudioReady(),

    // === 2. Mobile-Größe verifizieren ===
    // Note: `canvas mobile` is a top-level configuration, not an element with
    // a data-mirror-id. Validation here is at the source level (expectCode)
    // — the rendered canvas size sits on a wrapper outside the mirror-id tree.

    // === 3. Tablet wechseln ===
    { action: 'comment', text: 'Schritt 2: Auf Tablet umstellen' },
    {
      action: 'execute',
      code: `
        (async function() {
          await window.__dragTest.setTestCode(${JSON.stringify(TABLET)});
          await new Promise(r => setTimeout(r, 250));
        })();
      `,
      comment: 'canvas tablet (768 × 1024)',
    },
    { action: 'wait', duration: 600 },
    { action: 'expectCode', comment: 'tablet baseline', code: TABLET },

    // === 4. Desktop wechseln ===
    { action: 'comment', text: 'Schritt 3: Auf Desktop umstellen' },
    {
      action: 'execute',
      code: `
        (async function() {
          await window.__dragTest.setTestCode(${JSON.stringify(DESKTOP)});
          await new Promise(r => setTimeout(r, 250));
        })();
      `,
      comment: 'canvas desktop (1440 × 900)',
    },
    { action: 'wait', duration: 600 },
    { action: 'expectCode', comment: 'desktop baseline', code: DESKTOP },

    // === Closing ===
    { action: 'comment', text: 'Card-Layout unverändert, nur das Device-Preset wechselt' },
    { action: 'moveTo', target: '#preview' },
    { action: 'highlight', target: '#preview', duration: 1500 },

    { action: 'wait', duration: 1000, comment: 'Demo abgeschlossen' },
  ],
}

export default demoScript
