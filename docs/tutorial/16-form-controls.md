---
title: Form Controls
subtitle: Checkbox, Switch, RadioGroup, Slider und mehr
prev: 14-pages
next: 17-selection
---

Interaktive Formular-Komponenten mit vollständiger Tastatursteuerung und Accessibility. Alle Komponenten folgen dem Slot-Pattern: Du definierst Slots wie `Root:`, `Control:`, `Label:` um das Aussehen anzupassen.

## Checkbox

Eine Checkbox mit Label und optionalem Indeterminate-State.

```mirror
Checkbox
  Root: hor, gap 10, cursor pointer
  Control: w 20, h 20, bor 2, boc #444, rad 4
  Label: col white, fs 14
  "Newsletter abonnieren"
```

### Mit Custom Icon

```mirror
Checkbox checked, icon "check"
  Root: hor, gap 10, cursor pointer
  Control: w 20, h 20, bor 2, boc #444, rad 4
    checked:
      bg #2563eb
      boc #2563eb
  Label: col white, fs 14
  "Ich akzeptiere die AGB"
```

### Props

| Prop | Typ | Beschreibung |
|------|-----|--------------|
| `checked` | boolean | Aktiviert |
| `defaultChecked` | boolean | Initial aktiviert |
| `disabled` | boolean | Deaktiviert |
| `indeterminate` | boolean | Teilweise ausgewählt |
| `name` | string | Formular-Name |
| `value` | string | Wert |
| `icon` | string | Custom Icon (default: "check") |

### Slots

| Slot | Beschreibung |
|------|--------------|
| `Root:` | Container (label) |
| `Control:` | Die Checkbox selbst |
| `Label:` | Label-Text |
| `Indicator:` | Das Häkchen-Icon |

---

## Switch

Ein Toggle-Switch für An/Aus-Zustände.

```mirror
Switch
  Root: hor, gap 12
  Track: w 44, h 24, bg #333, rad 99, pad 2
    checked:
      bg #2563eb
  Thumb: w 20, h 20, bg white, rad 99
  Label: col white, fs 14
  "Dark Mode"
```

### Props

| Prop | Typ | Beschreibung |
|------|-----|--------------|
| `checked` | boolean | Aktiviert |
| `defaultChecked` | boolean | Initial aktiviert |
| `disabled` | boolean | Deaktiviert |
| `name` | string | Formular-Name |
| `label` | string | Aria-Label |

### Slots

| Slot | Beschreibung |
|------|--------------|
| `Track:` | Die Schiene |
| `Thumb:` | Der bewegliche Knopf |
| `Label:` | Label-Text |

---

## RadioGroup

Eine Gruppe von Radio-Buttons – nur einer kann ausgewählt sein.

```mirror
RadioGroup value "monthly"
  Root: gap 10
  Item: hor, gap 10, cursor pointer
  ItemControl: w 20, h 20, bor 2, boc #444, rad 99
    checked:
      boc #2563eb
  ItemText: col white, fs 14

  RadioItem "Monatlich – €9/Monat", value "monthly"
  RadioItem "Jährlich – €99/Jahr", value "yearly"
  RadioItem "Lifetime – €299", value "lifetime"
```

### Mit Indicator

```mirror
RadioGroup defaultValue "a"
  Root: gap 8
  Item: hor, gap 10, pad 12, bg #1a1a1a, rad 8, cursor pointer
    checked:
      bg #1e3a5f
      bor 1
      boc #2563eb
  ItemControl: w 18, h 18, bor 2, boc #444, rad 99
  Indicator: w 10, h 10, bg #2563eb, rad 99

  RadioItem "Option A", value "a"
  RadioItem "Option B", value "b"
  RadioItem "Option C", value "c"
```

### Props

| Prop | Typ | Beschreibung |
|------|-----|--------------|
| `value` | string | Ausgewählter Wert |
| `defaultValue` | string | Initial ausgewählt |
| `disabled` | boolean | Alle deaktiviert |
| `orientation` | "horizontal" \| "vertical" | Ausrichtung |
| `name` | string | Formular-Name |

