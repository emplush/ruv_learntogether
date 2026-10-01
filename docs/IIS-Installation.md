# IIS-Installation

**Voraussetzungen:** IIS mit ASP.NET 4.x (.NET Framework 4.6 oder neuer). Kein Node.js.

1. Inhalt des Ordners `IIS/` in ein Verzeichnis des Webservers kopieren (als Site oder Anwendung).
2. Dem Anwendungspool-Benutzer (z. B. `IIS AppPool\<Pool>`) **Ändern-Rechte** auf `AppData\Data` geben. Dort liegen Veranstaltungen, Anmeldungen, Einstellungen und Bilder als JSON-/Bilddateien.
3. `index.html` aufrufen. Admin: Navigation „Admin“, Standardpasswort `RuVTest1234`, bitte sofort unter *Einstellungen* ändern.
4. Die Anwendung **verschickt keine E-Mails**. Teilnahme-Angaben (Teams-Link, Kalenderdatei, Buchungscode) zeigt sie direkt nach der Anmeldung und unter „Meine Anmeldung“.

**Hinweise**
- `AppData\Data` ist per `hiddenSegments` (web.config) nicht per HTTP abrufbar. `settings.json` enthält u. a. den Hash des Admin-Passworts; Zugriffsrechte im Dateisystem entsprechend beschränken.
- `AppData\Private` (Administrationshandbuch als HTML und PDF) ist ebenfalls per `hiddenSegments` gesperrt und wird nur nach Admin-Anmeldung über `api.ashx` ausgeliefert.
- Für Updates alle Dateien außer `AppData\Data` überschreiben.
- Die R+V-Schrift „RuV Sans“ liegt in `AppData\fonts` (Light, Regular, Bold, Black). Die `web.config` liefert `.woff2` aus.

## Fehlersuche

**Selbsttest:** Öffne `https://<server>/<pfad>/AppData/selftest.ashx`. Die Seite zeigt .NET-Version, Benutzer des Anwendungspools, Schreibrechte auf `AppData\Data` und probiert `api.ashx` zu übersetzen (mit Compiler-Fehlern). Bitte nach der Fehlersuche `selftest.ashx` vom Server löschen.

Zeigt die Seite oben ein gelbes Banner „Demo-Modus“, klicke auf **„Warum Demo-Modus?“**. Dort steht der Grund im Klartext. Zusätzlich gilt:

1. **Ping-Test:** `https://<server>/<pfad>/AppData/api.ashx?action=ping` muss JSON liefern, z. B. `{"ok":true,"server":true,...}`. Andernfalls läuft ASP.NET für diese Anwendung nicht.
2. **Voraussetzungen:** Windows-Feature „ASP.NET 4.x“ (Internetinformationsdienste › Webserver › Anwendungsentwicklung), Anwendungspool mit „.NET CLR Version v4.0“ im integrierten Modus, Ordner `AppData` samt `api.ashx` und `web.config` vollständig kopiert.
3. **Schreibrechte:** Erscheint stattdessen ein roter Hinweis „Server erreicht, aber Speichern nicht möglich“, fehlen dem Benutzer des Anwendungspools (im Hinweis genannt, z. B. `IIS AppPool\<Pool>`) die „Ändern“-Rechte auf `AppData\Data`.
4. **Nach einem Update** den Browser-Cache mit Strg+F5 umgehen. Fehler des Servers landen in `AppData\Data\error.log`.
