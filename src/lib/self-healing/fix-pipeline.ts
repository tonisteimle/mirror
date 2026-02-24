/**
 * Fix Pipeline
 *
 * Orchestrates the application of all fixes in the correct order.
 */

import type { Fix, FixPhase } from './types'
import type { FixStats } from './telemetry'
import { cssCleanupFixes } from './fixes/css-fixes'
import { colorValueFixes } from './fixes/color-fixes'
import { tokenFixes } from './fixes/token-fixes'
import { typoFixes } from './fixes/typo-fixes'
import { structuralFixes } from './fixes/structural-fixes'
import { valueFixes } from './fixes/value-fixes'
import {
  trackFixApplication as trackFix,
  getFixStats as getTelemetryStats,
  resetGlobalTelemetry,
} from './telemetry'

// =============================================================================
// Fix Registry
// =============================================================================

/**
 * All fixes organized by phase.
 */
const FIXES_BY_PHASE: Record<FixPhase, Fix[]> = {
  'css-cleanup': cssCleanupFixes,
  'color-value': colorValueFixes,
  'token': tokenFixes,
  'typo': typoFixes,
  'structural': structuralFixes,
  'value': valueFixes,
}

/**
 * Ordered list of phases for execution.
 */
const PHASE_ORDER: FixPhase[] = [
  'css-cleanup',
  'color-value',
  'token',
  'typo',
  'structural',
  'value',
]

/**
 * Get all registered fixes in order.
 */
export function getAllFixes(): Fix[] {
  const fixes: Fix[] = []
  for (const phase of PHASE_ORDER) {
    fixes.push(...FIXES_BY_PHASE[phase])
  }
  return fixes
}

/**
 * Get fixes for a specific phase.
 */
export function getFixesForPhase(phase: FixPhase): Fix[] {
  return FIXES_BY_PHASE[phase] || []
}

// =============================================================================
// Telemetry (delegates to telemetry module)
// =============================================================================

// Telemetry is disabled by default, enable with enableTelemetry()
let telemetryEnabled = false

/**
 * Enable fix telemetry tracking.
 */
export function enableTelemetry(): void {
  telemetryEnabled = true
}

/**
 * Disable fix telemetry tracking.
 */
export function disableTelemetry(): void {
  telemetryEnabled = false
}

/**
 * Get statistics about fix applications.
 */
export function getFixStats(): FixStats {
  return getTelemetryStats()
}

/**
 * Clear telemetry data.
 */
export function clearTelemetry(): void {
  resetGlobalTelemetry()
}

// =============================================================================
// Fix Application
// =============================================================================

/**
 * Apply a single fix and track changes.
 */
function applyFix(code: string, fix: Fix): string {
  const startTime = telemetryEnabled ? performance.now() : 0
  const before = code
  const after = fix.fn(code)
  const changed = before !== after

  if (telemetryEnabled) {
    const durationMs = performance.now() - startTime
    trackFix(fix.name, changed, {
      durationMs,
      inputSize: before.length,
      outputSize: after.length,
    })
  }

  return after
}

/**
 * Apply all algorithmic fixes to generated code.
 *
 * This is the main entry point for the self-healing system.
 */
export function applyAllFixes(code: string): string {
  let result = code

  for (const phase of PHASE_ORDER) {
    const fixes = FIXES_BY_PHASE[phase]
    for (const fix of fixes) {
      result = applyFix(result, fix)
    }
  }

  return result
}
