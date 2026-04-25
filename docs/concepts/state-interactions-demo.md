# State Interactions Demo

Zeigt Mirror's State-System: ein Element mit `hover:`-, `active:`- oder
`disabled:`-Block reagiert visuell auf System-Events. Demo verifiziert sowohl
den Code als auch das gerenderte CSS.

Skript: `tools/test-runner/demo/scripts/state-interactions.ts`

## Auftrag

Mirror-Komponenten haben deklarative States — `hover:`, `active:`, `focus:`,
`disabled:`, `on:`, plus Custom-States via `toggle()` / `exclusive()`. Jeder
State definiert nur die Properties, die sich ändern; Mirror erzeugt daraus
CSS, das auf System-Events reagiert. Diese Demo zeigt, wie das aussieht und
funktioniert.

## Was die Demo demonstriert

1. **State-Definition im Code** — `Button` mit `hover:`-Block, der `bg`
   ändert.
2. **Default-State** — vor Hover, computed background ist Original.
3. **Hover-Trigger** — Demo simuliert Hover via `__mirrorTest.interact.hover`,
   das via `data-hover="true"`-Attribut den CSS-State aktiviert.
4. **Hover-Computed-Style** — `expectDom` verifiziert, dass jetzt die
   Hover-Color gerendert wird.
5. **Unhover** — Rückkehr zum Default-State.

## Ablauf

| #   | Schritt                                   | Action                                        | Was es zeigt         |
| --- | ----------------------------------------- | --------------------------------------------- | -------------------- |
| 1   | Reset auf Layout mit Button + hover-State | `setTestCode` via execute                     | Setup                |
| 2   | Default-State Verifikation                | `expectDom` (computed bg)                     | Code → CSS           |
| 3   | Hover triggern                            | `execute` mit `__mirrorTest.interact.hover`   | State-Aktivierung    |
| 4   | Hover-State verifizieren                  | `expectDom` (anderer bg)                      | CSS-Reaktion         |
| 5   | Unhover                                   | `execute` mit `__mirrorTest.interact.unhover` | Rückkehr             |
| 6   | Default wieder verifizieren               | `expectDom`                                   | Vollständiger Zyklus |

## Validierungsstrategie

`expectDom` mit dem `background`-Feld ist die Kernvalidierung. Vor und nach
Hover muss sich der Computed-Background unterscheiden — das beweist, dass
der State-Block tatsächlich CSS produziert, das vom Browser reagiert.

Bonus: ein finaler `expectCode`-Check verifiziert, dass der Quellcode
unverändert ist (Hover ändert nur runtime state, nicht den Code).
