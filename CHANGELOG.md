# Änderungen

## 0.34.0 (04.10.2026)
- **Testdaten erweitert** (24 Beispielnutzer, neue Szenarien):
  - Konten: gesperrtes Konto, nie angemeldetes Konto, verteilte letzte Anmeldungen für die Statistik.
  - Abzeichen: Learnicorn mit 520 Sessions, Diamant ohne Freigabe der Abzeichen.
  - Mitteilungen: Termin-Update nach geänderter Uhrzeit.
  - Bewertungen: Termin mit nur zwei Bewertungen (unter der Schwelle).
  - Zeitfenster: Termin endet genau um 20:00 Uhr.
  - Aufbewahrung: privater Termin älter als 12 Monate (anonymisiert), dienstlicher Termin älter als 12 Monate (bleibt).
  - IDD: abgelaufene Frist der LearnMaker, erneut freigeschaltete Bestätigung, nachgetragene Teilnahme mit Begründung, abgesagte IDD-Veranstaltung, zwei Stunden mit Pause ohne Lernzeit, weitere Lerninhalte.
- Testdaten-Import (Demo und IIS) übernimmt dafür Sperre, letzte Anmeldung, Zähler aus dem Verlauf, erneute Freischaltung, Termin-Update und Nachträge.
- Admin-Handbuch mit Übersicht der Szenarien und Testkonten. Screenshots und Präsentation aktualisiert.

## 0.33.0 (04.10.2026)
- **LearnMaker:** Personen, die Veranstaltungen anbieten, heißen jetzt LearnMaker. Der Name ersetzt „Anbietende“ und „Anbieter“ in App, Meldungen des Servers, Statistik, Handbüchern, Papier IT-Sicherheit und Datenschutz und Präsentation. Die Seite „Veranstaltung anbieten“ beginnt mit „Werde LearnMaker“. Der Learnicorn heißt jetzt „das Einhorn unter den LearnMakern“.
- Screenshots aktualisiert.

## 0.32.0 (04.10.2026)
- **Versteckte Abzeichenstufe „Learnicorn“:** das Einhorn unter den Anbietenden, Standard ab 500 durchgeführten Sessions. Eigenes Abzeichen (Einhornkopf mit orangem Horn auf dunkelblauer Scheibe mit orangem Rand). Die Stufe steht in keiner Übersicht für Nutzende und erscheint erst bei Personen, die sie erreicht haben. Andere sehen sie wie alle Abzeichen nur mit Zustimmung.
- **Administration:** Grenze unter Katalog › Abzeichen einstellbar (muss über Stufe 6 liegen). Die Grenze geht nur an die Administration. Statistik „Konten nach Abzeichen“ mit der Zeile Learnicorn.
- Admin-Handbuch und Screenshots aktualisiert. Das Benutzerhandbuch erwähnt die Stufe bewusst nicht.

## Präsentation (03.10.2026)
- IDD-Anrechnung als geplant und im Ausbau dargestellt: für anrechnungsfähige Veranstaltungen aus dem beruflichen Bereich, Freischaltung folgt.

## 0.31.2 (03.10.2026)
- **Formular „Veranstaltung anbieten“:** Themenbereich, Thema und Art der Veranstaltung stehen links untereinander.
- Screenshots und Präsentation angepasst.

## 0.31.1 (03.10.2026)
- **Formular „Veranstaltung anbieten“:** „Wann findet es statt?“ steht jetzt vor „Was wird angeboten?“. Reihenfolge: Worum geht es? › Wann findet es statt? › Was wird angeboten? › IDD-Weiterbildung › Teilnahme und Teams-Link.
- Benutzerhandbuch, Screenshots und Präsentation angepasst.

## 0.31.0 (03.10.2026)
- **Beschreibung des Lerninhalts (IDD):** neues Pflichtfeld mit den 11 Kategorien der Weiterbildungsdatenbank von gutBeraten. Es erscheint in Info-Kachel, Kalendereintrag, IDD-Cockpit, IDD-Übersicht, IDD-Archiv und im PDF-Nachweis. Der Server nimmt nur Werte aus der festen Liste an.
- **Reihenfolge im Formular „Veranstaltung anbieten“:** Worum geht es? (Titel, Themenbereich, Thema, Art) › Was wird angeboten? (Beschreibung, Bild) › Wann findet es statt? › IDD-Weiterbildung › Teilnahme und Teams-Link. Die Agenda folgt damit auf die Dauer.
- Handbücher, Papier IT-Sicherheit und Datenschutz, Screenshots und Präsentation aktualisiert.

## 0.30.0 (03.10.2026)
- **Agenda bearbeiten (IDD):** im Popup mit Einträgen aus „Inhalte“, „Dauer“ und „IDD-Bildungszeit“. Einträge anpassen, hinzufügen, löschen und verschieben. Begrüßung und Verabschiedung bleiben fest. Die Einträge füllen zusammen die Dauer minus 10 Minuten, die IDD-Zeit ist die Summe der Bildungszeiten.
- **IDD-Optionen im Formular** stehen jetzt über „Wann findet es statt?“.
- **Fehler behoben:** IDD-Optionen fehlten beim Anlegen, wenn die eigene Freischaltung gerade erst erteilt wurde, und für Admins ohne eigene Freischaltung.
- **IDD-Archiv** als eigene Seite unter Übersicht › IDD-Archiv.
- **Jahresauswahl** in IDD-Übersicht und IDD-Cockpit ohne Rahmen, das gewählte Jahr ist hervorgehoben, mit Abstand zum Text.
- **Öffentliches Profil:** Reihenfolge der Freigaben neu (Profilbild, Expertenthemen, Bewertung, anstehende Veranstaltungen, E-Mail-Adresse), jede mit kurzer Erklärung.

