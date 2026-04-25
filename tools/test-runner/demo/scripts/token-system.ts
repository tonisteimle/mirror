/**
 * Token System Demo
 *
 * Zeigt Mirror's Token-File-Konzept: separates `tokens.tok` File mit Design-
 * Tokens, im Layout via `$name` referenziert. Token-Änderung an einer Stelle
 * propagiert zu allen Referenzen.
 *
 * Spec: docs/concepts/token-system-demo.md
 */

import type { DemoScript } from '../types'
import { validateStudioReady } from '../fragments/setup'
import { resetMultiFileProject } from '../fragments/multi-file'

const TOKENS_TOK = [
  '// Design Tokens',
  'primary.bg: #2271C1',
  'muted.col: #a1a1aa',
  'lg.pad: 24',
  'md.pad: 16',
  'md.rad: 8',
].join('\n')

export const demoScript: DemoScript = {
  name: 'Token System',
  description: 'Tokens definieren, referenzieren, an einer Stelle ändern',
  config: {
    speed: 'normal',
    showKeystrokeOverlay: true,
  },
  steps: [
    // === 1. Multi-File-Reset ===
    ...resetMultiFileProject(),
    ...validateStudioReady(),

    // === 2. tokens.tok erstellen ===
    { action: 'comment', text: 'Schritt 1: Tokens-File anlegen' },
    {
      action: 'createFile',
      path: 'tokens.tok',
      content: TOKENS_TOK,
      switchTo: true,
    },
    { action: 'wait', duration: 600 },

    // === 3. Tokens-File-Inhalt verifizieren ===
    {
      action: 'expectCode',
      comment: 'tokens.tok contents',
      code: TOKENS_TOK,
    },

    // === 4. Zurück zu index.mir ===
    { action: 'comment', text: 'Schritt 2: Zurück ins Layout' },
    { action: 'switchFile', path: 'index.mir' },
    { action: 'wait', duration: 500 },

    // === 5. Card-Frame droppen ===
    { action: 'comment', text: 'Schritt 3: Card-Frame in Canvas' },
    {
      action: 'dropFromPalette',
      component: 'Frame',
      target: { byId: 'node-1' },
      at: { kind: 'index', index: 0 },
      comment: 'Frame in Canvas',
    },
    { action: 'wait', duration: 500 },
    {
      action: 'expectCode',
      comment: 'after frame drop',
      code:
        'Frame bg #0f0f0f, col white, pad 24, gap 16, w full, h full, center\n' +
        '  Frame w 100, h 100, bg #27272a, rad 8',
    },

    // === 6. Token-Referenz für bg ===
    { action: 'comment', text: 'Schritt 4: bg auf $primary umstellen' },
    {
      action: 'selectInPreview',
      selector: { byId: 'node-2' },
      comment: 'Card selektieren',
    },
    { action: 'wait', duration: 400 },

    // setProperty mit Token-Reference (statt Hex)
    // Hinweis: setProperty geht den UI-Pfad — User tippt $primary ins bg-Feld.
    // Aber bg hat kein normales <input data-prop="bg"> sondern den
    // [data-color-prop="bg"] trigger. Daher nutzen wir hier den
    // propertyPanel.changeProperty Pfad direkt — gleicher Effekt wie pickColor,
    // nur mit Token-Reference statt Hex.
    {
      action: 'execute',
      code: `
        (async function() {
          const studio = window.__mirrorStudio__;
          studio.propertyPanel.changeProperty('bg', '$primary');
          await new Promise(r => setTimeout(r, 450));
        })();
      `,
      comment: 'bg = $primary',
    },
    { action: 'wait', duration: 400 },
    {
      action: 'expectCode',
      comment: 'bg references token',
      code:
        'Frame bg #0f0f0f, col white, pad 24, gap 16, w full, h full, center\n' +
        '  Frame w 100, h 100, bg $primary, rad 8',
    },

    // === 7. Test-Mode verlassen → tokens werden als prelude eingelesen ===
    // setTestCode versetzt das Studio in einen test-mode der die normale
    // multi-file-prelude-Pipeline überspringt (für stabile nodeIds). Jetzt
    // wo wir alle Drops/Properties gesetzt haben, wechseln wir zum normalen
    // compile — dann werden tokens.tok als prelude vor index.mir gehängt
    // und $token-References lösen sich zu echten Werten auf.
    {
      action: 'execute',
      code: `
        (async function() {
          if (typeof window.__exitTestMode === 'function') {
            window.__exitTestMode();
          }
          // Trigger a fresh compile so the prelude is included
          const studio = window.__mirrorStudio__;
          if (studio && studio.events) {
            studio.events.emit('compile:requested', {});
          }
          await new Promise(r => setTimeout(r, 600));
        })();
      `,
      comment: 'Switch to prelude-aware compile',
    },
    { action: 'wait', duration: 500 },

    // === 8. Computed-Style bestätigt jetzt den Token-Wert ===
    // Note: nach exitTestMode sind die node-IDs verschoben (App-wrapper +
    // prelude erzeugen 1-2 zusätzliche Knoten oben). Unsere Card landet
    // dadurch auf node-3 — die Hierarchie ist outer-Frame → outer-Frame →
    // unsere Card. Der computed-style auf der Card bestätigt $primary →
    // #2271C1.
    {
      action: 'expectDom',
      comment: 'card has $primary color resolved',
      checks: [{ selector: { byId: 'node-3' }, background: '#2271C1' }],
    },

    // === Closing ===
    { action: 'comment', text: 'Tokens definiert, im Layout referenziert, im DOM aufgelöst' },
    { action: 'moveTo', target: '#preview' },
    { action: 'highlight', target: '#preview', duration: 1500 },
    { action: 'moveTo', target: '.cm-editor' },
    { action: 'highlight', target: '.cm-editor', duration: 1500 },

    { action: 'wait', duration: 1000, comment: 'Demo abgeschlossen' },
  ],
}

export default demoScript
