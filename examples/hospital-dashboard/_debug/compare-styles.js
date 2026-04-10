// Vergleicht computed CSS styles zwischen HTML und Mirror
import { chromium } from 'playwright';

const STYLES_TO_COMPARE = [
  'display', 'flexDirection', 'alignItems', 'justifyContent', 'gap',
  'width', 'height', 'padding', 'margin', 'borderRadius',
  'backgroundColor', 'color', 'fontSize', 'fontWeight',
];

async function getComputedStyles(page, selector) {
  return await page.evaluate(({ selector, styles }) => {
    const elements = document.querySelectorAll(selector);
    return Array.from(elements).map((el, i) => {
      const computed = getComputedStyle(el);
      const result = { index: i, tag: el.tagName };
      styles.forEach(prop => {
        result[prop] = computed[prop];
      });
      return result;
    });
  }, { selector, styles: STYLES_TO_COMPARE });
}

async function compare(htmlUrl, mirrorUrl, selector = '*') {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  // HTML Version
  await page.goto(htmlUrl);
  await page.waitForTimeout(2000);
  const htmlStyles = await getComputedStyles(page, selector);

  // Mirror Version
  await page.goto(mirrorUrl);
  await page.waitForTimeout(2000);
  const mirrorStyles = await getComputedStyles(page, selector);

  await browser.close();

  // Vergleich
  console.log('\n=== STYLE COMPARISON ===\n');

  const differences = [];
  const minLen = Math.min(htmlStyles.length, mirrorStyles.length);

  for (let i = 0; i < minLen; i++) {
    const html = htmlStyles[i];
    const mirror = mirrorStyles[i];

    for (const prop of STYLES_TO_COMPARE) {
      if (html[prop] !== mirror[prop]) {
        differences.push({
          element: i,
          property: prop,
          html: html[prop],
          mirror: mirror[prop]
        });
      }
    }
  }

  if (differences.length === 0) {
    console.log('✅ Alle Styles sind identisch!');
  } else {
    console.log(`❌ ${differences.length} Unterschiede gefunden:\n`);
    differences.forEach(d => {
      console.log(`Element ${d.element}, ${d.property}:`);
      console.log(`  HTML:   ${d.html}`);
      console.log(`  Mirror: ${d.mirror}\n`);
    });
  }

  return differences;
}

// Ausführen
const base = 'file:///Users/toni.steimle/Documents/Dev/Mirror/examples/hospital-dashboard';

// Staff Item: HTML hat .staff-item, Mirror hat #app > div
async function compareStaffItem() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  // HTML: direkt .staff-item
  await page.goto(`${base}/staff-item-html.html`);
  await page.waitForTimeout(1000);
  const htmlStyles = await getComputedStyles(page, '.staff-item, .staff-item *');

  // Mirror: #app > div (das ist der kompilierte Frame)
  await page.goto(`${base}/staff-item-mirror.html`);
  await page.waitForTimeout(1000);
  const mirrorStyles = await getComputedStyles(page, '#app > div, #app > div *');

  await browser.close();

  console.log('\n=== STAFF ITEM: STYLE COMPARISON ===');
  console.log(`HTML elements: ${htmlStyles.length}`);
  console.log(`Mirror elements: ${mirrorStyles.length}\n`);

  // Vergleiche nur kritische Eigenschaften der Container
  const htmlContainer = htmlStyles[0];
  const mirrorContainer = mirrorStyles[0];

  console.log('Container-Vergleich:');
  let allMatch = true;
  for (const prop of STYLES_TO_COMPARE) {
    const match = htmlContainer[prop] === mirrorContainer[prop];
    const icon = match ? '✅' : '❌';
    if (!match) {
      allMatch = false;
      console.log(`${icon} ${prop}: "${htmlContainer[prop]}" vs "${mirrorContainer[prop]}"`);
    }
  }

  if (allMatch) {
    console.log('✅ Alle Container-Styles identisch!');
  }
}

compareStaffItem();
