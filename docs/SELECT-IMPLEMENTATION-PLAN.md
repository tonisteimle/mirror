# Select Implementation Plan

Basierend auf dem Tutorial `docs/primitives/select/select-tutorial.html`

---

## Übersicht: Tutorial-Struktur

Das Tutorial definiert:
- **17 Properties** (placeholder, value, label, multiple, searchable, clearable, keepOpen, disabled, readonly, required, invalid, name, form, placement, offset, dir, icon-only)
- **15 Slots** (Label, Trigger, Value, Arrow, Clear, Tags, Tag, TagDelete, Search, Dropdown, Empty, Group, GroupLabel, Item, Check)
- **8 States** (hover, focus, open, highlighted, selected, disabled, invalid, placeholder)
- **3 Events** (onchange, onopen, onclose)
- **6 Custom Item Elements** (Icon, Text, Dot, Badge, Avatar, Swatch)
- **Default Icons** (chevron-down, check, x)
- **Default Styling** für alle Slots

---

## 1. PROPERTIES

### 1.1 placeholder
**Tutorial:** `Select placeholder "Farbe wählen..."`
**Aktuell:** ✅ Funktioniert
**Test:** `placeholder "Text"` zeigt Text wenn nichts ausgewählt

---

### 1.2 value
**Tutorial:**
```
Select value "Grün":        # Einfach
Select value "DE":          # Mit Item-Value
  Item "Deutschland" value "DE"
```
**Aktuell:** ⚠️ Einfach funktioniert, Item-Value nicht getestet
**Test:** Vorausgewählter Wert wird angezeigt
**Änderung:** Keine

---

### 1.3 label
**Tutorial:**
```
Select label "Land":
  Label fs 12, col #888, mb 6, uppercase
  Item "Deutschland"
```
**Aktuell:** ❌ Fehlt komplett
**Änderung:**
- [ ] `src/ir/index.ts`: Label-Property in machineConfig
- [ ] `src/runtime/dom-runtime-string.ts`: Label-Element über Trigger erstellen
- [ ] Default-Styling: `font-size: 12px; color: #888; margin-bottom: 6px`

---

### 1.4 multiple
**Tutorial:**
```
Select multiple:
  Item "Rot"
  Item "Grün"
```
**Visuell:** Tags im Trigger, Checkboxen bei Items
**Aktuell:** ✅ Implementiert
**Änderung:**
- [x] `src/runtime/dom-runtime-string.ts`: `renderTags()` komplett neu
- [x] Tags mit X-Button, nicht Komma-Liste
- [x] Checkbox-Style bei Items statt Check-Icon
- [x] Tags-Container: `flex-wrap: nowrap; overflow: hidden`
- [x] keepOpen Default bei Multiple

---

### 1.5 searchable
**Tutorial:**
```
Select searchable:
  Search bg transparent, pad 10 14
  Empty pad 20, center: "Keine Ergebnisse"
  Item "Apple"
```
**Aktuell:** ⚠️ Search funktioniert, Empty fehlt
**Änderung:**
- [ ] `src/runtime/dom-runtime-string.ts`: Empty-Element wenn keine Treffer

---

### 1.6 clearable
**Tutorial:** `Select clearable:`
**Visuell:** X-Button im Trigger, erscheint bei Auswahl
**Aktuell:** ✅ Funktioniert
**Test:** X-Button löscht Auswahl

---

### 1.7 keepOpen
**Tutorial:** `Select keepOpen:` - Dropdown bleibt nach Auswahl offen
**Aktuell:** ✅ Implementiert
**Änderung:**
- [x] `src/ir/index.ts`: `keepOpen` Property parsen → setzt `closeOnSelect = false`
- [x] `src/runtime/dom-runtime-string.ts`: Multiple hat `closeOnSelect = false` als Default

---

### 1.8 disabled
**Tutorial:**
```
Select disabled:
  Trigger:
    disabled: opacity 0.5, cursor not-allowed
```
**Aktuell:** ✅ Funktioniert
**Test:** Select nicht klickbar, opacity 0.5

---

