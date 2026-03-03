# Mirror v2 Tutorial

> Lerne Mirror von Grund auf. Jedes Konzept baut auf dem vorherigen auf.

---

## 1. Komponenten und Primitiven

In Mirror gibt es eine kleine Menge eingebauter **Primitiven** (klein geschrieben):

- `frame` → HTML `<div>` (Container, wie Figma Frame)
- `text` → HTML `<span>`
- `input` → HTML `<input>`
- `button` → HTML `<button>`
- `image` → HTML `<img>`
- `link` → HTML `<a>`
- `icon` → SVG Icon

Komponenten werden mit `as` auf Primitiven basiert:

```
Text as text:
    col #E4E4E7
```

Das definiert eine Komponente `Text` die auf der Primitive `text` basiert.

Jetzt können wir sie verwenden (ohne Doppelpunkt, ohne as):

```
Text as text:
    col #E4E4E7

Text "Hello World"
```

Definition einmal, Verwendung beliebig oft.

**Zwei Regeln:**
- `as` für Primitiv-basierte Definitionen: `Card as frame:`
- `extends` für Komponenten-Vererbung: `DangerButton extends Button:`

---

## 2. Kinder und Einrückung

Komponenten können Kinder haben. Einrückung zeigt die Hierarchie.

```
Text as text:
    col #E4E4E7

Card as frame:
    pad 16, bg #1a1a23, rad 8

Card
    Text "Hello World"
```

`Text` ist ein Kind von `Card`. Einrückung = Verschachtelung.

Auch in der Definition:

```
Title as text:
    font-size 20, weight bold

Content as frame:
    col #888

Card as frame:
    pad 16, bg #1a1a23, rad 8
    Title:
    Content:
```

`Title:` und `Content:` sind Slots - Platzhalter für Inhalte.

---

## 3. Properties

Properties folgen nach dem Doppelpunkt, mit Kommas getrennt.

```
Box as frame:
    pad 16, bg #1a1a23, rad 8
```

- `pad 16` - Innenabstand 16px
- `bg #1a1a23` - Hintergrundfarbe
- `rad 8` - Eckenradius 8px

Mehrere Werte für ein Property:

```
Box as frame:
    pad 8 16
```

`pad 8 16` = 8px vertikal, 16px horizontal.

---

## 4. Layout

Kinder werden standardmäßig vertikal gestapelt.

```
Text as text:

Column as frame:
    ver, gap 8

Column
    Text "Eins"
    Text "Zwei"
    Text "Drei"
```

Für horizontales Layout:

```
Row as frame:
    hor, gap 8

Row
    Text "Links"
    Text "Mitte"
    Text "Rechts"
```

- `hor` - horizontale Anordnung
- `ver` - vertikale Anordnung (Standard)
- `gap 8` - Abstand zwischen Kindern

Zentrieren:

```
Center as frame:
    center

Center
    Text "Zentriert"
```

---

## 5. Tokens (Design-Variablen)

Wiederverwendbare Werte definieren:

```
primary: color = #3B82F6
danger: color = #EF4444
surface: color = #1a1a23

sm: size = 4
md: size = 8
lg: size = 16
```

Struktur: `name: typ = wert`

Typen:
- `color` - Farben (für bg, col, boc)
- `size` - Größen (für pad, gap, rad, w, h)
- `font` - Schriftarten
- `icon` - Icon-Namen

Verwendung - einfach den Namen:

```
primary: color = #3B82F6
sm: size = 4

Box pad sm, bg primary
    Text "Styled"
```

### Token-Gruppierung

Zusammengehörige Tokens gruppieren:

```
dropdown:
    bg: color = #1A1A23
    border: color = #333
    item-hover: color = #444
    item-selected: color = #2271c1
```

Verwendung mit Prefix:

```
Menu bg dropdown.bg, bor 1 dropdown.border
    Item
        hover:
            bg dropdown.item-hover
```

---

## 6. Import

Definitionen in separate Dateien auslagern und importieren.

```
// tokens.mirror
primary: color = #3B82F6
text: color = #E4E4E7
sm: size = 4
```

```
// components.mirror
import "tokens"

Text as text:
    col text

Button as button:
    pad sm, bg primary, col white
```

```
// app.mirror
import "components"

Button "Click me"
```

`import "dateiname"` macht alle Definitionen aus der Datei verfügbar.

Du kannst importierte Komponenten überschreiben:

