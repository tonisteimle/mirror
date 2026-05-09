/**
 * Tutorial-Recording: Trailing-Sketch (Imperative)
 *
 * Zeigt das `<code> -- mach grün`-Idiom: User hat schon Code, hängt
 * eine kurze Anweisung ans Element, AI ändert das Element + entfernt
 * den Marker.
 *
 * Aufnahme:
 *   npx tsx tools/test.ts \
 *     --demo=tools/test-runner/demo/scripts/tut-imperative-edit.ts \
 *     --pacing=video --headed \
 *     --window-size=1280x800 \
 *     --record=docs/tutorial/videos/imperative-edit.webm \
 *     --timeout=120000
 */

import type { DemoScript } from '../types'
import { resetCanvas } from '../fragments/setup'
import { tutorialMode } from '../fragments/tutorial-mode'

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
  name: 'Tutorial · Imperative-Edit',
  description: 'Trailing-Sketch ändert das Element davor — AI macht die erste Card grün',
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
    ...resetCanvas({ baseCode: INITIAL_CODE, comment: 'Zwei Cards als Ausgangslage' }),
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
    { action: 'wait', duration: 600 },

    // Trailing-Sketch an die ERSTE Card-Frame-Zeile anhängen.
    { action: 'setEditorCursor', line: 4, col: 9999 },
    {
      action: 'type',
      text: ' -- mach grün',
      pauseAfter: { ' ': 0 },
    },
    { action: 'wait', duration: 1000 },

    // AI-Button klicken.
    { action: 'click', target: '#ai-edit-btn' },
    { action: 'recordingCutStart' },
    { action: 'waitForLlmStatus', status: 'thinking', timeoutMs: 3_000 },
    { action: 'waitForLlmStatus', status: 'ready', timeoutMs: 60_000 },
    { action: 'recordingCutEnd', holdSeconds: 0.6 },
    { action: 'wait', duration: 1000 },

    // Tab akzeptiert. Cursor in die Diff-Zone.
    { action: 'setEditorCursor', line: 4, col: 5 },
    { action: 'pressKey', key: 'Tab' },

    // Finale Pause auf dem Resultat.
    { action: 'wait', duration: 1500 },
  ],
}

export default demoScript
