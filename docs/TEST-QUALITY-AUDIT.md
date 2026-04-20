# Test Quality Audit Report

Generated: 2026-04-19T20:32:33.510Z

---

## Verbesserungs-Prioritäten

**Zuletzt aktualisiert:** 2026-04-20

| Kategorie               | Tests | Status      | Priorität | Hauptproblem                                                                                                                         |
| ----------------------- | ----- | ----------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| ~~Zag~~                 | 65    | ✅ ERLEDIGT | -         | Verbessert am 2026-04-20                                                                                                             |
| ~~States~~              | 38    | ✅ ERLEDIGT | -         | Verbessert am 2026-04-20                                                                                                             |
| ~~Interactions~~        | 239   | ✅ ERLEDIGT | -         | Verbessert am 2026-04-20: multiselect, padding-handlers, layout-shortcuts                                                            |
| ~~Autocomplete~~        | 17    | ✅ ERLEDIGT | -         | Verifiziert am 2026-04-20: Primitives, Properties, Values, Icons, Tokens, Components                                                 |
| ~~Bidirectional~~       | 22    | ✅ ERLEDIGT | -         | Verifiziert am 2026-04-20: Code↔Preview sync, SourceMap, Editing (1 flaky test: Clear selection)                                     |
| ~~Styling~~             | 60    | ✅ ERLEDIGT | -         | Verbessert am 2026-04-20: shadow/blur/font/truncate                                                                                  |
| ~~Primitives~~          | 53    | ✅ ERLEDIGT | -         | Verbessert am 2026-04-20: Icon SVG/size/color validation                                                                             |
| ~~Transforms~~          | 45    | ✅ ERLEDIGT | -         | Verbessert am 2026-04-20: rotate/scale/translate matrix value validation                                                             |
| ~~Animations~~          | 34    | ✅ ERLEDIGT | -         | Verbessert am 2026-04-20: timing/easing validation, weak OR conditions fixed                                                         |
| ~~Layout~~              | 39    | ✅ ERLEDIGT | -         | Verbessert am 2026-04-20: grow/shrink/grid/stacked validation, dimension checks                                                      |
| ~~Property Panel~~      | 50    | ✅ ERLEDIGT | -         | Verifiziert am 2026-04-20: vollständige code+preview validation (sizing, spacing, colors, border, typography, visual, layout, icons) |
| ~~Gradients~~           | 16    | ✅ ERLEDIGT | -         | Verifiziert am 2026-04-20: horizontal, vertical, angled gradients, text gradients, effects                                           |
| ~~Test System~~         | 20    | ✅ ERLEDIGT | -         | Verbessert am 2026-04-20: always-true und conditional-assertion Issues behoben                                                       |
| ~~SideNav~~             | 11    | ✅ ERLEDIGT | -         | Verbessert am 2026-04-20: always-true in catch blocks entfernt, weak-or-conditions gestärkt                                          |
| ~~Icon Picker~~         | 8     | ✅ ERLEDIGT | -         | Verbessert am 2026-04-20: weak-or-conditions gestärkt                                                                                |
| ~~Dashboard E2E~~       | 1     | ✅ ERLEDIGT | -         | Verbessert am 2026-04-20: conditional-assertions und always-true entfernt                                                            |
| ~~Draft Lines~~         | 10    | ✅ ERLEDIGT | -         | Verbessert am 2026-04-20: always-true assertion ersetzt durch echte Validierung                                                      |
| ~~Stacked Drag~~        | 49    | ✅ ERLEDIGT | -         | Verbessert am 2026-04-20: weak-or-condition durch separate Assertions ersetzt                                                        |
| ~~Checkbox (Zag)~~      | 24    | ✅ ERLEDIGT | -         | Verbessert am 2026-04-20: conditional-assertion behoben, OR-conditions vereinfacht                                                   |
| ~~Integration~~         | ~40   | ✅ ERLEDIGT | -         | Verbessert am 2026-04-20: conditional-assertion in ListItem, Sidebar, Each loop Tests entfernt                                       |
| ~~Comprehensive Props~~ | 30    | ✅ ERLEDIGT | -         | Verbessert am 2026-04-20: conditional-assertion für width-full, horizontal, center Tests                                             |
| ~~Scale Transform~~     | 15    | ✅ ERLEDIGT | -         | Verbessert am 2026-04-20: hover scale und button hover scale conditional-assertion                                                   |
| ~~Rotate Transform~~    | 15    | ✅ ERLEDIGT | -         | Verbessert am 2026-04-20: hover rotation conditional-assertion                                                                       |
| ~~Hover States~~        | 20    | ✅ ERLEDIGT | -         | Verbessert am 2026-04-20: matrix parsing conditional entfernt                                                                        |
| ~~Tooltip~~             | 10    | ✅ ERLEDIGT | -         | Verbessert am 2026-04-20: positioning test conditional-assertion                                                                     |
| ~~Radio Group~~         | 12    | ✅ ERLEDIGT | -         | Verbessert am 2026-04-20: disabled state conditional-assertion                                                                       |
| ~~Select~~              | 12    | ✅ ERLEDIGT | -         | Verbessert am 2026-04-20: disabled state conditional-assertion                                                                       |
| ~~Date Picker~~         | 12    | ✅ ERLEDIGT | -         | Verbessert am 2026-04-20: calendar content und navigation conditional-assertion                                                      |
| ~~Switch~~              | 10    | ✅ ERLEDIGT | -         | Verbessert am 2026-04-20: label slot conditional-assertion                                                                           |
| ~~Wrap Layout~~         | 25    | ✅ ERLEDIGT | -         | Verbessert am 2026-04-20: H key single element always-true assertion                                                                 |
| ~~Interaction Stress~~  | 15    | ✅ ERLEDIGT | -         | Verbessert am 2026-04-20: DOM update timing conditional-assertion                                                                    |
| ~~Sync Tests~~          | 10    | ✅ ERLEDIGT | -         | Verbessert am 2026-04-20: deleted selection always-true assertion                                                                    |

### Schwache Test-Patterns (zu vermeiden)

```typescript
// ❌ SCHWACH: Nur Existenz-Check
api.assert.exists('node-1')
api.assert.ok(info !== null, 'Element should exist')

// ✅ STARK: Werte validieren
api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(34, 113, 193)')
api.assert.ok(
  parseFloat(info.styles.opacity) < 1,
  `Disabled should have reduced opacity, got ${info.styles.opacity}`
)
```

---

## Summary

| Metric             | Count |
| ------------------ | ----- |
| Test Files         | 113   |
| Total Tests        | 1611  |
| Files with Issues  | 97    |
| Total Issues       | 5279  |
| 🔴 High Severity   | 172   |
| 🟡 Medium Severity | 3898  |
| 🟢 Low Severity    | 1209  |

## Issues by Pattern

### 🔴 conditional-assertion (58)

> Assertion inside if block - may be skipped

**animations/state-animations.test.ts**

- Line 175: `if (style.transitionTimingFunction) {`

**compiler-verification/index.ts**

- Line 26: `if (hex.length === 3) {`
- Line 621: `if (welcome !== null) {`
- Line 649: `if (hello !== null) {`

**draft-lines/index.ts**

- Line 87: `if (!view) {`
- Line 131: `if (!view) {`

**drag/alignment-from-move.test.ts**

- Line 148: `if (!result.success) {`

**flex-reorder-tests.ts**

- Line 39: `if (notFound.length > 0) {`

**integration/index.ts**

- Line 794: `if (children && children[0]) {`
- Line 856: `if (children && children[0]) {`
- Line 1389: `if (eachItems && eachItems[0]) {`
- Line 1440: `if (eachItems && eachItems[0]) {`
- Line 1887: `if (icon) {`

**interactions/editor-multiselect.test.ts**

- Line 57: `if (sourceMap) {`

**interactions/layout-shortcuts.test.ts**

- Line 200: `if (editorContainer) {`

**interactions/margin.test.ts**

- Line 350: `if (element) {`
- Line 365: `if (element) {`

**interactions/padding.test.ts**

- Line 350: `if (element) {`
- Line 365: `if (element) {`

**interactions/token-extract.test.ts**

- Line 84: `if (!tokFile) {`

**layout-verification-tests.ts**

- Line 33: `if (!result.passed) {`

**primitives/defaults.test.ts**

- Line 21: `if (minWidth === 'auto' || minWidth === 'none' || minWidth === '') {`
- Line 74: `if (width < 36) {`
- Line 89: `if (width < 36) {`
- Line 102: `if (width < 36) {`
- Line 113: `if (width < 36) {`
- ... and 6 more

**project/index.ts**

- Line 642: `if (file !== 'index.mir') {`
- Line 843: `if (opened) {`

**property-panel/color-picker.test.ts**

- Line 56: `if (!trigger) {`

**property-panel/comprehensive.test.ts**

- Line 118: `if (element && parent) {`
- Line 616: `if (child1 && child2) {`
- Line 650: `if (parent && child) {`

**property-panel/icon-picker.test.ts**

