/**
 * Mock LLM for testing the LLM-guided analysis flow
 *
 * Simulates LLM responses without actual API calls.
 * Responses are matched by analyzing the image structure.
 */

import type { LLMInterface, LLMAnalysis } from './types'

// =============================================================================
// Mock Responses
// =============================================================================

const MOCK_RESPONSES: Record<string, LLMAnalysis> = {
  // Step 1.1: Single Button
  'single-button': {
    description: 'Ein einzelner Button in der Mitte des Bildes',
    elements: [
      {
        type: 'button',
        description: 'Blauer Button mit weißem Text',
        position: 'center',
        text: 'Speichern',
      },
    ],
    componentType: 'Button',
  },

  // Step 1.2: Button with Icon
  'button-with-icon': {
    description: 'Ein Button mit einem Icon links vom Text',
    elements: [
      {
        type: 'button',
        description: "Button mit Check-Icon und Text 'Bestätigen'",
        position: 'center',
        text: 'Bestätigen',
        children: [
          { type: 'icon', description: 'Check-Icon', position: 'left', iconName: 'check' },
          { type: 'text', description: 'Button-Text', position: 'right', text: 'Bestätigen' },
        ],
      },
    ],
    layout: { direction: 'horizontal', gap: 'small' },
    componentType: 'Button',
  },

  // Step 1.3: Input Field
  'input-field': {
    description: 'Ein Eingabefeld mit Placeholder-Text',
    elements: [
      {
        type: 'input',
        description: "Eingabefeld mit Placeholder 'Email eingeben...'",
        position: 'center',
        text: 'Email eingeben...',
      },
    ],
    componentType: 'Input',
  },

  // Step 1.4: Checkbox
  checkbox: {
    description: 'Eine Checkbox mit Label-Text',
    elements: [
      {
        type: 'checkbox',
        description: "Angekreuzte Checkbox mit Label 'Newsletter abonnieren'",
        position: 'center',
        text: 'Newsletter abonnieren',
      },
    ],
    componentType: 'Checkbox',
  },

  // Step 2.1: Button Group
  'button-group': {
    description: 'Zwei Buttons nebeneinander',
    elements: [
      {
        type: 'button',
        description: "Grauer 'Abbrechen' Button",
        position: 'left',
        text: 'Abbrechen',
      },
      {
        type: 'button',
        description: "Blauer 'Speichern' Button",
        position: 'right',
        text: 'Speichern',
      },
    ],
    layout: { direction: 'horizontal', gap: 'medium' },
  },

  // Step 2.2: Form Field with Label
  'form-field': {
    description: 'Ein Label über einem Eingabefeld',
    elements: [
      {
        type: 'text',
        description: "Label 'Email'",
        position: 'top',
        text: 'Email',
      },
      {
        type: 'input',
        description: 'Eingabefeld',
        position: 'bottom',
        text: 'name@example.com',
      },
    ],
    layout: { direction: 'vertical', gap: 'small' },
  },

  // Step 3.1: Card
  card: {
    description: 'Eine Card mit Titel, Beschreibung und Button',
    elements: [
      {
        type: 'container',
        description: 'Card-Container',
        position: 'center',
        children: [
          { type: 'text', description: 'Titel', position: 'top', text: 'Projekt Alpha' },
          {
            type: 'text',
            description: 'Beschreibung',
            position: 'center',
            text: 'Beschreibung des Projekts...',
          },
          { type: 'button', description: 'Action Button', position: 'bottom', text: 'Öffnen' },
        ],
      },
    ],
    layout: { direction: 'vertical', gap: 'medium' },
    needsRecursion: true,
  },

  // Step 3.2: Tabs
  tabs: {
    description: 'Eine Tab-Navigation mit 3 Tabs',
    elements: [
      { type: 'button', description: 'Aktiver Tab', position: 'left', text: 'Dashboard' },
      { type: 'button', description: 'Inaktiver Tab', position: 'center', text: 'Projekte' },
      { type: 'button', description: 'Inaktiver Tab', position: 'right', text: 'Settings' },
    ],
    layout: { direction: 'horizontal', gap: 'none' },
    componentType: 'Tabs',
  },

  // Step 3.3: Select/Dropdown
  select: {
    description: 'Ein Dropdown/Select-Feld mit Placeholder und Chevron-Icon',
    elements: [
      {
        type: 'select',
        description: "Select mit Placeholder 'Option wählen...'",
        position: 'center',
        text: 'Option wählen...',
      },
    ],
    componentType: 'Select',
  },

  // Fallback
  unknown: {
    description: 'Unbekannte UI-Struktur',
    elements: [
      {
        type: 'container',
        description: 'Container mit unbekanntem Inhalt',
        position: 'center',
      },
    ],
    needsRecursion: true,
  },
}

// =============================================================================
// Mock LLM Implementation
// =============================================================================

export class MockLLM implements LLMInterface {
  private responseKey: string

  constructor(responseKey: string = 'unknown') {
    this.responseKey = responseKey
  }

  setResponseKey(key: string): void {
    this.responseKey = key
  }

  async analyze(imageBuffer: Buffer, context?: string): Promise<LLMAnalysis> {
    // Simulate async behavior
    await new Promise(resolve => setTimeout(resolve, 10))

    const response = MOCK_RESPONSES[this.responseKey]
    if (response) {
      return response
    }

    return MOCK_RESPONSES['unknown']
  }
}

// =============================================================================
// Helper to create mock for specific test
// =============================================================================

export function createMockLLM(responseKey: string): MockLLM {
  return new MockLLM(responseKey)
}
