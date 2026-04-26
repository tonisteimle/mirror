# Feature Testing Blueprint

> Operatives Playbook für die Implementierung der 5-Schichten-Pyramide pro
> DSL-Feature. Begleitdokument zu
> [feature-testing-pyramid.md](./feature-testing-pyramid.md), das die
> _Strategie_ erklärt.
>
> Reference-Implementierung: **Components** (Commit `44fd84ae`).
> Vorlage: ~110 Tests in 4 Schichten in 1-2 Stunden mit AI-Pairing,
> 1-2 Tagen ohne.

## Voraussetzungen

- `feature-testing-pyramid.md` gelesen — du verstehst _warum_ jede Schicht da ist.
- Dev-Setup läuft (`npm test` baseline grün).
- Du hast das Feature mental in Sub-Features zerlegt (5-25 Varianten).

## Die 10 Schritte

### 1. Sub-Features katalogisieren

Tabelle mit ID + Beispiel pro Sub-Feature, in `feature-testing-pyramid.md`
oder im Commit-Message des Planning-PRs. Beispiel aus Components:

```
| ID  | Sub-Feature                  | Beispiel                                |
| --- | ---------------------------- | --------------------------------------- |
| C1  | Definition                   | `Card: pad 16, bg #fff`                 |
| C2  | Definition mit `as`          | `PrimaryBtn as Button: bg blue`         |
| ...                                                                       |
| C20 | Edge-Case (Self-Reference)   | `TreeNode: …\n  TreeNode`               |
```

**Kein Kompromiss bei der Vollständigkeit**: alle Variationen, alle
Kombinationen mit anderen Features, alle Edge-Cases die einem einfallen.
Lieber 25 Sub-Features als 12.

### 2. Runner-Infrastruktur

Pro Feature eine eigene Datei
`tests/fixtures/<feature>/runner.test.ts`. Erstes Feature: vom Components-
Runner kopieren. Folgefeatures: identisches Schema, nur `FIXTURES_DIR`
zeigt auf das neue Verzeichnis.

Schlüssel-Komponenten des Runners:

- `extractUserCode()` — schneidet User-Code-Section aus dem 3000-Zeilen-
  `createUI()` Body heraus (zwischen erster User-Comment und
  `// Attach API methods directly`).
- `renderToHTML()` — führt jsdom-Render aus, `<style>`-Block strippen,
  pretty-print pro Tag.
- `UPDATE_GOLDEN=1` env-var → schreibt Baselines statt zu vergleichen.

### 3. Fixture-Inputs schreiben

Pro Sub-Feature ein Verzeichnis
`tests/fixtures/<feature>/<id>-<short-name>/`, je mit `input.mirror`.

**Konventionen:**

- IDs zero-padded: `c01-…`, `c02-…`
- Short-name beschreibend: `c11-slot-property-override`
- Inputs minimal: 3-15 Zeilen Mirror-Code, isoliert
- Keine Tokens, keine Daten außer wenn Sub-Feature es verlangt
- Trailing newline am Ende — Lint-Tool fügt sie sonst hinzu

### 4. Baselines akzeptieren + reviewen

```bash
UPDATE_GOLDEN=1 npx vitest run tests/fixtures/<feature>
```

Danach **jeden** generierten `expected.dom.js` und `expected.html` manuell
durchlesen. Achte auf:

- Unerwartete Tags (z.B. C19: `Button: pad 12` rendert als `<div>` statt
  `<button>` — das ist ein dokumentierender Test, kein Bug)
- Slots, die zufällig Primitive-Namen haben (`Footer:` rendert als
  `<footer>` weil der semantische Primitive Vorrang hat)
- Style-Reihenfolge — sollte stabil sein
- Datasets — `data-mirror-id`, `data-mirror-name`, `data-component`
- Ungewollte Inhalte (Render-Fehler, Stack-Traces, leere Elements)

