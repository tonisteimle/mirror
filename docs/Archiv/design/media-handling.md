# Media Handling

## Status: Konzept

Dieses Dokument beschreibt das Medien-System für Mirror.

---

## DSL-Syntax

### Image-Komponente

```
Image "filename.png"
Image "filename.png" 300 400
Image "filename.png" 300 400 fit cover rad 12
Image "filename.png" alt "Beschreibung" 300 400
```

**Regeln:**
- Der String nach `Image` ist der Dateiname (relativ zu `/media/`)
- Zwei Zahlen nach dem String sind `w h` (Breite, Höhe in Pixel)
- Weitere Properties folgen wie gewohnt

### Beispiele

```
// Minimal
Image "hero.jpg"

// Mit Dimensionen
Image "hero.jpg" 1200 600

// Mit Properties
Image "hero.jpg" 1200 600 fit cover rad 16

// Mit Alt-Text
Image "avatar.png" alt "Profilbild" 48 48 rad 24

// In einer Card
Card pad 16 rad 12
  Image "product.jpg" 300 200 fit cover rad 8
  Title "Produkt Name"
  Price "$99"
```

---

## Editor-Integration

### Drag & Drop

**Das zentrale Konzept:** Bild in den Editor ziehen → fertig.

#### Ablauf

1. User zieht Bild-Datei(en) in den Code-Editor
2. Datei wird nach `public/media/` kopiert
3. An der Cursor-Position wird eingefügt:
   ```
   Image "photo.png" 1200 800
   ```

#### Intelligentes Einfügen

| Cursor-Position | Verhalten |
|-----------------|-----------|
| Leere Zeile | Neue `Image`-Zeile einfügen |
| Zeile mit `Image` | Dateiname ersetzen |
| In einer Komponente (eingerückt) | `Image` mit passender Einrückung einfügen |

#### Mehrere Bilder

Mehrere Dateien gleichzeitig droppen:

```
Image "photo1.png" 400 300
Image "photo2.png" 400 300
Image "photo3.png" 400 300
```

### Automatische Dimensionen

Beim Drop wird die Bildgröße ausgelesen und als `w h` eingefügt. Der User kann diese anpassen oder entfernen.

---

## Speicherung

### Ordnerstruktur

```
project/
  public/
    media/
      hero.jpg
      avatar.png
      icons/
        arrow.svg
        check.svg
```

### Pfad-Auflösung

| DSL | Aufgelöster Pfad |
|-----|------------------|
| `"photo.png"` | `/media/photo.png` |
| `"icons/arrow.svg"` | `/media/icons/arrow.svg` |

### Datei-Handling

- **Duplikate:** Bei gleichem Namen wird nummeriert (`photo.png` → `photo-1.png`)
- **Formate:** `jpg`, `jpeg`, `png`, `gif`, `svg`, `webp`
- **Max. Größe:** Empfehlung 5MB (konfigurierbar)

---

## Technische Umsetzung

### Drop-Event Handler

```typescript
// Pseudo-Code
editor.on('drop', async (event) => {
  const files = event.dataTransfer.files

  for (const file of files) {
    if (isImageFile(file)) {
      // 1. Datei nach public/media/ kopieren
      const filename = await saveToMedia(file)

      // 2. Dimensionen auslesen
      const { width, height } = await getImageDimensions(file)

      // 3. DSL-Code generieren
      const code = `Image "${filename}" ${width} ${height}`

      // 4. An Cursor-Position einfügen
      insertAtCursor(code)
    }
  }
})
```

### Render-Implementierung

```typescript
// Im Generator: Image-Komponente erkennen
if (node.name === 'Image' && node.content) {
  const src = `/media/${node.content}`
  const width = node.properties.w
  const height = node.properties.h
  const fit = node.properties.fit || 'cover'
  const alt = node.properties.alt || ''

  return (
    <img
      src={src}
      width={width}
      height={height}
      style={{ objectFit: fit, ...otherStyles }}
      alt={alt}
    />
  )
}
```

---

## Vorteile

1. **Intuitiv:** Drag & Drop wie in jedem Design-Tool
2. **Schnell:** Keine Dialoge, keine Umwege
3. **Konsistent:** String-Syntax wie bei anderen Komponenten (`Button "Click"`)
4. **Flexibel:** Alle Properties kombinierbar

---

## Offene Punkte / Erweiterungen

- [ ] Platzhalter-Bilder für Prototyping (`Image placeholder 300 200`)
- [ ] Bildoptimierung beim Upload (Resize, Kompression)
- [ ] Medien-Panel zur Übersicht aller Bilder
- [ ] Clipboard-Paste Support (Screenshot einfügen)
- [ ] Remote URLs erlauben (`Image "https://..."`)
