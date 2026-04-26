# Bind Backend Support Matrix

> Welche Bind-Sub-Features welcher Backend semantisch unterstützt.
> Belegt durch `tests/differential/bind.test.ts`.

| Sub-feature                          | DOM | React | Framework | Bemerkung                            |
| ------------------------------------ | --- | ----- | --------- | ------------------------------------ |
| B1 One-way text (`Text "$var"`)      | ✅  | ✅    | ✅        | Text-Interpolation                   |
| B2 One-way style (`Frame bg $color`) | ✅  | ⚠️    | ⚠️        | DOM emittiert var(--…)               |
| B3 Two-way Input bind                | ✅  | ⚠️    | ⚠️        | DOM: data-bind + runtime-handler     |
| B4 Bind in each-Loop                 | ❌  | ❌    | ❌        | **Bug #30** — kein data-bind in Loop |
| B5 Input Mask + bind                 | ✅  | ⚠️    | ⚠️        | Pattern via runtime input-mask       |
| B6 Exclusive-bind (für Auswahl)      | ✅  | ❌    | ❌        | DOM-only Runtime-Registry            |
| B7 Bind auf Object-Property          | ❌  | ❌    | ❌        | **Bug #31** — bindet auf `$user`     |
| B8 Cross-element value reflection    | ✅  | ⚠️    | ⚠️        | Compile-time + runtime substitution  |
| B9 Counter + onclick re-render       | ✅  | ⚠️    | ⚠️        | DOM hat Reactivity-Hooks             |
| B10 Initial-Value aus Variable       | ✅  | ⚠️    | ⚠️        | input.value zur Init-Zeit gesetzt    |

Legende:

- ✅ — voll unterstützt
- ⚠️ — kompiliert, Semantik teilweise
- ❌ — Bug

## Bekannte Bugs

- **#30** — `Input bind item.value` in each-Loop initialisiert nicht.
  Die Input-Elemente bekommen weder `data-bind`-Attribut noch
  `value`-Wert vom Loop-Item. Pinned in `tests/behavior/bind.test.ts`.
- **#31** — `Input bind user.email` (Object-Property mit Dot-Path)
  bindet an `user` (das ganze Object), nicht an `user.email`. Effekt:
  `input.value` wird zu `[object Object]`. Pinned.