### 1.9 readonly
**Tutorial:** `Select readonly, value "Festgelegt":` - Zeigt Wert, keine Änderung möglich
**Aktuell:** ❌ Fehlt
**Änderung:**
- [ ] `src/ir/index.ts`: `readonly` Property
- [ ] `src/runtime/dom-runtime-string.ts`: Klick ignorieren bei readonly

---

### 1.10 required
**Tutorial:** `Select required, name "country":` - Pflichtfeld für Forms
**Aktuell:** ❌ Fehlt
**Änderung:**
- [ ] `src/backends/dom.ts`: `required` Attribut setzen
- [ ] Hidden input für Form-Submission

---

### 1.11 invalid
**Tutorial:**
```
Select invalid:
  Trigger:
    invalid: bor 1 #ef4444
  Value:
    invalid: col #ef4444
```
**Aktuell:** ❌ Fehlt
**Änderung:**
- [ ] `src/ir/index.ts`: `invalid` Property
- [ ] `src/runtime/dom-runtime-string.ts`: `data-invalid` Attribut, Border rot

---

### 1.12 name
**Tutorial:** `Select name "country":` - Name für Form-Submission
**Aktuell:** ❌ Fehlt
**Änderung:**
- [ ] Hidden `<input name="...">` mit value

---

### 1.13 form
**Tutorial:** `Select form "settings-form":` - Verknüpft mit externem Form
**Aktuell:** ❌ Fehlt
**Änderung:**
- [ ] `form` Attribut auf hidden input

---

### 1.14 placement
**Tutorial:** `Select placement "top-start":` - Position des Dropdowns
**Werte:** top, top-start, top-end, bottom, bottom-start, bottom-end, left, right
**Aktuell:** ❌ Fehlt (immer unten)
**Änderung:**
- [ ] CSS `position` Logik basierend auf placement

---

### 1.15 offset
**Tutorial:** `Select offset 12:` - Abstand Trigger ↔ Dropdown in px
**Aktuell:** ❌ Fehlt (fest 3px)
**Änderung:**
- [ ] `margin-top` dynamisch setzen

---

### 1.16 dir
**Tutorial:** `Select dir "rtl":` - Right-to-Left
**Aktuell:** ❌ Fehlt
**Änderung:**
- [ ] `dir` Attribut auf Root-Element

---

### 1.17 icon-only
**Tutorial:**
```
Select icon-only:
  Trigger: Icon "grid"
  Item: Icon "grid", Text "Kacheln"
  Item: Icon "list", Text "Liste"
```
**Visuell:** Kompakter quadratischer Button, nur Icon, kein Value/Arrow sichtbar
**Aktuell:** ❌ Fehlt
**Änderung:**
- [ ] `src/ir/index.ts`: `iconOnly` Property in machineConfig
- [ ] `src/runtime/dom-runtime-string.ts`:
  - Trigger: `width: 36px; height: 36px; padding: 0; justify-content: center`
  - Value: `display: none`
  - Arrow: `display: none`

---

### 1.18 open
**Zag.js:** `open` / `defaultOpen`
**Mirror:**
```
Select open:
  Item "A"
```
**Intent:** Select ist initial geöffnet (für Demos, Previews)
**Aktuell:** ❌ Fehlt
**Änderung:**
- [ ] `src/ir/index.ts`: `open` Property
- [ ] `src/runtime/dom-runtime-string.ts`: Initial open state

---

### 1.19 loop
**Zag.js:** `loopFocus`
**Mirror:**
```
Select loop:
  Item "A"
  Item "B"
```
**Intent:** Keyboard-Navigation springt am Ende zum Anfang
**Aktuell:** ❌ Fehlt (sollte Default sein)
**Änderung:**
- [ ] `src/runtime/dom-runtime-string.ts`: Loop-Logik in Keyboard-Handler
- [ ] Default: ON

---

### 1.20 toggle
**Zag.js:** `deselectable`
**Mirror:**
```
Select toggle:
  Item "Option A"
```
**Intent:** Klick auf ausgewähltes Item = Abwählen
**Aktuell:** ❌ Fehlt
**Änderung:**
- [ ] `src/runtime/dom-runtime-string.ts`: Toggle-Logik in Item-Click

---

### 1.21 autocomplete
**Zag.js:** `autoComplete`
**Mirror:**
```
Select autocomplete "address-level1":
  Item "Deutschland"
```
**Intent:** Browser-Autofill für Formulare
**Aktuell:** ❌ Fehlt
**Änderung:**
- [ ] `src/backends/dom.ts`: `autocomplete` Attribut auf hidden select

