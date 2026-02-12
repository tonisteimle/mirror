# Inhaltliches Konzept: Mirror Dokumentation

## Analyse des bestehenden Inhalts

### Aktuelle Struktur (42 Sektionen)

**Basics:**
- Hello World
- Components
- Tokens
- Property Reference
- Indentation = Structure
- Type Inference
- Auto Text Color
- Overriding Properties
- Inheritance with from
- Implicit Children
- References with $
- Layout

**Interaktivität:**
- States
- Events & Actions
- Named Instances
- Component Properties
- Centralized Events
- Conditional Logic
- Iterators

**Advanced:**
- Slots – Named Children
- Flat Access
- List Items
- Data Binding
- Content at the End
- Scope
- At a Glance

**Tutorial (separat):**
- 20+ Sektionen mit Dashboard-Beispiel

### Probleme der aktuellen Struktur

1. **Keine Erzählung** – Sektionen stehen nebeneinander, keine Geschichte
2. **Zu viel zu früh** – Property Reference als 4. Sektion überfordert
3. **Kein Problemkontext** – Es fehlt das "Warum gibt es das?"
4. **Tutorial ist isoliert** – Sollte integriert sein, nicht am Ende
5. **Fortgeschrittenes zu früh** – Slots, Flat Access vor den Basics
6. **Keine Lernziele** – Unklar, was der Leser am Ende kann

---

## Neues Konzept: "Learn Mirror in 30 Minutes"

### Leitprinzip

Die Dokumentation ist eine **geführte Reise**, kein Nachschlagewerk.
Der Leser soll am Ende **selbstständig UIs bauen** können.

### Struktur: 4 Teile

```
Teil 1: Die ersten 5 Minuten (Einstieg)
Teil 2: UIs bauen (Kern)
Teil 3: Interaktivität (Verhalten)
Teil 4: Fortgeschritten (Vertiefung)
```

---

## Teil 1: Die ersten 5 Minuten

**Ziel:** Der Leser versteht, was Mirror ist und hat seinen ersten Erfolg.

### 1.1 Warum Mirror?

**Das Problem etablieren:**
- Web-Entwicklung ist komplex (HTML + CSS + JS + Framework)
- Kleine Änderungen erfordern viel Code
- Designer können nicht selbst umsetzen

**Konkretes Beispiel:**
```html
<!-- Das will ich -->
Ein blauer Button mit Text

<!-- In HTML/CSS -->
<button style="background-color: #3B82F6; padding: 12px 24px;
  border-radius: 8px; border: none; color: white;
  font-family: system-ui; cursor: pointer;">
  Klick mich
</button>

<!-- In Mirror -->
Button bg #3B82F6 pad 12 24 rad 8 "Klick mich"
```

**Die Einsicht:**
> Mirror beschreibt WAS du willst, nicht WIE es technisch geht.

### 1.2 Dein erster Button

**Ziel:** Sofortiger Erfolg

```
Button "Hello"
```

Das ist alles. Ein funktionierender Button.

**Dann Schritt für Schritt erweitern:**
```
Button "Hello"                           // Nur Text
Button bg #3B82F6 "Hello"               // Mit Farbe
Button bg #3B82F6 pad 12 24 "Hello"     // Mit Abstand
Button bg #3B82F6 pad 12 24 rad 8 "Hello" // Mit Rundung
```

**Das Muster:**
```
Komponente [eigenschaften] "Inhalt"
```

### 1.3 Das Grundprinzip

**Die zwei Bausteine:**

1. **Komponenten** – beginnen mit Großbuchstaben
   - `Button`, `Card`, `Text`, `Input`
   - Alles was du siehst ist eine Komponente

2. **Tokens** – beginnen mit `$`
   - `$primary`, `$spacing`, `$radius`
   - Speichern Werte zur Wiederverwendung

```
$primary: #3B82F6

Button bg $primary "Save"
Button bg $primary "Cancel"
```

