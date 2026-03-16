/**
 * Haiku 4.5 Comprehensive Test
 *
 * Tests all scenarios from the LLM test suite with Claude Haiku 4.5
 * Usage: OPENROUTER_API_KEY=... npx tsx scripts/test-haiku.ts
 */

import { allScenarios, simpleScenarios, mediumScenarios, hardScenarios, complexScenarios, contextualScenarios } from '../src/__tests__/llm/scenarios'
import { SYSTEM_PROMPTS, buildEditorContextPrompt } from '../src/__tests__/llm/types'
import { ReactToMirrorConverter } from '../src/__tests__/llm/react-to-mirror'
import type { TestScenario } from '../src/__tests__/llm/types'

import * as fs from 'fs'

const API_KEY = process.env.OPENROUTER_API_KEY || (() => {
  // Fallback to .env.local
  try {
    const envContent = fs.readFileSync('/Users/toni.steimle/Documents/Dev/Mirror/archive/v1-react-app/.env.local', 'utf-8')
    const match = envContent.match(/VITE_OPENROUTER_API_KEY=(.+)/)
    return match?.[1]?.trim()
  } catch (e) {
    console.error('Could not read .env.local:', e)
    return null
  }
})()

interface TestResult {
  scenario: TestScenario
  success: boolean
  reactCode: string
  mirrorCode: string
  error?: string
  latencyMs: number
  tokens: number
  issues: string[]
}

async function callHaiku(
  userPrompt: string,
  systemPrompt: string
): Promise<{ code: string; latencyMs: number; tokens: number }> {
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
  const latencyMs = Date.now() - start

  if (data.error) {
    throw new Error(data.error.message || JSON.stringify(data.error))
  }

  let code = data.choices?.[0]?.message?.content || ''
  const codeBlockMatch = code.match(/```(?:jsx?|tsx?|javascript|typescript)?\s*\n?([\s\S]*?)```/)
  if (codeBlockMatch) {
    code = codeBlockMatch[1].trim()
  }

  return {
    code,
    latencyMs,
    tokens: data.usage?.completion_tokens || 0,
  }
}

function buildSystemPrompt(scenario: TestScenario): string {
  let prompt = SYSTEM_PROMPTS.base

  if (scenario.context === 'with-components') {
    prompt = SYSTEM_PROMPTS.withComponents
  } else if (scenario.context === 'mixed') {
    prompt = SYSTEM_PROMPTS.mixed
  }

  if (scenario.editorContext) {
    prompt += '\n\n' + buildEditorContextPrompt(scenario.editorContext)
  }

  // Add strict output format
  prompt += `

OUTPUT FORMAT:
Return ONLY the JSX code, no explanations.
Do NOT include event handlers like onClick, onMouseEnter, etc.
Do NOT include JavaScript logic or state.
Use functional component syntax.

Example:
\`\`\`jsx
function Component() {
  return (
    <div style={{ padding: 16 }}>
      <span>Hello</span>
    </div>
  )
}
\`\`\``

  return prompt
}

function buildUserPrompt(scenario: TestScenario): string {
  let prompt = scenario.userPrompt

  if (scenario.existingCode) {
    prompt = `EXISTING COMPONENTS AND TOKENS:
\`\`\`mirror
${scenario.existingCode}
\`\`\`

USER REQUEST:
${scenario.userPrompt}`
  }

  return prompt
}

/**
 * Check if element name matches expected (flexible matching)
 * "List" matches: List, TaskList, UserList, etc.
 * "Button" matches: Button, SubmitButton, etc.
 */
function elementMatches(code: string, expected: string, isReact: boolean): boolean {
  if (isReact) {
    // React: check for JSX tags
    if (new RegExp(`<${expected}[\\s>]`, 'i').test(code)) return true
    if (new RegExp(`<\\w+${expected}[\\s>]`, 'i').test(code)) return true
    if (new RegExp(`<${expected}\\w+[\\s>]`, 'i').test(code)) return true
  } else {
    // Mirror: check for component names at start of line
    if (new RegExp(`^\\s*${expected}\\b`, 'im').test(code)) return true
    if (new RegExp(`^\\s*\\w+${expected}\\b`, 'im').test(code)) return true
    if (new RegExp(`^\\s*${expected}\\w+\\b`, 'im').test(code)) return true
  }
  return false
}

function analyzeIssues(reactCode: string, mirrorCode: string, scenario: TestScenario): string[] {
  const issues: string[] = []

  // Check for event handlers in React
  if (/on[A-Z][a-zA-Z]+\s*=/.test(reactCode)) {
    issues.push('Contains event handlers')
  }

  // Check for JavaScript logic
  if (/\{[^}]*\b(if|for|while|map|filter|=>)\b/.test(reactCode)) {
    issues.push('Contains JS logic')
  }

  // Check for state/hooks
  if (/useState|useEffect|useRef/.test(reactCode)) {
    issues.push('Contains React hooks')
  }

  // Check if expected elements are present (flexible matching)
  if (scenario.expectedElements) {
    for (const elem of scenario.expectedElements) {
      if (!elementMatches(reactCode, elem, true) && !elementMatches(mirrorCode, elem, false)) {
        issues.push(`Missing: ${elem}`)
      }
    }
  }

  // Check minimum elements
  if (scenario.validation?.minElements) {
    const elemCount = (mirrorCode.match(/^[A-Z][a-zA-Z]+/gm) || []).length
    if (elemCount < scenario.validation.minElements) {
      issues.push(`Too few elements: ${elemCount}/${scenario.validation.minElements}`)
    }
  }

  return issues
}

