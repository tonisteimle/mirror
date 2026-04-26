# Layout Backend Support Matrix

> Belegt durch `tests/differential/layout.test.ts`.

| Sub-feature                               | DOM | React | Framework | Bemerkung                             |
| ----------------------------------------- | --- | ----- | --------- | ------------------------------------- |
| L1 vertical (default)                     | ✅  | ✅    | ✅        | flex-direction: column                |
| L2 horizontal (hor)                       | ✅  | ✅    | ✅        | flex-direction: row                   |
| L3 center                                 | ✅  | ✅    | ✅        | justify-content + align-items center  |
| L4 spread                                 | ✅  | ✅    | ✅        | justify-content: space-between        |
| L5 9-position (tl/tc/tr/cl/c/cr/bl/bc/br) | ✅  | ✅    | ✅        | Mix von justify-content + align-items |
| L6 sizing (w/h/full/hug/min/max)          | ✅  | ✅    | ✅        | px / fit-content / 100% / min-/max-   |
| L7 grow/shrink                            | ✅  | ✅    | ✅        | flex-grow / flex-shrink               |
| L8 wrap                                   | ✅  | ✅    | ✅        | flex-wrap: wrap                       |
| L9 grid                                   | ✅  | ✅    | ✅        | display:grid + grid-template-columns  |
| L10 stacked                               | ✅  | ⚠️    | ⚠️        | DOM: position-relative parent         |
| L11 device-preset                         | ✅  | ✅    | ✅        | feste w/h für mobile/tablet/desktop   |
| L12 position absolute                     | ✅  | ✅    | ✅        | position:absolute + left/top          |

Legende: ✅ voll · ⚠️ kompiliert ohne Runtime · ❌ nicht unterstützt.
