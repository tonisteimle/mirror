# Didaktisches Konzept für Mirror-Dokumentation

## Zielgruppe

**Primär:** Designer, die programmieren wollen/müssen
- Denken visuell, nicht in Textstrukturen
- Frustriert von HTML/CSS/JS-Komplexität
- Kennen Design-Tools (Figma), aber nicht Code
- Wollen Ergebnisse sehen, nicht Syntax lernen

**Sekundär:** Entwickler, die schneller prototypen wollen

---

## Das Kernproblem, das wir lösen

Die Dokumentation muss ZUERST das Problem etablieren, das Mirror löst:

> "Ich will einen Button mit blauem Hintergrund."

**In HTML/CSS:**
```html
<button style="background-color: #3B82F6; padding: 12px 24px;
  border: none; border-radius: 8px; color: white;
  font-family: system-ui; cursor: pointer;">
  Click me
</button>
```

**In Mirror:**
```
Button bg #3B82F6 pad 12 24 rad 8 "Click me"
```

Das ist nicht nur "kürzer" – es ist eine **andere Art zu denken**.

---

## Die zentrale Einsicht

Mirror basiert auf EINER fundamentalen Idee:

> **Du beschreibst WAS du willst, nicht WIE es technisch umgesetzt wird.**

- `hor` = "ordne horizontal an" (nicht: `display: flex; flex-direction: row`)
- `pad 12` = "12 Pixel Abstand innen" (nicht: `padding: 12px`)
- `Button` = ein Button (nicht: `<button>` + CSS + Event-Handler)

Diese Einsicht muss der rote Faden sein.

---

## Pädagogische Prinzipien

### 1. Ein Konzept pro Abschnitt
Nicht drei Dinge gleichzeitig einführen. Jeder Abschnitt hat EINE neue Idee.

### 2. Aufbauen auf Vorwissen
Jedes Beispiel verwendet nur Konzepte, die vorher erklärt wurden.

### 3. Das WARUM erklären
Nicht: "So macht man X"
Sondern: "Dieses Problem existiert → Mirror löst es so"

### 4. Kontrast zeigen
Vergleiche mit dem, was sie kennen (HTML/CSS), um den Unterschied deutlich zu machen.

### 5. Konkret vor abstrakt
Erst ein spezifisches Beispiel, dann die Verallgemeinerung.

### 6. Entdecken lassen
Hinführen zu Erkenntnissen, statt Fakten zu listen.

---

## Struktur der Dokumentation

### Teil 1: Das Problem (Empathie aufbauen)

**Ziel:** Der Leser fühlt sich verstanden. "Ja, genau das nervt mich!"

Inhalte:
- Drei Sprachen lernen (HTML, CSS, JS)
- Frameworks obendrauf (React, Vue, Svelte)
- Ständiger Kontextwechsel
- Syntax-Fehler durch vergessene Klammern, Semikolons
- Design → Code Übersetzung ist mühsam

### Teil 2: Die Vision (Hoffnung geben)

**Ziel:** Der Leser versteht, was möglich ist.

Inhalte:
- Eine Sprache für alles
- Struktur, Style, Verhalten in einer Zeile
- Design-Tokens eingebaut
- Live-Preview beim Tippen
- Kompiliert zu echtem React/Vue/Svelte

### Teil 3: Hello World (Erster Erfolg)

**Ziel:** Der Leser tippt etwas und sieht ein Ergebnis.

```
Button "Hello"
```

Das ist ein kompletter, funktionierender Button. Keine imports, keine Boilerplate.

**Erklärung:**
- `Button` = Was es ist (Komponente)
- `"Hello"` = Was drinsteht (Inhalt)
- Fertig.

### Teil 4: Styling (Eigenschaften hinzufügen)

**Ziel:** Verstehen, wie Properties funktionieren.

```
Button bg #3B82F6 "Hello"
```

**Erklärung:**
- `bg #3B82F6` = Hintergrundfarbe
- Properties kommen nach dem Komponentennamen
- Kein `=`, kein `:`, kein `;`
- Die Reihenfolge ist egal

Dann schrittweise erweitern:
```
Button bg #3B82F6 pad 12 24 rad 8 "Hello"
```

Jede Property einzeln erklären:
- `pad 12 24` = Innenabstand (vertikal horizontal)
- `rad 8` = Eckenrundung

### Teil 5: Das Muster erkennen

