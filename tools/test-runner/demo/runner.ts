/**
 * Demo Runner
 *
 * Orchestrates demo script execution via CDP.
 */

import type { CDPSession } from '../types'
import type { DemoScript, DemoAction, DemoConfig, SpeedPreset, ValidationCheck, ValidationResult, StepTiming, TimingReport, TimingSuggestion } from './types'
import type { PacingProfile, ActionTimings } from './timing'
import type { ValidationConfig, ValidationIssue, ConsoleError, StateSnapshot, DemoValidationReport } from './validation'
import { DEFAULT_CONFIG, SPEED_PRESETS, PACING_TO_SPEED } from './types'
import { getTimingProfile, TimingCalculator, formatDuration, compareProfiles } from './timing'
import { getElementValidationCode, getValidationConfig, DEFAULT_VALIDATION_CONFIG } from './validation'
import * as fs from 'fs'
import * as path from 'path'

// =============================================================================
// Demo API Code (injected into browser)
// =============================================================================

// Read the demo API source for injection
function getDemoAPISource(timings: ActionTimings): string {
  // Use inline injection with timing configuration
  return getInlineDemoAPI(timings)
}

/**
 * Inline demo API for injection
 * This is the demo API for direct injection into the browser
 * Now with comprehensive timing support
 */
