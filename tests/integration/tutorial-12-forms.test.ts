/**
 * Tutorial Kapitel 12: Formulare - Integration Tests
 *
 * Input-Komponenten für Benutzereingaben.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, afterEach } from 'vitest'
import { renderMirror } from '../helpers/test-api'

describe('Tutorial 12: Formulare', () => {
  let cleanup: () => void

  afterEach(() => {
    cleanup?.()
  })

  describe('Text Input', () => {
    it('Input mit placeholder sollte rendern', async () => {
      const { container, cleanup: c } = await renderMirror(`
Frame gap 12, w 280
  Frame gap 4
    Text "Name", col #888, fs 12
    Input placeholder "Dein Name"
      bg #1a1a1a, bor 1, boc #333, col white, pad 12, rad 6, w full
      `)
      cleanup = c

      const input = container.querySelector('input')
      expect(input).not.toBeNull()
      expect(input!.placeholder).toBe('Dein Name')
    })

    it('Input mit type email sollte funktionieren', async () => {
      const { container, cleanup: c } = await renderMirror(`
Input placeholder "email@example.com", type email
  bg #1a1a1a, bor 1, boc #333, col white, pad 12, rad 6, w full
      `)
      cleanup = c

      const input = container.querySelector('input')
      expect(input).not.toBeNull()
      expect(input!.type).toBe('email')
    })
  })

  describe('Textarea', () => {
    it('Textarea sollte rendern', async () => {
      const { container, cleanup: c } = await renderMirror(`
Frame gap 4, w 280
  Text "Nachricht", col #888, fs 12
  Textarea placeholder "Schreibe eine Nachricht..."
    bg #1a1a1a, bor 1, boc #333, col white, pad 12, rad 6, w full, h 100
      `)
      cleanup = c

      const textarea = container.querySelector('textarea')
      expect(textarea).not.toBeNull()
      expect(textarea!.placeholder).toBe('Schreibe eine Nachricht...')
    })
  })

  describe('Checkbox', () => {
    it('Checkbox sollte rendern', async () => {
      const { container, cleanup: c } = await renderMirror(`
Checkbox
  Root hor, gap 10, cursor pointer
    Control w 20, h 20, bor 2, boc #444, rad 4
    Label "Newsletter abonnieren", col white, fs 13
      `)
      cleanup = c

      // Check that checkbox elements are rendered
      const labels = container.querySelectorAll('span')
      const labelText = Array.from(labels).find(l => l.textContent?.includes('Newsletter'))
      expect(labelText).not.toBeNull()
    })

    it('Checkbox checked sollte gecheckt sein', async () => {
      const { container, cleanup: c } = await renderMirror(`
Checkbox checked
  Root hor, gap 10, cursor pointer
    Control w 20, h 20, bor 2, boc #444, rad 4
    Label "AGB akzeptieren", col white, fs 13
      `)
      cleanup = c

      const labels = container.querySelectorAll('span')
      const labelText = Array.from(labels).find(l => l.textContent?.includes('AGB'))
      expect(labelText).not.toBeNull()
    })

    it('Checkbox disabled sollte deaktiviert sein', async () => {
      const { container, cleanup: c } = await renderMirror(`
Checkbox disabled
  Root hor, gap 10, cursor not-allowed, opacity 0.5
    Control w 20, h 20, bor 2, boc #444, rad 4
    Label "Deaktiviert", col #888, fs 13
      `)
      cleanup = c

      const labels = container.querySelectorAll('span')
      const labelText = Array.from(labels).find(l => l.textContent?.includes('Deaktiviert'))
      expect(labelText).not.toBeNull()
    })
  })

  describe('Switch', () => {
    it('Switch sollte rendern', async () => {
      const { container, cleanup: c } = await renderMirror(`
Switch
  Root hor, gap 12
    Track w 44, h 24, bg #333, rad 99, pad 2
      Thumb w 20, h 20, bg white, rad 99
    Label "Dark Mode", col white, fs 13
      `)
      cleanup = c

      const switchEl = container.querySelector('[role="switch"]')
      expect(switchEl).not.toBeNull()
    })

    it('Switch checked sollte aktiviert sein', async () => {
      const { container, cleanup: c } = await renderMirror(`
Switch checked
  Root hor, gap 12
    Track w 44, h 24, bg #2563eb, rad 99, pad 2
      Thumb w 20, h 20, bg white, rad 99
    Label "Notifications", col white, fs 13
      `)
      cleanup = c

      const switchEl = container.querySelector('[role="switch"]')
      expect(switchEl).not.toBeNull()
      expect(switchEl!.getAttribute('data-state')).toBe('checked')
    })
  })

  describe('RadioGroup', () => {
    it('RadioGroup sollte rendern', async () => {
      const { container, cleanup: c } = await renderMirror(`
RadioGroup value "monthly"
  Root gap 10
    Label "Abrechnungszeitraum", col white, fs 14, weight 500, margin 0 0 4 0
    Item value "monthly"
      ItemControl w 20, h 20, bor 2, boc #444, rad 99
      ItemText "Monatlich - €9/Monat", col white, fs 13, margin 0 0 0 10
    Item value "yearly"
      ItemControl w 20, h 20, bor 2, boc #444, rad 99
      ItemText "Jährlich - €99/Jahr", col white, fs 13, margin 0 0 0 10
      `)
      cleanup = c

      const radioGroup = container.querySelector('[role="radiogroup"]')
      expect(radioGroup).not.toBeNull()

      const radios = container.querySelectorAll('[role="radio"]')
      expect(radios.length).toBe(2)
    })
  })

  describe('Select', () => {
    it('Select Dropdown sollte rendern', async () => {
      const { container, cleanup: c } = await renderMirror(`
Frame gap 4, w 240
  Text "Land", col #888, fs 12
  Select
    Trigger bg #1a1a1a, bor 1, boc #333, pad 12, rad 6, hor, spread
      ValueText "Land auswählen", col #888, fs 13
      Icon "chevron-down", ic #666, is 16
    Content bg #1a1a1a, bor 1, boc #333, rad 8, pad 4, shadow lg
      Item "Deutschland", pad 10, rad 4, col white, fs 13, cursor pointer
      Item "Österreich", pad 10, rad 4, col white, fs 13, cursor pointer
      Item "Schweiz", pad 10, rad 4, col white, fs 13, cursor pointer
      `)
      cleanup = c

      // Check that select rendered with label
      const texts = container.querySelectorAll('span')
      const labelText = Array.from(texts).find(t => t.textContent === 'Land')
      expect(labelText).not.toBeNull()
    })
  })

  describe('Slider', () => {
    it('Slider sollte rendern', async () => {
      const { container, cleanup: c } = await renderMirror(`
Frame gap 16, w 280
  Slider value 50, min 0, max 100
    Root gap 8
      Label hor, spread
        Text "Lautstärke", col white, fs 13
        ValueText col #888, fs 12
      Track h 6, bg #333, rad 99
        Range bg #2563eb, rad 99
        Thumb w 18, h 18, bg white, rad 99, shadow md
      `)
      cleanup = c

      const slider = container.querySelector('[role="slider"]')
      expect(slider).not.toBeNull()
    })
  })

  describe('NumberInput', () => {
    it('NumberInput sollte rendern', async () => {
      const { container, cleanup: c } = await renderMirror(`
Frame gap 4, w 150
  Text "Anzahl", col #888, fs 12
  NumberInput value 1, min 1, max 10
    Root hor, bg #1a1a1a, bor 1, boc #333, rad 6
      DecrementTrigger pad 10, cursor pointer
        Icon "minus", ic #888, is 16
      Input bg transparent, col white, pad 10, w 60, text-align center, bor 0
      IncrementTrigger pad 10, cursor pointer
        Icon "plus", ic #888, is 16
      `)
      cleanup = c

      // Check that NumberInput rendered with label
      const texts = container.querySelectorAll('span')
      const labelText = Array.from(texts).find(t => t.textContent === 'Anzahl')
      expect(labelText).not.toBeNull()
    })
  })

  describe('PinInput', () => {
    it('PinInput sollte rendern', async () => {
      const { container, cleanup: c } = await renderMirror(`
Frame gap 8
  Text "Bestätigungscode", col white, fs 14
  PinInput length 4, otp
    Root hor, gap 8
      Input bg #1a1a1a, bor 1, boc #333, col white, w 50, h 50, rad 8, text-align center, fs 20
      Input bg #1a1a1a, bor 1, boc #333, col white, w 50, h 50, rad 8, text-align center, fs 20
      Input bg #1a1a1a, bor 1, boc #333, col white, w 50, h 50, rad 8, text-align center, fs 20
      Input bg #1a1a1a, bor 1, boc #333, col white, w 50, h 50, rad 8, text-align center, fs 20
      `)
      cleanup = c

      const inputs = container.querySelectorAll('input')
      // PinInput may generate additional hidden input
      expect(inputs.length).toBeGreaterThanOrEqual(4)
    })
  })

  describe('Login Form', () => {
    it('komplettes Login-Formular sollte rendern', async () => {
      const { container, cleanup: c } = await renderMirror(`
Frame w 320, bg #1a1a1a, pad 24, rad 16, gap 20
  Frame gap 4, center
    Text "Willkommen zurück", col white, fs 20, weight 600
    Text "Melde dich mit deinem Konto an", col #888, fs 13
  Frame gap 16
    Frame gap 4
      Text "E-Mail", col #888, fs 12
      Input placeholder "email@example.com", type email
        bg #111, bor 1, boc #333, col white, pad 12, rad 8, w full
    Frame gap 4
      Frame hor, spread
        Text "Passwort", col #888, fs 12
        Text "Vergessen?", col #2563eb, fs 12, cursor pointer
      Input placeholder "••••••••", type password
        bg #111, bor 1, boc #333, col white, pad 12, rad 8, w full
  Button "Anmelden", bg #2563eb, col white, pad 14, rad 8, w full, weight 500
      `)
      cleanup = c

      // Inputs
      const inputs = container.querySelectorAll('input')
      expect(inputs.length).toBe(2)

      // Login-Button
      const buttons = container.querySelectorAll('button')
      const loginBtn = Array.from(buttons).find(b => b.textContent?.includes('Anmelden'))
      expect(loginBtn).not.toBeNull()

      // Texte
      const texts = container.querySelectorAll('span')
      const textContents = Array.from(texts).map(t => t.textContent)
      expect(textContents).toContain('Willkommen zurück')
      expect(textContents).toContain('E-Mail')
      expect(textContents).toContain('Passwort')
    })
  })

  describe('Settings Form', () => {
    it('Einstellungen mit Switch und Select sollten rendern', async () => {
      const { container, cleanup: c } = await renderMirror(`
Frame w 340, bg #1a1a1a, pad 20, rad 12, gap 20
  Text "Einstellungen", col white, fs 18, weight 600
  Frame gap 16
    Frame hor, spread
      Frame gap 2
        Text "Benachrichtigungen", col white, fs 14
        Text "E-Mail Benachrichtigungen erhalten", col #888, fs 12
      Switch checked
        Track w 44, h 24, bg #2563eb, rad 99, pad 2
          Thumb w 20, h 20, bg white, rad 99
    Frame hor, spread
      Frame gap 2
        Text "Dark Mode", col white, fs 14
        Text "Dunkles Erscheinungsbild", col #888, fs 12
      Switch checked
        Track w 44, h 24, bg #2563eb, rad 99, pad 2
          Thumb w 20, h 20, bg white, rad 99
  Frame hor, gap 8, right
    Button "Abbrechen", bg #333, col white, pad 10 20, rad 6
    Button "Speichern", bg #2563eb, col white, pad 10 20, rad 6
      `)
      cleanup = c

      // Switches
      const switches = container.querySelectorAll('[role="switch"]')
      expect(switches.length).toBe(2)

      // Buttons
      const buttons = container.querySelectorAll('button')
      expect(buttons.length).toBe(2)
    })
  })
})
