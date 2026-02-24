/**
 * User Journey Test: Task Management App
 *
 * Simuliert einen realistischen Workflow, bei dem ein User
 * schrittweise eine komplette Task-Management-App aufbaut.
 *
 * Jeder Schritt testet:
 * - Parser-Korrektheit (keine Fehler, korrekte Struktur)
 * - React-Rendering (keine Crashes, korrektes DOM)
 * - CSS-Styles (korrekte Anwendung)
 * - Interaktivität (Events funktionieren)
 *
 * Die Schritte bauen aufeinander auf - jeder Schritt erweitert den Code.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { parse } from '../../parser/parser'
import { screen, fireEvent } from '@testing-library/react'

import {
  parseAndRender,
  getFirstNode,
  getParseErrors,
  getProperty,
  colorsMatch,
  hasElement,
  countElements,
  getStyle,
} from './utils'

// ============================================================
// JOURNEY: TASK MANAGEMENT APP
// ============================================================

describe('User Journey: Building a Task Management App', () => {

  // ============================================================
  // SCHRITT 1: Erste Komponente - Ein einfacher Container
  // ============================================================

  describe('Schritt 1: App Container', () => {
    const CODE = `App bg #1A1A1A, pad 24`

    it('Parser: sollte fehlerfrei parsen', () => {
      const result = parse(CODE)
      expect(getParseErrors(result)).toHaveLength(0)
    })

    it('Parser: sollte App-Node mit korrekten Properties haben', () => {
      const result = parse(CODE)
      const app = getFirstNode(result)
      expect(app?.name).toBe('App')
      expect(getProperty(app, 'bg')).toBe('#1A1A1A')
      expect(getProperty(app, 'pad')).toBe(24)
    })

    it('Render: sollte ohne Fehler rendern', () => {
      expect(() => parseAndRender(CODE)).not.toThrow()
    })

    it('DOM: sollte App-Element haben', () => {
      const { container } = parseAndRender(CODE)
      expect(hasElement('App', container)).toBe(true)
    })

    it('CSS: sollte korrekten Hintergrund haben', () => {
      const { container } = parseAndRender(CODE)
      const app = container.querySelector('[data-id="App1"]') as HTMLElement
      expect(colorsMatch(app.style.backgroundColor, '#1A1A1A')).toBe(true)
    })
  })

  // ============================================================
  // SCHRITT 2: Header hinzufügen
  // ============================================================

  describe('Schritt 2: Header hinzufügen', () => {
    const CODE = `App bg #1A1A1A, pad 24, ver, g 24
  Header hor, between, ver-cen
    Title text-size 24, weight bold, "Meine Tasks"
    Button bg #3B82F6, pad 8 16, rad 6, "Neuer Task"`

    it('Parser: sollte fehlerfrei parsen', () => {
      const result = parse(CODE)
      expect(getParseErrors(result)).toHaveLength(0)
    })

    it('Parser: sollte Header als Kind von App haben', () => {
      const result = parse(CODE)
      const app = getFirstNode(result)
      const header = app?.children?.find((c: any) => c.name === 'Header')
      expect(header).toBeDefined()
    })

    it('Parser: Header sollte hor und between haben', () => {
      const result = parse(CODE)
      const header = getFirstNode(result)?.children?.[0]
      expect(getProperty(header, 'hor')).toBe(true)
      expect(getProperty(header, 'between')).toBe(true)
    })

    it('Render: sollte Titel anzeigen', () => {
      parseAndRender(CODE)
      expect(screen.getByText('Meine Tasks')).toBeInTheDocument()
    })

    it('Render: sollte Button anzeigen', () => {
      parseAndRender(CODE)
      expect(screen.getByText('Neuer Task')).toBeInTheDocument()
    })

    it('CSS: Header sollte space-between haben', () => {
      const { container } = parseAndRender(CODE)
      const header = container.querySelector('[data-id="Header1"]') as HTMLElement
      expect(header.style.justifyContent).toBe('space-between')
    })

    it('CSS: Button sollte blauen Hintergrund haben', () => {
      parseAndRender(CODE)
      const button = screen.getByText('Neuer Task')
      const styledEl = button.closest('[data-id^="Button"]') as HTMLElement
      expect(colorsMatch(styledEl.style.backgroundColor, '#3B82F6')).toBe(true)
    })
  })

  // ============================================================
  // SCHRITT 3: Task-Liste mit wiederverwendbaren Komponenten
  // ============================================================

  describe('Schritt 3: Task-Liste mit Komponenten-Definition', () => {
    const CODE = `Task-Item: hor, between, ver-cen, bg #27272A, pad 12 16, rad 8
  Left: hor, g 12, ver-cen
  Right:

App bg #1A1A1A, pad 24, ver, g 24
  Header hor, between, ver-cen
    Title text-size 24, weight bold, "Meine Tasks"
    Button bg #3B82F6, pad 8 16, rad 6, "Neuer Task"

  Task-List ver, g 8
    Task-Item
      Left
        Icon "circle", col #666
        Text "Einkaufen gehen"
      Right
        Text col #888, "Heute"
    Task-Item
      Left
        Icon "check-circle", col #22C55E
        Text "Meeting vorbereiten"
      Right
        Text col #888, "Gestern"`

    it('Parser: sollte fehlerfrei parsen', () => {
      const result = parse(CODE)
      expect(getParseErrors(result)).toHaveLength(0)
    })

    it('Parser: sollte Task-Item in Registry haben', () => {
      const result = parse(CODE)
      expect(result.registry.has('Task-Item')).toBe(true)
    })

    it('Parser: Task-Item sollte Left und Right Slots haben', () => {
      const result = parse(CODE)
      const template = result.registry.get('Task-Item')
      const children = template?.children as any[]
      const left = children?.find((c: any) => c.name === 'Left')
      const right = children?.find((c: any) => c.name === 'Right')
      expect(left).toBeDefined()
      expect(right).toBeDefined()
    })

    it('Render: sollte alle Task-Texte anzeigen', () => {
      parseAndRender(CODE)
      expect(screen.getByText('Einkaufen gehen')).toBeInTheDocument()
      expect(screen.getByText('Meeting vorbereiten')).toBeInTheDocument()
    })

    it('Render: sollte Datums-Labels anzeigen', () => {
      parseAndRender(CODE)
      expect(screen.getByText('Heute')).toBeInTheDocument()
      expect(screen.getByText('Gestern')).toBeInTheDocument()
    })

    it('DOM: sollte zwei Task-Items haben', () => {
      const { container } = parseAndRender(CODE)
      expect(countElements('Task-Item', container)).toBe(2)
    })

    it('CSS: Task-Items sollten gleichen Hintergrund haben', () => {
      const { container } = parseAndRender(CODE)
      const items = container.querySelectorAll('[data-id^="Task-Item"]')
      items.forEach(item => {
        expect(colorsMatch((item as HTMLElement).style.backgroundColor, '#27272A')).toBe(true)
      })
    })
  })

  // ============================================================
  // SCHRITT 4: Hover-States hinzufügen
  // ============================================================

  describe('Schritt 4: Hover-States für Interaktivität', () => {
    const CODE = `Task-Item: hor, between, ver-cen, bg #27272A, pad 12 16, rad 8, cursor pointer
  hover
    bg #333333
  Left: hor, g 12, ver-cen
  Right:

App bg #1A1A1A, pad 24, ver, g 24
  Header hor, between, ver-cen
    Title text-size 24, weight bold, "Meine Tasks"
    Button bg #3B82F6, pad 8 16, rad 6, "Neuer Task"
      hover
        bg #2563EB

  Task-List ver, g 8
    Task-Item
      Left
        Icon "circle", col #666
        Text "Einkaufen gehen"
      Right
        Text col #888, "Heute"`

    it('Parser: sollte fehlerfrei parsen', () => {
      const result = parse(CODE)
      expect(getParseErrors(result)).toHaveLength(0)
    })

    it('Parser: Task-Item sollte hover-State haben', () => {
      const result = parse(CODE)
      const template = result.registry.get('Task-Item')
      const hoverState = template?.states?.find((s: any) => s.name === 'hover')
      expect(hoverState).toBeDefined()
    })

    it('Parser: hover-State sollte bg #333333 haben', () => {
      const result = parse(CODE)
      const template = result.registry.get('Task-Item')
      const hoverState = template?.states?.find((s: any) => s.name === 'hover')
      expect(hoverState?.properties?.bg).toBe('#333333')
    })

    it('Parser: Task-Item sollte cursor pointer haben', () => {
      const result = parse(CODE)
      const template = result.registry.get('Task-Item')
      expect(getProperty(template, 'cursor')).toBe('pointer')
    })

    it('Render: sollte ohne Fehler rendern', () => {
      expect(() => parseAndRender(CODE)).not.toThrow()
    })

    it('CSS: Task-Item sollte cursor pointer haben', () => {
      const { container } = parseAndRender(CODE)
      const item = container.querySelector('[data-id^="Task-Item"]') as HTMLElement
      expect(item.style.cursor).toBe('pointer')
    })

    it('Interaktion: Hover sollte ohne Crash funktionieren', () => {
      const { container } = parseAndRender(CODE)
      const item = container.querySelector('[data-id^="Task-Item"]') as HTMLElement
      expect(() => {
        fireEvent.mouseEnter(item)
        fireEvent.mouseLeave(item)
      }).not.toThrow()
    })
  })

  // ============================================================
  // SCHRITT 5: Toggle-Funktionalität
  // ============================================================

  describe('Schritt 5: Toggle-Funktionalität', () => {
    const CODE = `Task-Item: hor, between, ver-cen, bg #27272A, pad 12 16, rad 8, cursor pointer
  hover
    bg #333333
  state completed
    o 0.5
  Left: hor, g 12, ver-cen
  Right:

App bg #1A1A1A, pad 24, ver, g 24
  Header hor, between, ver-cen
    Title text-size 24, weight bold, "Meine Tasks"
    Filter-Button bg #333, pad 8 16, rad 6, "Filter"

  Task-List ver, g 8
    Task-Item onclick toggle-state completed
      Left
        Icon "circle", col #666
        Text "Einkaufen gehen"
      Right
        Text col #888, "Heute"
    Task-Item
      Left
        Icon "check-circle", col #22C55E
        Text "Meeting vorbereiten"
      Right
        Text col #888, "Gestern"`

    it('Parser: sollte fehlerfrei parsen', () => {
      const result = parse(CODE)
      expect(getParseErrors(result)).toHaveLength(0)
    })

    it('Parser: Task-Item sollte completed-State haben', () => {
      const result = parse(CODE)
      const template = result.registry.get('Task-Item')
      const completedState = template?.states?.find((s: any) => s.name === 'completed')
      expect(completedState).toBeDefined()
    })

    it('Parser: completed-State sollte opacity 0.5 haben', () => {
      const result = parse(CODE)
      const template = result.registry.get('Task-Item')
      const completedState = template?.states?.find((s: any) => s.name === 'completed')
      expect(completedState?.properties?.o).toBe(0.5)
    })

    it('Render: sollte alle Elemente anzeigen', () => {
      parseAndRender(CODE)
      expect(screen.getByText('Meine Tasks')).toBeInTheDocument()
      expect(screen.getByText('Einkaufen gehen')).toBeInTheDocument()
      expect(screen.getByText('Filter')).toBeInTheDocument()
    })

    it('Interaktion: Klick auf Task-Item sollte ohne Crash funktionieren', () => {
      const { container } = parseAndRender(CODE)
      const item = container.querySelector('[data-id^="Task-Item"]') as HTMLElement
      expect(() => fireEvent.click(item)).not.toThrow()
    })
  })

  // ============================================================
  // SCHRITT 6: Modal für neuen Task
  // ============================================================

  describe('Schritt 6: Modal für neuen Task', () => {
    const CODE = `Task-Item: hor, between, ver-cen, bg #27272A, pad 12 16, rad 8, cursor pointer
  hover
    bg #333333
  Left: hor, g 12, ver-cen
  Right:

Modal: stacked, cen, bg rgba(0,0,0,0.8), z 100
  Content: bg #27272A, pad 24, rad 12, w 400

App bg #1A1A1A, pad 24, ver, g 24
  Header hor, between, ver-cen
    Title text-size 24, weight bold, "Meine Tasks"
    Button bg #3B82F6, pad 8 16, rad 6, "Neuer Task"
      hover
        bg #2563EB
      onclick show NewTaskModal

  Task-List ver, g 8
    Task-Item
      Left
        Icon "circle", col #666
        Text "Einkaufen gehen"
      Right
        Text col #888, "Heute"

  NewTaskModal hidden
    Modal
      Content
        Text text-size 18, weight 600, "Neuer Task"
        Input w full, pad 12, bg #1A1A1A, rad 6, bor 1 #444, "Task-Titel..."
        Box hor, g 8, right, mar t 16
          Button bg transparent, bor 1 #444, pad 8 16, rad 6, "Abbrechen"
            onclick hide NewTaskModal
          Button bg #3B82F6, pad 8 16, rad 6, "Erstellen"`

    it('Parser: sollte fehlerfrei parsen', () => {
      const result = parse(CODE)
      expect(getParseErrors(result)).toHaveLength(0)
    })

    it('Parser: sollte Modal in Registry haben', () => {
      const result = parse(CODE)
      expect(result.registry.has('Modal')).toBe(true)
    })

    it('Parser: Modal sollte stacked haben', () => {
      const result = parse(CODE)
      const modal = result.registry.get('Modal')
      expect(getProperty(modal, 'stacked')).toBe(true)
    })

    it('Parser: NewTaskModal sollte hidden sein', () => {
      const result = parse(CODE)
      const app = getFirstNode(result)
      const modal = app?.children?.find((c: any) => c.name === 'NewTaskModal')
      expect(getProperty(modal, 'hidden')).toBe(true)
    })

    it('Render: sollte Header anzeigen', () => {
      parseAndRender(CODE)
      expect(screen.getByText('Meine Tasks')).toBeInTheDocument()
    })

    it('Render: Modal sollte initial versteckt sein', () => {
      const { container } = parseAndRender(CODE)
      const modal = container.querySelector('[data-id^="NewTaskModal"]')
      expect(modal).toBeNull()
    })

    it('Interaktion: Klick auf "Neuer Task" sollte ohne Crash funktionieren', () => {
      parseAndRender(CODE)
      const button = screen.getByText('Neuer Task')
      const clickTarget = button.closest('[data-id]') as HTMLElement
      expect(() => fireEvent.click(clickTarget)).not.toThrow()
    })
  })

  // ============================================================
  // SCHRITT 7: Design Tokens
  // ============================================================

  describe('Schritt 7: Design Tokens', () => {
    const CODE = `$bg-color: #1A1A1A
$surface-color: #27272A
$hover-color: #333333
$primary-color: #3B82F6
$muted-color: #888888
$radius: 8
$spacing: 16

Task-Item: hor, between, ver-cen, bg $surface-color, pad 12 $spacing, rad $radius, cursor pointer
  hover
    bg $hover-color
  Left: hor, g 12, ver-cen
  Right:

App bg $bg-color, pad 24, ver, g 24
  Header hor, between, ver-cen
    Title text-size 24, weight bold, "Meine Tasks"
    Button bg $primary-color, pad 8 $spacing, rad 6, "Neuer Task"

  Task-List ver, g 8
    Task-Item
      Left
        Icon "circle", col $muted-color
        Text "Einkaufen gehen"
      Right
        Text col $muted-color, "Heute"`

    it('Parser: sollte fehlerfrei parsen', () => {
      const result = parse(CODE)
      expect(getParseErrors(result)).toHaveLength(0)
    })

    it('Parser: sollte alle Tokens haben', () => {
      const result = parse(CODE)
      expect(result.tokens.has('bg-color')).toBe(true)
      expect(result.tokens.has('surface-color')).toBe(true)
      expect(result.tokens.has('primary-color')).toBe(true)
      expect(result.tokens.has('radius')).toBe(true)
      expect(result.tokens.has('spacing')).toBe(true)
    })

    it('Parser: Token-Werte sollten korrekt sein', () => {
      const result = parse(CODE)
      expect(result.tokens.get('bg-color')).toBe('#1A1A1A')
      expect(result.tokens.get('primary-color')).toBe('#3B82F6')
      expect(result.tokens.get('radius')).toBe(8)
      expect(result.tokens.get('spacing')).toBe(16)
    })

    it('Render: sollte alle Texte anzeigen', () => {
      parseAndRender(CODE)
      expect(screen.getByText('Meine Tasks')).toBeInTheDocument()
      expect(screen.getByText('Einkaufen gehen')).toBeInTheDocument()
    })

    it('CSS: Token-Werte sollten aufgelöst werden', () => {
      const { container } = parseAndRender(CODE)
      const app = container.querySelector('[data-id="App1"]') as HTMLElement
      expect(colorsMatch(app.style.backgroundColor, '#1A1A1A')).toBe(true)
    })

    it('CSS: Button sollte $primary-color verwenden', () => {
      parseAndRender(CODE)
      const button = screen.getByText('Neuer Task')
      const styledEl = button.closest('[data-id^="Button"]') as HTMLElement
      expect(colorsMatch(styledEl.style.backgroundColor, '#3B82F6')).toBe(true)
    })
  })

  // ============================================================
  // SCHRITT 8: Vollständige App mit Kategorien und Sidebar
  // ============================================================

  describe('Schritt 8: Vollständige App mit Sidebar', () => {
    const CODE = `$bg-color: #1A1A1A
$surface-color: #27272A
$hover-color: #333333
$primary-color: #3B82F6
$muted-color: #888888
$success-color: #22C55E
$warning-color: #F59E0B
$danger-color: #EF4444

Category-Badge: pad 4 8, rad 4, text-size 12

Task-Item: hor, between, ver-cen, bg $surface-color, pad 12 16, rad 8, cursor pointer
  hover
    bg $hover-color
  state completed
    o 0.5
  Left: hor, g 12, ver-cen
  Right: hor, g 8, ver-cen

Sidebar: ver, g 4, w 200, pad r 24, bor r 1 #333
  Section: ver, g 4
    Section-Title: text-size 12, col $muted-color, uppercase, pad 8 12

App bg $bg-color, hor

  Sidebar
    Section
      Section-Title "Kategorien"
      Category-Badge bg #3B82F620, col #3B82F6, "Arbeit"
      Category-Badge bg #22C55E20, col #22C55E, "Privat"
      Category-Badge bg #EF444420, col #EF4444, "Dringend"

  Main ver, g 24, pad 24, w full
    Header hor, between, ver-cen
      Title text-size 24, weight bold, "Meine Tasks"
      Button bg $primary-color, pad 8 16, rad 6, "Neuer Task"

    Task-List ver, g 8
      Task-Item
        Left
          Icon "circle", col $muted-color
          Text "Präsentation vorbereiten"
        Right
          Category-Badge bg #3B82F620, col #3B82F6, "Arbeit"
          Text col $muted-color, "Heute"

      Task-Item
        Left
          Icon "circle", col $warning-color
          Text "Arzttermin vereinbaren"
        Right
          Category-Badge bg #EF444420, col #EF4444, "Dringend"
          Text col $muted-color, "Morgen"

      Task-Item onclick toggle-state completed
        Left
          Icon "check-circle", col $success-color
          Text "Einkaufen gehen"
        Right
          Category-Badge bg #22C55E20, col #22C55E, "Privat"
          Text col $muted-color, "Gestern"`

    it('Parser: sollte fehlerfrei parsen', () => {
      const result = parse(CODE)
      expect(getParseErrors(result)).toHaveLength(0)
    })

    it('Parser: sollte alle Komponenten in Registry haben', () => {
      const result = parse(CODE)
      expect(result.registry.has('Category-Badge')).toBe(true)
      expect(result.registry.has('Task-Item')).toBe(true)
      expect(result.registry.has('Sidebar')).toBe(true)
    })

    it('Parser: sollte alle Tokens haben', () => {
      const result = parse(CODE)
      expect(result.tokens.has('bg-color')).toBe(true)
      expect(result.tokens.has('warning-color')).toBe(true)
      expect(result.tokens.has('danger-color')).toBe(true)
    })

    it('Parser: App sollte hor Layout haben', () => {
      const result = parse(CODE)
      const app = getFirstNode(result)
      expect(getProperty(app, 'hor')).toBe(true)
    })

    it('Parser: App sollte Sidebar und Main haben', () => {
      const result = parse(CODE)
      const app = getFirstNode(result)
      const sidebar = app?.children?.find((c: any) => c.name === 'Sidebar')
      const main = app?.children?.find((c: any) => c.name === 'Main')
      expect(sidebar).toBeDefined()
      expect(main).toBeDefined()
    })

    it('Render: sollte alle Task-Texte anzeigen', () => {
      parseAndRender(CODE)
      expect(screen.getByText('Präsentation vorbereiten')).toBeInTheDocument()
      expect(screen.getByText('Arzttermin vereinbaren')).toBeInTheDocument()
      expect(screen.getByText('Einkaufen gehen')).toBeInTheDocument()
    })

    it('Render: sollte Sidebar-Kategorien anzeigen', () => {
      parseAndRender(CODE)
      expect(screen.getByText('Kategorien')).toBeInTheDocument()
      // Kategorien erscheinen mehrfach (Sidebar + Task-Badges), daher getAllByText
      expect(screen.getAllByText('Arbeit').length).toBeGreaterThanOrEqual(1)
      expect(screen.getAllByText('Privat').length).toBeGreaterThanOrEqual(1)
      expect(screen.getAllByText('Dringend').length).toBeGreaterThanOrEqual(1)
    })

    it('DOM: sollte drei Task-Items haben', () => {
      const { container } = parseAndRender(CODE)
      expect(countElements('Task-Item', container)).toBe(3)
    })

    it('DOM: sollte Sidebar haben', () => {
      const { container } = parseAndRender(CODE)
      expect(hasElement('Sidebar', container)).toBe(true)
    })

    it('CSS: Sidebar sollte Breite 200px haben', () => {
      const { container } = parseAndRender(CODE)
      const sidebar = container.querySelector('[data-id^="Sidebar"]') as HTMLElement
      expect(sidebar.style.width).toBe('200px')
    })

    it('Interaktion: Hover auf Task-Items sollte funktionieren', () => {
      const { container } = parseAndRender(CODE)
      const items = container.querySelectorAll('[data-id^="Task-Item"]')
      items.forEach(item => {
        expect(() => {
          fireEvent.mouseEnter(item)
          fireEvent.mouseLeave(item)
        }).not.toThrow()
      })
    })

    it('Interaktion: Klick auf letzten Task sollte funktionieren', () => {
      const { container } = parseAndRender(CODE)
      const items = container.querySelectorAll('[data-id^="Task-Item"]')
      const lastItem = items[items.length - 1]
      expect(() => fireEvent.click(lastItem)).not.toThrow()
    })
  })
})
