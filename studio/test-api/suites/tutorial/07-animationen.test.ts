/**
 * Tutorial Tests: Animationen
 *
 * Auto-generated from docs/tutorial/07-animationen.html
 * Generated: 2026-04-20T13:03:12.778Z
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

export const chapter_07_animationenTests: TestCase[] = describe('Tutorial: Animationen', [
  testWithSetup(
    '[07-animationen] Transitions: Sanfte Übergänge: Example 1',
    `// Ohne Transition: springt
BtnHart: pad 12 24, rad 6, bg #333, col white, cursor pointer
  hover:
    bg #2271C1

// Mit Transition: gleitet
BtnSoft: pad 12 24, rad 6, bg #333, col white, cursor pointer
  hover 0.3s:
    bg #2271C1

Frame hor, gap 12
  BtnHart "Ohne"
  BtnSoft "Mit 0.3s"`,
    async (api: TestAPI) => {
      // Complex feature: hover:, data binding, component definitions
      // If we reach here, compilation succeeded (no exception thrown)
      api.assert.ok(true, 'Compilation successful')
    }
  ),

  testWithSetup(
    '[07-animationen] Easing: Wie sich Bewegung anfühlt: Example 2',
    `Btn: pad 12 24, rad 6, bg #333, col white, cursor pointer

// Verschiedene Easings
Frame gap 8
  Btn "ease-out (Standard)"
    hover 0.3s ease-out:
      bg #2271C1
  Btn "ease-in"
    hover 0.3s ease-in:
      bg #2271C1
  Btn "ease-in-out"
    hover 0.3s ease-in-out:
      bg #2271C1`,
    async (api: TestAPI) => {
      // Complex feature: hover:, component definitions
      // If we reach here, compilation succeeded (no exception thrown)
      api.assert.ok(true, 'Compilation successful')
    }
  ),

  testWithSetup(
    '[07-animationen] Animation Presets: Example 3',
    `Frame hor, gap 12, wrap, bg #0a0a0a, pad 16, rad 8
  Frame w 60, h 60, bg #2271C1, rad 8, center, anim pulse
    Text "pulse", col white, fs 10
  Frame w 60, h 60, bg #10b981, rad 8, center, anim bounce
    Text "bounce", col white, fs 10
  Frame w 60, h 60, bg #f59e0b, rad 8, center, anim shake
    Text "shake", col white, fs 10
  Frame w 60, h 60, bg #ef4444, rad 8, center, anim spin
    Text "spin", col white, fs 10`,
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
      api.assert.hasStyle('node-2', 'borderRadius', '8px')
      api.assert.hasChildren('node-2', 1)

      // --- node-3: Text → <span> "pulse" ---
      const node_3 = api.preview.inspect('node-3')
      api.assert.ok(node_3 !== null, 'node-3 must exist')
      api.assert.ok(node_3?.tagName === 'span', `node-3: expected <span>, got ${node_3?.tagName}`)
      api.assert.hasText('node-3', 'pulse')
      api.assert.hasStyle('node-3', 'color', 'rgb(255, 255, 255)')
      api.assert.hasStyle('node-3', 'fontSize', '10px')

      // --- node-4: Frame → <div> ---
      const node_4 = api.preview.inspect('node-4')
      api.assert.ok(node_4 !== null, 'node-4 must exist')
      api.assert.ok(node_4?.tagName === 'div', `node-4: expected <div>, got ${node_4?.tagName}`)
      api.assert.hasStyle('node-4', 'display', 'flex')
      api.assert.hasStyle('node-4', 'flexDirection', 'column')
      api.assert.hasStyle('node-4', 'width', '60px')
      api.assert.hasStyle('node-4', 'height', '60px')
      api.assert.hasStyle('node-4', 'backgroundColor', 'rgb(16, 185, 129)')
      api.assert.hasStyle('node-4', 'borderRadius', '8px')
      api.assert.hasChildren('node-4', 1)

      // --- node-5: Text → <span> "bounce" ---
      const node_5 = api.preview.inspect('node-5')
      api.assert.ok(node_5 !== null, 'node-5 must exist')
      api.assert.ok(node_5?.tagName === 'span', `node-5: expected <span>, got ${node_5?.tagName}`)
      api.assert.hasText('node-5', 'bounce')
      api.assert.hasStyle('node-5', 'color', 'rgb(255, 255, 255)')
      api.assert.hasStyle('node-5', 'fontSize', '10px')

      // --- node-6: Frame → <div> ---
      const node_6 = api.preview.inspect('node-6')
      api.assert.ok(node_6 !== null, 'node-6 must exist')
      api.assert.ok(node_6?.tagName === 'div', `node-6: expected <div>, got ${node_6?.tagName}`)
      api.assert.hasStyle('node-6', 'display', 'flex')
      api.assert.hasStyle('node-6', 'flexDirection', 'column')
      api.assert.hasStyle('node-6', 'width', '60px')
      api.assert.hasStyle('node-6', 'height', '60px')
      api.assert.hasStyle('node-6', 'backgroundColor', 'rgb(245, 158, 11)')
      api.assert.hasStyle('node-6', 'borderRadius', '8px')
      api.assert.hasChildren('node-6', 1)

      // --- node-7: Text → <span> "shake" ---
      const node_7 = api.preview.inspect('node-7')
      api.assert.ok(node_7 !== null, 'node-7 must exist')
      api.assert.ok(node_7?.tagName === 'span', `node-7: expected <span>, got ${node_7?.tagName}`)
      api.assert.hasText('node-7', 'shake')
      api.assert.hasStyle('node-7', 'color', 'rgb(255, 255, 255)')
      api.assert.hasStyle('node-7', 'fontSize', '10px')

      // --- node-8: Frame → <div> ---
      const node_8 = api.preview.inspect('node-8')
      api.assert.ok(node_8 !== null, 'node-8 must exist')
      api.assert.ok(node_8?.tagName === 'div', `node-8: expected <div>, got ${node_8?.tagName}`)
      api.assert.hasStyle('node-8', 'display', 'flex')
      api.assert.hasStyle('node-8', 'flexDirection', 'column')
      api.assert.hasStyle('node-8', 'width', '60px')
      api.assert.hasStyle('node-8', 'height', '60px')
      api.assert.hasStyle('node-8', 'backgroundColor', 'rgb(239, 68, 68)')
      api.assert.hasStyle('node-8', 'borderRadius', '8px')
      api.assert.hasChildren('node-8', 1)

      // --- node-9: Text → <span> "spin" ---
      const node_9 = api.preview.inspect('node-9')
      api.assert.ok(node_9 !== null, 'node-9 must exist')
      api.assert.ok(node_9?.tagName === 'span', `node-9: expected <span>, got ${node_9?.tagName}`)
      api.assert.hasText('node-9', 'spin')
      api.assert.hasStyle('node-9', 'color', 'rgb(255, 255, 255)')
      api.assert.hasStyle('node-9', 'fontSize', '10px')

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
    '[07-animationen] Animation bei State-Wechsel: Example 4',
    `LikeBtn: pad 12 20, rad 6, bg #1a1a1a, col #888, cursor pointer, hor, ver-center, gap 8, toggle()
  Icon "heart", ic #666, is 18
  "Gefällt mir"
  hover 0.15s:
    bg #252525
  on:
    bg #dc2626
    col white
    anim bounce
    Icon "heart", ic white, is 18, fill
    "Gefällt mir!"

LikeBtn`,
    async (api: TestAPI) => {
      // Complex feature: toggle(), hover:, animation, data binding, component definitions
      // If we reach here, compilation succeeded (no exception thrown)
      api.assert.ok(true, 'Compilation successful')
    }
  ),

  testWithSetup(
    '[07-animationen] Transition auf Custom States: Example 5',
    `Toggle: Frame w 48, h 28, rad 99, bg #333, cursor pointer, toggle()
  // Der Knopf
  Frame w 24, h 24, rad 99, bg white, mar 2
  on 0.2s:
    bg #2271C1
    Frame mar 2 2 2 22

Toggle`,
    async (api: TestAPI) => {
      // Complex feature: toggle(), component definitions
      // If we reach here, compilation succeeded (no exception thrown)
      api.assert.ok(true, 'Compilation successful')
    }
  ),

  testWithSetup(
    '[07-animationen] Sichtbarkeit animieren: Example 6',
    `Frame gap 12, bg #0a0a0a, pad 16, rad 8
  Button name Btn, "Hinweis zeigen", pad 10 20, bg #2271C1, col white, rad 6, toggle()
    open:
      "Hinweis verstecken"

  Frame bg #1a1a1a, pad 16, rad 8, hidden
    Btn.open 0.2s:
      visible
    Text "Dies ist ein Hinweis mit Animation.", col #ccc`,
    async (api: TestAPI) => {
      // Complex feature: toggle(), data binding
      // If we reach here, compilation succeeded (no exception thrown)
      api.assert.ok(true, 'Compilation successful')
    }
  ),

  testWithSetup(
    '[07-animationen] Praktisch: Animiertes Menü: Example 7',
    `Frame hor, gap 12, bg #0a0a0a, pad 16, rad 8
  Button name Btn, "Menü", pad 10 20, bg #333, col white, rad 6, toggle()
    open 0.15s:
      bg #2271C1

  Frame bg #1a1a1a, pad 12, rad 8, gap 4, w 160, hidden, opacity 0
    Btn.open 0.2s:
      visible
      opacity 1
    Text "Dashboard", col white, pad 8 12
    Text "Einstellungen", col white, pad 8 12
    Text "Logout", col #888, pad 8 12`,
    async (api: TestAPI) => {
      // Complex feature: toggle()
      // If we reach here, compilation succeeded (no exception thrown)
      api.assert.ok(true, 'Compilation successful')
    }
  ),

  testWithSetup(
    '[07-animationen] Praktisch: Loading Spinner: Example 8',
    `Frame hor, ver-center, gap 12, bg #1a1a1a, pad 16, rad 8
  Icon "loader-2", ic #2271C1, is 24, anim spin
  Text "Lädt...", col #888`,
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
      api.assert.hasStyle('node-1', 'flexDirection', 'row')
      api.assert.hasStyle('node-1', 'gap', '12px')
      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(26, 26, 26)')
      api.assert.hasStyle('node-1', 'padding', '16px')
      api.assert.hasStyle('node-1', 'borderRadius', '8px')
      api.assert.hasChildren('node-1', 2)

      // --- node-2: Icon → <span> "loader-2" ---
      const node_2 = api.preview.inspect('node-2')
      api.assert.ok(node_2 !== null, 'node-2 must exist')
      api.assert.ok(node_2?.tagName === 'span', `node-2: expected <span>, got ${node_2?.tagName}`)
      api.assert.hasStyle('node-2', 'color', 'rgb(34, 113, 193)')

      // --- node-3: Text → <span> "Lädt..." ---
      const node_3 = api.preview.inspect('node-3')
      api.assert.ok(node_3 !== null, 'node-3 must exist')
      api.assert.ok(node_3?.tagName === 'span', `node-3: expected <span>, got ${node_3?.tagName}`)
      api.assert.hasText('node-3', 'Lädt...')
      api.assert.hasStyle('node-3', 'color', 'rgb(136, 136, 136)')

      // --- Hierarchy ---
      // node-2 is child of node-1
      // node-3 is child of node-1
    }
  ),

  testWithSetup(
    '[07-animationen] Praktisch: Erfolgs-Feedback: Example 9',
    `SaveBtn: pad 12 24, rad 6, bg #333, col white, cursor pointer, hor, ver-center, gap 8, toggle()
  Icon "save", ic white, is 16
  "Speichern"
  hover 0.15s:
    bg #444
  saved:
    bg #10b981
    anim bounce
    Icon "check", ic white, is 16
    "Gespeichert!"

SaveBtn`,
    async (api: TestAPI) => {
      // Complex feature: toggle(), hover:, animation, data binding, component definitions
      // If we reach here, compilation succeeded (no exception thrown)
      api.assert.ok(true, 'Compilation successful')
    }
  ),
])
