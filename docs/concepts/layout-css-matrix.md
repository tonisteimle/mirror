# Mirror Layout → CSS Matrix

Dieses Dokument definiert exakt, welches CSS für jede Layout-Kombination generiert werden muss.

## Grundprinzip

Mirror vereinfacht CSS-Layout auf drei Konzepte:
1. **Richtung**: `hor` (horizontal) oder default vertikal
2. **Größe**: `w`/`h` mit `full`, `hug`, oder Pixelwert
3. **Ausrichtung**: `center`, `spread`, oder 9-Positionen

## 1. Direction (Richtung)

### Parent ohne explizite Richtung (Default)
```
Frame        → display: flex
               flex-direction: column
               align-items: flex-start
```

### Parent mit `hor`
```
Frame hor    → display: flex
               flex-direction: row
               align-items: flex-start
```

### Parent mit `ver` (explizit vertikal)
```
Frame ver    → display: flex
               flex-direction: column
               align-items: flex-start
```

---

## 2. Size (Größe)

### `w` / `h` mit Pixelwert

**In Flex-Container:**
```
Frame w 200         → width: 200px
                      flex-shrink: 0
```

**Ohne Flex-Kontext (Root):**
```
Frame w 200         → width: 200px
```

### `w hug` / `h hug`
```
Frame w hug         → width: fit-content

Frame h hug         → height: fit-content
```

### `w full` / `h full`

**In Flex-Container:**
```
Frame w full        → flex: 1 1 0%
                      min-width: 0
                      align-self: stretch

Frame h full        → flex: 1 1 0%
                      min-height: 0
                      align-self: stretch
```

**Am Root-Level (kein Parent):**
```
Frame w full        → width: 100%

Frame h full        → height: 100%
```

**In Stacked/Absolute-Kontext:**
```
Frame w full        → width: 100%

Frame h full        → height: 100%
```

---

## 3. Alignment (Ausrichtung)

### `center`
```
Frame center        → display: flex
                      flex-direction: column
                      justify-content: center
                      align-items: center
```

### `spread`
```
Frame spread        → display: flex
                      flex-direction: column
                      justify-content: space-between
                      align-items: flex-start
```

### 9-Positionen

Alle 9-Positionen setzen `flex-direction: column`:

| Mirror | justify-content | align-items |
|--------|-----------------|-------------|
| `tl` (top-left) | flex-start | flex-start |
| `tc` (top-center) | flex-start | center |
| `tr` (top-right) | flex-start | flex-end |
| `cl` (center-left) | center | flex-start |
| `center` | center | center |
| `cr` (center-right) | center | flex-end |
| `bl` (bottom-left) | flex-end | flex-start |
| `bc` (bottom-center) | flex-end | center |
| `br` (bottom-right) | flex-end | flex-end |

```
Frame tl            → display: flex
                      flex-direction: column
                      justify-content: flex-start
                      align-items: flex-start
```

---

## 4. Spacing

### `gap`
```
Frame gap 12        → gap: 12px
```

### `pad` (Padding)
```
Frame pad 16        → padding: 16px

Frame pad 12 24     → padding: 12px 24px

Frame pad 8 12 16 20 → padding: 8px 12px 16px 20px
```

---

## 5. Flex-Verhalten von Kindern

### Default (kein shrink)
Kind in `Frame hor` mit fester Breite:
```
Parent: Frame hor
Child:  Frame w 100 → width: 100px
                      flex-shrink: 0
```

### `shrink`
```
Frame shrink        → flex-shrink: 1
```

### `wrap`
```
Frame wrap          → flex-wrap: wrap
```

---

## 6. Kombinationen

### Horizontal + Center
```
Frame hor, center   → display: flex
                      flex-direction: row
                      justify-content: center
                      align-items: center
```

### Horizontal + Spread
```
Frame hor, spread   → display: flex
                      flex-direction: row
                      justify-content: space-between
                      align-items: flex-start
```

### Horizontal + Gap + Pad
```
Frame hor, gap 12, pad 16
                    → display: flex
                      flex-direction: row
                      align-items: flex-start
                      gap: 12px
                      padding: 16px
```

### Vertikal + Full-Width Child
```
Parent: Frame
Child:  Frame w full
                    → Parent: display: flex
                              flex-direction: column
                              align-items: flex-start
                      Child:  flex: 1 1 0%
                              min-width: 0
                              align-self: stretch
```

### Horizontal mit Fix + Flex + Fix
```
Parent: Frame hor
Child1: Frame w 60   → width: 60px; flex-shrink: 0
Child2: Frame w full → flex: 1 1 0%; min-width: 0; align-self: stretch
Child3: Frame w 60   → width: 60px; flex-shrink: 0
```

### Center mit mehreren Kindern
```
Parent: Frame center, gap 12
        → display: flex
          flex-direction: column
          justify-content: center
          align-items: center
          gap: 12px
```

### Spread mit mehreren Kindern
```
Parent: Frame hor, spread
Child1: Text
Child2: Text
Child3: Text
        → Parent: display: flex
                  flex-direction: row
                  justify-content: space-between
                  align-items: flex-start
          Kinder werden gleichmäßig an die Ränder verteilt
```

---

## 7. Kombinationen mit Alignment + Richtung

### `hor` überschreibt 9-Zone Richtung
```
Frame hor, bl       → display: flex
                      flex-direction: row (hor gewinnt)
                      justify-content: ??? (bl will column + flex-end)
                      align-items: ???
```

**ACHTUNG:** Dies ist ein potentielles Problem - `hor` und 9-Zonen-Properties sind konzeptionell inkompatibel, da 9-Zonen immer `column` setzen.

