/**
 * @module condition-parser
 * @description Conditional Expression Parser - Parst Bedingungen und Vergleiche
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * SYNTAX-REFERENZ
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @syntax if $condition
 *   Einfache Variable als Bedingung (truthy/falsy check)
 *   Beispiel: if $isLoggedIn ... else ...
 *
 * @syntax if not $condition
 *   Negierte Bedingung (logisches NOT)
 *   Beispiel: if not $isActive ... else ...
 *
 * @syntax if $var OPERATOR value
 *   Vergleich mit Operator
 *   Beispiel: if $count > 0, if $status == "active"
 *
 * @syntax if $a OPERATOR $b
 *   Vergleich zwischen zwei Variablen
 *   Beispiel: if $currentPage == $targetPage
 *
 * @syntax if $a LOGIC $b
 *   Logische Verknüpfung mehrerer Bedingungen
 *   Beispiel: if $isLoggedIn and $hasAccess
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * VERGLEICHSOPERATOREN
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @operator ==    Gleichheit (loose equality)
 *   Beispiel: if $status == "active"
 *   Beispiel: if $count == 0
 *
 * @operator !=    Ungleichheit (loose inequality)
 *   Beispiel: if $user != null
 *   Beispiel: if $value != "empty"
 *
 * @operator >     Größer als
 *   Beispiel: if $age > 18
 *   Beispiel: if $price > 100
 *
 * @operator <     Kleiner als
 *   Beispiel: if $count < 10
 *   Beispiel: if $temperature < 0
 *
 * @operator >=    Größer oder gleich
 *   Beispiel: if $score >= 80
 *   Beispiel: if $items >= 1
 *
 * @operator <=    Kleiner oder gleich
 *   Beispiel: if $value <= 100
 *   Beispiel: if $tries <= 3
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * LOGISCHE OPERATOREN
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @operator not   Negation (logisches NOT)
 *   Invertiert den Wahrheitswert der Bedingung
 *   Beispiel: if not $isHidden
 *   Beispiel: if not $user.banned
 *
 * @operator and   Logisches UND (beide Bedingungen müssen wahr sein)
 *   Beispiel: if $isLoggedIn and $hasAccess
 *   Beispiel: if $count > 0 and $count <= 10
 *   Verkettung: if $a and $b and $c (links nach rechts)
 *
 * @operator or    Logisches ODER (mindestens eine Bedingung muss wahr sein)
 *   Beispiel: if $isAdmin or $isModerator
 *   Beispiel: if $status == "active" or $status == "pending"
 *   Verkettung: if $a or $b or $c (links nach rechts)
 *
 * @precedence Klammerung wird NICHT unterstützt - von links nach rechts
 *   if $a and $b or $c  → (($a and $b) or $c)
 *   Für komplexe Logik: Mehrere if-Blöcke verschachteln
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * KONDITIONELLE EIGENSCHAFTEN (PROPERTY CONDITIONALS)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @syntax if $condition then property value
 *   Eigenschaft wird nur gesetzt wenn Bedingung wahr
 *   Beispiel: Button if $isActive then background #3B82F6
 *
 * @syntax if $condition then property value else property value2
 *   If-Else für Eigenschaften (verschiedene Werte je nach Bedingung)
 *   Beispiel: Button if $isActive then bg #3B82F6 else bg #333
 *
 * @syntax if $condition then value else value2
 *   Kurzform ohne Property-Name-Wiederholung
 *   Beispiel: Badge if $count > 0 then #10B981 else #666
 *
 * @usage Inline in Komponenten-Zeilen, NICHT in Blöcken
 *   Button if $active then background #3B82F6 else background #333 "Click"
 *   Icon if $task.done then "check" else "circle"
 *   Text if $isError then color #EF4444 else color #10B981 $message
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * BLOCK-KONDITIONALE (IF-ELSE BLOCKS)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @syntax if $condition
 *          Component
 *        else
 *          OtherComponent
 *
 *   Komponenten werden nur gerendert wenn Bedingung wahr/falsch
 *
 * @example Einfaches If-Else
 *   if $isLoggedIn
 *     Avatar
 *   else
 *     Button "Login"
 *
 * @example Mit Vergleich
 *   if $count > 0
 *     Badge $count
 *   else
 *     Icon "empty"
 *
 * @example Mit logischen Operatoren
 *   if $user.active and not $user.banned
 *     Dashboard
 *   else
 *     Message "Access denied"
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * VARIABLE-TYPEN
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @variable $tokenRef       Token-Referenz (startet mit $)
 *   Beispiel: $isLoggedIn, $count, $status
 *   Type: TOKEN_REF
 *
 * @variable ComponentName   Komponenten-Name oder Property-Referenz
 *   Beispiel: Email.value, Submit.disabled, Panel.visible
 *   Type: COMPONENT_NAME
 *
 * @variable $obj.property   Verschachtelte Property-Zugriffe
 *   Beispiel: $user.name, $task.done, $item.count
 *   Wird als String gespeichert: "user.name"
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * WERTETYPEN (RECHTE SEITE VON VERGLEICHEN)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @value number     Numerische Werte
 *   Beispiel: if $count > 5
 *   Beispiel: if $price >= 100
 *
 * @value string     String-Literale (mit Anführungszeichen)
 *   Beispiel: if $status == "active"
 *   Beispiel: if $name != "Guest"
 *
 * @value boolean    Boolean-Literale
 *   Beispiel: if $visible == true
 *   Beispiel: if $disabled != false
 *
 * @value $token     Andere Variable (Token-Referenz)
 *   Beispiel: if $currentPage == $targetPage
 *   Beispiel: if $userCount > $maxUsers
 *
 * @value null       Null-Check
 *   Beispiel: if $user != null
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * AST-STRUKTUR
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @type ConditionExpr (Union Type)
 *
 * @variant VarCondition          Einfache Variable
 *   { type: 'var', name: string }
 *   Beispiel: $isLoggedIn → { type: 'var', name: '$isLoggedIn' }
 *
 * @variant NotCondition          Negierte Bedingung
 *   { type: 'not', operand: ConditionExpr }
 *   Beispiel: not $isActive → { type: 'not', operand: { type: 'var', name: '$isActive' } }
 *
 * @variant ComparisonCondition   Vergleich
 *   { type: 'comparison', left: VarCondition, operator: string, value: unknown }
 *   Beispiel: $count > 0 → { type: 'comparison', left: { type: 'var', name: '$count' }, operator: '>', value: 0 }
 *
 * @variant AndCondition          Logisches UND
 *   { type: 'and', left: ConditionExpr, right: ConditionExpr }
 *   Beispiel: $a and $b → { type: 'and', left: {...}, right: {...} }
 *
 * @variant OrCondition           Logisches ODER
 *   { type: 'or', left: ConditionExpr, right: ConditionExpr }
 *   Beispiel: $a or $b → { type: 'or', left: {...}, right: {...} }
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * VERWENDUNGSBEISPIELE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @example Einfache Bedingungen
 *   if $isLoggedIn                     // Truthy-Check
 *   if not $isHidden                   // Negation
 *   if $count > 0                      // Numerischer Vergleich
 *   if $status == "active"             // String-Vergleich
 *
 * @example Logische Verknüpfungen
 *   if $isLoggedIn and $hasAccess      // Beide müssen wahr sein
 *   if $isAdmin or $isModerator        // Mindestens eine muss wahr sein
 *   if $count > 0 and $count <= 10     // Bereichsprüfung
 *
 * @example Property-Konditionale
 *   Button if $active then bg #3B82F6 else bg #333
 *   Icon if $task.done then "check" else "circle"
 *   Badge if $count > 0 then #10B981 else #666
 *
 * @example Block-Konditionale
 *   if $user.active
 *     Dashboard
 *   else
 *     LoginForm
 *
 * @example Verschachtelte Properties
 *   if $user.role == "admin"
 *     AdminPanel
 *   if $task.status != "completed"
 *     EditButton
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * FEHLERBEHANDLUNG
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @warning P001: Unknown comparison operator
 *   Wird ausgegeben bei unbekannten Vergleichsoperatoren
 *   Beispiel: if $x === 5  // === nicht unterstützt, nur ==
 *   Vorschlag: Verwende ==, !=, >, <, >=, <=
 *
 * @recovery Partial Parsing
 *   Bei fehlendem rechten Operanden wird linker Teil zurückgegeben
 *   Beispiel: if $a and  → Gibt nur $a zurück
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * PARSER-FUNKTIONEN
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @function parseAtomicCondition
 *   Parst atomare Bedingungen (Variable, Negation, Vergleich)
 *   Input: ctx am Token-Anfang
 *   Output: ConditionExpr | null
 *
 * @function parseCondition
 *   Parst vollständige Bedingung mit logischen Operatoren
 *   Input: ctx am Token-Anfang
 *   Output: ConditionExpr | null
 *   Rekursiv für and/or-Verkettung
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

import type { ParserContext } from './parser-context'
import type { ConditionExpr } from './types'
import { isComparisonOperator } from './types'
import { parseValue } from './expression-parser'

/**
 * @doc parseAtomicCondition
 * @brief Parst atomare Bedingungen (Variable, Negation, Vergleich)
 * @input ctx am Token-Anfang (TOKEN_REF oder COMPONENT_NAME)
 * @output ConditionExpr | null
 *
 * @syntax $var                   → { type: 'var', name: '$var' }
 * @syntax not $var               → { type: 'not', operand: { type: 'var', name: '$var' } }
 * @syntax $var == value          → { type: 'comparison', left: { type: 'var', name: '$var' }, operator: '==', value }
 * @syntax ComponentName.prop > 5 → { type: 'comparison', left: { type: 'var', name: 'ComponentName.prop' }, operator: '>', value: 5 }
 *
 * @handles TOKEN_REF             Variable mit $ → parseValue für rechte Seite
 * @handles COMPONENT_NAME        Komponenten-Referenz → parseValue für rechte Seite
 * @handles CONTROL("not")        Negation → rekursiver Aufruf für Operand
 *
 * @warning P001                  Bei unbekanntem Vergleichsoperator
 * @returns null                  Wenn kein gültiger Token gefunden
 */
