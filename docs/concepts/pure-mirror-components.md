# Pure Mirror Components - Blueprint

## Konzept

Pure Mirror Komponenten sind Zag-Komponenten (Checkbox, Switch, Slider, etc.), deren **Struktur vollständig im Mirror-Code definiert** ist. Das ermöglicht:

1. **Sichtbarkeit**: Die Struktur ist im Editor lesbar und editierbar
2. **Übersetzbarkeit**: Ein LLM kann die Komponente nach React/Vue/Svelte übersetzen
3. **Anpassbarkeit**: Designer können Farben, Größen, Abstände direkt ändern

### Vorher (Zag-Runtime)

```mirror
Checkbox "Newsletter"
// → Struktur in TypeScript versteckt (230+ Zeilen in zag-runtime.ts)
// → Nicht editierbar, nicht übersetzbar
```

### Nachher (Pure Mirror)

```mirror
Checkbox as Label: hor, gap 8, cursor pointer, toggle()
  Control: Frame w 18, h 18, rad 4, bor 2, boc #3f3f46, center
    hover:
      boc #888
    on:
      bg #5BA8F5, boc #5BA8F5
  Indicator: Icon "check", is 12, col white, opacity 0, scale 0.8
    on:
      opacity 1, scale 1
  Content: Slot

// Verwendung bleibt einfach
Checkbox "Newsletter"
```

---

## Architektur-Übersicht

### Beteiligte Dateien

| Datei                                                  | Änderung                                                 |
| ------------------------------------------------------ | -------------------------------------------------------- |
| `studio/panels/components/component-templates.ts`      | `PURE_COMPONENT_DEFINITIONS` - Definition der Komponente |
| `studio/drop/handlers/pure-component.ts`               | Handler für Palette-Drop                                 |
| `studio/drop/drop-service.ts`                          | Handler-Registrierung (vor ZagComponentHandler!)         |
| `compiler/ir/transformers/state-styles-transformer.ts` | CSS-basierte State-Propagation                           |
| `compiler/ir/index.ts`                                 | Slot-Content-Projektion                                  |
| `compiler/backends/dom/style-emitter.ts`               | CSS-Emission für Parent-States                           |
| `studio/test-api/suites/zag/[component].test.ts`       | Komponenten-Tests                                        |
| `studio/test-api/suites/zag/drag-and-style.test.ts`    | Drag & Drop Tests                                        |

### Datenfluss

```
1. Palette-Drop
   └── PureComponentHandler.canHandle()
       ├── Prüft: Ist es ein Pure Component? (hasPureComponentDefinition)
       ├── Prüft: Hat es KEINE children/mirTemplate?
       └── Wenn ja → handle()

2. handle()
   ├── Definition existiert? → Nur Instanz einfügen
   └── Definition fehlt? → Definition + Instanz einfügen

3. Compiler
   ├── Parser → AST
   ├── IR-Transformation
   │   ├── State-Propagation (toggle() → on:)
   │   └── Slot-Content-Projektion (Content: Slot → Text)
   └── DOM-Backend → CSS + HTML
```

---

## Schritt-für-Schritt Anleitung

### Schritt 1: Pure Definition erstellen

**Datei:** `studio/panels/components/component-templates.ts`

```typescript
export const PURE_COMPONENT_DEFINITIONS: Record<string, PureComponentDefinition> = {
  // Bestehend: Checkbox, Switch

  // NEU: Weitere Komponente
  ComponentName: {
    structure: `ComponentName as Primitive: properties, toggle()
  Slot1: Frame ...
    on:
      ... // Aktiv-Zustand
  Slot2: ...
  Content: Slot`,
    accessibility: {
      role: 'checkbox', // ARIA role
      ariaChecked: true, // Dynamisch aus State
    },
    hiddenInput: true, // Generiert verstecktes <input>
  },
}
```

#### Regeln für die Definition

