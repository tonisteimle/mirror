## Spacing Keyboard Mode

> Status: Konzept
>
> Vim-style Modal-Editing für Padding, Margin und Gap — ohne Property-Panel,
> ohne Maus, in Grid-Schritten.

## Motivation

Spacing (Padding, Margin, Gap) ist die häufigste Mikro-Anpassung beim
Layout-Tweaking. Heute braucht man dafür entweder das Property-Panel
(Maus, Fokus weg vom Canvas) oder die visuellen Handles (Maus, mehrere
Klicks pro Seite). Power-User wollen eine **Tasten-Sprache**, die so
dicht ist wie Vim's Normal-Mode: Element selektieren, eine Taste für den
Modus, dann mit Pfeilen am Grid entlang steppen.

## Beziehung zum bestehenden Code

Mirror hat **bereits** Tasten-Shortcuts für die Spacing-Handles in
`studio/preview/keyboard-handler.ts`:

```
P: Toggle padding handles
M: Toggle margin handles
G: Toggle gap handles
Arrow keys: Move selected element (1px, 10px mit Shift)
```

Dieses Konzept ist eine **Erweiterung** dieser bestehenden Handler,
keine Parallel-Implementation. Konkret: `P`/`M`/`G` bleiben das, was sie
sind — sie aktivieren die Handles — und werden gleichzeitig zum
Aktivierungs-Trigger des Modal-Modes. **Die sichtbaren Handles sind
dadurch automatisch der Mode-Indikator**: wenn die blauen Padding-
Handles zu sehen sind, weiß der User, dass Pfeiltasten jetzt Padding-
Werte ändern und nicht das Element verschieben.

## Aktivierung

Element selektiert (kein Text-Edit, kein Inline-Edit aktiv) → Druck auf
`P`/`M`/`G` macht **beides** in einem:

1. Toggle der Handles (bestehendes Verhalten)
2. Modal-Mode aktiv setzen — Arrow-Keys steuern jetzt Werte statt
   Element-Position

| Taste | Handles                 | Modus        |
| ----- | ----------------------- | ------------ |
| `P`   | Padding-Handles ein/aus | Padding-Mode |
| `M`   | Margin-Handles ein/aus  | Margin-Mode  |
| `G`   | Gap-Handles ein/aus     | Gap-Mode     |

`Esc` verlässt den Modus **und** versteckt die Handles — Arrows
verschieben wieder das Element. Selection-Change verlässt den Modus
ebenfalls automatisch (Handles werden ohnehin neu gerendert).

`P` während Margin-Mode aktiv ist → wechselt zu Padding (Margin-Handles
weg, Padding-Handles an, Modus ist jetzt Padding). Kein Stapel.

## Tasten-Belegung im Modus

Die Pfeil-Richtung **ist** die Seite. Shift kehrt das Vorzeichen um.

| Taste                | Wirkung                   |
| -------------------- | ------------------------- |
| `↑` / `↓`            | Alle Seiten ± 1 Grid-Step |
| `Option + ↑`         | Nur **oben** + 1 Step     |
| `Option + Shift + ↑` | Nur **oben** − 1 Step     |
| `Option + ↓`         | Nur **unten** + 1 Step    |
| `Option + Shift + ↓` | Nur **unten** − 1 Step    |
| `Option + ←`         | Nur **links** + 1 Step    |
| `Option + Shift + ←` | Nur **links** − 1 Step    |
| `Option + →`         | Nur **rechts** + 1 Step   |
| `Option + Shift + →` | Nur **rechts** − 1 Step   |
| `Esc`                | Modus verlassen           |

**Im Gap-Mode** ist nur `↑`/`↓` aktiv (Gap hat keine Seiten). `Option +
←/→` könnte später `gap-x` / `gap-y` ansteuern, falls Mirror getrennte
Achs-Gaps unterstützt.

## Grid-Konfiguration

Der Step-Wert wird **nicht** neu erfunden. Er kommt aus den bestehenden
Studio-Settings in `studio/core/settings.ts` — derselben Quelle, die heute
schon das Snapping der visuellen Padding/Margin/Gap-Handles steuert.

