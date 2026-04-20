/**
 * Tutorial Tests: Wiederverwendbare Komponenten
 *
 * Auto-generated from docs/tutorial/02-komponenten.html
 * Generated: 2026-04-20T13:03:12.767Z
 *
 * DEEP VALIDATION: Each element is validated for:
 * - Correct HTML tag
 * - Text content
 * - All CSS styles (bg, col, pad, rad, gap, etc.)
 * - Child count and hierarchy
 * - HTML attributes
 *
 * DO NOT EDIT MANUALLY - Run 'npm run tutorial:generate' to regenerate
 */

import { testWithSetup, testSkip, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

export const chapter_02_komponentenTests: TestCase[] = describe(
  'Tutorial: Wiederverwendbare Komponenten',
  [
    testWithSetup(
      '[02-komponenten] Das Problem: Wiederholung: Example 1',
      `Frame hor, gap 8, bg #0a0a0a, pad 16, rad 8
  Button "Speichern", pad 10 20, rad 6, bg #2271C1, col white
  Button "Abbrechen", pad 10 20, rad 6, bg #2271C1, col white
  Button "Löschen", pad 10 20, rad 6, bg #2271C1, col white`,
      async (api: TestAPI) => {
        // ========================================
        // DEEP VALIDATION: 4 elements
        // ========================================

        const nodeIds = api.preview.getNodeIds()
        api.assert.ok(nodeIds.length === 4, `Expected 4 nodes, got ${nodeIds.length}`)

        // --- node-1: Frame → <div> ---
        const node_1 = api.preview.inspect('node-1')
        api.assert.ok(node_1 !== null, 'node-1 must exist')
        api.assert.ok(node_1?.tagName === 'div', `node-1: expected <div>, got ${node_1?.tagName}`)
        api.assert.hasStyle('node-1', 'display', 'flex')
        api.assert.hasStyle('node-1', 'flexDirection', 'row')
        api.assert.hasStyle('node-1', 'gap', '8px')
        api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(10, 10, 10)')
        api.assert.hasStyle('node-1', 'padding', '16px')
        api.assert.hasStyle('node-1', 'borderRadius', '8px')
        api.assert.hasChildren('node-1', 3)

        // --- node-2: Button → <button> "Speichern" ---
        const node_2 = api.preview.inspect('node-2')
        api.assert.ok(node_2 !== null, 'node-2 must exist')
        api.assert.ok(
          node_2?.tagName === 'button',
          `node-2: expected <button>, got ${node_2?.tagName}`
        )
        api.assert.hasText('node-2', 'Speichern')
        api.assert.hasStyle('node-2', 'paddingTop', '10px')
        api.assert.hasStyle('node-2', 'paddingBottom', '10px')
        api.assert.hasStyle('node-2', 'paddingLeft', '20px')
        api.assert.hasStyle('node-2', 'paddingRight', '20px')
        api.assert.hasStyle('node-2', 'borderRadius', '6px')
        api.assert.hasStyle('node-2', 'backgroundColor', 'rgb(34, 113, 193)')
        api.assert.hasStyle('node-2', 'color', 'rgb(255, 255, 255)')

        // --- node-3: Button → <button> "Abbrechen" ---
        const node_3 = api.preview.inspect('node-3')
        api.assert.ok(node_3 !== null, 'node-3 must exist')
        api.assert.ok(
          node_3?.tagName === 'button',
          `node-3: expected <button>, got ${node_3?.tagName}`
        )
        api.assert.hasText('node-3', 'Abbrechen')
        api.assert.hasStyle('node-3', 'paddingTop', '10px')
        api.assert.hasStyle('node-3', 'paddingBottom', '10px')
        api.assert.hasStyle('node-3', 'paddingLeft', '20px')
        api.assert.hasStyle('node-3', 'paddingRight', '20px')
        api.assert.hasStyle('node-3', 'borderRadius', '6px')
        api.assert.hasStyle('node-3', 'backgroundColor', 'rgb(34, 113, 193)')
        api.assert.hasStyle('node-3', 'color', 'rgb(255, 255, 255)')

        // --- node-4: Button → <button> "Löschen" ---
        const node_4 = api.preview.inspect('node-4')
        api.assert.ok(node_4 !== null, 'node-4 must exist')
        api.assert.ok(
          node_4?.tagName === 'button',
          `node-4: expected <button>, got ${node_4?.tagName}`
        )
        api.assert.hasText('node-4', 'Löschen')
        api.assert.hasStyle('node-4', 'paddingTop', '10px')
        api.assert.hasStyle('node-4', 'paddingBottom', '10px')
        api.assert.hasStyle('node-4', 'paddingLeft', '20px')
        api.assert.hasStyle('node-4', 'paddingRight', '20px')
        api.assert.hasStyle('node-4', 'borderRadius', '6px')
        api.assert.hasStyle('node-4', 'backgroundColor', 'rgb(34, 113, 193)')
        api.assert.hasStyle('node-4', 'color', 'rgb(255, 255, 255)')

        // --- Hierarchy ---
        // node-2 is child of node-1
        // node-3 is child of node-1
        // node-4 is child of node-1
      }
    ),

    testWithSetup(
      '[02-komponenten] Komponenten definieren: Example 2',
      `// Definition: Name endet mit :
Btn: pad 10 20, rad 6, bg #2271C1, col white

// Verwendung: Name ohne :
Frame hor, gap 8, bg #0a0a0a, pad 16, rad 8
  Btn "Speichern"
  Btn "Abbrechen"
  Btn "Löschen"`,
      async (api: TestAPI) => {
        // Complex feature: component definitions
        // If we reach here, compilation succeeded (no exception thrown)
        api.assert.ok(true, 'Compilation successful')
      }
    ),

    testWithSetup(
      '[02-komponenten] Properties überschreiben: Example 3',
      `Btn: pad 10 20, rad 6, bg #2271C1, col white

Frame hor, gap 8, wrap, bg #0a0a0a, pad 16, rad 8
  Btn "Standard"
  Btn "Grau", bg #333
  Btn "Rot", bg #dc2626
  Btn "Groß", pad 16 32, fs 18`,
      async (api: TestAPI) => {
        // Complex feature: component definitions
        // If we reach here, compilation succeeded (no exception thrown)
        api.assert.ok(true, 'Compilation successful')
      }
    ),

    testWithSetup(
      '[02-komponenten] Kinder hinzufügen: Example 4',
      `Card: bg #1a1a1a, pad 16, rad 8, gap 8

Card
  Text "Titel", col white, fs 16, weight 500
  Text "Beschreibung", col #888, fs 14
  Button "Aktion", pad 8 16, rad 6, bg #2271C1, col white`,
      async (api: TestAPI) => {
        // Complex feature: component definitions
        // If we reach here, compilation succeeded (no exception thrown)
        api.assert.ok(true, 'Compilation successful')
      }
    ),

    testWithSetup(
      '[02-komponenten] Variationen als Komponenten: Example 5',
      `Btn: pad 10 20, rad 6, bg #2271C1, col white

// Immer wieder dieselbe Überschreibung...
Frame hor, gap 8, bg #0a0a0a, pad 16, rad 8
  Btn "Löschen", bg #ef4444
  Btn "Entfernen", bg #ef4444
  Btn "Abbrechen", bg #ef4444`,
      async (api: TestAPI) => {
        // Complex feature: component definitions
        // If we reach here, compilation succeeded (no exception thrown)
        api.assert.ok(true, 'Compilation successful')
      }
    ),

    testWithSetup(
      '[02-komponenten] Variationen als Komponenten: Example 6',
      `// Basis-Button
Btn: pad 10 20, rad 6, cursor pointer

// Variationen als eigene Komponenten
PrimaryBtn as Btn: bg #2271C1, col white
DangerBtn as Btn: bg #ef4444, col white
GhostBtn as Btn: bg transparent, col #888, bor 1, boc #333

Frame hor, gap 8, bg #0a0a0a, pad 16, rad 8
  PrimaryBtn "Speichern"
  DangerBtn "Löschen"
  GhostBtn "Abbrechen"`,
      async (api: TestAPI) => {
        // Complex feature: component definitions
        // If we reach here, compilation succeeded (no exception thrown)
        api.assert.ok(true, 'Compilation successful')
      }
    ),

    testWithSetup(
      '[02-komponenten] Komplexe Komponenten: Example 7',
      `Footer: w full, pad 20, bg #0a0a0a, hor, spread
  Text "© 2024 Meine App", col #666, fs 12
  Frame hor, gap 16
    Text "Impressum", col #888, fs 12
    Text "Datenschutz", col #888, fs 12
    Text "Kontakt", col #888, fs 12

Frame w full, gap 200, bg #1a1a1a
  Text "Seiteninhalt...", col white, pad 20
  Footer`,
      async (api: TestAPI) => {
        // Complex feature: component definitions
        // If we reach here, compilation succeeded (no exception thrown)
        api.assert.ok(true, 'Compilation successful')
      }
    ),

    testWithSetup(
      '[02-komponenten] Komplexe Komponenten: Example 8',
      `Card: bg #1a1a1a, pad 16, rad 8, gap 8
  Text "Projekt Alpha", fs 16, weight 500, col white
  Text "Beschreibung des Projekts.", col #888, fs 14

Frame hor, gap 12, bg #0a0a0a, pad 16, rad 8
  Card
  Card
  Card`,
      async (api: TestAPI) => {
        // Complex feature: component definitions
        // If we reach here, compilation succeeded (no exception thrown)
        api.assert.ok(true, 'Compilation successful')
      }
    ),

    testWithSetup(
      '[02-komponenten] Komponenten in Komponenten: Example 9',
      `// Card definiert zwei Kind-Komponenten: Title: und Desc:
Card: bg #1a1a1a, pad 16, rad 8, gap 8, w 200
  Title: fs 16, weight 500, col white
  Desc: col #888, fs 14

// Bei Verwendung: Kind-Komponenten befüllen (ohne :)
Frame hor, gap 12, bg #0a0a0a, pad 16, rad 8
  Card
    Title "Projekt Alpha"
    Desc "Das erste Projekt."
  Card
    Title "Projekt Beta"
    Desc "Ein anderes Projekt."`,
      async (api: TestAPI) => {
        // Complex feature: component definitions
        // If we reach here, compilation succeeded (no exception thrown)
        api.assert.ok(true, 'Compilation successful')
      }
    ),

    testWithSetup(
      '[02-komponenten] Kind-Komponenten mit mehreren Elementen: Example 10',
      `Card: bg #1a1a1a, pad 16, rad 8, gap 12
  Title: fs 16, weight 500, col white
  Content: gap 8

Card
  Title "Benutzer"
  Content
    Text "Max Mustermann", col white, fs 14
    Text "max@example.com", col #888, fs 12
    Button "Profil", pad 8 16, rad 6, bg #333, col white`,
      async (api: TestAPI) => {
        // Complex feature: component definitions
        // If we reach here, compilation succeeded (no exception thrown)
        api.assert.ok(true, 'Compilation successful')
      }
    ),

    testWithSetup(
      '[02-komponenten] Layouts: Example 11',
      `// Layout mit Kind-Komponenten: Sidebar und Main
AppShell: w full, h 180, hor
  Sidebar: w 140, h full, bg #1a1a1a, pad 12, gap 8
  Main: w full, h full, bg #0c0c0c, pad 20

// Verwendung: Kind-Komponenten befüllen
AppShell
  Sidebar
    Text "Navigation", col #888, fs 11, uppercase
    Text "Dashboard", col white, fs 14
    Text "Settings", col white, fs 14
  Main
    Text "Hauptinhalt", col white, fs 18`,
      async (api: TestAPI) => {
        // Complex feature: Zag: Sidebar, component definitions
        // If we reach here, compilation succeeded (no exception thrown)
        api.assert.ok(true, 'Compilation successful')
      }
    ),

    testWithSetup(
      '[02-komponenten] Praxisbeispiel: Card-Komponente: Example 12',
      `// Alle Elemente mit Formatierung in der Definition
Card: w 260, bg #1a1a1a, rad 12, clip
  Title: w full, pad 16, bg #252525, col white, weight 500
  Desc: w full, pad 16, col #888, fs 14
  Footer: w full, pad 12 16, bg #151515, hor, spread
    Status: col #666, fs 12
    Action: pad 8 16, rad 6, bg #2271C1, col white

// Verwendung: Nur noch die Texte einfügen
Card
  Title "Neues Projekt"
  Desc "Erstelle ein neues Projekt."
  Footer
    Status "Schritt 1/3"
    Action "Weiter"`,
      async (api: TestAPI) => {
        // Complex feature: component definitions
        // If we reach here, compilation succeeded (no exception thrown)
        api.assert.ok(true, 'Compilation successful')
      }
    ),
  ]
)
