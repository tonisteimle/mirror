# Layout-Analyse: Korrekte CSS-Kombinationen

Diese Analyse dokumentiert die korrekten CSS-Ausgaben für alle Layout-Kombinationen in Mirror, um konsistentes Flexbox-Verhalten sicherzustellen.

## Grundprinzipien

### Flexbox-Achsen
```
Container mit hor (flex-direction: row):
├── Hauptachse: horizontal (←→)
└── Kreuzachse: vertikal (↑↓)

Container mit ver (flex-direction: column):
├── Hauptachse: vertikal (↑↓)
└── Kreuzachse: horizontal (←→)
```

### CSS-Defaults (wichtig!)
- `align-items: stretch` - Kinder strecken sich auf Kreuzachse (DEFAULT)
- `justify-content: flex-start` - Kinder starten am Anfang der Hauptachse
- `flex-grow: 0` - Kinder wachsen nicht automatisch
- `flex-shrink: 1` - Kinder schrumpfen bei Platzmangel

---

## 1. Container-Layouts

### 1.1 Horizontaler Container (`hor`)
```mirror
Container hor
```
```css
display: flex;
flex-direction: row;
```

### 1.2 Vertikaler Container (`ver`)
```mirror
Container ver
```
```css
display: flex;
flex-direction: column;
```

### 1.3 Grid Container
```mirror
Container grid 3
```
```css
display: grid;
grid-template-columns: repeat(3, 1fr);
```

### 1.4 Stacked Container (Z-Achse)
```mirror
Container stacked
```
```css
display: grid;
/* Alle Kinder auf gleicher Zelle */
> * { grid-area: 1 / 1; }
```

### 1.5 Position Container (Absolute Positionierung)
```mirror
Container position
```
oder
```mirror
Container pos
```
```css
position: relative;
/* Kinder bekommen automatisch position: absolute */
```

#### Wichtig: `full` in Position-Containern
In absoluten Layouts funktioniert `flex: 1 1 0%` NICHT, da es keinen Flex-Kontext gibt!

```mirror
Container position
  Box w full, h full    # ← NICHT flex-basiert!
```

```css
/* Container */
.container { position: relative; }

/* Kind - KORREKT für absolute Positionierung */
.box {
  position: absolute;
  width: 100%;    /* ← Hier IST 100% korrekt! */
  height: 100%;
}
```

**Unterschied zu Flexbox:**
| Layout | `w full` CSS | Grund |
|--------|-------------|-------|
| `hor` / `ver` | `flex: 1 1 0%` | Respektiert Padding, teilt Platz mit Geschwistern |
| `position` | `width: 100%` | Kein Flex-Kontext, 100% relativ zum Containing Block |

---

## 2. Kind-Größen

### 2.1 `w full` / `h full` - Verfügbaren Platz füllen

#### Verhalten:
- **Hauptachse:** Füllt den verbleibenden Platz (nach Padding, Gap, anderen Kindern)
- **Kreuzachse:** Streckt sich auf volle Höhe/Breite (durch `align-items: stretch`)

#### Korrektes CSS:
```css
flex: 1 1 0%;      /* grow: 1, shrink: 1, basis: 0% */
min-width: 0;      /* Erlaubt Schrumpfen unter Content-Größe */
/* KEIN width: 100%! Das würde Padding ignorieren */
```

#### Warum `flex: 1 1 0%` statt `width: 100%`:
```
┌─────────────────────────────────┐
│ Container (pad 20)              │
│ ┌───────────────────────────┐   │
│ │   width: 100% = FALSCH    │   │  ← Ignoriert Padding!
│ └───────────────────────────┘   │
│                                 │
│   ┌───────────────────────┐     │
│   │  flex: 1 = RICHTIG    │     │  ← Respektiert Padding
│   └───────────────────────┘     │
└─────────────────────────────────┘
```

### 2.2 `w hug` / `h hug` - Inhalt umschließen

#### Verhalten:
- Größe passt sich dem Inhalt an
- Wächst/schrumpft nicht mit Container

