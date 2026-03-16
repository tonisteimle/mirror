/**
 * Model Comparison Script
 *
 * Compares React generation quality between different LLM models
 * Usage: ANTHROPIC_API_KEY=your-key npx tsx scripts/compare-models.ts
 */

import { ReactToMirrorConverter } from '../src/__tests__/llm/react-to-mirror'

// Test scenarios
const TEST_PROMPTS = [
  {
    id: 'simple-button',
    prompt: 'Create a primary button with text "Click me"',
  },
  {
    id: 'card-with-content',
    prompt: 'Create a card with a title "Welcome" and description text',
  },
  {
    id: 'nav-horizontal',
    prompt: 'Create a horizontal navigation with 3 links: Home, About, Contact',
  },
  {
    id: 'form-input',
    prompt: 'Create an email input with placeholder and submit button',
  },
  {
    id: 'stat-card',
    prompt: 'Create a stats card showing "1,234 Users" with a green trend indicator',
  },
]

const SYSTEM_PROMPT = `You are a UI developer. Generate React/JSX code for the requested UI.

RULES:
1. Return ONLY JSX code inside a functional component
2. Use inline styles with camelCase properties
3. Use semantic HTML elements
4. Keep code minimal - no explanations
5. No imports or exports

EXAMPLE:
\`\`\`jsx
function Component() {
  return (
    <div style={{ padding: '16px', backgroundColor: '#1A1A23', borderRadius: '8px' }}>
      <span style={{ color: '#E4E4E7' }}>Hello</span>
    </div>
  )
}
\`\`\`

Use hex colors and pixel values.`

interface ModelResult {
  model: string
  prompt: string
  reactCode: string
  mirrorCode: string
  success: boolean
  error?: string
  latencyMs: number
  inputTokens?: number
  outputTokens?: number
}

async function callOpenRouter(
  prompt: string,
  model: string,
  apiKey: string
): Promise<{ code: string; latencyMs: number; inputTokens: number; outputTokens: number }> {
  const start = Date.now()

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://mirror-studio.local',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
      max_tokens: 1500,
    })
  })

  const data = await response.json()
  const latencyMs = Date.now() - start

  if (data.error) {
    throw new Error(data.error.message || JSON.stringify(data.error))
  }

  let code = data.choices?.[0]?.message?.content || ''

  // Extract from markdown code block
  const codeBlockMatch = code.match(/```(?:jsx?|tsx?|javascript|typescript)?\s*\n?([\s\S]*?)```/)
  if (codeBlockMatch) {
    code = codeBlockMatch[1].trim()
  }

  return {
    code,
    latencyMs,
    inputTokens: data.usage?.prompt_tokens || 0,
    outputTokens: data.usage?.completion_tokens || 0,
  }
}

async function testModel(
  model: string,
  modelName: string,
  apiKey: string
): Promise<ModelResult[]> {
  const results: ModelResult[] = []
  const converter = new ReactToMirrorConverter()

  console.log(`\n${'='.repeat(60)}`)
  console.log(`Testing: ${modelName}`)
  console.log(`Model ID: ${model}`)
  console.log('='.repeat(60))

  for (const test of TEST_PROMPTS) {
    process.stdout.write(`\n📝 ${test.id}: `)

    try {
      const { code: reactCode, latencyMs, inputTokens, outputTokens } = await callOpenRouter(
        test.prompt,
        model,
        apiKey
      )

      // Convert to Mirror
      const conversionResult = converter.convert(reactCode)

      if (conversionResult.errors && conversionResult.errors.length > 0) {
        console.log(`❌ Conversion error`)
        console.log(`   Error: ${conversionResult.errors.join(', ')}`)
        console.log(`   React:\n${reactCode.split('\n').slice(0, 3).map(l => `      ${l}`).join('\n')}`)
        results.push({
          model: modelName,
          prompt: test.prompt,
          reactCode,
          mirrorCode: '',
          success: false,
          error: conversionResult.errors.join(', '),
          latencyMs,
          inputTokens,
          outputTokens,
        })
      } else if (!conversionResult.mirror) {
        console.log(`❌ Empty output`)
        results.push({
          model: modelName,
          prompt: test.prompt,
          reactCode,
          mirrorCode: '',
          success: false,
          error: 'Empty Mirror output',
          latencyMs,
          inputTokens,
          outputTokens,
        })
      } else {
        const mirrorLines = conversionResult.mirror.split('\n').length
        console.log(`✅ ${latencyMs}ms, ${mirrorLines} lines, ${outputTokens} tokens`)

        // Show first few lines of Mirror output
        console.log(`   Mirror:`)
        conversionResult.mirror.split('\n').slice(0, 4).forEach(l => console.log(`      ${l}`))
        if (mirrorLines > 4) console.log(`      ... (${mirrorLines - 4} more lines)`)

        results.push({
          model: modelName,
          prompt: test.prompt,
          reactCode,
          mirrorCode: conversionResult.mirror,
          success: true,
          latencyMs,
          inputTokens,
          outputTokens,
        })
      }
    } catch (error) {
      console.log(`❌ API Error: ${(error as Error).message}`)
      results.push({
        model: modelName,
        prompt: test.prompt,
        reactCode: '',
        mirrorCode: '',
        success: false,
        error: (error as Error).message,
        latencyMs: 0,
      })
    }
  }

  return results
}

