# Feature Testing Pyramid

> Eine systematische Test-Strategie pro DSL-Feature über fünf Schichten —
> von kompiliertem Output bis zu Real-App-Integration. Ziel: Mirror auf
> das Test-Niveau von TypeScript/Svelte/Babel bringen, sodass Refactoring
> _enabled_ statt blockiert wird.
>
> **Components** ist das Worked Example dieses Dokuments. Die etablierten
> Patterns sollen anschließend auf `tokens`, `bind`, `each`, `if`,
> `toggle/exclusive`, `layout`, `properties`, `events`, `actions` etc.
> übertragen werden.

## Problem

Heute (Stand 2026-04-26) hat Mirror ~10000 Unit-Tests, ~85% Line-Coverage,
und nach 10 Tieren Hypothesis-Hunting + Smoke-Tests gegen Real-Apps wurden
**20 Compiler-Bugs** gefunden. Aber:

- Die Smoke-Tests prüfen nur, dass _irgendwas_ rendert — nicht **was**.
- Die Tutorial-Tests sind gut für Lehrbuch-Beispiele, nicht für Edge-Cases.
- Wir haben **keine Output-Snapshots**. Jede unabsichtliche Codegen-Drift
  geht durch, solange sie zufällig kompilierbar bleibt.
- Wir haben **keine Behavior-Spec**. Die Semantik der Sprache ist nur
  in `MIRROR-TUTORIAL-FULL.md` als Prosa dokumentiert, nicht ausführbar.
- Wir haben **kein Per-App-Contract**. Multi-File-Apps können stillschweigend
  brechen, wenn die Bug-Symptome nicht in unsere generischen Smoke-Asserts
  fallen.

Industriestandard für Compiler (TypeScript-Baselines, Svelte-Fixtures,
Babel-Plugin-Snapshots, rustc UI-Tests) ist eine Pyramide aus **Golden
Files + Behavior-Tests + Acceptance**. Das übertragen wir auf Mirror.

## Die Fünf Schichten

### Schicht 1 — Golden Fixtures (Compile-Output)

Pro Feature ein Verzeichnis mit Eingabe + erwartetem Output:

```
tests/fixtures/<feature>/<case>/
  input.mirror              ← DSL-Quelle
  expected.dom.js           ← normalisierter DOM-Backend-Output
  expected.html             ← gerenderter DOM (innerHTML, IDs gestrippt)
  expected.css              ← extrahierte :root-Tokens
```

**Normalisierung** (sonst ist alles brittle):

- numerische `node_NN`-IDs → `node_<n>` (Position behalten)
- Zeitstempel/Random/Path-Spuren entfernen
- `_runtime`-Prelude separat ausgliedern (nicht pro Test redundant prüfen)

**Workflow**: erstmal manuell akzeptieren (`UPDATE_GOLDEN=1 npm test`),
danach jede Drift im PR-Diff sichtbar. Reviewer entscheidet: bewusste
Änderung → Snapshot updaten und kommentieren; unbeabsichtigt → Bug.

**Was das fängt**: jede Codegen-Drift, jede Reihenfolgeänderung in
emittierten Properties, jede neue Whitespace-Quirk, neue Runtime-Helper-
Aufrufe, geänderte Variable-Naming-Schemas.

**Was das nicht fängt**: Logik-Bugs deren Output zufällig _aussieht wie_
das Erwartete (selten, aber möglich).

### Schicht 2 — Behavior Spec (Runtime-Semantik)

Pro Feature eine Suite, die **observable Semantik** prüft, nicht den
Output-String. Beispiel:

```ts
it('Component-Override überschreibt Definition-Property', () => {
  const root = render(`
    Btn: pad 10, bg #333
    Btn "X", bg #f00
  `)
  const btn = root.querySelector('button')!
  expect(getComputedStyle(btn).backgroundColor).toBe('rgb(255, 0, 0)')
  expect(getComputedStyle(btn).padding).toBe('10px')
})
```

**Charakter**: jsdom + computedStyle + querySelector. Robust gegen
Codegen-Refactoring (überlebt z.B. Wechsel von Inline-Style auf CSS-Klasse,
solange das Element die spezifizierte Farbe hat).

