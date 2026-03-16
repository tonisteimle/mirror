/**
 * Test Error Fix Loop
 *
 * Manually tests the error correction by injecting broken code.
 */

import { parse } from '../src/index'

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY

if (!OPENROUTER_API_KEY) {
  console.error('Missing OPENROUTER_API_KEY')
  process.exit(1)
}

// Intentionally broken Mirror code (missing colons after as/extends)
const BROKEN_CODE = `
// Tokens
$bg.app: #09090B
$bg.surface: #18181B
$col.text: #E4E4E7

// Missing colon after "as" - ERROR
Card as frame
  Title:
  Body:

// Missing colon after "extends" - ERROR
DangerButton extends Button
  bg #EF4444

// Another error
GhostButton as Button

// Valid component for reference
ValidComponent: pad 16, bg $bg.surface

// App
App hor, w full, h full, bg $bg.app
  Sidebar w 240
    Heading "Navigation"
  Main w full
    Card
      Title "Welcome"
`

const FIX_PROMPT = `Der folgende Mirror-Code hat Syntax-Fehler. Korrigiere sie.

MIRROR SYNTAX-REGELN:
- Tokens: $name: value (mit $ Prefix!)
- Komponente definieren: Name: properties (mit Doppelpunkt)
- Properties: name value (KEIN = Zeichen, KEINE Klammern)
- Keine HTML-Tags, keine JSX-Syntax

FEHLER:
{errors}

CODE:
\`\`\`mirror
{code}
\`\`\`

Gib NUR korrigierten Mirror-Code zurück.`

async function callLLM(prompt: string): Promise<string> {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://mirror-studio.local',
    },
    body: JSON.stringify({
      model: 'anthropic/claude-sonnet-4.6',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
      max_tokens: 4000
    })
  })

  const data = await response.json()
  if (data.error) throw new Error(data.error.message)
  return data.choices[0].message.content
}

function extractCode(output: string): string {
  const match = output.match(/```(?:mirror)?\s*\n?([\s\S]*?)```/)
  return match ? match[1].trim() : output.trim()
}

async function main() {
  console.log('=' .repeat(70))
  console.log('TEST: Error Fix Loop')
  console.log('=' .repeat(70))

  // Step 1: Parse broken code
  console.log('\n[1] Parsing broken code...')
  let ast = parse(BROKEN_CODE)
  console.log(`Found ${ast.errors.length} errors:`)
  for (const e of ast.errors.slice(0, 10)) {
    console.log(`  Line ${e.line}: ${e.message}`)
  }
  if (ast.errors.length > 10) {
    console.log(`  ... and ${ast.errors.length - 10} more`)
  }

  let code = BROKEN_CODE
  let attempts = 0
  const maxAttempts = 3

  while (ast.errors.length > 0 && attempts < maxAttempts) {
    attempts++
    console.log(`\n[${attempts + 1}] Asking LLM to fix errors...`)

    const errorList = ast.errors
      .slice(0, 10)
      .map(e => `Line ${e.line}: ${e.message}`)
      .join('\n')

    const prompt = FIX_PROMPT
      .replace('{errors}', errorList)
      .replace('{code}', code)

    const response = await callLLM(prompt)
    code = extractCode(response)

    console.log('\n--- LLM Response (first 500 chars) ---')
    console.log(code.slice(0, 500))
    console.log('...\n')

    ast = parse(code)
    console.log(`After fix: ${ast.errors.length} errors remaining`)

    if (ast.errors.length > 0) {
      for (const e of ast.errors.slice(0, 5)) {
        console.log(`  Line ${e.line}: ${e.message}`)
      }
    }
  }

  console.log('\n' + '=' .repeat(70))
  console.log('RESULT')
  console.log('=' .repeat(70))

  if (ast.errors.length === 0) {
    console.log(`\nSUCCESS: Fixed all errors in ${attempts} attempt(s)`)
  } else {
    console.log(`\nFAILED: ${ast.errors.length} errors remaining after ${attempts} attempts`)
  }

  console.log('\n--- Final Code ---')
  console.log(code)

  console.log('\n--- Statistics ---')
  console.log(`Tokens: ${ast.tokens.length}`)
  console.log(`Components: ${ast.components.length}`)
  console.log(`Instances: ${ast.instances.length}`)
  console.log(`Errors: ${ast.errors.length}`)
}

main().catch(console.error)
