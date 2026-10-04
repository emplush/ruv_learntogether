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
/* Datenschutz: Durchschnittswerte erst ab drei Bewertungen; Konten ohne Anmeldung werden nach 24 Monaten geloescht (wie auf dem Server) */
var MIN_RATINGS = 3, INACTIVE_MONTHS = 24, RETAIN_PRIVATE_MONTHS = 12;
/* IDD-Einstellungen aus den Settings (Hauptschalter, Bildungsdienstleister, Begruessung und Verabschiedung je 5 Minuten) */
var IDD = { on: false, provider: '', frame: 5, welcome: { title: 'Begrüßung', text: '' }, farewell: { title: 'Verabschiedung', text: '' } };
/* Beschreibung des Lerninhalts: Kategorien wie in der Weiterbildungsdatenbank von gutBeraten (wie auf dem Server) */
var IDD_CONTENTS = ['Privat-Vorsorge-Lebens-/Rentenversicherung', 'Privat-Vorsorge-Kranken-/Pflegeversicherung', 'Privat-Sach-/Schadenversicherung', 'Firmenkunden-Vorsorge (BAV/Personenversicherung)', 'Firmenkunden-Sach-/Schadenversicherung', 'Mehrere versicherungsrelevante Themen', 'Kundenorientierte Beratung im Versicherungsvertrieb', 'Management einer Vertriebseinheit in der Versicherungswirtschaft', 'Wirtschaftswissenschaften mit Bezug zur Versicherungsvermittlung/-beratung', 'Personalführung mit Bezug zur Versicherungsvermittlung/-beratung', 'Versicherungsspezifische Software'];
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
  copy: '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>',
  download: '<path d="M12 3v12M7 10l5 5 5-5M5 21h14"/>', ext: '<path d="M15 3h6v6M10 14L21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
  book: '<path d="M2 4h7a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H2z"/><path d="M22 4h-7a3 3 0 0 0-3 3v13a2 2 0 0 1 2-2h8z"/>',
  trend: '<path d="M22 7l-8.5 8.5-5-5L2 17"/><path d="M16 7h6v6"/>',
  pulse: '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  cup: '<path d="M17 8h1a4 4 0 1 1 0 8h-1M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4zM6 2v2M10 2v2M14 2v2"/>',
  globe: '<circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15 15 0 0 1 0 20 15 15 0 0 1 0-20"/>',
  star: '<path d="M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.8-6.2-3.3-6.2 3.3L7 14.2 2 9.3l6.9-1z"/>'
};
/* Symbole aus dem R+V-Iconfont (RuV-Icons-v3); die SVG-Zeichnungen oben sind nur noch Rueckfall */
var GLYPH = { search: 'E972', left: 'E979', right: 'E97A', lock: 'E956', link: 'E9AD', plus: 'E97C', minus: 'E96C', copy: 'E9CE', download: 'E96F', ext: 'E973', list: 'E96B', olist: 'E96B', undo: 'E96D', redo: 'E96D',
  book: 'E9DA', trend: 'E983', pulse: 'E9C9', sun: 'E946', cup: 'E9CD', globe: 'E92E', star: 'E9AE', info: 'E900', warn: 'E903', check: 'E931', cross: 'E985', calendar: 'E94E', pdf: 'E936', chart: 'E91E' };
function ico(n) { return GLYPH[n] ? '<i class="ruv-i' + (n === 'undo' ? ' flip' : '') + '" aria-hidden="true">&#x' + GLYPH[n] + ';</i>' : ICONS[n] ? svg(ICONS[n]) : ''; }

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
var DEFAULT_HERO = { title: 'Voneinander lernen. *Miteinander wachsen.*', text: 'Entdecke, was Kolleginnen und Kollegen bewegt: Workshops, Erfahrungsaustausch und Best Practices, dienstlich wie privat. Melde Dich in zwei Klicks an oder teile selbst, was Du weißt. Live online in Teams, montags bis freitags morgens (06:00 bis 09:00 Uhr) oder nachmittags (17:00 bis 20:00 Uhr).' };
var BADGES = { levels: [1, 5, 10, 20, 40, 80], expertMin: 5 };
var AVATAR_UPLOAD = true, PHOTOS = []; /* Hochladen von Profilbildern erlaubt; eigene Fotos als Platzhalterbilder (Admin) */
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
  if (t.avatarUpload != null) AVATAR_UPLOAD = !!t.avatarUpload;
  if (t.photos) PHOTOS = t.photos.slice();
  if (t.badges) { if (t.badges.levels && t.badges.levels.length === 6) BADGES.levels = t.badges.levels.slice(); if (t.badges.expertMin) BADGES.expertMin = t.badges.expertMin; }
  if (t.hero) { if (t.hero.title) HERO.title = t.hero.title; if (t.hero.text) HERO.text = t.hero.text; }
  if (t.idd) IDD = t.idd;
}
/* alphabetisch, "Sonstiges" immer zuletzt */
function sortTopics(l) { return l.slice().sort(function (a, b) { var sa = a.toLowerCase() === 'sonstiges', sb = b.toLowerCase() === 'sonstiges'; if (sa !== sb) return sa ? 1 : -1; return a.localeCompare(b, 'de'); }); }
function topline(t) { return h('div', { class: 'topline', text: t }); }
/* Ueberschrift mit Highlight: *Wort* wird orange; ohne Markierung alles nach dem ersten Satz */
function hlHtml(t) {
  var s = esc(String(t));
  if (/\*[^*]+\*/.test(s)) return s.replace(/\*([^*]+)\*/g, '<span class="hl">$1</span>');
  var m = s.match(/^(.+?[.!?])\s+(.+)$/); return m ? m[1] + ' <span class="hl">' + m[2] + '</span>' : s;
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
var RETAIN_YEARS = 5;
function endDate(e) { return new Date(startDate(e).getTime() + e.duration * 60000); }
function eventEnded(e) { return endDate(e) <= new Date(); }
/* Zeitpunkt der Anonymisierung: fuenf Jahre nach dem Ende, fuer alle Veranstaltungen (privat, dienstlich, abgesagt) */
/* dienstlich: 5 Jahre ab Ende des Kalenderjahres (IDD-Nachweis); privat: 12 Monate nach dem Ende (kein Nachweiszweck) */
function anonymizeOn(e) { var x = endDate(e); if (e.category === 'privat') { x.setMonth(x.getMonth() + RETAIN_PRIVATE_MONTHS); return x; } return new Date(x.getFullYear() + RETAIN_YEARS + 1, 0, 1); }
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
  if (v.idd) {
    if (v.category !== 'dienstlich') e.idd = 'IDD-anrechenbar können nur dienstliche Veranstaltungen sein.';
    if (IDD_CONTENTS.indexOf(v.iddContent) < 0) e.iddContent = 'Bitte wähle die Beschreibung des Lerninhalts.';
    var it = String(v.iddTitle || '').replace(/\s+/g, ' ').trim(); if (it.length < 5 || it.length > 150) e.iddTitle = 'Bitte gib einen IDD-Titel mit 5 bis 150 Zeichen an. Er ist bei IDD-Veranstaltungen Pflicht.';
    var room = Number(v.duration) - 2 * (IDD.frame || 5), ag = v.agenda && v.agenda.length ? v.agenda : null, sm = 0, si = 0, bad = '';
    if (!v.duration) bad = 'Bitte wähle zuerst die Dauer. Danach planst Du die Agenda.';
    else if (ag) ag.forEach(function (b) { sm += Number(b.minutes) || 0; si += Number(b.iddMinutes) || 0; if (String(b.content || '').trim().length < 3) bad = bad || 'Jeder Agenda-Eintrag braucht Inhalte mit mindestens 3 Zeichen.'; if (Number(b.iddMinutes) > Number(b.minutes)) bad = bad || 'Die IDD-Bildungszeit eines Eintrags darf nicht länger sein als seine Dauer.'; });
    if (!bad && ag && sm !== room) bad = 'Die Einträge der Agenda müssen zusammen ' + room + ' Minuten dauern. Aktuell sind es ' + sm + ' Minuten.';
    if (!bad && ag && si < 5) bad = 'Mindestens ein Eintrag braucht IDD-Bildungszeit.';
    if (bad) e.iddMinutes = bad;
  }
  return e;
}

/* ====================================================== Testdaten */
function nextWeekdays(n, from) { var out = [], d = new Date(from || new Date()); d.setHours(0, 0, 0, 0); while (out.length < n) { d.setDate(d.getDate() + 1); if (isWeekday(d)) out.push(ymd(d)); } return out; }
function prevWeekdays(n) { var out = [], d = new Date(); d.setHours(0, 0, 0, 0); while (out.length < n) { d.setDate(d.getDate() - 1); if (isWeekday(d)) out.push(ymd(d)); } return out; }
function lastWeekday() { var d = new Date(); d.setHours(0, 0, 0, 0); do { d.setDate(d.getDate() - 1); } while (!isWeekday(d)); return ymd(d); }
var PAIRS = [['#001957', '#155784'], ['#155784', '#00b7bd'], ['#109da8', '#5b7a03'], ['#c47d47', '#583720'], ['#3875a6', '#001957'], ['#759a03', '#155784'], ['#f79506', '#a45f33'], ['#583720', '#c47d47']];
function makeImage(seed, size) {
  var c = document.createElement('canvas'); c.width = c.height = size || 320; var x = c.getContext('2d'), s = c.width;
  var p = PAIRS[seed % PAIRS.length]; x.fillStyle = p[0]; x.fillRect(0, 0, s, s); /* flach, ohne Verlauf (R+V-Bildwelt) */
  var r = seed * 9301 + 49297;
  function rnd() { r = (r * 9301 + 49297) % 233280; return r / 233280; }
  for (var i = 0; i < 3; i++) { x.beginPath(); x.fillStyle = p[1]; x.arc(rnd() * s, rnd() * s, s * (.15 + rnd() * .3), 0, 6.283); x.fill(); }
  x.strokeStyle = 'rgba(255,255,255,.55)'; x.lineWidth = s * .018; x.beginPath(); x.arc(s * .5, s * .5, s * .22, 0, 6.283); x.stroke();
  return c.toDataURL('image/jpeg', .72);
}
function descHtml(intro, points) { return '<p>' + intro + '</p><h3>Das erwartet Dich</h3><ul>' + points.map(function (p) { return '<li>' + p + '</li>'; }).join('') + '</ul><p>Bring gern eigene Fragen und Beispiele mit. Die Sitzung findet online in Microsoft Teams statt.</p>'; }
function mapType(name) { if (TYPES.indexOf(name) >= 0) return name; var i = DEFAULT_TAX.types.indexOf(name); return TYPES[(i < 0 ? 0 : i) % TYPES.length]; }
function mapTopic(cat, name) { if (TOPICS[cat].indexOf(name) >= 0) return name; var i = DEFAULT_TAX.topics[cat].indexOf(name); var l = TOPICS[cat]; return l[(i < 0 ? 0 : i) % l.length]; }
function buildTestData() {
  var d = nextWeekdays(12), pastDay = lastWeekday();
  var L = 'https://teams.microsoft.com/l/meetup-join/19%3ameeting_TESTDATEN%40thread.v2/0';
  var TU = [['anna.b', 'Anna', 'Berger'], ['markus_v', 'Markus', 'Vogel'], ['sabine.k', 'Sabine', 'Krüger'], ['tobias_l', 'Tobias', 'Lang'], ['julia.n', 'Julia', 'Neumann'], ['stefan_r', 'Stefan', 'Roth'], ['katrin.a', 'Katrin', 'Albrecht'], ['jonas.p', 'Jonas', 'Peters'], ['miriam.k', 'Miriam', 'Kessler'], ['oliver_s', 'Oliver', 'Sander'],
    ['lena.h', 'Lena', 'Hoffmann'], ['paul_r', 'Paul', 'Richter'], ['nina.w', 'Nina', 'Wagner'], ['felix.b', 'Felix', 'Braun'], ['clara_s', 'Clara', 'Schulz'], ['max.keller', 'Max', 'Keller'], ['sophie.l', 'Sophie', 'Lorenz'], ['david_w', 'David', 'Winter'], ['emma.f', 'Emma', 'Fuchs'], ['lukas.b', 'Lukas', 'Brandt']];
  var users = TU.map(function (t, i) { return { username: t[0], firstName: t[1], lastName: t[2], xv: (i % 4 === 3 ? 'XVG' : 'XV') + (10001 + i), email: (t[1] + '.' + t[2]).toLowerCase().replace(/ü/g, 'ue') + '@example.org', avatar: ['p-frau-1', 'p-mann-2', 't-katze', 'p-mann-3', '', 'p-mann-1', 'm-schirm', '', 'p-frau-4', 'p-mann-6', 'p-frau-2'][i] || '', showAvatar: i < 3, isPublic: i < 4, showRating: i < 3, showExpert: i < 2, showEmail: i < 2, showUpcoming: i < 3, showBadges: i !== 4, bio: i === 0 ? 'Vertrieb ist für mich ein Handwerk. Ich teile gern, was im Alltag funktioniert.\nFragen gern per E-Mail.' : (i === 1 ? 'Fachlich fit, praktisch erklärt.' : '') }; });
  var RATE = [5, 4, 5, 3, 4, 5, 4, 2, 5, 4];
  // [Titel, Host, Kategorie, Art, Thema, Tag-Index, Start, Dauer, Kapazitaet, gebucht, Bild, Beschreibung]
  var rows = [
    ['Erstgespräche, die im Kopf bleiben', 0, 'dienstlich', 'Workshop', 'vertrieblich', 0, '06:30', 60, 8, 8, 1, descHtml('Wie starte ich ein Gespräch, das überzeugt? Wir üben gemeinsam Einstiege und Fragetechniken.', ['Kurze Impulse zu Gesprächseinstiegen', 'Rollenspiele in Kleingruppen', 'Feedback aus dem Kollegenkreis'])],
    ['Kundenempfehlungen aktiv gewinnen', 1, 'dienstlich', 'Best Practice', 'vertrieblich', 1, '17:30', 45, 12, 9, 1, descHtml('Drei Kolleginnen und Kollegen zeigen, wie sie Empfehlungen systematisch in den Alltag einbauen.', ['Konkrete Formulierungen', 'Der richtige Zeitpunkt', 'Fehler, die Du vermeiden kannst'])],
    ['Social Selling: Sichtbar werden ohne Werbesprache', 2, 'dienstlich', 'Austausch', 'vertrieblich', 2, '07:00', 30, 20, 4, 0, descHtml('Offener Austausch zu Erfahrungen mit sozialen Netzwerken im Vertriebsalltag.', ['Was hat bei Euch funktioniert?', 'Datenschutz und Compliance im Blick', 'Kleine Routinen für jede Woche'])],
    ['Schadenregulierung: typische Stolpersteine', 3, 'dienstlich', 'Workshop', 'fachlich', 0, '17:00', 90, 15, 10, 1, descHtml('Wir gehen anhand echter Fälle typische Fehler in der Schadenregulierung durch.', ['Fallbeispiele aus dem Außendienst', 'Checkliste für die Erstaufnahme', 'Zeit für offene Fragen'])],
    ['Neue Tarifmerkmale in der Hausratversicherung', 4, 'dienstlich', 'Best Practice', 'fachlich', 3, '08:00', 60, 30, 3, 0, descHtml('Ein Überblick über die wichtigsten Änderungen und wie Du sie im Kundengespräch erklärst.', ['Die Änderungen in Kürze', 'Beispielrechnungen', 'Argumente für die Beratung'])],
    ['Fragen & Antworten zur Betriebshaftpflicht', 5, 'dienstlich', 'Austausch', 'fachlich', 4, '17:15', 30, 6, 5, 1, descHtml('Schnelle Runde: Bringe Deine Fragen zur Betriebshaftpflicht mit, wir klären sie gemeinsam.', ['Deckungsumfang im Alltag', 'Abgrenzung zu anderen Sparten', 'Erfahrungen aus Beratungsgesprächen'])],
    ['Kurzimpuls: Cyber-Risiken für kleine Betriebe', 6, 'dienstlich', 'Best Practice', 'fachlich', 5, '06:00', 15, 40, 12, 0, descHtml('Ein Kurzimpuls in fünfzehn Minuten. Ideal vor dem ersten Termin des Tages.', ['Die drei häufigsten Angriffswege', 'Was Kunden wirklich fragen'])],
    ['Vergangener Workshop: Zeitmanagement im Außendienst', 7, 'dienstlich', 'Workshop', 'fachlich', -1, '17:00', 60, 15, 11, 1, descHtml('Dieser Termin liegt in der Vergangenheit und erscheint nur im Archiv des Admin-Bereichs.', ['Testfall: vergangene Veranstaltung'])],
    ['Vergangener Lauftreff: Tipps fürs Frühjahr', 8, 'privat', 'Austausch', 'Sport', -1, '17:30', 45, 12, 5, 0, descHtml('Dieser private Termin liegt in der Vergangenheit. Seine personenbezogenen Daten sind anonymisiert.', ['Testfall: anonymisierter privater Termin'])],
    ['Abgesagt: Verkaufsgespräche trainieren (Testfall)', 2, 'dienstlich', 'Workshop', 'vertrieblich', 3, '17:30', 45, 10, 4, 0, descHtml('Dieser Termin wurde abgesagt, obwohl es schon Anmeldungen gab.', ['Testfall: abgesagte Veranstaltung mit Anmeldungen']), 'x'],
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
  // Grossveranstaltung mit der maximal moeglichen Teilnehmendenzahl
  rows.push(['Großveranstaltung mit 50 Plätzen (Testfall)', 3, 'dienstlich', 'Best Practice', 'fachlich', 8, '07:00', 90, MAX_CAP, 12, 1, descHtml('Testfall: Höchstzahl von 50 Teilnehmenden.', ['Viele Plätze', 'Höchstgrenze laut Regeln'])]);
  // Abdeckung: Jedes aktuelle Thema und jede aktuelle Art kommt mindestens einmal vor (auch neu angelegte). Einstellungen bleiben unveraendert.
  var usedT = {}, usedY = {};
  rows.forEach(function (r) { usedT[r[2] + '|' + mapTopic(r[2], r[4])] = 1; usedY[mapType(r[3])] = 1; });
  var starts = ['06:30', '17:30', '07:15', '18:15', '06:45', '19:00'], extra = 0;
  function extraRow(title, cat, type, topic) { extra++; rows.push([title, extra + 2, cat, type, topic, 1 + (extra % 10), starts[extra % starts.length], [30, 45, 60][extra % 3], 15, extra % 6, extra % 2, descHtml('Automatisch erzeugter Testtermin, damit dieses Thema bzw. diese Art im Katalog vorkommt.', ['Testinhalt eins', 'Testinhalt zwei'])]); }
  ['dienstlich', 'privat'].forEach(function (c) { TOPICS[c].forEach(function (t, i) { if (!usedT[c + '|' + t]) { extraRow('Testtermin Thema: ' + capFirst(t), c, TYPES[(i + extra) % TYPES.length], t); usedY[TYPES[(i + extra - 1) % TYPES.length]] = 1; } }); });
  TYPES.forEach(function (ty, i) { if (!usedY[ty]) { var c = i % 2 ? 'privat' : 'dienstlich'; extraRow('Testtermin Art: ' + ty, c, ty, TOPICS[c][i % TOPICS[c].length]); } });
  var events = [], bookings = [];
  rows.forEach(function (r, i) {
    var id = 'x' + pad(i + 1), oi = r[1] % 10, past = r[5] < 0;
    var e = { id: id, title: r[0], owner: TU[oi][0], category: r[2], type: mapType(r[3]), topic: mapTopic(r[2], r[4]), date: past ? pastDay : d[r[5]], start: r[6], duration: r[7], capacity: r[8], teamsLink: L, description: r[11], imageData: r[10] ? makeImage(i + 1, 320) : '', placeholder: r[10] ? '' : phGuess(r[0], r[4]) };
    if (r[12] === 'x') { e.cancelled = true; e.cancelReason = 'Der LearnMaker ist erkrankt. Ein neuer Termin folgt.'; }
    events.push(e);
    for (var b = 0; b < r[9]; b++) bookings.push({ user: TU[(oi + 1 + b) % TU.length][0], eventId: id, rating: past && b > 0 ? RATE[(i + b) % RATE.length] : 0 });
  });
  /* Verlauf: vergangene Veranstaltungen, damit Abzeichenstufen, Expertenstatus und Bewertungen sichtbar werden */
  var days = prevWeekdays(20), hn = 0;
  [[0, 12, 'dienstlich', 'vertrieblich'], [1, 6, 'dienstlich', 'fachlich'], [2, 2, 'privat', 'Freizeit'], [3, 5, 'privat', 'Sport']].forEach(function (hs) {
    for (var k = 0; k < hs[1]; k++) {
      hn++; var hid = 'h' + pad(hn), tp = mapTopic(hs[2], hs[3]);
      events.push({ id: hid, title: 'Rückblick: ' + capFirst(tp) + ' ' + (k + 1), owner: TU[hs[0]][0], category: hs[2], type: TYPES[k % TYPES.length], topic: tp, date: days[(hn + k) % days.length], start: '17:00', duration: 60, capacity: 10, teamsLink: L, description: descHtml('Abgeschlossene Veranstaltung aus dem Testdatenverlauf.', ['Testfall: Verlauf für Abzeichen und Bewertungen']), imageData: '' });
      for (var b = 0; b < 3; b++) bookings.push({ user: TU[(hs[0] + 1 + b + k) % TU.length][0], eventId: hid, rating: RATE[(hn + b) % RATE.length] });
    }
  });
  /* IDD: freigeschaltete LearnMaker, IDD-pflichtige Personen mit gutBeraten-ID, je eine anstehende, eine gerade beendete und eine Veranstaltung aus dem Vorjahr */
  users[0].iddHost = true; users[3].iddHost = true;
  users.forEach(function (u, i) { if (i >= 1 && i <= 9) { u.iddDuty = true; u.iddHours = i === 3 ? 30 : 15; if (i !== 8) u.gbId = 'RVTD-' + (1000 + i) + '-GB' + pad(i); } });
  var ly = new Date(new Date().getFullYear() - 1, 11, 10); while (ly.getDay() === 0 || ly.getDay() === 6) ly.setDate(ly.getDate() - 1);
  var IDDEV = [
    ['i01', 'Berufsunfähigkeit verständlich erklären', 0, d[2], '07:00', 60, 50, 'Berufsunfähigkeitsversicherung: Bedarfsermittlung und Beratung', 6, null, IDD_CONTENTS[0]],
    ['i02', 'Betriebliche Altersversorgung im Mittelstand', 0, pastDay, '17:00', 60, 50, 'Betriebliche Altersversorgung: Durchführungswege und Beratungspflichten', 6, ['yes', 'yes', 'yes', 'no', '', ''], IDD_CONTENTS[3]],
    ['i03', 'Jahresrückblick Kfz-Tarife', 3, ymd(ly), '17:00', 90, 80, 'Kfz-Versicherung: Tarifmerkmale und Beratung im Schadenfall', 5, ['yes', 'yes', 'yes', 'yes', 'no'], IDD_CONTENTS[2]]];
  IDDEV.forEach(function (r) {
    events.push({ id: r[0], title: r[1], owner: TU[r[2]][0], category: 'dienstlich', type: TYPES[0], topic: mapTopic('dienstlich', 'fachlich'), date: r[3], start: r[4], duration: r[5], capacity: 12, teamsLink: L, description: descHtml('Testfall für eine IDD-anrechenbare Veranstaltung.', ['Fachlicher Input', 'Fragen aus der Beratungspraxis']), imageData: '', placeholder: phGuess(r[1], 'fachlich'), idd: true, iddTitle: r[7], iddMinutes: r[6], iddContent: r[10] });
    for (var b = 0; b < r[8]; b++) bookings.push({ user: TU[(r[2] + 1 + b) % TU.length][0], eventId: r[0], rating: 0, idd: r[9] ? r[9][b] : '' });
  });
  return { users: users, events: events, bookings: bookings };
}

/* ====================================================== Kalender (ICS) */
function icsEsc(t) { return String(t || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n'); }
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
/* Kalendereintrag zu einer gebuchten Veranstaltung (Teams-Link und Beschreibung inklusive) */
/* ====================================================== IDD: Agenda, Titelpruefung, Zeitangaben */
function iddOn() { return !!IDD.on; }
function fmtMinutes(m) { m = Math.round(m || 0); var hh = Math.floor(m / 60), r = m % 60; return hh ? hh + ' Std.' + (r ? ' ' + r + ' Min.' : '') : r + ' Min.'; }
/* Agenda: Begruessung und Verabschiedung (je IDD.frame Minuten, keine Lernzeit) und ein Block fuer das Thema. Es wird nichts erfunden. */
function iddBlocks(e) {
  var room = Number(e.duration) - 2 * (IDD.frame || 5);
  return e.agenda && e.agenda.length ? e.agenda : [{ content: e.iddTitle || e.title || 'Thema der Veranstaltung', minutes: room, iddMinutes: e.iddMinutes || room }];
}
function iddAgenda(e) {
  var f = IDD.frame || 5, t = toMin(e.start), s1 = t + Number(e.duration), rows = [{ from: t, to: t + f, title: IDD.welcome.title || 'Begrüßung', text: IDD.welcome.text || '', learn: false, fixed: true }];
  t += f;
  iddBlocks(e).forEach(function (b) { rows.push({ from: t, to: t + Number(b.minutes), title: b.content, text: Number(b.iddMinutes) ? 'IDD-Bildungszeit: ' + b.iddMinutes + ' Minuten' : 'Keine IDD-Bildungszeit', learn: Number(b.iddMinutes) > 0 }); t += Number(b.minutes); });
  rows.push({ from: s1 - f, to: s1, title: IDD.farewell.title || 'Verabschiedung', text: IDD.farewell.text || '', learn: false, fixed: true });
  return rows;
}
function agendaNode(e) {
  return h('div', { class: 'agenda' }, [h('h4', { text: 'Agenda' }), h('ol', { class: 'agenda-list' }, iddAgenda(e).map(function (r) {
    return h('li', { class: r.learn ? 'learn' : '' }, [h('span', { class: 'ag-t', text: minToHm(r.from) + '–' + minToHm(r.to) }), h('span', { class: 'ag-b' }, [h('b', { text: r.title }), r.text ? h('span', { class: 'hint', text: r.text }) : null, r.fixed ? h('span', { class: 'hint', text: 'Keine Lernzeit' }) : null])]);
  }))]);
}
/* Plausibilitaet des IDD-Titels: nur Hinweise, keine Sperre. Grundlage: Weiterbildung muss fachliche Inhalte der Versicherungsvermittlung
   behandeln (Produkte, Beratung, Recht, Kundenschutz). Freizeit, Software-Bedienung und reine Verkaufs- oder Selbstmanagement-Themen zaehlen in der Regel nicht. */
var IDD_FACH = /(versicher|vorsorge|rente|renten|altersvor|riester|rürup|basisrente|bav|betriebliche|berufsunfähig|\bbu\b|haftpflicht|kfz|kraftfahrt|hausrat|wohngebäude|gebäude|kranken|pkv|gkv|pflege|lebens|unfall|rechtsschutz|sach|gewerbe|firmenkunden|betrieb|cyber|tarif|produkt|deckung|schaden|leistungsfall|risiko|kapitalanlage|fonds|investment|nachhaltig|esg|beratung|berat|bedarf|dokumentation|aufklärung|kundeninformation|vvg|idd|gewo|versvermv|geldwäsche|datenschutz|compliance|verbraucher|steuer|recht|gesetz|vertrag|police|prämie|beitrag|biometri|einkommen|absicherung|haftung|regulierung)/i;
var IDD_FREI = /(sport|yoga|fitness|lauf|joggen|fußball|fussball|kochen|rezept|backen|meal|kaffee|wein|bier|reise|urlaub|wander|hobby|spiel|quiz|feierabend|after.?work|garten|foto|musik|meditation|achtsamkeit|stricken|basteln)/i;
var IDD_SOFT = /(excel|outlook|powerpoint|word\b|teams-tipps|tastenkürzel|software|crm-bedienung|it-tipps|zeitmanagement|selbstorganisation|motivation|resilienz|work-life|stressbewältigung|kalenderführung)/i;
var IDD_SALES = /(abschlusstechnik|abschlussquote|akquise|kaltakquise|telefonakquise|neukundengewinnung|cross-?selling|upselling|social selling|verkaufstrick|verkaufstechnik|einwandbehandlung|empfehlungsmarketing)/i;
var IDD_FORMAT = /^(austausch|workshop|best practice|session|webinar|treffen|runde|update|news|neuigkeiten|q ?& ?a|fragestunde|kurzimpuls|impuls)\b/i;
function iddTitleHints(t) {
  t = String(t || '').replace(/\s+/g, ' ').trim(); var out = [];
  if (!t) return out;
  var words = t.split(' ').filter(function (w) { return w.length > 1; }).length;
  if (t.length < 15 || words < 3) out.push('Der Titel ist sehr kurz. Nenne den fachlichen Inhalt genauer, zum Beispiel „Berufsunfähigkeitsversicherung: Bedarfsermittlung und Beratung“.');
  if (IDD_FREI.test(t)) out.push('Freizeitthemen sind nicht IDD-anrechenbar. Wähle ein fachliches Thema der Versicherungsvermittlung.');
  if (IDD_SOFT.test(t)) out.push('Allgemeine Bürosoftware und Selbstmanagement zählen in der Regel nicht. Versicherungsspezifische Software wählst Du als Lerninhalt aus.');
  if (IDD_SALES.test(t)) out.push('Reine Verkaufs- oder Akquisetechniken zählen in der Regel nicht. Stelle den Bezug zu Kundenberatung, Bedarfsermittlung oder Produkten her.');
  if (IDD_FORMAT.test(t) && !IDD_FACH.test(t)) out.push('Der Titel nennt vor allem das Format. Nenne das fachliche Thema.');
  else if (!IDD_FACH.test(t) && !IDD_FREI.test(t)) out.push('Im Titel ist kein Bezug zu Versicherungsprodukten, Beratung, Recht oder Kundenschutz erkennbar. Ergänze das fachliche Thema.');
  return out;
}
function icsDescription(ev) {
  var desc = htmlToText(ev.description).slice(0, 700);
  return ['Deine Anmeldung bei ' + state.settings.appTitle, '', ev.title, CAT_LABEL[ev.category] + ' \u00b7 ' + ev.type + ' \u00b7 ' + ev.topic, '',
    'Datum:         ' + dateLong(ev.date), 'Uhrzeit:       ' + ev.start + ' \u2013 ' + endHm(ev) + ' Uhr', 'Dauer:         ' + ev.duration + ' Minuten', 'Angeboten von: ' + ev.host, '',
    'Teams-Sitzung: ' + ev.teamsLink, ''].concat(ev.idd && iddOn() ? ['IDD-anrechenbar: ' + ev.iddMinutes + ' Minuten', 'IDD-Titel: ' + ev.iddTitle].concat(ev.iddContent ? ['Lerninhalt: ' + ev.iddContent] : []).concat(['Agenda:']).concat(iddAgenda(ev).map(function (r) { return minToHm(r.from) + '–' + minToHm(r.to) + '  ' + r.title + (r.learn ? '' : ' (keine Lernzeit)'); })).concat(['']) : []).concat(desc ? ['Worum geht es?', desc, ''] : []).concat(['Abmelden kannst Du Dich unter „Meine Anmeldungen“.']).join('\n');
}
function buildIcs(ev, uid) {
  var s = startDate(ev), e = new Date(s.getTime() + ev.duration * 60000);
  function f(x) { return x.getFullYear() + pad(x.getMonth() + 1) + pad(x.getDate()) + 'T' + pad(x.getHours()) + pad(x.getMinutes()) + '00'; }
  var u = new Date(); var stamp = u.getUTCFullYear() + pad(u.getUTCMonth() + 1) + pad(u.getUTCDate()) + 'T' + pad(u.getUTCHours()) + pad(u.getUTCMinutes()) + pad(u.getUTCSeconds()) + 'Z';
  var L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//R+V//LearnTogether//DE', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    'BEGIN:VTIMEZONE', 'TZID:Europe/Berlin', 'BEGIN:STANDARD', 'DTSTART:19701025T030000', 'RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU', 'TZOFFSETFROM:+0200', 'TZOFFSETTO:+0100', 'TZNAME:CET', 'END:STANDARD',
    'BEGIN:DAYLIGHT', 'DTSTART:19700329T020000', 'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU', 'TZOFFSETFROM:+0100', 'TZOFFSETTO:+0200', 'TZNAME:CEST', 'END:DAYLIGHT', 'END:VTIMEZONE',
    'BEGIN:VEVENT', 'UID:' + String(uid || ev.id).replace(/[^A-Za-z0-9]/g, '') + '@learntogether', 'DTSTAMP:' + stamp, 'SEQUENCE:' + (ev.rev || 0), 'DTSTART;TZID=Europe/Berlin:' + f(s), 'DTEND;TZID=Europe/Berlin:' + f(e),
    'SUMMARY:' + icsEsc(state.settings.appTitle + ' - ' + ev.title), 'DESCRIPTION:' + icsEsc(icsDescription(ev)), 'LOCATION:Microsoft Teams', 'URL:' + ev.teamsLink, 'STATUS:CONFIRMED',
    'BEGIN:VALARM', 'TRIGGER:-PT15M', 'ACTION:DISPLAY', 'DESCRIPTION:Erinnerung', 'END:VALARM', 'END:VEVENT', 'END:VCALENDAR'];
  return L.map(fold).join('\r\n') + '\r\n';
}

/* ====================================================== Datenzugriff */
function ApiErr(code, message, status) { var e = new Error(message); e.code = code; e.status = status; return e; }
var mode = 'local';

var Server = {
  call: function (action, body) {
    var o = { method: body ? 'POST' : 'GET', headers: {}, cache: 'no-store', credentials: 'same-origin' };
    if (body) { o.body = JSON.stringify(body); o.headers['Content-Type'] = 'application/json'; o.headers['X-LT-Request'] = '1'; }
    return fetch(API + '?action=' + action, o).then(function (r) {
      return r.json().catch(function () { throw ApiErr('server', 'Der Server hat unerwartet geantwortet.', r.status); }).then(function (j) {
        if (!j.ok) throw ApiErr(j.error, j.message, j.error === 'auth' ? 401 : r.status);
        return j;
      });
    }, function () { throw ApiErr('network', 'Der Server ist nicht erreichbar. Bitte prüfe Deine Verbindung.'); });
  },
  settings: function () { return this.call('settings').then(function (j) { return { appTitle: j.appTitle, labels: j.labels, topics: j.topics, colors: j.colors, headings: j.headings, texts: j.texts, types: j.types, hero: j.hero, badges: j.badges, avatarUpload: j.avatarUpload, photos: j.photos, idd: j.idd }; }); },
  register: function (p) { return this.call('register', p); },
  login: function (id, pw) { return this.call('login', { id: id, password: pw }); },
  logout: function () { return this.call('logout', {}); },
  me: function () { return this.call('me'); },
  changePassword: function (cur, nw) { return this.call('changePassword', { current: cur, password: nw }); },
  events: function () { return this.call('events').then(function (j) { return j.events; }); },
  createEvent: function (ev) { return this.call('createEvent', { event: ev }); },
  book: function (id) { return this.call('book', { eventId: id }); },
  cancelBooking: function (eventId) { return this.call('cancelBooking', { eventId: eventId }); },
  cancelEvent: function (id, reason) { return this.call('cancelEvent', { id: id, reason: reason || '' }); },
  myBookings: function () { return this.call('myBookings'); },
  rate: function (bookingId, stars) { return this.call('rate', { bookingId: bookingId, stars: stars }); },
  markRead: function (id) { return this.call('markRead', { id: id || '' }); },
  myEvents: function () { return this.call('myEvents'); },
  profile: function () { return this.call('profile'); },
  saveProfile: function (p) { return this.call('saveProfile', p); },
  updateAccount: function (p) { return this.call('updateAccount', p); },
  dismissHint: function () { return this.call('dismissHint', {}); },
  setAvatar: function (p) { return this.call('setAvatar', p); },
  adminDeleteAvatar: function (id) { return this.call('adminDeleteAvatar', { id: id }); },
  adminSavePhoto: function (p) { return this.call('adminSavePhoto', p); },
  adminDeletePhoto: function (id) { return this.call('adminDeletePhoto', { id: id }); },
  publicProfile: function (username) { return this.call('publicProfile&username=' + encodeURIComponent(username)).then(function (j) { return j; }); },
  adminEvents: function () { return this.call('adminEvents').then(function (j) { var l = j.events; l.ratingBuckets = j.ratingBuckets || []; return l; }); },
  updateEvent: function (ev) { return this.call('updateEvent', { event: ev }); },
  adminUsers: function () { return this.call('adminUsers').then(function (j) { return { users: j.users, activity: j.activity, inactiveMonths: j.inactiveMonths }; }); },
  adminDeleteUser: function (id) { return this.call('adminDeleteUser', { id: id }); },
  saveIdd: function (p) { return this.call('saveIdd', p); },
  confirmAttendance: function (bookingId, status) { return this.call('confirmAttendance', { bookingId: bookingId, status: status }); },
  iddCockpit: function () { return this.call('iddCockpit'); },
  adminIdd: function () { return this.call('adminIdd').then(function (j) { return j.events; }); },
  adminIddArchive: function () { return this.call('adminIddArchive').then(function (j) { return j.archive || []; }); },
  adminIddReopen: function (id) { return this.call('adminIddReopen', { id: id }); },
  adminIddAdd: function (eventId, userId, reason) { return this.call('adminIddAdd', { eventId: eventId, userId: userId, reason: reason }); },
  adminSetIddHost: function (id, on) { return this.call('adminSetIddHost', { id: id, on: !!on }); },
  deleteAccount: function (pw) { return this.call('deleteAccount', { password: pw }); },
  myData: function () {
    return fetch(API + '?action=myData', { cache: 'no-store', credentials: 'same-origin' }).then(function (r) {
      if (!r.ok || !/attachment/.test(r.headers.get('content-disposition') || '')) return r.json().then(function (j) { throw ApiErr(j.error, j.message, j.error === 'auth' ? 401 : r.status); });
      return r.blob();
    }, function () { throw ApiErr('network', 'Der Server ist nicht erreichbar. Bitte prüfe Deine Verbindung.'); });
  },
  adminSetRole: function (id, role) { return this.call('adminSetRole', { id: id, role: role }); },
  adminResetPassword: function (id) { return this.call('adminResetPassword', { id: id }); },
  adminSetLocked: function (id, locked) { return this.call('adminSetLocked', { id: id, locked: !!locked }); },
  adminSaveEvent: function (ev) { return this.call('adminSaveEvent', { event: ev }); },
  adminDeleteEvent: function (id) { return this.call('adminDeleteEvent', { id: id }); },
  adminDeleteBooking: function (id) { return this.call('adminDeleteBooking', { id: id }); },
  adminSettings: function () { return this.call('adminSettings'); },
  adminSaveSettings: function (s) { return this.call('adminSaveSettings', s); },
  adminSaveTaxonomy: function (p) { return this.call('adminSaveTaxonomy', p).then(function (j) { return { labels: j.labels, topics: j.topics, colors: j.colors, headings: j.headings, texts: j.texts, types: j.types }; }); },
  adminManual: function () { return this.call('adminManual').then(function (j) { return j.html; }); },
  adminManualPdf: function () {
    return fetch(API + '?action=adminManualPdf', { cache: 'no-store', credentials: 'same-origin' }).then(function (r) {
      if (!r.ok || /json/.test(r.headers.get('content-type') || '')) return r.json().then(function (j) { throw ApiErr(j.error, j.message, j.error === 'auth' ? 401 : r.status); });
      return r.blob();
    }, function () { throw ApiErr('network', 'Der Server ist nicht erreichbar. Bitte prüfe Deine Verbindung.'); });
  },
  adminTestData: function (m) { var p = { mode: m }; if (m === 'load') { var t = buildTestData(); p.users = t.users; p.events = t.events; p.bookings = t.bookings; } return this.call('adminTestData', p); }
};

var Local = (function () {
  var data = null, cfg = null;
  function load() {
    if (data) return;
    try { data = JSON.parse(store.get('lt_data') || 'null'); } catch (e) { data = null; }
    try { cfg = JSON.parse(store.get('lt_cfg') || 'null'); } catch (e) { cfg = null; }
    if (!data) data = {};
    ['events', 'bookings', 'users', 'notes', 'iddArchive'].forEach(function (k) { if (!data[k]) data[k] = []; });
    data.events.forEach(function (e) { delete e.code; delete e.hostEmail; });
    data.bookings.forEach(function (b) { delete b.code; });
    if (!cfg) cfg = { appTitle: DEFAULT_TITLE };
    delete cfg.pw; delete cfg.notice;
    if (!cfg.labels) cfg.labels = JSON.parse(JSON.stringify(DEFAULT_TAX.labels));
    if (!cfg.topics) cfg.topics = JSON.parse(JSON.stringify(DEFAULT_TAX.topics));
    if (!cfg.hero) cfg.hero = { title: DEFAULT_HERO.title, text: DEFAULT_HERO.text };
    if (!cfg.types) cfg.types = DEFAULT_TAX.types.slice();
    if (!cfg.idd) cfg.idd = { on: true, provider: 'R+V Allgemeine Versicherung AG', welcomeTitle: 'Begrüßung', welcomeText: 'Ankommen, kurze Vorstellung und Ablauf der Session.', farewellTitle: 'Verabschiedung', farewellText: 'Zusammenfassung, offene Fragen und Hinweis zur Teilnahmebestätigung.' };
    if (!cfg.headings) cfg.headings = JSON.parse(JSON.stringify(DEFAULT_TAX.headings));
    if (!cfg.texts) cfg.texts = JSON.parse(JSON.stringify(DEFAULT_TAX.texts));
    if (!cfg.colors) cfg.colors = JSON.parse(JSON.stringify(DEFAULT_TAX.colors));
    if (!cfg.badges) cfg.badges = { levels: [1, 5, 10, 20, 40, 80], expertMin: 5 };
    if (!cfg.badges.secret) cfg.badges.secret = SECRET_MIN;
    applyTaxonomy(cfg);
    ensureAdmin();
    if (!store.get('lt_seeded')) { store.set('lt_seeded', '1'); insertTest(); }
    save();
  }
  function save() { store.set('lt_data', JSON.stringify(data)); store.set('lt_cfg', JSON.stringify(cfg)); }
  function removeTest() {
    var tu = {}; data.users.forEach(function (u) { if (u.isTest) tu[u.id] = 1; });
    data.events = data.events.filter(function (e) { return !e.isTest; }); data.bookings = data.bookings.filter(function (b) { return !b.isTest && !(b.userId && tu[b.userId]); });
    data.notes = data.notes.filter(function (n) { return !tu[n.userId]; }); data.users = data.users.filter(function (u) { return !u.isTest; });
  }
  function insertTest() {
    removeTest();
    var t = buildTestData(), ids = {}, now = nowIso(), pw = hashPw(TEST_PW);
    t.users.forEach(function (x) { var u = { id: 't-' + rid(6), username: x.username, firstName: x.firstName, lastName: x.lastName, xv: x.xv, email: x.email, pwHash: pw, pwVersion: 0, role: 'user', locked: false, mustChange: false, created: now, lastLogin: '', isTest: true, legacyOffered: 0, legacyAttended: 0, legacyRatingSum: 0, legacyRatingCount: 0, legacyTopics: {}, profilePublic: !!x.isPublic, showRating: !!x.showRating, showExpert: !!x.showExpert, showEmail: !!x.showEmail, showUpcoming: !!x.showUpcoming, showBadges: !!x.showBadges, iddHost: !!x.iddHost, iddDuty: !!x.iddDuty, iddHours: x.iddHours === 30 ? 30 : 15, gbId: x.gbId || '', bio: x.bio || '', avatar: x.avatar || '', showAvatar: !!x.showAvatar, avatarVer: 1 }; data.users.push(u); ids[x.username] = u.id; });
    t.events.forEach(function (x) {
      var e = readEvent(x, { id: 't-' + x.id, ownerId: ids[x.owner] || null, host: x.owner, created: now, isTest: true }, true, 2);
      if (x.cancelled) { e.cancelled = true; e.cancelledAt = now; e.cancelReason = x.cancelReason || ''; }
      data.events.push(e);
    });
    t.bookings.forEach(function (x) { if (!ids[x.user]) return; data.bookings.push({ id: 't-' + rid(6), eventId: 't-' + x.eventId, userId: ids[x.user], created: now, rating: x.rating || 0, ratedAt: x.rating ? now : '', isTest: true, idd: x.idd === 'yes' || x.idd === 'no' ? x.idd : '', confirmedAt: x.idd ? now : '', confirmedBy: x.idd ? 'Testdaten' : '' }); });
    data.events.forEach(function (e) { if (e.isTest && e.cancelled) data.bookings.forEach(function (b) { if (b.eventId === e.id && b.userId) addNote(b.userId, 'cancelled', e, e.cancelReason); }); });
    return { events: t.events, bookings: t.bookings, users: t.users };
  }
  function booked(id) { return data.bookings.filter(function (b) { return b.eventId === id; }).length; }
  /* iddMode: 0 = keine IDD erlaubt, 1 = erlaubt (wenn die IDD-Funktion an ist), 2 = Testdaten */
  function readEvent(v, target, admin, iddMode) {
    if (iddMode == null) iddMode = admin ? 1 : 0;
    var er = validateEvent(v, admin); var k = Object.keys(er);
    if (k.length) throw ApiErr('invalid', er[k[0]]);
    if (v.idd) { if (!iddMode) throw ApiErr('forbidden', 'IDD-Veranstaltungen kannst Du erst nach Freischaltung durch die Administration anlegen.'); if (iddMode === 1 && !cfg.idd.on) throw ApiErr('invalid', 'Die IDD-Funktion ist nicht aktiv.'); }
    target.idd = !!v.idd; target.iddTitle = v.idd ? String(v.iddTitle || '').replace(/\s+/g, ' ').trim() : '';
    if (v.idd && iddMode !== 2 && IDD_CONTENTS.indexOf(v.iddContent) < 0) throw ApiErr('invalid', 'Bitte wähle die Beschreibung des Lerninhalts.');
    target.iddContent = v.idd ? (IDD_CONTENTS.indexOf(v.iddContent) >= 0 ? v.iddContent : IDD_CONTENTS[6]) : '';
    if (v.idd) { var room = Number(v.duration) - 10, ag = (v.agenda && v.agenda.length ? v.agenda : [{ content: target.iddTitle, minutes: room, iddMinutes: Number(v.iddMinutes) || room }]).map(function (b) { return { content: String(b.content || '').replace(/\s+/g, ' ').trim(), minutes: Number(b.minutes), iddMinutes: Number(b.iddMinutes) }; });
      var sm = 0, si = 0; ag.forEach(function (b) { sm += b.minutes; si += b.iddMinutes; });
      if (sm !== room) throw ApiErr('invalid', 'Die Einträge der Agenda müssen zusammen ' + room + ' Minuten dauern. Aktuell sind es ' + sm + ' Minuten.');
      target.agenda = ag; target.iddMinutes = si; } else { target.agenda = null; target.iddMinutes = 0; }
    target.title = v.title.trim(); target.category = v.category; target.type = v.type; target.topic = v.topic;
    target.date = v.date; target.start = v.start; target.duration = Number(v.duration); target.capacity = Number(v.capacity); target.teamsLink = v.teamsLink.trim();
    target.description = sanitizeHtml(v.description); target.placeholder = /^[a-z0-9-]{0,40}$/.test(v.placeholder || '') ? (v.placeholder || '') : '';
    if (v.imageData) target.imageData = v.imageData; else if (v.removeImage) target.imageData = '';
    return target;
  }
  function wrap(fn) { return new Promise(function (res, rej) { try { load(); sweep(); res(fn()); } catch (e) { rej(e); } }); }
  /* ---- Demo-Modus: Konten, Sitzung und Auswertungen im Browser (ohne echte Sicherheit, nur zum Ausprobieren) ---- */
  var DEMO_ITER = 2000, DEFAULT_ADMIN_PW = 'RuVTest1234', TEST_PW = 'Test-Passwort-2026';
  var RESERVED = ['admin', 'administrator', 'root', 'system', 'support', 'hilfe', 'moderator', 'ruv', 'service', 'info', 'test', 'anonymisiert', 'unbekannt'];
  var COMMON_PW = ['password', 'passwort', 'qwertz', 'qwerty', 'qwertzuiop', 'asdfgh', 'asdfghjkl', 'welcome', 'willkommen', 'letmein', 'iloveyou', 'sommer', 'winter', 'herbst', 'fruehling', 'hallo', 'abcdef', 'abcdefgh', 'ruvtest', 'ruv', 'versicherung', 'learntogether', 'master', 'dragon', 'monkey', 'football', 'fussball', 'schalke', 'dortmund', 'bayern', 'changeme', 'admin', 'administrator', 'test', 'testtest', 'geheim', 'secret', 'zuhause', 'sonne', 'computer'];
  var K256 = [0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070, 0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2];
  function sha256(m) {
    var H = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19], l = m.length, nl = (((l + 9 + 63) >> 6) << 6), b = new Uint8Array(nl), i, j, w = new Array(64);
    b.set(m); b[l] = 0x80; var bits = l * 8; b[nl - 4] = (bits >>> 24) & 255; b[nl - 3] = (bits >>> 16) & 255; b[nl - 2] = (bits >>> 8) & 255; b[nl - 1] = bits & 255;
    function rr(x, n) { return (x >>> n) | (x << (32 - n)); }
    for (var o = 0; o < nl; o += 64) {
      for (i = 0; i < 16; i++) w[i] = (b[o + i * 4] << 24) | (b[o + i * 4 + 1] << 16) | (b[o + i * 4 + 2] << 8) | b[o + i * 4 + 3];
      for (i = 16; i < 64; i++) { var s0 = rr(w[i - 15], 7) ^ rr(w[i - 15], 18) ^ (w[i - 15] >>> 3), s1 = rr(w[i - 2], 17) ^ rr(w[i - 2], 19) ^ (w[i - 2] >>> 10); w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0; }
      var a = H[0], bb = H[1], c = H[2], d = H[3], e = H[4], f = H[5], g = H[6], hh = H[7];
      for (i = 0; i < 64; i++) {
        var S1 = rr(e, 6) ^ rr(e, 11) ^ rr(e, 25), ch = (e & f) ^ (~e & g), t1 = (hh + S1 + ch + K256[i] + w[i]) | 0, S0 = rr(a, 2) ^ rr(a, 13) ^ rr(a, 22), mj = (a & bb) ^ (a & c) ^ (bb & c), t2 = (S0 + mj) | 0;
        hh = g; g = f; f = e; e = (d + t1) | 0; d = c; c = bb; bb = a; a = (t1 + t2) | 0;
      }
      H[0] = (H[0] + a) | 0; H[1] = (H[1] + bb) | 0; H[2] = (H[2] + c) | 0; H[3] = (H[3] + d) | 0; H[4] = (H[4] + e) | 0; H[5] = (H[5] + f) | 0; H[6] = (H[6] + g) | 0; H[7] = (H[7] + hh) | 0;
    }
    var out = new Uint8Array(32); for (j = 0; j < 8; j++) { out[j * 4] = H[j] >>> 24; out[j * 4 + 1] = (H[j] >>> 16) & 255; out[j * 4 + 2] = (H[j] >>> 8) & 255; out[j * 4 + 3] = H[j] & 255; } return out;
  }
  function hmac256(key, msg) {
    if (key.length > 64) key = sha256(key);
    var ik = new Uint8Array(64), ok = new Uint8Array(64), i; ik.set(key); ok.set(key);
    for (i = 0; i < 64; i++) { ik[i] ^= 0x36; ok[i] ^= 0x5c; }
    var a = new Uint8Array(64 + msg.length); a.set(ik); a.set(msg, 64); var inner = sha256(a), b = new Uint8Array(96); b.set(ok); b.set(inner, 64); return sha256(b);
  }
  function toHex(u) { var s = ''; for (var i = 0; i < u.length; i++) s += (u[i] < 16 ? '0' : '') + u[i].toString(16); return s; }
  function pbkdf2(pw, saltHex, iter) {
    var enc = new TextEncoder(), key = enc.encode(pw), salt = enc.encode(saltHex), s2 = new Uint8Array(salt.length + 4); s2.set(salt); s2[salt.length + 3] = 1;
    var u = hmac256(key, s2), t = new Uint8Array(u); for (var n = 1; n < iter; n++) { u = hmac256(key, u); for (var j = 0; j < 32; j++) t[j] ^= u[j]; } return toHex(t);
  }
  function hashPw(pw) { var salt = rid(8) + rid(8); return 'demo$' + DEMO_ITER + '$' + salt + '$' + pbkdf2(pw, salt, DEMO_ITER); }
  function checkPw(pw, st) { var p = String(st || '').split('$'); return p.length === 4 && p[0] === 'demo' && pbkdf2(pw, p[2], +p[1]) === p[3]; }
  function pwProblem(pw, username, email) {
    pw = pw || ''; if (pw.length < 10) return 'Das Passwort muss mindestens 10 Zeichen lang sein.'; if (pw.length > 128) return 'Das Passwort darf höchstens 128 Zeichen lang sein.';
    var low = pw.toLowerCase(), loc = String(email || '').split('@')[0].toLowerCase();
    if (username && username.length >= 3 && low.indexOf(username.toLowerCase()) >= 0) return 'Das Passwort darf den Benutzernamen nicht enthalten.';
    if (loc.length >= 4 && low.indexOf(loc) >= 0) return 'Das Passwort darf Teile der E-Mail-Adresse nicht enthalten.';
    if (/^(.)\1+$/.test(pw)) return 'Das Passwort besteht nur aus einem wiederholten Zeichen.';
    var core = low.replace(/[0-9!?.#*_\-]+$/, '');
    if (COMMON_PW.indexOf(low) >= 0 || COMMON_PW.indexOf(core) >= 0 || /^(0123456789|1234567890|12345678901|9876543210)/.test(low)) return 'Dieses Passwort ist zu bekannt. Bitte wähle ein anderes.';
    return null;
  }
  function normXv(v) { return String(v || '').toUpperCase().replace(/[\s\-]/g, ''); }
  function nowIso() { return new Date().toISOString(); }
  function userById(id) { return id ? data.users.filter(function (u) { return u.id === id; })[0] : null; }
  function curUser(require) {
    var u = userById(sess.get('lt_me')); if (u && u.locked) u = null;
    if (!u && require) throw ApiErr('auth', 'Bitte melde Dich an.', 401);
    return u;
  }
  function needAdmin() { var u = curUser(true); if (u.role !== 'admin' && u.role !== 'superadmin') throw ApiErr('forbidden', 'Dieser Bereich ist nur für Administrierende.', 403); return u; }
  function ensureAdmin() {
    if (data.users.some(function (u) { return u.role === 'superadmin'; })) return;
    data.users = data.users.filter(function (u) { return u.username.toLowerCase() !== 'admin'; });
    data.users.push({ id: rid(8), username: 'admin', firstName: 'Haupt', lastName: 'Administration', xv: '', email: 'admin@learntogether.local', pwHash: hashPw(DEFAULT_ADMIN_PW), pwVersion: 0, role: 'superadmin', locked: false, mustChange: true, created: nowIso(), lastLogin: '', isTest: false, legacyOffered: 0, legacyAttended: 0, legacyRatingSum: 0, legacyRatingCount: 0, legacyTopics: {} });
  }
  /* Abzeichen: Stufe nach durchgefuehrten Veranstaltungen, Expertenstatus je Thema */
  function badges() {
    var B = { offered: {}, topic: {} };
    data.events.forEach(function (e) { if (e.cancelled || e.anonymized || !e.ownerId || !eventEnded(e)) return; B.offered[e.ownerId] = (B.offered[e.ownerId] || 0) + 1; var k = e.ownerId + '|' + e.category + '|' + e.topic; B.topic[k] = (B.topic[k] || 0) + 1; });
    data.users.forEach(function (u) { if (u.legacyOffered) B.offered[u.id] = (B.offered[u.id] || 0) + u.legacyOffered; Object.keys(u.legacyTopics || {}).forEach(function (k) { B.topic[u.id + '|' + k] = (B.topic[u.id + '|' + k] || 0) + u.legacyTopics[k]; }); });
    B.hidden = {}; data.users.forEach(function (u) { if (!u.showBadges) B.hidden[u.id] = 1; });
    return B;
  }
  /* IDD (wie auf dem Server): Bestaetigung durch LearnMaker 14 Tage nach dem Ende oder nach Freischaltung, Administration bis 31.01. des Folgejahres */
  function iddPub() { var c = cfg.idd; return { on: !!c.on, provider: c.provider || '', frame: 5, contents: IDD_CONTENTS, welcome: { title: c.welcomeTitle || '', text: c.welcomeText || '' }, farewell: { title: c.farewellTitle || '', text: c.farewellText || '' } }; }
  function iddHardLock(e) { return new Date(startDate(e).getFullYear() + 1, 0, 31, 23, 59, 59); }
  function iddHostDeadline(e) { var d = new Date(endDate(e).getTime() + 14 * 864e5); if (e.reopenUntil) { var r = new Date(e.reopenUntil); if (r > d) d = r; } var hl = iddHardLock(e); return d > hl ? hl : d; }
  function iddHostCan(e, now) { return !!e.idd && !e.cancelled && endDate(e) <= now && now <= iddHostDeadline(e); }
  function iddAdminCan(e, now) { return !!e.idd && !e.cancelled && endDate(e) <= now && now <= iddHardLock(e); }
  function needIdd() { if (!cfg.idd.on) throw ApiErr('invalid', 'Die IDD-Funktion ist nicht aktiv.'); }
  function normGbId(v) { var x = String(v || '').toUpperCase().replace(/[^A-Z0-9]/g, ''); if (!x) return ''; if (x.length !== 12) return null; return x.slice(0, 4) + '-' + x.slice(4, 8) + '-' + x.slice(8); }
  /* Fuer andere sichtbar: ohne Abzeichen, wenn die Person sie ausgeblendet hat */
  function pubLevel(B, uid) { return uid && B.hidden[uid] ? 0 : levelOf(B, uid); }
  function pubExpert(B, uid, cat, tp) { return !(uid && B.hidden[uid]) && expertOf(B, uid, cat, tp); }
  /* Stufe 7 (Learnicorn) ist versteckt: Die Grenze kennt nur die Administration, sichtbar wird sie erst beim Erreichen */
  function levelOf(B, uid) { var n = (uid && B.offered[uid]) || 0, lv = 0; BADGES.levels.forEach(function (t, i) { if (n >= t) lv = i + 1; }); if (lv === 6 && n >= (cfg.badges.secret || SECRET_MIN)) lv = 7; return lv; }
  function expertOf(B, uid, cat, tp) { return !!uid && (B.topic[uid + '|' + cat + '|' + tp] || 0) >= BADGES.expertMin; }
  function avInfo(u, own) { if (!u.avatar) return null; if (u.avatar === 'upload') { if (cfg.avatarUploadOff && !own) return null; return { kind: 'upload', url: u.avatarData || '', hidden: !!cfg.avatarUploadOff }; } return { kind: 'ph', id: u.avatar }; }
  function hostPublic(e) { var u = userById(e.ownerId); return !!u && !!u.profilePublic && !u.locked; }
  function hostName(e) { var u = userById(e.ownerId); return u ? u.username : (e.host || 'Unbekannt'); }
  function avgOrZero(s, c) { return c >= MIN_RATINGS ? Math.round(s / c * 100) / 100 : 0; }
  function ratingOf(eventId) { var s = 0, c = 0, d = [0, 0, 0, 0, 0]; data.bookings.forEach(function (b) { if (b.eventId === eventId && b.rating > 0) { s += b.rating; c++; d[b.rating - 1]++; } }); return { avg: avgOrZero(s, c), count: c, dist: c >= MIN_RATINGS ? d : null }; }
  function meInfo(u, B) { var unread = data.notes.filter(function (n) { return n.userId === u.id && !n.read; }).length; return { id: u.id, username: u.username, firstName: u.firstName, lastName: u.lastName, xv: u.xv, email: u.email, role: u.role, level: levelOf(B, u.id), mustChange: !!u.mustChange, unread: unread, created: u.created, profilePublic: !!u.profilePublic, publicHintOff: !!u.publicHintOff, iddHost: !!u.iddHost, iddDuty: !!u.iddDuty, iddHours: u.iddHours === 30 ? 30 : 15, gbId: u.gbId || '' }; }
  function eventBase(B, e) {
    return { id: e.id, title: e.title, host: hostName(e), hostPublic: hostPublic(e), hostLevel: pubLevel(B, e.ownerId), hostExpert: pubExpert(B, e.ownerId, e.category, e.topic), category: e.category, type: e.type, topic: e.topic, date: e.date, start: e.start, duration: e.duration, capacity: e.capacity,
      description: e.description, rev: e.rev || 0, idd: !!e.idd && !!cfg.idd.on, iddTitle: e.idd && cfg.idd.on ? e.iddTitle || '' : '', iddMinutes: e.idd && cfg.idd.on ? e.iddMinutes || 0 : 0, agenda: e.idd && cfg.idd.on ? e.agenda || [] : null, iddContent: e.idd && cfg.idd.on ? e.iddContent || '' : '', isTest: !!e.isTest, image: e.imageData || null, placeholder: e.placeholder || '', cancelled: !!e.cancelled, cancelReason: e.cancelReason || '', cancelledAt: e.cancelledAt || '' };
  }
  function anonymize(e) {
    var held = !e.cancelled, owner = userById(e.ownerId);
    if (owner && held) { owner.legacyOffered = (owner.legacyOffered || 0) + 1; var k = e.category + '|' + e.topic; owner.legacyTopics = owner.legacyTopics || {}; owner.legacyTopics[k] = (owner.legacyTopics[k] || 0) + 1; }
    data.bookings.forEach(function (b) {
      if (b.eventId !== e.id) return; var bu = userById(b.userId);
      if (bu && held) bu.legacyAttended = (bu.legacyAttended || 0) + 1;
      if (owner && held && b.rating > 0) { owner.legacyRatingSum = (owner.legacyRatingSum || 0) + b.rating; owner.legacyRatingCount = (owner.legacyRatingCount || 0) + 1; }
      b.userId = null; b.name = 'Anonymisiert'; b.email = '';
    });
    data.notes = data.notes.filter(function (n) { return n.eventId !== e.id; });
    e.ownerId = null; e.host = 'Anonymisiert'; e.teamsLink = ''; e.anonymized = true; e.anonymizedAt = nowIso();
  }
  /* Konto loeschen: kuenftige eigene Veranstaltungen werden abgesagt, vergangene bleiben anonym; kuenftige Anmeldungen entfallen, vergangene werden anonymisiert */
  /* IDD-Nachweise einer geloeschten Person bis zum Ende der Frist aufheben (nur bestaetigte Teilnahmen, nur Nachweisdaten) */
  function archiveIdd(u, reason) {
    var items = [];
    data.bookings.forEach(function (b) {
      if (b.userId !== u.id || b.idd !== 'yes') return; var ev = data.events.filter(function (e) { return e.id === b.eventId; })[0];
      if (!ev || !ev.idd || ev.cancelled) return;
      items.push({ bookingId: b.id, eventId: ev.id, title: ev.title, iddTitle: ev.iddTitle || '', iddContent: ev.iddContent || '', date: ev.date, start: ev.start, end: endHm(ev), minutes: ev.iddMinutes, confirmedAt: b.confirmedAt || '', confirmedBy: b.confirmedBy || '', provider: cfg.idd.provider || '' });
    });
    if (items.length) data.iddArchive.push({ id: rid(8), firstName: u.firstName, lastName: u.lastName, xv: u.xv, gbId: u.gbId || '', iddHours: u.iddHours === 30 ? 30 : 15, deletedAt: nowIso(), reason: reason, items: items });
  }
  function pruneIddArchive() {
    var y = new Date().getFullYear(), ch = false;
    data.iddArchive.forEach(function (a) { var n = a.items.length; a.items = a.items.filter(function (it) { return y <= Number(String(it.date).slice(0, 4)) + RETAIN_YEARS; }); if (a.items.length !== n) ch = true; });
    var m = data.iddArchive.length; data.iddArchive = data.iddArchive.filter(function (a) { return a.items.length; }); return ch || m !== data.iddArchive.length;
  }
  function deleteUser(u, reason) {
    archiveIdd(u, reason);
    var now = new Date();
    data.events.forEach(function (e) {
      if (e.ownerId !== u.id) return;
      if (!e.cancelled && startDate(e) > now) { e.cancelled = true; e.cancelledAt = nowIso(); e.cancelReason = reason; data.bookings.forEach(function (b) { if (b.eventId === e.id && b.userId && b.userId !== u.id) addNote(b.userId, 'cancelled', e, reason); }); }
      e.ownerId = null; e.host = 'Anonymisiert'; e.teamsLink = '';
    });
    data.bookings = data.bookings.filter(function (b) {
      if (b.userId !== u.id) return true; var ev = data.events.filter(function (e) { return e.id === b.eventId; })[0];
      if (!ev || (!ev.cancelled && startDate(ev) > now)) return false; b.userId = null; b.name = 'Anonymisiert'; b.email = ''; return true;
    });
    data.notes = data.notes.filter(function (n) { return n.userId !== u.id; });
    data.users = data.users.filter(function (x) { return x !== u; });
  }
  /* Konten ohne Anmeldung seit INACTIVE_MONTHS Monaten loeschen (nicht Hauptadministration, keine Testkonten) */
  function purgeInactive() {
    var lim = new Date(); lim.setMonth(lim.getMonth() - INACTIVE_MONTHS);
    var old = data.users.filter(function (u) { if (u.role === 'superadmin' || u.isTest) return false; var t = new Date(u.lastLogin || u.created || 0); return !isNaN(t) && t < lim; });
    old.forEach(function (u) { deleteUser(u, 'Das Konto des LearnMakers wurde gelöscht.'); });
    return old.length > 0;
  }
  function sweep() { var now = new Date(), ch = false; data.events.forEach(function (e) { if (!e.anonymized && now >= anonymizeOn(e)) { anonymize(e); ch = true; } }); if (purgeInactive()) ch = true; if (pruneIddArchive()) ch = true; if (ch) save(); }
  /* Mitteilung an Angemeldete, wenn sich Termin oder Teams-Link geaendert haben */
  function notifyChanges(e, old) {
    var parts = [];
    if (e.date !== old.date || e.start !== old.start || e.duration !== old.duration) parts.push('Neuer Termin: ' + e.date.split('-').reverse().join('.') + ', ' + e.start + ' bis ' + endHm(e) + ' Uhr. Bitte passe Deinen Kalender an.');
    if (e.teamsLink !== old.teamsLink) parts.push('Der Teams-Link hat sich geändert. Den neuen Link findest Du unter Meine Anmeldungen.');
    if (!parts.length) return 0;
    e.rev = (e.rev || 0) + 1;
    var n = 0; data.bookings.forEach(function (b) { if (b.eventId === e.id && b.userId) { addNote(b.userId, 'changed', e, parts.join(' ')); n++; } }); return n;
  }
  function addNote(userId, type, e, reason) { data.notes.push({ id: rid(8), userId: userId, type: type, eventId: e.id, title: e.title, date: e.date, start: e.start, reason: reason || '', created: nowIso(), read: false }); }
  var authFails = {};
  function throttle(key, check) { var f = authFails[key]; if (check) { if (f && f.n >= 5 && Date.now() - f.t < 300000) throw ApiErr('locked', 'Zu viele Fehlversuche. Bitte warte fünf Minuten und versuche es dann erneut.'); return; } if (!f || Date.now() - f.t > 600000) f = authFails[key] = { n: 0, t: 0 }; f.n++; f.t = Date.now(); }
  return {
    settings: function () { return wrap(function () { return { appTitle: cfg.appTitle, labels: cfg.labels, topics: cfg.topics, colors: cfg.colors, headings: cfg.headings, texts: cfg.texts, types: cfg.types, hero: cfg.hero, badges: cfg.badges, avatarUpload: !cfg.avatarUploadOff, idd: iddPub(), photos: (cfg.photos || []).map(function (f) { return { id: f.id, name: f.name, keywords: f.keywords, ver: f.ver, url: f.data }; }) }; }); },
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
    adminSaveSettings: function (s) {
      return wrap(function () {
        if ('appTitle' in s) { var t = (s.appTitle || '').trim(); if (t.length < 2 || t.length > 60) throw ApiErr('invalid', 'Der Titel der Anwendung muss zwischen 2 und 60 Zeichen lang sein.'); cfg.appTitle = t; }
        if ('heroTitle' in s || 'heroText' in s) {
          var ht = (s.heroTitle || '').trim(), hx = (s.heroText || '').trim();
          if (ht.length < 3 || ht.length > 80) throw ApiErr('invalid', 'Die Überschrift muss zwischen 3 und 80 Zeichen lang sein.');
          if (hx.length < 10 || hx.length > 500) throw ApiErr('invalid', 'Der Hinweistext muss zwischen 10 und 500 Zeichen lang sein.');
          cfg.hero = { title: ht, text: hx }; applyTaxonomy(cfg);
        }
        if ('badgeLevels' in s) {
          var lv = (s.badgeLevels || []).map(Number); if (lv.length !== 6) throw ApiErr('invalid', 'Es sind genau sechs Stufen nötig.');
          lv.forEach(function (n, i) { if (!(n >= 1 && n <= 100000) || Math.floor(n) !== n) throw ApiErr('invalid', 'Die Grenzen der Stufen müssen ganze Zahlen von 1 bis 100000 sein.'); if (i && n <= lv[i - 1]) throw ApiErr('invalid', 'Die Grenzen müssen von Stufe zu Stufe ansteigen.'); });
          cfg.badges.levels = lv; applyTaxonomy(cfg);
        }
        if ('badgeSecret' in s) { var sc = Number(s.badgeSecret); if (!(sc >= 1 && sc <= 100000) || Math.floor(sc) !== sc) throw ApiErr('invalid', 'Die Grenze für den Learnicorn muss eine ganze Zahl von 1 bis 100000 sein.'); cfg.badges.secret = sc; }
        if ((cfg.badges.secret || SECRET_MIN) <= cfg.badges.levels[5]) throw ApiErr('invalid', 'Die Grenze für den Learnicorn muss über der Grenze für Stufe 6 liegen.');
        if ('avatarUpload' in s) { cfg.avatarUploadOff = !s.avatarUpload; applyTaxonomy({ avatarUpload: !!s.avatarUpload }); }
        if ('iddOn' in s) cfg.idd.on = !!s.iddOn;
        if ('iddProvider' in s) {
          var pv = String(s.iddProvider || '').trim(), wt = String(s.iddWelcomeTitle || '').trim(), wx = String(s.iddWelcomeText || '').trim(), ft = String(s.iddFarewellTitle || '').trim(), fx = String(s.iddFarewellText || '').trim();
          if (pv.length < 3 || pv.length > 120) throw ApiErr('invalid', 'Der Bildungsdienstleister muss zwischen 3 und 120 Zeichen lang sein.');
          if (wt.length < 2 || wt.length > 60 || ft.length < 2 || ft.length > 60) throw ApiErr('invalid', 'Die Titel für Begrüßung und Verabschiedung müssen zwischen 2 und 60 Zeichen lang sein.');
          if (wx.length > 300 || fx.length > 300) throw ApiErr('invalid', 'Die Texte für Begrüßung und Verabschiedung dürfen höchstens 300 Zeichen lang sein.');
          cfg.idd.provider = pv; cfg.idd.welcomeTitle = wt; cfg.idd.welcomeText = wx; cfg.idd.farewellTitle = ft; cfg.idd.farewellText = fx;
        }
        if ('audience' in s) { var au = Number(s.audience); if (!(au >= 0 && au <= 1000000) || Math.floor(au) !== au) throw ApiErr('invalid', 'Die Größe der Zielgruppe muss zwischen 0 und 1.000.000 liegen.'); cfg.audience = au; }
        if ('expertMin' in s) { var em = Number(s.expertMin); if (!(em >= 1 && em <= 1000) || Math.floor(em) !== em) throw ApiErr('invalid', 'Die Mindestzahl für den Expertenstatus muss zwischen 1 und 1000 liegen.'); cfg.badges.expertMin = em; applyTaxonomy(cfg); }
        save(); return {};
      });
    },
    adminManual: function () { return wrap(function () { if (!CFG.adminManualHtml) throw ApiErr('notfound', 'Das Administrationshandbuch ist in dieser Version nicht enthalten.'); return CFG.adminManualHtml; }); },
    adminManualPdf: function () { if (!CFG.adminPdfUrl) return Promise.reject(ApiErr('notfound', 'Das PDF ist in dieser Version nicht enthalten.')); return fetch(CFG.adminPdfUrl).then(function (r) { return r.blob(); }); },
    /* ---- Konten ---- */
    register: function (p) {
      return wrap(function () {
        var un = String(p.username || '').trim(), fn = String(p.firstName || '').trim(), ln = String(p.lastName || '').trim(), xv = normXv(p.xv), em = String(p.email || '').trim().toLowerCase(), pw = String(p.password || '');
        if (!/^[A-Za-z0-9][A-Za-z0-9._-]{2,23}$/.test(un)) throw ApiErr('invalid', 'Der Benutzername muss 3 bis 24 Zeichen lang sein und darf nur Buchstaben, Ziffern, Punkt, Unterstrich und Bindestrich enthalten.');
        if (RESERVED.indexOf(un.toLowerCase()) >= 0) throw ApiErr('invalid', 'Dieser Benutzername ist reserviert. Bitte wähle einen anderen.');
        if (!/^[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ .'\-]{0,59}$/.test(fn)) throw ApiErr('invalid', 'Bitte gib Deinen Vornamen an.');
        if (!/^[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ .'\-]{0,59}$/.test(ln)) throw ApiErr('invalid', 'Bitte gib Deinen Nachnamen an.');
        if (!/^XVG?[0-9]{2,8}$/.test(xv)) throw ApiErr('invalid', 'Bitte gib eine gültige XV-Nummer an (z. B. XV12345 oder XVG12345).');
        if (!validEmail(em)) throw ApiErr('invalid', 'Bitte gib eine gültige E-Mail-Adresse an.');
        var pr = pwProblem(pw, un, em); if (pr) throw ApiErr('invalid', pr);
        if (data.users.some(function (u) { return u.username.toLowerCase() === un.toLowerCase(); })) throw ApiErr('taken', 'Dieser Benutzername ist bereits vergeben.');
        if (data.users.some(function (u) { return u.email.toLowerCase() === em; })) throw ApiErr('taken', 'Mit dieser E-Mail-Adresse gibt es bereits ein Konto.');
        if (data.users.some(function (u) { return u.xv === xv; })) throw ApiErr('taken', 'Zu dieser XV-Nummer gibt es bereits ein Konto.');
        var u = { id: rid(8), username: un, firstName: fn, lastName: ln, xv: xv, email: em, pwHash: hashPw(pw), pwVersion: 0, role: 'user', locked: false, mustChange: false, created: nowIso(), lastLogin: nowIso(), isTest: false, legacyOffered: 0, legacyAttended: 0, legacyRatingSum: 0, legacyRatingCount: 0, legacyTopics: {} };
        data.users.push(u); save(); sess.set('lt_me', u.id);
        return { me: meInfo(u, badges()) };
      });
    },
    login: function (id, pw) {
      return wrap(function () {
        var key = String(id || '').trim().toLowerCase(); throttle('u:' + key, true);
        var u = data.users.filter(function (x) { return x.username.toLowerCase() === key || x.email.toLowerCase() === key; })[0];
        var ok = u ? checkPw(pw || '', u.pwHash) : false;
        if (!ok) { throttle('u:' + key, false); throw ApiErr('login', 'Benutzername oder Passwort stimmen nicht.'); }
        if (u.locked) throw ApiErr('locked', 'Dieses Konto ist gesperrt. Bitte wende Dich an die Administration.');
        delete authFails['u:' + key]; u.lastLogin = nowIso(); save(); sess.set('lt_me', u.id);
        return { me: meInfo(u, badges()) };
      });
    },
    logout: function () { return wrap(function () { sess.del('lt_me'); return {}; }); },
    me: function () { return wrap(function () { var u = curUser(false); return { me: u ? meInfo(u, badges()) : null }; }); },
    changePassword: function (cur, nw) {
      return wrap(function () {
        var u = curUser(true); if (!checkPw(cur || '', u.pwHash)) throw ApiErr('password', 'Das aktuelle Passwort stimmt nicht.');
        var pr = pwProblem(nw, u.username, u.email); if (pr) throw ApiErr('invalid', pr);
        if (nw === cur) throw ApiErr('invalid', 'Das neue Passwort muss sich vom bisherigen unterscheiden.');
        u.pwHash = hashPw(nw); u.pwVersion = (u.pwVersion || 0) + 1; u.mustChange = false; save(); return {};
      });
    },
    /* ---- Veranstaltungen ---- */
    events: function () {
      return wrap(function () {
        var now = new Date(), me = curUser(false), B = badges();
        return data.events.filter(function (e) { return startDate(e) > now && !e.cancelled; }).map(function (e) {
          var o = eventBase(B, e); o.booked = booked(e.id); o.own = !!me && e.ownerId === me.id; o.mine = !!me && data.bookings.some(function (b) { return b.eventId === e.id && b.userId === me.id; }); return o;
        });
      });
    },
    updateEvent: function (v) {
      return wrap(function () {
        var me = curUser(true), e = data.events.filter(function (x) { return x.id === v.id; })[0];
        if (!e || e.ownerId !== me.id) throw ApiErr('notfound', 'Diese Veranstaltung gibt es nicht oder sie gehört Dir nicht.');
        if (e.cancelled) throw ApiErr('invalid', 'Eine abgesagte Veranstaltung lässt sich nicht mehr bearbeiten.');
        if (startDate(e) <= new Date()) throw ApiErr('past', 'Die Veranstaltung hat bereits begonnen. Sie lässt sich nicht mehr bearbeiten.');
        if (Number(v.capacity) < booked(e.id)) throw ApiErr('invalid', 'Die maximale Teilnehmendenzahl kann nicht unter der Zahl der bereits angemeldeten Personen (' + booked(e.id) + ') liegen.');
        var old = { date: e.date, start: e.start, duration: e.duration, teamsLink: e.teamsLink };
        readEvent(v, e, false, me.iddHost || me.role !== 'user' || e.idd ? 1 : 0); var n = notifyChanges(e, old); save(); return { id: e.id, notified: n };
      });
    },
    createEvent: function (v) { return wrap(function () { var me = curUser(true); var e = readEvent(v, { id: rid(8), ownerId: me.id, host: me.username, created: nowIso(), isTest: false }, false, me.iddHost || me.role !== 'user' ? 1 : 0); data.events.push(e); save(); return { id: e.id }; }); },
    book: function (id) {
      return wrap(function () {
        var me = curUser(true), ev = data.events.filter(function (e) { return e.id === id; })[0], B = badges();
        if (!ev) throw ApiErr('notfound', 'Diese Veranstaltung gibt es nicht mehr.');
        if (ev.cancelled) throw ApiErr('cancelled', 'Diese Veranstaltung wurde abgesagt. Eine Anmeldung ist nicht mehr möglich.');
        if (startDate(ev) <= new Date()) throw ApiErr('past', 'Diese Veranstaltung hat bereits begonnen. Eine Anmeldung ist nicht mehr möglich.');
        if (ev.ownerId === me.id) throw ApiErr('own', 'Das ist Deine eigene Veranstaltung.');
        if (data.bookings.some(function (b) { return b.eventId === id && b.userId === me.id; })) throw ApiErr('duplicate', 'Du bist bereits angemeldet.');
        if (booked(id) >= ev.capacity) throw ApiErr('full', 'Inzwischen sind alle Plätze vergeben. Die Anmeldung war deshalb nicht möglich.');
        var bk = { id: rid(8), eventId: id, userId: me.id, created: nowIso(), rating: 0, ratedAt: '', isTest: false }; data.bookings.push(bk); save();
        var info = eventBase(B, ev); info.teamsLink = ev.teamsLink; return { bookingId: bk.id, eventInfo: info };
      });
    },
    cancelBooking: function (eventId) {
      return wrap(function () {
        var me = curUser(true), bk = data.bookings.filter(function (b) { return b.eventId === eventId && b.userId === me.id; })[0];
        if (!bk) throw ApiErr('notfound', 'Du bist für diese Veranstaltung nicht angemeldet.');
        var ev = data.events.filter(function (e) { return e.id === eventId; })[0];
        if (ev && startDate(ev) <= new Date()) throw ApiErr('past', 'Die Veranstaltung hat bereits begonnen. Eine Stornierung ist nicht mehr möglich.');
        data.bookings = data.bookings.filter(function (b) { return b !== bk; }); save(); return {};
      });
    },
    cancelEvent: function (id, reason) {
      return wrap(function () {
        var me = curUser(true), ev = data.events.filter(function (e) { return e.id === id; })[0], admin = me.role === 'admin' || me.role === 'superadmin';
        if (!ev || (ev.ownerId !== me.id && !admin)) throw ApiErr('notfound', 'Diese Veranstaltung gibt es nicht oder sie gehört Dir nicht.');
        if (ev.cancelled) throw ApiErr('invalid', 'Diese Veranstaltung ist bereits abgesagt.');
        if (startDate(ev) <= new Date()) throw ApiErr('past', 'Die Veranstaltung hat bereits begonnen. Eine Absage ist nicht mehr möglich.');
        ev.cancelled = true; ev.cancelledAt = nowIso(); ev.cancelReason = String(reason || '').trim().slice(0, 300);
        var n = 0; data.bookings.forEach(function (b) { if (b.eventId === ev.id && b.userId) { addNote(b.userId, 'cancelled', ev, ev.cancelReason); n++; } });
        save(); return { booked: n };
      });
    },
    myBookings: function () {
      return wrap(function () {
        var me = curUser(true), B = badges(), now = new Date();
        var l = [];
        data.bookings.forEach(function (bk) {
          if (bk.userId !== me.id) return; var ev = data.events.filter(function (e) { return e.id === bk.eventId; })[0]; if (!ev) return;
          var o = eventBase(B, ev), ended = eventEnded(ev); o.teamsLink = ev.cancelled ? '' : ev.teamsLink; o.bookingId = bk.id; o.rating = bk.rating || 0; o.ended = ended; o.canRate = ended && !ev.cancelled && !bk.rating; o.canCancel = startDate(ev) > now; l.push(o);
        });
        return { bookings: l, notes: data.notes.filter(function (n) { return n.userId === me.id; }).map(function (n) { return { id: n.id, type: n.type, eventId: n.eventId, title: n.title, date: n.date, start: n.start, reason: n.reason, created: n.created, read: n.read }; }) };
      });
    },
    rate: function (bookingId, stars) {
      return wrap(function () {
        var me = curUser(true); stars = Number(stars); if (!(stars >= 1 && stars <= 5) || Math.floor(stars) !== stars) throw ApiErr('invalid', 'Bitte vergib 1 bis 5 Sterne.');
        var bk = data.bookings.filter(function (b) { return b.id === bookingId && b.userId === me.id; })[0]; if (!bk) throw ApiErr('notfound', 'Diese Anmeldung gibt es nicht.');
        var ev = data.events.filter(function (e) { return e.id === bk.eventId; })[0];
        if (!ev || ev.cancelled || !eventEnded(ev)) throw ApiErr('invalid', 'Bewerten kannst Du nur Veranstaltungen, die stattgefunden haben.');
        if (bk.rating) throw ApiErr('invalid', 'Diese Veranstaltung hast Du bereits bewertet. Eine Bewertung lässt sich nicht mehr ändern.');
        bk.rating = stars; bk.ratedAt = nowIso(); save(); return { rating: stars };
      });
    },
    markRead: function (id) { return wrap(function () { var me = curUser(true); data.notes.forEach(function (n) { if (n.userId === me.id && (!id || n.id === id)) n.read = true; }); save(); return {}; }); },
    myEvents: function () {
      return wrap(function () {
        var me = curUser(true), B = badges(), now = new Date();
        return { events: data.events.filter(function (e) { return e.ownerId === me.id; }).map(function (ev) {
          var o = eventBase(B, ev), people = data.bookings.filter(function (b) { return b.eventId === ev.id; }).map(function (b) { var bu = userById(b.userId); return { id: b.id, username: bu ? bu.username : 'Anonymisiert', level: pubLevel(B, b.userId), created: b.created, idd: b.idd || '' }; }), r = ratingOf(ev.id);
          o.teamsLink = ev.teamsLink; o.participants = people; o.booked = people.length; o.ended = eventEnded(ev); o.ratingAvg = r.avg; o.ratingCount = r.count; o.canCancel = !ev.cancelled && startDate(ev) > now;
          if (ev.idd && o.ended && !ev.cancelled && cfg.idd.on) o.iddConfirm = { open: iddHostCan(ev, now), until: iddHostDeadline(ev).toISOString(), locked: now > iddHardLock(ev) };
          return o;
        }) };
      });
    },
    profile: function () {
      return wrap(function () {
        var me = curUser(true), B = badges(), now = new Date(), s = BADGES;
        var heldOffered = B.offered[me.id] || 0, upO = 0, canO = 0, rs = me.legacyRatingSum || 0, rc = me.legacyRatingCount || 0, heldA = me.legacyAttended || 0, upA = 0, rated = 0, offered = [], attended = [], topics = [];
        data.events.forEach(function (ev) {
          if (ev.ownerId !== me.id) return; var ended = eventEnded(ev), r = ratingOf(ev.id);
          if (ev.cancelled) canO++; else if (!ended) upO++;
          if (ended && !ev.cancelled) { data.bookings.forEach(function (b) { if (b.eventId === ev.id && b.rating > 0) rs += b.rating; }); rc += r.count; }
          if (ended || ev.cancelled) offered.push({ id: ev.id, title: ev.title, date: ev.date, start: ev.start, category: ev.category, type: ev.type, topic: ev.topic, booked: booked(ev.id), cancelled: !!ev.cancelled, ratingAvg: r.avg, ratingCount: r.count });
        });
        data.bookings.forEach(function (bk) {
          if (bk.userId !== me.id) return; var ev = data.events.filter(function (e) { return e.id === bk.eventId; })[0]; if (!ev || ev.cancelled) return;
          if (!eventEnded(ev)) { upA++; return; } heldA++; if (bk.rating) rated++;
          attended.push({ id: ev.id, title: ev.title, date: ev.date, start: ev.start, category: ev.category, type: ev.type, topic: ev.topic, host: hostName(ev), hostLevel: pubLevel(B, ev.ownerId), rating: bk.rating || 0 });
        });
        Object.keys(B.topic).forEach(function (k) { if (k.indexOf(me.id + '|') !== 0) return; var p = k.split('|'); topics.push({ category: p[1], topic: p[2], count: B.topic[k], expert: B.topic[k] >= s.expertMin }); });
        var next = null; for (var i = 0; i < s.levels.length; i++) if (heldOffered < s.levels[i]) { next = s.levels[i]; break; }
        return { me: meInfo(me, B), badge: { level: levelOf(B, me.id), offered: heldOffered, levels: s.levels, next: next, expertMin: s.expertMin },
          offered: { held: heldOffered, upcoming: upO, cancelled: canO, ratingAvg: avgOrZero(rs, rc), ratingCount: rc, minRatings: MIN_RATINGS, list: offered }, attended: { held: heldA, upcoming: upA, rated: rated, list: attended }, topics: topics, pub: { isPublic: !!me.profilePublic, showRating: !!me.showRating, showExpert: !!me.showExpert, showEmail: !!me.showEmail, showUpcoming: !!me.showUpcoming, showAvatar: !!me.showAvatar, showBadges: !!me.showBadges, bio: me.bio || '' }, avatar: avInfo(me, true), avatarUpload: !cfg.avatarUploadOff };
      });
    },
    updateAccount: function (p) {
      return wrap(function () {
        var me = curUser(true), fn = String(p.firstName || '').trim(), ln = String(p.lastName || '').trim(), xv = normXv(p.xv), em = String(p.email || '').trim().toLowerCase();
        if (!/^[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ .'\-]{0,59}$/.test(fn)) throw ApiErr('invalid', 'Bitte gib Deinen Vornamen an.');
        if (!/^[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ .'\-]{0,59}$/.test(ln)) throw ApiErr('invalid', 'Bitte gib Deinen Nachnamen an.');
        if (!/^XVG?[0-9]{2,8}$/.test(xv)) throw ApiErr('invalid', 'Bitte gib eine gültige XV-Nummer an (z. B. XV12345 oder XVG12345).');
        if (!validEmail(em)) throw ApiErr('invalid', 'Bitte gib eine gültige E-Mail-Adresse an.');
        if (!checkPw(p.password || '', me.pwHash)) throw ApiErr('password', 'Das Passwort stimmt nicht.');
        if (data.users.some(function (u) { return u.id !== me.id && u.email.toLowerCase() === em; })) throw ApiErr('taken', 'Mit dieser E-Mail-Adresse gibt es bereits ein Konto.');
        if (data.users.some(function (u) { return u.id !== me.id && u.xv === xv; })) throw ApiErr('taken', 'Zu dieser XV-Nummer gibt es bereits ein Konto.');
        me.firstName = fn; me.lastName = ln; me.xv = xv; me.email = em; save(); return { me: meInfo(me, badges()) };
      });
    },
    setAvatar: function (p) {
      return wrap(function () {
        var me = curUser(true);
        if (p.kind === 'upload') { if (cfg.avatarUploadOff) throw ApiErr('forbidden', 'Das Hochladen von Profilbildern ist zurzeit abgeschaltet.'); if (!/^data:image\/jpeg;base64,/.test(p.imageData || '')) throw ApiErr('invalid', 'Das Bildformat wird nicht unterstützt.'); me.avatar = 'upload'; me.avatarData = p.imageData; }
        else if (p.kind === 'ph') { if (!/^[a-z0-9-]{1,40}$/.test(p.id || '')) throw ApiErr('invalid', 'Unbekanntes Profilbild.'); me.avatar = p.id; delete me.avatarData; }
        else { me.avatar = ''; me.showAvatar = false; delete me.avatarData; }
        me.avatarVer = Date.now(); save(); return { avatar: avInfo(me, true) };
      });
    },
    adminDeleteAvatar: function (id) { return wrap(function () { needAdmin(); var u = userById(id); if (!u) throw ApiErr('notfound', 'Diesen Benutzer gibt es nicht.'); u.avatar = ''; u.showAvatar = false; delete u.avatarData; save(); return {}; }); },
    adminSavePhoto: function (p) {
      return wrap(function () {
        needAdmin(); cfg.photos = cfg.photos || [];
        var name = String(p.name || '').trim(), kw = String(p.keywords || '').trim();
        if (name.length < 2 || name.length > 40) throw ApiErr('invalid', 'Der Name muss zwischen 2 und 40 Zeichen lang sein.');
        var f = cfg.photos.filter(function (x) { return x.id === p.id; })[0];
        if (!f) { if (!p.imageData) throw ApiErr('invalid', 'Bitte wähle ein Foto aus.'); f = { id: 'f-' + rid(8) }; cfg.photos.push(f); }
        if (p.imageData) { f.data = p.imageData; f.ver = Date.now(); }
        f.name = name; f.keywords = kw; save(); applyTaxonomy({ photos: this.settingsPhotos() });
        return { photos: this.settingsPhotos() };
      }.bind(this));
    },
    adminDeletePhoto: function (id) { return wrap(function () { needAdmin(); cfg.photos = (cfg.photos || []).filter(function (x) { return x.id !== id; }); save(); applyTaxonomy({ photos: this.settingsPhotos() }); return { photos: this.settingsPhotos() }; }.bind(this)); },
    settingsPhotos: function () { return (cfg.photos || []).map(function (f) { return { id: f.id, name: f.name, keywords: f.keywords, ver: f.ver, url: f.data }; }); },
    dismissHint: function () { return wrap(function () { var me = curUser(true); me.publicHintOff = true; save(); return {}; }); },
    saveProfile: function (p) {
      return wrap(function () {
        var me = curUser(true), bio = String(p.bio || '').replace(/\r/g, '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');
        if (bio.length > 300) throw ApiErr('invalid', 'Die Beschreibung darf höchstens 300 Zeichen lang sein.');
        if ((bio.match(/\n/g) || []).length > 6) throw ApiErr('invalid', 'Die Beschreibung darf höchstens 7 Zeilen haben.');
        me.profilePublic = !!p.isPublic; me.showRating = !!p.showRating; me.showExpert = !!p.showExpert; me.showEmail = !!p.showEmail; me.showUpcoming = !!p.showUpcoming; me.showAvatar = !!p.showAvatar && !!me.avatar; me.showBadges = !!p.showBadges; me.bio = bio.trim(); save(); return {};
      });
    },
    publicProfile: function (username) {
      return wrap(function () {
        var me = curUser(false), B = badges(), s = BADGES, key = String(username || '').toLowerCase(), now = new Date();
        var u = data.users.filter(function (x) { return x.username.toLowerCase() === key; })[0];
        if (!u || !u.profilePublic || u.locked) throw ApiErr('notfound', 'Dieses Profil ist nicht öffentlich oder gibt es nicht.');
        var p = { username: u.username, level: pubLevel(B, u.id), bio: u.bio || '', offered: B.offered[u.id] || 0, topics: [] }, experts = [];
        if (u.showAvatar) { var av = avInfo(u, false); if (av) p.avatar = av; }
        Object.keys(B.topic).forEach(function (k) { if (k.indexOf(u.id + '|') !== 0) return; var q = k.split('|'); p.topics.push({ category: q[1], topic: q[2], count: B.topic[k] }); if (B.topic[k] >= s.expertMin) experts.push({ category: q[1], topic: q[2] }); });
        if (u.showExpert && u.showBadges) p.experts = experts;
        if (u.showEmail) p.email = u.email;
        if (u.showRating) { var rs = u.legacyRatingSum || 0, rc = u.legacyRatingCount || 0; data.events.forEach(function (ev) { if (ev.ownerId !== u.id || ev.cancelled || !eventEnded(ev)) return; data.bookings.forEach(function (b) { if (b.eventId === ev.id && b.rating > 0) { rs += b.rating; rc++; } }); }); p.ratingAvg = avgOrZero(rs, rc); p.ratingCount = rc; }
        if (u.showUpcoming) p.upcoming = data.events.filter(function (ev) { return ev.ownerId === u.id && !ev.cancelled && startDate(ev) > now; }).map(function (ev) { return { id: ev.id, category: ev.category, title: ev.title, topic: ev.topic, type: ev.type, date: ev.date, start: ev.start, duration: ev.duration, capacity: ev.capacity, booked: booked(ev.id), mine: !!me && data.bookings.some(function (b) { return b.eventId === ev.id && b.userId === me.id; }), own: !!me && me.id === u.id }; });
        return { profile: p };
      });
    },
    /* ---- Admin ---- */
    adminEvents: function () {
      return wrap(function () {
        needAdmin(); var B = badges(), tok = {}, nTok = 0, buckets = {};
        function T(id) { if (!id) return ''; if (!tok[id]) tok[id] = 'p' + (nTok++); return tok[id]; }
        /* wie auf dem Server: je Veranstaltung nur die Zahl der Bewertungen, Sterne nur zusammengefasst; private Veranstaltungen ohne Namen der Teilnehmenden */
        var list = data.events.map(function (e) {
          var o = eventBase(B, e), ow = userById(e.ownerId), priv = e.category === 'privat', cnt = 0, dist = [0, 0, 0, 0, 0];
          o.ownerId = e.ownerId || ''; o.owner = ow ? { username: ow.username, firstName: ow.firstName, lastName: ow.lastName, xv: ow.xv, email: ow.email } : null; o.teamsLink = e.teamsLink; o.anonymized = !!e.anonymized; o.anonymizedAt = e.anonymizedAt || '';
          o.bookings = data.bookings.filter(function (b) { return b.eventId === e.id; }).map(function (b) {
            if (b.rating > 0) { cnt++; dist[b.rating - 1]++; }
            var bu = userById(b.userId);
            if (priv) return { id: b.id, p: T(b.userId), hidden: true, created: b.created };
            return bu ? { id: b.id, p: T(b.userId), username: bu.username, firstName: bu.firstName, lastName: bu.lastName, xv: bu.xv, email: bu.email, created: b.created } : { id: b.id, p: '', username: b.name || 'Anonymisiert', firstName: '', lastName: '', xv: '', email: b.email || '', created: b.created };
          });
          if (cnt && !e.cancelled) { var k = e.date.slice(0, 7) + '|' + e.category + '|' + e.topic + '|' + (e.isTest ? 1 : 0); var bk = buckets[k] || (buckets[k] = { m: e.date.slice(0, 7), c: e.category, t: e.topic, test: !!e.isTest, d: [0, 0, 0, 0, 0], h: {} }); dist.forEach(function (n, i) { bk.d[i] += n; }); bk.h['h' + T('o:' + (e.ownerId || e.id))] = 1; }
          o.booked = o.bookings.length; o.ratingCount = cnt; o.participantsHidden = priv; return o;
        });
        list.ratingBuckets = Object.keys(buckets).map(function (k) { var b = buckets[k]; return { m: b.m, c: b.c, t: b.t, test: b.test, d: b.d, h: Object.keys(b.h) }; });
        return list;
      });
    },
    adminUsers: function () {
      return wrap(function () {
        needAdmin(); var B = badges(), now = Date.now(), act = [0, 0, 0, 0, 0];
        var users = data.users.map(function (u) {
          var k = 4; if (u.lastLogin) { var d = (now - new Date(u.lastLogin)) / 864e5; k = d < 7 ? 0 : d < 30 ? 1 : d < 90 ? 2 : 3; } act[k]++;
          return { id: u.id, username: u.username, firstName: u.firstName, lastName: u.lastName, xv: u.xv, email: u.email, role: u.role, locked: !!u.locked, mustChange: !!u.mustChange, created: u.created, isTest: !!u.isTest, level: levelOf(B, u.id), offered: B.offered[u.id] || 0, profilePublic: !!u.profilePublic, avatar: avInfo(u, true), iddHost: !!u.iddHost, iddDuty: !!u.iddDuty, gbId: u.gbId || '' };
        });
        return { users: users, activity: act, inactiveMonths: INACTIVE_MONTHS };
      });
    },
    adminDeleteUser: function (id) {
      return wrap(function () {
        var me = needAdmin(), u = userById(id); if (!u) throw ApiErr('notfound', 'Diesen Benutzer gibt es nicht.');
        if (u.role === 'superadmin' || u.id === me.id) throw ApiErr('forbidden', 'Dieses Konto lässt sich hier nicht löschen.');
        if (u.role === 'admin' && me.role !== 'superadmin') throw ApiErr('forbidden', 'Admin-Konten kann nur die Hauptadministration löschen.');
        deleteUser(u, 'Das Konto des LearnMakers wurde gelöscht.'); save(); return {};
      });
    },
    deleteAccount: function (pw) {
      return wrap(function () {
        var me = curUser(true); if (me.role === 'superadmin') throw ApiErr('forbidden', 'Das Konto der Hauptadministration lässt sich nicht löschen.');
        if (!checkPw(pw || '', me.pwHash)) throw ApiErr('password', 'Das Passwort stimmt nicht.');
        deleteUser(me, 'Der LearnMaker hat das eigene Konto gelöscht.'); save(); sess.del('lt_me'); return {};
      });
    },
    saveIdd: function (p) {
      return wrap(function () {
        needIdd(); var me = curUser(true), gb = normGbId(p.gbId);
        if (gb === null) throw ApiErr('invalid', 'Die gutBeraten-ID besteht aus 12 Buchstaben oder Ziffern in drei Blöcken, zum Beispiel AB12-CD34-EF56.');
        if (gb && data.users.some(function (u) { return u.id !== me.id && (u.gbId || '') === gb; })) throw ApiErr('taken', 'Diese gutBeraten-ID ist bereits einem anderen Konto zugeordnet.');
        me.iddDuty = !!p.duty; me.iddHours = Number(p.hours) === 30 ? 30 : 15; if (me.iddDuty) me.gbId = gb; save(); return { me: meInfo(me, badges()) };
      });
    },
    confirmAttendance: function (bookingId, status) {
      return wrap(function () {
        needIdd(); var me = curUser(true), now = new Date();
        if (['yes', 'no', ''].indexOf(status) < 0) throw ApiErr('invalid', 'Ungültiger Status.');
        var bk = data.bookings.filter(function (b) { return b.id === bookingId; })[0], ev = bk && data.events.filter(function (e) { return e.id === bk.eventId; })[0];
        if (!bk || !ev || !ev.idd || !bk.userId) throw ApiErr('notfound', 'Diese Anmeldung gibt es nicht.');
        var admin = me.role !== 'user', owner = ev.ownerId === me.id;
        if (!owner && !admin) throw ApiErr('forbidden', 'Nur der LearnMaker oder die Administration kann Teilnahmen bestätigen.');
        if (now > iddHardLock(ev)) throw ApiErr('locked', 'Die Teilnahmen dieser Veranstaltung sind seit dem 31.01. endgültig gesperrt.');
        if (endDate(ev) > now) throw ApiErr('invalid', 'Teilnahmen lassen sich erst nach dem Ende der Veranstaltung bestätigen.');
        if (ev.cancelled) throw ApiErr('invalid', 'Die Veranstaltung wurde abgesagt.');
        if (!admin && !iddHostCan(ev, now)) throw ApiErr('locked', 'Die Frist zur Bestätigung ist abgelaufen. Die Administration kann sie für Dich wieder freischalten.');
        bk.idd = status; bk.confirmedAt = status ? nowIso() : ''; bk.confirmedBy = status ? me.username : ''; save(); return { status: status };
      });
    },
    iddCockpit: function () {
      return wrap(function () {
        var me = curUser(true), now = new Date(), items = [];
        if (cfg.idd.on) data.bookings.forEach(function (b) {
          if (b.userId !== me.id) return; var ev = data.events.filter(function (e) { return e.id === b.eventId; })[0];
          if (!ev || !ev.idd || ev.cancelled) return;
          items.push({ eventId: ev.id, title: ev.title, iddTitle: ev.iddTitle || '', iddContent: ev.iddContent || '', date: ev.date, start: ev.start, end: endHm(ev), duration: ev.duration, minutes: ev.iddMinutes, year: startDate(ev).getFullYear(), ended: endDate(ev) <= now, status: b.idd || '', confirmedAt: b.confirmedAt || '', locked: now > iddHardLock(ev) });
        });
        return { on: !!cfg.idd.on, duty: !!me.iddDuty, hours: me.iddHours === 30 ? 30 : 15, gbId: me.gbId || '', firstName: me.firstName, lastName: me.lastName, xv: me.xv, provider: cfg.idd.provider || '', items: items };
      });
    },
    adminIdd: function () {
      return wrap(function () {
        needAdmin(); var now = new Date();
        return data.events.filter(function (e) { return e.idd; }).map(function (e) {
          var ow = userById(e.ownerId);
          return { id: e.id, title: e.title, iddTitle: e.iddTitle || '', iddContent: e.iddContent || '', date: e.date, start: e.start, duration: e.duration, iddMinutes: e.iddMinutes, cancelled: !!e.cancelled, isTest: !!e.isTest, anonymized: !!e.anonymized, ended: endDate(e) <= now,
            owner: ow ? { username: ow.username, firstName: ow.firstName, lastName: ow.lastName } : null, hostUntil: iddHostDeadline(e).toISOString(), hostOpen: iddHostCan(e, now), lockAt: iddHardLock(e).toISOString(), locked: now > iddHardLock(e),
            bookings: data.bookings.filter(function (b) { return b.eventId === e.id; }).map(function (b) { var u = userById(b.userId), ar = !u && data.iddArchive.filter(function (a) { return a.items.some(function (it) { return it.bookingId === b.id; }); })[0];
              if (ar) return { id: b.id, userId: '', username: 'Konto gelöscht', firstName: ar.firstName, lastName: ar.lastName, xv: ar.xv, gbId: ar.gbId, iddDuty: true, status: b.idd || '', confirmedAt: b.confirmedAt || '', confirmedBy: b.confirmedBy || '', addedBy: b.addedBy || '', addReason: b.addReason || '', archived: true };
              return { id: b.id, userId: u ? u.id : '', username: u ? u.username : (b.name || 'Anonymisiert'), firstName: u ? u.firstName : '', lastName: u ? u.lastName : '', xv: u ? u.xv : '', gbId: u ? u.gbId || '' : '', iddDuty: !!(u && u.iddDuty), status: b.idd || '', confirmedAt: b.confirmedAt || '', confirmedBy: b.confirmedBy || '', addedBy: b.addedBy || '', addReason: b.addReason || '' }; }) };
        });
      });
    },
    adminIddArchive: function () { return wrap(function () { needAdmin(); return JSON.parse(JSON.stringify(data.iddArchive)); }); },
    adminIddReopen: function (id) {
      return wrap(function () {
        needAdmin(); var ev = data.events.filter(function (e) { return e.id === id && e.idd; })[0], now = new Date();
        if (!ev) throw ApiErr('notfound', 'Diese IDD-Veranstaltung gibt es nicht.');
        if (!iddAdminCan(ev, now)) throw ApiErr('locked', 'Die Teilnahmen dieser Veranstaltung lassen sich nicht mehr ändern.');
        ev.reopenUntil = new Date(now.getTime() + 14 * 864e5).toISOString(); save(); return { hostUntil: iddHostDeadline(ev).toISOString() };
      });
    },
    adminIddAdd: function (eventId, userId, reason) {
      return wrap(function () {
        var me = needAdmin(), ev = data.events.filter(function (e) { return e.id === eventId && e.idd; })[0], u = userById(userId), now = new Date(); reason = String(reason || '').trim();
        if (!ev) throw ApiErr('notfound', 'Diese IDD-Veranstaltung gibt es nicht.');
        if (!u) throw ApiErr('notfound', 'Diesen Benutzer gibt es nicht.');
        if (!iddAdminCan(ev, now)) throw ApiErr('locked', 'Die Teilnahmen dieser Veranstaltung lassen sich nicht mehr ändern.');
        if (reason.length < 5 || reason.length > 300) throw ApiErr('invalid', 'Bitte gib eine Begründung mit 5 bis 300 Zeichen an.');
        if (ev.ownerId === u.id) throw ApiErr('invalid', 'Der LearnMaker kann nicht als Teilnehmende eingetragen werden.');
        var bk = data.bookings.filter(function (b) { return b.eventId === ev.id && b.userId === u.id; })[0];
        if (!bk) { bk = { id: rid(8), eventId: ev.id, userId: u.id, created: nowIso(), rating: 0, ratedAt: '', isTest: false }; data.bookings.push(bk); }
        bk.idd = 'yes'; bk.confirmedAt = nowIso(); bk.confirmedBy = me.username; bk.addedBy = me.username; bk.addReason = reason; save(); return {};
      });
    },
    adminSetIddHost: function (id, on) { return wrap(function () { needAdmin(); var u = userById(id); if (!u) throw ApiErr('notfound', 'Diesen Benutzer gibt es nicht.'); u.iddHost = !!on; save(); return {}; }); },
    myData: function () {
      return wrap(function () {
        var me = curUser(true);
        var o = { exported: nowIso(),
          account: { username: me.username, firstName: me.firstName, lastName: me.lastName, xv: me.xv, email: me.email, role: me.role, created: me.created, lastLogin: me.lastLogin || '', locked: !!me.locked },
          profile: { isPublic: !!me.profilePublic, showRating: !!me.showRating, showExpert: !!me.showExpert, showEmail: !!me.showEmail, showUpcoming: !!me.showUpcoming, showAvatar: !!me.showAvatar, showBadges: !!me.showBadges, bio: me.bio || '', avatar: me.avatar || '', signIn: 'password', iddDuty: !!me.iddDuty, iddHours: me.iddHours === 30 ? 30 : 15, gbId: me.gbId || '', iddHost: !!me.iddHost },
          archive: { offeredBeforeAnonymization: me.legacyOffered || 0, attendedBeforeAnonymization: me.legacyAttended || 0 },
          events: data.events.filter(function (e) { return e.ownerId === me.id; }).map(function (e) { var r = ratingOf(e.id); return { title: e.title, category: e.category, type: e.type, topic: e.topic, date: e.date, start: e.start, duration: e.duration, capacity: e.capacity, teamsLink: e.teamsLink, description: e.description, created: e.created, cancelled: !!e.cancelled, cancelReason: e.cancelReason || '', participants: booked(e.id), ratingCount: r.count, ratingAvg: r.avg }; }),
          bookings: data.bookings.filter(function (b) { return b.userId === me.id; }).map(function (b) { var e = data.events.filter(function (x) { return x.id === b.eventId; })[0]; return { eventTitle: e ? e.title : '', date: e ? e.date : '', start: e ? e.start : '', booked: b.created, myRating: b.rating || 0, ratedAt: b.ratedAt || '', idd: !!(e && e.idd), iddTitle: e ? e.iddTitle || '' : '', iddMinutes: e && e.idd ? e.iddMinutes : 0, iddStatus: b.idd || '', confirmedAt: b.confirmedAt || '' }; }),
          notes: data.notes.filter(function (n) { return n.userId === me.id; }).map(function (n) { return { type: n.type, title: n.title, date: n.date, reason: n.reason, created: n.created, read: !!n.read }; }) };
        return new Blob([JSON.stringify(o, null, 2)], { type: 'application/json' });
      });
    },
    adminSetRole: function (id, role) {
      return wrap(function () {
        var me = needAdmin(); if (me.role !== 'superadmin') throw ApiErr('forbidden', 'Nur die Hauptadministration kann Admin-Rechte vergeben.');
        if (role !== 'user' && role !== 'admin') throw ApiErr('invalid', 'Ungültige Rolle.'); var u = userById(id); if (!u) throw ApiErr('notfound', 'Diesen Benutzer gibt es nicht.');
        if (u.role === 'superadmin') throw ApiErr('forbidden', 'Die Rechte der Hauptadministration lassen sich nicht ändern.'); u.role = role; save(); return {};
      });
    },
    adminResetPassword: function (id) {
      return wrap(function () {
        var me = needAdmin(), u = userById(id); if (!u) throw ApiErr('notfound', 'Diesen Benutzer gibt es nicht.');
        if (u.role === 'superadmin' && me.role !== 'superadmin') throw ApiErr('forbidden', 'Das Passwort der Hauptadministration kann nur sie selbst ändern.');
        var alpha = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789', tmp = ''; for (var i = 0; i < 14; i++) tmp += alpha[Math.floor(Math.random() * alpha.length)];
        u.pwHash = hashPw(tmp); u.pwVersion = (u.pwVersion || 0) + 1; u.mustChange = true; save(); return { password: tmp };
      });
    },
    adminSetLocked: function (id, locked) {
      return wrap(function () {
        var me = needAdmin(), u = userById(id); if (!u) throw ApiErr('notfound', 'Diesen Benutzer gibt es nicht.');
        if (u.role === 'superadmin' || u.id === me.id) throw ApiErr('forbidden', 'Dieses Konto lässt sich nicht sperren.'); u.locked = !!locked; save(); return {};
      });
    },
    adminSaveEvent: function (v) {
      return wrap(function () {
        var me = needAdmin(), e = data.events.filter(function (x) { return x.id === v.id; })[0], isNew = !e; if (isNew) e = { id: rid(8), ownerId: me.id, host: me.username, created: nowIso(), isTest: false };
        var old = { date: e.date, start: e.start, duration: e.duration, teamsLink: e.teamsLink };
        readEvent(v, e, true); if (!isNew && !e.cancelled && startDate(e) > new Date()) notifyChanges(e, old);
        if (e.capacity < booked(e.id)) throw ApiErr('invalid', 'Die maximale Teilnehmendenzahl kann nicht unter der Zahl der bereits angemeldeten Personen (' + booked(e.id) + ') liegen.');
        if (isNew) data.events.push(e); save(); return { id: e.id };
      });
    },
    adminDeleteEvent: function (id) {
      return wrap(function () {
        needAdmin(); var ev = data.events.filter(function (e) { return e.id === id; })[0];
        if (ev && !ev.cancelled && !eventEnded(ev)) data.bookings.forEach(function (b) { if (b.eventId === id && b.userId) addNote(b.userId, 'deleted', ev, ''); });
        data.events = data.events.filter(function (e) { return e.id !== id; }); data.bookings = data.bookings.filter(function (b) { return b.eventId !== id; });
        data.notes = data.notes.filter(function (n) { return n.eventId !== id || n.type === 'deleted'; }); save(); return {};
      });
    },
    adminDeleteBooking: function (id) {
      return wrap(function () {
        needAdmin(); var bk = data.bookings.filter(function (b) { return b.id === id; })[0];
        if (bk) { var ev = data.events.filter(function (e) { return e.id === bk.eventId; })[0]; if (ev && bk.userId && !eventEnded(ev) && !ev.cancelled) addNote(bk.userId, 'removed', ev, ''); data.bookings = data.bookings.filter(function (b) { return b !== bk; }); }
        save(); return {};
      });
    },
    adminSettings: function () { return wrap(function () { needAdmin(); return { appTitle: cfg.appTitle, local: true, badgeLevels: BADGES.levels, badgeSecret: cfg.badges.secret || SECRET_MIN, expertMin: BADGES.expertMin, testPassword: TEST_PW, idd: iddPub(), audience: cfg.audience == null ? 6000 : cfg.audience, testUsers: data.users.filter(function (u) { return u.isTest; }).length, testEvents: data.events.filter(function (e) { return e.isTest; }).length, https: location.protocol === 'https:', avatarUpload: !cfg.avatarUploadOff, photos: (cfg.photos || []).map(function (f) { return { id: f.id, name: f.name, keywords: f.keywords, ver: f.ver, url: f.data }; }) }; }); },
    adminTestData: function (m) {
      return wrap(function () {
        needAdmin();
        var tu = {}; data.users.forEach(function (u) { if (u.isTest) tu[u.id] = 1; });
        data.events = data.events.filter(function (e) { return !e.isTest; }); data.bookings = data.bookings.filter(function (b) { return !b.isTest && !(b.userId && tu[b.userId]); });
        data.notes = data.notes.filter(function (n) { return !tu[n.userId]; }); data.users = data.users.filter(function (u) { return !u.isTest; });
        var r = { events: 0, bookings: 0, users: 0 }; if (m === 'load') { var t = insertTest(); r.events = t.events.length; r.bookings = t.bookings.length; r.users = t.users.length; } sweep(); save(); return r;
      });
    },
    reset: function () { ['lt_data', 'lt_cfg', 'lt_seeded'].forEach(store.del); sess.del('lt_me'); data = cfg = null; },
    /* Nur Demo-Version: Passwort von "admin" auf das Standardpasswort setzen (5 schnelle Klicks auf das Logo im Footer). Die Daten bleiben erhalten. */
    resetAdminPassword: function () {
      return wrap(function () {
        var a = data.users.filter(function (u) { return u.username.toLowerCase() === 'admin'; })[0];
        if (!a) { ensureAdmin(); a = data.users.filter(function (u) { return u.username.toLowerCase() === 'admin'; })[0]; }
        a.pwHash = hashPw(DEFAULT_ADMIN_PW); a.pwVersion = (a.pwVersion || 0) + 1; a.locked = false; a.mustChange = false; a.role = 'superadmin';
        Object.keys(authFails).forEach(function (k) { delete authFails[k]; });
        save(); return {};
      });
    }
  };
})();
var Api = Local;

/* ====================================================== UI-Bausteine */
var appEl, navEl;
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
  var box = h('div', { class: 'modal' + (opt.wide ? ' wide' : '') + (opt.xwide ? ' xwide' : ''), role: 'dialog', 'aria-modal': 'true', 'aria-label': opt.label || 'Dialog' });
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

/* ====================================================== Platzhalterbilder (R+V-Bildwelt: flache Markenfarben, Piktogramme aus RuV-Icons-v3, keine Verläufe) */
/* Die Motive sind mit KI gestaltet und tragen deshalb das R+V-KI-Label. */
var KI_LABEL = { pos: '/*__KI_POS__*/', neg: '/*__KI_NEG__*/' };
/* Farbwelten: Grund, Form, Piktogramm, dunkel (für die Wahl des KI-Labels) */
var PH_PAL = {
  navy: ['#001957', '#155784', '#ffffff', 1], blue: ['#155784', '#3875a6', '#ffffff', 1], sky: ['#bee0f5', '#7db5d7', '#001957', 0],
  brown: ['#583720', '#a45f33', '#fbe5c7', 1], sand: ['#fff4e0', '#fbe5c7', '#001957', 0], copper: ['#c47d47', '#a45f33', '#ffffff', 1],
  green: ['#5b7a03', '#759a03', '#ffffff', 1], leaf: ['#f0f8e3', '#c5e878', '#5b7a03', 0], orange: ['#f79506', '#eabe8d', '#001957', 0]
};
/* Formen: Kreis angeschnitten, Viertelkreis, schräges Band, zwei Kreise */
var PH_SHAPE = [
  function (c) { return '<circle cx="250" cy="70" r="120" fill="' + c + '"/>'; },
  function (c) { return '<path d="M0 320V150a170 170 0 0 1 170 170z" fill="' + c + '"/>'; },
  function (c) { return '<path d="M0 230L320 90v120L0 350z" fill="' + c + '"/>'; },
  function (c) { return '<circle cx="60" cy="270" r="90" fill="' + c + '"/><circle cx="285" cy="40" r="55" fill="' + c + '"/>'; }
];
/* [Kennung, Bezeichnung, Glyphe (Unicode im Iconfont), Farbwelt, Form, Suchbegriffe] */
var PH_LIB = [
  ['wissen', 'Wissen teilen', 'E9DA', 'navy', 0, 'buch lernen fachlich schulung wissen lesen'],
  ['gespraech', 'Kundengespräch', 'E95C', 'blue', 1, 'vertrieb beratung gespräch sprechen austausch'],
  ['handschlag', 'Vertrauen', 'E9BB', 'navy', 2, 'vertrieb abschluss kunde handschlag partnerschaft'],
  ['ziel', 'Ziele erreichen', 'E999', 'orange', 3, 'ziel erfolg vertrieb strategie'],
  ['wachstum', 'Wachstum', 'E983', 'green', 0, 'erfolg zahlen kurve entwicklung vertrieb'],
  ['auswertung', 'Auswertung', 'E91E', 'sky', 1, 'zahlen statistik analyse diagramm fachlich'],
  ['kreis', 'Anteile', 'E91D', 'blue', 2, 'zahlen statistik anteil diagramm'],
  ['rechner', 'Tarif berechnen', 'E955', 'sand', 0, 'tarif beitrag rechnen fachlich kalkulation'],
  ['dokument', 'Vertrag', 'E932', 'sky', 3, 'vertrag dokument antrag police fachlich'],
  ['recht', 'Recht und Regeln', 'E951', 'navy', 1, 'recht paragraph compliance regeln idd'],
  ['schutz', 'Absicherung', 'E922', 'navy', 3, 'versicherung schutz sicherheit cyber'],
  ['schirm', 'Rundum geschützt', 'E97F', 'blue', 0, 'versicherung schutz regen schirm'],
  ['haus', 'Wohngebäude', 'E928', 'copper', 2, 'haus wohngebäude hausrat immobilie'],
  ['neubau', 'Neubau', 'E9CA', 'sand', 1, 'haus bauen neubau immobilie'],
  ['auto', 'Kfz', 'E97E', 'navy', 2, 'auto kfz fahrzeug mobilität'],
  ['unfall', 'Unfall', 'E915', 'orange', 0, 'unfall schaden kfz regulierung'],
  ['gesundheit', 'Gesundheit', 'E9C9', 'leaf', 3, 'gesundheit herz krankenversicherung fit'],
  ['arzt', 'Krankenversicherung', 'E988', 'blue', 1, 'gesundheit arzt kranken stethoskop'],
  ['geld', 'Finanzen', 'E920', 'green', 2, 'geld finanzen vorsorge rente sparen'],
  ['bank', 'Bank und Vorsorge', 'E923', 'navy', 0, 'bank vorsorge genossenschaft finanzen'],
  ['betrieb', 'Firmenkunden', 'E9BF', 'blue', 3, 'firma betrieb gewerbe firmenkunden'],
  ['landwirtschaft', 'Landwirtschaft', 'E91C', 'green', 1, 'landwirtschaft traktor agrar'],
  ['team', 'Im Team', 'E9C6', 'orange', 2, 'team gemeinschaft kollegen austausch'],
  ['kalender', 'Termin', 'E9BC', 'sand', 3, 'termin kalender planung organisation'],
  ['zeit', 'Zeitmanagement', 'E942', 'sky', 0, 'zeit wecker morgen organisation'],
  ['telefon', 'Telefonakquise', 'E911', 'navy', 1, 'telefon anruf akquise vertrieb'],
  ['social', 'Social Selling', 'E99E', 'blue', 2, 'social media netzwerk linkedin sichtbarkeit'],
  ['idee', 'Gute Idee', 'E9AF', 'orange', 1, 'idee stern best practice tipp'],
  ['rad', 'Radfahren', 'E912', 'green', 3, 'sport fahrrad rad bewegung'],
  ['tennis', 'Ballsport', 'E90F', 'leaf', 0, 'sport tennis ball spiel'],
  ['wandern', 'Unterwegs', 'E92D', 'brown', 1, 'wandern kompass natur reisen outdoor'],
  ['reise', 'Reisen', 'E913', 'sky', 2, 'reisen flugzeug urlaub fliegen'],
  ['boot', 'Am Wasser', 'E91B', 'blue', 3, 'boot segeln wasser urlaub'],
  ['welt', 'Die Welt entdecken', 'E92E', 'navy', 2, 'reisen welt länder entdecken'],
  ['garten', 'Garten und Natur', 'E91A', 'green', 0, 'garten baum natur pflanzen'],
  ['klee', 'Glück', 'E917', 'leaf', 1, 'garten klee glück natur'],
  ['genuss', 'Genuss', 'E90E', 'brown', 2, 'essen trinken wein genuss trauben'],
  ['kochen', 'Essen und Einkauf', 'E9CD', 'copper', 3, 'essen kochen einkaufen meal prep'],
  ['foto', 'Fotografie', 'E908', 'brown', 0, 'foto kamera fotografie freizeit'],
  ['musik', 'Musik und Podcast', 'E9D1', 'orange', 3, 'musik podcast mikrofon singen'],
  ['hund', 'Mit dem Hund', 'E964', 'sand', 2, 'hund tier haustier'],
  ['katze', 'Katzenfreunde', 'E963', 'copper', 1, 'katze tier haustier'],
  ['pferd', 'Reiten', 'E960', 'brown', 3, 'pferd reiten tier sport'],
  ['familie', 'Familie', 'E92B', 'sky', 1, 'familie kinder eltern'],
  ['baby', 'Nachwuchs', 'E943', 'leaf', 2, 'baby kinderwagen eltern familie'],
  ['ehrenamt', 'Ehrenamt', 'E92A', 'green', 2, 'ehrenamt engagement gemeinschaft helfen'],
  ['abend', 'Feierabend', 'E993', 'navy', 0, 'abend mond feierabend entspannung'],
  ['spass', 'Gute Laune', 'E930', 'orange', 0, 'freizeit spaß lachen gute laune'],
  ['energie', 'Energie', 'E918', 'leaf', 3, 'energie windrad nachhaltigkeit umwelt'],
  ['motorrad', 'Zweirad', 'E925', 'copper', 0, 'motorrad roller zweirad mobilität'],
  ['lesen', 'Lesen', 'E9DA', 'brown', 3, 'lesen buch bücher literatur privat'],
  ['spiele', 'Spieleabend', 'E9BE', 'orange', 1, 'spiele brettspiel darts spieleabend freizeit'],
  ['film', 'Film und Serie', 'E99C', 'navy', 2, 'film serie kino video freizeit'],
  ['handwerk', 'Heimwerken', 'E965', 'copper', 0, 'heimwerken handwerk werkzeug basteln'],
  ['draussen', 'Draußen', 'E945', 'sky', 3, 'wetter draußen natur wolken'],
  ['ausflug', 'Ausflug', 'E95E', 'green', 1, 'ausflug route wandern reisen'],
  ['wohnmobil', 'Mit dem Wohnmobil', 'E9B7', 'leaf', 2, 'camping wohnmobil reisen urlaub'],
  ['reiseziel', 'Reiseziel', 'E9B9', 'orange', 2, 'reisen ziel ort urlaub städtereise'],
  ['video', 'Video und Fotografie', 'E9CB', 'blue', 0, 'video kamera filmen foto'],
  ['sprache', 'Sprachen lernen', 'E9C7', 'sand', 1, 'sprachen lernen sprechen gespräch'],
  ['smartphone', 'Smartphone-Tipps', 'E954', 'navy', 3, 'smartphone handy apps digital'],
  ['digital', 'Digital arbeiten', 'E952', 'blue', 1, 'digital computer fenster online'],
  ['schreiben', 'Schreiben', 'E981', 'sand', 2, 'schreiben stift notizen texte'],
  ['zahn', 'Zahngesundheit', 'E940', 'leaf', 0, 'gesundheit zahn zähne'],
  ['nachhaltig', 'Nachhaltig leben', 'E91A', 'green', 2, 'nachhaltigkeit umwelt natur baum'],
  ['haustiere', 'Haustiere', 'E921', 'copper', 3, 'haustier pfote tier hund katze'],
  ['entspannung', 'Entspannung', 'E993', 'blue', 3, 'entspannung ruhe schlaf mond yoga'],
  ['feiern', 'Gemeinsam feiern', 'E9C6', 'orange', 1, 'feiern gemeinsam team party'],
  ['jubilaeum', 'Jubiläum', 'E9C0', 'navy', 3, 'jubiläum hundert jahre feier'],
  ['sicher', 'Sicher unterwegs', 'E9C8', 'brown', 0, 'sicherheit prävention schutz unterwegs']
];
var PH_BY = {}; PH_LIB.forEach(function (p) { PH_BY[p[0]] = p; });
/* Standardmotiv je Thema, falls weder Bild noch Platzhalter gewählt wurde */
var PH_TOPIC = { 'fachlich': 'wissen', 'vertrieblich': 'gespraech', 'Sport': 'rad', 'Freizeit': 'foto', 'Essen & Trinken': 'genuss', 'Reisen': 'reise', 'Sonstiges': 'idee' };
/* Passendes Motiv zu einem Titel (für Testdaten): erstes Motiv, dessen Suchbegriffe im Titel vorkommen */
function phGuess(title, topic) { var t = title.toLowerCase(), hit = PH_LIB.filter(function (p) { return p[5].split(' ').some(function (w) { return w.length > 3 && t.indexOf(w) >= 0; }); })[0]; return hit ? hit[0] : phFor(topic); }
function phFor(topic) { if (PH_TOPIC[topic]) return PH_TOPIC[topic]; var hsh = 0; for (var i = 0; i < topic.length; i++) hsh = (hsh * 31 + topic.charCodeAt(i)) % 9973; return PH_LIB[hsh % PH_LIB.length][0]; }
function phNode(id, small) {
  var p = PH_BY[id] || PH_LIB[0], pal = PH_PAL[p[3]];
  return h('div', { class: 'ph' + (small ? ' small' : ''), style: 'background:' + pal[0], role: 'img', 'aria-label': 'Platzhalterbild ' + p[1] + ', mit KI gestaltet', html:
    '<svg class="ph-deco" viewBox="0 0 320 320" preserveAspectRatio="xMidYMid slice" aria-hidden="true">' + PH_SHAPE[p[4]](pal[1]) + '</svg>' +
    '<i class="ruv-i" aria-hidden="true" style="color:' + pal[2] + '">&#x' + p[2] + ';</i>' +
    '<img class="ki-label" src="' + (pal[3] ? KI_LABEL.neg : KI_LABEL.pos) + '" alt="KI" title="Mit KI gestaltet">' });
}
function placeholder(topic) { return phNode(phFor(topic)); }
/* Eigene Fotos der Administration (z. B. aus der R+V-Mediendatenbank) */
function photoBy(id) { return PHOTOS.filter(function (f) { return f.id === id; })[0]; }
function photoSrc(f) { return f.url ? f.url : rel('AppData/api.ashx?action=photo&id=' + encodeURIComponent(f.id) + '&v=' + f.ver); }
function phLabel(id) { var f = photoBy(id); return f ? f.name : (PH_BY[id] || PH_LIB[0])[1]; }
function phAny(id, small) { var f = photoBy(id); return f ? h('div', { class: 'ph ph-photo' + (small ? ' small' : '') }, h('img', { class: 'cover', src: photoSrc(f), alt: '', loading: 'lazy' })) : phNode(id, small); }
function cover(e) { if (e.image) return h('img', { class: 'cover', src: rel(e.image), alt: '', loading: 'lazy' }); var f = e.placeholder && photoBy(e.placeholder); if (f) return h('img', { class: 'cover', src: photoSrc(f), alt: '', loading: 'lazy' }); return phNode(e.placeholder && PH_BY[e.placeholder] ? e.placeholder : phFor(e.topic)); }
/* ====================================================== Profilbilder: illustrierte Personen, Figuren, Tiere und R+V-Motive (mit KI gestaltet, daher mit KI-Label) */
var AV_SKIN = ['#f6d5bd', '#e8b48f', '#c98a5a', '#8d5a3b', '#5e3a26'];
var AV_HAIR = { dunkel: '#2b1d16', braun: '#6b4423', rot: '#a45f33', blond: '#e2b765', grau: '#9a9a9a', schwarz: '#141414' };
var AV_BG = ['#bee0f5', '#fff4e0', '#f0f8e3', '#fbe5c7', '#ececec', '#7db5d7', '#c5e878', '#eabe8d'];
var AV_SHIRT = ['#001957', '#155784', '#a45f33', '#5b7a03', '#f79506', '#3875a6', '#583720', '#759a03'];
/* Frisuren: [hinter dem Kopf, über dem Kopf] */
var AV_HAIRSTYLE = {
  kurz: ['', '<path d="M33 43c-1-13 7-22 17-22s18 9 17 22c-4-7-10-10-17-10s-13 3-17 10z"/>'],
  lang: ['<path d="M30 46c0-16 9-25 20-25s20 9 20 25v24H30z"/>', '<path d="M33 42c0-12 8-20 17-20s17 8 17 20c-5-5-11-8-17-8s-12 3-17 8z"/>'],
  zopf: ['<circle cx="50" cy="20" r="8"/>', '<path d="M33 43c-1-13 7-22 17-22s18 9 17 22c-4-7-10-10-17-10s-13 3-17 10z"/>'],
  locken: ['', '<circle cx="36" cy="33" r="7"/><circle cx="44" cy="26" r="7"/><circle cx="54" cy="25" r="7"/><circle cx="63" cy="31" r="7"/><circle cx="67" cy="40" r="5"/><circle cx="33" cy="41" r="5"/>'],
  bob: ['<path d="M31 44c0-14 8-23 19-23s19 9 19 23v12H31z"/>', '<path d="M33 41c1-11 8-18 17-18s16 7 17 18c-6-4-11-6-17-6s-11 2-17 6z"/>'],
  glatze: ['', '']
};
/* [Kennung, Bezeichnung, Haut, Frisur, Haarfarbe, Grund, Shirt, Extras (bart, brille, ohrringe), Suchbegriffe] */
var AV_PEOPLE = [
  ['p-frau-1', 'Frau mit langen Haaren', 0, 'lang', 'braun', 0, 0, '', 'frau person lange haare'],
  ['p-mann-1', 'Mann mit kurzen Haaren', 1, 'kurz', 'dunkel', 1, 1, '', 'mann person kurze haare'],
  ['p-frau-2', 'Frau mit Zopf', 2, 'zopf', 'schwarz', 2, 4, 'ohrringe', 'frau person zopf'],
  ['p-mann-2', 'Mann mit Bart', 0, 'kurz', 'rot', 3, 3, 'bart', 'mann person bart'],
  ['p-frau-3', 'Frau mit Locken', 3, 'locken', 'schwarz', 4, 2, '', 'frau person locken'],
  ['p-mann-3', 'Mann mit Brille', 1, 'kurz', 'grau', 0, 0, 'brille', 'mann person brille grau'],
  ['p-frau-4', 'Frau mit Bob', 1, 'bob', 'blond', 5, 5, 'brille', 'frau person bob brille'],
  ['p-mann-4', 'Mann mit Glatze', 4, 'glatze', 'dunkel', 6, 6, 'bart', 'mann person glatze bart'],
  ['p-frau-5', 'Frau mit blonden Haaren', 0, 'lang', 'blond', 7, 1, 'ohrringe', 'frau person blond'],
  ['p-mann-5', 'Mann mit Locken', 2, 'locken', 'braun', 1, 7, '', 'mann person locken'],
  ['p-frau-6', 'Frau mit grauen Haaren', 1, 'bob', 'grau', 2, 3, 'brille', 'frau person grau'],
  ['p-mann-6', 'Mann mit dunklem Bart', 3, 'kurz', 'schwarz', 5, 4, 'bart', 'mann person bart'],
  ['p-person-1', 'Person mit kurzen Haaren', 4, 'kurz', 'schwarz', 3, 5, 'brille', 'person divers kurze haare'],
  ['p-person-2', 'Person mit Zopf', 2, 'zopf', 'rot', 6, 0, '', 'person divers zopf']
];
function avPersonSvg(a) {
  var skin = AV_SKIN[a[2]], hs = AV_HAIRSTYLE[a[3]], hair = AV_HAIR[a[4]], extra = a[7];
  var o = '<rect width="100" height="100" fill="' + AV_BG[a[5]] + '"/>';
  o += '<g fill="' + hair + '">' + hs[0] + '</g>';
  o += '<path d="M16 100c0-21 15-33 34-33s34 12 34 33z" fill="' + AV_SHIRT[a[6]] + '"/><path d="M43 60h14v10c0 4-3 7-7 7s-7-3-7-7z" fill="' + skin + '"/>';
  o += '<circle cx="50" cy="44" r="17" fill="' + skin + '"/>';
  if (extra.indexOf('bart') >= 0) o += '<path d="M34 46c1 12 8 18 16 18s15-6 16-18c-4 4-9 6-16 6s-12-2-16-6z" fill="' + hair + '"/>';
  o += '<g fill="' + hair + '">' + hs[1] + '</g>';
  o += '<circle cx="44" cy="45" r="1.8" fill="#001957"/><circle cx="56" cy="45" r="1.8" fill="#001957"/><path d="M45 53q5 4 10 0" fill="none" stroke="#001957" stroke-width="1.6" stroke-linecap="round"/>';
  if (extra.indexOf('brille') >= 0) o += '<g fill="none" stroke="#001957" stroke-width="1.6"><circle cx="44" cy="45" r="5"/><circle cx="56" cy="45" r="5"/><path d="M49 45h2"/></g>';
  if (extra.indexOf('ohrringe') >= 0) o += '<circle cx="33" cy="50" r="2" fill="#f79506"/><circle cx="67" cy="50" r="2" fill="#f79506"/>';
  return o;
}
/* Tiere, Figuren und R+V-Motive als Piktogramm auf farbigem Grund: [Kennung, Bezeichnung, Glyphe, Grund, Farbe, Suchbegriffe] */
var AV_ICONS = [
  ['t-hund', 'Hund', 'E964', '#fbe5c7', '#583720', 'tier hund'], ['t-katze', 'Katze', 'E963', '#ececec', '#001957', 'tier katze'], ['t-pferd', 'Pferd', 'E960', '#eabe8d', '#583720', 'tier pferd'],
  ['t-hase', 'Hase', 'E961', '#f0f8e3', '#5b7a03', 'tier hase'], ['t-schwein', 'Glücksschwein', 'E962', '#fff4e0', '#a45f33', 'tier schwein glück'], ['t-pfote', 'Pfote', 'E921', '#bee0f5', '#155784', 'tier pfote haustier'],
  ['t-hirsch', 'Hirsch', 'E99F', '#c5e878', '#5b7a03', 'tier hirsch geweih natur'],
  ['f-smiley', 'Gute Laune', 'E930', '#f79506', '#001957', 'figur smiley lachen'], ['f-person', 'Silhouette', 'E92C', '#001957', '#ffffff', 'figur person silhouette'], ['f-team', 'Teamplayer', 'E92A', '#155784', '#ffffff', 'figur team gemeinschaft'],
  ['f-held', 'Superheld', 'E9C8', '#a45f33', '#fff4e0', 'figur held schutz prävention'],
  ['m-schirm', 'Schirm', 'E97F', '#001957', '#f79506', 'r+v motiv schirm schutz versicherung'], ['m-schutz', 'Schutzschild', 'E922', '#155784', '#ffffff', 'r+v motiv schutz sicherheit'],
  ['m-haus', 'Zuhause', 'E928', '#fff4e0', '#001957', 'r+v motiv haus wohnen'], ['m-klee', 'Kleeblatt', 'E917', '#f0f8e3', '#5b7a03', 'r+v motiv glück klee'],
  ['m-hand', 'Handschlag', 'E9BB', '#001957', '#ffffff', 'r+v motiv vertrauen partnerschaft'], ['m-herz', 'Gesundheit', 'E9C9', '#fbe5c7', '#a45f33', 'r+v motiv herz gesundheit'],
  ['m-auto', 'Auto', 'E97E', '#bee0f5', '#001957', 'r+v motiv auto kfz'], ['m-stern', 'Stern', 'E9AF', '#001957', '#f79506', 'r+v motiv stern'],
  ['m-100', '100 Jahre', 'E9C0', '#f79506', '#001957', 'r+v motiv jubiläum hundert'], ['m-kompass', 'Kompass', 'E92D', '#583720', '#fbe5c7', 'r+v motiv kompass orientierung']
];
var AV_BY = {}; AV_PEOPLE.forEach(function (a) { AV_BY[a[0]] = { kind: 'p', a: a, name: a[1], kw: a[8] }; }); AV_ICONS.forEach(function (a) { AV_BY[a[0]] = { kind: 'i', a: a, name: a[1], kw: a[5] }; });
/* Profilbild als Kreis; uploaded: { kind: 'upload', url }, Platzhalter: { kind: 'ph', id } */
function avatarNode(av, size, alt) {
  var box = h('span', { class: 'av', style: 'width:' + size + 'px;height:' + size + 'px' });
  if (av && av.kind === 'upload' && av.url) { box.appendChild(h('img', { class: 'av-img', src: rel(av.url), alt: alt || 'Profilbild' })); return box; }
  var d = av && AV_BY[av.id];
  if (!d) { box.classList.add('av-empty'); box.appendChild(h('span', { class: 'ruv-i', 'aria-hidden': 'true', html: '&#xE92C;' })); if (alt) box.setAttribute('aria-label', alt); return box; }
  if (d.kind === 'p') box.appendChild(h('span', { class: 'av-svg', role: 'img', 'aria-label': (alt ? alt + ': ' : '') + d.name, html: '<svg viewBox="0 0 100 100" aria-hidden="true">' + avPersonSvg(d.a) + '</svg>' }));
  else box.appendChild(h('span', { class: 'av-ico', role: 'img', 'aria-label': (alt ? alt + ': ' : '') + d.name, style: 'background:' + d.a[3] + ';color:' + d.a[4], html: '<i class="ruv-i" aria-hidden="true">&#x' + d.a[2] + ';</i>' }));
  box.appendChild(h('img', { class: 'av-ki', src: KI_LABEL.pos, alt: 'KI', title: 'Mit KI gestaltet' }));
  return box;
}
function openAvatarPicker(current, onPick) {
  var q = h('input', { type: 'search', id: 'av-q', placeholder: 'Suchen, z. B. Frau, Mann, Tier oder Schirm', 'aria-label': 'Profilbilder durchsuchen' });
  var host = h('div'), count = h('span', { class: 'hint', 'aria-live': 'polite' });
  var body = h('div', { class: 'modal-body' }, [h('h2', { text: 'Profilbild auswählen', style: 'padding-right:44px' }), h('p', { class: 'hint', text: 'Illustrierte Personen, Figuren, Tiere und R+V-Motive. Sie sind mit KI gestaltet und tragen deshalb das KI-Label.' }), q, count, host]);
  var m = openModal(body, { wide: true, label: 'Profilbild auswählen' });
  function group(title, ids) {
    if (!ids.length) return null;
    return h('div', { class: 'av-group' }, [h('h3', { text: title }), h('div', { class: 'av-grid', role: 'listbox', 'aria-label': title }, ids.map(function (id) {
      return h('button', { type: 'button', class: 'av-opt', role: 'option', 'aria-selected': String(id === current), title: AV_BY[id].name, onclick: function () { onPick(id); m.close(); } }, [avatarNode({ kind: 'ph', id: id }, 84), h('span', { text: AV_BY[id].name })]);
    }))]);
  }
  function render() {
    clear(host); var t = q.value.trim().toLowerCase();
    function hit(id) { return !t || (AV_BY[id].name + ' ' + AV_BY[id].kw).toLowerCase().indexOf(t) >= 0; }
    var pe = AV_PEOPLE.map(function (a) { return a[0]; }).filter(hit), ti = AV_ICONS.filter(function (a) { return a[0][0] === 't'; }).map(function (a) { return a[0]; }).filter(hit);
    var fi = AV_ICONS.filter(function (a) { return a[0][0] === 'f'; }).map(function (a) { return a[0]; }).filter(hit), mo = AV_ICONS.filter(function (a) { return a[0][0] === 'm'; }).map(function (a) { return a[0]; }).filter(hit);
    var n = pe.length + ti.length + fi.length + mo.length; count.textContent = n + (n === 1 ? ' Bild' : ' Bilder');
    [group('Personen', pe), group('Figuren', fi), group('Tiere', ti), group('R+V-Motive', mo)].forEach(function (g) { if (g) host.appendChild(g); });
    if (!n) host.appendChild(h('p', { class: 'hint', text: 'Nichts gefunden. Probiere einen anderen Begriff.' }));
  }
  q.addEventListener('input', render); render();
}
/* Auswahl eines Platzhalterbildes mit Suche */
function openPhPicker(current, onPick) {
  var q = h('input', { type: 'search', id: 'ph-q', placeholder: 'Motiv suchen, z. B. Reisen, Vertrieb oder Sport', 'aria-label': 'Platzhalterbilder durchsuchen' });
  var grid = h('div', { class: 'ph-grid', role: 'listbox', 'aria-label': 'Platzhalterbilder' }), count = h('span', { class: 'hint', 'aria-live': 'polite' });
  var body = h('div', { class: 'modal-body' }, [h('h2', { text: 'Platzhalterbild wählen', style: 'padding-right:44px' }), h('p', { class: 'hint', text: 'Fotos stellt die Administration bereit. Die Illustrationen folgen der R+V-Bildwelt. Sie sind mit KI gestaltet und tragen deshalb das KI-Label.' }), q, count, grid]);
  var m = openModal(body, { wide: true, label: 'Platzhalterbild wählen' });
  function opt(id, label, node) { return h('button', { type: 'button', class: 'ph-opt', role: 'option', 'aria-selected': String(id === current), title: label, onclick: function () { onPick(id); m.close(); } }, [h('span', { class: 'ph-box' }, node), h('span', { class: 'ph-name', text: label })]); }
  function render() {
    clear(grid); var t = q.value.trim().toLowerCase(), n = 0;
    var fotos = PHOTOS.filter(function (f) { return !t || (f.name + ' ' + (f.keywords || '')).toLowerCase().indexOf(t) >= 0; });
    var ills = PH_LIB.filter(function (p) { return !t || (p[1] + ' ' + p[5]).toLowerCase().indexOf(t) >= 0; });
    if (fotos.length) { grid.appendChild(h('h3', { class: 'ph-head', text: 'Fotos' })); fotos.forEach(function (f) { grid.appendChild(opt(f.id, f.name, phAny(f.id, true))); }); }
    if (ills.length) { if (fotos.length) grid.appendChild(h('h3', { class: 'ph-head', text: 'Illustrationen' })); ills.forEach(function (p) { grid.appendChild(opt(p[0], p[1], phNode(p[0], true))); }); }
    n = fotos.length + ills.length;
    count.textContent = n + (n === 1 ? ' Motiv' : ' Motive');
    if (!n) grid.appendChild(h('p', { class: 'hint', text: 'Kein Motiv gefunden. Probiere einen anderen Begriff.' }));
  }
  q.addEventListener('input', render); render();
}

/* ====================================================== Abzeichen, Anmeldestatus, Bewertungssterne */
/* Stufen 1 bis 6: Bronze, Silber, Gold (Medaillen), Stern, Krone, Diamant. Die Rakete steht fuer den Expertenstatus in einem Thema. */
var BADGE_NAMES = ['Bronzene Medaille', 'Silberne Medaille', 'Goldene Medaille', 'Stern', 'Krone', 'Diamant'];
/* Versteckte Stufe 7: Learnicorn, das Einhorn unter den LearnMakern (nach dem Unicorn, einem Start-up mit 1 Milliarde Wert).
   Erscheint nirgends als Ziel, nur bei Personen, die sie erreicht haben, und in der Administration. */
var SECRET_NAME = 'Learnicorn', SECRET_MIN = 500;
/* Flache, runde Störer im R+V-Stil: farbige Scheibe mit weißem Rand, Piktogramm zweifarbig, keine Verläufe */
function discSvg(bg, inner) { return '<circle cx="12" cy="12" r="11" fill="' + bg + '" stroke="#ffffff" stroke-width="1.4"/>' + inner; }
function medalIn(c) { return '<path d="M8.6 4.6h2.6l1.3 4.1-2.4.8zM15.4 4.6h-2.6l-1.3 4.1 2.4.8z" fill="' + c + '" opacity=".75"/><circle cx="12" cy="13.6" r="4.6" fill="' + c + '"/>'; }
var STAR_P = '<path d="M12 5.4l2 4.1 4.5.6-3.3 3.1.8 4.5L12 15.5l-4 2.2.8-4.5-3.3-3.1 4.5-.6z"';
var BADGE_SVG = [
  discSvg('#c47d47', medalIn('#ffffff')), discSvg('#888888', medalIn('#ffffff')), discSvg('#f79506', medalIn('#001957')),
  discSvg('#155784', STAR_P + ' fill="#f79506"/>'),
  discSvg('#583720', '<path d="M6.6 15.6l-.8-6.6 3.3 2.5L12 6.6l2.9 4.9 3.3-2.5-.8 6.6z" fill="#f79506"/><rect x="6.6" y="16.4" width="10.8" height="1.8" fill="#f79506"/>'),
  discSvg('#001957', '<path d="M8.4 7h7.2l2.8 3.8L12 18.2l-6.4-7.4z" fill="#ffffff"/><path d="M5.6 10.8h12.8M10.2 7L9 10.8l3 7.4 3-7.4L13.8 7" fill="none" stroke="#001957" stroke-width=".9" stroke-linejoin="round"/>')
];
/* Learnicorn: Einhornkopf mit orangem Horn und oranger Mähne auf dunkelblauer Scheibe mit orangem Rand */
var UNICORN_SVG = '<circle cx="12" cy="12" r="11" fill="#001957" stroke="#f79506" stroke-width="1.4"/>' +
  '<path d="M12.9 7.4c1.7-.6 3.5 0 4.4 1.3 1.1.2 1.8 1.3 1.6 2.4.9.7 1 2 .4 2.9.5 1 .2 2.2-.6 2.9l-.7 2.3h-1.7c.8-1.9 1.3-4 1.2-6.1-.1-2.6-1.4-4.6-3.2-5.5z" fill="#f79506"/>' +
  '<path d="M9 19.2l.5-4.5c-1.3-.2-2.6-.7-3.3-1.4-.7-.7-.5-1.7.3-2.1l3.5-2.3c.5-.3 1-.6 1.6-.7l.7-1.8 1 1.6c2.2.5 3.6 2.4 3.6 4.8 0 2.4-.6 4.6-1.4 6.4z" fill="#ffffff"/>' +
  '<path d="M10.3 9l-3-5.4 4.4 4.4z" fill="#f79506"/><path d="M8.6 6.1l1.1-.4M9.4 7.3l1.1-.5" stroke="#001957" stroke-width=".5"/>' +
  '<circle cx="10.4" cy="11.2" r=".75" fill="#001957"/><circle cx="6.8" cy="12.6" r=".35" fill="#001957"/>';
var ROCKET_SVG = discSvg('#001957', '<path d="M12 4.6c2.1 1.5 3.1 3.8 3.1 6.1 0 1.2-.3 2.3-.8 3.3H9.7c-.5-1-.8-2.1-.8-3.3 0-2.3 1-4.6 3.1-6.1z" fill="#ffffff"/><circle cx="12" cy="9.9" r="1.3" fill="#001957"/><path d="M9.5 11.9l-1.9 2.2.5 1.9 2-1.3zM14.5 11.9l1.9 2.2-.5 1.9-2-1.3z" fill="#ffffff"/><path d="M10.7 14.8h2.6L12 18.6z" fill="#f79506"/>');
function badgeLabel(level) { return level === 7 ? SECRET_NAME + ': das Einhorn unter den LearnMakern' : level >= 1 && level <= 6 ? 'Stufe ' + level + ': ' + BADGE_NAMES[level - 1] : ''; }
function badgeNode(level, big) {
  if (!level || level < 1 || level > 7) return null;
  return h('span', { class: 'bdg' + (big ? ' big' : '') + (level === 7 ? ' unicorn' : ''), role: 'img', 'aria-label': badgeLabel(level), title: badgeLabel(level), html: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">' + (level === 7 ? UNICORN_SVG : BADGE_SVG[level - 1]) + '</svg>' });
}
function rocketNode(big) { return h('span', { class: 'bdg rocket' + (big ? ' big' : ''), role: 'img', 'aria-label': 'Expertenstatus im Thema', title: 'Expertenstatus im Thema', html: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">' + ROCKET_SVG + '</svg>' }); }
/* Benutzername mit Abzeichen (Stufe) und optional der Rakete fuer Experten */
function userTag(name, level, expert, cls, pub) {
  var nm = pub ? h('button', { type: 'button', class: 'utag-n ulink', text: name, title: 'Profil von ' + name + ' ansehen', onclick: function (ev) { ev.stopPropagation(); openPublicProfile(name); }, onkeydown: function (ev) { if (ev.key === 'Enter' || ev.key === ' ') ev.stopPropagation(); } }) : h('span', { class: 'utag-n', text: name, title: name });
  return h('span', { class: 'utag' + (cls ? ' ' + cls : '') }, [nm, badgeNode(level), expert ? rocketNode() : null]);
}
/* Oeffentliches Profil als Popup: zeigt nur, was die Person freigegeben hat */
function openPublicProfile(username) {
  var body = h('div', { class: 'modal-body pubprof' }, loading()), m = openModal(body, { wide: true, label: 'Profil von ' + username }); m.node.classList.add('pwide');
  Api.publicProfile(username).then(function (r) {
    var p = r.profile; clear(body);
    body.appendChild(h('div', { class: 'prof-name' }, [p.avatar ? avatarNode(p.avatar, 88, 'Profilbild von ' + p.username) : null, h('h2', { text: p.username, style: 'margin:0;overflow-wrap:anywhere' }), badgeNode(p.level, true), (p.experts && p.experts.length) ? rocketNode(true) : null]));
    if (p.level) body.appendChild(h('div', { class: 'hint', text: badgeLabel(p.level) }));
    if (p.bio) body.appendChild(h('p', { class: 'bio', text: p.bio }));
    var facts = [h('div', null, [h('dt', { text: 'Angebotene Veranstaltungen' }), h('dd', { text: String(p.offered) })])];
    if (p.ratingCount != null) facts.push(h('div', null, [h('dt', { text: 'Gesamtbewertung' }), h('dd', null, ratingNode(p.ratingAvg, p.ratingCount))]));
    if (p.email) facts.push(h('div', null, [h('dt', { text: 'Kontakt' }), h('dd', null, h('a', { href: 'mailto:' + p.email, text: p.email }))]));
    body.appendChild(h('dl', { class: 'facts f3' }, facts));
    var exp = {}; (p.experts || []).forEach(function (x) { exp[x.category + '|' + x.topic] = 1; });
    body.appendChild(h('h3', { text: 'Themen', style: 'margin:8px 0 0' }));
    if (!p.topics.length) body.appendChild(h('p', { class: 'hint', text: 'Noch keine durchgeführte Veranstaltung.' }));
    else {
      ['dienstlich', 'privat'].forEach(function (c) {
        var l = p.topics.filter(function (t) { return t.category === c; }).sort(function (a, b) { return b.count - a.count; });
        if (!l.length) return;
        body.appendChild(h('div', null, [h('b', { text: CAT_LABEL[c] }), h('div', { class: 'plist', style: 'margin-top:6px' }, l.map(function (t) { return h('span', { class: 'utag chipu' }, [capFirst(t.topic) + ': ' + t.count, exp[c + '|' + t.topic] ? rocketNode() : null]); }))]));
      });
    }
    if (p.experts) body.appendChild(h('p', { class: 'hint', text: p.experts.length ? 'Expertenstatus in: ' + p.experts.map(function (x) { return capFirst(x.topic); }).join(', ') : 'Noch kein Expertenstatus.' }));
    if (p.upcoming) {
      body.appendChild(h('h3', { text: 'Anstehende Veranstaltungen', style: 'margin:8px 0 0' }));
      if (!p.upcoming.length) body.appendChild(h('p', { class: 'hint', text: 'Zurzeit sind keine Veranstaltungen geplant.' }));
      else {
        var tb = h('tbody');
        p.upcoming.sort(function (a, b) { return startDate(a) - startDate(b); }).forEach(function (e) {
          var cell = h('td', { class: 'r' });
          function paint() {
            clear(cell);
            if (e.own) return;
            if (e.mine) cell.appendChild(chipEl('mine', 'Du bist angemeldet'));
            else if (e.booked >= e.capacity) cell.appendChild(chipEl('full', 'Ausgebucht'));
            else cell.appendChild(h('button', { type: 'button', class: 'btn btn-primary btn-sm', text: 'Buchen', onclick: function (ev) {
              if (!state.me) { m.close(); goLogin(); return; }
              ev.currentTarget.disabled = true;
              Api.book(e.id).then(function () { e.mine = true; e.booked++; toast('Du bist angemeldet. Alles Weitere findest Du unter „Meine Anmeldungen“.'); paint(); refreshMe(); }, function (er) { if (authFail(er)) { m.close(); return; } toast(er.message, true); paint(); });
            } }));
          }
          paint();
          tb.appendChild(h('tr', null, [h('td', { text: CAT_LABEL[e.category] }), h('td', { class: 'pp-title' }, h('b', { text: e.title })), h('td', { text: capFirst(e.topic) }), h('td', { text: e.type }), h('td', { class: 'pp-when' }, [h('b', { text: dateFull(e.date) }), h('div', { class: 'hint', text: e.start + '\u2013' + endHm(e) + ' Uhr' })]), cell]));
        });
        body.appendChild(h('div', { class: 'tbl-wrap' }, h('table', { class: 'tbl pp-tbl', style: 'min-width:0' }, [h('thead', null, h('tr', null, ['Bereich', 'Titel', 'Thema', 'Art', 'Termin', ''].map(function (t) { return h('th', { text: t }); }))), tb])));
      }
    }
    body.appendChild(h('div', null, h('button', { type: 'button', class: 'btn btn-secondary', text: 'Schließen', onclick: m.close })));
  }, function (er) { clear(body); body.appendChild(h('div', { class: 'notice bad', role: 'alert', text: er.message })); body.appendChild(h('div', { style: 'margin-top:12px' }, h('button', { type: 'button', class: 'btn btn-secondary', text: 'Schließen', onclick: m.close }))); });
}
function starsText(avg) { var n = Math.round(avg); return new Array(n + 1).join('★') + new Array(6 - n).join('☆'); }
function fmtAvg(avg) { return String(Math.round(avg * 10) / 10).replace('.', ','); }
/* Anzeige einer Bewertung: Sterne und Zahl, ohne Bewertung ein Strich */
/* Bewertung anzeigen: Durchschnitt erst ab MIN_RATINGS, damit niemand auf einzelne Stimmen schliessen kann */
function ratingNode(avg, count, single) {
  if (!count) return h('span', { class: 'hint', text: 'noch keine Bewertung' });
  if (!single && count < MIN_RATINGS) return h('span', { class: 'hint', title: 'Der Durchschnitt erscheint ab ' + MIN_RATINGS + ' Bewertungen. So bleibt jede Bewertung anonym.', text: count + (count === 1 ? ' Bewertung' : ' Bewertungen') + ', Ø ab ' + MIN_RATINGS });
  return h('span', { class: 'rating', title: fmtAvg(avg) + ' von 5 Sternen' + (count > 1 ? ' bei ' + count + ' Bewertungen' : '') }, [h('span', { class: 'stars', 'aria-hidden': 'true', text: starsText(avg) }), h('span', { class: 'sr', text: fmtAvg(avg) + ' von 5 Sternen' }), ' ' + fmtAvg(avg) + (count > 1 ? ' (' + count + ')' : '')]);
}
/* Sterne zum Anklicken: 1 bis 5, danach bestaetigen */
function starPicker(onChoose) {
  var val = 0, box = h('div', { class: 'starpick', role: 'radiogroup', 'aria-label': 'Bewertung von 1 bis 5 Sternen' }), btns = [];
  var go = h('button', { type: 'button', class: 'btn btn-primary btn-sm', text: 'Bewertung abgeben', disabled: true });
  function paint() { btns.forEach(function (b, i) { b.textContent = i < val ? '★' : '☆'; b.setAttribute('aria-checked', String(i + 1 === val)); }); go.disabled = !val; }
  for (var i = 1; i <= 5; i++) (function (n) { var b = h('button', { type: 'button', role: 'radio', 'aria-label': n + (n === 1 ? ' Stern' : ' Sterne'), 'aria-checked': 'false', onclick: function () { val = n; paint(); } }); btns.push(b); box.appendChild(b); })(i);
  paint();
  go.addEventListener('click', function () { if (!val) return; if (!go._c) { go._c = true; go.textContent = 'Endgültig abgeben?'; setTimeout(function () { go._c = false; go.textContent = 'Bewertung abgeben'; }, 4000); return; } go.disabled = true; onChoose(val, function () { go.disabled = false; }); });
  return h('div', { class: 'ratebox' }, [box, go, h('span', { class: 'hint', text: 'Eine abgegebene Bewertung lässt sich nicht mehr ändern.' })]);
}

/* Angemeldeter Benutzer */
var state = { settings: { appTitle: DEFAULT_TITLE }, events: [], me: null };
function isAdmin() { return !!state.me && (state.me.role === 'admin' || state.me.role === 'superadmin'); }
function goLogin() { var cur = (location.hash || '#/').slice(1); if (/^\/(anmelden|registrieren)/.test(cur)) cur = '/'; location.hash = '#/anmelden?next=' + encodeURIComponent(cur); }
function setMe(me) { state.me = me || null; renderNav(); if (state.me) startNotifyPoll(); }
function refreshMe() { return Api.me().then(function (j) { setMe(j.me); return j.me; }, function () { setMe(null); return null; }); }
/* Fehler, die eine Anmeldung verlangen: Sitzung abgelaufen oder Konto gesperrt */
function authFail(er) {
  if (er && (er.code === 'auth')) { setMe(null); goLogin(); return true; }
  /* Vorlaeufiges Passwort: der Server erlaubt bis zur Aenderung nur das Profil */
  if (er && er.code === 'mustChange') { toast(er.message, true); if (!/^#\/profil/.test(location.hash)) location.hash = '#/profil'; return true; }
  return false;
}

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
  tb('ul', 'Aufzählung', ico('list'), function () { exec('insertUnorderedList'); }, 'insertUnorderedList');
  tb('ol', 'Nummerierte Liste', ico('olist'), function () { exec('insertOrderedList'); }, 'insertOrderedList');
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
  tb('link', 'Link einfügen', ico('link'), function () { var s = window.getSelection(); if (s.rangeCount && area.contains(s.anchorNode)) saved = s.getRangeAt(0).cloneRange(); else saved = null; linkRow.hidden = !linkRow.hidden; if (!linkRow.hidden) linkIn.focus(); });
  tb('unlink', 'Link entfernen', ico('link') + '<span style="position:absolute;font-size:22px;line-height:1;transform:translateY(-1px)">\u2215</span>', function () { exec('unlink'); }).style.position = 'relative';
  tb('clear', 'Formatierung entfernen', 'T<small style="font-size:.6em">x</small>', function () { exec('removeFormat'); exec('formatBlock', 'p'); });
  sep();
  tb('undo', 'Rückgängig', ico('undo'), function () { exec('undo'); });
  tb('redo', 'Wiederholen', ico('redo'), function () { exec('redo'); });
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
function openCropper(img, onDone, opt) {
  opt = opt || {};
  var SIZE = 360, box = h('div', { class: 'crop-box' + (opt.round ? ' round' : '') }), cv = h('canvas', { width: SIZE * 2, height: SIZE * 2, role: 'img', 'aria-label': 'Bildausschnitt. Mit der Maus oder dem Finger verschieben.' });
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
  var content = h('div', { class: 'modal-body' }, [h('h2', { text: 'Bild zuschneiden' }), h('p', { class: 'hint', text: opt.round ? 'Ziehe das Bild, um den Ausschnitt zu wählen, und nutze den Regler zum Zoomen. Das Profilbild wird quadratisch gespeichert und als Kreis angezeigt.' : 'Ziehe das Bild, um den Ausschnitt zu wählen, und nutze den Regler zum Zoomen. Das Bild wird quadratisch gespeichert.' }),
    h('div', { class: 'crop' }, [box, h('div', { class: 'zoomrow' }, [h('button', { type: 'button', class: 'btn btn-secondary btn-sm', 'aria-label': 'Verkleinern', html: ico('minus'), onclick: function () { setZoom(Number(zoom.value) - .2); } }), zoom, h('button', { type: 'button', class: 'btn btn-secondary btn-sm', 'aria-label': 'Vergrößern', html: ico('plus'), onclick: function () { setZoom(Number(zoom.value) + .2); } })])]),
    h('div', { style: 'display:flex;gap:12px;justify-content:flex-end;flex-wrap:wrap' }, [cancel, done])]);
  var m = openModal(content, { label: 'Bild zuschneiden' });
  cancel.addEventListener('click', m.close);
  done.addEventListener('click', function () { var out = opt.size || 640, o = document.createElement('canvas'); o.width = o.height = out; draw(o.getContext('2d'), out); onDone(o.toDataURL('image/jpeg', .86)); m.close(); });
  render();
}

/* ====================================================== Veranstaltungsformular */
function weekdayOptions(selected, admin) {
  var out = [], d = new Date(); d.setHours(0, 0, 0, 0); var end = new Date(d); end.setDate(end.getDate() + 7 * 16);
  while (d <= end) { if (isWeekday(d)) out.push(ymd(d)); d.setDate(d.getDate() + 1); }
  if (selected && out.indexOf(selected) < 0) { out.push(selected); out.sort(); }
  return out;
}
/* Agenda-Editor (Popup): Inhaltsbloecke mit Inhalten, Dauer und IDD-Bildungszeit; anpassen, loeschen, hinzufuegen, verschieben.
   Begruessung und Verabschiedung sind fest und zaehlen nicht zur Lernzeit. */
function openAgendaEditor(o, onApply) {
  var f = IDD.frame || 5, room = o.duration - 2 * f, list = (o.agenda || []).map(function (b) { return { content: b.content, minutes: b.minutes, iddMinutes: b.iddMinutes }; });
  if (!list.length) list = [{ content: '', minutes: room, iddMinutes: room }];
  var body = h('div', { class: 'modal-body' }), host = h('div', { class: 'ag-edit' }), foot = h('div', { class: 'ag-foot', 'aria-live': 'polite' }), msg = h('div', { class: 'notice bad', role: 'alert', hidden: true }), m;
  function opts(max, val, from) { var a = []; for (var x = from; x <= max; x += 5) a.push(h('option', { value: String(x), text: x + ' Min.', selected: x === val })); return a; }
  function hm(min) { return o.start ? minToHm(min) : ''; }
  function draw() {
    clear(host); var t = o.start ? toMin(o.start) + f : 0, sm = 0, si = 0;
    host.appendChild(h('div', { class: 'ag-row fixed' }, [h('span', { class: 'ag-t', text: o.start ? hm(t - f) + '–' + hm(t) : f + ' Min.' }), h('b', { text: IDD.welcome.title || 'Begrüßung' }), h('span', { class: 'hint', text: f + ' Min. · keine Lernzeit' })]));
    list.forEach(function (b, i) {
      var c = h('input', { type: 'text', class: 'ag-c', maxlength: '200', value: b.content, placeholder: 'Inhalte, z. B. Leistungsfall in der BU', 'aria-label': 'Inhalte, Eintrag ' + (i + 1) });
      c.addEventListener('input', function () { b.content = c.value; });
      var mi = h('select', { class: 'ag-m', 'aria-label': 'Dauer, Eintrag ' + (i + 1) }, opts(Math.max(room, b.minutes), b.minutes, 5));
      mi.addEventListener('change', function () { b.minutes = Number(mi.value); if (b.iddMinutes > b.minutes) b.iddMinutes = b.minutes; draw(); });
      var ii = h('select', { class: 'ag-i', 'aria-label': 'IDD-Bildungszeit, Eintrag ' + (i + 1) }, opts(b.minutes, b.iddMinutes, 0));
      ii.addEventListener('change', function () { b.iddMinutes = Number(ii.value); draw(); });
      function mv(d) { var j = i + d; if (j < 0 || j >= list.length) return; var x = list[i]; list[i] = list[j]; list[j] = x; draw(); var nx = $$('.ag-c', host)[j]; if (nx) nx.focus(); }
      var up = h('button', { type: 'button', class: 'btn btn-secondary btn-sm', text: '↑', title: 'Nach oben', 'aria-label': 'Eintrag ' + (i + 1) + ' nach oben', disabled: i === 0, onclick: function () { mv(-1); } });
      var dn = h('button', { type: 'button', class: 'btn btn-secondary btn-sm', text: '↓', title: 'Nach unten', 'aria-label': 'Eintrag ' + (i + 1) + ' nach unten', disabled: i === list.length - 1, onclick: function () { mv(1); } });
      var del = h('button', { type: 'button', class: 'btn btn-danger btn-sm', text: 'Löschen', 'aria-label': 'Eintrag ' + (i + 1) + ' löschen', disabled: list.length === 1, onclick: function () { list.splice(i, 1); draw(); } });
      host.appendChild(h('div', { class: 'ag-row' }, [h('span', { class: 'ag-t', text: o.start ? hm(t) + '–' + hm(t + b.minutes) : '' }), h('label', { class: 'ag-l' }, [h('span', { class: 'hint', text: 'Inhalte' }), c]), h('label', { class: 'ag-l' }, [h('span', { class: 'hint', text: 'Dauer' }), mi]), h('label', { class: 'ag-l' }, [h('span', { class: 'hint', text: 'IDD-Bildungszeit' }), ii]), h('div', { class: 'ag-acts' }, [up, dn, del])]));
      t += b.minutes; sm += b.minutes; si += b.iddMinutes;
    });
    host.appendChild(h('div', { class: 'ag-row fixed' }, [h('span', { class: 'ag-t', text: o.start ? hm(t) + '–' + hm(t + f) : f + ' Min.' }), h('b', { text: IDD.farewell.title || 'Verabschiedung' }), h('span', { class: 'hint', text: f + ' Min. · keine Lernzeit' })]));
    clear(foot);
    foot.appendChild(h('span', { class: sm === room ? 'ag-ok' : 'ag-warn', text: 'Verplant: ' + sm + ' von ' + room + ' Minuten' + (sm < room ? ' (es fehlen ' + (room - sm) + ')' : sm > room ? ' (' + (sm - room) + ' zu viel)' : '') }));
    foot.appendChild(h('span', null, [h('b', { text: si + ' Min.' }), ' IDD-Bildungszeit']));
  }
  var add = h('button', { type: 'button', class: 'btn btn-secondary btn-sm', text: 'Eintrag hinzufügen', onclick: function () { if (list.length >= 12) return; var sm = list.reduce(function (a, b) { return a + b.minutes; }, 0), rest = Math.max(5, room - sm); list.push({ content: '', minutes: rest, iddMinutes: rest }); draw(); var cs = $$('.ag-c', host); cs[cs.length - 1].focus(); } });
  var ok = h('button', { type: 'button', class: 'btn btn-primary', text: 'Agenda übernehmen' });
  ok.addEventListener('click', function () {
    var sm = 0, si = 0, bad = '';
    list.forEach(function (b) { sm += b.minutes; si += b.iddMinutes; if (String(b.content || '').trim().length < 3) bad = bad || 'Bitte beschreibe die Inhalte jedes Eintrags mit mindestens 3 Zeichen.'; });
    if (!bad && sm !== room) bad = 'Die Einträge müssen zusammen genau ' + room + ' Minuten dauern. Aktuell sind es ' + sm + ' Minuten.';
    if (!bad && si < 5) bad = 'Mindestens ein Eintrag braucht IDD-Bildungszeit.';
    if (bad) { msg.hidden = false; msg.textContent = bad; return; }
    m.close(); onApply(list.map(function (b) { return { content: String(b.content).replace(/\s+/g, ' ').trim(), minutes: b.minutes, iddMinutes: b.iddMinutes }; }));
  });
  body.appendChild(h('h2', { text: 'Agenda bearbeiten', style: 'padding-right:44px' }));
  body.appendChild(h('p', { class: 'hint', text: 'Plane die Inhalte zwischen Begrüßung und Verabschiedung. Je Eintrag legst Du Dauer und IDD-Bildungszeit fest. Die Bildungszeit kann kürzer sein als die Dauer, etwa bei Pausen oder Fragerunden ohne Fachbezug.' }));
  body.appendChild(host); body.appendChild(foot); body.appendChild(msg);
  body.appendChild(h('div', { style: 'display:flex;gap:12px;flex-wrap:wrap;justify-content:space-between' }, [add, h('div', { style: 'display:flex;gap:12px' }, [h('button', { type: 'button', class: 'btn btn-secondary', text: 'Abbrechen', onclick: function () { m.close(); } }), ok])]));
  draw();
  m = openModal(body, { wide: true, label: 'Agenda bearbeiten' });
}
function buildEventForm(o) {
  o = o || {}; var ev = o.event || {}, admin = !!o.admin;
  var v = { title: ev.title || '', category: ev.category || 'dienstlich', date: ev.date || '', duration: ev.duration || 0, start: ev.start || '', type: ev.type || '', topic: ev.topic || '', capacity: ev.capacity || 10, teamsLink: ev.teamsLink || '', description: ev.description || '', imageData: '', removeImage: false, placeholder: ev.placeholder || '', idd: !!ev.idd, iddTitle: ev.iddTitle || '', iddContent: ev.iddContent || '', iddMinutes: ev.iddMinutes || 0, iddTouched: !!ev.idd };
  var existingImg = ev.image || '', srcImg = null, previewSrc = existingImg;
  var f = {}; // Felder
  var form = h('form', { class: 'form', novalidate: true });

  var title = h('input', { type: 'text', id: 'f-title', maxlength: '100', value: v.title, autocomplete: 'off' });
  f.title = field('Titel der Veranstaltung', title, { id: 'f-title', req: true });

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
  var pickBtn = h('button', { type: 'button', class: 'btn btn-secondary', text: 'Bild hochladen' });
  var phBtn = h('button', { type: 'button', class: 'btn btn-secondary', text: 'Platzhalterbild wählen' }), phName = h('span', { class: 'hint' });
  var recropBtn = h('button', { type: 'button', class: 'btn btn-secondary', text: 'Ausschnitt anpassen', hidden: true });
  var delBtn = h('button', { type: 'button', class: 'btn btn-secondary', text: 'Bild entfernen', hidden: true });
  f.image = field('Bild (optional)', h('div', { class: 'imgpick' }, [prev, h('div', { style: 'display:flex;flex-direction:column;gap:10px;align-items:flex-start' }, [pickBtn, phBtn, recropBtn, delBtn, phName, file])]), { legend: true, hint: 'Das Bild wird quadratisch angezeigt. Beim Hochladen kannst Du Ausschnitt und Zoom anpassen. Ohne eigenes Bild wählst Du ein Platzhalterbild, sonst erscheint das Standardmotiv zum Thema.' });

  function renderPrev() {
    clear(prev);
    if (previewSrc) { prev.appendChild(h('img', { src: previewSrc, alt: 'Vorschau des Veranstaltungsbildes' })); phName.textContent = ''; }
    else { var id = v.placeholder && (PH_BY[v.placeholder] || photoBy(v.placeholder)) ? v.placeholder : phFor(v.topic || ''); prev.appendChild(phAny(id, true)); phName.textContent = (v.placeholder ? 'Platzhalterbild: ' : 'Standardmotiv zum Thema: ') + phLabel(id); }
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
  phBtn.addEventListener('click', function () { openPhPicker(v.placeholder, function (id) { v.placeholder = id; if (previewSrc) { v.imageData = ''; v.removeImage = true; previewSrc = ''; srcImg = null; } renderPrev(); f.image.setErr(''); }); });
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
    startHint.textContent = 'Bei ' + v.duration + ' Minuten kannst Du von ' + parts.join(' sowie von ') + ' starten.';
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
  topicSel.addEventListener('change', function () { v.topic = topicSel.value; f.topic.setErr(''); renderPrev(); });
  title.addEventListener('input', function () { f.title.setErr(''); });
  cap.addEventListener('input', function () { f.capacity.setErr(''); }); link.addEventListener('input', function () { f.teamsLink.setErr(''); });
  rte.area.addEventListener('input', function () { f.description.setErr(''); });

  /* IDD: nur fuer freigeschaltete LearnMaker (oder Administration) und nur dienstlich.
     Agenda: Begruessung und Verabschiedung (fest) und Inhaltsbloecke mit Dauer und IDD-Bildungszeit, im Popup bearbeitbar. */
  v.agenda = (ev.agenda && ev.agenda.length ? ev.agenda : []).map(function (b) { return { content: b.content, minutes: Number(b.minutes), iddMinutes: Number(b.iddMinutes) }; });
  var canIdd = iddOn() && (!!ev.idd || admin || isAdmin() || !!(state.me && state.me.iddHost)), iddFs = null, iddSync = function () { };
  if (canIdd) {
    var iddChk = h('input', { type: 'checkbox', id: 'f-idd', checked: v.idd });
    var iddTitleIn = h('input', { type: 'text', id: 'f-iddtitle', maxlength: '150', value: v.iddTitle, autocomplete: 'off', placeholder: 'z. B. Berufsunfähigkeitsversicherung: Bedarfsermittlung und Beratung' });
    f.iddTitle = field('IDD-Titel für die Dokumentation', iddTitleIn, { id: 'f-iddtitle', req: true, hint: 'Sachlicher Titel, der den fachlichen Inhalt nennt. Er steht im IDD-Nachweis der Teilnehmenden.' });
    var iddHints = h('div', { class: 'idd-hints', 'aria-live': 'polite' });
    var iddContentSel = h('select', { id: 'f-iddcontent' }, [h('option', { value: '', text: 'Bitte wählen' })].concat(((IDD.contents && IDD.contents.length) ? IDD.contents : IDD_CONTENTS).map(function (c) { return h('option', { value: c, text: c, selected: c === v.iddContent }); })));
    iddContentSel.addEventListener('change', function () { v.iddContent = iddContentSel.value; f.iddContent.setErr(''); });
    f.iddContent = field('Beschreibung des Lerninhalts', iddContentSel, { id: 'f-iddcontent', req: true, hint: 'Kategorie wie in der Weiterbildungsdatenbank von gutBeraten. Sie steht im IDD-Nachweis.' });
    var agSum = h('div', { class: 'ag-sum', 'aria-live': 'polite' }), agPrev = h('div'), agBtn = h('button', { type: 'button', class: 'btn btn-secondary', id: 'f-agenda', text: 'Agenda bearbeiten' });
    f.iddMinutes = field('Agenda und IDD-Bildungszeit', h('div', { class: 'ag-field' }, [agSum, agPrev, h('div', null, agBtn)]), { legend: true, req: true, hint: 'Begrüßung und Verabschiedung dauern je ' + (IDD.frame || 5) + ' Minuten und zählen nicht zur Lernzeit. Dazwischen planst Du die Inhalte.' });
    var privNote = h('p', { class: 'hint', text: 'IDD-anrechenbar können nur dienstliche Veranstaltungen sein.' });
    var iddBody = h('div', { class: 'idd-body' }, [f.iddTitle, iddHints, f.iddContent, f.iddMinutes]);
    var showHints = function () { clear(iddHints); var hs = iddTitleHints(iddTitleIn.value); if (hs.length) iddHints.appendChild(h('div', { class: 'notice warn', role: 'status' }, h('div', { class: 'n-body' }, [h('b', { text: 'Hinweis zum IDD-Titel' })].concat(hs.map(function (x) { return h('div', { text: x }); }))))); };
    var room = function () { return (Number(v.duration) || 0) - 2 * (IDD.frame || 5); };
    var defaultAgenda = function () { return [{ content: iddTitleIn.value.trim() || 'Thema der Veranstaltung', minutes: room(), iddMinutes: room(), auto: true }]; };
    iddSync = function () {
      var biz = v.category === 'dienstlich'; iddChk.disabled = !biz; if (!biz) iddChk.checked = false;
      v.idd = biz && iddChk.checked; privNote.hidden = biz; iddBody.hidden = !v.idd;
      var r = room();
      /* Noch nicht angepasste Agenda folgt Dauer und IDD-Titel automatisch */
      if (r >= 5 && (!v.agenda.length || (v.agenda.length === 1 && v.agenda[0].auto))) v.agenda = defaultAgenda();
      var sm = 0, si = 0; v.agenda.forEach(function (b) { sm += b.minutes; si += b.iddMinutes; }); v.iddMinutes = si;
      clear(agSum); clear(agPrev); agBtn.disabled = r < 5;
      if (r < 5) { agSum.appendChild(h('span', { class: 'hint', text: 'Wähle zuerst die Dauer. Danach planst Du die Agenda.' })); return; }
      agSum.appendChild(h('div', { class: 'ag-kpis' }, [h('span', null, [h('b', { text: v.duration + ' Min.' }), ' Dauer']), h('span', null, [h('b', { text: si + ' Min.' }), ' IDD-Bildungszeit']), sm !== r ? h('span', { class: 'ag-warn', text: 'Agenda: ' + sm + ' von ' + r + ' Minuten verplant' }) : null]));
      if (v.start) agPrev.appendChild(agendaNode({ start: v.start, duration: Number(v.duration), agenda: v.agenda, title: '' }));
    };
    agBtn.addEventListener('click', function () { openAgendaEditor({ duration: Number(v.duration), start: v.start, agenda: v.agenda }, function (list) { v.agenda = list; f.iddMinutes.setErr(''); iddSync(); }); });
    iddChk.addEventListener('change', function () { iddSync(); if (iddChk.checked) iddTitleIn.focus(); });
    iddTitleIn.addEventListener('input', function () { v.iddTitle = iddTitleIn.value; f.iddTitle.setErr(''); showHints(); iddSync(); });
    iddFs = h('fieldset', { class: 'fs' }, [h('legend', { text: 'IDD-Weiterbildung' }), h('label', { class: 'chk' }, [iddChk, h('span', null, [h('b', { text: 'IDD-anrechenbare Veranstaltung' }), h('span', { class: 'hint', text: 'Nach Deiner Bestätigung der Teilnahme erhalten die Teilnehmenden die IDD-Bildungszeit angerechnet.' })])]), privNote, iddBody]);
    showHints();
  }
  function collect() { v.title = title.value; v.capacity = Number(cap.value); v.teamsLink = link.value; v.description = rte.getHTML(); if (!canIdd) v.idd = false; return v; }
  function validate() {
    collect(); var er = validateEvent(v, admin), first = null;
    Object.keys(f).forEach(function (k) { f[k].setErr(er[k] || ''); if (er[k] && !first) first = f[k]; });
    if (first) { first.scrollIntoView({ block: 'center', behavior: 'smooth' }); var c = $('input,select,[contenteditable]', first); if (c) c.focus({ preventScroll: true }); }
    return !first;
  }
  var submit = h('button', { type: 'submit', class: 'btn btn-primary', text: o.submitLabel || 'Veranstaltung anbieten' });
  var extra = o.extraButtons || [];
  var box = h('div', { class: 'notice bad', role: 'alert', hidden: true });
  /* Reihenfolge: Worum geht es? › Wann? › Was wird angeboten? › IDD (braucht die Dauer) › Teilnahme und Teams-Link */
  form.appendChild(h('fieldset', { class: 'fs' }, [h('legend', { text: 'Worum geht es?' }), f.title, h('div', { class: 'grid2' }, [h('div', { class: 'stack' }, [f.category, f.topic, f.type]), h('div')])]));
  form.appendChild(h('fieldset', { class: 'fs' }, [h('legend', { text: 'Wann findet es statt?' }), h('div', { class: 'notice info' }, 'Veranstaltungen finden nur montags bis freitags statt, entweder morgens von 06:00 bis 09:00 Uhr oder nachmittags von 17:00 bis 20:00 Uhr. Die Veranstaltung muss innerhalb des Zeitfensters beendet sein.'), h('div', { class: 'grid3' }, [f.date, f.duration, f.start])]));
  form.appendChild(h('fieldset', { class: 'fs' }, [h('legend', { text: 'Was wird angeboten?' }), f.description, f.image]));
  if (iddFs) { form.appendChild(iddFs); form.addEventListener('change', function () { iddSync(); }); iddSync(); }
  form.appendChild(h('fieldset', { class: 'fs' }, [h('legend', { text: 'Teilnahme und Teams-Link' }), h('div', { class: 'grid2' }, [f.capacity, h('div')]), f.teamsLink]));
  form.appendChild(box);
  form.appendChild(h('div', { style: 'display:flex;gap:12px;flex-wrap:wrap' }, [submit].concat(extra)));
  form.addEventListener('submit', function (e) {
    e.preventDefault(); box.hidden = true;
    if (!validate()) return;
    submit.disabled = true; var old = submit.textContent; submit.textContent = 'Wird gespeichert …';
    var payload = { id: ev.id, title: v.title.trim(), category: v.category, type: v.type, topic: v.topic, date: v.date, start: v.start, duration: v.duration, capacity: v.capacity, teamsLink: v.teamsLink.trim(), description: v.description, imageData: v.imageData, removeImage: v.removeImage, placeholder: v.placeholder, idd: !!v.idd, iddTitle: String(v.iddTitle || '').replace(/\s+/g, ' ').trim(), iddContent: v.idd ? v.iddContent : '', iddMinutes: v.idd ? v.iddMinutes : 0, agenda: v.idd ? v.agenda.map(function (b) { return { content: String(b.content).trim(), minutes: b.minutes, iddMinutes: b.iddMinutes }; }) : [] };
    Promise.resolve(o.onSubmit(payload)).catch(function (err) { box.hidden = false; box.textContent = err.message || 'Das Speichern ist fehlgeschlagen.'; box.scrollIntoView({ block: 'center', behavior: 'smooth' }); }).then(function () { submit.disabled = false; submit.textContent = old; });
  });
  return form;
}

/* ====================================================== Ansichten */
function loading() { return h('div', { class: 'empty' }, [h('p', { text: 'Wird geladen …' })]); }

/* ---- Katalog ---- */
var filters = { cat: 'dienstlich', q: '', types: [], topic: 'all', dur: 'all', tod: 'all' };
/* Hinweis auf der Startseite: Profil veröffentlichen (dauerhaft ausblendbar, gespeichert im Konto) */
/* Browser-Benachrichtigungen (ohne Push-Dienst): Abfrage alle drei Minuten, solange ein Tab offen ist */
function notifySupported() { return typeof window.Notification === 'function' && window.isSecureContext !== false; }
function notifyOn() { return notifySupported() && Notification.permission === 'granted' && store.get('lt_notify') === '1'; }
var notifyTimer = null, notifySeen = -1;
function startNotifyPoll() {
  if (notifyTimer || !notifyOn()) return;
  notifySeen = state.me ? state.me.unread || 0 : 0;
  notifyTimer = setInterval(function () {
    if (!state.me || !notifyOn()) return;
    Api.me().then(function (j) {
      var n = j.me ? j.me.unread || 0 : 0;
      if (n > notifySeen) { try { var no = new Notification(state.settings.appTitle, { body: n === 1 ? 'Es gibt eine neue Mitteilung zu Deinen Anmeldungen.' : 'Es gibt ' + n + ' neue Mitteilungen zu Deinen Anmeldungen.', tag: 'lt-notes' }); no.onclick = function () { window.focus(); location.hash = '#/meine-anmeldungen'; }; } catch (e) { } }
      notifySeen = n; if (j.me && state.me && j.me.unread !== state.me.unread) setMe(j.me);
    }, function () { });
  }, 180000);
}
/* Hinweis auf neue Mitteilungen (Termin-Update, Absage) auf der Startseite */
function noteHint() {
  var me = state.me; if (!me || !me.unread) return null;
  return h('div', { class: 'pub-hint note-hint', role: 'status' }, [h('div', { class: 'pub-hint-t' }, [h('b', { text: me.unread === 1 ? 'Eine neue Mitteilung' : me.unread + ' neue Mitteilungen' }), h('span', { text: 'Es gibt Neuigkeiten zu Deinen Anmeldungen, zum Beispiel ein Termin-Update oder eine Absage.' })]),
    h('a', { class: 'btn btn-primary btn-sm', href: '#/meine-anmeldungen', text: 'Mitteilungen ansehen' })]);
}
function pubHint() {
  var me = state.me; if (!me || me.profilePublic || me.publicHintOff) return null;
  var box = h('div', { class: 'pub-hint', role: 'status' }, [h('div', { class: 'pub-hint-t' }, [h('b', { text: 'Zeig der Community, was Du kannst' }), h('span', { text: 'Veröffentliche Dein Profil. Dann sehen andere Deine Themen und Abzeichen und finden Dich leichter.' })]),
    h('a', { class: 'btn btn-primary btn-sm', href: '#/profil?tab=oeffentlich', text: 'Profil veröffentlichen' }),
    h('button', { type: 'button', class: 'pub-x', 'aria-label': 'Hinweis ausblenden', title: 'Hinweis ausblenden', text: '\u00d7', onclick: function () { box.remove(); me.publicHintOff = true; Api.dismissHint().catch(function () { }); } })]);
  return box;
}
function viewCatalog() {
  if (filters.topic !== 'all' && TOPICS[filters.cat].indexOf(filters.topic) < 0) filters.topic = 'all';
  filters.types = filters.types.filter(function (t) { return TYPES.indexOf(t) >= 0; });
  var root = h('div', { class: 'stage' + (filters.cat === 'privat' ? ' priv' : '') });
  function paint() { root.style.cssText = paintStage(filters.cat); }
  paint();
  var rowsHost = h('div', { class: 'rows' });
  var count = h('span', { class: 'count', 'aria-live': 'polite' });
  var search = h('input', { type: 'search', id: 'c-search', placeholder: 'Titel, Thema oder Benutzername suchen', value: filters.q, 'aria-label': 'Suche' });
  var switchSeg = h('div', { class: 'seg', role: 'group', 'aria-label': 'Dienstlich oder privat' }, ['dienstlich', 'privat'].map(function (c) {
    return h('button', { type: 'button', text: CAT_LABEL[c], 'aria-pressed': String(filters.cat === c), onclick: function () { filters.cat = c; filters.topic = 'all'; root.classList.toggle('priv', c === 'privat'); paint(); fillTopicSel(); $$('button', switchSeg).forEach(function (b, i) { b.setAttribute('aria-pressed', String(['dienstlich', 'privat'][i] === c)); }); renderRows(); } });
  }));
  var typeChips = h('div', { class: 'grp types', role: 'group', 'aria-label': 'Art der Veranstaltung' }, [h('span', { class: 'lbl', text: 'Art' })].concat(TYPES.map(function (t) {
    return h('button', { type: 'button', class: 'fchip', text: t, 'aria-pressed': String(filters.types.indexOf(t) >= 0), onclick: function (e) { var i = filters.types.indexOf(t); if (i >= 0) filters.types.splice(i, 1); else filters.types.push(t); e.currentTarget.setAttribute('aria-pressed', String(i < 0)); renderRows(); } });
  })));
  var topicSel = h('select', { id: 'c-topic', 'aria-label': 'Thema' });
  function fillTopicSel() {
    clear(topicSel); topicSel.appendChild(h('option', { value: 'all', text: 'Alle' }));
    sortTopics(TOPICS[filters.cat]).forEach(function (t) { topicSel.appendChild(h('option', { value: t, text: capFirst(t), selected: filters.topic === t })); });
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

  root.appendChild(h('div', { class: 'hero' }, h('div', { class: 'wrap wide' }, [topline('Informelles Lernen im Außendienst'), h('h1', { html: hlHtml(HERO.title) }),
    h('p', { text: HERO.text }),
    h('p', { class: 'hero-cta' }, h('a', { class: 'btn btn-secondary', href: '#/anbieten', text: 'Selbst etwas anbieten' })), noteHint(), pubHint()])));
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
    if (q) { if (e._q == null) e._q = (e.title + ' ' + e.host + ' ' + e.topic + ' ' + e.type + ' ' + plainText(e.description)).toLowerCase(); if (e._q.indexOf(q) < 0) return false; }
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
    sortTopics(TOPICS[filters.cat]).forEach(function (topic) {
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
    var t = h('article', { class: 'tile', role: 'listitem', tabindex: '0', 'aria-label': e.title + ', ' + dateFull(e.date) + ', ' + e.start + ' Uhr' + (full ? ', ausgebucht' : '') }, [
      h('div', { class: 'tile-img' }, [cover(e), h('div', { class: 'chips' }, [chipEl(e.category === 'dienstlich' ? 'biz' : 'priv', CAT_LABEL[e.category]), chipEl('type', e.type), e.idd ? chipEl('idd', 'IDD') : null]), (st || e.mine || e.own) ? h('div', { class: 'chips-b' }, [e.own ? chipEl('mine', 'Dein Angebot') : (e.mine ? chipEl('mine', 'Du bist angemeldet') : null), st]) : null]),
      h('div', { class: 'tile-body' }, [h('h3', { text: e.title, title: e.title }), h('div', { class: 'tile-meta' }, [h('span', null, [h('b', { text: dateShort(e.date) }), ' ' + e.start + '\u2013' + endHm(e) + ' Uhr']), h('span', { class: 'tile-host' }, [e.duration + '\u00a0Minuten\u00a0\u00b7\u00a0', userTag(e.host, e.hostLevel, e.hostExpert, 'tile-host-n', e.hostPublic)])])])]);
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
  var body = h('div', { class: 'modal-body bk-main' });
  var head = h('div', { class: 'bk-side' }, [h('div', { class: 'bk-img' }, [cover(e), h('div', { class: 'chips' }, [chipEl(e.category === 'dienstlich' ? 'biz' : 'priv', CAT_LABEL[e.category]), chipEl('type', e.type), statusChip(e)])]),
    h('dl', { class: 'bk-facts' }, [
      h('div', null, [h('dt', { text: 'Datum' }), h('dd', { text: dateLong(e.date) })]), h('div', null, [h('dt', { text: 'Uhrzeit' }), h('dd', { text: e.start + ' – ' + endHm(e) + ' Uhr' })]),
      h('div', null, [h('dt', { text: 'Dauer' }), h('dd', { text: e.duration + ' Minuten' })]), e.idd ? h('div', null, [h('dt', { text: 'IDD-Zeit' }), h('dd', { text: e.iddMinutes + ' Minuten' })]) : null, h('div', null, [h('dt', { text: 'Angeboten von' }), h('dd', null, userTag(e.host, e.hostLevel, e.hostExpert, '', e.hostPublic))])])]);
  var wrapper = h('div', { class: 'bk' }, [head, body]);
  var m = openModal(wrapper, { xwide: true, label: 'Anmeldung: ' + e.title, onClose: onChange });
  function showForm() {
    clear(body); body.classList.add('bk-form');
    var f = freeOf(e);
    body.appendChild(h('div', null, [h('h2', { text: e.title }), h('div', { class: 'chips-inline', style: 'margin-top:8px' }, chipEl('topic', capFirst(e.topic)))]));
    /* IDD: Titel fuer die Dokumentation und Agenda im scrollbaren Bereich, damit die Aktionszeile unten bleibt */
    var iddInfo = e.idd ? h('div', { class: 'idd-box' }, [h('h3', { text: 'IDD-anrechenbar: ' + e.iddMinutes + ' Minuten', style: 'margin:0' }), h('div', { class: 'hint', text: 'IDD-Titel: ' + e.iddTitle }), e.iddContent ? h('div', { class: 'hint', text: 'Lerninhalt: ' + e.iddContent }) : null, agendaNode(e),
      state.me && state.me.iddDuty && !state.me.gbId ? h('div', { class: 'notice warn', role: 'status' }, h('div', { class: 'n-body' }, [h('b', { text: 'gutBeraten-ID fehlt' }), h('div', null, ['Damit die Zeit gemeldet werden kann, hinterlege Deine ID unter ', h('a', { href: '#/profil?tab=konto', text: 'Profil › Konto' }), '.'])])) : null]) : null;
    body.appendChild(h('div', { class: 'bk-desc', tabindex: '0' }, [h('div', { class: 'rich', html: sanitizeHtml(e.description) }), iddInfo]));
    var foot = h('div', { class: 'bk-foot' }); body.appendChild(foot);
    if (e.own) { foot.appendChild(h('div', { class: 'notice info', role: 'status', text: 'Das ist Deine eigene Veranstaltung. Die Teilnehmenden siehst Du unter „Meine Veranstaltungen“.' })); foot.appendChild(h('div', null, h('a', { class: 'btn btn-primary', href: '#/meine-veranstaltungen', text: 'Meine Veranstaltungen öffnen' }))); return; }
    if (e.mine) { foot.appendChild(h('div', { class: 'notice ok', role: 'status', text: 'Du bist für diese Veranstaltung angemeldet.' })); foot.appendChild(h('div', null, h('a', { class: 'btn btn-primary', href: '#/meine-anmeldungen', text: 'Meine Anmeldungen öffnen' }))); return; }
    foot.appendChild(h('h3', { text: 'Jetzt anmelden' }));
    if (!state.me) {
      var nx = encodeURIComponent('/');
      foot.appendChild(h('div', { class: 'notice info', role: 'status', text: 'Zum Anmelden brauchst Du ein Konto. Die Registrierung dauert eine Minute. Öffentlich sichtbar ist nur Dein Benutzername.' }));
      foot.appendChild(h('div', { style: 'display:flex;gap:12px;flex-wrap:wrap;align-items:center' }, [h('a', { class: 'btn btn-primary', href: '#/anmelden?next=' + nx, text: 'Anmelden' }), h('a', { class: 'btn btn-secondary', href: '#/registrieren?next=' + nx, text: 'Neu registrieren' }), h('span', { class: 'bk-free' + (f <= 5 ? ' few' : ''), text: 'Freie Plätze: ' + f + ' von ' + e.capacity })]));
      return;
    }
    var msg = h('div', { class: 'notice bad', role: 'alert', hidden: true });
    var go = h('button', { type: 'button', class: 'btn btn-primary', text: 'Verbindlich anmelden' });
    go.addEventListener('click', function () {
      msg.hidden = true; go.disabled = true; go.textContent = 'Wird geprüft …';
      Api.book(e.id).then(showDone, function (er) {
        go.disabled = false; go.textContent = 'Verbindlich anmelden';
        if (authFail(er)) { m.close(); return; }
        if (er.code === 'full' || er.code === 'past' || er.code === 'notfound' || er.code === 'cancelled') { showFail(er); return; }
        msg.hidden = false; msg.textContent = er.message;
      });
    });
    foot.appendChild(h('p', { class: 'hint', text: 'Du meldest Dich als ' + state.me.username + ' an. Abmelden kannst Du Dich jederzeit unter „Meine Anmeldungen“.' }));
    foot.appendChild(msg);
    foot.appendChild(h('div', { style: 'display:flex;gap:12px;flex-wrap:wrap;align-items:center' }, [go, h('button', { type: 'button', class: 'btn btn-secondary', text: 'Abbrechen', onclick: m.close }), h('span', { class: 'bk-free' + (f <= 5 ? ' few' : ''), text: 'Freie Plätze: ' + f + ' von ' + e.capacity })]));
  }
  function showDone(r) {
    clear(body); body.classList.remove('bk-form'); e.mine = true;
    body.appendChild(h('div', { class: 'notice ok', role: 'status', text: 'Die Anmeldung war erfolgreich. Dein Platz ist reserviert.' }));
    body.appendChild(participationCard(r.eventInfo, r.bookingId, { compact: true }));
    body.appendChild(h('div', { style: 'display:flex;gap:12px;flex-wrap:wrap;align-items:center' }, [h('button', { class: 'btn btn-primary', type: 'button', text: 'Schließen', onclick: m.close }), h('a', { class: 'btn btn-secondary', href: '#/meine-anmeldungen', text: 'Meine Anmeldungen öffnen' }), h('span', { class: 'hint', text: 'Teams-Link und Kalenderdatei findest Du dort jederzeit wieder.' })]));
    refreshMe();
  }
  function showFail(er) {
    clear(body); body.classList.remove('bk-form');
    body.appendChild(h('div', { class: 'notice bad', role: 'alert', text: er.message }));
    body.appendChild(h('div', null, h('button', { class: 'btn btn-primary', type: 'button', text: 'Zurück zum Katalog', onclick: m.close })));
  }
  showForm();
}
function icsName(info) {
  var t = String(info.title || '').replace(/[\\\/:*?"<>|\u0000-\u001f]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^[-.]+|[-.]+$/g, '').slice(0, 50).replace(/-$/, '');
  return 'LearnTogether_' + (t || 'Veranstaltung') + '_' + info.date + '.ics';
}
function downloadIcs(info, uid) {
  var ics = buildIcs(info, uid), name = icsName(info);
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
function teamsBox(link) {
  return h('div', { class: 'teams-box' }, [h('div', { class: 'tb-l', text: 'Teams-Link zur Veranstaltung' }),
    h('a', { class: 'tb-link', href: link, target: '_blank', rel: 'noopener noreferrer', text: link }),
    h('button', { class: 'btn btn-secondary btn-sm', type: 'button', html: ico('copy') + ' Link kopieren', onclick: function () { copyText(link, 'Teams-Link kopiert.'); } })]);
}
/* Angaben zur Teilnahme: Termin, Teams-Link und Kalendereintrag */
function participationCard(info, uid, o) {
  var compact = !!(o && o.compact), node = h('div', { class: 'pcard' + (compact ? ' compact' : '') });
  if (!compact) node.appendChild(h('div', { class: 'chips-inline' }, [chipEl(info.category === 'dienstlich' ? 'biz' : 'priv', CAT_LABEL[info.category]), chipEl('type', info.type), chipEl('type', info.topic)]));
  node.appendChild(h('h2', { text: info.title, style: 'overflow-wrap:anywhere' }));
  if (compact) node.appendChild(h('div', { class: 'chips-inline' }, chipEl('topic', capFirst(info.topic))));
  if (!compact) node.appendChild(h('dl', { class: 'facts f4' }, [
    h('div', null, [h('dt', { text: 'Datum' }), h('dd', { text: dateLong(info.date) })]), h('div', null, [h('dt', { text: 'Uhrzeit' }), h('dd', { text: info.start + ' – ' + endHm(info) + ' Uhr' })]),
    h('div', null, [h('dt', { text: info.idd ? 'Dauer / IDD-Zeit' : 'Dauer' }), h('dd', { text: info.duration + ' Minuten' + (info.idd ? ' / ' + info.iddMinutes + ' Minuten' : '') })]), h('div', null, [h('dt', { text: 'Angeboten von' }), h('dd', null, userTag(info.host, info.hostLevel, info.hostExpert, '', info.hostPublic))])]));
  if (info.cancelled) { node.appendChild(h('div', { class: 'notice warn', role: 'alert' }, h('div', { class: 'n-body' }, [h('b', { text: 'Diese Veranstaltung wurde abgesagt' }), h('div', { text: (info.cancelReason ? 'Grund: ' + info.cancelReason + ' ' : '') + 'Der Termin findet nicht statt.' })]))); return node; }
  if (info.teamsLink) node.appendChild(teamsBox(info.teamsLink));
  node.appendChild(h('div', { class: 'pc-cols' }, h('div', { class: 'pc-ics' }, h('button', { class: 'btn btn-primary', type: 'button', html: ico('download') + ' Kalendereintrag (.ics) herunterladen', onclick: function () { downloadIcs(info, uid); } }))));
  return node;
}

/* ---- Anmelden und Registrieren ---- */
function afterLogin(me, q) {
  setMe(me);
  var nx = q && q.next ? q.next : '/';
  if (/^\/(anmelden|registrieren)/.test(nx)) nx = '/';
  if (me.mustChange) nx = '/profil';
  location.hash = '#' + (nx.charAt(0) === '/' ? nx : '/');
}
function viewLogin(q) {
  var root = h('div', { class: 'page' }, h('div', { class: 'wrap narrow' })), wrap = root.firstChild;
  var id = h('input', { type: 'text', id: 'l-id', autocomplete: 'username', autocapitalize: 'none', spellcheck: 'false', maxlength: '200' });
  var pw = h('input', { type: 'password', id: 'l-pw', autocomplete: 'current-password', maxlength: '128' });
  var fi = field('Benutzername oder E-Mail-Adresse', id, { id: 'l-id', req: true }), fp = field('Passwort', pw, { id: 'l-pw', req: true });
  var msg = h('div', { class: 'notice bad', role: 'alert', hidden: true }), go = h('button', { type: 'submit', class: 'btn btn-primary', text: 'Anmelden' });
  var form = h('form', { class: 'form', style: 'max-width:460px;margin-top:24px', novalidate: true }, [fi, fp, msg, h('div', null, go)]);
  form.addEventListener('submit', function (e) {
    e.preventDefault(); msg.hidden = true; fi.setErr(''); fp.setErr('');
    if (!id.value.trim()) { fi.setErr('Bitte gib Deinen Benutzernamen oder Deine E-Mail-Adresse an.'); id.focus(); return; }
    if (!pw.value) { fp.setErr('Bitte gib Dein Passwort ein.'); pw.focus(); return; }
    go.disabled = true; go.textContent = 'Wird geprüft …';
    Api.login(id.value, pw.value).then(function (j) { afterLogin(j.me, q); }, function (er) { go.disabled = false; go.textContent = 'Anmelden'; msg.hidden = false; msg.textContent = er.message; pw.value = ''; pw.focus(); });
  });
  wrap.appendChild(topline('Konto')); wrap.appendChild(h('h1', { html: '<span class="accent">Anmelden</span>' }));
  wrap.appendChild(h('p', { class: 'lead', text: 'Melde Dich mit Deinem Benutzernamen oder Deiner E-Mail-Adresse an.' }));
  wrap.appendChild(form);
  wrap.appendChild(h('p', { style: 'margin-top:24px' }, ['Noch kein Konto? ', h('a', { href: '#/registrieren' + (q.next ? '?next=' + encodeURIComponent(q.next) : ''), text: 'Jetzt registrieren' })]));
  /* Hilfe bei vergessenem Passwort: auf dem Server die Administration, in der Demo das Zurücksetzen der Demodaten */
  wrap.appendChild(h('details', { class: 'login-help' }, [h('summary', { text: 'Passwort vergessen?' }),
    mode === 'local' ? h('div', null, [h('p', { text: 'Dies ist die Demo. Die Daten liegen nur in diesem Browser. Hast Du das Passwort geändert und vergessen, setzt Du die Demo zurück. Danach gilt wieder admin mit RuVTest1234, alle Änderungen in der Demo gehen dabei verloren.' }),
      twoStep(h('button', { type: 'button', class: 'btn btn-danger btn-sm', text: 'Demo zurücksetzen' }), 'Demo zurücksetzen', 'Wirklich zurücksetzen?', function () { Local.reset(); location.hash = '#/anmelden'; location.reload(); })])
      : h('p', { text: 'Wende Dich an die Administration. Sie vergibt Dir ein vorläufiges Passwort. Nach mehreren Fehlversuchen ist die Anmeldung für fünf Minuten gesperrt.' })]));
  setTimeout(function () { id.focus(); }, 30);
  return root;
}
function viewRegister(q) {
  var root = h('div', { class: 'page' }, h('div', { class: 'wrap narrow' })), wrap = root.firstChild;
  var F = {}, I = {};
  function mk(key, label, attrs, o) { I[key] = h('input', Object.assign({ id: 'r-' + key, type: 'text', maxlength: '200' }, attrs)); F[key] = field(label, I[key], Object.assign({ id: 'r-' + key, req: true }, o || {})); I[key].addEventListener('input', function () { F[key].setErr(''); }); return F[key]; }
  mk('username', 'Benutzername', { autocomplete: 'username', autocapitalize: 'none', spellcheck: 'false', maxlength: '24' }, { hint: 'Frei wählbar, 3 bis 24 Zeichen (Buchstaben, Ziffern, Punkt, Unterstrich, Bindestrich). Er muss einmalig sein und lässt sich später nicht ändern. Nur er ist für andere sichtbar.' });
  mk('firstName', 'Vorname', { autocomplete: 'given-name', maxlength: '60' }, { hint: 'Dein echter Vorname. Er ist nur für die Administration sichtbar.' });
  mk('lastName', 'Nachname', { autocomplete: 'family-name', maxlength: '60' }, { hint: 'Dein echter Nachname. Er ist nur für die Administration sichtbar.' });
  mk('xv', 'XV-Nummer', { autocomplete: 'off', autocapitalize: 'characters', maxlength: '14' }, { hint: 'Zum Beispiel XV12345 oder XVG12345. Sie ist nur für die Administration sichtbar.' });
  mk('email', 'E-Mail-Adresse', { type: 'email', autocomplete: 'email', maxlength: '200' }, { hint: 'Du kannst Dich damit auch anmelden. Es werden keine E-Mails verschickt.' });
  mk('password', 'Passwort', { type: 'password', autocomplete: 'new-password', maxlength: '128' }, { hint: 'Mindestens 10 Zeichen. Es darf weder Deinen Benutzernamen noch ein bekanntes Passwort enthalten.' });
  mk('password2', 'Passwort wiederholen', { type: 'password', autocomplete: 'new-password', maxlength: '128' });
  var msg = h('div', { class: 'notice bad', role: 'alert', hidden: true }), go = h('button', { type: 'submit', class: 'btn btn-primary', text: 'Registrieren' });
  var form = h('form', { class: 'form', style: 'margin-top:24px;max-width:640px', novalidate: true }, [F.username, h('div', { class: 'grid2' }, [F.firstName, F.lastName]), h('div', { class: 'grid2' }, [F.xv, F.email]), h('div', { class: 'grid2' }, [F.password, F.password2]),
    h('div', { class: 'notice info', text: 'Datenschutz: Echter Name, XV-Nummer und E-Mail-Adresse sieht nur die Administration. Im Katalog und für andere Nutzende erscheint ausschließlich Dein Benutzername.' }), msg, h('div', null, go)]);
  form.addEventListener('submit', function (e) {
    e.preventDefault(); msg.hidden = true; var bad = null;
    function need(k, ok, t) { if (!ok) { F[k].setErr(t); if (!bad) bad = I[k]; } else F[k].setErr(''); }
    var un = I.username.value.trim(), xv = I.xv.value.toUpperCase().replace(/[\s\-]/g, '');
    need('username', /^[A-Za-z0-9][A-Za-z0-9._-]{2,23}$/.test(un), 'Der Benutzername muss 3 bis 24 Zeichen lang sein und darf nur Buchstaben, Ziffern, Punkt, Unterstrich und Bindestrich enthalten.');
    need('firstName', I.firstName.value.trim().length >= 1, 'Bitte gib Deinen Vornamen an.'); need('lastName', I.lastName.value.trim().length >= 1, 'Bitte gib Deinen Nachnamen an.');
    need('xv', /^XVG?[0-9]{2,8}$/.test(xv), 'Bitte gib eine gültige XV-Nummer an (z. B. XV12345 oder XVG12345).');
    need('email', validEmail(I.email.value.trim()), 'Bitte gib eine gültige E-Mail-Adresse an.');
    need('password', I.password.value.length >= 10, 'Das Passwort muss mindestens 10 Zeichen lang sein.');
    need('password2', I.password.value === I.password2.value, 'Die beiden Passwörter stimmen nicht überein.');
    if (bad) { bad.focus(); return; }
    go.disabled = true; go.textContent = 'Wird angelegt …';
    Api.register({ username: un, firstName: I.firstName.value.trim(), lastName: I.lastName.value.trim(), xv: xv, email: I.email.value.trim(), password: I.password.value }).then(function (j) { toast('Willkommen, ' + j.me.username + '. Dein Konto ist angelegt.'); afterLogin(j.me, q); },
      function (er) { go.disabled = false; go.textContent = 'Registrieren'; msg.hidden = false; msg.textContent = er.message; msg.scrollIntoView({ block: 'center', behavior: 'smooth' }); });
  });
  wrap.appendChild(topline('Konto')); wrap.appendChild(h('h1', { html: '<span class="accent">Registrieren</span>' }));
  wrap.appendChild(h('p', { class: 'lead', text: 'Lege Dein Konto an, um Dich anzumelden und selbst Veranstaltungen anzubieten. Dein Benutzername ist wie bei sozialen Netzwerken öffentlich, alles andere bleibt privat.' }));
  wrap.appendChild(form);
  wrap.appendChild(h('p', { style: 'margin-top:24px' }, ['Du hast schon ein Konto? ', h('a', { href: '#/anmelden' + (q.next ? '?next=' + encodeURIComponent(q.next) : ''), text: 'Anmelden' })]));
  return root;
}

/* ---- Veranstaltung anbieten ---- */
function viewCreate() {
  var root = h('div', { class: 'page' }, h('div', { class: 'wrap wide' }));
  var wrap = root.firstChild;
  if (!state.me) {
    wrap.appendChild(topline('Werde LearnMaker')); wrap.appendChild(h('h1', { html: 'Veranstaltung <span class="accent">anbieten</span>' }));
    wrap.appendChild(h('div', { class: 'notice info', role: 'status', text: 'Wer eine Veranstaltung anbietet, ist LearnMaker. Dafür brauchst Du ein Konto.' }));
    wrap.appendChild(h('div', { style: 'display:flex;gap:12px;flex-wrap:wrap;margin-top:20px' }, [h('a', { class: 'btn btn-primary', href: '#/anmelden?next=' + encodeURIComponent('/anbieten'), text: 'Anmelden' }), h('a', { class: 'btn btn-secondary', href: '#/registrieren?next=' + encodeURIComponent('/anbieten'), text: 'Neu registrieren' })]));
    return root;
  }
  function show() {
    clear(wrap);
    wrap.appendChild(topline('Werde LearnMaker')); wrap.appendChild(h('h1', { html: 'Veranstaltung <span class="accent">anbieten</span>' }));
    wrap.appendChild(h('p', { class: 'lead', text: 'Teile Dein Wissen oder lade zum Austausch ein, dienstlich oder privat. Wer eine Veranstaltung anbietet, ist LearnMaker. Du trittst als ' + state.me.username + ' auf. Inhalte müssen legal, respektvoll und jugendfrei sein.' }));
    wrap.appendChild(buildEventForm({ onSubmit: function (p) { return Api.createEvent(p).then(function () { done(p); }, function (er) { if (authFail(er)) return; throw er; }); } }));
  }
  function done(p) {
    clear(wrap); window.scrollTo({ top: 0 });
    wrap.appendChild(h('div', { class: 'notice ok', role: 'status', text: 'Danke. Deine Veranstaltung ist jetzt im Katalog sichtbar.' }));
    wrap.appendChild(h('h1', { text: p.title, style: 'margin-top:24px;overflow-wrap:anywhere' }));
    wrap.appendChild(h('p', { class: 'lead', text: dateLong(p.date) + ', ' + p.start + ' – ' + minToHm(toMin(p.start) + p.duration) + ' Uhr' }));
    wrap.appendChild(h('p', { text: 'Wer sich anmeldet, siehst Du unter „Meine Veranstaltungen“. Dort kannst Du die Veranstaltung auch absagen.' }));
    wrap.appendChild(h('div', { style: 'display:flex;gap:12px;flex-wrap:wrap;margin-top:24px' }, [h('a', { class: 'btn btn-primary', href: '#/meine-veranstaltungen', text: 'Meine Veranstaltungen öffnen' }), h('a', { class: 'btn btn-secondary', href: '#/', text: 'Zum Katalog' }), h('button', { class: 'btn btn-secondary', type: 'button', text: 'Weitere Veranstaltung anlegen', onclick: show })]));
    refreshMe();
  }
  show();
  return root;
}

/* ---- Gemeinsame Bausteine fuer die Listen ---- */
function pageShell(kicker, titleHtml, lead, wide) {
  var root = h('div', { class: 'page' }, h('div', { class: 'wrap' + (wide ? ' wide' : ' narrow') })), wrap = root.firstChild;
  wrap.appendChild(topline(kicker)); wrap.appendChild(h('h1', { html: titleHtml })); if (lead) wrap.appendChild(h('p', { class: 'lead', text: lead }));
  return { root: root, wrap: wrap };
}
/* Umschaltbare Bereiche (z. B. Anstehend und Vergangen); die Auswahl bleibt in der Sitzung erhalten */
function tabs(key, defs) {
  var cur = sess.get(key), bar = h('div', { class: 'seg tabs-seg', role: 'group', 'aria-label': 'Bereich wählen' }), host = h('div', { class: 'tab-host' });
  if (!defs.some(function (d) { return d[0] === cur; })) cur = defs[0][0];
  function show(id) {
    cur = id; sess.set(key, id);
    $$('button', bar).forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-t') === id)); });
    clear(host); host.appendChild(defs.filter(function (d) { return d[0] === id; })[0][3]());
  }
  defs.forEach(function (d) { bar.appendChild(h('button', { type: 'button', 'data-t': d[0], text: d[1] + (d[2] != null ? ' (' + d[2] + ')' : ''), onclick: function () { show(d[0]); } })); });
  show(cur);
  return h('div', { class: 'ptabs' }, [bar, host]);
}
/* Karte mit dem Bild der Veranstaltung links */
function withThumb(node, ev) {
  var b = h('div', { class: 'evcard-body' }); while (node.firstChild) b.appendChild(node.firstChild);
  node.removeAttribute('style'); node.classList.add('evcard');
  node.appendChild(h('div', { class: 'evcard-img' }, cover(ev))); node.appendChild(b); return node;
}
function cardList(nodes, emptyText, extra) {
  if (!nodes.length) return h('div', { class: 'empty-list' }, [h('p', { class: 'hint', text: emptyText }), extra || null]);
  return h('div', { class: 'cardlist' }, nodes);
}
function twoStep(btn, label, confirmLabel, run) {
  btn.addEventListener('click', function () {
    if (!btn._c) { btn._c = true; btn.setAttribute('data-c', '1'); btn.textContent = confirmLabel; setTimeout(function () { btn._c = false; btn.removeAttribute('data-c'); btn.textContent = label; }, 4000); return; }
    btn.disabled = true; run(function () { btn.disabled = false; btn._c = false; btn.removeAttribute('data-c'); btn.textContent = label; });
  });
  return btn;
}
var NOTE_TEXT = {
  cancelled: function (n) { return { t: 'Abgesagt: ' + n.title, x: dateFull(n.date) + ', ' + n.start + ' Uhr. ' + (n.reason ? 'Grund: ' + n.reason : 'Der Termin findet nicht statt.') }; },
  deleted: function (n) { return { t: 'Entfernt: ' + n.title, x: dateFull(n.date) + ', ' + n.start + ' Uhr. Die Administration hat die Veranstaltung gelöscht.' }; },
  removed: function (n) { return { t: 'Abgemeldet: ' + n.title, x: dateFull(n.date) + ', ' + n.start + ' Uhr. Die Administration hat Deine Anmeldung entfernt.' }; },
  changed: function (n) { return { t: 'Termin-Update: ' + n.title, x: n.reason || 'Die Veranstaltung wurde geändert.' }; }
};

/* ---- Meine Anmeldungen ---- */
function viewMyBookings() {
  var ps = pageShell('Teilnehmen', 'Meine <span class="accent">Anmeldungen</span>', 'Hier siehst Du, wo Du angemeldet bist, kannst Dich abmelden und besuchte Veranstaltungen mit Sternen bewerten.', true);
  var box = h('div', null, loading()); ps.wrap.appendChild(box);
  if (!state.me) { clear(box); goLogin(); return ps.root; }
  function load() {
    Api.myBookings().then(function (r) { clear(box); render(r); }, function (er) { if (authFail(er)) return; clear(box); box.appendChild(h('div', { class: 'notice bad', text: er.message })); });
  }
  function bookingCard(b) {
    var node = h('div', { class: 'panel', style: 'display:flex;flex-direction:column;gap:16px' }), acts = h('div', { style: 'display:flex;gap:12px;flex-wrap:wrap;align-items:center' }), msg = h('div', { class: 'notice bad', role: 'alert', hidden: true });
    node.appendChild(participationCard(b, b.bookingId));
    if (b.canCancel) {
      var lab = b.cancelled ? 'Aus meiner Liste entfernen' : 'Abmelden';
      acts.appendChild(twoStep(h('button', { class: 'btn btn-danger', type: 'button', text: lab }), lab, b.cancelled ? 'Wirklich entfernen?' : 'Wirklich abmelden?', function (reset) {
        Api.cancelBooking(b.id).then(function () { toast(b.cancelled ? 'Der Eintrag wurde entfernt.' : 'Du bist abgemeldet. Der Platz ist wieder frei.'); load(); refreshMe(); }, function (er) { reset(); if (authFail(er)) return; msg.hidden = false; msg.textContent = er.message; });
      }));
    } else if (!b.ended) acts.appendChild(h('span', { class: 'hint', text: 'Die Veranstaltung hat begonnen. Eine Abmeldung ist nicht mehr möglich.' }));
    node.appendChild(acts); node.appendChild(msg);
    return node;
  }
  function pastCard(b) {
    var node = h('div', { class: 'panel', style: 'display:flex;flex-direction:column;gap:12px' });
    node.appendChild(h('div', { class: 'chips-inline' }, [chipEl(b.category === 'dienstlich' ? 'biz' : 'priv', CAT_LABEL[b.category]), chipEl('type', b.type), chipEl('type', b.topic), b.cancelled ? chipEl('full', 'Abgesagt') : null]));
    node.appendChild(h('h3', { text: b.title, style: 'overflow-wrap:anywhere' }));
    node.appendChild(h('div', { class: 'hint' }, [dateFull(b.date) + ', ' + b.start + '–' + endHm(b) + ' Uhr · angeboten von ', userTag(b.host, b.hostLevel, b.hostExpert, '', b.hostPublic)]));
    if (b.cancelled) { node.appendChild(h('p', { class: 'hint', text: 'Diese Veranstaltung wurde abgesagt' + (b.cancelReason ? ': ' + b.cancelReason : '.') })); return node; }
    if (b.rating) node.appendChild(h('div', null, ['Deine Bewertung: ', ratingNode(b.rating, 1, true)]));
    else if (b.canRate) {
      var msg = h('div', { class: 'notice bad', role: 'alert', hidden: true });
      node.appendChild(h('div', null, [h('b', { text: 'Wie war die Veranstaltung?' }), starPicker(function (stars, reset) { Api.rate(b.bookingId, stars).then(function () { toast('Danke für Deine Bewertung.'); load(); }, function (er) { reset(); if (authFail(er)) return; msg.hidden = false; msg.textContent = er.message; }); }), msg]));
    }
    return node;
  }
  function render(r) {
    var unread = r.notes.filter(function (n) { return !n.read; });
    if (r.notes.length) {
      var nb = h('section', { style: 'margin-top:28px;display:flex;flex-direction:column;gap:12px' }, [h('h2', { text: 'Mitteilungen' + (unread.length ? ' (' + unread.length + ' neu)' : ''), style: 'font-size:1.35rem' })]);
      r.notes.slice().sort(function (a, b) { return a.created < b.created ? 1 : -1; }).slice(0, 20).forEach(function (n) {
        var tx = (NOTE_TEXT[n.type] || NOTE_TEXT.cancelled)(n);
        nb.appendChild(h('div', { class: 'notice warn' + (n.read ? ' read' : ''), role: 'status' }, h('div', { class: 'n-body' }, [h('b', { text: tx.t }), h('div', { text: tx.x })])));
      });
      if (unread.length) nb.appendChild(h('div', null, h('button', { class: 'btn btn-secondary btn-sm', type: 'button', text: 'Alle als gelesen markieren', onclick: function () { Api.markRead('').then(function () { load(); refreshMe(); }); } })));
      box.appendChild(nb);
      if (unread.length) setTimeout(function () { refreshMe(); }, 0);
    }
    var up = r.bookings.filter(function (b) { return !b.ended; }).sort(function (a, b) { return startDate(a) - startDate(b); });
    var past = r.bookings.filter(function (b) { return b.ended; }).sort(function (a, b) { return startDate(b) - startDate(a); });
    box.appendChild(tabs('lt_tab_mb', [
      ['up', 'Anstehend', up.length, function () { return cardList(up.map(function (b) { return withThumb(bookingCard(b), b); }), 'Du bist für keine Veranstaltung angemeldet. Im Katalog findest Du passende Termine.', h('a', { class: 'btn btn-primary', href: '#/', text: 'Zum Katalog' })); }],
      ['past', 'Vergangen', past.length, function () { return cardList(past.map(function (b) { return withThumb(pastCard(b), b); }), 'Noch keine besuchten Veranstaltungen. Nach dem Termin kannst Du hier Sterne vergeben.'); }]]));
  }
  load();
  return ps.root;
}

/* ---- Meine Veranstaltungen ---- */
function viewMyEvents() {
  var ps = pageShell('Für LearnMaker', 'Meine <span class="accent">Veranstaltungen</span>', 'Hier siehst Du, wer sich angemeldet hat, bearbeitest oder sagst Veranstaltungen ab und siehst die Bewertungen Deiner Sessions.', true);
  var box = h('div', null, loading()); ps.wrap.appendChild(box);
  if (!state.me) { clear(box); goLogin(); return ps.root; }
  function load() { Api.myEvents().then(function (r) { clear(box); render(r.events); }, function (er) { if (authFail(er)) return; clear(box); box.appendChild(h('div', { class: 'notice bad', text: er.message })); }); }
  function card(ev) {
    var node = h('div', { class: 'panel', style: 'display:flex;flex-direction:column;gap:14px' });
    node.appendChild(h('div', { class: 'chips-inline' }, [chipEl(ev.category === 'dienstlich' ? 'biz' : 'priv', CAT_LABEL[ev.category]), chipEl('type', ev.type), chipEl('type', ev.topic), ev.idd ? chipEl('idd', 'IDD ' + ev.iddMinutes + ' Min.') : null, ev.cancelled ? chipEl('full', 'Abgesagt') : null, ev.isTest ? chipEl('type', 'Testdaten') : null]));
    node.appendChild(h('h3', { text: ev.title, style: 'overflow-wrap:anywhere' }));
    node.appendChild(h('dl', { class: 'facts f4 facts-wide' }, [h('div', null, [h('dt', { text: 'Datum' }), h('dd', { class: 'nowrap', text: dateFull(ev.date) })]), h('div', null, [h('dt', { text: 'Uhrzeit' }), h('dd', { class: 'nowrap', text: ev.start + ' – ' + endHm(ev) + ' Uhr' })]),
      h('div', null, [h('dt', { text: 'Angemeldet' }), h('dd', { text: ev.booked + ' von ' + ev.capacity })]), h('div', null, [h('dt', { text: ev.ended ? 'Bewertung' : 'Teams-Sitzung' }), h('dd', null, ev.ended ? (ev.cancelled ? '–' : ratingNode(ev.ratingAvg, ev.ratingCount)) : h('a', { href: ev.teamsLink, target: '_blank', rel: 'noopener noreferrer', text: 'Link öffnen' }))])]));
    if (ev.cancelled) node.appendChild(h('div', { class: 'notice warn', role: 'status' }, h('div', { class: 'n-body' }, [h('b', { text: 'Diese Veranstaltung ist abgesagt' }), h('div', { text: (ev.cancelReason ? 'Grund: ' + ev.cancelReason + ' ' : '') + (ev.booked ? 'Die ' + ev.booked + ' angemeldeten Personen sehen die Absage unter „Meine Anmeldungen“.' : 'Es gab keine Anmeldungen.') })])));
    node.appendChild(h('h4', { text: 'Teilnehmende', style: 'margin:0' }));
    if (!ev.participants.length) node.appendChild(h('p', { class: 'hint', text: 'Noch niemand hat sich angemeldet.' }));
    else node.appendChild(h('div', { class: 'plist' }, ev.participants.map(function (p) { return userTag(p.username, p.level, false, 'chipu'); })));
    if (ev.iddConfirm && ev.participants.length) node.appendChild(confirmBox(ev));
    if (ev.canCancel) node.appendChild(cancelBox(ev));
    return node;
  }
  /* IDD: Teilnahme bestaetigen. Nur bestaetigte Teilnahmen werden angerechnet; teilweise Teilnahmen gibt es nicht. */
  function confirmBox(ev) {
    var c = ev.iddConfirm, done = ev.participants.filter(function (p) { return p.idd; }).length;
    var info = c.locked ? 'Die Teilnahmen sind endgültig gesperrt (31.01. des Folgejahres).' : c.open ? 'Bitte bestätige bis ' + dateFull(c.until.slice(0, 10)) + ', wer teilgenommen hat. Nur bestätigte Teilnahmen werden angerechnet.' : 'Die Frist ist abgelaufen. Fehlen noch Bestätigungen, wende Dich an die Administration.';
    var rows = ev.participants.map(function (p) {
      function b(st, label) { var on = p.idd === st; return h('button', { type: 'button', class: 'btn btn-sm ' + (on ? 'btn-primary' : 'btn-secondary'), 'aria-pressed': String(on), disabled: !c.open, text: label, onclick: function () { Api.confirmAttendance(p.id, on ? '' : st).then(function () { load(); }, function (er) { if (authFail(er)) return; toast(er.message, true); }); } }); }
      return h('div', { class: 'cf-row' }, [userTag(p.username, p.level, false, 'chipu'), h('span', { class: 'hint', text: p.idd === 'yes' ? 'teilgenommen' : p.idd === 'no' ? 'nicht teilgenommen' : 'offen' }), h('div', { class: 'cf-acts' }, [b('yes', 'Teilgenommen'), b('no', 'Nicht teilgenommen')])]);
    });
    return h('div', { class: 'idd-confirm' }, [h('h4', { text: 'Teilnahme bestätigen (IDD) · ' + done + ' von ' + ev.participants.length + ' erledigt', style: 'margin:0' }), h('p', { class: 'hint', text: info })].concat(rows));
  }
  function cancelBox(ev) {
    var reason = h('textarea', { id: 'v-reason-' + ev.id, rows: '2', maxlength: '300', placeholder: 'Zum Beispiel: Ich bin erkrankt. Ein neuer Termin folgt.' });
    var msg = h('div', { class: 'notice bad', role: 'alert', hidden: true });
    var go = h('button', { class: 'btn btn-danger', type: 'button', text: 'Absage bestätigen' }), back = h('button', { class: 'btn btn-secondary', type: 'button', text: 'Abbrechen' });
    var form = h('div', { class: 'cancel-box', hidden: true }, [h('p', { class: 'hint', text: ev.booked ? 'Es gibt bereits ' + ev.booked + ' Anmeldung(en). Sie sehen die Absage unter „Meine Anmeldungen“. Es werden keine E-Mails verschickt.' : 'Noch niemand hat sich angemeldet. Die Veranstaltung verschwindet aus dem Katalog.' }),
      field('Grund (freiwillig, sichtbar für angemeldete Personen)', reason, { id: 'v-reason-' + ev.id }), msg, h('div', { style: 'display:flex;gap:12px;flex-wrap:wrap' }, [go, back])]);
    var open = h('button', { class: 'btn btn-danger cancel-open', type: 'button', text: 'Veranstaltung absagen', onclick: function () { form.hidden = false; open.hidden = true; edit.hidden = true; reason.focus(); } });
    var edit = h('button', { class: 'btn btn-secondary', type: 'button', text: 'Bearbeiten', onclick: function () { editOwn(ev); } });
    back.addEventListener('click', function () { form.hidden = true; open.hidden = false; edit.hidden = false; msg.hidden = true; });
    go.addEventListener('click', function () { go.disabled = true; Api.cancelEvent(ev.id, reason.value).then(function () { toast('Die Veranstaltung wurde abgesagt.'); load(); }, function (er) { go.disabled = false; if (authFail(er)) return; msg.hidden = false; msg.textContent = er.message; }); });
    return h('div', { class: 'cancel-wrap' }, [h('div', { style: 'display:flex;gap:12px;flex-wrap:wrap' }, [edit, open]), form]);
  }
  /* Eigene Veranstaltung bearbeiten; bei neuem Termin oder Teams-Link erhalten Angemeldete eine Mitteilung */
  function editOwn(ev) {
    var c = h('div', { class: 'modal-body' }), m;
    c.appendChild(h('h2', { text: 'Veranstaltung bearbeiten', style: 'padding-right:40px' }));
    if (ev.booked) c.appendChild(h('p', { class: 'hint', text: 'Ändern sich Termin oder Teams-Link, erhalten die ' + ev.booked + ' angemeldeten Personen eine Mitteilung unter „Meine Anmeldungen“.' }));
    c.appendChild(buildEventForm({ event: ev, submitLabel: 'Änderungen speichern', extraButtons: [h('button', { type: 'button', class: 'btn btn-secondary', text: 'Abbrechen', onclick: function () { m.close(); } })], onSubmit: function (p) { return Api.updateEvent(p).then(function (r) { m.close(); toast(r.notified ? 'Gespeichert. ' + r.notified + (r.notified === 1 ? ' Person erhält' : ' Personen erhalten') + ' eine Mitteilung.' : 'Änderungen gespeichert.'); load(); }, function (er) { if (authFail(er)) return; throw er; }); } }));
    m = openModal(c, { wide: true, label: 'Veranstaltung bearbeiten' });
  }
  function render(list) {
    /* Abgesagte Termine stehen je nach Datum unter Anstehend oder Vergangen */
    var up = list.filter(function (e) { return !e.ended; }).sort(function (a, b) { return startDate(a) - startDate(b); });
    var past = list.filter(function (e) { return e.ended; }).sort(function (a, b) { return startDate(b) - startDate(a); });
    box.appendChild(h('p', { style: 'margin-top:20px' }, h('a', { class: 'btn btn-primary', href: '#/anbieten', text: 'Neue Veranstaltung anbieten' })));
    box.appendChild(tabs('lt_tab_me', [
      ['up', 'Anstehend', up.length, function () { return cardList(up.map(function (e) { return withThumb(card(e), e); }), 'Du hast keine anstehende Veranstaltung. Biete gern eine an.'); }],
      ['past', 'Vergangen', past.length, function () { return cardList(past.map(function (e) { return withThumb(card(e), e); }), 'Noch keine abgeschlossenen Veranstaltungen.'); }]]));
  }
  load();
  return ps.root;
}

/* ---- Profil ---- */
/* ====================================================== IDD-Cockpit und Nachweis (je Kalenderjahr) */
function iddCockpit(c) {
  var nowY = new Date().getFullYear(), years = {};
  c.items.forEach(function (x) { years[x.year] = 1; }); years[nowY] = 1;
  var ys = Object.keys(years).map(Number).sort(function (a, b) { return b - a; });
  var cur = Number(sess.get('lt_idd_y')) || (c.items.some(function (x) { return x.year === nowY; }) ? nowY : ys[0]);
  if (ys.indexOf(cur) < 0) cur = ys[0];
  var host = h('div');
  function draw() {
    clear(host); sess.set('lt_idd_y', String(cur));
    var its = c.items.filter(function (x) { return x.year === cur; }), ok = its.filter(function (x) { return x.status === 'yes'; }), sum = ok.reduce(function (s, x) { return s + x.minutes; }, 0), goal = c.hours * 60;
    var pend = its.filter(function (x) { return x.ended && !x.status && !x.locked; }), no = its.filter(function (x) { return x.status === 'no' || (x.ended && !x.status && x.locked); }), up = its.filter(function (x) { return !x.ended; });
    var pct = Math.min(100, Math.round(sum / goal * 100));
    var seg = h('div', { class: 'yearbar', role: 'group', 'aria-label': 'Kalenderjahr' }, ys.map(function (y) { return h('button', { type: 'button', text: String(y), 'aria-pressed': String(y === cur), onclick: function () { cur = y; draw(); } }); }));
    var pdf = h('button', { type: 'button', class: 'btn btn-primary', html: ico('download') + ' Nachweis ' + cur + ' als PDF', onclick: function () { saveBlob(iddPdf(c, cur), 'IDD-Nachweis-' + cur + '-' + (c.lastName || 'LearnTogether').replace(/[^A-Za-zÄÖÜäöüß-]/g, '') + '.pdf'); } });
    host.appendChild(h('div', { style: 'display:flex;gap:16px;align-items:center;flex-wrap:wrap;justify-content:space-between' }, [seg, pdf]));
    host.appendChild(h('div', { class: 'st-kpis', style: 'margin-top:20px' }, [
      h('div', { class: 'st-kpi' }, [h('b', { text: fmtMinutes(sum) }), h('span', { text: 'Bestätigte IDD-Zeit ' + cur })]),
      h('div', { class: 'st-kpi' }, [h('b', { text: c.hours + ' Std.' }), h('span', { text: 'Weiterbildungspflicht' })]),
      h('div', { class: 'st-kpi' }, [h('b', { text: sum >= goal ? 'erreicht' : fmtMinutes(goal - sum) }), h('span', { text: sum >= goal ? 'über die Plattform' : 'fehlen noch' })]),
      h('div', { class: 'st-kpi' }, [h('b', { text: String(ok.length) }), h('span', { text: 'bestätigte Veranstaltungen' })])]));
    host.appendChild(h('div', { class: 'idd-prog', role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': String(pct), 'aria-label': pct + ' Prozent der Weiterbildungspflicht' }, h('i', { style: 'width:' + pct + '%' })));
    host.appendChild(h('p', { class: 'hint', text: 'Bestätigungen für ' + cur + ' sind bis zum 31.01.' + (cur + 1) + ' möglich. Danach ist das Jahr abgeschlossen.' }));
    function tbl(cols, rows) { return h('div', { class: 'tbl-wrap' }, h('table', { class: 'tbl', style: 'min-width:0' }, [h('thead', null, h('tr', null, cols.map(function (t) { return h('th', { text: t }); }))), h('tbody', null, rows.map(function (r) { return h('tr', null, r.map(function (x) { return h('td', null, x); })); }))])); }
    function row(x, last) { return [h('span', { class: 'nowrap', text: dateFull(x.date) }), h('span', null, [h('b', { text: x.iddTitle }), h('div', { class: 'hint', text: x.title + (x.iddContent ? ' · ' + x.iddContent : '') })]), x.start + '–' + x.end + ' Uhr', x.minutes + ' Min.', last]; }
    host.appendChild(h('h3', { text: 'Angerechnet' }));
    host.appendChild(ok.length ? tbl(['Datum', 'IDD-Titel', 'Uhrzeit', 'IDD-Zeit', 'Bestätigt am'], ok.sort(function (a, b) { return a.date < b.date ? -1 : 1; }).map(function (x) { return row(x, x.confirmedAt ? dateFull(x.confirmedAt.slice(0, 10)) : '–'); })) : h('p', { class: 'hint', text: 'In ' + cur + ' noch keine bestätigte Teilnahme.' }));
    if (pend.length) { host.appendChild(h('h3', { text: 'Wartet auf Bestätigung' })); host.appendChild(tbl(['Datum', 'IDD-Titel', 'Uhrzeit', 'IDD-Zeit', 'Status'], pend.map(function (x) { return row(x, 'noch offen'); }))); }
    if (up.length) { host.appendChild(h('h3', { text: 'Angemeldet' })); host.appendChild(tbl(['Datum', 'IDD-Titel', 'Uhrzeit', 'IDD-Zeit', 'Status'], up.map(function (x) { return row(x, 'anstehend'); }))); }
    if (no.length) { host.appendChild(h('h3', { text: 'Nicht angerechnet' })); host.appendChild(tbl(['Datum', 'IDD-Titel', 'Uhrzeit', 'IDD-Zeit', 'Status'], no.map(function (x) { return row(x, x.status === 'no' ? 'nicht teilgenommen' : 'nicht bestätigt'); }))); }
  }
  draw();
  return h('section', { class: 'prof-sec', id: 'idd-cockpit' }, [h('h2', { text: 'IDD-Cockpit' }),
    h('p', { class: 'hint', text: 'Deine anrechenbare IDD-Bildungszeit über ' + state.settings.appTitle + ', je Kalenderjahr. Angerechnet werden nur bestätigte Teilnahmen. Weiterbildungen außerhalb der Plattform sind hier nicht enthalten.' }),
    c.gbId ? null : h('div', { class: 'notice warn', role: 'status' }, h('div', { class: 'n-body' }, [h('b', { text: 'gutBeraten-ID fehlt' }), h('div', null, ['Ohne ID können Deine Zeiten nicht gemeldet werden. ', h('a', { href: '#/profil?tab=konto', text: 'Jetzt unter Konto hinterlegen' })])])),
    host]);
}
/* IDD-Nachweis als PDF: alle bestaetigten Teilnahmen eines Kalenderjahres */
function pdfWrap(str, width, size, bold) {
  var words = String(str || '').split(/\s+/), lines = [], cur = '';
  words.forEach(function (w) { var t = cur ? cur + ' ' + w : w; if (pdfW(t, size, bold) <= width || !cur) cur = t; else { lines.push(cur); cur = w; } });
  if (cur) lines.push(cur); return lines.map(function (l) { return pdfFit(l, width, size, bold); });
}
function iddPdf(c, year) {
  var PW = 595, PH = 842, ML = 48, CW = PW - 2 * ML, pages = [], cv = null, y = 0, INK = '#001957', GREY = '#5f6b85', LINE = '#d9dee9', appTitle = state.settings.appTitle;
  var title = 'IDD-Weiterbildungsnachweis ' + year;
  function f2(n) { return (Math.round(n * 100) / 100).toString(); }
  function rect(x, yt, w, hh, col) { cv.push(pdfRgb(col) + ' rg ' + f2(x) + ' ' + f2(PH - yt - hh) + ' ' + f2(w) + ' ' + f2(hh) + ' re f'); }
  function text(x, yb, str, size, bold, col, align) { str = String(str); var w = pdfW(str, size, bold); if (align === 'r') x -= w; cv.push('BT /' + (bold ? 'F2' : 'F1') + ' ' + size + ' Tf ' + pdfRgb(col) + ' rg ' + f2(x) + ' ' + f2(PH - yb) + ' Td <' + pdfHex(str) + '> Tj ET'); }
  function line(x1, y1, x2, y2, col, wd) { cv.push(pdfRgb(col) + ' RG ' + (wd || .5) + ' w ' + f2(x1) + ' ' + f2(PH - y1) + ' m ' + f2(x2) + ' ' + f2(PH - y2) + ' l S'); }
  function newPage() {
    cv = []; pages.push(cv); rect(0, 0, PW, 54, INK); rect(0, 54, PW, 4, '#f79506'); text(ML, 38, 'R+V', 22, true, '#ffffff');
    var at = appTitle.indexOf('@'), base = at < 0 ? appTitle : appTitle.slice(0, at), ad = at < 0 ? '' : appTitle.slice(at), wAd = pdfW(ad, 12, true);
    text(PW - ML - wAd, 36, base, 12, true, '#ffffff', 'r'); if (ad) text(PW - ML, 36, ad, 12, true, '#f79506', 'r'); y = 86;
  }
  newPage();
  var now = new Date(), its = c.items.filter(function (x) { return x.year === year && x.status === 'yes'; }).sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : a.start < b.start ? -1 : 1; });
  var sum = its.reduce(function (s, x) { return s + x.minutes; }, 0);
  text(ML, y + 16, title, 20, true, INK); y += 26;
  text(ML, y + 10, 'Kalenderjahr ' + year + ' (01.01. bis 31.12.' + year + ') · erstellt am ' + pad(now.getDate()) + '.' + pad(now.getMonth() + 1) + '.' + now.getFullYear(), 9, false, GREY); y += 26;
  [['Name', (c.firstName + ' ' + c.lastName).trim()], ['XV-Nummer', c.xv || '–'], ['gutBeraten-ID', c.gbId || 'nicht hinterlegt'], ['Bildungsdienstleister', c.provider || '–'], ['Lernform', 'Webinar live (Microsoft Teams)'], ['Weiterbildungspflicht', c.hours + ' Stunden je Kalenderjahr']].forEach(function (r) {
    text(ML, y + 10, r[0], 9.5, false, GREY); text(ML + 140, y + 10, pdfFit(r[1], CW - 140, 10, true), 10, true, INK); y += 17;
  });
  y += 8; rect(ML, y, CW, 46, '#f3f5f9'); rect(ML, y, 3, 46, '#f79506');
  text(ML + 14, y + 20, 'Anrechenbare Bildungszeit ' + year + ': ' + fmtMinutes(sum) + ' (' + sum + ' Minuten)', 12.5, true, INK);
  text(ML + 14, y + 36, its.length + ' bestätigte Veranstaltung' + (its.length === 1 ? '' : 'en') + ' · ' + Math.min(100, Math.round(sum / (c.hours * 60) * 100)) + ' % der Weiterbildungspflicht über diese Plattform', 9, false, GREY); y += 62;
  var X = [ML, ML + 66, ML + 140, ML + CW - 120, ML + CW - 62, ML + CW];
  function head() { rect(ML, y, CW, 18, '#e3e8f3'); ['Datum', 'Uhrzeit', 'IDD-Titel', 'Minuten', 'Bestätigt'].forEach(function (t, i) { if (i === 3) text(X[4] - 6, y + 12.5, t, 8.5, true, INK, 'r'); else text(X[i] + 4, y + 12.5, t, 8.5, true, INK); }); y += 18; }
  head();
  if (!its.length) { text(ML + 4, y + 14, 'Keine bestätigten Teilnahmen in diesem Kalenderjahr.', 9, false, GREY); y += 22; }
  its.forEach(function (x) {
    var tl = pdfWrap(x.iddTitle, X[3] - X[2] - 10, 9, false), cl = x.iddContent ? pdfWrap('Lerninhalt: ' + x.iddContent, X[3] - X[2] - 10, 7.5, false) : [], hh = Math.max(1, tl.length) * 11.5 + cl.length * 10 + 8;
    if (y + hh > PH - 90) { newPage(); head(); }
    text(X[0] + 4, y + 13, x.date.split('-').reverse().join('.'), 9, false, INK); text(X[1] + 4, y + 13, x.start + '–' + x.end, 9, false, INK);
    tl.forEach(function (l, i) { text(X[2] + 4, y + 13 + i * 11.5, l, 9, false, INK); });
    cl.forEach(function (l, i) { text(X[2] + 4, y + 13 + tl.length * 11.5 + i * 10, l, 7.5, false, GREY); });
    text(X[4] - 6, y + 13, String(x.minutes), 9, true, INK, 'r'); text(X[4] + 4, y + 13, x.confirmedAt ? x.confirmedAt.slice(0, 10).split('-').reverse().join('.') : '–', 9, false, INK);
    line(ML, y + hh, ML + CW, y + hh, LINE, .4); y += hh;
  });
  y += 18; if (y > PH - 110) newPage();
  ['Angerechnet sind nur Teilnahmen, die der LearnMaker oder die Administration bestätigt hat.', 'Begrüßung und Verabschiedung (je ' + (IDD.frame || 5) + ' Minuten) zählen nicht zur Lernzeit.', 'Teilnahmen eines Kalenderjahres sind ab dem 31.01. des Folgejahres nicht mehr änderbar.', 'Maschinell erstellt über ' + appTitle + '.'].concat(c.archivedNote ? [c.archivedNote] : []).forEach(function (t) { pdfWrap(t, CW, 8.5, false).forEach(function (l) { text(ML, y + 10, l, 8.5, false, GREY); y += 12; }); });
  var total = pages.length;
  pages.forEach(function (p, i) { cv = p; line(ML, PH - 34, ML + CW, PH - 34, LINE, .5); text(ML, PH - 22, pdfFit(appTitle + ' · ' + title + ' · ' + (c.firstName + ' ' + c.lastName).trim(), CW - 80, 8, false), 8, false, GREY); text(ML + CW, PH - 22, 'Seite ' + (i + 1) + ' von ' + total, 8, false, GREY, 'r'); });
  var objs = [], kids = [];
  objs[0] = '<< /Type /Catalog /Pages 2 0 R >>'; objs[1] = null;
  objs[2] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>';
  objs[3] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>';
  pages.forEach(function (p) { var st = p.join('\n'), ci = objs.length + 1; objs.push('<< /Length ' + st.length + ' >>\nstream\n' + st + '\nendstream'); objs.push('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' + PW + ' ' + PH + '] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ' + ci + ' 0 R >>'); kids.push(objs.length + ' 0 R'); });
  objs[1] = '<< /Type /Pages /Count ' + pages.length + ' /Kids [' + kids.join(' ') + '] >>';
  objs.push('<< /Title <FEFF' + pdfUtf16(title) + '> /Creator (LearnTogether) /Producer (LearnTogether) >>');
  var out = '%PDF-1.4\n', offs = [];
  objs.forEach(function (o, i) { offs.push(out.length); out += (i + 1) + ' 0 obj\n' + o + '\nendobj\n'; });
  var xr = out.length; out += 'xref\n0 ' + (objs.length + 1) + '\n0000000000 65535 f \n';
  offs.forEach(function (o) { out += ('0000000000' + o).slice(-10) + ' 00000 n \n'; });
  out += 'trailer\n<< /Size ' + (objs.length + 1) + ' /Root 1 0 R /Info ' + objs.length + ' 0 R >>\nstartxref\n' + xr + '\n%%EOF';
  return new Blob([out], { type: 'application/pdf' });
}
function viewProfile(q) {
  var ps = pageShell('Konto', 'Mein <span class="accent">Profil</span>', null, true);
  var box = h('div', null, loading()); ps.wrap.appendChild(box);
  if (!state.me) { clear(box); goLogin(); return ps.root; }
  function tile(label, value, sub) { return h('div', { class: 'st-kpi' }, [h('b', null, value), h('span', { text: label }), sub ? h('span', { class: 'hint', text: sub }) : null]); }
  function table(cols, rows) { return h('div', { class: 'tbl-wrap' }, h('table', { class: 'tbl', style: 'min-width:0' }, [h('thead', null, h('tr', null, cols.map(function (c) { return h('th', { text: c }); }))), h('tbody', null, rows.map(function (r) { return h('tr', null, r.map(function (c) { return h('td', null, c); })); }))])); }
  function publicBox(pub, me, avatarOk) {
    var v = { isPublic: !!pub.isPublic, showRating: !!pub.showRating, showExpert: !!pub.showExpert, showEmail: !!pub.showEmail, showUpcoming: !!pub.showUpcoming, showAvatar: !!pub.showAvatar, showBadges: !!pub.showBadges };
    var noAv = !avatarOk;
    var subs = [];
    function chk(key, label, hint, master) {
      var c = h('input', { type: 'checkbox', id: 'pp-' + key, checked: v[key] });
      c.addEventListener('change', function () { v[key] = c.checked; if (master) sync(); });
      var node = h('label', { class: 'chk' + (master ? ' master' : '') }, [c, h('span', null, [h('b', { text: label }), hint ? h('span', { class: 'hint', text: hint }) : null])]);
      if (!master) subs.push(c);
      return node;
    }
    function sync() { subs.forEach(function (c) { c.disabled = !v.isPublic || (c.id === 'pp-showAvatar' && noAv); }); }
    var bio = h('textarea', { id: 'pp-bio', rows: '4', maxlength: '300', placeholder: 'Zum Beispiel: Vertrieb ist für mich ein Handwerk. Ich teile gern, was im Alltag funktioniert.' }); bio.value = pub.bio || '';
    var count = h('span', { class: 'hint' }); function upd() { count.textContent = bio.value.length + ' / 300 Zeichen'; } bio.addEventListener('input', upd); upd();
    var msg = h('div', { class: 'notice', hidden: true, role: 'status' }), go = h('button', { type: 'button', class: 'btn btn-primary', text: 'Speichern' }), view = h('button', { type: 'button', class: 'btn btn-secondary', text: 'So sehen andere mein Profil', onclick: function () { openPublicProfile(me.username); } });
    var list = h('div', { class: 'chklist' }, [chk('isPublic', 'Mein Profil veröffentlichen', null, true),
      chk('showAvatar', 'Profilbild', noAv ? 'Wähle zuerst ein Profilbild aus oder lade eines hoch.' : 'Erscheint neben Deinem Benutzernamen im Profil.'), chk('showExpert', 'Themen mit Expertenstatus', 'Die Themen, in denen Du Experte bist.'), chk('showRating', 'Bewertung', 'Deine durchschnittliche Bewertung als LearnMaker.'), chk('showUpcoming', 'Anstehende Veranstaltungen', 'Andere können sich direkt aus Deinem Profil anmelden.'), chk('showEmail', 'E-Mail-Adresse', 'Andere können Dich damit kontaktieren.')]);
    sync();
    /* Abzeichen und Rakete erscheinen auch ohne oeffentliches Profil neben dem Benutzernamen, deshalb eigener Schalter */
    var bc = h('input', { type: 'checkbox', id: 'pp-badges', checked: v.showBadges });
    bc.addEventListener('change', function () { v.showBadges = bc.checked; });
    var badgeOpt = h('label', { class: 'chk' }, [bc, h('span', null, [h('b', { text: 'Abzeichen und Expertenstatus anzeigen' }), h('span', { class: 'hint', text: 'Erst mit Deiner Zustimmung erscheinen sie neben Deinem Benutzernamen, auch ohne öffentliches Profil. Ohne Haken siehst nur Du sie.' })])]);
    go.addEventListener('click', function () {
      go.disabled = true; var p = Object.assign({ bio: bio.value }, v);
      Api.saveProfile(p).then(function () { go.disabled = false; msg.hidden = false; msg.className = 'notice ok'; msg.textContent = v.isPublic ? 'Gespeichert. Dein Profil ist öffentlich.' : 'Gespeichert. Dein Profil ist nicht öffentlich.'; toast('Gespeichert.'); refreshMe(); }, function (er) { go.disabled = false; if (authFail(er)) return; msg.hidden = false; msg.className = 'notice bad'; msg.textContent = er.message; });
    });
    return h('section', { class: 'prof-sec', id: 'pub-box' }, [h('h2', { text: 'Öffentliches Profil' }),
      h('p', { class: 'hint', text: 'Wenn Du Dein Profil öffentlich machst, sehen andere Deinen Benutzernamen, Dein Abzeichen, die Zahl Deiner angebotenen Veranstaltungen und Deine Themen mit der Zahl der Veranstaltungen. Alles Weitere gibst Du einzeln frei.' }),
      h('div', { class: 'panel', style: 'display:flex;flex-direction:column;gap:16px;max-width:760px' }, [list, h('div', { class: 'chklist chk-sep' }, badgeOpt), field('Beschreibung (wie eine Bio)', bio, { id: 'pp-bio', hint: 'Frei formulierter Text für Dein öffentliches Profil, bis zu 300 Zeichen. Er erscheint nur, wenn Dein Profil öffentlich ist.' }), count, msg, h('div', { style: 'display:flex;gap:12px;flex-wrap:wrap' }, [go, view])])]);
  }
  function avatarDialog(r) {
    var body = h('div', { class: 'modal-body' }), m;
    var msg = h('div', { class: 'notice bad', role: 'alert', hidden: true });
    function done(p) { Api.setAvatar(p).then(function () { m.close(); toast(p.kind === 'none' ? 'Das Profilbild ist entfernt.' : 'Dein Profilbild ist gespeichert.'); route(); }, function (er) { if (authFail(er)) return; msg.hidden = false; msg.textContent = er.message; }); }
    var file = h('input', { type: 'file', accept: 'image/png,image/jpeg,image/webp', class: 'sr', tabindex: '-1' });
    file.addEventListener('change', function () {
      var f = file.files[0]; if (!f) return;
      if (!/^image\/(png|jpe?g|webp)$/.test(f.type) || f.size > 12 * 1024 * 1024) { msg.hidden = false; msg.textContent = 'Bitte wähle ein Bild im Format JPG, PNG oder WebP mit höchstens 12 MB.'; return; }
      var rd = new FileReader(); rd.onload = function () { var im = new Image(); im.onload = function () { openCropper(im, function (data) { done({ kind: 'upload', imageData: data }); }, { round: true, size: 400 }); }; im.src = rd.result; }; rd.readAsDataURL(f);
    });
    var acts = h('div', { style: 'display:flex;gap:12px;flex-wrap:wrap' }, [
      r.avatarUpload ? h('button', { type: 'button', class: 'btn btn-primary', text: 'Bild hochladen', onclick: function () { file.value = ''; file.click(); } }) : null,
      h('button', { type: 'button', class: r.avatarUpload ? 'btn btn-secondary' : 'btn btn-primary', text: 'Aus Bildern auswählen', onclick: function () { openAvatarPicker(r.avatar && r.avatar.kind === 'ph' ? r.avatar.id : '', function (id) { done({ kind: 'ph', id: id }); }); } }),
      r.avatar ? h('button', { type: 'button', class: 'btn btn-danger', text: 'Profilbild löschen', onclick: function () { done({ kind: 'none' }); } }) : null, file]);
    body.appendChild(h('h2', { text: 'Profilbild', style: 'padding-right:44px' }));
    body.appendChild(h('div', { class: 'prof-av-big' }, avatarNode(r.avatar, 160, 'Dein Profilbild')));
    body.appendChild(h('p', { class: 'hint', text: (r.avatarUpload ? 'Lade ein Foto hoch und wähle den Ausschnitt oder nimm eines unserer Bilder. ' : 'Das Hochladen eigener Fotos ist zurzeit abgeschaltet. Wähle eines unserer Bilder. ') + 'Andere sehen das Bild nur, wenn Du es unter „Veröffentlichung“ freigibst.' }));
    body.appendChild(msg); body.appendChild(acts);
    m = openModal(body, { label: 'Profilbild' });
  }
  function accountBox(me) {
    var I = {}, F = {};
    function mk(k, label, val, attrs) { I[k] = h('input', Object.assign({ id: 'ac-' + k, type: 'text', value: val || '', maxlength: '200' }, attrs || {})); F[k] = field(label, I[k], { id: 'ac-' + k, req: true }); return F[k]; }
    mk('firstName', 'Vorname', me.firstName, { autocomplete: 'given-name', maxlength: '60' }); mk('lastName', 'Nachname', me.lastName, { autocomplete: 'family-name', maxlength: '60' });
    mk('xv', 'XV-Nummer', me.xv, { autocomplete: 'off', maxlength: '14' }); mk('email', 'E-Mail-Adresse', me.email, { type: 'email', autocomplete: 'email' });
    mk('password', 'Aktuelles Passwort zur Bestätigung', '', { type: 'password', autocomplete: 'current-password', maxlength: '128' });
    var msg = h('div', { class: 'notice', hidden: true, role: 'status' }), go = h('button', { class: 'btn btn-primary', type: 'submit', text: 'Daten speichern' });
    var form = h('form', { class: 'form panel', style: 'gap:16px', novalidate: true }, [h('div', { class: 'grid2' }, [F.firstName, F.lastName]), h('div', { class: 'grid2' }, [F.xv, F.email]), h('div', { class: 'grid2' }, [F.password, h('div')]), msg, h('div', null, go)]);
    form.addEventListener('submit', function (e) {
      e.preventDefault(); msg.hidden = true; go.disabled = true;
      Api.updateAccount({ firstName: I.firstName.value, lastName: I.lastName.value, xv: I.xv.value, email: I.email.value, password: I.password.value }).then(function (j) { go.disabled = false; I.password.value = ''; setMe(j.me); toast('Deine Daten sind gespeichert.'); msg.hidden = false; msg.className = 'notice ok'; msg.textContent = 'Deine Daten sind gespeichert.'; },
        function (er) { go.disabled = false; if (authFail(er)) return; msg.hidden = false; msg.className = 'notice bad'; msg.textContent = er.message; });
    });
    return h('section', { class: 'prof-sec', id: 'acc-box' }, [h('h2', { text: 'Meine Daten ändern' }), h('p', { class: 'hint', text: 'Der Benutzername bleibt. XV-Nummer und E-Mail-Adresse dürfen nur zu einem Konto gehören. Bestätige Änderungen mit Deinem Passwort.' }), form]);
  }
  function passwordBox(forced) {
    var cur = h('input', { type: 'password', id: 'p-cur', autocomplete: 'current-password', maxlength: '128' }), n1 = h('input', { type: 'password', id: 'p-new', autocomplete: 'new-password', maxlength: '128' }), n2 = h('input', { type: 'password', id: 'p-new2', autocomplete: 'new-password', maxlength: '128' });
    var msg = h('div', { class: 'notice', hidden: true, role: 'status' }), go = h('button', { class: 'btn btn-primary', type: 'submit', text: 'Passwort ändern' });
    var form = h('form', { class: 'form panel', style: 'gap:16px;max-width:760px', novalidate: true }, [h('div', { class: 'grid3' }, [field('Aktuelles Passwort', cur, { id: 'p-cur', req: true }), field('Neues Passwort', n1, { id: 'p-new', req: true, hint: 'Mindestens 10 Zeichen.' }), field('Neues Passwort wiederholen', n2, { id: 'p-new2', req: true })]), msg, h('div', null, go)]);
    form.addEventListener('submit', function (e) {
      e.preventDefault(); msg.hidden = false;
      function say(cls, t) { msg.hidden = false; msg.className = 'notice ' + cls; msg.textContent = t; }
      if (n1.value !== n2.value) { say('bad', 'Die beiden neuen Passwörter stimmen nicht überein.'); return; }
      go.disabled = true;
      Api.changePassword(cur.value, n1.value).then(function () { go.disabled = false; say('ok', 'Das Passwort wurde geändert.'); cur.value = n1.value = n2.value = ''; return refreshMe(); }, function (er) { go.disabled = false; if (authFail(er)) return; say('bad', er.message); });
    });
    return h('section', { class: 'prof-sec', id: 'pw-box' }, [h('h2', { text: 'Passwort ändern' }), forced ? h('div', { class: 'notice warn', role: 'alert', style: 'margin-bottom:12px' }, h('div', { class: 'n-body' }, [h('b', { text: 'Bitte vergib ein eigenes Passwort' }), h('div', { text: 'Dein Konto nutzt noch ein vorläufiges Passwort. Wähle jetzt ein neues, bevor Du weitermachst.' })])) : null, form]);
  }
  /* Browser-Benachrichtigungen: nur mit HTTPS (sicherer Kontext); Einstellung gilt je Geraet und Browser */
  function notifyBox() {
    var kids = [h('h2', { text: 'Benachrichtigungen' }), h('p', { class: 'hint', text: 'Neue Mitteilungen siehst Du immer oben in der Navigation und auf der Startseite. Zusätzlich kann Dein Browser Dich mit einer Systemmeldung hinweisen, solange die Anwendung in einem Tab geöffnet ist.' })];
    if (!notifySupported()) kids.push(h('div', { class: 'notice', role: 'status' }, h('div', { class: 'n-body' }, [h('b', { text: 'Auf diesem Gerät nicht verfügbar' }), h('div', { text: window.isSecureContext === false ? 'Browser-Benachrichtigungen brauchen eine verschlüsselte Verbindung (HTTPS). Sobald die Anwendung über HTTPS läuft, kannst Du sie hier einschalten.' : 'Dieser Browser unterstützt keine Benachrichtigungen.' })])));
    else {
      var st = h('p', { class: 'hint', 'aria-live': 'polite' });
      var on = h('input', { type: 'checkbox', id: 'nt-on', checked: notifyOn() });
      function upd() { st.textContent = Notification.permission === 'denied' ? 'Der Browser blockiert Benachrichtigungen. Erlaube sie in den Website-Einstellungen des Browsers.' : (notifyOn() ? 'Eingeschaltet auf diesem Gerät.' : 'Ausgeschaltet.'); on.checked = notifyOn(); }
      on.addEventListener('change', function () {
        if (!on.checked) { store.del('lt_notify'); upd(); return; }
        Notification.requestPermission().then(function (p) { if (p === 'granted') { store.set('lt_notify', '1'); startNotifyPoll(); toast('Benachrichtigungen sind eingeschaltet.'); } upd(); });
      });
      upd();
      kids.push(h('div', { class: 'panel', style: 'max-width:760px;display:flex;flex-direction:column;gap:8px' }, [h('label', { class: 'chk' }, [on, h('span', null, [h('b', { text: 'Browser-Benachrichtigungen bei neuen Mitteilungen' }), h('span', { class: 'hint', text: 'Gilt nur für diesen Browser auf diesem Gerät.' })])]), st]));
    }
    return h('section', { class: 'prof-sec', id: 'notify-box' }, kids);
  }
  /* IDD-Angaben: Pflicht, 15 oder 30 Stunden, gutBeraten-ID. Ohne IDD-Pflicht entfallen alle IDD-Optionen. */
  function iddBox(me) {
    if (!iddOn()) return null;
    var duty = h('input', { type: 'checkbox', id: 'idd-duty', checked: !!me.iddDuty });
    var h15 = h('input', { type: 'radio', name: 'idd-h', id: 'idd-h15', value: '15', checked: me.iddHours !== 30 }), h30 = h('input', { type: 'radio', name: 'idd-h', id: 'idd-h30', value: '30', checked: me.iddHours === 30 });
    var gb = h('input', { type: 'text', id: 'idd-gb', value: me.gbId || '', maxlength: '14', autocomplete: 'off', placeholder: 'XXXX-XXXX-XXXX', style: 'text-transform:uppercase' });
    var more = h('div', { class: 'grid2' }, [field('Weiterbildungspflicht je Kalenderjahr', h('div', { class: 'seg', role: 'radiogroup', 'aria-label': 'Stunden je Kalenderjahr' }, [h('label', null, [h15, '15 Stunden']), h('label', null, [h30, '30 Stunden'])]), { legend: true }), field('gutBeraten-ID', gb, { id: 'idd-gb', hint: '12 Buchstaben oder Ziffern in drei Blöcken. Nötig, damit Deine Zeiten an gutBeraten gemeldet werden können.' })]);
    function sync() { more.hidden = !duty.checked; }
    duty.addEventListener('change', sync); sync();
    var msg = h('div', { class: 'notice', hidden: true, role: 'status' }), go = h('button', { type: 'button', class: 'btn btn-primary', text: 'IDD-Angaben speichern' });
    go.addEventListener('click', function () {
      go.disabled = true; msg.hidden = true;
      Api.saveIdd({ duty: duty.checked, hours: h30.checked ? 30 : 15, gbId: gb.value }).then(function (j) { go.disabled = false; setMe(j.me); toast('Deine IDD-Angaben sind gespeichert.'); route(); }, function (er) { go.disabled = false; if (authFail(er)) return; msg.hidden = false; msg.className = 'notice bad'; msg.textContent = er.message; });
    });
    return h('section', { class: 'prof-sec', id: 'idd-box' }, [h('h2', { text: 'IDD-Weiterbildung' }), h('p', { class: 'hint', text: 'Bist Du IDD-pflichtig, rechnet die Anwendung bestätigte Teilnahmen an IDD-Veranstaltungen an. Dein IDD-Cockpit erscheint nach der ersten bestätigten Teilnahme.' }),
      h('div', { class: 'panel', style: 'max-width:760px;display:flex;flex-direction:column;gap:16px' }, [h('label', { class: 'chk' }, [duty, h('span', null, [h('b', { text: 'Ich bin IDD-pflichtig' }), h('span', { class: 'hint', text: 'Ohne Haken entfallen alle IDD-Angaben in Deinem Konto.' })])]), more, msg, h('div', null, go)])]);
  }
  /* Meine Daten: Auskunft als Datei und Konto loeschen */
  function dataBox(me) {
    var msg = h('div', { class: 'notice bad', role: 'alert', hidden: true });
    var dl = h('button', { type: 'button', class: 'btn btn-secondary', html: ico('download') + ' Meine Daten herunterladen' });
    dl.addEventListener('click', function () {
      if (CFG.mode === 'artifact') { toast('Downloads sind in der Artefakt-Vorschau gesperrt. In der IIS-Version wird die Datei heruntergeladen.', true); return; }
      dl.disabled = true;
      Api.myData().then(function (blob) { dl.disabled = false; var url = URL.createObjectURL(blob), a = h('a', { href: url, download: 'LearnTogether-meine-Daten.json' }); document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(url); }, 2000); toast('Die Datei mit Deinen Daten ist gespeichert.'); },
        function (er) { dl.disabled = false; if (authFail(er)) return; msg.hidden = false; msg.textContent = er.message; });
    });
    var kids = [h('h2', { text: 'Meine Daten' }), h('p', { class: 'hint', text: 'Lade alle Daten herunter, die zu Deinem Konto gespeichert sind: Kontodaten, Freigaben, Veranstaltungen, Anmeldungen, Deine Bewertungen und Mitteilungen.' }), h('div', { style: 'margin-bottom:24px' }, dl)];
    if (me.role === 'superadmin') kids.push(h('p', { class: 'hint', text: 'Das Konto der Hauptadministration lässt sich nicht löschen.' }));
    else {
      var pw = h('input', { type: 'password', id: 'del-pw', autocomplete: 'current-password', maxlength: '128' });
      var del = twoStep(h('button', { type: 'button', class: 'btn btn-danger', text: 'Konto löschen' }), 'Konto löschen', 'Endgültig löschen?', function (reset) {
        msg.hidden = true;
        Api.deleteAccount(pw.value).then(function () { setMe(null); toast('Dein Konto ist gelöscht.'); location.hash = '#/'; }, function (er) { reset(); if (authFail(er)) return; msg.hidden = false; msg.textContent = er.message; });
      });
      kids.push(h('h3', { text: 'Konto löschen' }), h('p', { class: 'hint', text: 'Dein Konto, Deine Kontaktdaten und Dein Profilbild werden sofort gelöscht. Deine künftigen Veranstaltungen werden abgesagt, Angemeldete erhalten eine Mitteilung. Vergangene Veranstaltungen und Teilnahmen bleiben nur anonym für die Statistik erhalten. Das lässt sich nicht rückgängig machen.' }), iddOn() && me.iddDuty ? h('div', { class: 'notice warn', role: 'status' }, h('div', { class: 'n-body' }, [h('b', { text: 'IDD-Nachweise' }), h('div', { text: 'Für den gesetzlichen Nachweis hebt die Administration Deine bestätigten IDD-Teilnahmen bis zum Ende der Aufbewahrungsfrist auf: Name, XV-Nummer, gutBeraten-ID, Veranstaltung, Datum und IDD-Zeit. Alles andere wird gelöscht.' })])) : null,
        h('div', { class: 'form panel', style: 'gap:16px;max-width:760px' }, [h('div', { class: 'grid2' }, [field('Passwort zur Bestätigung', pw, { id: 'del-pw', req: true }), h('div')]), h('div', null, del)]));
    }
    kids.push(msg);
    return h('section', { class: 'prof-sec', id: 'data-box' }, kids);
  }
  Promise.all([Api.profile(), iddOn() && state.me.iddDuty ? Api.iddCockpit().catch(function () { return null; }) : null]).then(function (res) {
    var r = res[0], ck = res[1];
    clear(box); var me = r.me, b = r.badge, o = r.offered, a = r.attended;
    var experts = r.topics.filter(function (t) { return t.expert; });
    /* Kopf: Benutzername mit Abzeichen und Expertenstatus */
    var avBox = h('div', { class: 'prof-av' }, [avatarNode(r.avatar, 104, 'Dein Profilbild'), h('button', { type: 'button', class: 'linkbtn', id: 'av-edit', text: r.avatar ? 'Profilbild ändern' : 'Profilbild wählen', onclick: function () { avatarDialog(r); } })]);
    box.appendChild(h('div', { class: 'panel prof-head' }, [avBox, h('div', { class: 'prof-head-main' }, [h('div', { class: 'prof-name' }, [h('span', { class: 'prof-un', text: me.username }), badgeNode(b.level, true), experts.length ? rocketNode(true) : null, h('button', { type: 'button', class: 'btn btn-secondary btn-sm prof-out', text: 'Abmelden', onclick: function () { Api.logout().then(function () { setMe(null); toast('Du bist abgemeldet.'); location.hash = '#/'; }); } })]),
      h('div', { class: 'hint', text: (b.level ? badgeLabel(b.level) + '. ' : 'Noch kein Abzeichen. ') + (b.next ? 'Noch ' + (b.next - b.offered) + ' durchgeführte Veranstaltung' + (b.next - b.offered === 1 ? '' : 'en') + ' bis zur nächsten Stufe.' : 'Höchste Stufe erreicht.') }), r.avatar && r.avatar.hidden ? h('div', { class: 'hint', text: 'Hochgeladene Profilbilder sind zurzeit abgeschaltet. Dein Bild ist nur für Dich sichtbar.' }) : null])]));
    var facts = h('dl', { class: 'facts f4 panel' }, [
      h('div', null, [h('dt', { text: 'Benutzername' }), h('dd', { text: me.username })]), h('div', null, [h('dt', { text: 'Name' }), h('dd', { text: me.firstName + ' ' + me.lastName })]),
      h('div', null, [h('dt', { text: 'XV-Nummer' }), h('dd', { text: me.xv || '–' })]), h('div', null, [h('dt', { text: 'E-Mail-Adresse' }), h('dd', { class: 'dd-mail', text: me.email, title: me.email })])]);
    var kp = h('div', { class: 'st-kpis', style: 'margin-top:28px' }, [
      tile('Angebotene Sessions', String(o.held), o.upcoming ? o.upcoming + ' geplant' + (o.cancelled ? ', ' + o.cancelled + ' abgesagt' : '') : (o.cancelled ? o.cancelled + ' abgesagt' : 'durchgeführt')),
      tile('Teilgenommen', String(a.held), a.upcoming ? a.upcoming + ' angemeldet' : 'besuchte Sessions'),
      tile('Meine Bewertung als LearnMaker', o.ratingCount ? ratingNode(o.ratingAvg, o.ratingCount) : h('span', { class: 'rating', title: 'Noch keine Bewertung' }, [h('span', { class: 'stars', 'aria-hidden': 'true', text: starsText(0) }), ' 0,0']), (function () { var ev = o.list.filter(function (x) { return !x.cancelled && x.ratingCount > 0; }).length; return o.ratingCount + ' Bewertung' + (o.ratingCount === 1 ? '' : 'en') + ' aus ' + ev + ' Veranstaltung' + (ev === 1 ? '' : 'en'); })()),
      tile('Teilnehmende bei mir', String(o.list.reduce(function (s, x) { return s + (x.cancelled ? 0 : x.booked); }, 0)), o.held ? 'Ø ' + fmtAvg(o.list.reduce(function (s, x) { return s + (x.cancelled ? 0 : x.booked); }, 0) / Math.max(1, o.list.filter(function (x) { return !x.cancelled; }).length)) + ' je Session' : null),
      tile('Meine Bewertungen', String(a.rated), a.held ? 'von ' + a.held + ' besuchten Sessions' : null),
      tile('Expertenstatus', String(experts.length), experts.length ? experts.map(function (t) { return capFirst(t.topic); }).join(', ') : 'ab ' + b.expertMin + ' Sessions je Thema')]);
    var lv = h('div', { class: 'levels' }, b.levels.map(function (t, i) { return h('div', { class: 'lvl' + (b.level === i + 1 ? ' cur' : '') + (b.level > i ? ' got' : '') }, [badgeNode(i + 1, true), h('b', { text: BADGE_NAMES[i] }), h('span', { class: 'hint', text: 'ab ' + t + (t === 1 ? ' Session' : ' Sessions') })]); }).concat(b.level === 7 ? [h('div', { class: 'lvl cur got' }, [badgeNode(7, true), h('b', { text: SECRET_NAME }), h('span', { class: 'hint', text: 'Das Einhorn unter den LearnMakern' })])] : []));
    function sec(title, hint, kids) { return h('section', { class: 'prof-sec' }, [h('h2', null, title), hint ? h('p', { class: 'hint', text: hint }) : null].concat(kids)); }
    function overview() {
      var hiddenBadge = (b.level || experts.length) && !r.pub.showBadges ? h('div', { class: 'notice', role: 'status', style: 'margin-top:16px' }, h('div', { class: 'n-body' }, [h('b', { text: 'Dein Abzeichen siehst nur Du' }), h('div', null, ['Andere sehen Abzeichen und Rakete erst, wenn Du zustimmst. ', h('a', { href: '#/profil?tab=oeffentlich', text: 'Unter Veröffentlichung freigeben' })])])) : null;
      return h('div', null, [facts, hiddenBadge, h('p', { class: 'hint', style: 'margin-top:8px', text: 'Name, XV-Nummer und E-Mail-Adresse sehen nur Du und die Administration. Für andere erscheint nur Dein Benutzername. Ändern kannst Du sie unter „Konto“.' }), kp,
        sec('Abzeichen', 'Das Abzeichen richtet sich nach der Zahl Deiner durchgeführten Veranstaltungen. Es erscheint neben Deinem Benutzernamen. Unter „Veröffentlichung“ kannst Du es ausblenden.', [lv]),
        sec([rocketNode(), ' Themen und Expertenstatus'], 'Ab ' + b.expertMin + ' Veranstaltungen in einem Thema erhältst Du dort den Expertenstatus. Dann erscheint die Rakete neben Deinem Namen auf der Kachel.',
          [r.topics.length ? table(['Bereich', 'Thema', 'Sessions', 'Status'], r.topics.slice().sort(function (x, y) { return y.count - x.count; }).map(function (t) { return [CAT_LABEL[t.category] || t.category, capFirst(t.topic), String(t.count), t.expert ? h('span', { class: 'utag' }, [rocketNode(), ' Experte']) : 'noch ' + (b.expertMin - t.count) + ' bis zum Expertenstatus']; })) : h('p', { class: 'hint', text: 'Du hast noch keine Veranstaltung durchgeführt.' })])]);
    }
    function offeredTab() {
      return sec('Meine Veranstaltungen', 'Alle Deine durchgeführten und abgesagten Sessions mit der Bewertung durch die Teilnehmenden.', [
        o.list.length ? table(['Datum', 'Veranstaltung', 'Thema', 'Teilnehmende', 'Bewertung'], o.list.slice().sort(function (x, y) { return x.date < y.date ? 1 : -1; }).map(function (x) { return [h('span', { class: 'nowrap', text: dateFull(x.date) }), x.title, CAT_LABEL[x.category] + ' · ' + capFirst(x.topic), x.cancelled ? h('span', { class: 'tag past', text: 'abgesagt' }) : String(x.booked), x.cancelled ? '–' : ratingNode(x.ratingAvg, x.ratingCount)]; })) : h('p', { class: 'hint', text: 'Noch nichts im Archiv.' })]);
    }
    function attendedTab() {
      return sec('Meine Teilnahmen', 'Alle Veranstaltungen, die Du besucht hast, mit Deiner Bewertung.', [
        a.list.length ? table(['Datum', 'Veranstaltung', 'Thema', 'Angeboten von', 'Meine Bewertung'], a.list.slice().sort(function (x, y) { return x.date < y.date ? 1 : -1; }).map(function (x) { return [h('span', { class: 'nowrap', text: dateFull(x.date) }), x.title, CAT_LABEL[x.category] + ' · ' + capFirst(x.topic), userTag(x.host, x.hostLevel, false), x.rating ? ratingNode(x.rating, 1, true) : h('span', { class: 'hint', text: 'nicht bewertet' })]; })) : h('p', { class: 'hint', text: 'Du hast noch an keiner Veranstaltung teilgenommen.' })]);
    }
    function accountTab() { return h('div', null, [accountBox(me), passwordBox(!!me.mustChange), iddBox(me), notifyBox(), dataBox(me)]); }
    if (me.mustChange) sess.set('lt_tab_prof', 'konto'); else if (q && q.tab) sess.set('lt_tab_prof', q.tab);
    box.appendChild(tabs('lt_tab_prof', [['uebersicht', 'Übersicht', null, overview], ['veranstaltungen', 'Veranstaltungen', o.list.length, offeredTab], ['teilnahmen', 'Teilnahmen', a.list.length, attendedTab], ['oeffentlich', 'Veröffentlichung', null, function () { return publicBox(r.pub, me, !!r.avatar && !r.avatar.hidden); }], ['konto', 'Konto', null, accountTab]].concat(ck && ck.duty && ck.items.some(function (x) { return x.status === 'yes'; }) ? [['idd', 'IDD-Cockpit', null, function () { return iddCockpit(ck); }]] : [])));
    if (me.mustChange) setTimeout(function () { var p = $('#p-cur'); if (p) p.focus(); }, 30);
  }, function (er) { if (authFail(er)) return; clear(box); box.appendChild(h('div', { class: 'notice bad', text: er.message })); });
  return ps.root;
}

/* ---- Handbuch ---- */
function viewManual() {
  var root = h('div', { class: 'page' }, h('div', { class: 'wrap' })), wrap = root.firstChild;
  wrap.appendChild(topline('Hilfe')); wrap.appendChild(h('h1', { html: 'Nutzer<span class="accent">handbuch</span>' }));
  wrap.appendChild(h('p', { class: 'lead', text: 'So nutzt Du ' + state.settings.appTitle + ': Veranstaltungen finden, Dich anmelden, stornieren und selbst etwas anbieten.' }));
  var tools = h('div', { class: 'manual-tools' });
  if (CFG.pdfUrl) tools.appendChild(h('a', { class: 'btn btn-primary', href: rel(CFG.pdfUrl), download: 'LearnTogether-Nutzerhandbuch.pdf', html: ico('download') + ' Als PDF herunterladen' }));
  if (mode === 'server' && CFG.manualUrl) tools.appendChild(h('a', { class: 'btn btn-secondary', href: rel(CFG.manualUrl), target: '_blank', rel: 'noopener', html: ico('ext') + ' In neuem Tab öffnen' }));
  wrap.appendChild(tools);
  var body = h('div', { class: 'manual-body' }), toc = h('nav', { class: 'manual-toc', 'aria-label': 'Inhalt' });
  function fill(html) {
    body.innerHTML = html; clear(toc);
    $$('h2', body).forEach(function (hh, i) { hh.id = 'kap-' + (i + 1); toc.appendChild(h('a', { href: '#/handbuch', text: hh.textContent, onclick: function (e) { e.preventDefault(); hh.scrollIntoView({ behavior: 'smooth' }); } })); });
  }
  /* Auf dem IIS wird der Inhalt erst beim Aufruf geladen; im Artefakt ist er eingebettet */
  if (CFG.manualHtml) fill(CFG.manualHtml);
  else if (CFG.manualBodyUrl) { body.appendChild(loading()); fetch(rel(CFG.manualBodyUrl), { cache: 'no-cache' }).then(function (r) { if (!r.ok) throw new Error(); return r.text(); }).then(function (t) { fill(t.replace(/src="AppData\//g, 'src="' + BASE + 'AppData/')); }, function () { fill('<p>Das Handbuch konnte nicht geladen werden. Bitte versuche es später erneut.</p>'); }); }
  else fill('<p>Das Handbuch ist in dieser Version nicht enthalten.</p>');
  wrap.appendChild(h('div', { class: 'manual-layout' }, [toc, body]));
  return root;
}

/* ---- Admin ---- */
/* ====================================================== PDF-Grundfunktionen (Statistik, IDD-Nachweis), ohne Bibliothek */
/* ---- PDF-Erzeugung (ohne Bibliothek, Standardschrift Helvetica) ---- */
var PDF_W = {
  r: [278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584, 584, 556, 1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556, 333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556, 556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584],
  b: [278, 333, 474, 556, 556, 889, 722, 238, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 333, 333, 584, 584, 584, 611, 975, 722, 722, 722, 722, 667, 611, 778, 722, 278, 556, 722, 611, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 333, 278, 333, 584, 556, 333, 556, 611, 556, 611, 556, 333, 611, 611, 278, 278, 556, 278, 889, 611, 611, 611, 611, 389, 556, 333, 611, 556, 778, 556, 556, 500, 389, 280, 389, 584]
};
var PDF_CP = { '€': 128, '…': 133, '‘': 145, '’': 146, '“': 147, '”': 148, '„': 132, '•': 149, '–': 150, '—': 151 };
function pdfByte(ch) { var c = ch.charCodeAt(0); if (PDF_CP[ch]) return PDF_CP[ch]; return c < 256 ? c : 63; }
function pdfBase(ch) { return 'ÄÀÁÂÃÅ'.indexOf(ch) >= 0 ? 'A' : 'ÖÒÓÔÕ'.indexOf(ch) >= 0 ? 'O' : 'ÜÙÚÛ'.indexOf(ch) >= 0 ? 'U' : 'äàáâãå'.indexOf(ch) >= 0 ? 'a' : 'öòóôõ'.indexOf(ch) >= 0 ? 'o' : 'üùúû'.indexOf(ch) >= 0 ? 'u' : 'éèêë'.indexOf(ch) >= 0 ? 'e' : 'ÉÈÊË'.indexOf(ch) >= 0 ? 'E' : ch; }
function pdfW(str, size, bold) {
  var t = bold ? PDF_W.b : PDF_W.r, w = 0;
  for (var i = 0; i < str.length; i++) {
    var ch = pdfBase(str[i]), c = ch.charCodeAt(0);
    w += c >= 32 && c <= 126 ? t[c - 32] : ch === 'ß' ? 611 : ch === '–' || ch === '—' ? 556 : ch === '…' ? 1000 : ch === '·' ? 278 : 556;
  }
  return w * size / 1000;
}
function pdfFit(str, width, size, bold) { str = String(str); if (pdfW(str, size, bold) <= width) return str; while (str.length > 1 && pdfW(str + '…', size, bold) > width) str = str.slice(0, -1); return str.replace(/\s+$/, '') + '…'; }
function pdfHex(str) { var o = ''; for (var i = 0; i < str.length; i++) { var b = pdfByte(str[i]).toString(16); o += (b.length < 2 ? '0' : '') + b; } return o.toUpperCase(); }
function pdfRgb(hex) { var n = parseInt(hex.slice(1), 16); return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255].map(function (v) { return Math.round(v * 1000) / 1000; }).join(' '); }

function pdfUtf16(s) { var o = ''; for (var i = 0; i < s.length; i++) { var h4 = s.charCodeAt(i).toString(16); o += ('0000' + h4).slice(-4); } return o.toUpperCase(); }
function saveBlob(blob, name) {
  if (CFG.mode === 'artifact') { toast('Downloads sind in der Artefakt-Vorschau gesperrt. In der IIS-Version wird ' + name + ' heruntergeladen.', true); return; }
  var url = URL.createObjectURL(blob), a = h('a', { href: url, download: name }); document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
}

function viewAdmin() {
  var root = h('div', { class: 'page' }, h('div', { class: 'wrap wide' })), wrap = root.firstChild;
  var SECTIONS = [
    ['Übersicht', [['events', 'Veranstaltungen', 'Veranstaltungen und Anmeldungen'], ['users', 'Nutzer', 'Konten und Rechte'], ['archive', 'Archiv', 'Archiv der Veranstaltungen'], ['stats', 'Statistik', 'Statistik und Berichte'], ['idd', 'IDD', 'IDD-Veranstaltungen und Teilnahmen'], ['iddarchiv', 'IDD-Archiv', 'IDD-Nachweise gelöschter Konten']]],
    ['Katalog', [['texts', 'Texte', 'Texte im Katalog'], ['taxonomy', 'Themen', 'Themenbereiche und Themen'], ['types', 'Arten', 'Arten der Veranstaltung'], ['photos', 'Fotos', 'Fotos als Platzhalterbilder'], ['badges', 'Abzeichen', 'Abzeichen und Expertenstatus']]],
    ['System', [['general', 'Allgemein', 'Allgemeine Einstellungen'], ['iddset', 'IDD-Einstellungen', 'IDD-Einstellungen'], ['testdata', 'Testdaten', 'Testdaten'], ['manual', 'Handbuch', 'Handbuch für Administrierende']]]
  ];
  var section = sess.get('lt_admin_sec') || 'events';
  function panel() {
    clear(wrap);
    wrap.appendChild(h('div', { style: 'display:flex;gap:16px;align-items:center;flex-wrap:wrap' }, [h('div', { style: 'flex:1' }, [topline('Verwaltung'), h('h1', { text: 'Administration' })])]));
    var nav = h('nav', { class: 'admin-nav', 'aria-label': 'Bereiche der Administration' }), content = h('div', { class: 'admin-content' }), head = h('h2', { class: 'admin-title' }), body = h('div');
    content.appendChild(head); content.appendChild(body);
    SECTIONS.forEach(function (g) {
      nav.appendChild(h('div', { class: 'admin-grp' }, [h('h3', { text: g[0] })].concat(g[1].map(function (it) {
        return h('button', { type: 'button', text: it[1], 'data-sec': it[0], 'aria-current': section === it[0] ? 'page' : null, onclick: function () { section = it[0]; sess.set('lt_admin_sec', section); $$('button', nav).forEach(function (x) { if (x.getAttribute('data-sec') === section) x.setAttribute('aria-current', 'page'); else x.removeAttribute('aria-current'); }); draw(); } });
      }))));
    });
    /* Sicherheitshinweise fuer den Betrieb: Testdaten mit bekanntem Passwort, unverschluesselte Verbindung */
    var warn = h('div', { class: 'admin-warn' }); wrap.appendChild(warn);
    Api.adminSettings().then(function (st) {
      if (st.testUsers || st.testEvents) warn.appendChild(h('div', { class: 'notice warn', role: 'status' }, h('div', { class: 'n-body' }, [h('b', { text: 'Testdaten sind geladen' }), h('div', { text: st.testUsers + ' Testkonten und ' + st.testEvents + ' Testveranstaltungen. Die Testkonten haben ein bekanntes Passwort. Entferne sie vor dem Produktivbetrieb unter System › Testdaten.' })])));
      if (mode === 'server' && !st.https) warn.appendChild(h('div', { class: 'notice warn', role: 'status' }, h('div', { class: 'n-body' }, [h('b', { text: 'Verbindung ohne HTTPS' }), h('div', { text: 'Passwörter und Sitzungen gehen unverschlüsselt durchs Netz. Betreibe die Anwendung nur im internen Netz und richte nach Möglichkeit HTTPS ein.' })])));
    }, function () { });
    wrap.appendChild(h('div', { class: 'admin-layout' }, [nav, content]));
    function draw() {
      var meta = null; SECTIONS.forEach(function (g) { g[1].forEach(function (it) { if (it[0] === section) meta = it; }); });
      if (!meta) { section = 'events'; meta = SECTIONS[0][1][0]; }
      head.textContent = meta[2]; clear(body); body.appendChild(loading());
      var fn = { events: adminEvents, archive: adminArchive, stats: adminStats, manual: adminManual, texts: adminTexts, taxonomy: adminTaxonomy, types: adminTypes, badges: adminBadges, photos: adminPhotos, users: adminUsers, general: adminGeneral, testdata: adminTest, idd: adminIdd, iddset: adminIddSet, iddarchiv: adminIddArchiveView }[section];
      fn().then(function (n) { clear(body); body.appendChild(n); }, function (er) { if (authFail(er)) return; clear(body); body.appendChild(h('div', { class: 'notice bad', text: er.message })); });
    }
    draw();
  }
/*__STATS__*/
  function adminEvents() {
    return Api.adminEvents().then(function (all) {
      var list = all.filter(function (e) { return !eventEnded(e); });
      var F = { q: '', cat: '', type: '', topic: '', from: '', to: '' };
      var host = h('div'), count = h('span', { class: 'hint', 'aria-live': 'polite' });
      var search = h('input', { type: 'search', id: 'af-q', placeholder: 'Titel, Benutzername, Name, E-Mail, Thema …', 'aria-label': 'Veranstaltungen durchsuchen' });
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
          sortTopics(TOPICS[c]).forEach(function (t) { g.appendChild(h('option', { value: c + '|' + t, text: capFirst(t) })); });
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
        if (F.q && (e.title + ' ' + e.host + ' ' + (e.owner ? e.owner.firstName + ' ' + e.owner.lastName + ' ' + e.owner.email + ' ' + e.owner.xv : '') + ' ' + e.topic + ' ' + e.type + ' ' + CAT_LABEL[e.category]).toLowerCase().indexOf(F.q) < 0) return false;
        if (F.cat && e.category !== F.cat) return false;
        if (F.type && e.type !== F.type) return false;
        if (F.topic && (e.category + '|' + e.topic) !== F.topic) return false;
        if (F.from && e.date < F.from) return false;
        if (F.to && e.date > F.to) return false;
        return true;
      }
      function reload() { return Api.adminEvents().then(function (l) { list = l.filter(function (e) { return !eventEnded(e); }); render(); if (peopleId) { if (list.some(function (x) { return x.id === peopleId; })) showPeople(peopleId); else if (peopleModal) peopleModal.close(); } }); }
      function render() {
        clear(host);
        var now = new Date();
        var items = list.filter(matches).sort(function (a, b) { return startDate(a) - startDate(b); });
        var active = !!(F.q || F.cat || F.type || F.topic || F.from || F.to); resetBtn.hidden = !active; count.textContent = (active ? items.length + ' von ' : '') + list.length + ' Veranstaltungen (ohne beendete, siehe Archiv), ' + items.reduce(function (s, e) { return s + e.booked; }, 0) + ' Anmeldungen' + (active ? ' in der Auswahl' : ' insgesamt');
        if (!items.length && active) { host.appendChild(h('div', { class: 'empty' }, [h('h2', { text: 'Nichts gefunden' }), h('p', { text: 'Für diese Filter gibt es keine Veranstaltung. Passe Suche, Filter oder Zeitraum an.' })])); return; }
        if (!items.length) { host.appendChild(h('div', { class: 'empty' }, [h('h2', { text: 'Keine Veranstaltungen' }), h('p', { text: 'Lege Veranstaltungen über „Veranstaltung anbieten“ an oder lade Testdaten. Beendete Veranstaltungen findest Du im Archiv.' })])); return; }
        var tb = h('tbody');
        items.forEach(function (e) {
          var past = startDate(e) <= now, f = freeOf(e), pct = Math.min(100, Math.round(e.booked / e.capacity * 100));
          var del = h('button', { class: 'btn btn-danger btn-sm', type: 'button', text: 'Löschen' });
          del.addEventListener('click', function () {
            if (del._c) { Api.adminDeleteEvent(e.id).then(function () { toast('Veranstaltung gelöscht.'); return reload(); }, function (er) { toast(er.message, true); }); return; }
            del._c = true; del.setAttribute('data-c', '1'); del.textContent = 'Wirklich löschen?'; setTimeout(function () { del._c = false; del.removeAttribute('data-c'); del.textContent = 'Löschen'; }, 4000);
          });
          tb.appendChild(h('tr', { class: e.cancelled ? 'past' : '' }, [
            h('td', { class: 'c-title' }, [h('b', { text: e.title }), h('div', { class: 'meta' }, [h('span', { class: 'tag cat-' + e.category, text: CAT_LABEL[e.category] }), h('span', { text: e.type + ' · ' + capFirst(e.topic) }), e.isTest ? h('span', { class: 'tag test', text: 'Testdaten' }) : null, e.cancelled ? h('span', { class: 'tag past', text: 'abgesagt' }) : null]), ]),
            h('td', { class: 'c-when' }, [h('b', { text: dateFull(e.date) }), h('div', { class: 'hint', text: e.start + '–' + endHm(e) + ' Uhr' })]),
            h('td', { class: 'c-host' }, [userTag(e.host, e.hostLevel, e.hostExpert), e.owner ? h('div', { class: 'hint', text: e.owner.firstName + ' ' + e.owner.lastName + ' · ' + e.owner.xv }) : null, e.owner ? h('div', { class: 'hint', text: e.owner.email }) : null]),
            h('td', { class: 'c-occ' }, [h('b', { text: e.booked + ' / ' + e.capacity }), h('div', { class: 'bar' + (f <= 0 ? ' full' : f <= 5 ? ' warn' : '') }, h('i', { style: 'width:' + pct + '%' }))]),
            h('td', { class: 'c-act' }, h('div', { class: 'acts' }, [
              h('button', { class: 'btn btn-primary btn-sm', type: 'button', text: 'Teilnehmende (' + e.booked + ')', onclick: function () { showPeople(e.id); } }),
              h('button', { class: 'btn btn-secondary btn-sm', type: 'button', text: 'Bearbeiten', onclick: function () { editEvent(e, reload); } }), del]))]));
        });
        host.appendChild(h('div', { class: 'tbl-wrap' }, h('table', { class: 'tbl tbl-events' }, [h('thead', null, h('tr', null, ['Veranstaltung', 'Termin', 'Angeboten von', 'Belegung', 'Aktionen'].map(function (t) { return h('th', { text: t }); }))), tb])));
      }
      var peopleModal = null, peopleId = null;
      function peopleBody(e) {
        var f = freeOf(e), pct = Math.min(100, Math.round(e.booked / e.capacity * 100));
        var body = h('div', { class: 'modal-body people' });
        body.appendChild(h('div', null, [h('div', { class: 'hint', text: 'Teilnehmende' }), h('h2', { text: e.title, style: 'margin:2px 0 0;overflow-wrap:anywhere' }), h('div', { class: 'hint', text: dateFull(e.date) + ', ' + e.start + '–' + endHm(e) + ' Uhr · ' + e.host })]));
        body.appendChild(h('div', { class: 'people-occ' }, [h('b', { text: e.booked + ' von ' + e.capacity + ' Plätzen belegt' }), h('div', { class: 'bar wide' + (f <= 0 ? ' full' : f <= 5 ? ' warn' : '') }, h('i', { style: 'width:' + pct + '%' }))]));
        if (!e.bookings.length) body.appendChild(h('div', { class: 'empty', style: 'padding:24px' }, h('p', { text: 'Noch keine Anmeldungen.' })));
        else if (e.participantsHidden) body.appendChild(h('div', { class: 'notice', role: 'status' }, h('div', { class: 'n-body' }, [h('b', { text: e.booked + (e.booked === 1 ? ' Anmeldung' : ' Anmeldungen') }), h('div', { text: 'Bei privaten Veranstaltungen zeigt die Anwendung keine Namen der Teilnehmenden. Die Teilnahme gehört zur Freizeit und geht die Administration nichts an.' })])));
        else {
          var tb = h('tbody');
          e.bookings.forEach(function (b, i) {
            var rm = h('button', { class: 'btn btn-danger btn-sm', type: 'button', text: 'Entfernen' });
            rm.addEventListener('click', function () {
              if (!rm._c) { rm._c = true; rm.setAttribute('data-c', '1'); rm.textContent = 'Wirklich?'; setTimeout(function () { rm._c = false; rm.removeAttribute('data-c'); rm.textContent = 'Entfernen'; }, 4000); return; }
              Api.adminDeleteBooking(b.id).then(function () { toast('Anmeldung entfernt.'); return reload(); }, function (er) { toast(er.message, true); });
            });
            tb.appendChild(h('tr', null, [h('td', { text: String(i + 1) }), h('td', null, h('b', { text: b.username })), h('td', { text: ((b.firstName || '') + ' ' + (b.lastName || '')).trim() || '–' }), h('td', { text: b.xv || '–' }), h('td', { text: b.email || '–', style: 'overflow-wrap:anywhere' }), h('td', { class: 'r' }, rm)]));
          });
          body.appendChild(h('div', { class: 'tbl-wrap' }, h('table', { class: 'tbl people-tbl' }, [h('thead', null, h('tr', null, ['Nr.', 'Benutzername', 'Name', 'XV-Nr.', 'E-Mail', ''].map(function (t) { return h('th', { text: t }); }))), tb])));
        }
        body.appendChild(h('div', { class: 'people-foot' }, [
          e.bookings.length && !e.participantsHidden ? h('button', { class: 'btn btn-secondary btn-sm', type: 'button', text: 'E-Mail-Adressen kopieren', onclick: function () { copy(e.bookings.map(function (b) { return b.email; }).filter(Boolean).join('; ')); } }) : null,
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
        h('p', { class: 'lead', text: 'Hier passt Du Bezeichnung, Farbe und Themen der beiden Themenbereiche an. Beim Umbenennen eines Themas werden bestehende Veranstaltungen automatisch angepasst. Ein Thema lässt sich nur löschen, wenn keine Veranstaltung es verwendet.' }), seg, host, msg, h('div', null, save)]);
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
      function upd() { $('.ph-t', prev).innerHTML = hlHtml(t.value); $('.ph-x', prev).textContent = x.value; count.textContent = x.value.length + ' / 500 Zeichen'; }
      t.addEventListener('input', upd); x.addEventListener('input', upd); upd();
      var save = h('button', { type: 'button', class: 'btn btn-primary', text: 'Texte speichern' });
      save.addEventListener('click', function () {
        save.disabled = true;
        Api.adminSaveSettings({ heroTitle: t.value, heroText: x.value }).then(function () { applyTaxonomy({ hero: { title: t.value.trim(), text: x.value.trim() } }); save.disabled = false; toast('Texte gespeichert.'); say(msg, 'ok', 'Die Texte sind im Katalog sichtbar.'); }, function (er) { save.disabled = false; say(msg, 'bad', er.message); });
      });
      var reset = h('button', { type: 'button', class: 'btn btn-secondary', text: 'Standardtexte einsetzen', onclick: function () { t.value = DEFAULT_HERO.title; x.value = DEFAULT_HERO.text; upd(); } });
      return h('div', { style: 'display:flex;flex-direction:column;gap:20px;max-width:900px' }, [
        h('p', { class: 'lead', text: 'Überschrift und Hinweistext oben im Katalog. Sie sind für alle Besucher sichtbar. Der Button „Selbst etwas anbieten“ bleibt bestehen.' }),
        h('div', { class: 'panel', style: 'display:flex;flex-direction:column;gap:16px' }, [field('Überschrift', t, { id: 'h-title', req: true, hint: 'Kurz und einladend, bis zu 80 Zeichen. Mit *Sternchen* markierte Wörter erscheinen in Orange; ohne Markierung ist alles nach dem ersten Satz orange.' }), field('Hinweistext', x, { id: 'h-text', req: true, hint: 'Nenne, was es zu entdecken gibt, wie die Anmeldung geht und wann die Termine stattfinden (bis zu 500 Zeichen).' }), count]),
        h('div', null, [h('h3', { text: 'Vorschau', style: 'margin-bottom:8px' }), prev]), msg, h('div', { style: 'display:flex;gap:12px;flex-wrap:wrap' }, [save, reset])]);
    });
  }
  function adminUsers() {
    return Api.adminUsers().then(function (res) {
      var list = res.users, q = '', host = h('div'), count = h('span', { class: 'hint', 'aria-live': 'polite' });
      var search = h('input', { type: 'search', id: 'au-q', placeholder: 'Benutzername, Name, XV-Nummer oder E-Mail …', 'aria-label': 'Konten durchsuchen' });
      var meSuper = state.me.role === 'superadmin';
      search.addEventListener('input', function () { q = search.value.toLowerCase().trim(); render(); });
      function reload() { return Api.adminUsers().then(function (l) { list = l.users; render(); }); }
      function tempPassword(u, pw) {
        var c = h('div', { class: 'modal-body' }, [h('h2', { text: 'Vorläufiges Passwort' }), h('p', { text: 'Gib dieses Passwort an ' + u.username + ' weiter. Es wird nur jetzt angezeigt. Beim nächsten Anmelden muss ' + u.username + ' ein eigenes Passwort vergeben.' }),
          h('div', { class: 'codebox' }, h('div', { style: 'display:flex;gap:12px;align-items:center;flex-wrap:wrap' }, [h('span', { class: 'code', id: 'tmp-pw', text: pw }), h('button', { class: 'btn btn-secondary btn-sm', type: 'button', text: 'Kopieren', onclick: function () { copy(pw); } })])),
          h('div', null, h('button', { class: 'btn btn-primary', type: 'button', text: 'Schließen', onclick: function () { m.close(); } }))]);
        var m = openModal(c, { label: 'Vorläufiges Passwort' });
      }
      function act(label, confirmLabel, cls, run) { return twoStep(h('button', { class: 'btn ' + cls + ' btn-sm', type: 'button', text: label }), label, confirmLabel, function (reset) { run().then(function () { return reload(); }, function (er) { reset(); if (authFail(er)) return; toast(er.message, true); }); }); }
      function render() {
        clear(host);
        var items = list.filter(function (u) { return !q || (u.username + ' ' + u.firstName + ' ' + u.lastName + ' ' + u.xv + ' ' + u.email).toLowerCase().indexOf(q) >= 0; });
        count.textContent = (q ? items.length + ' von ' : '') + list.length + ' Konten, davon ' + list.filter(function (u) { return u.role !== 'user'; }).length + ' mit Admin-Rechten';
        var tb = h('tbody');
        items.forEach(function (u) {
          var acts = h('div', { class: 'acts' });
          if (meSuper && u.role !== 'superadmin') acts.appendChild(act(u.role === 'admin' ? 'Admin-Rechte entziehen' : 'Zum Admin machen', 'Wirklich?', 'btn-secondary', function () { return Api.adminSetRole(u.id, u.role === 'admin' ? 'user' : 'admin'); }));
          if (u.role !== 'superadmin' || meSuper) acts.appendChild(act('Passwort zurücksetzen', 'Wirklich zurücksetzen?', 'btn-secondary', function () { return Api.adminResetPassword(u.id).then(function (r) { tempPassword(u, r.password); }); }));
          if (iddOn()) acts.appendChild(act(u.iddHost ? 'IDD-Freischaltung entziehen' : 'IDD freischalten', 'Wirklich?', 'btn-secondary', function () { return Api.adminSetIddHost(u.id, !u.iddHost).then(function () { if (state.me && u.id === state.me.id) return refreshMe(); }); }));
          if (u.avatar) acts.appendChild(act('Profilbild löschen', 'Wirklich löschen?', 'btn-danger', function () { return Api.adminDeleteAvatar(u.id); }));
          if (u.role !== 'superadmin' && u.id !== state.me.id) acts.appendChild(act(u.locked ? 'Entsperren' : 'Sperren', 'Wirklich?', u.locked ? 'btn-secondary' : 'btn-danger', function () { return Api.adminSetLocked(u.id, !u.locked); }));
          if (u.role !== 'superadmin' && u.id !== state.me.id && (u.role !== 'admin' || meSuper)) acts.appendChild(act('Konto löschen', 'Endgültig löschen?', 'btn-danger', function () { return Api.adminDeleteUser(u.id).then(function () { toast('Das Konto ist gelöscht.'); }); }));
          tb.appendChild(h('tr', { class: u.locked ? 'past' : '' }, [
            h('td', { class: 'c-title' }, h('div', { class: 'au-row' }, [u.avatar ? avatarNode(u.avatar, 44, 'Profilbild von ' + u.username) : h('span', { class: 'au-noav' }), h('div', null, [userTag(u.username, u.level, false), h('div', { class: 'meta' }, [u.role === 'superadmin' ? h('span', { class: 'tag cat-dienstlich', text: 'Hauptadmin' }) : (u.role === 'admin' ? h('span', { class: 'tag cat-dienstlich', text: 'Admin' }) : null), u.locked ? h('span', { class: 'tag past', text: 'gesperrt' }) : null, u.isTest ? h('span', { class: 'tag test', text: 'Testdaten' }) : null, u.mustChange ? h('span', { class: 'tag', text: 'Passwort ändern' }) : null, iddOn() && u.iddHost ? h('span', { class: 'tag', text: 'IDD-LearnMaker' }) : null, iddOn() && u.iddDuty ? h('span', { class: 'tag', text: 'IDD-pflichtig' }) : null])])])),
            h('td', null, [u.firstName + ' ' + u.lastName, h('div', { class: 'hint', text: (u.xv || '–') })]), h('td', { text: u.email, style: 'overflow-wrap:anywhere' }),
            h('td', null, [h('b', { text: String(u.offered) }), h('div', { class: 'hint', text: 'angeboten' })]), h('td', { class: 'c-when', text: (u.created || '').slice(0, 10).split('-').reverse().join('.') }), h('td', { class: 'c-act' }, acts)]));
        });
        if (!items.length) { host.appendChild(h('div', { class: 'empty' }, h('p', { text: 'Kein Konto gefunden.' }))); return; }
        host.appendChild(h('div', { class: 'tbl-wrap' }, h('table', { class: 'tbl' }, [h('thead', null, h('tr', null, ['Benutzername', 'Name / XV', 'E-Mail', 'Sessions', 'Registriert', 'Aktionen'].map(function (t) { return h('th', { text: t }); }))), tb])));
      }
      render();
      return h('div', null, [h('p', { class: 'lead', text: meSuper ? 'Hier siehst Du alle Konten. Als Hauptadministration kannst Du Admin-Rechte vergeben, Passwörter zurücksetzen, Konten sperren und löschen.' : 'Hier siehst Du alle Konten. Du kannst Passwörter zurücksetzen, Konten sperren und löschen. Admin-Rechte vergibt nur die Hauptadministration.' }),
        h('p', { class: 'hint', style: 'margin:0 0 16px', text: 'Zum Schutz der Beschäftigten zeigt die Liste weder Anmeldezeiten noch Teilnahmen je Person. Konten ohne Anmeldung seit ' + res.inactiveMonths + ' Monaten löscht die Anwendung automatisch.' }),
        h('div', { class: 'afilter' }, h('div', { class: 'afld wide' }, [h('label', { text: 'Suche' }), search])), h('div', { class: 'toolrow' }, count), host]);
    });
  }
      /* IDD-Nachweise geloeschter Konten: nur Nachweisdaten, bis zum Ende des fuenften Jahres nach dem Kalenderjahr der Teilnahme */
  function adminIddArchiveView() {
    if (!iddOn()) return Promise.resolve(h('div', { class: 'notice', role: 'status' }, 'Die IDD-Funktion ist ausgeschaltet. Du schaltest sie unter System › IDD-Einstellungen ein.'));
    return Api.adminIddArchive().then(function (archive) {
      return archiveNode();
      function archiveNode() {
        var kids = [h('p', { class: 'lead', text: 'Bei einer Kontolöschung hebt die Anwendung bestätigte IDD-Teilnahmen mit Name, XV-Nummer und gutBeraten-ID auf. Jede Teilnahme wird am Ende des fünften Jahres nach ihrem Kalenderjahr automatisch gelöscht.' })];
        if (!archive.length) { kids.push(h('p', { class: 'hint', text: 'Keine gelöschten Konten mit IDD-Nachweisen.' })); return h('div', { id: 'idd-archive' }, kids); }
        var tb = h('tbody');
        archive.forEach(function (a) {
          var yrs = {}; a.items.forEach(function (it) { var y = Number(it.date.slice(0, 4)); yrs[y] = (yrs[y] || 0) + it.minutes; });
          var acts = h('div', { class: 'acts' }, Object.keys(yrs).map(Number).sort(function (x, y) { return y - x; }).map(function (y) {
            return h('button', { type: 'button', class: 'btn btn-secondary btn-sm', text: 'Nachweis ' + y, onclick: function () {
              var c = { firstName: a.firstName, lastName: a.lastName, xv: a.xv, gbId: a.gbId, hours: a.iddHours || 15, provider: (a.items[0] && a.items[0].provider) || IDD.provider, archivedNote: 'Das Konto wurde am ' + dateFull(a.deletedAt.slice(0, 10)) + ' gelöscht. Nachweis aus dem Archiv der Administration.',
                items: a.items.map(function (it) { return { year: Number(it.date.slice(0, 4)), status: 'yes', date: it.date, start: it.start, end: it.end, minutes: it.minutes, iddTitle: it.iddTitle, iddContent: it.iddContent || '', title: it.title, confirmedAt: it.confirmedAt }; }) };
              saveBlob(iddPdf(c, y), 'IDD-Nachweis-' + y + '-' + (a.lastName || 'Archiv').replace(/[^A-Za-zÄÖÜäöüß-]/g, '') + '.pdf');
            } });
          }));
          tb.appendChild(h('tr', null, [h('td', null, [h('b', { text: (a.firstName + ' ' + a.lastName).trim() }), h('div', { class: 'hint', text: a.xv || '–' })]), h('td', { text: a.gbId || 'fehlt' }), h('td', { class: 'nowrap', text: dateFull(a.deletedAt.slice(0, 10)) }),
            h('td', { text: Object.keys(yrs).sort().map(function (y) { return y + ': ' + fmtMinutes(yrs[y]); }).join(' · ') }), h('td', { class: 'c-act' }, acts)]));
        });
        kids.push(h('div', { class: 'tbl-wrap' }, h('table', { class: 'tbl' }, [h('thead', null, h('tr', null, ['Name / XV', 'gutBeraten-ID', 'Gelöscht am', 'IDD-Zeit je Jahr', 'PDF-Nachweis'].map(function (t) { return h('th', { text: t }); }))), tb])));
        return h('div', { id: 'idd-archive' }, kids);
      }
    });
  }
  /* IDD-Einstellungen: Hauptschalter, Bildungsdienstleister, Texte fuer Begruessung und Verabschiedung */
  function adminIddSet() {
    return Api.adminSettings().then(function (st) {
      var c = st.idd || IDD, msg = boxMsg(), go = h('button', { class: 'btn btn-primary', type: 'submit', text: 'Speichern' });
      var on = h('input', { type: 'checkbox', id: 's-idd-on', checked: !!c.on }), pv = inp('s-idd-prov', c.provider, 'text', { maxlength: '120' });
      var wt = inp('s-idd-wt', c.welcome.title, 'text', { maxlength: '60' }), ft = inp('s-idd-ft', c.farewell.title, 'text', { maxlength: '60' });
      var wx = h('textarea', { id: 's-idd-wx', rows: '2', maxlength: '300' }), fx = h('textarea', { id: 's-idd-fx', rows: '2', maxlength: '300' }); wx.value = c.welcome.text || ''; fx.value = c.farewell.text || '';
      var form = h('form', { class: 'form panel', style: 'gap:20px;max-width:900px', novalidate: true }, [
        h('label', { class: 'chk' }, [on, h('span', null, [h('b', { text: 'IDD-Funktion aktivieren' }), h('span', { class: 'hint', text: 'Ist sie aus, sind alle IDD-Angaben in der Anwendung ausgeblendet. Gespeicherte Daten bleiben erhalten.' })])]),
        field('Bildungsdienstleister', pv, { id: 's-idd-prov', req: true, hint: 'Erscheint im IDD-Nachweis der Teilnehmenden, zum Beispiel „R+V Allgemeine Versicherung AG“.' }),
        h('div', { class: 'grid2' }, [field('Erster Agenda-Block: Titel', wt, { id: 's-idd-wt', req: true }), field('Letzter Agenda-Block: Titel', ft, { id: 's-idd-ft', req: true })]),
        h('div', { class: 'grid2' }, [field('Erster Agenda-Block: Text', wx, { id: 's-idd-wx' }), field('Letzter Agenda-Block: Text', fx, { id: 's-idd-fx' })]),
        h('p', { class: 'hint', text: 'Beide Blöcke dauern je ' + (IDD.frame || 5) + ' Minuten und zählen nicht zur Lernzeit. Dazwischen steht ein Block mit dem IDD-Titel der Veranstaltung.' }), msg, h('div', null, go)]);
      form.addEventListener('submit', function (e) {
        e.preventDefault(); go.disabled = true;
        var p = { iddOn: on.checked, iddProvider: pv.value.trim(), iddWelcomeTitle: wt.value.trim(), iddWelcomeText: wx.value.trim(), iddFarewellTitle: ft.value.trim(), iddFarewellText: fx.value.trim() };
        Api.adminSaveSettings(p).then(function () { go.disabled = false; applyTaxonomy({ idd: { on: p.iddOn, provider: p.iddProvider, frame: IDD.frame || 5, welcome: { title: p.iddWelcomeTitle, text: p.iddWelcomeText }, farewell: { title: p.iddFarewellTitle, text: p.iddFarewellText } } }); toast('IDD-Einstellungen gespeichert.'); say(msg, 'ok', p.iddOn ? 'Die IDD-Funktion ist aktiv.' : 'Die IDD-Funktion ist ausgeblendet.'); }, function (er) { go.disabled = false; if (authFail(er)) return; say(msg, 'bad', er.message); });
      });
      return form;
    });
  }
  /* IDD: Veranstaltungen eines Kalenderjahres, Bestaetigungen, Nachtragen und erneute Freischaltung */
  function adminIdd() {
    if (!iddOn()) return Promise.resolve(h('div', { class: 'notice', role: 'status' }, 'Die IDD-Funktion ist ausgeschaltet. Du schaltest sie unter System › IDD-Einstellungen ein.'));
    return Promise.all([Api.adminIdd(), Api.adminUsers()]).then(function (res) {
      var evs = res[0], users = res[1].users, host = h('div'), nowY = new Date().getFullYear();
      var ys = {}; evs.forEach(function (e) { ys[+e.date.slice(0, 4)] = 1; }); ys[nowY] = 1;
      var years = Object.keys(ys).map(Number).sort(function (a, b) { return b - a; }), cur = Number(sess.get('lt_iddadm_y')) || nowY; if (years.indexOf(cur) < 0) cur = years[0];
      function reload(openId) { return Api.adminIdd().then(function (l) { evs = l; draw(); if (openId) { var e = evs.filter(function (x) { return x.id === openId; })[0]; if (e) people(e); } }); }
      function st(b) { return b.status === 'yes' ? 'teilgenommen' : b.status === 'no' ? 'nicht teilgenommen' : 'offen'; }
      function people(e) {
        var body = h('div', { class: 'modal-body people' }), m, edit = e.ended && !e.locked && !e.cancelled;
        body.appendChild(h('div', null, [h('div', { class: 'hint', text: 'IDD-Teilnahmen' }), h('h2', { text: e.iddTitle, style: 'margin:2px 0 0;overflow-wrap:anywhere' }), h('div', { class: 'hint', text: dateFull(e.date) + ', ' + e.start + ' Uhr · ' + e.iddMinutes + ' Minuten IDD-Zeit · ' + e.title })]));
        if (e.locked) body.appendChild(h('div', { class: 'notice', role: 'status' }, 'Seit dem ' + dateFull(e.lockAt.slice(0, 10)) + ' endgültig gesperrt.'));
        else if (!e.ended) body.appendChild(h('div', { class: 'notice', role: 'status' }, 'Bestätigen ist erst nach dem Ende der Veranstaltung möglich.'));
        var tb = h('tbody');
        e.bookings.forEach(function (b, i) {
          function sb(v, label) { var on = b.status === v; return h('button', { type: 'button', class: 'btn btn-sm ' + (on ? 'btn-primary' : 'btn-secondary'), 'aria-pressed': String(on), disabled: !!b.archived, text: label, onclick: function () { Api.confirmAttendance(b.id, on ? '' : v).then(function () { m.close(); return reload(e.id); }, function (er) { toast(er.message, true); }); } }); }
          tb.appendChild(h('tr', null, [h('td', { text: String(i + 1) }), h('td', null, [b.archived ? h('span', { class: 'tag past', text: 'Konto gelöscht' }) : h('b', { text: b.username }), b.addedBy ? h('div', { class: 'hint', text: 'Nachgetragen von ' + b.addedBy + ': ' + b.addReason }) : null]), h('td', { text: (b.firstName + ' ' + b.lastName).trim() || '–' }), h('td', { text: b.xv || '–' }),
            h('td', null, b.gbId ? b.gbId : h('span', { class: 'tag past', text: 'fehlt' })), h('td', null, edit ? h('div', { class: 'cf-acts' }, [sb('yes', 'Teilgenommen'), sb('no', 'Nicht teilgenommen')]) : st(b))]));
        });
        body.appendChild(e.bookings.length ? h('div', { class: 'tbl-wrap' }, h('table', { class: 'tbl people-tbl' }, [h('thead', null, h('tr', null, ['Nr.', 'Benutzername', 'Name', 'XV-Nr.', 'gutBeraten-ID', 'Status'].map(function (t) { return h('th', { text: t }); }))), tb])) : h('p', { class: 'hint', text: 'Keine Anmeldungen.' }));
        if (edit) {
          var who = h('input', { type: 'text', id: 'idd-add-user', placeholder: 'Benutzername oder XV-Nummer', autocomplete: 'off' }), why = h('input', { type: 'text', id: 'idd-add-reason', maxlength: '300', placeholder: 'z. B. per weitergeleitetem Teams-Link teilgenommen' }), msg = boxMsg();
          var add = h('button', { type: 'button', class: 'btn btn-primary btn-sm', text: 'Teilnahme nachtragen' });
          add.addEventListener('click', function () {
            var q = who.value.trim().toLowerCase(), u = users.filter(function (x) { return x.username.toLowerCase() === q || (x.xv || '').toLowerCase() === q.replace(/[\s-]/g, ''); })[0];
            if (!u) { say(msg, 'bad', 'Kein Konto mit diesem Benutzernamen oder dieser XV-Nummer gefunden.'); return; }
            add.disabled = true; Api.adminIddAdd(e.id, u.id, why.value).then(function () { m.close(); toast('Teilnahme nachgetragen.'); return reload(e.id); }, function (er) { add.disabled = false; say(msg, 'bad', er.message); });
          });
          body.appendChild(h('div', { class: 'panel', style: 'display:flex;flex-direction:column;gap:12px;margin-top:16px' }, [h('h3', { text: 'Teilnahme nachtragen', style: 'margin:0' }), h('div', { class: 'grid2' }, [field('Person', who, { id: 'idd-add-user' }), field('Begründung (Pflicht, steht im Protokoll)', why, { id: 'idd-add-reason' })]), msg, h('div', null, add)]));
        }
        m = openModal(body, { wide: true, label: 'IDD-Teilnahmen' });
      }
      function draw() {
        clear(host); sess.set('lt_iddadm_y', String(cur));
        var list = evs.filter(function (e) { return +e.date.slice(0, 4) === cur; }).sort(function (a, b) { return a.date < b.date ? 1 : -1; });
        var held = list.filter(function (e) { return !e.cancelled; }), all = [], yes = 0, open = 0, noId = 0, mins = 0;
        held.forEach(function (e) { e.bookings.forEach(function (b) { if (b.status === 'yes') { yes++; mins += e.iddMinutes; if (!b.gbId) noId++; } else if (!b.status && e.ended && !e.locked) open++; }); });
        var seg = h('div', { class: 'yearbar', role: 'group', 'aria-label': 'Kalenderjahr' }, years.map(function (y) { return h('button', { type: 'button', text: String(y), 'aria-pressed': String(y === cur), onclick: function () { cur = y; draw(); } }); }));
        host.appendChild(seg);
        host.appendChild(h('div', { class: 'st-kpis', style: 'margin-top:20px' }, [['IDD-Veranstaltungen', String(held.length)], ['Bestätigte Teilnahmen', String(yes)], ['Bestätigte IDD-Zeit', fmtMinutes(mins)], ['Offene Bestätigungen', String(open)], ['Bestätigt ohne gutBeraten-ID', String(noId)]].map(function (k) { return h('div', { class: 'st-kpi' }, [h('b', { text: k[1] }), h('span', { text: k[0] })]); })));
        var lockD = new Date(cur + 1, 0, 31, 23, 59, 59);
        host.appendChild(h('p', { class: 'hint', text: new Date() > lockD ? 'Das Jahr ' + cur + ' ist abgeschlossen. Teilnahmen lassen sich nicht mehr ändern.' : 'Teilnahmen für ' + cur + ' lassen sich bis zum 31.01.' + (cur + 1) + ' bestätigen oder nachtragen.' }));
        if (!list.length) { host.appendChild(h('div', { class: 'empty' }, h('p', { text: 'Keine IDD-Veranstaltungen in ' + cur + '.' }))); return; }
        var tb = h('tbody');
        list.forEach(function (e) {
          var y_ = e.bookings.filter(function (b) { return b.status === 'yes'; }).length, n_ = e.bookings.filter(function (b) { return b.status === 'no'; }).length, o_ = e.bookings.length - y_ - n_;
          var fr = e.cancelled ? 'abgesagt' : !e.ended ? 'anstehend' : e.locked ? 'gesperrt' : e.hostOpen ? 'LearnMaker bis ' + dateFull(e.hostUntil.slice(0, 10)) : 'nur Administration';
          var acts = h('div', { class: 'acts' }, [h('button', { type: 'button', class: 'btn btn-secondary btn-sm', text: 'Teilnahmen', onclick: function () { people(e); } })]);
          if (e.ended && !e.locked && !e.cancelled && !e.hostOpen) acts.appendChild(twoStep(h('button', { type: 'button', class: 'btn btn-secondary btn-sm', text: 'Für LearnMaker freischalten' }), 'Für LearnMaker freischalten', 'Wirklich?', function (reset) { Api.adminIddReopen(e.id).then(function () { toast('Für 14 Tage freigeschaltet.'); return reload(); }, function (er) { reset(); toast(er.message, true); }); }));
          tb.appendChild(h('tr', { class: e.cancelled ? 'past' : '' }, [h('td', { class: 'nowrap', text: dateFull(e.date) }), h('td', null, [h('b', { text: e.iddTitle }), h('div', { class: 'hint', text: e.title + (e.iddContent ? ' · ' + e.iddContent : '') })]), h('td', null, [h('span', { text: e.owner ? e.owner.username : 'Anonymisiert' }), e.owner ? h('div', { class: 'hint', text: e.owner.firstName + ' ' + e.owner.lastName }) : null]),
            h('td', { text: e.iddMinutes + ' Min.' }), h('td', { text: y_ + ' / ' + n_ + ' / ' + o_ }), h('td', { text: fr }), h('td', { class: 'c-act' }, acts)]));
        });
        host.appendChild(h('div', { class: 'tbl-wrap' }, h('table', { class: 'tbl' }, [h('thead', null, h('tr', null, ['Datum', 'IDD-Titel', 'LearnMaker', 'IDD-Zeit', 'Ja / Nein / offen', 'Bestätigung', 'Aktionen'].map(function (t) { return h('th', { text: t }); }))), tb])));
      }
      draw();
      return h('div', null, [h('p', { class: 'lead', text: 'Alle IDD-Veranstaltungen eines Kalenderjahres mit dem Stand der Teilnahmebestätigungen. LearnMaker bestätigen 14 Tage nach dem Ende. Danach bestätigst Du, trägst nach oder schaltest die Bestätigung erneut frei. Ab dem 31.01. des Folgejahres ist das Jahr gesperrt. IDD-Nachweise gelöschter Konten stehen unter IDD-Archiv.' }), host]);
    });
  }
  function adminPhotos() {
    return Api.adminSettings().then(function (st) {
      var list = (st.photos || []).slice(), host = h('div'), msg = boxMsg(), data = '', fhead = h('h3');
      var name = inp('fo-name', '', 'text', { maxlength: '40', placeholder: 'z. B. Beratung beim Kunden' }), kw = inp('fo-kw', '', 'text', { maxlength: '200', placeholder: 'z. B. vertrieb gespräch beratung' });
      var prev = h('div', { class: 'imgprev' }, 'Kein Foto gewählt'), file = h('input', { type: 'file', accept: 'image/png,image/jpeg,image/webp', class: 'sr', tabindex: '-1' });
      file.addEventListener('change', function () { var f = file.files[0]; if (!f) return; var rd = new FileReader(); rd.onload = function () { var im = new Image(); im.onload = function () { openCropper(im, function (d) { data = d; clear(prev); prev.appendChild(h('img', { src: d, alt: 'Vorschau' })); }, { size: 640 }); }; im.src = rd.result; }; rd.readAsDataURL(f); });
      var add = h('button', { type: 'button', class: 'btn btn-primary', text: 'Foto speichern' });
      add.addEventListener('click', function () {
        add.disabled = true;
        Api.adminSavePhoto({ name: name.value, keywords: kw.value, imageData: data }).then(function (r) { add.disabled = false; list = r.photos; applyTaxonomy({ photos: r.photos }); data = ''; name.value = ''; kw.value = ''; clear(prev); prev.textContent = 'Kein Foto gewählt'; say(msg, 'ok', 'Das Foto steht jetzt zur Auswahl.'); render(); }, function (er) { add.disabled = false; say(msg, 'bad', er.message); });
      });
      function render() {
        clear(host); fhead.textContent = 'Hinterlegte Fotos (' + list.length + ')';
        if (!list.length) { host.appendChild(h('p', { class: 'hint', text: 'Noch keine Fotos hinterlegt.' })); return; }
        host.appendChild(h('div', { class: 'ph-grid adm-photos' }, list.map(function (f) {
          var del = twoStep(h('button', { type: 'button', class: 'btn btn-danger btn-sm', text: 'Löschen' }), 'Löschen', 'Wirklich?', function (reset) { Api.adminDeletePhoto(f.id).then(function (r) { list = r.photos; applyTaxonomy({ photos: r.photos }); render(); }, function (er) { reset(); toast(er.message, true); }); });
          return h('div', { class: 'ph-opt' }, [h('span', { class: 'ph-box' }, phAny(f.id, true)), h('span', { class: 'ph-name', text: f.name }), f.keywords ? h('span', { class: 'hint', text: f.keywords }) : null, del]);
        })));
      }
      render();
      return h('div', { style: 'display:flex;flex-direction:column;gap:20px;max-width:1100px' }, [
        h('p', { class: 'lead', text: 'Hier hinterlegst Du echte Fotos, zum Beispiel aus der R+V-Mediendatenbank. LearnMaker sehen sie bei „Platzhalterbild wählen“ vor den Illustrationen. Nutze nur Fotos mit den nötigen Nutzungsrechten.' }),
        h('div', { class: 'panel', style: 'display:flex;flex-direction:column;gap:16px' }, [h('h3', { text: 'Neues Foto' }), h('div', { class: 'imgpick' }, [prev, h('div', { style: 'display:flex;flex-direction:column;gap:10px' }, [h('button', { type: 'button', class: 'btn btn-secondary', text: 'Foto auswählen', onclick: function () { file.value = ''; file.click(); } }), file])]),
          h('div', { class: 'grid2' }, [field('Name', name, { id: 'fo-name', req: true }), field('Suchbegriffe', kw, { id: 'fo-kw', hint: 'Mit Leerzeichen getrennt. Sie helfen bei der Suche.' })]), msg, h('div', null, add)]),
        fhead, host]);
    });
  }
  function adminBadges() {
    return Api.adminSettings().then(function (s) {
      var lv = s.badgeLevels.slice(), msg = boxMsg(), exp = inp('bd-exp', s.expertMin, 'number', { min: '1', max: '1000', step: '1', inputmode: 'numeric' });
      var rows = BADGE_NAMES.map(function (nm, i) { var f = inp('bd-' + (i + 1), lv[i], 'number', { min: '1', max: '100000', step: '1', inputmode: 'numeric', 'aria-label': 'Grenze für Stufe ' + (i + 1) + ': ' + nm }); f.addEventListener('input', function () { lv[i] = Number(f.value); }); return h('div', { class: 'bd-row' }, [badgeNode(i + 1, true), h('div', { class: 'bd-n' }, [h('b', { text: 'Stufe ' + (i + 1) }), h('div', { class: 'hint', text: nm })]), field('ab Sessions', f, { id: 'bd-' + (i + 1) })]); });
      var sec = inp('bd-7', s.badgeSecret || SECRET_MIN, 'number', { min: '1', max: '100000', step: '1', inputmode: 'numeric', 'aria-label': 'Grenze für die versteckte Stufe ' + SECRET_NAME });
      rows.push(h('div', { class: 'bd-row bd-secret' }, [badgeNode(7, true), h('div', { class: 'bd-n' }, [h('b', { text: SECRET_NAME }), h('div', { class: 'hint', text: 'Versteckte Stufe. Nutzende sehen sie erst, wenn sie sie erreicht haben.' })]), field('ab Sessions', sec, { id: 'bd-7' })]));
      var save = h('button', { type: 'button', class: 'btn btn-primary', text: 'Einstellungen speichern' });
      save.addEventListener('click', function () {
        save.disabled = true;
        Api.adminSaveSettings({ badgeLevels: lv, badgeSecret: Number(sec.value), expertMin: Number(exp.value) }).then(function () { applyTaxonomy({ badges: { levels: lv.slice(), expertMin: Number(exp.value) } }); save.disabled = false; toast('Einstellungen gespeichert.'); say(msg, 'ok', 'Die neuen Grenzen gelten sofort für alle Nutzenden.'); }, function (er) { save.disabled = false; if (authFail(er)) return; say(msg, 'bad', er.message); });
      });
      return h('div', { style: 'display:flex;flex-direction:column;gap:20px;max-width:900px' }, [
        h('p', { class: 'lead', text: 'Das Abzeichen neben dem Benutzernamen richtet sich nach der Zahl der durchgeführten Sessions. Lege hier fest, ab wie vielen Sessions welche Stufe gilt. Abgesagte Sessions zählen nicht. Der ' + SECRET_NAME + ' ist eine Überraschung: Er steht in keiner Übersicht für Nutzende und erscheint erst bei Personen, die ihn erreicht haben.' }),
        h('div', { class: 'panel', style: 'display:flex;flex-direction:column;gap:14px' }, rows),
        h('h3', { text: 'Expertenstatus' }),
        h('div', { class: 'panel bd-row' }, [rocketNode(true), h('div', { class: 'bd-n' }, [h('b', { text: 'Rakete' }), h('div', { class: 'hint', text: 'Auf der Kachel einer Veranstaltung und im Profil' })]), field('Mindestzahl an Sessions je Thema', exp, { id: 'bd-exp', hint: 'Wer so viele Sessions in einem Thema angeboten hat, erhält die Rakete.' })]),
        msg, h('div', null, save)]);
    });
  }
  function adminGeneral() {
    return Api.adminSettings().then(function (s) {
      var isLocal = !!s.local;
      var title = inp('s-title', s.appTitle, 'text', { maxlength: '60' }), avUp = h('input', { type: 'checkbox', id: 's-avup', checked: s.avatarUpload !== false });
      var aud = inp('s-aud', s.audience == null ? 6000 : s.audience, 'number', { min: '0', max: '1000000', step: '1', inputmode: 'numeric' });
      var msg = boxMsg(), go = h('button', { class: 'btn btn-primary', type: 'submit', text: 'Speichern' });
      var form = h('form', { class: 'form panel', style: 'gap:20px;max-width:900px', novalidate: true }, [
        field('Titel der Anwendung', title, { id: 's-title', req: true, hint: 'Erscheint im Kopf der Seite und im Browser-Tab, z. B. „LearnTogether@AD“ oder später „LearnTogether@R+V“.' }),
        field('Größe der Zielgruppe (Personen)', aud, { id: 's-aud', hint: 'Grundlage der Kennzahl „Reichweite“ in der Statistik, zum Beispiel 6000 für den Außendienst. 0 blendet die Kennzahl aus.' }),
        h('label', { class: 'chk' }, [avUp, h('span', null, [h('b', { text: 'Hochladen eigener Profilbilder erlauben' }), h('span', { class: 'hint', text: 'Ist die Funktion aus, wählen Nutzende nur aus den illustrierten Profilbildern. Bereits hochgeladene Bilder sind dann nur für die Person selbst sichtbar.' })])]), msg, h('div', null, go)]);
      form.addEventListener('submit', function (e) {
        e.preventDefault(); msg.hidden = true; go.disabled = true;
        var p = { appTitle: title.value, avatarUpload: avUp.checked, audience: Number(aud.value) };
        Api.adminSaveSettings(p).then(function () { go.disabled = false; state.settings.appTitle = title.value.trim(); applyTitle(); applyTaxonomy({ avatarUpload: avUp.checked }); toast('Einstellungen gespeichert.'); }, function (er) { go.disabled = false; say(msg, 'bad', er.message); });
      });
      return form;
    });
  }
  function adminTest(flash) {
    return Promise.all([Api.adminEvents(), Api.adminSettings()]).then(function (res) {
      var list = res[0], tp = res[1].testPassword;
      var n = list.filter(function (e) { return e.isTest; }).length, self;
      var msg = h('div', { class: 'notice' + (flash ? ' ' + flash.cls : ''), role: 'status', hidden: !flash, text: flash ? flash.text : '' });
      function run(m) {
        msg.hidden = false; msg.className = 'notice info'; msg.textContent = 'Wird ausgeführt …';
        Api.adminTestData(m).then(function (r) {
          return adminTest({ cls: 'ok', text: m === 'load' ? r.events + ' Veranstaltungen, ' + r.users + ' Konten und ' + r.bookings + ' Anmeldungen wurden geladen.' : 'Alle Testdaten wurden entfernt.' });
        }).then(function (node) { self.parentNode.replaceChild(node, self); }, function (er) { msg.className = 'notice bad'; msg.textContent = er.message; });
      }
      var scen = ['Ausgebuchte Veranstaltung (Kachel mit Chip „Ausgebucht“, Popup lässt sich nicht öffnen)', 'Veranstaltungen mit „Fast ausgebucht“ (1, 3 und genau 5 freie Plätze)', 'Veranstaltungen mit viel Platz und ohne Anmeldungen, eine mit der Höchstzahl von 50 Plätzen', 'Vergangene Veranstaltung (nur im Admin-Bereich sichtbar)', 'Alle Dauern von 15 bis 120 Minuten', 'Morgens (06:00–09:00 Uhr) und nachmittags (17:00–20:00 Uhr)', 'Beide Themenbereiche mit allen aktuellen Themen und Arten, auch neu angelegten', 'Mit hochgeladenem Bild und mit Platzhalterbild', 'Sehr langer Titel, Listen und Zwischenüberschriften in der Beschreibung', 'Beispielnutzer mit Passwort ' + (tp || 'Test-Passwort-2026') + ' (Benutzernamen siehe Admin › Nutzer), Anmeldungen und Bewertungen', 'Abzeichen aller Stufen und Expertenstatus durch vergangene Veranstaltungen', 'Abgesagte Veranstaltung mit Mitteilung an die angemeldeten Personen'];
      self = h('div', { style: 'display:flex;flex-direction:column;gap:20px;max-width:760px' }, [
        h('p', { class: 'lead', text: 'Testdaten füllen die Anwendung mit Beispielveranstaltungen, damit Du alle Szenarien ausprobieren kannst. Sie richten sich nach den aktuell eingestellten Themen und Arten und ändern diese Einstellungen nicht. Sie sind mit „Testdaten“ markiert und lassen sich jederzeit wieder entfernen. Deine echten Veranstaltungen bleiben unberührt.' }),
        h('div', { class: 'panel' }, [h('h3', { text: 'Enthaltene Szenarien', style: 'margin-bottom:8px' }), h('ul', { style: 'margin:0;padding-left:1.2em' }, scen.map(function (s) { return h('li', { text: s }); }))]),
        h('p', null, [h('b', { text: n ? n + ' Testveranstaltungen sind aktuell vorhanden.' : 'Aktuell sind keine Testdaten vorhanden.' })]),
        h('div', { style: 'display:flex;gap:12px;flex-wrap:wrap' }, [h('button', { class: 'btn btn-primary', type: 'button', text: n ? 'Testdaten neu laden' : 'Testdaten laden', onclick: function () { run('load'); } }), h('button', { class: 'btn btn-danger', type: 'button', text: 'Testdaten entfernen', disabled: !n, onclick: function () { run('remove'); } }), mode === 'local' ? h('button', { class: 'btn btn-secondary', type: 'button', text: 'Demo komplett zurücksetzen', onclick: function () { Local.reset(); location.reload(); } }) : null]),
        msg]);
      return self;
    });
  }
  if (!state.me) { goLogin(); return root; }
  if (!isAdmin()) { wrap.appendChild(topline('Verwaltung')); wrap.appendChild(h('h1', { text: 'Administration' })); wrap.appendChild(h('div', { class: 'notice bad', role: 'alert', text: 'Dieser Bereich ist nur für Administrierende. Bitte wende Dich an die Hauptadministration, wenn Du Zugriff brauchst.' })); return root; }
  panel();
  return root;
}

/* ====================================================== Rahmen, Routing */
/* Navigation: abhaengig davon, ob und als wer jemand angemeldet ist */
function renderNav() {
  if (!navEl) return;
  var me = state.me, items = [['/', 'Katalog'], ['/anbieten', 'Veranstaltung anbieten']];
  if (me) items.push(['/meine-anmeldungen', 'Meine Anmeldungen', me.unread || 0], ['/meine-veranstaltungen', 'Meine Veranstaltungen']);
  if (isAdmin()) items.push(['/admin', 'Admin', 0, 'lock']);
  clear(navEl);
  items.forEach(function (n) { navEl.appendChild(h('a', { href: '#' + n[0], 'data-r': n[0] }, [n[3] ? h('span', { html: ico(n[3]) }) : null, n[1], n[2] ? h('span', { class: 'cnt', 'aria-label': n[2] + ' neue Mitteilungen', text: String(n[2]) }) : null])); });
  /* Konto-Bereich deutlich abgesetzt rechts, das Handbuch ganz am Ende */
  navEl.appendChild(h('span', { class: 'navsep', 'aria-hidden': 'true' }));
  if (me) {
    navEl.appendChild(h('a', { href: '#/profil', 'data-r': '/profil', class: 'acct', 'aria-label': 'Mein Profil: ' + me.username }, [userTag(me.username, me.level, false)]));
    navEl.appendChild(h('button', { type: 'button', class: 'linkbtn navout', text: 'Abmelden', onclick: function () { Api.logout().then(function () { setMe(null); toast('Du bist abgemeldet.'); location.hash = '#/'; route(); }, function (er) { toast(er.message, true); }); } }));
  } else {
    navEl.appendChild(h('a', { href: '#/anmelden', 'data-r': '/anmelden', class: 'acct', text: 'Anmelden' }));
    navEl.appendChild(h('a', { href: '#/registrieren', 'data-r': '/registrieren', class: 'acct reg', text: 'Registrieren' }));
  }
  navEl.appendChild(h('a', { href: '#/handbuch', 'data-r': '/handbuch', class: 'navhelp', title: 'Handbuch' }, [h('span', { html: ico('book') }), 'Handbuch']));
  markNav();
}
function markNav() {
  var p = parseRoute().path, cur = null;
  $$('nav.main a').forEach(function (a) { if (a.getAttribute('data-r') === p) { a.setAttribute('aria-current', 'page'); cur = a; } else a.removeAttribute('aria-current'); });
  /* Auf schmalen Bildschirmen scrollt die Navigation seitlich: den aktiven Eintrag sichtbar machen */
  if (cur && navEl && navEl.scrollWidth > navEl.clientWidth) { var l = cur.offsetLeft - navEl.offsetLeft; if (l < navEl.scrollLeft || l + cur.offsetWidth > navEl.scrollLeft + navEl.clientWidth) navEl.scrollLeft = Math.max(0, l - 16); }
}
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
    (navEl = h('nav', { class: 'main', 'aria-label': 'Hauptnavigation' }))]));
  document.body.appendChild(top);
  if (mode === 'local') {
    var why = CFG.mode === 'artifact' ? null : (diag || 'Der Server wurde nicht erreicht.');
    var det = why ? h('details', { class: 'demo-why' }, [h('summary', { text: 'Warum Demo-Modus?' }), h('p', { text: why }), h('p', { class: 'hint', text: 'Geprüfte Adresse: ' + location.origin + API + '?action=ping' }), h('button', { type: 'button', class: 'btn btn-secondary btn-sm', text: 'Erneut prüfen', onclick: function () { location.reload(); } })]) : null;
    document.body.appendChild(h('div', { class: 'demo-banner' }, h('div', { class: 'wrap' }, [h('b', { text: 'Demo-Modus' }), h('span', { text: 'Die Daten liegen nur in diesem Browser. Administration: Benutzername admin, Startpasswort RuVTest1234 (gilt, bis es geändert wird). Beispielnutzer (z. B. anna.b) haben das Passwort Test-Passwort-2026.' }), det])));
  }
  if (mode === 'server' && pingInfo && pingInfo.writable === false) document.body.appendChild(h('div', { class: 'notice bad', role: 'alert', style: 'border-radius:0;padding:12px 16px' }, [h('b', { text: 'Server erreicht, aber Speichern nicht möglich. ' }), pingInfo.storageError || 'Dem Anwendungspool fehlen Schreibrechte auf AppData\\Data.']));
  appEl = h('main', { id: 'main', tabindex: '-1' }); document.body.appendChild(appEl);
  /* Demo-Version: 5 schnelle Klicks auf das Logo setzen das Passwort von "admin" zurueck. Auf dem Server ohne Funktion. */
  var footLogo = h('img', { src: logoW, alt: 'R+V' }), logoClicks = [];
  footLogo.addEventListener('click', function () {
    if (mode !== 'local') return;
    var t = Date.now(); logoClicks = logoClicks.filter(function (x) { return t - x < 2000; }); logoClicks.push(t);
    if (logoClicks.length < 5) return; logoClicks = [];
    Local.resetAdminPassword().then(function () { toast('Das Passwort für „admin“ ist auf ' + 'RuVTest1234 zurückgesetzt.'); }, function (er) { toast(er.message, true); });
  });
  document.body.appendChild(h('footer', { class: 'foot' }, h('div', { class: 'wrap' }, [footLogo, h('span', null, [h('b', { class: 'ftitle' }), ' \u00b7 Informelles Lernen im Außendienst']), h('span', { class: 'sp', text: 'Version ' + (CFG.version || '') })])));
  applyTitle(); renderNav();
}
function parseRoute() {
  var raw = (location.hash || '#/').slice(1) || '/'; var qi = raw.indexOf('?'); var path = qi < 0 ? raw : raw.slice(0, qi); var q = {};
  if (qi >= 0) raw.slice(qi + 1).split('&').forEach(function (p) { var kv = p.split('='); if (kv[0]) q[decodeURIComponent(kv[0])] = decodeURIComponent((kv[1] || '').replace(/\+/g, ' ')); });
  return { path: path || '/', q: q };
}
function route() {
  var r = parseRoute(), node;
  if (state.me && state.me.mustChange && r.path !== '/profil') { location.hash = '#/profil'; return; }
  while (modalStack.length) modalStack[modalStack.length - 1].close();
  switch (r.path) {
    case '/anbieten': node = viewCreate(); break;
    case '/anmelden': node = viewLogin(r.q); break;
    case '/registrieren': node = viewRegister(r.q); break;
    case '/meine-anmeldungen': case '/anmeldung': case '/stornieren': r.path = '/meine-anmeldungen'; node = viewMyBookings(); break;
    case '/meine-veranstaltungen': case '/veranstaltung': r.path = '/meine-veranstaltungen'; node = viewMyEvents(); break;
    case '/profil': node = viewProfile(r.q); break;
    case '/handbuch': node = viewManual(); break;
    case '/admin': node = viewAdmin(); break;
    default: r.path = '/'; node = viewCatalog();
  }
  clear(appEl); appEl.appendChild(node);
  markNav();
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
      else if (r.status === 500) diag = 'Der Server meldet einen Fehler (HTTP 500). Häufige Ursachen: ASP.NET 4.x ist nicht installiert, der Anwendungspool steht nicht auf „.NET CLR Version v4.0“ (Integrierter Modus), die web.config passt nicht zur Serverkonfiguration oder api.ashx konnte nicht kompiliert werden. Öffne zur Fehlersuche direkt auf dem Server AppData/selftest.ashx im Browser (zeigt Umgebung, Schreibrechte und Übersetzungsfehler) oder AppData\\Data\\error.log.';
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
    state.settings = s; applyTaxonomy(s); return Api.me().then(function (j) { state.me = j.me; }, function () { state.me = null; });
  }).then(function () {
    shell(); route(); window.addEventListener('hashchange', route);
    window.__LT_READY__ = true;
  });
}
window.__LT_TEST__ = { Local: Local, buildTestData: buildTestData, sanitizeHtml: sanitizeHtml, validateEvent: validateEvent };
boot();
})();
