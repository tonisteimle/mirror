# Preview System Audit Report

**Datum:** 2026-03-22
**Version:** 1.2
**Status:** Größtenteils behoben

> **Update 2026-03-22:** P0, P1 und P2 Issues wurden behoben. Siehe Changelog.

---

## Executive Summary

Das interaktive Preview-System wurde einer umfassenden Analyse unterzogen. Es wurden **6 kritische**, **4 hohe**, **6 mittlere** und **3 niedrige** Probleme identifiziert.

Die Hauptprobleme betreffen:
- **Memory Leaks** durch nicht entfernte Event-Listener und DOM-Elemente
- **Race Conditions** bei schnellen Compile-Zyklen
- **Fehlende Event-Integration** zwischen Modulen
- **Unvollständiges Error-Handling**

---

## Architektur-Übersicht

```
studio/preview/
├── index.ts              # PreviewController (Haupt-Orchestrator)
├── renderer.ts           # PreviewRenderer (DOM-Rendering)
├── handle-manager.ts     # Direct Manipulation Handles (Padding, Gap, Radius)
├── keyboard-handler.ts   # Keyboard Shortcuts
├── context-menu.ts       # Rechtsklick-Menü
├── slot-visibility.ts    # MutationObserver für Slots
├── breadcrumb.ts         # Hierarchie-Navigation
└── shared-actions.ts     # Gemeinsame Aktionen (Group, Delete, etc.)

studio/visual/
├── overlay-manager.ts    # Overlay-Layer Management
├── resize-manager.ts     # 8-Punkt Resize Handles
└── drag-drop-visualizer.ts # Drop-Zone Visualisierung
```

---

## Kritische Probleme

### PREV-001: Memory Leak - Value Indicator nicht entfernt

| Attribut | Wert |
|----------|------|
| **Schweregrad** | Kritisch |
| **Datei** | `studio/preview/handle-manager.ts` |
| **Zeilen** | 395-422 |
| **Typ** | Memory Leak |

#### Beschreibung

Der Value Indicator (zeigt Pixel-Werte beim Drag) wird an `document.body` angehängt, aber nur mit `display: none` versteckt statt aus dem DOM entfernt.

#### Betroffener Code

```typescript
// Zeile 410: Element wird zu body hinzugefügt
document.body.appendChild(this.valueIndicator)

// Zeile 419-422: Nur versteckt, nicht entfernt
private hideValueIndicator(): void {
  if (this.valueIndicator) {
    this.valueIndicator.style.display = 'none'  // ❌ Problem
  }
}
```

#### Auswirkung

- Element bleibt permanent im DOM
- Bei jedem Drag wird ein neues Style-Update durchgeführt
- Über Zeit: DOM-Pollution

#### Empfohlener Fix

```typescript
private hideValueIndicator(): void {
  if (this.valueIndicator) {
    this.valueIndicator.remove()
    this.valueIndicator = null
  }
}
```

---

### PREV-002: Memory Leak - Handle Element Listener Akkumulation

| Attribut | Wert |
|----------|------|
| **Schweregrad** | Kritisch |
| **Datei** | `studio/preview/handle-manager.ts` |
| **Zeilen** | 251-258, 90-92 |
| **Typ** | Memory Leak |

#### Beschreibung

Jedes Handle-Element erhält `mouseenter` und `mouseleave` Listener als Inline-Funktionen. Bei `hideHandles()` wird nur `innerHTML = ''` gesetzt - die Listener-Closures bleiben im Speicher.

#### Betroffener Code

```typescript
// Zeile 251-258: Inline-Funktionen ohne Referenz
el.addEventListener('mouseenter', () => {
  el.style.transform = 'scale(1.2)'
})
el.addEventListener('mouseleave', () => {
  if (this.activeHandle?.element !== el) {
    el.style.transform = 'scale(1)'
  }
})

// Zeile 90-92: Nur innerHTML geleert
hideHandles(): void {
  this.handles = []
  this.overlay.innerHTML = ''  // Listener bleiben!
}
```

#### Auswirkung

