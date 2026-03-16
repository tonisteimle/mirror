# Pattern Picker

Geführte Picker für gängige Interaktions-Patterns.

---

## Vision

```
User will Dropdown bauen.
Er weiß nicht genau wie.

┌─────────────────────────────────────────────────────────────────┐
│ Was möchtest du bauen?                                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │
│  │ Dropdown │  │   Tabs   │  │  Modal   │  │ Accordion│        │
│  │    ▼     │  │  ═══     │  │   □      │  │    ≡     │        │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘        │
│                                                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │
│  │ Toggle   │  │  Slider  │  │  Toast   │  │ Tooltip  │        │
│  │   ◉──    │  │  ●═══    │  │   ▢      │  │    ?     │        │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 1. Dropdown Pattern

### Schritt 1: Struktur

```
┌─────────────────────────────────────────────────────────────────┐
│ Dropdown erstellen                                    Schritt 1/4│
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  STRUKTUR                          DEIN CODE                    │
│  ────────                          ─────────                    │
│                                                                 │
│  Ein Dropdown braucht:             Dropdown state open          │
│                                      Button "Auswählen..."      │
│  ☑ Trigger (Button)                  Options state visible off  │
│    Text: [Auswählen..._____]           Option "Eins"            │
│                                        Option "Zwei"            │
│  ☑ Options-Liste                       Option "Drei"            │
│    └─ Optionen:                                                 │
│       [Eins_______________]                                     │
│       [Zwei_______________]                                     │
│       [Drei_______________]                                     │
│       [+ Option]                                                │
│                                                                 │
│                                                                 │
│  💡 "state open" definiert ob das Dropdown offen ist           │
│     "state visible off" versteckt die Liste initial             │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│ [Zurück]                           [Weiter: Trigger →]          │
└─────────────────────────────────────────────────────────────────┘
```

### Schritt 2: Trigger-Verhalten

```
┌─────────────────────────────────────────────────────────────────┐
│ Dropdown erstellen                                    Schritt 2/4│
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  TRIGGER                           DEIN CODE                    │
│  ───────                           ─────────                    │
│                                                                 │
│  Was passiert beim Klick           Button "Auswählen..."        │
│  auf den Button?                     onclick: toggle Options    │
│                                                                 │
│  ● Toggle (Auf/Zu)                                              │
│  ○ Nur öffnen                                                   │
│  ○ Custom...                                                    │
│                                                                 │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  VORSCHAU                                                       │
│  ────────                                                       │
│                                                                 │
│  ┌──────────────────┐                                           │
│  │ Auswählen...  ▼  │  ← Klick                                  │
│  └──────────────────┘                                           │
│  ┌──────────────────┐                                           │
│  │ Eins             │                                           │
│  │ Zwei             │                                           │
│  │ Drei             │                                           │
│  └──────────────────┘                                           │
│                                                                 │
│  💡 "onclick: toggle Options" schaltet die Liste ein/aus        │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│ [← Zurück]                         [Weiter: Optionen →]         │
└─────────────────────────────────────────────────────────────────┘
```

### Schritt 3: Options-Verhalten

```
┌─────────────────────────────────────────────────────────────────┐
│ Dropdown erstellen                                    Schritt 3/4│
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  OPTIONEN                          DEIN CODE                    │
│  ────────                          ─────────                    │
│                                                                 │
│  Was passiert beim Klick           Option "Eins"                │
│  auf eine Option?                    onclick                    │
│                                        select                   │
│  ☑ Option auswählen (select)           hide Options             │
│  ☑ Liste schließen                                              │
│  ☐ Event auslösen (onchange)                                    │
│                                                                 │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  SELECTED STYLING                                               │
│  ────────────────                                               │
│                                                                 │
│  Wie sieht eine ausgewählte                                     │
│  Option aus?                       Option                       │
│                                      hover                      │
│  ☑ Hintergrund [$primary-light]        bg $muted                │
│  ☑ Checkmark   [✓ links      ]       selected                   │
│  ☐ Fett                                bg $primary-light        │
│                                        "✓ " + content           │
│                                                                 │
│                                                                 │
│  💡 "select" markiert diese Option als ausgewählt               │
│     "hide Options" schließt die Liste                           │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│ [← Zurück]                         [Weiter: Extras →]           │
└─────────────────────────────────────────────────────────────────┘
```

### Schritt 4: Extras

```
┌─────────────────────────────────────────────────────────────────┐
│ Dropdown erstellen                                    Schritt 4/4│
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  EXTRAS                            DEIN CODE (komplett)         │
│  ──────                            ────────────────────         │
│                                                                 │
│  Zusätzliche Funktionen:           Dropdown state open          │
│                                      Button "Auswählen..."      │
│  ☑ Escape schließt                     onclick: toggle Options  │
│  ☑ Klick außerhalb schließt                                     │
│  ☐ Pfeil-Tasten Navigation           Options state visible off  │
│                                        onclickout: hide         │
│                                        onkeydown escape: hide   │
│  ANIMATION                                                      │
│  ─────────                             Option "Eins"            │
│                                          onclick                │
│  ☑ Animation beim Öffnen                   select               │
│    [fadeIn_______▼] [150ms]                hide Options         │
│                                          hover                  │
│                                            bg $muted            │
│                                          selected               │
│                                            bg $primary-light    │
│                                                                 │
│                                        // ... mehr Optionen     │
│                                                                 │
│  ─────────────────────────────────────────────────────────────  │
│                                    [📋 Code kopieren]           │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│ [← Zurück]                         [Fertig - Code einfügen]     │
└─────────────────────────────────────────────────────────────────┘
```

### Finaler generierter Code

```mirror
Dropdown state open
  Button "Auswählen..."
    onclick: toggle Options

  Options state visible off
    onclickout: hide
    onkeydown escape: hide
    animate fadeIn 150ms

    Option "Eins"
      onclick
        select
        hide Options
      hover
        bg $muted
      selected
        bg $primary-light

    Option "Zwei"
      // ... gleich

    Option "Drei"
      // ... gleich
