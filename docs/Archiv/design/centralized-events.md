# Konzept: Zentralisierte Event-Handler

## Kernprinzip: Komponenten SIND der State

Inspiriert von Visual Basic - die einfachste Form von UI-State-Management:

```dsl
// Kein separater State-Block
// Kein Redux/Vuex
// Komponenten haben Properties, fertig.

Submit.label = "Done"
Email.value = ""
Panel.visible = true
```

---

## Syntax

### 1. Komponenten definieren (Templates)

```dsl
// Template mit Typ + Name
Input Email: placeholder "Email" w full
Input Password: placeholder "Password" type password w full

Button Submit: pad 12 bg #3B82F6
  Label: "Submit"

Dialog Confirm: w 400 pad 24 rad 12
  Title: "Bestätigen"
  Message: "Bist du sicher?"
  Actions: hor gap 8
    Button Cancel "Abbrechen"
    Button Ok -primary "OK"
```

### 2. Instanzen verwenden

```dsl
LoginForm: ver gap 16 pad 24
  Input Email
  Input Password
  Button Submit
```

### 3. Events zentral definieren

```dsl
events
  Submit onclick
    if Email.value and Password.value
      Submit.label = "Sending..."
      Submit.disabled = true
      // API call...
      Dialog Confirm.open
    else
      Error.visible = true
      Error.text = "Bitte alle Felder ausfüllen"

  Cancel onclick
    Dialog Confirm.close

  Ok onclick
    page Dashboard
```

---

## Property-Zugriff

### Lesen (in Bedingungen)

```dsl
if Email.value                    // truthy check
if Email.value == "test@test.com" // Vergleich
if Checkbox.checked               // boolean
if Panel.visible                  // boolean
```

### Schreiben (in Actions)

```dsl
Submit.label = "Done"
Submit.disabled = true
Panel.visible = false
Image.src = "new-image.jpg"
Counter.text = Counter.text + 1
```

---

## Intrinsische Properties

Jede Komponente hat automatisch bestimmte Properties:

### Alle Komponenten

| Property | Typ | Beschreibung |
|----------|-----|--------------|
| `.visible` | boolean | Sichtbarkeit |
| `.opacity` | number | Transparenz (0-1) |
| `.disabled` | boolean | Deaktiviert |
| `.bg` | color | Hintergrundfarbe |
| `.col` | color | Farbe |

### Input / Textarea

| Property | Typ | Beschreibung |
|----------|-----|--------------|
| `.value` | string | Aktueller Wert |
| `.placeholder` | string | Platzhalter |
| `.focus()` | method | Fokus setzen |
| `.blur()` | method | Fokus entfernen |
| `.clear()` | method | Wert leeren |

### Button

| Property | Typ | Beschreibung |
|----------|-----|--------------|
| `.label` | string | Button-Text |
| `.loading` | boolean | Lade-Zustand |

### Checkbox / Switch

| Property | Typ | Beschreibung |
|----------|-----|--------------|
| `.checked` | boolean | Aktiviert |

### Dialog / Overlay

| Property | Typ | Beschreibung |
|----------|-----|--------------|
| `.open` | boolean | Offen |
| `.open()` | method | Öffnen |
| `.close()` | method | Schliessen |

### Image

| Property | Typ | Beschreibung |
|----------|-----|--------------|
| `.src` | string | Bildquelle |
| `.alt` | string | Alt-Text |

### Text / Label

| Property | Typ | Beschreibung |
|----------|-----|--------------|
| `.text` | string | Textinhalt |

---

## Beispiel: Login-Formular