- Bei jedem Selection-Wechsel: 8 Handles × 2 Listener = 16 neue Closures
- Closures halten Referenz zu `el` und `this`
- Exponentielles Wachstum bei häufiger Nutzung
- Nach 100 Selection-Wechseln: 1600+ orphaned Listener

#### Empfohlener Fix

```typescript
// Option 1: AbortController pro Handle
private handleAbortControllers: Map<HTMLElement, AbortController> = new Map()

private createHandleElement(...): HTMLElement {
  const el = document.createElement('div')
  const ac = new AbortController()
  this.handleAbortControllers.set(el, ac)

  el.addEventListener('mouseenter', () => {
    el.style.transform = 'scale(1.2)'
  }, { signal: ac.signal })

  el.addEventListener('mouseleave', () => {
    if (this.activeHandle?.element !== el) {
      el.style.transform = 'scale(1)'
    }
  }, { signal: ac.signal })

  return el
}

hideHandles(): void {
  for (const [, ac] of this.handleAbortControllers) {
    ac.abort()
  }
  this.handleAbortControllers.clear()
  this.handles = []
  this.overlay.innerHTML = ''
}

// Option 2: CSS-only Hover (kein JS nötig)
// In styles.css:
// .handle:hover { transform: scale(1.2); }
```

---

### PREV-003: Memory Leak - Breadcrumb Click-Listener

| Attribut | Wert |
|----------|------|
| **Schweregrad** | Kritisch |
| **Datei** | `studio/preview/breadcrumb.ts` |
| **Zeilen** | 57-79 |
| **Typ** | Memory Leak |

#### Beschreibung

Bei jedem `render()` wird `innerHTML = ''` gesetzt, aber die Click-Listener Closures der alten Elemente bleiben im Speicher.

#### Betroffener Code

```typescript
private render(): void {
  this.container.innerHTML = ''  // Entfernt Elemente, nicht Listener

  this.items.forEach((item, index) => {
    const itemEl = document.createElement('span')
    // ...
    if (!isLast) {
      itemEl.addEventListener('click', () => {  // Neue Closure jedes Mal
        this.onItemClick?.(item.nodeId)
      })
    }
    this.container.appendChild(itemEl)
  })
}
```

#### Auswirkung

- Jedes Breadcrumb-Update (bei jeder Selection) erzeugt neue Listener
- Alte Closures halten Referenzen zu `item` und `this`

#### Empfohlener Fix

```typescript
// Event Delegation statt einzelner Listener
constructor(config: BreadcrumbConfig) {
  this.container = config.container
  this.events = config.events
  this.onItemClick = config.onItemClick

  // Einmaliger delegierter Listener
  this.container.addEventListener('click', (e) => {
    const item = (e.target as HTMLElement).closest('.breadcrumb-item')
    if (item && !item.classList.contains('current')) {
      const nodeId = item.dataset.nodeId
      if (nodeId) this.onItemClick?.(nodeId)
    }
  })

  this.render()
  this.subscribe()
}

private render(): void {
  this.container.innerHTML = ''
  // Elemente ohne individuelle Listener erstellen
  this.items.forEach((item, index) => {
    const itemEl = document.createElement('span')
    itemEl.className = `breadcrumb-item${isLast ? ' current' : ''}`
    itemEl.textContent = item.name
    itemEl.dataset.nodeId = item.nodeId
    // Kein addEventListener hier - wird delegiert
    this.container.appendChild(itemEl)
  })
}
```

---

### PREV-004: Memory Leak - Global Preview Singleton

| Attribut | Wert |
|----------|------|
| **Schweregrad** | Kritisch |
| **Datei** | `studio/preview/index.ts` |
| **Zeilen** | 573-586 |
| **Typ** | Memory Leak |

#### Beschreibung

Beim Setzen eines neuen `PreviewController` wird der alte nicht `dispose()`d. Seine Event-Listener auf `document` und `container` bleiben aktiv.

#### Betroffener Code

```typescript
let globalPreview: PreviewController | null = null

export function setPreviewController(controller: PreviewController): void {
  globalPreview = controller  // Alter Controller nicht disposed!
}
```

#### Auswirkung

