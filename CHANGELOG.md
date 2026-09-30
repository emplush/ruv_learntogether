# Änderungen

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
