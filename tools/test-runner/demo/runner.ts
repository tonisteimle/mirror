/**
 * Demo Runner
 *
 * Orchestrates demo script execution via CDP.
 */

import type { CDPSession } from '../types'
import type {
  DemoScript,
  DemoAction,
  DemoConfig,
  SpeedPreset,
  ValidationCheck,
  ValidationResult,
  StepTiming,
  TimingReport,
  TimingSuggestion,
} from './types'
import type { PacingProfile, ActionTimings } from './timing'
import type {
  ValidationConfig,
  ValidationIssue,
  ConsoleError,
  StateSnapshot,
  DemoValidationReport,
} from './validation'
import { DEFAULT_CONFIG, SPEED_PRESETS, PACING_TO_SPEED } from './types'
import { getTimingProfile, TimingCalculator, formatDuration, compareProfiles } from './timing'
import {
  getElementValidationCode,
  getValidationConfig,
  DEFAULT_VALIDATION_CONFIG,
} from './validation'
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
      // Hand-built mac-style pointer. Tip is at SVG (0,0) so element.left/top
      // align directly with the cursor hotspot (no offset math needed).
      // Mac-style pointer. Body is a triangle (tip 0,0 → left-bottom 0,14 →
      // right-shoulder 12,11). The tail is a parallelogram whose base sits
      // exactly on the body's bottom diagonal: left-attach (4,13) and
      // right-attach (7,12) both lie on the line y = 14 - 0.25x. So the
      // "Strich" actually stands on the "Dreieck".
      this.element.innerHTML = '<svg width="20" height="22" viewBox="-1 -1 16 22" xmlns="http://www.w3.org/2000/svg"><polygon points="0,0 0,14 4,13 7,18 10,17 7,12 12,11" fill="white" stroke="black" stroke-width="1.2" stroke-linejoin="round"/></svg>';
      this.element.style.cssText = 'position:fixed;width:20px;height:22px;pointer-events:none;z-index:999999;transform:translate(-1px,-1px);transition:none;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.45));';
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
      // Fake demo cursor removed — the OS-level mouse driver (driver=os)
      // now drives the real macOS cursor, so any synthetic SVG pointer would
      // produce a confusing double-cursor. KeystrokeOverlay (key chips
      // bottom-right) stays — it complements typing visually.
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
// Mirror Actions API (injected separately, alongside the demo cursor API)
//
// Provides high-level helpers used by dropFromPalette / moveElement /
// dragResize / dragPadding / dragMargin / inlineEdit / selectInPreview /
// setProperty / pickColor / aiPrompt. Centralizes cursor sync + selector
// resolution + DOM snapshotting + AI mock listener.
// =============================================================================

