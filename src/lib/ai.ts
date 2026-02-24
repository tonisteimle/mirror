import { API, STORAGE_KEYS } from '../constants'
import { classifyRequest } from './request-classifier'
import { isIntentPipelineEnabled, isRateLimitingEnabled } from './feature-flags'
import { generateWithCreate, generateWithModify } from '../intent/generation'
import type { LLMCallFn } from '../intent/generation'
import {
  sanitizeUserInput,
  sanitizeCodeContext,
  detectPromptInjection,
  canGenerateNow,
  recordGenerationRequest,
  getGenerationStatus,
  RateLimitError,
} from './llm'

// API key management
// Uses sessionStorage for security - key clears when browser tab closes
// This prevents API key from persisting if device is shared
let OPENROUTER_API_KEY = ''

// Helper to safely get env variable (works in both Vite and Node.js)
function getEnvApiKey(): string {
  // Try Vite's import.meta.env first (browser)
  try {
    if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_OPENROUTER_API_KEY) {
      return import.meta.env.VITE_OPENROUTER_API_KEY
    }
  } catch {
    // Expected in Node.js environment - import.meta is browser-only
  }
  // Try Node.js process.env (for E2E tests)
  try {
    const global = globalThis as { process?: { env?: Record<string, string> } }
    if (global.process?.env?.VITE_OPENROUTER_API_KEY) {
      return global.process.env.VITE_OPENROUTER_API_KEY
    }
  } catch {
    // Expected in browser environment - process is Node.js-only
  }
  return ''
}

// Load API key: 1. sessionStorage, 2. env variable (for testing)
try {
  const stored = sessionStorage.getItem(STORAGE_KEYS.API_KEY)
  if (stored) {
    OPENROUTER_API_KEY = stored
  } else {
    OPENROUTER_API_KEY = getEnvApiKey()
  }
} catch {
  // Expected in SSR/Node.js - sessionStorage is browser-only, fallback to env
  OPENROUTER_API_KEY = getEnvApiKey()
}

/**
 * Set the API key and persist it to sessionStorage.
 * Key will be cleared when the browser tab is closed.
 */