**Quelle:** `handleSnapSettings.gridSize` (Default `8`).

**Begründung:** Maus-Handles und Keyboard-Mode arbeiten am selben
Element auf dem gleichen Grid. Wer einen Padding-Handle zieht und beim
8er-Raster einrastet, soll mit `↑` denselben 8er-Schritt bekommen.
Eine zweite Step-Quelle wäre eine Inkonsistenz, die User irritiert.

**Custom Snap Points:** `handleSnapSettings.customPoints` ist bereits
vorhanden (z.B. `[12, 20]`). Der Modus respektiert sie wie die Handles
auch — `↑` springt zum nächsten Punkt aus der Vereinigung von Grid und
Custom-Points.

**Token-Snapping:** Wenn `handleSnapSettings.tokenSnapping = true`
gesetzt ist, werden zusätzlich Spacing-Tokens (`space.gap`, `space.pad`,
…) als Snap-Werte einbezogen — selbe Regel wie bei den Handles.

**Major-Step (offen):** Es gibt zusätzlich `generalSettings.moveStepShift`
(Default `10`), das heute für Element-Verschiebung mit Shift genutzt wird.
Ob der Spacing-Mode einen analogen Major-Step bekommt und welche Taste
dafür sinnvoll ist, siehe Open Questions.

## Off-Grid-Werte

Hat das Element einen Wert, der **nicht** auf einem Snap-Punkt liegt
(z.B. `pad 13` bei `gridSize: 8`): Der **erste** Tastendruck snappt
zum nächsten gültigen Snap-Punkt in Pfeilrichtung. `↑` → `16`, `↓` →
`8`. Danach läuft alles in regulären Steps.

**Begründung:** Sonst würde `↑` einen `13 → 21`-Wert erzeugen, der
weiter off-grid ist und das Tool unnötig "schmutzige" Werte produzieren
lässt. Selbe Logik wie beim Handle-Drag heute.

**Hinweis:** "Snap-Punkte" sind die durch `handleSnapSettings`
generierte Punkte-Liste — Grid-Multiplikatoren plus `customPoints` plus
ggf. Token-Werte (siehe oben).

## Mode-Indikator

Die **sichtbaren Handles** sind der primäre Mode-Indikator. Sie werden
durch denselben `P`/`M`/`G`-Press eingeblendet, der den Modus aktiviert
— der User sieht sie also bereits, sobald der Modus aktiv ist. Padding-
Handles sind blau, Gap-Handles grün, Margin-Handles entsprechend des
Margin-Manager-Stylings.

Zusätzlich:

1. **Side-Highlight:** Beim ersten Press einer `Option +
↑/↓/←/→`-Variante wird der entsprechende Handle (z.B. der obere
   Padding-Handle) kurz visuell hervorgehoben — der User sieht direkt,
   welche Seite seine nächste Tastatur-Aktion betrifft.
2. **Live-Wert am Handle:** Während eine Wert-Änderung läuft, zeigt der
   betroffene Handle seinen aktuellen Wert direkt am Element (analog zu
   dem, was er beim Maus-Drag heute schon zeigt). Kein separates
   Floating-Pill nötig — der Handle ist die Anzeige.

Damit reicht das bestehende Handle-Rendering plus minimale Highlight-
Erweiterung als Indikator. Kein zusätzliches Canvas-Overlay.

## Undo-Granularität

Die gesamte Modus-Session ist **ein** Undo-Step. `Cmd+Z` macht alles
rückgängig, was zwischen dem ersten Pfeildruck und dem Verlassen des
Modus (Esc, Mode-Wechsel, Selection-Change) passiert ist.

**Begründung:** 8× `↑` getippt = ein logischer "ich habe Padding
erhöht"-Schritt aus User-Sicht. 8 separate Undo-Einträge wären nervig.

