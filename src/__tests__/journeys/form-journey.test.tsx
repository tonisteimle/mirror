/**
 * User Journey Test: Form Building (Inkrementell)
 *
 * Diese Journey simuliert wie ein User schrittweise ein
 * komplexes Formular aufbaut - von einem einzelnen Input
 * bis zu einem vollständigen Login/Registrierungs-Flow.
 *
 * BESONDERHEIT: Der Code wird inkrementell erweitert,
 * nicht bei jedem Schritt komplett neu geschrieben.
 */

import { describe, it, expect } from 'vitest'
import { parse } from '../../parser/parser'
import { screen, fireEvent } from '@testing-library/react'

import {
  parseAndRender,
  validateStep,
  getParseErrors,
  hasElement,
  countElements,
  queryByDataId,
  getStyle,
  checkStyles,
  clickElement,
  focusElement,
  hasVisibleText,
  CodeBuilder,
} from './utils'

describe('User Journey: Building a Form (Incremental)', () => {
  // ============================================================
  // Der Code wird schrittweise aufgebaut
  // ============================================================

  // SCHRITT 1: Basis - Ein einzelnes Input-Feld
  const STEP_1 = `Input "Email eingeben"`

  // SCHRITT 2: Styling hinzufügen
  const STEP_2 = `$bg: #1A1A1A
$surface: #27272A
$border: #444

Input pad 12, bg $surface, bor 1 $border, rad 6, "Email eingeben"`

  // SCHRITT 3: FormField-Komponente definieren
  const STEP_3 = `$bg: #1A1A1A
$surface: #27272A
$border: #444

FormField: ver, g 4
  Label: text-size 12, col #888
  Input: pad 12, bg $surface, bor 1 $border, rad 6
    focus
      bor 1 #3B82F6

Form bg $bg, pad 24, rad 12, ver, g 16
  FormField
    Label "Email"
    Input "you@example.com"`

  // SCHRITT 4: Mehrere Felder
  const STEP_4 = `$bg: #1A1A1A
$surface: #27272A
$border: #444
$primary: #3B82F6

FormField: ver, g 4
  Label: text-size 12, col #888
  Input: pad 12, bg $surface, bor 1 $border, rad 6
    focus
      bor 1 $primary

Form bg $bg, pad 24, rad 12, ver, g 16
  Title text-size 20, weight bold, "Login"

  FormField
    Label "Email"
    Input "you@example.com"

  FormField
    Label "Password"
    Input "••••••••"`

  // SCHRITT 5: Button und States
  const STEP_5 = `$bg: #1A1A1A
$surface: #27272A
$border: #444
$primary: #3B82F6

FormField: ver, g 4
  Label: text-size 12, col #888
  Input: pad 12, bg $surface, bor 1 $border, rad 6
    focus
      bor 1 $primary

Button: pad 12 24, bg $primary, rad 6, cen, cursor pointer
  hover
    bg #2563EB
  state disabled
    bg #333
    cursor default

Form bg $bg, pad 24, rad 12, ver, g 16, w 320
  Title text-size 20, weight bold, "Login"

  FormField
    Label "Email"
    Input "you@example.com"

  FormField
    Label "Password"
    Input "••••••••"

  Button "Anmelden"`

  // SCHRITT 6: Validierung und Error-States
  const STEP_6 = `$bg: #1A1A1A
$surface: #27272A
$border: #444
$primary: #3B82F6
$error: #EF4444
$success: #22C55E

FormField: ver, g 4
  Label: text-size 12, col #888
  ErrorText: text-size 11, col $error, hidden
  Input: pad 12, bg $surface, bor 1 $border, rad 6
    focus
      bor 1 $primary

Button: pad 12 24, bg $primary, rad 6, cen, cursor pointer
  hover
    bg #2563EB
  state disabled
    bg #333
    cursor default

Form bg $bg, pad 24, rad 12, ver, g 16, w 320
  Title text-size 20, weight bold, "Login"

  FormField
    Label "Email"
    Input "you@example.com"
    ErrorText "Ungültige Email"

  FormField
    Label "Password"
    Input "••••••••"
    ErrorText "Mindestens 8 Zeichen"

  Button "Anmelden"

  Footer hor, cen, g 4, mar t 8
    Text col #666, text-size 13, "Noch kein Konto?"
    Link col $primary, text-size 13, "Registrieren"`

  // ============================================================
  // SCHRITT 1: Basis Input
  // ============================================================

  describe('Schritt 1: Einzelnes Input', () => {
    it('sollte valide sein', () => {
      const result = validateStep(STEP_1)
      expect(result.parseSuccess).toBe(true)
      expect(result.renderSuccess).toBe(true)
    })

    it('sollte Input rendern', () => {
      const { container } = parseAndRender(STEP_1)
      expect(hasElement('Input', container)).toBe(true)
    })

    it('sollte Placeholder haben', () => {
      const { container } = parseAndRender(STEP_1)
      const input = container.querySelector('input')
      expect(input?.placeholder).toBe('Email eingeben')
    })
  })

  // ============================================================
  // SCHRITT 2: Styling
  // ============================================================

  describe('Schritt 2: Mit Styling', () => {
    it('sollte Tokens parsen', () => {
      const result = parse(STEP_2)
      expect(result.tokens.has('bg')).toBe(true)
      expect(result.tokens.has('surface')).toBe(true)
      expect(result.tokens.has('border')).toBe(true)
    })

    it('sollte Styles anwenden', () => {
      const { container } = parseAndRender(STEP_2)
      const { element } = queryByDataId('Input', container)
      expect(element?.style.padding).toBe('12px')
      expect(element?.style.borderRadius).toBe('6px')
    })

    it('sollte Token-Farben auflösen', () => {
      const { container } = parseAndRender(STEP_2)
      const { element } = queryByDataId('Input', container)
      // $surface = #27272A
      expect(element?.style.backgroundColor).toBe('rgb(39, 39, 42)')
    })
  })

  // ============================================================
  // SCHRITT 3: FormField Komponente
  // ============================================================

  describe('Schritt 3: FormField Komponente', () => {
    it('sollte FormField definieren', () => {
      const result = parse(STEP_3)
      expect(result.registry.has('FormField')).toBe(true)
    })

    it('sollte Slots haben (Label, Input)', () => {
      const result = parse(STEP_3)
      const formField = result.registry.get('FormField')
      const children = formField?.children as any[]
      expect(children?.find(c => c.name === 'Label')).toBeDefined()
      expect(children?.find(c => c.name === 'Input')).toBeDefined()
    })

    it('sollte Input focus-State haben', () => {
      const result = parse(STEP_3)
      const formField = result.registry.get('FormField')
      const inputSlot = (formField?.children as any[])?.find(c => c.name === 'Input')
      const focusState = inputSlot?.states?.find((s: any) => s.name === 'focus')
      expect(focusState).toBeDefined()
    })

    it('sollte Form und FormField rendern', () => {
      const { container } = parseAndRender(STEP_3)
      expect(hasElement('Form', container)).toBe(true)
      expect(hasElement('FormField', container)).toBe(true)
    })

    it('sollte Label-Text anzeigen', () => {
      parseAndRender(STEP_3)
      expect(hasVisibleText('Email')).toBe(true)
    })
  })

  // ============================================================
  // SCHRITT 4: Mehrere Felder
  // ============================================================

  describe('Schritt 4: Mehrere Felder', () => {
    it('sollte zwei FormFields haben', () => {
      const { container } = parseAndRender(STEP_4)
      expect(countElements('FormField', container)).toBe(2)
    })

    it('sollte Title anzeigen', () => {
      parseAndRender(STEP_4)
      expect(hasVisibleText('Login')).toBe(true)
    })

    it('sollte beide Labels anzeigen', () => {
      parseAndRender(STEP_4)
      expect(hasVisibleText('Email')).toBe(true)
      expect(hasVisibleText('Password')).toBe(true)
    })

    it('sollte Form vertikal layouten', () => {
      const { container } = parseAndRender(STEP_4)
      const form = queryByDataId('Form', container).element
      expect(form?.style.flexDirection).toBe('column')
    })

    it('sollte Gap zwischen Feldern haben', () => {
      const { container } = parseAndRender(STEP_4)
      const form = queryByDataId('Form', container).element
      expect(form?.style.gap).toBe('16px')
    })
  })

  // ============================================================
  // SCHRITT 5: Button und States
  // ============================================================

  describe('Schritt 5: Button mit States', () => {
    it('sollte Button definieren', () => {
      const result = parse(STEP_5)
      expect(result.registry.has('Button')).toBe(true)
    })

    it('sollte Button hover-State haben', () => {
      const result = parse(STEP_5)
      const button = result.registry.get('Button')
      const hoverState = button?.states?.find((s: any) => s.name === 'hover')
      expect(hoverState).toBeDefined()
    })

    it('sollte Button disabled-State haben', () => {
      const result = parse(STEP_5)
      const button = result.registry.get('Button')
      const disabledState = button?.states?.find((s: any) => s.name === 'disabled')
      expect(disabledState).toBeDefined()
    })

    it('sollte Button rendern', () => {
      const { container } = parseAndRender(STEP_5)
      expect(hasElement('Button', container)).toBe(true)
    })

    it('sollte Button-Text anzeigen', () => {
      parseAndRender(STEP_5)
      expect(hasVisibleText('Anmelden')).toBe(true)
    })

    it('sollte Form feste Breite haben', () => {
      const { container } = parseAndRender(STEP_5)
      const form = queryByDataId('Form', container).element
      expect(form?.style.width).toBe('320px')
    })

    it('sollte Button klickbar sein', () => {
      const { container } = parseAndRender(STEP_5)
      expect(clickElement('Button', container)).toBe(true)
    })
  })

  // ============================================================
  // SCHRITT 6: Validierung und Errors
  // ============================================================

  describe('Schritt 6: Validierung', () => {
    it('sollte alle Tokens haben', () => {
      const result = parse(STEP_6)
      expect(result.tokens.has('error')).toBe(true)
      expect(result.tokens.has('success')).toBe(true)
      expect(result.tokens.has('primary')).toBe(true)
    })

    it('sollte Input mit focus-State haben', () => {
      const result = parse(STEP_6)
      const formField = result.registry.get('FormField')
      // Input ist ein Kind von FormField und sollte States haben
      expect(formField?.children).toBeDefined()
      const children = formField?.children as any[]
      const inputSlot = children?.find(c => c.name === 'Input')
      expect(inputSlot).toBeDefined()
      // Focus-State sollte definiert sein
      const focusState = inputSlot?.states?.find((s: any) => s.name === 'focus')
      expect(focusState).toBeDefined()
    })

    it('sollte ErrorText als Kind von FormField haben', () => {
      const result = parse(STEP_6)
      const formField = result.registry.get('FormField')
      const children = formField?.children as any[]
      // ErrorText ist Teil der FormField-Definition
      const hasErrorText = children?.some(c => c.name === 'ErrorText')
      expect(hasErrorText).toBe(true)
    })

    it('sollte vollständiges Form rendern', () => {
      const { container } = parseAndRender(STEP_6)
      expect(hasElement('Form', container)).toBe(true)
      expect(countElements('FormField', container)).toBe(2)
      expect(hasElement('Button', container)).toBe(true)
      expect(hasElement('Footer', container)).toBe(true)
    })

    it('sollte Footer-Elemente anzeigen', () => {
      parseAndRender(STEP_6)
      expect(hasVisibleText('Noch kein Konto?')).toBe(true)
      expect(hasVisibleText('Registrieren')).toBe(true)
    })

    it('sollte Link mit primary-Farbe haben', () => {
      const { container } = parseAndRender(STEP_6)
      const link = queryByDataId('Link', container).element
      // $primary = #3B82F6
      expect(link?.style.color).toBe('rgb(59, 130, 246)')
    })
  })

  // ============================================================
  // CodeBuilder Test (Utils-Feature)
  // ============================================================

  describe('CodeBuilder Utils', () => {
    it('sollte Code inkrementell aufbauen', () => {
      const builder = new CodeBuilder()
        .addToken('primary', '#3B82F6')
        .addToken('bg', '#1A1A1A')
        .addDefinition('Button: pad 12, bg $primary, rad 6')
        .addInstance('Button "Click"')

      const code = builder.build()

      expect(code).toContain('$primary: #3B82F6')
      expect(code).toContain('$bg: #1A1A1A')
      expect(code).toContain('Button: pad 12, bg $primary, rad 6')
      expect(code).toContain('Button "Click"')
    })

    it('sollte geklonten Builder unabhängig erweitern', () => {
      const base = new CodeBuilder()
        .addToken('primary', '#3B82F6')
        .addDefinition('Button: pad 12, bg $primary')

      const extended = base.clone()
        .addToken('secondary', '#666')
        .addInstance('Button "Extended"')

      // Original unverändert
      expect(base.build()).not.toContain('$secondary')
      expect(base.build()).not.toContain('Extended')

      // Extended hat beides
      expect(extended.build()).toContain('$primary')
      expect(extended.build()).toContain('$secondary')
      expect(extended.build()).toContain('Extended')
    })

    it('sollte gebauten Code parsen können', () => {
      const builder = new CodeBuilder()
        .addToken('bg', '#1A1A1A')
        .addDefinition('Card: pad 16, bg $bg, rad 8')
        .addInstance('Card\n  Text "Hello"')

      const code = builder.build()
      const result = validateStep(code)

      expect(result.parseSuccess).toBe(true)
      expect(result.renderSuccess).toBe(true)
    })
  })
})
