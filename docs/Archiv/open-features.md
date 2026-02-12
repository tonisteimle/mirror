# Open Features

Offene Features und geplante Erweiterungen für Mirror.

---

## 1. Media Handling (Vervollständigung)

### Status: Teilweise implementiert

**Was funktioniert:**
- `Image "filename.png" 300 400` Syntax
- Drag & Drop von Bildern in den Editor
- Temporäre Speicherung in localStorage
- Automatische Dimensionserkennung

**Was fehlt:**

### 1.1 Persistente Dateispeicherung

**Problem:** Bilder werden aktuell nur in localStorage gespeichert. Bei großen Bildern oder vielen Dateien ist das nicht praktikabel. Beim Browser-Cache-Löschen gehen die Bilder verloren.

**Lösung:** Bilder nach `public/media/` speichern.

**Umsetzung:**
- Backend-API Endpoint `/api/media/upload`
- Oder: File System Access API (Browser-nativ, aber eingeschränkte Unterstützung)
- Oder: Electron-Integration für Desktop-App

**Priorität:** Hoch

---

### 1.2 Medien-Panel

**Problem:** User hat keinen Überblick über hochgeladene Bilder. Kann Bilder nicht wiederverwenden oder löschen.

**Lösung:** Dediziertes Panel in der Sidebar.

**Funktionen:**
- Grid-Ansicht aller Bilder in `/media/`
- Drag & Drop aus dem Panel in den Editor
- Löschen von ungenutzten Bildern
- Bildinfo anzeigen (Größe, Dimensionen)
- Suche/Filter

**Priorität:** Mittel

---

### 1.3 Bild-Optimierung

**Problem:** Große Bilder verlangsamen die Preview und verschwenden Speicher.

**Lösung:** Automatische Optimierung beim Upload.

**Funktionen:**
- Resize auf maximale Dimensionen (z.B. 2000px)
- Kompression (WebP oder optimiertes JPEG)
- Thumbnail-Generierung für Panel

**Priorität:** Niedrig

---

### 1.4 Platzhalter-Bilder

**Problem:** Beim Prototyping will man schnell Layouts testen ohne echte Bilder.

**Lösung:** Eingebaute Platzhalter.

**Syntax:**
```
Image placeholder 300 200
Image placeholder 300 200 "gray"
Image placeholder 300 200 "gradient"
```

**Generiert:** Graue Box oder Gradient mit Dimensionen-Anzeige.

**Priorität:** Niedrig

---

## 2. fit Property Parsing

### Status: Bug

**Problem:** `fit cover` wird nicht korrekt geparst. Der Wert `cover` wird ignoriert, `fit` wird als `true` gesetzt.

**Ursache:** Parser behandelt `fit` als Boolean-Property statt als String-Property mit Wert.

**Lösung:** Parser-Logik für `fit` anpassen, sodass der nachfolgende Wert (`cover`, `contain`, `fill`, `none`) gelesen wird.

**Workaround:** Default im Generator ist bereits `cover`.

**Priorität:** Mittel

---

## 3. Compound Properties (Erweiterungen)

### Status: Teilweise implementiert

**Was funktioniert:**
- `bor [direction] [width] [style] [color]`
- `pad [direction] [values]`
- `mar [direction] [values]`

**Was fehlt:**

### 3.1 Shadow Compound Syntax

**Aktuell:** `shadow "0 4px 8px rgba(0,0,0,0.15)"` (CSS-String)

**Geplant:**
```
shadow 0 4 8 #00000026
shadow inset 0 2 4 #000
shadow sm   // Preset
shadow md
shadow lg
```

**Priorität:** Niedrig

---

### 3.2 Radius per Ecke

**Aktuell:** `rad 8` oder `rad 8 8 0 0` (CSS-Shorthand)

**Geplant:**
```
rad l-u 16    // Nur oben-links
rad r-u 16    // Nur oben-rechts
rad l-u 16 r-u 16   // Oben gerundet
```

**Priorität:** Niedrig

---

## 4. Export-Funktion

### Status: Nicht implementiert

**Problem:** Mirror-Projekte können nicht als nutzbare Artefakte exportiert werden.

**Geplante Export-Formate:**

### 4.1 HTML/CSS Export
- Statisches HTML mit Inline-Styles
- Für einfache Landing Pages

### 4.2 React Component Export
- Generierter React-Code
- Mit TypeScript-Typen
- Für Integration in bestehende Projekte

### 4.3 Figma Export
- Plugin für Figma
- Umwandlung in Figma-Frames

### 4.4 Bild-Export
- PNG/SVG der Preview
- Für Dokumentation oder Präsentationen

**Priorität:** Hoch (für Produktionsnutzung essentiell)

---

## 5. Projekt-Speicherung

### Status: Nur localStorage

**Problem:** Projekte existieren nur im Browser. Kein Team-Sharing, keine Versionierung.

**Geplant:**

### 5.1 Lokale Dateien
- `.mirror` Dateiformat (JSON)
- Öffnen/Speichern-Dialog

### 5.2 Cloud-Speicherung
- User-Accounts
- Projekt-Liste
- Sharing via Link

### 5.3 Git-Integration
- `.mirror` Dateien in Git
- Diff-Ansicht für Änderungen

**Priorität:** Hoch

---

## 6. Responsive Design

### Status: Nicht implementiert

**Problem:** Designs sind nur für eine feste Breite. Keine Breakpoints.

**Geplant:**

### 6.1 Breakpoint-Syntax
```
Card w 400
  @mobile w full
  @tablet w 300
```

### 6.2 Preview-Modi
- Desktop/Tablet/Mobile Toggle in der Preview
- Freie Größenanpassung

**Priorität:** Mittel

---

## 7. Animation System

### Status: Nur Hover-States und Overlay-Animationen

**Problem:** Keine Möglichkeit für komplexere Animationen.

**Geplant:**

### 7.1 Transitions
```
Button transition 200
  state idle bg #333
  state hover bg #3B82F6
```

### 7.2 Keyframe-Animationen
```
Loader animate spin 1000
Notification animate slide-in 300
```

**Priorität:** Niedrig

---

## 8. Accessibility (a11y)

### Status: Minimal

**Problem:** Generierter Code hat keine ARIA-Attribute, keine Keyboard-Navigation.

**Geplant:**
- Automatische `role` Attribute
- `aria-label` Property
- Focus-Management für Overlays
- Skip-Links

**Priorität:** Mittel (wichtig für Production)

---

## Priorisierung

| Feature | Priorität | Aufwand | Impact |
|---------|-----------|---------|--------|
| Media: Persistente Speicherung | Hoch | Mittel | Hoch |
| Export-Funktion | Hoch | Hoch | Sehr Hoch |
| Projekt-Speicherung | Hoch | Hoch | Sehr Hoch |
| fit Property Bug | Mittel | Niedrig | Niedrig |
| Media: Panel | Mittel | Mittel | Mittel |
| Responsive Design | Mittel | Hoch | Hoch |
| Accessibility | Mittel | Mittel | Hoch |
| Shadow Compound | Niedrig | Niedrig | Niedrig |
| Platzhalter-Bilder | Niedrig | Niedrig | Mittel |
| Animation System | Niedrig | Hoch | Mittel |