```

---

## 2. Tabs Pattern

### Schritt 1: Struktur

```
┌─────────────────────────────────────────────────────────────────┐
│ Tab Navigation erstellen                              Schritt 1/3│
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  STRUKTUR                          DEIN CODE                    │
│  ────────                          ─────────                    │
│                                                                 │
│  Wie viele Tabs?                   Tabs                         │
│  [3_____]                            TabList hor                │
│                                        Tab "Übersicht"          │
│  Tab-Namen:                            Tab "Details"            │
│  1. [Übersicht_________]               Tab "Einstellungen"      │
│  2. [Details___________]             TabPanels                  │
│  3. [Einstellungen_____]               Panel "Übersicht"        │
│                                        Panel "Details"          │
│                                        Panel "Einstellungen"    │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  VORSCHAU                                                       │
│                                                                 │
│  ┌──────────┬──────────┬──────────────┐                         │
│  │Übersicht │ Details  │ Einstellungen│                         │
│  └──────────┴──────────┴──────────────┘                         │
│  ┌────────────────────────────────────┐                         │
│  │                                    │                         │
│  │         Panel-Inhalt               │                         │
│  │                                    │                         │
│  └────────────────────────────────────┘                         │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│ [Zurück]                           [Weiter: Verhalten →]        │
└─────────────────────────────────────────────────────────────────┘
```

### Schritt 2: Tab-Verhalten

```
┌─────────────────────────────────────────────────────────────────┐
│ Tab Navigation erstellen                              Schritt 2/3│
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  TAB-VERHALTEN                     DEIN CODE                    │
│  ─────────────                     ─────────                    │
│                                                                 │
│  Was passiert beim Tab-Klick?      Tab "Übersicht"              │
│                                      onclick                    │
│  Die Magie:                            activate                 │
│  ● "activate" macht 2 Dinge:           show Panel:Übersicht     │
│    1. Markiert Tab als aktiv                                    │
│    2. Zeigt zugehöriges Panel        active                     │
│       (gleichnamig)                    bg white                 │
│                                        bor-bottom 2 $primary   │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  ACTIVE STYLING                                                 │
│  ──────────────                                                 │
│                                                                 │
│  Wie sieht der aktive Tab aus?                                  │
│                                                                 │
│  ☑ Hintergrund   [white        ]                                │
│  ☑ Unterstrich   [2 $primary   ]                                │
│  ☐ Fett                                                         │
│  ☐ Andere Farbe                                                 │
│                                                                 │
│  INACTIVE STYLING                                               │
│                                                                 │
│  ☑ Hintergrund   [$muted       ]                                │
│  ☑ Hover         [bg $muted-dark]                               │
│                                                                 │
│                                                                 │
│  💡 "activate" ist die Schlüssel-Aktion für Tabs                │
│     Mirror weiß: Tab + Panel mit gleichem Namen gehören zusammen│
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│ [← Zurück]                         [Weiter: Panels →]           │
└─────────────────────────────────────────────────────────────────┘
```

### Schritt 3: Panel-Verhalten

```
┌─────────────────────────────────────────────────────────────────┐
│ Tab Navigation erstellen                              Schritt 3/3│
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  PANELS                            DEIN CODE (komplett)         │
│  ──────                            ────────────────────         │
│                                                                 │
│  Panel-Optionen:                   Tabs                         │
│                                      TabList hor gap 0          │
│  ☑ Animation beim Wechsel              Tab "Übersicht"          │
│    [fadeIn_______▼] [150ms]              onclick: activate      │
│                                          bg $muted              │
│  Initial sichtbar:                       hover: bg $muted-dark  │
│  [Übersicht________▼]                    active                 │
│                                            bg white             │
│  ─────────────────────────────────        bor-bottom 2 $primary│
│                                                                 │
│  VORSCHAU                              Tab "Details"            │
│                                          // gleich              │
│  ┌──────────┬──────────┬─────────┐                              │
│  │Übersicht │ Details  │ Einstell│     Tab "Einstellungen"      │
│  ├══════════┴──────────┴─────────┤       // gleich              │
│  │                               │                              │
│  │     Panel-Inhalt              │   TabPanels                  │
│  │     (animiert wechseln)       │     Panel "Übersicht"        │
│  │                               │       // dein Inhalt         │
│  └───────────────────────────────┘     Panel "Details" hide     │
│                                          // dein Inhalt         │
│  [▶ Tabs durchklicken]                 Panel "Einstellungen" hide│
│                                          // dein Inhalt         │
│                                                                 │
│                                    [📋 Code kopieren]           │
├─────────────────────────────────────────────────────────────────┤
│ [← Zurück]                         [Fertig - Code einfügen]     │
└─────────────────────────────────────────────────────────────────┘
```

### Finaler generierter Code

```mirror
Tabs
  TabList hor gap 0
    Tab "Übersicht"
      onclick: activate
      bg $muted
      hover
        bg $muted-dark
      active
        bg white
        bor-bottom 2 $primary

    Tab "Details"
      onclick: activate
      bg $muted
      hover
        bg $muted-dark
      active
        bg white
        bor-bottom 2 $primary

    Tab "Einstellungen"
      onclick: activate
      bg $muted
      hover
        bg $muted-dark
      active
        bg white
        bor-bottom 2 $primary

  TabPanels
    Panel "Übersicht"
      animate fadeIn 150ms
      // Dein Inhalt hier

    Panel "Details" hide
      animate fadeIn 150ms
      // Dein Inhalt hier

    Panel "Einstellungen" hide
      animate fadeIn 150ms
      // Dein Inhalt hier
