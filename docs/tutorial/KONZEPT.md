# Mirror Tutorial: Didaktisches Konzept

## Zielgruppe

**Designer die coden lernen wollen**

- Kennen Figma, Sketch, Adobe XD
- Verstehen visuelles Denken (Boxes, Spacing, Colors)
- Haben wenig bis keine Code-Erfahrung
- Wollen schnell Ergebnisse sehen
- Sind frustriert von komplexen Frameworks

**Nicht die Zielgruppe:**
- Erfahrene Entwickler (brauchen nur Referenz)
- Komplette Anfänger ohne Design-Background

---

## Kernprinzipien

### 1. Ein Konzept pro Lektion

Nie mehr als eine neue Idee einführen. Wenn die Lektion "Farben" heißt, geht es nur um Farben - nicht um Farben UND Spacing UND Layout.

```
SCHLECHT: Frame bg #27272a, pad 20, rad 8, gap 12
          → 4 neue Konzepte auf einmal

GUT:      Frame bg #27272a
          → Ein Konzept: Hintergrundfarbe
```

### 2. Zeigen vor Erklären

Erst das Ergebnis zeigen, dann erklären wie es funktioniert. Designer denken visuell.

```
SCHLECHT: "Die bg-Property setzt die Hintergrundfarbe..."
          [Code-Beispiel]

GUT:      [Visuelles Ergebnis: blaue Box]
          "Das ist eine Box mit blauem Hintergrund."
          "Der Code dafür: Frame bg #3b82f6"
```

### 3. Sofort selbst machen

Nach maximal 30 Sekunden Erklärung muss der Lernende selbst etwas tun.

```
SCHLECHT: 3 Absätze Erklärung, dann Beispiel

GUT:      1 Satz, Beispiel, "Ändere die Farbe zu grün"
```

### 4. Fehler sind Lernmomente

Aktiv zeigen was passiert wenn etwas fehlt oder falsch ist.

```
GUT:      "Was passiert wenn du bg weglässt?"
          → Lernender sieht: transparenter Hintergrund
          → Versteht: bg ist optional, hat default
```

### 5. Aufbauen, nicht wiederholen

Jede Lektion baut auf der vorherigen auf. Am Ende hat man ein vollständiges Projekt.

```
Lektion 1: Eine Box        → Frame
Lektion 2: Mit Farbe       → Frame bg #...
Lektion 3: Mit Text        → Frame + Text
Lektion 4: Mit Spacing     → pad, gap
Lektion 5: Zusammen        → Eine vollständige Karte
```

---

## Struktur des Tutorials

### Aufbau: 3 Teile

```
TEIL 1: Grundlagen (Lektion 1-8)
        "Ich kann eine UI bauen"

TEIL 2: Interaktivität (Lektion 9-12)
        "Ich kann die UI lebendig machen"

TEIL 3: Skalierung (Lektion 13-16)
        "Ich kann ein Design System bauen"
```

### Teil 1: Grundlagen

| # | Lektion | Lernziel | Neues Konzept |
|---|---------|----------|---------------|
| 1 | Hallo Mirror | Erstes Erfolgserlebnis | Frame, Text |
| 2 | Farben | Styling verstehen | bg, col |
| 3 | Größen | Dimensionen kontrollieren | w, h, rad |
| 4 | Abstände | Innen vs. Außen | pad, gap |
| 5 | Anordnung | Horizontal & Vertikal | hor, ver |
| 6 | Ausrichtung | Dinge positionieren | center, spread |
| 7 | Typografie | Text gestalten | fs, weight, font |
| 8 | **Projekt: Karte** | Alles zusammen | - |

### Teil 2: Interaktivität

| # | Lektion | Lernziel | Neues Konzept |
|---|---------|----------|---------------|
| 9 | Hover | Reaktion auf Maus | hover: |
| 10 | Zustände | Eigene States | state selected |
| 11 | Aktionen | Klicks verarbeiten | onclick, toggle |
| 12 | **Projekt: Button** | Interaktiver Button | - |

### Teil 3: Skalierung

| # | Lektion | Lernziel | Neues Konzept |
|---|---------|----------|---------------|
| 13 | Komponenten | Wiederverwendbarkeit | Card: |
| 14 | Vererbung | Varianten erstellen | extends |
| 15 | Tokens | Konsistente Werte | $farbe.bg |
| 16 | **Projekt: Design System** | Alles zusammen | - |

---

## Lektionsstruktur

Jede Lektion folgt diesem Muster:

```
┌─────────────────────────────────────────────────┐
│ HOOK (5 Sekunden)                               │
│ Visuelles Ergebnis zeigen                       │
│ "Das bauen wir jetzt"                           │
├─────────────────────────────────────────────────┤
│ KONZEPT (30 Sekunden)                           │
│ Ein Satz Erklärung                              │
│ Minimales Code-Beispiel                         │
├─────────────────────────────────────────────────┤
│ AUSPROBIEREN (1-2 Minuten)                      │
│ "Ändere X zu Y"                                 │
│ Playground mit vorgefülltem Code                │
├─────────────────────────────────────────────────┤
│ ERWEITERN (2-3 Minuten)                         │
│ "Füge jetzt Z hinzu"                            │
│ Baut auf vorherigem auf                         │
├─────────────────────────────────────────────────┤
│ CHALLENGE (2-3 Minuten)                         │
│ Kleine Aufgabe ohne sofortige Lösung            │
│ "Baue einen blauen Button mit weißem Text"      │
├─────────────────────────────────────────────────┤
│ LÖSUNG (aufklappbar)                            │
│ Nur wenn man nicht weiterkommt                  │
├─────────────────────────────────────────────────┤
│ ZUSAMMENFASSUNG (10 Sekunden)                   │
│ "Du hast gelernt: bg setzt die Hintergrundfarbe"│
│ → Weiter zu Lektion X                           │
└─────────────────────────────────────────────────┘
```

