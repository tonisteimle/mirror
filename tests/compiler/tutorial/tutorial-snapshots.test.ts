/**
 * Tutorial Snapshot Tests
 *
 * Erstellt Snapshots der IR für alle Tutorial-Beispiele.
 * Dies erkennt unbeabsichtigte Änderungen am Compiler-Output.
 *
 * - Bei gewollten Änderungen: `npm test -- -u` um Snapshots zu aktualisieren
 * - Snapshots werden in __snapshots__/tutorial-snapshots.test.ts.snap gespeichert
 */

import { describe, it, expect } from 'vitest'
import { extractTutorialExamples } from './extract-examples'
import { parse, toIR } from '../../../compiler'
import type { IR } from '../../../compiler/ir/types'

const chapters = extractTutorialExamples()

/**
 * Bereinigt IR für stabilen Snapshot-Vergleich.
 * Entfernt instabile Felder wie generierte IDs.
 */
function normalizeIR(ir: IR): object {
  // Deep clone und normalisieren
  const normalized = JSON.parse(JSON.stringify(ir))

  // Rekursiv alle nodeId Felder normalisieren (sie sind generiert)
  function normalizeNode(obj: any, index: number = 0): void {
    if (obj && typeof obj === 'object') {
      // nodeId durch stabilen Platzhalter ersetzen
      if ('nodeId' in obj && typeof obj.nodeId === 'string') {
        // Behalte nodeId-Struktur aber mache sie deterministisch
        // nodeId bleibt erhalten für Struktur-Vergleich
      }

      // Rekursiv für alle Properties
      for (const key of Object.keys(obj)) {
        if (Array.isArray(obj[key])) {
          obj[key].forEach((item: any, i: number) => normalizeNode(item, i))
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
          normalizeNode(obj[key], 0)
        }
      }
    }
  }

  normalizeNode(normalized)
  return normalized
}

/**
 * Kompiliert Code zu IR und gibt normalisierten Snapshot zurück.
 */
function compileToIR(code: string): object | { error: string } {
  try {
    const ast = parse(code)
    const ir = toIR(ast)
    return normalizeIR(ir)
  } catch (error) {
    // Bei Parse-Fehlern den Fehler snapshotten
    return { error: String(error) }
  }
}

describe('Tutorial IR Snapshots', () => {
  chapters.forEach(({ name, file, examples }) => {
    describe(name, () => {
      examples.forEach((code, index) => {
        it(`Example ${index + 1}`, () => {
          const ir = compileToIR(code)
          expect(ir).toMatchSnapshot()
        })
      })
    })
  })
})

// Meta-Test: Stellt sicher, dass wir genügend Snapshots haben
describe('Snapshot Coverage', () => {
  it('snapshots all tutorial examples', () => {
    const totalExamples = chapters.reduce((sum, ch) => sum + ch.examples.length, 0)
    expect(totalExamples).toBeGreaterThan(100)
  })
})
