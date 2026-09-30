# Änderungen

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
