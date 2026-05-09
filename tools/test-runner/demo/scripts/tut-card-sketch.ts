/**
 * Tutorial-Recording: Card-Sketch
 *
 * Reduzierte Variante des LLM-Edit-Flow-Demos für Tutorial-Aufnahmen:
 *   - Tutorial-Mode (nur Code + Preview)
 *   - Keine expectCode/expectDom-Validierungen
 *   - Keine moveTo/highlight/comment-Choreografie zwischen Schritten
 *   - Finale Pause auf Resultat (1.5s) für Loop-Anschluss
 *   - Keystroke-Overlay aus
 *
 * Aufnahme:
 *   npx tsx tools/test.ts \
 *     --demo=tools/test-runner/demo/scripts/tut-card-sketch.ts \
 *     --pacing=video --headed \
 *     --window-size=1280x800 \
 *     --record=docs/tutorial/videos/card-sketch.webm \
 *     --timeout=120000
 */

import type { DemoScript } from '../types'
import { resetCanvas } from '../fragments/setup'
import { tutorialMode } from '../fragments/tutorial-mode'

const INITIAL_CODE =
  'canvas mobile, bg #0f0f0f, col white, font sans\n' +
  '\n' +
  'Frame pad 24, gap 16\n' +
  '  Text "Dashboard", fs 24, weight bold\n' +
  '  Text "Übersicht über deine Aktivitäten", col #888'

const SKETCH_DRAFT =
  '\n' +
  '  --\n' +
  '  card mit titel willkommen und untertitel "ein neuer bereich"\n' +
  '  und einem button loslegen in blau\n' +
  '  --'

export const demoScript: DemoScript = {
  name: 'Tutorial · Card-Sketch',
  description: 'AI übersetzt einen `-- ... --`-Block in eine echte Mirror-Card',
  config: {
    speed: 'normal',
    showKeystrokeOverlay: false,
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
    // Wait until studio test-api is mounted before any other action.
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
    ...tutorialMode(),
    ...resetCanvas({ baseCode: INITIAL_CODE, comment: 'Dashboard-Skelett' }),
    {
      action: 'execute',
      code: `
        (async () => {
          if (typeof window.__installCliBridgeShim !== 'function') {
            throw new Error('window.__installCliBridgeShim missing');
          }
          window.__installCliBridgeShim({ verbose: false });
          const bridge = window.TauriBridge && window.TauriBridge.agent;
          if (bridge) await bridge.checkClaudeCli();
        })();
      `,
      comment: 'CLI-Bridge installieren',
    },
    { action: 'wait', duration: 400 },

    // Cursor ans Ende, Sketch-Block tippen.
    { action: 'setEditorCursor', line: 5, col: 9999 },
    {
      action: 'type',
      text: SKETCH_DRAFT,
      pauseAfter: { ' ': 0 },
    },
    { action: 'wait', duration: 800 },

    // AI-Button klicken — gleicher Pfad wie Cmd+Enter.
    { action: 'click', target: '#ai-edit-btn' },
    // Cut-Marker um die LLM-Wait — im Recording sieht der User den Klick,
    // dann eine kurze Pause (holdSeconds), dann den Ghost-Diff. Die echten
    // 5-15s Wait fallen weg.
    { action: 'recordingCutStart' },
    { action: 'waitForLlmStatus', status: 'thinking', timeoutMs: 3_000 },
    { action: 'waitForLlmStatus', status: 'ready', timeoutMs: 60_000 },
    { action: 'recordingCutEnd', holdSeconds: 0.6 },
    { action: 'wait', duration: 1000 },

    // Tab akzeptiert.
    { action: 'setEditorCursor', line: 7, col: 5 },
    { action: 'pressKey', key: 'Tab' },

    // Finale Pause auf dem Resultat — Loop-Pause.
    { action: 'wait', duration: 1500 },
  ],
}

export default demoScript