```
import "components"

// Button neu definieren
Button as button:
    pad 12, bg primary, rad 8

Button "Click"
```

---

## 7. Vererbung

`as` für Primitiv-basierte Definitionen, `extends` für Komponenten-Vererbung.

Von Primitiven (mit `as`):
```
Button as button:
    pad 8 16, bg primary, col white, rad 4
```

Von Komponenten (mit `extends`):
```
DangerButton extends Button:
    bg danger
```

`DangerButton` erbt alles von `Button`, überschreibt nur `bg`.

```
Button "Speichern"
DangerButton "Löschen"
```

Mehrere Varianten:

```
Button as button:
    pad 8 16, bg primary, col white, rad 4

DangerButton extends Button:
    bg danger

GhostButton extends Button:
    bg transparent, bor 1 primary

IconButton extends Button:
    pad 8
```

**Regel:** `as` = basiert auf Primitiv, `extends` = erbt von Komponente.

---

## 8. Benannte Instanzen

Um Elemente später zu referenzieren, gib ihnen einen Namen mit `named`.

```
Button named saveBtn "Speichern"
DangerButton named deleteBtn "Löschen"
```

`saveBtn` ist eine Button-Instanz mit dem Namen "saveBtn".

In JavaScript:
```javascript
ui.saveBtn.onclick = () => { ... }
ui.deleteBtn.onclick = () => { ... }
```

---

## 9. States

Elemente können verschiedene Zustände haben.

### Hover-State

```
Card as frame:
    pad 16, bg surface, rad 8
    hover:
        bg #333
```

Bei Hover ändert sich der Hintergrund.

### Eigene States

```
Button as button:
    pad 8 16, bg primary
    hover:
        bg primary-hover
    disabled:
        opacity 0.5
    loading:
        opacity 0.7
```

State-Syntax: `statename:` mit Einrückung.

### Inline-States

Für einfache Fälle:

```
Button as button:
    pad 8, bg primary
    hover: bg primary-hover
    disabled: opacity 0.5
```

### State Child Overrides

States können auch Kind-Elemente verändern:

```
Input as input:
    bg surface
    Placeholder "E-Mail..." col muted
    Value col muted

    filled:
        Value col text

    invalid:
        Value col danger
        bor 1 danger
```

Nützlich für Inputs, Toggles, Tabs:

```
Toggle as frame:
    Thumb as frame:
        size 20, bg white, rad 10

    on:
        bg primary
        Thumb margin-left 20

    off:
        bg muted
        Thumb margin-left 0
```

---

## 10. Events

Interaktion definieren.

```
Button: pad 8, bg primary
    onclick toggle Menu
```

Wichtige Events:
- `onclick` - Klick
- `onhover` - Maus drüber
- `onchange` - Wert geändert
- `oninput` - Während Eingabe
- `onfocus` - Fokus erhalten
- `onblur` - Fokus verloren

### Keyboard-Events

```
Input: pad 8, bg surface
    onkeydown escape: clear
    onkeydown enter: submit
```

### Keys Block

Gruppierte Keyboard-Handler:

```
Dropdown as frame:
    keys
        escape close
        arrow-down highlight next
        arrow-up highlight prev
        enter select
```

### Timing Modifiers

Verzögerung und Debounce:

```
Input as input:
    oninput debounce 300: filter Results

Button as button:
    onclick delay 200: submit
```

- `debounce N` - Wartet N ms nach letztem Event
- `delay N` - Verzögert um N ms

---

## 11. Actions

Was bei Events passiert.

```
onclick toggle          // Element ein/ausblenden
onclick select          // Element auswählen
onclick highlight       // Element hervorheben
```

Mit Target:

```
onclick show Menu       // Menu zeigen
onclick hide Modal      // Modal verstecken
onclick highlight next  // Nächstes hervorheben
onclick close Dropdown  // Dropdown schließen
```

Mehrere Actions:

```
onclick select, close   // Auswählen und schließen
```

### Action-Targets

```
onclick highlight           // Sich selbst (implizit)
onclick highlight next      // Nächstes Element
onclick highlight prev      // Vorheriges
onclick highlight first     // Erstes
onclick highlight last      // Letztes
```

**Regel:** Kein Target = wirkt auf sich selbst.

### Call (JavaScript)

Externe JavaScript-Funktionen aufrufen:

```
Button as button:
    onclick call handleSubmit

Input as input:
    onchange call validateEmail
```

