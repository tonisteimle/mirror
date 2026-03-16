/**
 * Test LLM Mirror Generation
 *
 * Tests the new direct Mirror generation with various prompts
 * and validates the output with the Mirror parser.
 *
 * Usage: OPENROUTER_API_KEY=sk-... npx tsx scripts/test-llm-prompt.ts
 */

import * as Mirror from '../src/index'

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY

if (!OPENROUTER_API_KEY) {
  console.error('❌ Missing OPENROUTER_API_KEY environment variable')
  console.log('Usage: OPENROUTER_API_KEY=sk-... npx tsx scripts/test-llm-prompt.ts')
  process.exit(1)
}

// Golden Example for empty apps
const GOLDEN_EXAMPLE = `// Tokens - Palette
$grey-950: #09090B
$grey-900: #18181B
$grey-800: #27272A
$grey-700: #3F3F46
$grey-500: #71717A
$grey-300: #D4D4D8
$grey-100: #F4F4F5

$blue-500: #3B82F6
$blue-600: #2563EB

// Tokens - Semantic
$app.bg: $grey-950
$surface.bg: $grey-900
$card.bg: $grey-800
$hover.bg: $grey-700

$heading.col: $grey-100
$text.col: $grey-300
$muted.col: $grey-500

$primary.bg: $blue-500
$primary.hover.bg: $blue-600

$sm.pad: 8
$md.pad: 12
$lg.pad: 16

$sm.gap: 8
$md.gap: 12

$sm.rad: 4
$md.rad: 6

// Components
Heading: col $heading.col, weight bold, font-size 18
Body: col $text.col, font-size 13
Muted: col $muted.col, font-size 12

Button: pad $sm.pad $md.pad, bg $primary.bg, col white, rad $sm.rad, cursor pointer
  hover bg $primary.hover.bg

Card: pad $lg.pad, bg $card.bg, rad $md.rad, gap $md.gap

NavItem: hor, gap $sm.gap, pad $sm.pad $md.pad, rad $sm.rad, cursor pointer
  Icon: is 18, col $muted.col
  Label: col $text.col
  hover bg $hover.bg

// App
App hor, w full, h full, bg $app.bg

  Sidebar w 220, h full, bg $surface.bg, pad $md.pad, gap $md.gap
    Heading "App Name", font-size 15
    Nav gap 4
      NavItem Icon "home"; Label "Home"
      NavItem Icon "settings"; Label "Settings"

  Main w full, pad $lg.pad, gap $lg.pad
    Heading "Welcome"
    Card
      Body "Your content here."`

// Mirror DSL System Prompt
const MIRROR_SYSTEM_PROMPT = `Du schreibst UI-Code in Mirror DSL. Antworte NUR mit validem Mirror-Code.

## Syntax-Kurzreferenz

// Komponente definieren (mit Doppelpunkt)
Button: pad 12, bg #3B82F6, rad 4

// Komponente verwenden (ohne Doppelpunkt)
Button "Click me"

// Vererbung
DangerButton as Button: bg #EF4444

// Kinder (eingerückt)
Card
  Title "Hello"
  Body "Content"

// Child-Overrides (Semicolon)
NavItem Icon "home"; Label "Dashboard"

// States
Button: bg #3B82F6
  hover bg #2563EB
  state disabled bg #666

// Events
Button onclick toggle Modal
Input oninput filter Results

// Conditionals
if isActive
  ActiveView
else
  InactiveView

// Iteration
each item in items
  Card item.title

## Properties

Layout: hor, ver, center, spread, gap N, wrap, grid N
Size: w N/full/hug, h N/full/hug, minw, maxw, minh, maxh
Spacing: pad N, pad N N, pad left N, margin N
Color: bg, col, bor [width] [color], boc
Radius: rad N, rad tl N br N
Type: font-size, weight, italic, underline, truncate
Icon: is (size), iw (weight), ic (color), fill
Visual: opacity, shadow sm/md/lg, cursor, hidden, z
Scroll: scroll, scroll-hor, clip

## Primitives

Box, Text, Button, Input, Textarea, Image, Icon, Link

## Icons (Lucide)

home, settings, user, search, x, check, plus, edit, trash, bell, mail,
star, heart, arrow-left, chevron-down, eye, lock, filter, download, upload

## Regeln

1. Tokens oben definieren, dann referenzieren ($name)
2. Komponenten vor Instanzen definieren
3. Semantische Token-Namen ($primary.bg nicht $blue)
4. Existierende Patterns im Code folgen
5. Keine Magic Numbers - Tokens verwenden`

// Test prompts
const TEST_PROMPTS = [
  {
    name: 'Empty App - Login Form',
    context: 'empty',
    prompt: 'Erstelle ein Login-Formular mit E-Mail, Passwort und Submit-Button'
  },
  {
    name: 'Empty App - Dashboard',
    context: 'empty',
    prompt: 'Erstelle ein Dashboard mit Sidebar-Navigation und einer Statistik-Karte'
  },
  {
    name: 'Empty App - Simple Card',
    context: 'empty',
    prompt: 'Eine einfache Card mit Titel und Text'
  }
]