function parseAtomicCondition(ctx: ParserContext): ConditionExpr | null {
  const token = ctx.current()
  if (!token) return null

  // Handle 'not'
  if (token.type === 'CONTROL' && token.value === 'not') {
    ctx.advance() // consume 'not'
    const operand = parseAtomicCondition(ctx)
    if (!operand) return null
    return { type: 'not', operand }
  }

  // Handle variable reference ($isLoggedIn, $user.active)
  if (token.type === 'TOKEN_REF') {
    const varName = ctx.advance().value

    // Check for comparison operator
    if (ctx.current()?.type === 'OPERATOR') {
      const opToken = ctx.advance()
      const opValue = opToken.value
      if (!isComparisonOperator(opValue)) {
        ctx.addWarning(
          'P001',
          `Unknown comparison operator "${opValue}"`,
          opToken,
          `Valid operators: ==, !=, >, <, >=, <=`
        )
        return null
      }
      const rightValue = parseValue(ctx)
      return {
        type: 'comparison',
        left: { type: 'var', name: varName },
        operator: opValue,
        value: rightValue ?? undefined
      }
    }

    return { type: 'var', name: varName }
  }

  // Handle plain variable name (ComponentName.property or plain name)
  // Also handle UNKNOWN_ANIMATION and PROPERTY for field names in where clauses (e.g., "where done == false")
  if (token.type === 'COMPONENT_NAME' || token.type === 'UNKNOWN_ANIMATION' || token.type === 'PROPERTY') {
    const varName = ctx.advance().value

    // Check for comparison operator
    if (ctx.current()?.type === 'OPERATOR') {
      const opToken = ctx.advance()
      const opValue = opToken.value
      if (!isComparisonOperator(opValue)) {
        ctx.addWarning(
          'P001',
          `Unknown comparison operator "${opValue}"`,
          opToken,
          `Valid operators: ==, !=, >, <, >=, <=`
        )
        return null
      }
      const rightValue = parseValue(ctx)
      return {
        type: 'comparison',
        left: { type: 'var', name: varName },
        operator: opValue,
        value: rightValue ?? undefined
      }
    }

    return { type: 'var', name: varName }
  }

  return null
}

