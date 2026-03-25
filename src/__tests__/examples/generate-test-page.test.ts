/**
 * Generate Compiler Test Page
 *
 * Dieser Test generiert eine HTML-Seite die alle Beispiele
 * visuell darstellt: Links Mirror Code, rechts Live-Preview.
 *
 * Ausführen: npm test -- generate-test-page
 * Output: test/compiler-test.html
 */

import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import { SELECT_EXAMPLES, Section } from './select-examples'

const OUTPUT_PATH = path.resolve(__dirname, '../../../test/compiler-test.html')

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function escapeJs(str: string): string {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/`/g, '\\`')
    .replace(/\$/g, '\\$')
}

function generateHtml(sections: Section[]): string {
  // Generate sections data as JavaScript
  const sectionsJs = sections.map(section => {
    const examples = section.examples.map(ex => `\`${escapeJs(ex.code)}\``).join(',\n        ')
    return `      "${escapeJs(section.name)}": [
        ${examples}
      ]`
  }).join(',\n')

  return `<!DOCTYPE html>
<html>
<head>
  <title>Mirror Compiler Test</title>
  <link rel="stylesheet" href="../assets/mirror-defaults.css">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: system-ui, -apple-system, sans-serif;
      background: #0a0a0a;
      color: #e0e0e0;
      padding: 20px;
    }

    h1 {
      font-size: 16px;
      font-weight: 600;
      margin-bottom: 16px;
      color: #666;
    }

    h2 {
      font-size: 13px;
      font-weight: 600;
      margin: 24px 0 12px;
      color: #444;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .examples {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .example {
      display: grid;
      grid-template-columns: 1fr 280px;
      gap: 24px;
      padding: 12px 16px;
      background: #111;
      border-radius: 4px;
      align-items: center;
    }

    .example-code {
      font-family: 'Menlo', 'Consolas', 'Monaco', monospace;
      font-size: 11px;
      line-height: 1.4;
      color: #777;
      white-space: pre;
      overflow-x: auto;
    }

    .example-preview {
      display: flex;
      align-items: center;
      justify-content: flex-end;
    }

    .error {
      color: #f55;
      font-size: 11px;
    }

    .stats {
      position: fixed;
      top: 10px;
      right: 20px;
      font-size: 11px;
      color: #444;
    }
  </style>
</head>
<body>
  <h1>Mirror Compiler Test</h1>
  <div class="stats" id="stats"></div>
  <div class="examples" id="examples"></div>

  <script src="../dist/browser/index.global.js"></script>
  <script>
    const sections = {
${sectionsJs}
    };

    const { compile } = MirrorLang;
    const container = document.getElementById('examples');
    let total = 0;
    let success = 0;
    let failed = 0;

    Object.entries(sections).forEach(([sectionName, examples]) => {
      const heading = document.createElement('h2');
      heading.textContent = sectionName;
      container.appendChild(heading);

      examples.forEach(code => {
        total++;
        const row = document.createElement('div');
        row.className = 'example';

        const codeDiv = document.createElement('div');
        codeDiv.className = 'example-code';
        codeDiv.textContent = code;

        const previewDiv = document.createElement('div');
        previewDiv.className = 'example-preview';

        try {
          const jsCode = compile(code);
          const execCode = jsCode.replace('export function createUI', 'function createUI');
          const fn = new Function(execCode + '\\nreturn createUI();');
          const ui = fn();
          if (ui && ui.root) {
            previewDiv.appendChild(ui.root);
          }
          success++;
        } catch (err) {
          previewDiv.innerHTML = \`<span class="error">\${err.message}</span>\`;
          failed++;
        }

        row.appendChild(codeDiv);
        row.appendChild(previewDiv);
        container.appendChild(row);
      });
    });

    // Update stats
    document.getElementById('stats').textContent =
      \`\${success}/\${total} passed\` + (failed > 0 ? \` (\${failed} failed)\` : '');
  </script>
</body>
</html>
`
}

describe('Generate Compiler Test Page', () => {
  it('generates test/compiler-test.html', () => {
    const html = generateHtml(SELECT_EXAMPLES)

    // Ensure test directory exists
    const testDir = path.dirname(OUTPUT_PATH)
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true })
    }

    fs.writeFileSync(OUTPUT_PATH, html, 'utf-8')

    expect(fs.existsSync(OUTPUT_PATH)).toBe(true)

    // Verify content
    const content = fs.readFileSync(OUTPUT_PATH, 'utf-8')
    expect(content).toContain('Mirror Compiler Test')
    expect(content).toContain('BASIC PROPERTIES')
    expect(content).toContain('MirrorLang')

    console.log(`✅ Generated: ${OUTPUT_PATH}`)
    console.log(`   Sections: ${SELECT_EXAMPLES.length}`)
    console.log(`   Examples: ${SELECT_EXAMPLES.reduce((sum, s) => sum + s.examples.length, 0)}`)
  })

  it('counts examples correctly', () => {
    const totalExamples = SELECT_EXAMPLES.reduce((sum, s) => sum + s.examples.length, 0)
    expect(totalExamples).toBeGreaterThan(20)
  })
})
