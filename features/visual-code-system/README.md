# Visual Code System

Das Kern-Differenzierungsmerkmal von Mirror: Visuell arbeiten, sauberer Code entsteht, User lernt die Sprache.

---

## Vision

> **Du designst visuell, aber der Code ist kein Nebenprodukt - er IST das Design.**

| Tool | Visuell | Code | Struktur-Generierung | Lernbar |
|------|---------|------|---------------------|---------|
| Figma | ✅ | ❌ Export = Müll | ❌ | ❌ |
| Framer | ✅ | ⚠️ React, komplex | ❌ | ❌ |
| Webflow | ✅ | ❌ Proprietär | ❌ | ❌ |
| v0/Bolt | ❌ Prompt | ✅ Generiert | ❌ Rät | ❌ |
| **Mirror** | ✅ | ✅ Lesbar | ✅ Intelligent | ✅ |

---

## Das fundamentale Konzept: 9 Zonen

Jeder Container - ob Grid-Zelle oder Flex-Box - hat **9 Positionierungs-Zonen**:

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   ┌───────────────┬───────────────────────┬───────────────┐    │
│   │               │                       │               │    │
│   │   TOP-LEFT    │      TOP-CENTER       │   TOP-RIGHT   │    │
│   │               │                       │               │    │
│   ├───────────────┼───────────────────────┼───────────────┤    │
│   │               │                       │               │    │
│   │   MID-LEFT    │      MID-CENTER       │   MID-RIGHT   │    │
│   │               │                       │               │    │
│   ├───────────────┼───────────────────────┼───────────────┤    │
│   │               │                       │               │    │
│   │   BOT-LEFT    │      BOT-CENTER       │   BOT-RIGHT   │    │
│   │               │                       │               │    │
│   └───────────────┴───────────────────────┴───────────────┘    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Jede Zone generiert spezifischen Code:**

| Zone | Generierter Code |
|------|------------------|
| TOP-LEFT | `pad top N, pad left N` |
| TOP-CENTER | `pad top N, center` |
| TOP-RIGHT | `pad top N, pad right N` |
| MID-LEFT | `pad left N` |
| MID-CENTER | `center` |
| MID-RIGHT | `pad right N` |
| BOT-LEFT | `pad bottom N, pad left N` |
| BOT-CENTER | `pad bottom N, center` |
| BOT-RIGHT | `pad bottom N, pad right N` |

Dieses 9-Zonen-Modell ist die Basis für alle Positionierungs-Features.

---

## Zwei Layout-Modi

### Flex-Modus (Container)

Ohne Grid arbeitet man mit verschachtelten Containern:

```
┌────────────────────────────────────────────────────────────────┐
│                                                                │
│   Container                                                    │
│   ┌────────────────────────────────────────────────────────┐  │
│   │                                                        │  │
│   │   Element landet hier                                  │  │
│   │   → System berechnet Zone                              │  │
│   │   → Generiert Wrapper wenn nötig                       │  │
│   │                                                        │  │
│   └────────────────────────────────────────────────────────┘  │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

**Problem:** Manche Positionen erfordern komplexe Wrapper-Strukturen.

### Grid-Modus (Page Grid)

Mit Grid hat man ein klares Raster aus Rechtecken:

```
┌────────────────────────────────────────────────────────────────┐
│                                                                │
│   Page Grid: 12 Spalten × 4 Rows = 48 Zellen                  │
│                                                                │
│   ┌──┬──┬──┬──┬──┬──┬──┬──┬──┬──┬──┬──┐                       │
│   │  │  │  │  │  │  │  │  │  │  │  │  │  Row 1                │
│   ├──┼──┼──┼──┼──┼──┼──┼──┼──┼──┼──┼──┤                       │
│   │  │  │  │  │  │  │  │  │  │  │  │  │  Row 2                │
│   ├──┼──┼──┼──┼──┼──┼──┼──┼──┼──┼──┼──┤                       │
│   │  │  │  │  │  │  │  │  │  │  │  │  │  Row 3                │
│   ├──┼──┼──┼──┼──┼──┼──┼──┼──┼──┼──┼──┤                       │
│   │  │  │  │  │  │  │  │  │  │  │  │  │  Row 4                │
│   └──┴──┴──┴──┴──┴──┴──┴──┴──┴──┴──┴──┘                       │
│    1  2  3  4  5  6  7  8  9 10 11 12                         │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

**Jede Grid-Zelle hat selbst 9 Zonen** - das ermöglicht präzise Positionierung.

---

