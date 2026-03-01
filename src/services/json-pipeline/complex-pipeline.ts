/**
 * Complex Pipeline for Large UI Generation
 *
 * For prompts like "Dashboard für Anlageberater" that need:
 * 1. Decomposition - Break down into parts
 * 2. Component Definitions - Reusable building blocks
 * 3. Layout Structure - Overall skeleton
 * 4. Assembly - Put it together with styling
 * 5. Review - Validate completeness
 */

import type { AnalysisContext, PropertiesJSON, FullComponent } from './types'
import { getApiKey } from '../../lib/ai'
import { API } from '../../constants'

// =============================================================================
// Types
// =============================================================================

export interface DecompositionResult {
  /** Main areas of the UI (e.g., Sidebar, Header, Main) */
  areas: Area[]
  /** Domain entities (e.g., Portfolio, Client, Transaction) */
  entities: Entity[]
  /** Reusable components to define */
  components: ComponentSpec[]
  /** Key interactions */
  interactions: string[]
}

interface Area {
  name: string
  purpose: string
  position: 'left' | 'right' | 'top' | 'bottom' | 'center'
}

interface Entity {
  name: string
  fields: string[]
}

interface ComponentSpec {
  name: string
  purpose: string
  usedIn: string[]
}

export interface ComplexPipelineResult {
  code: string
  isValid: boolean
  decomposition: DecompositionResult
  components: string[]
  totalTime: number
}

// =============================================================================
// Prompts
// =============================================================================

const DECOMPOSE_SYSTEM_PROMPT = `Du analysierst komplexe UI-Anfragen und zerlegst sie in Teile.

## DEINE AUFGABE

Analysiere die Anfrage und identifiziere:
1. **Bereiche** - Hauptbereiche der UI (Sidebar, Header, Main, etc.)
2. **Entitäten** - Daten-Objekte aus der Domain
3. **Komponenten** - SPEZIFISCHE wiederverwendbare Bausteine
4. **Interaktionen** - Wichtige Aktionen/Events

## OUTPUT FORMAT

Antworte NUR mit JSON:
{
  "areas": [
    { "name": "Sidebar", "purpose": "Navigation", "position": "left" }
  ],
  "entities": [
    { "name": "Portfolio", "fields": ["name", "value", "change", "trend"] }
  ],
  "components": [
    { "name": "PortfolioCard", "purpose": "Zeigt Portfolio mit Wert und Trend", "usedIn": ["Main"] }
  ],
  "interactions": ["Portfolio-Details öffnen", "Zeitraum filtern"]
}

## DOMAIN-BEISPIELE

"Dashboard für Anlageberater":
- Entitäten: Portfolio, Kunde, Performance, Transaktion
- Komponenten: PortfolioCard, KundenRow, PerformanceChart, StatWidget

"E-Commerce Dashboard":
- Entitäten: Order, Product, Customer, Revenue
- Komponenten: OrderRow, ProductCard, RevenueChart, StatWidget

"Projektmanagement":
- Entitäten: Project, Task, Member, Deadline
- Komponenten: ProjectCard, TaskRow, MemberAvatar, ProgressBar

## WICHTIG

- DOMAIN-SPEZIFISCHE Namen (PortfolioCard, KundenRow - NICHT generisches Card/Row)
- Entitäten mit relevanten Feldern
- 4-6 Komponenten`

