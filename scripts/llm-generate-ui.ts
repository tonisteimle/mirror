/**
 * LLM UI Generation with Validation Loop
 *
 * Workflow:
 * 1. User describes UI
 * 2. LLM generates React code (following guidelines)
 * 3. Validator checks the code
 * 4. If errors → send back to LLM for correction
 * 5. Repeat until valid or max iterations
 * 6. Convert valid React to Mirror
 */

import * as dotenv from 'dotenv'
import * as path from 'path'
import OpenAI from 'openai'

// Load .env files
dotenv.config()
dotenv.config({ path: path.join(process.cwd(), '.env.local') })
dotenv.config({ path: path.join(process.cwd(), 'archive/v1-react-app/.env.local') })
import {
  validateReactCode,
  formatValidationErrors,
  REACT_GUIDELINES
} from '../src/converters/react-validator'
import { convertToMirrorCode } from '../src/converters/react-to-mirror'

// ============================================================================
// Configuration
// ============================================================================

const MAX_CORRECTION_ATTEMPTS = 3
const MODEL = 'anthropic/claude-sonnet-4'

const API_KEY = process.env.OPENROUTER_API_KEY || process.env.VITE_OPENROUTER_API_KEY

const openai = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: API_KEY,
})

// ============================================================================
// System Prompt
// ============================================================================

const SYSTEM_PROMPT = `Du bist ein UI-Entwickler, der React-Code für die Konvertierung zu Mirror DSL generiert.

${REACT_GUIDELINES}

WICHTIG:
- Generiere NUR den React-Code, keine Erklärungen
- Halte dich STRIKT an die Guidelines
- Alle Farben müssen im tokens-Objekt definiert sein
- Nutze semantische Token-Namen wie $bg.app, $bg.surface, $col.text, $primary
- Komponenten müssen wiederverwendbar sein mit { children, style, ...props }
- Für Hover-Effekte nutze useState mit onMouseEnter/onMouseLeave
`

// ============================================================================
// Types
// ============================================================================

interface GenerationResult {
  success: boolean
  reactCode?: string
  mirrorCode?: string
  attempts: number
  errors?: string
}

// ============================================================================
// Main Functions
// ============================================================================

async function generateReactCode(prompt: string): Promise<string> {
  const response = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: prompt }
    ],
    temperature: 0.7,
  })

  const content = response.choices[0]?.message?.content || ''

  // Extract code from markdown if present
  const codeMatch = content.match(/```(?:jsx|tsx|javascript|typescript)?\n([\s\S]*?)```/)
  if (codeMatch) {
    return codeMatch[1].trim()
  }

  return content.trim()
}

async function correctReactCode(
  originalPrompt: string,
  code: string,
  errors: string
): Promise<string> {
  const correctionPrompt = `Der folgende React-Code hat Validierungsfehler.

ORIGINAL-ANFRAGE:
${originalPrompt}

AKTUELLER CODE:
\`\`\`jsx
${code}
\`\`\`

VALIDIERUNGSFEHLER:
${errors}

Bitte korrigiere den Code und gib NUR den korrigierten Code zurück.
Halte dich an die React Guidelines für Mirror-Konvertierung.`

  const response = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: correctionPrompt }
    ],
    temperature: 0.3, // Lower temperature for corrections
  })

  const content = response.choices[0]?.message?.content || ''

  // Extract code from markdown if present
  const codeMatch = content.match(/```(?:jsx|tsx|javascript|typescript)?\n([\s\S]*?)```/)
  if (codeMatch) {
    return codeMatch[1].trim()
  }

  return content.trim()
}

async function generateValidatedUI(prompt: string): Promise<GenerationResult> {
  console.log('🚀 Generiere UI...')
  console.log(`   Prompt: "${prompt.substring(0, 50)}..."`)
  console.log('')

  let code = await generateReactCode(prompt)
  let attempts = 1

  console.log(`📝 Versuch ${attempts}: Code generiert (${code.length} Zeichen)`)

  // Validation loop
  while (attempts <= MAX_CORRECTION_ATTEMPTS) {
    const validation = validateReactCode(code)

    if (validation.valid) {
      console.log(`✅ Validierung erfolgreich!`)

      if (validation.warnings.length > 0) {
        console.log(`⚠️  ${validation.warnings.length} Warnungen (werden ignoriert)`)
      }

      // Convert to Mirror
      const mirrorCode = convertToMirrorCode(code)

      return {
        success: true,
        reactCode: code,
        mirrorCode,
        attempts
      }
    }

    console.log(`❌ Validierung fehlgeschlagen: ${validation.errors.length} Fehler`)

    if (attempts >= MAX_CORRECTION_ATTEMPTS) {
      console.log(`⛔ Maximale Versuche erreicht`)
      return {
        success: false,
        reactCode: code,
        attempts,
        errors: formatValidationErrors(validation)
      }
    }

    // Send errors back to LLM for correction
    const errorText = formatValidationErrors(validation)
    console.log(`🔄 Sende Fehler zur Korrektur...`)

    code = await correctReactCode(prompt, code, errorText)
    attempts++

    console.log(`📝 Versuch ${attempts}: Korrigierter Code (${code.length} Zeichen)`)
  }

  return {
    success: false,
    reactCode: code,
    attempts,
    errors: 'Maximale Korrekturversuche erreicht'
  }
}

// ============================================================================
// CLI
// ============================================================================

async function main() {
  const prompt = process.argv[2]

  if (!prompt) {
    console.log('Usage: npx tsx scripts/llm-generate-ui.ts "Beschreibe das UI"')
    console.log('')
    console.log('Beispiele:')
    console.log('  npx tsx scripts/llm-generate-ui.ts "Eine Task-Liste mit Sidebar"')
    console.log('  npx tsx scripts/llm-generate-ui.ts "Ein Dashboard mit Header und Cards"')
    console.log('  npx tsx scripts/llm-generate-ui.ts "Ein Dropdown-Menü mit Hover-Effekten"')
    process.exit(1)
  }

  if (!API_KEY) {
    console.error('❌ OPENROUTER_API_KEY oder VITE_OPENROUTER_API_KEY nicht gesetzt')
    console.error('   Erstelle eine .env.local Datei mit: OPENROUTER_API_KEY=sk-or-...')
    process.exit(1)
  }

  console.log('=' .repeat(70))
  console.log('LLM UI GENERATION')
  console.log('=' .repeat(70))
  console.log('')

  try {
    const result = await generateValidatedUI(prompt)

    console.log('')
    console.log('=' .repeat(70))

    if (result.success) {
      console.log('ERGEBNIS: ✅ Erfolgreich')
      console.log(`Versuche: ${result.attempts}`)
      console.log('=' .repeat(70))

      console.log('')
      console.log('--- REACT CODE ---')
      console.log(result.reactCode)

      console.log('')
      console.log('--- MIRROR CODE ---')
      console.log(result.mirrorCode)
    } else {
      console.log('ERGEBNIS: ❌ Fehlgeschlagen')
      console.log(`Versuche: ${result.attempts}`)
      console.log('=' .repeat(70))

      console.log('')
      console.log('--- LETZTER CODE ---')
      console.log(result.reactCode?.substring(0, 500) + '...')

      console.log('')
      console.log('--- FEHLER ---')
      console.log(result.errors)
    }
  } catch (error) {
    console.error('❌ Fehler:', error instanceof Error ? error.message : String(error))
    process.exit(1)
  }
}

main()