## Zwei-Ebenen-Positionierung (Grid)

Beim Drop auf ein Grid passieren zwei Dinge:

### Ebene 1: Welche Zellen?

Das System erkennt anhand der Element-Größe, welche Zellen gespannt werden:

```
┌──┬──┬──┬──┬──┬──┐
│  │  │░░│░░│░░│  │   Element ist groß
├──┼──┼░░┼░░┼░░┼──┤   → spannt 3 Spalten × 2 Rows
│  │  │░░│░░│░░│  │
├──┼──┼──┼──┼──┼──┤
│  │  │  │  │  │  │
└──┴──┴──┴──┴──┴──┘

→ Code: span 3, row-span 2, start 3, row 1
```

### Ebene 2: Wo innerhalb?

Innerhalb der gespannten Fläche: In welcher der 9 Zonen?

```
Gespannte Fläche (3×2 Zellen):

┌─────────────────────────────────┐
│         │           │ ┌──────┐ │
│    ·    │     ·     │ │ Elem │ │  ← Element in TOP-RIGHT
├─────────┼───────────┼─└──────┘─┤
│         │           │          │
│    ·    │     ·     │     ·    │
└─────────────────────────────────┘

→ Code: span 3, row-span 2, align top right
```

### Hierarchie

```
Page Grid (12 × 4)
└── Gespannte Zellen [col 3-5, row 1-2]
    └── Zone innerhalb [TOP-RIGHT]
        └── Element
```

---

## Die vier Features

```
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│                       VISUAL CODE SYSTEM                                │
│                                                                         │
│  ┌───────────────┐ ┌───────────────┐ ┌───────────────┐ ┌─────────────┐ │
│  │    LAYOUT     │ │     GRID      │ │   SEMANTIC    │ │   DIRECT    │ │
│  │  COMPONENTS   │ │  POSITIONING  │ │     DRAG      │ │MANIPULATION │ │
│  ├───────────────┤ ├───────────────┤ ├───────────────┤ ├─────────────┤ │
│  │               │ │               │ │               │ │             │ │
│  │ Grundstruktur │ │ Zellen &      │ │ 9-Zonen       │ │ Werte       │ │
│  │ schaffen      │ │ Spans         │ │ Positionierung│ │ anpassen    │ │
│  │               │ │               │ │               │ │             │ │
│  │ GROB          │ │ STRUKTUR      │ │ FEIN          │ │ PRÄZISE     │ │
│  │               │ │               │ │               │ │             │ │
│  └───────┬───────┘ └───────┬───────┘ └───────┬───────┘ └──────┬──────┘ │
│          │                 │                 │                │        │
│          ▼                 ▼                 ▼                ▼        │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                        CodeModifier                             │   │
│  │   insertChild · wrapNode · updateProperty · removeNode          │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                    │                                    │
│                                    ▼                                    │
│                         ┌──────────────────┐                           │
│                         │   Mirror Code    │                           │
│                         │   Sichtbar · Editierbar · Lernbar            │
│                         └──────────────────┘                           │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Hierarchie der Features

Die Features bauen aufeinander auf:

```
1. LAYOUT COMPONENTS (Grob)
   └── Grundstruktur mit Slots schaffen
       └── Container-Hierarchie steht

2. GRID POSITIONING (Struktur)
   └── Optional: Grid in Slots aktivieren
       └── Präzise Zellen-Positionierung

3. SEMANTIC DRAG (Fein)
   └── 9-Zonen-Positionierung
       └── Wrapper-Generierung wenn nötig

4. DIRECT MANIPULATION (Präzise)
   └── Handles für Werte
       └── pad, gap, rad anpassen
```

---

## 1. Layout Components

**→ [layout-components/concept.md](layout-components/concept.md)**

Layout Components lösen das Problem, dass bei Flex-Layouts manche Positionen schwer abbildbar sind.

### Das Problem

```
User will Element hier platzieren:

┌────────────────────────────────────┐
│                                    │
│                      ┌──────┐      │
│                      │ hier │      │  ← Wie abbilden?
│                      └──────┘      │
│                                    │
└────────────────────────────────────┘

Braucht komplexe Wrapper:

Box w full, h full
  Box w full, ver, center
    Box w full, hor, pad right 24
      Element
```

### Die Lösung

Layout Components schaffen sofort eine nutzbare Struktur:

```
VORHER: Leerer Container

┌────────────────────────────────────┐
│            ???                     │
└────────────────────────────────────┘

NACHHER: Layout Component "SidebarLayout"

