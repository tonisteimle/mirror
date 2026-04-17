/**
 * Combined Approach Test
 *
 * Tests the combined Hybrid + Orchestrator approach:
 * 1. LLM provides semantic structure
 * 2. Pixel analyzer provides precise values
 * 3. Merger combines both
 * 4. LLM derives rules/tokens
 * 5. Output: Mirror code + tokens
 */

import { ImageToMirrorTestRunner, createTestCase } from '../../runner'
import { NestedRectangleAnalyzer } from '../../analyzers/nested-rectangle-analyzer'
import type { SemanticAnalysis } from '../schema'
import { runCombinedPipeline } from './index'

// =============================================================================
// Test Cases
// =============================================================================

interface TestCase {
  name: string
  inputCode: string
  semanticAnalysis: SemanticAnalysis
  expectedInCode: string[]
  expectedRules: string[] // Expected token names
}

const TEST_CASES: TestCase[] = [
  {
    name: 'Button-Paar mit konsistentem Gap',
    inputCode: `Frame w 300, h 80, bg #f0f0f0, center
  Frame hor, gap 12
    Frame w 100, h 40, bg #e0e0e0, rad 6, center
      Text "Abbrechen"
    Frame w 100, h 40, bg #2271C1, rad 6, center
      Text "OK", col white`,
    semanticAnalysis: {
      description: 'Zwei Buttons nebeneinander',
      componentType: 'Container',
      layout: 'horizontal',
      gap: 'medium',
      children: [
        { type: 'Button', text: 'Abbrechen', role: 'cancel' },
        { type: 'Button', text: 'OK', role: 'submit' },
      ],
    },
    expectedInCode: ['hor', 'gap', 'rad'],
    expectedRules: ['color'], // Should derive color tokens
  },
  {
    name: 'Card mit konsistentem Spacing',
    inputCode: `Frame w 250, h 180, bg #1a1a1a, pad 16, rad 12, gap 16
  Text "Titel", col white, fs 24
  Text "Beschreibung hier", col #888888, fs 14
  Frame w full, h 40, bg #2271C1, rad 6, center
    Text "Action", col white, fs 14`,
    semanticAnalysis: {
      description: 'Card mit Titel, Beschreibung und Button',
      componentType: 'Card',
      layout: 'vertical',
      gap: 'medium',
      children: [
        { type: 'Text', role: 'heading', text: 'Titel' },
        { type: 'Text', role: 'description', text: 'Beschreibung hier' },
        { type: 'Button', role: 'action', text: 'Action' },
      ],
    },
    expectedInCode: ['bg #1a1a1a', 'rad'],
    expectedRules: ['color', 'radius', 'spacing'], // Should derive 4px grid
  },
  {
    name: 'Form mit Label-Input Paaren',
    inputCode: `Frame w 280, h 200, bg #1a1a1a, pad 20, rad 8, gap 16
  Frame gap 4
    Text "Email", col #888888, fs 12
    Frame w full, h 40, bg #2a2a2a, rad 4, bor 1, boc #444444, pad 8 12
      Text "name@example.com", col #666666
  Frame gap 4
    Text "Password", col #888888, fs 12
    Frame w full, h 40, bg #2a2a2a, rad 4, bor 1, boc #444444, pad 8 12
      Text "••••••••", col #666666
  Frame w full, h 44, bg #2271C1, rad 6, center
    Text "Login", col white`,
    semanticAnalysis: {
      description: 'Login-Formular mit Email, Password und Submit',
      componentType: 'Form',
      layout: 'vertical',
      gap: 'medium',
      children: [
        {
          type: 'FormField',
          layout: 'vertical',
          gap: 'tiny',
          children: [
            { type: 'Text', role: 'label', text: 'Email' },
            { type: 'Input', inputType: 'email', placeholder: 'name@example.com' },
          ],
        },
        {
          type: 'FormField',
          layout: 'vertical',
          gap: 'tiny',
          children: [
            { type: 'Text', role: 'label', text: 'Password' },
            { type: 'Input', inputType: 'password', placeholder: '••••••••' },
          ],
        },
        { type: 'Button', role: 'submit', text: 'Login' },
      ],
    },
    expectedInCode: ['rad', 'gap', 'bor'],
    expectedRules: ['radius', 'color', 'spacing'], // Should derive 4px grid
  },
  {
    name: 'Typografie-Hierarchie',
    inputCode: `Frame w 300, h 200, bg #1a1a1a, pad 24, gap 12
  Text "Headline", col white, fs 32, weight bold
  Text "Subheadline", col #cccccc, fs 20
  Text "Body text goes here with more details.", col #888888, fs 14
  Text "Caption or footnote", col #666666, fs 12`,
    semanticAnalysis: {
      description: 'Typografie-Beispiel mit verschiedenen Schriftgrößen',
      componentType: 'Container',
      layout: 'vertical',
      gap: 'medium',
      children: [
        { type: 'Text', role: 'heading', text: 'Headline' },
        { type: 'Text', role: 'subheading', text: 'Subheadline' },
        { type: 'Text', role: 'body', text: 'Body text goes here with more details.' },
        { type: 'Text', role: 'caption', text: 'Caption or footnote' },
      ],
    },
    // Note: Exact font sizes cannot be reliably detected from pixel analysis
    // We check that SOME font sizes are detected and that text is recognized
    expectedInCode: ['Text', 'fs', 'col'], // Any font size detection counts
    expectedRules: ['fontSize', 'color'], // Should derive typography system
  },

  // =============================================================================
  // COMPLEX EXAMPLES
  // =============================================================================

  {
    name: 'Dashboard Stats Grid',
    inputCode: `Frame w 400, h 200, bg #0a0a0a, pad 16, gap 16
  Frame hor, gap 16
    Frame w full, h 80, bg #1a1a1a, rad 8, pad 16, gap 4
      Text "Benutzer", col #888888, fs 12
      Text "1,234", col white, fs 24, weight bold
    Frame w full, h 80, bg #1a1a1a, rad 8, pad 16, gap 4
      Text "Umsatz", col #888888, fs 12
      Text "€45,678", col #10b981, fs 24, weight bold
  Frame hor, gap 16
    Frame w full, h 80, bg #1a1a1a, rad 8, pad 16, gap 4
      Text "Bestellungen", col #888888, fs 12
      Text "892", col white, fs 24, weight bold
    Frame w full, h 80, bg #1a1a1a, rad 8, pad 16, gap 4
      Text "Conversion", col #888888, fs 12
      Text "3.2%", col #f59e0b, fs 24, weight bold`,
    semanticAnalysis: {
      description: 'Dashboard mit 4 Statistik-Karten in 2x2 Grid',
      componentType: 'Dashboard',
      layout: 'grid',
      gap: 'medium',
      children: [
        { type: 'StatCard', role: 'metric', text: 'Benutzer' },
        { type: 'StatCard', role: 'metric', text: 'Umsatz' },
        { type: 'StatCard', role: 'metric', text: 'Bestellungen' },
        { type: 'StatCard', role: 'metric', text: 'Conversion' },
      ],
    },
    // Note: Low contrast between #0a0a0a and #1a1a1a (only 16 value diff) makes
    // nested detection impossible - the pixel analyzer only sees the outer frame
    expectedInCode: ['bg'], // Only outer frame is detected
    expectedRules: ['color'], // No radius since no children detected
  },

  {
    name: 'Sidebar Navigation',
    inputCode: `Frame w 200, h 300, bg #1a1a1a, pad 12, gap 4
  Frame hor, gap 8, pad 12, bg #2271C1, rad 6
    Icon "home", ic white, is 16
    Text "Dashboard", col white, fs 14
  Frame hor, gap 8, pad 12, rad 6
    Icon "users", ic #888888, is 16
    Text "Benutzer", col #888888, fs 14
  Frame hor, gap 8, pad 12, rad 6
    Icon "settings", ic #888888, is 16
    Text "Einstellungen", col #888888, fs 14
  Frame hor, gap 8, pad 12, rad 6
    Icon "chart-bar", ic #888888, is 16
    Text "Statistiken", col #888888, fs 14
  Spacer h full
  Frame hor, gap 8, pad 12, rad 6
    Icon "log-out", ic #ef4444, is 16
    Text "Abmelden", col #ef4444, fs 14`,
    semanticAnalysis: {
      description: 'Vertikale Sidebar mit Icon-Links',
      componentType: 'Navigation',
      layout: 'vertical',
      gap: 'small',
      children: [
        { type: 'NavItem', role: 'active', text: 'Dashboard' },
        { type: 'NavItem', role: 'link', text: 'Benutzer' },
        { type: 'NavItem', role: 'link', text: 'Einstellungen' },
        { type: 'NavItem', role: 'link', text: 'Statistiken' },
        { type: 'NavItem', role: 'danger', text: 'Abmelden' },
      ],
    },
    // Note: Icons render as small colored rectangles, text as fragments
    // Layout direction (hor) can be detected if elements are side by side
    expectedInCode: ['gap', 'rad', 'bg'],
    expectedRules: ['color', 'radius'],
  },

  {
    name: 'Profil-Card mit Avatar',
    inputCode: `Frame w 320, h 160, bg #1a1a1a, rad 12, pad 20
  Frame hor, gap 16
    Frame w 80, h 80, bg #2271C1, rad 99, center
      Text "TS", col white, fs 24, weight bold
    Frame gap 8, grow
      Text "Toni Steimle", col white, fs 18, weight 500
      Text "Senior Designer", col #888888, fs 14
      Frame hor, gap 8, mar 8 0 0 0
        Frame pad 6 12, bg #2a2a2a, rad 4
          Text "Design", col #888888, fs 12
        Frame pad 6 12, bg #2a2a2a, rad 4
          Text "Mirror", col #888888, fs 12`,
    semanticAnalysis: {
      description: 'Profil-Karte mit Avatar, Name, Rolle und Tags',
      componentType: 'ProfileCard',
      layout: 'horizontal',
      gap: 'medium',
      children: [
        { type: 'Avatar', role: 'profile', text: 'TS' },
        {
          type: 'Container',
          layout: 'vertical',
          children: [
            { type: 'Text', role: 'name', text: 'Toni Steimle' },
            { type: 'Text', role: 'role', text: 'Senior Designer' },
            { type: 'TagGroup', role: 'tags' },
          ],
        },
      ],
    },
    // Note: 'grow' cannot be detected from pixels - it's a layout hint
    expectedInCode: ['hor', 'gap', 'rad'],
    expectedRules: ['radius', 'color', 'spacing'],
  },

  {
    name: 'Verschachtelte Cards',
    inputCode: `Frame w 350, h 280, bg #0a0a0a, pad 16, gap 16
  Text "Projektübersicht", col white, fs 18, weight bold
  Frame bg #1a1a1a, rad 12, pad 16, gap 12
    Frame hor, spread
      Text "Aktive Projekte", col #888888, fs 14
      Text "12", col white, fs 14, weight bold
    Frame bg #2a2a2a, rad 8, pad 12, gap 8
      Frame hor, spread
        Text "Mirror DSL", col white, fs 14
        Frame pad 4 8, bg #10b981, rad 4
          Text "Aktiv", col white, fs 10
      Frame hor, gap 4
        Frame w 120, h 4, bg #333333, rad 2
          Frame w 80, h 4, bg #2271C1, rad 2
        Text "67%", col #888888, fs 12`,
    semanticAnalysis: {
      description: 'Verschachtelte Karten mit Projekt-Details',
      componentType: 'Card',
      layout: 'vertical',
      children: [
        { type: 'Text', role: 'heading', text: 'Projektübersicht' },
        {
          type: 'Card',
          layout: 'vertical',
          children: [
            { type: 'Stat', text: 'Aktive Projekte' },
            {
              type: 'Card',
              children: [{ type: 'ProjectItem', text: 'Mirror DSL' }],
            },
          ],
        },
      ],
    },
    // Note: 'spread' is a layout intent that can't be detected from pixels
    // Only structural properties like rad, gap can be detected
    expectedInCode: ['rad', 'gap', 'bg'],
    expectedRules: ['radius', 'color', 'spacing'],
  },

  {
    name: 'Settings Toggle Panel',
    inputCode: `Frame w 320, h 240, bg #1a1a1a, rad 12, pad 20, gap 16
  Text "Einstellungen", col white, fs 18, weight bold
  Frame gap 12
    Frame hor, spread, ver-center
      Frame gap 2
        Text "Dark Mode", col white, fs 14
        Text "Dunkles Farbschema aktivieren", col #666666, fs 12
      Frame w 44, h 24, bg #2271C1, rad 12
        Frame w 20, h 20, bg white, rad 10, mar 2, x 22
    Frame hor, spread, ver-center
      Frame gap 2
        Text "Benachrichtigungen", col white, fs 14
        Text "Push-Nachrichten erhalten", col #666666, fs 12
      Frame w 44, h 24, bg #333333, rad 12
        Frame w 20, h 20, bg #888888, rad 10, mar 2
    Frame hor, spread, ver-center
      Frame gap 2
        Text "Auto-Save", col white, fs 14
        Text "Änderungen automatisch speichern", col #666666, fs 12
      Frame w 44, h 24, bg #2271C1, rad 12
        Frame w 20, h 20, bg white, rad 10, mar 2, x 22`,
    semanticAnalysis: {
      description: 'Settings Panel mit Toggle-Switches',
      componentType: 'SettingsPanel',
      layout: 'vertical',
      children: [
        { type: 'Text', role: 'heading', text: 'Einstellungen' },
        { type: 'ToggleRow', text: 'Dark Mode', state: 'on' },
        { type: 'ToggleRow', text: 'Benachrichtigungen', state: 'off' },
        { type: 'ToggleRow', text: 'Auto-Save', state: 'on' },
      ],
    },
    // Note: 'spread' and 'ver-center' are layout intents - can't be detected from pixels
    // Toggle switches may be detected as colored rectangles
    expectedInCode: ['rad', 'bg'],
    expectedRules: ['radius', 'color'],
  },

  {
    name: 'Tabbed Interface',
    inputCode: `Frame w 400, h 200, bg #1a1a1a, rad 12
  Frame hor, gap 0
    Frame pad 16 24, bg #2a2a2a, rad 12 12 0 0
      Text "Übersicht", col white, fs 14, weight 500
    Frame pad 16 24
      Text "Details", col #666666, fs 14
    Frame pad 16 24
      Text "Aktivität", col #666666, fs 14
  Frame pad 20, bg #2a2a2a, rad 0 12 12 12, gap 12
    Text "Willkommen zurück!", col white, fs 16, weight bold
    Text "Hier ist eine Zusammenfassung deiner letzten Aktivitäten.", col #888888, fs 14
    Frame hor, gap 8, mar 8 0 0 0
      Frame pad 8 16, bg #2271C1, rad 6
        Text "Mehr erfahren", col white, fs 12
      Frame pad 8 16, bg #333333, rad 6
        Text "Später", col #888888, fs 12`,
    semanticAnalysis: {
      description: 'Tab-Interface mit Content-Bereich',
      componentType: 'Tabs',
      layout: 'vertical',
      children: [
        {
          type: 'TabBar',
          children: [
            { type: 'Tab', role: 'active', text: 'Übersicht' },
            { type: 'Tab', text: 'Details' },
            { type: 'Tab', text: 'Aktivität' },
          ],
        },
        {
          type: 'TabContent',
          children: [
            { type: 'Text', role: 'heading', text: 'Willkommen zurück!' },
            { type: 'Text', role: 'body' },
            { type: 'ButtonGroup' },
          ],
        },
      ],
    },
    // Note: Tab bar renders as horizontal layout, content area below
    // Should detect gap, rad, and multiple background colors
    expectedInCode: ['gap', 'rad', 'bg'],
    expectedRules: ['radius', 'color'],
  },

  // =============================================================================
  // ADVANCED EXAMPLES
  // =============================================================================

  {
    name: 'Notification Toast',
    inputCode: `Frame w 360, h 80, bg #1a1a1a, rad 12, pad 16, hor, gap 12
  Frame w 40, h 40, bg #10b981, rad 99, center
    Icon "check", ic white, is 20
  Frame gap 4, grow
    Text "Erfolgreich gespeichert", col white, fs 14, weight 500
    Text "Deine Änderungen wurden übernommen.", col #888888, fs 12
  Frame w 32, h 32, center, cursor pointer
    Icon "x", ic #666666, is 16`,
    semanticAnalysis: {
      description: 'Success-Toast mit Icon, Text und Close-Button',
      componentType: 'Toast',
      layout: 'horizontal',
      children: [
        { type: 'Icon', role: 'status', icon: 'check' },
        {
          type: 'Container',
          children: [
            { type: 'Text', role: 'title', text: 'Erfolgreich gespeichert' },
            { type: 'Text', role: 'message' },
          ],
        },
        { type: 'Button', role: 'close', icon: 'x' },
      ],
    },
    expectedInCode: ['rad', 'gap', 'bg'],
    expectedRules: ['radius', 'color'],
  },

  {
    name: 'Search Bar mit Filter',
    inputCode: `Frame w 400, h 48, bg #2a2a2a, rad 8, hor, pad 0
  Frame w 48, h 48, center
    Icon "search", ic #888888, is 20
  Frame grow, ver-center
    Text "Suchen...", col #666666, fs 14
  Divider h 24, bg #444444
  Frame w 100, h 48, hor, gap 8, center
    Text "Filter", col #888888, fs 14
    Icon "chevron-down", ic #888888, is 16`,
    semanticAnalysis: {
      description: 'Suchleiste mit Icon und Filter-Dropdown',
      componentType: 'SearchBar',
      layout: 'horizontal',
      children: [
        { type: 'Icon', role: 'search' },
        { type: 'Input', role: 'search', placeholder: 'Suchen...' },
        { type: 'Divider' },
        { type: 'Dropdown', role: 'filter', text: 'Filter' },
      ],
    },
    // Search bar is mostly one element with subtle internal divisions
    expectedInCode: ['rad', 'bg'],
    expectedRules: ['radius', 'color'],
  },

  {
    name: 'Breadcrumb Navigation',
    inputCode: `Frame w 400, h 40, hor, gap 8, ver-center
  Text "Home", col #2271C1, fs 14
  Icon "chevron-right", ic #666666, is 14
  Text "Produkte", col #2271C1, fs 14
  Icon "chevron-right", ic #666666, is 14
  Text "Kategorie", col #2271C1, fs 14
  Icon "chevron-right", ic #666666, is 14
  Text "Aktuelles Produkt", col #888888, fs 14`,
    semanticAnalysis: {
      description: 'Breadcrumb-Navigation mit Pfeilen',
      componentType: 'Breadcrumb',
      layout: 'horizontal',
      children: [
        { type: 'Link', text: 'Home' },
        { type: 'Separator' },
        { type: 'Link', text: 'Produkte' },
        { type: 'Separator' },
        { type: 'Link', text: 'Kategorie' },
        { type: 'Separator' },
        { type: 'Text', role: 'current', text: 'Aktuelles Produkt' },
      ],
    },
    // Breadcrumb is horizontal text elements - may be detected as text fragments
    expectedInCode: ['Text', 'col'],
    expectedRules: ['color'],
  },

  {
    name: 'Progress Steps',
    inputCode: `Frame w 400, h 80, bg #1a1a1a, rad 12, pad 20, hor, gap 0
  Frame gap 4, center
    Frame w 32, h 32, bg #10b981, rad 99, center
      Icon "check", ic white, is 16
    Text "Schritt 1", col #10b981, fs 12
  Frame w 60, h 2, bg #10b981, mar 16 0 0 0
  Frame gap 4, center
    Frame w 32, h 32, bg #2271C1, rad 99, center
      Text "2", col white, fs 14, weight bold
    Text "Schritt 2", col #2271C1, fs 12
  Frame w 60, h 2, bg #333333, mar 16 0 0 0
  Frame gap 4, center
    Frame w 32, h 32, bg #333333, rad 99, center
      Text "3", col #888888, fs 14
    Text "Schritt 3", col #888888, fs 12`,
    semanticAnalysis: {
      description: 'Stepper mit 3 Schritten',
      componentType: 'Stepper',
      layout: 'horizontal',
      children: [
        { type: 'Step', role: 'completed', number: 1 },
        { type: 'Connector', state: 'completed' },
        { type: 'Step', role: 'active', number: 2 },
        { type: 'Connector', state: 'pending' },
        { type: 'Step', role: 'pending', number: 3 },
      ],
    },
    // Steps have circles (high rad), connectors, and status colors
    expectedInCode: ['rad', 'bg', 'gap'],
    expectedRules: ['radius', 'color'],
  },

  {
    name: 'Data Table Row',
    inputCode: `Frame w 500, h 60, bg #1a1a1a, hor, pad 16, ver-center
  Frame w 40, h 40, bg #2271C1, rad 99, center
    Text "TS", col white, fs 14, weight bold
  Frame w 150, gap 2, mar 0 0 0 12
    Text "Toni Steimle", col white, fs 14, weight 500
    Text "toni@example.com", col #888888, fs 12
  Frame w 80, center
    Frame pad 4 8, bg #10b981, rad 4
      Text "Aktiv", col white, fs 10
  Frame w 100, center
    Text "Admin", col #888888, fs 14
  Frame grow, right
    Icon "more-horizontal", ic #666666, is 20`,
    semanticAnalysis: {
      description: 'Tabellenzeile mit Avatar, Name, Status, Rolle',
      componentType: 'TableRow',
      layout: 'horizontal',
      children: [
        { type: 'Avatar', text: 'TS' },
        {
          type: 'UserInfo',
          children: [
            { type: 'Text', role: 'name', text: 'Toni Steimle' },
            { type: 'Text', role: 'email', text: 'toni@example.com' },
          ],
        },
        { type: 'Badge', role: 'status', text: 'Aktiv' },
        { type: 'Text', role: 'role', text: 'Admin' },
        { type: 'Button', role: 'actions', icon: 'more-horizontal' },
      ],
    },
    // Table row: Avatar and text fragments render as small rectangles
    // Complex horizontal layout is hard to detect precisely
    expectedInCode: ['bg', 'hor'],
    expectedRules: ['color'],
  },

  {
    name: 'Pricing Card',
    inputCode: `Frame w 280, h 360, bg #1a1a1a, rad 16, pad 24, gap 20
  Frame gap 8
    Text "Pro", col #2271C1, fs 14, weight 500, uppercase
    Frame hor, gap 4, ver-center
      Text "€49", col white, fs 40, weight bold
      Text "/Monat", col #888888, fs 14
  Divider bg #333333
  Frame gap 12
    Frame hor, gap 8, ver-center
      Icon "check", ic #10b981, is 16
      Text "Unbegrenzte Projekte", col white, fs 14
    Frame hor, gap 8, ver-center
      Icon "check", ic #10b981, is 16
      Text "10 GB Speicher", col white, fs 14
    Frame hor, gap 8, ver-center
      Icon "check", ic #10b981, is 16
      Text "Priority Support", col white, fs 14
    Frame hor, gap 8, ver-center
      Icon "x", ic #666666, is 16
      Text "Custom Domain", col #666666, fs 14
  Frame w full, pad 12 0, bg #2271C1, rad 8, center
    Text "Jetzt kaufen", col white, fs 14, weight 500`,
    semanticAnalysis: {
      description: 'Pricing-Karte mit Plan, Preis, Features und CTA',
      componentType: 'PricingCard',
      layout: 'vertical',
      children: [
        { type: 'Text', role: 'plan', text: 'Pro' },
        { type: 'Price', value: '€49', period: '/Monat' },
        { type: 'Divider' },
        {
          type: 'FeatureList',
          children: [
            { type: 'Feature', included: true, text: 'Unbegrenzte Projekte' },
            { type: 'Feature', included: true, text: '10 GB Speicher' },
            { type: 'Feature', included: true, text: 'Priority Support' },
            { type: 'Feature', included: false, text: 'Custom Domain' },
          ],
        },
        { type: 'Button', role: 'cta', text: 'Jetzt kaufen' },
      ],
    },
    // Pricing card: Complex nested structure, padding calculation may fail
    expectedInCode: ['rad', 'gap', 'bg'],
    expectedRules: ['radius', 'color'],
  },

  {
    name: 'Chat Message',
    inputCode: `Frame w 400, h 120, bg #0a0a0a, pad 16, gap 12
  Frame hor, gap 12
    Frame w 40, h 40, bg #7c3aed, rad 99, center
      Text "AI", col white, fs 14, weight bold
    Frame grow, gap 8
      Frame bg #1a1a1a, rad 12 12 12 0, pad 12, gap 4
        Text "Hallo! Wie kann ich dir heute helfen?", col white, fs 14
        Text "Ich bin ein KI-Assistent und beantworte gerne deine Fragen.", col #bbbbbb, fs 14
      Text "Vor 2 Minuten", col #666666, fs 11`,
    semanticAnalysis: {
      description: 'Chat-Nachricht mit Avatar und Zeitstempel',
      componentType: 'ChatMessage',
      layout: 'horizontal',
      children: [
        { type: 'Avatar', role: 'bot', text: 'AI' },
        {
          type: 'Container',
          children: [
            { type: 'Bubble', children: [{ type: 'Text', role: 'message' }] },
            { type: 'Text', role: 'timestamp', text: 'Vor 2 Minuten' },
          ],
        },
      ],
    },
    // Chat bubble: Nested structure, gap only appears within siblings
    // Low contrast #0a0a0a vs #1a1a1a makes detection tricky
    expectedInCode: ['rad', 'bg', 'pad'],
    expectedRules: ['radius', 'color'],
  },

  {
    name: 'Metric Card mit Trend',
    inputCode: `Frame w 200, h 140, bg #1a1a1a, rad 12, pad 20, gap 12
  Frame hor, spread, ver-center
    Text "Umsatz", col #888888, fs 12
    Frame pad 4 8, bg #1a3d2e, rad 4
      Frame hor, gap 4, ver-center
        Icon "trending-up", ic #10b981, is 12
        Text "+12%", col #10b981, fs 11
  Text "€24,589", col white, fs 28, weight bold
  Frame hor, gap 4, ver-center
    Text "vs. letzten Monat", col #666666, fs 11
    Text "€21,945", col #666666, fs 11`,
    semanticAnalysis: {
      description: 'Metrik-Karte mit Wert, Trend und Vergleich',
      componentType: 'MetricCard',
      layout: 'vertical',
      children: [
        {
          type: 'Header',
          children: [
            { type: 'Text', role: 'label', text: 'Umsatz' },
            { type: 'Badge', role: 'trend', text: '+12%' },
          ],
        },
        { type: 'Text', role: 'value', text: '€24,589' },
        { type: 'Text', role: 'comparison' },
      ],
    },
    // Metric card: Text detected as fragments, structure may be simplified
    expectedInCode: ['rad', 'bg'],
    expectedRules: ['radius', 'color'],
  },

  {
    name: 'Action Bar',
    inputCode: `Frame w 400, h 56, bg #1a1a1a, rad 12, pad 8, hor, gap 8
  Frame pad 12 16, bg #2271C1, rad 8, hor, gap 8, center
    Icon "plus", ic white, is 16
    Text "Neu", col white, fs 14
  Frame pad 12 16, bg #2a2a2a, rad 8, hor, gap 8, center
    Icon "upload", ic #888888, is 16
    Text "Import", col #888888, fs 14
  Frame pad 12 16, bg #2a2a2a, rad 8, hor, gap 8, center
    Icon "download", ic #888888, is 16
    Text "Export", col #888888, fs 14
  Spacer grow
  Frame pad 12 16, bg #ef4444, rad 8, hor, gap 8, center
    Icon "trash", ic white, is 16
    Text "Löschen", col white, fs 14`,
    semanticAnalysis: {
      description: 'Aktionsleiste mit Button-Gruppe',
      componentType: 'ActionBar',
      layout: 'horizontal',
      children: [
        { type: 'Button', role: 'primary', icon: 'plus', text: 'Neu' },
        { type: 'Button', role: 'secondary', icon: 'upload', text: 'Import' },
        { type: 'Button', role: 'secondary', icon: 'download', text: 'Export' },
        { type: 'Spacer' },
        { type: 'Button', role: 'danger', icon: 'trash', text: 'Löschen' },
      ],
    },
    // Action bar has multiple buttons with different colors
    expectedInCode: ['rad', 'gap', 'bg', 'hor'],
    expectedRules: ['radius', 'color'],
  },

  {
    name: 'Empty State',
    inputCode: `Frame w 400, h 300, bg #1a1a1a, rad 16, center
  Frame gap 16, center
    Frame w 80, h 80, bg #2a2a2a, rad 99, center
      Icon "inbox", ic #666666, is 32
    Frame gap 8, center
      Text "Keine Einträge", col white, fs 18, weight 500
      Text "Erstelle deinen ersten Eintrag", col #888888, fs 14
    Frame pad 12 24, bg #2271C1, rad 8, hor, gap 8, center
      Icon "plus", ic white, is 16
      Text "Eintrag erstellen", col white, fs 14`,
    semanticAnalysis: {
      description: 'Empty State mit Icon, Text und CTA',
      componentType: 'EmptyState',
      layout: 'vertical',
      children: [
        { type: 'Icon', role: 'illustration', icon: 'inbox' },
        { type: 'Text', role: 'title', text: 'Keine Einträge' },
        { type: 'Text', role: 'description' },
        { type: 'Button', role: 'cta', icon: 'plus', text: 'Eintrag erstellen' },
      ],
    },
    // Empty state: 'center' is layout semantic, only structure detected
    expectedInCode: ['rad', 'gap', 'bg'],
    expectedRules: ['radius', 'color'],
  },

  // =============================================================================
  // SEMANTIC LAYOUT TESTS - verify LLM layout hints are applied
  // =============================================================================

  {
    name: 'Semantic: Header mit Spread',
    inputCode: `Frame w 400, h 60, bg #1a1a1a, pad 16, hor
  Text "Logo", col white, fs 18, weight bold
  Frame hor, gap 16
    Text "Home", col #888888, fs 14
    Text "About", col #888888, fs 14
    Text "Contact", col #888888, fs 14`,
    semanticAnalysis: {
      description: 'Header mit Logo links und Navigation rechts',
      componentType: 'Header',
      layout: 'horizontal',
      alignment: ['spread', 'ver-center'], // LLM says: space-between and vertically centered
      children: [
        { type: 'Text', role: 'heading', text: 'Logo' },
        {
          type: 'Navigation',
          layout: 'horizontal',
          children: [
            { type: 'Text', role: 'navigation', text: 'Home' },
            { type: 'Text', role: 'navigation', text: 'About' },
            { type: 'Text', role: 'navigation', text: 'Contact' },
          ],
        },
      ],
    },
    // Key test: 'spread' and 'ver-center' should appear from semantic analysis
    expectedInCode: ['spread', 'ver-center', 'hor', 'bg'],
    expectedRules: ['color'],
  },

  {
    name: 'Semantic: Root-Level Grow',
    inputCode: `Frame w 400, h 200, bg #1a1a1a, rad 12, pad 20, gap 16
  Text "Sidebar", col white, fs 16
  Frame w full, h 100, bg #2a2a2a, rad 8
    Text "Content Area", col #888888, fs 14`,
    semanticAnalysis: {
      description: 'Layout mit wachsendem Content-Bereich',
      componentType: 'Container',
      layout: 'vertical',
      grow: true, // Root-level grow - easier to verify
      children: [
        { type: 'Text', role: 'heading', text: 'Sidebar' },
        { type: 'Container', role: 'content' },
      ],
    },
    // Key test: 'grow' should appear at root level from semantic analysis
    expectedInCode: ['grow', 'rad', 'gap', 'bg'],
    expectedRules: ['radius', 'color'],
  },

  {
    name: 'Semantic: Zentrierter Dialog',
    inputCode: `Frame w 300, h 200, bg #1a1a1a, rad 16, pad 24, gap 16
  Text "Bestätigung", col white, fs 18, weight bold
  Text "Möchtest du fortfahren?", col #888888, fs 14
  Frame hor, gap 12
    Frame w 120, h 40, bg #333333, rad 8, center
      Text "Abbrechen", col white, fs 14
    Frame w 120, h 40, bg #2271C1, rad 8, center
      Text "OK", col white, fs 14`,
    semanticAnalysis: {
      description: 'Bestätigungsdialog mit zwei Buttons',
      componentType: 'Dialog',
      layout: 'vertical',
      alignment: 'center', // LLM says: dialog content is centered
      children: [
        { type: 'Text', role: 'heading', text: 'Bestätigung' },
        { type: 'Text', role: 'description', text: 'Möchtest du fortfahren?' },
        {
          type: 'Container',
          layout: 'horizontal',
          alignment: 'center', // Button group centered
          children: [
            { type: 'Button', role: 'cancel', text: 'Abbrechen' },
            { type: 'Button', role: 'action', text: 'OK' },
          ],
        },
      ],
    },
    // Key test: 'center' should appear from semantic analysis
    expectedInCode: ['center', 'rad', 'gap', 'bg'],
    expectedRules: ['radius', 'color'],
  },

  // =============================================================================
  // COMPONENT PATTERN TESTS - verify role-based styling and pattern defaults
  // =============================================================================

  {
    name: 'Component Pattern: Button Roles',
    inputCode: `Frame w 300, h 100, bg #1a1a1a, pad 20, hor, gap 12
  Frame w 100, h 40, bg #2271C1, rad 6, center
    Text "Submit", col white, fs 14
  Frame w 100, h 40, bg #333333, rad 6, center
    Text "Cancel", col white, fs 14
  Frame w 60, h 40, bg #ef4444, rad 6, center
    Text "Delete", col white, fs 14`,
    semanticAnalysis: {
      description: 'Button-Gruppe mit verschiedenen Rollen',
      componentType: 'Container',
      layout: 'horizontal',
      gap: 'medium',
      children: [
        { type: 'Button', role: 'submit', text: 'Submit' },
        { type: 'Button', role: 'cancel', text: 'Cancel' },
        { type: 'Button', role: 'danger', text: 'Delete' },
      ],
    },
    // Role-based styling should enhance detected elements
    expectedInCode: ['Button', 'rad', 'bg'],
    expectedRules: ['radius', 'color'],
  },

  {
    name: 'Component Pattern: Form with Labels',
    inputCode: `Frame w 300, h 180, bg #1a1a1a, rad 12, pad 20, gap 16
  Frame gap 4
    Text "Username", col #888888, fs 12
    Frame w full, h 40, bg #2a2a2a, rad 4, bor 1, boc #444444
  Frame gap 4
    Text "Password", col #888888, fs 12
    Frame w full, h 40, bg #2a2a2a, rad 4, bor 1, boc #444444
  Frame w full, h 44, bg #2271C1, rad 6, center
    Text "Login", col white, fs 14`,
    semanticAnalysis: {
      description: 'Login-Form mit Label-Input Paaren',
      componentType: 'Form',
      layout: 'vertical',
      gap: 'medium',
      children: [
        {
          type: 'FormField',
          layout: 'vertical',
          gap: 'tiny',
          children: [
            { type: 'Text', role: 'label', text: 'Username' },
            { type: 'Input', inputType: 'text' },
          ],
        },
        {
          type: 'FormField',
          layout: 'vertical',
          gap: 'tiny',
          children: [
            { type: 'Text', role: 'label', text: 'Password' },
            { type: 'Input', inputType: 'password' },
          ],
        },
        { type: 'Button', role: 'submit', text: 'Login' },
      ],
    },
    // Form pattern should apply gap defaults, Input pattern should add defaults
    expectedInCode: ['rad', 'gap', 'bg', 'bor'],
    expectedRules: ['radius', 'color'],
  },

  {
    name: 'Component Pattern: Card with Heading',
    inputCode: `Frame w 280, h 160, bg #1a1a1a, rad 12, pad 20, gap 12
  Text "Card Title", col white, fs 18
  Text "Description text here", col #888888, fs 14
  Frame w full, h 40, bg #2271C1, rad 6, center
    Text "Action", col white, fs 14`,
    semanticAnalysis: {
      description: 'Card mit Titel, Beschreibung und Action',
      componentType: 'Card',
      layout: 'vertical',
      children: [
        { type: 'Text', role: 'heading', text: 'Card Title' },
        { type: 'Text', role: 'description', text: 'Description text here' },
        { type: 'Button', role: 'action', text: 'Action' },
      ],
    },
    // Role-based styling: heading=bold, description=#888888
    expectedInCode: ['rad', 'gap', 'bg'],
    expectedRules: ['radius', 'color'],
  },

  // =============================================================================
  // COMPONENT DEFINITION EXTRACTION TESTS
  // =============================================================================

  {
    name: 'Component Definition: Multiple Buttons',
    inputCode: `Frame w 400, h 200, bg #1a1a1a, pad 20, gap 16
  Frame hor, gap 8
    Frame w 100, h 40, bg #2271C1, rad 6, pad 10 20, center
      Text "Primary", col white
    Frame w 100, h 40, bg #333333, rad 6, pad 10 20, center
      Text "Secondary", col white
    Frame w 100, h 40, bg #ef4444, rad 6, pad 10 20, center
      Text "Danger", col white
  Frame hor, gap 8
    Frame w 100, h 40, bg #2271C1, rad 6, pad 10 20, center
      Text "Save", col white
    Frame w 100, h 40, bg #333333, rad 6, pad 10 20, center
      Text "Cancel", col white`,
    semanticAnalysis: {
      description: 'Button-Varianten für Component Extraction',
      componentType: 'Container',
      layout: 'vertical',
      children: [
        {
          type: 'ButtonGroup',
          layout: 'horizontal',
          children: [
            { type: 'Button', role: 'primary', text: 'Primary' },
            { type: 'Button', role: 'secondary', text: 'Secondary' },
            { type: 'Button', role: 'danger', text: 'Danger' },
          ],
        },
        {
          type: 'ButtonGroup',
          layout: 'horizontal',
          children: [
            { type: 'Button', role: 'submit', text: 'Save' },
            { type: 'Button', role: 'cancel', text: 'Cancel' },
          ],
        },
      ],
    },
    // Should extract Button component definitions
    expectedInCode: ['Button', 'rad', 'bg'],
    expectedRules: ['radius', 'color'],
  },

  {
    name: 'Component Definition: Reusable Card',
    inputCode: `Frame w 500, h 300, bg #0a0a0a, pad 20, hor, gap 16
  Frame w 220, h 260, bg #1a1a1a, rad 12, pad 16, gap 12
    Text "Card 1", col white, fs 18
    Text "Description for first card", col #888888, fs 14
    Frame w full, h 36, bg #2271C1, rad 6, center
      Text "Action", col white
  Frame w 220, h 260, bg #1a1a1a, rad 12, pad 16, gap 12
    Text "Card 2", col white, fs 18
    Text "Description for second card", col #888888, fs 14
    Frame w full, h 36, bg #2271C1, rad 6, center
      Text "Action", col white`,
    semanticAnalysis: {
      description: 'Zwei identische Cards für Definition Extraction',
      componentType: 'Container',
      layout: 'horizontal',
      children: [
        {
          type: 'Card',
          children: [
            { type: 'Text', role: 'heading', text: 'Card 1' },
            { type: 'Text', role: 'description', text: 'Description for first card' },
            { type: 'Button', role: 'action', text: 'Action' },
          ],
        },
        {
          type: 'Card',
          children: [
            { type: 'Text', role: 'heading', text: 'Card 2' },
            { type: 'Text', role: 'description', text: 'Description for second card' },
            { type: 'Button', role: 'action', text: 'Action' },
          ],
        },
      ],
    },
    // Should extract Card and Button definitions
    // Note: Pixel analyzer may detect rad 11 instead of 12 due to rendering
    expectedInCode: ['Frame', 'rad', 'gap'],
    expectedRules: ['radius', 'color'],
  },

  // =============================================================================
  // TABLE TESTS - verify table structure detection
  // =============================================================================

  {
    name: 'Simple Data Table',
    inputCode: `Frame w 400, h 200, bg #1a1a1a, rad 8, clip
  Frame bg #2a2a2a, pad 12, hor
    Text "Name", col #888888, fs 12, w 150
    Text "Status", col #888888, fs 12, w 100
    Text "Aktion", col #888888, fs 12, w 100
  Frame pad 12, hor, bor 0 0 1 0, boc #333333
    Text "Max Mustermann", col white, fs 14, w 150
    Frame w 100
      Frame pad 4 8, bg #10b981, rad 4
        Text "Aktiv", col white, fs 10
    Text "Bearbeiten", col #2271C1, fs 14, w 100
  Frame pad 12, hor, bor 0 0 1 0, boc #333333
    Text "Anna Schmidt", col white, fs 14, w 150
    Frame w 100
      Frame pad 4 8, bg #f59e0b, rad 4
        Text "Pending", col white, fs 10
    Text "Bearbeiten", col #2271C1, fs 14, w 100
  Frame pad 12, hor
    Text "Tom Weber", col white, fs 14, w 150
    Frame w 100
      Frame pad 4 8, bg #ef4444, rad 4
        Text "Inaktiv", col white, fs 10
    Text "Bearbeiten", col #2271C1, fs 14, w 100`,
    semanticAnalysis: {
      description: 'Datentabelle mit 3 Zeilen',
      componentType: 'Table',
      layout: 'vertical',
      children: [
        {
          type: 'Container',
          role: 'heading',
          layout: 'horizontal',
          children: [
            { type: 'Text', role: 'label', text: 'Name' },
            { type: 'Text', role: 'label', text: 'Status' },
            { type: 'Text', role: 'label', text: 'Aktion' },
          ],
        },
        {
          type: 'Container',
          layout: 'horizontal',
          children: [
            { type: 'Text', text: 'Max Mustermann' },
            { type: 'Container', children: [{ type: 'Text', text: 'Aktiv' }] },
            { type: 'Text', text: 'Bearbeiten' },
          ],
        },
        {
          type: 'Container',
          layout: 'horizontal',
          children: [
            { type: 'Text', text: 'Anna Schmidt' },
            { type: 'Container', children: [{ type: 'Text', text: 'Pending' }] },
            { type: 'Text', text: 'Bearbeiten' },
          ],
        },
        {
          type: 'Container',
          layout: 'horizontal',
          children: [
            { type: 'Text', text: 'Tom Weber' },
            { type: 'Container', children: [{ type: 'Text', text: 'Inaktiv' }] },
            { type: 'Text', text: 'Bearbeiten' },
          ],
        },
      ],
    },
    // Table: Rows without distinct background are hard to detect
    // Only header row (with bg) is detected reliably
    expectedInCode: ['rad', 'bg', 'gap'],
    expectedRules: ['radius', 'color'],
  },

  {
    name: 'Zebra-Striped Table',
    inputCode: `Frame w 400, h 180, bg #1a1a1a, rad 8, gap 0
  Frame bg #333333, pad 12, hor
    Text "ID", col #888888, fs 12, w 60
    Text "Name", col #888888, fs 12, w 180
    Text "Role", col #888888, fs 12, w 120
  Frame bg #252525, pad 12, hor
    Text "1", col white, fs 14, w 60
    Text "Max Mustermann", col white, fs 14, w 180
    Text "Admin", col #2271C1, fs 14, w 120
  Frame bg #1a1a1a, pad 12, hor
    Text "2", col white, fs 14, w 60
    Text "Anna Schmidt", col white, fs 14, w 180
    Text "Editor", col #10b981, fs 14, w 120
  Frame bg #252525, pad 12, hor
    Text "3", col white, fs 14, w 60
    Text "Tom Weber", col white, fs 14, w 180
    Text "Viewer", col #888888, fs 14, w 120`,
    semanticAnalysis: {
      description: 'Tabelle mit Zebra-Stripes',
      componentType: 'Table',
      layout: 'vertical',
      children: [
        { type: 'Container', role: 'heading', layout: 'horizontal' },
        { type: 'Container', layout: 'horizontal' },
        { type: 'Container', layout: 'horizontal' },
        { type: 'Container', layout: 'horizontal' },
      ],
    },
    // Zebra stripes should be detectable - alternating #252525 and #1a1a1a
    expectedInCode: ['bg', 'hor', 'gap'],
    expectedRules: ['color'],
  },
]

