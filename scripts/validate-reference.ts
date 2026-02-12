/**
 * Validiert alle Code-Beispiele aus docs/reference.html gegen den Parser
 */

import { readFileSync } from 'fs';
import { parse } from '../src/parser/parser';

// HTML-Datei lesen
const html = readFileSync('./docs/reference.html', 'utf-8');

// Alle <pre>...</pre> Blöcke extrahieren
const preBlocks = html.match(/<pre[^>]*>[\s\S]*?<\/pre>/g) || [];

interface ValidationResult {
  blockIndex: number;
  code: string;
  success: boolean;
  errors: string[];
  section: string;
}

const results: ValidationResult[] = [];

// Funktion zum Entfernen von HTML-Tags und Dekodieren von Entitäten
function cleanHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, '') // HTML-Tags entfernen
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

// Sektion finden basierend auf Position im HTML
function findSection(html: string, blockHtml: string): string {
  const pos = html.indexOf(blockHtml);
  const before = html.substring(0, pos);
  const h2Matches = before.match(/<h2[^>]*>([^<]+)<\/h2>/g);
  const h3Matches = before.match(/<h3[^>]*>([^<]+)<\/h3>/g);

  const h2 = h2Matches ? cleanHtml(h2Matches[h2Matches.length - 1]) : '';
  const h3 = h3Matches ? cleanHtml(h3Matches[h3Matches.length - 1]) : '';

  return h3 ? `${h2} > ${h3}` : h2;
}

console.log(`\n=== Validiere ${preBlocks.length} Code-Blöcke aus reference.html ===\n`);

preBlocks.forEach((block, index) => {
  const code = cleanHtml(block);
  const section = findSection(html, block);

  // Skip empty blocks or pure quick-ref blocks
  if (!code.trim() || code.includes('LAYOUT') && code.includes('ALIGN')) {
    return;
  }

  try {
    const result = parse(code);

    if (result.errors && result.errors.length > 0) {
      results.push({
        blockIndex: index + 1,
        code: code.trim(),
        success: false,
        errors: result.errors.map(e =>
          typeof e === 'string' ? e : `${e.message} (Zeile ${e.line || '?'})`
        ),
        section
      });
    } else {
      results.push({
        blockIndex: index + 1,
        code: code.trim(),
        success: true,
        errors: [],
        section
      });
    }
  } catch (e) {
    results.push({
      blockIndex: index + 1,
      code: code.trim(),
      success: false,
      errors: [(e as Error).message],
      section
    });
  }
});

// Ergebnisse ausgeben
const failures = results.filter(r => !r.success);
const successes = results.filter(r => r.success);

console.log(`✓ ${successes.length} Blöcke erfolgreich geparst`);
console.log(`✗ ${failures.length} Blöcke mit Fehlern\n`);

if (failures.length > 0) {
  console.log('=== ABWEICHUNGEN ===\n');

  failures.forEach((f, i) => {
    console.log(`--- Block #${f.blockIndex} (${f.section}) ---`);
    console.log('Code:');
    console.log(f.code.split('\n').map(l => '  ' + l).join('\n'));
    console.log('\nFehler:');
    f.errors.forEach(e => console.log('  • ' + e));
    console.log('');
  });
}
