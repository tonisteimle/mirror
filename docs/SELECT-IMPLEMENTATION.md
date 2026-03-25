# Select Implementation Plan

## Ziel

Mirror Select: **Dramatisch vereinfachte** UI-Schicht auf Zag.
- User schreibt **Intent**, nicht Konfiguration
- Sensible Defaults für alles
- Volle Kontrolle **wenn gewünscht**

---

## Philosophie

### Zag vs Mirror

```
┌─────────────────────────────────────────────────────────────────┐
│  Zag (27+ Properties)              →  Mirror (Intent-basiert)  │
├─────────────────────────────────────────────────────────────────┤
│  closeOnSelect: false              →  keepOpen                  │
│  loopFocus: true                   →  (Default)                 │
│  deselectable: true                →  clearable                 │
│  multiple: true                    →  multiple                  │
│  positioning.flip: true            →  (Default)                 │
│  positioning.placement: "bottom"   →  (Default)                 │
│  highlightedValue: "x"             →  (nicht exponiert)         │
│  composite: true                   →  (nicht exponiert)         │
│  ids: {...}                        →  (automatisch)             │
│  scrollToIndexFn: ...              →  (nicht exponiert)         │
└─────────────────────────────────────────────────────────────────┘
```

### Drei Ebenen

1. **Minimal** - Funktioniert sofort mit sinnvollen Defaults
2. **Customized** - Anpassbar wenn gewünscht
3. **Full Control** - Alles möglich für Edge Cases

---

## Level 1: Minimal (Just Works)

```
Select:
  Item "Rot"
  Item "Grün"
  Item "Blau"
```

**Was Mirror automatisch macht:**
- Placeholder: "Auswählen..."
- Keyboard: Loop, Typeahead, Arrow Keys, Escape
- Positioning: Bottom-Start, Flip wenn kein Platz
- Icons: Chevron ▼, Checkmark ✓
- Accessibility: ARIA Labels, Focus Management
- Styling: Funktionale Defaults (kein visuelles Styling)

---

## Level 2: Customized (Einfache Anpassungen)

### User Intent Properties

| Intent | Mirror | Zag (intern) |
|--------|--------|--------------|
| Mehrfachauswahl | `multiple` | `multiple: true`, `closeOnSelect: false` |
| Suchbar | `searchable` | Verwendet Combobox statt Select |
| Dropdown offen lassen | `keepOpen` | `closeOnSelect: false` |
| Auswahl löschbar | `clearable` | `deselectable: true` + ClearTrigger |
| Deaktiviert | `disabled` | `disabled: true` |
| Pflichtfeld | `required` | `required: true` |
| Fehler-Zustand | `invalid` | `invalid: true` |
| Nur lesen | `readonly` | `readOnly: true` |

### Beispiele

```
Select:
  placeholder "Land wählen..."
  Item "Deutschland"
  Item "Schweiz"
  Item "Österreich"
```

```
Select:
  multiple
  placeholder "Farben wählen..."
  Item "Rot"
  Item "Grün"
  Item "Blau"
```

```
Select:
  searchable
  placeholder "Suchen..."
  Item "Apple"
  Item "Banana"
  Item "Cherry"
```

```
Select:
  clearable
  placeholder "Optional..."
  Item "A"
  Item "B"
```

---

## Level 3: Full Control (Alles möglich)

Für Edge Cases können **alle** Zag-Properties verwendet werden:

```
Select:
  # Standard Properties (vereinfacht)
  multiple
  searchable
  clearable
  keepOpen

  # Form Integration
  name "country"
  form "my-form"

  # Positioning (falls Default nicht passt)
  placement "top-start"
  offset 8

  # Accessibility
  label "Land auswählen"

  # Events
  onchange: handleChange
```

### Versteckte Komplexität

Diese Zag-Properties werden **nie** in Mirror exponiert:
- `composite` - Internes Widget-Feature
- `ids` - Automatisch generiert
- `getRootNode` - Framework-spezifisch
- `scrollToIndexFn` - Zu technisch
- `highlightedValue` / `defaultHighlightedValue` - Zu low-level
- `onPointerDownOutside`, `onFocusOutside`, `onInteractOutside` - Zu granular

Diese werden durch **ein** Event ersetzt:
```
Select:
  onclickoutside: closeDropdown   # Statt 3 separate Events
```

---

## Smart Defaults

### Bei `multiple`
```
Select:
  multiple
```
**Mirror setzt automatisch:**
- `closeOnSelect: false` (Dropdown bleibt offen)
- Tags werden angezeigt
- ClearTrigger wird aktiviert
- ItemIndicator zeigt Checkbox statt Radio

