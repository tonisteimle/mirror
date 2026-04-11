# Plan: Verbesserung der Testbarkeit des Drag & Drop Systems

## Status

**Stand nach Phase 5 Preview-Refactoring:**
- `getBoundingClientRect` → über `layoutInfo` Pattern gelöst ✅
- Alle Rect-Berechnungen nutzen gecachte Layout-Daten mit DOM-Fallback
- Siehe `docs/concepts/preview-architecture.md`

**Verbleibende DOM-Abhängigkeiten:**
- `getComputedStyle()` - für Layout-Detection (flex, stacked, direction)
- `elementFromPoint()` - für Target-Detection beim Drag
- `scrollLeft/scrollTop` - für Scroll-Kompensation

---

## Phase 1: Helper-Funktionen exportieren (15 min)

**Datei:** `studio/drag-drop/system/target-detector.ts`

Folgende private Funktionen exportieren:
- `detectLayoutType()`
- `detectDirection()`
- `hasValidChildren()`
- `isLeafComponent()`

**Warum:** Ermöglicht Unit-Tests für reine Logik ohne DOM-Mocking.

---

## Phase 2: Unit-Tests für Helper-Funktionen (1h)

**Neue Datei:** `tests/studio/drag-drop/target-detector-helpers.test.ts`

```typescript
describe('detectLayoutType', () => {
  it('returns "positioned" for data-layout="stacked"')
  it('returns "flex" for display:flex')
  it('returns "none" for display:block without flex')
})

describe('detectDirection', () => {
  it('returns "vertical" for flex-direction:column')
  it('returns "horizontal" for flex-direction:row')
})

describe('hasValidChildren', () => {
  it('returns true when child has node ID')
  it('returns false when no children have node ID')
})

describe('isLeafComponent', () => {
  it('identifies Text, Button, H1-H6 as leaf')
  it('does not mark Frame as leaf')
})
```

---

## Phase 3: StyleAdapter Interface (30 min)

**Hinweis:** `getBoundingClientRect` ist NICHT enthalten - das läuft über `layoutInfo`.

**Neue Datei:** `studio/drag-drop/system/style-adapter.ts`

```typescript
export interface StyleAdapter {
  getComputedStyle(element: HTMLElement): CSSStyleDeclaration
  elementFromPoint(x: number, y: number): Element | null
}

export const defaultStyleAdapter: StyleAdapter = {
  getComputedStyle: (el) => window.getComputedStyle(el),
  elementFromPoint: (x, y) => document.elementFromPoint(x, y),
}
```

**Mock für Tests:** `tests/utils/mocks/style-adapter-mock.ts`

```typescript
export function createMockStyleAdapter(overrides?: Partial<StyleAdapter>): StyleAdapter {
  return {
    getComputedStyle: vi.fn(() => ({
      display: 'flex',
      flexDirection: 'column',
      // ...
    } as CSSStyleDeclaration)),
    elementFromPoint: vi.fn(() => null),
    ...overrides,
  }
}
```

---

## Phase 4: target-detector.ts anpassen (30 min)

**Datei:** `studio/drag-drop/system/target-detector.ts`

```typescript
export function detectTarget(
  element: HTMLElement,
  nodeIdAttr: string = DEFAULT_NODE_ID_ATTR,
  layoutInfo?: Map<string, LayoutRect> | null,  // bereits vorhanden
  styleAdapter: StyleAdapter = defaultStyleAdapter  // NEU
): DropTarget | null {
  const style = styleAdapter.getComputedStyle(element)
  // ...
}

export function findClosestTarget(
  x: number,
  y: number,
  container: HTMLElement,
  nodeIdAttr: string = DEFAULT_NODE_ID_ATTR,
  layoutInfo?: Map<string, LayoutRect> | null,
  styleAdapter: StyleAdapter = defaultStyleAdapter  // NEU
): DropTarget | null {
  const element = styleAdapter.elementFromPoint(x, y)
  // ...
}
```

---

## Phase 5: DragDropConfig erweitern (10 min)

**Datei:** `studio/drag-drop/system/types.ts`

```typescript
export interface DragDropConfig {
  // ... bestehende Properties ...
  getLayoutInfo?: () => Map<string, LayoutRect> | null  // bereits vorhanden
  styleAdapter?: StyleAdapter  // NEU
}
```

---

## Dateien-Übersicht

| Datei | Aktion |
|-------|--------|
| `studio/drag-drop/system/style-adapter.ts` | NEU |
| `studio/drag-drop/system/target-detector.ts` | ÄNDERN (StyleAdapter param) |
| `studio/drag-drop/system/types.ts` | ÄNDERN (StyleAdapter in Config) |
| `tests/utils/mocks/style-adapter-mock.ts` | NEU |
| `tests/studio/drag-drop/target-detector-helpers.test.ts` | NEU |

---

## Architektur-Übersicht

```
┌─────────────────────────────────────────────────────────┐
│                    DragDropSystem                        │
├─────────────────────────────────────────────────────────┤
│  Rect-Daten:        layoutInfo (from state)             │
│                     ↓                                    │
│                     getChildRects(el, attr, layoutInfo) │
│                     getContainerRect(el, layoutInfo)    │
│                     → Fallback: getBoundingClientRect   │
├─────────────────────────────────────────────────────────┤
│  Style-Daten:       StyleAdapter                        │
│                     ↓                                    │
│                     detectLayoutType(el, styleAdapter)  │
│                     detectDirection(el, styleAdapter)   │
│                     → Production: window.getComputedStyle│
│                     → Test: Mock                         │
├─────────────────────────────────────────────────────────┤
│  Target-Finding:    StyleAdapter                        │
│                     ↓                                    │
│                     findClosestTarget(x, y, styleAdapter)│
│                     → Production: document.elementFromPoint│
│                     → Test: Mock                         │
└─────────────────────────────────────────────────────────┘
```

---

## Abgrenzung zu layoutInfo

| Aspekt | layoutInfo | StyleAdapter |
|--------|------------|--------------|
| **Zweck** | Rect-Daten (Position, Größe) | Style-Abfragen, Hit-Testing |
| **Quelle** | Gecacht nach Render | Live DOM-Abfrage |
| **Methoden** | getChildRects, getContainerRect | getComputedStyle, elementFromPoint |
| **Fallback** | getBoundingClientRect | - |

---

## Priorität

1. **Phase 1-2** (Helper export + Tests) - Schneller Win, keine Architektur-Änderung
2. **Phase 3-5** (StyleAdapter) - Nur wenn mehr Testabdeckung nötig

Die meisten DOM-Reads (Rects) sind bereits über `layoutInfo` abstrahiert.
StyleAdapter ist Feinschliff für die verbleibenden `getComputedStyle`/`elementFromPoint` Calls.

---

## Verifikation

```bash
npm test -- tests/studio/drag-drop/
```

Erwartetes Ergebnis:
- Alle bestehenden Tests grün (153/153)
- Neue helper-tests grün
