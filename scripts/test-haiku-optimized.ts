/**
 * Haiku 4.5 Optimized Prompt Test
 *
 * Tests optimized system prompts for better semantic naming
 */

import { allScenarios } from '../src/__tests__/llm/scenarios'
import { buildEditorContextPrompt } from '../src/__tests__/llm/types'
import { ReactToMirrorConverter } from '../src/__tests__/llm/react-to-mirror'
import type { TestScenario } from '../src/__tests__/llm/types'
import * as fs from 'fs'

const API_KEY = process.env.OPENROUTER_API_KEY || (() => {
  try {
    const envContent = fs.readFileSync('/Users/toni.steimle/Documents/Dev/Mirror/archive/v1-react-app/.env.local', 'utf-8')
    const match = envContent.match(/VITE_OPENROUTER_API_KEY=(.+)/)
    return match?.[1]?.trim()
  } catch { return null }
})()

// OPTIMIZED SYSTEM PROMPTS FOR HAIKU 4.5
const OPTIMIZED_PROMPTS = {
  base: `You are a UI component generator. Create React/JSX with semantic component names.

NAMING RULES:
- Use descriptive PascalCase names: Sidebar, Dashboard, StatCard, NavItem
- Name components by their PURPOSE, not by HTML tag
- A sidebar navigation → Sidebar with NavItem children
- A stats display → StatCard with Label and Value
- A data list → List with ListItem children

STRUCTURE:
- Wrap related elements in named containers
- Use semantic hierarchy: App > Header > Nav > NavItem

CODE RULES:
- Return ONLY JSX inside a function
- Use inline styles (camelCase)
- NO event handlers (onClick, onHover, etc.)
- NO JavaScript logic (map, filter, conditionals)
- NO React hooks

EXAMPLE:
\`\`\`jsx
function Dashboard() {
  return (
    <Dashboard style={{ padding: 24 }}>
      <Header style={{ marginBottom: 24 }}>
        <Title style={{ fontSize: 24 }}>Analytics</Title>
      </Header>
      <StatCard style={{ padding: 16, backgroundColor: '#1A1A23' }}>
        <Label style={{ color: '#71717A' }}>Users</Label>
        <Value style={{ fontSize: 28, fontWeight: 'bold' }}>1,234</Value>
      </StatCard>
    </Dashboard>
  )
}
\`\`\``,

  withComponents: `You are a UI developer with an existing component library.

IMPORTANT: Reuse existing components from the context.
Match their styling patterns.
Only create new components if truly needed.

NAMING: Use semantic names that match the component's purpose.
CODE: Return ONLY JSX, no handlers, no logic, no hooks.`,

  mixed: `You are a UI developer.
Reuse existing components/tokens when available.
Create new semantic components as needed.
Match the existing style patterns.

CODE: Return ONLY JSX, no handlers, no logic, no hooks.`
}

interface TestResult {
  scenario: TestScenario
  success: boolean
  mirrorCode: string
  latencyMs: number
  issues: string[]
}

async function callHaiku(userPrompt: string, systemPrompt: string): Promise<{ code: string; latencyMs: number }> {
  const start = Date.now()
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://mirror-studio.local',
    },
    body: JSON.stringify({
      model: 'anthropic/claude-haiku-4.5',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.2,
      max_tokens: 2000,
    })
  })

  const data = await response.json()
  if (data.error) throw new Error(data.error.message)

  let code = data.choices?.[0]?.message?.content || ''
  const match = code.match(/```(?:jsx?|tsx?)?\s*\n?([\s\S]*?)```/)
  if (match) code = match[1].trim()

  return { code, latencyMs: Date.now() - start }
}

function buildPrompt(scenario: TestScenario): { system: string; user: string } {
  let system = OPTIMIZED_PROMPTS.base
  if (scenario.context === 'with-components') system = OPTIMIZED_PROMPTS.withComponents
  else if (scenario.context === 'mixed') system = OPTIMIZED_PROMPTS.mixed

  if (scenario.editorContext) {
    system += '\n\n' + buildEditorContextPrompt(scenario.editorContext)
  }

  let user = scenario.userPrompt
  if (scenario.existingCode) {
    user = `EXISTING CODE:\n\`\`\`\n${scenario.existingCode}\n\`\`\`\n\nREQUEST: ${scenario.userPrompt}`
  }

  return { system, user }
}

