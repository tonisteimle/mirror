# Animation Picker & Animation DSL

## Vision

Ein mächtiger Animation-Editor (wie After Effects Timeline) als Picker-Panel im Mirror Studio. Animationen werden in einer einfachen, deklarativen DSL definiert - der Editor ist das visuelle Werkzeug zum Erstellen und Bearbeiten.

## Prototyp

`examples/animation-picker-prototype.html` - Funktionierender UI-Prototyp mit:
- Preview-Bereich mit Live-Animation
- Play/Pause und Scrubber
- Timeline mit Property-Tracks
- Keyframe-Bars (ziehbar)
- Easing-Presets und Bezier-Kurven-Editor
- Property Values (From → To)

---

## Animation DSL Syntax

### Grundprinzip

Animationen werden wie Komponenten definiert. Die Zeitpunkte (in Sekunden) sind die Keyframes, die Properties beschreiben den Zustand zu diesem Zeitpunkt.

```
AnimationName as animation: [globales-easing]
  zeitpunkt property wert, property wert
  zeitpunkt property wert, property wert
```

**Duration**: Ergibt sich automatisch aus dem letzten Zeitpunkt.

**Zeitformat**: Sekunden mit Dezimalpunkt. `0.30` = 300ms, `1.00` = 1 Sekunde.

---

### Einfachstes Beispiel

```
FadeIn as animation:
  0.00 opacity 0
  0.30 opacity 1
```

- Animation dauert 0.30 Sekunden (300ms)
- opacity geht von 0 auf 1
- Lineares Easing (default)

### Mit globalem Easing

```
FadeIn as animation: ease-out
  0.00 opacity 0
  0.30 opacity 1
```

Alle Übergänge nutzen ease-out.

### Mehrere Properties

```
FadeUp as animation: ease-out
  0.00 opacity 0, y-offset 20
  0.30 opacity 1, y-offset 0
```

Beide Properties animieren gleichzeitig von 0.00 bis 0.30.

### Gestaffeltes Timing

```
FadeUp as animation: ease-out
  0.00 opacity 0, y-offset 20
  0.20 y-offset 0
  0.30 opacity 1
```

- y-offset ist bei 0.20s fertig
- opacity erst bei 0.30s
- Gesamtdauer: 0.30s

### Easing pro Property überschreiben

```
FadeUp as animation: ease-out
  0.00 opacity 0, y-offset 20
  0.20 y-offset 0
  0.30 opacity 1 ease-in
```

- Global: ease-out
- opacity nutzt ease-in für sein letztes Segment

**Bei mehreren Properties auf einer Zeile:**
```
0.30 opacity 1 ease-in, y-offset 0 ease-out
```
Jede Property kann ihr eigenes Easing haben. Ohne Angabe gilt das globale.

### Komplexes Beispiel

```
CardEnter as animation: ease-out
  0.00 opacity 0, y-offset 30, scale 0.95
  0.15 y-offset 0
  0.20 scale 1
  0.30 opacity 1 ease-in
```

- y-offset: 0 → 0.15s (ease-out)
- scale: 0 → 0.20s (ease-out)
- opacity: 0 → 0.30s (ease-in)

---

## Animation Trigger

### Events

| Event | Beschreibung |
|-------|--------------|
| `onclick` | Bei Klick |
| `onhover` | Bei Hover |
| `onenter` | Element erscheint (wird sichtbar) |
| `onexit` | Element verschwindet |
| `onfocus` | Fokus erhalten |
| `onblur` | Fokus verloren |

### State-Wechsel

Animationen können bei State-Änderungen ausgelöst werden:

```
Panel:
  state collapsed -> expanded animate Expand
  state expanded -> collapsed animate Collapse
```

### Implizite Transitions

Für einfache State-Wechsel ohne eigene Animation:

```
Panel:
  state collapsed
    height 48
  state expanded
    height 200
  transition 0.30 ease-out
```