**Was das fängt**: Logik-Bugs, falsche Property-Resolution-Reihenfolge,
falsche Slot-Auflösung, defekte State-Übergänge, Daten-Binding-Lecks.

**Was das nicht fängt**: Output-Drift die observable irrelevant ist
(redundante Properties, größerer Bundle, dead Code).

### Schicht 3 — Per-App-Contract (Acceptance)

Pro relevanter Real-App in `examples/` ein Vertrag, der die _gemeinte_
App-Semantik festhält:

```ts
// hotel-checkin.contract.test.ts
it('hotel-checkin: 4 Schritt-Indikatoren initial sichtbar', () => { … })
it('hotel-checkin: Klick auf Step 2 ohne Pflichtfelder bleibt auf Step 1', () => { … })
it('hotel-checkin: Stornieren öffnet Confirm-Dialog', () => { … })
```

**Charakter**: User-flow-orientiert. Was ein Designer/Tester erwarten würde,
wenn er die App benutzt.

**Was das fängt**: Integrations-Probleme die auf unteren Schichten
unsichtbar sind, z.B. Reihenfolge-Probleme zwischen Daten-Init und
First-Render, oder State-Konflikte zwischen mehreren Features.

### Schicht 4 — Differential Testing (Backend-Konsistenz)

DOM, React, Framework-Backend müssen **observable übereinstimmen** für
gemeinsam unterstützte Inputs:

```ts
const sources = [
  /* corpus relevant für das Feature */
]
for (const src of sources) {
  it(`${src}: DOM und React rendern dieselbe Struktur`, () => {
    const dom = renderDOM(src)
    const react = renderReact(src)
    expect(structuralDiff(dom, react)).toEqual([])
  })
}
```

Wo Backends Features _nicht_ unterstützen (z.B. React-Backend hat kein
`each`), wird das **explizit dokumentiert** statt verschwiegen — eine
Markdown-Tabelle pro Feature: "DOM ✅, React ❌ (no each support),
Framework ✅".

