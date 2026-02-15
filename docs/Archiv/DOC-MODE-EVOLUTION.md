# Doc Mode Evolution - Diskussion & Plan

## Ziel

Mirror soll in der Lage sein, Dokumentationen wie `mirror-docu.html` vollständig in Mirror-Code abzubilden.

---

## Aktueller Stand

### Vorhandene Doc-Mode Komponenten

| Komponente | Funktion | Status |
|------------|----------|--------|
| `doc` | Container/Wrapper für Dokumentation | ✅ Vorhanden |
| `text` | Formatierter Text mit Token-Syntax | ✅ Vorhanden |
| `playground` | Code + Live Preview | ✅ Vorhanden |

### Vorhandene Tokens

**Block-Tokens** (Zeilenanfang):
```
$h1, $h2, $h3, $h4  → Überschriften
$p, $lead, $subtitle → Paragraphen
$li                  → Listen
$label              → Kleine Labels
$divider            → Trennlinie
```

**Inline-Tokens** (in Klammern):
```
$b[fett]  $i[kursiv]  $u[unterstrichen]  $code[code]
$link[Linktext](https://url.com)
```

---

## Problem: Playground-Isolation

Der aktuelle Playground ist **isoliert** - er parst seinen Code eigenständig:

```typescript
// playground.tsx, Zeile 168-174
const parseResult = useMemo(() => {
  try {
    return parse(normalizedCode)  // Isoliertes Parsing!
  } catch {
    return null
  }
}, [normalizedCode])
```

**Konsequenz:** Globale Tokens und Komponenten-Definitionen werden NICHT vererbt.

### Aktuelle Workarounds

**Option A:** Tokens im Playground selbst definieren
```mirror
playground
  '$primary: #2271c1

   Button: bg $primary pad 12 24 rad 8
   Button "Click me"'
```

**Option B:** Hardcodierte Werte (pragmatisch)
```mirror
playground
  'Button: bg #2271c1 pad 12 24 rad 8
   Button "Click me"'
```

---

## Geplante Lösung: Statischer Playground

### Kernidee

Den Playground zur **Build-Zeit** kompilieren statt zur Runtime:

1. Playground-Code wird mit globalem Kontext geparst
2. Tokens und Komponenten aus dem Dokument werden aufgelöst
3. Preview wird als statisches HTML/CSS generiert
4. Kein Runtime-Parsing mehr nötig

### Output-Unterscheidung

| Output | Interaktiv? |
|--------|-------------|
| Playground Preview | ❌ Nein, rein visuell |
| Exportierter React Code | ✅ Ja, voll funktional |

### Vorteile

- **Sauberer Mirror-Code** - keine doppelten Definitionen
- **Globaler Kontext** - Tokens/Komponenten werden automatisch aufgelöst
- **Performance** - kein Runtime-Parsing
- **Statischer Export** - HTML-Dokumentation ohne JS möglich

### Beispiel nach Umbau

```mirror
// Globale Definitionen
$primary: #2271c1
Button: bg $primary pad 12 24 rad 8

// Dokumentation
doc
  text
    '$h2 Buttons

     $p So erstellt man einen Button:'

  playground
    'Row gap 12
       Button "Save"
       Button "Cancel"'
```

Der Playground kennt automatisch `$primary` und `Button` aus dem globalen Scope.

---

## Fehlende Komponenten für mirror-docu.html

Analyse des HTML-Dokuments zeigt weitere benötigte Elemente:

| Element | Vorhanden? | Priorität |
|---------|------------|-----------|
| `exercise` Box (interaktive Übung) | ❌ | Hoch |
| `sidebar` Navigation | ❌ | Mittel |
| `comparison` Grid | ❌ | Niedrig |
| `collapsible` Details | ❌ | Niedrig |

---

## Nächste Schritte

1. **Playground-Umbau planen**
   - Parser erweitern für globalen Kontext
   - Generator für statisches HTML/CSS
   - Build-Zeit vs Runtime Entscheidung

2. **Fehlende Komponenten priorisieren**
   - Exercise-Box als erstes?
   - Oder erst Playground fertig?

3. **Prototyp testen**
   - Kleinen Ausschnitt in Mirror abbilden
   - Validieren dass alles funktioniert

---

## Referenz: Beispiel Mirror-Code

Minimaler Ausschnitt der Dokumentation:

```mirror
doc
  text
    '$h2 Quick Start

     $lead Let's build something in five minutes. No setup, just concepts.

     $h4 1. A Component

     $p Everything in Mirror is a component.'

  playground
    'Button "Hello World"'

  text
    '$p $code[Button] is the component name, $code["Hello World"] is its content.

     $h4 2. Add Styling

     $p Properties style a component.'

  playground
    'Button: bg #2271c1 pad 12 24 rad 8

     Row gap 12
       Button "Short form"
       Button "Long form"'

  text
    '$p $code[#2271c1] sets the background. $code[pad] adds spacing, $code[rad] rounds corners.'
```

---

## Offene Fragen

1. Wie wird der globale Kontext an den Playground übergeben?
2. Soll der Playground-Code editierbar bleiben (für Übungen)?
3. Wie handlen wir `exercise` Boxen mit editierbarem Code?