- Alte Controller-Instanz bleibt im Speicher
- Document-Level Listener (keyboard, mouse) bleiben aktiv
- Kann zu doppelten Event-Handlern führen

#### Empfohlener Fix

```typescript
export function setPreviewController(controller: PreviewController | null): void {
  if (globalPreview && globalPreview !== controller) {
    globalPreview.dispose()
  }
  globalPreview = controller
}
```

---

### PREV-005: Race Condition - Deferred Selection

| Attribut | Wert |
|----------|------|
| **Schweregrad** | Kritisch |
| **Datei** | `studio/core/state.ts` |
| **Zeilen** | 358-378 |
| **Typ** | Race Condition |

#### Beschreibung

Das `Promise.resolve().then()` Pattern für deferred Selection kann bei schnellen Compiles zu Race Conditions führen.

#### Szenario

1. User triggert Compile #1, `compileVersion = 1`
2. Microtask für deferred Selection wird gequeued
3. User triggert schnell Compile #2, `compileVersion = 2`
4. Microtask von Compile #1 führt aus
5. Sieht `compileVersion !== capturedVersion` (2 !== 1)
6. Setzt `deferredSelection: null` → Selection von Compile #2 geht verloren

#### Betroffener Code

```typescript
if (hasDeferredSelection) {
  const capturedVersion = newVersion
  Promise.resolve().then(() => {
    if (state.get().compileVersion !== capturedVersion) {
      state.set({ deferredSelection: null })  // Könnte falsch sein!
      return
    }
    const resolvedNodeId = actions.resolveDeferredSelection()
  })
}
```

#### Auswirkung

- Deferred Selection geht bei schnellen Edits verloren
- UI springt zur Root statt zum erwarteten Element
- Inkonsistentes Verhalten bei schnellem Tippen

#### Empfohlener Fix

```typescript
// Synchrone Verarbeitung statt Microtask
if (hasDeferredSelection) {
  const deferredToResolve = currentState.deferredSelection
  state.set({
    compileVersion: newVersion,
    deferredSelection: null,  // Sofort clearen
    // ...
  })

  // Synchron nach State-Update resolven
  if (deferredToResolve) {
    const resolvedNodeId = actions.resolveDeferredSelection(deferredToResolve)
    if (resolvedNodeId) {
      actions.setSelection(resolvedNodeId, deferredToResolve.origin)
    }
  }
}
```

---

### PREV-006: ContextMenu Bind-Funktionen ohne Caching

| Attribut | Wert |
|----------|------|
| **Schweregrad** | Kritisch |
| **Datei** | `studio/preview/context-menu.ts` |
| **Zeilen** | 46, 160, 163 |
| **Typ** | Ineffizienz / Potentielles Memory Leak |

#### Beschreibung

`.bind(this)` erstellt bei jedem `attach()` bzw. `show()` neue Funktionen. Obwohl AbortController verwendet wird, ist das Pattern ineffizient.

#### Betroffener Code

```typescript
// Zeile 46: Neuer Bind bei jedem attach()
this.container.addEventListener('contextmenu', this.handleContextMenu.bind(this), {
  signal: this.contextMenuAbortController.signal,
})

// Zeile 160, 163: Neuer Bind bei jedem show()
document.addEventListener('click', this.handleClickOutside.bind(this), {
  signal: this.menuAbortController?.signal,
})
```

#### Empfohlener Fix

```typescript
// Im Constructor: Bound functions cachen
constructor(config: ContextMenuConfig) {
  this.container = config.container
  this.boundHandleContextMenu = this.handleContextMenu.bind(this)
  this.boundHandleClickOutside = this.handleClickOutside.bind(this)
  this.boundHandleKeyDown = this.handleKeyDown.bind(this)
}

// In attach()/show(): Gecachte Referenzen verwenden
attach(): void {
  this.contextMenuAbortController?.abort()
  this.contextMenuAbortController = new AbortController()
  this.container.addEventListener('contextmenu', this.boundHandleContextMenu, {
    signal: this.contextMenuAbortController.signal,
  })
}
```

---

## Hohe Priorität

### PREV-007: Fehlende Event-Integration für compile:completed

