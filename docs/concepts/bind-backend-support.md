# Bind Backend Support Matrix

> Welche Bind-Sub-Features welcher Backend semantisch unterstützt.
> Belegt durch `tests/differential/bind.test.ts`.

| Sub-feature                          | DOM | React | Framework | Bemerkung                           |
| ------------------------------------ | --- | ----- | --------- | ----------------------------------- |
| B1 One-way text (`Text "$var"`)      | ✅  | ✅    | ✅        | Text-Interpolation                  |
| B2 One-way style (`Frame bg $color`) | ✅  | ⚠️    | ⚠️        | DOM emittiert var(--…)              |
| B3 Two-way Input bind                | ✅  | ⚠️    | ⚠️        | DOM: data-bind + runtime-handler    |
| B4 Bind in each-Loop                 | ✅  | ❌    | ❌        | Bug #30 gefixt (DOM)                |
| B5 Input Mask + bind                 | ✅  | ⚠️    | ⚠️        | Pattern via runtime input-mask      |
| B6 Exclusive-bind (für Auswahl)      | ✅  | ❌    | ❌        | DOM-only Runtime-Registry           |
| B7 Bind auf Object-Property          | ✅  | ❌    | ❌        | Bug #31 gefixt (DOM)                |
| B8 Cross-element value reflection    | ✅  | ⚠️    | ⚠️        | Compile-time + runtime substitution |
| B9 Counter + onclick re-render       | ✅  | ⚠️    | ⚠️        | DOM hat Reactivity-Hooks            |
| B10 Initial-Value aus Variable       | ✅  | ⚠️    | ⚠️        | input.value zur Init-Zeit gesetzt   |

Legende:

- ✅ — voll unterstützt
- ⚠️ — kompiliert, Semantik teilweise
- ❌ — Bug

## Gefixte Bugs

- **#30** — ✅ gefixt. Loop-Emitter setzt nur Container-level binds; das
  per-item bind (path startet mit itemVar) wird im Template-Emitter auf
  das Element selbst gesetzt, plus initial-value für Input/Textarea.
- **#31** — ✅ gefixt. Drei Bind-Parser-Pfade nehmen jetzt einen
  vollständigen dot-Pfad statt nur des ersten Identifiers. `bind
user.email` produziert `data-bind="user.email"` und korrekten
  Initial-Wert.
