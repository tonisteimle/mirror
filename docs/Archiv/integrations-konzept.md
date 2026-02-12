# Integrationskonzept: Fehlende Inhalte in mirror-doku.html

## Analyse der bestehenden Dokumentation

### Stärken des aktuellen Dokuments
1. **Didaktischer Aufbau** – Von einfach zu komplex, logische Progression
2. **Interaktive Übungen** – `<div class="mirror-editor">` zum direkten Ausprobieren
3. **Visuelle Previews** – Code neben gerenderten Ergebnissen
4. **"Why"-Erklärungen** – Begründungen für Design-Entscheidungen (`<p class="why">`)
5. **Rule-Boxes** – Kompakte Referenzen mit `<div class="rule-box">`
6. **Tutorial-Progression** – Schrittweiser Aufbau im Dashboard-Tutorial
7. **Konsistente Syntax-Highlighting** – `.component`, `.property`, `.value`, `.keyword`, `.token`

### Aktuelle Struktur (Kapitelreihenfolge)
1. What is Mirror
2. Components
3. Tokens
4. Typography
5. Layout
6. Forms
7. Interactivity (Events/Actions)
8. States
9. Named Instances
10. Overlays
11. Animations
12. Conditional Logic
13. Lists & Data
14. Centralized Events
15. Slots
16. Tutorial: Dashboard
17. Quick Reference

---

## Integrationsstrategie

### Prinzip: "Enhance, Don't Disrupt"
Die neue Inhalte sollen sich nahtlos in die bestehende Struktur einfügen. Keine radikale Umstrukturierung, sondern gezielte Erweiterungen an den richtigen Stellen.

---

## Konkrete Integrationen

### 1. Neues Kapitel: "Syntax Shortcuts" (nach "Components")

**Position:** Nach Kapitel 2 (Components), vor Tokens

**Begründung:** Nach den Grundlagen der Komponenten ist der richtige Moment, um Shortcuts einzuführen, die das Schreiben beschleunigen.

**Inhalt:**
```html
<section class="concept" id="syntax-shortcuts">
  <h2>Syntax Shortcuts</h2>
  <p class="lead">
    Mirror offers shortcuts to write less while expressing more. Learn the patterns that make Mirror code compact.
  </p>

  <h3 id="dimension-shorthand">Dimension Shorthand</h3>
  <p>
    The first two numbers after a component name are interpreted as width and height:
  </p>

  <div class="grid">
    <div>
      <div class="label">Shorthand</div>
      <pre>Box 300 400 pad 16
Card 200 pad 8</pre>
    </div>
    <div>
      <div class="label">Equivalent</div>
      <pre>Box w 300 h 400 pad 16
Card w 200 pad 8</pre>
    </div>
  </div>

  <p class="why">
    <strong>Why this shorthand?</strong> Width and height are the most common sizing properties.
    Making them implicit reduces visual noise while keeping code readable.
  </p>

  <div class="exercise">
    <div class="exercise-label">Try it</div>
    <p class="exercise-task">Simplify this code using dimension shorthand.</p>
    <div class="mirror-editor" data-code="Card w 280 h 180 col #1a1a23 rad 12 pad 16
  Title &quot;Project&quot;"></div>
  </div>

  <h3 id="image-shorthand">Image Shorthand</h3>
  <p>
    For images, the string is the source, followed by dimensions:
  </p>

  <pre>Image "photo.jpg" 800 600
Avatar "user.png" 48 48 rad 24</pre>

  <h3 id="color-alpha">Colors with Alpha</h3>
  <p>
    Add transparency directly to hex colors with 8-digit notation:
  </p>

  <pre>Overlay col #00000080    // 50% transparent black
Badge col #3B82F6CC      // 80% blue</pre>

</section>
```

**Übung:** Code mit Shorthand vereinfachen

---

### 2. Erweiterung: "Tokens" um Property-Referenzen

**Position:** Im bestehenden Tokens-Kapitel als neuen Unterabschnitt

**Inhalt hinzufügen nach "Token Hierarchy":**

