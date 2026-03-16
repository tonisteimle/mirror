# Image Upload

## Übersicht

Einfaches Bild-Hosting für Mirror ohne eigene Infrastruktur. User können Bilder per Drag & Drop oder Paste in den Playground einfügen. Die Bilder werden automatisch zu einem externen Service (imgbb) hochgeladen und die URL wird eingefügt.

## Dokumentations-Status

| Dokument | Status |
|----------|--------|
| `requirements.md` | ✅ Vollständig |
| `tutorial.md` | ✅ Vollständig |
| `solution.md` | ✅ Vollständig |
| Testfälle | ✅ Dokumentiert |

## Feature-Status (Implementierung)

| Feature | Status | Beschreibung |
|---------|--------|--------------|
| Drag & Drop Upload | ✅ Implementiert | Bild auf Editor ziehen |
| Paste Upload | ✅ Implementiert | Screenshot/Bild einfügen |
| imgbb Integration | ✅ Implementiert | Automatischer Upload |
| URL-Insertion | ✅ Implementiert | URL an Cursor-Position |
| Upload-Indikator | ✅ Implementiert | Visuelles Feedback |
| Fehlerbehandlung | ✅ Implementiert | Bei Upload-Fehlern |
| Settings UI | ✅ Implementiert | API-Key in Einstellungen speichern |

### API-Key einrichten

1. Klicke auf das ⚙️ Zahnrad-Icon im Playground (rechts oben)
2. Hole dir einen kostenlosen Key von https://api.imgbb.com/
3. Füge den Key in das Eingabefeld ein
4. Der Key wird automatisch in localStorage gespeichert

## Motivation

### Problem

Mirror-User wollen spezifische Bilder in ihren Prototypen verwenden:
- Team-Fotos für eine Team-Website
- Produkt-Bilder für einen Shop
- Screenshots für Dokumentation

**Aber:** Bilder hosten ist mühsam:
- Eigener Server = Infrastruktur-Aufwand
- Manueller Upload zu imgbb = Workflow-Unterbrechung
- Copy-Paste von URLs = Fehleranfällig

### Lösung

Bilder direkt im Playground hochladen:
1. Bild auf Editor ziehen (oder pasten)
2. Automatischer Upload zu imgbb
3. URL wird eingefügt
4. Fertig

**Kein Account, kein manuelles Hochladen, keine Workflow-Unterbrechung.**

## Anforderungen

### Funktionale Anforderungen

#### F1: Drag & Drop Upload
- User kann Bilddatei auf den Editor ziehen
- Unterstützte Formate: PNG, JPG, GIF, WebP
- Bild wird automatisch hochgeladen
- URL wird an der Drop-Position eingefügt

#### F2: Paste Upload
- User kann Bild aus Zwischenablage einfügen (Cmd/Ctrl+V)
- Funktioniert mit Screenshots und kopierten Bildern
- URL wird an Cursor-Position eingefügt

#### F3: Upload-Feedback
- Während Upload: Visueller Indikator (Spinner/Text)
- Nach Upload: URL erscheint im Editor
- Bei Fehler: Fehlermeldung

#### F4: URL-Format
- URL wird als String eingefügt: `"https://i.ibb.co/xyz.jpg"`
- Passend für `avatar`, `src`, `Image` etc.

### Nicht-funktionale Anforderungen

#### NF1: Performance
- Upload sollte < 5 Sekunden dauern (typisches Bild)
- Keine Blockierung des Editors während Upload

#### NF2: Zuverlässigkeit
- Graceful Degradation bei API-Fehlern
- Retry bei temporären Fehlern

#### NF3: Datenschutz
- Hinweis dass Bilder extern gehostet werden
- Keine sensiblen Bilder hochladen (Dokumentation)

## User Stories

### US1: Designer lädt Team-Foto hoch
> Als Designer möchte ich ein Team-Foto in meinen Prototyp einfügen,
> indem ich es einfach auf den Editor ziehe,
> damit ich keine Zeit mit manuellem Hosting verschwende.

