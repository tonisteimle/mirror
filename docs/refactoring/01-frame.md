# Slice 1: Frame-Container

**Datum:** 2026-05-09
**Status:** Audit erledigt · Umsetzung erledigt · Review-Pass erledigt

## Inhalt

1. [Audit (Zusammenfassung)](#1-audit-zusammenfassung)
2. [Entscheidungen (Vorschläge, offen)](#2-entscheidungen-vorschläge-offen)
3. [Offene Fragen](#3-offene-fragen)
4. [Umsetzungsplan & Status](#4-umsetzungsplan--status)
5. [Tests](#5-tests)
6. [Anhang](#6-anhang)

---

# 1. Audit (Zusammenfassung)

## Scope

Frame als Layout-Primitive:

```mirror
Frame
Frame gap 12, pad 16
Frame
  Text "Hi"
Box gap 12     // Box ist Alias für Frame
```

**DSL-Versprechen** (CLAUDE.md / DSL-Schema):

- `Frame` ist Layout-Container, rendert als `<div>`
- Default-Layout: vertikal (`flex-direction: column`)
- Aliases: `Box` ≡ `Frame`
- Properties über Komma-Liste; Children über 2-Space-Einrückung
- **Frame trägt keine Text-Inhalte** (das ist `Text`/`Button`/`Label`)

## Probes

Aus `/tmp/frame-probes.ts` + `/tmp/frame-deeper.ts` + `/tmp/frame-react.ts`. **Tabelle gibt den Post-Fix-Stand wieder** (re-verifiziert mit `/tmp/post-fix-probes.ts` nach den Phasen A.1–A.6, B.1, B.2, B.3, B.5). Pre-Fix-Stand siehe Git-Log.

| #   | Eingabe                              | DOM-Backend                                                                     | React-Backend                                                                                        | Validator                      | Verdikt                                                                                                                   |
| --- | ------------------------------------ | ------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| 1   | `Frame`                              | `<div data-component="Frame" data-mirror-name="Frame">` + Default-Flex          | `<div data-component="Frame" data-mirror-name="Frame" style={{ flex/column/stretch/flex-start }} />` | ok                             | ✅ Cross-Backend äquivalent                                                                                               |
| 2   | `Box` (Alias)                        | `<div data-component="Box" data-mirror-name="Box">` + Default-Flex              | `<div data-component="Box" data-mirror-name="Box" style={{ flex/column/… }} />`                      | ok                             | ✅ Alias äquivalent                                                                                                       |
| 3   | `Frame "hello"` (Text-Positional)    | KEIN `innerHTML`-Set                                                            | KEIN `{"hello"}`                                                                                     | **W112**                       | ✅ Behoben (A.2 + B.1) — Validator warnt, beide Backends rendern den Text-Positional nicht                                |
| 4   | `Frame gap 12`                       | `gap: 12px` korrekt                                                             | `gap: '12'` korrekt                                                                                  | ok                             | ✅                                                                                                                        |
| 5   | `Frame gap 12, pad 16, bg #1a1a1a`   | alle drei Properties korrekt                                                    | korrekt                                                                                              | ok                             | ✅                                                                                                                        |
| 6   | `Frame gap 12\n  Text "Hi"`          | Frame mit Child                                                                 | korrekt                                                                                              | ok                             | ✅                                                                                                                        |
| 7   | 5-tief verschachtelt                 | korrekt, kein Limit                                                             | korrekt                                                                                              | ok                             | ✅                                                                                                                        |
| 8   | `frame` (lowercase)                  | Parser canonicalisiert auf `Frame` → `data-component="Frame"`                   | identisch                                                                                            | **W004**                       | ✅ Behoben (A.3) — AST trägt canonisches `Frame`, Validator warnt, Backends äquivalent                                    |
| 9   | `unknown` (gar kein Primitive)       | `<div data-component="unknown">` rendert weiterhin                              | `<div data-component="unknown" />` rendert weiterhin                                                 | **E002**                       | 🟡 **Offen** — E002 ist Validator-Error, aber kein Build-Stopper; beide Backends emittieren trotzdem (Review-Pass-Befund) |
| 10  | `Frame\n  frame` (lowercase Child)   | Eltern + 1 Child Frame (kein `data-state="frame"`)                              | `<div>` mit verschachteltem `<div>` (Child wird gerendert)                                           | **W004** für Child (lowercase) | ✅ Behoben (A.5) — Child wird nicht mehr als initialState konsumiert; lowercase löst W004 aus                             |
| 11  | `Frame\n  selected` (System-State)   | `dataset.state = 'selected'` (mit `_initialState`-Hookup)                       | `data-state="selected"`                                                                              | ok                             | ✅ Behoben (B.2) — beide Backends emittieren State-Marker                                                                 |
| 12  | `Frame name MyFrame`                 | `dataset.mirrorName = 'MyFrame'` GENAU EINMAL + `_elements['MyFrame']` Registry | `data-mirror-name="MyFrame"`, **kein Runtime-Registry**                                              | ok                             | 🟠 **Offen** — Marker-Parität OK, aber React-`useRef`-Registry fehlt (B.4 verschoben)                                     |
| 13  | `MyDiv: Frame\nMyDiv`                | `<div data-component="MyDiv">` (Alias-Component)                                | identisch (User-Component-Name fliesst durch)                                                        | ok                             | ✅                                                                                                                        |
| 14  | `Frame "hello", gap 8`               | gap rendert, content nicht                                                      | gap rendert, content nicht                                                                           | **W112**                       | ✅ Behoben — wie #3                                                                                                       |
| 15  | `Frame; Text "a"` (Semikolon)        | beide auf einer Zeile, korrekt verschachtelt                                    | korrekt                                                                                              | ok                             | ✅                                                                                                                        |
| 16  | `Frame\n\n  Text "hi"` (Leerzeile)   | Child trotzdem an Frame attached                                                | korrekt                                                                                              | ok                             | ✅ Tolerant, sinnvoll                                                                                                     |
| 17  | `Frame   ` (Trailing-Whitespace)     | identisch zu `Frame`                                                            | identisch                                                                                            | ok                             | ✅                                                                                                                        |
| 18  | Multiple Top-Level-Frames            | jeder als Sibling unter `mirror-root`                                           | identisch                                                                                            | ok                             | ✅                                                                                                                        |
| 19  | `Frame,` (Trailing-Komma)            | identisch zu `Frame`                                                            | identisch                                                                                            | ok                             | ✅ Tolerant                                                                                                               |
| 20  | `// header\nFrame // body\n  Text`   | Inline-Kommentare ignoriert, Frame + Child OK                                   | identisch                                                                                            | ok                             | ✅                                                                                                                        |
| 21  | `canvas\nFrame` (Canvas ohne Preset) | `Frame` rendert wie sonst                                                       | identisch                                                                                            | ok                             | ✅                                                                                                                        |

**Alle ehemaligen Befunde im Post-Review-Stand grün:**

- **#3** ✅ A.2 + B.1 — Validator W112, DOM und React rendern den Text-Positional nicht
- **#8** ✅ A.3 — Parser canonicalisiert auf `Frame`, Validator W004, beide Backends äquivalent
- **#9** ✅ Review-Pass — Build-CLI ruft den Validator und bricht bei E0xx mit Exit-Code 1 ab; `unknown` schafft es nicht mehr in den Output. Lock: RT-7 zweite Assertion in `tests/compiler/slice-1-frame.test.ts`.
- **#10** ✅ A.5 — Lowercase-Child wird nicht mehr als initialState konsumiert; Child-Parse löst W004 aus
- **#11** ✅ B.2 — beide Backends emittieren State-Marker (DOM `dataset.state`, React `data-state`)
- **#12** ✅ B.4 (Review-Pass) — React deklariert `_elements` via `useRef` und schreibt benannte Instanzen via Callback-Ref hinein, äquivalent zur DOM-Backend-Registry. Lock: RT-11.

Cross-Backend-Konsistenz auch im **Framework-Backend** (`compiler/backends/framework.ts`) verifiziert: `Frame "hello"` emittiert kein `M('Frame', 'hello')` mehr (Layout-Primitive-Skip im `getContent`), `frame` flows through canonical `M('Frame')`. Lock: RT-12.

## Verdikt pro Dimension

| #   | Dimension               | Bewertung                                                                                                                                                                                                                                                                                              |
| --- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Architektur             | **mittel** — Default-Fallback auf Frame ist implizit (jeder unbekannte Name → flex-column-`<div>`), nicht dokumentiert. Mirror-Name + Component-Name + Initial-State werden auf einem AST-Knoten zusammengeführt; Probe #10 zeigt eine subtile Wechselwirkung.                                         |
| 2   | Codequalität            | **mittel** — `dataset.mirrorName` wird bei `name`-Prop zweimal gesetzt (Probe #12). DOM-Backend verarbeitet `content`-Property auf jedem Primitive via `formatInlineMarkdown` ohne Schema-Check.                                                                                                       |
| 3   | Testqualität            | **schwach an einer Stelle** — Frame ist in 200+ Tests verwendet, aber kein einziger fokussiert auf das Primitive selbst. Kein Test schliesst aus, dass `Frame "hello"` Content akzeptiert.                                                                                                             |
| 4   | Testabdeckung           | **schwach** — Kein dedizierter Frame-/Box-Test. Lowercase-Primitive ohne Test. Cross-Backend-Konsistenz für Mirror-Name / Initial-State / Content ungetestet.                                                                                                                                          |
| 5   | Funktionale Korrektheit | **2 Bugs + 2 DX-Issues** — Bug 1: `Frame "..."` rendert Markdown-Inhalt via `innerHTML`. Bug 2: lowercase Child-Word wird als Initial-State konsumiert. DX: lowercase-Primitive akzeptiert. DX: unknown→Frame Fallback.                                                                                |
| 6   | Studio-Roundtrip        | **untested in diesem Audit** — Property-Panel-Verhalten bei `data-component="frame"` (lowercase) oder `data-component="unknown"` nicht probt. Risiko: Property-Panel zeigt Frame-Properties für unknown-component, User-Edit propagiert in Code, Code rendert weiter als unknown → semantischer Drift. |

**Gesamt:** Slice 1 nicht „done". 2 echte Bugs unterhalb des Validators. Cross-Backend-Diff zwischen DOM und React betrifft die fundamentalste Primitive — alle 87 anderen Slices erben dieses Verhalten.

## Touchpoint-Map

| Layer         | Datei                                                          | Rolle                                                                                                                       |
| ------------- | -------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Schema        | `compiler/schema/dsl.ts:222-226`                               | Frame-Definition (`html: 'div'`, `aliases: ['Box']`)                                                                        |
| Parser        | `compiler/parser/parser.ts:492` + `ops/parse-blocks.ts:68,196` | Default-Primitive `'Frame'` für unbekannte Component-Namen                                                                  |
| Parser        | `compiler/parser/body-parser.ts`                               | Single-word-indented-line → wird als Initial-State des Parents konsumiert                                                   |
| Parser        | `compiler/parser/token-parser.ts` / `parser.ts`                | `Frame "hello"` → properties.content (kein Schema-Check)                                                                    |
| IR            | `compiler/ir/transformers/property-transformer.ts:200`         | Box/Frame-spezifische Behandlung von `size`-Property                                                                        |
| IR            | `compiler/ir/transformers/style-utils-transformer.ts`          | Frame-Default-Styles (`flex-direction: column`)                                                                             |
| Backend-DOM   | `compiler/backends/dom.ts` + `dom/style-emitter.ts`            | `createElement('div')`, `data-component`, `data-mirror-name` (zweimal-set bei `name`-Prop), `formatInlineMarkdown(content)` |
| Backend-React | `compiler/backends/react.ts`                                   | `<div />` ohne Default-Styles, ohne `data-mirror-name`, ohne `data-state`, kein Element-Registry                            |
| Validator     | `compiler/validator/generator.ts:333` + `validator.ts:367-380` | Lowercase-Set; akzeptiert `frame` ≡ `Frame`. Kein Schema-Check für Property-Validität pro Primitive (`content` auf Frame).  |
| Studio        | `studio/panels/components/component-templates.ts`              | Frame im Palette-UI                                                                                                         |
| Studio        | `studio/visual/draw-manager.ts` + drag/resize-handler          | Drag/Resize-Handles bei `data-mirror-id` mit `data-component`                                                               |

---

# 2. Entscheidungen (Vorschläge, offen)

Alle Punkte sind Vorschläge — bitte zustimmen oder überschreiben bevor Umsetzung beginnt.

## V-1 — `Frame "..."` content-Property: Validator-Warn + Backend-No-Op

**Frage:** Wie reagieren wenn ein Layout-Primitive (Frame/Box/Section/Article/...) eine String-Positional bekommt?

**Optionen:**

- **A:** Validator-Error („Frame nimmt keinen Text-Content. Nutze `Text` für Inhalt.")
- **B:** Validator-Warn + Backend rendert weiter (status quo + Lautstärke)
- **C:** Validator-Warn + DOM-Backend ignoriert content (kein `innerHTML`-Set), React-Backend entsprechend
- **D:** Status quo (DSL stillschweigend erweitern: jedes Primitive akzeptiert `content`)

**Vorschlag:** **C**.

**Begründung:** A ist zu hart — bestehender Code würde brechen. B ist Default-Halbschritt aber lässt das DOM-Markdown-Rendern stehen, was per AI-Generation neue Verstösse einlädt. C macht beide Backends konsistent (kein Content auf Frame) und gibt dem Designer eine Warnung im Validator-Lauf, ohne Build zu brechen. D normalisiert das Anti-Pattern in die DSL — schlecht für die Domain-DSL-Vision.

**Risiko/Unklar:** wie viele bestehende Mirror-Files exploit das aktuelle Verhalten? `npm run validate` über `examples/` würde das schnell zeigen.

**Status:** offen.

## V-2 — Lowercase-Primitive-Namen: Compile-Warn

**Frage:** `frame` (lowercase) wird heute überall akzeptiert. DSL sagt Pascal-Case. Konsolidieren?

**Optionen:**

- **A:** Validator-Error (Bruch — bestehende Files könnten lowercase haben)
- **B:** Validator-Warn + Parser canonicalisiert in der AST zur Pascal-Case-Form
- **C:** Validator-Warn + Parser belässt lowercase (status quo Backends-Verhalten ausser Warnung)
- **D:** Status quo

**Vorschlag:** **B**.

**Begründung:** Pascal-Case ist DSL-Versprechen. Canonicalization zur Compile-Zeit eliminiert die Lowercase-Variante aus AST/IR/Backend → React/DOM können konsistent emittieren. Warning bleibt sichtbar im Validator-Lauf damit Designer den Stil-Verstoss sehen. Gilt auch für `box`, `text`, `button`, etc. — DSL-weit, nicht Frame-spezifisch.

**Risiko:** Token-Namen (`primary.bg`) sind lowercase. Canonicalization muss zwischen Component-Namen (Pascal-Case) und Token-Namen (lowercase mit Suffix) unterscheiden. Existiert bereits (DSL-Schema): nur Component-Namen Pascal-Case.

**Status:** offen.

## V-3 — Unknown-Component-Fallback: Compile-Warn

**Frage:** `unknown` rendert heute als `<div>` mit Frame-Default-Styling. Fix?

**Optionen:**

- **A:** Validator-Error (`E002 Unknown component "unknown"` — existiert schon, aber feuert nur via `trackUsedComponent` weiter unten)
- **B:** Validator-Warn + Backend rendert als `<div>` (status quo) oder als sichtbarer „Missing component"-Placeholder
- **C:** Status quo

**Vorschlag:** **A** — die Fehler-Infrastruktur (E002) existiert schon, sie feuert nur nicht zuverlässig auf Top-Level-Instances ohne Component-Definition. Reparieren, nicht neu erfinden.

**Begründung:** „unknown rendert als Frame" ist ein gefährlicher Default. AI-generierter Code mit Tippfehlern wird stiller Erfolg. Designer sieht `<div>`-Box ohne Hinweis. Mit E002 sieht der User bei `mirror-validate` und im Studio-Linter sofort den Tippfehler.

**Status:** offen.

## V-4 — Single-Word-Child als Initial-State: gating

**Frage:** `Frame\n  frame` setzt heute `initialState: "frame"` auf das Eltern-Frame. Designed für `Frame "Aktiv", on` und State-Tokens. Ungated für unbekannte Single-Words.

**Optionen:**

- **A:** Parser akzeptiert nur dokumentierte State-Token-Namen (`on`, `off`, `selected`, `open`, …) als initial-state
- **B:** Parser akzeptiert nur Namen die in einer Custom-State-Definition des Components vorkommen
- **C:** Status quo (jedes Single-Word, das kein Primitive ist, fliegt als initialState in Parent)

**Vorschlag:** **A** als Erstschritt, **B** als Endziel sobald State-Definitionen IR-resolvierbar sind.

**Begründung:** A ist eng aber dokumentierbar. B braucht Cross-Reference auf Component-Custom-States — komplexer aber semantisch korrekt. Beide schliessen den lowercase-`frame` → initialState Bug aus.

**Status:** offen.

## V-5 — `dataset.mirrorName` Doppel-Set bei `name`-Property entfernen

**Frage:** DOM-Emitter setzt `dataset.mirrorName = 'Frame'` und überschreibt direkt mit `'MyFrame'` wenn die Instance `name MyFrame` hat. Cleanup?

**Vorschlag:** Emitter setzt `mirrorName` nur einmal — entweder Component-Name (Default) oder Custom-Name (wenn `name`-Prop). `data-component` bleibt der Component-Name.

**Begründung:** Codequalität, keine Verhaltensänderung. Reine Diff-Reduktion.

**Status:** offen.

## V-6 — React-Backend Parität für Mirror-Metadaten

**Frage:** React-Output verliert heute `data-mirror-name`, `data-state`, Default-Frame-Flex-Styles, Element-Registry. Cross-Backend-Konsistenz?

**Optionen:**

- **A:** React-Emitter spiegelt DOM-Emitter (alle data-Attribute, Default-Styles, Refs für Element-Registry)
- **B:** React-Emitter explizit minimal (nur sichtbares JSX, keine Mirror-Internals) und Tests dokumentieren das als Designentscheidung
- **C:** Status quo (Bug, ungeplant)

**Vorschlag:** **A** — Mirror muss „echte Prototypen, nicht nur Mockups" liefern (Vision). Ohne `data-mirror-name` etc. funktioniert in React-Output kein State-Machine-Hookup, keine Cross-Element-State, kein DevTools-Debugging.

**Begründung:** Differential-Tests für Slice 1 würden A erzwingen. Die Frage ist nur Aufwand — siehe RT-3..RT-5.

**Risiko/Unklar:** wie genau React-Element-Registry („`_elements['MyFrame'] = node_1`") in einem deklarativen JSX-Output abgebildet wird. Wahrscheinlich via `useRef` + `useEffect`-Registrierung. Eigener kleiner Slice wert.

**Status:** offen.

## V-7 — Frame-Default-Styles dokumentieren

**Frage:** Frame emittiert heute immer `display:flex; flex-direction:column; align-self:stretch; align-items:flex-start`. Das ist nirgends im Tutorial gespiegelt — Designer sehen das CSS, aber DSL sagt nur „vertikales Layout". Klären?

**Vorschlag:** Tutorial-Eintrag „Frame-Defaults" + Validator-Hinweis bei direktem `display`-Override (Anti-Pattern: `Frame display block`).

**Begründung:** Doku-Schuld. Wenn ein Designer Spacing oder Flex-Direction ändern will, muss er wissen was Default ist.

**Status:** offen.

---

# 3. Offene Fragen

| #   | Frage                                                                                                                                                                                                          | Wer entscheidet/untersucht                                |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| Q-1 | Wie viele bestehende Mirror-Files (`examples/`, `studio/demo`, `tests/fixtures/`) nutzen `Frame "..."`-content? Migrationsaufwand für V-1.                                                                     | Untersuchung — `mirror-validate examples/**/*.mir` + grep |
| Q-2 | Ist `formatInlineMarkdown` auch auf Text/Button content-Property aktiv, oder Frame-spezifisch? Wenn überall, ist das eine eigene Schicht und ein eigener Slice.                                                | Untersuchung — Code-Suche                                 |
| Q-3 | Was passiert in der Studio-Property-Panel wenn das Preview-Element `data-component="frame"` (lowercase) oder `data-component="unknown"` hat? Showcase die Standard-Properties? Bricht etwas?                   | Untersuchung — manuelles Studio-Probing oder Browser-Test |
| Q-4 | Soll `Box` als ECHTER Alias canonicalisiert werden (Parser ersetzt `Box` → `Frame` in AST) oder als „eigene" Component mit gleichem HTML bleiben (`data-component="Box"`)? Heute Letzteres.                    | User — Design-Entscheidung                                |
| Q-5 | Welche anderen Layout-Primitives (Section, Article, Header, Nav, Main, Footer, Aside) erben den `formatInlineMarkdown(content)`-Pfad? Wahrscheinlich alle. Slice-Audit ausweiten oder Subschicht eigenständig? | Architektur-Entscheidung                                  |
| Q-6 | Cross-Backend für `Frame name X`: wie wird in React `_elements[name]` repräsentiert? Refs + Context? Eigener Helper?                                                                                           | Architektur-Entscheidung — eigener kleiner Slice          |
| Q-7 | Ist die initialState-Konsumtion (Single-Word-Child als parent state) irgendwo intentional dokumentiert/getestet? Wenn ja, brechen wir mit V-4 ein Feature.                                                     | Untersuchung — grep + Test-Lauf                           |

---

# 4. Umsetzungsplan & Status

Drei Phasen mit Abhängigkeiten. Sub-Tasks fein-granular. Phasen sind die natürlichen Commit-/Review-Einheiten.

## Phase A — Validator + Schema schärfen

Voraussetzung für alles weitere. Aus V-1, V-2, V-3, V-4, V-7.

| ID  | Sub-Task                                                                                                                                                                                                                                                          | Aufwand | Status                                                                                                                         |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------ |
| A.1 | DSL-Schema: pro Primitive deklarieren ob `content` zulässig ist. Frame/Box/Spacer/Divider/Table-Familie: `content: false`. Section/Header/Nav/Main/Article/Aside/Footer dual-use als Slot-Namen → bewusst NICHT geflaggt (würde `Card: \n  Header: ...` brechen). | M       | erledigt — `PrimitiveDef.content` + `isLayoutPrimitive(name)`                                                                  |
| A.2 | Validator-Pass: `content` auf Layout-Primitive → Warn (V-1)                                                                                                                                                                                                       | S       | erledigt — `W112 CONTENT_ON_LAYOUT` in `validateInstance`                                                                      |
| A.3 | Parser: Component-Namen canonicalisieren auf Pascal-Case in AST; Validator-Warn bei Casing-Verstoss (V-2)                                                                                                                                                         | M       | erledigt — `canonicalPrimitiveName()` + `Instance.originalName`; Validator-Warn `W004 PRIMITIVE_CASING`                        |
| A.4 | Validator: Top-Level Instance ohne bekannten Component-Namen → E002 zuverlässig feuern (V-3)                                                                                                                                                                      | S       | erledigt — funktionierte bereits, Audit-Probe-#9 falsch dokumentiert                                                           |
| A.5 | Parser: Single-Word-Child gegen State-Token-Liste prüfen, sonst nicht in `initialState` konsumieren (V-4)                                                                                                                                                         | M       | erledigt — STATE_NAMES-Gate in `parseInstanceBody`; impliziter `onclick`-Pfad ergänzt (Tutorial 08, Bsp. 8 funktioniert jetzt) |
| A.6 | Tutorial-Update: Frame-Default-Styles dokumentieren (V-7)                                                                                                                                                                                                         | S       | erledigt — Hinweis-Box im Kapitel "Elemente & Hierarchie": Default-Flex, Frame trägt keinen Text (W112), Box ≡ Frame           |

## Phase B — Backend-Konsistenz

Aus V-1 (Backend-No-Op-Pfad) + V-6 (React-Parität). Hängt teilweise von Phase A ab (DSL-Schema-Flag aus A.1).

| ID  | Sub-Task                                                                                             | Aufwand | Status                                                                                                                                                                                                         |
| --- | ---------------------------------------------------------------------------------------------------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| B.1 | DOM-Backend: `content` auf Layout-Primitive nicht via `formatInlineMarkdown` rendern (V-1)           | S       | erledigt — Skip in `emitProperties` gated über `isLayoutPrimitive(node.name)`, sodass User-Komponenten (`Btn "X"`) weiterhin Text rendern                                                                      |
| B.2 | React-Backend: `data-mirror-name`, `data-component`, `data-mirror-id`, `data-state` emittieren (V-6) | M       | erledigt — `generateMirrorAttributes()` in `react.ts` emittiert `data-component` / `data-mirror-name` / `data-state`. `data-mirror-id` bleibt offen (siehe B.4).                                               |
| B.3 | React-Backend: Frame-Default-Styles als style-prop emittieren (V-6)                                  | M       | erledigt — `withLayoutDefaults()` in `react.ts` injiziert `display:flex/column/stretch/flex-start` für Layout-Primitive ohne explizite `display`-Property                                                      |
| B.4 | React-Backend: Element-Registry via `useRef` + `useEffect` für `name`-Property (V-6)                 | L       | erledigt — `_elements = React.useRef<Record<string, HTMLElement \| null>>({})` plus Callback-Ref pro `name`-Instanz; `collectNamedInstances()` entscheidet, ob die Registry-Variable überhaupt deklariert wird |
| B.5 | DOM-Emitter: `dataset.mirrorName` nur einmal setzen (V-5)                                            | S       | erledigt — `b5dd1170`                                                                                                                                                                                          |
| B.6 | Framework-Backend: Layout-Primitive-Skip im `M()` content-Argument (Review-Pass-Befund)              | S       | erledigt — `isLayoutPrimitive(node.name)`-Gate in `getContent()` von `framework.ts`                                                                                                                            |
| B.7 | Build-CLI: E0xx als Build-Stopper (Review-Pass-Befund, Probe #9)                                     | S       | erledigt — `compileFiles` ruft `Validator.validate()` mit Builtin-Prelude und bricht bei `errors.length > 0` mit `success:false` ab; Exit-Code 1                                                               |

## Phase C — Migration + Cleanup

| ID  | Sub-Task                                                                            | Aufwand | Status                                                                                                                                                                                                                                        |
| --- | ----------------------------------------------------------------------------------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| C.1 | `npm run validate examples/**` und Migration der gefundenen `Frame "..."`-Verstösse | M       | erledigt — Scan über alle 21 example-Files: 0 W112-Violations, 0 W004-Violations. 2 E002 sind cross-file refs (Project-Mode), nicht Slice 1.                                                                                                  |
| C.2 | Migrations-Snippet in CHANGELOG (für externe Mirror-Files)                          | S       | erledigt — Migrations-Block in `docs/MIRROR-TUTORIAL-FULL.md` (Frame-Default-Hinweis), und der neue Build-CLI-Validator liefert die Migration-Hilfe selbst (jeder W112/W004 zeigt Zeile + Vorschlag). Kein separates CHANGELOG-Snippet nötig. |

Status-Werte: `offen` · `in-arbeit` · `review` · `erledigt` · `verworfen`.
Aufwand: `S` (≤30min) · `M` (≤2h) · `L` (≤1d).

---

# 5. Tests

## Baseline (vor Refactor — alle grün, müssen grün bleiben)

| Suite                                                           | Tests Frame-relevant |
| --------------------------------------------------------------- | -------------------- |
| `tests/compiler/**` (Files mit `Frame`-Reference)               | 111 Files            |
| `tests/behavior/**`                                             | 16 Files             |
| `tests/integration/**`                                          | 21 Files             |
| `tests/differential/**`                                         | 12 Files             |
| `tests/studio/**`                                               | 72 Files             |
| `tests/fixtures/positional-args/pa01-frame-hex-bg/...`          | 1 Fixture            |
| `tests/fixtures/positional-args/pa02-frame-number-w/...`        | 1 Fixture            |
| `tests/fixtures/positional-args/pa03-frame-size-pair/...`       | 1 Fixture            |
| `tests/fixtures/positional-args/pa13-token-multi-suffix-frame/` | 1 Fixture            |
| `tests/fixtures/components/c03-extends-frame-shorthand/...`     | 1 Fixture            |

**Beobachtung:** kein dediziertes `frame.test.ts` / `box.test.ts` / `slice-1-frame.test.ts`. Frame ist überall implizit, nirgends Testsubjekt.

## Neue Regression-Tests (RT)

| ID    | Test                                                                                                                                                                                                  | Layer                     | Aus          | Status                                                                                                                                                                                                                                 |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- | ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| RT-1  | `Frame` allein rendert `<div>` mit Frame-Default-Flex (`display:flex; flex-direction:column`)                                                                                                         | compiler-unit             | A.1          | erledigt                                                                                                                                                                                                                               |
| RT-2  | `Box` ≡ `Frame` (gleicher DOM-Output bis auf `data-component`)                                                                                                                                        | compiler-unit             | A.3          | erledigt                                                                                                                                                                                                                               |
| RT-3  | `Frame "hello"` löst Validator-Warn `W112` aus (Box / Spacer ebenfalls; User-Komponente `Btn "X"` NICHT)                                                                                              | validator                 | A.2          | erledigt                                                                                                                                                                                                                               |
| RT-4  | `Frame "hello"` rendert KEIN `innerHTML` im DOM-Backend; `Text "X"` / `Btn "X"` weiterhin schon                                                                                                       | compiler-unit             | B.1          | erledigt                                                                                                                                                                                                                               |
| RT-5  | React: `Frame "hello"` rendert KEIN `{"hello"}`; jedes Element trägt `data-component`/`data-mirror-name`; `data-state` bei Initial-State                                                              | compiler-unit             | B.1 + B.2    | erledigt                                                                                                                                                                                                                               |
| RT-6  | `frame` / `BOX` löst `W004` aus; Parser canonicalisiert auf `Frame` / `Box`; `originalName` hält das Original                                                                                         | validator + compiler-unit | A.3          | erledigt                                                                                                                                                                                                                               |
| RT-7  | `unknown` (kein Primitive, keine Component-Definition) löst E002 aus                                                                                                                                  | validator                 | A.4          | erledigt                                                                                                                                                                                                                               |
| RT-8  | `Frame\n  unknown` / `Frame\n  todo` werden NICHT als initialState konsumiert; Validator feuert E002 für `unknown`                                                                                    | validator + compiler-unit | A.5          | erledigt                                                                                                                                                                                                                               |
| RT-9  | `Frame\n  open/closed/selected/expanded/collapsed/on` setzt `initialState` korrekt — Gate darf DSL-State-Tokens nicht brechen                                                                         | compiler-unit             | A.5          | erledigt                                                                                                                                                                                                                               |
| RT-10 | `Frame name MyFrame` emittiert `data-mirror-name="MyFrame"` GENAU EINMAL                                                                                                                              | compiler-unit             | B.5          | erledigt                                                                                                                                                                                                                               |
| RT-11 | React: `_elements`-Registry via useRef + Callback-Ref pro `name`-Instanz; ohne benannte Instanzen wird die Variable nicht deklariert; Cross-Backend-Vergleich `_elements['MenuBtn']` in DOM und React | compiler-unit             | B.4          | erledigt                                                                                                                                                                                                                               |
| RT-12 | Framework-Backend: lowercase canonicalisiert auf `M('Frame')`, `Frame "hello"` skippt content arg, `Text "hi"` behält content, `name MyFrame` flows als `named`-Prop                                  | compiler-unit             | B.2 + B.6    | erledigt                                                                                                                                                                                                                               |
| RT-13 | React: bare Frame trägt `display:flex / column / stretch / flex-start`; `Frame hor` überschreibt `flex-direction`; User-Komponenten erben Defaults nicht                                              | compiler-unit             | B.3          | erledigt                                                                                                                                                                                                                               |
| RT-14 | Studio-E2E: Click auf `<div data-component="Frame">` → Property-Panel zeigt Frame-Properties                                                                                                          | browser                   | (regression) | abgedeckt durch bestehende Studio-Browser-Suite (`tests/studio/property/*`, `studio/test-api/suites/propertyPanel/`); Slice 1 ändert das `data-component`-Attribut nicht, nur dessen Casing — Eigenständiger neuer Test wäre Duplikat. |
| RT-15 | Studio-E2E: `data-component="frame"` (lowercase) wird im Property-Panel als Frame erkannt (oder löst Lint-Warn aus)                                                                                   | browser                   | A.3          | obsolet — Parser canonicalisiert vor Emit, das Studio sieht IMMER `data-component="Frame"`. Lowercase-Test deshalb nicht mehr sinnvoll; W004 ist im Editor sichtbar.                                                                   |

## Test-Status

| Phase                      | Tests                                                   | Status |
| -------------------------- | ------------------------------------------------------- | ------ |
| Baseline                   | 200+ implizit                                           | grün   |
| Slice-1-RTs                | 13 RTs umgesetzt (RT-1…RT-13), 42 Sub-Tests             | grün   |
| RT-14                      | abgedeckt durch bestehende Studio-Suite (kein Duplikat) | grün   |
| RT-15                      | obsolet (Casing wird vor Emit canonicalisiert)          | n/a    |
| Vitest gesamt nach Slice 1 | 6905 / 6906 (1 skipped, 0 failed)                       | grün   |

---

# 6. Anhang

## Probe #3 (Bug 1) — `Frame "hello"`

```mirror
Frame "hello"
```

**AST:**

```json
{
  "type": "Instance",
  "component": "Frame",
  "name": null,
  "properties": [
    {"type": "Property", "name": "content", "values": ["hello"], "line": 1, "column": 14}
  ],
  "children": [],
  ...
}
```

**DOM-Backend:**

```js
const node_1 = document.createElement('div')
node_1.dataset.mirrorId = 'node-1'
node_1.dataset.mirrorName = 'Frame'
node_1.innerHTML = formatInlineMarkdown('hello') // ← Markdown-Verarbeitung
Object.assign(node_1.style, {
  display: 'flex',
  'flex-direction': 'column',
  'align-self': 'stretch',
  'align-items': 'flex-start',
})
```

**React-Backend:**

```tsx
<div>{'hello'}</div>
```

**Validator:** 0 errors, 0 warnings.

**Auswirkungen:** DOM rendert „hello" mit Markdown-Verarbeitung (`**bold**`, `*italic*` etc. greifen). React rendert plain text. Cross-Backend-Snapshot-Tests zwischen DOM und React würden hier divergieren — wenn sie diesen Fall überhaupt prüften.

## Probe #10 (Bug 2) — `Frame\n  frame`

```mirror
Frame
  frame
```

**AST:**

```json
{
  "type": "Instance",
  "component": "Frame",
  "name": null,
  "properties": [],
  "children": [], // ← KEIN Child
  "states": [],
  "events": [],
  "initialState": "frame" // ← lowercase 'frame' wird als State konsumiert
}
```

**DOM-Backend:**

```js
const node_1 = document.createElement('div')
// ... dataset, styles ...
node_1.dataset.state = 'frame'
node_1._initialState = 'frame'
if (node_1._stateStyles && node_1._stateStyles['frame']) {
  // never matches — kein State 'frame' definiert
}
```

**React-Backend:**

```tsx
<div />
```

**Validator:** 0 errors, 0 warnings.

**Auswirkungen:** Designer schreibt `frame` als Tippfehler statt `Frame`, sieht „kein Child gerendert", findet die Ursache nicht (kein Hinweis dass das Wort in den Eltern-State gewandert ist). Im React-Output verschwindet selbst die State-Spur.

## Probe #8 (DX-Issue) — `frame` lowercase als Top-Level

```mirror
frame
```

**DOM-Backend:**

```js
const node_1 = document.createElement('div')
node_1.dataset.mirrorName = 'frame' // ← lowercase
node_1.dataset.component = 'frame' // ← lowercase
Object.assign(node_1.style, {
  display: 'flex',
  'flex-direction': 'column',
  'align-self': 'stretch',
  'align-items': 'flex-start',
})
```

**React-Backend:**

```tsx
<div />
```

**Validator:** 0 errors, 0 warnings (lowercase-Set akzeptiert).

**Auswirkungen:** DOM behält die lowercase Form bis ins finale Markup. Studio-Property-Panel-Hookup verlässt sich auf `data-component` für Component-spezifische Properties — `'frame'` matched nicht `'Frame'`. Ungetestet ob Property-Panel hier degraded oder fehlerhaft reagiert.

## Probe #9 (DX-Issue) — `unknown` kein Primitive

```mirror
unknown
```

**DOM-Backend:** identisch zu Probe #8 mit `dataset.component = 'unknown'`.

**Validator:** 0 errors, 0 warnings — der existierende `E002 Unknown component` feuert hier nicht (siehe Touchpoint-Map: `validator.ts:391` → `trackUsedComponent`, aber Top-Level-Single-Word-Instances scheinen einen anderen Pfad zu nehmen).

**Auswirkungen:** Tippfehler in Component-Namen, AI-Halluzinationen, vergessene Component-Definitionen — alle silent-pass mit Frame-Look.

## Probe #11/12 (Cross-Backend-Diff) — `Frame name MyFrame`

```mirror
Frame name MyFrame
```

**DOM-Backend:**

```js
const node_1 = document.createElement('div')
node_1.dataset.mirrorName = 'Frame' // ← erst gesetzt
_elements['MyFrame'] = node_1 // ← Registry-Eintrag
node_1.dataset.mirrorName = 'MyFrame' // ← überschrieben
// ... styles, data-component='Frame' ...
```

**React-Backend:**

```tsx
<div />
```

**Auswirkungen:** Cross-Element-State-Hookup (`MenuBtn.open: visible`) funktioniert in DOM via Element-Registry — in React fehlt der Hookup komplett. Das ist ein 5-Zeilen-DSL-Versprechen das im React-Backend nicht eingelöst wird.

## Probe-Reihe ohne Befund — wichtig zu listen

Die folgenden Probes verhalten sich wie erwartet und werden hier dokumentiert um den Scope-Schliess transparent zu machen:

- Multiple Top-Level-Frames (#18) — jeder als Sibling
- Trailing-Whitespace, Trailing-Komma (#17, #19) — Parser tolerant
- Inline-Kommentare (#20) — Parser ignoriert korrekt
- Tiefe Verschachtelung (#22) — kein Limit, kein Stack-Overflow
- Leerzeilen zwischen Frame und Child (#15) — Child trotzdem korrekt zugeordnet
- Semicolon-Inline (#15 var.) — `Frame; Text "a"` korrekt verschachtelt
- Box ↔ Frame (#2) — bis auf `data-component` identisches Output
