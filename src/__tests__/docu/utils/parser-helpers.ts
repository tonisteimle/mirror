/**
 * Parser-Hilfsfunktionen für Mirror Dokumentations-Tests
 */

import { parse } from '../../../parser/parser'

export type ParseResult = ReturnType<typeof parse>
export type ASTNode = NonNullable<ParseResult['nodes']>[number]

export interface StateDefinition {
  name: string
  properties: Record<string, unknown>
  children?: unknown[]
}

export interface EventHandler {
  event: string
  actions: Array<{ type: string; [key: string]: unknown }>
}

/**
 * Holt den ersten Node aus dem Parse-Ergebnis
 */
export function getFirstNode(result: ParseResult): ASTNode | undefined {
  return result.nodes?.[0]
}

/**
 * Holt alle States eines Nodes als typisiertes Array
 */
export function getStates(node: ASTNode | undefined): StateDefinition[] {
  return (node?.states as StateDefinition[]) || []
}

/**
 * Findet einen State by Name
 */
export function getState(
  node: ASTNode | undefined,
  stateName: string
): StateDefinition | undefined {
  return getStates(node).find(s => s.name === stateName)
}

/**
 * Prüft, ob ein State existiert
 */
export function hasState(node: ASTNode | undefined, stateName: string): boolean {
  return getState(node, stateName) !== undefined
}

/**
 * Holt alle Event-Handler eines Nodes als typisiertes Array
 */
export function getEventHandlers(node: ASTNode | undefined): EventHandler[] {
  return ((node as any)?.eventHandlers as EventHandler[]) || []
}

/**
 * Findet einen Event-Handler by Event-Name
 */
export function getEventHandler(
  node: ASTNode | undefined,
  eventName: string
): EventHandler | undefined {
  return getEventHandlers(node).find(h => h.event === eventName)
}

/**
 * Prüft, ob ein Event-Handler existiert
 */
export function hasEventHandler(
  node: ASTNode | undefined,
  eventName: string
): boolean {
  return getEventHandler(node, eventName) !== undefined
}

/**
 * Prüft, ob ein Event-Handler eine bestimmte Action hat
 */
export function hasAction(
  node: ASTNode | undefined,
  eventName: string,
  actionType: string
): boolean {
  const handler = getEventHandler(node, eventName)
  return handler?.actions?.some(a => a.type === actionType) ?? false
}

/**
 * Filtert Parse-Fehler (ohne Warnings)
 */
export function getParseErrors(result: ParseResult): Error[] {
  return (result.errors || []).filter(e => {
    const msg = (e as any).message || String(e)
    return !msg.startsWith('Warning:')
  }) as Error[]
}

/**
 * Filtert Syntax-Warnings
 */
export function getSyntaxWarnings(result: ParseResult): Error[] {
  return (result.errors || []).filter(e => {
    const msg = (e as any).message || String(e)
    return msg.includes('Unexpected token')
  }) as Error[]
}

/**
 * Prüft, ob das Parse-Ergebnis fehlerfrei ist
 */
export function isParseSuccessful(result: ParseResult): boolean {
  return getParseErrors(result).length === 0
}

/**
 * Holt den Text-Content eines Nodes
 */
export function getTextContent(node: ASTNode | undefined): string | undefined {
  // Content kann an verschiedenen Stellen sein
  if ((node as any)?.content) {
    return (node as any).content
  }
  if (node?.properties?.content) {
    return String(node.properties.content)
  }
  if (node?.properties?.text) {
    return String(node.properties.text)
  }
  // Suche in children nach _text Node
  const textNode = node?.children?.find((c: any) => c.name === '_text')
  return (textNode as any)?.content
}

/**
 * Holt eine Property mit Fallback
 */
export function getProperty<T = unknown>(
  node: ASTNode | undefined,
  key: string,
  fallback?: T
): T | undefined {
  return (node?.properties?.[key] as T) ?? fallback
}