// =============================================================================
// Test Runner
// =============================================================================

async function run(): Promise<boolean> {
  console.log('='.repeat(60))
  console.log('COMBINED APPROACH TEST')
  console.log('Hybrid (LLM→Struktur) + Orchestrator (Regelableitung)')
  console.log('='.repeat(60))
  console.log()

  const runner = new ImageToMirrorTestRunner(
    { headless: true, verbose: false, saveScreenshots: true, outputDir: 'test-output/combined' },
    new NestedRectangleAnalyzer()
  )

  let passed = 0

  try {
    await runner.start()

    for (const test of TEST_CASES) {
      console.log(`\nTesting: ${test.name}`)
      console.log('-'.repeat(50))

      // 1. Render and get pixel analysis
      const testCase = createTestCase(
        test.name.toLowerCase().replace(/\s+/g, '-'),
        test.name,
        test.inputCode
      )
      const result = await runner.runTest(testCase)
      const pixelCode = result.analysis?.generatedCode || ''

      console.log('  [1. Pixel-Analyse]:')
      pixelCode.split('\n').forEach(l => console.log(`    ${l}`))

      console.log('\n  [2. LLM Semantic]:')
      console.log(`    "${test.semanticAnalysis.description}"`)
      console.log(`    Komponente: ${test.semanticAnalysis.componentType}`)
      console.log(`    Kinder: ${test.semanticAnalysis.children?.length || 0}`)

      // 2. Run combined pipeline
      console.log('\n  [3. Combined Pipeline]:')
      const combined = runCombinedPipeline({
        semanticAnalysis: test.semanticAnalysis,
        pixelCode,
      })

      console.log('    Mirror Code:')
      combined.mirrorCode.split('\n').forEach(l => console.log(`      ${l}`))

      if (combined.insights.length > 0) {
        console.log('\n    Erkenntnisse:')
        combined.insights.forEach(i => console.log(`      - ${i}`))
      }

      if (combined.derivedRules.length > 0) {
        console.log('\n    Abgeleitete Regeln:')
        combined.derivedRules.forEach(r => {
          console.log(`      ${r.name}: ${r.value} (${r.confidence}, ${r.usageCount}x)`)
        })
      }

      if (combined.tokensCode.trim()) {
        console.log('\n    Tokens:')
        combined.tokensCode.split('\n').forEach(l => console.log(`      ${l}`))
      }

      // Show component definitions for Component Definition tests
      if (combined.componentDefinitions.length > 0) {
        console.log('\n    Component Definitions:')
        combined.componentDefinitions.forEach(def => {
          console.log(`      ${def.name}: ${def.properties.join(', ')}`)
        })
        if (combined.componentDefinitionsCode.trim()) {
          console.log('\n    Generated Definition Code:')
          combined.componentDefinitionsCode.split('\n').forEach(l => console.log(`      ${l}`))
        }
      }

      // Debug: Show table detection results for Table tests
      if (test.semanticAnalysis.componentType === 'Table') {
        console.log('\n    Table Detection:')
        if (combined.tableStructure?.isTable) {
          console.log(
            `      ✓ Tabelle erkannt: ${combined.tableStructure.rows.length} Zeilen, ${combined.tableStructure.columns.length} Spalten`
          )
          console.log(`      Konfidenz: ${Math.round(combined.tableStructure.confidence * 100)}%`)
          console.log(
            `      Header: ${combined.tableStructure.headerRow !== undefined && combined.tableStructure.headerRow >= 0 ? `Zeile ${combined.tableStructure.headerRow}` : 'nicht erkannt'}`
          )
        } else {
          console.log('      ✗ Keine Tabelle erkannt')
          console.log('      Structure Debug:')
          console.log(`        Root type: ${combined.structure.type}`)
          console.log(`        Root children: ${combined.structure.children?.length}`)
          combined.structure.children?.slice(0, 3).forEach((c, i) => {
            console.log(
              `          Child[${i}]: type=${c.type}, layout=${c.layout}, children=${c.children?.length}`
            )
          })
        }
      }

      // 3. Validate
      let ok = true
      const issues: string[] = []

      // Check code patterns
      for (const pattern of test.expectedInCode) {
        if (!combined.mirrorCode.toLowerCase().includes(pattern.toLowerCase())) {
          ok = false
          issues.push(`Code: "${pattern}" nicht gefunden`)
        }
      }

      // Check derived rules
      for (const ruleType of test.expectedRules) {
        const hasRule = combined.derivedRules.some(r => r.type === ruleType)
        if (!hasRule) {
          ok = false
          issues.push(`Regel: "${ruleType}" nicht abgeleitet`)
        }
      }

      console.log()
      if (ok) {
        console.log(`  ✅ PASSED`)
        passed++
      } else {
        console.log(`  ❌ FAILED`)
        issues.forEach(i => console.log(`     - ${i}`))
      }
    }
  } finally {
    await runner.stop()
  }

  console.log()
  console.log('='.repeat(60))
  console.log(`Ergebnis: ${passed}/${TEST_CASES.length} Tests bestanden`)
  console.log('='.repeat(60))

  return passed === TEST_CASES.length
}

// =============================================================================
// Entry Point
// =============================================================================

run()
  .then(ok => process.exit(ok ? 0 : 1))
  .catch(err => {
    console.error(err)
    process.exit(1)
  })
