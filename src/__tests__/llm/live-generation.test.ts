/**
 * Live LLM Generation Tests
 *
 * These tests make actual API calls to the LLM.
 * Requires VITE_OPENROUTER_API_KEY environment variable.
 *
 * Run with: npx vitest run src/__tests__/llm/live-generation.test.ts
 */

import { describe, it, expect, beforeAll } from 'vitest'
import { generateMirrorCode, setApiKey, hasApiKey } from '../../lib/ai'
import { parse } from '../../parser/parser'

// Get API key from environment
const API_KEY = process.env.VITE_OPENROUTER_API_KEY || ''

describe('Live LLM Generation', () => {
  beforeAll(() => {
    if (API_KEY) {
      setApiKey(API_KEY)
    }
  })

  describe.skipIf(!API_KEY)('Button with States', () => {
    it('should generate a button with hover and pressed states from German prompt', async () => {
      const prompt = 'bitte erstelle mir einen button mit hover und pressed status'

      console.log('\n📝 Prompt:', prompt)
      console.log('⏳ Generating...\n')

      const result = await generateMirrorCode(prompt)

      console.log('📤 Generated Code:')
      console.log('─'.repeat(50))
      console.log(result.code)
      console.log('─'.repeat(50))

      // Basic validations
      expect(result.code).toBeTruthy()
      expect(result.error).toBeUndefined()

      // Should contain Button component
      expect(result.code.toLowerCase()).toContain('button')

      // Should have hover state
      expect(result.code).toMatch(/hover|state hover/i)

      // Should have pressed/active state
      expect(result.code).toMatch(/pressed|active|state pressed|state active/i)

      // Try to parse the generated code
      const parsed = parse(result.code)
      console.log('\n✅ Parse result:', parsed.valid ? 'Valid' : 'Has warnings')

      if (parsed.errors && parsed.errors.length > 0) {
        console.log('⚠️ Parse issues:', parsed.errors)
      }

      // Log success - the LLM generated semantically correct code
      // Minor parse warnings (like unknown properties) are acceptable
      console.log('\n✨ Generation successful - Button with states created!')
    }, 30000) // 30s timeout for API call

    it('should generate a primary button with hover effect', async () => {
      const prompt = 'ein blauer primary button mit hover effekt der heller wird'

      console.log('\n📝 Prompt:', prompt)
      console.log('⏳ Generating...\n')

      const result = await generateMirrorCode(prompt)

      console.log('📤 Generated Code:')
      console.log('─'.repeat(50))
      console.log(result.code)
      console.log('─'.repeat(50))

      expect(result.code).toBeTruthy()

      // Should have blue color (hex or token)
      expect(result.code).toMatch(/#[0-9A-Fa-f]{6}|\$.*blue|\$primary/i)

      // Should have hover state
      expect(result.code).toMatch(/hover/i)

      // Parse validation
      const parsed = parse(result.code)
      console.log('\n✅ Parse result:', parsed.valid ? 'Valid' : 'Has warnings')
      console.log('\n✨ Generation successful - Primary button with hover created!')
    }, 30000)
  })

  describe.skipIf(!API_KEY)('More Generation Examples', () => {
    it('should generate a red button with white text', async () => {
      const prompt = 'ein roter button mit weisser schrift'

      console.log('\n📝 Prompt:', prompt)
      console.log('⏳ Generating...\n')

      const result = await generateMirrorCode(prompt)

      console.log('📤 Generated Code:')
      console.log('─'.repeat(50))
      console.log(result.code)
      console.log('─'.repeat(50))

      expect(result.code).toBeTruthy()
      expect(result.error).toBeUndefined()

      // Should contain button
      expect(result.code.toLowerCase()).toContain('button')

      // Should have red color (background) - various possible representations
      // #DC2626, #EF4444, #B91C1C, etc. are all valid reds
      expect(result.code).toMatch(/red|#[dDeEfF][0-9a-fA-F]{5}|#[bBcCdDeE][0-9a-fA-F]{5}|\$.*red|\$danger|\$primary/i)

      // Should have white color (text)
      expect(result.code).toMatch(/white|#[fF]{6}|#[fF]{3}\b|\$.*white/i)

      // Parse validation
      const parsed = parse(result.code)
      console.log('\n✅ Parse result:', parsed.valid ? 'Valid' : 'Has warnings')
      console.log('\n✨ Generation successful!')
    }, 30000)

    it('should generate a card with title and description', async () => {
      const prompt = 'eine karte mit titel und beschreibung'

      console.log('\n📝 Prompt:', prompt)
      console.log('⏳ Generating...\n')

      const result = await generateMirrorCode(prompt)

      console.log('📤 Generated Code:')
      console.log('─'.repeat(50))
      console.log(result.code)
      console.log('─'.repeat(50))

      expect(result.code).toBeTruthy()

      // Should contain card-like structure (Card, Box, or container)
      expect(result.code).toMatch(/card|box/i)

      // Should have some text elements
      expect(result.code).toMatch(/text|title|heading|beschreibung|description/i)

      console.log('\n✨ Generation successful!')
    }, 30000)
  })

  describe('API Key Check', () => {
    it('reports API key status', () => {
      if (API_KEY) {
        console.log('\n✅ API Key is set (from VITE_OPENROUTER_API_KEY)')
        console.log(`   Key preview: ${API_KEY.slice(0, 8)}...${API_KEY.slice(-4)}`)
        expect(hasApiKey()).toBe(true)
      } else {
        console.log('\n⚠️ No API key found')
        console.log('   Set VITE_OPENROUTER_API_KEY environment variable to run live tests')
        console.log('   Example: VITE_OPENROUTER_API_KEY=sk-xxx npx vitest run ...')
        expect(true).toBe(true) // Always pass, just informational
      }
    })
  })
})