Alle Property-Änderungen werden automatisch animiert.

---

## Animation anwenden

### Implizites self

Wenn keine Elemente angegeben werden, wird das Element selbst animiert:

```
Button onclick animate FadeIn
```
→ Der Button wird animiert (self ist implizit)

### Explizite Elemente

```
Button onclick animate FadeIn Card1, Card2
```
→ Card1 und Card2 werden animiert, nicht der Button

### Mehrere Elemente (gleiches Verhalten)

Ohne Rollen-Definition machen alle Elemente das gleiche:

```
Rotate as animation: ease-out
  0.00 rotate 0
  1.00 rotate 360

Button onclick animate Rotate Box1, Box2, Box3
```
→ Alle drei Boxen rotieren gleichzeitig

### Mit Stagger

```
Button onclick animate Rotate Box1, Box2, Box3, stagger 0.10
```
→ Box1 startet bei 0s, Box2 bei 0.10s, Box3 bei 0.20s

### Mit Delay

```
Button onclick animate FadeIn, delay 0.50
```
→ Animation startet nach 0.50s Verzögerung

### Mit Loop

```
Spinner onclick animate Rotate, loop
Pulse onclick animate Glow, loop 3
```
→ `loop` = unendlich, `loop 3` = 3 Wiederholungen

### Mit Reverse

```
Button onclick animate FadeIn, reverse
```
→ Spielt die Animation rückwärts ab

---

## Choreographie (verschiedene Rollen)

Für komplexe Animationen mit unterschiedlichem Verhalten pro Element:

### Animation mit Rollen definieren

```
SpinDuo as animation: ease-out
  Spinner:
  Grower:
  0.00 Spinner rotate 0, Grower scale 1
  1.00 Spinner rotate 360, Grower scale 2
```

### Rollen zuweisen (wie Komponenten-Slots)

```
animate SpinDuo Spinner RedBox; Grower BlueBox
Button onclick animate SpinDuo Spinner Card1; Grower Card2
```

### Konsistenz mit Mirror-Syntax

Gleiches Muster wie bei Komponenten-Kindern:

```
// Komponente
Button:
  Icon:
  Label:
Button Icon "circle"; Label "Klick mich"

// Animation - gleiches Muster
SpinDuo as animation:
  Spinner:
  Grower:
animate SpinDuo Spinner Box1; Grower Box2
```

### Mehrere Elemente pro Rolle

```
0.00 Box1, Box2, Box3 rotate 0
1.00 Box1, Box2, Box3 rotate 360
```

Oder mit unterschiedlichem Timing:

```
0.00 Box1, Box2, Box3 rotate 0
0.80 Box1 rotate 360
0.90 Box2 rotate 360
1.00 Box3 rotate 360
```

---

## Easing-Optionen

### Presets

| Name | Beschreibung |
|------|--------------|
| `linear` | Gleichmäßig (default) |
| `ease` | Sanfter Start und Ende |
| `ease-in` | Langsam starten |
| `ease-out` | Langsam enden |
| `ease-in-out` | Langsam starten und enden |

### Custom Bezier

```
FadeIn as animation: ease(0.2, 0.8, 0.3, 1)
  0.00 opacity 0
  0.30 opacity 1
```

### Spring

```
Bounce as animation: spring(200, 20)
  0.00 y-offset 30
  1.00 y-offset 0
```

Parameter: `spring(stiffness, damping)`

- **stiffness**: Federstärke (höher = schneller, default 100)
- **damping**: Dämpfung (höher = weniger Nachschwingen, default 10)

---

## Animierbare Properties

### Empfohlen (sicher, performant)

| Property | Beschreibung |
|----------|--------------|
| `opacity` | Transparenz (0-1) |
| `x-offset` | Horizontale Verschiebung |
| `y-offset` | Vertikale Verschiebung |
| `scale` | Skalierung |
| `scale-x` | Horizontale Skalierung |
| `scale-y` | Vertikale Skalierung |
| `rotate` | Rotation in Grad |

