---
title: Utility
subtitle: Clipboard, QRCode, ScrollArea und Splitter
prev: 20-feedback
next: false
---

Utility-Komponenten für spezielle Anwendungsfälle. **Clipboard** kopiert Text in die Zwischenablage. **QRCode** generiert QR-Codes. **ScrollArea** bietet custom Scrollbars. **Splitter** teilt Bereiche mit verstellbarer Größe.

## Clipboard

Kopiert Text in die Zwischenablage mit visuellem Feedback.

```mirror
Clipboard value "npm install mirror-lang"
  Root: hor, gap 0, bg #1a1a1a, bor 1, boc #333, rad 8
  Input: w 250, bg transparent, col white, pad 12, bor 0, readonly
  Trigger: pad 12, bor 0 0 0 1, boc #333, col #888, cursor pointer
    hover:
      col white
    Icon "copy", is 18
  Indicator: pad 12, bor 0 0 0 1, boc #333
    copied:
      Icon "check", ic #10b981, is 18
```

### Kompakter Button

```mirror
Clipboard value "https://example.com/share/abc123"
  Trigger: hor, gap 8, pad 10 16, bg #1a1a1a, rad 8, cursor pointer
    hover:
      bg #333
    Icon "link", ic #888, is 16
    Text "Link kopieren", col white, fs 13
  Indicator
    copied:
      Icon "check", ic #10b981, is 16
      Text "Kopiert!", col #10b981, fs 13
```

### Mit Label

```mirror
Clipboard value "sk_live_abc123..."
  Root: gap 4
  Label: col #888, fs 12
    "API Key"
  Control: hor, gap 0, bg #1a1a1a, bor 1, boc #333, rad 8
  Input: w full, bg transparent, col white, pad 12, bor 0, font mono, fs 13
  Trigger: pad 12, col #888
    Icon "copy", is 16
```

### Props

| Prop | Typ | Beschreibung |
|------|-----|--------------|
| `value` | string | Zu kopierender Text |
| `timeout` | number | Feedback-Dauer in ms |

### Slots

| Slot | Beschreibung |
|------|--------------|
| `Root:` | Container |
| `Label:` | Label |
| `Control:` | Input + Button Container |
| `Input:` | Textfeld (readonly) |
| `Trigger:` | Kopieren-Button |
| `Indicator:` | Feedback nach Kopieren |

### States

| State | Beschreibung |
|-------|--------------|
| `copied:` | Nach erfolgreichem Kopieren |

---

## QRCode

Generiert einen QR-Code aus Text oder URL.

```mirror
QRCode value "https://example.com"
  Root: bg white, pad 16, rad 12
  Frame: w 200, h 200
  Pattern: fill black
```

### Mit Logo-Overlay

```mirror
QRCode value "https://example.com"
  Root: bg white, pad 16, rad 12, stacked
  Frame: w 200, h 200
  Pattern: fill black
  Overlay: w 50, h 50, bg white, rad 8, center, x 75, y 75
    Image src "/logo.png", w 40, h 40
```

### Verschiedene Größen

```mirror
Frame hor, gap 16

  QRCode value "Small"
    Root: bg white, pad 8, rad 8
    Frame: w 80, h 80

  QRCode value "Medium"
    Root: bg white, pad 12, rad 8
    Frame: w 120, h 120

  QRCode value "Large"
    Root: bg white, pad 16, rad 12
    Frame: w 180, h 180
```

### Mit Download

```mirror
Frame gap 12, center

  QRCode value "https://example.com/download"
    Root: bg white, pad 16, rad 12
    Frame: w 160, h 160

  Button "QR-Code herunterladen", pad 12 24, bg #2563eb, col white, rad 8
    Icon "download", is 16, margin 0 8 0 0
```

### Props

| Prop | Typ | Beschreibung |
|------|-----|--------------|
| `value` | string | Zu kodierender Text/URL |
| `encoding` | string | Kodierung |
| `errorCorrection` | "L" \| "M" \| "Q" \| "H" | Fehlerkorrektur-Level |

### Slots

| Slot | Beschreibung |
|------|--------------|
| `Root:` | Container |
| `Frame:` | SVG Container |
| `Pattern:` | QR-Code Pattern |
| `Overlay:` | Overlay (z.B. Logo) |

---

## ScrollArea

Custom Scrollbars – ersetzt die Browser-Scrollbars.

```mirror
ScrollArea
  Root: w 300, h 200, bg #1a1a1a, rad 8
  Viewport: pad 16
  Content: gap 8
    // Viele Inhalte hier
    each i in [1..20]
      Text "Zeile " + i, col white, fs 14

  Scrollbar: w 8, bg #252525, rad 4, margin 4
    orientation "vertical"
  Thumb: bg #666, rad 4
    hover:
      bg #888
```

### Horizontaler Scroll

```mirror
ScrollArea orientation "horizontal"
  Root: w 400, bg #1a1a1a, rad 8
  Viewport: pad 16
  Content: hor, gap 16
    each i in [1..10]
      Frame w 150, h 100, bg #333, rad 8, shrink, center
        Text "Item " + i, col white

  Scrollbar: h 8, bg #252525, rad 4, margin 4
  Thumb: bg #666, rad 4
```

### Beide Richtungen

```mirror
ScrollArea
  Root: w 300, h 200, bg #1a1a1a, rad 8
  Viewport: pad 16
  Content: w 500, gap 8
    each i in [1..30]
      Text "Diese Zeile ist sehr lang und erzwingt horizontales Scrollen - Zeile " + i, col white, fs 14

  Scrollbar: bg #252525, rad 4, margin 4
    orientation "vertical"
      w 8
    orientation "horizontal"
      h 8
  Thumb: bg #666, rad 4
  Corner: bg #252525
```

