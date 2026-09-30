/* LearnTogether - Frontend (Vanilla JS, keine Abhaengigkeiten).
   Zwei Betriebsarten: "server" (IIS, AppData/api.ashx) und "local" (Demo im Browser, Daten in localStorage). Es werden keine E-Mails versendet. */
(function () {
'use strict';
var CFG = window.__LT__ || {};
/* Basisverzeichnis der Anwendung (auch wenn die Adresse ohne abschliessenden Schraegstrich aufgerufen wird) */
var BASE = (function () { var p = location.pathname, last = p.split('/').pop(); if (p.slice(-1) !== '/' && last.indexOf('.') < 0) p += '/'; return p.replace(/[^\/]*$/, ''); })();
var API = BASE + 'AppData/api.ashx';
function rel(u) { return /^(data:|https?:|blob:|\/)/i.test(u) ? u : BASE + u; }
var diag = null, pingInfo = null; // Grund, warum der Server nicht genutzt wird (Demo-Modus)

/* ====================================================== Hilfsfunktionen */
function $(s, r) { return (r || document).querySelector(s); }
function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
function h(tag, props, kids) {
  var e = document.createElement(tag);
  if (props) Object.keys(props).forEach(function (k) {
    var v = props[k];
    if (v == null || v === false) return;
    if (k === 'class') e.className = v;
    else if (k === 'text') e.textContent = v;
    else if (k === 'html') e.innerHTML = v;
    else if (k.slice(0, 2) === 'on') e.addEventListener(k.slice(2), v);
    else if (k === 'value') e.value = v;
    else if (v === true) e.setAttribute(k, '');
    else e.setAttribute(k, v);
  });
  add(e, kids);
  return e;
}
function add(e, kids) {
  if (kids == null) return e;
  if (!Array.isArray(kids)) kids = [kids];
  kids.forEach(function (k) { if (k == null || k === false) return; if (Array.isArray(k)) add(e, k); else e.appendChild(typeof k === 'string' || typeof k === 'number' ? document.createTextNode(String(k)) : k); });
  return e;
}
function clear(e) { while (e.firstChild) e.removeChild(e.firstChild); return e; }
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
function pad(n) { return String(n).padStart(2, '0'); }
function svg(path, extra) { return '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"' + (extra || '') + '>' + path + '</svg>'; }
var ICONS = {
  search: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
  left: '<path d="M15 18l-6-6 6-6"/>', right: '<path d="M9 18l6-6-6-6"/>',
  lock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
  olist: '<path d="M10 6h11M10 12h11M10 18h11M4 6h1v4M4 10h2M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"/>',
  link: '<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>',
  undo: '<path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/>',
  redo: '<path d="M21 7v6h-6"/><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3L21 13"/>',
  plus: '<path d="M12 5v14M5 12h14"/>', minus: '<path d="M5 12h14"/>',
  download: '<path d="M12 3v12M7 10l5 5 5-5M5 21h14"/>', ext: '<path d="M15 3h6v6M10 14L21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
  book: '<path d="M2 4h7a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H2z"/><path d="M22 4h-7a3 3 0 0 0-3 3v13a2 2 0 0 1 2-2h8z"/>',
  trend: '<path d="M22 7l-8.5 8.5-5-5L2 17"/><path d="M16 7h6v6"/>',
  pulse: '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  cup: '<path d="M17 8h1a4 4 0 1 1 0 8h-1M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4zM6 2v2M10 2v2M14 2v2"/>',
  globe: '<circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15 15 0 0 1 0 20 15 15 0 0 1 0-20"/>',
  star: '<path d="M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.8-6.2-3.3-6.2 3.3L7 14.2 2 9.3l6.9-1z"/>'
};
function ico(n) { return ICONS[n] ? svg(ICONS[n]) : ''; }

/* Speicher (localStorage kann in Vorschau/Privatmodus fehlen) */
var mem = {};
var store = {
  get: function (k) { try { var v = localStorage.getItem(k); return v == null ? (mem[k] == null ? null : mem[k]) : v; } catch (e) { return mem[k] == null ? null : mem[k]; } },
  set: function (k, v) { mem[k] = v; try { localStorage.setItem(k, v); } catch (e) { } },
  del: function (k) { delete mem[k]; try { localStorage.removeItem(k); } catch (e) { } }
};
var sess = {
  get: function (k) { try { var v = sessionStorage.getItem(k); return v == null ? (mem['s' + k] || null) : v; } catch (e) { return mem['s' + k] || null; } },
  set: function (k, v) { mem['s' + k] = v; try { sessionStorage.setItem(k, v); } catch (e) { } },
  del: function (k) { delete mem['s' + k]; try { sessionStorage.removeItem(k); } catch (e) { } }
};

/* ====================================================== Fachliche Konstanten & Datum */
var TYPES = ['Workshop', 'Austausch', 'Best Practice'];
var MAX_CAP = 50;
var MAX_TYPES = 50;
var DEFAULT_HERO = { title: 'Voneinander lernen. Miteinander wachsen.', text: 'Entdecke, was Kolleginnen und Kollegen bewegt: Workshops, Erfahrungsaustausch und Best Practices, dienstlich wie privat. Melde dich in zwei Klicks an oder teile selbst, was du weißt. Live online in Teams, montags bis freitags morgens (06:00 bis 09:00 Uhr) oder nachmittags (17:00 bis 20:00 Uhr).' };
var HERO = { title: DEFAULT_HERO.title, text: DEFAULT_HERO.text };
var COLORS = { dienstlich: '#001957', privat: '#583720' };
var HEADINGS = { dienstlich: '#f79506', privat: '#f79506' };
var TEXTS = { dienstlich: '#ffffff', privat: '#ffffff' };
var TOPICS = { dienstlich: ['fachlich', 'vertrieblich'], privat: ['Sport', 'Freizeit', 'Essen & Trinken', 'Reisen', 'Sonstiges'] };
var CAT_LABEL = { dienstlich: 'Dienstlich', privat: 'Privat' };
var DEFAULT_TAX = { types: ['Workshop', 'Austausch', 'Best Practice'], colors: { dienstlich: '#001957', privat: '#583720' }, headings: { dienstlich: '#f79506', privat: '#f79506' }, texts: { dienstlich: '#ffffff', privat: '#ffffff' }, labels: { dienstlich: 'Dienstlich', privat: 'Privat' }, topics: { dienstlich: ['fachlich', 'vertrieblich'], privat: ['Sport', 'Freizeit', 'Essen & Trinken', 'Reisen', 'Sonstiges'] } };
function applyTaxonomy(t) {
  if (!t) return;
  ['dienstlich', 'privat'].forEach(function (c) {
    if (t.labels && t.labels[c]) CAT_LABEL[c] = t.labels[c];
    if (t.topics && t.topics[c] && t.topics[c].length) TOPICS[c] = t.topics[c].slice();
    if (t.colors && t.colors[c]) COLORS[c] = t.colors[c];
    if (t.headings && t.headings[c]) HEADINGS[c] = t.headings[c];
    if (t.texts && t.texts[c]) TEXTS[c] = t.texts[c];
  });
  if (t.types && t.types.length) TYPES = t.types.slice().sort(function (a, b) { return a.localeCompare(b, 'de', { sensitivity: 'base' }); });
  if (t.hero) { if (t.hero.title) HERO.title = t.hero.title; if (t.hero.text) HERO.text = t.hero.text; }
}
function capFirst(t) { return t.charAt(0).toUpperCase() + t.slice(1); }
function hexRgb(x) { return [1, 3, 5].map(function (i) { return parseInt(x.substr(i, 2), 16); }); }
function lum(x) { var c = hexRgb(x).map(function (v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; }
function mixHex(a, b, t) { var A = hexRgb(a), B = hexRgb(b); return '#' + A.map(function (v, i) { return pad(Math.round(v + (B[i] - v) * t).toString(16)); }).join(''); }
function hexOk(x) { return /^#[0-9a-fA-F]{6}$/.test(x); }
function contrast(a, b) { var la = lum(a.toLowerCase()), lb = lum(b.toLowerCase()); return (Math.max(la, lb) + .05) / (Math.min(la, lb) + .05); }
function fmt1(n) { return (Math.round(n * 10) / 10).toFixed(1).replace('.', ','); }
/* Farbpruefung je Themenbereich: Text gegen Hintergrund mind. 4,5:1, Ueberschrift mind. 3:1 (WCAG) */
function pairError(label, bg, head, text) {
  if (!hexOk(bg) || !hexOk(head) || !hexOk(text)) return 'Bitte gib alle Farben als Hex-Wert an, z. B. #001957.';
  var ct = contrast(bg, text), ch = contrast(bg, head);
  if (ct < 4.5) return '„' + label + '“: Der Kontrast zwischen Hintergrund und Textfarbe ist zu gering (mindestens 4,5 : 1, aktuell ' + fmt1(ct) + ' : 1).';
  if (ch < 3) return '„' + label + '“: Der Kontrast zwischen Hintergrund und Überschriftenfarbe ist zu gering (mindestens 3 : 1, aktuell ' + fmt1(ch) + ' : 1).';
  return '';
}
function stageStyle(bg, head, text) {
  bg = bg.toLowerCase(); head = (head || '#f79506').toLowerCase(); text = (text || '#ffffff').toLowerCase();
  return '--bg:' + bg + ';--text:' + text + ';--accent:' + head + ';--surface:' + mixHex(bg, text, .1) + ';--surface-2:' + mixHex(bg, text, .2) + ';--line:' + mixHex(bg, text, .32) + ';--muted:' + mixHex(bg, text, .78) + ';--arrow:' + mixHex(bg, '#000000', .55);
}
function paintStage(cat) { return stageStyle(COLORS[cat], HEADINGS[cat], TEXTS[cat]); }
var WINDOWS = [{ key: 'morgens', label: 'Morgens', from: 360, to: 540 }, { key: 'nachmittags', label: 'Nachmittags', from: 1020, to: 1200 }];
var DUR_LABEL = { 15: '15 Minuten', 30: '30 Minuten', 45: '45 Minuten', 60: '60 Minuten (1 Std.)', 75: '75 Minuten', 90: '90 Minuten (1,5 Std.)', 105: '105 Minuten', 120: '120 Minuten (2 Std.)' };
var DAY_S = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
var DAY_L = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
var MONTH_L = ['Januar', 'Februar', 'M\u00e4rz', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
var TEAMS_HOSTS = ['teams.microsoft.com', 'teams.live.com', 'teams.cloud.microsoft', 'teams.microsoft.us'];
var DEFAULT_TITLE = 'LearnTogether@AD';

function ymd(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
function parseYmd(s) { var p = String(s).split('-').map(Number); return new Date(p[0], p[1] - 1, p[2]); }
function toMin(t) { var p = t.split(':').map(Number); return p[0] * 60 + p[1]; }
function minToHm(m) { return pad(Math.floor(m / 60)) + ':' + pad(m % 60); }
function startDate(e) { var d = parseYmd(e.date); var m = toMin(e.start); d.setHours(Math.floor(m / 60), m % 60, 0, 0); return d; }
function endHm(e) { return minToHm(toMin(e.start) + e.duration); }
function dateShort(s) { var d = parseYmd(s); return DAY_S[d.getDay()] + ', ' + pad(d.getDate()) + '.' + pad(d.getMonth() + 1) + '.'; }
function dateFull(s) { var d = parseYmd(s); return DAY_S[d.getDay()] + ', ' + pad(d.getDate()) + '.' + pad(d.getMonth() + 1) + '.' + d.getFullYear(); }
function dateLong(s) { var d = parseYmd(s); return DAY_L[d.getDay()] + ', ' + pad(d.getDate()) + '. ' + MONTH_L[d.getMonth()] + ' ' + d.getFullYear(); }
function isWeekday(d) { return d.getDay() >= 1 && d.getDay() <= 5; }
function inWindow(startMin, dur) { return WINDOWS.some(function (w) { return startMin >= w.from && startMin + dur <= w.to; }); }
function validStarts(dur) {
  var out = [];
  WINDOWS.forEach(function (w) { var list = []; for (var m = w.from; m + dur <= w.to; m += 15) list.push(m); out.push({ w: w, list: list }); });
  return out;
}
function freeOf(e) { return e.capacity - e.booked; }
function validTeams(link) {
  try { var u = new URL(link); if (u.protocol !== 'https:') return false; var hn = u.hostname.toLowerCase(); return TEAMS_HOSTS.some(function (t) { return hn === t || hn.slice(-(t.length + 1)) === '.' + t; }); } catch (e) { return false; }
}
function validEmail(e) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e) && e.length <= 200; }
function rid(n) { var a = 'abcdefghijklmnopqrstuvwxyz0123456789', s = ''; var r = new Uint8Array(n); (window.crypto || {}).getRandomValues ? crypto.getRandomValues(r) : r.forEach(function (_, i) { r[i] = Math.random() * 256; }); for (var i = 0; i < n; i++) s += a[r[i] % a.length]; return s; }
function newCode(len) { len = len || 8; var a = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', s = ''; var r = new Uint8Array(len); (window.crypto || {}).getRandomValues ? crypto.getRandomValues(r) : r.forEach(function (_, i) { r[i] = Math.random() * 256; }); for (var i = 0; i < len; i++) { if (i === Math.floor(len / 2)) s += '-'; s += a[r[i] % a.length]; } return s; }
function normCode(c) { return String(c || '').toUpperCase().replace(/[^A-Z0-9]/g, ''); }

/* HTML-Bereinigung (Positivliste) */
var ALLOWED = { P: 1, BR: 1, B: 1, STRONG: 1, I: 1, EM: 1, U: 1, S: 1, STRIKE: 1, UL: 1, OL: 1, LI: 1, H3: 1, H4: 1, BLOCKQUOTE: 1, A: 1, DIV: 1, SPAN: 1 };
var DROP = { SCRIPT: 1, STYLE: 1, IFRAME: 1, OBJECT: 1, EMBED: 1, TEMPLATE: 1, NOSCRIPT: 1 };
function sanitizeHtml(html) {
  var doc = new DOMParser().parseFromString('<body>' + (html || '') + '</body>', 'text/html');
  var out = document.createElement('div');
  (function walk(node, parent) {
    Array.prototype.slice.call(node.childNodes).forEach(function (c) {
      if (c.nodeType === 3) { parent.appendChild(document.createTextNode(c.nodeValue)); return; }
      if (c.nodeType !== 1 || DROP[c.tagName]) return;
      if (!ALLOWED[c.tagName]) { walk(c, parent); return; }
      var n = document.createElement(c.tagName.toLowerCase());
      if (c.tagName === 'A') {
        var href = (c.getAttribute('href') || '').trim();
        if (/^(https?:\/\/|mailto:)/i.test(href)) { n.setAttribute('href', href); n.setAttribute('target', '_blank'); n.setAttribute('rel', 'noopener noreferrer'); }
      }
      parent.appendChild(n);
      if (c.tagName !== 'BR') walk(c, n);
    });
  })(doc.body, out);
  return out.innerHTML;
}
/* Beschreibung als lesbarer Text mit Zeilenumbruechen (fuer die Kalenderdatei) */
function htmlToText(html) {
  var t = sanitizeHtml(html || '').replace(/<li>/gi, '\u2022 ').replace(/<br\s*\/?>/gi, '\n').replace(/<\/(p|li|h3|h4|div|blockquote|ul|ol)>/gi, '\n').replace(/<[^>]+>/g, '');
  var d = document.createElement('textarea'); d.innerHTML = t;
  return d.value.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}
function plainText(html) { var d = document.createElement('div'); d.innerHTML = sanitizeHtml(html); return (d.textContent || '').trim(); }

function appTitleHtml(t) { var i = t.indexOf('@'); return i < 0 ? esc(t) : esc(t.slice(0, i)) + '<span class="at">' + esc(t.slice(i)) + '</span>'; }

/* ====================================================== Validierung (gemeinsam fuer Formular & Demo-Speicher) */
function validateEvent(v, admin) {
  var e = {};
  var t = (v.title || '').trim(); if (t.length < 3) e.title = 'Bitte gib einen Titel mit mindestens 3 Zeichen an.'; else if (t.length > 100) e.title = 'Der Titel darf höchstens 100 Zeichen lang sein.';
  var he = (v.hostEmail || '').trim(); if (!validEmail(he)) e.hostEmail = 'Bitte gib eine gültige E-Mail-Adresse an.';
  var hn = (v.host || '').trim(); if (hn.length < 2) e.host = 'Bitte gib deinen Namen an.'; else if (hn.length > 80) e.host = 'Der Name darf höchstens 80 Zeichen lang sein.';
  if (v.category !== 'dienstlich' && v.category !== 'privat') e.category = 'Bitte wähle „Dienstlich“ oder „Privat“.';
  if (!v.date) e.date = 'Bitte wähle einen Tag (Montag bis Freitag).'; else if (!admin && v.date < ymd(new Date())) e.date = 'Der Tag liegt in der Vergangenheit.'; else if (!isWeekday(parseYmd(v.date))) e.date = 'Veranstaltungen sind nur von Montag bis Freitag möglich.';
  if (!v.duration) e.duration = 'Bitte wähle die Dauer (maximal 2 Stunden).'; else if (v.duration < 15 || v.duration > 120 || v.duration % 15) e.duration = 'Die Dauer muss zwischen 15 und 120 Minuten liegen.';
  if (!v.start) e.start = 'Bitte wähle die Startzeit.';
  else if (!e.duration && !inWindow(toMin(v.start), v.duration)) e.start = 'Die Veranstaltung muss komplett zwischen 06:00–09:00 Uhr oder 17:00–20:00 Uhr liegen.';
  if (!e.date && !e.start && !admin && startDate(v) <= new Date()) e.start = 'Der Termin muss in der Zukunft liegen.';
  if (TYPES.indexOf(v.type) < 0) e.type = 'Bitte wähle die Art der Veranstaltung.';
  if (!v.category || (TOPICS[v.category] || []).indexOf(v.topic) < 0) e.topic = 'Bitte wähle ein Thema.';
  var c = Number(v.capacity); if (!c || c < 1 || c > MAX_CAP || Math.floor(c) !== c) e.capacity = 'Bitte gib eine Teilnehmendenzahl zwischen 1 und ' + MAX_CAP + ' an.';
  if (!v.teamsLink || !validTeams(v.teamsLink.trim())) e.teamsLink = 'Bitte gib einen gültigen Link zu einem Microsoft-Teams-Meeting an (https://teams.microsoft.com/…).';
  if (plainText(v.description).length < 10) e.description = 'Bitte beschreibe die Veranstaltung mit mindestens 10 Zeichen.';
  return e;
}

/* ====================================================== Testdaten */
function nextWeekdays(n, from) { var out = [], d = new Date(from || new Date()); d.setHours(0, 0, 0, 0); while (out.length < n) { d.setDate(d.getDate() + 1); if (isWeekday(d)) out.push(ymd(d)); } return out; }
function lastWeekday() { var d = new Date(); d.setHours(0, 0, 0, 0); do { d.setDate(d.getDate() - 1); } while (!isWeekday(d)); return ymd(d); }
var PAIRS = [['#001957', '#155784'], ['#155784', '#00b7bd'], ['#109da8', '#5b7a03'], ['#c47d47', '#583720'], ['#3875a6', '#001957'], ['#759a03', '#155784'], ['#f79506', '#a45f33'], ['#583720', '#c47d47']];
function makeImage(seed, size) {
  var c = document.createElement('canvas'); c.width = c.height = size || 320; var x = c.getContext('2d'), s = c.width;
  var p = PAIRS[seed % PAIRS.length]; var g = x.createLinearGradient(0, 0, s, s); g.addColorStop(0, p[0]); g.addColorStop(1, p[1]); x.fillStyle = g; x.fillRect(0, 0, s, s);
  var r = seed * 9301 + 49297;
  function rnd() { r = (r * 9301 + 49297) % 233280; return r / 233280; }
  for (var i = 0; i < 7; i++) { x.beginPath(); x.fillStyle = 'rgba(255,255,255,' + (0.05 + rnd() * .16) + ')'; x.arc(rnd() * s, rnd() * s, s * (.08 + rnd() * .3), 0, 6.283); x.fill(); }
  x.strokeStyle = 'rgba(255,255,255,.55)'; x.lineWidth = s * .018; x.beginPath(); x.arc(s * .5, s * .5, s * .22, 0, 6.283); x.stroke();
  return c.toDataURL('image/jpeg', .72);
}
function descHtml(intro, points) { return '<p>' + intro + '</p><h3>Das erwartet dich</h3><ul>' + points.map(function (p) { return '<li>' + p + '</li>'; }).join('') + '</ul><p>Bring gern eigene Fragen und Beispiele mit. Die Sitzung findet online in Microsoft Teams statt.</p>'; }
function mapType(name) { if (TYPES.indexOf(name) >= 0) return name; var i = DEFAULT_TAX.types.indexOf(name); return TYPES[(i < 0 ? 0 : i) % TYPES.length]; }
function mapTopic(cat, name) { if (TOPICS[cat].indexOf(name) >= 0) return name; var i = DEFAULT_TAX.topics[cat].indexOf(name); var l = TOPICS[cat]; return l[(i < 0 ? 0 : i) % l.length]; }
function buildTestData() {
  var d = nextWeekdays(12), past = lastWeekday();
  var L = 'https://teams.microsoft.com/l/meetup-join/19%3ameeting_TESTDATEN%40thread.v2/0';
  var H = ['Anna Berger', 'Markus Vogel', 'Sabine Krüger', 'Tobias Lang', 'Julia Neumann', 'Stefan Roth', 'Katrin Albrecht', 'Jonas Peters', 'Miriam Kessler', 'Oliver Sander'];
  // [Titel, Host, Kategorie, Art, Thema, Tag-Index, Start, Dauer, Kapazitaet, gebucht, Bild, Beschreibung]
  var rows = [
    ['Erstgespräche, die im Kopf bleiben', 0, 'dienstlich', 'Workshop', 'vertrieblich', 0, '06:30', 60, 8, 8, 1, descHtml('Wie starte ich ein Gespräch, das überzeugt? Wir üben gemeinsam Einstiege und Fragetechniken.', ['Kurze Impulse zu Gesprächseinstiegen', 'Rollenspiele in Kleingruppen', 'Feedback aus dem Kollegenkreis'])],
    ['Kundenempfehlungen aktiv gewinnen', 1, 'dienstlich', 'Best Practice', 'vertrieblich', 1, '17:30', 45, 12, 9, 1, descHtml('Drei Kolleginnen und Kollegen zeigen, wie sie Empfehlungen systematisch in den Alltag einbauen.', ['Konkrete Formulierungen', 'Der richtige Zeitpunkt', 'Fehler, die du vermeiden kannst'])],
    ['Social Selling: Sichtbar werden ohne Werbesprache', 2, 'dienstlich', 'Austausch', 'vertrieblich', 2, '07:00', 30, 20, 4, 0, descHtml('Offener Austausch zu Erfahrungen mit sozialen Netzwerken im Vertriebsalltag.', ['Was hat bei euch funktioniert?', 'Datenschutz und Compliance im Blick', 'Kleine Routinen für jede Woche'])],
    ['Schadenregulierung: typische Stolpersteine', 3, 'dienstlich', 'Workshop', 'fachlich', 0, '17:00', 90, 15, 10, 1, descHtml('Wir gehen anhand echter Fälle typische Fehler in der Schadenregulierung durch.', ['Fallbeispiele aus dem Außendienst', 'Checkliste für die Erstaufnahme', 'Zeit für offene Fragen'])],
    ['Neue Tarifmerkmale in der Hausratversicherung', 4, 'dienstlich', 'Best Practice', 'fachlich', 3, '08:00', 60, 30, 3, 0, descHtml('Ein Überblick über die wichtigsten Änderungen und wie du sie im Kundengespräch erklärst.', ['Die Änderungen in Kürze', 'Beispielrechnungen', 'Argumente für die Beratung'])],
    ['Fragen & Antworten zur Betriebshaftpflicht', 5, 'dienstlich', 'Austausch', 'fachlich', 4, '17:15', 30, 6, 5, 1, descHtml('Schnelle Runde: Bringe deine Fragen zur Betriebshaftpflicht mit, wir klären sie gemeinsam.', ['Deckungsumfang im Alltag', 'Abgrenzung zu anderen Sparten', 'Erfahrungen aus Beratungsgesprächen'])],
    ['Kurzimpuls: Cyber-Risiken für kleine Betriebe', 6, 'dienstlich', 'Best Practice', 'fachlich', 5, '06:00', 15, 40, 12, 0, descHtml('Ein Kurzimpuls in fünfzehn Minuten. Ideal vor dem ersten Termin des Tages.', ['Die drei häufigsten Angriffswege', 'Was Kunden wirklich fragen'])],
    ['Vergangener Workshop: Zeitmanagement im Außendienst', 7, 'dienstlich', 'Workshop', 'fachlich', -1, '17:00', 60, 15, 11, 1, descHtml('Dieser Termin liegt in der Vergangenheit und erscheint nur im Admin-Bereich.', ['Testfall: vergangene Veranstaltung'])],
    ['Lauftreff-Talk: 10 Kilometer unter 55 Minuten', 8, 'privat', 'Austausch', 'Sport', 1, '06:15', 45, 15, 6, 1, descHtml('Erfahrungen, Trainingspläne und Motivation für alle, die laufen oder damit anfangen möchten.', ['Trainingspläne im Vergleich', 'Laufen bei jedem Wetter', 'Gemeinsame Ziele setzen'])],
    ['Rückenfit am Morgen', 9, 'privat', 'Workshop', 'Sport', 2, '06:30', 30, 25, 2, 0, descHtml('Leichte Übungen für einen entspannten Rücken. Du brauchst nur eine Matte oder ein Handtuch.', ['Mobilisation', 'Kräftigung', 'Tipps für den Schreibtisch'])],
    ['Fotografie mit dem Smartphone', 0, 'privat', 'Workshop', 'Freizeit', 3, '18:00', 60, 12, 12, 1, descHtml('Bessere Fotos ohne teure Kamera. Licht, Bildaufbau und Bearbeitung in einer Stunde.', ['Licht und Perspektive', 'Bildaufbau', 'Schnelle Bearbeitung'])],
    ['Brettspiel-Neuheiten des Jahres', 1, 'privat', 'Austausch', 'Freizeit', 6, '18:30', 90, 10, 7, 0, descHtml('Wir stellen unsere Lieblingsspiele vor und tauschen Empfehlungen aus.', ['Kennenlernspiele', 'Familienspiele', 'Für den Spieleabend zu zweit'])],
    ['Meal Prep für die Arbeitswoche', 2, 'privat', 'Best Practice', 'Essen & Trinken', 4, '17:45', 60, 20, 16, 1, descHtml('Einmal kochen, die ganze Woche gut essen. Zeitpläne, Rezepte und Aufbewahrung.', ['Wochenplan in 20 Minuten', 'Rezeptideen', 'Haltbarkeit und Lagerung'])],
    ['Kaffee-Cupping für Einsteiger', 3, 'privat', 'Workshop', 'Essen & Trinken', 7, '07:30', 45, 8, 1, 0, descHtml('Wie schmeckt eigentlich guter Kaffee? Wir lernen, Aromen zu erkennen.', ['Sorten und Röstungen', 'Verkostung mit Bewertungsbogen'])],
    ['Wandern in Südtirol: Routen und Unterkünfte', 4, 'privat', 'Best Practice', 'Reisen', 5, '17:30', 75, 18, 4, 1, descHtml('Kolleginnen berichten von ihren Lieblingsrouten, Hütten und Preisen.', ['Routen für Einsteiger und Erfahrene', 'Anreise ohne Auto', 'Beste Reisezeit'])],
    ['Interrail-Erfahrungen: Europa mit dem Zug', 5, 'privat', 'Austausch', 'Reisen', 8, '18:00', 60, 14, 9, 0, descHtml('Wie plant man eine Zugreise durch mehrere Länder? Erfahrungen und Tipps.', ['Tickets und Reservierungen', 'Packliste', 'Städte für einen Zwischenstopp'])],
    ['Gartenjahr planen: Hochbeet und Balkon', 6, 'privat', 'Austausch', 'Sonstiges', 9, '17:15', 45, 16, 2, 1, descHtml('Was pflanze ich wann? Wir tauschen Erfahrungen zu Hochbeet, Balkon und Kräutergarten.', ['Aussaatkalender', 'Schädlinge natürlich abwehren'])],
    ['Ehrenamt: So fängt es an', 7, 'privat', 'Best Practice', 'Sonstiges', 10, '07:00', 60, 20, 5, 0, descHtml('Menschen aus unserem Kollegenkreis erzählen, wie sie sich engagieren und was sie dabei lernen.', ['Passende Aufgabe finden', 'Zeitaufwand realistisch planen'])],
    ['Langer Titel als Testfall: Beratungsqualität, Kundenzufriedenheit und Abschlussquote verbessern', 8, 'dienstlich', 'Workshop', 'vertrieblich', 11, '17:00', 120, 12, 6, 1, descHtml('Testfall für einen sehr langen Titel und die volle Zeitspanne von zwei Stunden.', ['Zwei Stunden Praxis', 'Gruppenarbeit', 'Ergebnisse teilen'])],
    ['Abendtermin: Noch ein Platz frei (Testfall)', 9, 'dienstlich', 'Austausch', 'fachlich', 0, '19:30', 30, 6, 5, 0, descHtml('Testfall: nur noch ein freier Platz.', ['Genau ein Platz'])],
    ['Genau fünf Plätze frei (Testfall)', 0, 'privat', 'Austausch', 'Freizeit', 7, '06:00', 45, 10, 5, 1, descHtml('Testfall: An der Grenze zu „fast ausgebucht“.', ['Fünf Plätze frei'])]
  ];
  var names = ['Lena Hoffmann', 'Paul Richter', 'Nina Wagner', 'Felix Braun', 'Clara Schulz', 'Max Keller', 'Sophie Lorenz', 'David Winter', 'Emma Fuchs', 'Lukas Brandt', 'Mia Schäfer', 'Ben Krause', 'Hanna Seidel', 'Leon Köhler', 'Laura Bauer', 'Tim Engel', 'Marie Vogt', 'Jan Ludwig', 'Lisa Arnold', 'Noah Frank', 'Eva Beck', 'Finn Otto', 'Ida Simon', 'Ole Graf', 'Lotta Voigt', 'Anton Busch', 'Zoe Ernst', 'Emil Kraus', 'Lea Pohl', 'Karl Jung', 'Rosa Horn', 'Elias Sauer', 'Greta Franke', 'Theo Böhm', 'Frieda Lang', 'Jakob Haas', 'Paula Roth', 'Milan Wolf', 'Nele Dietrich', 'Jonas Klein'];
  // Grossveranstaltung mit der maximal moeglichen Teilnehmendenzahl
  rows.push(['Großveranstaltung mit 50 Plätzen (Testfall)', 3, 'dienstlich', 'Best Practice', 'fachlich', 8, '07:00', 90, MAX_CAP, 12, 1, descHtml('Testfall: Höchstzahl von 50 Teilnehmenden.', ['Viele Plätze', 'Höchstgrenze laut Regeln'])]);
  // Abdeckung: Jedes aktuelle Thema und jede aktuelle Art kommt mindestens einmal vor (auch neu angelegte). Einstellungen bleiben unveraendert.
  var usedT = {}, usedY = {};
  rows.forEach(function (r) { usedT[r[2] + '|' + mapTopic(r[2], r[4])] = 1; usedY[mapType(r[3])] = 1; });
  var starts = ['06:30', '17:30', '07:15', '18:15', '06:45', '19:00'], extra = 0;
  function extraRow(title, cat, type, topic) { extra++; rows.push([title, extra + 2, cat, type, topic, 1 + (extra % 10), starts[extra % starts.length], [30, 45, 60][extra % 3], 15, extra % 6, extra % 2, descHtml('Automatisch erzeugter Testtermin, damit dieses Thema bzw. diese Art im Katalog vorkommt.', ['Testinhalt eins', 'Testinhalt zwei'])]); }
  ['dienstlich', 'privat'].forEach(function (c) { TOPICS[c].forEach(function (t, i) { if (!usedT[c + '|' + t]) { extraRow('Testtermin Thema: ' + capFirst(t), c, TYPES[(i + extra) % TYPES.length], t); usedY[TYPES[(i + extra - 1) % TYPES.length]] = 1; } }); });
  TYPES.forEach(function (ty, i) { if (!usedY[ty]) { var c = i % 2 ? 'privat' : 'dienstlich'; extraRow('Testtermin Art: ' + ty, c, ty, TOPICS[c][i % TOPICS[c].length]); } });
  var events = [], bookings = [], ni = 0;
  rows.forEach(function (r, i) {
    var id = 'x' + pad(i + 1);
    var e = { id: id, title: r[0], host: H[r[1] % H.length], hostEmail: H[r[1] % H.length].toLowerCase().replace(/ü/g, 'ue').replace(/ /g, '.') + '@example.org', category: r[2], type: mapType(r[3]), topic: mapTopic(r[2], r[4]), date: r[5] < 0 ? past : d[r[5]], start: r[6], duration: r[7], capacity: r[8], teamsLink: L, description: r[11], imageData: r[10] ? makeImage(i + 1, 320) : '', isTest: true };
    events.push(e);
    for (var b = 0; b < r[9]; b++) { var nm = names[ni++ % names.length]; bookings.push({ eventId: id, name: nm, email: nm.toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/[^a-z]+/g, '.') + '.' + (i + 1) + '@example.org' }); }
  });
  return { events: events, bookings: bookings };
}

/* ====================================================== Kalender (ICS) */
function icsEsc(t) { return String(t || '').replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n'); }
/* Zeilenumbruch nach RFC 5545: hoechstens 75 Bytes je Zeile, Mehrbyte-Zeichen werden nicht getrennt */
function fold(l) {
  var o = '', n = 0;
  for (var i = 0; i < l.length; i++) {
    var ch = l[i], cp = l.codePointAt(i); if (cp > 0xffff) { ch = l.substr(i, 2); i++; }
    var w = cp < 0x80 ? 1 : cp < 0x800 ? 2 : cp < 0x10000 ? 3 : 4;
    if (n + w > 74) { o += '\r\n '; n = 1; }
    o += ch; n += w;
  }
  return o;
}
function manageUrl(code) { return location.href.split('#')[0] + '#/anmeldung?code=' + encodeURIComponent(code); }
function mailHtml(m) {
  var font = "font-family:'Segoe UI',Arial,Helvetica,sans-serif;", ink = '#001957', grey = '#707070';
  var hd = contrast(m.bg, '#ffffff') >= 4.5 ? m.bg : ink, soft = mixHex(m.bg, m.text, .78), tint = mixHex(m.bg, '#ffffff', .9);
  function pill(t, bg, fg) { return '<span style="display:inline-block;background:' + bg + ';color:' + fg + ';font-size:12px;font-weight:700;padding:4px 10px;border-radius:12px;margin:0 6px 6px 0">' + esc(t) + '</span>'; }
  function row(k, v) { return '<tr><td style="width:120px;padding:9px 0;border-top:1px solid #ececec;color:' + grey + ';vertical-align:top">' + k + '</td><td style="padding:9px 0;border-top:1px solid #ececec;color:' + ink + ';font-weight:600;vertical-align:top">' + v + '</td></tr>'; }
  var h_ = [];
  h_.push('<!doctype html><html lang="de"><head><meta charset="utf-8"></head><body style="margin:0;padding:0;background:#f5f5f5;' + font + '">');
  h_.push('<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5"><tr><td align="center" style="padding:24px 12px">');
  h_.push('<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden">');
  h_.push('<tr><td style="background:' + m.bg + ';padding:28px 32px 30px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>');
  h_.push('<td style="vertical-align:middle">' + (m.logo ? '<img src="' + m.logo + '" width="88" alt="R+V" style="display:block;border:0">' : '<span style="' + font + 'font-size:24px;font-weight:800;color:' + m.text + '">R+V</span>') + '</td>');
  h_.push('<td align="right" style="vertical-align:middle;' + font + 'font-size:12px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:' + soft + '">' + esc(m.appTitle) + '</td></tr></table>');
  h_.push('<div style="' + font + 'font-size:28px;line-height:1.25;font-weight:800;color:' + m.head + ';margin:26px 0 0">Deine Buchung ist bestätigt</div>');
  h_.push('<div style="' + font + 'font-size:15px;line-height:1.5;color:' + m.text + ';margin:8px 0 0">Schön, dass du dabei bist.</div></td></tr>');
  h_.push('<tr><td style="padding:30px 32px 8px;' + font + 'color:' + ink + '"><div>' + pill(m.area, tint, hd) + pill(m.type, '#f5f5f5', ink) + pill(m.topic, '#f5f5f5', ink) + '</div>');
  h_.push('<div style="font-size:22px;line-height:1.3;font-weight:800;color:' + hd + ';margin:6px 0 20px">' + esc(m.title) + '</div>');
  h_.push('<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:15px;line-height:1.45">' + row('Datum', esc(m.date)) + row('Uhrzeit', esc(m.time)) + row('Dauer', m.duration + ' Minuten') + row('Durchführung', esc(m.host)) + '</table>');
  if (m.desc) h_.push('<div style="font-size:14px;line-height:1.5;color:' + ink + ';margin:18px 0 0"><b>Worum geht es?</b><br>' + esc(m.desc).replace(/\n/g, '<br>') + '</div>');
  h_.push('<table role="presentation" cellpadding="0" cellspacing="0" style="margin:26px 0 8px"><tr><td style="background:#00dcdc;border-radius:24px"><a href="' + esc(m.teams) + '" style="display:inline-block;padding:14px 30px;' + font + 'font-size:16px;font-weight:700;color:#001957;text-decoration:none">Zur Teams-Sitzung</a></td></tr></table>');
  h_.push('<div style="font-size:12px;color:' + grey + ';word-break:break-all">' + esc(m.teams) + '</div>');
  h_.push('<div style="font-size:14px;color:' + grey + ';margin:14px 0 0">Bewahre diesen Kalendereintrag und den Buchungscode auf. Unter „Meine Anmeldung“ findest du Teams-Link und Kalendereintrag jederzeit wieder.</div></td></tr>');
  h_.push('<tr><td style="padding:20px 32px 32px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fff4e0;border-radius:12px;border-left:4px solid #eb6504"><tr><td style="padding:18px 20px;' + font + 'color:' + ink + '">');
  h_.push('<div style="font-size:12px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:#a04400">Dein Buchungscode</div>');
  h_.push('<div style="font-family:Consolas,\'Courier New\',monospace;font-size:26px;font-weight:700;letter-spacing:3px;margin:6px 0 10px;color:' + ink + '">' + esc(m.code) + '</div>');
  h_.push('<div style="font-size:14px;line-height:1.5">Buchung ansehen oder stornieren: <a href="' + esc(m.cancel) + '" style="color:#0c7f89;font-weight:700">Meine Anmeldung</a> (Eingabe des Buchungscodes genügt)</div></td></tr></table></td></tr>');
  h_.push('<tr><td style="background:#f5f5f5;padding:18px 32px;' + font + 'font-size:12px;line-height:1.5;color:' + grey + '">' + esc(m.appTitle) + ' &middot; Informelles Lernen im Außendienst<br>Dieser Kalendereintrag wurde automatisch erstellt.</td></tr>');
  h_.push('<tr><td style="background:' + m.bg + ';height:6px;line-height:6px;font-size:0">&nbsp;</td></tr></table></td></tr></table></body></html>');
  return h_.join('');
}
/* Beschreibung des Kalendereintrags: Inhalt und Aufbau wie die frueher versendete Bestaetigung, inkl. Buchungscode */
function icsDescriptions(ev, code) {
  var c = ev.category, light = lum(COLORS[c].toLowerCase()) > .35, url = manageUrl(code), desc = htmlToText(ev.description).slice(0, 700);
  var html = mailHtml({ appTitle: state.settings.appTitle, area: CAT_LABEL[c], type: ev.type, topic: ev.topic, bg: COLORS[c], head: HEADINGS[c], text: TEXTS[c], logo: '', name: '', title: ev.title, date: dateLong(ev.date), time: ev.start + ' \u2013 ' + endHm(ev) + ' Uhr', duration: ev.duration, host: ev.host, teams: ev.teamsLink, code: code, cancel: url, desc: desc });
  html = html.replace(/<!doctype html>.*?<body[^>]*>/i, '').replace(/<\/body><\/html>/i, ''); html = '<div style="background:#f5f5f5">' + html + '</div>';
  var plain = ['DEINE BUCHUNG IST BESTÄTIGT', '', ev.title, CAT_LABEL[c] + ' \u00b7 ' + ev.type + ' \u00b7 ' + ev.topic, '',
    'Datum:         ' + dateLong(ev.date), 'Uhrzeit:       ' + ev.start + ' \u2013 ' + endHm(ev) + ' Uhr', 'Dauer:         ' + ev.duration + ' Minuten', 'Durchführung:  ' + ev.host, '',
    'Teams-Sitzung: ' + ev.teamsLink, '', 'BUCHUNGSCODE:  ' + code, 'Buchung ansehen oder stornieren: ' + url, ''].concat(desc ? ['Worum geht es?', desc, ''] : []).concat(['Bewahre diesen Kalendereintrag und den Buchungscode auf.', state.settings.appTitle + ' \u00b7 Informelles Lernen im Außendienst']).join('\n');
  return { html: html, plain: plain };
}
function buildIcs(ev, code) {
  var s = startDate(ev), e = new Date(s.getTime() + ev.duration * 60000), d = icsDescriptions(ev, code);
  function f(x) { return x.getFullYear() + pad(x.getMonth() + 1) + pad(x.getDate()) + 'T' + pad(x.getHours()) + pad(x.getMinutes()) + '00'; }
  var u = new Date(); var stamp = u.getUTCFullYear() + pad(u.getUTCMonth() + 1) + pad(u.getUTCDate()) + 'T' + pad(u.getUTCHours()) + pad(u.getUTCMinutes()) + pad(u.getUTCSeconds()) + 'Z';
  var L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//R+V//LearnTogether//DE', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    'BEGIN:VTIMEZONE', 'TZID:Europe/Berlin', 'BEGIN:STANDARD', 'DTSTART:19701025T030000', 'RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU', 'TZOFFSETFROM:+0200', 'TZOFFSETTO:+0100', 'TZNAME:CET', 'END:STANDARD',
    'BEGIN:DAYLIGHT', 'DTSTART:19700329T020000', 'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU', 'TZOFFSETFROM:+0100', 'TZOFFSETTO:+0200', 'TZNAME:CEST', 'END:DAYLIGHT', 'END:VTIMEZONE',
    'BEGIN:VEVENT', 'UID:' + code.replace(/[^A-Z0-9]/g, '') + '@learntogether', 'DTSTAMP:' + stamp, 'DTSTART;TZID=Europe/Berlin:' + f(s), 'DTEND;TZID=Europe/Berlin:' + f(e),
    'SUMMARY:' + icsEsc(ev.title), 'DESCRIPTION:' + icsEsc(d.plain), 'X-ALT-DESC;FMTTYPE=text/html:' + icsEsc(d.html), 'LOCATION:Microsoft Teams', 'URL:' + ev.teamsLink, 'STATUS:CONFIRMED',
    'BEGIN:VALARM', 'TRIGGER:-PT15M', 'ACTION:DISPLAY', 'DESCRIPTION:Erinnerung', 'END:VALARM', 'END:VEVENT', 'END:VCALENDAR'];
  return L.map(fold).join('\r\n') + '\r\n';
}

/* ====================================================== Datenzugriff */
function ApiErr(code, message, status) { var e = new Error(message); e.code = code; e.status = status; return e; }
var adminToken = sess.get('lt_admin') || '';
var mode = 'local';

var Server = {
  call: function (action, body, admin) {
    var o = { method: body ? 'POST' : 'GET', headers: {}, cache: 'no-store' };
    if (body) { o.body = JSON.stringify(body); o.headers['Content-Type'] = 'application/json'; }
    if (admin && adminToken) o.headers['X-Admin-Token'] = adminToken;
    return fetch(API + '?action=' + action, o).then(function (r) {
      return r.json().catch(function () { throw ApiErr('server', 'Der Server hat unerwartet geantwortet.', r.status); }).then(function (j) {
        if (!j.ok) { var st = j.error === 'auth' ? 401 : r.status; if (st === 401 && admin) { adminToken = ''; sess.del('lt_admin'); } throw ApiErr(j.error, j.message, st); }
        return j;
      });
    }, function () { throw ApiErr('network', 'Der Server ist nicht erreichbar. Bitte prüfe deine Verbindung.'); });
  },
  settings: function () { return this.call('settings').then(function (j) { return { appTitle: j.appTitle, labels: j.labels, topics: j.topics, colors: j.colors, headings: j.headings, texts: j.texts, types: j.types, hero: j.hero }; }); },
  adminSaveTaxonomy: function (p) { return this.call('adminSaveTaxonomy', p, true).then(function (j) { return { labels: j.labels, topics: j.topics, colors: j.colors, headings: j.headings, texts: j.texts, types: j.types }; }); },
  events: function () { return this.call('events').then(function (j) { return j.events; }); },
  createEvent: function (ev) { return this.call('createEvent', { event: ev }); },
  book: function (id, name, email) { return this.call('book', { eventId: id, name: name, email: email }); },
  cancel: function (code) { return this.call('cancel', { code: code }); },
  lookup: function (code) { return this.call('lookup', { code: code }); },
  eventLookup: function (code) { return this.call('eventLookup', { code: code }); },
  login: function (pw) { return this.call('login', { password: pw }).then(function (j) { adminToken = j.token; sess.set('lt_admin', j.token); }); },
  adminEvents: function () { return this.call('adminEvents', null, true).then(function (j) { return j.events; }); },
  adminSaveEvent: function (ev) { return this.call('adminSaveEvent', { event: ev }, true); },
  adminDeleteEvent: function (id) { return this.call('adminDeleteEvent', { id: id }, true); },
  adminDeleteBooking: function (id) { return this.call('adminDeleteBooking', { id: id }, true); },
  adminSettings: function () { return this.call('adminSettings', null, true); },
  adminSaveSettings: function (s) { return this.call('adminSaveSettings', s, true); },
  adminChangePassword: function (c, n) { return this.call('adminChangePassword', { current: c, newPassword: n }, true).then(function (j) { adminToken = j.token; sess.set('lt_admin', j.token); }); },
  adminTestData: function (m) { var p = { mode: m }; if (m === 'load') { var t = buildTestData(); p.events = t.events; p.bookings = t.bookings; } return this.call('adminTestData', p, true); }
};

var Local = (function () {
  var data = null, cfg = null;
  function load() {
    if (data) return;
    try { data = JSON.parse(store.get('lt_data') || 'null'); } catch (e) { data = null; }
    try { cfg = JSON.parse(store.get('lt_cfg') || 'null'); } catch (e) { cfg = null; }
    if (!data) { data = { events: [], bookings: [] }; }
    data.events.forEach(function (e) { if (!e.code) e.code = newCode(10); });
    if (!cfg) cfg = { appTitle: DEFAULT_TITLE, pw: 'RuVTest1234' };
    if (!cfg.labels) cfg.labels = JSON.parse(JSON.stringify(DEFAULT_TAX.labels));
    if (!cfg.topics) cfg.topics = JSON.parse(JSON.stringify(DEFAULT_TAX.topics));
    if (!cfg.hero) cfg.hero = { title: DEFAULT_HERO.title, text: DEFAULT_HERO.text };
    if (!cfg.types) cfg.types = DEFAULT_TAX.types.slice();
    if (!cfg.headings) cfg.headings = JSON.parse(JSON.stringify(DEFAULT_TAX.headings));
    if (!cfg.texts) cfg.texts = JSON.parse(JSON.stringify(DEFAULT_TAX.texts));
    if (!cfg.colors) cfg.colors = JSON.parse(JSON.stringify(DEFAULT_TAX.colors));
    applyTaxonomy(cfg);
    if (!store.get('lt_seeded')) { store.set('lt_seeded', '1'); insertTest(); save(); }
  }
  function save() { store.set('lt_data', JSON.stringify(data)); store.set('lt_cfg', JSON.stringify(cfg));  }
  function insertTest() {
    data.events = data.events.filter(function (e) { return !e.isTest; });
    data.bookings = data.bookings.filter(function (b) { return !b.isTest; });
    var t = buildTestData();
    t.events.forEach(function (e) { e.id = 't-' + e.id; e.code = newCode(10); e.created = new Date().toISOString(); data.events.push(e); });
    t.bookings.forEach(function (b) { data.bookings.push({ id: 't-' + rid(6), eventId: 't-' + b.eventId, name: b.name, email: b.email, code: newCode(), created: new Date().toISOString(), isTest: true }); });
    return t;
  }
  function detail(e) { var o = {}; Object.keys(e).forEach(function (k) { if (k !== 'imageData' && k !== 'hostEmail' && k !== 'isTest' && k !== 'created' && k !== 'code') o[k] = e[k]; }); o.image = e.imageData || null; return o; }
  function booked(id) { return data.bookings.filter(function (b) { return b.eventId === id; }).length; }
  function pub(e) { var o = {}; Object.keys(e).forEach(function (k) { if (k !== 'teamsLink' && k !== 'imageData' && k !== 'hostEmail' && k !== 'code') o[k] = e[k]; }); o.booked = booked(e.id); o.image = e.imageData || null; return o; }
  function fail(code, msg) { return Promise.reject(ApiErr(code, msg)); }
  function readEvent(v, target, admin) {
    var er = validateEvent(v, admin); var k = Object.keys(er);
    if (k.length) throw ApiErr('invalid', er[k[0]]);
    target.title = v.title.trim(); target.host = v.host.trim(); target.hostEmail = (v.hostEmail || '').trim(); target.category = v.category; target.type = v.type; target.topic = v.topic;
    target.date = v.date; target.start = v.start; target.duration = Number(v.duration); target.capacity = Number(v.capacity); target.teamsLink = v.teamsLink.trim();
    target.description = sanitizeHtml(v.description);
    if (v.imageData) target.imageData = v.imageData; else if (v.removeImage) target.imageData = '';
    return target;
  }
  function wrap(fn) { return new Promise(function (res, rej) { try { load(); res(fn()); } catch (e) { rej(e); } }); }
  return {
    settings: function () { return wrap(function () { return { appTitle: cfg.appTitle, labels: cfg.labels, topics: cfg.topics, colors: cfg.colors, headings: cfg.headings, texts: cfg.texts, types: cfg.types, hero: cfg.hero }; }); },
    adminSaveTaxonomy: function (p) {
      return wrap(function () {
        function names(list, what, max, old, usedFn, map) {
          var out = [];
          list.forEach(function (it) {
            var n = (it.name || '').trim(); if (n.length < 1 || n.length > 40) throw ApiErr('invalid', 'Ein Eintrag (' + what + ') muss zwischen 1 und 40 Zeichen lang sein.');
            if (out.some(function (x) { return x.toLowerCase() === n.toLowerCase(); })) throw ApiErr('invalid', '"' + n + '" gibt es doppelt.');
            out.push(n); if (it.orig) map[it.orig] = n;
          });
          if (!out.length) throw ApiErr('invalid', 'Es muss mindestens ein Eintrag (' + what + ') bleiben.');
          if (out.length > max) throw ApiErr('invalid', 'Höchstens ' + max + ' Einträge (' + what + ') sind möglich.');
          old.forEach(function (ot) { if (Object.prototype.hasOwnProperty.call(map, ot)) return; var used = usedFn(ot); if (used) throw ApiErr('invalid', '"' + ot + '" wird von ' + used + ' Veranstaltung(en) verwendet und kann nicht gelöscht werden. Bitte ändere zuerst diese Veranstaltungen.'); });
          return out;
        }
        var cats = ['dienstlich', 'privat'], nl, nc, nh, nx, nt = {}, maps = {}, ny, tmap = {};
        if (p.labels) {
          var c1 = (p.labels.dienstlich || '').trim(), c2 = (p.labels.privat || '').trim();
          if (c1.length < 2 || c1.length > 30 || c2.length < 2 || c2.length > 30) throw ApiErr('invalid', 'Die Bezeichnungen der Themenbereiche müssen zwischen 2 und 30 Zeichen lang sein.');
          if (c1.toLowerCase() === c2.toLowerCase()) throw ApiErr('invalid', 'Die beiden Themenbereiche brauchen unterschiedliche Bezeichnungen.');
          nl = { dienstlich: c1, privat: c2 };
        }
        if (p.colors || p.headings || p.texts) {
          nc = {}; nh = {}; nx = {};
          cats.forEach(function (c) {
            function pick(o, cur) { return ((o ? o[c] : cur[c]) || '').trim().toLowerCase(); }
            var bg = pick(p.colors, cfg.colors), hd = pick(p.headings, cfg.headings), tx = pick(p.texts, cfg.texts);
            var er = pairError((nl || cfg.labels)[c], bg, hd, tx); if (er) throw ApiErr('invalid', er);
            nc[c] = bg; nh[c] = hd; nx[c] = tx;
          });
        }
        if (p.topics) {
          cats.forEach(function (cat) { var map = {}; nt[cat] = names(p.topics[cat], 'Thema', 30, cfg.topics[cat], function (ot) { return data.events.filter(function (e) { return e.category === cat && e.topic === ot; }).length; }, map); maps[cat] = map; });
        }
        if (p.types) ny = names(p.types, 'Art', MAX_TYPES, cfg.types, function (ot) { return data.events.filter(function (e) { return e.type === ot; }).length; }, tmap);
        if (nl) cfg.labels = nl; if (nc) { cfg.colors = nc; cfg.headings = nh; cfg.texts = nx; }
        if (p.topics) { data.events.forEach(function (e) { var m = maps[e.category]; if (m && Object.prototype.hasOwnProperty.call(m, e.topic)) e.topic = m[e.topic]; }); cfg.topics = nt; }
        if (ny) { data.events.forEach(function (e) { if (Object.prototype.hasOwnProperty.call(tmap, e.type)) e.type = tmap[e.type]; }); cfg.types = ny; }
        applyTaxonomy(cfg); save();
        return { labels: cfg.labels, topics: cfg.topics, colors: cfg.colors, headings: cfg.headings, texts: cfg.texts, types: cfg.types };
      });
    },
    events: function () { return wrap(function () { var now = new Date(); return data.events.filter(function (e) { return startDate(e) > now; }).map(pub); }); },
    createEvent: function (v) { return wrap(function () { var e = readEvent(v, { id: rid(8), code: newCode(10), created: new Date().toISOString(), isTest: false }, false); data.events.push(e); save(); return { id: e.id, code: e.code }; }); },
    book: function (id, name, email) {
      return wrap(function () {
        email = email.trim().toLowerCase(); name = name.trim();
        if (name.length < 2) throw ApiErr('invalid', 'Bitte gib deinen Namen an.');
        if (!validEmail(email)) throw ApiErr('invalid', 'Bitte gib eine gültige E-Mail-Adresse an.');
        var ev = data.events.filter(function (e) { return e.id === id; })[0];
        if (!ev) throw ApiErr('notfound', 'Diese Veranstaltung gibt es nicht mehr.');
        if (startDate(ev) <= new Date()) throw ApiErr('past', 'Diese Veranstaltung hat bereits begonnen. Eine Anmeldung ist nicht mehr möglich.');
        if (data.bookings.some(function (b) { return b.eventId === id && b.email === email; })) throw ApiErr('duplicate', 'Mit dieser E-Mail-Adresse bist du bereits angemeldet.');
        if (booked(id) >= ev.capacity) throw ApiErr('full', 'Leider sind inzwischen alle Plätze vergeben. Die Anmeldung war nicht möglich.');
        var bk = { id: rid(8), eventId: id, name: name, email: email, code: newCode(), created: new Date().toISOString(), isTest: false };
        data.bookings.push(bk);
        save();
        return { code: bk.code, name: bk.name, email: bk.email, eventInfo: detail(ev) };
      });
    },
    cancel: function (code) {
      return wrap(function () {
        code = normCode(code);
        var bk = code.length < 8 ? null : data.bookings.filter(function (b) { return normCode(b.code) === code; })[0];
        if (!bk) throw ApiErr('notfound', 'Zu diesem Buchungscode wurde keine Anmeldung gefunden. Bitte prüfe die Eingabe.');
        var ev = data.events.filter(function (e) { return e.id === bk.eventId; })[0];
        if (ev && startDate(ev) <= new Date()) throw ApiErr('past', 'Die Veranstaltung hat bereits begonnen. Eine Stornierung ist nicht mehr möglich.');
        data.bookings = data.bookings.filter(function (b) { return b !== bk; }); save();
        return { title: ev ? ev.title : '', date: ev ? ev.date : '', start: ev ? ev.start : '' };
      });
    },
    lookup: function (code) {
      return wrap(function () {
        code = normCode(code);
        var bk = code.length < 8 ? null : data.bookings.filter(function (b) { return normCode(b.code) === code; })[0];
        var ev = bk ? data.events.filter(function (e) { return e.id === bk.eventId; })[0] : null;
        if (!bk || !ev) throw ApiErr('notfound', 'Zu diesem Buchungscode wurde keine Anmeldung gefunden. Bitte prüfe die Eingabe.');
        return { code: bk.code, name: bk.name, email: bk.email, eventInfo: detail(ev), canCancel: startDate(ev) > new Date() };
      });
    },
    eventLookup: function (code) {
      return wrap(function () {
        code = normCode(code);
        var ev = code.length < 10 ? null : data.events.filter(function (e) { return normCode(e.code) === code; })[0];
        if (!ev) throw ApiErr('notfound', 'Zu diesem Veranstaltungscode wurde keine Veranstaltung gefunden. Bitte prüfe die Eingabe.');
        var people = data.bookings.filter(function (b) { return b.eventId === ev.id; }).map(function (b) { return { name: b.name, created: b.created }; });
        var info = detail(ev); info.booked = people.length;
        return { code: ev.code, eventInfo: info, capacity: ev.capacity, participants: people, isPast: startDate(ev) <= new Date() };
      });
    },
    login: function (pw) { return wrap(function () { if (pw !== cfg.pw) throw ApiErr('password', 'Das Passwort ist nicht korrekt.'); adminToken = 'local'; sess.set('lt_admin', 'local'); }); },
    adminEvents: function () { return wrap(function () { return data.events.map(function (e) { var o = pub(e); o.teamsLink = e.teamsLink; o.hostEmail = e.hostEmail || ''; o.code = e.code || ''; o.bookings = data.bookings.filter(function (b) { return b.eventId === e.id; }); return o; }); }); },
    adminSaveEvent: function (v) {
      return wrap(function () {
        var e = data.events.filter(function (x) { return x.id === v.id; })[0], isNew = !e; if (isNew) e = { id: rid(8), code: newCode(10), created: new Date().toISOString(), isTest: false };
        readEvent(v, e, true);
        if (e.capacity < booked(e.id)) throw ApiErr('invalid', 'Die maximale Teilnehmendenzahl kann nicht unter der Zahl der bereits angemeldeten Personen (' + booked(e.id) + ') liegen.');
        if (isNew) data.events.push(e); save(); return { id: e.id };
      });
    },
    adminDeleteEvent: function (id) { return wrap(function () { data.events = data.events.filter(function (e) { return e.id !== id; }); data.bookings = data.bookings.filter(function (b) { return b.eventId !== id; }); save(); return {}; }); },
    adminDeleteBooking: function (id) { return wrap(function () { data.bookings = data.bookings.filter(function (b) { return b.id !== id; }); save(); return {}; }); },
    adminSettings: function () { return wrap(function () { return { appTitle: cfg.appTitle, local: true }; }); },
    adminSaveSettings: function (s) {
      return wrap(function () {
        if ('appTitle' in s) { var t = (s.appTitle || '').trim(); if (t.length < 2 || t.length > 60) throw ApiErr('invalid', 'Der Titel der Anwendung muss zwischen 2 und 60 Zeichen lang sein.'); cfg.appTitle = t; }
        if ('heroTitle' in s || 'heroText' in s) {
          var ht = (s.heroTitle || '').trim(), hx = (s.heroText || '').trim();
          if (ht.length < 3 || ht.length > 80) throw ApiErr('invalid', 'Die Überschrift muss zwischen 3 und 80 Zeichen lang sein.');
          if (hx.length < 10 || hx.length > 500) throw ApiErr('invalid', 'Der Hinweistext muss zwischen 10 und 500 Zeichen lang sein.');
          cfg.hero = { title: ht, text: hx }; applyTaxonomy(cfg);
        }
        save(); return {};
      });
    },
    adminChangePassword: function (c, n) { return wrap(function () { if (c !== cfg.pw) throw ApiErr('password', 'Das aktuelle Passwort ist nicht korrekt.'); if (n.length < 8) throw ApiErr('invalid', 'Das neue Passwort muss mindestens 8 Zeichen lang sein.'); cfg.pw = n; save(); }); },
    adminTestData: function (m) { return wrap(function () { data.events = data.events.filter(function (e) { return !e.isTest; }); data.bookings = data.bookings.filter(function (b) { return !b.isTest; }); var r = { events: 0, bookings: 0 }; if (m === 'load') { var t = insertTest(); r.events = t.events.length; r.bookings = t.bookings.length; } save(); return r; }); },
    reset: function () { ['lt_data', 'lt_cfg', 'lt_mail', 'lt_seeded', 'lt_mine'].forEach(store.del); data = cfg = null; }
  };
})();
var Api = Local;

/* ====================================================== UI-Bausteine */
var appEl, state = { settings: { appTitle: DEFAULT_TITLE }, events: [] };
var toastTimer;
function toast(msg, bad) {
  var t = $('.toast'); if (t) t.remove();
  t = h('div', { class: 'toast' + (bad ? ' bad' : ''), role: 'status', text: msg }); document.body.appendChild(t);
  clearTimeout(toastTimer); toastTimer = setTimeout(function () { t.remove(); }, 4200);
}
var modalStack = [];
function openModal(content, opt) {
  opt = opt || {};
  var prev = document.activeElement;
  var back = h('div', { class: 'modal-back' });
  var box = h('div', { class: 'modal' + (opt.wide ? ' wide' : ''), role: 'dialog', 'aria-modal': 'true', 'aria-label': opt.label || 'Dialog' });
  var x = h('button', { class: 'modal-x', type: 'button', 'aria-label': 'Schließen', text: '\u00d7' });
  box.appendChild(x); box.appendChild(content); back.appendChild(box); document.body.appendChild(back);
  document.body.style.overflow = 'hidden';
  var api = { node: box, close: function () { if (!back.parentNode) return; back.remove(); modalStack = modalStack.filter(function (m) { return m !== api; }); if (!modalStack.length) document.body.style.overflow = ''; document.removeEventListener('keydown', key); if (prev && prev.focus) try { prev.focus(); } catch (e) { } if (opt.onClose) opt.onClose(); } };
  function key(e) { if (e.key === 'Escape' && modalStack[modalStack.length - 1] === api) { e.stopPropagation(); api.close(); } if (e.key === 'Tab' && modalStack[modalStack.length - 1] === api) { var f = $$('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex="0"],[contenteditable="true"]', box).filter(function (n) { return n.offsetParent !== null; }); if (!f.length) return; var a = f[0], z = f[f.length - 1]; if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); } else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); } } }
  document.addEventListener('keydown', key);
  x.addEventListener('click', api.close);
  back.addEventListener('mousedown', function (e) { if (e.target === back) api.close(); });
  modalStack.push(api);
  setTimeout(function () { if (box.contains(document.activeElement) && document.activeElement !== x) return; var f = $('input:not([type=hidden]),select,textarea,button.btn', box); (f || x).focus(); }, 30);
  return api;
}

function field(label, control, o) {
  o = o || {};
  var errEl = h('div', { class: 'err', role: 'alert', hidden: true });
  var w = h('div', { class: 'field' }, [
    label ? h('label', { for: o.id, class: o.legend ? '' : null }, [label, o.req ? h('span', { class: 'req', 'aria-hidden': 'true', text: ' *' }) : null]) : null,
    control, o.hint ? h('div', { class: 'hint', id: (o.id || '') + '-hint', text: o.hint }) : null, errEl]);
  w.setErr = function (m) { errEl.hidden = !m; errEl.textContent = m || ''; w.classList.toggle('invalid', !!m); var c = $('input,select,textarea,[contenteditable]', w); if (c) { if (m) c.setAttribute('aria-invalid', 'true'); else c.removeAttribute('aria-invalid'); } };
  return w;
}
function chipEl(cls, text) { return h('span', { class: 'chip ' + cls, text: text }); }
function statusChip(e) { var f = freeOf(e); if (f <= 0) return chipEl('full', 'Ausgebucht'); if (f <= 5) return chipEl('few', 'Fast ausgebucht'); return null; }

/* Platzhalter-Bild */
var TOPIC_STYLE = {
  'fachlich': ['#155784', '#001957', 'book'], 'vertrieblich': ['#109da8', '#155784', 'trend'], 'Sport': ['#759a03', '#5b7a03', 'pulse'],
  'Freizeit': ['#f79506', '#c47d47', 'sun'], 'Essen & Trinken': ['#c47d47', '#583720', 'cup'], 'Reisen': ['#3875a6', '#109da8', 'globe'], 'Sonstiges': ['#5b7a03', '#155784', 'star']
};
function placeholder(topic) {
  var s = TOPIC_STYLE[topic];
  if (!s) { var keys = Object.keys(TOPIC_STYLE), hsh = 0; for (var i = 0; i < topic.length; i++) hsh = (hsh * 31 + topic.charCodeAt(i)) % 9973; s = TOPIC_STYLE[keys[hsh % keys.length]]; }
  return h('div', { class: 'ph', style: 'background:linear-gradient(135deg,' + s[0] + ',' + s[1] + ')', 'aria-hidden': 'true', html: '<svg viewBox="0 0 24 24">' + ICONS[s[2]] + '</svg>' });
}
function cover(e) { return e.image ? h('img', { class: 'cover', src: rel(e.image), alt: '', loading: 'lazy' }) : placeholder(e.topic); }

/* ====================================================== Rich-Text-Editor */
function makeRte(initial) {
  var area = h('div', { class: 'rte-area rich', contenteditable: 'true', role: 'textbox', 'aria-multiline': 'true', 'aria-label': 'Beschreibung', 'data-ph': 'Worum geht es? Was erwartet die Teilnehmenden? Was sollen sie mitbringen?' });
  area.innerHTML = sanitizeHtml(initial || '');
  var bar = h('div', { class: 'rte-bar', role: 'toolbar', 'aria-label': 'Textformatierung' });
  var linkRow = h('div', { class: 'rte-link', hidden: true });
  var count = h('span', { text: '0 Zeichen' });
  var saved = null;
  var btns = [];
  function exec(cmd, val) { area.focus(); try { document.execCommand('styleWithCSS', false, false); } catch (e) { } document.execCommand(cmd, false, val || null); refresh(); }
  function tb(label, title, html, fn, state) {
    var b = h('button', { type: 'button', title: title, 'aria-label': title, html: html });
    b.addEventListener('mousedown', function (e) { e.preventDefault(); });
    b.addEventListener('click', fn); if (state) { b._state = state; btns.push(b); } bar.appendChild(b); return b;
  }
  function sep() { bar.appendChild(h('span', { class: 'sepv' })); }
  tb('B', 'Fett', '<b>B</b>', function () { exec('bold'); }, 'bold');
  tb('I', 'Kursiv', '<i>I</i>', function () { exec('italic'); }, 'italic');
  tb('U', 'Unterstrichen', '<u>U</u>', function () { exec('underline'); }, 'underline');
  tb('S', 'Durchgestrichen', '<s>S</s>', function () { exec('strikeThrough'); }, 'strikeThrough');
  sep();
  tb('H', 'Zwischenüberschrift', 'H<small style="font-size:.6em">3</small>', function () { var on = document.queryCommandValue('formatBlock').toLowerCase() === 'h3'; exec('formatBlock', on ? 'p' : 'h3'); });
  tb('ul', 'Aufzählung', svg(ICONS.list), function () { exec('insertUnorderedList'); }, 'insertUnorderedList');
  tb('ol', 'Nummerierte Liste', svg(ICONS.olist), function () { exec('insertOrderedList'); }, 'insertOrderedList');
  tb('q', 'Zitat', '\u201C', function () { var on = document.queryCommandValue('formatBlock').toLowerCase() === 'blockquote'; exec('formatBlock', on ? 'p' : 'blockquote'); });
  sep();
  var linkIn = h('input', { type: 'url', placeholder: 'https://…', 'aria-label': 'Adresse des Links' });
  function applyLink() {
    var u = linkIn.value.trim(); if (u && !/^(https?:\/\/|mailto:)/i.test(u)) u = 'https://' + u;
    linkRow.hidden = true; area.focus(); restore();
    if (u) { if (window.getSelection().isCollapsed) document.execCommand('insertHTML', false, '<a href="' + esc(u) + '">' + esc(u) + '</a>'); else document.execCommand('createLink', false, u); }
    linkIn.value = ''; refresh();
  }
  function restore() { var s = window.getSelection(); if (saved) { s.removeAllRanges(); s.addRange(saved); } }
  tb('link', 'Link einfügen', svg(ICONS.link), function () { var s = window.getSelection(); if (s.rangeCount && area.contains(s.anchorNode)) saved = s.getRangeAt(0).cloneRange(); else saved = null; linkRow.hidden = !linkRow.hidden; if (!linkRow.hidden) linkIn.focus(); });
  tb('unlink', 'Link entfernen', svg(ICONS.link) + '<span style="position:absolute;font-size:22px;line-height:1;transform:translateY(-1px)">\u2215</span>', function () { exec('unlink'); }).style.position = 'relative';
  tb('clear', 'Formatierung entfernen', 'T<small style="font-size:.6em">x</small>', function () { exec('removeFormat'); exec('formatBlock', 'p'); });
  sep();
  tb('undo', 'Rückgängig', svg(ICONS.undo), function () { exec('undo'); });
  tb('redo', 'Wiederholen', svg(ICONS.redo), function () { exec('redo'); });
  linkRow.appendChild(linkIn);
  linkRow.appendChild(h('button', { type: 'button', class: 'btn btn-primary btn-sm', text: 'Übernehmen', onclick: applyLink }));
  linkRow.appendChild(h('button', { type: 'button', class: 'btn btn-secondary btn-sm', text: 'Abbrechen', onclick: function () { linkRow.hidden = true; area.focus(); } }));
  linkIn.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); applyLink(); } });
  function refresh() {
    btns.forEach(function (b) { var on = false; try { on = document.queryCommandState(b._state); } catch (e) { } b.setAttribute('aria-pressed', on ? 'true' : 'false'); });
    var n = (area.textContent || '').trim().length; count.textContent = n + ' Zeichen';
  }
  try { document.execCommand('defaultParagraphSeparator', false, 'p'); } catch (e) { }
  area.addEventListener('input', refresh); area.addEventListener('keyup', refresh); area.addEventListener('mouseup', refresh); area.addEventListener('focus', refresh);
  area.addEventListener('paste', function (e) {
    e.preventDefault();
    var cd = e.clipboardData || window.clipboardData; var html = cd.getData('text/html'), txt = cd.getData('text/plain');
    var ins = html ? sanitizeHtml(html) : esc(txt).replace(/\r?\n/g, '<br>');
    document.execCommand('insertHTML', false, ins); refresh();
  });
  var node = h('div', { class: 'rte' }, [bar, linkRow, area, h('div', { class: 'rte-foot' }, [h('span', { text: 'Tipp: Text markieren und oben formatieren.' }), count])]);
  refresh();
  return { node: node, area: area, getHTML: function () { var s = sanitizeHtml(area.innerHTML); return plainText(s) ? s : ''; }, setHTML: function (x) { area.innerHTML = sanitizeHtml(x); refresh(); } };
}

