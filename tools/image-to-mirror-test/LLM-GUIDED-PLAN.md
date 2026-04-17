# LLM-Guided Image Analysis - Entwicklungsplan

## Konzept

LLM führt die Analyse, deterministisches System präzisiert:

```
LLM: "Ich sehe X" → Pixel-Analyse: "X ist bei (100,50) mit 200x40px"
```

## Inkrementeller Plan

### Phase 1: Einfachste Fälle (1 Element)

**Step 1.1: Einzelner Button**

```mirror
Frame w 400, h 300, bg #f0f0f0, center
  Button "Speichern", bg #2271C1, col white, pad 12 24, rad 6
```

- LLM sieht: "Ein blauer Button mit Text 'Speichern'"
- System findet: Bounds, Farbe, Text, Radius
- Output: `Button "Speichern", bg #2271C1, col white, pad 12 24, rad 6`

**Step 1.2: Button mit Icon**

```mirror
Frame w 400, h 300, bg #f0f0f0, center
  Button bg #2271C1, col white, pad 12 24, rad 6, hor, gap 8
    Icon "check", ic white, is 16
    Text "Bestätigen"
```

- LLM sieht: "Button mit Check-Icon und Text"
- Output: Button mit Icon

**Step 1.3: Input-Feld**

```mirror
Frame w 400, h 300, bg #f0f0f0, center
  Input placeholder "Email eingeben...", w 200, pad 12, bor 1, boc #ccc, rad 4
```

- LLM sieht: "Ein Eingabefeld mit Placeholder"

**Step 1.4: Checkbox**

```mirror
Frame w 400, h 300, bg #f0f0f0, center
  Frame hor, gap 8, ver-center
    Frame w 20, h 20, bor 1, boc #ccc, rad 4, center
      Icon "check", ic #2271C1, is 14
    Text "Newsletter abonnieren"
```

- LLM sieht: "Eine Checkbox mit Label"
- Output: `Checkbox "Newsletter abonnieren", checked`

---

### Phase 2: Einfache Gruppen (2-3 Elemente)

**Step 2.1: Button-Gruppe horizontal**

```mirror
Frame w 400, h 300, bg #f0f0f0, center
  Frame hor, gap 12
    Button "Abbrechen", bg #e0e0e0, col #333, pad 12 24, rad 6
    Button "Speichern", bg #2271C1, col white, pad 12 24, rad 6
```

- LLM sieht: "Zwei Buttons nebeneinander: Abbrechen und Speichern"
- Layout: `hor, gap 12`

**Step 2.2: Form-Feld mit Label**

```mirror
Frame w 400, h 300, bg #f0f0f0, center
  Frame gap 4
    Text "Email", fs 14, col #333
    Input placeholder "name@example.com", w 200, pad 12, bor 1, boc #ccc, rad 4
```

- LLM sieht: "Label 'Email' über einem Eingabefeld"

**Step 2.3: Icon-Button-Reihe**

```mirror
Frame w 400, h 300, bg #f0f0f0, center
  Frame hor, gap 8
    Frame w 40, h 40, bg #f0f0f0, rad 8, center
      Icon "home", ic #666, is 20
    Frame w 40, h 40, bg #f0f0f0, rad 8, center
      Icon "settings", ic #666, is 20
    Frame w 40, h 40, bg #f0f0f0, rad 8, center
      Icon "user", ic #666, is 20
```

- LLM sieht: "Drei Icon-Buttons: Home, Settings, User"

---

### Phase 3: Komponenten-Erkennung

**Step 3.1: Card**

```mirror
Frame w 400, h 300, bg #f0f0f0, center
  Frame w 280, bg white, pad 20, rad 12, gap 12
    Text "Projekt Alpha", fs 18, weight bold
    Text "Beschreibung des Projekts...", col #666
    Button "Öffnen", bg #2271C1, col white, pad 10 20, rad 6
```

- LLM sieht: "Eine Card mit Titel, Beschreibung und Button"