async function runTest(scenario: TestScenario, converter: ReactToMirrorConverter): Promise<TestResult> {
  const systemPrompt = buildSystemPrompt(scenario)
  const userPrompt = buildUserPrompt(scenario)

  try {
    const { code: reactCode, latencyMs, tokens } = await callHaiku(userPrompt, systemPrompt)

    const conversionResult = converter.convert(reactCode)

    if (conversionResult.errors?.length > 0) {
      return {
        scenario,
        success: false,
        reactCode,
        mirrorCode: '',
        error: conversionResult.errors.join(', '),
        latencyMs,
        tokens,
        issues: ['Conversion failed'],
      }
    }

    const mirrorCode = conversionResult.mirror || ''
    const issues = analyzeIssues(reactCode, mirrorCode, scenario)

    return {
      scenario,
      success: true,
      reactCode,
      mirrorCode,
      latencyMs,
      tokens,
      issues,
    }
  } catch (error) {
    return {
      scenario,
      success: false,
      reactCode: '',
      mirrorCode: '',
      error: (error as Error).message,
      latencyMs: 0,
      tokens: 0,
      issues: ['API error'],
    }
  }
}

async function runScenarioGroup(
  name: string,
  scenarios: TestScenario[],
  converter: ReactToMirrorConverter
): Promise<TestResult[]> {
  console.log(`\n${'='.repeat(60)}`)
  console.log(`${name} (${scenarios.length} scenarios)`)
  console.log('='.repeat(60))

  const results: TestResult[] = []

  for (const scenario of scenarios) {
    process.stdout.write(`\n${scenario.id}: `)
    const result = await runTest(scenario, converter)
    results.push(result)

    if (result.success) {
      const issueStr = result.issues.length > 0 ? ` ⚠️ ${result.issues.join(', ')}` : ''
      console.log(`✅ ${result.latencyMs}ms, ${result.tokens} tok${issueStr}`)

      // Show first few lines of Mirror
      console.log(`   Mirror (${result.mirrorCode.split('\n').length} lines):`)
      result.mirrorCode.split('\n').slice(0, 3).forEach(l => console.log(`     ${l}`))
      if (result.mirrorCode.split('\n').length > 3) console.log(`     ...`)
    } else {
      console.log(`❌ ${result.error}`)
    }
  }

  return results
}

function printReport(allResults: TestResult[]) {
  console.log(`\n${'='.repeat(60)}`)
  console.log('HAIKU 4.5 TEST REPORT')
  console.log('='.repeat(60))

  const successful = allResults.filter(r => r.success)
  const withIssues = successful.filter(r => r.issues.length > 0)
  const clean = successful.filter(r => r.issues.length === 0)

  console.log(`
Total:    ${allResults.length} scenarios
Success:  ${successful.length}/${allResults.length} (${Math.round(successful.length/allResults.length*100)}%)
Clean:    ${clean.length}/${allResults.length} (${Math.round(clean.length/allResults.length*100)}%)
Issues:   ${withIssues.length} scenarios with warnings

Avg Latency: ${Math.round(successful.reduce((s,r) => s + r.latencyMs, 0) / successful.length)}ms
Avg Tokens:  ${Math.round(successful.reduce((s,r) => s + r.tokens, 0) / successful.length)}
`)

  // Issue breakdown
  const issueCount = new Map<string, number>()
  for (const r of allResults) {
    for (const issue of r.issues) {
      issueCount.set(issue, (issueCount.get(issue) || 0) + 1)
    }
  }

  if (issueCount.size > 0) {
    console.log('Issue Breakdown:')
    for (const [issue, count] of [...issueCount.entries()].sort((a,b) => b[1] - a[1])) {
      console.log(`  ${count}x ${issue}`)
    }
  }

  // Failed scenarios
  const failed = allResults.filter(r => !r.success)
  if (failed.length > 0) {
    console.log('\nFailed Scenarios:')
    for (const r of failed) {
      console.log(`  ❌ ${r.scenario.id}: ${r.error}`)
    }
  }

  // By complexity
  console.log('\nBy Complexity:')
  for (const complexity of ['simple', 'medium', 'hard', 'complex'] as const) {
    const group = allResults.filter(r => r.scenario.complexity === complexity)
    const succ = group.filter(r => r.success).length
    console.log(`  ${complexity}: ${succ}/${group.length}`)
  }
}

async function main() {
  if (!API_KEY) {
    console.error('❌ No API key found')
    process.exit(1)
  }

  console.log('🚀 Haiku 4.5 Comprehensive Test')
  console.log(`   Running ${allScenarios.length} scenarios`)

  const converter = new ReactToMirrorConverter()
  const allResults: TestResult[] = []

  // Run by group
  allResults.push(...await runScenarioGroup('SIMPLE', simpleScenarios, converter))
  allResults.push(...await runScenarioGroup('MEDIUM', mediumScenarios, converter))
  allResults.push(...await runScenarioGroup('HARD', hardScenarios, converter))
  allResults.push(...await runScenarioGroup('COMPLEX', complexScenarios, converter))
  allResults.push(...await runScenarioGroup('CONTEXTUAL', contextualScenarios, converter))

  printReport(allResults)
}

main().catch(console.error)