function printSummary(allResults: Map<string, ModelResult[]>) {
  console.log(`\n${'='.repeat(60)}`)
  console.log('SUMMARY')
  console.log('='.repeat(60))

  const summaryTable: any[] = []

  for (const [modelName, results] of allResults) {
    const successful = results.filter(r => r.success).length
    const total = results.length
    const avgLatency = Math.round(results.reduce((sum, r) => sum + r.latencyMs, 0) / results.length)
    const totalTokens = results.reduce((sum, r) => sum + (r.outputTokens || 0), 0)
    const avgMirrorLines = Math.round(
      results.filter(r => r.success).reduce((sum, r) => sum + r.mirrorCode.split('\n').length, 0) / (successful || 1)
    )

    summaryTable.push({
      Model: modelName,
      Success: `${successful}/${total}`,
      'Avg Latency': `${avgLatency}ms`,
      'Total Tokens': totalTokens,
      'Avg Lines': avgMirrorLines,
    })
  }

  console.table(summaryTable)

  // Side-by-side comparison
  if (allResults.size >= 2) {
    console.log(`\n${'='.repeat(60)}`)
    console.log('SIDE-BY-SIDE COMPARISON')
    console.log('='.repeat(60))

    const models = Array.from(allResults.keys())

    for (const test of TEST_PROMPTS) {
      console.log(`\n📝 ${test.id}`)
      console.log(`   "${test.prompt}"`)
      console.log('')

      for (const modelName of models) {
        const results = allResults.get(modelName)!
        const result = results.find(r => r.prompt === test.prompt)
        if (result?.success) {
          console.log(`   ${modelName}:`)
          result.mirrorCode.split('\n').slice(0, 6).forEach(l => console.log(`      ${l}`))
          if (result.mirrorCode.split('\n').length > 6) console.log(`      ...`)
          console.log('')
        }
      }
    }
  }
}

async function main() {
  // Use OpenRouter API key from env
  const apiKey = process.env.OPENROUTER_API_KEY

  if (!apiKey) {
    console.error('❌ OPENROUTER_API_KEY required')
    console.error('   Set in env or check archive/v1-react-app/.env.local')
    process.exit(1)
  }

  // OpenRouter model IDs
  const models = [
    { id: 'anthropic/claude-haiku-4.5', name: 'Claude Haiku 4.5' },
    // { id: 'anthropic/claude-sonnet-4', name: 'Claude Sonnet 4' },
  ]

  console.log('🚀 Mirror LLM Model Comparison Test')
  console.log(`   Testing ${models.length} model(s) with ${TEST_PROMPTS.length} prompts`)
  console.log('')
  console.log('Available models being tested:')
  models.forEach(m => console.log(`  - ${m.name} (${m.id})`))

  const allResults = new Map<string, ModelResult[]>()

  for (const model of models) {
    try {
      const results = await testModel(model.id, model.name, apiKey)
      allResults.set(model.name, results)
    } catch (error) {
      console.error(`\n❌ Failed to test ${model.name}: ${(error as Error).message}`)
    }
  }

  if (allResults.size > 0) {
    printSummary(allResults)
  }
}

main().catch(console.error)
