/**
 * Demo Validation System
 *
 * Comprehensive validation for demo scripts.
 * Validates every action automatically and catches errors early.
 */

// =============================================================================
// Validation Result Types
// =============================================================================

export interface ValidationIssue {
  /** Severity level */
  level: 'error' | 'warning' | 'info'
  /** Step index where issue occurred (1-based) */
  stepIndex: number
  /** Action type */
  action: string
  /** What was being validated */
  check: string
  /** Human-readable message */
  message: string
  /** Additional details */
  details?: Record<string, unknown>
  /** Screenshot path if captured */
  screenshot?: string
}

export interface ActionValidationResult {
  /** Whether action succeeded */
  success: boolean
  /** Issues found */
  issues: ValidationIssue[]
  /** Pre-action state snapshot */
  preState?: StateSnapshot
  /** Post-action state snapshot */
  postState?: StateSnapshot
}

export interface StateSnapshot {
  /** Timestamp */
  timestamp: number
  /** Editor content (if applicable) */
  editorContent?: string
  /** Selected element ID */
  selectedElement?: string
  /** File list */
  files?: string[]
  /** Active file */
  activeFile?: string
  /** Console errors count */
  consoleErrorCount: number
  /** Preview element count */
  previewElementCount: number
}

export interface DemoValidationReport {
  /** Overall success */
  success: boolean
  /** Total issues by level */
  summary: {
    errors: number
    warnings: number
    infos: number
  }
  /** All issues */
  issues: ValidationIssue[]
  /** Console errors captured */
  consoleErrors: ConsoleError[]
  /** Steps that failed pre-validation */
  blockedSteps: number[]
  /** Steps that failed post-validation */
  failedSteps: number[]
}

export interface ConsoleError {
  /** Error message */
  message: string
  /** Error source (if available) */
  source?: string
  /** Line number */
  line?: number
  /** Timestamp */
  timestamp: number
  /** Step index when error occurred */
  stepIndex: number
}

// =============================================================================
// Element Validation Checks
// =============================================================================

/**
 * Comprehensive element validation code to inject into browser
 */
