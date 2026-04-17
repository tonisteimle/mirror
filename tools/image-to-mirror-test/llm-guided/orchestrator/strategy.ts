/**
 * Orchestrator Strategy
 *
 * Defines how the LLM should systematically analyze an image.
 * The LLM follows this strategy and calls tools as needed.
 */

import type { Bounds, Region, LayoutAnalysis } from './tools'

// =============================================================================
// Analysis State (what the LLM builds up)
// =============================================================================

export interface AnalysisNode {
  id: string
  type: 'container' | 'text' | 'button' | 'input' | 'icon' | 'image' | 'unknown'
  bounds: Bounds

  // Visual properties (from tools)
  backgroundColor?: string
  textColor?: string
  borderRadius?: number
  borderWidth?: number
  borderColor?: string

  // Content
  text?: string
  iconName?: string

  // Layout
  layout?: 'horizontal' | 'vertical' | 'stacked'
  gap?: number
  padding?: { top: number; right: number; bottom: number; left: number }

  // Children
  children?: AnalysisNode[]

  // Semantic hints
  role?: string // heading, label, action, navigation, etc.
  componentType?: string // Button, Card, Input, etc.
}

export interface AnalysisResult {
  root: AnalysisNode
  derivedRules: string[]
  mirrorCode: string
}

// =============================================================================
// Strategy Steps (what the LLM should do)
// =============================================================================

export const STRATEGY_PROMPT = `
Du analysierst ein UI-Bild systematisch. Gehe Schritt für Schritt vor:

## PHASE 1: Hauptstruktur erkennen
1. Rufe findRegions() auf um die Hauptbereiche zu finden
2. Klassifiziere jeden Bereich: Header? Sidebar? Content? Card?
3. Notiere die Hintergrundfarben und ungefähren Größen

## PHASE 2: Pro Region tiefer gehen
Für jede Region:
1. Rufe findRegions(bounds) auf um Kinder zu finden
2. Rufe analyzeLayout(children) auf um das Layout zu bestimmen
3. Notiere: horizontal/vertikal? Welcher Gap? Alignment?

## PHASE 3: Elemente klassifizieren
Für jedes Blatt-Element:
1. Ist es Text? (dünn, breit) → detectTextRegion()
2. Ist es ein Button? (Hintergrundfarbe + Text)
3. Ist es ein Input? (Border, heller Hintergrund)
4. Ist es ein Icon? (klein, quadratisch)

## PHASE 4: Präzise Werte messen
1. Rufe getColor() für wichtige Positionen auf
2. Rufe measureBorderRadius() für gerundete Ecken auf
3. Rufe measureGap() zwischen Geschwister-Elementen auf

## PHASE 5: Regeln ableiten
1. Sammle alle Gaps → Gibt es ein konsistentes Gap-System?
2. Sammle alle Radien → Einheitlicher Radius?
3. Sammle alle Farben → Farbpalette?
4. Rufe deriveRules() auf

## PHASE 6: Mirror-Code generieren
Baue den Code von außen nach innen auf:
- Äußerster Container zuerst
- Layout-Properties (hor, gap)
- Styling (bg, rad, pad)
- Kinder eingerückt

## OUTPUT FORMAT
Gib am Ende aus:
1. Den generierten Mirror-Code
2. Die abgeleiteten Regeln (potentielle Tokens)
`

// =============================================================================
// Tool Call Interface (for LLM to use)
// =============================================================================

export interface ToolCall {
  tool:
    | 'findRegions'
    | 'getColor'
    | 'measureGap'
    | 'analyzeLayout'
    | 'detectTextRegion'
    | 'measureBorderRadius'
    | 'deriveRules'
    | 'sampleColors'
  params: Record<string, any>
}

export interface ToolResult {
  tool: string
  result: any
}

// =============================================================================
// Code Generator (from AnalysisNode to Mirror)
// =============================================================================

export function generateMirrorFromNode(node: AnalysisNode, indent = 0): string {
  const prefix = '  '.repeat(indent)
  const lines: string[] = []

  // Determine primitive
  let primitive = 'Frame'
  const props: string[] = []

  switch (node.type) {
    case 'text':
      primitive = 'Text'
      if (node.text) props.push(`"${node.text}"`)
      break
    case 'button':
      primitive = 'Button'
      if (node.text) props.push(`"${node.text}"`)
      break
    case 'input':
      primitive = 'Input'
      if (node.text) props.push(`placeholder "${node.text}"`)
      break
    case 'icon':
      primitive = 'Icon'
      if (node.iconName) props.push(`"${node.iconName}"`)
      break
    default:
      primitive = 'Frame'
  }

  // Layout
  if (node.layout === 'horizontal') props.push('hor')
  if (node.gap && node.gap > 0) props.push(`gap ${node.gap}`)

  // Size (only for non-text containers)
  if (node.type === 'container' && node.bounds.width > 0) {
    // Only add size if it seems intentional (not full-width)
    if (node.bounds.width < 300) {
      props.push(`w ${node.bounds.width}`)
    }
  }

  // Background
  if (node.backgroundColor && node.backgroundColor !== '#ffffff') {
    props.push(`bg ${node.backgroundColor}`)
  }

  // Text color
  if (node.textColor) {
    if (node.textColor === '#ffffff') {
      props.push('col white')
    } else if (node.textColor !== '#000000') {
      props.push(`col ${node.textColor}`)
    }
  }

  // Border
  if (node.borderWidth && node.borderWidth > 0) {
    props.push(`bor ${node.borderWidth}`)
    if (node.borderColor) props.push(`boc ${node.borderColor}`)
  }

  // Radius
  if (node.borderRadius && node.borderRadius > 0) {
    props.push(`rad ${node.borderRadius}`)
  }

  // Padding
  if (node.padding) {
    const { top, right, bottom, left } = node.padding
    if (top === right && right === bottom && bottom === left && top > 0) {
      props.push(`pad ${top}`)
    } else if (top === bottom && left === right && (top > 0 || left > 0)) {
      props.push(`pad ${top} ${right}`)
    }
  }

  // Build line
  const line =
    props.length > 0 ? `${prefix}${primitive} ${props.join(', ')}` : `${prefix}${primitive}`
  lines.push(line)

  // Children
  if (node.children) {
    for (const child of node.children) {
      lines.push(generateMirrorFromNode(child, indent + 1))
    }
  }

  return lines.join('\n')
}
