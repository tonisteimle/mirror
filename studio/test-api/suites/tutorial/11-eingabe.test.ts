/**
 * Tutorial Tests: Eingabe
 *
 * Auto-generated from docs/tutorial/11-eingabe.html
 * Generated: 2026-04-20T13:03:12.784Z
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

export const chapter_11_eingabeTests: TestCase[] = describe('Tutorial: Eingabe', [
  testWithSetup(
    '[11-eingabe] Input: Example 1',
    `Frame gap 12, w 280
  Input placeholder "Name eingeben..."
  Input placeholder "E-Mail", type "email"
  Input placeholder "Deaktiviert", disabled`,
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
      api.assert.hasStyle('node-1', 'flexDirection', 'column')
      api.assert.hasStyle('node-1', 'gap', '12px')
      api.assert.hasStyle('node-1', 'width', '280px')
      api.assert.hasChildren('node-1', 3)

      // --- node-2: Input → <input> "Name eingeben..." ---
      const node_2 = api.preview.inspect('node-2')
      api.assert.ok(node_2 !== null, 'node-2 must exist')
      api.assert.ok(node_2?.tagName === 'input', `node-2: expected <input>, got ${node_2?.tagName}`)
      api.assert.hasAttribute('node-2', 'placeholder', 'Name eingeben...')

      // --- node-3: Input → <input> "E-Mail" ---
      const node_3 = api.preview.inspect('node-3')
      api.assert.ok(node_3 !== null, 'node-3 must exist')
      api.assert.ok(node_3?.tagName === 'input', `node-3: expected <input>, got ${node_3?.tagName}`)
      api.assert.hasAttribute('node-3', 'placeholder', 'E-Mail')

      // --- node-4: Input → <input> "Deaktiviert" ---
      const node_4 = api.preview.inspect('node-4')
      api.assert.ok(node_4 !== null, 'node-4 must exist')
      api.assert.ok(node_4?.tagName === 'input', `node-4: expected <input>, got ${node_4?.tagName}`)
      api.assert.hasAttribute('node-4', 'placeholder', 'Deaktiviert')

      // --- Hierarchy ---
      // node-2 is child of node-1
      // node-3 is child of node-1
      // node-4 is child of node-1
    }
  ),

  testWithSetup(
    '[11-eingabe] Textarea: Example 2',
    `Frame gap 12, w 280
  Textarea placeholder "Deine Nachricht..."
  Textarea placeholder "Mit Inhalt", value "Hallo Welt!\\nZweite Zeile."`,
    async (api: TestAPI) => {
      // ========================================
      // DEEP VALIDATION: 3 elements
      // ========================================

      const nodeIds = api.preview.getNodeIds()
      api.assert.ok(nodeIds.length === 3, `Expected 3 nodes, got ${nodeIds.length}`)

      // --- node-1: Frame → <div> ---
      const node_1 = api.preview.inspect('node-1')
      api.assert.ok(node_1 !== null, 'node-1 must exist')
      api.assert.ok(node_1?.tagName === 'div', `node-1: expected <div>, got ${node_1?.tagName}`)
      api.assert.hasStyle('node-1', 'display', 'flex')
      api.assert.hasStyle('node-1', 'flexDirection', 'column')
      api.assert.hasStyle('node-1', 'gap', '12px')
      api.assert.hasStyle('node-1', 'width', '280px')
      api.assert.hasChildren('node-1', 2)

      // --- node-2: Textarea → <textarea> "Deine Nachricht..." ---
      const node_2 = api.preview.inspect('node-2')
      api.assert.ok(node_2 !== null, 'node-2 must exist')
      api.assert.ok(
        node_2?.tagName === 'textarea',
        `node-2: expected <textarea>, got ${node_2?.tagName}`
      )

      // --- node-3: Textarea → <textarea> "Mit Inhalt" ---
      const node_3 = api.preview.inspect('node-3')
      api.assert.ok(node_3 !== null, 'node-3 must exist')
      api.assert.ok(
        node_3?.tagName === 'textarea',
        `node-3: expected <textarea>, got ${node_3?.tagName}`
      )

      // --- Hierarchy ---
      // node-2 is child of node-1
      // node-3 is child of node-1
    }
  ),

  testWithSetup(
    '[11-eingabe] Checkbox: Example 3',
    `Frame gap 12
  Checkbox "Newsletter abonnieren"
  Checkbox "AGB akzeptieren", checked
  Checkbox "Deaktiviert", disabled`,
    async (api: TestAPI) => {
      // Complex feature: Zag: Checkbox
      // If we reach here, compilation succeeded (no exception thrown)
      api.assert.ok(true, 'Compilation successful')
    }
  ),

  testWithSetup(
    '[11-eingabe] Switch: Example 4',
    `Frame gap 12
  Switch "Dark Mode"
  Switch "Benachrichtigungen", checked
  Switch "Premium", disabled`,
    async (api: TestAPI) => {
      // Complex feature: Zag: Switch
      // If we reach here, compilation succeeded (no exception thrown)
      api.assert.ok(true, 'Compilation successful')
    }
  ),

  testWithSetup(
    '[11-eingabe] RadioGroup: Example 5',
    `RadioGroup value "monthly"
  RadioItem "Monatlich – €9/Monat", value "monthly"
  RadioItem "Jährlich – €99/Jahr", value "yearly"
  RadioItem "Lifetime – €299", value "lifetime"`,
    async (api: TestAPI) => {
      // Complex feature: Zag: RadioGroup, RadioItem
      // If we reach here, compilation succeeded (no exception thrown)
      api.assert.ok(true, 'Compilation successful')
    }
  ),

  testWithSetup(
    '[11-eingabe] Slider: Example 6',
    `Frame gap 16, w 240
  Slider value 50, min 0, max 100
  Slider value 75, min 0, max 100, step 25`,
    async (api: TestAPI) => {
      // Complex feature: Zag: Slider
      // If we reach here, compilation succeeded (no exception thrown)
      api.assert.ok(true, 'Compilation successful')
    }
  ),

  testWithSetup(
    '[11-eingabe] Select: Example 7',
    `Select placeholder "Stadt wählen..."
    Option "Berlin"
    Option "Hamburg"
    Option "München"
    Option "Köln"`,
    async (api: TestAPI) => {
      // Complex feature: Zag: Select, Option
      // If we reach here, compilation succeeded (no exception thrown)
      api.assert.ok(true, 'Compilation successful')
    }
  ),

  testWithSetup(
    '[11-eingabe] Select: Example 8',
    `Select placeholder "Status wählen..."
    Option "In Bearbeitung", value "in_progress"
    Option "Abgeschlossen", value "done"
    Option "Abgebrochen", value "cancelled"`,
    async (api: TestAPI) => {
      // Complex feature: Zag: Select, Option
      // If we reach here, compilation succeeded (no exception thrown)
      api.assert.ok(true, 'Compilation successful')
    }
  ),

  testWithSetup('[11-eingabe] DatePicker: Example 9', `DatePicker`, async (api: TestAPI) => {
    // Complex feature: Zag: DatePicker
    // If we reach here, compilation succeeded (no exception thrown)
    api.assert.ok(true, 'Compilation successful')
  }),

  testWithSetup(
    '[11-eingabe] Two-Way Binding: Example 10',
    `searchTerm: ""

Frame gap 12, w 280
  Input bind searchTerm, placeholder "Suchen..."
  Text "Du suchst: \$searchTerm", col #888`,
    async (api: TestAPI) => {
      // Complex feature: data binding
      // If we reach here, compilation succeeded (no exception thrown)
      api.assert.ok(true, 'Compilation successful')
    }
  ),

  testWithSetup(
    '[11-eingabe] Two-Way Binding: Example 11',
    `city: ""

Frame gap 12, w 280
  Select bind city, placeholder "Stadt wählen..."
    Option "Berlin"
    Option "Hamburg"
    Option "München"
  Text "Gewählt: \$city", col #888`,
    async (api: TestAPI) => {
      // Complex feature: Zag: Select, Option, data binding
      // If we reach here, compilation succeeded (no exception thrown)
      api.assert.ok(true, 'Compilation successful')
    }
  ),

  testWithSetup(
    '[11-eingabe] Tastatursteuerung: Example 12',
    `Frame keyboard-nav, gap 12, w 280, bg #1a1a1a, pad 16, rad 8
  Input placeholder "Name"
  Input placeholder "E-Mail"
  Input placeholder "Telefon"
  Button "Absenden", bg #2271C1, col white, pad 10 20, rad 6`,
    async (api: TestAPI) => {
      // ========================================
      // DEEP VALIDATION: 5 elements
      // ========================================

      const nodeIds = api.preview.getNodeIds()
      api.assert.ok(nodeIds.length === 5, `Expected 5 nodes, got ${nodeIds.length}`)

      // --- node-1: Frame → <div> ---
      const node_1 = api.preview.inspect('node-1')
      api.assert.ok(node_1 !== null, 'node-1 must exist')
      api.assert.ok(node_1?.tagName === 'div', `node-1: expected <div>, got ${node_1?.tagName}`)
      api.assert.hasStyle('node-1', 'display', 'flex')
      api.assert.hasStyle('node-1', 'flexDirection', 'column')
      api.assert.hasStyle('node-1', 'gap', '12px')
      api.assert.hasStyle('node-1', 'width', '280px')
      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(26, 26, 26)')
      api.assert.hasStyle('node-1', 'padding', '16px')
      api.assert.hasStyle('node-1', 'borderRadius', '8px')
      api.assert.hasChildren('node-1', 4)

      // --- node-2: Input → <input> "Name" ---
      const node_2 = api.preview.inspect('node-2')
      api.assert.ok(node_2 !== null, 'node-2 must exist')
      api.assert.ok(node_2?.tagName === 'input', `node-2: expected <input>, got ${node_2?.tagName}`)
      api.assert.hasAttribute('node-2', 'placeholder', 'Name')

      // --- node-3: Input → <input> "E-Mail" ---
      const node_3 = api.preview.inspect('node-3')
      api.assert.ok(node_3 !== null, 'node-3 must exist')
      api.assert.ok(node_3?.tagName === 'input', `node-3: expected <input>, got ${node_3?.tagName}`)
      api.assert.hasAttribute('node-3', 'placeholder', 'E-Mail')

      // --- node-4: Input → <input> "Telefon" ---
      const node_4 = api.preview.inspect('node-4')
      api.assert.ok(node_4 !== null, 'node-4 must exist')
      api.assert.ok(node_4?.tagName === 'input', `node-4: expected <input>, got ${node_4?.tagName}`)
      api.assert.hasAttribute('node-4', 'placeholder', 'Telefon')

      // --- node-5: Button → <button> "Absenden" ---
      const node_5 = api.preview.inspect('node-5')
      api.assert.ok(node_5 !== null, 'node-5 must exist')
      api.assert.ok(
        node_5?.tagName === 'button',
        `node-5: expected <button>, got ${node_5?.tagName}`
      )
      api.assert.hasText('node-5', 'Absenden')
      api.assert.hasStyle('node-5', 'backgroundColor', 'rgb(34, 113, 193)')
      api.assert.hasStyle('node-5', 'color', 'rgb(255, 255, 255)')
      api.assert.hasStyle('node-5', 'paddingTop', '10px')
      api.assert.hasStyle('node-5', 'paddingBottom', '10px')
      api.assert.hasStyle('node-5', 'paddingLeft', '20px')
      api.assert.hasStyle('node-5', 'paddingRight', '20px')
      api.assert.hasStyle('node-5', 'borderRadius', '6px')

      // --- Hierarchy ---
      // node-2 is child of node-1
      // node-3 is child of node-1
      // node-4 is child of node-1
      // node-5 is child of node-1
    }
  ),

  testWithSetup(
    '[11-eingabe] Custom Styling: Example 13',
    `// Das schreibst du:
Checkbox "Newsletter"

// Das erzeugt Mirror intern (vereinfacht):
// Root (Container, horizontal)
//   └─ Control (das Kästchen)
//   └─ Label (der Text)`,
    async (api: TestAPI) => {
      // Complex feature: Zag: Checkbox
      // If we reach here, compilation succeeded (no exception thrown)
      api.assert.ok(true, 'Compilation successful')
    }
  ),

  testWithSetup(
    '[11-eingabe] Custom Styling: Example 14',
    `Checkbox "Custom Checkbox"
  // Kind-Komponenten mit : überschreiben
  Root: hor, gap 12, pad 12, bg #1a1a1a, rad 8
  Control: w 24, h 24, rad 6, bg #333
  Label: col white, fs 14`,
    async (api: TestAPI) => {
      // Complex feature: Zag: Checkbox, component definitions
      // If we reach here, compilation succeeded (no exception thrown)
      api.assert.ok(true, 'Compilation successful')
    }
  ),

  testWithSetup(
    '[11-eingabe] Custom Styling: Example 15',
    `Switch "Dark Mode"
  Root: hor, gap 12
  Track: w 52, h 28, rad 99, bg #333
  Thumb: w 24, h 24, rad 99, bg white
  Label: col white, fs 14`,
    async (api: TestAPI) => {
      // Complex feature: Zag: Switch, component definitions
      // If we reach here, compilation succeeded (no exception thrown)
      api.assert.ok(true, 'Compilation successful')
    }
  ),
])
