# Image to Mirror: Deterministische UI-Analyse

> Konzept für ein Tool das Screenshots von User Interfaces analysiert und in Mirror DSL konvertiert.

## Vision

Ein hybrides System aus **deterministischen Analyzern** und **LLM-Interpretation**:

```
┌─────────────────────────────────────────────────────────┐
│                    IMAGE INPUT                          │
│              (Screenshot, Figma Export, etc.)           │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│              DETERMINISTIC ANALYZERS                    │
│                                                         │
│  ColorAnalyzer ──────► Palette, Kontraste, Gradienten   │
│  GeometryAnalyzer ───► Bounding Boxes, Maße, Abstände   │
│  LayoutAnalyzer ─────► Hierarchie, Richtung, Alignment  │
│  TypographyAnalyzer ─► Text, Größen, Weights            │
│  ElementClassifier ──► Button, Input, Text, Icon, etc.  │
│  EffectAnalyzer ─────► Schatten, Radius, Borders        │
│  PatternAnalyzer ────► Listen, Grids, Wiederholungen    │
│  StateAnalyzer ──────► Disabled, Selected, Error        │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│              STRUCTURED JSON OUTPUT                     │
│                                                         │
│  {                                                      │
│    palette: ["#5BA8F5", "#27272a", "#ffffff"],          │
│    elements: [                                          │
│      { type: "frame", x: 0, y: 0, w: 400, h: 300,      │
│        bg: "#27272a", rad: 8, pad: 16, gap: 12,        │
│        layout: "vertical", children: [...] }            │
│    ],                                                   │
│    tokens: { spacing: [4, 8, 16], radii: [4, 8] }      │
│  }                                                      │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                 LLM INTERPRETER                         │
│                                                         │
│  Input: Strukturierte Analyse + Original-Bild           │
│  Output: Mirror DSL Code                                │
│                                                         │
│  Frame bg #27272a, pad 16, gap 12, rad 8               │
│    Text "Welcome", fs 24, weight bold, col white        │
│    Button "Get Started", bg #5BA8F5, col white          │
└─────────────────────────────────────────────────────────┘
```

---

## Teil 1: Farb-Analyse

### 1.1 Exakte Pixelfarben

```typescript
interface PixelColor {
  r: number // 0-255
  g: number // 0-255
  b: number // 0-255
  a: number // 0-255
  hex: string // "#RRGGBB" oder "#RRGGBBAA"
}

function getPixel(image: ImageData, x: number, y: number): PixelColor
```

**Genauigkeit:** 100% deterministisch

### 1.2 Dominante Farben

```typescript
interface ColorPalette {
  colors: Array<{
    hex: string
    percentage: number // Anteil im Bild
    count: number // Pixel-Anzahl
  }>
}

function extractPalette(image: ImageData, maxColors: number): ColorPalette
```

**Algorithmen:**

- K-Means Clustering
- Median Cut
- Octree Quantization

### 1.3 Farbbeziehungen

| Analyse            | Beschreibung                     | Output                    |
| ------------------ | -------------------------------- | ------------------------- |
| Kontrastverhältnis | WCAG-Formel für Text/Hintergrund | `4.5:1`, `3:1`            |
| Farbtemperatur     | Warm (Rot/Orange) vs Kalt (Blau) | `warm`, `cool`, `neutral` |
| Sättigung          | Wie intensiv sind die Farben     | `0-100%`                  |
| Helligkeit         | L\* aus Lab-Farbraum             | `0-100`                   |
| Dark/Light Mode    | Durchschnittliche Helligkeit     | `dark`, `light`           |

### 1.4 Gradient-Erkennung

```typescript
interface Gradient {
  type: 'linear' | 'radial'
  angle?: number // Für linear: 0-360°
  stops: Array<{
    color: string
    position: number // 0-1
  }>
}

function detectGradient(region: ImageData): Gradient | null
```

**Methode:** Farbverlauf entlang verschiedener Achsen samplen, Korrelation prüfen.

### 1.5 Transparenz-Erkennung

```typescript
interface TransparencyInfo {
  hasAlpha: boolean
  alphaRange: [number, number]
  transparentRegions: BoundingBox[]
}

function analyzeTransparency(image: ImageData): TransparencyInfo
```

---

## Teil 2: Geometrie & Maße

### 2.1 Bounding Box Detection

```typescript
interface BoundingBox {
  x: number
  y: number
  width: number
  height: number
  area: number
  aspectRatio: number
}

interface ElementBounds {
  id: string
  bounds: BoundingBox
  children: ElementBounds[]
}

function detectElements(image: ImageData): ElementBounds[]
```

**Algorithmen:**

- Edge Detection (Canny, Sobel)
- Contour Detection (OpenCV findContours)
- Connected Components Analysis

### 2.2 Abstands-Messung

```typescript
interface SpacingAnalysis {
  gaps: number[] // Abstände zwischen Siblings
  padding: {
    top: number
    right: number
    bottom: number
    left: number
  }
  margin: {
    top: number
    right: number
    bottom: number
    left: number
  }
}

function measureSpacing(parent: BoundingBox, children: BoundingBox[]): SpacingAnalysis
```

### 2.3 Border-Radius Erkennung

```typescript
interface RadiusInfo {
  topLeft: number
  topRight: number
  bottomRight: number
  bottomLeft: number
  isUniform: boolean
  isCircle: boolean // radius >= min(width, height) / 2
}

function detectRadius(element: BoundingBox, image: ImageData): RadiusInfo
```

**Methode:**

