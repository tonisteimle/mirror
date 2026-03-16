/**
 * Test LLM Code Generation via OpenRouter
 *
 * Tests whether external LLMs can generate valid M() code
 * using our system prompt.
 */

import { M } from '../src/runtime/mirror-runtime'
import { buildContext, buildSystemPrompt } from '../src/runtime/llm-context'

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY

if (!OPENROUTER_API_KEY) {
  console.error('❌ OPENROUTER_API_KEY not set')
  console.log('Run: export OPENROUTER_API_KEY=your_key')
  process.exit(1)
}

// Example project context - simulates a real project with components and tokens
const EXAMPLE_PROJECT_SOURCE = `
// Design Tokens
$grey-950: #09090B
$grey-900: #18181B
$grey-800: #27272A
$grey-700: #3F3F46
$grey-500: #71717A
$grey-400: #A1A1AA

$primary.bg: #3B82F6
$primary.hover.bg: #2563EB
$primary.col: #3B82F6
$success.bg: #22C55E
$danger.bg: #EF4444

$app.bg: $grey-950
$surface.bg: $grey-900
$card.bg: $grey-800
$elevated.bg: $grey-700

$heading.col: #f0f0f5
$text.col: #e0e0e5
$muted.col: #a0a0aa
$hint.col: #888

$sm.pad: 4
$md.pad: 8
$lg.pad: 16
$xl.pad: 24

$sm.gap: 4
$md.gap: 8
$lg.gap: 16

$sm.rad: 4
$md.rad: 8
$lg.rad: 12

// Components
Card: bg $card.bg, pad $lg.pad, rad $md.rad, bor 1 $grey-700
  Title:
  Content:

Button: pad $md.pad $lg.pad, rad $sm.rad, cursor pointer
  state hover opacity 0.9

PrimaryButton as Button: bg $primary.bg, col white
  state hover bg $primary.hover.bg

SecondaryButton as Button: bg transparent, col $text.col, bor 1 $grey-700
  state hover bg $elevated.bg

DangerButton as Button: bg $danger.bg, col white

IconButton: center, w 36, h 36, rad $md.rad, cursor pointer
  state hover bg $elevated.bg

Input: pad $md.pad $lg.pad, bg $surface.bg, col $text.col, rad $sm.rad, bor 1 $grey-700
  Placeholder col $hint.col
  state focus bor 1 $primary.bg

Badge: pad $sm.pad $md.pad, rad 999, bg $primary.bg, col white, font-size 11

Avatar: center, rad 999, bg $primary.bg, col white, weight bold

NavItem: hor, gap $md.gap, pad $md.pad $lg.pad, rad $md.rad, cursor pointer, col $muted.col
  state hover bg $elevated.bg
  state active bg $primary.bg, col white

Toggle: w 44, h 24, rad 12, bg $grey-700, cursor pointer, pad 2
  Thumb w 20, h 20, rad 10, bg white, shadow sm
  state on bg $primary.bg
`

// Build context from project source
const projectContext = buildContext(EXAMPLE_PROJECT_SOURCE)

interface TestPrompt {
  name: string
  prompt: string
  useContext: boolean
}

const TEST_PROMPTS: TestPrompt[] = [
  {
    name: 'Profile Card (with tokens)',
    prompt: 'Create a user profile card using the Card component. Include an Avatar with initials, name, email, and a PrimaryButton "Follow". Use project tokens for colors and spacing.',
    useContext: true
  },
  {
    name: 'Dropdown (with components)',
    prompt: 'Create a dropdown using SecondaryButton as trigger showing "Select option" with chevron-down icon. Below it, a Card with 3 NavItem options (Profile, Settings, Logout with icons). Use project tokens.',
    useContext: true
  },
  {
    name: 'Settings Panel (with Toggle)',
    prompt: 'Create a settings panel using Card. Add 3 rows, each with: icon in IconButton, title/description Box, and Toggle component. Use tokens: $heading.col, $muted.col, $lg.gap. Include Notifications, Dark Mode, Auto-updates settings.',
    useContext: true
  },
  {
    name: 'Modal Dialog (with buttons)',
    prompt: 'Create a modal dialog: Card with header (title + IconButton with x icon), content area with warning message using $danger.bg for icon, footer with SecondaryButton "Cancel" and DangerButton "Delete". Use project tokens.',
    useContext: true
  },
  {
    name: 'Dashboard (full context)',
    prompt: 'Create a dashboard with: left sidebar (w:200, NavItems for Home/Settings/Users with icons, first one active), main area with "Overview" heading ($heading.col), and 3 Cards showing stats (Total Users: 12,456 etc). Use all available components and tokens.',
    useContext: true
  },
  {
    name: 'Simple Card (no context)',
    prompt: 'Create a user profile card with avatar (colored circle with initials), name, email, and a Follow button. Dark mode.',
    useContext: false
  }
]

async function callLLM(model: string, userPrompt: string, useContext: boolean = false): Promise<string> {
  // Use context-aware system prompt when requested
  const systemPrompt = useContext
    ? buildSystemPrompt(projectContext)
    : buildSystemPrompt() // Base prompt without context

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://mirror-lang.dev',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.3,
      max_tokens: 4000
    })
  })

  const data = await response.json()

  if (data.error) {
    throw new Error(data.error.message)
  }

  return data.choices[0].message.content
}