1. **Primitive auswählen**
   - `as Label` → Clickable, semantisch korrekt für Form-Controls
   - `as Button` → Für Buttons, Triggers
   - `as Frame` → Für Container ohne spezielle Semantik

2. **toggle() für State-Machine**
   - Ermöglicht `on:` States in Children
   - Wechselt zwischen `default` und `on` bei Klick

3. **on: States für visuelle Änderungen**
   - Werden via CSS-Propagation vom Parent gesteuert
   - Selector: `[data-state="on"] [data-mirror-id="child-id"]`

4. **Content: Slot für Instanz-Text**
   - `Checkbox "Newsletter"` → "Newsletter" erscheint im Slot
   - Slot wird durch Text-Node ersetzt

### Schritt 2: Handler-Prüfung

**Datei:** `studio/drop/handlers/pure-component.ts`

Der `PureComponentHandler` ist bereits implementiert. Er:

- Prüft ob `hasPureComponentDefinition(componentName)` true ist
- Ignoriert Drops mit `children` oder `mirTemplate` (→ ZagComponentHandler)
- Fügt Definition ein, falls nicht vorhanden
- Fügt Instanz ein

**Wichtig:** In `drop-service.ts` muss `PureComponentHandler` VOR `ZagComponentHandler` registriert sein!

### Schritt 3: State-Propagation prüfen

**Datei:** `compiler/ir/transformers/state-styles-transformer.ts`

States die propagiert werden (`PROPAGATABLE_STATES`):

- `on` (für toggle())
- `selected` (für exclusive())
- `open` (für Dialoge)

Wenn ein Child einen `on:` State hat UND der Parent eine State-Machine hat:
→ Generiere CSS mit Parent-Selector

```css
/* Generiert für Child mit on: state */
[data-state='on'] [data-mirror-id='child-id'] {
  background: #5ba8f5;
}
```

### Schritt 4: Slot-Content-Projektion prüfen

**Datei:** `compiler/ir/index.ts` (in `transformInstance` / `resolveChildren`)

Wenn:

- Komponente hat `Content: Slot`
- Instanz hat einen String-Wert (`Checkbox "Newsletter"`)

Dann:

- Ersetze Slot durch Text-Node mit dem String-Wert

### Schritt 5: Tests schreiben

#### A) Komponenten-Tests (`pure-[component].test.ts`)

Kategorien:

1. **Struktur & Rendering** (4-5 Tests)
   - Korrektes HTML-Element (label, button, etc.)
   - Korrekte Layout-Properties (hor, gap)
   - Korrekte Dimensionen der Slots
   - Border/Radius/Colors

2. **Slot Content Projection** (3-4 Tests)
   - Text wird projiziert
   - Verschiedene Texte
   - Langer Text
   - Sonderzeichen

3. **State Propagation** (4-5 Tests)
   - toggle() ändert data-state
   - Child-Styles ändern sich bei Parent-State
   - Cycling (on → default → on)
   - Multiple unabhängige Instanzen

4. **Indicator/Visual Feedback** (2-3 Tests)
   - Opacity-Änderung
   - Scale-Änderung
   - Farb-Änderung

5. **Starting State** (2-3 Tests)
   - Mit `on` Attribut starten
   - Kann ge-unchecked werden
   - Mixed initial states

6. **Custom Styling** (2-3 Tests)
   - Custom Farben
   - Ohne Indicator
   - Größere/kleinere Variante

7. **Layout Variations** (3 Tests)
   - In verticalem Layout
   - In horizontalem Layout
   - In Grid

8. **Edge Cases** (3-4 Tests)
   - Leerer Text
   - Rapid toggling
   - Viele Instanzen

9. **Data Attributes** (2 Tests)
   - data-state korrekt
   - data-mirror-id vorhanden

10. **Click Targets** (2 Tests)
    - Klick auf Parent toggles
    - Klick auf Child toggles Parent

#### B) Drag & Drop Tests (`drag-and-style.test.ts`)

Kategorien:

1. **Definition Auto-Insert** (4 Tests)
   - Erster Drop fügt Definition ein
   - Zweiter Drop dupliziert NICHT
   - Position nach Tokens
   - Position vor anderen Elementen

2. **Instance Creation** (2 Tests)
   - Instanz hat Label-Text
   - Multiple Instanzen möglich

3. **Functionality After Drop** (2 Tests)
   - Gedropte Komponente ist funktional
   - Struktur ist vollständig

4. **Different Containers** (2 Tests)
   - Drop in nested Frame
   - Drop in horizontal Layout

5. **Existing Definition** (1 Test)
   - Erkennt bestehende Definition

---

## Checkliste für neue Komponente

```markdown
### [ComponentName] → Pure Mirror

- [ ] 1. Definition in `PURE_COMPONENT_DEFINITIONS` hinzufügen
  - [ ] Struktur mit allen Slots
  - [ ] toggle()/exclusive() für State-Machine
  - [ ] on:/selected: States für Children
  - [ ] Content: Slot für Text-Projektion
  - [ ] Accessibility-Properties

- [ ] 2. Alte Tests identifizieren und entfernen
  - [ ] `studio/test-api/suites/zag/[component].test.ts`

- [ ] 3. Neue Tests erstellen
  - [ ] `studio/test-api/suites/zag/pure-[component].test.ts` (~40 Tests)
  - [ ] Drag-Tests in `drag-and-style.test.ts` aktualisieren (~12 Tests)

- [ ] 4. Index-Dateien aktualisieren
  - [ ] `studio/test-api/suites/zag/index.ts`
  - [ ] `studio/test-api/suites/index.ts`

- [ ] 5. Verifizieren (PFLICHT - Konvertierung ist erst abgeschlossen wenn ALLE Tests grün sind!)
  - [ ] `npm run build` erfolgreich
  - [ ] `npm test` erfolgreich (Unit-Tests)
  - [ ] Browser-Tests für neue Komponente: `npm run test:browser:progress -- --filter="Pure [Component]"`
  - [ ] Browser-Tests für Drag & Drop: `npm run test:browser:progress -- --filter="[Component] Drag"`
  - [ ] Alle Browser-Tests: `npm run test:browser:progress --all` (keine Regressionen!)
```

---

## Komponenten-Spezifische Hinweise

### Checkbox ✅ (Implementiert)

```mirror
Checkbox as Label: hor, gap 8, cursor pointer, toggle()
  Control: Frame w 18, h 18, rad 4, bor 2, boc #3f3f46, center
    hover:
      boc #888
    on:
      bg #5BA8F5, boc #5BA8F5
  Indicator: Icon "check", is 12, col white, opacity 0, scale 0.8
    on:
      opacity 1, scale 1
  Content: Slot
```

- State-Machine: `toggle()` (on/default)
- Slots: Control, Indicator, Content
- Accessibility: `role="checkbox"`, `aria-checked`

### Switch ✅ (Implementiert)

```mirror
Switch as Label: hor, gap 8, cursor pointer, toggle()
  Track: Frame w 44, h 24, rad 99, bg #3f3f46, relative
    on:
      bg #5BA8F5
  Thumb: Frame w 20, h 20, rad 99, bg white, absolute, x 2, y 2
    on:
      x 22
  Content: Slot
```

- State-Machine: `toggle()` (on/default)
- Slots: Track, Thumb, Content
- Besonderheit: Thumb bewegt sich (x 2 → x 22)

### RadioGroup (TODO)

```mirror
RadioGroup as Frame: gap 8
  Content: Slot

RadioItem as Label: hor, gap 8, cursor pointer, exclusive()
  Control: Frame w 18, h 18, rad 99, bor 2, boc #3f3f46, center
    selected:
      boc #5BA8F5
  Indicator: Frame w 10, h 10, rad 99, bg #5BA8F5, opacity 0, scale 0.5
    selected:
      opacity 1, scale 1
  Content: Slot
```