const DEFINE_COMPONENTS_SYSTEM_PROMPT = `Du definierst Mirror DSL Komponenten.

## MIRROR DSL SYNTAX

Komponenten mit Doppelpunkt definieren, Properties mit Einrückung:

PortfolioCard:
  vertical
  padding 16
  background $elevated
  radius 8
  border 1 $border
  gap 12
  Title:
    Text
      weight 600
      color $text
  Value:
    Text
      font-size 24
      weight 700
  Trend:
    horizontal
    gap 4
    Icon "trending-up"
      icon-size 16
      color $success
    Text
      font-size 14
      color $success
  hover
    background $surface

## GÜLTIGE PROPERTIES

Layout: horizontal, vertical, gap, spread, wrap, center
Sizing: width, height, grow, full
Spacing: padding, margin (oder pad, mar)
Visual: background, color, border, radius, shadow, opacity
Typography: font-size, weight, line, align
States: hover, focus, active, disabled, state selected

## VERBOTENE CSS-SYNTAX

NIEMALS diese CSS-Properties verwenden:
- transition, animation, transform
- align-items, justify-content, flex-direction
- box-shadow (nutze: shadow sm/md/lg)
- overflow (nutze: scroll, scroll-ver, clip)
- border-radius (nutze: radius)
- font-weight (nutze: weight)

## STATES

hover
  background $hover-bg

state selected
  background $primary

## REGELN

1. Definition mit Doppelpunkt: ComponentName:
2. Primitive: Box, Text, Icon, Button, Input, Image
3. Tokens mit $: $primary, $surface, $text
4. Slots als Kinder: Title:, Content:, Footer:
5. KEINE CSS-Syntax, KEINE Markdown-Header
6. NUR Mirror DSL Code ausgeben`

const LAYOUT_SYSTEM_PROMPT = `Du erstellst das Layout-Skelett in Mirror DSL.

## MIRROR DSL SYNTAX

App
  horizontal
  height full
  Sidebar
    vertical
    width 280
    background $surface
    padding 16
    gap 8
    NavItem
      Icon "home"
      "Dashboard"
    NavItem
      Icon "users"
      "Kunden"
  Main
    vertical
    grow
    padding 24
    gap 16
    Header
      horizontal
      spread
      Text "Dashboard"
        font-size 24
        weight 700
      Button "Neu"
        background $primary
    Content
      grid 3
      gap 16
      PortfolioCard
        Title "Tech Portfolio"
        Value "€ 125.430"
        Trend "+2.4%"
      PortfolioCard
        Title "Bonds"
        Value "€ 84.200"
        Trend "-0.3%"

## GÜLTIGE PROPERTIES

Layout: horizontal, vertical, gap, spread, wrap, center, between
Sizing: width, height, grow, full
Spacing: padding, margin (oder pad, mar)
Grid: grid 3 (3 Spalten)
Visual: background, color, border, radius, shadow, opacity
Typography: font-size, weight
Scroll: scroll, scroll-ver, clip

## VERBOTENE CSS-SYNTAX

NIEMALS verwenden:
- align-items, justify-content, flex-direction
- overflow-y, overflow-x (nutze: scroll, scroll-ver)
- box-shadow (nutze: shadow md)
- margin-top/left/right/bottom (nutze: mar top 8)
- border-left/right/top/bottom (nutze: bor left 1 $color)

## REGELN

1. Instanzen OHNE Doppelpunkt: PortfolioCard (nicht PortfolioCard:)
2. Text-Inhalte in Anführungszeichen: "Dashboard"
3. Realistische Beispieldaten für die Domain
4. Tokens für alle Farben: $primary, $surface, $text
5. NUR Mirror DSL Code, KEINE Markdown-Header`

// =============================================================================
// Pipeline Steps
// =============================================================================

/**
 * Step 1: Decompose the complex request
 */
