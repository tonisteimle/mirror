/**
 * Validation Test Demo
 *
 * Ein einfaches Demo-Script zum Testen des Validierungssystems.
 * Führt verschiedene Validierungstypen aus, um sicherzustellen,
 * dass das System korrekt funktioniert.
 */

import type { DemoScript } from '../types'

export const demoScript: DemoScript = {
  name: 'Validation System Test',
  description: 'Testet alle Validierungstypen des Demo-Systems',
  config: {
    speed: 'fast',
    showKeystrokeOverlay: false,
  },
  steps: [
    // === Test 1: exists ===
    { action: 'comment', text: 'Test 1: Element existiert (exists)' },
    {
      action: 'validate',
      comment: 'Basis-Elemente existieren',
      checks: [
        { type: 'exists', selector: '#file-tree-content' },
        { type: 'exists', selector: '.cm-editor' },
        { type: 'exists', selector: '#preview' },
      ],
    },

    // === Test 2: fileExists ===
    { action: 'comment', text: 'Test 2: Datei existiert (fileExists)' },
    {
      action: 'validate',
      comment: 'index.mir existiert',
      checks: [{ type: 'fileExists', path: 'index.mir' }],
    },

    // === Test 3: elementCount ===
    { action: 'comment', text: 'Test 3: Element-Anzahl (elementCount)' },
    {
      action: 'validate',
      comment: 'File-Tree hat Dateien',
      checks: [
        { type: 'elementCount', selector: '#file-tree-content [data-path]', min: 1 },
      ],
    },

    // === Test 4: Editor-Interaktion und editorContains ===
    { action: 'comment', text: 'Test 4: Editor-Inhalt (editorContains)' },
    { action: 'moveTo', target: '.cm-editor' },
    { action: 'click' },
    { action: 'wait', duration: 300 },

    // Ctrl+A / Cmd+A um alles zu selektieren, dann überschreiben
    { action: 'pressKey', key: 'a', modifiers: ['Meta'] },
    { action: 'type', text: '// Test Content\nFrame bg #2271C1, pad 16\n  Text "Hello Validation"' },
    { action: 'wait', duration: 500 },

    {
      action: 'validate',
      comment: 'Test-Content im Editor',
      checks: [
        { type: 'editorContains', text: '// Test Content' },
        { type: 'editorContains', text: 'Frame bg #2271C1' },
        { type: 'editorContains', text: 'Hello Validation' },
      ],
    },

    // === Test 5: Preview-Validierung ===
    { action: 'comment', text: 'Test 5: Preview-Inhalt (previewContains)' },
    { action: 'wait', duration: 1500, comment: 'Warte auf Kompilierung' },

    {
      action: 'validate',
      comment: 'Preview zeigt kompiliertes Element',
      checks: [
        // Check for any rendered element in preview (using data-mirror-id which all elements have)
        { type: 'elementCount', selector: '#preview [data-mirror-id]', min: 1 },
      ],
    },

    // === Abschluss ===
    { action: 'comment', text: 'Alle Validierungstests abgeschlossen!' },
    { action: 'wait', duration: 500 },
  ],
}

export default demoScript
