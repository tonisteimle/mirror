/**
 * Tutorial Compilation Tests
 *
 * Prüft dass ALLE Beispiele aus den Tutorial-Kapiteln kompilieren.
 * Dies ist ein Smoke-Test der sicherstellt, dass die Dokumentation
 * immer funktionierenden Code enthält.
 *
 * Strategie:
 * - Automatisch extrahiert aus docs/tutorial/*.html
 * - Jedes Beispiel muss ohne Fehler kompilieren
 * - Keine DOM-Assertions, nur Compilation-Check
 */

import { describe, it, expect } from 'vitest'
import { extractTutorialExamples } from './extract-examples'
import { compile } from '../../../dist/index.js'

const chapters = extractTutorialExamples()

describe('Tutorial Examples Compile', () => {
  // Statistik ausgeben
  const totalExamples = chapters.reduce((sum, ch) => sum + ch.examples.length, 0)
  console.log(`\nTesting ${totalExamples} examples from ${chapters.length} chapters`)

  chapters.forEach(({ name, file, examples }) => {
    describe(name, () => {
      examples.forEach((code, index) => {
        it(`Example ${index + 1} compiles`, () => {
          // Compilation sollte keine Exception werfen
          expect(() => {
            compile(code)
          }).not.toThrow()
        })
      })
    })
  })
})

// Zusätzlicher Test: Mindestanzahl an Beispielen pro Kapitel
describe('Tutorial Coverage', () => {
  it('has at least 3 examples per chapter', () => {
    for (const chapter of chapters) {
      expect(
        chapter.examples.length,
        `${chapter.name} should have at least 3 examples`
      ).toBeGreaterThanOrEqual(3)
    }
  })

  it('has at least 10 chapters', () => {
    expect(chapters.length).toBeGreaterThanOrEqual(10)
  })

  it('has at least 80 total examples', () => {
    const total = chapters.reduce((sum, ch) => sum + ch.examples.length, 0)
    expect(total).toBeGreaterThanOrEqual(80)
  })
})
