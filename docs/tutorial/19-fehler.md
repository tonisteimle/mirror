---
title: Häufige Fehler
subtitle: Was nicht funktioniert und warum
prev: 18-pages
---

Dieses Kapitel zeigt typische Fehler und ihre Korrektur. Jeder Fehler hat ein "Falsch"-Beispiel, ein "Richtig"-Beispiel und eine kurze Erklärung.

## Syntax

### Komma nach String vergessen

```mirror-static
// FALSCH
Text "Hello" col white
Button "Click" bg #2563eb
```

```mirror-static
// RICHTIG
Text "Hello", col white
Button "Click", bg #2563eb
```

**Warum:** Properties werden durch Kommas getrennt. Nach einem String-Inhalt muss ein Komma stehen, bevor weitere Properties folgen.

### Einheiten angeben

```mirror-static
// FALSCH
Frame w 100px, h 50px, pad 10px
```

```mirror-static
// RICHTIG
Frame w 100, h 50, pad 10
```

**Warum:** Mirror verwendet keine Einheiten. Zahlen sind implizit Pixel. `100` statt `100px`.

### Anführungszeichen bei Zahlen

```mirror-static
// FALSCH
Frame w "200", h "100"
```

```mirror-static
// RICHTIG
Frame w 200, h 100
```

**Warum:** Zahlen brauchen keine Anführungszeichen. Nur Text-Inhalte werden in `"..."` geschrieben.

## Elemente

### Box statt Frame

```mirror-static
// FALSCH
Box pad 16, gap 8
  Text "Content"
```

```mirror-static
// RICHTIG
Frame pad 16, gap 8
  Text "Content"
```

**Warum:** Das Container-Element heißt `Frame`, nicht `Box`. Es gibt kein `Box` in Mirror.

### Div statt Frame

```mirror-static
// FALSCH
Div pad 16
  Span "Text"
```

```mirror-static
// RICHTIG
Frame pad 16
  Text "Text"
```

**Warum:** Mirror verwendet eigene Primitive, keine HTML-Elemente. `Frame` statt `Div`, `Text` statt `Span`.

## Tokens

### Token ohne $ definieren

```mirror-static
// FALSCH
primary: #2563eb
card.bg: #1a1a1a
```

```mirror-static
// RICHTIG
$primary.bg: #2563eb
$card.bg: #1a1a1a
```

**Warum:** Tokens beginnen immer mit `$`. Ohne `$` wäre es keine Token-Definition.

### Token ohne Suffix definieren

```mirror-static
// FALSCH
$primary: #2563eb
$spacing: 16
```

```mirror-static
// RICHTIG
$primary.bg: #2563eb
$spacing.pad: 16
```

**Warum:** Der Suffix (`.bg`, `.col`, `.pad`, `.rad`, etc.) gibt den Typ an. Das ermöglicht intelligentes Autocomplete – bei `bg $` werden nur `.bg`-Tokens vorgeschlagen.

### Token mit Suffix verwenden

```mirror-static
// FALSCH
Frame bg $primary.bg, pad $spacing.pad
```

```mirror-static
// RICHTIG
Frame bg $primary, pad $spacing
```

**Warum:** Bei der Verwendung wird der Suffix weggelassen. Das Property (`bg`, `pad`) zeigt bereits den Typ.

## Komponenten

### Doppelpunkt bei Verwendung

```mirror-static
// FALSCH – Doppelpunkt bei Instanz
Btn: "Speichern"
Card:
  Title: "Überschrift"
```

```mirror-static
// RICHTIG – Ohne Doppelpunkt
Btn "Speichern"
Card
  Title "Überschrift"
```

**Warum:** Der Doppelpunkt definiert eine Komponente. Ohne Doppelpunkt wird sie verwendet. `Btn:` = Definition, `Btn` = Instanz.

### Doppelpunkt bei Definition vergessen

```mirror-static
// FALSCH – Definition ohne Doppelpunkt
PrimaryBtn pad 12, bg #2563eb
```

```mirror-static
// RICHTIG – Mit Doppelpunkt
PrimaryBtn: pad 12, bg #2563eb
```

**Warum:** Ohne Doppelpunkt wäre es eine Verwendung, keine Definition. Die Komponente würde nicht erstellt.

### = bei Primitive-Erweiterung vergessen

```mirror-static
// FALSCH
PrimaryBtn: Button pad 12, bg #2563eb
```

```mirror-static
// RICHTIG
PrimaryBtn: = Button pad 12, bg #2563eb
```

**Warum:** Wenn eine Komponente ein Primitive erweitert (Button, Frame, Text, etc.), braucht es das `=` Zeichen. Bei Slot-Komponenten ohne Primitive-Basis ist kein `=` nötig.

### = mit Slots mischen

```mirror-static
// FALSCH – = Button UND Slots geht nicht!
NavItem: = Button hor, gap 10, pad 12
  Icon: is 18
  Label: col white
```

```mirror-static
// RICHTIG – Entweder = Primitive OHNE Slots:
NavItem: = Button hor, gap 10, pad 12
  Icon "home", is 18
  Text "Label"
```

```mirror-static
// ODER Slots OHNE = Primitive:
NavItem: hor, gap 10, pad 12
  ItemIcon: is 18
  ItemLabel: col white
```

**Warum:** `= Primitive` erweitert ein Element – Kinder sind dann normale Elemente, keine Slots. Slots (mit `:`) nur bei Container-Komponenten ohne `=`.

## States

### State ohne Doppelpunkt

```mirror-static
// FALSCH
Btn pad 12, bg #333
  hover
    bg #444
```

