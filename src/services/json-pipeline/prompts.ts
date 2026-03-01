/**
 * LLM Prompts for JSON Pipeline
 *
 * System prompts and user prompt builders for Stage 1 (Structure)
 * and Stage 2 (Properties) of the generation pipeline.
 */

import type { AnalysisContext, StructureJSON } from './types'
import {
  formatTokensForPrompt,
  formatComponentsForPrompt,
  getValidPropertyNames,
  getValidStateNames,
} from './stage-0-analysis'

// =============================================================================
// Forbidden Syntax Warning
// =============================================================================

const FORBIDDEN_SYNTAX_WARNING = `
## VERBOTENE SYNTAX

NIEMALS CSS-Einheiten in Werten:
- FALSCH: "12px", "1rem", "100%", "12px 24px"
- RICHTIG: 12, 1, "full", "12 24"

NIEMALS Doppelpunkte in JSON-Properties:
- FALSCH: padding: 12
- RICHTIG: { "name": "padding", "value": 12 }

NIEMALS Anführungszeichen um Zahlen:
- FALSCH: { "value": "12" }
- RICHTIG: { "value": 12 }

Beispiele für korrekte Property-Werte:
- padding: 12 (nicht "12px")
- padding: "8 16" (nicht "8px 16px")
- radius: 4 (nicht "4px")
- width: "full" (nicht "100%")
- gap: 8 (nicht "8px")
`

// =============================================================================
// JSON Schema (for prompts)
// =============================================================================

const STRUCTURE_JSON_SCHEMA = `{
  "components": [
    {
      "type": "ComponentName (PascalCase)",
      "name": "DefinitionName (optional, for Name:)",
      "isDefinition": true/false,
      "content": "Text content",
      "children": [...]
    }
  ]
}`

const PROPERTIES_JSON_SCHEMA = `{
  "components": [
    {
      "type": "ComponentName",
      "name": "DefinitionName (optional)",
      "isDefinition": true/false,
      "content": "Text content",
      "properties": [
        { "name": "propertyName", "value": "value", "isToken": true/false }
      ],
      "states": [
        { "name": "stateName", "properties": [...] }
      ],
      "events": [
        { "event": "onclick", "actions": ["action1", "action2"] }
      ],
      "children": [...]
    }
  ]
}`

// =============================================================================
// Stage 1: Structure Prompt
// =============================================================================

export const STRUCTURE_SYSTEM_PROMPT = `Du generierst UI-LAYOUTS als JSON.

## KONTEXT: BESTEHENDE ANWENDUNG

Du ERGÄNZT Layouts in einer BESTEHENDEN Anwendung mit vordefinierten, gestylten Komponenten.
KEINE neuen Styles erfinden - die Komponenten sind BEREITS PERFEKT GESTYLT!

## VORDEFINIERTE KOMPONENTEN (IMMER verwenden!)

### Layout: App, Header, Footer, Content, Main, Sidebar, Page, Container
### Card: Card, CardHeader, CardTitle, CardContent, CardFooter
### Form: Form, FormContent, FormGroup, FormRow, FormFooter, InputField, Label, Input
### Controls: Button, PrimaryButton, GhostButton, IconButton, Switch, Checkbox, Radio
### Navigation: Nav, NavGroup, Item, MenuItem, Tabs, Tab, UnderlineTabs
### Table: Table, TableHeader, Row, HeaderRow, Cell
### Feedback: Alert, Toast, Spinner, Progress, Badge, BadgeSuccess, BadgeError, Chip
### Overlay: Dialog, Modal, Dropdown, Popover
### Data: List, ListItem, Accordion, Tree, Timeline
### User: Avatar, UserCard, UserInfo, UserName
### Stats: StatCard, StatValue, StatLabel, Grid2, Grid3

## DEINE AUFGABE

Generiere NUR die LAYOUT-HIERARCHIE:
- Welche Komponenten werden verwendet
- Wie sind sie verschachtelt
- Welche Text-Inhalte haben sie

KEINE Styling-Properties! Die Komponenten sind bereits perfekt gestylt.

## OUTPUT FORMAT

Antworte NUR mit validem JSON:
${STRUCTURE_JSON_SCHEMA}

## REGELN

1. IMMER vordefinierte Komponenten nutzen
2. Text-Inhalte in "content" speichern
3. NUR JSON - keine Erklärungen

## BEISPIELE

>>> zwei Tabs
{"components":[{"type":"Tabs","children":[{"type":"Tab","content":"Privat"},{"type":"Tab","content":"Geschäft"}]}]}

>>> Navigation
{"components":[{"type":"Nav","children":[{"type":"Item","children":[{"type":"Icon","content":"home"},{"type":"Text","content":"Home"}]},{"type":"Item","children":[{"type":"Icon","content":"settings"},{"type":"Text","content":"Settings"}]}]}]}

>>> Formular
{"components":[{"type":"Form","children":[{"type":"FormContent","children":[{"type":"InputField","children":[{"type":"Label","content":"Name"},{"type":"Input"}]}]},{"type":"FormFooter","children":[{"type":"Button","content":"Abbrechen"},{"type":"PrimaryButton","content":"Speichern"}]}]}]}

>>> Tabelle
{"components":[{"type":"Table","children":[{"type":"HeaderRow","children":[{"type":"Cell","content":"Name"},{"type":"Cell","content":"Email"}]},{"type":"Row","children":[{"type":"Cell","content":"Max"},{"type":"Cell","content":"max@example.com"}]}]}]}

>>> Statistiken
{"components":[{"type":"Grid3","children":[{"type":"StatCard","children":[{"type":"StatLabel","content":"Benutzer"},{"type":"StatValue","content":"1,234"}]},{"type":"StatCard","children":[{"type":"StatLabel","content":"Umsatz"},{"type":"StatValue","content":"€45,678"}]}]}]}`

