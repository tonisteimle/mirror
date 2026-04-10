/**
 * Zuverlässiger Komponenten-Vergleich: HTML vs Mirror
 * Vergleicht computed CSS styles statt Screenshots
 */
import { chromium } from 'playwright';

const PROPS = [
  'display', 'flexDirection', 'alignItems', 'justifyContent', 'gap',
  'width', 'height', 'padding', 'margin', 'borderRadius',
  'backgroundColor', 'color', 'fontSize', 'fontWeight',
];

async function compareComponent(name, htmlUrl, mirrorUrl, htmlSelector, mirrorSelector) {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  // HTML
  await page.goto(htmlUrl);
  await page.waitForTimeout(2000);
  const htmlStyles = await page.evaluate(({ sel, props }) => {
    const el = typeof sel === 'string'
      ? document.querySelector(sel)
      : document.evaluate(sel, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE).singleNodeValue;
    if (!el) return null;
    const s = getComputedStyle(el);
    const result = {};
    props.forEach(p => result[p] = s[p]);
    return result;
  }, { sel: htmlSelector, props: PROPS });

  // Mirror
  await page.goto(mirrorUrl);
  await page.waitForTimeout(2000);
  const mirrorStyles = await page.evaluate(({ sel, props }) => {
    // Finde Element mit matching styles (da Mirror keine Klassen hat)
    if (sel.startsWith('find:')) {
      const criteria = JSON.parse(sel.slice(5));
      for (const el of document.querySelectorAll('*')) {
        const s = getComputedStyle(el);
        let match = true;
        for (const [k, v] of Object.entries(criteria)) {
          if (s[k] !== v) { match = false; break; }
        }
        if (match) {
          const result = {};
          props.forEach(p => result[p] = s[p]);
          return result;
        }
      }
      return null;
    }
    const el = document.querySelector(sel);
    if (!el) return null;
    const s = getComputedStyle(el);
    const result = {};
    props.forEach(p => result[p] = s[p]);
    return result;
  }, { sel: mirrorSelector, props: PROPS });

  await browser.close();

  // Vergleich
  console.log(`\n${'='.repeat(50)}`);
  console.log(`  ${name}`);
  console.log('='.repeat(50));

  if (!htmlStyles || !mirrorStyles) {
    console.log('❌ Element nicht gefunden!');
    return { name, match: false, error: 'Element not found' };
  }

  let allMatch = true;
  const diffs = [];

  for (const prop of PROPS) {
    if (htmlStyles[prop] !== mirrorStyles[prop]) {
      allMatch = false;
      diffs.push({ prop, html: htmlStyles[prop], mirror: mirrorStyles[prop] });
    }
  }

  if (allMatch) {
    console.log('✅ MATCH - Alle computed styles sind identisch!\n');
  } else {
    console.log(`❌ ${diffs.length} Unterschiede:\n`);
    diffs.forEach(d => {
      console.log(`  ${d.prop}:`);
      console.log(`    HTML:   ${d.html}`);
      console.log(`    Mirror: ${d.mirror}`);
    });
  }

  return { name, match: allMatch, diffs };
}

// Tests ausführen
const base = 'file:///Users/toni.steimle/Documents/Dev/Mirror/examples/hospital-dashboard';

async function runAll() {
  const results = [];

  // Staff Item
  results.push(await compareComponent(
    'Staff Item',
    `${base}/staff-item-html.html`,
    `${base}/staff-item-mirror.html`,
    '.staff-item',
    'find:{"display":"flex","backgroundColor":"rgb(18, 18, 26)"}'
  ));

  // Status Badges - Container
  results.push(await compareComponent(
    'Status Badge Container',
    `${base}/status-badge-html.html`,
    `${base}/status-badge-mirror.html`,
    'body',
    '#app > div > div'
  ));

  // Zusammenfassung
  console.log('\n' + '='.repeat(50));
  console.log('  ZUSAMMENFASSUNG');
  console.log('='.repeat(50));
  results.forEach(r => {
    console.log(`${r.match ? '✅' : '❌'} ${r.name}`);
  });
}

runAll();