---

## Playground-Regeln

### Layout

```
┌─────────────────┬─────────────────┐
│                 │                 │
│     CODE        │    PREVIEW      │
│                 │                 │
│                 │                 │
└─────────────────┴─────────────────┘
```

- Code links, Preview rechts (wie Figma)
- Immer sichtbar, kein Tab-Wechsel
- Live-Update bei jeder Änderung

### Vorbefüllter Code

Jeder Playground startet mit funktionierendem Code. Der Lernende ändert, nicht erstellt.

```
SCHLECHT: Leerer Editor
          "Schreibe einen Frame mit Hintergrund"

GUT:      Frame bg #3b82f6
          "Ändere die Farbe zu rot (#ef4444)"
```

### Fehlertoleranz

- Syntaxfehler werden angezeigt, aber freundlich
- Kein roter scary Error-Screen
- Hinweis was fehlt: "Hast du das Komma vergessen?"

---

## Sprache & Ton

### Prinzipien

1. **Du, nicht Sie** - Persönlich, nicht förmlich
2. **Aktiv, nicht passiv** - "Du baust" nicht "Es wird gebaut"
3. **Kurz** - Max 2 Sätze pro Absatz
4. **Keine Fachbegriffe** - "Abstand" nicht "Padding" (erst später)

### Beispiele

```
SCHLECHT: "Die padding-Property definiert den inneren Abstand
          eines Elements zu seinem Inhalt."

GUT:      "pad macht Platz zwischen der Box und dem Text darin."
```

```
SCHLECHT: "Flexbox ermöglicht die horizontale Anordnung
          von Child-Elementen."

GUT:      "hor legt Dinge nebeneinander."
```

### Progression der Begriffe

| Lektion | Einfacher Begriff | Fachbegriff (später) |
|---------|-------------------|----------------------|
| 1-4 | "Box" | Frame |
| 1-4 | "Abstand innen" | Padding |
| 1-4 | "Abstand zwischen" | Gap |
| 5-8 | "nebeneinander" | horizontal |
| 9+ | Fachbegriffe OK | - |

---

## Visuelles Design

### Farben im Tutorial

Konsistente Farben für Konzepte:

| Konzept | Farbe | Verwendung |
|---------|-------|------------|
| Code | Mono-Font, dunkler Hintergrund | Code-Blöcke |
| Neu/Wichtig | Blau #3b82f6 | Neue Properties |
| Erfolg | Grün #22c55e | "Richtig!" |
| Hinweis | Gelb/Orange | Tips |
| Fehler | Rot #ef4444 | Syntaxfehler |

### Playground-Beispiele

Alle Beispiele verwenden dieselbe Farbpalette:

```
Hintergrund:  #18181b (fast schwarz)
Oberfläche:   #27272a (dunkelgrau)
Akzent:       #3b82f6 (blau)
Text:         #ffffff (weiß)
Text gedämpft: #888888 (grau)
```

→ Konsistenz, keine Ablenkung durch wechselnde Farben

---

## Erfolgsmessung

### Pro Lektion

Der Lernende kann am Ende:
- [ ] Das neue Konzept in eigenen Worten erklären
- [ ] Die Challenge ohne Lösung schaffen
- [ ] Das Konzept in der nächsten Lektion anwenden

### Pro Teil

| Teil | Erfolg |
|------|--------|
| Teil 1 | Kann eine statische Karte bauen |
| Teil 2 | Kann einen interaktiven Button bauen |
| Teil 3 | Kann ein Mini-Design-System erstellen |

---

## Anti-Patterns (Was wir NICHT tun)

### ❌ Zu viel auf einmal

```
NICHT: "Hier ist Frame, Text, Button, Input, Image,
        Icon, Link, Label, Divider..."
```

### ❌ Theorie ohne Praxis

```
NICHT: "Flexbox ist ein CSS-Layout-Modell das..."
       [3 Absätze Erklärung]
       [Kein Playground]
```

### ❌ Optionen vor Grundlagen

```
NICHT: "Du kannst pad 8 oder pad 8 16 oder
        pad 8 16 8 16 oder pad left 8 schreiben..."
```

### ❌ Referenz statt Tutorial

```
NICHT: Tabelle mit allen 80 Properties
SONDERN: Die 10 wichtigsten, Schritt für Schritt
```

### ❌ Perfektionismus

```
NICHT: "Achte auf konsistente Spacing-Werte
        die einem 8px-Grid folgen..."
SONDERN: "pad 16 macht guten Abstand"
```

---

## Nächste Schritte

1. [ ] Lektion 1 nach diesem Konzept neu schreiben
2. [ ] Playground-Komponente mit Solve-Button erweitern
3. [ ] Challenge-Komponente mit aufklappbarer Lösung bauen
4. [ ] Lektionen 2-8 (Teil 1) schreiben
5. [ ] Testen mit echten Design-Anfängern
6. [ ] Iterieren basierend auf Feedback