**Wenn du eine Surprise findest**: Sub-Feature-Tabelle ergänzen, ggf.
neuen Behavior-Test schreiben der das Verhalten dokumentiert.

**Wenn du einen Bug findest**: Bug-Nummer vergeben, im Backend-Support-
Doc und in der Behavior-Spec als TODO/`it.skip` festhalten. Den Bug
NICHT im selben PR fixen — das verfälscht das Pinning.

> Während Components: Bug #21 (Self-Reference Stack-Overflow) wurde so
> entdeckt. Fixture C20 wurde umbenannt + ein eigener Skip-Test in der
> Behavior-Spec dokumentiert das Verhalten bis Fix.

### 5. Behavior-Spec schreiben

Datei: `tests/behavior/<feature>.test.ts` (NICHT `*.spec.ts` — Vitest-
Config matcht nur `*.test.ts`).

**Struktur:**

```ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { parse } from '../../compiler/parser'
import { generateDOM } from '../../compiler/backends/dom'

function render(src: string, container: HTMLElement): HTMLElement {
  /* … */
}
function styleOf(el, prop): string {
  return getComputedStyle(el).getPropertyValue(prop).trim()
}
function findByName(root, name): Element | null {
  /* … */
}

describe('<Feature> — Behavior Spec', () => {
  let container: HTMLDivElement
  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
  })
  afterEach(() => {
    container.remove()
    delete (globalThis as any).__mirrorData // ← Pollution-Reset!
  })

  describe('C1: <sub-feature>', () => {
    it('<observable assertion>', () => {
      /* … */
    })
  })
})
```

**Anzahl**: typisch 1.5× Sub-Features (manche brauchen 2-3 Tests, manche
nur einen). Components: 29 Tests für 20 Sub-Features.

**Was hier NICHT geht** (gegen jsdom-Quirks gestoßen):

- `getComputedStyle(...).backgroundColor` liefert nach Click zufällig
  `rgb(68, 68, 68)` statt erwartetem `rgb(239, 68, 68)`. Workaround:
  `(el as HTMLElement).style.background.includes('rgb(239, 68, 68)')`.
- Vitest sammelt `vi.fn()` über Suiten — wenn das Feature globalen State
  nutzt (`__mirrorData`), in `afterEach` löschen.

### 6. Per-App-Contract

Eine Real-App in `examples/` auswählen, in der das Feature prominent ist.

Components: `portfolio-advisor.mirror` (4 StatCards, 6 PositionRows mit
verschachtelten Slots, mehrere ActionBtn-Overrides, NavItem-Sidebar
mit aktivem Eintrag).

Datei: `tests/contract/<app>.contract.test.ts`.

**Asserts**:

- Counts (genau 4 StatCards, 6 PositionRows, …)
- Slot-Wiring (Asset → Logo + Info → Name + Type)
- Override-Varianten (mehrere unterschiedliche `bg` über die Instanzen)
- Initial-State (genau 1 NavItem im `active`-State)
- Sichtbare Daten (erste Position enthält "Apple Inc.")

**Was hier NICHT geht**: "rendert ohne `undefined`" — das ist Smoke-Test-
Niveau. Contract ist spezifischer.

### 7. Differential-Tests

Datei: `tests/differential/<feature>.test.ts`.

Drei Test-Gruppen:

1. **Common subset**: Alle Backends produzieren Output ohne Throw,
   gleiche Texte, gleiche Tag-Counts.
2. **DOM-only Features**: für Sub-Features die DOM exklusiv unterstützt
   (z.B. `toggle()`-Runtime), nur DOM testen, andere Backends auf
   "kompiliert ohne Throw" prüfen.
3. **Documented limits**: für Lücken im React/Framework-Backend einen
   Test schreiben der das _aktuelle_ defizitäre Verhalten pinnt.

