/**
 * Mirror DSL PEG Grammar
 *
 * Generated from GRAMMAR.md EBNF specification.
 * Used for grammar verification and equivalence testing.
 */

{{
  // Track indentation levels
  let indentStack = [0];

  function currentIndent() {
    return indentStack[indentStack.length - 1];
  }

  function pushIndent(level) {
    indentStack.push(level);
  }

  function popIndent() {
    if (indentStack.length > 1) {
      indentStack.pop();
    }
  }

  function resetIndent() {
    indentStack = [0];
  }
}}

// =============================================================================
// Top Level
// =============================================================================

Program
  = statements:Statement* { return { type: 'Program', statements: statements.filter(s => s !== null) }; }

Statement
  = TokenDefinition
  / ComponentDefinition
  / ComponentInstance
  / EventsBlock
  / Comment
  / BlankLine { return null; }

BlankLine
  = _ NEWLINE { return null; }

// =============================================================================
// Token Definitions
// =============================================================================

TokenDefinition
  = _ name:TOKEN_VAR_DEF _ value:TokenValue _ NEWLINE?
    { return { type: 'TokenDefinition', name: name, value: value }; }

TokenValue
  = COLOR
  / NUMBER
  / STRING
  / TOKEN_REF
  / IDENTIFIER

// =============================================================================
// Component Definitions
// =============================================================================

ComponentDefinition
  = _ name:COMPONENT_DEF inherit:InheritClause? _ props:Properties? children:Children?
    {
      return {
        type: 'ComponentDefinition',
        name: name,
        inheritsFrom: inherit,
        properties: props || [],
        children: children || []
      };
    }

InheritClause
  = _ parent:COMPONENT_NAME _ { return parent; }

// =============================================================================
// Component Instances
// =============================================================================

ComponentInstance
  = _ !RESERVED_WORD name:COMPONENT_NAME _ named:NamedClause? _ props:Properties? _ content:STRING? _ NEWLINE? children:Children?
    {
      return {
        type: 'ComponentInstance',
        name: name,
        instanceName: named,
        properties: props || [],
        content: content,
        children: children || []
      };
    }

NamedClause
  = "named" __ instanceName:COMPONENT_NAME { return instanceName; }

// =============================================================================
// Properties
// =============================================================================

Properties
  = first:Property rest:(_ "," _ Property)*
    { return [first, ...rest.map(r => r[3])]; }

Property
  = BooleanProperty
  / ValueProperty

BooleanProperty
  = name:PROPERTY_NAME !(_ (NUMBER / COLOR / STRING / TOKEN_REF / IDENTIFIER))
    { return { type: 'BooleanProperty', name: name }; }

ValueProperty
  = name:PROPERTY_NAME __ value:PropertyValue
    { return { type: 'ValueProperty', name: name, value: value }; }

PropertyValue
  = COLOR
  / NUMBER
  / STRING
  / TOKEN_REF
  / DimensionKeyword
  / IDENTIFIER

DimensionKeyword
  = "hug" / "full" / "auto" / "min" / "max"

// =============================================================================
// Children (Indented Block)
// =============================================================================

Children
  = NEWLINE children:IndentedChild+
    { return children.filter(c => c !== null); }

IndentedChild
  = INDENT child:(ConditionalBlock / IteratorBlock / ComponentInstance / StateBlock) { return child; }
  / BlankLine { return null; }

// =============================================================================
// State Blocks
// =============================================================================

StateBlock
  = SystemState
  / BehaviorState

SystemState
  = _ state:SYSTEM_STATE _ NEWLINE props:IndentedProperties
    { return { type: 'SystemState', state: state, properties: props }; }

BehaviorState
  = _ "state" __ state:IDENTIFIER _ NEWLINE props:IndentedProperties
    { return { type: 'BehaviorState', state: state, properties: props }; }

IndentedProperties
  = props:(INDENT _ Property _ NEWLINE?)+
    { return props.map(p => p[2]); }

SYSTEM_STATE
  = "hover" / "focus" / "active" / "disabled"

// =============================================================================
// Conditional Blocks
// =============================================================================

ConditionalBlock
  = _ "if" __ condition:ConditionExpr _ NEWLINE thenBranch:Children elseBranch:ElseBranch?
    {
      return {
        type: 'ConditionalBlock',
        condition: condition,
        thenBranch: thenBranch,
        elseBranch: elseBranch || []
      };
    }

ElseBranch
  = _ "else" _ NEWLINE children:Children { return children; }

ConditionExpr
  = left:ConditionTerm rest:(_ ("and" / "or") _ ConditionTerm)*
    {
      if (rest.length === 0) return left;
      return {
        type: 'LogicalExpr',
        left: left,
        operators: rest.map(r => ({ op: r[1], right: r[3] }))
      };
    }

ConditionTerm
  = "not" __ expr:ConditionPrimary { return { type: 'NotExpr', expr: expr }; }
  / ConditionPrimary

ConditionPrimary
  = Comparison
  / TOKEN_REF
  / IDENTIFIER

Comparison
  = left:Expression _ op:COMPARISON_OP _ right:Expression
    { return { type: 'Comparison', left: left, operator: op, right: right }; }

Expression
  = NUMBER
  / STRING
  / TOKEN_REF
  / IDENTIFIER

COMPARISON_OP
  = "==" / "!=" / ">=" / "<=" / ">" / "<"

// =============================================================================
// Iterator Blocks
// =============================================================================

