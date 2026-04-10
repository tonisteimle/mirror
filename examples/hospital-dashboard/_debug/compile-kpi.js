// Simple script to compile kpi-card.mirror to HTML
import { readFileSync, writeFileSync } from 'fs'
import { parse } from '../../compiler/parser/parser.js'
import { generateDOM } from '../../compiler/backends/dom.js'

const code = readFileSync('./kpi-card.mirror', 'utf-8')
const ast = parse(code)
const jsOutput = generateDOM(ast)

const html = `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>KPI Card - Mirror</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Inter', -apple-system, sans-serif;
      background: #0a0a0f;
      padding: 24px;
    }
  </style>
</head>
<body>
  <div id="app"></div>
  <script type="module">
${jsOutput}

const container = document.getElementById('app');
const { root } = createUI();
container.appendChild(root);
  </script>
</body>
</html>`

writeFileSync('./kpi-card-mirror.html', html)
console.log('Compiled to kpi-card-mirror.html')
