import { ValidationService } from '../validation'
import { API } from '../constants'
import { jsonToMirror, LLM_SCHEMA } from '../converter/json-to-mirror'
import { validateLLMOutput } from '../schemas/llm-output'

// API key management - SESSION-ONLY for security
// Keys are NOT persisted to localStorage to prevent XSS exposure
let OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY || ''

/**
 * Set the API key for the current session only.
 * The key is stored in memory and will be lost on page refresh.
 * This is intentional for security - localStorage is vulnerable to XSS attacks.
 */
export function setApiKey(key: string): void {
  OPENROUTER_API_KEY = key
}

/**
 * Get the current API key (session-only)
 */
export function getApiKey(): string {
  return OPENROUTER_API_KEY
}

/**
 * Check if an API key is set for this session
 */
export function hasApiKey(): boolean {
  return Boolean(OPENROUTER_API_KEY)
}

/**
 * Clear the API key from memory
 */
export function clearApiKey(): void {
  OPENROUTER_API_KEY = ''
}

// Store for active request cancellation
let activeAbortController: AbortController | null = null

/**
 * Cancel any active AI request
 */
export function cancelActiveRequest(): void {
  if (activeAbortController) {
    activeAbortController.abort()
    activeAbortController = null
  }
}

/**
 * Fetch with timeout and abort controller support
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number = API.REQUEST_TIMEOUT_MS
): Promise<Response> {
  // Cancel any previous request
  cancelActiveRequest()

  // Create new abort controller
  activeAbortController = new AbortController()
  const timeoutId = setTimeout(() => activeAbortController?.abort(), timeoutMs)

  try {
    const response = await fetch(url, {
      ...options,
      signal: activeAbortController.signal,
    })
    return response
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Anfrage abgebrochen oder Timeout erreicht')
    }
    throw error
  } finally {
    clearTimeout(timeoutId)
    activeAbortController = null
  }
}

// Validation service instance with auto-correction enabled
const validator = new ValidationService({
  autoCorrect: true,
  strictMode: false,
  allowMissingDefinitions: true,
  generateMissingDefs: false
})

const DSL_DOCS = `
Du bist ein UI-Designer-Assistent für <>mirror. Du generierst Code in einer speziellen DSL für UI-Design.

## Philosophie

Mirror trennt **WAS** (Struktur) von **WIE** (Styling):
- **Tokens**: Wiederverwendbare Werte (Farben, Abstände, Grössen)
- **Components**: Definiert das Aussehen (Templates mit :)
- **Layout/Page**: Definiert die Struktur (Instanzen ohne Styling)

Prinzipien:
- Hierarchie durch Einrückung (2 Spaces)
- Tailwind-ähnlich aber lesbar: pad statt padding, bg statt background
- Styling einmal definieren, überall verwenden
- Überschreiben bei Bedarf erlaubt

## Drei Bereiche

Der Editor hat drei Tabs:
1. **Tokens** - Design-Variablen: \`$primary: #3B82F6\`
2. **Components** - Komponenten MIT Styling (mit Doppelpunkt :)
3. **Page/Layout** - Komponenten verwenden, nur Inhalte (ohne Properties)

## Tokens (Design-Variablen)

Tokens definieren wiederverwendbare Werte. Änderst du einen Token, ändert sich alles.

Definition im Tokens Tab:
\`\`\`
$primary: #3B82F6
$primary-hover: #2563EB
$surface: #1A1A1A
$border: #333333
$text: #FFFFFF
$text-muted: #888888
$radius: 8
$spacing: 16
\`\`\`

Verwendung mit \`$name\`:
\`\`\`
Button: bg $primary rad $radius pad $spacing col $text
Card: bg $surface bor 1 boc $border rad $radius
\`\`\`

WICHTIG: Verwende Tokens statt Magic Numbers für Konsistenz!

## WICHTIG: Kinder-Syntax

NUR die Hauptkomponente hat einen Doppelpunkt. Kinder haben KEINEN Doppelpunkt:

RICHTIG:
\`\`\`
Card: ver pad 16 bg #1E1E1E rad 8 gap 8
  Title size 18 weight 600 col #FFF
  Description size 14 col #9CA3AF
\`\`\`

FALSCH (Kinder mit Doppelpunkt):
\`\`\`
Card: ver pad 16 bg #1E1E1E rad 8 gap 8
  Title: size 18 weight 600 col #FFF
  Description: size 14 col #9CA3AF
\`\`\`

## Wichtig: Nur Definitionen mit : erstellen Templates

NUR Komponenten mit Doppelpunkt werden zu wiederverwendbaren Templates:

\`\`\`
// RICHTIG: Erstellt ein wiederverwendbares Template MIT Kindern
Footer: pad 16 bg #242424 hor gap 16
  Button "Okay"
  Button "Cancel"

Footer  // <- Bekommt alle Properties UND alle Kinder (2 Buttons)
\`\`\`

\`\`\`
// Wenn Komponente OHNE Kinder definiert ist:
Container: bg #111
Button: bg #222 "Label1"

Container  // <- Zeigt nur den Container, KEINE Kinder

// Kinder müssen explizit angegeben werden:
Container
  Button "Label 3"
  Button "Label 4"
\`\`\`

## Clean-Funktion

Der Clean-Button extrahiert Komponenten inkl. Kinder aus dem Layout:

Vorher (Layout):
\`\`\`
Mycontainer bg #111
  Mybutton bg #222 "Label1"
  Mybutton "Label2"
\`\`\`

Nachher:
- Components: Mycontainer: bg #111 + Kinder, Mybutton: bg #222 "Label1"
- Layout: Mycontainer

## Syntax

- Komponenten-Namen: Großbuchstabe (Header, Button, Card)
- Definition: Name: prop1 wert1 prop2 wert2 (Space-getrennt, KEIN =)
- Kinder: 2 Spaces eingerückt
- Strings: "Text"
- Farben: #3B82F6 (Hex bevorzugt, aber Farbnamen wie white, black werden automatisch konvertiert)

RICHTIG: Button: pad 12 bg #3B82F6 col #FFFFFF
FALSCH: Button: pad=12 bg=#3B82F6

## Properties

Layout: hor, ver, gap 16, between, wrap, grow
Alignment (absolut, unabhängig von Layout-Richtung):
- hor-l = links, hor-cen = horizontal zentriert, hor-r = rechts
- ver-t = oben, ver-cen = vertikal zentriert, ver-b = unten
- Typisches Header-Pattern: hor between ver-cen
Größe: w 200, h 48, full, minw, maxw, minh, maxh
Spacing - Richtungen sind NUR l, r, u, d (NICHT hor/ver!):
- pad 16 = alle Seiten
- pad l-r 16 = links und rechts (NICHT: pad hor 16!)
- pad u-d 16 = oben und unten (NICHT: pad ver 16!)
- pad u 16 = nur oben
- mar funktioniert gleich wie pad
FALSCH: pad hor 16, pad ver 16, pad horizontal 16
RICHTIG: pad l-r 16, pad u-d 16, pad l 16
Farben: bg #1A1A1A, col #FFFFFF
Border:
- bor 2 = alle Seiten 2px solid
- bor u-d 2 = nur oben und unten
- bor l-r 2 = nur links und rechts (Farbe von boc wird automatisch verwendet)
- rad 8 = border-radius
- boc #333 = border-color
Typography: size 14, weight 600, font "Inter"
Icons: icon "search", icon "plus", icon "user" (Lucide Icon Namen - kebab-case, z.B. "arrow-right", "chevron-down")
Images: src "https://example.com/photo.jpg", alt "Beschreibung", fit cover/contain/fill (default: cover)
Hover (mit automatischer CSS Transition): hover-bg #333, hover-col #FFF, hover-boc #555

## Bilder

\`\`\`
// Bild mit fester Grösse
Image: src "https://example.com/photo.jpg" w 200 h 150 rad 8

// Bild als Hero-Banner (volle Breite)
HeroBanner: src "https://example.com/hero.jpg" w full h 300 fit cover

// Avatar-Bild (rund)
Avatar: src "https://example.com/user.jpg" w 48 h 48 rad 99

// Mit Token
$avatar-url: "https://example.com/avatar.jpg"
UserAvatar: src $avatar-url w 40 h 40 rad 99
\`\`\`

## Komponenten definieren (in Components Tab)

\`\`\`
Button: hor hor-cen ver-cen h 40 pad l-r 16 rad 8 bg #3B82F6 col #FFF size 14 weight 500
\`\`\`

## Komponenten ableiten mit "from"

\`\`\`
Button: pad 12 bg #3B82F6 rad 8 col #FFF
DangerButton: from Button bg #EF4444
GhostButton: from Button bg transparent col #3B82F6
\`\`\`

## Komponenten mit Kindern (Slots)

Definiere Komponenten mit Kind-Elementen (IMMER mit :):
\`\`\`
ProductTile: ver pad 12 bg #1E1E1E rad 8 gap 8
  Name size 14 col #FFFFFF
  Price size 16 weight 600 col #10B981
\`\`\`

Verwende sie kompakt im Layout:
\`\`\`
ProductTile Name "MacBook Pro" Price "€ 2.499"
\`\`\`

Oder mit eigenen Kindern (überschreiben die Template-Kinder):
\`\`\`
ProductTile
  Name "MacBook Pro"
  Price "€ 2.499"
\`\`\`

## Beispiel Components Tab

\`\`\`
Button: hor hor-cen ver-cen h 40 pad l-r 16 rad 8 bg #3B82F6 col #FFF size 14 weight 500
DangerButton: from Button bg #EF4444

Header: hor between ver-cen h 56 pad l-r 24 bg #1A1A1A
  Logo size 20 weight 700 col #FFF
  Nav hor ver-cen gap 8

Content: ver grow pad 32 gap 16

Card: ver pad 16 bg #1E1E1E rad 12 gap 8
  Title size 18 weight 600 col #FFF
  Description size 14 col #9CA3AF
\`\`\`

## Beispiel Layout Tab

Im Layout nur Komponenten und Inhalte - KEIN Styling:
\`\`\`
Header
  Logo "MyApp"
  Nav
    Button "Login"
    DangerButton "Logout"
Content
  Card Title "Willkommen" Description "Starte hier"
  Card Title "Features" Description "Entdecke mehr"
\`\`\`

## Output-Format

Generiere IMMER alle drei Bereiche mit diesen Markern:

\`\`\`
--- TOKENS ---
$primary: #3B82F6
$surface: #1A1A1A
$border: #333333
$text: #FFFFFF
$radius: 8

--- COMPONENTS ---
List: ver gap 16
Button: hor ver-cen h 40 pad l-r 16 rad 8 bg $primary col $text

--- LAYOUT ---
List
  Button "Eins"
  Button "Zwei"
\`\`\`

## Regeln

1. Output IMMER mit --- TOKENS ---, --- COMPONENTS --- und --- LAYOUT --- trennen
2. KEINE Code-Blöcke (\`\`\`), KEINE Erklärungen - NUR den DSL-Code
3. Jede Komponenten-Definition auf EINER Zeile (keine Zeilenumbrüche in Properties)
4. Farben in TOKENS als Hex definieren, in COMPONENTS als $token referenzieren
5. Spacing-Richtungen sind NUR l, r, u, d - NIEMALS hor/ver!
   - RICHTIG: pad l-r 16, pad u-d 8, mar l 4
   - FALSCH: pad hor 16, pad ver 8, pad horizontal 16
6. TOKENS: Variablen mit $name: wert
7. COMPONENTS: Definitionen mit : und Styling (verwende $tokens!)
8. LAYOUT: NUR Komponentennamen und Strings!
   - VERBOTEN: Properties (hor, ver, pad, bg, col, etc.)
   - VERBOTEN: Doppelpunkt nach Namen
   - RICHTIG: Button "Click"
   - FALSCH: Button: "Click"
9. Jede Layout-Variation braucht eigene Komponente in COMPONENTS

## Interaktivität (States, Events, Variablen)

### States
Komponenten können mehrere Zustände haben:
\`\`\`
Button: bg #333 pad 12 rad 8 col #FFF
  state normal
    bg #333
  state active
    bg #0066FF
  onclick
    toggle self
\`\`\`

### Variablen
\`\`\`
Counter: ver gap 8 pad 16 bg #222
  count = 0
  selected = false
\`\`\`

### Event Handler
\`\`\`
Button onclick toggle self
Panel onclick
  if not selected
    change self to active
    selected = true
\`\`\`

### Actions
- toggle self/X - Wechselt zwischen States
- change X to Y - Setzt State auf Y
- varName = value - Setzt Variable
- open X - Öffnet Dialog/Dropdown
- close X - Schliesst Dialog/Dropdown
- page X - Navigiert zu Seite X (erstellt sie falls nötig)

### Page-Navigation
\`\`\`
Button: bg $primary pad 12 rad 8 col #FFF
  onclick page Dashboard

Button "Zum Dashboard"
\`\`\`

## Library-Komponenten (fertige interaktive Komponenten)

Die Library enthält Komponenten mit eingebauter Logik. Sie haben vordefinierte Slots.

### Dropdown
\`\`\`
Dropdown
  Trigger: hor gap 8 pad 8 12 bg $surface rad 6 bor 1 boc $border
    icon "chevron-down"
    "Menü"
  Content: ver bg $surface rad 8 pad 4
    Item: hor ver-cen gap 8 pad 8 12 rad 4 hover-bg $primary
      icon "user"
      "Profil"
    Item: hor ver-cen gap 8 pad 8 12 rad 4 hover-bg $primary
      icon "settings"
      "Einstellungen"
    Separator: h 1 bg $border mar u-d 4
    Item: col #EF4444 hover-bg #EF444420
      icon "log-out"
      "Logout"
\`\`\`

### Dialog
\`\`\`
Dialog
  Trigger
    Button "Dialog öffnen"
  Content: ver gap 16 pad 24 bg $surface rad 12 w 400
    Title "Bestätigung"
    "Möchtest du fortfahren?"
    Row hor gap 8
      Button bg $border "Abbrechen"
        onclick close
      Button "Bestätigen"
\`\`\`

### Tabs
\`\`\`
Tabs
  TabList: hor gap 4 bg $surface pad 4 rad 8
    Tab "Übersicht"
    Tab "Details"
    Tab "Einstellungen"
  TabContent
    Panel
      "Inhalt der Übersicht"
    Panel
      "Inhalt der Details"
    Panel
      "Inhalt der Einstellungen"
\`\`\`

### Weitere Library-Komponenten
- Accordion - Auf/Zuklappbare Sektionen
- Collapsible - Einzelne auf/zuklappbare Sektion
- Tooltip - Hover-Info
- Popover - Klick-Popup
- AlertDialog - Bestätigungs-Dialog
- Select - Auswahl-Dropdown
- Switch - Toggle-Schalter
- Checkbox - Checkbox
- RadioGroup - Radio-Buttons
- Slider - Schieberegler
- Toast - Benachrichtigung
- Progress - Fortschrittsbalken
- Avatar - Profilbild
- ContextMenu - Rechtsklick-Menü
- HoverCard - Hover-Popup

### Library-Slots
Library-Komponenten haben Standard-Slots:
- Dropdown: Trigger, Content, Item, Separator
- Dialog: Trigger, Content
- Tabs: TabList, Tab, TabContent, Panel
- Accordion: AccordionItem, Trigger, Content
`

export interface GeneratedCode {
  tokens: string
  components: string
  layout: string
  wasValidated?: boolean
  corrections?: number
  errors?: string[]
  warnings?: string[]
}

// Parse AI response into tokens, components, and layout sections
function parseAIResponse(content: string): { tokens: string; components: string; layout: string } {
  const tokensMatch = content.match(/---\s*TOKENS\s*---\s*([\s\S]*?)(?=---\s*(?:COMPONENTS|LAYOUT)\s*---|$)/i)
  const componentsMatch = content.match(/---\s*COMPONENTS\s*---\s*([\s\S]*?)(?=---\s*(?:TOKENS|LAYOUT)\s*---|$)/i)
  const layoutMatch = content.match(/---\s*LAYOUT\s*---\s*([\s\S]*?)(?=---\s*(?:TOKENS|COMPONENTS)\s*---|$)/i)

  return {
    tokens: tokensMatch?.[1]?.trim() || '',
    components: componentsMatch?.[1]?.trim() || '',
    layout: layoutMatch?.[1]?.trim() || ''
  }
}

export async function generateDSL(
  userPrompt: string,
  tokensCode: string,
  componentsCode: string,
  layoutCode: string
): Promise<GeneratedCode> {
  const currentContext = []
  if (tokensCode.trim()) {
    currentContext.push(`--- TOKENS ---\n${tokensCode}`)
  }
  if (componentsCode.trim()) {
    currentContext.push(`--- COMPONENTS ---\n${componentsCode}`)
  }
  if (layoutCode.trim()) {
    currentContext.push(`--- LAYOUT ---\n${layoutCode}`)
  }

  if (!hasApiKey()) {
    throw new Error('Kein API Key gesetzt. Bitte API Key in der Header-Leiste eingeben.')
  }

  const response = await fetchWithTimeout(API.ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'HTTP-Referer': 'http://localhost:5173',
      'X-Title': 'Designer',
    },
    body: JSON.stringify({
      model: API.MODEL,
      messages: [
        {
          role: 'system',
          content: DSL_DOCS
        },
        {
          role: 'user',
          content: currentContext.length > 0
            ? `Aktueller Code:\n\`\`\`\n${currentContext.join('\n\n')}\n\`\`\`\n\nAnweisung: ${userPrompt}`
            : userPrompt
        }
      ],
      max_tokens: API.MAX_TOKENS,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text().catch(() => '')
    throw new Error(`API Error: ${response.status}${errorText ? ` - ${errorText}` : ''}`)
  }

  const data = await response.json()
  const content = data.choices[0]?.message?.content || ''

  // Parse the AI response into sections
  const parsed = parseAIResponse(content)

  // Validate and correct the components/layout (tokens are simple, no validation needed)
  const codeToValidate = `--- COMPONENTS ---\n${parsed.components}\n\n--- LAYOUT ---\n${parsed.layout}`
  const validationResult = validator.validate(codeToValidate)

  // Log validation info for debugging
  if (validationResult.corrections.length > 0) {
    console.log(`[Validation] Applied ${validationResult.corrections.length} corrections`)
  }
  if (validationResult.errors.length > 0) {
    console.warn('[Validation] Errors:', validationResult.errors.map(e => e.message))
  }
  if (validationResult.warnings.length > 0) {
    console.log('[Validation] Warnings:', validationResult.warnings.map(w => w.message))
  }

  return {
    tokens: parsed.tokens,
    components: validationResult.components,
    layout: validationResult.layout,
    wasValidated: true,
    corrections: validationResult.corrections.length,
    errors: validationResult.errors.map(e => e.message),
    warnings: validationResult.warnings.map(w => w.message)
  }
}

// =============================================================================
// Alternative: JSON AST Approach
// =============================================================================

const JSON_SYSTEM_PROMPT = `Du bist ein UI-Designer. Generiere UI als JSON AST.

## Schema
${LLM_SCHEMA}

## Regeln
1. Antworte NUR mit validem JSON - keine Erklärungen, kein Markdown
2. Das Root-Objekt hat die Struktur: { "nodes": [...] }
3. Jeder Node braucht: type: "component", name, properties, children
4. Text-Content kommt in "content" (nicht in children)
5. Verschachtelung über "children" Array

## Beispiele

Login-Formular:
{
  "nodes": [{
    "type": "component",
    "name": "Box",
    "properties": { "ver": true, "gap": 16, "pad": 24, "col": "#1F2937", "rad": 12 },
    "children": [
      { "type": "component", "name": "Text", "properties": { "size": 24, "weight": 700, "col": "#FFFFFF" }, "content": "Login", "children": [] },
      { "type": "component", "name": "Input", "instanceName": "Email", "properties": { "placeholder": "Email" }, "children": [] },
      { "type": "component", "name": "Input", "instanceName": "Password", "properties": { "type": "password", "placeholder": "Password" }, "children": [] },
      { "type": "component", "name": "Button", "properties": { "col": "#3B82F6", "rad": 8 }, "content": "Sign In", "children": [] }
    ]
  }]
}

Card mit Icon:
{
  "nodes": [{
    "type": "component",
    "name": "Box",
    "properties": { "hor": true, "gap": 12, "pad": 16, "col": "#1F2937", "rad": 8, "ver-cen": true },
    "children": [
      { "type": "component", "name": "Icon", "properties": { "icon": "user", "size": 24, "col": "#9CA3AF" }, "children": [] },
      { "type": "component", "name": "Text", "properties": { "size": 14, "col": "#FFFFFF" }, "content": "Profile", "children": [] }
    ]
  }]
}

Generiere NUR JSON, keine Erklärungen.`

/**
 * Alternative DSL generation using JSON AST approach
 * The LLM generates JSON (which it knows well), then we convert to Mirror DSL
 */