/* ====================================================== Bild-Zuschnitt */
function openCropper(img, onDone) {
  var SIZE = 360, box = h('div', { class: 'crop-box' }), cv = h('canvas', { width: SIZE * 2, height: SIZE * 2, role: 'img', 'aria-label': 'Bildausschnitt. Mit der Maus oder dem Finger verschieben.' });
  box.appendChild(cv);
  var ctx = cv.getContext('2d'), W = cv.width;
  var min = W / Math.min(img.width, img.height), sc = min, ox = 0, oy = 0; // ox/oy: Verschiebung des Bildmittelpunkts in Canvas-Pixeln
  var zoom = h('input', { type: 'range', min: '1', max: '4', step: '0.01', value: '1', 'aria-label': 'Zoom' });
  function clamp() { var w = img.width * sc, hh = img.height * sc; var mx = Math.max(0, (w - W) / 2), my = Math.max(0, (hh - W) / 2); ox = Math.min(mx, Math.max(-mx, ox)); oy = Math.min(my, Math.max(-my, oy)); }
  function draw(c, s) { var f = s / W; c.fillStyle = '#000'; c.fillRect(0, 0, s, s); var w = img.width * sc * f, hh = img.height * sc * f; c.drawImage(img, s / 2 - w / 2 + ox * f, s / 2 - hh / 2 + oy * f, w, hh); }
  function render() { clamp(); draw(ctx, W); }
  function setZoom(z) { z = Math.min(4, Math.max(1, z)); sc = min * z; zoom.value = String(z); render(); }
  var drag = null;
  box.addEventListener('pointerdown', function (e) { drag = { x: e.clientX, y: e.clientY, ox: ox, oy: oy }; box.setPointerCapture(e.pointerId); box.style.cursor = 'grabbing'; });
  box.addEventListener('pointermove', function (e) { if (!drag) return; var k = W / box.clientWidth; ox = drag.ox + (e.clientX - drag.x) * k; oy = drag.oy + (e.clientY - drag.y) * k; render(); });
  box.addEventListener('pointerup', function () { drag = null; box.style.cursor = ''; });
  box.addEventListener('pointercancel', function () { drag = null; });
  box.addEventListener('wheel', function (e) { e.preventDefault(); setZoom(Number(zoom.value) * (e.deltaY < 0 ? 1.06 : 0.94)); }, { passive: false });
  zoom.addEventListener('input', function () { setZoom(Number(zoom.value)); });
  var done = h('button', { class: 'btn btn-primary', type: 'button', text: 'Ausschnitt übernehmen' });
  var cancel = h('button', { class: 'btn btn-secondary', type: 'button', text: 'Abbrechen' });
  var content = h('div', { class: 'modal-body' }, [h('h2', { text: 'Bild zuschneiden' }), h('p', { class: 'hint', text: 'Ziehe das Bild, um den Ausschnitt zu wählen, und nutze den Regler zum Zoomen. Das Bild wird quadratisch gespeichert.' }),
    h('div', { class: 'crop' }, [box, h('div', { class: 'zoomrow' }, [h('button', { type: 'button', class: 'btn btn-secondary btn-sm', 'aria-label': 'Verkleinern', html: ico('minus'), onclick: function () { setZoom(Number(zoom.value) - .2); } }), zoom, h('button', { type: 'button', class: 'btn btn-secondary btn-sm', 'aria-label': 'Vergrößern', html: ico('plus'), onclick: function () { setZoom(Number(zoom.value) + .2); } })])]),
    h('div', { style: 'display:flex;gap:12px;justify-content:flex-end;flex-wrap:wrap' }, [cancel, done])]);
  var m = openModal(content, { label: 'Bild zuschneiden' });
  cancel.addEventListener('click', m.close);
  done.addEventListener('click', function () { var o = document.createElement('canvas'); o.width = o.height = 640; draw(o.getContext('2d'), 640); onDone(o.toDataURL('image/jpeg', .86)); m.close(); });
  render();
}