```

---

## 3. Accordion Pattern

### Übersicht

```
┌─────────────────────────────────────────────────────────────────┐
│ Accordion erstellen                                   Schritt 1/2│
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  STRUKTUR                          DEIN CODE                    │
│  ────────                          ─────────                    │
│                                                                 │
│  Wie viele Sektionen?              Accordion                    │
│  [3_____]                            Section state expanded     │
│                                        Header "FAQ 1"           │
│  ● Nur eine offen (Single)               onclick: toggle        │
│  ○ Mehrere möglich (Multi)             Content hide             │
│                                          "Antwort 1..."         │
│  Sektionen:                                                     │
│  1. [FAQ 1_____________]             Section state expanded     │
│     [Antwort 1..._______]              Header "FAQ 2"           │
│  2. [FAQ 2_____________]                 onclick: toggle        │
│     [Antwort 2..._______]              Content hide             │
│  3. [FAQ 3_____________]                 "Antwort 2..."         │
│     [Antwort 3..._______]                                       │
│                                      // ...                     │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  💡 "state expanded" pro Section erlaubt individuelles Öffnen   │
│     "toggle" schaltet expanded um                               │
│     Content mit "hide" ist initial versteckt                    │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│ [Zurück]                           [Weiter: Styling →]          │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. Modal Pattern

