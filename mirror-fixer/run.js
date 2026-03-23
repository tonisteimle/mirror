#!/usr/bin/env node

/**
 * Pipeline: Mensch → Agent 1 (Fixer) → Mirror → Agent 2 (Builder) → App
 */

import { spawnSync } from 'child_process';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Args
const args = process.argv.slice(2);
let outputDir = './output';
let inputText = '';

for (let i = 0; i < args.length; i++) {
  if (args[i] === '-o' || args[i] === '--output') {
    outputDir = args[++i];
  } else {
    inputText += (inputText ? ' ' : '') + args[i];
  }
}

if (!inputText) {
  console.error('Usage: node run.js "beschreibe deine app" [-o output-dir]');
  console.error('');
  console.error('Beispiel:');
  console.error('  node run.js "eine card mit titel, beschreibung und rotem löschen button"');
  process.exit(1);
}

console.log('═══════════════════════════════════════════════════════');
console.log('  MIRROR PIPELINE');
console.log('═══════════════════════════════════════════════════════');
console.log('');
console.log('Input:', inputText);
console.log('');

// ─────────────────────────────────────────────────────────────
// AGENT 1: Fixer - Natürliche Sprache → Mirror
// ─────────────────────────────────────────────────────────────
console.log('┌─────────────────────────────────────────────────────┐');
console.log('│  AGENT 1: Fixer                                    │');
console.log('│  Natürliche Sprache → Mirror Spec                  │');
console.log('└─────────────────────────────────────────────────────┘');
console.log('');

const fixResult = spawnSync('node', [
  join(__dirname, 'fix.js'),
  inputText
], {
  encoding: 'utf-8',
  maxBuffer: 10 * 1024 * 1024
});

if (fixResult.status !== 0) {
  console.error('Agent 1 fehlgeschlagen:', fixResult.stderr);
  process.exit(1);
}

// Mirror Code extrahieren (ohne Markdown Code Blocks)
let mirrorCode = fixResult.stdout.trim();
mirrorCode = mirrorCode.replace(/^```\w*\n?/gm, '').replace(/```$/gm, '').trim();

console.log('Mirror Spec:');
console.log('───────────────────────────────────────────────────────');
console.log(mirrorCode);
console.log('───────────────────────────────────────────────────────');
console.log('');

// Mirror Spec speichern
if (!existsSync(outputDir)) {
  mkdirSync(outputDir, { recursive: true });
}
const specPath = join(outputDir, 'spec.mirror');
writeFileSync(specPath, mirrorCode);
console.log(`Spec gespeichert: ${specPath}`);
console.log('');

// ─────────────────────────────────────────────────────────────
// AGENT 2: Builder - Mirror → App
// ─────────────────────────────────────────────────────────────
console.log('┌─────────────────────────────────────────────────────┐');
console.log('│  AGENT 2: Builder                                  │');
console.log('│  Mirror Spec → Implementierte App                  │');
console.log('└─────────────────────────────────────────────────────┘');
console.log('');

const buildResult = spawnSync('node', [
  join(__dirname, 'build.js'),
  specPath,
  '-o', outputDir
], {
  encoding: 'utf-8',
  maxBuffer: 10 * 1024 * 1024,
  stdio: ['pipe', 'pipe', 'pipe']
});

if (buildResult.status !== 0) {
  console.error('Agent 2 fehlgeschlagen:', buildResult.stderr);
  process.exit(1);
}

console.log(buildResult.stdout);
console.log('');
console.log('═══════════════════════════════════════════════════════');
console.log('  DONE');
console.log(`  App erstellt in: ${outputDir}`);
console.log('═══════════════════════════════════════════════════════');
