/**
 * Editor Module
 *
 * Editor integration for Mirror DSL.
 * Part of Editor Integration (Phase 6).
 */

export {
  getDiagnostics,
  getDiagnosticsForLine,
  getMostSevereDiagnostic,
  groupByLine,
  formatDiagnostic,
  createDiagnosticSummary,
  type InlineDiagnostic,
  type DiagnosticSeverity,
  type RelatedInfo,
  type QuickFix,
  type QuickFixKind,
  type TextEdit,
  type DiagnosticTag,
  type DiagnosticOptions,
} from './inline-diagnostics'

export {
  registerQuickAction,
  getQuickActions,
  getAvailableActions,
  executeAction,
  getActionsForLine,
  getCodeActions,
  type QuickAction,
  type QuickActionKind,
  type Selection,
  type QuickActionResult,
  type ActionContext,
} from './quick-actions'
