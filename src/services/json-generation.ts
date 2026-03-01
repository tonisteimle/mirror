/**
 * JSON-based Mirror Code Generation
 *
 * Strategy: LLM generates structured JSON → deterministic conversion to Mirror DSL
 *
 * Benefits:
 * - JSON schema is validatable before conversion
 * - No syntax ambiguity (no "px" vs number, no ": " vs space)
 * - Deterministic output - conversion is rule-based, error-free
 */

import { getApiKey } from '../lib/ai'
import { API } from '../constants'

// =============================================================================
// JSON Schema Types
// =============================================================================

export interface MirrorProperty {
  name: string
  value: string | number | boolean
  /** For tokens: true if value starts with $ */
  isToken?: boolean
}

export interface MirrorState {
  name: string
  properties: MirrorProperty[]
}

export interface MirrorEvent {
  event: string  // onclick, onhover, etc.
  key?: string   // for keyboard events: escape, enter, etc.
  actions: string[]
}

export interface MirrorComponent {
  /** Component type (Box, Text, Button, etc.) or custom name */
  type: string
  /** If true, this is a definition (Name:) */
  isDefinition?: boolean
  /** For "as" syntax: Email as Input */
  definedAs?: string
  /** For named instances: Button named SaveBtn */
  instanceName?: string
  /** Text content (string in quotes) */
  content?: string
  /** Style/layout properties */
  properties?: MirrorProperty[]
  /** State blocks (hover, selected, etc.) */
  states?: MirrorState[]
  /** Event handlers */
  events?: MirrorEvent[]
  /** Child components */
  children?: MirrorComponent[]
}

export interface MirrorJSON {
  /** Root components */
  components: MirrorComponent[]
  /** Token definitions (optional) */
  tokens?: Record<string, string | number>
  /** State variables (optional) */
  variables?: Record<string, string | number | boolean | null>
}

// =============================================================================
// JSON Schema (for prompt)
// =============================================================================

export const JSON_SCHEMA = `{
  "components": [
    {
      "type": "string (Box, Text, Button, Icon, Input, etc.)",
      "isDefinition": "boolean (true for Name:)",
      "definedAs": "string (for 'as' syntax)",
      "instanceName": "string (for 'named' syntax)",
      "content": "string (text content in quotes)",
      "properties": [
        { "name": "string", "value": "string|number|boolean", "isToken": "boolean" }
      ],
      "states": [
        { "name": "string (hover, selected, etc.)", "properties": [...] }
      ],
      "events": [
        { "event": "string", "key": "string?", "actions": ["string"] }
      ],
      "children": [...]
    }
  ],
  "tokens": { "$name": "value" },
  "variables": { "$name": "value" }
}`

// =============================================================================
// JSON to Mirror DSL Converter
// =============================================================================

function indent(level: number): string {
  return '  '.repeat(level)
}

function propertyToMirror(prop: MirrorProperty): string {
  const value = prop.isToken ? `$${prop.value}` : prop.value
  return `${prop.name} ${value}`
}

function stateToMirror(state: MirrorState, level: number): string[] {
  const lines: string[] = []
  // System states use direct keyword, behavior states use "state" prefix
  const systemStates = ['hover', 'focus', 'active', 'disabled']
  const prefix = systemStates.includes(state.name) ? state.name : `state ${state.name}`
  lines.push(`${indent(level)}${prefix}`)
  for (const prop of state.properties) {
    lines.push(`${indent(level + 1)}${propertyToMirror(prop)}`)
  }
  return lines
}

function eventToMirror(event: MirrorEvent, level: number): string[] {
  const lines: string[] = []
  const eventName = event.key ? `${event.event} ${event.key}` : event.event
  for (const action of event.actions) {
    lines.push(`${indent(level)}${eventName}: ${action}`)
  }
  return lines
}

function componentToMirror(comp: MirrorComponent, level: number): string[] {
  const lines: string[] = []

  // Build component line
  let typeLine = comp.type
  if (comp.isDefinition) {
    typeLine += ':'
  }
  if (comp.definedAs) {
    typeLine = `${comp.type} as ${comp.definedAs}`
  }
  if (comp.instanceName) {
    typeLine += ` named ${comp.instanceName}`
  }

  lines.push(`${indent(level)}${typeLine}`)

  // Properties
  if (comp.properties) {
    for (const prop of comp.properties) {
      lines.push(`${indent(level + 1)}${propertyToMirror(prop)}`)
    }
  }

  // Content (string)
  if (comp.content) {
    lines.push(`${indent(level + 1)}"${comp.content}"`)
  }

  // States
  if (comp.states) {
    for (const state of comp.states) {
      lines.push(...stateToMirror(state, level + 1))
    }
  }

  // Events
  if (comp.events) {
    for (const event of comp.events) {
      lines.push(...eventToMirror(event, level + 1))
    }
  }

  // Children
  if (comp.children) {
    for (const child of comp.children) {
      lines.push(...componentToMirror(child, level + 1))
    }
  }

  return lines
}

export function jsonToMirror(json: MirrorJSON): string {
  const lines: string[] = []

  // Variables
  if (json.variables) {
    for (const [name, value] of Object.entries(json.variables)) {
      const valStr = value === null ? 'null' : value
      lines.push(`${name}: ${valStr}`)
    }
    if (Object.keys(json.variables).length > 0) {
      lines.push('')
    }
  }

  // Tokens
  if (json.tokens) {
    for (const [name, value] of Object.entries(json.tokens)) {
      lines.push(`${name}: ${value}`)
    }
    if (Object.keys(json.tokens).length > 0) {
      lines.push('')
    }
  }

  // Components
  for (const comp of json.components) {
    lines.push(...componentToMirror(comp, 0))
  }

  return lines.join('\n')
}