/* ====================================================== Veranstaltungsformular */
function weekdayOptions(selected, admin) {
  var out = [], d = new Date(); d.setHours(0, 0, 0, 0); var end = new Date(d); end.setDate(end.getDate() + 7 * 16);
  while (d <= end) { if (isWeekday(d)) out.push(ymd(d)); d.setDate(d.getDate() + 1); }
  if (selected && out.indexOf(selected) < 0) { out.push(selected); out.sort(); }
  return out;
}
function buildEventForm(o) {
  o = o || {}; var ev = o.event || {}, admin = !!o.admin;
  var v = { title: ev.title || '', host: ev.host || '', hostEmail: ev.hostEmail || '', category: ev.category || 'dienstlich', date: ev.date || '', duration: ev.duration || 0, start: ev.start || '', type: ev.type || '', topic: ev.topic || '', capacity: ev.capacity || 10, teamsLink: ev.teamsLink || '', description: ev.description || '', imageData: '', removeImage: false };
  var existingImg = ev.image || '', srcImg = null, previewSrc = existingImg;
  var f = {}; // Felder
  var form = h('form', { class: 'form', novalidate: true });

  var title = h('input', { type: 'text', id: 'f-title', maxlength: '100', value: v.title, autocomplete: 'off' });
  var host = h('input', { type: 'text', id: 'f-host', maxlength: '80', value: v.host, autocomplete: 'name' });
  f.title = field('Titel der Veranstaltung', title, { id: 'f-title', req: true }); f.host = field('Name', host, { id: 'f-host', req: true, hint: 'Vor- und Nachname' });
  var hostMail = h('input', { type: 'email', id: 'f-hostmail', maxlength: '200', value: v.hostEmail, autocomplete: 'email' });
  f.hostEmail = field('E-Mail-Adresse', hostMail, { id: 'f-hostmail', req: true, hint: 'Für Rückfragen der Administration. Sie wird nicht im Katalog angezeigt.' });

  var catSeg = h('div', { class: 'seg', role: 'radiogroup', 'aria-label': 'Dienstlich oder privat' }, ['dienstlich', 'privat'].map(function (c) {
    return h('label', null, [h('input', { type: 'radio', name: 'f-cat', value: c, checked: v.category === c }), CAT_LABEL[c]]);
  }));
  f.category = field('Auswahl des Themenbereichs', catSeg, { req: true, legend: true });

  var todayStr = ymd(new Date()), maxD = new Date(); maxD.setFullYear(maxD.getFullYear() + 2);
  var dateSel = h('input', { type: 'date', id: 'f-date', value: v.date, min: admin ? null : todayStr, max: ymd(maxD) });
  var durSel = h('select', { id: 'f-dur' });
  var startSel = h('select', { id: 'f-start' });
  var startHint = h('div', { class: 'hint' });
  f.date = field('Tag', dateSel, { id: 'f-date', req: true, hint: 'Nur Montag bis Freitag sind möglich.' });
  var dateHint = $('.hint', f.date);
  function showDay() { dateHint.textContent = v.date ? dateLong(v.date) : 'Nur Montag bis Freitag sind möglich.'; }
  f.duration = field('Dauer', durSel, { id: 'f-dur', req: true, hint: 'Maximal 2 Stunden, in 15-Minuten-Schritten.' });
  f.start = field('Startzeit', startSel, { id: 'f-start', req: true });
  f.start.insertBefore(startHint, $('.err', f.start));

  var typeSel = h('select', { id: 'f-type' });
  var topicSel = h('select', { id: 'f-topic' });
  f.type = field('Art der Veranstaltung', typeSel, { id: 'f-type', req: true });
  f.topic = field('Thema', topicSel, { id: 'f-topic', req: true });
  var cap = h('input', { type: 'number', id: 'f-cap', min: '1', max: String(MAX_CAP), step: '1', value: String(v.capacity), inputmode: 'numeric' });
  f.capacity = field('Maximale Teilnehmendenzahl', cap, { id: 'f-cap', req: true, hint: 'Höchstens ' + MAX_CAP + ' Personen.' });
  var rte = makeRte(v.description); f.description = field('Beschreibung', rte.node, { req: true, legend: true, hint: 'Diese Beschreibung wird auch im Katalog angezeigt, sobald Interessierte auf die Kachel der Veranstaltung klicken.' });
  var link = h('input', { type: 'url', id: 'f-link', value: v.teamsLink, placeholder: 'https://teams.microsoft.com/l/meetup-join/…', autocomplete: 'off' });
  f.teamsLink = field('Link zum Microsoft-Teams-Meeting', link, { id: 'f-link', req: true, hint: 'Der Link wird nur Personen angezeigt, die sich angemeldet haben. Er steht nicht im Katalog.' });

  var prev = h('div', { class: 'imgprev' });
  var file = h('input', { type: 'file', accept: 'image/png,image/jpeg,image/webp', class: 'sr', id: 'f-img', tabindex: '-1' });
  var pickBtn = h('button', { type: 'button', class: 'btn btn-secondary', text: 'Bild auswählen' });
  var recropBtn = h('button', { type: 'button', class: 'btn btn-secondary', text: 'Ausschnitt anpassen', hidden: true });
  var delBtn = h('button', { type: 'button', class: 'btn btn-secondary', text: 'Bild entfernen', hidden: true });
  f.image = field('Bild (optional)', h('div', { class: 'imgpick' }, [prev, h('div', { style: 'display:flex;flex-direction:column;gap:10px;align-items:flex-start' }, [pickBtn, recropBtn, delBtn, file])]), { legend: true, hint: 'Das Bild wird quadratisch angezeigt. Beim Hochladen kannst du Ausschnitt und Zoom anpassen. Ohne Bild zeigt der Katalog ein Platzhalterbild.' });

  function renderPrev() {
    clear(prev);
    if (previewSrc) prev.appendChild(h('img', { src: previewSrc, alt: 'Vorschau des Veranstaltungsbildes' })); else prev.textContent = 'Kein Bild gewählt';
    recropBtn.hidden = !srcImg; delBtn.hidden = !previewSrc;
  }
  function pick(fileObj) {
    if (!fileObj) return;
    if (!/^image\/(png|jpe?g|webp)$/.test(fileObj.type)) { f.image.setErr('Bitte wähle ein Bild im Format JPG, PNG oder WebP.'); return; }
    if (fileObj.size > 12 * 1024 * 1024) { f.image.setErr('Die Bilddatei ist zu groß (maximal 12 MB).'); return; }
    f.image.setErr('');
    var r = new FileReader();
    r.onload = function () { var im = new Image(); im.onload = function () { srcImg = im; crop(); }; im.onerror = function () { f.image.setErr('Das Bild konnte nicht gelesen werden.'); }; im.src = r.result; };
    r.readAsDataURL(fileObj);
  }
  function crop() { openCropper(srcImg, function (data) { v.imageData = data; v.removeImage = false; previewSrc = data; renderPrev(); }); }
  pickBtn.addEventListener('click', function () { file.value = ''; file.click(); });
  file.addEventListener('change', function () { pick(file.files[0]); });
  recropBtn.addEventListener('click', crop);
  delBtn.addEventListener('click', function () { v.imageData = ''; v.removeImage = true; previewSrc = ''; srcImg = null; renderPrev(); });
  renderPrev();

  function fillDur() {
    clear(durSel); durSel.appendChild(h('option', { value: '', text: 'Bitte wählen' }));
    [15, 30, 45, 60, 75, 90, 105, 120].forEach(function (d) { durSel.appendChild(h('option', { value: String(d), text: DUR_LABEL[d], selected: d === v.duration })); });
  }
  function fillStart() {
    clear(startSel);
    if (!v.duration) { startSel.disabled = true; startSel.appendChild(h('option', { value: '', text: 'Bitte zuerst die Dauer wählen' })); startHint.textContent = 'Die möglichen Startzeiten hängen von der Dauer ab, weil die Veranstaltung um 09:00 bzw. 20:00 Uhr beendet sein muss.'; return; }
    startSel.disabled = false; startSel.appendChild(h('option', { value: '', text: 'Bitte wählen' }));
    var today = v.date === ymd(new Date()), nowMin = new Date().getHours() * 60 + new Date().getMinutes();
    var parts = [];
    validStarts(v.duration).forEach(function (g) {
      if (!g.list.length) return;
      var og = h('optgroup', { label: g.w.label + ' (' + minToHm(g.w.from) + '\u2013' + minToHm(g.w.to) + ' Uhr)' });
      g.list.forEach(function (m) { var past = !admin && today && m <= nowMin; og.appendChild(h('option', { value: minToHm(m), text: minToHm(m) + ' \u2013 ' + minToHm(m + v.duration) + ' Uhr' + (past ? ' (vorbei)' : ''), disabled: past, selected: minToHm(m) === v.start })); });
      startSel.appendChild(og);
      parts.push(minToHm(g.list[0]) + ' bis ' + minToHm(g.list[g.list.length - 1]) + ' Uhr');
    });
    startHint.textContent = 'Bei ' + v.duration + ' Minuten kannst du von ' + parts.join(' sowie von ') + ' starten.';
  }
  function fillTopics() { clear(topicSel); topicSel.appendChild(h('option', { value: '', text: 'Bitte wählen' })); TOPICS[v.category].forEach(function (t) { topicSel.appendChild(h('option', { value: t, text: t, selected: t === v.topic })); }); }
  clear(typeSel); typeSel.appendChild(h('option', { value: '', text: 'Bitte wählen' })); TYPES.forEach(function (t) { typeSel.appendChild(h('option', { value: t, text: t, selected: t === v.type })); });
  showDay(); fillDur(); fillStart(); fillTopics();

  $$('input[name=f-cat]', catSeg).forEach(function (r) { r.addEventListener('change', function () { v.category = r.value; if (TOPICS[v.category].indexOf(v.topic) < 0) v.topic = ''; fillTopics(); f.category.setErr(''); }); });
  dateSel.addEventListener('input', function () {
    var val = dateSel.value;
    if (val && !isWeekday(parseYmd(val))) { v.date = ''; dateSel.value = ''; showDay(); f.date.setErr('Am Wochenende finden keine Veranstaltungen statt. Bitte wähle einen Tag von Montag bis Freitag.'); fillStart(); return; }
    v.date = val; showDay(); f.date.setErr(''); var old = v.start; fillStart(); if (old && !$('option[value="' + old + '"]:not([disabled])', startSel)) v.start = '';
  });
  durSel.addEventListener('change', function () {
    v.duration = Number(durSel.value) || 0; var old = v.start; fillStart();
    if (old && v.duration && !inWindow(toMin(old), v.duration)) { v.start = ''; startSel.value = ''; f.start.setErr('Mit ' + v.duration + ' Minuten passt ' + old + ' Uhr nicht mehr in das Zeitfenster. Bitte wähle eine neue Startzeit.'); } else f.start.setErr('');
    if (!v.duration) v.start = ''; f.duration.setErr('');
  });
  startSel.addEventListener('change', function () { v.start = startSel.value; f.start.setErr(''); });
  typeSel.addEventListener('change', function () { v.type = typeSel.value; f.type.setErr(''); });
  topicSel.addEventListener('change', function () { v.topic = topicSel.value; f.topic.setErr(''); });
  title.addEventListener('input', function () { f.title.setErr(''); }); host.addEventListener('input', function () { f.host.setErr(''); }); hostMail.addEventListener('input', function () { f.hostEmail.setErr(''); });
  cap.addEventListener('input', function () { f.capacity.setErr(''); }); link.addEventListener('input', function () { f.teamsLink.setErr(''); });
  rte.area.addEventListener('input', function () { f.description.setErr(''); });

  function collect() { v.title = title.value; v.host = host.value; v.hostEmail = hostMail.value; v.capacity = Number(cap.value); v.teamsLink = link.value; v.description = rte.getHTML(); return v; }
  function validate() {
    collect(); var er = validateEvent(v, admin), first = null;
    Object.keys(f).forEach(function (k) { f[k].setErr(er[k] || ''); if (er[k] && !first) first = f[k]; });
    if (first) { first.scrollIntoView({ block: 'center', behavior: 'smooth' }); var c = $('input,select,[contenteditable]', first); if (c) c.focus({ preventScroll: true }); }
    return !first;
  }
  var submit = h('button', { type: 'submit', class: 'btn btn-primary', text: o.submitLabel || 'Veranstaltung anbieten' });
  var extra = o.extraButtons || [];
  var box = h('div', { class: 'notice bad', role: 'alert', hidden: true });
  form.appendChild(h('fieldset', { class: 'fs' }, [h('legend', { text: 'Wer bietet es an?' }), h('div', { class: 'grid2' }, [f.host, f.hostEmail])]));
  form.appendChild(h('fieldset', { class: 'fs' }, [h('legend', { text: 'Worum geht es?' }), f.title, h('div', { class: 'grid2' }, [f.category, f.topic])]));
  form.appendChild(h('fieldset', { class: 'fs' }, [h('legend', { text: 'Wann findet es statt?' }), h('div', { class: 'notice info' }, 'Veranstaltungen finden nur montags bis freitags statt, entweder morgens von 06:00 bis 09:00 Uhr oder nachmittags von 17:00 bis 20:00 Uhr. Die Veranstaltung muss innerhalb des Zeitfensters beendet sein.'), h('div', { class: 'grid3' }, [f.date, f.duration, f.start])]));
  form.appendChild(h('fieldset', { class: 'fs' }, [h('legend', { text: 'Was wird angeboten?' }), h('div', { class: 'grid2' }, [f.type, f.capacity]), f.description, f.image]));
  form.appendChild(h('fieldset', { class: 'fs' }, [h('legend', { text: 'Teams-Link' }), f.teamsLink]));
  form.appendChild(box);
  form.appendChild(h('div', { style: 'display:flex;gap:12px;flex-wrap:wrap' }, [submit].concat(extra)));
  form.addEventListener('submit', function (e) {
    e.preventDefault(); box.hidden = true;
    if (!validate()) return;
    submit.disabled = true; var old = submit.textContent; submit.textContent = 'Wird gespeichert …';
    var payload = { id: ev.id, title: v.title.trim(), host: v.host.trim(), hostEmail: v.hostEmail.trim(), category: v.category, type: v.type, topic: v.topic, date: v.date, start: v.start, duration: v.duration, capacity: v.capacity, teamsLink: v.teamsLink.trim(), description: v.description, imageData: v.imageData, removeImage: v.removeImage };
    Promise.resolve(o.onSubmit(payload)).catch(function (err) { box.hidden = false; box.textContent = err.message || 'Das Speichern ist fehlgeschlagen.'; box.scrollIntoView({ block: 'center', behavior: 'smooth' }); }).then(function () { submit.disabled = false; submit.textContent = old; });
  });
  return form;
}