```ts
it('inlines components: definition name does NOT appear in React output', () => {
  const react = generateReact(parse(`Card: pad 16\n\nCard`))
  // Pin current behavior: React inlined `Card` to `<div>` and dropped the name.
  // If/when React backend gains component preservation, update this test.
  expect(react).not.toContain('Card')
  expect(react).toMatch(/<div[\s>/]/)
})
```

Das ist nicht "Skip", das ist **dokumentierende Assertion**: wenn das
Backend nachgezogen wird, schlägt der Test fehl und zwingt zur bewussten
Aktualisierung.

### 8. Backend-Support-Matrix

Datei: `docs/concepts/<feature>-backend-support.md`. Tabelle mit ✅⚠️❌
pro Sub-Feature pro Backend, Bemerkungen-Spalte für Erklärungen.

```markdown
| Sub-feature              | DOM | React | Framework | Bemerkung                            |
| ------------------------ | --- | ----- | --------- | ------------------------------------ |
| Definition + Render      | ✅  | ✅    | ✅        | Alle 3 erzeugen Output               |
| Multi-Level Inheritance  | ✅  | ❌    | ⚠️        | DOM merged 3 Layer; React: nur top   |
| Component-Name in Output | ✅  | ❌    | ✅        | DOM: data-mirror-name; React inlined |
```

Legende: ✅ voll · ⚠️ kompiliert, Semantik unvollständig · ❌ silent dropped.

Verlinken am Anfang der Differential-Tests.

### 9. Regressions pinnen

Jeder Bug, der während der Fixture-Erstellung oder Behavior-Spec gefunden
wird, bekommt einen Test mit Bug-Nummer im Namen, **nicht** sofort einen
Fix.

```ts
it('Bug #21: self-referencing component should not crash with stack overflow', () => {
  // Currently throws RangeError — pinning the diagnostic gap.
  // Fix later in a separate commit; this test then asserts the new behavior.
  expect(true).toBe(true) // placeholder
})
```

Begründung: Tests die _heute_ einen Fix erzwingen würden, blockieren das
Mergen der Test-Pyramide. Pin den IST-Stand, fix in Folge-PR.

### 10. Commit + Roll-forward

**Ein Commit pro Feature**, nach diesem Schema:

```
test: build full testing pyramid for <Feature> feature (4 layers)

Implements docs/concepts/feature-testing-pyramid.md as the worked example
for the <Feature> feature. Establishes the pattern that we'll replicate
for <next-features>.

Schicht 1 — Golden Fixtures: …
Schicht 2 — Behavior Spec: …
Schicht 3 — Per-App Contract: …
Schicht 4 — Differential: …

Surfaced Bug #N: <description>. Pinned as TODO until fixed.

Net: +N tests, all green.
```

Anschließend `feature-testing-pyramid.md` Prioritäts-Tabelle aktualisieren
(Status-Spalte: "✅ done — commit `…`").

## Anti-Patterns (Lessons Learned)

### Vitest-Discovery

- Datei muss `*.test.ts` heißen (nicht `*.spec.ts`).
- Dateien außerhalb `tests/` werden nicht eingesammelt.

### ASI in dynamisch erzeugtem Code

Beim Mocken von Runtime-Helpers via Regex-Replacement nie eine
Replacement starten mit `(`:

```ts
// ❌ falsch — `}\n(fn)()` parst als `}(fn)()` (ASI greift nicht)
code.replace(/_runtime\.createChart/g, '(globalThis._chartMock?.createChart || …)')

// ✅ richtig — globalThis.\_runtime als Objekt definieren
;(globalThis as any)._runtime = { createChart: async () => {} }
```

### `getComputedStyle` in Vitest+jsdom

Bei dynamischen State-Wechseln (z.B. `toggle()` per Click) liefert
`getComputedStyle()` zufällig falsche Werte (Hover-State-Lecks). Workaround:
direkt `(el as HTMLElement).style.<prop>` prüfen.

### Test-Pollution