// =============================================================================
// JSON Schema Validation
// =============================================================================

export interface ValidationError {
  path: string
  message: string
}

export function validateMirrorJSON(json: unknown): { valid: boolean; errors: ValidationError[] } {
  const errors: ValidationError[] = []

  if (!json || typeof json !== 'object') {
    errors.push({ path: '', message: 'Root must be an object' })
    return { valid: false, errors }
  }

  const obj = json as Record<string, unknown>

  if (!Array.isArray(obj.components)) {
    errors.push({ path: 'components', message: 'components must be an array' })
    return { valid: false, errors }
  }

  function validateComponent(comp: unknown, path: string): void {
    if (!comp || typeof comp !== 'object') {
      errors.push({ path, message: 'Component must be an object' })
      return
    }

    const c = comp as Record<string, unknown>

    if (typeof c.type !== 'string' || !c.type) {
      errors.push({ path: `${path}.type`, message: 'type is required and must be a string' })
    }

    if (c.properties && !Array.isArray(c.properties)) {
      errors.push({ path: `${path}.properties`, message: 'properties must be an array' })
    }

    if (c.children && Array.isArray(c.children)) {
      c.children.forEach((child, i) => validateComponent(child, `${path}.children[${i}]`))
    }
  }

  obj.components.forEach((comp, i) => validateComponent(comp, `components[${i}]`))

  return { valid: errors.length === 0, errors }
}

// =============================================================================
// LLM JSON Generation
// =============================================================================

const JSON_SYSTEM_PROMPT = `Du generierst Mirror DSL Code als strukturiertes JSON.

## OUTPUT FORMAT

Antworte NUR mit validem JSON (kein Markdown, keine Erklärungen):

${JSON_SCHEMA}

## PROPERTY NAMES (Longform)

- horizontal (nicht hor)
- vertical (nicht ver)
- padding (nicht pad)
- background (nicht bg)
- color (nicht col)
- radius (nicht rad)
- width (nicht w)
- height (nicht h)
- icon-size (nicht is)
- vertical-center (nicht ver-cen)

## TOKEN REFERENZEN

Tokens mit isToken: true markieren:
{ "name": "background", "value": "primary", "isToken": true }
→ wird zu: background $primary

## HORIZONTAL LAYOUT

Kinder in horizontal Layout brauchen Breite:
- Feste Breite: { "name": "width", "value": 100 }
- Flexibel: { "name": "grow", "value": true }

## BEISPIEL

Input: "Ein Button mit blauem Hintergrund"

Output:
{
  "components": [
    {
      "type": "Button",
      "properties": [
        { "name": "background", "value": "3B82F6" },
        { "name": "padding", "value": "md", "isToken": true },
        { "name": "radius", "value": "md", "isToken": true }
      ]
    }
  ]
}

## WICHTIG

- NUR JSON ausgeben, kein anderer Text
- Keine CSS-Syntax (kein "px", kein ":", keine Semikolons)
- Zahlen als Numbers, nicht als Strings
- Boolean-Werte als true/false, nicht als Strings`

export interface JSONGenerationResult {
  json: MirrorJSON | null
  mirrorCode: string
  error?: string
  jsonValid: boolean
  jsonErrors?: ValidationError[]
  timeMs: number
}

export async function generateViaJSON(prompt: string): Promise<JSONGenerationResult> {
  const startTime = performance.now()

  try {
    const response = await fetch(API.ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getApiKey()}`,
        'HTTP-Referer': window.location.origin,
        'X-Title': 'Mirror JSON Generation',
      },
      body: JSON.stringify({
        model: API.MODEL_FAST,
        messages: [
          { role: 'system', content: JSON_SYSTEM_PROMPT },
          { role: 'user', content: prompt }
        ],
        max_tokens: 2048,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`API Error: ${response.status} - ${errorText}`)
    }

    const data = await response.json()
    let content = data.choices?.[0]?.message?.content || ''

    // Clean up potential markdown wrapping
    content = content
      .replace(/```json\s*/gi, '')
      .replace(/```\s*/g, '')
      .trim()

    // Parse JSON
    let json: MirrorJSON
    try {
      json = JSON.parse(content)
    } catch (parseError) {
      return {
        json: null,
        mirrorCode: '',
        error: `JSON parse error: ${parseError}`,
        jsonValid: false,
        timeMs: performance.now() - startTime,
      }
    }

    // Validate JSON schema
    const validation = validateMirrorJSON(json)
    if (!validation.valid) {
      return {
        json,
        mirrorCode: '',
        error: 'JSON schema validation failed',
        jsonValid: false,
        jsonErrors: validation.errors,
        timeMs: performance.now() - startTime,
      }
    }

    // Convert to Mirror DSL
    const mirrorCode = jsonToMirror(json)

    return {
      json,
      mirrorCode,
      jsonValid: true,
      timeMs: performance.now() - startTime,
    }

  } catch (error) {
    return {
      json: null,
      mirrorCode: '',
      error: error instanceof Error ? error.message : String(error),
      jsonValid: false,
      timeMs: performance.now() - startTime,
    }
  }
}