1. Ecken-Regionen extrahieren
2. Kreisbogen-Fitting (Hough Circle Transform)
3. Radius aus Bogen berechnen

### 2.4 Border-Erkennung

```typescript
interface BorderInfo {
  width: number
  color: string
  style: 'solid' | 'dashed' | 'dotted' | 'none'
  sides: {
    top: boolean
    right: boolean
    bottom: boolean
    left: boolean
  }
}

function detectBorder(element: BoundingBox, image: ImageData): BorderInfo
```

### 2.5 Größen-Cluster

```typescript
interface SizeCluster {
  widths: number[] // Häufige Breiten
  heights: number[] // Häufige Höhen
  aspectRatios: number[] // Häufige Verhältnisse
}

function clusterSizes(elements: BoundingBox[]): SizeCluster
```

**Zweck:** Design-Tokens für Größen extrahieren.

---

## Teil 3: Layout-Analyse

### 3.1 Layout-Richtung

```typescript
type LayoutDirection = 'horizontal' | 'vertical' | 'grid' | 'stacked' | 'absolute'

interface LayoutInfo {
  direction: LayoutDirection
  wrap: boolean
  gridColumns?: number
  gridRows?: number
}

function detectLayout(children: BoundingBox[]): LayoutInfo
```

**Methode:**

1. Y-Koordinaten vergleichen → Horizontal wenn ähnlich
2. X-Koordinaten vergleichen → Vertikal wenn ähnlich
3. Regelmäßige X und Y → Grid
4. Überlappung → Stacked
5. Keine Muster → Absolute

### 3.2 Alignment-Erkennung

```typescript
type HorizontalAlign = 'left' | 'center' | 'right' | 'stretch' | 'space-between'
type VerticalAlign = 'top' | 'center' | 'bottom' | 'stretch' | 'space-between'

interface AlignmentInfo {
  horizontal: HorizontalAlign
  vertical: VerticalAlign
  crossAxis: HorizontalAlign | VerticalAlign
}

function detectAlignment(parent: BoundingBox, children: BoundingBox[]): AlignmentInfo
```

**Methode:**

- Links ausgerichtet: Alle X-Starts gleich
- Rechts ausgerichtet: Alle X-Ends gleich
- Zentriert: Alle Mitten gleich
- Space-between: Gleichmäßige Abstände

### 3.3 Hierarchie-Rekonstruktion

```typescript
interface HierarchyNode {
  id: string
  bounds: BoundingBox
  children: HierarchyNode[]
  depth: number
  parent: string | null
}

function buildHierarchy(elements: BoundingBox[]): HierarchyNode
```

**Methode:**

1. Containment-Graph erstellen (wer enthält wen)
2. Topologische Sortierung
3. Parent-Child-Beziehungen ableiten

### 3.4 Z-Index Analyse

```typescript
interface ZOrderInfo {
  layers: Array<{
    zIndex: number
    elements: string[]
  }>
}

function analyzeZOrder(elements: BoundingBox[], image: ImageData): ZOrderInfo
```

**Methode:** Überlappende Bereiche analysieren, Vordergrund-Farbe bestimmen.

### 3.5 Grid-Erkennung

```typescript
interface GridInfo {
  columns: number
  rows: number
  columnWidths: number[]
  rowHeights: number[]
  gapX: number
  gapY: number
}

function detectGrid(children: BoundingBox[]): GridInfo | null
```

---

## Teil 3b: Layout-Prognose (Mirror-spezifisch)

> Dieser Teil geht über reine Analyse hinaus und **prognostiziert** welche Mirror-Layout-Properties verwendet werden sollten.

### 3b.1 Sizing-Prognose

Bestimmt ob ein Element feste Größe, volle Breite oder flexibel ist.

```typescript
type SizeMode = 'fixed' | 'full' | 'hug' | 'grow'

interface SizingPrognosis {
  width: SizeMode
  height: SizeMode
  fixedWidth?: number // Wenn width === 'fixed'
  fixedHeight?: number // Wenn height === 'fixed'
  confidence: number
}

function prognoseSizing(
  element: BoundingBox,
  parent: BoundingBox,
  siblings: BoundingBox[]
): SizingPrognosis
```

**Heuristiken:**

| Bedingung                             | Prognose                        |
| ------------------------------------- | ------------------------------- |
| Element-Breite ≈ Parent-Breite (>95%) | `w full`                        |
| Alle Siblings gleiche Breite          | `w [fixedValue]`                |
| Ein Element füllt Restplatz           | `grow`                          |
| Element nur so breit wie Inhalt       | `w hug`                         |
| Breite ist runde Zahl (100, 200, 250) | Wahrscheinlich `w [fixedValue]` |

**Beispiele:**

```
┌──────────────────────────────────────────┐
│ ┌──────────────────────────────────────┐ │
│ │         Element (95% Breite)         │ │  → w full
│ └──────────────────────────────────────┘ │
└──────────────────────────────────────────┘

┌──────────────────────────────────────────┐
│ ┌────────┐ ┌────────────────────────────┐│
│ │ 200px  │ │      Rest (grow)           ││  → w 200, grow
│ └────────┘ └────────────────────────────┘│
└──────────────────────────────────────────┘

┌──────────────────────────────────────────┐
│ ┌────────┐ ┌────────┐ ┌────────┐        │
│ │ 100px  │ │ 100px  │ │ 100px  │        │  → w 100 (alle gleich)
│ └────────┘ └────────┘ └────────┘        │
└──────────────────────────────────────────┘
```

### 3b.2 Alignment zu Mirror-Properties

Konvertiert erkannte Alignments in Mirror DSL Properties.

