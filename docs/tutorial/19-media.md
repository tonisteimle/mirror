---
title: Media & Files
subtitle: Avatar, FileUpload, Carousel, ImageCropper und SignaturePad
prev: 18-datetime
next: 20-feedback
---

Komponenten für Medien und Dateien. **Avatar** zeigt Profilbilder mit Fallback. **FileUpload** ermöglicht Drag & Drop. **Carousel** ist ein Slider. **ImageCropper** schneidet Bilder zu. **SignaturePad** erfasst Unterschriften.

## Avatar

Profilbild mit automatischem Fallback auf Initialen.

```mirror
Avatar src "/avatar.jpg", name "Max Mustermann"
  Root: w 48, h 48, rad 99, clip
  Image: w full, h full
  Fallback: w full, h full, bg #2563eb, center
    Text "MM", col white, weight 500
```

### Verschiedene Größen

```mirror
Frame hor, gap 12

  Avatar name "Anna Schmidt"
    Root: w 32, h 32, rad 99, clip
    Fallback: w full, h full, bg #10b981, center
      Text "AS", col white, fs 12

  Avatar name "Ben Weber"
    Root: w 48, h 48, rad 99, clip
    Fallback: w full, h full, bg #f59e0b, center
      Text "BW", col white, fs 14

  Avatar name "Clara Müller"
    Root: w 64, h 64, rad 99, clip
    Fallback: w full, h full, bg #ef4444, center
      Text "CM", col white, fs 18
```

### Mit Status-Indikator

```mirror
Frame stacked, w 48, h 48
  Avatar name "Online User"
    Root: w 48, h 48, rad 99, clip
    Fallback: w full, h full, bg #2563eb, center
      Text "OU", col white

  Frame x 34, y 34, w 14, h 14, bg #10b981, rad 99, bor 2, boc #0a0a0a
```

### Props

| Prop | Typ | Beschreibung |
|------|-----|--------------|
| `src` | string | Bild-URL |
| `name` | string | Name für Initialen |

### Slots

| Slot | Beschreibung |
|------|--------------|
| `Root:` | Container |
| `Image:` | Das Bild |
| `Fallback:` | Anzeige wenn kein Bild |

---

## FileUpload

Datei-Upload mit Drag & Drop und Vorschau.

```mirror
FileUpload multiple, accept "image/*"
  Root: gap 12

  Dropzone: bor 2, boc #333, rad 12, pad 32, center, gap 8, cursor pointer
    border-style dashed
    dragging:
      boc #2563eb
      bg #1e3a5f
    Icon "upload", ic #666, is 32
    Text "Dateien hierher ziehen", col #888
    Text "oder klicken zum Auswählen", col #666, fs 12

  ItemGroup: gap 8
  Item: hor, gap 12, bg #1a1a1a, pad 12, rad 8
  ItemPreview: w 48, h 48, rad 4, clip
  ItemPreviewImage: w full, h full
  ItemName: col white, fs 14, truncate, w 150
  ItemSizeText: col #666, fs 12
  ItemDeleteTrigger: margin 0 0 0 auto, pad 8, col #888, cursor pointer
    hover:
      col #ef4444
    Icon "x", is 16
```

### Einfacher Upload-Button

```mirror
FileUpload
  Trigger: Button pad 12 24, bg #2563eb, col white, rad 8
    Icon "upload", is 18, margin 0 8 0 0
    "Datei hochladen"
```

### Mit Einschränkungen

```mirror
FileUpload maxFiles 3, maxFileSize 5242880, accept ".pdf,.doc,.docx"
  Dropzone: bor 2, boc #333, rad 8, pad 24, center, gap 4
    border-style dashed
    Icon "file-text", ic #666, is 24
    Text "Max. 3 Dateien, je 5MB", col #666, fs 12
    Text "PDF, DOC, DOCX", col #888, fs 11
```

### Props

| Prop | Typ | Beschreibung |
|------|-----|--------------|
| `accept` | string | Erlaubte Dateitypen |
| `multiple` | boolean | Mehrere Dateien |
| `maxFiles` | number | Maximum Dateien |
| `maxFileSize` | number | Max. Größe in Bytes |
| `minFileSize` | number | Min. Größe in Bytes |
| `disabled` | boolean | Deaktiviert |
| `allowDrop` | boolean | Drag & Drop erlaubt |
| `directory` | boolean | Ordner-Upload |

### Slots

| Slot | Beschreibung |
|------|--------------|
| `Root:` | Container |
| `Dropzone:` | Drop-Bereich |
| `Trigger:` | Upload-Button |
| `ItemGroup:` | Datei-Liste |
| `Item:` | Einzelne Datei |
| `ItemName:` | Dateiname |
| `ItemSizeText:` | Dateigröße |
| `ItemPreview:` | Vorschau-Container |
| `ItemPreviewImage:` | Vorschau-Bild |
| `ItemDeleteTrigger:` | Löschen-Button |

### States

| State | Beschreibung |
|-------|--------------|
| `dragging:` | Datei wird über Dropzone gezogen |
| `accepted:` | Datei akzeptiert |
| `rejected:` | Datei abgelehnt |

---

## Carousel

Slider für Bilder oder beliebige Inhalte.

```mirror
Carousel
  Root: w 400, gap 12

  ItemGroup: rad 12, clip
  Item: w full, shrink
    Image src "/slide1.jpg", w full, h 250

  Control: hor, spread, ver-center, pad 0 8
  PrevTrigger: w 40, h 40, bg rgba(0,0,0,0.5), rad 99, center, cursor pointer
    hover:
      bg rgba(0,0,0,0.8)
    Icon "chevron-left", ic white, is 20
  NextTrigger: w 40, h 40, bg rgba(0,0,0,0.5), rad 99, center, cursor pointer
    hover:
      bg rgba(0,0,0,0.8)
    Icon "chevron-right", ic white, is 20

  IndicatorGroup: hor, gap 8, center
  Indicator: w 8, h 8, bg #666, rad 99, cursor pointer
    current:
      bg white
```

