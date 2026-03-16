/**
 * Comparison: Direct Mirror vs React-to-Mirror
 *
 * Same prompt → two different generation approaches
 */

import * as dotenv from 'dotenv'
import * as path from 'path'
import OpenAI from 'openai'
import { convertToMirrorCode } from '../src/converters/react-to-mirror'
import { validateReactCode, REACT_GUIDELINES } from '../src/converters/react-validator'
import { parse } from '../src/index'

// Load env
dotenv.config()
dotenv.config({ path: path.join(process.cwd(), 'archive/v1-react-app/.env.local') })

const API_KEY = process.env.OPENROUTER_API_KEY || process.env.VITE_OPENROUTER_API_KEY
const MODEL = 'anthropic/claude-sonnet-4'

const openai = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: API_KEY,
})

// ============================================================================
// Mirror Direct System Prompt
// ============================================================================

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

## Regeln
- IMMER Tokens für Farben definieren
- Komponenten mit : definieren, Instanzen ohne
- States mit Einrückung: \`state hover\\n  bg $hover\`
- Generiere NUR Mirror-Code, keine Erklärungen
`

// ============================================================================
// React System Prompt
// ============================================================================

const REACT_SYSTEM_PROMPT = `Du bist ein UI-Entwickler, der React-Code für die Konvertierung zu Mirror DSL generiert.

${REACT_GUIDELINES}

WICHTIG:
- Generiere NUR den React-Code, keine Erklärungen
- Halte dich STRIKT an die Guidelines
- Alle Farben müssen im tokens-Objekt definiert sein
- Nutze semantische Token-Namen wie $bg.app, $bg.surface, $col.text, $primary
`

// ============================================================================
// Generation Functions
// ============================================================================

async function generateDirectMirror(prompt: string): Promise<{ code: string; valid: boolean; error?: string }> {
  const response = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      { role: 'system', content: MIRROR_SYSTEM_PROMPT },
      { role: 'user', content: prompt }
    ],
    temperature: 0.7,
  })

  let code = response.choices[0]?.message?.content || ''

  // Extract from markdown if present
  const codeMatch = code.match(/```(?:mirror)?\n([\s\S]*?)```/)
  if (codeMatch) {
    code = codeMatch[1].trim()
  }

  // Validate by trying to parse
  try {
    parse(code)
    return { code, valid: true }
  } catch (e) {
    return { code, valid: false, error: e instanceof Error ? e.message : String(e) }
  }
}

async function generateViaReact(prompt: string): Promise<{ code: string; reactCode: string; valid: boolean; error?: string }> {
  const response = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      { role: 'system', content: REACT_SYSTEM_PROMPT },
      { role: 'user', content: prompt }
    ],
    temperature: 0.7,
  })

  let reactCode = response.choices[0]?.message?.content || ''

  // Extract from markdown if present
  const codeMatch = reactCode.match(/```(?:jsx|tsx|javascript|typescript)?\n([\s\S]*?)```/)
  if (codeMatch) {
    reactCode = codeMatch[1].trim()
  }

  // Validate React
  const validation = validateReactCode(reactCode)
  if (!validation.valid) {
    return {
      code: '',
      reactCode,
      valid: false,
      error: validation.errors.map(e => e.message).join(', ')
    }
  }

  // Convert to Mirror
  const mirrorCode = convertToMirrorCode(reactCode)

  // Validate Mirror
  try {
    parse(mirrorCode)
    return { code: mirrorCode, reactCode, valid: true }
  } catch (e) {
    return { code: mirrorCode, reactCode, valid: false, error: e instanceof Error ? e.message : String(e) }
  }
}

// ============================================================================
// Comparison
// ============================================================================

interface ComparisonResult {
  prompt: string
  direct: {
    code: string
    valid: boolean
    error?: string
    tokens: number
    components: number
    lines: number
  }
  react: {
    code: string
    reactCode: string
    valid: boolean
    error?: string
    tokens: number
    components: number
    lines: number
  }
}

