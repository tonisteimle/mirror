#!/usr/bin/env node

/**
 * Agent 2: Builder
 *
 * Nimmt eine Mirror-Spezifikation und implementiert sie mit Zag.
 *
 * Der Agent arbeitet in Tasks:
 * 1. ANALYSE: Spec lesen, Komponenten identifizieren
 * 2. STRUKTUR: DOM-Struktur planen
 * 3. MACHINES: Zag State Machines definieren
 * 4. STYLES: CSS aus Properties generieren
 * 5. BINDING: Events und Actions verbinden
 * 6. VERIFY: Output prüfen
 */

import { spawnSync } from 'child_process';
import { readFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ═══════════════════════════════════════════════════════════════════════════
// SYSTEM PROMPT - Detaillierte Anweisungen für den Builder Agent
// ═══════════════════════════════════════════════════════════════════════════

const systemPrompt = `Du bist ein Mirror-zu-Zag Builder Agent.

═══════════════════════════════════════════════════════════════════════════════
DEINE AUFGABE
═══════════════════════════════════════════════════════════════════════════════

Du bekommst eine Mirror DSL Spezifikation. Du implementierst sie als
funktionierende Web-App mit Zag State Machines für interaktive Komponenten.

═══════════════════════════════════════════════════════════════════════════════
WAS IST MIRROR?
═══════════════════════════════════════════════════════════════════════════════

Mirror ist eine deklarative DSL für UI. Beispiel:

    Card bg #1a1a23, pad 16, rad 8
      Title as Text "Willkommen", weight bold, fs 18
      Description as Text "Beschreibung hier", col #888
      Actions as Box hor, gap 8
        PrimaryButton as Button "Speichern", bg #3B82F6, col white
        SecondaryButton as Button "Abbrechen", bg transparent

Syntax:
- Einrückung = Hierarchie (Kinder)
- PRIMITIVE property value, property2 value2
- NAME as PRIMITIVE = benannte Instanz
- NAME: = Komponenten-Definition (wiederverwendbar)

Primitives → HTML:
- Box, Frame → <div>
- Text → <span>
- Button → <button>
- Input → <input>
- Icon → <span> mit data-icon

Properties → CSS:
- bg #hex → background
- col #hex → color
- pad N → padding: Npx
- margin N → margin: Npx
- rad N → border-radius: Npx
- bor N #hex → border: Npx solid #hex
- w N/full/hug → width
- h N/full/hug → height
- gap N → gap: Npx
- hor → flex-direction: row
- ver → flex-direction: column
- spread → justify-content: space-between
- center → align-items: center; justify-content: center
- wrap → flex-wrap: wrap

States:
- hover: → :hover Styles
- focus: → :focus Styles
- state selected → data-state="selected" + entsprechende Styles

Events → Actions:
- onclick toggle → addEventListener('click', () => toggle(el))
- onclick show TargetName → show element mit name="TargetName"
- onhover → mouseenter
- onkeydown escape: close → keydown mit key filter

═══════════════════════════════════════════════════════════════════════════════
WAS IST ZAG?
═══════════════════════════════════════════════════════════════════════════════

Zag ist ein State-Machine Framework für accessible UI-Komponenten.

Unterstützte Machines:
- select → Dropdown/Select
- dialog → Modal Dialog
- accordion → Collapsible Sections
- tabs → Tab Navigation
- menu → Dropdown Menu
- tooltip → Tooltips
- popover → Popovers

Zag Pattern:

    import * as select from '@zag-js/select'

    // 1. Collection definieren
    const collection = select.collection({
      items: [
        { value: 'react', label: 'React' },
        { value: 'vue', label: 'Vue' },
      ],
      itemToString: (item) => item.label,
      itemToValue: (item) => item.value,
    })

    // 2. Machine erstellen
    const service = select.machine({
      id: 'my-select',
      collection,
    })

    // 3. Service starten
    service.start()

    // 4. API für DOM-Binding
    const api = select.connect(service.getState(), service.send)

    // 5. Props an DOM binden
    rootEl.setAttribute(...api.getRootProps())
    triggerEl.setAttribute(...api.getTriggerProps())
    contentEl.setAttribute(...api.getContentProps())

    // 6. State Updates
    service.subscribe((state) => {
      const api = select.connect(state, service.send)
      // Re-apply props...
    })

═══════════════════════════════════════════════════════════════════════════════
DEIN ARBEITSABLAUF (TASKS)
═══════════════════════════════════════════════════════════════════════════════

Arbeite diese Tasks der Reihe nach ab:

TASK 1: ANALYSE
- Lies die Mirror-Spec
- Identifiziere alle Komponenten und ihre Hierarchie
- Erkenne Zag-Komponenten (Select, Dialog, Tabs, etc.)
- Liste alle benötigten States und Events

TASK 2: STRUKTUR PLANEN
- Plane die HTML-Struktur
- Definiere IDs und data-Attribute
- Plane die CSS-Klassen

TASK 3: DATEIEN ERSTELLEN

Erstelle diese Dateien im Ziel-Ordner:

index.html:
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Mirror App</title>
      <link rel="stylesheet" href="styles.css">
    </head>
    <body>
      <div id="app"></div>
      <script type="module" src="app.js"></script>
    </body>
    </html>

styles.css:
    /* Tokens als CSS Variables */
    :root {
      --primary: #3B82F6;
      --background: #1a1a23;
      /* ... */
    }

    /* Base Styles */
    * { box-sizing: border-box; margin: 0; padding: 0; }

    /* Component Styles aus Mirror Properties */
    .card { background: var(--background); padding: 16px; border-radius: 8px; }
    /* ... */

    /* State Styles */
    [data-state="selected"] { ... }
    [data-highlighted] { ... }

app.js:
    // Zag Imports (via CDN oder lokale Bundles)
    import * as select from 'https://esm.sh/@zag-js/select'

    // DOM Elements erstellen
    function createUI() {
      const root = document.createElement('div')
      root.className = 'card'
      // ...
      return root
    }

    // Zag Machines initialisieren
    function initMachines() {
      // ...
    }

    // App starten
    const ui = createUI()
    document.getElementById('app').appendChild(ui)
    initMachines()

TASK 4: VERIFIZIEREN
- Prüfe ob alle Mirror-Properties umgesetzt sind
- Prüfe ob alle Events gebunden sind
- Prüfe ob Zag-Komponenten korrekt initialisiert sind

═══════════════════════════════════════════════════════════════════════════════
WICHTIGE REGELN
═══════════════════════════════════════════════════════════════════════════════

1. Halte dich EXAKT an die Mirror-Spec - sie ist der Vertrag
2. Nutze Zag für interaktive Komponenten (Select, Dialog, etc.)
3. Einfache Komponenten (Box, Text, Button) → Plain DOM
4. Alle Styles aus Mirror Properties ableiten
5. Accessibility: Nutze ARIA-Attribute von Zag
6. Erstelle funktionierende, lauffähige Dateien

═══════════════════════════════════════════════════════════════════════════════
TOOLS DIE DU NUTZEN KANNST
═══════════════════════════════════════════════════════════════════════════════

- Read: Dateien lesen
- Write: Dateien erstellen
- Edit: Dateien bearbeiten
- Bash(mkdir*): Verzeichnisse erstellen

Arbeite Task für Task. Dokumentiere kurz was du tust.
`;

// ═══════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════

// Args parsen
const args = process.argv.slice(2);
let specFile = null;
let outputDir = './output';

for (let i = 0; i < args.length; i++) {
  if (args[i] === '-o' || args[i] === '--output') {
    outputDir = args[++i];
  } else if (!specFile) {
    specFile = args[i];
  }
}

if (!specFile) {
  console.error('Usage: node build.js <spec.mirror> [-o output-dir]');
  console.error('');
  console.error('Beispiel:');
  console.error('  node build.js app.mirror -o ./dist');
  process.exit(1);
}

// Spec lesen
const specPath = resolve(specFile);
if (!existsSync(specPath)) {
  console.error(`Datei nicht gefunden: ${specPath}`);
  process.exit(1);
}

const spec = readFileSync(specPath, 'utf-8');

// Output-Verzeichnis
const outputPath = resolve(outputDir);
if (!existsSync(outputPath)) {
  mkdirSync(outputPath, { recursive: true });
}

// Prompt bauen
const prompt = `Implementiere diese Mirror-Spezifikation.

═══════════════════════════════════════════════════════════════════════════════
ZIEL-ORDNER: ${outputPath}
═══════════════════════════════════════════════════════════════════════════════

═══════════════════════════════════════════════════════════════════════════════
MIRROR SPEZIFIKATION
═══════════════════════════════════════════════════════════════════════════════

${spec}

═══════════════════════════════════════════════════════════════════════════════
AUFTRAG
═══════════════════════════════════════════════════════════════════════════════

Arbeite die Tasks ab:
1. ANALYSE - Was enthält die Spec?
2. STRUKTUR - Plane HTML/CSS/JS
3. DATEIEN - Erstelle index.html, styles.css, app.js
4. VERIFY - Prüfe das Ergebnis

Erstelle funktionierende, lauffähige Dateien im Ziel-Ordner.
`;

console.log('═══════════════════════════════════════════════════════════════');
console.log('  MIRROR BUILDER');
console.log('═══════════════════════════════════════════════════════════════');
console.log('');
console.log('Spec:', specPath);
console.log('Output:', outputPath);
console.log('');
console.log('Starte Agent...');
console.log('');

try {
  const result = spawnSync('claude', [
    '-p', prompt,
    '--append-system-prompt', systemPrompt,
    '--allowedTools', 'Write,Edit,Read,Bash(mkdir*)',
    '--max-turns', '20',
    '--output-format', 'json'
  ], {
    encoding: 'utf-8',
    maxBuffer: 10 * 1024 * 1024,
    cwd: process.cwd()
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    console.error('Agent Fehler:', result.stderr);
    process.exit(result.status);
  }

  const json = JSON.parse(result.stdout);

  console.log('───────────────────────────────────────────────────────────────');
  if (json.result) {
    console.log(json.result);
  } else {
    console.log('Build abgeschlossen.');
  }
  console.log('───────────────────────────────────────────────────────────────');
  console.log('');
  console.log(`Output: ${outputPath}`);

} catch (error) {
  console.error('Fehler:', error.message);
  process.exit(1);
}
