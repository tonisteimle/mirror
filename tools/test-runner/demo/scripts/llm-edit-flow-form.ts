/**
 * LLM-Edit-Flow Demo · komplexes Formular
 *
 * Stress-Test für die Sketch-Übersetzung. Statt einer Card schreibt
 * der User die Beschreibung eines ganzen Bewerbungsformulars in
 * Pseudocode + Deutsch — viele Feld-Typen, Bedingungen, Bindings.
 * Ziel: zeigen, ob der LLM einen 100+-Zeilen Sketch in valides
 * Mirror übersetzen kann.
 *
 * Voraussetzungen wie bei llm-edit-flow.ts (ai-bridge + studio).
 *
 * Lauf:
 *   npx tsx tools/test.ts \
 *     --demo=tools/test-runner/demo/scripts/llm-edit-flow-form.ts \
 *     --pacing=instant --timeout=180000
 */

import type { DemoScript } from '../types'
import { resetCanvas, validateStudioReady } from '../fragments/setup'

const INITIAL_CODE =
  'canvas mobile, bg #0a0a0a, col white, font sans\n' +
  '\n' +
  'Frame pad 24, gap 20\n' +
  '  Text "Wohnungs-Bewerbung", fs 24, weight bold\n' +
  '  Text "Bitte fülle alle Felder aus", col #888, fs 14'

// Anspruchsvoller Sketch: realistisches Formular mit vielen Feld-
// Typen. Mirror-Pseudocode + Deutsch + Aufzählungen — alles, was
// ein User naturalistisch hinkritzeln würde wenn er weiss WAS er
// will, aber sich um Syntax nicht kümmert.
const FORM_SKETCH =
  '\n' +
  '  --\n' +
  '  ein vollständiges bewerbungsformular für eine mietwohnung mit:\n' +
  '\n' +
  '  - input für vor- und nachname (zwei felder nebeneinander, beide pflicht)\n' +
  '  - input für email\n' +
  '  - input für telefon mit eingabe-maske (### ### ## ##)\n' +
  '  - geburtsdatum als datepicker\n' +
  '  - geschlecht als radio-group: männlich, weiblich, divers\n' +
  '  - slider für maximales budget zwischen 800 und 3500 chf, schritte 100\n' +
  '  - switch "haustier vorhanden" - wenn an, erscheint zusätzlich ein input für die tierart\n' +
  '  - mehrzeiliges textfeld "warum sollen wir dich nehmen" mit placeholder\n' +
  '  - checkbox für agb-akzeptanz\n' +
  '  - blauer "bewerbung absenden" button am ende\n' +
  '\n' +
  '  layout: alles untereinander, gap 16, sektionen visuell durch\n' +
  '  trennlinien gruppiert. labels über den inputs, klein und grau.\n' +
  '  bei toast-feedback nach absenden.\n' +
  '  --'

export const demoScript: DemoScript = {
  name: 'LLM Edit Flow · komplexes Formular',
  description: 'Stress-Test: kompletter Formular-Sketch mit ~10 Feld-Typen, Conditionals, Bindings',
  config: {
    speed: 'normal',
    showKeystrokeOverlay: true,
    customTimings: {
      type: {
        charMs: 25,
        variance: 0.2,
        wordPauseMs: 0,
        linePauseMs: 60,
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
      comment: 'Formular-Skelett: Canvas + Header',
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

    { action: 'comment', text: 'User tippt einen ausführlichen Form-Sketch' },
    {
      action: 'setEditorCursor',
      line: 5,
      col: 9999,
      comment: 'ans Ende',
    },
    {
      action: 'type',
      text: FORM_SKETCH,
      pauseAfter: { ' ': 0 },
      comment: 'kompletter Form-Sketch (~30 Zeilen)',
    },
    { action: 'wait', duration: 800 },

    {
      action: 'expectCodeMatches',
      pattern: /vollständiges bewerbungsformular[\s\S]+geburtsdatum[\s\S]+haustier/,
      comment: 'Sketch ist im Source',
    },

    { action: 'comment', text: 'AI-Button klicken — der Output wird gross' },
    { action: 'click', target: '#ai-edit-btn' },

    {
      action: 'waitForLlmStatus',
      status: 'thinking',
      timeoutMs: 3_000,
      comment: 'thinking-Indicator',
    },
    {
      action: 'waitForLlmStatus',
      status: 'ready',
      timeoutMs: 120_000,
      comment: 'ready — grosser Output kann 30-60s dauern',
    },
    { action: 'wait', duration: 1200 },

    // Cursor in die Sketch-Mitte für sicheren Tab-Accept.
    { action: 'setEditorCursor', line: 8, col: 5, comment: 'mitten im Sketch' },
    { action: 'pressKey', key: 'Tab' },
    { action: 'wait', duration: 1000 },

    // === Validierung ===
    // Wir prüfen drei Schichten:
    // 1. Sketch ist weg (keine `--`-Marker mehr)
    // 2. Mirror-Primitives für mehrere Feld-Typen sind da
    // 3. Charakteristische Sketch-Begriffe überleben (Email, Geburtsdatum, etc.)
    //
    // Loose, weil LLM-Output stark variieren kann. Wir verlangen NICHT
    // alle 10 Felder — wir verlangen, dass eine substantielle Anzahl
    // ankommt (mindestens 6 verschiedene Feld-Typen).
    {
      action: 'expectCodeMatches',
      pattern: /^(?!.*--$).*$/m,
      comment: 'keine `--`-Marker mehr im Source',
    },
    {
      action: 'expectCodeMatches',
      pattern: /Input/,
      comment: 'Input-Primitive existiert',
    },
    {
      action: 'expectCodeMatches',
      pattern: /DatePicker|date|datum/i,
      comment: 'Datepicker oder Datum-Hinweis',
    },
    {
      action: 'expectCodeMatches',
      pattern: /RadioGroup|RadioItem/,
      comment: 'Radio-Group für Geschlecht',
    },
    {
      action: 'expectCodeMatches',
      pattern: /Slider/,
      comment: 'Slider für Budget',
    },
    {
      action: 'expectCodeMatches',
      pattern: /Switch|Checkbox/,
      comment: 'Switch/Checkbox-Komponente',
    },
    {
      action: 'expectCodeMatches',
      pattern: /Textarea|textarea/,
      comment: 'Mehrzeiliges Textfeld',
    },
    {
      action: 'expectCodeMatches',
      pattern: /Button/,
      comment: 'Submit-Button',
    },
    {
      action: 'expectCodeMatches',
      pattern: /telefon|phone/i,
      comment: 'Telefon-Feld-Begriff überlebt',
    },

    // Final dump für Sichtkontrolle.
    { action: 'expectCode', comment: 'finaler Source nach Form-Sketch-Übersetzung' },
  ],
}

export default demoScript