/* ====================================================== Ansichten */
function loading() { return h('div', { class: 'empty' }, [h('p', { text: 'Wird geladen …' })]); }

/* ---- Katalog ---- */
var filters = { cat: 'dienstlich', q: '', types: [], topic: 'all', dur: 'all', tod: 'all' };
function viewCatalog() {
  if (filters.topic !== 'all' && TOPICS[filters.cat].indexOf(filters.topic) < 0) filters.topic = 'all';
  filters.types = filters.types.filter(function (t) { return TYPES.indexOf(t) >= 0; });
  var root = h('div', { class: 'stage' + (filters.cat === 'privat' ? ' priv' : '') });
  function paint() { root.style.cssText = paintStage(filters.cat); }
  paint();
  var rowsHost = h('div', { class: 'rows' });
  var count = h('span', { class: 'count', 'aria-live': 'polite' });
  var search = h('input', { type: 'search', id: 'c-search', placeholder: 'Titel, Thema oder Person suchen', value: filters.q, 'aria-label': 'Suche' });
  var switchSeg = h('div', { class: 'seg', role: 'group', 'aria-label': 'Dienstlich oder privat' }, ['dienstlich', 'privat'].map(function (c) {
    return h('button', { type: 'button', text: CAT_LABEL[c], 'aria-pressed': String(filters.cat === c), onclick: function () { filters.cat = c; filters.topic = 'all'; root.classList.toggle('priv', c === 'privat'); paint(); fillTopicSel(); $$('button', switchSeg).forEach(function (b, i) { b.setAttribute('aria-pressed', String(['dienstlich', 'privat'][i] === c)); }); renderRows(); } });
  }));
  var typeChips = h('div', { class: 'grp types', role: 'group', 'aria-label': 'Art der Veranstaltung' }, [h('span', { class: 'lbl', text: 'Art' })].concat(TYPES.map(function (t) {
    return h('button', { type: 'button', class: 'fchip', text: t, 'aria-pressed': String(filters.types.indexOf(t) >= 0), onclick: function (e) { var i = filters.types.indexOf(t); if (i >= 0) filters.types.splice(i, 1); else filters.types.push(t); e.currentTarget.setAttribute('aria-pressed', String(i < 0)); renderRows(); } });
  })));
  var topicSel = h('select', { id: 'c-topic', 'aria-label': 'Thema' });
  function fillTopicSel() {
    clear(topicSel); topicSel.appendChild(h('option', { value: 'all', text: 'Alle' }));
    TOPICS[filters.cat].slice().sort(function (a, b) { return a.localeCompare(b, 'de'); }).forEach(function (t) { topicSel.appendChild(h('option', { value: t, text: capFirst(t), selected: filters.topic === t })); });
  }
  fillTopicSel();
  topicSel.addEventListener('change', function () { filters.topic = topicSel.value; renderRows(); });
  var durSel = h('select', { id: 'c-dur', 'aria-label': 'Dauer' }, [['all', 'Alle'], ['30', 'bis 30 Minuten'], ['60', 'bis 60 Minuten'], ['90', 'bis 90 Minuten'], ['120', 'bis 2 Stunden']].map(function (o) { return h('option', { value: o[0], text: o[1], selected: filters.dur === o[0] }); }));
  var todSeg = h('div', { class: 'seg', role: 'group', 'aria-label': 'Tageszeit' }, [['all', 'Alle'], ['morgens', 'Morgens'], ['nachmittags', 'Nachmittags']].map(function (o) {
    return h('button', { type: 'button', text: o[1], 'aria-pressed': String(filters.tod === o[0]), onclick: function () { filters.tod = o[0]; $$('button', todSeg).forEach(function (b, i) { b.setAttribute('aria-pressed', String(['all', 'morgens', 'nachmittags'][i] === o[0])); }); renderRows(); } });
  }));
  var reset = h('button', { type: 'button', class: 'linkbtn', text: 'Filter zurücksetzen', hidden: true, onclick: function () { filters.q = ''; filters.types = []; filters.topic = 'all'; topicSel.value = 'all'; filters.dur = 'all'; filters.tod = 'all'; search.value = ''; durSel.value = 'all'; $$('.fchip', typeChips).forEach(function (b) { b.setAttribute('aria-pressed', 'false'); }); $$('button', todSeg).forEach(function (b, i) { b.setAttribute('aria-pressed', String(i === 0)); }); renderRows(); } });
  search.addEventListener('input', function () { filters.q = search.value; renderRows(); });
  durSel.addEventListener('change', function () { filters.dur = durSel.value; renderRows(); });

  root.appendChild(h('div', { class: 'hero' }, h('div', { class: 'wrap wide' }, [h('h1', { text: HERO.title }),
    h('p', { text: HERO.text }),
    h('p', { class: 'hero-cta' }, h('a', { class: 'btn btn-secondary', href: '#/anbieten', text: 'Selbst etwas anbieten' }))])));
  root.appendChild(h('div', { class: 'wrap wide' }, h('div', { class: 'toolbar' }, [
    h('div', { class: 'r1' }, [h('div', { class: 'grp' }, [h('span', { class: 'lbl', text: 'Bereich' }), switchSeg]), h('div', { class: 'search', html: ico('search') }, search)]),
    typeChips,
    h('div', { class: 'r2' }, [h('div', { class: 'grp' }, [h('span', { class: 'lbl', text: 'Thema' }), topicSel]), h('div', { class: 'grp' }, [h('span', { class: 'lbl', text: 'Dauer' }), durSel]), h('div', { class: 'grp' }, [h('span', { class: 'lbl', text: 'Tageszeit' }), todSeg]), reset, count])])));
  root.appendChild(h('div', { class: 'wrap wide' }, rowsHost));

  function matches(e) {
    if (e.category !== filters.cat) return false;
    if (filters.topic !== 'all' && e.topic !== filters.topic) return false;
    if (filters.types.length && filters.types.indexOf(e.type) < 0) return false;
    if (filters.dur !== 'all' && e.duration > Number(filters.dur)) return false;
    if (filters.tod !== 'all') { var m = toMin(e.start); if ((filters.tod === 'morgens') !== (m < 720)) return false; }
    var q = filters.q.trim().toLowerCase();
    if (q && (e.title + ' ' + e.host + ' ' + e.topic + ' ' + e.type + ' ' + plainText(e.description)).toLowerCase().indexOf(q) < 0) return false;
    return true;
  }
  function renderRows() {
    clear(rowsHost);
    var active = filters.q || filters.types.length || filters.topic !== 'all' || filters.dur !== 'all' || filters.tod !== 'all'; reset.hidden = !active;
    var list = state.events.filter(matches).sort(function (a, b) { return startDate(a) - startDate(b); });
    count.textContent = list.length + (list.length === 1 ? ' Veranstaltung' : ' Veranstaltungen');
    if (!list.length) {
      var inCat = state.events.filter(function (e) { return e.category === filters.cat; }).length;
      rowsHost.appendChild(h('div', { class: 'empty' }, [h('h2', { text: inCat ? 'Nichts gefunden' : 'Noch keine Veranstaltungen' }), h('p', { text: inCat ? 'Für diese Filter gibt es keine Veranstaltung. Passe die Suche oder die Filter an.' : 'Hier erscheinen Veranstaltungen, sobald jemand eine anbietet. Du kannst gern die erste anlegen.' }),
        inCat ? null : h('p', { style: 'margin-top:16px' }, h('a', { class: 'btn btn-primary', href: '#/anbieten', text: 'Veranstaltung anbieten' }))]));
      return;
    }
    TOPICS[filters.cat].slice().sort(function (a, b) { return a.localeCompare(b, 'de'); }).forEach(function (topic) {
      var items = list.filter(function (e) { return e.topic === topic; });
      if (!items.length) return;
      var sc = h('div', { class: 'scroller', role: 'list', 'aria-label': topic }, items.map(function (e) { return tile(e); }));
      var l = h('button', { class: 'arrow l', type: 'button', 'aria-label': 'Nach links blättern', html: ico('left'), onclick: function () { sc.scrollBy({ left: -sc.clientWidth * .85, behavior: 'smooth' }); } });
      var r = h('button', { class: 'arrow r', type: 'button', 'aria-label': 'Nach rechts blättern', html: ico('right'), onclick: function () { sc.scrollBy({ left: sc.clientWidth * .85, behavior: 'smooth' }); } });
      function upd() { l.hidden = sc.scrollLeft < 8; r.hidden = sc.scrollLeft + sc.clientWidth > sc.scrollWidth - 8; }
      sc.addEventListener('scroll', upd); setTimeout(upd, 60);
      rowsHost.appendChild(h('section', null, [h('div', { class: 'row-head' }, [h('h2', { text: capFirst(topic) }), h('span', { text: items.length + (items.length === 1 ? ' Termin' : ' Termine') })]), h('div', { class: 'row-wrap' }, [l, sc, r])]));
    });
  }
  function tile(e) {
    var f = freeOf(e), full = f <= 0, st = statusChip(e);
    var t = h('article', { class: 'tile', role: 'listitem', tabindex: '0', 'aria-disabled': full ? 'true' : null, 'aria-label': e.title + ', ' + dateFull(e.date) + ', ' + e.start + ' Uhr' + (full ? ', ausgebucht' : '') }, [
      h('div', { class: 'tile-img' }, [cover(e), h('div', { class: 'chips' }, [chipEl(e.category === 'dienstlich' ? 'biz' : 'priv', CAT_LABEL[e.category]), chipEl('type', e.type)]), st ? h('div', { class: 'chips-b' }, st) : null]),
      h('div', { class: 'tile-body' }, [h('h3', { text: e.title, title: e.title }), h('div', { class: 'tile-meta' }, [h('span', null, [h('b', { text: dateShort(e.date) }), ' ' + e.start + '\u2013' + endHm(e) + ' Uhr']), h('span', { text: e.duration + ' Minuten \u00b7 ' + e.host })])])]);
    function open() { if (!full) openBooking(e, function () { refresh(); }); else toast('Diese Veranstaltung ist ausgebucht.', true); }
    t.addEventListener('click', open); t.addEventListener('keydown', function (ev) { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); open(); } });
    return t;
  }
  function refresh() { return Api.events().then(function (l) { state.events = l; renderRows(); }); }
  root.refresh = refresh;
  rowsHost.appendChild(loading());
  refresh().catch(function (er) { clear(rowsHost); rowsHost.appendChild(h('div', { class: 'notice bad', text: er.message })); });
  return root;
}