#### Korrektes CSS:
```css
width: fit-content;   /* oder height: fit-content */
flex-shrink: 0;       /* Nicht schrumpfen */
```

### 2.3 `w 200` / `h 100` - Fixe Größe

#### Korrektes CSS:
```css
width: 200px;
flex-shrink: 0;       /* Nicht schrumpfen (optional) */
```

### 2.4 `size full` - Beide Achsen füllen

#### Korrektes CSS:
```css
flex: 1 1 0%;
min-width: 0;
min-height: 0;
/* KEIN width/height: 100%! */
```

---

## 3. Kombinationsmatrix: Container + Kind-Größe

### 3.1 Horizontaler Container (`hor`)

| Kind-Eigenschaft | Hauptachse (horizontal) | Kreuzachse (vertikal) |
|------------------|-------------------------|----------------------|
| `w full` | `flex: 1 1 0%; min-width: 0` | Streckt automatisch (stretch) |
| `h full` | - | `align-self: stretch` (default) |
| `w hug` | `width: fit-content` | Streckt automatisch |
| `h hug` | - | `height: fit-content; align-self: flex-start` |
| `w 200` | `width: 200px` | Streckt automatisch |
| `h 100` | - | `height: 100px; align-self: flex-start` |

### 3.2 Vertikaler Container (`ver`)

| Kind-Eigenschaft | Hauptachse (vertikal) | Kreuzachse (horizontal) |
|------------------|----------------------|-------------------------|
| `h full` | `flex: 1 1 0%; min-height: 0` | Streckt automatisch (stretch) |
| `w full` | - | `align-self: stretch` (default) |
| `h hug` | `height: fit-content` | Streckt automatisch |
| `w hug` | - | `width: fit-content; align-self: flex-start` |
| `h 200` | `height: 200px` | Streckt automatisch |
| `w 100` | - | `width: 100px; align-self: flex-start` |

---

## 4. Alignment-Kombinationen

### 4.1 Container-Alignment

#### Hauptachse: `justify-content`
| Mirror | CSS | Effekt |
|--------|-----|--------|
| `spread` | `justify-content: space-between` | Gleichmäßig verteilt |
| `center` (Hauptachse) | `justify-content: center` | Zentriert |
| `left` (in hor) | `justify-content: flex-start` | Links |
| `right` (in hor) | `justify-content: flex-end` | Rechts |
| `top` (in ver) | `justify-content: flex-start` | Oben |
| `bottom` (in ver) | `justify-content: flex-end` | Unten |

#### Kreuzachse: `align-items`
| Mirror | CSS | Effekt |
|--------|-----|--------|
| `center` (Kreuzachse) | `align-items: center` | Zentriert |
| `top` (in hor) | `align-items: flex-start` | Oben |
| `bottom` (in hor) | `align-items: flex-end` | Unten |
| `left` (in ver) | `align-items: flex-start` | Links |
| `right` (in ver) | `align-items: flex-end` | Rechts |
| (default) | `align-items: stretch` | Strecken |

### 4.2 Alignment + `full` Interaktion

**Wichtig:** Wenn `align-items` nicht `stretch` ist, funktioniert `w full` / `h full` auf der Kreuzachse anders!

```mirror
Container ver, center
  Box w full    # w full hat hier keinen Effekt auf Kreuzachse!
```

Lösung: `w full` auf Kreuzachse braucht explizites `align-self: stretch`:

```css
/* Box in ver Container mit center alignment */
.box {
  flex: 1 1 0%;
  min-width: 0;
  align-self: stretch;  /* Überschreibt parent's align-items: center */
}
```

---

## 5. Komplexe Szenarien

### 5.1 Mehrere `full`-Kinder

```mirror
Container hor, gap 10
  Box1 w full
  Box2 w full
  Box3 w full
```

CSS-Ergebnis:
```css
.container { display: flex; gap: 10px; }
.box1, .box2, .box3 { flex: 1 1 0%; min-width: 0; }
```

Verhalten: Jede Box bekommt 1/3 des verfügbaren Platzes (nach Abzug von Gap).

### 5.2 Mix aus `full` und `fixed`