### Slots

| Slot | Beschreibung |
|------|--------------|
| `Root:` | Container |
| `Item:` | Einzelner Radio-Button |
| `ItemControl:` | Der Kreis |
| `ItemText:` | Label des Items |
| `Indicator:` | Der innere Punkt |
| `Label:` | Gruppen-Label |

---

## Slider

Ein Schieberegler für numerische Werte.

```mirror
Slider value 50, min 0, max 100
  Root: gap 8, w 200
  Label: hor, spread
    Text "Lautstärke", col white, fs 13
    ValueText: col #888, fs 12
  Track: h 6, bg #333, rad 99
  Range: bg #2563eb, rad 99
  Thumb: w 18, h 18, bg white, rad 99, shadow md
```

### Mit Markern

```mirror
Slider defaultValue 50, min 0, max 100, step 25
  Root: gap 12, w 240
  Track: h 6, bg #333, rad 99
  Range: bg #2563eb, rad 99
  Thumb: w 18, h 18, bg white, rad 99
  MarkerGroup: margin 8 0 0 0
    Marker: col #666, fs 10
```

### Props

| Prop | Typ | Beschreibung |
|------|-----|--------------|
| `value` | number | Aktueller Wert |
| `defaultValue` | number | Startwert |
| `min` | number | Minimum |
| `max` | number | Maximum |
| `step` | number | Schrittweite |
| `disabled` | boolean | Deaktiviert |
| `orientation` | "horizontal" \| "vertical" | Ausrichtung |
| `origin` | "start" \| "center" | Ursprung der Range |

### Slots

| Slot | Beschreibung |
|------|--------------|
| `Root:` | Container |
| `Track:` | Die Schiene |
| `Range:` | Der gefüllte Bereich |
| `Thumb:` | Der Griff |
| `Label:` | Label |
| `ValueText:` | Wert-Anzeige |
| `MarkerGroup:` | Container für Marker |
| `Marker:` | Einzelner Marker |

---

## RangeSlider

Slider mit zwei Griffen für einen Bereich.

```mirror
RangeSlider defaultValue [20, 80], min 0, max 100
  Root: gap 8, w 240
  Label: hor, spread
    Text "Preisbereich", col white, fs 13
    ValueText: col #888, fs 12
  Track: h 6, bg #333, rad 99
  Range: bg #2563eb, rad 99
  Thumb: w 18, h 18, bg white, rad 99
```

Props und Slots wie Slider, aber `value` ist ein Array `[min, max]`.

---

## NumberInput

Eingabefeld für Zahlen mit +/- Buttons.

```mirror
NumberInput defaultValue 5, min 0, max 10
  Root: hor, gap 0, bg #1a1a1a, rad 8, bor 1, boc #333
  DecrementTrigger: pad 12, col white, cursor pointer
    hover:
      bg #333
    Icon "minus", is 16
  Input: w 60, bg transparent, col white, text-align center, bor 0
  IncrementTrigger: pad 12, col white, cursor pointer
    hover:
      bg #333
    Icon "plus", is 16
```

### Props

| Prop | Typ | Beschreibung |
|------|-----|--------------|
| `value` | number | Aktueller Wert |
| `defaultValue` | number | Startwert |
| `min` | number | Minimum |
| `max` | number | Maximum |
| `step` | number | Schrittweite |
| `disabled` | boolean | Deaktiviert |
| `allowMouseWheel` | boolean | Scrollen erlaubt |
| `clampValueOnBlur` | boolean | Wert begrenzen bei Blur |

### Slots

| Slot | Beschreibung |
|------|--------------|
| `Root:` | Container |
| `Label:` | Label |
| `Control:` | Input-Container |
| `Input:` | Das Eingabefeld |
| `IncrementTrigger:` | Plus-Button |
| `DecrementTrigger:` | Minus-Button |

---

## PinInput

