# Component Icons Style Guide

## Design Principles

### 1. Minimalistisch & Klar
Icons zeigen die **Essenz** einer Komponente, nicht jedes Detail. Ein Card-Icon braucht keinen kompletten Karteninhalt - nur die charakteristische Form.

### 2. Konsistente Metapher
Jedes Icon verwendet die gleiche visuelle Sprache:
- Container = Rechteck mit abgerundeten Ecken
- Inhalt = Abstrahierte Formen (keine Text-Simulation)
- Interaktiv = Subtile Füllung oder Akzent

### 3. Erkennbar bei 24px
Alle Icons müssen bei 24x24px noch erkennbar sein. Details die bei dieser Größe verschwinden, werden weggelassen.

---

## Technische Spezifikationen

### Viewbox & Grid
```
Viewbox: 0 0 24 24
Optisches Grid: 20x20 (2px Padding)
```

### Strichstärke
```
Primary Stroke: 1.5px
Secondary/Detail: 1px
Keine Striche unter 1px
```

### Eckenradius
```
Große Container: 3px
Kleine Elemente: 2px
Tiny Details: 1px
Konsistent innerhalb eines Icons
```

### Farben
```css
/* Monochrom - erbt currentColor */
stroke: currentColor;
fill: none;

/* Akzent-Füllung (optional, für Tiefe) */
fill: currentColor;
fill-opacity: 0.1;

/* Im UI */
--icon-default: #71717a;    /* zinc-500 */
--icon-hover: #3B82F6;      /* blue-500 */
--icon-active: #2563EB;     /* blue-600 */
```

### Abstände
```
Minimum Gap zwischen Elementen: 2px
Elemente nie am Rand kleben: 2px Innenabstand
```

---

## Icon-Kategorien

### A. Layout Container

Zeigen das **Anordnungsverhalten** von Kindern.

| Icon | Konzept | Schlüsselmerkmal |
|------|---------|------------------|
| Vertical | 3 horizontale Balken übereinander | Gleiche Breite, gestapelt |
| Horizontal | 3 vertikale Balken nebeneinander | Gleiche Höhe, Reihe |
| Grid | 2x2 Quadrate | Symmetrisches Raster |
| Stacked | Überlappende Rechtecke | Tiefe durch Versatz |
| Scroll | Container + Scrollbar | Scrollbar-Element rechts |
| Wrap | Elemente mit Umbruch | Erste Reihe voll, zweite beginnt |

**Beispiel: Vertical Stack**
```svg
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
  <!-- 3 horizontale Balken, gleich breit, vertikal gestapelt -->
  <rect x="4" y="4" width="16" height="4" rx="2"/>
  <rect x="4" y="10" width="16" height="4" rx="2"/>
  <rect x="4" y="16" width="16" height="4" rx="2"/>
</svg>
```

**Beispiel: Grid**
```svg
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
  <!-- 2x2 Raster -->
  <rect x="4" y="4" width="7" height="7" rx="2"/>
  <rect x="13" y="4" width="7" height="7" rx="2"/>
  <rect x="4" y="13" width="7" height="7" rx="2"/>
  <rect x="13" y="13" width="7" height="7" rx="2"/>
</svg>
```

---

### B. Basis-Komponenten

Zeigen die **charakteristische Form** der Komponente.

| Icon | Konzept | Schlüsselmerkmal |
|------|---------|------------------|
| Text | "Aa" Typografie-Symbol | Buchstaben, keine Linien |
| Button | Pill/Rechteck mit Füllung | Gefüllte Form = klickbar |
| Input | Rechteck mit Cursor | Blinkender Cursor-Strich |
| Icon | Stern oder generisches Symbol | Einfache erkennbare Form |
| Image | Rechteck mit Berg/Sonne | Landschafts-Metapher |
| Checkbox | Quadrat mit Häkchen | Check-Symbol |
| Toggle | Pill mit Kreis | Switch-Form |
| Slider | Linie mit Punkt | Draggable Indicator |

**Beispiel: Button**
```svg
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
  <!-- Gefülltes Rechteck = interaktiv -->
  <rect x="4" y="8" width="16" height="8" rx="4" fill="currentColor" fill-opacity="0.15"/>
  <rect x="4" y="8" width="16" height="8" rx="4"/>
</svg>
```

**Beispiel: Input**
```svg
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
  <!-- Rechteck mit Cursor-Strich -->
  <rect x="4" y="7" width="16" height="10" rx="2"/>
  <line x1="7" y1="10" x2="7" y2="14" stroke-width="1.5"/>
</svg>
```

**Beispiel: Image**
```svg
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
  <!-- Rahmen -->
  <rect x="4" y="5" width="16" height="14" rx="2"/>
  <!-- Sonne -->
  <circle cx="9" cy="10" r="2" fill="currentColor" fill-opacity="0.15"/>
  <!-- Berg -->
  <polyline points="4,17 10,12 14,15 20,10 20,17" stroke-linejoin="round"/>
</svg>
```