export async function decompose(
  prompt: string,
  context: AnalysisContext
): Promise<DecompositionResult> {
  const response = await callLLM(
    DECOMPOSE_SYSTEM_PROMPT,
    `Analysiere: "${prompt}"`,
    800  // Increased for full JSON response
  )

  try {
    // First remove markdown code blocks
    let cleaned = response
      .replace(/```json\s*/gi, '')
      .replace(/```\s*/g, '')
      .trim()

    // Try to extract complete JSON object
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      cleaned = jsonMatch[0]
    }

    // Try parsing
    return JSON.parse(cleaned)
  } catch (e) {
    // Try to repair common JSON issues
    try {
      let repaired = response
        .replace(/```json\s*/gi, '')
        .replace(/```\s*/g, '')
        .trim()
      // Extract JSON part
      const start = repaired.indexOf('{')
      const end = repaired.lastIndexOf('}')
      if (start !== -1 && end !== -1) {
        repaired = repaired.slice(start, end + 1)
        return JSON.parse(repaired)
      }
    } catch {}

    console.debug('[Decompose] JSON parse failed, using fallback. Response:', response.slice(0, 200))
    // Fallback für einfache Dashboards
    return {
      areas: [
        { name: 'Sidebar', purpose: 'Navigation', position: 'left' },
        { name: 'Header', purpose: 'Titel und Suche', position: 'top' },
        { name: 'Main', purpose: 'Hauptinhalt', position: 'center' },
      ],
      entities: [
        { name: 'Item', fields: ['title', 'value'] }
      ],
      components: [
        { name: 'NavItem', purpose: 'Navigation Item', usedIn: ['Sidebar'] },
        { name: 'Card', purpose: 'Content Card', usedIn: ['Main'] },
      ],
      interactions: ['Navigation', 'Card öffnen']
    }
  }
}

/**
 * Step 2: Define reusable components
 */
export async function defineComponents(
  decomposition: DecompositionResult,
  context: AnalysisContext
): Promise<string> {
  const componentList = decomposition.components
    .map(c => `- ${c.name}: ${c.purpose}`)
    .join('\n')

  const entityList = decomposition.entities
    .map(e => `- ${e.name}: ${e.fields.join(', ')}`)
    .join('\n')

  const userPrompt = `## ZU DEFINIERENDE KOMPONENTEN
${componentList}

## DATEN-ENTITÄTEN
${entityList}

## VERFÜGBARE TOKENS
${context.tokens.map(t => t.name).join(', ')}

Erstelle die Komponenten-Definitionen.`

  return await callLLM(
    DEFINE_COMPONENTS_SYSTEM_PROMPT,
    userPrompt,
    1024
  )
}

/**
 * Step 3: Create layout structure
 */
export async function createLayout(
  decomposition: DecompositionResult,
  componentDefinitions: string,
  context: AnalysisContext
): Promise<string> {
  const areaList = decomposition.areas
    .map(a => `- ${a.name} (${a.position}): ${a.purpose}`)
    .join('\n')

  const userPrompt = `## DEFINIERTE KOMPONENTEN
\`\`\`mirror
${componentDefinitions}
\`\`\`

## LAYOUT-BEREICHE
${areaList}

## VERFÜGBARE TOKENS
${context.tokens.map(t => t.name).join(', ')}

Erstelle das Layout das diese Komponenten verwendet.`

  return await callLLM(
    LAYOUT_SYSTEM_PROMPT,
    userPrompt,
    1500
  )
}

/**
 * Step 4: Assemble final code
 */