```
┌─────────────────────────────────────────────────────────────────┐
│ Modal erstellen                                       Schritt 1/2│
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  AUFBAU                            DEIN CODE                    │
│  ──────                            ─────────                    │
│                                                                 │
│  Modal-Name:                       Modal "Bestätigung" hide     │
│  [Bestätigung__________]             Backdrop                   │
│                                        onclick: hide Modal      │
│  Komponenten:                        Dialog                     │
│  ☑ Backdrop (Hintergrund)              Header "Wirklich?"       │
│  ☑ Close-Button (X)                    Content "Bist du sicher?"│
│  ☑ Header                              Footer hor spread        │
│  ☑ Footer (Buttons)                      Button "Abbrechen"     │
│                                            onclick: hide Modal  │
│  Schließen durch:                        Button "OK"            │
│  ☑ Backdrop-Klick                          onclick              │
│  ☑ Escape-Taste                              confirm            │
│  ☑ Close-Button                              hide Modal         │
│                                                                 │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  TRIGGER                                                        │
│  ───────                                                        │
│                                                                 │
│  Welches Element öffnet das Modal?                              │
│  [DeleteButton__________▼]                                      │
│                                    DeleteButton                 │
│  → onclick: show Modal               onclick: show Modal        │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│ [Zurück]                           [Weiter: Animation →]        │
└─────────────────────────────────────────────────────────────────┘
```

---

## Lern-Elemente in Pattern Pickern

### 1. Kontext-Erklärungen

```
💡 "state expanded" pro Section erlaubt individuelles Öffnen
   ─────────────────
   │
   └─ Klick zeigt mehr Details

┌─────────────────────────────────────────────────────────────────┐
│ state expanded                                                  │
│                                                                 │
│ Definiert einen Toggle-State auf diesem Element.                │
│ Du kannst diesen State dann mit "toggle" umschalten.            │
│                                                                 │
│ Beispiel:                                                       │
│   Box state expanded                                            │
│     onclick: toggle                                             │
│     expanded                                                    │
│       h 200   // Groß wenn expanded                             │
│                                                                 │
│ [Verstanden]                                                    │
└─────────────────────────────────────────────────────────────────┘
```

### 2. Pattern-Anatomie

