# Mirror Documentation Update Plan

## Ausgangssituation

Die Dokumentation ist **erheblich veraltet** und spiegelt nicht den aktuellen Stand der DSL wider.

### Analyse-Ergebnis

| Bereich | Schema | Dokumentiert | Status |
|---------|--------|--------------|--------|
| Base Primitives | 22 | 28 | FALSCH - Select/Checkbox/Radio sind jetzt Zag |
| Properties | 62 | 36 | FEHLT - 9-Zone, Pin-Properties nicht dokumentiert |
| Zag Primitives | 45+ | 0 | KOMPLETT FEHLT |
| Events | 12 | 12 | OK |
| Actions | 16 | 16 | OK |
| States | 17 | 17 | OK |

---

## Phase 1: Schema-Generator erweitern

### 1.1 Zag Primitives in Generator einbauen

**Datei:** `scripts/generate-from-schema.ts`

Erweiterungen:
1. Import `ZAG_PRIMITIVES` aus `src/schema/zag-primitives.ts`
2. Neue Funktion `generateZagPrimitivesDocs()` erstellen
3. Zag-Section in `generateClaudeSection()` einbauen
4. Zag-Section in `generateDslReferenceDocs()` einbauen
5. Zag-Section in `generateReferenceHtml()` einbauen

### 1.2 Neue generierte Dateien

```
docs/generated/
├── properties.md        # Existiert - Properties Referenz
├── dsl-reference.md     # Existiert - DSL Übersicht
├── reference.html       # Existiert - Interaktive HTML-Referenz
├── zag-primitives.md    # NEU - Zag Komponenten Referenz
└── zag-slots.md         # NEU - Slot-Mappings pro Komponente
```

---

## Phase 2: CLAUDE.md aktualisieren

### 2.1 Struktur-Änderungen

Die generierte DSL Reference Section muss erweitert werden um:

```markdown
## DSL Reference (auto-generated)

### Primitives (HTML)
| Primitive | HTML | Aliases |
...

### Zag Primitives (Behavior Components)
| Component | Machine | Slots | Description |
...

### Properties
...

### Events
...

### Actions
...

### States
...
```

### 2.2 Veraltete Einträge entfernen

Aus Primitives-Tabelle entfernen:
- `Select` (→ ist jetzt Zag)
- `Option` (→ ist jetzt Zag Slot)
- `Checkbox` (→ ist jetzt Zag)
- `Radio` (→ ist jetzt Zag)

### 2.3 Fehlende Properties hinzufügen

Aktuell fehlen in der generierten Section:
- 9-Zone Alignment: `top-left`, `top-center`, `top-right`, `center-left`, `center-right`, `bottom-left`, `bottom-center`, `bottom-right`
- Pin Properties: `pin-left`, `pin-right`, `pin-top`, `pin-bottom`, `pin-center-x`, `pin-center-y`, `pin-center`

**Prüfen:** Sind diese im Schema? Wenn ja, warum werden sie nicht generiert?

---

## Phase 3: Zag-Dokumentation erstellen

### 3.1 Zag Primitives Übersicht

Kategorien und Komponenten:

**Selection & Dropdowns:**
- Select, Combobox, Listbox

**Menus:**
- Menu, ContextMenu, NestedMenu, NavigationMenu

**Form Controls:**
- Checkbox, Switch, RadioGroup, Slider, RangeSlider, AngleSlider
- NumberInput, PinInput, PasswordInput, TagsInput, Editable
- RatingGroup, SegmentedControl, ToggleGroup

**Date & Time:**
- DatePicker, DateInput, Timer

**Overlays & Modals:**
- Dialog, Tooltip, Popover, HoverCard, FloatingPanel, Tour, Presence

**Navigation:**
- Tabs, Accordion, Collapsible, Steps, Pagination, TreeView

**Media & Files:**
- Avatar, FileUpload, ImageCropper, Carousel, SignaturePad

**Feedback & Status:**
- Progress, CircularProgress, Toast, Marquee

**Utility:**
- Clipboard, QRCode, ScrollArea, Splitter

### 3.2 Pro Komponente dokumentieren

Für jede Zag-Komponente:
1. Beschreibung
2. Verfügbare Slots
3. Props mit Typen
4. Events
5. Beispiel-Syntax

Beispiel für Select:
```markdown
### Select

Dropdown select with keyboard navigation.

**Slots:** Trigger, Content, Item, ItemIndicator, Group, GroupLabel, Input, Empty, Pill, PillRemove, ClearButton

**Props:**
- `value` - Selected value
- `placeholder` - Placeholder text
- `multiple` - Allow multiple selection
- `searchable` - Enable search
- `clearable` - Show clear button
...

**Events:** onchange, onopen, onclose, onhighlightchange, onselect

**Syntax:**
```mirror
Select placeholder "Choose..."
  Item "Option A"
  Item "Option B"
  Item "Option C"
```

---

## Phase 4: LLM-Prompts aktualisieren

### 4.1 Dateien

- `docs/llm-prompt.md`
- `docs/llm-system-prompt.md`
- `studio/agent/prompts/fixer-system.ts`
- `studio/agent/prompts/generator-system.ts`

### 4.2 Änderungen

1. Zag Primitives in Prompt aufnehmen
2. Beispiele mit Zag-Syntax
3. Slot-Patterns erklären
4. Deprecation von HTML-basierten Form Controls

---

## Phase 5: Tutorial aktualisieren

### 5.1 Datei

`docs/tutorial.md`

### 5.2 Neue Sections

1. **Zag Components Introduction**
   - Was sind Zag-Komponenten?
   - Warum Zag vs HTML?

2. **Common Zag Patterns**
   - Select/Dropdown
   - Dialog/Modal
   - Tabs/Accordion

3. **Slot-System erklären**
   - Was sind Slots?
   - Wie werden sie verwendet?

---

## Phase 6: Verifikation

### 6.1 Generator testen

```bash
npm run generate
```

### 6.2 Generierte Dateien prüfen

- `docs/generated/properties.md` - Alle Properties?
- `docs/generated/dsl-reference.md` - Zag enthalten?
- `docs/generated/reference.html` - Interaktiv nutzbar?
- `CLAUDE.md` - Section korrekt?

### 6.3 Build & Tests

```bash
npm run build
npm test
```

---

## Implementierungs-Reihenfolge

| # | Phase | Aufwand | Risiko |
|---|-------|---------|--------|
| 1 | Schema-Generator erweitern | HOCH | MITTEL |
| 2 | CLAUDE.md aktualisieren | MITTEL | NIEDRIG |
| 3 | Zag-Dokumentation erstellen | HOCH | NIEDRIG |
| 4 | LLM-Prompts aktualisieren | MITTEL | NIEDRIG |
| 5 | Tutorial aktualisieren | MITTEL | NIEDRIG |
| 6 | Verifikation | NIEDRIG | - |

---

## Offene Fragen

1. **9-Zone Properties:** Warum werden `top-left`, etc. nicht generiert? Sind sie im Schema?

2. **Pin Properties:** Warum werden `pin-left`, etc. nicht generiert?

3. **Zag Syntax:** Ist die aktuelle Zag-Syntax vollständig dokumentiert irgendwo?

4. **Breaking Changes:** Welche alten Syntax-Formen funktionieren noch?

---

## Nächste Schritte

1. [ ] Zuerst: Generator-Skript analysieren - warum fehlen Properties?
2. [ ] Generator um Zag-Support erweitern
3. [ ] `npm run generate` ausführen
4. [ ] Ergebnisse prüfen
5. [ ] Fehlende Dokumentation manuell ergänzen
