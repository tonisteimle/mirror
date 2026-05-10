/**
 * Tutorial-Recording: Multi-File-Projekt
 *
 * Tokens und Komponenten in eigene Files auslagern: tokens.tok wird
 * angelegt, im File-Explorer sichtbar, dann referenziert das Layout
 * den Token via $name. Cmd+P-Quick-Switch wird per createFile +
 * switchFile-Pair gezeigt.
 *
 * Aufnahme:
 *   npx tsx tools/test.ts \
 *     --demo=tools/test-runner/demo/scripts/tut-08-multi-file.ts \
 *     --pacing=video --headed \
 *     --window-size=1280x800 \
 *     --record=docs/tutorial/videos/tut-08-multi-file.webm \
 *     --timeout=120000
 */

import type { DemoScript } from '../types'
import { resetMultiFileProject } from '../fragments/multi-file'

const INDEX_BASE = 'canvas mobile, bg #0f0f0f, col white, font sans'

const TOKENS_TOK = ['// Design Tokens', 'primary.bg: #2271C1', 'card.pad: 20', 'card.rad: 12'].join(
  '\n'
)

export const demoScript: DemoScript = {
  name: 'Tutorial · Multi-File',
  description: 'tokens.tok anlegen, zurück zu index.mir, $primary nutzen',
  config: {
    speed: 'normal',
    showKeystrokeOverlay: false,
    customTimings: {
      type: {
        charMs: 35,
        variance: 0.2,
        wordPauseMs: 0,
        linePauseMs: 200,
        thoughtPauseMs: 300,
      },
    },
  },
  steps: [
    ...resetMultiFileProject({ baseCode: INDEX_BASE, comment: 'Leeres Projekt' }),

    // File-Explorer behalten, restliche Panels weg (nach dem Reset!)
    {
      action: 'execute',
      code: `
        (async () => {
          const dt = window.__dragTest;
          if (!dt || typeof dt.hidePanel !== 'function') return;
          for (const name of ['prompt', 'components', 'design-system', 'property']) {
            try { dt.hidePanel(name); } catch (e) { /* ignore */ }
          }
          if (typeof dt.showPanel === 'function') {
            try { dt.showPanel('files'); } catch (e) { /* ignore */ }
          }
          await new Promise(r => setTimeout(r, 250));
        })();
      `,
      comment: 'File-Explorer + Code + Preview sichtbar',
    },
    { action: 'wait', duration: 800 },

    // tokens.tok anlegen + reinwechseln
    {
      action: 'createFile',
      path: 'tokens.tok',
      content: TOKENS_TOK,
      switchTo: true,
      comment: 'tokens.tok angelegt',
    },
    {
      action: 'expectCode',
      comment: 'tokens.tok contents',
      code: TOKENS_TOK,
    },
    { action: 'wait', duration: 1500 },

    // Zurück nach index.mir
    { action: 'switchFile', path: 'index.mir', comment: 'zurück nach index.mir' },
    {
      action: 'expectCode',
      comment: 'after switchFile (back to index.mir)',
      code: INDEX_BASE,
    },
    { action: 'wait', duration: 800 },

    // Eine Card-Zeile mit $primary tippen
    { action: 'setEditorCursor', line: 1, col: 9999 },
    { action: 'wait', duration: 300 },
    {
      action: 'type',
      text: '\n\n' + 'Frame bg $primary, pad $card, rad $card, w 240, h 120',
      comment: 'Frame mit Token-Referenzen',
    },
    {
      action: 'expectCode',
      comment: 'after typing frame',
      code:
        'canvas mobile, bg #0f0f0f, col white, font sans\n' +
        '\n' +
        'Frame bg $primary, pad $card, rad $card, w 240, h 120',
    },
    { action: 'wait', duration: 1500 },

    // Endbild
    { action: 'moveTo', target: '#preview' },
    { action: 'wait', duration: 1500, comment: 'Endbild für Loop' },
  ],
}

export default demoScript
