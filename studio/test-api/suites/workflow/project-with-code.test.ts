/**
 * Project with Code — Token, Component, Layout, Typography, Border, Form, Divider tests
 *
 * Uses api.dom.expect() for declarative DOM validation against rendered output.
 */

import { testWithSetup, describe } from '../../test-runner'
import type { TestCase, TestAPI } from '../../types'

export const projectWithCodeTests: TestCase[] = describe('Project with Code', [
  // --- Token Tests ---
  testWithSetup(
    'Color token applied to background',
    `primary.bg: #2271C1

Frame bg $primary, pad 16
  Text "Token Test"`,
    async (api: TestAPI) => {
      api.dom.expect('node-1', {
        tag: 'div',
        bg: '#2271C1',
        pad: 16,
        children: 1,
      })

      api.dom.expect('node-2', {
        tag: 'span',
        text: 'Token Test',
      })
    }
  ),

  testWithSetup(
    'Spacing tokens for pad and gap',
    `space.pad: 16
space.gap: 12

Frame pad $space, gap $space, bg #1a1a1a
  Button "A"
  Button "B"
  Button "C"`,
    async (api: TestAPI) => {
      api.dom.expect('node-1', {
        tag: 'div',
        bg: '#1a1a1a',
        pad: 16,
        gap: 12,
        ver: true,
        children: 3,
      })

      api.dom.expect('node-2', { tag: 'button', text: 'A' })
      api.dom.expect('node-3', { tag: 'button', text: 'B' })
      api.dom.expect('node-4', { tag: 'button', text: 'C' })
    }
  ),

  // --- Component Tests ---
  testWithSetup(
    'Component definition and usage',
    `Btn as Button: pad 12 24, rad 6, bg #2271C1, col white

Frame gap 12, pad 16, bg #1a1a1a
  Btn "Save"
  Btn "Cancel", bg #333`,
    async (api: TestAPI) => {
      api.dom.expect('node-1', {
        tag: 'div',
        bg: '#1a1a1a',
        pad: 16,
        gap: 12,
        children: 2,
      })

      api.dom.expect('node-2', {
        tag: 'button',
        text: 'Save',
        bg: '#2271C1',
        rad: 6,
        pad: [12, 24],
      })

      api.dom.expect('node-3', {
        tag: 'button',
        text: 'Cancel',
        bg: '#333333',
        rad: 6,
        pad: [12, 24],
      })
    }
  ),

  testWithSetup(
    'Component with "as" inherits primitive',
    `PrimaryBtn as Button: bg #2271C1, col white, pad 12 24, rad 6
DangerBtn as Button: bg #ef4444, col white, pad 12 24, rad 6

Frame gap 12, pad 16
  PrimaryBtn "Save"
  DangerBtn "Delete"`,
    async (api: TestAPI) => {
      api.dom.expect('node-2', {
        tag: 'button',
        text: 'Save',
        bg: '#2271C1',
        rad: 6,
      })

      api.dom.expect('node-3', {
        tag: 'button',
        text: 'Delete',
        bg: '#ef4444',
        rad: 6,
      })
    }
  ),

  // --- Layout Tests ---
  testWithSetup(
    'Horizontal layout with spread',
    `Frame hor, gap 16, pad 24, bg #1a1a1a, spread
  Text "Left", col white
  Text "Right", col white`,
    async (api: TestAPI) => {
      api.dom.expect('node-1', {
        tag: 'div',
        hor: true,
        spread: true,
        gap: 16,
        pad: 24,
        bg: '#1a1a1a',
        children: 2,
      })

      api.dom.expect('node-2', { text: 'Left' })
      api.dom.expect('node-3', { text: 'Right' })
    }
  ),

  testWithSetup(
    'Vertical layout with center',
    `Frame w 300, h 200, bg #1a1a1a, center
  Text "Centered", col white, fs 18
  Button "Click Me"`,
    async (api: TestAPI) => {
      api.dom.expect('node-1', {
        tag: 'div',
        w: 300,
        h: 200,
        bg: '#1a1a1a',
        center: true,
        children: 2,
      })

      api.dom.expect('node-2', {
        tag: 'span',
        text: 'Centered',
        fs: 18,
      })

      api.dom.expect('node-3', {
        tag: 'button',
        text: 'Click Me',
      })
    }
  ),

  testWithSetup(
    'Nested frames with different layouts',
    `Frame gap 16, pad 24, bg #0a0a0a
  Frame hor, gap 8, bg #1a1a1a, pad 12, rad 8
    Icon "star"
    Text "Featured", col white
  Frame gap 8, bg #1a1a1a, pad 12, rad 8
    Text "Description", col #888
    Button "Learn More"`,
    async (api: TestAPI) => {
      api.dom.expect('node-1', {
        tag: 'div',
        ver: true,
        gap: 16,
        pad: 24,
        bg: '#0a0a0a',
        children: 2,
      })

      api.dom.expect('node-2', {
        tag: 'div',
        hor: true,
        gap: 8,
        bg: '#1a1a1a',
        pad: 12,
        rad: 8,
        children: 2,
      })

      api.dom.expect('node-5', {
        tag: 'div',
        ver: true,
        gap: 8,
        bg: '#1a1a1a',
        pad: 12,
        rad: 8,
        children: 2,
      })
    }
  ),

  testWithSetup(
    'Wrap layout for responsive grid',
    `Frame hor, wrap, gap 16, pad 24, bg #1a1a1a
  Frame w 100, h 80, bg #2271C1, rad 8
  Frame w 100, h 80, bg #2271C1, rad 8
  Frame w 100, h 80, bg #2271C1, rad 8
  Frame w 100, h 80, bg #2271C1, rad 8`,
    async (api: TestAPI) => {
      api.dom.expect('node-1', {
        tag: 'div',
        hor: true,
        wrap: true,
        gap: 16,
        pad: 24,
        bg: '#1a1a1a',
        children: 4,
      })

      for (let i = 2; i <= 5; i++) {
        api.dom.expect(`node-${i}`, {
          tag: 'div',
          w: 100,
          h: 80,
          bg: '#2271C1',
          rad: 8,
        })
      }
    }
  ),

  // --- Typography Tests ---
  testWithSetup(
    'Text with typography styles',
    `Frame pad 16, bg #1a1a1a, gap 8
  Text "Bold Title", weight bold, fs 24, col white
  Text "Italic Subtitle", italic, fs 14, col #888
  Text "UPPERCASE", uppercase, fs 12, col #666`,
    async (api: TestAPI) => {
      api.dom.expect('node-2', {
        text: 'Bold Title',
        weight: 'bold',
        fs: 24,
      })

      api.dom.expect('node-3', {
        text: 'Italic Subtitle',
        italic: true,
        fs: 14,
      })

      api.dom.expect('node-4', {
        text: 'UPPERCASE',
        uppercase: true,
        fs: 12,
      })
    }
  ),

  // --- Border & Shadow Tests ---
  testWithSetup(
    'Border and shadow styles',
    `Frame pad 16, bg #1a1a1a, gap 16
  Frame w 100, h 100, bg #2271C1, rad 8, shadow md
  Frame w 100, h 100, bg white, bor 2, boc #2271C1, rad 12`,
    async (api: TestAPI) => {
      api.dom.expect('node-2', {
        w: 100,
        h: 100,
        bg: '#2271C1',
        rad: 8,
        shadow: true,
      })

      api.dom.expect('node-3', {
        w: 100,
        h: 100,
        rad: 12,
        bor: 2,
      })
    }
  ),

  // --- Form Element Tests ---
  testWithSetup(
    'Input and Textarea elements',
    `Frame gap 12, pad 16, bg #1a1a1a, w 300
  Input placeholder "Enter your name..."
  Textarea placeholder "Write a message..."`,
    async (api: TestAPI) => {
      api.dom.expect('node-1', {
        tag: 'div',
        gap: 12,
        pad: 16,
        w: 300,
        children: 2,
      })

      api.dom.expect('node-2', {
        tag: 'input',
        placeholder: 'Enter your name...',
      })

      api.dom.expect('node-3', {
        tag: 'textarea',
        placeholder: 'Write a message...',
      })
    }
  ),

  // --- Divider Test ---
  testWithSetup(
    'Divider renders as hr',
    `Frame gap 8, pad 16, bg #1a1a1a
  Text "Above"
  Divider
  Text "Below"`,
    async (api: TestAPI) => {
      api.dom.expect('node-1', {
        children: 3,
      })

      api.dom.expect('node-2', { text: 'Above' })
      api.dom.expect('node-3', { tag: 'hr' })
      api.dom.expect('node-4', { text: 'Below' })
    }
  ),
])