/* ---- Buchungs-Popup ---- */
function openBooking(e, onChange) {
  var body = h('div', { class: 'modal-body' });
  var head = h('div', { class: 'modal-cover' }, [cover(e), h('div', { class: 'chips' }, [chipEl(e.category === 'dienstlich' ? 'biz' : 'priv', CAT_LABEL[e.category]), chipEl('type', e.type), statusChip(e)])]);
  var wrapper = h('div', null, [head, body]);
  var m = openModal(wrapper, { label: 'Anmeldung: ' + e.title, onClose: onChange });
  function showForm() {
    clear(body);
    var f = freeOf(e);
    var name = h('input', { type: 'text', id: 'b-name', autocomplete: 'name', maxlength: '80' }), mail = h('input', { type: 'email', id: 'b-mail', autocomplete: 'email', maxlength: '200' });
    var fn = field('Name', name, { id: 'b-name', req: true }), fm = field('E-Mail-Adresse', mail, { id: 'b-mail', req: true, hint: 'Es wird keine E-Mail verschickt. Die Adresse dient nur der Verwaltung durch die Administration.' });
    var msg = h('div', { class: 'notice bad', role: 'alert', hidden: true });
    var go = h('button', { type: 'submit', class: 'btn btn-primary', text: 'Anmelden' });
    var form = h('form', { novalidate: true, style: 'display:flex;flex-direction:column;gap:16px' }, [h('div', { class: 'grid2' }, [fn, fm]), msg, h('div', { style: 'display:flex;gap:12px;flex-wrap:wrap' }, [go, h('button', { type: 'button', class: 'btn btn-secondary', text: 'Abbrechen', onclick: m.close })])]);
    form.addEventListener('submit', function (ev) {
      ev.preventDefault(); msg.hidden = true;
      var ok = true; fn.setErr(''); fm.setErr('');
      if (name.value.trim().length < 2) { fn.setErr('Bitte gib deinen Namen an.'); ok = false; }
      if (!validEmail(mail.value.trim())) { fm.setErr('Bitte gib eine gültige E-Mail-Adresse an.'); ok = false; }
      if (!ok) { (fn.classList.contains('invalid') ? name : mail).focus(); return; }
      go.disabled = true; go.textContent = 'Wird geprüft …';
      Api.book(e.id, name.value, mail.value).then(function (r) { showDone(r); }, function (er) {
        go.disabled = false; go.textContent = 'Anmelden';
        if (er.code === 'full' || er.code === 'past' || er.code === 'notfound') { showFail(er); return; }
        msg.hidden = false; msg.textContent = er.message;
      });
    });
    body.appendChild(h('h2', { text: e.title, style: 'padding-right:40px;overflow-wrap:anywhere' }));
    body.appendChild(h('dl', { class: 'facts' }, [
      h('div', null, [h('dt', { text: 'Datum' }), h('dd', { text: dateLong(e.date) })]), h('div', null, [h('dt', { text: 'Uhrzeit' }), h('dd', { text: e.start + ' \u2013 ' + endHm(e) + ' Uhr' })]),
      h('div', null, [h('dt', { text: 'Dauer' }), h('dd', { text: e.duration + ' Minuten' })]), h('div', null, [h('dt', { text: 'Durchführung' }), h('dd', { text: e.host })]),
      h('div', null, [h('dt', { text: 'Thema' }), h('dd', { text: e.topic })]), h('div', null, [h('dt', { text: 'Freie Plätze' }), h('dd', { text: f + ' von ' + e.capacity })])]));
    body.appendChild(h('div', { class: 'rich', html: sanitizeHtml(e.description) }));
    body.appendChild(h('h3', { text: 'Jetzt anmelden' }));
    body.appendChild(form);
  }
  function showDone(r) {
    clear(body); rememberMine(r.eventInfo, r.code);
    body.appendChild(h('div', { class: 'notice ok', role: 'status', text: 'Die Buchung war erfolgreich. Dein Platz ist reserviert.' }));
    body.appendChild(codeWarning('Wichtig: Speichere deinen Buchungscode!', 'Es wird keine E-Mail verschickt. Ohne den Buchungscode kannst du deine Buchung nicht mehr aufrufen oder stornieren. Trage den Termin am besten jetzt über die Kalenderdatei (.ics) in deinen Kalender ein: Sie enthält alle Informationen, den Teams-Link und den Buchungscode.'));
    body.appendChild(participationCard(r.eventInfo, r.code));
    body.appendChild(h('p', { class: 'hint', text: 'Den Teams-Link, die Kalenderdatei und die Stornierung findest du jederzeit unter „Meine Anmeldung“ wieder, wenn du den Buchungscode eingibst. Auf diesem Gerät ist die Buchung dort bereits gespeichert.' }));
    body.appendChild(h('div', { style: 'display:flex;gap:12px;flex-wrap:wrap' }, [h('button', { class: 'btn btn-primary', type: 'button', text: 'Schließen', onclick: m.close }), h('a', { class: 'btn btn-secondary', href: '#/anmeldung?code=' + encodeURIComponent(r.code), text: 'Meine Anmeldung öffnen' })]));
  }
  function showFail(er) {
    clear(body);
    body.appendChild(h('div', { class: 'notice bad', role: 'alert', text: er.message }));
    body.appendChild(h('div', null, h('button', { class: 'btn btn-primary', type: 'button', text: 'Zurück zum Katalog', onclick: m.close })));
  }
  showForm();
}
/* Meine Anmeldungen auf diesem Geraet (nur im Browser gespeichert) */
function mineList() { try { return JSON.parse(store.get('lt_mine') || '[]') || []; } catch (e) { return []; } }
function rememberMine(info, code) {
  var l = mineList().filter(function (x) { return x.code !== code; });
  l.unshift({ code: code, title: info.title, date: info.date, start: info.start });
  store.set('lt_mine', JSON.stringify(l.slice(0, 20)));
}
function forgetMine(code) { store.set('lt_mine', JSON.stringify(mineList().filter(function (x) { return normCode(x.code) !== normCode(code); }))); }
/* Meine Veranstaltungen (Veranstaltungscodes) auf diesem Geraet */
function myEvList() { try { return JSON.parse(store.get('lt_myev') || '[]') || []; } catch (e) { return []; } }
function rememberMyEv(info, code) { var l = myEvList().filter(function (x) { return x.code !== code; }); l.unshift({ code: code, title: info.title, date: info.date, start: info.start }); store.set('lt_myev', JSON.stringify(l.slice(0, 20))); }
function forgetMyEv(code) { store.set('lt_myev', JSON.stringify(myEvList().filter(function (x) { return normCode(x.code) !== normCode(code); }))); }
function downloadIcs(info, code) {
  var ics = buildIcs(info, code), name = 'Veranstaltung.ics';
  if (CFG.mode === 'artifact') {
    try { navigator.clipboard.writeText(ics).then(function () { toast('Downloads sind hier gesperrt. Der Kalendereintrag wurde in die Zwischenablage kopiert.'); }, function () { toast('Download im Artefakt-Viewer nicht möglich. In der IIS-Version wird ' + name + ' heruntergeladen.', true); }); } catch (e) { toast('Download im Artefakt-Viewer nicht möglich.', true); }
    return;
  }
  var url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }));
  var a = h('a', { href: url, download: name }); document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
}
function copyText(text, okMsg) {
  try { navigator.clipboard.writeText(text).then(function () { toast(okMsg || 'In die Zwischenablage kopiert.'); }, function () { toast('Kopieren nicht möglich. Bitte markiere den Text und kopiere ihn von Hand.', true); }); } catch (e) { toast('Kopieren nicht möglich.', true); }
}
function codeBox(label, code) {
  return h('div', null, [h('p', { class: 'hint', text: label }), h('div', { style: 'display:flex;gap:12px;align-items:center;flex-wrap:wrap' }, [h('span', { class: 'code', id: 'code-out', text: code }), h('button', { class: 'btn btn-secondary btn-sm', type: 'button', text: 'Code kopieren', onclick: function () { copyText(code, 'Code kopiert.'); } })])]);
}
/* Alle Angaben zur Teilnahme: Termin, Teams-Link, Kalendereintrag und Buchungscode */
function participationCard(info, code) {
  var node = h('div', { style: 'display:flex;flex-direction:column;gap:16px' });
  node.appendChild(h('div', { class: 'chips-inline' }, [chipEl(info.category === 'dienstlich' ? 'biz' : 'priv', CAT_LABEL[info.category]), chipEl('type', info.type), chipEl('type', info.topic)]));
  node.appendChild(h('h2', { text: info.title, style: 'overflow-wrap:anywhere' }));
  node.appendChild(h('dl', { class: 'facts' }, [
    h('div', null, [h('dt', { text: 'Datum' }), h('dd', { text: dateLong(info.date) })]), h('div', null, [h('dt', { text: 'Uhrzeit' }), h('dd', { text: info.start + ' – ' + endHm(info) + ' Uhr' })]),
    h('div', null, [h('dt', { text: 'Dauer' }), h('dd', { text: info.duration + ' Minuten' })]), h('div', null, [h('dt', { text: 'Durchführung' }), h('dd', { text: info.host })])]));
  node.appendChild(h('div', { style: 'display:flex;flex-direction:column;gap:6px;align-items:flex-start' }, [
    h('a', { class: 'btn btn-secondary', href: info.teamsLink, target: '_blank', rel: 'noopener noreferrer', text: 'Zur Teams-Sitzung' }),
    h('div', { class: 'hint', style: 'overflow-wrap:anywhere', text: info.teamsLink })]));
  node.appendChild(h('div', null, h('button', { class: 'btn btn-primary', type: 'button', html: ico('download') + ' Kalendereintrag (.ics) herunterladen', onclick: function () { downloadIcs(info, code); } })));
  node.appendChild(codeBox('Dein Buchungscode', code));
  return node;
}
function codeWarning(title, text) { return h('div', { class: 'notice warn', role: 'alert' }, [h('b', { text: title }), h('div', { text: text })]); }