**Was das fängt**: Backend-spezifische Bugs (#13, #14 aus Tier-9), die
Codegen-Inkonsistenzen die nur in einem Backend Auswirkungen haben.

### Schicht 5 — Regression Pin (Past Bugs)

Jeder gefixte Bug bekommt einen Test in der Behavior-Suite des
betroffenen Features, mit Bug-Nummer im Test-Namen:

```ts
it('Bug #17 — zwei `each`-Loops über $tasks im selben Scope rendern beide', () => { … })
```

**Charakter**: kurz, fokussiert, geht direkt auf die Bedingung des
ursprünglichen Failures. Stirbt erst, wenn der Bug-Befund obsolet ist.

## Worked Example: Components

### Sub-Features

Mirror-Components umfassen:

| ID  | Sub-Feature                  | Beispiel                                               |
| --- | ---------------------------- | ------------------------------------------------------ |
| C1  | Definition                   | `Card: pad 16, bg #fff`                                |
| C2  | Definition mit `as`          | `PrimaryBtn as Button: bg blue`                        |
| C3  | Definition extends Primitive | `StatusBadge: Frame pad 8, bg blue`                    |
| C4  | Definition extends Component | `DangerBtn as Btn: bg red`                             |
| C5  | Multi-Level-Inheritance      | `A as B`, `B as C` — wo C ein Primitive ist            |
| C6  | Instanziierung               | `Card "Title"`                                         |
| C7  | Instance-Property-Override   | `Btn "X", bg #f00`                                     |
| C8  | Slot-Definition              | `Card: …\n  Title: fs 18\n  Body: gap 8`               |
| C9  | Slot-Verwendung              | `Card\n  Title "Hello"\n  Body\n    Text "Content"`    |
| C10 | Slot-Default-Inhalt          | Slot ohne explizite Children im Instance               |
| C11 | Slot-Property-Override       | `Card\n  Title bg #f00 "Hello"`                        |
| C12 | Komponente in Komponente     | `Card: …\n  Btn pad 8` — Btn ist ein anderer Component |
| C13 | Component mit States         | `Btn: bg #333\n  hover:\n    bg #444`                  |
| C14 | Component mit `toggle()`     | `Like: bg #333, toggle()\n  on:\n    bg red`           |
| C15 | Component mit `exclusive()`  | `Tab: pad 12, exclusive()`                             |
| C16 | Instance mit initialem State | `Btn "Aktiv", on`                                      |
| C17 | Component mit Events         | `Btn: …\n  onclick: toast("Hi")`                       |
| C18 | Component-Reuse mehrfach     | `Btn "A"\nBtn "B"` — Instanzen teilen keinen State     |
| C19 | Component-Name = Primitive   | `Button: pad 12` — überschreibt Default-Button         |
| C20 | Self-Reference (Rekursion)   | `TreeNode: …\n  TreeNode "child"` — verboten?          |

### Schicht 1: Golden Fixtures (`tests/fixtures/components/`)

20 Fixtures, je eine pro Sub-Feature. Mehrheitlich klein (3-15 Zeilen
input.mirror), wenige größere für Slot- und Inheritance-Kombinationen.

Beispielhaft `tests/fixtures/components/c01-basic-definition/`:

```
input.mirror:
  Card: pad 16, bg #fff
  Card

expected.dom.js:
  // (normalisiert, runtime-prelude separat)
  const node_<1> = document.createElement('div')
  node_<1>.dataset.mirrorName = 'Card'
  Object.assign(node_<1>.style, {
    'padding': '16px',
    'background': '#fff',
  })
  …
```

**Tooling**: ein einzelner Test-Runner (`tests/fixtures/runner.test.ts`)
liest jedes Fixture-Verzeichnis, kompiliert `input.mirror`, normalisiert
und vergleicht gegen die Expected-Files. Mit `UPDATE_GOLDEN=1` werden
fehlende Expected-Files erzeugt oder bestehende überschrieben.

### Schicht 2: Behavior Spec (`tests/behavior/components.spec.ts`)

~30 Tests, gegliedert nach Sub-Features. Skizze:

**Resolution & Inheritance** (C1-C5):

- C1: Definition ohne `as` rendert als `<div>` (default)
- C2: `PrimaryBtn as Button` rendert als `<button>`
- C3: `StatusBadge: Frame …` rendert als `<div>`, übernimmt Frame-Defaults
- C4: `DangerBtn as Btn` erbt Btn-Properties, lokale gewinnen
- C5: Multi-Level-Chain — Properties aller Stufen werden gemerged

**Property-Override** (C6-C7):

- C6: Instance ohne Override hat Definition-Properties
- C7: Instance-Property überschreibt Definition; nicht-überschriebene
  Definition-Properties bleiben erhalten

**Slots** (C8-C11):

- C8: Slot-Definition rendert Default-Empty wenn Instance keine Children hat
- C9: Slot-Verwendung — Children landen im richtigen Slot, nicht im Root
- C10: Mehrere Slots — Reihenfolge der Slot-Definition bestimmt DOM-Order
  (oder: Reihenfolge der Instance-Children, je nachdem was die Spec sagt)
- C11: Slot-Property-Override im Instance funktioniert wie C7 für Slots

**Verschachtelung** (C12, C18):

- C12: Component verwendet anderen Component im Body — beide rendern
- C18: Mehrere Instanzen teilen keinen State (Click auf Btn 1 affektiert
  nicht Btn 2)

**States & Events** (C13-C17):

- C13: hover: rendert als `:hover`-CSS oder data-state
- C14: toggle() cyclt zwischen base und `on`-State bei Click
- C15: exclusive() innerhalb Parent — nur eines aktiv
- C16: `Btn "Aktiv", on` startet im `on`-State
- C17: onclick im Component-Body wird auf Instance angewendet

**Edge-Cases** (C19-C20):

- C19: `Button: pad 12` (Override eines Primitives) — was passiert?
  - Akzeptanz oder Fehler? → Verhalten in der Spec festschreiben
- C20: Self-Reference — Stack-Overflow oder erkannt und Fehler?

### Schicht 3: Per-App-Contract

Kandidat: **`examples/portfolio-advisor.mirror`** — verwendet
`StatCard`, `PositionRow`, `ActionBtn`, `NavItem` sowohl als Definitionen
als auch mit Property-Overrides.

```ts
it('portfolio-advisor: 4 StatCards mit korrekten Werten', () => { … })
it('portfolio-advisor: PositionRow rendert für jede Position einen Row', () => { … })
it('portfolio-advisor: ActionBtn-Override (verschiedene bg pro Instance)', () => { … })
```

### Schicht 4: Differential

Components werden vom **DOM- und React-Backend** unterstützt; Framework
hat eigene Component-Semantik. Diff-Tests:

- DOM ↔ React: für statische Component-Bäume (ohne `each`/`if`)
  müssen Tag-Struktur und Texte übereinstimmen
- DOM ↔ Framework: Component-Type-Namen müssen erhalten bleiben
  (`M('Card', …)` im Framework-Output für jede `Card`-Definition)

Bekannte Limits dokumentieren: "React-Backend hat kein `toggle()`, daher
Tests dafür DOM-only".

### Schicht 5: Regression Pin

Aktuell **keine** der 20 gefundenen Bugs spezifisch im Component-Pfad —
aber das Framework-Hyphenated-Keys-Bug (#16) trifft Components mit
`font-size`-Properties. Pin in der Differential-Suite.

Künftige Component-Bugs landen automatisch hier.

## Acceptance Criteria

Components-Schicht gilt als _done_ wenn:

- [ ] 20 Golden-Fixtures vorhanden, alle grün, alle Outputs reviewed
- [ ] Behavior-Spec hat ≥ 30 Tests, deckt alle 20 Sub-Features ab
- [ ] portfolio-advisor-Contract grün
- [ ] DOM↔React-Differential für statische Subset grün
- [ ] DOM↔Framework-Differential für Component-Namen grün
- [ ] Limits-Tabelle in `docs/concepts/component-backend-support.md`
- [ ] Coverage von `compiler/ir/transformers/component-resolver.ts`
      (oder äquivalentes Modul) ≥ 95%
- [ ] Mutation-Score (Stryker auf Component-Resolution-Code) ≥ 70%

## Pattern für nächste Features

Checkliste, die wir pro Feature durchgehen:

1. **Sub-Features identifizieren** — alle Varianten, Edge-Cases,
   Kombinationen mit anderen Features auflisten
2. **Fixture-Matrix** — pro Sub-Feature ein Golden-File-Verzeichnis
   anlegen, kleine isolierte Eingaben
3. **Behavior-Spec** — observable Semantik pro Sub-Feature in jsdom
   prüfen, mit computedStyle/textContent/click-Events
4. **Per-App-Contract** — eine Real-App auswählen, in der das Feature
   prominent ist, expliziten Vertrag schreiben
5. **Differential-Subset** — definieren welche Backend-Kombinationen
   das Feature unterstützen, Limits dokumentieren
6. **Regression-Pin** — bekannte Bugs aus Hypothesis-Tests + Smoke
   einpinnen
7. **Acceptance prüfen** — Coverage + Mutation-Score gegen Schwelle

Reihenfolge nach Priorität:

| Priorität | Feature             | Begründung                         |
| --------- | ------------------- | ---------------------------------- |
| 1         | Components (worked) | Distinctive Mirror-Idiom           |
| 2         | Tokens              | Design-System-Fundament            |
| 3         | Properties + Layout | Foundational, jede Zeile betroffen |
| 4         | each + if           | Wo viele Bugs lauern               |
| 5         | bind                | Komplex, Two-Way                   |
| 6         | toggle/exclusive    | State-Machines                     |
| 7         | events + actions    | Side-Effects, Cross-Element-Refs   |
| 8         | tables + charts     | Compound primitives                |

## Aufwand

Schätzung pro Feature (nach Components als Referenz):

- Schicht 1 Fixtures: 0.5 Tag
- Schicht 2 Behavior: 1 Tag
- Schicht 3 Contract: 0.25 Tag
- Schicht 4 Differential: 0.25 Tag
- Schicht 5 Pin: 0.1 Tag

Pro Feature ~2 Tage. Acht Features ≈ 16 Tage. Components selbst nimmt
etwas mehr (Pattern-Etablierung) — **3-4 Tage**.

Nicht-Ziele dieses Dokuments: Performance-Tests, Visual-Regression,
End-to-End mit echtem Browser. Die laufen parallel über das bestehende
CDP-Test-Framework.
