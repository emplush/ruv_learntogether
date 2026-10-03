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
const shot = async (name, opt) => { await p.evaluate(() => window.scrollTo(0, 0)); await p.waitForTimeout(100); return p.screenshot(Object.assign({ path: path.join(out, name + '.jpg'), type: 'jpeg', quality: 80 }, opt)); };
const go = async h => { await p.evaluate(h => { location.hash = h; }, h); await p.waitForTimeout(300); };
await p.goto(pathToFileURL(path.join(root, 'artifact', 'LearnTogether-AD.html')).href); await p.waitForFunction(() => window.__LT_READY__);
await p.addStyleTag({ content: '.demo-banner,.toast{display:none!important}' });
await p.waitForSelector('.tile');
const T = 'Test-Passwort-2026';
async function login(id, pw) { await go('#/anmelden'); await p.fill('#l-id', id); await p.fill('#l-pw', pw); await p.click('form button[type=submit]'); await p.waitForTimeout(900); }
await shot('katalog', { clip: { x: 0, y: 0, width: 1280, height: 860 } });
// Registrierung
await go('#/registrieren'); await p.waitForSelector('#r-username');
await p.fill('#r-username', 'erika_m'); await p.fill('#r-firstName', 'Erika'); await p.fill('#r-lastName', 'Mustermann'); await p.fill('#r-xv', 'XV54321'); await p.fill('#r-email', 'erika.mustermann@example.org'); await p.fill('#r-password', 'Sehr-Gutes-Pw-1'); await p.fill('#r-password2', 'Sehr-Gutes-Pw-1');
await p.setViewportSize({ width: 1280, height: 1000 }); await shot('registrieren', { clip: { x: 0, y: 60, width: 1280, height: 940 } });
await p.click('form button[type=submit]'); await p.waitForSelector('.navout');
// Buchung
await p.setViewportSize({ width: 1280, height: 1150 }); await go('#/'); await p.waitForSelector('.tile'); await p.locator('.tile', { hasText: 'Kundenempfehlungen' }).click(); await p.waitForSelector('.modal button:has-text("Verbindlich anmelden")'); await p.waitForTimeout(200);
await p.locator('.modal').screenshot({ path: path.join(out, 'buchung.jpg'), type: 'jpeg', quality: 80 });
await p.click('.modal button:has-text("Verbindlich anmelden")'); await p.waitForSelector('.modal .notice.ok'); await p.keyboard.press('Escape'); await p.setViewportSize({ width: 1280, height: 860 });
await login('miriam.k', T);
await go('#/meine-anmeldungen'); await p.waitForSelector('.pcard'); await p.addStyleTag({ content: '.top{position:static!important}' }); await p.waitForTimeout(300);
await shot('meine-anmeldungen', { clip: { x: 0, y: 0, width: 1280, height: 860 } });
await login('erika_m', 'Sehr-Gutes-Pw-1').catch(() => {});
await p.click('.navout').catch(() => {}); await p.waitForTimeout(300);
await login('anna.b', T);
await go('#/anbieten'); await p.waitForSelector('#f-title');
await p.fill('#f-title', 'Erfolgreich im Erstgespräch'); { const d = new Date(); d.setDate(d.getDate() + 4); while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1); await p.fill('#f-date', d.toISOString().slice(0, 10)); }
await p.selectOption('#f-dur', '60'); await p.selectOption('#f-start', '17:30'); await p.selectOption('#f-type', 'Workshop'); await p.selectOption('#f-topic', 'vertrieblich');
await p.fill('#f-cap', '12');
await p.waitForTimeout(200);
await shot('anbieten', { fullPage: false, clip: { x: 0, y: 60, width: 1280, height: 800 } });
await p.click('button:has-text("Platzhalterbild wählen")'); await p.waitForSelector('.ph-grid'); await p.waitForTimeout(300); await p.locator('.modal').screenshot({ path: path.join(out, 'platzhalter.jpg'), type: 'jpeg', quality: 80 }); await p.keyboard.press('Escape');
if (testImg) { await p.setInputFiles('#f-img', testImg); await p.waitForSelector('.crop-box'); await p.fill('.zoomrow input[type=range]', '1.6'); await p.locator('.zoomrow input[type=range]').dispatchEvent('input'); await p.locator('.modal').screenshot({ path: path.join(out, 'zuschneiden.jpg'), type: 'jpeg', quality: 80 }); }
await go('#/meine-veranstaltungen'); await p.waitForSelector('.panel h3'); await p.waitForTimeout(300);
await p.locator('.cancel-open').first().click().catch(() => {});
await shot('meine-veranstaltungen', { fullPage: false, clip: { x: 0, y: 60, width: 1280, height: 800 } });
await go('#/profil'); await p.waitForSelector('.prof-head'); await p.waitForTimeout(300); await p.setViewportSize({ width: 1280, height: 1250 });
await shot('profil', { clip: { x: 0, y: 60, width: 1280, height: 1180 } }); await p.setViewportSize({ width: 1280, height: 900 });
await p.click('#av-edit'); await p.click('.modal button:has-text("Aus Bildern auswählen")'); await p.waitForSelector('.av-grid'); await p.waitForTimeout(300); await p.locator('.modal').last().screenshot({ path: path.join(out, 'profilbild.jpg'), type: 'jpeg', quality: 80 }); await p.keyboard.press('Escape'); await p.keyboard.press('Escape');
await go('#/profil?tab=oeffentlich'); await p.waitForSelector('#pub-box'); await p.locator('#pub-box').scrollIntoViewIfNeeded(); await p.locator('#pub-box').screenshot({ path: path.join(out, 'profil-freigaben.jpg'), type: 'jpeg', quality: 80 });
await p.click('#pub-box button:has-text("So sehen andere")'); await p.waitForSelector('.pubprof h2'); await p.waitForTimeout(200); await p.locator('.modal').screenshot({ path: path.join(out, 'profil-oeffentlich.jpg'), type: 'jpeg', quality: 80 }); await p.keyboard.press('Escape');
// ---- IDD: Formular, Bestaetigung (anna.b), Konto und Cockpit (markus_v)
await go('#/meine-veranstaltungen'); await p.waitForSelector('.panel h3'); await p.waitForTimeout(300);
await p.locator('.panel:has(h3:text-is("Berufsunfähigkeit verständlich erklären")) button:has-text("Bearbeiten")').click(); await p.waitForSelector('.modal #f-idd', { state: 'attached' });
await p.locator('.modal fieldset:has(#f-idd)').scrollIntoViewIfNeeded(); await p.waitForTimeout(200); await p.locator('.modal fieldset:has(#f-idd)').screenshot({ path: path.join(out, 'idd-formular.jpg'), type: 'jpeg', quality: 80 });
await p.click('.modal #f-agenda'); await p.waitForSelector('.ag-edit'); await p.waitForTimeout(200); await p.locator('.modal').last().screenshot({ path: path.join(out, 'idd-agenda.jpg'), type: 'jpeg', quality: 80 }); await p.keyboard.press('Escape'); await p.waitForTimeout(200); await p.keyboard.press('Escape'); await p.waitForTimeout(200);
await p.click('.tabs-seg button:has-text("Vergangen")'); await p.waitForTimeout(300);
const iddc = p.locator('.panel:has(h3:text-is("Betriebliche Altersversorgung im Mittelstand")) .idd-confirm'); await iddc.scrollIntoViewIfNeeded(); await iddc.screenshot({ path: path.join(out, 'idd-bestaetigen.jpg'), type: 'jpeg', quality: 80 });
await p.click('.navout'); await p.waitForTimeout(300);
await login('markus_v', 'Test-Passwort-2026');
await go('#/profil?tab=konto'); await p.waitForSelector('#idd-box'); await p.locator('#idd-box').scrollIntoViewIfNeeded(); await p.locator('#idd-box').screenshot({ path: path.join(out, 'idd-konto.jpg'), type: 'jpeg', quality: 80 });
await go('#/profil?tab=idd'); await p.waitForSelector('#idd-cockpit'); await p.setViewportSize({ width: 1280, height: 1100 }); await p.locator('#idd-cockpit').screenshot({ path: path.join(out, 'idd-cockpit.jpg'), type: 'jpeg', quality: 80 }); await p.setViewportSize({ width: 1280, height: 900 });
await p.click('.navout'); await p.waitForTimeout(300);
// ---- Administration
await login('admin', 'RuVTest1234'); await p.waitForSelector('#p-cur');
await p.fill('#p-cur', 'RuVTest1234'); await p.fill('#p-new', 'Sicher-Neues-Pw-77'); await p.fill('#p-new2', 'Sicher-Neues-Pw-77'); await p.click('#pw-box button[type=submit]'); await p.waitForSelector('#pw-box .notice.ok');
await go('#/admin'); await p.waitForSelector('table.tbl');
await shot('adm-events', { clip: { x: 0, y: 60, width: 1280, height: 840 } });
await p.locator('button:has-text("Teilnehmende (8)")').first().click(); await p.waitForSelector('.modal .people-tbl'); await p.waitForTimeout(200);
await p.locator('.modal').screenshot({ path: path.join(out, 'adm-teilnehmende.jpg'), type: 'jpeg', quality: 80 }); await p.keyboard.press('Escape');
const nav = async t => { await p.click('.admin-nav button:has-text("' + t + '")'); await p.waitForTimeout(500); };
await nav('Nutzer'); await p.waitForSelector('table.tbl'); await shot('adm-nutzer', { clip: { x: 0, y: 60, width: 1280, height: 840 } });
await nav('Statistik'); await p.waitForSelector('.st-card'); await shot('adm-statistik', { clip: { x: 0, y: 60, width: 1280, height: 840 } });
await nav('Texte'); await p.waitForSelector('#h-title'); await shot('adm-texte', { clip: { x: 0, y: 60, width: 1280, height: 700 } });
await nav('Themen'); await shot('adm-themen', { clip: { x: 0, y: 60, width: 1280, height: 840 } });
await nav('Arten'); await shot('adm-arten', { clip: { x: 0, y: 60, width: 1280, height: 600 } });
await nav('Fotos'); await p.waitForSelector('#fo-name'); await shot('adm-fotos', { clip: { x: 0, y: 60, width: 1280, height: 700 } });
await nav('Abzeichen'); await p.waitForSelector('#bd-1'); await shot('adm-abzeichen', { clip: { x: 0, y: 60, width: 1280, height: 840 } });
await nav('Archiv'); await p.waitForSelector('#ar-q'); await shot('adm-archiv', { clip: { x: 0, y: 60, width: 1280, height: 640 } });
await p.click('.admin-nav button:text-is("IDD")'); await p.waitForSelector('.admin-content .st-kpis'); await p.waitForTimeout(300); await shot('adm-idd', { clip: { x: 0, y: 60, width: 1280, height: 840 } });
await p.locator('tr:has-text("Betriebliche Altersversorgung") button:has-text("Teilnahmen")').click(); await p.waitForSelector('.modal .people-tbl'); await p.locator('.modal').screenshot({ path: path.join(out, 'adm-idd-teilnahmen.jpg'), type: 'jpeg', quality: 80 }); await p.keyboard.press('Escape');
await nav('IDD-Einstellungen'); await p.waitForSelector('#s-idd-on'); await shot('adm-idd-einstellungen', { clip: { x: 0, y: 60, width: 1280, height: 840 } });
await b.close(); console.log('Screenshots in', out);
