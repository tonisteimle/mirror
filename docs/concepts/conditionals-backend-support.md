# Conditionals Backend Support Matrix

> Welche Conditional-Sub-Features welcher Backend semantisch unterstützt.
> Belegt durch `tests/differential/conditionals.test.ts`.

| Sub-feature                                      | DOM | React | Framework | Bemerkung                                |
| ------------------------------------------------ | --- | ----- | --------- | ---------------------------------------- |
| T1 Block `if` (truthy)                           | ✅  | ⚠️    | ⚠️        | DOM hat Runtime-Conditional-Config       |
| T2 `if/else`                                     | ✅  | ⚠️    | ⚠️        | DOM rendert beide Branches conditional   |
| T3 Boolean operators (`&&`, `\|\|`, `or`, `and`) | ✅  | ?     | ?         | Behavior-Spec deckt DOM ab               |
| T4 Numeric comparison (`>`, `<`, `==`)           | ✅  | ?     | ?         | dito                                     |
| T5 String-comparison (incl. non-ASCII)           | ✅  | ?     | ?         | Bug #18 gefixt, gepinnt                  |
| T6 Inline ternary in Text                        | ✅  | ❌    | ⚠️        | DOM resolves; React drops; FW keeps both |
| T7 Nested ternary                                | ✅  | ❌    | ❌        | Bug #23 gefixt (DOM)                     |
| T8 Ternary in style (literal hex)                | ✅  | ⚠️    | ⚠️        | DOM resolves zur Compile-Zeit            |
| T9 Ternary mit `$token` in style                 | ✅  | ❌    | ❌        | Bug #24 gefixt (DOM)                     |
| T10 Ternary in each-Loop mit `$token`            | ✅  | ❌    | ❌        | Bug #24 im Loop-Context auch gefixt      |
| T11 Ternary in Text mit `$`-Interpolation        | ✅  | ❌    | ❌        | Bug #26 gefixt (DOM)                     |
| T12 Non-ASCII string in ternary in style         | ✅  | ❌    | ❌        | Bug #25 gefixt (DOM)                     |

Legende:

- ✅ — voll unterstützt
- ⚠️ — kompiliert, Semantik teilweise
- ❌ — Bug

## Gefixte Bugs (Sprint 1.2 + Folge-PR)

- **#23** — ✅ gefixt. `resolveContentValue` ruft jetzt `processConditionalValue`
  auf, das nested Ternarys rekursiv in `__conditional:`-Marker einbettet.
- **#24** — ✅ gefixt. `processConditionalValue` nimmt `tokenSet` +
  `propertyName` und resolved `$token` direkt zu `var(--token-suffix)`
  statt es als `__loopVar:`-Marker durchzureichen.
- **#25** — ✅ gefixt. Lexer emittiert `==` als `EQUALS` (nicht
  `STRICT_EQUAL`). Parser-Operator-Liste hat `EQUALS` ergänzt, sodass
  Comparisons in Style-Ternarys erkannt werden. Zusätzlich Heuristik:
  wenn collected-Tokens mit Comparison-Op starten, ist `name.value` Teil
  des Conditions (statt Property-Name).
- **#26** — ✅ gefixt. THEN-Werte werden im Parser jetzt re-quoted (wie
  ELSE schon vorher), DOM's Colon-Splitter ist string-aware, und
  `resolveTopLevelValue` rewritet `__loopVar:` innerhalb von Strings zu
  Template-Literal-Substitution.

Regression-Tests in `tests/behavior/conditionals.test.ts` und
`tests/differential/conditionals.test.ts`.