```html
<h3 id="component-references">Component Property References</h3>
<p>
  Beyond tokens, you can reference properties from defined components. This creates relationships between design elements.
</p>

<pre>// Define a component with properties
Card: rad 16 pad 20 col #2A2A3E

// Reference its properties elsewhere
Button rad Card.rad col Card.col
Tooltip rad Card.rad</pre>

<p>
  When <code class="inline-code">Card.rad</code> changes, all references update automatically.
</p>

<h4>Design System Pattern</h4>
<p>
  Create dedicated components that hold design primitives:
</p>

<pre>// Design primitives as components
Spacing: pad 16 gap 12
Radius: rad 8
Theme: col #1E1E2E

// Use everywhere
Card pad Spacing.pad gap Spacing.gap rad Radius.rad col Theme.col
Panel pad Spacing.pad rad Radius.rad col Theme.col</pre>

<p class="why">
  <strong>Why reference components?</strong> Tokens are great for values, but component references
  let you express relationships. "This button should have the same roundness as cards"
  is more meaningful than "this button has radius 16".
</p>

<div class="exercise">
  <div class="exercise-label">Try it</div>
  <p class="exercise-task">Create a <code class="inline-code">Theme</code> component and use its properties for a Card and Button.</p>
  <div class="mirror-editor" data-code="$primary: #2271c1

Card col #1a1a23 pad 16 rad 8
  Text &quot;Card content&quot;
Button col $primary pad 8 16 rad 8 &quot;Action&quot;"></div>
</div>
```

---

### 3. Neues Kapitel: "Modifiers" (nach "Forms")

**Position:** Nach Kapitel 6 (Forms), vor Interactivity

**Begründung:** Modifiers sind Style-Shortcuts – sie passen thematisch nach Forms und vor der Interaktivität.

**Inhalt:**
```html
<section class="concept" id="modifiers">
  <h2>Modifiers</h2>
  <p class="lead">
    Apply common styles with a single keyword. Modifiers are shortcuts for frequently used property combinations.
  </p>

  <h3 id="button-modifiers">Button Modifiers</h3>
  <p>
    Buttons often need different visual styles. Instead of repeating properties, use modifiers:
  </p>

  <pre>Button -primary "Submit"      // blue background, white text
Button -secondary "Cancel"    // gray background
Button -outlined "Details"    // transparent with border
Button -ghost "Skip"          // completely transparent
Button -disabled "Unavailable" // 50% opacity, not clickable</pre>

  <div class="preview" style="gap: 8px;">
    <div style="background:#2271c1; color:white; padding:8px 16px; border-radius:6px;">Submit</div>
    <div style="background:#333; color:white; padding:8px 16px; border-radius:6px;">Cancel</div>
    <div style="background:transparent; border:1px solid #555; color:#888; padding:8px 16px; border-radius:6px;">Details</div>
    <div style="background:transparent; color:#888; padding:8px 16px; border-radius:6px;">Skip</div>
    <div style="background:#333; color:white; padding:8px 16px; border-radius:6px; opacity:0.5;">Unavailable</div>
  </div>

  <h3 id="shape-modifiers">Shape Modifiers</h3>
  <pre>Button -rounded "Pill Shape"  // fully rounded (pill)
Avatar -rounded               // circular</pre>

  <div class="rule-box">
    <h4>Available Modifiers</h4>
    <ul>
      <li><code class="inline-code">-primary</code> – Primary action style</li>
      <li><code class="inline-code">-secondary</code> – Secondary action style</li>
      <li><code class="inline-code">-outlined</code> – Transparent with border</li>
      <li><code class="inline-code">-ghost</code> – Fully transparent</li>
      <li><code class="inline-code">-filled</code> – Solid background</li>
      <li><code class="inline-code">-disabled</code> – Reduced opacity, not interactive</li>
      <li><code class="inline-code">-rounded</code> – Fully rounded (pill/circle)</li>
    </ul>
  </div>

  <div class="exercise">
    <div class="exercise-label">Try it</div>
    <p class="exercise-task">Create a button row with primary, outlined, and ghost modifiers.</p>
    <div class="mirror-editor" data-code="Row hor gap 8
  Button col #2271c1 pad 8 16 rad 6 &quot;Primary&quot;
  Button col #333 pad 8 16 rad 6 &quot;Secondary&quot;
  Button pad 8 16 rad 6 &quot;Ghost&quot;"></div>
  </div>
</section>
```

