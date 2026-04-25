# Property Workflow Demo

Eine Showcase-Demo, die den Cross-Panel-Workflow zwischen **Preview**,
**Property Panel** und **Code-Editor** zeigt — den Kern der Studio-UX.

Skript: `tools/test-runner/demo/scripts/property-workflow.ts`
Spec: dieses Dokument · Infrastruktur: `demo-infrastructure.md` (Phase B1)

## Auftrag

Zeigen, wie ein User eine Card via Property-Panel-UI gestaltet — nicht durch
Code-Tippen, nicht durch Drag-Handles, sondern durch **Klick auf das Element
im Preview** und **Eingabe in die Property-Felder**. Das ist der dominante
Mirror-Workflow für Feinjustierung.

## Was die Demo demonstriert

1. **Preview-Selection**: User klickt im Preview, Property-Panel füllt sich
   automatisch mit den Properties des selektierten Elements.
2. **Direct Property Input**: Numerische / textuelle Werte wie `gap`, `width`
   werden direkt ins Feld getippt → Code aktualisiert sich live.
3. **Color Picker UI**: Klick auf den Color-Swatch öffnet den Color-Picker,
   eine Auswahl committed den Wert ins Code.
4. **Bidirektionale Sync**: Jede Property-Änderung erscheint sofort im
   Code-Editor (verifiziert durch `expectCode` nach jedem Schritt).

## Ablauf

| #   | Schritt                            | Action                    | Was es zeigt              |
| --- | ---------------------------------- | ------------------------- | ------------------------- |
| 1   | Reset auf leeren Canvas            | `resetCanvas()` Fragment  | Setup                     |
| 2   | Frame ins Canvas droppen           | `dropFromPalette`         | Hierarchie                |
| 3   | Card-Frame im Preview anclicken    | `selectInPreview`         | Property-Panel füllt sich |
| 4   | Width auf 320 setzen               | `setProperty width=320`   | Sizing via Input          |
| 5   | Height auf 200 setzen              | `setProperty height=200`  | Sizing via Input          |
| 6   | Gap auf 12 setzen                  | `setProperty gap=12`      | Layout via Input          |
| 7   | Background-Color via Picker setzen | `pickColor bg=#2196F3`    | Color-Picker-UI           |
| 8   | H1 in die Card droppen             | `dropFromPalette H1`      | Hierarchie 2              |
| 9   | H1 im Preview anclicken            | `selectInPreview`         | Re-Selection              |
| 10  | Title-Color via Picker             | `pickColor col=#FFFFFF`   | Color-Picker für Text     |
| 11  | Title-Text per Inline-Edit         | `inlineEdit "Willkommen"` | Inline-Edit               |

Pro mutierender Schritt ein `expectCode`-Snapshot.

## Validierungsstrategie

Wie `visual-editing.ts`: jeder Schritt hat einen `expectCode`-Lock-In gegen
den exakten Editor-Stand. Erst Lern-Lauf um die Erwartungen zu kalibrieren,
dann Strict-Lauf zur Verifikation.

Bonus: ein finaler `expectDom`-Check verifiziert, dass die computed-styles
(width, height, padding, background) im Preview tatsächlich gerendert sind
— das ist die andere Hälfte der Cross-Panel-Story.

## Erwarteter Endcode

```mirror
Frame bg #0f0f0f, col white, pad 24, gap 16, w full, h full, center
  Frame w 320, h 200, bg #2196F3, rad 8, gap 12
    H1 "Willkommen", col #FFFFFF
```

(Wird durch den Lern-Lauf bestätigt; bei Abweichung Anpassung im
Skript-Snippet, nicht in der Spec.)