---

## 2. SLOTS

### 2.1 Label
**Tutorial:** Text über dem Select
```
Label fs 12, col #888, uppercase
```
**Aktuell:** ❌ Fehlt
**Änderung:**
- [ ] Label-Element über Trigger erstellen wenn `label` Property gesetzt
- [ ] Default-Styling: `font-size: 12px; color: #888; margin-bottom: 6px`

---

### 2.2 Trigger
**Tutorial:** Der klickbare Button
```
Trigger bg #1a1a1a, pad 10 14, rad 6, bor 1 #333:
  hover: bor 1 #444
  focus: bor 1 #4f46e5, shadow 0 0 0 3 rgba(79,70,229,0.2)
  open: bor 1 #4f46e5
```
**Aktuell:** ✅ Grundlegend funktioniert
**Änderung:**
- [ ] Focus-State mit Ring hinzufügen

---

### 2.3 Value
**Tutorial:** Zeigt Placeholder oder gewählten Wert
```
Value col #fff, grow, truncate:
  placeholder: col #666, italic
```
**Aktuell:** ✅ Funktioniert
**Test:** Zeigt Placeholder grau, Wert weiß

---

### 2.4 Arrow (Alias: Indicator)
**Tutorial:**
```
Arrow col #666, transition transform 150ms:
  open: rotate 180, col #4f46e5
```
**Default Icon:** `chevron-down`
**Aktuell:** ✅ Funktioniert
**Test:** Rotiert bei open

---

### 2.5 Clear (Alias: ClearButton)
**Tutorial:**
```
Clear col #666, pad 4, rad 4:
  hover: col #fff, bg #333
```
**Default Icon:** `x`
**Aktuell:** ✅ Funktioniert
**Test:** X-Button erscheint bei Auswahl

---

### 2.6 Tags (Alias: TagGroup)
**Tutorial:** Container für ausgewählte Werte bei `multiple`
```
Tags hor, wrap, gap 6
```
**Aktuell:** ✅ Implementiert
**Änderung:**
- [x] Tags-Container erstellen bei multiple (data-slot="TagGroup")
- [x] Default-Styling: `display: flex; flex-wrap: nowrap; gap: 4px; overflow: hidden; flex: 1`

---

### 2.7 Tag (Alias: Pill)
**Tutorial:** Einzelner Tag mit X zum Entfernen
```
Tag bg #4f46e5, col #fff, pad 4 10, rad 12, fs 12:
  hover: bg #4338ca
```
**Aktuell:** ✅ Implementiert
**Änderung:**
- [x] Tag-Element mit Text + TagDelete-Button (data-slot="Pill")
- [x] Default-Styling: `background: #333; padding: 2px 6px; border-radius: 3px; font-size: 12px`

---

### 2.8 TagDelete (Alias: PillRemove)
**Tutorial:** X-Button zum Entfernen eines Tags
```
TagDelete col #888, cursor pointer:
  Icon "x" size 12
  hover: col #fff
```
**Aktuell:** ✅ Implementiert
**Änderung:**
- [x] X-Button in jedem Tag (data-slot="PillRemove")
- [x] Default-Icon: `x` (12px SVG)
- [x] Default-Styling: `color: #888; cursor: pointer; display: flex`
- [x] Hover: `color: #fff`
- [x] onClick: Tag aus value-Array entfernen

---

### 2.9 Search (Alias: Input)
**Tutorial:**
```
Search bg transparent, bor 0, pad 10 14:
  focus: outline none
```
**Aktuell:** ✅ Funktioniert
**Test:** Filtert Items

---

### 2.10 Dropdown (Alias: Content)
**Tutorial:**
```
Dropdown bg #1a1a1a, rad 8, shadow lg, bor 1 #333, mt 4, maxh 240, scroll, pad 4
```
**Aktuell:** ✅ Funktioniert
**Änderung:**
- [ ] Alias `Dropdown` im Parser auflösen zu `Content`

---