---

### 4. Erweiterung: "Layout" um Scroll-Properties

**Position:** Im bestehenden Layout-Kapitel als neuen Unterabschnitt (nach "Grid")

**Inhalt:**
```html
<h3 id="scroll">Scroll</h3>
<p>
  Make containers scrollable when content overflows. Essential for feeds, sidebars, and carousels.
</p>

<h4>Vertical Scroll</h4>
<p>
  Use <code class="inline-code">scroll</code> for vertically scrollable content like chat feeds or long lists:
</p>

<pre>ChatFeed h 400 scroll
  each $message in $messages
    Message $message.text</pre>

<h4>Horizontal Carousel</h4>
<p>
  <code class="inline-code">scroll-hor</code> with <code class="inline-code">snap</code> creates a swipeable carousel:
</p>

<pre>Carousel scroll-hor snap hor gap 16
  Card 280 200 "Slide 1"
  Card 280 200 "Slide 2"
  Card 280 200 "Slide 3"</pre>

<div class="rule-box">
  <h4>Scroll Properties</h4>
  <ul>
    <li><code class="inline-code">scroll</code> / <code class="inline-code">scroll-ver</code> – Vertical scroll</li>
    <li><code class="inline-code">scroll-hor</code> – Horizontal scroll</li>
    <li><code class="inline-code">scroll-both</code> – Both directions (maps, canvases)</li>
    <li><code class="inline-code">snap</code> – Elements snap into place</li>
    <li><code class="inline-code">clip</code> – Hide overflow without scrollbars</li>
  </ul>
</div>

<div class="exercise">
  <div class="exercise-label">Try it</div>
  <p class="exercise-task">Create a horizontal card carousel with snap scrolling.</p>
  <div class="mirror-editor" data-code="Carousel hor gap 16
  Card 200 120 col #1a1a23 rad 8 cen &quot;1&quot;
  Card 200 120 col #1a1a23 rad 8 cen &quot;2&quot;
  Card 200 120 col #1a1a23 rad 8 cen &quot;3&quot;"></div>
</div>
```

---

### 5. Erweiterung: "Interactivity" um bedingte Actions

**Position:** Im bestehenden Interactivity-Kapitel, nach "Actions"

**Inhalt:**
```html
<h3 id="conditional-actions">Conditional Actions</h3>
<p>
  Actions can include conditions. Execute different actions based on state:
</p>

<pre>Button onclick if $isLoggedIn page Dashboard else open LoginDialog "Continue"</pre>

<p>
  The pattern is: <code class="inline-code">onclick if condition action else action</code>
</p>

<h4>Change Action</h4>
<p>
  <code class="inline-code">change</code> explicitly transitions a component to a named state:
</p>

<pre>Button onclick change self to active "Activate"
Button onclick change Panel to expanded "Expand"</pre>

<p class="why">
  <strong>When to use change vs toggle?</strong> Use <code>toggle</code> when switching between two states.
  Use <code>change</code> when you need to set a specific state or when you have more than two states.
</p>
```

---

### 6. NEUES KAPITEL: "Library Components" (nach "Slots", vor Tutorial)

**Position:** Neues großes Kapitel nach Slots (Kapitel 15), vor dem Tutorial

**Begründung:** Library Components sind fortgeschrittene Konzepte, die auf allem Vorherigen aufbauen. Sie gehören ans Ende der Konzepte, direkt vor das abschließende Tutorial.

**Struktur des Kapitels:**

```html
<section class="concept" id="library">
  <h2>Library Components</h2>
  <p class="lead">
    Pre-built interactive components with built-in behavior. Use them as-is or customize their slots and states.
  </p>

  <p>
    Library components handle complex interactions automatically: keyboard navigation, focus management,
    accessibility attributes. You focus on content and styling – Mirror handles the behavior.
  </p>

  <!-- Unterkapitel mit konsistenter Struktur -->
</section>
```

