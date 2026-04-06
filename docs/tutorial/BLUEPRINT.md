# Tutorial Chapter Blueprint

Dieses Dokument beschreibt die Struktur und Prinzipien eines guten Tutorial-Kapitels, basierend auf der Analyse von `06-states.html`.

---

## 1. Grundstruktur

```
┌─────────────────────────────────────────┐
│ Header                                  │
│   h1: Kapitelname                       │
│   p.subtitle: Kurzbeschreibung          │
├─────────────────────────────────────────┤
│ p.intro                                 │
│   Kontextuelle Einleitung               │
│   Was lernt der Leser? Warum wichtig?   │
├─────────────────────────────────────────┤
│ Section 1: Das Konzept                  │
│   Erstes Beispiel (minimal)             │
│   Kernkonzept erklären                  │
├─────────────────────────────────────────┤
│ Section 2-N: Aufbauende Konzepte        │
│   Vom Einfachen zum Komplexen           │
│   Jede Section = ein Konzept            │
├─────────────────────────────────────────┤
│ Section: Praktisches Beispiel           │
│   Real-world Anwendung                  │
├─────────────────────────────────────────┤
│ div.summary                             │
│   Referenztabellen                      │
│   Schnelles Nachschlagen                │
├─────────────────────────────────────────┤
│ nav                                     │
│   Prev / Index / Next                   │
└─────────────────────────────────────────┘
```

---

## 2. Prinzipien

### 2.1 Progression (Einfach → Komplex)

Jedes Kapitel startet mit dem **minimalen Beispiel** und baut darauf auf:

```
Section 1: Grundkonzept        → 5-8 Zeilen Code
Section 2: Erste Erweiterung   → 8-12 Zeilen Code
Section 3: Kombination         → 10-15 Zeilen Code
Section N: Praktisch           → 15-20 Zeilen Code
```

**Beispiel States:**
1. toggle() + on: (minimal)
2. hover:, focus:, disabled: (System-States)
3. hover: + on: kombiniert (System + Custom)
4. Mehrere States (cycle)
5. exclusive() (Gruppen)
6. Cross-Element (fortgeschritten)
7. Accordion (praktisch)

### 2.2 Ein Konzept pro Section

Jede `<section>` behandelt **genau ein Konzept**:

```html
<section>
  <h2>Konzeptname</h2>
  <p>1-2 Sätze Erklärung</p>
  <div class="playground">...</div>
  <p>Erklärung was passiert</p>
  <table class="ref-table">Referenz</table>  <!-- optional -->
</section>
```

**Nicht:** Mehrere Konzepte in einer Section mischen.

### 2.3 Playground-Regeln