export function getElementValidationCode(): string {
  return `
(function() {
  if (window.__demoValidation) return;

  class DemoValidation {
    constructor() {
      this.consoleErrors = [];
      this.originalConsoleError = console.error;
      this.currentStepIndex = 0;
      this.setupConsoleInterception();
      this.setupErrorHandling();
    }

    // =========================================================================
    // Console & Error Monitoring
    // =========================================================================

    setupConsoleInterception() {
      const self = this;
      console.error = function(...args) {
        self.consoleErrors.push({
          message: args.map(a => String(a)).join(' '),
          timestamp: Date.now(),
          stepIndex: self.currentStepIndex,
        });
        self.originalConsoleError.apply(console, args);
      };
    }

    setupErrorHandling() {
      const self = this;
      window.addEventListener('error', (event) => {
        self.consoleErrors.push({
          message: event.message || 'Unknown error',
          source: event.filename,
          line: event.lineno,
          timestamp: Date.now(),
          stepIndex: self.currentStepIndex,
        });
      });

      window.addEventListener('unhandledrejection', (event) => {
        self.consoleErrors.push({
          message: 'Unhandled Promise rejection: ' + String(event.reason),
          timestamp: Date.now(),
          stepIndex: self.currentStepIndex,
        });
      });
    }

    setCurrentStep(index) {
      this.currentStepIndex = index;
    }

    getConsoleErrors() {
      return [...this.consoleErrors];
    }

    clearConsoleErrors() {
      this.consoleErrors = [];
    }

    getNewErrorsSince(count) {
      return this.consoleErrors.slice(count);
    }

    // =========================================================================
    // Element Existence & Visibility
    // =========================================================================

    /**
     * Check if element exists
     */
    elementExists(selector) {
      const el = this.findElement(selector);
      return { exists: !!el, element: el };
    }

    /**
     * Find element with fallbacks
     */
    findElement(selector) {
      // Direct selector
      let el = document.querySelector(selector);
      if (el) return el;

      // Try as mirror ID
      el = document.querySelector('[data-mirror-id="' + selector + '"]');
      if (el) return el;

      // Try in preview
      el = document.querySelector('#preview ' + selector);
      if (el) return el;

      return null;
    }

    /**
     * Check if element is visible (not hidden, has dimensions)
     */
    isElementVisible(selector) {
      const el = this.findElement(selector);
      if (!el) return { visible: false, reason: 'Element not found' };

      // Check display/visibility
      const style = window.getComputedStyle(el);
      if (style.display === 'none') {
        return { visible: false, reason: 'display: none' };
      }
      if (style.visibility === 'hidden') {
        return { visible: false, reason: 'visibility: hidden' };
      }
      if (parseFloat(style.opacity) === 0) {
        return { visible: false, reason: 'opacity: 0' };
      }

      // Check dimensions
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) {
        return { visible: false, reason: 'Zero dimensions (' + rect.width + 'x' + rect.height + ')' };
      }

      return { visible: true, rect };
    }

    /**
     * Check if element is in viewport
     */
    isElementInViewport(selector) {
      const el = this.findElement(selector);
      if (!el) return { inViewport: false, reason: 'Element not found' };

      const rect = el.getBoundingClientRect();
      const inViewport = (
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
        rect.right <= (window.innerWidth || document.documentElement.clientWidth)
      );

      if (!inViewport) {
        return {
          inViewport: false,
          reason: 'Outside viewport',
          rect: { top: rect.top, left: rect.left, bottom: rect.bottom, right: rect.right },
          viewport: { width: window.innerWidth, height: window.innerHeight }
        };
      }

      return { inViewport: true };
    }

    /**
     * Check if element is interactable (not disabled, not covered)
     */
    isElementInteractable(selector) {
      const el = this.findElement(selector);
      if (!el) return { interactable: false, reason: 'Element not found' };

      // Check if disabled
      if (el.disabled) {
        return { interactable: false, reason: 'Element is disabled' };
      }

      // Check if covered by another element
      const rect = el.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const topElement = document.elementFromPoint(centerX, centerY);

      if (topElement !== el && !el.contains(topElement)) {
        // Check if it's our demo cursor (that's OK)
        if (topElement && topElement.id === '__demo-cursor') {
          return { interactable: true };
        }
        return {
          interactable: false,
          reason: 'Covered by another element',
          coveringElement: topElement ? (topElement.tagName + (topElement.id ? '#' + topElement.id : '') + (topElement.className ? '.' + topElement.className.split(' ')[0] : '')) : 'unknown'
        };
      }

      return { interactable: true };
    }

    // =========================================================================
    // Comprehensive Pre-Action Validation
    // =========================================================================

    /**
     * Validate element is ready for interaction
     */
    validateTargetReady(selector) {
      const issues = [];

      // Check exists
      const existsCheck = this.elementExists(selector);
      if (!existsCheck.exists) {
        issues.push({ check: 'exists', passed: false, message: 'Element not found: ' + selector });
        return { ready: false, issues };
      }

      // Check visible
      const visibleCheck = this.isElementVisible(selector);
      if (!visibleCheck.visible) {
        issues.push({ check: 'visible', passed: false, message: 'Element not visible: ' + visibleCheck.reason });
        return { ready: false, issues };
      }

      // Check in viewport (warning only)
      const viewportCheck = this.isElementInViewport(selector);
      if (!viewportCheck.inViewport) {
        issues.push({ check: 'viewport', passed: true, warning: true, message: 'Element outside viewport: ' + viewportCheck.reason });
      }

      // Check interactable
      const interactableCheck = this.isElementInteractable(selector);
      if (!interactableCheck.interactable) {
        issues.push({ check: 'interactable', passed: false, message: 'Element not interactable: ' + interactableCheck.reason });
        return { ready: false, issues };
      }

      return { ready: true, issues, rect: visibleCheck.rect };
    }

    // =========================================================================
    // State Snapshots
    // =========================================================================

    /**
     * Capture current state for comparison
     */
    captureState() {
      const state = {
        timestamp: Date.now(),
        consoleErrorCount: this.consoleErrors.length,
        previewElementCount: document.querySelectorAll('#preview [data-mirror-id]').length,
      };

      // Editor content
      if (window.editor && window.editor.state) {
        state.editorContent = window.editor.state.doc.toString();
      }

      // Selected element
      const selected = document.querySelector('#preview [data-mirror-id].selected, #preview .selected');
      if (selected) {
        state.selectedElement = selected.getAttribute('data-mirror-id') || selected.className;
      }

      // Files
      if (window.storage && window.storage.listFiles) {
        try {
          state.files = window.storage.listFiles();
        } catch (e) {}
      }

      // Active file
      const activeFileEl = document.querySelector('[data-path].selected, [data-path].active');
      if (activeFileEl) {
        state.activeFile = activeFileEl.getAttribute('data-path');
      }

      return state;
    }

    /**
     * Compare two states and find differences
     */
    compareStates(before, after) {
      const changes = {};

      if (before.editorContent !== after.editorContent) {
        changes.editorChanged = true;
        changes.editorDiff = {
          before: (before.editorContent || '').length,
          after: (after.editorContent || '').length,
          charsDiff: (after.editorContent || '').length - (before.editorContent || '').length
        };
      }

      if (before.selectedElement !== after.selectedElement) {
        changes.selectionChanged = true;
        changes.selectionDiff = { before: before.selectedElement, after: after.selectedElement };
      }

      if (before.previewElementCount !== after.previewElementCount) {
        changes.previewChanged = true;
        changes.previewDiff = { before: before.previewElementCount, after: after.previewElementCount };
      }

      if (before.consoleErrorCount !== after.consoleErrorCount) {
        changes.newErrors = true;
        changes.errorsDiff = { before: before.consoleErrorCount, after: after.consoleErrorCount };
      }

      const beforeFiles = JSON.stringify(before.files || []);
      const afterFiles = JSON.stringify(after.files || []);
      if (beforeFiles !== afterFiles) {
        changes.filesChanged = true;
        changes.filesDiff = { before: before.files, after: after.files };
      }

      if (before.activeFile !== after.activeFile) {
        changes.activeFileChanged = true;
        changes.activeFileDiff = { before: before.activeFile, after: after.activeFile };
      }

      return changes;
    }

    // =========================================================================
    // Action-Specific Validation
    // =========================================================================

    /**
     * Validate click action
     */
    validateClick(selector, preState, postState) {
      const issues = [];

      // Check something changed (click should have an effect)
      const changes = this.compareStates(preState, postState);

      // If clicking a button/link, something should happen
      const el = this.findElement(selector);
      if (el) {
        const tagName = el.tagName.toLowerCase();
        const isInteractive = ['button', 'a', 'input', 'select'].includes(tagName) ||
                             el.hasAttribute('onclick') ||
                             el.hasAttribute('data-action') ||
                             el.classList.contains('clickable');

        if (isInteractive && Object.keys(changes).length === 0) {
          issues.push({
            check: 'click-effect',
            passed: false,
            warning: true,
            message: 'Click on interactive element had no visible effect'
          });
        }
      }

      // Check for new console errors
      if (changes.newErrors) {
        issues.push({
          check: 'console-errors',
          passed: false,
          message: 'Console errors occurred after click',
          details: { errorCount: postState.consoleErrorCount - preState.consoleErrorCount }
        });
      }

      return { valid: issues.filter(i => !i.warning && !i.passed).length === 0, issues, changes };
    }

    /**
     * Validate type action
     */
    validateType(text, preState, postState) {
      const issues = [];
      const changes = this.compareStates(preState, postState);

      // Editor should have changed
      if (!changes.editorChanged) {
        issues.push({
          check: 'editor-changed',
          passed: false,
          message: 'Typing did not change editor content'
        });
      } else {
        // Verify text was added (approximately - may have variance due to selection replacement)
        const expectedMinChars = Math.floor(text.length * 0.8); // Allow some tolerance
        if (changes.editorDiff && changes.editorDiff.charsDiff < expectedMinChars) {
          issues.push({
            check: 'text-added',
            passed: false,
            warning: true,
            message: 'Less text added than expected',
            details: { expected: text.length, actual: changes.editorDiff.charsDiff }
          });
        }
      }

      // Check for errors
      if (changes.newErrors) {
        issues.push({
          check: 'console-errors',
          passed: false,
          message: 'Console errors occurred during typing'
        });
      }

      return { valid: issues.filter(i => !i.warning && !i.passed).length === 0, issues, changes };
    }

    /**
     * Validate file creation
     */
    validateFileCreated(path, preState, postState) {
      const issues = [];
      const changes = this.compareStates(preState, postState);

      // File should exist now
      if (!postState.files || !postState.files.includes(path)) {
        issues.push({
          check: 'file-exists',
          passed: false,
          message: 'File was not created: ' + path
        });
      }

      // Files list should have changed
      if (!changes.filesChanged) {
        issues.push({
          check: 'files-changed',
          passed: false,
          warning: true,
          message: 'Files list did not change'
        });
      }

      return { valid: issues.filter(i => !i.warning && !i.passed).length === 0, issues, changes };
    }

    /**
     * Validate preview updated
     */
    validatePreviewUpdated(preState, postState, expectIncrease = true) {
      const issues = [];
      const changes = this.compareStates(preState, postState);

      if (!changes.previewChanged) {
        issues.push({
          check: 'preview-changed',
          passed: false,
          warning: true,
          message: 'Preview did not change'
        });
      } else if (expectIncrease && changes.previewDiff.after < changes.previewDiff.before) {
        issues.push({
          check: 'preview-elements',
          passed: false,
          warning: true,
          message: 'Preview has fewer elements than before',
          details: changes.previewDiff
        });
      }

      return { valid: true, issues, changes }; // Warnings only
    }

    /**
     * General health check
     */
    healthCheck() {
      const issues = [];

      // Check for recent console errors
      const recentErrors = this.consoleErrors.filter(e => Date.now() - e.timestamp < 5000);
      if (recentErrors.length > 0) {
        issues.push({
          check: 'recent-errors',
          passed: false,
          message: recentErrors.length + ' console error(s) in last 5 seconds',
          details: { errors: recentErrors.map(e => e.message) }
        });
      }

      // Check editor is functional
      if (window.editor) {
        try {
          window.editor.state.doc.toString();
        } catch (e) {
          issues.push({
            check: 'editor-functional',
            passed: false,
            message: 'Editor is not functional: ' + e.message
          });
        }
      }

      // Check preview exists
      const preview = document.getElementById('preview');
      if (!preview) {
        issues.push({
          check: 'preview-exists',
          passed: false,
          message: 'Preview element not found'
        });
      }

      return { healthy: issues.filter(i => !i.passed).length === 0, issues };
    }

    /**
     * Wait for condition with timeout
     */
    async waitFor(conditionFn, timeout = 5000, interval = 100) {
      const start = Date.now();
      while (Date.now() - start < timeout) {
        if (conditionFn()) return true;
        await new Promise(r => setTimeout(r, interval));
      }
      return false;
    }

    /**
     * Wait for element to appear
     */
    async waitForElement(selector, timeout = 5000) {
      return this.waitFor(() => this.elementExists(selector).exists, timeout);
    }

    /**
     * Wait for element to be interactable
     */
    async waitForInteractable(selector, timeout = 5000) {
      return this.waitFor(() => {
        const result = this.validateTargetReady(selector);
        return result.ready;
      }, timeout);
    }

    /**
     * Wait for preview to update
     */
    async waitForPreviewUpdate(previousCount, timeout = 3000) {
      return this.waitFor(() => {
        const currentCount = document.querySelectorAll('#preview [data-mirror-id]').length;
        return currentCount !== previousCount;
      }, timeout);
    }

    /**
     * Cleanup
     */
    destroy() {
      console.error = this.originalConsoleError;
    }
  }

  window.__demoValidation = new DemoValidation();
})();
`.trim();
}