- State-Machine: `exclusive()` (nur einer in Gruppe aktiv)
- State: `selected:` statt `on:`
- Zwei Komponenten: RadioGroup + RadioItem

### Slider (TODO)

```mirror
Slider as Frame: w full, h 24, relative, cursor pointer
  Track: Frame w full, h 4, rad 2, bg #3f3f46, absolute, y 10
  Range: Frame h 4, rad 2, bg #5BA8F5, absolute, y 10
  Thumb: Frame w 16, h 16, rad 99, bg white, shadow md, absolute, y 4
    hover:
      scale 1.1
    active:
      scale 0.95
```

- Keine toggle()/exclusive() - braucht Drag-Interaktion
- Wert-basiert (min, max, value)
- Komplexer: Range-Breite und Thumb-Position sind dynamisch

### Tabs (TODO)

```mirror
Tabs as Frame: gap 0
  TabList: Frame hor, gap 0, bor 0 0 1 0, boc #3f3f46
    Content: Slot
  TabContent: Frame pad 16
    Content: Slot

Tab as Button: pad 12 16, col #888, cursor pointer, exclusive()
  selected:
    col white, bor 0 0 2 0, boc #5BA8F5
  Content: Slot
```

- State-Machine: `exclusive()` pro TabList
- Zwei Komponenten: Tabs-Container + Tab
- Shows/hides Content basierend auf selected Tab

### Dialog (TODO)

```mirror
Dialog as Frame: toggle()
  Trigger: Button
    Content: Slot
  Backdrop: Frame fixed, x 0, y 0, w full, h full, bg #00000080, hidden
    open:
      visible
  Panel: Frame fixed, center, bg #1a1a1a, rad 12, pad 24, shadow lg, hidden
    open:
      visible
    Content: Slot
```

- State-Machine: `toggle()` mit State `open:`
- Trigger öffnet, Backdrop/X schließt
- Portal-Rendering (fixed positioning)

---

## Bekannte Einschränkungen

1. **Dynamische Werte** (Slider-Position, Progress-Bars)
   - Nicht rein CSS-basiert möglich
   - Braucht Runtime für Wert-Updates

2. **Komplexe Keyboard-Navigation**
   - Tabs: Arrow-Keys zum Wechseln
   - Select: Typeahead
   - Muss in Runtime implementiert bleiben

3. **Accessibility-Updates**
   - `aria-checked`, `aria-selected` ändern sich
   - Braucht kleine Runtime-Helfer

4. **Form-Integration**
   - Hidden-Inputs für Form-Submit
   - Braucht Runtime für `name` und `value`

---

## Migration einer Komponente

### 1. Analyse

```bash
# Finde alle Referenzen zur alten Komponente
grep -r "ComponentName" studio/test-api/
grep -r "ComponentName" compiler/runtime/
```

### 2. Definition erstellen

1. Studiere die bestehende Zag-Runtime-Implementation
2. Extrahiere die visuelle Struktur
3. Übersetze CSS → Mirror Properties
4. Füge State-Machine hinzu (toggle/exclusive)
5. Füge on:/selected: States hinzu

### 3. Tests aktualisieren

1. Kopiere `pure-checkbox.test.ts` als Template
2. Passe Komponenten-Namen und Struktur an
3. Passe erwartete Werte an (Farben, Dimensionen)
4. Aktualisiere Drag-Tests

### 4. Verifizieren

```bash
npm run build
npm test
npm run test:browser:progress -- --filter="Pure ComponentName"
```

---

## Referenz-Implementierung

Die vollständige Checkbox-Implementierung dient als Referenz:

- **Definition:** `studio/panels/components/component-templates.ts:27-48`
- **Handler:** `studio/drop/handlers/pure-component.ts`
- **Tests:** `studio/test-api/suites/zag/pure-checkbox.test.ts` (42 Tests)
- **Drag-Tests:** `studio/test-api/suites/zag/drag-and-style.test.ts:118-417`
