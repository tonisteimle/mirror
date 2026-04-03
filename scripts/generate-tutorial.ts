#!/usr/bin/env npx tsx
/**
 * Tutorial Generator
 * Converts Markdown files in docs/tutorial/src/ to HTML pages
 */

import * as fs from 'fs';
import * as path from 'path';

// Simple frontmatter parser
function parseFrontmatter(content: string): { data: Record<string, string>; content: string } {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) {
    return { data: {}, content };
  }

  const data: Record<string, string> = {};
  const lines = match[1].split('\n');
  for (const line of lines) {
    const colonIndex = line.indexOf(':');
    if (colonIndex > 0) {
      const key = line.slice(0, colonIndex).trim();
      const value = line.slice(colonIndex + 1).trim();
      data[key] = value;
    }
  }

  return { data, content: match[2] };
}

// Escape HTML entities
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// Convert Markdown to HTML
function markdownToHtml(markdown: string): { html: string; hasPlaygrounds: boolean } {
  let hasPlaygrounds = false;
  const lines = markdown.split('\n');
  const result: string[] = [];
  let i = 0;
  let inSection = false;
  let inList: false | 'ul' | 'ol' = false;
  let firstParagraph = true;
  let afterSummaryDivider = false;

  const closeSection = () => {
    if (inSection) {
      result.push('    </section>\n');
      inSection = false;
    }
  };

  const closeList = () => {
    if (inList) {
      result.push(inList === 'ul' ? '      </ul>' : '      </ol>');
      inList = false;
    }
  };

  while (i < lines.length) {
    const line = lines[i];

    // Code block (```mirror or ```)
    if (line.startsWith('```')) {
      closeList();
      const lang = line.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      const code = codeLines.join('\n');

      if (lang === 'mirror') {
        hasPlaygrounds = true;
        result.push(`      <div class="playground" data-playground>`);
        result.push(`        <div class="playground-code">`);
        result.push(`          <textarea>${escapeHtml(code)}</textarea>`);
        result.push(`        </div>`);
        result.push(`        <div class="playground-preview"></div>`);
        result.push(`      </div>\n`);
      } else if (lang === 'mirror-static') {
        // Code block without playground (static display)
        result.push(`      <div class="code-block">`);
        result.push(`        <pre>${highlightMirrorCode(code)}</pre>`);
        result.push(`      </div>\n`);
      } else if (lang === 'javascript' || lang === 'js') {
        result.push(`      <div class="code-block">`);
        result.push(`        <pre>${highlightJsCode(code)}</pre>`);
        result.push(`      </div>\n`);
      } else {
        // Generic code block
        result.push(`      <div class="code-block">`);
        result.push(`        <pre>${escapeHtml(code)}</pre>`);
        result.push(`      </div>\n`);
      }
      i++;
      continue;
    }

    // Playground with data-code attribute: ```mirror-data
    if (line.startsWith('```mirror-data')) {
      closeList();
      hasPlaygrounds = true;
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      const code = codeLines.join('\n');
      // Encode for data-code attribute
      const encoded = code.replace(/"/g, '&quot;');
      result.push(`      <div class="playground" data-code="${encoded}"></div>\n`);
      i++;
      continue;
    }

    // H2 heading starts a new section
    if (line.startsWith('## ')) {
      closeList();
      closeSection();
      firstParagraph = false;

      if (afterSummaryDivider) {
        // This is the summary section
        result.push(`    <div class="summary">`);
        result.push(`      <h2>${processInlineMarkdown(line.slice(3))}</h2>`);
        inSection = false; // Mark that we're in summary div, not section
        afterSummaryDivider = false;
        // Special handling: summary section ends at nav
      } else {
        result.push('\n    <!-- ============================================================ -->');
        result.push('    <section>');
        result.push(`      <h2>${processInlineMarkdown(line.slice(3))}</h2>`);
        inSection = true;
      }
      i++;
      continue;
    }

    // H3 heading
    if (line.startsWith('### ')) {
      closeList();
      result.push(`      <h3>${processInlineMarkdown(line.slice(4))}</h3>`);
      i++;
      continue;
    }

    // Horizontal rule (---) marks summary section
    if (line.trim() === '---') {
      closeList();
      closeSection();
      afterSummaryDivider = true;
      i++;
      continue;
    }

    // Table
    if (line.startsWith('|')) {
      closeList();
      const tableLines: string[] = [line];
      i++;
      while (i < lines.length && lines[i].startsWith('|')) {
        tableLines.push(lines[i]);
        i++;
      }
      result.push(parseTable(tableLines));
      continue;
    }

    // Blockquote (Note)
    if (line.startsWith('> ')) {
      closeList();
      let noteContent = line.slice(2);
      i++;
      while (i < lines.length && lines[i].startsWith('> ')) {
        noteContent += ' ' + lines[i].slice(2);
        i++;
      }

      // Check if it's a Note: format
      const noteMatch = noteContent.match(/^\*\*Note:\*\*\s*(.*)$/);
      if (noteMatch) {
        result.push(`      <p class="note">${processInlineMarkdown(noteMatch[1])}</p>\n`);
      } else {
        // Check for div.note format
        const divNoteMatch = noteContent.match(/^\*\*(.+?)\*\*$/);
        if (divNoteMatch) {
          result.push(`      <div class="note">${processInlineMarkdown(divNoteMatch[1])}</div>\n`);
        } else {
          result.push(`      <p class="note">${processInlineMarkdown(noteContent)}</p>\n`);
        }
      }
      continue;
    }

    // Unordered list
    if (line.match(/^- /)) {
      if (inList !== 'ul') {
        closeList();
        result.push('      <ul style="margin: 12px 0; padding-left: 24px; color: var(--text);">');
        inList = 'ul';
      }
      const content = line.slice(2);
      result.push(`        <li>${processInlineMarkdown(content)}</li>`);
      i++;
      continue;
    }

    // Ordered list (1. 2. 3. etc.)
    const orderedMatch = line.match(/^(\d+)\. (.*)$/);
    if (orderedMatch) {
      if (inList !== 'ol') {
        closeList();
        result.push('      <ol style="margin: 12px 0; padding-left: 24px; color: var(--text);">');
        inList = 'ol';
      }
      const content = orderedMatch[2];
      result.push(`        <li>${processInlineMarkdown(content)}</li>`);
      i++;
      continue;
    }

    // Empty line
    if (line.trim() === '') {
      closeList();
      i++;
      continue;
    }

    // Regular paragraph
    closeList();
    let paragraphLines = [line];
    i++;
    while (i < lines.length && lines[i].trim() !== '' && !lines[i].startsWith('#') && !lines[i].startsWith('|') && !lines[i].startsWith('```') && !lines[i].startsWith('> ') && !lines[i].startsWith('- ') && !lines[i].match(/^\d+\. /) && lines[i].trim() !== '---') {
      paragraphLines.push(lines[i]);
      i++;
    }
    const paragraphContent = paragraphLines.join(' ');

    if (firstParagraph && !inSection) {
      result.push(`    <p class="intro">${processInlineMarkdown(paragraphContent)}</p>\n`);
      firstParagraph = false;
    } else {
      result.push(`      <p>${processInlineMarkdown(paragraphContent)}</p>`);
    }
  }

  closeList();

  // Close summary div if we were in it
  if (afterSummaryDivider === false && result.some(r => r.includes('<div class="summary">'))) {
    // Find if we need to close the summary div
    const summaryIndex = result.findIndex(r => r.includes('<div class="summary">'));
    if (summaryIndex >= 0) {
      result.push('    </div>\n');
    }
  } else {
    closeSection();
  }

  return { html: result.join('\n'), hasPlaygrounds };
}

// Process inline markdown (bold, italic, code, links)
function processInlineMarkdown(text: string): string {
  // Code
  text = text.replace(/`([^`]+)`/g, '<code>$1</code>');
  // Bold
  text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  // Italic
  text = text.replace(/_(.+?)_/g, '<em>$1</em>');
  text = text.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  // Links
  text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, linkText, url) => {
    if (url.startsWith('http')) {
      return `<a href="${url}" target="_blank">${linkText}</a>`;
    }
    return `<a href="${url}">${linkText}</a>`;
  });
  return text;
}

// Parse markdown table to HTML
function parseTable(lines: string[]): string {
  const rows: string[][] = [];
  let hasHeader = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Skip separator line (|---|---|)
    if (line.match(/^\|[\s-:|]+\|$/)) {
      hasHeader = true;
      continue;
    }

    const cells = line.split('|').slice(1, -1).map(c => c.trim());
    rows.push(cells);
  }

  let html = '      <table class="ref-table">\n';

  rows.forEach((row, rowIndex) => {
    html += '        <tr>';
    row.forEach((cell, cellIndex) => {
      const tag = (hasHeader && rowIndex === 0) ? 'th' : 'td';
      html += `<${tag}>${processInlineMarkdown(cell)}</${tag}>`;
    });
    html += '</tr>\n';
  });

  html += '      </table>\n';
  return html;
}

// Syntax highlighting for Mirror code
function highlightMirrorCode(code: string): string {
  let html = escapeHtml(code);
  // Comments
  html = html.replace(/(\/\/.*)/g, '<span class="syn-comment">$1</span>');
  // Strings
  html = html.replace(/(".*?")/g, '<span class="syn-string">$1</span>');
  // Keywords (events and states)
  html = html.replace(/\b(onclick|onhover|onfocus|onblur|onchange|oninput|onkeydown|onkeyup|hover|focus|active|disabled):/g, '<span class="syn-keyword">$1:</span>');
  // Components (capitalized words at start of line or after whitespace)
  html = html.replace(/^(\s*)([A-Z][a-zA-Z0-9]*)/gm, '$1<span class="syn-component">$2</span>');
  // Properties
  html = html.replace(/\b(bg|col|pad|margin|w|h|gap|rad|fs|weight|center|hor|ver|spread|wrap|hidden|visible|name|placeholder|cursor)\b/g, '<span class="syn-property">$1</span>');
  return html;
}

// Syntax highlighting for JavaScript
function highlightJsCode(code: string): string {
  let html = escapeHtml(code);
  // Comments
  html = html.replace(/(\/\/.*)/g, '<span class="syn-comment">$1</span>');
  // Strings
  html = html.replace(/('.*?'|".*?")/g, '<span class="syn-string">$1</span>');
  // Keywords
  html = html.replace(/\b(const|let|var|function|async|await|return|if|else|for|while|import|export|from|default)\b/g, '<span class="syn-keyword">$1</span>');
  return html;
}

// Generate HTML page from markdown
function generatePage(mdPath: string, outputPath: string): void {
  const mdContent = fs.readFileSync(mdPath, 'utf-8');
  const { data: frontmatter, content } = parseFrontmatter(mdContent);

  const title = frontmatter.title || 'Untitled';
  const subtitle = frontmatter.subtitle || '';
  const prev = frontmatter.prev || '';
  const next = frontmatter.next || '';

  const { html: bodyHtml, hasPlaygrounds } = markdownToHtml(content.trim());

  // Build nav
  let navHtml = '    <nav>\n';
  if (prev) {
    const prevTitle = getPrevTitle(prev);
    navHtml += `      <a class="prev" href="${prev}.html">&larr; ${prevTitle}</a>\n`;
  } else {
    navHtml += '      <span class="prev"></span>\n';
  }
  navHtml += '      <a class="index" href="index.html">Übersicht</a>\n';
  if (next) {
    const nextTitle = getNextTitle(next);
    navHtml += `      <a class="next" href="${next}.html">${nextTitle} &rarr;</a>\n`;
  } else {
    navHtml += '      <span class="next"></span>\n';
  }
  navHtml += '    </nav>';

  // Build scripts
  let scriptsHtml = '';
  if (hasPlaygrounds) {
    scriptsHtml = `
  <script src="../../../dist/browser/index.global.js"></script>
  <script src="tutorial.js"></script>`;
  }

  const html = `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Mirror – ${title}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="../../../assets/mirror-defaults.css">
  <link rel="stylesheet" href="tutorial.css">
</head>
<body>

  <main class="page">

    <header>
      <h1>${title}</h1>
${subtitle ? `      <p class="subtitle">${subtitle}</p>\n` : ''}    </header>

${bodyHtml}

${navHtml}

  </main>
${scriptsHtml}
</body>
</html>
`;

  fs.writeFileSync(outputPath, html);
  console.log(`Generated: ${path.basename(outputPath)}`);
}

// Get title for prev/next links from filename
function getPrevTitle(filename: string): string {
  const titles: Record<string, string> = {
    '00-intro': 'Intro',
    '01-elemente': 'Elemente',
    '02-komponenten': 'Komponenten',
    '03-tokens': 'Tokens',
    '04-layout': 'Layout',
    '05-styling': 'Styling',
    '06-states': 'States',
    '07-functions': 'Functions',
    '08-navigation': 'Navigation',
    '09-overlays': 'Overlays',
    '10-variablen': 'Variablen',
    '11-content': 'Content',
    '12-abfragen': 'Abfragen',
    '13-methoden': 'Methoden',
    '14-tables': 'Tabellen',
    '15-crud': 'CRUD',
    '16-forms': 'Formulare',
    '17-bedingungen': 'Bedingungen',
    '19-fehler': 'Fehler'
  };
  return titles[filename] || filename;
}

function getNextTitle(filename: string): string {
  const titles: Record<string, string> = {
    '00-intro': 'Intro',
    '01-elemente': 'Elemente',
    '02-komponenten': 'Komponenten',
    '03-tokens': 'Tokens',
    '04-layout': 'Layout',
    '05-styling': 'Styling',
    '06-states': 'States',
    '07-functions': 'Functions',
    '08-navigation': 'Navigation',
    '09-overlays': 'Overlays',
    '10-variablen': 'Variablen',
    '11-content': 'Content',
    '12-abfragen': 'Abfragen',
    '13-methoden': 'Methoden',
    '14-tables': 'Tabellen',
    '15-crud': 'CRUD',
    '16-forms': 'Formulare',
    '17-bedingungen': 'Bedingungen',
    '19-fehler': 'Fehler',
    'playground': 'Playground'
  };
  return titles[filename] || filename;
}

// Main
function main() {
  const srcDir = path.join(process.cwd(), 'docs/tutorial');
  const outDir = path.join(process.cwd(), 'docs/tutorial/html');

  if (!fs.existsSync(srcDir)) {
    console.error(`Source directory not found: ${srcDir}`);
    return;
  }

  // Create output directory if needed
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const files = fs.readdirSync(srcDir).filter(f => f.endsWith('.md'));

  if (files.length === 0) {
    console.log('No .md files found in docs/tutorial/src/');
    return;
  }

  console.log(`\nGenerating ${files.length} tutorial pages...\n`);

  for (const file of files) {
    const mdPath = path.join(srcDir, file);
    const htmlFile = file.replace('.md', '.html');
    const outPath = path.join(outDir, htmlFile);
    generatePage(mdPath, outPath);
  }

  console.log('\nDone!');
}

main();
