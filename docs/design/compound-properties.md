# Compound Properties

## Status: Implementiert

Dieses Dokument beschreibt das Compound Properties System, das in Mirror implementiert ist.

## Konzept

Properties die mehrere Werte haben, folgen einem einheitlichen Pattern:

```
<property> [modifier/direction] <values...>
```

**Regeln:**
1. Values können in beliebiger Reihenfolge stehen
2. Der Parser erkennt Token-Typen und ordnet automatisch zu
3. Nicht angegebene Werte erhalten sinnvolle Defaults
4. Für unterschiedliche Werte pro Seite/Richtung: Property mehrfach schreiben

## Token-Typen

| Typ | Beispiele | Erkennung |
|-----|-----------|-----------|
| NUMBER | `1`, `16`, `0.5` | Numerischer Wert |
| DIRECTION | `l`, `r`, `u`, `d`, `l-r`, `u-d` | Richtungs-Keywords |
| BORDER_STYLE | `solid`, `dashed`, `dotted` | Border-Style Keywords |
| COLOR | `#333`, `$primary` | Beginnt mit `#` oder `$` |

---

## Border (`bor`)

**Werte:** direction, width, style, color

```
// Minimal
bor 1 #333

// Mit Richtung
bor l-r 1 #333

// Mit Style
bor 1 dashed #333

// Vollständig
bor l-r 1 dashed #333

// Unterschiedliche Seiten
bor l 1 solid #333
bor r 2 dashed #fff
```

**Defaults:**
- direction: alle Seiten
- style: `solid`

---

## Padding (`pad`)

**Werte:** direction, size

```
// Alle Seiten
pad 16

// Horizontal/Vertikal
pad l-r 16
pad u-d 8

// Kombiniert
pad l-r 16 u-d 8

// Einzelne Seiten
pad l 16
pad r 8
```

---

## Margin (`mar`)

**Werte:** direction, size

```
// Alle Seiten
mar 16

// Mit Richtung
mar u 20
mar l-r 16 u-d 8
```

---

## Border Radius (`rad`)

**Werte:** size (einfach) oder CSS Shorthand (4 Werte)

```
// Alle Ecken
rad 8

// CSS Shorthand: top-left, top-right, bottom-right, bottom-left
rad 8 8 0 0    // Oben gerundet, unten eckig

// Pill-Form
rad 9999
```

**Hinweis:** Eine Corner-spezifische Syntax (`rad l-u 8`) ist als Erweiterung geplant.

---

## Shadow (`shadow`) - Aktuell String-basiert

**Hinweis:** Shadow verwendet aktuell einen String-Wert. Eine Compound-Syntax ist für die Zukunft geplant.

```
// Aktuell: CSS-String
shadow "0 4px 8px rgba(0,0,0,0.15)"
shadow "0 2px 4px #00000033"
```

**Geplante Compound-Syntax (noch nicht implementiert):**
```
shadow 0 4 8 #000
shadow inset 0 2 4 #000
```

---

## Mehrere Werte für unterschiedliche Seiten

Wenn verschiedene Seiten/Ecken unterschiedliche Werte brauchen, wird die Property mehrfach geschrieben:

```
// Border mit unterschiedlichen Farben
bor l 1 #333
bor r 1 #fff

// Unterschiedliche Radien
rad l-u 16
rad r-u 16
rad l-d 0
rad r-d 0

// Unterschiedliches Padding
pad l 20
pad r 40
```

---

## Vorteile

1. **Flexibel:** Nur angeben was man braucht
2. **Lesbar:** Token-Typen sind selbsterklärend
3. **Konsistent:** Gleiches Pattern für alle Compound Properties
4. **Erweiterbar:** Neue Properties folgen dem gleichen Schema