// =============================================================================
// Validation Levels
// =============================================================================

export type ValidationLevel = 'strict' | 'normal' | 'lenient'

export interface ValidationConfig {
  /** Validation strictness level */
  level: ValidationLevel
  /** Stop on first error */
  failFast: boolean
  /** Capture screenshots on failure */
  screenshotOnFailure: boolean
  /** Max retries for flaky actions */
  maxRetries: number
  /** Wait timeout for elements (ms) */
  waitTimeout: number
  /** Validate every action automatically */
  autoValidate: boolean
  /** Collect console errors */
  collectConsoleErrors: boolean
  /** Verify state changes after actions */
  verifyStateChanges: boolean
}

export const DEFAULT_VALIDATION_CONFIG: ValidationConfig = {
  level: 'normal',
  failFast: false,
  screenshotOnFailure: true,
  maxRetries: 2,
  waitTimeout: 5000,
  autoValidate: true,
  collectConsoleErrors: true,
  verifyStateChanges: true,
}

export const VALIDATION_CONFIGS: Record<ValidationLevel, Partial<ValidationConfig>> = {
  strict: {
    level: 'strict',
    failFast: true,
    maxRetries: 0,
    waitTimeout: 3000,
    autoValidate: true,
    verifyStateChanges: true,
  },
  normal: {
    level: 'normal',
    failFast: false,
    maxRetries: 2,
    waitTimeout: 5000,
    autoValidate: true,
    verifyStateChanges: true,
  },
  lenient: {
    level: 'lenient',
    failFast: false,
    maxRetries: 3,
    waitTimeout: 8000,
    autoValidate: true,
    verifyStateChanges: false,
  },
}

/**
 * Get validation config for a level
 */
export function getValidationConfig(level: ValidationLevel): ValidationConfig {
  return { ...DEFAULT_VALIDATION_CONFIG, ...VALIDATION_CONFIGS[level] }
}