## 0.29.3 (03.10.2026)
- **Footer:** sitzt immer am Seitenende ohne Weißraum danach. Bei kurzen Seiten wie der Anmeldung steht er am unteren Fensterrand.
- **Admin-Handbuch:** neuer Ablauf „Passwort der Hauptadministration vergessen“ (Rolle in data.json auf user setzen, neues Startpasswort in admin-startpasswort.txt).

## 0.29.2 (03.10.2026)
- **Demo-Version:** Fünf schnelle Klicks auf das R+V-Logo im Footer setzen das Passwort von „admin“ auf RuVTest1234 zurück und bestätigen das mit einer Meldung. Die Daten bleiben erhalten. Auf dem Server (IIS) ohne Funktion.

## 0.29.1 (03.10.2026)
- **IDD-Nachweise gelöschter Konten:** Bei jeder Kontolöschung (selbst, durch die Administration oder wegen Inaktivität) bleiben bestätigte IDD-Teilnahmen erhalten, nur mit Name, XV-Nummer, gutBeraten-ID und den Nachweisdaten je Teilnahme. Liste und PDF-Nachweis je Kalenderjahr unter Übersicht › IDD. In Teilnahmelisten mit dem Hinweis „Konto gelöscht“. Automatische Löschung am Ende des fünften Jahres nach dem Kalenderjahr der Teilnahme.
- Hinweis beim Löschen des eigenen Kontos angepasst. Handbücher und Papier IT-Sicherheit und Datenschutz aktualisiert.

## 0.29.0 (03.10.2026)
**IDD-Weiterbildung** (ab Werk ausgeschaltet, Schalter unter System › IDD-Einstellungen)
- **Anlegen:** nur nach Freischaltung durch die Administration (Nutzerliste), nur dienstlich. IDD-Titel ist Pflicht, mit Plausibilitätsprüfung nach den Anrechnungsregeln (nur Hinweis). IDD-Zeit in 5-Minuten-Schritten, höchstens und standardmäßig Dauer minus 10 Minuten.
- **Agenda:** automatisch aus Begrüßung (5 Minuten), Themenblock und Verabschiedung (5 Minuten). Texte für den ersten und letzten Block im Admin-Bereich. Begrüßung und Verabschiedung zählen nicht zur Lernzeit.
- **Katalog:** Chip „IDD“. Die Info-Kachel zeigt Dauer und IDD-Zeit getrennt, dazu die Agenda. Die Kalenderdatei enthält IDD-Zeit und Agenda.
- **Konto:** IDD-pflichtig ja oder nein, 15 oder 30 Stunden, gutBeraten-ID im Format XXXX-XXXX-XXXX (geprüft, einmalig).
- **Bestätigung:** Anbietende bestätigen „Teilgenommen“ oder „Nicht teilgenommen“ 14 Tage lang. Danach bestätigt die Administration, trägt Teilnahmen nach (auch ohne Buchung, mit Begründung und Protokoll) oder schaltet die Bestätigung erneut frei. Ab dem 31.01. des Folgejahres ist ein Kalenderjahr gesperrt, auch für die Administration. Angerechnet werden nur bestätigte Teilnahmen.
- **IDD-Cockpit** im Profil nach der ersten bestätigten Teilnahme: IDD-Zeit je Kalenderjahr, Ziel, offene und angerechnete Veranstaltungen, **PDF-Nachweis** mit Echtname, XV-Nummer, gutBeraten-ID und Bildungsdienstleister.
- **Administration › IDD:** Übersicht je Kalenderjahr mit Kennzahlen, Teilnahmen, Nachtragen, Freischalten.
- **Aufbewahrung:** dienstliche Veranstaltungen bis zum Ende des fünften Jahres nach dem Kalenderjahr.
- Handbücher, Papier IT-Sicherheit und Datenschutz und Präsentation (neue Folie „IDD in der App“) aktualisiert.

## 0.28.0 (03.10.2026)
- **Private Veranstaltungen:** Anonymisierung nach 12 Monaten statt 5 Jahren. Dienstliche bleiben bei 5 Jahren (Nachweis, IDD).
- **Abzeichen nur nach Zustimmung:** Abzeichen und Rakete sehen andere erst, wenn die Person unter „Veröffentlichung“ zustimmt. Hinweis im Profil, solange sie nur selbst sichtbar sind.
- **Termin-Update:** neuer Name der Mitteilung bei geändertem Termin oder Teams-Link. Die Kalenderdatei trägt einen Änderungsstand und aktualisiert den Eintrag.
- **Benachrichtigungen:** Hinweis auf neue Mitteilungen auf der Startseite. Browser-Benachrichtigungen im Profil (Konto), solange ein Tab offen ist, nur mit HTTPS.
- **Statistik:** Reichweite in der Zielgruppe und wiederkehrende Teilnehmende. Größe der Zielgruppe unter System › Allgemein (Standard 6000).
- **Single Sign-on vorbereitet:** Felder für Verzeichnis-Kennung und Art der Anmeldung, Konzept mit zwei Wegen im Papier IT-Sicherheit und Datenschutz.
- **Präsentation:** Pilotziele für rund 6.000 Personen neu hergeleitet, Fristen und Abzeichen angepasst.

