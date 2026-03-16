/**
 * Test: Navigation Component Prompt
 */

import * as dotenv from 'dotenv'
import * as path from 'path'
import OpenAI from 'openai'
import { convertToMirrorCode } from '../src/converters/react-to-mirror'
import { validateReactCode, REACT_GUIDELINES } from '../src/converters/react-validator'
import { parse } from '../src/index'

dotenv.config()
dotenv.config({ path: path.join(process.cwd(), 'archive/v1-react-app/.env.local') })

const API_KEY = process.env.OPENROUTER_API_KEY || process.env.VITE_OPENROUTER_API_KEY
const MODEL = 'anthropic/claude-sonnet-4'

const openai = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: API_KEY,
})

const MIRROR_SYSTEM_PROMPT = `Du bist ein UI-Designer, der Mirror DSL Code generiert.

## Mirror DSL Syntax

\`\`\`
// Tokens (Design Variables)
$bg.app: #09090B
$bg.surface: #18181B
$col.text: #E4E4E7
$primary: #3B82F6

// Component Definitions (mit Doppelpunkt)
ComponentName: property value, property value
  state hover
    bg $hover.bg
  onclick action target

// Instances (ohne Doppelpunkt)
App ver, w full, h full, bg $bg.app
  ComponentName "Text content"
    ChildComponent
\`\`\`

## Wichtige Properties
- Layout: \`hor\` (horizontal), \`ver\` (vertical), \`center\`, \`gap N\`
- Sizing: \`w N/full/hug\`, \`h N/full/hug\`, \`pad N\`, \`margin N\`
- Visual: \`bg $token\`, \`col $token\`, \`rad N\`, \`bor N #color\`
- Text: \`font-size N\`, \`weight bold/500\`, \`text-align center\`
- Interaction: \`cursor pointer\`, \`state hover\`, \`onclick action\`
- Icons: \`Icon "name"\` für Lucide Icons

## Regeln
- IMMER Tokens für Farben definieren
- Komponenten mit : definieren, Instanzen ohne
- States mit Einrückung: \`state hover\\n  bg $hover\`
- Generiere NUR Mirror-Code, keine Erklärungen
`

const REACT_SYSTEM_PROMPT = `Du bist ein UI-Entwickler, der React-Code für die Konvertierung zu Mirror DSL generiert.

${REACT_GUIDELINES}

WICHTIG:
- Generiere NUR den React-Code, keine Erklärungen
- Halte dich STRIKT an die Guidelines
- Alle Farben müssen im tokens-Objekt definiert sein
- Nutze semantische Token-Namen wie $bg.app, $bg.surface, $col.text, $primary
`

const PROMPT = "Erstelle mir eine Navigationskomponente mit Navigationsgruppen und Navigations-Items mit Icon und Text in einem zurückhaltenden Dark Style Ansatz."

async function main() {
  console.log('='.repeat(80))
  console.log('TEST: Navigation Component')
  console.log('='.repeat(80))
  console.log('\nPROMPT:', PROMPT)
  console.log('\n')

  // Direct Mirror
  console.log('─'.repeat(80))
  console.log('DIRECT MIRROR')
  console.log('─'.repeat(80))

  const directResponse = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      { role: 'system', content: MIRROR_SYSTEM_PROMPT },
      { role: 'user', content: PROMPT }
    ],
    temperature: 0.7,
  })

  let directCode = directResponse.choices[0]?.message?.content || ''
  const directMatch = directCode.match(/```(?:mirror)?\n([\s\S]*?)```/)
  if (directMatch) directCode = directMatch[1].trim()

  let directValid = false
  let directError = ''
  try {
    parse(directCode)
    directValid = true
  } catch (e) {
    directError = e instanceof Error ? e.message : String(e)
  }

  console.log('\nStatus:', directValid ? '✅ Valid' : '❌ Invalid: ' + directError)
  console.log('\n' + directCode)

  // React → Mirror
  console.log('\n' + '─'.repeat(80))
  console.log('REACT → MIRROR')
  console.log('─'.repeat(80))

  const reactResponse = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      { role: 'system', content: REACT_SYSTEM_PROMPT },
      { role: 'user', content: PROMPT }
    ],
    temperature: 0.7,
  })

  let reactCode = reactResponse.choices[0]?.message?.content || ''
  const reactMatch = reactCode.match(/```(?:jsx|tsx|javascript|typescript)?\n([\s\S]*?)```/)
  if (reactMatch) reactCode = reactMatch[1].trim()

  const validation = validateReactCode(reactCode)

  console.log('\nReact Validation:', validation.valid ? '✅ Valid' : '❌ Invalid')
  if (!validation.valid) {
    console.log('Errors:', validation.errors.map(e => e.message).join(', '))
  }

  console.log('\n--- REACT CODE ---')
  console.log(reactCode)

  if (validation.valid) {
    const mirrorCode = convertToMirrorCode(reactCode)

    let mirrorValid = false
    let mirrorError = ''
    try {
      parse(mirrorCode)
      mirrorValid = true
    } catch (e) {
      mirrorError = e instanceof Error ? e.message : String(e)
    }

    console.log('\n--- CONVERTED MIRROR CODE ---')
    console.log('Status:', mirrorValid ? '✅ Valid' : '❌ Invalid: ' + mirrorError)
    console.log('\n' + mirrorCode)
  }
}

main().catch(console.error)
