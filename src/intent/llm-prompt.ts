/**
 * LLM Prompt Builder für Intent-basierte Code-Generierung
 *
 * Das LLM arbeitet nur mit dem Intent-Format:
 * - Bekommt aktuellen Stand als JSON
 * - Versteht User-Intent
 * - Gibt modifiziertes JSON zurück
 * - Kennt KEINE Mirror-Syntax
 */

import type { Intent } from './schema'
import { validateIntent } from './validator'

// =============================================================================
// Schema Version
// =============================================================================

export const INTENT_SCHEMA_VERSION = 'v1'

// =============================================================================
// Few-Shot Examples
// =============================================================================

const FEW_SHOT_EXAMPLES = `
## Beispiele

### Beispiel 1: Button hinzufügen
User: "Füge einen blauen Button hinzu"
Antwort:
{
  "tokens": { "colors": { "primary": "#3B82F6" } },
  "components": [],
  "layout": [
    {
      "component": "Button",
      "text": "Click",
      "style": { "background": "$primary", "padding": [12, 24], "radius": 8 }
    }
  ]
}

### Beispiel 2: Farbe ändern
User: "Mach den Button rot"
Änderung: Nur "background" in style anpassen
{
  "layout": [
    {
      "component": "Button",
      "style": { "background": "#EF4444" }
    }
  ]
}

### Beispiel 3: Event hinzufügen
User: "Der Button soll zur Dashboard-Seite navigieren"
Antwort: Event-Objekt hinzufügen
{
  "layout": [
    {
      "component": "Button",
      "text": "Dashboard",
      "events": {
        "onclick": [{ "action": "navigate", "target": "Dashboard" }]
      }
    }
  ]
}

### Beispiel 4: Komponente mit States
User: "Erstelle einen Toggle-Button der bei Hover heller wird"
{
  "components": [
    {
      "name": "ToggleButton",
      "style": { "background": "#3B82F6", "padding": [8, 16], "radius": 6 },
      "states": {
        "hover": { "background": "#60A5FA" }
      }
    }
  ],
  "layout": [
    { "component": "ToggleButton", "text": "Toggle" }
  ]
}

### Beispiel 5: Formular erstellen
User: "Erstelle ein Login-Formular"
{
  "tokens": {
    "colors": { "primary": "#3B82F6", "surface": "#1E1E2E", "text-muted": "#9CA3AF" },
    "spacing": { "md": 16, "lg": 24 },
    "radii": { "md": 8 }
  },
  "components": [],
  "layout": [
    {
      "component": "Card",
      "style": { "direction": "vertical", "gap": "$md", "padding": "$lg", "background": "$surface", "radius": "$md" },
      "children": [
        { "component": "Text", "text": "Login", "style": { "fontSize": 24, "fontWeight": 600 } },
        { "component": "Input", "inputType": "email", "placeholder": "Email" },
        { "component": "Input", "inputType": "password", "placeholder": "Password" },
        {
          "component": "Button",
          "text": "Sign In",
          "style": { "background": "$primary", "padding": [12, 24] },
          "events": { "onclick": [{ "action": "navigate", "target": "Dashboard" }] }
        }
      ]
    }
  ]
}
`

// =============================================================================
// System Prompt - erklärt dem LLM das Format
// =============================================================================

