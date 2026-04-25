# Demo Headed-Verification

Headless Demo-Läufe (`npm run test:demos`) validieren Editor-Source und
Computed-Style automatisch — sie sind die CI-Basis. **Visuelle Aspekte**
(Cursor-Animation, Pacing, Single-Cursor-Effekt, Overlays) müssen aber von
einem Menschen im headed-Browser durchlaufen werden, weil sie nur im
realen Render sichtbar sind.

Diese Checkliste ist die manuelle Verifikation **vor jedem**:

- Major-Release / Tag
- Demo-Skript-Bereinigung oder Pacing-Änderung
- Studio-Änderung an Cursor / Property-Panel / AI-Pfad
- Video-Aufnahme

## Vor dem Lauf

```bash
# 1. Studio läuft
npm run studio   # Terminal 1

# 2. Demo headed mit video-Pacing
npx tsx tools/test.ts \
  --demo=tools/test-runner/demo/scripts/visual-editing.ts \
  --pacing=video --headed
```

Wahlweise auch andere Demo-Skripte oder die ganze Suite mit `--headed`:

```bash
npm run test:demos:headed
```

## Was zu prüfen ist (pro Demo)

### 1. Cursor

- [ ] **Single Cursor**: Während Drag-Operationen ist genau **ein** Cursor
      sichtbar (der Demo-Pfeil-SVG, ID `__demo-cursor`). **Kein** zweiter
      blauer Kreis (`__drag-test-cursor`) — der wird automatisch ausgeblendet.
- [ ] **Smooth Movement**: Cursor-Bewegung ist eine flüssige Bezier-Kurve
      mit Easing, kein Sprung.
- [ ] **Click-Ripple**: Bei `click` / `doubleClick` zeigt sich ein blauer
      Ripple-Kreis am Cursor.
- [ ] **Synchronisation**: Bei `dropFromPalette`, `dragResize`, etc.
      läuft der Demo-Cursor parallel zur tatsächlichen Drag-Operation
      (kein Versatz, keine Verzögerung).

### 2. Highlights

- [ ] `paletteHighlight` zeigt blauen Border + Glow auf Palette-Item
- [ ] `highlight`-Action am Ende fokussiert Editor / Preview
- [ ] Highlights faden sauber ein und aus (keine harten Cuts)

### 3. Pacing

- [ ] `--pacing=video`: Tippen 45ms/char, Mausbewegung ~400ms
      (komfortable Lesegeschwindigkeit)
- [ ] `wait`-Zwischenstops wirken natürlich (nicht zu lang, nicht zu kurz)
- [ ] Comments zwischen Schritten geben Zeit zum Mitlesen

### 4. Keystroke-Overlay

- [ ] Bei Tipp-Aktionen (`type`, `inlineEdit`, `aiPrompt`) erscheint die
      jeweilige Taste unten rechts in einem dunklen Badge
- [ ] Modifier-Tasten (`⌘`, `⌥`, `⇧`) werden korrekt zusammengefasst
- [ ] Overlay fadet nach `pressKey.overlayMs` raus

### 5. Property-Panel

- [ ] `selectInPreview` blau-umrahmt das selektierte Element
- [ ] Property-Panel zeigt sofort die korrekten Werte
- [ ] `setProperty` triggert sichtbar einen Focus auf das Field, dann
      Wertschreiben, dann Blur
- [ ] `pickColor` öffnet visuell den Color-Picker (auch wenn der Wert
      hinten via API committed wird)

### 6. AI-Demo

- [ ] `aiPrompt` zeigt das `--<text>--` Block-Tippen sichtbar
- [ ] Während AI „denkt" (Mock antwortet nach 80ms): kurze Pause
- [ ] Der AI-Response erscheint als komplette Code-Ersetzung (kein
      Tipp-Animation für den Response — bewusste Designentscheidung)

### 7. Inline-Edit

- [ ] Doppelklick-Ripple auf das Element
- [ ] Floating Input-Field positioniert sich exakt über dem Element
- [ ] Char-by-char Tippen mit `charDelay` (default 60ms)
- [ ] Enter committed visible (kein hängender Inline-Editor)

### 8. Drop-Indikatoren

- [ ] Während `dropFromPalette`: blaue Drop-Linie / Alignment-Zonen sichtbar
- [ ] Container highlightet beim Hover
- [ ] Nach Drop: Element animiert in die Ziel-Position

### 9. Padding / Margin / Resize

- [ ] Handles werden nach `selectInPreview` sichtbar (P / M / Resize-Modi)
- [ ] Beim `dragPadding` / `dragMargin` / `dragResize` läuft eine
      visuelle „Gummiband"-Animation
- [ ] Live-Preview während des Drags (nicht erst beim Loslassen)

### 10. State-Demo

- [ ] Hover-Trigger ist sichtbar im Browser (Background-Wechsel)
- [ ] Unhover restored den Default-State

## Pro Demo: Erwartete Eindrücke

### `visual-editing.ts` (~22s in video pacing)

Vollständige Card wird visuell gebaut: Frame → Resize → H1 → Text →
Button → Padding → Margin → Inline-Edit (2×) → Reorder.

### `property-workflow.ts` (~20s)

Card via Property-Panel gestaltet: width → height → gap → bg-Color →
H1 → col → Text-Edit.

### `ai-assisted-card.ts` (~15s)

`--`-Prompt wird getippt, AI antwortet, dann Tweaking: H1-Color +
Text-Edit.

### `token-system.ts` (~12s)

Multi-File: tokens.tok wird angelegt, Token-Reference im Layout, finale
Card hat Token-Color.

### `responsive-design.ts` (~10s)

Drei Canvas-Wechsel mobile → tablet → desktop, gleiche Card.

### `state-interactions.ts` (~8s)

Button mit hover-State: Default blau → Hover rot → wieder blau.

### `component-extraction.ts` (~12s)

components.com mit Card-Definition, Layout mit 3 Card-Verwendungen.

## Bei Problemen

| Symptom                      | Mögliche Ursache                                                      | Fix                                |
| ---------------------------- | --------------------------------------------------------------------- | ---------------------------------- |
| Zwei Cursor sichtbar         | `__dragTest.setAnimation({ showCursor: false })` wurde nicht injected | DemoRunner.injectDemoAPI prüfen    |
| Cursor springt statt fliegen | `pacing` zu schnell, oder requestAnimationFrame im Browser blockiert  | `--pacing=presentation` testen     |
| Drop-Indikator fehlt         | Studio-Drag-System nicht initialisiert                                | `__dragTest`-Init in Studio prüfen |
| Highlight unsichtbar         | CSS `.demo-highlight` evtl. nicht geladen                             | Studio-Bundle inkl. Demo-Styles?   |
| AI-Response erscheint nicht  | Mock-Fixture fehlt für genauen Prompt                                 | `--ai-mock=PATH` korrekt?          |

## CI-Integration

Headed-Verification ist **manuell** und gehört nicht in CI. Der Headless-
Suite-Lauf (`npm run test:demos`) ist die automatisierte Sicherung —
deckt aber Editor-Source und Computed-Style ab, **nicht** das visuelle
Erlebnis.

## Aufzeichnung

Für Video-Demos:

1. Headed-Lauf starten mit `--pacing=video`
2. Browser-Window auf Standard-Größe (z.B. 1440×900 Desktop)
3. Bildschirmaufnahme starten
4. Demo läuft autonom durch — keine User-Interaktion nötig
5. Aufnahme stoppen wenn Demo fertig ist