IteratorBlock
  = _ "each" __ iterator:TOKEN_REF index:IndexClause? __ "in" __ collection:TOKEN_REF _ NEWLINE children:Children
    {
      return {
        type: 'IteratorBlock',
        iterator: iterator,
        index: index,
        collection: collection,
        children: children
      };
    }

IndexClause
  = _ "," _ index:TOKEN_REF { return index; }

// =============================================================================
// Events Block
// =============================================================================

EventsBlock
  = _ "events" _ NEWLINE handlers:EventHandler+
    { return { type: 'EventsBlock', handlers: handlers }; }

EventHandler
  = INDENT _ target:COMPONENT_NAME __ event:EVENT_NAME timing:TimingModifier? _ NEWLINE? actions:ActionList?
    {
      return {
        type: 'EventHandler',
        target: target,
        event: event,
        timing: timing,
        actions: actions || []
      };
    }

EVENT_NAME
  = "onclick" / "onhover" / "onchange" / "oninput" / "onload" / "onfocus" / "onblur"
  / KeyboardEvent

KeyboardEvent
  = event:("onkeydown" / "onkeyup") __ key:KEY_MODIFIER { return event + ' ' + key; }

KEY_MODIFIER
  = "escape" / "enter" / "tab" / "space"
  / "arrow-up" / "arrow-down" / "arrow-left" / "arrow-right"
  / "backspace" / "delete" / "home" / "end"

TimingModifier
  = __ type:("debounce" / "delay") __ ms:NUMBER { return { type: type, ms: ms }; }

ActionList
  = actions:(INDENT _ Action _ NEWLINE?)+
    { return actions.map(a => a[2]); }

Action
  = ToggleAction
  / ShowHideAction
  / OpenCloseAction
  / PageAction
  / ChangeAction
  / AssignAction
  / HighlightSelectAction
  / FocusAction
  / AlertAction
  / CallAction

ToggleAction
  = "toggle" target:(_ COMPONENT_NAME)?
    { return { type: 'toggle', target: target ? target[1] : null }; }

ShowHideAction
  = action:("show" / "hide") __ target:COMPONENT_NAME
    { return { type: action, target: target }; }

OpenCloseAction
  = action:("open" / "close") target:(_ COMPONENT_NAME)? position:(_ POSITION)? animation:(_ ANIMATION)?
    {
      return {
        type: action,
        target: target ? target[1] : null,
        position: position ? position[1] : null,
        animation: animation ? animation[1] : null
      };
    }

PageAction
  = "page" __ target:COMPONENT_NAME
    { return { type: 'page', target: target }; }

ChangeAction
  = "change" __ target:TARGET __ "to" __ state:IDENTIFIER
    { return { type: 'change', target: target, state: state }; }

AssignAction
  = "assign" __ variable:TOKEN_REF __ "to" __ value:Expression
    { return { type: 'assign', variable: variable, value: value }; }

HighlightSelectAction
  = action:("highlight" / "select" / "deselect") __ target:TARGET
    { return { type: action, target: target }; }

FocusAction
  = "focus" __ target:TARGET
    { return { type: 'focus', target: target }; }

AlertAction
  = "alert" __ message:STRING
    { return { type: 'alert', message: message }; }

CallAction
  = "call" __ fn:IDENTIFIER
    { return { type: 'call', function: fn }; }

TARGET
  = "self" / "next" / "prev" / "first" / "last" / "highlighted" / "selected" / COMPONENT_NAME

POSITION
  = "below" / "above" / "left" / "right" / "center"

ANIMATION
  = "fade" / "scale" / "slide-up" / "slide-down" / "slide-left" / "slide-right" / "none"

// =============================================================================
// Comments
// =============================================================================

Comment
  = _ "//" [^\n]* NEWLINE? { return null; }

// =============================================================================
// Lexical Tokens
// =============================================================================

COMPONENT_NAME
  = first:[A-Z] rest:[a-zA-Z0-9_]* { return first + rest.join(''); }

COMPONENT_DEF
  = name:COMPONENT_NAME ":" { return name; }

PROPERTY_NAME
  = first:[a-z] rest:[a-z0-9\-]* { return first + rest.join(''); }

TOKEN_REF
  = "$" name:[a-zA-Z][a-zA-Z0-9_.\-]* { return '$' + name.join(''); }

TOKEN_VAR_DEF
  = "$" name:[a-zA-Z][a-zA-Z0-9_\-]* ":" { return '$' + name.join(''); }

NUMBER
  = negative:"-"? digits:[0-9]+ decimal:("." [0-9]+)?
    {
      const num = (negative || '') + digits.join('') + (decimal ? '.' + decimal[1].join('') : '');
      return parseFloat(num);
    }

STRING
  = '"' chars:[^"]* '"' { return chars.join(''); }

COLOR
  = "#" hex:[0-9a-fA-F]+ { return '#' + hex.join(''); }

IDENTIFIER
  = first:[a-zA-Z_] rest:[a-zA-Z0-9_\-]* { return first + rest.join(''); }

RESERVED_WORD
  = ("if" / "else" / "each" / "in" / "state" / "events" / "not" / "and" / "or") !IDENTIFIER_CHAR

IDENTIFIER_CHAR
  = [a-zA-Z0-9_\-]

// =============================================================================
// Whitespace and Indentation
// =============================================================================

NEWLINE
  = "\n" / "\r\n" / "\r"

INDENT
  = spaces:[ \t]+ &{ return spaces.length > currentIndent(); }
    { pushIndent(spaces.length); return null; }

// Required whitespace (at least one space)
__
  = [ \t]+

// Optional whitespace
_
  = [ \t]*
