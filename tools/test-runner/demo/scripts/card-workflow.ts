/**
 * Card Workflow Demo
 *
 * Zeigt den kompletten Workflow zum Erstellen einer schönen Card.
 * Alle Schritte sind sichtbar und nachvollziehbar:
 * 1. Neue Token-Datei erstellen und Tokens tippen
 * 2. Neue Component-Datei erstellen und Komponenten tippen
 * 3. Ins Layout wechseln und Cards tippen
 *
 * Mit Validierungen nach jedem wichtigen Schritt.
 */

import type { DemoScript } from '../types'

export const demoScript: DemoScript = {
  name: 'Card Workflow',
  description: 'Erstellt ein Projekt mit Tokens, Komponenten und Cards - Schritt für Schritt',
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
          // Projekt auf leeren Zustand zurücksetzen (nur index.mir, leer)
          const { storage } = await import('./dist/index.js');
          const files = window.desktopFiles.getFiles();

          // Alle Dateien außer index.mir löschen
          for (const path of Object.keys(files)) {
            if (path !== 'index.mir') {
              await storage.deleteFile(path);
            }
          }

          // index.mir leeren
          await storage.writeFile('index.mir', '');

          // Editor leeren falls offen
          if (window.editor) {
            window.editor.dispatch({
              changes: { from: 0, to: window.editor.state.doc.length, insert: '' }
            });
          }
        })();
      `,
      comment: 'Projekt zurücksetzen',
    },
    { action: 'wait', duration: 500 },

    // === Einleitung ===
    { action: 'wait', duration: 1500, comment: 'Startbildschirm' },
    { action: 'comment', text: 'Wir bauen eine Pricing-Page mit schönen Cards' },

    // Validierung: Studio ist geladen und bereit
    {
      action: 'validate',
      comment: 'Studio ist bereit',
      checks: [
        { type: 'exists', selector: '#file-tree-content' },
        { type: 'exists', selector: '.cm-editor' },
        { type: 'exists', selector: '#preview' },
      ],
    },

    // Validierung: Projekt ist leer (nur index.mir)
    {
      action: 'validate',
      comment: 'Projekt ist leer',
      checks: [
        { type: 'exists', selector: '[data-path="index.mir"]' },
        {
          type: 'elementCount',
          selector: '#file-tree-content [data-path]:not([data-path="."])',
          count: 1,
        },
      ],
    },

    // === SCHRITT 1: Token-Datei erstellen ===
    { action: 'comment', text: 'Schritt 1: Token-Datei erstellen' },
    { action: 'wait', duration: 500 },

    // Datei programmatisch erstellen (zuverlässiger als UI)
    {
      action: 'execute',
      code: `
        (async function() {
          // Erstelle tokens.tok mit leerem Inhalt
          await window.desktopFiles.createFile('tokens.tok', null);
        })();
      `,
      comment: 'tokens.tok erstellen',
    },
    { action: 'wait', duration: 1000 },

    // Validierung: tokens.tok erstellt und im Tree sichtbar
    {
      action: 'validate',
      comment: 'tokens.tok wurde erstellt',
      checks: [{ type: 'exists', selector: '[data-path="tokens.tok"]' }],
    },

    // Explizit auf tokens.tok klicken um sie zu öffnen
    { action: 'comment', text: 'Token-Datei öffnen' },
    { action: 'moveTo', target: '[data-path="tokens.tok"]' },
    { action: 'click' },
    { action: 'wait', duration: 800 },

    // Validierung: tokens.tok ist aktiv
    {
      action: 'validate',
      comment: 'tokens.tok ist geöffnet',
      checks: [{ type: 'exists', selector: '[data-path="tokens.tok"].active' }],
    },

    // Editor leeren und Tokens tippen
    { action: 'comment', text: 'Design-Tokens definieren' },
    { action: 'moveTo', target: '.cm-editor' },
    { action: 'click' },
    { action: 'pressKey', key: 'a', modifiers: ['Meta'] },
    { action: 'wait', duration: 200 },

    { action: 'type', text: '// Design Tokens\n\n' },
    { action: 'type', text: '// Farben\n' },
    { action: 'type', text: 'primary.bg: #2271C1\n' },
    { action: 'type', text: 'surface.bg: #18181b\n' },
    { action: 'type', text: 'card.bg: #27272a\n' },
    { action: 'type', text: 'muted.col: #a1a1aa\n' },
    { action: 'type', text: 'accent.bg: #8b5cf6\n' },
    { action: 'type', text: 'success.ic: #10b981\n' },
    { action: 'wait', duration: 600 },

    { action: 'type', text: '\n// Abstände\n' },
    { action: 'type', text: 'sm.pad: 8\n' },
    { action: 'type', text: 'md.pad: 16\n' },
    { action: 'type', text: 'lg.pad: 24\n' },
    { action: 'type', text: 'sm.gap: 8\n' },
    { action: 'type', text: 'md.gap: 12\n' },
    { action: 'wait', duration: 400 },

    { action: 'type', text: '\n// Radien\n' },
    { action: 'type', text: 'sm.rad: 6\n' },
    { action: 'type', text: 'md.rad: 12\n' },
    { action: 'wait', duration: 800 },

    // Validierung: Tokens wurden eingegeben
    {
      action: 'validate',
      comment: 'Design Tokens im Editor vorhanden',
      checks: [
        { type: 'editorContains', text: 'primary.bg: #2271C1' },
        { type: 'editorContains', text: 'surface.bg: #18181b' },
        { type: 'editorContains', text: 'lg.pad: 24' },
        { type: 'noLintErrors' },
        { type: 'colorPickerClosed' },
      ],
    },

    // === SCHRITT 2: Component-Datei erstellen ===
    { action: 'comment', text: 'Schritt 2: Komponenten-Datei erstellen' },
    { action: 'wait', duration: 500 },

    // Datei programmatisch erstellen
    {
      action: 'execute',
      code: `
        (async function() {
          await window.desktopFiles.createFile('components.com', null);
        })();
      `,
      comment: 'components.com erstellen',
    },
    { action: 'wait', duration: 1000 },

    // Validierung: components.com erstellt
    {
      action: 'validate',
      comment: 'components.com wurde erstellt',
      checks: [{ type: 'exists', selector: '[data-path="components.com"]' }],
    },

    // Explizit auf components.com klicken
    { action: 'comment', text: 'Komponenten-Datei öffnen' },
    { action: 'moveTo', target: '[data-path="components.com"]' },
    { action: 'click' },
    { action: 'wait', duration: 800 },

    // Validierung: components.com ist aktiv
    {
      action: 'validate',
      comment: 'components.com ist geöffnet',
      checks: [{ type: 'exists', selector: '[data-path="components.com"].active' }],
    },

    // Editor leeren und Komponenten tippen
    { action: 'comment', text: 'Wiederverwendbare Komponenten' },
    { action: 'moveTo', target: '.cm-editor' },
    { action: 'click' },
    { action: 'pressKey', key: 'a', modifiers: ['Meta'] },
    { action: 'wait', duration: 200 },

    { action: 'type', text: '// Komponenten\n\n' },

    // Card Komponente
    { action: 'type', text: '// Basis Card\n' },
    { action: 'type', text: 'Card: bg $card, pad $lg, rad $md, gap $md\n' },
    { action: 'wait', duration: 400 },

    // CardTitle
    { action: 'type', text: '\n// Titel\n' },
    { action: 'type', text: 'CardTitle: fs 18, weight 600, col white\n' },
    { action: 'wait', duration: 300 },

    // Button
    { action: 'type', text: '\n// Primary Button\n' },
    { action: 'type', text: 'Btn: bg $primary, col white, pad $sm $md, rad $sm, cursor pointer\n' },
    { action: 'type', text: '  hover:\n' },
    { action: 'type', text: '    opacity 0.9\n' },
    { action: 'wait', duration: 400 },

    // Outline Button
    { action: 'type', text: '\n// Outline Button\n' },
    {
      action: 'type',
      text: 'BtnOutline: bor 1, boc #3f3f46, col $muted, pad $sm $md, rad $sm, cursor pointer\n',
    },
    { action: 'type', text: '  hover:\n' },
    { action: 'type', text: '    col white\n' },
    { action: 'wait', duration: 400 },

    // Feature
    { action: 'type', text: '\n// Feature mit Check-Icon\n' },
    { action: 'type', text: 'Feature: hor, gap $sm, ver-center\n' },
    { action: 'type', text: '  Icon "check", ic $success, is 16\n' },
    { action: 'type', text: '  Text col white, fs 14\n' },
    { action: 'wait', duration: 400 },

    // Badge
    { action: 'type', text: '\n// Badge\n' },
    { action: 'type', text: 'Badge: bg $accent, col white, pad 4 $sm, rad $sm, fs 12\n' },
    { action: 'wait', duration: 400 },

    // Layout Komponenten
    { action: 'type', text: '\n// Layout\n' },
    { action: 'type', text: 'Header: center, gap $sm\n' },
    { action: 'type', text: 'Cards: hor, gap $md, wrap, center\n' },
    { action: 'type', text: 'Features: gap $sm\n' },
    { action: 'type', text: 'TitleRow: hor, spread, ver-center\n' },
    { action: 'type', text: 'Price: hor, ver-center, gap 4\n' },
    { action: 'wait', duration: 800 },

    // Validierung: Komponenten wurden eingegeben
    {
      action: 'validate',
      comment: 'Komponenten im Editor vorhanden',
      checks: [
        { type: 'editorContains', text: 'Card: bg $card' },
        { type: 'editorContains', text: 'Btn: bg $primary' },
        { type: 'editorContains', text: 'Feature: hor, gap $sm' },
        { type: 'noLintErrors' },
      ],
    },

    // === SCHRITT 3: Layout erstellen ===
    { action: 'comment', text: 'Schritt 3: Layout mit Cards erstellen' },
    { action: 'wait', duration: 500 },

    // Auf index.mir klicken im File-Tree
    { action: 'moveTo', target: '[data-path="index.mir"]' },
    { action: 'click' },
    { action: 'wait', duration: 800 },

    // Validierung: index.mir ist aktiv
    {
      action: 'validate',
      comment: 'index.mir ist geöffnet',
      checks: [{ type: 'exists', selector: '[data-path="index.mir"].active' }],
    },

    // Editor leeren und Code tippen
    { action: 'moveTo', target: '.cm-editor' },
    { action: 'click' },
    { action: 'pressKey', key: 'a', modifiers: ['Meta'] },
    { action: 'wait', duration: 200 },

    // Layout tippen
    { action: 'comment', text: 'Die Pricing-Page aufbauen' },
    { action: 'type', text: 'canvas bg $surface, col white, pad $lg, gap $lg\n\n' },
    { action: 'wait', duration: 400 },

    // Header
    { action: 'type', text: 'Header\n' },
    { action: 'type', text: '  Text "Wähle deinen Plan", fs 28, weight bold\n' },
    { action: 'type', text: '  Text "Starte kostenlos, upgrade jederzeit", col $muted\n\n' },
    { action: 'wait', duration: 500 },

    // Cards Container
    { action: 'type', text: 'Cards\n\n' },
    { action: 'wait', duration: 300 },

    // === Erste Card: Starter ===
    { action: 'comment', text: 'Card 1: Starter' },
    { action: 'type', text: '  Card w 260\n' },
    { action: 'type', text: '    CardTitle "Starter"\n' },
    { action: 'type', text: '    Text "Zum Ausprobieren", col $muted, fs 14\n' },
    { action: 'type', text: '    Text "Kostenlos", fs 28, weight bold\n' },
    { action: 'type', text: '    Features\n' },
    { action: 'type', text: '      Feature "3 Projekte"\n' },
    { action: 'type', text: '      Feature "Basic Export"\n' },
    { action: 'type', text: '    BtnOutline "Loslegen"\n\n' },
    { action: 'wait', duration: 700 },

    // === Zweite Card: Pro ===
    { action: 'comment', text: 'Card 2: Pro (highlighted)' },
    { action: 'type', text: '  Card w 260, bor 2, boc $accent\n' },
    { action: 'type', text: '    TitleRow\n' },
    { action: 'type', text: '      CardTitle "Pro"\n' },
    { action: 'type', text: '      Badge "Beliebt"\n' },
    { action: 'type', text: '    Text "Für Profis", col $muted, fs 14\n' },
    { action: 'type', text: '    Price\n' },
    { action: 'type', text: '      Text "€19", fs 28, weight bold\n' },
    { action: 'type', text: '      Text "/Monat", col $muted\n' },
    { action: 'type', text: '    Features\n' },
    { action: 'type', text: '      Feature "Unbegrenzt"\n' },
    { action: 'type', text: '      Feature "Team-Features"\n' },
    { action: 'type', text: '      Feature "Priority Support"\n' },
    { action: 'type', text: '    Btn "Upgraden"\n\n' },
    { action: 'wait', duration: 700 },

    // === Dritte Card: Enterprise ===
    { action: 'comment', text: 'Card 3: Enterprise' },
    { action: 'type', text: '  Card w 260\n' },
    { action: 'type', text: '    CardTitle "Enterprise"\n' },
    { action: 'type', text: '    Text "Für Teams", col $muted, fs 14\n' },
    { action: 'type', text: '    Text "Auf Anfrage", fs 24, weight bold\n' },
    { action: 'type', text: '    Features\n' },
    { action: 'type', text: '      Feature "Alles aus Pro"\n' },
    { action: 'type', text: '      Feature "SSO"\n' },
    { action: 'type', text: '      Feature "SLA Garantie"\n' },
    { action: 'type', text: '    BtnOutline "Kontakt"\n' },
    { action: 'wait', duration: 1000 },

    // Validierung: Layout im Editor
    {
      action: 'validate',
      comment: 'Pricing Page Code im Editor',
      checks: [
        { type: 'editorContains', text: 'canvas bg $surface' },
        { type: 'editorContains', text: 'CardTitle "Starter"' },
        { type: 'editorContains', text: 'CardTitle "Pro"' },
        { type: 'editorContains', text: 'CardTitle "Enterprise"' },
        { type: 'editorContains', text: 'Badge "Beliebt"' },
        { type: 'noLintErrors', allowWarnings: true },
      ],
    },

    // Warten auf Kompilierung
    { action: 'wait', duration: 1500, comment: 'Preview kompiliert...' },

    // Validierung: Preview zeigt Cards
    {
      action: 'validate',
      comment: 'Preview zeigt die Pricing Cards',
      checks: [{ type: 'elementCount', selector: '#preview [data-mirror-id]', min: 3 }],
    },

    // === Finale ===
    { action: 'comment', text: 'Fertig! Drei Dateien, eine schöne Pricing-Page.' },
    { action: 'wait', duration: 500 },

    // Preview zeigen
    { action: 'moveTo', target: '#preview' },
    { action: 'wait', duration: 300 },
    { action: 'highlight', target: '#preview', duration: 2500 },

    // File-Tree zeigen
    { action: 'comment', text: 'Tokens + Components + Layout = Saubere Struktur' },
    { action: 'moveTo', target: '#file-tree-content' },
    { action: 'wait', duration: 500 },
    { action: 'highlight', target: '#file-tree-content', duration: 2000 },

    // Finale Validierung: Alle Dateien vorhanden
    {
      action: 'validate',
      comment: 'Alle Dateien wurden erstellt',
      checks: [
        { type: 'exists', selector: '[data-path="index.mir"]' },
        { type: 'exists', selector: '[data-path="tokens.tok"]' },
        { type: 'exists', selector: '[data-path="components.com"]' },
        { type: 'elementCount', selector: '#file-tree-content [data-path]', min: 3 },
      ],
    },

    // Ende
    { action: 'wait', duration: 2000, comment: 'Demo abgeschlossen' },
  ],
}

export default demoScript
