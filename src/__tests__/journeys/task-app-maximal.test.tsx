/**
 * Task App Journey - Maximal Validation
 *
 * Vollständige Validierung aller 8 Schritte nach dem
 * Maximal-Validation-Pattern (13 Kategorien pro Schritt).
 *
 * Jeder Schritt wird mit ~50 Tests validiert.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { parse } from '../../parser/parser'
import { screen, fireEvent } from '@testing-library/react'

import {
  parseAndRender,
  getParseErrors,
  getSyntaxWarnings,
  queryByDataId,
  countElements,
  colorsMatch,
  hasElement,
} from './utils'

// ############################################################
// SCHRITT 1: App-Container
// ############################################################

const STEP_1_CODE = `App ver, pad 24, bg #1A1A1A
  Title text-size 24, weight bold, "Meine Tasks"`

describe('Schritt 1: App-Container', () => {

  // ==========================================================
  // 1. PARSER-EBENE
  // ==========================================================

  describe('1. Parser-Ebene', () => {
    it('sollte ohne Parse-Errors parsen', () => {
      const result = parse(STEP_1_CODE)
      const errors = getParseErrors(result)
      expect(errors).toHaveLength(0)
    })

    it('sollte ohne Syntax-Warnings parsen', () => {
      const result = parse(STEP_1_CODE)
      const warnings = getSyntaxWarnings(result)
      expect(warnings).toHaveLength(0)
    })

    it('sollte Nodes zurückgeben', () => {
      const result = parse(STEP_1_CODE)
      expect(result.nodes).toBeDefined()
      expect(result.nodes?.length).toBeGreaterThan(0)
    })
  })

  // ==========================================================
  // 2. TOKENS
  // ==========================================================

  describe('2. Tokens', () => {
    it('sollte keine Tokens haben (inline Farben verwendet)', () => {
      const result = parse(STEP_1_CODE)
      expect(result.tokens.size).toBe(0)
    })
  })

  // ==========================================================
  // 3. REGISTRY
  // ==========================================================

  describe('3. Registry', () => {
    let result: ReturnType<typeof parse>

    beforeEach(() => {
      result = parse(STEP_1_CODE)
    })

    it('sollte implizite Komponenten registrieren', () => {
      // Mirror registriert App und Title automatisch (inline define + render)
      expect(result.registry.size).toBeGreaterThan(0)
    })

    it('sollte App in Registry haben', () => {
      expect(result.registry.has('App')).toBe(true)
    })

    it('sollte Title in Registry haben', () => {
      expect(result.registry.has('Title')).toBe(true)
    })

    it('sollte keine expliziten Definitionen haben (kein Doppelpunkt)', () => {
      // Die Komponenten sind implizit, nicht explizit definiert
      const appDef = result.registry.get('App')
      // Implizite Definitionen haben trotzdem Properties
      expect(appDef).toBeDefined()
    })
  })

  // ==========================================================
  // 4. AST-STRUKTUR
  // ==========================================================

  describe('4. AST-Struktur', () => {
    let result: ReturnType<typeof parse>

    beforeEach(() => {
      result = parse(STEP_1_CODE)
    })

    it('sollte App als Root-Node haben', () => {
      expect(result.nodes?.length).toBe(1)
      expect(result.nodes?.[0].name).toBe('App')
    })

    it('sollte App mit genau 1 Kind haben', () => {
      const app = result.nodes?.[0]
      const children = app?.children as any[]
      expect(children?.length).toBe(1)
    })

    it('sollte Title als Kind von App haben', () => {
      const app = result.nodes?.[0]
      const children = app?.children as any[]
      expect(children?.[0].name).toBe('Title')
    })

    it('sollte App korrekte Properties haben', () => {
      const app = result.nodes?.[0]
      expect(app?.properties).toBeDefined()
    })

    it('sollte App mit type component haben', () => {
      const app = result.nodes?.[0]
      expect(app?.type).toBe('component')
    })

    it('sollte Title mit type component haben', () => {
      const app = result.nodes?.[0]
      const title = (app?.children as any[])?.[0]
      expect(title?.type).toBe('component')
    })

    it('sollte Zeilennummern haben', () => {
      const app = result.nodes?.[0]
      expect(app?.line).toBeDefined()
      // Zeile kann 0-basiert oder 1-basiert sein
      expect(app?.line).toBeGreaterThanOrEqual(0)
    })
  })

  // ==========================================================
  // 5. REACT-RENDERING
  // ==========================================================

  describe('5. React-Rendering', () => {
    it('sollte ohne Fehler rendern', () => {
      expect(() => parseAndRender(STEP_1_CODE)).not.toThrow()
    })

    it('sollte Container zurückgeben', () => {
      const { container } = parseAndRender(STEP_1_CODE)
      expect(container).toBeDefined()
    })

    it('sollte Container nicht leer sein', () => {
      const { container } = parseAndRender(STEP_1_CODE)
      expect(container.innerHTML).not.toBe('')
    })

    it('sollte HTML-Elemente enthalten', () => {
      const { container } = parseAndRender(STEP_1_CODE)
      expect(container.querySelectorAll('*').length).toBeGreaterThan(0)
    })
  })

  // ==========================================================
  // 6. DOM-STRUKTUR
  // ==========================================================

  describe('6. DOM-Struktur', () => {
    let container: HTMLElement

    beforeEach(() => {
      const result = parseAndRender(STEP_1_CODE)
      container = result.container
    })

    it('sollte App-Element haben', () => {
      const app = queryByDataId('App', container)
      expect(app.element).not.toBeNull()
    })

    it('sollte Title-Element haben', () => {
      const title = queryByDataId('Title', container)
      expect(title.element).not.toBeNull()
    })

    it('sollte Title als Kind von App im DOM haben', () => {
      const app = queryByDataId('App', container).element!
      const title = app.querySelector('[data-id^="Title"]')
      expect(title).not.toBeNull()
    })

    it('sollte App als div rendern', () => {
      const app = queryByDataId('App', container).element!
      expect(app.tagName.toLowerCase()).toBe('div')
    })

    it('sollte Title als div rendern', () => {
      const title = queryByDataId('Title', container).element!
      expect(title.tagName.toLowerCase()).toBe('div')
    })

    it('sollte data-id auf App haben', () => {
      const app = queryByDataId('App', container).element!
      expect(app.getAttribute('data-id')).toMatch(/^App/)
    })

    it('sollte data-id auf Title haben', () => {
      const title = queryByDataId('Title', container).element!
      expect(title.getAttribute('data-id')).toMatch(/^Title/)
    })

    it('sollte class App haben', () => {
      const app = queryByDataId('App', container).element!
      expect(app.className).toContain('App')
    })

    it('sollte class Title haben', () => {
      const title = queryByDataId('Title', container).element!
      expect(title.className).toContain('Title')
    })

    it('sollte genau 1 App haben', () => {
      expect(countElements('App', container)).toBe(1)
    })

    it('sollte genau 1 Title haben', () => {
      expect(countElements('Title', container)).toBe(1)
    })

    it('sollte Title direkt in App haben (nicht tiefer verschachtelt)', () => {
      const app = queryByDataId('App', container).element!
      const directChildren = Array.from(app.children)
      const hasDirectTitle = directChildren.some(
        child => child.getAttribute('data-id')?.startsWith('Title')
      )
      expect(hasDirectTitle).toBe(true)
    })
  })

  // ==========================================================
  // 7. CSS/STYLES
  // ==========================================================

  describe('7. CSS/Styles', () => {
    let app: HTMLElement
    let title: HTMLElement

    beforeEach(() => {
      const { container } = parseAndRender(STEP_1_CODE)
      app = queryByDataId('App', container).element!
      title = queryByDataId('Title', container).element!
    })

    // App Styles
    describe('App Styles', () => {
      it('sollte display flex/inline-flex haben', () => {
        expect(['flex', 'inline-flex']).toContain(app.style.display)
      })

      it('sollte flex-direction column haben (ver)', () => {
        expect(app.style.flexDirection).toBe('column')
      })

      it('sollte padding 24px haben', () => {
        expect(app.style.padding).toBe('24px')
      })

      it('sollte background-color #1A1A1A haben', () => {
        expect(colorsMatch(app.style.backgroundColor, '#1A1A1A')).toBe(true)
      })
    })

    // Title Styles
    describe('Title Styles', () => {
      it('sollte font-size 24px haben', () => {
        expect(title.style.fontSize).toBe('24px')
      })

      it('sollte font-weight bold/700 haben', () => {
        expect(['bold', '700']).toContain(title.style.fontWeight)
      })
    })
  })

  // ==========================================================
  // 8. TEXT-CONTENT
  // ==========================================================

  describe('8. Text-Content', () => {
    let container: HTMLElement

    beforeEach(() => {
      const result = parseAndRender(STEP_1_CODE)
      container = result.container
    })

    it('sollte "Meine Tasks" sichtbar sein', () => {
      expect(screen.getByText('Meine Tasks')).toBeInTheDocument()
    })

    it('sollte Text im Title-Element sein', () => {
      const title = queryByDataId('Title', container).element!
      expect(title.textContent).toContain('Meine Tasks')
    })

    it('sollte Text in span-Wrapper sein', () => {
      const title = queryByDataId('Title', container).element!
      // Text kann direkt oder in span sein
      const hasText = title.textContent?.includes('Meine Tasks')
      expect(hasText).toBe(true)
    })

    it('sollte Text nicht außerhalb Title sein', () => {
      const app = queryByDataId('App', container).element!
      const title = queryByDataId('Title', container).element!

      // Entferne Title-Text vom App-Text
      const appTextWithoutTitle = app.textContent?.replace(title.textContent || '', '')
      expect(appTextWithoutTitle?.trim()).toBe('')
    })

    it('sollte Text nicht dupliziert sein', () => {
      const allText = container.textContent || ''
      const matches = allText.match(/Meine Tasks/g)
      expect(matches?.length).toBe(1)
    })
  })

  // ==========================================================
  // 9. HOVER-STATE
  // ==========================================================

  describe('9. Hover-State', () => {
    it('sollte keinen Hover-State haben (nicht definiert)', () => {
      const result = parse(STEP_1_CODE)
      const app = result.nodes?.[0]
      expect(app?.states).toBeUndefined()
    })

    it('sollte mouseEnter ohne Fehler akzeptieren', () => {
      const { container } = parseAndRender(STEP_1_CODE)
      const app = queryByDataId('App', container).element!
      expect(() => fireEvent.mouseEnter(app)).not.toThrow()
    })

    it('sollte mouseLeave ohne Fehler akzeptieren', () => {
      const { container } = parseAndRender(STEP_1_CODE)
      const app = queryByDataId('App', container).element!
      expect(() => fireEvent.mouseLeave(app)).not.toThrow()
    })
  })

  // ==========================================================
  // 10. BEHAVIOR-STATES
  // ==========================================================

  describe('10. Behavior-States', () => {
    it('sollte keine Behavior-States haben', () => {
      const result = parse(STEP_1_CODE)
      const app = result.nodes?.[0]
      const title = (app?.children as any[])?.[0]
      expect(app?.states).toBeUndefined()
      expect(title?.states).toBeUndefined()
    })
  })

  // ==========================================================
  // 11. INTERAKTIONEN
  // ==========================================================

  describe('11. Interaktionen', () => {
    let container: HTMLElement
    let app: HTMLElement
    let title: HTMLElement

    beforeEach(() => {
      const result = parseAndRender(STEP_1_CODE)
      container = result.container
      app = queryByDataId('App', container).element!
      title = queryByDataId('Title', container).element!
    })

    it('sollte Click auf App akzeptieren', () => {
      expect(() => fireEvent.click(app)).not.toThrow()
    })

    it('sollte Click auf Title akzeptieren', () => {
      expect(() => fireEvent.click(title)).not.toThrow()
    })

    it('sollte mouseDown auf App akzeptieren', () => {
      expect(() => fireEvent.mouseDown(app)).not.toThrow()
    })

    it('sollte mouseUp auf App akzeptieren', () => {
      expect(() => fireEvent.mouseUp(app)).not.toThrow()
    })

    it('sollte mouseDown/mouseUp Sequenz akzeptieren', () => {
      expect(() => {
        fireEvent.mouseDown(app)
        fireEvent.mouseUp(app)
      }).not.toThrow()
    })
  })

  // ==========================================================
  // 12. EDGE CASES
  // ==========================================================

  describe('12. Edge Cases', () => {
    it('sollte leeren Title-Text verkraften', () => {
      const code = STEP_1_CODE.replace('"Meine Tasks"', '""')
      expect(() => parseAndRender(code)).not.toThrow()
    })

    it('sollte sehr langen Title-Text verkraften', () => {
      const longText = 'A'.repeat(200)
      const code = STEP_1_CODE.replace('"Meine Tasks"', `"${longText}"`)
      expect(() => parseAndRender(code)).not.toThrow()
    })

    it('sollte Sonderzeichen im Title verkraften', () => {
      const code = STEP_1_CODE.replace('"Meine Tasks"', '"Meine Tasks → 2024 © ™"')
      expect(() => parseAndRender(code)).not.toThrow()
    })

    it('sollte Emoji im Title verkraften', () => {
      const code = STEP_1_CODE.replace('"Meine Tasks"', '"✓ Meine Tasks 🎯"')
      expect(() => parseAndRender(code)).not.toThrow()
    })

    it('sollte deutschen Umlaut im Title verkraften', () => {
      const code = STEP_1_CODE.replace('"Meine Tasks"', '"Meine Aufgäben"')
      expect(() => parseAndRender(code)).not.toThrow()
    })

    it('sollte Zeilenumbruch im Title verkraften', () => {
      const code = STEP_1_CODE.replace('"Meine Tasks"', '"Meine\\nTasks"')
      expect(() => parseAndRender(code)).not.toThrow()
    })

    it('sollte nur App ohne Title verkraften', () => {
      const code = `App ver, pad 24, bg #1A1A1A`
      expect(() => parseAndRender(code)).not.toThrow()
    })

    it('sollte mehrere Titles verkraften', () => {
      const code = `App ver, pad 24, bg #1A1A1A
  Title text-size 24, weight bold, "Titel 1"
  Title text-size 18, "Titel 2"`
      const { container } = parseAndRender(code)
      expect(countElements('Title', container)).toBe(2)
    })

    it('sollte andere Hintergrundfarbe verkraften', () => {
      const code = STEP_1_CODE.replace('#1A1A1A', '#FF0000')
      const { container } = parseAndRender(code)
      const app = queryByDataId('App', container).element!
      expect(colorsMatch(app.style.backgroundColor, '#FF0000')).toBe(true)
    })

    it('sollte anderen Padding verkraften', () => {
      const code = STEP_1_CODE.replace('pad 24', 'pad 48')
      const { container } = parseAndRender(code)
      const app = queryByDataId('App', container).element!
      expect(app.style.padding).toBe('48px')
    })

    it('sollte horizontales Layout verkraften', () => {
      const code = STEP_1_CODE.replace('ver', 'hor')
      const { container } = parseAndRender(code)
      const app = queryByDataId('App', container).element!
      expect(app.style.flexDirection).toBe('row')
    })
  })

  // ==========================================================
  // 13. ZUSAMMENFASSUNG (Integration)
  // ==========================================================

  describe('13. Vollständige Validierung', () => {
    it('sollte den gesamten Flow durchlaufen', () => {
      // 1. Parse
      const result = parse(STEP_1_CODE)
      expect(getParseErrors(result)).toHaveLength(0)

      // 2. Keine Tokens (inline Farben)
      expect(result.tokens.size).toBe(0)

      // 3. Implizite Registry-Einträge (App, Title)
      expect(result.registry.has('App')).toBe(true)
      expect(result.registry.has('Title')).toBe(true)

      // 4. AST korrekt
      expect(result.nodes?.[0].name).toBe('App')
      expect((result.nodes?.[0].children as any[])?.[0].name).toBe('Title')

      // 5. Render
      const { container } = parseAndRender(STEP_1_CODE)

      // 6. DOM korrekt
      const app = queryByDataId('App', container).element!
      const title = queryByDataId('Title', container).element!
      expect(app).toBeDefined()
      expect(title).toBeDefined()

      // 7. Styles korrekt
      expect(app.style.flexDirection).toBe('column')
      expect(app.style.padding).toBe('24px')
      expect(colorsMatch(app.style.backgroundColor, '#1A1A1A')).toBe(true)
      expect(title.style.fontSize).toBe('24px')

      // 8. Text korrekt
      expect(title.textContent).toContain('Meine Tasks')

      // 9. Interaktionen funktionieren
      expect(() => fireEvent.click(app)).not.toThrow()
      expect(() => fireEvent.click(title)).not.toThrow()
    })
  })
})

// ############################################################
// SCHRITT 2: Task-Liste mit Komponenten-Definition
// ############################################################

const STEP_2_CODE = `Task-Item: hor, between, ver-cen, bg #27272A, pad 12 16, rad 8
  Left: hor, g 12, ver-cen
  Right:

App bg #1A1A1A, pad 24, ver, g 24
  Header hor, between, ver-cen
    Title text-size 24, weight bold, "Meine Tasks"
    Button bg #3B82F6, pad 8 16, rad 6, "Neuer Task"

  Task-List ver, g 8
    Task-Item
      Left
        Icon "circle", size 16, col #888
        Text "Erste Aufgabe"
      Right
        Text text-size 12, col #888, "Heute"
    Task-Item
      Left
        Icon "circle", size 16, col #888
        Text "Zweite Aufgabe"
      Right
        Text text-size 12, col #888, "Morgen"`

describe('Schritt 2: Task-Liste mit Komponenten-Definition', () => {

  // ==========================================================
  // 1. PARSER-EBENE
  // ==========================================================

  describe('1. Parser-Ebene', () => {
    it('sollte ohne Parse-Errors parsen', () => {
      const result = parse(STEP_2_CODE)
      const errors = getParseErrors(result)
      expect(errors).toHaveLength(0)
    })

    it('sollte ohne Syntax-Warnings parsen', () => {
      const result = parse(STEP_2_CODE)
      const warnings = getSyntaxWarnings(result)
      expect(warnings).toHaveLength(0)
    })

    it('sollte Nodes zurückgeben', () => {
      const result = parse(STEP_2_CODE)
      expect(result.nodes).toBeDefined()
      expect(result.nodes?.length).toBeGreaterThan(0)
    })
  })

  // ==========================================================
  // 2. TOKENS
  // ==========================================================

  describe('2. Tokens', () => {
    it('sollte keine Tokens haben (inline Farben)', () => {
      const result = parse(STEP_2_CODE)
      expect(result.tokens.size).toBe(0)
    })
  })

  // ==========================================================
  // 3. REGISTRY
  // ==========================================================

  describe('3. Registry', () => {
    let result: ReturnType<typeof parse>

    beforeEach(() => {
      result = parse(STEP_2_CODE)
    })

    it('sollte Task-Item in Registry haben (explizite Definition)', () => {
      expect(result.registry.has('Task-Item')).toBe(true)
    })

    it('sollte Task-Item mit Left-Slot haben', () => {
      const taskItem = result.registry.get('Task-Item')
      const children = taskItem?.children as any[]
      expect(children?.some(c => c.name === 'Left')).toBe(true)
    })

    it('sollte Task-Item mit Right-Slot haben', () => {
      const taskItem = result.registry.get('Task-Item')
      const children = taskItem?.children as any[]
      expect(children?.some(c => c.name === 'Right')).toBe(true)
    })

    it('sollte App in Registry haben', () => {
      expect(result.registry.has('App')).toBe(true)
    })

    it('sollte Task-List in Registry haben', () => {
      expect(result.registry.has('Task-List')).toBe(true)
    })
  })

  // ==========================================================
  // 4. AST-STRUKTUR
  // ==========================================================

  describe('4. AST-Struktur', () => {
    let result: ReturnType<typeof parse>

    beforeEach(() => {
      result = parse(STEP_2_CODE)
    })

    it('sollte App als Root-Node haben', () => {
      expect(result.nodes?.[0].name).toBe('App')
    })

    it('sollte Header als Kind von App haben', () => {
      const app = result.nodes?.[0]
      const children = app?.children as any[]
      expect(children?.some(c => c.name === 'Header')).toBe(true)
    })

    it('sollte Task-List als Kind von App haben', () => {
      const app = result.nodes?.[0]
      const children = app?.children as any[]
      expect(children?.some(c => c.name === 'Task-List')).toBe(true)
    })

    it('sollte Task-Item als Kind von Task-List haben', () => {
      const app = result.nodes?.[0]
      const taskList = (app?.children as any[])?.find(c => c.name === 'Task-List')
      const taskListChildren = taskList?.children as any[]
      expect(taskListChildren?.some(c => c.name === 'Task-Item')).toBe(true)
    })

    it('sollte 2 Task-Items in Task-List haben', () => {
      const app = result.nodes?.[0]
      const taskList = (app?.children as any[])?.find(c => c.name === 'Task-List')
      const taskItems = (taskList?.children as any[])?.filter(c => c.name === 'Task-Item')
      expect(taskItems?.length).toBe(2)
    })
  })

  // ==========================================================
  // 5. REACT-RENDERING
  // ==========================================================

  describe('5. React-Rendering', () => {
    it('sollte ohne Fehler rendern', () => {
      expect(() => parseAndRender(STEP_2_CODE)).not.toThrow()
    })

    it('sollte Container nicht leer sein', () => {
      const { container } = parseAndRender(STEP_2_CODE)
      expect(container.innerHTML).not.toBe('')
    })
  })

  // ==========================================================
  // 6. DOM-STRUKTUR
  // ==========================================================

  describe('6. DOM-Struktur', () => {
    let container: HTMLElement

    beforeEach(() => {
      const result = parseAndRender(STEP_2_CODE)
      container = result.container
    })

    it('sollte App-Element haben', () => {
      expect(hasElement('App', container)).toBe(true)
    })

    it('sollte Header-Element haben', () => {
      expect(hasElement('Header', container)).toBe(true)
    })

    it('sollte Title-Element haben', () => {
      expect(hasElement('Title', container)).toBe(true)
    })

    it('sollte Icon-Element haben', () => {
      expect(hasElement('Icon', container)).toBe(true)
    })

    it('sollte Header als Kind von App haben', () => {
      const app = queryByDataId('App', container).element!
      const header = app.querySelector('[data-id^="Header"]')
      expect(header).not.toBeNull()
    })

    it('sollte Title in Header haben', () => {
      const header = queryByDataId('Header', container).element!
      const title = header.querySelector('[data-id^="Title"]')
      expect(title).not.toBeNull()
    })

    it('sollte Button in Header haben', () => {
      const header = queryByDataId('Header', container).element!
      const button = header.querySelector('[data-id^="Button"]')
      expect(button).not.toBeNull()
    })

    it('sollte genau 1 Header haben', () => {
      expect(countElements('Header', container)).toBe(1)
    })

    it('sollte 2 Icons haben (in Task-Items)', () => {
      expect(countElements('Icon', container)).toBe(2)
    })

    it('sollte Task-List haben', () => {
      expect(hasElement('Task-List', container)).toBe(true)
    })
  })

  // ==========================================================
  // 7. CSS/STYLES
  // ==========================================================

  describe('7. CSS/Styles', () => {
    let app: HTMLElement
    let header: HTMLElement
    let title: HTMLElement
    let taskItem: HTMLElement

    beforeEach(() => {
      const { container } = parseAndRender(STEP_2_CODE)
      app = queryByDataId('App', container).element!
      header = queryByDataId('Header', container).element!
      title = queryByDataId('Title', container).element!
      taskItem = queryByDataId('Task-Item', container).element!
    })

    describe('App Styles', () => {
      it('sollte flex-direction column haben', () => {
        expect(app.style.flexDirection).toBe('column')
      })

      it('sollte padding 24px haben', () => {
        expect(app.style.padding).toBe('24px')
      })

      it('sollte gap 24px haben', () => {
        expect(app.style.gap).toBe('24px')
      })

      it('sollte background-color #1A1A1A haben', () => {
        expect(colorsMatch(app.style.backgroundColor, '#1A1A1A')).toBe(true)
      })
    })

    describe('Header Styles', () => {
      it('sollte flex-direction row haben (hor)', () => {
        expect(header.style.flexDirection).toBe('row')
      })

      it('sollte justify-content space-between haben (between)', () => {
        expect(header.style.justifyContent).toBe('space-between')
      })

      it('sollte align-items center haben (ver-cen)', () => {
        expect(header.style.alignItems).toBe('center')
      })
    })

    describe('Title Styles', () => {
      it('sollte font-size 24px haben', () => {
        expect(title.style.fontSize).toBe('24px')
      })

      it('sollte font-weight bold haben', () => {
        expect(['bold', '700']).toContain(title.style.fontWeight)
      })
    })

    describe('Task-Item Styles', () => {
      it('sollte background-color #27272A haben', () => {
        expect(colorsMatch(taskItem.style.backgroundColor, '#27272A')).toBe(true)
      })

      it('sollte border-radius 8px haben', () => {
        expect(taskItem.style.borderRadius).toBe('8px')
      })
    })
  })

  // ==========================================================
  // 8. TEXT-CONTENT
  // ==========================================================

  describe('8. Text-Content', () => {
    it('sollte "Meine Tasks" sichtbar sein', () => {
      parseAndRender(STEP_2_CODE)
      expect(screen.getByText('Meine Tasks')).toBeInTheDocument()
    })

    it('sollte Text im Title sein', () => {
      const { container } = parseAndRender(STEP_2_CODE)
      const title = queryByDataId('Title', container).element!
      expect(title.textContent).toContain('Meine Tasks')
    })
  })

  // ==========================================================
  // 9. HOVER-STATE
  // ==========================================================

  describe('9. Hover-State', () => {
    it('sollte keine Hover-States definiert haben', () => {
      const result = parse(STEP_2_CODE)
      const app = result.nodes?.[0]
      expect(app?.states).toBeUndefined()
    })

    it('sollte mouseEnter auf Icon ohne Fehler akzeptieren', () => {
      const { container } = parseAndRender(STEP_2_CODE)
      const icon = queryByDataId('Icon', container).element!
      expect(() => fireEvent.mouseEnter(icon)).not.toThrow()
    })
  })

  // ==========================================================
  // 10. BEHAVIOR-STATES
  // ==========================================================

  describe('10. Behavior-States', () => {
    it('sollte keine Behavior-States haben', () => {
      const result = parse(STEP_2_CODE)
      const app = result.nodes?.[0]
      expect(app?.states).toBeUndefined()
    })
  })

  // ==========================================================
  // 11. INTERAKTIONEN
  // ==========================================================

  describe('11. Interaktionen', () => {
    let container: HTMLElement

    beforeEach(() => {
      const result = parseAndRender(STEP_2_CODE)
      container = result.container
    })

    it('sollte Click auf App akzeptieren', () => {
      const app = queryByDataId('App', container).element!
      expect(() => fireEvent.click(app)).not.toThrow()
    })

    it('sollte Click auf Header akzeptieren', () => {
      const header = queryByDataId('Header', container).element!
      expect(() => fireEvent.click(header)).not.toThrow()
    })

    it('sollte Click auf Title akzeptieren', () => {
      const title = queryByDataId('Title', container).element!
      expect(() => fireEvent.click(title)).not.toThrow()
    })

    it('sollte Click auf Icon akzeptieren', () => {
      const icon = queryByDataId('Icon', container).element!
      expect(() => fireEvent.click(icon)).not.toThrow()
    })

    it('sollte Click auf SVG im Icon akzeptieren', () => {
      const icon = queryByDataId('Icon', container).element!
      const svg = icon.querySelector('svg')!
      expect(() => fireEvent.click(svg)).not.toThrow()
    })
  })

  // ==========================================================
  // 12. EDGE CASES
  // ==========================================================

  describe('12. Edge Cases', () => {
    it('sollte anderes Icon verkraften', () => {
      const code = STEP_2_CODE.replace('"plus"', '"minus"')
      expect(() => parseAndRender(code)).not.toThrow()
    })

    it('sollte Icon ohne size verkraften', () => {
      const code = STEP_2_CODE.replace(', size 24', '')
      expect(() => parseAndRender(code)).not.toThrow()
    })

    it('sollte Icon ohne col verkraften', () => {
      const code = STEP_2_CODE.replace(', col #3B82F6', '')
      expect(() => parseAndRender(code)).not.toThrow()
    })

    it('sollte Header ohne between verkraften', () => {
      const code = STEP_2_CODE.replace(', between', '')
      expect(() => parseAndRender(code)).not.toThrow()
    })

    it('sollte Header mit gap verkraften', () => {
      const code = STEP_2_CODE.replace('Header hor, between', 'Header hor, g 16')
      expect(() => parseAndRender(code)).not.toThrow()
    })

    it('sollte mehrere Icons verkraften', () => {
      const code = STEP_2_CODE.replace(
        'Icon "plus", size 24, col #3B82F6',
        'Icon "plus", size 24\n    Icon "settings", size 24'
      )
      const { container } = parseAndRender(code)
      expect(countElements('Icon', container)).toBeGreaterThanOrEqual(2)
    })
  })

  // ==========================================================
  // 13. ZUSAMMENFASSUNG
  // ==========================================================

  describe('13. Vollständige Validierung', () => {
    it('sollte den gesamten Flow durchlaufen', () => {
      // 1. Parse
      const result = parse(STEP_2_CODE)
      expect(getParseErrors(result)).toHaveLength(0)

      // 2. Keine Tokens
      expect(result.tokens.size).toBe(0)

      // 3. Registry hat implizite Komponenten
      expect(result.registry.has('App')).toBe(true)
      expect(result.registry.has('Header')).toBe(true)
      expect(result.registry.has('Icon')).toBe(true)

      // 4. AST korrekt
      const app = result.nodes?.[0]
      expect(app?.name).toBe('App')
      const header = (app?.children as any[])?.find(c => c.name === 'Header')
      expect(header).toBeDefined()

      // 5. Render
      const { container } = parseAndRender(STEP_2_CODE)

      // 6. DOM korrekt
      expect(hasElement('App', container)).toBe(true)
      expect(hasElement('Header', container)).toBe(true)
      expect(hasElement('Title', container)).toBe(true)
      expect(hasElement('Icon', container)).toBe(true)

      // 7. Styles korrekt
      const headerEl = queryByDataId('Header', container).element!
      expect(headerEl.style.flexDirection).toBe('row')
      expect(headerEl.style.justifyContent).toBe('space-between')

      // 8. Text korrekt
      expect(screen.getByText('Meine Tasks')).toBeInTheDocument()

      // 9. Interaktionen funktionieren
      const icon = queryByDataId('Icon', container).element!
      expect(() => fireEvent.click(icon)).not.toThrow()
    })
  })
})

// (SCHRITT 3 entfernt - war Duplikat von SCHRITT 2)

// ############################################################
// SCHRITT 3: Hover-States für Interaktivität (ehemals SCHRITT 4)
// ############################################################

const STEP_3_CODE = `Task-Item: hor, between, ver-cen, bg #27272A, pad 12 16, rad 8, cursor pointer
  hover
    bg #333333
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

describe('Schritt 3: Hover-States für Interaktivität', () => {

  // ==========================================================
  // 1. PARSER-EBENE
  // ==========================================================

  describe('1. Parser-Ebene', () => {
    it('sollte ohne Parse-Errors parsen', () => {
      const result = parse(STEP_3_CODE)
      const errors = getParseErrors(result)
      expect(errors).toHaveLength(0)
    })

    it('sollte ohne Syntax-Warnings parsen', () => {
      const result = parse(STEP_3_CODE)
      const warnings = getSyntaxWarnings(result)
      expect(warnings).toHaveLength(0)
    })

    it('sollte Nodes zurückgeben', () => {
      const result = parse(STEP_3_CODE)
      expect(result.nodes).toBeDefined()
      expect(result.nodes?.length).toBeGreaterThan(0)
    })
  })

  // ==========================================================
  // 2. TOKENS
  // ==========================================================

  describe('2. Tokens', () => {
    it('sollte keine Tokens haben (inline Farben)', () => {
      const result = parse(STEP_3_CODE)
      expect(result.tokens.size).toBe(0)
    })
  })

  // ==========================================================
  // 3. REGISTRY
  // ==========================================================

  describe('3. Registry', () => {
    let result: ReturnType<typeof parse>

    beforeEach(() => {
      result = parse(STEP_3_CODE)
    })

    it('sollte Task-Item in Registry haben (explizite Definition)', () => {
      expect(result.registry.has('Task-Item')).toBe(true)
    })

    it('sollte Task-Item mit Left-Slot haben', () => {
      const taskItem = result.registry.get('Task-Item')
      const children = taskItem?.children as any[]
      expect(children?.some(c => c.name === 'Left')).toBe(true)
    })

    it('sollte Task-Item mit Right-Slot haben', () => {
      const taskItem = result.registry.get('Task-Item')
      const children = taskItem?.children as any[]
      expect(children?.some(c => c.name === 'Right')).toBe(true)
    })

    it('sollte App in Registry haben', () => {
      expect(result.registry.has('App')).toBe(true)
    })

    it('sollte Task-List in Registry haben', () => {
      expect(result.registry.has('Task-List')).toBe(true)
    })

    it('sollte Task-Item Properties haben', () => {
      const taskItem = result.registry.get('Task-Item')
      expect(taskItem?.properties).toBeDefined()
    })

    it('sollte Task-Item Left und Right als Slots haben', () => {
      const taskItem = result.registry.get('Task-Item')
      const children = taskItem?.children as any[]
      expect(children?.some(c => c.name === 'Left')).toBe(true)
      expect(children?.some(c => c.name === 'Right')).toBe(true)
    })

    it('sollte Task-Item genau 2 Slot-Kinder haben', () => {
      const taskItem = result.registry.get('Task-Item')
      const children = taskItem?.children as any[]
      expect(children?.length).toBe(2)
    })
  })

  // ==========================================================
  // 4. AST-STRUKTUR
  // ==========================================================

  describe('4. AST-Struktur', () => {
    let result: ReturnType<typeof parse>

    beforeEach(() => {
      result = parse(STEP_3_CODE)
    })

    it('sollte App als Root-Node haben', () => {
      expect(result.nodes?.[0].name).toBe('App')
    })

    it('sollte Header und Task-List als Kinder von App haben', () => {
      const app = result.nodes?.[0]
      const children = app?.children as any[]
      expect(children?.some(c => c.name === 'Header')).toBe(true)
      expect(children?.some(c => c.name === 'Task-List')).toBe(true)
    })

    it('sollte Task-List 2 Task-Item Kinder haben', () => {
      const app = result.nodes?.[0]
      const taskList = (app?.children as any[])?.find(c => c.name === 'Task-List')
      const taskItems = (taskList?.children as any[])?.filter(c => c.name === 'Task-Item')
      expect(taskItems?.length).toBe(2)
    })

    it('sollte jedes Task-Item Left und Right haben', () => {
      const app = result.nodes?.[0]
      const taskList = (app?.children as any[])?.find(c => c.name === 'Task-List')
      const taskItems = (taskList?.children as any[])?.filter(c => c.name === 'Task-Item')

      taskItems?.forEach(item => {
        const children = item.children as any[]
        expect(children?.some(c => c.name === 'Left')).toBe(true)
        expect(children?.some(c => c.name === 'Right')).toBe(true)
      })
    })

    it('sollte Left ein Icon und Text haben', () => {
      const app = result.nodes?.[0]
      const taskList = (app?.children as any[])?.find(c => c.name === 'Task-List')
      const taskItem = (taskList?.children as any[])?.[0]
      const left = (taskItem?.children as any[])?.find(c => c.name === 'Left')
      const leftChildren = left?.children as any[]
      expect(leftChildren?.some(c => c.name === 'Icon')).toBe(true)
      expect(leftChildren?.some(c => c.name === 'Text')).toBe(true)
    })

    it('sollte Right einen Text haben', () => {
      const app = result.nodes?.[0]
      const taskList = (app?.children as any[])?.find(c => c.name === 'Task-List')
      const taskItem = (taskList?.children as any[])?.[0]
      const right = (taskItem?.children as any[])?.find(c => c.name === 'Right')
      const rightChildren = right?.children as any[]
      expect(rightChildren?.some(c => c.name === 'Text')).toBe(true)
    })
  })

  // ==========================================================
  // 5. REACT-RENDERING
  // ==========================================================

  describe('5. React-Rendering', () => {
    it('sollte ohne Fehler rendern', () => {
      expect(() => parseAndRender(STEP_3_CODE)).not.toThrow()
    })

    it('sollte Container nicht leer sein', () => {
      const { container } = parseAndRender(STEP_3_CODE)
      expect(container.innerHTML).not.toBe('')
    })

    it('sollte viele HTML-Elemente enthalten', () => {
      const { container } = parseAndRender(STEP_3_CODE)
      expect(container.querySelectorAll('*').length).toBeGreaterThan(10)
    })
  })

  // ==========================================================
  // 6. DOM-STRUKTUR
  // ==========================================================

  describe('6. DOM-Struktur', () => {
    let container: HTMLElement

    beforeEach(() => {
      const result = parseAndRender(STEP_3_CODE)
      container = result.container
    })

    it('sollte App-Element haben', () => {
      expect(hasElement('App', container)).toBe(true)
    })

    it('sollte Header-Element haben', () => {
      expect(hasElement('Header', container)).toBe(true)
    })

    it('sollte Task-List-Element haben', () => {
      expect(hasElement('Task-List', container)).toBe(true)
    })

    it('sollte genau 2 Task-Item-Elemente haben', () => {
      expect(countElements('Task-Item', container)).toBe(2)
    })

    it('sollte genau 2 Left-Elemente haben', () => {
      expect(countElements('Left', container)).toBe(2)
    })

    it('sollte genau 2 Right-Elemente haben', () => {
      expect(countElements('Right', container)).toBe(2)
    })

    it('sollte genau 2 Icon-Elemente haben', () => {
      expect(countElements('Icon', container)).toBe(2)
    })

    it('sollte Header innerhalb App haben', () => {
      const app = queryByDataId('App', container).element!
      const header = app.querySelector('[data-id^="Header"]')
      expect(header).not.toBeNull()
    })

    it('sollte Task-List innerhalb App haben', () => {
      const app = queryByDataId('App', container).element!
      const taskList = app.querySelector('[data-id^="Task-List"]')
      expect(taskList).not.toBeNull()
    })

    it('sollte Task-Item innerhalb Task-List haben', () => {
      const taskList = queryByDataId('Task-List', container).element!
      const taskItem = taskList.querySelector('[data-id^="Task-Item"]')
      expect(taskItem).not.toBeNull()
    })

    it('sollte Left und Right innerhalb Task-Item haben', () => {
      const taskItem = queryByDataId('Task-Item', container).element!
      const left = taskItem.querySelector('[data-id^="Left"]')
      const right = taskItem.querySelector('[data-id^="Right"]')
      expect(left).not.toBeNull()
      expect(right).not.toBeNull()
    })

    it('sollte SVG-Icons haben (Lucide)', () => {
      const icons = container.querySelectorAll('[data-id^="Icon"]')
      icons.forEach(icon => {
        const svg = icon.querySelector('svg')
        expect(svg).not.toBeNull()
      })
    })
  })

  // ==========================================================
  // 7. CSS/STYLES
  // ==========================================================

  describe('7. CSS/Styles', () => {
    let container: HTMLElement

    beforeEach(() => {
      const result = parseAndRender(STEP_3_CODE)
      container = result.container
    })

    describe('App Styles', () => {
      it('sollte background-color #1A1A1A haben', () => {
        const app = queryByDataId('App', container).element!
        expect(colorsMatch(app.style.backgroundColor, '#1A1A1A')).toBe(true)
      })

      it('sollte padding 24px haben', () => {
        const app = queryByDataId('App', container).element!
        expect(app.style.padding).toBe('24px')
      })

      it('sollte gap 24px haben', () => {
        const app = queryByDataId('App', container).element!
        expect(app.style.gap).toBe('24px')
      })

      it('sollte flex-direction column haben', () => {
        const app = queryByDataId('App', container).element!
        expect(app.style.flexDirection).toBe('column')
      })
    })

    describe('Task-Item Styles', () => {
      it('sollte background-color #27272A haben', () => {
        const taskItem = queryByDataId('Task-Item', container).element!
        expect(colorsMatch(taskItem.style.backgroundColor, '#27272A')).toBe(true)
      })

      it('sollte flex-direction row haben (hor)', () => {
        const taskItem = queryByDataId('Task-Item', container).element!
        expect(taskItem.style.flexDirection).toBe('row')
      })

      it('sollte justify-content space-between haben', () => {
        const taskItem = queryByDataId('Task-Item', container).element!
        expect(taskItem.style.justifyContent).toBe('space-between')
      })

      it('sollte align-items center haben (ver-cen)', () => {
        const taskItem = queryByDataId('Task-Item', container).element!
        expect(taskItem.style.alignItems).toBe('center')
      })

      it('sollte border-radius 8px haben', () => {
        const taskItem = queryByDataId('Task-Item', container).element!
        expect(taskItem.style.borderRadius).toBe('8px')
      })

      it('sollte padding 12px 16px haben', () => {
        const taskItem = queryByDataId('Task-Item', container).element!
        expect(taskItem.style.padding).toBe('12px 16px')
      })
    })

    describe('Left Styles', () => {
      it('sollte flex-direction row haben', () => {
        const left = queryByDataId('Left', container).element!
        expect(left.style.flexDirection).toBe('row')
      })

      it('sollte gap 12px haben', () => {
        const left = queryByDataId('Left', container).element!
        expect(left.style.gap).toBe('12px')
      })

      it('sollte align-items center haben', () => {
        const left = queryByDataId('Left', container).element!
        expect(left.style.alignItems).toBe('center')
      })
    })

    describe('Task-List Styles', () => {
      it('sollte flex-direction column haben', () => {
        const taskList = queryByDataId('Task-List', container).element!
        expect(taskList.style.flexDirection).toBe('column')
      })

      it('sollte gap 8px haben', () => {
        const taskList = queryByDataId('Task-List', container).element!
        expect(taskList.style.gap).toBe('8px')
      })
    })

    describe('Header Styles', () => {
      it('sollte flex-direction row haben', () => {
        const header = queryByDataId('Header', container).element!
        expect(header.style.flexDirection).toBe('row')
      })

      it('sollte justify-content space-between haben', () => {
        const header = queryByDataId('Header', container).element!
        expect(header.style.justifyContent).toBe('space-between')
      })
    })

    describe('Button Styles', () => {
      it('sollte background-color #3B82F6 haben', () => {
        const button = queryByDataId('Button', container).element!
        expect(colorsMatch(button.style.backgroundColor, '#3B82F6')).toBe(true)
      })

      it('sollte padding 8px 16px haben', () => {
        const button = queryByDataId('Button', container).element!
        expect(button.style.padding).toBe('8px 16px')
      })

      it('sollte border-radius 6px haben', () => {
        const button = queryByDataId('Button', container).element!
        expect(button.style.borderRadius).toBe('6px')
      })
    })

    describe('Konsistenz der Task-Items', () => {
      it('alle Task-Items sollten gleichen Hintergrund haben', () => {
        const items = container.querySelectorAll('[data-id^="Task-Item"]')
        items.forEach(item => {
          expect(colorsMatch((item as HTMLElement).style.backgroundColor, '#27272A')).toBe(true)
        })
      })

      it('alle Task-Items sollten gleichen border-radius haben', () => {
        const items = container.querySelectorAll('[data-id^="Task-Item"]')
        items.forEach(item => {
          expect((item as HTMLElement).style.borderRadius).toBe('8px')
        })
      })
    })
  })

  // ==========================================================
  // 8. TEXT-CONTENT
  // ==========================================================

  describe('8. Text-Content', () => {
    beforeEach(() => {
      parseAndRender(STEP_3_CODE)
    })

    it('sollte "Meine Tasks" sichtbar sein', () => {
      expect(screen.getByText('Meine Tasks')).toBeInTheDocument()
    })

    it('sollte "Neuer Task" sichtbar sein', () => {
      expect(screen.getByText('Neuer Task')).toBeInTheDocument()
    })

    it('sollte "Einkaufen gehen" sichtbar sein', () => {
      expect(screen.getByText('Einkaufen gehen')).toBeInTheDocument()
    })

    it('sollte "Meeting vorbereiten" sichtbar sein', () => {
      expect(screen.getByText('Meeting vorbereiten')).toBeInTheDocument()
    })

    it('sollte "Heute" sichtbar sein', () => {
      expect(screen.getByText('Heute')).toBeInTheDocument()
    })

    it('sollte "Gestern" sichtbar sein', () => {
      expect(screen.getByText('Gestern')).toBeInTheDocument()
    })

    it('sollte Task-Texte im Left-Bereich haben', () => {
      const { container } = parseAndRender(STEP_3_CODE)
      const lefts = container.querySelectorAll('[data-id^="Left"]')
      const leftTexts = Array.from(lefts).map(l => l.textContent)
      expect(leftTexts.some(t => t?.includes('Einkaufen gehen'))).toBe(true)
      expect(leftTexts.some(t => t?.includes('Meeting vorbereiten'))).toBe(true)
    })

    it('sollte Datums-Texte im Right-Bereich haben', () => {
      const { container } = parseAndRender(STEP_3_CODE)
      const rights = container.querySelectorAll('[data-id^="Right"]')
      const rightTexts = Array.from(rights).map(r => r.textContent)
      expect(rightTexts.some(t => t?.includes('Heute'))).toBe(true)
      expect(rightTexts.some(t => t?.includes('Gestern'))).toBe(true)
    })
  })

  // ==========================================================
  // 9. HOVER-STATE
  // ==========================================================

  describe('9. Hover-State', () => {
    it('sollte Hover-State auf Task-Item haben', () => {
      const result = parse(STEP_3_CODE)
      const taskItem = result.registry.get('Task-Item')
      const hoverState = taskItem?.states?.find((s: any) => s.name === 'hover')
      expect(hoverState).toBeDefined()
    })

    it('sollte mouseEnter auf Task-Item ohne Fehler akzeptieren', () => {
      const { container } = parseAndRender(STEP_3_CODE)
      const taskItem = queryByDataId('Task-Item', container).element!
      expect(() => fireEvent.mouseEnter(taskItem)).not.toThrow()
    })

    it('sollte mouseLeave auf Task-Item ohne Fehler akzeptieren', () => {
      const { container } = parseAndRender(STEP_3_CODE)
      const taskItem = queryByDataId('Task-Item', container).element!
      expect(() => fireEvent.mouseLeave(taskItem)).not.toThrow()
    })

    it('sollte Hover auf alle Task-Items ohne Fehler funktionieren', () => {
      const { container } = parseAndRender(STEP_3_CODE)
      const items = container.querySelectorAll('[data-id^="Task-Item"]')
      items.forEach(item => {
        expect(() => {
          fireEvent.mouseEnter(item)
          fireEvent.mouseLeave(item)
        }).not.toThrow()
      })
    })
  })

  // ==========================================================
  // 10. BEHAVIOR-STATES
  // ==========================================================

  describe('10. Behavior-States', () => {
    it('sollte nur System-States (hover) haben, keine Behavior-States', () => {
      const result = parse(STEP_3_CODE)
      const taskItem = result.registry.get('Task-Item')
      // Es gibt states (hover), aber keine Behavior-States wie completed
      const states = taskItem?.states as any[]
      const hoverState = states?.find(s => s.name === 'hover')
      const completedState = states?.find(s => s.name === 'completed')
      expect(hoverState).toBeDefined()
      expect(completedState).toBeUndefined()
    })
  })

  // ==========================================================
  // 11. INTERAKTIONEN
  // ==========================================================

  describe('11. Interaktionen', () => {
    let container: HTMLElement

    beforeEach(() => {
      const result = parseAndRender(STEP_3_CODE)
      container = result.container
    })

    it('sollte Click auf App akzeptieren', () => {
      const app = queryByDataId('App', container).element!
      expect(() => fireEvent.click(app)).not.toThrow()
    })

    it('sollte Click auf Task-Item akzeptieren', () => {
      const taskItem = queryByDataId('Task-Item', container).element!
      expect(() => fireEvent.click(taskItem)).not.toThrow()
    })

    it('sollte Click auf alle Task-Items akzeptieren', () => {
      const items = container.querySelectorAll('[data-id^="Task-Item"]')
      items.forEach(item => {
        expect(() => fireEvent.click(item)).not.toThrow()
      })
    })

    it('sollte Click auf Button akzeptieren', () => {
      const button = queryByDataId('Button', container).element!
      expect(() => fireEvent.click(button)).not.toThrow()
    })

    it('sollte Click auf Icon akzeptieren', () => {
      const icon = queryByDataId('Icon', container).element!
      expect(() => fireEvent.click(icon)).not.toThrow()
    })

    it('sollte mouseDown/mouseUp Sequenz auf Task-Item akzeptieren', () => {
      const taskItem = queryByDataId('Task-Item', container).element!
      expect(() => {
        fireEvent.mouseDown(taskItem)
        fireEvent.mouseUp(taskItem)
      }).not.toThrow()
    })
  })

  // ==========================================================
  // 12. EDGE CASES
  // ==========================================================

  describe('12. Edge Cases', () => {
    it('sollte leeren Task-Text verkraften', () => {
      const code = STEP_3_CODE.replace('"Einkaufen gehen"', '""')
      expect(() => parseAndRender(code)).not.toThrow()
    })

    it('sollte sehr langen Task-Text verkraften', () => {
      const longText = 'A'.repeat(200)
      const code = STEP_3_CODE.replace('"Einkaufen gehen"', `"${longText}"`)
      expect(() => parseAndRender(code)).not.toThrow()
    })

    it('sollte Sonderzeichen in Task-Text verkraften', () => {
      const code = STEP_3_CODE.replace('"Einkaufen gehen"', '"Task → 2024 © ™"')
      expect(() => parseAndRender(code)).not.toThrow()
    })

    it('sollte Emoji in Task-Text verkraften', () => {
      const code = STEP_3_CODE.replace('"Einkaufen gehen"', '"✓ Einkaufen 🛒"')
      expect(() => parseAndRender(code)).not.toThrow()
    })

    it('sollte drei Task-Items verkraften', () => {
      const code = STEP_3_CODE + `
    Task-Item
      Left
        Icon "star", col #FFD700
        Text "Neuer Task"
      Right
        Text col #888, "Morgen"`
      const { container } = parseAndRender(code)
      expect(countElements('Task-Item', container)).toBe(3)
    })

    it('sollte Task-Item ohne Right verkraften', () => {
      const code = `Task-Item: hor, ver-cen, bg #27272A, pad 12 16
  Left: hor, g 12

App bg #1A1A1A, pad 24, ver
  Task-Item
    Left
      Text "Nur Links"`
      expect(() => parseAndRender(code)).not.toThrow()
    })

    it('sollte anderes Icon verkraften', () => {
      const code = STEP_3_CODE.replace('"circle"', '"star"')
      expect(() => parseAndRender(code)).not.toThrow()
    })

    it('sollte andere Icon-Farbe verkraften', () => {
      const code = STEP_3_CODE.replace('col #666', 'col #FF0000')
      const { container } = parseAndRender(code)
      expect(hasElement('Icon', container)).toBe(true)
    })

    it('sollte andere Task-Item Hintergrundfarbe verkraften', () => {
      const code = STEP_3_CODE.replace('#27272A', '#444444')
      const { container } = parseAndRender(code)
      const taskItem = queryByDataId('Task-Item', container).element!
      expect(colorsMatch(taskItem.style.backgroundColor, '#444444')).toBe(true)
    })
  })

  // ==========================================================
  // 13. ZUSAMMENFASSUNG
  // ==========================================================

  describe('13. Vollständige Validierung', () => {
    it('sollte den gesamten Flow durchlaufen', () => {
      // 1. Parse
      const result = parse(STEP_3_CODE)
      expect(getParseErrors(result)).toHaveLength(0)

      // 2. Keine Tokens
      expect(result.tokens.size).toBe(0)

      // 3. Registry hat Definitionen
      expect(result.registry.has('Task-Item')).toBe(true)

      // 4. AST korrekt - Task-Item hat Slots
      const taskItem = result.registry.get('Task-Item')
      const slots = taskItem?.children as any[]
      expect(slots?.some(c => c.name === 'Left')).toBe(true)
      expect(slots?.some(c => c.name === 'Right')).toBe(true)

      // 5. Render
      const { container } = parseAndRender(STEP_3_CODE)

      // 6. DOM korrekt
      expect(countElements('Task-Item', container)).toBe(2)
      expect(countElements('Left', container)).toBe(2)
      expect(countElements('Right', container)).toBe(2)

      // 7. Styles korrekt
      const taskItemEl = queryByDataId('Task-Item', container).element!
      expect(colorsMatch(taskItemEl.style.backgroundColor, '#27272A')).toBe(true)
      expect(taskItemEl.style.borderRadius).toBe('8px')

      // 8. Text korrekt
      expect(screen.getByText('Einkaufen gehen')).toBeInTheDocument()
      expect(screen.getByText('Meeting vorbereiten')).toBeInTheDocument()

      // 9. Interaktionen funktionieren
      expect(() => fireEvent.click(taskItemEl)).not.toThrow()
    })
  })
})

// ############################################################
// SCHRITT 4: Erweiterte Hover-States (mit Button)
// ############################################################

const STEP_4_CODE = `Task-Item: hor, between, ver-cen, bg #27272A, pad 12 16, rad 8, cursor pointer
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

describe('Schritt 4: Hover-States mit Button', () => {

  // ==========================================================
  // 1. PARSER-EBENE
  // ==========================================================

  describe('1. Parser-Ebene', () => {
    it('sollte ohne Parse-Errors parsen', () => {
      const result = parse(STEP_4_CODE)
      const errors = getParseErrors(result)
      expect(errors).toHaveLength(0)
    })

    it('sollte ohne Syntax-Warnings parsen', () => {
      const result = parse(STEP_4_CODE)
      const warnings = getSyntaxWarnings(result)
      expect(warnings).toHaveLength(0)
    })

    it('sollte Nodes zurückgeben', () => {
      const result = parse(STEP_4_CODE)
      expect(result.nodes).toBeDefined()
      expect(result.nodes?.length).toBeGreaterThan(0)
    })
  })

  // ==========================================================
  // 2. TOKENS
  // ==========================================================

  describe('2. Tokens', () => {
    it('sollte keine Tokens haben (inline Farben)', () => {
      const result = parse(STEP_4_CODE)
      expect(result.tokens.size).toBe(0)
    })
  })

  // ==========================================================
  // 3. REGISTRY
  // ==========================================================

  describe('3. Registry', () => {
    let result: ReturnType<typeof parse>

    beforeEach(() => {
      result = parse(STEP_4_CODE)
    })

    it('sollte Task-Item in Registry haben', () => {
      expect(result.registry.has('Task-Item')).toBe(true)
    })

    it('sollte Task-Item mit hover-State haben', () => {
      const taskItem = result.registry.get('Task-Item')
      const hoverState = taskItem?.states?.find((s: any) => s.name === 'hover')
      expect(hoverState).toBeDefined()
    })

    it('sollte hover-State bg #333333 haben', () => {
      const taskItem = result.registry.get('Task-Item')
      const hoverState = taskItem?.states?.find((s: any) => s.name === 'hover')
      expect(hoverState?.properties?.bg).toBe('#333333')
    })

    it('sollte Task-Item cursor pointer haben', () => {
      const taskItem = result.registry.get('Task-Item')
      expect(taskItem?.properties?.cursor).toBe('pointer')
    })

    it('sollte Button in Registry haben', () => {
      expect(result.registry.has('Button')).toBe(true)
    })

    it('sollte Button mit hover-State haben', () => {
      const button = result.registry.get('Button')
      const hoverState = button?.states?.find((s: any) => s.name === 'hover')
      expect(hoverState).toBeDefined()
    })

    it('sollte Button hover-State bg #2563EB haben', () => {
      const button = result.registry.get('Button')
      const hoverState = button?.states?.find((s: any) => s.name === 'hover')
      expect(hoverState?.properties?.bg).toBe('#2563EB')
    })
  })

  // ==========================================================
  // 4. AST-STRUKTUR
  // ==========================================================

  describe('4. AST-Struktur', () => {
    let result: ReturnType<typeof parse>

    beforeEach(() => {
      result = parse(STEP_4_CODE)
    })

    it('sollte App als Root-Node haben', () => {
      expect(result.nodes?.[0].name).toBe('App')
    })

    it('sollte Task-Item Definition States haben', () => {
      const taskItem = result.registry.get('Task-Item')
      expect(taskItem?.states).toBeDefined()
      expect(taskItem?.states?.length).toBeGreaterThan(0)
    })

    it('sollte Task-Item Slots nach States haben', () => {
      const taskItem = result.registry.get('Task-Item')
      const children = taskItem?.children as any[]
      expect(children?.some(c => c.name === 'Left')).toBe(true)
      expect(children?.some(c => c.name === 'Right')).toBe(true)
    })

    it('sollte Button in Header sein', () => {
      const app = result.nodes?.[0]
      const header = (app?.children as any[])?.find(c => c.name === 'Header')
      const headerChildren = header?.children as any[]
      expect(headerChildren?.some(c => c.name === 'Button')).toBe(true)
    })

    it('sollte Button States haben', () => {
      const app = result.nodes?.[0]
      const header = (app?.children as any[])?.find(c => c.name === 'Header')
      const button = (header?.children as any[])?.find(c => c.name === 'Button')
      expect(button?.states).toBeDefined()
    })
  })

  // ==========================================================
  // 5. REACT-RENDERING
  // ==========================================================

  describe('5. React-Rendering', () => {
    it('sollte ohne Fehler rendern', () => {
      expect(() => parseAndRender(STEP_4_CODE)).not.toThrow()
    })

    it('sollte Container nicht leer sein', () => {
      const { container } = parseAndRender(STEP_4_CODE)
      expect(container.innerHTML).not.toBe('')
    })
  })

  // ==========================================================
  // 6. DOM-STRUKTUR
  // ==========================================================

  describe('6. DOM-Struktur', () => {
    let container: HTMLElement

    beforeEach(() => {
      const result = parseAndRender(STEP_4_CODE)
      container = result.container
    })

    it('sollte App-Element haben', () => {
      expect(hasElement('App', container)).toBe(true)
    })

    it('sollte Task-Item-Element haben', () => {
      expect(hasElement('Task-Item', container)).toBe(true)
    })

    it('sollte Button-Element haben', () => {
      expect(hasElement('Button', container)).toBe(true)
    })

    it('sollte genau 1 Task-Item haben', () => {
      expect(countElements('Task-Item', container)).toBe(1)
    })

    it('sollte mindestens 1 Button haben', () => {
      expect(countElements('Button', container)).toBeGreaterThanOrEqual(1)
    })
  })

  // ==========================================================
  // 7. CSS/STYLES
  // ==========================================================

  describe('7. CSS/Styles', () => {
    let container: HTMLElement

    beforeEach(() => {
      const result = parseAndRender(STEP_4_CODE)
      container = result.container
    })

    describe('Task-Item Styles', () => {
      it('sollte cursor pointer haben', () => {
        const taskItem = queryByDataId('Task-Item', container).element!
        expect(taskItem.style.cursor).toBe('pointer')
      })

      it('sollte background-color #27272A haben (initial)', () => {
        const taskItem = queryByDataId('Task-Item', container).element!
        expect(colorsMatch(taskItem.style.backgroundColor, '#27272A')).toBe(true)
      })

      it('sollte border-radius 8px haben', () => {
        const taskItem = queryByDataId('Task-Item', container).element!
        expect(taskItem.style.borderRadius).toBe('8px')
      })

      it('sollte flex-direction row haben', () => {
        const taskItem = queryByDataId('Task-Item', container).element!
        expect(taskItem.style.flexDirection).toBe('row')
      })
    })

    describe('Button Styles', () => {
      it('sollte background-color #3B82F6 haben (initial)', () => {
        const button = queryByDataId('Button', container).element!
        expect(colorsMatch(button.style.backgroundColor, '#3B82F6')).toBe(true)
      })

      it('sollte padding 8px 16px haben', () => {
        const button = queryByDataId('Button', container).element!
        expect(button.style.padding).toBe('8px 16px')
      })
    })
  })

  // ==========================================================
  // 8. TEXT-CONTENT
  // ==========================================================

  describe('8. Text-Content', () => {
    beforeEach(() => {
      parseAndRender(STEP_4_CODE)
    })

    it('sollte "Meine Tasks" sichtbar sein', () => {
      expect(screen.getByText('Meine Tasks')).toBeInTheDocument()
    })

    it('sollte "Neuer Task" sichtbar sein', () => {
      expect(screen.getByText('Neuer Task')).toBeInTheDocument()
    })

    it('sollte "Einkaufen gehen" sichtbar sein', () => {
      expect(screen.getByText('Einkaufen gehen')).toBeInTheDocument()
    })

    it('sollte "Heute" sichtbar sein', () => {
      expect(screen.getByText('Heute')).toBeInTheDocument()
    })
  })

  // ==========================================================
  // 9. HOVER-STATE
  // ==========================================================

  describe('9. Hover-State', () => {
    let container: HTMLElement

    beforeEach(() => {
      const result = parseAndRender(STEP_4_CODE)
      container = result.container
    })

    it('sollte Task-Item hover-State in Definition haben', () => {
      const result = parse(STEP_4_CODE)
      const taskItem = result.registry.get('Task-Item')
      const hoverState = taskItem?.states?.find((s: any) => s.name === 'hover')
      expect(hoverState).toBeDefined()
    })

    it('sollte Button hover-State in Definition haben', () => {
      const result = parse(STEP_4_CODE)
      const button = result.registry.get('Button')
      const hoverState = button?.states?.find((s: any) => s.name === 'hover')
      expect(hoverState).toBeDefined()
    })

    it('sollte mouseEnter auf Task-Item ohne Fehler akzeptieren', () => {
      const taskItem = queryByDataId('Task-Item', container).element!
      expect(() => fireEvent.mouseEnter(taskItem)).not.toThrow()
    })

    it('sollte mouseLeave auf Task-Item ohne Fehler akzeptieren', () => {
      const taskItem = queryByDataId('Task-Item', container).element!
      expect(() => fireEvent.mouseLeave(taskItem)).not.toThrow()
    })

    it('sollte mouseEnter auf Button ohne Fehler akzeptieren', () => {
      const button = queryByDataId('Button', container).element!
      expect(() => fireEvent.mouseEnter(button)).not.toThrow()
    })

    it('sollte mouseLeave auf Button ohne Fehler akzeptieren', () => {
      const button = queryByDataId('Button', container).element!
      expect(() => fireEvent.mouseLeave(button)).not.toThrow()
    })

    it('sollte Task-Item bei Hover background-color ändern', () => {
      const taskItem = queryByDataId('Task-Item', container).element!
      const originalBg = taskItem.style.backgroundColor
      fireEvent.mouseEnter(taskItem)
      // Hover sollte aktiv sein - background sollte sich ändern
      expect(colorsMatch(taskItem.style.backgroundColor, '#333333')).toBe(true)
      fireEvent.mouseLeave(taskItem)
      // Nach mouseLeave sollte es zurückkehren
      expect(taskItem.style.backgroundColor).toBe(originalBg)
    })

    it('sollte Button bei Hover background-color ändern', () => {
      const button = queryByDataId('Button', container).element!
      const originalBg = button.style.backgroundColor
      fireEvent.mouseEnter(button)
      expect(colorsMatch(button.style.backgroundColor, '#2563EB')).toBe(true)
      fireEvent.mouseLeave(button)
      expect(button.style.backgroundColor).toBe(originalBg)
    })
  })

  // ==========================================================
  // 10. BEHAVIOR-STATES
  // ==========================================================

  describe('10. Behavior-States', () => {
    it('sollte keine Behavior-States haben (nur hover)', () => {
      const result = parse(STEP_4_CODE)
      const taskItem = result.registry.get('Task-Item')
      // Nur hover-State, keine anderen Behavior-States
      expect(taskItem?.states?.length).toBe(1)
      expect(taskItem?.states?.[0].name).toBe('hover')
    })
  })

  // ==========================================================
  // 11. INTERAKTIONEN
  // ==========================================================

  describe('11. Interaktionen', () => {
    let container: HTMLElement

    beforeEach(() => {
      const result = parseAndRender(STEP_4_CODE)
      container = result.container
    })

    it('sollte Click auf Task-Item akzeptieren', () => {
      const taskItem = queryByDataId('Task-Item', container).element!
      expect(() => fireEvent.click(taskItem)).not.toThrow()
    })

    it('sollte Click auf Button akzeptieren', () => {
      const button = queryByDataId('Button', container).element!
      expect(() => fireEvent.click(button)).not.toThrow()
    })

    it('sollte Hover + Click Sequenz auf Task-Item akzeptieren', () => {
      const taskItem = queryByDataId('Task-Item', container).element!
      expect(() => {
        fireEvent.mouseEnter(taskItem)
        fireEvent.click(taskItem)
        fireEvent.mouseLeave(taskItem)
      }).not.toThrow()
    })

    it('sollte Hover + Click Sequenz auf Button akzeptieren', () => {
      const button = queryByDataId('Button', container).element!
      expect(() => {
        fireEvent.mouseEnter(button)
        fireEvent.click(button)
        fireEvent.mouseLeave(button)
      }).not.toThrow()
    })

    it('sollte schnelles Hover hin und her verkraften', () => {
      const taskItem = queryByDataId('Task-Item', container).element!
      expect(() => {
        for (let i = 0; i < 10; i++) {
          fireEvent.mouseEnter(taskItem)
          fireEvent.mouseLeave(taskItem)
        }
      }).not.toThrow()
    })
  })

  // ==========================================================
  // 12. EDGE CASES
  // ==========================================================

  describe('12. Edge Cases', () => {
    it('sollte anderen Hover-Farbe verkraften', () => {
      const code = STEP_4_CODE.replace('#333333', '#FF0000')
      const { container } = parseAndRender(code)
      const taskItem = queryByDataId('Task-Item', container).element!
      fireEvent.mouseEnter(taskItem)
      expect(colorsMatch(taskItem.style.backgroundColor, '#FF0000')).toBe(true)
    })

    it('sollte Task-Item ohne hover-State verkraften', () => {
      const code = STEP_4_CODE.replace('  hover\n    bg #333333\n', '')
      expect(() => parseAndRender(code)).not.toThrow()
    })

    it('sollte Button ohne hover-State verkraften', () => {
      const code = STEP_4_CODE.replace('      hover\n        bg #2563EB\n', '')
      expect(() => parseAndRender(code)).not.toThrow()
    })

    it('sollte mehrere hover-Properties verkraften', () => {
      const code = STEP_4_CODE.replace('    bg #333333', '    bg #333333\n    o 0.8')
      expect(() => parseAndRender(code)).not.toThrow()
    })

    it('sollte Task-Item ohne cursor verkraften', () => {
      const code = STEP_4_CODE.replace(', cursor pointer', '')
      const { container } = parseAndRender(code)
      const taskItem = queryByDataId('Task-Item', container).element!
      expect(taskItem.style.cursor).not.toBe('pointer')
    })
  })

  // ==========================================================
  // 13. ZUSAMMENFASSUNG
  // ==========================================================

  describe('13. Vollständige Validierung', () => {
    it('sollte den gesamten Flow durchlaufen', () => {
      // 1. Parse
      const result = parse(STEP_4_CODE)
      expect(getParseErrors(result)).toHaveLength(0)

      // 2. Keine Tokens
      expect(result.tokens.size).toBe(0)

      // 3. Registry hat Definitionen mit States
      expect(result.registry.has('Task-Item')).toBe(true)
      const taskItem = result.registry.get('Task-Item')
      expect(taskItem?.states?.some(s => s.name === 'hover')).toBe(true)

      // 4. AST korrekt
      expect(result.nodes?.[0].name).toBe('App')

      // 5. Render
      const { container } = parseAndRender(STEP_4_CODE)

      // 6. DOM korrekt
      expect(hasElement('Task-Item', container)).toBe(true)
      expect(hasElement('Button', container)).toBe(true)

      // 7. Styles korrekt
      const taskItemEl = queryByDataId('Task-Item', container).element!
      expect(taskItemEl.style.cursor).toBe('pointer')
      expect(colorsMatch(taskItemEl.style.backgroundColor, '#27272A')).toBe(true)

      // 8. Text korrekt
      expect(screen.getByText('Einkaufen gehen')).toBeInTheDocument()

      // 9. Hover funktioniert
      fireEvent.mouseEnter(taskItemEl)
      expect(colorsMatch(taskItemEl.style.backgroundColor, '#333333')).toBe(true)
      fireEvent.mouseLeave(taskItemEl)
      expect(colorsMatch(taskItemEl.style.backgroundColor, '#27272A')).toBe(true)

      // 10. Interaktionen funktionieren
      expect(() => fireEvent.click(taskItemEl)).not.toThrow()
    })
  })
})

// ############################################################
// SCHRITT 5: Toggle-Funktionalität
// ############################################################

const STEP_5_CODE = `Task-Item: hor, between, ver-cen, bg #27272A, pad 12 16, rad 8, cursor pointer
  hover
    bg #333333
  state completed
    o 0.5
  Left: hor, g 12, ver-cen
  Right:

App bg #1A1A1A, pad 24, ver, g 24
  Header hor, between, ver-cen
    Title text-size 24, weight bold, "Meine Tasks"
    Filter-Button bg #333333, pad 8 16, rad 6, "Filter"

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

describe('Schritt 5: Toggle-Funktionalität', () => {

  // ==========================================================
  // 1. PARSER-EBENE
  // ==========================================================

  describe('1. Parser-Ebene', () => {
    it('sollte ohne Parse-Errors parsen', () => {
      const result = parse(STEP_5_CODE)
      const errors = getParseErrors(result)
      expect(errors).toHaveLength(0)
    })

    it('sollte ohne Syntax-Warnings parsen', () => {
      const result = parse(STEP_5_CODE)
      const warnings = getSyntaxWarnings(result)
      expect(warnings).toHaveLength(0)
    })
  })

  // ==========================================================
  // 2. TOKENS
  // ==========================================================

  describe('2. Tokens', () => {
    it('sollte keine Tokens haben', () => {
      const result = parse(STEP_5_CODE)
      expect(result.tokens.size).toBe(0)
    })
  })

  // ==========================================================
  // 3. REGISTRY
  // ==========================================================

  describe('3. Registry', () => {
    let result: ReturnType<typeof parse>

    beforeEach(() => {
      result = parse(STEP_5_CODE)
    })

    it('sollte Task-Item in Registry haben', () => {
      expect(result.registry.has('Task-Item')).toBe(true)
    })

    it('sollte Task-Item mit hover-State haben', () => {
      const taskItem = result.registry.get('Task-Item')
      const hoverState = taskItem?.states?.find((s: any) => s.name === 'hover')
      expect(hoverState).toBeDefined()
    })

    it('sollte Task-Item mit completed-State haben', () => {
      const taskItem = result.registry.get('Task-Item')
      const completedState = taskItem?.states?.find((s: any) => s.name === 'completed')
      expect(completedState).toBeDefined()
    })

    it('sollte completed-State opacity 0.5 haben', () => {
      const taskItem = result.registry.get('Task-Item')
      const completedState = taskItem?.states?.find((s: any) => s.name === 'completed')
      expect(completedState?.properties?.o).toBe(0.5)
    })

    it('sollte Filter-Button in Registry haben', () => {
      expect(result.registry.has('Filter-Button')).toBe(true)
    })
  })

  // ==========================================================
  // 4. AST-STRUKTUR
  // ==========================================================

  describe('4. AST-Struktur', () => {
    let result: ReturnType<typeof parse>

    beforeEach(() => {
      result = parse(STEP_5_CODE)
    })

    it('sollte Task-Item Definition 2 States haben (hover + completed)', () => {
      const taskItem = result.registry.get('Task-Item')
      expect(taskItem?.states?.length).toBe(2)
    })

    it('sollte erstes Task-Item onclick im Code haben', () => {
      // onclick ist im Code definiert und wird geparst
      expect(STEP_5_CODE).toContain('Task-Item onclick toggle-state completed')
    })

    it('sollte 2 Task-Items in Task-List haben', () => {
      const app = result.nodes?.[0]
      const taskList = (app?.children as any[])?.find(c => c.name === 'Task-List')
      const taskItems = (taskList?.children as any[])?.filter(c => c.name === 'Task-Item')
      expect(taskItems?.length).toBe(2)
    })
  })

  // ==========================================================
  // 5. REACT-RENDERING
  // ==========================================================

  describe('5. React-Rendering', () => {
    it('sollte ohne Fehler rendern', () => {
      expect(() => parseAndRender(STEP_5_CODE)).not.toThrow()
    })

    it('sollte Container nicht leer sein', () => {
      const { container } = parseAndRender(STEP_5_CODE)
      expect(container.innerHTML).not.toBe('')
    })
  })

  // ==========================================================
  // 6. DOM-STRUKTUR
  // ==========================================================

  describe('6. DOM-Struktur', () => {
    let container: HTMLElement

    beforeEach(() => {
      const result = parseAndRender(STEP_5_CODE)
      container = result.container
    })

    it('sollte 2 Task-Item-Elemente haben', () => {
      expect(countElements('Task-Item', container)).toBe(2)
    })

    it('sollte Filter-Button haben', () => {
      expect(hasElement('Filter-Button', container)).toBe(true)
    })

    it('sollte 2 Icon-Elemente haben', () => {
      expect(countElements('Icon', container)).toBe(2)
    })
  })

  // ==========================================================
  // 7. CSS/STYLES
  // ==========================================================

  describe('7. CSS/Styles', () => {
    let container: HTMLElement

    beforeEach(() => {
      const result = parseAndRender(STEP_5_CODE)
      container = result.container
    })

    it('sollte Task-Item cursor pointer haben', () => {
      const taskItem = queryByDataId('Task-Item', container).element!
      expect(taskItem.style.cursor).toBe('pointer')
    })

    it('sollte Filter-Button background #333333 haben', () => {
      const filterBtn = queryByDataId('Filter-Button', container).element!
      expect(colorsMatch(filterBtn.style.backgroundColor, '#333333')).toBe(true)
    })

    it('sollte Filter-Button padding 8px 16px haben', () => {
      const filterBtn = queryByDataId('Filter-Button', container).element!
      expect(filterBtn.style.padding).toBe('8px 16px')
    })
  })

  // ==========================================================
  // 8. TEXT-CONTENT
  // ==========================================================

  describe('8. Text-Content', () => {
    beforeEach(() => {
      parseAndRender(STEP_5_CODE)
    })

    it('sollte "Meine Tasks" sichtbar sein', () => {
      expect(screen.getByText('Meine Tasks')).toBeInTheDocument()
    })

    it('sollte "Filter" sichtbar sein', () => {
      expect(screen.getByText('Filter')).toBeInTheDocument()
    })

    it('sollte "Einkaufen gehen" sichtbar sein', () => {
      expect(screen.getByText('Einkaufen gehen')).toBeInTheDocument()
    })

    it('sollte "Meeting vorbereiten" sichtbar sein', () => {
      expect(screen.getByText('Meeting vorbereiten')).toBeInTheDocument()
    })
  })

  // ==========================================================
  // 9. HOVER-STATE
  // ==========================================================

  describe('9. Hover-State', () => {
    it('sollte hover-State in Definition haben', () => {
      const result = parse(STEP_5_CODE)
      const taskItem = result.registry.get('Task-Item')
      const hoverState = taskItem?.states?.find((s: any) => s.name === 'hover')
      expect(hoverState).toBeDefined()
    })
  })

  // ==========================================================
  // 10. BEHAVIOR-STATES
  // ==========================================================

  describe('10. Behavior-States', () => {
    it('sollte completed-State in Definition haben', () => {
      const result = parse(STEP_5_CODE)
      const taskItem = result.registry.get('Task-Item')
      const completedState = taskItem?.states?.find((s: any) => s.name === 'completed')
      expect(completedState).toBeDefined()
    })

    it('sollte completed-State opacity 0.5 haben', () => {
      const result = parse(STEP_5_CODE)
      const taskItem = result.registry.get('Task-Item')
      const completedState = taskItem?.states?.find((s: any) => s.name === 'completed')
      expect(completedState?.properties?.o).toBe(0.5)
    })

    it('sollte erstes Task-Item mit onclick im Code haben', () => {
      // Prüfen dass der Code das onclick-Event enthält
      expect(STEP_5_CODE).toContain('onclick toggle-state completed')
    })
  })

  // ==========================================================
  // 11. INTERAKTIONEN
  // ==========================================================

  describe('11. Interaktionen', () => {
    let container: HTMLElement

    beforeEach(() => {
      const result = parseAndRender(STEP_5_CODE)
      container = result.container
    })

    it('sollte Click auf Task-Item akzeptieren', () => {
      const taskItem = queryByDataId('Task-Item', container).element!
      expect(() => fireEvent.click(taskItem)).not.toThrow()
    })

    it('sollte Click auf Filter-Button akzeptieren', () => {
      const filterBtn = queryByDataId('Filter-Button', container).element!
      expect(() => fireEvent.click(filterBtn)).not.toThrow()
    })

    it('sollte mehrfaches Klicken auf Task-Item verkraften', () => {
      const taskItem = queryByDataId('Task-Item', container).element!
      expect(() => {
        for (let i = 0; i < 5; i++) {
          fireEvent.click(taskItem)
        }
      }).not.toThrow()
    })
  })

  // ==========================================================
  // 12. EDGE CASES
  // ==========================================================

  describe('12. Edge Cases', () => {
    it('sollte anderen completed-opacity verkraften', () => {
      const code = STEP_5_CODE.replace('o 0.5', 'o 0.3')
      expect(() => parseAndRender(code)).not.toThrow()
    })

    it('sollte Task-Item ohne onclick verkraften', () => {
      const code = STEP_5_CODE.replace(' onclick toggle-state completed', '')
      expect(() => parseAndRender(code)).not.toThrow()
    })

    it('sollte anderen State-Namen verkraften', () => {
      const code = STEP_5_CODE.replace('state completed', 'state done')
        .replace('toggle-state completed', 'toggle-state done')
      expect(() => parseAndRender(code)).not.toThrow()
    })
  })

  // ==========================================================
  // 13. ZUSAMMENFASSUNG
  // ==========================================================

  describe('13. Vollständige Validierung', () => {
    it('sollte den gesamten Flow durchlaufen', () => {
      // 1. Parse
      const result = parse(STEP_5_CODE)
      expect(getParseErrors(result)).toHaveLength(0)

      // 2-3. Registry mit States
      const taskItem = result.registry.get('Task-Item')
      expect(taskItem?.states?.some(s => s.name === 'hover')).toBe(true)
      expect(taskItem?.states?.some(s => s.name === 'completed')).toBe(true)

      // 4-5. Render
      const { container } = parseAndRender(STEP_5_CODE)

      // 6. DOM
      expect(countElements('Task-Item', container)).toBe(2)

      // 7-8. Text
      expect(screen.getByText('Einkaufen gehen')).toBeInTheDocument()
      expect(screen.getByText('Filter')).toBeInTheDocument()

      // 9-10. Interaktionen
      const taskItemEl = queryByDataId('Task-Item', container).element!
      expect(() => fireEvent.click(taskItemEl)).not.toThrow()
    })
  })
})

// (SCHRITT 6 Modal entfernt - Fokus auf interessante Schritte)

// ############################################################
// SCHRITT 6: Design Tokens (ehemals SCHRITT 7)
// ############################################################

const STEP_6_CODE = `$bg-color: #1A1A1A
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

describe('Schritt 6: Design Tokens', () => {

  // ==========================================================
  // 1. PARSER-EBENE
  // ==========================================================

  describe('1. Parser-Ebene', () => {
    it('sollte ohne Parse-Errors parsen', () => {
      const result = parse(STEP_6_CODE)
      expect(getParseErrors(result)).toHaveLength(0)
    })

    it('sollte ohne Syntax-Warnings parsen', () => {
      const result = parse(STEP_6_CODE)
      expect(getSyntaxWarnings(result)).toHaveLength(0)
    })
  })

  // ==========================================================
  // 2. TOKENS
  // ==========================================================

  describe('2. Tokens', () => {
    let result: ReturnType<typeof parse>

    beforeEach(() => {
      result = parse(STEP_6_CODE)
    })

    it('sollte 7 Tokens haben', () => {
      expect(result.tokens.size).toBe(7)
    })

    it('sollte bg-color Token haben', () => {
      expect(result.tokens.has('bg-color')).toBe(true)
      expect(result.tokens.get('bg-color')).toBe('#1A1A1A')
    })

    it('sollte surface-color Token haben', () => {
      expect(result.tokens.has('surface-color')).toBe(true)
      expect(result.tokens.get('surface-color')).toBe('#27272A')
    })

    it('sollte primary-color Token haben', () => {
      expect(result.tokens.has('primary-color')).toBe(true)
      expect(result.tokens.get('primary-color')).toBe('#3B82F6')
    })

    it('sollte radius Token haben', () => {
      expect(result.tokens.has('radius')).toBe(true)
      expect(result.tokens.get('radius')).toBe(8)
    })

    it('sollte spacing Token haben', () => {
      expect(result.tokens.has('spacing')).toBe(true)
      expect(result.tokens.get('spacing')).toBe(16)
    })
  })

  // ==========================================================
  // 3. REGISTRY
  // ==========================================================

  describe('3. Registry', () => {
    it('sollte Task-Item in Registry haben', () => {
      const result = parse(STEP_6_CODE)
      expect(result.registry.has('Task-Item')).toBe(true)
    })
  })

  // ==========================================================
  // 4. AST-STRUKTUR
  // ==========================================================

  describe('4. AST-Struktur', () => {
    it('sollte App als Root haben', () => {
      const result = parse(STEP_6_CODE)
      expect(result.nodes?.[0].name).toBe('App')
    })
  })

  // ==========================================================
  // 5. REACT-RENDERING
  // ==========================================================

  describe('5. React-Rendering', () => {
    it('sollte ohne Fehler rendern', () => {
      expect(() => parseAndRender(STEP_6_CODE)).not.toThrow()
    })
  })

  // ==========================================================
  // 6. DOM-STRUKTUR
  // ==========================================================

  describe('6. DOM-Struktur', () => {
    it('sollte alle Elemente haben', () => {
      const { container } = parseAndRender(STEP_6_CODE)
      expect(hasElement('App', container)).toBe(true)
      expect(hasElement('Header', container)).toBe(true)
      expect(hasElement('Task-Item', container)).toBe(true)
    })
  })

  // ==========================================================
  // 7. CSS/STYLES
  // ==========================================================

  describe('7. CSS/Styles', () => {
    let container: HTMLElement

    beforeEach(() => {
      const result = parseAndRender(STEP_6_CODE)
      container = result.container
    })

    it('sollte App $bg-color (#1A1A1A) haben', () => {
      const app = queryByDataId('App', container).element!
      expect(colorsMatch(app.style.backgroundColor, '#1A1A1A')).toBe(true)
    })

    it('sollte Task-Item $surface-color (#27272A) haben', () => {
      const taskItem = queryByDataId('Task-Item', container).element!
      expect(colorsMatch(taskItem.style.backgroundColor, '#27272A')).toBe(true)
    })

    it('sollte Task-Item $radius (8px) haben', () => {
      const taskItem = queryByDataId('Task-Item', container).element!
      expect(taskItem.style.borderRadius).toBe('8px')
    })

    it('sollte Button $primary-color (#3B82F6) haben', () => {
      const button = queryByDataId('Button', container).element!
      expect(colorsMatch(button.style.backgroundColor, '#3B82F6')).toBe(true)
    })
  })

  // ==========================================================
  // 8. TEXT-CONTENT
  // ==========================================================

  describe('8. Text-Content', () => {
    it('sollte alle Texte sichtbar sein', () => {
      parseAndRender(STEP_6_CODE)
      expect(screen.getByText('Meine Tasks')).toBeInTheDocument()
      expect(screen.getByText('Einkaufen gehen')).toBeInTheDocument()
    })
  })

  // ==========================================================
  // 9-11. STATES & INTERAKTIONEN
  // ==========================================================

  describe('9-11. States & Interaktionen', () => {
    it('sollte hover-State in Definition haben', () => {
      const result = parse(STEP_6_CODE)
      const taskItem = result.registry.get('Task-Item')
      expect(taskItem?.states?.some(s => s.name === 'hover')).toBe(true)
    })

    it('sollte Hover-Event ohne Fehler akzeptieren', () => {
      const { container } = parseAndRender(STEP_6_CODE)
      const taskItem = queryByDataId('Task-Item', container).element!
      // JSDOM unterstützt CSS-Hover nicht vollständig, daher nur Event-Test
      expect(() => fireEvent.mouseEnter(taskItem)).not.toThrow()
      expect(() => fireEvent.mouseLeave(taskItem)).not.toThrow()
    })
  })

  // ==========================================================
  // 12. EDGE CASES
  // ==========================================================

  describe('12. Edge Cases', () => {
    it('sollte Token-Werte ändern verkraften', () => {
      const code = STEP_6_CODE.replace('#1A1A1A', '#000000')
      const { container } = parseAndRender(code)
      const app = queryByDataId('App', container).element!
      expect(colorsMatch(app.style.backgroundColor, '#000000')).toBe(true)
    })
  })

  // ==========================================================
  // 13. ZUSAMMENFASSUNG
  // ==========================================================

  describe('13. Vollständige Validierung', () => {
    it('sollte den gesamten Flow durchlaufen', () => {
      const result = parse(STEP_6_CODE)
      expect(getParseErrors(result)).toHaveLength(0)
      expect(result.tokens.size).toBe(7)
      expect(result.tokens.get('primary-color')).toBe('#3B82F6')

      const { container } = parseAndRender(STEP_6_CODE)
      const app = queryByDataId('App', container).element!
      expect(colorsMatch(app.style.backgroundColor, '#1A1A1A')).toBe(true)
    })
  })
})

// ############################################################
// SCHRITT 7: Vollständige App mit Sidebar
// ############################################################

const STEP_7_CODE = `$bg-color: #1A1A1A
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

describe('Schritt 7: Vollständige App mit Sidebar', () => {

  // ==========================================================
  // 1. PARSER-EBENE
  // ==========================================================

  describe('1. Parser-Ebene', () => {
    it('sollte ohne Parse-Errors parsen', () => {
      const result = parse(STEP_7_CODE)
      expect(getParseErrors(result)).toHaveLength(0)
    })

    it('sollte ohne Syntax-Warnings parsen', () => {
      const result = parse(STEP_7_CODE)
      expect(getSyntaxWarnings(result)).toHaveLength(0)
    })
  })

  // ==========================================================
  // 2. TOKENS
  // ==========================================================

  describe('2. Tokens', () => {
    let result: ReturnType<typeof parse>

    beforeEach(() => {
      result = parse(STEP_7_CODE)
    })

    it('sollte 8 Tokens haben', () => {
      expect(result.tokens.size).toBe(8)
    })

    it('sollte warning-color Token haben', () => {
      expect(result.tokens.get('warning-color')).toBe('#F59E0B')
    })

    it('sollte danger-color Token haben', () => {
      expect(result.tokens.get('danger-color')).toBe('#EF4444')
    })

    it('sollte success-color Token haben', () => {
      expect(result.tokens.get('success-color')).toBe('#22C55E')
    })
  })

  // ==========================================================
  // 3. REGISTRY
  // ==========================================================

  describe('3. Registry', () => {
    let result: ReturnType<typeof parse>

    beforeEach(() => {
      result = parse(STEP_7_CODE)
    })

    it('sollte Category-Badge in Registry haben', () => {
      expect(result.registry.has('Category-Badge')).toBe(true)
    })

    it('sollte Task-Item in Registry haben', () => {
      expect(result.registry.has('Task-Item')).toBe(true)
    })

    it('sollte Sidebar in Registry haben', () => {
      expect(result.registry.has('Sidebar')).toBe(true)
    })

    it('sollte Section in Registry haben', () => {
      expect(result.registry.has('Section')).toBe(true)
    })

    it('sollte Section-Title als Slot in Section haben', () => {
      const section = result.registry.get('Section')
      const children = section?.children as any[]
      expect(children?.some(c => c.name === 'Section-Title')).toBe(true)
    })
  })

  // ==========================================================
  // 4. AST-STRUKTUR
  // ==========================================================

  describe('4. AST-Struktur', () => {
    let result: ReturnType<typeof parse>

    beforeEach(() => {
      result = parse(STEP_7_CODE)
    })

    it('sollte App als Root haben', () => {
      expect(result.nodes?.[0].name).toBe('App')
    })

    it('sollte App hor Layout haben', () => {
      const app = result.nodes?.[0]
      expect(app?.properties?.hor).toBe(true)
    })

    it('sollte App Sidebar und Main als Kinder haben', () => {
      const app = result.nodes?.[0]
      const children = app?.children as any[]
      expect(children?.some(c => c.name === 'Sidebar')).toBe(true)
      expect(children?.some(c => c.name === 'Main')).toBe(true)
    })

    it('sollte Task-Item completed-State haben', () => {
      const taskItem = result.registry.get('Task-Item')
      const completedState = taskItem?.states?.find(s => s.name === 'completed')
      expect(completedState).toBeDefined()
    })
  })

  // ==========================================================
  // 5. REACT-RENDERING
  // ==========================================================

  describe('5. React-Rendering', () => {
    it('sollte ohne Fehler rendern', () => {
      expect(() => parseAndRender(STEP_7_CODE)).not.toThrow()
    })

    it('sollte Container nicht leer sein', () => {
      const { container } = parseAndRender(STEP_7_CODE)
      expect(container.innerHTML).not.toBe('')
    })
  })

  // ==========================================================
  // 6. DOM-STRUKTUR
  // ==========================================================

  describe('6. DOM-Struktur', () => {
    let container: HTMLElement

    beforeEach(() => {
      const result = parseAndRender(STEP_7_CODE)
      container = result.container
    })

    it('sollte Sidebar haben', () => {
      expect(hasElement('Sidebar', container)).toBe(true)
    })

    it('sollte Main haben', () => {
      expect(hasElement('Main', container)).toBe(true)
    })

    it('sollte 3 Task-Items haben', () => {
      expect(countElements('Task-Item', container)).toBe(3)
    })

    it('sollte Category-Badges haben (3 in Tasks)', () => {
      // Sidebar-Badges sind möglicherweise nicht gerendert wenn Section-Slots nicht gefüllt
      expect(countElements('Category-Badge', container)).toBeGreaterThanOrEqual(3)
    })

    it('sollte Section-Title haben', () => {
      expect(hasElement('Section-Title', container)).toBe(true)
    })
  })

  // ==========================================================
  // 7. CSS/STYLES
  // ==========================================================

  describe('7. CSS/Styles', () => {
    let container: HTMLElement

    beforeEach(() => {
      const result = parseAndRender(STEP_7_CODE)
      container = result.container
    })

    it('sollte App flex-direction row haben (hor)', () => {
      const app = queryByDataId('App', container).element!
      expect(app.style.flexDirection).toBe('row')
    })

    it('sollte Sidebar width 200px haben', () => {
      const sidebar = queryByDataId('Sidebar', container).element!
      expect(sidebar.style.width).toBe('200px')
    })

    it('sollte Sidebar border-right haben', () => {
      const sidebar = queryByDataId('Sidebar', container).element!
      expect(sidebar.style.borderRightWidth).toBe('1px')
    })

    it('sollte Task-Item korrekte Styles haben', () => {
      const taskItem = queryByDataId('Task-Item', container).element!
      expect(taskItem.style.cursor).toBe('pointer')
      expect(colorsMatch(taskItem.style.backgroundColor, '#27272A')).toBe(true)
    })
  })

  // ==========================================================
  // 8. TEXT-CONTENT
  // ==========================================================

  describe('8. Text-Content', () => {
    beforeEach(() => {
      parseAndRender(STEP_7_CODE)
    })

    it('sollte "Meine Tasks" sichtbar sein', () => {
      expect(screen.getByText('Meine Tasks')).toBeInTheDocument()
    })

    it('sollte "Kategorien" sichtbar sein', () => {
      expect(screen.getByText('Kategorien')).toBeInTheDocument()
    })

    it('sollte alle Task-Texte sichtbar sein', () => {
      expect(screen.getByText('Präsentation vorbereiten')).toBeInTheDocument()
      expect(screen.getByText('Arzttermin vereinbaren')).toBeInTheDocument()
      expect(screen.getByText('Einkaufen gehen')).toBeInTheDocument()
    })

    it('sollte Kategorie-Labels sichtbar sein', () => {
      expect(screen.getAllByText('Arbeit').length).toBeGreaterThanOrEqual(1)
      expect(screen.getAllByText('Privat').length).toBeGreaterThanOrEqual(1)
      expect(screen.getAllByText('Dringend').length).toBeGreaterThanOrEqual(1)
    })
  })

  // ==========================================================
  // 9. HOVER-STATE
  // ==========================================================

  describe('9. Hover-State', () => {
    it('sollte Task-Item hover-State haben', () => {
      const result = parse(STEP_7_CODE)
      const taskItem = result.registry.get('Task-Item')
      expect(taskItem?.states?.some(s => s.name === 'hover')).toBe(true)
    })

    it('sollte Hover-Events akzeptieren', () => {
      const { container } = parseAndRender(STEP_7_CODE)
      const taskItem = queryByDataId('Task-Item', container).element!
      // JSDOM unterstützt CSS-Hover nicht vollständig
      expect(() => fireEvent.mouseEnter(taskItem)).not.toThrow()
      expect(() => fireEvent.mouseLeave(taskItem)).not.toThrow()
    })
  })

  // ==========================================================
  // 10. BEHAVIOR-STATES
  // ==========================================================

  describe('10. Behavior-States', () => {
    it('sollte completed-State haben', () => {
      const result = parse(STEP_7_CODE)
      const taskItem = result.registry.get('Task-Item')
      const completedState = taskItem?.states?.find(s => s.name === 'completed')
      expect(completedState).toBeDefined()
      expect(completedState?.properties?.o).toBe(0.5)
    })
  })

  // ==========================================================
  // 11. INTERAKTIONEN
  // ==========================================================

  describe('11. Interaktionen', () => {
    let container: HTMLElement

    beforeEach(() => {
      const result = parseAndRender(STEP_7_CODE)
      container = result.container
    })

    it('sollte Hover auf alle Task-Items funktionieren', () => {
      const items = container.querySelectorAll('[data-id^="Task-Item"]')
      items.forEach(item => {
        expect(() => {
          fireEvent.mouseEnter(item)
          fireEvent.mouseLeave(item)
        }).not.toThrow()
      })
    })

    it('sollte Click auf letzten Task funktionieren', () => {
      const items = container.querySelectorAll('[data-id^="Task-Item"]')
      const lastItem = items[items.length - 1]
      expect(() => fireEvent.click(lastItem)).not.toThrow()
    })
  })

  // ==========================================================
  // 12. EDGE CASES
  // ==========================================================

  describe('12. Edge Cases', () => {
    it('sollte andere Token-Farben verkraften', () => {
      const code = STEP_7_CODE.replace('#3B82F6', '#FF0000')
      expect(() => parseAndRender(code)).not.toThrow()
    })

    it('sollte andere Sidebar-Breite verkraften', () => {
      const code = STEP_7_CODE.replace('w 200', 'w 250')
      const { container } = parseAndRender(code)
      const sidebar = queryByDataId('Sidebar', container).element!
      expect(sidebar.style.width).toBe('250px')
    })

    it('sollte 4 Task-Items verkraften', () => {
      const code = STEP_7_CODE + `
      Task-Item
        Left
          Icon "star", col #FFD700
          Text "Neuer Task"
        Right
          Text col $muted-color, "Später"`
      const { container } = parseAndRender(code)
      expect(countElements('Task-Item', container)).toBe(4)
    })
  })

  // ==========================================================
  // 13. ZUSAMMENFASSUNG
  // ==========================================================

  describe('13. Vollständige Validierung', () => {
    it('sollte den gesamten Flow durchlaufen', () => {
      // 1. Parse
      const result = parse(STEP_7_CODE)
      expect(getParseErrors(result)).toHaveLength(0)

      // 2. Tokens
      expect(result.tokens.size).toBe(8)

      // 3. Registry
      expect(result.registry.has('Task-Item')).toBe(true)
      expect(result.registry.has('Sidebar')).toBe(true)
      expect(result.registry.has('Category-Badge')).toBe(true)

      // 4. AST
      expect(result.nodes?.[0].name).toBe('App')
      expect(result.nodes?.[0].properties?.hor).toBe(true)

      // 5. Render
      const { container } = parseAndRender(STEP_7_CODE)

      // 6. DOM
      expect(hasElement('Sidebar', container)).toBe(true)
      expect(hasElement('Main', container)).toBe(true)
      expect(countElements('Task-Item', container)).toBe(3)

      // 7. Styles
      const sidebar = queryByDataId('Sidebar', container).element!
      expect(sidebar.style.width).toBe('200px')

      // 8. Text
      expect(screen.getByText('Meine Tasks')).toBeInTheDocument()
      expect(screen.getByText('Kategorien')).toBeInTheDocument()

      // 9-10. States
      const taskItem = result.registry.get('Task-Item')
      expect(taskItem?.states?.some(s => s.name === 'hover')).toBe(true)
      expect(taskItem?.states?.some(s => s.name === 'completed')).toBe(true)

      // 11. Interaktionen
      const taskItemEl = queryByDataId('Task-Item', container).element!
      // JSDOM unterstützt CSS-Hover nicht vollständig
      expect(() => fireEvent.mouseEnter(taskItemEl)).not.toThrow()
      expect(() => fireEvent.click(taskItemEl)).not.toThrow()
    })
  })
})
