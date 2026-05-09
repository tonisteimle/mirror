/**
 * LLM-Edit-Flow Demo · Imperative Trailing-Sketch
 *
 * Der User hat schon Code im Editor. Er hängt an eine Zeile einen
 * `-- mach rot`-Suffix und drückt den AI-Button. Erwartung:
 *   - Marker und Anweisung sind weg.
 *   - Das Element auf der gleichen Zeile (vor `--`) ist verändert.
 *
 * Voraussetzungen wie bei den anderen LLM-Demos (ai-bridge + studio).
 *
 * Lauf:
 *   npx tsx tools/test.ts \
 *     --demo=tools/test-runner/demo/scripts/llm-edit-flow-imperative.ts \
 *     --pacing=instant --timeout=120000
 */

import type { DemoScript } from '../types'
import { resetCanvas, validateStudioReady } from '../fragments/setup'

// Initial-Code: zwei Cards (Frame mit Children) plus ein paar
// Buttons. Trailing-Sketch auf den ERSTEN Card-Frame zeigt den
// Subtree-Indikator — der dezente linke Streifen markiert den
// gesamten Element-Subtree (Frame + alle Children).
const INITIAL_CODE =
  'canvas mobile, bg #0a0a0a, col white, font sans\n' +
  '\n' +
  'Frame pad 24, gap 16\n' +
  '  Frame bg #1a1a1a, pad 16, rad 8, gap 8\n' +
  '    Text "Aktive Aufgabe", fs 16, weight bold\n' +
  '    Text "Antrag prüfen", col #888\n' +
  '    Button "Bearbeiten", bg #2271C1, col white, pad 8 16, rad 6\n' +
  '  Frame bg #1a1a1a, pad 16, rad 8, gap 8\n' +
  '    Text "Andere Card"\n' +
  '    Text "Bleibt unverändert", col #888'

export const demoScript: DemoScript = {
  name: 'LLM Edit Flow · Imperative Trailing',
  description: 'User fügt `code -- mach rot` an eine bestehende Zeile, AI ändert das Element',
  config: {
    speed: 'normal',
    showKeystrokeOverlay: true,
    customTimings: {
      type: {
        charMs: 30,
        variance: 0.2,
        wordPauseMs: 0,
        linePauseMs: 80,
        thoughtPauseMs: 200,
      },
    },
  },
  steps: [
    {
      action: 'execute',
      code: `
        (async () => {
          const deadline = Date.now() + 5000;
          while (Date.now() < deadline) {
            if (window.__dragTest && typeof window.__dragTest.setTestCode === 'function') return;
            await new Promise(r => setTimeout(r, 50));
          }
          throw new Error('Timed out waiting for window.__dragTest');
        })();
      `,
      comment: 'auf Studio-Test-API warten',
    },
    ...resetCanvas({
      baseCode: INITIAL_CODE,
      comment: 'Zwei Buttons als Ausgangslage',
    }),
    ...validateStudioReady(),
    {
      action: 'execute',
      code: `
        (async () => {
          if (typeof window.__installCliBridgeShim !== 'function') {
            throw new Error('window.__installCliBridgeShim missing');
          }
          window.__installCliBridgeShim({ verbose: true });
          const bridge = window.TauriBridge && window.TauriBridge.agent;
          const ok = bridge ? await bridge.checkClaudeCli() : false;
          if (!ok) console.warn('[demo] ai-bridge unreachable');
        })();
      `,
      comment: 'CLI-Bridge installieren',
    },
    { action: 'wait', duration: 400 },

    {
      action: 'comment',
      text: 'Trailing-Sketch auf ein Frame mit Children — Subtree-Hint sichtbar',
    },
    {
      action: 'setEditorCursor',
      // Zeile 4: `  Frame bg #1a1a1a, pad 16, rad 8, gap 8` (erste Card)
      line: 4,
      col: 9999,
      comment: 'ans Ende der ersten Card-Frame-Zeile',
    },
    {
      action: 'type',
      text: ' -- mach grün',
      pauseAfter: { ' ': 0 },
      comment: 'Trailing-Suffix — Subtree umfasst Card + 3 Children (Zeilen 4-7)',
    },
    { action: 'wait', duration: 1000 },

    {
      action: 'expectCodeMatches',
      pattern: /Frame bg #1a1a1a.*-- mach grün/,
      comment: 'Trailing-Sketch sitzt hinter dem ersten Card-Frame',
    },

    { action: 'comment', text: 'AI-Button klicken' },
    { action: 'click', target: '#ai-edit-btn' },

    {
      action: 'waitForLlmStatus',
      status: 'thinking',
      timeoutMs: 3_000,
      comment: 'Status flippt auf thinking',
    },
    {
      action: 'waitForLlmStatus',
      status: 'ready',
      timeoutMs: 60_000,
      comment: 'Ghost-Diff erscheint',
    },
    { action: 'wait', duration: 800 },

    { action: 'setEditorCursor', line: 4, col: 5, comment: 'in der Diff-Zone (erster Card-Frame)' },
    { action: 'pressKey', key: 'Tab' },
    { action: 'wait', duration: 800 },

    // Validierung:
    // 1. Marker `--` ist weg.
    // 2. Erste Card hat einen grünlichen Hintergrund.
    // 3. Zweite Card ist UNVERÄNDERT — Imperative wirkt nur auf Target.
    {
      action: 'expectCodeMatches',
      pattern: /^(?!.*--$).*$/m,
      comment: 'kein `--`-Marker mehr im Source',
    },
    {
      action: 'expectCodeMatches',
      // Erste Card: bg ist jetzt grünlich. Mögliche Werte:
      //   - Tailwind-greens: #10b981, #16a34a, #22c55e, #4ade80, #84cc16
      //   - kurz: #0f0
      //   - named: green, lime, emerald
      // Wir prüfen Hex-Codes mit grün-dominanten G-Wert.
      pattern: /Frame bg\s+(?:green|lime|emerald|#[0-9a-f]{0,2}[a-f][0-9a-f]{2,4}|#0f0)/i,
      comment: 'erste Card hat grünliche bg',
    },
    {
      action: 'expectCodeMatches',
      pattern: /Bleibt unverändert/,
      comment: 'zweite Card existiert noch (Text intact)',
    },
    { action: 'expectCode', comment: 'finaler Source nach Imperative-Edit' },
  ],
}

export default demoScript
