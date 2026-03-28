# Tutorial Blueprint

Prinzipien für Mirror-Tutorials, basierend auf Lektion 01.

## Struktur

```
1. Header (Kapitel N, Titel)
2. Abschnitte (je ein Konzept)
3. Übung (praktische Anwendung)
4. Zusammenfassung (Cheatsheet)
5. Navigation (zurück/weiter)
```

## Didaktische Prinzipien

### Ein Konzept pro Abschnitt
- Jeder Abschnitt führt **ein** neues Konzept ein
- Keine Vorwärtsreferenzen (nichts verwenden, was nicht erklärt wurde)
- Reihenfolge: Einfach → Komplex

### Progression in Lektion 01
```
Elemente      → Was sind Komponenten? (Text, Button)
Eigenschaften → Wie style ich sie? (bg, col, pad, rad)
Container     → Wie gruppiere ich? (Frame, Einrückung)
Layout        → Wie arrangiere ich? (gap, hor)
Verschachtelung → Wie schachtele ich? (tiefere Einrückung)
```

### Erklärung vor Beispiel
1. Kurzer Satz: Was macht das Konzept?
2. Playground: Code zum Ausprobieren
3. Optional: Properties-Tabelle

### Einladung zum Experimentieren
- "Probier es aus:" vor interaktiven Beispielen
- Playgrounds sind editierbar
- Fehler werden angezeigt (nicht kritisch)

## Playgrounds

### Aufbau
```
┌─────────────────────────┐
│ Code (editierbar)       │  ← Syntax Highlighting
├─────────────────────────┤
│ Preview (live)          │  ← Sofort-Feedback
└─────────────────────────┘
```

### Technische Features
- **Syntax Highlighting**: Gleiche Farben wie Mirror Studio
- **Auto-Resize**: Textarea wächst mit Inhalt
- **Tab-Support**: Tab fügt 2 Spaces ein
- **Live-Kompilierung**: 100ms Debounce
- **Default Styles**: `mirror-defaults.css` für gestylte Komponenten

### Code-Beispiele
- Immer vollständig lauffähig
- Konsistente Werte (z.B. immer `gap 8`)
- Kommas zwischen Properties für Lesbarkeit
- 2 Spaces Einrückung

## Übungen

### Aufbau
```
┌─────────────────────────┐
│ "Erstelle diese Karte:" │
├─────────────────────────┤
│ Target (Ziel-UI)        │  ← Statisches HTML
├─────────────────────────┤
│ Playground (leer)       │  ← Zum Ausfüllen
├─────────────────────────┤
│ ▶ Lösung               │  ← Details/Summary
└─────────────────────────┘
```

### Prinzipien
- Kombiniert alle gelernten Konzepte
- Target zeigt exakt das Ziel
- Lösung ist aufklappbar (nicht sofort sichtbar)
- Schwierigkeit angemessen (nicht frustrierend)

## Zusammenfassung

- Bullet-Liste aller neuen Konzepte
- Format: `code` – Kurzbeschreibung
- Dient als Cheatsheet/Referenz

## Styling

### Farben (Dark Theme)
```css
--bg: #111              /* Seiten-Hintergrund */
--bg-code: #191919      /* Code-Bereich */
--bg-preview: #0c0c0c   /* Preview-Bereich */
--text: #ccc            /* Normaler Text */
--text-bright: #eee     /* Heller Text */
--text-dim: #666        /* Gedimmter Text */
--border: #282828       /* Rahmen */
--accent: #4a9eff       /* Akzent (Links, Props) */
```

### Syntax Highlighting
```css
--syn-comment: #5c6370   /* // Kommentare */
--syn-string: #a88fb0    /* "Strings" */
--syn-hex: #a88fb0       /* #farben */
--syn-number: #c9a87c    /* 123 */
--syn-property: #7fb3a8  /* bg, pad, col */
--syn-component: #8aabbd /* Frame, Button */
--syn-keyword: #7a9ec2   /* hover, onclick */
```

### Typografie
- Body: Inter
- Code: JetBrains Mono
- H1: 28px, weight 500
- H2: 13px, uppercase, dim
- Body: 15px, line-height 1.65

## Textliche Prinzipien

### Kürze
- Kurze Sätze
- Kein Fülltext
- Direkt auf den Punkt

### Beispiele
```
Gut:  "Frame ist ein Container – eine Box, die andere Elemente enthält."
Schlecht: "Ein Frame ist eine sehr nützliche Komponente, die es ermöglicht..."
```

### Konsistenz
- Gleiche Begriffe durchgehend (Frame, nicht Box)
- Gleiche Werte in ähnlichen Beispielen
- Deutsche Fachbegriffe wo sinnvoll (Einrückung, nicht Indentation)

## Checkliste für neue Lektionen

- [ ] Ein Konzept pro Abschnitt
- [ ] Keine Vorwärtsreferenzen
- [ ] Alle Playgrounds funktionieren
- [ ] Code-Beispiele sind konsistent
- [ ] Übung kombiniert alle Konzepte
- [ ] Zusammenfassung vollständig
- [ ] Navigation funktioniert
- [ ] Default Styles geladen
- [ ] Syntax Highlighting aktiv
