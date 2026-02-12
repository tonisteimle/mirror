/**
 * LLM E2E Test Cases with Requirements
 *
 * Each test defines:
 * - prompt: What to ask the LLM to generate
 * - requirements: What the LLM-Judge should check
 */

import { test, type TestCase } from './test-harness'

// ============================================================================
// Basic Component Tests
// ============================================================================

export const basicTests: TestCase[] = [
  test(
    'Simple Button',
    'Erstelle einen blauen Button mit dem Text "Klick mich"',
    [
      'Hat einen Button oder klickbares Element',
      'Der Text "Klick mich" ist sichtbar',
      'Hat eine blaue Hintergrundfarbe',
    ]
  ),

  test(
    'Card with Title',
    'Erstelle eine Card mit einem Titel "Willkommen"',
    [
      'Hat eine Card-ähnliche Struktur (Container mit Padding/Radius)',
      'Enthält den Text "Willkommen" als Titel',
      'Hat angemessenes Styling (Hintergrund, Abstände)',
    ]
  ),

  test(
    'Input Field',
    'Erstelle ein Eingabefeld für E-Mail mit Placeholder "E-Mail eingeben"',
    [
      'Hat ein Input-Element',
      'Hat einen Placeholder-Text',
      'Ist für E-Mail-Eingabe geeignet',
    ]
  ),
]

// ============================================================================
// Layout Tests
// ============================================================================

export const layoutTests: TestCase[] = [
  test(
    'Vertical Stack',
    'Erstelle eine vertikale Liste mit 3 Text-Elementen: "Eins", "Zwei", "Drei"',
    [
      'Verwendet vertikales Layout (ver)',
      'Enthält 3 Text-Elemente',
      'Die Texte "Eins", "Zwei", "Drei" sind vorhanden',
    ]
  ),

  test(
    'Horizontal Row',
    'Erstelle eine horizontale Reihe mit 2 Buttons: "Ja" und "Nein"',
    [
      'Verwendet horizontales Layout (hor)',
      'Hat 2 Buttons nebeneinander',
      'Buttons haben die Texte "Ja" und "Nein"',
    ]
  ),

  test(
    'Header Layout',
    'Erstelle einen Header mit Logo "MyApp" links und Navigation rechts',
    [
      'Hat horizontales Layout',
      'Logo/Text "MyApp" ist auf der linken Seite',
      'Navigation ist auf der rechten Seite (between oder spacing)',
    ]
  ),
]

// ============================================================================
// Form Tests
// ============================================================================

export const formTests: TestCase[] = [
  test(
    'Login Form',
    'Erstelle ein Login-Formular mit E-Mail-Feld, Passwort-Feld und Login-Button',
    [
      'Hat ein E-Mail Eingabefeld',
      'Hat ein Passwort Eingabefeld',
      'Hat einen Login/Submit Button',
      'Ist vertikal angeordnet',
    ]
  ),

  test(
    'Search Bar',
    'Erstelle eine Suchleiste mit Such-Icon und Eingabefeld',
    [
      'Hat ein Eingabefeld für die Suche',
      'Hat ein Such-Icon (search)',
      'Ist horizontal angeordnet',
    ]
  ),
]

// ============================================================================
// Dashboard Tests
// ============================================================================

export const dashboardTests: TestCase[] = [
  test(
    'Stats Card',
    'Erstelle eine Statistik-Karte: grosse Zahl "2.7 Mio" oben, Label "Umsatz" unten',
    [
      'Zeigt die Zahl "2.7 Mio" prominent an',
      'Hat ein Label "Umsatz"',
      'Die Zahl ist grösser/auffälliger als das Label',
      'Ist vertikal angeordnet',
    ]
  ),

  test(
    'Metric Tiles',
    'Erstelle 3 Kacheln nebeneinander: "Umsatz: €500k", "Kunden: 1.2k", "Orders: 89"',
    [
      'Hat 3 Kacheln/Cards',
      'Sind horizontal nebeneinander angeordnet',
      'Jede Kachel hat Label und Wert',
    ]
  ),
]

// ============================================================================
// Interactive Tests
// ============================================================================

export const interactiveTests: TestCase[] = [
  test(
    'Navigation Button',
    'Erstelle einen Button "Zum Dashboard" der zur Seite "Dashboard" navigiert',
    [
      'Hat einen Button mit Text',
      'Hat onclick Event',
      'Navigiert zu "Dashboard" (page Dashboard)',
    ]
  ),

  test(
    'Icon Button',
    'Erstelle einen runden Button mit Plus-Icon zum Hinzufügen',
    [
      'Hat ein Plus-Icon (plus oder add)',
      'Ist rund oder hat border-radius',
      'Ist als Button erkennbar',
    ]
  ),
]

// ============================================================================
// Styling Tests
// ============================================================================

export const stylingTests: TestCase[] = [
  test(
    'Dark Card',
    'Erstelle eine dunkle Card (#1E1E1E) mit weissem Text "Hello World"',
    [
      'Hat dunklen Hintergrund (bg mit dunkler Farbe)',
      'Hat weissen oder hellen Text',
      'Zeigt "Hello World" an',
    ]
  ),

  test(
    'Styled Button',
    'Erstelle einen Button mit: blauer Hintergrund, weisser Text, abgerundete Ecken, Padding',
    [
      'Hat blauen Hintergrund',
      'Hat weissen Text',
      'Hat border-radius (rad)',
      'Hat Padding (pad)',
    ]
  ),
]

// ============================================================================
// Complex UI Tests
// ============================================================================

export const complexTests: TestCase[] = [
  test(
    'User Profile Card',
    'Erstelle eine Profilkarte mit: Avatar-Platzhalter, Name "Max Muster", E-Mail "max@example.com", Edit-Button',
    [
      'Hat einen Avatar-Bereich (Bild oder Platzhalter)',
      'Zeigt den Namen "Max Muster"',
      'Zeigt die E-Mail',
      'Hat einen Edit/Bearbeiten Button',
    ]
  ),

  test(
    'Notification Item',
    'Erstelle eine Benachrichtigung: Icon links, Titel "Neue Nachricht", Text "Du hast 3 ungelesene...", Zeit "vor 5 Min"',
    [
      'Hat ein Icon auf der linken Seite',
      'Hat einen Titel',
      'Hat Beschreibungstext',
      'Zeigt eine Zeitangabe',
    ]
  ),
]

// ============================================================================
// Aggregated Test Suites
// ============================================================================

export const allTests: TestCase[] = [
  ...basicTests,
  ...layoutTests,
  ...formTests,
  ...dashboardTests,
  ...interactiveTests,
  ...stylingTests,
  ...complexTests,
]

export const smokeTests: TestCase[] = [
  basicTests[0],  // Simple Button
  layoutTests[0], // Vertical Stack
  formTests[0],   // Login Form
]
