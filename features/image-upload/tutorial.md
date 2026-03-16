# Tutorial: Bilder im Playground

Dieses Kapitel zeigt, wie du Bilder in deinen Mirror-Prototypen einfügst - ohne manuelles Hochladen oder Copy-Paste von URLs.

## Das Problem

Du baust eine Team-Website und brauchst Fotos:

```mirror
Person
  name "Anna Schmidt"
  avatar ???    // Woher kommt das Bild?
```

Normalerweise müsstest du:
1. Bild zu einem Hosting-Service hochladen
2. URL kopieren
3. In Code einfügen

**Mit Mirror:** Einfach das Bild auf den Editor ziehen.

## Drag & Drop

### Bild einfügen

1. Öffne den Playground
2. Positioniere den Cursor wo die URL hin soll
3. Ziehe ein Bild aus dem Finder/Explorer auf den Editor

```
┌─────────────────────────────────────┐
│ Person                              │
│   name "Anna Schmidt"               │
│   avatar |                          │
│           ↑                         │
│    [Bild hier ablegen]              │
└─────────────────────────────────────┘
```

4. Das Bild wird automatisch hochgeladen
5. Die URL erscheint im Editor:

```mirror
Person
  name "Anna Schmidt"
  avatar "https://i.ibb.co/xyz123/anna.jpg"
```

### Visuelles Feedback

Während du das Bild ziehst, siehst du einen blauen Rahmen:

```
┌─────────────────────────────────────┐
│ ┌─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─┐ │
│ │     📷 Bild hier ablegen       │ │
│ └─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─┘ │
└─────────────────────────────────────┘
```

Während des Uploads siehst du unten rechts einen Spinner:

```
                    ┌──────────────────────┐
                    │ ◌ Bild wird hochge.. │
                    └──────────────────────┘
```

## Paste (Screenshots)

### Screenshot einfügen

Perfekt für Dokumentation oder schnelle Mockups:

1. Mache einen Screenshot (Mac: Cmd+Shift+4, Windows: Win+Shift+S)
2. Positioniere den Cursor im Editor
3. Paste mit Cmd+V / Ctrl+V

Der Screenshot wird automatisch hochgeladen und die URL eingefügt.

### Bild aus Browser kopieren

1. Rechtsklick auf ein Bild im Browser → "Bild kopieren"
2. Paste im Editor

## Unterstützte Formate

| Format | Unterstützt |
|--------|-------------|
| PNG | ✅ |
| JPG/JPEG | ✅ |
| GIF | ✅ |
| WebP | ✅ |
| SVG | ❌ (Text-basiert) |
| PDF | ❌ |

## Beispiel: Team-Website

```mirror
// === SCHEMA ===

Person
  name: text
  role: text
  avatar: text      // ← Hier Bilder droppen

// === DATA ===

Person
  name "Anna Schmidt"
  role "UX Design Lead"
  avatar "https://i.ibb.co/abc123/anna.jpg"    // ← Gedroppt

Person
  name "Ben Weber"
  role "Senior Engineer"
  avatar "https://i.ibb.co/def456/ben.jpg"     // ← Gedroppt

// === UI ===

TeamGrid data Person, grid 3, gap 24
  Card pad 24, bg #1a1a23, rad 12
    Image avatar, w 120, h 120, rad 60
    Text name, weight 600
    Text role, col #888
```

## Beispiel: Produkt-Katalog

```mirror
Product
  name: text
  price: number
  image: text

Product
  name "Minimalist Chair"
  price 299
  image "https://i.ibb.co/chair123/chair.jpg"

ProductGrid data Product, grid 4, gap 16
  Card rad 8, clip
    Image image, w full, h 200
    Box pad 16
      Text name, weight 600
      Text "$" + price, col #888
```

## Mehrere Bilder

Du kannst mehrere Bilder gleichzeitig droppen:

1. Wähle mehrere Bilder im Finder aus
2. Ziehe sie alle auf den Editor
3. Alle URLs werden nacheinander eingefügt

```mirror
// Nach Drop von 3 Bildern:
gallery
  "https://i.ibb.co/img1.jpg"
  "https://i.ibb.co/img2.jpg"
  "https://i.ibb.co/img3.jpg"
```

## Fehlerbehandlung

### Datei zu groß

```
┌──────────────────────────────────────┐
│ ❌ Datei zu groß (45 MB). Max: 32 MB │
└──────────────────────────────────────┘
```

**Lösung:** Bild vorher verkleinern (z.B. mit Preview/Fotos App)

### Falsches Format

```
┌──────────────────────────────────────┐
│ ❌ Format nicht unterstützt: SVG     │
└──────────────────────────────────────┘
```

**Lösung:** In PNG/JPG konvertieren

### Netzwerkfehler

```
┌──────────────────────────────────────┐
│ ❌ Netzwerkfehler. Bitte erneut.     │
└──────────────────────────────────────┘
```

**Lösung:** Internetverbindung prüfen, erneut versuchen

## Wichtige Hinweise

### Bilder werden extern gehostet

Die Bilder werden bei **imgbb.com** gehostet, nicht bei Mirror.

**Das bedeutet:**
- Bilder sind öffentlich zugänglich (keine privaten Bilder hochladen!)
- Bilder können nach längerer Inaktivität gelöscht werden
- Für Production: eigenes Hosting verwenden

### Für Production

Wenn dein Prototyp zu einer echten Website wird:

1. **Eigenes Hosting nutzen:**
   - Vercel Blob
   - AWS S3 / Cloudflare R2
   - Eigener Server

2. **URLs ersetzen:**
   ```mirror
   // Vorher (Prototyping)
   avatar "https://i.ibb.co/xyz/anna.jpg"

   // Nachher (Production)
   avatar "/images/team/anna.jpg"
   ```

### Keine sensiblen Bilder

❌ **Nicht hochladen:**
- Passwörter / Credentials in Screenshots
- Persönliche Dokumente
- Unveröffentlichte Designs (wenn vertraulich)

✅ **OK:**
- Team-Fotos (mit Erlaubnis)
- Produkt-Bilder
- Stock-Fotos
- Screenshots von UI

## Zusammenfassung

| Aktion | Wie |
|--------|-----|
| Bild einfügen | Auf Editor ziehen |
| Screenshot einfügen | Cmd+V nach Screenshot |
| Mehrere Bilder | Alle zusammen droppen |
| Formate | PNG, JPG, GIF, WebP |
| Max. Größe | 32 MB |

**Workflow:**
1. Cursor positionieren
2. Bild droppen oder pasten
3. Fertig - URL ist eingefügt
