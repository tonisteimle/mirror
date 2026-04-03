# SideNav Implementierungsplan

## Phase 1: Schema & Parser

### 1.1 Zag-Primitive definieren

**Datei:** `compiler/schema/zag-primitives.ts`

```typescript
SideNav: {
  machine: 'sidenav',
  slots: ['Root', 'Header', 'Footer', 'ItemList', 'Item', 'ItemIcon', 'ItemLabel', 'ItemBadge', 'ItemArrow', 'Group', 'GroupLabel', 'GroupArrow', 'GroupContent'],
  props: ['value', 'defaultValue', 'collapsed', 'orientation'],
  events: ['onchange'],
  description: 'Sidebar navigation',
  pattern: 'nav-items',
  itemKeywords: ['NavItem', 'NavGroup'],
},
```

### 1.2 Item-Keywords registrieren

**Datei:** `compiler/schema/zag-primitives.ts`

NavItem und NavGroup als Zag-Keywords registrieren (wie Tab, AccordionItem).

## Phase 2: IR Transformation

### 2.1 NavItem/NavGroup parsen

**Datei:** `compiler/ir/index.ts`

- NavItem extrahieren: `value`, `icon`, `badge`, `arrow`, `shows`, `disabled`
- NavGroup extrahieren: Label, `collapsible`, `defaultOpen`, children (NavItems)
- Verschachtelte Struktur aufbauen

### 2.2 IR-Struktur

```typescript
interface IRSideNavItem {
  type: 'nav-item'
  value: string
  label?: string
  icon?: string
  badge?: string
  arrow?: boolean
  shows?: string  // Name des Ziel-Elements
  disabled?: boolean
  children?: IRNode[]  // Custom content
}

interface IRSideNavGroup {
  type: 'nav-group'
  label: string
  collapsible?: boolean
  defaultOpen?: boolean
  items: IRSideNavItem[]
}
```

## Phase 3: DOM Backend

### 3.1 Emitter implementieren

**Datei:** `compiler/backends/dom.ts`

```typescript
private emitSideNavComponent(node: IRZagNode, parentVar: string): void {
  // 1. Root erstellen
  // 2. Header Slot (optional)
  // 3. ItemList erstellen
  // 4. Items/Groups iterieren und erstellen
  // 5. Footer Slot (optional)
  // 6. Runtime initialisieren
}
```

### 3.2 Struktur generieren

```
nav[data-zag-component="sidenav"]
├── div[data-slot="Header"] (optional)
├── div[data-slot="ItemList"][role="menubar"]
│   ├── a[data-slot="Item"][role="menuitem"]
│   │   ├── span[data-slot="ItemIcon"]
│   │   ├── span[data-slot="ItemLabel"]
│   │   ├── span[data-slot="ItemBadge"] (optional)
│   │   └── span[data-slot="ItemArrow"] (optional)
│   └── div[data-slot="Group"]
│       ├── button[data-slot="GroupLabel"] (wenn collapsible)
│       ├── span[data-slot="GroupArrow"] (wenn collapsible)
│       └── div[data-slot="GroupContent"]
│           └── a[data-slot="Item"]...
└── div[data-slot="Footer"] (optional)
```

## Phase 4: Runtime

### 4.1 Initialisierung

**Datei:** `compiler/runtime/dom-runtime-string.ts`

```typescript
initSideNavComponent(el) {
  // 1. Config lesen (defaultValue, collapsed)
  // 2. Items sammeln
  // 3. Event Handlers registrieren
  // 4. Keyboard Navigation setup
  // 5. Initial State setzen
  // 6. Public API exponieren
}
```

### 4.2 Selection Logic

```typescript
function selectItem(value: string) {
  // 1. Alle Items deselektieren
  // 2. Ziel-Item selektieren (aria-current="page")
  // 3. shows-Target finden und anzeigen
  // 4. Geschwister-Views verstecken
  // 5. Event dispatchen
}
```

### 4.3 Keyboard Navigation

```typescript
function handleKeyDown(e: KeyboardEvent) {
  switch (e.key) {
    case 'ArrowDown':
      focusNextItem()
      break
    case 'ArrowUp':
      focusPrevItem()
      break
    case 'ArrowRight':
      // Gruppe öffnen oder in Gruppe
      break
    case 'ArrowLeft':
      // Gruppe schließen oder raus
      break
    case 'Enter':
    case ' ':
      selectFocusedItem()
      break
    case 'Home':
      focusFirstItem()
      break
    case 'End':
      focusLastItem()
      break
  }
}
```

### 4.4 Collapsible Groups

```typescript
function toggleGroup(groupEl: HTMLElement) {
  const isOpen = groupEl.dataset.state === 'open'
  const content = groupEl.querySelector('[data-slot="GroupContent"]')

  if (isOpen) {
    content.style.display = 'none'
    groupEl.dataset.state = 'closed'
  } else {
    content.style.display = ''
    groupEl.dataset.state = 'open'
  }
}
```

### 4.5 Default Styles

```typescript
// Root
el.style.display = 'flex'
el.style.flexDirection = 'column'
el.style.height = '100%'
el.style.backgroundColor = '#0a0a0a'
el.style.borderRight = '1px solid #1a1a1a'

// Item
item.style.display = 'flex'
item.style.alignItems = 'center'
item.style.gap = '12px'
item.style.padding = '10px 16px'
item.style.color = '#888'
item.style.cursor = 'pointer'
item.style.textDecoration = 'none'
item.style.borderRadius = '6px'
item.style.margin = '2px 8px'

// Item selected
item[aria-current="page"].style.backgroundColor = '#1a1a1a'
item[aria-current="page"].style.color = '#fff'

// Item hover
item:hover.style.backgroundColor = '#151515'
```

## Phase 5: Tests

### 5.1 Compile Tests

**Datei:** `tests/compiler/sidenav.test.ts`

- Basic SideNav kompiliert
- NavItem mit allen Props
- NavGroup (collapsible und nicht)
- Header/Footer Slots
- Styling Slots

### 5.2 Runtime Tests

- Selection funktioniert
- shows-Verlinkung funktioniert
- Keyboard Navigation
- Collapsible Groups

## Phase 6: Dokumentation

### 6.1 Tutorial-Kapitel (optional)

- Konzept erklären
- Beispiele
- Styling

### 6.2 CLAUDE.md aktualisieren

- SideNav zu Zag-Primitives hinzufügen
- Slots dokumentieren

---

## Arbeitsschritte (Reihenfolge)

1. [x] Schema: `SideNav` in `zag-primitives.ts` definieren
2. [x] Schema: `NavItem`, `NavGroup` Keywords registrieren
3. [x] IR: NavItem/NavGroup Parsing implementieren
4. [x] Backend: `emitSideNavComponent()` implementieren
5. [x] Runtime: `initSideNavComponent()` implementieren
6. [x] Runtime: Keyboard Navigation
7. [x] Runtime: Collapsible Groups
8. [x] Runtime: shows-Verlinkung
9. [x] Tests: Compile Tests (24 tests passing)
10. [x] Tests: Runtime Tests (E2E) - Playwright verified
11. [x] Docs: Tutorial/Referenz aktualisieren

## Geschätzter Umfang

- Schema: ~30 Zeilen
- IR: ~100 Zeilen
- Backend: ~200 Zeilen
- Runtime: ~300 Zeilen
- Tests: ~200 Zeilen

**Total: ~830 Zeilen**
