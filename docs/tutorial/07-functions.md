---
title: Eingebaute Funktionen
subtitle: Standard-Interaktionen ohne JavaScript
prev: 06-states
next: 08-navigation
---

In [Kapitel 6](06-states.html) hast du `toggle()` und `exclusive()` kennengelernt. Mirror bietet weitere **eingebaute Funktionen** für typische UI-Patterns.

## Syntax: Funktionen als Properties

Funktionen werden direkt als Properties geschrieben. Klick ist der Default-Event:

```mirror-static
// Kurzschreibweise (empfohlen)
Button "Klick", toggle()
Button "Zeigen", show(Menu)
Button "Mehrere", toggle(), show(Panel)

// Explizite Variante (auch gültig)
Button "Klick"
  onclick: toggle()
```

> **Tipp:** Die Kurzschreibweise ist kürzer und lesbarer. Die explizite `onclick:` Syntax brauchst du nur für andere Events wie `onhover:` oder `onfocus:`.

## Übersicht

| Funktion | Beschreibung |
|----------|--------------|
| `toggle()` | State wechseln (binär oder cycle) |
| `exclusive()` | Nur einer aktiv, Geschwister deaktivieren |
| `show(Element)` | Element einblenden |
| `hide(Element)` | Element ausblenden |

> **Note:** Für Overlays (Dialoge, Dropdowns, Tooltips) siehe [Kapitel 9: Overlays](09-overlays.html). Für Navigation siehe [Kapitel 8: Navigation](08-navigation.html).

## show() und hide()

Mit `show(Element)` und `hide(Element)` steuerst du die Sichtbarkeit anderer Elemente:

```mirror
Frame gap 12, bg #0a0a0a, pad 16, rad 8
  Button "Info anzeigen", pad 10 20, bg #2563eb, col white, rad 6, show(InfoBox)

  Frame name InfoBox, hidden, bg #1a1a1a, pad 16, rad 8, gap 8
    Text "Hier sind weitere Informationen.", col #ccc, fs 14
    Button "Schließen", pad 8 16, bg #333, col white, rad 4, hide(InfoBox)
```

**Wichtig:** Das Ziel-Element braucht einen `name`, damit du es referenzieren kannst.

## Praktisch: Aufklappbares Menü

Ein typisches Pattern: Button zeigt Menü, Schließen-Button versteckt es wieder:

```mirror
Frame gap 8, bg #0a0a0a, pad 16, rad 8
  Button "Menü öffnen", pad 10 20, bg #333, col white, rad 6, show(Menu)

  Frame name Menu, hidden, bg #1a1a1a, pad 8, rad 8, gap 2, w 180
    Button "Profil", pad 10 16, bg transparent, col white, rad 4, w full
      hover:
        bg #333
    Button "Einstellungen", pad 10 16, bg transparent, col white, rad 4, w full
      hover:
        bg #333
    Divider bg #333, margin 4 0
    Button "Schließen", pad 10 16, bg #333, col white, rad 4, w full, hide(Menu)
```

## Kombiniert mit States

Du kannst `show()`/`hide()` mit States kombinieren. Der Button ändert sein Aussehen UND zeigt das Menü:

```mirror
Frame gap 8, bg #0a0a0a, pad 16, rad 8
  Button "Filter", name FilterBtn, pad 10 20, bg #333, col white, rad 6, toggle(), show(FilterPanel)
    open:
      bg #2563eb

  Frame name FilterPanel, hidden, bg #1a1a1a, pad 16, rad 8, gap 12
    Text "Filter-Optionen", col white, fs 14, weight 500
    Frame gap 8
      Button "Aktiv", pad 8 12, bg #252525, col white, rad 4
      Button "Archiviert", pad 8 12, bg #252525, col white, rad 4
    Button "Schließen", pad 8 16, bg #333, col white, rad 4, hide(FilterPanel), toggle(FilterBtn)
```

> **Note:** Du kannst mehrere Funktionen kombinieren – alle werden bei Klick ausgeführt.

## Eigene JavaScript-Funktionen

Die eingebauten Funktionen decken Standard-Patterns ab. Für API-Calls, Validierung oder komplexe Logik schreibst du eigene Funktionen:

```mirror-static
// Mirror-Code
SaveBtn as Button: pad 12 24, bg #333, col white, rad 6, save()
  loading:
    bg #666
    "Wird gespeichert..."
  success:
    bg #10b981
    "Gespeichert!"

SaveBtn "Speichern"
```

```javascript
// JavaScript
async function save(element) {
  element.state = 'loading'
  const response = await fetch('/api/save')
  element.state = response.ok ? 'success' : 'base'
}
```

**Faustregel:** Eingebaute Funktion wenn möglich, eigene Funktion wenn nötig.

---

## Zusammenfassung

| Funktion | Beispiel |
|----------|----------|
| `toggle()` | `Button "An/Aus", toggle()` |
| `exclusive()` | `Tab "Home", exclusive()` |
| `show(Name)` | `Button "Öffnen", show(Menu)` |
| `hide(Name)` | `Button "Schließen", hide(Menu)` |
| `eigene()` | `Button "Speichern", save()` |

> **Syntax:** Funktionen als Properties → Klick-Event. Für andere Events: `onhover: show(Tooltip)`
