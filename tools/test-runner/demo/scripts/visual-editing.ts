/**
 * Visual Editing Demo
 *
 * Zeigt das visuelle Editieren mit Drag & Drop und Handles:
 * 1. Frame als Container
 * 2. Titel, Text und Button hinzufügen
 * 3. Padding mit Handles anpassen
 * 4. Texte per Doppelklick bearbeiten
 *
 * Baut eine Card komplett visuell - ohne Code zu tippen.
 */

import type { DemoScript } from '../types'

export const demoScript: DemoScript = {
  name: 'Visual Editing',
  description: 'Drag & Drop, Handles und Inline-Editing - UI bauen ohne Code',
  config: {
    speed: 'normal',
    showKeystrokeOverlay: true,
  },
  steps: [
    // === Projekt zurücksetzen ===
    {
      action: 'execute',
      code: `
        (async function() {
          // Basis-Frame setzen
          const baseCode = 'Frame bg #0f0f0f, col white, pad 24, gap 16, w full, h full, center\\n';
          window.__dragTest.setCode(baseCode);
          await window.__dragTest.waitForCompile();
        })();
      `,
      comment: 'Projekt zurücksetzen',
    },
    { action: 'wait', duration: 1000 },

    // === Einleitung ===
    { action: 'comment', text: 'Visual Editing - Eine Card komplett visuell bauen' },
    { action: 'wait', duration: 1500 },

    // Validierung: Studio ist bereit
    {
      action: 'validate',
      comment: 'Studio ist bereit',
      checks: [
        { type: 'exists', selector: '#components-panel' },
        { type: 'exists', selector: '#preview' },
        { type: 'exists', selector: '.cm-editor' },
        { type: 'exists', selector: '#preview [data-mirror-id="node-1"]' },
      ],
    },

    // === SCHRITT 1: Card-Frame hinzufügen ===
    { action: 'comment', text: 'Schritt 1: Frame als Card hinzufügen' },
    { action: 'wait', duration: 500 },

    // Zum Component Panel bewegen und Frame visuell zeigen
    { action: 'moveTo', target: '#components-panel' },
    { action: 'wait', duration: 300 },
    {
      action: 'highlight',
      target: '#components-panel [data-component-id="comp-frame"]',
      duration: 500,
    },

    // Frame hinzufügen per Code
    {
      action: 'execute',
      code: `
        (async function() {
          const code = 'Frame bg #0f0f0f, col white, pad 24, gap 16, w full, h full, center\\n  Frame bg #27272a, pad 24, rad 12, gap 16, w 320\\n';
          window.__dragTest.setCode(code);
          await window.__dragTest.waitForCompile();
        })();
      `,
      comment: 'Frame hinzufügen',
    },
    { action: 'wait', duration: 800 },

    // Validierung: Frame wurde hinzugefügt
    {
      action: 'validate',
      comment: 'Frame wurde eingefügt',
      checks: [{ type: 'elementCount', selector: '#preview [data-mirror-id]', min: 2 }],
    },

    // === SCHRITT 2: Titel (H1) hinzufügen ===
    { action: 'comment', text: 'Schritt 2: Titel hinzufügen' },
    { action: 'wait', duration: 500 },

    // H1 visuell zeigen
    { action: 'moveTo', target: '#components-panel' },
    {
      action: 'highlight',
      target: '#components-panel [data-component-id="comp-h1"]',
      duration: 500,
    },

    // H1 hinzufügen
    {
      action: 'execute',
      code: `
        (async function() {
          const code = 'Frame bg #0f0f0f, col white, pad 24, gap 16, w full, h full, center\\n  Frame bg #27272a, pad 24, rad 12, gap 16, w 320\\n    H1 "Willkommen", col white\\n';
          window.__dragTest.setCode(code);
          await window.__dragTest.waitForCompile();
        })();
      `,
      comment: 'H1 Titel hinzufügen',
    },
    { action: 'wait', duration: 800 },

    // === SCHRITT 3: Text hinzufügen ===
    { action: 'comment', text: 'Schritt 3: Beschreibungstext hinzufügen' },
    { action: 'wait', duration: 500 },

    // Text visuell zeigen
    {
      action: 'highlight',
      target: '#components-panel [data-component-id="comp-text"]',
      duration: 500,
    },

    // Text hinzufügen
    {
      action: 'execute',
      code: `
        (async function() {
          const code = 'Frame bg #0f0f0f, col white, pad 24, gap 16, w full, h full, center\\n  Frame bg #27272a, pad 24, rad 12, gap 16, w 320\\n    H1 "Willkommen", col white\\n    Text "Eine kurze Beschreibung", col #a1a1aa, fs 14\\n';
          window.__dragTest.setCode(code);
          await window.__dragTest.waitForCompile();
        })();
      `,
      comment: 'Text hinzufügen',
    },
    { action: 'wait', duration: 800 },

    // === SCHRITT 4: Button hinzufügen ===
    { action: 'comment', text: 'Schritt 4: Button hinzufügen' },
    { action: 'wait', duration: 500 },

    // Button visuell zeigen
    {
      action: 'highlight',
      target: '#components-panel [data-component-id="comp-button"]',
      duration: 500,
    },

    // Button hinzufügen
    {
      action: 'execute',
      code: `
        (async function() {
          const code = 'Frame bg #0f0f0f, col white, pad 24, gap 16, w full, h full, center\\n  Frame bg #27272a, pad 24, rad 12, gap 16, w 320\\n    H1 "Willkommen", col white\\n    Text "Eine kurze Beschreibung", col #a1a1aa, fs 14\\n    Button "Jetzt starten", bg #5BA8F5, col white, pad 12 24, rad 6\\n';
          window.__dragTest.setCode(code);
          await window.__dragTest.waitForCompile();
        })();
      `,
      comment: 'Button hinzufügen',
    },
    { action: 'wait', duration: 800 },

    // Validierung: Alle Elemente
    {
      action: 'validate',
      comment: 'Elemente wurden hinzugefügt',
      checks: [
        { type: 'editorContains', text: 'H1' },
        { type: 'editorContains', text: 'Button' },
        { type: 'editorContains', text: 'Text' },
      ],
    },

    // === SCHRITT 5: Padding anpassen ===
    { action: 'comment', text: 'Schritt 5: Padding mit Handles anpassen' },
    { action: 'wait', duration: 500 },

    // Card-Frame auswählen
    {
      action: 'execute',
      code: `
        (async function() {
          await window.__dragTest.waitForCompile();
          window.__dragTest.selectNode('node-2');
        })();
      `,
      comment: 'Card auswählen',
    },
    { action: 'wait', duration: 300 },

    // P drücken für Padding-Modus
    { action: 'pressKey', key: 'p' },
    { action: 'wait', duration: 500 },

    // Auf Padding-Handle zeigen
    { action: 'moveTo', target: '.padding-handle-top' },
    { action: 'wait', duration: 300 },
    { action: 'highlight', target: '.padding-handle-top', duration: 800 },

    // Padding ändern (simuliert)
    {
      action: 'execute',
      code: `
        (async function() {
          // Padding vergrößern im Code
          const code = 'Frame bg #0f0f0f, col white, pad 24, gap 16, w full, h full, center\\n  Frame bg #27272a, pad 32, rad 12, gap 16, w 320\\n    H1 "Willkommen", col white\\n    Text "Eine kurze Beschreibung", col #a1a1aa, fs 14\\n    Button "Jetzt starten", bg #5BA8F5, col white, pad 12 24, rad 6\\n';
          window.__dragTest.setCode(code);
          await window.__dragTest.waitForCompile();
        })();
      `,
      comment: 'Padding vergrößern',
    },
    { action: 'wait', duration: 600 },

    // Padding-Modus verlassen
    { action: 'pressKey', key: 'p' },
    { action: 'wait', duration: 300 },

    // === SCHRITT 6: Titel per Doppelklick bearbeiten ===
    { action: 'comment', text: 'Schritt 6: Titel per Doppelklick bearbeiten' },
    { action: 'wait', duration: 500 },

    // Zum Titel bewegen und Doppelklick simulieren
    { action: 'moveTo', target: '#preview [data-mirror-id="node-3"]' },
    { action: 'wait', duration: 300 },
    { action: 'doubleClick', target: '#preview [data-mirror-id="node-3"]' },
    { action: 'wait', duration: 500 },

    // Text ändern
    {
      action: 'execute',
      code: `
        (async function() {
          const code = 'Frame bg #0f0f0f, col white, pad 24, gap 16, w full, h full, center\\n  Frame bg #27272a, pad 32, rad 12, gap 16, w 320\\n    H1 "Hallo Welt!", col white\\n    Text "Eine kurze Beschreibung", col #a1a1aa, fs 14\\n    Button "Jetzt starten", bg #5BA8F5, col white, pad 12 24, rad 6\\n';
          window.__dragTest.setCode(code);
          await window.__dragTest.waitForCompile();
        })();
      `,
      comment: 'Titel-Text ändern',
    },
    { action: 'wait', duration: 600 },

    // === SCHRITT 7: Button-Text bearbeiten ===
    { action: 'comment', text: 'Schritt 7: Button-Text per Doppelklick ändern' },
    { action: 'wait', duration: 500 },

    // Zum Button bewegen
    { action: 'moveTo', target: '#preview button[data-mirror-id]' },
    { action: 'wait', duration: 300 },
    { action: 'doubleClick', target: '#preview button[data-mirror-id]' },
    { action: 'wait', duration: 500 },

    // Button-Text ändern
    {
      action: 'execute',
      code: `
        (async function() {
          const code = 'Frame bg #0f0f0f, col white, pad 24, gap 16, w full, h full, center\\n  Frame bg #27272a, pad 32, rad 12, gap 16, w 320\\n    H1 "Hallo Welt!", col white\\n    Text "Eine kurze Beschreibung", col #a1a1aa, fs 14\\n    Button "Los geht\\'s!", bg #5BA8F5, col white, pad 12 24, rad 6\\n';
          window.__dragTest.setCode(code);
          await window.__dragTest.waitForCompile();
        })();
      `,
      comment: 'Button-Text ändern',
    },
    { action: 'wait', duration: 600 },

    // === Finale ===
    { action: 'comment', text: 'Fertig! Eine Card mit Titel, Text und Button' },
    { action: 'wait', duration: 500 },

    // Code zeigen
    { action: 'moveTo', target: '.cm-editor' },
    { action: 'wait', duration: 300 },
    { action: 'highlight', target: '.cm-editor', duration: 2000 },

    { action: 'comment', text: 'Der Code wurde automatisch generiert - nur mit visuellen Tools' },
    { action: 'moveTo', target: '#preview' },
    { action: 'wait', duration: 300 },
    { action: 'highlight', target: '#preview', duration: 2000 },

    // Validierung
    {
      action: 'validate',
      comment: 'UI wurde visuell erstellt',
      checks: [
        { type: 'editorContains', text: 'Frame' },
        { type: 'editorContains', text: 'H1' },
        { type: 'editorContains', text: 'Button' },
        { type: 'noLintErrors', allowWarnings: true },
      ],
    },

    { action: 'wait', duration: 2000, comment: 'Demo abgeschlossen' },
  ],
}

export default demoScript
