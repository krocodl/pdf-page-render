// render-one-page.mjs
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import process from 'process';

const url = process.argv[2];

if (!url) {
  console.error('Usage: node render-one-page.mjs <url>');
  process.exit(1);
}

// Save into ./pdf (relative to current working directory)
const pdfDir = path.resolve('pdf');
await fs.promises.mkdir(pdfDir, { recursive: true });

// Pick next sequential filename: 000000.pdf, 000001.pdf, ...
const files = await fs.promises.readdir(pdfDir);
const numbers = files
  .map((f) => f.match(/^(\d+)\.pdf$/))
  .filter(Boolean)
  .map((m) => Number(m[1]));

const nextNumber = numbers.length === 0 ? 0 : Math.max(...numbers) + 1;
const fileName = `${String(nextNumber).padStart(6, '0')}.pdf`;
const outputFile = path.join(pdfDir, fileName);

const browser = await chromium.launch();
const page = await browser.newPage();

page.setDefaultNavigationTimeout(120000);
page.setDefaultTimeout(120000);

await page.emulateMedia({ media: 'print' });

console.log(`Rendering ${fileName}`);
console.log(`Opening: ${url}`);

const response = await page.goto(url, { waitUntil: 'domcontentloaded' });

if (!response || !response.ok()) {
  throw new Error(`Failed to load page: ${response?.status()}`);
}

// Let the page hydrate/render (JS docs, diagrams, etc.)
await page.waitForTimeout(1500);

// Prefer light theme if the site supports Docusaurus-style theming
try {
  await page.evaluate(() => {
    document.documentElement.setAttribute('data-theme', 'light');
  });
} catch {
  // ignore
}

// Make code blocks printable (no black background)

await page.addStyleTag({
  content: `
    /* Светлый фон для кода */
    pre,
    code,
    pre code {
      background: #ffffff !important;
      color: #000000 !important;
    }

    /* Контейнеры Docusaurus / Prism */
    .prism-code,
    .codeBlockContainer,
    .codeBlockContent,
    .theme-code-block,
    div[class*="codeBlock"],
    div[class*="prism"] {
      background: #ffffff !important;
      color: #000000 !important;
    }

    /* ОТКЛЮЧЕНИЕ ПОДСВЕТКИ СИНТАКСИСА */
    /* Все токены Prism делаем чёрными */
    pre code span,
    pre code span[class],
    code span,
    code span[class],
    .token,
    .token * {
      color: #000000 !important;
      background: transparent !important;
      text-shadow: none !important;
    }

    /* Убрать возможные inline-стили */
    pre code {
      filter: none !important;
    }

    /* Внешний вид */
    pre {
      box-shadow: none !important;
      border: 1px solid #dddddd !important;
    }

    code, pre {
      font-family: Menlo, Consolas, Monaco, "Courier New", monospace !important;
      font-size: 10pt !important;
    }
  `
});



// Wait for main content if present (avoid blank PDFs)
try {
  await page.waitForSelector('main', { timeout: 30000 });
} catch {
  console.warn('Warning: main content not detected, continuing');
}

await page.pdf({
  path: outputFile,
  format: 'A4',
  printBackground: true,
  margin: {
    top: '15mm',
    bottom: '15mm',
    left: '12mm',
    right: '12mm'
  }
});

await browser.close();

console.log(`Saved to: ${outputFile}`);