**Unterkapitel-Struktur (für jede Komponente gleich):**

1. **Kurze Beschreibung** – Was macht die Komponente?
2. **Minimales Beispiel** – Einfachste Nutzung
3. **Slots & States** – Rule-Box mit verfügbaren Slots
4. **Customization-Beispiel** – Styling der Slots
5. **Übung** – Interaktiver Editor

**Beispiel: Tabs-Komponente:**

```html
<h3 id="lib-tabs">Tabs</h3>
<p>
  Organize content into switchable panels. Only one panel is visible at a time.
</p>

<pre>Tabs
  TabList hor gap 4 col #1A1A23 pad 4 rad 8
    Tab "Overview"
    Tab "Details"
    Tab "Settings"
  TabContent
    Panel pad 16
      "Overview content here"
    Panel pad 16
      "Details content here"
    Panel pad 16
      "Settings content here"</pre>

<div class="preview preview-col" style="gap: 0;">
  <div style="display:flex; gap:4px; background:#1A1A23; padding:4px; border-radius:8px 8px 0 0;">
    <div style="padding:8px 16px; background:#2271c1; border-radius:6px; color:white; font-size:13px;">Overview</div>
    <div style="padding:8px 16px; color:#888; font-size:13px;">Details</div>
    <div style="padding:8px 16px; color:#888; font-size:13px;">Settings</div>
  </div>
  <div style="padding:16px; background:#0d0d0d; border-radius:0 0 8px 8px; color:#888; font-size:13px;">
    Overview content here
  </div>
</div>

<div class="rule-box">
  <h4>Tabs Slots</h4>
  <ul>
    <li><code class="inline-code">TabList</code> – Container for tab buttons</li>
    <li><code class="inline-code">Tab</code> – Individual tab button</li>
    <li><code class="inline-code">TabContent</code> – Container for panels</li>
    <li><code class="inline-code">Panel</code> – Content for each tab</li>
  </ul>
  <h4 style="margin-top:12px;">Tab States</h4>
  <ul>
    <li><code class="inline-code">inactive</code> – Tab is not selected</li>
    <li><code class="inline-code">active</code> – Tab is currently selected</li>
  </ul>
</div>

<h4>Styling Tabs</h4>
<p>
  Customize the appearance by styling individual slots:
</p>

<pre>Tabs
  TabList hor gap 0 bor-b 1 boc #333
    Tab: pad 12 16
      state inactive
        col transparent
        bor-b 2 boc transparent
      state active
        col transparent
        bor-b 2 boc #2271c1
    - Tab "Files"
    - Tab "Edits"
    - Tab "History"
  TabContent pad 16
    Panel "Files panel"
    Panel "Edits panel"
    Panel "History panel"</pre>

<div class="exercise">
  <div class="exercise-label">Try it</div>
  <p class="exercise-task">Create a Tabs component with three tabs. Style the active tab with a blue bottom border.</p>
  <div class="mirror-editor" data-code="// Your Tabs here"></div>
</div>
```

**Weitere Library Components (gleiche Struktur):**

- **Accordion** – Collapsible content sections
- **Dropdown** – Menu that opens on click
- **Select** – Styled select input
- **Dialog** – Modal overlay (Erweiterung des bestehenden)
- **Tooltip** – Hint on hover
- **Checkbox** – Styled checkbox with states
- **Switch** – Toggle switch
- **Slider** – Range input
- **Progress** – Progress bar
- **Toast** – Notification message

---

### 7. Erweiterung: Quick Reference

**Position:** Bestehende Quick Reference am Ende erweitern

**Neue Abschnitte hinzufügen:**

