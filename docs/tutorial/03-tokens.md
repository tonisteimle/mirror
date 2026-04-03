---
title: Vererbung & Tokens
subtitle: Varianten erstellen und Werte zentral verwalten
prev: 02-komponenten
next: 04-layout
---

Dieses Kapitel zeigt zwei Konzepte für skalierbare UIs: Mit `as` erstellst du Varianten einer Komponente (z.B. PrimaryBtn, DangerBtn). Mit Tokens definierst du Werte zentral und verwendest sie überall.

## Das Problem: Ähnliche Komponenten

Du hast einen Button definiert und brauchst nun Varianten – Primary, Danger, Ghost. Ohne Vererbung müsstest du alles kopieren:

```mirror
// Ohne Vererbung: Alles wiederholen
PrimaryBtn: pad 10 20, rad 6, cursor pointer, bg #2563eb, col white
DangerBtn: pad 10 20, rad 6, cursor pointer, bg #ef4444, col white
GhostBtn: pad 10 20, rad 6, cursor pointer, bg transparent, col #888, bor 1, boc #333

Frame hor, gap 8
  PrimaryBtn "Speichern"
  DangerBtn "Löschen"
  GhostBtn "Abbrechen"
```

Das Problem: `pad 10 20, rad 6, cursor pointer` wird dreimal wiederholt. Änderst du das Padding, musst du es überall anpassen.

## Vererbung mit as

Mit `as` erbst du von einer Basis-Komponente und überschreibst nur das, was sich unterscheidet:

```mirror
// Basis-Button
Btn: pad 10 20, rad 6, cursor pointer

// Varianten erben mit "as"
PrimaryBtn as Btn: bg #2563eb, col white
DangerBtn as Btn: bg #ef4444, col white
GhostBtn as Btn: bg transparent, col #888, bor 1, boc #333

Frame hor, gap 8
  PrimaryBtn "Speichern"
  DangerBtn "Löschen"
  GhostBtn "Abbrechen"
```

## Vererbung mit Slots

Auch Komponenten mit Slots können vererbt werden:

```mirror
// Basis-Card
Card: bg #1a1a1a, pad 16, rad 8, gap 8
  Title: fs 16, weight 500, col white
  Body: col #888, fs 14

// Feature-Card erbt und erweitert
FeatureCard as Card: bor 1, boc #333
  Icon: margin 0 0 8 0

// Verwendung
FeatureCard
  Icon
    Icon "zap", ic #f59e0b, is 24
  Title "Schnell"
  Body "Kompiliert in Millisekunden"
```

## Design Tokens definieren

Tokens sind zentrale Werte für konsistentes Design. Bei der **Definition** gibst du einen Suffix an (`.bg`, `.col`, `.rad`), bei der **Verwendung** nicht – das Property sagt bereits, welcher Typ erwartet wird:

```mirror
// 1. TOKENS – Definition MIT Suffix
$btn.bg: #2563eb
$btn.col: white
$card.bg: #1a1a1a
$card.rad: 8

// 2. KOMPONENTEN – Tokens verwenden (OHNE Suffix)
Card: bg $card, rad $card, pad 16, gap 8
  Title: col white, fs 16, weight 500

Btn: bg $btn, col $btn, pad 10 20, rad 6

// 3. INSTANZEN – sauber, nur Inhalt
Card
  Title "Mit Tokens"
  Btn "Primary"
```

**Warum Suffixe?** Sie ermöglichen intelligentes Autocomplete: Tippst du `bg $`, zeigt die IDE nur Tokens mit `.bg` Suffix. Bei `rad $` nur `.rad` Tokens.

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
| `Child as Parent:` | Vererbung – Varianten einer Komponente |
| `$blue.bg: #2563eb` | Primitiver Token – Rohwert |
| `$primary.bg: $blue` | Semantischer Token – referenziert anderen Token |
| `bg $primary` | Token verwenden (ohne Suffix) |
