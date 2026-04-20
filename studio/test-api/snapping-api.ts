/**
 * Snapping Test API
 *
 * Provides direct access to the snapping service for testing and debugging.
 * This allows tests to:
 * - Check if snapping service is initialized
 * - Get parsed tokens
 * - Test snap results directly
 * - Debug snapping behavior during drag operations
 */

import {
  getSnappingService,
  initSnappingService,
  resetSnappingService,
  type SnapResult,
  type SpacingToken,
  type SpacingPropertyType,
} from '../visual/snapping-service'
import { handleSnapSettings, gridSettings } from '../core'

// =============================================================================
// Types
// =============================================================================

export interface SnappingDebugInfo {
  /** Whether the snapping service is initialized */
  initialized: boolean
  /** Current source code being used */
  sourceLength: number
  /** Parsed spacing tokens */
  tokens: {
    all: SpacingToken[]
    pad: SpacingToken[]
    mar: SpacingToken[]
    gap: SpacingToken[]
  }
  /** Current settings */
  settings: {
    handleSnap: {
      enabled: boolean
      threshold: number
      gridSize: number
      tokenSnapping: boolean
    }
    grid: {
      enabled: boolean
      size: number
    }
  }
}

export interface SnapTestResult {
  /** Input value */
  input: number
  /** Property type */
  propertyType: SpacingPropertyType
  /** Snap result */
  result: SnapResult
  /** Available tokens for this property type */
  availableTokens: SpacingToken[]
  /** Debug info */
  debug: {
    tokensExist: boolean
    closestToken: SpacingToken | null
    closestDistance: number | null
    wouldSnapToGrid: boolean
    gridValue: number | null
  }
}

// =============================================================================
// Snapping API Implementation
// =============================================================================

export interface SnappingAPI {
  /** Get debug info about snapping service state */
  getDebugInfo(): SnappingDebugInfo

  /** Test snapping for a specific value */
  testSnap(value: number, propertyType: SpacingPropertyType): SnapTestResult

  /** Reinitialize snapping service with current source */
  reinit(): void

  /** Reset snapping service (clear singleton) */
  reset(): void

  /** Get all parsed tokens */
  getTokens(propertyType?: SpacingPropertyType): SpacingToken[]

  /** Update settings for testing */
  updateSettings(settings: {
    enabled?: boolean
    threshold?: number
    gridSize?: number
    tokenSnapping?: boolean
  }): void

  /** Restore default settings */
  restoreDefaultSettings(): void

  /** Log snapping state to console (for debugging) */
  logState(): void

  /** Simulate a drag and check snapping at each step */
  simulateDrag(
    startValue: number,
    endValue: number,
    steps: number,
    propertyType: SpacingPropertyType
  ): Array<{ value: number; snapped: boolean; snapValue: number | null; tokenName: string | null }>
}

// Default settings for restoration
const DEFAULT_SETTINGS = {
  enabled: true,
  threshold: 4,
  gridSize: 8,
  tokenSnapping: true,
}

/**
 * Create the Snapping API
 */