```mirror
Container hor, pad 20
  Sidebar w 200
  Content w full
```

CSS-Ergebnis:
```css
.container { display: flex; padding: 20px; }
.sidebar { width: 200px; flex-shrink: 0; }
.content { flex: 1 1 0%; min-width: 0; }
```

Verhalten: Sidebar = 200px, Content = Rest (Container - 200px - 40px Padding).

### 5.3 Nested Full

```mirror
App
  Container ver, pad 20
    Header h 60
    Content h full
      Sidebar w 200
      Main w full
```

CSS-Hierarchie:
```css
.app { width: 100%; height: 100%; }
.container { display: flex; flex-direction: column; padding: 20px; }
.header { height: 60px; }
.content { flex: 1 1 0%; min-height: 0; display: flex; }
.sidebar { width: 200px; }
.main { flex: 1 1 0%; min-width: 0; }
```

### 5.4 Grid mit full

```mirror
Container grid 2, gap 10
  Box1 w full    # In Grid: full = 1fr (implizit)
  Box2 w full
```

In Grid-Layouts ist `full` weniger relevant, da Grid-Zellen automatisch gefüllt werden.

---

## 6. Problematische Patterns (Anti-Patterns)

### 6.1 ❌ `width: 100%` in Flex-Container

```css
/* FALSCH - ignoriert Parent-Padding */
.child { width: 100%; }

/* RICHTIG */
.child { flex: 1 1 0%; min-width: 0; }
```

### 6.2 ❌ `height: 100%` ohne Container-Höhe

```css
/* FALSCH - funktioniert nicht wenn Parent keine fixe Höhe hat */
.child { height: 100%; }

/* RICHTIG in Flex */
.child { flex: 1 1 0%; min-height: 0; }
```

### 6.3 ✅ `full` mit `center` Alignment (Kreuzachse) - GELÖST

```mirror
Container ver, center
  Box w full    # ✅ Funktioniert jetzt dank align-self: stretch
```

**Lösung implementiert:** Bei `w full` / `h full` wird automatisch `align-self: stretch` gesetzt,
das die `align-items: center` des Parents überschreibt.

---

## 7. Implementierungs-Regeln für IR-Transformer

### Regel 1: `full` → flex + align-self: stretch
```typescript
// w full oder h full
{ property: 'flex', value: '1 1 0%' }
{ property: isWidth ? 'min-width' : 'min-height', value: '0' }
{ property: 'align-self', value: 'stretch' }  // Überschreibt parent alignment
// KEIN width/height: 100%!
```

### Regel 2: `hug` → fit-content
```typescript
// w hug oder h hug
{ property: isWidth ? 'width' : 'height', value: 'fit-content' }
```

### Regel 3: `full` setzt immer align-self: stretch
```typescript
// Wird automatisch bei w full / h full gesetzt
// Überschreibt parent's align-items (center, flex-start, etc.)
{ property: 'align-self', value: 'stretch' }
```

### Regel 4: fixe Größen brauchen flex-shrink: 0 (optional)
```typescript
// w 200
{ property: 'width', value: '200px' }
{ property: 'flex-shrink', value: '0' }  // Verhindert Schrumpfen
```

### Regel 5: `position` Container → Kinder werden absolute
```typescript
// Parent hat position: relative
// Kinder bekommen automatisch:
{ property: 'position', value: 'absolute' }
```

### Regel 6: `full` in Position-Container → 100% statt flex
```typescript
// Wenn Kind in position Container UND w/h full:
// NICHT flex: 1 1 0%, sondern:
{ property: 'width', value: '100%' }   // bei w full
{ property: 'height', value: '100%' }  // bei h full

// Implementierung: Nach dem Setzen von position: absolute,
// flex-basierte Styles entfernen und durch 100% ersetzen
```

### Regel 7: `full` in Grid-Container → Styles entfernen
```typescript
// Wenn Kind in grid Container UND w/h full:
// flex: 1 1 0% entfernen - Grid füllt automatisch
// Keine width/height nötig - Grid-Zellen füllen ihren Bereich

// Implementierung: Flex-basierte Styles erkennen und entfernen
const hasFlex = child.styles.some(s => s.property === 'flex')
if (hasFlex) {
  // Entferne flex, align-self, min-width, min-height
  // Füge NICHTS hinzu - Grid regelt das automatisch
}
```

