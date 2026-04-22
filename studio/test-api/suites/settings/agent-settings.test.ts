/**
 * Agent Settings Test Suite
 *
 * Tests for the AI Agent settings in the Settings Panel:
 * 1. Agent type selection (OpenRouter, Anthropic SDK, Claude CLI)
 * 2. Conditional field display based on agent type
 * 3. API key persistence to localStorage
 */

import type { TestCase, TestAPI } from '../../types'
import { describe, test } from '../../index'

// =============================================================================
// Helper Functions
// =============================================================================

function getSettingsPanel(): HTMLElement | null {
  return document.querySelector('.settings-panel') as HTMLElement
}

function getSettingsButton(): HTMLElement | null {
  return document.querySelector(
    '[data-action="settings"], .settings-button, [title*="Settings"]'
  ) as HTMLElement
}

function getAgentTypeSelect(): HTMLSelectElement | null {
  return document.querySelector('select[data-setting="agent.type"]') as HTMLSelectElement
}

function getAnthropicApiKeyInput(): HTMLInputElement | null {
  return document.querySelector('input[data-setting="agent.anthropicApiKey"]') as HTMLInputElement
}

function getOpenrouterApiKeyInput(): HTMLInputElement | null {
  return document.querySelector('input[data-setting="agent.openrouterApiKey"]') as HTMLInputElement
}

function getAnthropicFields(): HTMLElement | null {
  return document.querySelector('.anthropic-fields') as HTMLElement
}

function getOpenrouterFields(): HTMLElement | null {
  return document.querySelector('.openrouter-fields') as HTMLElement
}

function getClaudeCliFields(): HTMLElement | null {
  return document.querySelector('.claude-cli-fields') as HTMLElement
}

async function openSettingsPanel(): Promise<boolean> {
  // Try to find and click settings button
  const btn = getSettingsButton()
  if (btn) {
    btn.click()
    await new Promise(r => setTimeout(r, 300))
    return getSettingsPanel() !== null
  }

  // Try keyboard shortcut (Cmd+,)
  const event = new KeyboardEvent('keydown', {
    key: ',',
    metaKey: true,
    bubbles: true,
  })
  document.dispatchEvent(event)
  await new Promise(r => setTimeout(r, 300))
  return getSettingsPanel() !== null
}

function closeSettingsPanel(): void {
  const closeBtn = document.querySelector('.settings-panel .pp-close') as HTMLElement
  if (closeBtn) {
    closeBtn.click()
  }
}

// =============================================================================
// Agent Settings Tests
// =============================================================================

