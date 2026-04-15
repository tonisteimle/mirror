# Refactoring Prioritäten

> Erstellt: 2026-04-14
> Analyse-Basis: Zeilenanzahl, Git-History (3 Monate), Code-Struktur

## Zusammenfassung

### ✅ Abgeschlossen (2026-04-15)

| Refactoring                                 | Vorher      | Nachher      | Reduktion |
| ------------------------------------------- | ----------- | ------------ | --------- |
| `studio/app.js` Module-Extraktion           | 7046        | 3660         | **-48%**  |
| `handleStudioDrop()` → Drop Module          | ~350 inline | ~50 wrapper  | ✅        |
| `compile()` → Clean Code Renderer           | ~500 inline | Module       | ✅        |
| Zag Helpers → `studio/zag/`                 | ~415 inline | 450 (Modul)  | ✅        |
| FILE_TYPES → `studio/file-types/`           | ~209 inline | 313 (Modul)  | ✅        |
| React Converter → `studio/react-converter/` | ~449 inline | 546 (Modul)  | ✅        |
| YAML Parser → `studio/yaml-parser/`         | ~135 inline | 246 (Modul)  | ✅        |
| Color Utilities → `studio/pickers/color/`   | ~67 inline  | Modul        | ✅        |
| **Color Picker → FullColorPicker**          | ~860 inline | 2109 (Modul) | ✅        |
| **Color Palettes entfernt**                 | ~795 inline | in Modul     | ✅        |

### ⏳ Verbleibend

1. **Parser Extraktion (6024 Zeilen)** - `expression-parser.ts`, `property-parser.ts`. Priorität: **Mittel**

2. **Code Modifier (2676 Zeilen)** - Command Pattern Migration. Priorität: **Niedrig**

---

## Clean Code Prinzipien

**Diese Regeln gelten für jedes Refactoring:**

| Regel                               | Beschreibung                                                          |
| ----------------------------------- | --------------------------------------------------------------------- |
| **Funktionen < 10 Zeilen**          | Jede Funktion macht genau eine Sache. Wenn sie länger ist, aufteilen. |
| **Single Responsibility**           | Eine Klasse/Modul hat einen Grund sich zu ändern.                     |
| **Aussagekräftige Namen**           | `calculateInsertionIndex()` statt `calc()`                            |
| **Keine Kommentare nötig**          | Code erklärt sich selbst durch gute Namen                             |
| **Keine verschachtelten Callbacks** | Extrahiere in benannte Funktionen                                     |
| **Max. 2 Parameter**                | Mehr? → Objekt-Parameter oder aufteilen                               |

**Beispiel - So nicht:**

```javascript
function handleDrop(source, target, event, editor, state) {
  // 50 Zeilen mit if/else...
}
```

**Beispiel - So ja:**

```javascript
function handleDrop(context: DropContext): void {
  const handler = this.findHandler(context.source)
  handler.execute(context)
}

private findHandler(source: DropSource): DropHandler {
  return this.handlers.find(h => h.canHandle(source))
}
```

---

## Referenz: So sieht guter Code aus

Die neuen Drag-Controller-Dateien zeigen den Zielzustand:

| Datei                                    | Zeilen | Methoden         | Beschreibung                           |
| ---------------------------------------- | ------ | ---------------- | -------------------------------------- |
| `studio/preview/drag/drag-controller.ts` | 207    | 5-15 pro Methode | Koordiniert, delegiert an Spezialisten |
| `studio/preview/drag/layout-cache.ts`    | 115    | 4 public         | Fokussierte Verantwortung              |
| `studio/preview/drag/hit-detector.ts`    | 71     | 1 Hauptmethode   | Single Responsibility                  |

---

## Priorisierte Refactoring-Liste

