# Mirror v2 Tutorial

> Lerne Mirror von Grund auf. Jedes Konzept baut auf dem vorherigen auf.

---

## Das Konzept

**Mirror = UI. JavaScript = Logik.**

| Mirror | JavaScript |
|--------|------------|
| *Was* die UI ist | *Wie* sie sich verhält |
| Deklarativ | Imperativ |
| Struktur, Styling, Layout | State, Logik, API Calls |

### Eine Datei, zwei Sprachen

Ein Mirror-File enthält beides – UI und Logik. Keine `<script>` Tags nötig.
Der Parser erkennt JavaScript automatisch:

```
// === UI (Mirror) ===

primary: #3B82F6
surface: #1a1a23

Text as text:
    col #E4E4E7

Counter as frame:
    pad 16, gap 8, center, bg surface

    Text count

    Row hor, gap 8
        Button bg primary, pad 8 16, rad 4, "-"
            onclick decrement
        Button bg primary, pad 8 16, rad 4, "+"
            onclick increment

Counter


// === Logik (JavaScript) ===

let count = 0

function increment() {
    count++
    update()
}

function decrement() {
    count--
    update()
}
```

JavaScript beginnt, sobald der Parser `let`, `const`, `var`, `function` oder `class` erkennt.

### Strings vs. Referenzen

**Eine einfache Regel:** Text in Anführungszeichen ist ein String. Alles andere ist eine Referenz.

```
Text "Hello"        // String → zeigt "Hello"
Text count          // Referenz → zeigt den Wert von count
Text user.name      // Referenz → zeigt user.name aus JavaScript
```

### Tokens vs. Variablen

Tokens sind in Mirror definierte Werte. Variablen sind in JavaScript definiert.
Der Compiler unterscheidet automatisch:

```
// Mirror: Token definieren
primary: #3B82F6

// Mirror: Token verwenden
Button bg primary       // primary ist bekannt → Token

// JavaScript: Variable definieren
let count = 0

// Mirror: Variable verwenden
Text count              // count ist nicht als Token bekannt → JS Variable
```

Kein spezielles Prefix nötig. Der Compiler weiß, was was ist.

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

Mirror ersetzt das komplexe CSS-Layout durch ein einfaches, konsistentes System.

### Die Philosophie

In CSS brauchst du für ein zentriertes Element:
```css
display: flex;
justify-content: center;
align-items: center;
```

In Mirror:
```
center
```

**Ein Wort statt drei Zeilen.** Das ist Mirror.

### Richtung

Kinder werden standardmäßig vertikal gestapelt (`ver`). Für horizontal: `hor`.

```
Column as frame:
    ver, gap 8

Row as frame:
    hor, gap 8
```

| Mirror | CSS |
|--------|-----|
| `ver` | `display: flex; flex-direction: column` |
| `hor` | `display: flex; flex-direction: row` |
| `gap 8` | `gap: 8px` |

### Ausrichtung

```
Box as frame:
    hor, center           // Beides zentriert

Box as frame:
    hor, left, top        // Links oben

Box as frame:
    hor, right, bottom    // Rechts unten

Box as frame:
    hor, spread           // Verteilt (space-between)
```

| Mirror | Beschreibung |
|--------|--------------|
| `center` | Beide Achsen zentriert |
| `left` | Links ausrichten |
| `right` | Rechts ausrichten |
| `top` | Oben ausrichten |
| `bottom` | Unten ausrichten |
| `hor-center` | Nur horizontal zentriert |
| `ver-center` | Nur vertikal zentriert |
| `spread` | Kinder gleichmäßig verteilen |

### Größen: hug vs. full

Das Herzstück des Systems. Zwei Konzepte:

- **hug** = So groß wie der Inhalt (fit-content)
- **full** = So groß wie möglich (100% + grow)

```
// Breite passt sich dem Inhalt an
Button as button:
    width hug

// Breite füllt verfügbaren Platz
Input as input:
    width full

// Kombiniert
Row as frame:
    hor, gap 8
    Input width full      // Nimmt allen Platz
    Button width hug      // Nur so breit wie nötig
```

| Mirror | CSS |
|--------|-----|
| `width hug` | `width: fit-content` |
| `width full` | `width: 100%; flex-grow: 1` |
| `height hug` | `height: fit-content` |
| `height full` | `height: 100%; flex-grow: 1` |
| `width 200` | `width: 200px` |
| `size 100 50` | `width: 100px; height: 50px` |

### Wrap

Erlaubt Umbruch bei zu wenig Platz:

```
Tags as frame:
    hor, wrap, gap 4

Tags
    Tag "Design"
    Tag "Code"
    Tag "Mirror"
    Tag "Layout"
```

