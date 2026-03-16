/**
 * Validated Mirror Generation
 *
 * Generates Mirror code with automatic error correction.
 * Loop: generate → validate → fix → validate until error-free.
 */

import { parse } from '../src/index'
import type { ParseError } from '../src/parser/ast'

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY

if (!OPENROUTER_API_KEY) {
  console.error('Missing OPENROUTER_API_KEY')
  process.exit(1)
}

// ============================================================================
// MIRROR SYSTEM PROMPT
// ============================================================================

const MIRROR_SYSTEM_PROMPT = `Du schreibst UI-Code in Mirror DSL. Antworte NUR mit validem Mirror-Code.

SYNTAX-REGELN:
- Tokens: $name: value (z.B. $primary: #3B82F6)
- Komponente definieren: Name: properties (mit Doppelpunkt)
- Komponente verwenden: Name "content" (ohne Doppelpunkt)
- Kinder: eingerückt (2 Spaces)
- Properties: name value, name2 value2 (Komma-getrennt)
- States: hover bg #color oder state selected bg #color

LAYOUT:
- hor = horizontal, ver = vertical (default)
- gap N, pad N, w N, h N, bg #color, col #color, rad N
- w full = 100%, h full = 100%

BEISPIEL:
\`\`\`mirror
// Tokens
$bg.app: #09090B
$bg.surface: #18181B
$bg.card: #27272A
$col.text: #E4E4E7
$col.muted: #71717A
$primary: #3B82F6

// Komponenten
Heading: col $col.text, weight bold, font-size 18
Body: col $col.text, font-size 13
Muted: col $col.muted, font-size 12

Card: pad 16, bg $bg.card, rad 8, gap 12

Button: pad 8 16, bg $primary, col white, rad 6, cursor pointer
  hover bg #2563EB

// App
App hor, w full, h full, bg $bg.app

  Sidebar w 240, h full, bg $bg.surface, pad 16, gap 12
    Heading "Navigation"
    NavItem "Home"
    NavItem "Settings"

  Main w full, pad 24, gap 16
    Heading "Dashboard"
    Card
      Body "Willkommen"
\`\`\`

WICHTIG:
- Keine JavaScript-Syntax (kein {}, kein =>)
- Keine HTML-Tags
- Einrückung = Kinder-Beziehung
- Tokens beginnen mit $
- Nur Mirror-Code, keine Erklärungen`

const FIX_PROMPT_TEMPLATE = `Der folgende Mirror-Code hat Syntax-Fehler:

FEHLER:
{errors}

CODE:
\`\`\`mirror
{code}
\`\`\`

Korrigiere die Fehler und gib NUR den korrigierten Mirror-Code zurück.
Keine Erklärungen, nur Code.`

// ============================================================================
// LLM Call
// ============================================================================

const MODEL = process.env.MODEL || 'anthropic/claude-sonnet-4.6'

async function callLLM(systemPrompt: string, userPrompt: string): Promise<string> {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://mirror-studio.local',
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.3,
      max_tokens: 8000
    })
  })

  const data = await response.json()
  if (data.error) throw new Error(data.error.message)
  return data.choices[0].message.content
}

// ============================================================================
// Code Extraction
// ============================================================================

function extractMirrorCode(output: string): string {
  // Try to extract from code block
  const match = output.match(/```(?:mirror)?\s*\n?([\s\S]*?)```/)
  if (match) {
    return match[1].trim()
  }
  // Otherwise use the whole output
  return output.trim()
}

// ============================================================================
// Error Formatting
// ============================================================================

function formatErrors(errors: ParseError[]): string {
  return errors.map(e => {
    let msg = `Zeile ${e.line}, Spalte ${e.column}: ${e.message}`
    if (e.hint) msg += ` (Hinweis: ${e.hint})`
    return msg
  }).join('\n')
}

// ============================================================================
// Validated Generation
// ============================================================================

interface GenerationResult {
  code: string
  attempts: number
  success: boolean
  errors?: ParseError[]
}

async function generateValidMirror(
  userPrompt: string,
  maxAttempts: number = 3
): Promise<GenerationResult> {
  console.log('\n[1] Generiere initialen Code...')

  let rawOutput = await callLLM(MIRROR_SYSTEM_PROMPT, userPrompt)
  let code = extractMirrorCode(rawOutput)

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    console.log(`\n[${attempt}] Validiere...`)

    const ast = parse(code)

    if (ast.errors.length === 0) {
      console.log(`[${attempt}] Keine Fehler gefunden!`)
      return {
        code,
        attempts: attempt,
        success: true
      }
    }

    console.log(`[${attempt}] ${ast.errors.length} Fehler gefunden:`)
    for (const error of ast.errors) {
      console.log(`  - Zeile ${error.line}: ${error.message}`)
    }

    if (attempt < maxAttempts) {
      console.log(`\n[${attempt + 1}] Korrigiere Fehler...`)

      const fixPrompt = FIX_PROMPT_TEMPLATE
        .replace('{errors}', formatErrors(ast.errors))
        .replace('{code}', code)

      rawOutput = await callLLM(MIRROR_SYSTEM_PROMPT, fixPrompt)
      code = extractMirrorCode(rawOutput)
    } else {
      return {
        code,
        attempts: attempt,
        success: false,
        errors: ast.errors
      }
    }
  }

  // Should not reach here
  return {
    code,
    attempts: maxAttempts,
    success: false
  }
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  const userPrompt = process.argv[2] ||
    'Erstelle eine Master-Detail Aufgabenverwaltung im Darkmodus mit flächigem, zurückhaltendem Design. Links eine Liste von Aufgaben, rechts die Details.'

  console.log('=' .repeat(70))
  console.log('VALIDATED MIRROR GENERATION')
  console.log('=' .repeat(70))
  console.log(`\nModel: ${MODEL}`)
  console.log(`Prompt: "${userPrompt.slice(0, 80)}..."`)

  const startTime = Date.now()
  const result = await generateValidMirror(userPrompt)
  const duration = ((Date.now() - startTime) / 1000).toFixed(1)

  console.log('\n' + '=' .repeat(70))
  console.log('ERGEBNIS')
  console.log('=' .repeat(70))

  if (result.success) {
    console.log(`\nErfolg nach ${result.attempts} Versuch(en) (${duration}s)`)
  } else {
    console.log(`\nFehlgeschlagen nach ${result.attempts} Versuchen (${duration}s)`)
    if (result.errors) {
      console.log('\nVerbleibende Fehler:')
      for (const error of result.errors) {
        console.log(`  - Zeile ${error.line}: ${error.message}`)
      }
    }
  }

  console.log('\n--- GENERIERTER CODE ---')
  console.log(result.code)

  // Validate final output
  const finalAst = parse(result.code)
  console.log('\n--- STATISTIKEN ---')
  console.log(`Tokens: ${finalAst.tokens.length}`)
  console.log(`Komponenten: ${finalAst.components.length}`)
  console.log(`Instanzen: ${finalAst.instances.length}`)
  console.log(`Fehler: ${finalAst.errors.length}`)
}

main().catch(console.error)