```html
<h3>Shortcuts</h3>
<div class="rule-box">
  <ul>
    <li><code class="inline-code">Box 300 400</code> – Dimension shorthand (w h)</li>
    <li><code class="inline-code">Image "url" 100 100</code> – Image with dimensions</li>
    <li><code class="inline-code">#RRGGBBAA</code> – Color with alpha</li>
    <li><code class="inline-code">Component.prop</code> – Property reference</li>
  </ul>
</div>

<h3>Modifiers</h3>
<div class="rule-box">
  <ul>
    <li><code class="inline-code">-primary</code> / <code class="inline-code">-secondary</code> / <code class="inline-code">-outlined</code> / <code class="inline-code">-ghost</code></li>
    <li><code class="inline-code">-disabled</code> / <code class="inline-code">-rounded</code></li>
  </ul>
</div>

<h3>Library Components</h3>
<div class="rule-box">
  <ul>
    <li><code class="inline-code">Tabs</code> – TabList, Tab, TabContent, Panel</li>
    <li><code class="inline-code">Accordion</code> – AccordionItem, Trigger, Content</li>
    <li><code class="inline-code">Dropdown</code> – Trigger, Content, Item</li>
    <li><code class="inline-code">Select</code> – Trigger, Content, Item</li>
    <li><code class="inline-code">Dialog</code> – Trigger, Content</li>
    <li><code class="inline-code">Tooltip</code> / <code class="inline-code">Popover</code> / <code class="inline-code">HoverCard</code></li>
    <li><code class="inline-code">Checkbox</code> / <code class="inline-code">Switch</code> / <code class="inline-code">Slider</code></li>
    <li><code class="inline-code">Progress</code> / <code class="inline-code">Toast</code> / <code class="inline-code">Avatar</code></li>
  </ul>
</div>
```

---

## Neue Kapitelreihenfolge

1. What is Mirror
2. Components
3. **Syntax Shortcuts** ← NEU
4. Tokens (erweitert um Property-Referenzen)
5. Typography
6. Layout (erweitert um Scroll)
7. Forms
8. **Modifiers** ← NEU
9. Interactivity (erweitert um bedingte Actions)
10. States
11. Named Instances
12. Overlays
13. Animations
14. Conditional Logic
15. Lists & Data
16. Centralized Events
17. Slots
18. **Library Components** ← NEU (großes Kapitel)
19. Tutorial: Dashboard
20. Quick Reference (erweitert)

---

## Umsetzungsplan

### Phase 1: Kleine Erweiterungen (Niedrig-Aufwand)
1. Tokens-Kapitel um Property-Referenzen erweitern
2. Layout-Kapitel um Scroll-Properties erweitern
3. Interactivity um bedingte Actions erweitern
4. Quick Reference erweitern

### Phase 2: Neue Kapitel (Mittel-Aufwand)
5. Neues Kapitel "Syntax Shortcuts" erstellen
6. Neues Kapitel "Modifiers" erstellen

### Phase 3: Library Components (Hoch-Aufwand)
7. Kapitel-Struktur für Library Components erstellen
8. Jede Library Component einzeln dokumentieren:
   - Tabs
   - Accordion
   - Dropdown
   - Select
   - Dialog (erweitern)
   - Tooltip
   - Popover
   - Checkbox
   - Switch
   - Slider
   - Progress
   - Toast

---

## Design-Richtlinien für neue Inhalte

### Jeder Abschnitt sollte enthalten:
1. **Lead-Paragraph** – Kurze Zusammenfassung in `<p class="lead">`
2. **Konzept-Erklärung** – Was und warum
3. **Code-Beispiel** – Minimales, funktionierendes Beispiel
4. **Preview** – Visuelles Ergebnis (wenn sinnvoll)
5. **Rule-Box** – Kompakte Referenz der Optionen
6. **Why-Box** – Begründung für Design-Entscheidungen (optional)
7. **Übung** – Interaktiver Editor zum Ausprobieren

### Konsistente Formatierung:
- Syntax-Highlighting mit bestehenden CSS-Klassen
- Übungen mit `<div class="exercise">`
- Referenzen mit `<div class="rule-box">`
- Erklärungen mit `<p class="why">`
- Previews mit `<div class="preview">`

### Ton und Stil:
- Kurze, prägnante Sätze
- Aktive Sprache
- Praktische Beispiele statt theoretischer Erklärungen
- "Show, don't tell" – Code zeigt mehr als Worte