const MIRROR_ACTIONS_API = `
(function() {
  if (window.__mirrorActions) return;

  const delay = (ms) => new Promise(r => setTimeout(r, ms));

  // ===========================================================================
  // Selector resolution (E1) — strukturierte Objekte → nodeId
  // ===========================================================================

  function _allMirrorElements() {
    return Array.from(document.querySelectorAll('#preview [data-mirror-id]'));
  }

  function _matchByText(needle, all) {
    if (needle instanceof RegExp) {
      return all.filter(el => needle.test(el.textContent || ''));
    }
    return all.filter(el => (el.textContent || '').trim() === needle);
  }

  function _matchByPath(path) {
    const segments = path.split('>').map(s => s.trim()).filter(Boolean);
    if (segments.length === 0) return [];
    const preview = document.getElementById('preview');
    if (!preview) return [];
    const matchSegment = (el, seg) => {
      const lower = seg.toLowerCase();
      if (el.tagName.toLowerCase() === lower) return true;
      if ((el.getAttribute('data-mirror-name') || '').toLowerCase() === lower) return true;
      return false;
    };
    let candidates = Array.from(preview.querySelectorAll('[data-mirror-id]'));
    candidates = candidates.filter(el => matchSegment(el, segments[0]));
    for (let i = 1; i < segments.length; i++) {
      const next = [];
      for (const c of candidates) {
        const descendants = Array.from(c.querySelectorAll('[data-mirror-id]'));
        for (const d of descendants) {
          if (matchSegment(d, segments[i])) next.push(d);
        }
      }
      candidates = next;
    }
    return candidates;
  }

  function _selectorDescription(sel) { return JSON.stringify(sel); }

  function resolveSelector(sel) {
    if (!sel || typeof sel !== 'object') {
      throw new Error('Selector must be a structured object, got: ' + JSON.stringify(sel));
    }
    if ('byId' in sel) {
      const el = document.querySelector('[data-mirror-id="' + sel.byId + '"]');
      if (!el) throw new Error('Selector ' + _selectorDescription(sel) + ' matched 0 elements');
      return sel.byId;
    }
    if ('byTestId' in sel) {
      const el = document.querySelector('[data-test-id="' + sel.byTestId + '"][data-mirror-id]');
      if (!el) throw new Error('Selector ' + _selectorDescription(sel) + ' matched 0 elements');
      return el.getAttribute('data-mirror-id');
    }
    let matches = [];
    if ('byText' in sel) {
      matches = _matchByText(sel.byText, _allMirrorElements());
    } else if ('byTag' in sel) {
      matches = _allMirrorElements().filter(el => el.tagName.toLowerCase() === sel.byTag.toLowerCase());
    } else if ('byRole' in sel) {
      matches = _allMirrorElements().filter(el => (el.getAttribute('role') || '').toLowerCase() === sel.byRole.toLowerCase());
    } else if ('byPath' in sel) {
      matches = _matchByPath(sel.byPath);
    } else {
      throw new Error('Unknown selector kind: ' + _selectorDescription(sel));
    }
    const nth = (sel && 'nth' in sel) ? sel.nth : undefined;
    if (matches.length === 0) {
      throw new Error('Selector ' + _selectorDescription(sel) + ' matched 0 elements');
    }
    if (matches.length > 1 && nth === undefined) {
      throw new Error('Selector ' + _selectorDescription(sel) + ' matched ' + matches.length +
        ' elements; specify nth (0-based) to disambiguate');
    }
    const target = nth === undefined ? matches[0] : matches[nth];
    if (!target) {
      throw new Error('Selector ' + _selectorDescription(sel) + ' nth=' + nth +
        ' out of range (matched ' + matches.length + ')');
    }
    const id = target.getAttribute('data-mirror-id');
    if (!id) throw new Error('Resolved element has no data-mirror-id: ' + _selectorDescription(sel));
    return id;
  }

  // ===========================================================================
  // Cursor sync — animate demo cursor in parallel with real Studio op
  // ===========================================================================

  function dropChildIndexPoint(targetEl, index) {
    const children = Array.from(targetEl.children)
      .filter(el => el.hasAttribute && el.hasAttribute('data-mirror-id'));
    if (children.length === 0) {
      const r = targetEl.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    }
    if (index >= children.length) {
      const r = children[children.length - 1].getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.bottom + 8 };
    }
    const r = children[index].getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top - 4 };
  }

  /**
   * Sequential, watcher-friendly drag flow:
   *  1. press-effect at the current cursor position (the source)
   *  2. cursor glides to targetPoint (paced by ACTION_TIMINGS.moveTo)
   *  3. real DOM operation fires roughly when the cursor is near the target
   *     (so the drop materializes as the pointer arrives — feels like a drag)
   *  4. release-effect at the target
   *  5. settle pause so the viewer can see the result
   *
   * Use this instead of the old parallel withCursorSync — it makes the
   * pointer-and-payload connection visible.
   */
  async function withVisibleDrag(targetPoint, realOpFn, opts) {
    opts = opts || {};
    const cursor = window.__mirrorDemo && window.__mirrorDemo.cursor;

    // 1. Source press-effect (cursor is already at the source from a prior moveTo)
    if (cursor) cursor.showClickEffect();
    await delay(opts.preHoldMs ?? 200);

    // 2. Cursor motion + delayed op fire so payload appears just before arrival
    const moveDur = opts.moveMs ?? (cursor && targetPoint ? cursor.calculateDuration(targetPoint) : 0);
    const triggerAt = Math.max(0, Math.round(moveDur * (opts.triggerFrac ?? 0.7)));
    const motionPromise = cursor && targetPoint ? cursor.moveTo(targetPoint, moveDur) : Promise.resolve();
    const opPromise = (async () => { await delay(triggerAt); return realOpFn(); })();

    await motionPromise;
    const result = await opPromise;

    // 3. Release-effect + settle
    if (cursor) cursor.showClickEffect();
    await delay(opts.settleMs ?? 280);

    return result;
  }

  // Back-compat shim: existing callers using withCursorSync still work but get
  // the new sequential semantics. Same signature.
  async function withCursorSync(endPoint, durationMs, realOpFn) {
    return withVisibleDrag(endPoint, realOpFn, { moveMs: durationMs });
  }

  /**
   * Truly visible drag: dispatches real mousedown → many slow mousemove →
   * mouseup events ourselves so the dragged handle / element follows the
   * cursor in real time. Replaces the atomic 5-step __mirrorTest.interact
   * helpers (~100ms total) with a paced loop.
   *
   * The handle/document listeners react naturally to each mousemove, so the
   * resize / padding / margin code paths stay genuine — only the cadence
   * changes. Cursor position is updated synchronously with each event.
   */
  // Mirrors studio/test-api/interactions.ts dispatchMouseEvent — no button/
  // buttons fields, so we match the existing tests' working contract exactly.
  function _dispatchMouse(target, type, x, y, eventOpts) {
    const ev = new MouseEvent(type, {
      bubbles: true,
      cancelable: true,
      view: window,
      clientX: x,
      clientY: y,
      shiftKey: !!(eventOpts && eventOpts.shiftKey),
      altKey:   !!(eventOpts && eventOpts.altKey),
      ctrlKey:  !!(eventOpts && eventOpts.ctrlKey),
      metaKey:  !!(eventOpts && eventOpts.metaKey),
    });
    target.dispatchEvent(ev);
  }

  function _easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  /**
   * @param sourceEl    DOM element where the drag starts (target of mousedown)
   * @param startPoint  client coords for mousedown
   * @param endPoint    client coords for final mouseup
   * @param opts        { durationMs, steps, eventOpts, moveTarget }
   *                    moveTarget defaults to document — many app drag
   *                    listeners attach to document, not the handle.
   */
  async function manualDrag(sourceEl, startPoint, endPoint, opts) {
    opts = opts || {};
    const cursor = window.__mirrorDemo && window.__mirrorDemo.cursor;
    const dx = endPoint.x - startPoint.x;
    const dy = endPoint.y - startPoint.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    // Default cadence: ~16ms per step (≈60fps); duration scales with distance
    // but at least 600ms so the eye can follow.
    const durationMs = opts.durationMs ?? Math.max(600, Math.min(2000, 400 + dist * 3));
    const steps = opts.steps ?? Math.max(20, Math.round(durationMs / 16));
    const stepMs = durationMs / steps;
    const eventOpts = opts.eventOpts || {};
    const moveTarget = opts.moveTarget || document;

    // Mouse-down on the actual handle element
    _dispatchMouse(sourceEl, 'mousedown', startPoint.x, startPoint.y, eventOpts);
    if (cursor) {
      cursor.updatePosition(startPoint);
      cursor.showClickEffect();
    }
    await delay(80);

    // Paced mousemove loop with eased progress
    for (let i = 1; i <= steps; i++) {
      const eased = _easeInOutCubic(i / steps);
      const x = startPoint.x + dx * eased;
      const y = startPoint.y + dy * eased;
      _dispatchMouse(moveTarget, 'mousemove', x, y, eventOpts);
      if (cursor) cursor.updatePosition({ x, y });
      await delay(stepMs);
    }

    // Mouse-up at end
    _dispatchMouse(moveTarget, 'mouseup', endPoint.x, endPoint.y, eventOpts);
    if (cursor) cursor.showClickEffect();
    await delay(140);
  }

  // ===========================================================================
  // Mirror actions
  // ===========================================================================

  // Move the demo cursor to an element's center, paced by ACTION_TIMINGS.moveTo.
  // Returns the visited point so callers can compose drag flows around it.
  async function visitElement(el) {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const point = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    const cursor = window.__mirrorDemo && window.__mirrorDemo.cursor;
    if (cursor) await cursor.moveTo(point);
    return point;
  }

  // Create a small "drag ghost" that follows the demo cursor by RAF
  // polling the cursor's position. Returns a destroy function.
  function attachDragGhost(label) {
    const cursor = window.__mirrorDemo && window.__mirrorDemo.cursor;
    if (!cursor) return function() {};
    const ghost = document.createElement('div');
    ghost.style.cssText =
      'position:fixed;' +
      'width:80px;height:60px;' +
      'background:rgba(91,168,245,0.18);' +
      'border:2px solid rgba(91,168,245,0.85);' +
      'border-radius:6px;' +
      'box-shadow:0 6px 20px rgba(0,0,0,0.35);' +
      'pointer-events:none;' +
      'z-index:999998;' +
      'display:flex;align-items:center;justify-content:center;' +
      'color:white;font-family:system-ui,-apple-system,sans-serif;' +
      'font-size:11px;font-weight:600;' +
      'text-shadow:0 1px 2px rgba(0,0,0,0.6);' +
      'transform:translate(0,0);' +
      'opacity:0;' +
      'transition:opacity 180ms ease-out;';
    ghost.textContent = label || '';
    document.body.appendChild(ghost);

    let rafHandle = 0;
    let alive = true;
    function tick() {
      if (!alive) return;
      const p = cursor.getPosition();
      // Cursor tip is at p; offset ghost so it sits down-right of the tip.
      ghost.style.left = (p.x + 14) + 'px';
      ghost.style.top  = (p.y + 14) + 'px';
      rafHandle = requestAnimationFrame(tick);
    }
    requestAnimationFrame(function() { ghost.style.opacity = '1'; tick(); });

    return function destroy() {
      alive = false;
      if (rafHandle) cancelAnimationFrame(rafHandle);
      ghost.style.transition = 'opacity 220ms ease-in';
      ghost.style.opacity = '0';
      setTimeout(function() { ghost.remove(); }, 240);
    };
  }


  // Apply a transient "pressed/grabbed" style to a palette item so the
  // viewer sees the cursor actually engaging with it. Returns a release
  // function that restores the original style.
  function pressPaletteItem(el) {
    if (!el) return function() {};
    const prev = {
      transform: el.style.transform,
      boxShadow: el.style.boxShadow,
      transition: el.style.transition,
      filter: el.style.filter,
    };
    el.style.transition = 'transform 140ms ease-out, box-shadow 140ms ease-out, filter 140ms ease-out';
    el.style.transform = (prev.transform || '') + ' scale(1.06)';
    el.style.boxShadow = '0 8px 24px rgba(91,168,245,0.55), 0 0 0 2px rgba(91,168,245,0.85) inset';
    el.style.filter = 'brightness(1.15)';
    return function release() {
      el.style.transition = 'transform 200ms ease-in, box-shadow 200ms ease-in, filter 200ms ease-in';
      el.style.transform = prev.transform;
      el.style.boxShadow = prev.boxShadow;
      el.style.filter = prev.filter;
      setTimeout(function() {
        el.style.transition = prev.transition;
      }, 220);
    };
  }

  async function dropFromPalette(component, targetSel, at) {
    // 1. Always visit the palette source first so the viewer sees where
    //    the dragged item is coming from. Palette items render as
    //    .component-panel-item with dataset.id — selector must be
    //    [data-id], NOT [data-component-id].
    const lower = component.toLowerCase();
    const paletteEl = document.querySelector('#components-panel [data-id="comp-' + lower + '"]')
      || document.querySelector('#components-panel [data-id="' + lower + '"]');
    if (paletteEl) await visitElement(paletteEl);

    // === Special case: empty / canvas-only editor (no node tree yet) ===
    // Mirror only renders DOM nodes for layout elements; a bare canvas
    // declaration produces no [data-mirror-id]. The real Studio drag
    // pipeline can't engage in this state. We synthesize a convincing
    // drop visual ourselves: container highlight + insertion line at the
    // predicted landing point, cursor glides there, code is appended via
    // setTestCode just as the cursor arrives.
    {
      const editor = window.editor;
      const codeBefore = editor && editor.state ? editor.state.doc.toString() : '';
      const trimmed = codeBefore.trim();
      const isEmpty = trimmed === '';
      // Regex inside MIRROR_ACTIONS_API template — escape backslashes so
      // \\b and \\n survive into the browser-side string.
      const isCanvasOnly = /^canvas\\b[^\\n]*$/i.test(trimmed);
      if (isEmpty || isCanvasOnly) {
        const previewEl = document.querySelector('#preview');
        const previewRect = previewEl.getBoundingClientRect();

        // Predicted landing: a Frame w 100 h 100 would render at the
        // top-left of the canvas in flex-column layout. The drop point
        // sits just below the canvas top, horizontally centered on where
        // the new element will appear (left + half the new element width).
        const NEW_W = 100;
        const dropPoint = {
          x: previewRect.left + 24 + NEW_W / 2,
          y: previewRect.top + 24 + NEW_W / 2,
        };

        // Synthetic container highlight + insertion line. Matches Mirror's
        // own indicator colors so the viewer can't tell it's our fake.
        const containerRing = document.createElement('div');
        containerRing.style.cssText =
          'position:fixed;' +
          'left:' + (previewRect.left + 8) + 'px;' +
          'top:' + (previewRect.top + 8) + 'px;' +
          'width:' + (previewRect.width - 16) + 'px;' +
          'height:' + (previewRect.height - 16) + 'px;' +
          'border:2px dashed #5BA8F5;' +
          'border-radius:8px;' +
          'background:rgba(91,168,245,0.05);' +
          'pointer-events:none;' +
          'z-index:999990;' +
          'opacity:0;' +
          'transition:opacity 240ms ease-out;';
        document.body.appendChild(containerRing);

        const insertionLine = document.createElement('div');
        insertionLine.style.cssText =
          'position:fixed;' +
          'left:' + (previewRect.left + 24) + 'px;' +
          'top:' + (previewRect.top + 22) + 'px;' +
          'width:' + Math.min(NEW_W * 1.5, previewRect.width - 48) + 'px;' +
          'height:3px;' +
          'background:#5BA8F5;' +
          'box-shadow:0 0 8px rgba(91,168,245,0.6);' +
          'border-radius:2px;' +
          'pointer-events:none;' +
          'z-index:999991;' +
          'opacity:0;' +
          'transition:opacity 200ms ease-out;';
        document.body.appendChild(insertionLine);

        // Visual pickup: press the palette item, then a ghost rectangle
        // follows the cursor so the viewer literally sees the Frame
        // travel from palette to drop point.
        const releasePalette = pressPaletteItem(paletteEl);
        const destroyGhost = attachDragGhost(component);

        try {
          // Show indicators just BEFORE the cursor arrives so they hit
          // the eye at the right beat (not when cursor is far away).
          const showAt = setTimeout(() => {
            containerRing.style.opacity = '1';
            insertionLine.style.opacity = '1';
          }, 800);

          const newLine = component + ' w 100, h 100, bg #27272a, rad 8';
          const newCode = isEmpty ? newLine : (trimmed + '\\n\\n' + newLine);

          await withVisibleDrag(dropPoint, async () => {
            await window.__dragTest.setTestCode(newCode);
          }, {
            moveMs: 2500,
            triggerFrac: 0.85,
            preHoldMs: 300,
            settleMs: 420,
          });

          clearTimeout(showAt);
        } finally {
          releasePalette();
          destroyGhost();
          // Fade out the synthetic indicators after the drop has landed.
          containerRing.style.transition = 'opacity 280ms ease-in';
          insertionLine.style.transition = 'opacity 200ms ease-in';
          containerRing.style.opacity = '0';
          insertionLine.style.opacity = '0';
          setTimeout(() => { containerRing.remove(); insertionLine.remove(); }, 300);
        }

        await window.__dragTest.waitForCompile();
        return;
      }
    }

    const targetId = resolveSelector(targetSel);
    const targetEl = document.querySelector('[data-mirror-id="' + targetId + '"]');
    if (!targetEl) throw new Error('Target ' + targetId + ' not found');

    let endPoint;
    let chain = window.__dragTest.fromPalette(component).toContainer(targetId);
    if (at.kind === 'index') {
      endPoint = dropChildIndexPoint(targetEl, at.index);
      chain = chain.atIndex(at.index);
    } else {
      const r = targetEl.getBoundingClientRect();
      endPoint = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      chain = chain.atAlignmentZone(at.zone);
    }

    // Visual pickup of the palette item (press effect + drag ghost).
    // The ghost lives independently of __dragTest's own visual cursor —
    // showCursor:false is set in injectDemoAPI, so only our ghost shows.
    const releasePalette = pressPaletteItem(paletteEl);
    const destroyGhost = attachDragGhost(component);

    let result;
    try {
      // Visible drag: __dragTest's animation has been slowed (60 steps in
      // video pacing ≈ 1300ms), so we fire it immediately and let the
      // cursor traverse the same span — both arrive at the target together.
      result = await withVisibleDrag(endPoint, () => chain.execute(), {
        moveMs: 1500,
        triggerFrac: 0.05,
        preHoldMs: 240,
        settleMs: 320,
      });
    } finally {
      releasePalette();
      destroyGhost();
    }
    if (!result || !result.success) {
      throw new Error('Drop failed: ' + ((result && result.error) || 'unknown'));
    }
    await window.__dragTest.waitForCompile();
  }

  async function moveElement(sourceSel, targetSel, index) {
    const sourceId = resolveSelector(sourceSel);
    const targetId = resolveSelector(targetSel);
    const sourceEl = document.querySelector('[data-mirror-id="' + sourceId + '"]');
    const targetEl = document.querySelector('[data-mirror-id="' + targetId + '"]');
    if (!targetEl) throw new Error('Target ' + targetId + ' not found');

    // Cursor visits the element being moved, so the viewer knows what's
    // about to fly across the screen.
    if (sourceEl) await visitElement(sourceEl);

    const endPoint = dropChildIndexPoint(targetEl, index);
    const chain = window.__dragTest.moveElement(sourceId).toContainer(targetId).atIndex(index);
    const result = await withVisibleDrag(endPoint, () => chain.execute(), {
      moveMs: 1500,
      triggerFrac: 0.05,
      preHoldMs: 240,
      settleMs: 320,
    });
    if (!result || !result.success) {
      throw new Error('Move failed: ' + ((result && result.error) || 'unknown'));
    }
    await window.__dragTest.waitForCompile();
  }

  async function dragResize(sel, position, deltaX, deltaY, _opts) {
    const nodeId = resolveSelector(sel);
    // Use interact.click — selectNode is programmatic-only and doesn't fully
    // wire the resize-manager's mousedown listener. The interact.click path
    // dispatches real events, matching what worked in the original
    // __mirrorTest.interact.dragResizeHandle.
    await window.__mirrorTest.interact.click(nodeId);
    await delay(220);
    const handle = document.querySelector('.visual-overlay .resize-handles .resize-handle[data-position="' + position + '"]');
    if (!handle) throw new Error('Resize handle not found for ' + position);

    // 1. Visit the resize handle so the viewer sees where the drag starts.
    await visitElement(handle);

    const r = handle.getBoundingClientRect();
    const startPoint = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    const endPoint = { x: startPoint.x + deltaX, y: startPoint.y + deltaY };
    // Drive the drag ourselves so the handle visibly follows the cursor.
    // resize-manager listens on document; document.body works via bubbling
    // and matches the existing __mirrorTest.interact.dragResizeHandle path.
    await manualDrag(handle, startPoint, endPoint, { moveTarget: document.body });
    // Wait for compile so the preview reflects the new dimensions before
    // the next demo step looks for handles or new layout.
    if (window.__dragTest && window.__dragTest.waitForCompile) {
      await window.__dragTest.waitForCompile();
    }
  }

  async function dragPadding(sel, side, delta, mode, _bypassSnap) {
    const nodeId = resolveSelector(sel);
    window.__dragTest.selectNode(nodeId);
    await delay(150);
    await window.__mirrorTest.interact.enterPaddingMode(nodeId);
    const handle = document.querySelector('.padding-handle-' + side);
    if (!handle) throw new Error('Padding handle not visible for ' + side);

    // 1. Visit the padding handle.
    await visitElement(handle);

    const r = handle.getBoundingClientRect();
    const startPoint = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    const endPoint = { x: startPoint.x, y: startPoint.y };
    if (side === 'top')        endPoint.y += delta;
    else if (side === 'bottom') endPoint.y -= delta;
    else if (side === 'left')   endPoint.x += delta;
    else                        endPoint.x -= delta;
    const eventOpts = mode === 'all' ? { shiftKey: true }
                    : mode === 'axis' ? { altKey: true }
                    : undefined;
    await manualDrag(handle, startPoint, endPoint, { eventOpts });
    if (window.__dragTest && window.__dragTest.waitForCompile) {
      await window.__dragTest.waitForCompile();
    }
    await window.__mirrorTest.interact.exitPaddingMode();
  }

  async function dragMargin(sel, side, delta, mode, _bypassSnap) {
    const nodeId = resolveSelector(sel);
    window.__dragTest.selectNode(nodeId);
    await delay(150);
    await window.__mirrorTest.interact.enterMarginMode(nodeId);
    const handle = document.querySelector('.margin-handle-' + side);
    if (!handle) throw new Error('Margin handle not visible for ' + side);

    // 1. Visit the margin handle.
    await visitElement(handle);

    const r = handle.getBoundingClientRect();
    const startPoint = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    const endPoint = { x: startPoint.x, y: startPoint.y };
    if (side === 'top')        endPoint.y -= delta;
    else if (side === 'bottom') endPoint.y += delta;
    else if (side === 'left')   endPoint.x -= delta;
    else                        endPoint.x += delta;
    const eventOpts = mode === 'all' ? { shiftKey: true }
                    : mode === 'axis' ? { altKey: true }
                    : undefined;
    await manualDrag(handle, startPoint, endPoint, { eventOpts });
    if (window.__dragTest && window.__dragTest.waitForCompile) {
      await window.__dragTest.waitForCompile();
    }
    await window.__mirrorTest.interact.exitMarginMode();
  }

  async function inlineEdit(sel, text, charDelay) {
    const nodeId = resolveSelector(sel);
    const cd = (typeof charDelay === 'number') ? charDelay : 60;
    if (window.__mirrorDemo && window.__mirrorDemo.cursor) {
      const el = document.querySelector('[data-mirror-id="' + nodeId + '"]');
      if (el) {
        const r = el.getBoundingClientRect();
        await window.__mirrorDemo.cursor.moveTo({ x: r.left + r.width / 2, y: r.top + r.height / 2 }, 250);
        window.__mirrorDemo.cursor.showClickEffect();
        await delay(120);
        window.__mirrorDemo.cursor.showClickEffect();
        await delay(180);
      }
    }
    const controller = window.__mirrorStudio__ && window.__mirrorStudio__.inlineEdit;
    if (!controller) throw new Error('InlineEditController not available');
    if (!controller.startEdit(nodeId)) throw new Error('startEdit returned false for ' + nodeId);

    let input = null;
    for (let i = 0; i < 30; i++) {
      input = document.querySelector('.inline-edit-input');
      if (input) break;
      await delay(30);
    }
    if (!input) throw new Error('inline-edit-input did not appear');

    input.value = '';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await delay(120);
    for (const ch of text) {
      input.value += ch;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      await delay(cd);
    }
    await delay(200);
    if (typeof controller.endEdit === 'function') {
      controller.endEdit(true);
    } else {
      input.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'Enter', code: 'Enter', bubbles: true, cancelable: true,
      }));
    }
    await delay(300);
  }

  // === Property-Panel actions (B1) ===

  async function selectInPreview(sel) {
    const nodeId = resolveSelector(sel);
    const el = document.querySelector('[data-mirror-id="' + nodeId + '"]');
    if (!el) throw new Error('selectInPreview: element ' + nodeId + ' not in DOM');
    const r = el.getBoundingClientRect();
    const endPoint = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    await withCursorSync(endPoint, 350, async () => {
      window.__dragTest.selectNode(nodeId);
      await delay(150);
    });
  }

  function _findPropertyInput(propName) {
    const sel = '#property-panel input[data-prop="' + propName + '"], ' +
                '#property-panel select[data-prop="' + propName + '"]';
    const input = document.querySelector(sel);
    if (!input) {
      throw new Error('Property field ' + JSON.stringify(propName) + ' not visible — ' +
        'is the right element selected and the section open?');
    }
    return input;
  }

  async function setProperty(sel, propName, value) {
    await selectInPreview(sel);
    // Try the property-panel input first; if not visible (section collapsed
    // or not rendered for this prop), fall back to the studio API which
    // pickColor already uses successfully.
    let input = null;
    try { input = _findPropertyInput(propName); } catch (_e) { input = null; }
    if (input) {
      const r = input.getBoundingClientRect();
      const endPoint = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      if (input.tagName.toLowerCase() === 'select') {
        await withCursorSync(endPoint, 250, async () => {
          input.focus();
          input.value = value;
          input.dispatchEvent(new Event('change', { bubbles: true }));
          await delay(100);
          input.blur();
        });
      } else {
        await withCursorSync(endPoint, 250, async () => {
          input.focus();
          input.select();
          await delay(60);
          input.value = value;
          input.dispatchEvent(new Event('input', { bubbles: true }));
          await delay(100);
          input.dispatchEvent(new Event('change', { bubbles: true }));
          input.dispatchEvent(new KeyboardEvent('keydown', {
            key: 'Enter', code: 'Enter', bubbles: true, cancelable: true,
          }));
          await delay(80);
          input.blur();
        });
      }
    } else {
      // Fallback: drive the change through the studio API. The cursor still
      // visits the property panel so the viewer sees the action originating
      // there; the change fires programmatically and the new value flows
      // back into the editor like a normal user edit.
      const panelEl = document.querySelector('#property-panel');
      if (panelEl) {
        const r = panelEl.getBoundingClientRect();
        await withCursorSync(
          { x: r.left + r.width / 2, y: r.top + 60 },
          400,
          async () => {
            const studio = window.__mirrorStudio__;
            const panel = studio && studio.propertyPanel;
            if (!panel || typeof panel.changeProperty !== 'function') {
              throw new Error('setProperty: studio.propertyPanel.changeProperty not available');
            }
            panel.changeProperty(propName, value);
            await delay(180);
          }
        );
      } else {
        const studio = window.__mirrorStudio__;
        const panel = studio && studio.propertyPanel;
        if (!panel || typeof panel.changeProperty !== 'function') {
          throw new Error('setProperty: panel input not visible and studio API unavailable');
        }
        panel.changeProperty(propName, value);
      }
    }
    await delay(180);
  }

  async function pickColor(sel, propName, color) {
    await selectInPreview(sel);
    const trigger = document.querySelector('#property-panel [data-color-prop="' + propName + '"]');
    if (!trigger) {
      throw new Error('pickColor: color trigger for ' + JSON.stringify(propName) +
        ' not visible — is the right element selected?');
    }
    const triggerRect = trigger.getBoundingClientRect();
    await withCursorSync(
      { x: triggerRect.left + triggerRect.width / 2, y: triggerRect.top + triggerRect.height / 2 },
      250,
      async () => { trigger.click(); await delay(220); }
    );
    document.body.click();
    await delay(150);
    const studio = window.__mirrorStudio__;
    const panel = studio && studio.propertyPanel;
    if (!panel || typeof panel.changeProperty !== 'function') {
      throw new Error('pickColor: studio.propertyPanel.changeProperty not available');
    }
    panel.changeProperty(propName, color);
    await delay(450);
  }

  // === DOM snapshot (E2) ===

  const DOM_SCHEMA = {
    '*': [
      'tag', 'text', 'visible',
      'width', 'height',
      'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
      'marginTop', 'marginRight', 'marginBottom', 'marginLeft',
      'color', 'background',
      'childCount', 'layout',
    ],
    'button': ['disabled'],
    'img':    ['src', 'alt'],
    'input':  ['type', 'placeholder', 'value', 'disabled'],
  };

  function _rgbToHex(rgb) {
    if (!rgb) return '';
    if (rgb[0] === '#' || !rgb.startsWith('rgb')) return rgb;
    const m = rgb.match(/rgba?\\(\\s*(\\d+)\\s*,\\s*(\\d+)\\s*,\\s*(\\d+)(?:\\s*,\\s*([\\d.]+))?\\s*\\)/);
    if (!m) return rgb;
    const r = parseInt(m[1], 10), g = parseInt(m[2], 10), b = parseInt(m[3], 10);
    const a = m[4] !== undefined ? parseFloat(m[4]) : 1;
    const hex = '#' + [r, g, b].map(n => n.toString(16).padStart(2, '0')).join('');
    if (a < 1) {
      const ah = Math.round(a * 255).toString(16).padStart(2, '0');
      return hex + ah;
    }
    return hex;
  }

  function _layoutInfo(el, style) {
    const display = style.display;
    if (display !== 'flex' && display !== 'inline-flex') return undefined;
    const direction = (style.flexDirection || 'row').startsWith('row') ? 'horizontal' : 'vertical';
    const gap = parseInt(style.gap || '0', 10);
    const j = style.justifyContent;
    const a = style.alignItems;
    let align = 'start';
    if (j === 'center' && a === 'center') align = 'center';
    else if (j === 'space-between') align = 'spread';
    else if (j === 'flex-end' || a === 'flex-end') align = 'end';
    return { direction: direction, gap: gap, align: align };
  }

  function snapshotElement(nodeId, extras) {
    const el = document.querySelector('[data-mirror-id="' + nodeId + '"]');
    if (!el) throw new Error('snapshotElement: not found ' + nodeId);
    const style = window.getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    const tag = el.tagName.toLowerCase();
    const tagExtras = DOM_SCHEMA[tag] || [];
    const fields = [].concat(DOM_SCHEMA['*'], tagExtras, extras || []);
    const out = {};
    for (const f of fields) {
      switch (f) {
        case 'tag':           out.tag = tag; break;
        case 'text':          out.text = (el.textContent || '').trim(); break;
        case 'visible':       out.visible = rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none'; break;
        case 'width':         out.width = Math.round(rect.width); break;
        case 'height':        out.height = Math.round(rect.height); break;
        case 'paddingTop':    out.paddingTop = parseInt(style.paddingTop || '0', 10); break;
        case 'paddingRight':  out.paddingRight = parseInt(style.paddingRight || '0', 10); break;
        case 'paddingBottom': out.paddingBottom = parseInt(style.paddingBottom || '0', 10); break;
        case 'paddingLeft':   out.paddingLeft = parseInt(style.paddingLeft || '0', 10); break;
        case 'marginTop':     out.marginTop = parseInt(style.marginTop || '0', 10); break;
        case 'marginRight':   out.marginRight = parseInt(style.marginRight || '0', 10); break;
        case 'marginBottom':  out.marginBottom = parseInt(style.marginBottom || '0', 10); break;
        case 'marginLeft':    out.marginLeft = parseInt(style.marginLeft || '0', 10); break;
        case 'color':         out.color = _rgbToHex(style.color); break;
        case 'background':    out.background = _rgbToHex(style.backgroundColor); break;
        case 'childCount':    out.childCount = Array.from(el.children).filter(c => c.hasAttribute && c.hasAttribute('data-mirror-id')).length; break;
        case 'layout':        { const li = _layoutInfo(el, style); if (li) out.layout = li; break; }
        case 'disabled':      out.disabled = el.disabled === true; break;
        case 'src':           out.src = el.getAttribute('src') || ''; break;
        case 'alt':           out.alt = el.getAttribute('alt') || ''; break;
        case 'type':          out.type = el.getAttribute('type') || ''; break;
        case 'placeholder':   out.placeholder = el.getAttribute('placeholder') || ''; break;
        case 'value':         out.value = ('value' in el) ? el.value : ''; break;
        default:
          if (f in style) out[f] = style[f];
          break;
      }
    }
    return out;
  }

  function snapshotAllByPreviewOrder() {
    const preview = document.getElementById('preview');
    if (!preview) return [];
    const els = preview.querySelectorAll('[data-mirror-id]');
    const out = [];
    for (const el of els) {
      const id = el.getAttribute('data-mirror-id');
      out.push({ selector: { byId: id }, snapshot: snapshotElement(id, []) });
    }
    return out;
  }

  // === AI / Draft-mode (B2, E3) ===

  function _normalizePrompt(p) { return (p || '').replace(/\\s+/g, ' ').trim(); }

  function installAiMockListener() {
    if (window.__mirrorAiMockInstalled) return;
    window.__mirrorAiMockInstalled = true;
    const studio = window.__mirrorStudio__;
    if (!studio || !studio.events) return;
    studio.events.on('draft:submit', (event) => {
      const fixtures = window.__mirrorAiMock || {};
      const key = _normalizePrompt(event && event.prompt);
      if (key in fixtures) {
        const code = fixtures[key];
        setTimeout(() => {
          studio.events.emit('draft:ai-response', { code: code, error: null });
        }, 80);
      } else {
        setTimeout(() => {
          studio.events.emit('draft:ai-response', {
            code: '',
            error: 'No AI mock for prompt: ' + JSON.stringify(key) +
                   '. Available: ' + Object.keys(fixtures).slice(0, 5).join(' | '),
          });
        }, 50);
      }
    });
  }

  async function aiPrompt(promptText, options) {
    options = options || {};
    const charDelay = options.charDelay || 50;
    installAiMockListener();
    const studio = window.__mirrorStudio__;
    const editor = window.editor;
    if (!editor) throw new Error('aiPrompt: editor not available');
    if (!studio || !studio.draftModeManager) {
      throw new Error('aiPrompt: studio.draftModeManager not available');
    }
    const doc = editor.state.doc;
    const insertPos = doc.length;
    const draftLines = '\\n-- ' + promptText + '\\n--';
    let pos = insertPos;
    for (const ch of draftLines) {
      editor.dispatch({
        changes: { from: pos, insert: ch },
        selection: { anchor: pos + 1 },
      });
      pos += 1;
      if (window.__mirrorDemo && window.__mirrorDemo.overlay && ch !== '\\n') {
        window.__mirrorDemo.overlay.show(ch === ' ' ? 'Space' : ch);
      }
      await delay(charDelay);
    }
    await delay(120);
    const submitted = await studio.draftModeManager.handleSubmit();
    if (!submitted) {
      throw new Error('aiPrompt: draftModeManager.handleSubmit returned false');
    }
    await window.__dragTest.waitForCompile();
    await delay(150);
  }

  window.__mirrorActions = {
    resolveSelector,
    dropChildIndexPoint,
    snapshotElement,
    snapshotAllByPreviewOrder,
    dropFromPalette,
    moveElement,
    dragResize,
    dragPadding,
    dragMargin,
    inlineEdit,
    selectInPreview,
    setProperty,
    pickColor,
    aiPrompt,
    installAiMockListener,
  };
})();
`.trim()

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
  timing?: boolean
  validationLevel?: 'strict' | 'normal' | 'lenient'
  autoValidate?: boolean
  /** Fast-forward steps before this 1-based index (skip pure-visual, shrink waits). */
  fromStep?: number
  /** Stop after this 1-based step index (inclusive). */
  untilStep?: number
  /** Pause after every mutating step until Enter is pressed (interactive). */
  stepMode?: boolean
  /** AI mock fixtures: normalized prompt → Mirror code response (B2). */
  aiMock?: Record<string, string>
  /** Directory to write a screenshot at every expectCode/expectDom (C4). */
  snapshotDir?: string
  /** Directory with baseline PNGs — captures get compared, diffs written. */
  snapshotBaselineDir?: string
  /** pixelmatch threshold 0..1 (default 0.1). */
  snapshotThreshold?: number
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
  // Iteration window (C3)
  private fromStep?: number
  private untilStep?: number
  private stepMode: boolean = false
  // AI mock (B2)
  private aiMock?: Record<string, string>
  // Snapshots (C4)
  private snapshotDir?: string
  private snapshotBaselineDir?: string
  private snapshotThreshold: number = 0.1
  private snapshotCounter: number = 0
  private snapshotMismatches: string[] = []
  // OS-level mouse driver (drives the real macOS cursor)
  private osMouseEnabled: boolean = false
  private osMouse?: import('./os-mouse').OsMouse

  constructor(cdp: CDPSession, options: DemoRunnerOptions = {}) {
    this.cdp = cdp
    const {
      timing,
      validationLevel,
      autoValidate,
      fromStep,
      untilStep,
      stepMode,
      aiMock,
      snapshotDir,
      snapshotBaselineDir,
      snapshotThreshold,
      ...configOptions
    } = options
    this.config = { ...DEFAULT_CONFIG, ...configOptions }
    this.timingEnabled = timing ?? false
    this.validationConfig = getValidationConfig(validationLevel ?? 'normal')
    this.autoValidate = autoValidate ?? this.validationConfig.autoValidate
    this.fromStep = fromStep
    this.untilStep = untilStep
    this.stepMode = stepMode ?? false
    this.aiMock = aiMock
    this.snapshotDir = snapshotDir
    this.snapshotBaselineDir = snapshotBaselineDir
    if (typeof snapshotThreshold === 'number') this.snapshotThreshold = snapshotThreshold
    // OS mouse: enable when configured. The actual OsMouse is constructed
    // lazily in injectDemoAPI so we can pass evaluate as a bound callback.
    this.osMouseEnabled = (options as { osMouse?: boolean }).osMouse ?? false
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
    if (this.fromStep || this.untilStep) {
      const range = `[${this.fromStep ?? 1}..${this.untilStep ?? script.steps.length}]`
      console.log(
        `   ⏩  Iteration window: ${range}` +
          (this.fromStep ? ' (steps before fromStep run fast-forward)' : '')
      )
    }

    for (let i = 0; i < script.steps.length; i++) {
      const step = script.steps[i]
      const stepNum = i + 1
      const stepStart = performance.now()

      // Iteration window — stop after untilStep
      if (this.untilStep !== undefined && stepNum > this.untilStep) {
        console.log(`   ⏹  Stopped at step ${this.untilStep} (--until-step)`)
        break
      }
      // Iteration window — fast-forward before fromStep
      const fastForward = this.fromStep !== undefined && stepNum < this.fromStep
      if (fastForward && DemoRunner.shouldSkipInFastForward(step)) {
        continue
      }
      // Shrink waits in fast-forward
      let effectiveStep: DemoAction = step
      if (fastForward && step.action === 'wait') {
        effectiveStep = { ...step, duration: Math.min(50, step.duration) }
      }

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
        await this.executeStep(effectiveStep, stepNum, script.steps.length)
        if (this.stepMode && !fastForward && DemoRunner.isMutatingStep(effectiveStep)) {
          await this.waitForEnter(
            `        ⏸  paused after step ${stepNum} — press Enter to continue`
          )
        }
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
    const snapshotsOk = this.snapshotMismatches.length === 0
    const success =
      failedValidations.length === 0 &&
      this.errors.length === 0 &&
      autoValidationSuccess &&
      snapshotsOk

    // Print summary
    this.printSummary(script.name, success, failedValidations, timingReport, validationReport)
    if (this.snapshotMismatches.length > 0) {
      console.log('🖼  Snapshot mismatches:')
      for (const m of this.snapshotMismatches) console.log('   • ' + m)
      console.log('')
    }

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
      case 'moveTo':
        return step.target
      case 'click':
        return step.target
      case 'doubleClick':
        return step.target
      case 'drag':
        return step.from
      case 'highlight':
        return step.target
      default:
        return undefined
    }
  }

  /**
   * Check if action changes state
   */
  private changesState(step: DemoAction): boolean {
    return ['click', 'doubleClick', 'type', 'pressKey', 'createFile', 'clearEditor'].includes(
      step.action
    )
  }

  /**
   * Pre-validate action target
   */
  private async preValidateAction(
    target: string,
    stepNum: number,
    action: string
  ): Promise<{ ready: boolean }> {
    try {
      const result = await this.evaluate<{
        ready: boolean
        issues: Array<{ check: string; passed: boolean; message: string; warning?: boolean }>
      }>(`
        window.__demoValidation?.validateTargetReady('${this.escape(target)}') || { ready: true, issues: [] }
      `)

      // Add issues to tracking
      for (const issue of result.issues) {
        const level = issue.warning ? 'warning' : issue.passed ? 'info' : 'error'
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
          const result = await this.evaluate<{
            valid: boolean
            issues: Array<{ check: string; passed: boolean; message: string; warning?: boolean }>
          }>(`
            window.__demoValidation?.validateType('${this.escape(step.text)}', ${JSON.stringify(preState)}, ${JSON.stringify(postState)}) || { valid: true, issues: [] }
          `)
          for (const issue of result.issues) {
            this.validationIssues.push({
              level: issue.warning ? 'warning' : issue.passed ? 'info' : 'error',
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
          const result = await this.evaluate<{
            valid: boolean
            issues: Array<{ check: string; passed: boolean; message: string; warning?: boolean }>
          }>(`
            window.__demoValidation?.validateClick('${this.escape(target)}', ${JSON.stringify(preState)}, ${JSON.stringify(postState)}) || { valid: true, issues: [] }
          `)
          for (const issue of result.issues) {
            this.validationIssues.push({
              level: issue.warning ? 'warning' : issue.passed ? 'info' : 'error',
              stepIndex: stepNum,
              action: step.action,
              check: issue.check,
              message: issue.message,
            })
          }
          return { valid: result.valid }
        }

        case 'createFile': {
          const result = await this.evaluate<{
            valid: boolean
            issues: Array<{ check: string; passed: boolean; message: string; warning?: boolean }>
          }>(`
            window.__demoValidation?.validateFileCreated('${this.escape(step.path)}', ${JSON.stringify(preState)}, ${JSON.stringify(postState)}) || { valid: true, issues: [] }
          `)
          for (const issue of result.issues) {
            this.validationIssues.push({
              level: issue.warning ? 'warning' : issue.passed ? 'info' : 'error',
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
    const success =
      this.validationConfig.level === 'strict' ? errors === 0 && warnings === 0 : errors === 0

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
      case 'moveTo':
        return step.target
      case 'click':
        return step.target
      case 'doubleClick':
        return step.target
      case 'type':
        return step.text.substring(0, 20) + (step.text.length > 20 ? '...' : '')
      case 'pressKey':
        return step.modifiers ? `${step.modifiers.join('+')}+${step.key}` : step.key
      case 'wait':
        return step.comment || `${step.duration}ms`
      case 'navigate':
        return step.url
      case 'highlight':
        return step.target
      case 'comment':
        return step.text.substring(0, 30) + (step.text.length > 30 ? '...' : '')
      case 'execute':
        return step.comment
      case 'validate':
        return step.comment || `${step.checks.length} checks`
      case 'createFile':
        return step.path
      case 'switchFile':
        return step.path
      case 'expectCode':
        return step.comment ?? (step.code === undefined ? 'learn-mode' : 'strict')
      case 'expectCodeMatches':
        return step.comment ?? String(step.pattern)
      case 'expectDom':
        return (
          step.comment ??
          (step.checks === undefined ? 'learn-mode' : `${step.checks.length} checks`)
        )
      case 'dropFromPalette':
        return `${step.component} → ${JSON.stringify(step.target)}`
      case 'moveElement':
        return `${JSON.stringify(step.source)} → ${JSON.stringify(step.target)}@${step.index}`
      case 'dragResize':
        return `${JSON.stringify(step.selector)} ${step.position} Δ(${step.deltaX},${step.deltaY})`
      case 'dragPadding':
        return `${JSON.stringify(step.selector)} ${step.side}+${step.delta}`
      case 'dragMargin':
        return `${JSON.stringify(step.selector)} ${step.side}+${step.delta}`
      case 'inlineEdit':
        return `${JSON.stringify(step.selector)} → "${step.text.substring(0, 24)}"`
      case 'selectInPreview':
        return JSON.stringify(step.selector)
      case 'setProperty':
        return `${step.prop}=${step.value}`
      case 'pickColor':
        return `${step.prop}=${step.color}`
      case 'aiPrompt':
        return step.prompt.substring(0, 30) + (step.prompt.length > 30 ? '…' : '')
      default:
        return undefined
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
  private generateTimingSuggestions(
    byAction: Record<string, { count: number; totalMs: number; avgMs: number }>
  ): TimingSuggestion[] {
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

      for (const [stepNum, issues] of Array.from(issuesByStep.entries()).sort(
        (a, b) => a[0] - b[0]
      )) {
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
    const sortedActions = Object.entries(timing.byAction).sort(
      (a, b) => b[1].totalMs - a[1].totalMs
    )

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
      console.log(
        `   ${String(step.stepIndex).padStart(3)}. ${step.action}${detail}: ${step.executionMs}ms`
      )
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

    // Single-cursor mode: hide __dragTest's own cursor while demo runs.
    // Also slow the underlying palette/move drag animation: default is 15
    // steps × 20ms = 300ms which is too fast for video pacing. We bump it
    // so the dragged payload visibly travels alongside the demo cursor.
    const dragSteps = config.pacing === 'instant' ? 8 : 60
    const dragStepDelay = config.pacing === 'instant' ? 4 : 22
    await this.evaluate(`
      (function() {
        if (window.__dragTest && window.__dragTest.setAnimation) {
          window.__dragTest.setAnimation({
            showCursor: false,
            steps: ${dragSteps},
            stepDelay: ${dragStepDelay},
          });
        }
      })()
    `)

    // High-level Mirror actions API (E1, E2, B1, B2)
    await this.evaluate(MIRROR_ACTIONS_API)

    // OS-level mouse: load lazily so the import is only paid for when used.
    if (this.osMouseEnabled) {
      const { OsMouse } = await import('./os-mouse')
      this.osMouse = new OsMouse(expr => this.evaluate(expr))
      await this.osMouse.calibrate()
      console.log(`   🖱️  OS mouse driver active (real macOS cursor)`)
    }

    // AI mock fixtures (B2): install on window before any aiPrompt
    if (this.aiMock && Object.keys(this.aiMock).length > 0) {
      await this.evaluate(`
        window.__mirrorAiMock = ${JSON.stringify(this.aiMock)};
        window.__mirrorActions.installAiMockListener();
      `)
      console.log(`   🤖 AI mock installed (${Object.keys(this.aiMock).length} fixtures)`)
    }

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
          if (this.osMouse) {
            await this.osMoveToSelector(step.target)
          } else {
            await this.evaluate(
              `__mirrorDemo.moveTo('${this.escape(step.target)}'${step.duration ? `, ${step.duration}` : ''})`
            )
          }
        } catch (err) {
          console.log(
            `        ⚠️  MoveTo warning: ${err instanceof Error ? err.message : String(err)}`
          )
        }
        break

      case 'click':
        console.log(`${prefix} Click${step.target ? ` on ${step.target}` : ''}`)
        try {
          if (this.osMouse && step.target) {
            await this.osClickSelector(step.target)
          } else {
            await this.evaluate(
              `__mirrorDemo.click(${step.target ? `'${this.escape(step.target)}'` : ''})`
            )
          }
        } catch (err) {
          console.log(
            `        ⚠️  Click warning: ${err instanceof Error ? err.message : String(err)}`
          )
        }
        break

      case 'doubleClick':
        console.log(`${prefix} Double-click${step.target ? ` on ${step.target}` : ''}`)
        if (this.osMouse && step.target) {
          await this.osDoubleClickSelector(step.target)
        } else {
          await this.evaluate(
            `__mirrorDemo.doubleClick(${step.target ? `'${this.escape(step.target)}'` : ''})`
          )
        }
        break

      case 'type':
        console.log(
          `${prefix} Type: "${step.text.substring(0, 30)}${step.text.length > 30 ? '...' : ''}"`
        )
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
        console.log(
          `${prefix} Scroll ${step.deltaY > 0 ? 'down' : 'up'} ${Math.abs(step.deltaY)}px`
        )
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
          console.log(
            `        ⚠️  Execute warning: ${err instanceof Error ? err.message : String(err)}`
          )
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
        // storage is module-internal — re-import dist/index.js to access it
        await this.evaluate(`
          (async () => {
            const { storage } = await import('./dist/index.js');
            await storage.writeFile(${JSON.stringify(step.path)}, ${JSON.stringify(step.content)});
            await new Promise(r => setTimeout(r, 300));
          })()
        `)
        if (step.switchTo) {
          await this.evaluate(`
            (async () => {
              if (window.desktopFiles && typeof window.desktopFiles.selectFile === 'function') {
                await window.desktopFiles.selectFile(${JSON.stringify(step.path)});
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
        console.log(
          `${prefix} 🔍 Validate${step.comment ? `: ${step.comment}` : ` (${step.checks.length} checks)`}`
        )
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

      case 'expectCode':
        await this.runExpectCode(step, prefix)
        break
      case 'expectCodeMatches':
        await this.runExpectCodeMatches(step, prefix)
        break
      case 'expectDom':
        await this.runExpectDom(step, prefix)
        break
      case 'dropFromPalette':
        await this.runDropFromPalette(step, prefix)
        break
      case 'moveElement':
        await this.runMoveElement(step, prefix)
        break
      case 'dragResize':
        await this.runDragResize(step, prefix)
        break
      case 'dragPadding':
        await this.runDragPadding(step, prefix)
        break
      case 'dragMargin':
        await this.runDragMargin(step, prefix)
        break
      case 'inlineEdit':
        await this.runInlineEdit(step, prefix)
        break
      case 'selectInPreview':
        await this.runSelectInPreview(step, prefix)
        break
      case 'setProperty':
        await this.runSetProperty(step, prefix)
        break
      case 'pickColor':
        await this.runPickColor(step, prefix)
        break
      case 'aiPrompt':
        await this.runAiPrompt(step, prefix)
        break
    }
  }

  // ===========================================================================
  // Helpers for step-mode + fast-forward
  // ===========================================================================

  private static shouldSkipInFastForward(step: DemoAction): boolean {
    switch (step.action) {
      case 'moveTo':
      case 'highlight':
      case 'comment':
      case 'scroll':
      case 'click':
      case 'doubleClick':
      case 'validate':
      case 'expectCode':
      case 'expectCodeMatches':
      case 'expectDom':
        return true
      default:
        return false
    }
  }

  private static isMutatingStep(step: DemoAction): boolean {
    switch (step.action) {
      case 'execute':
      case 'type':
      case 'pressKey':
      case 'createFile':
      case 'switchFile':
      case 'clearEditor':
      case 'dropFromPalette':
      case 'moveElement':
      case 'dragResize':
      case 'dragPadding':
      case 'dragMargin':
      case 'inlineEdit':
      case 'selectInPreview':
      case 'setProperty':
      case 'pickColor':
      case 'aiPrompt':
        return true
      default:
        return false
    }
  }

  private waitForEnter(prompt: string): Promise<void> {
    return new Promise(resolve => {
      const stdin = process.stdin
      if (!stdin.isTTY) {
        console.log(prompt + '   [non-interactive: skipping pause]')
        resolve()
        return
      }
      console.log(prompt)
      const onData = () => {
        stdin.removeListener('data', onData)
        if (typeof (stdin as any).setRawMode === 'function') {
          ;(stdin as any).setRawMode(false)
        }
        stdin.pause()
        resolve()
      }
      if (typeof (stdin as any).setRawMode === 'function') {
        ;(stdin as any).setRawMode(true)
      }
      stdin.resume()
      stdin.once('data', onData)
    })
  }

  // ===========================================================================
  // Selector formatting + inline expectCode resolution
  // ===========================================================================

  private describeSelector(sel: unknown): string {
    if (sel && typeof sel === 'object') {
      const s = sel as Record<string, unknown>
      if ('byId' in s) return `#${s.byId}`
      if ('byText' in s) return `text=${JSON.stringify(s.byText)}${'nth' in s ? `[${s.nth}]` : ''}`
      if ('byTag' in s) return `<${s.byTag}>${'nth' in s ? `[${s.nth}]` : ''}`
      if ('byPath' in s) return `path=${s.byPath}`
      if ('byRole' in s) return `role=${s.byRole}${'nth' in s ? `[${s.nth}]` : ''}`
      if ('byTestId' in s) return `testid=${s.byTestId}`
    }
    return JSON.stringify(sel)
  }

  private async runInlineExpectCode(
    inline: string | { code?: string; comment?: string } | undefined,
    prefix: string,
    fallbackComment?: string
  ): Promise<void> {
    if (inline === undefined) return
    const step =
      typeof inline === 'string'
        ? { action: 'expectCode' as const, code: inline, comment: fallbackComment }
        : {
            action: 'expectCode' as const,
            code: inline.code,
            comment: inline.comment ?? fallbackComment,
          }
    await this.runExpectCode(step, prefix)
  }

  // ===========================================================================
  // Snapshots (C4)
  // ===========================================================================

  private async captureSnapshot(label: string): Promise<void> {
    if (!this.snapshotDir) return
    try {
      this.snapshotCounter += 1
      const seq = String(this.snapshotCounter).padStart(3, '0')
      const sanitized = label
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .substring(0, 60)
      const filename = `${seq}-${sanitized || 'step'}.png`
      const result = await this.cdp.send<{ data: string }>('Page.captureScreenshot', {
        format: 'png',
      })
      const fsLazy = await import('fs')
      const pathLazy = await import('path')
      const fullPath = pathLazy.resolve(this.snapshotDir, filename)
      fsLazy.mkdirSync(pathLazy.dirname(fullPath), { recursive: true })
      const pngBuffer = Buffer.from(result.data, 'base64')
      fsLazy.writeFileSync(fullPath, pngBuffer)
      if (this.snapshotBaselineDir) {
        const baselinePath = pathLazy.resolve(this.snapshotBaselineDir, filename)
        if (!fsLazy.existsSync(baselinePath)) {
          console.log(
            `        ⚠️  no baseline for ${filename} — first run? Copy to baseline dir to seed.`
          )
          return
        }
        const diff = await comparePngFiles(baselinePath, fullPath, this.snapshotThreshold)
        if (diff.match) return
        const diffPath = pathLazy.resolve(this.snapshotDir, filename.replace(/\.png$/, '.diff.png'))
        if (diff.diffPng) fsLazy.writeFileSync(diffPath, diff.diffPng)
        const ratio = (diff.diffPixels / diff.totalPixels) * 100
        const msg = `${filename}: ${diff.diffPixels}/${diff.totalPixels} px (${ratio.toFixed(2)}%) differ`
        this.snapshotMismatches.push(msg)
        console.log(`        ✗ pixel-diff: ${msg}`)
      }
    } catch (err) {
      console.log(
        `        ⚠️  snapshot failed: ${err instanceof Error ? err.message : String(err)}`
      )
    }
  }

  // ===========================================================================
  // expectCode / expectCodeMatches / expectDom handlers
  // ===========================================================================

  private async runExpectCode(
    step: Extract<DemoAction, { action: 'expectCode' }>,
    prefix: string
  ): Promise<void> {
    await this.captureSnapshot('expectCode-' + (step.comment ?? 'unnamed'))
    const actualRaw = await this.evaluate<string>(`
      (function() {
        const editor = window.editor;
        return editor && editor.state ? editor.state.doc.toString() : '';
      })()
    `)
    const opts = {
      collapseSpaces: step.normalize?.collapseSpaces ?? false,
      trimEnds: step.normalize?.trimEnds ?? true,
    }
    if (step.code === undefined) {
      console.log(`${prefix} 📝 expectCode (learn): ${step.comment ?? ''}`)
      console.log('   ┌──── current code ────────────────────────────────────────────')
      for (const line of actualRaw.split('\n')) console.log('   │ ' + line)
      console.log('   └──────────────────────────────────────────────────────────────')
      console.log("   Paste this into the step's `code` field to lock it.")
      return
    }
    const actual = normalizeCode(actualRaw, opts)
    const expected = normalizeCode(step.code, opts)
    const success = actual === expected
    const result: ValidationResult = {
      success,
      check: { type: 'editorContains', text: '<expectCode>' },
      message: success
        ? `expectCode matched${step.comment ? ` (${step.comment})` : ''}`
        : `expectCode MISMATCH${step.comment ? ` (${step.comment})` : ''}`,
      actual: actual.length,
    }
    this.validationResults.push(result)
    if (success) {
      console.log(`${prefix} ✓ expectCode matched${step.comment ? ` — ${step.comment}` : ''}`)
      return
    }
    console.log(`${prefix} ✗ expectCode MISMATCH${step.comment ? ` — ${step.comment}` : ''}`)
    const diff = lineDiff(expected, actual)
    for (const line of diff) console.log('   ' + line)
  }

  private async runExpectCodeMatches(
    step: Extract<DemoAction, { action: 'expectCodeMatches' }>,
    prefix: string
  ): Promise<void> {
    const re =
      step.pattern instanceof RegExp ? step.pattern : new RegExp(step.pattern, step.flags ?? 's')
    const actual = await this.evaluate<string>(`
      (function() {
        const editor = window.editor;
        return editor && editor.state ? editor.state.doc.toString() : '';
      })()
    `)
    const ok = re.test(actual)
    const result: ValidationResult = {
      success: ok,
      check: { type: 'editorContains', text: '<expectCodeMatches>' },
      message: ok
        ? `expectCodeMatches matched ${re}${step.comment ? ` — ${step.comment}` : ''}`
        : `expectCodeMatches MISMATCH ${re}${step.comment ? ` — ${step.comment}` : ''}`,
      actual: actual.length,
    }
    this.validationResults.push(result)
    if (ok) {
      console.log(`${prefix} ✓ expectCodeMatches ${re}${step.comment ? ` — ${step.comment}` : ''}`)
    } else {
      console.log(
        `${prefix} ✗ expectCodeMatches MISMATCH ${re}${step.comment ? ` — ${step.comment}` : ''}`
      )
      const trunc = actual.length > 400 ? actual.substring(0, 400) + '…' : actual
      console.log('   actual code:')
      for (const line of trunc.split('\n').slice(0, 20)) console.log('   │ ' + line)
    }
  }

  private async runExpectDom(
    step: Extract<DemoAction, { action: 'expectDom' }>,
    prefix: string
  ): Promise<void> {
    await this.captureSnapshot('expectDom-' + (step.comment ?? 'unnamed'))
    if (step.checks === undefined) {
      console.log(`${prefix} 🌳 expectDom (learn): ${step.comment ?? ''}`)
      let entries: Array<{ selector: unknown; snapshot: Record<string, unknown> }>
      if (step.learnSelectors && step.learnSelectors.length > 0) {
        entries = []
        for (const sel of step.learnSelectors) {
          const snap = await this.evaluate<Record<string, unknown>>(`
            (function() {
              const id = window.__mirrorActions.resolveSelector(${JSON.stringify(sel)});
              return window.__mirrorActions.snapshotElement(id, []);
            })()
          `)
          entries.push({ selector: sel, snapshot: snap })
        }
      } else {
        entries = await this.evaluate<typeof entries>(
          `window.__mirrorActions.snapshotAllByPreviewOrder()`
        )
      }
      console.log('   ┌──── current DOM ─────────────────────────────────────────────')
      console.log('   │ checks: [')
      for (const e of entries) {
        const fields = Object.entries(e.snapshot)
          .map(([k, v]) => `${k}: ${formatSnapshotValue(v)}`)
          .join(', ')
        console.log(`   │   { selector: ${formatSnapshotValue(e.selector)}, ${fields} },`)
      }
      console.log('   │ ]')
      console.log('   └──────────────────────────────────────────────────────────────')
      console.log("   Paste the `checks` array into the step's `checks` field to lock it.")
      return
    }
    let allOk = true
    const failures: string[] = []
    for (let i = 0; i < step.checks.length; i++) {
      const check = step.checks[i] as Record<string, unknown>
      const extras: string[] = Array.isArray(check.extras) ? (check.extras as string[]) : []
      for (const k of Object.keys(check)) {
        if (!KNOWN_DOM_CHECK_KEYS.has(k) && !extras.includes(k)) extras.push(k)
      }
      const snap = await this.evaluate<Record<string, unknown> | null>(`
        (function() {
          try {
            const id = window.__mirrorActions.resolveSelector(${JSON.stringify(check.selector)});
            return window.__mirrorActions.snapshotElement(id, ${JSON.stringify(extras)});
          } catch (e) {
            return { __error: String(e && e.message || e) };
          }
        })()
      `)
      if (snap && (snap as Record<string, unknown>).__error) {
        allOk = false
        failures.push(
          `   ✗ #${i} ${this.describeSelector(check.selector)} — ${(snap as Record<string, unknown>).__error}`
        )
        continue
      }
      const checkResult = compareDomCheck(check, snap as Record<string, unknown>)
      if (checkResult.length === 0) continue
      allOk = false
      failures.push(
        `   ✗ #${i} ${this.describeSelector(check.selector)}${check.label ? ` (${check.label})` : ''}`
      )
      for (const f of checkResult) failures.push(`      ${f}`)
    }
    const result: ValidationResult = {
      success: allOk,
      check: { type: 'previewContains', selector: '<expectDom>' },
      message: allOk
        ? `expectDom matched (${step.checks.length} checks)${step.comment ? ` — ${step.comment}` : ''}`
        : `expectDom MISMATCH${step.comment ? ` — ${step.comment}` : ''}`,
      actual: step.checks.length,
    }
    this.validationResults.push(result)
    if (allOk) {
      console.log(
        `${prefix} ✓ expectDom matched (${step.checks.length} checks)${step.comment ? ` — ${step.comment}` : ''}`
      )
    } else {
      console.log(`${prefix} ✗ expectDom MISMATCH${step.comment ? ` — ${step.comment}` : ''}`)
      for (const line of failures) console.log(line)
    }
  }

  // ===========================================================================
  // Mirror action handlers (delegate to window.__mirrorActions)
  // ===========================================================================

  private async runDropFromPalette(
    step: Extract<DemoAction, { action: 'dropFromPalette' }>,
    prefix: string
  ): Promise<void> {
    const where = step.at.kind === 'index' ? `index ${step.at.index}` : `zone ${step.at.zone}`
    console.log(
      `${prefix} 🧩 Drop ${step.component} → ${this.describeSelector(step.target)} @ ${where}` +
        (step.comment ? ` — ${step.comment}` : '')
    )
    if (this.osMouse) {
      await this.runDropFromPaletteOs(step)
    } else {
      await this.evaluate(
        `window.__mirrorActions.dropFromPalette(${JSON.stringify(step.component)}, ${JSON.stringify(step.target)}, ${JSON.stringify(step.at)})`
      )
    }
    await this.runInlineExpectCode(step.expectCode, prefix, step.comment)
  }

  // ---------------------------------------------------------------------
  // OS-mouse helpers — read element rects via JS evaluate, drive the real
  // macOS cursor via the OsMouse wrapper.
  // ---------------------------------------------------------------------

  private async getRect(selector: string): Promise<{ x: number; y: number; w: number; h: number }> {
    const r = await this.evaluate<{ x: number; y: number; w: number; h: number } | null>(`
      (() => {
        const el = document.querySelector(${JSON.stringify(selector)});
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return { x: r.left, y: r.top, w: r.width, h: r.height };
      })()
    `)
    if (!r) throw new Error(`Selector matched no element: ${selector}`)
    return r
  }

  private async getRectByMirrorId(
    nodeId: string
  ): Promise<{ x: number; y: number; w: number; h: number }> {
    return this.getRect(`[data-mirror-id="${nodeId}"]`)
  }

  private async resolveSelectorOnPage(sel: import('./types').Selector): Promise<string> {
    return await this.evaluate<string>(
      `window.__mirrorActions.resolveSelector(${JSON.stringify(sel)})`
    )
  }

  private async osMoveToSelector(selector: string): Promise<void> {
    const r = await this.getRect(selector)
    await this.osMouse!.moveToPage(r.x + r.w / 2, r.y + r.h / 2)
  }

  private async osClickSelector(selector: string): Promise<void> {
    const r = await this.getRect(selector)
    await this.osMouse!.clickPage(r.x + r.w / 2, r.y + r.h / 2)
  }

  private async osDoubleClickSelector(selector: string): Promise<void> {
    const r = await this.getRect(selector)
    await this.osMouse!.doubleClickPage(r.x + r.w / 2, r.y + r.h / 2)
  }

  private async waitForCompile(): Promise<void> {
    await this.evaluate(`
      (async () => {
        if (window.__dragTest && window.__dragTest.waitForCompile) {
          await window.__dragTest.waitForCompile();
        }
      })()
    `)
  }

  /**
   * OS-mouse-driven palette drop: real macOS cursor visibly travels from the
   * palette item to the drop target. Browser receives native HTML5 drag
   * events (palette items are draggable=true), so Mirror's full drag
   * pipeline engages — drop indicator, hover effects, the works.
   */
  private async runDropFromPaletteOs(
    step: Extract<DemoAction, { action: 'dropFromPalette' }>
  ): Promise<void> {
    const lower = step.component.toLowerCase()
    // Find palette item rect (page coords)
    const paletteRect = await this.evaluate<{ x: number; y: number; w: number; h: number } | null>(`
      (() => {
        const el = document.querySelector('#components-panel [data-id="comp-${lower}"]')
                 || document.querySelector('#components-panel [data-id="${lower}"]');
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return { x: r.left, y: r.top, w: r.width, h: r.height };
      })()
    `)
    if (!paletteRect) throw new Error(`Palette item for ${step.component} not found`)

    // Find drop point (page coords). For canvas-only states we drop in the
    // preview center; otherwise use the resolved target's child-index point.
    const targetSelector = JSON.stringify(step.target)
    const at = JSON.stringify(step.at)
    const dropPoint = await this.evaluate<{ x: number; y: number }>(`
      (() => {
        const target = ${targetSelector};
        const at = ${at};
        let targetId = null;
        try { targetId = window.__mirrorActions.resolveSelector(target); } catch (_e) {}
        const targetEl = targetId ? document.querySelector('[data-mirror-id="' + targetId + '"]') : null;
        if (!targetEl) {
          // No target node — drop just inside the preview top, where the
          // first top-level Mirror element will render in flex-column.
          const preview = document.querySelector('#preview');
          const r = preview.getBoundingClientRect();
          return { x: r.left + 80, y: r.top + 80 };
        }
        if (at.kind === 'index') {
          return window.__mirrorActions.dropChildIndexPoint(targetEl, at.index);
        }
        const r = targetEl.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      })()
    `)

    const startX = paletteRect.x + paletteRect.w / 2
    const startY = paletteRect.y + paletteRect.h / 2
    await this.osMouse!.dragPage(startX, startY, dropPoint.x, dropPoint.y, {
      preHoldMs: 220,
      settleMs: 360,
    })

    // Give Mirror's drop handler time to process and the editor to compile.
    await this.evaluate(`
      (async () => {
        if (window.__dragTest && window.__dragTest.waitForCompile) {
          await window.__dragTest.waitForCompile();
        }
      })()
    `)
  }

  private async runMoveElement(
    step: Extract<DemoAction, { action: 'moveElement' }>,
    prefix: string
  ): Promise<void> {
    console.log(
      `${prefix} ↪️  Move ${this.describeSelector(step.source)} → ${this.describeSelector(step.target)} @ index ${step.index}` +
        (step.comment ? ` — ${step.comment}` : '')
    )
    if (this.osMouse) {
      await this.runMoveElementOs(step)
    } else {
      await this.evaluate(
        `window.__mirrorActions.moveElement(${JSON.stringify(step.source)}, ${JSON.stringify(step.target)}, ${step.index})`
      )
    }
    await this.runInlineExpectCode(step.expectCode, prefix, step.comment)
  }

  private async runMoveElementOs(
    step: Extract<DemoAction, { action: 'moveElement' }>
  ): Promise<void> {
    const sourceId = await this.resolveSelectorOnPage(step.source)
    const targetId = await this.resolveSelectorOnPage(step.target)
    const sourceRect = await this.getRectByMirrorId(sourceId)
    const dropPoint = await this.evaluate<{ x: number; y: number }>(`
      (() => {
        const targetEl = document.querySelector('[data-mirror-id="${targetId}"]');
        if (!targetEl) throw new Error('Target not in DOM: ${targetId}');
        return window.__mirrorActions.dropChildIndexPoint(targetEl, ${step.index});
      })()
    `)
    await this.osMouse!.dragPage(
      sourceRect.x + sourceRect.w / 2,
      sourceRect.y + sourceRect.h / 2,
      dropPoint.x,
      dropPoint.y,
      { preHoldMs: 200, settleMs: 300 }
    )
    await this.waitForCompile()
  }

  private async runDragResize(
    step: Extract<DemoAction, { action: 'dragResize' }>,
    prefix: string
  ): Promise<void> {
    console.log(
      `${prefix} ↔️  Resize ${this.describeSelector(step.selector)} ${step.position} Δ(${step.deltaX},${step.deltaY})` +
        (step.comment ? ` — ${step.comment}` : '')
    )
    if (this.osMouse) {
      await this.runDragResizeOs(step)
    } else {
      await this.evaluate(
        `window.__mirrorActions.dragResize(${JSON.stringify(step.selector)}, ${JSON.stringify(step.position)}, ${step.deltaX}, ${step.deltaY}, ${JSON.stringify({ bypassSnap: step.bypassSnap ?? false })})`
      )
    }
    await this.runInlineExpectCode(step.expectCode, prefix, step.comment)
  }

  private async runDragResizeOs(
    step: Extract<DemoAction, { action: 'dragResize' }>
  ): Promise<void> {
    const nodeId = await this.resolveSelectorOnPage(step.selector)
    // Real OS click selects the element — same input path a user would take.
    const elRect = await this.getRectByMirrorId(nodeId)
    await this.osMouse!.clickPage(elRect.x + elRect.w / 2, elRect.y + elRect.h / 2)
    await new Promise(r => setTimeout(r, 240))
    const handleSel = `.visual-overlay .resize-handles .resize-handle[data-position="${step.position}"]`
    const handle = await this.getRect(handleSel)
    const startX = handle.x + handle.w / 2
    const startY = handle.y + handle.h / 2
    await this.osMouse!.dragPage(startX, startY, startX + step.deltaX, startY + step.deltaY, {
      preHoldMs: 180,
      settleMs: 260,
    })
    await this.waitForCompile()
  }

  private async runDragPadding(
    step: Extract<DemoAction, { action: 'dragPadding' }>,
    prefix: string
  ): Promise<void> {
    console.log(
      `${prefix} 📐 Padding ${this.describeSelector(step.selector)} ${step.side}+${step.delta}` +
        (step.mode ? ` (${step.mode})` : '') +
        (step.comment ? ` — ${step.comment}` : '')
    )
    if (this.osMouse) {
      await this.runDragSpacingOs(step, 'padding')
    } else {
      await this.evaluate(
        `window.__mirrorActions.dragPadding(${JSON.stringify(step.selector)}, ${JSON.stringify(step.side)}, ${step.delta}, ${JSON.stringify(step.mode ?? 'single')}, ${step.bypassSnap ?? false})`
      )
    }
    await this.runInlineExpectCode(step.expectCode, prefix, step.comment)
  }

  // Combined padding / margin OS-mouse handler — they share the structure:
  // select node → enter mode → drag handle (with optional Shift/Alt) → exit.
  // Selection AND mode entry both happen via real OS input (click + key tap),
  // so the visual-overlay engages exactly as it would for a hand user.
  private async runDragSpacingOs(
    step:
      | Extract<DemoAction, { action: 'dragPadding' }>
      | Extract<DemoAction, { action: 'dragMargin' }>,
    kind: 'padding' | 'margin'
  ): Promise<void> {
    const nodeId = await this.resolveSelectorOnPage(step.selector)
    const modeKey = kind === 'padding' ? 'P' : 'M'
    const handleClass = kind === 'padding' ? 'padding-handle-' : 'margin-handle-'
    // Real OS click on the preview node — selects it.
    const elRect = await this.getRectByMirrorId(nodeId)
    await this.osMouse!.clickPage(elRect.x + elRect.w / 2, elRect.y + elRect.h / 2)
    await new Promise(r => setTimeout(r, 220))
    // Real keyboard tap to toggle the spacing mode (P / M).
    await this.osMouse!.tapKey(modeKey)
    await new Promise(r => setTimeout(r, 220))
    const handle = await this.getRect(`.${handleClass}${step.side}`)
    const startX = handle.x + handle.w / 2
    const startY = handle.y + handle.h / 2
    let endX = startX
    let endY = startY
    // Padding: drag inward grows padding. Margin: drag outward grows margin.
    if (kind === 'padding') {
      if (step.side === 'top') endY += step.delta
      else if (step.side === 'bottom') endY -= step.delta
      else if (step.side === 'left') endX += step.delta
      else endX -= step.delta
    } else {
      if (step.side === 'top') endY -= step.delta
      else if (step.side === 'bottom') endY += step.delta
      else if (step.side === 'left') endX -= step.delta
      else endX += step.delta
    }
    if (step.mode === 'all') {
      await this.osMouse!.dragPageWithModifier(startX, startY, endX, endY, 'shift', {
        preHoldMs: 180,
        settleMs: 260,
      })
    } else if (step.mode === 'axis') {
      await this.osMouse!.dragPageWithModifier(startX, startY, endX, endY, 'alt', {
        preHoldMs: 180,
        settleMs: 260,
      })
    } else {
      await this.osMouse!.dragPage(startX, startY, endX, endY, {
        preHoldMs: 180,
        settleMs: 260,
      })
    }
    await this.waitForCompile()
    // Tap the same key again to exit the mode (real toggle, not JS dispatch).
    await this.osMouse!.tapKey(modeKey)
    await new Promise(r => setTimeout(r, 120))
  }

  private async runDragMargin(
    step: Extract<DemoAction, { action: 'dragMargin' }>,
    prefix: string
  ): Promise<void> {
    console.log(
      `${prefix} 📏 Margin ${this.describeSelector(step.selector)} ${step.side}+${step.delta}` +
        (step.mode ? ` (${step.mode})` : '') +
        (step.comment ? ` — ${step.comment}` : '')
    )
    if (this.osMouse) {
      await this.runDragSpacingOs(step, 'margin')
    } else {
      await this.evaluate(
        `window.__mirrorActions.dragMargin(${JSON.stringify(step.selector)}, ${JSON.stringify(step.side)}, ${step.delta}, ${JSON.stringify(step.mode ?? 'single')}, ${step.bypassSnap ?? false})`
      )
    }
    await this.runInlineExpectCode(step.expectCode, prefix, step.comment)
  }

  private async runInlineEdit(
    step: Extract<DemoAction, { action: 'inlineEdit' }>,
    prefix: string
  ): Promise<void> {
    const preview = step.text.length > 24 ? step.text.substring(0, 24) + '…' : step.text
    console.log(
      `${prefix} ✏️  Inline-edit ${this.describeSelector(step.selector)} → "${preview}"` +
        (step.comment ? ` — ${step.comment}` : '')
    )
    if (this.osMouse) {
      await this.runInlineEditOs(step)
    } else {
      const cd = step.charDelay ?? 60
      await this.evaluate(
        `window.__mirrorActions.inlineEdit(${JSON.stringify(step.selector)}, ${JSON.stringify(step.text)}, ${cd})`
      )
    }
    await this.runInlineExpectCode(step.expectCode, prefix, step.comment)
  }

  private async runInlineEditOs(
    step: Extract<DemoAction, { action: 'inlineEdit' }>
  ): Promise<void> {
    const nodeId = await this.resolveSelectorOnPage(step.selector)
    const rect = await this.getRectByMirrorId(nodeId)
    // Real double-click triggers Mirror's inline-edit mode.
    await this.osMouse!.doubleClickPage(rect.x + rect.w / 2, rect.y + rect.h / 2)
    await new Promise(r => setTimeout(r, 240))
    // The inline editor is now focused. Replace the selection with the new
    // text via JS — typing through the OS keyboard would depend on the
    // user's keyboard layout, JS dispatch keeps the demo deterministic.
    const cd = step.charDelay ?? 50
    await this.evaluate(`
      (async function() {
        const text = ${JSON.stringify(step.text)};
        const cd = ${cd};
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0) {
          // Empty current text in the focused contentEditable, then type.
          document.execCommand('selectAll', false);
          document.execCommand('delete', false);
          for (let i = 0; i < text.length; i++) {
            document.execCommand('insertText', false, text[i]);
            await new Promise(r => setTimeout(r, cd));
          }
        }
        // Commit the edit — Mirror listens for blur or Enter.
        const ctrl = window.__mirrorStudio__ && window.__mirrorStudio__.inlineEdit;
        if (ctrl && typeof ctrl.endEdit === 'function') ctrl.endEdit(true);
        else document.activeElement && document.activeElement.blur();
      })()
    `)
    await new Promise(r => setTimeout(r, 200))
    await this.waitForCompile()
  }

  private async runSelectInPreview(
    step: Extract<DemoAction, { action: 'selectInPreview' }>,
    prefix: string
  ): Promise<void> {
    console.log(
      `${prefix} 👆 Select ${this.describeSelector(step.selector)}` +
        (step.comment ? ` — ${step.comment}` : '')
    )
    if (this.osMouse) {
      const nodeId = await this.resolveSelectorOnPage(step.selector)
      const rect = await this.getRectByMirrorId(nodeId)
      await this.osMouse!.clickPage(rect.x + rect.w / 2, rect.y + rect.h / 2)
      await new Promise(r => setTimeout(r, 180))
    } else {
      await this.evaluate(
        `window.__mirrorActions.selectInPreview(${JSON.stringify(step.selector)})`
      )
    }
    await this.runInlineExpectCode(step.expectCode, prefix, step.comment)
  }

  private async runSetProperty(
    step: Extract<DemoAction, { action: 'setProperty' }>,
    prefix: string
  ): Promise<void> {
    console.log(
      `${prefix} ⚙️  Set ${step.prop}=${step.value} on ${this.describeSelector(step.selector)}` +
        (step.comment ? ` — ${step.comment}` : '')
    )
    if (this.osMouse) {
      await this.runSetPropertyOs(step)
    } else {
      await this.evaluate(
        `window.__mirrorActions.setProperty(${JSON.stringify(step.selector)}, ${JSON.stringify(step.prop)}, ${JSON.stringify(step.value)})`
      )
    }
    await this.runInlineExpectCode(step.expectCode, prefix, step.comment)
  }

  private async runSetPropertyOs(
    step: Extract<DemoAction, { action: 'setProperty' }>
  ): Promise<void> {
    const nodeId = await this.resolveSelectorOnPage(step.selector)
    // First select the element (real click on preview node) so the property
    // panel renders for it.
    const previewRect = await this.getRectByMirrorId(nodeId)
    await this.osMouse!.clickPage(
      previewRect.x + previewRect.w / 2,
      previewRect.y + previewRect.h / 2
    )
    await new Promise(r => setTimeout(r, 220))

    // Try to find a visible input/select for this property in the panel.
    const inputRect = await this.evaluate<{
      x: number
      y: number
      w: number
      h: number
      tag: string
    } | null>(`
      (() => {
        const sel = '#property-panel input[data-prop="${step.prop}"], #property-panel select[data-prop="${step.prop}"]';
        const el = document.querySelector(sel);
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return { x: r.left, y: r.top, w: r.width, h: r.height, tag: el.tagName.toLowerCase() };
      })()
    `)

    if (inputRect) {
      // Click into the field, then update via JS (deterministic across
      // keyboard layouts) and dispatch Enter to commit.
      await this.osMouse!.clickPage(inputRect.x + inputRect.w / 2, inputRect.y + inputRect.h / 2)
      await new Promise(r => setTimeout(r, 140))
      await this.evaluate(`
        (async function() {
          const sel = '#property-panel input[data-prop="${step.prop}"], #property-panel select[data-prop="${step.prop}"]';
          const el = document.querySelector(sel);
          if (!el) return;
          el.focus();
          if (el.tagName.toLowerCase() === 'select') {
            el.value = ${JSON.stringify(step.value)};
            el.dispatchEvent(new Event('change', { bubbles: true }));
          } else {
            el.select();
            await new Promise(r => setTimeout(r, 60));
            el.value = ${JSON.stringify(step.value)};
            el.dispatchEvent(new Event('input', { bubbles: true }));
            await new Promise(r => setTimeout(r, 80));
            el.dispatchEvent(new Event('change', { bubbles: true }));
            el.dispatchEvent(new KeyboardEvent('keydown', {
              key: 'Enter', code: 'Enter', bubbles: true, cancelable: true,
            }));
          }
          await new Promise(r => setTimeout(r, 80));
          el.blur();
        })()
      `)
    } else {
      // Fallback: section may be collapsed and the input not rendered.
      // Drive the change through the studio API. Visible cursor stays on
      // the property panel area so the action reads as "panel updated".
      await this.evaluate(`
        (function() {
          const studio = window.__mirrorStudio__;
          const panel = studio && studio.propertyPanel;
          if (!panel || typeof panel.changeProperty !== 'function') {
            throw new Error('setProperty: studio.propertyPanel.changeProperty unavailable');
          }
          panel.changeProperty(${JSON.stringify(step.prop)}, ${JSON.stringify(step.value)});
        })()
      `)
    }
    await new Promise(r => setTimeout(r, 180))
    await this.waitForCompile()
  }

  private async runPickColor(
    step: Extract<DemoAction, { action: 'pickColor' }>,
    prefix: string
  ): Promise<void> {
    console.log(
      `${prefix} 🎨 Pick ${step.prop}=${step.color} on ${this.describeSelector(step.selector)}` +
        (step.comment ? ` — ${step.comment}` : '')
    )
    if (this.osMouse) {
      await this.runPickColorOs(step)
    } else {
      await this.evaluate(
        `window.__mirrorActions.pickColor(${JSON.stringify(step.selector)}, ${JSON.stringify(step.prop)}, ${JSON.stringify(step.color)})`
      )
    }
    await this.runInlineExpectCode(step.expectCode, prefix, step.comment)
  }

  private async runPickColorOs(step: Extract<DemoAction, { action: 'pickColor' }>): Promise<void> {
    const nodeId = await this.resolveSelectorOnPage(step.selector)
    const previewRect = await this.getRectByMirrorId(nodeId)
    await this.osMouse!.clickPage(
      previewRect.x + previewRect.w / 2,
      previewRect.y + previewRect.h / 2
    )
    await new Promise(r => setTimeout(r, 220))
    // Click the color trigger button in the panel — opens the color popover.
    const triggerRect = await this.getRect(`#property-panel [data-color-prop="${step.prop}"]`)
    await this.osMouse!.clickPage(
      triggerRect.x + triggerRect.w / 2,
      triggerRect.y + triggerRect.h / 2
    )
    await new Promise(r => setTimeout(r, 220))
    // Drive the color value through the studio API — the picker UI varies
    // (swatch grid, hex input, etc.) and isn't reliable to navigate by mouse.
    await this.evaluate(`
      (function() {
        document.body.click();
        const studio = window.__mirrorStudio__;
        const panel = studio && studio.propertyPanel;
        if (!panel || typeof panel.changeProperty !== 'function') {
          throw new Error('pickColor: studio.propertyPanel.changeProperty unavailable');
        }
        panel.changeProperty(${JSON.stringify(step.prop)}, ${JSON.stringify(step.color)});
      })()
    `)
    await new Promise(r => setTimeout(r, 180))
    await this.waitForCompile()
  }

  private async runAiPrompt(
    step: Extract<DemoAction, { action: 'aiPrompt' }>,
    prefix: string
  ): Promise<void> {
    const preview = step.prompt.length > 40 ? step.prompt.substring(0, 40) + '…' : step.prompt
    console.log(`${prefix} 🤖 AI prompt: "${preview}"` + (step.comment ? ` — ${step.comment}` : ''))
    const opts = JSON.stringify({ charDelay: step.charDelay ?? 50 })
    await this.evaluate(`window.__mirrorActions.aiPrompt(${JSON.stringify(step.prompt)}, ${opts})`)
    if (step.expectCodeMatches) {
      const inline =
        typeof step.expectCodeMatches === 'object' && 'pattern' in step.expectCodeMatches
          ? step.expectCodeMatches
          : { pattern: step.expectCodeMatches as string | RegExp, comment: step.comment }
      await this.runExpectCodeMatches(
        {
          action: 'expectCodeMatches',
          pattern: inline.pattern,
          comment: inline.comment ?? step.comment,
        },
        prefix
      )
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
          message: exists ? `File exists: ${check.path}` : `File NOT found: ${check.path}`,
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
        const result = await this.evaluate<{
          hasErrors: boolean
          hasWarnings: boolean
          errorCount: number
          warningCount: number
        }>(`
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
        const hasProblems = allowWarnings
          ? result.hasErrors
          : result.hasErrors || result.hasWarnings
        let message: string
        if (!hasProblems) {
          message = allowWarnings
            ? `No lint errors (${result.warningCount} warnings allowed)`
            : 'No lint errors or warnings'
        } else {
          const parts = []
          if (result.errorCount > 0) parts.push(`${result.errorCount} error(s)`)
          if (!allowWarnings && result.warningCount > 0)
            parts.push(`${result.warningCount} warning(s)`)
          message = `Lint issues found: ${parts.join(', ')}`
        }
        return {
          success: !hasProblems,
          check,
          message,
          actual: result.errorCount + result.warningCount,
        }
      }

      case 'colorPickerClosed': {
        const isOpen = await this.evaluate<boolean>(`
          (function() {
            const picker = document.getElementById('color-picker');
            return picker && picker.classList.contains('visible');
          })()
        `)
        return {
          success: !isOpen,
          check,
          message: isOpen ? 'Color picker is still open' : 'Color picker is closed',
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
      // Restore __dragTest's own cursor for other test scenarios
      await this.evaluate(`
        (function() {
          if (window.__dragTest && window.__dragTest.setAnimation) {
            window.__dragTest.setAnimation({ showCursor: true });
          }
        })()
      `)
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

// ============================================================================
// Top-level helpers used by the DemoRunner
// ============================================================================

interface NormalizeOpts {
  collapseSpaces: boolean
  trimEnds: boolean
}

function normalizeCode(input: string, opts: NormalizeOpts): string {
  let lines = input
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map(l => l.replace(/[ \t]+$/, ''))
  if (opts.collapseSpaces) {
    lines = lines.map(l => {
      const m = l.match(/^([ \t]*)(.*)$/)
      if (!m) return l
      return m[1] + m[2].replace(/ {2,}/g, ' ')
    })
  }
  if (opts.trimEnds) {
    while (lines.length && lines[0] === '') lines.shift()
    while (lines.length && lines[lines.length - 1] === '') lines.pop()
  }
  return lines.join('\n')
}

function lineDiff(expected: string, actual: string): string[] {
  const exp = expected.split('\n')
  const act = actual.split('\n')
  const max = Math.max(exp.length, act.length)
  const out: string[] = ['expected ↓                                            actual ↓']
  for (let i = 0; i < max; i++) {
    const e = exp[i] ?? ''
    const a = act[i] ?? ''
    const same = e === a
    const marker = same ? '  ' : '✗ '
    out.push(`${marker}${pad(e, 50)}  │  ${a}`)
  }
  return out
}

function pad(s: string, width: number): string {
  if (s.length >= width) return s.substring(0, width - 1) + '…'
  return s + ' '.repeat(width - s.length)
}

function formatSnapshotValue(v: unknown): string {
  if (v === undefined) return 'undefined'
  if (v === null) return 'null'
  if (typeof v === 'string') return JSON.stringify(v)
  if (typeof v === 'number' || typeof v === 'boolean') return String(v)
  if (Array.isArray(v)) return '[' + v.map(x => formatSnapshotValue(x)).join(', ') + ']'
  if (typeof v === 'object') {
    const obj = v as Record<string, unknown>
    const inner = Object.entries(obj)
      .map(([k, val]) => `${k}: ${formatSnapshotValue(val)}`)
      .join(', ')
    return `{ ${inner} }`
  }
  return String(v)
}

const KNOWN_DOM_CHECK_KEYS = new Set([
  'selector',
  'label',
  'extras',
  'tag',
  'text',
  'visible',
  'width',
  'height',
  'paddingTop',
  'paddingRight',
  'paddingBottom',
  'paddingLeft',
  'marginTop',
  'marginRight',
  'marginBottom',
  'marginLeft',
  'color',
  'background',
  'childCount',
  'layout',
])

function compareDomCheck(
  check: Record<string, unknown>,
  snapshot: Record<string, unknown>
): string[] {
  const failures: string[] = []
  for (const key of Object.keys(check)) {
    if (key === 'selector' || key === 'label' || key === 'extras') continue
    const expected = check[key]
    if (expected === undefined) continue
    const actual = snapshot[key]
    if (key === 'layout') {
      const lf = compareLayout(
        expected as Record<string, unknown>,
        actual as Record<string, unknown> | undefined
      )
      for (const f of lf) failures.push(`layout.${f}`)
      continue
    }
    const f = compareField(key, expected, actual)
    if (f) failures.push(f)
  }
  return failures
}

function compareLayout(
  expected: Record<string, unknown> | undefined,
  actual: Record<string, unknown> | undefined
): string[] {
  if (!expected) return []
  if (!actual) return ['expected layout, got none']
  const failures: string[] = []
  for (const k of Object.keys(expected)) {
    const f = compareField(k, expected[k], actual[k])
    if (f) failures.push(f)
  }
  return failures
}

function compareField(name: string, expected: unknown, actual: unknown): string | null {
  if (expected instanceof RegExp) {
    return typeof actual === 'string' && expected.test(actual)
      ? null
      : `${name}: expected match ${expected}, got ${JSON.stringify(actual)}`
  }
  if (
    expected &&
    typeof expected === 'object' &&
    !Array.isArray(expected) &&
    ('min' in (expected as object) || 'max' in (expected as object))
  ) {
    const r = expected as { min?: number; max?: number }
    if (typeof actual !== 'number')
      return `${name}: expected number in range, got ${JSON.stringify(actual)}`
    if (r.min !== undefined && actual < r.min) return `${name}: expected >= ${r.min}, got ${actual}`
    if (r.max !== undefined && actual > r.max) return `${name}: expected <= ${r.max}, got ${actual}`
    return null
  }
  if (
    expected &&
    typeof expected === 'object' &&
    !Array.isArray(expected) &&
    'contains' in (expected as object)
  ) {
    const c = (expected as { contains: string }).contains
    return typeof actual === 'string' && actual.includes(c)
      ? null
      : `${name}: expected to contain "${c}", got ${JSON.stringify(actual)}`
  }
  // Hex-color case-insensitive
  if (
    typeof expected === 'string' &&
    typeof actual === 'string' &&
    isHexColor(expected) &&
    isHexColor(actual)
  ) {
    return expected.toLowerCase() === actual.toLowerCase()
      ? null
      : `${name}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`
  }
  return expected === actual
    ? null
    : `${name}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`
}

function isHexColor(s: string): boolean {
  return /^#[0-9a-fA-F]{3,8}$/.test(s)
}

// Pixel-diff (C4-followup) via lazy-loaded pngjs + pixelmatch
async function comparePngFiles(
  baselinePath: string,
  currentPath: string,
  threshold: number
): Promise<{ match: boolean; diffPixels: number; totalPixels: number; diffPng?: Buffer }> {
  const fsLazy = await import('fs')
  // @ts-ignore — no type defs shipped
  const pngMod: any = await import('pngjs')
  const PNG: any = pngMod.PNG
  // @ts-ignore — no type defs shipped
  const pmMod: any = await import('pixelmatch')
  const pixelmatch: any = pmMod.default ?? pmMod

  const a = PNG.sync.read(fsLazy.readFileSync(baselinePath))
  const b = PNG.sync.read(fsLazy.readFileSync(currentPath))
  if (a.width !== b.width || a.height !== b.height) {
    return { match: false, diffPixels: a.width * a.height, totalPixels: a.width * a.height }
  }
  const diff = new PNG({ width: a.width, height: a.height })
  const diffPixels = pixelmatch(a.data, b.data, diff.data, a.width, a.height, { threshold })
  const totalPixels = a.width * a.height
  if (diffPixels === 0) return { match: true, diffPixels: 0, totalPixels }
  return { match: false, diffPixels, totalPixels, diffPng: PNG.sync.write(diff) }
}

/**
 * Load a demo script from file
 */
export async function loadDemoScript(filePath: string): Promise<DemoScript> {
  const absolutePath = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath)

  // Handle TypeScript and JavaScript files - use dynamic import
  if (absolutePath.endsWith('.ts') || absolutePath.endsWith('.js')) {
    // Use file:// URL for cross-platform compatibility
    const fileUrl = `file://${absolutePath}`
    const module = await import(fileUrl)
    return module.default || module.demoScript || (Object.values(module)[0] as DemoScript)
  }

  // Handle JSON files
  if (absolutePath.endsWith('.json')) {
    const content = fs.readFileSync(absolutePath, 'utf-8')
    return JSON.parse(content) as DemoScript
  }

  throw new Error(`Unsupported demo script format: ${filePath}. Use .ts, .js, or .json`)
}