**Implementierung:** `CommandExecutor` hat eine Session-API
(`beginSession` / `executeInSession` / `endSession`). Während einer
Session werden Commands sofort ausgeführt (für Live-Preview), aber nicht
einzeln auf den Undo-Stack gepusht. `endSession()` wickelt alle
Session-Commands in einen `BatchCommand({ alreadyExecuted: true })` und
pusht den als **eine** Undo-Einheit. Sessions werden vom `KeyboardHandler`
beim ersten Spacing-Pfeildruck lazy gestartet und vom
`handleMode:changed`-Listener committed, sobald der User die Spacing-Mode
verlässt — entweder via `Esc`, Wechsel zu einer anderen Spacing-Mode
oder zurück zu `resize`.

## Multi-Selection

Ist mehr als ein Element selektiert, wirkt der Modus auf **alle**
selektierten Elemente. Der Mode-Indikator zeigt zusätzlich `× 3` (oder
ähnlich) als Hinweis auf die Anzahl.

Werte werden **relativ** geändert: `↑` erhöht jeden Selektor um 1 Grid-
Step ausgehend von seinem eigenen aktuellen Wert (nicht: alle auf den
gleichen Wert setzen). Off-Grid-Snap pro Element.

## Konflikte mit anderen Shortcuts

| Kontext                                     | Verhalten                                                                                                           |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Element ist im Inline-Edit (Text editieren) | Modus startet **nicht**. `P`/`M`/`G` werden als Text behandelt.                                                     |
| Editor-Pane hat Fokus (CodeMirror)          | Modus startet nicht.                                                                                                |
| AI-Prompt aktiv (`--`-Trigger)              | Modus startet nicht.                                                                                                |
| Drag läuft gerade                           | Modus startet nicht.                                                                                                |
| Mehrere Modi gleichzeitig                   | Nicht möglich — `M` während `P` aktiv ist, schaltet auf Margin um (kein Stapel).                                    |
| **Arrow-Keys = "Move element"** (bestehend) | Im aktiven Modus **umgewidmet** — Arrows ändern Spacing-Werte. Bei `Esc` / Selection-Change zurück zum Verschieben. |
| **`Cmd/Ctrl + G` = "Group"** (bestehend)    | Bleibt unverändert. Gap-Mode wird nur durch **plain `G`** aktiviert.                                                |
| **Plain `G` als "Group"-Wunsch**            | Es gibt nur Cmd+G für Group, plain `G` ist heute schon der Gap-Toggle — kein neuer Konflikt.                        |

## Open Questions

1. **Major-Step:** `generalSettings.moveStepShift` (Default `10`) wäre
   eine natürliche Quelle für größere Sprünge. Aber: `Shift + ↑/↓` ist
   in den Option-Varianten schon "Vorzeichen umkehren". Optionen:
   - Alternative Modifier für Major-Step (`Cmd + ↑/↓`?)
   - Doppel-Tap (`↑↑` schnell hintereinander)
   - Keine Major-Steps, User kann einfach mehrfach drücken
   - `moveStepShift` für Spacing nicht übernehmen, separates Feld
     `handleSnapSettings.majorStep` einführen
2. **Sichtbares Wert-Eingabefeld:** Soll während des Modus eine direkte
   Zahleneingabe möglich sein (`P`, dann `2`, `4` → setzt auf 24)? Oder
   bleibt der Mode rein step-basiert?
3. **Visual Hint vor Aktivierung:** Soll ein Tooltip/Hint angezeigt
   werden ("Press P for padding-mode") wenn ein Element länger
   selektiert ist? Discoverability vs. Noise.
4. **Konsistente Erweiterung:** Lässt sich das gleiche Schema später auf
   `radius` (`R`-Mode), `font-size` (`F`-Mode), Border-Width anwenden?
   Vorab Tasten-Reservierung sinnvoll, um Kollisionen zu vermeiden.

## Element-Insertion via Tastatur

Während ein Element selektiert ist, fügt eine einzelne Taste ein neues
Kind hinein. Kein Modus, kein Picker, kein Property-Panel — direkt
einsetzen, sofort weitertippen.

| Taste | Wirkung                                         |
| ----- | ----------------------------------------------- |
| `T`   | Insert `Text "Text"` als letztes Kind           |
| `R`   | Insert `Frame` als letztes Kind (R = Rectangle) |
| `I`   | Insert `Icon "circle"` als letztes Kind         |

