# Positional Arguments Backend Support Matrix

> Belegt durch `tests/differential/positional-args.test.ts`.

Positional-Args werden _vor_ dem Parser durch den Pre-Resolver
(`compiler/positional-resolver.ts`) zu expliziter Syntax expandiert.
Die Backends sehen identischen AST — die Feature ist deshalb
**komplett backend-agnostisch**: was in einem Backend funktioniert,
funktioniert in allen.

## Per-Primitive Resolution

| Primitive-Gruppe                                                                                                                             | bare color → | bare size 1 | bare size 2 |
| -------------------------------------------------------------------------------------------------------------------------------------------- | ------------ | ----------- | ----------- |
| **Container** (Frame, Box, Button, Header, Section, Article, Aside, Footer, Nav, Main, H1-H6, Divider, Spacer, Input, Textarea, Label, Slot) | `bg`         | `w`         | `h`         |
| **Content** (Text, Link)                                                                                                                     | `col`        | `w`         | `h`         |
| **Icon**                                                                                                                                     | `ic`         | `is`        | _(error)_   |
| **Image** (Image, Img)                                                                                                                       | _(error)_    | `w`         | `h`         |

## Backend-Support

| Sub-feature                                   | DOM | React | Framework | Bemerkung                                     |
| --------------------------------------------- | --- | ----- | --------- | --------------------------------------------- |
| PA1 Container hex bg                          | ✅  | ✅    | ✅        | `Frame #2271C1`                               |
| PA2 Container number → w                      | ✅  | ✅    | ✅        | `Frame 100`                                   |
| PA3 Container size pair → w/h                 | ✅  | ✅    | ✅        | `Frame 100, 50`                               |
| PA4 Button full positional mix                | ✅  | ✅    | ✅        | `Button "X", hug, 32, #333`                   |
| PA5 Text bare hex → col (not bg)              | ✅  | ✅    | ✅        | `Text "Hi", #fff`                             |
| PA6 Icon → ic + is                            | ✅  | ✅    | ✅        | `Icon "check", #888, 24`                      |
| PA7 Image → w/h, no color slot                | ✅  | ✅    | ✅        | `Image src "x.jpg", 200, 100`                 |
| PA8 Mixed positional + explicit               | ✅  | ✅    | ✅        | smart slot-filling                            |
| PA9 Named colors                              | ✅  | ✅    | ✅        | `Frame red`                                   |
| PA10 rgba()                                   | ✅  | ✅    | ✅        | `Frame rgba(0,0,0,0.5)`                       |
| PA11 Slot conflicts → error                   | ✅  | ✅    | ✅        | klare Fehlermeldungen                         |
| PA12 `$name.suffix` token-ref                 | ✅  | ✅    | ✅        | `Frame $primary.bg`                           |
| PA13 `$name` single-suffix token              | ✅  | ✅    | ✅        | `Frame $space` (space.pad def)                |
| PA14 `$name` multi-suffix token               | ✅  | ✅    | ✅        | role-based pick (Frame→bg, Text→col, Icon→ic) |
| PA15 Object property passthrough              | ✅  | ✅    | ✅        | `$user.name` bei `user:` Object               |
| PA16 Multi-token shorthand                    | ✅  | ✅    | ✅        | `Frame $primary, $space, $rad`                |
| PA17 Property-set refs untouched              | ✅  | ✅    | ✅        | `Frame $cardstyle` unverändert                |
| PA-P2 Custom components default Container     | ✅  | ✅    | ✅        | `Btn 100, 50, #333` (mit `Btn:` Definition)   |
| PA-P2 Custom `as Text/Link` → col             | ✅  | ✅    | ✅        | `Headline as Text:` → Instance ist Content    |
| PA-P2 Custom `as Icon` → ic + is              | ✅  | ✅    | ✅        | `DangerIcon as Icon:` → Instance ist Icon     |
| PA-P2 Component inheritance chain             | ✅  | ✅    | ✅        | `DangerBtn as PrimaryBtn as Btn`              |
| PA-P2 Definitions NOT transformed             | ✅  | ✅    | ✅        | `Btn: 100, #333` bleibt Definition            |
| PA-P2 Slots inside components NOT transformed | ✅  | ✅    | ✅        | indented `Title:` ist Slot, kein Component    |

## Pre-Scan-Heuristik

Klassifiziert jeden Identifier basierend auf seiner Definition:

| Pattern in Definition                 | Kategorie        | `$name` / `Name` am Use-Site                            |
| ------------------------------------- | ---------------- | ------------------------------------------------------- |
| `name.suffix: VALUE` (flach)          | **Token**        | `$name` transformiert (suffix → property-name)          |
| `name:` + eingerückt, **camelCase**   | **Object**       | `$name.x` ist Property-Access → unverändert             |
| `name: prop1, prop2, ...` (camelCase) | **Property-Set** | `$cardstyle` unverändert (Parser macht Expansion)       |
| `Name:` (PascalCase, Spalte 0)        | **Component**    | `Name 100, #333` mit Container-Role                     |
| `Name as Primitive:`                  | **Component**    | erbt Primitive-Role (Frame→bg/wh, Text→col, Icon→ic/is) |
| `Name as OtherComponent:`             | **Component**    | resolved über `as`-Chain (mehrere Pässe)                |
| nicht definiert                       | Unknown          | bleibt unverändert                                      |

## Phase-3-Themen

**Hover-/State-Children-Blocks**: Innerhalb von `hover:` / `state:`
funktioniert positional bisher nur, wenn das Eltern-Element ein
Built-in-Primitive oder Custom-Component ist und der Resolver
Indentation auflöst.

## Smart Slot-Filling

Bare values füllen freie Slots in kanonischer Reihenfolge — explizit
gesetzte Slots werden übersprungen. Beispiele:

| Input                   | Output                                |
| ----------------------- | ------------------------------------- |
| `Frame 100, 50, #333`   | `Frame w 100, h 50, bg #333`          |
| `Frame w 200, 100`      | `Frame w 200, h 100` (h ist frei)     |
| `Frame h 50, 100, #333` | `Frame h 50, w 100, bg #333`          |
| `Frame 100, w 200`      | `Frame h 100, w 200` (w schon belegt) |
| `Frame 100, 50, h 80`   | Fehler (h doppelt belegt)             |
| `Frame #333, bg #444`   | Fehler (bg doppelt belegt)            |

## Roundtrip

**Tipp-Abkürzung beim Schreiben**, kein Speicherformat. Nach erstem
Studio-Save wird die explizite Form geschrieben:

```
User schreibt:    Button hug, 32, #333
Studio liest:     positional → expanded → AST hat bg/w/h
User edit:        Property-Panel ändert bg → #444
Studio schreibt:  Button w hug, h 32, bg #444    (explizit, normalisiert)
```