export function assemble(
  componentDefinitions: string,
  layout: string,
  context: AnalysisContext
): string {
  // Extract token definitions that might be needed
  const tokenDefs = context.tokens
    .filter(t => t.value)
    .map(t => `${t.name}: ${t.value}`)
    .join('\n')

  // Clean up the code
  let cleanComponents = componentDefinitions
    .replace(/```mirror\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim()

  let cleanLayout = layout
    .replace(/```mirror\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim()

  // Post-process: Remove CSS syntax and markdown headers
  cleanComponents = postProcessMirrorCode(cleanComponents)
  cleanLayout = postProcessMirrorCode(cleanLayout)

  // Combine: Tokens → Components → Layout
  const parts: string[] = []

  if (tokenDefs) {
    parts.push(tokenDefs)
    parts.push('')
  }

  if (cleanComponents) {
    parts.push(cleanComponents)
    parts.push('')
  }

  parts.push(cleanLayout)

  return parts.join('\n')
}

/**
 * Post-process Mirror code to remove CSS artifacts
 */
function postProcessMirrorCode(code: string): string {
  let result = code
    // Remove markdown headers
    .replace(/^#+ .+$/gm, '')
    // Remove CSS properties
    .replace(/^\s*transition\s+.+$/gm, '')
    .replace(/^\s*animation\s+.+$/gm, '')
    .replace(/^\s*transform\s+.+$/gm, '')
    .replace(/^\s*align-items\s+.+$/gm, '')
    .replace(/^\s*justify-content\s+.+$/gm, '')
    .replace(/^\s*flex-direction\s+.+$/gm, '')
    .replace(/^\s*flex-wrap\s+.+$/gm, '')
    .replace(/^\s*overflow-[xy]\s+.+$/gm, '')
    .replace(/^\s*overflow\s+.+$/gm, '')
    // Fix box-shadow to shadow
    .replace(/box-shadow\s+[^$\n]+/g, 'shadow md')
    // Fix margin-top/left/etc to mar top/left/etc
    .replace(/margin-top\s+(\d+)/g, 'mar top $1')
    .replace(/margin-bottom\s+(\d+)/g, 'mar bottom $1')
    .replace(/margin-left\s+(\d+)/g, 'mar left $1')
    .replace(/margin-right\s+(\d+)/g, 'mar right $1')
    // Fix border-left/etc to bor left
    .replace(/border-left\s+(\d+)\s+(\$\w+)/g, 'bor left $1 $2')
    .replace(/border-right\s+(\d+)\s+(\$\w+)/g, 'bor right $1 $2')
    .replace(/border-top\s+(\d+)\s+(\$\w+)/g, 'bor top $1 $2')
    .replace(/border-bottom\s+(\d+)\s+(\$\w+)/g, 'bor bottom $1 $2')
    // Fix font-weight to weight
    .replace(/font-weight\s+/g, 'weight ')
    // Fix border-radius to radius
    .replace(/border-radius\s+/g, 'radius ')
    // Clean up multiple empty lines
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  // Fix unterminated strings
  result = fixUnterminatedStrings(result)

  // Fix duplicate element names by adding numbers
  result = fixDuplicateNames(result)

  return result
}

/**
 * Fix duplicate element names within component definitions.
 * Mirror's flat access means ALL descendants must have unique names.
 *
 * Strategy:
 * - For each definition (Name:), track ALL component names in its entire body
 * - For the layout section (no definition), track all names globally
 * - Rename duplicates to Name2, Name3, etc.
 */
function fixDuplicateNames(code: string, debug = false): string {
  const lines = code.split('\n')
  const result: string[] = []

  // Track names for each scope (definition OR top-level component)
  // Flat access means ALL descendants share the same namespace
  let scopeIndent = -1
  let scopeNames: Map<string, number> = new Map()
  let inLayoutSection = false  // After all definitions

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Keep empty lines as-is
    if (!line.trim()) {
      result.push(line)
      continue
    }

    const indent = line.match(/^(\s*)/)?.[1].length || 0

    // Check if this is a definition (Name:)
    const defMatch = line.match(/^(\s*)([A-Z][a-zA-Z0-9]*):/)
    if (defMatch) {
      const defIndent = defMatch[1].length
      const defName = defMatch[2]

      // Top-level definition (indent 0 or back to root) starts a new scope
      if (defIndent === 0 || (scopeIndent >= 0 && defIndent <= scopeIndent)) {
        scopeIndent = defIndent
        scopeNames = new Map()
        inLayoutSection = false
        if (debug) {
          console.log(`[fixDuplicateNames] New scope: ${defName} at indent ${defIndent}`)
        }
        result.push(line)
        continue
      }

      // Nested definition - track as a named element (for flat access)
      // It's ALSO a child of the parent scope
      const count = scopeNames.get(defName) || 0
      if (count > 0) {
        const newName = `${defName}${count + 1}`
        const newLine = `${defMatch[1]}${newName}:${line.slice(defMatch[0].length)}`
        if (debug) {
          console.log(`[fixDuplicateNames] Renaming def ${defName} to ${newName}`)
        }
        result.push(newLine)
      } else {
        result.push(line)
      }
      scopeNames.set(defName, count + 1)
      continue
    }

    // Check if we're leaving the current scope
    if (scopeIndent >= 0 && indent <= scopeIndent) {
      scopeIndent = -1
      scopeNames = new Map()
    }

    // Check if this line starts with a component (PascalCase)
    const componentMatch = line.match(/^(\s*)([A-Z][a-zA-Z0-9]*)(\s|$)/)
    if (componentMatch) {
      const [fullMatch, spaces, name] = componentMatch
      const restOfLine = line.slice(fullMatch.length)
      const compIndent = spaces.length

      // If we're at root level (not in a definition), this starts the layout section
      // Each top-level component in layout gets its own scope
      if (scopeIndent < 0) {
        if (!inLayoutSection || compIndent === 0) {
          // Starting layout section or new top-level component
          if (compIndent === 0) {
            scopeNames = new Map()
            scopeIndent = 0
          }
          inLayoutSection = true
          if (debug) {
            console.log(`[fixDuplicateNames] Layout scope: ${name}`)
          }
        }
      }

      // Check if this name already exists in current scope
      const count = scopeNames.get(name) || 0

      if (debug && count > 0) {
        console.log(`[fixDuplicateNames] Renaming ${name} to ${name}${count + 1}`)
      }

      let newLine: string
      if (count > 0) {
        const newName = `${name}${count + 1}`
        newLine = `${spaces}${newName}${restOfLine ? ' ' + restOfLine : ''}`.trimEnd()
      } else {
        newLine = line
      }

      result.push(newLine)
      scopeNames.set(name, count + 1)
    } else {
      result.push(line)
    }
  }

  return result.join('\n')
}

/**
 * Fix unterminated strings by escaping problematic characters
 */
function fixUnterminatedStrings(code: string): string {
  // Fix strings that end with problematic characters
  return code
    // Fix percent at end of string: "+2,4%" → "+2,4 %"
    .replace(/"([^"]*[,.])\s*(\d+)%"/g, '"$1$2 %"')
    // Fix any remaining unterminated strings by closing them
    .replace(/^(\s*)([A-Z][a-zA-Z0-9]*\s+)"([^"\n]+)$/gm, '$1$2"$3"')
}

