#!/usr/bin/env npx tsx
/**
 * Build Example Script
 *
 * Compiles a .mirror file to a standalone HTML file.
 * Usage: npx tsx scripts/build-example.ts examples/address-manager.mirror
 */

import * as fs from 'fs'
import * as path from 'path'
import { parse } from '../compiler/parser'
import { generateDOM } from '../compiler/backends/dom'
import { parseDataFile } from '../compiler/parser/data-parser'

function buildExample(mirrorPath: string): void {
  const baseName = path.basename(mirrorPath, '.mirror')
  const dir = path.dirname(mirrorPath)
  const outputPath = path.join(dir, `${baseName}-compiled.html`)

  console.log(`Building ${mirrorPath}...`)

  // Read mirror file
  const mirrorCode = fs.readFileSync(mirrorPath, 'utf-8')

  // Check for .data file with same name
  const dataPath = mirrorPath.replace('.mirror', '.data')
  const dataFiles = []
  if (fs.existsSync(dataPath)) {
    const dataContent = fs.readFileSync(dataPath, 'utf-8')
    dataFiles.push(parseDataFile(dataContent, baseName))
  }

  // Parse and generate
  const ast = parse(mirrorCode)
  if (ast.errors.length > 0) {
    console.error('Parse errors:', ast.errors.map(e => e.message).join(', '))
    process.exit(1)
  }

  const jsCode = generateDOM(ast, { dataFiles: dataFiles.length > 0 ? dataFiles : undefined })

  // Extract title from first Text element or use filename
  const titleMatch = mirrorCode.match(/Text\s+"([^"]+)"/)
  const title = titleMatch ? titleMatch[1] : baseName

  // Generate HTML wrapper
  const html = `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - Mirror</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="../assets/mirror-defaults.css">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      background: #f8fafc;
      min-height: 100vh;
    }
    #app { width: 100%; min-height: 100vh; }
  </style>
</head>
<body>
  <div id="app">
    <div class="loading">Loading...</div>
  </div>
  <script type="module">
${jsCode}

// Execute
;(function() {
  try {
    const ui = createUI();
    const root = ui instanceof HTMLElement ? ui : ui?.root;
    if (root) {
      document.getElementById('app').innerHTML = '';
      document.getElementById('app').appendChild(root);
    }
  } catch (e) {
    document.getElementById('app').innerHTML = '<pre style="color:red;padding:20px;">' + e.message + '</pre>';
    console.error(e);
  }
})();
  </script>
</body>
</html>`

  fs.writeFileSync(outputPath, html, 'utf-8')
  console.log(`Generated ${outputPath}`)
}

// Main
const args = process.argv.slice(2)
if (args.length === 0) {
  console.log('Usage: npx tsx scripts/build-example.ts <file.mirror>')
  process.exit(1)
}

for (const arg of args) {
  buildExample(arg)
}
