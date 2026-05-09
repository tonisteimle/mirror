/**
 * LLM-Edit-Flow Demo · Single-line Sketch (Variant 2)
 *
 * Eine Zeile, ein `--`-Marker, freier Text — kein Schluss-Marker. Der
 * Detector erkennt das als Single-line-Sketch; der LLM übersetzt nur
 * diese eine Zeile in echten Mirror-Code.
 *
 * Voraussetzungen wie bei llm-edit-flow.ts (ai-bridge + studio).
 *
 * Lauf:
 *   npx tsx tools/test.ts \
 *     --demo=tools/test-runner/demo/scripts/llm-edit-flow-singleline.ts \
 *     --pacing=instant --timeout=120000
 */

import type { DemoScript } from '../types'
import { resetCanvas, validateStudioReady } from '../fragments/setup'

const INITIAL_CODE =
  'canvas mobile, bg #0f0f0f, col white, font sans\n' +
  '\n' +
  'Frame pad 24, gap 16\n' +
  '  Text "Dashboard", fs 24, weight bold\n' +
  '  Text "Übersicht über deine Aktivitäten", col #888'

const SINGLE_LINE_DRAFT = '\n  -- füge ein blauer button mit text loslegen ein'

export const demoScript: DemoScript = {
  name: 'LLM Edit Flow · Single-line Sketch',
  description: 'Variant 2: `-- inhalt` als single-line, kein Schluss-Marker',
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
      comment: 'Dashboard-Skelett mit zwei Texts',
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
      comment: 'CLI-Bridge installieren + Healthcheck',
    },
    { action: 'wait', duration: 400 },

    { action: 'comment', text: 'Single-line Sketch: `-- ...` ohne Schluss-Marker' },
    {
      action: 'setEditorCursor',
      line: 5,
      col: 9999,
      comment: 'ans Ende der letzten Zeile',
    },
    {
      action: 'type',
      text: SINGLE_LINE_DRAFT,
      pauseAfter: { ' ': 0 },
      comment: 'Eine Zeile mit `-- ...` — kein Schluss-Marker',
    },
    { action: 'wait', duration: 600 },

    {
      action: 'expectCodeMatches',
      pattern: /^\s*--\s+füge ein blauer button/m,
      comment: 'Single-line Sketch im Source',
    },

    { action: 'comment', text: 'Klick auf den AI-Button' },
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

    { action: 'setEditorCursor', line: 6, col: 5, comment: 'in der Sketch-Line' },
    { action: 'pressKey', key: 'Tab' },
    { action: 'wait', duration: 600 },

    {
      action: 'expectCodeMatches',
      pattern: /^(?!.*--$).*$/m,
      comment: 'finaler Source enthält keinen `--`-Marker mehr',
    },
    {
      action: 'expectCodeMatches',
      pattern: /Button/,
      comment: 'Mirror-Button-Primitive ist drin',
    },
    {
      action: 'expectCodeMatches',
      pattern: /loslegen/i,
      comment: 'Button-Text überlebt',
    },
    { action: 'expectCode', comment: 'finaler Source nach Single-line-Sketch-Übersetzung' },
  ],
}

export default demoScript
