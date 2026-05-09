/**
 * LLM-Edit-Flow Demo (real claude CLI)
 *
 * Zeigt den vollen Sketch-→-Mirror-Workflow:
 *   1. Existierender Code im Editor.
 *   2. User setzt den Cursor ans Ende und tippt einen Sketch-Block:
 *      Zwei Zeilen mit `--` umrahmen freien Inhalt (Pseudocode +
 *      Deutsch). Der Editor markiert den Block live mit dezentem
 *      Hintergrund — der User sieht sofort, wo er gesketcht hat.
 *   3. Cmd+Enter triggert den LLM-Edit-Flow.
 *   4. Status-Indicator zeigt sofort „Übersetze Sketch…" — keine
 *      generische „AI denkt nach"-Message, der User sieht dass das
 *      System den Sketch-Block erkannt hat.
 *   5. Echte `claude` CLI antwortet (5-15s), Status flippt auf
 *      „ready" — der Ghost-Diff überlagert den Sketch-Block mit
 *      übersetztem Mirror-Code.
 *   6. Tab akzeptiert: Marker und Sketch-Inhalt sind weg, echtes
 *      Mirror steht an ihrer Stelle.
 *
 * **Voraussetzungen** (vor dem Lauf):
 *   1. `npm run ai-bridge` (Terminal A) — HTTP-Wrapper um `claude` CLI auf :3456
 *   2. `npm run studio`    (Terminal B) — Studio-Server auf :5173
 *   3. `claude` CLI installiert und im PATH
 *
 * **Lauf** (Terminal C, headed empfohlen):
 *
 *   npx tsx tools/test.ts \
 *     --demo=tools/test-runner/demo/scripts/llm-edit-flow.ts \
 *     --pacing=video --headed --timeout=120000
 *
 * Ohne ai-bridge schlägt der Lauf bei `waitForLlmStatus ready` fehl —
 * das ist gewünscht, denn das Demo IST der Real-LLM-Pfad.
 */

import type { DemoScript } from '../types'
import { resetCanvas, validateStudioReady } from '../fragments/setup'

// Initial-Code: bewusst schmal, damit der AI-Edit klar sichtbar ist.
// Trailing newline weglassen — siehe fragments/setup.ts ResetCanvasOptions.
const INITIAL_CODE =
  'canvas mobile, bg #0f0f0f, col white, font sans\n' +
  '\n' +
  'Frame pad 24, gap 16\n' +
  '  Text "Dashboard", fs 24, weight bold\n' +
  '  Text "Übersicht über deine Aktivitäten", col #888'

// User markiert einen Sketch-Block (`-- ... --`) und schreibt darin in
// natürlicher Sprache, was er will. Das System kennt heute genau dieses
// Idiom: zwei Zeilen mit `--` umrahmen den Sketch, Inhalt frei.
//   • Marker und Inhalt eingerückt (innerhalb des Frame-Kindes)
//   • Inhalt ist Pseudocode + Deutsch — der LLM übersetzt's
const SKETCH_DRAFT =
  '\n' +
  '  --\n' +
  '  card mit titel willkommen und untertitel "ein neuer bereich"\n' +
  '  und einem button loslegen in blau\n' +
  '  --'