export async function generateDSLViaJSON(
  userPrompt: string
): Promise<GeneratedCode> {
  if (!hasApiKey()) {
    throw new Error('Kein API Key gesetzt. Bitte API Key in der Header-Leiste eingeben.')
  }

  const response = await fetchWithTimeout(API.ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'HTTP-Referer': 'http://localhost:5173',
      'X-Title': 'Designer',
    },
    body: JSON.stringify({
      model: API.MODEL,
      messages: [
        {
          role: 'system',
          content: JSON_SYSTEM_PROMPT
        },
        {
          role: 'user',
          content: userPrompt
        }
      ],
      max_tokens: API.MAX_TOKENS,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text().catch(() => '')
    throw new Error(`API Error: ${response.status}${errorText ? ` - ${errorText}` : ''}`)
  }

  const data = await response.json()
  const content = data.choices[0]?.message?.content || ''

  // Try to parse JSON from response (handle markdown code blocks)
  let jsonContent = content.trim()

  // Remove markdown code blocks if present
  const jsonMatch = jsonContent.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (jsonMatch) {
    jsonContent = jsonMatch[1].trim()
  }

  // Parse and validate JSON with Zod schema
  let rawAst: unknown
  try {
    rawAst = JSON.parse(jsonContent)
  } catch {
    console.error('[JSON Parse Error]', jsonContent.substring(0, 200))
    throw new Error('LLM hat kein valides JSON generiert')
  }

  // Validate structure with Zod
  const ast = validateLLMOutput(rawAst)

  // Convert JSON AST to Mirror DSL
  const mirrorCode = jsonToMirror(ast as Parameters<typeof jsonToMirror>[0])

  return {
    tokens: '',
    components: '',
    layout: mirrorCode,
    wasValidated: false,
    corrections: 0,
    errors: [],
    warnings: []
  }
}
