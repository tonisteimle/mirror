# Select Komponente - Vollständiges Konzept

## Alle Zag Select Properties

### Wert & Auswahl
| Property | Typ | Beschreibung | Mirror Syntax |
|----------|-----|--------------|---------------|
| `value` | string/string[] | Aktueller Wert | `value "opt1"` |
| `defaultValue` | string/string[] | Initialer Wert | `defaultValue "opt1"` |
| `multiple` | boolean | Mehrfachauswahl | `multiple` |
| `closeOnSelect` | boolean | Nach Auswahl schliessen | `closeOnSelect false` |
| `deselectable` | boolean | Auswahl aufhebbar | `deselectable` |

### Open State
| Property | Typ | Beschreibung | Mirror Syntax |
|----------|-----|--------------|---------------|
| `open` | boolean | Controlled open | `open` |
| `defaultOpen` | boolean | Initial offen | `defaultOpen` |

### Verhalten
| Property | Typ | Beschreibung | Mirror Syntax |
|----------|-----|--------------|---------------|
| `disabled` | boolean | Deaktiviert | `disabled` |
| `readOnly` | boolean | Nur lesen | `readOnly` |
| `required` | boolean | Pflichtfeld | `required` |
| `invalid` | boolean | Ungültig | `invalid` |
| `loopFocus` | boolean | Tastatur-Loop | `loopFocus` |
| `typeahead` | boolean | Tippen zum Suchen | `typeahead` |

### Placeholder
| Property | Typ | Beschreibung | Mirror Syntax |
|----------|-----|--------------|---------------|
| `placeholder` | string | Platzhalter | `placeholder "Wähle..."` |

### Highlight
| Property | Typ | Beschreibung | Mirror Syntax |
|----------|-----|--------------|---------------|
| `highlightedValue` | string | Controlled highlight | `highlightedValue "opt1"` |
| `defaultHighlightedValue` | string | Initial highlight | `defaultHighlightedValue "opt1"` |

### Form Integration
| Property | Typ | Beschreibung | Mirror Syntax |
|----------|-----|--------------|---------------|
| `name` | string | Form field name | `name "country"` |
| `form` | string | Form ID | `form "myform"` |

### Positioning
| Property | Typ | Beschreibung | Mirror Syntax |
|----------|-----|--------------|---------------|
| `placement` | string | Position des Dropdowns | `placement "bottom-start"` |
| `offset` | number | Abstand | `offset 4` |
| `flip` | boolean | Auto-flip | `flip` |

### Events
| Event | Beschreibung | Mirror Syntax |
|-------|--------------|---------------|
| `onchange` | Wert geändert | `onchange: action` |
| `onopen` | Dropdown geöffnet | `onopen: action` |
| `onclose` | Dropdown geschlossen | `onclose: action` |
| `onhighlightchange` | Highlight geändert | `onhighlightchange: action` |

---

## Item Properties

| Property | Typ | Beschreibung | Mirror Syntax |
|----------|-----|--------------|---------------|
| `value` | string | Item-Wert (für Form) | implizit aus Label oder explizit |
| `label` | string | Anzeigetext | `Item "Label"` |
| `disabled` | boolean | Item deaktiviert | `Item "Label" disabled` |

### Expliziter Value vs Label
```
Item "Deutschland"                    # value = "Deutschland", label = "Deutschland"
Item "Deutschland" value "DE"         # value = "DE", label = "Deutschland"
Item value "DE" label "Deutschland"   # Alternative Syntax
```

---

## Vollständige Slot-Struktur