function buildSystemPrompt(hasContent: boolean, tokens: string[] = [], components: string[] = []): string {
  let prompt = MIRROR_SYSTEM_PROMPT

  if (!hasContent) {
    prompt += `\n\n## Vorlage für neue App

Strukturiere deinen Code wie dieses Beispiel:

\`\`\`mirror
${GOLDEN_EXAMPLE}
\`\`\`

Passe das Beispiel an die Anfrage an.`
  } else {
    if (tokens.length > 0) {
      prompt += '\n\n## Verfügbare Tokens (verwende diese, erfinde keine neuen)\n\n'
      prompt += tokens.join('\n')
    }
    if (components.length > 0) {
      prompt += '\n\n## Existierende Komponenten (folge diesem Stil)\n\n'
      prompt += components.join('\n')
    }
  }

  prompt += '\n\nAntworte NUR mit Mirror-Code. Keine Erklärungen.'
  return prompt
}

async function callLLM(systemPrompt: string, userPrompt: string): Promise<string> {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://mirror-studio.local',
    },
    body: JSON.stringify({
      model: 'anthropic/claude-sonnet-4.6',
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
    throw new Error(data.error.message || 'API Error')
  }

  let mirrorCode = data.choices[0].message.content

  // Extract code from markdown if wrapped
  const codeBlockMatch = mirrorCode.match(/```(?:mirror)?\s*\n?([\s\S]*?)```/)
  if (codeBlockMatch) {
    mirrorCode = codeBlockMatch[1].trim()
  } else {
    mirrorCode = mirrorCode.trim()
  }

  return mirrorCode
}

function validateMirrorCode(code: string): { valid: boolean; errors: string[]; ast?: any } {
  try {
    const ast = Mirror.parse(code)

    if (ast.errors && ast.errors.length > 0) {
      return {
        valid: false,
        errors: ast.errors.map((e: any) => e.message || String(e)),
        ast
      }
    }

    return {
      valid: true,
      errors: [],
      ast
    }
  } catch (error: any) {
    return {
      valid: false,
      errors: [error.message]
    }
  }
}

async function runTest(test: typeof TEST_PROMPTS[0]): Promise<{
  name: string
  prompt: string
  mirrorCode: string
  valid: boolean
  errors: string[]
  tokenCount: number
  componentCount: number
  instanceCount: number
}> {
  console.log(`\n${'='.repeat(60)}`)
  console.log(`Testing: ${test.name}`)
  console.log(`Prompt: "${test.prompt}"`)
  console.log('='.repeat(60))

  const hasContent = test.context !== 'empty'
  const systemPrompt = buildSystemPrompt(hasContent)

  console.log('\n📤 Calling LLM...')
  const startTime = Date.now()
  const mirrorCode = await callLLM(systemPrompt, test.prompt)
  const duration = ((Date.now() - startTime) / 1000).toFixed(1)
  console.log(`⏱️  Response in ${duration}s`)

  console.log('\n📝 Generated Mirror Code:')
  console.log('-'.repeat(40))
  console.log(mirrorCode)
  console.log('-'.repeat(40))

  console.log('\n🔍 Validating...')
  const validation = validateMirrorCode(mirrorCode)

  if (validation.valid) {
    console.log('✅ Valid Mirror code!')
    console.log(`   Tokens: ${validation.ast?.tokens?.length || 0}`)
    console.log(`   Components: ${validation.ast?.components?.length || 0}`)
    console.log(`   Instances: ${validation.ast?.instances?.length || 0}`)
  } else {
    console.log('❌ Invalid Mirror code!')
    validation.errors.forEach(e => console.log(`   - ${e}`))
  }

  return {
    name: test.name,
    prompt: test.prompt,
    mirrorCode,
    valid: validation.valid,
    errors: validation.errors,
    tokenCount: validation.ast?.tokens?.length || 0,
    componentCount: validation.ast?.components?.length || 0,
    instanceCount: validation.ast?.instances?.length || 0
  }
}

async function main() {
  console.log('🧪 Mirror LLM Prompt Test Suite')
  console.log('================================')
  console.log(`Model: anthropic/claude-sonnet-4.6`)
  console.log(`Tests: ${TEST_PROMPTS.length}`)

  const results = []

  for (const test of TEST_PROMPTS) {
    try {
      const result = await runTest(test)
      results.push(result)
    } catch (error: any) {
      console.log(`\n❌ Test failed: ${error.message}`)
      results.push({
        name: test.name,
        prompt: test.prompt,
        mirrorCode: '',
        valid: false,
        errors: [error.message],
        tokenCount: 0,
        componentCount: 0,
        instanceCount: 0
      })
    }

    // Small delay between tests
    await new Promise(r => setTimeout(r, 1000))
  }

  // Summary
  console.log('\n')
  console.log('='.repeat(60))
  console.log('SUMMARY')
  console.log('='.repeat(60))

  const passed = results.filter(r => r.valid).length
  const failed = results.filter(r => !r.valid).length

  console.log(`\n✅ Passed: ${passed}/${results.length}`)
  console.log(`❌ Failed: ${failed}/${results.length}`)

  if (failed > 0) {
    console.log('\nFailed tests:')
    results.filter(r => !r.valid).forEach(r => {
      console.log(`  - ${r.name}: ${r.errors[0]}`)
    })
  }

  console.log('\nDetails:')
  results.forEach(r => {
    const status = r.valid ? '✅' : '❌'
    console.log(`  ${status} ${r.name}`)
    console.log(`     Tokens: ${r.tokenCount}, Components: ${r.componentCount}, Instances: ${r.instanceCount}`)
  })
}

main().catch(console.error)