### Mit Vorsicht (kann Layout beeinflussen)

| Property | Beschreibung |
|----------|--------------|
| `width` | Breite |
| `height` | Höhe |
| `padding` | Innenabstand |
| `gap` | Abstand zwischen Kindern |
| `radius` | Eckenradius |

### Farben

| Property | Beschreibung |
|----------|--------------|
| `background` | Hintergrundfarbe |
| `color` | Textfarbe |
| `border-color` | Rahmenfarbe |

---

## Editor ↔ Code Mapping

| Editor-Element | DSL-Syntax |
|----------------|------------|
| Animation erstellen | `Name as animation:` |
| Duration | Letzter Zeitpunkt (z.B. `1.00` = 1s) |
| Globales Easing | Nach Doppelpunkt: `animation: ease-out` |
| Keyframe hinzufügen | Neue Zeile mit Zeitpunkt |
| Property-Wert | `property wert` |
| Track-Start/Ende | Zeitpunkte der Property |
| Easing pro Property | Nach Wert: `opacity 1 ease-in` |
| Bezier-Kurve | `ease(x1, y1, x2, y2)` |
| Spring | `spring(stiffness, damping)` |
| Rolle hinzufügen | `RoleName:` vor Keyframes |

---

## Editor öffnen

Der Animation-Picker öffnet sich wenn:
1. Cursor auf `as animation:` steht
2. Cursor auf einem Zeitpunkt/Keyframe steht

Alternativ:
- Keyboard Shortcut (z.B. Cmd+Shift+A)
- Button im Property Panel unter "Animation"

---

## Zusammenfassung

### Einfache Animation

```
FadeIn as animation: ease-out
  0.00 opacity 0
  0.30 opacity 1

Button onclick animate FadeIn
```

### Mit Optionen

```
Button onclick animate FadeIn, delay 0.20, loop 3
```

### Mehrere Elemente

```
Button onclick animate Rotate Box1, Box2, Box3, stagger 0.10
```

### Choreographie

```
Dance as animation: ease-out
  Lead:
  Follow:
  0.00 Lead rotate 0, Follow scale 1
  1.00 Lead rotate 360, Follow scale 2

animate Dance Lead Box1; Follow Box2
```

---

## Offene Fragen

1. **Relative Werte**: `y-offset +20` (relativ zur aktuellen Position)?
2. **Pause/Resume**: Kann man Animationen pausieren?
3. **Callbacks**: `animate FadeIn, then animate SlideOut`?
4. **Benannte Keyframes**: Für bessere Lesbarkeit bei komplexen Animationen?

---

## Implementierungs-Status

1. [x] Syntax finalisiert
2. [x] Parser erweitert für `as animation:` (src/parser/parser.ts)
3. [x] Events `onenter`/`onexit` implementiert (IntersectionObserver)
4. [x] Animation-Runtime implementiert (src/runtime/dom-runtime.ts)
5. [x] Animation-Picker in Studio integriert (src/studio/animation-picker.ts + studio/app.js)
6. [x] Bidirektionale Sync: Code ↔ Editor

### Implementierte Dateien

- `src/parser/ast.ts` - AnimationDefinition, AnimationKeyframe types
- `src/parser/parser.ts` - parseAnimationDefinition()
- `src/ir/types.ts` - IRAnimation interfaces
- `src/ir/index.ts` - transformAnimation()
- `src/runtime/dom-runtime.ts` - animate(), registerAnimation(), setupEnterExitObserver()
- `src/backends/dom.ts` - emitAnimations(), emitAnimationRegistration()
- `src/studio/animation-picker.ts` - Timeline-based AnimationPicker class
- `src/studio/code-modifier.ts` - updateAnimation(), addAnimationKeyframe()
- `studio/app.js` - Animation picker integration, trigger, keyboard shortcuts
- `studio/index.html` - Animation picker container element
