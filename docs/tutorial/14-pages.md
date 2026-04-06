---
title: Seiten
subtitle: Apps mit mehreren Dateien
prev: 13-bedingungen
---

Du kennst bereits Tabs – mehrere Inhalte, einer ist sichtbar. Für größere Apps funktioniert das gleiche Prinzip mit Dateien.

## Tabs: Inline-Content

Bei Tabs definierst du den Inhalt direkt als Kinder:

```mirror
Tabs defaultValue "home"
  Tab "Home", value "home"
    Text "Willkommen zuhause"
  Tab "Settings", value "settings"
    Text "Hier sind die Einstellungen"
```

Das funktioniert gut für kleine Bereiche.

## Tabs: Content aus Dateien

Bei größeren Apps wird der Inhalt unübersichtlich. Dann lagerst du ihn in separate Dateien aus:

```mirror
Tabs defaultValue "home"
  Tab "Home", value "home"
  Tab "Settings", value "settings"
```

```mirror
// home.mirror
Frame gap 16, pad 20
  Text "Willkommen zuhause", fs 24, weight bold
  Text "Das ist die Startseite."
```

```mirror
// settings.mirror
Frame gap 16, pad 20
  Text "Einstellungen", fs 24, weight bold
  Switch "Dark Mode"
  Switch "Benachrichtigungen"
```

**Die Regel:** Hat ein Tab Kinder → Inhalt inline. Hat es keine Kinder → Inhalt aus Datei.

Der Dateiname wird vom `value` abgeleitet: `value "settings"` → `settings.mirror`

## Navigation mit SideNav

Das gleiche Prinzip funktioniert mit SideNav:

```mirror
Frame hor, w full, h full
  SideNav defaultValue "dashboard", w 200
    Item "Dashboard", icon "home", value "dashboard"
    Item "Projekte", icon "folder", value "projects"
    Item "Einstellungen", icon "settings", value "settings"
```

```
dashboard.mirror   ← Inhalt für "Dashboard"
projects.mirror    ← Inhalt für "Projekte"
settings.mirror    ← Inhalt für "Einstellungen"
```

Die Navigation bleibt, nur der Content-Bereich wechselt – genau wie bei Tabs.

## Dateistruktur

Eine typische App:

```
app.mirror           ← Shell mit Navigation
dashboard.mirror     ← Dashboard-Inhalt
projects.mirror      ← Projekte-Inhalt
settings.mirror      ← Einstellungen-Inhalt
```

`app.mirror` ist der Einstiegspunkt und enthält die Navigation. Die anderen Dateien enthalten nur den jeweiligen Seiteninhalt.

## Mischen: Inline und Dateien

Du kannst beides kombinieren:

```mirror
Tabs defaultValue "overview"
  Tab "Übersicht", value "overview"
    Text "Kurze Übersicht hier"    // ← inline, weil kurz
  Tab "Details", value "details"   // ← aus details.mirror, weil umfangreich
  Tab "Statistik", value "stats"   // ← aus stats.mirror
```

## State bleibt erhalten

Wenn du zwischen Tabs/Seiten wechselst und zurückkehrst, bleibt der Zustand erhalten:

```mirror
// settings.mirror
notifications: true

Frame gap 16, pad 20
  Text "Einstellungen", fs 24, weight bold
  Switch "Benachrichtigungen", checked $notifications
```

Du schaltest Benachrichtigungen aus, wechselst zu Dashboard, kommst zurück – der Switch ist noch aus.

## Komponenten teilen

Gemeinsame Komponenten definierst du in einer eigenen Datei:

```mirror
// components.mirror
Card: bg #1a1a1a, pad 16, rad 8, gap 8
  Title: col white, fs 16, weight 500
  Body: col #888, fs 14

PrimaryBtn as Button: bg #2563eb, col white, pad 10 20, rad 6
```

```mirror
// dashboard.mirror
use components

Frame gap 16
  Card
    Title "Willkommen"
    Body "Schön dass du da bist."
  PrimaryBtn "Los geht's"
```

Mit `use dateiname` importierst du Komponenten-Definitionen.

---

## Zusammenfassung

| Situation | Syntax |
|-----------|--------|
| Tab mit Inline-Content | `Tab "Name"` + Kinder |
| Tab mit Datei-Content | `Tab "Name", value "x"` (keine Kinder) → x.mirror |
| Komponenten importieren | `use components` |

**Das Prinzip:** Tabs und Navigation funktionieren gleich – ob der Inhalt inline oder in Dateien ist. Keine Kinder = Datei laden.