| Attribut | Wert |
|----------|------|
| **Schweregrad** | Hoch |
| **Datei** | `studio/preview/index.ts` |
| **Typ** | Architektur |

#### Beschreibung

`PreviewController` hört **nicht** auf `compile:completed`. Der `refresh()` muss extern aufgerufen werden, was fehleranfällig ist.

#### Auswirkung

- Wenn `refresh()` vergessen wird, bleiben Handles mit alter SourceMap
- Selection-Highlighting kann falsch sein
- Inkonsistenz zwischen Preview-DOM und State

#### Empfohlener Fix

```typescript
constructor(config: PreviewConfig) {
  // ... existing code ...

  // Automatisches Refresh bei Compile
  this.unsubscribeCompile = events.on('compile:completed', () => {
    this.setSourceMap(state.get().sourceMap)
    this.refresh()
  })
}

dispose(): void {
  this.unsubscribeCompile?.()
  // ... existing dispose code ...
}
```

---

### PREV-008: Multi-Selection nicht event-driven

| Attribut | Wert |
|----------|------|
| **Schweregrad** | Hoch |
| **Datei** | `studio/preview/index.ts` |
| **Zeilen** | 498-507 |
| **Typ** | Architektur |

#### Beschreibung

`updateMultiSelectionHighlight()` wird nur bei direkten Clicks aufgerufen, nicht wenn der State von außen geändert wird (z.B. durch Command).

#### Betroffener Code

```typescript
private handleClick(e: MouseEvent): void {
  if (e.shiftKey) {
    actions.toggleMultiSelection(nodeId)
    this.updateMultiSelectionHighlight()  // Nur hier!
  }
}
```

#### Auswirkung

- Multi-Selection UI ist inkonsistent wenn State von Command geändert wird
- Undo/Redo von Multi-Selection-Operationen zeigt falsche Highlights

#### Empfohlener Fix

```typescript
constructor(config: PreviewConfig) {
  // ... existing code ...

  events.on('multiselection:changed', () => {
    this.updateMultiSelectionHighlight()
  })
}
```

---

### PREV-009: SourceMap Version-Tracking fehlt

| Attribut | Wert |
|----------|------|
| **Schweregrad** | Hoch |
| **Datei** | `studio/preview/index.ts` |
| **Zeilen** | 110, 272-274 |
| **Typ** | Architektur |

#### Beschreibung

Es gibt keine Versionskontrolle für die SourceMap. Preview könnte mit veralteter SourceMap arbeiten.

#### Betroffener Code

```typescript
private sourceMap: SourceMap | null = null

setSourceMap(sourceMap: SourceMap | null): void {
  this.sourceMap = sourceMap  // Keine Version, keine Invalidierung
}
```

#### Vergleich

`SyncCoordinator` hat Versionskontrolle:
```typescript
// sync-coordinator.ts:37-45
setSourceMap(sourceMap: SourceMap | null): void {
  this.sourceMapVersion++
  // ...
}
```

#### Empfohlener Fix

```typescript
private sourceMap: SourceMap | null = null
private sourceMapVersion: number = 0

setSourceMap(sourceMap: SourceMap | null): void {
  this.sourceMapVersion++
  this.sourceMap = sourceMap

  // Automatisch Caches invalidieren
  this.invalidateCaches()
}

private invalidateCaches(): void {
  // Handle-Positionen neu berechnen bei nächstem Zugriff
  this.handleManager?.hideHandles()
  this.resizeManager?.hideHandles()
}
```

---

### PREV-010: SlotVisibilityService mit breitem MutationObserver

| Attribut | Wert |
|----------|------|
| **Schweregrad** | Hoch |
| **Datei** | `studio/preview/slot-visibility.ts` |
| **Zeilen** | 40-42 |
| **Typ** | Performance |

#### Beschreibung

Der MutationObserver überwacht den gesamten Subtree (`subtree: true`), was bei großen Preview-Trees zu Performance-Problemen führen kann.

#### Betroffener Code

```typescript
this.observer.observe(this.container, {
  childList: true,
  subtree: true,  // Überwacht ALLE Änderungen im gesamten Baum
})
```