┌────────────────────────────────────┐
│  ┌──────┐  ┌────────────────────┐  │
│  │      │  │                    │  │
│  │ SLOT │  │       SLOT         │  │
│  │      │  │                    │  │
│  └──────┘  └────────────────────┘  │
└────────────────────────────────────┘

Slots sind klare Drop-Zonen!
```

### Code

```mirror
// Layout Component Definition
SidebarLayout: =
  Box w full, h full, hor
    Sidebar:
      Box w 240, h full
    Content:
      Box w full, h full

// Verwendung
SidebarLayout
  Sidebar
    NavMenu
  Content
    Dashboard
```

---

## 2. Grid Positioning

**→ [grid-positioning/concept.md](grid-positioning/concept.md)**

Ein Page-Level Grid wie in Figma/Sketch - kein CSS-Konstrukt, sondern ein visueller Guide.

### Grid Definition

```
┌────────────────────────────────────┐
│ Page Grid Settings                 │
├────────────────────────────────────┤
│ Columns:    [12    ]               │
│ Rows:       [auto  ]               │
│ Gap:        [16 px ]               │
│ Margin:     [24 px ]               │
│                                    │
│ [x] Show grid lines                │
│ [x] Snap to grid                   │
└────────────────────────────────────┘
```

### Grid = Rechtecke

Das Grid besteht aus Spalten UND Rows = Rechtecke (Zellen):

```
┌──┬──┬──┬──┬──┬──┬──┬──┬──┬──┬──┬──┐
│  │  │  │  │  │  │  │  │  │  │  │  │  Row 1
├──┼──┼──┼──┼──┼──┼──┼──┼──┼──┼──┼──┤
│  │  │  │  │  │  │  │  │  │  │  │  │  Row 2
├──┼──┼──┼──┼──┼──┼──┼──┼──┼──┼──┼──┤
│  │  │  │  │  │  │  │  │  │  │  │  │  Row 3
└──┴──┴──┴──┴──┴──┴──┴──┴──┴──┴──┴──┘
 1  2  3  4  5  6  7  8  9 10 11 12
```

**Jede Zelle hat 9 Zonen** für Fein-Positionierung innerhalb.

### Grid-Operationen

| Operation | Beschreibung |
|-----------|--------------|
| **Platzieren** | Element auf Grid ziehen → span & start |
| **Resize** | Kante ziehen → Span anpassen |
| **Verschieben** | Element bewegen → Start ändern |
| **Zone wechseln** | Innerhalb der Fläche positionieren |
| **Merge** | Mehrere Elemente → Container |
| **Unmerge** | Container auflösen |

### Code

```mirror
// Einfach
Header span 12
Sidebar span 3
Content span 9, start 4

// Mit Row
Header span 12, row 1
Main span 12, row 2

// Mit Zone
Card span 6, row 2, align top right
```

---

## 3. Semantic Drag

**→ [semantic-drag/concept.md](semantic-drag/concept.md)**

Positionierung innerhalb eines Containers über die 9 Zonen.

### Wie es funktioniert

```
User zieht Element in TOP-RIGHT Zone:

┌─────────────────────────────────────┐
│ · · · · · · · · · · · ┌──────────┐ │
│                       │ Element  │ │  ← Drop in TOP-RIGHT
│ · · · · · · · · · · · └──────────┘ │
│                                     │
│                                     │
└─────────────────────────────────────┘

System generiert Wrapper:

Box w full, pad top 16, pad right 16
  Element
```

### Element bleibt sauber

Der Wrapper übernimmt die Positionierung:

```mirror
// NICHT so (Element hat Position):
Card margin top 20, margin right 20

// SONDERN so (Wrapper hat Position):
Box pad top 20, pad right 20
  Card
```

### Wrapper-Optimierung

System entfernt unnötige Wrapper automatisch:

```
// Wenn Element in MID-CENTER:
// → Kein Wrapper nötig

// Wenn Element in MID-LEFT in hor-Container:
// → Kein Wrapper nötig (Default)

// Nur wenn Position vom Default abweicht:
// → Wrapper generieren
```

---

## 4. Direct Manipulation

**→ [direct-manipulation/](direct-manipulation/)**

Handles für präzises Anpassen von Werten.

### Handle-Typen

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   PADDING HANDLES                 GAP HANDLES                   │
│                                                                 │
│   ┌─────────────────────┐        ┌─────┐ ◄► ┌─────┐            │
│   │         ▲           │        │     │    │     │            │
│   │    pad top          │        │  A  │gap │  B  │            │
│   │         │           │        │     │    │     │            │
│   │ ◄──────────────────►│        └─────┘    └─────┘            │
│   │ pad    pad          │                                       │
│   │ left   right        │                                       │
│   │         │           │        RADIUS HANDLES                 │
│   │         ▼           │                                       │
│   │    pad bottom       │        ╭─────────────────╮            │
│   └─────────────────────┘        │ ●               │            │
│                                  │  rad 8          │            │
│                                  │                 │            │
└─────────────────────────────────────────────────────────────────┘
```