### Bei `searchable`
```
Select:
  searchable
```
**Mirror setzt automatisch:**
- Verwendet Combobox-Machine
- Input-Slot aktiviert
- Empty-Slot aktiviert ("Keine Ergebnisse")
- Typeahead deaktiviert (User tippt ja)

### Bei `clearable`
```
Select:
  clearable
```
**Mirror setzt automatisch:**
- `deselectable: true`
- ClearTrigger wird angezeigt
- Klick auf gewähltes Item hebt Auswahl auf

### Immer aktiv (Defaults)
- `loopFocus: true` - Keyboard Loop
- `typeahead: true` - Tippen springt zu Item (ausser bei searchable)
- `positioning.flip: true` - Auto-Flip
- `positioning.placement: "bottom-start"` - Unten links

---

## Vollständige Property-Referenz

### Basis Properties

| Property | Typ | Default | Beschreibung |
|----------|-----|---------|--------------|
| `placeholder` | string | "Auswählen..." | Text wenn nichts gewählt |
| `value` | string | - | Vorausgewählter Wert |
| `disabled` | flag | false | Komplett deaktiviert |
| `readonly` | flag | false | Nur lesen |
| `required` | flag | false | Pflichtfeld |
| `invalid` | flag | false | Fehler-Zustand |

### Verhalten Properties

| Property | Typ | Default | Beschreibung |
|----------|-----|---------|--------------|
| `multiple` | flag | false | Mehrfachauswahl |
| `searchable` | flag | false | Mit Suchfeld |
| `clearable` | flag | false | Auswahl löschbar |
| `keepOpen` | flag | false* | Dropdown offen lassen |

*Bei `multiple` automatisch `true`

### Form Properties

| Property | Typ | Default | Beschreibung |
|----------|-----|---------|--------------|
| `name` | string | - | Form Field Name |
| `form` | string | - | Externe Form ID |

### Positioning Properties

| Property | Typ | Default | Beschreibung |
|----------|-----|---------|--------------|
| `placement` | string | "bottom-start" | Position des Dropdowns |
| `offset` | number | 4 | Abstand zum Trigger |

### Accessibility Properties

| Property | Typ | Default | Beschreibung |
|----------|-----|---------|--------------|
| `label` | string | - | Aria Label |
| `dir` | "ltr"/"rtl" | "ltr" | Textrichtung |

---

## Item Syntax

### Einfach
```
Item "Deutschland"
```
→ Value und Label sind "Deutschland"

### Mit Value
```
Item "Deutschland" value "DE"
```
→ Zeigt "Deutschland", sendet "DE"

### Disabled
```
Item "Premium" disabled
```

### Mit Styling
```
Item "Deutschland" value "DE":
  col #4f46e5
  weight bold
```

---

## Item Groups

```
Select:
  placeholder "Land wählen..."

  Group "Europa":
    Item "Deutschland" value "DE"
    Item "Frankreich" value "FR"

  Group "Asien":
    Item "Japan" value "JP"
    Item "China" value "CN"
```

**Hinweis:** `Group` statt `ItemGroup` - kürzer, klarer Intent.

---

## Events

| Event | Beschreibung | Details |
|-------|--------------|---------|
| `onchange` | Wert geändert | `{ value, label }` |
| `onopen` | Dropdown geöffnet | - |
| `onclose` | Dropdown geschlossen | - |
| `onclickoutside` | Klick ausserhalb | - |

**Vereinfacht:** Statt `onValueChange`, `onOpenChange`, `onPointerDownOutside` etc.

---

## Slot Styling

### Verfügbare Slots

| Slot | Beschreibung | Wann sichtbar |
|------|--------------|---------------|
| `Label` | Beschriftung | Wenn `label` gesetzt |
| `Trigger` | Der Button | Immer |
| `Value` | Anzeige-Text | Im Trigger |
| `Arrow` | Dropdown-Pfeil | Im Trigger |
| `Dropdown` | Das Menü | Wenn offen |
| `Item` | Einzelnes Item | Im Dropdown |
| `Check` | Checkmark | Bei gewähltem Item |
| `Group` | Gruppen-Container | Bei Groups |
| `GroupLabel` | Gruppen-Titel | Bei Groups |
| `Tags` | Tag-Container | Bei multiple |
| `Tag` | Einzelner Tag | Bei multiple |
| `Clear` | Löschen-Button | Bei clearable |
| `Search` | Suchfeld | Bei searchable |
| `Empty` | "Keine Ergebnisse" | Bei searchable |

**Hinweis:** Vereinfachte Namen statt Zag-Namen (`Arrow` statt `Indicator`, `Dropdown` statt `Content`, `Check` statt `ItemIndicator`).

