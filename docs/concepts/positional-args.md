# Positional Arguments — Konzept

> **Status**: Phase 1 implementiert in `compiler/positional-resolver.ts`,
> integriert in `parse()`. Pyramide grün: Fixtures (10), Behavior (30),
> Contract (13), Differential (33).
>
> Erlaubt `Button hug, 32, #333` statt `Button w hug, h 32, bg #333`.
> **Tipp-Abkürzung beim Schreiben.** Studio normalisiert beim ersten
> Save zur expliziten Form. Tutorial + AI-Trainingsdaten bleiben
> explizit; positional wird nur als kleiner Einschub erwähnt.

## Motivation

~80% aller Container in Mirror-Apps setzen nur `w`/`h`/`bg`. Mirror
hat schon heute eine Form von Positional-Args (`Text "Hi"` → der
String wird zu `content`). Wir verallgemeinern auf Farben + Sizes.

```mirror
# Statt:
Button w hug, h 32, bg #333
Frame w 100, h 50, bg $primary
Icon "loader", ic #888, is 24

# Geht auch:
Button hug, 32, #333
Frame 100, 50, $primary
Icon "loader", #888, 24
```

## Kern-Regeln

**R1 — Farbe ohne Property-Name** wird zur Default-Color-Property.
Was als Farbe zählt: Hex (`#abc`/`#abc123`/`#abc12345`), Named-Color
(`red`/`white`/`transparent`), `rgba(...)`, suffix-freier Token
(`$primary`, `$danger`).

**R2 — Zahl / `hug` / `full` ohne Property-Name** wird zur Size-Property.
Erste Position → Slot 1, zweite → Slot 2, dritte → Fehler.
Slot 2 ist optional (default `hug`).

Welche Property gemappt wird, hängt vom Primitive ab:

| Primitive-Gruppe                                                                                                                | Color → | Slot 1 | Slot 2    |
| ------------------------------------------------------------------------------------------------------------------------------- | ------- | ------ | --------- |
| **Container** (Frame, Box, Button, Header, Section, Article, Aside, Footer, Nav, Main, H1-H6, Divider, Spacer, Input, Textarea) | `bg`    | `w`    | `h`       |
| **Content** (Text, Link)                                                                                                        | `col`   | `w`    | `h`       |
| **Icon**                                                                                                                        | `ic`    | `is`   | _(error)_ |
| **Image**                                                                                                                       | _(n/a)_ | `w`    | `h`       |

Begründung Icon-Sonderfall: Designer meinen mit `Icon "check", #333`
fast immer die Icon-Farbe, nicht den Container-Hintergrund. Genauso
ist `is` (icon-size) wichtiger als `w` für Icons.

## Edge Cases

| #   | Beispiel                    | Verhalten                                                           |
| --- | --------------------------- | ------------------------------------------------------------------- |
| E1  | `Text "Hi", #333`           | → `Text "Hi", col #333`                                             |
| E2  | `Icon "check", #333, 24`    | → `Icon "check", ic #333, is 24`                                    |
| E3  | `Button 100`                | → `Button w 100` (h optional, default `hug`)                        |
| E4  | `Frame 100, 50, 24`         | Fehler (3. Zahl)                                                    |
| E5  | `Frame #111, #222`          | Fehler (2. Farbe)                                                   |
| E6  | `Frame $primary`            | → `Frame bg $primary` → `var(--primary-bg)`                         |
| E7  | `Frame 100, 50, bg #333`    | → `w 100, h 50, bg #333` (Mischung erlaubt)                         |
| E8  | `Frame 100, w 200`          | → `Frame h 100, w 200` (smart slot-filling: bare füllt freien Slot) |
| E9  | `Frame grid 12; Frame 1, 2` | → `Frame w 1, h 2` (kontext-frei, x/y muss explizit)                |
| E10 | `Frame "primary", 100`      | Fehler (String ist kein Size-Wert)                                  |

## Architektur

**Stage**: Preprocessor-Pass zwischen `combineProjectFiles` und
`parse`. Reine Source-zu-Source-Transformation. Output ist gültiges
Mirror, das der Parser unverändert akzeptiert.

```
.mirror files
   ↓ combineProjectFiles  (existing)
combined source
   ↓ positional-resolver  (NEW)
expanded source
   ↓ parse  (existing)
AST → IR → Backend  (unchanged)
```