- Line 38: `if (iconElement) {`
- Line 180: `if (preview) {`
- Line 353: `if (searchInputInit && searchInputInit.value !== '') {`
- Line 390: `if (preview) {`

**property-panel-tests.ts**

- Line 42: `if (panel) {`
- Line 936: `if (radInput) {`

**stacked-drag-tests.ts**

- Line 324: `if (node2El) {`

**stress/interaction-stress.test.ts**

- Line 358: `if (container && container.children.length > 0) {`

**test-system-tests.ts**

- Line 172: `if (nodeIds.length > 0) {`
- Line 221: `if (!inputId) {`
- Line 275: `if (!inputId) {`

**ui-builder-tests.ts**

- Line 42: `if (!preview) {`
- Line 526: `if (frame) {`
- Line 630: `if (frame) {`
- Line 2681: `if (headers[i].w === 'grow') {`

**workflow/dashboard-e2e.test.ts**

- Line 235: `if (frameHor) {`
- Line 243: `if (sidebarInfo) {`
- Line 341: `if (statCardId) {`

**zag/checkbox.test.ts**

- Line 58: `if (hasDisabledProp) {`

**zag/sidenav.test.ts**

- Line 253: `if (settingsItem) {`

### 🔴 weak-or-condition (98)

> OR condition in assertion - may always pass

**animations/state-animations.test.ts**

- Line 212: `api.assert.ok(`
- Line 415: `api.assert.ok(`

**autocomplete-tests.ts**

- Line 51: `api.assert.ok(allStartWithBu || completions.length === 0, 'Should filter by pref`
- Line 221: `api.assert.ok(allArrow || completions.length === 0, 'Should filter icons by pref`

**bidirectional-tests.ts**

- Line 146: `api.assert.ok(selection === null || selection === 'node-2', 'Selection clear att`
- Line 215: `api.assert.ok(`

**compiler-verification/index.ts**

- Line 114: `api.assert.ok(`
- Line 465: `api.assert.ok(`
- Line 471: `api.assert.ok(`
- Line 518: `api.assert.ok(`
- Line 623: `api.assert.ok(`
- ... and 34 more

**data-binding-tests.ts**

- Line 139: `api.assert.ok(`
- Line 186: `api.assert.ok(`
- Line 354: `api.assert.ok(`
- Line 374: `api.assert.ok(`

**integration/index.ts**

- Line 605: `api.assert.ok(icon !== null || btn?.innerHTML.includes('icon'), 'Button should c`
- Line 1286: `api.assert.ok(`
- Line 1332: `api.assert.ok(`
- Line 1987: `api.assert.ok(btnStyle.width === '320px' || btnStyle.width === '100%', 'Button s`

**interactions/margin.test.ts**

- Line 118: `api.assert.ok(topZone?.rect.height === 0 || !topZone, 'Initial margin should be `

**interactions/padding.test.ts**

- Line 118: `api.assert.ok(topZone?.rect.height === 0 || !topZone, 'Initial padding should be`

**project/index.ts**

- Line 706: `api.assert.ok(hasFile || created, 'Layout file should be created')`

**property-panel/comprehensive.test.ts**

- Line 490: `api.assert.ok(`
- Line 518: `api.assert.ok(`
- Line 840: `api.assert.ok(`

**property-panel/icon-picker.test.ts**

- Line 246: `api.assert.ok(`
- Line 295: `api.assert.ok(`
- Line 309: `api.assert.ok(`
- Line 430: `api.assert.ok(`

**property-panel-tests.ts**

- Line 198: `api.assert.ok(`

**property-robustness-tests.ts**

- Line 537: `api.assert.ok(`

**stacked-drag-tests.ts**

- Line 82: `api.assert.ok(`
- Line 314: `api.assert.ok(`
- Line 346: `api.assert.ok(`

**states/hover.test.ts**

- Line 345: `api.assert.ok(`

**stress/index.ts**

- Line 346: `api.assert.ok(`
- Line 360: `api.assert.ok(`

**stress/race-conditions.test.ts**

- Line 66: `api.assert.ok(`

**stress/sourcemap-stress.test.ts**

- Line 373: `api.assert.ok(`

**sync-tests.ts**

- Line 516: `api.assert.ok(code.length === 0 || code.trim().length === 0, 'Code should be emp`

**transforms/rotate.test.ts**

- Line 177: `api.assert.ok(`
- Line 197: `api.assert.ok(`
- Line 216: `api.assert.ok(`

**transforms/scale.test.ts**

- Line 54: `api.assert.ok(`
- Line 129: `api.assert.ok(`

**transforms/translate.test.ts**

- Line 26: `api.assert.ok(`
- Line 30: `api.assert.ok(`
- Line 51: `api.assert.ok(`
- Line 72: `api.assert.ok(`

**zag/select.test.ts**

- Line 26: `api.assert.ok(selected === null || selected === '', 'No option should be selecte`
- Line 46: `api.assert.ok(`

**zag/sidenav.test.ts**

- Line 39: `api.assert.ok(`
- Line 64: `api.assert.ok(`
- Line 89: `api.assert.ok(`
- Line 109: `api.assert.ok(`
- Line 217: `api.assert.ok(`
- ... and 1 more

**zag/slider.test.ts**