```typescript
interface MirrorAlignment {
  properties: string[] // ['center'] oder ['hor', 'spread', 'ver-center']
  confidence: number
}

function alignmentToMirrorProps(
  hAlign: 'left' | 'center' | 'right' | 'stretch',
  vAlign: 'top' | 'center' | 'bottom' | 'stretch',
  isSpread: boolean,
  direction: 'hor' | 'ver'
): MirrorAlignment
```

**Mapping-Tabelle:**

| Horizontal | Vertical | Mirror Property           |
| ---------- | -------- | ------------------------- |
| left       | top      | `tl`                      |
| center     | top      | `tc`                      |
| right      | top      | `tr`                      |
| left       | center   | `cl`                      |
| center     | center   | `center`                  |
| right      | center   | `cr`                      |
| left       | bottom   | `bl`                      |
| center     | bottom   | `bc`                      |
| right      | bottom   | `br`                      |
| spread     | center   | `hor, spread, ver-center` |
| spread     | top      | `hor, spread`             |

### 3b.3 Stacked-Layout-Erkennung

Erkennt überlappende Elemente für `stacked` Layout mit `x`, `y` Positionierung.

```typescript
interface StackedElement {
  base: BoundingBox // Hintergrund-Element
  overlays: Array<{
    element: BoundingBox
    offset: { x: number; y: number }
    anchor: 'tl' | 'tr' | 'bl' | 'br' | 'center'
  }>
}

interface StackedAnalysis {
  isStacked: boolean
  elements: StackedElement[]
  confidence: number
}

function detectStacked(elements: BoundingBox[]): StackedAnalysis
```

**Erkennungs-Heuristiken:**

| Muster                               | Mirror Output                         |
| ------------------------------------ | ------------------------------------- |
| Kleines Element in Ecke von größerem | Badge: `Frame stacked` mit `x`, `y`   |
| Text über Bild                       | Caption: `Frame stacked` mit `x`, `y` |
| Mehrere Elemente genau übereinander  | Overlay: `Frame stacked`              |
| Element ragt über Parent hinaus      | Absolut positioniert: `x -4, y -4`    |

**Beispiel:**

```
Bild mit Badge:
┌──────────────────┐
│                ●3│   Badge bei x: 90%, y: -10%
│     Image        │
│                  │
└──────────────────┘

→ Mirror:
Frame stacked, w 100, h 80
  Image src "...", w full, h full
  Frame x 85, y -5, w 20, h 20, bg #ef4444, rad 999, center
    Text "3", col white, fs 10
```

### 3b.4 Grid-Spalten-Prognose (12-Spalten-System)

Berechnet Grid-Spalten basierend auf Breiten-Verhältnissen.

```typescript
interface GridColumnPrognosis {
  isGrid: boolean
  totalColumns: 12 | 6 | 4 | 3 // Mirror unterstützt diese
  children: Array<{
    element: BoundingBox
    columns: number // 1-12
    row: number
    startColumn: number
  }>
  gapX: number
  gapY: number
  confidence: number
}

function prognoseGridColumns(children: BoundingBox[], containerWidth: number): GridColumnPrognosis
```

**Berechnung:**

```typescript
// Spaltenbreite berechnen
const columnWidth = (elementWidth / containerWidth) * 12
const roundedColumns = Math.round(columnWidth)

// Validierung: Summe pro Zeile sollte ≤ 12 sein
```

**Beispiel:**

```
Container: 600px

┌────────────────────────────────────────────────────────┐
│ ┌──────────────────────────────────────────────────┐   │
│ │                    600px (100%)                  │   │  → w 12
│ └──────────────────────────────────────────────────┘   │
│ ┌────────────────────────┐ ┌────────────────────────┐  │
│ │       300px (50%)      │ │       300px (50%)      │  │  → w 6, w 6
│ └────────────────────────┘ └────────────────────────┘  │
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐     │
│ │  200px (33%) │ │  200px (33%) │ │  200px (33%) │     │  → w 4, w 4, w 4
│ └──────────────┘ └──────────────┘ └──────────────┘     │
└────────────────────────────────────────────────────────┘

→ Mirror:
Frame grid 12, gap 8
  Frame w 12, ...
  Frame w 6, ...
  Frame w 6, ...
  Frame w 4, ...
  Frame w 4, ...
  Frame w 4, ...
```

### 3b.5 Wrap-Erkennung

Erkennt umbrechende Layouts für `wrap` Property.

```typescript
interface WrapAnalysis {
  hasWrap: boolean
  direction: 'hor' | 'ver'
  rows: number // Anzahl Zeilen
  itemsPerRow: number[] // Items pro Zeile [4, 4, 2]
  gap: number
  confidence: number
}

function detectWrap(children: BoundingBox[], parent: BoundingBox): WrapAnalysis
```

**Erkennungs-Heuristiken:**

1. Kinder in mehreren "Zeilen" angeordnet
2. X-Koordinaten wiederholen sich (neue Zeile beginnt links)
3. Gleichmäßige Abstände zwischen allen Elementen
4. Letzte Zeile hat weniger Elemente

**Beispiel:**

```
┌────────────────────────────────────────┐
│ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐       │
│ │ Tag │ │ Tag │ │ Tag │ │ Tag │       │  Zeile 1: 4 Items
│ └─────┘ └─────┘ └─────┘ └─────┘       │
│ ┌─────┐ ┌─────┐                        │
│ │ Tag │ │ Tag │                        │  Zeile 2: 2 Items
│ └─────┘ └─────┘                        │
└────────────────────────────────────────┘

→ Mirror:
Frame hor, wrap, gap 8
  Button "Tag", ...
  Button "Tag", ...
  // ... 6x
```

