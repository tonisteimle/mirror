import { API, STORAGE_KEYS } from '../constants'

// API key management
// Uses sessionStorage for security - key clears when browser tab closes
// This prevents API key from persisting if device is shared
let OPENROUTER_API_KEY = ''

// Load API key: 1. sessionStorage, 2. env variable (for testing)
try {
  const stored = sessionStorage.getItem(STORAGE_KEYS.API_KEY)
  if (stored) {
    OPENROUTER_API_KEY = stored
  } else if (import.meta.env.VITE_OPENROUTER_API_KEY) {
    // Fallback to env variable for testing phase
    OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY
  }
} catch {
  // sessionStorage not available (SSR, etc.)
  if (import.meta.env.VITE_OPENROUTER_API_KEY) {
    OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY
  }
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
    // sessionStorage not available
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
    // sessionStorage not available
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

## Quick Reference
LAYOUT      horizontal vertical gap between wrap grid stacked
ALIGN       horizontal-left horizontal-center horizontal-right vertical-top vertical-center vertical-bottom center
SPACING     padding margin (+ left right top bottom left-right top-bottom)
SIZE        width height min-width max-width min-height max-height full grow shrink
COLOR       color #hex (text) background #hex (background) border-color #hex (border)
BORDER      border 1, border 1 #333, radius 8
TYPE        size weight line font align italic underline truncate
VISUAL      opacity shadow cursor z hidden disabled
HOVER       hover-background hover-color hover-scale hover-opacity

DEFINE      Name: props
INHERIT     Name from Parent: props
PRIMITIVE   Input EmailField: "placeholder" type email  (creates named input)
            Input PasswordField: "password" type password
NAMED       - Component named Name props "text"

STATE       state hover/focus/active/disabled or custom states
EVENTS      onclick onchange oninput onfocus onblur
ACTIONS     toggle | show X | hide X | open X | close | page X | assign $var to expr
CONDITION   if $x then prop val else prop val
ITERATOR    each $item in $list

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

## Output Rules
1. NUR Mirror Code - keine Erklärungen
2. Dunkles Farbschema: #1E1E2E, #1A1A1A, Akzent #3B82F6
3. Hover-States für interaktive Elemente
4. Named instances für Event-Targeting`

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

  const data = await response.json() as { choices: Array<{ message?: { content?: string } }> }
  let content = data.choices[0]?.message?.content || ''

  // Remove markdown code blocks if present
  content = content.replace(/```(?:mirror|dsl)?\s*/gi, '').replace(/```\s*/g, '')
  content = content.trim()

  return { code: content }
}

/**
 * @deprecated Use generateWithCodeIntelligence instead for context-aware generation
 */
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

// =============================================================================
// Self-Healing Generation (validates and auto-corrects)
// =============================================================================

import { withSelfHealing, validateMirrorCode, type SelfHealingResult, type PromptLanguage } from './ai-selfhealing'

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
 * re-prompted with correction instructions.
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
  const { maxAttempts = 2, includeWarnings = false, language = 'de', onProgress } = options

  // Wrapper that reports progress
  const generateWithProgress = async (prompt: string) => {
    // Detect if this is a correction prompt (works for both DE and EN)
    const isCorrection = prompt.includes('FEHLER:') || prompt.includes('ERRORS:')
    if (onProgress) {
      onProgress(isCorrection ? 'correcting' : 'generating', 1)
    }
    const result = await generateMirrorCode(prompt)
    if (onProgress) {
      onProgress('validating', 1)
    }
    return result
  }

  return withSelfHealing(generateWithProgress, userPrompt, {
    maxAttempts,
    includeWarnings,
    language
  })
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
export { validateMirrorCode, isValidMirrorCode, getIssueSummary } from './ai-selfhealing'
export type { SelfHealingResult, ValidationFeedback, CodeIssue, PromptLanguage } from './ai-selfhealing'

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

// =============================================================================
// Intent-based Generation (NEW: LLM arbeitet mit JSON, nicht Mirror-Syntax)
// =============================================================================

import { mirrorToIntent } from '../intent/mirror-to-intent'
import { intentToMirror } from '../intent/intent-to-mirror'
import { INTENT_SYSTEM_PROMPT, buildUserPrompt, parseIntentResponse } from '../intent/llm-prompt'
import type { Intent } from '../intent/schema'

export interface IntentGenerationOptions {
  layoutCode: string
  componentsCode?: string
  tokensCode?: string
}

export interface IntentGenerationResult {
  success: boolean
  layoutCode?: string
  componentsCode?: string
  tokensCode?: string
  error?: string
  // Debug info
  inputIntent?: Intent
  outputIntent?: Intent
}

/**
 * Generate Mirror code using Intent-based approach.
 *
 * Unlike direct generation, this:
 * 1. Converts current code to structured JSON (Intent)
 * 2. LLM modifies JSON (no Mirror syntax knowledge needed)
 * 3. Converts back to clean, token-based Mirror code
 *
 * Benefits:
 * - LLM doesn't need to learn Mirror syntax
 * - Output is always syntactically correct
 * - Tokens and components are automatically used
 * - Design consistency is guaranteed
 */
export async function generateWithIntent(
  userPrompt: string,
  options: IntentGenerationOptions
): Promise<IntentGenerationResult> {
  if (!hasApiKey()) {
    return {
      success: false,
      error: 'Kein API Key gesetzt. Bitte OpenRouter API Key in den Einstellungen eingeben.',
    }
  }

  try {
    // 1. Convert current code to Intent
    const currentIntent = mirrorToIntent(
      options.layoutCode,
      options.componentsCode || '',
      options.tokensCode || ''
    )

    // 2. Build prompts
    const systemPrompt = INTENT_SYSTEM_PROMPT
    const userPromptWithContext = buildUserPrompt(currentIntent, userPrompt)

    // 3. Call OpenRouter
    const response = await fetchWithTimeout(API.ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'http://localhost:5173',
        'X-Title': 'Mirror Intent',
      },
      body: JSON.stringify({
        model: API.MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPromptWithContext }
        ],
        max_tokens: API.MAX_TOKENS,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => '')
      return {
        success: false,
        error: `API Error: ${response.status}${errorText ? ` - ${errorText}` : ''}`,
        inputIntent: currentIntent,
      }
    }

    const data = await response.json() as { choices: Array<{ message?: { content?: string } }> }
    const content = data.choices[0]?.message?.content || ''

    // 4. Parse response
    const newIntent = parseIntentResponse(content)
    if (!newIntent) {
      return {
        success: false,
        error: 'LLM-Antwort konnte nicht als Intent-JSON geparst werden',
        inputIntent: currentIntent,
      }
    }

    // 5. Convert back to Mirror code (split into sections)
    const tokensCode = generateTokensCode(newIntent)
    const componentsCode = generateComponentsCode(newIntent)
    const layoutCode = generateLayoutCode(newIntent)

    return {
      success: true,
      layoutCode,
      componentsCode,
      tokensCode,
      inputIntent: currentIntent,
      outputIntent: newIntent,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unbekannter Fehler',
    }
  }
}

// Helper: Generate tokens section
function generateTokensCode(intent: Intent): string {
  const lines: string[] = []
  const { colors, spacing, radii, sizes } = intent.tokens

  if (colors) {
    for (const [name, value] of Object.entries(colors)) {
      lines.push(`$${name}: ${value}`)
    }
  }
  if (spacing) {
    for (const [name, value] of Object.entries(spacing)) {
      lines.push(`$${name}: ${value}`)
    }
  }
  if (radii) {
    for (const [name, value] of Object.entries(radii)) {
      lines.push(`$${name}: ${value}`)
    }
  }
  if (sizes) {
    for (const [name, value] of Object.entries(sizes)) {
      lines.push(`$${name}: ${value}`)
    }
  }

  return lines.join('\n')
}

// Helper: Generate components section
function generateComponentsCode(intent: Intent): string {
  const componentsOnlyIntent: Intent = {
    tokens: { colors: {}, spacing: {}, radii: {}, sizes: {} },
    components: intent.components,
    layout: [],
  }
  return intentToMirror(componentsOnlyIntent).trim()
}

// Helper: Generate layout section
function generateLayoutCode(intent: Intent): string {
  const layoutOnlyIntent: Intent = {
    tokens: { colors: {}, spacing: {}, radii: {}, sizes: {} },
    components: [],
    layout: intent.layout,
  }
  return intentToMirror(layoutOnlyIntent).trim()
}
