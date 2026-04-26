# Component Backend Support Matrix

> Welche Component-Sub-Features welcher Backend semantisch unterstützt.
> Belegt durch `tests/differential/components.test.ts`.

| Sub-feature                 | DOM | React | Framework | Bemerkung                                       |
| --------------------------- | --- | ----- | --------- | ----------------------------------------------- |
| Definition + Render         | ✅  | ✅    | ✅        | Alle 3 erzeugen Output für `Card: …` + `Card`   |
| `as Primitive`              | ✅  | ✅    | ✅        | `Btn as Button` → `<button>`                    |
| `Name: Primitive` shorthand | ✅  | ✅    | ✅        | `Btn: Button …` äquivalent zu `as`              |
| `as Component`              | ✅  | ⚠️    | ⚠️        | DOM merged Inheritance-Chain; React/FW: nur top |
| Multi-Level Inheritance     | ✅  | ❌    | ⚠️        | `A as B`, `B as Primitive` → DOM merged 3 Layer |
| Slots (named children)      | ✅  | ✅    | ✅        | Alle erkennen `Title:` etc.                     |
| Slot-Property-Override      | ✅  | ?     | ?         | Behavior-Test pinning DOM-only                  |
| Component-Name in Output    | ✅  | ❌    | ✅        | DOM: `data-mirror-name`; React inlined; FW: M() |
| Instance-Property-Override  | ✅  | ✅    | ✅        | `Btn "X", bg #f00` überschreibt def-bg          |
| `toggle()` runtime          | ✅  | ⚠️    | ⚠️        | DOM hat State-Machine; React/FW kompiliert nur  |
| `exclusive()` runtime       | ✅  | ⚠️    | ⚠️        | dito                                            |
| hover State                 | ✅  | ❌    | ❌        | DOM emittiert `:hover`; andere ignorieren       |
| Component composition       | ✅  | ✅    | ⚠️        | Btn in Card body — FW erkennt nicht alle Refs   |

Legende:

- ✅ — voll unterstützt, observable Verhalten
- ⚠️ — kompiliert, aber Semantik unvollständig (z.B. inlining, State-Machine fehlt)
- ❌ — silent dropped / inlined (kein Fehler, aber Feature wirkt nicht)

## Implications für die Test-Pyramide

- **Layer 2 Behavior-Spec** (`tests/behavior/components.test.ts`) testet
  primär gegen das **DOM-Backend**, weil dort die volle Semantik liegt.
- **Layer 4 Differential** pinnt die aktuellen React/Framework-Lücken
  als _expected behavior_ — wird ein Feature dort später nachgezogen,
  schlägt der entsprechende Differential-Test fehl und zwingt zur
  bewussten Aktualisierung.
- Wer Component-Features in React/Framework nutzen will, sollte das
  Backend gezielt erweitern. Vorschlag: separate Issues pro Lücke
  (Multi-Level-Inheritance, Component-Name-Preservation, State-Machines).

## Bekannte Bugs

- **#21 — Self-Reference Stack-Overflow**: `TreeNode: …\n  TreeNode`
  führt im IR-Transformer zu `Maximum call stack size exceeded` ohne
  klare Diagnostik. Pinned in `tests/behavior/components.test.ts`
  (Test ist als TODO markiert bis Fix vorhanden).
