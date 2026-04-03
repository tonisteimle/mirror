# System Prompt Testfälle

Diese Testfälle prüfen, ob Claude mit dem Mirror DSL System Prompt korrekte Ausgaben generiert.

## Testformat

Jeder Test hat:
- **Prompt**: Die Eingabe an Claude
- **Muss enthalten**: Patterns die im Output sein MÜSSEN
- **Darf NICHT enthalten**: Patterns die NICHT im Output sein dürfen
- **Prüft**: Welches Konzept getestet wird

---

## 1. Grundsyntax

### Test 1.1: Einfacher Button
**Prompt:** "Erstelle einen blauen Button mit Text 'Speichern'"

**Muss enthalten:**
- `Button "Speichern"`
- `bg #` (irgendeine Farbe)
- Komma nach dem String: `"Speichern",`

**Darf NICHT enthalten:**
- `"Speichern" bg` (fehlendes Komma)
- `px` oder `em` (keine Einheiten)

**Prüft:** Grundsyntax, Komma nach String

---

### Test 1.2: Frame mit Kindern
**Prompt:** "Erstelle eine Card mit Titel und Beschreibung"

**Muss enthalten:**
- `Frame` (nicht Box!)
- Einrückung mit 2 Leerzeichen
- `Text "` für Titel und Beschreibung

**Darf NICHT enthalten:**
- `Box`
- `Div`
- `<div>` oder HTML-Tags

**Prüft:** Frame statt Box, Hierarchie

---

## 2. Komponenten

### Test 2.1: Komponenten-Definition
**Prompt:** "Definiere eine wiederverwendbare PrimaryBtn Komponente"

**Muss enthalten:**
- `PrimaryBtn:` (mit Doppelpunkt)
- `= Button` (mit Gleichzeichen)

**Darf NICHT enthalten:**
- `PrimaryBtn Button` (ohne = )
- `PrimaryBtn:Button` (ohne Leerzeichen)

**Prüft:** Komponenten-Definition mit `:` und `=`

---

### Test 2.2: Komponenten-Verwendung
**Prompt:** "Verwende die PrimaryBtn Komponente dreimal mit verschiedenen Texten"

**Muss enthalten:**
- `PrimaryBtn "` (ohne Doppelpunkt bei Verwendung)

**Darf NICHT enthalten:**
- `PrimaryBtn: "` (Doppelpunkt bei Instanz)
- `PrimaryBtn:` gefolgt von Text

**Prüft:** Verwendung OHNE Doppelpunkt

---

### Test 2.3: Komponente mit Slots
**Prompt:** "Definiere eine Card Komponente mit Header und Body Slots"

**Muss enthalten:**
- `Card:` (Definition mit :)
- `Header:` (Slot-Definition mit :)
- `Body:` (Slot-Definition mit :)

**Prüft:** Slot-Definition

---

### Test 2.4: Slot-Verwendung
**Prompt:** "Verwende die Card Komponente und fülle Header und Body"

**Muss enthalten:**
- `Card` (ohne :)
- `Header "` oder `Header` gefolgt von Einrückung (ohne :)
- `Body "` oder `Body` gefolgt von Einrückung (ohne :)

**Darf NICHT enthalten:**
- `Header:` bei Verwendung
- `Body:` bei Verwendung

**Prüft:** Slot-Verwendung OHNE Doppelpunkt

---

## 3. Tokens

### Test 3.1: Token-Definition
**Prompt:** "Definiere Tokens für primary Farbe und card Hintergrund"

**Muss enthalten:**
- `$primary.bg:` (mit Suffix .bg)
- `$card.bg:` (mit Suffix)
- `#` (Hex-Wert)

**Darf NICHT enthalten:**
- `$primary:` (ohne Suffix)
- `$card:` (ohne Suffix)

**Prüft:** Token MIT Suffix definieren

---

### Test 3.2: Token-Verwendung
**Prompt:** "Verwende den $primary Token für einen Button Hintergrund"

**Muss enthalten:**
- `bg $primary` (ohne Suffix)

**Darf NICHT enthalten:**
- `bg $primary.bg` (Suffix bei Verwendung)

**Prüft:** Token OHNE Suffix verwenden

---

## 4. States

### Test 4.1: Hover State
**Prompt:** "Erstelle einen Button der bei Hover die Farbe ändert"

**Muss enthalten:**
- `hover:` (mit Doppelpunkt)
- `bg #` unter hover (eingerückt)

**Darf NICHT enthalten:**
- `hover` ohne Doppelpunkt
- `onhover:` für Style-Änderung

**Prüft:** State-Definition mit Doppelpunkt

---

### Test 4.2: Custom State mit Toggle
**Prompt:** "Erstelle einen Button der zwischen normal und aktiv wechselt bei Klick"

**Muss enthalten:**
- `on:` oder `active:` (Custom State mit :)
- `onclick: toggle()` (mit Klammern!)

**Darf NICHT enthalten:**
- `onclick: toggle` (ohne Klammern)
- `onclick toggle()` (ohne Doppelpunkt)

