# Refactoring Plan: `col` / `bg` Separation

## Ziel
- `col` = Textfarbe (immer)
- `bg` = Hintergrundfarbe (immer)
- Keine Magic-Logik mehr basierend auf Komponententyp

## Entscheidungen
- **`textCol` entfernen** - redundant, nur noch `col`
- **Auto-Contrast entfernen** - immer explizit `col` angeben

---

## Phase 1: Core Logic (3 Dateien)

### 1.1 Properties Definition
**Datei:** `src/dsl/properties.ts`

- `bg` zu `PROPERTIES` Set hinzufügen
- `bg` zu `COLOR_PROPERTIES` Set hinzufügen
- `hover-bg` hinzufügen
- `CONTAINER_COMPONENTS` und `TEXT_COMPONENTS` Sets entfernen

### 1.2 Style Converter
**Datei:** `src/utils/style-converter.ts`

- `isContainerComponent()` Funktion entfernen
- `CONTAINER_COMPONENTS` und `TEXT_COMPONENTS` Imports entfernen
- `col` Case ändern: immer → `style.color`
- `bg` Case hinzufügen: immer → `style.backgroundColor`
- Auto-Contrast-Logik komplett entfernen
- `textCol` Case entfernen
- `hover-col` → `style.color` (nicht mehr backgroundColor)
- `hover-bg` → `style.backgroundColor` hinzufügen
- `getContrastTextColor()` Funktion entfernen

### 1.3 Property Parser
**Datei:** `src/parser/property-parser.ts`

- `bg` als gültige Property erkennen (sollte automatisch funktionieren)

---

## Phase 2: Library Components (20 Dateien, ~30 Änderungen)

**Regel:** Alle `col $surface`, `col $primary`, `col $overlay` etc. → `bg`

| Datei | Änderungen |
|-------|------------|
| alert-dialog.ts | 3x `col` → `bg` |
| avatar.ts | 1x |
| collapsible.ts | 1x |
| context-menu.ts | 2x |
| dialog.ts | 3x |
| dropdown.ts | 3x |
| hover-card.ts | 1x |
| menubar.ts | 2x |
| navigation-menu.ts | 1x |
| popover.ts | 1x |
| progress.ts | 1x |
| radio-group.ts | 2x |
| scroll-area.ts | 1x |
| select.ts | 2x |
| slider.ts | 2x |
| textarea.ts | 1x |
| toast.ts | 2x |
| toggle-group.ts | 1x |
| toolbar.ts | 1x |
| tooltip.ts | 1x |

**Kein Ändern:** alert.ts, tabs.ts, switch.ts (nutzen `col` korrekt für Text)

---

## Phase 3: Tests (31 Dateien, ~600 Instanzen)

### Strategie:
1. Core-Test zuerst: `bg-col-priority.test.ts`
2. Parser-Tests anpassen
3. Integration-Tests durchgehen
4. Alle `textCol` → `col` ändern

### Priorität:
| Datei | Instanzen |
|-------|-----------|
| documentation-examples.test.ts | 191 |
| integration/examples.test.ts | 112 |
| validation/llm.test.ts | 72 |
| parser/component-parser.test.ts | 39 |
| core/parser.test.ts | 39 |
| features/system-states.test.ts | 21 |
| utils/bg-col-priority.test.ts | 12 |

---

## Phase 4: Dokumentation (~470 Instanzen)

| Datei | Instanzen |
|-------|-----------|
| mirror-docu.html | ~369 |
| reference.html | ~102 |

### Ersetzungslogik:
```
Container-Komponenten (ändern):
  Card col #xxx      → Card bg #xxx
  Box col #xxx       → Box bg #xxx
  Button col #xxx    → Button bg #xxx
  Header col #xxx    → Header bg #xxx

Text-Komponenten (NICHT ändern):
  Text col #xxx      → bleibt
  Title col #xxx     → bleibt
  Label col #xxx     → bleibt
```

---

## Phase 5: Hover Properties

- `hover-col` für Container → `hover-bg`
- `hover-col` für Text → bleibt

---

## Zusammenfassung

| Bereich | Dateien | Instanzen |
|---------|---------|-----------|
| Core Logic | 3 | ~20 Zeilen |
| Library | 20 | ~30 |
| Tests | 31 | ~600 |
| Dokumentation | 2 | ~470 |
| **Gesamt** | **56** | **~1100** |

---

## Verifizierung

1. `npm run test` - Alle Tests grün
2. `npm run dev` - Manuell testen:
   - `Button bg #blue` → blauer Hintergrund
   - `Text col #red` → roter Text
   - `Card bg #dark, col #white` → dunkler Hintergrund, weißer Text
3. Dokumentation deployen und Playgrounds testen

---

## Reihenfolge

1. **Core Logic** (Phase 1)
2. **Ein Test fixen** als Proof of Concept
3. **Library Components** (Phase 2)
4. **Restliche Tests** (Phase 3)
5. **Dokumentation** (Phase 4)
6. **Finaler Test & Deploy**