### 3b.6 Gap vs Spread Unterscheidung

Unterscheidet zwischen festem `gap` und `spread` (space-between).

```typescript
type SpacingMode =
  | { type: 'gap'; value: number }
  | { type: 'spread' }
  | { type: 'none' } // Keine Abstände
  | { type: 'irregular' } // Unregelmäßig

interface SpacingAnalysis {
  mode: SpacingMode
  confidence: number
}

function analyzeSpacing(
  children: BoundingBox[],
  parent: BoundingBox,
  direction: 'hor' | 'ver'
): SpacingAnalysis
```

**Unterscheidungs-Logik:**

```typescript
// Alle Abstände zwischen Kindern messen
const gaps = measureGapsBetweenChildren(children, direction)

// Standardabweichung berechnen
const stdDev = standardDeviation(gaps)
const mean = average(gaps)

if (stdDev < 2) {
  // Alle Gaps fast gleich → festes gap
  return { type: 'gap', value: Math.round(mean) }
}

// Prüfen ob space-between
const totalChildSize = sumChildSizes(children, direction)
const parentSize = direction === 'hor' ? parent.width : parent.height
const availableSpace = parentSize - totalChildSize
const expectedGap = availableSpace / (children.length - 1)

if (Math.abs(mean - expectedGap) < 2) {
  return { type: 'spread' }
}

return { type: 'irregular' }
```

**Beispiele:**

```
Gap 8 (konstant):
┌─────┐   ┌─────┐   ┌─────┐
│  A  │8px│  B  │8px│  C  │   → gap 8
└─────┘   └─────┘   └─────┘

Spread (space-between):
┌─────┐           ┌─────┐           ┌─────┐
│  A  │    var    │  B  │    var    │  C  │   → spread
└─────┘           └─────┘           └─────┘
    ^                 ^
    └── Abstände füllen verfügbaren Platz gleichmäßig
```

### 3b.7 Padding-Extraktion

Extrahiert Innenabstände eines Containers.

```typescript
interface PaddingAnalysis {
  top: number
  right: number
  bottom: number
  left: number
  isUniform: boolean // Alle 4 gleich
  isSymmetric: boolean // top===bottom && left===right
  mirrorNotation: string // "pad 16" oder "pad 8 16" oder "pad 8 16 12 16"
  confidence: number
}

function extractPadding(parent: BoundingBox, children: BoundingBox[]): PaddingAnalysis
```

**Berechnung:**

```typescript
// Bounding Box aller Kinder
const childrenBounds = getBoundingBoxOfAll(children)

const padding = {
  top: childrenBounds.y - parent.y,
  right: parent.x + parent.width - (childrenBounds.x + childrenBounds.width),
  bottom: parent.y + parent.height - (childrenBounds.y + childrenBounds.height),
  left: childrenBounds.x - parent.x,
}

// Mirror-Notation bestimmen
if (allEqual(padding)) {
  return `pad ${padding.top}`
} else if (padding.top === padding.bottom && padding.left === padding.right) {
  return `pad ${padding.top} ${padding.left}`
} else {
  return `pad ${padding.top} ${padding.right} ${padding.bottom} ${padding.left}`
}
```

**Beispiele:**

```
Uniform (pad 16):
┌──────────────────────────────┐
│ 16                           │
│    ┌──────────────────────┐  │
│ 16 │       Content        │16│
│    └──────────────────────┘  │
│                           16 │
└──────────────────────────────┘

Symmetrisch (pad 8 16):
┌──────────────────────────────┐
│ 8                            │
│    ┌──────────────────────┐  │
│ 16 │       Content        │16│
│    └──────────────────────┘  │
│                            8 │
└──────────────────────────────┘

Asymmetrisch (pad 8 16 24 16):
┌──────────────────────────────┐
│ 8                            │
│    ┌──────────────────────┐  │
│ 16 │       Content        │16│
│    └──────────────────────┘  │
│                           24 │
└──────────────────────────────┘
```

### 3b.8 Layout-Prognose Zusammenführung

Kombiniert alle Layout-Analysen zu finaler Mirror-Prognose.

```typescript
interface LayoutPrognosis {
  // Basis-Layout
  direction: 'hor' | 'ver' | 'grid' | 'stacked' | null

  // Spacing
  gap?: number
  isSpread?: boolean

  // Wrapping
  wrap?: boolean

  // Alignment
  alignment?: string[] // ['center'] oder ['tl'] etc.

  // Grid-spezifisch
  gridColumns?: number

  // Padding
  padding?: string // "pad 16" oder "pad 8 16"

  // Kinder-Sizing
  childSizing?: Array<{
    childIndex: number
    sizing: SizingPrognosis
  }>

  // Stacked-spezifisch
  stackedOverlays?: Array<{
    childIndex: number
    x: number
    y: number
  }>

  // Confidence
  confidence: number

  // Mirror DSL Fragment
  mirrorFragment: string // "hor, gap 8, ver-center, pad 16"
}

function prognoseLayout(
  parent: BoundingBox,
  children: BoundingBox[],
  image: ImageData
): LayoutPrognosis
```

**Algorithmus:**

