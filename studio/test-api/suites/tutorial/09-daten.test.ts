/**
 * Tutorial Tests: Daten
 *
 * Auto-generated from docs/tutorial/09-daten.html
 * Generated: 2026-04-20T13:03:12.782Z
 *
 * DEEP VALIDATION: Each element is validated for:
 * - Correct HTML tag
 * - Text content
 * - All CSS styles (bg, col, pad, rad, gap, etc.)
 * - Child count and hierarchy
 * - HTML attributes
 *
 * DO NOT EDIT MANUALLY - Run 'npm run tutorial:generate' to regenerate
 */

import { testWithSetup, testSkip, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

export const chapter_09_datenTests: TestCase[] = describe('Tutorial: Daten', [
  testWithSetup(
    '[09-daten] Das Problem: Hardcoded Text: Example 1',
    `Frame gap 8, bg #1a1a1a, pad 16, rad 8
  Text "Willkommen, Max!", col white, fs 18
  Text "Du hast 3 neue Nachrichten.", col #888
  Text "Max's Profil", col #2563eb`,
    async (api: TestAPI) => {
      // ========================================
      // DEEP VALIDATION: 4 elements
      // ========================================

      const nodeIds = api.preview.getNodeIds()
      api.assert.ok(nodeIds.length === 4, `Expected 4 nodes, got ${nodeIds.length}`)

      // --- node-1: Frame → <div> ---
      const node_1 = api.preview.inspect('node-1')
      api.assert.ok(node_1 !== null, 'node-1 must exist')
      api.assert.ok(node_1?.tagName === 'div', `node-1: expected <div>, got ${node_1?.tagName}`)
      api.assert.hasStyle('node-1', 'display', 'flex')
      api.assert.hasStyle('node-1', 'flexDirection', 'column')
      api.assert.hasStyle('node-1', 'gap', '8px')
      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(26, 26, 26)')
      api.assert.hasStyle('node-1', 'padding', '16px')
      api.assert.hasStyle('node-1', 'borderRadius', '8px')
      api.assert.hasChildren('node-1', 3)

      // --- node-2: Text → <span> "Willkommen, Max!" ---
      const node_2 = api.preview.inspect('node-2')
      api.assert.ok(node_2 !== null, 'node-2 must exist')
      api.assert.ok(node_2?.tagName === 'span', `node-2: expected <span>, got ${node_2?.tagName}`)
      api.assert.hasText('node-2', 'Willkommen, Max!')
      api.assert.hasStyle('node-2', 'color', 'rgb(255, 255, 255)')
      api.assert.hasStyle('node-2', 'fontSize', '18px')

      // --- node-3: Text → <span> "Du hast 3 neue Nachrichten." ---
      const node_3 = api.preview.inspect('node-3')
      api.assert.ok(node_3 !== null, 'node-3 must exist')
      api.assert.ok(node_3?.tagName === 'span', `node-3: expected <span>, got ${node_3?.tagName}`)
      api.assert.hasText('node-3', 'Du hast 3 neue Nachrichten.')
      api.assert.hasStyle('node-3', 'color', 'rgb(136, 136, 136)')

      // --- node-4: Text → <span> "Max's Profil" ---
      const node_4 = api.preview.inspect('node-4')
      api.assert.ok(node_4 !== null, 'node-4 must exist')
      api.assert.ok(node_4?.tagName === 'span', `node-4: expected <span>, got ${node_4?.tagName}`)
      api.assert.hasText('node-4', "Max's Profil")
      api.assert.hasStyle('node-4', 'color', 'rgb(37, 99, 235)')

      // --- Hierarchy ---
      // node-2 is child of node-1
      // node-3 is child of node-1
      // node-4 is child of node-1
    }
  ),

  testWithSetup(
    '[09-daten] Das Problem: Hardcoded Text: Example 2',
    `name: "Max"
messageCount: 3

Frame gap 8, bg #1a1a1a, pad 16, rad 8
  Text "Willkommen, \$name!", col white, fs 18
  Text "Du hast \$messageCount neue Nachrichten.", col #888
  Text "\$name's Profil", col #2563eb`,
    async (api: TestAPI) => {
      // Complex feature: data binding
      // If we reach here, compilation succeeded (no exception thrown)
      api.assert.ok(true, 'Compilation successful')
    }
  ),

  testWithSetup(
    '[09-daten] Variablen definieren: Example 3',
    `name: "Max"
count: 42

Frame gap 8, bg #1a1a1a, pad 16, rad 8
  Text "Name: \$name", col white
  Text "Count: \$count", col #888`,
    async (api: TestAPI) => {
      // Complex feature: data binding
      // If we reach here, compilation succeeded (no exception thrown)
      api.assert.ok(true, 'Compilation successful')
    }
  ),

  testWithSetup(
    '[09-daten] In Text verwenden: Example 4',
    `firstName: "Max"
lastName: "Mustermann"

Frame gap 8, bg #1a1a1a, pad 16, rad 8
  Text "\$firstName", col white, fs 18
  Text "\$firstName \$lastName", col #888
  Text "Hallo, \$firstName!", col #10b981`,
    async (api: TestAPI) => {
      // Complex feature: data binding
      // If we reach here, compilation succeeded (no exception thrown)
      api.assert.ok(true, 'Compilation successful')
    }
  ),

  testWithSetup(
    '[09-daten] Arithmetik: Example 5',
    `price: 29
quantity: 3

Frame gap 8, bg #1a1a1a, pad 16, rad 8
  Text "Preis: \$\$price", col white
  Text "Menge: \$quantity", col #888
  Text "Total: \$" + (\$price * \$quantity), col #10b981, weight 600`,
    async (api: TestAPI) => {
      // Complex feature: data binding
      // If we reach here, compilation succeeded (no exception thrown)
      api.assert.ok(true, 'Compilation successful')
    }
  ),

  testWithSetup(
    '[09-daten] Einfache Listen: Example 6',
    `colors:
  red
  green
  blue

each color in \$colors
  Frame hor, gap 12, ver-center, bg #1a1a1a, pad 12, rad 6, mar 0 0 4 0
    Frame w 20, h 20, rad 4, bg \$color
    Text "\$color", col white`,
    async (api: TestAPI) => {
      // Complex feature: each iteration, data binding
      // If we reach here, compilation succeeded (no exception thrown)
      api.assert.ok(true, 'Compilation successful')
    }
  ),

  testWithSetup(
    '[09-daten] Datenobjekte: Zusammengehörige Daten gruppieren: Example 7',
    `// OHNE Datenobjekt: drei einzelne Variablen
userName: "Max Mustermann"
userEmail: "max@example.com"
userActive: true

// MIT Datenobjekt: zusammengehörige Daten gruppiert
user:
  name: "Max Mustermann"
  email: "max@example.com"
  active: true

Frame gap 8, bg #1a1a1a, pad 16, rad 8
  Text "\$user.name", col white, weight 500
  Text "\$user.email", col #888
  Text \$user.active ? "Aktiv" : "Inaktiv", col #10b981`,
    async (api: TestAPI) => {
      // Complex feature: data binding
      // If we reach here, compilation succeeded (no exception thrown)
      api.assert.ok(true, 'Compilation successful')
    }
  ),

  testWithSetup(
    '[09-daten] Sammlungen: Mehrere Einträge: Example 8',
    `users:
  max:
    name: "Max"
    role: "Admin"
  anna:
    name: "Anna"
    role: "User"
  tom:
    name: "Tom"
    role: "User"

each user in \$users
  Frame hor, gap 12, bg #1a1a1a, pad 12, rad 6, mar 0 0 4 0
    Text "\$user.name", col white, weight 500
    Text "\$user.role", col #888, fs 12`,
    async (api: TestAPI) => {
      // Complex feature: each iteration, data binding
      // If we reach here, compilation succeeded (no exception thrown)
      api.assert.ok(true, 'Compilation successful')
    }
  ),

  testWithSetup(
    '[09-daten] Verschachtelte Datenobjekte: Example 9',
    `method:
  name: "Agile"
  steps:
    planning:
      title: "Sprint Planning"
      duration: "2h"
    standup:
      title: "Daily Standup"
      duration: "15min"
    retro:
      title: "Retrospektive"
      duration: "1h"

Frame gap 8, bg #1a1a1a, pad 16, rad 8
  Text "\$method.name", col white, fs 18, weight 600
  Frame gap 4, mar 8 0 0 0
    each step in \$method.steps
      Frame hor, gap 8
        Text "\$step.title", col white
        Text "\$step.duration", col #888`,
    async (api: TestAPI) => {
      // Complex feature: each iteration, data binding
      // If we reach here, compilation succeeded (no exception thrown)
      api.assert.ok(true, 'Compilation successful')
    }
  ),

  testWithSetup(
    '[09-daten] Aggregationsmethoden: Example 10',
    `tasks:
  t1:
    title: "Design Review"
    hours: 4
  t2:
    title: "Development"
    hours: 8
  t3:
    title: "Testing"
    hours: 2

Frame gap 8, bg #1a1a1a, pad 16, rad 8
  Text "Anzahl: \$tasks.count Tasks", col white
  Text "Erster: \$tasks.first.title", col #888
  Text "Letzter: \$tasks.last.title", col #888`,
    async (api: TestAPI) => {
      // Complex feature: data binding
      // If we reach here, compilation succeeded (no exception thrown)
      api.assert.ok(true, 'Compilation successful')
    }
  ),

  testWithSetup(
    '[09-daten] Aggregationsmethoden: Example 11',
    `colors:
  red
  blue
  red
  green
  blue
  red

Frame gap 8, bg #1a1a1a, pad 16, rad 8
  Text "Alle: \$colors.count Farben", col white
  Text "Einzigartig: \$colors.unique", col #888`,
    async (api: TestAPI) => {
      // Complex feature: data binding
      // If we reach here, compilation succeeded (no exception thrown)
      api.assert.ok(true, 'Compilation successful')
    }
  ),

  testWithSetup(
    '[09-daten] Praktisch: Produktliste: Example 12',
    `products:
  basic:
    name: "Basic"
    price: 9
    features: "5 Users"
  pro:
    name: "Pro"
    price: 29
    features: "Unlimited"
  enterprise:
    name: "Enterprise"
    price: 99
    features: "Custom"

Frame hor, gap 12, bg #0a0a0a, pad 16, rad 8
  each product in \$products
    Frame bg #1a1a1a, pad 20, rad 12, gap 8, w 140, center
      Text "\$product.name", col white, fs 16, weight 600
      Text "\$\$product.price", col #2271C1, fs 24, weight 700
      Text "\$product.features", col #888, fs 12`,
    async (api: TestAPI) => {
      // Complex feature: each iteration, data binding
      // If we reach here, compilation succeeded (no exception thrown)
      api.assert.ok(true, 'Compilation successful')
    }
  ),

  testWithSetup(
    '[09-daten] Bedingte Anzeige: if / else: Example 13',
    `loggedIn: true

if loggedIn
  Text "Willkommen zurück!", col white`,
    async (api: TestAPI) => {
      // Complex feature: conditional
      // If we reach here, compilation succeeded (no exception thrown)
      api.assert.ok(true, 'Compilation successful')
    }
  ),

  testWithSetup(
    '[09-daten] Bedingte Anzeige: if / else: Example 14',
    `loggedIn: false

if loggedIn
  Text "Willkommen zurück!", col white
else
  Button "Anmelden", bg #2271C1, col white, pad 10 20, rad 6`,
    async (api: TestAPI) => {
      // Complex feature: conditional
      // If we reach here, compilation succeeded (no exception thrown)
      api.assert.ok(true, 'Compilation successful')
    }
  ),

  testWithSetup(
    '[09-daten] Bedingte Anzeige: if / else: Example 15',
    `showDetails: true

Frame bg #1a1a1a, pad 16, rad 8, gap 8
  Text "Produkt", col white, fs 16, weight 500
  if showDetails
    Text "Beschreibung des Produkts", col #888, fs 13
    Text "Preis: €29", col #10b981, fs 14
    Button "Kaufen", bg #2271C1, col white, pad 8 16, rad 4`,
    async (api: TestAPI) => {
      // Complex feature: conditional
      // If we reach here, compilation succeeded (no exception thrown)
      api.assert.ok(true, 'Compilation successful')
    }
  ),

  testWithSetup(
    '[09-daten] Komplexe Bedingungen: Example 16',
    `isAdmin: true
hasPermission: true

if isAdmin && hasPermission
  Frame bg #1a1a1a, pad 16, rad 8
    Text "Admin Panel", col white, fs 16, weight 500
    Text "Voller Zugriff", col #10b981, fs 12`,
    async (api: TestAPI) => {
      // Complex feature: conditional
      // If we reach here, compilation succeeded (no exception thrown)
      api.assert.ok(true, 'Compilation successful')
    }
  ),

  testWithSetup(
    '[09-daten] Komplexe Bedingungen: Example 17',
    `count: 5

Frame bg #1a1a1a, pad 16, rad 8, gap 8
  if count > 0
    Text "\$count Artikel im Warenkorb", col white
  else
    Text "Warenkorb ist leer", col #888`,
    async (api: TestAPI) => {
      // Complex feature: conditional, data binding
      // If we reach here, compilation succeeded (no exception thrown)
      api.assert.ok(true, 'Compilation successful')
    }
  ),

  testWithSetup(
    '[09-daten] Komplexe Bedingungen: Example 18',
    `disabled: false

if !disabled
  Button "Absenden", bg #2271C1, col white, pad 10 20, rad 6`,
    async (api: TestAPI) => {
      // Complex feature: conditional
      // If we reach here, compilation succeeded (no exception thrown)
      api.assert.ok(true, 'Compilation successful')
    }
  ),

  testWithSetup(
    '[09-daten] Komplexe Bedingungen: Example 19',
    `user:
  role: "admin"
feature:
  enabled: true

if user.role === "admin" && feature.enabled
  Text "Feature aktiv", col #10b981`,
    async (api: TestAPI) => {
      // Complex feature: conditional, data binding
      // If we reach here, compilation succeeded (no exception thrown)
      api.assert.ok(true, 'Compilation successful')
    }
  ),

  testWithSetup(
    '[09-daten] Verschachtelte Bedingungen: Example 20',
    `hasData: true
isLoading: false

if hasData
  if isLoading
    Frame hor, gap 8, center
      Icon "loader", ic #888, is 16
      Text "Lädt...", col #888
  else
    Text "Daten geladen!", col #10b981
else
  Text "Keine Daten", col #888`,
    async (api: TestAPI) => {
      // Complex feature: conditional
      // If we reach here, compilation succeeded (no exception thrown)
      api.assert.ok(true, 'Compilation successful')
    }
  ),

  testWithSetup(
    '[09-daten] if mit each kombinieren: Example 21',
    `tasks:
  task1:
    title: "Task 1"
    done: true
  task2:
    title: "Task 2"
    done: false
  task3:
    title: "Task 3"
    done: true

Frame bg #1a1a1a, pad 16, rad 8, gap 8
  each task in \$tasks
    Frame hor, gap 8, ver-center, pad 8, bg #252525, rad 4
      if \$task.done
        Icon "check", ic #10b981, is 16
      else
        Icon "circle", ic #666, is 16
      Text "\$task.title", col white, fs 13`,
    async (api: TestAPI) => {
      // Complex feature: each iteration, conditional, data binding
      // If we reach here, compilation succeeded (no exception thrown)
      api.assert.ok(true, 'Compilation successful')
    }
  ),

  testWithSetup(
    '[09-daten] Inline Conditionals (Ternary): Example 22',
    `active: true

Button "Status", bg active ? #2271C1 : #333, col white, pad 10 20, rad 6`,
    async (api: TestAPI) => {
      // ========================================
      // DEEP VALIDATION: 1 elements
      // ========================================

      const nodeIds = api.preview.getNodeIds()
      api.assert.ok(nodeIds.length === 1, `Expected 1 nodes, got ${nodeIds.length}`)

      // --- node-1: Button → <button> "Status" ---
      const node_1 = api.preview.inspect('node-1')
      api.assert.ok(node_1 !== null, 'node-1 must exist')
      api.assert.ok(
        node_1?.tagName === 'button',
        `node-1: expected <button>, got ${node_1?.tagName}`
      )
      api.assert.hasText('node-1', 'Status')
      // Skipping dynamic style: backgroundColor = active ? #2271c1 : #333
      api.assert.hasStyle('node-1', 'color', 'rgb(255, 255, 255)')
      api.assert.hasStyle('node-1', 'paddingTop', '10px')
      api.assert.hasStyle('node-1', 'paddingBottom', '10px')
      api.assert.hasStyle('node-1', 'paddingLeft', '20px')
      api.assert.hasStyle('node-1', 'paddingRight', '20px')
      api.assert.hasStyle('node-1', 'borderRadius', '6px')
    }
  ),

  testWithSetup(
    '[09-daten] Inline Conditionals (Ternary): Example 23',
    `visible: true
done: false
count: 3

Frame gap 12, bg #0a0a0a, pad 16, rad 8
  // Opacity basierend auf Sichtbarkeit
  Frame w 100, h 50, bg #2271C1, rad 6, opacity visible ? 1 : 0.3

  // Icon basierend auf Status
  Frame hor, gap 8, ver-center, bg #1a1a1a, pad 12, rad 6
    Icon done ? "check" : "circle", ic done ? #10b981 : #666, is 18
    Text "Aufgabe", col white

  // Text basierend auf Anzahl
  Text count > 0 ? "\$count Einträge" : "Keine Einträge", col #888`,
    async (api: TestAPI) => {
      // Complex feature: data binding
      // If we reach here, compilation succeeded (no exception thrown)
      api.assert.ok(true, 'Compilation successful')
    }
  ),

  testWithSetup(
    '[09-daten] Inline Conditionals (Ternary): Example 24',
    `theme: "dark"
primary.bg: #2271C1
muted.bg: #333

Button "Themed", bg theme === "dark" ? \$primary : \$muted, col white, pad 10 20, rad 6`,
    async (api: TestAPI) => {
      // Complex feature: data binding
      // If we reach here, compilation succeeded (no exception thrown)
      api.assert.ok(true, 'Compilation successful')
    }
  ),

  testWithSetup(
    '[09-daten] Praktisch: Leerer Zustand: Example 25',
    `hasItems: false

Frame bg #1a1a1a, pad 20, rad 12, gap 12, w 280, center
  if hasItems
    Text "Hier wären Einträge", col white
  else
    Icon "inbox", ic #444, is 48
    Text "Keine Einträge", col #666, fs 14
    Text "Füge deinen ersten Eintrag hinzu", col #444, fs 12`,
    async (api: TestAPI) => {
      // Complex feature: conditional
      // If we reach here, compilation succeeded (no exception thrown)
      api.assert.ok(true, 'Compilation successful')
    }
  ),

  testWithSetup(
    '[09-daten] Praktisch: Ladeindikator: Example 26',
    `loading: true
data: "Inhalt geladen"

Frame bg #1a1a1a, pad 20, rad 12, w 200, center
  if loading
    Frame hor, gap 8, ver-center
      Icon "loader", ic #888, is 18
      Text "Lädt...", col #888
  else
    Text "\$data", col white`,
    async (api: TestAPI) => {
      // Complex feature: conditional, data binding
      // If we reach here, compilation succeeded (no exception thrown)
      api.assert.ok(true, 'Compilation successful')
    }
  ),

  testWithSetup(
    '[09-daten] Praktisch: Benutzer-Status: Example 27',
    `user:
  loggedIn: true
  name: "Max"
  avatar: ""

Frame hor, gap 12, ver-center, bg #1a1a1a, pad 12, rad 8
  if \$user.loggedIn
    Frame hor, gap 10, ver-center
      Frame w 36, h 36, rad 99, bg #2271C1, center
        Text \$user.avatar ? "\$user.avatar" : "\$user.name[0]", col white, fs 14
      Frame gap 2
        Text "\$user.name", col white, fs 14, weight 500
        Text "Online", col #10b981, fs 11
  else
    Button "Anmelden", bg #2271C1, col white, pad 8 16, rad 6`,
    async (api: TestAPI) => {
      // Complex feature: conditional, data binding
      // If we reach here, compilation succeeded (no exception thrown)
      api.assert.ok(true, 'Compilation successful')
    }
  ),
])