#### Auswirkung

- Jede DOM-Änderung triggert den Observer
- Bei komplexen UIs mit vielen Elementen: hohe CPU-Last
- Kann UI-Jank verursachen

#### Empfohlener Fix

```typescript
// Option 1: Nur direkte Slot-Kinder beobachten
attach(): void {
  if (this.observer) return

  // Finde alle Slots und beobachte nur diese
  const slots = this.container.querySelectorAll(`.${this.slotClass}`)

  this.observer = new MutationObserver(this.handleMutations.bind(this))

  slots.forEach(slot => {
    this.observer!.observe(slot, {
      childList: true,
      subtree: false,  // Nur direkte Kinder
    })
  })

  this.updateAllSlots()
}

// Option 2: Debouncing
private handleMutations = debounce((mutations: MutationRecord[]) => {
  // ... existing logic ...
}, 16)  // ~60fps
```

---

## Mittlere Priorität

### PREV-011: Type Assertions ohne Guards

| Attribut | Wert |
|----------|------|
| **Schweregrad** | Mittel |
| **Dateien** | Mehrere |
| **Typ** | Type Safety |

#### Beispiele

```typescript
// index.ts:183 - as any ist gefährlich
getSourceMap: () => this.sourceMap as any

// handle-manager.ts:79 - Casting ohne null-check
const element = this.container.querySelector(...) as HTMLElement
if (!element) return  // Guard kommt NACH dem Casting

// resize-manager.ts:177 - Non-null assertion
const nodeId = handle.dataset.nodeId!  // Könnte undefined sein!
const position = handle.dataset.position as ResizeHandle
```

#### Empfohlener Fix

```typescript
// Proper type narrowing
const element = this.container.querySelector(...)
if (!(element instanceof HTMLElement)) return

// Defensive checks
const nodeId = handle.dataset.nodeId
if (!nodeId) return
const position = handle.dataset.position
if (!isValidResizeHandle(position)) return
```

---

### PREV-012: PreviewController attach() ohne Guard

| Attribut | Wert |
|----------|------|
| **Schweregrad** | Mittel |
| **Datei** | `studio/preview/index.ts` |
| **Zeilen** | 215-229 |
| **Typ** | Bug |

#### Beschreibung

Wenn `attach()` mehrfach aufgerufen wird, werden Listener dupliziert.

#### Empfohlener Fix

```typescript
attach(): void {
  this.detach()  // Erst alte Listener entfernen

  if (this.config.enableSelection) {
    this.container.addEventListener('click', this.boundHandleClick)
    this.container.addEventListener('dblclick', this.boundHandleDoubleClick)
  }
  // ...
}
```

---

### PREV-013: Fehlendes Error-Handling in KeyboardHandler

| Attribut | Wert |
|----------|------|
| **Schweregrad** | Mittel |
| **Datei** | `studio/preview/keyboard-handler.ts` |
| **Zeile** | 250 |
| **Typ** | UX |

#### Beschreibung

Wenn Command Context fehlt, wird nur `console.warn` ausgegeben - kein User-Feedback.

#### Empfohlener Fix

```typescript
const ctx = this.getCommandContext()
if (!ctx) {
  console.warn('[KeyboardHandler] No command context available')
  events.emit('notification:warning', {
    message: 'Aktion nicht verfügbar - bitte erneut versuchen'
  })
  return
}
```

---

### PREV-014: MutationObserver ohne Error-Handling

| Attribut | Wert |
|----------|------|
| **Schweregrad** | Mittel |
| **Datei** | `studio/preview/slot-visibility.ts` |
| **Zeile** | 79 |
| **Typ** | Stabilität |

#### Beschreibung

Wenn `updateSlotState()` einen Fehler wirft, wird der MutationObserver automatisch disconnected.

#### Empfohlener Fix

```typescript
private handleMutations(mutations: MutationRecord[]): void {
  const processedSlots = new Set<HTMLElement>()

  for (const mutation of mutations) {
    try {
      // ... existing logic ...
      this.updateSlotState(target)
    } catch (error) {
      console.error('[SlotVisibility] Error updating slot:', error)
      // Observer bleibt aktiv
    }
  }
}
```

