# Conditionals Backend Support Matrix

> Welche Conditional-Sub-Features welcher Backend semantisch unterstützt.
> Belegt durch `tests/differential/conditionals.test.ts`.

| Sub-feature                                      | DOM | React | Framework | Bemerkung                                 |
| ------------------------------------------------ | --- | ----- | --------- | ----------------------------------------- |
| T1 Block `if` (truthy)                           | ✅  | ⚠️    | ⚠️        | DOM hat Runtime-Conditional-Config        |
| T2 `if/else`                                     | ✅  | ⚠️    | ⚠️        | DOM rendert beide Branches conditional    |
| T3 Boolean operators (`&&`, `\|\|`, `or`, `and`) | ✅  | ?     | ?         | Behavior-Spec deckt DOM ab                |
| T4 Numeric comparison (`>`, `<`, `==`)           | ✅  | ?     | ?         | dito                                      |
| T5 String-comparison (incl. non-ASCII)           | ✅  | ?     | ?         | Bug #18 gefixt, gepinnt                   |
| T6 Inline ternary in Text                        | ✅  | ❌    | ⚠️        | DOM resolves; React drops; FW keeps both  |
| T7 Nested ternary                                | ❌  | ❌    | ❌        | **Bug #23** — multiple sibling elements   |
| T8 Ternary in style (literal hex)                | ✅  | ⚠️    | ⚠️        | DOM resolves zur Compile-Zeit             |
| T9 Ternary mit `$token` in style                 | ❌  | ❌    | ❌        | **Bug #24** — emittiert kein `background` |
| T10 Ternary in each-Loop mit `$token`            | ❌  | ❌    | ❌        | **Bug #24** im Loop-Context               |
| T11 Ternary in Text mit `$`-Interpolation        | ❌  | ❌    | ❌        | **Bug #26** — leerer Text                 |
| T12 Non-ASCII string in ternary in style         | ❌  | ❌    | ❌        | **Bug #25** — fällt auf var(--cat) zurück |

Legende:

- ✅ — voll unterstützt
- ⚠️ — kompiliert, Semantik teilweise
- ❌ — Bug

## Bekannte Bugs (entdeckt in Sprint 1.2)

- **#23** — Nested ternary in Text-Content erzeugt mehrere DOM-Sibling-
  Elemente statt einem Text mit dem aufgelösten Wert. Pinned.
- **#24** — Ternary in style mit `$token`-Branches (`bg x ? $accent :
$danger`) emittiert KEIN `background`-Property. Style fehlt komplett.
  Pinned.
- **#25** — Ternary in style mit `$variable`-Operand (`bg cat == "X" ?
#abc : #def`) löst auf `var(--cat)` zurück statt das Conditional
  auszuwerten. Pinned.
- **#26** — Ternary in Text mit interpoliertem String-Branch (`Text x > 0
? "Items: $x" : "Empty"`) erzeugt leeren textContent. Pinned.

Alle vier Bugs werden in einem Folge-PR adressiert. Pin-Tests in
`tests/behavior/conditionals.test.ts` und `tests/differential/conditionals.test.ts`.