| #     | Datei                                 | Funktion/Bereich         | Zeilen   | Problem                                                                                                                                                                                                                                                                                                               | Vorgeschlagene Lösung                                                                                                                                                                                                                                                                                                                                                                                                                                | Priorität       |
| ----- | ------------------------------------- | ------------------------ | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- |
| 1     | `studio/app.js`                       | Gesamtstruktur           | 4978     | Monolithische Datei, ~2068 Zeilen entfernt (-29%). Noch inline: Color Picker (~900), Notification Handlers                                                                                                                                                                                                            | Color Picker braucht HTML-Migration. Weitere Reduktion durch Legacy-Code-Entfernung möglich.                                                                                                                                                                                                                                                                                                                                                         | **Hoch**        |
| ~~2~~ | ~~`studio/app.js`~~                   | ~~`compile()`~~          | ~~~300~~ | ~~Macht 6+ Dinge~~                                                                                                                                                                                                                                                                                                    | ~~Refactored (2026-04-15)~~ - TokenRenderer + ComponentRenderer integriert, ~525 Zeilen alte Inline-Funktionen entfernt                                                                                                                                                                                                                                                                                                                              | ✅ **Erledigt** |
| ~~3~~ | ~~`studio/app.js`~~                   | ~~`handleStudioDrop()`~~ | ~~~350~~ | ~~Behandelt 5+ Szenarien~~                                                                                                                                                                                                                                                                                            | ~~Refactored (2026-04-15)~~ - Drop Module integriert via handleStudioDropNew(), ~380 Zeilen alte Funktionen entfernt                                                                                                                                                                                                                                                                                                                                 | ✅ **Erledigt** |
| 4     | `studio/app.js`                       | Color Picker             | ~900     | UI-Logik inline. **Modul existiert:** `studio/pickers/color/` (2 Dateien, 901 Zeilen). Inline-Code nutzt HTML-Elemente in index.html                                                                                                                                                                                  | ⚠️ **Komplexe Migration**: Braucht HTML-Änderungen in index.html (canvas, tabs, grids). Modul generiert dynamisches HTML.                                                                                                                                                                                                                                                                                                                            | **Mittel**      |
| ~~5~~ | ~~`studio/app.js`~~                   | ~~Animation Picker~~     | ~~961~~  | ~~Gleiche Probleme wie Color Picker~~                                                                                                                                                                                                                                                                                 | ~~Gelöscht (2026-04-14)~~ - TypeScript-Version existiert: `studio/pickers/animation/`                                                                                                                                                                                                                                                                                                                                                                | ✅ **Erledigt** |
| 6     | `compiler/parser/parser.ts`           | Gesamtstruktur           | 6024     | Sehr große Datei, aber bereits teilweise extrahiert (zag-parser.ts)                                                                                                                                                                                                                                                   | Weitere Extraktion: `expression-parser.ts`, `property-parser.ts`, `instance-parser.ts`                                                                                                                                                                                                                                                                                                                                                               | Mittel          |
| ~~7~~ | ~~`compiler/runtime/dom-runtime.ts`~~ | ~~Gesamtstruktur~~       | ~~5103~~ | ~~50+ exportierte Funktionen in einer Datei~~                                                                                                                                                                                                                                                                         | ~~Refactored (2026-04-14)~~ - 23 Module extrahiert (5539 Zeilen): `types.ts`, `batching.ts`, `cleanup.ts`, `visibility.ts`, `overlay.ts`, `data.ts`, `data-binding.ts`, `clipboard.ts`, `input-control.ts`, `navigation.ts`, `state-machine.ts`, `selection.ts`, `charts.ts`, `toast.ts`, `icons.ts`, `animations.ts`, `form-navigation.ts`, `scroll.ts`, `security.ts`, `alignment.ts`, `element-wrapper.ts`, `component-navigation.ts`, `timer.ts` | ✅ **Erledigt** |
| 8     | `compiler/backends/dom.ts`            | `generateDOM()`          | 1875     | **Vollständig integriert:** `dom/` Unterverzeichnis (9506 Zeilen, 25 Dateien). Alle Module integriert: `style-emitter.ts`, `node-emitter.ts`, `animation-emitter.ts`, `api-emitter.ts`, `chart-emitter.ts`, `table-emitter.ts`, `loop-emitter.ts`, `event-emitter.ts`, `state-machine-emitter.ts`, `token-emitter.ts` | Reduktion von 2466 → 1875 Zeilen (-24%). Kern-Koordinationslogik bleibt in dom.ts                                                                                                                                                                                                                                                                                                                                                                    | ✅ **Erledigt** |
| ~~9~~ | ~~`studio/desktop-files.js`~~         | ~~Gesamtstruktur~~       | ~~1347~~ | ~~Mix aus File-Ops, UI-Updates, Server-Kommunikation~~                                                                                                                                                                                                                                                                | ~~Refactored zu `studio/files/` (2026-04-14)~~ - 12 Dateien, 1794 Zeilen, alle Funktionen <10 Zeilen                                                                                                                                                                                                                                                                                                                                                 | ✅ **Erledigt** |
| 10    | `compiler/studio/code-modifier.ts`    | Gesamtstruktur           | 2676     | Viele ähnliche Methoden für verschiedene Modifikationen                                                                                                                                                                                                                                                               | Refactoren zu Command Pattern mit kleineren, fokussierten Modifier-Klassen                                                                                                                                                                                                                                                                                                                                                                           | Niedrig         |

