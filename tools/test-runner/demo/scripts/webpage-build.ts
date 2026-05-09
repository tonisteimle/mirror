/**
 * Webpage Build Demo (incremental)
 *
 * Builds a complete webpage on a 4×8 grid by drawing layout regions
 * first, then filling them with titles, body text, and images.
 *
 * Phase 1 (current): canvas + Stage shell + 4 named regions
 *   Header   (4×1 across the top)
 *   Sidebar  (1×6 left column, rows 2..7)
 *   Content  (3×6 main area, rows 2..7)
 *   Footer   (4×1 across the bottom)
 *
 * Each region is drawn with `name X` so later phases can target it via
 * `byPath: 'X'` and add children without fragile nth-of-type selectors.
 *
 * Subsequent phases will append titles, body text, and images inside
 * each region, then style with tokens. This file grows phase by phase
 * with headless verification between iterations.
 */

import type { DemoScript } from '../types'

export const demoScript: DemoScript = {
  name: 'Webpage Build',
  description: 'Incrementally build a complete webpage: grid → regions → content',
  config: {
    speed: 'normal',
    showKeystrokeOverlay: false,
    customTimings: {
      type: {
        charMs: 30,
        variance: 0.2,
        wordPauseMs: 0,
        linePauseMs: 80,
        thoughtPauseMs: 200,
      },
    },
  },
  steps: [
    // ===================================================================
    // Phase 1: Canvas + Stage Grid + 4 named regions
    // ===================================================================
    { action: 'comment', text: 'Phase 1: Canvas + Stage + Layout-Regionen' },
    { action: 'moveTo', target: '.cm-editor' },
    { action: 'click' },
    {
      action: 'type',
      text:
        'canvas desktop, bg #0f0f0f\n' +
        'Frame name Stage, w full, h full, grid 4 8, row-height 80, gap 8, pad 16, bg #1a1a1a',
      expectCode:
        'canvas desktop, bg #0f0f0f\n' +
        'Frame name Stage, w full, h full, grid 4 8, row-height 80, gap 8, pad 16, bg #1a1a1a',
      pauseAfter: { ' ': 0 },
    },
    // Hex values open editor color picker; dismiss before drawing.
    {
      action: 'execute',
      code: 'window.hideColorPicker && window.hideColorPicker(); window.hideGlobalColorPicker && window.hideGlobalColorPicker()',
      comment: 'dismiss color picker',
    },
    { action: 'wait', duration: 400 },

    // === Header (top, full width) ===
    { action: 'comment', text: 'Header über (1,1)..(4,1)' },
    {
      action: 'drawInGrid',
      component: 'Frame',
      target: { byPath: 'Stage' },
      from: { x: 1, y: 1 },
      to: { x: 4, y: 1 },
      name: 'Header',
      comment: 'Header 4×1',
      expectCode:
        'canvas desktop, bg #0f0f0f\n' +
        'Frame name Stage, w full, h full, grid 4 8, row-height 80, gap 8, pad 16, bg #1a1a1a\n' +
        '  Frame name Header, bg #27272a, rad 8, x 1, y 1, w 4, h 1',
    },
    { action: 'wait', duration: 400 },

    // === Sidebar (left column, rows 2..7) ===
    { action: 'comment', text: 'Sidebar über (1,2)..(1,7)' },
    {
      action: 'drawInGrid',
      component: 'Frame',
      target: { byPath: 'Stage' },
      from: { x: 1, y: 2 },
      to: { x: 1, y: 7 },
      name: 'Sidebar',
      comment: 'Sidebar 1×6',
      expectCode:
        'canvas desktop, bg #0f0f0f\n' +
        'Frame name Stage, w full, h full, grid 4 8, row-height 80, gap 8, pad 16, bg #1a1a1a\n' +
        '  Frame name Header, bg #27272a, rad 8, x 1, y 1, w 4, h 1\n' +
        '  Frame name Sidebar, bg #27272a, rad 8, x 1, y 2, w 1, h 6',
    },
    { action: 'wait', duration: 400 },

    // === Content (cols 2..4, rows 2..7) ===
    { action: 'comment', text: 'Content über (2,2)..(4,7)' },
    {
      action: 'drawInGrid',
      component: 'Frame',
      target: { byPath: 'Stage' },
      from: { x: 2, y: 2 },
      to: { x: 4, y: 7 },
      name: 'Content',
      comment: 'Content 3×6',
      expectCode:
        'canvas desktop, bg #0f0f0f\n' +
        'Frame name Stage, w full, h full, grid 4 8, row-height 80, gap 8, pad 16, bg #1a1a1a\n' +
        '  Frame name Header, bg #27272a, rad 8, x 1, y 1, w 4, h 1\n' +
        '  Frame name Sidebar, bg #27272a, rad 8, x 1, y 2, w 1, h 6\n' +
        '  Frame name Content, bg #27272a, rad 8, x 2, y 2, w 3, h 6',
    },
    { action: 'wait', duration: 400 },

    // === Footer (bottom, full width) ===
    { action: 'comment', text: 'Footer über (1,8)..(4,8)' },
    {
      action: 'drawInGrid',
      component: 'Frame',
      target: { byPath: 'Stage' },
      from: { x: 1, y: 8 },
      to: { x: 4, y: 8 },
      name: 'Footer',
      comment: 'Footer 4×1',
      expectCode:
        'canvas desktop, bg #0f0f0f\n' +
        'Frame name Stage, w full, h full, grid 4 8, row-height 80, gap 8, pad 16, bg #1a1a1a\n' +
        '  Frame name Header, bg #27272a, rad 8, x 1, y 1, w 4, h 1\n' +
        '  Frame name Sidebar, bg #27272a, rad 8, x 1, y 2, w 1, h 6\n' +
        '  Frame name Content, bg #27272a, rad 8, x 2, y 2, w 3, h 6\n' +
        '  Frame name Footer, bg #27272a, rad 8, x 1, y 8, w 4, h 1',
    },
    { action: 'wait', duration: 600 },

    // === Verify all 4 regions reachable by name ===
    // No explicit `exists` field on DomCheck — a selector that fails to
    // resolve already fails the step. Asserting `tag: 'div'` doubles as
    // an existence check and pins the rendered element type.
    {
      action: 'expectDom',
      comment: 'Stage has 4 named children, each addressable by byPath',
      checks: [
        { selector: { byPath: 'Stage' }, childCount: 4 },
        { selector: { byPath: 'Header' }, tag: 'div' },
        { selector: { byPath: 'Sidebar' }, tag: 'div' },
        { selector: { byPath: 'Content' }, tag: 'div' },
        { selector: { byPath: 'Footer' }, tag: 'div' },
      ],
    },

    // ===================================================================
    // Phase 2: H1 inside Header
    // ===================================================================
    // CodeMirror auto-indent semantics (whether Enter inherits indentation
    // from the previous line) depend on language extensions, and Mirror's
    // editor setup makes that hard to predict from cell-mid keystrokes.
    // To stay deterministic, we drive the structural insert via
    // editor.dispatch — the user *sees* the line appear instantly. For
    // the typed-feel of a video, swap to setEditorCursor + type once
    // we've confirmed the indent behavior.
    { action: 'comment', text: 'Phase 2: H1 in Header' },
    {
      action: 'execute',
      comment: 'insert H1 child under Header',
      code: `
        (() => {
          const e = window.editor;
          if (!e) throw new Error('no editor');
          const src = e.state.doc.toString();
          const lines = src.split('\\n');
          const idx = lines.findIndex(l => /Frame name Header\\b/.test(l));
          if (idx < 0) throw new Error('Header line not found');
          let off = 0;
          for (let i = 0; i <= idx; i++) off += lines[i].length + 1;
          // Stage indent is 2 spaces; Header's children are at 4 spaces.
          e.dispatch({ changes: { from: off, insert: '    H1 "Mirror — DSL fürs AI-Zeitalter", col white, fs 28\\n' } });
        })()
      `,
    },
    { action: 'wait', duration: 400 },
    {
      action: 'expectCode',
      code:
        'canvas desktop, bg #0f0f0f\n' +
        'Frame name Stage, w full, h full, grid 4 8, row-height 80, gap 8, pad 16, bg #1a1a1a\n' +
        '  Frame name Header, bg #27272a, rad 8, x 1, y 1, w 4, h 1\n' +
        '    H1 "Mirror — DSL fürs AI-Zeitalter", col white, fs 28\n' +
        '  Frame name Sidebar, bg #27272a, rad 8, x 1, y 2, w 1, h 6\n' +
        '  Frame name Content, bg #27272a, rad 8, x 2, y 2, w 3, h 6\n' +
        '  Frame name Footer, bg #27272a, rad 8, x 1, y 8, w 4, h 1',
      comment: 'H1 nested under Header at 4-space indent',
    },
    {
      action: 'expectDom',
      comment: 'Header now has 1 child (the H1)',
      checks: [{ selector: { byPath: 'Header' }, childCount: 1 }],
    },

    // ===================================================================
    // Phase 3: Nav items in Sidebar
    // ===================================================================
    { action: 'comment', text: 'Phase 3: Nav-Items in Sidebar' },
    {
      action: 'execute',
      comment: 'insert 4 nav Text children under Sidebar',
      code: `
        (() => {
          const e = window.editor;
          if (!e) throw new Error('no editor');
          const src = e.state.doc.toString();
          const lines = src.split('\\n');
          const idx = lines.findIndex(l => /Frame name Sidebar\\b/.test(l));
          if (idx < 0) throw new Error('Sidebar line not found');
          let off = 0;
          for (let i = 0; i <= idx; i++) off += lines[i].length + 1;
          const insert =
            '    Text "Dashboard", col #d4d4d8, fs 14\\n' +
            '    Text "Projekte", col #d4d4d8, fs 14\\n' +
            '    Text "Kunden", col #d4d4d8, fs 14\\n' +
            '    Text "Einstellungen", col #d4d4d8, fs 14\\n';
          e.dispatch({ changes: { from: off, insert } });
        })()
      `,
    },
    { action: 'wait', duration: 400 },
    {
      action: 'expectCode',
      code:
        'canvas desktop, bg #0f0f0f\n' +
        'Frame name Stage, w full, h full, grid 4 8, row-height 80, gap 8, pad 16, bg #1a1a1a\n' +
        '  Frame name Header, bg #27272a, rad 8, x 1, y 1, w 4, h 1\n' +
        '    H1 "Mirror — DSL fürs AI-Zeitalter", col white, fs 28\n' +
        '  Frame name Sidebar, bg #27272a, rad 8, x 1, y 2, w 1, h 6\n' +
        '    Text "Dashboard", col #d4d4d8, fs 14\n' +
        '    Text "Projekte", col #d4d4d8, fs 14\n' +
        '    Text "Kunden", col #d4d4d8, fs 14\n' +
        '    Text "Einstellungen", col #d4d4d8, fs 14\n' +
        '  Frame name Content, bg #27272a, rad 8, x 2, y 2, w 3, h 6\n' +
        '  Frame name Footer, bg #27272a, rad 8, x 1, y 8, w 4, h 1',
      comment: '4 nav items nested under Sidebar',
    },
    {
      action: 'expectDom',
      comment: 'Sidebar now has 4 children',
      checks: [{ selector: { byPath: 'Sidebar' }, childCount: 4 }],
    },

    // ===================================================================
    // Phase 4: Hero title + body in Content
    // ===================================================================
    { action: 'comment', text: 'Phase 4: Hero + Body in Content' },
    {
      action: 'execute',
      comment: 'insert H2 + body Text children under Content',
      code: `
        (() => {
          const e = window.editor;
          if (!e) throw new Error('no editor');
          const src = e.state.doc.toString();
          const lines = src.split('\\n');
          const idx = lines.findIndex(l => /Frame name Content\\b/.test(l));
          if (idx < 0) throw new Error('Content line not found');
          let off = 0;
          for (let i = 0; i <= idx; i++) off += lines[i].length + 1;
          const insert =
            '    H2 "Eine Sprache, die AI versteht und Designer lesen können", col white, fs 22\\n' +
            '    Text "Mirror generiert echte Prototypen statt Mockups. AI schreibt den Code, du verfeinerst ihn — ohne Framework-Wissen, ohne Build-Tools.", col #a1a1aa, fs 14, line 1.6\\n';
          e.dispatch({ changes: { from: off, insert } });
        })()
      `,
    },
    { action: 'wait', duration: 400 },
    {
      action: 'expectCode',
      code:
        'canvas desktop, bg #0f0f0f\n' +
        'Frame name Stage, w full, h full, grid 4 8, row-height 80, gap 8, pad 16, bg #1a1a1a\n' +
        '  Frame name Header, bg #27272a, rad 8, x 1, y 1, w 4, h 1\n' +
        '    H1 "Mirror — DSL fürs AI-Zeitalter", col white, fs 28\n' +
        '  Frame name Sidebar, bg #27272a, rad 8, x 1, y 2, w 1, h 6\n' +
        '    Text "Dashboard", col #d4d4d8, fs 14\n' +
        '    Text "Projekte", col #d4d4d8, fs 14\n' +
        '    Text "Kunden", col #d4d4d8, fs 14\n' +
        '    Text "Einstellungen", col #d4d4d8, fs 14\n' +
        '  Frame name Content, bg #27272a, rad 8, x 2, y 2, w 3, h 6\n' +
        '    H2 "Eine Sprache, die AI versteht und Designer lesen können", col white, fs 22\n' +
        '    Text "Mirror generiert echte Prototypen statt Mockups. AI schreibt den Code, du verfeinerst ihn — ohne Framework-Wissen, ohne Build-Tools.", col #a1a1aa, fs 14, line 1.6\n' +
        '  Frame name Footer, bg #27272a, rad 8, x 1, y 8, w 4, h 1',
      comment: 'H2 + body nested under Content',
    },
    {
      action: 'expectDom',
      comment: 'Content now has 2 children',
      checks: [{ selector: { byPath: 'Content' }, childCount: 2 }],
    },

    // ===================================================================
    // Phase 5: Footer text
    // ===================================================================
    { action: 'comment', text: 'Phase 5: Footer-Text' },
    {
      action: 'execute',
      comment: 'insert copyright Text under Footer',
      code: `
        (() => {
          const e = window.editor;
          if (!e) throw new Error('no editor');
          // Footer is the last line of the doc with no trailing newline.
          // line(n).to is the position at end of line content (before any
          // newline). Inserting "\\n..." there safely appends a new line
          // whether or not the doc ended with a newline.
          const src = e.state.doc.toString();
          const lines = src.split('\\n');
          const idx = lines.findIndex(l => /Frame name Footer\\b/.test(l));
          if (idx < 0) throw new Error('Footer line not found');
          const lineEnd = e.state.doc.line(idx + 1).to;
          const insert = '\\n    Text "© 2026 Mirror Project — alle Rechte vorbehalten", col #71717a, fs 12';
          e.dispatch({ changes: { from: lineEnd, insert } });
        })()
      `,
    },
    { action: 'wait', duration: 400 },
    {
      action: 'expectCode',
      code:
        'canvas desktop, bg #0f0f0f\n' +
        'Frame name Stage, w full, h full, grid 4 8, row-height 80, gap 8, pad 16, bg #1a1a1a\n' +
        '  Frame name Header, bg #27272a, rad 8, x 1, y 1, w 4, h 1\n' +
        '    H1 "Mirror — DSL fürs AI-Zeitalter", col white, fs 28\n' +
        '  Frame name Sidebar, bg #27272a, rad 8, x 1, y 2, w 1, h 6\n' +
        '    Text "Dashboard", col #d4d4d8, fs 14\n' +
        '    Text "Projekte", col #d4d4d8, fs 14\n' +
        '    Text "Kunden", col #d4d4d8, fs 14\n' +
        '    Text "Einstellungen", col #d4d4d8, fs 14\n' +
        '  Frame name Content, bg #27272a, rad 8, x 2, y 2, w 3, h 6\n' +
        '    H2 "Eine Sprache, die AI versteht und Designer lesen können", col white, fs 22\n' +
        '    Text "Mirror generiert echte Prototypen statt Mockups. AI schreibt den Code, du verfeinerst ihn — ohne Framework-Wissen, ohne Build-Tools.", col #a1a1aa, fs 14, line 1.6\n' +
        '  Frame name Footer, bg #27272a, rad 8, x 1, y 8, w 4, h 1\n' +
        '    Text "© 2026 Mirror Project — alle Rechte vorbehalten", col #71717a, fs 12',
      comment: 'Footer copyright text',
    },
    {
      action: 'expectDom',
      comment: 'Footer now has 1 child',
      checks: [{ selector: { byPath: 'Footer' }, childCount: 1 }],
    },

    // ===================================================================
    // Phase 6: Hero image at top of Content
    // ===================================================================
    // Data-URL SVG keeps the demo network-free: the <img> always loads,
    // the headless run is deterministic, and headed viewers see a real
    // image (a solid-blue 600×200 rect) instead of a broken-link icon.
    { action: 'comment', text: 'Phase 6: Hero-Image im Content' },
    {
      action: 'execute',
      comment: 'insert hero Image as first child of Content',
      code: `
        (() => {
          const e = window.editor;
          if (!e) throw new Error('no editor');
          const src = e.state.doc.toString();
          const lines = src.split('\\n');
          const idx = lines.findIndex(l => /Frame name Content\\b/.test(l));
          if (idx < 0) throw new Error('Content line not found');
          const lineEnd = e.state.doc.line(idx + 1).to;
          const dataUrl = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2MDAiIGhlaWdodD0iMzAwIj48cmVjdCB3aWR0aD0iNjAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iIzIyNzFDMSIvPjwvc3ZnPg==';
          const insert = '\\n    Image src "' + dataUrl + '", w full, h 160, rad 8';
          e.dispatch({ changes: { from: lineEnd, insert } });
        })()
      `,
    },
    { action: 'wait', duration: 400 },
    {
      action: 'expectCodeMatches',
      pattern:
        /Frame name Content,[^\n]+\n {4}Image src "data:image\/svg\+xml;base64,[A-Za-z0-9+/=]+", w full, h 160, rad 8\n {4}H2 "Eine Sprache/,
      comment: 'Image landed as first child of Content',
    },
    {
      action: 'expectDom',
      comment: 'Content now has 3 children (Image, H2, Text)',
      checks: [{ selector: { byPath: 'Content' }, childCount: 3 }],
    },

    // ===================================================================
    // Phase 7: Header — Logo + Nav + CTA (HTML-aligned)
    // ===================================================================
    // Two-step build so the user *sees* the composition assemble. The
    // execute step rewrites just the region line (layout props +
    // bg/border) and seeds the brand-frame with the Mirror logo as a
    // base64 SVG (typing 280-char data URLs would be tedious & not
    // visually meaningful). Then a type action lays in the rest:
    // wordmark, nav links, CTA — all at the editor cursor, visible
    // keystroke-by-keystroke.
    { action: 'comment', text: 'Phase 7: Header — Logo + Nav + CTA' },
    {
      action: 'execute',
      comment: 'rewrite Header line, seed brand-frame + Image, place cursor',
      code: `
        (() => {
          const e = window.editor;
          if (!e) throw new Error('no editor');
          const src = e.state.doc.toString();
          const re = new RegExp('^([ \\\\t]*)Frame name Header\\\\b[^\\\\n]*$', 'm');
          const m = src.match(re);
          if (!m) throw new Error('Header line not found');
          const startPos = m.index;
          const baseIndent = m[1].length;
          const lineEnd = startPos + m[0].length;
          // consume existing children (deeper-indented block)
          let cursor = lineEnd + 1;
          const after = src.slice(lineEnd + 1);
          for (const line of after.split('\\n')) {
            const li = line.match(/^[ \\t]*/)[0].length;
            if (line.trim() !== '' && li <= baseIndent) break;
            cursor += line.length + 1;
            if (cursor - 1 >= src.length) { cursor = src.length + 1; break; }
          }
          const endPos = Math.min(cursor - 1, src.length);
          const logo = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSI+PHJlY3QgeD0iNCIgeT0iNCIgd2lkdGg9IjE4IiBoZWlnaHQ9IjE4IiByeD0iNCIgZmlsbD0iIzIyNzFDMSIvPjxyZWN0IHg9IjEwIiB5PSIxMCIgd2lkdGg9IjE4IiBoZWlnaHQ9IjE4IiByeD0iNCIgZmlsbD0iIzVCQThGNSIvPjwvc3ZnPg==';
          const seed =
            '  Frame name Header, bg #0a0a0a, x 1, y 1, w 4, h 1, hor, ver-center, spread, pad 0 32, bor-b 1, boc #18181b\\n' +
            '    Frame hor, gap 12, ver-center\\n' +
            '      Image src "' + logo + '", w 32, h 32';
          e.dispatch({
            changes: { from: startPos, to: endPos, insert: seed },
            selection: { anchor: startPos + seed.length },
          });
          e.focus();
        })()
      `,
    },
    { action: 'wait', duration: 300 },
    {
      action: 'type',
      comment: 'wordmark, nav links, CTA — typed visibly into Header',
      pauseAfter: { ' ': 0 },
      text:
        '\n      Text "Mirror", col white, fs 17, weight 600' +
        '\n    Frame hor, gap 32, ver-center' +
        '\n      Text "Docs", col #a1a1aa, fs 14' +
        '\n      Text "Examples", col #a1a1aa, fs 14' +
        '\n      Text "GitHub", col #a1a1aa, fs 14' +
        '\n    Button "Try the editor →", bg #2271C1, col white, pad 9 16, rad 7, fs 14, weight 500',
    },
    { action: 'wait', duration: 400 },
    {
      action: 'expectDom',
      comment: 'Header has 3 children (brand · nav · CTA)',
      checks: [{ selector: { byPath: 'Header' }, childCount: 3 }],
    },

    // ===================================================================
    // Phase 8: Sidebar — code preview pane (HTML-aligned)
    // ===================================================================
    // The Sidebar reframes from "workspace nav" to "code preview" — a
    // syntax-highlighted Mirror snippet showing what the language looks
    // like. Each code line becomes a `Frame hor, gap 0` containing
    // colored Text spans (one per token), generated by an inline
    // tokenizer. Non-breaking spaces preserve indentation since Mirror
    // Text doesn't expose `white-space: pre`.
    { action: 'comment', text: 'Phase 8: Sidebar — Code-Preview-Pane' },
    {
      action: 'execute',
      comment: 'replace Sidebar with syntax-highlighted code pane',
      code: `
        (() => {
          const e = window.editor;
          if (!e) throw new Error('no editor');

          // ----- inline syntax tokenizer -----
          const KW = new Set(['canvas','Frame','Card','Text','Button','Image','Icon','H1','H2','H3','Input','Textarea','Link']);
          const PR = new Set(['bg','col','gap','pad','rad','hor','ver-center','fs','w','h','weight','name','src','line','grow','center','mobile','tablet','desktop','full','hug','rad']);
          const COL = { kw:'#c084fc', pr:'#60a5fa', st:'#34d399', nu:'#fbbf24', cm:'#52525b', bs:'#d4d4d8' };
          const tokenize = (line) => {
            const out = [];
            let i = 0;
            while (i < line.length) {
              const c = line[i];
              if (c === ' ' || c === '\\t') {
                let j = i;
                while (j < line.length && (line[j]===' '||line[j]==='\\t')) j++;
                out.push({ t: line.slice(i,j), c: COL.bs });
                i = j;
              } else if (c === '"') {
                let j = i + 1;
                while (j < line.length && line[j] !== '"') j++;
                const end = j < line.length ? j+1 : j;
                out.push({ t: line.slice(i,end), c: COL.st });
                i = end;
              } else if (c === '#') {
                let j = i + 1;
                while (j < line.length && /[0-9a-fA-F]/.test(line[j])) j++;
                out.push({ t: line.slice(i,j), c: COL.nu });
                i = j;
              } else if (c === '/' && line[i+1] === '/') {
                out.push({ t: line.slice(i), c: COL.cm });
                i = line.length;
              } else if (/[a-zA-Z_$]/.test(c)) {
                let j = i;
                while (j < line.length && /[a-zA-Z0-9_$-]/.test(line[j])) j++;
                const tok = line.slice(i,j);
                const c2 = KW.has(tok) ? COL.kw : (PR.has(tok) ? COL.pr : COL.bs);
                out.push({ t: tok, c: c2 });
                i = j;
              } else if (/[0-9]/.test(c)) {
                let j = i;
                while (j < line.length && /[0-9.]/.test(line[j])) j++;
                out.push({ t: line.slice(i,j), c: COL.nu });
                i = j;
              } else {
                out.push({ t: c, c: COL.bs });
                i++;
              }
            }
            // merge consecutive same-color tokens
            const merged = [];
            for (const tk of out) {
              if (merged.length && merged[merged.length-1].c === tk.c) {
                merged[merged.length-1].t += tk.t;
              } else {
                merged.push({ t: tk.t, c: tk.c });
              }
            }
            return merged;
          };

          const code =
            'canvas mobile, bg #0a0a0a\\n' +
            '\\n' +
            'brand.bg: #2271C1\\n' +
            '\\n' +
            'Card: bg #18181b, rad 12, pad 20\\n' +
            '\\n' +
            'Frame pad 24, gap 16\\n' +
            '  Card\\n' +
            '    Frame hor, gap 12, ver-center\\n' +
            '      Image src "avatar.jpg", w 48, rad 99\\n' +
            '      Frame gap 2\\n' +
            '        Text "Anna Schmid", weight 600\\n' +
            '        Text "Designer", col #a1a1aa\\n' +
            '\\n' +
            '    Frame hor, gap 24\\n' +
            '      Frame\\n' +
            '        Text "127", weight 600\\n' +
            '        Text "Projekte", col #a1a1aa\\n' +
            '      Frame\\n' +
            '        Text "8.4k", weight 600\\n' +
            '        Text "Follower", col #a1a1aa\\n' +
            '\\n' +
            '    Button "Folgen", bg $brand, col white';

          // ----- emit Mirror DSL for each code line -----
          const lines = code.split('\\n');
          const codeLines = [];
          for (const line of lines) {
            if (line === '') {
              codeLines.push('    Frame h 8');
              continue;
            }
            const tks = tokenize(line);
            codeLines.push('    Frame hor, gap 0');
            for (const tk of tks) {
              // Replace ASCII space with NBSP so spans don't collapse
              // whitespace; escape double-quote and backslash for the
              // Mirror string literal.
              const safe = tk.t.replace(/\\\\/g, '\\\\\\\\').replace(/"/g, '\\\\"').replace(/ /g, '\\u00A0');
              codeLines.push('      Text "' + safe + '", col ' + tk.c + ', fs 11, font mono');
            }
          }

          // ----- locate Sidebar and replace whole block -----
          const src = e.state.doc.toString();
          const re = new RegExp('^([ \\\\t]*)Frame name Sidebar\\\\b[^\\\\n]*$', 'm');
          const m = src.match(re);
          if (!m) throw new Error('Sidebar line not found');
          const startPos = m.index;
          const baseIndent = m[1].length;
          const lineEnd = startPos + m[0].length;
          let cursor = lineEnd + 1;
          const after = src.slice(lineEnd + 1);
          for (const line of after.split('\\n')) {
            const li = line.match(/^[ \\t]*/)[0].length;
            if (line.trim() !== '' && li <= baseIndent) break;
            cursor += line.length + 1;
            if (cursor - 1 >= src.length) { cursor = src.length + 1; break; }
          }
          const endPos = Math.min(cursor - 1, src.length);

          const header = [
            '  Frame name Sidebar, bg #0d0d10, x 1, y 2, w 1, h 6, gap 0, pad 24 16, bor-r 1, boc #18181b',
            '    Frame pad-b 12, bor-b 1, boc #18181b',
            '      Text "app.mir", col #71717a, fs 12, font mono',
            '    Frame h 12',
          ];
          const newRegion = header.concat(codeLines).join('\\n');
          e.dispatch({ changes: { from: startPos, to: endPos, insert: newRegion } });
        })()
      `,
    },
    { action: 'wait', duration: 1000 },
    {
      action: 'expectDom',
      comment: 'Sidebar has filename header + spacer + ~22 code lines',
      checks: [
        // Just sanity-check that something landed; exact childCount
        // depends on number of blank lines & code lines so don't pin it.
        { selector: { byPath: 'Sidebar' }, tag: 'div' },
      ],
    },

    // ===================================================================
    // Phase 9: Content — eyebrow + H1 + lead + CTAs + 3 cards
    //          (HTML-aligned, typed)
    // ===================================================================
    // Two-step: execute rewrites just the region line; type lays in
    // the entire composition so the viewer sees the hero assemble
    // (eyebrow → H1 → lead → CTAs) and then the three feature cards
    // emerge one by one — same pattern repeated, immediately legible.
    { action: 'comment', text: 'Phase 9: Content — Hero + Feature-Cards' },
    {
      action: 'execute',
      comment: 'rewrite Content region line, place cursor at end',
      code: `
        (() => {
          const e = window.editor;
          if (!e) throw new Error('no editor');
          const src = e.state.doc.toString();
          const re = new RegExp('^([ \\\\t]*)Frame name Content\\\\b[^\\\\n]*$', 'm');
          const m = src.match(re);
          if (!m) throw new Error('Content line not found');
          const startPos = m.index;
          const baseIndent = m[1].length;
          const lineEnd = startPos + m[0].length;
          let cursor = lineEnd + 1;
          const after = src.slice(lineEnd + 1);
          for (const line of after.split('\\n')) {
            const li = line.match(/^[ \\t]*/)[0].length;
            if (line.trim() !== '' && li <= baseIndent) break;
            cursor += line.length + 1;
            if (cursor - 1 >= src.length) { cursor = src.length + 1; break; }
          }
          const endPos = Math.min(cursor - 1, src.length);
          const newLine = '  Frame name Content, bg #0a0a0a, x 2, y 2, w 3, h 6, gap 40, pad 64';
          e.dispatch({
            changes: { from: startPos, to: endPos, insert: newLine },
            selection: { anchor: startPos + newLine.length },
          });
          e.focus();
        })()
      `,
    },
    { action: 'wait', duration: 300 },
    {
      action: 'type',
      comment: 'hero block + 3 feature cards typed visibly',
      pauseAfter: { ' ': 0 },
      text:
        '\n    Frame' +
        '\n      Text "Mirror · Designsprache für AI", col #2271C1, fs 12, weight 600, uppercase' +
        '\n      Text "Mit AI UIs bauen — und in Kontrolle bleiben.", col white, fs 44, weight 600, line 1.1, mar-t 12' +
        '\n      Text "Mirror generiert echte Prototypen statt Mockups. AI schreibt den Code, du verfeinerst ihn — ohne Framework-Wissen, ohne Build-Tools.", col #a1a1aa, fs 17, line 1.6, mar-t 16' +
        '\n      Frame hor, gap 12, mar-t 24' +
        '\n        Button "Try the editor →", bg #2271C1, col white, pad 12 20, rad 8, fs 14, weight 500' +
        '\n        Button "Read the docs", bor 1, boc #27272a, col #d4d4d8, pad 12 20, rad 8, fs 14, weight 500' +
        '\n    Frame hor, gap 16' +
        '\n      Frame grow, gap 12, pad 24, bg #18181b, bor 1, boc #27272a, rad 10' +
        '\n        Frame w 36, h 36, bg #2271C12E, rad 8, center' +
        '\n          Icon "eye", ic #60a5fa, is 18' +
        '\n        Text "Lesbar", col white, fs 16, weight 600' +
        '\n        Text "Kurze, eindeutige Syntax: bg, pad, hor — nichts zu lernen, alles direkt erkennbar.", col #a1a1aa, fs 13, line 1.6' +
        '\n      Frame grow, gap 12, pad 24, bg #18181b, bor 1, boc #27272a, rad 10' +
        '\n        Frame w 36, h 36, bg #2271C12E, rad 8, center' +
        '\n          Icon "edit-3", ic #60a5fa, is 18' +
        '\n        Text "Veränderbar", col white, fs 16, weight 600' +
        '\n        Text "Designer passen AI-Output direkt im Code an — ohne Framework-Wissen, ohne Build-Tools.", col #a1a1aa, fs 13, line 1.6' +
        '\n      Frame grow, gap 12, pad 24, bg #18181b, bor 1, boc #27272a, rad 10' +
        '\n        Frame w 36, h 36, bg #2271C12E, rad 8, center' +
        '\n          Icon "zap", ic #60a5fa, is 18' +
        '\n        Text "Kompilierbar", col white, fs 16, weight 600' +
        '\n        Text "Echte Prototypen, nicht nur Mockups. Output: DOM, React, Vue, Svelte — derselbe Mirror-Source.", col #a1a1aa, fs 13, line 1.6',
    },
    { action: 'wait', duration: 600 },
    {
      action: 'expectDom',
      comment: 'Content has hero + cards row (2 direct children)',
      checks: [{ selector: { byPath: 'Content' }, childCount: 2 }],
    },

    // ===================================================================
    // Phase 10: Footer — 4 columns (HTML-aligned, typed)
    // ===================================================================
    // Two-step: execute rewrites just the region line; type lays in
    // the 4 columns. Brand+© | Produkt | Resources | Kontakt. Same
    // pattern repeats so the viewer learns it from the first column,
    // then sees it propagate.
    { action: 'comment', text: 'Phase 10: Footer — 4 Spalten' },
    {
      action: 'execute',
      comment: 'rewrite Footer region line, place cursor at end',
      code: `
        (() => {
          const e = window.editor;
          if (!e) throw new Error('no editor');
          const src = e.state.doc.toString();
          const re = new RegExp('^([ \\\\t]*)Frame name Footer\\\\b[^\\\\n]*$', 'm');
          const m = src.match(re);
          if (!m) throw new Error('Footer line not found');
          const startPos = m.index;
          const baseIndent = m[1].length;
          const lineEnd = startPos + m[0].length;
          let cursor = lineEnd + 1;
          const after = src.slice(lineEnd + 1);
          for (const line of after.split('\\n')) {
            const li = line.match(/^[ \\t]*/)[0].length;
            if (line.trim() !== '' && li <= baseIndent) break;
            cursor += line.length + 1;
            if (cursor - 1 >= src.length) { cursor = src.length + 1; break; }
          }
          const endPos = Math.min(cursor - 1, src.length);
          const newLine = '  Frame name Footer, bg #0a0a0a, x 1, y 8, w 4, h 1, hor, gap 48, pad 0 32, ver-center, bor-t 1, boc #18181b';
          e.dispatch({
            changes: { from: startPos, to: endPos, insert: newLine },
            selection: { anchor: startPos + newLine.length },
          });
          e.focus();
        })()
      `,
    },
    { action: 'wait', duration: 300 },
    {
      action: 'type',
      comment: '4 footer columns typed visibly',
      pauseAfter: { ' ': 0 },
      text:
        '\n    Frame gap 4, grow' +
        '\n      Text "Mirror", col white, fs 14, weight 600' +
        '\n      Text "© 2026 — Open Source", col #71717a, fs 12' +
        '\n    Frame gap 6, grow' +
        '\n      Text "Produkt", col #d4d4d8, fs 11, weight 600, uppercase' +
        '\n      Text "Editor · CLI · Studio", col #a1a1aa, fs 13' +
        '\n    Frame gap 6, grow' +
        '\n      Text "Resources", col #d4d4d8, fs 11, weight 600, uppercase' +
        '\n      Text "Docs · Examples · Changelog", col #a1a1aa, fs 13' +
        '\n    Frame gap 6, grow' +
        '\n      Text "Kontakt", col #d4d4d8, fs 11, weight 600, uppercase' +
        '\n      Text "GitHub · @mirror_lang", col #a1a1aa, fs 13',
    },
    { action: 'wait', duration: 500 },
    {
      action: 'expectDom',
      comment: 'Footer has 4 columns',
      checks: [{ selector: { byPath: 'Footer' }, childCount: 4 }],
    },
  ],
}
