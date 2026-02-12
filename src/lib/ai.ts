import { ValidationService } from '../validation'
import { API, STORAGE_KEYS } from '../constants'
import { jsonToMirror, LLM_SCHEMA } from '../converter/json-to-mirror'
import { validateLLMOutput } from '../schemas/llm-output'
import { logger } from '../services/logger'

// API key management - persisted to localStorage for convenience
// For a local prototyping tool like Mirror, this is acceptable
let OPENROUTER_API_KEY = ''

// Load API key from localStorage on module initialization
try {
  const stored = localStorage.getItem(STORAGE_KEYS.API_KEY)
  if (stored) {
    OPENROUTER_API_KEY = stored
  }
} catch {
  // localStorage not available (SSR, etc.)
}

/**
 * Set the API key and persist it to localStorage.
 */
export function setApiKey(key: string): void {
  OPENROUTER_API_KEY = key
  try {
    if (key) {
      localStorage.setItem(STORAGE_KEYS.API_KEY, key)
    } else {
      localStorage.removeItem(STORAGE_KEYS.API_KEY)
    }
  } catch {
    // localStorage not available
  }
}

/**
 * Get the current API key
 */
export function getApiKey(): string {
  return OPENROUTER_API_KEY
}

/**
 * Check if an API key is set
 */
export function hasApiKey(): boolean {
  return Boolean(OPENROUTER_API_KEY)
}

/**
 * Clear the API key from memory and localStorage
 */