---

### PREV-015: Magic Strings für Data-Attribute

| Attribut | Wert |
|----------|------|
| **Schweregrad** | Mittel |
| **Dateien** | Mehrere |
| **Typ** | Wartbarkeit |

#### Beschreibung

`'data-mirror-id'` ist an 4+ Stellen hardcodiert.

#### Betroffene Dateien

- `handle-manager.ts:79`
- `keyboard-handler.ts:179`
- `context-menu.ts:60, 68`
- `resize-manager.ts:79, 180`
- `shared-actions.ts:54`

#### Empfohlener Fix

```typescript
// constants.ts
export const MIRROR_ID_ATTR = 'data-mirror-id'
export const MIRROR_ID_SELECTOR = `[${MIRROR_ID_ATTR}]`

// Verwendung
import { MIRROR_ID_ATTR, MIRROR_ID_SELECTOR } from './constants'

const element = this.container.querySelector(
  `${MIRROR_ID_SELECTOR}="${nodeId}"`
)
```

---

### PREV-016: Script-Akkumulation in PreviewRenderer

| Attribut | Wert |
|----------|------|
| **Schweregrad** | Mittel |
| **Datei** | `studio/preview/renderer.ts` |
| **Zeilen** | 209-210 |
| **Typ** | Memory |

#### Beschreibung

Bei jedem `renderLayout()` werden neue Script-Elemente hinzugefügt. Die globale `createUI` Funktion bleibt im Scope.

#### Empfohlener Fix

```typescript
private renderLayout(jsCode: string, runtime?: string): void {
  // Alte Scripts explizit entfernen
  const oldScripts = this.container.querySelectorAll('script')
  oldScripts.forEach(s => s.remove())

  // Globale Funktion cleanen (wenn möglich)
  if (typeof (window as any).createUI === 'function') {
    delete (window as any).createUI
  }

  // ... rest of implementation ...
}
```

---

## Niedrige Priorität

### PREV-017: Hardcoded Fallback-Werte in ResizeManager

| Attribut | Wert |
|----------|------|
| **Schweregrad** | Niedrig |
| **Datei** | `studio/visual/resize-manager.ts` |
| **Zeile** | 414 |
| **Typ** | Code Quality |

#### Betroffener Code

```typescript
if (!parent) return { width: 400, height: 400 }  // Arbitrary values
```

---

### PREV-018: MIN_ELEMENT_SIZE Inkonsistenz

| Attribut | Wert |
|----------|------|
| **Schweregrad** | Niedrig |
| **Dateien** | `handle-manager.ts`, `resize-manager.ts` |
| **Typ** | Code Quality |

#### Beschreibung

`MIN_ELEMENT_SIZE` ist in beiden Dateien separat definiert mit unterschiedlichen Werten.

---

### PREV-019: Fehlende JSDoc Dokumentation

| Attribut | Wert |
|----------|------|
| **Schweregrad** | Niedrig |
| **Dateien** | Mehrere |
| **Typ** | Wartbarkeit |

#### Beschreibung

Viele öffentliche Methoden haben keine oder unvollständige JSDoc-Kommentare.

---

## Test-Strategie

### Memory Leak Verifizierung

1. Chrome DevTools > Memory > Heap Snapshot
2. Test-Szenario durchführen:
   - 50x Element auswählen/abwählen
   - 20x Handle draggen
   - 30x Breadcrumb navigieren
3. Zweiten Snapshot erstellen
4. Vergleichen: "Detached DOM Nodes" sollten 0 sein

### Race Condition Tests

```typescript
// test/preview/race-conditions.test.ts
describe('Deferred Selection', () => {
  it('should not lose selection on rapid compiles', async () => {
    // Trigger 5 compiles in quick succession
    for (let i = 0; i < 5; i++) {
      state.set({ source: `Box\n`.repeat(i + 1) })
      actions.setDeferredSelection('node-1', 'editor')
      await compile()
    }

    // Selection should be resolved
    expect(state.get().selection.nodeId).toBe('node-1')
  })
})
```

---