/* ---- Veranstaltung anbieten ---- */
function viewCreate() {
  var root = h('div', { class: 'page' }, h('div', { class: 'wrap narrow' }));
  var wrap = root.firstChild;
  function show() {
    clear(wrap);
    wrap.appendChild(h('h1', { html: 'Veranstaltung <span class="accent">anbieten</span>' }));
    wrap.appendChild(h('p', { class: 'lead', text: 'Teile dein Wissen oder lade zum Austausch ein, dienstlich oder privat. Jede und jeder kann einen Termin anlegen. Inhalte müssen legal, respektvoll und jugendfrei sein.' }));
    wrap.appendChild(buildEventForm({ onSubmit: function (p) { return Api.createEvent(p).then(function (r) { done(p, r.code); }); } }));
  }
  function done(p, code) {
    clear(wrap); window.scrollTo({ top: 0 }); rememberMyEv(p, code);
    wrap.appendChild(h('div', { class: 'notice ok', role: 'status', text: 'Danke! Deine Veranstaltung ist jetzt im Katalog sichtbar.' }));
    wrap.appendChild(h('h1', { text: p.title, style: 'margin-top:24px;overflow-wrap:anywhere' }));
    wrap.appendChild(h('p', { class: 'lead', text: dateLong(p.date) + ', ' + p.start + ' \u2013 ' + minToHm(toMin(p.start) + p.duration) + ' Uhr' }));
    wrap.appendChild(h('div', { style: 'margin-top:24px;display:flex;flex-direction:column;gap:16px' }, [
      codeWarning('Wichtig: Speichere deinen Veranstaltungscode!', 'Nur mit diesem Code siehst du später die aktuelle Teilnehmerliste deiner Veranstaltung. Er wird nicht per E-Mail verschickt und lässt sich nicht erneut anzeigen. Gib ihn bei Bedarf unter „Meine Veranstaltung“ ein.'),
      h('div', { class: 'panel' }, codeBox('Dein Veranstaltungscode', code))]));
    wrap.appendChild(h('div', { style: 'display:flex;gap:12px;flex-wrap:wrap;margin-top:24px' }, [h('a', { class: 'btn btn-primary', href: '#/veranstaltung?code=' + encodeURIComponent(code), text: 'Meine Veranstaltung öffnen' }), h('a', { class: 'btn btn-secondary', href: '#/', text: 'Zum Katalog' }), h('button', { class: 'btn btn-secondary', type: 'button', text: 'Weitere Veranstaltung anlegen', onclick: show })]));
  }
  show();
  return root;
}

/* ---- Meine Anmeldung: mit dem Buchungscode anzeigen, Kalendereintrag laden, stornieren ---- */
function codeForm(o) {
  var code = h('input', { type: 'text', id: o.id, autocomplete: 'off', placeholder: o.placeholder, value: o.value || '', style: 'text-transform:uppercase;letter-spacing:.1em', 'aria-label': o.label });
  var f = field(o.label, code, { id: o.id, req: true, hint: o.hint });
  var msg = h('div', { class: 'notice', hidden: true, role: 'alert' });
  var go = h('button', { type: 'submit', class: 'btn btn-primary', text: o.button });
  var form = h('form', { class: 'form', novalidate: true, style: 'margin-top:24px;max-width:520px' }, [f, msg, h('div', null, go)]);
  form.addEventListener('submit', function (e) {
    e.preventDefault(); msg.hidden = true; f.setErr('');
    if (normCode(code.value).length < o.len) { f.setErr('Bitte gib den vollständigen Code ein (' + o.example + ').'); return; }
    o.run(code.value);
  });
  return { form: form, code: code, fail: function (er) { go.disabled = false; go.textContent = o.button; msg.hidden = false; msg.className = 'notice bad'; msg.textContent = er.message; }, busy: function (t) { msg.hidden = true; go.disabled = true; go.textContent = t; }, reset: function () { go.disabled = false; go.textContent = o.button; } };
}
function viewMine(q) {
  var root = h('div', { class: 'page' }, h('div', { class: 'wrap narrow' })), wrap = root.firstChild;
  var result = h('div', { style: 'margin-top:32px' }), mineBox = h('div', { style: 'margin-top:40px' });
  var cf = codeForm({ id: 'x-code', label: 'Buchungscode', placeholder: 'XXXX-XXXX', value: q.code || '', example: 'z. B. K7M2-QX9P', len: 8, button: 'Anmeldung anzeigen', hint: 'Den Buchungscode hast du nach der Buchung im Fenster gesehen.', run: lookup });
  function show(r) {
    clear(result); cf.form.hidden = true; mineBox.hidden = true; window.scrollTo({ top: 0 }); rememberMine(r.eventInfo, r.code);
    result.appendChild(h('div', { class: 'panel', style: 'display:flex;flex-direction:column;gap:20px' }, [h('p', { text: 'Gebucht von: ' + r.name }), participationCard(r.eventInfo, r.code)]));
    var acts = h('div', { style: 'display:flex;gap:12px;flex-wrap:wrap;margin-top:20px' });
    var done = h('div', { style: 'margin-top:16px' });
    if (r.canCancel) {
      var cancel = h('button', { class: 'btn btn-danger', type: 'button', text: 'Teilnahme stornieren' });
      cancel.addEventListener('click', function () {
        if (!cancel._c) { cancel._c = true; cancel.textContent = 'Wirklich stornieren?'; setTimeout(function () { cancel._c = false; cancel.textContent = 'Teilnahme stornieren'; }, 4000); return; }
        cancel.disabled = true;
        Api.cancel(r.code).then(function () { forgetMine(r.code); clear(result); clear(acts); result.appendChild(h('div', { class: 'notice ok', role: 'status', text: 'Deine Teilnahme an „' + r.eventInfo.title + '“ wurde storniert. Der Platz ist wieder frei.' })); result.appendChild(h('p', { style: 'margin-top:20px' }, h('a', { class: 'btn btn-primary', href: '#/', text: 'Zum Katalog' }))); },
          function (er) { cancel.disabled = false; clear(done); done.appendChild(h('div', { class: 'notice bad', role: 'alert', text: er.message })); });
      });
      acts.appendChild(cancel);
    } else acts.appendChild(h('span', { class: 'hint', text: 'Die Veranstaltung hat begonnen oder ist vorbei. Eine Stornierung ist nicht mehr möglich.' }));
    acts.appendChild(h('button', { class: 'btn btn-secondary', type: 'button', text: 'Anderen Code eingeben', onclick: function () { location.hash = '#/anmeldung'; route(); } }));
    result.appendChild(acts); result.appendChild(done);
  }
  function lookup(c) { cf.busy('Wird gesucht …'); Api.lookup(c).then(show, cf.fail); }
  var mine = mineList();
  if (mine.length) {
    mineBox.appendChild(h('h2', { text: 'Auf diesem Gerät gespeichert', style: 'font-size:1.25rem;margin-bottom:12px' }));
    var ul = h('div', { style: 'display:flex;flex-direction:column;gap:10px' });
    mine.forEach(function (m) {
      ul.appendChild(h('div', { class: 'panel', style: 'display:flex;gap:12px;align-items:center;flex-wrap:wrap;padding:14px 18px' }, [h('div', { style: 'flex:1 1 240px;min-width:0' }, [h('b', { text: m.title, style: 'overflow-wrap:anywhere' }), h('div', { class: 'hint', text: dateFull(m.date) + ', ' + m.start + ' Uhr · Code ' + m.code })]),
        h('button', { class: 'btn btn-secondary btn-sm', type: 'button', text: 'Öffnen', onclick: function () { lookup(m.code); } }),
        h('button', { class: 'btn btn-secondary btn-sm', type: 'button', text: 'Vergessen', onclick: function () { forgetMine(m.code); location.hash = '#/anmeldung'; route(); } })]));
    });
    mineBox.appendChild(ul); mineBox.appendChild(h('p', { class: 'hint', style: 'margin-top:8px', text: 'Diese Liste liegt nur in diesem Browser, nicht auf dem Server.' }));
  }
  wrap.appendChild(h('h1', { html: 'Meine <span class="accent">Anmeldung</span>' }));
  wrap.appendChild(h('p', { class: 'lead', text: 'Gib deinen Buchungscode ein. Du siehst dann den Teams-Link zu deiner Veranstaltung, kannst die Kalenderdatei (.ics) herunterladen oder deine Teilnahme stornieren, wenn du nicht dabei sein kannst.' }));
  wrap.appendChild(cf.form); wrap.appendChild(result); wrap.appendChild(mineBox);
  if (q.code) lookup(q.code);
  return root;
}

/* ---- Meine Veranstaltung: mit dem Veranstaltungscode die Teilnehmerliste sehen ---- */
function viewMyEvent(q) {
  var root = h('div', { class: 'page' }, h('div', { class: 'wrap narrow' })), wrap = root.firstChild;
  var result = h('div', { style: 'margin-top:32px' }), mineBox = h('div', { style: 'margin-top:40px' });
  var cf = codeForm({ id: 'v-code', label: 'Veranstaltungscode', placeholder: 'XXXXX-XXXXX', value: q.code || '', example: 'z. B. K7M2Q-X9PWR', len: 10, button: 'Teilnehmerliste anzeigen', hint: 'Den Veranstaltungscode hast du nach dem Anlegen deiner Veranstaltung gesehen.', run: lookup });
  function show(r) {
    clear(result); cf.form.hidden = true; mineBox.hidden = true; window.scrollTo({ top: 0 }); rememberMyEv(r.eventInfo, r.code);
    var info = r.eventInfo, list = r.participants;
    var table = list.length ? h('div', { class: 'tbl-wrap' }, h('table', { class: 'tbl', style: 'min-width:0' }, [h('thead', null, h('tr', null, ['Nr.', 'Name', 'Angemeldet am'].map(function (t) { return h('th', { text: t }); }))),
      h('tbody', null, list.map(function (p, i) { var d = p.created ? new Date(p.created) : null; return h('tr', null, [h('td', { text: String(i + 1) }), h('td', { text: p.name }), h('td', { text: d && !isNaN(d) ? pad(d.getDate()) + '.' + pad(d.getMonth() + 1) + '.' + d.getFullYear() + ', ' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ' Uhr' : '' })]); }))])) : h('p', { class: 'hint', text: 'Noch niemand hat sich angemeldet.' });
    result.appendChild(h('div', { class: 'panel', style: 'display:flex;flex-direction:column;gap:18px' }, [
      h('div', { class: 'chips-inline' }, [chipEl(info.category === 'dienstlich' ? 'biz' : 'priv', CAT_LABEL[info.category]), chipEl('type', info.type), chipEl('type', info.topic)]),
      h('h2', { text: info.title, style: 'overflow-wrap:anywhere' }),
      h('dl', { class: 'facts' }, [h('div', null, [h('dt', { text: 'Datum' }), h('dd', { text: dateLong(info.date) })]), h('div', null, [h('dt', { text: 'Uhrzeit' }), h('dd', { text: info.start + ' – ' + endHm(info) + ' Uhr' })]), h('div', null, [h('dt', { text: 'Angemeldet' }), h('dd', { text: list.length + ' von ' + r.capacity + ' Plätzen' })]), h('div', null, [h('dt', { text: 'Teams-Sitzung' }), h('dd', null, h('a', { href: info.teamsLink, target: '_blank', rel: 'noopener noreferrer', text: 'Link öffnen' }))])]),
      h('h3', { text: 'Teilnehmerliste' }), table,
      h('div', { style: 'display:flex;gap:12px;flex-wrap:wrap' }, [h('button', { class: 'btn btn-secondary btn-sm', type: 'button', text: 'Aktualisieren', onclick: function () { lookup(r.code); } }), list.length ? h('button', { class: 'btn btn-secondary btn-sm', type: 'button', text: 'Liste kopieren', onclick: function () { copyText(info.title + '\n' + list.map(function (p, i) { return (i + 1) + '. ' + p.name; }).join('\n'), 'Teilnehmerliste kopiert.'); } }) : null]),
      r.isPast ? h('p', { class: 'hint', text: 'Die Veranstaltung hat begonnen oder ist vorbei.' }) : null]));
    result.appendChild(h('div', { style: 'margin-top:20px;display:flex;gap:12px;flex-wrap:wrap' }, [h('button', { class: 'btn btn-secondary', type: 'button', text: 'Anderen Code eingeben', onclick: function () { location.hash = '#/veranstaltung'; route(); } })]));
  }
  function lookup(c) { cf.busy('Wird gesucht …'); Api.eventLookup(c).then(show, function (er) { cf.fail(er); cf.form.hidden = false; }); }
  var mine = myEvList();
  if (mine.length) {
    mineBox.appendChild(h('h2', { text: 'Auf diesem Gerät gespeichert', style: 'font-size:1.25rem;margin-bottom:12px' }));
    var ul = h('div', { style: 'display:flex;flex-direction:column;gap:10px' });
    mine.forEach(function (m) {
      ul.appendChild(h('div', { class: 'panel', style: 'display:flex;gap:12px;align-items:center;flex-wrap:wrap;padding:14px 18px' }, [h('div', { style: 'flex:1 1 240px;min-width:0' }, [h('b', { text: m.title, style: 'overflow-wrap:anywhere' }), h('div', { class: 'hint', text: dateFull(m.date) + ', ' + m.start + ' Uhr · Code ' + m.code })]),
        h('button', { class: 'btn btn-secondary btn-sm', type: 'button', text: 'Öffnen', onclick: function () { lookup(m.code); } }),
        h('button', { class: 'btn btn-secondary btn-sm', type: 'button', text: 'Vergessen', onclick: function () { forgetMyEv(m.code); location.hash = '#/veranstaltung'; route(); } })]));
    });
    mineBox.appendChild(ul); mineBox.appendChild(h('p', { class: 'hint', style: 'margin-top:8px', text: 'Diese Liste liegt nur in diesem Browser, nicht auf dem Server.' }));
  }
  wrap.appendChild(h('h1', { html: 'Meine <span class="accent">Veranstaltung</span>' }));
  wrap.appendChild(h('p', { class: 'lead', text: 'Du hast eine Veranstaltung angeboten? Mit dem Veranstaltungscode siehst du, wer sich angemeldet hat. Änderungen oder Absagen der Veranstaltung übernimmt die Administration.' }));
  wrap.appendChild(cf.form); wrap.appendChild(result); wrap.appendChild(mineBox);
  if (q.code) lookup(q.code);
  return root;
}

/* ---- Handbuch ---- */
function viewManual() {
  var root = h('div', { class: 'page' }, h('div', { class: 'wrap' })), wrap = root.firstChild;
  wrap.appendChild(h('h1', { html: 'Nutzer<span class="accent">handbuch</span>' }));
  wrap.appendChild(h('p', { class: 'lead', text: 'So nutzt du ' + state.settings.appTitle + ': Veranstaltungen finden, dich anmelden, stornieren und selbst etwas anbieten.' }));
  var tools = h('div', { class: 'manual-tools' });
  if (CFG.pdfUrl) tools.appendChild(h('a', { class: 'btn btn-primary', href: rel(CFG.pdfUrl), download: 'LearnTogether-Nutzerhandbuch.pdf', html: ico('download') + ' Als PDF herunterladen' }));
  if (mode === 'server' && CFG.manualUrl) tools.appendChild(h('a', { class: 'btn btn-secondary', href: rel(CFG.manualUrl), target: '_blank', rel: 'noopener', html: ico('ext') + ' In neuem Tab öffnen' }));
  wrap.appendChild(tools);
  var body = h('div', { class: 'manual-body', html: CFG.manualHtml || '<p>Das Handbuch ist in dieser Version nicht enthalten.</p>' });
  var toc = h('nav', { class: 'manual-toc', 'aria-label': 'Inhalt' });
  $$('h2', body).forEach(function (hh, i) { hh.id = 'kap-' + (i + 1); toc.appendChild(h('a', { href: '#/handbuch', text: hh.textContent, onclick: function (e) { e.preventDefault(); hh.scrollIntoView({ behavior: 'smooth' }); } })); });
  wrap.appendChild(h('div', { class: 'manual-layout' }, [toc, body]));
  return root;
}

