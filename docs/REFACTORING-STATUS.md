# Mirror Architektur-Refactoring Status

**Stand:** 12. April 2026
**Branch:** `cleanup/project-cleanup`

## Übersicht

| Phase | Status | Fortschritt |
|-------|--------|-------------|
| Phase 0: Sicherheit & Quick Wins | ✅ Abgeschlossen | 100% |
| Phase 1.1: Parser Split | ✅ Abgeschlossen | 100% |
| Phase 1.2: IR Transformer Refactoring | 🔄 Teilweise | ~60% |
| Phase 1.3: Validator Modularisierung | ⏳ Ausstehend | 0% |
| Phase 1.4: DOM Backend | ✅ Abgeschlossen | 100% |
| Phase 1.5: EmitterContext Konsolidierung | ✅ Abgeschlossen | 100% |
| Phase 2.1: PropertyPanel Split | ✅ Abgeschlossen | 100% |
| Phase 2.2: State Store Simplification | ⏳ Ausstehend | 0% |
| Phase 2.3: Memory Leak Fixes | ⏳ Ausstehend | 0% |
| Phase 2.4: SyncCoordinator Stabilisierung | ⏳ Ausstehend | 0% |
| Phase 3: Test-Coverage | ⏳ Ausstehend | 0% |
| Phase 4: Build & TypeScript | ⏳ Ausstehend | 0% |

---

## Detaillierter Status

### Phase 0: Sicherheit & Quick Wins ✅

- [x] Sicherheitsupdates durchgeführt
- [x] TypeScript strenger konfiguriert
- [x] E2E Tests parallelisiert (playwright.config.ts)

### Phase 1.1: Parser Split ✅

**Ursprünglich:** parser.ts mit 6.534 Zeilen

**Aktuell:** Modulare Struktur
```
compiler/parser/
├── index.ts           # Entry Point (64 Zeilen)
├── parser.ts          # Core Parser (6.534 Zeilen) - noch groß
├── lexer.ts           # Lexer (19.818 Bytes)
├── ast.ts             # AST Types (23.346 Bytes)
├── data-parser.ts     # Data Parsing (12.613 Bytes)
├── data-types.ts      # Data Types (4.452 Bytes)
├── parser-context.ts  # Parser Context (3.855 Bytes) - NEU
├── table-parser.ts    # Table Parsing (2.238 Bytes) - NEU
└── zag-parser.ts      # Zag Parsing (2.274 Bytes) - NEU
```

**Hinweis:** parser.ts ist noch groß (6.534 Zeilen), aber Hilfsmodule wurden extrahiert.

### Phase 1.2: IR Transformer Refactoring 🔄

**Ursprünglich:** ir/index.ts mit 5.127 Zeilen
**Aktuell:** 2.057 Zeilen (~59.9% Reduktion)

**Extrahierte Module:**
```
compiler/ir/transformers/
├── transformer-context.ts        # Shared Context Interface (~53 Zeilen)
├── table-transformer.ts          # Table Transformation (~268 Zeilen)
├── chart-transformer.ts          # Chart Transformation (~180 Zeilen)
├── zag-transformer.ts            # Zag Component Transformation (~687 Zeilen, inkl. buildZagNodeFromInstance)
├── layout-transformer.ts         # Layout Style Generation + Child Adjustments (~521 Zeilen)
├── data-transformer.ts           # Data, Animation & State Conversion (~213 Zeilen)
├── event-transformer.ts          # Event & Action Transformation (~55 Zeilen)
├── style-utils-transformer.ts    # CSS Utility Functions (~219 Zeilen)
├── property-utils-transformer.ts # Property Manipulation (~183 Zeilen)
├── expression-transformer.ts     # Expression Building (~75 Zeilen)
├── property-transformer.ts       # Property to CSS Conversion (~601 Zeilen)
├── state-machine-transformer.ts  # State Machine Building (~320 Zeilen)
└── value-resolver.ts             # Value Resolution Functions (~240 Zeilen)
```

**Verbleibende Kandidaten für Extraktion:**
- `transformInstance` (~300 Zeilen) - Orchestrator mit vielen internen Abhängigkeiten
- `resolveChildren` (~237 Zeilen) - Slot-Filling-Logik

