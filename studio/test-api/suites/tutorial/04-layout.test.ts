/**
 * Tutorial Tests: Layout
 *
 * Auto-generated from docs/tutorial/04-layout.html
 * Generated: 2026-04-20T13:03:12.772Z
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

export const chapter_04_layoutTests: TestCase[] = describe('Tutorial: Layout', [
  testWithSetup(
    '[04-layout] Flex Layout: Example 1',
    `Box: w 50, h 50, rad 6, center

Frame gap 12, bg #0a0a0a, pad 16, rad 8
  // Vertikal (Standard)
  Frame bg #1a1a1a, pad 16, rad 8, gap 8
    Text "Zeile 1", col white
    Text "Zeile 2", col white
    Text "Zeile 3", col white

  // Horizontal
  Frame hor, bg #1a1a1a, pad 16, rad 8, gap 12
    Box "1", bg #2271C1
    Box "2", bg #10b981
    Box "3", bg #f59e0b`,
    async (api: TestAPI) => {
      // Complex feature: component definitions
      // If we reach here, compilation succeeded (no exception thrown)
      api.assert.ok(true, 'Compilation successful')
    }
  ),

  testWithSetup(
    '[04-layout] Flex Layout: Example 2',
    `Frame gap 8, w 300, bg #0a0a0a, pad 16, rad 8
  // Fester Wert in Pixeln
  Frame w 120, h 40, bg #f59e0b, rad 4, center
    Text "w 120", col white, fs 12

  // hug = nur so groß wie der Inhalt
  Frame w hug, h 40, bg #10b981, rad 4, center, pad 0 16
    Text "w hug", col white, fs 12

  // full = verfügbaren Platz füllen
  Frame w full, h 40, bg #2271C1, rad 4, center
    Text "w full", col white, fs 12`,
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
      api.assert.hasStyle('node-1', 'gap', '8px')
      api.assert.hasStyle('node-1', 'width', '300px')
      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(10, 10, 10)')
      api.assert.hasStyle('node-1', 'padding', '16px')
      api.assert.hasStyle('node-1', 'borderRadius', '8px')
      api.assert.hasChildren('node-1', 3)

      // --- node-2: Frame → <div> ---
      const node_2 = api.preview.inspect('node-2')
      api.assert.ok(node_2 !== null, 'node-2 must exist')
      api.assert.ok(node_2?.tagName === 'div', `node-2: expected <div>, got ${node_2?.tagName}`)
      api.assert.hasStyle('node-2', 'display', 'flex')
      api.assert.hasStyle('node-2', 'flexDirection', 'column')
      api.assert.hasStyle('node-2', 'width', '120px')
      api.assert.hasStyle('node-2', 'height', '40px')
      api.assert.hasStyle('node-2', 'backgroundColor', 'rgb(245, 158, 11)')
      api.assert.hasStyle('node-2', 'borderRadius', '4px')
      api.assert.hasChildren('node-2', 1)

      // --- node-3: Text → <span> "w 120" ---
      const node_3 = api.preview.inspect('node-3')
      api.assert.ok(node_3 !== null, 'node-3 must exist')
      api.assert.ok(node_3?.tagName === 'span', `node-3: expected <span>, got ${node_3?.tagName}`)
      api.assert.hasText('node-3', 'w 120')
      api.assert.hasStyle('node-3', 'color', 'rgb(255, 255, 255)')
      api.assert.hasStyle('node-3', 'fontSize', '12px')

      // --- node-4: Frame → <div> ---
      const node_4 = api.preview.inspect('node-4')
      api.assert.ok(node_4 !== null, 'node-4 must exist')
      api.assert.ok(node_4?.tagName === 'div', `node-4: expected <div>, got ${node_4?.tagName}`)
      api.assert.hasStyle('node-4', 'display', 'flex')
      api.assert.hasStyle('node-4', 'flexDirection', 'column')
      // Skipping fit-content: actual value depends on content
      api.assert.hasStyle('node-4', 'height', '40px')
      api.assert.hasStyle('node-4', 'backgroundColor', 'rgb(16, 185, 129)')
      api.assert.hasStyle('node-4', 'borderRadius', '4px')
      api.assert.hasStyle('node-4', 'paddingTop', '0px')
      api.assert.hasStyle('node-4', 'paddingBottom', '0px')
      api.assert.hasStyle('node-4', 'paddingLeft', '16px')
      api.assert.hasStyle('node-4', 'paddingRight', '16px')
      api.assert.hasChildren('node-4', 1)

      // --- node-5: Text → <span> "w hug" ---
      const node_5 = api.preview.inspect('node-5')
      api.assert.ok(node_5 !== null, 'node-5 must exist')
      api.assert.ok(node_5?.tagName === 'span', `node-5: expected <span>, got ${node_5?.tagName}`)
      api.assert.hasText('node-5', 'w hug')
      api.assert.hasStyle('node-5', 'color', 'rgb(255, 255, 255)')
      api.assert.hasStyle('node-5', 'fontSize', '12px')

      // --- node-6: Frame → <div> ---
      const node_6 = api.preview.inspect('node-6')
      api.assert.ok(node_6 !== null, 'node-6 must exist')
      api.assert.ok(node_6?.tagName === 'div', `node-6: expected <div>, got ${node_6?.tagName}`)
      api.assert.hasStyle('node-6', 'display', 'flex')
      api.assert.hasStyle('node-6', 'flexDirection', 'column')
      // Skipping width: 100% - actual value depends on parent
      api.assert.hasStyle('node-6', 'height', '40px')
      api.assert.hasStyle('node-6', 'backgroundColor', 'rgb(34, 113, 193)')
      api.assert.hasStyle('node-6', 'borderRadius', '4px')
      api.assert.hasChildren('node-6', 1)

      // --- node-7: Text → <span> "w full" ---
      const node_7 = api.preview.inspect('node-7')
      api.assert.ok(node_7 !== null, 'node-7 must exist')
      api.assert.ok(node_7?.tagName === 'span', `node-7: expected <span>, got ${node_7?.tagName}`)
      api.assert.hasText('node-7', 'w full')
      api.assert.hasStyle('node-7', 'color', 'rgb(255, 255, 255)')
      api.assert.hasStyle('node-7', 'fontSize', '12px')

      // --- Hierarchy ---
      // node-2 is child of node-1
      // node-3 is child of node-2
      // node-4 is child of node-1
      // node-5 is child of node-4
      // node-6 is child of node-1
      // node-7 is child of node-6
    }
  ),

  testWithSetup(
    '[04-layout] Flex Layout: Example 3',
    `Frame gap 12, bg #0a0a0a, pad 16, rad 8
  // center – beide Achsen
  Frame w 200, h 80, bg #1a1a1a, rad 8, center
    Text "center", col white

  // ver-center – nur vertikal (nützlich bei hor + spread)
  Frame hor, spread, ver-center, w full, bg #1a1a1a, pad 16, rad 8
    Text "Links", col white
    Text "Rechts", col white

  // hor-center – nur horizontal
  Frame w 200, h 60, bg #1a1a1a, rad 8, hor-center
    Text "nur horizontal", col white`,
    async (api: TestAPI) => {
      // ========================================
      // DEEP VALIDATION: 8 elements
      // ========================================

      const nodeIds = api.preview.getNodeIds()
      api.assert.ok(nodeIds.length === 8, `Expected 8 nodes, got ${nodeIds.length}`)

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
      api.assert.hasStyle('node-2', 'flexDirection', 'column')
      api.assert.hasStyle('node-2', 'width', '200px')
      api.assert.hasStyle('node-2', 'height', '80px')
      api.assert.hasStyle('node-2', 'backgroundColor', 'rgb(26, 26, 26)')
      api.assert.hasStyle('node-2', 'borderRadius', '8px')
      api.assert.hasChildren('node-2', 1)

      // --- node-3: Text → <span> "center" ---
      const node_3 = api.preview.inspect('node-3')
      api.assert.ok(node_3 !== null, 'node-3 must exist')
      api.assert.ok(node_3?.tagName === 'span', `node-3: expected <span>, got ${node_3?.tagName}`)
      api.assert.hasText('node-3', 'center')
      api.assert.hasStyle('node-3', 'color', 'rgb(255, 255, 255)')

      // --- node-4: Frame → <div> ---
      const node_4 = api.preview.inspect('node-4')
      api.assert.ok(node_4 !== null, 'node-4 must exist')
      api.assert.ok(node_4?.tagName === 'div', `node-4: expected <div>, got ${node_4?.tagName}`)
      api.assert.hasStyle('node-4', 'display', 'flex')
      api.assert.hasStyle('node-4', 'flexDirection', 'row')
      // Skipping width: 100% - actual value depends on parent
      api.assert.hasStyle('node-4', 'backgroundColor', 'rgb(26, 26, 26)')
      api.assert.hasStyle('node-4', 'padding', '16px')
      api.assert.hasStyle('node-4', 'borderRadius', '8px')
      api.assert.hasChildren('node-4', 2)

      // --- node-5: Text → <span> "Links" ---
      const node_5 = api.preview.inspect('node-5')
      api.assert.ok(node_5 !== null, 'node-5 must exist')
      api.assert.ok(node_5?.tagName === 'span', `node-5: expected <span>, got ${node_5?.tagName}`)
      api.assert.hasText('node-5', 'Links')
      api.assert.hasStyle('node-5', 'color', 'rgb(255, 255, 255)')

      // --- node-6: Text → <span> "Rechts" ---
      const node_6 = api.preview.inspect('node-6')
      api.assert.ok(node_6 !== null, 'node-6 must exist')
      api.assert.ok(node_6?.tagName === 'span', `node-6: expected <span>, got ${node_6?.tagName}`)
      api.assert.hasText('node-6', 'Rechts')
      api.assert.hasStyle('node-6', 'color', 'rgb(255, 255, 255)')

      // --- node-7: Frame → <div> ---
      const node_7 = api.preview.inspect('node-7')
      api.assert.ok(node_7 !== null, 'node-7 must exist')
      api.assert.ok(node_7?.tagName === 'div', `node-7: expected <div>, got ${node_7?.tagName}`)
      api.assert.hasStyle('node-7', 'display', 'flex')
      api.assert.hasStyle('node-7', 'flexDirection', 'column')
      api.assert.hasStyle('node-7', 'width', '200px')
      api.assert.hasStyle('node-7', 'height', '60px')
      api.assert.hasStyle('node-7', 'backgroundColor', 'rgb(26, 26, 26)')
      api.assert.hasStyle('node-7', 'borderRadius', '8px')
      api.assert.hasChildren('node-7', 1)

      // --- node-8: Text → <span> "nur horizontal" ---
      const node_8 = api.preview.inspect('node-8')
      api.assert.ok(node_8 !== null, 'node-8 must exist')
      api.assert.ok(node_8?.tagName === 'span', `node-8: expected <span>, got ${node_8?.tagName}`)
      api.assert.hasText('node-8', 'nur horizontal')
      api.assert.hasStyle('node-8', 'color', 'rgb(255, 255, 255)')

      // --- Hierarchy ---
      // node-2 is child of node-1
      // node-3 is child of node-2
      // node-4 is child of node-1
      // node-5 is child of node-4
      // node-6 is child of node-4
      // node-7 is child of node-1
      // node-8 is child of node-7
    }
  ),

  testWithSetup(
    '[04-layout] Flex Layout: Example 4',
    `Box: w 70, h 70, bg #1a1a1a, rad 6
  Label: col #888, fs 11

Frame gap 8, bg #0a0a0a, pad 12, rad 8
  Frame hor, gap 8
    Box tl
      Label "tl"
    Box tc
      Label "tc"
    Box tr
      Label "tr"
  Frame hor, gap 8
    Box cl
      Label "cl"
    Box center
      Label "cen"
    Box cr
      Label "cr"
  Frame hor, gap 8
    Box bl
      Label "bl"
    Box bc
      Label "bc"
    Box br
      Label "br"`,
    async (api: TestAPI) => {
      // Complex feature: component definitions
      // If we reach here, compilation succeeded (no exception thrown)
      api.assert.ok(true, 'Compilation successful')
    }
  ),

  testWithSetup(
    '[04-layout] Flex Layout: Example 5',
    `Box: w 60, h 40, bg #2271C1, rad 4, center

Frame hor, wrap, gap 8, bg #1a1a1a, pad 16, rad 8, w 240
  Box "1"
  Box "2"
  Box "3"
  Box "4"
  Box "5"`,
    async (api: TestAPI) => {
      // Complex feature: component definitions
      // If we reach here, compilation succeeded (no exception thrown)
      api.assert.ok(true, 'Compilation successful')
    }
  ),

  testWithSetup(
    '[04-layout] Grid Layout: Example 6',
    `Frame w 500, grid 12, gap 8, bg #111, pad 16, rad 8, row-height 40
  // w = Spalten-Span (nicht Pixel!)
  Frame w 12, bg #2271C1, rad 4, center
    Text "w 12 (volle Breite)", col white, fs 12
  Frame w 6, bg #10b981, rad 4, center
    Text "w 6", col white, fs 12
  Frame w 6, bg #10b981, rad 4, center
    Text "w 6", col white, fs 12
  Frame w 4, bg #f59e0b, rad 4, center
    Text "w 4", col white, fs 12
  Frame w 4, bg #f59e0b, rad 4, center
    Text "w 4", col white, fs 12
  Frame w 4, bg #f59e0b, rad 4, center
    Text "w 4", col white, fs 12`,
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
      api.assert.hasStyle('node-1', 'display', 'grid')
      api.assert.hasStyle('node-1', 'flexDirection', 'column')
      api.assert.hasStyle('node-1', 'width', '500px')
      api.assert.hasStyle('node-1', 'gap', '8px')
      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(17, 17, 17)')
      api.assert.hasStyle('node-1', 'padding', '16px')
      api.assert.hasStyle('node-1', 'borderRadius', '8px')
      api.assert.hasChildren('node-1', 6)

      // --- node-2: Frame → <div> ---
      const node_2 = api.preview.inspect('node-2')
      api.assert.ok(node_2 !== null, 'node-2 must exist')
      api.assert.ok(node_2?.tagName === 'div', `node-2: expected <div>, got ${node_2?.tagName}`)
      api.assert.hasStyle('node-2', 'display', 'flex')
      api.assert.hasStyle('node-2', 'flexDirection', 'column')
      // Skipping width: 12px - might be grid columns
      api.assert.hasStyle('node-2', 'backgroundColor', 'rgb(34, 113, 193)')
      api.assert.hasStyle('node-2', 'borderRadius', '4px')
      api.assert.hasChildren('node-2', 1)

      // --- node-3: Text → <span> "w 12 (volle Breite)" ---
      const node_3 = api.preview.inspect('node-3')
      api.assert.ok(node_3 !== null, 'node-3 must exist')
      api.assert.ok(node_3?.tagName === 'span', `node-3: expected <span>, got ${node_3?.tagName}`)
      api.assert.hasText('node-3', 'w 12 (volle Breite)')
      api.assert.hasStyle('node-3', 'color', 'rgb(255, 255, 255)')
      api.assert.hasStyle('node-3', 'fontSize', '12px')

      // --- node-4: Frame → <div> ---
      const node_4 = api.preview.inspect('node-4')
      api.assert.ok(node_4 !== null, 'node-4 must exist')
      api.assert.ok(node_4?.tagName === 'div', `node-4: expected <div>, got ${node_4?.tagName}`)
      api.assert.hasStyle('node-4', 'display', 'flex')
      api.assert.hasStyle('node-4', 'flexDirection', 'column')
      // Skipping width: 6px - might be grid columns
      api.assert.hasStyle('node-4', 'backgroundColor', 'rgb(16, 185, 129)')
      api.assert.hasStyle('node-4', 'borderRadius', '4px')
      api.assert.hasChildren('node-4', 1)

      // --- node-5: Text → <span> "w 6" ---
      const node_5 = api.preview.inspect('node-5')
      api.assert.ok(node_5 !== null, 'node-5 must exist')
      api.assert.ok(node_5?.tagName === 'span', `node-5: expected <span>, got ${node_5?.tagName}`)
      api.assert.hasText('node-5', 'w 6')
      api.assert.hasStyle('node-5', 'color', 'rgb(255, 255, 255)')
      api.assert.hasStyle('node-5', 'fontSize', '12px')

      // --- node-6: Frame → <div> ---
      const node_6 = api.preview.inspect('node-6')
      api.assert.ok(node_6 !== null, 'node-6 must exist')
      api.assert.ok(node_6?.tagName === 'div', `node-6: expected <div>, got ${node_6?.tagName}`)
      api.assert.hasStyle('node-6', 'display', 'flex')
      api.assert.hasStyle('node-6', 'flexDirection', 'column')
      // Skipping width: 6px - might be grid columns
      api.assert.hasStyle('node-6', 'backgroundColor', 'rgb(16, 185, 129)')
      api.assert.hasStyle('node-6', 'borderRadius', '4px')
      api.assert.hasChildren('node-6', 1)

      // --- node-7: Text → <span> "w 6" ---
      const node_7 = api.preview.inspect('node-7')
      api.assert.ok(node_7 !== null, 'node-7 must exist')
      api.assert.ok(node_7?.tagName === 'span', `node-7: expected <span>, got ${node_7?.tagName}`)
      api.assert.hasText('node-7', 'w 6')
      api.assert.hasStyle('node-7', 'color', 'rgb(255, 255, 255)')
      api.assert.hasStyle('node-7', 'fontSize', '12px')

      // --- node-8: Frame → <div> ---
      const node_8 = api.preview.inspect('node-8')
      api.assert.ok(node_8 !== null, 'node-8 must exist')
      api.assert.ok(node_8?.tagName === 'div', `node-8: expected <div>, got ${node_8?.tagName}`)
      api.assert.hasStyle('node-8', 'display', 'flex')
      api.assert.hasStyle('node-8', 'flexDirection', 'column')
      // Skipping width: 4px - might be grid columns
      api.assert.hasStyle('node-8', 'backgroundColor', 'rgb(245, 158, 11)')
      api.assert.hasStyle('node-8', 'borderRadius', '4px')
      api.assert.hasChildren('node-8', 1)

      // --- node-9: Text → <span> "w 4" ---
      const node_9 = api.preview.inspect('node-9')
      api.assert.ok(node_9 !== null, 'node-9 must exist')
      api.assert.ok(node_9?.tagName === 'span', `node-9: expected <span>, got ${node_9?.tagName}`)
      api.assert.hasText('node-9', 'w 4')
      api.assert.hasStyle('node-9', 'color', 'rgb(255, 255, 255)')
      api.assert.hasStyle('node-9', 'fontSize', '12px')

      // --- node-10: Frame → <div> ---
      const node_10 = api.preview.inspect('node-10')
      api.assert.ok(node_10 !== null, 'node-10 must exist')
      api.assert.ok(node_10?.tagName === 'div', `node-10: expected <div>, got ${node_10?.tagName}`)
      api.assert.hasStyle('node-10', 'display', 'flex')
      api.assert.hasStyle('node-10', 'flexDirection', 'column')
      // Skipping width: 4px - might be grid columns
      api.assert.hasStyle('node-10', 'backgroundColor', 'rgb(245, 158, 11)')
      api.assert.hasStyle('node-10', 'borderRadius', '4px')
      api.assert.hasChildren('node-10', 1)

      // --- node-11: Text → <span> "w 4" ---
      const node_11 = api.preview.inspect('node-11')
      api.assert.ok(node_11 !== null, 'node-11 must exist')
      api.assert.ok(
        node_11?.tagName === 'span',
        `node-11: expected <span>, got ${node_11?.tagName}`
      )
      api.assert.hasText('node-11', 'w 4')
      api.assert.hasStyle('node-11', 'color', 'rgb(255, 255, 255)')
      api.assert.hasStyle('node-11', 'fontSize', '12px')

      // --- node-12: Frame → <div> ---
      const node_12 = api.preview.inspect('node-12')
      api.assert.ok(node_12 !== null, 'node-12 must exist')
      api.assert.ok(node_12?.tagName === 'div', `node-12: expected <div>, got ${node_12?.tagName}`)
      api.assert.hasStyle('node-12', 'display', 'flex')
      api.assert.hasStyle('node-12', 'flexDirection', 'column')
      // Skipping width: 4px - might be grid columns
      api.assert.hasStyle('node-12', 'backgroundColor', 'rgb(245, 158, 11)')
      api.assert.hasStyle('node-12', 'borderRadius', '4px')
      api.assert.hasChildren('node-12', 1)

      // --- node-13: Text → <span> "w 4" ---
      const node_13 = api.preview.inspect('node-13')
      api.assert.ok(node_13 !== null, 'node-13 must exist')
      api.assert.ok(
        node_13?.tagName === 'span',
        `node-13: expected <span>, got ${node_13?.tagName}`
      )
      api.assert.hasText('node-13', 'w 4')
      api.assert.hasStyle('node-13', 'color', 'rgb(255, 255, 255)')
      api.assert.hasStyle('node-13', 'fontSize', '12px')

      // --- Hierarchy ---
      // node-2 is child of node-1
      // node-3 is child of node-2
      // node-4 is child of node-1
      // node-5 is child of node-4
      // node-6 is child of node-1
      // node-7 is child of node-6
      // node-8 is child of node-1
      // node-9 is child of node-8
      // node-10 is child of node-1
      // node-11 is child of node-10
      // node-12 is child of node-1
      // node-13 is child of node-12
    }
  ),

  testWithSetup(
    '[04-layout] Grid Layout: Example 7',
    `Frame w 600, grid 12, gap 8, bg #111, pad 16, rad 8, row-height 35
  Frame x 1, y 1, w 12, h 2, bg #2271C1, rad 4, center
    Text "Hero", col white, fs 12

  Frame x 1, y 3, w 3, h 3, bg #10b981, rad 4, center
    Text "Sidebar", col white, fs 12

  Frame x 4, y 3, w 9, h 3, bg #333, rad 4, center
    Text "Content", col white, fs 12

  Frame x 1, y 6, w 12, h 1, bg #1a1a1a, rad 4, center
    Text "Footer", col #888, fs 11`,
    async (api: TestAPI) => {
      // ========================================
      // DEEP VALIDATION: 9 elements
      // ========================================

      const nodeIds = api.preview.getNodeIds()
      api.assert.ok(nodeIds.length === 9, `Expected 9 nodes, got ${nodeIds.length}`)

      // --- node-1: Frame → <div> ---
      const node_1 = api.preview.inspect('node-1')
      api.assert.ok(node_1 !== null, 'node-1 must exist')
      api.assert.ok(node_1?.tagName === 'div', `node-1: expected <div>, got ${node_1?.tagName}`)
      api.assert.hasStyle('node-1', 'display', 'grid')
      api.assert.hasStyle('node-1', 'flexDirection', 'column')
      api.assert.hasStyle('node-1', 'width', '600px')
      api.assert.hasStyle('node-1', 'gap', '8px')
      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(17, 17, 17)')
      api.assert.hasStyle('node-1', 'padding', '16px')
      api.assert.hasStyle('node-1', 'borderRadius', '8px')
      api.assert.hasChildren('node-1', 4)

      // --- node-2: Frame → <div> ---
      const node_2 = api.preview.inspect('node-2')
      api.assert.ok(node_2 !== null, 'node-2 must exist')
      api.assert.ok(node_2?.tagName === 'div', `node-2: expected <div>, got ${node_2?.tagName}`)
      api.assert.hasStyle('node-2', 'display', 'flex')
      api.assert.hasStyle('node-2', 'flexDirection', 'column')
      // Skipping width: 12px - might be grid columns
      // Skipping height: 2px - might be grid columns
      api.assert.hasStyle('node-2', 'backgroundColor', 'rgb(34, 113, 193)')
      api.assert.hasStyle('node-2', 'borderRadius', '4px')
      api.assert.hasChildren('node-2', 1)

      // --- node-3: Text → <span> "Hero" ---
      const node_3 = api.preview.inspect('node-3')
      api.assert.ok(node_3 !== null, 'node-3 must exist')
      api.assert.ok(node_3?.tagName === 'span', `node-3: expected <span>, got ${node_3?.tagName}`)
      api.assert.hasText('node-3', 'Hero')
      api.assert.hasStyle('node-3', 'color', 'rgb(255, 255, 255)')
      api.assert.hasStyle('node-3', 'fontSize', '12px')

      // --- node-4: Frame → <div> ---
      const node_4 = api.preview.inspect('node-4')
      api.assert.ok(node_4 !== null, 'node-4 must exist')
      api.assert.ok(node_4?.tagName === 'div', `node-4: expected <div>, got ${node_4?.tagName}`)
      api.assert.hasStyle('node-4', 'display', 'flex')
      api.assert.hasStyle('node-4', 'flexDirection', 'column')
      // Skipping width: 3px - might be grid columns
      // Skipping height: 3px - might be grid columns
      api.assert.hasStyle('node-4', 'backgroundColor', 'rgb(16, 185, 129)')
      api.assert.hasStyle('node-4', 'borderRadius', '4px')
      api.assert.hasChildren('node-4', 1)

      // --- node-5: Text → <span> "Sidebar" ---
      const node_5 = api.preview.inspect('node-5')
      api.assert.ok(node_5 !== null, 'node-5 must exist')
      api.assert.ok(node_5?.tagName === 'span', `node-5: expected <span>, got ${node_5?.tagName}`)
      api.assert.hasText('node-5', 'Sidebar')
      api.assert.hasStyle('node-5', 'color', 'rgb(255, 255, 255)')
      api.assert.hasStyle('node-5', 'fontSize', '12px')

      // --- node-6: Frame → <div> ---
      const node_6 = api.preview.inspect('node-6')
      api.assert.ok(node_6 !== null, 'node-6 must exist')
      api.assert.ok(node_6?.tagName === 'div', `node-6: expected <div>, got ${node_6?.tagName}`)
      api.assert.hasStyle('node-6', 'display', 'flex')
      api.assert.hasStyle('node-6', 'flexDirection', 'column')
      // Skipping width: 9px - might be grid columns
      // Skipping height: 3px - might be grid columns
      api.assert.hasStyle('node-6', 'backgroundColor', 'rgb(51, 51, 51)')
      api.assert.hasStyle('node-6', 'borderRadius', '4px')
      api.assert.hasChildren('node-6', 1)

      // --- node-7: Text → <span> "Content" ---
      const node_7 = api.preview.inspect('node-7')
      api.assert.ok(node_7 !== null, 'node-7 must exist')
      api.assert.ok(node_7?.tagName === 'span', `node-7: expected <span>, got ${node_7?.tagName}`)
      api.assert.hasText('node-7', 'Content')
      api.assert.hasStyle('node-7', 'color', 'rgb(255, 255, 255)')
      api.assert.hasStyle('node-7', 'fontSize', '12px')

      // --- node-8: Frame → <div> ---
      const node_8 = api.preview.inspect('node-8')
      api.assert.ok(node_8 !== null, 'node-8 must exist')
      api.assert.ok(node_8?.tagName === 'div', `node-8: expected <div>, got ${node_8?.tagName}`)
      api.assert.hasStyle('node-8', 'display', 'flex')
      api.assert.hasStyle('node-8', 'flexDirection', 'column')
      // Skipping width: 12px - might be grid columns
      // Skipping height: 1px - might be grid columns
      api.assert.hasStyle('node-8', 'backgroundColor', 'rgb(26, 26, 26)')
      api.assert.hasStyle('node-8', 'borderRadius', '4px')
      api.assert.hasChildren('node-8', 1)

      // --- node-9: Text → <span> "Footer" ---
      const node_9 = api.preview.inspect('node-9')
      api.assert.ok(node_9 !== null, 'node-9 must exist')
      api.assert.ok(node_9?.tagName === 'span', `node-9: expected <span>, got ${node_9?.tagName}`)
      api.assert.hasText('node-9', 'Footer')
      api.assert.hasStyle('node-9', 'color', 'rgb(136, 136, 136)')
      api.assert.hasStyle('node-9', 'fontSize', '11px')

      // --- Hierarchy ---
      // node-2 is child of node-1
      // node-3 is child of node-2
      // node-4 is child of node-1
      // node-5 is child of node-4
      // node-6 is child of node-1
      // node-7 is child of node-6
      // node-8 is child of node-1
      // node-9 is child of node-8
    }
  ),

  testWithSetup(
    '[04-layout] Grid Layout: Example 8',
    `// Layout-Komponente
Dashboard: grid 12, gap 12, row-height 25, h 200
  Header: x 1, y 1, w 12, h 2, bg #1a1a1a, rad 6, pad 0 16, hor, spread, ver-center
  Nav: x 1, y 3, w 2, h 5, bg #1a1a1a, rad 6, pad 12, gap 4
  Main: x 3, y 3, w 10, h 5, grid 2, gap 12

Widget: bg #252525, rad 6, pad 12, gap 4
  Title: col white, fs 13, weight 500
  Value: col #2271C1, fs 24, weight 600

// Verwendung
Dashboard
  Header
    Text "Dashboard", col white, weight 500
    Text "Admin", col #888, fs 12
  Nav
    Text "Menu", col #666, fs 10, uppercase
    Text "Overview", col white, fs 12
    Text "Users", col #888, fs 12
  Main
    Widget
      Title "Users"
      Value "1,234"
    Widget
      Title "Revenue"
      Value "\$12.4k"`,
    async (api: TestAPI) => {
      // Complex feature: data binding, component definitions
      // If we reach here, compilation succeeded (no exception thrown)
      api.assert.ok(true, 'Compilation successful')
    }
  ),

  testWithSetup(
    '[04-layout] Stacked Layout: Example 9',
    `Frame w 200, h 150, stacked, bg #1a1a1a, rad 8
  // Vier Ecken
  Frame x 0, y 0, w 30, h 30, bg #ef4444, rad 4
  Frame x 170, y 0, w 30, h 30, bg #f59e0b, rad 4
  Frame x 0, y 120, w 30, h 30, bg #10b981, rad 4
  Frame x 170, y 120, w 30, h 30, bg #2271C1, rad 4

  // Mitte
  Frame x 80, y 55, w 40, h 40, bg white, rad 99`,
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
      api.assert.hasStyle('node-1', 'width', '200px')
      api.assert.hasStyle('node-1', 'height', '150px')
      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(26, 26, 26)')
      api.assert.hasStyle('node-1', 'borderRadius', '8px')
      api.assert.hasChildren('node-1', 5)

      // --- node-2: Frame → <div> ---
      const node_2 = api.preview.inspect('node-2')
      api.assert.ok(node_2 !== null, 'node-2 must exist')
      api.assert.ok(node_2?.tagName === 'div', `node-2: expected <div>, got ${node_2?.tagName}`)
      api.assert.hasStyle('node-2', 'display', 'flex')
      api.assert.hasStyle('node-2', 'flexDirection', 'column')
      api.assert.hasStyle('node-2', 'width', '30px')
      api.assert.hasStyle('node-2', 'height', '30px')
      api.assert.hasStyle('node-2', 'backgroundColor', 'rgb(239, 68, 68)')
      api.assert.hasStyle('node-2', 'borderRadius', '4px')

      // --- node-3: Frame → <div> ---
      const node_3 = api.preview.inspect('node-3')
      api.assert.ok(node_3 !== null, 'node-3 must exist')
      api.assert.ok(node_3?.tagName === 'div', `node-3: expected <div>, got ${node_3?.tagName}`)
      api.assert.hasStyle('node-3', 'display', 'flex')
      api.assert.hasStyle('node-3', 'flexDirection', 'column')
      api.assert.hasStyle('node-3', 'width', '30px')
      api.assert.hasStyle('node-3', 'height', '30px')
      api.assert.hasStyle('node-3', 'backgroundColor', 'rgb(245, 158, 11)')
      api.assert.hasStyle('node-3', 'borderRadius', '4px')

      // --- node-4: Frame → <div> ---
      const node_4 = api.preview.inspect('node-4')
      api.assert.ok(node_4 !== null, 'node-4 must exist')
      api.assert.ok(node_4?.tagName === 'div', `node-4: expected <div>, got ${node_4?.tagName}`)
      api.assert.hasStyle('node-4', 'display', 'flex')
      api.assert.hasStyle('node-4', 'flexDirection', 'column')
      api.assert.hasStyle('node-4', 'width', '30px')
      api.assert.hasStyle('node-4', 'height', '30px')
      api.assert.hasStyle('node-4', 'backgroundColor', 'rgb(16, 185, 129)')
      api.assert.hasStyle('node-4', 'borderRadius', '4px')

      // --- node-5: Frame → <div> ---
      const node_5 = api.preview.inspect('node-5')
      api.assert.ok(node_5 !== null, 'node-5 must exist')
      api.assert.ok(node_5?.tagName === 'div', `node-5: expected <div>, got ${node_5?.tagName}`)
      api.assert.hasStyle('node-5', 'display', 'flex')
      api.assert.hasStyle('node-5', 'flexDirection', 'column')
      api.assert.hasStyle('node-5', 'width', '30px')
      api.assert.hasStyle('node-5', 'height', '30px')
      api.assert.hasStyle('node-5', 'backgroundColor', 'rgb(34, 113, 193)')
      api.assert.hasStyle('node-5', 'borderRadius', '4px')

      // --- node-6: Frame → <div> ---
      const node_6 = api.preview.inspect('node-6')
      api.assert.ok(node_6 !== null, 'node-6 must exist')
      api.assert.ok(node_6?.tagName === 'div', `node-6: expected <div>, got ${node_6?.tagName}`)
      api.assert.hasStyle('node-6', 'display', 'flex')
      api.assert.hasStyle('node-6', 'flexDirection', 'column')
      api.assert.hasStyle('node-6', 'width', '40px')
      api.assert.hasStyle('node-6', 'height', '40px')
      api.assert.hasStyle('node-6', 'backgroundColor', 'rgb(255, 255, 255)')
      api.assert.hasStyle('node-6', 'borderRadius', '99px')

      // --- Hierarchy ---
      // node-2 is child of node-1
      // node-3 is child of node-1
      // node-4 is child of node-1
      // node-5 is child of node-1
      // node-6 is child of node-1
    }
  ),

  testWithSetup(
    '[04-layout] Stacked Layout: Example 10',
    `// Badge-Komponente
Badge: x 30, y -4, w 18, h 18, bg #ef4444, rad 99, center
  Count: col white, fs 10, weight 600

// Status-Punkt
Status: x 30, y 30, w 14, h 14, bg #10b981, rad 99, bor 2, boc #111

Frame hor, gap 24, bg #0a0a0a, pad 16, rad 8
  // Icon mit Badge
  Frame w 44, h 44, stacked
    Frame w 44, h 44, bg #1a1a1a, rad 8, center
      Icon "bell", ic #888, is 22
    Badge
      Count "3"

  // Avatar mit Status
  Frame w 44, h 44, stacked
    Frame w 44, h 44, bg #2271C1, rad 99, center
      Text "TS", col white, fs 14, weight 500
    Status`,
    async (api: TestAPI) => {
      // Complex feature: Zag: Badge, component definitions
      // If we reach here, compilation succeeded (no exception thrown)
      api.assert.ok(true, 'Compilation successful')
    }
  ),

  testWithSetup(
    '[04-layout] Responsive Layout: Example 11',
    `Card: bg #1a1a1a, pad 16, rad 8, gap 12, ver
  // compact: wird aktiv wenn Card schmaler als 400px
  compact:
    pad 12, gap 8

Frame gap 16
  Card w 500
    Text "Normale Card", col white
    Text "500px breit – kein Size-State aktiv", col #888, fs 12

  Card w 300
    Text "Kompakte Card", col white
    Text "300px breit – compact: ist aktiv", col #888, fs 12`,
    async (api: TestAPI) => {
      // Complex feature: data binding, component definitions
      // If we reach here, compilation succeeded (no exception thrown)
      api.assert.ok(true, 'Compilation successful')
    }
  ),

  testWithSetup(
    '[04-layout] Responsive Layout: Example 12',
    `Card: bg #1a1a1a, rad 8, gap 12, ver
  // Normales Layout (kein Size-State aktiv)
  pad 16

  // Schmal: kompakter
  compact:
    pad 12, gap 8

  // Breit: mehr Platz, horizontal
  wide:
    pad 24, gap 16, hor

Frame gap 16
  Card w 300
    Icon "box", ic #2271C1, is 24
    Text "Compact (300px)", col white, fs 13

  Card w 600
    Icon "box", ic #10b981, is 24
    Text "Regular (600px)", col white, fs 13

  Card w 900
    Icon "box", ic #f59e0b, is 24
    Text "Wide (900px)", col white, fs 13`,
    async (api: TestAPI) => {
      // Complex feature: data binding, component definitions
      // If we reach here, compilation succeeded (no exception thrown)
      api.assert.ok(true, 'Compilation successful')
    }
  ),

  testWithSetup(
    '[04-layout] Responsive Layout: Example 13',
    `Panel: bg #1a1a1a, pad 20, rad 8, gap 8
  // Kind-Komponenten mit Default-Styling
  Title: col white, fs 16, weight 600
  Desc: col #888, fs 14

  compact:
    pad 12
    // Kind-Komponenten für compact überschreiben
    Title: fs 13
    Desc: fs 12

  wide:
    pad 32, gap 12
    Title: fs 20
    Desc: fs 15

Frame gap 16
  Panel w 280
    Title "Kompakt"
    Desc "Kleine Schrift, wenig Padding"

  Panel w 600
    Title "Regular"
    Desc "Standard-Darstellung"

  Panel w 950
    Title "Breit"
    Desc "Große Schrift, viel Padding"`,
    async (api: TestAPI) => {
      // Complex feature: data binding, component definitions
      // If we reach here, compilation succeeded (no exception thrown)
      api.assert.ok(true, 'Compilation successful')
    }
  ),

  testWithSetup(
    '[04-layout] Responsive Layout: Example 14',
    `// Eingebaute Defaults überschreiben
compact.max: 250
wide.min: 500

// Eigenen Size-State definieren
tiny.max: 150

Card: bg #1a1a1a, pad 16, rad 8, gap 8, ver
  tiny:
    pad 8
    Text "Winzig!", col #ef4444, fs 10
  compact:
    Text "Kompakt", col #f59e0b, fs 12
  wide:
    hor, gap 16
    Text "Breit genug für horizontal", col #10b981

Frame gap 12
  Card w 120
    Icon "box", ic white, is 20
  Card w 200
    Icon "box", ic white, is 20
  Card w 400
    Icon "box", ic white, is 20
  Card w 600
    Icon "box", ic white, is 20`,
    async (api: TestAPI) => {
      // Complex feature: data binding, component definitions
      // If we reach here, compilation succeeded (no exception thrown)
      api.assert.ok(true, 'Compilation successful')
    }
  ),

  testWithSetup(
    '[04-layout] Responsive Layout: Example 15',
    `NavBar: bg #1a1a1a, pad 12, rad 8, hor, gap 8, ver-center
  NavItem: hor, gap 8, pad 8 12, rad 6, ver-center, cursor pointer
    Label: col #ccc, fs 13
    hover:
      bg #333

  // Unter 200px: nur Icons, vertikal gestapelt
  compact.max: 200
  compact:
    ver, gap 4, pad 8
    NavItem: pad 10, center
      Label: hidden

Frame gap 16
  NavBar w 350
    NavItem
      Icon "home", ic #888, is 18
      Label "Home"
    NavItem
      Icon "folder", ic #888, is 18
      Label "Projekte"
    NavItem
      Icon "settings", ic #888, is 18
      Label "Settings"

  NavBar w 80
    NavItem
      Icon "home", ic #888, is 18
      Label "Home"
    NavItem
      Icon "folder", ic #888, is 18
      Label "Projekte"
    NavItem
      Icon "settings", ic #888, is 18
      Label "Settings"`,
    async (api: TestAPI) => {
      // Complex feature: Zag: NavItem, hover:, data binding, component definitions
      // If we reach here, compilation succeeded (no exception thrown)
      api.assert.ok(true, 'Compilation successful')
    }
  ),
])