function getInlineDemoAPI(timings: ActionTimings): string {
  // Serialize timings for injection
  const timingsJson = JSON.stringify(timings)

  return `
(function() {
  if (window.__mirrorDemo) return;

  // Action timings from pacing profile
  const ACTION_TIMINGS = ${timingsJson};

  // Legacy speed presets (for backwards compatibility)
  const SPEED_PRESETS = {
    slow: { mouseMs: 1200, charMs: 150, pauseMultiplier: 2.0 },
    normal: { mouseMs: 600, charMs: 100, pauseMultiplier: 1.0 },
    fast: { mouseMs: 300, charMs: 50, pauseMultiplier: 0.5 },
  };

  // Easing functions
  const easeInOutCubic = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const easeOut = t => 1 - Math.pow(1 - t, 2);
  const linear = t => t;

  // Get easing function by name
  const getEasing = (name) => {
    switch (name) {
      case 'easeInOutCubic': return easeInOutCubic;
      case 'easeOut': return easeOut;
      case 'linear': return linear;
      default: return easeInOutCubic;
    }
  };

  // Demo Cursor
  class DemoCursor {
    constructor() {
      this.element = null;
      this.rippleElement = null;
      this.position = { x: 0, y: 0 };
    }

    show(pos) {
      if (this.element) return;
      this.element = document.createElement('div');
      this.element.id = '__demo-cursor';
      this.element.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M5.5 3.21V20.79C5.5 21.33 6.12 21.64 6.54 21.32L10.56 18.18C10.82 17.98 11.16 17.9 11.48 17.97L16.75 19.03C17.32 19.14 17.82 18.64 17.71 18.07L14.75 3.71C14.6 2.96 13.64 2.76 13.22 3.39L5.73 13.5C5.26 14.16 5.5 15.13 6.24 15.5" fill="white" stroke="black" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
      this.element.style.cssText = 'position:fixed;width:24px;height:24px;pointer-events:none;z-index:999999;transform:translate(0,0);transition:none;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.3));';
      this.updatePosition(pos);
      document.body.appendChild(this.element);
    }

    hide() {
      if (this.element) { this.element.remove(); this.element = null; }
      if (this.rippleElement) { this.rippleElement.remove(); this.rippleElement = null; }
    }

    updatePosition(pos) {
      this.position = pos;
      if (this.element) {
        this.element.style.left = pos.x + 'px';
        this.element.style.top = pos.y + 'px';
      }
    }

    // Calculate duration based on distance using timing profile
    calculateDuration(target) {
      const dx = target.x - this.position.x;
      const dy = target.y - this.position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const hundredPixels = distance / 100;
      const t = ACTION_TIMINGS.moveTo;
      const duration = t.baseMs + (hundredPixels * t.perHundredPixels);
      return Math.max(t.minMs, Math.min(t.maxMs, Math.round(duration)));
    }

    async moveTo(target, duration) {
      if (!this.element) { this.show(target); return; }

      // Calculate duration based on distance if not provided
      const effectiveDuration = duration ?? this.calculateDuration(target);
      if (effectiveDuration === 0) {
        this.updatePosition(target);
        return;
      }

      const start = { ...this.position };
      const startTime = performance.now();
      const easingFn = getEasing(ACTION_TIMINGS.moveTo.easing);

      return new Promise(resolve => {
        const animate = () => {
          const elapsed = performance.now() - startTime;
          const t = Math.min(elapsed / effectiveDuration, 1);
          const easedT = easingFn(t);
          const x = start.x + (target.x - start.x) * easedT;
          const y = start.y + (target.y - start.y) * easedT;
          this.updatePosition({ x, y });
          if (t < 1) requestAnimationFrame(animate);
          else resolve();
        };
        requestAnimationFrame(animate);
      });
    }

    showClickEffect() {
      if (!this.element) return;
      const rippleDuration = ACTION_TIMINGS.click.rippleDurationMs;
      if (rippleDuration === 0) return;

      const ripple = document.createElement('div');
      ripple.style.cssText = 'position:fixed;left:' + this.position.x + 'px;top:' + this.position.y + 'px;width:40px;height:40px;border:3px solid #5BA8F5;border-radius:50%;pointer-events:none;z-index:999998;transform:translate(-50%,-50%) scale(0.5);opacity:1;';
      if (!document.getElementById('__demo-ripple-style')) {
        const style = document.createElement('style');
        style.id = '__demo-ripple-style';
        style.textContent = '@keyframes demo-ripple{0%{transform:translate(-50%,-50%) scale(0.5);opacity:1}100%{transform:translate(-50%,-50%) scale(1.5);opacity:0}}';
        document.head.appendChild(style);
      }
      ripple.style.animation = 'demo-ripple ' + (rippleDuration / 1000) + 's ease-out forwards';
      document.body.appendChild(ripple);
      setTimeout(() => ripple.remove(), rippleDuration);
    }

    getPosition() { return { ...this.position }; }
  }

  // Keystroke Overlay
  class KeystrokeOverlay {
    constructor() {
      this.container = null;
      this.enabled = true;
    }

    init() {
      if (this.container) return;
      this.container = document.createElement('div');
      this.container.id = '__demo-keystroke-overlay';
      this.container.style.cssText = 'position:fixed;bottom:24px;right:24px;display:flex;flex-direction:row;gap:8px;pointer-events:none;z-index:999997;';
      document.body.appendChild(this.container);
    }

    show(key, modifiers) {
      if (!this.enabled || !this.container) return;
      const overlayMs = ACTION_TIMINGS.pressKey.overlayMs;
      if (overlayMs === 0) return;

      const parts = [];
      if (modifiers) {
        if (modifiers.includes('Meta') || modifiers.includes('Ctrl')) parts.push(navigator.platform.includes('Mac') ? '⌘' : 'Ctrl');
        if (modifiers.includes('Alt')) parts.push(navigator.platform.includes('Mac') ? '⌥' : 'Alt');
        if (modifiers.includes('Shift')) parts.push('⇧');
      }
      const keyMap = { Enter: '↵', Tab: '⇥', Escape: 'Esc', Backspace: '⌫', Delete: '⌦', ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→', Space: 'Space' };
      parts.push(keyMap[key] || key);
      const keyEl = document.createElement('div');
      keyEl.textContent = parts.join(' + ');
      keyEl.style.cssText = 'background:rgba(0,0,0,0.85);color:white;padding:8px 16px;border-radius:8px;font-family:system-ui,-apple-system,sans-serif;font-size:16px;font-weight:500;white-space:nowrap;box-shadow:0 4px 12px rgba(0,0,0,0.3);opacity:1;transform:translateY(0);transition:opacity 0.3s ease-out,transform 0.3s ease-out;';
      this.container.appendChild(keyEl);
      const fadeStart = overlayMs * 0.8;
      setTimeout(() => { keyEl.style.opacity = '0'; keyEl.style.transform = 'translateY(10px)'; }, fadeStart);
      setTimeout(() => keyEl.remove(), overlayMs);
    }

    setEnabled(enabled) { this.enabled = enabled; }
    destroy() { if (this.container) { this.container.remove(); this.container = null; } }
  }

  // Demo API
  class DemoAPI {
    constructor() {
      this.cursor = new DemoCursor();
      this.overlay = new KeystrokeOverlay();
      this.config = { speed: 'normal', showKeystrokeOverlay: true, cursorStyle: 'default', pauseMultiplier: 1.0 };
    }

    init(config) {
      if (config) this.config = { ...this.config, ...config };
      this.overlay.init();
      this.overlay.setEnabled(this.config.showKeystrokeOverlay);
    }

    destroy() { this.cursor.hide(); this.overlay.destroy(); }
    getSpeedPreset() { return SPEED_PRESETS[this.config.speed]; }
    getTimings() { return ACTION_TIMINGS; }
    showCursor(x, y) { this.cursor.show({ x, y }); }
    hideCursor() { this.cursor.hide(); }

    async moveTo(selector, duration) {
      const target = this.getTargetCenter(selector);
      if (!target) { console.warn('[Demo] Target not found:', selector); return; }
      // Duration will be calculated by cursor based on distance if not provided
      await this.cursor.moveTo(target, duration);
    }

    async moveToPoint(x, y, duration) {
      await this.cursor.moveTo({ x, y }, duration);
    }

    async click(selector) {
      const t = ACTION_TIMINGS.click;
      if (selector) await this.moveTo(selector);

      // Pre-delay for visual anticipation
      if (t.preDelayMs > 0) await this.delay(t.preDelayMs);

      this.cursor.showClickEffect();
      const pos = this.cursor.getPosition();
      const target = document.elementFromPoint(pos.x, pos.y);
      if (target) {
        target.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, clientX: pos.x, clientY: pos.y, view: window }));
      }

      // Post-delay for visual feedback
      await this.delay(t.postDelayMs);
    }

    async doubleClick(selector) {
      const t = ACTION_TIMINGS.doubleClick;
      if (selector) await this.moveTo(selector);

      if (t.preDelayMs > 0) await this.delay(t.preDelayMs);

      this.cursor.showClickEffect();
      const pos = this.cursor.getPosition();
      const target = document.elementFromPoint(pos.x, pos.y);
      if (target) {
        target.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, cancelable: true, clientX: pos.x, clientY: pos.y, view: window }));
      }

      await this.delay(t.postDelayMs);
    }

    async type(text, target) {
      if (target) await this.click(target);

      const t = ACTION_TIMINGS.type;

      // Initial "thinking" pause
      if (t.thoughtPauseMs > 0) await this.delay(t.thoughtPauseMs);

      // Check if we're typing into CodeMirror
      const cmEditor = window.editor;
      if (cmEditor && cmEditor.state && cmEditor.dispatch) {
        // Use CodeMirror API for typing
        let isFirstChar = true;
        for (const char of text) {
          if (this.config.showKeystrokeOverlay && char !== ' ' && char !== '\\n') {
            this.overlay.show(char === '\\n' ? 'Enter' : char);
          }

          const sel = cmEditor.state.selection.main;

          // If there's a selection and this is the first char, replace selection
          if (isFirstChar && !sel.empty) {
            cmEditor.dispatch({
              changes: { from: sel.from, to: sel.to, insert: char },
              selection: { anchor: sel.from + 1 }
            });
            isFirstChar = false;
          } else if (char === '\\n') {
            // Handle newline
            const pos = cmEditor.state.selection.main.head;
            cmEditor.dispatch({
              changes: { from: pos, insert: '\\n' },
              selection: { anchor: pos + 1 }
            });
          } else {
            const pos = cmEditor.state.selection.main.head;
            cmEditor.dispatch({
              changes: { from: pos, insert: char },
              selection: { anchor: pos + 1 }
            });
          }
          isFirstChar = false;

          // Calculate delay with variance
          let charDelay = t.charMs;
          if (t.variance > 0) {
            charDelay *= (1 + (Math.random() - 0.5) * 2 * t.variance);
          }

          // Extra pauses for spaces and newlines
          if (char === ' ') charDelay += t.wordPauseMs;
          if (char === '\\n') charDelay += t.linePauseMs;

          await this.delay(charDelay);
        }
        return;
      }

      // Fallback for regular inputs
      for (const char of text) {
        if (this.config.showKeystrokeOverlay && char !== ' ') this.overlay.show(char);
        const activeEl = document.activeElement;
        if (activeEl) {
          activeEl.dispatchEvent(new KeyboardEvent('keydown', { key: char, bubbles: true, cancelable: true }));
          if (activeEl instanceof HTMLInputElement || activeEl instanceof HTMLTextAreaElement) {
            activeEl.value += char;
            activeEl.dispatchEvent(new InputEvent('input', { bubbles: true, data: char, inputType: 'insertText' }));
          }
          activeEl.dispatchEvent(new KeyboardEvent('keyup', { key: char, bubbles: true, cancelable: true }));
        }

        let charDelay = t.charMs;
        if (t.variance > 0) {
          charDelay *= (1 + (Math.random() - 0.5) * 2 * t.variance);
        }
        if (char === ' ') charDelay += t.wordPauseMs;
        if (char === '\\n') charDelay += t.linePauseMs;

        await this.delay(charDelay);
      }
    }

    async pressKey(key, modifiers) {
      this.overlay.show(key, modifiers);
      const keyMs = ACTION_TIMINGS.pressKey.keyMs;

      // Check if we're in CodeMirror
      const cmEditor = window.editor;
      if (cmEditor && cmEditor.state && cmEditor.dispatch) {
        // Handle special CodeMirror commands
        const isMeta = modifiers?.includes('Meta') || modifiers?.includes('Ctrl');

        if (isMeta && key.toLowerCase() === 'a') {
          // Select all
          cmEditor.dispatch({
            selection: { anchor: 0, head: cmEditor.state.doc.length }
          });
          await this.delay(keyMs);
          return;
        }

        if (key === 'Enter') {
          const pos = cmEditor.state.selection.main.head;
          cmEditor.dispatch({
            changes: { from: pos, insert: '\\n' },
            selection: { anchor: pos + 1 }
          });
          await this.delay(keyMs);
          return;
        }

        if (key === 'Backspace') {
          const sel = cmEditor.state.selection.main;
          if (sel.empty && sel.from > 0) {
            cmEditor.dispatch({
              changes: { from: sel.from - 1, to: sel.from }
            });
          } else if (!sel.empty) {
            cmEditor.dispatch({
              changes: { from: sel.from, to: sel.to }
            });
          }
          await this.delay(keyMs);
          return;
        }
      }

      // Fallback for regular elements
      const activeEl = document.activeElement;
      if (activeEl) {
        const opts = { key, code: 'Key' + key.toUpperCase(), bubbles: true, cancelable: true, ctrlKey: modifiers?.includes('Ctrl'), altKey: modifiers?.includes('Alt'), shiftKey: modifiers?.includes('Shift'), metaKey: modifiers?.includes('Meta') };
        activeEl.dispatchEvent(new KeyboardEvent('keydown', opts));
        activeEl.dispatchEvent(new KeyboardEvent('keyup', opts));
      }
      await this.delay(keyMs);
    }

    async drag(fromSelector, toSelector) {
      const from = this.getTargetCenter(fromSelector);
      const to = this.getTargetCenter(toSelector);
      if (!from || !to) { console.warn('[Demo] Drag targets not found'); return; }

      // Move to start position
      await this.cursor.moveTo(from);
      const fromEl = document.elementFromPoint(from.x, from.y);
      if (fromEl) fromEl.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, clientX: from.x, clientY: from.y }));

      await this.delay(ACTION_TIMINGS.transitions.afterClick);

      // Drag to end position (slower for visibility)
      const dragDuration = this.cursor.calculateDuration(to) * 1.5;
      await this.cursor.moveTo(to, dragDuration);
      const toEl = document.elementFromPoint(to.x, to.y);
      if (toEl) toEl.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, clientX: to.x, clientY: to.y }));

      await this.delay(ACTION_TIMINGS.transitions.afterClick);
    }

    async scroll(deltaY, selector) {
      const target = selector ? document.querySelector(selector) : document.documentElement;
      if (target) target.scrollBy({ top: deltaY, behavior: 'smooth' });
      // Wait proportional to scroll distance
      await this.delay(Math.min(Math.abs(deltaY) * 2, 1000));
    }

    async highlight(selector, duration) {
      const t = ACTION_TIMINGS.highlight;
      const effectiveDuration = duration ?? t.durationMs;

      const element = document.querySelector(selector);
      if (!element) return;
      const rect = element.getBoundingClientRect();
      const highlight = document.createElement('div');

      // Style with fade-in
      highlight.style.cssText = 'position:fixed;left:' + (rect.left-4) + 'px;top:' + (rect.top-4) + 'px;width:' + (rect.width+8) + 'px;height:' + (rect.height+8) + 'px;border:3px solid #5BA8F5;border-radius:8px;background:rgba(91,168,245,0.1);pointer-events:none;z-index:999996;opacity:0;transition:opacity ' + (t.fadeInMs/1000) + 's ease-out;';
      document.body.appendChild(highlight);

      // Trigger fade-in
      requestAnimationFrame(() => { highlight.style.opacity = '1'; });

      // Wait for duration then fade out
      await this.delay(effectiveDuration - t.fadeOutMs);
      highlight.style.transition = 'opacity ' + (t.fadeOutMs/1000) + 's ease-out';
      highlight.style.opacity = '0';
      await this.delay(t.fadeOutMs);
      highlight.remove();
    }

    async wait(duration) {
      // Apply wait scaling from timing config
      const t = ACTION_TIMINGS.wait;
      const scaled = duration * t.scale;
      const clamped = Math.max(t.minMs, Math.min(t.maxMs, scaled));
      await this.delay(clamped);
    }

    getTargetCenter(selector) {
      let element = document.querySelector(selector);
      if (!element) element = document.querySelector('[data-mirror-id="' + selector + '"]');
      if (!element) element = document.querySelector('#preview ' + selector);
      if (!element) return null;
      const rect = element.getBoundingClientRect();
      return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    }

    delay(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
  }

  window.__mirrorDemo = new DemoAPI();
})();
  `.trim()
}