export function clearApiKey(): void {
  OPENROUTER_API_KEY = ''
  try {
    localStorage.removeItem(STORAGE_KEYS.API_KEY)
  } catch {
    // localStorage not available
  }
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
Du bist ein UI-Designer-Assistent für Mirror. Du generierst Code in einer speziellen DSL für UI-Prototyping.

**Wichtig:** Mirror ist für schnelles Prototyping gedacht, nicht für produktionsreife Frontends. Der generierte Code dient der visuellen Validierung von Ideen und kann als Ausgangspunkt für AI-gestützte Weiterentwicklung dienen.

## Philosophie

Mirror trennt **WAS** (Struktur) von **WIE** (Styling):
- **Tokens**: Wiederverwendbare Werte (Farben, Abstände, Grössen)
- **Components**: Definiert das Aussehen (Templates mit :)
- **Layout/Page**: Definiert die Struktur (Instanzen ohne Styling)

Prinzipien:
- Hierarchie durch Einrückung (2 Spaces)
- Tailwind-ähnlich aber lesbar: pad statt padding, col für Farben
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
Button: col $primary rad $radius pad $spacing col $text
Card: col $surface bor 1 boc $border rad $radius
\`\`\`

WICHTIG: Verwende Tokens statt Magic Numbers für Konsistenz!

## WICHTIG: Kinder-Syntax

NUR die Hauptkomponente hat einen Doppelpunkt. Kinder haben KEINEN Doppelpunkt:

RICHTIG:
\`\`\`
Card: ver pad 16 col #1E1E1E rad 8 gap 8
  Title size 18 weight 600 col #FFF
  Description size 14 col #9CA3AF
\`\`\`

FALSCH (Kinder mit Doppelpunkt):
\`\`\`
Card: ver pad 16 col #1E1E1E rad 8 gap 8
  Title: size 18 weight 600 col #FFF
  Description: size 14 col #9CA3AF
\`\`\`

## Wichtig: Nur Definitionen mit : erstellen Templates

NUR Komponenten mit Doppelpunkt werden zu wiederverwendbaren Templates:

\`\`\`
// RICHTIG: Erstellt ein wiederverwendbares Template MIT Kindern
Footer: pad 16 col #242424 hor gap 16
  Button "Okay"
  Button "Cancel"

Footer  // <- Bekommt alle Properties UND alle Kinder (2 Buttons)
\`\`\`

\`\`\`
// Wenn Komponente OHNE Kinder definiert ist:
Container: col #111
Button: col #222 "Label1"

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
Mycontainer col #111
  Mybutton col #222 "Label1"
  Mybutton "Label2"
\`\`\`

Nachher:
- Components: Mycontainer: col #111 + Kinder, Mybutton: col #222 "Label1"
- Layout: Mycontainer

## Syntax

- Komponenten-Namen: Großbuchstabe (Header, Button, Card)
- Definition: Name: prop1 wert1 prop2 wert2 (Space-getrennt, KEIN =)
- Kinder: 2 Spaces eingerückt
- Strings: "Text"
- Farben: #3B82F6 (Hex bevorzugt, aber Farbnamen wie white, black werden automatisch konvertiert)

RICHTIG: Button: pad 12 col #3B82F6 textCol #FFFFFF
FALSCH: Button: pad=12 col=#3B82F6

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
Farben: col #1A1A1A, col #FFFFFF
Border:
- bor 2 = alle Seiten 2px solid
- bor u-d 2 = nur oben und unten
- bor l-r 2 = nur links und rechts (Farbe von boc wird automatisch verwendet)
- rad 8 = border-radius
- boc #333 = border-color
Typography: size 14, weight 600, font "Inter"
Icons: icon "search", icon "plus", icon "user" (Lucide Icon Namen - kebab-case, z.B. "arrow-right", "chevron-down")
Images: src "https://example.com/photo.jpg", alt "Beschreibung", fit cover/contain/fill (default: cover)
Hover (mit automatischer CSS Transition): hover-col #333, hover-boc #555

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
Button: hor hor-cen ver-cen h 40 pad l-r 16 rad 8 col #3B82F6 col #FFF size 14 weight 500
\`\`\`

## Komponenten ableiten mit "from"

\`\`\`
Button: pad 12 col #3B82F6 rad 8 col #FFF
DangerButton: from Button col #EF4444
GhostButton: from Button col transparent col #3B82F6
\`\`\`

## Komponenten mit Kindern (Slots)

Definiere Komponenten mit Kind-Elementen (IMMER mit :):
\`\`\`
ProductTile: ver pad 12 col #1E1E1E rad 8 gap 8
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
Button: hor hor-cen ver-cen h 40 pad l-r 16 rad 8 col #3B82F6 col #FFF size 14 weight 500
DangerButton: from Button col #EF4444

Header: hor between ver-cen h 56 pad l-r 24 col #1A1A1A
  Logo size 20 weight 700 col #FFF
  Nav hor ver-cen gap 8

Content: ver grow pad 32 gap 16

Card: ver pad 16 col #1E1E1E rad 12 gap 8
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
Button: hor ver-cen h 40 pad l-r 16 rad 8 col $primary col $text

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
   - VERBOTEN: Properties (hor, ver, pad, col, etc.)
   - VERBOTEN: Doppelpunkt nach Namen
   - RICHTIG: Button "Click"
   - FALSCH: Button: "Click"
9. Jede Layout-Variation braucht eigene Komponente in COMPONENTS

## Interaktivität (States, Events, Variablen)

### States
Komponenten können mehrere Zustände haben:
\`\`\`
Button: col #333 pad 12 rad 8 col #FFF
  state normal
    col #333
  state active
    col #0066FF
  onclick
    toggle self
\`\`\`

### Variablen
\`\`\`
Counter: ver gap 8 pad 16 col #222
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
Button: col $primary pad 12 rad 8 col #FFF
  onclick page Dashboard

Button "Zum Dashboard"
\`\`\`

## Library-Komponenten (fertige interaktive Komponenten)

Die Library enthält Komponenten mit eingebauter Logik. Sie haben vordefinierte Slots.

**WICHTIG:** Library-Komponenten müssen mit der \`as\`-Syntax benannt werden:
\`\`\`
MeinDialog as Dialog:    // Richtig - benennt die Instanz
Dialog                   // Falsch - erzeugt eine Warnung
\`\`\`

### Dropdown
\`\`\`
UserMenu as Dropdown:
  Trigger: hor gap 8 pad 8 12 col $surface rad 6 bor 1 boc $border
    icon "chevron-down"
    "Menü"
  Content: ver col $surface rad 8 pad 4
    Item: hor ver-cen gap 8 pad 8 12 rad 4 hover-col $primary
      icon "user"
      "Profil"
    Item: hor ver-cen gap 8 pad 8 12 rad 4 hover-col $primary
      icon "settings"
      "Einstellungen"
    Separator: h 1 col $border mar u-d 4
    Item: col #EF4444 hover-col #EF444420
      icon "log-out"
      "Logout"

// Referenzieren in Actions:
Button onclick open UserMenu "Menü öffnen"
\`\`\`

### Dialog
\`\`\`
ConfirmDialog as Dialog:
  Trigger
    Button "Dialog öffnen"
  Content: ver gap 16 pad 24 col $surface rad 12 w 400
    Title "Bestätigung"
    "Möchtest du fortfahren?"
    Row hor gap 8
      Button col $border onclick close "Abbrechen"
      Button "Bestätigen"

// Referenzieren in Actions:
Button onclick open ConfirmDialog "Bestätigen"
Button onclick close ConfirmDialog "Schliessen"
\`\`\`

### Tabs
\`\`\`
MainTabs as Tabs:
  Tabs: hor gap 4 col $surface pad 4 rad 8
    Tab "Übersicht"
    Tab "Details"
    Tab "Einstellungen"
  TabContent
    "Inhalt der Übersicht"
  TabContent
    "Inhalt der Details"
  TabContent
    "Inhalt der Einstellungen"
\`\`\`

### Weitere Library-Komponenten (immer mit as-Syntax benennen)
- MyAccordion as Accordion: - Auf/Zuklappbare Sektionen
- MyCollapsible as Collapsible: - Einzelne auf/zuklappbare Sektion
- MyTooltip as Tooltip: - Hover-Info
- MyPopover as Popover: - Klick-Popup
- MyAlertDialog as AlertDialog: - Bestätigungs-Dialog
- MySelect as Select: - Auswahl-Dropdown
- MySwitch as Switch: - Toggle-Schalter
- MyCheckbox as Checkbox: - Checkbox
- MyRadioGroup as RadioGroup: - Radio-Buttons
- MySlider as Slider: - Schieberegler
- MyToast as Toast: - Benachrichtigung
- MyProgress as Progress: - Fortschrittsbalken
- MyAvatar as Avatar: - Profilbild
- MyContextMenu as ContextMenu: - Rechtsklick-Menü
- MyHoverCard as HoverCard: - Hover-Popup

### Library-Slots
Library-Komponenten haben Standard-Slots:
- Dropdown: Trigger, Content, Item, Separator
- Dialog: Trigger, Content
- Tabs: Tabs (für Tab-Liste), Tab, TabContent
- Accordion: AccordionItem, Trigger, Content
- Select: Trigger, Options, Option
- FormField: Label, Field, Hint, Error
- Checkbox: Indicator, Label
- Switch: Track, Thumb
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
    throw new Error('Kein API Key gesetzt. Bitte OpenRouter API Key in den Einstellungen eingeben (Zahnrad-Icon oben rechts).')
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
    logger.ai.info(`Applied ${validationResult.corrections.length} corrections`)
  }
  if (validationResult.errors.length > 0) {
    logger.ai.warn('Validation errors', validationResult.errors.map(e => e.message))
  }
  if (validationResult.warnings.length > 0) {
    logger.ai.info('Validation warnings', validationResult.warnings.map(w => w.message))
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

const JSON_SYSTEM_PROMPT = `Du bist ein UI-Designer. Generiere UI-Komponenten als JSON AST.

## WICHTIGSTE REGEL: NUR TOKENS VERWENDEN!
- Verwende AUSSCHLIESSLICH Design-Tokens ($name-suffix) für alle Werte
- NIEMALS hardcoded Farben (#FFFFFF), Zahlen (12, 16) oder Werte direkt setzen
- Wenn ein passender Token fehlt, wähle den nächstbesten vorhandenen Token

## Token-Konventionen (SUFFIXE!)
Tokens haben das Format: $name-suffix

- Farben: $primary-col, $secondary-col, $text-col, $text-muted-col, $error-col, $success-col
- Hintergründe: $page-bg, $surface-bg, $elevated-bg, $input-bg
- Rahmen: $default-boc, $hover-boc, $focus-boc
- Abstände: $xs-space, $sm-space, $md-space, $lg-space, $xl-space, $2xl-space
- Radien: $xs-rad, $sm-rad, $md-rad, $lg-rad, $xl-rad, $full-rad
- Schatten: $sm-shadow, $md-shadow, $lg-shadow
- Schriftgrössen: $xs-size, $sm-size, $base-size, $lg-size, $xl-size, $2xl-size
- Schriftstärken: $normal-weight, $medium-weight, $semibold-weight, $bold-weight

## Verfügbare Komponenten (Radix-basiert)
Nutze diese semantischen Komponenten statt primitiver Box/Text:
- **Button** - Für Aktionen (primary, secondary, ghost Varianten)
- **Input** - Texteingabe mit Label
- **Checkbox** - Auswahlbox
- **Switch** - Toggle-Schalter
- **Select** - Dropdown-Auswahl
- **Dialog** - Modal-Fenster
- **Card** - Container mit Rahmen/Schatten
- **Tabs** - Tab-Navigation
- **Avatar** - Benutzer-Bild
- **Badge** - Status-Label
- **Alert** - Hinweis-Box
- **Separator** - Trennlinie

## Schema
${LLM_SCHEMA}

## Regeln
1. NUR valides JSON - keine Erklärungen
2. Root: { "nodes": [...] }
3. IMMER Tokens verwenden: col "$color-surface" statt col "#1E1E1E"
4. Semantische Komponenten bevorzugen

## Beispiele mit Tokens (SUFFIX-Format!)

### Button
{"type":"component","name":"Button","properties":{"pad":"$md-space","col":"$primary-col","col":"$text-col","rad":"$md-rad"},"content":"Klick mich","children":[]}

### Card
{"type":"component","name":"Card","properties":{"ver":true,"pad":"$lg-space","col":"$surface-bg","rad":"$lg-rad","gap":"$md-space","shadow":"$md-shadow"},"children":[
  {"type":"component","name":"Text","properties":{"size":"$lg-size","weight":"$bold-weight","col":"$text-col"},"content":"Titel","children":[]}
]}

### Input mit Label
{"type":"component","name":"Box","properties":{"ver":true,"gap":"$sm-space"},"children":[
  {"type":"component","name":"Text","properties":{"size":"$sm-size","weight":"$medium-weight","col":"$text-col"},"content":"E-Mail","children":[]},
  {"type":"component","name":"Input","instanceName":"Email","properties":{"placeholder":"name@beispiel.de","pad":"$md-space","col":"$input-bg","col":"$text-col","rad":"$md-rad","bor":1,"boc":"$default-boc"},"children":[]}
]}

### Login-Formular
{"nodes":[{"type":"component","name":"Card","properties":{"ver":true,"gap":"$lg-space","pad":"$xl-space","w":400,"col":"$surface-bg","rad":"$lg-rad","shadow":"$lg-shadow"},"children":[
  {"type":"component","name":"Text","properties":{"size":"$2xl-size","weight":"$bold-weight","col":"$text-col","hor-cen":true},"content":"Anmelden","children":[]},
  {"type":"component","name":"Box","properties":{"ver":true,"gap":"$md-space"},"children":[
    {"type":"component","name":"Input","instanceName":"Email","properties":{"type":"email","placeholder":"E-Mail","pad":"$md-space","col":"$input-bg","col":"$text-col","rad":"$md-rad","bor":1,"boc":"$default-boc"},"children":[]},
    {"type":"component","name":"Input","instanceName":"Password","properties":{"type":"password","placeholder":"Passwort","pad":"$md-space","col":"$input-bg","col":"$text-col","rad":"$md-rad","bor":1,"boc":"$default-boc"},"children":[]}
  ]},
  {"type":"component","name":"Button","properties":{"pad":"$md-space","col":"$primary-col","col":"$text-col","rad":"$md-rad","w":"full","hor-cen":true},"content":"Einloggen","children":[]}
]}]}

Generiere NUR JSON mit Tokens (SUFFIX-Format!), keine Erklärungen.`

/**
 * Alternative DSL generation using JSON AST approach
 * The LLM generates JSON (which it knows well), then we convert to Mirror DSL
 */
export async function generateDSLViaJSON(
  userPrompt: string,
  designSystem?: { tokens: string; components: string }
): Promise<GeneratedCode> {
  if (!hasApiKey()) {
    throw new Error('Kein API Key gesetzt. Bitte OpenRouter API Key in den Einstellungen eingeben (Zahnrad-Icon oben rechts).')
  }

  // Build user message with design system context if available
  let userMessage = userPrompt
  if (designSystem?.tokens || designSystem?.components) {
    const contextParts: string[] = []

    if (designSystem.tokens.trim()) {
      contextParts.push(`## Mein Design-System (Tokens)\nVerwende diese Farben, Abstände und Werte:\n\`\`\`\n${designSystem.tokens.trim()}\n\`\`\``)
    }

    if (designSystem.components.trim()) {
      contextParts.push(`## Meine Komponenten-Definitionen\nVerwende diese vordefinierten Komponenten als Basis:\n\`\`\`\n${designSystem.components.trim()}\n\`\`\``)
    }

    userMessage = `${contextParts.join('\n\n')}\n\n## Aufgabe\n${userPrompt}\n\nWICHTIG: Verwende die oben definierten Tokens (z.B. $primary, $surface) und Komponenten-Stile!`
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
          content: userMessage
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
    logger.ai.error('JSON Parse Error', jsonContent.substring(0, 200))
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
