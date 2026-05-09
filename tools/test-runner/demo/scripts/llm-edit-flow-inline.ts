/**
 * LLM-Edit-Flow Demo · Inline-Start mit Block (Variant 3)
 *
 * Öffnender Marker mit Inhalt direkt dahinter, dann mehrere Inhalts-
 * zeilen, dann `--` allein als Schluss. Detector erkennt das als
 * mehrzeiligen Block; der Inhalt der Open-Zeile wird zur ersten
 * Sketch-Zeile.
 *
 * Voraussetzungen wie bei llm-edit-flow.ts (ai-bridge + studio).
 */

import type { DemoScript } from '../types'
import { resetCanvas, validateStudioReady } from '../fragments/setup'

const INITIAL_CODE =
  'canvas mobile, bg #0f0f0f, col white, font sans\n' +
  '\n' +
  'Frame pad 24, gap 16\n' +
  '  Text "Dashboard", fs 24, weight bold\n' +
  '  Text "Übersicht über deine Aktivitäten", col #888'

const INLINE_START_DRAFT =
  '\n' + '  -- füge ein dropdown ein\n' + '  mit den optionen berlin hamburg münchen\n' + '  --'

export const demoScript: DemoScript = {
  name: 'LLM Edit Flow · Inline-Start Block',
  description: 'Variant 3: `-- inhalt`\\n  weiter\\n--',
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

    { action: 'comment', text: 'Inline-Start Sketch: `-- inhalt`\\n weiter\\n--' },
    {
      action: 'setEditorCursor',
      line: 5,
      col: 9999,
      comment: 'ans Ende der letzten Zeile',
    },
    {
      action: 'type',
      text: INLINE_START_DRAFT,
      pauseAfter: { ' ': 0 },
      comment: 'Open-Marker mit Inline-Inhalt + Inhaltszeile + Schluss-Marker',
    },
    { action: 'wait', duration: 800 },

    {
      action: 'expectCodeMatches',
      pattern: /^\s*--\s+füge ein dropdown ein[\s\S]+optionen berlin[\s\S]+^\s*--\s*$/m,
      comment: 'Inline-Start Block-Sketch im Source',
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

    { action: 'setEditorCursor', line: 7, col: 5, comment: 'in der Sketch-Mitte' },
    { action: 'pressKey', key: 'Tab' },
    { action: 'wait', duration: 600 },

    {
      action: 'expectCodeMatches',
      pattern: /^(?!.*--$).*$/m,
      comment: 'finaler Source enthält keinen `--`-Marker mehr',
    },
    {
      action: 'expectCodeMatches',
      pattern: /berlin/i,
      comment: 'Optionen-Inhalt überlebt',
    },
    { action: 'expectCode', comment: 'finaler Source nach Inline-Start-Sketch-Übersetzung' },
  ],
}

export default demoScript
