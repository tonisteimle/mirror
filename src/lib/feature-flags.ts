/**
 * Feature Flags Module
 *
 * Simple feature flag system using localStorage for browser
 * and overrides for testing.
 */

// =============================================================================
// Flag Definitions
// =============================================================================

const FLAGS = {
  INTENT_PIPELINE: 'mirror-flag-intent-pipeline',
  RATE_LIMITING: 'mirror-flag-rate-limiting',
  SELF_HEALING_V2: 'mirror-flag-self-healing-v2',
  RESPONSE_CACHE: 'mirror-flag-response-cache',
  INPUT_SANITIZATION: 'mirror-flag-input-sanitization',
} as const

type FlagName = keyof typeof FLAGS

const DEFAULTS: Record<FlagName, boolean> = {
  INTENT_PIPELINE: true,   // Intent Pipeline aktiviert
  RATE_LIMITING: true,     // Rate limiting aktiviert
  SELF_HEALING_V2: false,  // Self-healing V2 (modular) - noch in Entwicklung
  RESPONSE_CACHE: false,   // Response caching - noch in Entwicklung
  INPUT_SANITIZATION: true, // Input sanitization aktiviert
}

// =============================================================================
// Override Storage (for testing)
// =============================================================================

const overrides: Map<FlagName, boolean> = new Map()

// =============================================================================
// Public API
// =============================================================================

/**
 * Get the value of a feature flag
 *
 * Priority:
 * 1. Test override (if set)
 * 2. localStorage (if available)
 * 3. Default value
 */
export function getFeatureFlag(name: FlagName): boolean {
  // Check test override first
  if (overrides.has(name)) {
    return overrides.get(name)!
  }

  // Check localStorage
  try {
    const stored = localStorage.getItem(FLAGS[name])
    if (stored !== null) {
      return stored === 'true'
    }
  } catch {
    // localStorage not available (SSR, etc.)
  }

  // Return default
  return DEFAULTS[name]
}

/**
 * Set a feature flag value (persists to localStorage)
 */
export function setFeatureFlag(name: FlagName, value: boolean): void {
  try {
    localStorage.setItem(FLAGS[name], String(value))
  } catch {
    // localStorage not available
  }
}

/**
 * Clear a feature flag (reverts to default)
 */
export function clearFeatureFlag(name: FlagName): void {
  try {
    localStorage.removeItem(FLAGS[name])
  } catch {
    // localStorage not available
  }
}

// =============================================================================
// Testing Utilities
// =============================================================================

/**
 * Override a feature flag for testing (bypasses localStorage)
 */
export function overrideFeatureFlag(name: FlagName, value: boolean): void {
  overrides.set(name, value)
}

/**
 * Clear all test overrides
 */
export function clearFeatureFlagOverrides(): void {
  overrides.clear()
}

/**
 * Clear a specific test override
 */
export function clearFeatureFlagOverride(name: FlagName): void {
  overrides.delete(name)
}

// =============================================================================
// Convenience Helpers
// =============================================================================

/**
 * Check if the Intent Pipeline is enabled
 */
export function isIntentPipelineEnabled(): boolean {
  return getFeatureFlag('INTENT_PIPELINE')
}

/**
 * Enable the Intent Pipeline
 */
export function enableIntentPipeline(): void {
  setFeatureFlag('INTENT_PIPELINE', true)
}

/**
 * Disable the Intent Pipeline
 */
export function disableIntentPipeline(): void {
  setFeatureFlag('INTENT_PIPELINE', false)
}

// =============================================================================
// Rate Limiting Helpers
// =============================================================================

/**
 * Check if Rate Limiting is enabled
 */
export function isRateLimitingEnabled(): boolean {
  return getFeatureFlag('RATE_LIMITING')
}

/**
 * Enable Rate Limiting
 */
export function enableRateLimiting(): void {
  setFeatureFlag('RATE_LIMITING', true)
}

/**
 * Disable Rate Limiting
 */
export function disableRateLimiting(): void {
  setFeatureFlag('RATE_LIMITING', false)
}

// =============================================================================
// Self-Healing V2 Helpers
// =============================================================================

/**
 * Check if Self-Healing V2 is enabled
 */
export function isSelfHealingV2Enabled(): boolean {
  return getFeatureFlag('SELF_HEALING_V2')
}

/**
 * Enable Self-Healing V2
 */
export function enableSelfHealingV2(): void {
  setFeatureFlag('SELF_HEALING_V2', true)
}

/**
 * Disable Self-Healing V2
 */
export function disableSelfHealingV2(): void {
  setFeatureFlag('SELF_HEALING_V2', false)
}

// =============================================================================
// Response Cache Helpers
// =============================================================================

/**
 * Check if Response Cache is enabled
 */
export function isResponseCacheEnabled(): boolean {
  return getFeatureFlag('RESPONSE_CACHE')
}

/**
 * Enable Response Cache
 */
export function enableResponseCache(): void {
  setFeatureFlag('RESPONSE_CACHE', true)
}

/**
 * Disable Response Cache
 */
export function disableResponseCache(): void {
  setFeatureFlag('RESPONSE_CACHE', false)
}

// =============================================================================
// Input Sanitization Helpers
// =============================================================================

/**
 * Check if Input Sanitization is enabled
 */
export function isInputSanitizationEnabled(): boolean {
  return getFeatureFlag('INPUT_SANITIZATION')
}

/**
 * Enable Input Sanitization
 */
export function enableInputSanitization(): void {
  setFeatureFlag('INPUT_SANITIZATION', true)
}

/**
 * Disable Input Sanitization
 */
export function disableInputSanitization(): void {
  setFeatureFlag('INPUT_SANITIZATION', false)
}