```
┌─────────────────────────────────────────────────────────────────┐
│ 📖 Anatomie: Dropdown                                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   Dropdown state open         ← Container mit State             │
│     │                                                           │
│     ├─ Button                 ← Trigger                         │
│     │    onclick: toggle Options  ← Öffnet/Schließt             │
│     │                                                           │
│     └─ Options hide           ← Liste, initial versteckt        │
│          │                                                      │
│          ├─ onclickout: hide  ← Schließt bei Klick außerhalb   │
│          │                                                      │
│          └─ Option            ← Einzelne Option                 │
│               onclick                                           │
│                 select        ← Markiert als gewählt            │
│                 hide Options  ← Schließt Liste                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 3. "Nächstes Mal"-Tipps

```
┌─────────────────────────────────────────────────────────────────┐
│ ✅ Dropdown erstellt!                                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ Nächstes Mal kannst du direkt tippen:                          │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Dropdown state open                                         │ │
│ │   Button "..."                                              │ │
│ │     onclick: toggle Options                                 │ │
│ │   Options hide                                              │ │
│ │     Option "..."                                            │ │
│ │       onclick: select, hide Options                         │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ Die wichtigsten Teile:                                          │
│ • state open → definiert den Dropdown-State                     │
│ • toggle Options → schaltet Liste ein/aus                       │
│ • select → markiert Option als gewählt                          │
│ • hide Options → schließt die Liste                             │
│                                                                 │
│ [OK, verstanden!]                                               │
└─────────────────────────────────────────────────────────────────┘
```

---

## Pattern-Bibliothek

```
┌─────────────────────────────────────────────────────────────────┐
│ 📚 Interaktions-Patterns                                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  NAVIGATION                        FEEDBACK                     │
│  ──────────                        ────────                     │
│  ┌──────────┐ ┌──────────┐         ┌──────────┐ ┌──────────┐   │
│  │   Tabs   │ │  Sidebar │         │   Toast  │ │  Tooltip │   │
│  │   ═══    │ │   ├──    │         │    □     │ │     ?    │   │
│  └──────────┘ └──────────┘         └──────────┘ └──────────┘   │
│                                                                 │
│  EINGABE                           OVERLAY                      │
│  ───────                           ───────                      │
│  ┌──────────┐ ┌──────────┐         ┌──────────┐ ┌──────────┐   │
│  │ Dropdown │ │ Checkbox │         │   Modal  │ │  Drawer  │   │
│  │    ▼     │ │    ☑     │         │    □     │ │    ├──   │   │
│  └──────────┘ └──────────┘         └──────────┘ └──────────┘   │
│                                                                 │
│  LAYOUT                            MEDIA                        │
│  ──────                            ─────                        │
│  ┌──────────┐ ┌──────────┐         ┌──────────┐ ┌──────────┐   │
│  │Accordion │ │ Carousel │         │ Lightbox │ │  Video   │   │
│  │    ≡     │ │   ◄ ►    │         │    🖼    │ │    ▶     │   │
│  └──────────┘ └──────────┘         └──────────┘ └──────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Implementierung

### Architektur

```
studio/pickers/patterns/
├── PatternPicker.ts           # Haupt-UI
├── patterns/
│   ├── dropdown.ts            # Dropdown-Pattern
│   ├── tabs.ts                # Tabs-Pattern
│   ├── accordion.ts           # Accordion-Pattern
│   ├── modal.ts               # Modal-Pattern
│   ├── toast.ts               # Toast-Pattern
│   └── tooltip.ts             # Tooltip-Pattern
├── components/
│   ├── PatternSelector.ts     # Pattern-Auswahl
│   ├── StepWizard.ts          # Schritt-für-Schritt UI
│   ├── CodePreview.ts         # Live Code-Anzeige
│   ├── PatternAnatomy.ts      # Erklärt Struktur
│   └── LearningTip.ts         # Lern-Hinweise
└── __tests__/
```

### Pattern-Definition

```typescript
interface Pattern {
  id: string
  name: string
  icon: string
  description: string

  // Schritte des Wizards
  steps: PatternStep[]

  // Code-Generator
  generate: (config: PatternConfig) => string

  // Lern-Material
  anatomy: AnatomyNode[]
  tips: string[]
}

interface PatternStep {
  title: string
  description: string
  fields: PatternField[]
  codePreview: (config: Partial<PatternConfig>) => string
  explanation: string
}
```

---

## Roadmap

### Phase 1: Core Patterns (2 Wochen)
- [ ] PatternPicker UI
- [ ] StepWizard Component
- [ ] Dropdown Pattern
- [ ] Tabs Pattern

### Phase 2: Mehr Patterns (1-2 Wochen)
- [ ] Accordion Pattern
- [ ] Modal Pattern
- [ ] Toast Pattern
- [ ] Tooltip Pattern

### Phase 3: Learning (1 Woche)
- [ ] Pattern-Anatomie Ansicht
- [ ] "Nächstes Mal"-Tipps
- [ ] Inline-Erklärungen

### Phase 4: Polish (1 Woche)
- [ ] Live-Vorschau
- [ ] Animation beim Durchklicken
- [ ] Code-Kopieren
- [ ] Integration in Property Panel