// =============================================================================
// Demo Runner
// =============================================================================

export interface DemoRunResult {
  success: boolean
  totalSteps: number
  validationResults: ValidationResult[]
  failedValidations: ValidationResult[]
  errors: string[]
  /** Timing report (only if timing mode enabled) */
  timing?: TimingReport
  /** Validation report (auto-validation results) */
  validation?: DemoValidationReport
}

export interface DemoRunnerOptions extends Partial<DemoConfig> {
  /** Enable timing measurement */
  timing?: boolean
  /** Validation level: strict, normal, lenient */
  validationLevel?: 'strict' | 'normal' | 'lenient'
  /** Enable auto-validation for all actions */
  autoValidate?: boolean
}

export class DemoRunner {
  private cdp: CDPSession
  private config: DemoConfig
  private validationResults: ValidationResult[] = []
  private errors: string[] = []
  private timingEnabled: boolean = false
  private stepTimings: StepTiming[] = []
  private demoStartTime: number = 0
  // Auto-validation tracking
  private validationConfig: ValidationConfig
  private autoValidate: boolean = false
  private validationIssues: ValidationIssue[] = []
  private consoleErrors: ConsoleError[] = []
  private blockedSteps: number[] = []
  private failedSteps: number[] = []

  constructor(cdp: CDPSession, options: DemoRunnerOptions = {}) {
    this.cdp = cdp
    const { timing, validationLevel, autoValidate, ...configOptions } = options
    this.config = { ...DEFAULT_CONFIG, ...configOptions }
    this.timingEnabled = timing ?? false
    this.validationConfig = getValidationConfig(validationLevel ?? 'normal')
    this.autoValidate = autoValidate ?? this.validationConfig.autoValidate
  }

  /**
   * Reset validation state
   */
  private resetState(): void {
    this.validationResults = []
    this.errors = []
    this.stepTimings = []
    this.demoStartTime = 0
    // Auto-validation reset
    this.validationIssues = []
    this.consoleErrors = []
    this.blockedSteps = []
    this.failedSteps = []
  }

