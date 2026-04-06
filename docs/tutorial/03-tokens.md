---
title: Design Tokens
subtitle: Werte zentral definieren und überall verwenden
prev: 02-komponenten
next: 04-layout
---

Im letzten Kapitel hast du gelernt, Struktur zu abstrahieren – mit Komponenten. Dieses Kapitel zeigt, wie du **Werte** abstrahierst: Farben, Abstände, Radien. Statt `#2563eb` überall zu wiederholen, definierst du es einmal als Token.

## Das Problem: Magische Werte

Schau dir diesen Code an – die Farbe `#2563eb` taucht überall auf:

```mirror
Btn: pad 10 20, rad 6, bg #2563eb, col white
Link: col #2563eb, underline
Badge: bg #2563eb, col white, pad 4 8, rad 4, fs 12

Frame gap 12, bg #0a0a0a, pad 16, rad 8
  Btn "Speichern"
  Link "Mehr erfahren"
  Badge "Neu"
```

Was passiert, wenn du die Primärfarbe ändern willst? Du musst jede Stelle finden und anpassen. Bei großen Projekten ist das fehleranfällig.

## Tokens definieren

Ein Token ist ein Name für einen Wert. Die Syntax: `$name.suffix: wert`

```mirror
// Token definieren
$primary.bg: #2563eb

// Token verwenden (ohne Suffix!)
Btn: bg $primary, col white, pad 10 20, rad 6

Frame hor, gap 8, bg #0a0a0a, pad 16, rad 8
  Btn "Speichern"
  Btn "Senden"
  Btn "Weiter"
```

Bei der **Definition** schreibst du den Suffix (`.bg`), bei der **Verwendung** nicht. Das Property (`bg`) zeigt bereits, welcher Typ gemeint ist.

## Warum Suffixe?

Der Suffix sagt, wofür der Token gedacht ist:

| Suffix | Bedeutung | Beispiel |
|--------|-----------|----------|
| `.bg` | Hintergrundfarbe | `$primary.bg: #2563eb` |
| `.col` | Textfarbe | `$muted.col: #888` |
| `.boc` | Border-Farbe | `$border.boc: #333` |
| `.rad` | Radius | `$card.rad: 8` |
| `.pad` | Padding | `$space.pad: 16` |
| `.gap` | Abstand | `$space.gap: 12` |

Das ermöglicht intelligentes Autocomplete: Tippst du `bg $`, zeigt die IDE nur Tokens mit `.bg` Suffix.

```mirror
$primary.bg: #2563eb
$primary.col: white
$card.bg: #1a1a1a
$card.rad: 8

// Jeder Token am richtigen Property
Btn: bg $primary, col $primary, pad 10 20, rad 6
Card: bg $card, rad $card, pad 16

Card
  Btn "In der Card"
```

## Semantische Tokens

Tokens können andere Tokens referenzieren. Damit trennst du **Rohwerte** (welche Farben existieren) von ihrer **Bedeutung** (wofür sie stehen):

```mirror
// 1. PRIMITIVE – Rohwerte (deine Farbpalette)
$blue.bg: #2563eb
$red.bg: #ef4444
$gray.bg: #1a1a1a

// 2. SEMANTISCH – Bedeutung zuweisen
// Diese Tokens referenzieren primitive mit $
$primary.bg: $blue    // "primary" = aktuell "blue"
$danger.bg: $red      // "danger" = aktuell "red"
$card.bg: $gray

// 3. KOMPONENTEN – nur semantische Tokens
// Sie wissen nicht, welche Farbe dahinter steckt
Btn: bg $primary, col white, pad 10 20, rad 6
DangerBtn: bg $danger, col white, pad 10 20, rad 6
Card: bg $card, rad 8, pad 16, gap 8
  Title: col white, fs 16, weight 500

// 4. INSTANZEN
Card
  Title "Semantische Tokens"
  Frame hor, gap 8
    Btn "Speichern"
    DangerBtn "Löschen"
```

Willst du die Primary-Farbe ändern, änderst du nur `$primary.bg: $green`. Alle Buttons passen sich an – ohne dass du eine Komponente anfassen musst. Das ist die Basis für Theming.

## Die drei Stufen: Tokens → Komponenten → Instanzen

Ein vollständiges Design System hat drei Ebenen. Am Ende sind die Instanzen komplett sauber – keine Farben, keine Abstände, nur Inhalt:

```mirror
// 1. TOKENS – Werte zentral definieren
$btn.bg: #2563eb
$btn.col: white
$card.bg: #1a1a1a
$card.rad: 8
$space.pad: 16

// 2. KOMPONENTEN – Tokens verwenden
Card: bg $card, rad $card, pad $space, gap 12
  Title: col white, fs 16, weight 500
  Desc: col #888, fs 14

Btn: bg $btn, col $btn, pad 10 20, rad 6, cursor pointer

// 3. INSTANZEN – nur noch Inhalt, kein Styling!
Card
  Title "Design System"
  Desc "Tokens + Komponenten = Konsistenz"
  Frame hor, gap 8
    Btn "Speichern"
    Btn "Abbrechen"
```

Der Vorteil: Instanzen sind lesbar wie ein Dokument. Alle Design-Entscheidungen stecken in Tokens und Komponenten – änderst du dort etwas, wirkt es überall.

---

## Das Wichtigste

| Syntax | Bedeutung |
|--------|-----------|
| `$primary.bg: #2563eb` | Token definieren (mit Suffix) |
| `bg $primary` | Token verwenden (ohne Suffix) |
| `$primary.bg: $blue` | Semantischer Token (referenziert anderen) |

**Drei Stufen:** Tokens → Komponenten → Instanzen

Tokens abstrahieren Werte, Komponenten abstrahieren Struktur. Zusammen ergeben sie ein konsistentes Design System.