### Interaktion

```
1. Element selektieren
   → Handles erscheinen

2. Handle ziehen
   → Live-Preview der Änderung
   → Value-Label zeigt aktuellen Wert

3. Loslassen
   → Code wird aktualisiert
   → pad 16 → pad 24
```

---

## Zusammenspiel der Features

### Workflow-Beispiel

```
1. LAYOUT COMPONENT
   ─────────────────
   User zieht "DashboardLayout" aus Library

   ┌────────────────────────────────────────────┐
   │ ┌──────┐ ┌──────────────────────────────┐ │
   │ │      │ │                              │ │
   │ │ NAV  │ │           MAIN               │ │
   │ │      │ │                              │ │
   │ └──────┘ └──────────────────────────────┘ │
   └────────────────────────────────────────────┘

   Code:
   DashboardLayout
     Nav
     Main

2. GRID AKTIVIEREN
   ─────────────────
   User aktiviert 6-Spalten Grid im Main-Slot

   ┌──────────────────────────────────────────┐
   │ ┌──┬──┬──┬──┬──┬──┐                      │
   │ │  │  │  │  │  │  │                      │
   │ ├──┼──┼──┼──┼──┼──┤                      │
   │ │  │  │  │  │  │  │                      │
   │ └──┴──┴──┴──┴──┴──┘                      │
   └──────────────────────────────────────────┘

3. ELEMENT PLATZIEREN
   ───────────────────
   User zieht Card auf Spalte 2-4, Row 1

   ┌──┬──┬──┬──┬──┬──┐
   │  │░░│░░│░░│  │  │
   ├──┼░░┼░░┼░░┼──┼──┤
   │  │  │  │  │  │  │
   └──┴──┴──┴──┴──┴──┘

   Code:
   Main grid 6
     Card span 3, start 2

4. FEIN-POSITIONIERUNG
   ────────────────────
   User zieht Card in TOP-RIGHT Zone der Fläche

   Code:
   Main grid 6
     Card span 3, start 2, align top right

5. WERT ANPASSEN
   ───────────────
   User zieht Gap-Handle

   Code:
   Main grid 6, gap 24    ← gap von 16 auf 24
     Card span 3, start 2, align top right
```

### Finaler Code

```mirror
DashboardLayout
  Nav
    NavMenu
  Main grid 6, gap 24
    StatsCard span 3, start 2, align top right
    ChartCard span 4, row 2
    TableCard span 6, row 3
```

---

## Vergleich: Grid vs Flex

| Aspekt | Flex (Container) | Grid |
|--------|------------------|------|
| Struktur | Verschachtelte Container | Rechtecke (Zellen) |
| Position | 9 Zonen pro Container | 9 Zonen pro Zelle |
| Spanning | Nicht möglich | span 3, row-span 2 |
| Komplexität | Kann Wrapper brauchen | Immer klar |
| Use Case | Komponenten-Layout | Page-Layout |

### Wann was nutzen?

```
GRID:
- Page-Level Layout
- Dashboard mit Karten
- Komplexe Anordnungen
- Wenn Spanning gebraucht wird

FLEX:
- Komponenten-Inneres
- Listen
- Navigation
- Einfache Anordnungen
```

---

## Der Lerneffekt

Das System macht sich selbst überflüssig:

```
Woche 1:  Layout Components + Drag & Drop
          → User sieht Code entstehen
          → "Ah, so sieht span aus"

Woche 2:  Grid für Struktur, tippt Properties
          → "pad 16 ist schneller als Handle"
          → Versteht Zonen-Konzept

Woche 3:  Tippt meistens direkt
          → Nutzt Visual nur für komplexe Layouts
          → "Grid ziehe ich noch, rest tippe ich"

Woche 4:  Tippt fast alles
          → Visual Feedback nur zur Verifikation
          → "Ich denke jetzt in Mirror"
```

---

## Technische Architektur

**→ [INTEGRATION-PLAN-V2.md](INTEGRATION-PLAN-V2.md)** - Detaillierter Implementierungsplan

