# Mirror DSL - Verbesserungsvorschläge

## 1. Token-Inferenz entfernen

**Aktuell:** `col $text` wird automatisch zu `$text.col` inferiert

**Vorschlag:** Vollständige Token-Namen erforderlich
```
col $text.col      // explizit
bg $surface.bg     // explizit
```

**Vorteil:** Parser wird simpler, Debugging einfacher, Verhalten vorhersehbar
**Trade-off:** Mehr Tippen (Editor-Autocomplete gleicht das aus)

---

## 2. State-Syntax vereinheitlichen

**Aktuell:** 4 verschiedene Syntaxen
```
hover
  bg #333
state hover
  bg #333
state highlighted bg #333
state filled
  Value col $text
```

**Vorschlag:** Eine einzige Syntax
```
:hover bg #333
:highlighted bg #333, col white
:filled Value col $text.col
```

---

## 3. Events mit Pfeil-Syntax

**Aktuell:**
```
onclick select self
onkeydown escape: close
```

**Vorschlag:**
```
on click -> select self
on keydown escape -> close
on input -> filter Results, debounce 300
```

---

## 4. Explizites Definition-Keyword (optional)

**Aktuell:** Doppelpunkt unterscheidet Definition von Instanz
```
Button: pad 12      // Definition
Button "Click"      // Instanz
```

**Vorschlag:** Explizites Keyword
```
def Button pad 12
Button "Click"
```

---

## Priorisierung

| Priorität | Änderung | Aufwand | Impact |
|-----------|----------|---------|--------|
| 1 | Token-Inferenz entfernen | Mittel | Hoch |
| 2 | State-Syntax vereinheitlichen | Hoch | Mittel |
| 3 | Event-Pfeil-Syntax | Mittel | Gering |
| 4 | def-Keyword | Gering | Gering |

Empfehlung: Mit #1 beginnen - grösster Impact bei überschaubarem Aufwand.