### Styling Beispiel

```
Select:
  placeholder "Wähle..."

  Trigger:
    bg #1a1a1a
    pad 8 12
    rad 4
    bor 1 #333
    hover:
      bg #222

  Arrow:
    col #666
    open:
      rotate 180

  Dropdown:
    bg #1a1a1a
    rad 6
    shadow lg
    bor 1 #333
    mt 4

  Item:
    pad 8 12
    highlighted:
      bg #252525
    selected:
      col #4f46e5

  Check:
    col transparent
    selected:
      col #4f46e5

  Item "A"
  Item "B"
  Item "C"
```

### State Pseudo-Selectors

| State | Verfügbar auf | Beschreibung |
|-------|---------------|--------------|
| `hover:` | Trigger, Item, Tag | Maus drüber |
| `focus:` | Trigger, Search | Hat Focus |
| `open:` | Trigger, Arrow | Dropdown offen |
| `highlighted:` | Item | Keyboard/Maus-Fokus |
| `selected:` | Item, Check | Ausgewählt |
| `disabled:` | Root, Item | Deaktiviert |
| `invalid:` | Root, Trigger | Fehler-Zustand |
| `placeholder:` | Value | Zeigt Placeholder |

---

## DOM Struktur

### Standard
```html
<div data-scope="select" data-part="root">
  <button data-part="trigger">
    <span data-part="value">Auswählen...</span>
    <span data-part="arrow">▼</span>
  </button>
  <div data-part="dropdown">
    <div data-part="item" data-value="A">
      <span data-part="item-text">A</span>
      <span data-part="check">✓</span>
    </div>
  </div>
  <select data-part="hidden-select" hidden>...</select>
</div>
```

### Multiple
```html
<div data-scope="select" data-part="root">
  <div data-part="tags">
    <span data-part="tag" data-value="A">
      A <button data-part="tag-delete">×</button>
    </span>
  </div>
  <button data-part="trigger">...</button>
  <button data-part="clear">×</button>
  <div data-part="dropdown">...</div>
</div>
```

### Searchable
```html
<div data-scope="select" data-part="root">
  <input data-part="search" placeholder="Suchen..." />
  <button data-part="trigger">▼</button>
  <div data-part="dropdown">
    <div data-part="empty">Keine Ergebnisse</div>
    <div data-part="item">...</div>
  </div>
</div>
```

---

## Mapping: Mirror → Zag

| Mirror Property | Zag Config |
|-----------------|------------|
| `placeholder` | Wird für `api.valueAsString` verwendet |
| `value` | `defaultValue: [value]` |
| `multiple` | `multiple: true`, `closeOnSelect: false` |
| `searchable` | Verwendet `@zag-js/combobox` |
| `clearable` | `deselectable: true` + ClearTrigger |
| `keepOpen` | `closeOnSelect: false` |
| `disabled` | `disabled: true` |
| `readonly` | `readOnly: true` |
| `required` | `required: true` |
| `invalid` | `invalid: true` |
| `name` | `name: value` |
| `form` | `form: value` |
| `placement` | `positioning.placement: value` |
| `offset` | `positioning.offset.mainAxis: value` |
| `label` | Label-Slot Content + ARIA |
| `dir` | `dir: value` |

### Automatische Defaults

| Zag Property | Mirror Default |
|--------------|----------------|
| `loopFocus` | `true` |
| `typeahead` | `true` (false bei searchable) |
| `positioning.flip` | `true` |
| `positioning.placement` | `"bottom-start"` |
| `positioning.offset` | `{ mainAxis: 4 }` |

---

## Slot Mapping: Mirror → Zag

| Mirror Slot | Zag data-part |
|-------------|---------------|
| `Label` | `label` |
| `Trigger` | `trigger` |
| `Value` | `value-text` |
| `Arrow` | `indicator` |
| `Dropdown` | `content` |
| `Item` | `item` |
| `Check` | `item-indicator` |
| `Group` | `item-group` |
| `GroupLabel` | `item-group-label` |
| `Tags` | `tag-group` |
| `Tag` | `tag` |
| `Clear` | `clear-trigger` |
| `Search` | `input` |
| `Empty` | `empty` |

---

## Vollständiges Beispiel

### Einfach
```
Select:
  Item "Rot"
  Item "Grün"
  Item "Blau"
```

### Mit Placeholder
```
Select:
  placeholder "Farbe wählen..."
  Item "Rot"
  Item "Grün"
  Item "Blau"
```

### Vorausgewählt
```
Select:
  value "Grün"
  Item "Rot"
  Item "Grün"
  Item "Blau"
```

