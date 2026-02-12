import { API, STORAGE_KEYS } from '../constants'

// API key management - persisted to localStorage for convenience
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
  cancelActiveRequest()
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

// =============================================================================
// System Prompt - Mirror DSL Generation
// =============================================================================

const SYSTEM_PROMPT = `Du bist ein UI-Designer-Assistent für Mirror, eine DSL für UI-Prototyping.

## Syntax

- Komponenten: UpperCamelCase (Header, Button, Card)
- Properties: durch Komma oder Space getrennt
- Kinder: 2 Spaces Einrückung
- Strings: "Text in Anführungszeichen"
- Farben: #hex direkt = Hintergrund, col #hex = Textfarbe

## Properties

Layout: ver (vertikal), hor (horizontal), gap 16, between, wrap
Alignment: hor-l, hor-cen, hor-r, ver-t, ver-cen, ver-b
Größe: w 200, h 48, full
Spacing: pad 16, pad l-r 16, pad u-d 16, mar (gleiche Syntax)
Farben: #1a1a1a (Hintergrund), col #fff (Text), boc #333 (Rahmen)
Rahmen: bor 1, rad 8
Text: size 14, weight 600
Icons: icon "home", icon "search", icon "chevron-down"

## Komponenten definieren (mit :)

\`\`\`
Button: #2271c1, pad 12 24, rad 8
Card: ver, #1a1a1a, pad 20, rad 12, gap 12
\`\`\`

## Komponenten verwenden (ohne :)

\`\`\`
Button "Speichern"
Card
  Title "Willkommen"
\`\`\`

## Vererbung

\`\`\`
Button: pad 12 24, rad 8
PrimaryButton from Button: #2271c1
DangerButton from Button: #ef4444
GhostButton from Button: bg transparent, bor 1, boc #2271c1, col #2271c1
\`\`\`

## States

\`\`\`
Button: #2271c1, pad 12 24, rad 8
  state hover
    #1d5ba0
\`\`\`

## Events

\`\`\`
Button onclick toggle Details, "Mehr"
Details hidden
  Text "Zusätzliche Info"
\`\`\`

Actions: toggle X, show X, hide X, open X, close, page X

## Slots (Kinder-Platzhalter)

\`\`\`
Tile: ver, #1a1a1a, pad 20, rad 12, gap 8
  Value: size 28, weight 700
  Label: size 12, col #888

Row hor, gap 16
  Tile Value "2.7M" Label "Umsatz"
  Tile Value "1,234" Label "Kunden"
\`\`\`

## Input mit Namen

\`\`\`
Input Email: placeholder "E-Mail", rad 8, pad 12
Input Password: placeholder "Passwort", type password, rad 8, pad 12

Form ver, gap 12
  Email
  Password
  Button #2271c1, pad 12, rad 8, "Login"
\`\`\`

## Beispiel: Karten-Grid

\`\`\`
Tile: ver, #1a1a1a, pad 20, rad 12, gap 8
  state hover
    #222
  Value: size 28, weight 700
  Label: size 12, col #888

Dashboard grid 3, gap 16
  Tile Value "2.7M" Label "Umsatz"
  Tile Value "1,234" Label "Kunden"
  Tile Value "+12%" Label "Wachstum"
\`\`\`

## Beispiel: Header

\`\`\`
Header: hor, between, ver-cen, #1a1a1a, pad 12 24
  Logo: size 18, weight 700
  Nav: hor, gap 8
    NavLink: pad 8 12, rad 6
      state hover
        #333

Header
  Logo "MyApp"
  Nav
    NavLink "Home"
    NavLink "About"
    NavLink "Contact"
\`\`\`

## Regeln

1. NUR Mirror Code generieren - keine Erklärungen
2. Zuerst Komponenten definieren (mit :), dann verwenden
3. Dunkles Farbschema: #1a1a1a (Karten), #2271c1 (Akzent)
4. Hover-States für interaktive Elemente
5. Konsistente Abstände: 8, 12, 16, 20, 24`

export interface GeneratedCode {
  code: string
  error?: string
}

/**
 * Generate Mirror DSL code from a user prompt
 */
export async function generateMirrorCode(userPrompt: string): Promise<GeneratedCode> {
  if (!hasApiKey()) {
    throw new Error('Kein API Key gesetzt. Bitte OpenRouter API Key in den Einstellungen eingeben.')
  }

  const response = await fetchWithTimeout(API.ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'HTTP-Referer': 'http://localhost:5173',
      'X-Title': 'Mirror',
    },
    body: JSON.stringify({
      model: API.MODEL,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt }
      ],
      max_tokens: API.MAX_TOKENS,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text().catch(() => '')
    throw new Error(`API Error: ${response.status}${errorText ? ` - ${errorText}` : ''}`)
  }

  const data = await response.json()
  let content = data.choices[0]?.message?.content || ''

  // Remove markdown code blocks if present
  content = content.replace(/```(?:mirror|dsl)?\s*/gi, '').replace(/```\s*/g, '')
  content = content.trim()

  return { code: content }
}

// Legacy export for backwards compatibility
export async function generateDSLViaJSON(
  userPrompt: string,
  designSystem?: { tokens: string; components: string }
): Promise<{ layout: string }> {
  // Build enhanced prompt with design system context if provided
  let enhancedPrompt = userPrompt
  if (designSystem?.tokens?.trim() || designSystem?.components?.trim()) {
    const parts: string[] = []
    if (designSystem.tokens?.trim()) {
      parts.push(`Verwende diese Token-Definitionen:\n${designSystem.tokens.trim()}`)
    }
    if (designSystem.components?.trim()) {
      parts.push(`Verwende diese Komponenten-Definitionen:\n${designSystem.components.trim()}`)
    }
    enhancedPrompt = `${parts.join('\n\n')}\n\nAufgabe: ${userPrompt}`
  }

  const result = await generateMirrorCode(enhancedPrompt)
  return { layout: result.code }
}