- Line 15: `api.assert.ok(value === 50 || value === '50', `Slider value should be 50, got ${`
- Line 21: `api.assert.ok(value === 25 || value === '25', `Slider value should be 25, got ${`
- Line 30: `api.assert.ok(value === 50 || value === '50', `Slider value should be 50, got ${`
- Line 37: `api.assert.ok(value === 30 || value === '30', `Slider value should be 30, got ${`

**zag/tabs.test.ts**

- Line 28: `api.assert.ok(`
- Line 42: `api.assert.ok(`
- Line 51: `api.assert.ok(`

### 🔴 always-true (16)

> Always-true assertion - provides no validation

**draft-lines/index.ts**

- Line 166: `api.assert.ok(true, 'Draft line decoration applied')`

**interactions/wrap-layout.test.ts**

- Line 458: `api.assert.ok(true, 'Single selection does not trigger wrap')`

**sync-tests.ts**

- Line 634: `api.assert.ok(true, 'Should handle deleted selection gracefully')`

**test-system-tests.ts**

- Line 226: `api.assert.ok(true, 'Keys pressed without error (no input element)')`
- Line 235: `api.assert.ok(true, 'Keys pressed without error')`
- Line 245: `api.assert.ok(true, 'Key sequence completed')`
- Line 258: `api.assert.ok(true, 'Keys with modifiers pressed')`
- Line 278: `api.assert.ok(true, 'Text typed (no input element)')`
- ... and 4 more

**workflow/dashboard-e2e.test.ts**

- Line 350: `api.assert.ok(true, 'H key pressed without error')`
- Line 352: `api.assert.ok(true, 'Skipping H key test - no StatCard found')`

**zag/sidenav.test.ts**

- Line 71: `api.assert.ok(true, 'SideNav timing issue - test skipped (known flaky)')`
- Line 272: `api.assert.ok(true, 'SideNav timing issue - test skipped (known flaky)')`

### 🟡 hardcoded-node-id (3898)

> Hardcoded node ID - fragile to layout changes

**action-tests.ts**

- Line 30: `api.assert.exists('node-1')`
- Line 31: `api.assert.exists('node-2') // Button`
- Line 34: `const target = api.preview.inspect('node-3')`
- Line 46: `api.assert.exists('node-1')`
- Line 47: `api.assert.exists('node-2') // Button`
- ... and 69 more

**animations/presets.test.ts**

- Line 40: `api.assert.exists('node-1')`
- Line 42: `const element = await api.utils.waitForElement('node-1')`
- Line 64: `api.assert.exists('node-1')`
- Line 65: `api.assert.exists('node-2')`
- Line 67: `const element = await api.utils.waitForElement('node-2')`
- ... and 57 more

**animations/state-animations.test.ts**

- Line 48: `api.assert.exists('node-1')`
- Line 51: `api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(51, 51, 51)')`
- Line 54: `await api.interact.click('node-1')`
- Line 58: `api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(239, 68, 68)')`
- Line 61: `const element = await api.utils.waitForElement('node-1')`
- ... and 61 more

**bidirectional-tests.ts**

- Line 19: `api.assert.exists('node-1')`
- Line 20: `api.assert.hasText('node-1', 'Hello World')`
- Line 24: `api.assert.hasText('node-1', 'Original')`
- Line 30: `api.assert.hasText('node-1', 'Updated')`
- Line 37: `api.assert.exists('node-1')`
- ... and 46 more

**chart-tests.ts**

- Line 65: `api.assert.exists('node-1')`
- Line 69: `const info = api.preview.inspect('node-1')`
- Line 83: `api.assert.exists('node-1')`
- Line 98: `api.assert.exists('node-1')`
- Line 112: `api.assert.exists('node-1')`
- ... and 13 more

**compiler-tests.ts**

- Line 25: `api.assert.exists('node-1')`
- Line 26: `const info = api.preview.inspect('node-1')`
- Line 28: `api.assert.hasStyle('node-1', 'display', 'flex')`
- Line 29: `api.assert.hasStyle('node-1', 'flexDirection', 'column')`
- Line 34: `api.assert.exists('node-1')`
- ... and 61 more

**compiler-verification/index.ts**

- Line 69: `const el = api.preview.inspect('node-1')`
- Line 103: `const el = api.preview.inspect('node-1')`
- Line 125: `const el = api.preview.inspect('node-1')`
- Line 161: `const el = api.preview.inspect('node-1')`
- Line 176: `const el = api.preview.inspect('node-1')`
- ... and 257 more

**compiler-verification/prelude.test.ts**

- Line 25: `api.assert.exists('node-1')`
- Line 27: `api.assert.hasStyle('node-1', 'padding', '0px')`
- Line 35: `api.assert.exists('node-1')`
- Line 37: `const info = api.preview.inspect('node-1')`
- Line 39: `api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(26, 26, 26)')`
- ... and 36 more

**component-tests.ts**

- Line 29: `api.assert.exists('node-1')`
- Line 30: `api.dom.expect('node-1', { tag: 'button' })`
- Line 33: `const el = document.querySelector('[data-mirror-id="node-1"]') as HTMLElement`
- Line 49: `api.assert.exists('node-1')`
- Line 50: `api.dom.expect('node-1', { textContains: 'Username' })`
- ... and 80 more

**data-binding-tests.ts**

- Line 30: `api.assert.exists('node-1')`
- Line 31: `api.dom.expect('node-2', { textContains: 'Hello Max' })`
- Line 32: `api.dom.expect('node-3', { textContains: 'Count: 42' })`
- Line 48: `api.assert.exists('node-1')`
- Line 51: `const nameEl = api.preview.inspect('node-2')`
- ... and 32 more

**drag/alignment-from-empty.test.ts**

- Line 120: `const element = document.querySelector('[data-mirror-id="node-1"]')`
- Line 124: `await api.interact.dragToAlignmentZone('Frame', 'node-1', 'center')`
- Line 154: `await api.interact.dragToAlignmentZone('Frame', 'node-1', 'top-left')`
- Line 178: `await api.interact.dragToAlignmentZone('Frame', 'node-1', 'bottom-right')`
- Line 205: `await api.interact.dragToAlignmentZone('Button', 'node-1', 'top-center')`
- ... and 7 more

**drag/alignment-from-move.test.ts**

- Line 111: `const parent = document.querySelector('[data-mirror-id="node-1"]')`
- Line 115: `const child = document.querySelector('[data-mirror-id="node-2"]')`
- Line 134: `.moveElement('node-2')`
- Line 135: `.toContainer('node-1')`
- Line 188: `await api.interact.moveElementToAlignmentZone('node-2', 'node-1', 'top-left')`
- ... and 25 more

**drag/alignment-zone-tests.ts**

- Line 36: `await api.interact.dragToAlignmentZone('Button', 'node-1', 'center')`
- Line 45: `await api.interact.dragToAlignmentZone('Text', 'node-1', 'top-left')`
- Line 54: `await api.interact.dragToAlignmentZone('Icon', 'node-1', 'bottom-right')`
- Line 63: `await api.interact.dragToAlignmentZone('Button', 'node-1', 'top-center')`
- Line 72: `await api.interact.dragToAlignmentZone('Text', 'node-1', 'center-left')`
- ... and 10 more

**drag/comprehensive-drag-tests.ts**

- Line 40: `await api.interact.dragFromPalette('Button', 'node-1', 0)`
- Line 46: `await api.interact.dragFromPalette('Text', 'node-1', 0)`
- Line 52: `await api.interact.dragFromPalette('Input', 'node-1', 0)`
- Line 58: `await api.interact.dragFromPalette('Icon', 'node-1', 0)`
- Line 64: `await api.interact.dragFromPalette('Image', 'node-1', 0)`
- ... and 49 more

**event-tests.ts**

- Line 29: `api.assert.exists('node-1') // Button`
- Line 30: `api.assert.exists('node-2') // Text`
- Line 32: `api.dom.expect('node-1', { tag: 'button', text: 'Click' })`
- Line 43: `api.assert.exists('node-1') // Frame`
- Line 44: `api.assert.exists('node-2') // Button`
- ... and 53 more

**flex-reorder-tests.ts**

- Line 64: `await api.interact.moveElement('node-4', 'node-1', 0)`
- Line 64: `await api.interact.moveElement('node-4', 'node-1', 0)`
- Line 81: `await api.interact.moveElement('node-4', 'node-1', 1)`
- Line 81: `await api.interact.moveElement('node-4', 'node-1', 1)`
- Line 102: `await api.interact.moveElement('node-2', 'node-1', 2)`
- ... and 63 more

**gradients/linear.test.ts**

- Line 18: `api.assert.exists('node-1')`
- Line 20: `const element = await api.utils.waitForElement('node-1')`
- Line 42: `api.assert.exists('node-1')`
- Line 44: `const element = await api.utils.waitForElement('node-1')`
- Line 64: `api.assert.exists('node-1')`
- ... and 36 more

**integration/index.ts**

- Line 34: `api.assert.exists('node-1')`
- Line 35: `api.dom.expect('node-1', { tag: 'button', text: 'Save' })`
- Line 38: `api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(34, 113, 193)')`
- Line 39: `api.assert.hasStyle('node-1', 'color', 'rgb(255, 255, 255)')`
- Line 42: `api.assert.hasStyle('node-1', 'paddingTop', '12px')`
- ... and 459 more

**interaction-tests.ts**

- Line 21: `api.assert.exists('node-1')`
- Line 22: `const info = api.preview.inspect('node-1')`
- Line 26: `await api.interact.click('node-1')`
- Line 34: `api.assert.exists('node-1')`
- Line 35: `api.assert.hasStyle('node-1', 'cursor', 'pointer')`
- ... and 60 more

**interactions/editor-multiselect.test.ts**

- Line 41: `api.assert.ok(multiSelection.includes('node-2'), 'Should include node-2 (Button `
- Line 42: `api.assert.ok(multiSelection.includes('node-3'), 'Should include node-3 (Button `
- Line 208: `api.assert.ok(selection === 'node-2', `Should select parent Frame (node-2), got `
- Line 282: `selection === 'node-2',`

**interactions/gap-handlers.test.ts**

- Line 30: `await api.studio.setSelection('node-1')`
- Line 57: `await api.studio.setSelection('node-1')`
- Line 87: `await api.studio.setSelection('node-1')`
- Line 107: `await api.studio.setSelection('node-2')`
- Line 128: `await api.interact.click('node-1')`
- ... and 33 more

**interactions/layout-shortcuts.test.ts**

- Line 24: `await api.interact.click('node-1')`
- Line 42: `await api.interact.click('node-1')`
- Line 67: `await api.interact.click('node-1')`
- Line 86: `await api.interact.click('node-1')`
- Line 111: `await api.interact.click('node-2')`
- ... and 5 more

**interactions/margin-handlers.test.ts**

- Line 32: `await api.studio.setSelection('node-1')`
- Line 55: `await api.studio.setSelection('node-1')`
- Line 84: `await api.studio.setSelection('node-1')`
- Line 106: `await api.studio.setSelection('node-1')`
- Line 129: `await api.studio.setSelection('node-1')`
- ... and 15 more

**interactions/margin.test.ts**

- Line 26: `await api.interact.enterMarginMode('node-1')`
- Line 57: `await api.interact.enterMarginMode('node-1')`
- Line 88: `await api.interact.enterMarginMode('node-1')`
- Line 113: `await api.interact.enterMarginMode('node-1')`
- Line 141: `await api.interact.enterMarginMode('node-1')`
- ... and 18 more

**interactions/multiselect.test.ts**

- Line 28: `await api.interact.click('node-2')`
- Line 32: `await api.interact.shiftClick('node-3')`
- Line 41: `api.assert.ok(multiSelection.includes('node-2'), 'Should include first button')`
- Line 42: `api.assert.ok(multiSelection.includes('node-3'), 'Should include second button')`
- Line 53: `await api.interact.click('node-2')`
- ... and 23 more

**interactions/padding-handlers.test.ts**

- Line 24: `await api.studio.setSelection('node-1')`
- Line 49: `await api.studio.setSelection('node-1')`
- Line 81: `await api.studio.setSelection('node-1')`
- Line 126: `await api.studio.setSelection('node-1')`
- Line 168: `await api.interact.click('node-1')`
- ... and 14 more

**interactions/padding.test.ts**

- Line 26: `await api.interact.enterPaddingMode('node-1')`
- Line 57: `await api.interact.enterPaddingMode('node-1')`
- Line 88: `await api.interact.enterPaddingMode('node-1')`
- Line 113: `await api.interact.enterPaddingMode('node-1')`
- Line 141: `await api.interact.enterPaddingMode('node-1')`
- ... and 15 more

**interactions/resize-handle-dblclick.test.ts**

- Line 29: `await api.interact.doubleClickResizeHandle('node-2', 'e')`
- Line 48: `await api.interact.doubleClickResizeHandle('node-2', 'w')`
- Line 76: `await api.interact.doubleClickResizeHandle('node-2', 'n')`
- Line 95: `await api.interact.doubleClickResizeHandle('node-2', 's')`
- Line 123: `await api.interact.doubleClickResizeHandle('node-2', 'ne')`
- ... and 3 more

**interactions/resize-handle-drag.test.ts**

- Line 61: `const result = await api.interact.dragResizeHandle('node-2', 'e', 60, 0)`
- Line 79: `const result = await api.interact.dragResizeHandle('node-2', 'e', -50, 0)`
- Line 97: `const result = await api.interact.dragResizeHandle('node-2', 'w', -50, 0)`
- Line 112: `const result = await api.interact.dragResizeHandle('node-2', 'w', 50, 0)`
- Line 129: `const result = await api.interact.dragResizeHandle('node-2', 's', 0, 50)`
- ... and 47 more

**interactions/spread-toggle.test.ts**

- Line 27: `await api.studio.setSelection('node-1')`
- Line 46: `await api.studio.setSelection('node-1')`
- Line 65: `await api.studio.setSelection('node-1')`
- Line 97: `await api.studio.setSelection('node-1')`
- Line 113: `await api.studio.setSelection('node-1')`
- ... and 10 more

**interactions/ungroup.test.ts**

- Line 28: `await api.studio.setSelection('node-2')`
- Line 53: `await api.studio.setSelection('node-2')`
- Line 74: `await api.studio.setSelection('node-2')`
- Line 102: `await api.studio.setSelection('node-2')`
- Line 123: `await api.studio.setSelection('node-1')`
- ... and 29 more

**interactions/wrap-layout.test.ts**

- Line 24: `await api.studio.setSelection('node-1')`
- Line 42: `await api.interact.click('node-2')`
- Line 44: `await api.interact.shiftClick('node-3')`
- Line 63: `await api.interact.click('node-2')`
- Line 65: `await api.interact.shiftClick('node-3')`
- ... and 36 more

**layout/alignment.test.ts**

- Line 15: `api.assert.exists('node-1')`
- Line 16: `api.assert.hasStyle('node-1', 'justifyContent', 'center')`
- Line 17: `api.assert.hasStyle('node-1', 'alignItems', 'center')`
- Line 25: `api.assert.exists('node-1')`
- Line 26: `api.assert.hasStyle('node-1', 'justifyContent', 'flex-start')`
- ... and 26 more

**layout/direction.test.ts**

- Line 15: `api.assert.exists('node-1')`
- Line 16: `api.assert.hasStyle('node-1', 'flexDirection', 'column')`
- Line 24: `api.assert.exists('node-1')`
- Line 25: `api.assert.hasStyle('node-1', 'flexDirection', 'row')`
- Line 33: `api.assert.exists('node-1')`
- ... and 5 more

**layout/gap.test.ts**

- Line 15: `api.assert.exists('node-1')`
- Line 16: `api.assert.hasStyle('node-1', 'gap', '16px')`
- Line 21: `api.assert.exists('node-1')`
- Line 22: `api.assert.hasStyle('node-1', 'gap', '8px')`
- Line 29: `api.assert.exists('node-1')`
- ... and 9 more

**layout/grid.test.ts**

- Line 15: `api.assert.exists('node-1')`
- Line 16: `api.assert.hasStyle('node-1', 'display', 'grid')`
- Line 24: `api.assert.exists('node-1')`
- Line 25: `api.assert.hasStyle('node-1', 'display', 'grid')`
- Line 26: `api.assert.hasStyle('node-1', 'gap', '8px')`

**layout/nesting.test.ts**

- Line 15: `api.assert.exists('node-1')`
- Line 16: `api.assert.exists('node-2')`
- Line 17: `api.assert.exists('node-3')`
- Line 18: `api.assert.hasChildren('node-1', 1)`
- Line 19: `api.assert.hasChildren('node-2', 1)`
- ... and 17 more

**layout/stacked.test.ts**

- Line 15: `api.assert.exists('node-1')`
- Line 23: `api.assert.exists('node-1')`
- Line 24: `api.assert.hasChildren('node-1', 2)`

**layout-verification-tests.ts**

- Line 47: `const info = getLayoutInfo('node-1')`
- Line 58: `const info = getLayoutInfo('node-1')`
- Line 69: `const outerInfo = getLayoutInfo('node-1')`
- Line 70: `const innerInfo1 = getLayoutInfo('node-2')`
- Line 71: `const innerInfo2 = getLayoutInfo('node-5')`
- ... and 25 more

**playmode/index.ts**

- Line 253: `api.assert.exists('node-1')`
- Line 254: `api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(51, 51, 51)')`
- Line 257: `await api.interact.click('node-1')`
- Line 259: `api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(34, 113, 193)')`
- Line 271: `api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(51, 51, 51)')`
- ... and 15 more

**primitives/basic.test.ts**

- Line 13: `api.assert.exists('node-1')`
- Line 14: `const info = api.preview.inspect('node-1')`
- Line 16: `api.assert.hasStyle('node-1', 'display', 'flex')`
- Line 17: `api.assert.hasStyle('node-1', 'flexDirection', 'column')`
- Line 21: `api.assert.exists('node-1')`
- ... and 35 more

**primitives/defaults.test.ts**

- Line 51: `api.assert.exists('node-1')`
- Line 52: `const element = document.querySelector('[data-mirror-id="node-1"]') as HTMLEleme`
- Line 69: `api.assert.exists('node-1')`
- Line 70: `const element = document.querySelector('[data-mirror-id="node-1"]') as HTMLEleme`
- Line 84: `api.assert.exists('node-1')`
- ... and 31 more

**primitives/headings.test.ts**

- Line 12: `api.assert.exists('node-1')`
- Line 13: `const info = api.preview.inspect('node-1')`
- Line 15: `api.assert.hasText('node-1', 'Title')`
- Line 19: `api.assert.exists('node-1')`
- Line 20: `const info = api.preview.inspect('node-1')`
- ... and 8 more

**primitives/semantic.test.ts**

- Line 12: `api.assert.exists('node-1')`
- Line 13: `const info = api.preview.inspect('node-1')`
- Line 18: `api.assert.exists('node-1')`
- Line 19: `const info = api.preview.inspect('node-1')`
- Line 24: `api.assert.exists('node-1')`
- ... and 9 more

**project/index.ts**

- Line 756: `api.assert.exists('node-1')`
- Line 759: `const frame = api.preview.inspect('node-1')`
- Line 785: `const btn = api.preview.inspect('node-1')`
- Line 816: `api.assert.exists('node-1') // Card`
- Line 817: `api.assert.exists('node-2') // CardTitle`
- ... and 8 more

**property-panel/color-picker.test.ts**

- Line 141: `api.assert.exists('node-2', 'Button should exist')`
- Line 144: `await api.studio.setSelection('node-2')`
- Line 181: `await api.studio.setSelection('node-2')`
- Line 208: `await api.studio.setSelection('node-2')`
- Line 231: `await api.studio.setSelection('node-2')`
- ... and 1 more

**property-panel/comprehensive.test.ts**

- Line 40: `await api.studio.setSelection('node-1')`
- Line 45: `const initialWidth = getComputedStyleValue('node-1', 'width')`
- Line 61: `const newWidth = getComputedStyleValue('node-1', 'width')`
- Line 71: `await api.studio.setSelection('node-1')`
- Line 76: `const initialHeight = getComputedStyleValue('node-1', 'height')`
- ... and 62 more

**property-panel/icon-picker.test.ts**

- Line 39: `return iconElement.getAttribute('data-node-id') || 'node-3'`
- Line 42: `return 'node-3'`

**property-panel-tests.ts**

- Line 68: `await api.studio.setSelection('node-1')`
- Line 77: `selectedId === 'node-1',`
- Line 99: `await api.studio.setSelection('node-1')`
- Line 131: `await api.studio.setSelection('node-1')`
- Line 151: `await api.studio.setSelection('node-1')`
- ... and 33 more

**property-robustness-tests.ts**

- Line 28: `await api.interact.click('node-1')`
- Line 53: `await api.interact.click('node-1')`
- Line 80: `await api.interact.click('node-1')`
- Line 94: `await api.interact.click('node-1')`
- Line 110: `await api.interact.click('node-1')`
- ... and 28 more

**responsive-tests.ts**

- Line 27: `api.assert.exists('node-1') // Frame`
- Line 29: `const frame = document.querySelector('[data-mirror-id="node-1"]')`
- Line 41: `api.assert.exists('node-1') // Frame`
- Line 52: `api.assert.exists('node-1') // Frame`
- Line 69: `api.assert.exists('node-1') // Frame`
- ... and 24 more

**stacked-drag-tests.ts**

- Line 43: `await api.interact.dragToPosition('Button', 'node-1', 100, 50)`
- Line 61: `await api.interact.dragToPosition('Icon', 'node-1', 200, 150)`
- Line 76: `await api.interact.dragToPosition('Text', 'node-1', 20, 20)`
- Line 94: `await api.interact.dragToPosition('Input', 'node-1', 200, 150)`
- Line 114: `await api.interact.dragToPosition('Button', 'node-1', 5, 5)`
- ... and 100 more

**states/cross-element.test.ts**

- Line 25: `api.assert.exists('node-1') // Container`
- Line 26: `api.assert.exists('node-2') // Button`
- Line 27: `api.assert.exists('node-3') // Menu`
- Line 30: `api.assert.hasStyle('node-3', 'display', 'none')`
- Line 33: `await api.interact.click('node-2')`
- ... and 62 more

**states/exclusive.test.ts**

- Line 28: `api.assert.exists('node-1') // Container`
- Line 29: `api.assert.exists('node-2') // Home`
- Line 30: `api.assert.exists('node-3') // Profile`
- Line 31: `api.assert.exists('node-4') // Settings`
- Line 34: `api.assert.hasStyle('node-2', 'color', 'rgb(136, 136, 136)')`
- ... and 56 more

**states/hover.test.ts**

- Line 18: `api.assert.exists('node-1')`
- Line 21: `api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(51, 51, 51)')`
- Line 22: `api.assert.hasStyle('node-1', 'color', 'rgb(255, 255, 255)')`
- Line 23: `api.assert.hasStyle('node-1', 'paddingTop', '12px')`
- Line 24: `api.assert.hasStyle('node-1', 'paddingLeft', '24px')`
- ... and 82 more

**states/toggle.test.ts**

- Line 18: `api.assert.exists('node-1')`
- Line 21: `const info = api.preview.inspect('node-1')`
- Line 26: `api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(51, 51, 51)')`
- Line 27: `api.assert.hasStyle('node-1', 'color', 'rgb(255, 255, 255)')`
- Line 28: `api.assert.hasStyle('node-1', 'paddingTop', '12px')`
- ... and 72 more

**stress/code-modifier.test.ts**

- Line 19: `await api.studio.setSelection('node-1')`
- Line 43: `await api.studio.setSelection('node-1')`
- Line 63: `await api.studio.setSelection('node-1')`
- Line 95: `await api.studio.setSelection('node-5')`
- Line 126: `api.assert.exists('node-4')`
- ... and 28 more

**stress/index.ts**

- Line 25: `const el = api.preview.inspect('node-1')`
- Line 34: `const el = api.preview.inspect('node-1')`
- Line 43: `const el = api.preview.inspect('node-1')`
- Line 52: `const el = api.preview.inspect('node-1')`
- Line 61: `const el = api.preview.inspect('node-1')`
- ... and 59 more

**stress/interaction-stress.test.ts**

- Line 26: `await api.interact.click('node-1')`
- Line 30: `await api.interact.click('node-1')`
- Line 31: `await api.interact.click('node-1')`
- Line 35: `const styles = api.preview.inspect('node-1')?.styles`
- Line 51: `await api.interact.click('node-1')`
- ... and 40 more

**stress/race-conditions.test.ts**

- Line 40: `api.assert.hasText('node-2', 'Second')`
- Line 51: `await api.studio.setSelection('node-2')`
- Line 67: `selection === 'node-2' || selection === 'node-1',`
- Line 67: `selection === 'node-2' || selection === 'node-1',`
- Line 78: `await api.studio.setSelection('node-1')`
- ... and 19 more

**stress/sourcemap-stress.test.ts**

- Line 53: `await api.studio.setSelection('node-2')`
- Line 65: `api.assert.ok(selection === 'node-2', `Selection should survive, got ${selection`
- Line 89: `api.assert.hasText('node-2', 'First')`
- Line 90: `api.assert.hasText('node-3', 'Second')`
- Line 91: `api.assert.hasText('node-4', 'Third')`
- ... and 19 more

**styling/borders.test.ts**

- Line 12: `api.assert.exists('node-1')`
- Line 13: `api.assert.hasStyle('node-1', 'borderWidth', '1px')`
- Line 17: `api.assert.exists('node-1')`
- Line 18: `api.assert.hasStyle('node-1', 'borderWidth', '2px')`
- Line 19: `api.assert.hasStyle('node-1', 'borderColor', 'rgb(34, 113, 193)')`
- ... and 6 more

**styling/colors.test.ts**

- Line 13: `api.assert.exists('node-1')`
- Line 14: `api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(34, 113, 193)')`
- Line 18: `api.assert.exists('node-1')`
- Line 19: `api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(255, 0, 0)')`
- Line 23: `api.assert.exists('node-1')`
- ... and 12 more

**styling/effects.test.ts**

- Line 12: `api.assert.exists('node-1')`
- Line 13: `api.assert.hasStyle('node-1', 'opacity', '0.5')`
- Line 17: `api.assert.exists('node-1')`
- Line 21: `api.assert.exists('node-1')`
- Line 25: `api.assert.exists('node-1')`
- ... and 29 more

**styling/sizing.test.ts**

- Line 12: `api.assert.exists('node-1')`
- Line 13: `api.assert.hasStyle('node-1', 'width', '200px')`
- Line 17: `api.assert.exists('node-1')`
- Line 18: `api.assert.hasStyle('node-1', 'height', '100px')`
- Line 22: `api.assert.exists('node-1')`
- ... and 10 more

**styling/spacing.test.ts**

- Line 13: `api.assert.exists('node-1')`
- Line 14: `api.assert.hasStyle('node-1', 'padding', '16px')`
- Line 18: `api.assert.exists('node-1')`
- Line 19: `api.assert.hasStyle('node-1', 'paddingTop', '8px')`
- Line 20: `api.assert.hasStyle('node-1', 'paddingRight', '16px')`
- ... and 31 more

**styling/typography.test.ts**

- Line 12: `api.assert.exists('node-1')`
- Line 13: `api.assert.hasStyle('node-1', 'fontSize', '24px')`
- Line 17: `api.assert.exists('node-1')`
- Line 18: `api.assert.hasStyle('node-1', 'fontWeight', '700')`
- Line 22: `api.assert.exists('node-1')`
- ... and 22 more

**sync-tests.ts**

- Line 29: `api.assert.exists('node-1')`
- Line 30: `api.dom.expect('node-2', { textContains: 'Original' })`
- Line 38: `api.dom.expect('node-2', { textContains: 'Updated' })`
- Line 47: `api.assert.exists('node-1')`
- Line 48: `api.assert.exists('node-2')`
- ... and 59 more

**table-tests.ts**

- Line 29: `api.assert.exists('node-1') // Table`
- Line 31: `const table = document.querySelector('[data-mirror-id="node-1"]')`
- Line 46: `api.assert.exists('node-1') // Table`
- Line 48: `const table = document.querySelector('[data-mirror-id="node-1"]')`
- Line 63: `api.assert.exists('node-1') // Table`
- ... and 22 more

**transforms/rotate.test.ts**

- Line 15: `api.assert.exists('node-1')`
- Line 17: `const element = await api.utils.waitForElement('node-1')`
- Line 38: `api.assert.exists('node-1')`
- Line 40: `const element = await api.utils.waitForElement('node-1')`
- Line 51: `api.assert.exists('node-1')`
- ... and 28 more

**transforms/scale.test.ts**

- Line 15: `api.assert.exists('node-1')`
- Line 17: `const element = await api.utils.waitForElement('node-1')`
- Line 35: `api.assert.exists('node-1')`
- Line 37: `const element = await api.utils.waitForElement('node-1')`
- Line 48: `api.assert.exists('node-1')`
- ... and 38 more

**transforms/translate.test.ts**

- Line 16: `api.assert.exists('node-1')`
- Line 17: `api.assert.exists('node-2')`
- Line 20: `api.assert.hasStyle('node-2', 'position', 'absolute')`
- Line 22: `const child = await api.utils.waitForElement('node-2')`
- Line 42: `api.assert.exists('node-1')`
- ... and 52 more

**ui-builder-tests.ts**

- Line 115: `await api.interact.dragFromPalette('Button', 'node-1', 0)`
- Line 140: `await api.interact.dragFromPalette('Text', 'node-1', 0)`
- Line 157: `await api.interact.dragFromPalette('Icon', 'node-1', 0)`
- Line 183: `await api.interact.click('node-2')`
- Line 198: `const button = findElementInPreview('node-2')`
- ... and 381 more

**undo-redo-tests.ts**

- Line 25: `api.assert.hasText('node-1', 'Original')`
- Line 30: `api.assert.hasText('node-1', 'Changed')`
- Line 198: `api.assert.hasChildren('node-1', 1)`
- Line 202: `api.assert.hasChildren('node-1', 2)`
- Line 206: `api.assert.hasChildren('node-1', 1)`
- ... and 9 more

**workflow/dashboard-e2e.test.ts**

- Line 214: `api.assert.exists('node-1', 'AppShell should be rendered')`
- Line 215: `api.assert.exists('node-2', 'Frame hor should be rendered')`
- Line 216: `api.assert.exists('node-3', 'Sidebar should be rendered')`
- Line 219: `const appShellBgOk = verifyBackgroundColor('node-1', '#0f0f0f')`
- Line 223: `const sidebarBgOk = verifyBackgroundColor('node-3', '#1a1a1a')`
- ... and 6 more

**workflow-tests.ts**

- Line 8: `*   api.dom.expect('node-1', {`
- Line 35: `api.dom.expect('node-1', {`
- Line 43: `api.dom.expect('node-2', {`
- Line 61: `api.dom.expect('node-1', {`
- Line 71: `api.dom.expect('node-2', { tag: 'button', text: 'A' })`
- ... and 82 more

**zag/checkbox.test.ts**

- Line 10: `api.assert.exists('node-1')`
- Line 11: `const info = api.preview.inspect('node-1')`
- Line 13: `api.assert.ok(!api.zag.isChecked('node-1'), 'Checkbox should be unchecked by def`
- Line 20: `api.assert.exists('node-1')`
- Line 21: `api.assert.ok(api.zag.isChecked('node-1'), 'Checkbox should be checked initially`
- ... and 9 more

**zag/date-picker.test.ts**

- Line 13: `api.assert.exists('node-1')`
- Line 14: `const info = api.preview.inspect('node-1')`
- Line 23: `api.assert.exists('node-1')`

**zag/dialog.test.ts**

- Line 13: `api.assert.exists('node-1')`
- Line 14: `api.assert.ok(!api.zag.isOpen('node-1'), 'Dialog should be closed by default')`
- Line 22: `api.assert.exists('node-1')`
- Line 23: `api.assert.ok(!api.zag.isOpen('node-1'), 'Dialog should start closed')`
- Line 25: `await api.zag.open('node-1')`
- ... and 5 more

**zag/drag-and-style.test.ts**

- Line 44: `await dragTest.fromPalette('Tabs').toContainer('node-1').atIndex(0).execute()`
- Line 66: `const allTabs = api.zag.getAllTabs('node-2')`
- Line 83: `await dragTest.fromPalette('Select').toContainer('node-1').atIndex(0).execute()`
- Line 125: `await dragTest.fromPalette('Checkbox').toContainer('node-1').atIndex(0).execute(`
- Line 140: `await dragTest.fromPalette('Checkbox').toContainer('node-1').atIndex(0).execute(`
- ... and 8 more

**zag/layout.test.ts**

- Line 15: `api.assert.exists('node-1')`
- Line 16: `api.assert.hasChildren('node-1', 3)`
- Line 24: `api.assert.exists('node-1')`
- Line 32: `api.assert.exists('node-1')`

**zag/radio-group.test.ts**

- Line 13: `api.assert.exists('node-1')`
- Line 14: `const info = api.preview.inspect('node-1')`
- Line 17: `const selected = api.zag.getSelectedRadio('node-1')`
- Line 26: `api.assert.exists('node-1')`
- Line 27: `const selected = api.zag.getSelectedRadio('node-1')`
- ... and 4 more

**zag/resize-handles.test.ts**

- Line 141: `await api.interact.click('node-1')`
- Line 145: `const selectElement = document.querySelector('[data-mirror-id="node-1"]') as HTM`
- Line 182: `await api.interact.click('node-1')`
- Line 186: `const container = document.querySelector('[data-mirror-id="node-1"]') as HTMLEle`
- Line 216: `await api.interact.click('node-1')`
- ... and 7 more

**zag/select.test.ts**

- Line 13: `api.assert.exists('node-1')`
- Line 14: `const info = api.preview.inspect('node-1')`
- Line 16: `api.assert.ok(!api.zag.isOpen('node-1'), 'Select should be closed by default')`
- Line 24: `api.assert.exists('node-1')`
- Line 25: `const selected = api.zag.getSelectedOption('node-1')`
- ... and 8 more

**zag/sidenav.test.ts**

- Line 25: `api.assert.exists('node-1')`
- Line 26: `const info = api.preview.inspect('node-1')`
- Line 30: `const el = document.querySelector('[data-mirror-id="node-1"]')`
- Line 53: `const el = await api.utils.waitForElement('node-1', 3000)`
- Line 84: `api.assert.exists('node-1')`
- ... and 18 more

**zag/slider.test.ts**

- Line 10: `api.assert.exists('node-1')`
- Line 11: `const info = api.preview.inspect('node-1')`
- Line 14: `const value = api.zag.getValue('node-1')`
- Line 19: `api.assert.exists('node-1')`
- Line 20: `const value = api.zag.getValue('node-1')`
- ... and 4 more

**zag/switch.test.ts**

- Line 10: `api.assert.exists('node-1')`
- Line 11: `const info = api.preview.inspect('node-1')`
- Line 13: `api.assert.ok(!api.zag.isChecked('node-1'), 'Switch should be unchecked by defau`
- Line 20: `api.assert.exists('node-1')`
- Line 21: `api.assert.ok(api.zag.isChecked('node-1'), 'Switch should be checked initially')`
- ... and 8 more

**zag/tabs.test.ts**

- Line 13: `api.assert.exists('node-1')`
- Line 14: `const info = api.preview.inspect('node-1')`
- Line 17: `const tabs = api.zag.getAllTabs('node-1')`
- Line 26: `api.assert.exists('node-1')`
- Line 27: `const activeTab = api.zag.getActiveTab('node-1')`
- ... and 4 more

**zag/tooltip.test.ts**

- Line 13: `api.assert.exists('node-1')`
- Line 14: `api.assert.ok(!api.zag.isOpen('node-1'), 'Tooltip should be closed by default')`
- Line 22: `api.assert.exists('node-1')`
- Line 23: `api.assert.ok(!api.zag.isOpen('node-1'), 'Tooltip should start closed')`
- Line 25: `await api.zag.open('node-1')`
- ... and 5 more

### 🟢 magic-delay (1139)

> Magic number in delay - should be documented

**animations/state-animations.test.ts**

- Line 55: `await api.utils.delay(300) // Wait for animation`
- Line 80: `await api.utils.delay(200)`
- Line 96: `await api.utils.delay(200)`
- Line 116: `await api.utils.delay(250)`
- Line 150: `await api.utils.delay(250) // Wait for transition`
- ... and 7 more

**bidirectional-tests.ts**

- Line 141: `await api.utils.delay(100)`

**compiler-verification/index.ts**

- Line 3215: `await api.utils.delay(200)`
- Line 3225: `await api.utils.delay(200)`
- Line 3248: `await api.utils.delay(150)`
- Line 3270: `await api.utils.delay(100)`
- Line 3294: `await api.utils.delay(200)`
- ... and 28 more

**draft-lines/comprehensive.test.ts**

- Line 264: `await ctx.delay(100)`
- Line 307: `await api.utils.delay(100)`
- Line 349: `await ctx.delay(100)`
- Line 464: `await api.utils.delay(100)`
- Line 491: `await api.utils.delay(100)`

**draft-lines/index.ts**

- Line 95: `await api.utils.delay(100)`
- Line 139: `await api.utils.delay(100)`
- Line 190: `await api.utils.delay(100)`
- Line 227: `await api.utils.delay(100)`
- Line 248: `await api.utils.delay(100)`
- ... and 1 more

**drag/alignment-from-move.test.ts**

- Line 162: `await api.utils.delay(300)`

**gradients/linear.test.ts**

- Line 326: `await api.utils.delay(150)`

**integration/index.ts**

- Line 242: `await api.utils.delay(200)`
- Line 282: `await api.utils.delay(200)`
- Line 293: `await api.utils.delay(200)`
- Line 341: `await api.utils.delay(200)`
- Line 355: `await api.utils.delay(200)`
- ... and 21 more

**interactions/editor-multiselect.test.ts**

- Line 31: `await api.utils.delay(100) // Wait for sync`
- Line 91: `await api.utils.delay(100)`
- Line 160: `await api.utils.delay(100)`
- Line 171: `await api.utils.delay(200)`
- Line 196: `await api.utils.delay(100)`
- ... and 3 more

**interactions/gap-handlers.test.ts**

- Line 31: `await api.utils.delay(200)`
- Line 35: `await api.utils.delay(200)`
- Line 54: `await api.utils.delay(100)`
- Line 58: `await api.utils.delay(300)`
- Line 62: `await api.utils.delay(200)`
- ... and 101 more

**interactions/layout-shortcuts.test.ts**

- Line 25: `await api.utils.delay(100)`
- Line 43: `await api.utils.delay(100)`
- Line 68: `await api.utils.delay(100)`
- Line 87: `await api.utils.delay(100)`
- Line 112: `await api.utils.delay(100)`
- ... and 8 more

**interactions/margin-handlers.test.ts**

- Line 29: `await api.utils.delay(100)`
- Line 33: `await api.utils.delay(200)`
- Line 37: `await api.utils.delay(200)`
- Line 52: `await api.utils.delay(100)`
- Line 56: `await api.utils.delay(200)`
- ... and 46 more

**interactions/margin.test.ts**

- Line 455: `await api.utils.delay(100)`
- Line 459: `await api.utils.delay(200)`
- Line 490: `await api.utils.delay(100)`

**interactions/multiselect.test.ts**

- Line 29: `await api.utils.delay(100)`
- Line 33: `await api.utils.delay(100)`
- Line 54: `await api.utils.delay(100)`
- Line 58: `await api.utils.delay(100)`
- Line 62: `await api.utils.delay(100)`
- ... and 13 more

**interactions/padding-handlers.test.ts**

- Line 25: `await api.utils.delay(200)`
- Line 29: `await api.utils.delay(200)`
- Line 46: `await api.utils.delay(100)`
- Line 50: `await api.utils.delay(300) // Extra delay for headless mode`
- Line 54: `await api.utils.delay(200)`
- ... and 42 more

**interactions/resize-handle-dblclick.test.ts**

- Line 26: `await api.utils.delay(100)`
- Line 45: `await api.utils.delay(100)`
- Line 73: `await api.utils.delay(100)`
- Line 92: `await api.utils.delay(100)`
- Line 120: `await api.utils.delay(100)`
- ... and 3 more

**interactions/resize-handle-drag.test.ts**

- Line 59: `await api.utils.delay(100)`
- Line 77: `await api.utils.delay(100)`
- Line 95: `await api.utils.delay(100)`
- Line 110: `await api.utils.delay(100)`
- Line 127: `await api.utils.delay(100)`
- ... and 43 more

**interactions/spread-toggle.test.ts**

- Line 28: `await api.utils.delay(100)`
- Line 47: `await api.utils.delay(100)`
- Line 66: `await api.utils.delay(100)`
- Line 98: `await api.utils.delay(100)`
- Line 114: `await api.utils.delay(100)`
- ... and 14 more

**interactions/token-extract.test.ts**

- Line 57: `await api.utils.delay(200)`

**interactions/ungroup.test.ts**

- Line 29: `await api.utils.delay(100)`
- Line 54: `await api.utils.delay(100)`
- Line 75: `await api.utils.delay(100)`
- Line 103: `await api.utils.delay(100)`
- Line 109: `await api.utils.delay(200)`
- ... and 36 more

**interactions/wrap-layout.test.ts**

- Line 25: `await api.utils.delay(100)`
- Line 43: `await api.utils.delay(100)`
- Line 45: `await api.utils.delay(100)`
- Line 64: `await api.utils.delay(100)`
- Line 66: `await api.utils.delay(100)`
- ... and 41 more

**playmode/index.ts**

- Line 70: `await api.utils.delay(100)`
- Line 151: `await api.utils.delay(100)`
- Line 258: `await api.utils.delay(150)`
- Line 266: `await api.utils.delay(300)`
- Line 268: `await api.utils.delay(200)`
- ... and 16 more

**project/index.ts**

- Line 631: `await api.utils.delay(300)`
- Line 647: `await api.utils.delay(100)`
- Line 753: `await api.utils.delay(200)`
- Line 782: `await api.utils.delay(200)`
- Line 804: `await api.utils.delay(200)`
- ... and 15 more

**property-panel/color-picker.test.ts**

- Line 48: `await api.utils.delay(300)`
- Line 61: `await api.utils.delay(300)`
- Line 108: `await api.utils.delay(400)`
- Line 128: `await api.utils.delay(400)`
- Line 145: `await api.utils.delay(200)`
- ... and 12 more

**property-panel/comprehensive.test.ts**

- Line 41: `await api.utils.delay(300)`
- Line 52: `await api.utils.delay(800)`
- Line 72: `await api.utils.delay(300)`
- Line 83: `await api.utils.delay(800)`
- Line 102: `await api.utils.delay(300)`
- ... and 49 more

**property-panel/icon-picker.test.ts**

- Line 32: `await api.utils.delay(300)`
- Line 100: `await api.utils.delay(200)`
- Line 111: `await api.utils.delay(400)`
- Line 129: `await api.utils.delay(500)`
- Line 159: `await api.utils.delay(200)`
- ... and 26 more

**property-panel-tests.ts**

- Line 279: `await api.utils.delay(200)`
- Line 290: `await api.utils.delay(800)`
- Line 363: `await api.utils.delay(200) // Wait for panel to update`
- Line 565: `await api.utils.delay(200) // Wait for panel to update`
- Line 576: `await api.utils.delay(800)`
- ... and 11 more

**property-robustness-tests.ts**

- Line 29: `await api.utils.delay(200)`
- Line 40: `await api.utils.delay(300)`
- Line 54: `await api.utils.delay(200)`
- Line 58: `await api.utils.delay(300)`
- Line 64: `await api.utils.delay(300)`
- ... and 52 more

**states/cross-element.test.ts**

- Line 34: `await api.utils.delay(150)`
- Line 44: `await api.utils.delay(150)`
- Line 86: `await api.utils.delay(150)`
- Line 95: `await api.utils.delay(150)`
- Line 125: `await api.utils.delay(150)`
- ... and 7 more

**states/exclusive.test.ts**

- Line 40: `await api.utils.delay(150)`
- Line 49: `await api.utils.delay(150)`
- Line 58: `await api.utils.delay(150)`
- Line 94: `await api.utils.delay(150)`
- Line 130: `await api.utils.delay(150)`
- ... and 8 more

**states/hover.test.ts**

- Line 29: `await api.utils.delay(100)`
- Line 36: `await api.utils.delay(100)`
- Line 63: `await api.utils.delay(100)`
- Line 74: `await api.utils.delay(100)`
- Line 100: `await api.utils.delay(100)`
- ... and 13 more

**states/toggle.test.ts**

- Line 59: `await api.utils.delay(200) // Wait for CSS transition (150ms) + buffer`
- Line 80: `await api.utils.delay(200)`
- Line 85: `await api.utils.delay(200)`
- Line 105: `await api.utils.delay(200)`
- Line 132: `await api.utils.delay(200)`
- ... and 9 more

**stress/code-modifier.test.ts**

- Line 20: `await api.utils.delay(100)`
- Line 30: `await api.utils.delay(300)`
- Line 44: `await api.utils.delay(100)`
- Line 50: `await api.utils.delay(200)`
- Line 64: `await api.utils.delay(100)`
- ... and 18 more

**stress/index.ts**

- Line 248: `await api.utils.delay(100)`
- Line 286: `await api.utils.delay(200) // Extra time for state to settle`
- Line 318: `await api.utils.delay(200)`
- Line 404: `await api.utils.delay(200)`
- Line 450: `await api.utils.delay(100)`
- ... and 2 more

**stress/interaction-stress.test.ts**

- Line 32: `await api.utils.delay(100)`
- Line 54: `await api.utils.delay(100)`
- Line 57: `await api.utils.delay(400)`
- Line 74: `await api.utils.delay(100)`
- Line 90: `await api.utils.delay(100)`
- ... and 8 more

**stress/race-conditions.test.ts**

- Line 35: `await api.utils.delay(500)`
- Line 62: `await api.utils.delay(300)`
- Line 79: `await api.utils.delay(100)`
- Line 88: `await api.utils.delay(200)`
- Line 111: `await api.utils.delay(200)`
- ... and 9 more

**stress/sourcemap-stress.test.ts**

- Line 36: `await api.utils.delay(100)`
- Line 61: `await api.utils.delay(100)`
- Line 82: `await api.utils.delay(100)`
- Line 108: `await api.utils.delay(100)`
- Line 148: `await api.utils.delay(100)`
- ... and 10 more

**sync-tests.ts**

- Line 35: `await api.utils.delay(100)`
- Line 54: `await api.utils.delay(100)`
- Line 74: `await api.utils.delay(100)`
- Line 92: `await api.utils.delay(100)`
- Line 120: `await api.utils.delay(100)`
- ... and 33 more

**test-system-tests.ts**

- Line 69: `await api.utils.delay(200)`
- Line 86: `await api.utils.delay(200)`
- Line 113: `await api.utils.delay(200)`
- Line 132: `await api.utils.delay(100)`
- Line 151: `await api.utils.delay(100)`
- ... and 6 more

**transforms/rotate.test.ts**

- Line 170: `await api.utils.delay(150)`

**transforms/scale.test.ts**

- Line 125: `await api.utils.delay(150)`
- Line 152: `await api.utils.delay(150)`
- Line 183: `await api.utils.delay(200)`

**ui-builder-tests.ts**

- Line 116: `await api.utils.delay(500)`
- Line 141: `await api.utils.delay(500)`
- Line 158: `await api.utils.delay(500)`
- Line 184: `await api.utils.delay(300)`
- Line 188: `await api.utils.delay(500)`
- ... and 193 more

**workflow/dashboard-e2e.test.ts**

- Line 177: `await api.utils.delay(300)`
- Line 192: `await api.utils.delay(300)`
- Line 208: `await api.utils.delay(400)`
- Line 265: `await api.utils.delay(200)`
- Line 283: `await api.utils.delay(200)`
- ... and 5 more

**zag/drag-and-style.test.ts**

- Line 41: `await api.utils.delay(100)`
- Line 45: `await api.utils.delay(500)`
- Line 62: `await api.utils.delay(200)`
- Line 80: `await api.utils.delay(200)`
- Line 84: `await api.utils.delay(300)`
- ... and 22 more

**zag/resize-handles.test.ts**

- Line 138: `await api.utils.delay(100)`
- Line 142: `await api.utils.delay(200)`
- Line 180: `await api.utils.delay(100)`
- Line 183: `await api.utils.delay(200)`
- Line 214: `await api.utils.delay(100)`
- ... and 7 more

### 🟢 length-zero-check (70)

> Generic length check - consider more specific assertion

**autocomplete-tests.ts**

- Line 26: `api.assert.ok(completions.length > 0, 'Should show completions')`
- Line 40: `api.assert.ok(completions.length > 0, 'Should show completions for nested elemen`
- Line 51: `api.assert.ok(allStartWithBu || completions.length === 0, 'Should filter by pref`
- Line 78: `api.assert.ok(completions.length > 0, 'Should show more properties after comma')`
- Line 221: `api.assert.ok(allArrow || completions.length === 0, 'Should filter icons by pref`

**compiler-tests.ts**

- Line 193: `api.assert.ok(leaf?.children.length === 0, 'node-3 should have no children')`

**compiler-verification/index.ts**

- Line 973: `api.assert.ok(frame?.children.length === 0, 'Empty frame should have no children`

**data-binding-tests.ts**

- Line 227: `container !== null && (container.children.length > 0 || container.fullText !== '`

**draft-lines/ai-workflow.test.ts**

- Line 42: `api.assert.ok(state.validatedLines.length === 0, 'State shows 0 validated lines'`
- Line 59: `api.assert.ok(state.draftLines.length === 0, 'No lines should be draft after val`
- Line 109: `api.assert.ok(state.draftLines.length === 0, 'Corrected code should not be draft`
- Line 142: `api.assert.ok(state.draftLines.length === 0, 'Cycle 2: No draft lines')`
- Line 212: `api.assert.ok(state.draftLines.length === 0, 'All AI-generated code should be va`

**draft-lines/draft-lines-api.ts**

- Line 186: `draftLines.length === 0,`

**drag/alignment-from-empty.test.ts**

- Line 52: `if (line.match(/^\s{2,}/) && line.trim().length > 0) {`

**drag/alignment-from-move.test.ts**

- Line 56: `if (line.match(/^\s{2,}/) && line.trim().length > 0) {`
- Line 82: `if (line.match(/^\s{2,}/) && line.trim().length > 0) {`
- Line 93: `return { ok: missing.length === 0, missing }`

**flex-reorder-tests.ts**

- Line 39: `if (notFound.length > 0) {`

**index.ts**

- Line 3056: `if (matches.length > 0) {`

**interactions/editor-multiselect.test.ts**

- Line 25: `multiSelection.length === 0,`
- Line 176: `multiSelection.length === 0,`
- Line 202: `multiSelection.length === 0,`
- Line 258: `multiSelection.length === 0,`

**interactions/gap-handlers.test.ts**

- Line 77: `api.assert.ok(gapHandles.length === 0, 'Gap handles should be hidden after secon`
- Line 96: `api.assert.ok(gapHandles.length === 0, 'Should have no gap handles with only 1 c`
- Line 116: `api.assert.ok(gapHandles.length === 0, 'Should have no gap handles on non-contai`
- Line 135: `api.assert.ok(gapAreas.length > 0, 'Gap area overlays should be visible')`
- Line 184: `paddingHandlesAfter.length === 0,`
- ... and 6 more

**interactions/margin-handlers.test.ts**

- Line 72: `api.assert.ok(marginHandles.length === 0, 'Margin handles should be hidden after`
- Line 91: `api.assert.ok(marginAreas.length > 0, 'Margin area overlays should be visible')`
- Line 139: `api.assert.ok(marginHandles.length === 0, 'Should not have margin handles')`
- Line 147: `api.assert.ok(paddingHandles.length === 0, 'Padding handles should be hidden')`
- Line 542: `api.assert.ok(marginHandles.length === 0, 'Margin handles should be hidden after`

**interactions/multiselect.test.ts**

- Line 159: `multiSelection.length === 0,`
- Line 192: `multiSelection.length === 0,`

**interactions/padding-handlers.test.ts**

- Line 66: `api.assert.ok(paddingHandles.length === 0, 'Padding handles should be hidden aft`
- Line 109: `marginHandlesAfter.length === 0,`
- Line 154: `paddingHandlesAfter.length === 0,`
- Line 175: `api.assert.ok(paddingAreas.length > 0, 'Padding area overlays should be visible'`
- Line 544: `api.assert.ok(paddingHandles.length === 0, 'Padding handles should be hidden aft`

**interactions/resize-handle-drag.test.ts**

- Line 481: `if (handlesForNode.length === 0) {`

**interactions/wrap-layout.test.ts**

- Line 505: `api.assert.ok(multiSelection.length === 0, 'Multiselection should be cleared aft`

**property-panel/icon-picker.test.ts**

- Line 199: `api.assert.ok(icons.length > 0, `Should have icons displayed, got ${icons.length`
- Line 247: `allMatchHeart || filteredNames.length === 0,`
- Line 252: `api.assert.ok(filteredNames.length > 0, 'Should have at least one heart icon in `
- Line 271: `api.assert.ok(iconNames.length > 0, 'Should have icons available')`
- Line 449: `api.assert.ok(items.length > 0, 'Should have icon items')`
- ... and 3 more

**property-panel-tests.ts**

- Line 174: `padTokens.length === 0,`
- Line 235: `Object.keys(allProps).length > 0,`

**stress/index.ts**

- Line 435: `api.assert.ok(code.length > 0, 'Should have some code')`

**stress/interaction-stress.test.ts**

- Line 358: `if (container && container.children.length > 0) {`

**stress/sourcemap-stress.test.ts**

- Line 252: `api.assert.ok(ids.length === 0, `Should have 0 nodes, got ${ids.length}`)`

**sync-tests.ts**

- Line 516: `api.assert.ok(code.length === 0 || code.trim().length === 0, 'Code should be emp`
- Line 516: `api.assert.ok(code.length === 0 || code.trim().length === 0, 'Code should be emp`

**test-system-tests.ts**

- Line 25: `api.assert.ok(fixtures.length > 0, 'Should have built-in fixtures')`
- Line 172: `if (nodeIds.length > 0) {`
- Line 302: `api.assert.ok(nodeIds.length > 0, 'Should have nodes')`

**undo-redo-tests.ts**

- Line 87: `api.assert.ok(codeAfter.length > 0, 'Code should not be empty')`

**workflow/dashboard-e2e.test.ts**

- Line 301: `api.assert.ok(paddingHandles.length === 0, 'Padding handles should be hidden')`

**zag/resize-handles.test.ts**

- Line 124: `return { matches: errors.length === 0, errors }`

## Priority Files (Most Issues)

| File                                 | Tests | 🔴 High | 🟡 Med | 🟢 Low | Total |
| ------------------------------------ | ----- | ------- | ------ | ------ | ----- |
| compiler-verification/index.ts       | 180   | 42      | 262    | 34     | 338   |
| test-system-tests.ts                 | 0     | 12      | 0      | 14     | 26    |
| primitives/defaults.test.ts          | 19    | 11      | 36     | 0      | 47    |
| integration/index.ts                 | 52    | 9       | 464    | 26     | 499   |
| zag/sidenav.test.ts                  | 11    | 9       | 23     | 0      | 32    |
| property-panel/icon-picker.test.ts   | 8     | 8       | 2      | 39     | 49    |
| property-panel/comprehensive.test.ts | 24    | 6       | 67     | 54     | 127   |
| workflow/dashboard-e2e.test.ts       | 1     | 5       | 11     | 11     | 27    |
| ui-builder-tests.ts                  | 66    | 4       | 386    | 198    | 588   |
| stacked-drag-tests.ts                | 49    | 4       | 105    | 0      | 109   |
| transforms/translate.test.ts         | 13    | 4       | 57     | 0      | 61    |
| data-binding-tests.ts                | 16    | 4       | 37     | 1      | 42    |
| zag/slider.test.ts                   | 4     | 4       | 9      | 0      | 13    |
| animations/state-animations.test.ts  | 14    | 3       | 66     | 12     | 81    |
| property-panel-tests.ts              | 26    | 3       | 38     | 18     | 59    |

## Review Checklist

For each file, verify:

- [ ] No assertions inside `if` blocks (should always run)
- [ ] No weak `||` conditions that make tests always pass
- [ ] No `api.assert.ok(true, ...)` placeholders
- [ ] Dynamic element finding instead of hardcoded `node-N`
- [ ] Documented delays with comments explaining why
- [ ] Test title matches what the test actually validates