**Prüft:** onclick mit toggle() und Klammern

---

### Test 4.3: Exclusive State (Tabs)
**Prompt:** "Erstelle drei Tab-Buttons wo nur einer aktiv sein kann"

**Muss enthalten:**
- `active:` oder `on:` (State-Definition)
- `onclick: exclusive()` (mit Klammern)

**Darf NICHT enthalten:**
- `onclick: exclusive` (ohne Klammern)

**Prüft:** exclusive() Funktion

---

### Test 4.4: State-Referenz
**Prompt:** "Erstelle einen MenuBtn und ein Panel das nur sichtbar ist wenn MenuBtn im open State ist"

**Muss enthalten:**
- `name MenuBtn` oder `name` Property
- `MenuBtn.open:` (Referenz-Syntax)
- `visible` unter der Referenz

**Prüft:** State-Referenzen

---

## 5. Icons

### Test 5.1: Icon Syntax
**Prompt:** "Erstelle ein grünes Check-Icon mit Größe 24"

**Muss enthalten:**
- `Icon "check"` (Name in Anführungszeichen)
- `ic #` oder `ic green` (Farbe)
- `is 24` (Größe)

**Darf NICHT enthalten:**
- `Icon check` (ohne Anführungszeichen)
- `is #` (Größe mit Farbe verwechselt)
- `ic 24` (Farbe mit Größe verwechselt)

**Prüft:** Icon-Syntax, ic vs is

---

## 6. Zag-Komponenten

### Test 6.1: Dialog
**Prompt:** "Erstelle einen Dialog mit Trigger-Button und Content"

**Muss enthalten:**
- `Dialog`
- `Trigger:` (mit Doppelpunkt!)
- `Content:` (mit Doppelpunkt!)

**Darf NICHT enthalten:**
- `Trigger Button` (ohne Doppelpunkt)
- `Content Frame` (ohne Doppelpunkt)

**Prüft:** Zag-Slots mit Doppelpunkt

---

### Test 6.2: Tabs
**Prompt:** "Erstelle Tabs mit Home und Settings"

**Muss enthalten:**
- `Tabs`
- `Tab "Home", value "` (Komma nach Label!)
- `Tab "Settings", value "`
- `defaultValue`

**Darf NICHT enthalten:**
- `Tab "Home" value` (fehlendes Komma)

**Prüft:** Tab-Syntax mit Komma

---

### Test 6.3: Tooltip
**Prompt:** "Erstelle einen Button mit Tooltip"

**Muss enthalten:**
- `Tooltip`
- `Trigger:` (mit :)
- `Content:` (mit :)

**Prüft:** Tooltip-Struktur

---

## 7. Layout

### Test 7.1: Horizontal Layout
**Prompt:** "Erstelle drei Buttons nebeneinander"

**Muss enthalten:**
- `Frame hor` oder `hor` Property
- `gap` (Abstand)

**Prüft:** Horizontales Layout

---

### Test 7.2: Zentrieren
**Prompt:** "Erstelle einen Frame mit zentriertem Text"

**Muss enthalten:**
- `center` (für Container)

**Darf NICHT enthalten:**
- `Text "...", center` (center ist Container-Property)

**Prüft:** center als Container-Property

---

## 8. Kombinierte Tests

### Test 8.1: Komplette Card-Komponente
**Prompt:** "Definiere eine Card Komponente mit Header, Body und Footer Slots, verwende Tokens für Farben"

**Muss enthalten:**
- `$` Token-Definitionen mit Suffix
- `Card:` Definition
- `Header:`, `Body:`, `Footer:` Slot-Definitionen
- Token-Verwendung ohne Suffix

**Prüft:** Kombiniertes Wissen

---

### Test 8.2: Interaktive Komponente
**Prompt:** "Erstelle eine ToggleBtn Komponente die zwischen off und on wechselt mit verschiedenen Farben"

**Muss enthalten:**
- `ToggleBtn:` Definition
- `= Button` (Primitive-Erweiterung)
- `off:` und `on:` States
- `onclick: toggle()`
- Verschiedene `bg` Werte in States

**Prüft:** Komponente + States + Events

---

## Auswertung

Für jeden Test:
- ✅ **Pass**: Alle "Muss enthalten" vorhanden UND keine "Darf NICHT enthalten"
- ⚠️ **Partial**: Einige Kriterien erfüllt
- ❌ **Fail**: Kritische Fehler (Box statt Frame, fehlende Kommas, etc.)

## Kritische Fehler (automatisch Fail)

Diese Fehler führen immer zu einem Fail:
1. `Box` statt `Frame`
2. Fehlende Kommas nach Strings
3. Einheiten wie `px` oder `em`
4. `onclick: toggle` ohne Klammern
5. Token mit Suffix bei Verwendung (`bg $primary.bg`)
6. Token ohne Suffix bei Definition (`$primary: #hex`)
7. Komponenten-Verwendung mit Doppelpunkt (`Btn: "Text"`)