/**
 * @doc parseCondition
 * @brief Parst vollständige Bedingung mit logischen Operatoren (and, or)
 * @input ctx am Token-Anfang
 * @output ConditionExpr | null
 *
 * @syntax $a                     → { type: 'var', name: '$a' }
 * @syntax $a and $b              → { type: 'and', left: { type: 'var', name: '$a' }, right: { type: 'var', name: '$b' } }
 * @syntax $a or $b               → { type: 'or', left: { type: 'var', name: '$a' }, right: { type: 'var', name: '$b' } }
 * @syntax $a and $b and $c       → { type: 'and', left: { type: 'and', ... }, right: { type: 'var', name: '$c' } }
 *
 * @algorithm Rekursives Descent-Parsing
 *   1. Parse atomare Bedingung (links)
 *   2. Check für 'and' oder 'or'
 *   3. Wenn vorhanden: Parse rechte Seite rekursiv
 *   4. Build Baum (links nach rechts assoziativ)
 *
 * @precedence Keine Operator-Präzedenz - links nach rechts
 *   $a and $b or $c → (($a and $b) or $c)
 *   Rekursion rechts ermöglicht Verkettung
 *
 * @recovery Partial Return
 *   Wenn rechte Seite fehlt, wird linke Seite zurückgegeben
 *
 * @export Wird von parser.ts verwendet
 * @uses parseAtomicCondition für Operanden
 */
export function parseCondition(ctx: ParserContext): ConditionExpr | null {
  const left = parseAtomicCondition(ctx)
  if (!left) return null

  // Check for 'and' or 'or'
  const current = ctx.current()
  if (current?.type === 'CONTROL' && (current.value === 'and' || current.value === 'or')) {
    const operator = ctx.advance().value as 'and' | 'or'
    const right = parseCondition(ctx) // recursive to handle chains
    if (!right) return left // if no right side, just return left

    return {
      type: operator,
      left,
      right
    }
  }

  return left
}
