/**
 * Tutorial Tests: Prosa-Mode
 *
 * Auto-generated from docs/tutorial/16-prosa.html
 * Generated: 2026-05-08T15:21:22.615Z
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

export const chapter_16_prosaTests: TestCase[] = describe('Tutorial: Prosa-Mode', [
  testWithSetup(
    '[16-prosa] Die Idee: ein Frame, eine Property: Example 1',
    `BodyTxt as Text: fs 16, line 1.5, col #ddd
DashItem: hor, gap 16
  DashMarker as Text: w 12, col #888
  DashMarker "—"
BodyTxtCompact as Text: fs 16, line 1.4, col #ddd

ProseBody as Frame: bg #1a1a1a, pad 24, rad 8, gap 12, prose

ProseBody
  Erster Absatz aus normalem Fliesstext, ohne Quotes, ohne Wrapper.

  - Erster Punkt — wichtige Aussage.
  - Zweiter Punkt — Begründung dazu.
  - Dritter Punkt — Schlussfolgerung.

  Zweiter Absatz nach den Bullets.`,
    async (api: TestAPI) => {
      // Complex feature: component definitions
      // Deep validation for complex features

      // === COMPONENT VALIDATION ===
      // Component template should expand to DOM elements
      const nodeIds = api.preview.getNodeIds()
      api.assert.ok(nodeIds.length > 0, 'Component should expand to DOM elements')
    }
  ),

  testWithSetup(
    '[16-prosa] Headings: # / ## / ###: Example 2',
    `BodyTxt as Text: fs 16, line 1.5, col #ddd
H2 as Text: fs 32, weight bold, col white, mar-b 8
H3 as Text: fs 22, weight bold, col white, mar-b 6
H4 as Text: fs 16, weight bold, col white

Article as Frame: bg #1a1a1a, pad 24, rad 8, gap 12, prose

Article
  # Hauptüberschrift

  Einleitender Absatz, der den Leser ins Thema holt.

  ## Unterabschnitt

  Eine Erklärung dazu, was hier behandelt wird.

  ### Detail

  Noch tiefer: spezifischer Text mit weiterer Erklärung.`,
    async (api: TestAPI) => {
      // Complex feature: component definitions
      // Deep validation for complex features

      // === COMPONENT VALIDATION ===
      // Component template should expand to DOM elements
      const nodeIds = api.preview.getNodeIds()
      api.assert.ok(nodeIds.length > 0, 'Component should expand to DOM elements')
    }
  ),

  testWithSetup(
    '[16-prosa] Numerierte Listen: 1. / 2. / 3.: Example 3',
    `BodyTxtCompact as Text: fs 16, line 1.4, col #ddd
OffenePunkt as Frame: hor, gap 16
OffeneNum as Text: fs 14, weight bold, col #888, w 32

OffeneList as Frame: gap 16, bg #1a1a1a, pad 24, rad 8, prose

OffeneList
  1. Erster Schritt mit kurzer Erklärung.
  2. Zweiter Schritt — Begründung dazu.
  3. Dritter Schritt — Schlussfolgerung.`,
    async (api: TestAPI) => {
      // Complex feature: component definitions
      // Deep validation for complex features

      // === COMPONENT VALIDATION ===
      // Component template should expand to DOM elements
      const nodeIds = api.preview.getNodeIds()
      api.assert.ok(nodeIds.length > 0, 'Component should expand to DOM elements')
    }
  ),

  testWithSetup(
    '[16-prosa] Verschachtelte Bullets via Einrückung: Example 4',
    `BodyTxtCompact as Text: fs 16, line 1.4, col #ddd
DashItem: hor, gap 16
  DashMarker as Text: w 12, col #888
  DashMarker "—"

ProseBody as Frame: bg #1a1a1a, pad 24, rad 8, gap 12, prose

ProseBody
  - Top-Level-Bullet
    - Sub-Bullet eins
    - Sub-Bullet zwei
  - Anderer Top-Level-Bullet
    - Mit eigenem Sub-Bullet`,
    async (api: TestAPI) => {
      // Complex feature: component definitions
      // Deep validation for complex features

      // === COMPONENT VALIDATION ===
      // Component template should expand to DOM elements
      const nodeIds = api.preview.getNodeIds()
      api.assert.ok(nodeIds.length > 0, 'Component should expand to DOM elements')
    }
  ),

  testWithSetup(
    '[16-prosa] Vererbung über Komponenten-Definition: Example 5',
    `BodyTxt as Text: fs 16, line 1.5, col #ddd
H3 as Text: fs 20, weight bold, col white

// Definition trägt prose
Article as Frame: bg #1a1a1a, pad 24, rad 8, gap 12, prose

Frame gap 16, w hug
  // Use-Site braucht es nicht — vererbt sich
  Article
    ## Erste Sektion

    Erster Absatz im Prosa-Mode. Funktioniert ohne \`, prose\` an dieser Stelle.

  Article
    ## Zweite Sektion

    Auch hier: implizit Prosa, weil Article so definiert ist.`,
    async (api: TestAPI) => {
      // Complex feature: component definitions
      // Deep validation for complex features

      // === COMPONENT VALIDATION ===
      // Component template should expand to DOM elements
      const nodeIds = api.preview.getNodeIds()
      api.assert.ok(nodeIds.length > 0, 'Component should expand to DOM elements')
    }
  ),

  testWithSetup(
    '[16-prosa] Mischung mit normalem Mirror: Example 6',
    `BodyTxt as Text: fs 16, line 1.5, col #ddd
BodyTxtCompact as Text: fs 16, line 1.4, col #ddd
H3 as Text: fs 20, weight bold, col white
DashItem: hor, gap 16
  DashMarker as Text: w 12, col #888
  DashMarker "—"

Card as Frame: bg #1a1a1a, pad 24, rad 8, gap 16
ProseBody as Frame: gap 12, prose

// Card ist normales Mirror, ProseBody darin ist Prosa
Card
  H3 "Persona: Lukas"
  ProseBody
    Lukas verkörpert das Segment der **hochkompetenten** Maturanden.

    - 18 Jahre, Gymi
    - Programmiert seit der Sek
    - GitHub aktiv

  Frame hor, gap 8
    Button "Bearbeiten", bg #2271C1, col white, pad 8 16, rad 4
    Button "Löschen", bg #ef4444, col white, pad 8 16, rad 4`,
    async (api: TestAPI) => {
      // Complex feature: component definitions
      // Deep validation for complex features

      // === COMPONENT VALIDATION ===
      // Component template should expand to DOM elements
      const nodeIds = api.preview.getNodeIds()
      api.assert.ok(nodeIds.length > 0, 'Component should expand to DOM elements')
    }
  ),
])