### Multiple
```
Select:
  multiple
  placeholder "Farben wählen..."
  Item "Rot"
  Item "Grün"
  Item "Blau"
```

### Searchable + Multiple
```
Select:
  searchable
  multiple
  placeholder "Suchen..."
  Item "Apple"
  Item "Banana"
  Item "Cherry"
```

### Mit Groups
```
Select:
  placeholder "Land wählen..."

  Group "Europa":
    Item "Deutschland" value "DE"
    Item "Frankreich" value "FR"

  Group "Asien":
    Item "Japan" value "JP"
```

### Vollständig gestyled
```
Select:
  placeholder "Wähle..."
  clearable
  name "color"

  Trigger:
    bg #1a1a1a
    pad 8 12
    rad 4
    bor 1 #333
    minw 200
    hover:
      bg #222
    focus:
      bor 1 #4f46e5
    open:
      bg #222

  Value:
    col #fff
    placeholder:
      col #666

  Arrow:
    col #666
    open:
      rotate 180

  Clear:
    col #666
    hover:
      col #fff

  Dropdown:
    bg #1a1a1a
    rad 6
    shadow lg
    bor 1 #333
    maxh 240
    scroll

  Item:
    pad 8 12
    hor
    spread
    highlighted:
      bg #252525
    selected:
      col #4f46e5
    disabled:
      opacity 0.4

  Check:
    w 16
    col transparent
    selected:
      col #4f46e5

  Item "Rot"
  Item "Grün"
  Item "Blau"
```

---

## Default Styling

Mirror liefert **funktionale** Defaults (Layout, Visibility), aber **keine visuellen** Styles (Farben, Schatten).

### Funktionale Defaults

```css
/* Root */
[data-scope="select"][data-part="root"] {
  position: relative;
  display: inline-flex;
  flex-direction: column;
}

/* Trigger */
[data-scope="select"][data-part="trigger"] {
  display: inline-flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  cursor: pointer;
  min-width: 160px;
}

[data-scope="select"][data-part="trigger"][data-disabled] {
  cursor: not-allowed;
  opacity: 0.5;
}

/* Value */
[data-scope="select"][data-part="value-text"] {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Arrow */
[data-scope="select"][data-part="indicator"] {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: transform 150ms ease;
}

[data-scope="select"][data-state="open"] [data-part="indicator"] {
  transform: rotate(180deg);
}

/* Dropdown */
[data-scope="select"][data-part="content"] {
  position: absolute;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  overflow: auto;
  max-height: 300px;
}

[data-scope="select"][data-part="content"][hidden] {
  display: none;
}

/* Item */
[data-scope="select"][data-part="item"] {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

[data-scope="select"][data-part="item"][data-disabled] {
  cursor: not-allowed;
  opacity: 0.4;
}

/* Check */
[data-scope="select"][data-part="item-indicator"] {
  opacity: 0;
}

[data-scope="select"][data-part="item"][data-state="checked"] [data-part="item-indicator"] {
  opacity: 1;
}

/* Tags */
[data-scope="select"][data-part="tag-group"] {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

[data-scope="select"][data-part="tag"] {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

/* Search */
[data-scope="select"][data-part="input"] {
  flex: 1;
  min-width: 40px;
  outline: none;
  border: none;
  background: transparent;
}

/* Hidden */
[data-scope="select"][data-part="hidden-select"] {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
}
```

### Default Content

| Slot | Default |
|------|---------|
| Arrow | `▼` |
| Check | `✓` |
| Clear | `×` |
| Tag Delete | `×` |
| Empty | "Keine Ergebnisse" |
| Placeholder | "Auswählen..." |

---

## Implementation Tasks

### 1. Dependencies
- [ ] `npm install @zag-js/select @zag-js/combobox`

### 2. Schema
- [ ] Vereinfachte Properties definieren
- [ ] Slot-Mapping definieren
- [ ] Smart Defaults definieren

### 3. Parser
- [ ] Properties parsen
- [ ] Slot-Syntax parsen
- [ ] State-Syntax (`hover:`, `selected:`)
- [ ] Group-Syntax parsen
- [ ] Item-Syntax parsen

### 4. IR
- [ ] IRZagNode mit Slots
- [ ] Property → Zag Config Mapping
- [ ] Conditional Slots

### 5. DOM Backend
- [ ] DOM Struktur generieren
- [ ] Zag Machine Setup
- [ ] API Connect
- [ ] Event Binding

### 6. CSS Backend
- [ ] Slot → data-part Selektoren
- [ ] State Kombinationen
- [ ] Default Styles

### 7. Tests
- [ ] Alle Kombinationen
- [ ] Keyboard
- [ ] Accessibility