**Step 3.2: Navigation/Tabs**

```mirror
Frame w 400, h 300, bg #f0f0f0, center
  Frame hor, gap 0
    Frame pad 12 20, bor 0 0 2 0, boc #2271C1
      Text "Dashboard", col #2271C1
    Frame pad 12 20
      Text "Projekte", col #666
    Frame pad 12 20
      Text "Settings", col #666
```

- LLM sieht: "Tab-Navigation mit 3 Tabs, 'Dashboard' ist aktiv"
- Output: `Tabs` Komponente

**Step 3.3: Dropdown/Select**

```mirror
Frame w 400, h 300, bg #f0f0f0, center
  Frame w 200, pad 12, bor 1, boc #ccc, rad 4, hor, spread, ver-center
    Text "Option wählen...", col #999
    Icon "chevron-down", ic #666, is 16
```

- LLM sieht: "Ein Dropdown/Select-Feld"
- Output: `Select placeholder "Option wählen..."`

---

### Phase 4: Layout-Erkennung

**Step 4.1: Zwei-Spalten Layout**

```mirror
Frame w 400, h 300, bg #f0f0f0, pad 20
  Frame hor, gap 20, h full
    Frame w 120, bg #1a1a1a, pad 16
      Text "Sidebar", col white
    Frame grow, bg white, pad 16
      Text "Content"
```

- LLM sieht: "Sidebar links, Hauptbereich rechts"

**Step 4.2: Header + Content**

```mirror
Frame w 400, h 300, bg #f0f0f0
  Frame h 60, bg #1a1a1a, pad 0 20, hor, ver-center, spread
    Text "Logo", col white, weight bold
    Frame hor, gap 16
      Text "Home", col white
      Text "About", col white
  Frame grow, pad 20
    Text "Content Area"
```

- LLM sieht: "Header mit Logo und Navigation, darunter Content"

---

### Phase 5: Komplexe UIs

**Step 5.1: Login-Form**

- Email-Feld, Passwort-Feld, Login-Button, "Passwort vergessen" Link

**Step 5.2: Dashboard-Card**

- Titel, Wert, Trend-Icon, Mini-Chart

**Step 5.3: Komplette Sidebar**

- Logo, Navigation mit Sections, User-Info unten

---

## Technische Umsetzung

### LLM Interface

```typescript
interface LLMAnalysis {
  description: string           // Was sieht das LLM?
  elements: ElementHint[]       // Erkannte Elemente
  layout?: LayoutHint          // Layout-Vermutung
  componentType?: string       // Zag-Komponente?
}

interface ElementHint {
  type: 'button' | 'text' | 'icon' | 'input' | 'image' | 'container'
  description: string          // "blauer Button mit Text 'Speichern'"
  position: 'top' | 'bottom' | 'left' | 'right' | 'center' | 'top-left' | ...
  approximate?: {              // Grobe Schätzung
    x?: number
    y?: number
    width?: number
    height?: number
  }
}
```

### Ablauf pro Rekursion

1. Bild(ausschnitt) an LLM senden
2. LLM beschreibt was es sieht
3. Für jedes Element: Pixel-Analyse findet präzise Bounds
4. Falls Element komplex: Rekursion mit Bildausschnitt
5. Code generieren

### Test-Simulation

Zunächst LLM-Antworten simulieren um den Flow zu testen:

```typescript
const MOCK_LLM_RESPONSES = {
  'single-button': {
    description: "Ein blauer Button mit weißem Text 'Speichern'",
    elements: [
      {
        type: 'button',
        description: "Button 'Speichern'",
        position: 'center',
      },
    ],
    componentType: 'Button',
  },
}
```

---

## Nächster Schritt

**Step 1.1 implementieren:**

1. Test-Case für einzelnen Button erstellen
2. Mock-LLM-Response definieren
3. Pixel-Analyse findet Button-Bounds
4. Code-Generator erzeugt `Button "Speichern", ...`
5. Vergleich mit erwartetem Output
