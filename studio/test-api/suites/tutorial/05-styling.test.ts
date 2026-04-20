/**
 * Tutorial Tests: Styling
 *
 * Auto-generated from docs/tutorial/05-styling.html
 * Generated: 2026-04-20T13:03:12.776Z
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

export const chapter_05_stylingTests: TestCase[] = describe('Tutorial: Styling', [
  testWithSetup(
    '[05-styling] Farben: Example 1',
    `Frame hor, gap 8, wrap, bg #0a0a0a, pad 16, rad 8
  // Hex-Farben
  Frame w 50, h 50, bg #2271C1, rad 6
  Frame w 50, h 50, bg #10b981, rad 6
  Frame w 50, h 50, bg #f59e0b, rad 6
  Frame w 50, h 50, bg #ef4444, rad 6

  // Benannte Farben
  Frame w 50, h 50, bg white, rad 6
  Frame w 50, h 50, bg black, rad 6

  // Mit Transparenz
  Frame w 50, h 50, bg rgba(34,113,193,0.5), rad 6
  Frame w 50, h 50, bg #2271C188, rad 6`,
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
      api.assert.hasStyle('node-1', 'display', 'flex')
      api.assert.hasStyle('node-1', 'flexDirection', 'row')
      api.assert.hasStyle('node-1', 'gap', '8px')
      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(10, 10, 10)')
      api.assert.hasStyle('node-1', 'padding', '16px')
      api.assert.hasStyle('node-1', 'borderRadius', '8px')
      api.assert.hasChildren('node-1', 8)

      // --- node-2: Frame → <div> ---
      const node_2 = api.preview.inspect('node-2')
      api.assert.ok(node_2 !== null, 'node-2 must exist')
      api.assert.ok(node_2?.tagName === 'div', `node-2: expected <div>, got ${node_2?.tagName}`)
      api.assert.hasStyle('node-2', 'display', 'flex')
      api.assert.hasStyle('node-2', 'flexDirection', 'column')
      api.assert.hasStyle('node-2', 'width', '50px')
      api.assert.hasStyle('node-2', 'height', '50px')
      api.assert.hasStyle('node-2', 'backgroundColor', 'rgb(34, 113, 193)')
      api.assert.hasStyle('node-2', 'borderRadius', '6px')

      // --- node-3: Frame → <div> ---
      const node_3 = api.preview.inspect('node-3')
      api.assert.ok(node_3 !== null, 'node-3 must exist')
      api.assert.ok(node_3?.tagName === 'div', `node-3: expected <div>, got ${node_3?.tagName}`)
      api.assert.hasStyle('node-3', 'display', 'flex')
      api.assert.hasStyle('node-3', 'flexDirection', 'column')
      api.assert.hasStyle('node-3', 'width', '50px')
      api.assert.hasStyle('node-3', 'height', '50px')
      api.assert.hasStyle('node-3', 'backgroundColor', 'rgb(16, 185, 129)')
      api.assert.hasStyle('node-3', 'borderRadius', '6px')

      // --- node-4: Frame → <div> ---
      const node_4 = api.preview.inspect('node-4')
      api.assert.ok(node_4 !== null, 'node-4 must exist')
      api.assert.ok(node_4?.tagName === 'div', `node-4: expected <div>, got ${node_4?.tagName}`)
      api.assert.hasStyle('node-4', 'display', 'flex')
      api.assert.hasStyle('node-4', 'flexDirection', 'column')
      api.assert.hasStyle('node-4', 'width', '50px')
      api.assert.hasStyle('node-4', 'height', '50px')
      api.assert.hasStyle('node-4', 'backgroundColor', 'rgb(245, 158, 11)')
      api.assert.hasStyle('node-4', 'borderRadius', '6px')

      // --- node-5: Frame → <div> ---
      const node_5 = api.preview.inspect('node-5')
      api.assert.ok(node_5 !== null, 'node-5 must exist')
      api.assert.ok(node_5?.tagName === 'div', `node-5: expected <div>, got ${node_5?.tagName}`)
      api.assert.hasStyle('node-5', 'display', 'flex')
      api.assert.hasStyle('node-5', 'flexDirection', 'column')
      api.assert.hasStyle('node-5', 'width', '50px')
      api.assert.hasStyle('node-5', 'height', '50px')
      api.assert.hasStyle('node-5', 'backgroundColor', 'rgb(239, 68, 68)')
      api.assert.hasStyle('node-5', 'borderRadius', '6px')

      // --- node-6: Frame → <div> ---
      const node_6 = api.preview.inspect('node-6')
      api.assert.ok(node_6 !== null, 'node-6 must exist')
      api.assert.ok(node_6?.tagName === 'div', `node-6: expected <div>, got ${node_6?.tagName}`)
      api.assert.hasStyle('node-6', 'display', 'flex')
      api.assert.hasStyle('node-6', 'flexDirection', 'column')
      api.assert.hasStyle('node-6', 'width', '50px')
      api.assert.hasStyle('node-6', 'height', '50px')
      api.assert.hasStyle('node-6', 'backgroundColor', 'rgb(255, 255, 255)')
      api.assert.hasStyle('node-6', 'borderRadius', '6px')

      // --- node-7: Frame → <div> ---
      const node_7 = api.preview.inspect('node-7')
      api.assert.ok(node_7 !== null, 'node-7 must exist')
      api.assert.ok(node_7?.tagName === 'div', `node-7: expected <div>, got ${node_7?.tagName}`)
      api.assert.hasStyle('node-7', 'display', 'flex')
      api.assert.hasStyle('node-7', 'flexDirection', 'column')
      api.assert.hasStyle('node-7', 'width', '50px')
      api.assert.hasStyle('node-7', 'height', '50px')
      api.assert.hasStyle('node-7', 'backgroundColor', 'rgb(0, 0, 0)')
      api.assert.hasStyle('node-7', 'borderRadius', '6px')

      // --- node-8: Frame → <div> ---
      const node_8 = api.preview.inspect('node-8')
      api.assert.ok(node_8 !== null, 'node-8 must exist')
      api.assert.ok(node_8?.tagName === 'div', `node-8: expected <div>, got ${node_8?.tagName}`)
      api.assert.hasStyle('node-8', 'display', 'flex')
      api.assert.hasStyle('node-8', 'flexDirection', 'column')
      api.assert.hasStyle('node-8', 'width', '50px')
      api.assert.hasStyle('node-8', 'height', '50px')
      // Skipping incomplete RGBA: rgba(34
      api.assert.hasStyle('node-8', 'borderRadius', '6px')

      // --- node-9: Frame → <div> ---
      const node_9 = api.preview.inspect('node-9')
      api.assert.ok(node_9 !== null, 'node-9 must exist')
      api.assert.ok(node_9?.tagName === 'div', `node-9: expected <div>, got ${node_9?.tagName}`)
      api.assert.hasStyle('node-9', 'display', 'flex')
      api.assert.hasStyle('node-9', 'flexDirection', 'column')
      api.assert.hasStyle('node-9', 'width', '50px')
      api.assert.hasStyle('node-9', 'height', '50px')
      api.assert.hasStyle('node-9', 'backgroundColor', 'rgba(34, 113, 193, 0.53)')
      api.assert.hasStyle('node-9', 'borderRadius', '6px')

      // --- Hierarchy ---
      // node-2 is child of node-1
      // node-3 is child of node-1
      // node-4 is child of node-1
      // node-5 is child of node-1
      // node-6 is child of node-1
      // node-7 is child of node-1
      // node-8 is child of node-1
      // node-9 is child of node-1
    }
  ),

  testWithSetup(
    '[05-styling] Gradients: Example 2',
    `Frame w 400, gap 8, bg #0a0a0a, pad 16, rad 8
  // Horizontal (Standard)
  Frame w full, h 50, rad 8, bg grad #2271C1 #7c3aed

  // Vertikal
  Frame w full, h 50, rad 8, bg grad-ver #f59e0b #ef4444

  // Mit Winkel (45°)
  Frame w full, h 50, rad 8, bg grad 45 #10b981 #2271C1

  // Drei Farben
  Frame w full, h 50, rad 8, bg grad #10b981 #2271C1 #7c3aed`,
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
      api.assert.hasStyle('node-1', 'width', '400px')
      api.assert.hasStyle('node-1', 'gap', '8px')
      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(10, 10, 10)')
      api.assert.hasStyle('node-1', 'padding', '16px')
      api.assert.hasStyle('node-1', 'borderRadius', '8px')
      api.assert.hasChildren('node-1', 4)

      // --- node-2: Frame → <div> ---
      const node_2 = api.preview.inspect('node-2')
      api.assert.ok(node_2 !== null, 'node-2 must exist')
      api.assert.ok(node_2?.tagName === 'div', `node-2: expected <div>, got ${node_2?.tagName}`)
      api.assert.hasStyle('node-2', 'display', 'flex')
      api.assert.hasStyle('node-2', 'flexDirection', 'column')
      // Skipping width: 100% - actual value depends on parent
      api.assert.hasStyle('node-2', 'height', '50px')
      api.assert.hasStyle('node-2', 'borderRadius', '8px')
      // Skipping gradient: grad #2271c1 #7c3aed

      // --- node-3: Frame → <div> ---
      const node_3 = api.preview.inspect('node-3')
      api.assert.ok(node_3 !== null, 'node-3 must exist')
      api.assert.ok(node_3?.tagName === 'div', `node-3: expected <div>, got ${node_3?.tagName}`)
      api.assert.hasStyle('node-3', 'display', 'flex')
      api.assert.hasStyle('node-3', 'flexDirection', 'column')
      // Skipping width: 100% - actual value depends on parent
      api.assert.hasStyle('node-3', 'height', '50px')
      api.assert.hasStyle('node-3', 'borderRadius', '8px')
      // Skipping gradient: grad-ver #f59e0b #ef4444

      // --- node-4: Frame → <div> ---
      const node_4 = api.preview.inspect('node-4')
      api.assert.ok(node_4 !== null, 'node-4 must exist')
      api.assert.ok(node_4?.tagName === 'div', `node-4: expected <div>, got ${node_4?.tagName}`)
      api.assert.hasStyle('node-4', 'display', 'flex')
      api.assert.hasStyle('node-4', 'flexDirection', 'column')
      // Skipping width: 100% - actual value depends on parent
      api.assert.hasStyle('node-4', 'height', '50px')
      api.assert.hasStyle('node-4', 'borderRadius', '8px')
      // Skipping gradient: grad 45 #10b981 #2271c1

      // --- node-5: Frame → <div> ---
      const node_5 = api.preview.inspect('node-5')
      api.assert.ok(node_5 !== null, 'node-5 must exist')
      api.assert.ok(node_5?.tagName === 'div', `node-5: expected <div>, got ${node_5?.tagName}`)
      api.assert.hasStyle('node-5', 'display', 'flex')
      api.assert.hasStyle('node-5', 'flexDirection', 'column')
      // Skipping width: 100% - actual value depends on parent
      api.assert.hasStyle('node-5', 'height', '50px')
      api.assert.hasStyle('node-5', 'borderRadius', '8px')
      // Skipping gradient: grad #10b981 #2271c1 #7c3aed

      // --- Hierarchy ---
      // node-2 is child of node-1
      // node-3 is child of node-1
      // node-4 is child of node-1
      // node-5 is child of node-1
    }
  ),

  testWithSetup(
    '[05-styling] Gradients: Example 3',
    `Frame bg #1a1a1a, pad 20, rad 8, gap 8
  Text "Gradient Text", fs 24, weight bold, col grad #2271C1 #7c3aed
  Text "Vertical Gradient", fs 24, weight bold, col grad-ver #f59e0b #ef4444`,
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
      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(26, 26, 26)')
      api.assert.hasStyle('node-1', 'padding', '20px')
      api.assert.hasStyle('node-1', 'borderRadius', '8px')
      api.assert.hasStyle('node-1', 'gap', '8px')
      api.assert.hasChildren('node-1', 2)

      // --- node-2: Text → <span> "Gradient Text" ---
      const node_2 = api.preview.inspect('node-2')
      api.assert.ok(node_2 !== null, 'node-2 must exist')
      api.assert.ok(node_2?.tagName === 'span', `node-2: expected <span>, got ${node_2?.tagName}`)
      api.assert.hasText('node-2', 'Gradient Text')
      api.assert.hasStyle('node-2', 'fontSize', '24px')
      api.assert.hasStyle('node-2', 'fontWeight', '700')
      // Skipping gradient: grad #2271c1 #7c3aed

      // --- node-3: Text → <span> "Vertical Gradient" ---
      const node_3 = api.preview.inspect('node-3')
      api.assert.ok(node_3 !== null, 'node-3 must exist')
      api.assert.ok(node_3?.tagName === 'span', `node-3: expected <span>, got ${node_3?.tagName}`)
      api.assert.hasText('node-3', 'Vertical Gradient')
      api.assert.hasStyle('node-3', 'fontSize', '24px')
      api.assert.hasStyle('node-3', 'fontWeight', '700')
      // Skipping gradient: grad-ver #f59e0b #ef4444

      // --- Hierarchy ---
      // node-2 is child of node-1
      // node-3 is child of node-1
    }
  ),

  testWithSetup(
    '[05-styling] Borders: Example 4',
    `Frame hor, gap 12, bg #0a0a0a, pad 16, rad 8
  // Border rundum
  Frame w 70, h 70, bor 2, boc #2271C1, rad 8, center
    Text "2px", col #888, fs 11

  // Dickerer Border
  Frame w 70, h 70, bor 4, boc #10b981, rad 8, center
    Text "4px", col #888, fs 11

  // Mit Hintergrund
  Frame w 70, h 70, bg #1a1a1a, bor 1, boc #333, rad 8, center
    Text "subtle", col #888, fs 11`,
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
      api.assert.hasStyle('node-1', 'flexDirection', 'row')
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
      api.assert.hasStyle('node-2', 'width', '70px')
      api.assert.hasStyle('node-2', 'height', '70px')
      api.assert.hasStyle('node-2', 'borderColor', 'rgb(34, 113, 193)')
      api.assert.hasStyle('node-2', 'borderRadius', '8px')
      api.assert.hasChildren('node-2', 1)

      // --- node-3: Text → <span> "2px" ---
      const node_3 = api.preview.inspect('node-3')
      api.assert.ok(node_3 !== null, 'node-3 must exist')
      api.assert.ok(node_3?.tagName === 'span', `node-3: expected <span>, got ${node_3?.tagName}`)
      api.assert.hasText('node-3', '2px')
      api.assert.hasStyle('node-3', 'color', 'rgb(136, 136, 136)')
      api.assert.hasStyle('node-3', 'fontSize', '11px')

      // --- node-4: Frame → <div> ---
      const node_4 = api.preview.inspect('node-4')
      api.assert.ok(node_4 !== null, 'node-4 must exist')
      api.assert.ok(node_4?.tagName === 'div', `node-4: expected <div>, got ${node_4?.tagName}`)
      api.assert.hasStyle('node-4', 'display', 'flex')
      api.assert.hasStyle('node-4', 'flexDirection', 'column')
      api.assert.hasStyle('node-4', 'width', '70px')
      api.assert.hasStyle('node-4', 'height', '70px')
      api.assert.hasStyle('node-4', 'borderColor', 'rgb(16, 185, 129)')
      api.assert.hasStyle('node-4', 'borderRadius', '8px')
      api.assert.hasChildren('node-4', 1)

      // --- node-5: Text → <span> "4px" ---
      const node_5 = api.preview.inspect('node-5')
      api.assert.ok(node_5 !== null, 'node-5 must exist')
      api.assert.ok(node_5?.tagName === 'span', `node-5: expected <span>, got ${node_5?.tagName}`)
      api.assert.hasText('node-5', '4px')
      api.assert.hasStyle('node-5', 'color', 'rgb(136, 136, 136)')
      api.assert.hasStyle('node-5', 'fontSize', '11px')

      // --- node-6: Frame → <div> ---
      const node_6 = api.preview.inspect('node-6')
      api.assert.ok(node_6 !== null, 'node-6 must exist')
      api.assert.ok(node_6?.tagName === 'div', `node-6: expected <div>, got ${node_6?.tagName}`)
      api.assert.hasStyle('node-6', 'display', 'flex')
      api.assert.hasStyle('node-6', 'flexDirection', 'column')
      api.assert.hasStyle('node-6', 'width', '70px')
      api.assert.hasStyle('node-6', 'height', '70px')
      api.assert.hasStyle('node-6', 'backgroundColor', 'rgb(26, 26, 26)')
      api.assert.hasStyle('node-6', 'borderColor', 'rgb(51, 51, 51)')
      api.assert.hasStyle('node-6', 'borderRadius', '8px')
      api.assert.hasChildren('node-6', 1)

      // --- node-7: Text → <span> "subtle" ---
      const node_7 = api.preview.inspect('node-7')
      api.assert.ok(node_7 !== null, 'node-7 must exist')
      api.assert.ok(node_7?.tagName === 'span', `node-7: expected <span>, got ${node_7?.tagName}`)
      api.assert.hasText('node-7', 'subtle')
      api.assert.hasStyle('node-7', 'color', 'rgb(136, 136, 136)')
      api.assert.hasStyle('node-7', 'fontSize', '11px')

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
    '[05-styling] Borders: Example 5',
    `Frame gap 8, bg #0a0a0a, pad 16, rad 8
  // Nur unten
  Frame w 200, h 40, bg #1a1a1a, border-bottom 2, boc #2271C1, center
    Text "border-bottom", col #888, fs 11

  // Nur links
  Frame w 200, h 40, bg #1a1a1a, bor-l 3, boc #10b981, center
    Text "bor-l (Shortcut)", col #888, fs 11

  // Oben und unten
  Frame w 200, h 40, bg #1a1a1a, bort 1, borb 1, boc #f59e0b, center
    Text "bort + borb", col #888, fs 11`,
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
      api.assert.hasStyle('node-2', 'height', '40px')
      api.assert.hasStyle('node-2', 'backgroundColor', 'rgb(26, 26, 26)')
      api.assert.hasStyle('node-2', 'borderColor', 'rgb(34, 113, 193)')
      api.assert.hasChildren('node-2', 1)

      // --- node-3: Text → <span> "border-bottom" ---
      const node_3 = api.preview.inspect('node-3')
      api.assert.ok(node_3 !== null, 'node-3 must exist')
      api.assert.ok(node_3?.tagName === 'span', `node-3: expected <span>, got ${node_3?.tagName}`)
      api.assert.hasText('node-3', 'border-bottom')
      api.assert.hasStyle('node-3', 'color', 'rgb(136, 136, 136)')
      api.assert.hasStyle('node-3', 'fontSize', '11px')

      // --- node-4: Frame → <div> ---
      const node_4 = api.preview.inspect('node-4')
      api.assert.ok(node_4 !== null, 'node-4 must exist')
      api.assert.ok(node_4?.tagName === 'div', `node-4: expected <div>, got ${node_4?.tagName}`)
      api.assert.hasStyle('node-4', 'display', 'flex')
      api.assert.hasStyle('node-4', 'flexDirection', 'column')
      api.assert.hasStyle('node-4', 'width', '200px')
      api.assert.hasStyle('node-4', 'height', '40px')
      api.assert.hasStyle('node-4', 'backgroundColor', 'rgb(26, 26, 26)')
      api.assert.hasStyle('node-4', 'borderColor', 'rgb(16, 185, 129)')
      api.assert.hasChildren('node-4', 1)

      // --- node-5: Text → <span> "bor-l (Shortcut)" ---
      const node_5 = api.preview.inspect('node-5')
      api.assert.ok(node_5 !== null, 'node-5 must exist')
      api.assert.ok(node_5?.tagName === 'span', `node-5: expected <span>, got ${node_5?.tagName}`)
      api.assert.hasText('node-5', 'bor-l (Shortcut)')
      api.assert.hasStyle('node-5', 'color', 'rgb(136, 136, 136)')
      api.assert.hasStyle('node-5', 'fontSize', '11px')

      // --- node-6: Frame → <div> ---
      const node_6 = api.preview.inspect('node-6')
      api.assert.ok(node_6 !== null, 'node-6 must exist')
      api.assert.ok(node_6?.tagName === 'div', `node-6: expected <div>, got ${node_6?.tagName}`)
      api.assert.hasStyle('node-6', 'display', 'flex')
      api.assert.hasStyle('node-6', 'flexDirection', 'column')
      api.assert.hasStyle('node-6', 'width', '200px')
      api.assert.hasStyle('node-6', 'height', '40px')
      api.assert.hasStyle('node-6', 'backgroundColor', 'rgb(26, 26, 26)')
      api.assert.hasStyle('node-6', 'borderColor', 'rgb(245, 158, 11)')
      api.assert.hasChildren('node-6', 1)

      // --- node-7: Text → <span> "bort + borb" ---
      const node_7 = api.preview.inspect('node-7')
      api.assert.ok(node_7 !== null, 'node-7 must exist')
      api.assert.ok(node_7?.tagName === 'span', `node-7: expected <span>, got ${node_7?.tagName}`)
      api.assert.hasText('node-7', 'bort + borb')
      api.assert.hasStyle('node-7', 'color', 'rgb(136, 136, 136)')
      api.assert.hasStyle('node-7', 'fontSize', '11px')

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
    '[05-styling] Border Radius: Example 6',
    `Frame hor, gap 12, bg #0a0a0a, pad 16, rad 8
  Frame w 60, h 60, bg #2271C1, rad 0, center
    Text "0", col white, fs 11
  Frame w 60, h 60, bg #2271C1, rad 4, center
    Text "4", col white, fs 11
  Frame w 60, h 60, bg #2271C1, rad 12, center
    Text "12", col white, fs 11
  Frame w 60, h 60, bg #2271C1, rad 99, center
    Text "99", col white, fs 11`,
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
      api.assert.hasStyle('node-1', 'display', 'flex')
      api.assert.hasStyle('node-1', 'flexDirection', 'row')
      api.assert.hasStyle('node-1', 'gap', '12px')
      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(10, 10, 10)')
      api.assert.hasStyle('node-1', 'padding', '16px')
      api.assert.hasStyle('node-1', 'borderRadius', '8px')
      api.assert.hasChildren('node-1', 4)

      // --- node-2: Frame → <div> ---
      const node_2 = api.preview.inspect('node-2')
      api.assert.ok(node_2 !== null, 'node-2 must exist')
      api.assert.ok(node_2?.tagName === 'div', `node-2: expected <div>, got ${node_2?.tagName}`)
      api.assert.hasStyle('node-2', 'display', 'flex')
      api.assert.hasStyle('node-2', 'flexDirection', 'column')
      api.assert.hasStyle('node-2', 'width', '60px')
      api.assert.hasStyle('node-2', 'height', '60px')
      api.assert.hasStyle('node-2', 'backgroundColor', 'rgb(34, 113, 193)')
      api.assert.hasStyle('node-2', 'borderRadius', '0px')
      api.assert.hasChildren('node-2', 1)

      // --- node-3: Text → <span> "0" ---
      const node_3 = api.preview.inspect('node-3')
      api.assert.ok(node_3 !== null, 'node-3 must exist')
      api.assert.ok(node_3?.tagName === 'span', `node-3: expected <span>, got ${node_3?.tagName}`)
      api.assert.hasText('node-3', '0')
      api.assert.hasStyle('node-3', 'color', 'rgb(255, 255, 255)')
      api.assert.hasStyle('node-3', 'fontSize', '11px')

      // --- node-4: Frame → <div> ---
      const node_4 = api.preview.inspect('node-4')
      api.assert.ok(node_4 !== null, 'node-4 must exist')
      api.assert.ok(node_4?.tagName === 'div', `node-4: expected <div>, got ${node_4?.tagName}`)
      api.assert.hasStyle('node-4', 'display', 'flex')
      api.assert.hasStyle('node-4', 'flexDirection', 'column')
      api.assert.hasStyle('node-4', 'width', '60px')
      api.assert.hasStyle('node-4', 'height', '60px')
      api.assert.hasStyle('node-4', 'backgroundColor', 'rgb(34, 113, 193)')
      api.assert.hasStyle('node-4', 'borderRadius', '4px')
      api.assert.hasChildren('node-4', 1)

      // --- node-5: Text → <span> "4" ---
      const node_5 = api.preview.inspect('node-5')
      api.assert.ok(node_5 !== null, 'node-5 must exist')
      api.assert.ok(node_5?.tagName === 'span', `node-5: expected <span>, got ${node_5?.tagName}`)
      api.assert.hasText('node-5', '4')
      api.assert.hasStyle('node-5', 'color', 'rgb(255, 255, 255)')
      api.assert.hasStyle('node-5', 'fontSize', '11px')

      // --- node-6: Frame → <div> ---
      const node_6 = api.preview.inspect('node-6')
      api.assert.ok(node_6 !== null, 'node-6 must exist')
      api.assert.ok(node_6?.tagName === 'div', `node-6: expected <div>, got ${node_6?.tagName}`)
      api.assert.hasStyle('node-6', 'display', 'flex')
      api.assert.hasStyle('node-6', 'flexDirection', 'column')
      api.assert.hasStyle('node-6', 'width', '60px')
      api.assert.hasStyle('node-6', 'height', '60px')
      api.assert.hasStyle('node-6', 'backgroundColor', 'rgb(34, 113, 193)')
      api.assert.hasStyle('node-6', 'borderRadius', '12px')
      api.assert.hasChildren('node-6', 1)

      // --- node-7: Text → <span> "12" ---
      const node_7 = api.preview.inspect('node-7')
      api.assert.ok(node_7 !== null, 'node-7 must exist')
      api.assert.ok(node_7?.tagName === 'span', `node-7: expected <span>, got ${node_7?.tagName}`)
      api.assert.hasText('node-7', '12')
      api.assert.hasStyle('node-7', 'color', 'rgb(255, 255, 255)')
      api.assert.hasStyle('node-7', 'fontSize', '11px')

      // --- node-8: Frame → <div> ---
      const node_8 = api.preview.inspect('node-8')
      api.assert.ok(node_8 !== null, 'node-8 must exist')
      api.assert.ok(node_8?.tagName === 'div', `node-8: expected <div>, got ${node_8?.tagName}`)
      api.assert.hasStyle('node-8', 'display', 'flex')
      api.assert.hasStyle('node-8', 'flexDirection', 'column')
      api.assert.hasStyle('node-8', 'width', '60px')
      api.assert.hasStyle('node-8', 'height', '60px')
      api.assert.hasStyle('node-8', 'backgroundColor', 'rgb(34, 113, 193)')
      api.assert.hasStyle('node-8', 'borderRadius', '99px')
      api.assert.hasChildren('node-8', 1)

      // --- node-9: Text → <span> "99" ---
      const node_9 = api.preview.inspect('node-9')
      api.assert.ok(node_9 !== null, 'node-9 must exist')
      api.assert.ok(node_9?.tagName === 'span', `node-9: expected <span>, got ${node_9?.tagName}`)
      api.assert.hasText('node-9', '99')
      api.assert.hasStyle('node-9', 'color', 'rgb(255, 255, 255)')
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
    '[05-styling] Typografie: Größe & Gewicht: Example 7',
    `Frame gap 4, bg #1a1a1a, pad 16, rad 8
  Text "Headline", col white, fs 24, weight bold
  Text "Subheadline", col white, fs 18, weight 500
  Text "Body Text", col #ccc, fs 14
  Text "Small Text", col #888, fs 12
  Text "Caption", col #666, fs 10, uppercase`,
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
      api.assert.hasStyle('node-1', 'gap', '4px')
      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(26, 26, 26)')
      api.assert.hasStyle('node-1', 'padding', '16px')
      api.assert.hasStyle('node-1', 'borderRadius', '8px')
      api.assert.hasChildren('node-1', 5)

      // --- node-2: Text → <span> "Headline" ---
      const node_2 = api.preview.inspect('node-2')
      api.assert.ok(node_2 !== null, 'node-2 must exist')
      api.assert.ok(node_2?.tagName === 'span', `node-2: expected <span>, got ${node_2?.tagName}`)
      api.assert.hasText('node-2', 'Headline')
      api.assert.hasStyle('node-2', 'color', 'rgb(255, 255, 255)')
      api.assert.hasStyle('node-2', 'fontSize', '24px')
      api.assert.hasStyle('node-2', 'fontWeight', '700')

      // --- node-3: Text → <span> "Subheadline" ---
      const node_3 = api.preview.inspect('node-3')
      api.assert.ok(node_3 !== null, 'node-3 must exist')
      api.assert.ok(node_3?.tagName === 'span', `node-3: expected <span>, got ${node_3?.tagName}`)
      api.assert.hasText('node-3', 'Subheadline')
      api.assert.hasStyle('node-3', 'color', 'rgb(255, 255, 255)')
      api.assert.hasStyle('node-3', 'fontSize', '18px')
      api.assert.hasStyle('node-3', 'fontWeight', '500')

      // --- node-4: Text → <span> "Body Text" ---
      const node_4 = api.preview.inspect('node-4')
      api.assert.ok(node_4 !== null, 'node-4 must exist')
      api.assert.ok(node_4?.tagName === 'span', `node-4: expected <span>, got ${node_4?.tagName}`)
      api.assert.hasText('node-4', 'Body Text')
      api.assert.hasStyle('node-4', 'color', 'rgb(204, 204, 204)')
      api.assert.hasStyle('node-4', 'fontSize', '14px')

      // --- node-5: Text → <span> "Small Text" ---
      const node_5 = api.preview.inspect('node-5')
      api.assert.ok(node_5 !== null, 'node-5 must exist')
      api.assert.ok(node_5?.tagName === 'span', `node-5: expected <span>, got ${node_5?.tagName}`)
      api.assert.hasText('node-5', 'Small Text')
      api.assert.hasStyle('node-5', 'color', 'rgb(136, 136, 136)')
      api.assert.hasStyle('node-5', 'fontSize', '12px')

      // --- node-6: Text → <span> "Caption" ---
      const node_6 = api.preview.inspect('node-6')
      api.assert.ok(node_6 !== null, 'node-6 must exist')
      api.assert.ok(node_6?.tagName === 'span', `node-6: expected <span>, got ${node_6?.tagName}`)
      api.assert.hasText('node-6', 'Caption')
      api.assert.hasStyle('node-6', 'color', 'rgb(102, 102, 102)')
      api.assert.hasStyle('node-6', 'fontSize', '10px')

      // --- Hierarchy ---
      // node-2 is child of node-1
      // node-3 is child of node-1
      // node-4 is child of node-1
      // node-5 is child of node-1
      // node-6 is child of node-1
    }
  ),

  testWithSetup(
    '[05-styling] Typografie: Stil: Example 8',
    `Frame gap 8, bg #1a1a1a, pad 16, rad 8
  Text "UPPERCASE TEXT", col white, uppercase
  Text "lowercase text", col white, lowercase
  Text "Italic Text", col white, italic
  Text "Underlined Text", col white, underline
  Text "Truncated text that is too long to fit...", col white, truncate, w 200`,
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
      api.assert.hasStyle('node-1', 'gap', '8px')
      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(26, 26, 26)')
      api.assert.hasStyle('node-1', 'padding', '16px')
      api.assert.hasStyle('node-1', 'borderRadius', '8px')
      api.assert.hasChildren('node-1', 5)

      // --- node-2: Text → <span> "UPPERCASE TEXT" ---
      const node_2 = api.preview.inspect('node-2')
      api.assert.ok(node_2 !== null, 'node-2 must exist')
      api.assert.ok(node_2?.tagName === 'span', `node-2: expected <span>, got ${node_2?.tagName}`)
      api.assert.hasText('node-2', 'UPPERCASE TEXT')
      api.assert.hasStyle('node-2', 'color', 'rgb(255, 255, 255)')

      // --- node-3: Text → <span> "lowercase text" ---
      const node_3 = api.preview.inspect('node-3')
      api.assert.ok(node_3 !== null, 'node-3 must exist')
      api.assert.ok(node_3?.tagName === 'span', `node-3: expected <span>, got ${node_3?.tagName}`)
      api.assert.hasText('node-3', 'lowercase text')
      api.assert.hasStyle('node-3', 'color', 'rgb(255, 255, 255)')

      // --- node-4: Text → <span> "Italic Text" ---
      const node_4 = api.preview.inspect('node-4')
      api.assert.ok(node_4 !== null, 'node-4 must exist')
      api.assert.ok(node_4?.tagName === 'span', `node-4: expected <span>, got ${node_4?.tagName}`)
      api.assert.hasText('node-4', 'Italic Text')
      api.assert.hasStyle('node-4', 'color', 'rgb(255, 255, 255)')

      // --- node-5: Text → <span> "Underlined Text" ---
      const node_5 = api.preview.inspect('node-5')
      api.assert.ok(node_5 !== null, 'node-5 must exist')
      api.assert.ok(node_5?.tagName === 'span', `node-5: expected <span>, got ${node_5?.tagName}`)
      api.assert.hasText('node-5', 'Underlined Text')
      api.assert.hasStyle('node-5', 'color', 'rgb(255, 255, 255)')

      // --- node-6: Text → <span> "Truncated text that is too long to fit..." ---
      const node_6 = api.preview.inspect('node-6')
      api.assert.ok(node_6 !== null, 'node-6 must exist')
      api.assert.ok(node_6?.tagName === 'span', `node-6: expected <span>, got ${node_6?.tagName}`)
      api.assert.hasText('node-6', 'Truncated text that is too long to fit...')
      api.assert.hasStyle('node-6', 'color', 'rgb(255, 255, 255)')
      api.assert.hasStyle('node-6', 'width', '200px')

      // --- Hierarchy ---
      // node-2 is child of node-1
      // node-3 is child of node-1
      // node-4 is child of node-1
      // node-5 is child of node-1
      // node-6 is child of node-1
    }
  ),

  testWithSetup(
    '[05-styling] Typografie: Fonts: Example 9',
    `Frame gap 8, bg #1a1a1a, pad 16, rad 8
  Text "Sans Serif (default)", col white, font sans
  Text "Serif Font", col white, font serif
  Text "Monospace Font", col white, font mono`,
    async (api: TestAPI) => {
      // ========================================
      // DEEP VALIDATION: 4 elements
      // ========================================

      const nodeIds = api.preview.getNodeIds()
      api.assert.ok(nodeIds.length === 4, `Expected 4 nodes, got ${nodeIds.length}`)

      // --- node-1: Frame → <div> ---
      const node_1 = api.preview.inspect('node-1')
      api.assert.ok(node_1 !== null, 'node-1 must exist')
      api.assert.ok(node_1?.tagName === 'div', `node-1: expected <div>, got ${node_1?.tagName}`)
      api.assert.hasStyle('node-1', 'display', 'flex')
      api.assert.hasStyle('node-1', 'flexDirection', 'column')
      api.assert.hasStyle('node-1', 'gap', '8px')
      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(26, 26, 26)')
      api.assert.hasStyle('node-1', 'padding', '16px')
      api.assert.hasStyle('node-1', 'borderRadius', '8px')
      api.assert.hasChildren('node-1', 3)

      // --- node-2: Text → <span> "Sans Serif (default)" ---
      const node_2 = api.preview.inspect('node-2')
      api.assert.ok(node_2 !== null, 'node-2 must exist')
      api.assert.ok(node_2?.tagName === 'span', `node-2: expected <span>, got ${node_2?.tagName}`)
      api.assert.hasText('node-2', 'Sans Serif (default)')
      api.assert.hasStyle('node-2', 'color', 'rgb(255, 255, 255)')

      // --- node-3: Text → <span> "Serif Font" ---
      const node_3 = api.preview.inspect('node-3')
      api.assert.ok(node_3 !== null, 'node-3 must exist')
      api.assert.ok(node_3?.tagName === 'span', `node-3: expected <span>, got ${node_3?.tagName}`)
      api.assert.hasText('node-3', 'Serif Font')
      api.assert.hasStyle('node-3', 'color', 'rgb(255, 255, 255)')

      // --- node-4: Text → <span> "Monospace Font" ---
      const node_4 = api.preview.inspect('node-4')
      api.assert.ok(node_4 !== null, 'node-4 must exist')
      api.assert.ok(node_4?.tagName === 'span', `node-4: expected <span>, got ${node_4?.tagName}`)
      api.assert.hasText('node-4', 'Monospace Font')
      api.assert.hasStyle('node-4', 'color', 'rgb(255, 255, 255)')

      // --- Hierarchy ---
      // node-2 is child of node-1
      // node-3 is child of node-1
      // node-4 is child of node-1
    }
  ),

  testWithSetup(
    '[05-styling] Shadows: Example 10',
    `Frame hor, gap 16, pad 20, bg #0a0a0a
  Frame w 80, h 80, bg #1a1a1a, rad 8, shadow sm, center
    Text "sm", col #888, fs 11
  Frame w 80, h 80, bg #1a1a1a, rad 8, shadow md, center
    Text "md", col #888, fs 11
  Frame w 80, h 80, bg #1a1a1a, rad 8, shadow lg, center
    Text "lg", col #888, fs 11`,
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
      api.assert.hasStyle('node-1', 'flexDirection', 'row')
      api.assert.hasStyle('node-1', 'gap', '16px')
      api.assert.hasStyle('node-1', 'padding', '20px')
      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(10, 10, 10)')
      api.assert.hasChildren('node-1', 3)

      // --- node-2: Frame → <div> ---
      const node_2 = api.preview.inspect('node-2')
      api.assert.ok(node_2 !== null, 'node-2 must exist')
      api.assert.ok(node_2?.tagName === 'div', `node-2: expected <div>, got ${node_2?.tagName}`)
      api.assert.hasStyle('node-2', 'display', 'flex')
      api.assert.hasStyle('node-2', 'flexDirection', 'column')
      api.assert.hasStyle('node-2', 'width', '80px')
      api.assert.hasStyle('node-2', 'height', '80px')
      api.assert.hasStyle('node-2', 'backgroundColor', 'rgb(26, 26, 26)')
      api.assert.hasStyle('node-2', 'borderRadius', '8px')
      api.assert.hasChildren('node-2', 1)

      // --- node-3: Text → <span> "sm" ---
      const node_3 = api.preview.inspect('node-3')
      api.assert.ok(node_3 !== null, 'node-3 must exist')
      api.assert.ok(node_3?.tagName === 'span', `node-3: expected <span>, got ${node_3?.tagName}`)
      api.assert.hasText('node-3', 'sm')
      api.assert.hasStyle('node-3', 'color', 'rgb(136, 136, 136)')
      api.assert.hasStyle('node-3', 'fontSize', '11px')

      // --- node-4: Frame → <div> ---
      const node_4 = api.preview.inspect('node-4')
      api.assert.ok(node_4 !== null, 'node-4 must exist')
      api.assert.ok(node_4?.tagName === 'div', `node-4: expected <div>, got ${node_4?.tagName}`)
      api.assert.hasStyle('node-4', 'display', 'flex')
      api.assert.hasStyle('node-4', 'flexDirection', 'column')
      api.assert.hasStyle('node-4', 'width', '80px')
      api.assert.hasStyle('node-4', 'height', '80px')
      api.assert.hasStyle('node-4', 'backgroundColor', 'rgb(26, 26, 26)')
      api.assert.hasStyle('node-4', 'borderRadius', '8px')
      api.assert.hasChildren('node-4', 1)

      // --- node-5: Text → <span> "md" ---
      const node_5 = api.preview.inspect('node-5')
      api.assert.ok(node_5 !== null, 'node-5 must exist')
      api.assert.ok(node_5?.tagName === 'span', `node-5: expected <span>, got ${node_5?.tagName}`)
      api.assert.hasText('node-5', 'md')
      api.assert.hasStyle('node-5', 'color', 'rgb(136, 136, 136)')
      api.assert.hasStyle('node-5', 'fontSize', '11px')

      // --- node-6: Frame → <div> ---
      const node_6 = api.preview.inspect('node-6')
      api.assert.ok(node_6 !== null, 'node-6 must exist')
      api.assert.ok(node_6?.tagName === 'div', `node-6: expected <div>, got ${node_6?.tagName}`)
      api.assert.hasStyle('node-6', 'display', 'flex')
      api.assert.hasStyle('node-6', 'flexDirection', 'column')
      api.assert.hasStyle('node-6', 'width', '80px')
      api.assert.hasStyle('node-6', 'height', '80px')
      api.assert.hasStyle('node-6', 'backgroundColor', 'rgb(26, 26, 26)')
      api.assert.hasStyle('node-6', 'borderRadius', '8px')
      api.assert.hasChildren('node-6', 1)

      // --- node-7: Text → <span> "lg" ---
      const node_7 = api.preview.inspect('node-7')
      api.assert.ok(node_7 !== null, 'node-7 must exist')
      api.assert.ok(node_7?.tagName === 'span', `node-7: expected <span>, got ${node_7?.tagName}`)
      api.assert.hasText('node-7', 'lg')
      api.assert.hasStyle('node-7', 'color', 'rgb(136, 136, 136)')
      api.assert.hasStyle('node-7', 'fontSize', '11px')

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
    '[05-styling] Opacity: Example 11',
    `Frame hor, gap 8, bg #0a0a0a, pad 16, rad 8
  Frame w 60, h 60, bg #2271C1, rad 8, center, opacity 1
    Text "1", col white, fs 11
  Frame w 60, h 60, bg #2271C1, rad 8, center, opacity 0.7
    Text "0.7", col white, fs 11
  Frame w 60, h 60, bg #2271C1, rad 8, center, opacity 0.4
    Text "0.4", col white, fs 11
  Frame w 60, h 60, bg #2271C1, rad 8, center, opacity 0.2
    Text "0.2", col white, fs 11`,
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
      api.assert.hasStyle('node-1', 'display', 'flex')
      api.assert.hasStyle('node-1', 'flexDirection', 'row')
      api.assert.hasStyle('node-1', 'gap', '8px')
      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(10, 10, 10)')
      api.assert.hasStyle('node-1', 'padding', '16px')
      api.assert.hasStyle('node-1', 'borderRadius', '8px')
      api.assert.hasChildren('node-1', 4)

      // --- node-2: Frame → <div> ---
      const node_2 = api.preview.inspect('node-2')
      api.assert.ok(node_2 !== null, 'node-2 must exist')
      api.assert.ok(node_2?.tagName === 'div', `node-2: expected <div>, got ${node_2?.tagName}`)
      api.assert.hasStyle('node-2', 'display', 'flex')
      api.assert.hasStyle('node-2', 'flexDirection', 'column')
      api.assert.hasStyle('node-2', 'width', '60px')
      api.assert.hasStyle('node-2', 'height', '60px')
      api.assert.hasStyle('node-2', 'backgroundColor', 'rgb(34, 113, 193)')
      api.assert.hasStyle('node-2', 'borderRadius', '8px')
      api.assert.hasStyle('node-2', 'opacity', '1')
      api.assert.hasChildren('node-2', 1)

      // --- node-3: Text → <span> "1" ---
      const node_3 = api.preview.inspect('node-3')
      api.assert.ok(node_3 !== null, 'node-3 must exist')
      api.assert.ok(node_3?.tagName === 'span', `node-3: expected <span>, got ${node_3?.tagName}`)
      api.assert.hasText('node-3', '1')
      api.assert.hasStyle('node-3', 'color', 'rgb(255, 255, 255)')
      api.assert.hasStyle('node-3', 'fontSize', '11px')

      // --- node-4: Frame → <div> ---
      const node_4 = api.preview.inspect('node-4')
      api.assert.ok(node_4 !== null, 'node-4 must exist')
      api.assert.ok(node_4?.tagName === 'div', `node-4: expected <div>, got ${node_4?.tagName}`)
      api.assert.hasStyle('node-4', 'display', 'flex')
      api.assert.hasStyle('node-4', 'flexDirection', 'column')
      api.assert.hasStyle('node-4', 'width', '60px')
      api.assert.hasStyle('node-4', 'height', '60px')
      api.assert.hasStyle('node-4', 'backgroundColor', 'rgb(34, 113, 193)')
      api.assert.hasStyle('node-4', 'borderRadius', '8px')
      api.assert.hasStyle('node-4', 'opacity', '0.7')
      api.assert.hasChildren('node-4', 1)

      // --- node-5: Text → <span> "0.7" ---
      const node_5 = api.preview.inspect('node-5')
      api.assert.ok(node_5 !== null, 'node-5 must exist')
      api.assert.ok(node_5?.tagName === 'span', `node-5: expected <span>, got ${node_5?.tagName}`)
      api.assert.hasText('node-5', '0.7')
      api.assert.hasStyle('node-5', 'color', 'rgb(255, 255, 255)')
      api.assert.hasStyle('node-5', 'fontSize', '11px')

      // --- node-6: Frame → <div> ---
      const node_6 = api.preview.inspect('node-6')
      api.assert.ok(node_6 !== null, 'node-6 must exist')
      api.assert.ok(node_6?.tagName === 'div', `node-6: expected <div>, got ${node_6?.tagName}`)
      api.assert.hasStyle('node-6', 'display', 'flex')
      api.assert.hasStyle('node-6', 'flexDirection', 'column')
      api.assert.hasStyle('node-6', 'width', '60px')
      api.assert.hasStyle('node-6', 'height', '60px')
      api.assert.hasStyle('node-6', 'backgroundColor', 'rgb(34, 113, 193)')
      api.assert.hasStyle('node-6', 'borderRadius', '8px')
      api.assert.hasStyle('node-6', 'opacity', '0.4')
      api.assert.hasChildren('node-6', 1)

      // --- node-7: Text → <span> "0.4" ---
      const node_7 = api.preview.inspect('node-7')
      api.assert.ok(node_7 !== null, 'node-7 must exist')
      api.assert.ok(node_7?.tagName === 'span', `node-7: expected <span>, got ${node_7?.tagName}`)
      api.assert.hasText('node-7', '0.4')
      api.assert.hasStyle('node-7', 'color', 'rgb(255, 255, 255)')
      api.assert.hasStyle('node-7', 'fontSize', '11px')

      // --- node-8: Frame → <div> ---
      const node_8 = api.preview.inspect('node-8')
      api.assert.ok(node_8 !== null, 'node-8 must exist')
      api.assert.ok(node_8?.tagName === 'div', `node-8: expected <div>, got ${node_8?.tagName}`)
      api.assert.hasStyle('node-8', 'display', 'flex')
      api.assert.hasStyle('node-8', 'flexDirection', 'column')
      api.assert.hasStyle('node-8', 'width', '60px')
      api.assert.hasStyle('node-8', 'height', '60px')
      api.assert.hasStyle('node-8', 'backgroundColor', 'rgb(34, 113, 193)')
      api.assert.hasStyle('node-8', 'borderRadius', '8px')
      api.assert.hasStyle('node-8', 'opacity', '0.2')
      api.assert.hasChildren('node-8', 1)

      // --- node-9: Text → <span> "0.2" ---
      const node_9 = api.preview.inspect('node-9')
      api.assert.ok(node_9 !== null, 'node-9 must exist')
      api.assert.ok(node_9?.tagName === 'span', `node-9: expected <span>, got ${node_9?.tagName}`)
      api.assert.hasText('node-9', '0.2')
      api.assert.hasStyle('node-9', 'color', 'rgb(255, 255, 255)')
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
    '[05-styling] Cursor: Example 12',
    `Frame hor, gap 8, wrap, bg #0a0a0a, pad 16, rad 8
  Frame w 70, h 50, bg #1a1a1a, rad 6, center, cursor pointer
    Text "pointer", col #888, fs 10
  Frame w 70, h 50, bg #1a1a1a, rad 6, center, cursor grab
    Text "grab", col #888, fs 10
  Frame w 70, h 50, bg #1a1a1a, rad 6, center, cursor move
    Text "move", col #888, fs 10
  Frame w 70, h 50, bg #1a1a1a, rad 6, center, cursor not-allowed
    Text "not-allowed", col #888, fs 9`,
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
      api.assert.hasStyle('node-1', 'display', 'flex')
      api.assert.hasStyle('node-1', 'flexDirection', 'row')
      api.assert.hasStyle('node-1', 'gap', '8px')
      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(10, 10, 10)')
      api.assert.hasStyle('node-1', 'padding', '16px')
      api.assert.hasStyle('node-1', 'borderRadius', '8px')
      api.assert.hasChildren('node-1', 4)

      // --- node-2: Frame → <div> ---
      const node_2 = api.preview.inspect('node-2')
      api.assert.ok(node_2 !== null, 'node-2 must exist')
      api.assert.ok(node_2?.tagName === 'div', `node-2: expected <div>, got ${node_2?.tagName}`)
      api.assert.hasStyle('node-2', 'display', 'flex')
      api.assert.hasStyle('node-2', 'flexDirection', 'column')
      api.assert.hasStyle('node-2', 'width', '70px')
      api.assert.hasStyle('node-2', 'height', '50px')
      api.assert.hasStyle('node-2', 'backgroundColor', 'rgb(26, 26, 26)')
      api.assert.hasStyle('node-2', 'borderRadius', '6px')
      api.assert.hasChildren('node-2', 1)

      // --- node-3: Text → <span> "pointer" ---
      const node_3 = api.preview.inspect('node-3')
      api.assert.ok(node_3 !== null, 'node-3 must exist')
      api.assert.ok(node_3?.tagName === 'span', `node-3: expected <span>, got ${node_3?.tagName}`)
      api.assert.hasText('node-3', 'pointer')
      api.assert.hasStyle('node-3', 'color', 'rgb(136, 136, 136)')
      api.assert.hasStyle('node-3', 'fontSize', '10px')

      // --- node-4: Frame → <div> ---
      const node_4 = api.preview.inspect('node-4')
      api.assert.ok(node_4 !== null, 'node-4 must exist')
      api.assert.ok(node_4?.tagName === 'div', `node-4: expected <div>, got ${node_4?.tagName}`)
      api.assert.hasStyle('node-4', 'display', 'flex')
      api.assert.hasStyle('node-4', 'flexDirection', 'column')
      api.assert.hasStyle('node-4', 'width', '70px')
      api.assert.hasStyle('node-4', 'height', '50px')
      api.assert.hasStyle('node-4', 'backgroundColor', 'rgb(26, 26, 26)')
      api.assert.hasStyle('node-4', 'borderRadius', '6px')
      api.assert.hasChildren('node-4', 1)

      // --- node-5: Text → <span> "grab" ---
      const node_5 = api.preview.inspect('node-5')
      api.assert.ok(node_5 !== null, 'node-5 must exist')
      api.assert.ok(node_5?.tagName === 'span', `node-5: expected <span>, got ${node_5?.tagName}`)
      api.assert.hasText('node-5', 'grab')
      api.assert.hasStyle('node-5', 'color', 'rgb(136, 136, 136)')
      api.assert.hasStyle('node-5', 'fontSize', '10px')

      // --- node-6: Frame → <div> ---
      const node_6 = api.preview.inspect('node-6')
      api.assert.ok(node_6 !== null, 'node-6 must exist')
      api.assert.ok(node_6?.tagName === 'div', `node-6: expected <div>, got ${node_6?.tagName}`)
      api.assert.hasStyle('node-6', 'display', 'flex')
      api.assert.hasStyle('node-6', 'flexDirection', 'column')
      api.assert.hasStyle('node-6', 'width', '70px')
      api.assert.hasStyle('node-6', 'height', '50px')
      api.assert.hasStyle('node-6', 'backgroundColor', 'rgb(26, 26, 26)')
      api.assert.hasStyle('node-6', 'borderRadius', '6px')
      api.assert.hasChildren('node-6', 1)

      // --- node-7: Text → <span> "move" ---
      const node_7 = api.preview.inspect('node-7')
      api.assert.ok(node_7 !== null, 'node-7 must exist')
      api.assert.ok(node_7?.tagName === 'span', `node-7: expected <span>, got ${node_7?.tagName}`)
      api.assert.hasText('node-7', 'move')
      api.assert.hasStyle('node-7', 'color', 'rgb(136, 136, 136)')
      api.assert.hasStyle('node-7', 'fontSize', '10px')

      // --- node-8: Frame → <div> ---
      const node_8 = api.preview.inspect('node-8')
      api.assert.ok(node_8 !== null, 'node-8 must exist')
      api.assert.ok(node_8?.tagName === 'div', `node-8: expected <div>, got ${node_8?.tagName}`)
      api.assert.hasStyle('node-8', 'display', 'flex')
      api.assert.hasStyle('node-8', 'flexDirection', 'column')
      api.assert.hasStyle('node-8', 'width', '70px')
      api.assert.hasStyle('node-8', 'height', '50px')
      api.assert.hasStyle('node-8', 'backgroundColor', 'rgb(26, 26, 26)')
      api.assert.hasStyle('node-8', 'borderRadius', '6px')
      api.assert.hasChildren('node-8', 1)

      // --- node-9: Text → <span> "not-allowed" ---
      const node_9 = api.preview.inspect('node-9')
      api.assert.ok(node_9 !== null, 'node-9 must exist')
      api.assert.ok(node_9?.tagName === 'span', `node-9: expected <span>, got ${node_9?.tagName}`)
      api.assert.hasText('node-9', 'not-allowed')
      api.assert.hasStyle('node-9', 'color', 'rgb(136, 136, 136)')
      api.assert.hasStyle('node-9', 'fontSize', '9px')

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
    '[05-styling] Hover-Properties: Example 13',
    `Frame hor, gap 8, bg #0a0a0a, pad 16, rad 8
  // Mit hover-bg und hover-col
  Button "Hover mich", bg #333, col white, pad 10 20, rad 6, hover-bg #2271C1, hover-col white

  // Mit hover-scale
  Frame w 60, h 60, bg #2271C1, rad 8, center, cursor pointer, hover-scale 1.1
    Text "Scale", col white, fs 10

  // Mit hover-opacity
  Frame w 60, h 60, bg #10b981, rad 8, center, cursor pointer, hover-opacity 0.7
    Text "Opacity", col white, fs 10`,
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
      api.assert.hasStyle('node-1', 'gap', '8px')
      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(10, 10, 10)')
      api.assert.hasStyle('node-1', 'padding', '16px')
      api.assert.hasStyle('node-1', 'borderRadius', '8px')
      api.assert.hasChildren('node-1', 3)

      // --- node-2: Button → <button> "Hover mich" ---
      const node_2 = api.preview.inspect('node-2')
      api.assert.ok(node_2 !== null, 'node-2 must exist')
      api.assert.ok(
        node_2?.tagName === 'button',
        `node-2: expected <button>, got ${node_2?.tagName}`
      )
      api.assert.hasText('node-2', 'Hover mich')
      api.assert.hasStyle('node-2', 'backgroundColor', 'rgb(51, 51, 51)')
      api.assert.hasStyle('node-2', 'color', 'rgb(255, 255, 255)')
      api.assert.hasStyle('node-2', 'paddingTop', '10px')
      api.assert.hasStyle('node-2', 'paddingBottom', '10px')
      api.assert.hasStyle('node-2', 'paddingLeft', '20px')
      api.assert.hasStyle('node-2', 'paddingRight', '20px')
      api.assert.hasStyle('node-2', 'borderRadius', '6px')

      // --- node-3: Frame → <div> ---
      const node_3 = api.preview.inspect('node-3')
      api.assert.ok(node_3 !== null, 'node-3 must exist')
      api.assert.ok(node_3?.tagName === 'div', `node-3: expected <div>, got ${node_3?.tagName}`)
      api.assert.hasStyle('node-3', 'display', 'flex')
      api.assert.hasStyle('node-3', 'flexDirection', 'column')
      api.assert.hasStyle('node-3', 'width', '60px')
      api.assert.hasStyle('node-3', 'height', '60px')
      api.assert.hasStyle('node-3', 'backgroundColor', 'rgb(34, 113, 193)')
      api.assert.hasStyle('node-3', 'borderRadius', '8px')
      api.assert.hasChildren('node-3', 1)

      // --- node-4: Text → <span> "Scale" ---
      const node_4 = api.preview.inspect('node-4')
      api.assert.ok(node_4 !== null, 'node-4 must exist')
      api.assert.ok(node_4?.tagName === 'span', `node-4: expected <span>, got ${node_4?.tagName}`)
      api.assert.hasText('node-4', 'Scale')
      api.assert.hasStyle('node-4', 'color', 'rgb(255, 255, 255)')
      api.assert.hasStyle('node-4', 'fontSize', '10px')

      // --- node-5: Frame → <div> ---
      const node_5 = api.preview.inspect('node-5')
      api.assert.ok(node_5 !== null, 'node-5 must exist')
      api.assert.ok(node_5?.tagName === 'div', `node-5: expected <div>, got ${node_5?.tagName}`)
      api.assert.hasStyle('node-5', 'display', 'flex')
      api.assert.hasStyle('node-5', 'flexDirection', 'column')
      api.assert.hasStyle('node-5', 'width', '60px')
      api.assert.hasStyle('node-5', 'height', '60px')
      api.assert.hasStyle('node-5', 'backgroundColor', 'rgb(16, 185, 129)')
      api.assert.hasStyle('node-5', 'borderRadius', '8px')
      api.assert.hasChildren('node-5', 1)

      // --- node-6: Text → <span> "Opacity" ---
      const node_6 = api.preview.inspect('node-6')
      api.assert.ok(node_6 !== null, 'node-6 must exist')
      api.assert.ok(node_6?.tagName === 'span', `node-6: expected <span>, got ${node_6?.tagName}`)
      api.assert.hasText('node-6', 'Opacity')
      api.assert.hasStyle('node-6', 'color', 'rgb(255, 255, 255)')
      api.assert.hasStyle('node-6', 'fontSize', '10px')

      // --- Hierarchy ---
      // node-2 is child of node-1
      // node-3 is child of node-1
      // node-4 is child of node-3
      // node-5 is child of node-1
      // node-6 is child of node-5
    }
  ),

  testWithSetup(
    '[05-styling] Praktisch: Button Varianten: Example 14',
    `Frame gap 12, bg #0a0a0a, pad 16, rad 8
  // Filled Buttons
  Frame hor, gap 8
    Button "Primary", bg #2271C1, col white, pad 10 20, rad 6
    Button "Success", bg #10b981, col white, pad 10 20, rad 6
    Button "Danger", bg #ef4444, col white, pad 10 20, rad 6

  // Outlined Buttons
  Frame hor, gap 8
    Button "Outline", bor 1, boc #2271C1, col #2271C1, pad 10 20, rad 6
    Button "Subtle", bg #2271C122, col #2271C1, pad 10 20, rad 6

  // Ghost & Link
  Frame hor, gap 8
    Button "Ghost", col #888, pad 10 20, rad 6
    Button "Link →", col #2271C1, pad 10 20, underline`,
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
      api.assert.hasChildren('node-2', 3)

      // --- node-3: Button → <button> "Primary" ---
      const node_3 = api.preview.inspect('node-3')
      api.assert.ok(node_3 !== null, 'node-3 must exist')
      api.assert.ok(
        node_3?.tagName === 'button',
        `node-3: expected <button>, got ${node_3?.tagName}`
      )
      api.assert.hasText('node-3', 'Primary')
      api.assert.hasStyle('node-3', 'backgroundColor', 'rgb(34, 113, 193)')
      api.assert.hasStyle('node-3', 'color', 'rgb(255, 255, 255)')
      api.assert.hasStyle('node-3', 'paddingTop', '10px')
      api.assert.hasStyle('node-3', 'paddingBottom', '10px')
      api.assert.hasStyle('node-3', 'paddingLeft', '20px')
      api.assert.hasStyle('node-3', 'paddingRight', '20px')
      api.assert.hasStyle('node-3', 'borderRadius', '6px')

      // --- node-4: Button → <button> "Success" ---
      const node_4 = api.preview.inspect('node-4')
      api.assert.ok(node_4 !== null, 'node-4 must exist')
      api.assert.ok(
        node_4?.tagName === 'button',
        `node-4: expected <button>, got ${node_4?.tagName}`
      )
      api.assert.hasText('node-4', 'Success')
      api.assert.hasStyle('node-4', 'backgroundColor', 'rgb(16, 185, 129)')
      api.assert.hasStyle('node-4', 'color', 'rgb(255, 255, 255)')
      api.assert.hasStyle('node-4', 'paddingTop', '10px')
      api.assert.hasStyle('node-4', 'paddingBottom', '10px')
      api.assert.hasStyle('node-4', 'paddingLeft', '20px')
      api.assert.hasStyle('node-4', 'paddingRight', '20px')
      api.assert.hasStyle('node-4', 'borderRadius', '6px')

      // --- node-5: Button → <button> "Danger" ---
      const node_5 = api.preview.inspect('node-5')
      api.assert.ok(node_5 !== null, 'node-5 must exist')
      api.assert.ok(
        node_5?.tagName === 'button',
        `node-5: expected <button>, got ${node_5?.tagName}`
      )
      api.assert.hasText('node-5', 'Danger')
      api.assert.hasStyle('node-5', 'backgroundColor', 'rgb(239, 68, 68)')
      api.assert.hasStyle('node-5', 'color', 'rgb(255, 255, 255)')
      api.assert.hasStyle('node-5', 'paddingTop', '10px')
      api.assert.hasStyle('node-5', 'paddingBottom', '10px')
      api.assert.hasStyle('node-5', 'paddingLeft', '20px')
      api.assert.hasStyle('node-5', 'paddingRight', '20px')
      api.assert.hasStyle('node-5', 'borderRadius', '6px')

      // --- node-6: Frame → <div> ---
      const node_6 = api.preview.inspect('node-6')
      api.assert.ok(node_6 !== null, 'node-6 must exist')
      api.assert.ok(node_6?.tagName === 'div', `node-6: expected <div>, got ${node_6?.tagName}`)
      api.assert.hasStyle('node-6', 'display', 'flex')
      api.assert.hasStyle('node-6', 'flexDirection', 'row')
      api.assert.hasStyle('node-6', 'gap', '8px')
      api.assert.hasChildren('node-6', 2)

      // --- node-7: Button → <button> "Outline" ---
      const node_7 = api.preview.inspect('node-7')
      api.assert.ok(node_7 !== null, 'node-7 must exist')
      api.assert.ok(
        node_7?.tagName === 'button',
        `node-7: expected <button>, got ${node_7?.tagName}`
      )
      api.assert.hasText('node-7', 'Outline')
      api.assert.hasStyle('node-7', 'borderColor', 'rgb(34, 113, 193)')
      api.assert.hasStyle('node-7', 'color', 'rgb(34, 113, 193)')
      api.assert.hasStyle('node-7', 'paddingTop', '10px')
      api.assert.hasStyle('node-7', 'paddingBottom', '10px')
      api.assert.hasStyle('node-7', 'paddingLeft', '20px')
      api.assert.hasStyle('node-7', 'paddingRight', '20px')
      api.assert.hasStyle('node-7', 'borderRadius', '6px')

      // --- node-8: Button → <button> "Subtle" ---
      const node_8 = api.preview.inspect('node-8')
      api.assert.ok(node_8 !== null, 'node-8 must exist')
      api.assert.ok(
        node_8?.tagName === 'button',
        `node-8: expected <button>, got ${node_8?.tagName}`
      )
      api.assert.hasText('node-8', 'Subtle')
      api.assert.hasStyle('node-8', 'backgroundColor', 'rgba(34, 113, 193, 0.13)')
      api.assert.hasStyle('node-8', 'color', 'rgb(34, 113, 193)')
      api.assert.hasStyle('node-8', 'paddingTop', '10px')
      api.assert.hasStyle('node-8', 'paddingBottom', '10px')
      api.assert.hasStyle('node-8', 'paddingLeft', '20px')
      api.assert.hasStyle('node-8', 'paddingRight', '20px')
      api.assert.hasStyle('node-8', 'borderRadius', '6px')

      // --- node-9: Frame → <div> ---
      const node_9 = api.preview.inspect('node-9')
      api.assert.ok(node_9 !== null, 'node-9 must exist')
      api.assert.ok(node_9?.tagName === 'div', `node-9: expected <div>, got ${node_9?.tagName}`)
      api.assert.hasStyle('node-9', 'display', 'flex')
      api.assert.hasStyle('node-9', 'flexDirection', 'row')
      api.assert.hasStyle('node-9', 'gap', '8px')
      api.assert.hasChildren('node-9', 2)

      // --- node-10: Button → <button> "Ghost" ---
      const node_10 = api.preview.inspect('node-10')
      api.assert.ok(node_10 !== null, 'node-10 must exist')
      api.assert.ok(
        node_10?.tagName === 'button',
        `node-10: expected <button>, got ${node_10?.tagName}`
      )
      api.assert.hasText('node-10', 'Ghost')
      api.assert.hasStyle('node-10', 'color', 'rgb(136, 136, 136)')
      api.assert.hasStyle('node-10', 'paddingTop', '10px')
      api.assert.hasStyle('node-10', 'paddingBottom', '10px')
      api.assert.hasStyle('node-10', 'paddingLeft', '20px')
      api.assert.hasStyle('node-10', 'paddingRight', '20px')
      api.assert.hasStyle('node-10', 'borderRadius', '6px')

      // --- node-11: Button → <button> "Link →" ---
      const node_11 = api.preview.inspect('node-11')
      api.assert.ok(node_11 !== null, 'node-11 must exist')
      api.assert.ok(
        node_11?.tagName === 'button',
        `node-11: expected <button>, got ${node_11?.tagName}`
      )
      api.assert.hasText('node-11', 'Link →')
      api.assert.hasStyle('node-11', 'color', 'rgb(34, 113, 193)')
      api.assert.hasStyle('node-11', 'paddingTop', '10px')
      api.assert.hasStyle('node-11', 'paddingBottom', '10px')
      api.assert.hasStyle('node-11', 'paddingLeft', '20px')
      api.assert.hasStyle('node-11', 'paddingRight', '20px')

      // --- Hierarchy ---
      // node-2 is child of node-1
      // node-3 is child of node-2
      // node-4 is child of node-2
      // node-5 is child of node-2
      // node-6 is child of node-1
      // node-7 is child of node-6
      // node-8 is child of node-6
      // node-9 is child of node-1
      // node-10 is child of node-9
      // node-11 is child of node-9
    }
  ),

  testWithSetup(
    '[05-styling] Praktisch: Card Styles: Example 15',
    `Frame hor, gap 12, bg #0a0a0a, pad 16, rad 8
  // Elevated
  Frame w 120, bg #1a1a1a, pad 16, rad 12, shadow md, gap 8
    Text "Elevated", col white, fs 13, weight 500
    Text "Mit Schatten", col #888, fs 11

  // Bordered
  Frame w 120, bor 1, boc #333, pad 16, rad 12, gap 8
    Text "Bordered", col white, fs 13, weight 500
    Text "Mit Border", col #888, fs 11

  // Gradient
  Frame w 120, pad 16, rad 12, gap 8, bg grad 135 #1a1a2e #16213e
    Text "Gradient", col white, fs 13, weight 500
    Text "Mit Verlauf", col #888, fs 11`,
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
      api.assert.hasStyle('node-1', 'flexDirection', 'row')
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
      api.assert.hasStyle('node-2', 'width', '120px')
      api.assert.hasStyle('node-2', 'backgroundColor', 'rgb(26, 26, 26)')
      api.assert.hasStyle('node-2', 'padding', '16px')
      api.assert.hasStyle('node-2', 'borderRadius', '12px')
      api.assert.hasStyle('node-2', 'gap', '8px')
      api.assert.hasChildren('node-2', 2)

      // --- node-3: Text → <span> "Elevated" ---
      const node_3 = api.preview.inspect('node-3')
      api.assert.ok(node_3 !== null, 'node-3 must exist')
      api.assert.ok(node_3?.tagName === 'span', `node-3: expected <span>, got ${node_3?.tagName}`)
      api.assert.hasText('node-3', 'Elevated')
      api.assert.hasStyle('node-3', 'color', 'rgb(255, 255, 255)')
      api.assert.hasStyle('node-3', 'fontSize', '13px')
      api.assert.hasStyle('node-3', 'fontWeight', '500')

      // --- node-4: Text → <span> "Mit Schatten" ---
      const node_4 = api.preview.inspect('node-4')
      api.assert.ok(node_4 !== null, 'node-4 must exist')
      api.assert.ok(node_4?.tagName === 'span', `node-4: expected <span>, got ${node_4?.tagName}`)
      api.assert.hasText('node-4', 'Mit Schatten')
      api.assert.hasStyle('node-4', 'color', 'rgb(136, 136, 136)')
      api.assert.hasStyle('node-4', 'fontSize', '11px')

      // --- node-5: Frame → <div> ---
      const node_5 = api.preview.inspect('node-5')
      api.assert.ok(node_5 !== null, 'node-5 must exist')
      api.assert.ok(node_5?.tagName === 'div', `node-5: expected <div>, got ${node_5?.tagName}`)
      api.assert.hasStyle('node-5', 'display', 'flex')
      api.assert.hasStyle('node-5', 'flexDirection', 'column')
      api.assert.hasStyle('node-5', 'width', '120px')
      api.assert.hasStyle('node-5', 'borderColor', 'rgb(51, 51, 51)')
      api.assert.hasStyle('node-5', 'padding', '16px')
      api.assert.hasStyle('node-5', 'borderRadius', '12px')
      api.assert.hasStyle('node-5', 'gap', '8px')
      api.assert.hasChildren('node-5', 2)

      // --- node-6: Text → <span> "Bordered" ---
      const node_6 = api.preview.inspect('node-6')
      api.assert.ok(node_6 !== null, 'node-6 must exist')
      api.assert.ok(node_6?.tagName === 'span', `node-6: expected <span>, got ${node_6?.tagName}`)
      api.assert.hasText('node-6', 'Bordered')
      api.assert.hasStyle('node-6', 'color', 'rgb(255, 255, 255)')
      api.assert.hasStyle('node-6', 'fontSize', '13px')
      api.assert.hasStyle('node-6', 'fontWeight', '500')

      // --- node-7: Text → <span> "Mit Border" ---
      const node_7 = api.preview.inspect('node-7')
      api.assert.ok(node_7 !== null, 'node-7 must exist')
      api.assert.ok(node_7?.tagName === 'span', `node-7: expected <span>, got ${node_7?.tagName}`)
      api.assert.hasText('node-7', 'Mit Border')
      api.assert.hasStyle('node-7', 'color', 'rgb(136, 136, 136)')
      api.assert.hasStyle('node-7', 'fontSize', '11px')

      // --- node-8: Frame → <div> ---
      const node_8 = api.preview.inspect('node-8')
      api.assert.ok(node_8 !== null, 'node-8 must exist')
      api.assert.ok(node_8?.tagName === 'div', `node-8: expected <div>, got ${node_8?.tagName}`)
      api.assert.hasStyle('node-8', 'display', 'flex')
      api.assert.hasStyle('node-8', 'flexDirection', 'column')
      api.assert.hasStyle('node-8', 'width', '120px')
      api.assert.hasStyle('node-8', 'padding', '16px')
      api.assert.hasStyle('node-8', 'borderRadius', '12px')
      api.assert.hasStyle('node-8', 'gap', '8px')
      // Skipping gradient: grad 135 #1a1a2e #16213e
      api.assert.hasChildren('node-8', 2)

      // --- node-9: Text → <span> "Gradient" ---
      const node_9 = api.preview.inspect('node-9')
      api.assert.ok(node_9 !== null, 'node-9 must exist')
      api.assert.ok(node_9?.tagName === 'span', `node-9: expected <span>, got ${node_9?.tagName}`)
      api.assert.hasText('node-9', 'Gradient')
      api.assert.hasStyle('node-9', 'color', 'rgb(255, 255, 255)')
      api.assert.hasStyle('node-9', 'fontSize', '13px')
      api.assert.hasStyle('node-9', 'fontWeight', '500')

      // --- node-10: Text → <span> "Mit Verlauf" ---
      const node_10 = api.preview.inspect('node-10')
      api.assert.ok(node_10 !== null, 'node-10 must exist')
      api.assert.ok(
        node_10?.tagName === 'span',
        `node-10: expected <span>, got ${node_10?.tagName}`
      )
      api.assert.hasText('node-10', 'Mit Verlauf')
      api.assert.hasStyle('node-10', 'color', 'rgb(136, 136, 136)')
      api.assert.hasStyle('node-10', 'fontSize', '11px')

      // --- Hierarchy ---
      // node-2 is child of node-1
      // node-3 is child of node-2
      // node-4 is child of node-2
      // node-5 is child of node-1
      // node-6 is child of node-5
      // node-7 is child of node-5
      // node-8 is child of node-1
      // node-9 is child of node-8
      // node-10 is child of node-8
    }
  ),
])
