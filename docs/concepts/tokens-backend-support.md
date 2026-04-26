# Tokens Backend Support Matrix

> Welche Token-Sub-Features welcher Backend semantisch unterstützt.
> Belegt durch `tests/differential/tokens.test.ts`.

| Sub-feature                             | DOM | React | Framework | Bemerkung                                 |
| --------------------------------------- | --- | ----- | --------- | ----------------------------------------- |
| TK1 Single-value (`primary.bg: #X`)     | ✅  | ✅    | ✅        | DOM: `var(--primary-bg)` in :root + use   |
| TK2 Property-set (`cardstyle: bg, pad`) | ✅  | ⚠️    | ⚠️        | IR expandiert; set-name verschwindet      |
| TK3 Suffix-Resolution (`bg $primary`)   | ✅  | ⚠️    | ⚠️        | DOM-only context-aware suffix-resolver    |
| TK4 Direct match (`$primary-bg`)        | ✅  | ⚠️    | ⚠️        | dito                                      |
| TK5 Token in Component-Definition       | ✅  | ⚠️    | ⚠️        | DOM resolves; andere inlinen oder droppen |
| TK6 Token-in-Token chain                | ✅  | ⚠️    | ⚠️        | DOM kettet via CSS-Variablen              |
| TK7 Token in Conditional                | ✅  | ❌    | ❌        | dito                                      |
| TK8 Token in Each-Loop                  | ✅  | ❌    | ❌        | dito                                      |
| TK9 Numeric Tokens                      | ✅  | ⚠️    | ⚠️        | `pad $space` → `var(--space-pad)`         |
| TK10 Multiple Suffixes (bg, col, …)     | ✅  | ⚠️    | ⚠️        | jeder Suffix eigene Variable              |

Legende:

- ✅ — voll unterstützt
- ⚠️ — kompiliert, Semantik teilweise (z.B. nicht in :root)
- ❌ — nicht unterstützt

## Bekannte Bugs

- **#29** — `Frame boc $brand, bor 2` — der `bor` Shorthand emittiert
  `border: 2px solid currentColor`, das den vorherigen
  `border-color: var(--brand-boc)` überschreibt. Effekt: borderColor
  fällt zur Laufzeit auf `currentColor` zurück. Pinned in
  `tests/differential/tokens.test.ts`. Fix: entweder `bor` ohne
  shorthand-color emittieren (`border-width: 2px; border-style: solid`),
  oder Reihenfolge tauschen (`border` zuerst, dann `border-color`
  überschreibt).

## CSS-Variable-Strategie

DOM-Backend emittiert pro Token eine CSS-Custom-Property in `:root`:

```css
:root {
  --primary-bg: #2271c1;
  --primary-col: white;
}
```

Verwendungsstelle bekommt `var(--primary-bg)` als Inline-Style:

```js
Object.assign(node.style, {
  background: 'var(--primary-bg)',
  color: 'var(--primary-col)',
})
```

Vorteile: Tokens sind zur Laufzeit über CSS-Vars überschreibbar (z.B.
für Theming), und der Browser cacht sie.

## Property-Set-Expansion

Property-Sets (TK2) werden zur IR-Zeit expandiert:

```mirror
cardstyle: bg #fff, pad 16, rad 8
Frame $cardstyle
```

wird zu

```mirror
Frame bg #fff, pad 16, rad 8
```

bevor die Codegen-Schritte laufen. Daher fehlt `cardstyle` als Name
im finalen Output — die Eigenschaften sind aber alle gesetzt.