```
Select (Root)
│
├── Label                    # Optionales Label über dem Select
│
├── Control                  # Container (für Layout von Tags + Trigger)
│   │
│   ├── TagGroup             # NUR bei multiple: Container für Tags
│   │   └── Tag              # Einzelner ausgewählter Wert
│   │       ├── TagText      # Text des Tags
│   │       └── TagDelete    # X-Button zum Entfernen
│   │
│   ├── Input                # NUR bei searchable/typeahead: Eingabefeld
│   │
│   ├── Trigger              # Der klickbare Button
│   │   ├── ValueText        # Anzeige: Placeholder oder gewählter Wert
│   │   └── Indicator        # Dropdown-Pfeil Icon
│   │
│   └── ClearTrigger         # Optional: Button zum Leeren
│
├── Positioner               # Positioning-Layer (meist unsichtbar)
│   └── Content              # Das Dropdown-Panel
│       │
│       ├── Empty            # Anzeige wenn keine Items
│       │
│       ├── ItemGroup        # Optionale Gruppierung
│       │   └── ItemGroupLabel
│       │
│       └── Item             # Einzelnes Item
│           ├── ItemText     # Der Text
│           └── ItemIndicator # Checkmark/Radio Icon
│
└── HiddenInput              # Unsichtbares Input für Forms
```

---

## States pro Slot

### Root
- `disabled` - Ganzer Select deaktiviert
- `invalid` - Validierungsfehler
- `open` - Dropdown offen
- `focus` - Hat Focus

### Trigger
- `hover:`
- `focus:`
- `active:`
- `disabled:`
- `open:` - Wenn Dropdown offen

### Content
- `open:` - Sichtbar
- `closed:` - Versteckt

### Item
- `highlighted:` - Tastatur/Maus-Fokus
- `selected:` - Ausgewählt
- `disabled:` - Nicht wählbar

### Tag (bei multiple)
- `hover:`
- `focus:`

### Input (bei searchable)
- `focus:`
- `placeholder:` - Wenn leer

---

## Mirror Syntax Beispiele

### Minimal
```
Select:
  placeholder "Wähle..."
  Item "A"
  Item "B"
```

### Mit allen Properties
```
Select:
  placeholder "Land wählen..."
  defaultValue "DE"
  name "country"
  required
  closeOnSelect true
  loopFocus
  typeahead
  placement "bottom-start"

  Item "Deutschland" value "DE"
  Item "Österreich" value "AT"
  Item "Schweiz" value "CH"
```

### Vollständig gestyled
```
Select:
  placeholder "Wähle..."

  Label:
    col #888
    fs 12
    mb 4

  Control:
    bor 1 #333
    rad 4
    focus:
      bor 1 #4f46e5

  Trigger:
    bg #1a1a1a
    pad 8 12
    hover:
      bg #222
    open:
      bg #222

  ValueText:
    col #fff
    placeholder:
      col #666

  Indicator:
    col #666
    open:
      rotate 180

  Content:
    bg #1a1a1a
    rad 6
    shadow lg
    bor 1 #333
    mt 4
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
      cursor not-allowed

  ItemText:
    grow

  ItemIndicator:
    w 16
    col transparent
    selected:
      col #4f46e5

  Item "Option A"
  Item "Option B"
  Item "Option C" disabled
```

### Multiple mit Tags
```
Select:
  placeholder "Farben wählen..."
  multiple
  closeOnSelect false

  TagGroup:
    hor
    wrap
    gap 4

  Tag:
    bg #333
    rad 12
    pad 2 8
    fs 12
    hor
    gap 4

  TagText:
    col #fff

  TagDelete:
    col #888
    cursor pointer
    hover:
      col #f55

  ClearTrigger:
    col #666
    hover:
      col #fff

  Item:
    hor
    gap 8

  ItemIndicator:
    w 16
    h 16
    rad 2
    bor 1 #444
    center
    selected:
      bg #4f46e5
      bor 1 #4f46e5

  Item "Rot"
  Item "Grün"
  Item "Blau"
```

### Mit Gruppen
```
Select:
  placeholder "Wähle..."

  ItemGroup:
    mb 8

  ItemGroupLabel:
    col #666
    fs 11
    pad 4 12
    uppercase

  ItemGroup "Primär":
    Item "Rot"
    Item "Blau"
    Item "Gelb"

  ItemGroup "Sekundär":
    Item "Grün"
    Item "Orange"
    Item "Violett"
```

