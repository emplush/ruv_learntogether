  /* ====================================================== Statistik und Berichte (Admin) */
  var ST_MON = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
  var ST_PDF_COL = ['#109da8', '#f79506'];
  function stSeriesNames() { return [CAT_LABEL.dienstlich, CAT_LABEL.privat]; }
  function stMonthKey(d) { return d.slice(0, 7); }
  function stMonthShort(k) { var p = k.split('-'); return ST_MON[+p[1] - 1] + ' ' + p[0].slice(2); }
  function stMonthLong(k) { var p = k.split('-'); return MONTH_L[+p[1] - 1] + ' ' + p[0]; }
  function todayYmd() { var d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function stPct(a, b) { return b ? Math.round(a / b * 100) : 0; }
  function stNum(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }
  function stDec(n) { return (Math.round(n * 10) / 10).toString().replace('.', ','); }

  /* Bereiche der Statistik: jede Kennzahl und jede Auswertung gehört zu genau einem Bereich */
  var ST_GROUPS = [['ueberblick', 'Überblick'], ['veranstaltungen', 'Veranstaltungen'], ['themen', 'Themen und Formate'], ['nutzende', 'Nutzende'], ['bewertungen', 'Bewertungen'], ['daten', 'Datenschutz']];
  /* Berechnet alle Kennzahlen und Auswertungen aus Veranstaltungen (mit Anmeldungen) und Konten */
  function computeStats(all, F, users) {
    var cancelledN = 0, kept = 0;
    var evs = all.filter(function (e) {
      if (F.cat && e.category !== F.cat) return false;
      if (F.from && e.date < F.from) return false;
      if (F.to && e.date > F.to) return false;
      if (F.noTest && e.isTest) return false;
      kept++;
      if (e.cancelled) { cancelledN++; return false; }
      return true;
    }).map(function (e) { return { e: e, c: e.category === 'privat' ? 1 : 0, n: e.bookings ? e.bookings.length : e.booked, cap: e.capacity }; });
    var tot = { ev: evs.length, pt: 0, cap: 0, zero: 0, full: 0 }, hosts = {}, lead = [], rt = { sum: 0, n: 0, d: [[0, 0], [0, 0], [0, 0], [0, 0], [0, 0]], ended: 0, ratedEv: 0 };
    var acc = (users || []).filter(function (u) { return !(F.noTest && u.isTest); });
    var inRange = acc.filter(function (u) { var d = (u.created || '').slice(0, 10); return (!F.from || d >= F.from) && (!F.to || d <= F.to); });
    evs.forEach(function (x) {
      tot.pt += x.n; tot.cap += x.cap; if (!x.n) tot.zero++; if (x.n >= x.cap) tot.full++;
      if (!x.e.anonymized) hosts[x.e.host.toLowerCase()] = 1;
      var r = 0; (x.e.bookings || []).forEach(function (b) { if (b.rating > 0) { r++; rt.sum += b.rating; rt.n++; rt.d[b.rating - 1][x.c]++; } });
      if (eventEnded(x.e)) { rt.ended += x.n; if (r) rt.ratedEv++; }
      (x.e.bookings || []).forEach(function (b) { if (b.created) { var d = (startDate(x.e) - new Date(b.created)) / 864e5; if (d >= 0 && d < 400) lead.push(d); } });
    });
    var now = Date.now(), active30 = acc.filter(function (u) { return u.lastLogin && now - new Date(u.lastLogin) < 30 * 864e5; }).length;
    var pubN = acc.filter(function (u) { return u.profilePublic; }).length, avN = acc.filter(function (u) { return u.avatar; }).length;
    /* Expertenstatus: Anbietende mit mindestens einem Thema ab der Mindestzahl (durchgeführte Veranstaltungen) */
    var EX = {}; all.forEach(function (e) { if (e.cancelled || !eventEnded(e) || !e.ownerId) return; var k = e.ownerId + '|' + e.category + '|' + e.topic; EX[k] = (EX[k] || 0) + 1; });
    var experts = {}; Object.keys(EX).forEach(function (k) { if (EX[k] >= BADGES.expertMin) experts[k.split('|')[0]] = 1; });
    function kpi(group, label, value) { return { group: group, label: label, value: value }; }
    var kpis = [
      kpi('ueberblick', 'Veranstaltungen', stNum(tot.ev)), kpi('ueberblick', 'Anmeldungen', stNum(tot.pt)), kpi('ueberblick', 'Ø Auslastung', tot.cap ? stPct(tot.pt, tot.cap) + ' %' : '–'),
      kpi('ueberblick', 'Registrierte Konten', stNum(acc.length)), kpi('ueberblick', 'Ø Bewertung', rt.n ? stDec(rt.sum / rt.n) + ' von 5' : '–'), kpi('ueberblick', 'Anbietende', stNum(Object.keys(hosts).length)),
      kpi('veranstaltungen', 'Ø Anmeldungen je Veranstaltung', tot.ev ? stDec(tot.pt / tot.ev) : '–'), kpi('veranstaltungen', 'Ohne Anmeldung', stNum(tot.zero)), kpi('veranstaltungen', 'Ausgebucht', stNum(tot.full)),
      kpi('veranstaltungen', 'Abgesagt', stNum(cancelledN)), kpi('veranstaltungen', 'Absagequote', kept ? stPct(cancelledN, kept) + ' %' : '–'), kpi('veranstaltungen', 'Ø Vorlauf der Anmeldung', lead.length ? stDec(lead.reduce(function (s, v) { return s + v; }, 0) / lead.length) + ' Tage' : '–'),
      kpi('nutzende', 'Neue Konten im Zeitraum', stNum(inRange.length)), kpi('nutzende', 'Aktiv in den letzten 30 Tagen', stNum(active30)), kpi('nutzende', 'Öffentliche Profile', acc.length ? stPct(pubN, acc.length) + ' %' : '–'),
      kpi('nutzende', 'Mit Profilbild', stNum(avN)), kpi('nutzende', 'Mit Expertenstatus', stNum(Object.keys(experts).length)),
      kpi('bewertungen', 'Ø Bewertung', rt.n ? stDec(rt.sum / rt.n) + ' von 5' : '–'), kpi('bewertungen', 'Abgegebene Bewertungen', stNum(rt.n)), kpi('bewertungen', 'Bewertungsquote', rt.ended ? stPct(rt.n, rt.ended) + ' %' : '–'),
      kpi('bewertungen', 'Bewertete Veranstaltungen', stNum(rt.ratedEv))];
    var names = stSeriesNames(), stats = [];
    function add(group, s) { s.group = group; stats.push(s); }
    /* Monate lückenlos */
    var keys = evs.map(function (x) { return stMonthKey(x.e.date); }).sort(), months = [];
    if (keys.length) {
      var p = keys[0].split('-'), y = +p[0], m = +p[1], last = keys[keys.length - 1];
      for (var guard = 0; guard < 120; guard++) { var k = y + '-' + pad(m); months.push(k); if (k >= last) break; m++; if (m > 12) { m = 1; y++; } }
      if (months.length > 24) months = months.slice(months.length - 24);
    }
    var M = {}; months.forEach(function (k) { M[k] = { ev: [0, 0], pt: [0, 0], cap: 0 }; });
    evs.forEach(function (x) { var r = M[stMonthKey(x.e.date)]; if (!r) return; r.ev[x.c]++; r.pt[x.c] += x.n; r.cap += x.cap; });
    function ser(f) { return names.map(function (nm, i) { return { name: nm, values: months.map(function (k) { return f(M[k], i); }) }; }); }
    var mLabels = months.map(stMonthShort);
    add('ueberblick', { id: 'monat-veranstaltungen', title: 'Veranstaltungen pro Monat', hint: 'Anzahl der Termine nach Monat, aufgeteilt nach Bereich.', type: 'columns', labels: mLabels, series: ser(function (r, i) { return r.ev[i]; }) });
    add('ueberblick', { id: 'monat-teilnehmende', title: 'Teilnehmende pro Monat', hint: 'Anmeldungen an allen Veranstaltungen eines Monats, aufgeteilt nach Bereich.', type: 'columns', labels: mLabels, series: ser(function (r, i) { return r.pt[i]; }) });
    add('veranstaltungen', { id: 'monat-auslastung', title: 'Auslastung pro Monat', hint: 'Anmeldungen im Verhältnis zu den angebotenen Plätzen.', type: 'columns', unit: ' %', labels: mLabels, series: [{ name: 'Auslastung', values: months.map(function (k) { return stPct(M[k].pt[0] + M[k].pt[1], M[k].cap); }) }] });
    add('veranstaltungen', { id: 'monatsuebersicht', title: 'Monatsübersicht', hint: 'Alle Monatszahlen im Überblick.', type: 'table', wide: true,
      head: ['Monat', 'Veranst. gesamt', names[0], names[1], 'Teiln. gesamt', names[0], names[1], 'Auslastung'], widths: [1.3, 1, 1, 1, 1, 1, 1, 1], align: ['l', 'r', 'r', 'r', 'r', 'r', 'r', 'r'],
      rows: months.map(function (k) { var r = M[k]; return [stMonthLong(k), r.ev[0] + r.ev[1], r.ev[0], r.ev[1], r.pt[0] + r.pt[1], r.pt[0], r.pt[1], stPct(r.pt[0] + r.pt[1], r.cap) + ' %']; }) });
    function groupBars(keyFn, order, val) {
      var G = {}, ks = [];
      evs.forEach(function (x) { var k = keyFn(x); if (k == null) return; if (!G[k]) { G[k] = { label: k, ev: 0, v: [0, 0] }; ks.push(k); } G[k].ev++; G[k].v[x.c] += val ? val(x) : x.n; });
      var rows = ks.map(function (k) { return G[k]; });
      if (order) rows.sort(function (a, b) { return order.indexOf(a.label) - order.indexOf(b.label); }); else rows.sort(function (a, b) { return (b.v[0] + b.v[1]) - (a.v[0] + a.v[1]) || a.label.localeCompare(b.label, 'de'); });
      return rows.map(function (r) { return { label: r.label, sub: r.ev + (r.ev === 1 ? ' Veranstaltung' : ' Veranstaltungen'), v: r.v }; });
    }
    add('themen', { id: 'thema', title: 'Teilnehmende nach Thema', hint: 'Anmeldungen je Thema, absteigend sortiert.', type: 'bars', series: names, rows: groupBars(function (x) { return capFirst(x.e.topic); }) });
    add('themen', { id: 'art', title: 'Teilnehmende nach Art', hint: 'Anmeldungen je Art der Veranstaltung.', type: 'bars', series: names, rows: groupBars(function (x) { return x.e.type; }) });
    add('themen', { id: 'angebot-thema', title: 'Angebot nach Thema', hint: 'Wie viele Veranstaltungen je Thema angeboten wurden.', type: 'bars', series: names, countUnit: 'Veranst.', rows: groupBars(function (x) { return capFirst(x.e.topic); }, null, function () { return 1; }) });
    var wd = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag'], W = wd.map(function () { return { ev: [0, 0] }; });
    evs.forEach(function (x) { var d = parseYmd(x.e.date).getDay() - 1; if (d >= 0 && d < 5) W[d].ev[x.c]++; });
    add('veranstaltungen', { id: 'wochentag', title: 'Veranstaltungen nach Wochentag', hint: 'An welchen Tagen werden Termine angeboten?', type: 'columns', labels: wd.map(function (d) { return d.slice(0, 2); }), series: names.map(function (nm, i) { return { name: nm, values: W.map(function (r) { return r.ev[i]; }) }; }) });
    add('veranstaltungen', { id: 'tageszeit', title: 'Teilnehmende nach Tageszeit', hint: 'Morgens (06:00 bis 09:00 Uhr) oder nachmittags (17:00 bis 20:00 Uhr).', type: 'bars', series: names, rows: groupBars(function (x) { return toMin(x.e.start) < 720 ? 'Morgens' : 'Nachmittags'; }, ['Morgens', 'Nachmittags']) });
    function dur(x) { var d = x.e.duration; return d <= 30 ? 'bis 30 Minuten' : d <= 60 ? '45 bis 60 Minuten' : d <= 90 ? '75 bis 90 Minuten' : '105 bis 120 Minuten'; }
    add('themen', { id: 'dauer', title: 'Teilnehmende nach Dauer', hint: 'Welche Formate werden am meisten gebucht?', type: 'bars', series: names, rows: groupBars(dur, ['bis 30 Minuten', '45 bis 60 Minuten', '75 bis 90 Minuten', '105 bis 120 Minuten']) });
    function util(x) { var p = x.cap ? x.n / x.cap : 0; return !x.n ? 'Keine Anmeldung' : p >= 1 ? 'Ausgebucht' : p >= .9 ? '90 bis 99 %' : p >= .5 ? '50 bis 89 %' : 'unter 50 %'; }
    var U = {}; evs.forEach(function (x) { var k = util(x); if (!U[k]) U[k] = { v: [0, 0] }; U[k].v[x.c]++; });
    add('veranstaltungen', { id: 'auslastung', title: 'Auslastung der Veranstaltungen', hint: 'Wie viele Termine sind wie stark belegt? (Anzahl Veranstaltungen)', type: 'bars', series: names, countUnit: 'Veranst.', rows: ['Keine Anmeldung', 'unter 50 %', '50 bis 89 %', '90 bis 99 %', 'Ausgebucht'].map(function (k) { return { label: k, sub: '', v: (U[k] || { v: [0, 0] }).v }; }) });
    var BI = {}; evs.forEach(function (x) { var k = x.e.image ? 'Eigenes Bild' : !x.e.placeholder ? 'Standardmotiv' : /^f-/.test(x.e.placeholder) ? 'Foto der Administration' : 'Illustration gewählt'; if (!BI[k]) BI[k] = [0, 0]; BI[k][x.c]++; });
    add('veranstaltungen', { id: 'bildwahl', title: 'Bilder der Veranstaltungen', hint: 'Eigenes Bild, Foto, Illustration oder Standardmotiv? (Anzahl Veranstaltungen)', type: 'bars', series: names, rows: ['Eigenes Bild', 'Foto der Administration', 'Illustration gewählt', 'Standardmotiv'].map(function (k) { return { label: k, sub: '', v: BI[k] || [0, 0] }; }) });
    var top = evs.slice().sort(function (a, b) { return b.n - a.n || (b.n / b.cap) - (a.n / a.cap); }).slice(0, 10);
    add('veranstaltungen', { id: 'top-veranstaltungen', title: 'Die zehn gefragtesten Veranstaltungen', hint: 'Nach Anzahl der Anmeldungen.', type: 'table', wide: true, head: ['Veranstaltung', 'Datum', 'Bereich', 'Anmeldungen', 'Auslastung'], widths: [4, 1.6, 1.2, 1.3, 1.2], align: ['l', 'l', 'l', 'r', 'r'],
      rows: top.map(function (x) { return [x.e.title, dateFull(x.e.date), CAT_LABEL[x.e.category], x.n + ' / ' + x.cap, stPct(x.n, x.cap) + ' %']; }) });
    var nr = evs.filter(function (x) { return !x.n; }).sort(function (a, b) { return a.e.date < b.e.date ? -1 : 1; });
    add('veranstaltungen', { id: 'ohne-anmeldung', title: 'Veranstaltungen ohne Anmeldung', hint: nr.length > 15 ? 'Die ersten 15 von ' + nr.length + ' Terminen, nach Datum.' : 'Termine, zu denen sich noch niemand angemeldet hat.', type: 'table', wide: true, head: ['Veranstaltung', 'Datum', 'Bereich', 'Benutzername'], widths: [4, 1.6, 1.2, 2.2], align: ['l', 'l', 'l', 'l'],
      rows: nr.slice(0, 15).map(function (x) { return [x.e.title, dateFull(x.e.date), CAT_LABEL[x.e.category], x.e.host]; }) });
    /* Nutzende */
    if (inRange.length) {
      var RK = {}; inRange.forEach(function (u) { var k = stMonthKey((u.created || '').slice(0, 10)); if (k.length === 7) RK[k] = (RK[k] || 0) + 1; });
      var rk = Object.keys(RK).sort().slice(-24);
      add('nutzende', { id: 'monat-registrierungen', title: 'Neue Registrierungen pro Monat', hint: 'Angelegte Konten nach Monat der Registrierung.', type: 'columns', labels: rk.map(stMonthShort), series: [{ name: 'Registrierungen', values: rk.map(function (k) { return RK[k]; }) }] });
    }
    function lastLog(u) { if (!u.lastLogin) return 'Noch nie angemeldet'; var d = (now - new Date(u.lastLogin)) / 864e5; return d < 7 ? 'In den letzten 7 Tagen' : d < 30 ? 'Vor 7 bis 30 Tagen' : d < 90 ? 'Vor 30 bis 90 Tagen' : 'Vor mehr als 90 Tagen'; }
    var LL = {}; acc.forEach(function (u) { var k = lastLog(u); LL[k] = (LL[k] || 0) + 1; });
    add('nutzende', { id: 'aktivitaet', title: 'Letzte Anmeldung', hint: 'Wann sich die Konten zuletzt angemeldet haben. (Anzahl Konten)', type: 'bars', series: ['Konten'], countUnit: 'Konten', rows: ['In den letzten 7 Tagen', 'Vor 7 bis 30 Tagen', 'Vor 30 bis 90 Tagen', 'Vor mehr als 90 Tagen', 'Noch nie angemeldet'].map(function (k) { return { label: k, sub: '', v: [LL[k] || 0, 0] }; }) });
    var LV = [0, 0, 0, 0, 0, 0, 0]; acc.forEach(function (u) { LV[u.level || 0]++; });
    add('nutzende', { id: 'abzeichen', title: 'Konten nach Abzeichen', hint: 'Verteilung der Abzeichenstufen. (Anzahl Konten)', type: 'bars', series: ['Konten'], countUnit: 'Konten', rows: ['Ohne Abzeichen'].concat(BADGE_NAMES).map(function (k, i) { return { label: k, sub: i ? 'Stufe ' + i + ', ab ' + BADGES.levels[i - 1] + ' Sessions' : '', v: [LV[i], 0] }; }) });
    add('nutzende', { id: 'profile', title: 'Profile und Profilbilder', hint: 'Freiwillige Angaben der Nutzenden. (Anzahl Konten)', type: 'bars', series: ['Konten'], countUnit: 'Konten', rows: [['Profil öffentlich', pubN], ['Profil nicht öffentlich', acc.length - pubN], ['Mit Profilbild', avN], ['Ohne Profilbild', acc.length - avN]].map(function (r) { return { label: r[0], sub: '', v: [r[1], 0] }; }) });
    var HS = {}; evs.forEach(function (x) { if (x.e.anonymized) return; var k = x.e.host.toLowerCase(); if (!HS[k]) HS[k] = { name: x.e.host, ev: 0, pt: 0, rs: 0, rn: 0 }; HS[k].ev++; HS[k].pt += x.n; (x.e.bookings || []).forEach(function (b) { if (b.rating > 0) { HS[k].rs += b.rating; HS[k].rn++; } }); });
    var hl = Object.keys(HS).map(function (k) { return HS[k]; }).sort(function (a, b) { return b.pt - a.pt || b.ev - a.ev || a.name.localeCompare(b.name, 'de'); }).slice(0, 10);
    add('nutzende', { id: 'top-anbieter', title: 'Die aktivsten Anbietenden', hint: 'Nach Anzahl der Teilnehmenden. Anonymisierte Veranstaltungen sind nicht enthalten.', type: 'table', wide: true, head: ['Benutzername', 'Veranstaltungen', 'Teilnehmende', 'Ø je Veranstaltung', 'Ø Bewertung'], widths: [3.2, 1.5, 1.5, 1.8, 1.5], align: ['l', 'r', 'r', 'r', 'r'],
      rows: hl.map(function (r) { return [r.name, r.ev, r.pt, stDec(r.pt / r.ev), r.rn ? stDec(r.rs / r.rn) : '–']; }) });
    /* Bewertungen */
    add('bewertungen', { id: 'bewertungen', title: 'Verteilung der Bewertungen', hint: 'Abgegebene Sterne nach Bereich. Eine Bewertung gilt für eine besuchte Veranstaltung.', type: 'bars', series: names, countUnit: 'Bewertungen', rows: [5, 4, 3, 2, 1].map(function (n) { return { label: n + (n === 1 ? ' Stern' : ' Sterne'), sub: '', v: rt.d[n - 1] }; }) });
    var RT = {}; evs.forEach(function (x) { (x.e.bookings || []).forEach(function (b) { if (b.rating > 0) { var k = CAT_LABEL[x.e.category] + '|' + capFirst(x.e.topic); if (!RT[k]) RT[k] = { s: 0, n: 0 }; RT[k].s += b.rating; RT[k].n++; } }); });
    add('bewertungen', { id: 'bewertung-thema', title: 'Bewertung nach Thema', hint: 'Durchschnittliche Sterne je Thema.', type: 'table', wide: false, head: ['Bereich', 'Thema', 'Bewertungen', 'Ø Sterne'], widths: [1.4, 2, 1.3, 1.1], align: ['l', 'l', 'r', 'r'],
      rows: Object.keys(RT).sort(function (a, b) { return RT[b].s / RT[b].n - RT[a].s / RT[a].n; }).map(function (k) { var p = k.split('|'); return [p[0], p[1], RT[k].n, stDec(RT[k].s / RT[k].n)]; }) });
    var best = evs.filter(function (x) { return x.e.ratingCount; }).sort(function (a, b) { return b.e.ratingAvg - a.e.ratingAvg || b.e.ratingCount - a.e.ratingCount; }).slice(0, 10);
    add('bewertungen', { id: 'top-bewertet', title: 'Die zehn am besten bewerteten Veranstaltungen', hint: 'Nach durchschnittlicher Bewertung, bei Gleichstand nach Zahl der Bewertungen.', type: 'table', wide: true, head: ['Veranstaltung', 'Datum', 'Benutzername', 'Bewertungen', 'Ø Sterne'], widths: [4, 1.6, 2, 1.3, 1.1], align: ['l', 'l', 'l', 'r', 'r'],
      rows: best.map(function (x) { return [x.e.title, dateFull(x.e.date), x.e.host, x.e.ratingCount, stDec(x.e.ratingAvg)]; }) });
    /* Datenschutz */
    var DS = { 'Personenbezogen gespeichert': [0, 0], 'Anonymisiert': [0, 0] };
    evs.forEach(function (x) { DS[x.e.anonymized ? 'Anonymisiert' : 'Personenbezogen gespeichert'][x.c]++; });
    kpis.push(kpi('daten', 'Personenbezogen gespeichert', stNum(DS['Personenbezogen gespeichert'][0] + DS['Personenbezogen gespeichert'][1])), kpi('daten', 'Anonymisiert', stNum(DS['Anonymisiert'][0] + DS['Anonymisiert'][1])));
    add('daten', { id: 'datenstatus', title: 'Personenbezogene Daten', hint: 'Alle Veranstaltungen werden fünf Jahre nach dem Ende anonymisiert. (Anzahl Veranstaltungen)', type: 'bars', series: names, rows: Object.keys(DS).map(function (k) { return { label: k, sub: '', v: DS[k] }; }) });
    var soon = evs.filter(function (x) { return !x.e.anonymized && eventEnded(x.e); }).map(function (x) { return { x: x, d: anonymizeOn(x.e) }; }).sort(function (a, b) { return a.d - b.d; }).slice(0, 10);
    add('daten', { id: 'anonymisierung', title: 'Nächste Anonymisierungen', hint: 'Die zehn Veranstaltungen, deren Daten als Nächstes anonymisiert werden.', type: 'table', wide: true, head: ['Veranstaltung', 'Datum', 'Bereich', 'Anonymisierung am'], widths: [4, 1.6, 1.2, 1.8], align: ['l', 'l', 'l', 'l'],
      rows: soon.map(function (o) { var d = o.d; return [o.x.e.title, dateFull(o.x.e.date), CAT_LABEL[o.x.e.category], pad(d.getDate()) + '.' + pad(d.getMonth() + 1) + '.' + d.getFullYear()]; }) });
    return { kpis: kpis, stats: stats, count: evs.length };
  }

  /* ---- Darstellung auf dem Bildschirm ---- */
  function stNice(max) { if (max <= 4) return 4; var p = Math.pow(10, Math.floor(Math.log(max / 4) / Math.LN10)), s = max / 4 / p, n = s <= 1 ? 1 : s <= 2 ? 2 : s <= 2.5 ? 2.5 : s <= 5 ? 5 : 10; return Math.round(n * p * 4); }
  function stColumnsSvg(s) {
    var W = 560, H = 240, L = 40, R = 8, T = 22, B = 30, pw = W - L - R, ph = H - T - B, n = s.labels.length, ns = s.series.length;
    var totals = s.labels.map(function (_, i) { return s.series.reduce(function (a, q) { return a + q.values[i]; }, 0); });
    var max = stNice(Math.max.apply(null, totals.concat([1]))), g = [];
    for (var i = 0; i <= 4; i++) { var y = T + ph - ph * i / 4, v = max * i / 4; g.push('<line x1="' + L + '" x2="' + (W - R) + '" y1="' + y + '" y2="' + y + '" class="st-grid"/><text x="' + (L - 6) + '" y="' + (y + 4) + '" text-anchor="end" class="st-ax">' + (Math.round(v * 10) / 10) + (s.unit || '') + '</text>'); }
    var slot = pw / Math.max(n, 1), bw = Math.min(34, slot * .62), bars = [], step = n > 14 ? 2 : 1;
    s.labels.forEach(function (lb, i) {
      var cx = L + slot * i + slot / 2, acc = 0, topIdx = -1;
      s.series.forEach(function (q, j) { if (q.values[i] > 0) topIdx = j; });
      s.series.forEach(function (q, j) {
        var v = q.values[i]; if (!v) return;
        var h0 = ph * v / max, y0 = T + ph - ph * acc / max - h0, gap = acc ? 2 : 0, hh = Math.max(h0 - gap, 1), tip = lb + ', ' + q.name + ': ' + v + (s.unit || '');
        var r = j === topIdx ? Math.min(4, hh / 2) : 0, x = cx - bw / 2;
        var d = 'M' + x + ' ' + (y0 + hh) + 'V' + (y0 + r) + (r ? 'Q' + x + ' ' + y0 + ' ' + (x + r) + ' ' + y0 + 'H' + (x + bw - r) + 'Q' + (x + bw) + ' ' + y0 + ' ' + (x + bw) + ' ' + (y0 + r) : 'H' + (x + bw)) + 'V' + (y0 + hh) + 'Z';
        bars.push('<path d="' + d + '" class="st-s' + (ns === 1 ? 2 : j) + '"><title>' + esc(tip) + '</title></path>');
        acc += v;
      });
      if (totals[i] && n <= 14) bars.push('<text x="' + cx + '" y="' + (T + ph - ph * totals[i] / max - 5) + '" text-anchor="middle" class="st-val">' + totals[i] + (s.unit || '') + '</text>');
      if (i % step === 0) bars.push('<text x="' + cx + '" y="' + (H - 10) + '" text-anchor="middle" class="st-ax">' + esc(lb) + '</text>');
    });
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(s.title) + '" class="st-svg">' + g.join('') + bars.join('') + '</svg>';
  }
  function stLegend(names) { return names.length < 2 ? '' : '<div class="st-legend">' + names.map(function (n, i) { return '<span><i class="st-sw st-s' + i + '"></i>' + esc(n) + '</span>'; }).join('') + '</div>'; }
  function stBarsHtml(s) {
    var max = Math.max.apply(null, s.rows.map(function (r) { return r.v[0] + r.v[1]; }).concat([1]));
    return '<div class="st-bars">' + s.rows.map(function (r) {
      var t = r.v[0] + r.v[1];
      var segs = r.v.map(function (v, j) { return v ? '<i class="st-s' + j + '" style="width:' + (v / max * 100) + '%" title="' + esc(r.label + ', ' + s.series[j] + ': ' + v) + '"></i>' : ''; }).join('');
      return '<div class="st-row"><div class="st-rl"><b>' + esc(r.label) + '</b>' + (r.sub ? '<small>' + esc(r.sub) + '</small>' : '') + '</div><div class="st-track">' + segs + '</div><div class="st-rv">' + t + '</div></div>';
    }).join('') + '</div>';
  }
  function stTableHtml(s) {
    var th = s.head.map(function (t, i) { return '<th' + (s.align[i] === 'r' ? ' class="r"' : '') + '>' + esc(t) + '</th>'; }).join('');
    var body = s.rows.length ? s.rows.map(function (r) { return '<tr>' + r.map(function (c, i) { return '<td' + (s.align[i] === 'r' ? ' class="r"' : '') + '>' + esc(String(c)) + '</td>'; }).join('') + '</tr>'; }).join('') : '<tr><td colspan="' + s.head.length + '" class="hint">Keine Daten im gewählten Zeitraum.</td></tr>';
    return '<div class="tbl-wrap"><table class="tbl st-tbl" style="min-width:0"><thead><tr>' + th + '</tr></thead><tbody>' + body + '</tbody></table></div>';
  }
  function stCard(s, onPdf) {
    var empty = (s.type === 'columns' && !s.labels.length) || (s.type === 'bars' && !s.rows.length);
    var inner = empty ? '<p class="hint">Keine Daten im gewählten Zeitraum.</p>' : s.type === 'columns' ? stLegend(s.series.map(function (q) { return q.name; }).filter(function () { return s.series.length > 1; })) + stColumnsSvg(s) : s.type === 'bars' ? stLegend(s.series) + stBarsHtml(s) : stTableHtml(s);
    var pdf = h('button', { type: 'button', class: 'btn btn-secondary btn-sm', 'data-pdf': s.id, text: 'PDF', title: 'Diese Auswertung als PDF speichern', onclick: onPdf });
    return h('section', { class: 'st-card' + (s.wide ? ' st-wide' : ''), 'aria-label': s.title }, [h('div', { class: 'st-head' }, [h('div', null, [h('h3', { text: s.title }), h('p', { class: 'hint', text: s.hint })]), pdf]), h('div', { html: inner })]);
  }

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

  function buildPdf(title, filterText, kpis, stats, appTitle) {
    var PW = 595, PH = 842, ML = 40, CW = PW - 2 * ML, pages = [], c = null, y = 0;
    var INK = '#001957', GREY = '#5f6b85', LINE = '#d9dee9';
    function f2(n) { return (Math.round(n * 100) / 100).toString(); }
    function rect(x, yTop, w, hh, col) { c.push(pdfRgb(col) + ' rg ' + f2(x) + ' ' + f2(PH - yTop - hh) + ' ' + f2(w) + ' ' + f2(hh) + ' re f'); }
    function text(x, yBase, str, size, bold, col, align) {
      str = String(str); var w = pdfW(str, size, bold); if (align === 'r') x -= w; else if (align === 'c') x -= w / 2;
      c.push('BT /' + (bold ? 'F2' : 'F1') + ' ' + size + ' Tf ' + pdfRgb(col) + ' rg ' + f2(x) + ' ' + f2(PH - yBase) + ' Td <' + pdfHex(str) + '> Tj ET');
    }
    function line(x1, y1, x2, y2, col, wd) { c.push(pdfRgb(col) + ' RG ' + (wd || .5) + ' w ' + f2(x1) + ' ' + f2(PH - y1) + ' m ' + f2(x2) + ' ' + f2(PH - y2) + ' l S'); }
    function newPage() {
      c = []; pages.push(c);
      rect(0, 0, PW, 54, INK); rect(0, 54, PW, 4, '#f79506');
      text(ML, 38, 'R+V', 22, true, '#ffffff');
      var at = appTitle.indexOf('@'), base = at < 0 ? appTitle : appTitle.slice(0, at), ad = at < 0 ? '' : appTitle.slice(at), wAd = pdfW(ad, 12, true);
      text(PW - ML - wAd, 36, base, 12, true, '#ffffff', 'r'); if (ad) text(PW - ML, 36, ad, 12, true, '#f79506', 'r');
      y = 84;
    }
    function need(hh) { if (y + hh > PH - 52) newPage(); }
    newPage();
    text(ML, y + 14, title, 19, true, INK); y += 24;
    text(ML, y + 8, filterText, 9, false, GREY); y += 10;
    var now = new Date(); text(ML, y + 10, 'Erstellt am ' + pad(now.getDate()) + '.' + pad(now.getMonth() + 1) + '.' + now.getFullYear() + ', ' + pad(now.getHours()) + ':' + pad(now.getMinutes()) + ' Uhr', 9, false, GREY); y += 24;
    if (kpis && kpis.length) {
      var kw = (CW - 3 * 8) / 4;
      kpis.forEach(function (k, i) { var col = i % 4, row = Math.floor(i / 4); if (!col) need(54); var x = ML + col * (kw + 8); rect(x, y, kw, 46, '#f3f5f9'); rect(x, y, 3, 46, '#f79506'); text(x + 12, y + 24, k.value, 17, true, INK); text(x + 12, y + 38, pdfFit(k.label, kw - 18, 8, false), 8, false, GREY); if (col === 3 || i === kpis.length - 1) y += 54; });
      y += 8;
    }
    stats.forEach(function (s) {
      var bodyH = s.type === 'columns' ? 190 : s.type === 'bars' ? 40 + s.rows.length * 20 : 40 + (Math.min(s.rows.length, 3) + 1) * 17;
      need(Math.min(bodyH + 46, 400));
      text(ML, y + 12, s.title, 12.5, true, INK); y += 17; text(ML, y + 8, s.hint, 8.5, false, GREY); y += 16;
      if (s.type === 'columns') {
        if (!s.labels.length) { text(ML, y + 10, 'Keine Daten im gewählten Zeitraum.', 9, false, GREY); y += 24; return; }
        if (s.series.length > 1) { var lx = ML; s.series.forEach(function (q, j) { rect(lx, y, 8, 8, ST_PDF_COL[j]); text(lx + 12, y + 7.5, q.name, 8.5, false, INK); lx += 12 + pdfW(q.name, 8.5, false) + 16; }); y += 16; }
        var L = ML + 28, pw = CW - 28, ph = 130, n = s.labels.length, slot = pw / n, bw = Math.min(26, slot * .62);
        var tot = s.labels.map(function (_, i) { return s.series.reduce(function (a, q) { return a + q.values[i]; }, 0); }), max = stNice(Math.max.apply(null, tot.concat([1])));
        for (var g = 0; g <= 4; g++) { var gy = y + 6 + ph - ph * g / 4; line(L, gy, ML + CW, gy, LINE, .5); text(L - 5, gy + 3, Math.round(max * g / 4 * 10) / 10, 7.5, false, GREY, 'r'); }
        s.labels.forEach(function (lb, i) {
          var cx = L + slot * i + slot / 2, acc = 0;
          s.series.forEach(function (q, j) { var v = q.values[i]; if (!v) return; var hh = ph * v / max; rect(cx - bw / 2, y + 6 + ph - ph * acc / max - hh, bw, Math.max(hh - (acc ? 1.2 : 0), .8), s.series.length === 1 ? ST_PDF_COL[0] : ST_PDF_COL[j]); acc += v; });
          if (tot[i] && n <= 14) text(cx, y + 6 + ph - ph * tot[i] / max - 3, tot[i], 7.5, true, INK, 'c');
          if (!(n > 14 && i % 2)) text(cx, y + 6 + ph + 11, lb, 7.5, false, GREY, 'c');
        });
        y += ph + 26;
      } else if (s.type === 'bars') {
        if (!s.rows.length) { text(ML, y + 10, 'Keine Daten im gewählten Zeitraum.', 9, false, GREY); y += 24; return; }
        var lg = ML; s.series.forEach(function (nm, j) { rect(lg, y, 8, 8, ST_PDF_COL[j]); text(lg + 12, y + 7.5, nm, 8.5, false, INK); lg += 12 + pdfW(nm, 8.5, false) + 16; }); y += 16;
        var mx = Math.max.apply(null, s.rows.map(function (r) { return r.v[0] + r.v[1]; }).concat([1])), bx = ML + 150, bwid = CW - 150 - 34;
        s.rows.forEach(function (r) {
          need(22); text(ML, y + 9, pdfFit(r.label, 146, 8.5, true), 8.5, true, INK); if (r.sub) text(ML, y + 18, pdfFit(r.sub, 146, 7, false), 7, false, GREY);
          var x = bx; r.v.forEach(function (v, j) { if (!v) return; var w = bwid * v / mx; rect(x, y + 2, Math.max(w - 1.2, .8), 12, ST_PDF_COL[j]); x += w; });
          text(ML + CW, y + 11, r.v[0] + r.v[1], 8.5, true, INK, 'r'); y += 21;
        });
        y += 6;
      } else {
        var sum = s.widths.reduce(function (a, b) { return a + b; }, 0), xs = [], xx = ML; s.widths.forEach(function (w) { xs.push(xx); xx += CW * w / sum; }); xs.push(ML + CW);
        function head() { rect(ML, y, CW, 16, '#e3e8f3'); s.head.forEach(function (t, i) { var cw = xs[i + 1] - xs[i] - 8; if (s.align[i] === 'r') text(xs[i + 1] - 4, y + 11, pdfFit(t, cw, 8, true), 8, true, INK, 'r'); else text(xs[i] + 4, y + 11, pdfFit(t, cw, 8, true), 8, true, INK); }); y += 16; }
        head();
        if (!s.rows.length) { text(ML + 4, y + 12, 'Keine Daten im gewählten Zeitraum.', 8.5, false, GREY); y += 20; }
        s.rows.forEach(function (r) {
          if (y + 16 > PH - 52) { newPage(); head(); }
          r.forEach(function (cell, i) { var cw = xs[i + 1] - xs[i] - 8; if (s.align[i] === 'r') text(xs[i + 1] - 4, y + 11, pdfFit(cell, cw, 8.5, false), 8.5, false, INK, 'r'); else text(xs[i] + 4, y + 11, pdfFit(cell, cw, 8.5, false), 8.5, false, INK); });
          line(ML, y + 16, ML + CW, y + 16, LINE, .4); y += 16;
        });
        y += 8;
      }
      y += 10;
    });
    /* Fusszeile mit Seitenzahlen */
    var total = pages.length;
    pages.forEach(function (p, i) { c = p; line(ML, PH - 34, ML + CW, PH - 34, LINE, .5); text(ML, PH - 22, appTitle + ' · ' + title, 8, false, GREY); text(ML + CW, PH - 22, 'Seite ' + (i + 1) + ' von ' + total, 8, false, GREY, 'r'); });
    /* Objekte */
    var objs = [], kids = [];
    objs[0] = '<< /Type /Catalog /Pages 2 0 R >>'; objs[1] = null;
    objs[2] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>';
    objs[3] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>';
    pages.forEach(function (p) {
      var s = p.join('\n'), ci = objs.length + 1; objs.push('<< /Length ' + s.length + ' >>\nstream\n' + s + '\nendstream');
      objs.push('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' + PW + ' ' + PH + '] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ' + ci + ' 0 R >>'); kids.push(objs.length + ' 0 R');
    });
    objs[1] = '<< /Type /Pages /Count ' + pages.length + ' /Kids [' + kids.join(' ') + '] >>';
    objs.push('<< /Title <FEFF' + pdfUtf16(title) + '> /Creator (' + 'LearnTogether' + ') /Producer (LearnTogether) >>');
    var out = '%PDF-1.4\n', offs = [];
    objs.forEach(function (o, i) { offs.push(out.length); out += (i + 1) + ' 0 obj\n' + o + '\nendobj\n'; });
    var xr = out.length; out += 'xref\n0 ' + (objs.length + 1) + '\n0000000000 65535 f \n';
    offs.forEach(function (o) { out += ('0000000000' + o).slice(-10) + ' 00000 n \n'; });
    out += 'trailer\n<< /Size ' + (objs.length + 1) + ' /Root 1 0 R /Info ' + objs.length + ' 0 R >>\nstartxref\n' + xr + '\n%%EOF';
    return new Blob([out], { type: 'application/pdf' });
  }
  function pdfUtf16(s) { var o = ''; for (var i = 0; i < s.length; i++) { var h4 = s.charCodeAt(i).toString(16); o += ('0000' + h4).slice(-4); } return o.toUpperCase(); }
  function saveBlob(blob, name) {
    if (CFG.mode === 'artifact') { toast('Downloads sind in der Artefakt-Vorschau gesperrt. In der IIS-Version wird ' + name + ' heruntergeladen.', true); return; }
    var url = URL.createObjectURL(blob), a = h('a', { href: url, download: name }); document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
  }

  /* ---- Statistik-Seite ---- */
  function adminStats() {
    return Promise.all([Api.adminEvents(), Api.adminUsers()]).then(function (res) {
      var list = res[0], users = res[1];
      var F = { from: '', to: '', cat: '', noTest: false }, host = h('div');
      var from = h('input', { type: 'date', id: 'sf-from', 'aria-label': 'Zeitraum von' }), to = h('input', { type: 'date', id: 'sf-to', 'aria-label': 'Zeitraum bis' });
      var cat = h('select', { id: 'sf-cat', 'aria-label': 'Bereich' }, [h('option', { value: '', text: 'Alle' }), h('option', { value: 'dienstlich', text: CAT_LABEL.dienstlich }), h('option', { value: 'privat', text: CAT_LABEL.privat })]);
      var noTest = h('input', { type: 'checkbox', id: 'sf-notest' });
      var hasTest = list.some(function (e) { return e.isTest; }) || users.some(function (u) { return u.isTest; });
      var cur = null;
      function filterText() {
        var p = [F.from || F.to ? 'Zeitraum: ' + (F.from ? dateFull(F.from) : 'Beginn') + ' bis ' + (F.to ? dateFull(F.to) : 'Ende') : 'Zeitraum: alle Veranstaltungen', 'Bereich: ' + (F.cat ? CAT_LABEL[F.cat] : 'alle')];
        if (F.noTest) p.push('ohne Testdaten'); else if (hasTest) p.push('inkl. Testdaten');
        return p.join(' · ');
      }
      function pdf(title, kp, st, name) { try { saveBlob(buildPdf(title, filterText(), kp, st, state.settings.appTitle), 'LearnTogether_Statistik_' + name + '_' + todayYmd() + '.pdf'); } catch (er) { toast('Das PDF konnte nicht erstellt werden: ' + er.message, true); } }
      function render() {
        clear(host); cur = computeStats(list, F, users);
        if (!cur.count && !cur.stats.length) { host.appendChild(h('div', { class: 'empty' }, [h('h2', { text: 'Keine Daten' }), h('p', { text: 'Für diese Auswahl gibt es keine Veranstaltungen. Passe den Zeitraum an oder lade Testdaten.' })])); return; }
        /* Bereiche statt einer langen Seite: je Bereich Kennzahlen, Auswertungen und ein eigener PDF-Bericht */
        host.appendChild(tabs('lt_tab_stat', ST_GROUPS.map(function (g) {
          var ks = cur.kpis.filter(function (k) { return k.group === g[0]; }), ss = cur.stats.filter(function (x) { return x.group === g[0]; });
          return [g[0], g[1], null, function () {
            var grid = h('div', { class: 'st-grid-wrap' });
            ss.forEach(function (x) { grid.appendChild(stCard(x, function () { pdf(x.title, null, [x], x.id); })); });
            return h('div', { class: 'st-sec' }, [h('div', { class: 'st-sec-head' }, [h('h3', { text: g[1] }), h('button', { type: 'button', class: 'btn btn-secondary btn-sm', 'data-pdf-group': g[0], text: 'Bereich als PDF', onclick: function () { pdf('Statistik: ' + g[1], ks, ss, 'Bereich_' + g[0]); } })]),
              ks.length ? h('div', { class: 'st-kpis' }, ks.map(function (k) { return h('div', { class: 'st-kpi' }, [h('b', { text: k.value }), h('span', { text: k.label })]); })) : null, grid]);
          }];
        })));
      }
      from.addEventListener('input', function () { F.from = from.value; render(); }); to.addEventListener('input', function () { F.to = to.value; render(); });
      cat.addEventListener('change', function () { F.cat = cat.value; render(); }); noTest.addEventListener('change', function () { F.noTest = noTest.checked; render(); });
      function fld(l, c) { return h('div', { class: 'afld' }, [h('label', { text: l }), c]); }
      var all = h('button', { type: 'button', class: 'btn btn-primary', id: 'st-pdf-all', text: 'Gesamtbericht als PDF', onclick: function () { if (cur && (cur.count || cur.stats.length)) pdf('Statistik und Berichte', cur.kpis, cur.stats, 'Gesamtbericht'); else toast('Es gibt keine Daten für einen Bericht.', true); } });
      var tools = [fld('Von', from), fld('Bis', to), fld('Bereich', cat)];
      if (hasTest) tools.push(h('label', { class: 'st-chk' }, [noTest, ' Testdaten ausblenden']));
      render();
      return h('div', null, [h('p', { class: 'lead', text: 'Auswertungen zu Veranstaltungen, Nutzenden und Bewertungen in sechs Bereichen. Jede Auswertung, jeder Bereich und der Gesamtbericht lassen sich als PDF speichern. Eine Anmeldung zählt im Monat der Veranstaltung.' }), h('div', { class: 'afilter' }, tools.concat([h('div', { style: 'margin-left:auto' }, all)])), host]);
    });
  }

  /* ---- Handbuch fuer Administrierende (nur nach Anmeldung abrufbar) ---- */
  function adminManual() {
    return Api.adminManual().then(function (html) {
      var body = h('div', { class: 'manual-body', html: html }), toc = h('nav', { class: 'manual-toc', 'aria-label': 'Inhalt' });
      $$('h2', body).forEach(function (hh, i) { hh.id = 'akap-' + (i + 1); toc.appendChild(h('a', { href: '#/admin', text: hh.textContent, onclick: function (e) { e.preventDefault(); hh.scrollIntoView({ behavior: 'smooth' }); } })); });
      var pdf = h('button', { type: 'button', class: 'btn btn-primary', id: 'am-pdf', html: ico('download') + ' Als PDF herunterladen', onclick: function () {
        Api.adminManualPdf().then(function (b) { saveBlob(b, 'LearnTogether-Administrationshandbuch.pdf'); }, function (er) { toast(er.message, true); });
      } });
      return h('div', null, [h('p', { class: 'lead', text: 'So richtest Du ' + state.settings.appTitle + ' ein und betreibst die Anwendung. Dieses Handbuch ist nur nach der Anmeldung im Admin-Bereich sichtbar.' }), h('div', { class: 'manual-tools' }, pdf), h('div', { class: 'manual-layout adm-manual' }, [toc, body])]);
    });
  }

  /* ---- Archiv: Veranstaltungen, die stattgefunden haben (oder abgesagt waren und vorbei sind) ---- */
  function adminArchive() {
    return Api.adminEvents().then(function (all) {
      var F = { cat: 'dienstlich', q: '', type: '', topic: '', from: '', to: '' };
      var list = all.filter(eventEnded);
      var host = h('div'), count = h('span', { class: 'hint', 'aria-live': 'polite' });
      var seg = h('div', { class: 'seg', role: 'group', 'aria-label': 'Bereich' });
      var search = h('input', { type: 'search', id: 'ar-q', placeholder: 'Titel, Benutzername, Name, Thema …', 'aria-label': 'Archiv durchsuchen' });
      var typeSel = h('select', { id: 'ar-type', 'aria-label': 'Art' }), topicSel = h('select', { id: 'ar-topic', 'aria-label': 'Thema' });
      var from = h('input', { type: 'date', id: 'ar-from', 'aria-label': 'Zeitraum von' }), to = h('input', { type: 'date', id: 'ar-to', 'aria-label': 'Zeitraum bis' });
      function opt(v, t) { return h('option', { value: v, text: t }); }
      function fillSelects() {
        clear(typeSel); typeSel.appendChild(opt('', 'Alle')); TYPES.forEach(function (t) { typeSel.appendChild(opt(t, t)); }); typeSel.value = F.type;
        clear(topicSel); topicSel.appendChild(opt('', 'Alle')); sortTopics(TOPICS[F.cat]).forEach(function (t) { topicSel.appendChild(opt(t, capFirst(t))); }); topicSel.value = F.topic;
      }
      function nIn(c) { return list.filter(function (e) { return e.category === c; }).length; }
      function drawSeg() {
        clear(seg);
        ['dienstlich', 'privat'].forEach(function (c) {
          seg.appendChild(h('button', { type: 'button', 'data-cat': c, 'aria-pressed': String(F.cat === c), text: CAT_LABEL[c] + ' (' + nIn(c) + ')', onclick: function () { F.cat = c; F.topic = ''; drawSeg(); fillSelects(); render(); } }));
        });
      }
      search.addEventListener('input', function () { F.q = search.value.toLowerCase().trim(); render(); });
      typeSel.addEventListener('change', function () { F.type = typeSel.value; render(); });
      topicSel.addEventListener('change', function () { F.topic = topicSel.value; render(); });
      from.addEventListener('input', function () { F.from = from.value; render(); }); to.addEventListener('input', function () { F.to = to.value; render(); });
      var resetBtn = h('button', { type: 'button', class: 'linkbtn', text: 'Filter zurücksetzen', hidden: true, onclick: function () { F.q = ''; F.type = ''; F.topic = ''; F.from = ''; F.to = ''; search.value = ''; from.value = ''; to.value = ''; fillSelects(); render(); } });
      function matches(e) {
        if (e.category !== F.cat) return false;
        if (F.q && (e.title + ' ' + e.host + ' ' + (e.owner ? e.owner.firstName + ' ' + e.owner.lastName : '') + ' ' + e.topic + ' ' + e.type).toLowerCase().indexOf(F.q) < 0) return false;
        if (F.type && e.type !== F.type) return false;
        if (F.topic && e.topic !== F.topic) return false;
        if (F.from && e.date < F.from) return false;
        if (F.to && e.date > F.to) return false;
        return true;
      }
      function fmtDay(d) { return pad(d.getDate()) + '.' + pad(d.getMonth() + 1) + '.' + d.getFullYear(); }
      function dataState(e) {
        if (e.anonymized) return [h('b', { text: 'Anonymisiert' }), h('div', { class: 'hint', text: e.anonymizedAt ? 'am ' + fmtDay(new Date(e.anonymizedAt)) : 'Personenbezogene Daten entfernt' })];
        var d = anonymizeOn(e);
        return [h('b', { text: 'Personenbezogen' }), h('div', { class: 'hint', text: 'Anonymisierung am ' + fmtDay(d) })];
      }
      function people(e) {
        var body = h('div', { class: 'modal-body people' });
        body.appendChild(h('div', null, [h('div', { class: 'hint', text: 'Teilnehmende (Archiv)' }), h('h2', { text: e.title, style: 'margin:2px 0 0;overflow-wrap:anywhere' }), h('div', { class: 'hint', text: dateFull(e.date) + ', ' + e.start + '\u2013' + endHm(e) + ' Uhr \u00b7 ' + e.host + (e.ratingCount ? ' \u00b7 \u00d8 ' + fmtAvg(e.ratingAvg) + ' Sterne' : '') })]));
        if (e.cancelled) body.appendChild(h('div', { class: 'notice warn' }, h('div', { class: 'n-body' }, [h('b', { text: 'Abgesagt' }), h('div', { text: e.cancelReason || 'Die Veranstaltung hat nicht stattgefunden.' })])));
        if (e.anonymized) body.appendChild(h('div', { class: 'notice' }, 'Die personenbezogenen Daten dieser Veranstaltung wurden anonymisiert. Es bleibt die Zahl der Anmeldungen.'));
        if (!e.bookings.length) body.appendChild(h('div', { class: 'empty', style: 'padding:24px' }, h('p', { text: 'Es gab keine Anmeldungen.' })));
        else {
          var tb = h('tbody');
          e.bookings.forEach(function (b, i) { tb.appendChild(h('tr', null, [h('td', { text: String(i + 1) }), h('td', null, h('b', { text: b.username })), h('td', { text: ((b.firstName || '') + ' ' + (b.lastName || '')).trim() || '\u2013' }), h('td', { text: b.xv || '\u2013' }), h('td', { text: b.email || '\u2013', style: 'overflow-wrap:anywhere' }), h('td', null, b.rating ? ratingNode(b.rating, 1) : '\u2013')])); });
          body.appendChild(h('div', { class: 'tbl-wrap' }, h('table', { class: 'tbl people-tbl' }, [h('thead', null, h('tr', null, ['Nr.', 'Benutzername', 'Name', 'XV-Nr.', 'E-Mail', 'Bewertung'].map(function (t) { return h('th', { text: t }); }))), tb])));
          if (!e.anonymized) body.appendChild(h('div', { class: 'people-foot' }, h('button', { class: 'btn btn-secondary btn-sm', type: 'button', text: 'E-Mail-Adressen kopieren', onclick: function () { copy(e.bookings.map(function (b) { return b.email; }).filter(Boolean).join('; ')); } })));
        }
        return body;
      }
      function render() {
        clear(host);
        var items = list.filter(matches).sort(function (a, b) { return endDate(b) - endDate(a); });
        var active = !!(F.q || F.type || F.topic || F.from || F.to); resetBtn.hidden = !active;
        count.textContent = items.length + (active ? ' von ' + nIn(F.cat) : '') + ' archivierte Veranstaltungen (' + CAT_LABEL[F.cat] + ')' + ', ' + items.reduce(function (s, e) { return s + e.bookings.length; }, 0) + ' Anmeldungen';
        if (!items.length) { host.appendChild(h('div', { class: 'empty' }, [h('h2', { text: active ? 'Nichts gefunden' : 'Das Archiv ist leer' }), h('p', { text: active ? 'Für diese Filter gibt es keine archivierte Veranstaltung.' : 'Veranstaltungen erscheinen hier automatisch, sobald sie beendet sind.' })])); return; }
        var tb = h('tbody');
        items.forEach(function (e) {
          var del = h('button', { class: 'btn btn-danger btn-sm', type: 'button', text: 'Löschen' });
          del.addEventListener('click', function () {
            if (del._c) { Api.adminDeleteEvent(e.id).then(function () { toast('Veranstaltung gelöscht.'); return Api.adminEvents().then(function (l) { list = l.filter(eventEnded); drawSeg(); render(); }); }, function (er) { toast(er.message, true); }); return; }
            del._c = true; del.setAttribute('data-c', '1'); del.textContent = 'Wirklich löschen?'; setTimeout(function () { del._c = false; del.removeAttribute('data-c'); del.textContent = 'Löschen'; }, 4000);
          });
          tb.appendChild(h('tr', { class: e.cancelled ? 'past' : '' }, [
            h('td', { class: 'c-title' }, [h('b', { text: e.title }), h('div', { class: 'meta' }, [h('span', { text: e.type + ' \u00b7 ' + capFirst(e.topic) }), e.cancelled ? h('span', { class: 'tag past', text: 'abgesagt' }) : null, e.isTest ? h('span', { class: 'tag test', text: 'Testdaten' }) : null])]),
            h('td', { class: 'c-when' }, [h('b', { text: dateFull(e.date) }), h('div', { class: 'hint', text: e.start + '\u2013' + endHm(e) + ' Uhr' })]),
            h('td', { class: 'c-host' }, [userTag(e.host, e.hostLevel, e.hostExpert), e.owner ? h('div', { class: 'hint', text: e.owner.firstName + ' ' + e.owner.lastName + ' \u00b7 ' + e.owner.xv }) : null]),
            h('td', { class: 'c-occ' }, [h('b', { text: e.bookings.length + ' / ' + e.capacity })]),
            h('td', { class: 'c-rate' }, e.cancelled ? '\u2013' : ratingNode(e.ratingAvg, e.ratingCount)),
            h('td', { class: 'c-data' }, dataState(e)),
            h('td', { class: 'c-act' }, h('div', { class: 'acts' }, [h('button', { class: 'btn btn-primary btn-sm', type: 'button', text: 'Teilnehmende (' + e.bookings.length + ')', onclick: function () { openModal(people(e), { wide: true, label: 'Teilnehmende' }); } }), del]))]));
        });
        host.appendChild(h('div', { class: 'tbl-wrap' }, h('table', { class: 'tbl tbl-events' }, [h('thead', null, h('tr', null, ['Veranstaltung', 'Termin', 'Angeboten von', 'Teilnehmende', 'Ø Bewertung', 'Personenbezogene Daten', 'Aktionen'].map(function (t) { return h('th', { text: t }); }))), tb])));
      }
      function fld(label, ctl, cls) { return h('div', { class: 'afld' + (cls ? ' ' + cls : '') }, [h('label', { text: label }), ctl]); }
      drawSeg(); fillSelects(); render();
      return h('div', null, [
        h('p', { class: 'lead', text: 'Beendete Veranstaltungen wandern automatisch ins Archiv. Alle Veranstaltungen werden fünf Jahre nach dem Ende anonymisiert, private wie dienstliche. Bis dahin sind die Daten nur hier und nur für die Administration sichtbar. Die Spalte „Ø Bewertung“ zeigt den Durchschnitt der Sterne.' }),
        h('div', { style: 'margin:16px 0' }, seg),
        h('div', { class: 'afilter' }, [fld('Suche', search, 'wide'), fld('Art', typeSel), fld('Thema', topicSel), fld('Von', from), fld('Bis', to)]),
        h('div', { class: 'toolrow' }, [count, resetBtn]), host]);
    });
  }