  /**
   * Run a demo script
   */
  async run(script: DemoScript): Promise<DemoRunResult> {
    this.resetState()

    console.log(`\n🎬 Running demo: ${script.name}`)
    if (script.description) {
      console.log(`   ${script.description}`)
    }
    if (this.timingEnabled) {
      console.log('   ⏱️  Timing mode enabled')
    }
    if (this.autoValidate) {
      console.log(`   🔒 Auto-validation enabled (${this.validationConfig.level})`)
    }
    console.log('')

    // Merge script config
    const effectiveConfig = { ...this.config, ...script.config }

    // Inject demo API and validation code
    await this.injectDemoAPI(effectiveConfig)
    if (this.autoValidate) {
      await this.injectValidationAPI()
    }

    // Start timing
    this.demoStartTime = performance.now()

    // Execute steps
    for (let i = 0; i < script.steps.length; i++) {
      const step = script.steps[i]
      const stepNum = i + 1
      const stepStart = performance.now()

      // Pre-validation for targetable actions
      let preState: StateSnapshot | undefined
      if (this.autoValidate && this.requiresTarget(step)) {
        const target = this.getStepTarget(step)
        if (target) {
          const preResult = await this.preValidateAction(target, stepNum, step.action)
          if (!preResult.ready) {
            this.blockedSteps.push(stepNum)
            if (this.validationConfig.failFast) {
              console.error(`   ❌ Step ${stepNum} blocked - target not ready: ${target}`)
              break
            }
          }
        }
        preState = await this.captureState(stepNum)
      }

      try {
        await this.executeStep(step, stepNum, script.steps.length)
      } catch (error) {
        const errorMsg = `Step ${stepNum} failed: ${error instanceof Error ? error.message : String(error)}`
        this.errors.push(errorMsg)
        console.error(`   ❌ ${errorMsg}`)
        if (this.validationConfig.failFast) break
      }

      // Post-validation for state-changing actions
      if (this.autoValidate && preState && this.changesState(step)) {
        const postState = await this.captureState(stepNum)
        const postResult = await this.postValidateAction(step, preState, postState, stepNum)
        if (!postResult.valid) {
          this.failedSteps.push(stepNum)
        }
      }

      // Record timing
      if (this.timingEnabled) {
        const stepEnd = performance.now()
        this.stepTimings.push({
          stepIndex: stepNum,
          action: step.action,
          detail: this.getStepDetail(step),
          executionMs: Math.round(stepEnd - stepStart),
          configuredWaitMs: step.action === 'wait' ? (step as any).duration : undefined,
        })
      }
    }

    const totalMs = Math.round(performance.now() - this.demoStartTime)

    // Collect console errors from browser
    if (this.autoValidate) {
      this.consoleErrors = await this.collectConsoleErrors()
    }

    // Clean up
    await this.cleanup()

    // Generate timing report
    const timingReport = this.timingEnabled ? this.generateTimingReport(totalMs) : undefined

    // Generate validation report
    const validationReport = this.autoValidate ? this.generateValidationReport() : undefined

    // Generate result
    const failedValidations = this.validationResults.filter(r => !r.success)
    const autoValidationSuccess = !validationReport || validationReport.success
    const success = failedValidations.length === 0 && this.errors.length === 0 && autoValidationSuccess

    // Print summary
    this.printSummary(script.name, success, failedValidations, timingReport, validationReport)

    return {
      success,
      totalSteps: script.steps.length,
      validationResults: this.validationResults,
      failedValidations,
      errors: this.errors,
      timing: timingReport,
      validation: validationReport,
    }
  }

  /**
   * Check if action requires a target element
   */
  private requiresTarget(step: DemoAction): boolean {
    return ['moveTo', 'click', 'doubleClick', 'drag', 'highlight'].includes(step.action)
  }

  /**
   * Get target selector from a step
   */
  private getStepTarget(step: DemoAction): string | undefined {
    switch (step.action) {
      case 'moveTo': return step.target
      case 'click': return step.target
      case 'doubleClick': return step.target
      case 'drag': return step.from
      case 'highlight': return step.target
      default: return undefined
    }
  }

  /**
   * Check if action changes state
   */
  private changesState(step: DemoAction): boolean {
    return ['click', 'doubleClick', 'type', 'pressKey', 'createFile', 'clearEditor'].includes(step.action)
  }

  /**
   * Pre-validate action target
   */
  private async preValidateAction(target: string, stepNum: number, action: string): Promise<{ ready: boolean }> {
    try {
      const result = await this.evaluate<{ ready: boolean; issues: Array<{ check: string; passed: boolean; message: string; warning?: boolean }> }>(`
        window.__demoValidation?.validateTargetReady('${this.escape(target)}') || { ready: true, issues: [] }
      `)

      // Add issues to tracking
      for (const issue of result.issues) {
        const level = issue.warning ? 'warning' : (issue.passed ? 'info' : 'error')
        this.validationIssues.push({
          level,
          stepIndex: stepNum,
          action,
          check: issue.check,
          message: issue.message,
        })
      }

      return { ready: result.ready }
    } catch {
      // If validation fails, assume ready and continue
      return { ready: true }
    }
  }

  /**
   * Post-validate action effect
   */
  private async postValidateAction(
    step: DemoAction,
    preState: StateSnapshot,
    postState: StateSnapshot,
    stepNum: number
  ): Promise<{ valid: boolean }> {
    try {
      // Check for new console errors
      if (postState.consoleErrorCount > preState.consoleErrorCount) {
        this.validationIssues.push({
          level: 'error',
          stepIndex: stepNum,
          action: step.action,
          check: 'console-errors',
          message: `${postState.consoleErrorCount - preState.consoleErrorCount} console error(s) occurred`,
        })
      }

      // Action-specific validation
      switch (step.action) {
        case 'type': {
          const result = await this.evaluate<{ valid: boolean; issues: Array<{ check: string; passed: boolean; message: string; warning?: boolean }> }>(`
            window.__demoValidation?.validateType('${this.escape(step.text)}', ${JSON.stringify(preState)}, ${JSON.stringify(postState)}) || { valid: true, issues: [] }
          `)
          for (const issue of result.issues) {
            this.validationIssues.push({
              level: issue.warning ? 'warning' : (issue.passed ? 'info' : 'error'),
              stepIndex: stepNum,
              action: step.action,
              check: issue.check,
              message: issue.message,
            })
          }
          return { valid: result.valid }
        }

        case 'click':
        case 'doubleClick': {
          const target = step.target || ''
          const result = await this.evaluate<{ valid: boolean; issues: Array<{ check: string; passed: boolean; message: string; warning?: boolean }> }>(`
            window.__demoValidation?.validateClick('${this.escape(target)}', ${JSON.stringify(preState)}, ${JSON.stringify(postState)}) || { valid: true, issues: [] }
          `)
          for (const issue of result.issues) {
            this.validationIssues.push({
              level: issue.warning ? 'warning' : (issue.passed ? 'info' : 'error'),
              stepIndex: stepNum,
              action: step.action,
              check: issue.check,
              message: issue.message,
            })
          }
          return { valid: result.valid }
        }

        case 'createFile': {
          const result = await this.evaluate<{ valid: boolean; issues: Array<{ check: string; passed: boolean; message: string; warning?: boolean }> }>(`
            window.__demoValidation?.validateFileCreated('${this.escape(step.path)}', ${JSON.stringify(preState)}, ${JSON.stringify(postState)}) || { valid: true, issues: [] }
          `)
          for (const issue of result.issues) {
            this.validationIssues.push({
              level: issue.warning ? 'warning' : (issue.passed ? 'info' : 'error'),
              stepIndex: stepNum,
              action: step.action,
              check: issue.check,
              message: issue.message,
            })
          }
          return { valid: result.valid }
        }
      }

      return { valid: true }
    } catch {
      return { valid: true }
    }
  }