Eingabe für PINs und Verifizierungscodes.

```mirror
PinInput length 6, otp
  Root: gap 8
  Control: hor, gap 8
  Input: w 48, h 56, bg #1a1a1a, bor 1, boc #333, rad 8, col white, fs 24, text-align center
    focus:
      boc #2563eb
```

### Props

| Prop | Typ | Beschreibung |
|------|-----|--------------|
| `length` | number | Anzahl der Felder |
| `otp` | boolean | One-Time-Password Modus |
| `mask` | boolean | Eingabe maskieren |
| `type` | "alphanumeric" \| "numeric" | Erlaubte Zeichen |
| `placeholder` | string | Platzhalter |
| `disabled` | boolean | Deaktiviert |

### Slots

| Slot | Beschreibung |
|------|--------------|
| `Root:` | Container |
| `Label:` | Label |
| `Control:` | Input-Container |
| `Input:` | Einzelnes Eingabefeld |

---

## PasswordInput

Passwort-Eingabe mit Sichtbarkeits-Toggle.

```mirror
PasswordInput
  Root: gap 4
  Label: col #888, fs 12
    "Passwort"
  Control: hor, bg #1a1a1a, bor 1, boc #333, rad 8
  Input: w full, bg transparent, col white, pad 12, bor 0
  VisibilityTrigger: pad 12, col #666, cursor pointer
    hover:
      col white
    Icon "eye", is 18
    visible:
      Icon "eye-off", is 18
```

### Props

| Prop | Typ | Beschreibung |
|------|-----|--------------|
| `visible` | boolean | Passwort sichtbar |
| `defaultVisible` | boolean | Initial sichtbar |
| `disabled` | boolean | Deaktiviert |

### Slots

| Slot | Beschreibung |
|------|--------------|
| `Root:` | Container |
| `Label:` | Label |
| `Control:` | Input-Container |
| `Input:` | Das Eingabefeld |
| `VisibilityTrigger:` | Auge-Button |

---

## TagsInput

Eingabe für mehrere Tags/Chips.

```mirror
TagsInput defaultValue ["React", "Vue"]
  Root: gap 4
  Label: col #888, fs 12
    "Skills"
  Control: hor, wrap, gap 8, bg #1a1a1a, bor 1, boc #333, rad 8, pad 8
  Tag: hor, gap 4, bg #333, pad 4 8, rad 4
  TagText: col white, fs 13
  TagDeleteTrigger: col #888, cursor pointer
    hover:
      col #ef4444
    Icon "x", is 14
  Input: bg transparent, col white, bor 0, w 100
```

### Props

| Prop | Typ | Beschreibung |
|------|-----|--------------|
| `value` | string[] | Tags |
| `defaultValue` | string[] | Initiale Tags |
| `maxTags` | number | Maximum |
| `allowDuplicate` | boolean | Duplikate erlaubt |
| `addOnPaste` | boolean | Bei Paste hinzufügen |
| `addOnBlur` | boolean | Bei Blur hinzufügen |
| `disabled` | boolean | Deaktiviert |

### Slots

| Slot | Beschreibung |
|------|--------------|
| `Root:` | Container |
| `Label:` | Label |
| `Control:` | Tags + Input Container |
| `Tag:` | Einzelner Tag |
| `TagText:` | Tag-Text |
| `TagDeleteTrigger:` | Löschen-Button |
| `Input:` | Eingabefeld |
| `ClearTrigger:` | Alle löschen |

---

## Editable

Inline-editierbarer Text – Klick zum Bearbeiten.

```mirror
Editable defaultValue "Klick zum Bearbeiten"
  Root: gap 8
  Area: pad 8, rad 4
    hover:
      bg #252525
  Preview: col white, fs 14, cursor pointer
  Input: col white, fs 14, bg transparent, bor 0, w full
  Control: hor, gap 4, margin 4 0 0 0
  SubmitTrigger: pad 6, bg #2563eb, col white, rad 4, fs 12
    "Speichern"
  CancelTrigger: pad 6, bg #333, col white, rad 4, fs 12
    "Abbrechen"
```

