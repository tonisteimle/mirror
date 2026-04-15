const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const stats = {
  total: 0,
  clean: 0,
  notClean: 0,
  bySize: {},
  violations: [],
  byDir: {}
};

function countLines(node, sourceFile) {
  const start = sourceFile.getLineAndCharacterOfPosition(node.getStart());
  const end = sourceFile.getLineAndCharacterOfPosition(node.getEnd());
  return end.line - start.line + 1;
}

function getFunctionName(node) {
  if (node.name) return node.name.getText();
  if (ts.isVariableDeclaration(node.parent)) return node.parent.name.getText();
  if (ts.isPropertyAssignment(node.parent)) return node.parent.name.getText();
  return '<anonymous>';
}

function analyzeFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const sourceFile = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true);
  const relPath = path.relative(process.cwd(), filePath);
  const dir = relPath.split('/').slice(0, 2).join('/');

  if (!stats.byDir[dir]) {
    stats.byDir[dir] = { total: 0, clean: 0 };
  }

  function visit(node) {
    if (ts.isFunctionDeclaration(node) ||
        ts.isMethodDeclaration(node) ||
        ts.isFunctionExpression(node) ||
        ts.isArrowFunction(node)) {

      if (ts.isArrowFunction(node) && !node.body.statements) {
        return;
      }

      const lines = countLines(node, sourceFile);
      const name = getFunctionName(node);
      const lineNum = sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1;

      stats.total++;
      stats.byDir[dir].total++;

      if (lines <= 15) {
        stats.clean++;
        stats.byDir[dir].clean++;
      } else {
        stats.notClean++;
        stats.violations.push({
          file: relPath,
          name,
          lines,
          line: lineNum
        });
      }

      const bucket = lines <= 5 ? '1-5' :
                     lines <= 10 ? '6-10' :
                     lines <= 15 ? '11-15' :
                     lines <= 25 ? '16-25' :
                     lines <= 50 ? '26-50' : '51+';
      stats.bySize[bucket] = (stats.bySize[bucket] || 0) + 1;
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
}

function walkDir(dir, callback) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!['node_modules', 'dist', '.git', 'coverage'].includes(entry.name)) {
        walkDir(fullPath, callback);
      }
    } else if (entry.isFile() && /\.(ts|tsx)$/.test(entry.name) && !entry.name.endsWith('.d.ts')) {
      callback(fullPath);
    }
  }
}

['compiler', 'studio'].forEach(dir => {
  const fullDir = path.join(process.cwd(), dir);
  if (fs.existsSync(fullDir)) {
    walkDir(fullDir, analyzeFile);
  }
});

const cleanPercent = ((stats.clean / stats.total) * 100).toFixed(1);

console.log('');
console.log('========================================================');
console.log('           CLEAN CODE ANALYSE - MIRROR');
console.log('========================================================');
console.log('');
console.log('Gesamt Funktionen:     ' + stats.total);
console.log('Clean (<=15 Zeilen):   ' + stats.clean + ' (' + cleanPercent + '%)');
console.log('Zu ueberarbeiten:      ' + stats.notClean + ' (' + (100 - cleanPercent).toFixed(1) + '%)');
console.log('');

// Write full list to file
fs.writeFileSync('/tmp/all-violations.json', JSON.stringify({
  summary: {
    total: stats.total,
    clean: stats.clean,
    notClean: stats.notClean,
    percent: cleanPercent
  },
  byDir: stats.byDir,
  violations: stats.violations.sort((a, b) => b.lines - a.lines)
}, null, 2));