```typescript
function prognoseLayout(parent, children, image): LayoutPrognosis {
  // 1. Stacked prüfen (hat Vorrang)
  const stacked = detectStacked(children)
  if (stacked.isStacked && stacked.confidence > 0.8) {
    return buildStackedPrognosis(stacked)
  }

  // 2. Grid prüfen
  const grid = prognoseGridColumns(children, parent.width)
  if (grid.isGrid && grid.confidence > 0.8) {
    return buildGridPrognosis(grid)
  }

  // 3. Richtung bestimmen
  const direction = detectDirection(children)

  // 4. Wrap prüfen
  const wrap = detectWrap(children, parent)

  // 5. Spacing analysieren
  const spacing = analyzeSpacing(children, parent, direction)

  // 6. Alignment bestimmen
  const alignment = detectAlignment(parent, children)
  const mirrorAlign = alignmentToMirrorProps(...)

  // 7. Padding extrahieren
  const padding = extractPadding(parent, children)

  // 8. Kinder-Sizing
  const childSizing = children.map(c => prognoseSizing(c, parent, children))

  // 9. Zusammenbauen
  return {
    direction,
    gap: spacing.type === 'gap' ? spacing.value : undefined,
    isSpread: spacing.type === 'spread',
    wrap: wrap.hasWrap,
    alignment: mirrorAlign.properties,
    padding: padding.mirrorNotation,
    childSizing,
    confidence: averageConfidence(...),
    mirrorFragment: buildMirrorFragment(...)
  }
}
```

---

## Teil 4: Typografie-Analyse

### 4.1 Text-Extraktion (OCR)

```typescript
interface TextBlock {
  text: string
  bounds: BoundingBox
  confidence: number // 0-1
  language: string
}

function extractText(image: ImageData): TextBlock[]
```

**Libraries:**

- Tesseract.js
- EasyOCR
- Google Cloud Vision
- AWS Textract

### 4.2 Font-Größe Schätzung

```typescript
interface FontSizeEstimate {
  pixels: number
  category: 'caption' | 'body' | 'subheading' | 'heading' | 'display'
}

function estimateFontSize(textBounds: BoundingBox): FontSizeEstimate
```

**Methode:** Textzeilen-Höhe messen (Baseline zu Cap-Height).

### 4.3 Font-Weight Schätzung

```typescript
type FontWeight = 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900

function estimateFontWeight(textRegion: ImageData): FontWeight
```

**Methode:**

1. Text-Pixel isolieren
2. Durchschnittliche Strichdicke messen
3. Auf Weight-Skala mappen

### 4.4 Text-Eigenschaften

```typescript
interface TextProperties {
  alignment: 'left' | 'center' | 'right' | 'justify'
  lineHeight: number // Relativ zur Font-Größe
  letterSpacing: number // Pixel zwischen Buchstaben
  isUppercase: boolean
  isItalic: boolean
  isUnderlined: boolean
  isTruncated: boolean // Endet mit "..."
  color: string
}

function analyzeTextProperties(textBlock: TextBlock, image: ImageData): TextProperties
```

### 4.5 Text-Hierarchie

```typescript
interface TextHierarchy {
  headings: TextBlock[] // Größte Texte
  subheadings: TextBlock[]
  body: TextBlock[]
  captions: TextBlock[] // Kleinste Texte
  labels: TextBlock[] // Neben Inputs
}

function classifyTextHierarchy(texts: TextBlock[]): TextHierarchy
```

---

## Teil 5: Element-Klassifikation

### 5.1 UI-Element-Typen

```typescript
type ElementType =
  | 'frame' // Container
  | 'text' // Reiner Text
  | 'button' // Klickbarer Button
  | 'input' // Textfeld
  | 'textarea' // Mehrzeiliges Textfeld
  | 'checkbox' // Checkbox
  | 'radio' // Radio Button
  | 'switch' // Toggle Switch
  | 'slider' // Range Slider
  | 'select' // Dropdown
  | 'icon' // Icon
  | 'image' // Foto/Bild
  | 'divider' // Trennlinie
  | 'card' // Card Container
  | 'avatar' // Profilbild
  | 'badge' // Kleine Markierung
  | 'chip' // Tag/Chip
  | 'tab' // Tab Button
  | 'link' // Text-Link
```

### 5.2 Klassifikations-Heuristiken

| Element      | Erkennungsmerkmale                                                         |
| ------------ | -------------------------------------------------------------------------- |
| **Button**   | Rechteck + zentrierter Text + einheitlicher Hintergrund + Hover-Affordance |
| **Input**    | Rechteck + Border + leerer/grauer Text (Placeholder) + Cursor-Bereich      |
| **Text**     | Kein umgebender Container mit eigenem Hintergrund                          |
| **Icon**     | Klein (16-32px), quadratisch, wenige Farben, oft monochrom                 |
| **Image**    | Viele Farben, fotografischer Content, größer als Icons                     |
| **Divider**  | Sehr schmal (1-2px Höhe oder Breite), volle Breite/Höhe                    |
| **Card**     | Container + Schatten + Radius + mehrere Kinder                             |
| **Checkbox** | Klein, quadratisch, Border, optional Haken-Muster                          |
| **Switch**   | Pill-Form, zwei Zustände erkennbar                                         |
| **Avatar**   | Kreisförmig, enthält Bild oder Initialen                                   |
| **Badge**    | Sehr klein, oft farbig, auf anderem Element positioniert                   |
| **Tab**      | Teil einer horizontalen Gruppe, einer aktiv markiert                       |

### 5.3 Element-Klassifikator

```typescript
interface ClassifiedElement {
  type: ElementType
  confidence: number
  bounds: BoundingBox
  properties: Record<string, unknown>
}

function classifyElement(
  bounds: BoundingBox,
  image: ImageData,
  context: {
    parent?: ClassifiedElement
    siblings?: ClassifiedElement[]
  }
): ClassifiedElement
```