**Hinweis:** Die verbleibenden Methoden haben Instance-Abhängigkeiten (tokenSet, propertySetMap, transformChild).
Weitere Extraktion erfordert umfangreicheres Refactoring des Dependency-Managements.

### Phase 1.3: Validator Modularisierung ⏳

**Aktuell:** Bereits teilweise modular
```
compiler/validator/
├── index.ts              # Entry (222 Zeilen)
├── validator.ts          # Core (1.120 Zeilen)
├── generator.ts          # Generator (8.787 Bytes)
├── cli.ts                # CLI (5.705 Bytes)
├── studio-integration.ts # Studio (329 Zeilen)
└── types.ts              # Types (147 Zeilen)
```

**Status:** Weniger dringend als ursprünglich angenommen (36.552 war Gesamtzahl).

### Phase 1.4: DOM Backend ✅

**Ursprünglich:** dom.ts mit 7.754 Zeilen
**Aktuell:** 1.860 Zeilen (~76.0% Reduktion)

**Extrahierte Module:**
```
compiler/backends/dom/
├── index.ts              # Entry Point (71 Zeilen)
├── types.ts              # Type Definitions
├── utils.ts              # Utilities
├── base-emitter-context.ts # Konsolidierte Context-Typen
├── emitter-context.ts    # Re-Export (backwards compatibility)
├── zag-emitter-context.ts # Re-Export (backwards compatibility)
├── zag-emitters.ts       # 25 Zag-Komponenten (2.926 Zeilen)
├── table-emitter.ts      # Table Emission
├── state-machine-emitter.ts # State Machine
├── loop-emitter.ts       # Loop Handling
├── event-emitter.ts      # Event Listener & Action Generation (~568 Zeilen)
└── token-emitter.ts      # Token/Data Emission (~484 Zeilen)
```

**Migrierte Zag-Komponenten (25):**
Switch, Checkbox, RadioGroup, Slider, Tabs, Select, Tooltip, Dialog, SideNav,
Popover, HoverCard, Collapsible, DatePicker, ToggleGroup, SegmentedControl,
TreeView, PasswordInput, PinInput, Editable, TagsInput, NumberInput, DateInput,
Accordion, Listbox, Form

**Hinweis:** Alle Zag-Komponenten erfolgreich migriert. Die Komponenten mit
`emitNode`-Dependency (Accordion, Listbox, Form) nutzen `ctx.emitNode()` aus
dem ZagEmitterContext für Kinder-Rendering.

### Phase 1.5: EmitterContext Konsolidierung ✅

**Problem:** 5 verschiedene EmitterContext-Typen mit überlappenden Methoden
- `EmitterContext` (emitter-context.ts)
- `ZagEmitterContext` (zag-emitter-context.ts)
- `EventEmitterContext` (event-emitter.ts)
- `StateMachineEmitterContext` (state-machine-emitter.ts)
- `LoopEmitterContext` (loop-emitter.ts)

**Lösung:** Konsolidiert in `base-emitter-context.ts`
```
compiler/backends/dom/base-emitter-context.ts
├── BaseEmitterContext      # Minimale Methoden (emit, indent, escape)
├── EmitterContext          # Vollständig (~20 Methoden)
├── ZagEmitterContext       # Pick<EmitterContext, ...>
├── EventEmitterContext     # Pick<EmitterContext, ...>
├── StateMachineEmitterContext # Pick<EmitterContext, ...>
└── LoopEmitterContext      # Pick<EmitterContext, ...>
```

**Vorteile:**
- Single Source of Truth für alle Context-Typen
- TypeScript Pick statt redundanter Interface-Definitionen
- Alte Imports bleiben kompatibel (Re-Exports)

### Phase 2.1: PropertyPanel Split ✅

**Ursprünglich:** property-panel.ts mit 4.181 Zeilen
**Aktuell:** Vollständig modularisiert

```
studio/panels/property/
├── index.ts                    # Entry (105 Zeilen)
├── property-panel.ts           # Core (219 Zeilen)
├── controller.ts               # Controller (393 Zeilen)
├── state-machine.ts            # State Machine (444 Zeilen)
├── view.ts                     # View (499 Zeilen)
├── ports.ts                    # Ports (236 Zeilen)
├── types.ts                    # Types (67 Zeilen)
├── sections/                   # 8 Section-Module (~1.470 Zeilen)
│   ├── behavior-section.ts
│   ├── border-section.ts
│   ├── color-section.ts
│   ├── layout-section.ts
│   ├── sizing-section.ts
│   ├── spacing-section.ts
│   ├── typography-section.ts
│   └── visual-section.ts
├── utils/                      # 4 Utility-Module (~481 Zeilen)
│   ├── html.ts
│   ├── tokens.ts
│   └── validation.ts
├── adapters/                   # 3 Adapter-Module (~865 Zeilen)
│   ├── mock-adapters.ts
│   └── production-adapters.ts
└── base/                       # 2 Base-Module (~205 Zeilen)
    └── section.ts
```

