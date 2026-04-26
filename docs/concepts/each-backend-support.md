# Each-Loop Backend Support Matrix

> Welche Each-Loop-Sub-Features welcher Backend semantisch unterstützt.
> Belegt durch `tests/differential/each.test.ts`.

| Sub-feature                             | DOM | React | Framework | Bemerkung                               |
| --------------------------------------- | --- | ----- | --------- | --------------------------------------- |
| E1 Basic each                           | ✅  | ❌    | ❌        | DOM hat \_eachConfig Runtime            |
| E2 Each mit Index (`each x, idx in …`)  | ⚠️  | ❌    | ❌        | **Bug #27** — `$idx` nicht substituiert |
| E3 Each über Inline-Array               | ✅  | ❌    | ❌        | DOM-only Runtime                        |
| E4 Each über Object (entries-Form)      | ✅  | ❌    | ❌        | DOM-only                                |
| E5 Each mit `where` Filter              | ✅  | ❌    | ❌        | DOM-only Runtime                        |
| E6 Each mit `by` OrderBy (asc default)  | ✅  | ❌    | ❌        | DOM-only                                |
| E7 Each mit `by … desc`                 | ✅  | ❌    | ❌        | DOM-only                                |
| E8 Filter + OrderBy kombiniert          | ✅  | ❌    | ❌        | DOM-only                                |
| E9 Nested each                          | ✅  | ❌    | ❌        | DOM-only                                |
| E10 Each mit innerem `if/else`          | ❌  | ❌    | ❌        | **Bug #28** — beide Branches rendern    |
| E11 Each-Items mit `bind`               | ✅  | ❌    | ❌        | DOM-only                                |
| E12 Zwei parallele each (gleiche Coll.) | ✅  | ❌    | ❌        | Bug #17 gefixt                          |
| E13 Token-Reference inside Loop-Body    | ✅  | ❌    | ❌        | Bug #20 gefixt                          |

Legende:

- ✅ — voll unterstützt
- ⚠️ — kompiliert, Semantik teilweise
- ❌ — Bug oder nicht unterstützt

## Bekannte Bugs

- **#27** — `each item, idx in $list` deklariert `idx` als Index-Variable,
  aber `$idx` in Text/Attribut-Interpolation wird NICHT substituiert
  (renders literal `$idx` text). Pinned in `tests/behavior/each.test.ts`.
- **#28** — `if/else` innerhalb eines `each`-Loops rendert BEIDE Branches
  wenn die Condition true ist. Sollte nur den then-Branch rendern.
  Pinned in `tests/behavior/each.test.ts`.

## Backend-Status

- **DOM** — voll funktional inkl. Filter, OrderBy, Nested. Runtime via
  `_eachConfig` mit `renderItem`-Factory.
- **React** — Each-Loop wird **nicht** als JSX-Loop emittiert. Tier-9-
  Discovery, dokumentiert.
- **Framework** — dito; Each-Pattern fehlt im M-Backend.