```dsl
// === KOMPONENTEN ===

Input Email: placeholder "Email" w full pad 12 bg #1E1E2E rad 8 bor 1 boc #333
Input Password: placeholder "Password" type password w full pad 12 bg #1E1E2E rad 8 bor 1 boc #333

Button Submit: w full pad 12 bg #3B82F6 rad 8 hor-cen
  Label: "Login"
  Spinner: icon "loader" spin visible false

Text Error: col #EF4444 size 14 visible false

Dialog Confirm: w 400 pad 24 bg #1E1E2E rad 12
  Title: size 18 weight 600 "Erfolgreich"
  Message: "Du wirst weitergeleitet..."


// === LAYOUT ===

LoginPage: full cen bg #0A0A0F
  Card: ver w 400 pad 32 gap 16 bg #1E1E2E rad 16
    Logo: Image "logo.svg" 120 40 hor-cen
    Title: size 24 weight 600 hor-cen "Login"

    Input Email
    Input Password
    Text Error
    Button Submit


// === EVENTS ===

events
  Email onchange
    Error.visible = false

  Password onchange
    Error.visible = false

  Password onkeydown "Enter"
    Submit.click

  Submit onclick
    if not Email.value
      Error.text = "Email ist erforderlich"
      Error.visible = true
      Email.focus
    else if not Password.value
      Error.text = "Passwort ist erforderlich"
      Error.visible = true
      Password.focus
    else
      // Loading state
      Submit.Label.text = ""
      Submit.Spinner.visible = true
      Submit.disabled = true

      // Success (nach API call)
      Dialog Confirm.open

      // Nach 2s weiterleiten
      wait 2000
      page Dashboard
```

---

## Vergleich: Vorher vs. Nachher

### Vorher (Inline, mit separaten Variablen)

```dsl
LoginForm: ver gap 16
  email = ""
  password = ""
  error = ""
  loading = false

  Input "Email"
    onchange assign email to $event.value
  Input "Password"
    onchange assign password to $event.value
  Text col #EF4444
    if $error
      $error
  Button
    onclick if not $email
      assign error to "Email required"
    onclick if $email and $password
      assign loading to true
      page Dashboard
    if $loading
      icon "loader" spin
    else
      "Login"
```

### Nachher (Zentral, Komponenten als State)

```dsl
Input Email: placeholder "Email"
Input Password: placeholder "Password"
Text Error: col #EF4444 visible false
Button Submit: "Login"

LoginForm: ver gap 16
  Input Email
  Input Password
  Text Error
  Button Submit

events
  Submit onclick
    if not Email.value
      Error.text = "Email required"
      Error.visible = true
    else if Email.value and Password.value
      Submit.label = "Loading..."
      page Dashboard
```

**Vorteile:**
- Klare Trennung: Struktur vs. Verhalten
- Kein Variable-Mapping (`email` ↔ Input)
- Direkte Referenzen: `Email.value` statt `$email`
- Lesbar wie Prosa: "Wenn Submit geklickt..."

---

## Offene Fragen

1. **Dot-Notation für verschachtelte Komponenten?**
   ```dsl
   Submit.Label.text = "Done"      // Kind-Komponente
   Dialog.Actions.Cancel.click     // Tief verschachtelt
   ```

2. **Methoden-Syntax?**
   ```dsl
   Email.focus          // ohne ()
   Email.focus()        // mit ()
   Dialog Confirm.open  // Leerzeichen?
   DialogConfirm.open   // Zusammen?
   ```

3. **Animation bei Property-Änderung?**
   ```dsl
   Panel.visible = true fade 300
   Submit.bg = #10B981 ease 200
   ```

---

## Implementierungs-Phasen

### Phase 1: Basis
- [ ] Instanz-Namen parsen (`Input Email`)
- [ ] Property-Zugriff parsen (`Email.value`)
- [ ] Property-Setzen parsen (`Email.value = "x"`)
- [ ] `events` Block parsen

### Phase 2: Intrinsische Properties
- [ ] `.visible`, `.disabled` für alle
- [ ] `.value` für Input/Textarea
- [ ] `.checked` für Checkbox/Switch
- [ ] `.open`/`.close` für Dialog

### Phase 3: Erweitert
- [ ] Methoden (`.focus()`, `.clear()`)
- [ ] Verschachtelte Properties (`Submit.Label.text`)
- [ ] Globale Events (`global onkeydown`)
- [ ] Animationen bei Änderung

---

## Zusammenfassung

> **Komponenten SIND der State.**
>
> Kein separates State-Management.
> Kein Mapping zwischen Variablen und UI.
> Direkte Referenzen wie in Visual Basic.
>
> `Email.value` statt `$formData.email`
> `Submit.disabled = true` statt `assign isSubmitDisabled to true`