### Autoplay

```mirror
Carousel autoplay, autoplayInterval 3000, loop
  ItemGroup: rad 12, clip
  Item: w full
    // Slide-Inhalte

  AutoplayTrigger: pad 8, bg #333, rad 4
    playing:
      Icon "pause", ic white, is 16
    paused:
      Icon "play", ic white, is 16
```

### Mehrere Slides sichtbar

```mirror
Carousel slidesPerView 3, spacing 16
  ItemGroup: hor
  Item: w 200, shrink
    Frame bg #1a1a1a, rad 8, pad 16, h 120, center
      Text "Slide", col white
```

### Props

| Prop | Typ | Beschreibung |
|------|-----|--------------|
| `index` | number | Aktiver Slide |
| `defaultIndex` | number | Start-Slide |
| `loop` | boolean | Endlos-Loop |
| `slidesPerView` | number | Sichtbare Slides |
| `spacing` | number | Abstand zwischen Slides |
| `orientation` | "horizontal" \| "vertical" | Richtung |
| `autoplay` | boolean | Automatisch wechseln |
| `autoplayInterval` | number | Intervall in ms |
| `align` | "start" \| "center" \| "end" | Ausrichtung |

### Slots

| Slot | Beschreibung |
|------|--------------|
| `Root:` | Container |
| `ItemGroup:` | Slide-Container |
| `Item:` | Einzelner Slide |
| `Control:` | Navigation-Container |
| `PrevTrigger:` | Zurück-Button |
| `NextTrigger:` | Weiter-Button |
| `IndicatorGroup:` | Dots-Container |
| `Indicator:` | Einzelner Dot |
| `AutoplayTrigger:` | Play/Pause-Button |

---

## ImageCropper

Bild zuschneiden mit Zoom und Rotation.

```mirror
ImageCropper src "/photo.jpg", aspectRatio 1
  Root: gap 16

  Image: w 300, h 300
  Overlay: bg rgba(0,0,0,0.5)
  Cropper: bor 2, boc white

  Frame hor, gap 8, ver-center
    ZoomOutTrigger: pad 8, bg #333, rad 4
      Icon "minus", ic white, is 16
    ZoomSlider: w 120
      Track: h 4, bg #333, rad 2
      Range: bg #2563eb
      Thumb: w 16, h 16, bg white, rad 99
    ZoomInTrigger: pad 8, bg #333, rad 4
      Icon "plus", ic white, is 16
    RotateTrigger: pad 8, bg #333, rad 4
      Icon "rotate-cw", ic white, is 16
```

### Props

| Prop | Typ | Beschreibung |
|------|-----|--------------|
| `src` | string | Bild-URL |
| `aspectRatio` | number | Seitenverhältnis (z.B. 1, 16/9) |
| `zoom` | number | Zoom-Stufe |
| `defaultZoom` | number | Start-Zoom |
| `minZoom` | number | Minimum Zoom |
| `maxZoom` | number | Maximum Zoom |
| `rotation` | number | Rotation in Grad |
| `disabled` | boolean | Deaktiviert |

### Slots

| Slot | Beschreibung |
|------|--------------|
| `Root:` | Container |
| `Image:` | Das Bild |
| `Overlay:` | Dunkler Bereich außerhalb |
| `Cropper:` | Zuschnitt-Rahmen |
| `Guide:` | Hilfslinien (Drittel-Regel) |
| `ZoomSlider:` | Zoom-Regler |
| `ZoomInTrigger:` | Zoom+ Button |
| `ZoomOutTrigger:` | Zoom- Button |
| `RotateTrigger:` | Drehen-Button |
| `CenterTrigger:` | Zentrieren-Button |

---

## SignaturePad

Unterschrift zeichnen.

```mirror
SignaturePad
  Root: gap 12

  Control: w 400, h 200, bg #1a1a1a, bor 1, boc #333, rad 8, relative
  Segment: w full, h full
  Guide: absolute, bottom 40, left 40, right 40, h 1, bg #333
    Text "Unterschrift", col #666, fs 11, absolute, bottom 8

  ClearTrigger: pad 10 20, bg #333, col white, rad 6
    Icon "trash", is 16, margin 0 8 0 0
    "Löschen"
```

### Props

| Prop | Typ | Beschreibung |
|------|-----|--------------|
| `disabled` | boolean | Deaktiviert |
| `readOnly` | boolean | Nur Anzeige |
| `drawing` | object | Zeichnungs-Einstellungen |

### Slots

| Slot | Beschreibung |
|------|--------------|
| `Root:` | Container |
| `Control:` | Zeichenfläche |
| `Segment:` | SVG für Linien |
| `SegmentPath:` | Einzelne Linie |
| `Guide:` | Hilfslinie |
| `ClearTrigger:` | Löschen-Button |

---

## Zusammenfassung

| Komponente | Verwendung |
|------------|-----------|
| `Avatar` | Profilbild mit Fallback |
| `FileUpload` | Datei-Upload mit Drag & Drop |
| `Carousel` | Bild-/Content-Slider |
| `ImageCropper` | Bild zuschneiden |
| `SignaturePad` | Unterschrift zeichnen |

**Gemeinsame Patterns:** Alle Komponenten unterstützen States für Interaktionen (dragging, loading, etc.)
