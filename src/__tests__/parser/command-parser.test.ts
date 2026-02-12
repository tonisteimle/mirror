/**
 * Command Parser Tests
 *
 * Tests for selection command parsing:
 * - Modify: :id property value
 * - Add child: :id ComponentName "content"
 * - Add before/after: :id after/before ComponentName "content"
 */

import { describe, it, expect } from 'vitest'
import { parseSelectionCommand } from '../../parser/command-parser'
import {
  token,
  createContextFromTokens,
  createContextWithRegistry,
  createComponentTemplate,
} from '../kit/ast-builders'

describe('command-parser', () => {
  describe('parseSelectionCommand', () => {
    describe('modify commands', () => {
      it('parses modify command with number value', () => {
        const tokens = [
          token.property('w'),
          token.number('200'),
          token.eof(),
        ]
        const ctx = createContextFromTokens(tokens)

        const result = parseSelectionCommand(ctx, 'btn1')

        expect(result).toEqual({
          type: 'modify',
          targetId: 'btn1',
          property: 'w',
          value: 200,
        })
      })

      it('parses modify command with color value', () => {
        const tokens = [
          token.property('bg'),
          token.color('#F00'),
          token.eof(),
        ]
        const ctx = createContextFromTokens(tokens)

        const result = parseSelectionCommand(ctx, 'card1')

        expect(result).toEqual({
          type: 'modify',
          targetId: 'card1',
          property: 'bg',
          value: '#F00',
        })
      })

      it('parses modify command with token reference', () => {
        const tokens = [
          token.property('bg'),
          token.tokenRef('primary'),
          token.eof(),
        ]
        const ctx = createContextFromTokens(tokens)
        ctx.designTokens.set('primary', '#3B82F6')

        const result = parseSelectionCommand(ctx, 'box1')

        expect(result).toEqual({
          type: 'modify',
          targetId: 'box1',
          property: 'bg',
          value: '#3B82F6',
        })
      })

      it('parses modify command with component property reference', () => {
        const tokens = [
          token.property('rad'),
          token.tokenRef('Card.rad'),
          token.eof(),
        ]
        const registry = new Map([
          ['Card', createComponentTemplate({ properties: { rad: 8 } })],
        ])
        const ctx = createContextWithRegistry(tokens, { registry })

        const result = parseSelectionCommand(ctx, 'box1')

        expect(result).toEqual({
          type: 'modify',
          targetId: 'box1',
          property: 'rad',
          value: 8,
        })
      })

      it('returns null for modify command with undefined token', () => {
        const tokens = [
          token.property('bg'),
          token.tokenRef('undefined_token'),
          token.eof(),
        ]
        const ctx = createContextFromTokens(tokens)

        const result = parseSelectionCommand(ctx, 'box1')

        expect(result).toBeNull()
      })

      it('returns null for property without value', () => {
        const tokens = [
          token.property('bg'),
          token.eof(),
        ]
        const ctx = createContextFromTokens(tokens)

        const result = parseSelectionCommand(ctx, 'box1')

        expect(result).toBeNull()
      })
    })

    describe('addChild commands', () => {
      it('parses add child command with component name', () => {
        const tokens = [
          token.component('Button'),
          token.eof(),
        ]
        const ctx = createContextFromTokens(tokens)

        const result = parseSelectionCommand(ctx, 'container1')

        expect(result).toEqual({
          type: 'addChild',
          targetId: 'container1',
          component: {
            type: 'component',
            name: 'Button',
            properties: {},
            children: [],
          },
        })
      })

      it('parses add child command with content', () => {
        const tokens = [
          token.component('Text'),
          token.string('Hello World'),
          token.eof(),
        ]
        const ctx = createContextFromTokens(tokens)

        const result = parseSelectionCommand(ctx, 'box1')

        expect(result).toEqual({
          type: 'addChild',
          targetId: 'box1',
          component: {
            type: 'component',
            name: 'Text',
            properties: {},
            children: [],
            content: 'Hello World',
          },
        })
      })

      it('parses add child command with properties', () => {
        const tokens = [
          token.component('Box'),
          token.property('w'),
          token.number('100'),
          token.property('h'),
          token.number('50'),
          token.eof(),
        ]
        const ctx = createContextFromTokens(tokens)

        const result = parseSelectionCommand(ctx, 'container1')

        expect(result).toEqual({
          type: 'addChild',
          targetId: 'container1',
          component: {
            type: 'component',
            name: 'Box',
            properties: { w: 100, h: 50 },
            children: [],
          },
        })
      })

      it('parses add child command with boolean property', () => {
        const tokens = [
          token.component('Button'),
          token.property('disabled'),
          token.eof(),
        ]
        const ctx = createContextFromTokens(tokens)

        const result = parseSelectionCommand(ctx, 'form1')

        expect(result).toEqual({
          type: 'addChild',
          targetId: 'form1',
          component: {
            type: 'component',
            name: 'Button',
            properties: { disabled: true },
            children: [],
          },
        })
      })

      it('parses add child command with full definition', () => {
        const tokens = [
          token.component('Button'),
          token.property('w'),
          token.number('200'),
          token.property('bg'),
          token.color('#00F'),
          token.string('Click Me'),
          token.eof(),
        ]
        const ctx = createContextFromTokens(tokens)

        const result = parseSelectionCommand(ctx, 'panel1')

        expect(result).toEqual({
          type: 'addChild',
          targetId: 'panel1',
          component: {
            type: 'component',
            name: 'Button',
            properties: { w: 200, bg: '#00F' },
            children: [],
            content: 'Click Me',
          },
        })
      })

      it('applies template when component has no definition', () => {
        const tokens = [
          token.component('PrimaryButton'),
          token.eof(),
        ]
        const registry = new Map([
          ['PrimaryButton', createComponentTemplate({
            properties: { bg: '#3B82F6', col: '#FFF' },
          })],
        ])
        const ctx = createContextWithRegistry(tokens, { registry })

        const result = parseSelectionCommand(ctx, 'form1')

        expect(result).toEqual({
          type: 'addChild',
          targetId: 'form1',
          component: {
            type: 'component',
            name: 'PrimaryButton',
            properties: { bg: '#3B82F6', col: '#FFF' },
            children: [],
          },
        })
      })

      it('does not apply template when component has inline definition', () => {
        const tokens = [
          token.component('PrimaryButton'),
          token.property('pad'),
          token.number('16'),
          token.eof(),
        ]
        const registry = new Map([
          ['PrimaryButton', createComponentTemplate({
            properties: { bg: '#3B82F6' },
          })],
        ])
        const ctx = createContextWithRegistry(tokens, { registry })

        const result = parseSelectionCommand(ctx, 'form1')

        expect(result).toEqual({
          type: 'addChild',
          targetId: 'form1',
          component: {
            type: 'component',
            name: 'PrimaryButton',
            properties: { pad: 16 },
            children: [],
          },
        })
      })
    })

    describe('addAfter commands', () => {
      it('parses add after command', () => {
        const tokens = [
          token.keyword('after'),
          token.component('Divider'),
          token.eof(),
        ]
        const ctx = createContextFromTokens(tokens)

        const result = parseSelectionCommand(ctx, 'header1')

        expect(result).toEqual({
          type: 'addAfter',
          targetId: 'header1',
          component: {
            type: 'component',
            name: 'Divider',
            properties: {},
            children: [],
          },
        })
      })

      it('parses add after command with properties', () => {
        const tokens = [
          token.keyword('after'),
          token.component('Spacer'),
          token.property('h'),
          token.number('20'),
          token.eof(),
        ]
        const ctx = createContextFromTokens(tokens)

        const result = parseSelectionCommand(ctx, 'title1')

        expect(result).toEqual({
          type: 'addAfter',
          targetId: 'title1',
          component: {
            type: 'component',
            name: 'Spacer',
            properties: { h: 20 },
            children: [],
          },
        })
      })

      it('parses add after command with properties and content', () => {
        const tokens = [
          token.keyword('after'),
          token.component('Text'),
          token.property('col'),
          token.color('#666'),
          token.string('Footer note'),
          token.eof(),
        ]
        const ctx = createContextFromTokens(tokens)

        const result = parseSelectionCommand(ctx, 'content1')

        expect(result).toEqual({
          type: 'addAfter',
          targetId: 'content1',
          component: {
            type: 'component',
            name: 'Text',
            properties: { col: '#666' },
            children: [],
            content: 'Footer note',
          },
        })
      })
    })

    describe('addBefore commands', () => {
      it('parses add before command', () => {
        const tokens = [
          token.keyword('before'),
          token.component('Header'),
          token.eof(),
        ]
        const ctx = createContextFromTokens(tokens)

        const result = parseSelectionCommand(ctx, 'content1')

        expect(result).toEqual({
          type: 'addBefore',
          targetId: 'content1',
          component: {
            type: 'component',
            name: 'Header',
            properties: {},
            children: [],
          },
        })
      })

      it('parses add before command with properties', () => {
        const tokens = [
          token.keyword('before'),
          token.component('Icon'),
          token.property('w'),
          token.number('24'),
          token.property('h'),
          token.number('24'),
          token.eof(),
        ]
        const ctx = createContextFromTokens(tokens)

        const result = parseSelectionCommand(ctx, 'label1')

        expect(result).toEqual({
          type: 'addBefore',
          targetId: 'label1',
          component: {
            type: 'component',
            name: 'Icon',
            properties: { w: 24, h: 24 },
            children: [],
          },
        })
      })
    })

    describe('edge cases', () => {
      it('returns null for empty token stream', () => {
        const tokens = [token.eof()]
        const ctx = createContextFromTokens(tokens)

        const result = parseSelectionCommand(ctx, 'box1')

        expect(result).toBeNull()
      })

      it('returns null for keyword without component name', () => {
        const tokens = [
          token.keyword('after'),
          token.eof(),
        ]
        const ctx = createContextFromTokens(tokens)

        const result = parseSelectionCommand(ctx, 'box1')

        expect(result).toBeNull()
      })

      it('returns null for invalid token type', () => {
        const tokens = [
          token.string('not a valid command'),
          token.eof(),
        ]
        const ctx = createContextFromTokens(tokens)

        const result = parseSelectionCommand(ctx, 'box1')

        expect(result).toBeNull()
      })

      it('stops parsing at newline', () => {
        const tokens = [
          token.component('Button'),
          token.property('bg'),
          token.color('#3B82F6'),
          token.newline(),
          token.property('w'),
          token.number('100'),
          token.eof(),
        ]
        const ctx = createContextFromTokens(tokens)

        const result = parseSelectionCommand(ctx, 'form1')

        expect(result).toEqual({
          type: 'addChild',
          targetId: 'form1',
          component: {
            type: 'component',
            name: 'Button',
            properties: { bg: '#3B82F6' },
            children: [],
          },
        })
      })
    })
  })
})