/**
 * Check if element name matches expected (flexible matching)
 * "List" matches: List, TaskList, UserList, etc.
 * "Button" matches: Button, SubmitButton, etc.
 */
function elementMatches(mirrorCode: string, expected: string): boolean {
  // Direct match at start of line
  if (new RegExp(`^\\s*${expected}\\b`, 'im').test(mirrorCode)) return true
  // Match as suffix (e.g., TaskList for "List", SubmitButton for "Button")
  if (new RegExp(`^\\s*\\w+${expected}\\b`, 'im').test(mirrorCode)) return true
  // Match as prefix (e.g., ListItem for "List")
  if (new RegExp(`^\\s*${expected}\\w+\\b`, 'im').test(mirrorCode)) return true
  return false
}

function checkIssues(mirrorCode: string, scenario: TestScenario): string[] {
  const issues: string[] = []

  if (scenario.expectedElements) {
    for (const elem of scenario.expectedElements) {
      if (!elementMatches(mirrorCode, elem)) {
        issues.push(`Missing: ${elem}`)
      }
    }
  }

  if (scenario.validation?.minElements) {
    const count = (mirrorCode.match(/^[A-Z][a-zA-Z]+/gm) || []).length
    if (count < scenario.validation.minElements) {
      issues.push(`Elements: ${count}/${scenario.validation.minElements}`)
    }
  }

  return issues
}

async function runTest(scenario: TestScenario, converter: ReactToMirrorConverter): Promise<TestResult> {
  const { system, user } = buildPrompt(scenario)

  try {
    const { code, latencyMs } = await callHaiku(user, system)
    const result = converter.convert(code)

    if (result.errors?.length) {
      return { scenario, success: false, mirrorCode: '', latencyMs, issues: ['Conversion failed'] }
    }

    const mirrorCode = result.mirror || ''
    return { scenario, success: true, mirrorCode, latencyMs, issues: checkIssues(mirrorCode, scenario) }
  } catch (e) {
    return { scenario, success: false, mirrorCode: '', latencyMs: 0, issues: [(e as Error).message] }
  }
}

async function main() {
  if (!API_KEY) {
    console.error('❌ No API key')
    process.exit(1)
  }

  console.log('🚀 Haiku 4.5 OPTIMIZED Prompt Test')
  console.log(`   ${allScenarios.length} scenarios\n`)

  const converter = new ReactToMirrorConverter()
  const results: TestResult[] = []

  for (const scenario of allScenarios) {
    process.stdout.write(`${scenario.id}: `)
    const result = await runTest(scenario, converter)
    results.push(result)

    if (result.success) {
      const warn = result.issues.length > 0 ? ` ⚠️ ${result.issues.join(', ')}` : ''
      console.log(`✅ ${result.latencyMs}ms${warn}`)
    } else {
      console.log(`❌ ${result.issues[0]}`)
    }
  }

  // Summary
  const success = results.filter(r => r.success)
  const clean = success.filter(r => r.issues.length === 0)

  console.log(`\n${'='.repeat(50)}`)
  console.log('SUMMARY')
  console.log('='.repeat(50))
  console.log(`Success: ${success.length}/${results.length} (${Math.round(success.length/results.length*100)}%)`)
  console.log(`Clean:   ${clean.length}/${results.length} (${Math.round(clean.length/results.length*100)}%)`)
  console.log(`Avg ms:  ${Math.round(success.reduce((s,r) => s + r.latencyMs, 0) / success.length)}`)

  // Issue breakdown
  const issues = new Map<string, number>()
  for (const r of results) {
    for (const i of r.issues) {
      issues.set(i, (issues.get(i) || 0) + 1)
    }
  }

  if (issues.size > 0) {
    console.log('\nIssues:')
    for (const [issue, count] of [...issues.entries()].sort((a,b) => b[1] - a[1]).slice(0, 10)) {
      console.log(`  ${count}x ${issue}`)
    }
  }
}

main().catch(console.error)