**Ziel:** Die Struktur verinnerlichen.

```
Komponente eigenschaft wert eigenschaft wert "Inhalt"
```

Immer dasselbe Muster:
1. Was ist es?
2. Wie sieht es aus?
3. Was steht drin?

### Teil 6: Wiederverwendung (Komponenten definieren)

**Ziel:** Verstehen, wie man eigene Komponenten erstellt.

**Das Problem:**
```
Button bg #3B82F6 pad 12 24 rad 8 "Save"
Button bg #3B82F6 pad 12 24 rad 8 "Cancel"
Button bg #3B82F6 pad 12 24 rad 8 "Delete"
```

Wiederholung. Fehleranfällig. Wenn sich die Farbe ändert, muss man überall ändern.

**Die Lösung:**
```
PrimaryBtn: bg #3B82F6 pad 12 24 rad 8

PrimaryBtn "Save"
PrimaryBtn "Cancel"
PrimaryBtn "Delete"
```

**Erklärung:**
- Der Doppelpunkt macht aus einer Zeile eine **Definition**
- Ohne Doppelpunkt wird es **gerendert**
- Der Name ist frei wählbar (Großbuchstabe am Anfang)

### Teil 7: Tokens (Design-Variablen)

**Ziel:** Verstehen, warum Tokens wichtig sind.

**Das Problem:**
```
PrimaryBtn: bg #3B82F6 pad 12 24 rad 8
Card: bg #1A1A23 pad 24 rad 12
Link: col #3B82F6
```

Die Farbe `#3B82F6` taucht mehrfach auf. Wenn das Branding sich ändert?

**Die Lösung:**
```
$primary: #3B82F6
$card-bg: #1A1A23
$radius: 8

PrimaryBtn: bg $primary pad 12 24 rad $radius
Card: bg $card-bg pad 24 rad $radius
Link: col $primary
```

**Erklärung:**
- `$name: wert` definiert einen Token
- `$name` verwendet ihn
- Ändere `$primary` einmal → überall aktualisiert
- Das IST ein Design-System

### Teil 8: Hierarchie (Einrückung)

**Ziel:** Verstehen, wie Verschachtelung funktioniert.

```
Card bg #1A1A23 pad 24 rad 12
  Title "Projekt"
  Text "Beschreibung"
```

**Erklärung:**
- 2 Leerzeichen = ein Level tiefer
- `Title` und `Text` sind INNERHALB der `Card`
- Die Einrückung IST die Struktur
- Keine schließenden Tags nötig

**Vergleich:**
```html
<Card>
  <Title>Projekt</Title>
  <Text>Beschreibung</Text>
</Card>
```

In Mirror: Die visuelle Struktur im Code entspricht der visuellen Struktur im UI.

### Teil 9: Layout (Anordnung)

**Ziel:** Verstehen, wie Flexbox in Mirror funktioniert.

**Vertikal (Standard):**
```
Menu ver gap 8
  Item "Dashboard"
  Item "Settings"
```

**Horizontal:**
```
Nav hor gap 16
  Link "Home"
  Link "About"
```

**Erklärung:**
- `ver` = vertikal (untereinander)
- `hor` = horizontal (nebeneinander)
- `gap 8` = Abstand zwischen den Kindern

Das ist ALLES. Kein `display: flex`, kein `flex-direction`, kein `justify-content`.

### Teil 10: Interaktivität (Events)

**Ziel:** Verstehen, wie Aktionen funktionieren.

```
Button onclick toggle "Dark Mode"
```

**Erklärung:**
- `onclick` = wenn geklickt wird
- `toggle` = wechsle den Zustand
- Das ist die ganze Event-Logik

Weitere Actions:
- `open Dialog` = öffne ein Overlay
- `close` = schließe es
- `page Dashboard` = navigiere zur Seite

---

## Visuelle Previews: Wann und wie

Previews sind UNTERSTÜTZEND, nicht ersetzend.

**Richtig:**
1. Konzept erklären
2. Code zeigen
3. Preview zeigen
4. Zusammenhang erklären

**Falsch:**
1. Code zeigen
2. Preview zeigen
(Kein Kontext, keine Erklärung)

---

## Tonalität

- **Direkt:** Keine Füllwörter
- **Ehrlich:** Sagen, was Mirror kann und was nicht
- **Respektvoll:** Der Leser ist intelligent, nur unerfahren
- **Konkret:** Beispiele statt Abstraktionen