export function buildStructureUserPrompt(
  prompt: string,
  context: AnalysisContext
): string {
  const parts: string[] = []

  // Use the optimized formatted context from Stage 0
  // This includes: Task Understanding, Suggested Structure, Required Capabilities
  if (context.formattedContext) {
    // Extract only the structure-relevant parts
    const structureParts = context.formattedContext
      .split('\n\n')
      .filter(section =>
        section.includes('TASK UNDERSTANDING') ||
        section.includes('SUGGESTED STRUCTURE') ||
        section.includes('EXISTING COMPONENTS')
      )
    if (structureParts.length > 0) {
      parts.push(structureParts.join('\n\n'))
      parts.push('')
    }
  }

  // Add the request
  parts.push('## ANFRAGE')
  parts.push(prompt)
  parts.push('')
  parts.push('Generiere die Komponenten-Struktur als JSON.')
  parts.push('NUR Struktur, KEINE Properties/Styling!')

  return parts.join('\n')
}

// =============================================================================
// Stage 2: Properties Prompt
// =============================================================================

export const PROPERTIES_SYSTEM_PROMPT = `Du vervollständigst UI-Layouts - MINIMAL.
${FORBIDDEN_SYNTAX_WARNING}
## KONTEXT: BESTEHENDE ANWENDUNG

Du arbeitest mit BEREITS GESTYLTEN Komponenten!
Die Komponenten (Tabs, Tab, Item, Form, etc.) haben schon alle Styles.

## DEINE AUFGABE: MINIMAL!

Füge NUR hinzu wenn WIRKLICH nötig:
- Events (onclick) → nur bei expliziter Interaktion
- States (active, selected) → nur bei explizitem Zustandswechsel
- KEINE Styles hinzufügen! padding, background, radius, color → IGNORIEREN!

## OUTPUT FORMAT

Antworte NUR mit validem JSON:
${PROPERTIES_JSON_SCHEMA}

## WANN NEUE KOMPONENTEN DEFINIEREN?

Nur wenn es KEINE passende vordefinierte Komponente gibt.
Dann: im MINIMALISTISCHEN STIL der Anwendung:
- Kleine Abstände: padding 4-12, gap 2-8
- Dunkle Farben: #1A-#33 (Hintergrund), #555-#AAA (Text)
- Kleine Radien: radius 4-8 (max 12)
- KEINE Borders außer bei Overlays
- KEINE Shadows außer bei Overlays

## PROPERTY-NAMEN (Longform!)

horizontal, vertical, gap, spread, grid
width, height, grow, padding
background, color, radius
font-size, weight, cursor

## LAYOUT-RICHTUNG

- "vertikal", "untereinander" → { "name": "vertical", "value": true }
- "horizontal", "nebeneinander" → { "name": "horizontal", "value": true }

## TOKEN REFERENZEN

{ "name": "background", "value": "primary", "isToken": true }
→ wird zu: background $primary

WICHTIG: NUR verfügbare Tokens verwenden!

## EVENTS & ACTIONS (nur wenn nötig!)

onclick: activate, deactivate-siblings, toggle, show, hide, open, close

## BEISPIEL: KEINE STYLES für vordefinierte Komponenten

Input: { "type": "Tab", "content": "Privat" }
Output: { "type": "Tab", "content": "Privat" }
→ Tab ist bereits gestylt, NICHTS hinzufügen!

## BEISPIEL: Event hinzufügen

Input: { "type": "Tab", "content": "Privat" }
Output (wenn Interaktion gewünscht):
{
  "type": "Tab",
  "content": "Privat",
  "events": [
    { "event": "onclick", "actions": ["activate self", "deactivate-siblings"] }
  ]
}`