### 2.11 Empty
**Tutorial:** Anzeige wenn keine Suchergebnisse
```
Empty pad 20, center, col #666, fs 13: "Keine Ergebnisse gefunden"
```
**Aktuell:** ✅ Implementiert
**Änderung:**
- [x] Empty-Element erstellen wenn searchable und keine Treffer
- [x] Default-Text: "Keine Ergebnisse"
- [x] Default-Styling: `padding: 16px; text-align: center; color: #666; font-size: 12px`

---

### 2.12 Group
**Tutorial:**
```
Group "Europa":
  Item "Deutschland"
  Item "Frankreich"
```
**Aktuell:** ❌ Fehlt
**Änderung:**
- [ ] Parser: Group als Container erkennen
- [ ] IR: Groups mit Items strukturieren
- [ ] Runtime: Group-Container mit Label + Items rendern
- [ ] Default-Styling: `margin-top: 3px`

---

### 2.13 GroupLabel
**Tutorial:** Überschrift der Gruppe
```
GroupLabel fs 10, col #666, uppercase, pad 6 10
```
**Aktuell:** ❌ Fehlt
**Änderung:**
- [ ] Label-Element in Group
- [ ] Default-Styling: `font-size: 10px; color: #666; text-transform: uppercase; padding: 6px 10px; font-weight: 500`

---

### 2.14 Item
**Tutorial:**
```
Item pad 10 14, rad 4, hor, spread, cursor pointer:
  hover: bg #252525
  highlighted: bg #252525
  selected: col #4f46e5, bg rgba(79,70,229,0.1)
  disabled: opacity 0.4, cursor not-allowed
```
**Aktuell:** ✅ Grundlegend funktioniert
**Test:** Hover, Highlight, Selected, Disabled

---

### 2.15 Check (Alias: ItemIndicator)
**Tutorial:**
```
Check w 20, h 20, center, opacity 0:
  Icon "check" size 14, col #4f46e5
  selected: opacity 1
```
**Bei multiple:** Checkbox statt Checkmark
**Aktuell:** ✅ Implementiert
**Änderung:**
- [x] Bei `multiple`: Checkbox-Style (Box mit Border, filled bei selected)
- [x] Default-Styling Checkbox: `width: 15px; height: 15px; border: 1px solid #444; border-radius: 3px`
- [x] Selected: `background: #4f46e5; border-color: #4f46e5` mit Checkmark-Icon

---

### 2.16 ItemText
**Zag.js:** `item-text`
**Mirror:**
```
Item:
  Icon "star"
  ItemText "Favoriten"
```
**Intent:** Text-Teil des Items separat stylebar, wird als Value angezeigt
**Aktuell:** ❌ Fehlt
**Änderung:**
- [ ] `src/runtime/dom-runtime-string.ts`: ItemText für Value-Anzeige verwenden
- [ ] Default-Styling: `flex: 1`

---

### 2.17 HiddenSelect
**Zag.js:** `hidden-select`
**Mirror:** Automatisch bei `name` Property
```
Select name "country":
  Item "DE"
```
**Intent:** Natives `<select>` für Form-Submission
**Aktuell:** ❌ Fehlt
**Änderung:**
- [ ] `src/runtime/dom-runtime-string.ts`: Hidden `<select>` erstellen wenn `name` gesetzt
- [ ] Value synchronisieren

---

## 3. CUSTOM ITEM ELEMENTS

Items können verschachtelte Elemente enthalten für komplexe Darstellungen.

### 3.1 Icon
**Tutorial:**
```
Item: Icon "star", Text "Favoriten"
Item: Icon "trash" col #ef4444, Text "Löschen"
```
**Aktuell:** ⚠️ Sollte bereits funktionieren (generisches Element)
**Test:** Icon wird in Item gerendert

---

### 3.2 Text
**Tutorial:**
```
Item: Text "Label" weight medium, Text "Beschreibung" fs 11 col #666
```
**Aktuell:** ✅ Funktioniert
**Test:** Text-Elemente in Item

---

### 3.3 Dot
**Tutorial:** Kleiner Farbpunkt als Status-Indikator
```
Item: Dot bg #22c55e, Text "Online"
Item: Dot bg #ef4444, Text "Offline"
```
**Visuell:** `width: 8px; height: 8px; border-radius: 4px; background: <color>`
**Aktuell:** ❌ Fehlt
**Änderung:**
- [ ] `src/schema/dsl.ts`: Dot als Primitive hinzufügen
- [ ] `src/backends/dom.ts`: Dot rendern
- [ ] Default-Styling: `width: 8px; height: 8px; border-radius: 50%`