**Erwartetes Verhalten:**
- Letzte Eigenschaft gewinnt für `flex-direction`
- Alignment-Werte bleiben erhalten

### `hor, center`
```
Frame hor, center   → display: flex
                      flex-direction: row
                      justify-content: center
                      align-items: center
```

### `ver, spread`
```
Frame ver, spread   → display: flex
                      flex-direction: column
                      justify-content: space-between
                      align-items: flex-start
```

---

## 8. Full-Width/Height Kombinationen

### Kind mit w full + h full
```
Parent: Frame w 400, h 300
Child:  Frame w full, h full, bg red

Ergebnis:
- Child füllt gesamten Parent
- Parent: 400x300px
- Child: flex: 1 1 0%; min-width: 0; min-height: 0; align-self: stretch
```

### Mehrere w full Kinder
```
Parent: Frame h 200
Child1: Frame w full, bg red
Child2: Frame w full, bg blue

Ergebnis:
- Beide Kinder teilen sich die Breite des Parents
- flex: 1 1 0% → gleiche flexible Größe
```

### Mix aus fixed und full
```
Parent: Frame hor, w 400
Child1: Frame w 100   → width: 100px, flex-shrink: 0
Child2: Frame w full  → flex: 1 1 0%, nimmt Rest (300px)

Ergebnis:
- Child1: 100px fix
- Child2: 300px (verfügbarer Rest)
```

---

## 9. Gap + Alignment Interaktion

### gap + spread
```
Frame hor, spread, gap 12
        → display: flex
          flex-direction: row
          justify-content: space-between
          align-items: flex-start
          gap: 12px

WICHTIG: spread ignoriert gap für die Hauptverteilung,
         gap gilt nur wenn space-between weniger Platz braucht als gap
```

### gap + center
```
Frame center, gap 12
        → display: flex
          flex-direction: column
          justify-content: center
          align-items: center
          gap: 12px
```

---

## 10. Edge Cases

### Leerer Frame
```
Frame               → display: flex
                      flex-direction: column
                      align-items: flex-start
```

### Frame mit nur Text-Kind
```
Frame
  Text "Hello"      → Parent: display: flex
                              flex-direction: column
                              align-items: flex-start
                      Text: inline (kein display change)
```

### Nested full
```
Frame w 400
  Frame w full
    Frame w full    → Äußerster Parent: 400px
                      Mittlerer: flex: 1 1 0%
                      Innerster: flex: 1 1 0%

                      Beide inneren füllen den verfügbaren Raum
```

---

## 11. Test-Matrix

Jede Kombination sollte getestet werden:

| Direction | Size | Alignment | Gap | Pad | Expected CSS |
|-----------|------|-----------|-----|-----|--------------|
| (default) | - | - | - | - | flex, column, align-items: flex-start |
| hor | - | - | - | - | flex, row, align-items: flex-start |
| ver | - | - | - | - | flex, column, align-items: flex-start |
| (default) | w 200 | - | - | - | width: 200px |
| hor | w full | - | - | - | flex: 1 1 0%, min-width: 0, align-self: stretch |
| (default) | - | center | - | - | flex, column, justify-content: center, align-items: center |
| hor | - | center | - | - | flex, row, justify-content: center, align-items: center |
| hor | - | spread | - | - | flex, row, justify-content: space-between |
| (default) | - | tl | - | - | flex, column, justify-content: flex-start, align-items: flex-start |
| (default) | - | br | - | - | flex, column, justify-content: flex-end, align-items: flex-end |
| hor | - | - | 12 | - | flex, row, gap: 12px |
| (default) | - | - | - | 16 | flex, column, padding: 16px |
| hor | w full | center | 12 | 16 | flex, row, justify-content: center, align-items: center, gap: 12px, padding: 16px, Child: flex: 1 1 0% |

---

## 12. Child-in-Parent Matrix

Wie verhalten sich Kinder mit verschiedenen Größen in verschiedenen Parents?

### Kind mit `w 100` in verschiedenen Parents

| Parent | Child CSS |
|--------|-----------|
| Frame | width: 100px, flex-shrink: 0 |
| Frame hor | width: 100px, flex-shrink: 0 |
| Frame center | width: 100px, flex-shrink: 0 |
| Frame stacked | width: 100px, position: absolute |

### Kind mit `w full` in verschiedenen Parents

| Parent | Child CSS |
|--------|-----------|
| Frame | flex: 1 1 0%, min-width: 0, align-self: stretch |
| Frame hor | flex: 1 1 0%, min-width: 0, align-self: stretch |
| Frame center | flex: 1 1 0%, min-width: 0, align-self: stretch |
| Frame stacked | width: 100%, position: absolute |
| Frame (root) | width: 100% |

### Kind mit `w hug` in verschiedenen Parents

| Parent | Child CSS |
|--------|-----------|
| Frame | width: fit-content |
| Frame hor | width: fit-content |
| Frame center | width: fit-content |

---

## Implementierungs-Checklist

Diese Matrix muss durch Tests validiert werden. Für jede Zeile ein Test:

- [ ] Default vertical layout
- [ ] Horizontal layout (hor)
- [ ] Explicit vertical (ver)
- [ ] Fixed width in flex context
- [ ] w hug
- [ ] w full in flex context
- [ ] w full at root level
- [ ] w full in stacked context
- [ ] center alignment
- [ ] spread alignment
- [ ] All 9-zone alignments (tl, tc, tr, cl, center, cr, bl, bc, br)
- [ ] gap property
- [ ] pad property
- [ ] wrap property
- [ ] shrink property
- [ ] hor + center combination
- [ ] hor + spread combination
- [ ] Nested full-width children
- [ ] Mix of fixed and full children
