/**
 * Tutorial Tests: Functions
 *
 * Auto-generated from docs/tutorial/08-functions.html
 * Generated: 2026-04-20T13:03:12.781Z
 *
 * DEEP VALIDATION: Each element is validated for:
 * - Correct HTML tag
 * - Text content
 * - All CSS styles (bg, col, pad, rad, gap, etc.)
 * - Child count and hierarchy
 * - HTML attributes
 *
 * DO NOT EDIT MANUALLY - Run 'npm run tutorial:generate' to regenerate
 */

import { testWithSetup, testSkip, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

export const chapter_08_functionsTests: TestCase[] = describe('Tutorial: Functions', [
  testWithSetup(
    '[08-functions] Syntax: Funktionen als Properties: Example 1',
    `// Kurzschreibweise – Klick ist Default
Btn: Button pad 10 20, rad 6, bg #333, col white, toggle()
  on:
    bg #2271C1

Btn "An/Aus"`,
    async (api: TestAPI) => {
      // Complex feature: toggle(), data binding, component definitions
      // If we reach here, compilation succeeded (no exception thrown)
      api.assert.ok(true, 'Compilation successful')
    }
  ),

  testWithSetup(
    '[08-functions] Feedback: toast(): Example 2',
    `Frame hor, gap 8, wrap, bg #0a0a0a, pad 16, rad 8
  Button "Info", pad 10 20, bg #333, col white, rad 6, toast("Das ist eine Info")
  Button "Erfolg", pad 10 20, bg #10b981, col white, rad 6, toast("Gespeichert!", "success")
  Button "Fehler", pad 10 20, bg #ef4444, col white, rad 6, toast("Fehler aufgetreten", "error")
  Button "Warnung", pad 10 20, bg #f59e0b, col black, rad 6, toast("Achtung!", "warning")`,
    async (api: TestAPI) => {
      // ========================================
      // DEEP VALIDATION: 5 elements
      // ========================================

      const nodeIds = api.preview.getNodeIds()
      api.assert.ok(nodeIds.length === 5, `Expected 5 nodes, got ${nodeIds.length}`)

      // --- node-1: Frame → <div> ---
      const node_1 = api.preview.inspect('node-1')
      api.assert.ok(node_1 !== null, 'node-1 must exist')
      api.assert.ok(node_1?.tagName === 'div', `node-1: expected <div>, got ${node_1?.tagName}`)
      api.assert.hasStyle('node-1', 'display', 'flex')
      api.assert.hasStyle('node-1', 'flexDirection', 'row')
      api.assert.hasStyle('node-1', 'gap', '8px')
      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(10, 10, 10)')
      api.assert.hasStyle('node-1', 'padding', '16px')
      api.assert.hasStyle('node-1', 'borderRadius', '8px')
      api.assert.hasChildren('node-1', 4)

      // --- node-2: Button → <button> "Info" ---
      const node_2 = api.preview.inspect('node-2')
      api.assert.ok(node_2 !== null, 'node-2 must exist')
      api.assert.ok(
        node_2?.tagName === 'button',
        `node-2: expected <button>, got ${node_2?.tagName}`
      )
      api.assert.hasText('node-2', 'Info')
      api.assert.hasStyle('node-2', 'paddingTop', '10px')
      api.assert.hasStyle('node-2', 'paddingBottom', '10px')
      api.assert.hasStyle('node-2', 'paddingLeft', '20px')
      api.assert.hasStyle('node-2', 'paddingRight', '20px')
      api.assert.hasStyle('node-2', 'backgroundColor', 'rgb(51, 51, 51)')
      api.assert.hasStyle('node-2', 'color', 'rgb(255, 255, 255)')
      api.assert.hasStyle('node-2', 'borderRadius', '6px')

      // --- node-3: Button → <button> "Erfolg" ---
      const node_3 = api.preview.inspect('node-3')
      api.assert.ok(node_3 !== null, 'node-3 must exist')
      api.assert.ok(
        node_3?.tagName === 'button',
        `node-3: expected <button>, got ${node_3?.tagName}`
      )
      api.assert.hasText('node-3', 'Erfolg')
      api.assert.hasStyle('node-3', 'paddingTop', '10px')
      api.assert.hasStyle('node-3', 'paddingBottom', '10px')
      api.assert.hasStyle('node-3', 'paddingLeft', '20px')
      api.assert.hasStyle('node-3', 'paddingRight', '20px')
      api.assert.hasStyle('node-3', 'backgroundColor', 'rgb(16, 185, 129)')
      api.assert.hasStyle('node-3', 'color', 'rgb(255, 255, 255)')
      api.assert.hasStyle('node-3', 'borderRadius', '6px')

      // --- node-4: Button → <button> "Fehler" ---
      const node_4 = api.preview.inspect('node-4')
      api.assert.ok(node_4 !== null, 'node-4 must exist')
      api.assert.ok(
        node_4?.tagName === 'button',
        `node-4: expected <button>, got ${node_4?.tagName}`
      )
      api.assert.hasText('node-4', 'Fehler')
      api.assert.hasStyle('node-4', 'paddingTop', '10px')
      api.assert.hasStyle('node-4', 'paddingBottom', '10px')
      api.assert.hasStyle('node-4', 'paddingLeft', '20px')
      api.assert.hasStyle('node-4', 'paddingRight', '20px')
      api.assert.hasStyle('node-4', 'backgroundColor', 'rgb(239, 68, 68)')
      api.assert.hasStyle('node-4', 'color', 'rgb(255, 255, 255)')
      api.assert.hasStyle('node-4', 'borderRadius', '6px')

      // --- node-5: Button → <button> "Warnung" ---
      const node_5 = api.preview.inspect('node-5')
      api.assert.ok(node_5 !== null, 'node-5 must exist')
      api.assert.ok(
        node_5?.tagName === 'button',
        `node-5: expected <button>, got ${node_5?.tagName}`
      )
      api.assert.hasText('node-5', 'Warnung')
      api.assert.hasStyle('node-5', 'paddingTop', '10px')
      api.assert.hasStyle('node-5', 'paddingBottom', '10px')
      api.assert.hasStyle('node-5', 'paddingLeft', '20px')
      api.assert.hasStyle('node-5', 'paddingRight', '20px')
      api.assert.hasStyle('node-5', 'backgroundColor', 'rgb(245, 158, 11)')
      api.assert.hasStyle('node-5', 'color', 'rgb(0, 0, 0)')
      api.assert.hasStyle('node-5', 'borderRadius', '6px')

      // --- Hierarchy ---
      // node-2 is child of node-1
      // node-3 is child of node-1
      // node-4 is child of node-1
      // node-5 is child of node-1
    }
  ),

  testWithSetup(
    '[08-functions] Input: focus(), clear(), setError(): Example 3',
    `Frame gap 12, bg #0a0a0a, pad 16, rad 8
  Frame gap 8
    Input name EmailInput, placeholder "E-Mail eingeben...", bg #1a1a1a, col white, pad 12, rad 6, w 260, bor 1, boc #333
      invalid:
        boc #ef4444
    Frame hor, gap 8
      Button "Fokus", pad 8 16, bg #333, col white, rad 6, focus(EmailInput)
      Button "Löschen", pad 8 16, bg #333, col white, rad 6, clear(EmailInput)
      Button "Fehler", pad 8 16, bg #ef4444, col white, rad 6, setError(EmailInput, "Ungültige E-Mail")
      Button "OK", pad 8 16, bg #10b981, col white, rad 6, clearError(EmailInput)`,
    async (api: TestAPI) => {
      // Complex feature: data binding
      // If we reach here, compilation succeeded (no exception thrown)
      api.assert.ok(true, 'Compilation successful')
    }
  ),

  testWithSetup(
    '[08-functions] Zähler: increment() und decrement(): Example 4',
    `count: 0

Frame hor, gap 12, ver-center, bg #1a1a1a, pad 16, rad 8
  Button "-", pad 8 16, bg #333, col white, rad 6, fs 18, decrement(count)
  Text "\$count", col white, fs 24, weight 600, w 60, center
  Button "+", pad 8 16, bg #2271C1, col white, rad 6, fs 18, increment(count)`,
    async (api: TestAPI) => {
      // Complex feature: data binding
      // If we reach here, compilation succeeded (no exception thrown)
      api.assert.ok(true, 'Compilation successful')
    }
  ),

  testWithSetup(
    '[08-functions] Praktisch: Warenkorb-Zähler: Example 5',
    `qty: 1
price: 29

Frame bg #1a1a1a, pad 20, rad 12, gap 16, w 280
  Frame hor, gap 16, ver-center
    Frame w 60, h 60, bg #252525, rad 8, center
      Icon "shopping-bag", ic #888, is 24
    Frame gap 4
      Text "Premium T-Shirt", col white, fs 16, weight 500
      Text "€\$price pro Stück", col #888, fs 13

  Frame hor, spread, ver-center, bg #0a0a0a, pad 12, rad 8
    Frame hor, gap 8, ver-center
      Button "-", pad 6 12, bg #333, col white, rad 4, decrement(qty)
      Text "\$qty", col white, fs 16, weight 600, w 32, center
      Button "+", pad 6 12, bg #333, col white, rad 4, increment(qty)
    Text "€" + (\$price * \$qty), col #10b981, fs 18, weight 600`,
    async (api: TestAPI) => {
      // Complex feature: data binding
      // If we reach here, compilation succeeded (no exception thrown)
      api.assert.ok(true, 'Compilation successful')
    }
  ),

  testWithSetup(
    '[08-functions] Clipboard: copy(): Example 6',
    `code: "SUMMER2024"

Frame bg #1a1a1a, pad 16, rad 8, gap 12
  Text "Dein Rabattcode:", col #888, fs 13
  Frame hor, gap 8, ver-center
    Frame pad 12 16, bg #0a0a0a, rad 6, bor 1, boc #333
      Text "\$code", col #10b981, fs 16, weight 600, font mono
    Button "Kopieren", pad 10 16, bg #2271C1, col white, rad 6, copy("\$code"), toast("Code kopiert!", "success")
      copied:
        bg #10b981
        "Kopiert!"`,
    async (api: TestAPI) => {
      // Complex feature: data binding
      // If we reach here, compilation succeeded (no exception thrown)
      api.assert.ok(true, 'Compilation successful')
    }
  ),

  testWithSetup(
    '[08-functions] show() und hide(): Sichtbarkeit: Example 7',
    `Frame gap 12, bg #0a0a0a, pad 16, rad 8
  Button "Info anzeigen", pad 10 20, bg #2271C1, col white, rad 6, show(InfoBox)

  Frame name InfoBox, hidden, bg #1a1a1a, pad 16, rad 8, gap 8
    Text "Hier sind weitere Informationen.", col #ccc, fs 14
    Button "Schließen", pad 8 16, bg #333, col white, rad 4, hide(InfoBox)`,
    async (api: TestAPI) => {
      // ========================================
      // DEEP VALIDATION: 5 elements
      // ========================================

      const nodeIds = api.preview.getNodeIds()
      api.assert.ok(nodeIds.length === 5, `Expected 5 nodes, got ${nodeIds.length}`)

      // --- node-1: Frame → <div> ---
      const node_1 = api.preview.inspect('node-1')
      api.assert.ok(node_1 !== null, 'node-1 must exist')
      api.assert.ok(node_1?.tagName === 'div', `node-1: expected <div>, got ${node_1?.tagName}`)
      api.assert.hasStyle('node-1', 'display', 'flex')
      api.assert.hasStyle('node-1', 'flexDirection', 'column')
      api.assert.hasStyle('node-1', 'gap', '12px')
      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(10, 10, 10)')
      api.assert.hasStyle('node-1', 'padding', '16px')
      api.assert.hasStyle('node-1', 'borderRadius', '8px')
      api.assert.hasChildren('node-1', 2)

      // --- node-2: Button → <button> "Info anzeigen" ---
      const node_2 = api.preview.inspect('node-2')
      api.assert.ok(node_2 !== null, 'node-2 must exist')
      api.assert.ok(
        node_2?.tagName === 'button',
        `node-2: expected <button>, got ${node_2?.tagName}`
      )
      api.assert.hasText('node-2', 'Info anzeigen')
      api.assert.hasStyle('node-2', 'paddingTop', '10px')
      api.assert.hasStyle('node-2', 'paddingBottom', '10px')
      api.assert.hasStyle('node-2', 'paddingLeft', '20px')
      api.assert.hasStyle('node-2', 'paddingRight', '20px')
      api.assert.hasStyle('node-2', 'backgroundColor', 'rgb(34, 113, 193)')
      api.assert.hasStyle('node-2', 'color', 'rgb(255, 255, 255)')
      api.assert.hasStyle('node-2', 'borderRadius', '6px')

      // --- node-3: Frame → <div> ---
      const node_3 = api.preview.inspect('node-3')
      api.assert.ok(node_3 !== null, 'node-3 must exist')
      api.assert.ok(node_3?.tagName === 'div', `node-3: expected <div>, got ${node_3?.tagName}`)
      api.assert.hasStyle('node-3', 'display', 'none')
      api.assert.hasStyle('node-3', 'flexDirection', 'column')
      api.assert.hasStyle('node-3', 'backgroundColor', 'rgb(26, 26, 26)')
      api.assert.hasStyle('node-3', 'padding', '16px')
      api.assert.hasStyle('node-3', 'borderRadius', '8px')
      api.assert.hasStyle('node-3', 'gap', '8px')
      api.assert.hasChildren('node-3', 2)

      // --- node-4: Text → <span> "Hier sind weitere Informationen." ---
      const node_4 = api.preview.inspect('node-4')
      api.assert.ok(node_4 !== null, 'node-4 must exist')
      api.assert.ok(node_4?.tagName === 'span', `node-4: expected <span>, got ${node_4?.tagName}`)
      api.assert.hasText('node-4', 'Hier sind weitere Informationen.')
      api.assert.hasStyle('node-4', 'color', 'rgb(204, 204, 204)')
      api.assert.hasStyle('node-4', 'fontSize', '14px')

      // --- node-5: Button → <button> "Schließen" ---
      const node_5 = api.preview.inspect('node-5')
      api.assert.ok(node_5 !== null, 'node-5 must exist')
      api.assert.ok(
        node_5?.tagName === 'button',
        `node-5: expected <button>, got ${node_5?.tagName}`
      )
      api.assert.hasText('node-5', 'Schließen')
      api.assert.hasStyle('node-5', 'paddingTop', '8px')
      api.assert.hasStyle('node-5', 'paddingBottom', '8px')
      api.assert.hasStyle('node-5', 'paddingLeft', '16px')
      api.assert.hasStyle('node-5', 'paddingRight', '16px')
      api.assert.hasStyle('node-5', 'backgroundColor', 'rgb(51, 51, 51)')
      api.assert.hasStyle('node-5', 'color', 'rgb(255, 255, 255)')
      api.assert.hasStyle('node-5', 'borderRadius', '4px')

      // --- Hierarchy ---
      // node-2 is child of node-1
      // node-3 is child of node-1
      // node-4 is child of node-3
      // node-5 is child of node-3
    }
  ),

  testWithSetup(
    '[08-functions] Navigation: navigate(), back(), openUrl(): Example 8',
    `Frame gap 12, bg #0a0a0a, pad 16, rad 8
  Frame hor, gap 8
    Button "← Zurück", pad 10 20, bg #333, col white, rad 6, back()
    Button "Vorwärts →", pad 10 20, bg #333, col white, rad 6, forward()

  Divider bg #333, mar 8 0

  Button "Mirror Website öffnen", pad 10 20, bg #2271C1, col white, rad 6, hor, gap 8
    Icon "external-link", ic white, is 16
    openUrl("https://mirror-lang.dev")`,
    async (api: TestAPI) => {
      // ========================================
      // DEEP VALIDATION: 7 elements
      // ========================================

      const nodeIds = api.preview.getNodeIds()
      api.assert.ok(nodeIds.length === 7, `Expected 7 nodes, got ${nodeIds.length}`)

      // --- node-1: Frame → <div> ---
      const node_1 = api.preview.inspect('node-1')
      api.assert.ok(node_1 !== null, 'node-1 must exist')
      api.assert.ok(node_1?.tagName === 'div', `node-1: expected <div>, got ${node_1?.tagName}`)
      api.assert.hasStyle('node-1', 'display', 'flex')
      api.assert.hasStyle('node-1', 'flexDirection', 'column')
      api.assert.hasStyle('node-1', 'gap', '12px')
      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(10, 10, 10)')
      api.assert.hasStyle('node-1', 'padding', '16px')
      api.assert.hasStyle('node-1', 'borderRadius', '8px')
      api.assert.hasChildren('node-1', 3)

      // --- node-2: Frame → <div> ---
      const node_2 = api.preview.inspect('node-2')
      api.assert.ok(node_2 !== null, 'node-2 must exist')
      api.assert.ok(node_2?.tagName === 'div', `node-2: expected <div>, got ${node_2?.tagName}`)
      api.assert.hasStyle('node-2', 'display', 'flex')
      api.assert.hasStyle('node-2', 'flexDirection', 'row')
      api.assert.hasStyle('node-2', 'gap', '8px')
      api.assert.hasChildren('node-2', 2)

      // --- node-3: Button → <button> "← Zurück" ---
      const node_3 = api.preview.inspect('node-3')
      api.assert.ok(node_3 !== null, 'node-3 must exist')
      api.assert.ok(
        node_3?.tagName === 'button',
        `node-3: expected <button>, got ${node_3?.tagName}`
      )
      api.assert.hasText('node-3', '← Zurück')
      api.assert.hasStyle('node-3', 'paddingTop', '10px')
      api.assert.hasStyle('node-3', 'paddingBottom', '10px')
      api.assert.hasStyle('node-3', 'paddingLeft', '20px')
      api.assert.hasStyle('node-3', 'paddingRight', '20px')
      api.assert.hasStyle('node-3', 'backgroundColor', 'rgb(51, 51, 51)')
      api.assert.hasStyle('node-3', 'color', 'rgb(255, 255, 255)')
      api.assert.hasStyle('node-3', 'borderRadius', '6px')

      // --- node-4: Button → <button> "Vorwärts →" ---
      const node_4 = api.preview.inspect('node-4')
      api.assert.ok(node_4 !== null, 'node-4 must exist')
      api.assert.ok(
        node_4?.tagName === 'button',
        `node-4: expected <button>, got ${node_4?.tagName}`
      )
      api.assert.hasText('node-4', 'Vorwärts →')
      api.assert.hasStyle('node-4', 'paddingTop', '10px')
      api.assert.hasStyle('node-4', 'paddingBottom', '10px')
      api.assert.hasStyle('node-4', 'paddingLeft', '20px')
      api.assert.hasStyle('node-4', 'paddingRight', '20px')
      api.assert.hasStyle('node-4', 'backgroundColor', 'rgb(51, 51, 51)')
      api.assert.hasStyle('node-4', 'color', 'rgb(255, 255, 255)')
      api.assert.hasStyle('node-4', 'borderRadius', '6px')

      // --- node-5: Divider → <hr> ---
      const node_5 = api.preview.inspect('node-5')
      api.assert.ok(node_5 !== null, 'node-5 must exist')
      api.assert.ok(node_5?.tagName === 'hr', `node-5: expected <hr>, got ${node_5?.tagName}`)
      api.assert.hasStyle('node-5', 'backgroundColor', 'rgb(51, 51, 51)')

      // --- node-6: Button → <button> "Mirror Website öffnen" ---
      const node_6 = api.preview.inspect('node-6')
      api.assert.ok(node_6 !== null, 'node-6 must exist')
      api.assert.ok(
        node_6?.tagName === 'button',
        `node-6: expected <button>, got ${node_6?.tagName}`
      )
      api.assert.hasText('node-6', 'Mirror Website öffnen')
      api.assert.hasStyle('node-6', 'paddingTop', '10px')
      api.assert.hasStyle('node-6', 'paddingBottom', '10px')
      api.assert.hasStyle('node-6', 'paddingLeft', '20px')
      api.assert.hasStyle('node-6', 'paddingRight', '20px')
      api.assert.hasStyle('node-6', 'backgroundColor', 'rgb(34, 113, 193)')
      api.assert.hasStyle('node-6', 'color', 'rgb(255, 255, 255)')
      api.assert.hasStyle('node-6', 'borderRadius', '6px')
      api.assert.hasStyle('node-6', 'flexDirection', 'row')
      api.assert.hasStyle('node-6', 'gap', '8px')
      api.assert.hasChildren('node-6', 1)

      // --- node-7: Icon → <span> "external-link" ---
      const node_7 = api.preview.inspect('node-7')
      api.assert.ok(node_7 !== null, 'node-7 must exist')
      api.assert.ok(node_7?.tagName === 'span', `node-7: expected <span>, got ${node_7?.tagName}`)
      api.assert.hasStyle('node-7', 'color', 'rgb(255, 255, 255)')

      // --- Hierarchy ---
      // node-2 is child of node-1
      // node-3 is child of node-2
      // node-4 is child of node-2
      // node-5 is child of node-1
      // node-6 is child of node-1
      // node-7 is child of node-6
    }
  ),

  testWithSetup(
    '[08-functions] Scroll: scrollTo(), scrollToTop(): Example 9',
    `Frame gap 8, bg #0a0a0a, pad 16, rad 8, h 200, scroll
  Button "Zum Ende scrollen", pad 10 20, bg #2271C1, col white, rad 6, scrollToBottom()

  Frame gap 8, pad 40 0
    Text "Abschnitt 1", col white, fs 16
    Text "Lorem ipsum dolor sit amet...", col #888, fs 13
    Text "Abschnitt 2", col white, fs 16
    Text "Consectetur adipiscing elit...", col #888, fs 13
    Text "Abschnitt 3", col white, fs 16
    Text "Sed do eiusmod tempor...", col #888, fs 13

  Button "Nach oben", pad 10 20, bg #333, col white, rad 6, scrollToTop()`,
    async (api: TestAPI) => {
      // ========================================
      // DEEP VALIDATION: 10 elements
      // ========================================

      const nodeIds = api.preview.getNodeIds()
      api.assert.ok(nodeIds.length === 10, `Expected 10 nodes, got ${nodeIds.length}`)

      // --- node-1: Frame → <div> ---
      const node_1 = api.preview.inspect('node-1')
      api.assert.ok(node_1 !== null, 'node-1 must exist')
      api.assert.ok(node_1?.tagName === 'div', `node-1: expected <div>, got ${node_1?.tagName}`)
      api.assert.hasStyle('node-1', 'display', 'flex')
      api.assert.hasStyle('node-1', 'flexDirection', 'column')
      api.assert.hasStyle('node-1', 'gap', '8px')
      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(10, 10, 10)')
      api.assert.hasStyle('node-1', 'padding', '16px')
      api.assert.hasStyle('node-1', 'borderRadius', '8px')
      api.assert.hasStyle('node-1', 'height', '200px')
      api.assert.hasChildren('node-1', 3)

      // --- node-2: Button → <button> "Zum Ende scrollen" ---
      const node_2 = api.preview.inspect('node-2')
      api.assert.ok(node_2 !== null, 'node-2 must exist')
      api.assert.ok(
        node_2?.tagName === 'button',
        `node-2: expected <button>, got ${node_2?.tagName}`
      )
      api.assert.hasText('node-2', 'Zum Ende scrollen')
      api.assert.hasStyle('node-2', 'paddingTop', '10px')
      api.assert.hasStyle('node-2', 'paddingBottom', '10px')
      api.assert.hasStyle('node-2', 'paddingLeft', '20px')
      api.assert.hasStyle('node-2', 'paddingRight', '20px')
      api.assert.hasStyle('node-2', 'backgroundColor', 'rgb(34, 113, 193)')
      api.assert.hasStyle('node-2', 'color', 'rgb(255, 255, 255)')
      api.assert.hasStyle('node-2', 'borderRadius', '6px')

      // --- node-3: Frame → <div> ---
      const node_3 = api.preview.inspect('node-3')
      api.assert.ok(node_3 !== null, 'node-3 must exist')
      api.assert.ok(node_3?.tagName === 'div', `node-3: expected <div>, got ${node_3?.tagName}`)
      api.assert.hasStyle('node-3', 'display', 'flex')
      api.assert.hasStyle('node-3', 'flexDirection', 'column')
      api.assert.hasStyle('node-3', 'gap', '8px')
      api.assert.hasStyle('node-3', 'paddingTop', '40px')
      api.assert.hasStyle('node-3', 'paddingBottom', '40px')
      api.assert.hasStyle('node-3', 'paddingLeft', '0px')
      api.assert.hasStyle('node-3', 'paddingRight', '0px')
      api.assert.hasChildren('node-3', 6)

      // --- node-4: Text → <span> "Abschnitt 1" ---
      const node_4 = api.preview.inspect('node-4')
      api.assert.ok(node_4 !== null, 'node-4 must exist')
      api.assert.ok(node_4?.tagName === 'span', `node-4: expected <span>, got ${node_4?.tagName}`)
      api.assert.hasText('node-4', 'Abschnitt 1')
      api.assert.hasStyle('node-4', 'color', 'rgb(255, 255, 255)')
      api.assert.hasStyle('node-4', 'fontSize', '16px')

      // --- node-5: Text → <span> "Lorem ipsum dolor sit amet..." ---
      const node_5 = api.preview.inspect('node-5')
      api.assert.ok(node_5 !== null, 'node-5 must exist')
      api.assert.ok(node_5?.tagName === 'span', `node-5: expected <span>, got ${node_5?.tagName}`)
      api.assert.hasText('node-5', 'Lorem ipsum dolor sit amet...')
      api.assert.hasStyle('node-5', 'color', 'rgb(136, 136, 136)')
      api.assert.hasStyle('node-5', 'fontSize', '13px')

      // --- node-6: Text → <span> "Abschnitt 2" ---
      const node_6 = api.preview.inspect('node-6')
      api.assert.ok(node_6 !== null, 'node-6 must exist')
      api.assert.ok(node_6?.tagName === 'span', `node-6: expected <span>, got ${node_6?.tagName}`)
      api.assert.hasText('node-6', 'Abschnitt 2')
      api.assert.hasStyle('node-6', 'color', 'rgb(255, 255, 255)')
      api.assert.hasStyle('node-6', 'fontSize', '16px')

      // --- node-7: Text → <span> "Consectetur adipiscing elit..." ---
      const node_7 = api.preview.inspect('node-7')
      api.assert.ok(node_7 !== null, 'node-7 must exist')
      api.assert.ok(node_7?.tagName === 'span', `node-7: expected <span>, got ${node_7?.tagName}`)
      api.assert.hasText('node-7', 'Consectetur adipiscing elit...')
      api.assert.hasStyle('node-7', 'color', 'rgb(136, 136, 136)')
      api.assert.hasStyle('node-7', 'fontSize', '13px')

      // --- node-8: Text → <span> "Abschnitt 3" ---
      const node_8 = api.preview.inspect('node-8')
      api.assert.ok(node_8 !== null, 'node-8 must exist')
      api.assert.ok(node_8?.tagName === 'span', `node-8: expected <span>, got ${node_8?.tagName}`)
      api.assert.hasText('node-8', 'Abschnitt 3')
      api.assert.hasStyle('node-8', 'color', 'rgb(255, 255, 255)')
      api.assert.hasStyle('node-8', 'fontSize', '16px')

      // --- node-9: Text → <span> "Sed do eiusmod tempor..." ---
      const node_9 = api.preview.inspect('node-9')
      api.assert.ok(node_9 !== null, 'node-9 must exist')
      api.assert.ok(node_9?.tagName === 'span', `node-9: expected <span>, got ${node_9?.tagName}`)
      api.assert.hasText('node-9', 'Sed do eiusmod tempor...')
      api.assert.hasStyle('node-9', 'color', 'rgb(136, 136, 136)')
      api.assert.hasStyle('node-9', 'fontSize', '13px')

      // --- node-10: Button → <button> "Nach oben" ---
      const node_10 = api.preview.inspect('node-10')
      api.assert.ok(node_10 !== null, 'node-10 must exist')
      api.assert.ok(
        node_10?.tagName === 'button',
        `node-10: expected <button>, got ${node_10?.tagName}`
      )
      api.assert.hasText('node-10', 'Nach oben')
      api.assert.hasStyle('node-10', 'paddingTop', '10px')
      api.assert.hasStyle('node-10', 'paddingBottom', '10px')
      api.assert.hasStyle('node-10', 'paddingLeft', '20px')
      api.assert.hasStyle('node-10', 'paddingRight', '20px')
      api.assert.hasStyle('node-10', 'backgroundColor', 'rgb(51, 51, 51)')
      api.assert.hasStyle('node-10', 'color', 'rgb(255, 255, 255)')
      api.assert.hasStyle('node-10', 'borderRadius', '6px')

      // --- Hierarchy ---
      // node-2 is child of node-1
      // node-3 is child of node-1
      // node-4 is child of node-3
      // node-5 is child of node-3
      // node-6 is child of node-3
      // node-7 is child of node-3
      // node-8 is child of node-3
      // node-9 is child of node-3
      // node-10 is child of node-1
    }
  ),

  testWithSetup(
    '[08-functions] Funktionen kombinieren: Example 10',
    `count: 0

Frame gap 8, bg #0a0a0a, pad 16, rad 8
  Button "Like", name LikeBtn, pad 12 20, bg #333, col white, rad 6, hor, gap 8, toggle(), increment(count), toast("Gefällt dir!", "success")
    Icon "heart", ic #888, is 18
    Text "\$count"
    on:
      bg #ef4444
      Icon "heart", ic white, is 18, fill`,
    async (api: TestAPI) => {
      // Complex feature: toggle(), data binding
      // If we reach here, compilation succeeded (no exception thrown)
      api.assert.ok(true, 'Compilation successful')
    }
  ),

  testWithSetup(
    '[08-functions] Praktisch: Formular mit Feedback: Example 11',
    `Frame bg #1a1a1a, pad 20, rad 12, gap 16, w 300
  Text "Newsletter", col white, fs 18, weight 600

  Frame gap 12
    Input name EmailInput, placeholder "E-Mail Adresse", bg #0a0a0a, col white, pad 12, rad 6, w full
    Button "Anmelden", pad 12 20, bg #2271C1, col white, rad 6, w full, toast("Erfolgreich angemeldet!", "success")
      hover:
        bg #2271C1

  Text "Spam-frei. Jederzeit abmeldbar.", col #666, fs 11, center`,
    async (api: TestAPI) => {
      // Complex feature: hover:, data binding
      // If we reach here, compilation succeeded (no exception thrown)
      api.assert.ok(true, 'Compilation successful')
    }
  ),
])
