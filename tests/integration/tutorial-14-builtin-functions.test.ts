/**
 * Tutorial Kapitel 14: Built-in Functions - Integration Tests
 *
 * Tests für die Kompilierung der Built-in Functions.
 * Verifiziert: Parser → IR → Backend Code Generation
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect } from 'vitest'
import { compile } from '../../compiler'

describe('Tutorial 14: Built-in Functions - Compilation', () => {
  // ============================================
  // OVERLAY FUNCTIONS
  // ============================================

  describe('Overlay Functions Compilation', () => {
    it('kompiliert showBelow() korrekt', () => {
      const code = `
Button "Menü"
  onclick: showBelow(Dropdown)

Frame hidden, name Dropdown
  Button "Option 1"
      `
      const output = compile(code, { backend: 'dom' })
      expect(output).toContain('_runtime.showBelow')
      expect(output).toContain('Dropdown')
    })

    it('kompiliert showAbove() korrekt', () => {
      const code = `
Button "Info"
  onclick: showAbove(Tooltip)

Frame hidden, name Tooltip
  Text "Hilfetext"
      `
      const output = compile(code, { backend: 'dom' })
      expect(output).toContain('_runtime.showAbove')
    })

    it('kompiliert showModal() korrekt', () => {
      const code = `
Button "Öffnen"
  onclick: showModal(Dialog)

Frame hidden, name Dialog
  Text "Dialog"
      `
      const output = compile(code, { backend: 'dom' })
      expect(output).toContain('_runtime.showModal')
    })

    it('kompiliert dismiss() korrekt', () => {
      const code = `
Frame name Menu
  Button "Schließen"
    onclick: dismiss(Menu)
      `
      const output = compile(code, { backend: 'dom' })
      expect(output).toContain('_runtime.dismiss')
    })

    it('kompiliert showLeft() und showRight() korrekt', () => {
      const code = `
Button "Links"
  onclick: showLeft(Panel)
Button "Rechts"
  onclick: showRight(Panel)

Frame hidden, name Panel
      `
      const output = compile(code, { backend: 'dom' })
      expect(output).toContain('_runtime.showLeft')
      expect(output).toContain('_runtime.showRight')
    })
  })

  // ============================================
  // SCROLL FUNCTIONS
  // ============================================

  describe('Scroll Functions Compilation', () => {
    it('kompiliert scrollTo() korrekt', () => {
      const code = `
Button "Zu Section"
  onclick: scrollTo(Target)

Frame name Target
      `
      const output = compile(code, { backend: 'dom' })
      expect(output).toContain('_runtime.scrollTo')
    })

    it('kompiliert scrollBy() mit Offset korrekt', () => {
      const code = `
Button "Scroll"
  onclick: scrollBy(Gallery, 100, 0)

Frame name Gallery
      `
      const output = compile(code, { backend: 'dom' })
      expect(output).toContain('_runtime.scrollBy')
      expect(output).toContain('100')
      expect(output).toContain('0')
    })

    it('kompiliert scrollToTop() korrekt', () => {
      const code = `
Button "Nach oben"
  onclick: scrollToTop(List)

Frame name List
      `
      const output = compile(code, { backend: 'dom' })
      expect(output).toContain('_runtime.scrollToTop')
    })

    it('kompiliert scrollToBottom() korrekt', () => {
      const code = `
Button "Nach unten"
  onclick: scrollToBottom(List)

Frame name List
      `
      const output = compile(code, { backend: 'dom' })
      expect(output).toContain('_runtime.scrollToBottom')
    })
  })

  // ============================================
  // VALUE FUNCTIONS
  // ============================================

  describe('Value Functions Compilation', () => {
    it('kompiliert increment() korrekt', () => {
      const code = `
$count: 0

Button "+"
  onclick: increment($count)
      `
      const output = compile(code, { backend: 'dom' })
      expect(output).toContain('_runtime.increment')
      expect(output).toContain('count')
    })

    it('kompiliert decrement() korrekt', () => {
      const code = `
$count: 5

Button "-"
  onclick: decrement($count)
      `
      const output = compile(code, { backend: 'dom' })
      expect(output).toContain('_runtime.decrement')
    })

    it('kompiliert set() mit numerischem Wert', () => {
      const code = `
$value: 0

Button "Setze 42"
  onclick: set($value, 42)
      `
      const output = compile(code, { backend: 'dom' })
      expect(output).toContain('_runtime.set')
      expect(output).toContain('42')
    })

    it('kompiliert reset() ohne Parameter', () => {
      const code = `
$count: 50

Button "Reset"
  onclick: reset($count)
      `
      const output = compile(code, { backend: 'dom' })
      expect(output).toContain('_runtime.reset')
    })

    it('kompiliert reset() mit initialem Wert', () => {
      const code = `
$count: 50

Button "Reset auf 10"
  onclick: reset($count, 10)
      `
      const output = compile(code, { backend: 'dom' })
      expect(output).toContain('_runtime.reset')
      expect(output).toContain('10')
    })
  })

  // ============================================
  // CLIPBOARD FUNCTIONS
  // ============================================

  describe('Clipboard Functions Compilation', () => {
    it('kompiliert copy() mit Token', () => {
      const code = `
$code: "ABC123"

Button "Kopieren"
  onclick: copy($code)
      `
      const output = compile(code, { backend: 'dom' })
      expect(output).toContain('_runtime.copy')
      expect(output).toContain('_runtime.get')
    })

    it('kompiliert copy() mit String', () => {
      const code = `
Button "Kopieren"
  onclick: copy("Fester Text")
      `
      const output = compile(code, { backend: 'dom' })
      expect(output).toContain('_runtime.copy')
      expect(output).toContain('Fester Text')
    })
  })

  // ============================================
  // COMBINED SCENARIOS
  // ============================================

  describe('Kombinierte Szenarien', () => {
    it('Counter kompiliert korrekt', () => {
      const code = `
$qty: 1

Frame hor, gap 12
  Button "-"
    onclick: decrement($qty)
  Text $qty
  Button "+"
    onclick: increment($qty)
      `
      const output = compile(code, { backend: 'dom' })
      expect(output).toContain('_runtime.increment')
      expect(output).toContain('_runtime.decrement')
    })

    it('Dropdown mit Value Functions kompiliert', () => {
      const code = `
$count: 0

Button "Menu"
  onclick: showBelow(Menu)

Frame hidden, name Menu
  Button "+"
    onclick: increment($count)
  Button "Reset"
    onclick: reset($count)
      `
      const output = compile(code, { backend: 'dom' })
      expect(output).toContain('_runtime.showBelow')
      expect(output).toContain('_runtime.increment')
      expect(output).toContain('_runtime.reset')
    })

    it('Modal mit dismiss kompiliert korrekt', () => {
      const code = `
Button "Open"
  onclick: showModal(Dialog)

Frame hidden, name Dialog
  Text "Content"
  Button "Close"
    onclick: dismiss(Dialog)
      `
      const output = compile(code, { backend: 'dom' })
      expect(output).toContain('_runtime.showModal')
      expect(output).toContain('_runtime.dismiss')
    })
  })
})