/**
 * Fix common LLM code errors before parsing
 */
function fixCodeErrors(code: string): string {
  // Fix tokens used as JS variables: $lg.gap → '$lg.gap'
  // Match $word.word patterns that are NOT already in quotes
  code = code.replace(/:\s*(\$[a-zA-Z0-9_-]+(?:\.[a-zA-Z0-9_-]+)*)/g, (match, token) => {
    // Check if already in quotes (look back for quote)
    return `: '${token}'`
  })

  // Fix template literal usage with tokens: `1px solid $grey-700` → '1px solid $grey-700'
  code = code.replace(/`([^`]*\$[^`]*)`/g, "'$1'")

  return code
}

function extractCode(response: string): string {
  let code: string

  // Extract code from markdown code blocks if present
  // Handle various formats: ```javascript, ```js, ```, or no blocks
  const codeBlockMatch = response.match(/```(?:javascript|js|jsx)?\s*\n?([\s\S]*?)```/)
  if (codeBlockMatch) {
    code = codeBlockMatch[1].trim()
  } else {
    // Also try without closing backticks (truncated output)
    const openBlockMatch = response.match(/```(?:javascript|js|jsx)?\s*\n?([\s\S]+)$/)
    if (openBlockMatch) {
      code = openBlockMatch[1].trim()
      // Try to balance braces
      const openBraces = (code.match(/\[/g) || []).length
      const closeBraces = (code.match(/\]/g) || []).length
      const openParens = (code.match(/\(/g) || []).length
      const closeParens = (code.match(/\)/g) || []).length

      // Add missing closing brackets
      for (let i = 0; i < openBraces - closeBraces; i++) code += ']'
      for (let i = 0; i < openParens - closeParens; i++) code += ')'
    } else {
      code = response.trim()
    }
  }

  // Fix common errors
  return fixCodeErrors(code)
}

interface ValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
  corrections: number
  correctionDetails: string[]
}

function validateAndRender(code: string): ValidationResult {
  try {
    // Try to evaluate the code
    const node = eval(code)

    // First correct, then validate
    const correctionResult = M.correct(node)
    const validationResult = M.validate(correctionResult.node)

    // Collect correction details
    const correctionDetails = correctionResult.corrections.map(c =>
      `${c.type}: ${c.original} → ${c.corrected}`
    )

    // Add correction warnings
    const allWarnings = [
      ...validationResult.warnings.map(w => `${w.path}: ${w.message}`),
      ...correctionResult.warnings
    ]

    return {
      valid: validationResult.valid,
      errors: validationResult.errors.map(e => `${e.path}: ${e.message}`),
      warnings: allWarnings,
      corrections: correctionResult.corrections.length,
      correctionDetails
    }
  } catch (err: any) {
    return {
      valid: false,
      errors: [`Syntax Error: ${err.message}`],
      warnings: [],
      corrections: 0,
      correctionDetails: []
    }
  }
}

async function runTests() {
  const models = [
    'anthropic/claude-sonnet-4.6'
  ]

  // Show context info
  console.log('🧪 Testing LLM Code Generation with Context\n')
  console.log('='.repeat(60))
  console.log(`\n📋 Project Context:`)
  console.log(`   Components: ${projectContext.components.map(c => c.name).join(', ')}`)
  console.log(`   Tokens: ${projectContext.tokens.length} defined`)
  console.log('='.repeat(60))

  for (const model of models) {
    console.log(`\n📦 Model: ${model}`)
    console.log('-'.repeat(60))

    for (const test of TEST_PROMPTS) {
      const contextLabel = test.useContext ? '🔗 with context' : '⚪ no context'
      console.log(`\n  🎯 Test: ${test.name} (${contextLabel})`)

      try {
        const response = await callLLM(model, test.prompt, test.useContext)
        const code = extractCode(response)

        console.log(`  📝 Generated code (${code.length} chars)`)

        const validation = validateAndRender(code)

        if (validation.valid) {
          console.log(`  ✅ Valid!`)
          if (validation.corrections > 0) {
            console.log(`  🔧 Auto-corrected: ${validation.corrections} issues`)
            for (const detail of validation.correctionDetails.slice(0, 5)) {
              console.log(`     - ${detail}`)
            }
            if (validation.correctionDetails.length > 5) {
              console.log(`     ... and ${validation.correctionDetails.length - 5} more`)
            }
          }
          if (validation.warnings.length > 0) {
            console.log(`  ⚠️  Warnings: ${validation.warnings.length}`)
            for (const warn of validation.warnings.slice(0, 3)) {
              console.log(`     - ${warn}`)
            }
          }
        } else {
          console.log(`  ❌ Invalid!`)
          for (const err of validation.errors.slice(0, 3)) {
            console.log(`     - ${err}`)
          }
          if (validation.corrections > 0) {
            console.log(`  🔧 (${validation.corrections} auto-corrections were applied)`)
          }
        }

        // Show generated code
        console.log(`\n  Code:\n${code}\n`)

      } catch (err: any) {
        console.log(`  ❌ API Error: ${err.message}`)
      }

      // Rate limiting
      await new Promise(r => setTimeout(r, 1000))
    }
  }

  console.log('\n' + '='.repeat(60))
  console.log('Done!')
}

runTests()