**Zusammenfassung Teil 1:**
> Du kannst jetzt einzelne Elemente erstellen und stylen.

---

## Teil 2: UIs bauen

**Ziel:** Der Leser kann komplette Layouts erstellen.

### 2.1 Elemente verschachteln

**Das Problem:**
Bisher nur einzelne Elemente. Wie baut man eine Card mit Titel und Text?

**Die Lösung: Einrückung**
```
Card bg #1A1A23 pad 24 rad 12
  Title size 18 weight 600 "Projektname"
  Text col #71717A "Beschreibung des Projekts"
```

**Die Regel:**
- 2 Leerzeichen = ein Level tiefer
- Eingerückte Elemente sind Kinder
- Keine schließenden Tags nötig

**Vergleich mit HTML:**
```html
<Card>
  <Title>Projektname</Title>
  <Text>Beschreibung</Text>
</Card>
```

In Mirror: Was du siehst ist was du bekommst.

### 2.2 Horizontal und Vertikal

**Das Problem:**
Elemente sind standardmäßig untereinander. Wie nebeneinander?

**Die Lösung:**
```
// Vertikal (Standard)
Menu ver gap 8
  Item "Dashboard"
  Item "Settings"

// Horizontal
Nav hor gap 16
  Link "Home"
  Link "About"
```

**Die Eigenschaften:**
- `ver` = vertikal (untereinander)
- `hor` = horizontal (nebeneinander)
- `gap 8` = Abstand zwischen Kindern

### 2.3 Ausrichtung

**Das Problem:**
Logo links, Navigation rechts – wie geht das?

**Die Lösung:**
```
Header hor between ver-cen
  Logo "Mirror"
  Nav hor gap 16
    Link "Docs"
    Link "Pricing"
```

**Die Eigenschaften:**
- `between` = maximaler Abstand (Links/Rechts)
- `ver-cen` = vertikal zentriert
- `hor-cen` = horizontal zentriert
- `cen` = beides zentriert

### 2.4 Komponenten wiederverwenden

**Das Problem:**
```
Button bg #3B82F6 pad 12 24 rad 8 "Save"
Button bg #3B82F6 pad 12 24 rad 8 "Cancel"
Button bg #3B82F6 pad 12 24 rad 8 "Delete"
```

Dreimal derselbe Code. Fehleranfällig.

**Die Lösung:**
```
PrimaryBtn: bg #3B82F6 pad 12 24 rad 8

PrimaryBtn "Save"
PrimaryBtn "Cancel"
PrimaryBtn "Delete"
```

**Die Regel:**
- Mit Doppelpunkt = Definition
- Ohne Doppelpunkt = Verwendung

### 2.5 Varianten erstellen

**Das Problem:**
Ich brauche einen roten Button für "Löschen".

**Die Lösung:**
```
Button: pad 12 24 rad 8

PrimaryBtn from Button: bg #3B82F6
DangerBtn from Button: bg #EF4444
GhostBtn from Button: bg transparent bor 1 boc #3B82F6
```

**Die Regel:**
- `from` erbt alle Eigenschaften
- Neue Eigenschaften überschreiben

### 2.6 Praxis: Eine Card bauen

**Schritt für Schritt ein reales UI-Element:**

```
// Tokens definieren
$bg-card: #1A1A23
$text-muted: #71717A
$primary: #3B82F6

// Card definieren
Card: bg $bg-card pad 24 rad 12 ver gap 16
  Title: size 18 weight 600
  Description: col $text-muted size 14
  Actions: hor gap 8

// Card verwenden
Card
  Title "Mein Projekt"
  Description "Eine kurze Beschreibung"
  Actions
    Button bg $primary "Öffnen"
    Button bg transparent "Mehr"
```

**Zusammenfassung Teil 2:**
> Du kannst jetzt komplette UIs mit verschachtelten Komponenten bauen.

---

## Teil 3: Interaktivität

**Ziel:** Der Leser kann auf Benutzeraktionen reagieren.

### 3.1 Zustände