```javascript
// JavaScript
function handleSubmit() {
    console.log('Submit clicked')
}
```

---

## 12. Listen

Mehrere gleichartige Elemente einfach untereinander.

```
Menu
    Item "Profil"
    Item "Einstellungen"
    Item "Abmelden"
```

Jede Zeile erzeugt eine neue Instanz.

Mit Properties:

```
Menu
    Item "Profil"
    Item "Einstellungen"
    Item col danger, "Abmelden"
```

---

## 13. Daten und Iteration

Daten durchlaufen mit `each`.

```
each task in tasks
    Card
        Text task.title
        Text col muted, task.date
```

Kein `-` nötig - Instanzen werden automatisch erzeugt.

### Data Binding

Komponente an Datenquelle binden:

```
TaskList as frame:
    data tasks

    Card
        Text task.title
```

### Filtern

```
TaskList as frame:
    data tasks where done == false

    Card
        Text task.title
```

### Kombiniert

```
TaskList as frame:
    data tasks where done == false

    TodoItem
        Text task.title
        Text col muted, task.date
        Icon task.done ? "check" : "circle"
```

---

## 14. Conditionals

### Block-Conditional

```
if loggedIn
    Avatar
    Text username
else
    Button "Login"
```

### Inline-Conditional (Ternary)

```
Icon done ? "check" : "circle"
bg active ? primary : surface
```

Für Anfänger ist `if then else` lesbarer:

```
Icon if done then "check" else "circle"
```

---

## 15. Inline-Formatierung

Rich Text innerhalb von Strings:

```
Text "Das ist *wichtig*:bold und das ist *anders*:italic"
Text "Klicke *hier*:underline für mehr"
Text "Status: *Aktiv*:primary"
```

Formate:
- `*text*:bold` - Fett
- `*text*:italic` - Kursiv
- `*text*:underline` - Unterstrichen
- `*text*:tokenName` - Mit Token stylen

---

## 16. Section Headers

Komponenten in der Library gruppieren:

```
--- Buttons ---

Button as button:
    pad 8, bg primary

DangerButton extends Button:
    bg danger

--- Cards ---

Card as frame:
    pad 16, bg surface

InfoCard extends Card:
    bor 1 primary
```

Sections erscheinen als Überschriften in der Component Library.

---

## 17. Slots

Platzhalter für Inhalte in Komponenten.

```
Card as frame:
    Title:
    Content:
```

`Title:` und `Content:` sind Slots - leere Kind-Definitionen.

Verwendung:

```
Card
    Title "Willkommen"
    Content
        Text "Dies ist der Inhalt."
        Button "OK"
```

### Flat Access

Verschachtelte Slots direkt ansprechen:

```
Header as frame:
    Left as frame:
        Logo:
    Right as frame:
        Actions:

// Logo direkt ansprechen (ohne Left)
Header
    Logo "mirror-logo"
    Actions
        Button "Login"
```

### Child-Overrides Inline

Kind-Properties inline überschreiben:

```
NavItem as frame:
    Icon:
    Label:

// Inline mit Semikolon
NavItem Icon "home"; Label "Home"
NavItem Icon "settings"; Label "Settings"
NavItem Icon "user"; Label "Profile"
```

---

## 18. Verschachtelte Komponenten

Komponenten können andere Komponenten enthalten.

```
Dialog as frame:
    pad 24, bg surface, rad 8, shadow lg
    Header as frame:
        hor, spread
        Title:
        Button named closeBtn "×"
    Body as frame:
        pad 16
        Content:
    Footer as frame:
        hor, gap 8, right
        Actions:

Dialog
    Title "Bestätigung"
    Content
        Text "Bist du sicher?"
    Actions
        Button "Abbrechen"
        DangerButton "Löschen"
```

---

## 19. Animations

### Show/Hide Animations

```
Modal as frame:
    bg surface, rad 8
    show fade scale 200
    hide fade 150
```

- `fade` - Ein/Ausblenden
- `scale` - Skalieren
- `slide-up`, `slide-down` - Gleiten

### Kontinuierliche Animationen

```
Spinner as frame:
    size 24
    animate spin 1000

LoadingDot as frame:
    animate pulse 800
```

---

## 20. Vollständiges Beispiel: Todo-App