export const agentSettingsTests: TestCase[] = describe('Agent Settings', [
  test('Settings panel has AI Agent section', async (api: TestAPI) => {
    // Open settings panel
    const opened = await openSettingsPanel()
    if (!opened) {
      // Settings panel might not be available in test environment
      api.utils.log('Settings panel not available - skipping test')
      return
    }

    await api.utils.delay(200)

    // Check for AI Agent section
    const panel = getSettingsPanel()
    api.assert.ok(panel !== null, 'Settings panel should be visible')

    const sectionLabel = panel?.querySelector('.section-label')
    const hasAgentSection = panel?.textContent?.includes('AI Agent')
    api.assert.ok(hasAgentSection || false, 'Settings panel should have AI Agent section')

    // Check for agent type dropdown
    const typeSelect = getAgentTypeSelect()
    api.assert.ok(typeSelect !== null, 'Agent type select should exist')

    closeSettingsPanel()
  }),

  test('Agent type dropdown has all options', async (api: TestAPI) => {
    const opened = await openSettingsPanel()
    if (!opened) {
      api.utils.log('Settings panel not available - skipping test')
      return
    }

    await api.utils.delay(200)

    const typeSelect = getAgentTypeSelect()
    api.assert.ok(typeSelect !== null, 'Agent type select should exist')

    if (typeSelect) {
      const options = Array.from(typeSelect.options).map(o => o.value)
      api.assert.ok(options.includes('openrouter'), 'Should have openrouter option')
      api.assert.ok(options.includes('anthropic-sdk'), 'Should have anthropic-sdk option')
      api.assert.ok(options.includes('claude-cli'), 'Should have claude-cli option')
    }

    closeSettingsPanel()
  }),

  test('Selecting Anthropic SDK shows API key field', async (api: TestAPI) => {
    const opened = await openSettingsPanel()
    if (!opened) {
      api.utils.log('Settings panel not available - skipping test')
      return
    }

    await api.utils.delay(200)

    const typeSelect = getAgentTypeSelect()
    api.assert.ok(typeSelect !== null, 'Agent type select should exist')

    if (typeSelect) {
      // Select Anthropic SDK
      typeSelect.value = 'anthropic-sdk'
      typeSelect.dispatchEvent(new Event('change', { bubbles: true }))
      await api.utils.delay(100)

      // Check visibility of fields
      const anthropicFields = getAnthropicFields()
      const openrouterFields = getOpenrouterFields()

      api.assert.ok(anthropicFields?.style.display !== 'none', 'Anthropic fields should be visible')
      api.assert.ok(
        openrouterFields?.style.display === 'none',
        'OpenRouter fields should be hidden'
      )

      // Check for API key input
      const apiKeyInput = getAnthropicApiKeyInput()
      api.assert.ok(apiKeyInput !== null, 'Anthropic API key input should exist')
    }

    closeSettingsPanel()
  }),

  test('Selecting OpenRouter shows API key field', async (api: TestAPI) => {
    const opened = await openSettingsPanel()
    if (!opened) {
      api.utils.log('Settings panel not available - skipping test')
      return
    }

    await api.utils.delay(200)

    const typeSelect = getAgentTypeSelect()
    api.assert.ok(typeSelect !== null, 'Agent type select should exist')

    if (typeSelect) {
      // Select OpenRouter
      typeSelect.value = 'openrouter'
      typeSelect.dispatchEvent(new Event('change', { bubbles: true }))
      await api.utils.delay(100)

      // Check visibility of fields
      const anthropicFields = getAnthropicFields()
      const openrouterFields = getOpenrouterFields()

      api.assert.ok(anthropicFields?.style.display === 'none', 'Anthropic fields should be hidden')
      api.assert.ok(
        openrouterFields?.style.display !== 'none',
        'OpenRouter fields should be visible'
      )

      // Check for API key input
      const apiKeyInput = getOpenrouterApiKeyInput()
      api.assert.ok(apiKeyInput !== null, 'OpenRouter API key input should exist')
    }

    closeSettingsPanel()
  }),

  test('Selecting Claude CLI shows info text', async (api: TestAPI) => {
    const opened = await openSettingsPanel()
    if (!opened) {
      api.utils.log('Settings panel not available - skipping test')
      return
    }

    await api.utils.delay(200)

    const typeSelect = getAgentTypeSelect()
    api.assert.ok(typeSelect !== null, 'Agent type select should exist')

    if (typeSelect) {
      // Select Claude CLI
      typeSelect.value = 'claude-cli'
      typeSelect.dispatchEvent(new Event('change', { bubbles: true }))
      await api.utils.delay(100)

      // Check visibility of fields
      const anthropicFields = getAnthropicFields()
      const openrouterFields = getOpenrouterFields()
      const cliFields = getClaudeCliFields()

      api.assert.ok(anthropicFields?.style.display === 'none', 'Anthropic fields should be hidden')
      api.assert.ok(
        openrouterFields?.style.display === 'none',
        'OpenRouter fields should be hidden'
      )
      api.assert.ok(cliFields?.style.display !== 'none', 'Claude CLI fields should be visible')
    }

    closeSettingsPanel()
  }),

  test('API key is saved to localStorage', async (api: TestAPI) => {
    const opened = await openSettingsPanel()
    if (!opened) {
      api.utils.log('Settings panel not available - skipping test')
      return
    }

    await api.utils.delay(200)

    const typeSelect = getAgentTypeSelect()
    if (!typeSelect) {
      api.utils.log('Agent type select not found - skipping test')
      closeSettingsPanel()
      return
    }

    // Select Anthropic SDK
    typeSelect.value = 'anthropic-sdk'
    typeSelect.dispatchEvent(new Event('change', { bubbles: true }))
    await api.utils.delay(100)

    const apiKeyInput = getAnthropicApiKeyInput()
    if (!apiKeyInput) {
      api.utils.log('API key input not found - skipping test')
      closeSettingsPanel()
      return
    }

    // Enter a test API key
    const testKey = 'sk-ant-test-key-12345'
    apiKeyInput.value = testKey
    apiKeyInput.dispatchEvent(new Event('change', { bubbles: true }))
    await api.utils.delay(500) // Wait for debounced save

    // Check localStorage
    const stored = localStorage.getItem('mirror-user-settings')
    api.assert.ok(stored !== null, 'User settings should be saved to localStorage')

    if (stored) {
      const settings = JSON.parse(stored)
      api.assert.ok(
        settings.agentSettings?.anthropicApiKey === testKey,
        'API key should be stored in localStorage'
      )
    }

    // Clean up - remove test key
    apiKeyInput.value = ''
    apiKeyInput.dispatchEvent(new Event('change', { bubbles: true }))
    await api.utils.delay(500)

    closeSettingsPanel()
  }),

  test('Agent type selection is persisted', async (api: TestAPI) => {
    const opened = await openSettingsPanel()
    if (!opened) {
      api.utils.log('Settings panel not available - skipping test')
      return
    }

    await api.utils.delay(200)

    const typeSelect = getAgentTypeSelect()
    if (!typeSelect) {
      api.utils.log('Agent type select not found - skipping test')
      closeSettingsPanel()
      return
    }

    // Select Anthropic SDK
    typeSelect.value = 'anthropic-sdk'
    typeSelect.dispatchEvent(new Event('change', { bubbles: true }))
    await api.utils.delay(500) // Wait for debounced save

    // Check localStorage
    const stored = localStorage.getItem('mirror-user-settings')
    api.assert.ok(stored !== null, 'User settings should be saved to localStorage')

    if (stored) {
      const settings = JSON.parse(stored)
      api.assert.ok(
        settings.agentSettings?.type === 'anthropic-sdk',
        'Agent type should be stored in localStorage'
      )
    }

    // Reset to openrouter
    typeSelect.value = 'openrouter'
    typeSelect.dispatchEvent(new Event('change', { bubbles: true }))
    await api.utils.delay(500)

    closeSettingsPanel()
  }),
])

// Export all tests
export const allAgentSettingsTests = agentSettingsTests
