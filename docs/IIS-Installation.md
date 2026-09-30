# IIS-Installation

**Voraussetzungen:** IIS mit ASP.NET 4.x (.NET Framework 4.6 oder neuer). Kein Node.js.

1. Inhalt des Ordners `IIS/` in ein Verzeichnis des Webservers kopieren (als Site oder Anwendung).
2. Dem Anwendungspool-Benutzer (z. B. `IIS AppPool\<Pool>`) **Ändern-Rechte** auf `AppData\Data` geben. Dort liegen Veranstaltungen, Anmeldungen, Einstellungen und Bilder als JSON-/Bilddateien.
3. `index.html` aufrufen. Admin: Navigation „Admin“, Standardpasswort `RuVTest1234`, bitte sofort unter *Einstellungen* ändern.
4. Unter *Admin > Einstellungen* SMTP-Server und Absenderadresse eintragen und Testnachricht senden. Ohne SMTP werden Anmeldungen gespeichert, aber keine Mails verschickt.

**Hinweise**
- `AppData\Data` ist per `hiddenSegments` (web.config) nicht per HTTP abrufbar. Das SMTP-Passwort liegt dort im Klartext in `settings.json`, Zugriffsrechte im Dateisystem entsprechend beschränken.
- Für Updates alle Dateien außer `AppData\Data` überschreiben.
- Stornierungslinks nutzen die automatisch ermittelte Adresse; hinter Reverse-Proxy die Basis-Adresse in den Einstellungen setzen.
- Die R+V-Schrift wird später über `@font-face` in `src/app.css` ergänzt (Variable `--font`).