export function setApiKey(key: string): void {
  OPENROUTER_API_KEY = key
  try {
    if (key) {
      sessionStorage.setItem(STORAGE_KEYS.API_KEY, key)
    } else {
      sessionStorage.removeItem(STORAGE_KEYS.API_KEY)
    }
  } catch {
    // Expected in SSR/Node.js - sessionStorage is browser-only
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
 * Clear the API key from memory and sessionStorage
 */
export function clearApiKey(): void {
  OPENROUTER_API_KEY = ''
  try {
    sessionStorage.removeItem(STORAGE_KEYS.API_KEY)
  } catch {
    // Expected in SSR/Node.js - sessionStorage is browser-only
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
// System Prompt - Mirror DSL Generation (Optimized)
// =============================================================================

const SYSTEM_PROMPT = `Du bist ein UI-Designer für Mirror DSL. Generiere NUR Mirror Code, keine Erklärungen.

## Core Rules
1. Colon = define only (no render): Button: padding 12
2. No colon = render: Button "Click"
3. 2-space indent = child
4. Text content is LAST on line: Button background #F00 "Click"
5. First numbers = dimensions: Box 300 400 → width 300 height 400
6. color = text color, background = background (always)
7. Use named instances for event targeting: Button named Btn1 "Click"
8. Tokens ALWAYS start with $ (define AND use): $primary: #3B82F6 → background $primary
9. Use - (dash) ONLY for multiple items in a list, never for single elements
10. Avoid reserved names: Text, Button, Input, Image, Link → use Title, Label, Btn, Field
11. DRY: Bei wiederholten Elementen IMMER erst definieren, dann wiederverwenden

## Common Pitfalls - DON'T DO THIS
// ❌ WRONG: Text on separate line
Button background #F00
  "Click me"
// ✅ CORRECT: Text inline at end
Button background #F00 "Click me"

// ❌ WRONG: Semicolon chaining actions
Button onclick show A; hide B
// ✅ CORRECT: Use events block
events
  Btn onclick
    show A
    hide B

// ❌ WRONG: Referencing unnamed instances
- Button "Save"
events
  Button[0] onclick  // Can't reference by index
// ✅ CORRECT: Name instances
- Button named SaveBtn "Save"
events
  SaveBtn onclick
    show Success

// ❌ WRONG: Text content in definition (empty instance)
Card: background #1E1E1E
  Label: color white
Card
  Label "Hello"        // Label has no styling!
// ✅ CORRECT: Style in definition, content in instance
Card: background #1E1E1E
Card color white "Hello World"
// OR nested with styled Label:
Card: background #1E1E1E
  Label: color white
Card
  Label "Hello World"  // Label inherits color white

// ❌ WRONG: Token without $ prefix
primary: #3B82F6
Box background primary        // Error: "primary" is unknown
// ✅ CORRECT: Always use $ for tokens - EVERYWHERE
$primary: #3B82F6
$hover-color: #2563EB
Box background $primary
  state hover
    background $hover-color   // $ is required here too!

// ❌ WRONG: Using token NAME as property in state
$border: #444
Input border 1 $border
  state focus
    $border 1 $primary        // ERROR: $border is a VALUE, not a property!
// ✅ CORRECT: Use property names, tokens for VALUES only
$border-color: #444
$focus-color: #3B82F6
Input border 1 $border-color
  state focus
    border-color $focus-color  // Property: border-color, Value: $focus-color

// ❌ WRONG: Using hover-background as token name
$hover-background: #333      // Don't do this!
Box hover-background $hover-background
// ✅ CORRECT: hover-background is a PROPERTY, not a token
Box hover-background #333
// Or use token for the color value:
$accent: #333
Box hover-background $accent

// ❌ WRONG: Dash for single element
- Box background #333 "Hello"
// ✅ CORRECT: Dash only for list items
Container
  - Item "First"
  - Item "Second"

// ❌ WRONG: Input without proper name
Input Field: "placeholder"  // "Field" looks like a keyword
// ✅ CORRECT: Give inputs descriptive names
Input EmailField: "E-Mail eingeben" type email
Input PasswordField: "Passwort" type password

// ❌ WRONG: show/hide in wrong context
Panel
  show fade 200       // Can't use show inside component
// ✅ CORRECT: Use events block for show/hide
Panel named MyPanel: hidden
  "Content"
events
  TriggerBtn onclick
    show MyPanel

## DRY-PRINZIP - SEHR WICHTIG!

Bei wiederholten Elementen (Formularfelder, Listen, etc.) IMMER erst definieren, dann wiederverwenden:

// ❌ FALSCH - Wiederholung
Box vertical gap 8
  Label color #9CA3AF "Name"
  Input padding 12 radius 8
Box vertical gap 8
  Label color #9CA3AF "Email"
  Input padding 12 radius 8

// ✅ RICHTIG - Definition + Wiederverwendung
Field:
  Label: color #9CA3AF
  Input: padding 12 radius 8 background #2A2A3E

Field
  Label "Name"
Field
  Label "Email"

## Quick Reference
LAYOUT      horizontal vertical gap between wrap grid stacked
ALIGN       horizontal-left horizontal-center horizontal-right vertical-top vertical-center vertical-bottom center
SPACING     padding margin (+ left right top bottom left-right top-bottom)
SIZE        width height w-min w-max h-min h-max min-width max-width full grow shrink
COLOR       color #hex (text) background #hex (background) border-color #hex (border)
BORDER      border 1, border 1 #333, radius 8, radius tl 8 br 8 (corners: tl tr bl br)
TYPE        size weight line font align italic underline truncate
VISUAL      opacity shadow cursor z hidden disabled
HOVER       hover-background hover-color hover-scale hover-opacity

DEFINE      Name: props (define only, no render)
INHERIT     Name from Parent: props
AS-SYNTAX   Email as Input props (define AND render)
            Card bg #333 (implicit as Box, define AND render)
PRIMITIVE   Input EmailField: "placeholder" type email  (creates named input)
            Input PasswordField: "password" type password
NAMED       - Component named Name props "text"

STATE       state hover/focus/active/disabled or custom states
EVENTS      onclick onchange oninput onfocus onblur
ACTIONS     toggle | show X | hide X | open X | close | page X | assign $var to expr
CONDITION   if $x then prop val else prop val
ITERATOR    each $item in $list
DATA        data TypeName, data TypeName where field == value
MASTER-DETAIL  onclick assign $selected to $item → $selected.field
THEME       theme name: (define) | use theme name (activate)

## Theme Blocks (für Dark/Light Mode)
Themes gruppieren Tokens, die zusammen aktiviert werden können:

// Theme definieren
theme dark:
  $bg-color: #1A1A1A
  $text-color: #E0E0E0

theme light:
  $bg-color: #FFFFFF
  $text-color: #1A1A1A

// Theme aktivieren (überschreibt globale Tokens)
use theme dark

// Tokens verwenden
Box background $bg-color
  Text color $text-color "Hello"

WICHTIG:
- Theme muss VOR "use theme" definiert sein
- "use theme X" kopiert alle Theme-Tokens in globale Tokens
- Globale Tokens (nicht im Theme) bleiben erhalten
- Letztes "use theme" gewinnt

## Data Tab Syntax (für data-driven UIs)
Wenn der User Daten/Listen/Master-Detail möchte, generiere BEIDE Teile:

// === DATA TAB ===
TypeName:
  fieldName: text|number|boolean|OtherType
- TypeName "value1", value2, OtherType[0]

// === LAYOUT TAB ===
$selected: null
List data TypeName
  - Item onclick assign $selected to $item

WICHTIG Naming-Konvention:
- Schema-Name ist SINGULAR: Task:, Contact:, User:
- data-Binding verwendet GLEICHEN Namen: data Task, data Contact, data User
- NICHT data Tasks oder data Contacts - immer SINGULAR!

## Example 1: Form with Inputs
$primary: #3B82F6
$bg: #1E1E2E
$input-bg: #2A2A3E

Input EmailField: "E-Mail eingeben" type email padding 12 background $input-bg color white radius 8 border 1 #444
Input PasswordField: "Passwort" type password padding 12 background $input-bg color white radius 8 border 1 #444
Btn: padding 12 24 radius 8 cursor pointer background $primary color white hover-background #2563EB

Form: vertical gap 16 padding 24 background $bg radius 12
  EmailField
  PasswordField
  Btn named SubmitBtn "Anmelden"

## Example 2: Card with Events
Card: vertical gap 12 padding 16 background $bg radius 12 hover-background #2A2A3E
  Title: weight 600 size 16
  Desc: color #9CA3AF size 14

Panel named Details: hidden padding 16 background #111 radius 8
  "Additional information"

Card
  Title "Welcome"
  Desc "Click below"
  Btn named ShowBtn "Show"

events
  ShowBtn onclick
    show Details

## Example 3: Aufgabenliste mit Toggle (vollständig mit Data Tab)

// === DATA TAB ===
Task:
  title: text
  done: boolean

- Task "Einkaufen gehen", false
- Task "Meeting vorbereiten", true
- Task "Email schreiben", false
- Task "Projekt-Dokumentation", false

// === LAYOUT TAB ===
App vertical gap 16 padding 24 background #1E1E2E h-max
  Text size 20 weight 600 margin b 8 "Aufgaben"

  List data Task vertical gap 8
    - Row horizontal gap 12 vertical-center padding 12 background #252530 radius 8 cursor pointer
      onclick toggle $item.done
      hover
        background #333
      Box width 20 height 20 radius 4 center border 2 #555
        background if $item.done then #3B82F6 else transparent
        border-color if $item.done then #3B82F6 else #555
        if $item.done
          Icon "check" size 12 color white
      Text $item.title
        color if $item.done then #666 else white
        opacity if $item.done then 0.6 else 1

## Example 4: Kontaktliste mit Master-Detail

// === DATA TAB ===
Contact:
  name: text
  email: text
  phone: text
  company: text

- Contact "Max Müller", "max@example.com", "+49 123 456", "Acme GmbH"
- Contact "Anna Schmidt", "anna@firma.de", "+49 789 012", "Tech AG"
- Contact "Peter Weber", "peter@mail.com", "+49 345 678", "StartupXY"

// === LAYOUT TAB ===
$selected: null

Row horizontal gap 24 padding 24 background #1E1E2E h-max
  // Master: Kontaktliste
  Col vertical gap 8 width 280 padding 16 background #252530 radius 12
    Row horizontal between vertical-center margin b 16
      Text size 18 weight 600 "Kontakte"
      Text background #3B82F6 padding 4 8 radius 12 size 12 "3"
    List data Contact vertical gap 4
      - Row horizontal gap 12 vertical-center padding 12 radius 8 cursor pointer
        onclick assign $selected to $item
        background if $selected == $item then #333 else transparent
        hover
          background #333
        Box width 40 height 40 radius 20 background #3B82F6 center
          Icon "user" size 20
        Col vertical gap 2
          Text weight 500 $item.name
          Text size 12 color #888 $item.company

  // Detail: Kontaktdetails
  Col w-max padding 24 background #252530 radius 12
    if $selected
      Col vertical gap 24
        Row horizontal gap 16 vertical-center
          Box width 80 height 80 radius 40 background #3B82F6 center
            Icon "user" size 32
          Col vertical gap 4
            Text size 28 weight 600 $selected.name
            Text size 16 color #888 $selected.company
        Box height 1 background #444
        Col vertical gap 16
          Row horizontal gap 12 vertical-center
            Icon "mail" color #888
            Text $selected.email
          Row horizontal gap 12 vertical-center
            Icon "phone" color #888
            Text $selected.phone
    else
      Col vertical center h-max gap 16
        Icon "users" size 48 color #444
        Text color #666 "Wähle einen Kontakt aus der Liste"

## Output Rules
1. NUR Mirror Code - keine Erklärungen
2. Dunkles Farbschema: #1E1E2E, #1A1A1A, Akzent #3B82F6
3. Hover-States für interaktive Elemente
4. Named instances für Event-Targeting
5. Bei data-driven UIs (Listen, Master-Detail): IMMER mit "// === DATA TAB ===" und "// === LAYOUT TAB ===" Marker generieren
6. Data Tab enthält Schema-Definitionen UND Beispiel-Instanzen
7. NAMING: Schema-Name SINGULAR (Task:), data-Binding SINGULAR (data Task) - NICHT pluralisieren!
8. Bei konditionellen Properties: NUR EINE if-then-else pro Property. Richtig: "color if $x then #red else #white". Falsch: "color if $x then #red else #white if $y then ..."
9. Für durchgestrichenen Text bei erledigten Tasks: opacity 0.6 verwenden, NICHT text-decoration
10. PRIMITIVE KOMPONENTEN verwenden: Row, Col, Box, Text, List, Icon, Input, Button - NICHT erfundene Namen wie TaskItem, Checkbox, Avatar, Title etc.
11. Variable Text-Inhalte ($item.title etc.) VOR konditionellen Properties platzieren. Richtig: "Text $item.title" mit "color if $x then #red else #white" auf separater Zeile. Falsch: "Text color if $x then #red else #white $item.title"
`

export interface GeneratedCode {
  code: string
  error?: string
  method?: 'js-builder' | 'intent-create' | 'intent-modify'
}

export interface GenerationOptions {
  /** Current layout code (for MODIFY detection) */
  layoutCode?: string
  /** Components code */
  componentsCode?: string
  /** Tokens code */
  tokensCode?: string
  /** Force a specific pipeline (overrides auto-detection) */
  forcePipeline?: 'js-builder' | 'intent'
}

/**
 * Generate Mirror DSL code from a user prompt
 * Uses JS Builder: LLM generates JavaScript, we transform to Mirror
 *
 * @param userPrompt - The user's request
 * @param tokensCode - Optional tokens code to provide context
 */
export async function generateMirrorCode(userPrompt: string, tokensCode?: string): Promise<GeneratedCode> {
  if (!hasApiKey()) {
    throw new Error('Kein API Key gesetzt. Bitte OpenRouter API Key in den Einstellungen eingeben.')
  }

  // Rate limiting check
  if (isRateLimitingEnabled() && !canGenerateNow()) {
    const status = getGenerationStatus()
    throw new RateLimitError(
      `Zu viele Anfragen. Bitte warte ${Math.ceil(status.retryAfter / 1000)} Sekunden.`,
      status.retryAfter
    )
  }

  // Input sanitization
  const sanitizedPrompt = sanitizeUserInput(userPrompt)
  if (sanitizedPrompt.modified) {
    console.debug('[AI] Input sanitized:', sanitizedPrompt.warnings)
  }

  // Check for potential prompt injection
  const injectionCheck = detectPromptInjection(userPrompt)
  if (injectionCheck.detected && injectionCheck.confidence === 'high') {
    console.warn('[AI] Potential prompt injection detected:', injectionCheck.patterns)
    // Log but don't block - the LLM system prompt should handle this
  }

  // Build prompt with token context
  let fullPrompt = sanitizedPrompt.sanitized
  if (tokensCode?.trim()) {
    const sanitizedTokens = sanitizeCodeContext(tokensCode)
    fullPrompt = `Available design tokens (use these instead of hardcoded values):
\`\`\`
${sanitizedTokens.sanitized.trim()}
\`\`\`

${sanitizedPrompt.sanitized}`
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
      model: API.MODEL_FAST,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: fullPrompt }
      ],
      max_tokens: API.MAX_TOKENS,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text().catch(() => '')
    throw new Error(`API Error: ${response.status}${errorText ? ` - ${errorText}` : ''}`)
  }

  // Record successful request for rate limiting
  if (isRateLimitingEnabled()) {
    recordGenerationRequest()
  }

  const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> }
  if (!data?.choices?.[0]) {
    return { code: '', error: 'Invalid API response: no choices', method: 'js-builder' }
  }
  const code = data.choices[0].message?.content || ''

  // Clean up markdown code blocks
  const cleanedCode = code
    .replace(/```(?:mirror|dsl)?\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim()

  if (cleanedCode) {
    return { code: cleanedCode, method: 'js-builder' }
  } else {
    return {
      code: '',
      error: 'No code generated',
      method: 'js-builder'
    }
  }
}

// =============================================================================
// Intent Pipeline Generation
// =============================================================================

/**
 * Create an LLM call function for the intent pipeline
 */
function createIntentLLMCall(): LLMCallFn {
  return async (systemPrompt: string, userPrompt: string): Promise<string> => {
    const response = await fetchWithTimeout(API.ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'http://localhost:5173',
        'X-Title': 'Mirror',
      },
      body: JSON.stringify({
        model: API.MODEL_FAST,  // Use fast model for intent pipeline
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: API.MAX_TOKENS,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => '')
      throw new Error(`API Error: ${response.status}${errorText ? ` - ${errorText}` : ''}`)
    }

    const data = await response.json() as { choices: Array<{ message?: { content?: string } }> }
    return data.choices[0]?.message?.content || ''
  }
}

/**
 * Generate Mirror code using the Intent Pipeline
 *
 * Routes to CREATE or MODIFY based on request classification.
 */
async function generateWithIntentPipeline(
  userPrompt: string,
  options: GenerationOptions
): Promise<GeneratedCode> {
  const layoutCode = options.layoutCode || ''
  const classification = classifyRequest(userPrompt, layoutCode)
  const llmCall = createIntentLLMCall()

  if (classification.type === 'create') {
    const result = await generateWithCreate(
      userPrompt,
      {
        layoutCode,
        componentsCode: options.componentsCode,
        tokensCode: options.tokensCode,
      },
      llmCall
    )

    if (result.success) {
      return { code: result.code, method: 'intent-create' }
    } else {
      return { code: '', error: result.error, method: 'intent-create' }
    }
  } else {
    const result = await generateWithModify(
      userPrompt,
      {
        layoutCode,
        componentsCode: options.componentsCode,
        tokensCode: options.tokensCode,
      },
      llmCall
    )

    if (result.success) {
      return { code: result.code, method: 'intent-modify' }
    } else {
      return { code: result.code || layoutCode, error: result.error, method: 'intent-modify' }
    }
  }
}

/**
 * Generate Mirror DSL code with full options
 *
 * Uses the Intent Pipeline when enabled, otherwise falls back to JS Builder.
 *
 * @param userPrompt - The user's request
 * @param options - Generation options including context
 */
export async function generateMirrorCodeWithOptions(
  userPrompt: string,
  options: GenerationOptions = {}
): Promise<GeneratedCode> {
  if (!hasApiKey()) {
    throw new Error('Kein API Key gesetzt. Bitte OpenRouter API Key in den Einstellungen eingeben.')
  }

  // Determine which pipeline to use
  const useIntentPipeline = options.forcePipeline === 'intent' ||
    (options.forcePipeline !== 'js-builder' && isIntentPipelineEnabled())

  if (useIntentPipeline) {
    return generateWithIntentPipeline(userPrompt, options)
  } else {
    // Fallback to JS Builder
    return generateMirrorCode(userPrompt, options.tokensCode)
  }
}

// Re-export feature flag utilities for convenience
export { isIntentPipelineEnabled, enableIntentPipeline, disableIntentPipeline } from './feature-flags'

// =============================================================================
// Self-Healing Generation (validates and auto-corrects)
// =============================================================================

import { withSelfHealing, validateMirrorCode, applyAllFixes, type SelfHealingResult, type PromptLanguage, type CodeIssue } from './self-healing'

export interface GenerateWithValidationOptions {
  /** Maximum correction attempts (default: 2) */
  maxAttempts?: number
  /** Include warnings in validation (default: false) */
  includeWarnings?: boolean
  /** Language for correction prompts (default: 'de') */
  language?: PromptLanguage
  /** Callback for progress updates */
  onProgress?: (status: 'generating' | 'validating' | 'correcting', attempt: number) => void
}

/**
 * Generate Mirror code with automatic validation and self-healing.
 *
 * If the generated code contains errors, the LLM is automatically
 * re-prompted with the original request plus hints about what to avoid.
 *
 * Note: This uses a JS Builder pathway where LLM generates JavaScript
 * that gets transformed to Mirror. For retries, we resend the original
 * prompt with error hints (not Mirror code to fix).
 *
 * @example
 * ```typescript
 * const result = await generateWithValidation("Create a login form")
 *
 * if (result.valid) {
 *   editor.setValue(result.code)
 * } else {
 *   showError(`Could not generate valid code: ${result.issues.map(i => i.message).join(', ')}`)
 * }
 * ```
 */
export async function generateWithValidation(
  userPrompt: string,
  options: GenerateWithValidationOptions = {}
): Promise<SelfHealingResult> {
  const { maxAttempts = 3, includeWarnings = false, language = 'de', onProgress } = options

  let currentCode = ''
  let attempts = 0
  let lastIssues: CodeIssue[] = []

  // Helper to build retry prompt
  const buildRetryPrompt = (originalPrompt: string, issues: typeof lastIssues): string => {
    const errorHints = issues
      .filter(i => i.type !== 'validation_warning')
      .slice(0, 5) // Limit to 5 most important errors
      .map(i => `- ${i.message}${i.suggestion ? ` (${i.suggestion})` : ''}`)
      .join('\n')

    const hint = language === 'de'
      ? `WICHTIG: Beim letzten Versuch gab es diese Probleme - bitte vermeide sie:\n${errorHints}\n\n`
      : `IMPORTANT: The last attempt had these issues - please avoid them:\n${errorHints}\n\n`

    return hint + originalPrompt
  }

  while (attempts < maxAttempts) {
    attempts++

    // Report progress
    if (onProgress) {
      onProgress(attempts === 1 ? 'generating' : 'correcting', attempts)
    }

    // Build prompt (with hints on retry)
    const prompt = attempts === 1
      ? userPrompt
      : buildRetryPrompt(userPrompt, lastIssues)

    // Generate
    const result = await generateMirrorCode(prompt)
    currentCode = result.code

    // If generation failed completely, try again
    if (!currentCode || currentCode.trim() === '') {
      lastIssues = [{
        type: 'parse_error',
        line: 0,
        message: result.error || 'Generation returned empty code'
      }]
      continue
    }

    // Apply algorithmic fixes
    currentCode = applyAllFixes(currentCode)

    // Report validation
    if (onProgress) {
      onProgress('validating', attempts)
    }

    // Validate
    const feedback = validateMirrorCode(currentCode, includeWarnings, language)
    lastIssues = feedback.issues

    // If valid, return success
    if (feedback.valid) {
      return {
        code: currentCode,
        valid: true,
        attempts,
        issues: feedback.issues
      }
    }
  }

  // Return last attempt even if not valid
  return {
    code: currentCode,
    valid: false,
    attempts,
    issues: lastIssues
  }
}

/**
 * Quick validation check for generated code.
 * Returns issues without re-prompting.
 */
export function validateGeneratedCode(code: string): {
  valid: boolean
  issues: string[]
} {
  const feedback = validateMirrorCode(code, false)
  return {
    valid: feedback.valid,
    issues: feedback.issues.map(i =>
      i.suggestion ? `${i.message} (${i.suggestion})` : i.message
    )
  }
}

// Re-export for convenience
export { validateMirrorCode, isValidMirrorCode, getIssueSummary } from './self-healing'
export type { SelfHealingResult, ValidationFeedback, CodeIssue, PromptLanguage } from './self-healing'

// =============================================================================
// Context-Aware Generation (Code Intelligence)
// =============================================================================

import { MirrorCodeIntelligence, type GenerationContext } from './ai-context'

export interface ContextAwareGenerationOptions {
  /** Full source code (all tabs combined) */
  sourceCode: string
  /** Current cursor position */
  cursor?: { line: number; column: number }
  /** Max correction attempts */
  maxAttempts?: number
  /** Progress callback */
  onProgress?: (status: 'analyzing' | 'generating' | 'validating' | 'correcting', attempt: number) => void
}

export interface ContextAwareResult {
  code: string
  valid: boolean
  /** Where to insert the code */
  insertAt?: { line: number; indent: number }
  /** What approach was used */
  approach: 'reuse' | 'extend' | 'create'
  /** Which existing component was used (if any) */
  usedComponent?: string
  issues: string[]
}

/**
 * Generate Mirror code with full context awareness.
 *
 * This function:
 * 1. Analyzes existing code (components, tokens, patterns)
 * 2. Builds context-aware prompt with relevant components/tokens
 * 3. Generates code with self-healing validation
 * 4. Adjusts indentation for cursor position
 */
export async function generateWithCodeIntelligence(
  userPrompt: string,
  options: ContextAwareGenerationOptions
): Promise<ContextAwareResult> {
  const { sourceCode, cursor, maxAttempts = 2, onProgress } = options

  onProgress?.('analyzing', 0)

  // 1. Analyze code with intelligence
  const intelligence = new MirrorCodeIntelligence(sourceCode)
  const context = intelligence.buildGenerationContext(
    userPrompt,
    cursor?.line,
    cursor?.column
  )

  // 2. Build enhanced prompt with context
  const contextSection = intelligence.formatContextForLLM(context)
  const targetIndent = context.insertion?.indent ?? 0
  const enhancedPrompt = `${contextSection}

## Aufgabe
${userPrompt}

Generiere NUR den Code-Block zum Einfügen${targetIndent > 0 ? ` (Einrückung: ${targetIndent} Spaces)` : ''}.`

  onProgress?.('generating', 1)

  // 3. Generate with self-healing
  const result = await generateWithValidation(enhancedPrompt, {
    maxAttempts,
    onProgress: (status, attempt) => {
      if (status === 'correcting') {
        onProgress?.('correcting', attempt)
      } else if (status === 'validating') {
        onProgress?.('validating', attempt)
      }
    }
  })

  // 4. Adjust indentation if needed
  let finalCode = result.code
  if (targetIndent > 0) {
    finalCode = adjustIndentation(result.code, targetIndent)
  }

  return {
    code: finalCode,
    valid: result.valid,
    insertAt: cursor ? { line: cursor.line, indent: targetIndent } : undefined,
    approach: context.suggestion.action,
    usedComponent: context.suggestion.component || context.suggestion.baseComponent,
    issues: result.issues.map(i => i.message),
  }
}

/**
 * Adjust indentation of generated code
 */
function adjustIndentation(code: string, targetIndent: number): string {
  const lines = code.split('\n')
  const indent = ' '.repeat(targetIndent)

  // Find minimum indentation in the code
  let minIndent = Infinity
  for (const line of lines) {
    if (line.trim()) {
      const lineIndent = line.match(/^(\s*)/)?.[1].length ?? 0
      minIndent = Math.min(minIndent, lineIndent)
    }
  }
  if (minIndent === Infinity) minIndent = 0

  // Adjust all lines
  return lines.map(line => {
    if (!line.trim()) return line
    const currentIndent = line.match(/^(\s*)/)?.[1].length ?? 0
    const relativeIndent = currentIndent - minIndent
    return indent + ' '.repeat(relativeIndent) + line.trim()
  }).join('\n')
}

// Re-export context types
export { type GenerationContext, type CursorContext } from './ai-context'