Globaler State (`__mirrorData`, `_state`, `_root`) leakt zwischen
Tests. **Immer** `afterEach` mit Container-Cleanup + Reset:

```ts
afterEach(() => {
  container.remove()
  delete (globalThis as any).__mirrorData
})
```

### Bugs nicht im Pyramide-PR fixen

Wenn die Fixture-Erstellung oder Baseline-Review einen Compiler-Bug
freilegt: pinnen, NICHT fixen. Sonst:

- Pyramide-PR wird zu groß
- Bug-Fix lässt sich nicht isoliert reviewen
- Die "Soll der Test pinnen oder fixen?"-Diskussion blockiert den Merge

### Snapshot vs. Behavior

Schicht 1 (Golden) prüft den **kompletten User-Code-Slice**. Wenn Codegen
sich in Properties-Reihenfolge ändert, schlägt Schicht 1 in 20 Fixtures
gleichzeitig fehl. Das ist gewollt — sichtbare Drift.

Wer einen Test "robuster" machen will, indem er auf Behavior umzieht:
das ist Schicht 2, NICHT eine Lockerung von Schicht 1. Beide leben
nebeneinander.

## Templates

Vorhandene Implementierungen, die als Vorlage dienen:

- `tests/fixtures/components/runner.test.ts` (Schicht 1)
- `tests/behavior/components.test.ts` (Schicht 2)
- `tests/contract/portfolio-advisor.contract.test.ts` (Schicht 3)
- `tests/differential/components.test.ts` (Schicht 4)
- `docs/concepts/component-backend-support.md` (Begleit-Doku)

Beim nächsten Feature: kopieren, Suchen-Ersetzen für `Components`/
`<feature>`, Sub-Feature-IDs anpassen.

## Aufwand (revised)

Aus der Components-Erfahrung:

| Schritt                     | AI-paired | solo (geschätzt) |
| --------------------------- | --------- | ---------------- |
| 1. Sub-Features katalogis.  | 5 min     | 30 min           |
| 2. Runner kopieren          | 5 min     | 15 min           |
| 3. 20 Fixture-Inputs        | 15 min    | 1.5 h            |
| 4. Baselines reviewen       | 10 min    | 1 h              |
| 5. Behavior-Spec (~30 Tsts) | 25 min    | 3 h              |
| 6. Contract-Test            | 10 min    | 1 h              |
| 7. Differential-Tests       | 15 min    | 1.5 h            |
| 8. Backend-Support-Doc      | 5 min     | 30 min           |
| 9. Regressions pinnen       | inline    | inline           |
| 10. Commit                  | 2 min     | 10 min           |
| **Gesamt**                  | ~1.5 h    | ~9 h             |

Achte aufs Tempo: wer länger als 4h ohne AI-Pairing braucht, hat
wahrscheinlich Sub-Features ineinander vermischt. Zerteilen.

## Cross-Feature-Themen

Wenn beim N-ten Feature auffällt, dass mehrere Features ähnliche
Patterns brauchen (z.B. State-Machines bei `toggle`, `exclusive`, `bind`),
wird das nicht generalisiert — jedes Feature behält eigene Pyramide.
Generalization happens later (oder gar nicht).

## Roadmap

Nach Components abgehakt:

1. **tokens** — Resolver, Suffix-Auflösung, Property-Sets, Token-in-Token
2. **layout + properties** — Foundation, jede Mirror-Zeile betroffen
3. **each** — viele Bugs lauern (#17, #19, #20)
4. **if + ternary** — viele Bugs (#18-20 dort gefixt)
5. **bind** — Two-Way, komplex
6. **toggle/exclusive** — State-Machines
7. **events + actions** — Side-Effects, Cross-Element-Refs
8. **tables + charts** — Compound primitives

Nach Schritt 8: ~700-1000 zusätzliche Tests im Repo, Mirror auf
TypeScript-/Svelte-Test-Niveau.