---

## Detailanalyse

### 1. studio/app.js (3660 Zeilen, Stand: 2026-04-15)

**Warum höchste Priorität:**

- 104 Commits in 3 Monaten = täglich geändert
- Jede Änderung birgt Risiko für unbeabsichtigte Seiteneffekte
- Entwickler müssen 3660 Zeilen verstehen, um eine kleine Änderung zu machen

**Fortschritt (2026-04-15):**

- TokenRenderer + ComponentRenderer integriert (-525 Zeilen)
- handleStudioDrop() durch Drop Module ersetzt (-380 Zeilen)
- Zag Helpers durch Clean Code Module ersetzt (-415 Zeilen)
- FILE_TYPES durch Clean Code Module ersetzt (-209 Zeilen)
- React-to-Mirror Converter extrahiert (-449 Zeilen)
- YAML Parser extrahiert (-135 Zeilen)
- Color Konvertierungsfunktionen extrahiert (-67 Zeilen) → `studio/pickers/color/palette.ts`
- Canvas Color Picker Modul erstellt → `studio/pickers/color/canvas-picker.ts`
- **Color Picker zu FullColorPicker migriert** (-456 Zeilen) → `studio/pickers/color/full-picker.ts`
- **Color Palettes entfernt** (-795 Zeilen) → jetzt in FullColorPicker Modul
- Animation Picker bereits gelöscht (2026-04-14)
- **Gesamtreduktion: ~3386 Zeilen (-48%)**

**Status: Nahezu Limit erreicht**

Die verbleibenden ~3660 Zeilen bestehen aus:

- **Syntax Highlighting (~100 Zeilen)**: CodeMirror-spezifisch, nicht extrahierbar
- **File Operations (~200 Zeilen)**: Gekoppelt an `window.desktopFiles` und globales `files`
- **Inline Token Handler (~80 Zeilen)**: Gekoppelt an DOM und file operations
- **Preview Zoom/Chat Panel (~200 Zeilen)**: DOM-Element-gekoppelt
- **compile() (~300 Zeilen)**: Verwendet Clean Code Module, aber hat viele DOM-Abhängigkeiten
- **initStudio/updateStudio (~400 Zeilen)**: Studio initialization, stark gekoppelt
- **Image Upload/LLM Integration (~150 Zeilen)**: DOM-gekoppelt, API-Keys
- **Color Picker Integration (~100 Zeilen)**: Token extraction, editor integration

Weitere Extraktion erfordert:

1. **Fundamentale Architekturänderung**: Dependency Injection für DOM-Referenzen
2. **File Operations Extraktion**: Entkopplung von window.desktopFiles

**Identifizierte Bereiche (aktualisiert):**

```
Zeilen   1-200:   Imports, Module Wrappers (Zag, FileTypes, YAML, React, Color)
Zeilen 200-500:   Mode Switching, File Operations, Playground
Zeilen 500-660:   Syntax Highlighting
Zeilen 660-900:   Color Picker Integration (FullColorPicker, token extraction)
Zeilen 900-1300:  Icon Picker, Token Handler, Editor Setup
Zeilen 1300-1700: Fixer, compile() (nutzt Clean Code Renderer)
Zeilen 1700-2200: initStudio, Play Mode
Zeilen 2200-2500: Zoom, Notification Handlers
Zeilen 2500-3100: Chat Panel, updateStudio
Zeilen 3100-3660: Undo/Redo, Init, LLM Integration
```

**Vorgeschlagene Modulstruktur:**

