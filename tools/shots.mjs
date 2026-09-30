// Erzeugt die Screenshots fuer das Handbuch aus der Demo-Version (artifact/LearnTogether-AD.html).
import { chromium } from 'playwright-core';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'src', 'handbuch', 'shots'); fs.mkdirSync(out, { recursive: true });
const testImg = process.argv[2]; // optionales Beispielbild fuer den Zuschnitt
const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
const p = await b.newPage({ viewport: { width: 1280, height: 860 }, locale: 'de-DE', deviceScaleFactor: 1 });
const shot = (name, opt) => p.screenshot(Object.assign({ path: path.join(out, name + '.jpg'), type: 'jpeg', quality: 80 }, opt));
const go = async h => { await p.evaluate(h => { location.hash = h; }, h); await p.waitForTimeout(300); };
await p.goto(pathToFileURL(path.join(root, 'artifact', 'LearnTogether-AD.html')).href); await p.waitForFunction(() => window.__LT_READY__);
await p.addStyleTag({ content: '.demo-banner{display:none!important}' });
await p.waitForSelector('.tile');
await shot('katalog', { clip: { x: 0, y: 0, width: 1280, height: 860 } });
await p.setViewportSize({ width: 1280, height: 1150 }); await p.locator('.tile', { hasText: 'Kundenempfehlungen' }).click(); await p.waitForSelector('.modal #b-name');
await p.fill('#b-name', 'Erika Mustermann'); await p.fill('#b-mail', 'erika.mustermann@example.org');
await p.locator('.modal').screenshot({ path: path.join(out, 'buchung.jpg'), type: 'jpeg', quality: 80 });
await p.keyboard.press('Escape'); await p.setViewportSize({ width: 1280, height: 860 });
await go('#/stornieren?code=K7M2-QX9P&email=erika.mustermann%40example.org'); await p.waitForSelector('#x-code');
await shot('stornieren', { clip: { x: 0, y: 0, width: 1280, height: 640 } });
await go('#/anbieten'); await p.waitForSelector('#f-title');
await p.fill('#f-title', 'Erfolgreich im Erstgespräch'); await p.fill('#f-host', 'Anna Berger');
await p.fill('#f-hostmail', 'anna.berger@example.org'); { const d = new Date(); d.setDate(d.getDate() + 4); while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1); await p.fill('#f-date', d.toISOString().slice(0, 10)); }
await p.selectOption('#f-dur', '60'); await p.selectOption('#f-start', '17:30'); await p.selectOption('#f-type', 'Workshop'); await p.selectOption('#f-topic', 'vertrieblich');
await p.fill('#f-cap', '12');
await p.waitForTimeout(200);
await shot('anbieten', { fullPage: false, clip: { x: 0, y: 60, width: 1280, height: 800 } });
if (testImg) { await p.setInputFiles('#f-img', testImg); await p.waitForSelector('.crop-box'); await p.fill('.zoomrow input[type=range]', '1.6'); await p.locator('.zoomrow input[type=range]').dispatchEvent('input'); await p.locator('.modal').screenshot({ path: path.join(out, 'zuschneiden.jpg'), type: 'jpeg', quality: 80 }); }
await b.close(); console.log('Screenshots in', out);