### Searchable (Combobox-artig)
```
Select:
  placeholder "Suchen..."
  typeahead

  Input:
    bg transparent
    bor 0
    focus:
      outline none

  Empty:
    pad 12
    col #666
    center
    "Keine Ergebnisse"

  Item "Apple"
  Item "Banana"
  Item "Cherry"
```

---

## Generierte DOM Struktur

```html
<div data-scope="select" data-part="root" data-state="open">

  <label data-scope="select" data-part="label">
    Land wählen
  </label>

  <div data-scope="select" data-part="control">

    <!-- Bei multiple: Tags -->
    <div data-scope="select" data-part="tag-group">
      <span data-scope="select" data-part="tag" data-value="DE">
        <span data-scope="select" data-part="tag-text">Deutschland</span>
        <button data-scope="select" data-part="tag-delete">×</button>
      </span>
    </div>

    <button data-scope="select" data-part="trigger" aria-expanded="true">
      <span data-scope="select" data-part="value-text">Deutschland</span>
      <span data-scope="select" data-part="indicator">▼</span>
    </button>

  </div>

  <div data-scope="select" data-part="positioner">
    <div data-scope="select" data-part="content" role="listbox">

      <div data-scope="select" data-part="item-group">
        <span data-scope="select" data-part="item-group-label">Europa</span>

        <div data-scope="select" data-part="item"
             data-value="DE"
             data-highlighted
             data-selected
             role="option">
          <span data-scope="select" data-part="item-text">Deutschland</span>
          <span data-scope="select" data-part="item-indicator">✓</span>
        </div>

        <div data-scope="select" data-part="item"
             data-value="AT"
             data-disabled
             role="option">
          <span data-scope="select" data-part="item-text">Österreich</span>
          <span data-scope="select" data-part="item-indicator"></span>
        </div>

      </div>
    </div>
  </div>

  <input type="hidden" name="country" value="DE">
</div>
```

---

## CSS Generierung

Mirror generiert CSS für jeden Slot mit allen States:

```css
/* Base Styles */
[data-scope="select"][data-part="trigger"] {
  background: #1a1a1a;
  padding: 8px 12px;
}

/* State: hover */
[data-scope="select"][data-part="trigger"]:hover {
  background: #222;
}

/* State: open (from parent) */
[data-scope="select"][data-state="open"] [data-part="trigger"] {
  background: #222;
}

/* Item States */
[data-scope="select"][data-part="item"][data-highlighted] {
  background: #252525;
}

[data-scope="select"][data-part="item"][data-selected] {
  color: #4f46e5;
}

[data-scope="select"][data-part="item"][data-disabled] {
  opacity: 0.4;
  cursor: not-allowed;
}
```

---

## Implementation Tasks

1. **Schema erweitern** - Alle Properties und Slots definieren
2. **Parser erweitern** - Verschachtelte Slot-Syntax parsen
3. **IR erweitern** - Vollständige Struktur abbilden
4. **DOM Backend** - Korrekte DOM-Struktur generieren
5. **CSS Backend** - State-basierte Styles generieren
6. **Runtime** - Vollständige Interaktionslogik

---

## Entscheidungen

### 1. Zag einbinden oder nachbauen?

**Option A: Zag einbinden**
- Pro: Vollständig, getestet, accessible
- Con: +50KB Bundle, externe Dependency

**Option B: Nachbauen**
- Pro: Volle Kontrolle, kein Overhead
- Con: Aufwand, potentielle Bugs

**Empfehlung:** Nachbauen, aber Zag's State Machine Logik als Referenz nutzen.

### 2. Default Styles?

**Option A: Unstyled (nur Struktur)**
- User muss alles selbst stylen
- Maximale Flexibilität

**Option B: Minimale Defaults**
- Funktioniert sofort
- Kann überschrieben werden

**Empfehlung:** Minimale Defaults für Funktionalität (hidden Content, flex layouts), aber keine visuellen Styles.

### 3. Icons für Indicator/Checkmark?

```
Indicator:
  icon "chevron-down"    # Lucide Icon

ItemIndicator:
  icon "check"           # Lucide Icon
```

Oder automatisch basierend auf Slot-Typ.