---

## 8. Test-Checkliste

### 8.1 `full` Tests (Flexbox)
- [x] `w full` in `hor` Container mit `pad` → Respektiert Padding ✅
- [x] `h full` in `ver` Container mit `pad` → Respektiert Padding ✅
- [x] `w full` in `ver` Container → Streckt auf volle Breite (Kreuzachse) ✅
- [x] `h full` in `hor` Container → Streckt auf volle Höhe (Kreuzachse) ✅
- [x] Mehrere `w full` in `hor` → Gleiche Aufteilung ✅
- [x] `w full` + `w 200` in `hor` → Korrekte Restberechnung ✅
- [x] `w full` in `ver, center` → Funktioniert trotz center ✅ (align-self: stretch)
- [x] Nested full-Container → Korrekte Propagierung ✅
- [x] `size full` → Beide Achsen korrekt ✅

### 8.2 `full` Tests (Position/Absolute)
- [x] `w full` in `position` Container → Generiert `width: 100%` (NICHT flex) ✅
- [x] `h full` in `position` Container → Generiert `height: 100%` (NICHT flex) ✅
- [x] `w full, h full` in `position` → Beide 100% ✅
- [x] Kind in `position` bekommt `position: absolute` ✅
- [x] Nested `position` Container → Inneres Kind auch absolute ✅
- [x] `w full` nur (ohne h full) in `position` → Nur width: 100%, height bleibt ungesetzt ✅

### 8.3 `full` Tests (Grid)
- [x] `w full` in `grid` Container → Keine flex-Styles (Grid füllt automatisch) ✅
- [x] `h full` in `grid` Container → Keine flex-Styles ✅
- [x] `w full, h full` in `grid` → Keine flex-Styles ✅
- [x] Grid-Zellen füllen ihren Bereich automatisch ✅

### 8.4 `hug` Tests
- [x] `w hug` → Generiert `width: fit-content` ✅
- [x] `h hug` → Generiert `height: fit-content` ✅
- [x] `w hug` in `ver, center` → Bleibt hug, kein Stretching ✅
- [x] `h hug` in `hor, center` → Bleibt hug, kein Stretching ✅
- [x] `h hug` + `h full` Geschwister → Hug bleibt fix, full füllt Rest ✅
- [x] `w hug` + `w full` Geschwister in `hor` → Korrekte Aufteilung ✅
- [x] Nested hug-Container → Alle verwenden fit-content ✅
- [x] `size hug` → Beide Achsen fit-content ✅
- [x] `hug` Kinder mit `spread` Parent → Verteilung korrekt ✅

---

## Fazit

### `full` - Flexbox-basiert
Die korrekte CSS-Generierung für `full` basiert auf:

1. **Flexbox-Verständnis:** `flex: 1 1 0%` füllt verfügbaren Platz, `width: 100%` nicht
2. **Achsen-Awareness:** Hauptachse vs. Kreuzachse erfordert unterschiedliche Strategien
3. **Alignment-Interaktion:** `center` etc. überschreiben `stretch` auf Kreuzachse
4. **min-width/height: 0:** Erlaubt Schrumpfen unter Content-Größe
5. **align-self: stretch:** Überschreibt Parent-Alignment für Kreuzachsen-Stretch

Die Implementierung setzt korrekt `flex: 1 1 0%` + `align-self: stretch` ohne `width: 100%`.

### `hug` - fit-content basiert
Die korrekte CSS-Generierung für `hug` basiert auf:

1. **fit-content:** Größe passt sich dem Inhalt an
2. **Kein Stretch:** `hug` setzt kein `align-self`, daher kein ungewolltes Stretching
3. **Kompatibilität:** Funktioniert korrekt mit `full`-Geschwistern und allen Alignment-Optionen

Die Implementierung setzt `width/height: fit-content` und respektiert das natürliche Flexbox-Verhalten.