### US2: Entwickler fügt Screenshot ein
> Als Entwickler möchte ich einen Screenshot direkt pasten können,
> damit ich schnell Dokumentation erstellen kann.

### US3: User sieht Upload-Fortschritt
> Als User möchte ich sehen, dass mein Bild hochgeladen wird,
> damit ich weiß, dass etwas passiert.

## Einschränkungen

### Bekannte Limitierungen

| Aspekt | Limitierung | Grund |
|--------|-------------|-------|
| Dateigröße | Max 32 MB | imgbb-Limit |
| Persistenz | Bilder können nach Inaktivität verschwinden | Kostenloser Service |
| Production | Nicht für Production empfohlen | Externe Abhängigkeit |

### Empfehlung für Production

Für Production-Websites sollten User ihre Bilder selbst hosten:
- Vercel Blob
- AWS S3 / Cloudflare R2
- Eigener Server

Mirror dokumentiert dies klar im Tutorial.

## Syntax-Integration

### In Data-Instanzen

```mirror
Person
  name "Anna Schmidt"
  avatar "https://i.ibb.co/xyz.jpg"    // ← Hier Bild droppen
```

### In UI-Komponenten

```mirror
Card
  Image "https://i.ibb.co/xyz.jpg"     // ← Hier Bild droppen
  Text "Caption"
```

### Mit Image-Komponente

```mirror
Image "https://i.ibb.co/xyz.jpg", w 200, h 150, rad 8
```

## Testfälle / Akzeptanz-Kriterien

### Drag & Drop

| Test | Aktion | Erwartung |
|------|--------|-----------|
| PNG droppen | PNG auf Editor ziehen | Upload + URL eingefügt |
| JPG droppen | JPG auf Editor ziehen | Upload + URL eingefügt |
| GIF droppen | GIF auf Editor ziehen | Upload + URL eingefügt |
| WebP droppen | WebP auf Editor ziehen | Upload + URL eingefügt |
| Nicht-Bild droppen | TXT-Datei ziehen | Keine Aktion |
| Mehrere Bilder | 3 Bilder gleichzeitig | Alle 3 URLs eingefügt |

### Paste

| Test | Aktion | Erwartung |
|------|--------|-----------|
| Screenshot pasten | Cmd+Shift+4, dann Cmd+V | Upload + URL eingefügt |
| Kopiertes Bild | Bild aus Browser kopieren, pasten | Upload + URL eingefügt |
| Text pasten | Normalen Text pasten | Normales Paste-Verhalten |

### Upload-Feedback

| Test | Szenario | Erwartung |
|------|----------|-----------|
| Upload läuft | Während Upload | Spinner/Indikator sichtbar |
| Upload erfolgreich | Nach Upload | URL im Editor, Indikator weg |
| Upload fehlgeschlagen | API-Fehler | Fehlermeldung anzeigen |
| Netzwerk-Fehler | Offline | Fehlermeldung anzeigen |

### URL-Format

| Test | Kontext | Erwartung |
|------|---------|-----------|
| In String | Cursor in `avatar "│"` | URL eingefügt |
| Außerhalb String | Cursor bei `avatar │` | `"URL"` eingefügt |
| Freistehend | Cursor auf leerer Zeile | `"URL"` eingefügt |

### Edge Cases

| Test | Szenario | Erwartung |
|------|----------|-----------|
| Große Datei | 30 MB Bild | Upload funktioniert |
| Zu große Datei | 50 MB Bild | Fehlermeldung (max 32 MB) |
| Korrupte Datei | Ungültiges Bild | Fehlermeldung |
| Langsames Netzwerk | 3G Verbindung | Upload funktioniert, dauert länger |

## Abgrenzung

### Was dieses Feature NICHT macht

- Bilder optimieren/komprimieren (User-Verantwortung)
- Bilder lokal speichern
- Bilder verwalten (Liste, Löschen)
- Account-Management
- Eigenes Hosting

### Zukünftige Erweiterungen (nicht in v1)

- Bild-Kompression vor Upload
- Alternative Services (Cloudinary)
- Bild-Gallery im Playground
- Bulk-Upload
