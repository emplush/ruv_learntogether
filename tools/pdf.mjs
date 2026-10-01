// Erzeugt aus dem HTML-Handbuch das PDF (Chromium via playwright-core).
import { chromium } from 'playwright-core';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
const [, , input, output, docname = 'Nutzerhandbuch'] = process.argv;
const exe = process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium';
const browser = await chromium.launch({ executablePath: exe, args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.goto(pathToFileURL(path.resolve(input)).href, { waitUntil: 'load' });
await page.emulateMedia({ media: 'print', colorScheme: 'light' });
await page.pdf({ path: output, format: 'A4', printBackground: true, margin: { top: '18mm', bottom: '18mm', left: '16mm', right: '16mm' }, displayHeaderFooter: true,
  headerTemplate: '<div></div>',
  footerTemplate: '<div style="font-size:8px;width:100%;padding:0 16mm;color:#707070;display:flex;justify-content:space-between"><span>LearnTogether@AD ' + docname + '</span><span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>' });
await browser.close();
console.log('PDF geschrieben:', output);