### Props

| Prop | Typ | Beschreibung |
|------|-----|--------------|
| `orientation` | "vertical" \| "horizontal" \| "both" | Scroll-Richtung |
| `scrollHideDelay` | number | Verzögerung bis Ausblenden |

### Slots

| Slot | Beschreibung |
|------|--------------|
| `Root:` | Container |
| `Viewport:` | Sichtbarer Bereich |
| `Content:` | Scrollbarer Inhalt |
| `Scrollbar:` | Scrollbar-Track |
| `Thumb:` | Scrollbar-Griff |
| `Corner:` | Ecke (bei beide Richtungen) |

---

## Splitter

Teilbare Bereiche mit verstellbarer Größe.

```mirror
Splitter orientation "horizontal"
  Root: w full, h 400, bg #0a0a0a

  Panel: bg #1a1a1a, pad 16
    id "left"
    defaultSize 30
    minSize 20
    Text "Linker Bereich", col white

  ResizeTrigger: w 4, bg #333, cursor col-resize
    hover:
      bg #2563eb
    dragging:
      bg #2563eb

  Panel: bg #1a1a1a, pad 16
    id "right"
    Text "Rechter Bereich", col white
```

### Vertikaler Splitter

```mirror
Splitter orientation "vertical"
  Root: w 400, h 300

  Panel: bg #1a1a1a, pad 16
    id "top"
    defaultSize 40
    Text "Oben", col white

  ResizeTrigger: h 4, bg #333, cursor row-resize
    hover:
      bg #2563eb

  Panel: bg #1a1a1a, pad 16
    id "bottom"
    Text "Unten", col white
```

### Drei Bereiche

```mirror
Splitter
  Root: w full, h 300

  Panel: bg #1a1a1a, pad 16
    id "sidebar"
    defaultSize 20
    minSize 15
    maxSize 30
    Text "Sidebar", col white

  ResizeTrigger: w 4, bg #333, cursor col-resize

  Panel: bg #252525, pad 16
    id "main"
    Text "Main Content", col white

  ResizeTrigger: w 4, bg #333, cursor col-resize

  Panel: bg #1a1a1a, pad 16
    id "inspector"
    defaultSize 25
    minSize 20
    Text "Inspector", col white
```

### Mit Collapse

```mirror
Splitter
  Root: w full, h 300

  Panel: bg #1a1a1a, pad 16
    id "sidebar"
    defaultSize 25
    collapsible
    collapsedSize 0
    Frame hor, spread, ver-center
      Text "Sidebar", col white
      Button pad 4, bg transparent, col #888, collapse("sidebar")
        Icon "chevron-left", is 16

  ResizeTrigger: w 4, bg #333, cursor col-resize

  Panel: bg #252525, pad 16
    Text "Main", col white
```

### Props

| Prop | Typ | Beschreibung |
|------|-----|--------------|
| `orientation` | "horizontal" \| "vertical" | Teilungs-Richtung |

### Panel Props

| Prop | Typ | Beschreibung |
|------|-----|--------------|
| `id` | string | Panel-ID |
| `defaultSize` | number | Startgröße in % |
| `minSize` | number | Minimalgröße in % |
| `maxSize` | number | Maximalgröße in % |
| `collapsible` | boolean | Kann eingeklappt werden |
| `collapsedSize` | number | Größe wenn eingeklappt |

### Slots

| Slot | Beschreibung |
|------|--------------|
| `Root:` | Container |
| `Panel:` | Einzelner Bereich |
| `ResizeTrigger:` | Drag-Handle |

### States

| State | Beschreibung |
|-------|--------------|
| `dragging:` | Während Größenänderung |

---

## Praktisch: Code-Editor Layout

```mirror
Splitter
  Root: w full, h 500, bg #0a0a0a

  // File Tree
  Panel: bg #111
    id "files"
    defaultSize 20
    minSize 15

    Frame pad 12, gap 4
      Text "EXPLORER", col #888, fs 10, uppercase, weight 600
      Frame gap 2, margin 8 0 0 0
        Frame hor, gap 8, pad 6, rad 4, cursor pointer
          hover:
            bg #252525
          Icon "folder", ic #f59e0b, is 14
          Text "src", col white, fs 13
        Frame hor, gap 8, pad 6 6 6 24, rad 4, cursor pointer
          hover:
            bg #252525
          Icon "file", ic #888, is 14
          Text "index.ts", col white, fs 13

  ResizeTrigger: w 1, bg #333
    hover:
      bg #2563eb

  // Editor
  Panel: bg #1a1a1a
    id "editor"

    Frame pad 16
      Text "// Code hier...", col #888, fs 14, font mono

  ResizeTrigger: w 1, bg #333
    hover:
      bg #2563eb

  // Terminal
  Panel: bg #111
    id "terminal"
    defaultSize 25
    minSize 15
    collapsible

    Frame gap 0
      Frame hor, pad 8 12, bg #1a1a1a, bor 0 0 1 0, boc #333
        Text "TERMINAL", col #888, fs 10, uppercase
      Frame pad 12
        Text "$ npm run dev", col #10b981, fs 13, font mono
```

---

## Zusammenfassung

| Komponente | Verwendung |
|------------|-----------|
| `Clipboard` | Text in Zwischenablage kopieren |
| `QRCode` | QR-Code generieren |
| `ScrollArea` | Custom Scrollbars |
| `Splitter` | Verstellbare Bereiche |

**Clipboard-States:** `copied:` nach Kopieren

**Splitter-States:** `dragging:` während Resize
