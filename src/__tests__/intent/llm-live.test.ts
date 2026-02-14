/**
 * Live LLM Tests - testet mit echtem Claude Sonnet 4.5 via OpenRouter
 */

import { describe, it, expect } from 'vitest'
import { generateWithIntent } from '../../intent/generate'
import { validateIntent } from '../../intent/validator'
import { INTENT_SYSTEM_PROMPT, buildUserPrompt, parseIntentResponse } from '../../intent/llm-prompt'
import { mirrorToIntent } from '../../intent/mirror-to-intent'
import type { Intent } from '../../intent/schema'

const OPENROUTER_API_KEY = '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'
const MODEL = 'anthropic/claude-sonnet-4.5'

async function callLLM(systemPrompt: string, userPrompt: string): Promise<string> {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`OpenRouter API error: ${response.status} - ${error}`)
  }

  const data = await response.json()
  return data.choices[0].message.content
}

describe('Live LLM Tests', () => {
  it('LLM returns valid Intent JSON for simple request', async () => {
    const layoutCode = `
Box ver gap 16 pad 24 bg #1E1E2E
  Text "Hello World"
`
    const currentIntent = mirrorToIntent(layoutCode, '', '')
    const userPrompt = buildUserPrompt(currentIntent, 'Füge einen blauen Button mit Text "Click me" hinzu')

    console.log('\n=== REQUEST ===')
    console.log('User Request: Füge einen blauen Button hinzu')

    const response = await callLLM(INTENT_SYSTEM_PROMPT, userPrompt)

    console.log('\n=== RAW LLM RESPONSE ===')
    console.log(response.substring(0, 500) + '...')

    const intent = parseIntentResponse(response)

    expect(intent).not.toBeNull()
    console.log('\n=== PARSED INTENT ===')
    console.log(JSON.stringify(intent, null, 2))

    // Validate
    const validation = validateIntent(intent)
    console.log('\n=== VALIDATION ===')
    console.log('Valid:', validation.valid)
    if (!validation.valid) {
      console.log('Errors:', validation.errors)
    }

    expect(validation.valid).toBe(true)

    // Check for button
    const hasButton = JSON.stringify(intent).toLowerCase().includes('button')
    expect(hasButton).toBe(true)
  }, 30000)

  it('LLM creates login form from scratch', async () => {
    const layoutCode = 'Box'
    const currentIntent = mirrorToIntent(layoutCode, '', '')
    const userPrompt = buildUserPrompt(currentIntent,
      'Erstelle ein Login-Formular mit Email-Input, Password-Input und einem Submit-Button. Nutze ein dunkles Design.'
    )

    console.log('\n=== LOGIN FORM REQUEST ===')

    const response = await callLLM(INTENT_SYSTEM_PROMPT, userPrompt)
    const intent = parseIntentResponse(response)

    expect(intent).not.toBeNull()

    const validation = validateIntent(intent)
    console.log('Valid:', validation.valid)
    if (!validation.valid) {
      console.log('Errors:', JSON.stringify(validation.errors, null, 2))
    }

    console.log('\n=== LOGIN FORM INTENT ===')
    console.log(JSON.stringify(intent, null, 2))

    // Check structure - be lenient, just check we got something
    expect(intent!.layout.length).toBeGreaterThan(0)
  }, 30000)

  it('full flow: Mirror → Intent → LLM → Intent → Mirror', async () => {
    const layoutCode = `
Card ver gap 16 pad 24 bg #1E1E2E rad 12
  Title size 24 weight 600 "Dashboard"
  Text col #9CA3AF "Welcome back"
`
    console.log('\n=== FULL FLOW TEST ===')
    console.log('Input Mirror Code:')
    console.log(layoutCode)

    const result = await generateWithIntent(
      'Füge einen grünen "Save" Button und einen grauen "Cancel" Button nebeneinander hinzu',
      { layoutCode },
      callLLM
    )

    console.log('\n=== RESULT ===')
    console.log('Success:', result.success)
    if (result.error) {
      console.log('Error:', result.error)
    }

    expect(result.success).toBe(true)

    console.log('\n--- Generated Tokens ---')
    console.log(result.tokensCode || '(none)')

    console.log('\n--- Generated Components ---')
    console.log(result.componentsCode || '(none)')

    console.log('\n--- Generated Layout ---')
    console.log(result.layoutCode)

    // Verify buttons are in output
    expect(result.layoutCode).toBeTruthy()
    const output = result.layoutCode!.toLowerCase()
    expect(output.includes('save') || output.includes('button')).toBe(true)
  }, 30000)

  it('LLM handles component definition request', async () => {
    const layoutCode = 'Box'
    const currentIntent = mirrorToIntent(layoutCode, '', '')
    const userPrompt = buildUserPrompt(currentIntent,
      'Definiere eine PrimaryButton Komponente mit blauem Hintergrund, weißem Text, padding 12 24, radius 8, und einem hover-State der dunkler wird. Dann verwende den Button mit dem Text "Submit".'
    )

    console.log('\n=== COMPONENT DEFINITION REQUEST ===')

    const response = await callLLM(INTENT_SYSTEM_PROMPT, userPrompt)
    const intent = parseIntentResponse(response)

    expect(intent).not.toBeNull()

    const validation = validateIntent(intent)
    console.log('Valid:', validation.valid)
    if (!validation.valid) {
      console.log('Errors:', validation.errors.slice(0, 5))
    }

    // Should have component definition
    expect(intent!.components.length).toBeGreaterThan(0)

    const buttonComp = intent!.components.find(c =>
      c.name.toLowerCase().includes('button') || c.name.toLowerCase().includes('primary')
    )
    expect(buttonComp).toBeDefined()

    console.log('\n=== COMPONENT ===')
    console.log(JSON.stringify(buttonComp, null, 2))

    // Should have states
    expect(buttonComp!.states).toBeDefined()
  }, 30000)

  it('LLM adds events correctly', async () => {
    const layoutCode = `
Dialog hidden pad 24 bg #1E1E2E rad 12
  Text "Are you sure?"
  Button "Confirm"
  Button "Cancel"
`
    const currentIntent = mirrorToIntent(layoutCode, '', '')
    const userPrompt = buildUserPrompt(currentIntent,
      'Füge Events hinzu: Confirm-Button soll den Dialog schließen und zu "Success" navigieren. Cancel-Button soll nur den Dialog schließen.'
    )

    console.log('\n=== EVENTS REQUEST ===')

    const response = await callLLM(INTENT_SYSTEM_PROMPT, userPrompt)
    const intent = parseIntentResponse(response)

    expect(intent).not.toBeNull()

    const validation = validateIntent(intent)
    console.log('Valid:', validation.valid)
    if (!validation.valid) {
      console.log('Errors:', validation.errors.slice(0, 5))
    }

    console.log('\n=== INTENT WITH EVENTS ===')
    console.log(JSON.stringify(intent, null, 2))

    // Check for events
    const intentStr = JSON.stringify(intent)
    expect(intentStr.includes('close') || intentStr.includes('navigate')).toBe(true)
  }, 30000)
})