### Props

| Prop | Typ | Beschreibung |
|------|-----|--------------|
| `value` | string | Aktueller Wert |
| `defaultValue` | string | Startwert |
| `placeholder` | string | Platzhalter |
| `submitMode` | "blur" \| "enter" \| "both" | Wann speichern |
| `selectOnFocus` | boolean | Text markieren |
| `disabled` | boolean | Deaktiviert |

### Slots

| Slot | Beschreibung |
|------|--------------|
| `Root:` | Container |
| `Area:` | Klickbarer Bereich |
| `Preview:` | Anzeigetext |
| `Input:` | Eingabefeld |
| `Control:` | Button-Container |
| `EditTrigger:` | Bearbeiten-Button |
| `SubmitTrigger:` | Speichern-Button |
| `CancelTrigger:` | Abbrechen-Button |

---

## RatingGroup

Sterne-Bewertung.

```mirror
RatingGroup defaultValue 3, count 5
  Root: gap 8
  Label: col #888, fs 12
    "Bewertung"
  Control: hor, gap 4
  Item: cursor pointer
    Icon "star", ic #333, is 24
    highlighted:
      Icon "star", ic #f59e0b, is 24
    checked:
      Icon "star", ic #f59e0b, is 24, fill
```

### Mit halben Sternen

```mirror
RatingGroup defaultValue 3.5, count 5, allowHalf
  Control: hor
  Item: cursor pointer
    Icon "star", ic #333, is 28
    half:
      Icon "star-half", ic #f59e0b, is 28
    checked:
      Icon "star", ic #f59e0b, is 28, fill
```

### Props

| Prop | Typ | Beschreibung |
|------|-----|--------------|
| `value` | number | Aktuelle Bewertung |
| `defaultValue` | number | Startwert |
| `count` | number | Anzahl Sterne |
| `allowHalf` | boolean | Halbe Sterne erlaubt |
| `disabled` | boolean | Deaktiviert |
| `readOnly` | boolean | Nur Anzeige |

### Slots

| Slot | Beschreibung |
|------|--------------|
| `Root:` | Container |
| `Label:` | Label |
| `Control:` | Sterne-Container |
| `Item:` | Einzelner Stern |

---

## SegmentedControl

Button-Gruppe zur Auswahl – wie iOS Segmented Control.

```mirror
SegmentedControl defaultValue "list"
  Root: hor, bg #1a1a1a, pad 4, rad 8, gap 4
  Indicator: bg #333, rad 6
  Item: pad 8 16, rad 6, col #888, cursor pointer, z 1
    checked:
      col white

  Segment "Liste", value "list"
  Segment "Grid", value "grid"
  Segment "Tabelle", value "table"
```

### Props

| Prop | Typ | Beschreibung |
|------|-----|--------------|
| `value` | string | Ausgewählter Wert |
| `defaultValue` | string | Startwert |
| `disabled` | boolean | Deaktiviert |
| `orientation` | "horizontal" \| "vertical" | Ausrichtung |

### Slots

| Slot | Beschreibung |
|------|--------------|
| `Root:` | Container |
| `Item:` | Einzelnes Segment |
| `ItemText:` | Text im Segment |
| `Indicator:` | Hintergrund des aktiven Segments |

---

## ToggleGroup

Gruppe von Toggle-Buttons – mehrere können aktiv sein.

```mirror
ToggleGroup multiple
  Root: hor, gap 4
  Item: pad 10, bg #1a1a1a, rad 6, col #888, cursor pointer
    checked:
      bg #2563eb
      col white

  Toggle value "bold"
    Icon "bold", is 18
  Toggle value "italic"
    Icon "italic", is 18
  Toggle value "underline"
    Icon "underline", is 18
```

### Props