**Konsequenz**: AST/IR/Code-Modifier/Backends bleiben **komplett
unverändert**. Roundtrip: Studio liest Source, expandiert via
Preprocessor, AST hat nur explizite Properties. Bei Save schreibt der
Code-Modifier wie heute die explizite Form. **Positional ist eine
Eingabe-Konvention, kein Speicherformat.**

## Implementation Sketch

```ts
// compiler/preprocessor.ts (Erweiterung des bestehenden Files)

const PRIMITIVE_ROLES: Record<string, { color?: string; sizes: string[] }> = {
  Frame: { color: 'bg', sizes: ['w', 'h'] },
  Button: { color: 'bg', sizes: ['w', 'h'] },
  Box: { color: 'bg', sizes: ['w', 'h'] },
  // ... alle Container
  Text: { color: 'col', sizes: ['w', 'h'] },
  Link: { color: 'col', sizes: ['w', 'h'] },
  Icon: { color: 'ic', sizes: ['is'] },
  Image: { sizes: ['w', 'h'] },
}

function resolvePositional(source: string): string {
  // Zeile für Zeile, mit String/Comment-Awareness:
  // 1. Erkenne Element-Start (Identifier am Zeilenanfang oder nach Indent)
  // 2. Schlage Rolle nach: PRIMITIVE_ROLES[elementName]
  // 3. Walke Property-Liste, klassifiziere jedes Token:
  //    - hat explicit name (z.B. "w 100") → unverändert, markiere Slot belegt
  //    - bare value → bestimme Typ (color/size), mappe zu freien Slot
  // 4. Inject Property-Namen, gib transformierte Zeile zurück
}
```

**String/Comment-Safety**: Preprocessor muss Strings (`"hello, #333"`)
und Kommentare (`// `) erkennen, sonst werden Werte darin
fälschlicherweise transformiert. Mirror nutzt `"..."` für Strings und
`//` für Zeilen-Kommentare — überschaubar.

**Konflikt-Erkennung** (E8): Wenn explizite Property einen Slot
belegt, den positional auch füllen würde, ist das ein Fehler mit
klarer Source-Position. Beispiel: `Frame 100, w 200` → Fehler "Slot
'w' positional und explizit gesetzt".

## Phasing

- **Phase 1** — Built-in Primitives (Container/Content/Icon/Image).
  Vollständige 5-Schichten-Pyramide (Goldfiles, Behavior, Contract
  gegen ein bestehendes Beispiel umgeschrieben mit positional,
  Differential gegen die expanded-Form, Backend-Doc).
- **Phase 2** — Components / State-Children / Hover-Blocks. Hier
  braucht der Preprocessor zusätzlichen Kontext (was ist `PrimaryBtn`
  abgeleitet von? was ist die Eltern-Primitive im Hover-Block?). Macht
  die Implementation komplexer; deshalb getrennt.
- **Phase 3** — optional: Tutorial-Einschub, dass es positional gibt.
  Eine kurze Sektion in der Mirror-Tutorial mit dem Hinweis "diese
  Schreibweisen sind äquivalent". Keine Migration der bestehenden
  Tutorial-Beispiele.

Phase 1 ist eine PR, Phase 2 eine zweite. Phase 3 ist Doku.

## Tradeoffs

**Wins**

- 30-50% kürzerer Code für die häufigsten Container
- AI-Output kompakter, näher an natürlicher Sprache
- Konsistent mit bestehendem `Text "Hi"`-Pattern
- Implementation isoliert: nur ein neuer Preprocessor-Pass, Rest des Compilers unverändert

**Costs**

- Designer müssen die Mapping-Regel kennen (vs. selbstdokumentierender expliziter Form)
- Studio-Save normalisiert zur expliziten Form — d.h. die Tipp-Abkürzung überlebt nicht den ersten Edit
- Fehlermeldungen müssen Source-Position aus dem _Original_ behalten, nicht aus der expanded Form (für sinnvolle Errors im Editor)

**Reversibilität**: hoch. Preprocessor-Stage kann jederzeit rausgenommen werden, der Rest des Compilers funktioniert unverändert. Bestehender expliziter Code ist nicht betroffen.
