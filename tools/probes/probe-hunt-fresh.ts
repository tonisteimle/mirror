// Fresh hunt: scan all example outputs for common issues across React/Framework/DOM
import { readFileSync, readdirSync, statSync } from 'fs'
import { join } from 'path'
import { parse } from '../../compiler/parser'
import { generateReact } from '../../compiler/backends/react'
import { generateFramework } from '../../compiler/backends/framework'
import { generateDOM } from '../../compiler/backends/dom'

function findMirrorFiles(dir: string): string[] {
  const out: string[] = []
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    const s = statSync(full)
    if (s.isDirectory()) out.push(...findMirrorFiles(full))
    else if (full.endsWith('.mirror') || full.endsWith('.mir')) out.push(full)
  }
  return out
}

const files = findMirrorFiles('examples').sort()

const badPatterns: { name: string; re: RegExp; backends: ('react' | 'fw' | 'dom')[] }[] = [
  { name: 'literal undefined string', re: /:\s*undefined/g, backends: ['react'] },
  { name: '[object Object]', re: /\[object Object\]/g, backends: ['react', 'fw', 'dom'] },
  {
    name: 'literal $token leak',
    re: /['"`]\$[a-zA-Z_][\w.-]*['"`]/g,
    backends: ['react', 'fw', 'dom'],
  },
  { name: 'undefined as JSX value', re: /=\{undefined\}/g, backends: ['react'] },
  { name: 'NaN in style', re: /:\s*['"]?NaN/g, backends: ['react'] },
  { name: 'double-comma artifact', re: /,\s*,/g, backends: ['fw'] },
  { name: 'unresolved tokens["..."]', re: /tokens\["\$[^"]+"\]/g, backends: ['react'] },
  // Style values that didn't unit-normalize:
  { name: 'pixel-as-string-no-unit', re: /:\s*'\d+'(?=,|\s*\})/g, backends: ['react'] },
]

let issuesFound = 0
for (const file of files) {
  const src = readFileSync(file, 'utf8')
  let ast
  try {
    ast = parse(src)
  } catch (e) {
    console.log(`[parse fail] ${file}: ${(e as Error).message}`)
    continue
  }

  let react = '',
    fw = '',
    dom = ''
  try {
    react = generateReact(ast)
  } catch (e) {
    console.log(`[react throw] ${file}: ${(e as Error).message}`)
  }
  try {
    fw = generateFramework(ast)
  } catch (e) {
    console.log(`[fw throw] ${file}: ${(e as Error).message}`)
  }
  try {
    dom = generateDOM(ast)
  } catch (e) {
    console.log(`[dom throw] ${file}: ${(e as Error).message}`)
  }

  for (const p of badPatterns) {
    for (const backend of p.backends) {
      const out = backend === 'react' ? react : backend === 'fw' ? fw : dom
      const matches = out.match(p.re)
      if (matches && matches.length) {
        // Filter out tokens["color.name"] type things that aren't `$` prefixed
        const real = matches.filter(
          m => !m.startsWith('tokens["color.') && !m.startsWith('tokens["space.')
        )
        if (real.length === 0) continue
        console.log(`[${backend}] ${file}: ${p.name} ×${real.length}`)
        console.log('  examples:', real.slice(0, 3))
        issuesFound += real.length
      }
    }
  }
}

console.log('\n===', issuesFound, 'issues across', files.length, 'example files')
