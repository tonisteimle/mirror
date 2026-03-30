# State Machines

## Konzept

**States** beschreiben wie ein Element aussieht. **Events** rufen Funktionen auf.

- States = deklarativ (Aussehen)
- Events = Funktionsaufrufe (eingebaute oder eigene)
- Element wird automatisch übergeben (wie VB/Delphi)
- **Base zählt als State** – nur definieren was anders sein soll

## System-States

Das System weiß automatisch, wann diese States aktiv sind:

```
Btn: pad 12 24, rad 6, bg #333, col white
  hover:
    bg #2563eb
    scale 1.02
  focus:
    boc #2563eb
  active:
    scale 0.98
```

Kein Trigger nötig – das System kümmert sich darum.

## Custom States

States werden mit Namen und Doppelpunkt definiert:

```
Btn: pad 12 24, rad 6, bg #333, col white
  on:
    bg #2563eb
```

Base ist der Normalzustand. Nur States definieren die anders aussehen sollen.

### Instanz mit State starten

```
Btn "Normal"          // startet in Base
Btn "Aktiv", on       // startet in "on"
```

## Events rufen Funktionen auf

```
Btn: pad 12 24, rad 6, bg #333, col white
  on:
    bg #2563eb
  onclick: toggle()
```

**Alle Events sind Funktionsaufrufe** – mit Klammern.

## Eingebaute Funktionen

### toggle()

Wechselt zwischen Base und dem definierten State:

```
Btn: pad 12 24, bg #333, col white
  on:
    bg #2563eb
  onclick: toggle()
```

Base ↔ on. Kein extra "off" State nötig – Base ist off.

### cycle()

Durchläuft mehrere States in Definitionsreihenfolge:

```
StatusBtn: pad 12 24, col white
  todo:
    bg #333
    Icon "circle"
  doing:
    bg #f59e0b
    Icon "clock"
  done:
    bg #10b981
    Icon "check"
  onclick: cycle()
```

Reihenfolge: todo → doing → done → todo → ...

**Erster definierter State = Initial.**

```
StatusBtn "Task"           // startet in "todo"
StatusBtn "Task", doing    // startet in "doing"
```

### Explizite Reihenfolge

Parameter nur wenn nötig (andere Reihenfolge, andere States, anderer Start):

```
onclick: cycle(done, doing, todo)    // umgekehrte Reihenfolge
onclick: toggle(on, off)             // explizit beide States
```

### exclusive()

Nur einer in einer Gruppe kann aktiv sein:

```
Tab: pad 12 20, bg #333, col #888
  active:
    bg #2563eb
    col white
  onclick: exclusive()

Frame hor, gap 4
  Tab "Home"
  Tab "Projekte", active
  Tab "Settings"
```

Geschwister des gleichen Komponententyps bilden automatisch eine Gruppe.

## Eigene Funktionen

Für komplexe Logik schreibst du eigene JavaScript-Funktionen:

```
Button name saveBtn, pad 12 24, bg #2563eb, col white
  loading:
    bg #666
    "Wird gespeichert..."
  success:
    bg #10b981
    "Gespeichert!"
  onclick: save()
```

```javascript
async function save(element) {
  element.state = 'loading'
  await fetch('/api/save')
  element.state = 'success'
  setTimeout(() => element.state = 'base', 2000)
}
```

**Mirror übergibt automatisch das Element** als ersten Parameter.

### Eingebaute + eigene Logik kombinieren

Die eingebauten Funktionen sind auch **Methoden auf dem Element**:

```
Btn:
  on:
    bg #2563eb
  onclick: handleClick()
```

```javascript
function handleClick(element) {
  element.toggle()        // eingebautes Toggle
  analytics.track()       // eigene Logik
  sidebar.state = 'open'  // andere Elemente
}
```

**Regel:** Simpel → `onclick: toggle()`. Komplex → eigene Funktion, darin `element.toggle()`.

### Verfügbare Methoden

```javascript
element.toggle()      // Base ↔ State
element.cycle()       // Nächster State
element.state = 'x'   // State direkt setzen
element.state         // Aktuellen State lesen
```

### Andere Elemente steuern

```javascript
function openMenu(element) {
  menuBtn.state = 'open'
  sidebar.state = 'expanded'
  backdrop.state = 'visible'
}
```

## State-Referenzen

Ein Element kann auf den State eines anderen reagieren:

```
Button name MenuBtn, pad 10 20, bg #333, col white
  open:
    bg #2563eb
  onclick: toggle()

Frame bg #1a1a1a, pad 12, rad 8, hidden
  MenuBtn.open:
    visible
  Text "Menü-Inhalt"
```

`MenuBtn.open:` bedeutet: "Wenn MenuBtn in `open` ist, wende diese Styles an."

## States als Varianten

Jeder State kann eine komplett andere Struktur haben:

```
Panel: bg #1a1a1a, rad 8, clip
  closed:
    Frame hor, spread, pad 16
      Text "Mehr"
      Icon "chevron-down"
  open:
    Frame hor, spread, pad 16
      Text "Weniger"
      Icon "chevron-up"
    Frame pad 16
      Text "Versteckter Inhalt"
  onclick: cycle()
```

## Zusammenfassung

| Syntax | Bedeutung |
|--------|-----------|
| `on:` | Custom State definieren |
| `hover:` | System-State (kein Trigger nötig) |
| `Btn "Text", on` | Instanz im State starten |
| `onclick: toggle()` | Base ↔ erster State |
| `onclick: cycle()` | States in Definitionsreihenfolge |
| `onclick: exclusive()` | Nur einer in Gruppe aktiv |
| `onclick: save()` | Eigene Funktion |
| `element.toggle()` | In JS: eingebautes Toggle |
| `element.state = 'x'` | In JS: State setzen |
| `MenuBtn.open:` | Auf State reagieren |

## Prinzipien

1. **So wenig States wie nötig** – Base zählt mit
2. **Definitionsreihenfolge = Ausführungsreihenfolge**
3. **Erster State = Initial**
4. **Simpel → eingebaute Funktion, Komplex → eigene Funktion**
