# Mirror Syntax - Verbesserungsvorschläge

> Vorbehalt: Mein Verständnis der Mirror-Syntax ist unvollständig. Diese Vorschläge sind Diskussionsgrundlage.

## 1. Eine kanonische Form pro Property

Aktuell existieren Aliase:
```
padding / pad / p
background / bg
color / col / c
```

Vorschlag: Nur die kurze Form. Keine Aliase.

```
pad     // einzige Form
bg      // einzige Form
col     // einzige Form
```

Weniger Dokumentation, konsistenterer Code, einfachere Tooling.

---

## 2. State-Syntax mit Prefix

Aktuell:
```
state highlighted bg #333
hover
    bg #333
```

Vorschlag: Einheitlich mit `:` Prefix (CSS-nah):

```
:hover bg #333
:highlighted bg #333, col white
:focus
    border 2 $primary
    shadow md
```

---

## 3. Ternary für Inline-Conditionals

Aktuell:
```
Button if $active then bg blue else bg grey
```

Vorschlag:
```
Button bg $active ? blue : grey
```

Kürzer, JS-Entwicklern vertraut.

---

## 4. Events in JS (für v2)

Wenn Mirror zu JavaScript integriert wird: Events komplett in JS.

```mirror
// app.mirror - nur Struktur
saveBtn as Button "Save"
menu hidden
```

```javascript
// app.js - alle Events
ui.saveBtn.onclick = () => {
    ui.menu.visible = true
}
```

Saubere Trennung: Mirror = Was, JS = Wie.

---

## 5. CLAUDE.md bereinigen

- `named` Syntax entfernen (veraltet, `as` ist korrekt)
- Aliase: entscheiden welche Form kanonisch ist
- Beispiele auf Konsistenz prüfen

---

## Offene Fragen an mich selbst

- Verstehe ich die `as` Syntax vollständig?
- Welche Syntax-Features nutze ich falsch?
- Was habe ich übersehen?