```
// === TOKENS ===

bg: color = #0a0a0f
surface: color = #1a1a23
elevated: color = #252530
primary: color = #3B82F6
primary-hover: color = #2563EB
danger: color = #EF4444
textColor: color = #E4E4E7
muted: color = #71717A

xs: size = 2
sm: size = 4
md: size = 8
lg: size = 16
xl: size = 24

body: font = "Inter"

// === BASIS-KOMPONENTEN ===

Text as text:
    col textColor

Icon as icon:
    size 20

Button as button:
    pad sm lg, bg primary, col white, rad sm, cursor pointer
    hover:
        bg primary-hover
    disabled:
        opacity 0.5, cursor default

IconButton as button:
    pad sm, bg transparent, col muted, rad sm
    hover:
        col textColor

Input as input:
    w full, pad sm md, bg surface, col textColor, rad sm, bor 1 transparent
    focus:
        bor 1 primary

Checkbox as frame:
    size 20, rad xs, bor 1 muted, cursor pointer
    checked:
        bg primary, bor 1 primary

// === ZUSAMMENGESETZTE KOMPONENTEN ===

TodoItem as frame:
    hor, ver-center, gap md, pad sm md, bg surface, rad sm
    hover:
        bg elevated

    Checkbox named checkbox
    Label as text:
        w full, col textColor
    IconButton named deleteBtn
        Icon "trash-2", size 16

Header as frame:
    ver, gap sm, pad-bottom lg

InputRow as frame:
    hor, gap sm, pad-bottom lg

TaskList as frame:
    ver, gap sm

// === APP ===

App as frame:
    pad xl, bg bg, min-h 100vh, font body

    Header
        Text font-size 24, "My Tasks"
        Text named subtitle, col muted
            "0 remaining"

    InputRow
        Input named newTask
            Placeholder "Add a task..."
        Button named addBtn "Add"

    TaskList
        each task in tasks
            TodoItem
                checkbox checked task.done
                Label task.title
                deleteBtn
                    onclick remove task
```

### JavaScript-Integration

```javascript
import ui from "./todo.mirror"

let tasks = []

ui.addBtn.onclick = () => {
    const text = ui.newTask.value.trim()
    if (!text) return

    tasks.push({ id: Date.now(), title: text, done: false })
    ui.newTask.value = ""
    render()
}

ui.newTask.onkeydown.enter = () => {
    ui.addBtn.click()
}

ui.TodoItem.checkbox.onchange = (item, index) => {
    tasks[index].done = item.checkbox.checked
    updateCount()
}

ui.TodoItem.deleteBtn.onclick = (item, index) => {
    tasks.splice(index, 1)
    render()
}

function render() {
    ui.tasks = tasks
    updateCount()
}

function updateCount() {
    const remaining = tasks.filter(t => !t.done).length
    ui.subtitle.text = `${remaining} remaining`
}

ui.render("#root")
```

---

## Quick Reference

```
PRIMITIVEN      frame, text, input, button, image, link, icon
                (klein geschrieben, eingebaut)

TOKENS          name: type = value
                primary: color = #3B82F6
                gruppiert: name: { sub: type = value }

KOMPONENTE      Name as primitive:
                Card as frame:
                    pad 16, bg surface

VERERBUNG       Child extends Parent:
                DangerButton extends Button:
                    bg danger

INSTANZ         Component properties
                Button "Click"

BENANNT         Component named name
                Button named saveBtn "Save"

IMPORT          import "dateiname"

PROPERTIES      pad, bg, col, rad, gap, w, h, hor, ver
                Kommas verpflichtend: pad 8, bg primary, rad 4

STATES          statename:
                    properties
                    ChildName property    // Child Override

EVENTS          onclick action
                onkeydown key: action
                keys { key action }       // Keys Block
                debounce N, delay N       // Timing

ACTIONS         toggle, select, highlight, show, hide
                call functionName         // JavaScript
                kein Target = wirkt auf sich selbst

DATA            data collection
                data collection where field == value

ITERATION       each item in items
                    Component item.prop

CONDITIONALS    if condition ... else ...
                prop condition ? value1 : value2

SLOTS           Definition: Name:
                Verwendung: Name "content"
                Flat Access: verschachtelte Slots direkt

CHILD-OVERRIDE  Component Child "x"; Child2 "y"

INLINE-TEXT     "*text*:bold"  "*text*:italic"  "*text*:token"

SECTIONS        --- Section Name ---
```

---

*Mirror v2 Tutorial - Stand März 2026*
