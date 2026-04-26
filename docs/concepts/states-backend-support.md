# States Backend Support Matrix

> Welche State-Sub-Features welcher Backend semantisch unterstützt.
> Belegt durch `tests/differential/states.test.ts`.

| Sub-feature                             | DOM | React | Framework | Bemerkung                              |
| --------------------------------------- | --- | ----- | --------- | -------------------------------------- |
| S1 toggle() basic                       | ✅  | ⚠️    | ⚠️        | DOM-only Runtime: `_stateMachine` hook |
| S2 Initial state (`Btn "X", on`)        | ✅  | ⚠️    | ⚠️        | initial-state via `data-state`         |
| S3 With transition (`on 0.2s ease-out`) | ✅  | ⚠️    | ⚠️        | DOM emittiert CSS transition           |
| S4 Multi-state cycle (todo→doing→done)  | ✅  | ❌    | ❌        | DOM-only Cycle-Runtime                 |
| S5 State-style override                 | ✅  | ⚠️    | ⚠️        | Style swap on data-state change        |
| S6 exclusive() group                    | ✅  | ❌    | ❌        | DOM-only Exclusive-Group-Registry      |
| S7 Cross-element state                  | ✅  | ❌    | ❌        | DOM-only Named-Element-Listener        |
| S8 State-aware children                 | ✅  | ❌    | ❌        | DOM-only Children-Swap                 |
| S9 System states (hover/focus/active)   | ✅  | ⚠️    | ⚠️        | DOM emittiert `[data-hover]`-Selectors |
| S10 Multiple instances independent      | ✅  | ⚠️    | ⚠️        | jeder Instance eigener StateMachine    |

Legende:

- ✅ — voll unterstützt
- ⚠️ — kompiliert, Runtime fehlt
- ❌ — nicht unterstützt

## Backend-Status

- **DOM** — voll funktional. State Machine via `_stateMachine`,
  Exclusive Groups via `_exclusiveGroup`, Cross-Element via Named-
  Listener-Registry.
- **React** — Static-Style emittiert, aber keine Click-Cycle-Runtime.
  toggle() und exclusive() benötigen React-State (useState), das im
  Backend nicht generiert wird.
- **Framework** — dito.

## Semantik

- **toggle()**: zyklisches Wechseln zwischen `default` und allen
  benannten Custom-States. Bei nur einem benannten State (z.B. `on:`)
  alterniert es default ↔ on.
- **exclusive()**: nur ein Element in der direkten Parent-Group kann
  den `selected` (oder anderen Custom-) State haben.
- **Cross-element**: `Element.state:` selector ändert das eigene
  Styling basierend auf dem Status eines benannten Elements.