// =============================================================================
// Main Pipeline
// =============================================================================

export async function runComplexPipeline(
  prompt: string,
  context: AnalysisContext,
  options: { debug?: boolean } = {}
): Promise<ComplexPipelineResult> {
  const startTime = performance.now()

  // Step 1: Decompose
  if (options.debug) console.debug('[Complex] Step 1: Decomposing...')
  const decomposition = await decompose(prompt, context)
  if (options.debug) {
    console.debug('[Complex] Areas:', decomposition.areas.map(a => a.name))
    console.debug('[Complex] Components:', decomposition.components.map(c => c.name))
  }

  // Step 2: Define Components
  if (options.debug) console.debug('[Complex] Step 2: Defining components...')
  const componentDefs = await defineComponents(decomposition, context)
  if (options.debug) {
    console.debug('[Complex] Component definitions:', componentDefs.slice(0, 200) + '...')
  }

  // Step 3: Create Layout
  if (options.debug) console.debug('[Complex] Step 3: Creating layout...')
  const layout = await createLayout(decomposition, componentDefs, context)

  // Step 4: Assemble
  if (options.debug) console.debug('[Complex] Step 4: Assembling...')
  const code = assemble(componentDefs, layout, context)

  const totalTime = performance.now() - startTime

  return {
    code,
    isValid: true, // TODO: Add validation
    decomposition,
    components: decomposition.components.map(c => c.name),
    totalTime,
  }
}

// =============================================================================
// LLM Helper
// =============================================================================

async function callLLM(
  systemPrompt: string,
  userPrompt: string,
  maxTokens: number
): Promise<string> {
  const response = await fetch(API.ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getApiKey()}`,
      'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : 'http://localhost',
      'X-Title': 'Mirror - Complex Pipeline',
    },
    body: JSON.stringify({
      model: API.MODEL_FAST,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: maxTokens,
      temperature: 0.3,
    }),
  })

  if (!response.ok) {
    throw new Error(`API Error: ${response.status}`)
  }

  const data = await response.json()
  return data.choices?.[0]?.message?.content || ''
}