function countMetrics(code: string): { tokens: number; components: number; lines: number } {
  const lines = code.split('\n').filter(l => l.trim() && !l.trim().startsWith('//')).length
  const tokenMatches = code.match(/^\$[\w.]+:/gm) || []
  const componentMatches = code.match(/^[A-Z]\w+:/gm) || []

  return {
    tokens: tokenMatches.length,
    components: componentMatches.length,
    lines
  }
}

async function compare(prompt: string): Promise<ComparisonResult> {
  console.log('\n🔄 Generiere: "' + prompt.substring(0, 50) + '..."')

  const [directResult, reactResult] = await Promise.all([
    generateDirectMirror(prompt),
    generateViaReact(prompt)
  ])

  const directMetrics = countMetrics(directResult.code)
  const reactMetrics = countMetrics(reactResult.code)

  return {
    prompt,
    direct: {
      ...directResult,
      ...directMetrics
    },
    react: {
      ...reactResult,
      ...reactMetrics
    }
  }
}

// ============================================================================
// Main
// ============================================================================

const TEST_PROMPTS = [
  "Ein Button mit Hover-Effekt in blau",
  "Eine Card mit Titel, Beschreibung und einem Tag. Dunkles Theme.",
  "Ein Sidebar-Layout mit 3 Navigations-Items die bei Hover hervorgehoben werden",
  "Ein Login-Formular mit Email, Passwort und Submit-Button",
]

async function main() {
  if (!API_KEY) {
    console.error('❌ API Key nicht gefunden')
    process.exit(1)
  }

  console.log('=' .repeat(70))
  console.log('VERGLEICH: Direct Mirror vs React-to-Mirror')
  console.log('=' .repeat(70))

  const results: ComparisonResult[] = []

  for (const prompt of TEST_PROMPTS) {
    const result = await compare(prompt)
    results.push(result)
  }

  // Summary
  console.log('\n' + '=' .repeat(70))
  console.log('ZUSAMMENFASSUNG')
  console.log('=' .repeat(70))

  console.log('\n| Prompt | Direct | React→Mirror |')
  console.log('|--------|--------|--------------|')

  for (const r of results) {
    const directStatus = r.direct.valid ? '✅' : '❌'
    const reactStatus = r.react.valid ? '✅' : '❌'
    const shortPrompt = r.prompt.substring(0, 30) + '...'
    console.log('| ' + shortPrompt + ' | ' + directStatus + ' ' + r.direct.tokens + 't/' + r.direct.components + 'c/' + r.direct.lines + 'l | ' + reactStatus + ' ' + r.react.tokens + 't/' + r.react.components + 'c/' + r.react.lines + 'l |')
  }

  // Detailed output
  console.log('\n' + '=' .repeat(70))
  console.log('DETAILLIERTER VERGLEICH')
  console.log('=' .repeat(70))

  for (const r of results) {
    console.log('\n' + '─'.repeat(70))
    console.log('PROMPT: ' + r.prompt)
    console.log('─'.repeat(70))

    console.log('\n--- DIRECT MIRROR ---')
    console.log('Status: ' + (r.direct.valid ? '✅ Valid' : '❌ Invalid: ' + r.direct.error))
    console.log('Tokens: ' + r.direct.tokens + ', Components: ' + r.direct.components + ', Lines: ' + r.direct.lines)
    console.log('')
    console.log(r.direct.code)

    console.log('\n--- REACT → MIRROR ---')
    console.log('Status: ' + (r.react.valid ? '✅ Valid' : '❌ Invalid: ' + r.react.error))
    console.log('Tokens: ' + r.react.tokens + ', Components: ' + r.react.components + ', Lines: ' + r.react.lines)
    console.log('')
    console.log(r.react.code)
  }
}

main().catch(console.error)