export const INTENT_SYSTEM_PROMPT = `Du bist ein UI-Design-Assistent. Du arbeitest mit einem strukturierten JSON-Format um UIs zu beschreiben.

## Deine Aufgabe
- Verstehe was der User ändern/hinzufügen möchte
- Modifiziere das JSON entsprechend
- Gib NUR das modifizierte JSON zurück (keine Erklärungen)

## JSON Format (Schema ${INTENT_SCHEMA_VERSION})

\`\`\`typescript
{
  "$schema": "${INTENT_SCHEMA_VERSION}",  // Schema-Version

  // Design Tokens (Farben, Abstände, etc.)
  "tokens": {
    "colors": { "primary": "#3B82F6", "surface": "#1E1E2E" },
    "spacing": { "md": 16, "lg": 24 },
    "radii": { "md": 8 },
    "sizes": { "text-lg": 18 }
  },

  // Wiederverwendbare Komponenten-Definitionen
  "components": [
    {
      "name": "Card",
      "base": "Box",                      // Optional: Vererbung
      "style": {
        "direction": "vertical",          // oder "horizontal"
        "gap": "$md",                     // Token-Referenz oder Zahl
        "padding": 16,                    // oder [12, 24] oder [8, 16, 8, 16]
        "background": "$surface",
        "radius": "$md",
        "shadow": "md"                    // "sm", "md", "lg"
      },
      "states": {
        "hover": { "background": "#2A2A3E" }
      }
    }
  ],

  // Tatsächliches Layout (Instanzen)
  "layout": [
    {
      "component": "Card",
      "id": "MainCard",                   // Optional: Name für Referenzierung
      "text": "Hello",                    // Text-Inhalt
      "style": { ... },                   // Inline Style-Überschreibungen
      "children": [ ... ],                // Verschachtelte Elemente

      // Primitive-Eigenschaften
      "inputType": "email",               // Für Input: text, email, password, etc.
      "placeholder": "Enter...",          // Für Input/Textarea
      "src": "image.jpg",                 // Für Image
      "href": "https://...",              // Für Link

      // Events
      "events": {
        "onclick": [{ "action": "navigate", "target": "Dashboard" }]
      }
    }
  ]
}
\`\`\`

## Wichtige Regeln

1. **Tokens nutzen**: Verwende immer Tokens für Farben/Abstände wenn sinnvoll
   - Erstelle neue Tokens wenn nötig
   - Referenziere mit "$tokenname"
   - Semantische Namen: "primary", "surface", "md", "lg"

2. **Komponenten wiederverwenden**: Definiere Komponenten für wiederholte Patterns
   - Nutze "base" für Vererbung

3. **Konsistenz**: Halte das Design-System konsistent
   - Gleiche Abstände für ähnliche Elemente
   - Farbpalette einhalten

## Verfügbare Style-Eigenschaften

- **Layout**: direction, gap, alignHorizontal, alignVertical, center, wrap, between
- **Spacing**: padding, margin (Zahl oder Array [v, h] oder [t, r, b, l])
- **Sizing**: width, height, minWidth, maxWidth, full, grow
- **Colors**: background, color, borderColor
- **Border**: radius, border
- **Typography**: fontSize, fontWeight, fontFamily, textAlign, italic, underline
- **Effects**: shadow, opacity, cursor
- **Visibility**: hidden, disabled

## Verfügbare Actions für Events

- **Navigation**: navigate, page
- **Visibility**: toggle, show, hide, open, close
- **Selection**: highlight, select, deselect, clear-selection
- **State**: change, activate, deactivate, toggle-state
- **Form**: focus, validate, reset, filter
- **Data**: assign

${FEW_SHOT_EXAMPLES}

## Antwort-Format
Antworte NUR mit dem JSON. Kein Markdown, keine Erklärungen.
`

// =============================================================================
// User Prompt Builder
// =============================================================================

export function buildUserPrompt(currentIntent: Intent, userRequest: string): string {
  // Add schema version if not present
  const intentWithSchema = {
    $schema: INTENT_SCHEMA_VERSION,
    ...currentIntent,
  }

  return `## Aktueller Stand

\`\`\`json
${JSON.stringify(intentWithSchema, null, 2)}
\`\`\`

## Änderungswunsch

${userRequest}

## Deine Aufgabe

Modifiziere das JSON entsprechend dem Änderungswunsch. Antworte NUR mit dem kompletten, modifizierten JSON.`
}

// =============================================================================
// JSON Repair Utilities
// =============================================================================

/**
 * Attempts to repair common JSON issues from LLM responses
 */