```mirror-static
// RICHTIG
Btn: pad 12, bg #333
  hover:
    bg #444
```

**Warum:** State-Namen brauchen einen Doppelpunkt: `hover:`, `on:`, `active:`. Ohne Doppelpunkt wird es als Kind-Element interpretiert.

### Funktion ohne Klammern

```mirror-static
// FALSCH
Btn: pad 12, bg #333, toggle
  on:
    bg #2563eb
```

```mirror-static
// RICHTIG
Btn: pad 12, bg #333, toggle()
  on:
    bg #2563eb
```

**Warum:** Funktionen werden mit Klammern aufgerufen: `toggle()`, `exclusive()`, `show(Element)`. Ohne Klammern wird es als Property interpretiert.

### State in Instanz mit Doppelpunkt

```mirror-static
// FALSCH – Doppelpunkt beim State-Setzen
Btn "Aktiv", on:
```

```mirror-static
// RICHTIG – Ohne Doppelpunkt
Btn "Aktiv", on
```

**Warum:** Bei der Instanz sagst du nur "starte in diesem State". Der State wurde bereits in der Definition mit `:` definiert.

## Layout

### Pixel in Grid-Kontext

```mirror-static
// FALSCH – w 200 bedeutet hier 200 Spalten
Frame grid 12
  Frame w 200, h 100
```

```mirror-static
// RICHTIG – w 6 bedeutet 6 von 12 Spalten
Frame grid 12
  Frame w 6, h 2
```

**Warum:** Im Grid-Kontext bedeutet `w` Spalten-Span, nicht Pixel. `w 6` bei `grid 12` = halbe Breite.

### center und spread verwechseln

```mirror-static
// FALSCH – spread zentriert nicht
Frame hor, spread
  Button "OK"
```

```mirror-static
// RICHTIG – center zentriert
Frame hor, center
  Button "OK"
```

**Warum:** `spread` verteilt Kinder an die Ränder (links/rechts). `center` zentriert sie. Bei einem Kind ist `center` meist gewünscht.

### stacked ohne Positionierung

```mirror-static
// FALSCH – Kinder stapeln sich ohne Position
Frame stacked
  Frame bg red
  Frame bg blue
```

```mirror-static
// RICHTIG – Mit Positionierung
Frame stacked
  Frame bg red, w full, h full
  Frame bg blue, w 50, h 50, center
```

**Warum:** Bei `stacked` brauchen Kinder explizite Positionierung (`top`, `bottom`, `center`, `pt`, `pb`, etc.), sonst liegen alle übereinander.

## Zag-Komponenten

### Slots ohne Doppelpunkt

```mirror-static
// FALSCH
Dialog
  Trigger Button "Open"
  Content Frame pad 16
    Text "Dialog content"
```

```mirror-static
// RICHTIG
Dialog
  Trigger: Button "Open"
  Content: Frame pad 16
    Text "Dialog content"
```

**Warum:** Zag-Slots (`Trigger:`, `Content:`, `Backdrop:`, etc.) brauchen einen Doppelpunkt. Sie sind Teil der Komponenten-Struktur.

### Tab value ohne Komma

```mirror-static
// FALSCH
Tabs defaultValue "a"
  Tab "Home" value "a"
  Tab "Settings" value "b"
```

```mirror-static
// RICHTIG
Tabs defaultValue "a"
  Tab "Home", value "a"
  Tab "Settings", value "b"
```

**Warum:** Nach dem String-Label kommt ein Komma, dann `value`. Wie bei allen Properties.

## Icons

### Icon-Name ohne Anführungszeichen

```mirror-static
// FALSCH
Icon check, ic green
Icon settings
```

```mirror-static
// RICHTIG
Icon "check", ic green
Icon "settings"
```

**Warum:** Der Icon-Name ist ein String und braucht Anführungszeichen.

### ic/is verwechseln

```mirror-static
// FALSCH – is für Farbe, ic für Größe
Icon "check", is #10b981, ic 24
```

```mirror-static
// RICHTIG – ic für Farbe, is für Größe
Icon "check", ic #10b981, is 24
```

**Warum:** `ic` = icon color (Farbe), `is` = icon size (Größe). Die Abkürzungen sind konsistent: i + erster Buchstabe.

## Referenzen

### name und Referenz verwechseln

```mirror-static
// FALSCH – name fehlt
Button "Menu", pad 12, toggle()
  open:
    bg #2563eb

Frame hidden
  Button.open:    // Button ist kein Name!
    visible
```

```mirror-static
// RICHTIG – name setzen
Button "Menu", name MenuBtn, pad 12, toggle()
  open:
    bg #2563eb

Frame hidden
  MenuBtn.open:
    visible
```

**Warum:** Um auf ein Element zu referenzieren, braucht es einen `name`. Der Komponenten-Name (`Button`) ist nicht der Referenz-Name.

---

## Checkliste

Vor dem Testen prüfen:

- [ ] Kommas nach Strings?
- [ ] Keine Einheiten (px, em)?
- [ ] Tokens mit $ und Suffix definiert?
- [ ] Tokens ohne Suffix verwendet?
- [ ] Komponenten-Definition mit `:`?
- [ ] Komponenten-Verwendung ohne `:`?
- [ ] `= Primitive` ohne Slots? (keine `:` bei Kindern)
- [ ] States mit `:` definiert?
- [ ] Funktionen mit `()` aufgerufen?
- [ ] Icon-Namen in Anführungszeichen?
- [ ] Zag-Slots mit `:`?
