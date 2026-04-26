# Properties Backend Support Matrix

> Belegt durch `tests/differential/properties.test.ts`.

| Sub-feature                        | DOM | React | Framework | Bemerkung                           |
| ---------------------------------- | --- | ----- | --------- | ----------------------------------- |
| P1 hex colors                      | ✅  | ✅    | ✅        | bg #hex, col white                  |
| P2 named + rgba                    | ✅  | ✅    | ✅        | rgba(0,0,0,0.5)                     |
| P3 gradients                       | ✅  | ✅    | ✅        | grad/grad-ver/grad-NN               |
| P4 typography                      | ✅  | ✅    | ✅        | fs/weight/font/case                 |
| P5 truncate                        | ✅  | ✅    | ✅        | text-overflow ellipsis              |
| P6 effects (shadow/opacity/blur)   | ✅  | ✅    | ✅        | box-shadow / filter                 |
| P7 visibility (hidden/scroll/clip) | ✅  | ✅    | ✅        | display:none / overflow             |
| P8 cursor                          | ✅  | ✅    | ✅        | pointer/grab/not-allowed            |
| P9 border + radius                 | ✅  | ✅    | ✅        | border-width/style/color separately |
| P10 transform (rotate/scale)       | ✅  | ✅    | ✅        | transform CSS property              |
| P11 hover-\* properties            | ✅  | ⚠️    | ⚠️        | DOM emittiert :hover-Selectors      |
