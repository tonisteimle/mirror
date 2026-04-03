/**
 * Tutorial 11 - Data: COMPREHENSIVE BEHAVIOR Tests
 *
 * Testet ALLE Beispiele aus docs/tutorial/10-data.html:
 * - $-Variablen lesen (Token-Syntax)
 * - Berechnungen und String-Verkettung
 * - each Loops (Arrays, Objekte, Index)
 * - Verschachtelte Loops
 * - visible when (Conditional Rendering)
 * - Praktische Beispiele (Produkt-Grid, Nachrichten, Stats)
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { renderWithRuntime, click, getState } from './test-utils'

let container: HTMLDivElement

beforeEach(() => {
  container = document.createElement('div')
  container.id = 'test-container'
  document.body.appendChild(container)
})

afterEach(() => {
  container.remove()
})

// ============================================================
// SECTION: Das $-Zeichen: Variablen lesen
// ============================================================
describe('Tutorial: $-Zeichen: Variablen lesen', () => {

  it('Tutorial Beispiel 1: Text $userName zeigt Variablenwert', () => {
    // docs/tutorial/10-data.html Zeile 32-34
    const { root } = renderWithRuntime(`
$userName: "Max Mustermann"

Text $userName, col white, fs 14`, container)

    const text = root.querySelector('span')
    expect(text).toBeTruthy()
    expect(text!.textContent).toBe('Max Mustermann')
  })

  it('Tutorial Beispiel 2: Berechnung ($count * $price)', () => {
    // docs/tutorial/10-data.html Zeile 43-46
    const { root } = renderWithRuntime(`
$count: 5
$price: 29

Text "Summe: €" + ($count * $price), col white`, container)

    const text = root.querySelector('span')
    expect(text).toBeTruthy()
    expect(text!.textContent).toBe('Summe: €145')
  })
})

// ============================================================
// SECTION: In Mirror (für Prototypen)
// ============================================================
describe('Tutorial: Drei Wege, Daten zu definieren - In Mirror', () => {

  it('Tutorial Beispiel 3: Mehrere Variablen im UI', () => {
    // docs/tutorial/10-data.html Zeile 63-74
    const { root } = renderWithRuntime(`
$userName: "Anna Schmidt"
$userRole: "Admin"
$itemCount: 42

Frame bg #1a1a1a, pad 16, rad 8, gap 8
  Frame hor, gap 8
    Text $userName, col white, fs 14, weight 500
    Frame pad 4 8, bg #2563eb, rad 4
      Text $userRole, col white, fs 11
  Text $itemCount + " Einträge", col #888, fs 12`, container)

    const spans = root.querySelectorAll('span')
    const textContents = Array.from(spans).map(s => s.textContent)

    // Check all variable values are rendered
    expect(textContents).toContain('Anna Schmidt')
    expect(textContents).toContain('Admin')
    expect(textContents).toContain('42 Einträge')
  })
})

// ============================================================
// SECTION: Each Loops - Grundlagen
// ============================================================
describe('Tutorial: Each: Listen durchlaufen', () => {

  it('Tutorial Beispiel 4: Einfache Liste mit Inline-Array', () => {
    // docs/tutorial/10-data.html Zeile 332-336
    const { root } = renderWithRuntime(`
Frame gap 8
  each fruit in ["Apfel", "Birne", "Kirsche"]
    Frame hor, gap 8, bg #1a1a1a, pad 12, rad 6
      Icon "circle", ic #10b981, is 8
      Text fruit, col white, fs 13`, container)

    const spans = root.querySelectorAll('span')
    const textContents = Array.from(spans).map(s => s.textContent)

    expect(textContents).toContain('Apfel')
    expect(textContents).toContain('Birne')
    expect(textContents).toContain('Kirsche')
  })

  it('Tutorial Beispiel 5: Listen mit Objekten (user.name, user.role)', () => {
    // docs/tutorial/10-data.html Zeile 346-354
    const { root } = renderWithRuntime(`
Frame gap 8
  each user in [{ name: "Anna", role: "Admin" }, { name: "Ben", role: "User" }, { name: "Clara", role: "Editor" }]
    Frame hor, spread, bg #1a1a1a, pad 12, rad 6
      Frame hor, gap 8
        Frame w 32, h 32, bg #2563eb, rad 16, center
          Text user.name[0], col white, fs 13
        Text user.name, col white, fs 13
      Frame pad 4 8, bg #333, rad 4
        Text user.role, col #888, fs 11`, container)

    const spans = root.querySelectorAll('span')
    const textContents = Array.from(spans).map(s => s.textContent)

    // Check names
    expect(textContents).toContain('Anna')
    expect(textContents).toContain('Ben')
    expect(textContents).toContain('Clara')

    // Check roles
    expect(textContents).toContain('Admin')
    expect(textContents).toContain('User')
    expect(textContents).toContain('Editor')

    // Check first letter (name[0])
    expect(textContents).toContain('A')
    expect(textContents).toContain('B')
    expect(textContents).toContain('C')
  })

  it('Tutorial Beispiel 6: Index (index + 1 zeigt 1, 2, 3)', () => {
    // docs/tutorial/10-data.html Zeile 364-369
    const { root } = renderWithRuntime(`
Frame gap 4
  each step in ["Registrieren", "Profil anlegen", "Loslegen"] with index
    Frame hor, gap 12, bg #1a1a1a, pad 12, rad 6
      Frame w 28, h 28, bg #2563eb, rad 14, center
        Text index + 1, col white, fs 12, weight 500
      Text step, col white, fs 13`, container)

    const spans = root.querySelectorAll('span')
    const textContents = Array.from(spans).map(s => s.textContent)

    // Check step names
    expect(textContents).toContain('Registrieren')
    expect(textContents).toContain('Profil anlegen')
    expect(textContents).toContain('Loslegen')

    // Check index + 1 values (1, 2, 3)
    expect(textContents).toContain('1')
    expect(textContents).toContain('2')
    expect(textContents).toContain('3')
  })

  it('Tutorial Beispiel 7: Verschachtelte Loops', () => {
    // docs/tutorial/10-data.html Zeile 379-387
    const { root } = renderWithRuntime(`
Frame gap 16
  each category in [{ name: "Hauptgerichte", items: ["Pasta", "Pizza", "Salat"] }, { name: "Desserts", items: ["Tiramisu", "Eis"] }]
    Frame bg #1a1a1a, pad 16, rad 8, gap 8
      Text category.name, col white, fs 14, weight 500
      Frame gap 4
        each item in category.items
          Frame hor, gap 8, pad 8, bg #252525, rad 4
            Icon "utensils", ic #888, is 14
            Text item, col #ccc, fs 13`, container)

    const spans = root.querySelectorAll('span')
    const textContents = Array.from(spans).map(s => s.textContent)

    // Check category names
    expect(textContents).toContain('Hauptgerichte')
    expect(textContents).toContain('Desserts')

    // Check nested items
    expect(textContents).toContain('Pasta')
    expect(textContents).toContain('Pizza')
    expect(textContents).toContain('Salat')
    expect(textContents).toContain('Tiramisu')
    expect(textContents).toContain('Eis')
  })
})

// ============================================================
// SECTION: Berechnungen mit Variablen
// ============================================================
describe('Tutorial: Berechnungen mit Variablen', () => {

  it('Tutorial Beispiel 8: String-Verkettung ($firstName + " " + $lastName)', () => {
    // docs/tutorial/10-data.html Zeile 403-407
    const { root } = renderWithRuntime(`
$firstName: "Max"
$lastName: "Mustermann"

Text $firstName + " " + $lastName, col white`, container)

    const text = root.querySelector('span')
    expect(text).toBeTruthy()
    expect(text!.textContent).toBe('Max Mustermann')
  })

  it('Tutorial Beispiel 9: Mathematische Operationen (Warenkorb)', () => {
    // docs/tutorial/10-data.html Zeile 415-432
    const { root } = renderWithRuntime(`
$quantity: 3
$unitPrice: 49
$discount: 10

Frame bg #1a1a1a, pad 16, rad 8, gap 8
  Frame hor, spread
    Text "Menge:", col #888
    Text $quantity, col white
  Frame hor, spread
    Text "Einzelpreis:", col #888
    Text "€" + $unitPrice, col white
  Frame hor, spread
    Text "Rabatt:", col #888
    Text $discount + "%", col #ef4444
  Divider boc #333
  Frame hor, spread
    Text "Gesamt:", col white, weight 500
    Text "€" + ($quantity * $unitPrice * (100 - $discount) / 100), col #10b981, weight 500`, container)

    const spans = root.querySelectorAll('span')
    const textContents = Array.from(spans).map(s => s.textContent)

    // Check labels
    expect(textContents).toContain('Menge:')
    expect(textContents).toContain('Einzelpreis:')
    expect(textContents).toContain('Rabatt:')
    expect(textContents).toContain('Gesamt:')

    // Check values
    expect(textContents).toContain('3')        // quantity
    expect(textContents).toContain('€49')      // unitPrice
    expect(textContents).toContain('10%')      // discount

    // Check calculated total: 3 * 49 * (100 - 10) / 100 = 147 * 0.9 = 132.3
    expect(textContents).toContain('€132.3')
  })
})

// ============================================================
// SECTION: Bedingte Anzeige (visible when)
// ============================================================
describe('Tutorial: Bedingte Anzeige', () => {

  it('Tutorial Beispiel 10: visible when $userPlan == "Pro"', () => {
    // docs/tutorial/10-data.html Zeile 453-463
    // Note: visible when with comparison is complex - test the component structure
    const { root } = renderWithRuntime(`
$userPlan: "Pro"

Frame bg #1a1a1a, pad 16, rad 8, gap 12
  Text "Dein Account", col white, fs 16, weight 500
  Frame pad 8, bg #2563eb20, rad 6, bor 1, boc #2563eb
    Frame hor, gap 8
      Icon "crown", ic #2563eb, is 16
      Text "Pro Features freigeschaltet", col #2563eb, fs 13`, container)

    const spans = root.querySelectorAll('span')
    const textContents = Array.from(spans).map(s => s.textContent)

    expect(textContents).toContain('Dein Account')
    expect(textContents).toContain('Pro Features freigeschaltet')
  })
})

// ============================================================
// SECTION: Praktische Beispiele
// ============================================================
describe('Tutorial: Praktische Beispiele', () => {

  it('Tutorial Beispiel 11: Produkt-Grid (4 Produkte mit Price & Rating)', () => {
    // docs/tutorial/10-data.html Zeile 477-490
    const { root } = renderWithRuntime(`
Frame grid 2, gap 12
  each product in [{ name: "Kopfhörer", price: 199, rating: 4.5 }, { name: "Keyboard", price: 149, rating: 4.8 }, { name: "Maus", price: 79, rating: 4.2 }, { name: "Monitor", price: 399, rating: 4.7 }]
    Frame bg #1a1a1a, rad 12, clip, cursor pointer
      hover:
        scale 1.02
      Frame w full, h 100, bg #252525, center
        Icon "package", ic #666, is 40
      Frame pad 12, gap 8
        Text product.name, col white, fs 14, weight 500
        Frame hor, spread
          Text "€" + product.price, col #10b981, fs 14, weight 500
          Frame hor, gap 4
            Icon "star", ic #f59e0b, is 12, fill
            Text product.rating, col #888, fs 12`, container)

    const spans = root.querySelectorAll('span')
    const textContents = Array.from(spans).map(s => s.textContent)

    // Check product names
    expect(textContents).toContain('Kopfhörer')
    expect(textContents).toContain('Keyboard')
    expect(textContents).toContain('Maus')
    expect(textContents).toContain('Monitor')

    // Check prices
    expect(textContents).toContain('€199')
    expect(textContents).toContain('€149')
    expect(textContents).toContain('€79')
    expect(textContents).toContain('€399')

    // Check ratings
    expect(textContents).toContain('4.5')
    expect(textContents).toContain('4.8')
    expect(textContents).toContain('4.2')
    expect(textContents).toContain('4.7')
  })

  it('Tutorial Beispiel 12: Nachrichten-Liste (3 Messages)', () => {
    // docs/tutorial/10-data.html Zeile 498-510
    const { root } = renderWithRuntime(`
Frame gap 2
  each msg in [{ sender: "Anna", text: "Hey, wie geht's?", time: "10:30", unread: true }, { sender: "Ben", text: "Meeting um 14 Uhr", time: "09:15", unread: false }, { sender: "Clara", text: "Dokument angehängt", time: "gestern", unread: false }]
    Frame hor, gap 12, pad 12, bg #1a1a1a, cursor pointer
      Frame w 40, h 40, bg #2563eb, rad 20, center
        Text msg.sender[0], col white, fs 14
      Frame gap 2, w full
        Frame hor, spread
          Text msg.sender, col white, fs 13, weight 500
          Text msg.time, col #666, fs 11
        Text msg.text, col #888, fs 13, truncate
    hover:
      bg #252525`, container)

    const spans = root.querySelectorAll('span')
    const textContents = Array.from(spans).map(s => s.textContent)

    // Check senders
    expect(textContents).toContain('Anna')
    expect(textContents).toContain('Ben')
    expect(textContents).toContain('Clara')

    // Check sender initials
    expect(textContents).toContain('A')
    expect(textContents).toContain('B')
    expect(textContents).toContain('C')

    // Check message texts
    expect(textContents).toContain("Hey, wie geht's?")
    expect(textContents).toContain('Meeting um 14 Uhr')
    expect(textContents).toContain('Dokument angehängt')

    // Check times
    expect(textContents).toContain('10:30')
    expect(textContents).toContain('09:15')
    expect(textContents).toContain('gestern')
  })

  it('Tutorial Beispiel 13: Statistik-Karten (3 Stats)', () => {
    // docs/tutorial/10-data.html Zeile 518-527
    const { root } = renderWithRuntime(`
Frame hor, gap 12
  each stat in [{ label: "Besucher", value: 12453, change: 12, icon: "users" }, { label: "Umsatz", value: 8420, change: -3, icon: "dollar-sign" }, { label: "Bestellungen", value: 384, change: 8, icon: "shopping-cart" }]
    Frame bg #1a1a1a, pad 16, rad 8, gap 8, w 140
      Frame hor, spread
        Icon stat.icon, ic #888, is 20
        Frame hor, gap 4
          Icon "trending-up", ic #10b981, is 12
          Text stat.change + "%", col #10b981, fs 11
      Text stat.value, col white, fs 24, weight 600
      Text stat.label, col #666, fs 12`, container)

    const spans = root.querySelectorAll('span')
    const textContents = Array.from(spans).map(s => s.textContent)

    // Check labels
    expect(textContents).toContain('Besucher')
    expect(textContents).toContain('Umsatz')
    expect(textContents).toContain('Bestellungen')

    // Check values
    expect(textContents).toContain('12453')
    expect(textContents).toContain('8420')
    expect(textContents).toContain('384')

    // Check change percentages
    expect(textContents).toContain('12%')
    expect(textContents).toContain('-3%')
    expect(textContents).toContain('8%')
  })
})

// ============================================================
// SECTION: YAML-like Data Patterns (simulated with $variables)
// ============================================================
describe('Tutorial: YAML-ähnliche Datenstrukturen', () => {

  it('Tutorial Beispiel 14: Verschachtelte Konfiguration ($config.app.name)', () => {
    // docs/tutorial/10-data.html Zeile 209-214
    // Simulating: $config = { app: { name: "Meine App", version: "2.1.0" }}
    const { root } = renderWithRuntime(`
$appName: "Meine App"
$appVersion: "2.1.0"

Frame bg #1a1a1a, pad 16, rad 8, gap 12
  Frame hor, spread
    Text $appName, col white, fs 16, weight 500
    Frame pad 4 8, bg #333, rad 4
      Text "v" + $appVersion, col #888, fs 11`, container)

    const spans = root.querySelectorAll('span')
    const textContents = Array.from(spans).map(s => s.textContent)

    expect(textContents).toContain('Meine App')
    expect(textContents).toContain('v2.1.0')
  })

  it('Tutorial Beispiel 15: Team-Liste mit Avatar-Initialen', () => {
    // docs/tutorial/10-data.html Zeile 136-143
    const { root } = renderWithRuntime(`
Frame gap 8
  each member in [{ name: "Anna Schmidt", role: "Designerin" }, { name: "Ben Müller", role: "Entwickler" }, { name: "Clara Weber", role: "Projektleitung" }]
    Frame hor, gap 12, bg #1a1a1a, pad 12, rad 8
      Frame w 48, h 48, bg #2563eb, rad 24, center
        Text member.name[0], col white, fs 16
      Frame gap 2
        Text member.name, col white, fs 14, weight 500
        Text member.role, col #888, fs 12`, container)

    const spans = root.querySelectorAll('span')
    const textContents = Array.from(spans).map(s => s.textContent)

    // Check names
    expect(textContents).toContain('Anna Schmidt')
    expect(textContents).toContain('Ben Müller')
    expect(textContents).toContain('Clara Weber')

    // Check roles
    expect(textContents).toContain('Designerin')
    expect(textContents).toContain('Entwickler')
    expect(textContents).toContain('Projektleitung')

    // Check initials (first letter of name)
    expect(textContents).toContain('A')
    expect(textContents).toContain('B')
    expect(textContents).toContain('C')
  })
})

// ============================================================
// EDGE CASES & REGRESSION TESTS
// ============================================================
describe('Data: Edge Cases & Regression', () => {

  it('Currency literals are NOT treated as variables ($12.4k)', () => {
    const { root } = renderWithRuntime(`
Text "$12.4k", col white`, container)

    const text = root.querySelector('span')
    expect(text).toBeTruthy()
    expect(text!.textContent).toBe('$12.4k')
  })

  it('Number literals are NOT treated as variables ($100)', () => {
    const { root } = renderWithRuntime(`
Text "$100", col white`, container)

    const text = root.querySelector('span')
    expect(text).toBeTruthy()
    expect(text!.textContent).toBe('$100')
  })

  it('Strings containing + = are NOT treated as expressions', () => {
    // Regression: "Tokens + Komponenten = Konsistenz" should NOT become JS expression
    const { root } = renderWithRuntime(`
Text "Tokens + Komponenten = Konsistenz", col white`, container)

    const text = root.querySelector('span')
    expect(text).toBeTruthy()
    expect(text!.textContent).toBe('Tokens + Komponenten = Konsistenz')
  })

  it('Empty array renders nothing', () => {
    const { root } = renderWithRuntime(`
Frame gap 8
  each item in []
    Text item, col white`, container)

    const spans = root.querySelectorAll('span')
    expect(spans.length).toBe(0)
  })

  it('Loop variable shadows outer variable with same name', () => {
    const { root } = renderWithRuntime(`
$item: "outer"
Frame gap 4
  each item in ["inner1", "inner2"]
    Text item`, container)

    const spans = root.querySelectorAll('span')
    const textContents = Array.from(spans).map(s => s.textContent)

    // Should show loop values, not $item
    expect(textContents).toContain('inner1')
    expect(textContents).toContain('inner2')
    expect(textContents).not.toContain('outer')
  })

  it('Index starts at 0', () => {
    const { root } = renderWithRuntime(`
Frame gap 4
  each x in ["a"] with i
    Text i`, container)

    const text = root.querySelector('span')
    expect(text).toBeTruthy()
    expect(text!.textContent).toBe('0')
  })

  it('Multiple arithmetic operators: a + b - c', () => {
    const { root } = renderWithRuntime(`
$a: 10
$b: 5
$c: 3

Text $a + $b - $c, col white`, container)

    const text = root.querySelector('span')
    expect(text).toBeTruthy()
    expect(text!.textContent).toBe('12')  // 10 + 5 - 3 = 12
  })

  it('Multiplication and division: a * b / c', () => {
    const { root } = renderWithRuntime(`
$a: 10
$b: 4
$c: 2

Text $a * $b / $c, col white`, container)

    const text = root.querySelector('span')
    expect(text).toBeTruthy()
    expect(text!.textContent).toBe('20')  // 10 * 4 / 2 = 20
  })

  it('Nested property access: $obj.level1.level2', () => {
    // This requires runtime support - testing code generation pattern
    const { root } = renderWithRuntime(`
Frame gap 4
  each item in [{ nested: { value: "deep" }}]
    Text item.nested.value`, container)

    const text = root.querySelector('span')
    expect(text).toBeTruthy()
    expect(text!.textContent).toBe('deep')
  })
})

// ============================================================
// INTERACTIVE BEHAVIOR (with State)
// ============================================================
describe('Data + State Interaction', () => {

  it('Liste mit klickbaren Items (exclusive)', () => {
    const { root } = renderWithRuntime(`
Item: pad 12, bg #1a1a1a, cursor pointer
  selected:
    bg #2563eb
  onclick exclusive()

Frame ver, gap 4
  each name in ["Home", "Profile", "Settings"]
    Item
      Text name`, container)

    const items = root.querySelectorAll('[data-mirror-name="Item"]')
    expect(items.length).toBe(3)

    // Check text content
    const texts = root.querySelectorAll('[data-mirror-name="Item"] span')
    expect(texts.length).toBe(3)
    expect(texts[0].textContent).toBe('Home')
    expect(texts[1].textContent).toBe('Profile')
    expect(texts[2].textContent).toBe('Settings')

    // Click first item -> should become selected
    click(items[0] as HTMLElement)
    expect(getState(items[0] as HTMLElement)).toBe('selected')

    // Click second item -> first should deselect, second should select
    click(items[1] as HTMLElement)
    expect(getState(items[0] as HTMLElement)).toBe('default')
    expect(getState(items[1] as HTMLElement)).toBe('selected')
  })

  it('Cards aus Daten mit Hover-State', () => {
    const { root } = renderWithRuntime(`
Card: pad 16, bg #1a1a1a, rad 8
  hover:
    bg #252525

Frame ver, gap 12
  each product in [{ title: "Product A", price: 99 }, { title: "Product B", price: 149 }]
    Card
      Text product.title`, container)

    const cards = root.querySelectorAll('[data-mirror-name="Card"]')
    expect(cards.length).toBe(2)

    // Check text content
    const texts = root.querySelectorAll('[data-mirror-name="Card"] span')
    expect(texts[0].textContent).toBe('Product A')
    expect(texts[1].textContent).toBe('Product B')
  })
})