**Das Problem:**
Ein Tab soll anders aussehen wenn er aktiv ist.

**Die Lösung:**
```
Tab: pad 12 16 rad 8
  state inactive
    bg transparent
    col #71717A
  state active
    bg #3B82F6
    col white
```

**Die Regel:**
- `state name` definiert einen Zustand
- Eigenschaften darunter gelten nur in diesem Zustand

### 3.2 Events

**Das Problem:**
Beim Klick soll etwas passieren.

**Die Lösung:**
```
Button onclick toggle "Dark Mode"
```

**Häufige Events:**
- `onclick` – beim Klick
- `onchange` – wenn Wert sich ändert
- `oninput` – während der Eingabe

**Häufige Actions:**
- `toggle` – Zustand wechseln
- `open Dialog` – Overlay öffnen
- `close` – Overlay schließen
- `page Settings` – Zur Seite navigieren

### 3.3 Dialoge und Overlays

**Das Problem:**
Ein Popup soll erscheinen.

**Die Lösung:**
```
Button onclick open SettingsDialog "Settings"

Dialog SettingsDialog: bg #1A1A23 pad 24 rad 12 w 400
  Title "Einstellungen"
  // ... Inhalt
  Button onclick close "Schließen"
```

### 3.4 Formulare

**Das Problem:**
Eingabefelder erstellen und Werte lesen.

**Die Lösung:**
```
Form ver gap 12
  Input Email: placeholder "Email"
  Input Password: placeholder "Passwort" type password
  Button onclick submit "Login"

events
  submit onclick
    if Email.value and Password.value
      page Dashboard
```

**Die Regel:**
- `Input Name:` gibt dem Input einen Namen
- `Name.value` liest den Wert

### 3.5 Bedingte Anzeige

**Das Problem:**
Element nur anzeigen wenn Bedingung erfüllt.

**Die Lösung:**
```
if $isLoggedIn
  Avatar
  Button "Logout"
else
  Button "Login"
```

### 3.6 Listen

**Das Problem:**
Für jeden Eintrag in einer Liste ein Element erstellen.

**Die Lösung:**
```
each $task in $tasks
  Card
    Title $task.name
    Text $task.status
```

**Zusammenfassung Teil 3:**
> Du kannst jetzt interaktive UIs mit Events, Formularen und dynamischen Inhalten bauen.

---

## Teil 4: Fortgeschritten

**Ziel:** Tieferes Verständnis für komplexe Patterns.

### 4.1 Slots

Definiere Platzhalter in Komponenten, die bei Verwendung gefüllt werden.

### 4.2 Flacher Zugriff

Greife auf verschachtelte Elemente direkt zu, ohne den Pfad zu kennen.

### 4.3 Scope

Verstehe, wo Variablen sichtbar sind.

### 4.4 Berechnungen

Verwende Ausdrücke direkt im UI.

---

## Anhang: Referenz

**Erst am Ende, nicht am Anfang.**

### Alle Properties
### Alle Events
### Alle Actions
### Alle Komponenten

---

## Vergleich: Alt vs. Neu

| Alt | Neu |
|-----|-----|
| 42 ungeordnete Sektionen | 4 klare Teile |
| Property Reference früh | Referenz am Ende |
| Tutorial separat | Praxis integriert |
| Kein Problemkontext | Problem → Lösung |
| Fortgeschrittenes früh | Progressive Komplexität |

---

## Umsetzungsplan

1. **Teil 1 schreiben** – Das ist das Wichtigste. Wenn der Einstieg nicht sitzt, liest niemand weiter.

2. **Teil 2 schreiben** – Der praktische Kern. Hier verbringt der Leser die meiste Zeit.

3. **Teil 3 schreiben** – Interaktivität. Hier wird es spannend.

4. **Teil 4 + Referenz** – Kann später ergänzt werden.

---

## Nächster Schritt

Soll ich mit Teil 1 beginnen und dir einen ausformulierten Entwurf zeigen?