export function buildPropertiesUserPrompt(
  structure: StructureJSON,
  context: AnalysisContext
): string {
  const parts: string[] = []

  // CRITICAL: Emphasize minimal changes for predefined components
  parts.push('## WICHTIG: VORDEFINIERTE KOMPONENTEN NICHT STYLEN!')
  parts.push('Nav, Item, Tabs, Tab, Card, Button, Form, etc. haben BEREITS alle Styles.')
  parts.push('Füge NUR Events hinzu wenn explizit Interaktion gewünscht.')
  parts.push('KEINE Properties wie padding, gap, background, color, radius!')
  parts.push('')

  // Tokens only if user has defined some
  if (context.tokens && context.tokens.length > 0) {
    parts.push('## VERFÜGBARE TOKENS')
    const tokenList = context.tokens.map(t => t.name).join(', ')
    parts.push(tokenList)
    parts.push('')
  } else {
    parts.push('## TOKENS')
    parts.push('KEINE Tokens nötig - vordefinierte Komponenten sind bereits gestylt.')
    parts.push('')
  }

  // Only show events/actions if relevant
  if (context.validEvents.size > 0) {
    parts.push('## EVENTS (nur wenn Interaktion gewünscht)')
    parts.push(Array.from(context.validEvents).join(', '))
    parts.push('')
  }

  if (context.validActions.size > 0) {
    parts.push('## ACTIONS')
    parts.push(Array.from(context.validActions).join(', '))
    parts.push('')
  }

  // Add the structure
  parts.push('## STRUKTUR')
  parts.push('```json')
  parts.push(JSON.stringify(structure, null, 2))
  parts.push('```')
  parts.push('')

  parts.push('Gib die Struktur UNVERÄNDERT zurück.')
  parts.push('Füge NUR Events hinzu wenn explizit Interaktion gewünscht.')

  return parts.join('\n')
}

// =============================================================================
// Correction Prompt
// =============================================================================

export const CORRECTION_SYSTEM_PROMPT = `Du korrigierst JSON-Fehler.

## DEINE AUFGABE

Das JSON hat Validierungsfehler. Korrigiere sie.

## REGELN

1. Behalte die Grundstruktur bei
2. Korrigiere nur die gemeldeten Fehler
3. Antworte NUR mit korrigiertem JSON
4. Keine Erklärungen`

export function buildCorrectionUserPrompt(
  json: string,
  errors: string[]
): string {
  const parts: string[] = []

  parts.push('## FEHLER')
  for (const error of errors) {
    parts.push(`- ${error}`)
  }
  parts.push('')

  parts.push('## ORIGINAL JSON')
  parts.push('```json')
  parts.push(json)
  parts.push('```')
  parts.push('')

  parts.push('Korrigiere die Fehler und gib das vollständige JSON zurück.')

  return parts.join('\n')
}

// =============================================================================
// Combined Single-Stage Prompt (Optimized)
// =============================================================================

/**
 * Single-stage prompt that generates structure + properties in one call.
 * More efficient for simple prompts.
 */
