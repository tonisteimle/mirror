/**
 * Mirror Code Generation CLI
 *
 * Usage: npx tsx scripts/generate-mirror.ts "Beschreibe das UI"
 */

import * as dotenv from 'dotenv'
import * as path from 'path'
import OpenAI from 'openai'
import { parse } from '../src/index'
import { MIRROR_SYSTEM_PROMPT } from '../src/llm/mirror-system-prompt'

// Load env
dotenv.config()
dotenv.config({ path: path.join(process.cwd(), 'archive/v1-react-app/.env.local') })

const API_KEY = process.env.OPENROUTER_API_KEY || process.env.VITE_OPENROUTER_API_KEY
const MODEL = process.env.LLM_MODEL || 'anthropic/claude-sonnet-4'

const openai = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: API_KEY,
})

interface GenerationResult {
  success: boolean
  code: string
  error?: string
}

async function generateMirrorCode(prompt: string): Promise<GenerationResult> {
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

  // Validate by parsing
  try {
    parse(code)
    return { success: true, code }
  } catch (e) {
    return {
      success: false,
      code,
      error: e instanceof Error ? e.message : String(e)
    }
  }
}

async function main() {
  const prompt = process.argv[2]

  if (!prompt) {
    console.log('Usage: npx tsx scripts/generate-mirror.ts "Beschreibe das UI"')
    console.log('')
    console.log('Examples:')
    console.log('  npx tsx scripts/generate-mirror.ts "Ein Button mit Hover-Effekt"')
    console.log('  npx tsx scripts/generate-mirror.ts "Eine Sidebar mit Navigation"')
    console.log('  npx tsx scripts/generate-mirror.ts "Ein Login-Formular"')
    process.exit(1)
  }

  if (!API_KEY) {
    console.error('Error: OPENROUTER_API_KEY not set')
    console.error('Create a .env file with: OPENROUTER_API_KEY=sk-or-...')
    process.exit(1)
  }

  console.log('Generating Mirror code...')
  console.log('Prompt:', prompt)
  console.log('')

  try {
    const result = await generateMirrorCode(prompt)

    if (result.success) {
      console.log('✅ Valid Mirror Code:')
      console.log('')
      console.log(result.code)
    } else {
      console.log('❌ Invalid Code (parse error):')
      console.log(result.error)
      console.log('')
      console.log('Generated code:')
      console.log(result.code)
    }
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : String(error))
    process.exit(1)
  }
}

main()
