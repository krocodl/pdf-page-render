import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import process from 'process';

const url = process.argv[2];

if (!url) {
    console.error('Usage: node render-one-page.mjs <url>');
    process.exit(1);
}

// ---- PDF directory ----
const pdfDir = path.resolve('pdf');
await fs.promises.mkdir(pdfDir, { recursive: true });

// ---- Determine next sequential number ----
const files = await fs.promises.readdir(pdfDir);
const numbers = files
    .map(f => f.match(/^(\d+)-.*\.pdf$/) || f.match(/^(\d+)\.pdf$/))
    .filter(Boolean)
    .map(m => Number(m[1]));

const nextNumber = numbers.length === 0 ? 0 : Math.max(...numbers) + 1;
const indexPart = String(nextNumber).padStart(6, '0');

// ---- Browser ----
const browser = await chromium.launch();
const page = await browser.newPage();

page.setDefaultNavigationTimeout(120000);
page.setDefaultTimeout(120000);

await page.emulateMedia({ media: 'print' });

console.log(`Rendering ${indexPart}`);
console.log(`Opening: ${url}`);

const response = await page.goto(url, { waitUntil: 'domcontentloaded' });

if (!response || !response.ok()) {
    throw new Error(`Failed to load page: ${response?.status()}`);
}

// Give the page time to hydrate/render
await page.waitForTimeout(1500);

// ---- Force light theme (Docusaurus-friendly) ----
try {
    await page.evaluate(() => {
        document.documentElement.setAttribute('data-theme', 'light');
    });
} catch {
    // ignore
}

// ---- Extract page title (h1 preferred, fallback to <title>) ----
const rawTitle = await page.evaluate(() => {
    const h1 = document.querySelector('main h1');
    if (h1 && h1.textContent) {
        return h1.textContent.trim();
    }
    return document.title || 'page';
});

// ---- Sanitize title for filename ----
const safeTitle = rawTitle
    .toLowerCase()
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80); // avoid overly long filenames

const fileName = `${indexPart}-${safeTitle}.pdf`;
const outputFile = path.join(pdfDir, fileName);

// ---- Make code blocks printable and monochrome ----
await page.addStyleTag({
    content: `
    pre,
    code,
    pre code {
      background: #ffffff !important;
      color: #000000 !important;
    }

    .prism-code,
    .codeBlockContainer,
    .codeBlockContent,
    .theme-code-block,
    div[class*="codeBlock"],
    div[class*="prism"] {
      background: #ffffff !important;
      color: #000000 !important;
    }

    /* Disable syntax highlighting */
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

// ---- Ensure main content exists (avoid blank PDFs) ----
try {
    await page.waitForSelector('main', { timeout: 30000 });
} catch {
    console.warn('Warning: main content not detected, continuing');
}

// ---- Render PDF ----
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