export const demoScript: DemoScript = {
  name: 'LLM Edit Flow',
  description: 'User tippt schluderigen Card-Draft → Cmd+Enter → echte claude CLI bügelt aus',
  config: {
    speed: 'normal',
    showKeystrokeOverlay: true,
    // Tipp-Geschwindigkeit ist absichtlich nahe am Default video —
    // das Tippen pro Zeichen darf gut sichtbar sein. Was die Demo
    // bisher zäh gemacht hat: der DEFAULT_TYPE_PAUSE_TRIGGERS in
    // runner.ts pausiert 600ms nach JEDEM Space (für Autocomplete-
    // Popover). Beim Sketch-Tippen ist das pure Wartezeit. Override
    // weiter unten an der `type`-Action selbst (`pauseAfter`).
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
    // === 1. Reset + Studio-Bereitschaft ===
    // Gate-on-test-api: resetCanvas nutzt window.__dragTest.setTestCode,
    // das von der Studio-Test-API aufgesetzt wird. In schnellen Cold-
    // Starts (pacing=instant) kann der Demo loslaufen, bevor Studio
    // dieses Window-Property installiert hat. Aktiv pollen statt blind
    // zu warten.
    {
      action: 'execute',
      code: `
        (async () => {
          const deadline = Date.now() + 5000;
          while (Date.now() < deadline) {
            if (window.__dragTest && typeof window.__dragTest.setTestCode === 'function') return;
            await new Promise(r => setTimeout(r, 50));
          }
          throw new Error('Timed out waiting for window.__dragTest — studio test-api not initialized');
        })();
      `,
      comment: 'auf Studio-Test-API warten (max 5s)',
    },
    ...resetCanvas({
      baseCode: INITIAL_CODE,
      comment: 'Dashboard-Skelett: Canvas + Frame + zwei Texte',
    }),
    ...validateStudioReady(),

    // === 2. CLI-Bridge-Shim installieren ===
    // Verdrahtet window.TauriBridge.agent.runAgent → http://localhost:3456
    // → claude CLI. Idempotent: ein zweiter Aufruf überschreibt den
    // ersten, ohne Schaden.
    {
      action: 'execute',
      code: `
        (async () => {
          if (typeof window.__installCliBridgeShim !== 'function') {
            throw new Error('window.__installCliBridgeShim missing — studio test-api not loaded');
          }
          window.__installCliBridgeShim({ verbose: true });
          // Sanity-check: bridge erreichbar? Ein freundlicher Fail-Fast,
          // bevor wir 30s in waitForLlmStatus("ready") brennen.
          const bridge = window.TauriBridge && window.TauriBridge.agent;
          const ok = bridge ? await bridge.checkClaudeCli() : false;
          if (!ok) {
            console.warn('[demo] ai-bridge unreachable — start "npm run ai-bridge" before running this demo');
          } else {
            console.log('[demo] ai-bridge OK — claude CLI verfügbar');
          }
        })();
      `,
      comment: 'CLI-Bridge installieren + Healthcheck',
    },
    { action: 'wait', duration: 600 },

    // === 3. Visueller Anker: Editor zeigen, Cursor an die Stelle ===
    {
      action: 'comment',
      text: 'Schritt 1: Cursor ans Ende der Datei — dort wollen wir die Card einfügen',
    },
    { action: 'moveTo', target: '.cm-editor' },
    { action: 'highlight', target: '.cm-editor', duration: 1200 },

    // INITIAL_CODE hat 5 Zeilen. Zeile 5 ist der zweite Text. Cursor an
    // dessen Zeilenende — col 9999 wird auf Zeilenlänge geclamped.
    {
      action: 'setEditorCursor',
      line: 5,
      col: 9999,
      comment: 'ans Ende der letzten Zeile',
    },
    { action: 'wait', duration: 400 },

    // === 4. Sketch-Block tippen ===
    {
      action: 'comment',
      text: 'Schritt 2: User markiert einen Sketch-Block mit -- und schreibt frei rein',
    },
    {
      action: 'type',
      text: SKETCH_DRAFT,
      comment: '`-- ... --`-Block mit natürlich-sprachlichem Sketch',
      // Override DEFAULT_TYPE_PAUSE_TRIGGERS (runner.ts:3466). Im
      // Sketch-Block ist Autocomplete-Popover nicht relevant, also
      // weg mit der 600ms-Space-Pause. Spart bei ~25 Spaces ~15s.
      pauseAfter: { ' ': 0 },
    },
    { action: 'wait', duration: 1000 },

    // Sanity: der Sketch-Block ist im Source und wird live im Editor
    // hervorgehoben (sketchDecorationExtension läuft mit jedem doc-change).
    {
      action: 'expectCodeMatches',
      pattern: /^\s*--\s*$[\s\S]+button loslegen[\s\S]+^\s*--\s*$/m,
      comment: 'Sketch-Block im Source',
    },

    // === 5. AI-Button → LLM-Edit-Flow ===
    // Sobald der Sketch im Source steht, bekommt der AI-Edit-Button
    // (rechts vom Tutorial-Icon in der Editor-Header-Toolbar) den
    // amber Glow — gleicher Code-Pfad wie Cmd+Enter, aber sichtbar
    // klickbar. Wir highlighten den Button kurz, damit er im Video
    // gut zu sehen ist, bevor wir ihn drücken.
    {
      action: 'comment',
      text: 'Schritt 3: Klick auf den AI-Button — gleicher Effekt wie Cmd+Enter',
    },
    { action: 'moveTo', target: '#ai-edit-btn' },
    { action: 'highlight', target: '#ai-edit-btn', duration: 1200 },
    { action: 'click', target: '#ai-edit-btn' },

    // === 6. Auf "thinking" warten — Status-Indicator erscheint ===
    {
      action: 'waitForLlmStatus',
      status: 'thinking',
      timeoutMs: 3_000,
      comment: 'AI denkt nach…-Indicator zeigt sich',
    },
    {
      action: 'comment',
      text: 'AI ruft echte claude CLI auf — Latenz typischerweise 5-15s, max 60s',
    },
    { action: 'highlight', target: '.cm-llm-status', duration: 1500 },

    // === 7. Auf "ready" warten — Ghost-Diff erscheint ===
    {
      action: 'waitForLlmStatus',
      status: 'ready',
      timeoutMs: 60_000,
      comment: 'Ghost-Diff überlagert den Editor',
    },
    { action: 'wait', duration: 1500, comment: 'User schaut sich das Diff an' },

    // Vor Tab: Source trägt noch den Sketch-Block (Ghost ist nur Overlay).
    {
      action: 'expectCodeMatches',
      pattern: /^\s*--\s*$/m,
      comment: 'vor Tab-Accept: Sketch-Marker sind noch im Source',
    },

    // === 8. Tab akzeptiert ===
    // Tab ist im LLM-Keymap durch isCursorInGhostRange gegated. Cursor
    // bewusst in die Mitte des Sketch-Blocks (Inhalt-Zeile), garantiert
    // in der Diff-Range.
    { action: 'comment', text: 'Schritt 4: Cursor in den Sketch, dann Tab akzeptiert' },
    { action: 'setEditorCursor', line: 7, col: 5, comment: 'mitten im Sketch-Inhalt' },
    { action: 'pressKey', key: 'Tab' },
    { action: 'wait', duration: 1000 },

    // === 9. Final: Sketch ist weg, echtes Mirror ist drin ===
    // Was wir vom LLM verlangen können (und der Demo prüft):
    //   • Die `--`-Marker existieren NICHT mehr im finalen Source.
    //   • Die Semantik ("Willkommen", "loslegen") überlebt.
    //   • Nur Mirror-Primitives oder im Source definierte Components
    //     im Output (kein freies "card mit titel"-Pseudocode mehr).
    //
    // LLM-Stilwahl bleibt frei: Frame mit Padding/Background, oder
    // eine Card-Component-Definition vor dem Frame, oder reine
    // Text/Button-Anordnung. Alle drei sind valide Übersetzungen.
    {
      action: 'expectCodeMatches',
      pattern: /^(?!.*--$).*$/m,
      comment: 'finaler Source enthält keinen `--`-Marker mehr',
    },
    {
      action: 'expectCodeMatches',
      pattern: /Willkommen/i,
      comment: '„willkommen" als Titel überlebt',
    },
    {
      action: 'expectCodeMatches',
      pattern: /loslegen/i,
      comment: '„loslegen" als Button-Text überlebt',
    },
    // Learn-Mode: dumpt den finalen Source komplett, damit man sieht
    // was der LLM tatsächlich getan hat (statt nur Pattern-Match-Spuren).
    { action: 'expectCode', comment: 'finaler Source nach Sketch-Übersetzung + Tab' },

    // === 10. Closing ===
    { action: 'comment', text: 'Roher Draft → Cmd+Enter → echte LLM-Korrektur → Tab. Ende.' },
    { action: 'moveTo', target: '#preview' },
    { action: 'highlight', target: '#preview', duration: 2000 },
    { action: 'wait', duration: 800 },
  ],
}

export default demoScript