### Stacked (Übereinander)

Kinder übereinander stapeln (für Overlays, Badges, etc.):

```
Avatar as frame:
    stacked, size 48

    Image "user.jpg"
    Badge as frame:
        size 12, rad 6, bg green
        right, bottom        // Positioniert rechts unten
```

### Grid

Für Spalten-Layouts:

```
Gallery as frame:
    grid 3, gap 16           // 3 gleiche Spalten

Products as frame:
    grid auto 250, gap 16    // Responsive, min 250px pro Item

Sidebar as frame:
    grid 30% 70%             // Sidebar 30%, Content 70%
```

| Mirror | Beschreibung |
|--------|--------------|
| `grid 3` | 3 gleiche Spalten |
| `grid auto 250` | Responsive, min 250px |
| `grid 30% 70%` | Prozentuale Breiten |

### Komplettes Beispiel

```
Header as frame:
    hor, spread, ver-center, pad 16, bg surface

    Logo as frame:
        hor, gap 8, ver-center
        Icon "mirror"
        Text "Mirror"

    Nav as frame:
        hor, gap 24
        Link "Docs"
        Link "Examples"
        Link "GitHub"

    Actions as frame:
        hor, gap 8
        Button width hug, "Login"
```

**Das ist Layout in Mirror.** Intuitiv, konsistent, ohne CSS-Chaos.

---

## 5. Tokens (Design-Variablen)

Wiederverwendbare Design-Werte für Farben, Größen, Fonts.

```
primary: #3B82F6
danger: #EF4444
surface: #1a1a23

sm: 4
md: 8
lg: 16
```

Struktur: `name: wert`

Verwendung – einfach den Namen:

```
primary: #3B82F6
sm: 4

Box pad sm, bg primary
    Text "Styled"
```

Der Compiler erkennt `primary` und `sm` als Tokens (weil sie definiert sind).

### Token-Gruppierung

Zusammengehörige Tokens gruppieren:

```
dropdown:
    bg: #1A1A23
    border: #333
    item-hover: #444
    item-selected: #2271c1
```

Verwendung mit Punkt-Notation:

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
primary: #3B82F6
text: #E4E4E7
sm: 4
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

### Initial State

Komponenten können einen Anfangszustand haben:

```
Dropdown as frame:
    closed                    // Startet geschlossen

Accordion as frame:
    expanded                  // Startet ausgeklappt

Panel as frame:
    collapsed                 // Startet eingeklappt
```

Unterstützte Initial States:
- `closed` / `open` - Für Dropdowns, Modals
- `collapsed` / `expanded` - Für Accordions, Panels

### State-basierte Sichtbarkeit

Kind-Elemente können basierend auf dem Eltern-State ein-/ausgeblendet werden:

```
Dropdown as frame:
    closed

    Trigger as frame:
        onclick toggle

    Menu as frame:
        if (open)              // Nur sichtbar wenn open
        pad 8
        - Item "Option 1"
        - Item "Option 2"
```

`if (state)` ohne Kinder macht das Element nur sichtbar, wenn der Eltern-State passt.

Komplexe Bedingungen:

```
Menu as frame:
    if (open && hasItems)     // Nur wenn open UND hasItems
```

### Selection Binding

Container können eine Variable für die Auswahl binden:

```
Dropdown as frame:
    closed

    Menu as frame:
        if (open)
        selection $selected    // Auswahl in $selected speichern

        - Item "Option 1"
            onclick select
        - Item "Option 2"
            onclick select
```

Bei `onclick select` wird der ausgewählte Wert in `$selected` gespeichert.

### Komplettes Dropdown-Pattern

Alle Features zusammen:

```
$selected: "Auswählen..."

Item as frame:
    pad 8 12, cursor pointer
    onhover highlight
    onclick select
    highlighted:
        bg #333

Dropdown as frame:
    closed
    onclick-outside close

    Trigger as frame:
        pad 8, cursor pointer
        onclick toggle
        Label $selected

    Menu as frame:
        if (open)
        selection $selected
        focusable
        keys
            escape close
            arrow-down highlight next
            arrow-up highlight prev
            enter select, close

        - Item "Option 1"
        - Item "Option 2"
        - Item "Option 3"
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

### Click Outside Event

Aktion ausführen, wenn außerhalb des Elements geklickt wird. Perfekt für Dropdowns und Modals:

```
Dropdown as frame:
    onclick-outside close
```

Bei Klick außerhalb des Dropdowns wird es geschlossen.

Kombiniert mit anderen Events:

```
Modal as frame:
    onclick-outside close
    onkeydown escape: close