---

### 3.4 Badge
**Tutorial:** Trailing Badge mit Zahl/Text
```
Item spread:
  Text "Posteingang"
  Badge "12" bg #ef4444
```
**Visuell:** Kleines Pill mit Zahl
**Aktuell:** ❌ Fehlt
**Änderung:**
- [ ] `src/schema/dsl.ts`: Badge als Primitive hinzufügen
- [ ] Default-Styling: `background: #333; padding: 2px 6px; border-radius: 10px; font-size: 11px`

---

### 3.5 Avatar
**Tutorial:** User-Avatar Bild
```
Item:
  Avatar "avatars/anna.jpg"
  Text "Anna Schmidt"
```
**Visuell:** Rundes Bild
**Aktuell:** ❌ Fehlt
**Änderung:**
- [ ] `src/schema/dsl.ts`: Avatar als Primitive (oder Image mit rad 50%)
- [ ] Default-Styling: `width: 24px; height: 24px; border-radius: 50%; object-fit: cover`

---

### 3.6 Swatch
**Tutorial:** Farbvorschau-Box
```
Item: Swatch bg #1a1a1a, Text "Schwarz"
Item: Swatch bg #fff bor 1 #333, Text "Weiß"
```
**Visuell:** Quadrat oder runde Box mit Farbe
**Aktuell:** ❌ Fehlt
**Änderung:**
- [ ] `src/schema/dsl.ts`: Swatch als Primitive hinzufügen
- [ ] Default-Styling: `width: 16px; height: 16px; border-radius: 50%`

---

## 4. STATES

### 4.1 hover
**Verfügbar auf:** Trigger, Item, Tag, Clear
**Aktuell:** ✅ Funktioniert

---

### 4.2 focus
**Verfügbar auf:** Trigger, Search
**Tutorial:** `focus: bor 1 #4f46e5, shadow 0 0 0 3 rgba(79,70,229,0.2)`
**Aktuell:** ❌ Fehlt
**Änderung:**
- [ ] Focus-Ring auf Trigger bei Tab-Navigation

---

### 4.3 open
**Verfügbar auf:** Trigger, Arrow
**Aktuell:** ✅ Funktioniert

---

### 4.4 highlighted
**Verfügbar auf:** Item
**Aktuell:** ✅ Funktioniert
**Test:** Item mit Keyboard/Maus-Focus hat Background

---

### 4.5 selected
**Verfügbar auf:** Item, Check
**Aktuell:** ✅ Funktioniert
**Test:** Ausgewähltes Item hat Farbe, Check ist sichtbar

---

### 4.6 disabled
**Verfügbar auf:** Select, Trigger, Item
**Aktuell:** ✅ Funktioniert

---

### 4.7 invalid
**Verfügbar auf:** Select, Trigger, Value
**Aktuell:** ❌ Fehlt
**Änderung:**
- [ ] Border rot bei invalid
- [ ] Value-Text rot bei invalid

---