export const COMBINED_SYSTEM_PROMPT = `Du generierst UI-LAYOUTS als JSON.
${FORBIDDEN_SYNTAX_WARNING}
## KONTEXT: BESTEHENDE ANWENDUNG

Du ERGÄNZT Layouts in einer bestehenden Anwendung.
Die Komponenten sind BEREITS PERFEKT GESTYLT - füge KEINE Styles hinzu!

## VORDEFINIERTE KOMPONENTEN (IMMER verwenden!)

Layout: App, Header, Footer, Content, Main, Sidebar, Page, Container
Card: Card, CardHeader, CardTitle, CardContent, CardFooter
Form: Form, FormContent, InputField, Label, Input, FormFooter
Controls: Button, PrimaryButton, GhostButton, IconButton, Switch, Checkbox
Navigation: Nav, Item, Tabs, Tab, UnderlineTabs
Table: Table, HeaderRow, Row, Cell
Feedback: Alert, Toast, Badge, BadgeSuccess, BadgeError, Chip
Overlay: Dialog, Modal, Dropdown
Data: List, ListItem, Accordion
User: Avatar, UserCard, UserInfo, UserName
Stats: StatCard, StatValue, StatLabel, Grid2, Grid3

## OUTPUT FORMAT

Antworte NUR mit validem JSON:
${PROPERTIES_JSON_SCHEMA}

## DEINE AUFGABE: NUR LAYOUT!

1. Wähle die passenden vordefinierten Komponenten
2. Verschachtele sie korrekt
3. KEINE Styles hinzufügen (Komponenten sind bereits gestylt!)
4. Events NUR wenn explizit Interaktion gewünscht

## WANN NEUE KOMPONENTEN DEFINIEREN?

Nur wenn KEINE passende vordefinierte existiert.
Dann im MINIMALISTISCHEN STIL:
- padding: 4-12, gap: 2-8
- Farben: #1A-#33 (dunkel), #555-#AAA (Text)
- radius: 4-8 (max 12)
- KEINE borders, KEINE shadows

## BEISPIELE

>>> Tabs
{"components":[{"type":"Tabs","children":[{"type":"Tab","content":"Privat"},{"type":"Tab","content":"Geschäft"}]}]}

>>> Navigation
{"components":[{"type":"Nav","children":[{"type":"Item","children":[{"type":"Icon","content":"home"},{"type":"Text","content":"Home"}]},{"type":"Item","children":[{"type":"Icon","content":"settings"},{"type":"Text","content":"Settings"}]}]}]}

>>> Formular
{"components":[{"type":"Form","children":[{"type":"FormContent","children":[{"type":"InputField","children":[{"type":"Label","content":"Name"},{"type":"Input"}]}]},{"type":"FormFooter","children":[{"type":"Button","content":"Abbrechen"},{"type":"PrimaryButton","content":"Speichern"}]}]}]}

>>> Dialog
{"components":[{"type":"Dialog","children":[{"type":"DialogHeader","children":[{"type":"DialogTitle","content":"Bestätigen"},{"type":"IconButton","children":[{"type":"Icon","content":"x"}]}]},{"type":"DialogContent","children":[{"type":"Text","content":"Fortfahren?"}]},{"type":"DialogFooter","children":[{"type":"Button","content":"Nein"},{"type":"PrimaryButton","content":"Ja"}]}]}]}

## WICHTIG

- NUR JSON, keine Erklärungen
- IMMER vordefinierte Komponenten
- KEINE Styles für vordefinierte Komponenten!`

export function buildCombinedUserPrompt(
  prompt: string,
  context: AnalysisContext
): string {
  const parts: string[] = []

  // CRITICAL: Emphasize NO STYLING for predefined components
  parts.push('## WICHTIG: VORDEFINIERTE KOMPONENTEN')
  parts.push('Die Komponenten Nav, Item, Tabs, Tab, Card, Button, etc. sind BEREITS GESTYLT!')
  parts.push('Füge KEINE Properties hinzu: kein padding, gap, background, color, radius!')
  parts.push('NUR content (Text) und children (Verschachtelung) setzen.')
  parts.push('')

  // Tokens only if user has defined some
  if (context.tokens && context.tokens.length > 0) {
    parts.push('## VERFÜGBARE TOKENS')
    const tokenList = context.tokens.map(t => t.name).join(', ')
    parts.push(tokenList)
    parts.push('')
  } else {
    parts.push('## TOKENS')
    parts.push('KEINE Tokens nötig - vordefinierte Komponenten haben bereits alle Styles.')
    parts.push('Definiere NUR Tokens wenn du eine NEUE Komponente erstellst.')
    parts.push('')
  }

  // Request
  parts.push('## ANFRAGE')
  parts.push(prompt)
  parts.push('')
  parts.push('Generiere NUR die Struktur - welche Komponenten, wie verschachtelt, welcher Text.')
  parts.push('KEINE Properties für vordefinierte Komponenten!')

  return parts.join('\n')
}