### 5.4 Icon-Erkennung

```typescript
interface IconMatch {
  name: string // z.B. "check", "arrow-right"
  library: string // z.B. "lucide", "feather"
  confidence: number
  variant: 'outline' | 'filled' | 'duotone'
}

function matchIcon(iconRegion: ImageData, iconLibrary: IconLibrary): IconMatch | null
```

**Methode:** Template Matching gegen bekannte Icon-Sets.

---

## Teil 6: Effekte & Schatten

### 6.1 Schatten-Erkennung

```typescript
interface Shadow {
  offsetX: number
  offsetY: number
  blur: number
  spread: number
  color: string
  inset: boolean
}

function detectShadow(element: BoundingBox, image: ImageData): Shadow | null
```

**Methode:**

1. Bereich um Element analysieren
2. Weichzeichner-Gradient erkennen
3. Offset durch Asymmetrie bestimmen
4. Farbe aus Schatten-Region extrahieren

### 6.2 Blur-Erkennung

```typescript
interface BlurInfo {
  type: 'none' | 'gaussian' | 'backdrop'
  radius: number
}

function detectBlur(region: ImageData): BlurInfo
```

**Methode:** Hochfrequenz-Analyse - weniger Details = mehr Blur.

### 6.3 Opacity-Erkennung

```typescript
function detectOpacity(foreground: ImageData, background: ImageData): number // 0-1
```

**Methode:** Farbmischung rückwärts berechnen.

---

## Teil 7: Muster-Erkennung

### 7.1 Wiederholungs-Muster

```typescript
interface RepetitionPattern {
  type: 'list' | 'grid' | 'carousel'
  itemCount: number
  itemTemplate: BoundingBox // Repräsentatives Item
  spacing: number
}

function detectRepetition(elements: ClassifiedElement[]): RepetitionPattern | null
```

**Methode:**

1. Strukturell ähnliche Elemente finden
2. Regelmäßige Abstände prüfen
3. Als Wiederholung markieren

### 7.2 Design-Token-Extraktion

```typescript
interface DesignTokens {
  colors: {
    background: string[]
    text: string[]
    accent: string[]
    border: string[]
  }
  spacing: number[] // [4, 8, 12, 16, 24, 32]
  radii: number[] // [4, 8, 12]
  fontSizes: number[] // [12, 14, 16, 18, 24, 32]
  fontWeights: number[] // [400, 500, 700]
  shadows: Shadow[]
}

function extractDesignTokens(analysis: FullAnalysis): DesignTokens
```

**Methode:** Häufigste Werte clustern und als Tokens extrahieren.

### 7.3 Komponenten-Instanzen

```typescript
interface ComponentInstance {
  templateId: string
  instances: Array<{
    bounds: BoundingBox
    variations: Record<string, string> // Props die sich unterscheiden
  }>
}

function findComponentInstances(elements: ClassifiedElement[]): ComponentInstance[]
```

---

## Teil 8: Zustands-Erkennung

### 8.1 UI-States

```typescript
type UIState =
  | 'default'
  | 'hover'
  | 'active'
  | 'focus'
  | 'disabled'
  | 'selected'
  | 'error'
  | 'success'
  | 'loading'

interface StateIndicators {
  state: UIState
  indicators: string[] // Was deutet darauf hin
  confidence: number
}

function detectState(element: ClassifiedElement, image: ImageData): StateIndicators
```

### 8.2 State-Erkennungs-Heuristiken

| State        | Visuelle Indikatoren                                     |
| ------------ | -------------------------------------------------------- |
| **Disabled** | Reduzierte Opacity (30-50%), Grautöne, kein Hover-Effekt |
| **Selected** | Hervorhebung, Checkmark, anderer Hintergrund, Border     |
| **Error**    | Rot-Töne, Ausrufezeichen, Error-Text darunter            |
| **Success**  | Grün-Töne, Checkmark                                     |
| **Loading**  | Spinner, Skeleton, Pulsieren                             |
| **Focus**    | Sichtbarer Outline/Ring, oft blau                        |
| **Hover**    | Nur bei Multi-Frame-Analyse möglich                      |

### 8.3 Toggle-States

```typescript
interface ToggleState {
  isOn: boolean
  element: ClassifiedElement
}

function detectToggleState(element: ClassifiedElement, image: ImageData): ToggleState
```

---

## Teil 9: Semantische Regionen

### 9.1 Seiten-Regionen

```typescript
type SemanticRegion =
  | 'header'
  | 'navigation'
  | 'sidebar'
  | 'main'
  | 'footer'
  | 'modal'
  | 'toast'
  | 'toolbar'
  | 'panel'

interface RegionAnalysis {
  regions: Array<{
    type: SemanticRegion
    bounds: BoundingBox
    confidence: number
  }>
}

function detectSemanticRegions(image: ImageData, elements: ClassifiedElement[]): RegionAnalysis
```

### 9.2 Region-Heuristiken

| Region           | Erkennungsmerkmale                                         |
| ---------------- | ---------------------------------------------------------- |
| **Header**       | Oben, volle Breite, enthält Logo/Nav, Höhe < 100px         |
| **Navigation**   | Horizontal oben oder vertikal links, enthält Links/Buttons |
| **Sidebar**      | Schmal (200-300px), links oder rechts, volle Höhe          |
| **Main Content** | Größte zentrale Fläche, enthält Hauptinhalt                |
| **Footer**       | Unten, volle Breite, kleinerer/grauer Text                 |
| **Modal**        | Zentriert, Schatten, abgedunkelter Hintergrund dahinter    |
| **Toast**        | Klein, Ecke (meist unten-rechts), temporär aussehend       |
| **Toolbar**      | Horizontale Reihe von Icons/Buttons, meist oben            |