---

### C. User Components (Composite)

Für benutzerdefinierte Komponenten. Zeigen **strukturelle Komposition**.

| Icon | Konzept | Schlüsselmerkmal |
|------|---------|------------------|
| Card | Container mit Inhaltsbereichen | Rechteck mit horizontaler Teilung |
| Modal | Zentriertes Overlay | Inneres Rechteck + Schatten/Rand |
| NavBar | Horizontale Leiste | Flach, mit Logo + Links |
| Form | Gestapelte Inputs | Mehrere Input-Linien + Button |
| List | Wiederholte Zeilen | 3+ identische Zeilen |
| Table | Raster mit Header | Grid mit betonter erster Zeile |
| Sidebar | Vertikale Navigation | Schmales Rechteck links |
| Header | Horizontaler Banner | Breites flaches Rechteck oben |

**Beispiel: Card**
```svg
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
  <!-- Äußerer Container -->
  <rect x="4" y="3" width="16" height="18" rx="3"/>
  <!-- Image-Bereich oben -->
  <rect x="6" y="5" width="12" height="6" rx="1.5" fill="currentColor" fill-opacity="0.1"/>
  <!-- Content-Linien -->
  <line x1="6" y1="14" x2="14" y2="14" stroke-width="1"/>
  <line x1="6" y1="17" x2="11" y2="17" stroke-width="1"/>
</svg>
```

**Beispiel: Modal**
```svg
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
  <!-- Hintergrund/Overlay Suggestion -->
  <rect x="2" y="2" width="20" height="20" rx="2" stroke-opacity="0.3"/>
  <!-- Modal-Fenster -->
  <rect x="5" y="6" width="14" height="12" rx="2" fill="currentColor" fill-opacity="0.05"/>
  <rect x="5" y="6" width="14" height="12" rx="2"/>
  <!-- Close X -->
  <line x1="16" y1="8" x2="17" y2="9" stroke-width="1"/>
  <line x1="17" y1="8" x2="16" y2="9" stroke-width="1"/>
</svg>
```

**Beispiel: Form**
```svg
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
  <!-- Container -->
  <rect x="4" y="3" width="16" height="18" rx="2"/>
  <!-- Input Fields -->
  <rect x="6" y="5" width="12" height="3" rx="1" stroke-width="1"/>
  <rect x="6" y="10" width="12" height="3" rx="1" stroke-width="1"/>
  <!-- Submit Button -->
  <rect x="6" y="15" width="12" height="4" rx="1.5" fill="currentColor" fill-opacity="0.15"/>
</svg>
```

---

## Do's & Don'ts

### DO
- Verwende konsistente Strichstärken (1.5px primary)
- Halte Icons symmetrisch wo möglich
- Nutze fill-opacity für Tiefe/Interaktivität
- Teste bei 24px, 32px und 48px
- Verwende stroke="currentColor" für Farbvererbung

### DON'T
- Keine Text-Simulation mit Linien ("Aa" ist OK, "---" für Text nicht)
- Keine komplexen Details die bei 24px verschwinden
- Keine unterschiedlichen Strichstärken ohne Grund
- Keine harten Farben - immer currentColor
- Keine Icons die nur mit Farbe unterscheidbar sind

---

## Icon Größen im UI

```css
/* Component Palette Grid */
.component-item svg {
  width: 32px;
  height: 32px;
}

/* Compact List View */
.component-list-item svg {
  width: 20px;
  height: 20px;
}

/* Drag Preview */
.drag-preview svg {
  width: 48px;
  height: 48px;
}
```

---

## Implementierung

### SVG Template
```svg
<svg
  xmlns="http://www.w3.org/2000/svg"
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="1.5"
  stroke-linecap="round"
  stroke-linejoin="round"
>
  <!-- Icon content -->
</svg>
```

### Als TypeScript Konstante
```typescript
const COMPONENT_ICONS = {
  vertical: `<rect x="4" y="4" width="16" height="4" rx="2"/>
             <rect x="4" y="10" width="16" height="4" rx="2"/>
             <rect x="4" y="16" width="16" height="4" rx="2"/>`,

  horizontal: `<rect x="4" y="4" width="4" height="16" rx="2"/>
               <rect x="10" y="4" width="4" height="16" rx="2"/>
               <rect x="16" y="4" width="4" height="16" rx="2"/>`,
  // ...
}

function renderIcon(name: string): string {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
    ${COMPONENT_ICONS[name]}
  </svg>`
}
```

---

## Nächste Schritte

1. **Icon Set erstellen**: Alle Layout + Basic Icons nach Style Guide
2. **Review**: Icons bei verschiedenen Größen testen
3. **User Component Icons**: Pool für User-Auswahl definieren
4. **Icon Picker**: UI zum Auswählen von Icons für User-Komponenten