function repairJSON(jsonStr: string): string {
  let repaired = jsonStr

  // Remove trailing commas before ] or }
  repaired = repaired.replace(/,(\s*[}\]])/g, '$1')

  // Fix missing quotes around property names
  repaired = repaired.replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)(\s*:)/g, '$1"$2"$3')

  // Fix single quotes to double quotes
  repaired = repaired.replace(/'/g, '"')

  // Remove comments (// style)
  repaired = repaired.replace(/\/\/[^\n]*/g, '')

  // Remove control characters
  repaired = repaired.replace(/[\x00-\x1F\x7F]/g, ' ')

  return repaired
}

/**
 * Extracts partial intent from malformed JSON response
 */
function extractPartialIntent(response: string): Partial<Intent> | null {
  const partial: Partial<Intent> = {}

  // Try to extract tokens
  const tokensMatch = response.match(/"tokens"\s*:\s*({[^}]*})/s)
  if (tokensMatch) {
    try {
      partial.tokens = JSON.parse(tokensMatch[1])
    } catch { /* ignore */ }
  }

  // Try to extract components
  const componentsMatch = response.match(/"components"\s*:\s*(\[[^\]]*\])/s)
  if (componentsMatch) {
    try {
      partial.components = JSON.parse(componentsMatch[1])
    } catch { /* ignore */ }
  }

  // Try to extract layout
  const layoutMatch = response.match(/"layout"\s*:\s*(\[[^\]]*\])/s)
  if (layoutMatch) {
    try {
      partial.layout = JSON.parse(layoutMatch[1])
    } catch { /* ignore */ }
  }

  return Object.keys(partial).length > 0 ? partial : null
}

// =============================================================================
// Response Parser with Error Recovery
// =============================================================================

export interface ParseResult {
  intent: Intent | null
  partial: Partial<Intent> | null
  errors: string[]
  validationErrors: string[]
}

export function parseIntentResponse(response: string): Intent | null {
  const result = parseIntentResponseWithDetails(response)
  return result.intent
}

export function parseIntentResponseWithDetails(response: string): ParseResult {
  const errors: string[] = []
  const validationErrors: string[] = []
  let intent: Intent | null = null
  let partial: Partial<Intent> | null = null

  try {
    // Step 1: Extract JSON from response
    let jsonStr = response.trim()

    // Remove markdown code blocks if present
    const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim()
    }

    // Step 2: Try to parse as-is
    try {
      intent = JSON.parse(jsonStr)
    } catch (parseError) {
      errors.push(`Initial parse failed: ${parseError}`)

      // Step 3: Try to repair JSON
      const repairedStr = repairJSON(jsonStr)
      try {
        intent = JSON.parse(repairedStr)
        errors.push('JSON was repaired successfully')
      } catch (repairError) {
        errors.push(`Repair failed: ${repairError}`)

        // Step 4: Try to extract partial intent
        partial = extractPartialIntent(jsonStr)
        if (partial) {
          errors.push('Extracted partial intent')
        }
      }
    }

    // Step 5: Validate structure
    if (intent) {
      // Ensure required fields exist
      if (!intent.tokens) {
        intent.tokens = { colors: {}, spacing: {}, radii: {}, sizes: {} }
      }
      if (!intent.components) {
        intent.components = []
      }
      if (!intent.layout) {
        intent.layout = []
      }

      // Run validation
      const validation = validateIntent(intent)
      if (!validation.valid) {
        validationErrors.push(...validation.errors.map(e => `${e.path}: ${e.message}`))
      }
    }

    return { intent, partial, errors, validationErrors }
  } catch (e) {
    errors.push(`Unexpected error: ${e}`)
    return { intent: null, partial: null, errors, validationErrors }
  }
}

// =============================================================================
// Schema Migration
// =============================================================================

/**
 * Migrates intent from older schema versions to current version
 */
export function migrateIntent(intent: Intent & { $schema?: string }): Intent {
  const version = intent.$schema || 'v0'

  if (version === INTENT_SCHEMA_VERSION) {
    return intent
  }

  // v0 -> v1: No changes needed, just add version
  if (version === 'v0' || !intent.$schema) {
    return {
      ...intent,
      // Remove $schema from the returned object as it's not part of Intent type
    }
  }

  // Future migrations go here
  return intent
}
