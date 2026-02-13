/**
 * LLM E2E Test Harness with Validator + LLM-as-Judge
 *
 * Test Flow:
 * 1. Send prompt to LLM → Generate Mirror code
 * 2. Parse the code → Check syntax
 * 3. Validate the code → Check properties, events, actions (objective)
 * 4. LLM-as-Judge → Evaluate if code meets requirements (subjective)
 */

import { generateWithValidation, hasApiKey, setApiKey, getApiKey } from '../../lib/ai'
import { API } from '../../constants'

// ============================================================================
// Types
// ============================================================================

export interface TestCase {
  name: string
  prompt: string
  /** Requirements the generated code must meet (for LLM judge) */
  requirements: string[]
  skip?: boolean
  only?: boolean
}

export interface TestResult {
  name: string
  prompt: string
  generatedCode: string
  parseErrors: string[]
  validationErrors: string[]  // Objective validation errors (properties, events, etc.)
  evaluation: {
    passed: boolean
    score: number  // 0-100
    feedback: string
    requirementResults: { requirement: string; met: boolean; reason: string }[]
  } | null
  duration: number
  success: boolean
}

export interface TestSuiteResult {
  total: number
  passed: number
  failed: number
  skipped: number
  averageScore: number
  results: TestResult[]
  duration: number
}

// ============================================================================
// LLM-as-Judge Evaluation
// ============================================================================

const JUDGE_PROMPT = `Du bist ein Code-Reviewer für Mirror DSL (eine UI-Beschreibungssprache).

Bewerte ob der generierte Code die Anforderungen erfüllt.

## Mirror DSL Basics
- Komponenten: Name prop1 wert1 prop2 wert2 "Text"
- Layout: ver (vertikal), hor (horizontal), gap, pad, mar
- Styling: col (text color), bg (background), rad (radius), bor (border)
- Verschachtelung durch Einrückung (2 Spaces)

## Bewertungskriterien
1. Erfüllt der Code die funktionalen Anforderungen?
2. Ist die Struktur sinnvoll?
3. Sind die Styles angemessen?

Antworte NUR mit JSON:
{
  "score": <0-100>,
  "passed": <true/false>,
  "feedback": "<kurze Zusammenfassung>",
  "requirements": [
    {"requirement": "<text>", "met": <true/false>, "reason": "<begründung>"}
  ]
}`

async function evaluateWithLLM(
  prompt: string,
  generatedCode: string,
  requirements: string[]
): Promise<TestResult['evaluation']> {
  const apiKey = getApiKey()
  if (!apiKey) throw new Error('No API key')

  const userMessage = `## Ursprünglicher Prompt
${prompt}

## Generierter Code
\`\`\`
${generatedCode}
\`\`\`

## Anforderungen zu prüfen
${requirements.map((r, i) => `${i + 1}. ${r}`).join('\n')}

Bewerte ob der Code die Anforderungen erfüllt.`

  const response = await fetch(API.ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'anthropic/claude-sonnet-4', // Schnelleres Model für Evaluation
      messages: [
        { role: 'system', content: JUDGE_PROMPT },
        { role: 'user', content: userMessage }
      ],
      max_tokens: 1024,
    }),
  })

  if (!response.ok) {
    throw new Error(`Judge API error: ${response.status}`)
  }

  const data = await response.json()
  const content = data.choices[0]?.message?.content || ''

  // Parse JSON from response
  const jsonMatch = content.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error('Judge did not return valid JSON')
  }

  const result = JSON.parse(jsonMatch[0])
  return {
    passed: result.passed ?? result.score >= 70,
    score: result.score ?? 0,
    feedback: result.feedback ?? '',
    requirementResults: result.requirements ?? [],
  }
}

// ============================================================================
// Test Runner
// ============================================================================

export async function runTest(testCase: TestCase): Promise<TestResult> {
  const startTime = Date.now()

  let generatedCode = ''
  let parseErrors: string[] = []
  let validationErrors: string[] = []
  let evaluation: TestResult['evaluation'] = null

  try {
    // 1. Generate code with self-healing (auto-corrects up to 2x)
    console.log(`    Generating (with self-healing)...`)
    const result = await generateWithValidation(testCase.prompt, {
      maxAttempts: 3,
      onProgress: (status, attempt) => {
        if (status === 'correcting') {
          console.log(`    Correcting (attempt ${attempt})...`)
        }
      }
    })
    generatedCode = result.code

    // 2. Check if validation passed after self-healing
    if (!result.valid) {
      // Separate parse errors from validation errors
      result.issues.forEach(issue => {
        if (issue.type === 'parse_error' || issue.type === 'parse_issue') {
          parseErrors.push(issue.message)
        } else {
          validationErrors.push(issue.message)
        }
      })
    }

    // 3. Evaluate with LLM (only if validation succeeded)
    if (result.valid) {
      console.log(`    Evaluating...`)
      evaluation = await evaluateWithLLM(testCase.prompt, generatedCode, testCase.requirements)
    }
  } catch (error) {
    parseErrors.push(`Error: ${error instanceof Error ? error.message : 'Unknown'}`)
  }

  const success = parseErrors.length === 0 && validationErrors.length === 0 && (evaluation?.passed ?? false)

  return {
    name: testCase.name,
    prompt: testCase.prompt,
    generatedCode,
    parseErrors,
    validationErrors,
    evaluation,
    duration: Date.now() - startTime,
    success,
  }
}