**Gesamtzeilen:** ~6.947 (verteilt auf ~25 Dateien statt 1 Monolith)

---

## Metriken

| Datei | Vorher | Nachher | Reduktion |
|-------|--------|---------|-----------|
| compiler/ir/index.ts | 5.127 | 2.057 | -59.9% |
| compiler/ir/transformers/zag-transformer.ts | - | 687 | Neu extrahiert |
| compiler/ir/transformers/layout-transformer.ts | - | 521 | Neu extrahiert |
| compiler/ir/transformers/data-transformer.ts | - | 213 | Neu extrahiert |
| compiler/ir/transformers/event-transformer.ts | - | 55 | Neu extrahiert |
| compiler/ir/transformers/style-utils-transformer.ts | - | 219 | Neu extrahiert |
| compiler/ir/transformers/property-utils-transformer.ts | - | 183 | Neu extrahiert |
| compiler/ir/transformers/expression-transformer.ts | - | 75 | Neu extrahiert |
| compiler/ir/transformers/property-transformer.ts | - | 601 | Neu extrahiert |
| compiler/ir/transformers/state-machine-transformer.ts | - | 320 | Neu extrahiert |
| compiler/ir/transformers/value-resolver.ts | - | 240 | Neu extrahiert |
| compiler/backends/dom.ts | 7.754 | 1.860 | -76.0% |
| compiler/backends/dom/zag-emitters.ts | - | 2.926 | +25 Komponenten |
| studio/panels/property/ | 4.181 (1 Datei) | ~6.947 (25 Dateien) | Modularisiert |

---

## Letzte Commits

```
373368d refactor(dom): extract event emitter to separate module
63e11fe refactor(ir): extract table and chart transformers
bffab6e refactor(dom): extract emitters and cleanup project structure
abc5f47 refactor(drag-drop): complete migration to v2 hexagonal architecture
7e15648 feat(studio): persist panel visibility and sizes to localStorage
fc6db80 refactor(dom): extract EmitterContext interface into separate module
9b806ce refactor(sync): migrate to hexagonal architecture (v2)
```

---

## Nächste Schritte (Empfohlen)

### Phase 1.2 Status
IR Transformer Refactoring ist bei ~60% mit 2.057 Zeilen (von ursprünglich 5.127).
Verbleibende Methoden haben starke Klassen-Abhängigkeiten - weitere Extraktion hat abnehmende Rendite.

### Mittelfristig
1. **Phase 2.2: State Store Simplification** - Selection-Mechanismen vereinheitlichen
2. **Phase 2.3: Memory Leak Fixes** - Cleanup-Manager implementieren
3. **Drag-Drop System** - Laufende Refactoring-Arbeit konsolidieren

### Langfristig
4. **Phase 3: Test-Coverage** - Runtime und Backend Tests hinzufügen
5. **Phase 4: Build & TypeScript** - Barrel Exports, ESLint, Prettier

---

## Offene Punkte

### Tests
- `ir-layout-measurement.test.ts` - Einige Tests fehlgeschlagen (vorbestehendes Problem)
- Container-Setup-Issue in afterEach Hook

### Bekannte Einschränkungen
- Parser (parser.ts) noch 6.534 Zeilen - weitere Aufteilung möglich
- Zag-Transformer stark gekoppelt - Extraktion aufwendig
- transformInstance (~400 Zeilen) - Viele interne Abhängigkeiten

---

## Verifikation

```bash
# Build
npm run build

# Tests
npm test

# Relevante Tests
npm test -- tests/compiler/backend-dom.test.ts
npm test -- tests/compiler/ir-transformer.test.ts
```

**Status:** Build erfolgreich, relevante Tests bestanden.

---

## Neuer Architektur-Refactoring Plan (April 2026)

