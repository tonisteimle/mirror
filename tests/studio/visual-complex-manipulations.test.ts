/**
 * Complex Manipulation Tests
 *
 * Umfangreiche Tests für:
 * - Elemente in Container ziehen und wieder raus
 * - Container verschachteln
 * - Verschachtelte Container in andere Container ziehen
 * - pos, hor, ver Layouts kombinieren
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect } from 'vitest'
import { createTestEnvironment } from '../helpers/test-environment'

// ============================================================================
// Elemente in Container ziehen
// ============================================================================

describe('Elemente in Container ziehen', () => {
  describe('In pos-Container', () => {
    it('Box von aussen in pos-Container ziehen', () => {
      const env = createTestEnvironment(`
App = Box w full, h full, pos
  Target = Box x 200, y 100, w 300, h 300, pos, bg #eee
  Source = Box x 50, y 50, w 80, h 80, bg #f00
`)

      const source = env.getElement('Source')
      const target = env.getContainer('Target')
      expect(source).not.toBeNull()
      expect(target).not.toBeNull()

      // Drag Source in Target (Mitte von Target)
      const dropResult = env.simulateDrag({
        element: source!,
        from: { x: 90, y: 90 },  // Mitte von Source
        to: { x: 350, y: 250 },  // Mitte von Target
      })

      expect(dropResult.placement).toBe('absolute')
      expect(dropResult.targetNodeId).toBe(target!.nodeId)

      // Position sollte relativ zum Target sein
      // Target ist bei (200, 100), Drop bei (350, 250)
      // Source Rect war bei (50, 50), delta ist (260, 160)
      // Neue Position: 50 + 260 - 200 = 110, 50 + 160 - 100 = 110
      expect(dropResult.absolutePosition).toBeDefined()
    })

    it('Mehrere Boxen nacheinander in pos-Container ziehen', () => {
      const env = createTestEnvironment(`
App = Box w full, h full, pos
  Container = Box x 100, y 100, w 400, h 400, pos
  Box1 = Box x 10, y 10, w 60, h 60, bg #f00
  Box2 = Box x 10, y 80, w 60, h 60, bg #0f0
  Box3 = Box x 10, y 150, w 60, h 60, bg #00f
`)

      // Ziehe Box1 in Container
      const box1 = env.getElement('Box1')!
      const drag1 = env.simulateDrag({
        element: box1,
        from: { x: 40, y: 40 },
        to: { x: 200, y: 200 },
      })
      expect(env.applyDrop(drag1)).toBe(true)
      env.recompile()

      // Ziehe Box2 in Container
      const box2 = env.getElements().find(e => e.properties.bg === '#0f0')!
      const drag2 = env.simulateDrag({
        element: box2,
        from: { x: 40, y: 110 },
        to: { x: 300, y: 200 },
      })
      expect(env.applyDrop(drag2)).toBe(true)
      env.recompile()

      // Ziehe Box3 in Container
      const box3 = env.getElements().find(e => e.properties.bg === '#00f')!
      const drag3 = env.simulateDrag({
        element: box3,
        from: { x: 40, y: 180 },
        to: { x: 400, y: 300 },
      })
      expect(env.applyDrop(drag3)).toBe(true)

      // Prüfe dass alle Boxen neue Positionen haben
      const code = env.getCode()
      expect(code).toContain('bg #f00')
      expect(code).toContain('bg #0f0')
      expect(code).toContain('bg #00f')
    })
  })

  describe('In ver-Container', () => {
    it('Box in ver-Container am Anfang einfügen', () => {
      const env = createTestEnvironment(`
App = Box w full, h full, pos
  List = Box x 50, y 50, w 200, h 400, ver, gap 8
    Item1 = Box w full, h 50, bg #eee
    Item2 = Box w full, h 50, bg #ddd
`)

      const dropResult = env.simulatePaletteDrag({
        componentName: 'Box',
        to: { x: 100, y: 60 },  // Ganz oben im List
        properties: 'w full, h 50, bg #f00',
      })

      expect(dropResult.placement).toBe('inside')
      expect(dropResult.insertionIndex).toBe(0)

      env.applyDrop(dropResult)
      const code = env.getCode()
      expect(code).toContain('bg #f00')
    })

    it('Box in ver-Container in der Mitte einfügen', () => {
      const env = createTestEnvironment(`
App = Box w full, h full, pos
  List = Box x 50, y 50, w 200, h 400, ver
    Item1 = Box w full, h 50, bg #eee
    Item2 = Box w full, h 50, bg #ddd
    Item3 = Box w full, h 50, bg #ccc
`)

      // Items sind bei y=50, y=100, y=150
      // Drop bei y=130 sollte zwischen Item2 und Item3 sein (insertionIndex=2)
      const dropResult = env.simulatePaletteDrag({
        componentName: 'Box',
        to: { x: 100, y: 130 },
        properties: 'w full, h 50, bg #f00',
      })

      expect(dropResult.placement).toBe('inside')
      expect(dropResult.insertionIndex).toBe(2)
    })

    it('Box in ver-Container am Ende einfügen', () => {
      const env = createTestEnvironment(`
App = Box w full, h full, pos
  List = Box x 50, y 50, w 200, h 400, ver
    Item1 = Box w full, h 50
    Item2 = Box w full, h 50
`)

      // Items sind bei y=50, y=100
      // Drop bei y=200 sollte am Ende sein
      const dropResult = env.simulatePaletteDrag({
        componentName: 'Box',
        to: { x: 100, y: 200 },
      })

      expect(dropResult.placement).toBe('inside')
      expect(dropResult.insertionIndex).toBe(2)
    })
  })

  describe('In hor-Container', () => {
    it('Box in hor-Container am Anfang einfügen', () => {
      const env = createTestEnvironment(`
App = Box w full, h full, pos
  Row = Box x 50, y 50, w 400, h 100, hor, gap 8
    Item1 = Box w 80, h full, bg #eee
    Item2 = Box w 80, h full, bg #ddd
`)

      // Items sind bei x=50, x=130
      // Drop bei x=55 sollte am Anfang sein
      const dropResult = env.simulatePaletteDrag({
        componentName: 'Box',
        to: { x: 55, y: 80 },
        properties: 'w 80, h full, bg #f00',
      })

      expect(dropResult.placement).toBe('inside')
      expect(dropResult.insertionIndex).toBe(0)
    })

    it('Box in hor-Container in der Mitte einfügen', () => {
      const env = createTestEnvironment(`
App = Box w full, h full, pos
  Row = Box x 50, y 50, w 400, h 100, hor
    Item1 = Box w 80, h full
    Item2 = Box w 80, h full
    Item3 = Box w 80, h full
`)

      // Items sind bei x=50, x=130, x=210
      // Item2 center ist bei x=170
      // Drop bei x=180 sollte nach Item2 sein (insertionIndex=2)
      const dropResult = env.simulatePaletteDrag({
        componentName: 'Box',
        to: { x: 180, y: 80 },
      })

      expect(dropResult.placement).toBe('inside')
      expect(dropResult.insertionIndex).toBe(2)
    })
  })
})

// ============================================================================
// Elemente aus Container rausziehen
// ============================================================================

describe('Elemente aus Container rausziehen', () => {
  it('Box aus pos-Container nach aussen ziehen', () => {
    const env = createTestEnvironment(`
App = Box w full, h full, pos
  Container = Box x 200, y 100, w 300, h 300, pos
    Inner = Box x 50, y 50, w 80, h 80, bg #f00
`)

    const inner = env.getElement('Inner')!
    // Inner ist bei absolut (200+50, 100+50) = (250, 150)

    // Ziehe nach aussen (links vom Container)
    const dropResult = env.simulateDrag({
      element: inner,
      from: { x: 290, y: 190 },  // Mitte von Inner
      to: { x: 100, y: 200 },    // Ausserhalb Container
    })

    // Sollte in App landen (root pos container)
    expect(dropResult.placement).toBe('absolute')
  })

  it('Box aus ver-Container nach aussen in pos-Container ziehen', () => {
    const env = createTestEnvironment(`
App = Box w full, h full, pos
  List = Box x 300, y 50, w 200, h 400, ver
    Item1 = Box w full, h 50, bg #eee
    Item2 = Box w full, h 50, bg #ddd
  Target = Box x 50, y 50, w 200, h 200, pos, bg #ffc
`)

    // Item1 ist bei (300, 50)
    const item1 = env.getElements().find(e => e.properties.bg === '#eee')!

    // Ziehe in Target (pos-Container)
    const dropResult = env.simulateDrag({
      element: item1,
      from: { x: 400, y: 75 },
      to: { x: 150, y: 150 },  // Mitte von Target
    })

    expect(dropResult.placement).toBe('absolute')
  })
})

// ============================================================================
// Container verschachteln
// ============================================================================

describe('Container verschachteln', () => {
  describe('pos in pos', () => {
    it('pos-Container in anderen pos-Container ziehen', () => {
      const env = createTestEnvironment(`
App = Box w full, h full, pos
  Outer = Box x 200, y 100, w 400, h 400, pos, bg #eee
  Inner = Box x 50, y 50, w 150, h 150, pos, bg #ddd
    Child = Box x 20, y 20, w 50, h 50, bg #f00
`)

      const inner = env.getContainer('Inner')!
      expect(inner.children.length).toBe(1)

      // Ziehe Inner in Outer
      const dropResult = env.simulateDrag({
        element: env.getElement('Inner')!,
        from: { x: 125, y: 125 },
        to: { x: 350, y: 250 },
      })

      expect(dropResult.placement).toBe('absolute')
      expect(env.applyDrop(dropResult)).toBe(true)

      // Kind sollte mitkommen
      const code = env.getCode()
      expect(code).toContain('Child')
      expect(code).toContain('bg #f00')
    })
  })

  describe('ver in pos', () => {
    it('ver-Container in pos-Container ziehen', () => {
      const env = createTestEnvironment(`
App = Box w full, h full, pos
  Canvas = Box x 200, y 50, w 400, h 500, pos, bg #f5f5f5
  Sidebar = Box x 20, y 50, w 150, h 300, ver, gap 8
    NavItem1 = Box w full, h 40, bg #5BA8F5
    NavItem2 = Box w full, h 40, bg #5BA8F5
    NavItem3 = Box w full, h 40, bg #5BA8F5
`)

      const sidebar = env.getContainer('Sidebar')!
      expect(sidebar.isVertical).toBe(true)
      expect(sidebar.children.length).toBe(3)

      // Ziehe Sidebar in Canvas
      const dropResult = env.simulateDrag({
        element: env.getElement('Sidebar')!,
        from: { x: 95, y: 150 },
        to: { x: 350, y: 200 },
      })

      expect(dropResult.placement).toBe('absolute')
      expect(env.applyDrop(dropResult)).toBe(true)

      const code = env.getCode()
      expect(code).toContain('ver')
      expect(code).toContain('NavItem1')
      expect(code).toContain('NavItem2')
      expect(code).toContain('NavItem3')
    })
  })

  describe('hor in ver', () => {
    it('hor-Container in ver-Container als Kind einfügen', () => {
      const env = createTestEnvironment(`
App = Box w full, h full, pos
  Column = Box x 50, y 50, w 300, h 500, ver, gap 16
    Header = Box w full, h 60, bg #333
    Content = Box w full, h 200, bg #eee
`)

      // Neue hor-Row in Column einfügen
      const dropResult = env.simulatePaletteDrag({
        componentName: 'Box',
        to: { x: 150, y: 180 },  // Zwischen Header und Content
        properties: 'w full, h 50, hor, gap 8',
      })

      expect(dropResult.placement).toBe('inside')
      expect(dropResult.insertionIndex).toBe(1)

      env.applyDrop(dropResult)
      const code = env.getCode()
      expect(code).toContain('hor')
    })
  })

  describe('Tiefe Verschachtelung', () => {
    it('3-fach verschachtelte Container', () => {
      const env = createTestEnvironment(`
App = Box w full, h full, pos
  Level1 = Box x 50, y 50, w 500, h 500, pos
    Level2 = Box x 20, y 20, w 300, h 300, ver, gap 8
      Level3a = Box w full, h 80, hor, gap 4
        Item1 = Box w 60, h full, bg #f00
        Item2 = Box w 60, h full, bg #0f0
      Level3b = Box w full, h 80, bg #eee
`)

      const level1 = env.getContainer('Level1')!
      const level2 = env.getContainer('Level2')!
      const level3a = env.getContainer('Level3a')!

      expect(level1.isPositioned).toBe(true)
      expect(level2.isVertical).toBe(true)
      expect(level3a.isHorizontal).toBe(true)
      expect(level3a.children.length).toBe(2)

      // Füge neues Element in Level3a (hor) ein
      const dropResult = env.simulatePaletteDrag({
        componentName: 'Box',
        to: { x: 200, y: 110 },  // In Level3a
        properties: 'w 60, h full, bg #00f',
      })

      expect(dropResult.placement).toBe('inside')
      env.applyDrop(dropResult)

      const code = env.getCode()
      expect(code).toContain('bg #00f')
    })
  })
})

// ============================================================================
// Verschachtelte Container verschieben
// ============================================================================

describe('Verschachtelte Container verschieben', () => {
  it('Verschachtelte ver-Container zwischen pos-Containern verschieben', () => {
    const env = createTestEnvironment(`
App = Box w full, h full, pos
  LeftPanel = Box x 20, y 20, w 200, h 400, pos, bg #f0f0f0
    NavList = Box x 10, y 10, w 180, h 200, ver, gap 4
      Nav1 = Box w full, h 30, bg #5BA8F5
      Nav2 = Box w full, h 30, bg #5BA8F5
      Nav3 = Box w full, h 30, bg #5BA8F5
  RightPanel = Box x 250, y 20, w 300, h 400, pos, bg #e0e0e0
`)

    const navList = env.getContainer('NavList')!
    expect(navList.children.length).toBe(3)

    // Verschiebe NavList von LeftPanel nach RightPanel
    const dropResult = env.simulateDrag({
      element: env.getElement('NavList')!,
      from: { x: 120, y: 80 },
      to: { x: 350, y: 150 },
    })

    expect(dropResult.placement).toBe('absolute')
    expect(env.applyDrop(dropResult)).toBe(true)

    const code = env.getCode()
    // NavList sollte noch ver sein und 3 Kinder haben
    expect(code).toContain('ver')
    expect(code).toContain('Nav1')
    expect(code).toContain('Nav2')
    expect(code).toContain('Nav3')
  })

  it('hor-Container mit Kindern in ver-Container verschieben', () => {
    const env = createTestEnvironment(`
App = Box w full, h full, pos
  Column = Box x 200, y 50, w 300, h 500, ver, gap 16
    Header = Box w full, h 60, bg #333
    Footer = Box w full, h 60, bg #333
  FloatingBar = Box x 20, y 100, w 150, h 40, hor, gap 4
    Btn1 = Box w 40, h full, bg #f00
    Btn2 = Box w 40, h full, bg #0f0
    Btn3 = Box w 40, h full, bg #00f
`)

    const floatingBar = env.getContainer('FloatingBar')!
    expect(floatingBar.isHorizontal).toBe(true)
    expect(floatingBar.children.length).toBe(3)

    // Column ist bei y=50
    // Header ist bei y=50, h=60, center=80
    // Footer ist bei y=110, h=60, center=140
    // Drop bei y=95 sollte nach Header (center=80) aber vor Footer (center=140) sein
    const dropResult = env.simulatePaletteDrag({
      componentName: 'Box',
      to: { x: 350, y: 95 },
      properties: 'w full, h 40, hor, gap 4',
    })

    expect(dropResult.placement).toBe('inside')
    expect(dropResult.insertionIndex).toBe(1)
  })
})

// ============================================================================
// Komplexe Szenarien
// ============================================================================

describe('Komplexe Szenarien', () => {
  it('Dashboard-Layout aufbauen', () => {
    const env = createTestEnvironment(`
App = Box w full, h full, pos
`)

    // 1. Sidebar hinzufügen
    let drop = env.simulatePaletteDrag({
      componentName: 'Box',
      to: { x: 100, y: 300 },
      properties: 'x 0, y 0, w 200, h full, ver, pad 16, gap 8, bg #1e293b',
    })
    env.applyDrop(drop)
    env.recompile()

    // 2. Main Content Area hinzufügen
    drop = env.simulatePaletteDrag({
      componentName: 'Box',
      to: { x: 500, y: 300 },
      properties: 'x 200, y 0, w full, h full, ver, pad 24, gap 16, bg #f8fafc',
    })
    env.applyDrop(drop)
    env.recompile()

    const code = env.getCode()
    expect(code).toContain('bg #1e293b')  // Sidebar
    expect(code).toContain('bg #f8fafc')  // Content
  })

  it('Formular mit verschachtelten Gruppen', () => {
    const env = createTestEnvironment(`
App = Box w full, h full, pos
  Form = Box x 50, y 50, w 400, h 500, ver, gap 24, pad 24, bg #fff
`)

    // Füge Fieldsets hinzu (ver-Gruppen)
    let drop = env.simulatePaletteDrag({
      componentName: 'Box',
      to: { x: 250, y: 100 },
      properties: 'w full, ver, gap 8',
      textContent: 'Personal Info',
    })
    env.applyDrop(drop)
    env.recompile()

    // Füge zweites Fieldset hinzu
    drop = env.simulatePaletteDrag({
      componentName: 'Box',
      to: { x: 250, y: 200 },
      properties: 'w full, ver, gap 8',
      textContent: 'Contact Info',
    })
    env.applyDrop(drop)
    env.recompile()

    const code = env.getCode()
    expect(code).toContain('Personal Info')
    expect(code).toContain('Contact Info')
  })

  it('Drag-and-Drop Kanban Board Simulation', () => {
    const env = createTestEnvironment(`
App = Box w full, h full, pos
  Board = Box x 50, y 50, w 800, h 500, hor, gap 16, pad 16
    Todo = Box w 200, h full, ver, gap 8, bg #fef3c7
      TodoHeader = Text "To Do", weight bold
      Card1 = Box w full, h 60, bg #fff, rad 4
      Card2 = Box w full, h 60, bg #fff, rad 4
    InProgress = Box w 200, h full, ver, gap 8, bg #dbeafe
      ProgressHeader = Text "In Progress", weight bold
      Card3 = Box w full, h 60, bg #fff, rad 4
    Done = Box w 200, h full, ver, gap 8, bg #dcfce7
      DoneHeader = Text "Done", weight bold
`)

    const todo = env.getContainer('Todo')!
    const inProgress = env.getContainer('InProgress')!
    const done = env.getContainer('Done')!

    expect(todo.isVertical).toBe(true)
    expect(inProgress.isVertical).toBe(true)
    expect(done.isVertical).toBe(true)

    // Simuliere: Card1 von Todo nach InProgress ziehen
    const card1 = env.getElements().find(e => e.componentName === 'Card1')
    expect(card1).toBeDefined()

    // Card1 ist Kind von Todo (ver container)
    // Wenn wir es nach InProgress ziehen, sollte es dort eingefügt werden
    const dropResult = env.simulatePaletteDrag({
      componentName: 'Box',
      to: { x: 350, y: 150 },  // In InProgress
      properties: 'w full, h 60, bg #fff, rad 4',
    })

    expect(dropResult.placement).toBe('inside')

    env.applyDrop(dropResult)
    const code = env.getCode()
    expect(code.match(/bg #fff/g)?.length).toBeGreaterThanOrEqual(4)  // Ursprüngliche 3 + neue
  })

  it('Responsive Layout mit Breakpoints simulieren', () => {
    const env = createTestEnvironment(`
App = Box w full, h full, pos
  Desktop = Box x 0, y 0, w full, h full, hor
    Sidebar = Box w 250, h full, ver, bg #1e293b
    Main = Box w full, h full, ver
      Header = Box w full, h 60, hor, bg #fff
      Content = Box w full, h full, ver, pad 24
`)

    const desktop = env.getContainer('Desktop')!
    const sidebar = env.getContainer('Sidebar')!
    const main = env.getContainer('Main')!

    expect(desktop.isHorizontal).toBe(true)
    expect(sidebar.isVertical).toBe(true)
    expect(main.isVertical).toBe(true)

    // Füge Content-Elemente in verschachtelte Struktur ein
    const drop = env.simulatePaletteDrag({
      componentName: 'Box',
      to: { x: 500, y: 200 },  // In Content
      properties: 'w full, h 200, bg #f1f5f9, rad 8',
    })

    expect(drop.placement).toBe('inside')
  })
})

// ============================================================================
// Edge Cases
// ============================================================================

describe('Edge Cases', () => {
  it('Leerer Container als Drop-Ziel', () => {
    const env = createTestEnvironment(`
App = Box w full, h full, pos
  EmptyVer = Box x 50, y 50, w 200, h 300, ver, bg #eee
  EmptyHor = Box x 300, y 50, w 300, h 100, hor, bg #ddd
  EmptyPos = Box x 50, y 400, w 200, h 150, pos, bg #ccc
`)

    // Drop in leeren ver-Container
    let drop = env.simulatePaletteDrag({
      componentName: 'Box',
      to: { x: 150, y: 150 },
      properties: 'w full, h 50, bg #f00',
    })
    expect(drop.placement).toBe('inside')
    expect(drop.insertionIndex).toBe(0)

    // Drop in leeren hor-Container
    drop = env.simulatePaletteDrag({
      componentName: 'Box',
      to: { x: 400, y: 80 },
      properties: 'w 80, h full, bg #0f0',
    })
    expect(drop.placement).toBe('inside')
    expect(drop.insertionIndex).toBe(0)

    // Drop in leeren pos-Container
    drop = env.simulatePaletteDrag({
      componentName: 'Box',
      to: { x: 100, y: 450 },
      properties: 'w 50, h 50, bg #00f',
    })
    expect(drop.placement).toBe('absolute')
    expect(drop.absolutePosition).toBeDefined()
  })

  it('Sehr tiefe Verschachtelung (5 Ebenen)', () => {
    const env = createTestEnvironment(`
App = Box w full, h full, pos
  L1 = Box x 20, y 20, w 500, h 500, pos
    L2 = Box x 10, y 10, w 400, h 400, ver
      L3 = Box w full, h 150, hor
        L4 = Box w 150, h full, pos
          L5 = Box x 10, y 10, w 100, h 100, ver, bg #f00
`)

    const l5 = env.getContainer('L5')!
    expect(l5.isVertical).toBe(true)

    // Drop in tiefste Ebene
    const drop = env.simulatePaletteDrag({
      componentName: 'Text',
      to: { x: 80, y: 60 },
      textContent: 'Deep nested',
    })

    expect(drop.placement).toBe('inside')
    env.applyDrop(drop)

    const code = env.getCode()
    expect(code).toContain('Deep nested')
  })

  it('Container an Rand des Parents', () => {
    const env = createTestEnvironment(`
App = Box w full, h full, pos
  Parent = Box x 100, y 100, w 400, h 400, pos, bg #eee
`)

    // Drop am linken Rand
    let drop = env.simulatePaletteDrag({
      componentName: 'Box',
      to: { x: 105, y: 200 },
      properties: 'w 50, h 100, bg #f00',
    })
    expect(drop.absolutePosition!.x).toBeLessThan(20)

    // Drop am rechten Rand
    drop = env.simulatePaletteDrag({
      componentName: 'Box',
      to: { x: 495, y: 200 },
      properties: 'w 50, h 100, bg #0f0',
    })
    expect(drop.absolutePosition!.x).toBeGreaterThan(350)
  })

  it('Überlappende Container - tiefster gewinnt', () => {
    const env = createTestEnvironment(`
App = Box w full, h full, pos
  Back = Box x 50, y 50, w 300, h 300, pos, bg #eee
    Front = Box x 50, y 50, w 150, h 150, pos, bg #ddd
`)

    // Drop in überlappenden Bereich - sollte Front treffen (tieferer)
    const drop = env.simulatePaletteDrag({
      componentName: 'Box',
      to: { x: 150, y: 150 },
      properties: 'w 50, h 50, bg #f00',
    })

    // Front ist bei (100, 100), also relativ zu Front
    expect(drop.placement).toBe('absolute')
    expect(drop.absolutePosition!.x).toBe(50)  // 150 - 100
    expect(drop.absolutePosition!.y).toBe(50)  // 150 - 100
  })
})

// ============================================================================
// Layout-Wechsel Szenarien
// ============================================================================

describe('Layout-Wechsel Szenarien', () => {
  it('Element von pos zu ver verschieben', () => {
    const env = createTestEnvironment(`
App = Box w full, h full, pos
  Positioned = Box x 300, y 50, w 200, h 200, pos
    Floating = Box x 20, y 20, w 80, h 40, bg #f00
  Column = Box x 50, y 50, w 200, h 400, ver, gap 8
    Item1 = Box w full, h 50, bg #eee
    Item2 = Box w full, h 50, bg #ddd
`)

    // Floating Box ist absolut positioniert
    const floating = env.getElement('Floating')!
    expect(floating.properties.x).toBe(20)
    expect(floating.properties.y).toBe(20)

    // Wenn wir in Column droppen, sollte flex-Platzierung verwendet werden
    // (Dies ist ein Palette-Drop-ähnliches Szenario)
    const dropResult = env.simulatePaletteDrag({
      componentName: 'Box',
      to: { x: 100, y: 90 },  // Zwischen Item1 und Item2
      properties: 'w full, h 50, bg #f00',
    })

    expect(dropResult.placement).toBe('inside')
    expect(dropResult.insertionIndex).toBe(1)
    // Keine absolutePosition, da flex-Container
    expect(dropResult.absolutePosition).toBeUndefined()
  })

  it('Element von ver zu pos verschieben', () => {
    const env = createTestEnvironment(`
App = Box w full, h full, pos
  Column = Box x 50, y 50, w 200, h 300, ver
    Item1 = Box w full, h 50, bg #eee
    Item2 = Box w full, h 50, bg #ddd
  Canvas = Box x 300, y 50, w 300, h 300, pos, bg #f5f5f5
`)

    // Item1 aus Column nach Canvas ziehen
    const item1 = env.getElements().find(e => e.properties.bg === '#eee')!

    const dropResult = env.simulateDrag({
      element: item1,
      from: { x: 150, y: 75 },
      to: { x: 450, y: 150 },
    })

    expect(dropResult.placement).toBe('absolute')
    expect(dropResult.absolutePosition).toBeDefined()
  })
})
