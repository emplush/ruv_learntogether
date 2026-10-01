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
await p.click('.modal button[type=submit]'); await p.waitForSelector('.modal .code'); await p.waitForTimeout(200);
await p.locator('.modal').screenshot({ path: path.join(out, 'angemeldet.jpg'), type: 'jpeg', quality: 80 });
await p.keyboard.press('Escape'); await p.setViewportSize({ width: 1280, height: 860 });
await go('#/anmeldung'); await p.waitForSelector('#x-code'); await p.fill('#x-code', 'K7M2-QX9P');
await shot('stornieren', { clip: { x: 0, y: 0, width: 1280, height: 860 } });
await go('#/anbieten'); await p.waitForSelector('#f-title');
await p.fill('#f-title', 'Erfolgreich im Erstgespräch'); await p.fill('#f-host', 'Anna Berger');
await p.fill('#f-hostmail', 'anna.berger@example.org'); { const d = new Date(); d.setDate(d.getDate() + 4); while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1); await p.fill('#f-date', d.toISOString().slice(0, 10)); }
await p.selectOption('#f-dur', '60'); await p.selectOption('#f-start', '17:30'); await p.selectOption('#f-type', 'Workshop'); await p.selectOption('#f-topic', 'vertrieblich');
await p.fill('#f-cap', '12');
await p.waitForTimeout(200);
await shot('anbieten', { fullPage: false, clip: { x: 0, y: 60, width: 1280, height: 800 } });
if (testImg) { await p.setInputFiles('#f-img', testImg); await p.waitForSelector('.crop-box'); await p.fill('.zoomrow input[type=range]', '1.6'); await p.locator('.zoomrow input[type=range]').dispatchEvent('input'); await p.locator('.modal').screenshot({ path: path.join(out, 'zuschneiden.jpg'), type: 'jpeg', quality: 80 }); }
// ---- Administration
await p.setViewportSize({ width: 1280, height: 900 });
await go('#/admin'); await p.fill('#a-pw', 'RuVTest1234'); await p.click('button[type=submit]'); await p.waitForSelector('table.tbl');
await shot('adm-events', { clip: { x: 0, y: 60, width: 1280, height: 840 } });
await p.locator('button:has-text("Teilnehmende (8)")').first().click(); await p.waitForSelector('.modal .people-tbl'); await p.waitForTimeout(200);
await p.locator('.modal').screenshot({ path: path.join(out, 'adm-teilnehmende.jpg'), type: 'jpeg', quality: 80 }); await p.keyboard.press('Escape');
const nav = async t => { await p.click('.admin-nav button:has-text("' + t + '")'); await p.waitForTimeout(500); };
await nav('Statistik'); await p.waitForSelector('.st-card'); await shot('adm-statistik', { clip: { x: 0, y: 60, width: 1280, height: 840 } });
await nav('Texte'); await p.waitForSelector('#h-title'); await shot('adm-texte', { clip: { x: 0, y: 60, width: 1280, height: 840 } });
await nav('Themen'); await shot('adm-themen', { clip: { x: 0, y: 60, width: 1280, height: 840 } });
await nav('Arten'); await shot('adm-arten', { clip: { x: 0, y: 60, width: 1280, height: 600 } });
await nav('Archiv'); await p.waitForSelector('#ar-q'); await p.click('.seg button[data-cat="privat"]'); await p.waitForTimeout(300); await shot('adm-archiv', { clip: { x: 0, y: 60, width: 1280, height: 640 } });
await nav('Veranstaltungen'); await p.waitForSelector('table.tbl'); await p.fill('#af-q', 'Brettspiel'); await p.waitForTimeout(200);
await p.addStyleTag({ content: '.top{position:static!important}' });
{ const row = p.locator('table.tbl tbody tr:has(.acts)').first(); const code = (await row.locator('.hint', { hasText: 'Veranstaltungscode' }).textContent()).replace('Veranstaltungscode', '').trim();
  await go('#/veranstaltung?code=' + code); await p.waitForSelector('#v-reason'); await p.locator('.cancel-box').scrollIntoViewIfNeeded(); await p.waitForTimeout(200); await shot('absagen', { fullPage: true, clip: { x: 240, y: 100, width: 800, height: 1240 } });
    }
await b.close(); console.log('Screenshots in', out);
