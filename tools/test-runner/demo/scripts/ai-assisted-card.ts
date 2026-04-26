/**
 * AI-Assisted Card Demo
 *
 * User schreibt einen Prompt mit Mirror's `--`-Marker, AI generiert Code,
 * User verfeinert das Ergebnis via Property-Panel + Inline-Edit.
 *
 * Spec: docs/concepts/ai-assisted-card-demo.md
 *
 * Mock-Lauf:
 *   npx tsx tools/test.ts \
 *     --demo=tools/test-runner/demo/scripts/ai-assisted-card.ts \
 *     --ai-mock=tools/test-runner/demo/fixtures/ai-assisted-card.json \
 *     --pacing=video --headed
 */

import type { DemoScript } from '../types'
import { resetCanvas, validateStudioReady } from '../fragments/setup'

export const demoScript: DemoScript = {
  name: 'AI Assisted Card',
  description: 'Mirror "--"-Marker → AI generiert UI → User verfeinert via Properties',
  config: {
    speed: 'normal',
    showKeystrokeOverlay: true,
  },
  steps: [
    // === 1. Reset ===
    ...resetCanvas(),
    { action: 'comment', text: 'AI generiert eine Card aus einem Prompt' },
    { action: 'wait', duration: 800 },
    ...validateStudioReady(),

    // === 2. AI-Prompt: User tippt ?? <text> ?? — der zweite ?? sendet automatisch ===
    { action: 'comment', text: 'Schritt 1: Prompt schreiben — die AI macht den Rest' },
    {
      action: 'aiPrompt',
      prompt: 'card mit titel und button',
      charDelay: 60,
      comment: 'AI generiert eine Card-Komponente',
      expectCodeMatches: {
        pattern: /H1 "Willkommen"[\s\S]+Button "Loslegen"/,
        comment: 'AI-Output enthält Card-Struktur',
      },
    },
    { action: 'wait', duration: 800 },

    // === 3. Generierten Code zeigen ===
    { action: 'comment', text: 'AI hat eine Card mit H1 und Button generiert' },
    { action: 'moveTo', target: '.cm-editor' },
    { action: 'highlight', target: '.cm-editor', duration: 1500 },
    { action: 'moveTo', target: '#preview' },
    { action: 'highlight', target: '#preview', duration: 1500 },

    // === 4. H1 im Preview selektieren ===
    // Nach AI-Drop sind die Node-IDs: node-1=outer, node-2=Card, node-3=H1, node-4=Button
    { action: 'comment', text: 'Schritt 2: Generiertes UI verfeinern — H1 selektieren' },
    {
      action: 'selectInPreview',
      selector: { byTag: 'h1' },
      comment: 'H1 im Preview anclicken',
    },
    { action: 'wait', duration: 600 },

    // === 5. Title-Color anpassen ===
    { action: 'comment', text: 'Schritt 3: Title-Color via Color-Picker' },
    {
      action: 'pickColor',
      selector: { byTag: 'h1' },
      prop: 'col',
      color: '#FFC107',
      comment: 'Title in Amber',
    },
    { action: 'wait', duration: 500 },

    // === 6. Inline-Edit für persönlichen Touch ===
    { action: 'comment', text: 'Schritt 4: Title persönlich machen' },
    {
      action: 'inlineEdit',
      selector: { byTag: 'h1' },
      text: 'Willkommen, Toni!',
      comment: 'H1 → "Willkommen, Toni!"',
    },
    { action: 'wait', duration: 600 },

    // === Final ===
    {
      action: 'expectCodeMatches',
      comment: 'final state',
      pattern: /H1 "Willkommen, Toni!"[\s\S]+col #FFC107[\s\S]+Button "Loslegen"/,
    },

    // === Closing ===
    { action: 'comment', text: 'AI-Generierung + manuelles Tuning = fertige UI' },
    { action: 'moveTo', target: '#preview' },
    { action: 'highlight', target: '#preview', duration: 2000 },

    { action: 'wait', duration: 1000, comment: 'Demo abgeschlossen' },
  ],
}

export default demoScript
