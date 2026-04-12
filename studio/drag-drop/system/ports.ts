/**
 * Drag & Drop Ports
 *
 * Interfaces für alle externen Abhängigkeiten.
 * Diese Ports ermöglichen vollständige Testbarkeit durch Dependency Injection.
 *
 * Das System ist nach dem "Ports & Adapters" (Hexagonal Architecture) Pattern aufgebaut:
 * - Ports = Interfaces (was das System braucht)
 * - Adapters = Implementierungen (wie es konkret gemacht wird)
 *
 * Tests verwenden Mock-Adapters, Produktion verwendet DOM-Adapters.
 */

import type {
  DragSource,
  DropTarget,
  DropResult,
  Point,
  Rect,
  LayoutType,
  Direction,
  VisualHint,
  ExecutionResult,
} from '../types'
import type { ChildRect } from '../strategies/types'

// ============================================
// Layout Port
// ============================================

/**
 * Zugriff auf Layout-Informationen (Rect-Daten).
 *
 * Primär aus dem gecachten layoutInfo State,
 * Fallback auf getBoundingClientRect.
 */
export interface LayoutPort {
  /**
   * Rechteck eines Elements via Node-ID.
   * Nutzt layoutInfo wenn verfügbar, sonst getBoundingClientRect.
   */
  getRect(nodeId: string): Rect | null

  /**
   * Rechtecke aller direkten Kinder eines Containers.
   * Filtert nur Kinder mit gültiger Node-ID.
   */
  getChildRects(parentElement: HTMLElement): ChildRect[]

  /**
   * Container-Rechteck für ein Element.
   */
  getContainerRect(element: HTMLElement): Rect | null
}

// ============================================
// Style Port
// ============================================

/**
 * Zugriff auf Style-Informationen (CSS Computed Styles).
 *
 * Ermöglicht Layout-Typ-Erkennung ohne direkte DOM-Kopplung.
 */
export interface StylePort {
  /**
   * Layout-Typ eines Elements erkennen (flex, positioned, none).
   */
  getLayoutType(element: HTMLElement): LayoutType

  /**
   * Flex-Direction erkennen (horizontal, vertical).
   */
  getDirection(element: HTMLElement): Direction

  /**
   * Element unter einem Punkt finden.
   * Wrapper um document.elementFromPoint.
   */
  elementFromPoint(x: number, y: number): HTMLElement | null

  /**
   * Computed Style eines Elements.
   */
  getComputedStyle(element: HTMLElement): CSSStyleDeclaration
}

// ============================================
// Event Port
// ============================================

/**
 * Event-Binding für Drag & Drop.
 *
 * Abstrahiert die Event-Quellen (Pragmatic DnD, Native HTML5, Keyboard).
 */
export interface EventPort {
  /**
   * Registriert Drag-Start Handler.
   * Wird bei mousedown/dragstart auf draggable Elementen aufgerufen.
   * @returns Cleanup-Funktion zum Entfernen des Handlers
   */
  onDragStart(handler: DragStartHandler): CleanupFn

  /**
   * Registriert Drag-Move Handler.
   * Wird bei mousemove/drag während des Drags aufgerufen.
   */
  onDragMove(handler: DragMoveHandler): CleanupFn

  /**
   * Registriert Drag-End Handler.
   * Wird bei mouseup/drop/dragend aufgerufen.
   */
  onDragEnd(handler: DragEndHandler): CleanupFn

  /**
   * Registriert Drag-Cancel Handler.
   * Wird bei Escape-Taste oder Verlassen des Fensters aufgerufen.
   */
  onDragCancel(handler: DragCancelHandler): CleanupFn

  /**
   * Registriert Key-Down Handler für eine bestimmte Taste.
   */
  onKeyDown(key: string, handler: KeyHandler): CleanupFn

  /**
   * Registriert Key-Up Handler für eine bestimmte Taste.
   */
  onKeyUp(key: string, handler: KeyHandler): CleanupFn
}

export type DragStartHandler = (source: DragSource, cursor: Point) => void
export type DragMoveHandler = (cursor: Point) => void
export type DragEndHandler = () => void
export type DragCancelHandler = () => void
export type KeyHandler = () => void
export type CleanupFn = () => void