## 0.27.0 (03.10.2026)
Zweite Prüfung auf Datenschutz, Mitbestimmung, Nutzen und Vollständigkeit.
- **Veranstaltungen bearbeiten:** Anbietende ändern ihre Veranstaltung bis zum Beginn selbst (Termin, Teams-Link, Beschreibung, Bild, Platzzahl). Bei neuem Termin oder Link erhalten Angemeldete die Mitteilung „Geändert“. Gilt auch für Änderungen durch die Administration.
- **Private Teilnahme bleibt privat:** Bei privaten Veranstaltungen sieht die Administration nur die Zahl der Anmeldungen, keine Namen.
- **Bewertungen für die Administration nur zusammengefasst:** keine Sterne je Veranstaltung, nur Werte nach Monat, Bereich und Thema, ohne Bezug zu Anbietenden und erst ab drei verschiedenen Anbietenden.
- **Statistik für das Management:** neue Kennzahlen Lernstunden, erreichte Personen, durchgeführte Sessions und dienstliche Lernstunden sowie die Auswertung „Lernstunden pro Monat“.
- **Handbücher:** Bearbeiten, Mitteilung „Geändert“, Datenschutz in Archiv und Teilnehmendenliste, neue Kennzahlen. Veraltete Aussagen zu Bewertungen in der Teilnehmendenliste korrigiert.
- **Papier IT-Sicherheit und Datenschutz:** aktualisiert, neuer Abschnitt „Offene Entscheidungen“.
- **Präsentation:** neue Folie „Woran wir den Pilot messen“ mit Zielwerten und Aufwand, Bearbeiten und Lernstunden ergänzt.

## 0.26.0 (02.10.2026)
Prüfung auf IT-Sicherheit, Datenschutz und Mitbestimmung.
- **Startpasswort:** Auf dem IIS zufällig, nur auf dem Server in `AppData\Data\admin-startpasswort.txt` lesbar und nach der ersten Änderung gelöscht. Ein noch unverändertes altes Standardpasswort wird beim Update ersetzt.
- **Sitzungen:** Der Server führt die aktiven Sitzungen je Konto. Abmelden beendet die Sitzung auch auf dem Server. Feste Dauer von 8 Stunden.
- **Vorläufiges Passwort:** Bis zur Änderung erlaubt der Server nur Profil und Passwortänderung.
- **Schreiben nur per POST,** Antworten mit `no-store`, Uploads mit Prüfung des Dateiinhalts, Fehlerprotokoll auf 2 MB begrenzt.
- **Sicherheits-Header:** Content-Security-Policy, Permissions-Policy, Cross-Origin-Opener-Policy, ohne X-Powered-By.
- **Selbsttest** nur noch direkt auf dem Server abrufbar.
- **Admin-Protokoll:** Änderungen der Administration mit Zeit, Benutzername und Datensatz, 12 Monate.
- **Rechte der Nutzenden:** Meine Daten herunterladen (Auskunft) und Konto selbst löschen. Admins können Konten löschen. Konten ohne Anmeldung seit 24 Monaten werden automatisch gelöscht.
- **Keine Leistungskontrolle:** Bewertungen nur als Durchschnitt ab drei Stimmen, keine Einzelbewertungen für Admins, keine Ranglisten mit Personenbezug, keine Anmeldezeiten oder Teilnahmen je Person in der Nutzerliste. Aktivität nur gesamt.
- **Abzeichen freiwillig:** Abzeichen und Expertenstatus lassen sich ausblenden.
- **Hinweise in der Administration:** geladene Testdaten und Betrieb ohne HTTPS.
- **Präsentation:** neue Folie „IT-Sicherheit und Datenschutz: technisch umgesetzt“. Neues Papier zu IT-Sicherheit und Datenschutz (PDF).

## 0.25.1 (02.10.2026)
- **Anmeldung:** Das Sitzungs-Cookie richtet sich nach der Schreibweise der aufgerufenen Adresse. Groß- und Kleinschreibung im Pfad verhindern die Anmeldung auf dem IIS nicht mehr.
- **Sperre je IP-Adresse:** Grenze von 5 auf 50 Fehlversuche erhöht. Ein gemeinsamer Internetausgang sperrt nicht mehr alle Konten. Je Benutzername bleibt es bei 5 Versuchen.
- **Anmeldeseite:** Neuer Bereich „Passwort vergessen?“. In der Demo setzt „Demo zurücksetzen“ alles auf admin / RuVTest1234 zurück.
- **Weiterleitung:** Nach der Anmeldung führt die App nie mehr zurück auf die Anmeldeseite.