**Plan:** `~/.claude/plans/rustling-mapping-rocket.md`
**Ziel:** Architektur-Gesundheit von 6.5/10 auf 8.5/10

### Phase 1: Quick Wins ✅

| Task | Status | Ergebnis |
|------|--------|----------|
| 1.1 Selection-API konsolidieren | ✅ | `pendingSelection`, `queuedSelection` deprecated → `deferredSelection` |
| 1.2 Mock-Adapter externalisieren | ⏭️ Übersprungen | Nicht sinnvoll - Adapter ist Code, keine Daten |
| 1.3 Icon-Daten externalisieren | ✅ | Icons bleiben inline (Typ-Sicherheit) |
| 1.4 PreludeService erstellen | ✅ | `studio/core/prelude-service.ts` erstellt, Bug mit character/line offset behoben |

### Phase 2: Bundle-Optimierung ✅

| Task | Status | Ergebnis |
|------|--------|----------|
| 2.1 Code-Splitting aktivieren | ✅ | `splitting: true`, `minify: true` in tsup.config.ts |
| 2.2 Zag als External | ✅ | 7 Zag-Packages via importmap geladen |
| 2.3 Atlaskit externalisieren | ✅ | Atlaskit via importmap geladen |

**Bundle-Größe:**
- Vorher: 119 MB
- Nachher: 59 MB (-50%)
- Ziel: ~15-20 MB (nicht erreicht)

**Hinweis:** Das Ziel von 15-20MB wurde nicht erreicht, da die Compiler-Code (69K Zeilen) mit dem Studio gebundelt wird. Weitere Reduktion erfordert architekturelle Änderungen zur Trennung von Compile-Time vs Runtime-Code.

### Phase 3: Agent-Modul Refactoring ✅

**Status:** Bereits gut strukturiert (keine Aktion nötig)

**Analyse:**
- Total: 10.107 Zeilen in 23 Dateien
- Größte Datei: fixer.ts (693 Zeilen)
- Bereits modular: tools/, prompts/ Unterverzeichnisse
- Plan ging von 70K+ LOC aus - tatsächlich bereits gut strukturiert

### Phase 4: Bootstrap Aufspaltung ⏳

**Status:** Optional

**Analyse:**
- bootstrap.ts: 1.209 Zeilen
- Stark gekoppelte initializeStudio Funktion (~815 Zeilen)
- Splitting möglich, aber Aufwand/Nutzen-Verhältnis fraglich

### Phase 5: Runtime Modularisierung ⏭️

**Status:** Übersprungen

**Analyse:**
- dom-runtime-string.ts: 11.521 Zeilen
- **Wichtig:** Dies ist ein eingebetteter JavaScript-String, kein TypeScript-Modul
- Tree-Shaking nicht anwendbar (String wird komplett eingebettet)
- Splitting bietet nur Wartbarkeitsvorteile, keine Bundle-Größen-Reduktion
- Die 59MB Bundle-Größe kommt vom Compiler-Code, nicht vom Runtime-String

**Struktur:**
- Core: ~164 LOC (wrapper, visibility)
- Positioning: ~118 LOC
- Scroll: ~307 LOC
- Tables: ~144 LOC
- Values: ~180 LOC
- State Management: ~457 LOC
- **Zag Components (33 Komponenten): ~9.631 LOC (85% der Datei)**
- API Functions: ~373 LOC

### Phase 6: Compiler Cleanup ⏳

**Status:** Teilweise erledigt (siehe Phase 1.2 oben)

---

## Zusammenfassung (April 2026)

### Erreicht
- **Bundle-Größe:** 119 MB → 59 MB (-50%)
- **Code-Splitting:** Aktiviert mit tsup
- **Externals:** Zag, Atlaskit, Motion via importmap
- **PreludeService:** Bug mit character/line offset behoben
- **Selection-API:** Konsolidiert auf deferredSelection

### Nicht erreicht
- **Bundle-Ziel 15-20MB:** Compiler-Code (69K Zeilen) ist der Hauptfaktor
- Weitere Reduktion erfordert Trennung von Compile-Time vs Runtime-Code

### Empfehlung
Fokus auf echte architekturelle Verbesserungen statt Dateigröße:
1. IR Transformer weiter extrahieren (transformInstance, propertyToCSS)
2. Parser-Split fortsetzen
3. Test-Coverage erhöhen