| Regel | Beschreibung |
|-------|--------------|
| **Minimal** | So wenig Code wie nötig, um das Konzept zu zeigen |
| **Funktional** | Muss im Browser funktionieren |
| **Konsistent** | Gleiche Farbpalette (#333, #2563eb, #1a1a1a, etc.) |
| **Größe** | 5-15 Zeilen ideal, max 20 Zeilen |
| **Isoliert** | Ein Playground = ein Konzept |

**Guter Playground:**
```mirror
Btn: pad 12 24, rad 6, bg #333, col white, cursor pointer, toggle()
  on:
    bg #2563eb

Btn "Klick mich"
```

**Schlechter Playground:** (zu viele Konzepte)
```mirror
// Kombiniert toggle, Cross-Element, onenter, multiple States...
```

### 2.4 Erklärungen

**Nach dem Playground** kommt immer eine Erklärung:

1. **Was passiert?** (1 Satz)
2. **Warum?** (Konzept erklären)
3. **Referenz** (Tabelle für Syntax)

```html
<div class="playground">...</div>

<p>Der Button startet grau. Bei Klick wird er blau.</p>

<table class="ref-table">
  <tr><th>Syntax</th><th>Bedeutung</th></tr>
  <tr><td><code>on:</code></td><td>State definieren</td></tr>
</table>
```

### 2.5 Referenztabellen

Zwei Typen:

**Inline-Tabelle** (nach Playground):
```html
<table class="ref-table">
  <tr><th>State</th><th>Wann aktiv?</th></tr>
  <tr><td><code>hover:</code></td><td>Maus über Element</td></tr>
</table>
```

**Zusammenfassung** (am Ende):
```html
<div class="summary">
  <h2>Zusammenfassung</h2>
  <h3>Kategorie 1</h3>
  <table class="ref-table">...</table>
  <h3>Kategorie 2</h3>
  <table class="ref-table">...</table>
</div>
```

---

## 3. Textuelle Elemente

### 3.1 Intro

```html
<p class="intro">
  Kontext + was wird gelernt + warum wichtig.
  <strong>Schlüsselbegriff</strong> hervorheben.
</p>
```

### 3.2 Hinweise

```html
<p class="note">
  <strong>Hinweis:</strong> Zusätzliche Info, die nicht essentiell ist.
</p>
```

### 3.3 Code-Referenzen

Inline-Code mit `<code>`:
```html
<p>Mit <code>toggle()</code> wechselst du den State.</p>
```

---

## 4. Farbpalette (konsistent)

| Farbe | Verwendung |
|-------|------------|
| `#0a0a0a` | Container-Hintergrund (dunkel) |
| `#111` | Container-Hintergrund (Variante) |
| `#1a1a1a` | Element-Hintergrund |
| `#252525` | Element-Hintergrund (hover) |
| `#333` | Button-Hintergrund |
| `#444` | Button-Hintergrund (hover) |
| `#666` | Icon-Farbe (inaktiv) |
| `#888` | Text-Farbe (sekundär) |
| `white` | Text-Farbe (primär) |
| `#2563eb` | Akzent (blau) |
| `#10b981` | Erfolg (grün) |
| `#f59e0b` | Warnung (orange) |
| `#ef4444` | Fehler (rot) |

---

## 5. Checkliste für neue Kapitel

- [ ] Header mit h1 und subtitle
- [ ] Intro-Paragraph mit Kontext
- [ ] Erstes Beispiel ist minimal (5-8 Zeilen)
- [ ] Jede Section = ein Konzept
- [ ] Progression vom Einfachen zum Komplexen
- [ ] Playgrounds funktionieren im Browser
- [ ] Playgrounds verwenden konsistente Farben
- [ ] Erklärung nach jedem Playground
- [ ] Mindestens ein praktisches Beispiel
- [ ] Zusammenfassung mit kategorisierten Tabellen
- [ ] Navigation (prev/index/next)

---

## 6. Anti-Patterns

| Problem | Lösung |
|---------|--------|
| Playground zu komplex | Aufteilen in mehrere Playgrounds |
| Zu viele Konzepte pro Section | Eine Section pro Konzept |
| Erklärung vor dem Beispiel | Erst zeigen, dann erklären |
| Redundante Playgrounds | Jeder Playground zeigt etwas Neues |
| Fehlende Zusammenfassung | Immer mit Referenztabellen enden |
| Inkonsistente Farben | Farbpalette verwenden |

---

## 7. Beispiel: Optimale Section

```html
<section>
  <h2>System-States</h2>
  <p>Manche States werden automatisch vom Browser ausgelöst:</p>

  <div class="playground" data-playground>
    <div class="playground-code">
      <textarea>Btn: pad 12 24, rad 6, bg #333, col white, cursor pointer
  hover:
    bg #444
  active:
    scale 0.98

Btn "Hover mich"</textarea>
    </div>
    <div class="playground-preview"></div>
  </div>

  <table class="ref-table">
    <tr><th>State</th><th>Wann aktiv?</th></tr>
    <tr><td><code>hover:</code></td><td>Maus über Element</td></tr>
    <tr><td><code>active:</code></td><td>Während Klick</td></tr>
  </table>
</section>
```

**Was macht diese Section gut:**
1. Klarer Titel
2. Ein-Satz-Einleitung
3. Minimaler, funktionaler Playground
4. Referenztabelle für schnelles Nachschlagen
5. Keine überflüssigen Erklärungen