## 0.25.0 (02.10.2026)
- **Profilbilder:** Hochladen mit Ausschnitt und Zoom (quadratisch, als Kreis angezeigt) oder Auswahl aus rund 35 Illustrationen (Personen, Figuren, Tiere, R+V-Motive, mit KI-Label). Sichtbar im eigenen Profil und, nach Freigabe, im Profil-Popup. Jederzeit löschbar.
- **Admin:** Hochladen von Profilbildern ein- und ausschaltbar (System › Allgemein), Profilbilder in der Nutzerliste löschbar. Neuer Bereich **Katalog › Fotos** für eigene Fotos als Platzhalterbilder (z. B. aus der R+V-Mediendatenbank).
- **Platzhalterbilder:** 20 weitere Motive, vor allem zu privaten Themen (rund 70 insgesamt). Fotos der Administration stehen oben im Auswahlfenster.
- **Meine Anmeldungen / Meine Veranstaltungen:** Jede Karte zeigt das Bild der Veranstaltung.
- **Navigation:** Konto-Bereich durch eine Linie abgesetzt, Profil hervorgehoben, Handbuch am Ende.
- **Profil:** Rakete an „Themen und Expertenstatus“. Bewertungskachel zeigt ohne Bewertung 0 Sterne und darunter, aus wie vielen Bewertungen und Veranstaltungen sich der Wert ergibt.
- **Statistik neu gegliedert:** sechs Bereiche (Überblick, Veranstaltungen, Themen und Formate, Nutzende, Bewertungen, Datenschutz) mit eigenen Kennzahlen und „Bereich als PDF“. Neu: Absagequote, aktive Konten, öffentliche Profile, Profilbilder, Expertenstatus, Bewertungsquote, Angebot nach Thema, Bilder der Veranstaltungen, letzte Anmeldung, Konten nach Abzeichen, Bewertung nach Thema, bestbewertete Veranstaltungen, nächste Anonymisierungen.

## 0.24.0 (02.10.2026)
- **Breitere Ansichten:** „Veranstaltung anbieten“, „Meine Anmeldungen“, „Meine Veranstaltungen“ und das Profil nutzen die volle Breite.
- **Umschaltbare Bereiche:** „Anstehend“ und „Vergangen“ in „Meine Anmeldungen“ und „Meine Veranstaltungen“. Termin und Uhrzeit stehen jeweils in einer Zeile.
- **Absagen als Button:** „Veranstaltung absagen“ öffnet Grund und „Absage bestätigen“.
- **Katalog:** Öffentlicher Benutzername in Mint ohne Unterstreichung. Hinweis „Profil veröffentlichen“ auf der Startseite, dauerhaft ausblendbar (im Konto gespeichert).
- **Buchungs-Popup:** Aktionszeile immer unten, die Beschreibung scrollt bei Bedarf.
- **Profil-Popup:** breiter, breite Titelspalte, Datum und Uhrzeit untereinander, „Anstehende Veranstaltungen“.
- **Platzhalterbilder:** 50 Motive in der R+V-Bildwelt (flache Markenfarben, RuV-Icons), Auswahl mit Suche beim Anbieten. KI-Label der R+V auf jedem Motiv. Standardmotiv je Thema.
- **Profil in Bereichen:** Übersicht, Veranstaltungen, Teilnahmen, Veröffentlichung, Konto. Name, XV-Nummer und E-Mail-Adresse änderbar (mit Passwort, XV-Nummer und E-Mail einmalig). Bezeichnung „XV-Nummer“, ohne „nicht änderbar“. E-Mail ohne Umbruch, bei Bedarf gekürzt. Alle sechs Abzeichen in einer Zeile. Vereinfachte Texte bei den Freigaben, Button „Speichern“.
- **Abzeichen neu gezeichnet:** runde, flache Störer in Markenfarben (Bronze, Silber, Gold, Stern, Krone, Diamant, Rakete).
- Testbilder ohne Verläufe, Testveranstaltungen mit passenden Platzhaltern.

## 0.23.0 (02.10.2026)
- **Wording nach R+V Corporate Wording:** Anredepronomen durchgehend groß (Du, Dein, Dir, Dich, Euch) in App, Servermeldungen, Testdaten und Handbüchern. „Leider“ entfernt, „Nutzer“ in Fließtexten durch „Konten“ oder „Personen“ ersetzt.
- **Design:** Medaillen-Bänder in Blau und Orange statt Rot (Rot nur für Fehler), Bronze und Silber aus der Markenpalette, Diamant und Rakete in Illustrationsblau statt Mint (Mint nur für Interaktion). Chip „Du bist angemeldet“ in Sand statt Mint. Zähler in der Navigation mit Dunkelblau auf Orange Hell (Kontrast). Sterne auf hellem Grund in Orange Dunkel. Radien 4 px auch bei neuen Elementen, keine Schatten.
- **Mobil:** Die Navigation scrollt den aktiven Eintrag ins Bild, der Benutzername steht vorn. Abmelden zusätzlich im Profil.
- **Leistung:** `index.html` auf dem IIS rund 1 MB kleiner (Nutzerhandbuch wird erst beim Öffnen geladen, Bilder als Dateien). Komprimierung und Browser-Cache für Schriften, Logos und Handbuch-Bilder in der `web.config`. Server hält `data.json` und `settings.json` im Speicher und liest nur nach Änderungen neu (bei Fehlern wird der Zwischenspeicher verworfen). Sperrlisten für Fehlversuche werden aufgeräumt. Katalogsuche berechnet den Suchtext je Veranstaltung nur einmal.