```
studio/
├── app.ts              # ~200 Zeilen: Entry Point, initApp()
├── editor/
│   ├── setup.ts        # CodeMirror Setup
│   ├── extensions.ts   # Plugins, Keymaps
│   └── highlighting.ts # Syntax Highlighting
├── compile/
│   ├── compile-service.ts  # Koordination
│   ├── prelude-builder.ts  # Prelude-Handling
│   └── preview-renderer.ts # DOM-Rendering
├── pickers/                # ✅ Vollständig
│   ├── base/           # BasePicker, KeyboardNav (existiert)
│   ├── color/          # ✅ FullColorPicker (2109 Zeilen, 4 Dateien)
│   └── animation/      # ✅ Animation Picker (existiert)
├── drop/
│   ├── drop-service.ts     # Koordination
│   ├── element-handler.ts  # Element Move/Duplicate
│   ├── palette-handler.ts  # Palette Drops
│   └── zag-handler.ts      # Zag Component Handling
└── legacy/
    └── file-operations.ts  # Legacy-Funktionen
```

### 2. compile() Funktion (4421-4721)

**Was sie aktuell macht:**

1. Prelude-Code zusammenbauen
2. AST parsen
3. IR transformieren
4. Code generieren
5. DOM aktualisieren
6. Studio-State updaten
7. Component Palette aktualisieren
8. Token-Preview rendern
9. Component-Preview rendern
10. Performance-Logging

**Besser wäre:**

```typescript
class CompileService {
  compile(code: string): CompileResult {
    const resolved = this.preludeBuilder.resolve(code, fileType)
    const parsed = this.parser.parse(resolved)
    const ir = this.transformer.transform(parsed)
    const output = this.generator.generate(ir)
    return { parsed, ir, output }
  }
}

class PreviewRenderer {
  render(result: CompileResult, preview: HTMLElement): void {
    // DOM-spezifische Logik
  }
}
```

### 3. handleStudioDrop() Funktion (6411-6760)

**Aktuelle Komplexität:**

```
if source.type === 'element'
  if isDuplicate → duplicateNode()
  elif placement === 'absolute' → updatePosition()
  else → moveNode()
elif source.type === 'palette'
  if isZagComponent
    if droppingIntoComponentsFile
      if existingDef → info message
      else → create definition only
    else (mir file)
      if existingDef → use it
      else → create in .com + instance in .mir
  else → standard addChild()
```

**Besser mit Strategy Pattern:**

```typescript
interface DropHandler {
  canHandle(source: DropSource): boolean
  handle(source: DropSource, target: DropTarget): ModResult
}

const handlers: DropHandler[] = [
  new ElementMoveHandler(),
  new ElementDuplicateHandler(),
  new AbsolutePositionHandler(),
  new ZagComponentHandler(),
  new StandardComponentHandler(),
]

function handleDrop(source, target) {
  const handler = handlers.find(h => h.canHandle(source))
  return handler?.handle(source, target)
}
```

---

## Priorisierungskriterien

**Hoch:**

- Wird täglich geändert (>20 Commits/Monat)
- Verursacht regelmäßig Merge-Konflikte
- Blockiert Feature-Entwicklung
- Enthält mehrere unabhängige Concerns

**Mittel:**

- Groß aber seltener geändert (<10 Commits/Monat)
- Funktioniert, aber schwer zu verstehen
- Neue Features erfordern tiefes Verständnis

**Niedrig:**

- Stabil, selten angefasst
- Isoliert (keine externen Abhängigkeiten)
- Refactoring wäre "nice to have"

---

## Git-History Analyse

```
Häufigste Änderungen (3 Monate):
104 studio/app.js
 51 studio/bootstrap.ts
 41 compiler/backends/dom.ts
 38 compiler/ir/index.ts
 35 studio/panels/property-panel.ts
 34 studio/panels/components/component-panel.ts
 33 studio/desktop-files.js
 30 studio/core/state.ts
 28 studio/core/events.ts
 27 compiler/parser/parser.ts
```

---

## Nicht im Scope

- `node_modules/`
- `dist/`
- Test-Dateien
- Generierte Dateien
- `compiler/runtime/parts/zag-runtime.ts` (9297 Zeilen) - Externe Library-Integration
