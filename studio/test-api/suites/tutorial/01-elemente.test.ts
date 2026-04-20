/**
 * Tutorial Tests: Elemente & Hierarchie
 *
 * Auto-generated from docs/tutorial/01-elemente.html
 * Generated: 2026-04-20T13:03:12.765Z
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

export const chapter_01_elementeTests: TestCase[] = describe('Tutorial: Elemente & Hierarchie', [
  testWithSetup(
    '[01-elemente] Die Grundsyntax: Example 1',
    `Button "Speichern", bg #2271C1, col white, pad 12 24, rad 6`,
    async (api: TestAPI) => {
      // ========================================
      // DEEP VALIDATION: 1 elements
      // ========================================

      const nodeIds = api.preview.getNodeIds()
      api.assert.ok(nodeIds.length === 1, `Expected 1 nodes, got ${nodeIds.length}`)

      // --- node-1: Button → <button> "Speichern" ---
      const node_1 = api.preview.inspect('node-1')
      api.assert.ok(node_1 !== null, 'node-1 must exist')
      api.assert.ok(
        node_1?.tagName === 'button',
        `node-1: expected <button>, got ${node_1?.tagName}`
      )
      api.assert.hasText('node-1', 'Speichern')
      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(34, 113, 193)')
      api.assert.hasStyle('node-1', 'color', 'rgb(255, 255, 255)')
      api.assert.hasStyle('node-1', 'paddingTop', '12px')
      api.assert.hasStyle('node-1', 'paddingBottom', '12px')
      api.assert.hasStyle('node-1', 'paddingLeft', '24px')
      api.assert.hasStyle('node-1', 'paddingRight', '24px')
      api.assert.hasStyle('node-1', 'borderRadius', '6px')
    }
  ),

  testWithSetup(
    '[01-elemente] Primitives: Example 2',
    `Frame gap 12, pad 16, bg #1a1a1a, rad 8
  Text "Eine Überschrift", col white, fs 18
  Text "Normaler Text darunter", col #888
  Button "Klick mich", bg #2271C1, col white, pad 10 20, rad 6
  Input placeholder "E-Mail eingeben...", bg #333, col white, pad 10, rad 4`,
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
      api.assert.hasStyle('node-1', 'padding', '16px')
      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(26, 26, 26)')
      api.assert.hasStyle('node-1', 'borderRadius', '8px')
      api.assert.hasChildren('node-1', 4)

      // --- node-2: Text → <span> "Eine Überschrift" ---
      const node_2 = api.preview.inspect('node-2')
      api.assert.ok(node_2 !== null, 'node-2 must exist')
      api.assert.ok(node_2?.tagName === 'span', `node-2: expected <span>, got ${node_2?.tagName}`)
      api.assert.hasText('node-2', 'Eine Überschrift')
      api.assert.hasStyle('node-2', 'color', 'rgb(255, 255, 255)')
      api.assert.hasStyle('node-2', 'fontSize', '18px')

      // --- node-3: Text → <span> "Normaler Text darunter" ---
      const node_3 = api.preview.inspect('node-3')
      api.assert.ok(node_3 !== null, 'node-3 must exist')
      api.assert.ok(node_3?.tagName === 'span', `node-3: expected <span>, got ${node_3?.tagName}`)
      api.assert.hasText('node-3', 'Normaler Text darunter')
      api.assert.hasStyle('node-3', 'color', 'rgb(136, 136, 136)')

      // --- node-4: Button → <button> "Klick mich" ---
      const node_4 = api.preview.inspect('node-4')
      api.assert.ok(node_4 !== null, 'node-4 must exist')
      api.assert.ok(
        node_4?.tagName === 'button',
        `node-4: expected <button>, got ${node_4?.tagName}`
      )
      api.assert.hasText('node-4', 'Klick mich')
      api.assert.hasStyle('node-4', 'backgroundColor', 'rgb(34, 113, 193)')
      api.assert.hasStyle('node-4', 'color', 'rgb(255, 255, 255)')
      api.assert.hasStyle('node-4', 'paddingTop', '10px')
      api.assert.hasStyle('node-4', 'paddingBottom', '10px')
      api.assert.hasStyle('node-4', 'paddingLeft', '20px')
      api.assert.hasStyle('node-4', 'paddingRight', '20px')
      api.assert.hasStyle('node-4', 'borderRadius', '6px')

      // --- node-5: Input → <input> "E-Mail eingeben..." ---
      const node_5 = api.preview.inspect('node-5')
      api.assert.ok(node_5 !== null, 'node-5 must exist')
      api.assert.ok(node_5?.tagName === 'input', `node-5: expected <input>, got ${node_5?.tagName}`)
      api.assert.hasStyle('node-5', 'backgroundColor', 'rgb(51, 51, 51)')
      api.assert.hasStyle('node-5', 'color', 'rgb(255, 255, 255)')
      api.assert.hasStyle('node-5', 'padding', '10px')
      api.assert.hasStyle('node-5', 'borderRadius', '4px')
      api.assert.hasAttribute('node-5', 'placeholder', 'E-Mail eingeben...')

      // --- Hierarchy ---
      // node-2 is child of node-1
      // node-3 is child of node-1
      // node-4 is child of node-1
      // node-5 is child of node-1
    }
  ),

  testWithSetup(
    '[01-elemente] Styling-Properties: Example 3',
    `Frame gap 16, bg #0a0a0a, pad 16, rad 8

  // Farben: bg = Hintergrund, col = Textfarbe
  Text "Farbiger Text", bg #2271C1, col white, pad 8 16, rad 4

  // pad = Innenabstand (zwischen Rand und Inhalt)
  // mar = Außenabstand (zwischen Elementen)
  Frame hor, gap 0, bg #444, rad 4
    Text "pad 16", pad 16, bg #2271C1, col white
    Text "mar 16", mar 16, bg #10b981, col white

  // Größen: w = Breite, h = Höhe (in Pixel)
  Frame w 200, h 50, bg #10b981, rad 4, center
    Text "200 x 50", col white

  // Ecken: rad = Radius
  Frame hor, gap 8
    Frame w 50, h 50, bg #f59e0b, rad 0
    Frame w 50, h 50, bg #f59e0b, rad 8
    Frame w 50, h 50, bg #f59e0b, rad 25`,
    async (api: TestAPI) => {
      // ========================================
      // DEEP VALIDATION: 11 elements
      // ========================================

      const nodeIds = api.preview.getNodeIds()
      api.assert.ok(nodeIds.length === 11, `Expected 11 nodes, got ${nodeIds.length}`)

      // --- node-1: Frame → <div> ---
      const node_1 = api.preview.inspect('node-1')
      api.assert.ok(node_1 !== null, 'node-1 must exist')
      api.assert.ok(node_1?.tagName === 'div', `node-1: expected <div>, got ${node_1?.tagName}`)
      api.assert.hasStyle('node-1', 'display', 'flex')
      api.assert.hasStyle('node-1', 'flexDirection', 'column')
      api.assert.hasStyle('node-1', 'gap', '16px')
      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(10, 10, 10)')
      api.assert.hasStyle('node-1', 'padding', '16px')
      api.assert.hasStyle('node-1', 'borderRadius', '8px')
      api.assert.hasChildren('node-1', 4)

      // --- node-2: Text → <span> "Farbiger Text" ---
      const node_2 = api.preview.inspect('node-2')
      api.assert.ok(node_2 !== null, 'node-2 must exist')
      api.assert.ok(node_2?.tagName === 'span', `node-2: expected <span>, got ${node_2?.tagName}`)
      api.assert.hasText('node-2', 'Farbiger Text')
      api.assert.hasStyle('node-2', 'backgroundColor', 'rgb(34, 113, 193)')
      api.assert.hasStyle('node-2', 'color', 'rgb(255, 255, 255)')
      api.assert.hasStyle('node-2', 'paddingTop', '8px')
      api.assert.hasStyle('node-2', 'paddingBottom', '8px')
      api.assert.hasStyle('node-2', 'paddingLeft', '16px')
      api.assert.hasStyle('node-2', 'paddingRight', '16px')
      api.assert.hasStyle('node-2', 'borderRadius', '4px')

      // --- node-3: Frame → <div> ---
      const node_3 = api.preview.inspect('node-3')
      api.assert.ok(node_3 !== null, 'node-3 must exist')
      api.assert.ok(node_3?.tagName === 'div', `node-3: expected <div>, got ${node_3?.tagName}`)
      api.assert.hasStyle('node-3', 'display', 'flex')
      api.assert.hasStyle('node-3', 'flexDirection', 'row')
      api.assert.hasStyle('node-3', 'gap', '0px')
      api.assert.hasStyle('node-3', 'backgroundColor', 'rgb(68, 68, 68)')
      api.assert.hasStyle('node-3', 'borderRadius', '4px')
      api.assert.hasChildren('node-3', 2)

      // --- node-4: Text → <span> "pad 16" ---
      const node_4 = api.preview.inspect('node-4')
      api.assert.ok(node_4 !== null, 'node-4 must exist')
      api.assert.ok(node_4?.tagName === 'span', `node-4: expected <span>, got ${node_4?.tagName}`)
      api.assert.hasText('node-4', 'pad 16')
      api.assert.hasStyle('node-4', 'padding', '16px')
      api.assert.hasStyle('node-4', 'backgroundColor', 'rgb(34, 113, 193)')
      api.assert.hasStyle('node-4', 'color', 'rgb(255, 255, 255)')

      // --- node-5: Text → <span> "mar 16" ---
      const node_5 = api.preview.inspect('node-5')
      api.assert.ok(node_5 !== null, 'node-5 must exist')
      api.assert.ok(node_5?.tagName === 'span', `node-5: expected <span>, got ${node_5?.tagName}`)
      api.assert.hasText('node-5', 'mar 16')
      api.assert.hasStyle('node-5', 'backgroundColor', 'rgb(16, 185, 129)')
      api.assert.hasStyle('node-5', 'color', 'rgb(255, 255, 255)')

      // --- node-6: Frame → <div> ---
      const node_6 = api.preview.inspect('node-6')
      api.assert.ok(node_6 !== null, 'node-6 must exist')
      api.assert.ok(node_6?.tagName === 'div', `node-6: expected <div>, got ${node_6?.tagName}`)
      api.assert.hasStyle('node-6', 'display', 'flex')
      api.assert.hasStyle('node-6', 'flexDirection', 'column')
      api.assert.hasStyle('node-6', 'width', '200px')
      api.assert.hasStyle('node-6', 'height', '50px')
      api.assert.hasStyle('node-6', 'backgroundColor', 'rgb(16, 185, 129)')
      api.assert.hasStyle('node-6', 'borderRadius', '4px')
      api.assert.hasChildren('node-6', 1)

      // --- node-7: Text → <span> "200 x 50" ---
      const node_7 = api.preview.inspect('node-7')
      api.assert.ok(node_7 !== null, 'node-7 must exist')
      api.assert.ok(node_7?.tagName === 'span', `node-7: expected <span>, got ${node_7?.tagName}`)
      api.assert.hasText('node-7', '200 x 50')
      api.assert.hasStyle('node-7', 'color', 'rgb(255, 255, 255)')

      // --- node-8: Frame → <div> ---
      const node_8 = api.preview.inspect('node-8')
      api.assert.ok(node_8 !== null, 'node-8 must exist')
      api.assert.ok(node_8?.tagName === 'div', `node-8: expected <div>, got ${node_8?.tagName}`)
      api.assert.hasStyle('node-8', 'display', 'flex')
      api.assert.hasStyle('node-8', 'flexDirection', 'row')
      api.assert.hasStyle('node-8', 'gap', '8px')
      api.assert.hasChildren('node-8', 3)

      // --- node-9: Frame → <div> ---
      const node_9 = api.preview.inspect('node-9')
      api.assert.ok(node_9 !== null, 'node-9 must exist')
      api.assert.ok(node_9?.tagName === 'div', `node-9: expected <div>, got ${node_9?.tagName}`)
      api.assert.hasStyle('node-9', 'display', 'flex')
      api.assert.hasStyle('node-9', 'flexDirection', 'column')
      api.assert.hasStyle('node-9', 'width', '50px')
      api.assert.hasStyle('node-9', 'height', '50px')
      api.assert.hasStyle('node-9', 'backgroundColor', 'rgb(245, 158, 11)')
      api.assert.hasStyle('node-9', 'borderRadius', '0px')

      // --- node-10: Frame → <div> ---
      const node_10 = api.preview.inspect('node-10')
      api.assert.ok(node_10 !== null, 'node-10 must exist')
      api.assert.ok(node_10?.tagName === 'div', `node-10: expected <div>, got ${node_10?.tagName}`)
      api.assert.hasStyle('node-10', 'display', 'flex')
      api.assert.hasStyle('node-10', 'flexDirection', 'column')
      api.assert.hasStyle('node-10', 'width', '50px')
      api.assert.hasStyle('node-10', 'height', '50px')
      api.assert.hasStyle('node-10', 'backgroundColor', 'rgb(245, 158, 11)')
      api.assert.hasStyle('node-10', 'borderRadius', '8px')

      // --- node-11: Frame → <div> ---
      const node_11 = api.preview.inspect('node-11')
      api.assert.ok(node_11 !== null, 'node-11 must exist')
      api.assert.ok(node_11?.tagName === 'div', `node-11: expected <div>, got ${node_11?.tagName}`)
      api.assert.hasStyle('node-11', 'display', 'flex')
      api.assert.hasStyle('node-11', 'flexDirection', 'column')
      api.assert.hasStyle('node-11', 'width', '50px')
      api.assert.hasStyle('node-11', 'height', '50px')
      api.assert.hasStyle('node-11', 'backgroundColor', 'rgb(245, 158, 11)')
      api.assert.hasStyle('node-11', 'borderRadius', '25px')

      // --- Hierarchy ---
      // node-2 is child of node-1
      // node-3 is child of node-1
      // node-4 is child of node-3
      // node-5 is child of node-3
      // node-6 is child of node-1
      // node-7 is child of node-6
      // node-8 is child of node-1
      // node-9 is child of node-8
      // node-10 is child of node-8
      // node-11 is child of node-8
    }
  ),

  testWithSetup(
    '[01-elemente] Hierarchie durch Einrückung: Example 4',
    `// Eltern-Element
Frame bg #1a1a1a, pad 20, rad 8, gap 12

  // Kind 1: Text
  Text "Titel", col white, fs 18, weight bold

  // Kind 2: Text
  Text "Untertitel", col #888

  // Kind 3: Frame mit eigenen Kindern
  Frame hor, gap 8
    Button "Abbrechen", pad 10 20, rad 6, bg #333, col white
    Button "OK", pad 10 20, rad 6, bg #2271C1, col white`,
    async (api: TestAPI) => {
      // ========================================
      // DEEP VALIDATION: 6 elements
      // ========================================

      const nodeIds = api.preview.getNodeIds()
      api.assert.ok(nodeIds.length === 6, `Expected 6 nodes, got ${nodeIds.length}`)

      // --- node-1: Frame → <div> ---
      const node_1 = api.preview.inspect('node-1')
      api.assert.ok(node_1 !== null, 'node-1 must exist')
      api.assert.ok(node_1?.tagName === 'div', `node-1: expected <div>, got ${node_1?.tagName}`)
      api.assert.hasStyle('node-1', 'display', 'flex')
      api.assert.hasStyle('node-1', 'flexDirection', 'column')
      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(26, 26, 26)')
      api.assert.hasStyle('node-1', 'padding', '20px')
      api.assert.hasStyle('node-1', 'borderRadius', '8px')
      api.assert.hasStyle('node-1', 'gap', '12px')
      api.assert.hasChildren('node-1', 3)

      // --- node-2: Text → <span> "Titel" ---
      const node_2 = api.preview.inspect('node-2')
      api.assert.ok(node_2 !== null, 'node-2 must exist')
      api.assert.ok(node_2?.tagName === 'span', `node-2: expected <span>, got ${node_2?.tagName}`)
      api.assert.hasText('node-2', 'Titel')
      api.assert.hasStyle('node-2', 'color', 'rgb(255, 255, 255)')
      api.assert.hasStyle('node-2', 'fontSize', '18px')
      api.assert.hasStyle('node-2', 'fontWeight', '700')

      // --- node-3: Text → <span> "Untertitel" ---
      const node_3 = api.preview.inspect('node-3')
      api.assert.ok(node_3 !== null, 'node-3 must exist')
      api.assert.ok(node_3?.tagName === 'span', `node-3: expected <span>, got ${node_3?.tagName}`)
      api.assert.hasText('node-3', 'Untertitel')
      api.assert.hasStyle('node-3', 'color', 'rgb(136, 136, 136)')

      // --- node-4: Frame → <div> ---
      const node_4 = api.preview.inspect('node-4')
      api.assert.ok(node_4 !== null, 'node-4 must exist')
      api.assert.ok(node_4?.tagName === 'div', `node-4: expected <div>, got ${node_4?.tagName}`)
      api.assert.hasStyle('node-4', 'display', 'flex')
      api.assert.hasStyle('node-4', 'flexDirection', 'row')
      api.assert.hasStyle('node-4', 'gap', '8px')
      api.assert.hasChildren('node-4', 2)

      // --- node-5: Button → <button> "Abbrechen" ---
      const node_5 = api.preview.inspect('node-5')
      api.assert.ok(node_5 !== null, 'node-5 must exist')
      api.assert.ok(
        node_5?.tagName === 'button',
        `node-5: expected <button>, got ${node_5?.tagName}`
      )
      api.assert.hasText('node-5', 'Abbrechen')
      api.assert.hasStyle('node-5', 'paddingTop', '10px')
      api.assert.hasStyle('node-5', 'paddingBottom', '10px')
      api.assert.hasStyle('node-5', 'paddingLeft', '20px')
      api.assert.hasStyle('node-5', 'paddingRight', '20px')
      api.assert.hasStyle('node-5', 'borderRadius', '6px')
      api.assert.hasStyle('node-5', 'backgroundColor', 'rgb(51, 51, 51)')
      api.assert.hasStyle('node-5', 'color', 'rgb(255, 255, 255)')

      // --- node-6: Button → <button> "OK" ---
      const node_6 = api.preview.inspect('node-6')
      api.assert.ok(node_6 !== null, 'node-6 must exist')
      api.assert.ok(
        node_6?.tagName === 'button',
        `node-6: expected <button>, got ${node_6?.tagName}`
      )
      api.assert.hasText('node-6', 'OK')
      api.assert.hasStyle('node-6', 'paddingTop', '10px')
      api.assert.hasStyle('node-6', 'paddingBottom', '10px')
      api.assert.hasStyle('node-6', 'paddingLeft', '20px')
      api.assert.hasStyle('node-6', 'paddingRight', '20px')
      api.assert.hasStyle('node-6', 'borderRadius', '6px')
      api.assert.hasStyle('node-6', 'backgroundColor', 'rgb(34, 113, 193)')
      api.assert.hasStyle('node-6', 'color', 'rgb(255, 255, 255)')

      // --- Hierarchy ---
      // node-2 is child of node-1
      // node-3 is child of node-1
      // node-4 is child of node-1
      // node-5 is child of node-4
      // node-6 is child of node-4
    }
  ),

  testWithSetup(
    '[01-elemente] Kurzschreibweise mit Semicolon: Example 5',
    `// Mit Einrückung (3 Zeilen)
Frame hor, gap 12, bg #1a1a1a, pad 12, rad 6
  Icon "check", ic #10b981, is 20
  Text "Erfolgreich gespeichert", col white

// Gleiche Struktur in einer Zeile
Frame hor, gap 12, bg #1a1a1a, pad 12, rad 6; Icon "check", ic #10b981, is 20; Text "Erfolgreich gespeichert", col white`,
    async (api: TestAPI) => {
      // ========================================
      // DEEP VALIDATION: 6 elements
      // ========================================

      const nodeIds = api.preview.getNodeIds()
      api.assert.ok(nodeIds.length === 6, `Expected 6 nodes, got ${nodeIds.length}`)

      // --- node-1: Frame → <div> ---
      const node_1 = api.preview.inspect('node-1')
      api.assert.ok(node_1 !== null, 'node-1 must exist')
      api.assert.ok(node_1?.tagName === 'div', `node-1: expected <div>, got ${node_1?.tagName}`)
      api.assert.hasStyle('node-1', 'display', 'flex')
      api.assert.hasStyle('node-1', 'flexDirection', 'row')
      api.assert.hasStyle('node-1', 'gap', '12px')
      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(26, 26, 26)')
      api.assert.hasStyle('node-1', 'padding', '12px')
      api.assert.hasStyle('node-1', 'borderRadius', '6px')
      api.assert.hasChildren('node-1', 2)

      // --- node-2: Icon → <span> "check" ---
      const node_2 = api.preview.inspect('node-2')
      api.assert.ok(node_2 !== null, 'node-2 must exist')
      api.assert.ok(node_2?.tagName === 'span', `node-2: expected <span>, got ${node_2?.tagName}`)
      api.assert.hasStyle('node-2', 'color', 'rgb(16, 185, 129)')

      // --- node-3: Text → <span> "Erfolgreich gespeichert" ---
      const node_3 = api.preview.inspect('node-3')
      api.assert.ok(node_3 !== null, 'node-3 must exist')
      api.assert.ok(node_3?.tagName === 'span', `node-3: expected <span>, got ${node_3?.tagName}`)
      api.assert.hasText('node-3', 'Erfolgreich gespeichert')
      api.assert.hasStyle('node-3', 'color', 'rgb(255, 255, 255)')

      // --- node-4: Frame → <div> ---
      const node_4 = api.preview.inspect('node-4')
      api.assert.ok(node_4 !== null, 'node-4 must exist')
      api.assert.ok(node_4?.tagName === 'div', `node-4: expected <div>, got ${node_4?.tagName}`)
      api.assert.hasStyle('node-4', 'display', 'flex')
      api.assert.hasStyle('node-4', 'flexDirection', 'row')
      api.assert.hasStyle('node-4', 'gap', '12px')
      api.assert.hasStyle('node-4', 'backgroundColor', 'rgb(26, 26, 26)')
      api.assert.hasStyle('node-4', 'padding', '12px')
      api.assert.hasStyle('node-4', 'borderRadius', '6px')
      api.assert.hasChildren('node-4', 2)

      // --- node-5: Icon → <span> "check" ---
      const node_5 = api.preview.inspect('node-5')
      api.assert.ok(node_5 !== null, 'node-5 must exist')
      api.assert.ok(node_5?.tagName === 'span', `node-5: expected <span>, got ${node_5?.tagName}`)
      api.assert.hasStyle('node-5', 'color', 'rgb(16, 185, 129)')

      // --- node-6: Text → <span> "Erfolgreich gespeichert" ---
      const node_6 = api.preview.inspect('node-6')
      api.assert.ok(node_6 !== null, 'node-6 must exist')
      api.assert.ok(node_6?.tagName === 'span', `node-6: expected <span>, got ${node_6?.tagName}`)
      api.assert.hasText('node-6', 'Erfolgreich gespeichert')
      api.assert.hasStyle('node-6', 'color', 'rgb(255, 255, 255)')

      // --- Hierarchy ---
      // node-2 is child of node-1
      // node-3 is child of node-1
      // node-5 is child of node-4
      // node-6 is child of node-4
    }
  ),

  testWithSetup(
    '[01-elemente] Kurzschreibweise mit Semicolon: Example 6',
    `// Frame ohne Properties, nur Kinder
Frame; Icon "star", ic #f59e0b, is 20; Text "Favorit", col white`,
    async (api: TestAPI) => {
      // ========================================
      // DEEP VALIDATION: 3 elements
      // ========================================

      const nodeIds = api.preview.getNodeIds()
      api.assert.ok(nodeIds.length === 3, `Expected 3 nodes, got ${nodeIds.length}`)

      // --- node-1: Frame → <div> ---
      const node_1 = api.preview.inspect('node-1')
      api.assert.ok(node_1 !== null, 'node-1 must exist')
      api.assert.ok(node_1?.tagName === 'div', `node-1: expected <div>, got ${node_1?.tagName}`)
      api.assert.hasStyle('node-1', 'display', 'flex')
      api.assert.hasStyle('node-1', 'flexDirection', 'column')
      api.assert.hasChildren('node-1', 2)

      // --- node-2: Icon → <span> "star" ---
      const node_2 = api.preview.inspect('node-2')
      api.assert.ok(node_2 !== null, 'node-2 must exist')
      api.assert.ok(node_2?.tagName === 'span', `node-2: expected <span>, got ${node_2?.tagName}`)
      api.assert.hasStyle('node-2', 'color', 'rgb(245, 158, 11)')

      // --- node-3: Text → <span> "Favorit" ---
      const node_3 = api.preview.inspect('node-3')
      api.assert.ok(node_3 !== null, 'node-3 must exist')
      api.assert.ok(node_3?.tagName === 'span', `node-3: expected <span>, got ${node_3?.tagName}`)
      api.assert.hasText('node-3', 'Favorit')
      api.assert.hasStyle('node-3', 'color', 'rgb(255, 255, 255)')

      // --- Hierarchy ---
      // node-2 is child of node-1
      // node-3 is child of node-1
    }
  ),

  testWithSetup(
    '[01-elemente] Layout-Properties (Vorschau): Example 7',
    `Frame gap 16, bg #0a0a0a, pad 16, rad 8

  // hor = horizontal anordnen
  Frame hor, gap 8, bg #1a1a1a, pad 12, rad 6
    Frame w 40, h 40, bg #2271C1, rad 4
    Frame w 40, h 40, bg #10b981, rad 4
    Frame w 40, h 40, bg #f59e0b, rad 4

  // center = horizontal und vertikal zentrieren
  Frame w 200, h 60, bg #1a1a1a, rad 6, center
    Text "Zentriert", col white

  // spread = Kinder an den Rändern verteilen
  Frame hor, spread, ver-center, w 300, bg #1a1a1a, pad 12, rad 6
    Text "Links", col white
    Text "Rechts", col white

  // gap = Abstand zwischen Kindern
  Frame hor, gap 24, bg #1a1a1a, pad 12, rad 6
    Text "A", col white
    Text "B", col white
    Text "C", col white`,
    async (api: TestAPI) => {
      // ========================================
      // DEEP VALIDATION: 14 elements
      // ========================================

      const nodeIds = api.preview.getNodeIds()
      api.assert.ok(nodeIds.length === 14, `Expected 14 nodes, got ${nodeIds.length}`)

      // --- node-1: Frame → <div> ---
      const node_1 = api.preview.inspect('node-1')
      api.assert.ok(node_1 !== null, 'node-1 must exist')
      api.assert.ok(node_1?.tagName === 'div', `node-1: expected <div>, got ${node_1?.tagName}`)
      api.assert.hasStyle('node-1', 'display', 'flex')
      api.assert.hasStyle('node-1', 'flexDirection', 'column')
      api.assert.hasStyle('node-1', 'gap', '16px')
      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(10, 10, 10)')
      api.assert.hasStyle('node-1', 'padding', '16px')
      api.assert.hasStyle('node-1', 'borderRadius', '8px')
      api.assert.hasChildren('node-1', 4)

      // --- node-2: Frame → <div> ---
      const node_2 = api.preview.inspect('node-2')
      api.assert.ok(node_2 !== null, 'node-2 must exist')
      api.assert.ok(node_2?.tagName === 'div', `node-2: expected <div>, got ${node_2?.tagName}`)
      api.assert.hasStyle('node-2', 'display', 'flex')
      api.assert.hasStyle('node-2', 'flexDirection', 'row')
      api.assert.hasStyle('node-2', 'gap', '8px')
      api.assert.hasStyle('node-2', 'backgroundColor', 'rgb(26, 26, 26)')
      api.assert.hasStyle('node-2', 'padding', '12px')
      api.assert.hasStyle('node-2', 'borderRadius', '6px')
      api.assert.hasChildren('node-2', 3)

      // --- node-3: Frame → <div> ---
      const node_3 = api.preview.inspect('node-3')
      api.assert.ok(node_3 !== null, 'node-3 must exist')
      api.assert.ok(node_3?.tagName === 'div', `node-3: expected <div>, got ${node_3?.tagName}`)
      api.assert.hasStyle('node-3', 'display', 'flex')
      api.assert.hasStyle('node-3', 'flexDirection', 'column')
      api.assert.hasStyle('node-3', 'width', '40px')
      api.assert.hasStyle('node-3', 'height', '40px')
      api.assert.hasStyle('node-3', 'backgroundColor', 'rgb(34, 113, 193)')
      api.assert.hasStyle('node-3', 'borderRadius', '4px')

      // --- node-4: Frame → <div> ---
      const node_4 = api.preview.inspect('node-4')
      api.assert.ok(node_4 !== null, 'node-4 must exist')
      api.assert.ok(node_4?.tagName === 'div', `node-4: expected <div>, got ${node_4?.tagName}`)
      api.assert.hasStyle('node-4', 'display', 'flex')
      api.assert.hasStyle('node-4', 'flexDirection', 'column')
      api.assert.hasStyle('node-4', 'width', '40px')
      api.assert.hasStyle('node-4', 'height', '40px')
      api.assert.hasStyle('node-4', 'backgroundColor', 'rgb(16, 185, 129)')
      api.assert.hasStyle('node-4', 'borderRadius', '4px')

      // --- node-5: Frame → <div> ---
      const node_5 = api.preview.inspect('node-5')
      api.assert.ok(node_5 !== null, 'node-5 must exist')
      api.assert.ok(node_5?.tagName === 'div', `node-5: expected <div>, got ${node_5?.tagName}`)
      api.assert.hasStyle('node-5', 'display', 'flex')
      api.assert.hasStyle('node-5', 'flexDirection', 'column')
      api.assert.hasStyle('node-5', 'width', '40px')
      api.assert.hasStyle('node-5', 'height', '40px')
      api.assert.hasStyle('node-5', 'backgroundColor', 'rgb(245, 158, 11)')
      api.assert.hasStyle('node-5', 'borderRadius', '4px')

      // --- node-6: Frame → <div> ---
      const node_6 = api.preview.inspect('node-6')
      api.assert.ok(node_6 !== null, 'node-6 must exist')
      api.assert.ok(node_6?.tagName === 'div', `node-6: expected <div>, got ${node_6?.tagName}`)
      api.assert.hasStyle('node-6', 'display', 'flex')
      api.assert.hasStyle('node-6', 'flexDirection', 'column')
      api.assert.hasStyle('node-6', 'width', '200px')
      api.assert.hasStyle('node-6', 'height', '60px')
      api.assert.hasStyle('node-6', 'backgroundColor', 'rgb(26, 26, 26)')
      api.assert.hasStyle('node-6', 'borderRadius', '6px')
      api.assert.hasChildren('node-6', 1)

      // --- node-7: Text → <span> "Zentriert" ---
      const node_7 = api.preview.inspect('node-7')
      api.assert.ok(node_7 !== null, 'node-7 must exist')
      api.assert.ok(node_7?.tagName === 'span', `node-7: expected <span>, got ${node_7?.tagName}`)
      api.assert.hasText('node-7', 'Zentriert')
      api.assert.hasStyle('node-7', 'color', 'rgb(255, 255, 255)')

      // --- node-8: Frame → <div> ---
      const node_8 = api.preview.inspect('node-8')
      api.assert.ok(node_8 !== null, 'node-8 must exist')
      api.assert.ok(node_8?.tagName === 'div', `node-8: expected <div>, got ${node_8?.tagName}`)
      api.assert.hasStyle('node-8', 'display', 'flex')
      api.assert.hasStyle('node-8', 'flexDirection', 'row')
      api.assert.hasStyle('node-8', 'width', '300px')
      api.assert.hasStyle('node-8', 'backgroundColor', 'rgb(26, 26, 26)')
      api.assert.hasStyle('node-8', 'padding', '12px')
      api.assert.hasStyle('node-8', 'borderRadius', '6px')
      api.assert.hasChildren('node-8', 2)

      // --- node-9: Text → <span> "Links" ---
      const node_9 = api.preview.inspect('node-9')
      api.assert.ok(node_9 !== null, 'node-9 must exist')
      api.assert.ok(node_9?.tagName === 'span', `node-9: expected <span>, got ${node_9?.tagName}`)
      api.assert.hasText('node-9', 'Links')
      api.assert.hasStyle('node-9', 'color', 'rgb(255, 255, 255)')

      // --- node-10: Text → <span> "Rechts" ---
      const node_10 = api.preview.inspect('node-10')
      api.assert.ok(node_10 !== null, 'node-10 must exist')
      api.assert.ok(
        node_10?.tagName === 'span',
        `node-10: expected <span>, got ${node_10?.tagName}`
      )
      api.assert.hasText('node-10', 'Rechts')
      api.assert.hasStyle('node-10', 'color', 'rgb(255, 255, 255)')

      // --- node-11: Frame → <div> ---
      const node_11 = api.preview.inspect('node-11')
      api.assert.ok(node_11 !== null, 'node-11 must exist')
      api.assert.ok(node_11?.tagName === 'div', `node-11: expected <div>, got ${node_11?.tagName}`)
      api.assert.hasStyle('node-11', 'display', 'flex')
      api.assert.hasStyle('node-11', 'flexDirection', 'row')
      api.assert.hasStyle('node-11', 'gap', '24px')
      api.assert.hasStyle('node-11', 'backgroundColor', 'rgb(26, 26, 26)')
      api.assert.hasStyle('node-11', 'padding', '12px')
      api.assert.hasStyle('node-11', 'borderRadius', '6px')
      api.assert.hasChildren('node-11', 3)

      // --- node-12: Text → <span> "A" ---
      const node_12 = api.preview.inspect('node-12')
      api.assert.ok(node_12 !== null, 'node-12 must exist')
      api.assert.ok(
        node_12?.tagName === 'span',
        `node-12: expected <span>, got ${node_12?.tagName}`
      )
      api.assert.hasText('node-12', 'A')
      api.assert.hasStyle('node-12', 'color', 'rgb(255, 255, 255)')

      // --- node-13: Text → <span> "B" ---
      const node_13 = api.preview.inspect('node-13')
      api.assert.ok(node_13 !== null, 'node-13 must exist')
      api.assert.ok(
        node_13?.tagName === 'span',
        `node-13: expected <span>, got ${node_13?.tagName}`
      )
      api.assert.hasText('node-13', 'B')
      api.assert.hasStyle('node-13', 'color', 'rgb(255, 255, 255)')

      // --- node-14: Text → <span> "C" ---
      const node_14 = api.preview.inspect('node-14')
      api.assert.ok(node_14 !== null, 'node-14 must exist')
      api.assert.ok(
        node_14?.tagName === 'span',
        `node-14: expected <span>, got ${node_14?.tagName}`
      )
      api.assert.hasText('node-14', 'C')
      api.assert.hasStyle('node-14', 'color', 'rgb(255, 255, 255)')

      // --- Hierarchy ---
      // node-2 is child of node-1
      // node-3 is child of node-2
      // node-4 is child of node-2
      // node-5 is child of node-2
      // node-6 is child of node-1
      // node-7 is child of node-6
      // node-8 is child of node-1
      // node-9 is child of node-8
      // node-10 is child of node-8
      // node-11 is child of node-1
      // node-12 is child of node-11
      // node-13 is child of node-11
      // node-14 is child of node-11
    }
  ),

  testWithSetup(
    '[01-elemente] Icons: Example 8',
    `Frame gap 16, bg #0a0a0a, pad 16, rad 8

  // Lucide Icons (Standard)
  Frame hor, gap 16, bg #1a1a1a, pad 12, rad 6
    Icon "check", ic #10b981, is 24
    Icon "x", ic #ef4444, is 24
    Icon "settings", ic #888, is 24
    Icon "user", ic #2271C1, is 24

  // fill = ausgefüllte Variante
  Frame hor, gap 16, bg #1a1a1a, pad 12, rad 6
    Icon "heart", ic #ef4444, is 24
    Icon "heart", ic #ef4444, is 24, fill

  // Icons in Buttons
  Button pad 10 16, rad 6, bg #2271C1, col white
    Frame hor, gap 8, center
      Icon "save", ic white, is 16
      Text "Speichern"`,
    async (api: TestAPI) => {
      // ========================================
      // DEEP VALIDATION: 13 elements
      // ========================================

      const nodeIds = api.preview.getNodeIds()
      api.assert.ok(nodeIds.length === 13, `Expected 13 nodes, got ${nodeIds.length}`)

      // --- node-1: Frame → <div> ---
      const node_1 = api.preview.inspect('node-1')
      api.assert.ok(node_1 !== null, 'node-1 must exist')
      api.assert.ok(node_1?.tagName === 'div', `node-1: expected <div>, got ${node_1?.tagName}`)
      api.assert.hasStyle('node-1', 'display', 'flex')
      api.assert.hasStyle('node-1', 'flexDirection', 'column')
      api.assert.hasStyle('node-1', 'gap', '16px')
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
      api.assert.hasStyle('node-2', 'gap', '16px')
      api.assert.hasStyle('node-2', 'backgroundColor', 'rgb(26, 26, 26)')
      api.assert.hasStyle('node-2', 'padding', '12px')
      api.assert.hasStyle('node-2', 'borderRadius', '6px')
      api.assert.hasChildren('node-2', 4)

      // --- node-3: Icon → <span> "check" ---
      const node_3 = api.preview.inspect('node-3')
      api.assert.ok(node_3 !== null, 'node-3 must exist')
      api.assert.ok(node_3?.tagName === 'span', `node-3: expected <span>, got ${node_3?.tagName}`)
      api.assert.hasStyle('node-3', 'color', 'rgb(16, 185, 129)')

      // --- node-4: Icon → <span> "x" ---
      const node_4 = api.preview.inspect('node-4')
      api.assert.ok(node_4 !== null, 'node-4 must exist')
      api.assert.ok(node_4?.tagName === 'span', `node-4: expected <span>, got ${node_4?.tagName}`)
      api.assert.hasStyle('node-4', 'color', 'rgb(239, 68, 68)')

      // --- node-5: Icon → <span> "settings" ---
      const node_5 = api.preview.inspect('node-5')
      api.assert.ok(node_5 !== null, 'node-5 must exist')
      api.assert.ok(node_5?.tagName === 'span', `node-5: expected <span>, got ${node_5?.tagName}`)
      api.assert.hasStyle('node-5', 'color', 'rgb(136, 136, 136)')

      // --- node-6: Icon → <span> "user" ---
      const node_6 = api.preview.inspect('node-6')
      api.assert.ok(node_6 !== null, 'node-6 must exist')
      api.assert.ok(node_6?.tagName === 'span', `node-6: expected <span>, got ${node_6?.tagName}`)
      api.assert.hasStyle('node-6', 'color', 'rgb(34, 113, 193)')

      // --- node-7: Frame → <div> ---
      const node_7 = api.preview.inspect('node-7')
      api.assert.ok(node_7 !== null, 'node-7 must exist')
      api.assert.ok(node_7?.tagName === 'div', `node-7: expected <div>, got ${node_7?.tagName}`)
      api.assert.hasStyle('node-7', 'display', 'flex')
      api.assert.hasStyle('node-7', 'flexDirection', 'row')
      api.assert.hasStyle('node-7', 'gap', '16px')
      api.assert.hasStyle('node-7', 'backgroundColor', 'rgb(26, 26, 26)')
      api.assert.hasStyle('node-7', 'padding', '12px')
      api.assert.hasStyle('node-7', 'borderRadius', '6px')
      api.assert.hasChildren('node-7', 2)

      // --- node-8: Icon → <span> "heart" ---
      const node_8 = api.preview.inspect('node-8')
      api.assert.ok(node_8 !== null, 'node-8 must exist')
      api.assert.ok(node_8?.tagName === 'span', `node-8: expected <span>, got ${node_8?.tagName}`)
      api.assert.hasStyle('node-8', 'color', 'rgb(239, 68, 68)')

      // --- node-9: Icon → <span> "heart" ---
      const node_9 = api.preview.inspect('node-9')
      api.assert.ok(node_9 !== null, 'node-9 must exist')
      api.assert.ok(node_9?.tagName === 'span', `node-9: expected <span>, got ${node_9?.tagName}`)
      api.assert.hasStyle('node-9', 'color', 'rgb(239, 68, 68)')

      // --- node-10: Button → <button> ---
      const node_10 = api.preview.inspect('node-10')
      api.assert.ok(node_10 !== null, 'node-10 must exist')
      api.assert.ok(
        node_10?.tagName === 'button',
        `node-10: expected <button>, got ${node_10?.tagName}`
      )
      api.assert.hasStyle('node-10', 'paddingTop', '10px')
      api.assert.hasStyle('node-10', 'paddingBottom', '10px')
      api.assert.hasStyle('node-10', 'paddingLeft', '16px')
      api.assert.hasStyle('node-10', 'paddingRight', '16px')
      api.assert.hasStyle('node-10', 'borderRadius', '6px')
      api.assert.hasStyle('node-10', 'backgroundColor', 'rgb(34, 113, 193)')
      api.assert.hasStyle('node-10', 'color', 'rgb(255, 255, 255)')
      api.assert.hasChildren('node-10', 1)

      // --- node-11: Frame → <div> ---
      const node_11 = api.preview.inspect('node-11')
      api.assert.ok(node_11 !== null, 'node-11 must exist')
      api.assert.ok(node_11?.tagName === 'div', `node-11: expected <div>, got ${node_11?.tagName}`)
      api.assert.hasStyle('node-11', 'display', 'flex')
      api.assert.hasStyle('node-11', 'flexDirection', 'row')
      api.assert.hasStyle('node-11', 'gap', '8px')
      api.assert.hasChildren('node-11', 2)

      // --- node-12: Icon → <span> "save" ---
      const node_12 = api.preview.inspect('node-12')
      api.assert.ok(node_12 !== null, 'node-12 must exist')
      api.assert.ok(
        node_12?.tagName === 'span',
        `node-12: expected <span>, got ${node_12?.tagName}`
      )
      api.assert.hasStyle('node-12', 'color', 'rgb(255, 255, 255)')

      // --- node-13: Text → <span> "Speichern" ---
      const node_13 = api.preview.inspect('node-13')
      api.assert.ok(node_13 !== null, 'node-13 must exist')
      api.assert.ok(
        node_13?.tagName === 'span',
        `node-13: expected <span>, got ${node_13?.tagName}`
      )
      api.assert.hasText('node-13', 'Speichern')

      // --- Hierarchy ---
      // node-2 is child of node-1
      // node-3 is child of node-2
      // node-4 is child of node-2
      // node-5 is child of node-2
      // node-6 is child of node-2
      // node-7 is child of node-1
      // node-8 is child of node-7
      // node-9 is child of node-7
      // node-10 is child of node-1
      // node-11 is child of node-10
      // node-12 is child of node-11
      // node-13 is child of node-11
    }
  ),

  testWithSetup(
    '[01-elemente] Praxisbeispiel: Card: Example 9',
    `Frame w 300, bg #1a1a1a, rad 12, pad 20, gap 16

  // Header mit Icon
  Frame hor, gap 12, center
    Icon "user", ic #2271C1, is 32
    Frame gap 2
      Text "Max Mustermann", col white, fs 16, weight semibold
      Text "Software Engineer", col #888, fs 13

  // Beschreibung
  Text "Arbeitet an spannenden Projekten.", col #aaa, fs 14

  // Action-Buttons
  Frame hor, gap 8
    Button pad 10 16, rad 6, bg #2271C1, col white
      Frame hor, gap 6, center
        Icon "mail", ic white, is 14
        Text "Nachricht"
    Button "Folgen", pad 10 16, rad 6, bg #333, col white`,
    async (api: TestAPI) => {
      // ========================================
      // DEEP VALIDATION: 13 elements
      // ========================================

      const nodeIds = api.preview.getNodeIds()
      api.assert.ok(nodeIds.length === 13, `Expected 13 nodes, got ${nodeIds.length}`)

      // --- node-1: Frame → <div> ---
      const node_1 = api.preview.inspect('node-1')
      api.assert.ok(node_1 !== null, 'node-1 must exist')
      api.assert.ok(node_1?.tagName === 'div', `node-1: expected <div>, got ${node_1?.tagName}`)
      api.assert.hasStyle('node-1', 'display', 'flex')
      api.assert.hasStyle('node-1', 'flexDirection', 'column')
      api.assert.hasStyle('node-1', 'width', '300px')
      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(26, 26, 26)')
      api.assert.hasStyle('node-1', 'borderRadius', '12px')
      api.assert.hasStyle('node-1', 'padding', '20px')
      api.assert.hasStyle('node-1', 'gap', '16px')
      api.assert.hasChildren('node-1', 3)

      // --- node-2: Frame → <div> ---
      const node_2 = api.preview.inspect('node-2')
      api.assert.ok(node_2 !== null, 'node-2 must exist')
      api.assert.ok(node_2?.tagName === 'div', `node-2: expected <div>, got ${node_2?.tagName}`)
      api.assert.hasStyle('node-2', 'display', 'flex')
      api.assert.hasStyle('node-2', 'flexDirection', 'row')
      api.assert.hasStyle('node-2', 'gap', '12px')
      api.assert.hasChildren('node-2', 2)

      // --- node-3: Icon → <span> "user" ---
      const node_3 = api.preview.inspect('node-3')
      api.assert.ok(node_3 !== null, 'node-3 must exist')
      api.assert.ok(node_3?.tagName === 'span', `node-3: expected <span>, got ${node_3?.tagName}`)
      api.assert.hasStyle('node-3', 'color', 'rgb(34, 113, 193)')

      // --- node-4: Frame → <div> ---
      const node_4 = api.preview.inspect('node-4')
      api.assert.ok(node_4 !== null, 'node-4 must exist')
      api.assert.ok(node_4?.tagName === 'div', `node-4: expected <div>, got ${node_4?.tagName}`)
      api.assert.hasStyle('node-4', 'display', 'flex')
      api.assert.hasStyle('node-4', 'flexDirection', 'column')
      api.assert.hasStyle('node-4', 'gap', '2px')
      api.assert.hasChildren('node-4', 2)

      // --- node-5: Text → <span> "Max Mustermann" ---
      const node_5 = api.preview.inspect('node-5')
      api.assert.ok(node_5 !== null, 'node-5 must exist')
      api.assert.ok(node_5?.tagName === 'span', `node-5: expected <span>, got ${node_5?.tagName}`)
      api.assert.hasText('node-5', 'Max Mustermann')
      api.assert.hasStyle('node-5', 'color', 'rgb(255, 255, 255)')
      api.assert.hasStyle('node-5', 'fontSize', '16px')
      api.assert.hasStyle('node-5', 'fontWeight', '600')

      // --- node-6: Text → <span> "Software Engineer" ---
      const node_6 = api.preview.inspect('node-6')
      api.assert.ok(node_6 !== null, 'node-6 must exist')
      api.assert.ok(node_6?.tagName === 'span', `node-6: expected <span>, got ${node_6?.tagName}`)
      api.assert.hasText('node-6', 'Software Engineer')
      api.assert.hasStyle('node-6', 'color', 'rgb(136, 136, 136)')
      api.assert.hasStyle('node-6', 'fontSize', '13px')

      // --- node-7: Text → <span> "Arbeitet an spannenden Projekten." ---
      const node_7 = api.preview.inspect('node-7')
      api.assert.ok(node_7 !== null, 'node-7 must exist')
      api.assert.ok(node_7?.tagName === 'span', `node-7: expected <span>, got ${node_7?.tagName}`)
      api.assert.hasText('node-7', 'Arbeitet an spannenden Projekten.')
      api.assert.hasStyle('node-7', 'color', 'rgb(170, 170, 170)')
      api.assert.hasStyle('node-7', 'fontSize', '14px')

      // --- node-8: Frame → <div> ---
      const node_8 = api.preview.inspect('node-8')
      api.assert.ok(node_8 !== null, 'node-8 must exist')
      api.assert.ok(node_8?.tagName === 'div', `node-8: expected <div>, got ${node_8?.tagName}`)
      api.assert.hasStyle('node-8', 'display', 'flex')
      api.assert.hasStyle('node-8', 'flexDirection', 'row')
      api.assert.hasStyle('node-8', 'gap', '8px')
      api.assert.hasChildren('node-8', 2)

      // --- node-9: Button → <button> ---
      const node_9 = api.preview.inspect('node-9')
      api.assert.ok(node_9 !== null, 'node-9 must exist')
      api.assert.ok(
        node_9?.tagName === 'button',
        `node-9: expected <button>, got ${node_9?.tagName}`
      )
      api.assert.hasStyle('node-9', 'paddingTop', '10px')
      api.assert.hasStyle('node-9', 'paddingBottom', '10px')
      api.assert.hasStyle('node-9', 'paddingLeft', '16px')
      api.assert.hasStyle('node-9', 'paddingRight', '16px')
      api.assert.hasStyle('node-9', 'borderRadius', '6px')
      api.assert.hasStyle('node-9', 'backgroundColor', 'rgb(34, 113, 193)')
      api.assert.hasStyle('node-9', 'color', 'rgb(255, 255, 255)')
      api.assert.hasChildren('node-9', 1)

      // --- node-10: Frame → <div> ---
      const node_10 = api.preview.inspect('node-10')
      api.assert.ok(node_10 !== null, 'node-10 must exist')
      api.assert.ok(node_10?.tagName === 'div', `node-10: expected <div>, got ${node_10?.tagName}`)
      api.assert.hasStyle('node-10', 'display', 'flex')
      api.assert.hasStyle('node-10', 'flexDirection', 'row')
      api.assert.hasStyle('node-10', 'gap', '6px')
      api.assert.hasChildren('node-10', 2)

      // --- node-11: Icon → <span> "mail" ---
      const node_11 = api.preview.inspect('node-11')
      api.assert.ok(node_11 !== null, 'node-11 must exist')
      api.assert.ok(
        node_11?.tagName === 'span',
        `node-11: expected <span>, got ${node_11?.tagName}`
      )
      api.assert.hasStyle('node-11', 'color', 'rgb(255, 255, 255)')

      // --- node-12: Text → <span> "Nachricht" ---
      const node_12 = api.preview.inspect('node-12')
      api.assert.ok(node_12 !== null, 'node-12 must exist')
      api.assert.ok(
        node_12?.tagName === 'span',
        `node-12: expected <span>, got ${node_12?.tagName}`
      )
      api.assert.hasText('node-12', 'Nachricht')

      // --- node-13: Button → <button> "Folgen" ---
      const node_13 = api.preview.inspect('node-13')
      api.assert.ok(node_13 !== null, 'node-13 must exist')
      api.assert.ok(
        node_13?.tagName === 'button',
        `node-13: expected <button>, got ${node_13?.tagName}`
      )
      api.assert.hasText('node-13', 'Folgen')
      api.assert.hasStyle('node-13', 'paddingTop', '10px')
      api.assert.hasStyle('node-13', 'paddingBottom', '10px')
      api.assert.hasStyle('node-13', 'paddingLeft', '16px')
      api.assert.hasStyle('node-13', 'paddingRight', '16px')
      api.assert.hasStyle('node-13', 'borderRadius', '6px')
      api.assert.hasStyle('node-13', 'backgroundColor', 'rgb(51, 51, 51)')
      api.assert.hasStyle('node-13', 'color', 'rgb(255, 255, 255)')

      // --- Hierarchy ---
      // node-2 is child of node-1
      // node-3 is child of node-2
      // node-4 is child of node-2
      // node-5 is child of node-4
      // node-6 is child of node-4
      // node-7 is child of node-1
      // node-8 is child of node-1
      // node-9 is child of node-8
      // node-10 is child of node-9
      // node-11 is child of node-10
      // node-12 is child of node-10
      // node-13 is child of node-8
    }
  ),
])