## 0.22.0 (02.10.2026)
- **Öffentliches Profil (freiwillig):** Im Profil schalten Nutzende ihr Profil frei. Der Benutzername auf der Kachel wird dann anklickbar und öffnet ein Popup mit Benutzername, Abzeichen, Zahl der angebotenen Veranstaltungen, Themen mit Anzahl und der Beschreibung.
- **Einzelne Freigaben:** Gesamtbewertung, Themen mit Expertenstatus, E-Mail-Adresse und Liste der kommenden Veranstaltungen (mit Bereich, Titel, Thema, Art, Datum, Uhrzeit und Button „Buchen“).
- **Beschreibungstext** wie eine Bio (bis 300 Zeichen, 7 Zeilen), nur als reiner Text.
- Beides in Server und Demo-Modus, Testdaten mit vier öffentlichen Profilen, Handbücher und Präsentation ergänzt. Kleine Korrektur: gesperrte Kacheln tragen kein aria-disabled mehr, damit der Benutzername bedienbar bleibt.

## 0.21.0 (01.10.2026)
- **Registrierung und Anmeldung:** Konto mit frei wählbarem, einmaligem Benutzernamen, echtem Vor- und Nachnamen, XV-/XVG-Nummer, E-Mail-Adresse und Passwort. Anmeldung mit Benutzername oder E-Mail-Adresse. Öffentlich erscheint nur der Benutzername. Sicherheit: PBKDF2-SHA256 (100.000 Runden), signiertes HttpOnly-Cookie (SameSite=Strict, Secure bei HTTPS), CSRF-Header, Sperre nach fünf Fehlversuchen, Passwortregeln (mindestens 10 Zeichen, keine bekannten Passwörter), Sitzungsende bei Passwortwechsel. Ohne HTTPS bleibt die Übertragung unverschlüsselt (Hinweis in den Handbüchern).
- **Entfernt:** Buchungscodes, Veranstaltungscodes, Name und E-Mail im Buchungs- und Anbieteformular, Hinweis nach der Buchung, gemeinsames Admin-Passwort.
- **Meine Anmeldungen / Meine Veranstaltungen:** Eigene Listen je Konto. Abmelden, Absagen mit Grund, Mitteilungen bei Absage, Löschung oder Entfernung durch die Administration (Zähler in der Navigation).
- **Bewertung:** Nach dem Termin 1 bis 5 Sterne, endgültig und nicht änderbar. Anbieter sehen den Durchschnitt je Session, die Administration im Archiv die Ø Bewertung.
- **Profil:** Daten, Passwort ändern, Statistiken als Anbieter und Teilnehmende, Archiv, Themenzähler und Expertenstatus.
- **Abzeichen:** Sechs Stufen (Bronze, Silber, Gold, Stern, Krone, Diamant) nach Zahl durchgeführter Sessions, Grenzen im Admin-Bereich einstellbar. Rakete für den Expertenstatus je Thema (Mindestzahl einstellbar) auf Kachel und im Profil.
- **Admin:** Standardkonto `admin` / `RuVTest1234` mit erzwungenem Passwortwechsel, neue Seite „Nutzer“ (Admin-Rechte vergeben, Passwort zurücksetzen, sperren), „Abzeichen“, Statistik mit Registrierungen und Bewertungen.
- **Anonymisierung:** einheitlich fünf Jahre nach dem Ende jeder Veranstaltung (privat, dienstlich, abgesagt). Zähler für Abzeichen und Teilnahmen bleiben im Konto erhalten.
- **Testdaten:** 20 Beispielnutzer (Passwort Test-Passwort-2026), Verlauf für Abzeichen und Bewertungen, abgesagte Veranstaltung mit Mitteilung.
- Beide Handbücher und die Präsentation aktualisiert.

## 0.20.0 (01.10.2026)
- **Automatische Anonymisierung:** Private Veranstaltungen werden am Tag nach der Veranstaltung anonymisiert (Name und E-Mail von Anbietenden und Teilnehmenden, Veranstaltungs- und Buchungscodes, Teams-Link). Dienstliche Veranstaltungen bleiben fünf Jahre nach ihrem Ende gespeichert, ausschließlich für Nachweis und Anrechnung, danach werden sie ebenfalls anonymisiert. Abgesagte Veranstaltungen werden am Tag nach dem geplanten Termin anonymisiert. Die Zahl der Anmeldungen bleibt für die Statistik erhalten. Die Prüfung läuft bei jedem Datenzugriff, ein Zeitplan auf dem Server ist nicht nötig.
- **Absage durch Anbietende:** Unter „Meine Veranstaltung“ lässt sich eine Veranstaltung mit Veranstaltungscode absagen (mit optionalem Grund), auch wenn schon Anmeldungen bestehen. Sie verschwindet aus dem Katalog. Angemeldete sehen die Absage unter „Meine Anmeldung“ (Hinweis oben, Grund, kein Teams-Link und keine Kalenderdatei). Gemerkte Buchungen werden beim Öffnen der Seite automatisch geprüft.
- **Archiv im Admin-Bereich:** Beendete Veranstaltungen (und abgesagte nach ihrem Termin) wandern automatisch ins Archiv, getrennt nach Dienstlich und Privat, mit Suche, Filtern nach Art und Thema und Zeitraum von/bis. Anzeige des Anonymisierungsstatus, Teilnehmerliste, Löschen. Die Veranstaltungsliste zeigt nur noch nicht beendete Termine.
- **Statistik:** 9 Kennzahlen (neu: Abgesagt), neue Auswertung „Personenbezogene Daten“ (gespeichert oder anonymisiert), abgesagte Veranstaltungen zählen nicht in die Auswertungen, anonymisierte Anbietende fehlen in der Anbieter-Auswertung.
- **Handbücher:** Arbeitszeit-Regel (dienstlich ja, privat nein, selbst einstechen), IDD-Status (noch nicht möglich, in Planung), Datenschutz, Absagen und Archiv in beiden Handbüchern. Die Arbeitszeit-Regel steht bewusst nur im Handbuch, nicht prominent in der App.
- Testdaten: neue Szenarien „anonymisierter privater Termin“ und „abgesagter Termin mit Anmeldungen“.