### 9.3 Formular-Erkennung

```typescript
interface FormAnalysis {
  fields: Array<{
    label: TextBlock
    input: ClassifiedElement
    type: 'text' | 'email' | 'password' | 'number' | 'select' | 'checkbox' | 'radio'
    required: boolean // Asterisk erkannt
    error?: TextBlock
  }>
  submitButton?: ClassifiedElement
}

function analyzeForm(region: BoundingBox, elements: ClassifiedElement[]): FormAnalysis
```

---

## Teil 10: Erweiterte Analysen

### 10.1 Symmetrie-Analyse

```typescript
interface SymmetryAnalysis {
  horizontalSymmetry: number // 0-1
  verticalSymmetry: number // 0-1
  radialSymmetry: number // 0-1
  centerOfMass: { x: number; y: number }
}

function analyzeSymmetry(image: ImageData): SymmetryAnalysis
```

### 10.2 Visual Balance

```typescript
interface BalanceAnalysis {
  weightDistribution: {
    topLeft: number
    topRight: number
    bottomLeft: number
    bottomRight: number
  }
  isBalanced: boolean
  focalPoint: { x: number; y: number }
}

function analyzeBalance(image: ImageData, elements: ClassifiedElement[]): BalanceAnalysis
```

### 10.3 Whitespace-Analyse

```typescript
interface WhitespaceAnalysis {
  totalWhitespace: number // Prozent
  breathingRoom: 'cramped' | 'comfortable' | 'spacious'
  largestWhitespaceRegion: BoundingBox
  whitespaceDistribution: 'even' | 'top-heavy' | 'bottom-heavy' | 'left-heavy' | 'right-heavy'
}

function analyzeWhitespace(image: ImageData, elements: ClassifiedElement[]): WhitespaceAnalysis
```

### 10.4 Accessibility-Metriken

```typescript
interface AccessibilityReport {
  contrastIssues: Array<{
    element: ClassifiedElement
    ratio: number
    required: number // 4.5 für Text, 3 für große Text
    passes: boolean
  }>
  touchTargetIssues: Array<{
    element: ClassifiedElement
    size: { width: number; height: number }
    minimumRequired: number // 44px
  }>
  colorBlindnessSimulation: {
    protanopia: ImageData
    deuteranopia: ImageData
    tritanopia: ImageData
  }
}

function analyzeAccessibility(image: ImageData, elements: ClassifiedElement[]): AccessibilityReport
```

### 10.5 Platform-Erkennung

```typescript
type Platform = 'ios' | 'android' | 'web' | 'macos' | 'windows' | 'unknown'
type DesignSystem = 'material' | 'ios' | 'fluent' | 'custom'

interface PlatformAnalysis {
  platform: Platform
  designSystem: DesignSystem
  confidence: number
  indicators: string[]
}

function detectPlatform(image: ImageData, elements: ClassifiedElement[]): PlatformAnalysis
```

---

## Teil 11: Multi-Frame-Analyse

### 10.1 State-Transitions

```typescript
interface StateTransition {
  from: ImageData
  to: ImageData
  changes: Array<{
    element: ClassifiedElement
    property: string
    fromValue: unknown
    toValue: unknown
  }>
  animationType?: 'fade' | 'slide' | 'scale' | 'none'
}

function analyzeTransition(frame1: ImageData, frame2: ImageData): StateTransition
```

### 11.2 Hover-State-Extraktion

```typescript
interface HoverAnalysis {
  element: ClassifiedElement
  normalState: Record<string, unknown>
  hoverState: Record<string, unknown>
  changes: string[] // ['bg', 'shadow', 'scale']
}

function extractHoverState(normal: ImageData, hovered: ImageData): HoverAnalysis
```

### 11.3 Animation-Erkennung

```typescript
interface AnimationAnalysis {
  type: 'position' | 'opacity' | 'scale' | 'rotation' | 'color'
  duration?: number // Wenn Frame-Timing bekannt
  easing?: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out'
  keyframes: Array<{
    frame: number
    value: unknown
  }>
}

function analyzeAnimation(frames: ImageData[]): AnimationAnalysis
```

---

## Teil 12: Output-Formate

### 12.1 Vollständige Analyse

```typescript
interface FullAnalysis {
  // Meta
  imageSize: { width: number; height: number }
  analyzedAt: Date

  // Farben
  palette: ColorPalette
  gradients: Gradient[]

  // Geometrie
  elements: ClassifiedElement[]
  hierarchy: HierarchyNode

  // Layout
  layouts: Map<string, LayoutInfo>
  alignments: Map<string, AlignmentInfo>

  // Typografie
  textBlocks: TextBlock[]
  textHierarchy: TextHierarchy

  // Effekte
  shadows: Map<string, Shadow>
  blurs: Map<string, BlurInfo>

  // Patterns
  repetitions: RepetitionPattern[]
  designTokens: DesignTokens

  // Semantik
  regions: RegionAnalysis
  states: Map<string, StateIndicators>

  // Metriken
  accessibility: AccessibilityReport
  platform: PlatformAnalysis
}
```

### 12.2 LLM-Prompt-Format

```typescript
function formatForLLM(analysis: FullAnalysis): string {
  return `
## Bild-Analyse

### Abmessungen
${analysis.imageSize.width}x${analysis.imageSize.height}px