/* ---- Admin ---- */
function viewAdmin() {
  var root = h('div', { class: 'page' }, h('div', { class: 'wrap wide' })), wrap = root.firstChild;
  function login() {
    clear(wrap);
    var pw = h('input', { type: 'password', id: 'a-pw', autocomplete: 'current-password' });
    var fp = field('Passwort', pw, { id: 'a-pw', req: true }); var msg = h('div', { class: 'notice bad', role: 'alert', hidden: true }); var go = h('button', { type: 'submit', class: 'btn btn-primary', text: 'Anmelden' });
    var form = h('form', { class: 'form', style: 'max-width:420px;margin-top:24px', novalidate: true }, [fp, msg, h('div', null, go)]);
    form.addEventListener('submit', function (e) { e.preventDefault(); msg.hidden = true; go.disabled = true; Api.login(pw.value).then(panel, function (er) { go.disabled = false; msg.hidden = false; msg.textContent = er.message; pw.select(); }); });
    wrap.appendChild(h('h1', { text: 'Administration' }));
    wrap.appendChild(h('p', { class: 'lead', text: 'Dieser Bereich ist passwortgeschützt. Hier verwaltest du Veranstaltungen, Anmeldungen und Einstellungen.' }));
    wrap.appendChild(form); pw.focus();
  }
  var SECTIONS = [
    ['Übersicht', [['events', 'Veranstaltungen', 'Veranstaltungen und Anmeldungen']]],
    ['Katalog', [['texts', 'Texte', 'Texte im Katalog'], ['taxonomy', 'Themen', 'Themenbereiche und Themen'], ['types', 'Arten', 'Arten der Veranstaltung']]],
    ['System', [['general', 'Allgemein', 'Allgemeine Einstellungen'], ['password', 'Passwort', 'Admin-Passwort'], ['testdata', 'Testdaten', 'Testdaten']]]
  ];
  var section = sess.get('lt_admin_sec') || 'events';
  function panel() {
    clear(wrap);
    wrap.appendChild(h('div', { style: 'display:flex;gap:16px;align-items:center;flex-wrap:wrap' }, [h('h1', { text: 'Administration', style: 'flex:1' }), h('button', { class: 'btn btn-secondary', type: 'button', text: 'Abmelden', onclick: function () { adminToken = ''; sess.del('lt_admin'); login(); } })]));
    var nav = h('nav', { class: 'admin-nav', 'aria-label': 'Bereiche der Administration' }), content = h('div', { class: 'admin-content' }), head = h('h2', { class: 'admin-title' }), body = h('div');
    content.appendChild(head); content.appendChild(body);
    SECTIONS.forEach(function (g) {
      nav.appendChild(h('div', { class: 'admin-grp' }, [h('h3', { text: g[0] })].concat(g[1].map(function (it) {
        return h('button', { type: 'button', text: it[1], 'data-sec': it[0], 'aria-current': section === it[0] ? 'page' : null, onclick: function () { section = it[0]; sess.set('lt_admin_sec', section); $$('button', nav).forEach(function (x) { if (x.getAttribute('data-sec') === section) x.setAttribute('aria-current', 'page'); else x.removeAttribute('aria-current'); }); draw(); } });
      }))));
    });
    wrap.appendChild(h('div', { class: 'admin-layout' }, [nav, content]));
    function draw() {
      var meta = null; SECTIONS.forEach(function (g) { g[1].forEach(function (it) { if (it[0] === section) meta = it; }); });
      if (!meta) { section = 'events'; meta = SECTIONS[0][1][0]; }
      head.textContent = meta[2]; clear(body); body.appendChild(loading());
      var fn = { events: adminEvents, texts: adminTexts, taxonomy: adminTaxonomy, types: adminTypes, general: adminGeneral, password: adminPassword, testdata: adminTest }[section];
      fn().then(function (n) { clear(body); body.appendChild(n); }, function (er) { if (er.status === 401) { login(); return; } clear(body); body.appendChild(h('div', { class: 'notice bad', text: er.message })); });
    }
    draw();
  }
  function adminEvents() {
    return Api.adminEvents().then(function (list) {
      var F = { q: '', cat: '', type: '', topic: '', from: '', to: '' };
      var host = h('div'), count = h('span', { class: 'hint', 'aria-live': 'polite' });
      var search = h('input', { type: 'search', id: 'af-q', placeholder: 'Titel, Person, E-Mail, Thema …', 'aria-label': 'Veranstaltungen durchsuchen' });
      var catSel = h('select', { id: 'af-cat', 'aria-label': 'Bereich' }), typeSel = h('select', { id: 'af-type', 'aria-label': 'Art' }), topicSel = h('select', { id: 'af-topic', 'aria-label': 'Thema' });
      var from = h('input', { type: 'date', id: 'af-from', 'aria-label': 'Zeitraum von' }), to = h('input', { type: 'date', id: 'af-to', 'aria-label': 'Zeitraum bis' });
      function opt(v, t) { return h('option', { value: v, text: t }); }
      catSel.appendChild(opt('', 'Alle')); ['dienstlich', 'privat'].forEach(function (c) { catSel.appendChild(opt(c, CAT_LABEL[c])); });
      typeSel.appendChild(opt('', 'Alle')); TYPES.forEach(function (t) { typeSel.appendChild(opt(t, t)); });
      function fillTopics() {
        clear(topicSel); topicSel.appendChild(opt('', 'Alle'));
        ['dienstlich', 'privat'].forEach(function (c) {
          if (F.cat && F.cat !== c) return;
          var g = h('optgroup', { label: CAT_LABEL[c] });
          TOPICS[c].slice().sort(function (a, b) { return a.localeCompare(b, 'de'); }).forEach(function (t) { g.appendChild(h('option', { value: c + '|' + t, text: capFirst(t) })); });
          topicSel.appendChild(g);
        });
        topicSel.value = F.topic;
      }
      fillTopics();
      search.addEventListener('input', function () { F.q = search.value.toLowerCase().trim(); render(); });
      catSel.addEventListener('change', function () { F.cat = catSel.value; if (F.topic && F.cat && F.topic.split('|')[0] !== F.cat) F.topic = ''; fillTopics(); render(); });
      typeSel.addEventListener('change', function () { F.type = typeSel.value; render(); });
      topicSel.addEventListener('change', function () { F.topic = topicSel.value; render(); });
      from.addEventListener('input', function () { F.from = from.value; render(); }); to.addEventListener('input', function () { F.to = to.value; render(); });
      var resetBtn = h('button', { type: 'button', class: 'linkbtn', text: 'Filter zurücksetzen', hidden: true, onclick: function () { F = { q: '', cat: '', type: '', topic: '', from: '', to: '' }; search.value = ''; catSel.value = ''; typeSel.value = ''; from.value = ''; to.value = ''; fillTopics(); render(); } });
      function matches(e) {
        if (F.q && (e.title + ' ' + e.host + ' ' + (e.hostEmail || '') + ' ' + e.topic + ' ' + e.type + ' ' + CAT_LABEL[e.category]).toLowerCase().indexOf(F.q) < 0) return false;
        if (F.cat && e.category !== F.cat) return false;
        if (F.type && e.type !== F.type) return false;
        if (F.topic && (e.category + '|' + e.topic) !== F.topic) return false;
        if (F.from && e.date < F.from) return false;
        if (F.to && e.date > F.to) return false;
        return true;
      }
      function reload() { return Api.adminEvents().then(function (l) { list = l; render(); if (peopleId) { if (list.some(function (x) { return x.id === peopleId; })) showPeople(peopleId); else if (peopleModal) peopleModal.close(); } }); }
      function render() {
        clear(host);
        var now = new Date();
        var items = list.filter(matches).sort(function (a, b) { return startDate(a) - startDate(b); });
        var active = !!(F.q || F.cat || F.type || F.topic || F.from || F.to); resetBtn.hidden = !active; count.textContent = (active ? items.length + ' von ' : '') + list.length + ' Veranstaltungen, ' + items.reduce(function (s, e) { return s + e.booked; }, 0) + ' Anmeldungen' + (active ? ' in der Auswahl' : ' insgesamt');
        if (!items.length && active) { host.appendChild(h('div', { class: 'empty' }, [h('h2', { text: 'Nichts gefunden' }), h('p', { text: 'Für diese Filter gibt es keine Veranstaltung. Passe Suche, Filter oder Zeitraum an.' })])); return; }
        if (!items.length) { host.appendChild(h('div', { class: 'empty' }, [h('h2', { text: 'Keine Veranstaltungen' }), h('p', { text: 'Lege Veranstaltungen über „Veranstaltung anbieten“ an oder lade Testdaten.' })])); return; }
        var tb = h('tbody');
        items.forEach(function (e) {
          var past = startDate(e) <= now, f = freeOf(e), pct = Math.min(100, Math.round(e.booked / e.capacity * 100));
          var del = h('button', { class: 'btn btn-danger btn-sm', type: 'button', text: 'Löschen' });
          del.addEventListener('click', function () {
            if (del._c) { Api.adminDeleteEvent(e.id).then(function () { toast('Veranstaltung gelöscht.'); return reload(); }, function (er) { toast(er.message, true); }); return; }
            del._c = true; del.textContent = 'Wirklich löschen?'; setTimeout(function () { del._c = false; del.textContent = 'Löschen'; }, 4000);
          });
          tb.appendChild(h('tr', { class: past ? 'past' : '' }, [
            h('td', { class: 'c-title' }, [h('b', { text: e.title }), h('div', { class: 'meta' }, [h('span', { class: 'tag cat-' + e.category, text: CAT_LABEL[e.category] }), h('span', { text: e.type + ' · ' + capFirst(e.topic) }), e.isTest ? h('span', { class: 'tag test', text: 'Testdaten' }) : null, past ? h('span', { class: 'tag past', text: 'vergangen' }) : null]), e.code ? h('div', { class: 'hint', text: 'Veranstaltungscode ' + e.code }) : null]),
            h('td', { class: 'c-when' }, [h('b', { text: dateFull(e.date) }), h('div', { class: 'hint', text: e.start + '–' + endHm(e) + ' Uhr' })]),
            h('td', { class: 'c-host' }, [e.host, e.hostEmail ? h('div', { class: 'hint', text: e.hostEmail }) : null]),
            h('td', { class: 'c-occ' }, [h('b', { text: e.booked + ' / ' + e.capacity }), h('div', { class: 'bar' + (f <= 0 ? ' full' : f <= 5 ? ' warn' : '') }, h('i', { style: 'width:' + pct + '%' }))]),
            h('td', { class: 'c-act' }, h('div', { class: 'acts' }, [
              h('button', { class: 'btn btn-primary btn-sm', type: 'button', text: 'Teilnehmende (' + e.booked + ')', onclick: function () { showPeople(e.id); } }),
              h('button', { class: 'btn btn-secondary btn-sm', type: 'button', text: 'Bearbeiten', onclick: function () { editEvent(e, reload); } }), del]))]));
        });
        host.appendChild(h('div', { class: 'tbl-wrap' }, h('table', { class: 'tbl tbl-events' }, [h('thead', null, h('tr', null, ['Veranstaltung', 'Termin', 'Durchführung', 'Belegung', 'Aktionen'].map(function (t) { return h('th', { text: t }); }))), tb])));
      }
      var peopleModal = null, peopleId = null;
      function peopleBody(e) {
        var f = freeOf(e), pct = Math.min(100, Math.round(e.booked / e.capacity * 100));
        var body = h('div', { class: 'modal-body people' });
        body.appendChild(h('div', null, [h('div', { class: 'hint', text: 'Teilnehmende' }), h('h2', { text: e.title, style: 'margin:2px 0 0;overflow-wrap:anywhere' }), h('div', { class: 'hint', text: dateFull(e.date) + ', ' + e.start + '–' + endHm(e) + ' Uhr · ' + e.host })]));
        body.appendChild(h('div', { class: 'people-occ' }, [h('b', { text: e.booked + ' von ' + e.capacity + ' Plätzen belegt' }), h('div', { class: 'bar wide' + (f <= 0 ? ' full' : f <= 5 ? ' warn' : '') }, h('i', { style: 'width:' + pct + '%' }))]));
        if (!e.bookings.length) body.appendChild(h('div', { class: 'empty', style: 'padding:24px' }, h('p', { text: 'Noch keine Anmeldungen.' })));
        else {
          var tb = h('tbody');
          e.bookings.forEach(function (b, i) {
            var rm = h('button', { class: 'btn btn-danger btn-sm', type: 'button', text: 'Entfernen' });
            rm.addEventListener('click', function () {
              if (!rm._c) { rm._c = true; rm.textContent = 'Wirklich?'; setTimeout(function () { rm._c = false; rm.textContent = 'Entfernen'; }, 4000); return; }
              Api.adminDeleteBooking(b.id).then(function () { toast('Anmeldung entfernt.'); return reload(); }, function (er) { toast(er.message, true); });
            });
            tb.appendChild(h('tr', null, [h('td', { text: String(i + 1) }), h('td', null, h('b', { text: b.name })), h('td', { text: b.email, style: 'overflow-wrap:anywhere' }), h('td', null, h('code', { text: b.code })), h('td', { class: 'r' }, rm)]));
          });
          body.appendChild(h('div', { class: 'tbl-wrap' }, h('table', { class: 'tbl people-tbl' }, [h('thead', null, h('tr', null, ['Nr.', 'Name', 'E-Mail', 'Buchungscode', ''].map(function (t) { return h('th', { text: t }); }))), tb])));
        }
        body.appendChild(h('div', { class: 'people-foot' }, [
          e.bookings.length ? h('button', { class: 'btn btn-secondary btn-sm', type: 'button', text: 'E-Mail-Adressen kopieren', onclick: function () { copy(e.bookings.map(function (b) { return b.email; }).join('; ')); } }) : null,
          h('a', { class: 'btn btn-secondary btn-sm', target: '_blank', rel: 'noopener', href: e.teamsLink, text: 'Teams-Link öffnen' })]));
        return body;
      }
      function showPeople(id) {
        var e = list.filter(function (x) { return x.id === id; })[0]; if (!e) return;
        peopleId = id;
        if (peopleModal && peopleModal.node.parentNode) { var old = peopleModal.node.querySelector('.modal-body'); if (old) old.replaceWith(peopleBody(e)); return; }
        peopleModal = openModal(peopleBody(e), { wide: true, label: 'Teilnehmende', onClose: function () { peopleId = null; } });
      }
      render();
      function fld(label, ctl, cls) { return h('div', { class: 'afld' + (cls ? ' ' + cls : '') }, [h('label', { text: label }), ctl]); }
      return h('div', null, [h('div', { class: 'afilter' }, [fld('Suche', search, 'wide'), fld('Bereich', catSel), fld('Art', typeSel), fld('Thema', topicSel), fld('Von', from), fld('Bis', to)]),
        h('div', { class: 'toolrow' }, [count, resetBtn]), host]);
    });
  }
  function copy(text) { try { navigator.clipboard.writeText(text).then(function () { toast('In die Zwischenablage kopiert.'); }, function () { toast('Kopieren nicht möglich. Bitte manuell markieren: ' + text.slice(0, 80), true); }); } catch (e) { toast('Kopieren nicht möglich.', true); } }
  function editEvent(e, done) {
    var c = h('div', { class: 'modal-body' }), m;
    c.appendChild(h('h2', { text: 'Veranstaltung bearbeiten', style: 'padding-right:40px' }));
    c.appendChild(buildEventForm({ event: e, admin: true, submitLabel: 'Änderungen speichern', extraButtons: [h('button', { type: 'button', class: 'btn btn-secondary', text: 'Abbrechen', onclick: function () { m.close(); } })], onSubmit: function (p) { return Api.adminSaveEvent(p).then(function () { m.close(); toast('Änderungen gespeichert.'); return done(); }); } }));
    m = openModal(c, { wide: true, label: 'Veranstaltung bearbeiten' });
  }
  /* Liste mit Namen bearbeiten: umbenennen, hinzufuegen, loeschen (nur ohne Verwendung) */
  function listEditor(list, usageOf, o) {
    var host = h('div', { style: 'display:flex;flex-direction:column;gap:14px' });
    function render() {
      clear(host);
      var ul = h('div', { style: 'display:flex;flex-direction:column;gap:8px' });
      list.forEach(function (it, i) {
        var n = it.orig ? usageOf(it.orig) : 0;
        var inp = h('input', { type: 'text', value: it.name, maxlength: '40', 'aria-label': o.label + ' ' + (i + 1) + (o.ctx ? ' ' + o.ctx() : '') });
        inp.addEventListener('input', function () { it.name = inp.value; });
        var del = h('button', { type: 'button', class: 'btn btn-danger btn-sm', text: 'Löschen', title: n ? 'Wird von ' + n + ' Veranstaltung(en) verwendet' : o.label + ' löschen', disabled: n > 0, onclick: function () { if (list.length <= 1) { o.flash('bad', 'Es muss mindestens ein Eintrag bleiben.'); return; } list.splice(i, 1); render(); } });
        ul.appendChild(h('div', { style: 'display:flex;gap:10px;align-items:center;flex-wrap:wrap' }, [h('div', { style: 'flex:1 1 220px;max-width:360px' }, inp), del, n ? h('span', { class: 'hint', text: n + ' Veranstaltung' + (n === 1 ? '' : 'en') + ' – zum Löschen zuerst umstellen' }) : (it.orig ? null : h('span', { class: 'tag test', text: 'neu' }))]));
      });
      var add = h('input', { type: 'text', id: o.addId, maxlength: '40', placeholder: o.addPlaceholder, 'aria-label': o.addPlaceholder });
      function doAdd() { var v = add.value.trim(); if (!v) return; if (list.length >= o.max) { o.flash('bad', 'Höchstens ' + o.max + ' Einträge sind möglich.'); return; } list.push({ name: v, orig: '' }); render(); var f = $('#' + o.addId); if (f) f.focus(); }
      add.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); doAdd(); } });
      host.appendChild(ul);
      host.appendChild(h('div', { style: 'display:flex;gap:10px;align-items:center;flex-wrap:wrap' }, [h('div', { style: 'flex:1 1 220px;max-width:360px' }, add), h('button', { type: 'button', class: 'btn btn-secondary btn-sm', text: o.addText, onclick: doAdd })]));
    }
    render(); return host;
  }
  function flasher(msg) { return function (cls, text) { msg.hidden = false; msg.className = 'notice ' + cls; msg.textContent = text; }; }
  function adminTaxonomy() {
    return Api.adminEvents().then(function (evs) {
      var cats = ['dienstlich', 'privat'];
      var usage = {}; evs.forEach(function (e) { var k = e.category + '|' + e.topic; usage[k] = (usage[k] || 0) + 1; });
      var labels = { dienstlich: CAT_LABEL.dienstlich, privat: CAT_LABEL.privat }, colors = { dienstlich: COLORS.dienstlich, privat: COLORS.privat }, headings = { dienstlich: HEADINGS.dienstlich, privat: HEADINGS.privat }, texts = { dienstlich: TEXTS.dienstlich, privat: TEXTS.privat };
      var lists = {}; cats.forEach(function (c) { lists[c] = TOPICS[c].map(function (t) { return { name: t, orig: t }; }); });
      var msg = h('div', { class: 'notice', hidden: true, role: 'status' }), flash = flasher(msg);
      var host = h('div', { style: 'display:flex;flex-direction:column;gap:32px' }), active = 'dienstlich', panels = {}, segBtns = {};
      var seg = h('div', { class: 'seg', role: 'group', 'aria-label': 'Themenbereich wählen' });
      cats.forEach(function (c) {
        var lab = h('input', { type: 'text', id: 'tx-l-' + c, value: labels[c], maxlength: '30' });
        lab.addEventListener('input', function () { labels[c] = lab.value; title.textContent = 'Themenbereich „' + labels[c] + '“'; });
        var title = h('h2', { text: 'Themenbereich „' + labels[c] + '“', style: 'color:var(--accent);font-size:1.25rem' });
        // Farben: Hintergrund, Ueberschrift, Text
        var prev = h('div', { class: 'stage-prev', 'aria-hidden': 'true' }, [h('b', { text: 'Überschrift' }), h('span', { text: ' Beispieltext im Katalog' }), h('span', { class: 'sw', text: 'Kachel' })]);
        var fields = {};
        function colorField(key, map, idPart, label, hint) {
          var pick = h('input', { type: 'color', id: 'tx-' + idPart + 'p-' + c, value: map[c], 'aria-label': label + ' wählen', style: 'width:56px;min-height:46px;padding:2px;flex:none' });
          var hex = h('input', { type: 'text', id: 'tx-' + idPart + '-' + c, value: map[c], maxlength: '7', 'aria-label': 'Hex-Wert: ' + label, style: 'max-width:130px;font-family:ui-monospace,Consolas,monospace' });
          var f = field(label, h('div', { style: 'display:flex;gap:10px;align-items:center;flex-wrap:wrap' }, [pick, hex]), { hint: hint });
          f.setVal = function (x) { map[c] = x; hex.value = x; if (hexOk(x)) pick.value = x.toLowerCase(); paintPrev(); };
          pick.addEventListener('input', function () { f.setVal(pick.value); });
          hex.addEventListener('input', function () { var v = hex.value.trim(); if (v && v[0] !== '#') v = '#' + v; map[c] = v; if (hexOk(v)) pick.value = v.toLowerCase(); paintPrev(); });
          fields[key] = f; return f;
        }
        var fbg = colorField('bg', colors, 'c', 'Hintergrundfarbe', 'Hintergrund des Katalogs; Kacheln und Rahmen werden daraus abgeleitet.');
        var fhd = colorField('head', headings, 'h', 'Farbe der Überschriften', 'Für die Themenreihen und die große Überschrift.');
        var ftx = colorField('text', texts, 't', 'Farbe der Texte', 'Für Hinweistext, Titel und Angaben auf den Kacheln.');
        function paintPrev() { var er = pairError(labels[c], colors[c], headings[c], texts[c]); fbg.setErr(er); if (!er) prev.style.cssText = stageStyle(colors[c], headings[c], texts[c]); }
        var defBtn = h('button', { type: 'button', class: 'btn btn-secondary btn-sm', text: 'Standardfarben', onclick: function () { fhd.setVal(DEFAULT_TAX.headings[c]); ftx.setVal(DEFAULT_TAX.texts[c]); fbg.setVal(DEFAULT_TAX.colors[c]); } });
        var fcol = h('div', { style: 'display:flex;flex-direction:column;gap:16px' }, [fbg, fhd, ftx, h('div', null, defBtn)]);
        paintPrev();
        var ed = listEditor(lists[c], function (orig) { return usage[c + '|' + orig] || 0; }, { label: 'Thema', ctx: function () { return 'im Themenbereich ' + labels[c]; }, addId: 'tx-a-' + c, addPlaceholder: 'Neues Thema', addText: 'Thema hinzufügen', max: 30, flash: flash });
        panels[c] = h('div', { class: 'panel', hidden: c !== active, style: 'display:flex;flex-direction:column;gap:16px' }, [title,
          h('div', { class: 'grid2' }, [field('Bezeichnung des Themenbereichs', lab, { id: 'tx-l-' + c, hint: 'Nur die Bezeichnung ist änderbar. Der Bereich selbst kann nicht gelöscht oder ergänzt werden.' }), fcol]), prev,
          h('h3', { text: 'Themen' }), ed]);
        host.appendChild(panels[c]);
        segBtns[c] = h('button', { type: 'button', text: labels[c], 'aria-pressed': String(c === active), onclick: function () { active = c; cats.forEach(function (k) { panels[k].hidden = k !== c; segBtns[k].setAttribute('aria-pressed', String(k === c)); }); } });
        seg.appendChild(segBtns[c]);
        lab.addEventListener('input', function () { segBtns[c].textContent = lab.value || c; });
      });
      var save = h('button', { type: 'button', class: 'btn btn-primary', text: 'Änderungen speichern' });
      save.addEventListener('click', function () {
        save.disabled = true;
        Api.adminSaveTaxonomy({ labels: labels, colors: colors, headings: headings, texts: texts, topics: lists }).then(function (r) { applyTaxonomy(r); toast('Themenbereiche gespeichert.'); return adminTaxonomy(); }).then(function (node) { self.parentNode.replaceChild(node, self); }, function (er) { save.disabled = false; flash('bad', er.message); });
      });
      var self = h('div', { style: 'display:flex;flex-direction:column;gap:20px;max-width:900px' }, [
        h('p', { class: 'lead', text: 'Hier passt du Bezeichnung, Farbe und Themen der beiden Themenbereiche an. Beim Umbenennen eines Themas werden bestehende Veranstaltungen automatisch angepasst. Ein Thema lässt sich nur löschen, wenn keine Veranstaltung es verwendet.' }), seg, host, msg, h('div', null, save)]);
      return self;
    });
  }
  function adminTypes() {
    return Api.adminEvents().then(function (evs) {
      var usage = {}; evs.forEach(function (e) { usage[e.type] = (usage[e.type] || 0) + 1; });
      var list = TYPES.map(function (t) { return { name: t, orig: t }; });
      var msg = h('div', { class: 'notice', hidden: true, role: 'status' }), flash = flasher(msg);
      var ed = listEditor(list, function (o) { return usage[o] || 0; }, { label: 'Art', addId: 'ty-add', addPlaceholder: 'Neue Art', addText: 'Art hinzufügen', max: MAX_TYPES, flash: flash });
      var save = h('button', { type: 'button', class: 'btn btn-primary', text: 'Änderungen speichern' });
      save.addEventListener('click', function () {
        save.disabled = true;
        Api.adminSaveTaxonomy({ types: list }).then(function (r) { applyTaxonomy(r); toast('Arten gespeichert.'); return adminTypes(); }).then(function (node) { self.parentNode.replaceChild(node, self); }, function (er) { save.disabled = false; flash('bad', er.message); });
      });
      var self = h('div', { style: 'display:flex;flex-direction:column;gap:20px;max-width:900px' }, [
        h('p', { class: 'lead', text: 'Die Arten der Veranstaltung (z. B. Workshop oder Austausch) erscheinen im Formular, als Chip auf den Kacheln und im Katalogfilter. Du kannst Arten hinzufügen (bis zu 50), umbenennen und löschen. Umbenennen passt bestehende Veranstaltungen an, gelöscht wird nur, was keine Veranstaltung verwendet.' }),
        h('div', { class: 'panel' }, ed), msg, h('div', null, save)]);
      return self;
    });
  }
  function inp(id, val, type, extra) { return h('input', Object.assign({ type: type || 'text', id: id, value: val == null ? '' : String(val) }, extra || {})); }
  function boxMsg() { return h('div', { class: 'notice', hidden: true, role: 'status' }); }
  function say(m, cls, text) { m.hidden = false; m.className = 'notice ' + cls; m.textContent = text; }
  function adminTexts() {
    return Promise.resolve().then(function () {
      var t = inp('h-title', HERO.title, 'text', { maxlength: '80' }), x = h('textarea', { id: 'h-text', rows: '5', maxlength: '500' }); x.value = HERO.text;
      var count = h('span', { class: 'hint' }), msg = boxMsg();
      var prev = h('div', { class: 'stage-prev hero-prev', style: paintStage('dienstlich'), 'aria-hidden': 'true' }, [h('div', { class: 'ph-t' }), h('div', { class: 'ph-x' })]);
      function upd() { $('.ph-t', prev).textContent = t.value; $('.ph-x', prev).textContent = x.value; count.textContent = x.value.length + ' / 500 Zeichen'; }
      t.addEventListener('input', upd); x.addEventListener('input', upd); upd();
      var save = h('button', { type: 'button', class: 'btn btn-primary', text: 'Texte speichern' });
      save.addEventListener('click', function () {
        save.disabled = true;
        Api.adminSaveSettings({ heroTitle: t.value, heroText: x.value }).then(function () { applyTaxonomy({ hero: { title: t.value.trim(), text: x.value.trim() } }); save.disabled = false; toast('Texte gespeichert.'); say(msg, 'ok', 'Die Texte sind im Katalog sichtbar.'); }, function (er) { save.disabled = false; say(msg, 'bad', er.message); });
      });
      var reset = h('button', { type: 'button', class: 'btn btn-secondary', text: 'Standardtexte einsetzen', onclick: function () { t.value = DEFAULT_HERO.title; x.value = DEFAULT_HERO.text; upd(); } });
      return h('div', { style: 'display:flex;flex-direction:column;gap:20px;max-width:900px' }, [
        h('p', { class: 'lead', text: 'Überschrift und Hinweistext oben im Katalog. Sie sind für alle Besucher sichtbar. Der Button „Selbst etwas anbieten“ bleibt bestehen.' }),
        h('div', { class: 'panel', style: 'display:flex;flex-direction:column;gap:16px' }, [field('Überschrift', t, { id: 'h-title', req: true, hint: 'Kurz und einladend, bis zu 80 Zeichen.' }), field('Hinweistext', x, { id: 'h-text', req: true, hint: 'Nenne, was es zu entdecken gibt, wie die Anmeldung geht und wann die Termine stattfinden (bis zu 500 Zeichen).' }), count]),
        h('div', null, [h('h3', { text: 'Vorschau', style: 'margin-bottom:8px' }), prev]), msg, h('div', { style: 'display:flex;gap:12px;flex-wrap:wrap' }, [save, reset])]);
    });
  }
  function adminGeneral() {
    return Api.adminSettings().then(function (s) {
      var isLocal = !!s.local;
      var title = inp('s-title', s.appTitle, 'text', { maxlength: '60' });
      var msg = boxMsg(), go = h('button', { class: 'btn btn-primary', type: 'submit', text: 'Speichern' });
      var form = h('form', { class: 'form panel', style: 'gap:20px;max-width:900px', novalidate: true }, [
        field('Titel der Anwendung', title, { id: 's-title', req: true, hint: 'Erscheint im Kopf der Seite und im Browser-Tab, z. B. „LearnTogether@AD“ oder später „LearnTogether@R+V“.' }), msg, h('div', null, go)]);
      form.addEventListener('submit', function (e) {
        e.preventDefault(); msg.hidden = true; go.disabled = true;
        var p = { appTitle: title.value };
        Api.adminSaveSettings(p).then(function () { go.disabled = false; state.settings.appTitle = title.value.trim(); applyTitle(); toast('Einstellungen gespeichert.'); }, function (er) { go.disabled = false; say(msg, 'bad', er.message); });
      });
      return form;
    });
  }
  function adminPassword() {
    return Promise.resolve().then(function () {
      var cur = inp('p-cur', '', 'password', { autocomplete: 'current-password' }), n1 = inp('p-new', '', 'password', { autocomplete: 'new-password' }), n2 = inp('p-new2', '', 'password', { autocomplete: 'new-password' });
      var pmsg = boxMsg(), pgo = h('button', { class: 'btn btn-primary', type: 'submit', text: 'Passwort ändern' });
      var pform = h('form', { class: 'form panel', style: 'gap:16px;max-width:900px', novalidate: true }, [h('div', { class: 'grid3' }, [field('Aktuelles Passwort', cur, { id: 'p-cur', req: true }), field('Neues Passwort', n1, { id: 'p-new', req: true, hint: 'Mindestens 8 Zeichen.' }), field('Neues Passwort wiederholen', n2, { id: 'p-new2', req: true })]), pmsg, h('div', null, pgo)]);
      pform.addEventListener('submit', function (e) {
        e.preventDefault();
        if (n1.value !== n2.value) { say(pmsg, 'bad', 'Die beiden neuen Passwörter stimmen nicht überein.'); return; }
        Api.adminChangePassword(cur.value, n1.value).then(function () { say(pmsg, 'ok', 'Das Passwort wurde geändert.'); cur.value = n1.value = n2.value = ''; }, function (er) { say(pmsg, 'bad', er.message); });
      });
      return pform;
    });
  }
  function adminTest(flash) {
    return Api.adminEvents().then(function (list) {
      var n = list.filter(function (e) { return e.isTest; }).length, self;
      var msg = h('div', { class: 'notice' + (flash ? ' ' + flash.cls : ''), role: 'status', hidden: !flash, text: flash ? flash.text : '' });
      function run(m) {
        msg.hidden = false; msg.className = 'notice info'; msg.textContent = 'Wird ausgeführt …';
        Api.adminTestData(m).then(function (r) {
          return adminTest({ cls: 'ok', text: m === 'load' ? r.events + ' Veranstaltungen mit ' + r.bookings + ' Anmeldungen wurden geladen.' : 'Alle Testdaten wurden entfernt.' });
        }).then(function (node) { self.parentNode.replaceChild(node, self); }, function (er) { msg.className = 'notice bad'; msg.textContent = er.message; });
      }
      var scen = ['Ausgebuchte Veranstaltung (Kachel mit Chip „Ausgebucht“, Popup lässt sich nicht öffnen)', 'Veranstaltungen mit „Fast ausgebucht“ (1, 3 und genau 5 freie Plätze)', 'Veranstaltungen mit viel Platz und ohne Anmeldungen, eine mit der Höchstzahl von 50 Plätzen', 'Vergangene Veranstaltung (nur im Admin-Bereich sichtbar)', 'Alle Dauern von 15 bis 120 Minuten', 'Morgens (06:00–09:00 Uhr) und nachmittags (17:00–20:00 Uhr)', 'Beide Themenbereiche mit allen aktuellen Themen und Arten, auch neu angelegten', 'Mit hochgeladenem Bild und mit Platzhalterbild', 'Sehr langer Titel, Listen und Zwischenüberschriften in der Beschreibung', 'Anbieter mit E-Mail-Adresse und vorhandene Anmeldungen (Beispieladressen @example.org)'];
      self = h('div', { style: 'display:flex;flex-direction:column;gap:20px;max-width:760px' }, [
        h('p', { class: 'lead', text: 'Testdaten füllen die Anwendung mit Beispielveranstaltungen, damit du alle Szenarien ausprobieren kannst. Sie richten sich nach den aktuell eingestellten Themen und Arten und ändern diese Einstellungen nicht. Sie sind mit „Testdaten“ markiert und lassen sich jederzeit wieder entfernen. Deine echten Veranstaltungen bleiben unberührt.' }),
        h('div', { class: 'panel' }, [h('h3', { text: 'Enthaltene Szenarien', style: 'margin-bottom:8px' }), h('ul', { style: 'margin:0;padding-left:1.2em' }, scen.map(function (s) { return h('li', { text: s }); }))]),
        h('p', null, [h('b', { text: n ? n + ' Testveranstaltungen sind aktuell vorhanden.' : 'Aktuell sind keine Testdaten vorhanden.' })]),
        h('div', { style: 'display:flex;gap:12px;flex-wrap:wrap' }, [h('button', { class: 'btn btn-primary', type: 'button', text: n ? 'Testdaten neu laden' : 'Testdaten laden', onclick: function () { run('load'); } }), h('button', { class: 'btn btn-danger', type: 'button', text: 'Testdaten entfernen', disabled: !n, onclick: function () { run('remove'); } }), mode === 'local' ? h('button', { class: 'btn btn-secondary', type: 'button', text: 'Demo komplett zurücksetzen', onclick: function () { Local.reset(); location.reload(); } }) : null]),
        msg]);
      return self;
    });
  }
  if (adminToken) panel(); else login();
  return root;
}