export function createSnappingAPI(): SnappingAPI {
  const getSource = (): string => {
    const editor = (window as any).editor
    return editor?.state?.doc?.toString() ?? ''
  }

  return {
    getDebugInfo(): SnappingDebugInfo {
      const service = getSnappingService()
      const source = getSource()
      const handleSettings = handleSnapSettings.get()
      const gridSettingsValue = gridSettings.get()

      // Get tokens if service exists
      let allTokens: SpacingToken[] = []
      let padTokens: SpacingToken[] = []
      let marTokens: SpacingToken[] = []
      let gapTokens: SpacingToken[] = []

      if (service) {
        allTokens = service.getSpacingTokens()
        padTokens = service.getSpacingTokens('pad')
        marTokens = service.getSpacingTokens('mar')
        gapTokens = service.getSpacingTokens('gap')
      }

      return {
        initialized: service !== null,
        sourceLength: source.length,
        tokens: {
          all: allTokens,
          pad: padTokens,
          mar: marTokens,
          gap: gapTokens,
        },
        settings: {
          handleSnap: {
            enabled: handleSettings.enabled,
            threshold: handleSettings.threshold,
            gridSize: handleSettings.gridSize,
            tokenSnapping: handleSettings.tokenSnapping,
          },
          grid: {
            enabled: gridSettingsValue.enabled,
            size: gridSettingsValue.size,
          },
        },
      }
    },

    testSnap(value: number, propertyType: SpacingPropertyType): SnapTestResult {
      const service = getSnappingService()

      if (!service) {
        // Try to initialize
        initSnappingService(getSource)
      }

      const activeService = getSnappingService()
      const availableTokens = activeService?.getSpacingTokens(propertyType) ?? []
      const settings = handleSnapSettings.get()

      // Find closest token for debug info
      let closestToken: SpacingToken | null = null
      let closestDistance: number | null = null
      for (const token of availableTokens) {
        const distance = Math.abs(value - token.value)
        if (closestDistance === null || distance < closestDistance) {
          closestToken = token
          closestDistance = distance
        }
      }

      // Calculate grid snap value
      const gridSize = settings.gridSize
      const gridValue = Math.round(value / gridSize) * gridSize
      const wouldSnapToGrid = availableTokens.length === 0 && gridValue !== value

      // Get actual snap result
      const result = activeService?.snapSpacing(value, propertyType) ?? {
        value,
        snapped: false,
      }

      return {
        input: value,
        propertyType,
        result,
        availableTokens,
        debug: {
          tokensExist: availableTokens.length > 0,
          closestToken,
          closestDistance,
          wouldSnapToGrid,
          gridValue,
        },
      }
    },

    reinit(): void {
      resetSnappingService()
      initSnappingService(getSource)
      console.log('Snapping service reinitialized')
    },

    reset(): void {
      resetSnappingService()
      console.log('Snapping service reset')
    },

    getTokens(propertyType?: SpacingPropertyType): SpacingToken[] {
      const service = getSnappingService()
      if (!service) return []
      return service.getSpacingTokens(propertyType)
    },

    updateSettings(settings: {
      enabled?: boolean
      threshold?: number
      gridSize?: number
      tokenSnapping?: boolean
    }): void {
      const current = handleSnapSettings.get()
      handleSnapSettings.set({
        ...current,
        ...settings,
      })
      console.log('Settings updated:', handleSnapSettings.get())
    },

    restoreDefaultSettings(): void {
      const current = handleSnapSettings.get()
      handleSnapSettings.set({
        ...current,
        ...DEFAULT_SETTINGS,
      })
      console.log('Settings restored to defaults')
    },

    logState(): void {
      const info = this.getDebugInfo()

      console.log('\n═══════════════════════════════════════')
      console.log('       SNAPPING SERVICE STATE')
      console.log('═══════════════════════════════════════')

      console.log(`\n📊 Status: ${info.initialized ? '✅ Initialized' : '❌ Not initialized'}`)
      console.log(`   Source length: ${info.sourceLength} chars`)

      console.log('\n⚙️  Settings:')
      console.log(`   Handle Snap Enabled: ${info.settings.handleSnap.enabled}`)
      console.log(`   Token Snapping: ${info.settings.handleSnap.tokenSnapping}`)
      console.log(`   Threshold: ${info.settings.handleSnap.threshold}px`)
      console.log(`   Grid Size: ${info.settings.handleSnap.gridSize}px`)
      console.log(`   Grid Enabled: ${info.settings.grid.enabled}`)

      console.log('\n🏷️  Parsed Tokens:')
      if (info.tokens.all.length === 0) {
        console.log('   (no tokens found)')
      } else {
        console.log(`   Total: ${info.tokens.all.length}`)
        if (info.tokens.pad.length > 0) {
          console.log(`   Padding: ${info.tokens.pad.map(t => `${t.name}=${t.value}`).join(', ')}`)
        }
        if (info.tokens.mar.length > 0) {
          console.log(`   Margin: ${info.tokens.mar.map(t => `${t.name}=${t.value}`).join(', ')}`)
        }
        if (info.tokens.gap.length > 0) {
          console.log(`   Gap: ${info.tokens.gap.map(t => `${t.name}=${t.value}`).join(', ')}`)
        }
      }

      console.log('\n═══════════════════════════════════════\n')
    },

    simulateDrag(
      startValue: number,
      endValue: number,
      steps: number,
      propertyType: SpacingPropertyType
    ): Array<{
      value: number
      snapped: boolean
      snapValue: number | null
      tokenName: string | null
    }> {
      const results: Array<{
        value: number
        snapped: boolean
        snapValue: number | null
        tokenName: string | null
      }> = []

      const increment = (endValue - startValue) / steps

      for (let i = 0; i <= steps; i++) {
        const currentValue = Math.round(startValue + increment * i)
        const snapResult = this.testSnap(currentValue, propertyType)

        results.push({
          value: currentValue,
          snapped: snapResult.result.snapped,
          snapValue: snapResult.result.snapped ? snapResult.result.value : null,
          tokenName: snapResult.result.tokenName ?? null,
        })
      }

      // Log summary
      console.log(`\n📈 Drag Simulation: ${startValue} → ${endValue} (${propertyType})`)
      console.log('─'.repeat(50))
      for (const r of results) {
        if (r.snapped) {
          console.log(`   ${r.value}px → 🎯 ${r.snapValue}px (${r.tokenName})`)
        } else {
          console.log(`   ${r.value}px → (no snap)`)
        }
      }
      console.log('─'.repeat(50))

      return results
    },
  }
}

// Singleton
let snappingAPI: SnappingAPI | null = null

export function getSnappingAPI(): SnappingAPI {
  if (!snappingAPI) {
    snappingAPI = createSnappingAPI()
  }
  return snappingAPI
}

/**
 * Setup snapping API on window for debugging
 */
export function setupSnappingAPI(): void {
  const api = getSnappingAPI()
  ;(window as any).__snapping = api
  console.log('🎯 Snapping API available at window.__snapping')
  console.log('   __snapping.logState()     - Show current state')
  console.log('   __snapping.testSnap(10, "pad") - Test snap value')
  console.log('   __snapping.simulateDrag(0, 20, 20, "pad") - Simulate drag')
}