### 4.8 placeholder
**Verfügbar auf:** Value
**Tutorial:** `placeholder: col #666, italic`
**Aktuell:** ✅ Funktioniert (Farbe #666)

---

## 5. EVENTS

### 5.1 onchange
**Tutorial:** `Select onchange: updateCountry`
**Details:** `{ value, label }`
**Aktuell:** ❌ Nicht implementiert
**Änderung:**
- [ ] Event dispatchen bei Auswahl-Änderung

---

### 5.2 onopen
**Tutorial:** `Select onopen: trackDropdownOpen`
**Aktuell:** ❌ Nicht implementiert
**Änderung:**
- [ ] Event dispatchen bei Dropdown öffnen

---

### 5.3 onclose
**Tutorial:** `Select onclose: trackDropdownClose`
**Aktuell:** ❌ Nicht implementiert
**Änderung:**
- [ ] Event dispatchen bei Dropdown schließen

---

### 5.4 onselect
**Zag.js:** `onSelect`
**Mirror:**
```
Select onselect: handleSelect:
  Item "A"
```
**Intent:** Sofortiges Event beim Auswählen (vor Schließen)
**Details:** `{ value }`
**Aktuell:** ❌ Fehlt
**Änderung:**
- [ ] Event dispatchen sofort bei Item-Klick

---

### 5.5 onhighlight
**Zag.js:** `onHighlightChange`
**Mirror:**
```
Select onhighlight: handleHighlight:
  Item "A"
```
**Intent:** Event bei Highlight-Änderung (Keyboard/Hover)
**Details:** `{ value, index }`
**Aktuell:** ❌ Fehlt
**Änderung:**
- [ ] Event dispatchen bei Highlight-Änderung

---

## 6. KEYBOARD FEATURES

### 6.1 Typeahead
**Zag.js:** Automatisch
**Mirror:** Default ON
**Verhalten:** Tippen von "A" springt zu erstem Item mit "A"
**Aktuell:** ❌ Fehlt
**Änderung:**
- [ ] `src/runtime/dom-runtime-string.ts`: Keydown-Handler für A-Za-z
- [ ] Buffer mit Timeout (300ms) für mehrere Zeichen

---

### 6.2 Loop
**Zag.js:** `loopFocus`
**Mirror:** Default ON (siehe Property 1.19)
**Verhalten:** ArrowDown am Ende → erstes Item
**Aktuell:** ❌ Fehlt
**Änderung:**
- [ ] Bereits bei Property 1.19 dokumentiert

---

## 7. DATA ATTRIBUTES (Automatisch)

Diese werden von der Runtime automatisch gesetzt:

| Attribut | Wann |
|----------|------|
| `data-state="open\|closed"` | Trigger, Content |
| `data-highlighted` | Item bei Keyboard/Hover |
| `data-selected` | Ausgewähltes Item |
| `data-disabled` | Bei disabled |
| `data-invalid` | Bei invalid |
| `data-readonly` | Bei readonly |
| `data-required` | Bei required |
| `data-placeholder-shown` | Wenn Placeholder sichtbar |
| `data-focus` | Bei Keyboard-Focus |

**Änderung:**
- [ ] `src/runtime/dom-runtime-string.ts`: Alle Attribute automatisch setzen

---

## 8. DEFAULT ICONS

### 8.1 Arrow
**Icon:** `chevron-down`
**Verhalten:** Rotiert 180° bei open
**Aktuell:** ✅ Funktioniert

---

### 8.2 Check
**Icon:** `check` (Single), Checkbox (Multiple)
**Verhalten:** Erscheint bei selected
**Aktuell:** ⚠️ Check funktioniert, Checkbox fehlt

---

### 8.3 Clear
**Icon:** `x`
**Verhalten:** Hover-Effekt
**Aktuell:** ✅ Funktioniert

---

### 8.4 TagDelete (PillRemove)
**Icon:** `x`
**Verhalten:** Hover-Effekt, entfernt Tag
**Aktuell:** ❌ Fehlt (keine Tags)

---

## 9. DEFAULT STYLING

Komplett aus Tutorial übernommen:

### Trigger
```css
background: #1a1a1a;
padding: 7px 10px;
border-radius: 5px;
height: 34px;
border: 1px solid #333;
min-width: 160px;
display: flex;
align-items: center;
gap: 8px;
cursor: pointer;
font-size: 13px;
color: #e0e0e0;
transition: border-color 0.15s;
```

### Trigger States
```css
hover: border-color #444
open: border-color #4f46e5
focus: border-color #4f46e5, box-shadow 0 0 0 3px rgba(79,70,229,0.2)
invalid: border-color #ef4444
disabled: opacity 0.5, cursor not-allowed
```

### Dropdown
```css
background: #1a1a1a;
border-radius: 6px;
border: 1px solid #333;
box-shadow: 0 6px 20px rgba(0,0,0,0.35);
margin-top: 3px;
padding: 3px;
max-height: 200px;
overflow: auto;
min-width: 160px;
```

### Item
```css
padding: 6px 10px;
border-radius: 4px;
display: flex;
align-items: center;
gap: 8px;
cursor: pointer;
font-size: 13px;
color: #e0e0e0;
```

### Item States
```css
hover/highlighted: background #252525
selected: color #4f46e5
disabled: opacity 0.4, cursor not-allowed
```

### Tags Container
```css
display: flex;
flex-wrap: nowrap;
gap: 4px;
overflow: hidden;
flex: 1;
```

### Tag
```css
background: #333;
color: #e0e0e0;
padding: 2px 8px;
border-radius: 3px;
font-size: 12px;
display: flex;
align-items: center;
gap: 4px;
flex-shrink: 0;
white-space: nowrap;
```

### Search Input
```css
background: transparent;
border: none;
border-bottom: 1px solid #333;
padding: 7px 10px;
color: #fff;
width: 100%;
font-size: 13px;
```

### Group Label
```css
font-size: 10px;
color: #666;
text-transform: uppercase;
padding: 6px 10px;
font-weight: 500;
letter-spacing: 0.3px;
```

### Checkbox (bei multiple)
```css
width: 14px;
height: 14px;
border: 1px solid #444;
border-radius: 3px;
display: flex;
align-items: center;
justify-content: center;
```

### Checkbox Selected
```css
background: #4f46e5;
border-color: #4f46e5;
```

---

## 10. PRIORITÄTEN

### KRITISCH (Funktioniert nicht)
1. ✅ **Multiple Tags** - Tags mit X-Button implementiert (renderTags)
2. ✅ **Checkbox bei Multiple** - Checkbox-Style bei Multiple, Checkmark bei Single
3. ✅ **TagDelete Slot** - X-Button in Tags zum Entfernen

### HOCH (Wichtige Features fehlen)
4. **Groups** - Parser + Runtime
5. ✅ **Empty State** - "Keine Ergebnisse" bei Suche ohne Treffer
6. ✅ **keepOpen Property** - Property geparst, Default bei Multiple
7. **Focus State** - Keyboard-Navigation visuell
8. **Typeahead** - A-Za-z Navigation
9. **ItemText Slot** - Für komplexe Items

### MITTEL (Verbesserungen)
10. **Label Slot**
11. **invalid State**
12. **Events** (onchange, onopen, onclose, onselect, onhighlight)
13. **icon-only Property**
14. **open Property** - Initial geöffnet
15. **loop** - Keyboard-Loop (Default ON)
16. **toggle** - Deselect bei Klick

### NIEDRIG (Nice-to-have)
17. readonly, required, name, form, autocomplete
18. placement, offset, dir
19. Slot Aliases im Parser
20. Custom Elements (Dot, Badge, Avatar, Swatch)
21. HiddenSelect für Forms
22. Data Attributes automatisch

---

## 11. DATEIEN

| Datei | Änderungen |
|-------|------------|
| `src/runtime/dom-runtime-string.ts` | Tags, TagDelete, Checkbox, Empty, Groups, Focus, Events, Typeahead, Loop, Toggle, Data-Attributes |
| `src/ir/index.ts` | Groups, label, keepOpen, readonly, invalid, iconOnly, open, loop, toggle |
| `src/parser/parser.ts` | Group erkennen, Slot Aliases, ItemText |
| `src/backends/dom.ts` | name/form/autocomplete hidden input, dir Attribut |
| `src/schema/dsl.ts` | Dot, Badge, Avatar, Swatch Primitives |

---

## 12. TEST-CHECKLISTE

- [x] Basic Select: placeholder, value, defaultValue
- [x] Multiple: Tags mit X, Checkbox-Items
- [x] Searchable: Filter, Empty-State
- [x] Clearable: X-Button, Hover
- [x] Disabled: Select, Items
- [ ] Groups: Label, Items
- [x] Keyboard: Arrow, Enter, Escape, Tab (Typeahead fehlt)
- [ ] Focus: Ring sichtbar
- [x] States: hover, open, highlighted, selected
- [ ] icon-only: Kompakter Button
- [ ] open: Initial geöffnet
- [x] loop: Am Ende zum Anfang (via Keyboard)
- [ ] toggle: Klick auf Selected = Deselect
- [ ] ItemText: Value-Anzeige bei komplexen Items
- [ ] Events: onchange, onopen, onclose, onselect, onhighlight
- [ ] Custom Items: Icon, Dot, Badge, Avatar, Swatch
- [ ] Forms: name, required, HiddenSelect