## 0.19.0 (01.10.2026)
- **Design an das R+V-Design-System angeglichen:** 4 px Radius statt Pillen, keine Schatten und Verläufe (Bildplatzhalter flach), keine Akzentkanten an Hinweisen und Karten, Fokusring 3 px in Orange, Headlines in Bold (Typostufen 52/36/20), unterstrichene Links in den Link-Farben, Mint-Buttons nach Token (hell #109da8, Hover #00dcdc), dunkles Design nur in Dunkelblau mit Rahmen.
- **Topline in RuV Slab** über den Seitenüberschriften; im Katalog-Hero markiert `*Wort*` Highlight-Wörter in Orange (ohne Markierung: alles nach dem ersten Satz).
- **Iconfont RuV-Icons-v3** statt eigener SVG-Symbole (Suche, Download, Kopieren, Pfeile, Hinweise u. a.).
- Rot nur noch für Fehler: „Ausgebucht“ als graues Chip, Löschen-Buttons als Ghost-Button in Dunkelblau (Rückfrage mit gefüllter Fläche), Fehlermeldungen mit Icon und dunkelblauem Text.
- Orange-Text nur noch ab 19 px fett (Kontrast), Kalendereintrag ohne Akzentkanten.
- **Zwei Handbücher:** Nutzerhandbuch (öffentlich, Reiter „Handbuch“, PDF-Download) und neu das **Administrationshandbuch** (Admin › System › Handbuch, PDF-Download). Es liegt in `AppData\Private` (per web.config gesperrt) und wird nur nach Admin-Anmeldung ausgeliefert. Beide gibt es auch als HTML und PDF unter `docs/`.

## 0.18.0 (01.10.2026)
- Neu im Admin-Bereich: **Statistik und Berichte** (Gruppe „Übersicht“). Filter nach Zeitraum, Bereich und Testdaten.
- 8 Kennzahlen: Veranstaltungen, Anmeldungen, Ø Anmeldungen je Veranstaltung, Ø Auslastung, anbietende Personen, Termine ohne Anmeldung, ausgebuchte Termine, Ø Vorlauf der Anmeldung.
- 13 Auswertungen: Veranstaltungen, Teilnehmende und Auslastung pro Monat (je Bereich), Monatsübersicht, Teilnehmende nach Thema, Art, Tageszeit und Dauer, Veranstaltungen nach Wochentag, Auslastungsverteilung, Top-10-Veranstaltungen, Top-10-Anbietende, Veranstaltungen ohne Anmeldung.
- PDF-Export: je Auswertung (Button „PDF“) und als Gesamtbericht. Das PDF wird im Browser erzeugt, ohne zusätzliche Bibliothek und ohne Serveraufruf (Standardschrift Helvetica, R+V-Kopfzeile, Seitenzahlen).

## 0.17.1 (30.09.2026)
- Katalog: Das Thema „Sonstiges“ steht in beiden Bereichen immer zuletzt, auch in den Themenlisten (Filter, Admin).
- Kalendereintrag: Der Betreff beginnt immer mit dem App-Titel („LearnTogether@AD - Titel“).
- Kacheln: Veranstaltungstitel höchstens zweizeilig, lange Titel und lange Anbieternamen werden mit „…“ gekürzt (vollständig per Tooltip).

## 0.17.0 (30.09.2026)
- Buchungs- und Bestätigungsfenster noch breiter (bis 1320 px), mehr Platz für die Beschreibung. Datum, Uhrzeit, Dauer und Anbieter stehen im dunkelblauen Feld unter dem Bild, das Thema als Chip unter dem Titel, die freien Plätze unten rechts.
- „Durchführung“ heißt überall „Angeboten von“ (Popup, Kalendereintrag, Admin-Tabelle).
- Kalenderdatei mit eindeutigem Namen: LearnTogether_Buchungsbestätigung_Titel_Datum.ics. Im Footer des Kalendereintrags entfällt „Informelles Lernen im Außendienst“.

## 0.16.0 (30.09.2026)
- Buchungs- und Bestätigungsfenster: breiter (bis 1040 px) und deutlich niedriger, dadurch kaum noch Scrollen. Das Veranstaltungsbild steht links und wird ausschließlich quadratisch gezeigt.
- Teams-Link in eigener, hervorgehobener Box mit Button „Link kopieren“; der Button „Zur Teams-Sitzung“ entfällt.
- Hinweis nach der Buchung (Überschrift und Text) ist im Admin unter „Texte“ änderbar.
- Chips größer, mit vollflächiger Farbe und besserer Schärfe.
- Kalendereintrag (ICS) neu gestaltet: dunkelblauer Kopf mit R+V-Logo (sofern die Anwendung per http/https läuft) und Titel „LearnTogether@AD“ mit orangem Zusatz, Chips mit Abstand in R+V-Farben, echter Teams-Button, Buchungscode-Box; Aufbau rein tabellenbasiert für Outlook.

## 0.15.0 (30.09.2026)
- Admin: Veranstaltungstabelle überarbeitet (schmalere Navigation, breitere Tabelle, weniger Spalten, Bereich/Art/Thema unter dem Titel, Aktionen in einer Zeile).
- Admin: Teilnehmende erscheinen jetzt in einem Popup (Belegungsbalken, Tabelle mit Name, E-Mail und Buchungscode, Entfernen mit Rückfrage, E-Mail-Adressen kopieren, Teams-Link).

## 0.14.0 (30.09.2026)
- R+V-Schrift „RuV Sans“ (Light, Regular, Bold, Black) eingebunden: in der Anwendung, im Handbuch (HTML und PDF). IIS-Paket enthält `AppData/fonts`, `web.config` kennt `.woff2`; das Artefakt bettet die Schrift ein.

## 0.13.0 (30.09.2026)
- „Stornierungscode“ heißt jetzt **Buchungscode**. Er genügt allein zum Anzeigen, Stornieren und für die Kalenderdatei (keine E-Mail-Adresse mehr nötig); Fehlversuche werden gebremst.
- Bestätigungsfenster: deutlicher Hinweis, den Buchungscode zu speichern und den Termin über die Kalenderdatei einzutragen; Teams-Link, Kalenderdatei und Code mit Kopier-Button.
- Kalenderdatei (.ics): Beschreibung im Inhalt und Design der früheren Bestätigungsmail (HTML-Fassung im Farbton des Bereichs plus Text), mit Teams-Link, Buchungscode und Link zu „Meine Anmeldung“.
- Neu: **Veranstaltungscode** nach dem Anlegen einer Veranstaltung; neue Seite „Meine Veranstaltung“ zeigt damit die aktuelle Teilnehmerliste (nur Namen). Die Administration sieht die Codes aller Veranstaltungen.

## 0.12.0 (30.09.2026)
- **Kein E-Mail-Versand mehr, kein Protokoll.** SMTP, Versandarten, Mailvorlage, E-Mail-Protokoll, MailAbholer und zugehörige Admin-Seiten entfernt.
- Nach der Anmeldung zeigt das Fenster alle Angaben: Termin, Teams-Link, Kalendereintrag (.ics zum Download) und Stornierungscode.
- Neue Seite „Meine Anmeldung“ (ersetzt „Stornieren“): Anmeldung mit Code und E-Mail anzeigen, Teams-Link und Kalender abrufen, stornieren. Anmeldungen werden zusätzlich nur im Browser des Teilnehmenden gemerkt.
- Server: neue Aktion `lookup`; `book` liefert die Teilnahme-Angaben (inkl. Teams-Link) zurück.
- Handbuch, Dokumentation und Tests angepasst.

## 0.11.0 (30.09.2026)
- Neu: tools/MailAbholer (MailAbholer.exe + Quelltext): holt .eml-Dateien aus einem Ordner/einer Netzfreigabe und sendet sie per SMTP von einem Rechner aus, der senden darf (für Fälle, in denen der Webserver nicht senden darf). Anleitung in docs/Mail-Abholer.md.

## 0.10.1 (30.09.2026)
- SMTP: Option „Zertifikatsfehler des Mailservers ignorieren“ (nur während des Versands wirksam); genauere Erklärung bei Zertifikats- und TLS-Fehlern.

## 0.10.0 (30.09.2026)
- E-Mail-Versand: Versandart wählbar (SMTP, lokaler IIS-SMTP-Dienst, .eml-Dateien in Ordner), Windows-Anmeldung möglich. Versandfehler werden mit verständlicher Ursache und technischer Meldung angezeigt (Test und Protokoll). Fehlgeschlagene Mails werden als .eml gesichert (Download) und können erneut gesendet werden.

## 0.9.4 (30.09.2026)
- Fix: Direktive `<%@ Assembly Name="System.Web.Extensions" %>` entfernt (unvollständiger Assembly-Name ließ sich unter .NET 4.8 nicht laden, HTTP 500). Die Assembly ist in ASP.NET 4.x standardmäßig eingebunden; ebenso den Assemblies-Eintrag aus der web.config entfernt.

## 0.9.3 (30.09.2026)
- Neu: AppData/selftest.ashx als Selbsttest (Umgebung, Anwendungspool-Benutzer, Schreibrechte, Testübersetzung von api.ashx mit Compiler-Fehlern). Hinweis im Demo-Banner bei HTTP 500.

## 0.9.2 (30.09.2026)
- Ping-Prüfung unabhängig von Schreibrechten: Fehlen dem Anwendungspool die Rechte auf AppData\\Data, erscheint ein roter Hinweis mit Ordner und Benutzer statt Demo-Modus; Anzeige funktioniert weiter, Speichern meldet klaren Fehler.
- Versionsnummer im Server wird beim Build gesetzt. Kapitel „Fehlersuche“ in docs/IIS-Installation.md.

## 0.9.1 (30.09.2026)
- Demo-Banner erklärt jetzt, warum der Server nicht genutzt wird (HTTP 404/500/403, ASP.NET nicht aktiv, file://, kein JSON) und zeigt die geprüfte Adresse mit „Erneut prüfen“.
- Pfade werden aus der Seitenadresse abgeleitet (funktioniert auch in Unterordnern und ohne abschließenden Schrägstrich).
- web.config ohne targetFramework/requestValidationMode, damit sie auch bei abweichender Pool-Einstellung nicht stört.

## 0.9.0 (30.09.2026)
- Testdaten an die aktuelle Version angepasst: decken alle aktuellen Themen und Arten ab (auch neu angelegte), enthalten eine Veranstaltung mit 50 Plätzen und Anbieter-E-Mail; Themen und Arten werden durch Testdaten nicht verändert.
- Admin, Veranstaltungen: Live-Filter mit Suche, Bereich, Art, Thema und Zeitraum (von/bis), Trefferzahl, Filter zurücksetzen.
- Bestätigungs-E-Mail neu im R+V-Design (moderne Tabellen-Mail, R+V-Logo, Farbton je Bereich: Hintergrund, Überschrift, Text).
- Admin: je Themenbereich zusätzlich Farbe für Überschriften und Texte; Kontrastprüfung (Text 4,5 : 1, Überschrift 3 : 1) in Formular und Server. Katalog übernimmt die Farben.

## 0.8.0 (30.09.2026)
- Katalog: Beschriftung „Bereich“ vor dem Umschalter dienstlich/privat.
- Admin, E-Mail-Protokoll: Einträge einzeln löschen, Protokoll leeren (jeweils mit Bestätigung), Export als CSV (Excel-tauglich, Semikolon, UTF-8). Protokoll speichert bis zu 1000 Einträge.

## 0.7.1 (30.09.2026)
- web.config: Browser-Cache für statische Dateien deaktiviert, damit Updates (z. B. index.html) sofort sichtbar sind.

## 0.7.0 (30.09.2026)
- Katalog: mehr Abstand und Trennlinie zwischen Kopfbereich und Filtern; Hinweistext läuft breiter (bis ca. 96 Zeichen).
- Arten: bis zu 50 statt 10; alphabetisch aufsteigend im Katalog, im Formular und beim Neuladen im Admin.

## 0.6.0 (30.09.2026)
- Admin neu gegliedert: Navigation links mit vier Gruppen (Übersicht, Katalog, E-Mail, System) und neun Bereichen, es wird immer nur ein Bereich angezeigt. Themenbereiche einzeln umschaltbar.
- Überschrift und Hinweistext im Katalog im Admin änderbar (Bereich „Texte“, mit Vorschau und Standardtexten).
- Einstellungen werden teilweise gespeichert (Server: nur mitgesendete Felder).

## 0.5.0 (30.09.2026)
- Teilnehmendenzahl höchstens 50 (Formular, Server, Admin).
- Admin: Hauptfarbe je Themenbereich einstellbar (mit Vorschau, Kontrollprüfung auf Lesbarkeit, Standardwert); neuer Reiter „Arten“ zum Hinzufügen, Umbenennen und Löschen (nur unbenutzte) der Veranstaltungsarten.
- Katalog: neue Hero-Texte mit Fokus auf Austausch und Button „Selbst etwas anbieten“; Art-Filter in eigener Zeile, passt sich der Anzahl der Arten an.

## 0.4.0 (30.09.2026)
- Admin: neuer Reiter „Themen“. Themen der Bereiche hinzufügen, umbenennen (bestehende Veranstaltungen werden angepasst) und löschen (nur wenn nicht verwendet). Bezeichnungen der Themenbereiche änderbar; die Bereiche selbst bleiben fest.
- Fokus im Popup überschreibt keine bereits begonnene Eingabe mehr.

## 0.3.0 (30.09.2026)
- Katalog: „Privat“ in brauner Farbwelt, „Dienstlich“ in Dunkelblau; Themenreihen alphabetisch; neuer Themenfilter zeigt nur die gewählte Reihe; Dauerfilter „Alle“.

## 0.2.0 (30.09.2026)
- Admin: Titel „Administration“; Tabelle, Katalogzeilen und Kopfbereich nutzen die volle Breite.
- R+V-Icon als Favicon.
- Formular „Veranstaltung anbieten“ neu gegliedert (Wer bietet es an? mit Name und E-Mail, Worum geht es? mit Titel, Themenbereich und Thema, Wann, Was wird angeboten? mit Beschreibung und Bild, Teams-Link). Datumsfeld mit Wochenend-Sperre, Hinweis zur Anzeige der Beschreibung im Katalog.
- Handbuch aktualisiert.

## 0.1.0 (30.09.2026)
- Erste Version: Katalog, Veranstaltung anbieten (Zeitfenster-Führung, HTML-Editor, Bildzuschnitt), Anmeldung mit E-Mail und ICS, Stornierung, Admin-Bereich (Übersicht, Bearbeiten, Teilnehmende, Einstellungen, Testdaten, Mail-Protokoll), Nutzerhandbuch als HTML/PDF.