### Farbpalette
${analysis.palette.colors.map(c => `- ${c.hex} (${c.percentage}%)`).join('\n')}

### Element-Hierarchie
${formatHierarchy(analysis.hierarchy)}

### Design-Tokens
- Spacing: ${analysis.designTokens.spacing.join(', ')}px
- Radii: ${analysis.designTokens.radii.join(', ')}px
- Font-Sizes: ${analysis.designTokens.fontSizes.join(', ')}px

### Erkannte Elemente
${analysis.elements.map(formatElement).join('\n')}

### Texte
${analysis.textBlocks.map(t => `- "${t.text}" @ (${t.bounds.x}, ${t.bounds.y})`).join('\n')}

---

Generiere Mirror DSL Code für dieses UI.
`
}
```

### 12.3 Mirror DSL Output

```mirror
// Generiert aus Screenshot
// Analysiert: 2024-01-15

// Design Tokens
s.pad: 4
m.pad: 8
l.pad: 16

s.rad: 4
m.rad: 8

accent.bg: #5BA8F5
surface.bg: #27272a
text.col: #ffffff

// Layout
Frame bg $surface, pad $l, gap $m, rad $m
  Text "Welcome", fs 24, weight bold, col $text
  Text "Get started with Mirror", fs 14, col #a1a1aa
  Button "Continue", bg $accent, col white, pad $m $l, rad $s
```

---

## Implementierungs-Prioritäten

### Phase 1: Core (MVP)

1. **ColorAnalyzer** - Palette, dominante Farben, Hintergrund/Text-Trennung
2. **GeometryAnalyzer** - Bounding Boxes, Abstände, Element-Extraktion
3. **LayoutAnalyzer** - Hierarchie, Richtung (hor/ver)
4. **BasicClassifier** - Frame, Text, Button, Icon

### Phase 2: Layout-Prognose (Mirror-spezifisch)

5. **SizingAnalyzer** - fixed/full/hug/grow Klassifikation
6. **AlignmentAnalyzer** - 9-Position-Grid (tl, tc, tr, cl, center, cr, bl, bc, br)
7. **SpacingAnalyzer** - Gap vs Spread Unterscheidung
8. **PaddingExtractor** - Padding-Werte aus Containern

### Phase 3: Erweiterte Layout-Features

9. **StackedDetector** - Overlays, Badges, Layering erkennen
10. **GridAnalyzer** - 12-Spalten-System, Grid-Prognose
11. **WrapDetector** - Wrap-Verhalten erkennen
12. **PatternAnalyzer** - Listen, Repeating Elements

### Phase 4: Typography & Styling

13. **TypographyAnalyzer** - OCR, Font-Größen, Gewichte
14. **EffectAnalyzer** - Schatten, Radius, Blur
15. **TokenExtractor** - Design-System-Tokens gruppieren
16. **IconMatcher** - Lucide-Icons identifizieren

### Phase 5: Advanced

17. **StateAnalyzer** - UI-States (hover, selected, disabled)
18. **SemanticAnalyzer** - Regionen, Formulare, Navigation
19. **ComponentMatcher** - Bekannte Komponenten-Patterns
20. **AccessibilityChecker** - WCAG-Prüfung

### Phase 6: Premium

21. **MultiFrameAnalyzer** - Transitions, Hover-States
22. **AnimationDetector** - Animationen
23. **PlatformDetector** - iOS/Android/Web
24. **ZagComponentMatcher** - Dialog, Tabs, Select erkennen

---

## Technologie-Stack

### Bildverarbeitung

- **OpenCV.js** - Contours, Edge Detection
- **Sharp** - Image Processing (Node.js)
- **Jimp** - Pure JavaScript Image Processing

### OCR

- **Tesseract.js** - Open Source OCR
- **EasyOCR** - Python, besser für UI-Text
- **Cloud Vision** - Google API (optional)

### Machine Learning (optional)

- **TensorFlow.js** - Element-Klassifikation
- **ONNX Runtime** - Pre-trained Models

### Output

- **JSON** - Strukturierte Analyse
- **Mirror DSL** - Finale Ausgabe

---

## Nächste Schritte

### Abgeschlossen

- [x] Test-System implementiert (`tools/image-to-mirror-test/`)
- [x] 24 Test-Fixtures erstellt (basic, layout, styling, typography, component, complex)
- [x] Renderer: Mirror → PNG Screenshot
- [x] Comparator: AST-basierter Code-Vergleich
- [x] CLI mit Level-Filter, Tags, Pattern-Matching

### Phase 1: Core Analyzer

1. [ ] ColorAnalyzer implementieren (Palette-Extraktion)
2. [ ] GeometryAnalyzer implementieren (Bounding Boxes)
3. [ ] BasicClassifier bauen (Frame, Text, Button)
4. [ ] JSON-Output definieren (AnalysisResult)

### Phase 2: Layout-Prognose

5. [ ] SizingAnalyzer (fixed/full/hug/grow)
6. [ ] AlignmentAnalyzer (9-Position + spread)
7. [ ] SpacingAnalyzer (gap vs spread)
8. [ ] StackedDetector (Overlays, Badges)

### Phase 3: Integration

9. [ ] LLM-Prompt für Ambiguitäten
10. [ ] Hybrid-Pipeline zusammenführen
11. [ ] Confidence-Scores kalibrieren
12. [ ] Iterativ verbessern mit Test-Feedback

---

_Dokument erstellt: Januar 2024_
_Letzte Aktualisierung: April 2026_
_Status: Test-System fertig, Analyzer in Entwicklung_
