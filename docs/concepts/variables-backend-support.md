# Variables/Data Backend Support Matrix

> Welche Variables/Data-Sub-Features welcher Backend semantisch unterstützt.
> Belegt durch `tests/differential/variables.test.ts`.

| Sub-feature                                    | DOM | React | Framework | Bemerkung                                          |
| ---------------------------------------------- | --- | ----- | --------- | -------------------------------------------------- |
| V1 Scalar number                               | ✅  | ✅    | ✅        | Wert erscheint im Output                           |
| V2 Scalar string                               | ✅  | ✅    | ✅        | Wert erscheint, Unicode (Umlaute) ok               |
| V3 Scalar boolean (in `if`)                    | ✅  | ⚠️    | ⚠️        | DOM hat Block-Conditional-Runtime; andere kompiln. |
| V4 Variable als Style-Property (`bg $color`)   | ✅  | ⚠️    | ⚠️        | DOM emittiert `var(--color)` (Token-Style)         |
| V5 Single Interpolation                        | ✅  | ✅    | ✅        | `"Hi $name"` → "Hi Max"                            |
| V6 Multi Interpolation                         | ✅  | ✅    | ✅        | Mehrere `$x` in einem String                       |
| V7 Nested Object Access (`$user.name`)         | ✅  | ❌    | ❌        | **DOM-only** — andere Backends inlinen nicht       |
| V8 Deep Property Access (3+ Ebenen)            | ✅  | ❌    | ❌        | dito                                               |
| V9 Collection (each-Loop)                      | ✅  | ❌    | ❌        | each-Runtime DOM-only (siehe Tier-9 + Bug #13)     |
| V10 Aggregations (`.count`, `.first`, `.last`) | ✅  | ❌    | ❌        | DOM-only Runtime-Feature                           |

Legende:

- ✅ — voll unterstützt, Wert erscheint im Output
- ⚠️ — kompiliert, aber Semantik unvollständig
- ❌ — Wert erscheint NICHT im Output

## Bekannte Bugs

- **#22 — `Text $var` (bare reference) emittiert keinen `textContent`** —
  ✅ gefixt. Der `propset:`-Resolver fällt jetzt auf `content` zurück, wenn
  die Token-Referenz keinem Property-Set entspricht. Tests in
  `tests/behavior/variables.test.ts`, `tests/contract/address-manager…`
  und `tests/differential/variables.test.ts` pinnen das korrigierte
  Verhalten.

## Implications für die Test-Pyramide

- **Layer 2 Behavior-Spec** testet primär gegen das **DOM-Backend**, weil
  dort die volle Semantik liegt.
- **Layer 4 Differential** pinnt die aktuellen React/Framework-Lücken
  als _expected behavior_ — wird ein Feature dort später nachgezogen,
  schlägt der entsprechende Differential-Test fehl und zwingt zur
  bewussten Aktualisierung.
- Wer Variables/Data-Features in React/Framework nutzen will, sollte das
  Backend gezielt erweitern. Vorschlag: separate Issues pro Lücke
  (Nested-Object-Inlining, Each-Runtime-Port, Aggregations-Resolver).