  /**
   * Capture current state from browser
   */
  private async captureState(stepNum: number): Promise<StateSnapshot> {
    try {
      await this.evaluate(`window.__demoValidation?.setCurrentStep(${stepNum})`)
      const state = await this.evaluate<StateSnapshot>(`
        window.__demoValidation?.captureState() || {
          timestamp: Date.now(),
          consoleErrorCount: 0,
          previewElementCount: 0
        }
      `)
      return state
    } catch {
      return {
        timestamp: Date.now(),
        consoleErrorCount: 0,
        previewElementCount: 0,
      }
    }
  }

  /**
   * Collect console errors from browser validation
   */
  private async collectConsoleErrors(): Promise<ConsoleError[]> {
    try {
      return await this.evaluate<ConsoleError[]>(`
        window.__demoValidation?.getConsoleErrors() || []
      `)
    } catch {
      return []
    }
  }

  /**
   * Generate validation report
   */
  private generateValidationReport(): DemoValidationReport {
    const errors = this.validationIssues.filter(i => i.level === 'error').length
    const warnings = this.validationIssues.filter(i => i.level === 'warning').length
    const infos = this.validationIssues.filter(i => i.level === 'info').length

    // In strict mode, warnings are also failures
    const success = this.validationConfig.level === 'strict'
      ? errors === 0 && warnings === 0
      : errors === 0

    return {
      success,
      summary: { errors, warnings, infos },
      issues: this.validationIssues,
      consoleErrors: this.consoleErrors,
      blockedSteps: this.blockedSteps,
      failedSteps: this.failedSteps,
    }
  }

  /**
   * Get detail string for a step (for timing report)
   */
  private getStepDetail(step: DemoAction): string | undefined {
    switch (step.action) {
      case 'moveTo': return step.target
      case 'click': return step.target
      case 'doubleClick': return step.target
      case 'type': return step.text.substring(0, 20) + (step.text.length > 20 ? '...' : '')
      case 'pressKey': return step.modifiers ? `${step.modifiers.join('+')}+${step.key}` : step.key
      case 'wait': return step.comment || `${step.duration}ms`
      case 'navigate': return step.url
      case 'highlight': return step.target
      case 'comment': return step.text.substring(0, 30) + (step.text.length > 30 ? '...' : '')
      case 'execute': return step.comment
      case 'validate': return step.comment || `${step.checks.length} checks`
      case 'createFile': return step.path
      case 'switchFile': return step.path
      default: return undefined
    }
  }

  /**
   * Generate timing report with analysis and suggestions
   */
  private generateTimingReport(totalMs: number): TimingReport {
    // Calculate by-action summary
    const byAction: Record<string, { count: number; totalMs: number; avgMs: number }> = {}

    for (const step of this.stepTimings) {
      if (!byAction[step.action]) {
        byAction[step.action] = { count: 0, totalMs: 0, avgMs: 0 }
      }
      byAction[step.action].count++
      byAction[step.action].totalMs += step.executionMs
    }

    // Calculate averages
    for (const action of Object.keys(byAction)) {
      byAction[action].avgMs = Math.round(byAction[action].totalMs / byAction[action].count)
    }

    // Generate suggestions
    const suggestions = this.generateTimingSuggestions(byAction)

    return {
      totalMs,
      steps: this.stepTimings,
      byAction,
      suggestions,
    }
  }

  /**
   * Generate optimization suggestions based on timing data
   */
  private generateTimingSuggestions(byAction: Record<string, { count: number; totalMs: number; avgMs: number }>): TimingSuggestion[] {
    const suggestions: TimingSuggestion[] = []

    // Optimal timing targets (in ms)
    const optimalTimings: Record<string, { target: number; reason: string }> = {
      wait: { target: 300, reason: 'Most waits can be shorter - viewers process fast' },
      moveTo: { target: 450, reason: 'Mouse moves should be visible but not slow' },
      type: { target: 40, reason: 'Typing can be faster while staying readable' },
      click: { target: 150, reason: 'Clicks need brief feedback moment' },
      highlight: { target: 800, reason: 'Highlights should be noticeable but brief' },
    }

    for (const [action, stats] of Object.entries(byAction)) {
      const optimal = optimalTimings[action]
      if (optimal && stats.avgMs > optimal.target * 1.5) {
        suggestions.push({
          target: action,
          currentMs: stats.avgMs,
          suggestedMs: optimal.target,
          reason: optimal.reason,
        })
      }
    }

    // Check for very long individual steps
    for (const step of this.stepTimings) {
      if (step.action === 'wait' && step.configuredWaitMs && step.configuredWaitMs > 1000) {
        suggestions.push({
          target: `Step ${step.stepIndex} (wait)`,
          currentMs: step.configuredWaitMs,
          suggestedMs: Math.min(step.configuredWaitMs, 800),
          reason: 'Long waits slow down the demo - consider reducing',
        })
      }
    }

    return suggestions
  }

  /**
   * Print validation summary
   */
  private printSummary(
    name: string,
    success: boolean,
    failedValidations: ValidationResult[],
    timing?: TimingReport,
    validation?: DemoValidationReport
  ): void {
    console.log('')
    if (success) {
      console.log(`✅ Demo completed: ${name}`)
      if (this.validationResults.length > 0) {
        console.log(`   ${this.validationResults.length} manual validation(s) passed`)
      }
      if (validation) {
        console.log(`   🔒 Auto-validation passed (${validation.summary.warnings} warnings)`)
      }
    } else {
      console.log(`❌ Demo failed: ${name}`)
      if (failedValidations.length > 0) {
        console.log(`   ${failedValidations.length} validation(s) failed:`)
        for (const result of failedValidations) {
          console.log(`     • ${result.message}`)
        }
      }
      if (this.errors.length > 0) {
        console.log(`   ${this.errors.length} error(s):`)
        for (const error of this.errors) {
          console.log(`     • ${error}`)
        }
      }
      if (validation && !validation.success) {
        console.log(`   🔒 Auto-validation failed: ${validation.summary.errors} error(s)`)
      }
    }
    console.log('')

    // Print validation report if enabled
    if (validation && (validation.issues.length > 0 || validation.consoleErrors.length > 0)) {
      this.printValidationReport(validation)
    }

    // Print timing report if enabled
    if (timing) {
      this.printTimingReport(timing)
    }
  }