Alle Features nutzen und **erweitern** die bestehende Infrastruktur:

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   User Interaction                                              │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │  Drag · Click · Resize · Type                           │   │
│   └─────────────────────────────────────────────────────────┘   │
│                              │                                   │
│        ┌─────────────────────┼─────────────────────┐            │
│        ▼                     ▼                     ▼            │
│   ┌──────────────┐   ┌──────────────┐   ┌──────────────┐       │
│   │DragDropManager│   │HandleManager │   │ MultiSelect  │       │
│   │ (erweitert)  │   │   (NEU)      │   │   (NEU)      │       │
│   └───────┬──────┘   └───────┬──────┘   └───────┬──────┘       │
│           │                  │                   │               │
│           └──────────────────┼───────────────────┘               │
│                              ▼                                   │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │                  DropZoneCalculator                      │   │
│   │          (erweitert um SemanticZones, GridZones)         │   │
│   └─────────────────────────────────────────────────────────┘   │
│                              │                                   │
│                              ▼                                   │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │                     CodeModifier                         │   │
│   │   (erweitert um wrapNodes, insertSibling)                │   │
│   └─────────────────────────────────────────────────────────┘   │
│                              │                                   │
│                              ▼                                   │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │              SyncCoordinator + State Store               │   │
│   │                    (unverändert)                         │   │
│   └─────────────────────────────────────────────────────────┘   │
│                              │                                   │
│                              ▼                                   │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │                      Mirror Code                         │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Prinzip: Erweitern, nicht ersetzen

| Bestehend | Wird erweitert um |
|-----------|-------------------|
| `DropZoneCalculator` | 9-Zone Detection, Grid-Zellen |
| `DragDropManager` | Smart Sizing Integration |
| `CodeModifier` | `wrapNodes()`, `insertSibling()` |
| `PreviewController` | HandleManager Integration |
| `State Store` | Multi-Selection |

### Shared Systems

```
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│  SourceMap  │  │   IR/AST    │  │   Events    │
│             │  │             │  │             │
│ Code ↔ DOM  │  │ Struktur    │  │ Selection   │
│ Mapping     │  │ Analyse     │  │ Updates     │
└─────────────┘  └─────────────┘  └─────────────┘

┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│CodeModifier │  │   Preview   │  │   State     │
│             │  │  Renderer   │  │   Store     │
│ Code-       │  │             │  │             │
│ Änderungen  │  │ Live-       │  │ Single      │
│             │  │ Updates     │  │ Source      │
└─────────────┘  └─────────────┘  └─────────────┘
```

---

## Roadmap

### Phase 1: Foundation ✅
- [x] SourceMap (Code ↔ DOM)
- [x] CodeModifier
- [x] Selection System
- [x] Preview Sync

### Phase 2: Direct Manipulation
- [ ] Handle Overlay System
- [ ] Padding Handles
- [ ] Gap Handles
- [ ] Radius Handles
- [ ] Value Labels

### Phase 3: Semantic Drag
- [ ] 9-Zone Detection
- [ ] Wrapper Generation
- [ ] Zone Visual Feedback
- [ ] Wrapper Cleanup

### Phase 4: Grid Positioning
- [ ] Page Grid Settings
- [ ] Grid Overlay Rendering
- [ ] Two-Level Positioning
- [ ] Span/Row-Span Calculation
- [ ] Merge/Unmerge

### Phase 5: Layout Components
- [ ] Component Library UI
- [ ] Slot Definition System
- [ ] Slot Drop Zones
- [ ] Custom Layout Components

---

## Dateistruktur

```
features/visual-code-system/
├── README.md                    ← Diese Datei
├── architecture.md              ← Technische Architektur
├── direct-manipulation/
│   ├── research.md
│   └── implementation.md
├── semantic-drag/
│   └── concept.md
├── grid-positioning/
│   └── concept.md
└── layout-components/
    └── concept.md
```

---

## Warum das einzigartig ist

**Figma:** Visuell top, aber Code-Export ist unbrauchbar.

**Vibe Coding (v0, Bolt):** Code-Output, aber keine Kontrolle. Du promptest und hoffst.

**Mirror:**
- Visuell arbeiten mit voller Kontrolle
- Code ist immer sichtbar und editierbar
- System generiert saubere, semantische Struktur
- User lernt die Sprache durch Tun
- 9-Zonen-Modell für präzise Positionierung
- Grid + Flex in einem System

> **Der Code ist nicht das Ergebnis. Der Code ist das Medium.**