// ============================================
// Extended Event Port (with Drag Source Registration)
// ============================================

/**
 * Extended Event Port with drag source registration.
 *
 * Adds the ability to register canvas elements as draggable.
 * Used by the DOM adapter to integrate with Pragmatic DnD.
 */
export interface ExtendedEventPort extends EventPort {
  /**
   * Register a canvas element as draggable.
   * @returns Cleanup function to remove the draggable behavior
   */
  registerCanvasDrag(nodeId: string, element: HTMLElement): CleanupFn

  /**
   * Register a palette item as draggable.
   * @returns Cleanup function to remove the draggable behavior
   */
  registerPaletteDrag(element: HTMLElement, data: {
    componentId?: string
    componentName: string
    properties?: string
    textContent?: string
    children?: any[]
  }): CleanupFn
}

// ============================================
// Visual Port
// ============================================

/**
 * Visuelles Feedback während des Drag-Vorgangs.
 *
 * Zeigt Insertion-Lines, Ghost-Indicators und Outlines an.
 */
export interface VisualPort {
  /**
   * Zeigt den Insertion-Indicator (blaue Linie oder Ghost).
   */
  showIndicator(hint: VisualHint): void

  /**
   * Zeigt die Parent-Outline (gestrichelter Rahmen).
   */
  showOutline(rect: Rect): void

  /**
   * Versteckt alle visuellen Elemente.
   */
  hideAll(): void
}

// ============================================
// Execution Port
// ============================================

/**
 * Ausführung des Drop-Vorgangs.
 *
 * Modifiziert den Code basierend auf dem DropResult.
 */
export interface ExecutionPort {
  /**
   * Führt den Drop aus.
   * - Für Palette-Items: Fügt neuen Code ein
   * - Für Canvas-Elemente: Verschiebt Code
   * - Mit Alt-Key: Dupliziert statt verschieben
   *
   * @returns ExecutionResult mit success-Status
   */
  execute(source: DragSource, result: DropResult, isAltKey: boolean): ExecutionResult

  /**
   * Prüft ob Duplicate erlaubt ist (Alt+Drop).
   */
  canDuplicate(source: DragSource): boolean
}

// ============================================
// Target Detection Port
// ============================================

/**
 * Erkennung von Drop-Targets.
 *
 * Findet das passende Target unter dem Cursor und berechnet das DropResult.
 */
export interface TargetDetectionPort {
  /**
   * Findet das DropTarget unter dem Cursor.
   * Traversiert DOM-Hierarchie aufwärts bis ein gültiges Target gefunden wird.
   *
   * @returns DropTarget oder null wenn kein gültiges Target
   */
  findTarget(cursor: Point, source: DragSource): DropTarget | null

  /**
   * Berechnet das DropResult für ein Target.
   * Verwendet die passende Strategy basierend auf Layout-Typ.
   */
  calculateResult(
    cursor: Point,
    target: DropTarget,
    source: DragSource,
    childRects: ChildRect[],
    containerRect: Rect
  ): DropResult

  /**
   * Berechnet den Visual Hint für das aktuelle Result.
   */
  getVisualHint(
    result: DropResult,
    childRects: ChildRect[],
    containerRect: Rect
  ): VisualHint | null

  /**
   * Prüft ob ein Drop auf einen Container-Sibling umgeleitet werden soll.
   *
   * Wenn der Cursor knapp unter einem Flex-Container ist, wird der Drop
   * ans Ende dieses Containers umgeleitet statt vor das nächste Sibling.
   *
   * @returns Neues Target und Result, oder null wenn keine Umleitung
   */
  checkContainerRedirect?(
    cursor: Point,
    target: DropTarget,
    result: DropResult,
    childRects: ChildRect[]
  ): { target: DropTarget; result: DropResult } | null
}

// ============================================
// Combined System Ports
// ============================================

/**
 * Alle Ports die das DragDropSystem benötigt.
 *
 * Wird bei der Konstruktion des Systems injiziert.
 */
export interface DragDropPorts {
  layout: LayoutPort
  style: StylePort
  events: EventPort
  visual: VisualPort
  execution: ExecutionPort
  targetDetection: TargetDetectionPort
}
