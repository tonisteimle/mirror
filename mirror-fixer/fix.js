#!/usr/bin/env node

import { spawnSync } from 'child_process';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// DSL Reference laden
const claudeMd = readFileSync(
  join(__dirname, '../CLAUDE.md'),
  'utf-8'
);

// Nur den DSL-Teil extrahieren (zwischen den Markern)
const dslMatch = claudeMd.match(/## DSL Kurzreferenz[\s\S]*?<!-- GENERATED:DSL-PROPERTIES:END -->/);
const dslReference = dslMatch ? dslMatch[0] : '';

const systemPrompt = `Du bist ein Mirror DSL Code-Fixer.

Der User schreibt "ungefähren" Mirror-Code - so wie er denkt dass es funktioniert.
Deine Aufgabe: Konvertiere es in korrekten, sauberen Mirror-Code.

Regeln:
- Gib NUR den korrigierten Code zurück, keine Erklärungen
- Behalte die Intention des Users bei
- Nutze die korrekten Property-Namen und Werte aus der DSL-Referenz
- Deutsche Begriffe → englische DSL Properties (z.B. "hintergrund" → "bg")
- Ungefähre Werte → korrekte Werte (z.B. "blau" → "#0000ff" oder "$blue")

${dslReference}`;

// User Input von Argumenten oder stdin
let userInput = process.argv.slice(2).join(' ');

if (!userInput) {
  try {
    userInput = readFileSync(0, 'utf-8').trim();
  } catch (e) {
    // stdin nicht verfügbar
  }
}

if (!userInput) {
  console.error('Usage: node fix.js "dein ungefährer mirror code"');
  console.error('  oder: echo "code" | node fix.js');
  process.exit(1);
}

const prompt = `Korrigiere diesen Mirror-Code:\n\n${userInput}`;

try {
  const result = spawnSync('claude', [
    '-p', prompt,
    '--append-system-prompt', systemPrompt,
    '--output-format', 'json'
  ], {
    encoding: 'utf-8',
    maxBuffer: 10 * 1024 * 1024
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    console.error(result.stderr);
    process.exit(result.status);
  }

  const json = JSON.parse(result.stdout);

  // Extrahiere den Text aus der JSON-Antwort
  if (json.result) {
    console.log(json.result);
  } else if (json.content) {
    const textBlock = json.content.find(b => b.type === 'text');
    console.log(textBlock?.text || result.stdout);
  } else {
    console.log(result.stdout);
  }
} catch (error) {
  console.error('Fehler:', error.message);
  process.exit(1);
}
