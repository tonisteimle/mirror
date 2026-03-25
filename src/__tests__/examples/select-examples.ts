/**
 * Select Component Examples
 *
 * Diese Beispiele werden vom Test-Generator verwendet,
 * um eine visuelle Test-Seite zu generieren.
 */

export interface Example {
  code: string
  description?: string
}

export interface Section {
  name: string
  examples: Example[]
}

export const SELECT_EXAMPLES: Section[] = [
  {
    name: 'BASIC PROPERTIES',
    examples: [
      {
        code: `Select placeholder "Farbe wählen...":
  Item "Rot"
  Item "Grün"
  Item "Blau"`,
        description: 'placeholder'
      },
      {
        code: `Select value "Grün":
  Item "Rot"
  Item "Grün"
  Item "Blau"`,
        description: 'value'
      },
      {
        code: `Select value "DE":
  Item "Deutschland" value "DE"
  Item "Österreich" value "AT"
  Item "Schweiz" value "CH"`,
        description: 'value mit separatem Item-Value'
      },
      {
        code: `Select label "Land", placeholder "Bitte wählen...":
  Item "Deutschland"
  Item "Schweiz"`,
        description: 'label'
      },
      {
        code: `Select defaultValue "B":
  Item "A"
  Item "B"
  Item "C"`,
        description: 'defaultValue'
      },
    ]
  },
  {
    name: 'MULTIPLE SELECTION',
    examples: [
      {
        code: `Select multiple, placeholder "Farben wählen...":
  Item "Rot"
  Item "Grün"
  Item "Blau"
  Item "Gelb"`,
        description: 'multiple'
      },
      {
        code: `Select multiple, defaultValue "JS":
  Item "JS"
  Item "TS"
  Item "React"`,
        description: 'multiple mit defaultValue'
      },
    ]
  },
  {
    name: 'SEARCHABLE',
    examples: [
      {
        code: `Select searchable, placeholder "Land suchen...":
  Item "Afghanistan"
  Item "Albanien"
  Item "Algerien"
  Item "Andorra"
  Item "Angola"`,
        description: 'searchable'
      },
      {
        code: `Select searchable, multiple, placeholder "Teammitglieder suchen...":
  Item "Anna Schmidt"
  Item "Max Müller"
  Item "Lisa Weber"
  Item "Tom Fischer"`,
        description: 'searchable + multiple'
      },
    ]
  },
  {
    name: 'CLEARABLE',
    examples: [
      {
        code: `Select clearable, placeholder "Optional...":
  Item "Option A"
  Item "Option B"
  Item "Option C"`,
        description: 'clearable'
      },
      {
        code: `Select clearable, value "Option A":
  Item "Option A"
  Item "Option B"`,
        description: 'clearable mit value'
      },
    ]
  },
  {
    name: 'KEEPOPEN',
    examples: [
      {
        code: `Select keepOpen, placeholder "Mehrere anklicken...":
  Item "Eins"
  Item "Zwei"
  Item "Drei"`,
        description: 'keepOpen'
      },
    ]
  },
  {
    name: 'DISABLED & READONLY',
    examples: [
      {
        code: `Select disabled, placeholder "Nicht verfügbar":
  Item "A"
  Item "B"`,
        description: 'disabled'
      },
      {
        code: `Select readonly, value "Festgelegt":
  Item "Festgelegt"
  Item "Andere Option"`,
        description: 'readonly'
      },
      {
        code: `Select placeholder "Plan wählen...":
  Item "Free"
  Item "Pro" disabled
  Item "Enterprise" disabled`,
        description: 'Item disabled'
      },
    ]
  },
  {
    name: 'FORM INTEGRATION',
    examples: [
      {
        code: `Select required, label "Land *", name "country", placeholder "Pflichtfeld":
  Item "Deutschland"
  Item "Schweiz"`,
        description: 'required'
      },
      {
        code: `Select invalid, placeholder "Bitte auswählen":
  Item "Option A"
  Item "Option B"`,
        description: 'invalid'
      },
      {
        code: `Select name "country", placeholder "Land wählen...":
  Item "Deutschland" value "DE"
  Item "Schweiz" value "CH"`,
        description: 'name'
      },
      {
        code: `Select name "category", form "settings-form", placeholder "Kategorie":
  Item "Allgemein"
  Item "Erweitert"`,
        description: 'form'
      },
    ]
  },
  {
    name: 'POSITIONING',
    examples: [
      {
        code: `Select placement "top-start", placeholder "Öffnet nach oben":
  Item "Option A"
  Item "Option B"`,
        description: 'placement'
      },
      {
        code: `Select offset 12, placeholder "12px Abstand":
  Item "A"
  Item "B"`,
        description: 'offset'
      },
    ]
  },
  {
    name: 'KOMBINATIONEN',
    examples: [
      {
        code: `Select searchable, clearable, placeholder "Suche...":
  Item "React"
  Item "Vue"
  Item "Angular"
  Item "Svelte"`,
        description: 'searchable + clearable'
      },
      {
        code: `Select multiple, searchable, clearable, placeholder "Alles kombiniert":
  Item "Design"
  Item "Code"
  Item "Test"
  Item "Deploy"`,
        description: 'multiple + searchable + clearable'
      },
      {
        code: `Select placeholder "Land wählen":
  Item "Deutschland"
  Item "Österreich"
  Item "Schweiz"
  Item "Frankreich"
  Item "Italien"
  Item "Spanien"
  Item "Portugal"`,
        description: 'viele Items'
      },
    ]
  },
  {
    name: 'CUSTOM ITEMS - Zweizeilig',
    examples: [
      {
        code: `Select placeholder "Plan wählen...":
  Item value "free", ver, gap 2, pad 12 14:
    Text "Free" weight medium
    Text "Für Einzelpersonen" fs 12, col #666

  Item value "pro", ver, gap 2, pad 12 14:
    Text "Pro – $19/Monat" weight medium
    Text "Unbegrenzte Projekte" fs 12, col #666`,
        description: 'Items mit Titel und Beschreibung'
      },
    ]
  },
  {
    name: 'CUSTOM ITEMS - Mit Icons',
    examples: [
      {
        code: `Select placeholder "Status wählen...":
  Item value "draft":
    Icon "file-text" col #888
    Text "Entwurf"
  Item value "published":
    Icon "check-circle" col #22c55e
    Text "Veröffentlicht"
  Item value "archived":
    Icon "archive" col #888
    Text "Archiviert"`,
        description: 'Items mit Leading Icon'
      },
      {
        code: `Select value "medium":
  Item value "urgent": Icon "alert-circle" col #ef4444, Text "Dringend" col #ef4444
  Item value "high": Icon "arrow-up" col #f97316, Text "Hoch"
  Item value "medium": Icon "minus" col #eab308, Text "Mittel"
  Item value "low": Icon "arrow-down" col #22c55e, Text "Niedrig"`,
        description: 'Priorität'
      },
    ]
  },
  {
    name: 'CUSTOM ITEMS - Status & Farben',
    examples: [
      {
        code: `Select value "online":
  Item value "online": Box w 8, h 8, rad 4, bg #22c55e, Text "Online"
  Item value "away": Box w 8, h 8, rad 4, bg #eab308, Text "Abwesend"
  Item value "busy": Box w 8, h 8, rad 4, bg #ef4444, Text "Beschäftigt"
  Item value "offline": Box w 8, h 8, rad 4, bg #666, Text "Offline"`,
        description: 'Status mit Punkt'
      },
      {
        code: `Select placeholder "Farbe wählen...":
  Item value "red": Box w 10, h 10, rad 5, bg #ef4444, Text "Rot"
  Item value "green": Box w 10, h 10, rad 5, bg #22c55e, Text "Grün"
  Item value "blue": Box w 10, h 10, rad 5, bg #3b82f6, Text "Blau"
  Item value "yellow": Box w 10, h 10, rad 5, bg #eab308, Text "Gelb"`,
        description: 'Farbauswahl'
      },
    ]
  },
  {
    name: 'CUSTOM ITEMS - Mit Shortcuts',
    examples: [
      {
        code: `Select placeholder "Aktionen...":
  Item value "save" spread:
    Box hor, gap 8: Icon "save", Text "Speichern"
    Text "⌘S" fs 11, col #666
  Item value "copy" spread:
    Box hor, gap 8: Icon "copy", Text "Kopieren"
    Text "⌘C" fs 11, col #666
  Item value "delete" spread:
    Box hor, gap 8: Icon "trash" col #ef4444, Text "Löschen" col #ef4444
    Text "⌫" fs 11, col #666`,
        description: 'Aktionen mit Shortcuts'
      },
    ]
  },
  {
    name: 'CUSTOM ITEMS - Fonts & Währungen',
    examples: [
      {
        code: `Select value "inter":
  Item value "inter" spread:
    Text "Inter" font sans
    Text "Aa" font sans, col #666
  Item value "georgia" spread:
    Text "Georgia" font serif
    Text "Aa" font serif, col #666
  Item value "fira" spread:
    Text "Fira Code" font mono
    Text "Aa" font mono, col #666`,
        description: 'Font-Auswahl'
      },
      {
        code: `Select value "eur":
  Item value "eur": Text "€" w 20 col #888, Text "Euro"
  Item value "usd": Text "$" w 20 col #888, Text "US Dollar"
  Item value "gbp": Text "£" w 20 col #888, Text "Britisches Pfund"
  Item value "chf": Text "₣" w 20 col #888, Text "Schweizer Franken"`,
        description: 'Währungs-Auswahl'
      },
    ]
  },
]