| Prop | Typ | Beschreibung |
|------|-----|--------------|
| `value` | string \| string[] | Ausgewählte Werte |
| `defaultValue` | string \| string[] | Startwerte |
| `multiple` | boolean | Mehrfachauswahl |
| `disabled` | boolean | Deaktiviert |
| `loopFocus` | boolean | Tastatur-Loop |

### Slots

| Slot | Beschreibung |
|------|--------------|
| `Root:` | Container |
| `Item:` | Einzelner Toggle |

---

## AngleSlider

Kreisförmiger Winkel-Regler.

```mirror
AngleSlider defaultValue 45
  Root: w 120, h 120
  Control: w full, h full, bg #1a1a1a, rad 99, bor 2, boc #333
  Thumb: w 16, h 16, bg #2563eb, rad 99
  ValueText: col white, fs 14
```

### Props

| Prop | Typ | Beschreibung |
|------|-----|--------------|
| `value` | number | Winkel (0-360) |
| `defaultValue` | number | Startwert |
| `step` | number | Schrittweite |
| `disabled` | boolean | Deaktiviert |

### Slots

| Slot | Beschreibung |
|------|--------------|
| `Root:` | Container |
| `Control:` | Der Kreis |
| `Thumb:` | Der Griff |
| `ValueText:` | Winkel-Anzeige |

---

## Form

Formular mit automatischer Datenbindung an eine Collection.

```mirror
Form $users
  Field name
  Field email
  Field role, display "select"

  Actions:
    Button "Speichern", save()
    Button "Abbrechen", revert()
```

### Mit Custom Fields

```mirror
Form $tasks
  Field title, label "Titel", placeholder "Task eingeben..."
  Field description, label "Beschreibung", multiline
  Field priority, label "Priorität", display "slider", max 5
  Field done, label "Erledigt", display "switch"

  Actions:
    Button "Erstellen", bg #2563eb, col white, pad 12, rad 6, save()
```

### Props

| Prop | Typ | Beschreibung |
|------|-----|--------------|
| `collection` | $collection | Gebundene Collection |
| `auto` | boolean | Auto-Generierung |
| `validateOnBlur` | boolean | Bei Blur validieren |
| `validateOnChange` | boolean | Bei Änderung validieren |
| `disabled` | boolean | Alle Felder deaktiviert |

### Field Props

| Prop | Typ | Beschreibung |
|------|-----|--------------|
| `name` | string | Feldname |
| `label` | string | Anzeige-Label |
| `placeholder` | string | Platzhalter |
| `multiline` | boolean | Textarea statt Input |
| `display` | string | "input" \| "select" \| "checkbox" \| "switch" \| "slider" |
| `required` | boolean | Pflichtfeld |
| `disabled` | boolean | Deaktiviert |

### Slots

| Slot | Beschreibung |
|------|--------------|
| `Field:` | Einzelnes Feld |
| `Actions:` | Button-Container |

---

## Zusammenfassung

| Komponente | Verwendung |
|------------|-----------|
| `Checkbox` | Einzelne Ja/Nein-Auswahl |
| `Switch` | An/Aus-Toggle |
| `RadioGroup` | Eine aus mehreren Optionen |
| `Slider` | Numerischer Bereich |
| `RangeSlider` | Bereich mit Min/Max |
| `NumberInput` | Zahl mit +/- Buttons |
| `PinInput` | PIN/OTP Codes |
| `PasswordInput` | Passwort mit Sichtbarkeit |
| `TagsInput` | Mehrere Tags/Chips |
| `Editable` | Inline-Bearbeitung |
| `RatingGroup` | Sterne-Bewertung |
| `SegmentedControl` | Button-Gruppe (exklusiv) |
| `ToggleGroup` | Button-Gruppe (mehrfach) |
| `AngleSlider` | Winkel-Auswahl |
| `Form` | Collection-gebundenes Formular |

**Gemeinsame Props:** `disabled`, `readOnly`, `required`, `invalid`, `name`, `value`, `defaultValue`

**Gemeinsame States:** `checked:`, `disabled:`, `focus:`, `invalid:`, `hover:`
