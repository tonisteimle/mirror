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

// Nur den DSL-Teil extrahieren
const dslMatch = claudeMd.match(/## DSL Kurzreferenz[\s\S]*?<!-- GENERATED:DSL-PROPERTIES:END -->/);
const dslReference = dslMatch ? dslMatch[0] : '';

// Pfad zur Komponentenbibliothek
const componentsPath = join(__dirname, '../examples/starter/_components.mirror');

const systemPrompt = `Du bist ein Mirror DSL Code-Generator.

Der User beschreibt was er bauen will - in natürlicher Sprache oder ungefährem Code.
Deine Aufgabe: Generiere korrekten, sauberen Mirror-Code.

WICHTIG - Zwei-Stufen-Prozess:
1. RECHERCHE: Lies zuerst die Komponentenbibliothek um zu sehen welche fertigen Komponenten existieren
2. GENERIERUNG: Nutze existierende Komponenten wenn passend, oder baue mit Primitives

Komponentenbibliothek: ${componentsPath}

Regeln:
- Gib NUR den Mirror-Code zurück, keine Erklärungen
- Bevorzuge existierende Komponenten aus der Library (z.B. DangerButton statt Button bg red)
- Deutsche Begriffe → englische DSL Properties
- Halte den Code minimal und sauber

${dslReference}`;

// User Input
let userInput = process.argv.slice(2).join(' ');

if (!userInput) {
  try {
    userInput = readFileSync(0, 'utf-8').trim();
  } catch (e) {
    // stdin nicht verfügbar
  }
}

if (!userInput) {
  console.error('Usage: node fix.js "beschreibe was du bauen willst"');
  console.error('Beispiel: node fix.js "roter löschen button"');
  process.exit(1);
}

const prompt = `Generiere Mirror-Code für:\n\n${userInput}`;

try {
  const result = spawnSync('claude', [
    '-p', prompt,
    '--append-system-prompt', systemPrompt,
    '--allowedTools', 'Read,Glob',
    '--max-turns', '3',
    '--output-format', 'json'
  ], {
    encoding: 'utf-8',
    maxBuffer: 10 * 1024 * 1024,
    cwd: join(__dirname, '..')  // Working directory = Mirror root
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