/* ====================================================== Rahmen, Routing */
var NAV = [['/', 'Katalog'], ['/anbieten', 'Veranstaltung anbieten'], ['/anmeldung', 'Meine Anmeldung'], ['/veranstaltung', 'Meine Veranstaltung'], ['/handbuch', 'Handbuch'], ['/admin', 'Admin']];
function applyTitle() {
  var t = state.settings.appTitle || DEFAULT_TITLE;
  document.title = t; var n = $('.brand .name'); if (n) n.innerHTML = appTitleHtml(t);
  var s = $('.foot .ftitle'); if (s) s.textContent = t;
}
function shell() {
  var logo = CFG.logoDark || rel('AppData/assets/ruv-logo-dunkelblau.png'), logoW = CFG.logoWhite || rel('AppData/assets/ruv-logo-weiss.png');
  document.body.appendChild(h('a', { class: 'sr', href: '#main', text: 'Zum Inhalt springen' }));
  var top = h('header', { class: 'top' }, h('div', { class: 'wrap' }, [
    h('a', { class: 'brand', href: '#/', 'aria-label': 'Zur Startseite' }, [h('img', { src: logo, alt: 'R+V' }), h('span', { class: 'sep' }), h('span', { class: 'name' })]),
    h('nav', { class: 'main', 'aria-label': 'Hauptnavigation' }, NAV.map(function (n) { return h('a', { href: '#' + n[0], 'data-r': n[0], html: (n[0] === '/admin' ? ico('lock') : '') + esc(n[1]) }); }))]));
  document.body.appendChild(top);
  if (mode === 'local') {
    var why = CFG.mode === 'artifact' ? null : (diag || 'Der Server wurde nicht erreicht.');
    var det = why ? h('details', { class: 'demo-why' }, [h('summary', { text: 'Warum Demo-Modus?' }), h('p', { text: why }), h('p', { class: 'hint', text: 'Geprüfte Adresse: ' + location.origin + API + '?action=ping' }), h('button', { type: 'button', class: 'btn btn-secondary btn-sm', text: 'Erneut prüfen', onclick: function () { location.reload(); } })]) : null;
    document.body.appendChild(h('div', { class: 'demo-banner' }, h('div', { class: 'wrap' }, [h('b', { text: 'Demo-Modus' }), h('span', { text: 'Die Daten liegen nur in diesem Browser. Das Admin-Passwort für den Test lautet RuVTest1234.' }), det])));
  }
  if (mode === 'server' && pingInfo && pingInfo.writable === false) document.body.appendChild(h('div', { class: 'notice bad', role: 'alert', style: 'border-radius:0;padding:12px 16px' }, [h('b', { text: 'Server erreicht, aber Speichern nicht möglich. ' }), pingInfo.storageError || 'Dem Anwendungspool fehlen Schreibrechte auf AppData\\Data.']));
  appEl = h('main', { id: 'main', tabindex: '-1' }); document.body.appendChild(appEl);
  document.body.appendChild(h('footer', { class: 'foot' }, h('div', { class: 'wrap' }, [h('img', { src: logoW, alt: 'R+V' }), h('span', null, [h('b', { class: 'ftitle' }), ' \u00b7 Informelles Lernen im Außendienst']), h('span', { class: 'sp', text: 'Version ' + (CFG.version || '') })])));
  applyTitle();
}
function parseRoute() {
  var raw = (location.hash || '#/').slice(1) || '/'; var qi = raw.indexOf('?'); var path = qi < 0 ? raw : raw.slice(0, qi); var q = {};
  if (qi >= 0) raw.slice(qi + 1).split('&').forEach(function (p) { var kv = p.split('='); if (kv[0]) q[decodeURIComponent(kv[0])] = decodeURIComponent((kv[1] || '').replace(/\+/g, ' ')); });
  return { path: path || '/', q: q };
}
function route() {
  var r = parseRoute(), node;
  while (modalStack.length) modalStack[modalStack.length - 1].close();
  switch (r.path) {
    case '/anbieten': node = viewCreate(); break;
    case '/anmeldung': case '/stornieren': node = viewMine(r.q); break;
    case '/veranstaltung': node = viewMyEvent(r.q); break;
    case '/handbuch': node = viewManual(); break;
    case '/admin': node = viewAdmin(); break;
    default: r.path = '/'; node = viewCatalog();
  }
  clear(appEl); appEl.appendChild(node);
  $$('nav.main a').forEach(function (a) { if (a.getAttribute('data-r') === r.path) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
  window.scrollTo(0, 0);
}
/* Prueft, ob api.ashx antwortet, und erklaert andernfalls den Grund */
function probeServer() {
  if (location.protocol === 'file:') { diag = 'Die Seite wurde direkt aus dem Dateisystem geöffnet (file://). Sie muss über die Adresse des Webservers aufgerufen werden, z. B. https://server/pfad/index.html.'; return Promise.resolve(false); }
  return fetch(API + '?action=ping', { cache: 'no-store' }).then(function (r) {
    return r.text().then(function (t) {
      var j = null; try { j = JSON.parse(t); } catch (e) { }
      if (j && j.server) { pingInfo = j; return true; }
      if (r.status === 404) diag = 'Die Datei AppData/api.ashx wurde nicht gefunden (HTTP 404). Prüfe, ob der Ordner AppData mit api.ashx auf den Server kopiert wurde und ob die Adresse zum Ordner mit index.html passt.';
      else if (r.status === 500) diag = 'Der Server meldet einen Fehler (HTTP 500). Häufige Ursachen: ASP.NET 4.x ist nicht installiert, der Anwendungspool steht nicht auf „.NET CLR Version v4.0“ (Integrierter Modus), die web.config passt nicht zur Serverkonfiguration oder api.ashx konnte nicht kompiliert werden. Öffne zur Fehlersuche AppData/selftest.ashx im Browser (zeigt Umgebung, Schreibrechte und Übersetzungsfehler) oder AppData\\Data\\error.log.';
      else if (r.status === 401 || r.status === 403) diag = 'Der Zugriff auf AppData/api.ashx wird verweigert (HTTP ' + r.status + '). Prüfe die anonyme Authentifizierung und die Ordnerberechtigungen.';
      else if (r.status >= 400) diag = 'Der Server antwortet mit HTTP ' + r.status + ' auf AppData/api.ashx.';
      else if (t.indexOf('<%@') >= 0) diag = 'Der IIS liefert api.ashx als Text aus. ASP.NET ist für diese Anwendung nicht aktiv (Windows-Feature „ASP.NET 4.x“ installieren, Anwendungspool auf .NET CLR v4 stellen).';
      else diag = 'Die Antwort von AppData/api.ashx ist kein gültiges JSON. Vermutlich liefert der Server eine andere Seite (z. B. Anmeldeseite oder Umleitung) statt der API.';
      return false;
    });
  }, function () { diag = 'Der Server ist nicht erreichbar (Netzwerkfehler, Zertifikat oder blockierte Anfrage).'; return false; });
}
function boot() {
  var probe = CFG.mode === 'artifact' ? Promise.resolve(false) : probeServer();
  probe.then(function (ok) { if (ok) { mode = 'server'; Api = Server; } }).then(function () {
    return Api.settings().catch(function () { return { appTitle: DEFAULT_TITLE }; });
  }).then(function (s) {
    state.settings = s; applyTaxonomy(s); shell(); route(); window.addEventListener('hashchange', route);
    window.__LT_READY__ = true;
  });
}
window.__LT_TEST__ = { Local: Local, buildTestData: buildTestData, sanitizeHtml: sanitizeHtml, validateEvent: validateEvent };
boot();
})();