```

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

## 12. JavaScript-Integration

Das Runtime API – wie JavaScript auf Mirror zugreift.

### Named Instances als Objekte

Jede `named` Instanz ist automatisch als JavaScript-Objekt verfügbar:

```
Button named saveBtn "Speichern"
Input named searchField
Menu named userMenu
```

```javascript
// Sofort verwendbar – keine Query nötig
saveBtn.onclick = () => save()
searchField.value = ""
userMenu.visible = false
```

### Properties lesen und schreiben

```javascript
// Lesen
const text = myInput.value
const isVisible = menu.visible

// Schreiben
saveBtn.text = "Gespeichert"
avatar.src = user.imageUrl
errorMsg.visible = false
```

### Verfügbare Properties

| Property | Lesen | Schreiben | Beschreibung |
|----------|-------|-----------|--------------|
| `.text` | ✓ | ✓ | Textinhalt |
| `.value` | ✓ | ✓ | Input/Textarea Wert |
| `.visible` | ✓ | ✓ | Sichtbarkeit (boolean) |
| `.disabled` | ✓ | ✓ | Deaktiviert (boolean) |
| `.state` | ✓ | ✓ | Aktueller Behavior-State |
| `.style` | ✓ | ✓ | Inline-Styles (Objekt) |
| `.data` | ✓ | ✓ | Gebundene Daten |
| `.el` | ✓ | - | Natives DOM-Element |

### States ändern

```javascript
// State setzen
item.state = "selected"
toggle.state = "on"
panel.state = "expanded"

// State abfragen
if (item.state === "selected") { ... }

// State togglen
item.toggleState("selected")
```

### Events binden

```javascript
// Direkte Zuweisung
saveBtn.onclick = () => save()
searchField.oninput = (e) => filter(e.value)
form.onsubmit = handleSubmit

// Keyboard Events
input.onkeydown.enter = () => submit()
input.onkeydown.escape = () => clear()

// Mehrere Handler
saveBtn.on("click", handler1)
saveBtn.on("click", handler2)
```

### Collections (Each-Loops)

```
each task in tasks
    TodoItem named taskList
```

```javascript
// Daten ändern
tasks.push({ title: "Neu", done: false })

// UI aktualisieren
update()
```

### Die `update()` Funktion

Nach Datenänderungen die UI synchronisieren:

```javascript
update()              // Alles aktualisieren
update(taskList)      // Nur eine Collection
update(conditional)   // Nur ein Conditional
```

### Kompaktes Beispiel

```
// UI
Container
    Input named search "Suchen..."
    List named results
        each item in filteredItems
            Item item.name
    Text named status

// Logic
let items = []
let filteredItems = []

search.oninput = () => {
    const query = search.value.toLowerCase()
    filteredItems = items.filter(i =>
        i.name.toLowerCase().includes(query)
    )
    status.text = `${filteredItems.length} Ergebnisse`
    update()
}

fetch('/api/items')
    .then(r => r.json())
    .then(data => {
        items = data
        filteredItems = data
        update()
    })
```

**Das Prinzip:** Mirror-Elemente verhalten sich wie intelligente JavaScript-Objekte. Keine spezielle Syntax, keine Query-Selektoren, keine Wrapper-Funktionen. Direkt zugreifen und ändern.

---

## 13. Listen

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

## 14. Daten und Iteration

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
    data tasks where done === false

    Card
        Text task.title
```

### Kombiniert

```
TaskList as frame:
    data tasks where done === false

    TodoItem
        Text task.title
        Text col muted, task.date
        Icon task.done ? "check" : "circle"
```

---

## 15. Conditionals

Conditionals nutzen **JavaScript-Syntax** für Ausdrücke.

### Block-Conditional

```
if (loggedIn)
    Avatar
    Text username
else
    Button "Login"
```

Mit komplexeren Bedingungen:

```
if (user.isAdmin && hasPermission)
    AdminPanel

if (items.length > 0)
    ItemList
else
    Text "Keine Einträge"
```

### JavaScript-Operatoren

In Bedingungen verwenden:
- `===`, `!==` - Strikte Gleichheit
- `&&`, `||` - Logisches UND/ODER
- `!` - Negation
- `>`, `<`, `>=`, `<=` - Vergleiche

### Inline-Conditional (Ternary)

```
Icon done ? "check" : "circle"
bg active ? primary : surface
```

Für Anfänger ist `if then else` lesbarer:

```
Icon if (done) then "check" else "circle"
```

---

## 16. Inline-Formatierung

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

## 17. Section Headers

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

## 18. Slots

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

## 19. Verschachtelte Komponenten

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

## 20. Animations

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

## 21. Vollständiges Beispiel: Todo-App

Eine komplette App in einer Datei – UI und Logik zusammen:

```
// ============================================================================
// TOKENS
// ============================================================================

bg: #0a0a0f
surface: #1a1a23
elevated: #252530
primary: #3B82F6
primary-hover: #2563EB
danger: #EF4444
textColor: #E4E4E7
muted: #71717A

xs: 2
sm: 4
md: 8
lg: 16
xl: 24


// ============================================================================
// KOMPONENTEN
// ============================================================================

Text as text:
    col textColor

Button as button:
    pad sm lg, bg primary, col white, rad sm, cursor pointer
    hover:
        bg primary-hover

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

TodoItem as frame:
    hor, ver-center, gap md, pad sm md, bg surface, rad sm
    hover:
        bg elevated

    Checkbox named checkbox
    Label as text:
        w full
    IconButton named deleteBtn
        Icon "trash-2"


// ============================================================================
// APP
// ============================================================================

App as frame:
    pad xl, bg bg, min-h 100vh

    Text font-size 24, "My Tasks"
    Text col muted, remainingText

    Row hor, gap sm, pad-top lg, pad-bottom lg
        Input named newTask
            Placeholder "Add a task..."
        Button named addBtn "Add"

    Column ver, gap sm
        each task in tasks
            TodoItem
                checkbox checked task.done
                    onchange toggleTask
                Label task.title
                deleteBtn
                    onclick removeTask

App


// ============================================================================
// LOGIK (JavaScript)
// ============================================================================

let tasks = []

function addTask() {
    const text = newTask.value.trim()
    if (!text) return

    tasks.push({
        id: Date.now(),
        title: text,
        done: false
    })
    newTask.value = ""
    update()
}

function toggleTask(task) {
    task.done = !task.done
    update()
}

function removeTask(task) {
    tasks = tasks.filter(t => t.id !== task.id)
    update()
}

function update() {
    const remaining = tasks.filter(t => !t.done).length
    remainingText = `${remaining} remaining`
}

// Event Bindings
addBtn.onclick = addTask
newTask.onkeydown.enter = addTask
```

**Das ist alles.** Eine Datei. UI oben, Logik unten. Der Parser erkennt wo JavaScript beginnt.

---

## Quick Reference

```
KONZEPT         Mirror = UI (deklarativ)
                JavaScript = Logik (imperativ)
                Eine Datei, Parser erkennt JS automatisch

STRINGS         "Hello" = String literal
                count = Referenz (Token oder JS Variable)

TOKENS          name: value
                primary: #3B82F6
                sm: 4
                gruppiert: name: { sub: value }

PRIMITIVEN      frame, text, input, button, image, link, icon

KOMPONENTE      Name as primitive:
                Card as frame:
                    pad 16, bg surface

VERERBUNG       Child extends Parent:
                DangerButton extends Button:
                    bg danger

INSTANZ         Component properties "content"
                Button bg primary, "Click"

BENANNT         Component named name
                Button named saveBtn "Save"

IMPORT          import "dateiname"

LAYOUT          hor, ver                    // Richtung
                center, spread              // Verteilung
                left, right, top, bottom    // Ausrichtung
                hor-center, ver-center      // Einzelne Achse
                wrap, stacked               // Spezial
                grid 3, grid auto 250       // Spalten

SIZING          width/height hug            // = Inhalt
                width/height full           // = 100% + grow
                width/height N              // = Npx
                size W H                    // Breite + Höhe

SPACING         pad N, pad V H, pad T R B L
                gap N
                margin N

STYLING         bg, col, rad, bor, shadow, opacity

STATES          statename:
                    properties
                    ChildName property    // Child Override

INITIAL STATE   closed, open              // Dropdown-States
                collapsed, expanded       // Accordion-States

VISIBILITY      if (open)                 // Sichtbar wenn Eltern open
                if (open && hasItems)     // Komplexe Bedingung

SELECTION       selection $variable       // Auswahl-Binding

EVENTS          onclick functionName
                onkeydown key: functionName
                onclick-outside close     // Klick außerhalb
                keys { key action }

ACTIONS         toggle, select, highlight, show, hide, close
                call functionName

ITERATION       each item in items
                    Component item.prop

CONDITIONALS    if (condition) ... else ...
                prop condition ? value1 : value2

SLOTS           Definition: Name:
                Verwendung: Name "content"

JAVASCRIPT      let, const, var, function, class
                automatisch erkannt am Dateianfang

JS-API          // Named Instances als Objekte
                saveBtn.text = "Gespeichert"
                input.value, menu.visible, item.state

                // Events
                btn.onclick = () => { ... }
                input.onkeydown.enter = submit

                // State
                item.state = "selected"
                item.toggleState("selected")

                // Update
                update()              // Alles
                update(collection)    // Nur Collection
```

---

*Mirror v2 Tutorial - Stand März 2026*
