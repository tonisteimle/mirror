/**
 * Custom Vitest Matchers für Mirror Dokumentations-Tests
 */

import { expect } from 'vitest'

/**
 * Konvertiert Hex-Farbe zu RGB-String
 */
function hexToRgb(hex: string): string | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!result) return null
  const r = parseInt(result[1], 16)
  const g = parseInt(result[2], 16)
  const b = parseInt(result[3], 16)
  return `rgb(${r}, ${g}, ${b})`
}

/**
 * Normalisiert eine Farbe zu lowercase hex oder rgb
 */
function normalizeColor(color: string): string {
  if (!color) return ''
  const trimmed = color.trim().toLowerCase()

  // Bereits RGB
  if (trimmed.startsWith('rgb')) {
    // Normalisiere Leerzeichen: rgb(59,130,246) -> rgb(59, 130, 246)
    return trimmed.replace(/,\s*/g, ', ')
  }

  // Hex -> RGB
  const rgb = hexToRgb(trimmed)
  return rgb || trimmed
}

/**
 * Prüft, ob zwei Farben gleich sind (Hex oder RGB)
 */
export function colorsMatch(actual: string, expected: string): boolean {
  return normalizeColor(actual) === normalizeColor(expected)
}

// Custom Matchers für Vitest
expect.extend({
  /**
   * Prüft Hintergrundfarbe (akzeptiert Hex und RGB)
   *
   * @example
   * expect(element).toHaveBackgroundColor('#3B82F6')
   * expect(element).toHaveBackgroundColor('rgb(59, 130, 246)')
   */
  toHaveBackgroundColor(received: HTMLElement, expected: string) {
    const actual = received.style.backgroundColor
    const pass = colorsMatch(actual, expected)

    return {
      pass,
      message: () =>
        pass
          ? `expected element not to have background-color ${expected}`
          : `expected element to have background-color ${expected}, but got ${actual}`,
    }
  },

  /**
   * Prüft Textfarbe (akzeptiert Hex und RGB)
   */
  toHaveTextColor(received: HTMLElement, expected: string) {
    const actual = received.style.color
    const pass = colorsMatch(actual, expected)

    return {
      pass,
      message: () =>
        pass
          ? `expected element not to have color ${expected}`
          : `expected element to have color ${expected}, but got ${actual}`,
    }
  },

  /**
   * Prüft, ob Element einen bestimmten Inline-Style hat
   */
  toHaveInlineStyle(
    received: HTMLElement,
    property: string,
    expected: string
  ) {
    const actual = (received.style as any)[property]
    const pass = actual === expected

    return {
      pass,
      message: () =>
        pass
          ? `expected element not to have ${property}: ${expected}`
          : `expected element to have ${property}: ${expected}, but got ${actual}`,
    }
  },

  /**
   * Prüft data-state Attribut
   */
  toHaveDataState(received: HTMLElement, expected: string) {
    const actual = received.getAttribute('data-state')
    const pass = actual === expected

    return {
      pass,
      message: () =>
        pass
          ? `expected element not to have data-state="${expected}"`
          : `expected element to have data-state="${expected}", but got "${actual}"`,
    }
  },

  /**
   * Prüft, ob Element sichtbar ist (display !== none)
   */
  toBeVisible(received: HTMLElement) {
    const display = received.style.display
    const pass = display !== 'none' && display !== ''

    return {
      pass,
      message: () =>
        pass
          ? `expected element to be hidden`
          : `expected element to be visible, but display is "${display}"`,
    }
  },
})

// TypeScript-Deklarationen für Custom Matchers
declare module 'vitest' {
  interface Assertion<T = any> {
    toHaveBackgroundColor(expected: string): T
    toHaveTextColor(expected: string): T
    toHaveInlineStyle(property: string, expected: string): T
    toHaveDataState(expected: string): T
    toBeVisible(): T
  }
  interface AsymmetricMatchersContaining {
    toHaveBackgroundColor(expected: string): any
    toHaveTextColor(expected: string): any
    toHaveInlineStyle(property: string, expected: string): any
    toHaveDataState(expected: string): any
    toBeVisible(): any
  }
}
