# Refactoring Prioritäten

> Erstellt: 2026-04-14
> Analyse-Basis: Zeilenanzahl, Git-History (3 Monate), Code-Struktur

## Zusammenfassung: Die 3 dringendsten Refactorings

1. **`studio/app.js` aufteilen** - 8007 Zeilen, 104 Commits in 3 Monaten. Enthält alles: Editor, Compiler-Integration, Color Picker, Animation Picker, File Management, Drop Handling. Blockiert Feature-Entwicklung und verursacht Merge-Konflikte.

2. **`compile()` in `app.js` extrahieren** - 300 Zeilen, macht 6+ Dinge. Sollte zu einem klaren `CompileService` werden mit separaten Schritten.

3. **`handleStudioDrop()` in `app.js` aufteilen** - 350 Zeilen, behandelt 5+ verschiedene Drop-Szenarien. Sollte Strategy Pattern verwenden.

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

| #   | Datei                              | Funktion/Bereich     | Zeilen | Problem                                                                                                            | Vorgeschlagene Lösung                                                                                                               | Priorität |
| --- | ---------------------------------- | -------------------- | ------ | ------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- | --------- |
| 1   | `studio/app.js`                    | Gesamtstruktur       | 8007   | Monolithische Datei mit 100+ Funktionen, 104 Commits in 3 Monaten, häufige Merge-Konflikte                         | Aufteilen in Module: `editor/`, `pickers/`, `file-ops/`, `compile/`                                                                 | **Hoch**  |
| 2   | `studio/app.js`                    | `compile()`          | ~300   | Macht 6+ Dinge: Prelude-Handling, Parse, IR, Codegen, DOM-Update, Studio-Sync, Token-Preview, Component-Preview    | Extrahieren zu `CompileService` mit klaren Schritten: `prepareSource()`, `parseAndTransform()`, `renderPreview()`, `updateStudio()` | **Hoch**  |
| 3   | `studio/app.js`                    | `handleStudioDrop()` | ~350   | Behandelt 5+ Szenarien: Element Move, Element Duplicate, Absolute Position, Palette Drop, Zag Components (4 Cases) | Strategy Pattern: `DropHandler` Interface mit `ElementMoveHandler`, `PaletteDropHandler`, `ZagDropHandler`                          | **Hoch**  |
| 4   | `studio/app.js`                    | Color Picker         | ~800   | UI-Logik mit globalen Variablen, inline CSS-Strings, Event-Handler vermischt                                       | Extrahieren zu `pickers/color-picker/` mit eigener Klasse, Template-Datei, Event-Handling                                           | **Hoch**  |
| 5   | `studio/app.js`                    | Animation Picker     | ~400   | Gleiche Probleme wie Color Picker                                                                                  | Extrahieren zu `pickers/animation-picker/`                                                                                          | Mittel    |
| 6   | `compiler/parser/parser.ts`        | Gesamtstruktur       | 6024   | Sehr große Datei, aber bereits teilweise extrahiert (zag-parser.ts)                                                | Weitere Extraktion: `expression-parser.ts`, `property-parser.ts`, `instance-parser.ts`                                              | Mittel    |
| 7   | `compiler/runtime/dom-runtime.ts`  | Gesamtstruktur       | 5103   | 50+ exportierte Funktionen in einer Datei, verschiedene Concerns gemischt                                          | Aufteilen: `state.ts`, `overlay.ts`, `scroll.ts`, `data-loading.ts`, `form-navigation.ts`                                           | Mittel    |
| 8   | `compiler/backends/dom.ts`         | `generateDOM()`      | ~2000  | Eine riesige Funktion mit vielen if/else-Zweigen                                                                   | Visitor Pattern: `EmitContext` + `NodeVisitor` Interface, separate Emitter pro Node-Typ                                             | Mittel    |
| 9   | `studio/desktop-files.js`          | Gesamtstruktur       | 1347   | Mix aus File-Ops, UI-Updates, Server-Kommunikation                                                                 | Aufteilen: `file-service.ts`, `file-tree-ui.ts`, `server-sync.ts`                                                                   | Mittel    |
| 10  | `compiler/studio/code-modifier.ts` | Gesamtstruktur       | 2676   | Viele ähnliche Methoden für verschiedene Modifikationen                                                            | Refactoren zu Command Pattern mit kleineren, fokussierten Modifier-Klassen                                                          | Niedrig   |

---

## Detailanalyse

### 1. studio/app.js (8007 Zeilen)

**Warum höchste Priorität:**

- 104 Commits in 3 Monaten = täglich geändert
- Jede Änderung birgt Risiko für unbeabsichtigte Seiteneffekte
- Entwickler müssen 8000 Zeilen verstehen, um eine kleine Änderung zu machen

**Identifizierte Bereiche:**

```
Zeilen   1-300:   Imports, Konstanten, File Extensions
Zeilen 300-500:   Mode Switching (Mirror/React)
Zeilen 500-900:   File Operations (meist Legacy)
Zeilen 900-1800:  Syntax Highlighting
Zeilen 1800-2700: Color Picker
Zeilen 2700-3600: Animation Picker
Zeilen 3600-4400: Editor Setup
Zeilen 4400-4800: compile()
Zeilen 4800-5600: Token/Component Preview
Zeilen 5600-5800: Notification Handlers
Zeilen 5800-6400: Chat Panel, LLM Integration
Zeilen 6400-6800: handleStudioDrop()
Zeilen 6800-8000: Zag Helpers, Init, Misc
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
├── pickers/
│   ├── color/          # Color Picker Module
│   └── animation/      # Animation Picker Module
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
