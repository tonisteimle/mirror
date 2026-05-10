/**
 * Preview CDP — barrel export.
 *
 * Bündelt alle preview-cdp Test-Wave-Files in eine Liste pro Sub-Bereich
 * (palette-drop, move, nesting, …) plus eine Gesamt-Liste für die
 * Top-Level-Kategorie. Konvention: jede Wave fügt eine neue Liste
 * hinzu; die Top-Level `previewCdpAllTests` ist nur das Concat aller
 * Sub-Listen.
 *
 * Plan-Doc: `docs/test-plan-preview-cdp.md`.
 */

import type { TestCase } from '../../types'

import { smokeTests } from './01-palette-drop/_smoke.test'

// Wave 1 — Smoke (verifies the helper layer is reachable).
export const previewCdpSmokeTests: TestCase[] = [...smokeTests]

// Wave 2+ — palette drop scenarios (filled wave-by-wave).
export const previewCdpPaletteDropTests: TestCase[] = []

// Aggregate — every wave above flows into this list.
export const previewCdpAllTests: TestCase[] = [
  ...previewCdpSmokeTests,
  ...previewCdpPaletteDropTests,
]
