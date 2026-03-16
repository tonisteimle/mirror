#!/usr/bin/env npx ts-node

/**
 * LLM Test Runner CLI
 *
 * Run: npx ts-node scripts/run-llm-tests.ts [options]
 *
 * Options:
 *   --complexity=simple|medium|hard|complex
 *   --context=empty|with-components|mixed
 *   --scenario=<scenario-id>
 *   --verbose
 *   --real (use real LLM API - requires ANTHROPIC_API_KEY or OPENAI_API_KEY)
 */

import {
  LLMTestRunner,
  createMockRunner,
  createClaudeClient,
  createOpenAIClient,
  allScenarios,
  getScenariosByComplexity,
  getScenariosByContext,
} from '../src/__tests__/llm'

async function main() {
  const args = process.argv.slice(2)

  // Parse arguments
  const options: Record<string, string> = {}
  const flags = new Set<string>()

  for (const arg of args) {
    if (arg.startsWith('--')) {
      const [key, value] = arg.slice(2).split('=')
      if (value) {
        options[key] = value
      } else {
        flags.add(key)
      }
    }
  }

  const verbose = flags.has('verbose')
  const useRealLLM = flags.has('real')

  // Create runner
  let runner: LLMTestRunner

  if (useRealLLM) {
    const anthropicKey = process.env.ANTHROPIC_API_KEY
    const openaiKey = process.env.OPENAI_API_KEY

    if (anthropicKey) {
      console.log('Using Claude API')
      runner = new LLMTestRunner({
        llmClient: createClaudeClient(anthropicKey),
        verbose,
      })
    } else if (openaiKey) {
      console.log('Using OpenAI API')
      runner = new LLMTestRunner({
        llmClient: createOpenAIClient(openaiKey),
        verbose,
      })
    } else {
      console.error('Error: --real requires ANTHROPIC_API_KEY or OPENAI_API_KEY')
      process.exit(1)
    }
  } else {
    console.log('Using mock LLM (use --real for actual API)')
    runner = createMockRunner(verbose)
  }

  // Select scenarios
  let scenarios = allScenarios

  if (options.complexity) {
    const complexity = options.complexity as any
    scenarios = getScenariosByComplexity(complexity)
    console.log(`Filtered by complexity: ${complexity}`)
  }

  if (options.context) {
    const context = options.context as any
    scenarios = scenarios.filter(s => s.context === context)
    console.log(`Filtered by context: ${context}`)
  }

  if (options.scenario) {
    scenarios = scenarios.filter(s => s.id === options.scenario)
    if (scenarios.length === 0) {
      console.error(`Scenario not found: ${options.scenario}`)
      console.log('\nAvailable scenarios:')
      for (const s of allScenarios) {
        console.log(`  ${s.id} - ${s.name}`)
      }
      process.exit(1)
    }
  }

  console.log(`\nRunning ${scenarios.length} scenario(s)...\n`)

  // Run tests
  const results = await runner.runScenarios(scenarios)

  // Exit code based on results
  const allPassed = results.every(r => r.validation.passed)
  process.exit(allPassed ? 0 : 1)
}

main().catch(error => {
  console.error('Error:', error)
  process.exit(1)
})