  /**
   * Print validation report
   */
  private printValidationReport(validation: DemoValidationReport): void {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('🔒 VALIDATION REPORT')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('')

    // Summary
    const statusIcon = validation.success ? '✅' : '❌'
    console.log(`${statusIcon} Status: ${validation.success ? 'PASSED' : 'FAILED'}`)
    console.log(`   Errors: ${validation.summary.errors}`)
    console.log(`   Warnings: ${validation.summary.warnings}`)
    console.log(`   Infos: ${validation.summary.infos}`)
    console.log('')

    // Blocked steps (failed pre-validation)
    if (validation.blockedSteps.length > 0) {
      console.log(`🚫 Blocked Steps (target not ready): ${validation.blockedSteps.join(', ')}`)
      console.log('')
    }

    // Failed steps (failed post-validation)
    if (validation.failedSteps.length > 0) {
      console.log(`⚠️  Steps with Issues: ${validation.failedSteps.join(', ')}`)
      console.log('')
    }

    // Issues by step
    if (validation.issues.length > 0) {
      console.log('📋 Issues:')
      const issuesByStep = new Map<number, ValidationIssue[]>()
      for (const issue of validation.issues) {
        if (!issuesByStep.has(issue.stepIndex)) {
          issuesByStep.set(issue.stepIndex, [])
        }
        issuesByStep.get(issue.stepIndex)!.push(issue)
      }

      for (const [stepNum, issues] of Array.from(issuesByStep.entries()).sort((a, b) => a[0] - b[0])) {
        console.log(`   Step ${stepNum}:`)
        for (const issue of issues) {
          const icon = issue.level === 'error' ? '❌' : issue.level === 'warning' ? '⚠️' : 'ℹ️'
          console.log(`     ${icon} [${issue.check}] ${issue.message}`)
        }
      }
      console.log('')
    }

    // Console errors
    if (validation.consoleErrors.length > 0) {
      console.log('🔴 Console Errors:')
      for (const error of validation.consoleErrors) {
        const stepInfo = error.stepIndex ? ` (step ${error.stepIndex})` : ''
        const sourceInfo = error.source ? ` at ${error.source}:${error.line}` : ''
        console.log(`   • ${error.message}${stepInfo}${sourceInfo}`)
      }
      console.log('')
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  }

  /**
   * Print timing report
   */
  private printTimingReport(timing: TimingReport): void {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('⏱️  TIMING REPORT')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('')

    // Total duration
    const totalSec = (timing.totalMs / 1000).toFixed(1)
    console.log(`📊 Total Duration: ${totalSec}s (${timing.totalMs}ms)`)
    console.log('')

    // By action summary
    console.log('📋 By Action Type:')
    console.log('   ┌─────────────────┬───────┬──────────┬──────────┐')
    console.log('   │ Action          │ Count │ Total ms │ Avg ms   │')
    console.log('   ├─────────────────┼───────┼──────────┼──────────┤')

    // Sort by total time descending
    const sortedActions = Object.entries(timing.byAction)
      .sort((a, b) => b[1].totalMs - a[1].totalMs)

    for (const [action, stats] of sortedActions) {
      const actionPadded = action.padEnd(15)
      const countPadded = String(stats.count).padStart(5)
      const totalPadded = String(stats.totalMs).padStart(8)
      const avgPadded = String(stats.avgMs).padStart(8)
      console.log(`   │ ${actionPadded} │${countPadded} │${totalPadded} │${avgPadded} │`)
    }
    console.log('   └─────────────────┴───────┴──────────┴──────────┘')
    console.log('')

    // Top 10 slowest steps
    const slowestSteps = [...timing.steps]
      .sort((a, b) => b.executionMs - a.executionMs)
      .slice(0, 10)

    console.log('🐢 Top 10 Slowest Steps:')
    for (const step of slowestSteps) {
      const detail = step.detail ? ` (${step.detail})` : ''
      console.log(`   ${String(step.stepIndex).padStart(3)}. ${step.action}${detail}: ${step.executionMs}ms`)
    }
    console.log('')

    // Suggestions
    if (timing.suggestions.length > 0) {
      console.log('💡 Optimization Suggestions:')
      for (const sug of timing.suggestions) {
        console.log(`   • ${sug.target}: ${sug.currentMs}ms → ${sug.suggestedMs}ms`)
        console.log(`     ${sug.reason}`)
      }
      console.log('')
    }

    // Estimated optimized time
    const optimizedTime = this.estimateOptimizedTime(timing)
    if (optimizedTime < timing.totalMs * 0.9) {
      const savedTime = ((timing.totalMs - optimizedTime) / 1000).toFixed(1)
      const optimizedSec = (optimizedTime / 1000).toFixed(1)
      console.log(`⚡ Estimated optimized time: ${optimizedSec}s (save ~${savedTime}s)`)
      console.log('')
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  }

  /**
   * Estimate optimized demo time based on suggestions
   */
  private estimateOptimizedTime(timing: TimingReport): number {
    let optimized = timing.totalMs

    // Optimal timing targets
    const optimalTimings: Record<string, number> = {
      wait: 300,
      moveTo: 450,
      click: 150,
      highlight: 800,
    }

    for (const [action, stats] of Object.entries(timing.byAction)) {
      const optimal = optimalTimings[action]
      if (optimal && stats.avgMs > optimal) {
        const savings = (stats.avgMs - optimal) * stats.count
        optimized -= savings
      }
    }

    return Math.max(optimized, timing.totalMs * 0.5) // Don't suggest more than 50% reduction
  }

  /**
   * Inject demo API into browser
   */
  private async injectDemoAPI(config: DemoConfig): Promise<void> {
    // Get timing profile
    const timings = getTimingProfile(config.pacing)

    // Apply custom timing overrides if provided
    const effectiveTimings = config.customTimings
      ? this.mergeTimings(timings, config.customTimings)
      : timings

    const apiCode = getDemoAPISource(effectiveTimings)
    await this.evaluate(apiCode)
    await this.evaluate(`window.__mirrorDemo.init(${JSON.stringify(config)})`)
    console.log(`   🎯 Demo API initialized (pacing: ${config.pacing})`)
  }

  /**
   * Inject validation API into browser
   */
  private async injectValidationAPI(): Promise<void> {
    const validationCode = getElementValidationCode()
    await this.evaluate(validationCode)
    console.log(`   🔒 Validation API initialized`)
  }

  /**
   * Merge custom timings with base profile
   */
  private mergeTimings(base: ActionTimings, custom: Partial<ActionTimings>): ActionTimings {
    return {
      moveTo: { ...base.moveTo, ...custom.moveTo },
      click: { ...base.click, ...custom.click },
      doubleClick: { ...base.doubleClick, ...custom.doubleClick },
      type: { ...base.type, ...custom.type },
      pressKey: { ...base.pressKey, ...custom.pressKey },
      wait: { ...base.wait, ...custom.wait },
      highlight: { ...base.highlight, ...custom.highlight },
      comment: { ...base.comment, ...custom.comment },
      transitions: { ...base.transitions, ...custom.transitions },
    }
  }

  /**
   * Execute a single demo step
   */
  private async executeStep(step: DemoAction, stepNum: number, total: number): Promise<void> {
    const prefix = `   [${stepNum}/${total}]`

    switch (step.action) {
      case 'navigate':
        console.log(`${prefix} Navigate to ${step.url}`)
        await this.cdp.send('Page.navigate', { url: step.url })
        await this.waitForPageLoad()
        break

      case 'wait':
        console.log(`${prefix} Wait ${step.duration}ms${step.comment ? ` - ${step.comment}` : ''}`)
        await this.evaluate(`__mirrorDemo.wait(${step.duration})`)
        break

      case 'moveTo':
        console.log(`${prefix} Move to ${step.target}`)
        try {
          await this.evaluate(
            `__mirrorDemo.moveTo('${this.escape(step.target)}'${step.duration ? `, ${step.duration}` : ''})`
          )
        } catch (err) {
          console.log(`        ⚠️  MoveTo warning: ${err instanceof Error ? err.message : String(err)}`)
        }
        break

      case 'click':
        console.log(`${prefix} Click${step.target ? ` on ${step.target}` : ''}`)
        try {
          await this.evaluate(
            `__mirrorDemo.click(${step.target ? `'${this.escape(step.target)}'` : ''})`
          )
        } catch (err) {
          console.log(`        ⚠️  Click warning: ${err instanceof Error ? err.message : String(err)}`)
        }
        break

      case 'doubleClick':
        console.log(`${prefix} Double-click${step.target ? ` on ${step.target}` : ''}`)
        await this.evaluate(
          `__mirrorDemo.doubleClick(${step.target ? `'${this.escape(step.target)}'` : ''})`
        )
        break

      case 'type':
        console.log(`${prefix} Type: "${step.text.substring(0, 30)}${step.text.length > 30 ? '...' : ''}"`)
        await this.evaluate(
          `__mirrorDemo.type('${this.escape(step.text)}'${step.target ? `, '${this.escape(step.target)}'` : ''})`
        )
        break

      case 'pressKey':
        const modStr = step.modifiers?.join('+') || ''
        console.log(`${prefix} Press key: ${modStr ? modStr + '+' : ''}${step.key}`)
        await this.evaluate(
          `__mirrorDemo.pressKey('${step.key}'${step.modifiers ? `, ${JSON.stringify(step.modifiers)}` : ''})`
        )
        break

      case 'drag':
        console.log(`${prefix} Drag from ${step.from} to ${step.to}`)
        await this.evaluate(
          `__mirrorDemo.drag('${this.escape(step.from)}', '${this.escape(step.to)}')`
        )
        break

      case 'scroll':
        console.log(`${prefix} Scroll ${step.deltaY > 0 ? 'down' : 'up'} ${Math.abs(step.deltaY)}px`)
        await this.evaluate(
          `__mirrorDemo.scroll(${step.deltaY}${step.target ? `, '${this.escape(step.target)}'` : ''})`
        )
        break

      case 'highlight':
        console.log(`${prefix} Highlight ${step.target}`)
        await this.evaluate(
          `__mirrorDemo.highlight('${this.escape(step.target)}'${step.duration ? `, ${step.duration}` : ''})`
        )
        break

      case 'comment':
        console.log(`${prefix} 📝 ${step.text}`)
        // Comments are just for logging, no browser action
        break

      case 'execute':
        console.log(`${prefix} ⚡ Execute${step.comment ? `: ${step.comment}` : ''}`)
        try {
          await this.evaluate(step.code)
          await this.evaluate('__mirrorDemo.wait(100)')
        } catch (err) {
          // Log but don't fail on execute errors - they're often non-critical
          console.log(`        ⚠️  Execute warning: ${err instanceof Error ? err.message : String(err)}`)
        }
        break

      case 'clearEditor':
        console.log(`${prefix} 🗑️  Clear editor${step.comment ? `: ${step.comment}` : ''}`)
        await this.evaluate(`
          (async () => {
            const editor = window.editor;
            if (editor) {
              const len = editor.state.doc.length;
              editor.dispatch({ changes: { from: 0, to: len, insert: '' } });
            }
            await new Promise(r => setTimeout(r, 200));
          })()
        `)
        break

      case 'createFile':
        console.log(`${prefix} 📄 Create file: ${step.path}`)
        const escapedContent = step.content.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$/g, '\\$')
        await this.evaluate(`
          (async () => {
            const content = \`${escapedContent}\`;
            if (window.storage) {
              await window.storage.writeFile('${step.path}', content);
              await new Promise(r => setTimeout(r, 300));
            }
          })()
        `)
        if (step.switchTo) {
          await this.evaluate(`
            (async () => {
              if (window.selectFile) {
                window.selectFile('${step.path}');
              } else if (window.desktopFiles?.selectFile) {
                window.desktopFiles.selectFile('${step.path}');
              }
              await new Promise(r => setTimeout(r, 300));
            })()
          `)
        }
        break

      case 'switchFile':
        console.log(`${prefix} 📂 Switch to: ${step.path}`)
        await this.evaluate(`
          (async () => {
            if (window.selectFile) {
              window.selectFile('${step.path}');
            } else if (window.desktopFiles?.selectFile) {
              window.desktopFiles.selectFile('${step.path}');
            }
            await new Promise(r => setTimeout(r, 500));
          })()
        `)
        break

      case 'validate':
        console.log(`${prefix} 🔍 Validate${step.comment ? `: ${step.comment}` : ` (${step.checks.length} checks)`}`)
        for (const check of step.checks) {
          const result = await this.runValidationCheck(check)
          this.validationResults.push(result)
          if (result.success) {
            console.log(`        ✓ ${result.message}`)
          } else {
            console.log(`        ✗ ${result.message}`)
          }
        }
        break
    }
  }

  /**
   * Run a single validation check
   */
  private async runValidationCheck(check: ValidationCheck): Promise<ValidationResult> {
    switch (check.type) {
      case 'exists': {
        const exists = await this.evaluate<boolean>(`
          !!document.querySelector('${this.escape(check.selector)}')
        `)
        return {
          success: exists,
          check,
          message: exists
            ? `Element exists: ${check.selector}`
            : `Element NOT found: ${check.selector}`,
        }
      }

      case 'textContains': {
        const result = await this.evaluate<{ found: boolean; actual: string }>(`
          (function() {
            const el = document.querySelector('${this.escape(check.selector)}');
            if (!el) return { found: false, actual: 'Element not found' };
            const text = el.textContent || '';
            return { found: text.includes('${this.escape(check.text)}'), actual: text.substring(0, 100) };
          })()
        `)
        return {
          success: result.found,
          check,
          message: result.found
            ? `Text contains "${check.text}" in ${check.selector}`
            : `Text does NOT contain "${check.text}" in ${check.selector}. Actual: "${result.actual}"`,
          actual: result.actual,
        }
      }

      case 'elementCount': {
        const count = await this.evaluate<number>(`
          document.querySelectorAll('${this.escape(check.selector)}').length
        `)
        let success = true
        let expected = ''
        if (check.count !== undefined) {
          success = count === check.count
          expected = `exactly ${check.count}`
        } else {
          if (check.min !== undefined && count < check.min) {
            success = false
          }
          if (check.max !== undefined && count > check.max) {
            success = false
          }
          if (check.min !== undefined && check.max !== undefined) {
            expected = `between ${check.min} and ${check.max}`
          } else if (check.min !== undefined) {
            expected = `at least ${check.min}`
          } else if (check.max !== undefined) {
            expected = `at most ${check.max}`
          }
        }
        return {
          success,
          check,
          message: success
            ? `Found ${count} elements matching ${check.selector}`
            : `Expected ${expected} elements matching ${check.selector}, found ${count}`,
          actual: count,
        }
      }

      case 'value': {
        const result = await this.evaluate<{ found: boolean; actual: string }>(`
          (function() {
            const el = document.querySelector('${this.escape(check.selector)}');
            if (!el) return { found: false, actual: 'Element not found' };
            const value = el.value || '';
            return { found: value === '${this.escape(check.value)}', actual: value };
          })()
        `)
        return {
          success: result.found,
          check,
          message: result.found
            ? `Value matches "${check.value}" in ${check.selector}`
            : `Value does NOT match "${check.value}" in ${check.selector}. Actual: "${result.actual}"`,
          actual: result.actual,
        }
      }

      case 'fileExists': {
        const exists = await this.evaluate<boolean>(`
          (function() {
            if (window.storage && typeof window.storage.getFile === 'function') {
              try {
                const content = window.storage.getFile('${this.escape(check.path)}');
                return content !== null && content !== undefined;
              } catch { return false; }
            }
            // Fallback: check localStorage
            const stored = localStorage.getItem('mirror-files');
            if (!stored) return false;
            const files = JSON.parse(stored);
            return '${this.escape(check.path)}' in files;
          })()
        `)
        return {
          success: exists,
          check,
          message: exists
            ? `File exists: ${check.path}`
            : `File NOT found: ${check.path}`,
        }
      }

      case 'editorContains': {
        const result = await this.evaluate<{ found: boolean; actual: string }>(`
          (function() {
            const editor = window.editor;
            if (!editor) return { found: false, actual: 'Editor not found' };
            const content = editor.state.doc.toString();
            return { found: content.includes('${this.escape(check.text)}'), actual: content.substring(0, 200) };
          })()
        `)
        return {
          success: result.found,
          check,
          message: result.found
            ? `Editor contains "${check.text.substring(0, 30)}${check.text.length > 30 ? '...' : ''}"`
            : `Editor does NOT contain "${check.text.substring(0, 30)}${check.text.length > 30 ? '...' : ''}"`,
          actual: result.actual,
        }
      }

      case 'previewContains': {
        const result = await this.evaluate<{ found: boolean; actual: string }>(`
          (function() {
            const preview = document.querySelector('#preview');
            if (!preview) return { found: false, actual: 'Preview not found' };
            const el = preview.querySelector('${this.escape(check.selector)}');
            if (!el) return { found: false, actual: 'Element not in preview' };
            if ('${check.text || ''}') {
              const text = el.textContent || '';
              return { found: text.includes('${this.escape(check.text || '')}'), actual: text.substring(0, 100) };
            }
            return { found: true, actual: 'Element found' };
          })()
        `)
        return {
          success: result.found,
          check,
          message: result.found
            ? check.text
              ? `Preview has "${check.text}" in ${check.selector}`
              : `Preview has element ${check.selector}`
            : `Preview check failed for ${check.selector}: ${result.actual}`,
          actual: result.actual,
        }
      }

      case 'noLintErrors': {
        const allowWarnings = check.allowWarnings ?? false
        const result = await this.evaluate<{ hasErrors: boolean; hasWarnings: boolean; errorCount: number; warningCount: number }>(`
          (function() {
            const editor = window.editor;
            if (!editor || !editor.dom) return { hasErrors: false, hasWarnings: false, errorCount: 0, warningCount: 0 };
            const errors = editor.dom.querySelectorAll('.cm-lintRange-error');
            const warnings = editor.dom.querySelectorAll('.cm-lintRange-warning');
            return {
              hasErrors: errors.length > 0,
              hasWarnings: warnings.length > 0,
              errorCount: errors.length,
              warningCount: warnings.length
            };
          })()
        `)
        const hasProblems = allowWarnings ? result.hasErrors : (result.hasErrors || result.hasWarnings)
        let message: string
        if (!hasProblems) {
          message = allowWarnings
            ? `No lint errors (${result.warningCount} warnings allowed)`
            : 'No lint errors or warnings'
        } else {
          const parts = []
          if (result.errorCount > 0) parts.push(`${result.errorCount} error(s)`)
          if (!allowWarnings && result.warningCount > 0) parts.push(`${result.warningCount} warning(s)`)
          message = `Lint issues found: ${parts.join(', ')}`
        }
        return {
          success: !hasProblems,
          check,
          message,
          actual: result.errorCount + result.warningCount,
        }
      }

      default:
        return {
          success: false,
          check,
          message: `Unknown validation type: ${(check as any).type}`,
        }
    }
  }

  /**
   * Clean up demo mode
   */
  private async cleanup(): Promise<void> {
    try {
      await this.evaluate('window.__mirrorDemo?.destroy()')
    } catch {
      // Ignore cleanup errors
    }
  }

  /**
   * Execute JavaScript in browser
   */
  private async evaluate<T>(expression: string): Promise<T> {
    const result = await this.cdp.send<{
      result: { value: T }
      exceptionDetails?: { text: string }
    }>('Runtime.evaluate', {
      expression,
      awaitPromise: true,
      returnByValue: true,
    })

    if (result.exceptionDetails) {
      throw new Error(result.exceptionDetails.text)
    }

    return result.result.value
  }

  /**
   * Wait for page load
   */
  private waitForPageLoad(): Promise<void> {
    return new Promise(resolve => {
      this.cdp.on('Page.loadEventFired', () => resolve())
    })
  }

  /**
   * Escape string for JavaScript
   */
  private escape(str: string): string {
    return str.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n')
  }
}

/**
 * Load a demo script from file
 */
export async function loadDemoScript(filePath: string): Promise<DemoScript> {
  const absolutePath = path.isAbsolute(filePath)
    ? filePath
    : path.join(process.cwd(), filePath)

  // Handle TypeScript and JavaScript files - use dynamic import
  if (absolutePath.endsWith('.ts') || absolutePath.endsWith('.js')) {
    // Use file:// URL for cross-platform compatibility
    const fileUrl = `file://${absolutePath}`
    const module = await import(fileUrl)
    return module.default || module.demoScript || Object.values(module)[0] as DemoScript
  }

  // Handle JSON files
  if (absolutePath.endsWith('.json')) {
    const content = fs.readFileSync(absolutePath, 'utf-8')
    return JSON.parse(content) as DemoScript
  }

  throw new Error(`Unsupported demo script format: ${filePath}. Use .ts, .js, or .json`)
}