`R` für "Rectangle" statt `F` für "Frame": vermeidet Kollision mit dem
bestehenden `F` = "Set full dimension" und entspricht der Designer-
Terminologie (Figma & Co. nennen das Element ebenfalls "Rectangle").
Mirror's interner Name bleibt `Frame` — die Taste ist nur ein UX-Trigger.

Nach dem Insert:

1. Das neue Element wird **automatisch selektiert** — der User kann
   sofort weiterarbeiten (z.B. `T` für Text, dann sofort tippen, um den
   Text-Inhalt zu setzen).
2. Bei `Text` und `Icon` mit Default-Content (`"Text"` / `"circle"`),
   damit das Element sichtbar ist und der User direkt überschreibt.
3. Frames werden leer eingefügt; das nächste `T`/`F`/`I` füllt sie.

**Verschachtelung in einem Flow:**

```
[Select Frame] → R → [neuer Frame selektiert] → T → [Text drin] → T → [zweiter Text]
```

Das ist die Tastatur-Variante des Layout-Aufbaus. Ohne Maus, ohne
Komponenten-Picker.

### Verhalten bei Nicht-Containern

Wenn das selektierte Element kein Container ist (z.B. `Text`, `Icon`,
`Button` mit nur Text-Inhalt), kann es kein Kind aufnehmen. Vorschlag:
**Insert als Sibling nach** dem selektierten Element. Alternative:
no-op + kurzes visuelles Shake-Feedback. Siehe Open Questions.

### Konflikte mit anderen Shortcuts

| Kontext                             | Verhalten                                                                                     |
| ----------------------------------- | --------------------------------------------------------------------------------------------- |
| Spacing-Mode aktiv (`P`/`M`/`G` an) | Insert **deaktiviert**. Erst `Esc`, dann insert. Sonst kollidiert `T` mit zukünftigen Tasten. |
| Inline-Edit aktiv                   | Insert deaktiviert (`T`/`R`/`I` sind Text-Eingabe).                                           |
| `F` (bestehend = "Full Dimension")  | Bleibt unverändert — Insert nutzt `R`, kein Konflikt.                                         |
| Editor-Pane fokussiert              | Insert deaktiviert.                                                                           |
| Multi-Selection (>1 Element)        | Open Question — eher no-op, da unklar wo eingefügt werden soll.                               |

### Open Questions zur Insertion

1. **Default-Content:** Soll `T` `"Text"` einfügen oder einen leeren
   Text? Leerer Text ist optisch unsichtbar und schwer zu finden;
   `"Text"` ist überschreibbar und sichtbar. Aktuelle Annahme:
   `"Text"`.
2. **Inline-Edit nach Insert:** Soll nach `T` automatisch in den
   Inline-Text-Edit-Mode gewechselt werden, sodass der User direkt
   tippen kann ohne extra `Enter`/Doppelklick? Würde Flow stark
   beschleunigen, ist aber eine zusätzliche Modus-Verschachtelung.
3. **Erweiterung:** `B` für Button, `L` für Link — wie weit treibt
   man das Schema? Bereits belegt: `H` (horizontal), `V` (vertical),
   `U` (ungroup), `S` (spread), `P`/`M`/`G` (Spacing-Modes), `F` (full
   dimension). Frei für Insert: `B`, `L`, `D` (Divider?), `Z` (?),
   `X` (?). Image hat kein offensichtlich freies Initial — `J`?
   Vorab-Reservierung sinnvoll.
4. **Position:** Immer "letztes Kind" oder per Modifier auch "erstes
   Kind" / "vor Selektion" / "nach Selektion"?

## Nicht-Ziele

- **Kein Maus-Ersatz:** Visual Handles bleiben für maus-orientiertes
  Tweaking. Der Keyboard-Mode ist ein **zusätzlicher** Pfad, kein
  Ersatz.
- **Kein Layout-Mode:** Direction (`hor`/`ver`), Align, Wrap etc. sind
  nicht Teil dieses Modus — eigenes Konzept.
- **Keine Animation:** Step-Änderungen sind sofort sichtbar, ohne
  Tween. Animation würde die Modal-Speed kaputt machen.