export async function runTestSuite(tests: TestCase[]): Promise<TestSuiteResult> {
  const startTime = Date.now()
  const results: TestResult[] = []
  let passed = 0
  let failed = 0
  let skipped = 0
  let totalScore = 0

  const hasOnly = tests.some(t => t.only)

  for (const test of tests) {
    if (test.skip || (hasOnly && !test.only)) {
      skipped++
      continue
    }

    console.log(`\n  📝 ${test.name}`)
    const result = await runTest(test)
    results.push(result)

    if (result.evaluation) {
      totalScore += result.evaluation.score
    }

    if (result.success) {
      passed++
      console.log(`  ✅ PASS (Score: ${result.evaluation?.score ?? 0}/100, ${result.duration}ms)`)
    } else {
      failed++
      console.log(`  ❌ FAIL (Score: ${result.evaluation?.score ?? 0}/100, ${result.duration}ms)`)
      if (result.parseErrors.length > 0) {
        console.log(`     Parse errors: ${result.parseErrors.join(', ')}`)
      }
      if (result.validationErrors.length > 0) {
        console.log(`     Validation errors: ${result.validationErrors.slice(0, 3).join(', ')}`)
      }
      if (result.evaluation?.feedback) {
        console.log(`     Feedback: ${result.evaluation.feedback}`)
      }
    }
  }

  const evaluated = results.filter(r => r.evaluation).length

  return {
    total: tests.length,
    passed,
    failed,
    skipped,
    averageScore: evaluated > 0 ? Math.round(totalScore / evaluated) : 0,
    results,
    duration: Date.now() - startTime,
  }
}

// ============================================================================
// Test Definition Helpers
// ============================================================================

export function test(name: string, prompt: string, requirements: string[]): TestCase {
  return { name, prompt, requirements }
}

export function skip(testCase: TestCase): TestCase {
  return { ...testCase, skip: true }
}

export function only(testCase: TestCase): TestCase {
  return { ...testCase, only: true }
}

// ============================================================================
// Output
// ============================================================================

export function printSummary(result: TestSuiteResult) {
  console.log('\n' + '═'.repeat(60))
  console.log('📊 LLM E2E Test Results')
  console.log('═'.repeat(60))
  console.log(`Total:         ${result.total}`)
  console.log(`Passed:        ${result.passed}`)
  console.log(`Failed:        ${result.failed}`)
  console.log(`Skipped:       ${result.skipped}`)
  console.log(`Average Score: ${result.averageScore}/100`)
  console.log(`Duration:      ${(result.duration / 1000).toFixed(1)}s`)
  console.log('═'.repeat(60))

  if (result.failed > 0) {
    console.log('\n❌ Failed Tests:\n')
    result.results
      .filter(r => !r.success)
      .forEach(r => {
        console.log(`  ${r.name}`)
        console.log(`  Prompt: "${r.prompt}"`)
        console.log(`  Code: ${r.generatedCode.substring(0, 80).replace(/\n/g, ' ')}...`)
        if (r.parseErrors.length > 0) {
          console.log(`  Parse Errors: ${r.parseErrors.join(', ')}`)
        }
        if (r.validationErrors.length > 0) {
          console.log(`  Validation Errors:`)
          r.validationErrors.slice(0, 5).forEach(e => console.log(`    - ${e}`))
        }
        if (r.evaluation) {
          console.log(`  Score: ${r.evaluation.score}/100`)
          r.evaluation.requirementResults
            .filter(req => !req.met)
            .forEach(req => {
              console.log(`    ✗ ${req.requirement}: ${req.reason}`)
            })
        }
        console.log()
      })
  }

  // Show detailed results for passed tests too
  if (result.passed > 0) {
    console.log('\n✅ Passed Tests:\n')
    result.results
      .filter(r => r.success)
      .forEach(r => {
        console.log(`  ${r.name} (${r.evaluation?.score}/100)`)
      })
  }
}

export function checkApiKey(): boolean {
  if (!hasApiKey()) {
    const envKey = process.env.VITE_OPENROUTER_API_KEY
    if (envKey) {
      setApiKey(envKey)
    }
  }

  if (!hasApiKey()) {
    console.error('❌ No API key. Set VITE_OPENROUTER_API_KEY in .env.local')
    return false
  }
  return true
}