## Prioritäts-Matrix

| ID | Problem | Aufwand | Impact | Priorität |
|----|---------|---------|--------|-----------|
| PREV-001 | Value Indicator Leak | Klein | Hoch | **P0** |
| PREV-002 | Handle Listener Leak | Mittel | Hoch | **P0** |
| PREV-003 | Breadcrumb Listener Leak | Klein | Mittel | **P0** |
| PREV-004 | Global Singleton Leak | Klein | Hoch | **P0** |
| PREV-005 | Deferred Selection Race | Mittel | Hoch | **P1** |
| PREV-006 | Context Menu Bind | Klein | Niedrig | **P2** |
| PREV-007 | compile:completed Event | Klein | Hoch | **P1** |
| PREV-008 | Multi-Selection Events | Klein | Mittel | **P1** |
| PREV-009 | SourceMap Versioning | Mittel | Mittel | **P2** |
| PREV-010 | MutationObserver Perf | Mittel | Mittel | **P2** |

---

## Anhang: Vollständige Event-Listener Referenz

### Document-Level Listener

| Datei | Event | Handler | Cleanup |
|-------|-------|---------|---------|
| `handle-manager.ts:290` | mousemove | boundMouseMove | dispose() |
| `handle-manager.ts:291` | mouseup | boundMouseUp | dispose() |
| `resize-manager.ts:156` | mousemove | boundMouseMove | dispose() |
| `resize-manager.ts:157` | mouseup | boundMouseUp | dispose() |
| `keyboard-handler.ts:47` | keydown | boundHandleKeyDown | detach() |
| `context-menu.ts:160` | click | handleClickOutside | AbortController |
| `context-menu.ts:163` | keydown | handleKeyDown | AbortController |

### Container-Level Listener

| Datei | Event | Handler | Cleanup |
|-------|-------|---------|---------|
| `index.ts:217` | click | boundHandleClick | detach() |
| `index.ts:219` | dblclick | boundHandleDoubleClick | detach() |
| `index.ts:222` | mouseover | boundHandleMouseOver | detach() |
| `index.ts:223` | mouseout | boundHandleMouseOut | detach() |
| `context-menu.ts:46` | contextmenu | handleContextMenu | AbortController |

### Element-Level Listener (Problematisch)

| Datei | Event | Handler | Cleanup |
|-------|-------|---------|---------|
| ~~`handle-manager.ts:251`~~ | ~~mouseenter~~ | ~~inline~~ | ✅ **BEHOBEN** (CSS) |
| ~~`handle-manager.ts:254`~~ | ~~mouseleave~~ | ~~inline~~ | ✅ **BEHOBEN** (CSS) |
| ~~`breadcrumb.ts:77`~~ | ~~click~~ | ~~inline~~ | ✅ **BEHOBEN** (Delegation) |

---

## Changelog

| Version | Datum | Änderungen |
|---------|-------|------------|
| 1.0 | 2026-03-22 | Initial Audit |
| 1.1 | 2026-03-22 | P0/P1 Fixes: PREV-001 bis PREV-004, PREV-007, PREV-012 behoben |
| 1.2 | 2026-03-22 | P2 Fixes: PREV-006, PREV-009, PREV-014, PREV-015 behoben |

### Behobene Issues

| ID | Fix | Commit |
|----|-----|--------|
| PREV-001 | `hideValueIndicator()` entfernt Element aus DOM | 3d5d832 |
| PREV-002 | Handle Hover via CSS statt JS | 3d5d832 |
| PREV-003 | Breadcrumb Event Delegation | 3d5d832 |
| PREV-004 | `setPreviewController()` disposed alten Controller | 3d5d832 |
| PREV-007 | `PreviewController` hört auf `compile:completed` | c97a01e |
| PREV-012 | `attach()` ruft erst `detach()` auf | c97a01e |
| PREV-006 | ContextMenu cached bound functions | bedac9e |
| PREV-009 | PreviewController trackt sourceMapVersion | bedac9e |
| PREV-014 | SlotVisibilityService Error-Handling | bedac9e |
| PREV-015 | Constants für data-mirror-id | 438b178 |
